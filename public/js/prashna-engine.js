/**
 * 프라슈나 UI용 — 카테고리·차단 단어 (계산·판정은 서버 /api/prashna/ask)
 *
 * 카테고리 ↔ 하우스 (서버 lib/prashna-engine.js 와 동일)
 * property 4,7,11 | career 10,6,11 | love 7,5,11 | money 2,11,8 | decision 1,7,10
 * exam 4,5,9 | move 3,9,12 | family 4,5,9 | lost 2,4,11 | other 1,7,10
 */
(function (root) {
  var CATEGORIES = [
    {
      id: 'property',
      label: '부동산·매매',
      desc: '집·땅·매도·계약',
      houses: [4, 7, 11],
      examples: ['지금 내놓은 아파트는 언제쯤 팔릴까요?', '이번 달 안에 계약이 될까요?'],
      keywords: /(아파트|부동산|매매|매도|매수|전세|월세|분양|입주|집\s*팔|집\s*사|땅\s*팔|재건축)/,
    },
    {
      id: 'career',
      label: '일·이직',
      desc: '직장·이직·승진',
      houses: [10, 6, 11],
      examples: ['이번 면접은 잘 될까요?', '이직을 지금 추진해도 될까요?'],
      keywords: /(이직|직장|회사|취업|승진|연봉|퇴사|창업|사업|업무|직장생활|면접(?!\s*시험)|채용|입사)/,
    },
    {
      id: 'love',
      label: '연애·관계',
      desc: '만남·관계·결혼',
      houses: [7, 5, 11],
      examples: ['이 사람과 관계가 이어질까요?', '올해 안에 좋은 만남이 있을까요?'],
      keywords: /(연애|남자친구|여자친구|결혼|커플|헤어진|재회|썸|배우자|애인|연인|프로포즈|이별)/,
    },
    {
      id: 'money',
      label: '금전·수입',
      desc: '수입·회수·정산',
      houses: [2, 11, 8],
      examples: ['밀린 대금은 언제 들어올까요?', '이번 분기 수입이 나아질까요?'],
      keywords: /(금전|수입|대금|정산|빚|대출|회수|월급|보너스|용돈|미수금|대금\s*받)/,
    },
    {
      id: 'decision',
      label: '선택·결정',
      desc: '가부·타이밍',
      houses: [1, 7, 10],
      examples: ['이 제안을 받아도 될까요?', '지금 움직이는 게 나을까요?'],
      keywords: /(선택|결정|제안\s*받|할까\s*말까|어느\s*쪽|A안|B안|받아도\s*될|지금\s*움직)/,
    },
    {
      id: 'exam',
      label: '시험·공부',
      desc: '시험·합격·학습',
      houses: [4, 5, 9],
      examples: ['이번 시험에 합격할까요?', '자격증 공부는 잘 풀릴까요?'],
      keywords: /(시험|수능|자격증|공부|입시|토익|고시|논문|수험|합격할까요|성적|학원)/,
    },
    {
      id: 'move',
      label: '이사·여행·해외',
      desc: '이동·유학·출장',
      houses: [3, 9, 12],
      examples: ['유학 준비가 잘 될까요?', '이번 이사 타이밍이 괜찮을까요?'],
      keywords: /(이사|이주|해외|유학|이민|출장|여행|어학연수|워홀|전근|발령|해외\s*거주)/,
    },
    {
      id: 'family',
      label: '가족·자녀',
      desc: '가족·자녀·가정',
      houses: [4, 5, 9],
      examples: ['아이 입학이 잘 될까요?', '가족 분위기가 나아질까요?'],
      keywords: /(가족|자녀|아이|아들|딸|부모|시부모|장모|시댁|처가|육아|전학|우리\s*집\s*분위기)/,
    },
    {
      id: 'lost',
      label: '분실물',
      desc: '잃어버린 물건',
      houses: [2, 4, 11],
      examples: ['잃어버린 지갑을 찾을 수 있을까요?', '분실한 휴대폰이 나올까요?'],
      keywords: /(분실|잃어|잃은|찾을\s*수|찾아질|지갑|열쇠|분실물|놓고\s*온)/,
    },
    {
      id: 'other',
      label: '기타',
      desc: '위에 없는 질문',
      houses: [1, 7, 10],
      examples: ['지금 흐름이 어떤가요?', '이 일은 어떻게 흘러갈까요?'],
      keywords: null,
    },
  ];

  /*
   * 민감 주제 차단 — 단어 하나가 아니라 "문맥 패턴"으로 거름
   * (매도·매수·병원·건강·바람(외도) 같은 단어는 단독으로 막지 않음)
   * 외도·불륜·바람 질문은 연애·관계로 허용. 뒷조사·위치추적은 계속 차단.
   * 주식·코인: 흐름 질문은 허용(주의 문구 표시), 종목·매매 시점 질문만 차단 (관리자는 허용)
   * Private 등급(opts.allowAll): 자살·자해만 막고 모든 주제 허용 (민감 주제는 sensitive로 표시)
   */
  var BLOCK_EXCEPTIONS = /(주식회사|고소득|고소한\s*(맛|빵|향|냄새|커피|카페|참기름)|고소하게|바람직|코인\s*(노래방|세탁|빨래|게임))/g;
  /** 등급과 상관없이 항상 막는 주제 */
  var ALWAYS_BLOCK = { topic: '자살·자해', re: /(자살|자해|극단적\s*선택|스스로\s*목숨)/ };
  var BLOCK_RULES = [
    { topic: '건강·질병', re: /(수술|질병|투병|완치|시한부|수명|치매|우울증|공황장애|입원|퇴원|병세|난임|불임|임신|낙태|임신중절|유산\s*(될|할|위험)|진단\s*(결과|받)|검진\s*결과|건강\s*(이|은|상태|문제|악화|회복|검진)|병(이|에\s*걸|을\s*고|세)|(폐|위|간|대장|유방|갑상선|췌장|자궁|전립선|혈액)암|(^|[\s,.])암(이|으로|에|\s*(진단|수술|검사|치료|재발|판정|환자)))/ },
    { topic: '생사', re: /(사망|죽을까|죽나요|죽는|죽음|목숨)/ },
    { topic: '소송·범죄', re: /(소송|재판|판결|고소|고발|기소|구속|형사\s*(사건|처벌|고소)|합의금|범죄|경찰\s*조사|교도소|감옥)/ },
    { topic: '도박', re: /(도박|로또|토토|카지노|경마|복권)/ },
    { topic: '불법 감시', re: /(뒷조사|몰래\s*(만나|연락)|위치\s*추적)/ },
  ];
  var INVEST_RE = /(주식|주가|코인|비트코인|이더리움|가상\s*화폐|암호\s*화폐|ETF|선물\s*옵션|상장\s*폐지|레버리지|종목|상한가|하한가|재테크)/i;
  var INVEST_TRADE_RE = /(언제|사도|살까|사야|사면|팔아|팔까|팔면|매수|매도|손절|익절|타이밍|들어가|오를|떨어질|상승|하락|올라|떨어|목표가|수익률|몇\s*배|떡상|떡락)/;
  var INVEST_TOPIC = '투자 종목·매매 시점';
  var INVEST_NOTICE =
    '투자 관련 질문이에요. 질문점은 그 순간의 흐름을 읽는 참고 해석일 뿐, 종목 추천이나 매매 시점 조언이 아니에요. ' +
    '투자 판단의 근거로 쓰지 마시고, 투자 결과에 대한 책임은 본인에게 있어요.';

  /** opts.allowInvest: 관리자 — 종목·매매 시점 허용 / opts.allowAll: Private — 자살·자해 외 전부 허용 */
  function blockCheck(question, opts) {
    opts = opts || {};
    var q = String(question || '').replace(BLOCK_EXCEPTIONS, ' ');
    var hard = q.match(ALWAYS_BLOCK.re);
    if (hard) return { blocked: true, topic: ALWAYS_BLOCK.topic, word: hard[0].trim(), always: true };
    for (var i = 0; i < BLOCK_RULES.length; i++) {
      var m = q.match(BLOCK_RULES[i].re);
      if (m) {
        if (opts.allowAll) return { blocked: false, sensitive: BLOCK_RULES[i].topic, invest: INVEST_RE.test(q) };
        return { blocked: true, topic: BLOCK_RULES[i].topic, word: m[0].trim() };
      }
    }
    var inv = q.match(INVEST_RE);
    if (inv) {
      var tr = q.match(INVEST_TRADE_RE);
      if (tr && !opts.allowInvest && !opts.allowAll) {
        return { blocked: true, topic: INVEST_TOPIC, word: inv[0].trim(), invest: true };
      }
      return { blocked: false, invest: true };
    }
    return { blocked: false };
  }

  function catById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }

  function suggestCategory(question) {
    var q = String(question || '').trim();
    if (q.length < 2) return null;
    var order = ['lost', 'exam', 'move', 'family', 'property', 'career', 'love', 'money', 'decision'];
    for (var i = 0; i < order.length; i++) {
      var cat = catById(order[i]);
      if (cat && cat.keywords && cat.keywords.test(q)) return cat.id;
    }
    return null;
  }

  function isBlockedQuestion(question) {
    return blockCheck(question).blocked;
  }

  root.PrashnaEngine = {
    CATEGORIES: CATEGORIES,
    catById: catById,
    suggestCategory: suggestCategory,
    isBlockedQuestion: isBlockedQuestion,
    blockCheck: blockCheck,
    BLOCKED: { test: isBlockedQuestion },
  };
})(typeof window !== 'undefined' ? window : this);
