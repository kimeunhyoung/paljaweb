/**
 * 재물 매트릭스 · 인생여정수 영역표 · 개인년 직업/금전/애정/건강
 * (수업 노트 5-4 · 5-6 · 5-7 기반. 투자·의료 조언 아님)
 */
(function (root) {
  'use strict';

  function toSingleDigit(n) {
    var v = Number(n) || 0;
    if (v === 11) return 2;
    if (v === 22) return 4;
    if (v === 33) return 6;
    while (v > 9) {
      v = String(v)
        .split('')
        .reduce(function (a, b) {
          return a + Number(b);
        }, 0);
    }
    return v;
  }

  var WEALTH = {
    1: { quadrant: '하이 리스크 · 하이 리턴', axis: '변동 · 독립', style: '자수성가 / 단독 개척', tip: '동업보다 자기 능력에 투자하는 흐름이 맞기 쉽습니다. 리스크 관리가 핵심입니다.' },
    2: { quadrant: '관계 · 가치 기반', axis: '변동 · 협력', style: '파트너십 / 협력적 축적', tip: '함께 쌓는 재물이 잘 맞습니다. 감정적 충동 소비는 경계하세요.' },
    3: { quadrant: '실력 · IP 기반', axis: '안정 · 독립', style: '재능의 상품화', tip: '아이디어·표현을 상품으로 바꾸는 길이 열립니다. 투기는 피하세요.' },
    4: { quadrant: '시스템 · 저축 기반', axis: '안정 · 협력', style: '느리지만 확실한 저축 / 부동산', tip: '성급한 투자보다 꾸준한 축적이 맞습니다.' },
    5: { quadrant: '하이 리스크 · 하이 리턴', axis: '변동 · 독립', style: '기회 포착 / 프리랜서', tip: '수입 변동성이 큽니다. 비상금을 먼저 마련하세요.' },
    6: { quadrant: '시스템 · 저축 기반', axis: '안정 · 협력', style: '안정적 자산가', tip: '가정·돌봄과 연결된 자산이 잘 맞습니다. 타인을 위한 희생적 소비는 조절하세요.' },
    7: { quadrant: '실력 · IP 기반', axis: '안정 · 독립', style: '전문 지식 수익화', tip: '깊이 판 지식을 수익으로 바꾸는 길입니다. 재정은 전문가 조력이 도움이 됩니다.' },
    8: { quadrant: '하이 리스크 · 하이 리턴', axis: '변동 · 독립', style: '대규모 사업 / 강한 금전 감각', tip: '자원·조직을 다루는 규모가 잘 맞습니다. 탐욕 경계와 윤리적 운용이 나침반입니다.' },
    9: { quadrant: '관계 · 가치 기반', axis: '변동 · 협력', style: '공공선 / 자립 균형', tip: '베풂과 자립의 균형이 중요합니다. 지나친 관대함은 조절하세요.' }
  };

  var LIFE_PATH = {
    1: {
      role: '리더 · 개척자',
      career: '창업, 정치, 발명 — 단독 프로젝트·리더 포지션',
      money: '자수성가형 (동업 주의, 자기 능력에 투자)',
      love: '주도적 연애 (자존심 충돌 주의)',
      health: '머리·긴장 완화, 명상·휴식 루틴',
      tip: '독립심은 강점이지만, 위임하고 협력할 줄 아는 리더가 오래갑니다.'
    },
    2: {
      role: '조화 · 협력자',
      career: '상담, 외교, 중재 — 팀워크·파트너십',
      money: '협력적 재물 축적 (충동 소비 경계, 저축)',
      love: '헌신적이고 깊은 사랑 (의존도·경계선)',
      health: '소화·신경계 — 감정 기복이 컨디션에 영향',
      tip: '배려가 넘치는 당신, 나를 먼저 채워야 남도 채울 수 있습니다.'
    },
    3: {
      role: '창의 · 표현자',
      career: '예술, 방송, 크리에이터 — 아이디어·언변',
      money: '빠른 현금 흐름 (재능 상품화, 투기 금물)',
      love: '인기·유머 (변덕 주의, 깊은 관계 유지)',
      health: '목·피부·과로 — 규칙적 리듬',
      tip: '재능이 많아 에너지가 분산되기 쉽습니다. 한 곳에 깊이 파고드세요.'
    },
    4: {
      role: '안정 · 실행자',
      career: '건축, 회계, 공무원 — 성실·꼼꼼한 기반',
      money: '느리지만 확실한 축적 (성급한 투자 금물)',
      love: '신뢰 중심 (일상적 애정 표현 연습)',
      health: '관절·척추 — 유연성 운동',
      tip: '완벽주의를 내려놓고 ‘충분히 좋다’를 받아들이는 유연함이 필요합니다.'
    },
    5: {
      role: '자유 · 변화자',
      career: '무역, IT, 프리랜서 — 변화·이동이 많은 환경',
      money: '기회 포착 (수입 변동, 비상금 필수)',
      love: '구속 거부·자유 연애 (자유와 헌신의 융합)',
      health: '호흡·신경계 — 불규칙 생활 경계',
      tip: '자유는 책임 위에서 빛납니다. 명확한 목표 위에서 자유롭게 움직이세요.'
    },
    6: {
      role: '책임 · 봉사자',
      career: '의료, 교육, 복지 — 돌봄·책임',
      money: '안정적 자산 (희생적 소비 조절)',
      love: '가정적·헌신적 (통제 성향 주의)',
      health: '심장·어깨 — 타인 돌보느라 몸 혹사 주의',
      tip: '모든 것을 혼자 짊어지지 마세요. 나를 먼저 돌봐야 봉사가 지속됩니다.'
    },
    7: {
      role: '탐구 · 지성인',
      career: '연구, 철학, 데이터 — 깊이 파고드는 환경',
      money: '전문 지식 수익화 (재정은 조력 권장)',
      love: '지적 교감 (신중함 + 감정 반응)',
      health: '면역·수면 — 과도한 고독 주의',
      tip: '지식은 힘이지만, 지혜는 나눔에서 완성됩니다.'
    },
    8: {
      role: '성취 · 권력자',
      career: 'CEO, 금융, 투자 — 자원·조직 규모',
      money: '강한 금전 감각 (탐욕 경계, 윤리적 운용)',
      love: '카리스마 (지배 성향 주의, 취약점 개방)',
      health: '심혈관·과로 — 강제 휴식',
      tip: '에너지가 강하게 작동합니다. 윤리적 기준이 최고의 나침반입니다.'
    },
    9: {
      role: '완성 · 인도주의자',
      career: 'NGO, 사회운동, 치료 — 공공선',
      money: '물질 집착 적음 (관대함과 자립의 균형)',
      love: '넓고 깊은 인류애 (현재 관계에 감사)',
      health: '전반 컨디션·감정 디톡스',
      tip: '베푸는 사랑은 더 크게 돌아옵니다. 스스로도 사랑받을 자격이 있습니다.'
    }
  };

  var PERSONAL_YEAR = {
    1: { phase: '파종과 발아', career: '창업 / 새 직장', money: '투자·사업 시작 검토', love: '새로운 만남', health: '새 건강 습관 시작' },
    2: { phase: '파종과 발아', career: '팀워크 / 협력', money: '꾸준한 저축', love: '관계 깊어짐', health: '휴식 · 신경계 돌보기' },
    3: { phase: '파종과 발아', career: '창의 / 홍보', money: '수입·지출 동반', love: '인기 · 매력 상승', health: '과로 주의 · 목·리듬' },
    4: { phase: '성장과 확장', career: '성실 / 인정', money: '안정 자산 · 부동산', love: '실질적 결합 · 약속', health: '관절 · 생활 리듬' },
    5: { phase: '성장과 확장', career: '이직 / 큰 변화', money: '변동성 · 비상금', love: '새바람 · 관계 흔들림', health: '호흡 · 불규칙 생활 경계' },
    6: { phase: '성장과 확장', career: '리더 / 돌봄', money: '가정 · 부동산', love: '가족 행사 · 책임', health: '스트레스 · 심장 쪽 돌봄' },
    7: { phase: '수확과 비움', career: '연구 / 전문성', money: '모험 자제 · 신중', love: '혼자만의 시간', health: '면역 · 수면 질' },
    8: { phase: '수확과 비움', career: '승진 / 사업 확장', money: '강한 금전운 · 투자', love: '바빠서 소홀해지기 쉬움', health: '과로 · 심혈관 돌봄' },
    9: { phase: '수확과 비움', career: '프로젝트 완결', money: '지출 · 기부 선순환', love: '관계 정리 · 용서', health: '디톡스 · 감정 해소' }
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getWealth(lp) {
    var k = toSingleDigit(lp);
    return WEALTH[k] ? Object.assign({ n: k }, WEALTH[k]) : null;
  }

  function getLifePathDomains(lp) {
    var k = toSingleDigit(lp);
    return LIFE_PATH[k] ? Object.assign({ n: k }, LIFE_PATH[k]) : null;
  }

  function getPersonalYearDomains(py) {
    var k = toSingleDigit(py);
    return PERSONAL_YEAR[k] ? Object.assign({ n: k }, PERSONAL_YEAR[k]) : null;
  }

  function renderWealthMatrixHtml(lp, opts) {
    opts = opts || {};
    var w = getWealth(lp);
    var d = getLifePathDomains(lp);
    if (!w || !d) return '';
    var title = opts.title || '재물 매트릭스 · 인생여정수';
    var note = opts.note !== false;
    return (
      '<div class="life-tables wealth-matrix">' +
      '<div class="lt-head"><span class="lt-num">' +
      w.n +
      '</span><div><div class="lt-title">' +
      esc(title) +
      '</div><div class="lt-sub">' +
      esc(d.role) +
      '</div></div></div>' +
      '<div class="lt-quad">' +
      '<div class="lt-quad-label">' +
      esc(w.quadrant) +
      '</div>' +
      '<div class="lt-quad-axis">' +
      esc(w.axis) +
      '</div>' +
      '<div class="lt-quad-style">' +
      esc(w.style) +
      '</div>' +
      '<p class="lt-tip">' +
      esc(w.tip) +
      '</p>' +
      '</div>' +
      '<div class="lt-grid4">' +
      '<div class="lt-cell"><div class="lt-k">직업 성향</div><div class="lt-v">' +
      esc(d.career) +
      '</div></div>' +
      '<div class="lt-cell"><div class="lt-k">금전 성향</div><div class="lt-v">' +
      esc(d.money) +
      '</div></div>' +
      '<div class="lt-cell"><div class="lt-k">애정 성향</div><div class="lt-v">' +
      esc(d.love) +
      '</div></div>' +
      '<div class="lt-cell"><div class="lt-k">컨디션 포인트</div><div class="lt-v">' +
      esc(d.health) +
      '</div></div>' +
      '</div>' +
      '<p class="lt-advice">' +
      esc(d.tip) +
      '</p>' +
      (note
        ? '<p class="lt-disclaimer">성향 가이드이며 투자·의료 조언이 아닙니다.</p>'
        : '') +
      '</div>'
    );
  }

  function renderPersonalYearTableHtml(py, opts) {
    opts = opts || {};
    var p = getPersonalYearDomains(py);
    if (!p) return '';
    var yearLabel = opts.yearLabel ? esc(opts.yearLabel) + ' · ' : '';
    return (
      '<div class="life-tables py-domains">' +
      '<div class="lt-head"><span class="lt-num">' +
      p.n +
      '</span><div><div class="lt-title">' +
      yearLabel +
      '개인년 ' +
      p.n +
      ' · 네 영역</div><div class="lt-sub">' +
      esc(p.phase) +
      '</div></div></div>' +
      '<div class="lt-grid4">' +
      '<div class="lt-cell"><div class="lt-k">직업</div><div class="lt-v">' +
      esc(p.career) +
      '</div></div>' +
      '<div class="lt-cell"><div class="lt-k">금전</div><div class="lt-v">' +
      esc(p.money) +
      '</div></div>' +
      '<div class="lt-cell"><div class="lt-k">애정</div><div class="lt-v">' +
      esc(p.love) +
      '</div></div>' +
      '<div class="lt-cell"><div class="lt-k">컨디션</div><div class="lt-v">' +
      esc(p.health) +
      '</div></div>' +
      '</div>' +
      '<p class="lt-disclaimer">한 해의 테마 요약이며, 확정 예언·투자·의료 조언이 아닙니다.</p>' +
      '</div>'
    );
  }

  var api = {
    toSingleDigit: toSingleDigit,
    getWealth: getWealth,
    getLifePathDomains: getLifePathDomains,
    getPersonalYearDomains: getPersonalYearDomains,
    renderWealthMatrixHtml: renderWealthMatrixHtml,
    renderPersonalYearTableHtml: renderPersonalYearTableHtml,
    WEALTH: WEALTH,
    LIFE_PATH: LIFE_PATH,
    PERSONAL_YEAR: PERSONAL_YEAR
  };

  root.PaljaLifeTables = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
