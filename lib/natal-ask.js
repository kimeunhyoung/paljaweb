/**
 * 내 차트로 묻기 — 출생 차트 + 트랜짓 시기 (질문점과 별 기능)
 */
const crypto = require('crypto');
const { isCounselorPlan, effectivePlan } = require('./plan-billing');
const { findCityByKo } = require('./astro-cities-data');
const {
  CATEGORIES,
  catById,
  isBlockedQuestion,
  INVEST_NOTICE,
  buildNatalChart,
  buildTimingCandidates,
  filterTimingsNearTerm,
  buildChartSnapshot,
  judge,
  slimChartJson,
  civilToBirthMs,
} = require('./prashna-engine');
const { mergeAiWithTimings, runPrashnaAi, COUNSELOR_DAILY_MAX } = require('./prashna');

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function adminEmailSet() {
  return new Set(
    String(process.env.AI_CREDIT_ADMIN_EMAILS || '')
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
  );
}

function supabaseRest(path, opts) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return Promise.resolve({ ok: false, status: 0, data: null });
  const headers = Object.assign(
    {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
    },
    (opts && opts.headers) || {}
  );
  return fetch(url.replace(/\/$/, '') + path, {
    method: (opts && opts.method) || 'GET',
    headers,
    body: opts && opts.body != null ? JSON.stringify(opts.body) : undefined,
  }).then(async (res) => {
    const text = await res.text().catch(() => '');
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }
    return { ok: res.ok, status: res.status, data, headers: res.headers };
  });
}

function parseBirthCivil(birthDate, birthTime) {
  const dm = String(birthDate || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = String(birthTime || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dm || !tm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const da = Number(dm[3]);
  const hh = Number(tm[1]);
  const mi = Number(tm[2]);
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  if (hh < 0 || hh > 23 || mi < 0 || mi > 59) return null;
  const dt = new Date(Date.UTC(y, mo - 1, da));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== da) return null;
  return { y, mo, da, hh, mi };
}

async function countTodayAsk(userId) {
  if (!userId) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const path =
    '/rest/v1/prashna_readings?user_id=eq.' +
    encodeURIComponent(userId) +
    '&asked_at=gte.' +
    encodeURIComponent(start.toISOString()) +
    '&select=id';
  const { ok, data, headers } = await supabaseRest(path, {
    headers: { Prefer: 'count=exact' },
  });
  if (!ok) return null;
  const cr = headers && headers.get && headers.get('content-range');
  if (cr && /\//.test(cr)) {
    const n = Number(cr.split('/')[1]);
    return Number.isFinite(n) ? n : null;
  }
  return Array.isArray(data) ? data.length : null;
}

async function insertNatalReading(row) {
  const { ok, status, data } = await supabaseRest('/rest/v1/prashna_readings', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: row,
  });
  if (!ok) {
    console.error('[natal-ask] insert', status, data);
    return false;
  }
  return true;
}

function buildNatalAiMessages({
  category,
  question,
  chartJson,
  judgeMaterial,
  timingCandidates,
  invest,
  sensitive,
  birthLabel,
}) {
  const cat = catById(category);
  const nearTerm = judgeMaterial && judgeMaterial.nearTerm;
  const system =
    '당신은 팔자연구소 8CODE의 「내 차트로 묻기」 상담가입니다. ' +
    '출생 차트 배치를 뼈대로 읽고, judgment.dasha의 soft_label(지금의 운의 시기)로 「지금이 맞는지」를 결론에 반영하세요. ' +
    '시기 후보는 트랜짓(앞으로의 흐름)입니다. 질문점(프라슈나·질문 순간 차트)이 아닙니다. ' +
    '해요체로만 답하고, "반드시", "100%", "확실", "보장" 같은 단정 표현은 쓰지 마세요. ' +
    '근거·조언·시기 note에 하우스를 쓸 때는 「의미 (N하우스)」 형식만 쓰세요. 예: 상대·계약 (7하우스), 수입·자원 (2하우스). ' +
    '「7하우스」처럼 번호만 단독으로 쓰지 마세요. ' +
    'conclusion·advice·tone에는 다샤·마하·안타르·프라얀타르·케투·라후·금성·목성 등 전문 행성/다샤 이름을 쓰지 마세요. ' +
    '대신 soft_label의 쉬운 말(정리·내려놓기, 관계·즐거움·재물, 인내·책임 등)만 쓰세요. ' +
    '전문 용어(예: 케투–금성–라후 다샤)는 evidence에만 짧게 넣어도 됩니다. ' +
    '시기는 timing_candidates 배열의 candidate_index만 고르세요. 날짜를 직접 지어내지 마세요. ' +
    '출력은 JSON 객체 하나만. 설명 문장·마크다운 금지.' +
    (nearTerm
      ? ' 질문은 오늘·내일·이번 주처럼 짧은 시점을 묻습니다. conclusion은 그 짧은 시점에 맞춰 쓰세요. ' +
        'timing_candidates는 가까운 1~2개월 안만 남겨 두었습니다. 그중에서만 chosen_timings를 고르고, ' +
        '후보가 비어 있으면 chosen_timings는 빈 배열로 두세요.'
      : '') +
    (invest
      ? ' 이 질문은 투자 관련이에요. 특정 종목을 사라·팔라고 권하거나 가격·수익률을 예측하지 말고, ' +
        '질문자의 마음가짐과 흐름만 읽어 주세요. 조언에는 무리한 투자를 피하라는 내용을 넣어 주세요.'
      : '') +
    (sensitive
      ? ' 이 질문은 민감 주제(' +
        sensitive +
        ')예요. 진단·생존·재판 결과를 단정하지 말고 흐름과 마음가짐만 읽어 주세요. ' +
        '조언에는 의사·변호사 등 전문가와 상의하라는 내용을 꼭 넣어 주세요.'
      : '');

  const userPayload = {
    mode: 'natal_ask',
    birth: birthLabel || null,
    category: cat ? { id: cat.id, label: cat.label, houses: cat.houses } : category,
    question,
    near_term: nearTerm || null,
    chart: chartJson,
    judgment: {
      tone: judgeMaterial.tone,
      score: judgeMaterial.score,
      natal_score: judgeMaterial.natalScore,
      dasha_delta: judgeMaterial.dashaDelta,
      rule_conclusion: judgeMaterial.conclusion,
      tone_label: judgeMaterial.toneLabel,
      evidence: judgeMaterial.evidence,
      lagna: judgeMaterial.lagna,
      dasha: judgeMaterial.dasha
        ? {
            soft_label: judgeMaterial.dasha.softLabel || judgeMaterial.dasha.label,
            tech_label: judgeMaterial.dasha.techLabel || null,
            maha: judgeMaterial.dasha.mahaLord,
            antar: judgeMaterial.dasha.antarLord,
            prat: judgeMaterial.dasha.pratLord,
            levels: 3,
            year_days: judgeMaterial.dasha.yearDays,
            meaning: {
              ketu: '정리·내려놓기',
              venus: '관계·즐거움·재물',
              sun: '인정·지위',
              moon: '마음·가정',
              mars: '추진·경쟁',
              rahu: '욕심·확장·변화',
              jupiter: '도움·성장',
              saturn: '인내·책임',
              mercury: '소통·거래',
            },
          }
        : null,
      cusp_warnings: judgeMaterial.cuspWarnings || [],
    },
    timing_candidates: timingCandidates.map((c) => ({
      index: c.index,
      reason_code: c.reason_code,
      reason_text: c.reason_text,
    })),
    output_schema: {
      conclusion: 'string 해요체 한 줄',
      evidence: ['근거 문장 (의미 (N하우스)·행성)'],
      advice: ['조언 문장'],
      chosen_timings: [{ candidate_index: 0, note: '선택 이유 한 줄 (의미 (N하우스) 형식)' }],
    },
  };

  return [{ role: 'user', content: system + '\n\n---\n\n' + JSON.stringify(userPayload) }];
}

function registerNatalAskRoutes(app, { getUserIdFromAuth, getProfile, getUserEmail }) {
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

  app.get('/api/natal-ask/meta', async (req, res) => {
    noStore(res);
    let isAdmin = false;
    try {
      const uid = await getUserIdFromAuth(req.headers.authorization);
      isAdmin = await isAdminUser(uid);
    } catch (e) {
      /* ignore */
    }
    const aiUsage = require('./ai-usage');
    const cost = (aiUsage.FEATURES.natal_ask && aiUsage.FEATURES.natal_ask.cost) || 2;
    res.json({
      isAdmin,
      creditCost: cost,
      categories: CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
        desc: c.desc,
        houses: c.houses,
        examples: c.examples,
      })),
    });
  });

  app.post('/api/natal-ask/ask', async (req, res) => {
    noStore(res);
    const category = String((req.body && req.body.category) || '').trim();
    const question = String((req.body && req.body.question) || '').trim();
    const cityKo = String((req.body && req.body.city) || '').trim();
    const birthDate = String((req.body && req.body.birthDate) || '').trim();
    const birthTime = String((req.body && req.body.birthTime) || '').trim();
    const clientLabel = String((req.body && req.body.clientLabel) || '')
      .trim()
      .slice(0, 80);
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
    const civilBirth = parseBirthCivil(birthDate, birthTime);
    if (!civilBirth) {
      res.status(400).json({
        error: 'bad_birth',
        message: '출생 날짜와 시간을 올바르게 입력해 주세요. (예: 1990-05-12 · 14:30)',
      });
      return;
    }

    let block = isBlockedQuestion(question, { allowAll: true });
    if (block.blocked && block.always) {
      res.status(400).json({
        error: 'blocked_topic',
        topic: block.topic,
        message:
          '지금 많이 힘드신가요? 이 질문은 여기서 볼 수 없지만, 혼자 견디지 않으셨으면 해요. 자살예방상담전화 109(24시간)에서 바로 이야기를 들어 드려요.',
      });
      return;
    }
    if (block.blocked) {
      res.status(400).json({
        error: 'blocked_topic',
        topic: block.topic || null,
        message:
          '법적·의료·윤리적 문제가 생길 수 있는 질문(건강·질병, 생사, 소송·범죄, 도박, 몰래 알아보기)은 받지 않아요. 다른 질문으로 바꿔 주세요.',
      });
      return;
    }

    const cityRow = findCityByKo(cityKo);
    if (cityRow) {
      lat = cityRow.lat;
      lng = cityRow.lng;
      tz = cityRow.tz;
    } else if (Number.isFinite(lat) && Number.isFinite(lng)) {
      // 위·경도 직접 입력 — 도시명 목록에 없어도 허용
      if (!tz) tz = 'Asia/Seoul';
      if (!cityKo) {
        res.status(400).json({ error: 'bad_location', message: '출생 도시 또는 위·경도를 입력해 주세요.' });
        return;
      }
    }
    if (!tz || !Number.isFinite(lat) || !Number.isFinite(lng) || !cityKo) {
      res.status(400).json({ error: 'bad_location', message: '출생 도시를 선택해 주세요. 목록에 없으면 위·경도를 직접 입력해 주세요.' });
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
      console.error('[natal-ask] profile', e);
    }
    const counselor = isCounselorPlan(profile);
    const admin = await isAdminUser(userId);
    const privatePlan = effectivePlan(profile) === 'private';

    block = isBlockedQuestion(question, { allowInvest: admin, allowAll: privatePlan });
    if (block.blocked) {
      res.status(400).json({
        error: 'blocked_topic',
        topic: block.topic || null,
        message: block.invest
          ? '특정 종목을 언제 사고팔지는 투자 자문에 해당할 수 있어 답하지 않아요. "올해 투자 흐름은 어떨까요?"처럼 흐름으로 물어봐 주세요.'
          : '법적·의료·윤리적 문제가 생길 수 있는 질문(건강·질병, 생사, 소송·범죄, 도박, 몰래 알아보기)은 받지 않아요. 다른 질문으로 바꿔 주세요.',
      });
      return;
    }
    const invest = !!block.invest;
    const sensitive = block.sensitive || null;

    if (counselor && !privatePlan) {
      const todayCount = await countTodayAsk(userId);
      if (todayCount != null && todayCount >= COUNSELOR_DAILY_MAX) {
        res.status(429).json({
          error: 'daily_limit',
          message:
            '상담사 계정은 하루 ' +
            COUNSELOR_DAILY_MAX +
            '건까지 질문점·내 차트로 묻기를 볼 수 있어요. 내일 다시 이용해 주세요.',
          dailyMax: COUNSELOR_DAILY_MAX,
        });
        return;
      }
    }

    const askedAt = new Date();
    let chartPack;
    try {
      chartPack = buildNatalChart(civilBirth, lat, lng);
    } catch (e) {
      console.error('[natal-ask] chart', e);
      res.status(500).json({ error: 'chart_failed', message: '출생 차트 계산에 실패했어요.' });
      return;
    }
    const { data, civil } = chartPack;
    const birthMs = civilToBirthMs(civil, lat, lng);
    const judged = judge(data, {
      category,
      question,
      allowInvest: admin,
      allowAll: privatePlan,
      mode: 'natal',
      birthMs,
      askedAtMs: askedAt.getTime(),
    });
    if (!judged.ok) {
      res.status(400).json({ error: judged.error, message: judged.message });
      return;
    }

    let timingCandidates = [];
    try {
      timingCandidates = buildTimingCandidates(data, category, askedAt.getTime(), lat, lng, tz, {
        natal: true,
      });
      if (judged.nearTerm) {
        timingCandidates = filterTimingsNearTerm(
          timingCandidates,
          askedAt.getTime(),
          judged.nearTerm
        );
      }
    } catch (e) {
      console.error('[natal-ask] timings', e);
    }

    const birthLabel =
      civil.y +
      '.' +
      pad2(civil.mo) +
      '.' +
      pad2(civil.da) +
      ' ' +
      pad2(civil.hh) +
      ':' +
      pad2(civil.mi) +
      ' (' +
      tz +
      ')';
    const chart = buildChartSnapshot(data, { city: cityKo, dateLabel: birthLabel, tz });
    const chartJson = slimChartJson(data);

    let aiUsed = false;
    let aiReason = null;
    let merged = mergeAiWithTimings(null, timingCandidates, judged);
    try {
      const ai = await runPrashnaAi({
        userId,
        profile,
        feature: 'natal_ask',
        messages: buildNatalAiMessages({
          category,
          question,
          chartJson,
          judgeMaterial: judged,
          timingCandidates,
          invest,
          sensitive,
          birthLabel,
        }),
      });
      if (ai.ok) {
        aiUsed = true;
        merged = mergeAiWithTimings(ai.parsed, timingCandidates, judged);
      } else {
        aiReason = ai.reason || 'ai_failed';
      }
    } catch (e) {
      console.error('[natal-ask] ai', e);
      aiReason = 'ai_failed';
    }

    const feat = require('./ai-usage').FEATURES.natal_ask;
    const cost = (feat && feat.cost) || 2;
    const result = {
      ok: true,
      mode: 'natal_ask',
      trial: !aiUsed,
      creditCost: cost,
      creditCharged: aiUsed ? cost : 0,
      tone: judged.tone,
      toneLabel: judged.toneLabel || null,
      nearTerm: judged.nearTerm || null,
      score: judged.score,
      natalScore: judged.natalScore,
      dashaDelta: judged.dashaDelta,
      conclusion: merged.conclusion,
      evidence: merged.evidence,
      advice: merged.advice,
      timings: merged.timings,
      timingCandidates,
      dasha: judged.dasha,
      cuspWarnings: judged.cuspWarnings || [],
      lagna: judged.lagna,
      chart,
      chartJson,
      birth: { date: birthDate, time: birthTime, city: cityKo, label: birthLabel },
      aiUsed,
      aiReason,
      disclaimer: judged.disclaimer,
      investNotice: invest ? INVEST_NOTICE : null,
      sensitiveNotice: sensitive
        ? '민감 주제(' +
          sensitive +
          ') 질문이에요. 참고 해석일 뿐이며, 의료·법률 판단은 반드시 전문가와 상의해 주세요.'
        : null,
    };

    await insertNatalReading({
      user_id: userId,
      category: 'natal:' + category,
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
      clientLabel: counselor ? clientLabel || null : null,
      civil,
      birth: result.birth,
      result,
    });
  });
}

module.exports = { registerNatalAskRoutes, parseBirthCivil, CATEGORIES };
