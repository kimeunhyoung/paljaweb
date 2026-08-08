/**
 * 점성학 AI 프롬프트 — 서버 전용 (클라이언트로 내려보내지 않음)
 */

function str(v) {
  return String(v == null ? '' : v).trim();
}

function appendChartBlock(L, p) {
  if (!p) throw new Error('차트 데이터가 필요합니다.');

  const sun = str(p.sun);
  const moon = str(p.moon);
  if (!sun) throw new Error('태양 별자리가 필요합니다.');

  L.push('[출생 차트]');
  if (str(p.displayName)) L.push('이름: ' + str(p.displayName));
  if (p.unknownTime) {
    L.push('출생 시간: 미상 — 하우스·MC·상승궁 해석은 제한하고, 행성·별자리·어스펙트 위주로 해석하세요.');
  }
  L.push(
    '태양: ' +
      sun +
      (moon ? ' / 달: ' + moon : '') +
      (str(p.asc) ? ' / 상승궁: ' + str(p.asc) : ' / 상승궁: (출생시간 미상)'),
  );
  if (str(p.mc)) L.push('MC(중천): ' + str(p.mc));

  const cusps = Array.isArray(p.houseCusps) ? p.houseCusps : [];
  if (cusps.length && !p.unknownTime) {
    L.push('하우스 커스프(별자리):');
    cusps.forEach((row) => {
      if (!row || !row.house || !str(row.sign)) return;
      L.push(' - ' + row.house + '하우스: ' + str(row.sign));
    });
  }

  const planets = Array.isArray(p.planets) ? p.planets : [];
  if (planets.length) {
    L.push('행성 배치:');
    planets.forEach((row) => {
      if (!row || !str(row.ko) || !str(row.sign)) return;
      L.push(
        ' - ' +
          str(row.ko) +
          ': ' +
          str(row.sign) +
          (row.house ? ' / ' + row.house + '하우스' : '') +
          (row.retro ? ' (역행)' : ''),
      );
    });
  }

  const e = p.elements && typeof p.elements === 'object' ? p.elements : null;
  const m = p.modal && typeof p.modal === 'object' ? p.modal : null;
  if (e) {
    L.push(
      '원소 균형: 불 ' +
        (e['불'] ?? e.fire ?? 0) +
        ', 흙 ' +
        (e['흙'] ?? e.earth ?? 0) +
        ', 바람 ' +
        (e['바람'] ?? e.air ?? 0) +
        ', 물 ' +
        (e['물'] ?? e.water ?? 0),
    );
  }
  if (m) {
    L.push(
      '모달리티: 활동 ' +
        (m['활동'] ?? m.cardinal ?? 0) +
        ', 고정 ' +
        (m['고정'] ?? m.fixed ?? 0) +
        ', 변통 ' +
        (m['변통'] ?? m.mutable ?? 0),
    );
  }

  const aspects = Array.isArray(p.aspects)
    ? p.aspects.map((a) => str(a)).filter(Boolean)
    : [];
  if (aspects.length) {
    L.push('주요 어스펙트: ' + aspects.join(', '));
  }

  L.push('');
  L.push(
    '[데이터 규칙] 위 [출생 차트]에 있는 배치만 근거로 하세요. 없는 행성·하우스·어스펙트를 지어내지 마세요.',
  );
}

const COMMON_TONE =
  '단정적 예언·공포 조장·「평생 ~」식 단정은 금지. 의학·법률·투자 종목·수익률 단정 금지. 트랜짓·올해 운세는 포함하지 마세요. ' +
  '「무조건」「보장」「대박」 같은 선동·과장 문구 금지. 인신공격·모욕은 금지하되, 변명을 받아주지 않는 직설은 허용.';

const DIAG_STYLE =
  '[작성 원칙 — 최우선]\n' +
  '1) 전체는 **Part A(설계 오류 진단) → Part B(왜 이렇게 읽었나)** 순서.\n' +
  '2) **진단 우선:** 위로·자기계발 칼럼·일반 팁 금지. 「이렇게 하세요」보다 「왜 맨날 이 패턴으로 막히는지」원인을 먼저 짚으세요. ' +
  '조언은 3번 Action Plan / DO·DON\'T에만 짧게.\n' +
  '3) Part A: 불릿·짧은 문장. 「6하우스」「트라인」 등 전문 용어 날것 금지(일상어로). 이모지 남발·「박살/파괴」 과격 단어 남발 금지. ' +
  '냉철·직설·팩트. 누구에게나 통하는 조언(“잠 자라”“복습하라”)만 쓰지 말고, **이 차트에서만** 나오는 결함·고집을 말하세요.\n' +
  '4) Part B: Part A와 같은 결론의 차트 근거. 행성·별자리·하우스·어스펙트 OK + 쉬운 말. 섹션당 불릿 3~5개. 긴 보고서 금지.\n' +
  '5) [출생 차트]에 있는 배치만 근거. 없는 배치 지어내기 금지. 이름은 차트에 있으면 그대로, 없으면 「당신」.\n' +
  '6) Part A·B 모순·복붙 금지.';

function personLabel(p) {
  return str(p && p.displayName) || '당신';
}

function pushWhySection(L, bullets) {
  L.push('---');
  L.push('');
  L.push('## 왜 이렇게 읽었나 (차트 근거)');
  L.push('> 위 진단이 나온 이유를 투명하게 공개합니다. 전문 용어는 써도 되지만, 바로 쉬운 말로 풀으세요.');
  L.push('');
  (bullets || []).forEach((line) => L.push(line));
  L.push('');
}

function pushDiagClosing(L) {
  L.push(DIAG_STYLE);
  L.push('Part A 진단서와 Part B(왜 이렇게 읽었나)를 **모두** 채우고 중간에 끊지 마세요.');
}

function pushDiagPartA(L, name, domainLabel, focusLine, whyBullets) {
  L.push('[출력 포맷 — Part A]');
  L.push('## ' + name + '의 ‘' + domainLabel + ' 설계 오류’ 분석서');
  L.push('');
  L.push(
    '> **[핵심 진단]:** (이 차트가 만든 치명적 습관 + 그로 인한 결말을 한 줄. 일반 조언 문장 금지)',
  );
  L.push('');
  L.push('### 1. 당신의 설계도: 왜 이렇게 움직이는가?');
  L.push(
    '* (이 영역에서 남들과 다르게 고집하는 본질. 차트에서 나온 **작동 방식**을 직설로. 2~4줄 또는 불릿)',
  );
  L.push('');
  L.push('### 2. 치명적 함정: 반복해서 막히는 이유');
  L.push('* **구조적 원인:** (시도할 때마다 같은 이유로 막히는 패턴 — 일반론 금지)');
  L.push('* **DO:** (이 결함을 끊는 행동 1~2가지)');
  L.push('* **DON\'T:** (이 사람이 특히 하면 안 되는 행동 1~2가지)');
  L.push('');
  L.push('### 3. [긴급] 설계 수정 지침');
  L.push('* **버려야 할 고집/착각:** (이 차트에서 나온 것만 1~2개)');
  L.push('* **지금 당장 루틴:** (구체 행동 1~2개. 자기계발 상투어 금지)');
  L.push('');
  L.push('[도메인 초점] ' + focusLine);
  L.push('');
  pushWhySection(L, whyBullets);
  pushDiagClosing(L);
}

function buildAstroChartPrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');

  const L = [];
  L.push(
    '당신은 따뜻하고 통찰력 있는 전문 점성가입니다. 아래 출생 차트를 바탕으로 전문 용어는 쉽게 풀어 한국어로 해석해 주세요. ' +
      COMMON_TONE +
      ' 건강은 의학적 진단이 아닌 생활·에너지·스트레스 관리 관점으로만 다루세요.',
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[작성 형식 — 반드시 지키세요]');
  L.push(
    '1) ## 제목만 사용(### 소제목·이모지 남발 금지). 아래 순서대로 **모든 해당 섹션**을 빠짐없이 작성하세요.',
  );
  [
    '## 성격 요약 — 빅3(태양·달·상승)과 원소·모달리티를 연결해 타고난 기질',
    '## 강점 — 차트·어스펙트 근거를 들어 구체적으로',
    '## 과제·성장 포인트 — 긴장 각(사각·충)이나 과제 행성을 부드럽게',
    '## 연애·관계 — 금성·달·7하우스·관계 어스펙트(타고난 성향)',
    '## 일·적성·커리어 — MC·6·10하우스, 토성·화성·태양 등',
    '## 금전·재물운 — 2·8하우스, 금성·목성·토성, 수입·지출·저축 성향',
    '## 건강·에너지 관리 — 6하우스·화성·달·태양, 스트레스·회복·생활 리듬 (의학 진단 아님)',
    '## 학업·성장 — 3·9하우스, 수성·목성, 배움 스타일·집중·시험·자격·깊이 있는 공부',
  ].forEach((s, i) => L.push(`   ${i + 1}. ${s}`));
  L.push(
    '2) 각 섹션 **3~4문장**. 차트 근거(행성·별자리·하우스·어스펙트)를 최소 1개 이상 언급하세요. 같은 내용 반복 금지.',
  );
  L.push('3) 반드시 마지막 섹션까지 완성하고 중간에 끊지 마세요.');
  return L.join('\n');
}

function buildAstroMoneyPrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');
  const name = personLabel(p);

  const L = [];
  L.push('[역할]');
  L.push(
    '당신은 냉철한 인생 전략 분석가입니다. 차트는 위로가 아니라 **데이터 증거**입니다. ' +
      '지금은 **재물** 도메인: 자산 형성의 결함, 돈이 새는 구조, 투자·지출 성향의 오류에만 집중하세요. ' +
      COMMON_TONE,
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  pushDiagPartA(
    L,
    name,
    '재물',
    '돈이 들어오는 길·새는 구멍·베팅 버릇의 설계 오류만.',
    [
      '### 근거 1 — 설계도(왜 그렇게 움직이는지)',
      '(2·5·8하우스·금성·목성·토성 등 실제로 있는 배치)',
      '### 근거 2 — 함정·DO/DON\'T의 차트 근거',
      '### 근거 3 — 버려야 할 고집·수정 루틴의 근거',
    ],
  );
  return L.join('\n');
}

function buildAstroLovePrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');
  const name = personLabel(p);

  const L = [];
  L.push('[역할]');
  L.push(
    '당신은 냉철한 인생 전략 분석가입니다. 차트는 위로가 아니라 **데이터 증거**입니다. ' +
      '지금은 **연애·관계** 도메인: 관계 패턴의 함정, 상대 선택의 오류, 이별·갈등 때 반복되는 행동에만 집중하세요. ' +
      COMMON_TONE,
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  pushDiagPartA(
    L,
    name,
    '연애',
    '끌림·선택·어긋남의 설계 오류만. 「운명의 상대」 단정 금지.',
    [
      '### 근거 1 — 설계도(왜 그렇게 관계를 맺는지)',
      '(금성·달·화성·5·7하우스 등 실제로 있는 배치)',
      '### 근거 2 — 함정·DO/DON\'T의 차트 근거',
      '### 근거 3 — 버려야 할 고집·수정 루틴의 근거',
    ],
  );
  return L.join('\n');
}

function buildAstroCareerPrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');
  const name = personLabel(p);

  const L = [];
  L.push('[역할]');
  L.push(
    '당신은 냉철한 인생 전략 분석가입니다. 차트는 위로가 아니라 **데이터 증거**입니다. ' +
      '지금은 **커리어** 도메인: 일의 병목, 번아웃 원인, 성장을 가로막는 습관에만 집중하세요. 수입액·재물 자체보다 일의 방식·역할. ' +
      COMMON_TONE,
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  pushDiagPartA(
    L,
    name,
    '커리어',
    '일잘러로서의 병목·꺼지는 조건·성장 방해 습관의 설계 오류만.',
    [
      '### 근거 1 — 설계도(왜 그렇게 일하는지)',
      '(태양·화성·토성·MC·6·10하우스 등 실제로 있는 배치)',
      '### 근거 2 — 함정·DO/DON\'T의 차트 근거',
      '### 근거 3 — 버려야 할 고집·수정 루틴의 근거',
    ],
  );
  return L.join('\n');
}

function buildAstroStudyPrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');
  const name = personLabel(p);

  const L = [];
  L.push('[역할]');
  L.push(
    '당신은 냉철한 인생 전략 분석가입니다. 차트는 위로가 아니라 **데이터 증거**입니다. ' +
      '지금은 **학업·성장** 도메인: 두뇌 가동 방식, 학습 효율의 누수, 멘탈·압박 관리의 결함에만 집중하세요. ' +
      '학습 코치·공부법 블로그처럼 쓰지 마세요. ' +
      COMMON_TONE +
      ' 의학적 진단 아님. 「합격/불합격」 단정 금지.',
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  pushDiagPartA(
    L,
    name,
    '학업·성장',
    '머리가 켜지는/꺼지는 조건, 효율 누수, 압박 때 무너지는 설계 오류만.',
    [
      '### 근거 1 — 설계도(왜 그렇게 배우고 막히는지)',
      '(수성·목성·3·9하우스 등 실제로 있는 배치)',
      '### 근거 2 — 함정·DO/DON\'T의 차트 근거',
      '### 근거 3 — 버려야 할 고집·수정 루틴의 근거',
    ],
  );
  return L.join('\n');
}

const PROMPT_BUILDERS = {
  astro: buildAstroChartPrompt,
  astro_money: buildAstroMoneyPrompt,
  astro_love: buildAstroLovePrompt,
  astro_career: buildAstroCareerPrompt,
  astro_study: buildAstroStudyPrompt,
};

function buildAstroPrompt(feature, payload) {
  const fn = PROMPT_BUILDERS[feature];
  if (!fn) throw new Error('unknown_astro_feature');
  return fn(payload);
}

module.exports = {
  buildAstroChartPrompt,
  buildAstroMoneyPrompt,
  buildAstroLovePrompt,
  buildAstroCareerPrompt,
  buildAstroStudyPrompt,
  buildAstroPrompt,
};
