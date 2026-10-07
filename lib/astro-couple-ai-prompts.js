/**
 * 점성학 커플 궁합 AI 프롬프트 (서버 조립)
 * 화면은 이름·데이터 줄만 payload로 보내고, 지시문·캐시키는 여기서 만든다.
 */

const { clientHashKey } = require('./astro-flow-ai-prompts');

function str(v) {
  return String(v == null ? '' : v).trim();
}

function clip(v, max) {
  const s = str(v);
  return s.length > max ? s.slice(0, max) : s;
}

function sanitizeLines(arr, maxItems) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxItems || 120).map((line) => {
    if (line == null) return '';
    const s = String(line).replace(/[\r\n\u2028\u2029]+/g, ' ');
    if (!String(s).trim()) return '';
    return s.length > 500 ? s.slice(0, 500) : s;
  });
}

function coupleInstructionLines(nameA, nameB) {
  const a = clip(nameA, 40) || 'A';
  const b = clip(nameB, 40) || 'B';
  const L = [];
  L.push(
    '당신은 따뜻하지만 돌려 말하지 않는 전문 점성가입니다. 아래 두 사람의 시너스트리(궁합)를 한국어로 해석해 주세요. ' +
      '답변은 해요체(~해요, ~이에요)로 쓰세요. 점성 용어는 화면과 같게 합·육각·사각·삼각·충으로 쓰고, 트라인·스퀘어·섹스타일 같은 외래어 표기는 쓰지 마세요. ' +
      '하우스는 「의미 (N하우스)」만 (예: 상대·계약 (7하우스)). 「7하우스」만 단독으로 쓰지 마세요. ' +
      '「헤어진다」「결혼한다」「천생연분이다」 같은 단정·운명 판정과 공포 조장은 금지예요. 두 사람의 관계 형태(연인·부부·썸 등)를 단정하지 말고 「두 사람」「관계」로 쓰세요.',
  );
  L.push('');
  L.push('[읽는 법 — 가장 중요]');
  L.push('1) 시너스트리 각은 오차가 작은 순서예요. 위쪽(오차 3° 이내)을 중심으로 쓰고, 아래쪽은 보조로만.');
  L.push(
    '2) 「하우스 겹침」은 한 사람의 행성이 상대의 어느 삶의 영역을 건드리는지예요. 고객 문장에는 「의미 (N하우스)」로: 상대·계약 (7하우스)·연애·창작 (5하우스)·공유·변화 (8하우스)는 애정·친밀감, 집·기반 (4하우스)는 집·편안함, 일·지위 (10하우스)는 사회적 역할, 일상·업무 (6하우스)는 일상 습관. 각과 함께 엮어서 쓰세요.',
  );
  L.push('3) 누가 누구에게 어떻게 느끼는지 방향을 살려 쓰세요. (예: 「' + a + ' 님은 ' + b + ' 님에게서 ~를 느끼기 쉬워요」)');
  L.push(
    '4) 아래 데이터에 없는 행성·각·하우스는 지어내지 마세요. 근거는 문장 끝 괄호에 짧게(예: (' +
      a +
      ' 금성 삼각 ' +
      b +
      ' 화성)), 섹션마다 1~2개만. 오차 숫자는 쓰지 마세요.',
  );
  L.push('5) 근거가 약한 섹션은 「이 부분은 큰 신호가 없어 무난한 편이에요」처럼 짧고 솔직하게. 억지로 채우지 마세요.');
  L.push('6) 굵게(**…**)는 섹션마다 짧은 핵심 구절 1개만 (문장 전체 굵게 금지).');
  L.push(
    '7) 섹션별 문장 수를 꼭 지키세요. 두 사람이 같은 별자리에 같은 행성이 있으면 「둘 다 ○○자리 달이라」처럼 분명하게 쓰고, 「같은 자리에 있진 않지만」처럼 헷갈리는 말은 쓰지 마세요.',
  );
  L.push(
    '8) 「[시간 미상 — 참고]」가 붙은 각은 출생 시간을 몰라 달 위치가 정확하지 않은 것이에요. 핵심 근거로 쓰지 말고, 쓰더라도 「출생 시간을 알면 더 정확해요」처럼 조심스럽게만 언급하세요.',
  );
  L.push('');
  L.push('[작성 형식 — 반드시 지키세요]');
  L.push('## 제목만 사용(### 소제목·이모지 금지). 아래 순서대로 **모두** 작성하세요.');
  [
    '## 한눈에 보는 두 사람 — 아래 3줄 그대로의 형식으로: 「- **가장 큰 끌림:** …」 「- **조심할 지점:** …」 「- **이 관계의 장점:** …」 (각 한 문장, 쉬운 말)',
    '## 끌림·케미 — 3~4문장. 금성·화성·태양·상승 연결로 서로에게 끌리는 이유',
    '## 정서·안정감 — 2~3문장. 달 연결로 함께 있을 때 편안한지, 감정 리듬이 맞는지',
    '## 소통·갈등 — 3~4문장. 수성·화성·사각·충으로 대화 방식, 자주 부딪히는 지점, 화해하는 법',
    '## 오래가는 힘 — 2~3문장. 토성·목성 연결로 신뢰·책임·서로를 키워 주는 힘',
    '## 생활·돈 맞추기 — 2~3문장. 생활 습관·돈 쓰는 방식이 맞는지 (하우스 겹침·금성·토성 근거, 단정 금지)',
    '## 관계를 키우는 법 — 불릿 3줄. 위 내용에서 나온, 두 사람이 바로 해볼 수 있는 행동',
  ].forEach((x) => L.push(x));
  L.push('반드시 마지막 섹션까지 완성하고 중간에 끊지 마세요.');
  L.push('');
  return L;
}

function assertPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('payload가 필요합니다.');
}

function buildCoupleAiPrompt(payload) {
  assertPayload(payload);
  const nameA = clip(payload.nameA, 40);
  const nameB = clip(payload.nameB, 40);
  if (!nameA || !nameB) throw new Error('두 사람 이름이 필요합니다.');
  const dataLines = sanitizeLines(payload.dataLines, 120);
  if (!dataLines.length) throw new Error('궁합 차트 데이터가 필요합니다.');
  return coupleInstructionLines(nameA, nameB).concat(dataLines).join('\n');
}

function resolveCoupleCacheKey(payload) {
  return clientHashKey('v2:couple:' + buildCoupleAiPrompt(payload));
}

function buildCoupleCachedMessages(payload) {
  const full = buildCoupleAiPrompt(payload);
  const idx = full.indexOf('\n[');
  if (idx >= 200) {
    return [
      {
        role: 'user',
        content: [
          { type: 'text', text: full.slice(0, idx), cache_control: { type: 'ephemeral' } },
          { type: 'text', text: full.slice(idx) },
        ],
      },
    ];
  }
  return [{ role: 'user', content: full }];
}

module.exports = {
  coupleInstructionLines,
  buildCoupleAiPrompt,
  resolveCoupleCacheKey,
  buildCoupleCachedMessages,
};
