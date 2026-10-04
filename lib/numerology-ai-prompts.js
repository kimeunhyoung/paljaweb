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
  L.push(
    '당신은 따뜻하고 통찰력 있는 수비학 전문가입니다. 아래 숫자를 바탕으로 오늘의 운세를 한국어로 써 주세요. 단정적 예언·공포 조장은 금지하고, 참고용·자기이해 톤으로 다정하게 써 주세요.',
  );
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
  L.push('');
  L.push('[작성 형식 — 반드시 지키세요]');
  L.push('1) ## 제목만 사용. 아래 순서대로 작성하세요.');
  [
    '## 오늘의 에너지 — 개인일수·일반일수를 연결한 하루 전체 흐름(2~3문장)',
    '## 연애·관계 — 오늘 대인·연애 실전 조언',
    '## 일·업무·커리어 — 오늘 일과·업무 흐름',
    '## 금전·소비 — 오늘 수입·지출·소비 주의·기회',
    '## 오늘의 한 줄 조언 — 짧고 기억하기 쉬운 한 문장',
  ].forEach((s, i) => L.push(`   ${i + 1}. ${s}`));
  L.push('2) 각 섹션 3~4문장(한 줄 조언은 1문장). 숫자 근거를 최소 1개 이상 언급하세요.');
  L.push('3) 위 할 일·피할 일을 그대로 복사하지 말고, 수비학 숫자에 맞게 새로 풀어 쓰세요.');
  L.push('4) 반드시 마지막 섹션까지 완성하세요.');
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
  L.push(
    '당신은 따뜻하고 통찰력 있는 수비학 전문가입니다. 아래 숫자를 바탕으로 이번 달 흐름을 한국어로 써 주세요. 단정적 예언·공포 조장은 금지하고, 참고용 톤으로 다정하게 써 주세요.',
  );
  L.push('');
  L.push('[기본 정보]');
  L.push(`생년월일: ${birth.y}년 ${birth.m}월 ${birth.d}일`);
  L.push(`대상: ${year}년 ${month}월`);
  L.push(`개인연도: ${personalYear} / 개인월수: ${personalMonth}`);
  L.push(`이번 달 메시지: ${monthMessage}`);
  L.push('');
  L.push('[작성 형식 — 반드시 지키세요]');
  L.push('1) ## 제목만 사용. 아래 순서대로 작성하세요.');
  [
    '## 이번 달 전체 흐름 — 개인월수·개인연도 연결(2~3문장)',
    '## 연애·관계 — 이 달 관계·가족 테마',
    '## 일·업무·커리어 — 이 달 업무·커리어 방향',
    '## 금전·재물 — 이 달 재정·소비·투자 흐름',
    '## 이번 달 실천 포인트 — 구체적 행동 2~3가지',
  ].forEach((s, i) => L.push(`   ${i + 1}. ${s}`));
  L.push('2) 각 섹션 3~4문장. 숫자 근거를 최소 1개 이상 언급하세요.');
  L.push('3) 위 월 메시지를 그대로 복사하지 말고 새로 풀어 쓰세요.');
  L.push('4) 반드시 마지막 섹션까지 완성하세요.');
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
