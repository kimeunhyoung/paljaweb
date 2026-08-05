/**
 * 상담사 허브 — 고객용 수비학 복사용 요약 (짧은 문장만)
 */
(function (global) {
  'use strict';

  const PY = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
    J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
    S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
  };
  const VOWELS = { A: 1, E: 1, I: 1, O: 1, U: 1 };
  const HC = {
    ㄱ: 1, ㄲ: 1, ㄴ: 2, ㄷ: 3, ㄸ: 3, ㄹ: 4, ㅁ: 5, ㅂ: 6, ㅃ: 6,
    ㅅ: 7, ㅆ: 7, ㅇ: 8, ㅈ: 9, ㅉ: 9, ㅊ: 1, ㅋ: 2, ㅌ: 3, ㅍ: 4, ㅎ: 5,
  };
  const HV = {
    ㅏ: 1, ㅑ: 2, ㅓ: 3, ㅕ: 4, ㅗ: 5, ㅛ: 6, ㅜ: 7, ㅠ: 8, ㅡ: 9, ㅣ: 1,
    ㅐ: 2, ㅒ: 3, ㅔ: 4, ㅖ: 5, ㅘ: 6, ㅙ: 7, ㅚ: 8, ㅝ: 9, ㅞ: 1, ㅟ: 2, ㅢ: 3,
  };
  const CHOS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const JUNGS = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const JONGS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  const LP = {
    1: '스스로 길을 열고 책임지는 흐름이 삶의 큰 축입니다.',
    2: '협력·조율·관계 안에서 길이 열리는 타입입니다.',
    3: '표현·소통·창조가 삶의 중심선을 이끕니다.',
    4: '기반·약속·꾸준함이 인생의 나침반입니다.',
    5: '변화와 경험의 폭을 넓히며 적응하는 길이 이어집니다.',
    6: '돌봄과 책임의 무게를 사랑으로 완성해 가는 흐름입니다.',
    7: '본질을 파고드는 탐구와 고요가 길을 밝힙니다.',
    8: '현실에서 결과를 만들고 다스리는 축을 따라 성숙합니다.',
    9: '통합과 베풂으로 더 큰 가치를 향해 나아갑니다.',
    11: '영감과 직관의 길을 믿고 사람들에게 불을 전합니다.',
    22: '큰 그림을 실제 시스템으로 옮기는 길이 삶을 관통합니다.',
    33: '사랑과 가르침으로 치유하는 길이 깊어집니다.',
  };
  const DESTINY = {
    1: '이름이 가리키는 역할은 선두에서 길을 여는 일에 가깝습니다.',
    2: '잇고 조율하며 관계를 완성하는 일에서 빛이 납니다.',
    3: '말·글·창작으로 메시지를 심는 길이 본론입니다.',
    4: '기반과 시스템을 다지는 실행으로 완성됩니다.',
    5: '변화를 읽고 연결·확장하는 일에서 과제가 풀립니다.',
    6: '돌봄과 조화로운 환경을 만드는 일이 본분에 가깝습니다.',
    7: '탐구하고 가르치며 본질을 전하는 길입니다.',
    8: '자원과 목표를 움직여 결과를 내는 역할이 핵심입니다.',
    9: '경험을 통합하고 나눔으로 남기는 삶이 과제입니다.',
    11: '영감과 통찰로 의식을 일깨우는 일로 실현됩니다.',
    22: '큰 설계를 땅 위의 구조로 세우는 일이 숙명에 가깝습니다.',
    33: '가르침과 치유로 공동체를 든든히 하는 길입니다.',
  };
  const SOUL = {
    1: '속으로는 내 선택과 길이 존중받기를 바랍니다.',
    2: '마음이 닿는 관계와 평화를 깊이 갈망합니다.',
    3: '표현하고 즐거움을 나누는 기쁨이 그리운 편입니다.',
    4: '흔들리지 않는 질서와 소속이 필요합니다.',
    5: '자유와 새로운 가능성에 목말라 있습니다.',
    6: '사랑받으며 의미 있게 돌보는 삶을 원합니다.',
    7: '본질과 진리, 고요한 이해를 향해 끌립니다.',
    8: '존중과 영향력, 결과로 증명되길 바랍니다.',
    9: '더 큰 사랑과 이상에 손을 뻗고 싶어 합니다.',
    11: '영감과 신비로운 연결을 깊이 갈망합니다.',
    22: '세상에 남는 의미 있는 흔적을 남기고 싶어 합니다.',
    33: '조건 없는 사랑과 치유로 마음이 채워지길 바랍니다.',
  };
  const PERSONALITY = {
    1: '겉으로는 주도적이고 단호한 인상으로 읽히기 쉽습니다.',
    2: '겉으로는 부드럽고 맞춰 주는 사람으로 보이기 쉽습니다.',
    3: '겉으로는 밝고 말이 통하는 인상으로 다가갑니다.',
    4: '겉으로는 믿을 수 있고 성실한 인상으로 읽힙니다.',
    5: '겉으로는 자유롭고 변화무쌍한 인상으로 보입니다.',
    6: '겉으로는 따뜻하고 챙기는 사람으로 느껴집니다.',
    7: '겉으로는 차분하고 거리감 있는 인상으로 읽힐 수 있습니다.',
    8: '겉으로는 능력 있고 무게감 있는 인상으로 다가갑니다.',
    9: '겉으로는 포용력 있고 여유 있는 사람으로 보입니다.',
    11: '겉으로는 예민하고 영감 있는 인상으로 읽히기 쉽습니다.',
    22: '겉으로는 큰일을 맡을 사람처럼 보이는 편입니다.',
    33: '겉으로는 따뜻하고 헌신적인 인상으로 다가갑니다.',
  };
  const YEAR = {
    1: '새 출발·결단의 해. 미뤄 둔 계획을 실행에 옮기기 좋습니다.',
    2: '인내와 협력의 해. 혼자 튀기보다 관계에서 답이 옵니다.',
    3: '표현과 확장의 해. 창의·소통이 잘 통합니다.',
    4: '내실 다지기의 해. 기초와 루틴이 자산이 됩니다.',
    5: '도전과 변화의 해. 유연하게 새 에너지를 받아들이세요.',
    6: '사랑과 책임의 해. 가까운 사람을 살피기 좋습니다.',
    7: '성찰과 휴식의 해. 내면 공부·정리가 필요합니다.',
    8: '보상과 성취의 해. 실행력으로 결과를 챙기세요.',
    9: '마무리와 비움의 해. 집착을 정리하고 다음을 준비하세요.',
    11: '직관과 영감의 해. 내면의 목소리에 귀 기울이세요.',
    22: '큰 설계의 해. 개인을 넘는 비전을 세워 보세요.',
    33: '나눔과 치유의 해. 돌보되 스스로 지치지 않게 경계를 두세요.',
  };
  const MONTH = {
    1: '이번 달은 시작·결단이 잘 먹힙니다.',
    2: '이번 달은 협력·기다림이 포인트입니다.',
    3: '이번 달은 표현·확장이 잘 통합니다.',
    4: '이번 달은 안정·내실이 우선입니다.',
    5: '이번 달은 변화·이동의 물결이 있습니다.',
    6: '이번 달은 돌봄·책임이 중심에 옵니다.',
    7: '이번 달은 성찰·정리가 필요합니다.',
    8: '이번 달은 성취·실행이 잘 맞습니다.',
    9: '이번 달은 마무리·비움이 과제입니다.',
    11: '이번 달은 직관·영감이 예리해질 수 있습니다.',
    22: '이번 달은 큰 그림·설계가 중요합니다.',
    33: '이번 달은 돌봄·나눔의 온도가 올라갑니다.',
  };
  const TITLE = {
    1: '자립·개척', 2: '협력·조화', 3: '표현·창조', 4: '안정·내실',
    5: '변화·탐험', 6: '책임·사랑', 7: '성찰·지혜', 8: '성취·권위',
    9: '완성·자비', 11: '직관·영감', 22: '원대한 건설', 33: '치유·봉사',
  };

  function reduce(n, allowM) {
    if (allowM === undefined) allowM = true;
    let r = Number(n) || 0;
    while (r > 9) {
      if (allowM && (r === 11 || r === 22 || r === 33)) return r;
      r = String(r).split('').reduce((a, b) => a + Number(b), 0);
    }
    return r;
  }

  function decomposeChar(ch) {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) return null;
    return {
      cho: CHOS[Math.floor(c / (21 * 28))],
      jung: JUNGS[Math.floor((c % (21 * 28)) / 28)],
      jong: JONGS[c % 28] || '',
    };
  }

  function calcName(name) {
    const s = String(name || '').replace(/\s/g, '');
    if (!s) return null;
    let cv = 0;
    let vv = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (/\d/.test(ch)) {
        const digit = Number(ch);
        if (digit > 0) cv += digit;
        continue;
      }
      const d = decomposeChar(ch);
      if (d) {
        cv += HC[d.cho] || 0;
        if (d.jong) {
          for (let j = 0; j < d.jong.length; j++) cv += HC[d.jong[j]] || 0;
        }
        vv += HV[d.jung] || 0;
        continue;
      }
      if (HC[ch] || HV[ch]) {
        cv += HC[ch] || 0;
        vv += HV[ch] || 0;
        continue;
      }
      const up = ch.toUpperCase();
      if (PY[up]) {
        if (VOWELS[up]) vv += PY[up];
        else cv += PY[up];
      }
    }
    if (!cv && !vv) return null;
    const total = cv + vv;
    return {
      destiny: reduce(total),
      soul: reduce(vv),
      personality: reduce(cv),
    };
  }

  function parseBirth(birthDate) {
    const m = String(birthDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  }

  function calcLifePath(y, m, d) {
    const yr = reduce(String(y).split('').reduce((a, b) => a + Number(b), 0));
    const mr = reduce(m);
    const dr = reduce(d);
    const pre = yr + mr + dr;
    return { pre, val: reduce(pre), mr, dr };
  }

  function calcPersonalYear(year, mr, dr) {
    const yr = reduce(String(year).split('').reduce((a, b) => a + Number(b), 0));
    const pre = yr + mr + dr;
    return { pre, val: reduce(pre) };
  }

  function todayKstParts() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
    return { y: get('year'), m: get('month'), d: get('day') };
  }

  function line(label, num, blurb) {
    const title = TITLE[num] ? ' (' + TITLE[num] + ')' : '';
    return '■ ' + label + ' ' + num + '번' + title + '\n' + blurb;
  }

  /**
   * @param {{ display_name?: string, legal_name?: string, birth_date?: string }} client
   * @returns {{ ok: boolean, error?: string, text?: string, title?: string }}
   */
  function build(client) {
    const birth = parseBirth(client && client.birth_date);
    if (!birth) {
      return { ok: false, error: '생년월일이 없어 요약을 만들 수 없습니다.' };
    }
    const nameLabel = (client.display_name || client.legal_name || '고객').trim();
    const legal = (client.legal_name || '').trim();
    const lp = calcLifePath(birth.y, birth.m, birth.d);
    const now = todayKstParts();
    const py = calcPersonalYear(now.y, lp.mr, lp.dr);
    const pm = reduce(py.val + now.m);
    const nameNums = calcName(legal || '');

    const blocks = [];
    blocks.push(nameLabel + ' · ' + String(client.birth_date).slice(0, 10));
    blocks.push('(상담사용 짧은 요약 · 필요 시 다듬어 사용)');
    blocks.push('');
    blocks.push(line('인생여정수', lp.val, LP[lp.val] || ''));
    if (nameNums) {
      blocks.push('');
      blocks.push('· 본명 기준');
      blocks.push(line('운명수', nameNums.destiny, DESTINY[nameNums.destiny] || ''));
      blocks.push('');
      blocks.push(line('혼의수', nameNums.soul, SOUL[nameNums.soul] || ''));
      blocks.push('');
      blocks.push(line('성격수', nameNums.personality, PERSONALITY[nameNums.personality] || ''));
    } else {
      blocks.push('');
      blocks.push('· 본명이 없어 운명·혼·성격수는 생략했습니다. (고객 카드에 본명을 넣으면 포함됩니다)');
    }
    blocks.push('');
    blocks.push(line(now.y + '년 올해의 수', py.val, YEAR[py.val] || ''));
    blocks.push('');
    blocks.push(line(now.m + '월 이번 달의 수', pm, MONTH[pm] || ''));
    blocks.push('');
    blocks.push('— 팔자연구소 상담사 허브');

    return {
      ok: true,
      title: nameLabel + ' 수비학 요약',
      text: blocks.join('\n'),
    };
  }

  /** 세션 중 요약용 — 인생여정·올해·이번 달만 */
  function buildBrief(client) {
    const birth = parseBirth(client && client.birth_date);
    if (!birth) {
      return { ok: false, error: '생년월일이 없어 요약을 만들 수 없습니다.' };
    }
    const nameLabel = (client.display_name || client.legal_name || '고객').trim();
    const lp = calcLifePath(birth.y, birth.m, birth.d);
    const now = todayKstParts();
    const py = calcPersonalYear(now.y, lp.mr, lp.dr);
    const pm = reduce(py.val + now.m);
    return {
      ok: true,
      name: nameLabel,
      birth: String(client.birth_date).slice(0, 10),
      chips: [
        { label: '인생여정', num: lp.val, title: TITLE[lp.val] || '', blurb: LP[lp.val] || '' },
        { label: '올해', num: py.val, title: TITLE[py.val] || '', blurb: YEAR[py.val] || '' },
        { label: '이번 달', num: pm, title: TITLE[pm] || '', blurb: MONTH[pm] || '' },
      ],
    };
  }

  /** 트로피컬 태양 별자리 (일 경계 근사 — 요약·프롬프트용) */
  const SUN_SIGNS = [
    { key: 'capricorn', ko: '염소자리', from: [12, 22], to: [1, 19], element: '흙' },
    { key: 'aquarius', ko: '물병자리', from: [1, 20], to: [2, 18], element: '바람' },
    { key: 'pisces', ko: '물고기자리', from: [2, 19], to: [3, 20], element: '물' },
    { key: 'aries', ko: '양자리', from: [3, 21], to: [4, 19], element: '불' },
    { key: 'taurus', ko: '황소자리', from: [4, 20], to: [5, 20], element: '흙' },
    { key: 'gemini', ko: '쌍둥이자리', from: [5, 21], to: [6, 20], element: '바람' },
    { key: 'cancer', ko: '게자리', from: [6, 21], to: [7, 22], element: '물' },
    { key: 'leo', ko: '사자자리', from: [7, 23], to: [8, 22], element: '불' },
    { key: 'virgo', ko: '처녀자리', from: [8, 23], to: [9, 22], element: '흙' },
    { key: 'libra', ko: '천칭자리', from: [9, 23], to: [10, 22], element: '바람' },
    { key: 'scorpio', ko: '전갈자리', from: [10, 23], to: [11, 21], element: '물' },
    { key: 'sagittarius', ko: '사수자리', from: [11, 22], to: [12, 21], element: '불' },
  ];

  const SUN_BLURB = {
    aries: '스스로 길을 내며 앞장설 때 가장 생생합니다. 도전과 새 시작이 정체성의 핵심입니다.',
    taurus: '안정·감각·꾸준함 속에서 자기다움을 느낍니다. 천천히 단단히 쌓는 타입입니다.',
    gemini: '배우고 말하고 연결할 때 살아납니다. 호기심과 재치가 중심입니다.',
    cancer: '돌보고 소속될 때 존재를 확인합니다. 감정·안전·가족이 핵심 테마입니다.',
    leo: '표현하고 빛날 때 가장 나다워집니다. 창조와 따뜻한 자부심이 중심입니다.',
    virgo: '다듬고 도움이 될 때 의미를 느낍니다. 분석·성실이 정체성의 축입니다.',
    libra: '관계와 균형 속에서 자기를 발견합니다. 조화·공정함이 핵심입니다.',
    scorpio: '깊이 몰입하고 변형될 때 살아납니다. 본질·재생이 중심입니다.',
    sagittarius: '의미를 찾아 확장할 때 가장 자유롭습니다. 모험·신념·큰 그림이 핵심입니다.',
    capricorn: '목표를 향해 쌓아 올릴 때 자기를 증명합니다. 책임·성취가 중심입니다.',
    aquarius: '다르게 보고 미래를 그릴 때 살아납니다. 독창성·자유가 핵심입니다.',
    pisces: '느끼고 상상하고 연민할 때 가장 나다워집니다. 직관·공감이 중심입니다.',
  };

  function mdKey(m, d) {
    return m * 100 + d;
  }

  function sunSignFromBirth(y, m, d) {
    const key = mdKey(m, d);
    for (let i = 0; i < SUN_SIGNS.length; i++) {
      const s = SUN_SIGNS[i];
      const a = mdKey(s.from[0], s.from[1]);
      const b = mdKey(s.to[0], s.to[1]);
      if (a <= b) {
        if (key >= a && key <= b) return s;
      } else if (key >= a || key <= b) {
        return s; // 염소자리처럼 연말~연초
      }
    }
    return SUN_SIGNS[0];
  }

  function normalizeTimeHm(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return '';
    return String(m[1]).padStart(2, '0') + ':' + m[2];
  }

  /** 세션 중 요약용 — 태양 별자리(+시간·출생지 메타) */
  function buildAstroBrief(client) {
    const birth = parseBirth(client && client.birth_date);
    if (!birth) {
      return { ok: false, error: '생년월일이 없어 점성학 요약을 만들 수 없습니다.' };
    }
    const nameLabel = (client.display_name || client.legal_name || '고객').trim();
    const sign = sunSignFromBirth(birth.y, birth.m, birth.d);
    const time = normalizeTimeHm(client && client.birth_time);
    const city = String((client && client.birth_city) || '').trim();
    const chips = [
      { label: '태양', num: sign.ko, title: sign.element + ' 원소', blurb: SUN_BLURB[sign.key] || '' },
    ];
    if (time) {
      chips.push({
        label: '출생시간',
        num: time,
        title: '달·상승궁',
        blurb: '시간이 있어 달·상승궁까지 차트에서 확인할 수 있습니다.',
      });
    } else {
      chips.push({
        label: '출생시간',
        num: '미상',
        title: '요약 제한',
        blurb: '정확한 달·상승궁은 시간이 필요합니다. 점성학 차트에서 보완하세요.',
      });
    }
    if (city) {
      chips.push({
        label: '출생지',
        num: city,
        title: '하우스·상승',
        blurb: '출생지가 있어 하우스·상승궁 계산에 쓸 수 있습니다.',
      });
    }
    const tip = time && city
      ? '태양 기준 요약입니다. 달·상승·하우스는 점성학 차트에서 이어서 보세요.'
      : '태양 별자리만 요약으로 제공합니다. 달·상승궁은 점성학 차트(시간·출생지)에서 확인하세요.';
    return {
      ok: true,
      name: nameLabel,
      birth: String(client.birth_date).slice(0, 10),
      sunKey: sign.key,
      sunKo: sign.ko,
      sunElement: sign.element,
      sunBlurb: SUN_BLURB[sign.key] || '',
      time: time || '',
      city: city || '',
      chips: chips,
      tip: tip,
    };
  }

  global.PaljaCounselorCopySummary = { build, buildBrief, buildAstroBrief };
})(typeof window !== 'undefined' ? window : globalThis);
