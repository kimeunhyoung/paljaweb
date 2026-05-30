/**
 * 타로코드 · 다장 스프레드 연결 해석
 * 카드별 설명을 「과거 → 현재 → 미래」식 한 문단으로 잇습니다.
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
    return String(s || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function threeActLabels(positions) {
    const p0 = positions[0] || '';
    if (p0 === '과거') {
      return { a: '과거', b: '현재', c: '미래', template: 'question' };
    }
    if (p0.indexOf('시작') >= 0 || p0.indexOf('흐름') >= 0) {
      return { a: '초반', b: '한가운데', c: '마무리', template: 'timeline' };
    }
    if (p0.indexOf('마음') >= 0) {
      return { a: '마음', b: '실행', c: '주변', template: 'next_month' };
    }
    return {
      a: positions[0] || '첫째',
      b: positions[1] || '둘째',
      c: positions[2] || '셋째',
      template: 'generic',
    };
  }

  /**
   * @param {{
   *   snippets: string[],
   *   positions: string[],
   *   curMode: string,
   *   curEopt: string,
   *   curTopic: string,
   *   questionText: string,
   *   dailyFive?: boolean
   * }} opts
   * @returns {string} plain text (no HTML)
   */
  function buildTarotSpreadFlowNarrative(opts) {
    const snippets = (opts.snippets || []).map(trimSnippet);
    const positions = opts.positions || [];
    if (snippets.length < 3) return '';

    const s0 = snippets[0];
    const s1 = snippets[1];
    const s2 = snippets[2];
    if (!s0 || !s1 || !s2) return '';

    const labels = threeActLabels(positions);
    let intro = '';
    let body = '';
    let suffix = '';

    if (opts.dailyFive) {
      suffix = ' 아래 「힘」「주의」 두 장은 오늘을 돕거나 조심할 포인트예요.';
    }

    if (opts.curMode === 'question') {
      const topic =
        opts.curTopic === 'custom'
          ? opts.questionText
          : TOPIC_LABEL[opts.curTopic] || '';
      if (topic && opts.curTopic === 'custom') {
        intro = '「' + topic + '」에 대해 세 장이 말하는 연결 흐름은 이렇게 읽혀요. ';
      } else if (topic) {
        intro = topic + '을(를) 놓고 세 장을 이어 보면, ';
      } else {
        intro = '세 장을 시간의 흐름으로 이어 보면, ';
      }
      body =
        labels.a +
        '에는 ' +
        s0 +
        ' 흐름이 있었고, ' +
        labels.b +
        '는 ' +
        s1 +
        ' 상태로 이어지며, ' +
        labels.c +
        '에는 ' +
        s2 +
        ' 방향으로 갈 가능성이 커 보여요.';
      return intro + body + suffix;
    }

    if (opts.curEopt === 'next_month') {
      intro = '다음 달을 준비하는 세 장의 연결은, ';
    } else if (opts.curEopt === 'month') {
      intro = '이번 달 세 장을 시간순으로 잇으면, ';
    } else if (opts.dailyFive) {
      intro = '오늘의 흐름 세 장만 잇으면, ';
    } else if (opts.curEopt === 'year') {
      return '';
    } else {
      intro = '세 장의 연결은, ';
    }

    body =
      labels.a +
      '에는 ' +
      s0 +
      ' 기운이 보이고, ' +
      labels.b +
      '에는 ' +
      s1 +
      ' 흐름이 중심이 되며, ' +
      labels.c +
      '에는 ' +
      s2 +
      ' 쪽으로 이어지는 그림이에요.';

    return intro + body + suffix;
  }

  window.buildTarotSpreadFlowNarrative = buildTarotSpreadFlowNarrative;
})();
