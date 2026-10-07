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

  /*
   * 민감 주제 차단 — 단어 하나가 아니라 "문맥 패턴"으로 거름
   * (매도·매수·병원·건강·바람(외도) 같은 단어는 단독으로 막지 않음)
   * 외도·불륜·바람 질문은 연애·관계로 허용. 뒷조사·위치추적은 계속 차단.
   */
  var BLOCK_EXCEPTIONS = /(주식회사|고소득|고소한\s*(맛|빵|향|냄새|커피|카페|참기름)|고소하게|바람직|코인\s*(노래방|세탁|빨래|게임))/g;
  var BLOCK_RULES = [
    { topic: '건강·질병', re: /(수술|질병|투병|완치|시한부|수명|치매|우울증|공황장애|입원|퇴원|병세|난임|불임|임신|낙태|임신중절|유산\s*(될|할|위험)|진단\s*(결과|받)|검진\s*결과|건강\s*(이|은|상태|문제|악화|회복|검진)|병(이|에\s*걸|을\s*고|세)|(폐|위|간|대장|유방|갑상선|췌장|자궁|전립선|혈액)암|(^|[\s,.])암(이|으로|에|\s*(진단|수술|검사|치료|재발|판정|환자)))/ },
    { topic: '생사', re: /(사망|자살|죽을까|죽나요|죽는|죽음|목숨)/ },
    { topic: '소송·범죄', re: /(소송|재판|판결|고소|고발|기소|구속|형사\s*(사건|처벌|고소)|합의금|범죄|경찰\s*조사|교도소|감옥)/ },
    { topic: '주식·코인 투자', re: /(주식|주가|코인|비트코인|이더리움|가상\s*화폐|암호\s*화폐|ETF|선물\s*옵션|상장\s*폐지|레버리지)/i },
    { topic: '도박', re: /(도박|로또|토토|카지노|경마|복권)/ },
    { topic: '불법 감시', re: /(뒷조사|몰래\s*(만나|연락)|위치\s*추적)/ },
  ];

  function blockCheck(question) {
    var q = String(question || '').replace(BLOCK_EXCEPTIONS, ' ');
    for (var i = 0; i < BLOCK_RULES.length; i++) {
      var m = q.match(BLOCK_RULES[i].re);
      if (m) return { blocked: true, topic: BLOCK_RULES[i].topic, word: m[0].trim() };
    }
    return { blocked: false };
  }

  function catById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }

  function isBlockedQuestion(question) {
    return blockCheck(question).blocked;
  }

  root.PrashnaEngine = {
    CATEGORIES: CATEGORIES,
    catById: catById,
    isBlockedQuestion: isBlockedQuestion,
    blockCheck: blockCheck,
    BLOCKED: { test: isBlockedQuestion },
  };
})(typeof window !== 'undefined' ? window : this);
