/**
 * 타로코드 · 다장 스프레드 연결 해석
 * 카드별 키워드 2개로 짧은 연결 문장을 만듭니다.
 */
(function () {
  const TOPIC_LABEL = {
    love: '사랑',
    work: '일·커리어',
    money: '재정',
    relation: '관계',
    inner: '내면·성장',
  };

  function trimSnippet(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  /** 받침 있으면 「으로」, 없으면 「로」 (화면에 「(으)로」 글자 그대로 넣지 않음) */
  function josaRo(phrase) {
    const w = String(phrase || '').replace(/·/g, '').trim();
    if (!w) return '로';
    const ch = w.charCodeAt(w.length - 1);
    if (ch < 0xac00 || ch > 0xd7a3) return '로';
    return (ch - 0xac00) % 28 !== 0 ? '으로' : '로';
  }

  /**
   * 카드 keywords 필드 → 연결용 앞 2개 키워드를 ·로 연결
   * 예: "마음의 권태, 정체기, 흥미 상실" → "마음의 권태·정체기"
   */
  function extractCardFlowKeyword(card) {
    if (!card) return '';
    let raw = card.keywords || '';
    if (card.faceRev && card.textReversed) {
      const revParts = String(card.textReversed)
        .split(/[,，、]/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      if (revParts.length) raw = revParts.slice(0, 2).join(', ');
    }
    const parts = String(raw)
      .split(/[,，、]/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (parts.length >= 2) return parts[0] + '·' + parts[1];
    if (parts.length === 1) return parts[0];
    const name = String(card.name || '')
      .replace(/^(완드|소드|컵|펜타클)\s+/, '')
      .trim();
    return name || '이 카드';
  }

  window.extractTarotCardFlowKeyword = extractCardFlowKeyword;

  function buildTarotSpreadFlowNarrative(opts) {
    const keys = (opts.keywords || []).map(trimSnippet);
    if (keys.length < 3 || !keys[0] || !keys[1] || !keys[2]) return '';

    const k0 = keys[0];
    const k1 = keys[1];
    const k2 = keys[2];

    let intro = '';
    let body = '';
    let suffix = '';

    if (opts.dailyFive) {
      const ex = opts.dailyExtra || {};
      const help = trimSnippet(ex.help);
      const warn = trimSnippet(ex.warn);
      if (help && warn) {
        suffix =
          ' 오늘 힘이 되는 에너지는 ' +
          help +
          ' 쪽, 오늘의 주의는 ' +
          warn +
          ' 쪽을 보면 돼요.';
      } else if (help || warn) {
        suffix =
          (help ? ' 오늘 힘이 되는 에너지는 ' + help + ' 쪽이에요.' : '') +
          (warn ? ' 오늘의 주의는 ' + warn + ' 쪽을 보면 돼요.' : '');
      } else {
        suffix =
          ' 아래 「오늘 힘이 되는 에너지」「오늘의 주의」 카드도 함께 읽어 보세요.';
      }
    }

    if (opts.curMode === 'question') {
      const topic =
        opts.curTopic === 'custom'
          ? opts.questionText
          : TOPIC_LABEL[opts.curTopic] || '';
      if (topic && opts.curTopic === 'custom') {
        intro = '「' + topic + '」 기준으로, ';
      } else if (topic) {
        intro = topic + ' 흐름으로 보면, ';
      }
      body =
        k0 +
        '에서 ' +
        k1 +
        josaRo(k1) +
        ' 이어지고 있고, 앞으로는 ' +
        k2 +
        '에 가까울 수 있어요.';
      return intro + body + suffix;
    }

    if (opts.curEopt === 'next_month') {
      intro = '다음 달 흐름으로 보면, ';
    } else if (opts.curEopt === 'month') {
      intro = '이번 달 흐름으로 보면, ';
    } else if (opts.dailyFive) {
      intro = '오늘의 흐름으로 보면, ';
    } else if (opts.curEopt === 'year') {
      return '';
    }

    body =
      k0 +
      '에서 ' +
      k1 +
      josaRo(k1) +
      ' 이어지고, 앞으로는 ' +
      k2 +
      ' 흐름이 다가올 수 있어요.';
    return intro + body + suffix;
  }

  window.buildTarotSpreadFlowNarrative = buildTarotSpreadFlowNarrative;
})();
