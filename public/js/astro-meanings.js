/**
 * 점성학(네이탈 차트) 해석 데이터 · 한국어
 * - SIGNS: 12별자리(트로피컬, 0=양자리 순서) 기본 정보
 * - PLANETS: 행성/포인트 역할
 * - HOUSES: 12하우스 주제
 * - SUN/MOON/ASC_IN_SIGN: 빅3(태양·달·상승궁) 별자리별 해석
 * 전역 window.ASTRO_MEANINGS 로 노출.
 */
(function () {
  // 트로피컬 황도 순서(0°=양자리 시작)
  var SIGNS = [
    { key: 'aries',       ko: '양자리',     glyph: '♈', element: '불',   modality: '활동', ruler: '화성',       polarity: '양',
      keyword: '시작·추진·용기', short: '새로 시작하고 앞장서는 개척의 에너지. 직진하는 추진력이 강점이지만 성급함은 과제.' },
    { key: 'taurus',      ko: '황소자리',   element: '흙',   modality: '고정', glyph: '♉', ruler: '금성',       polarity: '음',
      keyword: '안정·감각·소유', short: '꾸준함과 감각적 풍요를 추구. 끈기와 현실 감각이 강점, 변화에 대한 저항은 과제.' },
    { key: 'gemini',      ko: '쌍둥이자리', element: '바람', modality: '변통', glyph: '♊', ruler: '수성',       polarity: '양',
      keyword: '소통·호기심·다재', short: '말과 정보로 세상을 잇는 호기심형. 재치와 적응력이 강점, 산만함은 과제.' },
    { key: 'cancer',      ko: '게자리',     element: '물',   modality: '활동', glyph: '♋', ruler: '달',         polarity: '음',
      keyword: '돌봄·정서·소속', short: '감정과 보살핌으로 안전을 짓는 에너지. 공감과 헌신이 강점, 과민함은 과제.' },
    { key: 'leo',         ko: '사자자리',   element: '불',   modality: '고정', glyph: '♌', ruler: '태양',       polarity: '양',
      keyword: '표현·자존·창조', short: '빛나고 표현하며 인정받는 에너지. 자신감과 따뜻함이 강점, 과시욕은 과제.' },
    { key: 'virgo',       ko: '처녀자리',   element: '흙',   modality: '변통', glyph: '♍', ruler: '수성',       polarity: '음',
      keyword: '정밀·분석·봉사', short: '다듬고 개선하며 쓸모를 만드는 에너지. 섬세함과 성실이 강점, 완벽주의는 과제.' },
    { key: 'libra',       ko: '천칭자리',   element: '바람', modality: '활동', glyph: '♎', ruler: '금성',       polarity: '양',
      keyword: '관계·균형·조화', short: '관계와 미적 균형을 추구하는 조율가. 공정함과 매너가 강점, 우유부단은 과제.' },
    { key: 'scorpio',     ko: '전갈자리',   element: '물',   modality: '고정', glyph: '♏', ruler: '명왕성·화성', polarity: '음',
      keyword: '몰입·변형·심층', short: '깊이 파고들어 본질을 변형시키는 에너지. 집중력과 통찰이 강점, 집착은 과제.' },
    { key: 'sagittarius', ko: '사수자리',   element: '불',   modality: '변통', glyph: '♐', ruler: '목성',       polarity: '양',
      keyword: '확장·자유·의미', short: '경계를 넘어 의미를 찾는 모험가. 낙관과 비전이 강점, 과장·산만은 과제.' },
    { key: 'capricorn',   ko: '염소자리',   element: '흙',   modality: '활동', glyph: '♑', ruler: '토성',       polarity: '음',
      keyword: '책임·성취·구조', short: '목표를 향해 쌓아 올리는 현실주의자. 인내와 책임이 강점, 경직·억압은 과제.' },
    { key: 'aquarius',    ko: '물병자리',   element: '바람', modality: '고정', glyph: '♒', ruler: '천왕성·토성', polarity: '양',
      keyword: '독창·공동체·혁신', short: '관습을 넘어 미래와 공동체를 보는 에너지. 독창성과 객관이 강점, 냉담함은 과제.' },
    { key: 'pisces',      ko: '물고기자리', element: '물',   modality: '변통', glyph: '♓', ruler: '해왕성·목성', polarity: '음',
      keyword: '감성·직관·연민', short: '경계를 녹이는 직관과 연민의 에너지. 상상력과 공감이 강점, 현실 이탈은 과제.' }
  ];

  // 행성/포인트 역할 (key는 circular-natal-horoscope-js 본문 키와 매핑)
  var PLANETS = {
    sun:       { ko: '태양',   glyph: '☉', role: '정체성·생명력·자아의 핵심' },
    moon:      { ko: '달',     glyph: '☽', role: '감정·본능·정서적 안전' },
    mercury:   { ko: '수성',   glyph: '☿', role: '사고·소통·학습 방식' },
    venus:     { ko: '금성',   glyph: '♀', role: '사랑·취향·가치·관계' },
    mars:      { ko: '화성',   glyph: '♂', role: '의지·욕구·추진·분노' },
    jupiter:   { ko: '목성',   glyph: '♃', role: '확장·행운·신념·성장' },
    saturn:    { ko: '토성',   glyph: '♄', role: '책임·한계·구조·성숙' },
    uranus:    { ko: '천왕성', glyph: '♅', role: '혁신·자유·돌발·각성' },
    neptune:   { ko: '해왕성', glyph: '♆', role: '꿈·영성·이상·환상' },
    pluto:     { ko: '명왕성', glyph: '♇', role: '변형·심층·권력·재생' },
    chiron:    { ko: '카이런', glyph: '⚷', role: '상처와 치유의 자리' },
    northnode: { ko: '북교점', glyph: '☊', role: '이생에서 향하는 성장 방향' },
    lilith:    { ko: '릴리스', glyph: '⚸', role: '억압된 본능·원초적 자아' }
  };

  // astrochart 라이브러리 planet 키 ← 본문 키 매핑
  var CHART_KEY = {
    sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
    jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune',
    pluto: 'Pluto', chiron: 'Chiron', northnode: 'NNode', lilith: 'Lilith'
  };

  var HOUSES = [
    { n: 1,  ko: '1하우스 · 자아', theme: '나·첫인상·몸·삶의 출발점. 세상에 나를 드러내는 방식.' },
    { n: 2,  ko: '2하우스 · 소유', theme: '돈·자원·재능·자존감. 내가 가진 것과 그 가치.' },
    { n: 3,  ko: '3하우스 · 소통', theme: '말·학습·형제·근거리 이동. 일상의 정보와 연결.' },
    { n: 4,  ko: '4하우스 · 가정', theme: '뿌리·가족·집·내면의 안전 기지.' },
    { n: 5,  ko: '5하우스 · 창조', theme: '연애·놀이·자기표현·자녀·창작의 기쁨.' },
    { n: 6,  ko: '6하우스 · 일상', theme: '일·건강·루틴·봉사. 매일을 다듬는 영역.' },
    { n: 7,  ko: '7하우스 · 관계', theme: '파트너십·결혼·계약·일대일 관계.' },
    { n: 8,  ko: '8하우스 · 변형', theme: '공유 자원·깊은 결속·위기·재생.' },
    { n: 9,  ko: '9하우스 · 확장', theme: '철학·신념·고등교육·먼 여행·의미 탐구.' },
    { n: 10, ko: '10하우스 · 사회', theme: '직업·명예·사회적 역할·성취의 정점.' },
    { n: 11, ko: '11하우스 · 공동체', theme: '친구·네트워크·이상·미래의 비전.' },
    { n: 12, ko: '12하우스 · 무의식', theme: '내면·영성·고독·숨겨진 것·해방.' }
  ];

  var SUN_IN_SIGN = {
    aries: '태양 양자리: 스스로 길을 내며 앞장설 때 가장 생생합니다. 도전과 새 시작이 자기 정체성의 핵심이에요. 다만 끝까지 가져가는 인내를 함께 기르면 추진력이 빛을 봅니다.',
    taurus: '태양 황소자리: 안정·감각·꾸준함 속에서 자기다움을 느낍니다. 천천히 그러나 단단하게 쌓는 사람. 변화 앞에서 유연함 한 스푼이 더해지면 더 멀리 갑니다.',
    gemini: '태양 쌍둥이자리: 배우고 말하고 연결할 때 살아납니다. 호기심과 재치가 정체성의 중심이에요. 흩어진 관심을 한 줄기로 모으는 연습이 힘을 키웁니다.',
    cancer: '태양 게자리: 돌보고 소속될 때 자기 존재를 확인합니다. 감정과 기억, 가족·안전이 핵심 테마예요. 내 감정의 경계를 지키는 법을 익히면 더 단단해집니다.',
    leo: '태양 사자자리: 표현하고 빛날 때 가장 나다워집니다. 창조와 인정, 따뜻한 자부심이 중심이에요. 무대 밖에서도 스스로를 인정하는 힘을 기르면 좋습니다.',
    virgo: '태양 처녀자리: 다듬고 도움이 될 때 의미를 느낍니다. 분석·정밀·성실이 정체성의 축이에요. 완벽 대신 \u201c충분히 좋음\u201d을 허용하면 한결 편안해집니다.',
    libra: '태양 천칭자리: 관계와 균형 속에서 자기를 발견합니다. 조화·미감·공정함이 핵심이에요. 남을 맞추기 전에 내 욕구를 먼저 말하는 연습이 필요합니다.',
    scorpio: '태양 전갈자리: 깊이 몰입하고 변형될 때 살아납니다. 본질·강렬함·재생이 정체성의 중심이에요. 통제 대신 신뢰를 배우면 힘이 부드러워집니다.',
    sagittarius: '태양 사수자리: 의미를 찾아 확장할 때 가장 자유롭습니다. 모험·신념·큰 그림이 핵심이에요. 비전을 작은 실천으로 땅에 붙이면 결실이 옵니다.',
    capricorn: '태양 염소자리: 목표를 향해 쌓아 올릴 때 자기를 증명합니다. 책임·인내·성취가 중심이에요. 성과만큼 쉼과 관계의 온도도 챙기면 오래갑니다.',
    aquarius: '태양 물병자리: 다르게 보고 미래를 그릴 때 살아납니다. 독창성·공동체·자유가 핵심이에요. 객관 속에 마음의 온기를 더하면 영향력이 커집니다.',
    pisces: '태양 물고기자리: 느끼고 상상하고 연민할 때 가장 나다워집니다. 직관·영성·공감이 중심이에요. 현실의 경계와 휴식을 함께 지으면 재능이 흐려지지 않습니다.'
  };

  var MOON_IN_SIGN = {
    aries: '달 양자리: 감정이 빠르고 직선적이에요. 즉각 반응하고 곧 풀립니다. 잠깐 멈춰 호흡하는 안전장치가 관계를 지켜 줍니다.',
    taurus: '달 황소자리: 안정과 편안함에서 정서적 안전을 얻습니다. 일관된 환경과 감각적 위안이 마음을 가라앉혀요. 변화는 천천히 받아들이는 편이 좋습니다.',
    gemini: '달 쌍둥이자리: 말과 정보로 감정을 처리합니다. 대화하고 이해할 때 안정돼요. 머릿속 수다를 잠재울 조용한 시간도 필요합니다.',
    cancer: '달 게자리: 감정의 깊이와 공감이 큽니다. 가족·집·소속이 정서의 닻이에요. 내 감정과 남의 감정을 구분하는 경계가 도움이 됩니다.',
    leo: '달 사자자리: 따뜻한 인정과 애정 표현에서 안정을 얻습니다. 마음이 크고 너그러워요. 인정받지 못할 때의 서운함을 다독이는 연습이 필요합니다.',
    virgo: '달 처녀자리: 정돈되고 쓸모 있을 때 마음이 편합니다. 돌봄을 \u201c돕는 행동\u201d으로 표현해요. 자신에게도 너그러운 기준을 허용하면 좋습니다.',
    libra: '달 천칭자리: 조화롭고 평화로운 관계에서 안정을 느낍니다. 갈등을 불편해해요. 솔직한 감정 표현이 오히려 관계를 건강하게 합니다.',
    scorpio: '달 전갈자리: 감정이 깊고 강렬하며 사적입니다. 신뢰가 쌓이면 끝까지 함께해요. 감정을 묻어 두기보다 안전하게 흘려보내는 통로가 필요합니다.',
    sagittarius: '달 사수자리: 자유와 의미 속에서 마음이 편안합니다. 낙관적이고 솔직해요. 답답함을 느낄 땐 새 자극·여행이 회복을 돕습니다.',
    capricorn: '달 염소자리: 절제되고 책임감 있게 감정을 다룹니다. 통제감에서 안전을 얻어요. 감정을 약점으로 여기지 않고 표현하는 연습이 도움이 됩니다.',
    aquarius: '달 물병자리: 거리를 두고 감정을 객관화합니다. 자유와 독립이 정서의 닻이에요. 가끔은 머리보다 마음을 먼저 인정해도 괜찮습니다.',
    pisces: '달 물고기자리: 섬세하고 흡수력이 큰 감정의 바다입니다. 공감과 상상이 풍부해요. 타인의 감정에 휩쓸리지 않게 나만의 회복 시간을 지키세요.'
  };

  var ASC_IN_SIGN = {
    aries: '상승궁 양자리: 첫인상이 활기차고 직진형. 솔직하고 추진력 있게 비칩니다. 세상에 \u201c먼저 부딪혀 보는\u201d 태도로 다가갑니다.',
    taurus: '상승궁 황소자리: 차분하고 안정적이며 감각적인 인상. 서두르지 않고 신뢰감을 줍니다.',
    gemini: '상승궁 쌍둥이자리: 호기심 많고 말이 잘 통하는 인상. 가볍고 재치 있게 다가갑니다.',
    cancer: '상승궁 게자리: 부드럽고 보살피는 인상. 조심스럽게 다가가지만 정이 깊습니다.',
    leo: '상승궁 사자자리: 존재감 있고 따뜻한 인상. 자연스럽게 시선을 모읍니다.',
    virgo: '상승궁 처녀자리: 단정하고 섬세한 인상. 관찰력 있고 도움을 주려 다가갑니다.',
    libra: '상승궁 천칭자리: 우아하고 매너 있는 인상. 관계를 부드럽게 여는 사람.',
    scorpio: '상승궁 전갈자리: 강렬하고 신비로운 인상. 쉽게 속을 보이지 않지만 깊습니다.',
    sagittarius: '상승궁 사수자리: 활달하고 솔직한 인상. 자유롭고 낙천적으로 다가갑니다.',
    capricorn: '상승궁 염소자리: 진중하고 믿음직한 인상. 책임감 있게 비칩니다.',
    aquarius: '상승궁 물병자리: 독특하고 쿨한 인상. 개성 있고 열린 태도로 다가갑니다.',
    pisces: '상승궁 물고기자리: 부드럽고 몽환적인 인상. 공감 어린 분위기로 다가갑니다.'
  };

  // ── 행성별 · 별자리 안에서의 해석 (수성·금성·화성·목성·토성) ──
  var MERCURY_IN_SIGN = {
    aries: '빠르고 직설적인 사고. 결정이 빠르지만, 끝까지 듣는 인내를 더하면 좋아요.',
    taurus: '신중하고 실용적인 사고. 느리지만 한번 정한 생각은 단단합니다.',
    gemini: '재빠르고 다재다능한 사고. 호기심이 넘치나 한 주제에 머무는 힘이 과제.',
    cancer: '감정·기억에 기반한 직관적 사고. 공감하며 부드럽게 소통합니다.',
    leo: '자신감 있고 표현력 강한 사고. 드라마틱하게 말하되 경청도 챙기면 좋아요.',
    virgo: '분석적이고 정밀한 사고. 디테일에 강하나 비판이 과하지 않게.',
    libra: '균형 잡힌 비교형 사고. 공정하지만 결정을 미루기 쉬워요.',
    scorpio: '깊이 파고드는 탐구형 사고. 통찰력이 강하나 의심은 과제.',
    sagittarius: '큰 그림·의미 중심 사고. 낙관적이나 디테일은 놓치기 쉬워요.',
    capricorn: '체계적이고 현실적인 사고. 신중하고 전략적으로 말합니다.',
    aquarius: '독창적이고 객관적인 사고. 틀을 깨지만 고집이 될 수 있어요.',
    pisces: '직관적이고 상상력 풍부한 사고. 영감은 강하나 논리 정리가 과제.'
  };
  var VENUS_IN_SIGN = {
    aries: '직진형 애정. 솔직하고 열정적이나, 오래가려면 인내가 필요해요.',
    taurus: '안정·감각적 애정. 충실하고 풍요로움을 즐깁니다.',
    gemini: '가볍고 지적인 끌림. 대화가 통해야 마음이 열려요.',
    cancer: '보살피는 애정. 정서적 안전과 친밀감을 중시합니다.',
    leo: '화려하고 따뜻한 애정. 표현과 인정에서 사랑을 느껴요.',
    virgo: '헌신적이고 섬세한 애정. 작은 돌봄으로 마음을 표현합니다.',
    libra: '조화·미감 중심의 애정. 관계 자체를 소중히 여겨요.',
    scorpio: '깊고 강렬한 애정. 신뢰가 쌓이면 전부를 줍니다.',
    sagittarius: '자유롭고 모험적인 애정. 함께 성장·탐험할 상대를 원해요.',
    capricorn: '진중하고 책임 있는 애정. 천천히, 그러나 오래갑니다.',
    aquarius: '독립적이고 우정 같은 애정. 자유를 존중하는 관계를 선호해요.',
    pisces: '헌신적이고 낭만적인 애정. 경계가 흐려지지 않게 주의하면 좋아요.'
  };
  var MARS_IN_SIGN = {
    aries: '직접적이고 폭발적인 추진력. 빠르게 행동하나 욱함은 과제.',
    taurus: '끈질기고 꾸준한 추진력. 느리지만 멈추지 않습니다.',
    gemini: '여러 방향으로 뻗는 추진력. 말과 아이디어로 움직여요.',
    cancer: '감정에 따라 움직이는 추진력. 방어적으로 흐를 수 있어요.',
    leo: '당당하고 자기표현적인 추진력. 인정받을 때 힘이 납니다.',
    virgo: '정교하고 효율 중심의 추진력. 디테일로 승부해요.',
    libra: '협력·균형을 통한 추진. 직접 충돌은 피하는 편입니다.',
    scorpio: '집요하고 강렬한 추진력. 한번 정하면 끝까지 갑니다.',
    sagittarius: '목표·의미를 향한 추진. 자유롭게 뻗어 나가요.',
    capricorn: '전략적이고 인내심 있는 추진력. 야망이 단단합니다.',
    aquarius: '독창적이고 명분 중심의 추진. 틀을 깨려 해요.',
    pisces: '간접적·직관적 추진력. 흐름을 타되 방향 설정이 과제.'
  };
  var JUPITER_IN_SIGN = {
    aries: '도전과 개척에서 성장·행운이 옵니다.',
    taurus: '꾸준한 축적과 풍요 속에서 확장됩니다.',
    gemini: '배움·소통·다양한 경험으로 넓어집니다.',
    cancer: '돌봄·가정·정서적 풍요에서 복이 큽니다.',
    leo: '자기표현·창조·너그러움이 행운을 부릅니다.',
    virgo: '성실·봉사·실용적 기술로 성장합니다.',
    libra: '관계·협력·공정함에서 기회가 열립니다.',
    scorpio: '깊은 탐구·변형·공유 자원에서 확장됩니다.',
    sagittarius: '모험·배움·신념의 확장이 본령입니다(자기 자리).',
    capricorn: '책임·구조·장기 목표 달성으로 성장합니다.',
    aquarius: '혁신·공동체·이상 실현에서 복이 옵니다.',
    pisces: '연민·영성·상상력에서 풍요가 깃듭니다(자기 자리).'
  };
  var SATURN_IN_SIGN = {
    aries: '자기 주도와 인내를 배우는 과제. 성급함을 다듬습니다.',
    taurus: '안정·자원에 대한 책임을 배웁니다. 집착은 내려놓기.',
    gemini: '사고·소통의 깊이와 집중을 단련합니다.',
    cancer: '정서적 안전·가족 책임을 성숙시킵니다.',
    leo: '자신감과 인정 욕구를 현실적으로 다듬습니다.',
    virgo: '완벽주의·비판을 건강한 기준으로 성숙시킵니다.',
    libra: '관계와 공정함의 책임, 헌신의 의미를 배웁니다.',
    scorpio: '신뢰·통제·깊은 변형을 성숙시킵니다.',
    sagittarius: '신념·자유에 현실적 구조를 더합니다.',
    capricorn: '책임·성취·구조의 본령(자기 자리). 권위를 세웁니다.',
    aquarius: '공동체·이상에 책임 있는 틀을 만듭니다.',
    pisces: '경계·영성·연민에 현실의 닻을 내립니다.'
  };
  var PLANET_IN_SIGN = {
    mercury: MERCURY_IN_SIGN, venus: VENUS_IN_SIGN, mars: MARS_IN_SIGN,
    jupiter: JUPITER_IN_SIGN, saturn: SATURN_IN_SIGN
  };

  // 천왕성·해왕성·명왕성은 세대 행성(한 별자리에 수년 머무름) → 별자리보다 하우스·어스펙트가 개인적
  var OUTER_GENERATIONAL = { uranus: true, neptune: true, pluto: true };

  /** 행성이 특정 별자리에 있을 때의 해석 문장. 데이터가 없으면 역할+별자리 키워드로 폴백 */
  function planetInSign(planetKey, signKey) {
    if (planetKey === 'sun') return SUN_IN_SIGN[signKey] || '';
    if (planetKey === 'moon') return MOON_IN_SIGN[signKey] || '';
    var table = PLANET_IN_SIGN[planetKey];
    if (table && table[signKey]) return table[signKey];
    var p = PLANETS[planetKey];
    var s = null;
    for (var i = 0; i < SIGNS.length; i++) { if (SIGNS[i].key === signKey) { s = SIGNS[i]; break; } }
    if (!p || !s) return '';
    var lead = OUTER_GENERATIONAL[planetKey]
      ? '세대 차원의 ' : '';
    return lead + p.role.split('·')[0] + '의 에너지가 ' + s.ko + '(' + s.keyword + ') 방식으로 표현됩니다.';
  }

  /** 행성이 특정 하우스에 있을 때의 짧은 의미(템플릿) */
  function planetInHouse(planetKey, houseId) {
    var p = PLANETS[planetKey];
    var h = HOUSES[(houseId || 1) - 1];
    if (!p || !h) return '';
    var area = h.ko.split(' · ')[1] || h.ko;
    return houseId + '하우스(' + area + ') 영역에서 ' + p.role.split('·')[0] + '의 힘이 주로 작동합니다.';
  }

  // ── 어스펙트(각) 일반 의미 ──
  var ASPECT_MEANING = {
    conjunction: { tone: 'strong', text: '두 힘이 한데 뭉쳐 강하게 증폭됩니다. 같은 방향으로 작동해 장점도 과제도 함께 커져요.' },
    opposition:  { tone: 'tense',  text: '두 힘이 마주 보며 긴장·균형을 만듭니다. 양극을 통합하는 것이 과제예요.' },
    trine:       { tone: 'easy',   text: '두 힘이 자연스럽게 흐르는 재능·강점. 애쓰지 않아도 잘 통합됩니다.' },
    square:      { tone: 'tense',  text: '두 힘이 부딪치며 성장의 마찰을 만듭니다. 넘어서면 큰 추진력이 돼요.' },
    sextile:     { tone: 'easy',   text: '두 힘이 서로 돕는 기회. 조금만 움직이면 좋은 결과로 이어집니다.' }
  };

  // ── 원소 · 모달리티 정보 ──
  var ELEMENT_INFO = {
    '불':   { en: 'fire',  glyph: '🔥', desc: '열정·행동·직관. 강하면 추진력이 좋지만 성급할 수 있어요.', low: '추진력·자신감에 불을 더하면 좋아요.' },
    '흙':   { en: 'earth', glyph: '⛰️', desc: '현실·안정·감각. 강하면 착실하지만 변화에 둔할 수 있어요.', low: '현실 감각·꾸준함을 보강하면 좋아요.' },
    '바람': { en: 'air',   glyph: '🌬️', desc: '사고·소통·관계. 강하면 똑똑하고 사교적이나 붕 뜰 수 있어요.', low: '객관적 소통·거리두기를 익히면 좋아요.' },
    '물':   { en: 'water', glyph: '💧', desc: '감정·직관·공감. 강하면 깊고 섬세하나 휩쓸리기 쉬워요.', low: '감정 표현·공감을 의식적으로 더하면 좋아요.' }
  };
  var MODALITY_INFO = {
    '활동': { desc: '시작하고 주도하는 힘(Cardinal).' },
    '고정': { desc: '유지하고 끝까지 미는 힘(Fixed).' },
    '변통': { desc: '적응하고 변화하는 힘(Mutable).' }
  };

  // ── 시너스트리(커플 궁합) 행성쌍 해석 ──
  // 키: 두 행성 키를 알파벳 정렬해 '_'로 연결 (예: moon_sun)
  var SYNASTRY_PAIR = {
    moon_sun: '본질(태양)과 정서(달)가 만나는 궁합의 핵심 축. 잘 맞으면 깊은 안정감, 어긋나면 “왜 날 몰라줄까”의 거리감이 됩니다.',
    sun_venus: '호감과 애정이 자연스럽게 오가는 조합. 서로를 매력적으로 느끼고 인정해 주는 따뜻한 결입니다.',
    mars_venus: '끌림·로맨스·케미의 축. 설렘과 열정이 큰 대신, 균형이 깨지면 밀당·자극으로 흐를 수 있어요.',
    moon_venus: '정서적 친밀감과 다정함의 결합. 함께 있으면 편안하고 사랑받는 느낌을 줍니다.',
    mars_moon: '감정(달)과 욕구·행동(화성)의 만남. 열정적이지만, 어긋나면 감정적 마찰이 잦을 수 있어요.',
    mercury_mercury: '대화·사고방식의 결. 말이 잘 통하는지, 생각의 속도가 맞는지를 보여 줍니다.',
    moon_moon: '정서 리듬의 공명. 비슷하면 편하고, 다르면 서로의 감정 반응을 배워야 합니다.',
    sun_sun: '기본 성향의 닮음/대비. 같은 방향이면 든든, 정반대면 끌리거나 부딪칩니다.',
    venus_venus: '취향·사랑 방식의 결. 좋아하는 것이 통하는지를 봅니다.',
    saturn_sun: '책임·신뢰·구조의 축. 안정과 헌신을 주거나, 부담·억압으로 느껴질 수 있어요.',
    moon_saturn: '정서적 안정·보호 또는 감정적 억눌림. 진중한 결속과 무게가 함께 옵니다.',
    saturn_venus: '오래가는 진지한 애정 또는 애정 표현의 제약. 책임감 있는 사랑의 축.',
    jupiter_sun: '서로의 성장을 북돋우는 너그러운 조합. 함께 있으면 확장되는 느낌.',
    jupiter_venus: '즐거움·관대함·풍요가 흐르는 다정한 조합.',
    mars_mars: '추진력·경쟁 에너지. 같은 팀이면 강력, 어긋나면 부딪침.'
  };
  function synastryPairKey(a, b) { return [a, b].sort().join('_'); }
  function synastryPairNote(a, b) { return SYNASTRY_PAIR[synastryPairKey(a, b)] || ''; }

  var EXTRA_LABELS = {
    asc: '상승궁', mc: '중천점', fortune: '포르투나', vertex: '버텍스',
    northnode: '북교점', southnode: '남교점', lilith: '릴리스', chiron: '카이런'
  };
  var EXTRA_AREA = {
    asc: '나 자신·첫인상·몸', mc: '커리어·사회적 위치·명예',
    fortune: '행운·성취가 모이는 지점', vertex: '운명적 만남·전환점',
    northnode: '삶의 성장 방향', southnode: '익숙한 과거 패턴', lilith: '본능·억압된 욕망', chiron: '상처와 치유'
  };
  var ASP_KR = { conjunction: '합', opposition: '충', trine: '삼각', square: '사각', sextile: '육각' };

  function bodyLabel(k) {
    if (PLANETS[k]) return PLANETS[k].ko;
    return EXTRA_LABELS[k] || k;
  }
  function bodyArea(k) {
    if (PLANETS[k]) return PLANETS[k].role.split('·')[0].trim();
    return EXTRA_AREA[k] || bodyLabel(k);
  }

  /** 출생 차트 어스펙트 — 행성쌍 + 각 조합의 풍부한 해석 */
  function aspectPairNote(p1, p2, aspectKey) {
    var asp = ASPECT_MEANING[aspectKey];
    if (!asp) return '';
    var pair = synastryPairNote(p1, p2);
    var n1 = bodyLabel(p1), n2 = bodyLabel(p2);
    var ak = ASP_KR[aspectKey] || aspectKey;
    if (pair) {
      return n1 + ' ' + ak + ' ' + n2 + ' — ' + pair + ' 이번 각에서는 ' + asp.text;
    }
    var a1 = bodyArea(p1), a2 = bodyArea(p2);
    if (asp.tone === 'easy') {
      return a1 + '과(와) ' + a2 + '가 ' + ak + '으로 자연스럽게 연결됩니다. ' + asp.text + ' 일상에서 ' + a1 + '과 ' + a2 + '를 함께 쓰면 강점이 드러납니다.';
    }
    if (asp.tone === 'tense') {
      return a1 + '과(와) ' + a2 + ' 사이에 ' + ak + '의 긴장이 있습니다. ' + asp.text + ' ' + a1 + '과 ' + a2 + '가 충돌할 때 한쪽만 고집하지 않도록 조율이 필요합니다.';
    }
    return a1 + '과(와) ' + a2 + '가 ' + ak + '으로 강하게 맞물립니다. ' + asp.text;
  }

  var TRANSIT_THEME = {
    sun: '활력·자아·주목', moon: '감정·컨디션·리듬', mercury: '생각·소통·일정',
    venus: '사랑·관계·돈·취향', mars: '의욕·추진·경쟁', jupiter: '확장·기회·행운',
    saturn: '책임·시험·정리·한계', uranus: '변화·각성·돌발', neptune: '꿈·영감·혼란', pluto: '근본 변형·집중'
  };
  var TRANSIT_PAIR = {
    sun_sun: '자아와 활력의 리셋·재점화 시기입니다.',
    moon_moon: '감정 패턴이 크게 움직이는 때예요. 몸과 마음의 리듬을 살피세요.',
    saturn_sun: '책임·현실 점검이 정체성을 시험합니다. 구조를 다지면 오래 갑니다.',
    jupiter_sun: '성장·기회의 문이 열립니다. 과신만 피하면 좋은 확장이 됩니다.',
    mars_moon: '감정 반응이 빨라지고 충동이 올 수 있어요. 말과 행동에 한 박자 쉬세요.',
    venus_venus: '관계·돈·미적 취향에 변화의 바람이 붑니다.',
    pluto_sun: '근본적인 자아 변형·재탄생의 에너지입니다. 낡은 정체성을 내려놓을 수 있어요.',
    neptune_mc: '커리어·방향에 이상과 혼란이 섞입니다. 비전은 키우되 현실 확인이 필요합니다.',
    uranus_asc: '외모·첫인상·삶의 방식에 돌발 변화가 올 수 있습니다.',
    saturn_moon: '감정적으로 무겁거나 책임감이 커지는 시기입니다. 혼자 버티지 마세요.'
  };
  var TRANSIT_TAIL = {
    easy: '무리하지 않고 받아들이면 기회로 이어집니다.',
    tense: '속도를 늦추고 현실을 점검하는 것이 좋습니다.',
    strong: '흐름이 강하니 의식적으로 방향을 잡으세요.'
  };

  /** 트랜짓 — 트랜짓 행성 × 본명 천체 × 각의 풍부한 해석 */
  function transitPairNote(tk, nk, aspectKey) {
    var asp = ASPECT_MEANING[aspectKey];
    if (!asp) return '';
    var theme = TRANSIT_THEME[tk];
    var area = EXTRA_AREA[nk] || (PLANETS[nk] && PLANETS[nk].role.split('·')[0].trim()) || bodyLabel(nk);
    var ak = ASP_KR[aspectKey] || aspectKey;
    var specific = TRANSIT_PAIR[synastryPairKey(tk, nk)];
    var line1 = '요즘 <strong>' + theme + '</strong>의 기운이 <strong>' + area + '</strong>에 ' + ak + ' 각을 맺고 있어요.';
    var line2 = specific || asp.text;
    var line3 = TRANSIT_TAIL[asp.tone] || '';
    return line1 + ' ' + line2 + ' ' + line3;
  }

  function signFromDegree(deg) {
    var d = ((deg % 360) + 360) % 360;
    var idx = Math.floor(d / 30) % 12;
    return { index: idx, degInSign: d - idx * 30, sign: SIGNS[idx] };
  }

  window.ASTRO_MEANINGS = {
    SIGNS: SIGNS,
    PLANETS: PLANETS,
    CHART_KEY: CHART_KEY,
    HOUSES: HOUSES,
    SUN_IN_SIGN: SUN_IN_SIGN,
    MOON_IN_SIGN: MOON_IN_SIGN,
    ASC_IN_SIGN: ASC_IN_SIGN,
    PLANET_IN_SIGN: PLANET_IN_SIGN,
    ASPECT_MEANING: ASPECT_MEANING,
    ELEMENT_INFO: ELEMENT_INFO,
    MODALITY_INFO: MODALITY_INFO,
    OUTER_GENERATIONAL: OUTER_GENERATIONAL,
    SYNASTRY_PAIR: SYNASTRY_PAIR,
    synastryPairNote: synastryPairNote,
    aspectPairNote: aspectPairNote,
    transitPairNote: transitPairNote,
    bodyLabel: bodyLabel,
    planetInSign: planetInSign,
    planetInHouse: planetInHouse,
    signFromDegree: signFromDegree
  };
})();
