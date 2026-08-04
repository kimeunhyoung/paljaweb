/**
 * 상담사 AI 리딩용 78장 이름·키워드 (표시번호 1~78 = 덱 id 0~77)
 */
(function (global) {
  const NAMES = [
    '바보', '마법사', '여사제', '여황제', '황제', '교황', '연인', '전차',
    '힘', '은둔자', '운명의 수레바퀴', '정의', '매달린 남자', '죽음', '절제', '악마',
    '탑', '별', '달', '태양', '심판', '세계',
    '완드 에이스', '완드 2', '완드 3', '완드 4', '완드 5', '완드 6', '완드 7', '완드 8',
    '완드 9', '완드 10', '완드 시종', '완드 기사', '완드 여왕', '완드 왕',
    '컵 에이스', '컵 2', '컵 3', '컵 4', '컵 5', '컵 6', '컵 7', '컵 8',
    '컵 9', '컵 10', '컵 시종', '컵 기사', '컵 여왕', '컵 왕',
    '소드 에이스', '소드 2', '소드 3', '소드 4', '소드 5', '소드 6', '소드 7', '소드 8',
    '소드 9', '소드 10', '소드 시종', '소드 기사', '소드 여왕', '소드 왕',
    '펜타클 에이스', '펜타클 2', '펜타클 3', '펜타클 4', '펜타클 5', '펜타클 6', '펜타클 7', '펜타클 8',
    '펜타클 9', '펜타클 10', '펜타클 시종', '펜타클 기사', '펜타클 여왕', '펜타클 왕',
  ];

  const KW = [
    '시작·순수·모험', '의지·실행·도구', '직관·내면·비밀', '풍요·돌봄·창조', '구조·권위·안정',
    '전통·가르침·규범', '선택·관계·가치', '추진·승리·통제', '용기·인내·자기통제', '성찰·고독·신중',
    '전환·순환·타이밍', '균형·진실·책임', '관점 전환·내려놓음', '종료·변화·재탄생', '조화·중용·조율',
    '집착·속박·욕망', '충격·붕괴·각성', '희망·치유·영감', '불안·혼란·직감', '명확·기쁨·성공',
    '부름·각성·정리', '완성·통합·마무리',
    '열정·시작', '계획·시야', '확장·진행', '축하·기반', '경쟁·갈등', '인정·승리', '방어·고수', '신속·소식',
    '인내·경계', '과부하·짐', '호기심·탐색', '돌진·열정', '자신감·매력', '비전·리더십',
    '감정 시작', '연결·교감', '축하·우정', '권태·정체', '상실·후회', '추억·위로', '환상·선택', '퇴장·내려놓음',
    '만족·소원', '충만·평화', '감성·제안', '낭만·초대', '공감·직관', '감정 조절',
    '명확·결단', '보류·대치', '상처·단절', '휴식·회복', '갈등·자존심', '이동·안정', '독자·회피', '생각의 감옥',
    '불안·걱정', '끝·새 새벽', '관찰·탐색', '속전속결', '이성·선 긋기', '공정·기준',
    '기회·유입', '균형·조율', '협동·기술', '소유·방어', '결핍·곤경', '나눔·도움', '점검·인내', '연마·성실',
    '자립·풍요', '장기 안정', '학습·시작', '신중·루틴', '실용·돌봄', '번영·기반',
  ];

  function byDisplayNum(n) {
    const num = Number(n);
    if (!Number.isInteger(num) || num < 1 || num > 78) return null;
    const id = num - 1;
    return { id, num, name: NAMES[id], keywords: KW[id] || '', imageSrc: rwsImageSrc(id) };
  }

  function byId(id) {
    const i = Number(id);
    if (!Number.isInteger(i) || i < 0 || i > 77) return null;
    return { id: i, num: i + 1, name: NAMES[i], keywords: KW[i] || '', imageSrc: rwsImageSrc(i) };
  }

  /** 타로코드「카드만 뽑기」와 동일 — public/tarot-rws (Rider–Waite–Smith PD) */
  function rwsImageSrc(id) {
    const i = Number(id);
    if (!Number.isInteger(i) || i < 0 || i > 77) return '';
    let file;
    if (i <= 21) file = 'major (' + i + ').jpg';
    else if (i <= 35) file = 'wands (' + (i - 21) + ').jpg';
    else if (i <= 49) file = 'cups (' + (i - 35) + ').jpg';
    else if (i <= 63) file = 'swords (' + (i - 49) + ').jpg';
    else file = 'pentacles (' + (i - 63) + ').jpg';
    return 'tarot-rws/' + encodeURIComponent(file);
  }

  global.CounselorTarotDeck = {
    size: 78,
    names: NAMES,
    byDisplayNum,
    byId,
    rwsImageSrc,
    label: function (card, reversed) {
      if (!card) return '';
      return card.num + '. ' + card.name + (reversed ? ' (역)' : ' (정)');
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
