/**
 * 타로코드 · 질문 모드 주제별 해설 렌즈
 * love / work / money / relation / inner / custom
 */
(function () {
  const TOPICS = ['love', 'work', 'money', 'relation', 'inner'];

  const MAJOR_ARCHETYPE = {
    0: 'beginning',
    1: 'will',
    2: 'intuition',
    3: 'nurture',
    4: 'structure',
    5: 'tradition',
    6: 'choice',
    7: 'drive',
    8: 'courage',
    9: 'solitude',
    10: 'cycle',
    11: 'balance',
    12: 'pause',
    13: 'transition',
    14: 'blend',
    15: 'bondage',
    16: 'upheaval',
    17: 'hope',
    18: 'doubt',
    19: 'joy',
    20: 'renewal',
    21: 'completion',
  };

  const TOPIC_MONO_LEAD = {
    love: {
      beginning: '사랑이나 마음의 새 출발을 두고 보면, ',
      will: '연애·호감을 이끌어 갈 때를 두고 보면, ',
      intuition: '상대의 속마음과 내 진심을 두고 보면, ',
      nurture: '관계를 키우고 돌보는 마음을 두고 보면, ',
      structure: '관계의 경계와 약속을 두고 보면, ',
      tradition: '연애에서 검증된 방식과 신뢰를 두고 보면, ',
      choice: '둘 사이의 선택과 정렬을 두고 보면, ',
      drive: '관계를 밀고 가는 추진력을 두고 보면, ',
      courage: '다툼 속에서도 부드럽게 버티는 힘을 두고 보면, ',
      solitude: '혼자만의 시간과 거리 두기를 두고 보면, ',
      cycle: '연애의 흐름이 바뀌는 시점을 두고 보면, ',
      balance: '관계에서 공정함과 균형을 두고 보면, ',
      pause: '연애를 잠시 멈추고 바라보는 시점을 두고 보면, ',
      transition: '관계의 끝과 새 시작을 두고 보면, ',
      blend: '서로 다른 마음을 맞추는 과정을 두고 보면, ',
      bondage: '집착·의존·반복 패턴을 두고 보면, ',
      upheaval: '관계의 갑작스러운 변화를 두고 보면, ',
      hope: '연애에 대한 희망과 회복을 두고 보면, ',
      doubt: '불안과 오해, 애매한 신호를 두고 보면, ',
      joy: '관계에서 빛나는 순간을 두고 보면, ',
      renewal: '관계를 다시 여는 소식을 두고 보면, ',
      completion: '관계가 한 단계 성숙하는 시점을 두고 보면, ',
      default: '사랑과 마음의 거리를 두고 보면, ',
    },
    work: {
      beginning: '일·커리어의 새 출발을 두고 보면, ',
      will: '업무에서 실행력과 주도권을 두고 보면, ',
      intuition: '직장에서의 직감과 정보를 두고 보면, ',
      nurture: '성과를 키우고 팀을 돌보는 시점을 두고 보면, ',
      structure: '조직·규칙·책임을 두고 보면, ',
      tradition: '검증된 방식과 멘토의 가르침을 두고 보면, ',
      choice: '이직·포지션·협업 선택을 두고 보면, ',
      drive: '목표를 향한 추진과 경쟁을 두고 보면, ',
      courage: '압박 속 인내와 협상을 두고 보면, ',
      solitude: '혼자 집중해야 하는 업무를 두고 보면, ',
      cycle: '커리어의 전환점을 두고 보면, ',
      balance: '공정한 평가와 계약을 두고 보면, ',
      pause: '일을 잠시 멈추고 전략을 바꾸는 시점을 두고 보면, ',
      transition: '퇴사·이동·역할 변경을 두고 보면, ',
      blend: '부서·이해관계 조율을 두고 보면, ',
      bondage: '과로·집착·나쁜 습관을 두고 보면, ',
      upheaval: '조직·프로젝트의 급변을 두고 보면, ',
      hope: '커리어 회복과 영감을 두고 보면, ',
      doubt: '불확실한 평가·정치를 두고 보면, ',
      joy: '성과·인정이 드러나는 시점을 두고 보면, ',
      renewal: '새 제안·승진 소식을 두고 보면, ',
      completion: '프로젝트 마무리와 성취를 두고 보면, ',
      default: '일과 역할을 두고 보면, ',
    },
    money: {
      beginning: '수입·지출의 새 패턴을 두고 보면, ',
      will: '재정을 움직일 실행력을 두고 보면, ',
      intuition: '투자·지출 판단의 직감을 두고 보면, ',
      nurture: '자산을 키우고 관리하는 시점을 두고 보면, ',
      structure: '예산·계약·안전망을 두고 보면, ',
      tradition: '검증된 재테크·규칙을 두고 보면, ',
      choice: '지출·투자·공동 재정 선택을 두고 보면, ',
      drive: '수익을 밀어 올리는 추진을 두고 보면, ',
      courage: '손실·부담을 견디는 재정 인내를 두고 보면, ',
      solitude: '혼자 정리해야 할 돈 문제를 두고 보면, ',
      cycle: '재정 운의 전환을 두고 보면, ',
      balance: '빚·분배·공정 거래를 두고 보면, ',
      pause: '지출을 멈추고 재정을 점검하는 시점을 두고 보면, ',
      transition: '수입원·비용 구조의 변화를 두고 보면, ',
      blend: '수입과 지출의 균형을 두고 보면, ',
      bondage: '과소비·빚·금전 집착을 두고 보면, ',
      upheaval: '예상 밖 지출·손실을 두고 보면, ',
      hope: '재정 회복과 여유를 두고 보면, ',
      doubt: '불확실한 수입·숨은 비용을 두고 보면, ',
      joy: '보너스·이득이 보이는 시점을 두고 보면, ',
      renewal: '새 수입원·환수 소식을 두고 보면, ',
      completion: '재정 목표 달성을 두고 보면, ',
      default: '돈과 안정감을 두고 보면, ',
    },
    relation: {
      beginning: '가족·친구·동료 관계의 새 시작을 두고 보면, ',
      will: '관계에서 내 역할과 말을 두고 보면, ',
      intuition: '상대의 속마음과 뉘앙스를 두고 보면, ',
      nurture: '돌봄·배려·화해를 두고 보면, ',
      structure: '관계의 선·규칙·책임을 두고 보면, ',
      tradition: '가족·공동체의 관습을 두고 보면, ',
      choice: '어느 관계에 에너지를 쓸지를 두고 보면, ',
      drive: '관계 갈등 속 추진을 두고 보면, ',
      courage: '부담스러운 대화를 견디는 힘을 두고 보면, ',
      solitude: '거리 두기와 혼자만의 시간을 두고 보면, ',
      cycle: '관계의 주기 변화를 두고 보면, ',
      balance: '주고받음의 공정함을 두고 보면, ',
      pause: '관계를 잠시 멈추고 바라보는 시점을 두고 보면, ',
      transition: '인연의 이별·재회를 두고 보면, ',
      blend: '여러 사람 사이 조율을 두고 보면, ',
      bondage: '익숙한 갈등·의존 패턴을 두고 보면, ',
      upheaval: '관계의 갑작스러운 사건을 두고 보면, ',
      hope: '관계 회복의 가능성을 두고 보면, ',
      doubt: '오해·뒷말·불신을 두고 보면, ',
      joy: '함께 웃을 수 있는 순간을 두고 보면, ',
      renewal: '연락·화해·재연결을 두고 보면, ',
      completion: '관계가 한층 깊어지는 시점을 두고 보면, ',
      default: '주변 사람과의 연결을 두고 보면, ',
    },
    inner: {
      beginning: '내면의 새 각성을 두고 보면, ',
      will: '자기 통제와 의지를 두고 보면, ',
      intuition: '내면의 목소리와 직관을 두고 보면, ',
      nurture: '자기 돌봄과 치유를 두고 보면, ',
      structure: '삶의 루틴·가치관을 두고 보면, ',
      tradition: '나에게 맞는 신념·습관을 두고 보면, ',
      choice: '진짜 원하는 방향 선택을 두고 보면, ',
      drive: '내면의 추진과 욕구를 두고 보면, ',
      courage: '불안 속에서도 버티는 힘을 두고 보면, ',
      solitude: '고독과 성찰의 시간을 두고 보면, ',
      cycle: '성장의 전환기를 두고 보면, ',
      balance: '감정과 이성의 균형을 두고 보면, ',
      pause: '멈춤과 관점 전환을 두고 보면, ',
      transition: '낡은 나를 내려놓는 과정을 두고 보면, ',
      blend: '상반된 감정 조율을 두고 보면, ',
      bondage: '습관·두려움·자기비판을 두고 보면, ',
      upheaval: '정체성의 흔들림을 두고 보면, ',
      hope: '자기 회복과 영감을 두고 보면, ',
      doubt: '불안·망상·혼란을 두고 보면, ',
      joy: '자기 수용과 기쁨을 두고 보면, ',
      renewal: '새로운 나로 거듭남을 두고 보면, ',
      completion: '한 단계 성숙의 완성을 두고 보면, ',
      default: '내면과 성장을 두고 보면, ',
    },
  };

  const TOPIC_ADVICE = {
    love: {
      beginning: { fact: '연애·호감에서 순수한 설렘과 가벼운 시작.', counsel: '부담 없이 솔직함을 표현하되 상대의 속도와 동의를 존중할 것.' },
      will: { fact: '매력·표현력으로 관계를 이끌 수 있는 시기.', counsel: '말보다 행동과 배려로 신뢰를 쌓을 것.' },
      intuition: { fact: '속마음·질투·비밀이 드러나기 쉬운 흐름.', counsel: '추측 대신 차분한 대화로 확인할 것.' },
      nurture: { fact: '돌봄·애정·안정이 관계를 키움.', counsel: '상대를 키우듯 통제하지 말고 따뜻하게 지지할 것.' },
      structure: { fact: '약속·경계·책임이 관계의 틀을 만듦.', counsel: '안전한 규칙을 정하되 독단은 피할 것.' },
      tradition: { fact: '검증된 만남·소개·가치관 정렬이 유리.', counsel: '주변의 조언을 듣되 최종 선택은 내 마음에 맡길 것.' },
      choice: { fact: '둘 이상의 감정·옵션 사이의 갈림길.', counsel: '가슴과 현실을 함께 보고 한 가지에 집중할 것.' },
      drive: { fact: '관계를 밀고 가려는 추진·질투가 강함.', counsel: '속도를 조절하고 상대 의견을 물을 것.' },
      courage: { fact: '다툼 속에서도 부드러운 힘으로 버팀.', counsel: '이기려 하지 말고 이해로 갈등을 풀 것.' },
      solitude: { fact: '거리 두기·혼자만의 시간이 필요.', counsel: '연락을 끊기보다 ‘왜 멀어지고 싶은지’를 스스로 짚을 것.' },
      cycle: { fact: '연애 운·관계 단계가 바뀌는 전환.', counsel: '변화를 관계의 끝이 아닌 다음 챕터로 볼 것.' },
      balance: { fact: '공정함·진실이 관계를 정리함.', counsel: '감정에만 맞서지 말고 사실과 약속을 맞출 것.' },
      pause: { fact: '잠시 멈추고 관계를 다른 각도에서 봄.', counsel: '억지 연락보다 침묵 속에서 의미를 읽을 것.' },
      transition: { fact: '이별·재회·관계 격변의 기운.', counsel: '끝을 붙잡기보다 남은 마음을 정리하고 다음을 준비할 것.' },
      blend: { fact: '서로 다른 속도·성향을 조율해야 함.', counsel: '타협점을 찾되 나를 잃지 않을 것.' },
      bondage: { fact: '집착·의존·반복되는 갈등 패턴.', counsel: '익숙한 고통을 사랑으로 착각하지 말고 경계를 세울 것.' },
      upheaval: { fact: '갑작스러운 진실·사건이 관계를 흔듦.', counsel: '충격 직후 큰 결정은 미루고 사실부터 확인할 것.' },
      hope: { fact: '회복·용서·다시 믿을 수 있는 여지.', counsel: '상대만 믿기보다 나의 상처도 함께 돌볼 것.' },
      doubt: { fact: '불안·오해·애매한 신호.', counsel: '상상으로 상처받기 전에 짧게라도 확인할 것.' },
      joy: { fact: '기쁨·확신·관계가 밝게 드러남.', counsel: '좋은 때일수록 상대의 입장도 함께 축하할 것.' },
      renewal: { fact: '화해·재회·관계 재시작의 소식.', counsel: '과거 패턴이 반복되지 않게 조건을 분명히 할 것.' },
      completion: { fact: '관계가 한 단계 성숙·약속으로 이어짐.', counsel: '충만함을 누리되 앞으로의 역할을 함께 정할 것.' },
      default: { fact: '사랑·마음의 거리가 핵심 이슈.', counsel: '상대와 나의 속도를 맞추며 솔직함을 택할 것.' },
    },
    work: {
      beginning: { fact: '새 프로젝트·직무·시도의 문이 열림.', counsel: '완벽한 계획보다 작은 실행으로 검증할 것.' },
      will: { fact: '실행력·기술·주도권이 강조됨.', counsel: '혼자 다 하려 하지 말고 협업 자원을 쓸 것.' },
      intuition: { fact: '숨은 정보·회의·배경이 중요.', counsel: '공개된 말만 믿지 말고 기록과 사실을 남길 것.' },
      nurture: { fact: '성과·팀·브랜드를 키우는 시기.', counsel: '단기 성과만이 아니라 지속 가능한 루틴을 만들 것.' },
      structure: { fact: '규칙·책임·리더십이 요구됨.', counsel: '명확한 역할 분담과 마감을 지킬 것.' },
      tradition: { fact: '검증된 방식·멘토·자격이 도움.', counsel: '새로움만 고집하지 말고 배울 사람을 찾을 것.' },
      choice: { fact: '이직·포지션·파트너 선택의 기로.', counsel: '연봉만이 아니라 성장·문화를 함께 비교할 것.' },
      drive: { fact: '추진·경쟁·속도가 승패를 가름.', counsel: '번아웃 전에 우선순위를 세 줄일 것.' },
      courage: { fact: '압박·갈등 속 인내와 협상.', counsel: '감정 싸움 대신 사실과 결과로 말할 것.' },
      solitude: { fact: '집중·연구·1인 업무에 유리.', counsel: '고립되지 않게 주기적으로 공유할 것.' },
      cycle: { fact: '커리어 전환·운의 바퀴.', counsel: '변화를 위기가 아닌 재배치로 받아들일 것.' },
      balance: { fact: '공정한 평가·계약·분쟁 정리.', counsel: '서면·증거를 남기고 감정적 결정은 피할 것.' },
      pause: { fact: '전략 수정·쉼·관점 전환.', counsel: '멈춤을 게으름이 아닌 재정비로 쓸 것.' },
      transition: { fact: '퇴사·이동·구조 개편.', counsel: '끝낼 것은 깔끔히 정리하고 인맥을 해치지 말 것.' },
      blend: { fact: '부서·이해관계·팀 조율.', counsel: '모두를 만족시키려다 핵심을 잃지 말 것.' },
      bondage: { fact: '과로·집착·나쁜 업무 습관.', counsel: '버티기만 하지 말고 바꿀 수 있는 한 가지부터 끊을 것.' },
      upheaval: { fact: '조직·프로젝트의 급격한 변화.', counsel: '통제 밖 일은 받아들이고 통제 가능한 것부터 잡을 것.' },
      hope: { fact: '영감·회복·새 기회.', counsel: '장기 비전을 적고 단기 목표로 쪼갤 것.' },
      doubt: { fact: '불확실·정치·정보 비대칭.', counsel: '중요한 서명·발표는 하루 더 미룰 것.' },
      joy: { fact: '성과·인정·가시적 성공.', counsel: '겸손히 유지하고 다음 목표를 정할 것.' },
      renewal: { fact: '제안·승진·새 역할.', counsel: '기회를 잡되 과도한 약속은 하지 말 것.' },
      completion: { fact: '프로젝트 완료·한 사이클 마침.', counsel: '성과를 기록하고 다음 단계를 설계할 것.' },
      default: { fact: '일·역할·성과가 핵심.', counsel: '우선순위를 세우고 실행 가능한 크기로 나눌 것.' },
    },
    money: {
      beginning: { fact: '수입·지출 패턴의 새 시작.', counsel: '작은 저축·시범 투자로 흐름을 만들 것.' },
      will: { fact: '재정을 움직일 실행력·기회.', counsel: '계획 없는 지출·투자는 피할 것.' },
      intuition: { fact: '숨은 비용·계약·리스크 주의.', counsel: '확인되지 않은 정보만으로 결정하지 말 것.' },
      nurture: { fact: '자산·수입원을 키우는 시기.', counsel: '장기 관점으로 분산·관리할 것.' },
      structure: { fact: '예산·계약·안전망이 중요.', counsel: '고정비와 비상금을 먼저 확보할 것.' },
      tradition: { fact: '검증된 재테크·전문가 조언 유리.', counsel: '남의 성공담만 따라 하지 말고 내 상황에 맞출 것.' },
      choice: { fact: '지출·투자·공동 재정 선택.', counsel: '감정 소비 대신 숫자로 비교할 것.' },
      drive: { fact: '수익 추진·빠른 회전.', counsel: '레버리지는 리스크와 함께 볼 것.' },
      courage: { fact: '손실·부담을 견디는 인내.', counsel: '버티되 손실 한도를 정해 둘 것.' },
      solitude: { fact: '혼자 정리할 돈·세금·부채.', counsel: '외부 도움(전문가)을 부끄러워하지 말 것.' },
      cycle: { fact: '재정 운의 전환·시장 사이클.', counsel: '운이 좋을 때 비축, 어려울 때 지출을 줄일 것.' },
      balance: { fact: '빚·분배·공정 거래.', counsel: '서로 다른 기대를 문서로 맞출 것.' },
      pause: { fact: '지출 멈춤·재정 점검.', counsel: '충동 구매·투자를 일주일 유보할 것.' },
      transition: { fact: '수입원·비용 구조 변화.', counsel: '끊기는 돈과 새로 들어올 돈을 표로 정리할 것.' },
      blend: { fact: '수입·지출·저축 균형.', counsel: '한쪽만 맞추려 하지 말고 비율을 조정할 것.' },
      bondage: { fact: '과소비·빚·금전 집착.', counsel: '익숙한 부족감이 지출을 부르는지 짚을 것.' },
      upheaval: { fact: '예상 밖 지출·손실.', counsel: '긴급 자금·보험·지원 제도를 확인할 것.' },
      hope: { fact: '재정 회복·여유·희망.', counsel: '낙관만 하지 말고 현실 예산을 업데이트할 것.' },
      doubt: { fact: '불확실한 수입·숨은 비용.', counsel: '현금 흐름을 월 단위로 추적할 것.' },
      joy: { fact: '이득·보너스·수익 가시화.', counsel: '일부는 저축·상환에 먼저 쓸 것.' },
      renewal: { fact: '새 수입원·환수·정산.', counsel: '조건을 꼼꼼히 읽고 장기 부담을 볼 것.' },
      completion: { fact: '재정 목표 달성·마무리.', counsel: '성과를 유지할 시스템을 남길 것.' },
      default: { fact: '돈·안정·가치 교환이 핵심.', counsel: '감정과 지갑을 분리해 숫자로 결정할 것.' },
    },
    relation: {
      beginning: { fact: '가족·친구·동료 연결의 새 시작.', counsel: '먼저 가벼운 안부로 문을 열 것.' },
      will: { fact: '관계에서 내 역할·표현이 두드러짐.', counsel: '일방적 주도보다 상호 존중을 택할 것.' },
      intuition: { fact: '속마음·뒷이야기·오해 주의.', counsel: '전언 대신 직접 확인할 것.' },
      nurture: { fact: '돌봄·화해·공동체가 강조됨.', counsel: '비난 대신 필요를 묻는 말을 할 것.' },
      structure: { fact: '경계·역할·책임이 관계를 지탱.', counsel: '‘당연하다’는 기대를 말로 나눌 것.' },
      tradition: { fact: '가족·관습·세대 차이 이슈.', counsel: '존중과 거리 두기를 함께 쓸 것.' },
      choice: { fact: '어느 관계에 시간을 쓸지 선택.', counsel: '모두에게 맞추려다 소진되지 말 것.' },
      drive: { fact: '갈등·경쟁·주도권 다툼.', counsel: '이기기보다 관계 유지가 목표인지 정할 것.' },
      courage: { fact: '어려운 대화를 버티는 힘.', counsel: '할 말은 짧고 구체적으로 할 것.' },
      solitude: { fact: '거리 두기·혼자만의 회복.', counsel: '고립을 벌이지 말고 이유를 설명할 것.' },
      cycle: { fact: '인연의 주기·환경 변화.', counsel: '자연스러운 변화를 개인 탓으로만 돌리지 말 것.' },
      balance: { fact: '공정한 주고받음·중재.', counsel: '한쪽만 희생하는 구조를 바로잡을 것.' },
      pause: { fact: '관계를 잠시 멈추고 관찰.', counsel: '성급한 차단·폭로는 피할 것.' },
      transition: { fact: '이별·재회·관계 재편.', counsel: '남은 앙금을 정리하고 다음 규칙을 정할 것.' },
      blend: { fact: '여러 사람 사이 조율.', counsel: '중립을 지키되 내 입장도 분명히 할 것.' },
      bondage: { fact: '익숙한 갈등·의존·역할 고착.', counsel: '‘원래 그래’라는 말에 속지 말 것.' },
      upheaval: { fact: '갑작스러운 사건·배신·소식.', counsel: '충격 후 관계 정의를 다시 쓸 시간을 가질 것.' },
      hope: { fact: '화해·신뢰 회복 가능성.', counsel: '작은 약속부터 지켜 보일 것.' },
      doubt: { fact: '불신·험담·애매한 태도.', counsel: '확인 전에 단정·편 가르기를 멈출 것.' },
      joy: { fact: '함께 웃고 축하할 순간.', counsel: '좋은 때일수록 소외된 사람이 없는지 볼 것.' },
      renewal: { fact: '연락·재연결·관계 재시작.', counsel: '과거 문제를 반복하지 않을 규칙을 정할 것.' },
      completion: { fact: '관계가 깊어지거나 한 단계 정리됨.', counsel: '감사를 표현하고 다음 역할을 맞출 것.' },
      default: { fact: '주변 사람과의 연결이 핵심.', counsel: '듣기와 경계를 함께 지킬 것.' },
    },
    inner: {
      beginning: { fact: '내면의 새 출발·각성.', counsel: '완벽하지 않아도 작은 실험을 허용할 것.' },
      will: { fact: '의지·자기 주도·능력 자각.', counsel: '남의 기준보다 내 속도를 따를 것.' },
      intuition: { fact: '직감·꿈·무의식 신호.', counsel: '직감을 메모하되 중요한 결정은 하루 숙성할 것.' },
      nurture: { fact: '자기 돌봄·치유·회복.', counsel: '수면·식사·쉼을 우선순위에 둘 것.' },
      structure: { fact: '루틴·가치관·자기 규율.', counsel: '지나친 통제는 유연하게 조정할 것.' },
      tradition: { fact: '나에게 맞는 신념·멘토·습관.', counsel: '남의 정답을 그대로 삼지 말 것.' },
      choice: { fact: '진짜 원하는 방향 선택.', counsel: '남을 실망시키는 것과 나를 배신하는 것을 구분할 것.' },
      drive: { fact: '욕구·추진·에너지 과잉.', counsel: '몸 신호를 보고 쉬는 타이밍을 지킬 것.' },
      courage: { fact: '불안 속 인내·자기 수용.', counsel: '약함을 숨기지 말고 도움을 청할 것.' },
      solitude: { fact: '고독·성찰·내면 탐구.', counsel: '고립과 회복의 고독을 구분할 것.' },
      cycle: { fact: '성장 주기·정체·전환.', counsel: '지금은 씨앗 단계일 수 있음을 기억할 것.' },
      balance: { fact: '감정과 이성의 균형.', counsel: '극단으로 치우치지 말 것.' },
      pause: { fact: '멈춤·관점 전환·휴식.', counsel: '멈춤을 실패가 아닌 재충전으로 볼 것.' },
      transition: { fact: '낡은 나·습관의 종료.', counsel: '끝낸 것에 감사하고 비우기를 할 것.' },
      blend: { fact: '상반된 감정·욕구 조율.', counsel: '둘 다 맞는 제3의 선택을 찾을 것.' },
      bondage: { fact: '습관·두려움·자기비판.', counsel: '자책 대신 한 가지 작은 행동을 바꿀 것.' },
      upheaval: { fact: '정체성·믿음의 흔들림.', counsel: '큰 결론보다 오늘 할 수 있는 안정 행동을 택할 것.' },
      hope: { fact: '회복·영감·자기 신뢰.', counsel: '미래만 그리지 말고 오늘의 작은 성취를 기록할 것.' },
      doubt: { fact: '불안·망상·혼란.', counsel: '검증되지 않은 생각에 몸을 맡기지 말 것.' },
      joy: { fact: '자기 수용·기쁨·활력.', counsel: '죄책감 없이 쉬어도 된다고 허락할 것.' },
      renewal: { fact: '새로운 나·재시작.', counsel: '과거의 나를 비난하지 말 것.' },
      completion: { fact: '한 단계 성숙·통합.', counsel: '배운 것을 일상 루틴에 남길 것.' },
      default: { fact: '내면·성장·자기 이해가 핵심.', counsel: '비교를 줄이고 내 리듬을 따를 것.' },
    },
  };

  const MINOR_TOPIC_ADVICE = {
    love: {
      wands: { fact: '열정·설렘·적극적 호감.', counsel: '충동 고백보다 상대 마음을 확인한 뒤 움직일 것.' },
      cups: { fact: '감정·교감·로맨스·치유.', counsel: '감정을 솔직히 표현하고 평화롭게 접근할 것.' },
      swords: { fact: '대화·오해·거리·진실.', counsel: '날카로운 말 대신 사실 확인 대화를 택할 것.' },
      pentacles: { fact: '안정·현실·미래 설계.', counsel: '연애도 생활·시간·돈의 현실을 함께 볼 것.' },
      major: { fact: '관계의 큰 전환·운명적 메시지.', counsel: '감정의 파도 속에서도 내 경계를 지킬 것.' },
      default: { fact: '사랑·마음의 이슈.', counsel: '상대와 나의 속도를 맞출 것.' },
    },
    work: {
      wands: { fact: '추진·열정·새 업무.', counsel: '속도만큼 마감·품질도 챙길 것.' },
      cups: { fact: '팀 분위기·동료 관계.', counsel: '감정 노동 후 회복 시간을 둘 것.' },
      swords: { fact: '계약·협상·정보·결정.', counsel: '말보다 문서·기록을 남길 것.' },
      pentacles: { fact: '성과·보상·실무·재정.', counsel: '숫자와 결과로 설득할 것.' },
      major: { fact: '커리어의 큰 그림.', counsel: '단기 성과와 장기 방향을 분리해 볼 것.' },
      default: { fact: '일·역할 이슈.', counsel: '우선순위를 세 줄일 것.' },
    },
    money: {
      wands: { fact: '수익 기회·빠른 실행.', counsel: '투기보다 검증된 채널을 택할 것.' },
      cups: { fact: '가치·만족·관계와 돈.', counsel: '감정 소비인지 구분할 것.' },
      swords: { fact: '계약·세금·분쟁·조건.', counsel: '작은 글씨와 숨은 비용을 확인할 것.' },
      pentacles: { fact: '자산·저축·현실적 이득.', counsel: '비상금·상환 순서를 먼저 정할 것.' },
      major: { fact: '재정 구조의 전환.', counsel: '큰 결정은 숫자 시뮬레이션 후에 할 것.' },
      default: { fact: '돈·안정 이슈.', counsel: '지출을 일주일 기록할 것.' },
    },
    relation: {
      wands: { fact: '갈등·추진·주도권 다툼.', counsel: '이기기보다 관계 유지를 목표로 할 것.' },
      cups: { fact: '정서·화해·공감.', counsel: '비난 대신 느낌을 말할 것.' },
      swords: { fact: '오해·말다툼·거리.', counsel: '확인 전 단정을 멈출 것.' },
      pentacles: { fact: '역할·의무·실질적 지원.', counsel: '돈·시간·노력의 공평을 맞출 것.' },
      major: { fact: '인연의 큰 흐름.', counsel: '모든 사람을 만족시키려 하지 말 것.' },
      default: { fact: '주변 관계 이슈.', counsel: '듣기와 경계를 함께 쓸 것.' },
    },
    inner: {
      wands: { fact: '욕구·동기·에너지.', counsel: '타오르는 마음을 행동 한 가지로 쓸 것.' },
      cups: { fact: '감정·치유·자기 돌봄.', counsel: '감정을 억누르지 말고 기록할 것.' },
      swords: { fact: '생각·불안·자기 대화.', counsel: '반복 걱정을 사실 검증할 것.' },
      pentacles: { fact: '몸·루틴·현실적 안정.', counsel: '수면·식사·걷기부터 회복할 것.' },
      major: { fact: '삶의 큰 각성.', counsel: '큰 답보다 오늘의 작은 실천을 택할 것.' },
      default: { fact: '내면·성장 이슈.', counsel: '비교를 줄이고 쉬어도 된다고 허락할 것.' },
    },
  };

  const MINOR_MONO_LEAD = {
    love: { cups: '마음과 감정을 두고 보면, ', wands: '설렘과 열정을 두고 보면, ', swords: '대화와 거리를 두고 보면, ', pentacles: '관계의 현실과 약속을 두고 보면, ', default: '사랑의 자리에서 보면, ' },
    work: { wands: '업무의 속도와 추진을 두고 보면, ', cups: '직장의 관계와 분위기를 두고 보면, ', swords: '판단과 협상을 두고 보면, ', pentacles: '성과와 보상을 두고 보면, ', default: '일의 자리에서 보면, ' },
    money: { pentacles: '돈과 안정을 두고 보면, ', cups: '가치와 만족을 두고 보면, ', swords: '계약과 조건을 두고 보면, ', wands: '수익 기회를 두고 보면, ', default: '재정을 두고 보면, ' },
    relation: { cups: '정서와 돌봄을 두고 보면, ', swords: '말과 오해를 두고 보면, ', wands: '갈등과 주도권을 두고 보면, ', pentacles: '역할과 의무를 두고 보면, ', default: '주변 관계를 두고 보면, ' },
    inner: { cups: '감정과 치유를 두고 보면, ', swords: '생각과 불안을 두고 보면, ', wands: '욕구와 동기를 두고 보면, ', pentacles: '몸과 루틴을 두고 보면, ', default: '내면을 두고 보면, ' },
  };

  function resolveTopic(ctx) {
    if (!ctx || ctx.curMode !== 'question') return null;
    if (ctx.curTopic === 'custom') return 'custom';
    if (TOPICS.indexOf(ctx.curTopic) >= 0) return ctx.curTopic;
    return null;
  }

  function archKey(card) {
    if (card.suit === 'major') return MAJOR_ARCHETYPE[card.id] || 'default';
    return card.suit || 'default';
  }

  function suitKey(card) {
    if (card.suit === 'major') return 'major';
    return card.suit || 'default';
  }

  function customMonoLead(questionText) {
    const q = (questionText || '').trim();
    if (!q) return '지금 마음에 둔 질문을 두고 보면, ';
    if (q.length > 42) return '「' + q.slice(0, 40) + '…」에 대해 물으시는 지금, ';
    return '「' + q + '」에 대해 물으시는 지금, ';
  }

  function customAdviceTail(questionText) {
    const q = (questionText || '').trim();
    if (!q) return ' 위 조언을 지금의 질문에 맞춰 오늘의 선택에 적용해 보세요.';
    return ' 위 조언을 「' + q + '」에 맞춰 오늘의 선택에 적용해 보세요.';
  }

  function formatAdvice(fact, counsel) {
    return '팩트: ' + fact + ' 조언: ' + counsel;
  }

  window.applyTarotTopicMono = function (card, baseMono, ctx) {
    const topic = resolveTopic(ctx);
    if (!topic || card.faceRev) return baseMono;

    if (topic === 'custom') {
      return customMonoLead(ctx.questionText) + baseMono;
    }

    if (card.suit === 'major') {
      const arch = archKey(card);
      const lead = (TOPIC_MONO_LEAD[topic] && (TOPIC_MONO_LEAD[topic][arch] || TOPIC_MONO_LEAD[topic].default)) || '';
      return lead + baseMono;
    }

    const sk = suitKey(card);
    const lead = (MINOR_MONO_LEAD[topic] && (MINOR_MONO_LEAD[topic][sk] || MINOR_MONO_LEAD[topic].default)) || '';
    return lead + baseMono;
  };

  window.applyTarotTopicAdvice = function (card, baseAdvice, ctx) {
    const topic = resolveTopic(ctx);
    if (!topic || card.faceRev) return baseAdvice;

    let fact;
    let counsel;

    if (card.suit === 'major') {
      const arch = archKey(card);
      const tpl = TOPIC_ADVICE[topic] && (TOPIC_ADVICE[topic][arch] || TOPIC_ADVICE[topic].default);
      if (tpl) {
        fact = tpl.fact;
        counsel = tpl.counsel;
      }
    } else {
      const sk = suitKey(card);
      const tpl = MINOR_TOPIC_ADVICE[topic] && (MINOR_TOPIC_ADVICE[topic][sk] || MINOR_TOPIC_ADVICE[topic].default);
      if (tpl) {
        fact = tpl.fact;
        counsel = tpl.counsel;
      }
    }

    if (!fact) return baseAdvice;

    let out = formatAdvice(fact, counsel);
    if (topic === 'custom') out += customAdviceTail(ctx.questionText);
    return out;
  };
})();
