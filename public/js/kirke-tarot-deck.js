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

  function parseUprightSections(upright) {
    if (!upright) return { story: '', you: '', advice: '' };
    const storyMatch = upright.match(/【이 카드의 이야기】\s*\n([\s\S]*?)(?=\n\n【|$)/);
    const youMatch = upright.match(/【지금 당신에게】\s*\n([\s\S]*?)(?=\n\n【|$)/);
    const adviceMatch = upright.match(/【조언】\s*\n([\s\S]*?)$/);
    return {
      story: storyMatch ? `【이 카드의 이야기】\n${storyMatch[1].trim()}` : '',
      you: youMatch ? `【지금 당신에게】\n${youMatch[1].trim()}` : '',
      advice: adviceMatch ? `【조언】\n${adviceMatch[1].trim()}` : '',
    };
  }

  function normalizeTopics(m, parsed) {
    const base = {
      general: {
        you: parsed.you,
        advice: parsed.advice,
      },
    };
    if (m.topics && typeof m.topics === 'object') {
      return { ...base, ...m.topics };
    }
    return base;
  }

  function applyMeaning(card, id) {
    const m = MEANINGS[id];
    if (!m) return card;
    const upright = m.upright || PLACEHOLDER_UPRIGHT;
    const parsed = m.story
      ? {
          story: m.story,
          you: m.topics?.general?.you || '',
          advice: m.topics?.general?.advice || '',
        }
      : parseUprightSections(upright);
    const story = m.story || parsed.story;
    const topics = normalizeTopics(m, parsed);
    return {
      ...card,
      name: m.nameKr || card.name,
      en: m.en || card.en,
      myth: m.myth || '',
      keywords: m.keywords || PLACEHOLDER_KEYWORDS,
      story,
      topics,
      upright,
      reversed: m.reversed || PLACEHOLDER_REVERSED,
    };
  }

  window.getKirkeReadingText = function (card, topic) {
    if (!card) return '';
    const resolved = window.resolveKirkeReadingTopic?.(topic) || 'general';
    const topics = card.topics || {};
    const picked = topics[resolved] || topics.general || {};
    const you = picked.you || '';
    const advice = picked.advice || '';
    const parts = [card.story, you, advice].filter(Boolean);
    if (parts.length) return parts.join('\n\n');
    return card.upright || PLACEHOLDER_UPRIGHT;
  };

  /** AI 프롬프트용 — 뽑힌 카드의 해설서 파트만 동적 주입 */
  window.getKirkeGuideForAi = function (card, topic) {
    if (!card) return '';
    const resolved = window.resolveKirkeReadingTopic?.(topic) || 'general';
    const topics = card.topics || {};
    const picked = topics[resolved] || topics.general || {};
    const lines = [
      '카드: ' + (card.name || '') + (card.en ? ' (' + card.en + ')' : ''),
      card.myth ? '신화: ' + card.myth : '',
      card.keywords ? '키워드: ' + card.keywords : '',
      card.story || '',
      picked.you || '',
      picked.advice || '',
    ].filter(Boolean);
    return lines.join('\n');
  };

  window.kirkeCardById = function (id) {
    const n = Number(id);
    return KIRKE_TAROT_DECK.find((c) => c.id === n) || null;
  };

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

  /** 상담사 AI 페이지용 — Lenormand Deck API와 동일 형태 (num = id 0~77) */
  function toCounselorCard(c) {
    if (!c) return null;
    return {
      id: c.id,
      num: c.id,
      name: c.name || '',
      en: c.en || '',
      keywords: c.keywords || '',
      myth: c.myth || '',
      imageSrc: c.image || '',
      raw: c,
    };
  }

  function byId(id) {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 0 || n > 77) return null;
    return toCounselorCard(KIRKE_TAROT_DECK.find((c) => c.id === n) || null);
  }

  function search(query, limit) {
    const lim = Math.min(78, Math.max(1, Number(limit) || 12));
    const raw = String(query || '').trim();
    if (!raw) return KIRKE_TAROT_DECK.slice(0, lim).map((c) => toCounselorCard(c));

    const q = raw.toLowerCase().replace(/\s+/g, '');
    const asNum = Number(raw.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 65248)));
    if (Number.isInteger(asNum) && asNum >= 0 && asNum <= 77 && String(asNum) === raw.replace(/\s/g, '')) {
      const hit = byId(asNum);
      return hit ? [hit] : [];
    }

    const scored = [];
    for (let i = 0; i < KIRKE_TAROT_DECK.length; i++) {
      const c = KIRKE_TAROT_DECK[i];
      const ko = String(c.name || '').toLowerCase().replace(/\s+/g, '');
      const en = String(c.en || '').toLowerCase().replace(/\s+/g, '');
      const idStr = String(c.id);
      let score = 0;
      if (idStr === raw.trim() || idStr === q) score = 100;
      else if (ko === q || en === q) score = 90;
      else if (ko.indexOf(q) === 0 || en.indexOf(q) === 0) score = 80;
      else if (ko.indexOf(q) >= 0 || en.indexOf(q) >= 0) score = 60;
      else if ((c.keywords || '').toLowerCase().indexOf(q) >= 0) score = 40;
      if (score > 0) scored.push({ score, card: toCounselorCard(c) });
    }
    scored.sort((a, b) => b.score - a.score || a.card.id - b.card.id);
    return scored.slice(0, lim).map((x) => x.card);
  }

  window.CounselorKirkeDeck = {
    size: 78,
    cards: KIRKE_TAROT_DECK,
    byId,
    byDisplayNum: byId,
    search,
    label: function (card) {
      if (!card) return '';
      return card.num + '. ' + card.name + (card.en ? ' (' + card.en + ')' : '');
    },
    guideForAi: function (cardOrId, topic) {
      const raw = cardOrId && cardOrId.raw
        ? cardOrId.raw
        : (typeof cardOrId === 'object' && cardOrId && cardOrId.id != null
          ? KIRKE_TAROT_DECK.find((c) => c.id === cardOrId.id)
          : window.kirkeCardById(cardOrId));
      return window.getKirkeGuideForAi(raw, topic);
    },
  };
})();
