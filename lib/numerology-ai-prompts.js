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
  L.push('맨 위에 따로 제목을 달지 말고, 아래 ## 소제목 순서대로 바로 시작하세요. 짧고 분명하게 쓰고, 말을 늘리지 마세요.');
  L.push('## 오늘의 에너지 — 2~3문장. 개인일수의 뜻을 중심으로 쓰고, 「개인월수 ○인 이번 달 안에서 개인일수 ○가 어떻게 드러나는지」를 한 번만 짚어 주세요. 일반일수는 「오늘은 누구에게나 ~ 기운이 흐르는 날」처럼 한 구절로만 덧붙이세요.');
  L.push('## 연애·관계 — 2문장');
  L.push('## 일·업무 — 2문장');
  L.push('## 금전·소비 — 2문장');
  L.push('## 오늘의 한 줄 조언 — 짧고 기억하기 쉬운 한 문장');
  L.push('할 일·피할 일·달 메시지는 그대로 베끼지 말고 풀어 쓰세요. 마지막 섹션까지 꼭 완성하세요.');
  L.push('');
  L.push('[숫자의 역할 — 꼭 구분하세요]');
  L.push('- 개인일수: 오늘 하루만의 수예요. 「오늘은 ~하기 좋은 날」 같은 오늘만의 판단은 개인일수로만 하세요. 연애·관계, 일·업무, 금전·소비 섹션은 개인일수의 뜻만으로 쓰고, 숫자를 매번 다시 말할 필요는 없어요.');
  L.push('- 개인월수: 이번 달의 모든 날에 똑같이 흐르는 배경이에요. 「개인월수 ○ 덕분에 오늘 ~하기 좋은 날」처럼 오늘만의 근거로 쓰면 틀려요.');
  L.push('- 개인연도: 올해 전체의 배경이에요. 오늘 해석에서는 꼭 필요할 때만 「올해 전체에 흐르는 ~」로 한 번 언급하세요.');
  L.push('- 일반일수: 오늘 모든 사람에게 같은 수예요. 나만의 성향이나 판단 근거로 쓰지 마세요.');
  L.push('- 개인월수·개인연도·일반일수는 「오늘의 에너지」에서만 언급하고, 다른 섹션에서는 다시 꺼내지 마세요.');
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
  L.push('맨 위에 따로 제목을 달지 말고, 아래 ## 소제목 순서대로 바로 시작하세요. 짧고 분명하게 쓰고, 말을 늘리지 마세요.');
  L.push('## 이번 달 전체 흐름 — 2~3문장. 개인월수의 뜻을 중심으로 쓰고, 「개인연도 ○인 올해 안에서 개인월수 ○가 어떻게 드러나는지」를 한 번만 짚어 주세요.');
  L.push('## 연애·관계 — 2~3문장 (가족·가까운 사람 포함)');
  L.push('## 일·업무 — 2~3문장');
  L.push('## 금전·생활 — 2~3문장 (수입·지출·소비 관리 중심)');
  L.push('## 이번 달 실천 포인트 — 「- 」로 시작하는 구체적 행동 3가지');
  L.push('이번 달 메시지는 그대로 베끼지 말고 풀어 쓰세요. 마지막 섹션까지 꼭 완성하세요.');
  L.push('');
  L.push('[숫자의 역할 — 꼭 구분하세요]');
  L.push('- 개인월수: 이번 달만의 수예요. 「이번 달은 ~하기 좋은 달」 같은 이번 달만의 판단은 개인월수로만 하세요.');
  L.push('- 개인연도: 올해의 모든 달에 똑같이 흐르는 배경이에요. 「개인연도 ○ 덕분에 이번 달 ~」처럼 이번 달만의 근거로 쓰면 틀려요. 「이번 달 전체 흐름」에서만 언급하세요.');
  L.push('- 특정 날짜를 지정하거나 날짜별 숫자를 새로 계산해 넣지 마세요.');
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
