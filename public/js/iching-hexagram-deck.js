/**
 * 주역 64괘 — 상담사 AI 리딩용 (문왕 순서 1~64)
 * 표시번호 = id. 이미지는 선택(공개 시 public/iching/… 연결).
 */
(function (global) {
  'use strict';

  const HEX = [
    { id: 1, han: '乾', ko: '중천건', keywords: '하늘·창조·강건·주도', aliases: ['건', '乾', 'qian'] },
    { id: 2, han: '坤', ko: '중지곤', keywords: '땅·수용·순응·기반', aliases: ['곤', '坤', 'kun'] },
    { id: 3, han: '屯', ko: '수뢰둔', keywords: '시작·난산·막힘·준비', aliases: ['둔', '屯', 'zhun'] },
    { id: 4, han: '蒙', ko: '산수몽', keywords: '미숙·배움·가르침·혼란', aliases: ['몽', '蒙', 'meng'] },
    { id: 5, han: '需', ko: '수천수', keywords: '기다림·필요·타이밍', aliases: ['수', '需', 'xu'] },
    { id: 6, han: '訟', ko: '천수송', keywords: '다툼·소송·말싸움', aliases: ['송', '訟', 'song'] },
    { id: 7, han: '師', ko: '지수사', keywords: '군대·조직·규율·리더', aliases: ['사', '師', 'shi'] },
    { id: 8, han: '比', ko: '수지비', keywords: '친밀·연합·동맹', aliases: ['비', '比', 'bi'] },
    { id: 9, han: '小畜', ko: '풍천소축', keywords: '작은 축적·제동·보류', aliases: ['소축', '小畜', 'xiaochu'] },
    { id: 10, han: '履', ko: '천택리', keywords: '발걸음·예의·위험 속 전진', aliases: ['리', '履', 'lu'] },
    { id: 11, han: '泰', ko: '지천태', keywords: '소통·태평·상승', aliases: ['태', '泰', 'tai'] },
    { id: 12, han: '否', ko: '천지비', keywords: '막힘·단절·정체', aliases: ['비괘', '否', 'pi'] },
    { id: 13, han: '同人', ko: '천화동인', keywords: '동료·연대·공개', aliases: ['동인', '同人', 'tongren'] },
    { id: 14, han: '大有', ko: '화천대유', keywords: '풍요·소유·성과', aliases: ['대유', '大有', 'dayou'] },
    { id: 15, han: '謙', ko: '지산겸', keywords: '겸손·낮춤·실속', aliases: ['겸', '謙', 'qian2'] },
    { id: 16, han: '豫', ko: '뇌지예', keywords: '기쁨·준비·흥분', aliases: ['예', '豫', 'yu'] },
    { id: 17, han: '隨', ko: '택뢰수', keywords: '따름·적응·흐름', aliases: ['수괘', '隨', 'sui'] },
    { id: 18, han: '蠱', ko: '산풍고', keywords: '부패·수리·정리', aliases: ['고', '蠱', 'gu'] },
    { id: 19, han: '臨', ko: '지택림', keywords: '다가옴·감독·접근', aliases: ['림', '臨', 'lin'] },
    { id: 20, han: '觀', ko: '풍지관', keywords: '관찰·시선·점검', aliases: ['관', '觀', 'guan'] },
    { id: 21, han: '噬嗑', ko: '화뢰서합', keywords: '깨물기·판결·장애 제거', aliases: ['서합', '噬嗑', 'shike'] },
    { id: 22, han: '賁', ko: '산화분', keywords: '꾸밈·형식·겉모습', aliases: ['분', '賁', 'bi2'] },
    { id: 23, han: '剝', ko: '산지박', keywords: '벗겨짐·소진·붕괴', aliases: ['박', '剝', 'bo'] },
    { id: 24, han: '復', ko: '지뢰복', keywords: '회복·회귀·재시작', aliases: ['복', '復', 'fu'] },
    { id: 25, han: '無妄', ko: '천뢰무망', keywords: '순수·무망·자연스러움', aliases: ['무망', '無妄', 'wuwang'] },
    { id: 26, han: '大畜', ko: '산천대축', keywords: '큰 축적·억제·저축', aliases: ['대축', '大畜', 'dachu'] },
    { id: 27, han: '頤', ko: '산뢰이', keywords: '양육·입·말·섭취', aliases: ['이', '頤', 'yi'] },
    { id: 28, han: '大過', ko: '택풍대과', keywords: '과도·무게·임계점', aliases: ['대과', '大過', 'daguo'] },
    { id: 29, han: '坎', ko: '중수감', keywords: '함정·위험·반복 시련', aliases: ['감', '坎', 'kan'] },
    { id: 30, han: '離', ko: '중화리', keywords: '밝음·의존·명확', aliases: ['리괘', '離', 'li'] },
    { id: 31, han: '咸', ko: '택산함', keywords: '감응·끌림·자극', aliases: ['함', '咸', 'xian'] },
    { id: 32, han: '恆', ko: '뇌풍항', keywords: '지속·항구성·습관', aliases: ['항', '恆', 'heng'] },
    { id: 33, han: '遯', ko: '천산둔', keywords: '물러남·은퇴·거리', aliases: ['둔괘', '遯', 'dun'] },
    { id: 34, han: '大壯', ko: '뇌천대장', keywords: '큰 힘·돌진·과시', aliases: ['대장', '大壯', 'dazhuang'] },
    { id: 35, han: '晉', ko: '화지진', keywords: '전진·승진·드러남', aliases: ['진', '晉', 'jin'] },
    { id: 36, han: '明夷', ko: '지화명이', keywords: '빛 가림·상처·숨김', aliases: ['명이', '明夷', 'mingyi'] },
    { id: 37, han: '家人', ko: '풍화가인', keywords: '가정·내부·역할', aliases: ['가인', '家人', 'jiaren'] },
    { id: 38, han: '睽', ko: '화택규', keywords: '어긋남·이질·대립', aliases: ['규', '睽', 'kui'] },
    { id: 39, han: '蹇', ko: '수산건', keywords: '난관·발묶임·우회', aliases: ['건', '蹇', 'jian'] },
    { id: 40, han: '解', ko: '뇌수해', keywords: '해소·풀림·사면', aliases: ['해', '解', 'jie'] },
    { id: 41, han: '損', ko: '산택손', keywords: '감소·절제·양보', aliases: ['손', '損', 'sun'] },
    { id: 42, han: '益', ko: '풍뢰익', keywords: '증가·이득·확장', aliases: ['익', '益', 'yi2'] },
    { id: 43, han: '夬', ko: '택천쾌', keywords: '결단·돌파·선언', aliases: ['쾌', '夬', 'guai'] },
    { id: 44, han: '姤', ko: '천풍구', keywords: '만남·유혹·조우', aliases: ['구', '姤', 'gou'] },
    { id: 45, han: '萃', ko: '택지췌', keywords: '모임·결집·수렴', aliases: ['췌', '萃', 'cui'] },
    { id: 46, han: '升', ko: '지풍승', keywords: '상승·성장·누적', aliases: ['승', '升', 'sheng'] },
    { id: 47, han: '困', ko: '택수곤', keywords: '궁핍·압박·고립', aliases: ['곤괘', '困', 'kun2'] },
    { id: 48, han: '井', ko: '수풍정', keywords: '우물·자원·갱신', aliases: ['정', '井', 'jing'] },
    { id: 49, han: '革', ko: '택화혁', keywords: '개혁·교체·탈피', aliases: ['혁', '革', 'ge'] },
    { id: 50, han: '鼎', ko: '화풍정', keywords: '솥·정립·새 질서', aliases: ['정괘', '鼎', 'ding'] },
    { id: 51, han: '震', ko: '중뢰진', keywords: '충격·각성·움직임', aliases: ['진괘', '震', 'zhen'] },
    { id: 52, han: '艮', ko: '중산간', keywords: '멈춤·경계·안정', aliases: ['간', '艮', 'gen'] },
    { id: 53, han: '漸', ko: '풍산점', keywords: '점진·순서·천천히', aliases: ['점', '漸', 'jian2'] },
    { id: 54, han: '歸妹', ko: '뇌택귀매', keywords: '귀매·성급·부적합 결합', aliases: ['귀매', '歸妹', 'guimei'] },
    { id: 55, han: '豐', ko: '뇌화풍', keywords: '풍성·절정·과밀', aliases: ['풍', '豐', 'feng'] },
    { id: 56, han: '旅', ko: '화산려', keywords: '여행·객지·불안정', aliases: ['려', '旅', 'lu2'] },
    { id: 57, han: '巽', ko: '중풍손', keywords: '스며듦·설득·유연', aliases: ['손괘', '巽', 'xun'] },
    { id: 58, han: '兌', ko: '중택태', keywords: '기쁨·말하기·교환', aliases: ['태괘', '兌', 'dui'] },
    { id: 59, han: '渙', ko: '풍수환', keywords: '흩어짐·해산·완화', aliases: ['환', '渙', 'huan'] },
    { id: 60, han: '節', ko: '수택절', keywords: '절제·한도·규칙', aliases: ['절', '節', 'jie2'] },
    { id: 61, han: '中孚', ko: '풍택중부', keywords: '신뢰·진심·신실', aliases: ['중부', '中孚', 'zhongfu'] },
    { id: 62, han: '小過', ko: '뇌산소과', keywords: '작은 과실·주의·소폭', aliases: ['소과', '小過', 'xiaoguo'] },
    { id: 63, han: '旣濟', ko: '수화기제', keywords: '완성·정돈·이후 관리', aliases: ['기제', '旣濟', 'jiji'] },
    { id: 64, han: '未濟', ko: '화수미제', keywords: '미완·전환·미결', aliases: ['미제', '未濟', 'weiji'] },
  ];

  function byId(id) {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 1 || n > 64) return null;
    const c = HEX[n - 1];
    return {
      id: c.id,
      num: c.id,
      name: c.ko,
      han: c.han,
      keywords: c.keywords,
      aliases: c.aliases || [],
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

  function search(query, limit) {
    const lim = Math.min(64, Math.max(1, Number(limit) || 12));
    const raw = String(query || '').trim();
    if (!raw) return HEX.slice(0, lim).map((c) => byId(c.id));

    const q = normalizeQuery(raw);
    const num = Number(raw.replace(/[^\d]/g, ''));
    if (Number.isInteger(num) && num >= 1 && num <= 64 && String(num) === raw.replace(/\s/g, '')) {
      return [byId(num)];
    }

    const scored = [];
    for (let i = 0; i < HEX.length; i++) {
      const c = HEX[i];
      const ko = c.ko.toLowerCase();
      const han = c.han;
      const idStr = String(c.id);
      let score = 0;
      if (idStr === raw.trim() || idStr === q) score = 100;
      else if (ko === q || han === raw.trim()) score = 90;
      else if (ko.indexOf(q) === 0) score = 80;
      else if (ko.indexOf(q) >= 0 || han.indexOf(raw.trim()) >= 0) score = 60;
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

  global.CounselorIchingDeck = {
    size: 64,
    hexagrams: HEX,
    byId,
    byDisplayNum,
    search,
    label: function (h) {
      if (!h) return '';
      return h.num + '. ' + h.name + (h.han ? ' (' + h.han + ')' : '');
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
