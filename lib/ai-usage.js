/**
 * AI 월 크레딧 — 점성학·네임코드 공통 풀 (서버 전용)
 */
const crypto = require('crypto');

const FEATURES = {
  astro: { cost: 3, minPlan: 'basic', label: '점성학 차트 AI 해석' },
  astro_money: { cost: 2, minPlan: 'basic', label: '점성학 재물·금전 심화' },
  astro_love: { cost: 2, minPlan: 'basic', label: '점성학 연애·관계 심화' },
  astro_career: { cost: 2, minPlan: 'basic', label: '점성학 일·커리어 심화' },
  astro_study: { cost: 2, minPlan: 'basic', label: '점성학 학업·시험·성장 심화' },
  astro_couple: { cost: 4, minPlan: 'basic', label: '점성학 커플 궁합 AI' },
  astro_transit: { cost: 1, minPlan: 'basic', label: '점성학 트랜짓 AI' },
  astro_year: { cost: 1, minPlan: 'basic', label: '점성학 올해 운세 AI' },
  astro_timeline: { cost: 2, minPlan: 'basic', label: '점성학 장기 운·좋은 시기 AI' },
  astro_life_timeline: { cost: 3, minPlan: 'basic', label: '점성학 인생 운의 흐름 AI' },
  numerology_daily: { cost: 1, minPlan: 'basic', label: '수비학 AI 오늘 운세' },
  numerology_monthly: { cost: 1, minPlan: 'basic', label: '수비학 AI 이번 달 흐름' },
  name_opinion: { cost: 1, minPlan: 'plus', label: '네임코드 AI 종합 의견' },
  name_recommend: { cost: 1, minPlan: 'plus', label: '네임코드 AI 이름 추천' },
  counselor_session_basic: { cost: 1, minPlan: 'professional', label: '타로 AI 기본 (1장)' },
  counselor_session: { cost: 2, minPlan: 'professional', label: '타로 AI 심화 (2~3장)' },
  counselor_session_plus: { cost: 3, minPlan: 'professional', label: '타로 AI 확장 (4~6장)' },
  counselor_session_full: { cost: 4, minPlan: 'professional', label: '타로 AI 풀스프레드 (7~9장)' },
  counselor_integrated_basic: { cost: 2, minPlan: 'professional', label: '상담사 AI 통합 리딩 (1장·수비·점성)' },
  counselor_integrated: { cost: 3, minPlan: 'professional', label: '상담사 AI 통합 리딩 (2~3장·수비·점성)' },
  counselor_integrated_plus: { cost: 4, minPlan: 'professional', label: '상담사 AI 통합 리딩 (4~6장·수비·점성)' },
  counselor_integrated_full: { cost: 5, minPlan: 'professional', label: '상담사 AI 통합 리딩 (7~9장·수비·점성)' },
  counselor_lenormand_basic: { cost: 1, minPlan: 'professional', label: '상담사 레노먼드 AI (1장)' },
  counselor_lenormand: { cost: 2, minPlan: 'professional', label: '상담사 레노먼드 AI (2~3장)' },
  counselor_lenormand_plus: { cost: 3, minPlan: 'professional', label: '상담사 레노먼드 AI (4~6장)' },
  counselor_iching_basic: { cost: 1, minPlan: 'professional', label: '상담사 주역 AI (단괘)' },
  counselor_iching: { cost: 2, minPlan: 'professional', label: '상담사 주역 AI (본괘·지괘)' },
  counselor_iching_plus: { cost: 3, minPlan: 'professional', label: '상담사 주역 AI (확장)' },
  counselor_kirke_basic: { cost: 1, minPlan: 'professional', label: '상담사 오디세이신화타로 AI (1장)' },
  counselor_kirke: { cost: 2, minPlan: 'professional', label: '상담사 오디세이신화타로 AI (2~3장)' },
  counselor_kirke_plus: { cost: 3, minPlan: 'professional', label: '상담사 오디세이신화타로 AI (4장+)' },
  tarot_reading_basic: { cost: 1, minPlan: 'basic', label: '타로코드 AI 리딩 (1장)' },
  tarot_reading: { cost: 1, minPlan: 'basic', label: '타로코드 AI 리딩 (2~3장)' },
  tarot_reading_plus: { cost: 1, minPlan: 'basic', label: '타로코드 AI 리딩 (4장+)' },
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
/** 상담사 테스터(beta) — 라이선스 note에 [beta_ai:10] */
const COUNSELOR_BETA_AI_LIMIT = 10;
const BETA_AI_NOTE_RE = /\[beta_ai:(\d{1,3})\]/i;
/** 베이직 7일 이용권(basic_pass_license_id) — 월 Basic 10 대신 */
const BASIC_PASS_AI_LIMIT = 5;

const trialAiCapCache = new Map(); // licenseId -> { cap, at }
const TRIAL_AI_CAP_CACHE_MS = 5 * 60 * 1000;

const PLAN_RANK = { free: 0, basic: 1, plus: 2, professional: 3, private: 4 };

function purchasedBonus(profile) {
  return Math.max(0, Number(profile && profile.ai_credits_bonus) || 0);
}

function normalizeDbPlan(plan) {
  const p = String(plan || 'free').toLowerCase();
  if (p === 'pro') return 'plus';
  return p;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_BY_FEATURE = {
  // 트랜짓 AI: 각 구성 지문 키와 맞춤 (느린 행성은 오래 유지)
  astro_transit: 10 * 24 * 60 * 60 * 1000,
  astro_year: 7 * 24 * 60 * 60 * 1000,
  astro_timeline: 30 * 24 * 60 * 60 * 1000,
  astro_life_timeline: 30 * 24 * 60 * 60 * 1000,
};

function cacheTtlMsForFeature(feature) {
  const n = CACHE_TTL_BY_FEATURE[feature];
  return typeof n === 'number' && n > 0 ? n : CACHE_TTL_MS;
}
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

/** 월 구독은 YYYY-MM. 체험·이용권은 라이선스별 고정 기간(월 경계 리셋 없음). */
function aiUsagePeriod(profile) {
  if (isCounselorTrialProfile(profile) && profile.counselor_trial_license_id) {
    return `trial-counselor:${profile.counselor_trial_license_id}`;
  }
  if (isBasicPassProfile(profile) && profile.basic_pass_license_id) {
    return `trial-basic:${profile.basic_pass_license_id}`;
  }
  return kstPeriod();
}

function isTrialUsagePeriod(period) {
  return String(period || '').startsWith('trial-');
}

function quotaPeriodLabel(period) {
  return isTrialUsagePeriod(period) ? '체험 AI 크레딧' : '이번 달 AI 크레딧';
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

function parseBetaAiFromNote(note) {
  const m = String(note || '').match(BETA_AI_NOTE_RE);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 1) return null;
  return Math.min(500, n);
}

function planAiCap(profile, trialAiOverride) {
  if (isCounselorTrialProfile(profile)) {
    if (Number.isInteger(trialAiOverride) && trialAiOverride > 0) return trialAiOverride;
    return COUNSELOR_TRIAL_AI_LIMIT;
  }
  if (isBasicPassProfile(profile)) return BASIC_PASS_AI_LIMIT;
  return planLimit(effectivePlan(profile));
}

/** 체험·이용권은 축소 한도, 유료 구독은 플랜 한도. 구매 보너스는 합산. */
function aiCreditLimit(profile, trialAiOverride) {
  const bonus = purchasedBonus(profile);
  return planAiCap(profile, trialAiOverride) + bonus;
}

function invalidateTrialAiCapCache(licenseId) {
  if (!licenseId) {
    trialAiCapCache.clear();
    return;
  }
  trialAiCapCache.delete(String(licenseId));
}

async function resolveCounselorTrialAiCap(profile) {
  if (!isCounselorTrialProfile(profile)) return null;
  const licenseId = profile.counselor_trial_license_id;
  if (!licenseId) return COUNSELOR_TRIAL_AI_LIMIT;

  const cached = trialAiCapCache.get(licenseId);
  if (cached && Date.now() - cached.at < TRIAL_AI_CAP_CACHE_MS) {
    return cached.cap;
  }

  try {
    const { res, data } = await sbFetch(
      `/rest/v1/lifecode_licenses?id=eq.${encodeURIComponent(licenseId)}&select=note&limit=1`,
    );
    const row = res.ok && Array.isArray(data) && data[0] ? data[0] : null;
    const fromNote = parseBetaAiFromNote(row && row.note);
    let cap = fromNote;
    if (cap == null && /테스터/i.test(String((row && row.note) || ''))) {
      cap = COUNSELOR_BETA_AI_LIMIT;
    }
    if (cap == null) cap = COUNSELOR_TRIAL_AI_LIMIT;
    trialAiCapCache.set(licenseId, { cap, at: Date.now() });
    return cap;
  } catch (_) {
    return COUNSELOR_TRIAL_AI_LIMIT;
  }
}

async function resolvePlanAiCap(profile) {
  if (isCounselorTrialProfile(profile)) {
    return (await resolveCounselorTrialAiCap(profile)) || COUNSELOR_TRIAL_AI_LIMIT;
  }
  return planAiCap(profile);
}

async function resolveAiCreditLimit(profile) {
  const planCap = await resolvePlanAiCap(profile);
  return planCap + purchasedBonus(profile);
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
  const since = new Date(Date.now() - cacheTtlMsForFeature(feature)).toISOString();
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

async function callAnthropic({ model, max_tokens, messages, temperature }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: Number(max_tokens) || 1000,
    messages,
  };
  if (typeof temperature === 'number' && Number.isFinite(temperature)) {
    body.temperature = temperature;
  }
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  const data = await upstream.json();
  return { status: upstream.status, data };
}

function anthropicText(data) {
  return (data?.content || []).map((i) => i.text || '').join('');
}

function isCounselorFeature(feature) {
  return (
    feature === 'counselor_session' ||
    feature === 'counselor_session_basic' ||
    feature === 'counselor_session_plus' ||
    feature === 'counselor_session_full' ||
    feature === 'counselor_integrated' ||
    feature === 'counselor_integrated_basic' ||
    feature === 'counselor_integrated_plus' ||
    feature === 'counselor_integrated_full' ||
    feature === 'counselor_lenormand' ||
    feature === 'counselor_lenormand_basic' ||
    feature === 'counselor_lenormand_plus' ||
    feature === 'counselor_iching' ||
    feature === 'counselor_iching_basic' ||
    feature === 'counselor_iching_plus' ||
    feature === 'counselor_kirke' ||
    feature === 'counselor_kirke_basic' ||
    feature === 'counselor_kirke_plus'
  );
}

function isTarotReadingFeature(feature) {
  return (
    feature === 'tarot_reading' ||
    feature === 'tarot_reading_basic' ||
    feature === 'tarot_reading_plus'
  );
}

/** Anthropic SSE 스트림 → 텍스트 델타 콜백 */
async function callAnthropicStream({ model, max_tokens, messages, temperature, onDelta, signal }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: Number(max_tokens) || 1000,
    messages,
    stream: true,
  };
  if (typeof temperature === 'number' && Number.isFinite(temperature)) {
    body.temperature = temperature;
  }
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({ error: 'upstream_error' }));
    return { status: upstream.status, data, text: '', stop_reason: null };
  }
  if (!upstream.body) {
    return { status: 502, data: { error: 'empty_stream' }, text: '', stop_reason: null };
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let stopReason = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, '');
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let evt;
      try {
        evt = JSON.parse(payload);
      } catch (_) {
        continue;
      }
      if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta' && evt.delta.text) {
        fullText += evt.delta.text;
        if (typeof onDelta === 'function') onDelta(evt.delta.text);
      } else if (evt.type === 'message_delta' && evt.delta && evt.delta.stop_reason) {
        stopReason = evt.delta.stop_reason;
      } else if (evt.type === 'error') {
        return {
          status: 502,
          data: evt.error || evt,
          text: fullText,
          stop_reason: stopReason,
        };
      }
    }
  }

  return {
    status: 200,
    data: {
      content: [{ type: 'text', text: fullText }],
      stop_reason: stopReason || 'end_turn',
    },
    text: fullText,
    stop_reason: stopReason || 'end_turn',
  };
}

const ASTRO_CONTINUE_USER = '위 해석이 출력 한도로 중간에 끊겼습니다. 끊긴 문장 바로 다음부터 이어서, 아직 작성하지 않은 ## 섹션만 모두 완성해 주세요. 이미 쓴 섹션과 내용은 반복하지 마세요.';

const COUNSELOR_MAX_OUTPUT_TOKENS = 4096;
const COUNSELOR_MAX_CONTINUE_ROUNDS = 3;
/** 7~9장 풀스프레드 — 카드별·종합이 길어져 잘리지 않도록 여유 */
const COUNSELOR_FULL_MAX_OUTPUT_TOKENS = 8192;
const COUNSELOR_FULL_MAX_CONTINUE_ROUNDS = 6;
const TAROT_READING_MAX_OUTPUT_TOKENS = 2800;
const TAROT_READING_MAX_CONTINUE_ROUNDS = 2;

function continueCapForFeature(feature, max_tokens) {
  const isAstroChart =
    feature === 'astro' ||
    feature === 'astro_couple' ||
    feature === 'astro_money' ||
    feature === 'astro_love' ||
    feature === 'astro_career' ||
    feature === 'astro_study';
  const isAstroTransit =
    feature === 'astro_transit' ||
    feature === 'astro_year' ||
    feature === 'astro_timeline' ||
    feature === 'astro_life_timeline';
  const isNumerology = feature === 'numerology_daily' || feature === 'numerology_monthly';
  const isCounselor = isCounselorFeature(feature);
  const isTarot = isTarotReadingFeature(feature);
  const isContinuable = isAstroChart || isAstroTransit || isNumerology || isCounselor || isTarot;
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
  } else if (isCounselor) {
    const isFull =
      feature === 'counselor_session_full' || feature === 'counselor_integrated_full';
    cap = isFull ? COUNSELOR_FULL_MAX_OUTPUT_TOKENS : COUNSELOR_MAX_OUTPUT_TOKENS;
    maxRounds = isFull ? COUNSELOR_FULL_MAX_CONTINUE_ROUNDS : COUNSELOR_MAX_CONTINUE_ROUNDS;
  } else if (isTarot) {
    cap = TAROT_READING_MAX_OUTPUT_TOKENS;
    maxRounds = TAROT_READING_MAX_CONTINUE_ROUNDS;
  }
  return {
    isContinuable,
    tokens: Math.min(Number(max_tokens) || 1000, cap),
    maxRounds,
  };
}

/** 점성학 등 긴 해석: max_tokens 도달 시 여러 번 이어쓰기 (추가 크레딧 없음) */
async function callAnthropicWithOptionalContinue({ model, max_tokens, messages, feature, temperature }) {
  const { isContinuable, tokens, maxRounds } = continueCapForFeature(feature, max_tokens);

  let roundMessages = messages;
  let fullText = '';
  let lastData = null;
  let status = 200;

  for (let round = 0; round < maxRounds; round += 1) {
    const res = await callAnthropic({ model, max_tokens: tokens, messages: roundMessages, temperature });
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

/** 스트리밍 + 이어쓰기. onDelta(textChunk)로 즉시 전달 */
async function callAnthropicWithOptionalContinueStream({
  model, max_tokens, messages, feature, temperature, onDelta, signal,
}) {
  const { isContinuable, tokens, maxRounds } = continueCapForFeature(feature, max_tokens);

  let roundMessages = messages;
  let fullText = '';
  let lastStop = null;
  let lastData = null;

  for (let round = 0; round < maxRounds; round += 1) {
    if (signal && signal.aborted) {
      return {
        status: 499,
        data: { error: 'client_aborted' },
        text: fullText,
        stop_reason: lastStop,
      };
    }

    if (fullText) {
      if (typeof onDelta === 'function') onDelta('\n\n');
      fullText += '\n\n';
    }

    const res = await callAnthropicStream({
      model,
      max_tokens: tokens,
      messages: roundMessages,
      temperature,
      signal,
      onDelta: (piece) => {
        if (!piece) return;
        fullText += piece;
        if (typeof onDelta === 'function') onDelta(piece);
      },
    });

    if (res.status < 200 || res.status >= 300) {
      if (fullText.trim()) {
        return {
          status: 200,
          data: {
            content: [{ type: 'text', text: fullText }],
            stop_reason: 'max_tokens',
          },
          text: fullText,
          stop_reason: 'max_tokens',
        };
      }
      return res;
    }

    lastStop = res.stop_reason;
    lastData = res.data;

    if (!isContinuable || res.stop_reason !== 'max_tokens') {
      return {
        status: 200,
        data: {
          ...(lastData || {}),
          content: [{ type: 'text', text: fullText }],
          stop_reason: lastStop,
        },
        text: fullText,
        stop_reason: lastStop,
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
      ...(lastData || {}),
      content: [{ type: 'text', text: fullText }],
      stop_reason: 'max_tokens',
    },
    text: fullText,
    stop_reason: 'max_tokens',
  };
}

function writeSse(res, event, payload) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function buildQuotaPayload(profile, trialAiOverride) {
  const plan = effectivePlan(profile);
  const counselorTrial = isCounselorTrialProfile(profile);
  const basicPass = isBasicPassProfile(profile);
  const period = aiUsagePeriod(profile);
  const bonus = purchasedBonus(profile);
  const planCap = planAiCap(profile, trialAiOverride);
  const limit = planCap + bonus;
  const isBeta = counselorTrial && Number.isInteger(trialAiOverride) && trialAiOverride === COUNSELOR_BETA_AI_LIMIT;
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
      ? (isBeta
        ? `상담사 테스터 한도(총 ${planCap})`
        : `상담사 체험 한도(총 ${planCap})`)
      : basicPass
        ? '베이직 7일 이용권 한도(총 5)'
        : bonus > 0
          ? '구매 크레딧 포함'
          : null,
  };
}

/** 이번 달 잔여 = (플랜 월 한도 − 이번 달 사용 중 플랜분) + 구매 크레딧 잔여 */
function computeAiRemaining(profile, monthlyUsed, trialAiOverride) {
  const plan = effectivePlan(profile);
  const planCap = planAiCap(profile, trialAiOverride);
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
  const trialAi = isCounselorTrialProfile(profile) ? await resolveCounselorTrialAiCap(profile) : null;
  const base = buildQuotaPayload(profile, trialAi);
  const used = userId ? await getMonthlyUsed(userId, base.period) : 0;
  const computed = computeAiRemaining(profile, used, trialAi);
  return {
    ...base,
    limit: computed.limit,
    used: computed.used,
    remaining: computed.remaining,
    bonus: computed.bonus,
  };
}

async function assertFeatureAccess(profile, feature) {
  const meta = FEATURES[feature];
  if (!meta) return { ok: false, status: 400, error: 'Unknown AI feature' };
  const plan = effectivePlan(profile);
  const bonus = purchasedBonus(profile);
  const planOk = (PLAN_RANK[plan] || 0) >= (PLAN_RANK[meta.minPlan] || 0);
  // 구매 크레딧이 있으면 Basic 티어 AI(차트·운세 등)는 Free에서도 허용. Plus 전용(네임)은 제외.
  const bonusOk = bonus > 0 && (PLAN_RANK[meta.minPlan] || 0) <= PLAN_RANK.basic;
  if (!planOk && !bonusOk) {
    const planLabel =
      meta.minPlan === 'professional' ? 'Professional' :
      meta.minPlan === 'plus' ? 'Plus' : 'Basic';
    return {
      ok: false,
      status: 403,
      error: `${meta.label}은(는) ${planLabel} 이상 플랜에서 이용할 수 있어요.`,
      code: 'plan_required',
      minPlan: meta.minPlan,
    };
  }
  if ((await resolveAiCreditLimit(profile)) <= 0) {
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

    const { feature, cacheKey, model, max_tokens, messages, stream: wantStream, payload } =
      req.body || {};
    if (!feature || !FEATURES[feature]) {
      res.status(400).json({
        error: 'feature가 필요합니다. (astro | astro_money | astro_love | astro_career | astro_study | astro_couple | astro_transit | astro_year | astro_timeline | astro_life_timeline | numerology_daily | numerology_monthly | name_opinion | name_recommend | counselor_session_basic | counselor_session | counselor_session_plus | counselor_session_full | counselor_integrated_basic | counselor_integrated | counselor_integrated_plus | counselor_integrated_full | counselor_lenormand_basic | counselor_lenormand | counselor_lenormand_plus | counselor_iching_basic | counselor_iching | counselor_iching_plus | counselor_kirke_basic | counselor_kirke | counselor_kirke_plus | tarot_reading_basic | tarot_reading | tarot_reading_plus)',
      });
      return;
    }

    let resolvedMessages = messages;
    const astroPayloadFeatures = ['astro', 'astro_money', 'astro_love', 'astro_career', 'astro_study'];
    if (astroPayloadFeatures.indexOf(feature) >= 0) {
      try {
        const { buildAstroPrompt } = require('./astro-ai-prompts');
        const prompt = buildAstroPrompt(feature, payload);
        resolvedMessages = [{ role: 'user', content: prompt }];
      } catch (e) {
        res.status(400).json({ error: e.message || 'invalid_chart_payload', code: 'invalid_payload' });
        return;
      }
    } else if (!Array.isArray(messages) || !messages.length) {
      res.status(400).json({ error: 'model and messages are required' });
      return;
    }

    if (!model) {
      res.status(400).json({ error: 'model is required' });
      return;
    }

    const access = await assertFeatureAccess(profile, feature);
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

    const period = aiUsagePeriod(profile);
    const usedBefore = await getMonthlyUsed(userId, period);
    const trialAi = isCounselorTrialProfile(profile) ? await resolveCounselorTrialAiCap(profile) : null;
    const computed = computeAiRemaining(profile, usedBefore, trialAi);
    const cost = access.meta.cost;
    const cacheKeyHash = hashCacheKey(feature, cacheKey);
    const useStream = !!wantStream;

    const cached = await getCachedResponse(userId, feature, cacheKeyHash);
    if (cached) {
      const quota = await buildQuotaWithUsage(userId, profile);
      if (useStream) {
        res.status(200);
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        if (typeof res.flushHeaders === 'function') res.flushHeaders();
        const cachedText = anthropicText(cached);
        if (cachedText) writeSse(res, 'delta', { text: cachedText });
        writeSse(res, 'done', {
          content: cached.content || [{ type: 'text', text: cachedText }],
          stop_reason: cached.stop_reason || 'end_turn',
          _palja: { cached: true, charged: false, cost: 0, quota },
        });
        res.end();
        return;
      }
      res.json({
        ...cached,
        _palja: { cached: true, charged: false, cost: 0, quota },
      });
      return;
    }

    if (computed.remaining < cost) {
      res.status(429).json({
        error: `${quotaPeriodLabel(period)}을 모두 사용했어요. (${computed.used}/${computed.limit})`,
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

    const temperature =
      isCounselorFeature(feature) || isTarotReadingFeature(feature) ? 0.35 : undefined;

    if (useStream) {
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      if (typeof res.flushHeaders === 'function') res.flushHeaders();

      const ac = new AbortController();
      const onClose = () => {
        try { ac.abort(); } catch (_) {}
      };
      req.on('close', onClose);

      try {
        const result = await callAnthropicWithOptionalContinueStream({
          model,
          max_tokens,
          messages: resolvedMessages,
          feature,
          temperature,
          signal: ac.signal,
          onDelta: (text) => {
            if (!text || res.writableEnded) return;
            writeSse(res, 'delta', { text });
          },
        });

        if (result.status < 200 || result.status >= 300) {
          writeSse(res, 'error', {
            error: (result.data && (result.data.error?.message || result.data.error || result.data.message)) || 'AI upstream request failed',
            status: result.status,
          });
          res.end();
          return;
        }

        const data = {
          content: [{ type: 'text', text: result.text || '' }],
          stop_reason: result.stop_reason || 'end_turn',
        };

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
          writeSse(res, 'error', {
            error: `${quotaPeriodLabel(period)}이 부족해요. 잠시 후 다시 시도해 주세요.`,
            code: consumed.reason || 'quota_exceeded',
            quota: await buildQuotaWithUsage(userId, profile),
          });
          res.end();
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
        writeSse(res, 'done', {
          ...data,
          _palja: { cached: false, charged: true, cost, quota },
        });
        res.end();
      } catch (e) {
        console.error('ai stream proxy error', e);
        if (!res.writableEnded) {
          writeSse(res, 'error', { error: 'AI upstream request failed' });
          res.end();
        }
      } finally {
        req.off('close', onClose);
      }
      return;
    }

    try {
      const { status, data } = await callAnthropicWithOptionalContinue({
        model,
        max_tokens,
        messages: resolvedMessages,
        feature,
        temperature,
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
          error: `${quotaPeriodLabel(period)}이 부족해요. 잠시 후 다시 시도해 주세요.`,
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
  COUNSELOR_BETA_AI_LIMIT,
  BASIC_PASS_AI_LIMIT,
  aiUsagePeriod,
  isTrialUsagePeriod,
  kstPeriod,
  buildQuotaWithUsage,
  effectivePlan,
  isCounselorTrialProfile,
  isBasicPassProfile,
  aiCreditLimit,
  resolveAiCreditLimit,
  resolveCounselorTrialAiCap,
  parseBetaAiFromNote,
  invalidateTrialAiCapCache,
  computeAiRemaining,
  isAiUpstreamAvailable,
};
