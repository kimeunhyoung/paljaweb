/**
 * 프라슈나 판정·시기 후보 (서버)
 *
 * 카테고리 ↔ 하우스 매핑 (확정 전 · 수정 지점)
 * ┌────────────┬────────────────┬─────────────────────┐
 * │ id         │ 라벨           │ houses (Whole Sign) │
 * ├────────────┼────────────────┼─────────────────────┤
 * │ property   │ 부동산·매매    │ 4, 7, 11            │
 * │ career     │ 일·이직        │ 10, 6, 11           │
 * │ love       │ 연애·관계      │ 7, 5, 11            │
 * │ money      │ 금전·수입      │ 2, 11, 8            │
 * │ decision   │ 선택·결정      │ 1, 7, 10            │
 * └────────────┴────────────────┴─────────────────────┘
 */
const VedicCore = require('../public/js/vedic-core.js');
const { Origin, Horoscope } = require('circular-natal-horoscope-js');
const { utcToCivilInTz } = require('./astro-cities-data');

const CATEGORIES = [
  {
    id: 'property',
    label: '부동산·매매',
    desc: '집·땅·매도·계약',
    houses: [4, 7, 11],
    examples: ['지금 내놓은 아파트는 언제쯤 팔릴까요?', '이번 달 안에 계약이 될까요?'],
  },
  {
    id: 'career',
    label: '일·이직',
    desc: '직장·이직·합격',
    houses: [10, 6, 11],
    examples: ['이번 면접은 잘 될까요?', '이직을 지금 추진해도 될까요?'],
  },
  {
    id: 'love',
    label: '연애·관계',
    desc: '만남·관계·결혼',
    houses: [7, 5, 11],
    examples: ['이 사람과 관계가 이어질까요?', '올해 안에 좋은 만남이 있을까요?'],
  },
  {
    id: 'money',
    label: '금전·수입',
    desc: '수입·회수·정산',
    houses: [2, 11, 8],
    examples: ['밀린 대금은 언제 들어올까요?', '이번 분기 수입이 나아질까요?'],
  },
  {
    id: 'decision',
    label: '선택·결정',
    desc: '가부·타이밍',
    houses: [1, 7, 10],
    examples: ['이 제안을 받아도 될까요?', '지금 움직이는 게 나을까요?'],
  },
];

const DIGNITY_KO = {
  exalted: '고양',
  own: '자기 사인',
  debilitated: '하강',
  moolatrikona: '물라트리코나',
};

  /*
 * 민감 주제 차단 — 단어 하나가 아니라 "문맥 패턴"으로 거름
 * (매도·매수·병원·건강·바람 같은 일상 단어는 단독으로 막지 않음)
 */
var BLOCK_EXCEPTIONS = /(주식회사|고소득|고소한\s*(맛|빵|향|냄새|커피|카페|참기름)|고소하게|바람직|바람대로|코인\s*(노래방|세탁|빨래|게임))/g;
var BLOCK_RULES = [
  { topic: '건강·질병', re: /(수술|질병|투병|완치|시한부|수명|치매|우울증|공황장애|입원|퇴원|병세|난임|불임|임신|낙태|임신중절|유산\s*(될|할|위험)|진단\s*(결과|받)|검진\s*결과|건강\s*(이|은|상태|문제|악화|회복|검진)|병(이|에\s*걸|을\s*고|세)|(폐|위|간|대장|유방|갑상선|췌장|자궁|전립선|혈액)암|(^|[\s,.])암(이|으로|에|\s*(진단|수술|검사|치료|재발|판정|환자)))/ },
  { topic: '생사', re: /(사망|자살|죽을까|죽나요|죽는|죽음|목숨)/ },
  { topic: '소송·범죄', re: /(소송|재판|판결|고소|고발|기소|구속|형사\s*(사건|처벌|고소)|합의금|범죄|경찰\s*조사|교도소|감옥)/ },
  { topic: '주식·코인 투자', re: /(주식|주가|코인|비트코인|이더리움|가상\s*화폐|암호\s*화폐|ETF|선물\s*옵션|상장\s*폐지|레버리지)/i },
  { topic: '도박', re: /(도박|로또|토토|카지노|경마|복권)/ },
  { topic: '타인 사생활', re: /((남|여)?편|와이프|배우자|애인|상대).{0,8}바람|바람\s*(을|이)?\s*(피|폈|핀|났|나|난|있|있나|있어요|인가요)|외도|불륜|양다리|뒷조사|몰래\s*(만나|연락)|위치\s*추적/ },
];

function blockCheck(question) {
var q = String(question || '').replace(BLOCK_EXCEPTIONS, ' ');
  for (var i = 0; i < BLOCK_RULES.length; i++) {
  var m = q.match(BLOCK_RULES[i].re);
    if (m) return { blocked: true, topic: BLOCK_RULES[i].topic, word: m[0].trim() };
  }
  return { blocked: false };
}

const BENEFIC = { jupiter: 1, venus: 1, mercury: 0.6, moon: 0.5 };
const MALEFIC = { saturn: 1, mars: 0.85, rahu: 0.7, ketu: 0.55, sun: 0.35 };

function catById(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

function isBlockedQuestion(question) {
  return blockCheck(question);
}

function dignityKo(d) {
  return DIGNITY_KO[d] || d || '';
}

function houseLord(rashi) {
  return VedicCore.SIGN_LORD[rashi] || null;
}

function grahaMap(data) {
  const m = {};
  (data.grahas || []).forEach((g) => {
    m[g.key] = g;
  });
  return m;
}

function dignityScore(g) {
  if (!g) return 0;
  const d = g.dignity || '';
  if (d === 'exalted' || d === 'moolatrikona') return 2.2;
  if (d === 'own') return 1.6;
  if (d === 'debilitated') return -2.0;
  return 0.2;
}

function aspectToHouse(fromG, targetHouse, lagnaRashi) {
  if (!fromG) return false;
  const aspects = VedicCore.drishtiSigns(fromG.key, fromG.rashi);
  for (let i = 0; i < aspects.length; i++) {
    const house = ((aspects[i].rashi - lagnaRashi + 12) % 12) + 1;
    if (house === targetHouse) return true;
  }
  return false;
}

function houseOfRashi(rashi, baseRashi) {
  return ((rashi - baseRashi + 12) % 12) + 1;
}

function scoreChart(data, category) {
  const cat = catById(category);
  const lagna = data.lagna;
  if (!cat || !lagna) return { score: 0, notes: ['상승궁을 계산하지 못했어요.'] };
  const map = grahaMap(data);
  const lagnaRashi = lagna.rashi;
  let score = 0;
  const notes = [];

  const l1 = houseLord(lagnaRashi);
  const g1 = map[l1];
  score += dignityScore(g1) * 0.8;
  if (g1) {
    notes.push(
      '질문자(1하우스) 주인 ' +
        (VedicCore.GRAHA_KO[l1] || l1) +
        josaIGa(VedicCore.GRAHA_KO[l1] || l1) +
        ' ' +
        VedicCore.SIGNS[g1.rashi].ko +
        '에 있어요' +
        (g1.dignity ? ' (' + dignityKo(g1.dignity) + ')' : '') +
        '.'
    );
  }

  cat.houses.forEach((h, idx) => {
    const rashi = (lagnaRashi + h - 1) % 12;
    const lord = houseLord(rashi);
    const g = map[lord];
    const w = idx === 0 ? 1.4 : 1.0;
    score += dignityScore(g) * w;
    if (g && g.house === h) {
      score += 0.8 * w;
      notes.push(h + '하우스에 주인이 자리해 주제와 직접 맞닿아 있어요.');
    }
    Object.keys(BENEFIC).forEach((k) => {
      if (aspectToHouse(map[k], h, lagnaRashi)) score += 0.55 * BENEFIC[k] * w;
    });
    Object.keys(MALEFIC).forEach((k) => {
      if (aspectToHouse(map[k], h, lagnaRashi)) score -= 0.65 * MALEFIC[k] * w;
    });
    if (g) {
      notes.push(
        h +
          '하우스 주인 ' +
          (VedicCore.GRAHA_KO[lord] || lord) +
          ' · ' +
          VedicCore.SIGNS[g.rashi].ko +
          (g.dignity ? ' (' + dignityKo(g.dignity) + ')' : '')
      );
    }
  });

  const moon = map.moon;
  if (moon) {
    score += dignityScore(moon) * 0.7;
    if (moon.house === 6 || moon.house === 8 || moon.house === 12) {
      score -= 1.1;
      notes.push('달이 6·8·12하우스에 있어 흐름이 더딜 수 있어요.');
    } else if (moon.house === 1 || moon.house === 4 || moon.house === 10 || moon.house === 11) {
      score += 0.7;
      notes.push('달의 위치가 질문 흐름을 비교적 또렷하게 보여 줘요.');
    }
  }

  return { score, notes: notes.slice(0, 6), lagnaRashi, houses: cat.houses };
}

function toneFromScore(score) {
  if (score >= 3.2) return { tone: 'favorable', conclusion: '가능성이 높은 편이에요' };
  if (score >= 0.8) return { tone: 'mixed', conclusion: '가능성은 있으나 시간이 필요해 보여요' };
  if (score >= -1.5) return { tone: 'delayed', conclusion: '지금은 기다림·조율이 필요한 흐름이에요' };
  return { tone: 'difficult', conclusion: '당장은 어렵거나 조건이 더 필요해 보여요' };
}

function buildChartAtCivil(civil, lat, lng) {
  const origin = new Origin({
    year: civil.y,
    month: civil.mo - 1,
    date: civil.da,
    hour: civil.hh,
    minute: civil.mi,
    latitude: lat,
    longitude: lng,
  });
  const horoscope = new Horoscope({
    origin,
    houseSystem: 'placidus',
    zodiac: 'tropical',
    aspectPoints: ['bodies'],
    aspectWithPoints: ['bodies'],
    aspectTypes: ['major'],
    language: 'en',
  });
  return VedicCore.build(horoscope, { y: civil.y, mo: civil.mo, da: civil.da }, {});
}

function buildPrashnaChart(askedAt, lat, lng, timeZone) {
  const civil = utcToCivilInTz(askedAt, timeZone);
  const data = buildChartAtCivil(civil, lat, lng);
  return { data, civil };
}

function isoDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function mergeWindows(days, reason_code, reason_text) {
  if (!days.length) return [];
  days.sort((a, b) => a - b);
  const out = [];
  let start = days[0];
  let prev = days[0];
  const DAY = 86400000;
  for (let i = 1; i < days.length; i++) {
    if (days[i] - prev > DAY * 8) {
      out.push({
        start: isoDay(start),
        end: isoDay(prev),
        reason_code,
        reason_text,
      });
      start = days[i];
    }
    prev = days[i];
  }
  out.push({
    start: isoDay(start),
    end: isoDay(prev),
    reason_code,
    reason_text,
  });
  return out;
}

/**
 * 앞으로 12개월: 목·토가 (라그나/달 기준) 주제 하우스 입궁·주시,
 * 주제 하우스 주인의 사인 이동·역행 종료
 */
function buildTimingCandidates(data, category, askedAtMs, lat, lng, timeZone) {
  const cat = catById(category);
  if (!cat || !data.lagna) return [];
  const lagnaRashi = data.lagna.rashi;
  const moon = (data.grahas || []).find((g) => g.key === 'moon');
  const moonRashi = moon ? moon.rashi : lagnaRashi;
  const targetHouses = cat.houses;
  const lords = new Set();
  targetHouses.forEach((h) => {
    lords.add(houseLord((lagnaRashi + h - 1) % 12));
  });

  const DAY = 86400000;
  const step = 4;
  const horizon = 365;
  const samples = [];

  for (let d = 0; d <= horizon; d += step) {
    const t = askedAtMs + d * DAY;
    const civil = utcToCivilInTz(t, timeZone);
    const snap = buildChartAtCivil(civil, lat, lng);
    const map = grahaMap(snap);
    samples.push({ t, map });
  }

  const buckets = {
    jup_enter_l: {},
    jup_asp_l: {},
    sat_enter_l: {},
    sat_asp_l: {},
    jup_enter_m: {},
    jup_asp_m: {},
    sat_enter_m: {},
    sat_asp_m: {},
  };

  function pushBucket(bag, house, t) {
    const k = String(house);
    if (!bag[k]) bag[k] = [];
    bag[k].push(t);
  }

  samples.forEach((s) => {
    const j = s.map.jupiter;
    const sat = s.map.saturn;
    targetHouses.forEach((h) => {
      if (j) {
        if (houseOfRashi(j.rashi, lagnaRashi) === h) pushBucket(buckets.jup_enter_l, h, s.t);
        if (aspectToHouse(j, h, lagnaRashi)) pushBucket(buckets.jup_asp_l, h, s.t);
        if (houseOfRashi(j.rashi, moonRashi) === h) pushBucket(buckets.jup_enter_m, h, s.t);
        if (aspectToHouse(j, h, moonRashi)) pushBucket(buckets.jup_asp_m, h, s.t);
      }
      if (sat) {
        if (houseOfRashi(sat.rashi, lagnaRashi) === h) pushBucket(buckets.sat_enter_l, h, s.t);
        if (aspectToHouse(sat, h, lagnaRashi)) pushBucket(buckets.sat_asp_l, h, s.t);
        if (houseOfRashi(sat.rashi, moonRashi) === h) pushBucket(buckets.sat_enter_m, h, s.t);
        if (aspectToHouse(sat, h, moonRashi)) pushBucket(buckets.sat_asp_m, h, s.t);
      }
    });
  });

  // ── 후보 만들기 ──
  // 목성·토성: 같은 행성·같은 기준(라그나/달)·같은 동작·같은 기간이면 하우스를 합쳐 한 줄로
  const DAYMS = 86400000;
  const todayIso = isoDay(askedAtMs);
  const raw = [];
  function addBag(bag, planet, base, kind) {
    Object.keys(bag).forEach((h) => {
      mergeWindows(bag[h], '', '').forEach((w) => {
        raw.push({ planet, base, kind, house: Number(h), start: w.start, end: w.end });
      });
    });
  }
  addBag(buckets.jup_enter_l, 'jupiter', 'lagna', 'enter');
  addBag(buckets.jup_asp_l, 'jupiter', 'lagna', 'aspect');
  addBag(buckets.sat_enter_l, 'saturn', 'lagna', 'enter');
  addBag(buckets.sat_asp_l, 'saturn', 'lagna', 'aspect');
  addBag(buckets.jup_enter_m, 'jupiter', 'moon', 'enter');
  addBag(buckets.jup_asp_m, 'jupiter', 'moon', 'aspect');
  addBag(buckets.sat_enter_m, 'saturn', 'moon', 'enter');
  addBag(buckets.sat_asp_m, 'saturn', 'moon', 'aspect');

  const merged = {};
  raw.forEach((r) => {
    const k = [r.planet, r.base, r.kind, r.start, r.end].join('|');
    if (!merged[k]) merged[k] = { ...r, houses: [] };
    if (merged[k].houses.indexOf(r.house) === -1) merged[k].houses.push(r.house);
  });

  const transit = Object.keys(merged).map((k) => {
    const m = merged[k];
    m.houses.sort((x, y) => x - y);
    const ongoing = m.start === todayIso;
    // 긴 구간(60일 초과)은 시작(진행 중이면 오늘)부터 30일만 시기 후보로 씀
    let end = m.end;
    const lenDays = (Date.parse(m.end) - Date.parse(m.start)) / DAYMS;
    if (lenDays > 60) end = isoDay(Date.parse(m.start) + 30 * DAYMS);
    const pName = VedicCore.GRAHA_KO[m.planet];
    const baseKo = m.base === 'lagna' ? '라그나' : '달';
    const hs = m.houses.join('·') + '하우스';
    const verb = m.kind === 'enter' ? hs + '에 머물러요' : hs + '를 바라봐요';
    const text =
      pName + josaIGa(pName) + ' ' + baseKo + ' 기준 ' + verb + '.' +
      (ongoing ? ' (지금 진행 중' + (lenDays > 60 ? ', ' + m.end + '까지 이어짐' : '') + ')' : '') +
      (!ongoing && lenDays > 60 ? ' (' + m.end + '까지 이어짐)' : '');
    return {
      group: m.planet,
      start: m.start,
      end,
      reason_code:
        (m.planet === 'jupiter' ? 'JUPITER' : 'SATURN') + '_' +
        (m.kind === 'enter' ? 'ENTER' : 'ASPECT') + '_' +
        (m.base === 'lagna' ? 'LAGNA' : 'MOON') + '_H' + m.houses.join('_'),
      reason_text: text,
    };
  });

  // 하우스 주인: 사인 이동 · 역행 종료 (달은 2~3일마다 사인이 바뀌어 시기 근거로 쓰지 않음)
  const lordEvents = [];
  lords.forEach((lordKey) => {
    if (!lordKey || lordKey === 'moon') return;
    let prevRashi = null;
    let prevRetro = null;
    const pName = VedicCore.GRAHA_KO[lordKey] || lordKey;
    for (let i = 0; i < samples.length; i++) {
      const g = samples[i].map[lordKey];
      if (!g) continue;
      if (prevRashi != null && g.rashi !== prevRashi) {
        lordEvents.push({
          group: 'lord',
          start: isoDay(samples[i].t),
          end: isoDay(samples[i].t + 14 * DAYMS),
          reason_code: 'LORD_SIGN_CHANGE_' + lordKey.toUpperCase(),
          reason_text: '주제 하우스 주인 ' + pName + josaIGa(pName) + ' ' + VedicCore.SIGNS[g.rashi].ko + '로 옮겨 가요.',
        });
      }
      if (prevRetro === true && g.retro === false) {
        lordEvents.push({
          group: 'lord',
          start: isoDay(samples[i].t),
          end: isoDay(samples[i].t + 21 * DAYMS),
          reason_code: 'LORD_DIRECT_' + lordKey.toUpperCase(),
          reason_text: '주제 하우스 주인 ' + pName + '의 역행이 끝나고 순행으로 돌아와요.',
        });
      }
      prevRashi = g.rashi;
      prevRetro = !!g.retro;
    }
  });

  // 종류별로 12개월에 고르게 고르기 (같은 종류는 30일 이상 떨어진 것 우선)
  function spread(list, quota) {
    const sorted = list.slice().sort((x, y) => String(x.start).localeCompare(String(y.start)));
    const picked = [];
    sorted.forEach((c) => {
      if (picked.length >= quota) return;
      const tooClose = picked.some((p) => Math.abs(Date.parse(p.start) - Date.parse(c.start)) < 30 * DAYMS);
      if (!tooClose) picked.push(c);
    });
    sorted.forEach((c) => {
      if (picked.length < quota && picked.indexOf(c) === -1) picked.push(c);
    });
    return picked;
  }
  const chosen = []
    .concat(spread(transit.filter((c) => c.group === 'jupiter'), 4))
    .concat(spread(transit.filter((c) => c.group === 'saturn'), 2))
    .concat(spread(lordEvents, 4));

  chosen.sort((x, y) => String(x.start).localeCompare(String(y.start)));
  const seen = new Set();
  const uniq = [];
  chosen.forEach((c) => {
    const key = c.reason_code + '|' + c.start;
    if (seen.has(key)) return;
    seen.add(key);
    uniq.push({
      index: uniq.length,
      start: c.start,
      end: c.end,
      reason_code: c.reason_code,
      reason_text: c.reason_text,
    });
  });
  return uniq;
}

/** 받침에 따라 이/가 */
function josaIGa(word) {
  const s = String(word || '');
  const code = s.charCodeAt(s.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 ? '이' : '가';
  return '이(가)';
}

function buildChartSnapshot(data, meta) {
  return {
    place: meta.city || '',
    dateLabel: meta.dateLabel || '',
    tz: meta.tz || '',
    lagnaRashi: data.lagna ? data.lagna.rashi : null,
    grahas: (data.grahas || []).map((g) => ({
      key: g.key,
      rashi: g.rashi,
      deg: Math.floor(g.deg),
      retro: !!g.retro,
      dignity: g.dignity || null,
    })),
  };
}

function judge(data, opts) {
  opts = opts || {};
  const category = opts.category;
  const question = String(opts.question || '').trim();
  const block = isBlockedQuestion(question);
  if (block.blocked) {
    return {
      ok: false,
      error: 'blocked_topic',
      message: '건강·수명·소송·투자처럼 민감한 주제는 다루지 않아요. 다른 질문으로 바꿔 주세요.',
    };
  }
  const scored = scoreChart(data, category);
  const t = toneFromScore(scored.score);
  return {
    ok: true,
    tone: t.tone,
    conclusion: t.conclusion,
    score: Math.round(scored.score * 10) / 10,
    evidence: scored.notes,
    lagna: data.lagna
      ? {
          rashi: data.lagna.rashi,
          label: VedicCore.SIGNS[data.lagna.rashi].ko,
        }
      : null,
    houses: scored.houses,
    disclaimer:
      '이 결과는 질문 순간의 하늘을 전통 규칙으로 읽은 참고 해석이며, 특정 결과나 수익을 보장하지 않습니다.',
  };
}

function slimChartJson(data) {
  return {
    lagna: data.lagna
      ? {
          rashi: data.lagna.rashi,
          deg: Math.round(data.lagna.deg * 10) / 10,
          sign: VedicCore.SIGNS[data.lagna.rashi].ko,
        }
      : null,
    grahas: (data.grahas || []).map((g) => ({
      key: g.key,
      name: VedicCore.GRAHA_KO[g.key] || g.key,
      rashi: g.rashi,
      sign: VedicCore.SIGNS[g.rashi].ko,
      deg: Math.round(g.deg * 10) / 10,
      house: g.house,
      dignity: dignityKo(g.dignity),
      retro: !!g.retro,
    })),
  };
}

module.exports = {
  CATEGORIES,
  DIGNITY_KO,
  BLOCK_RULES,
  catById,
  isBlockedQuestion,
  dignityKo,
  buildPrashnaChart,
  buildTimingCandidates,
  buildChartSnapshot,
  judge,
  slimChartJson,
  VedicCore,
};
