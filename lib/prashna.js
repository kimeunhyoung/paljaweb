/**
 * 질문점(프라슈나) API — 서버 시각·차트·시기·AI
 * - 계산은 서버만 (클라이언트 결과 신뢰하지 않음)
 * - 같은 주제 재질문 하드 쿨다운 없음 (주의 안내만)
 * - 상담사(Professional): 하루 건수 상한 / Private: 건수·주제 제한 없음
 */
const crypto = require('crypto');
const { isCounselorPlan, effectivePlan } = require('./plan-billing');
const { findCityByKo, tzDisplayLabel } = require('./astro-cities-data');
const { resolveOwnedClient } = require('./counselor-ask-link');
const {
  CATEGORIES,
  catById,
  isBlockedQuestion,
  INVEST_NOTICE,
  buildPrashnaChart,
  buildTimingCandidates,
  filterTimingsNearTerm,
  buildChartSnapshot,
  judge,
  slimChartJson,
} = require('./prashna-engine');

/** @deprecated 같은 주제 30일 하드 쿨다운은 제거됨(주의 안내만). 하위 호환용 상수 */
const COOL_DAYS = 0;
/** 상담사(Professional)는 하루 최대 건수 (환경변수로 조정). Private는 제한 없음 */
const COUNSELOR_DAILY_MAX = Math.max(1, Number(process.env.PRASHNA_COUNSELOR_DAILY_MAX) || 20);

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

/** 오늘(한국 시간 0시부터) 질문 수 — 상담사 하루 제한용. 조회 실패 시 null */
async function sbCountToday(userId) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600000);
  const startUtc = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600000);
  const q =
    `/rest/v1/prashna_readings?user_id=eq.${encodeURIComponent(userId)}` +
    `&asked_at=gte.${encodeURIComponent(startUtc.toISOString())}` +
    `&select=id&limit=${COUNSELOR_DAILY_MAX + 1}`;
  const { res, data } = await sbFetch(q, { method: 'GET' });
  if (!res || !res.ok || !Array.isArray(data)) return null;
  return data.length;
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

function buildAiMessages({ category, question, chartJson, judgeMaterial, timingCandidates, invest, sensitive }) {
  const cat = catById(category);
  const nearTerm = judgeMaterial && judgeMaterial.nearTerm;
  const system =
    '당신은 팔자연구소 8CODE의 질문점(프라슈나) 상담가입니다. ' +
    '해요체로만 답하고, "반드시", "100%", "확실", "보장" 같은 단정 표현은 쓰지 마세요. ' +
    '근거·조언·시기 note에 하우스를 쓸 때는 「의미 (N하우스)」 형식만 쓰세요. 예: 상대·계약 (7하우스), 수입·자원 (2하우스). ' +
    '「7하우스」「2하우스」처럼 번호만 단독으로 쓰지 마세요. 행성 이름은 그대로 써도 됩니다. ' +
    '시기는 timing_candidates 배열의 candidate_index만 고르세요. 날짜를 직접 지어내지 마세요. ' +
    'chosen_timings는 질문의 일이 실제로 이뤄질 가능성이 높은 순서대로 적으세요. 첫 번째가 가장 유력한 시기예요. ' +
    'conclusion은 질문에 바로 답하는 한두 문장으로 쓰세요. 예: 「여유가 있을까요?」에는 「크게 넉넉하진 않지만 조금씩 채워지는 달이에요」처럼 있다·조금씩·아직은 중 어디인지 먼저 말하세요. ' +
    '「~느낌에 가까워요」「~흐름 속에서」처럼 흐릿한 표현으로 끝맺지 말고, 일상에서 쓰는 쉬운 말로 분명하게 쓰세요. ' +
    '따옴표(「」·\'\'·"")로 꼬리표를 인용하거나 「관계·즐거움·재물」처럼 가운뎃점 꼬리표를 그대로 나열하지 마세요. 뜻을 풀어서 문장으로 쓰세요. ' +
    '시기 note는 그 시기에 무엇이 달라지는지 쉬운 말로 한 줄만 쓰세요. 행성 이름과 하우스를 되풀이하지 마세요(화면에 따로 나와요). ' +
    '출력은 JSON 객체 하나만. 설명 문장·마크다운 금지.' +
    (nearTerm
      ? ' 질문은 오늘·내일·이번 주처럼 짧은 시점을 묻습니다. conclusion은 그 짧은 시점에 맞춰 쓰세요. ' +
        '"시간이 필요해 보여요"처럼 장기·모호한 결론만 쓰지 말고, "가까운 시점만 놓고 보면…"처럼 답하세요. ' +
        'timing_candidates는 가까운 1~2개월 안만 남겨 두었습니다. 그중에서만 chosen_timings를 고르고, ' +
        '후보가 비어 있으면 chosen_timings는 빈 배열로 두세요. 한 줄 결론은 질문의 시점에 답해야 합니다.'
      : '') +
    (invest
      ? ' 이 질문은 투자 관련이에요. 특정 종목을 사라·팔라고 권하거나 가격·수익률을 예측하지 말고, ' +
        '질문자의 마음가짐과 흐름(서두름·과신·조율 등)만 읽어 주세요. 조언에는 무리한 투자를 피하라는 내용을 넣어 주세요.'
      : '') +
    (sensitive
      ? ' 이 질문은 민감 주제(' + sensitive + ')예요. 진단·생존·재판 결과를 단정하지 말고 흐름과 마음가짐만 읽어 주세요. ' +
        '조언에는 의사·변호사 등 전문가와 상의하라는 내용을 꼭 넣어 주세요.'
      : '');

  const userPayload = {
    category: cat ? { id: cat.id, label: cat.label, houses: cat.houses } : category,
    question,
    near_term: nearTerm || null,
    chart: chartJson,
    judgment: {
      tone: judgeMaterial.tone,
      score: judgeMaterial.score,
      rule_conclusion: judgeMaterial.conclusion,
      tone_label: judgeMaterial.toneLabel,
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
      evidence: ['근거 문장 (의미 (N하우스)·행성)'],
      advice: ['조언 문장'],
      chosen_timings: [{ candidate_index: 0, note: '그 시기에 무엇이 달라지는지 쉬운 말 한 줄' }],
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
      // AI가 가장 먼저 고른 시기 = 가장 유력 (화면은 날짜순으로 정렬하고 이 표시만 붙임)
      top: timings.length === 0,
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
          '같은 문장을 바로 반복하기보다, 상황이 달라진 뒤 다시 물어보세요.',
          '차트는 참고용이에요. 계약·관계·결정은 현실 조건과 함께 판단하세요.',
        ],
    timings,
  };
}

async function runPrashnaAi({ userId, profile, messages, feature }) {
  const aiUsage = require('./ai-usage');
  if (!aiUsage.isAiUpstreamAvailable()) {
    return { ok: false, reason: 'ai_unavailable' };
  }
  feature = feature || 'prashna';
  const feat = aiUsage.FEATURES[feature];
  if (!feat) return { ok: false, reason: 'no_feature' };

  const quota = await aiUsage.buildQuotaWithUsage(userId, profile);
  const cost = feat.cost;
  // 크레딧이 모자라면 AI 없이 규칙 판정만 (차감 없음)
  if (cost > 0 && (quota.remaining || 0) < cost) {
    return { ok: false, reason: 'no_credits', quota };
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

  // 성공했을 때만 차감 — 다른 AI 기능과 같은 방식(플랜 한도 먼저, 넘치면 구매 크레딧)
  if (cost > 0) {
    const period = aiUsage.aiUsagePeriod(profile);
    const used = Math.max(0, Number(quota.used) || 0);
    const bonus = Math.max(0, Number(quota.bonus) || 0);
    // remaining = 플랜 잔여 + 구매 크레딧 → 플랜 잔여 = remaining − bonus
    const planRem = Math.max(0, (quota.remaining || 0) - bonus);
    const fromBonus = Math.max(0, cost - Math.min(cost, planRem));
    const consumed = await aiUsage.consumeCredits(userId, period, cost, used + (quota.remaining || 0));
    if (!consumed || !consumed.ok) {
      return { ok: false, reason: 'consume_failed', detail: consumed };
    }
    if (fromBonus > 0 && typeof aiUsage.decrementPurchasedBonus === 'function') {
      await aiUsage.decrementPurchasedBonus(userId, fromBonus);
    }
  }
  return { ok: true, parsed, quota };
}

/** 관리자(AI_CREDIT_ADMIN_EMAILS) 여부 — 투자 종목·매매 시점 질문 허용용 */
function adminEmailSet() {
  return new Set(
    String(process.env.AI_CREDIT_ADMIN_EMAILS || '')
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
  );
}

function registerPrashnaRoutes(app, { getUserIdFromAuth, getProfile, getUserEmail }) {
  async function isAdminUser(userId) {
    if (!userId || typeof getUserEmail !== 'function') return false;
    const set = adminEmailSet();
    if (!set.size) return false;
    try {
      const email = String((await getUserEmail(userId)) || '').toLowerCase();
      return !!email && set.has(email);
    } catch (e) {
      return false;
    }
  }

  app.get('/api/prashna/meta', async (req, res) => {
    noStore(res);
    let isAdmin = false;
    try {
      const uid = await getUserIdFromAuth(req.headers.authorization);
      isAdmin = await isAdminUser(uid);
    } catch (e) {
      /* ignore */
    }
    const aiUsage = require('./ai-usage');
    const prashnaCost = (aiUsage.FEATURES.prashna && aiUsage.FEATURES.prashna.cost) || 1;
    res.json({
      isAdmin,
      coolDays: COOL_DAYS,
      creditCost: prashnaCost,
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
    let clientLabel = String((req.body && req.body.clientLabel) || '').trim().slice(0, 80);
    const clientIdRaw = String((req.body && req.body.clientId) || '').trim();
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
    // 로그인 전에는 등급과 상관없이 항상 막는 주제(자살·자해)만 확인
    let block = isBlockedQuestion(question, { allowAll: true });
    if (block.blocked && block.always) {
      res.status(400).json({
        error: 'blocked_topic',
        topic: block.topic,
        message: '지금 많이 힘드신가요? 이 질문은 질문점으로 볼 수 없지만, 혼자 견디지 않으셨으면 해요. 자살예방상담전화 109(24시간)에서 바로 이야기를 들어 드려요.',
      });
      return;
    }
    if (block.blocked) {
      res.status(400).json({
        error: 'blocked_topic',
        topic: block.topic || null,
        message: '법적·의료·윤리적 문제가 생길 수 있는 질문(건강·질병, 생사, 소송·범죄, 도박, 몰래 알아보기)은 질문점으로 보지 않아요. 다른 질문으로 바꿔 주세요.',
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
    const admin = await isAdminUser(userId);
    // Private: 하루 건수·주제 제한 없음 (자살·자해만 예외). 같은 주제 재질문은 막지 않음.
    const privatePlan = effectivePlan(profile) === 'private';

    let linkedClientId = null;
    if (counselor && clientIdRaw) {
      const owned = await resolveOwnedClient(userId, clientIdRaw, async (path) => {
        const { res: r, data } = await sbFetch(path, { method: 'GET' });
        return { ok: !!(r && r.ok), data };
      });
      if (owned) {
        linkedClientId = owned.id;
        if (!clientLabel && owned.label) clientLabel = owned.label;
      }
    }

    // 투자 종목·매매 시점 질문: 관리자·Private만 허용
    block = isBlockedQuestion(question, { allowInvest: admin, allowAll: privatePlan });
    if (block.blocked) {
      res.status(400).json({
        error: 'blocked_topic',
        topic: block.topic || null,
        message: block.invest
          ? '특정 종목을 언제 사고팔지는 투자 자문에 해당할 수 있어 답하지 않아요. "올해 투자 흐름은 어떨까요?"처럼 흐름으로 물어봐 주세요.'
          : '법적·의료·윤리적 문제가 생길 수 있는 질문(건강·질병, 생사, 소송·범죄, 도박, 몰래 알아보기)은 질문점으로 보지 않아요. 다른 질문으로 바꿔 주세요.',
      });
      return;
    }
    const invest = !!block.invest;
    const sensitive = block.sensitive || null;

    if (counselor && !privatePlan) {
      const todayCount = await sbCountToday(userId);
      if (todayCount != null && todayCount >= COUNSELOR_DAILY_MAX) {
        res.status(429).json({
          error: 'daily_limit',
          message: '상담사 계정은 하루 ' + COUNSELOR_DAILY_MAX + '건까지 질문점을 볼 수 있어요. 내일 다시 이용해 주세요.',
          dailyMax: COUNSELOR_DAILY_MAX,
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
    const judged = judge(data, { category, question, allowInvest: admin, allowAll: privatePlan });
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
      if (judged.nearTerm) {
        timingCandidates = filterTimingsNearTerm(
          timingCandidates,
          askedAt.getTime(),
          judged.nearTerm
        );
      }
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
      tzDisplayLabel(tz) +
      ')';
    const chart = buildChartSnapshot(data, { city: cityKo, dateLabel, tz });
    const chartJson = slimChartJson(data);

    let aiUsed = false;
    let aiReason = null;
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
          invest,
          sensitive,
        }),
      });
      if (ai.ok && ai.parsed) {
        merged = mergeAiWithTimings(ai.parsed, timingCandidates, judged);
        aiUsed = true;
      } else {
        aiReason = ai.reason || 'ai_failed';
      }
    } catch (e) {
      console.error('[prashna] ai', e);
      aiReason = 'ai_failed';
    }

    const prashnaFeat = require('./ai-usage').FEATURES.prashna;
    const prashnaCost = (prashnaFeat && prashnaFeat.cost) || 1;
    const result = {
      ok: true,
      trial: !aiUsed,
      creditCost: prashnaCost,
      creditCharged: aiUsed ? prashnaCost : 0,
      tone: judged.tone,
      toneLabel: judged.toneLabel || null,
      nearTerm: judged.nearTerm || null,
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
      aiReason,
      disclaimer: judged.disclaimer,
      investNotice: invest ? INVEST_NOTICE : null,
      sensitiveNotice: sensitive
        ? '민감 주제(' + sensitive + ') 질문이에요. 질문점은 참고 해석일 뿐이며, 의료·법률 판단은 반드시 전문가와 상의해 주세요.'
        : null,
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
      client_id: linkedClientId,
    });

    res.json({
      stampId: crypto.randomBytes(12).toString('hex'),
      askedAt: askedAt.toISOString(),
      category,
      city: cityKo,
      tz,
      civil,
      clientLabel: counselor ? clientLabel || null : null,
      clientId: linkedClientId,
      coolDays: 0,
      counselorExempt: counselor || privatePlan,
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

module.exports = {
  registerPrashnaRoutes,
  COOL_DAYS,
  COUNSELOR_DAILY_MAX,
  CATEGORIES,
  mergeAiWithTimings,
  parseAiJson,
  runPrashnaAi,
  buildAiMessages,
};
