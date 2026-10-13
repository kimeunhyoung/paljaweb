/**
 * 프라슈나 판정·시기 후보 (서버)
 *
 * 카테고리 ↔ 하우스 매핑
 * property 4,7,11 | career 10,6,11 | love 7,5,11 | money 2,11,8 | decision 1,7,10
 * exam 4,5,9 | move 3,9,12 | family 4,5,9 | lost 2,4,11 | other 1,7,10
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
    keywords: /(아파트|부동산|매매|매도|매수|전세|월세|분양|입주|집\s*팔|집\s*사|땅\s*팔|재건축)/,
  },
  {
    id: 'career',
    label: '일·이직',
    desc: '직장·이직·승진',
    houses: [10, 6, 11],
    examples: ['이번 면접은 잘 될까요?', '이직을 지금 추진해도 될까요?'],
    keywords: /(이직|직장|회사|취업|승진|연봉|퇴사|창업|사업|업무|직장생활|면접(?!\s*시험)|채용|입사)/,
  },
  {
    id: 'love',
    label: '연애·관계',
    desc: '만남·관계·결혼',
    houses: [7, 5, 11],
    examples: ['이 사람과 관계가 이어질까요?', '올해 안에 좋은 만남이 있을까요?'],
    keywords: /(연애|남자친구|여자친구|결혼|커플|헤어진|재회|썸|배우자|애인|연인|프로포즈|이별)/,
  },
  {
    id: 'money',
    label: '금전·수입',
    desc: '수입·회수·정산',
    houses: [2, 11, 8],
    examples: ['밀린 대금은 언제 들어올까요?', '이번 분기 수입이 나아질까요?'],
    keywords: /(금전|수입|대금|정산|빚|대출|회수|월급|보너스|용돈|미수금|대금\s*받)/,
  },
  {
    id: 'decision',
    label: '선택·결정',
    desc: '가부·타이밍',
    houses: [1, 7, 10],
    examples: ['이 제안을 받아도 될까요?', '지금 움직이는 게 나을까요?'],
    keywords: /(선택|결정|제안\s*받|할까\s*말까|어느\s*쪽|A안|B안|받아도\s*될|지금\s*움직)/,
  },
  {
    id: 'exam',
    label: '시험·공부',
    desc: '시험·합격·학습',
    houses: [4, 5, 9],
    examples: ['이번 시험에 합격할까요?', '자격증 공부는 잘 풀릴까요?'],
    keywords: /(시험|수능|자격증|공부|입시|토익|고시|논문|수험|합격할까요|성적|학원)/,
  },
  {
    id: 'move',
    label: '이사·여행·해외',
    desc: '이동·유학·출장',
    houses: [3, 9, 12],
    examples: ['유학 준비가 잘 될까요?', '이번 이사 타이밍이 괜찮을까요?'],
    keywords: /(이사|이주|해외|유학|이민|출장|여행|어학연수|워홀|전근|발령|해외\s*거주)/,
  },
  {
    id: 'family',
    label: '가족·자녀',
    desc: '가족·자녀·가정',
    houses: [4, 5, 9],
    examples: ['아이 입학이 잘 될까요?', '가족 분위기가 나아질까요?'],
    keywords: /(가족|자녀|아이|아들|딸|부모|시부모|장모|시댁|처가|육아|전학|우리\s*집\s*분위기)/,
  },
  {
    id: 'lost',
    label: '분실물',
    desc: '잃어버린 물건',
    houses: [2, 4, 11],
    examples: ['잃어버린 지갑을 찾을 수 있을까요?', '분실한 휴대폰이 나올까요?'],
    keywords: /(분실|잃어|잃은|찾을\s*수|찾아질|지갑|열쇠|분실물|놓고\s*온)/,
  },
  {
    id: 'other',
    label: '기타',
    desc: '위에 없는 질문',
    houses: [1, 7, 10],
    examples: ['지금 흐름이 어떤가요?', '이 일은 어떻게 흘러갈까요?'],
    keywords: null,
  },
];

const DIGNITY_KO = {
  exalted: '고양',
  own: '자기 사인',
  debilitated: '하강',
  moolatrikona: '물라트리코나',
};

/** 고객용 하우스 표기: 의미 (N하우스) */
const HOUSE_MEANING = {
  1: '나·출발',
  2: '수입·자원',
  3: '소통·움직임',
  4: '집·기반',
  5: '연애·창작',
  6: '일상·업무',
  7: '상대·계약',
  8: '공유·변화',
  9: '배움·확장',
  10: '일·지위',
  11: '인연·성과',
  12: '마무리·숨은 일',
};

function houseSoft(h) {
  const n = Number(h);
  const m = HOUSE_MEANING[n];
  return m ? m + ' (' + n + '하우스)' : n + '하우스';
}

function housesSoft(list) {
  const arr = (list || []).map(Number).filter((n) => n >= 1 && n <= 12);
  if (!arr.length) return '';
  return arr.map(houseSoft).join(', ');
}

/**
 * 오늘·이번 주 질문이면 시기 후보를 가까운 구간만 남김 (today≈1개월, near≈2개월)
 */
function filterTimingsNearTerm(candidates, askedAtMs, nearTerm) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (!nearTerm || !list.length) return list;
  const DAYMS = 86400000;
  const maxDays = nearTerm === 'today' ? 30 : 60;
  const todayIso = isoDay(askedAtMs);
  const cutoffIso = isoDay(askedAtMs + maxDays * DAYMS);
  const filtered = list.filter((c) => {
    const start = String(c.start || '');
    const end = String(c.end || c.start || '');
    if (!start) return false;
    return start <= cutoffIso && end >= todayIso;
  });
  // 가까운 시점 질문이면 끝나는 날도 그 범위 안으로 잘라서 보여 줌 (내년 날짜가 나오지 않게)
  return filtered.map((c, i) =>
    Object.assign({}, c, { index: i, end: String(c.end || '') > cutoffIso ? cutoffIso : c.end })
  );
}

/*
 * 민감 주제 차단 — 단어 하나가 아니라 "문맥 패턴"으로 거름
 * (매도·매수·병원·건강·바람(외도) 같은 단어는 단독으로 막지 않음)
 * 외도·불륜·바람 질문은 연애·관계로 허용. 뒷조사·위치추적은 계속 차단.
 * 주식·코인: 흐름 질문은 허용(주의 문구 표시), 종목·매매 시점 질문만 차단 (관리자는 허용)
 * Private 등급(opts.allowAll): 자살·자해만 막고 모든 주제 허용 (민감 주제는 sensitive로 표시)
 */
var BLOCK_EXCEPTIONS = /(주식회사|고소득|고소한\s*(맛|빵|향|냄새|커피|카페|참기름)|고소하게|바람직|코인\s*(노래방|세탁|빨래|게임))/g;
/** 등급과 상관없이 항상 막는 주제 */
var ALWAYS_BLOCK = { topic: '자살·자해', re: /(자살|자해|극단적\s*선택|스스로\s*목숨)/ };
var BLOCK_RULES = [
  { topic: '건강·질병', re: /(수술|질병|투병|완치|시한부|수명|치매|우울증|공황장애|입원|퇴원|병세|난임|불임|임신|낙태|임신중절|유산\s*(될|할|위험)|진단\s*(결과|받)|검진\s*결과|건강\s*(이|은|상태|문제|악화|회복|검진)|병(이|에\s*걸|을\s*고|세)|(폐|위|간|대장|유방|갑상선|췌장|자궁|전립선|혈액)암|(^|[\s,.])암(이|으로|에|\s*(진단|수술|검사|치료|재발|판정|환자)))/ },
  { topic: '생사', re: /(사망|죽을까|죽나요|죽는|죽음|목숨)/ },
  { topic: '소송·범죄', re: /(소송|재판|판결|고소|고발|기소|구속|형사\s*(사건|처벌|고소)|합의금|범죄|경찰\s*조사|교도소|감옥)/ },
  { topic: '도박', re: /(도박|로또|토토|카지노|경마|복권)/ },
  { topic: '불법 감시', re: /(뒷조사|몰래\s*(만나|연락)|위치\s*추적)/ },
];
var INVEST_RE = /(주식|주가|코인|비트코인|이더리움|가상\s*화폐|암호\s*화폐|ETF|선물\s*옵션|상장\s*폐지|레버리지|종목|상한가|하한가|재테크)/i;
var INVEST_TRADE_RE = /(언제|사도|살까|사야|사면|팔아|팔까|팔면|매수|매도|손절|익절|타이밍|들어가|오를|떨어질|상승|하락|올라|떨어|목표가|수익률|몇\s*배|떡상|떡락)/;
var INVEST_TOPIC = '투자 종목·매매 시점';
var INVEST_NOTICE =
  '투자 관련 질문이에요. 질문점은 그 순간의 흐름을 읽는 참고 해석일 뿐, 종목 추천이나 매매 시점 조언이 아니에요. ' +
  '투자 판단의 근거로 쓰지 마시고, 투자 결과에 대한 책임은 본인에게 있어요.';

/** opts.allowInvest: 관리자 — 종목·매매 시점 허용 / opts.allowAll: Private — 자살·자해 외 전부 허용 */
function blockCheck(question, opts) {
  opts = opts || {};
  var q = String(question || '').replace(BLOCK_EXCEPTIONS, ' ');
  var hard = q.match(ALWAYS_BLOCK.re);
  if (hard) return { blocked: true, topic: ALWAYS_BLOCK.topic, word: hard[0].trim(), always: true };
  for (var i = 0; i < BLOCK_RULES.length; i++) {
    var m = q.match(BLOCK_RULES[i].re);
    if (m) {
      if (opts.allowAll) return { blocked: false, sensitive: BLOCK_RULES[i].topic, invest: INVEST_RE.test(q) };
      return { blocked: true, topic: BLOCK_RULES[i].topic, word: m[0].trim() };
    }
  }
  var inv = q.match(INVEST_RE);
  if (inv) {
    var tr = q.match(INVEST_TRADE_RE);
    if (tr && !opts.allowInvest && !opts.allowAll) {
      return { blocked: true, topic: INVEST_TOPIC, word: inv[0].trim(), invest: true };
    }
    return { blocked: false, invest: true };
  }
  return { blocked: false };
}

const BENEFIC = { jupiter: 1, venus: 1, mercury: 0.6, moon: 0.5 };
const MALEFIC = { saturn: 1, mars: 0.85, rahu: 0.7, ketu: 0.55, sun: 0.35 };

function catById(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

/** 질문 문구로 주제를 추정 (없으면 null — UI에서 칩만 미리 켜 둠) */
function suggestCategory(question) {
  const q = String(question || '').trim();
  if (q.length < 2) return null;
  const order = ['lost', 'exam', 'move', 'family', 'property', 'career', 'love', 'money', 'decision'];
  for (let i = 0; i < order.length; i++) {
    const cat = catById(order[i]);
    if (cat && cat.keywords && cat.keywords.test(q)) return cat.id;
  }
  return null;
}

function isBlockedQuestion(question, opts) {
  return blockCheck(question, opts);
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

function scoreChart(data, category, opts) {
  opts = opts || {};
  const cat = catById(category);
  const lagna = data.lagna;
  if (!cat || !lagna) return { score: 0, notes: ['상승궁을 계산하지 못했어요.'] };
  const map = grahaMap(data);
  const lagnaRashi = lagna.rashi;
  let score = 0;
  const notes = [];
  const selfLabel = opts.mode === 'natal' ? '나 (1하우스)' : '질문자·나 (1하우스)';

  const l1 = houseLord(lagnaRashi);
  const g1 = map[l1];
  score += dignityScore(g1) * 0.8;
  if (g1) {
    notes.push(
      selfLabel +
        ' 주인 ' +
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
    const hLabel = houseSoft(h);
    score += dignityScore(g) * w;
    if (g && g.house === h) {
      score += 0.8 * w;
      notes.push(hLabel + '에 주인이 자리해 주제와 직접 맞닿아 있어요.');
    }
    Object.keys(BENEFIC).forEach((k) => {
      if (aspectToHouse(map[k], h, lagnaRashi)) score += 0.55 * BENEFIC[k] * w;
    });
    Object.keys(MALEFIC).forEach((k) => {
      if (aspectToHouse(map[k], h, lagnaRashi)) score -= 0.65 * MALEFIC[k] * w;
    });
    if (g) {
      notes.push(
        hLabel +
          ' 주인 ' +
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
      notes.push('달이 ' + housesSoft([6, 8, 12]) + '에 있어 흐름이 더딜 수 있어요.');
    } else if (moon.house === 1 || moon.house === 4 || moon.house === 10 || moon.house === 11) {
      score += 0.7;
      notes.push('달의 위치가 질문 흐름을 비교적 또렷하게 보여 줘요.');
    }
  }

  return { score, notes: notes.slice(0, 6), lagnaRashi, houses: cat.houses };
}

/** 출생 현지 시각 → UTC ms (다샤용 · Origin과 동일 기준) */
function civilToBirthMs(civil, lat, lng) {
  const origin = new Origin({
    year: Number(civil.y),
    month: Number(civil.mo) - 1,
    date: Number(civil.da),
    hour: Number(civil.hh),
    minute: Number(civil.mi),
    latitude: lat,
    longitude: lng,
  });
  try {
    const u = origin.utcTime && origin.utcTime.valueOf();
    if (u && !Number.isNaN(u)) return u;
  } catch (e) {
    /* fall through */
  }
  return Date.UTC(civil.y, civil.mo - 1, civil.da, civil.hh, civil.mi);
}

/** 고객용 행성 의미 (결론·요약). 전문 이름은 techLabel / evidence에만. */
const GRAHA_SOFT = {
  sun: '인정·지위',
  moon: '마음·가정',
  mars: '추진·경쟁',
  mercury: '소통·거래',
  jupiter: '도움·성장',
  venus: '관계·즐거움·재물',
  saturn: '인내·책임',
  rahu: '욕심·확장·변화',
  ketu: '정리·내려놓기',
};

function grahaSoft(key) {
  return GRAHA_SOFT[key] || VedicCore.GRAHA_KO[key] || key;
}

/** 문장 속에 넣는 쉬운 설명 — 「~ 시기」 앞에 붙여 씀 */
const GRAHA_PHRASE = {
  sun: '인정받는 일이 눈에 띄는',
  moon: '마음과 가정에 신경이 쓰이는',
  mars: '밀어붙이고 경쟁하는',
  mercury: '소통과 거래가 활발한',
  jupiter: '도움과 성장이 따르는',
  venus: '사람·즐거움·돈과 관련된 일이 들어오는',
  saturn: '인내하며 책임을 지는',
  rahu: '욕심을 내고 크게 벌이는',
  ketu: '묵은 것을 정리하고 내려놓는',
};

function grahaPhrase(key) {
  return GRAHA_PHRASE[key] || grahaSoft(key);
}

/** 예: 큰 틀에서는 묵은 것을 정리하고 내려놓는 시기이고, 그 안에서 지금은 사람·즐거움·돈과 관련된 일이 들어오는 시기 */
function dashaSoftEmbedded(dashaNow) {
  if (!dashaNow || !dashaNow.mahaLord) return '지금의 운의 시기';
  const m = grahaPhrase(dashaNow.mahaLord);
  const a = dashaNow.antarLord ? grahaPhrase(dashaNow.antarLord) : null;
  if (a) return '큰 틀에서는 ' + m + ' 시기이고, 그 안에서 지금은 ' + a + ' 시기';
  return '큰 틀에서는 ' + m + ' 시기';
}

function dashaSoftLabel(dashaNow) {
  if (!dashaNow || !dashaNow.mahaLord) return '지금의 운의 시기';
  const parts = [grahaSoft(dashaNow.mahaLord) + ' 큰 흐름'];
  if (dashaNow.antarLord) parts.push(grahaSoft(dashaNow.antarLord) + ' 운');
  if (dashaNow.pratLord) parts.push(grahaSoft(dashaNow.pratLord) + ' 세부 시기');
  return parts.join(' · ');
}

/** 기준 시각의 마하·안타르·프라얀타르 다샤 (3단계) */
function currentDashaAt(moonSid, birthMs, atMs) {
  if (!Number.isFinite(moonSid) || !Number.isFinite(birthMs) || !Number.isFinite(atMs)) return null;
  const pack = VedicCore.dasha(moonSid, birthMs);
  let maha = null;
  let antar = null;
  let prat = null;
  let nextPrat = null;
  for (let i = 0; i < pack.list.length; i++) {
    const m = pack.list[i];
    if (atMs >= m.start && atMs < m.end) {
      maha = m;
      for (let j = 0; j < m.subs.length; j++) {
        const s = m.subs[j];
        if (atMs >= s.start && atMs < s.end) {
          antar = s;
          const prats = Array.isArray(s.prats) ? s.prats : [];
          for (let k = 0; k < prats.length; k++) {
            const p = prats[k];
            if (atMs >= p.start && atMs < p.end) {
              prat = p;
              nextPrat = prats[k + 1] || null;
              if (!nextPrat) {
                const nextAntar = m.subs[j + 1] || (pack.list[i + 1] && pack.list[i + 1].subs[0]) || null;
                nextPrat = nextAntar && nextAntar.prats ? nextAntar.prats[0] : null;
              }
              break;
            }
          }
          break;
        }
      }
      break;
    }
  }
  if (!maha) return null;
  const techParts = [VedicCore.GRAHA_KO[maha.lord] || maha.lord];
  if (antar) techParts.push(VedicCore.GRAHA_KO[antar.lord] || antar.lord);
  if (prat) techParts.push(VedicCore.GRAHA_KO[prat.lord] || prat.lord);
  const out = {
    mahaLord: maha.lord,
    antarLord: antar ? antar.lord : null,
    pratLord: prat ? prat.lord : null,
    mahaStart: maha.start,
    mahaEnd: maha.end,
    antarStart: antar ? antar.start : null,
    antarEnd: antar ? antar.end : null,
    pratStart: prat ? prat.start : null,
    pratEnd: prat ? prat.end : null,
    nextPratLord: nextPrat ? nextPrat.lord : null,
    yearDays: pack.yearDays || VedicCore.DASHA_YEAR_DAYS || null,
    levels: 3,
    techLabel: techParts.join('–') + ' 다샤',
    label: '', // soft — filled below
  };
  out.label = dashaSoftLabel(out);
  out.softLabel = out.label;
  out.summary = dashaSoftEmbedded(out) + '예요.';
  /** 화면 표 — 큰 흐름(몇 년) · 지금 단계(몇 달~몇 년) · 요즘(몇 주) */
  const isoD = (ms) => (Number.isFinite(ms) ? new Date(ms + 9 * 3600000).toISOString().slice(0, 10) : null);
  out.periods = [
    { level: 'maha', title: '큰 흐름', scale: '몇 년 단위', lord: maha.lord },
    antar ? { level: 'antar', title: '지금 단계', scale: '몇 달~몇 년 단위', lord: antar.lord } : null,
    prat ? { level: 'prat', title: '요즘', scale: '몇 주 단위', lord: prat.lord } : null,
  ]
    .filter(Boolean)
    .map((p) => {
      const src = p.level === 'maha' ? maha : p.level === 'antar' ? antar : prat;
      return Object.assign(p, {
        start: isoD(src.start),
        end: isoD(src.end),
        meaning: grahaPhrase(p.lord) + ' 시기',
        soft: grahaSoft(p.lord),
        tech: VedicCore.GRAHA_KO[p.lord] || p.lord,
      });
    });
  // 4단계(숙쉬마, 며칠 단위) — 상담사 화면용
  if (prat) {
    const order = VedicCore.DASHA_ORDER;
    const plen = prat.end - prat.start;
    let st = prat.start;
    const i0 = order.indexOf(prat.lord);
    for (let k = 0; k < 9; k++) {
      const l = order[(i0 + k) % 9];
      const en = st + (plen * VedicCore.DASHA_YEARS[l]) / 120;
      if (atMs >= st && atMs < en) {
        out.sookLord = l;
        out.periods.push({
          level: 'sook',
          title: '이번 주 무렵',
          scale: '며칠 단위',
          lord: l,
          start: isoD(st),
          end: isoD(en),
          meaning: grahaPhrase(l) + ' 때',
          soft: grahaSoft(l),
          tech: VedicCore.GRAHA_KO[l] || l,
          counselorOnly: true,
        });
        break;
      }
      st = en;
    }
  }
  if (prat && nextPrat) {
    const pp = out.periods.find((p) => p.level === 'prat');
    if (pp) {
      pp.next = grahaPhrase(nextPrat.lord) + ' 시기';
      pp.nextTech = VedicCore.GRAHA_KO[nextPrat.lord] || nextPrat.lord;
    }
  }
  return out;
}

/** 주제 하우스 주인·주시와 현재 다샤 행성의 맞닿음 */
function scoreDashaForTopic(data, category, dashaNow) {
  if (!dashaNow || !data || !data.lagna) {
    return { delta: 0, relevant: 'neutral', note: null };
  }
  const cat = catById(category);
  if (!cat) return { delta: 0, relevant: 'neutral', note: null };
  const map = grahaMap(data);
  const lagnaRashi = data.lagna.rashi;
  const topicLords = new Set();
  cat.houses.forEach((h) => {
    topicLords.add(houseLord((lagnaRashi + h - 1) % 12));
  });
  const dusthana = new Set([6, 8, 12]);

  function lordTouch(key) {
    if (!key) return { hit: 0, dust: false };
    let hit = 0;
    let dust = false;
    if (topicLords.has(key)) hit += 2;
    const g = map[key];
    if (g) {
      if (cat.houses.indexOf(g.house) >= 0) hit += 1.2;
      cat.houses.forEach((h) => {
        if (aspectToHouse(g, h, lagnaRashi)) hit += 0.8;
      });
      if (dusthana.has(g.house)) dust = true;
    }
    return { hit, dust };
  }

  const m = lordTouch(dashaNow.mahaLord);
  const a = lordTouch(dashaNow.antarLord);
  const p = lordTouch(dashaNow.pratLord);
  let delta = m.hit * 0.45 + a.hit * 0.7 + p.hit * 0.95;
  if (m.dust) delta -= 0.4;
  if (a.dust) delta -= 0.55;
  if (p.dust) delta -= 0.65;
  // 품위 보정 (가까운 주기일수록 가중)
  [dashaNow.mahaLord, dashaNow.antarLord, dashaNow.pratLord].forEach((k, idx) => {
    const g = map[k];
    if (!g) return;
    const w = idx === 0 ? 0.2 : idx === 1 ? 0.35 : 0.45;
    delta += dignityScore(g) * w * 0.35;
  });
  delta = Math.max(-2.4, Math.min(2.6, delta));

  let relevant = 'neutral';
  if (delta >= 0.9) relevant = 'support';
  else if (delta <= -0.7) relevant = 'friction';

  let note =
    dashaSoftEmbedded(dashaNow) +
    '예요. ' +
    (relevant === 'support'
      ? '이 질문의 주제와 잘 맞닿아 힘이 실리는 편이에요.'
      : relevant === 'friction'
        ? '이 질문의 주제와는 조금 엇갈려 조율이 더 필요해 보여요.'
        : '이 질문의 주제와는 중간 정도로 맞닿아 있어요.');
  if (dashaNow.techLabel) {
    note += ' (근거: ' + dashaNow.techLabel + ')';
  }

  return { delta, relevant, note };
}

function natalCuspWarnings(data) {
  const out = [];
  if (!data) return out;
  // 상승궁은 대략 4분에 1°씩 움직임 → 3° 이내면 출생 시간 10분 안팎 차이로 별자리가 바뀔 수 있음
  const lagEdge = data.lagna ? Number(data.lagna.rashiEdge) : NaN;
  if (Number.isFinite(lagEdge) && lagEdge < 3) {
    out.push(
      '상승궁이 별자리 경계에 가까워요(' +
        lagEdge.toFixed(1) +
        '°). 출생 시간이 ' +
        (lagEdge < 1 ? '몇 분' : '10분 안팎') +
        '만 달라도 하우스가 하나씩 밀릴 수 있으니, 생시를 한 번 더 확인해 주세요.'
    );
  }
  (data.grahas || []).forEach((g) => {
    if (!g || (g.key !== 'moon' && g.key !== 'sun')) return;
    if (Number(g.rashiEdge) < 0.5) {
      out.push(
        (VedicCore.GRAHA_KO[g.key] || g.key) +
          '이(가) 별자리 경계 근처예요. 생시·생지가 정확할수록 해석이 안정적이에요.'
      );
    }
  });
  return out.slice(0, 2);
}

/** 주제별로 '이 일이 힘들어질 때' 어떻게 드러나는지 — 같은 말이 반복되지 않게 */
const TOPIC_STRAIN = {
  money: '돈이 들어오는 속도가 느려지거나 나갈 돈이 늘기 쉬워요',
  love: '마음이 엇갈리거나 연락이 뜸해지기 쉬워요',
  career: '일이 생각만큼 풀리지 않거나 결과·평가가 늦어지기 쉬워요',
  property: '계약·이사 같은 일이 미뤄지거나 조건이 까다로워지기 쉬워요',
  decision: '판단이 흔들리거나 결정이 자꾸 미뤄지기 쉬워요',
};
function topicStrain(category) {
  return TOPIC_STRAIN[category] || '일이 더디게 움직이기 쉬워요';
}

function blendNatalConclusion(baseConclusion, dashaNow, relevant, nearTerm, tone, cautionCount) {
  if (!dashaNow) return baseConclusion;
  const pre = nearTerm === 'today' ? '오늘만 놓고 보면, ' : nearTerm === 'near' ? '가까운 시점만 놓고 보면, ' : '';
  const tight = (cautionCount || 0) >= 2;
  if (relevant === 'support') {
    if (tone === 'favorable') {
      if (nearTerm === 'today') return pre + '지금 운의 시기가 이 질문과 잘 맞아 흐름이 비교적 열려 보여요';
      if (nearTerm === 'near') return pre + '지금 운의 시기가 이 질문과 잘 맞아 가능성이 있는 편이에요';
      return '지금 운의 시기가 이 질문과 잘 맞아요. ' + baseConclusion;
    }
    if (tone === 'mixed') {
      if (tight) return pre + '운의 시기는 받쳐 주지만 조심할 흐름이 겹쳐, 막히지는 않아도 빠듯하게 흘러가기 쉬워요';
      return pre + '운의 시기는 받쳐 주지만 신호가 아주 또렷하지는 않아, 시간을 두고 보는 게 좋아요';
    }
    return pre + '운의 시기는 받쳐 주지만 지금은 조심할 흐름이 더 커서, 서두르기보다 조금 기다리는 게 좋아 보여요';
  }
  if (relevant === 'friction') {
    return pre + '지금 운의 시기와 조금 엇갈려서, 서두르기보다 조율이 더 필요해 보여요';
  }
  if (tone === 'mixed' && tight) return pre + '뚜렷하게 막히지는 않지만 조심할 흐름이 겹쳐 빠듯하게 흘러가기 쉬워요';
  return baseConclusion;
}

/**
 * 출생 차트 기준 "지금 하늘" 신호 — 받쳐 주는 것 / 주의할 것
 * (주제 하우스 주인의 품위 변화, 라후·케투, 운의 시기 주인 역행, 목성·토성)
 */
function natalTransitSignals(data, category, askedAtMs, lat, lng, timeZone, opts) {
  opts = opts || {};
  // 항목: { text: 일반인용 쉬운 문장, tech: 상담사용 근거(행성·자리) }
  const out = { good: [], caution: [], delta: 0, neg: 0, pos: 0 };
  const cat = catById(category);
  if (!cat || !data || !data.lagna || !Number.isFinite(lat) || !Number.isFinite(lng) || !timeZone) return out;
  const DAYMS = 86400000;
  const near = !!opts.nearTerm;
  const windowDays = near ? 60 : 90;
  const lagnaRashi = data.lagna.rashi;
  const natalMoon = (data.grahas || []).find((g) => g.key === 'moon');
  const moonRashi = natalMoon ? natalMoon.rashi : lagnaRashi;
  const samples = [];
  for (let d = 0; d <= windowDays; d++) {
    const t = askedAtMs + d * DAYMS;
    samples.push({ t, map: grahaMap(buildChartAtCivil(utcToCivilInTz(t, timeZone), lat, lng)) });
  }
  const now = samples[0].map;
  const day = (t) => isoDay(t + 9 * 3600000);
  const ko = (k) => VedicCore.GRAHA_KO[k] || k;
  const sign = (r) => VedicCore.SIGNS[r].ko;
  function add(kind, text, tech, w) {
    out[kind].push({ text, tech: tech || '' });
    if (w < 0) out.neg += w;
    else out.pos += w;
  }
  function untilWhen(key, pred) {
    for (let i = 1; i < samples.length; i++) {
      const g = samples[i].map[key];
      if (g && !pred(g)) return day(samples[i - 1].t);
    }
    return null;
  }
  const strain = topicStrain(category);

  // 1) 주제 하우스 주인 (달은 2~3일마다 바뀌어 제외)
  // 날짜가 있는 주의 흐름은 spans에 모았다가, 겹치는 것끼리 한 줄로 묶음
  const todayIso = day(samples[0].t);
  const lastIso = day(samples[samples.length - 1].t);
  const spans = [];
  function addSpan(from, to, kind, tech, w) {
    spans.push({ from: from || todayIso, to: to || lastIso, open: !to, kind, tech });
    out.neg += w;
  }
  const lordSet = new Set();
  cat.houses.forEach((h) => lordSet.add(houseLord((lagnaRashi + h - 1) % 12)));
  lordSet.forEach((lord) => {
    if (!lord || lord === 'moon') return;
    const g0 = now[lord];
    if (!g0) return;
    const nm = ko(lord);
    if (g0.dignity === 'debilitated') {
      const end = untilWhen(lord, (g) => g.dignity === 'debilitated');
      addSpan(null, end, 'strain', nm + ' · ' + sign(g0.rashi) + '(가장 약해지는 자리)', near ? -1.0 : -0.7);
      return;
    }
    for (let i = 1; i < samples.length; i++) {
      const g = samples[i].map[lord];
      if (g && g.dignity === 'debilitated') {
        const from = day(samples[i].t);
        let end = null;
        for (let j = i + 1; j < samples.length; j++) {
          const gj = samples[j].map[lord];
          if (gj && gj.dignity !== 'debilitated') { end = day(samples[j - 1].t); break; }
        }
        addSpan(from, end, 'strain', nm + ' · ' + sign(g.rashi) + '(가장 약해지는 자리) 진입', near ? -0.9 : -0.6);
        return;
      }
    }
    if (g0.dignity === 'exalted' || g0.dignity === 'own' || g0.dignity === 'moolatrikona') {
      add('good', '이 일을 이끄는 힘이 지금 든든한 편이에요.',
        '이 주제를 맡은 ' + nm + ' · ' + sign(g0.rashi) + '(' + dignityKo(g0.dignity) + ')', 0.4);
    }
  });

  // 2) 라후·케투 — 출생 달 위 / 주제 하우스 위
  ['rahu', 'ketu'].forEach((k) => {
    const g = now[k];
    if (!g) return;
    const nm = ko(k);
    if (g.rashi === moonRashi) {
      add('caution', '요즘은 마음이 불안하고 판단이 흔들리기 쉬워, 실제보다 걱정이 크게 느껴질 수 있어요.',
        nm + '가 출생 달 위를 지남', -0.4);
    }
    const h = houseOfRashi(g.rashi, lagnaRashi);
    if (cat.houses.indexOf(h) >= 0) {
      if (k === 'ketu') {
        add('caution', '이 일에 마음이 잘 붙지 않거나, 하다가 흐지부지되기 쉬워요.', '케투 · ' + houseSoft(h), -0.35);
      } else if ([3, 6, 10, 11].indexOf(h) >= 0) {
        add('good', '뜻밖의 기회나 이익이 생기기 쉬워요.', '라후 · ' + houseSoft(h), 0.3);
      } else {
        add('caution', '욕심이 앞서거나 큰 변동에 휘말리기 쉬워요. 무리한 결정은 피하는 게 좋아요.', '라후 · ' + houseSoft(h), -0.3);
      }
    }
  });

  // 3) 운의 시기 주인 역행
  const dasha = opts.dasha;
  if (dasha) {
    [dasha.antarLord, dasha.pratLord].forEach((k, idx) => {
      if (!k || k === 'rahu' || k === 'ketu' || k === 'sun' || k === 'moon') return;
      const g = now[k];
      if (!g || !g.retro) return;
      const end = untilWhen(k, (x) => !!x.retro);
      addSpan(null, end, 'retro', '운의 시기 주인 ' + ko(k) + ' 역행', idx === 0 ? -0.3 : -0.2);
    });
    if (dasha.fit === 'support') out.good.unshift({ text: '지금 시기 자체는 이 일과 잘 맞는 때예요.', tech: '다샤가 주제와 맞닿음' });
    else if (dasha.fit === 'friction') out.caution.unshift({ text: '지금 시기는 이 일과 조금 엇갈려 있어요.', tech: '다샤가 주제와 엇갈림' });
  }

  // 4) 목성·토성 — 지금 주제 하우스를 비추거나 머무는지 (출생 차트·마음 기준)
  const jHouses = [];
  const sHouses = [];
  cat.houses.forEach((h) => {
    [lagnaRashi, moonRashi].forEach((base) => {
      const j = now.jupiter;
      if (j && (houseOfRashi(j.rashi, base) === h || aspectToHouse(j, h, base)) && jHouses.indexOf(h) === -1) jHouses.push(h);
      const sa = now.saturn;
      if (sa && houseOfRashi(sa.rashi, base) === h && sHouses.indexOf(h) === -1) sHouses.push(h);
    });
  });
  if (jHouses.length) add('good', '도와주는 사람이 나타나거나 숨통이 트이는 일이 생기기 쉬워요.', '목성이 ' + housesSoft(jHouses.sort((a, b) => a - b)) + '를 비춤', 0.4);
  if (sHouses.length) add('caution', '서두르면 막히고, 들인 시간만큼 결과가 늦게 나타나기 쉬워요.', '토성이 ' + housesSoft(sHouses.sort((a, b) => a - b)) + '에 머묾', -0.25);

  // 날짜 있는 주의 흐름: 겹치거나 맞닿는 기간끼리 한 줄로 묶고, 가장 많이 겹치는 구간을 짚어 줌
  const SENT = {
    strain: topicStrain(category) + '.',
    retro: '일이 한 번에 끝나지 않고, 늦어지거나 다시 확인할 일이 생기기 쉬워요.',
  };
  // 두 흐름이 한 줄에 같이 나올 때는 두 번째 문장을 이어지는 말로
  const SENT_ALSO = {
    strain: '여기에 ' + topicStrain(category) + '.',
    retro: '중간에 늦어지거나 다시 확인할 일도 생기기 쉬워요.',
  };
  // 같은 해는 「11월 22일」, 해가 바뀌면 「2027년 1월 10일」 (연말→연초 혼동 방지)
  const baseYear = Number(String(todayIso).slice(0, 4)) || new Date().getFullYear();
  function softDay(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(iso || '');
    const y = Number(m[1]);
    return (y !== baseYear ? y + '년 ' : '') + Number(m[2]) + '월 ' + Number(m[3]) + '일';
  }
  const rng = (f, t) => (f === todayIso ? '지금' : softDay(f)) + '~' + softDay(t);
  spans.sort((x, y) => x.from.localeCompare(y.from));
  const clusters = [];
  spans.forEach((sp) => {
    const c = clusters[clusters.length - 1];
    if (c && sp.from <= c.to) {
      c.items.push(sp);
      if (sp.to > c.to) c.to = sp.to;
      c.open = c.open || sp.open;
    } else {
      clusters.push({ from: sp.from, to: sp.to, open: sp.open, items: [sp] });
    }
  });
  const dated = clusters.map((c) => {
    const kinds = [];
    c.items.forEach((it) => { if (kinds.indexOf(it.kind) === -1) kinds.push(it.kind); });
    const head = c.open
      ? (c.from === todayIso ? '지금부터 당분간은' : softDay(c.from) + '부터 당분간은')
      : rng(c.from, c.to) + '은';
    kinds.sort((x, y) => (x === 'strain' ? 0 : 1) - (y === 'strain' ? 0 : 1));
    let text = head + ' ' + kinds.map((k, i) => (i === 0 ? SENT[k] : SENT_ALSO[k])).join(' ');
    // 가장 많이 겹치는 구간
    if (c.items.length >= 2) {
      let best = 0;
      let bFrom = null;
      let bTo = null;
      let curFrom = null;
      samples.forEach((smp, i) => {
        const d = day(smp.t);
        const n = c.items.filter((it) => it.from <= d && d <= it.to).length;
        if (n > best) { best = n; bFrom = d; bTo = d; curFrom = d; }
        else if (n === best && n > 0 && curFrom && bTo === day(samples[i - 1].t) && bFrom === curFrom) { bTo = d; }
        else if (n < best) curFrom = null;
      });
      if (best >= 2 && bFrom && !(bFrom === c.from && bTo === c.to)) {
        text += ' 특히 ' + rng(bFrom, bTo) + '은 이런 흐름이 겹쳐 가장 조심할 때예요.';
      }
    }
    return {
      text,
      tech: c.items.map((it) => it.tech + ' (' + rng(it.from, it.to) + ')').join(' / '),
      from: c.from,
      to: c.to,
    };
  });
  const insertAt = out.caution.length && /엇갈려/.test(out.caution[0].text) ? 1 : 0;
  out.caution.splice.apply(out.caution, [insertAt, 0].concat(dated));

  // 신호가 많이 겹쳐도 한쪽으로 과하게 쏠리지 않도록 상한을 둠 (점수·delta는 API/화면 표로 노출하지 않음)
  out.delta = Math.max(-2.0, out.neg) + Math.min(1.0, out.pos);
  delete out.neg;
  delete out.pos;
  return out;
}

/** 오늘·내일·이번 주처럼 짧은 시점을 물은 질문인지 */
function detectNearTerm(question, askedAtMs) {
  const q = String(question || '');
  // 「10월에」처럼 이번 달·다음 달을 숫자로 물은 경우도 가까운 시점 (한국 시간 기준)
  const at = Number(askedAtMs) || Date.now();
  const kst = new Date(at + 9 * 3600000);
  const thisM = kst.getUTCMonth() + 1;
  const nextM = (thisM % 12) + 1;
  const monthRe = /(^|[^0-9])(1[0-2]|[1-9])\s*월(?!\s*\d)/g;
  let mm;
  let monthNear = false;
  while ((mm = monthRe.exec(q))) {
    const n = Number(mm[2]);
    if (n === thisM || n === nextM) monthNear = true;
  }
  if (/오늘|금일|당일|지금\s*당장|바로\s*오늘/.test(q)) return 'today';
  if (/내일|모레|이틀|이번\s*주|금주|주말|며칠\s*안|곧|당장/.test(q)) return 'near';
  // 이번 달·다음 달·「25일」처럼 날짜를 콕 집은 질문도 가까운 시점(약 2개월 안)으로 봄
  if (/이번\s*달|이달|금월|다음\s*달|내달|(^|[^0-9])([1-9]|[12][0-9]|3[01])\s*일\s*(이|에|은|까지|날|안|전|쯤|경|$)/.test(q) || monthNear) return 'near';
  return null;
}

function toneFromScore(score, nearTerm) {
  let tone;
  let conclusion;
  let toneLabel;
  if (score >= 3.2) {
    tone = 'favorable';
    conclusion = '가능성이 높은 편이에요';
    toneLabel = '가능성 높음';
  } else if (score >= 0.8) {
    tone = 'mixed';
    conclusion = '가능성은 있으나 시간이 필요해 보여요';
    toneLabel = '시간이 필요';
  } else if (score >= -1.5) {
    tone = 'delayed';
    conclusion = '지금은 기다림·조율이 필요한 흐름이에요';
    toneLabel = '조율이 필요';
  } else {
    tone = 'difficult';
    conclusion = '당장은 어렵거나 조건이 더 필요해 보여요';
    toneLabel = '지금은 어려움';
  }

  // 단기 질문이면 “시간이 필요”처럼 어긋난 문장을 시점 기준으로 바꿈
  if (nearTerm === 'today') {
    if (tone === 'favorable') {
      conclusion = '오늘만 놓고 보면 흐름이 비교적 열려 보여요';
      toneLabel = '오늘 흐름 열림';
    } else if (tone === 'mixed') {
      conclusion = '오늘만 놓고 보면 신호가 또렷하지 않아요';
      toneLabel = '오늘 신호 약함';
    } else if (tone === 'delayed') {
      conclusion = '오늘만 놓고 보면 조율이 더 필요해 보여요';
      toneLabel = '오늘 조율 필요';
    } else {
      conclusion = '오늘만 놓고 보면 조건이 더 필요해 보여요';
      toneLabel = '오늘 여건 부족';
    }
  } else if (nearTerm === 'near') {
    if (tone === 'favorable') {
      conclusion = '가까운 시기만 놓고 보면 가능성이 있는 편이에요';
      toneLabel = '가까운 시점 가능';
    } else if (tone === 'mixed') {
      conclusion = '가까운 시점만 놓고 보면 신호가 또렷하지 않아요';
      toneLabel = '가까운 시점 약함';
    } else if (tone === 'delayed') {
      conclusion = '가까운 시점보다는 조율이 더 필요해 보여요';
      toneLabel = '가까운 시점 조율';
    } else {
      conclusion = '가까운 시점만 놓고 보면 조건이 더 필요해 보여요';
      toneLabel = '가까운 시점 어려움';
    }
  }

  return { tone, conclusion, toneLabel };
}

function buildChartAtCivil(civil, lat, lng, buildOpts) {
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
  return VedicCore.build(horoscope, { y: civil.y, mo: civil.mo, da: civil.da }, buildOpts || {});
}

function buildPrashnaChart(askedAt, lat, lng, timeZone) {
  const civil = utcToCivilInTz(askedAt, timeZone);
  const data = buildChartAtCivil(civil, lat, lng);
  return { data, civil };
}

/** 출생 일시(현지 시각) + 출생지 → 네이탈 차트 */
function buildNatalChart(civil, lat, lng) {
  const c = {
    y: Number(civil.y),
    mo: Number(civil.mo),
    da: Number(civil.da),
    hh: Number(civil.hh),
    mi: Number(civil.mi),
  };
  if (
    !Number.isFinite(c.y) ||
    !Number.isFinite(c.mo) ||
    !Number.isFinite(c.da) ||
    !Number.isFinite(c.hh) ||
    !Number.isFinite(c.mi)
  ) {
    throw new Error('bad_birth_civil');
  }
  // 출생 달은 ΔT(지구시−세계시)만큼 뒤 시각으로 다시 구해 정확히 맞춤 (다샤 날짜가 조티쉬 앱과 일치하도록)
  let moonTrop;
  try {
    const dtSec = VedicCore.deltaTSeconds(c.y, c.mo);
    const w = new Date(Date.UTC(c.y, c.mo - 1, c.da, c.hh, c.mi, 0) + Math.round(dtSec * 1000));
    const o2 = new Origin({
      year: w.getUTCFullYear(),
      month: w.getUTCMonth(),
      date: w.getUTCDate(),
      hour: w.getUTCHours(),
      minute: w.getUTCMinutes(),
      second: w.getUTCSeconds(),
      latitude: lat,
      longitude: lng,
    });
    const h2 = new Horoscope({
      origin: o2,
      houseSystem: 'placidus',
      zodiac: 'tropical',
      aspectPoints: ['bodies'],
      aspectWithPoints: ['bodies'],
      aspectTypes: ['major'],
      language: 'en',
    });
    moonTrop = h2.CelestialBodies.moon.ChartPosition.Ecliptic.DecimalDegrees;
  } catch (e) {
    moonTrop = undefined;
  }
  const data = buildChartAtCivil(c, lat, lng, { moonTrop });
  return { data, civil: c };
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
 * opts.natal: 출생 차트 기준 표기
 */
function buildTimingCandidates(data, category, askedAtMs, lat, lng, timeZone, opts) {
  opts = opts || {};
  const lagnaBaseKo = opts.natal ? '출생 차트' : '질문 차트';
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
  // 1일 간격 — 사인 입궁·역행 종료 등 경계일을 표준력과 맞춤 (예전 4일이면 ±1~2일 오차)
  const step = 1;
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

  // 같은 행성·같은 기간이면 기준(출생 차트/마음)·동작(머묾/바라봄)이 달라도 한 줄로 합침 (중복 표시 방지)
  const samePeriod = {};
  Object.keys(merged).forEach((k) => {
    const m = merged[k];
    m.houses.sort((x, y) => x - y);
    const pk = [m.planet, m.start, m.end].join('|');
    if (!samePeriod[pk]) samePeriod[pk] = { planet: m.planet, start: m.start, end: m.end, parts: [] };
    samePeriod[pk].parts.push(m);
  });

  const transitAll = Object.keys(samePeriod).map((pk) => {
    const g = samePeriod[pk];
    const ongoing = g.start === todayIso;
    const pName = VedicCore.GRAHA_KO[g.planet];
    // 기준(마음·출생 차트)별로 묶어 「…에 머물며 …를 바라보고」 한 구절로
    const byBase = {};
    g.parts.forEach((m) => {
      if (!byBase[m.base]) byBase[m.base] = { enter: [], aspect: [] };
      m.houses.forEach((h) => {
        const arr = byBase[m.base][m.kind === 'enter' ? 'enter' : 'aspect'];
        if (arr.indexOf(h) === -1) arr.push(h);
      });
    });
    const bases = ['moon', 'lagna'].filter((b) => byBase[b]);
    const phrases = bases.map((b, i) => {
      const last = i === bases.length - 1;
      const e = byBase[b].enter.sort((x, y) => x - y);
      const a = byBase[b].aspect.filter((h) => e.indexOf(h) === -1).sort((x, y) => x - y);
      const baseKo = b === 'lagna' ? lagnaBaseKo : '마음(달)';
      let p = baseKo + ' 기준 ';
      if (e.length && a.length) p += housesSoft(e) + '에 머물며 ' + housesSoft(a) + (last ? '를 바라봐요' : '를 바라보고');
      else if (e.length) p += housesSoft(e) + (last ? '에 머물러요' : '에 머물고');
      else p += housesSoft(a) + (last ? '를 바라봐요' : '를 바라보고');
      return p;
    });
    const text = pName + josaIGa(pName) + ' ' + phrases.join(', ') + '.' + (ongoing ? ' (지금 진행 중)' : '');
    const lenDays = (Date.parse(g.end) - Date.parse(g.start)) / DAYMS;
    return {
      group: g.planet,
      start: g.start,
      end: g.end,
      ongoing,
      lenDays,
      reason_code: g.parts
        .map((m) =>
          (m.planet === 'jupiter' ? 'JUPITER' : 'SATURN') + '_' +
          (m.kind === 'enter' ? 'ENTER' : 'ASPECT') + '_' +
          (m.base === 'lagna' ? 'LAGNA' : 'MOON') + '_H' + m.houses.join('_'))
        .join('+'),
      reason_text: text,
    };
  });

  // 이미 진행 중이면서 90일 넘게 이어지는 흐름은 "언제"의 답이 아니라 배경 → 시기 후보에서 빼고 따로 돌려줌
  const transit = [];
  transitAll.forEach((c) => {
    if (c.ongoing && c.lenDays > 90) {
      if (Array.isArray(opts.backgroundOut)) {
        opts.backgroundOut.push({
          planet: c.group,
          start: c.start,
          end: c.end,
          reason_code: c.reason_code,
          reason_text: c.reason_text.replace(/\s*\(지금 진행 중\)/, ''),
        });
      }
    } else {
      transit.push(c);
    }
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
        const dig = g.dignity;
        // 약해지는 자리면 실제로 그 자리를 떠나는 날까지를 기간으로
        let endT = samples[i].t + 14 * DAYMS;
        if (dig === 'debilitated') {
          for (let j = i + 1; j < samples.length; j++) {
            const gj = samples[j].map[lordKey];
            if (gj && gj.rashi !== g.rashi) { endT = samples[j - 1].t; break; }
            if (j === samples.length - 1) endT = samples[j].t;
          }
        }
        lordEvents.push({
          group: 'lord',
          start: isoDay(samples[i].t),
          end: isoDay(endT),
          caution: dig === 'debilitated',
          reason_code: 'LORD_SIGN_CHANGE_' + lordKey.toUpperCase() + (dig === 'debilitated' ? '_DEBIL' : dig === 'exalted' ? '_EXALT' : ''),
          reason_text:
            '이 주제를 맡은 행성 ' + pName + josaIGa(pName) + ' ' + VedicCore.SIGNS[g.rashi].ko + '로 옮겨 가요' +
            (dig === 'debilitated'
              ? ' — 가장 약해지는 자리라 ' + topicStrain(category) + '.'
              : dig === 'exalted'
                ? ' — 가장 힘이 세지는 자리라 이 일에 힘이 붙어요.'
                : dig === 'own' || dig === 'moolatrikona'
                  ? ' — 자기 자리라 안정적으로 힘을 써요.'
                  : '.'),
        });
      }
      if (prevRetro === true && g.retro === false) {
        lordEvents.push({
          group: 'lord',
          start: isoDay(samples[i].t),
          end: isoDay(samples[i].t + 21 * DAYMS),
          reason_code: 'LORD_DIRECT_' + lordKey.toUpperCase(),
          reason_text: '이 주제를 맡은 행성 ' + pName + '의 역행이 끝나고 다시 앞으로 나아가요.',
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
      caution: !!c.caution,
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
  const block = isBlockedQuestion(question, { allowInvest: !!opts.allowInvest, allowAll: !!opts.allowAll });
  if (block.blocked) {
    return {
      ok: false,
      error: 'blocked_topic',
      message: '법적·의료·윤리적 문제가 생길 수 있는 질문(건강·질병, 생사, 소송·범죄, 도박, 몰래 알아보기)은 질문점으로 보지 않아요. 다른 질문으로 바꿔 주세요.',
    };
  }
  const scored = scoreChart(data, category, { mode: opts.mode });
  const nearTerm = detectNearTerm(question, opts.askedAtMs);
  let totalScore = scored.score;
  let evidence = scored.notes.slice();
  let dasha = null;
  let dashaRel = null;
  let cuspWarnings = [];

  if (opts.mode === 'natal') {
    cuspWarnings = natalCuspWarnings(data);
    const moon = (data.grahas || []).find((g) => g.key === 'moon');
    const birthMs = Number(opts.birthMs);
    const atMs = Number(opts.askedAtMs) || Date.now();
    if (moon && Number.isFinite(moon.sid) && Number.isFinite(birthMs)) {
      dasha = currentDashaAt(moon.sid, birthMs, atMs);
      if (dasha) {
        dashaRel = scoreDashaForTopic(data, category, dasha);
        totalScore += dashaRel.delta;
        if (dashaRel.note) evidence = [dashaRel.note].concat(evidence).slice(0, 7);
      }
    }
  }

  // 지금 하늘의 신호(받쳐 주는 것 / 주의할 것) — 출생 차트로 물을 때만
  let signals = null;
  if (opts.mode === 'natal' && Number.isFinite(Number(opts.lat)) && Number.isFinite(Number(opts.lng)) && opts.tz) {
    try {
      if (dasha) dasha.fit = dashaRel ? dashaRel.relevant : 'neutral';
      signals = natalTransitSignals(data, category, Number(opts.askedAtMs) || Date.now(), Number(opts.lat), Number(opts.lng), opts.tz, {
        nearTerm,
        dasha,
      });
      totalScore += signals.delta;
    } catch (e) {
      signals = null;
    }
  }

  const t = toneFromScore(totalScore, nearTerm);
  let conclusion = t.conclusion;
  let toneLabel = t.toneLabel;
  if (opts.mode === 'natal' && dasha) {
    const cautionCount = signals ? signals.caution.length : 0;
    conclusion = blendNatalConclusion(
      t.conclusion,
      dasha,
      dashaRel ? dashaRel.relevant : 'neutral',
      nearTerm,
      t.tone,
      cautionCount
    );
    // 주의 신호가 겹친 '중간' 판정은 꼬리표도 '빠듯함'으로
    if (t.tone === 'mixed' && cautionCount >= 2) {
      toneLabel = nearTerm === 'today' ? '오늘 빠듯함' : nearTerm === 'near' ? '가까운 시점 빠듯' : '빠듯하지만 가능';
    }
    // 결과 꼬리표는 전체 판정(tone)을 따름 — 운의 시기 맞닿음은 dasha.fit으로 따로 표시
    dasha.fit = dashaRel ? dashaRel.relevant : 'neutral';
  }

  return {
    ok: true,
    tone: t.tone,
    toneLabel: toneLabel,
    nearTerm: nearTerm || null,
    conclusion: conclusion,
    score: Math.round(totalScore * 10) / 10,
    natalScore: opts.mode === 'natal' ? Math.round(scored.score * 10) / 10 : null,
    dashaDelta:
      dashaRel && Number.isFinite(dashaRel.delta) ? Math.round(dashaRel.delta * 10) / 10 : null,
    evidence: evidence,
    dasha: dasha,
    signals: signals ? { good: signals.good, caution: signals.caution } : null,
    cuspWarnings: cuspWarnings,
    lagna: data.lagna
      ? {
          rashi: data.lagna.rashi,
          label: VedicCore.SIGNS[data.lagna.rashi].ko,
        }
      : null,
    houses: scored.houses,
    disclaimer:
      opts.mode === 'natal'
        ? '이 결과는 출생 차트·지금의 운의 시기·앞으로의 흐름으로 읽은 참고 해석이며, 특정 결과나 수익을 보장하지 않습니다.'
        : '이 결과는 질문 순간의 하늘을 전통 규칙으로 읽은 참고 해석이며, 특정 결과나 수익을 보장하지 않습니다.',
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
  grahaPhrase,
  CATEGORIES,
  DIGNITY_KO,
  HOUSE_MEANING,
  BLOCK_RULES,
  INVEST_NOTICE,
  catById,
  suggestCategory,
  GRAHA_SOFT,
  grahaSoft,
  dashaSoftLabel,
  dashaSoftEmbedded,
  isBlockedQuestion,
  dignityKo,
  houseSoft,
  housesSoft,
  filterTimingsNearTerm,
  detectNearTerm,
  civilToBirthMs,
  currentDashaAt,
  scoreDashaForTopic,
  natalCuspWarnings,
  natalTransitSignals,
  buildPrashnaChart,
  buildNatalChart,
  buildTimingCandidates,
  buildChartSnapshot,
  judge,
  slimChartJson,
  VedicCore,
};
