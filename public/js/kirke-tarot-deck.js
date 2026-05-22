/**
 * Circe Tarot (키르케타로) — 78장 덱 데이터
 * 이미지: public/images/kirke/major-00.jpg … (제작 중)
 * 해설: 이미지 완성 후 카드별 upright/reversed 교체
 */
(function () {
  const PLACEHOLDER_UPRIGHT = '카드 이미지·해설이 준비 중입니다. 곧 키르케의 이야기로 채워집니다.';
  const PLACEHOLDER_REVERSED = '역방향 해설도 함께 업데이트될 예정입니다.';
  const PLACEHOLDER_KEYWORDS = '준비 중';

  const MAJOR_EN = [
    'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
    'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
    'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
    'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
    'Judgement', 'The World',
  ];

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
    if (card.arcana === 'major') {
      return `images/kirke/major-${String(card.id).padStart(2, '0')}.jpg`;
    }
    const suit = card.suit;
    const local = card.id - (SUIT_META.find((s) => s.suit === suit)?.base || 0);
    return `images/kirke/${suit}-${String(local).padStart(2, '0')}.jpg`;
  }

  function buildDeck() {
    const deck = [];

    for (let i = 0; i < 22; i++) {
      deck.push({
        id: i,
        arcana: 'major',
        suit: 'major',
        rank: i,
        name: `키르케 메이저 ${String(i).padStart(2, '0')}`,
        en: MAJOR_EN[i],
        keywords: PLACEHOLDER_KEYWORDS,
        upright: PLACEHOLDER_UPRIGHT,
        reversed: PLACEHOLDER_REVERSED,
        image: cardImagePath({ arcana: 'major', id: i, suit: 'major' }),
      });
    }

    for (const sm of SUIT_META) {
      for (let r = 0; r < MINOR_RANKS.length; r++) {
        const id = sm.base + r;
        const mr = MINOR_RANKS[r];
        deck.push({
          id,
          arcana: 'minor',
          suit: sm.suit,
          rank: mr.rank,
          court: mr.court || null,
          name: `${sm.label} ${mr.label}`,
          en: `${mr.label} of ${sm.suit}`,
          keywords: PLACEHOLDER_KEYWORDS,
          upright: PLACEHOLDER_UPRIGHT,
          reversed: PLACEHOLDER_REVERSED,
          image: cardImagePath({ arcana: 'minor', id, suit: sm.suit }),
        });
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
