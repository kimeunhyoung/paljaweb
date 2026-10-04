/**
 * 수비학 달력 AI 프롬프트 (서버 조립)
 * 화면은 숫자·가이드 데이터만 payload로 보내고, 지시문·캐시키는 여기서 만든다.
 */

const { clientHashKey } = require('./astro-flow-ai-prompts');

function str(v) {
  return String(v == null ? '' : v).trim();
}

function clip(v, max) {
  const s = str(v);
  return s.length > max ? s.slice(0, max) : s;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function assertPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('payload가 필요합니다.');
}

function birthParts(payload) {
  const b = payload.birth && typeof payload.birth === 'object' ? payload.birth : {};
  const y = num(b.y);
  const m = num(b.m);
  const d = num(b.d);
  if (y == null || m == null || d == null) throw new Error('생년월일이 필요합니다.');
  return { y, m, d };
}

const NUM_KEYWORDS =
  '1 시작·독립 / 2 협력·기다림 / 3 표현·확장 / 4 안정·기반 / 5 변화·자유 / 6 돌봄·책임 / 7 성찰·탐구 / 8 성취·실행 / 9 정리·마무리 / 11 직관·영감 / 22 큰 설계·건설 / 33 나눔·치유';

function commonRules(L) {
  L.push('[원칙]');
  L.push('- 해요체(~해요, ~이에요)로 다정하게 쓰세요. 합니다체 금지.');
  L.push('- 단정적 예언·공포 조장·「무조건」「대박」 같은 보장 표현 금지. 참고용·자기이해 톤으로 써 주세요.');
  L.push('- 숫자의 뜻은 아래 [숫자 키워드]를 기준으로 쓰고, 다른 뜻을 새로 지어내지 마세요. [기본 정보]에 없는 숫자도 만들지 마세요.');
  L.push('- 읽는 사람의 직업·연애 상태·가족 상황을 단정하지 마세요. 필요하면 「연인이 있다면 / 혼자라면」처럼 경우를 나눠 써 주세요.');
  L.push('- 금전은 생활 속 수입·지출·소비 관리 수준으로만 쓰고, 투자 종목·수익을 단정하지 마세요.');
  L.push('- 이모지 금지. 굵게(**…**)는 섹션마다 핵심 구절 1개만.');
  L.push('');
  L.push('[숫자 키워드]');
  L.push(NUM_KEYWORDS);
  L.push('');
}

function buildDailyAiPrompt(payload) {
  assertPayload(payload);
  const birth = birthParts(payload);
  const dateLabel = clip(payload.dateLabel, 80);
  if (!dateLabel) throw new Error('대상 날짜가 필요합니다.');
  const personalYear = num(payload.personalYear);
  const personalMonth = num(payload.personalMonth);
  const personalDay = num(payload.personalDay);
  const universalDay = num(payload.universalDay);
  if (personalYear == null || personalMonth == null || personalDay == null || universalDay == null) {
    throw new Error('수비학 숫자가 필요합니다.');
  }
  const guide = payload.guide && typeof payload.guide === 'object' ? payload.guide : {};
  const guideKey = clip(guide.key, 40);
  const guideDo = clip(guide.do, 300);
  const guideDont = clip(guide.dont, 300);
  const monthMessage = clip(payload.monthMessage, 300);
  if (!guideKey || !guideDo || !guideDont || !monthMessage) {
    throw new Error('가이드 데이터가 필요합니다.');
  }

  const L = [];
  L.push('당신은 따뜻하고 통찰력 있는 수비학 상담가예요. 아래 [기본 정보]의 숫자만 근거로 오늘의 운세를 한국어로 써 주세요.');
  L.push('');
  commonRules(L);
  L.push('[작성 형식 — 반드시 지키세요]');
  L.push('## 제목만 쓰고, 아래 순서대로 모두 작성하세요.');
  L.push('## 오늘의 에너지 — 개인일수를 중심으로, 개인월수·개인연도가 깔아 주는 배경과 일반일수(그날 모두에게 공통으로 흐르는 수)를 연결해 2~3문장');
  L.push('## 연애·관계 — 3~4문장');
  L.push('## 일·업무 — 3~4문장');
  L.push('## 금전·소비 — 3~4문장');
  L.push('## 오늘의 한 줄 조언 — 짧고 기억하기 쉬운 한 문장');
  L.push('각 섹션에 숫자 근거를 1개 이상 자연스럽게 넣으세요(예: 「개인일수 9의 정리 흐름이라…」). 할 일·피할 일·달 메시지는 그대로 베끼지 말고 풀어 쓰세요. 마지막 섹션까지 꼭 완성하세요.');
  L.push('');
  L.push('[기본 정보]');
  L.push(`생년월일: ${birth.y}년 ${birth.m}월 ${birth.d}일`);
  L.push(`대상 날짜: ${dateLabel}`);
  L.push(
    `개인연도: ${personalYear} / 개인월수: ${personalMonth} / 개인일수: ${personalDay} / 일반일수: ${universalDay}`,
  );
  L.push(`오늘 키워드: ${guideKey}`);
  L.push(`이번 달 배경: ${monthMessage}`);
  L.push(`기본 할 일: ${guideDo}`);
  L.push(`기본 피할 일: ${guideDont}`);
  return L.join('\n');
}

function buildMonthlyAiPrompt(payload) {
  assertPayload(payload);
  const birth = birthParts(payload);
  const year = num(payload.year);
  const month = num(payload.month);
  if (year == null || month == null) throw new Error('대상 연월이 필요합니다.');
  const personalYear = num(payload.personalYear);
  const personalMonth = num(payload.personalMonth);
  if (personalYear == null || personalMonth == null) throw new Error('수비학 숫자가 필요합니다.');
  const monthMessage = clip(payload.monthMessage, 300);
  if (!monthMessage) throw new Error('월 메시지가 필요합니다.');

  const L = [];
  L.push('당신은 따뜻하고 통찰력 있는 수비학 상담가예요. 아래 [기본 정보]의 숫자만 근거로 이번 달 흐름을 한국어로 써 주세요.');
  L.push('');
  commonRules(L);
  L.push('[작성 형식 — 반드시 지키세요]');
  L.push('## 제목만 쓰고, 아래 순서대로 모두 작성하세요.');
  L.push('## 이번 달 전체 흐름 — 개인월수를 중심으로, 개인연도가 깔아 주는 한 해의 배경과 연결해 2~3문장');
  L.push('## 연애·관계 — 3~4문장 (가족·가까운 사람 포함)');
  L.push('## 일·업무 — 3~4문장');
  L.push('## 금전·생활 — 3~4문장 (수입·지출·소비 관리 중심)');
  L.push('## 이번 달 실천 포인트 — 「- 」로 시작하는 구체적 행동 3가지');
  L.push('각 섹션에 숫자 근거를 1개 이상 자연스럽게 넣으세요. 이번 달 메시지는 그대로 베끼지 말고 풀어 쓰세요. 마지막 섹션까지 꼭 완성하세요.');
  L.push('');
  L.push('[기본 정보]');
  L.push(`생년월일: ${birth.y}년 ${birth.m}월 ${birth.d}일`);
  L.push(`대상: ${year}년 ${month}월`);
  L.push(`개인연도: ${personalYear} / 개인월수: ${personalMonth}`);
  L.push(`이번 달 메시지: ${monthMessage}`);
  return L.join('\n');
}

function buildNumerologyAiPrompt(feature, payload) {
  if (feature === 'numerology_daily') return buildDailyAiPrompt(payload);
  if (feature === 'numerology_monthly') return buildMonthlyAiPrompt(payload);
  throw new Error('unknown_numerology_feature');
}

function resolveNumerologyCacheKey(feature, payload) {
  assertPayload(payload);
  const mode = feature === 'numerology_daily' ? 'daily' : 'monthly';
  const baseKey = clip(payload.baseKey, 40);
  const birthDate = clip(payload.birthDate, 20);
  if (!baseKey || !birthDate) throw new Error('캐시 키가 필요합니다.');
  const prompt = buildNumerologyAiPrompt(feature, payload);
  return clientHashKey(`v1:${mode}:${baseKey}:${birthDate}:${prompt}`);
}

function buildNumerologyCachedMessages(feature, payload) {
  const full = buildNumerologyAiPrompt(feature, payload);
  const idx = full.indexOf('\n[기본 정보]');
  if (idx >= 80) {
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
  buildDailyAiPrompt,
  buildMonthlyAiPrompt,
  buildNumerologyAiPrompt,
  resolveNumerologyCacheKey,
  buildNumerologyCachedMessages,
};
