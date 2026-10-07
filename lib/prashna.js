/**
 * 질문점(프라슈나) API — 서버 시각·차트·시기·AI
 * - 계산은 서버만 (클라이언트 결과 신뢰하지 않음)
 * - 쿨다운: Supabase prashna_readings (user_id + category + asked_at)
 * - 상담사(Professional/Private): 쿨다운 면제
 */
const crypto = require('crypto');
const { isCounselorPlan } = require('./plan-billing');
const { findCityByKo } = require('./astro-cities-data');
const {
  CATEGORIES,
  catById,
  isBlockedQuestion,
  buildPrashnaChart,
  buildTimingCandidates,
  buildChartSnapshot,
  judge,
  slimChartJson,
} = require('./prashna-engine');

const COOL_DAYS = 30;

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

function sbConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function sbFetch(pathUrl, options = {}) {
  if (!sbConfigured()) return { res: null, data: null };
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(base + pathUrl, {
    ...options,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }
  }
  return { res, data };
}

async function sbLatestReading(userId, category) {
  const since = new Date(Date.now() - COOL_DAYS * 86400000).toISOString();
  const q =
    `/rest/v1/prashna_readings?user_id=eq.${encodeURIComponent(userId)}` +
    `&category=eq.${encodeURIComponent(category)}` +
    `&asked_at=gte.${encodeURIComponent(since)}` +
    `&select=asked_at,question,city,conclusion,tone,result_json,client_label` +
    `&order=asked_at.desc&limit=1`;
  const { res, data } = await sbFetch(q, { method: 'GET' });
  if (!res || !res.ok) return null;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    askedAt: row.asked_at,
    question: row.question,
    city: row.city,
    clientLabel: row.client_label,
    result: row.result_json || {
      conclusion: row.conclusion,
      tone: row.tone,
    },
  };
}

async function sbInsertReading(row) {
  const { res, data } = await sbFetch('/rest/v1/prashna_readings', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (!res || !res.ok) {
    console.error('[prashna] insert', res && res.status, data);
    return false;
  }
  return true;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function buildAiMessages({ category, question, chartJson, judgeMaterial, timingCandidates }) {
  const cat = catById(category);
  const system =
    '당신은 팔자연구소 8CODE의 질문점(프라슈나) 상담가입니다. ' +
    '해요체로만 답하고, "반드시", "100%", "확실", "보장" 같은 단정 표현은 쓰지 마세요. ' +
    '근거마다 하우스 번호와 행성 이름을 명시하세요. ' +
    '시기는 timing_candidates 배열의 candidate_index만 고르세요. 날짜를 직접 지어내지 마세요. ' +
    '출력은 JSON 객체 하나만. 설명 문장·마크다운 금지.';

  const userPayload = {
    category: cat ? { id: cat.id, label: cat.label, houses: cat.houses } : category,
    question,
    chart: chartJson,
    judgment: {
      tone: judgeMaterial.tone,
      score: judgeMaterial.score,
      rule_conclusion: judgeMaterial.conclusion,
      evidence: judgeMaterial.evidence,
      lagna: judgeMaterial.lagna,
    },
    timing_candidates: timingCandidates.map((c) => ({
      index: c.index,
      reason_code: c.reason_code,
      reason_text: c.reason_text,
      // 날짜는 AI에게 안 줌 — 서버가 다시 붙임
    })),
    output_schema: {
      conclusion: 'string 해요체 한 줄',
      evidence: ['근거 문장 (하우스·행성 명시)'],
      advice: ['조언 문장'],
      chosen_timings: [{ candidate_index: 0, note: '선택 이유 한 줄' }],
    },
  };

  return [
    { role: 'user', content: system + '\n\n---\n\n' + JSON.stringify(userPayload) },
  ];
}

function parseAiJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  let s = raw;
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

function mergeAiWithTimings(aiObj, timingCandidates, fallback) {
  const chosen = Array.isArray(aiObj && aiObj.chosen_timings) ? aiObj.chosen_timings : [];
  const timings = [];
  chosen.forEach((ch) => {
    const idx = Number(ch && ch.candidate_index);
    const c = timingCandidates.find((x) => x.index === idx);
    if (!c) return;
    timings.push({
      start: c.start,
      end: c.end,
      reason_code: c.reason_code,
      reason_text: c.reason_text,
      note: String((ch && ch.note) || '').slice(0, 200),
      label: c.start + ' ~ ' + c.end,
      reason: c.reason_text + (ch && ch.note ? ' — ' + ch.note : ''),
    });
  });
  if (!timings.length) {
    timingCandidates.slice(0, 3).forEach((c) => {
      timings.push({
        start: c.start,
        end: c.end,
        reason_code: c.reason_code,
        reason_text: c.reason_text,
        note: '',
        label: c.start + ' ~ ' + c.end,
        reason: c.reason_text,
      });
    });
  }
  return {
    conclusion: String((aiObj && aiObj.conclusion) || fallback.conclusion || '').slice(0, 200),
    evidence: Array.isArray(aiObj && aiObj.evidence)
      ? aiObj.evidence.map((e) => String(e).slice(0, 240)).slice(0, 6)
      : fallback.evidence || [],
    advice: Array.isArray(aiObj && aiObj.advice)
      ? aiObj.advice.map((a) => String(a).slice(0, 240)).slice(0, 4)
      : [
          '한 가지 질문만 붙잡고, 결과가 나온 뒤에는 같은 주제를 바로 반복하지 마세요.',
          '차트는 참고용이에요. 계약·관계·결정은 현실 조건과 함께 판단하세요.',
        ],
    timings,
  };
}

async function runPrashnaAi({ userId, profile, messages }) {
  const aiUsage = require('./ai-usage');
  if (!aiUsage.isAiUpstreamAvailable()) {
    return { ok: false, reason: 'ai_unavailable' };
  }
  const feature = 'prashna';
  const feat = aiUsage.FEATURES[feature];
  if (!feat) return { ok: false, reason: 'no_feature' };

  const quota = await aiUsage.buildQuotaWithUsage(userId, profile);
  const cost = feat.cost;
  // 체험판: cost 0이면 차감 없이 호출. 유료화 시 FEATURES.prashna.cost만 올리면 됨.
  if (cost > 0) {
    if ((quota.remaining || 0) < cost) {
      return { ok: false, reason: 'no_credits', quota };
    }
    const period = aiUsage.aiUsagePeriod(profile);
    const consumed = await aiUsage.consumeCredits(userId, period, cost, quota.limit);
    if (!consumed || !consumed.ok) {
      return { ok: false, reason: 'consume_failed', detail: consumed };
    }
  }

  const { status, data } = await aiUsage.callAnthropic({
    max_tokens: 1200,
    temperature: 0.4,
    messages,
  });
  if (status >= 400) {
    console.error('[prashna] anthropic', status, data);
    return { ok: false, reason: 'upstream', status };
  }
  const text = aiUsage.anthropicText(data);
  const parsed = parseAiJson(text);
  if (!parsed) return { ok: false, reason: 'bad_json', text };
  return { ok: true, parsed, quota };
}

function registerPrashnaRoutes(app, { getUserIdFromAuth, getProfile }) {
  app.get('/api/prashna/meta', (req, res) => {
    noStore(res);
    res.json({
      coolDays: COOL_DAYS,
      trial: true,
      categories: CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
        desc: c.desc,
        houses: c.houses,
        examples: c.examples,
      })),
    });
  });

  /** 메인: 서버에서 스탬프·차트·시기·AI·저장 */
  app.post('/api/prashna/ask', async (req, res) => {
    noStore(res);
    const category = String((req.body && req.body.category) || '').trim();
    const question = String((req.body && req.body.question) || '').trim();
    const cityKo = String((req.body && req.body.city) || '').trim();
    const clientLabel = String((req.body && req.body.clientLabel) || '').trim().slice(0, 80);
    let lat = Number(req.body && req.body.lat);
    let lng = Number(req.body && req.body.lng);
    let tz = String((req.body && req.body.tz) || '').trim();

    if (!category || !catById(category)) {
      res.status(400).json({ error: 'bad_category', message: '주제를 선택해 주세요.' });
      return;
    }
    if (!question || question.length < 4) {
      res.status(400).json({ error: 'bad_request', message: '질문을 한 문장으로 적어 주세요.' });
      return;
    }
    const block = isBlockedQuestion(question);
    if (block.blocked) {
      res.status(400).json({
        error: 'blocked_topic',
        message: '건강·수명·소송·타인 사생활·주식·코인처럼 민감한 주제는 다루지 않아요.',
      });
      return;
    }

    const cityRow = findCityByKo(cityKo);
    if (cityRow) {
      lat = cityRow.lat;
      lng = cityRow.lng;
      tz = cityRow.tz;
    }
    if (!tz || !Number.isFinite(lat) || !Number.isFinite(lng) || !cityKo) {
      res.status(400).json({ error: 'bad_location', message: '현재 도시를 선택해 주세요.' });
      return;
    }

    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'login_required' });
      return;
    }

    let profile = null;
    try {
      profile = typeof getProfile === 'function' ? await getProfile(userId) : null;
    } catch (e) {
      console.error('[prashna] profile', e);
    }
    const counselor = isCounselorPlan(profile);

    if (!counselor) {
      const prev = await sbLatestReading(userId, category);
      if (prev && prev.askedAt) {
        res.status(429).json({
          error: 'cooldown',
          message:
            '같은 종류의 질문은 ' +
            COOL_DAYS +
            '일 안에 다시 볼 수 없어요. 이전 결과를 확인해 주세요.',
          previous: {
            askedAt: prev.askedAt,
            question: prev.question,
            city: prev.city,
            clientLabel: prev.clientLabel,
            result: prev.result,
          },
          coolDays: COOL_DAYS,
        });
        return;
      }
    }

    const askedAt = new Date();
    let chartPack;
    try {
      chartPack = buildPrashnaChart(askedAt, lat, lng, tz);
    } catch (e) {
      console.error('[prashna] chart', e);
      res.status(500).json({ error: 'chart_failed', message: '차트 계산에 실패했어요.' });
      return;
    }
    const { data, civil } = chartPack;
    const judged = judge(data, { category, question });
    if (!judged.ok) {
      res.status(400).json({ error: judged.error, message: judged.message });
      return;
    }

    let timingCandidates = [];
    try {
      timingCandidates = buildTimingCandidates(
        data,
        category,
        askedAt.getTime(),
        lat,
        lng,
        tz
      );
    } catch (e) {
      console.error('[prashna] timings', e);
    }

    const dateLabel =
      civil.y +
      '.' +
      civil.mo +
      '.' +
      civil.da +
      ' ' +
      pad2(civil.hh) +
      ':' +
      pad2(civil.mi) +
      ' (' +
      tz +
      ')';
    const chart = buildChartSnapshot(data, { city: cityKo, dateLabel, tz });
    const chartJson = slimChartJson(data);

    let aiUsed = false;
    let merged = mergeAiWithTimings(null, timingCandidates, judged);
    try {
      const ai = await runPrashnaAi({
        userId,
        profile,
        messages: buildAiMessages({
          category,
          question,
          chartJson,
          judgeMaterial: judged,
          timingCandidates,
        }),
      });
      if (ai.ok && ai.parsed) {
        merged = mergeAiWithTimings(ai.parsed, timingCandidates, judged);
        aiUsed = true;
      }
    } catch (e) {
      console.error('[prashna] ai', e);
    }

    const result = {
      ok: true,
      trial: true,
      tone: judged.tone,
      score: judged.score,
      conclusion: merged.conclusion,
      evidence: merged.evidence,
      advice: merged.advice,
      timings: merged.timings,
      timingCandidates,
      lagna: judged.lagna,
      chart,
      chartJson,
      aiUsed,
      disclaimer: judged.disclaimer,
    };

    await sbInsertReading({
      user_id: userId,
      category,
      question: question.slice(0, 500),
      city: cityKo,
      asked_at: askedAt.toISOString(),
      conclusion: result.conclusion,
      tone: result.tone,
      result_json: result,
      client_label: counselor ? clientLabel || null : null,
    });

    res.json({
      stampId: crypto.randomBytes(12).toString('hex'),
      askedAt: askedAt.toISOString(),
      category,
      city: cityKo,
      tz,
      civil,
      clientLabel: counselor ? clientLabel || null : null,
      coolDays: counselor ? 0 : COOL_DAYS,
      counselorExempt: counselor,
      result,
    });
  });

  // 하위 호환: 옛 stamp/complete는 ask로 안내
  app.post('/api/prashna/stamp', (req, res) => {
    noStore(res);
    res.status(410).json({
      error: 'deprecated',
      message: '질문점은 /api/prashna/ask 로 통합되었어요. 페이지를 새로고침해 주세요.',
    });
  });
  app.post('/api/prashna/complete', (req, res) => {
    noStore(res);
    res.status(410).json({ error: 'deprecated', message: 'use /api/prashna/ask' });
  });
}

module.exports = { registerPrashnaRoutes, COOL_DAYS, CATEGORIES };
