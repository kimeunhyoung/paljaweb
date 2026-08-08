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
  '「무조건」「보장」「대박」「3개월 안에 반드시」 같은 선동·보장 문구 금지. ' +
  '인신공격·모욕은 금지. 「자살행위」「나락」「잔인」 등 과격·선동 표현 남발 금지. 변명을 받아주지 않는 직설은 허용.';

const DIAG_STYLE =
  '[작성 원칙 — 최우선]\n' +
  '1) 전체는 **Part A(진단·부스터·결함·작전 지시) → Part B(왜 이렇게 읽었나)** 순서.\n' +
  '2) 위로·자기계발 칼럼·일반 팁 금지. 「행운」 대신 「구조적 기회」, 「운이 나쁘다」 대신 「구조적 취약성」.\n' +
  '3) Part A: 불릿·짧은 문장. 「6하우스」「트라인」「사각」 등 전문 용어 날것 금지(일상어로). 이모지 남발 금지. ' +
  '누구에게나 통하는 조언만 쓰지 말고, **이 차트에서만** 나오는 패턴을 말하세요.\n' +
  '4) 4번의 작전 지시는 상담 팁이 아니라 **구체 동작 1개씩**. 「3개월 안에 A」식 보장 대신 ' +
  '「이 루틴을 지키면 구조적 기회가 켜지기 쉽고, 안 지키면 결함 패턴으로 돌아간다」 톤.\n' +
  '5) Part B: Part A와 같은 결론의 차트 근거. 행성·별자리·하우스·어스펙트 OK + 쉬운 말. 섹션당 불릿 3~5개.\n' +
  '6) [출생 차트]에 있는 배치만 근거. 없는 배치 지어내기 금지. 이름은 차트에 있으면 그대로, 없으면 「당신」.\n' +
  '7) Part A·B 모순·복붙 금지.';

function personLabel(p) {
  return str(p && p.displayName) || '당신';
}

function pushWhySection(L, bullets) {
  L.push('---');
  L.push('');
  L.push('## 왜 이렇게 읽었나 (차트 근거)');
  L.push('> 위 진단·부스터·결함이 나온 이유를 투명하게 공개합니다. 전문 용어는 써도 되지만, 바로 쉬운 말로 풀으세요.');
  L.push('');
  (bullets || []).forEach((line) => L.push(line));
  L.push('');
}

function pushDiagClosing(L) {
  L.push(DIAG_STYLE);
  L.push('Part A 분석서와 Part B(왜 이렇게 읽었나)를 **모두** 채우고 중간에 끊지 마세요.');
}

function pushDiagPartA(L, name, domainLabel, focusLine, whyBullets) {
  L.push('[출력 포맷 — Part A]');
  L.push('## ' + name + '의 ‘' + domainLabel + ' 설계 오류 및 시나리오’ 분석서');
  L.push('');
  L.push(
    '> **[핵심 진단]:** (이 차트가 만든 치명적 습관 + 그로 인한 결말을 한 줄. 일반 조언 문장 금지)',
  );
  L.push('');
  L.push('### 1. 당신의 설계도: 왜 이렇게 움직이는가?');
  L.push(
    '* (고질적 행동 패턴의 근본 원인. 차트에서 나온 **작동 방식**을 직설로. 2~4줄 또는 불릿)',
  );
  L.push('');
  L.push('### 2. [성공 부스터] 차트에 숨겨진 치트키');
  L.push('* **구조적 기회:** (에너지가 몰리는 구간·효율이 터지는 조건. 「행운」「대박」 금지)');
  L.push(
    '* **왜 여기서 승부해야 하는가:** (남들과 달리 이 영역에서 효율이 나는 이유를 일상어로 1~2줄)',
  );
  L.push('');
  L.push('### 3. [위험] 치명적 결함: 쪽박 시나리오');
  L.push('* **구조적 취약성:** (부스터가 꺼지거나 오작동할 때 붕괴하는 패턴. 「운이 나쁘다」 금지)');
  L.push(
    '* **무지성으로 밀면 귀결되는 결말:** (이 차트에서 읽히는 구체적 결과 방향 1줄 — 과장·보장 금지)',
  );
  L.push('');
  L.push('### 4. [긴급] 설계 수정 및 전술적 지시 (Tactical Directive)');
  L.push(
    '* (뻔한 상담 조언 금지. 결함을 막고 부스터를 켜는 **작전 지시**. 각 항목은 구체 동작 1개)',
  );
  L.push(
    '* **[Emergency Stop]:** 쪽박 시나리오 징후가 보이면 즉시 멈출 행동 (예: “큰 결정 전 24시간 손대지 마라” — 이 사람에게 맞게)',
  );
  L.push(
    '* **[Level Up]:** 내일부터 부스터를 켜기 위한 루틴 1개 (예: “결론부터 써라” — 이 사람에게 맞게)',
  );
  L.push(
    '* **[분석가의 한마디]:** 뼈 있는 한 방. 보장·협박 금지. 「지키면 구조적 기회가 켜지기 쉽고, 안 지키면 결함 패턴으로 돌아간다」 톤.',
  );
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
      '지금은 **재물** 도메인: 자산 형성의 결함, 돈이 새는 구조, 투자·지출의 구조적 기회와 취약성에만 집중하세요. ' +
      COMMON_TONE,
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  pushDiagPartA(
    L,
    name,
    '재물',
    '돈의 유입·누수·베팅 버릇의 설계 오류 / 구조적 기회 / 쪽박 시나리오만.',
    [
      '### 근거 1 — 설계도',
      '(2·5·8하우스·금성·목성·토성 등 실제로 있는 배치)',
      '### 근거 2 — 성공 부스터(구조적 기회)',
      '### 근거 3 — 치명적 결함(구조적 취약성)과 작전 지시',
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
      '지금은 **연애·관계** 도메인: 관계 패턴, 상대 선택 오류, 구조적 기회와 취약성에만 집중하세요. ' +
      COMMON_TONE,
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  pushDiagPartA(
    L,
    name,
    '연애',
    '끌림·선택·어긋남의 설계 오류 / 구조적 기회 / 쪽박 시나리오만. 「운명의 상대」 단정 금지.',
    [
      '### 근거 1 — 설계도',
      '(금성·달·화성·5·7하우스 등 실제로 있는 배치)',
      '### 근거 2 — 성공 부스터(구조적 기회)',
      '### 근거 3 — 치명적 결함(구조적 취약성)과 작전 지시',
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
      '지금은 **커리어** 도메인: 일의 병목·번아웃·성장 방해와, 빛나는 무대(구조적 기회)에만 집중하세요. 수입액보다 일의 방식·역할. ' +
      COMMON_TONE,
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  pushDiagPartA(
    L,
    name,
    '커리어',
    '일 방식의 설계 오류 / 구조적 기회 / 번아웃·정체 쪽박 시나리오만.',
    [
      '### 근거 1 — 설계도',
      '(태양·화성·토성·MC·6·10하우스 등 실제로 있는 배치)',
      '### 근거 2 — 성공 부스터(구조적 기회)',
      '### 근거 3 — 치명적 결함(구조적 취약성)과 작전 지시',
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
      '지금은 **학업·성장** 도메인: 두뇌 가동, 효율 누수, 압박 결함과 구조적 학습 기회에만 집중하세요. ' +
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
    '학습 스위치·누수·압박 붕괴의 설계 오류 / 구조적 기회 / 쪽박 시나리오만.',
    [
      '### 근거 1 — 설계도',
      '(수성·목성·3·9하우스 등 실제로 있는 배치)',
      '### 근거 2 — 성공 부스터(구조적 기회)',
      '### 근거 3 — 치명적 결함(구조적 취약성)과 작전 지시',
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
