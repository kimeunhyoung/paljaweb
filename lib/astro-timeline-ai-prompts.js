/**
 * 점성학 5년 타임라인 AI 프롬프트 (서버 조립)
 * RAW JSON은 화면에서 계산해 보내고, SYSTEM·지시문·캐시키는 여기서 만든다.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { clientHashKey } = require('./astro-flow-ai-prompts');

function loadPromptV2() {
  const src = fs.readFileSync(path.join(__dirname, '../public/js/ai-raw-timeline-prompt-v2.js'), 'utf8');
  const sandbox = { window: {}, global: {} };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.runInNewContext(src, sandbox);
  if (!sandbox.AiRawTimelinePromptV2 || typeof sandbox.AiRawTimelinePromptV2.buildCustomerPrompt !== 'function') {
    throw new Error('ai_raw_prompt_v2_load_failed');
  }
  return sandbox.AiRawTimelinePromptV2;
}

const PromptV2 = loadPromptV2();

function str(v) {
  return String(v == null ? '' : v).trim();
}

function clip(v, max) {
  const s = str(v);
  return s.length > max ? s.slice(0, max) : s;
}

function assertPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('payload가 필요합니다.');
}

function appendMainExtras(prompt, aiRaw, hasProfessional) {
  let out = prompt;
  const w = aiRaw && aiRaw.window;
  if (w && w.fromYm && w.toYm) {
    const y0 = Number(String(w.fromYm).slice(0, 4));
    const y1 = Number(String(w.toYm).slice(0, 4));
    if (Number.isFinite(y0) && Number.isFinite(y1) && y1 >= y0) {
      const years = [];
      for (let y = y0; y <= y1; y++) years.push(y + '년');
      out +=
        '\n\n[연도·시기 필수]\n' +
        '- 기간(fromYm~toYm): ' +
        w.fromYm +
        ' ~ ' +
        w.toYm +
        '\n' +
        '- `## 연도별 해석`에 **' +
        years.join(', ') +
        '** 를 모두 오름차순으로 포함 (첫 해 생략 금지).\n' +
        '- 계절·월만 쓸 때 **연도 필수** (✗ `가을부터` ✓ `2026년 가을(9~11월)부터`).\n' +
        '- JSON 키 `window`는 기간 데이터일 뿐 — 고객 문장에 `창구`·`창이 열` 등으로 쓰지 마라.';
    }
  }
  const urItems = aiRaw && aiRaw.utilizeRecommendations && aiRaw.utilizeRecommendations.items;
  if (urItems && urItems.length) {
    out +=
      '\n- `## 5년 중 언제` 항목은 utilizeRecommendations.items **' +
      urItems.length +
      '개 안에서만** (목록 밖 추가 금지). 시기가 겹치고 주제가 비슷한 항목은 **한 줄로 합쳐** 개수를 줄여도 돼요.';
  }
  if (hasProfessional) {
    out +=
      '\n\n[상담사용 근거 줄 — 이 요청에만 적용]\n' +
      '- `## 연도별 해석`에서 **★·◆ 표시가 붙은 해마다 빠짐없이**(◆ 해도 포함), 그 해 블록 **맨 끝**에 근거 한 줄을 붙인다. 형식: `> 근거: 토성–중천 사각 (2027년 6~9월 정점)`\n' +
      '- 근거는 transitEpisodes·progMoonEvents의 **lineKo와 peakYm**에서 그 해 가장 강한 것 **1~2개만** 옮겨 쓴다. JSON에 없는 행성·각을 만들지 마라.\n' +
      '- 각 이름은 합·육각·사각·삼각·충으로 쓴다 (육합 → 육각). orb·숫자 각도·영문 키는 쓰지 마라.\n' +
      '- 행성·각 이름은 **이 근거 줄에서만** 허용. 5년 전체 스토리·본문 문장·「5년 중 언제」 섹션에는 넣지 마라. 표시 없는 해에는 근거 줄을 넣지 마라.';
  }
  out +=
    '\n\n[말투] ' +
    '답변은 해요체(~해요, ~이에요)로 쓰세요. 점성 용어는 화면과 같게 합·육각·사각·삼각·충으로 쓰고, 트라인·스퀘어·섹스타일 같은 외래어 표기는 쓰지 마세요.';
  return out;
}

function appendTopicExtras(prompt, aiRaw, topicLabel) {
  let out = prompt;
  const w = aiRaw && aiRaw.window;
  if (w && w.fromYm && w.toYm) {
    out += '\n\n[기간] ' + w.fromYm + ' ~ ' + w.toYm;
  }
  const domInfo =
    aiRaw && aiRaw.domainScan && aiRaw.domainScan.domains
      ? Object.keys(aiRaw.domainScan.domains)
          .map((k) => {
            const d = aiRaw.domainScan.domains[k];
            return d.labelKo + '(' + d.level + ')';
          })
          .join(', ')
      : '신호 약함';
  const urCount =
    aiRaw && aiRaw.utilizeRecommendations && aiRaw.utilizeRecommendations.items
      ? aiRaw.utilizeRecommendations.items.length
      : 0;
  const urHint =
    urCount > 0
      ? '추천 실행 시기 ' + urCount + '개를 bullet 1~4개로 쓴다.'
      : '추천 실행 시기 목록이 **비어 있음** — 「적극 권장할 만한 실행 시기가 뚜렷하지 않아요」처럼 자연스럽게만 쓴다.';
  out +=
    '\n\n[주제 상세 모드 — 「' +
    topicLabel +
    '」만]\n' +
    '위 JSON은 **' +
    topicLabel +
    '** 주제만 필터한 5년 raw입니다. 5년 전체 스토리·연도별 해석·다른 주제 **절대 금지**.\n' +
    'domainScan(주제 판정): ' +
    domInfo +
    '\n' +
    '출력 첫 줄: **' +
    topicLabel +
    ' · 5년 흐름** (단독). 그다음 **3섹션만**:\n' +
    '## 이 주제 한 줄기\n## 시기별 흐름\n## 활용·주의\n' +
    '「시기별 흐름」: window 구간에서 **' +
    topicLabel +
    '** 관련 eps·peakYm·progMoon이 있는 달·계절마다 **2~3문장** (최소 2블록). 시기 줄은 `2027년 봄(3~5월)` 형태.\n' +
    '「활용·주의」: ' +
    urHint +
    ' 무리하면 안 되는 때 1~2문장.\n' +
    '신호가 weak/none이면 「이 5년엔 ' +
    topicLabel +
    ' 쪽 신호가 뚜렷하지 않음」을 먼저 밝히고, 있는 eps만 짧게.\n' +
    '**고객 본문에 JSON 키·필드명(utilizeRecommendations, domainScan, items 등)·백틱 코드명 출력 금지.**\n' +
    '**굵게(`**…**`) = 시기 핵심 명사 1~2개만.** 조언 문장 굵게 금지.\n\n[말투] ' +
    '답변은 해요체(~해요, ~이에요)로 쓰세요. 점성 용어는 화면과 같게 합·육각·사각·삼각·충으로 쓰고, 트라인·스퀘어·섹스타일 같은 외래어 표기는 쓰지 마세요.';
  return out;
}

function buildTimelineAiPrompt(payload) {
  assertPayload(payload);
  const aiRaw = payload.aiRaw;
  if (!aiRaw || typeof aiRaw !== 'object') throw new Error('타임라인 RAW 데이터가 필요합니다.');
  const base = PromptV2.buildCustomerPrompt(aiRaw);
  return appendMainExtras(base, aiRaw, !!payload.hasProfessional);
}

function buildTimelineTopicAiPrompt(payload) {
  assertPayload(payload);
  const aiRaw = payload.aiRaw;
  if (!aiRaw || typeof aiRaw !== 'object') throw new Error('타임라인 RAW 데이터가 필요합니다.');
  const topicLabel = clip(payload.topicLabel, 40);
  if (!topicLabel) throw new Error('주제가 필요합니다.');
  const base = PromptV2.buildCustomerPrompt(aiRaw);
  return appendTopicExtras(base, aiRaw, topicLabel);
}

function buildTimelinePromptForFeature(feature, payload) {
  if (feature === 'astro_timeline_topic') return buildTimelineTopicAiPrompt(payload);
  if (feature === 'astro_timeline') return buildTimelineAiPrompt(payload);
  throw new Error('unknown_timeline_feature');
}

function resolveTimelineCacheKey(payload, prompt) {
  assertPayload(payload);
  const cacheKeyRaw = clip(payload.cacheKeyRaw, 500);
  if (!cacheKeyRaw) throw new Error('cacheKeyRaw가 필요합니다.');
  const p = prompt != null ? String(prompt) : buildTimelinePromptForFeature(payload.feature || 'astro_timeline', payload);
  return clientHashKey(cacheKeyRaw + ':' + p.slice(0, 400));
}

function buildTimelineCachedMessages(feature, payload) {
  return [{ role: 'user', content: buildTimelinePromptForFeature(feature, payload) }];
}

module.exports = {
  PromptV2,
  buildTimelineAiPrompt,
  buildTimelineTopicAiPrompt,
  buildTimelinePromptForFeature,
  resolveTimelineCacheKey,
  buildTimelineCachedMessages,
};
