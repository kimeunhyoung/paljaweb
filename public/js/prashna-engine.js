/**
 * 프라슈나 UI용 — 카테고리·차단 단어 (계산·판정은 서버 /api/prashna/ask)
 *
 * 카테고리 ↔ 하우스 (서버 lib/prashna-engine.js 와 동일 · 확정 전)
 * property 4,7,11 | career 10,6,11 | love 7,5,11 | money 2,11,8 | decision 1,7,10
 */
(function (root) {
  var CATEGORIES = [
    {
      id: 'property',
      label: '부동산·매매',
      desc: '집·땅·매도·계약',
      houses: [4, 7, 11],
      examples: ['지금 내놓은 아파트는 언제쯤 팔릴까요?', '이번 달 안에 계약이 될까요?'],
    },
    {
      id: 'career',
      label: '일·이직',
      desc: '직장·이직·합격',
      houses: [10, 6, 11],
      examples: ['이번 면접은 잘 될까요?', '이직을 지금 추진해도 될까요?'],
    },
    {
      id: 'love',
      label: '연애·관계',
      desc: '만남·관계·결혼',
      houses: [7, 5, 11],
      examples: ['이 사람과 관계가 이어질까요?', '올해 안에 좋은 만남이 있을까요?'],
    },
    {
      id: 'money',
      label: '금전·수입',
      desc: '수입·회수·정산',
      houses: [2, 11, 8],
      examples: ['밀린 대금은 언제 들어올까요?', '이번 분기 수입이 나아질까요?'],
    },
    {
      id: 'decision',
      label: '선택·결정',
      desc: '가부·타이밍',
      houses: [1, 7, 10],
      examples: ['이 제안을 받아도 될까요?', '지금 움직이는 게 나을까요?'],
    },
  ];

  var BLOCKED_WORDS = [
    '수명', '사망', '죽을', '자살', '시한부', '소송', '재판', '고소', '도박',
    '임신중절', '낙태', '건강', '질병', '병원', '수술', '검진', '암', '임신',
    '바람', '외도', '불륜',
  ];
  var BLOCKED_INVEST_WORDS = ['주식', '코인', '종목', '매수', '매도'];

  function catById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }

  function isBlockedQuestion(question) {
    var q = String(question || '');
    var i;
    for (i = 0; i < BLOCKED_WORDS.length; i++) {
      if (q.indexOf(BLOCKED_WORDS[i]) !== -1) return true;
    }
    for (i = 0; i < BLOCKED_INVEST_WORDS.length; i++) {
      if (q.indexOf(BLOCKED_INVEST_WORDS[i]) !== -1) return true;
    }
    return false;
  }

  root.PrashnaEngine = {
    CATEGORIES: CATEGORIES,
    catById: catById,
    isBlockedQuestion: isBlockedQuestion,
    BLOCKED: { test: isBlockedQuestion },
  };
})(typeof window !== 'undefined' ? window : this);
