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
          (Number.isFinite(Number(row.deg)) ? ' ' + Math.floor(Number(row.deg)) + '°' : '') +
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

  const ranked = Array.isArray(p.aspectsRanked)
    ? p.aspectsRanked.map((a) => str(a)).filter(Boolean)
    : [];
  const aspects = Array.isArray(p.aspects)
    ? p.aspects.map((a) => str(a)).filter(Boolean)
    : [];
  if (ranked.length) {
    L.push('주요 어스펙트 (오차가 작은 순 · 오차 3° 이내 = 강한 연결):');
    ranked.forEach((a) => L.push(' - ' + a));
  } else if (aspects.length) {
    L.push('주요 어스펙트: ' + aspects.join(', '));
  }

  appendChartFocusLines(L, p, planets);

  L.push('');
  L.push(
    '[데이터 규칙] 위 [출생 차트]에 있는 배치만 근거로 하세요. 없는 행성·하우스·어스펙트를 지어내지 마세요.',
  );
}

// 상승궁 지배성(전통 기준, 괄호는 현대 공동 지배성)
const SIGN_RULER = [
  ['양', '화성'], ['황소', '금성'], ['쌍둥이', '수성'], ['게', '달'], ['사자', '태양'], ['처녀', '수성'],
  ['천칭', '금성'], ['전갈', '화성', '명왕성'], ['사수', '목성'], ['염소', '토성'], ['물병', '토성', '천왕성'], ['물고기', '목성', '해왕성'],
];
function rulerOfSign(signKo) {
  const s = str(signKo);
  for (let i = 0; i < SIGN_RULER.length; i += 1) {
    if (s.startsWith(SIGN_RULER[i][0])) return SIGN_RULER[i].slice(1);
  }
  return null;
}

/** 이 차트에서 먼저 봐야 할 배치 — 지배성·몰림·각진 하우스 (코드 계산, AI는 여기부터 읽게) */
function appendChartFocusLines(L, p, planets) {
  const out = [];
  const rows = (planets || []).filter((r) => r && str(r.ko) && str(r.sign));
  const findPlanet = (ko) => rows.find((r) => str(r.ko) === ko);
  if (!p.unknownTime && str(p.asc)) {
    const rulers = rulerOfSign(p.asc);
    if (rulers) {
      const main = findPlanet(rulers[0]);
      let line = '차트 지배성(상승궁 ' + str(p.asc) + '의 지배성): ' + rulers[0];
      if (main) line += ' — ' + str(main.sign) + (main.house ? ' / ' + main.house + '하우스' : '');
      if (rulers[1]) line += ' (현대 공동 지배성: ' + rulers[1] + ')';
      out.push(line);
    }
  }
  const bySign = {};
  const byHouse = {};
  rows.forEach((r) => {
    const sg = str(r.sign);
    (bySign[sg] = bySign[sg] || []).push(str(r.ko));
    if (!p.unknownTime && r.house) (byHouse[r.house] = byHouse[r.house] || []).push(str(r.ko));
  });
  Object.keys(bySign).forEach((sg) => {
    if (bySign[sg].length >= 3) out.push('행성 몰림: ' + sg + '에 ' + bySign[sg].join('·') + ' (' + bySign[sg].length + '개)');
  });
  Object.keys(byHouse).forEach((h) => {
    if (byHouse[h].length >= 3) out.push('행성 몰림: ' + h + '하우스에 ' + byHouse[h].join('·') + ' (' + byHouse[h].length + '개)');
  });
  if (!p.unknownTime) {
    const angular = rows.filter((r) => [1, 4, 7, 10].indexOf(Number(r.house)) >= 0).map((r) => str(r.ko) + '(' + r.house + '하우스)');
    if (angular.length) out.push('각진 하우스(1·4·7·10)의 행성 — 겉으로 잘 드러나는 힘: ' + angular.join(', '));
  }
  if (!out.length) return;
  L.push('[차트의 중심 후보 — 코드 계산]');
  out.forEach((x) => L.push(' - ' + x));
}

const COMMON_TONE =
  '답변은 해요체(~해요, ~이에요)로 쓰세요. 점성 용어는 화면과 같게 합·육각·사각·삼각·충으로 쓰고, 트라인·스퀘어·섹스타일 같은 외래어 표기는 쓰지 마세요. ' +
  '단정적 예언·공포 조장·「평생 ~」식 단정은 금지. 의학·법률·투자 종목·수익률 단정 금지. 트랜짓·올해 운세는 포함하지 마세요. ' +
  '「무조건」「보장」「대박」「3개월 안에 반드시」 같은 선동·보장 문구 금지. ' +
  '인신공격·모욕은 금지. 「자살행위」「나락」「잔인」 등 과격·선동 표현 남발 금지. 변명을 받아주지 않는 직설은 허용.';

const DIAG_STYLE =
  '[작성 원칙 — 최우선]\n' +
  '1) 전체는 **Part A(일상어 해부) → Part B(분석가 노트·차트 근거)** 순서.\n' +
  '2) 위로·자기계발 칼럼·일반 팁 금지. 진단은 직접적으로, 모욕·선동·협박 금지. ' +
  '「사기적」「지옥」「자멸」「피를 흘려도」「프리패스」「난구간」「기형」 같은 자극 표현 금지.\n' +
  '3) **핵심 모순:** Part A 맨 위 한 문장에, 어디서는 남들보다 효율이 나고 어디서는 구조적으로 막히는 양면성을 삶의 말로 압축.\n' +
  '4) **남들보다 타고난 복:** [출생 차트]에 **삼각·육각 등 길한 연결**이 있으면 Part A 2번의 핵심으로. ' +
  '막연한 행운이 아니라, 남들은 오래 막히는 지점을 이 사람은 덜 버티고 통과하는 **구조적 이유**로 설명.\n' +
  '5) **남들보다 유난히 안 되는 부분:** **충·사각 등 긴장 각**이 있으면 Part A 3번의 핵심으로. ' +
  '의지 부족이 아니라, 애초에 힘이 부딪히도록 연결된 **구조적 오작동**으로 설명. 억지로 밀어붙이면 왜 더 꼬이는지 인과를 밝히세요.\n' +
  '6) **복이 없거나 긴장이 몰린 경우(매우 중요):** 해당 주제(예: 재물)에 마찰 없는 연결이 거의 없거나, 긴장이 극단적으로 몰려 있으면 ' +
  '없는 복을 지어내거나 숨기지 마세요. 2번에서는 「이 주제(재물)만큼은 쉽게 되는 타고난 복이 약하다」처럼 **이 주제(…)** 표기로 정면 고지하고, ' +
  '3번·핵심 모순에서 그 결핍·몰림의 구조를 설명하세요. 억지로 밝은 복을 만들면 안 됩니다.\n' +
  '7) **용어 금지(절대, Part A·B 공통):** 「도메인」「DOMAIN」 쓰지 마세요. 대신 **「이 주제(재물)」**처럼 「이 주제(주제명)」 형식을 쓰거나 주제명만 쓰세요. ' +
  'Part A에는 추가로 행성 이름·행성 쌍·각도 이름·하우스 번호·「어스펙트」「네이탈」 금지. Part A는 삶의 기능어만.\n' +
  '8) **Part B(분석가 노트)에만** 행성·각도·하우스 이름을 밝히고 쉬운 말로 풀기. Part A와 같은 배치를 가리키되 복붙 금지. Part B에도 「도메인」 금지 → 「이 주제(재물)」.\n' +
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
    '> 위 통찰이 어떤 행성·하우스·각도(어스펙트) 상호작용에서 나온 것인지, 일반인이 읽어도 납득되게 풀어 신뢰를 담보하세요. **여기서만** 전문 이름을 씁니다. 「도메인」 대신 「이 주제(…)」.',
  );
  L.push('');
  (bullets || []).forEach((line) => L.push(line));
  L.push('');
}

function pushDiagClosing(L, domainLabel) {
  const topic = '이 주제(' + (domainLabel || '재물') + ')';
  L.push(DIAG_STYLE);
  L.push(
    '주제 표기: 본문 어디에든 「도메인」을 쓰지 말고, 필요할 때 「' +
      topic +
      '」 또는 「' +
      (domainLabel || '재물') +
      '」만 쓰세요.',
  );
  L.push('Part A 해부 리포트와 Part B(분석가 노트)를 **모두** 채우고 중간에 끊지 마세요.');
  L.push(
    '굵게(**…**)는 항목(불릿)마다 **가장 중요한 구절 1개**만, 많아도 2개까지. 문장 전체나 여러 구절을 다 굵게 하지 마세요.',
  );
  L.push(
    'Part B에서 오차(°)는 근거로 밝혀도 되지만, 「최강」「매우 강함」 같은 등급 이름은 만들지 마세요. 강도는 「오차가 작아 영향이 뚜렷해요」처럼 말로 풀어 주세요.',
  );
  L.push(
    '최종 점검: Part A에 행성명·행성쌍·각도명·하우스 번호·「도메인」이 있으면 고치세요. 「도메인」은 Part B에서도 「' +
      topic +
      '」로 바꾸세요.',
  );
}

function pushDiagPartA(L, name, domainLabel, focusLine, whyBullets) {
  const topic = '이 주제(' + domainLabel + ')';
  L.push('[출력 포맷 — Part A — 일상어만. 행성·각도·하우스 이름 금지. 「도메인」 금지]');
  L.push('## {이름}의 ‘' + domainLabel + '’ 해부 리포트');
  L.push('');
  L.push('> **[핵심 모순]:**');
  L.push(
    '> (어디서는 남들보다 효율이 나고, 어디서는 구조적으로 막히는지 — 그 양면성을 삶의 말로 한 문장)',
  );
  L.push('');
  L.push('### 1. 당신의 뇌와 에너지가 움직이는 방식');
  L.push(
    '* (' +
      topic +
      '에서 정보를 받아들이고 결정할 때, 남들과 다른 회로·기조가 무엇인지. “왜 이 방면에서 다르게 생각하는가”의 근본 성향. 삶 언어만)',
  );
  L.push('');
  L.push('### 2. 남들보다 타고난 복 (애쓰지 않아도 풀리는 부분)');
  L.push(
    '* (마찰 없이 흐르는 구간이 있으면: 막연한 행운이 아니라, 남들은 오래 막히는 지점을 왜 덜 버티고 통과하는지 구조로. 삶 언어만)',
  );
  L.push(
    '* (그런 연결이 거의 없으면: 없는 복을 지어내지 말고, 「' +
      topic +
      '만큼은 쉽게 되는 타고난 복이 약하다」를 정면으로)',
  );
  L.push('');
  L.push('### 3. 남들보다 유난히 안 되는 부분 (병목)');
  L.push(
    '* (힘이 서로 부딪히는 구간이 있으면: 의지 부족이 아니라 애초에 판이 그렇게 연결된 이유를 해부. 억지로 밀어붙이면 왜 더 꼬이는지. 삶 언어만)',
  );
  L.push(
    '* (긴장이 ' +
      topic +
      '에 몰려 있으면: 그 몰림을 숨기지 말고, 왜 ' +
      topic +
      '만큼은 남들처럼 안 되는지 인과로)',
  );
  L.push('');
  L.push('### 4. 이 구조를 돌파하기 위한 실전 궤도 수정');
  L.push(
    '* **[지금 당장 멈춰야 할 착각]:** 안 되는 부분을 뚫겠다고 엉뚱한 데 에너지를 쓰는 대표 오답 행동 1개 (이 사람에게 맞게)',
  );
  L.push(
    '* **[가장 효과적인 한 수]:** 타고난 복을 쓰고 안 되는 부분의 리스크를 줄이기 위해, 내일부터 적용할 구체 행동 1개 (이 사람에게 맞게)',
  );
  L.push('');
  L.push('[주제 초점] ' + focusLine);
  L.push('');
  pushWhySection(L, whyBullets);
  pushDiagClosing(L, domainLabel);
}

function buildAstroChartPrompt(payload) {
  const p = payload && typeof payload === 'object' ? payload : null;
  if (!p) throw new Error('차트 데이터가 필요합니다.');

  const L = [];
  L.push(
    '당신은 따뜻하지만 돌려 말하지 않는 전문 점성가입니다. 아래 [출생 차트]로 이 사람을 **한 사람으로 묶어** 읽어 주세요. 전문 용어는 쉬운 말로 풀어 한국어로 쓰세요. ' +
      COMMON_TONE +
      ' 건강은 의학적 진단이 아닌 생활·에너지·스트레스 관리 관점으로만 다루세요.',
  );
  L.push('');
  L.push('[읽는 순서 — 가장 중요]');
  L.push('1) 먼저 [차트의 중심 후보], **오차 3° 이내 어스펙트**, 빅3(태양·달·상승)를 본다. 이게 이 사람의 뼈대예요. 해석 전체에서 이 배치들을 가장 자주, 가장 앞에 쓴다.');
  L.push('2) 오차가 큰 어스펙트·외곽 행성의 별자리(세대 공통)는 보조로만. 세대 공통 배치로 개인 성격을 단정하지 마세요.');
  L.push('3) **교과서식 나열 금지:** 「금성이 황소자리면 ~해요」처럼 배치를 하나씩 따로 풀지 마세요. 한 문장 안에서 **두 개 이상의 배치를 엮어** 「그래서 이 사람은 이렇다」로 쓰세요. (예: 겉은 차분한데(상승) 속은 급한(달) 사람이라, …)');
  L.push('4) 근거는 문장 끝 괄호에 **배치 이름만** 짧게: 「…해요. (태양 사각 토성)」. 오차 숫자(°)·「강함」·「보조 참고」 같은 표시는 고객 글에 **절대 쓰지 마세요** (읽는 순서 판단용일 뿐이에요). 본문 문장은 생활 말로.');
  L.push('5) 같은 배치를 근거로 **3번 넘게** 쓰지 마세요. 섹션마다 그 주제에 맞는 다른 배치를 찾아 쓰세요.');
  L.push('6) 굵게(**…**)는 섹션마다 생활 말 핵심 명사 1~2개만 (예: **실행력**, **회복 루틴**). 행성·별자리·하우스 이름은 굵게 하지 마세요.');
  L.push('7) 섹션별 문장 수를 꼭 지키세요. 넘치면 실패예요. 한 문장은 짧게, 한 섹션에 근거 괄호는 2개까지.');
  L.push('');
  L.push('[작성 형식 — 반드시 지키세요]');
  L.push('## 제목만 사용(### 소제목·이모지 금지). 아래 순서대로 **모두** 작성하세요.');
  [
    '## 한눈에 보는 나 — 불릿 3줄. 이 차트의 뼈대 배치 2~3개를 삶의 말로 (예: 「- 사람을 편하게 하지만 결정은 혼자 내리는 사람이에요. (상승 천칭 · 달 전갈)」)',
    '## 성격 — 3~4문장. 빅3와 원소·모달리티를 엮어 타고난 기질',
    '## 강점 — 3~4문장. 삼각·육각·지배성 등에서 남들보다 쉽게 되는 것',
    '## 과제·성장 포인트 — 3~4문장. 사각·충 등 긴장 각이 실제 생활에서 어떻게 부딪히는지, 어떻게 다루면 좋은지',
    '## 연애·관계 — 2~3문장. 금성·달·7하우스 중심의 타고난 관계 방식',
    '## 일·적성 — 2~3문장. MC·6·10하우스·토성·화성 중심',
    '## 금전 — 2~3문장. 2·8하우스·금성·목성 중심의 돈 쓰고 모으는 성향 (투자 단정 금지)',
    '## 건강·에너지 — 2~3문장. 스트레스·회복·생활 리듬 (의학 진단 아님)',
    '## 배움·성장 — 2~3문장. 3·9하우스·수성·목성 중심의 배우는 방식',
    '## 나를 잘 쓰는 법 — 불릿 3줄. 위 내용에서 나온, 바로 해볼 수 있는 행동 하나씩',
  ].forEach((x) => L.push(x));
  L.push('반드시 마지막 섹션까지 완성하고 중간에 끊지 마세요. 출생 시간이 미상이면 하우스·상승궁 이야기는 빼고 쓰세요.');
  L.push('');
  appendChartBlock(L, p);
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
      '지금은 **재물** 주제: 자산 형성의 결함, 돈이 새는 구조, 투자·지출의 구조적 기회와 취약성에만 집중하세요. ' +
      COMMON_TONE,
  );
  L.push('');
  pushDiagPartA(
    L,
    name,
    '재물',
    '돈의 유입·누수·베팅 버릇 / 핵심 모순 / 타고난 복(없으면 결핍 고지) / 유난히 안 되는 부분 / 실전 궤도 수정. Part A는 일상어만.',
    [
      '### 근거 1 — 뇌·에너지 회로',
      '(2·5·8하우스·금성·목성·토성 등 실제로 있는 배치)',
      '### 근거 2 — 남들보다 타고난 복(삼각·육각 등). 없으면 「이 주제엔 길한 연결이 약함」을 근거로 명시. 「도메인」 금지·「이 주제(…)」 사용',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
      '### 근거 3 — 유난히 안 되는 부분(충·사각 등)과 궤도 수정',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
    ],
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[제목 이름] {이름} = 「' + name + '」. 위 [작성 원칙]과 [출력 포맷]을 그대로 지켜 작성하세요.');
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
      '지금은 **연애·관계** 주제: 관계 패턴, 상대 선택 오류, 구조적 기회와 취약성에만 집중하세요. ' +
      COMMON_TONE,
  );
  L.push('');
  pushDiagPartA(
    L,
    name,
    '연애',
    '끌림·선택·어긋남 / 핵심 모순 / 타고난 복(없으면 결핍 고지) / 유난히 안 되는 부분 / 실전 궤도 수정. 「운명의 상대」 단정 금지. Part A는 일상어만.',
    [
      '### 근거 1 — 뇌·에너지 회로',
      '(금성·달·화성·5·7하우스 등 실제로 있는 배치)',
      '### 근거 2 — 남들보다 타고난 복(삼각·육각 등). 없으면 「이 주제엔 길한 연결이 약함」을 근거로 명시. 「도메인」 금지·「이 주제(…)」 사용',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
      '### 근거 3 — 유난히 안 되는 부분(충·사각 등)과 궤도 수정',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
    ],
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[제목 이름] {이름} = 「' + name + '」. 위 [작성 원칙]과 [출력 포맷]을 그대로 지켜 작성하세요.');
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
      '지금은 **커리어** 주제: 일의 병목·번아웃·성장 방해와, 빛나는 무대(구조적 기회)에만 집중하세요. 수입액보다 일의 방식·역할. ' +
      COMMON_TONE,
  );
  L.push('');
  pushDiagPartA(
    L,
    name,
    '커리어',
    '일 방식·역할 / 핵심 모순 / 타고난 복(없으면 결핍 고지) / 유난히 안 되는 부분·번아웃 / 실전 궤도 수정. Part A는 일상어만.',
    [
      '### 근거 1 — 뇌·에너지 회로',
      '(태양·화성·토성·MC·6·10하우스 등 실제로 있는 배치)',
      '### 근거 2 — 남들보다 타고난 복(삼각·육각 등). 없으면 「이 주제엔 길한 연결이 약함」을 근거로 명시. 「도메인」 금지·「이 주제(…)」 사용',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
      '### 근거 3 — 유난히 안 되는 부분(충·사각 등)과 궤도 수정',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
    ],
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[제목 이름] {이름} = 「' + name + '」. 위 [작성 원칙]과 [출력 포맷]을 그대로 지켜 작성하세요.');
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
      '지금은 **학업·성장** 주제: 두뇌 가동, 효율 누수, 압박 결함과 구조적 학습 기회에만 집중하세요. ' +
      '학습 코치·공부법 블로그처럼 쓰지 마세요. ' +
      COMMON_TONE +
      ' 의학적 진단 아님. 「합격/불합격」 단정 금지.',
  );
  L.push('');
  pushDiagPartA(
    L,
    name,
    '학업·성장',
    '학습 스위치·누수·압박 / 핵심 모순 / 타고난 복(없으면 결핍 고지) / 유난히 안 되는 부분 / 실전 궤도 수정. Part A는 일상어만.',
    [
      '### 근거 1 — 뇌·에너지 회로',
      '(수성·목성·3·9하우스 등 실제로 있는 배치)',
      '### 근거 2 — 남들보다 타고난 복(삼각·육각 등). 없으면 「이 주제엔 길한 연결이 약함」을 근거로 명시. 「도메인」 금지·「이 주제(…)」 사용',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
      '### 근거 3 — 유난히 안 되는 부분(충·사각 등)과 궤도 수정',
      '(행성·각도 이름을 여기서 밝히고 쉬운 말로 풀기)',
    ],
  );
  L.push('');
  appendChartBlock(L, p);
  L.push('');
  L.push('[제목 이름] {이름} = 「' + name + '」. 위 [작성 원칙]과 [출력 포맷]을 그대로 지켜 작성하세요.');
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

const PROMPT_CACHE_CONTROL = { type: 'ephemeral' };

function buildAstroCachedMessages(feature, payload) {
  const full = buildAstroPrompt(feature, payload);
  const markers = ['\n[출생 차트]\n', '\n[출생 차트]'];
  for (let i = 0; i < markers.length; i += 1) {
    const idx = full.indexOf(markers[i]);
    if (idx >= 200) {
      return [{
        role: 'user',
        content: [
          { type: 'text', text: full.slice(0, idx), cache_control: PROMPT_CACHE_CONTROL },
          { type: 'text', text: full.slice(idx) },
        ],
      }];
    }
  }
  return [{ role: 'user', content: full }];
}

module.exports = {
  buildAstroChartPrompt,
  buildAstroMoneyPrompt,
  buildAstroLovePrompt,
  buildAstroCareerPrompt,
  buildAstroStudyPrompt,
  buildAstroPrompt,
  buildAstroCachedMessages,
};
