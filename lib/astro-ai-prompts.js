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
  '「무조건」「보장」「대박」 같은 선동·과장 문구 금지.';

const CHEAT_STYLE =
  '[작성 원칙 — 최우선]\n' +
  '1) 전체는 **Part A(치트키) → Part B(왜 이렇게 읽었나)** 순서. Part A만 읽어도 바로 쓸 수 있게, Part B는 근거가 궁금할 때용.\n' +
  '2) Part A: 학술·벽돌 줄글 금지. 불릿·짧은 키워드. 「6하우스」「트라인」「사각」「충」「어스펙트」 등 전문 용어 날것 금지. ' +
  '일상어로만. DO/DON\'T 필수. 이모지·「상위 1%」 과장 금지.\n' +
  '3) **일반론 금지(매우 중요):** 「조용한 환경」「수면 챙기기」「완벽주의 피하기」「큰 그림 먼저」「복습하라」처럼 ' +
  '누구에게나 통하는 자기계발·공부 팁만 나열하지 마세요. 그 조언이 **이 차트에서만** 나온 이유를 Part A 문장 안에 한 번이라도 박으세요 ' +
  '(예: “의미·철학으로 연결될 때 스위치가 켜지는 타입이라…”). 차트와 무관한 문장은 삭제.\n' +
  '4) Part A의 각 불릿은 **이 사람만의 한 줄 캐릭터**가 먼저, 행동 팁은 그다음. ‘방법 나열’보다 ‘이 사람의 작동 방식’이 먼저 들려야 합니다.\n' +
  '5) Part B: Part A와 **같은 결론**을 차트 근거로. 행성·별자리·하우스·어스펙트 OK, 쉬운 말로 풀기. ' +
  '섹션당 불릿 3~5개. 긴 보고서 금지. 근거 없는 일반론 금지.\n' +
  '6) [출생 차트]에 있는 배치만 근거. 없는 배치 지어내기 금지. 이름은 차트에 있으면 그대로, 없으면 「당신」.\n' +
  '7) Part A·B 모순·복붙 금지.';

function personLabel(p) {
  return str(p && p.displayName) || '당신';
}

function pushWhySection(L, bullets) {
  L.push('---');
  L.push('');
  L.push('## 왜 이렇게 읽었나 (차트 근거)');
  L.push('> 치트키가 나온 이유를 짧게 풀어 줍니다. 전문 용어는 써도 되지만, 바로 쉬운 말로 풀으세요.');
  L.push('');
  (bullets || []).forEach((line) => L.push(line));
  L.push('');
}

function pushCheatClosing(L) {
  L.push(CHEAT_STYLE);
  L.push('Part A 출력 포맷과 Part B(왜 이렇게 읽었나)를 **모두** 채우고 중간에 끊지 마세요.');
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
    '당신은 냉철하고 직관적인 재무·점성 전략 파트너입니다. ' +
      '먼저 「당장 써먹는 돈 치트키」를 쓰고, 이어서 「왜 그렇게 읽었는지」차트 근거를 짧게 붙입니다. ' +
      '일반 재테크·저축 팁 모음처럼 쓰지 말고, 이 차트만의 **돈 스위치·새는 구멍**을 캐릭터처럼 드러내세요. ' +
      COMMON_TONE,
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[출력 포맷 — Part A]');
  L.push('## ' + name + '의 ‘부의 치트키’ 매뉴얼');
  L.push('');
  L.push('> **[핵심 한 줄 요약]:** (차트 본질을 꿰뚫는 강렬한 한 문장)');
  L.push('');
  L.push('### 1. 당신의 부를 만드는 엔진 (본질)');
  L.push('* **성향:** (예: 치밀한 설계자 + 대담한 베터)');
  L.push('* **작동 방식:** (돈을 벌어들이는 고유 패턴 2~3줄, 일상어로)');
  L.push('');
  L.push('### 2. 돈을 불리는 ‘필살기’ (실전)');
  L.push('* **자산 유입 경로:** (어떤 분야·방식으로 돈이 들어오는지)');
  L.push('* **레버리지 포인트:** (규모를 키울 때 써야 할 강점)');
  L.push('* **DO (추천 행동):** (반드시 지킬 자산 관리 1~2가지)');
  L.push('* **DON\'T (금지 행동):** (치명적 손실을 부르는 행동 1~2가지)');
  L.push('');
  L.push('### 3. [경고] 돈이 새어나가는 함정');
  L.push('* **위험 패턴:** (무너질 때 나오는 전형적 함정)');
  L.push('* **안전장치:**');
  L.push('  1. (큰 투자 전 반드시 거칠 브레이크 루틴)');
  L.push('  2. (충동·감정 지출을 막는 방어선)');
  L.push('');
  pushWhySection(L, [
    '### 근거 1 — 돈 엔진이 그렇게 읽힌 이유',
    '(관련 행성·하우스·길한/긴장 연결을 쉬운 말로)',
    '### 근거 2 — 필살기·유입 경로의 차트 근거',
    '(2·5·8하우스·금성·목성 등 중 실제로 있는 것만)',
    '### 근거 3 — 함정·안전장치가 나온 이유',
    '(긴장 각·취약 배치를 짚고, Part A의 DON\'T·안전장치와 연결)',
  ]);
  pushCheatClosing(L);
  return L.join('\n');
}

function buildAstroLovePrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');
  const name = personLabel(p);

  const L = [];
  L.push('[역할]');
  L.push(
    '당신은 인간관계 패턴을 꿰뚫는 라이프·점성 전략 파트너입니다. ' +
      '먼저 「연애·관계 치트키」를 쓰고, 이어서 「왜 그렇게 읽었는지」차트 근거를 짧게 붙입니다. ' +
      '연애 칼럼 일반론처럼 쓰지 말고, 이 차트만의 **끌림·어긋남 패턴**을 드러내세요. ' +
      COMMON_TONE,
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[출력 포맷 — Part A]');
  L.push('## ' + name + '의 ‘매력 & 연애 치트키’ 매뉴얼');
  L.push('');
  L.push('> **[핵심 한 줄 요약]:** (연애 본질·관계 패턴을 꿰뚫는 한 문장)');
  L.push('');
  L.push('### 1. 당신의 연애 엔진 (사랑을 주고받는 방식)');
  L.push('* **매력 포인트:** (사람을 끌어당기는 본능적 무기)');
  L.push('* **사랑의 언어:** (관계에서 가장 중요하게 여기는 가치)');
  L.push('');
  L.push('### 2. 연애 필살기 (관계 발전)');
  L.push('* **끌어당기는 유형:** (잘 맞거나 시너지 나는 상대 성향)');
  L.push('* **DO (추천 행동):** (관계를 깊게 만들 행동 1~2가지)');
  L.push('* **DON\'T (금지 행동):** (상대를 지치게 하거나 관계를 망치는 행동 1~2가지)');
  L.push('');
  L.push('### 3. [경고] 연애가 자꾸 어그러지는 함정');
  L.push('* **위험 패턴:** (갈등·이별 직전에 나오는 본능적 실수)');
  L.push('* **안전장치:**');
  L.push('  1. (관계가 흔들릴 때 먼저 멈추고 점검할 루틴)');
  L.push('  2. (감정 폭발·오해를 막는 방어선)');
  L.push('');
  pushWhySection(L, [
    '### 근거 1 — 매력·사랑의 언어가 그렇게 읽힌 이유',
    '(금성·달·화성·5·7하우스 등 실제로 있는 배치)',
    '### 근거 2 — 잘 맞는 상대·DO가 나온 근거',
    '### 근거 3 — 함정·DON\'T가 나온 근거',
    '(긴장 각·취약 배치와 Part A 경고를 연결)',
  ]);
  pushCheatClosing(L);
  return L.join('\n');
}

function buildAstroCareerPrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');
  const name = personLabel(p);

  const L = [];
  L.push('[역할]');
  L.push(
    '당신은 커리어 성공 패턴을 읽는 라이프·점성 전략 파트너입니다. ' +
      '수입액·재물보다 「일의 방식·성취·역할」에 초점을 두고, 먼저 치트키를 쓴 뒤 차트 근거를 짧게 붙입니다. ' +
      '직장인 자기계발 일반론처럼 쓰지 말고, 이 차트만의 **빛나는 무대·꺼지는 조건**을 드러내세요. ' +
      COMMON_TONE,
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[출력 포맷 — Part A]');
  L.push('## ' + name + '의 ‘커리어 판 갈이’ 치트키 매뉴얼');
  L.push('');
  L.push('> **[핵심 한 줄 요약]:** (사회에서 가장 빛나는 일의 본질 한 문장)');
  L.push('');
  L.push('### 1. 당신의 일하는 엔진 (능력 발휘 스타일)');
  L.push('* **핵심 강점:** (조직·프로젝트에서 독보적으로 잘해내는 영역)');
  L.push('* **일하는 방식:** (혼자 판을 짜야 하는지 / 팀으로 움직여야 하는지)');
  L.push('');
  L.push('### 2. 커리어 폭발 필살기 (성공 전략)');
  L.push('* **최적의 무대:** (빠르게 두각을 낼 직무·환경)');
  L.push('* **DO (추천 행동):** (가치를 높이고 성과를 키울 액션 1~2가지)');
  L.push('* **DON\'T (금지 행동):** (커리어 발목을 잡는 행동·회피 1~2가지)');
  L.push('');
  L.push('### 3. [경고] 번아웃과 정체의 함정');
  L.push('* **위험 패턴:** (일이 막히거나 스트레스받을 때 무너지는 징후)');
  L.push('* **안전장치:**');
  L.push('  1. (슬럼프 탈출용 실질 행동 루틴)');
  L.push('  2. (상사·동료·클라이언트 마찰을 줄이는 소통 방어선)');
  L.push('');
  pushWhySection(L, [
    '### 근거 1 — 일하는 엔진·강점이 그렇게 읽힌 이유',
    '(태양·화성·토성·MC·6·10하우스 등 실제로 있는 배치)',
    '### 근거 2 — 최적의 무대·DO가 나온 근거',
    '### 근거 3 — 번아웃 함정·DON\'T가 나온 근거',
  ]);
  pushCheatClosing(L);
  return L.join('\n');
}

function buildAstroStudyPrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');
  const name = personLabel(p);

  const L = [];
  L.push('[역할]');
  L.push(
    '당신은 학습·성장 동력을 읽는 라이프·점성 전략 파트너입니다. ' +
      '먼저 공부·성장 치트키를 쓰고, 이어서 차트 근거를 짧게 붙입니다. ' +
      '**학습 코치·자기계발 블로그처럼 쓰지 마세요.** ‘이렇게 공부하세요’ 일반 팁 모음이 아니라, ' +
      '이 차트가 켜지는 **독특한 학습 스위치·막히는 지점**을 캐릭터처럼 드러내세요. ' +
      COMMON_TONE +
      ' 의학적 진단이 아닌 학습·멘탈·집중 관점만. 「합격/불합격」 단정 금지.',
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[출력 포맷 — Part A]');
  L.push('## ' + name + '의 ‘두뇌 가속 & 성장’ 치트키 매뉴얼');
  L.push('');
  L.push(
    '> **[핵심 한 줄 요약]:** (일반 공부법 요약 금지. “이 사람은 ○○일 때 머리가 켜지고, △△일 때 꺼진다”처럼 개인 스위치 한 문장)',
  );
  L.push('');
  L.push('### 1. 당신의 지식 흡수 엔진 (학습 스타일)');
  L.push(
    '* **습득 방식:** (암기/체화/스토리 중 무엇이 아니라, **무엇을 만나야 스위치가 켜지는지** — 예: 의미·철학·큰 판이 보여야 함)',
  );
  L.push(
    '* **집중력 패턴:** (환경 일반론 금지. **집중이 죽거나 살아나는 조건**을 이 사람 특유의 말로)',
  );
  L.push('');
  L.push('### 2. 시험·성취 필살기');
  L.push(
    '* **최적의 공부법:** (누구에게나 좋은 루프 나열 금지. 이 차트에만 맞는 **한 가지 루프**를 이름으로 짓듯 짧게)',
  );
  L.push(
    '* **DO (추천 행동):** (일반 ‘요약하라/복습하라’ 금지. 이 사람의 스위치에 꽂히는 행동 1~2가지 + 왜 이 사람인지 반 문장)',
  );
  L.push(
    '* **DON\'T (금지 행동):** (일반 ‘완벽주의 금지’만 쓰지 말고, **이 사람이 빠지는 구체적 함정**으로)',
  );
  L.push('');
  L.push('### 3. [경고] 압박과 멘탈 붕괴의 함정');
  L.push(
    '* **위험 패턴:** (자책·불안의 일반 서술 금지. 이 차트에서 나오는 **무너지는 장면**을 한 컷처럼)',
  );
  L.push('* **안전장치:**');
  L.push('  1. (수면·휴식만 말하지 말고, 이 패턴을 끊는 **구체 행동**)');
  L.push('  2. (학습 효율용 에너지 관리 — 역시 이 사람에게만 맞는 말로)');
  L.push('');
  pushWhySection(L, [
    '### 근거 1 — 습득·집중 패턴이 그렇게 읽힌 이유',
    '(수성·목성·3·9하우스 등 실제로 있는 배치 → Part A 스위치와 1:1 연결)',
    '### 근거 2 — 최적 공부법·DO가 나온 근거',
    '(루틴·실행 배치가 있으면 그것만. 없으면 있는 배치로만)',
    '### 근거 3 — 압박 함정·DON\'T가 나온 근거',
    '(긴장 각·달·토성 등 → Part A 경고와 직접 연결. 일반 멘탈 팁 금지)',
  ]);
  pushCheatClosing(L);
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
