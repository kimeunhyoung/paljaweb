/**
 * 점성학 5년 장기 운 타임라인 — 점수·구간·렌더 헬퍼
 * (실제 천체 위치는 페이지에서 Origin/Horoscope로 구한 뒤 넘김)
 */
(function (global) {
  'use strict';

  var SLOW_KEYS = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  var MONTHS = 60;
  var CHUNK = 8;

  var ASPECT_TONE = {
    conjunction: 'strong',
    opposition: 'tense',
    trine: 'easy',
    square: 'tense',
    sextile: 'easy',
  };

  var ASPECT_KR = {
    conjunction: '합',
    opposition: '충',
    trine: '삼각',
    square: '사각',
    sextile: '육각',
  };

  var PLANET_KR = {
    sun: '태양', moon: '달', mercury: '수성', venus: '금성', mars: '화성',
    jupiter: '목성', saturn: '토성', uranus: '천왕성', neptune: '해왕성', pluto: '명왕성',
    asc: '상승궁', mc: '중천점',
  };

  var PLANET_WEIGHT = {
    jupiter: 1.35,
    saturn: 1.25,
    uranus: 1.1,
    neptune: 1.05,
    pluto: 1.2,
  };

  function ymLabel(y, m) {
    return y + '-' + String(m).padStart(2, '0');
  }

  function ymShort(y, m) {
    return y + '.' + String(m).padStart(2, '0');
  }

  function themeTagsForHit(tk, nk) {
    var tags = [];
    if (['venus'].includes(tk) || ['venus', 'moon', 'mars'].includes(nk)) tags.push('love');
    if (['saturn', 'uranus'].includes(tk) || ['sun', 'mars', 'mercury', 'saturn', 'mc'].includes(nk)) tags.push('career');
    if (['jupiter', 'saturn', 'pluto'].includes(tk) || ['venus', 'jupiter', 'saturn', 'pluto', 'fortune'].includes(nk)) tags.push('money');
    if (!tags.length) tags.push('general');
    return tags;
  }

  /** hits: [{ tk, nk, key, orbOff }] */
  function scoreMonth(hits) {
    var score = 0;
    var tagCount = { love: 0, career: 0, money: 0, general: 0 };
    var top = [];
    (hits || []).forEach(function (h) {
      var tone = ASPECT_TONE[h.key] || 'strong';
      var base = tone === 'easy' ? 2 : tone === 'tense' ? -2 : 0.8;
      var w = PLANET_WEIGHT[h.tk] || 1;
      if (tone === 'tense' && (h.tk === 'saturn' || h.tk === 'pluto')) w *= 1.15;
      if (tone === 'easy' && h.tk === 'jupiter') w *= 1.2;
      var pts = base * w;
      // orb이 작을수록 가중
      var orbFactor = 1 + Math.max(0, (5 - (h.orbOff || 0)) * 0.06);
      pts *= orbFactor;
      score += pts;
      var tags = themeTagsForHit(h.tk, h.nk);
      tags.forEach(function (t) {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
      top.push({
        tk: h.tk,
        nk: h.nk,
        key: h.key,
        orbOff: h.orbOff,
        pts: Math.round(pts * 10) / 10,
        line:
          (PLANET_KR[h.tk] || h.tk) +
          ' ' +
          (ASPECT_KR[h.key] || h.key) +
          ' ' +
          (PLANET_KR[h.nk] || h.nk),
      });
    });
    top.sort(function (a, b) { return Math.abs(b.pts) - Math.abs(a.pts); });
    var themes = Object.keys(tagCount)
      .filter(function (k) { return tagCount[k] > 0; })
      .sort(function (a, b) { return tagCount[b] - tagCount[a]; });
    return {
      score: Math.round(score * 10) / 10,
      themes: themes,
      tagCount: tagCount,
      topHits: top.slice(0, 4),
    };
  }

  function mergeWindows(months, kind) {
    var out = [];
    var i = 0;
    while (i < months.length) {
      var m = months[i];
      var ok = kind === 'good' ? m.score > 0.4 : m.score < -0.4;
      if (!ok) { i += 1; continue; }
      var j = i;
      var sum = 0;
      var themeAcc = { love: 0, career: 0, money: 0, general: 0 };
      while (j < months.length) {
        var cur = months[j];
        var curOk = kind === 'good' ? cur.score > 0.4 : cur.score < -0.4;
        if (!curOk) break;
        sum += cur.score;
        (cur.themes || []).forEach(function (t) {
          themeAcc[t] = (themeAcc[t] || 0) + 1;
        });
        j += 1;
      }
      var len = j - i;
      if (len >= 2) {
        var themes = Object.keys(themeAcc)
          .filter(function (k) { return themeAcc[k] > 0; })
          .sort(function (a, b) { return themeAcc[b] - themeAcc[a]; });
        out.push({
          kind: kind,
          startYm: months[i].ym,
          endYm: months[j - 1].ym,
          startY: months[i].y,
          startM: months[i].mo,
          endY: months[j - 1].y,
          endM: months[j - 1].mo,
          months: len,
          avgScore: Math.round((sum / len) * 10) / 10,
          themes: themes.slice(0, 3),
          sampleHits: (months[i].topHits || []).slice(0, 3),
        });
      }
      i = Math.max(j, i + 1);
    }
    out.sort(function (a, b) {
      return kind === 'good'
        ? b.avgScore - a.avgScore
        : a.avgScore - b.avgScore;
    });
    return out;
  }

  function buildResult(months) {
    if (!months || !months.length) {
      return { months: [], goodWindows: [], hardWindows: [], maxAbs: 1 };
    }
    var maxAbs = 1;
    months.forEach(function (m) {
      maxAbs = Math.max(maxAbs, Math.abs(m.score));
    });
    return {
      months: months,
      goodWindows: mergeWindows(months, 'good'),
      hardWindows: mergeWindows(months, 'hard'),
      maxAbs: maxAbs,
      fromYm: months[0].ym,
      toYm: months[months.length - 1].ym,
    };
  }

  var THEME_KR = { love: '연애', career: '일·커리어', money: '금전', general: '전반' };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function windowChipsHtml(windows, kind) {
    if (!windows || !windows.length) {
      return '<p class="tl-empty-win">' +
        (kind === 'good' ? '뚜렷한 좋은 구간이 많지 않아요. 잔잔한 흐름에 가깝습니다.' : '강한 주의 구간은 많지 않아요.') +
        '</p>';
    }
    return windows.slice(0, 8).map(function (w) {
      var tags = (w.themes || []).map(function (t) {
        return '<span class="tl-tag">' + escapeHtml(THEME_KR[t] || t) + '</span>';
      }).join('');
      var hits = (w.sampleHits || []).map(function (h) { return h.line; }).join(' · ');
      return (
        '<div class="tl-win tl-win--' + kind + '">' +
        '<div class="tl-win-range">' + escapeHtml(ymShort(w.startY, w.startM)) +
        ' ~ ' + escapeHtml(ymShort(w.endY, w.endM)) +
        ' <span class="tl-win-len">(' + w.months + '개월)</span></div>' +
        '<div class="tl-win-tags">' + tags + '</div>' +
        (hits ? '<div class="tl-win-hits">' + escapeHtml(hits) + '</div>' : '') +
        '</div>'
      );
    }).join('');
  }

  function renderHtml(data) {
    if (!data || !data.months || !data.months.length) {
      return '<div class="transit-empty">타임라인을 계산하지 못했어요.</div>';
    }
    var maxAbs = data.maxAbs || 1;
    var bars = data.months.map(function (m, idx) {
      var pct = Math.min(100, (Math.abs(m.score) / maxAbs) * 100);
      var cls = m.score >= 0 ? 'tl-bar--up' : 'tl-bar--down';
      var yearTick = m.mo === 1 || idx === 0
        ? '<span class="tl-year">' + m.y + '</span>'
        : '';
      return (
        '<div class="tl-col" title="' + escapeHtml(m.ym) + ' · 점수 ' + m.score + '">' +
        '<div class="tl-bar-wrap">' +
        '<div class="tl-bar ' + cls + '" style="height:' + Math.max(4, pct) + '%"></div>' +
        '</div>' +
        yearTick +
        '</div>'
      );
    }).join('');

    return (
      '<div class="tl-guide">목성·토성·천왕성·해왕성·명왕성이 출생 차트와 맺는 주요 각을 월별로 본 흐름이에요. ' +
      '확정 예언이 아니라 <strong>타이밍·테마 가이드</strong>로 읽어 주세요. (' +
      escapeHtml(data.fromYm) + ' ~ ' + escapeHtml(data.toYm) + ')</div>' +
      '<div class="tl-legend"><span class="tl-leg tl-leg--up">조화·확장</span><span class="tl-leg tl-leg--down">긴장·정리</span></div>' +
      '<div class="tl-chart" role="img" aria-label="5년 운 흐름 막대 그래프">' + bars + '</div>' +
      '<div class="tl-sections">' +
      '<div class="tl-sec"><h4>좋은 시기 구간</h4>' + windowChipsHtml(data.goodWindows, 'good') + '</div>' +
      '<div class="tl-sec"><h4>조심·정리 구간</h4>' + windowChipsHtml(data.hardWindows, 'hard') + '</div>' +
      '</div>'
    );
  }

  function buildAiSummary(data) {
    if (!data || !data.months) return '';
    var L = [];
    L.push('[5년 장기 운 타임라인 · ' + data.fromYm + ' ~ ' + data.toYm + ']');
    L.push('월별은 느린 행성(목·토·천·해·명) 트랜짓×본명 주요 각 점수입니다.');
    function dumpWins(title, wins) {
      L.push(title);
      if (!wins || !wins.length) {
        L.push('  (해당 구간 적음)');
        return;
      }
      wins.slice(0, 6).forEach(function (w) {
        var th = (w.themes || []).map(function (t) { return THEME_KR[t] || t; }).join('/');
        var hits = (w.sampleHits || []).map(function (h) { return h.line; }).join(', ');
        L.push(
          '  · ' + w.startYm + '~' + w.endYm +
          ' (' + w.months + '개월, 평균 ' + w.avgScore + ')' +
          (th ? ' [' + th + ']' : '') +
          (hits ? ' — ' + hits : '')
        );
      });
    }
    dumpWins('좋은 구간:', data.goodWindows);
    dumpWins('주의·정리 구간:', data.hardWindows);
    // 연도별 평균 한 줄
    var byYear = {};
    data.months.forEach(function (m) {
      if (!byYear[m.y]) byYear[m.y] = { sum: 0, n: 0 };
      byYear[m.y].sum += m.score;
      byYear[m.y].n += 1;
    });
    L.push('연도별 평균 점수:');
    Object.keys(byYear).sort().forEach(function (y) {
      var a = byYear[y];
      L.push('  · ' + y + ': ' + (Math.round((a.sum / a.n) * 10) / 10));
    });
    return L.join('\n');
  }

  global.AstroTimeline = {
    SLOW_KEYS: SLOW_KEYS,
    MONTHS: MONTHS,
    CHUNK: CHUNK,
    ymLabel: ymLabel,
    scoreMonth: scoreMonth,
    mergeWindows: mergeWindows,
    buildResult: buildResult,
    renderHtml: renderHtml,
    buildAiSummary: buildAiSummary,
    THEME_KR: THEME_KR,
  };
})(typeof window !== 'undefined' ? window : globalThis);
