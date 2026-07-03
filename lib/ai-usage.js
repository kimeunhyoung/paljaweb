/**
 * AI 월 크레딧 — 점성학·네임코드 공통 풀 (서버 전용)
 */
const crypto = require('crypto');

const FEATURES = {
  astro: { cost: 2, minPlan: 'basic', label: '점성학 AI 해석' },
  name_opinion: { cost: 1, minPlan: 'pro', label: '네임코드 AI 종합 의견' },
  name_recommend: { cost: 1, minPlan: 'pro', label: '네임코드 AI 이름 추천' },
};

const PLAN_LIMITS = {
  free: 0,
  basic: 10,
  pro: 30,
  professional: 120,
};

/** 상담사 15일 체험(Professional 기능·counselor_trial_license_id) — 유료 120 대신 */
const COUNSELOR_TRIAL_AI_LIMIT = 25;

const PLAN_RANK = { free: 0, basic: 1, pro: 2, professional: 3 };

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MODEL = 'claude-sonnet-4-6';

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
  const dbPlan = (profile && profile.plan) || 'free';
  if (dbPlan === 'free') return 'free';
  if (profile?.plan_active_until && new Date(profile.plan_active_until) <= new Date()) {
    return 'free';
  }
  return dbPlan;
}

function planLimit(plan) {
  return PLAN_LIMITS[plan] ?? 0;
}

function isCounselorTrialProfile(profile) {
  return (
    effectivePlan(profile) === 'professional' &&
    !!(profile && profile.counselor_trial_license_id)
  );
}

/** 체험권은 월 25크레딧, 유료 Professional은 120 */
function aiCreditLimit(profile) {
  if (isCounselorTrialProfile(profile)) return COUNSELOR_TRIAL_AI_LIMIT;
  return planLimit(effectivePlan(profile));
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

function buildQuotaPayload(profile) {
  const plan = effectivePlan(profile);
  const counselorTrial = isCounselorTrialProfile(profile);
  const period = kstPeriod();
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
    period,
    limit,
    features,
    limitNote: counselorTrial ? '상담사 15일 체험 한도' : null,
  };
}

async function buildQuotaWithUsage(userId, profile) {
  const base = buildQuotaPayload(profile);
  const used = userId ? await getMonthlyUsed(userId, base.period) : 0;
  return {
    ...base,
    used,
    remaining: Math.max(0, base.limit - used),
  };
}

function assertFeatureAccess(profile, feature) {
  const meta = FEATURES[feature];
  if (!meta) return { ok: false, status: 400, error: 'Unknown AI feature' };
  const plan = effectivePlan(profile);
  if ((PLAN_RANK[plan] || 0) < (PLAN_RANK[meta.minPlan] || 0)) {
    return {
      ok: false,
      status: 403,
      error: `${meta.label}은(는) ${meta.minPlan === 'pro' ? 'Pro' : 'Basic'} 이상 플랜에서 이용할 수 있어요.`,
      code: 'plan_required',
      minPlan: meta.minPlan,
    };
  }
  if (aiCreditLimit(profile) <= 0) {
    return { ok: false, status: 403, error: '이 플랜에서는 AI 크레딧이 제공되지 않아요.', code: 'no_quota' };
  }
  return { ok: true, meta, plan };
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
        error: 'feature가 필요합니다. (astro | name_opinion | name_recommend)',
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

    const period = kstPeriod();
    const limit = aiCreditLimit(profile);
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

    const used = await getMonthlyUsed(userId, period);
    if (used + cost > limit) {
      res.status(429).json({
        error: `이번 달 AI 크레딧을 모두 사용했어요. (${used}/${limit})`,
        code: 'quota_exceeded',
        quota: { period, limit, used, remaining: Math.max(0, limit - used) },
      });
      return;
    }

    try {
      const { status, data } = await callAnthropic({ model, max_tokens, messages });
      if (status < 200 || status >= 300) {
        res.status(status).json(data);
        return;
      }

      const consumed = await consumeCredits(userId, period, cost, limit);
      if (!consumed.ok) {
        res.status(429).json({
          error: '이번 달 AI 크레딧이 부족해요. 잠시 후 다시 시도해 주세요.',
          code: consumed.reason || 'quota_exceeded',
          quota: await buildQuotaWithUsage(userId, profile),
        });
        return;
      }

      if (cacheKeyHash) {
        await saveCache(userId, feature, cacheKeyHash, data);
      }

      const quota = await buildQuotaWithUsage(userId, profile);
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
  kstPeriod,
  effectivePlan,
  isCounselorTrialProfile,
  aiCreditLimit,
  isAiUpstreamAvailable,
};
