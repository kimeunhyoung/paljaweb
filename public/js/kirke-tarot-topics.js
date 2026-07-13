/**
 * 키르케타로 · 질문 주제 (7)
 * custom → 해설은 general, 화면에 질문만 표시
 */
(function () {
  window.KIRKE_TOPIC_IDS = ['general', 'love', 'relation', 'work', 'money', 'inner', 'custom'];

  window.KIRKE_TAROT_TOPICS = {
    general: {
      label: '전반적인 흐름',
      hint: '예: 요즘 전체적인 흐름이 어떤가요?',
    },
    love: {
      label: '사랑·연애',
      hint: '예: 이 마음, 이 연애는 어디로 가고 있을까요?',
    },
    relation: {
      label: '관계 (가족·친구·대인)',
      hint: '예: 가족·친구·주변 사람과의 관계는 어떤가요?',
    },
    work: {
      label: '진로·일·시험',
      hint: '예: 이직, 진로, 시험·합격 흐름이 궁금해요.',
    },
    money: {
      label: '재정',
      hint: '예: 돈·수입·지출, 사업·투자 흐름이 궁금해요.',
    },
    inner: {
      label: '내면·건강',
      hint: '예: 마음 상태, 스트레스, 회복이 필요할 때.',
    },
    custom: {
      label: '직접 질문',
      hint: '마음속 질문을 직접 적어 주세요.',
    },
  };

  window.resolveKirkeReadingTopic = function (topic) {
    if (topic === 'custom') return 'general';
    const ids = window.KIRKE_TOPIC_IDS || [];
    return ids.includes(topic) ? topic : 'general';
  };

  window.getKirkeTopicLabel = function (topic) {
    const map = window.KIRKE_TAROT_TOPICS || {};
    if (topic === 'custom') return map.custom?.label || '직접 질문';
    const key = window.resolveKirkeReadingTopic(topic);
    return map[key]?.label || map.general?.label || '전반적인 흐름';
  };
})();
