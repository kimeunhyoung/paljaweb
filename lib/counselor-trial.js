/**
 * 상담사 15일 체험권(counselor30) → Professional 플랜 연동
 * 로그인 계정 + 접속 코드 + 계정당 기기 최대 4대
 */
const crypto = require('crypto');
const { ensureDeviceSlot, assertDeviceAllowed, MAX_DEVICES_PER_ACCOUNT } = require('./account-devices');

function supabaseBase() {
  return (process.env.SUPABASE_URL || '').replace(/\/$/, '');
}

function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function sbHeaders(extra = {}) {
  const key = serviceKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function configured() {
  return !!(supabaseBase() && serviceKey() && process.env.LIFECODE_CODE_PEPPER);
}

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '');
}

function hashCode(normalized) {
  const pepper = process.env.LIFECODE_CODE_PEPPER || '';
  return crypto.createHash('sha256').update(pepper + normalized, 'utf8').digest('hex');
}

function validDeviceId(deviceId) {
  const s = String(deviceId || '').trim();
  return s.length >= 8 && s.length <= 128;
}

function parseBetaDaysFromNote(note) {
  const tagged = String(note || '').match(/\[beta_days:(\d{1,3})\]/i);
  if (tagged) {
    const n = Number(tagged[1]);
    if (Number.isInteger(n) && (n === 5 || n === 7 || (n >= 1 && n <= 30))) return n;
  }
  const labeled = String(note || '').match(/테스터\s*(\d{1,3})\s*일/);
  if (labeled) {
    const n = Number(labeled[1]);
    if (Number.isInteger(n) && n >= 1 && n <= 30) return n;
  }
  return null;
}

function isLicenseExpired(row) {
  if (!row?.expires_at) return false;
  return new Date(row.expires_at).getTime() < Date.now();
}

function isPlanActiveProfessional(profile) {
  if (!profile || profile.plan !== 'professional') return false;
  if (!profile.plan_active_until) return true;
  return new Date(profile.plan_active_until) > new Date();
}

/** 유료 Professional(구독·결제) — 체험권만 있는 경우는 false */
function isPaidProfessional(profile) {
  if (!profile) return false;
  if (!isPlanActiveProfessional(profile)) return false;
  if (profile.counselor_trial_license_id) return false;
  if (profile.toss_billing_key) return true;
  return !!profile.professional_payment_key;
}

function isCounselorTrialProfile(profile) {
  return !!(profile && profile.counselor_trial_license_id);
}

async function sbFetch(path, options = {}) {
  const res = await fetch(`${supabaseBase()}${path}`, {
    ...options,
    headers: sbHeaders(options.headersExtra),
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { res, data };
}

async function getLicenseByHash(codeHash) {
  const { res, data } = await sbFetch(
    `/rest/v1/lifecode_licenses?code_hash=eq.${encodeURIComponent(codeHash)}&limit=1`,
  );
  if (!res.ok) throw new Error(`license fetch ${res.status}`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function patchLicense(id, fields) {
  const { res, data } = await sbFetch(
    `/rest/v1/lifecode_licenses?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headersExtra: { Prefer: 'return=minimal' },
      body: JSON.stringify(fields),
    },
  );
  if (!res.ok) {
    throw new Error(`license patch ${res.status}: ${JSON.stringify(data)}`);
  }
}

const ERROR_MESSAGES = {
  invalid_device: '기기 정보가 올바르지 않습니다. 이 페이지를 새로고침한 뒤 다시 시도해 주세요.',
  invalid_code: '접속 코드를 확인해 주세요.',
  not_counselor_license: '상담사 체험권 코드가 아닙니다.',
  revoked: '사용이 중지된 코드입니다. 고객센터로 문의해 주세요.',
  expired: '이용 기간이 만료된 코드입니다.',
  profile_not_found: '프로필을 찾을 수 없습니다.',
  has_subscription: '이미 Professional 구독 중입니다. 상담사 허브에서 바로 이용하세요.',
  license_linked_other: '이 코드는 다른 계정에 연결되어 있습니다.',
  device_limit: `이 계정은 이미 기기 ${MAX_DEVICES_PER_ACCOUNT}대까지 등록되어 있습니다. 다른 기기 등록을 해제하거나 고객센터로 문의해 주세요.`,
  devices_table_missing: '기기 등록 테이블이 없습니다. database/account_devices.sql 을 실행해 주세요.',
  other_trial: '다른 체험 코드가 이미 이 계정에 연결되어 있습니다.',
  already_subscribed: '이미 Professional 이용 중입니다.',
  server_not_configured: '서버 설정이 완료되지 않았습니다.',
};

/**
 * @param {string} userId
 * @param {string} code
 * @param {string} deviceId
 * @param {{ getProfile: Function, patchProfileFields: Function }} deps
 */
async function linkCounselorTrial(userId, code, deviceId, deps) {
  if (!configured()) {
    return { ok: false, error: 'server_not_configured' };
  }
  if (!validDeviceId(deviceId)) {
    return { ok: false, error: 'invalid_device' };
  }

  const normalized = normalizeCode(code);
  if (normalized.length < 6) {
    return { ok: false, error: 'invalid_code' };
  }

  let license;
  try {
    license = await getLicenseByHash(hashCode(normalized));
  } catch (e) {
    console.error('[counselor-trial] license lookup', e);
    return { ok: false, error: 'server_error' };
  }

  if (!license) return { ok: false, error: 'invalid_code' };
  if (String(license.product_tier || '').toLowerCase() !== 'counselor') {
    return { ok: false, error: 'not_counselor_license' };
  }
  if (license.status === 'revoked') return { ok: false, error: 'revoked' };

  const betaDays = parseBetaDaysFromNote(license.note);
  const neverLinked = !license.linked_user_id;
  // 테스터 코드는 연결 전·미사용이면 발급 만료일로 막지 않음(연결 시 기간 시작)
  if (isLicenseExpired(license) && !(neverLinked && betaDays)) {
    return { ok: false, error: 'expired' };
  }

  const profile = await deps.getProfile(userId);
  if (!profile) return { ok: false, error: 'profile_not_found' };

  // 빌링키만 남아 있고 플랜이 Free/만료인 경우는 체험 연결 허용
  if (profile.toss_billing_key && isPlanActiveProfessional(profile) && !profile.counselor_trial_license_id) {
    return { ok: false, error: 'has_subscription' };
  }

  if (license.linked_user_id && license.linked_user_id !== userId) {
    return { ok: false, error: 'license_linked_other' };
  }

  if (profile.counselor_trial_license_id && profile.counselor_trial_license_id !== license.id) {
    const until = profile.plan_active_until ? new Date(profile.plan_active_until) : null;
    const prevStillActive =
      profile.plan === 'professional' && (!until || until.getTime() > Date.now());
    if (prevStillActive) {
      return { ok: false, error: 'other_trial' };
    }
  }

  if (isPaidProfessional(profile)) {
    const curUntil = profile.plan_active_until ? new Date(profile.plan_active_until) : null;
    const trialUntil = new Date(license.expires_at);
    if (!curUntil || curUntil > trialUntil) {
      return { ok: false, error: 'already_subscribed' };
    }
  }

  const deviceSlot = await ensureDeviceSlot(userId, deviceId);
  if (!deviceSlot.ok) {
    return { ok: false, error: deviceSlot.error || 'device_limit', devices: deviceSlot.devices, max: deviceSlot.max };
  }

  let expiresAt = license.expires_at;
  // 테스터: 첫 연결 시점부터 N일
  if (betaDays && neverLinked) {
    const exp = new Date();
    exp.setDate(exp.getDate() + betaDays);
    expiresAt = exp.toISOString();
  }

  try {
    const licensePatch = { linked_user_id: userId };
    if (betaDays && neverLinked) licensePatch.expires_at = expiresAt;
    await patchLicense(license.id, licensePatch);
    await deps.patchProfileFields(userId, {
      plan: 'professional',
      plan_active_until: expiresAt,
      counselor_trial_license_id: license.id,
      // 레거시 컬럼: 첫 연결 기기만 기록(접근 판정에는 account_devices 사용)
      counselor_trial_device_id: profile.counselor_trial_device_id || deviceId,
    });
  } catch (e) {
    console.error('[counselor-trial] link patch', e);
    return { ok: false, error: 'server_error' };
  }

  return {
    ok: true,
    trial: true,
    expiresAt,
    licenseId: license.id,
    devices: deviceSlot.devices,
    maxDevices: MAX_DEVICES_PER_ACCOUNT,
  };
}

async function trialStatusForProfile(profile, deviceId, userId) {
  if (!isCounselorTrialProfile(profile)) {
    return { isTrial: false, deviceOk: true };
  }
  const until = profile.plan_active_until ? new Date(profile.plan_active_until) : null;
  const active = profile.plan === 'professional' && (!until || until > new Date());
  let deviceOk = true;
  let devices = null;
  let max = MAX_DEVICES_PER_ACCOUNT;
  const uid = userId || profile.id;
  if (deviceId && uid) {
    try {
      const slot = await assertDeviceAllowed(uid, deviceId);
      deviceOk = !!slot.ok;
      devices = slot.devices ?? null;
      max = slot.max || MAX_DEVICES_PER_ACCOUNT;
    } catch {
      deviceOk = true;
    }
  }
  return {
    isTrial: true,
    active,
    expiresAt: profile.plan_active_until,
    deviceBound: true,
    deviceOk,
    devices,
    maxDevices: max,
  };
}

function registerCounselorTrialRoutes(app, deps) {
  const { getUserIdFromAuth, getProfile, patchProfileFields } = deps;

  app.post('/api/counselor-trial/link', async (req, res) => {
    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const code = String(req.body?.code || '').trim();
    const deviceId = String(req.body?.deviceId || '').trim();
    if (!code) {
      res.status(400).json({ error: 'code_required' });
      return;
    }

    const result = await linkCounselorTrial(userId, code, deviceId, {
      getProfile,
      patchProfileFields,
    });

    if (!result.ok) {
      const status =
        result.error === 'unauthorized'
          ? 401
          : ['invalid_code', 'not_counselor_license', 'invalid_device'].includes(result.error)
            ? 400
            : ['device_limit', 'license_linked_other', 'other_trial'].includes(
                result.error,
              )
              ? 403
              : result.error === 'server_not_configured' || result.error === 'devices_table_missing'
                ? 503
                : 400;
      res.status(status).json({
        ...result,
        message: ERROR_MESSAGES[result.error] || '연결에 실패했습니다.',
      });
      return;
    }

    res.json({
      ok: true,
      trial: true,
      expiresAt: result.expiresAt,
      message: 'Professional 체험이 연결되었습니다. 상담사 허브를 이용해 보세요.',
    });
  });

  app.get('/api/counselor-trial/status', async (req, res) => {
    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const profile = await getProfile(userId);
    if (!profile) {
      res.status(404).json({ error: 'profile_not_found' });
      return;
    }
    const deviceId = req.query.deviceId ? String(req.query.deviceId) : '';
    const trial = await trialStatusForProfile(profile, deviceId, userId);
    res.json({
      plan: profile.plan,
      activeUntil: profile.plan_active_until,
      isPaidProfessional: isPaidProfessional(profile),
      ...trial,
    });
  });
}

module.exports = {
  configured,
  isPaidProfessional,
  isCounselorTrialProfile,
  linkCounselorTrial,
  trialStatusForProfile,
  registerCounselorTrialRoutes,
  ERROR_MESSAGES,
};
