/**
 * Petit Lenormand 36장 — 상담사 AI 리딩용
 * 표시번호 = id (1~36). 이미지는 public/lenormand/01-rider.webp …
 */
(function (global) {
  'use strict';

  const CARDS = [
    { id: 1, en: 'rider', ko: '기사', keywords: '소식·방문·빠른 전개', aliases: ['rider', '기수', '전령'] },
    { id: 2, en: 'clover', ko: '클로버', keywords: '행운·기회·가벼운 기쁨', aliases: ['clover', '네잎', '행운'] },
    { id: 3, en: 'ship', ko: '배', keywords: '이동·거래·먼 일', aliases: ['ship', '여행', '무역'] },
    { id: 4, en: 'house', ko: '집', keywords: '가정·기반·안정', aliases: ['house', '가정', '부동산'] },
    { id: 5, en: 'tree', ko: '나무', keywords: '건강·뿌리·성장', aliases: ['tree', '건강', '생명'] },
    { id: 6, en: 'clouds', ko: '구름', keywords: '혼란·불확실·모호', aliases: ['clouds', 'cloud', '안개'] },
    { id: 7, en: 'snake', ko: '뱀', keywords: '복잡·유혹·우회', aliases: ['snake', '배신', '지혜'] },
    { id: 8, en: 'coffin', ko: '관', keywords: '종료·변환·비움', aliases: ['coffin', '끝', '상실'] },
    { id: 9, en: 'bouquet', ko: '꽃다발', keywords: '선물·호감·초대', aliases: ['bouquet', '꽃', '칭찬'] },
    { id: 10, en: 'scythe', ko: '낫', keywords: '절단·결단·위기', aliases: ['scythe', '절단', '수술'] },
    { id: 11, en: 'whip', ko: '채찍', keywords: '갈등·반복·논쟁', aliases: ['whip', '막대', '다툼'] },
    { id: 12, en: 'birds', ko: '새', keywords: '대화·소문·불안', aliases: ['birds', 'bird', '통화'] },
    { id: 13, en: 'child', ko: '아이', keywords: '시작·순수·새로움', aliases: ['child', '어린이', '순수'] },
    { id: 14, en: 'fox', ko: '여우', keywords: '전략·직장·경계', aliases: ['fox', '교활', '일'] },
    { id: 15, en: 'bear', ko: '곰', keywords: '힘·보호·상사', aliases: ['bear', '권력', '재력'] },
    { id: 16, en: 'stars', ko: '별', keywords: '희망·영감·방향', aliases: ['stars', 'star', '꿈'] },
    { id: 17, en: 'stork', ko: '황새', keywords: '변화·이사·개선', aliases: ['stork', '이동', '출산'] },
    { id: 18, en: 'dog', ko: '개', keywords: '충성·친구·신뢰', aliases: ['dog', '친구', '동반'] },
    { id: 19, en: 'tower', ko: '탑', keywords: '기관·권위·고립', aliases: ['tower', '관청', '회사'] },
    { id: 20, en: 'garden', ko: '정원', keywords: '사교·공개·모임', aliases: ['garden', '파티', '네트워크'] },
    { id: 21, en: 'mountain', ko: '산', keywords: '장애·지연·벽', aliases: ['mountain', '막힘', '도전'] },
    { id: 22, en: 'crossroads', ko: '길', keywords: '선택·갈림·옵션', aliases: ['crossroads', 'paths', 'path', '선택'] },
    { id: 23, en: 'mice', ko: '쥐', keywords: '손실·스트레스·갉아먹음', aliases: ['mice', 'mouse', '걱정'] },
    { id: 24, en: 'heart', ko: '심장', keywords: '사랑·감정·애정', aliases: ['heart', '연애', '마음'] },
    { id: 25, en: 'ring', ko: '반지', keywords: '계약·약속·순환', aliases: ['ring', '약혼', '계약'] },
    { id: 26, en: 'book', ko: '책', keywords: '비밀·학습·미지', aliases: ['book', '비밀', '공부'] },
    { id: 27, en: 'letter', ko: '편지', keywords: '문서·메시지·통보', aliases: ['letter', '메일', '서류'] },
    { id: 28, en: 'man', ko: '남자', keywords: '남성·질문자/상대', aliases: ['man', '남성', '그'] },
    { id: 29, en: 'woman', ko: '여자', keywords: '여성·질문자/상대', aliases: ['woman', '여성', '그녀'] },
    { id: 30, en: 'lily', ko: '백합', keywords: '성숙·평화·보호', aliases: ['lily', '순수', '어른'] },
    { id: 31, en: 'sun', ko: '태양', keywords: '성공·명확·에너지', aliases: ['sun', '성공', '밝음'] },
    { id: 32, en: 'moon', ko: '달', keywords: '인정·감정·명성', aliases: ['moon', '밤', '직감'] },
    { id: 33, en: 'key', ko: '열쇠', keywords: '해답·중요·열림', aliases: ['key', '해결', '핵심'] },
    { id: 34, en: 'fish', ko: '물고기', keywords: '돈·사업·풍요', aliases: ['fish', '재물', '사업'] },
    { id: 35, en: 'anchor', ko: '닻', keywords: '안정·지속·정착', aliases: ['anchor', '직업', '버티기'] },
    { id: 36, en: 'cross', ko: '십자가', keywords: '짐·시련·운명', aliases: ['cross', '고통', '책임'] },
  ];

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function imageSrc(id) {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1 || n > 36) return '';
    const c = CARDS[n - 1];
    if (!c) return '';
    return 'lenormand/' + pad2(c.id) + '-' + c.en + '.webp';
  }

  function byId(id) {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1 || n > 36) return null;
    const c = CARDS[n - 1];
    return {
      id: c.id,
      num: c.id,
      name: c.ko,
      en: c.en,
      keywords: c.keywords,
      aliases: c.aliases || [],
      imageSrc: imageSrc(c.id),
    };
  }

  function byDisplayNum(n) {
    return byId(n);
  }

  function normalizeQuery(q) {
    return String(q || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  /** 번호·한글명·영문·별칭 검색 */
  function search(query, limit) {
    const lim = Math.min(36, Math.max(1, Number(limit) || 12));
    const raw = String(query || '').trim();
    if (!raw) return CARDS.slice(0, lim).map((c) => byId(c.id));

    const q = normalizeQuery(raw);
    const num = Number(raw.replace(/[^\d]/g, ''));
    if (Number.isInteger(num) && num >= 1 && num <= 36 && String(num) === raw.replace(/\s/g, '')) {
      return [byId(num)];
    }

    const scored = [];
    for (let i = 0; i < CARDS.length; i++) {
      const c = CARDS[i];
      const ko = c.ko.toLowerCase();
      const en = c.en.toLowerCase();
      const idStr = String(c.id);
      let score = 0;
      if (idStr === raw.trim() || idStr === q) score = 100;
      else if (ko === q || en === q) score = 90;
      else if (ko.indexOf(q) === 0 || en.indexOf(q) === 0) score = 80;
      else if (ko.indexOf(q) >= 0 || en.indexOf(q) >= 0) score = 60;
      else {
        for (let a = 0; a < (c.aliases || []).length; a++) {
          const al = String(c.aliases[a]).toLowerCase();
          if (al === q) { score = 85; break; }
          if (al.indexOf(q) === 0) { score = 70; break; }
          if (q.indexOf(al) >= 0 || al.indexOf(q) >= 0) { score = 50; break; }
        }
      }
      if (score > 0) scored.push({ score, card: byId(c.id) });
    }
    scored.sort((a, b) => b.score - a.score || a.card.id - b.card.id);
    return scored.slice(0, lim).map((x) => x.card);
  }

  global.CounselorLenormandDeck = {
    size: 36,
    cards: CARDS,
    byId,
    byDisplayNum,
    imageSrc,
    search,
    label: function (card) {
      if (!card) return '';
      return card.num + '. ' + card.name;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
