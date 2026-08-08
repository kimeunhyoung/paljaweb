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
  '1) 전체는 **Part A(일상어 해부) → Part B(분석가 노트·차트 근거)** 순서.\n' +
  '2) 위로·자기계발 칼럼·일반 팁 금지. 진단은 직접적으로, 모욕·선동·협박 금지. ' +
  '「사기적」「지옥」「자멸」「피를 흘려도」「프리패스」「난구간」「기형」 같은 자극 표현 금지.\n' +
  '3) **핵심 모순:** Part A 맨 위 한 문장에, 어디서는 남들보다 효율이 나고 어디서는 구조적으로 막히는 양면성을 삶의 말로 압축.\n' +
  '4) **남들보다 타고난 복:** [출생 차트]에 **트라인·육분 등 길한 연결**이 있으면 Part A 2번의 핵심으로. ' +
  '막연한 행운이 아니라, 남들은 오래 막히는 지점을 이 사람은 덜 버티고 통과하는 **구조적 이유**로 설명.\n' +
  '5) **남들보다 유난히 안 되는 부분:** **충·사각 등 긴장 각**이 있으면 Part A 3번의 핵심으로. ' +
  '의지 부족이 아니라, 애초에 힘이 부딪히도록 연결된 **구조적 오작동**으로 설명. 무지성으로 밀어붙이면 왜 더 꼬이는지 인과를 밝히세요.\n' +
  '6) **복이 없거나 긴장이 몰린 경우(매우 중요):** 이 주제(재물/연애/일/학업)에 마찰 없는 연결이 거의 없거나, 긴장이 극단적으로 몰려 있으면 ' +
  '없는 복을 지어내거나 숨기지 마세요. 2번에서는 「이 주제만큼은 쉽게 되는 타고난 복이 약하다」를 정면으로 쓰고, ' +
  '3번·핵심 모순에서 그 결핍·몰림의 구조를 설명하세요. 억지로 밝은 복을 만들면 안 됩니다. Part A에 「도메인」이라고 쓰지 마세요.\n' +
  '7) **Part A 용어 금지(절대):** 행성 이름(태양·달·수성·금성·화성·목성·토성·천왕성·해왕성·명왕성·카이런·노드 등), ' +
  '「태양-목성」 같은 행성 쌍, 각도 이름(트라인·충·사각·육분), 하우스 번호, 「어스펙트」「네이탈」, ' +
  '「도메인」「DOMAIN」. (주제는 「재물」「연애」「일」「학업」처럼 쓰거나 「이 주제」로.) ' +
  'Part A는 삶의 기능어만: 감정·실행·큰 그림·자기검열·학습 속도 등.\n' +
  '8) **Part B(분석가 노트)에만** 행성·각도·하우스 이름을 밝히고 쉬운 말로 풀기. Part A와 같은 배치를 가리키되 복붙 금지.\n' +
  '9) 4번 작전은 구체 동작 1개씩. 보장·투자·합격 단정 금지. 「타고난 복을 쓰고, 안 되는 부분을 밀어붙이지 않으면 구조가 켜진다」 톤.\n' +
  '10) [출생 차트]에 있는 배치만 근거. 없는 배치 지어내기 금지. 이름은 차트에 있으면 그대로, 없으면 「당신」.\n' +
  '11) 2번과 3번은 서로 다른 배치를 가리키게. 복이 약하면 2번=결핍 고지, 3번=긴장 해부로 역할을 나누세요.';

function personLabel(p) {
  return str(p && p.displayName) || '당신';
}

function pushWhySection(L, bullets) {
  L.push('---');
  L.push('');
  L.push('## 분석가 노트 (차트 근거)');
  L.push(
    '> 위 통찰이 어떤 행성·하우스·각도(어스펙트) 상호작용에서 나온 것인지, 일반인이 읽어도 납득되게 풀어 신뢰를 담보하세요. **여기서만** 전문 이름을 씁니다.',
  );
  L.push('');
  (bullets || []).forEach((line) => L.push(line));
  L.push('');
}

function pushDiagClosing(L) {
  L.push(DIAG_STYLE);
  L.push('Part A 해부 리포트와 Part B(분석가 노트)를 **모두** 채우고 중간에 끊지 마세요.');
  L.push(
    '최종 점검: Part A에 행성명·행성쌍·각도명·하우스 번호가 하나라도 있으면 다시 써서 Part B로 옮기세요.',
  );
}

function pushDiagPartA(L, name, domainLabel, focusLine, whyBullets) {
  L.push('[출력 포맷 — Part A — 일상어만. 행성·각도·하우스 이름 금지]');
  L.push('## ' + name + '의 ‘' + domainLabel + '’ 해부 리포트');
  L.push('');
  L.push('> **[핵심 모순]:**');
  L.push(
    '> (어디서는 남들보다 효율이 나고, 어디서는 구조적으로 막히는지 — 그 양면성을 삶의 말로 한 문장)',
  );
  L.push('');
  L.push('### 1. 당신의 뇌와 에너지가 움직이는 방식');
  L.push(
    '* (이 주제에서 정보를 받아들이고 결정할 때, 남들과 다른 회로·기조가 무엇인지. “왜 이 방면에서 다르게 생각하는가”의 근본 성향. 삶 언어만)',
  );
  L.push('');
  L.push('### 2. 남들보다 타고난 복 (숨만 쉬어도 풀리는 부분)');
  L.push(
    '* (마찰 없이 흐르는 구간이 있으면: 막연한 행운이 아니라, 남들은 오래 막히는 지점을 왜 덜 버티고 통과하는지 구조로. 삶 언어만)',
  );
  L.push(
    '* (그런 연결이 거의 없으면: 없는 복을 지어내지 말고, 「이 주제만큼은 쉽게 되는 타고난 복이 약하다」를 정면으로. 「도메인」 단어 금지)',
  );
  L.push('');
  L.push('### 3. 남들보다 유난히 안 되는 부분 (병목)');
  L.push(
    '* (힘이 서로 부딪히는 구간이 있으면: 의지 부족이 아니라 애초에 판이 그렇게 연결된 이유를 해부. 억지로·무지성으로 들이받으면 왜 더 꼬이는지. 삶 언어만)',
  );
  L.push(
    '* (긴장이 이 주제에 몰려 있으면: 그 몰림을 숨기지 말고, 왜 이 주제만큼은 남들처럼 안 되는지 인과로)',
  );
  L.push('');
  L.push('### 4. 이 구조를 돌파하기 위한 실전 궤도 수정');
  L.push(
    '* **[지금 당장 멈춰야 할 착각]:** 안 되는 부분을 뚫겠다고 엉뚱한 데 에너지를 쓰는 대표 오답 행동 1개 (이 사람에게 맞게)',
  );
  L.push(
    '* **[가장 빠르고 확실한 승부수]:** 타고난 복을 쓰고 안 되는 부분의 리스크를 줄이기 위해, 내일부터 적용할 구체 행동 1개 (이 사람에게 맞게)',
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
    '돈의 유입·누수·베팅 버릇 / 핵심 모순 / 타고난 복(없으면 결핍 고지) / 유난히 안 되는 부분 / 실전 궤도 수정. Part A는 일상어만.',
    [
      '### 근거 1 — 뇌·에너지 회로',
      '(2·5·8하우스·금성·목성·토성 등 실제로 있는 배치)',
      '### 근거 2 — 남들보다 타고난 복(트라인·육분 등). 없으면 「이 주제엔 길한 연결이 약함」을 근거로 명시',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
      '### 근거 3 — 유난히 안 되는 부분(충·사각 등)과 궤도 수정',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
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
    '끌림·선택·어긋남 / 핵심 모순 / 타고난 복(없으면 결핍 고지) / 유난히 안 되는 부분 / 실전 궤도 수정. 「운명의 상대」 단정 금지. Part A는 일상어만.',
    [
      '### 근거 1 — 뇌·에너지 회로',
      '(금성·달·화성·5·7하우스 등 실제로 있는 배치)',
      '### 근거 2 — 남들보다 타고난 복(트라인·육분 등). 없으면 「이 주제엔 길한 연결이 약함」을 근거로 명시',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
      '### 근거 3 — 유난히 안 되는 부분(충·사각 등)과 궤도 수정',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
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
    '일 방식·역할 / 핵심 모순 / 타고난 복(없으면 결핍 고지) / 유난히 안 되는 부분·번아웃 / 실전 궤도 수정. Part A는 일상어만.',
    [
      '### 근거 1 — 뇌·에너지 회로',
      '(태양·화성·토성·MC·6·10하우스 등 실제로 있는 배치)',
      '### 근거 2 — 남들보다 타고난 복(트라인·육분 등). 없으면 「이 주제엔 길한 연결이 약함」을 근거로 명시',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
      '### 근거 3 — 유난히 안 되는 부분(충·사각 등)과 궤도 수정',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
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
    '학습 스위치·누수·압박 / 핵심 모순 / 타고난 복(없으면 결핍 고지) / 유난히 안 되는 부분 / 실전 궤도 수정. Part A는 일상어만.',
    [
      '### 근거 1 — 뇌·에너지 회로',
      '(수성·목성·3·9하우스 등 실제로 있는 배치)',
      '### 근거 2 — 남들보다 타고난 복(트라인·육분 등). 없으면 「이 주제엔 길한 연결이 약함」을 근거로 명시',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
      '### 근거 3 — 유난히 안 되는 부분(충·사각 등)과 궤도 수정',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
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
