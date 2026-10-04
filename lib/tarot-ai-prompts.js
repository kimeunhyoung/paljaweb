'use strict';
/**
 * Server-side consumer Tarot.html AI prompts (tarot_reading_*).
 */

const MAX_STR = 2000;
const MAX_CARDS = 10;

const EOPT_READING_TITLE = {
  daily: '데일리 · 오늘의 흐름',
  month: '이번 달 에너지',
  next_month: '다음 달 준비',
  year: '올해 에너지 흐름',
};

function clip(s, n) {
  const t = String(s == null ? '' : s);
  return t.length > n ? t.slice(0, n) : t;
}

function escAttr(s) {
  return String(s == null ? '' : s).replace(/"/g, '');
}

function expectedTarotFeature(cardCount) {
  const n = Number(cardCount) || 1;
  if (n <= 1) return 'tarot_reading_basic';
  if (n <= 3) return 'tarot_reading';
  return 'tarot_reading_plus';
}

function buildTarotAiPrompt(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('invalid_payload');
  }
  if (!Array.isArray(payload.cards) || !payload.cards.length) {
    throw new Error('cards_required');
  }
  if (payload.cards.length > MAX_CARDS) throw new Error('too_many_cards');

  const cards = payload.cards.map(function (c, i) {
    if (!c || typeof c !== 'object') throw new Error('invalid_card');
    return {
      id: c.id != null ? c.id : c.num,
      name: clip(c.name, 120),
      faceRev: !!(c.faceRev || c.rev),
      keywords: clip(c.keywords, 400),
      pos: clip(c.pos != null ? c.pos : (payload.positions && payload.positions[i]) || i + 1, 80),
    };
  });

  const feature = payload._feature;
  if (feature) {
    const expected = expectedTarotFeature(cards.length);
    if (feature !== expected) throw new Error('feature_card_mismatch');
  }

  const mode = payload.mode === 'energy' ? 'energy' : 'question';
  const eopt = clip(payload.eopt || '', 40);
  const qTrim = clip(payload.question, MAX_STR);
  const topic = clip(payload.topicLabel || '', 80);
  const skipToday = !!payload.skipTodayEnergy;

  const cardLines = cards
    .map(function (c) {
      return (
        '  <card pos="' +
        escAttr(c.pos) +
        '">' +
        c.id +
        '. ' +
        c.name +
        (c.faceRev ? ' (역방향)' : ' (정방향)') +
        (c.keywords ? ' — 정방향 키워드: ' + c.keywords : '') +
        '</card>'
      );
    })
    .join('\n');

  let modeLine = '';
  let periodHint = '';
  if (mode === 'energy') {
    modeLine =
      '- 모드: 에너지 흐름 · ' + (EOPT_READING_TITLE[eopt] || eopt || '흐름') + '\n';
    if (eopt === 'daily') {
      periodHint =
        '- 데일리: 앞 3장은 오늘 시간 흐름(시작→중심→이어짐), 4번째는 힘이 되는 에너지, 5번째는 오늘의 주의로 읽을 것.\n' +
        '- 가능하면 오전/오후/저녁 중 어디에 힘이 모이는지 한 번씩만 짚을 것.\n';
    } else if (eopt === 'month' || eopt === 'next_month') {
      periodHint =
        '- 월간: 시작·핵심·정리 흐름으로 읽되, “이번/다음 달에 실제로 손대볼 일”이 보이게.\n';
    } else if (eopt === 'year') {
      periodHint = '- 연간: 큰 테마와 분기점 위주로. 너무 잘게 쪼개지 말 것. 카드에 근거 없는 구체적인 월·날짜를 지어내지 말 것.\n';
    }
  } else {
    modeLine =
      '- 모드: 질문 리딩\n' +
      (topic ? '- 주제 카테고리: ' + topic + '\n' : '') +
      (qTrim
        ? '- 고객이 적은 질문(이 문장에만 답할 것): ' + qTrim + '\n'
        : '- 고객이 질문을 적지 않았어요. ' + (topic ? '「' + topic + '」 주제에서 ' : '') + '지금 상황의 흐름과 다음 한 걸음을 읽어 주세요.\n');
    periodHint =
      '- 질문에 대한 결론을 피하지 말 것. “마음먹기에 달렸다” 같은 일반론으로 도망가지 말 것.\n' +
      '- 카드가 보여주는 방향성(예: 수강 쪽이 우세 / 보류에 가깝다)은 분명하게 말하되, 사용자가 실제로 내려야 할 최종 결정과 구분할 것.\n' +
      '- “등록하세요”, “그만두세요”, “반드시 하세요”처럼 카드 근거보다 강한 행동 명령으로 확대하지 말 것.\n' +
      (qTrim ? '- 주제 카테고리만 보고 일반론으로 쓰지 말 것. 반드시 위에 적힌 구체 질문을 중심으로.\n' : '') +
      '- 질문에 없는 상황·과거사·의도·행동(연애·직장·이미 마음먹은 결정 등)을 지어내지 말 것.\n';
  }

  let numXml = '';
  const num = payload.numerology;
  if (num && num.year != null) {
    const dayPart = skipToday ? '' : ', 오늘 ' + num.day + '번';
    numXml =
      '<numerology_lens year="' +
      escAttr(num.year) +
      '" month="' +
      escAttr(num.month) +
      '" day="' +
      escAttr(num.day) +
      '">\n' +
      '  올해 ' +
      num.year +
      '번 · 이번 달 ' +
      num.month +
      '번' +
      dayPart +
      '.\n' +
      '  수비 숫자를 따로 나열·전용 섹션으로 쓰지 말 것.\n' +
      '  대신 한 줄 요약과 흐름 문장 안에 “왜 이 사람에게 이 카드가 더 세게/비틀려 오는지”를 수비 렌즈 1개로 녹일 것.\n' +
      '  예: 이번 달 1번이 ‘새 판’을 재촉하는데 카드는 멈춤이면, 조급함이 결정을 망칠 수 있다고 연결.\n' +
      '</numerology_lens>\n';
  }

  return (
    '<role>\n' +
    '당신은 라이더–웨이트 전통의 타로 리더다. 고객에게 바로 말하는 존댓말(해요체).\n' +
    '무료 사이트처럼 카드 사전 뜻을 나열하지 않는다. 이 자리·이 질문에만 맞는 장면을 그린다.\n' +
    '뜬구름 위로·이모지·긴 면책·“좋은 일이 생깁니다”류 모호한 예언 금지.\n' +
    '</role>\n\n' +
    '<quality_bar>\n' +
    '1) 각 카드마다 (a) 자리 이름 (b) 카드 이름·정역 (c) “이 자리라서” 한 줄 — 세 가지가 있어야 함.\n' +
    '2) 각 카드는 먼저 해당 포지션과 질문을 기준으로 독립적으로 해석한다. 카드 사이에 실제로 반복·대조·강화·전환되는 의미가 있을 때만 연결한다. 앞 카드가 다음 카드의 원인이라고 자동 가정하지 말고, 연결 근거가 약하면 억지로 하나의 인과·서사로 묶지 말 것.\n' +
    '3) 조언은 질문과 카드에서 실제로 필요한 경우에만 구체화한다. 카드가 지지하지 않는 행동 계획·습관·전략을 리딩을 풍성하게 만들기 위해 새로 만들어내지 말 것.\n' +
    '4) 추상어(“균형”“긍정”“흐름”)만 나열하지 말 것. 장면·선택·타이밍으로 말할 것.\n' +
    '5) 해석이 자연스럽다는 이유만으로 카드·질문에 없는 사실·과거사·감정·의도·행동을 만들어내지 말 것. 카드가 직접 지지하는 범위와 한 단계 더 나간 추론을 구분하고, 근거가 약한 추론은 사실처럼 단정하지 말 것. 단, 카드·포지션이 명확히 지지하는 핵심 의미까지 “~일 수 있다”로 흐리지 말고 분명하게 말할 것.\n' +
    '6) 의료·법률·투자 단정 금지. 질문이 건강·법·돈(투자)과 관련될 때만 주의 섹션 끝에 「전문가와 상의하세요」 취지의 한 문장을 붙이고, 그 밖의 질문엔 면책 문장을 쓰지 말 것.\n' +
    '7) 카드 옆 키워드는 **정방향 의미**예요. 역방향 카드는 그 키워드를 그대로 쓰지 말고, 막힘·지연·과잉·내면화 등 역방향의 결로 바꿔 읽을 것.\n' +
    '8) 굵게(**…**)는 섹션마다 짧은 핵심 구절 1개까지만. 이모지 금지.\n' +
    '</quality_bar>\n\n' +
    '<output_format>\n' +
    '반드시 아래 ## 소제목만 사용. 다른 소제목·섹션을 추가하지 말 것:\n' +
    '## 한 줄 요약\n' +
    '## 흐름\n' +
    '## 지금 할 일\n' +
    '## 주의\n' +
    '- 한 줄 요약: 결론 1문장(카드가 지지하는 방향성). 수비가 있으면 같은 문장에 렌즈 힌트 1개를 녹일 것.\n' +
    '- 흐름: 포지션 순서. 카드마다 2~4문장. “자리 · 카드명(정/역)”으로 시작. 각 자리를 독립적으로 읽은 뒤, 근거 있는 연결만 짧게 덧붙일 것.\n' +
    '- 지금 할 일: 카드가 실제로 제시하는 판단 기준·행동을 1~3개. 번호 목록. 억지로 개수를 채우지 말 것.\n' +
    "- 주의: 카드에서 실제로 읽히는 Don't 1~2개 + 경계 한 문장. 형식을 채우려고 위험을 만들어내지 말 것.\n" +
    '</output_format>\n\n' +
    '<context>\n' +
    modeLine +
    periodHint +
    (numXml || '- 생년월일 없음: 카드와 질문만으로 해석. 수비를 지어내지 말 것.\n') +
    '</context>\n\n' +
    '<spread>\n' +
    cardLines +
    '\n</spread>\n\n' +
    '위 데이터를 바탕으로 품질 기준과 형식을 지켜 타로 리딩을 작성해 주세요.'
  );
}

function buildTarotReadingCachedMessages(feature, payload) {
  const p = Object.assign({}, payload || {}, { _feature: feature });
  const expected = expectedTarotFeature((p.cards && p.cards.length) || 0);
  if (feature !== expected) throw new Error('feature_card_mismatch');
  const full = buildTarotAiPrompt(p);
  return [{ role: 'user', content: full }];
}

module.exports = {
  buildTarotAiPrompt,
  buildTarotReadingCachedMessages,
  expectedTarotFeature,
};
