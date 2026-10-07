/**
 * 프라슈나(질문점) 판정 — VedicCore 차트 팩트 기반 (Whole Sign)
 * 전통 규칙을 단순화한 MVP용. 확정 예언이 아니라 경향·시기 후보를 줍니다.
 */
(function (root) {
  var CATEGORIES = [
    {
      id: 'property',
      label: '부동산·매매',
      desc: '집·땅·매도·계약',
      houses: [4, 7, 11],
      examples: ['지금 내놓은 아파트는 언제쯤 팔릴까요?', '이번 달 안에 계약이 될까요?'],
    },
    {
      id: 'career',
      label: '일·이직',
      desc: '직장·이직·합격',
      houses: [10, 6, 11],
      examples: ['이번 면접은 잘 될까요?', '이직을 지금 추진해도 될까요?'],
    },
    {
      id: 'love',
      label: '연애·관계',
      desc: '만남·관계·결혼',
      houses: [7, 5, 11],
      examples: ['이 사람과 관계가 이어질까요?', '올해 안에 좋은 만남이 있을까요?'],
    },
    {
      id: 'money',
      label: '금전·수입',
      desc: '수입·회수·정산',
      houses: [2, 11, 8],
      examples: ['밀린 대금은 언제 들어올까요?', '이번 분기 수입이 나아질까요?'],
    },
    {
      id: 'decision',
      label: '선택·결정',
      desc: '가부·타이밍',
      houses: [1, 7, 10],
      examples: ['이 제안을 받아도 될까요?', '지금 움직이는 게 나을까요?'],
    },
  ];

  var BENEFIC = { jupiter: 1, venus: 1, mercury: 0.6, moon: 0.5 };
  var MALEFIC = { saturn: 1, mars: 0.85, rahu: 0.7, ketu: 0.55, sun: 0.35 };
  var BLOCKED =
    /(수명|사망|죽을|자살|암\b|시한부|소송|재판|고소|투자|주식|코인|도박|임신중절|낙태)/;

  function catById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }

  function houseLord(rashi) {
    return (root.VedicCore && root.VedicCore.SIGN_LORD[rashi]) || null;
  }

  function grahaMap(data) {
    var m = {};
    (data.grahas || []).forEach(function (g) {
      m[g.key] = g;
    });
    return m;
  }

  function dignityScore(g) {
    if (!g) return 0;
    var d = g.dignity || '';
    if (d === 'exalted' || d === 'moolatrikona') return 2.2;
    if (d === 'own') return 1.6;
    if (d === 'debilitated') return -2.0;
    return 0.2;
  }

  function aspectToHouse(fromG, targetHouse, lagnaRashi) {
    if (!fromG || !root.VedicCore) return false;
    var aspects = root.VedicCore.drishtiSigns(fromG.key, fromG.rashi);
    for (var i = 0; i < aspects.length; i++) {
      var house = ((aspects[i].rashi - lagnaRashi + 12) % 12) + 1;
      if (house === targetHouse) return true;
    }
    return false;
  }

  function scoreChart(data, category) {
    var cat = catById(category);
    var lagna = data.lagna;
    if (!cat || !lagna) return { score: 0, notes: ['상승궁을 계산하지 못했어요.'] };
    var map = grahaMap(data);
    var lagnaRashi = lagna.rashi;
    var score = 0;
    var notes = [];

    // 질문자(1하우스) 상태
    var l1 = houseLord(lagnaRashi);
    var g1 = map[l1];
    var s1 = dignityScore(g1);
    score += s1 * 0.8;
    if (g1) {
      notes.push(
        '질문자(1하우스) 주인 ' +
          (root.VedicCore.GRAHA_KO[l1] || l1) +
          '이(가) ' +
          root.VedicCore.SIGNS[g1.rashi].ko +
          '에 있어요.'
      );
    }

    cat.houses.forEach(function (h, idx) {
      var rashi = (lagnaRashi + h - 1) % 12;
      var lord = houseLord(rashi);
      var g = map[lord];
      var w = idx === 0 ? 1.4 : 1.0;
      var s = dignityScore(g) * w;
      score += s;
      if (g && g.house === h) {
        score += 0.8 * w;
        notes.push(h + '하우스에 주인이 자리해 주제와 직접 맞닿아 있어요.');
      }
      // 길성/흉성의 그 하우스 주시
      Object.keys(BENEFIC).forEach(function (k) {
        if (aspectToHouse(map[k], h, lagnaRashi)) score += 0.55 * BENEFIC[k] * w;
      });
      Object.keys(MALEFIC).forEach(function (k) {
        if (aspectToHouse(map[k], h, lagnaRashi)) score -= 0.65 * MALEFIC[k] * w;
      });
      if (g) {
        notes.push(
          h +
            '하우스 주인 ' +
            (root.VedicCore.GRAHA_KO[lord] || lord) +
            ' · ' +
            root.VedicCore.SIGNS[g.rashi].ko +
            (g.dignity ? ' (' + g.dignity + ')' : '')
        );
      }
    });

    // 달(마음·흐름)
    var moon = map.moon;
    if (moon) {
      var ms = dignityScore(moon);
      score += ms * 0.7;
      if (moon.house === 6 || moon.house === 8 || moon.house === 12) {
        score -= 1.1;
        notes.push('달이 6·8·12하우스에 있어 흐름이 더딜 수 있어요.');
      } else if (moon.house === 1 || moon.house === 4 || moon.house === 10 || moon.house === 11) {
        score += 0.7;
        notes.push('달의 위치가 질문 흐름을 비교적 또렷하게 보여 줘요.');
      }
    }

    return { score: score, notes: notes.slice(0, 6), lagnaRashi: lagnaRashi, houses: cat.houses };
  }

  function toneFromScore(score) {
    if (score >= 3.2) return { tone: 'favorable', conclusion: '가능성이 높은 편이에요' };
    if (score >= 0.8) return { tone: 'mixed', conclusion: '가능성은 있으나 시간이 필요해 보여요' };
    if (score >= -1.5) return { tone: 'delayed', conclusion: '지금은 기다림·조율이 필요한 흐름이에요' };
    return { tone: 'difficult', conclusion: '당장은 어렵거나 조건이 더 필요해 보여요' };
  }

  function timingHints(data, tone) {
    var map = grahaMap(data);
    var moon = map.moon;
    var out = [];
    if (tone === 'favorable') {
      out.push({
        label: '가까운 흐름',
        reason: '주제 하우스와 주인이 비교적 힘을 얻고 있어, 2~6주 안 움직임이 나올 수 있어요.',
      });
      out.push({
        label: '확인 포인트',
        reason: '실제 계약·통보·만남처럼 “상대가 움직이는 순간”을 기준으로 보세요.',
      });
    } else if (tone === 'mixed' || tone === 'delayed') {
      out.push({
        label: '조율 구간',
        reason: '조건·가격·일정 조율이 먼저일 수 있어요. 1~3개월을 여유 구간으로 두세요.',
      });
      if (moon) {
        out.push({
          label: '달의 힌트',
          reason:
            '달이 ' +
            root.VedicCore.SIGNS[moon.rashi].ko +
            ' / ' +
            moon.house +
            '하우스에 있어, 감정의 기복보다 실무 체크리스트를 우선하세요.',
        });
      }
    } else {
      out.push({
        label: '보류 구간',
        reason: '억지로 밀기보다 조건이 바뀔 때까지 힘을 아끼는 편이 나아 보여요.',
      });
      out.push({
        label: '다시 볼 때',
        reason: '상황·제안이 분명하게 바뀌면 그때 다시 질문하는 것이 좋습니다.',
      });
    }
    return out.slice(0, 2);
  }

  function adviceLines(tone, category) {
    var base = [
      '한 가지 질문만 붙잡고, 결과가 나온 뒤에는 같은 주제를 바로 반복하지 마세요.',
      '차트는 참고용이에요. 계약·관계·결정은 현실 조건과 함께 판단하세요.',
    ];
    if (category === 'property') base.unshift('가격·노출·시세를 한 번에 바꾸기보다, 반응 구간을 짧게 나눠 보세요.');
    if (category === 'career') base.unshift('한 번의 결과보다 포트폴리오·일정·피드백을 쌓는 쪽이 유리할 수 있어요.');
    if (category === 'love') base.unshift('상대의 속도를 존중하고, 내가 서두르는 신호인지 먼저 점검해 보세요.');
    if (tone === 'difficult') base.unshift('지금은 “안 된다”보다 “아직 아님”에 가깝게 두고, 에너지를 아끼세요.');
    return base.slice(0, 3);
  }

  function judge(data, opts) {
    opts = opts || {};
    var category = opts.category;
    var question = String(opts.question || '').trim();
    if (BLOCKED.test(question)) {
      return {
        ok: false,
        error: 'blocked_topic',
        message: '건강·수명·소송·투자처럼 민감한 주제는 다루지 않아요.',
      };
    }
    var scored = scoreChart(data, category);
    var t = toneFromScore(scored.score);
    return {
      ok: true,
      tone: t.tone,
      conclusion: t.conclusion,
      score: Math.round(scored.score * 10) / 10,
      timings: timingHints(data, t.tone),
      evidence: scored.notes,
      advice: adviceLines(t.tone, category),
      lagna: data.lagna
        ? {
            rashi: data.lagna.rashi,
            label: root.VedicCore.SIGNS[data.lagna.rashi].ko,
          }
        : null,
      disclaimer:
        '이 결과는 질문 순간의 하늘을 전통 규칙으로 읽은 참고 해석이며, 특정 결과나 수익을 보장하지 않습니다.',
    };
  }

  root.PrashnaEngine = {
    CATEGORIES: CATEGORIES,
    BLOCKED: BLOCKED,
    catById: catById,
    judge: judge,
  };
})(typeof window !== 'undefined' ? window : this);
