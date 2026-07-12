/**
 * AI 월 크레딧 — 점성학·네임코드 공통 풀 (서버 전용)
 */
const crypto = require('crypto');

const FEATURES = {
  astro: { cost: 2, minPlan: 'basic', label: '점성학 차트 AI 해석' },
  astro_couple: { cost: 2, minPlan: 'basic', label: '점성학 커플 궁합 AI' },
  astro_transit: { cost: 1, minPlan: 'basic', label: '점성학 트랜짓 AI' },
  astro_year: { cost: 1, minPlan: 'basic', label: '점성학 올해 운세 AI' },
  numerology_daily: { cost: 1, minPlan: 'basic', label: '수비학 AI 오늘 운세' },
  numerology_monthly: { cost: 1, minPlan: 'basic', label: '수비학 AI 이번 달 흐름' },
  name_opinion: { cost: 1, minPlan: 'plus', label: '네임코드 AI 종합 의견' },
  name_recommend: { cost: 1, minPlan: 'plus', label: '네임코드 AI 이름 추천' },
};

const PLAN_LIMITS = {
  free: 0,
  basic: 10,
  plus: 50,
  professional: 120,
  private: 120,
};

/** 상담사 15일 체험(Professional 기능·counselor_trial_license_id) — 유료 120 대신 */
const COUNSELOR_TRIAL_AI_LIMIT = 25;
/** 베이직 7일 이용권(basic_pass_license_id) — 월 Basic 10 대신 */
const BASIC_PASS_AI_LIMIT = 5;

const PLAN_RANK = { free: 0, basic: 1, plus: 2, professional: 3, private: 4 };

function purchasedBonus(profile) {
  return Math.max(0, Number(profile && profile.ai_credits_bonus) || 0);
}

function normalizeDbPlan(plan) {
  return String(plan || 'free').toLowerCase();
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MODEL = 'claude-sonnet-4-6';
/** 점성학 차트 AI: 요청당 최대 출력 + 끊기면 이어쓰기 최대 횟수 */
const ASTRO_MAX_OUTPUT_TOKENS = 8192;
const ASTRO_MAX_CONTINUE_ROUNDS = 4;
/** 점성학 트랜짓 AI (이번 주·큰 흐름) */
const ASTRO_TRANSIT_MAX_OUTPUT_TOKENS = 8192;
const ASTRO_TRANSIT_MAX_CONTINUE_ROUNDS = 3;
/** 수비학 달력 AI (오늘·이번 달) */
const NUMEROLOGY_MAX_OUTPUT_TOKENS = 4096;
const NUMEROLOGY_MAX_CONTINUE_ROUNDS = 2;

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

function isAiUpstreamAvailable() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return false;
  const flag = String(process.env.AI_ENABLED || '').toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

function kstPeriod(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  return `${y}-${m}`;
}

function effectivePlan(profile) {
  const dbPlan = normalizeDbPlan(profile && profile.plan);
  if (dbPlan === 'free') return 'free';
  if (profile?.plan_active_until && new Date(profile.plan_active_until) <= new Date()) {
    return 'free';
  }
  return dbPlan;
}

function planLimit(plan) {
  return PLAN_LIMITS[normalizeDbPlan(plan)] ?? 0;
}

function isCounselorTrialProfile(profile) {
  return (
    effectivePlan(profile) === 'professional' &&
    !!(profile && profile.counselor_trial_license_id)
  );
}

function isBasicPassProfile(profile) {
  return (
    effectivePlan(profile) === 'basic' &&
    !!(profile && profile.basic_pass_license_id) &&
    !profile.toss_billing_key
  );
}

function planAiCap(profile) {
  if (isCounselorTrialProfile(profile)) return COUNSELOR_TRIAL_AI_LIMIT;
  if (isBasicPassProfile(profile)) return BASIC_PASS_AI_LIMIT;
  return planLimit(effectivePlan(profile));
}

/** 체험·이용권은 축소 한도, 유료 구독은 플랜 한도. 구매 보너스는 합산. */
function aiCreditLimit(profile) {
  const bonus = purchasedBonus(profile);
  return planAiCap(profile) + bonus;
}

function normalizeCacheKey(raw) {
  const s = String(raw || '').trim();
  if (!s || s.length > 512) return null;
  return s;
}

function hashCacheKey(feature, raw) {
  const normalized = normalizeCacheKey(raw);
  if (!normalized) return null;
  return crypto.createHash('sha256').update(`${feature}:${normalized}`, 'utf8').digest('hex');
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

async function getMonthlyUsed(userId, period) {
  const { res, data } = await sbFetch(
    `/rest/v1/ai_usage_monthly?user_id=eq.${encodeURIComponent(userId)}` +
      `&period=eq.${encodeURIComponent(period)}&select=credits_used`,
  );
  if (!res.ok) return 0;
  return Number(data?.[0]?.credits_used) || 0;
}

async function getCachedResponse(userId, feature, cacheKeyHash) {
  if (!cacheKeyHash) return null;
  const since = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { res, data } = await sbFetch(
    `/rest/v1/ai_usage_cache?user_id=eq.${encodeURIComponent(userId)}` +
      `&feature=eq.${encodeURIComponent(feature)}` +
      `&cache_key=eq.${encodeURIComponent(cacheKeyHash)}` +
      `&created_at=gte.${encodeURIComponent(since)}` +
      `&select=response_json,created_at&order=created_at.desc&limit=1`,
  );
  if (!res.ok || !data?.[0]?.response_json) return null;
  return data[0].response_json;
}

async function saveCache(userId, feature, cacheKeyHash, responseJson) {
  if (!cacheKeyHash) return;
  await sbFetch('/rest/v1/ai_usage_cache', {
    method: 'POST',
    headersExtra: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      feature,
      cache_key: cacheKeyHash,
      response_json: responseJson,
      created_at: new Date().toISOString(),
    }),
  });
}

async function consumeCredits(userId, period, cost, limit) {
  const { res, data } = await sbFetch('/rest/v1/rpc/ai_consume_credits', {
    method: 'POST',
    body: JSON.stringify({
      p_user_id: userId,
      p_period: period,
      p_cost: cost,
      p_limit: limit,
    }),
  });
  if (!res.ok) {
    console.error('ai_consume_credits rpc failed', res.status, data);
    return { ok: false, reason: 'rpc_error', used: await getMonthlyUsed(userId, period) };
  }
  return data || { ok: false, reason: 'rpc_empty' };
}

async function callAnthropic({ model, max_tokens, messages }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: Number(max_tokens) || 1000,
      messages,
    }),
  });
  const data = await upstream.json();
  return { status: upstream.status, data };
}

function anthropicText(data) {
  return (data?.content || []).map((i) => i.text || '').join('');
}

const ASTRO_CONTINUE_USER = '위 해석이 출력 한도로 중간에 끊겼습니다. 끊긴 문장 바로 다음부터 이어서, 아직 작성하지 않은 ## 섹션만 모두 완성해 주세요. 이미 쓴 섹션과 내용은 반복하지 마세요.';

/** 점성학 등 긴 해석: max_tokens 도달 시 여러 번 이어쓰기 (추가 크레딧 없음) */
async function callAnthropicWithOptionalContinue({ model, max_tokens, messages, feature }) {
  const isAstroChart = feature === 'astro' || feature === 'astro_couple';
  const isAstroTransit = feature === 'astro_transit' || feature === 'astro_year';
  const isNumerology = feature === 'numerology_daily' || feature === 'numerology_monthly';
  const isContinuable = isAstroChart || isAstroTransit || isNumerology;
  let cap = Math.min(Number(max_tokens) || 1000, 4000);
  let maxRounds = 1;
  if (isAstroChart) {
    cap = ASTRO_MAX_OUTPUT_TOKENS;
    maxRounds = ASTRO_MAX_CONTINUE_ROUNDS;
  } else if (isAstroTransit) {
    cap = ASTRO_TRANSIT_MAX_OUTPUT_TOKENS;
    maxRounds = ASTRO_TRANSIT_MAX_CONTINUE_ROUNDS;
  } else if (isNumerology) {
    cap = NUMEROLOGY_MAX_OUTPUT_TOKENS;
    maxRounds = NUMEROLOGY_MAX_CONTINUE_ROUNDS;
  }
  const tokens = Math.min(Number(max_tokens) || 1000, cap);

  let roundMessages = messages;
  let fullText = '';
  let lastData = null;
  let status = 200;

  for (let round = 0; round < maxRounds; round += 1) {
    const res = await callAnthropic({ model, max_tokens: tokens, messages: roundMessages });
    status = res.status;
    lastData = res.data;
    if (status < 200 || status >= 300) {
      if (fullText) {
        return {
          status: 200,
          data: {
            ...lastData,
            stop_reason: 'max_tokens',
            content: [{ type: 'text', text: fullText }],
          },
        };
      }
      return res;
    }

    const chunk = anthropicText(lastData);
    if (chunk) fullText += (fullText ? '\n\n' : '') + chunk;

    if (!isContinuable || lastData?.stop_reason !== 'max_tokens') {
      return {
        status: 200,
        data: {
          ...lastData,
          content: [{ type: 'text', text: fullText }],
        },
      };
    }

    if (round + 1 >= maxRounds) break;

    roundMessages = [
      ...messages,
      { role: 'assistant', content: fullText },
      { role: 'user', content: ASTRO_CONTINUE_USER },
    ];
  }

  return {
    status: 200,
    data: {
      ...lastData,
      stop_reason: 'max_tokens',
      content: [{ type: 'text', text: fullText }],
    },
  };
}

function buildQuotaPayload(profile) {
  const plan = effectivePlan(profile);
  const counselorTrial = isCounselorTrialProfile(profile);
  const basicPass = isBasicPassProfile(profile);
  const period = kstPeriod();
  const bonus = purchasedBonus(profile);
  const limit = aiCreditLimit(profile);
  const features = {};
  Object.keys(FEATURES).forEach((key) => {
    const f = FEATURES[key];
    features[key] = {
      cost: f.cost,
      minPlan: f.minPlan,
      label: f.label,
    };
  });
  return {
    plan,
    counselorTrial,
    basicPass,
    period,
    limit,
    bonus,
    features,
    limitNote: counselorTrial
      ? '상담사 15일 체험 한도'
      : basicPass
        ? '베이직 7일 이용권 한도(AI 5)'
        : bonus > 0
          ? '구매 크레딧 포함'
          : null,
  };
}

/** 이번 달 잔여 = (플랜 월 한도 − 이번 달 사용 중 플랜분) + 구매 크레딧 잔여 */
function computeAiRemaining(profile, monthlyUsed) {
  const plan = effectivePlan(profile);
  const planCap = planAiCap(profile);
  const bonus = purchasedBonus(profile);
  const used = Math.max(0, Number(monthlyUsed) || 0);
  const planRem = Math.max(0, planCap - Math.min(used, planCap));
  const remaining = planRem + bonus;
  // 표시용 한도: 현재 잔여 + 이번 달 이미 쓴 양(플랜+구매)
  const limit = remaining + used;
  return {
    plan,
    planCap,
    bonus,
    used,
    remaining,
    limit,
  };
}

async function buildQuotaWithUsage(userId, profile) {
  const base = buildQuotaPayload(profile);
  const used = userId ? await getMonthlyUsed(userId, base.period) : 0;
  const computed = computeAiRemaining(profile, used);
  return {
    ...base,
    limit: computed.limit,
    used: computed.used,
    remaining: computed.remaining,
    bonus: computed.bonus,
  };
}

function assertFeatureAccess(profile, feature) {
  const meta = FEATURES[feature];
  if (!meta) return { ok: false, status: 400, error: 'Unknown AI feature' };
  const plan = effectivePlan(profile);
  const bonus = purchasedBonus(profile);
  const planOk = (PLAN_RANK[plan] || 0) >= (PLAN_RANK[meta.minPlan] || 0);
  // 구매 크레딧이 있으면 Basic 티어 AI(차트·운세 등)는 Free에서도 허용. Plus 전용(네임)은 제외.
  const bonusOk = bonus > 0 && (PLAN_RANK[meta.minPlan] || 0) <= PLAN_RANK.basic;
  if (!planOk && !bonusOk) {
    return {
      ok: false,
      status: 403,
      error: `${meta.label}은(는) ${meta.minPlan === 'plus' ? 'Plus' : 'Basic'} 이상 플랜에서 이용할 수 있어요.`,
      code: 'plan_required',
      minPlan: meta.minPlan,
    };
  }
  if (aiCreditLimit(profile) <= 0) {
    return { ok: false, status: 403, error: '이 플랜에서는 AI 크레딧이 제공되지 않아요.', code: 'no_quota' };
  }
  return { ok: true, meta, plan };
}

async function assertPaidPlanDevice(userId, profile, deviceId) {
  const plan = effectivePlan(profile);
  if (plan === 'free') return { ok: true };
  const { assertDeviceAllowed } = require('./account-devices');
  if (!deviceId) {
    return {
      ok: false,
      status: 403,
      error: '기기 정보가 없어 유료 기능을 확인할 수 없어요. 페이지를 새로고침해 주세요.',
      code: 'device_required',
    };
  }
  try {
    const slot = await assertDeviceAllowed(userId, deviceId);
    if (!slot.ok) {
      return {
        ok: false,
        status: 403,
        error: `이 계정은 이미 기기 ${slot.max || 4}대까지 등록되어 있어요. 다른 기기에서 이용 중이라면 고객센터로 문의해 주세요.`,
        code: 'device_limit',
        devices: slot.devices,
        max: slot.max,
      };
    }
    return { ok: true };
  } catch (e) {
    console.error('[ai-usage] device check', e);
    return { ok: true };
  }
}

async function decrementPurchasedBonus(userId, cost) {
  if (!userId || cost < 1) return;
  const { res, data } = await sbFetch(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=ai_credits_bonus`,
  );
  if (!res.ok) return;
  const row = Array.isArray(data) && data[0] ? data[0] : null;
  if (!row) return;
  const cur = Math.max(0, Number(row.ai_credits_bonus) || 0);
  if (cur < 1) return;
  const next = Math.max(0, cur - cost);
  await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headersExtra: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ai_credits_bonus: next }),
  });
}

function registerAiUsageRoutes(app, { getUserIdFromAuth, getProfile, isAiAvailable }) {
  const aiOn = typeof isAiAvailable === 'function' ? isAiAvailable : isAiUpstreamAvailable;

  app.get('/api/ai/status', async (req, res) => {
    const userId = await getUserIdFromAuth(req.headers.authorization);
    const payload = { available: aiOn() };
    if (userId) {
      const profile = await getProfile(userId);
      if (profile) {
        const quota = await buildQuotaWithUsage(userId, profile);
        payload.quota = quota;
      }
    }
    res.json(payload);
  });

  app.get('/api/ai/quota', async (req, res) => {
    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }
    const profile = await getProfile(userId);
    if (!profile) {
      res.status(404).json({ error: '프로필을 찾을 수 없어요.' });
      return;
    }
    res.json(await buildQuotaWithUsage(userId, profile));
  });

  app.post('/api/ai/messages', async (req, res) => {
    if (!aiOn()) {
      res.status(503).json({ error: 'AI server not configured' });
      return;
    }

    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }

    const profile = await getProfile(userId);
    if (!profile) {
      res.status(404).json({ error: '프로필을 찾을 수 없어요.' });
      return;
    }

    const { feature, cacheKey, model, max_tokens, messages } = req.body || {};
    if (!feature || !FEATURES[feature]) {
      res.status(400).json({
        error: 'feature가 필요합니다. (astro | astro_couple | astro_transit | astro_year | numerology_daily | numerology_monthly | name_opinion | name_recommend)',
      });
      return;
    }
    if (!model || !Array.isArray(messages) || !messages.length) {
      res.status(400).json({ error: 'model and messages are required' });
      return;
    }

    const access = assertFeatureAccess(profile, feature);
    if (!access.ok) {
      res.status(access.status).json({
        error: access.error,
        code: access.code,
        minPlan: access.minPlan,
      });
      return;
    }

    const deviceId = String(req.headers['x-device-id'] || req.body?.deviceId || '').trim();
    const deviceGate = await assertPaidPlanDevice(userId, profile, deviceId);
    if (!deviceGate.ok) {
      res.status(deviceGate.status || 403).json({
        error: deviceGate.error,
        code: deviceGate.code,
        devices: deviceGate.devices,
        max: deviceGate.max,
      });
      return;
    }

    const period = kstPeriod();
    const usedBefore = await getMonthlyUsed(userId, period);
    const computed = computeAiRemaining(profile, usedBefore);
    const cost = access.meta.cost;
    const cacheKeyHash = hashCacheKey(feature, cacheKey);

    const cached = await getCachedResponse(userId, feature, cacheKeyHash);
    if (cached) {
      const quota = await buildQuotaWithUsage(userId, profile);
      res.json({
        ...cached,
        _palja: { cached: true, charged: false, cost: 0, quota },
      });
      return;
    }

    if (computed.remaining < cost) {
      res.status(429).json({
        error: `이번 달 AI 크레딧을 모두 사용했어요. (${computed.used}/${computed.limit})`,
        code: 'quota_exceeded',
        quota: {
          period,
          limit: computed.limit,
          used: computed.used,
          remaining: computed.remaining,
          bonus: computed.bonus,
        },
      });
      return;
    }

    try {
      const { status, data } = await callAnthropicWithOptionalContinue({
        model, max_tokens, messages, feature,
      });
      if (status < 200 || status >= 300) {
        res.status(status).json(data);
        return;
      }

      // 월 사용량 기록(통계·표시) + 구매 크레딧은 플랜 한도 초과분만 차감
      const planCap = computed.planCap;
      const planRem = Math.max(0, planCap - Math.min(usedBefore, planCap));
      const fromBonus = Math.max(0, cost - Math.min(cost, planRem));
      const consumed = await consumeCredits(
        userId,
        period,
        cost,
        usedBefore + computed.remaining,
      );
      if (!consumed.ok) {
        res.status(429).json({
          error: '이번 달 AI 크레딧이 부족해요. 잠시 후 다시 시도해 주세요.',
          code: consumed.reason || 'quota_exceeded',
          quota: await buildQuotaWithUsage(userId, profile),
        });
        return;
      }

      if (fromBonus > 0) {
        await decrementPurchasedBonus(userId, fromBonus);
      }
      const freshProfile = (await getProfile(userId)) || profile;

      if (cacheKeyHash) {
        await saveCache(userId, feature, cacheKeyHash, data);
      }

      const quota = await buildQuotaWithUsage(userId, freshProfile);
      res.json({
        ...data,
        _palja: { cached: false, charged: true, cost, quota },
      });
    } catch (e) {
      console.error('ai proxy error', e);
      res.status(502).json({ error: 'AI upstream request failed' });
    }
  });
}

module.exports = {
  registerAiUsageRoutes,
  FEATURES,
  PLAN_LIMITS,
  COUNSELOR_TRIAL_AI_LIMIT,
  BASIC_PASS_AI_LIMIT,
  kstPeriod,
  effectivePlan,
  isCounselorTrialProfile,
  isBasicPassProfile,
  aiCreditLimit,
  computeAiRemaining,
  isAiUpstreamAvailable,
};
