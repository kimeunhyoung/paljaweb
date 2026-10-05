/**
 * 네임코드 AI 프롬프트 (서버 조립)
 * name_opinion / name_recommend — 화면은 데이터만 payload로 보낸다.
 */

const { clientHashKey } = require('./astro-flow-ai-prompts');

function str(v) {
  return String(v == null ? '' : v).trim();
}

function clip(v, max) {
  const s = str(v);
  return s.length > max ? s.slice(0, max) : s;
}

function clipKeepNl(v, max) {
  const s = String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/[\r\u2028\u2029]/g, '\n');
  return s.length > max ? s.slice(0, max) : s;
}

function assertPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('payload가 필요합니다.');
}

const PURPOSE_DESC = {
  general: '균형 잡힌 에너지, 부르기 편한 인상',
  biz: '리더십·성취·안정·비전',
  nick_online: '기억·표현·개성·반복 호명에 유리한 인지도',
  creative: '창의·표현·무대/콘텐츠와의 조화',
  mystic: '신뢰·통찰·포용·전문성',
  athlete: '추진·체계·성취·리더십',
  educator: '전달·포용·가르침·완성',
};

function purposeExtra(scoringKey, displayLabel) {
  const L = displayLabel || '';
  const map = {
    general: '일반 개인 이름으로 평생 불릴 에너지와 인상을 중심으로 설명해주세요.',
    biz: '사업명·브랜드로서 신뢰·권위·기억 잔상이 충분한지, 반복 노출에 견디는지 평가해주세요.',
    nick_online: `온라인·닉네임 맥락(${L})에서 검색·태그·반복 호명, 짧고 기억에 남는지 평가해주세요.`,
    creative: `창작·콘텐츠·예명 맥락(${L})에서 개성·무대/작품과의 조화를 평가해주세요.`,
    mystic: `역술·상담 예명 맥락(${L})에서 신뢰·전문성·의뢰인과의 거리감이 적절한지 평가해주세요.`,
    athlete: `운동·코칭 활동명(${L})에서 추진력·결단·동기 부여 이미지가 드는지 평가해주세요.`,
    educator: `강사·교육자 이름(${L})에서 전달력·신뢰·포용이 균형 있는지 평가해주세요.`,
  };
  return map[scoringKey] || map.general;
}

function buildNameOpinionPrompt(payload) {
  assertPayload(payload);
  const purposeLabel = clip(payload.purposeLabel, 80);
  if (!purposeLabel) throw new Error('이름 목적이 필요합니다.');
  const scoringKey = clip(payload.scoringKey, 40) || 'general';
  const bucketHint = clip(payload.bucketHint, 200);
  const baseName = clip(payload.baseName, 40);
  const birthDate = clip(payload.birthDate, 20);
  const lpDesc = clip(payload.lpDesc, 300);
  const missingStr = clip(payload.missingStr, 300);
  const excessStr = clip(payload.excessStr, 300);
  const namesStr = clipKeepNl(payload.namesStr, 6000);
  if (!namesStr) throw new Error('분석된 이름이 필요합니다.');
  const topName = clip(payload.topName, 40);
  const topScore = Number(payload.topScore);
  if (!topName || !Number.isFinite(topScore)) throw new Error('추천 1위 정보가 필요합니다.');
  const cautionName = clip(payload.cautionName, 40);
  const cautionScore = Number(payload.cautionScore);
  const lpVal = payload.lpVal != null && payload.lpVal !== '' ? Number(payload.lpVal) : null;

  const openPara = lpVal != null && Number.isFinite(lpVal)
    ? `첫 문단: 이 사람의 인생여정수(${lpVal}번)가 삶에서 어떤 방향과 숙제를 갖는지 한 문장으로 짚고 시작하세요.`
    : `첫 문단: 사용자가 선택한 이름 목적(${purposeLabel})에 맞는 에너지 기준을 한 문장으로 짚고 시작하세요.`;
  const secondPara = lpVal != null && Number.isFinite(lpVal)
    ? `둘째 문단: 1위 이름이 왜 이 인생여정수와 잘 맞는지, 그리고 "${purposeLabel}" 맥락에 어떻게 맞는지 에너지 조화를 스토리로 설명하세요. ${
        missingStr ? '부족한 수를 이름이 어떻게 채워주는지도 언급하세요.' : ''
      }`
    : `둘째 문단: 1위 이름이 선택 목적 "${purposeLabel}"에 왜 잘 맞는지 수비학·소리 관점에서 설명하세요.`;

  const gap = Number.isFinite(topScore) && Number.isFinite(cautionScore) ? Math.min(topScore, 99) - Math.min(cautionScore, 99) : null;
  const compareRule = cautionName && gap != null && gap < 10
    ? `4. 1위와 가장 낮은 이름의 점수 차이가 ${gap}점으로 작아요. 낮은 이름을 깎아내리지 말고, 두 이름 모두 쓸 만하다는 전제에서 에너지 차이와 어울리는 상황을 비교해 주세요.`
    : `4. 점수가 낮은 이름이 있다면 "${purposeLabel}" 맥락이나 에너지와 덜 맞는 이유를 구체적으로, 하지만 부드럽게 설명해 주세요. 나쁜 이름이라고 단정하지 마세요.`;

  return `당신은 따뜻하고 신뢰감 있는 수비학 상담가예요. 아래 데이터만 근거로 네임코드 코멘트를 써 주세요.

[원칙]
- 해요체(~해요, ~이에요)로 쓰세요. 합니다체 금지.
- 아래에 나온 숫자·점수·부족수만 근거로 쓰고, 없는 숫자나 한자 뜻·성명학 획수 같은 다른 체계를 지어내지 마세요(한자는 주어지지 않았어요).
- 「무조건」「대박」 같은 보장 표현과 불안을 주는 단정은 쓰지 마세요.
- 이모지 금지. 굵게(**…**)는 전체에서 1~2곳만.

이름 목적(사용자 선택): ${purposeLabel}
${bucketHint ? `이 맥락에서 선호되는 에너지 방향(참고): ${bucketHint}` : ''}
${baseName ? `대상: ${baseName}\n` : ''}${birthDate ? `생년월일: ${birthDate}\n` : ''}${lpDesc ? `${lpDesc}\n` : ''}${missingStr ? `${missingStr}\n` : ''}${excessStr ? `${excessStr}\n` : ''}
분석된 이름 (종합점수 순):
${namesStr}

추천 1위: ${topName} (${Math.min(topScore, 99)}점)
${cautionName && Number.isFinite(cautionScore) ? `가장 낮은 점수의 이름: ${cautionName} (${Math.min(cautionScore, 99)}점)` : ''}

작성 지침 (반드시 따르세요):
1. ${openPara}
2. ${secondPara}
3. 다음 관점도 반영하세요: ${purposeExtra(scoringKey, purposeLabel)}
${compareRule}
5. 마지막 문장은 "이름은 평생 불리는 에너지예요. 수비학 점수와 함께 직접 소리 내어 불러 보며 느낌도 꼭 확인해 보세요."로 마무리하세요.
6. 번호·목록 없이 자연스러운 문단으로만, 3~4문단으로 쓰고 마지막 문장까지 꼭 완성하세요.`;
}

function buildRecommendPrompt(payload) {
  assertPayload(payload);
  const scoringKey = clip(payload.scoringKey, 40) || 'general';
  const purposeLabel = clip(payload.purposeLabel, 80) || '👤 일반 이름';
  const purposeDesc = clip(payload.purposeDesc, 200) || PURPOSE_DESC[scoringKey] || '';
  const surname = clip(payload.surname, 20);
  const gender = clip(payload.gender, 20) || '무관';
  const syllable = clip(payload.syllable, 20) || 'any';
  const lpLine = clip(payload.lpLine, 200);
  const missingStr = clip(payload.missingStr, 300);
  const excessStr = clip(payload.excessStr, 300);
  const energyDesc = clip(payload.energyDesc, 300);
  const extra = clip(payload.extra, 300);

  const contextBlock = [
    `목적: ${purposeLabel}`,
    purposeDesc ? `에너지 방향: ${purposeDesc}` : '',
    lpLine || '',
    missingStr || '',
    excessStr || '',
    energyDesc || '',
    extra ? `추가 요청: ${extra}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const jsonTail = `반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"names":["후보1","후보2","후보3","후보4","후보5","후보6","후보7","후보8","후보9","후보10","후보11","후보12","후보13","후보14","후보15"]}`;

  if (scoringKey === 'biz') {
    return `당신은 한국 사업명·브랜드·상호 네이밍 전문가입니다.
아래 조건에 맞는 **상호·브랜드명** 15개를 추천하세요.

**절대 금지:** 일반 사람 이름·실명 스타일 (예: 한결, 민수, 현숙, 서연, ${surname || '김'}한결, ${surname || '김'}현숙)
**금지:** 성씨+흔한 이름 2~3음절 조합

${contextBlock}
${surname ? `참고(선택): 대표 성씨 「${surname}」 — 상호에 자연스럽게 녹일 **브랜드 1~2개**만 가능. ${surname}+인명 형태 금지.` : ''}

브랜드명 가이드:
- 카페·스튜디오·샵·브랜드에 쓸 **2~5음절** 한글 상호 (예: 달빛공방, 브라운핸즈, 한결상회, 팔자랩, 별숲스튜디오)
- names 배열에는 **완성된 브랜드명 전체**를 넣으세요 (성+이름 분리 없음)
- 숫자 계산은 하지 마세요
- 이미 널리 알려진 브랜드·상표 이름을 그대로 쓰지 마세요
- 15개 모두 서로 다른 이름으로

${jsonTail}`;
  }

  if (scoringKey === 'nick_online') {
    return `당신은 온라인 닉네임·핸들·활동명 네이밍 전문가입니다.
**${purposeLabel}** 맥락의 닉네임 15개를 추천하세요.

**절대 금지:** 실명·일반 인명 (김민수, 은혜, 준호, ${surname || ''}한결 등 성+이름)
**금지:** 출생신고용 이름처럼 보이는 2~3음절 인명

${contextBlock}
- 성별 참고: ${gender} (닉네임에 성씨+이름 조합 쓰지 마세요)
${surname ? `- 성(姓) 「${surname}」 필드는 무시하거나 별칭 일부로만 자연스럽게` : ''}

가이드:
- 2~6글자, 검색·태그·반복 호명에 유리
- 한글·영문·숫자 조합 가능 (예: 별빛탐험가, codefox, 달토끼77, 라이트핸즈)
- names에는 **닉네임 전체**만
- 유명인·유명 브랜드 이름을 그대로 쓰지 마세요
- 15개 모두 서로 다른 닉네임으로

${jsonTail}`;
  }

  if (scoringKey === 'creative' || scoringKey === 'mystic' || scoringKey === 'athlete' || scoringKey === 'educator') {
    return `당신은 활동명·예명·필명 네이밍 전문가입니다.
출생신고용 **실명이 아닌** ${purposeLabel} 용 **활동명** 15개를 추천하세요.

**금지:** 민수, 지영, 현숙 같은 일반 실명만 나열
**금지:** ${surname ? `${surname}+흔한이름` : '성+흔한이름'} 형태

${contextBlock}
- 성별 참고: ${gender}

가이드:
- 무대·채널·상담실·팀에 쓸 예명·필명
- 2~5음절, 개성과 신뢰가 느껴지는 조합
- names에는 **활동명 전체**

${jsonTail}`;
  }

  return `당신은 한국 **일반 사람 이름** 전문가입니다. 아래 조건에 맞는 이름 15개를 추천하세요. 이름 텍스트만 주세요.

${contextBlock}
- 성(姓): ${surname || '미정 (성 없이 이름만)'}
- 성별: ${gender}
- 음절 수: ${syllable === 'any' ? '무관' : syllable + '음절 (이름만, 성 제외)'}

${jsonTail}

주의:
- 성이 있으면 **이름 부분만** 반환 (성 제외)
- 실제 한국에서 사용되는 사람 이름
- 성과 붙여 불렀을 때 발음이 자연스러운 이름
- 15개 모두 서로 다른 이름으로`;
}

function buildNameAiPrompt(feature, payload) {
  if (feature === 'name_opinion') return buildNameOpinionPrompt(payload);
  if (feature === 'name_recommend') return buildRecommendPrompt(payload);
  throw new Error('unknown_name_feature');
}

function resolveNameCacheKey(feature, payload) {
  const prompt = buildNameAiPrompt(feature, payload);
  if (feature === 'name_recommend') return clientHashKey('v2:' + prompt);
  return clientHashKey(prompt);
}

function buildNameCachedMessages(feature, payload) {
  return [{ role: 'user', content: buildNameAiPrompt(feature, payload) }];
}

module.exports = {
  PURPOSE_DESC,
  purposeExtra,
  buildNameOpinionPrompt,
  buildRecommendPrompt,
  buildNameAiPrompt,
  resolveNameCacheKey,
  buildNameCachedMessages,
};
