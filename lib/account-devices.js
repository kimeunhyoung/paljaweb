/**
 * 계정당 등록 기기 — 단품·체험 등 (기본 최대 4대)
 */
const MAX_DEVICES_PER_ACCOUNT = 4;

function supabaseBase() {
  return (process.env.SUPABASE_URL || '').replace(/\/$/, '');
}

function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function configured() {
  return !!(supabaseBase() && serviceKey());
}

async function sbFetch(path, options = {}) {
  const key = serviceKey();
  const res = await fetch(`${supabaseBase()}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headersExtra || {}),
    },
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

function validDeviceId(deviceId) {
  const s = String(deviceId || '').trim();
  return s.length >= 8 && s.length <= 128;
}

async function listDevices(userId) {
  const { res, data } = await sbFetch(
    `/rest/v1/account_devices?user_id=eq.${encodeURIComponent(userId)}&select=id,device_id,label,created_at,last_seen_at&order=last_seen_at.desc`,
  );
  if (!res.ok) {
    const msg = typeof data === 'object' ? JSON.stringify(data) : String(data);
    throw new Error(`account_devices list ${res.status}: ${msg}`);
  }
  return Array.isArray(data) ? data : [];
}

async function touchDevice(userId, deviceId) {
  const nowIso = new Date().toISOString();
  const { res, data } = await sbFetch(
    `/rest/v1/account_devices?user_id=eq.${encodeURIComponent(userId)}&device_id=eq.${encodeURIComponent(deviceId)}`,
    {
      method: 'PATCH',
      headersExtra: { Prefer: 'return=minimal' },
      body: JSON.stringify({ last_seen_at: nowIso }),
    },
  );
  if (!res.ok) {
    const msg = typeof data === 'object' ? JSON.stringify(data) : String(data);
    throw new Error(`account_devices touch ${res.status}: ${msg}`);
  }
}

/**
 * 기기 슬롯 확보. 이미 등록돼 있으면 last_seen 갱신.
 * @returns {{ ok: true, devices: number, max: number, created?: boolean } | { ok: false, error: string, devices?: number, max?: number }}
 */
async function ensureDeviceSlot(userId, deviceId) {
  if (!configured()) {
    return { ok: false, error: 'server_not_configured' };
  }
  if (!userId || !validDeviceId(deviceId)) {
    return { ok: false, error: 'invalid_device' };
  }

  let rows;
  try {
    rows = await listDevices(userId);
  } catch (e) {
    const msg = String(e.message || '');
    if (msg.includes('account_devices') && (msg.includes('404') || msg.includes('PGRST') || msg.includes('42P01'))) {
      return { ok: false, error: 'devices_table_missing' };
    }
    throw e;
  }

  const existing = rows.find((r) => r.device_id === deviceId);
  if (existing) {
    await touchDevice(userId, deviceId).catch(() => {});
    return { ok: true, devices: rows.length, max: MAX_DEVICES_PER_ACCOUNT, created: false };
  }

  if (rows.length >= MAX_DEVICES_PER_ACCOUNT) {
    return {
      ok: false,
      error: 'device_limit',
      devices: rows.length,
      max: MAX_DEVICES_PER_ACCOUNT,
    };
  }

  const nowIso = new Date().toISOString();
  const { res, data } = await sbFetch('/rest/v1/account_devices', {
    method: 'POST',
    headersExtra: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      device_id: deviceId,
      created_at: nowIso,
      last_seen_at: nowIso,
    }),
  });

  if (!res.ok) {
    // 동시 등록 레이스 → 재조회
    if (res.status === 409) {
      const again = await listDevices(userId);
      if (again.some((r) => r.device_id === deviceId)) {
        return { ok: true, devices: again.length, max: MAX_DEVICES_PER_ACCOUNT, created: false };
      }
    }
    const msg = typeof data === 'object' ? JSON.stringify(data) : String(data);
    throw new Error(`account_devices insert ${res.status}: ${msg}`);
  }

  return {
    ok: true,
    devices: rows.length + 1,
    max: MAX_DEVICES_PER_ACCOUNT,
    created: true,
  };
}

/**
 * 등록 여부만 확인 (한도 초과 시 신규 등록하지 않음). 이미 있으면 touch.
 */
async function assertDeviceAllowed(userId, deviceId) {
  if (!userId || !validDeviceId(deviceId)) {
    return { ok: false, error: 'invalid_device' };
  }
  const rows = await listDevices(userId);
  if (rows.some((r) => r.device_id === deviceId)) {
    await touchDevice(userId, deviceId).catch(() => {});
    return { ok: true, devices: rows.length, max: MAX_DEVICES_PER_ACCOUNT };
  }
  if (rows.length < MAX_DEVICES_PER_ACCOUNT) {
    return ensureDeviceSlot(userId, deviceId);
  }
  return {
    ok: false,
    error: 'device_limit',
    devices: rows.length,
    max: MAX_DEVICES_PER_ACCOUNT,
  };
}

async function removeDevice(userId, deviceId) {
  const { res, data } = await sbFetch(
    `/rest/v1/account_devices?user_id=eq.${encodeURIComponent(userId)}&device_id=eq.${encodeURIComponent(deviceId)}`,
    { method: 'DELETE', headersExtra: { Prefer: 'return=minimal' } },
  );
  if (!res.ok) {
    const msg = typeof data === 'object' ? JSON.stringify(data) : String(data);
    throw new Error(`account_devices delete ${res.status}: ${msg}`);
  }
}

function registerAccountDeviceRoutes(app, { getUserIdFromAuth }) {
  app.get('/api/account/devices', async (req, res) => {
    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'login_required' });
      return;
    }
    try {
      const devices = await listDevices(userId);
      res.json({
        max: MAX_DEVICES_PER_ACCOUNT,
        devices: devices.map((d) => ({
          deviceId: d.device_id,
          label: d.label,
          createdAt: d.created_at,
          lastSeenAt: d.last_seen_at,
          isCurrent: false,
        })),
      });
    } catch (e) {
      console.error('[account/devices]', e);
      res.status(503).json({ error: 'devices_unavailable' });
    }
  });

  app.post('/api/account/devices/register', async (req, res) => {
    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'login_required' });
      return;
    }
    const deviceId = String(req.body?.deviceId || '').trim();
    try {
      const result = await ensureDeviceSlot(userId, deviceId);
      if (!result.ok) {
        const status = result.error === 'device_limit' ? 403 : 400;
        res.status(status).json(result);
        return;
      }
      res.json(result);
    } catch (e) {
      console.error('[account/devices/register]', e);
      res.status(502).json({ error: 'register_failed' });
    }
  });

  app.delete('/api/account/devices/:deviceId', async (req, res) => {
    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'login_required' });
      return;
    }
    const deviceId = String(req.params.deviceId || '').trim();
    if (!validDeviceId(deviceId)) {
      res.status(400).json({ error: 'invalid_device' });
      return;
    }
    try {
      await removeDevice(userId, deviceId);
      const devices = await listDevices(userId);
      res.json({ ok: true, devices: devices.length, max: MAX_DEVICES_PER_ACCOUNT });
    } catch (e) {
      console.error('[account/devices/delete]', e);
      res.status(502).json({ error: 'delete_failed' });
    }
  });
}

module.exports = {
  MAX_DEVICES_PER_ACCOUNT,
  validDeviceId,
  listDevices,
  ensureDeviceSlot,
  assertDeviceAllowed,
  removeDevice,
  registerAccountDeviceRoutes,
};
