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
  '단정적 예언·공포 조장·「평생 ~」식 단정은 금지. 참고용 자기이해 톤으로 따뜻하게. 의학·법률·투자 종목 단정 조언 금지. 트랜짓·올해 운세는 포함하지 마세요.';

/** 주제별 심화 공통: 행운의 핵심 엔진 선정 규칙 */
const GOLDEN_ENGINE_RULE =
  '[골든 룰: 행운 최우선] 제공된 [출생 차트]의 어스펙트·행성 배치만으로 가장 강력하고 긍정적인 길한 애스펙트(트라인·섹스타일 등)를 「행운의 핵심 엔진」으로 먼저 고르세요. ' +
  '강한 길한 각이 목록에 없으면 가장 유리한 배치(예: 목성·금성의 좋은 위치)를 엔진으로 삼되, 차트에 없는 행성·어스펙트를 지어내지 마세요. ' +
  '이후 모든 분석은 이 엔진이 어떻게 작동하는지를 중심으로 연결하세요.';

function pushTopicClosing(L) {
  L.push('각 섹션마다 행성·하우스·어스펙트 근거를 최소 1개 이상 본문에 명시하세요. 나열이 아니라 인과가 이어지는 스토리로 쓰세요.');
  L.push('반드시 4번 섹션까지 완성하고 중간에 끊지 마세요.');
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

  const L = [];
  L.push('[역할]');
  L.push(
    '당신은 서양 점성학 기반의 「재무 전략 컨설턴트」입니다. ' +
      '차트 속 「행운의 핵심 엔진」을 바탕으로 자산 형성의 로드맵을 설계하세요. ' +
      COMMON_TONE,
  );
  L.push('');
  L.push('[핵심 지시]');
  L.push('1. ' + GOLDEN_ENGINE_RULE);
  L.push(
    '2. 재무 구조 해부: 2(소유·가치), 5(투기·베팅), 6(실무 수입), 8(장기 자산·변동)하우스를 분석하되, ' +
      '「행운의 엔진」이 투자 성향·실무 능력과 어떻게 시너지를 내는지 연결하세요. 빈 하우스는 수호성을 추적하세요.',
  );
  L.push(
    '3. [어스펙트 양면성] 길한 각도(트라인·섹스타일)는 「타고난 수혜(기회·귀인)」로, ' +
      '긴장 각도(스퀘어·오포지션)는 「재무적 딜레마(지출·강박)」로 정의하세요. ' +
      '긴장 각도도 행운의 엔진으로 제어·방어하는 전략을 반드시 제시하세요.',
  );
  L.push(
    '4. 「대박 운」「요행수」「무조건 부자」 같은 단정·선동 표현 금지. 투자 종목·수익률 단정 금지.',
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[작성 형식]');
  L.push('아래 4개 ## 제목을 **순서대로 모두** 작성. 각 섹션 **4~5문장**.');
  L.push('## 1. 나의 부를 키우는 「행운의 핵심 엔진」 (가장 중요)');
  L.push(
    '(차트 내 가장 강력한 길한 애스펙트를 명시하고, 이것이 왜 나만의 돈 버는 패턴·기회를 키우는 자원인지 상세히 서술)',
  );
  L.push('## 2. 자산 형성 메커니즘과 투자 스타일 (행운의 엔진과 연계)');
  L.push('(타고난 경제 활동 방식이 엔진과 어떻게 결합해 자산을 키우는지 분석)');
  L.push('## 3. 재무적 딜레마와 반복되는 리스크');
  L.push('(긴장 각도의 지출·투자 마찰을 서술하되, 1번 엔진으로 제어·방어하는 솔루션 제시)');
  L.push('## 4. 부를 키우는 실전 전략 로드맵');
  L.push('(강점·약점을 조화시킨 현실적 수입·저축·투자 태도 — 종목·수익률 단정 없이)');
  pushTopicClosing(L);
  return L.join('\n');
}

function buildAstroLovePrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');

  const L = [];
  L.push('[역할]');
  L.push(
    '당신은 서양 점성학 기반의 「관계 심리 컨설턴트」입니다. ' +
      '차트 속 「행운의 핵심 엔진」이 어떻게 독보적인 매력과 인연의 기회로 발현되는지 분석하세요. ' +
      COMMON_TONE,
  );
  L.push('');
  L.push('[핵심 지시]');
  L.push('1. ' + GOLDEN_ENGINE_RULE);
  L.push(
    '2. 관계 역학: 5(낭만·연애), 7(파트너십), 8(깊은 결합·친밀)하우스를 분석하되, ' +
      '「행운의 엔진」이 관계의 갈등을 어떻게 풀거나 기회로 바꾸는지 연결하세요. 금성·화성·달·상승도 반영하세요.',
  );
  L.push(
    '3. [어스펙트 양면성] 길한 각도는 「독보적인 매력과 인연의 기회」로, ' +
      '긴장 각도는 「성숙해지는 성장 과제」로 구분하세요. 긴장도 엔진으로 사랑·신뢰로 승화하는 솔루션을 반드시 제시하세요.',
  );
  L.push('4. 「운명의 상대」「무조건 만난다」 같은 단정 예언 금지.');
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[작성 형식]');
  L.push('아래 4개 ## 제목을 **순서대로 모두** 작성. 각 섹션 **4~5문장**.');
  L.push('## 1. 나의 매력을 키우는 「행운의 핵심 엔진」 (가장 중요)');
  L.push(
    '(가장 강력한 길한 애스펙트를 명시하고, 이것이 상대를 끌어당기는 매력·좋은 인연의 기회로 어떻게 작용하는지 서술)',
  );
  L.push('## 2. 연애 스타일과 파트너 유형 (행운의 엔진과 연계)');
  L.push('(타고난 사랑 방식이 엔진과 결합해 관계의 질을 어떻게 높이는지 분석)');
  L.push('## 3. 관계에서 겪는 마찰점과 반복되는 과제');
  L.push('(긴장 각도의 오해·갈등을 짚되, 1번 엔진으로 어떻게 승화할지 솔루션 제시)');
  L.push('## 4. 건강한 관계를 위한 실전 로드맵');
  L.push('(매력·인연의 에너지를 효과적으로 쓰는 만남·관계 유지 전략 — 단정 예언 없이)');
  pushTopicClosing(L);
  return L.join('\n');
}

function buildAstroCareerPrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');

  const L = [];
  L.push('[역할]');
  L.push(
    '당신은 서양 점성학 기반의 「커리어 전략가」입니다. ' +
      '차트 속 「행운의 핵심 엔진」을 활용해 사회적 성취의 궤적을 설계하세요. ' +
      '수입·재물액은 2·8하우스가 아닌 「일의 방식·성취·명예」에 초점을 맞추세요. ' +
      COMMON_TONE,
  );
  L.push('');
  L.push('[핵심 지시]');
  L.push('1. ' + GOLDEN_ENGINE_RULE);
  L.push(
    '2. 커리어 성취: 10하우스·MC·6하우스를 분석하되, 「행운의 엔진」이 성과·인정을 어떻게 증폭하는지 연결하세요. ' +
      '화성·토성·태양·수성·목성도 함께 보세요.',
  );
  L.push(
    '3. [어스펙트 양면성] 길한 각도는 「직업적 보호막과 귀인」으로, ' +
      '긴장 각도는 「전문가로 단련되는 하드 트레이닝」으로 정의하세요. 긴장도 엔진으로 돌파·내공화하는 솔루션을 반드시 제시하세요.',
  );
  L.push('4. 「최고 자리 보장」「무조건 승진」 같은 단정 예언 금지.');
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[작성 형식]');
  L.push('아래 4개 ## 제목을 **순서대로 모두** 작성. 각 섹션 **4~5문장**.');
  L.push('## 1. 사회적 성취를 돕는 「행운의 핵심 엔진」 (가장 중요)');
  L.push(
    '(가장 강력한 길한 애스펙트를 명시하고, 이것이 왜 「운 좋게 인정받는 순간」을 만드는 나만의 커리어 자원인지 서술)',
  );
  L.push('## 2. 업무 스타일과 성취 방향 (행운의 엔진과 연계)');
  L.push('(실무 역량이 엔진과 결합해 어떻게 성과를 만드는지 분석)');
  L.push('## 3. 커리어 성장을 가로막는 장애물과 내면의 갈등');
  L.push('(긴장 각도의 스트레스·번아웃을 서술하되, 1번 엔진으로 돌파·내공화하는 솔루션 제시)');
  L.push('## 4. 커리어를 키우는 실전 로드맵');
  L.push('(타고난 재능과 행운의 엔진을 조합한 단계별 전략 — 단정 예언 없이)');
  pushTopicClosing(L);
  return L.join('\n');
}

function buildAstroStudyPrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');

  const L = [];
  L.push('[역할]');
  L.push(
    '당신은 서양 점성학 기반의 「학습 및 지적 성장 컨설턴트」입니다. ' +
      '차트에서 가장 빛나는 「행운의 핵심 엔진」을 찾아내는 것이 첫 번째 임무입니다. ' +
      COMMON_TONE +
      ' 의학적 진단이 아닌 학습·멘탈·집중 관점으로만 다루세요. 「합격/불합격」 단정 예언 금지.',
  );
  L.push('');
  L.push('[핵심 지시]');
  L.push('1. ' + GOLDEN_ENGINE_RULE);
  L.push(
    '2. 학습과 두뇌 스타일: 3/9하우스와 수성을 분석하되, 「행운의 엔진」이 두뇌 퍼포먼스를 어떻게 극대화하는지 연결하세요. 목성·9하우스로 전문성 확장도 연결하세요.',
  );
  L.push(
    '3. 시험 압박 관리: 긴장 각도(스퀘어·오포지션)를 분석하되, 「행운의 엔진」으로 어떻게 상쇄·돌파할지 반드시 솔루션을 제시하세요.',
  );
  L.push(
    '4. [어스펙트 양면성] 길한 각도(트라인 등)는 「타고난 수혜」로, 긴장 각도는 「더 큰 성장을 위한 훈련」으로 명확히 구분하세요.',
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[작성 형식]');
  L.push('아래 4개 ## 제목을 **순서대로 모두** 작성. 각 섹션 **4~5문장**.');
  L.push('## 1. 나의 학습을 돕는 「행운의 핵심 엔진」 (가장 중요)');
  L.push(
    '(가장 강력한 길한 애스펙트를 명시하고, 이것이 시험·평가 장면에서 왜 「운」처럼 힘을 보태는 나만의 자원인지 상세히 서술)',
  );
  L.push('## 2. 정보 흡수력과 학습 스타일 (행운의 엔진과 연계)');
  L.push('(타고난 학습 스타일이 엔진과 결합해 어떻게 효율을 내는지 분석)');
  L.push('## 3. 시험 및 압박 상황에서의 심리적 장애물과 마찰점');
  L.push('(긴장 각도의 장애물을 서술하되, 1번 엔진으로 어떻게 돌파할지 솔루션 제시)');
  L.push('## 4. 실력을 키우는 맞춤형 성장 로드맵');
  L.push('(강점·약점을 조화시킨 실전 학습·멘탈 커리큘럼 — 합격 단정 없이)');
  pushTopicClosing(L);
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
