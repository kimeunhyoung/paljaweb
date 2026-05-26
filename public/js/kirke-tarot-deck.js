/**
 * Circe Tarot (키르케신화타로) — 78장 덱 데이터
 * 이미지: public/circetarot/{메이저|완즈|컵|소드|펜타클}/N.jpg
 * 해설: kirke-tarot-meanings.js (공식 해설서 기반)
 */
(function () {
  const MEANINGS = window.KIRKE_CARD_MEANINGS || {};
  const PLACEHOLDER_UPRIGHT = '카드 해설을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
  const PLACEHOLDER_REVERSED = '역방향 해설을 불러오지 못했습니다.';
  const PLACEHOLDER_KEYWORDS = '준비 중';

  const SUIT_FOLDER = {
    major: '메이저',
    wands: '완즈',
    cups: '컵',
    swords: '소드',
    pentacles: '펜타클',
  };

  const SUIT_META = [
    { suit: 'wands', label: '완드', base: 22 },
    { suit: 'cups', label: '컵', base: 36 },
    { suit: 'swords', label: '소드', base: 50 },
    { suit: 'pentacles', label: '펜타클', base: 64 },
  ];

  const MINOR_RANKS = [
    { rank: 1, label: '에이스' },
    { rank: 2, label: '2' },
    { rank: 3, label: '3' },
    { rank: 4, label: '4' },
    { rank: 5, label: '5' },
    { rank: 6, label: '6' },
    { rank: 7, label: '7' },
    { rank: 8, label: '8' },
    { rank: 9, label: '9' },
    { rank: 10, label: '10' },
    { rank: 11, label: '시종', court: 'page' },
    { rank: 12, label: '기사', court: 'knight' },
    { rank: 13, label: '여왕', court: 'queen' },
    { rank: 14, label: '왕', court: 'king' },
  ];

  function cardImagePath(card) {
    const folder = SUIT_FOLDER[card.arcana === 'major' ? 'major' : card.suit];
    // 메이저: 0.jpg~21.jpg / 마이너: 1.jpg~14.jpg (에이스=1, 왕=14)
    const num = card.arcana === 'major' ? card.id : card.rank;
    return `circetarot/${encodeURIComponent(folder)}/${num}.jpg`;
  }

  function applyMeaning(card, id) {
    const m = MEANINGS[id];
    if (!m) return card;
    return {
      ...card,
      name: m.nameKr || card.name,
      en: m.en || card.en,
      myth: m.myth || '',
      keywords: m.keywords || PLACEHOLDER_KEYWORDS,
      upright: m.upright || PLACEHOLDER_UPRIGHT,
      reversed: m.reversed || PLACEHOLDER_REVERSED,
    };
  }

  function buildDeck() {
    const deck = [];

    for (let i = 0; i < 22; i++) {
      const card = {
        id: i,
        arcana: 'major',
        suit: 'major',
        rank: i,
        name: `메이저 ${i}`,
        en: '',
        myth: '',
        keywords: PLACEHOLDER_KEYWORDS,
        upright: PLACEHOLDER_UPRIGHT,
        reversed: PLACEHOLDER_REVERSED,
        image: cardImagePath({ arcana: 'major', id: i, suit: 'major' }),
      };
      deck.push(applyMeaning(card, i));
    }

    for (const sm of SUIT_META) {
      for (let r = 0; r < MINOR_RANKS.length; r++) {
        const id = sm.base + r;
        const mr = MINOR_RANKS[r];
        const card = {
          id,
          arcana: 'minor',
          suit: sm.suit,
          rank: mr.rank,
          court: mr.court || null,
          name: `${sm.label} ${mr.label}`,
          en: '',
          myth: '',
          keywords: PLACEHOLDER_KEYWORDS,
          upright: PLACEHOLDER_UPRIGHT,
          reversed: PLACEHOLDER_REVERSED,
          image: cardImagePath({ arcana: 'minor', id, suit: sm.suit, rank: mr.rank }),
        };
        deck.push(applyMeaning(card, id));
      }
    }

    return deck;
  }

  const KIRKE_TAROT_DECK = buildDeck();

  const CARD_COLORS = {
    major: '#2a2438',
    wands: '#3d2a1f',
    cups: '#1f2d3d',
    swords: '#2a3540',
    pentacles: '#2d3228',
  };

  window.KIRKE_TAROT_DECK = KIRKE_TAROT_DECK;
  window.KIRKE_CARD_COLORS = CARD_COLORS;
  window.getKirkeCardImageSrc = function (card) {
    return card?.image || '';
  };
  window.kirkeTarotDeckReady = KIRKE_TAROT_DECK.length === 78;
})();
