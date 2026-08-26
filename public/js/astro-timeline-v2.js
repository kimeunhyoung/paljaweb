/**
 * 점성학 5년 장기 운 타임라인 v2
 * — Opportunity / Stability / Pressure / Change 4축
 * — money / career / relationship 주제 분리
 * — aspect×행성 기여 (조화≠무조건 좋음)
 * — episode · state segment
 */
(function (global) {
  'use strict';

  var SLOW_KEYS = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  var MONTHS = 60;
  var CHUNK = 6;
  var EPISODE_GAP_MAX = 3;
  var SEGMENT_SIM = 0.72;
  var PROG_MOON_CAP = 0.32;

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

  var STATE_META = {
    expansion: { ko: '확장기', cls: 'tl-state--expansion' },
    stability: { ko: '안정기', cls: 'tl-state--stability' },
    pressure: { ko: '압박기', cls: 'tl-state--pressure' },
    transition: { ko: '전환기', cls: 'tl-state--transition' },
    leap: { ko: '도약·재편기', cls: 'tl-state--leap' },
  };

  var THEME_KR = { relationship: '연애·관계', career: '일·커리어', money: '금전', general: '전반' };

  var AXES = ['opportunity', 'stability', 'pressure', 'change'];

  /** planet × aspect → 축 기여 (정규화 전) */
  var CONTRIB = {
    jupiter: {
      trine:        { opportunity: 2.2, stability: 0.4, pressure: 0.1, change: 0.2 },
      sextile:      { opportunity: 1.8, stability: 0.3, pressure: 0.1, change: 0.3 },
      conjunction:  { opportunity: 2.0, stability: 0.3, pressure: 0.4, change: 0.5 },
      square:       { opportunity: 1.2, stability: 0.1, pressure: 1.4, change: 0.6 },
      opposition:   { opportunity: 1.0, stability: 0.2, pressure: 1.3, change: 0.7 },
    },
    saturn: {
      trine:        { opportunity: 0.3, stability: 2.2, pressure: 0.4, change: 0.2 },
      sextile:      { opportunity: 0.4, stability: 1.8, pressure: 0.5, change: 0.2 },
      conjunction:  { opportunity: 0.2, stability: 1.6, pressure: 1.5, change: 0.6 },
      square:       { opportunity: 0.1, stability: 1.0, pressure: 2.2, change: 0.5 },
      opposition:   { opportunity: 0.1, stability: 0.9, pressure: 2.0, change: 0.6 },
    },
    uranus: {
      trine:        { opportunity: 1.0, stability: 0.2, pressure: 0.3, change: 1.8 },
      sextile:      { opportunity: 0.9, stability: 0.2, pressure: 0.3, change: 1.5 },
      conjunction:  { opportunity: 0.7, stability: 0.1, pressure: 0.8, change: 2.2 },
      square:       { opportunity: 0.4, stability: 0.1, pressure: 1.5, change: 2.0 },
      opposition:   { opportunity: 0.3, stability: 0.1, pressure: 1.4, change: 2.0 },
    },
    neptune: {
      trine:        { opportunity: 1.2, stability: 0.3, pressure: 0.2, change: 1.2 },
      sextile:      { opportunity: 1.0, stability: 0.3, pressure: 0.3, change: 1.0 },
      conjunction:  { opportunity: 0.8, stability: 0.2, pressure: 0.7, change: 1.6 },
      square:       { opportunity: 0.4, stability: 0.1, pressure: 1.6, change: 1.5 },
      opposition:   { opportunity: 0.3, stability: 0.1, pressure: 1.5, change: 1.5 },
    },
    pluto: {
      trine:        { opportunity: 0.9, stability: 0.3, pressure: 0.6, change: 1.6 },
      sextile:      { opportunity: 0.8, stability: 0.3, pressure: 0.7, change: 1.4 },
      conjunction:  { opportunity: 0.5, stability: 0.2, pressure: 1.4, change: 2.0 },
      square:       { opportunity: 0.2, stability: 0.1, pressure: 2.0, change: 1.8 },
      opposition:   { opportunity: 0.2, stability: 0.1, pressure: 1.9, change: 1.8 },
    },
  };

  function emptyAxes() {
    return { opportunity: 0, stability: 0, pressure: 0, change: 0 };
  }

  function emptyThemes() {
    return { money: 0, career: 0, relationship: 0 };
  }

  function ymLabel(y, m) {
    return y + '-' + String(m).padStart(2, '0');
  }

  function ymShort(y, m) {
    return y + '.' + String(m).padStart(2, '0');
  }

  function clamp01(n) {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  }

  function addAxes(a, b, scale) {
    var s = scale == null ? 1 : scale;
    AXES.forEach(function (k) {
      a[k] += (b[k] || 0) * s;
    });
  }

  function scaleAxes(a, s) {
    var o = emptyAxes();
    AXES.forEach(function (k) { o[k] = (a[k] || 0) * s; });
    return o;
  }

  function normalizeAxes(raw) {
    var max = 0.0001;
    AXES.forEach(function (k) { max = Math.max(max, raw[k] || 0); });
    var o = emptyAxes();
    AXES.forEach(function (k) { o[k] = Math.round(clamp01((raw[k] || 0) / max) * 1000) / 1000; });
    return o;
  }

  function normalizeThemes(raw) {
    var max = 0.0001;
    ['money', 'career', 'relationship'].forEach(function (k) {
      max = Math.max(max, raw[k] || 0);
    });
    return {
      money: Math.round(clamp01((raw.money || 0) / max) * 1000) / 1000,
      career: Math.round(clamp01((raw.career || 0) / max) * 1000) / 1000,
      relationship: Math.round(clamp01((raw.relationship || 0) / max) * 1000) / 1000,
    };
  }

  function orbFactor(orbOff, tk) {
    var base = tk === 'jupiter' ? 6 : 5;
    return 1 + Math.max(0, (base - (orbOff || 0)) * 0.08);
  }

  function themeWeightsForHit(tk, nk) {
    var t = emptyThemes();
    if (nk === 'venus' || nk === 'moon' || nk === 'mars') t.relationship += 1.2;
    if (nk === 'sun' || nk === 'mc' || nk === 'saturn' || nk === 'mars' || nk === 'mercury') t.career += 1.2;
    if (nk === 'venus' || nk === 'jupiter' || nk === 'pluto' || nk === 'saturn' || nk === 'fortune') t.money += 1.2;
    if (tk === 'saturn' || tk === 'uranus') t.career += 0.6;
    if (tk === 'jupiter' || tk === 'pluto' || tk === 'saturn') t.money += 0.5;
    if (tk === 'neptune') t.relationship += 0.4;
    return t;
  }

  function contribForHit(h) {
    var table = CONTRIB[h.tk];
    if (!table) return emptyAxes();
    var base = table[h.key] || table.conjunction || emptyAxes();
    var of = orbFactor(h.orbOff, h.tk);
    return scaleAxes(base, of);
  }

  function topThemesFrom(themes) {
    return ['relationship', 'career', 'money']
      .map(function (k) { return { k: k, v: themes[k] || 0 }; })
      .filter(function (x) { return x.v > 0.15; })
      .sort(function (a, b) { return b.v - a.v; })
      .map(function (x) { return x.k; });
  }

  function classifyState(axes, hitMeta) {
    var o = axes.opportunity || 0;
    var s = axes.stability || 0;
    var p = axes.pressure || 0;
    var c = axes.change || 0;
    var max = Math.max(o, s, p, c);
    var leapBoost = hitMeta && (hitMeta.uranusPluto || 0) > 1.2;

    if ((c >= 0.55 && o >= 0.5) || (leapBoost && c >= 0.45 && o >= 0.4)) return 'leap';
    if (p === max && p >= 0.45) return 'pressure';
    if (c >= 0.55 && o < 0.55 && s < 0.55) return 'transition';
    if (o === max && c < 0.45 && p < 0.45) return 'expansion';
    if (s === max && c < 0.4) return 'stability';
    if (c === max) return 'transition';
    if (p === max) return 'pressure';
    if (o === max) return 'expansion';
    return 'stability';
  }

  function cosineAxes(a, b) {
    var dot = 0;
    var na = 0;
    var nb = 0;
    AXES.forEach(function (k) {
      var x = a[k] || 0;
      var y = b[k] || 0;
      dot += x * y;
      na += x * x;
      nb += y * y;
    });
    if (na < 1e-8 || nb < 1e-8) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  /**
   * sample: { y, mo, ym, hits:[{tk,nk,key,orbOff}], progMoon?:{house,prevHouse,aspects:[{nk,key,orbOff}]}, transitMeta? }
   */
  function aggregateMonth(sample) {
    var rawAxes = emptyAxes();
    var rawThemes = emptyThemes();
    var top = [];
    var uranusPluto = 0;
    var hits = sample.hits || [];

    hits.forEach(function (h) {
      var vec = contribForHit(h);
      addAxes(rawAxes, vec, 1);
      var tw = themeWeightsForHit(h.tk, h.nk);
      ['money', 'career', 'relationship'].forEach(function (k) {
        rawThemes[k] += (tw[k] || 0) * (1 + Math.max(vec.opportunity, vec.pressure, vec.change) * 0.3);
      });
      if (h.tk === 'uranus' || h.tk === 'pluto') {
        uranusPluto += (vec.change || 0) + (vec.pressure || 0) * 0.5;
      }
      var mag = AXES.reduce(function (s, k) { return s + (vec[k] || 0); }, 0);
      top.push({
        tk: h.tk,
        nk: h.nk,
        key: h.key,
        orbOff: h.orbOff,
        mag: Math.round(mag * 10) / 10,
        line: (PLANET_KR[h.tk] || h.tk) + ' ' + (ASPECT_KR[h.key] || h.key) + ' ' + (PLANET_KR[h.nk] || h.nk),
        axes: vec,
      });
    });

    // Progressed Moon (캡)
    var progNote = null;
    if (sample.progMoon) {
      var pmAxes = emptyAxes();
      if (sample.progMoon.houseChanged) {
        pmAxes.change += 1.4;
        var hnum = Number(sample.progMoon.house) || 0;
        if ([2, 8].indexOf(hnum) >= 0) rawThemes.money += 0.8;
        if ([10, 6, 2].indexOf(hnum) >= 0) rawThemes.career += 0.8;
        if ([5, 7, 8, 4].indexOf(hnum) >= 0) rawThemes.relationship += 0.8;
        progNote = '프로그레스 달 ' + (sample.progMoon.house || '?') + '하우스 진입';
      }
      (sample.progMoon.aspects || []).forEach(function (a) {
        if (a.key === 'trine' || a.key === 'sextile') {
          pmAxes.opportunity += 0.6;
          pmAxes.stability += 0.35;
        } else if (a.key === 'square' || a.key === 'opposition') {
          pmAxes.pressure += 0.7;
          pmAxes.change += 0.5;
        } else if (a.key === 'conjunction') {
          pmAxes.change += 0.6;
          pmAxes.opportunity += 0.35;
        }
        var tw = themeWeightsForHit('moon', a.nk);
        ['money', 'career', 'relationship'].forEach(function (k) {
          rawThemes[k] += (tw[k] || 0) * 0.5;
        });
      });
      var transitMag = AXES.reduce(function (s, k) { return s + rawAxes[k]; }, 0) || 1;
      var pmMag = AXES.reduce(function (s, k) { return s + pmAxes[k]; }, 0);
      var cap = transitMag * PROG_MOON_CAP;
      var scale = pmMag > cap && pmMag > 0 ? cap / pmMag : 1;
      addAxes(rawAxes, pmAxes, scale);
    }

    top.sort(function (a, b) { return b.mag - a.mag; });
    var rawAxesSnap = {
      opportunity: Math.round((rawAxes.opportunity || 0) * 1000) / 1000,
      stability: Math.round((rawAxes.stability || 0) * 1000) / 1000,
      pressure: Math.round((rawAxes.pressure || 0) * 1000) / 1000,
      change: Math.round((rawAxes.change || 0) * 1000) / 1000,
    };
    var rawThemesSnap = {
      money: Math.round((rawThemes.money || 0) * 1000) / 1000,
      career: Math.round((rawThemes.career || 0) * 1000) / 1000,
      relationship: Math.round((rawThemes.relationship || 0) * 1000) / 1000,
    };
    var axes = normalizeAxes(rawAxes);
    var themes = normalizeThemes(rawThemes);
    var state = classifyState(axes, { uranusPluto: uranusPluto });

    return {
      y: sample.y,
      mo: sample.mo,
      ym: sample.ym || ymLabel(sample.y, sample.mo),
      axes: axes,
      rawAxes: rawAxesSnap,
      themes: themes,
      rawThemes: rawThemesSnap,
      state: state,
      topHits: top.slice(0, 5),
      progNote: progNote,
      intensity: Math.round(Math.max(axes.opportunity, axes.stability, axes.pressure, axes.change) * 100),
      hits: hits,
      transitMeta: sample.transitMeta || {},
    };
  }

  function buildEpisodes(months) {
    var bySig = {};
    months.forEach(function (m, idx) {
      (m.hits || []).forEach(function (h) {
        var sig = h.tk + '|' + h.nk + '|' + h.key;
        if (!bySig[sig]) bySig[sig] = [];
        bySig[sig].push({ idx: idx, month: m, hit: h });
      });
    });

    var episodes = [];
    Object.keys(bySig).forEach(function (sig) {
      var rows = bySig[sig].sort(function (a, b) { return a.idx - b.idx; });
      var cur = null;
      rows.forEach(function (r) {
        var rx = !!(r.month.transitMeta && r.month.transitMeta[r.hit.tk] && r.month.transitMeta[r.hit.tk].retro);
        if (!cur) {
          cur = {
            signature: sig,
            tk: r.hit.tk,
            nk: r.hit.nk,
            key: r.hit.key,
            startIdx: r.idx,
            endIdx: r.idx,
            startYm: r.month.ym,
            endYm: r.month.ym,
            peakOrb: r.hit.orbOff,
            peakYm: r.month.ym,
            contactsApprox: 1,
            hadRetrograde: rx,
            months: [r.month],
          };
          return;
        }
        if (r.idx - cur.endIdx <= EPISODE_GAP_MAX + 1) {
          cur.endIdx = r.idx;
          cur.endYm = r.month.ym;
          cur.contactsApprox += 1;
          if (rx) cur.hadRetrograde = true;
          if (r.hit.orbOff < cur.peakOrb) {
            cur.peakOrb = r.hit.orbOff;
            cur.peakYm = r.month.ym;
          }
          cur.months.push(r.month);
        } else {
          episodes.push(finalizeEpisode(cur));
          cur = {
            signature: sig,
            tk: r.hit.tk,
            nk: r.hit.nk,
            key: r.hit.key,
            startIdx: r.idx,
            endIdx: r.idx,
            startYm: r.month.ym,
            endYm: r.month.ym,
            peakOrb: r.hit.orbOff,
            peakYm: r.month.ym,
            contactsApprox: 1,
            hadRetrograde: rx,
            months: [r.month],
          };
        }
      });
      if (cur) episodes.push(finalizeEpisode(cur));
    });

    episodes.sort(function (a, b) {
      return (b.endIdx - b.startIdx) - (a.endIdx - a.startIdx) || a.peakOrb - b.peakOrb;
    });
    return episodes;
  }

  function finalizeEpisode(cur) {
    var axesSum = emptyAxes();
    var themeSum = emptyThemes();
    cur.months.forEach(function (m) {
      addAxes(axesSum, m.axes, 1);
      ['money', 'career', 'relationship'].forEach(function (k) {
        themeSum[k] += m.themes[k] || 0;
      });
    });
    var n = Math.max(1, cur.months.length);
    var axes = normalizeAxes(scaleAxes(axesSum, 1 / n));
    var themes = normalizeThemes({
      money: themeSum.money / n,
      career: themeSum.career / n,
      relationship: themeSum.relationship / n,
    });
    var line =
      (PLANET_KR[cur.tk] || cur.tk) + '–' + (PLANET_KR[cur.nk] || cur.nk) +
      ' ' + (ASPECT_KR[cur.key] || cur.key) + ' 에피소드';
    if (cur.hadRetrograde) line += ' (역행 포함)';
    return {
      signature: cur.signature,
      tk: cur.tk,
      nk: cur.nk,
      key: cur.key,
      startYm: cur.startYm,
      endYm: cur.endYm,
      startIdx: cur.startIdx,
      endIdx: cur.endIdx,
      peakYm: cur.peakYm,
      peakOrb: cur.peakOrb,
      contactsApprox: cur.contactsApprox,
      hadRetrograde: cur.hadRetrograde,
      months: cur.endIdx - cur.startIdx + 1,
      dominantAxes: axes,
      themes: topThemesFrom(themes),
      line: line,
    };
  }

  function buildSegments(months) {
    if (!months.length) return [];
    var segs = [];
    var cur = {
      state: months[0].state,
      startIdx: 0,
      endIdx: 0,
      months: [months[0]],
    };
    for (let i = 1; i < months.length; i++) {
      var m = months[i];
      var sameState = m.state === cur.state;
      var sim = cosineAxes(m.axes, cur.months[cur.months.length - 1].axes);
      if (sameState && sim >= SEGMENT_SIM) {
        cur.endIdx = i;
        cur.months.push(m);
      } else {
        segs.push(finalizeSegment(cur, months));
        cur = { state: m.state, startIdx: i, endIdx: i, months: [m] };
      }
    }
    segs.push(finalizeSegment(cur, months));
    return segs;
  }

  function finalizeSegment(cur, allMonths) {
    var axesSum = emptyAxes();
    var themeSum = emptyThemes();
    cur.months.forEach(function (m) {
      addAxes(axesSum, m.axes, 1);
      ['money', 'career', 'relationship'].forEach(function (k) {
        themeSum[k] += m.themes[k] || 0;
      });
    });
    var n = Math.max(1, cur.months.length);
    var axes = normalizeAxes(scaleAxes(axesSum, 1 / n));
    var themes = normalizeThemes({
      money: themeSum.money / n,
      career: themeSum.career / n,
      relationship: themeSum.relationship / n,
    });
    var start = allMonths[cur.startIdx];
    var end = allMonths[cur.endIdx];
    return {
      state: cur.state,
      stateKo: (STATE_META[cur.state] || {}).ko || cur.state,
      startYm: start.ym,
      endYm: end.ym,
      startY: start.y,
      startM: start.mo,
      endY: end.y,
      endM: end.mo,
      startIdx: cur.startIdx,
      endIdx: cur.endIdx,
      months: n,
      axes: axes,
      themes: topThemesFrom(themes),
      themeScores: themes,
      sampleHits: (cur.months[0].topHits || []).slice(0, 2),
      progNotes: cur.months.map(function (m) { return m.progNote; }).filter(Boolean),
    };
  }

  function attachEpisodesToSegments(segments, episodes) {
    segments.forEach(function (seg) {
      var best = null;
      episodes.forEach(function (ep) {
        if (ep.endIdx < seg.startIdx || ep.startIdx > seg.endIdx) return;
        var overlap = Math.min(ep.endIdx, seg.endIdx) - Math.max(ep.startIdx, seg.startIdx) + 1;
        if (!best || overlap > best.overlap) best = { ep: ep, overlap: overlap };
      });
      seg.episodeLine = best ? best.ep.line : '';
      seg.episode = best ? best.ep : null;
    });
  }

  /** 정렬된 배열에서 value의 백분위(0~1). */
  function percentileOf(sortedAsc, value) {
    var n = sortedAsc.length;
    if (!n) return 0;
    var lo = 0;
    var hi = n;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (sortedAsc[mid] < value) lo = mid + 1;
      else hi = mid;
    }
    var first = lo;
    while (lo < n && sortedAsc[lo] === value) lo += 1;
    var last = lo - 1;
    if (first >= n) return 1;
    if (last < 0) return 0;
    var rank = (first + last) / 2;
    return n <= 1 ? 1 : rank / (n - 1);
  }

  function percentileToStars(p) {
    if (p >= 0.9) return 5;
    if (p >= 0.75) return 4;
    if (p >= 0.5) return 3;
    if (p >= 0.25) return 2;
    return 1;
  }

  var FLAG_LABEL = {
    opportunity: '기회·활용',
    stability: '안정·결실',
    pressure: '주의·점검',
    change: '중요 변화',
  };

  function groupConsecutiveMonths(indices, months, similarFn) {
    if (!indices.length) return [];
    var sorted = indices.slice().sort(function (a, b) { return a - b; });
    var ranges = [];
    var start = sorted[0];
    var prev = sorted[0];
    for (var i = 1; i < sorted.length; i++) {
      var idx = sorted[i];
      var contiguous = idx === prev + 1;
      var similar = !similarFn || similarFn(months[prev], months[idx]);
      if (contiguous && similar) {
        prev = idx;
        continue;
      }
      ranges.push({
        startIdx: start,
        endIdx: prev,
        startYm: months[start].ym,
        endYm: months[prev].ym,
        months: prev - start + 1,
      });
      start = idx;
      prev = idx;
    }
    ranges.push({
      startIdx: start,
      endIdx: prev,
      startYm: months[start].ym,
      endYm: months[prev].ym,
      months: prev - start + 1,
    });
    return ranges;
  }

  function ymRangeLabel(r) {
    if (!r) return '';
    if (r.startYm === r.endYm) return String(r.startYm).replace('-', '.');
    return String(r.startYm).replace('-', '.') + '~' + String(r.endYm).replace('-', '.');
  }

  function pickTopIndex(months, scoreFn) {
    var best = -1;
    var bestV = -Infinity;
    months.forEach(function (m, i) {
      var v = scoreFn(m);
      if (v > bestV) {
        bestV = v;
        best = i;
      }
    });
    return best;
  }

  var OUTER_BODY = { uranus: 1, neptune: 1, pluto: 1 };
  var HARD_ASP = { square: 1, opposition: 1, conjunction: 1 };

  var JUDGMENT_META = {
    stableUtilize: {
      ko: '안정적으로 활용하기 좋은 시기',
      note: '기회가 있고 부담·변화가 크지 않아 움직이기 좋은 편입니다. 과신은 금물입니다.',
    },
    utilizeInChange: {
      ko: '기회는 크지만 변화가 큰 시기',
      note: '확장 기회는 있으나 변수가 커서, 과잉확장보다 선택적으로 움직이세요.',
    },
    opportunityWithLoad: {
      ko: '기회와 부담이 함께 큰 시기',
      note: '성과 가능성은 있으나 부담이 큽니다. 무리한 확장은 주의하세요.',
    },
    cautionChange: {
      ko: '주의가 필요한 큰 변화 시기',
      note: '기존 흐름이 크게 흔들리기 쉽습니다. 결정·계약을 평소보다 꼼꼼히 보세요.',
    },
    caution: {
      ko: '주의가 필요한 시기',
      note: '부담이 앞서는 때입니다. 결정·갈등·계약에 신중하세요.',
    },
    bigChange: {
      ko: '변화가 큰 시기',
      note: '길흉을 단정하기보다, 전환·재편 가능성에 초점을 두세요.',
    },
    quiet: {
      ko: '비교적 잔잔한 흐름',
      note: '특정 타이밍으로 강조할 정도는 아닙니다.',
    },
  };

  function isOuterRelatedHard(h) {
    return !!(h && HARD_ASP[h.key] && (OUTER_BODY[h.tk] || OUTER_BODY[h.nk]));
  }

  function isSaturnHard(h) {
    return !!(h && h.tk === 'saturn' && HARD_ASP[h.key]);
  }

  function isJupiterHard(h) {
    return !!(h && h.tk === 'jupiter' && (h.key === 'square' || h.key === 'opposition'));
  }

  /** 별점(상대) + raw 비율·히트 성격(절대) → 월 판정. rawAxes/state 자체는 변경하지 않음. */
  function classifyMonthJudgment(m) {
    var s = m.stars || {};
    var raw = m.rawAxes || emptyAxes();
    var oStar = s.opportunity || 0;
    var pStar = s.pressure || 0;
    var cStar = s.change || 0;
    var rawO = Math.max(0.001, raw.opportunity || 0);
    var rawP = raw.pressure || 0;
    var rawC = raw.change || 0;
    var rawPO = rawP / rawO;
    var rawCO = rawC / rawO;

    var ranked = (m.topHits && m.topHits.length)
      ? m.topHits
      : (m.hits || []).slice().sort(function (a, b) {
        var ma = AXES.reduce(function (sum, k) { return sum + ((contribForHit(a)[k]) || 0); }, 0);
        var mb = AXES.reduce(function (sum, k) { return sum + ((contribForHit(b)[k]) || 0); }, 0);
        return mb - ma;
      }).slice(0, 5);

    var outerHardTop3 = 0;
    var saturnHardTop3 = 0;
    var jupiterHard = false;
    ranked.slice(0, 3).forEach(function (h) {
      if (isOuterRelatedHard(h)) outerHardTop3 += 1;
      if (isSaturnHard(h)) saturnHardTop3 += 1;
    });
    (m.hits || ranked).forEach(function (h) {
      if (isJupiterHard(h)) jupiterHard = true;
    });

    var opportunityOn = oStar >= 4;
    // 기본: 별점(+약한 raw 보정). 숨은 하드 보정은 기회성 ON일 때만(가짜 stableUtilize 방지)
    var loadOn = pStar >= 4 || (pStar >= 3 && rawPO >= 0.7);
    var changeOn = cStar >= 4 || (cStar >= 3 && rawCO >= 0.75);

    if (opportunityOn) {
      if (!loadOn && (
        rawPO >= 0.85
        || (saturnHardTop3 >= 1 && rawPO >= 0.55)
        || (outerHardTop3 >= 2 && rawPO >= 0.7)
      )) loadOn = true;
      if (!changeOn && (
        outerHardTop3 >= 2
        || (rawCO >= 0.75 && outerHardTop3 >= 1)
        || rawCO >= 0.85
      )) changeOn = true;
    }

    var stableUtilize = opportunityOn && !loadOn && !changeOn;
    // utilizeInChange: 기회성 ON일 때만 (변화만 크다고 켜지지 않음)
    var utilizeInChange = opportunityOn && changeOn && !loadOn;
    var opportunityWithLoad = opportunityOn && loadOn;

    var primary = 'quiet';
    if (opportunityWithLoad) primary = 'opportunityWithLoad';
    else if (utilizeInChange) primary = 'utilizeInChange';
    else if (stableUtilize) primary = 'stableUtilize';
    else if (!opportunityOn && loadOn && changeOn) primary = 'cautionChange';
    else if (!opportunityOn && loadOn) primary = 'caution';
    else if (!opportunityOn && changeOn) primary = 'bigChange';

    var meta = JUDGMENT_META[primary] || JUDGMENT_META.quiet;
    var note = meta.note;
    if (jupiterHard && (primary === 'stableUtilize' || primary === 'utilizeInChange' || primary === 'opportunityWithLoad')) {
      note += ' 목성 하드: 확장 기회와 과장·과잉 리스크가 함께 있습니다.';
    }

    return {
      primary: primary,
      headline: meta.ko,
      note: note,
      signals: {
        opportunity: opportunityOn,
        load: loadOn,
        change: changeOn,
        stableUtilize: stableUtilize,
        utilizeInChange: utilizeInChange,
        opportunityWithLoad: opportunityWithLoad,
      },
      ratios: {
        rawPO: Math.round(rawPO * 1000) / 1000,
        rawCO: Math.round(rawCO * 1000) / 1000,
      },
      hitHints: {
        outerHardTop3: outerHardTop3,
        saturnHardTop3: saturnHardTop3,
        jupiterHard: jupiterHard,
      },
    };
  }

  function rangePack(r) {
    if (!r) return null;
    return {
      range: ymRangeLabel(r),
      startYm: r.startYm,
      endYm: r.endYm,
      months: r.months,
    };
  }

  function buildKeyTimings(months) {
    var stableIdx = [];
    var changeUtilizeIdx = [];
    var loadOppIdx = [];
    var cautionIdx = [];
    var bigChangeIdx = [];

    months.forEach(function (m, i) {
      var j = m.judgment || classifyMonthJudgment(m);
      m.judgment = j;
      if (j.signals.stableUtilize) stableIdx.push(i);
      if (j.signals.utilizeInChange) changeUtilizeIdx.push(i);
      if (j.signals.opportunityWithLoad) loadOppIdx.push(i);
      if (j.primary === 'caution' || j.primary === 'cautionChange') cautionIdx.push(i);
      // 변화가 큰 시기: 기회 OFF인 변화. utilizeInChange와 분리
      if (j.primary === 'bigChange' || j.primary === 'cautionChange') bigChangeIdx.push(i);
    });

    function catSimilar(a, b) {
      var ja = a.judgment && a.judgment.primary;
      var jb = b.judgment && b.judgment.primary;
      return ja === jb;
    }

    function bestRange(ranges, scoreFn) {
      if (!ranges.length) return null;
      var best = null;
      var bestV = -Infinity;
      ranges.forEach(function (r) {
        var sum = 0;
        for (var i = r.startIdx; i <= r.endIdx; i++) sum += scoreFn(months[i]);
        var avg = sum / Math.max(1, r.months);
        if (avg > bestV) {
          bestV = avg;
          best = r;
        }
      });
      return best;
    }

    var topOpp = pickTopIndex(months, function (m) { return (m.rawAxes && m.rawAxes.opportunity) || 0; });
    var topPre = pickTopIndex(months, function (m) { return (m.rawAxes && m.rawAxes.pressure) || 0; });
    var topChg = pickTopIndex(months, function (m) { return (m.rawAxes && m.rawAxes.change) || 0; });

    var bothHigh = months
      .map(function (m) {
        return {
          ym: m.ym,
          opportunityStars: (m.stars && m.stars.opportunity) || 0,
          pressureStars: (m.stars && m.stars.pressure) || 0,
          changeStars: (m.stars && m.stars.change) || 0,
          state: m.state,
          primary: (m.judgment && m.judgment.primary) || '',
          headline: (m.judgment && m.judgment.headline) || '',
        };
      })
      .filter(function (x) { return x.opportunityStars >= 4 && x.pressureStars >= 4; });

    function themePeak(theme) {
      var idx = pickTopIndex(months, function (m) {
        return (m.rawThemes && m.rawThemes[theme]) || 0;
      });
      if (idx < 0) return null;
      var m = months[idx];
      return {
        ym: m.ym,
        themeStars: (m.themeStars && m.themeStars[theme]) || 1,
        stars: m.stars,
        state: m.state,
        stateKo: (STATE_META[m.state] || {}).ko || m.state,
        judgment: m.judgment ? { primary: m.judgment.primary, headline: m.judgment.headline } : null,
        note: '주제 활성도(좋음/나쁨 방향 아님). 기회·주의는 stars·judgment 참고.',
      };
    }

    var stableBest = bestRange(
      groupConsecutiveMonths(stableIdx, months, catSimilar),
      function (m) {
        return ((m.stars && m.stars.opportunity) || 0)
          - ((m.stars && m.stars.pressure) || 0) * 0.3
          - ((m.stars && m.stars.change) || 0) * 0.2;
      }
    );
    var changeUtilizeBest = bestRange(
      groupConsecutiveMonths(changeUtilizeIdx, months, catSimilar),
      function (m) {
        return ((m.stars && m.stars.opportunity) || 0) + ((m.stars && m.stars.change) || 0) * 0.5;
      }
    );
    var loadOppBest = bestRange(
      groupConsecutiveMonths(loadOppIdx, months, catSimilar),
      function (m) {
        return ((m.stars && m.stars.opportunity) || 0) + ((m.stars && m.stars.pressure) || 0);
      }
    );
    var cautionBest = bestRange(
      groupConsecutiveMonths(cautionIdx, months, catSimilar),
      function (m) { return (m.stars && m.stars.pressure) || 0; }
    );
    var changeBest = bestRange(
      groupConsecutiveMonths(bigChangeIdx, months, catSimilar),
      function (m) { return (m.stars && m.stars.change) || 0; }
    );

    function peakPack(idx) {
      if (idx < 0) return null;
      return {
        ym: months[idx].ym,
        stars: months[idx].stars,
        rawAxes: months[idx].rawAxes,
        state: months[idx].state,
        judgment: months[idx].judgment
          ? { primary: months[idx].judgment.primary, headline: months[idx].judgment.headline }
          : null,
      };
    }

    function fallbackYm(idx) {
      if (idx < 0) return null;
      return {
        range: String(months[idx].ym).replace('-', '.'),
        startYm: months[idx].ym,
        endYm: months[idx].ym,
        months: 1,
      };
    }

    var stablePack = rangePack(stableBest);
    var dist = {};
    months.forEach(function (m) {
      var p = (m.judgment && m.judgment.primary) || 'quiet';
      dist[p] = (dist[p] || 0) + 1;
    });

    return {
      stableUtilize: stablePack,
      utilizeInChange: rangePack(changeUtilizeBest),
      opportunityWithLoad: rangePack(loadOppBest),
      // 하위 호환: bestUtilize = 안정 활용
      bestUtilize: stablePack,
      mostCaution: rangePack(cautionBest) || fallbackYm(topPre),
      biggestChange: rangePack(changeBest) || fallbackYm(topChg),
      peaks: {
        opportunity: peakPack(topOpp),
        pressure: peakPack(topPre),
        change: peakPack(topChg),
      },
      opportunityAndPressureHigh: bothHigh.slice(0, 12),
      themeActivation: {
        career: themePeak('career'),
        money: themePeak('money'),
        relationship: themePeak('relationship'),
      },
      categoryCounts: dist,
      copy: {
        stableUtilize: JUDGMENT_META.stableUtilize.ko,
        utilizeInChange: JUDGMENT_META.utilizeInChange.ko,
        opportunityWithLoad: JUDGMENT_META.opportunityWithLoad.ko,
        mostCaution: '주의가 필요한 시기',
        biggestChange: '변화가 큰 시기',
      },
    };
  }

  /**
   * 판정 데이터층: rawAxes 60개월 분위수 별점 + flags + 조합 판정 + keyTimings.
   * 기존 state / 월내 axes / themes / rawAxes 계산은 변경하지 않음.
   */
  function attachJudgmentLayer(months) {
    var meta = {
      starMethod: 'percentile_raw_60m',
      starThresholds: {
        '5': 'raw ≥ 해당 축 60개월 p90',
        '4': 'raw ≥ p75',
        '3': 'raw ≥ p50',
        '2': 'raw ≥ p25',
        '1': 'raw < p25',
      },
      flagRule: 'stars>=4 이면 해당 축 플래그 ON (한 달에 여러 개 가능)',
      categoryRule:
        '기회·부담·변화 신호 조합 → stableUtilize / utilizeInChange / opportunityWithLoad / caution* / bigChange',
      keyTimings: {},
    };
    if (!months || !months.length) return meta;

    var axisLists = {};
    AXES.forEach(function (k) {
      axisLists[k] = months
        .map(function (m) { return (m.rawAxes && m.rawAxes[k]) || 0; })
        .slice()
        .sort(function (a, b) { return a - b; });
    });
    var themeKeys = ['money', 'career', 'relationship'];
    var themeLists = {};
    themeKeys.forEach(function (k) {
      themeLists[k] = months
        .map(function (m) { return (m.rawThemes && m.rawThemes[k]) || 0; })
        .slice()
        .sort(function (a, b) { return a - b; });
    });

    months.forEach(function (m) {
      var raw = m.rawAxes || emptyAxes();
      var stars = {};
      var pct = {};
      AXES.forEach(function (k) {
        var p = percentileOf(axisLists[k], raw[k] || 0);
        pct[k] = Math.round(p * 1000) / 1000;
        stars[k] = percentileToStars(p);
      });
      var flags = {
        opportunity: stars.opportunity >= 4,
        stability: stars.stability >= 4,
        pressure: stars.pressure >= 4,
        change: stars.change >= 4,
        labels: [],
      };
      AXES.forEach(function (k) {
        if (flags[k]) flags.labels.push(FLAG_LABEL[k]);
      });
      var themeStars = {};
      var themePct = {};
      themeKeys.forEach(function (k) {
        var tv = (m.rawThemes && m.rawThemes[k]) || 0;
        var tp = percentileOf(themeLists[k], tv);
        themePct[k] = Math.round(tp * 1000) / 1000;
        themeStars[k] = percentileToStars(tp);
      });
      m.stars = stars;
      m.axisPercentile = pct;
      m.flags = flags;
      m.themeStars = themeStars;
      m.themePercentile = themePct;
      m.judgment = classifyMonthJudgment(m);
    });

    meta.keyTimings = buildKeyTimings(months);
    meta.categoryCounts = meta.keyTimings.categoryCounts || {};
    return meta;
  }

  function buildResult(samples) {
    var months = (samples || []).map(aggregateMonth);
    var episodes = buildEpisodes(months);
    var segments = buildSegments(months);
    attachEpisodesToSegments(segments, episodes);
    var judgment = attachJudgmentLayer(months);
    return {
      version: 2,
      judgmentVersion: 2,
      months: months,
      episodes: episodes.slice(0, 24),
      segments: segments,
      fromYm: months[0] ? months[0].ym : '',
      toYm: months.length ? months[months.length - 1].ym : '',
      hasProgMoon: !!(samples || []).some(function (s) { return !!s.progMoon; }),
      judgment: judgment,
      keyTimings: judgment.keyTimings,
    };
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function starLine(stars) {
    if (!stars) return '';
    return (
      '기회★' + (stars.opportunity || 0) +
      ' · 부담★' + (stars.pressure || 0) +
      ' · 변화★' + (stars.change || 0) +
      ' · 안정★' + (stars.stability || 0)
    );
  }

  function monthAtYm(months, ym) {
    if (!ym || !months) return null;
    for (var i = 0; i < months.length; i++) {
      if (months[i].ym === ym) return months[i];
    }
    return null;
  }

  function packTimingStars(months, pack) {
    if (!pack || !pack.startYm) return null;
    var m = monthAtYm(months, pack.startYm);
    return m ? m.stars : null;
  }

  /**
   * keyTimings UI 카드. 값이 있는 항목만 노출.
   * stableUtilize가 없으면 「없다」고 쓰지 않고 카드를 생략한다.
   */
  function renderKeyTimingsHtml(data) {
    var kt = data.keyTimings || {};
    var months = data.months || [];
    var items = [];

    function pushCard(key, pack, forceTitle) {
      if (!pack || !pack.range) return;
      var meta = JUDGMENT_META[key] || {};
      var stars = packTimingStars(months, pack);
      var m0 = monthAtYm(months, pack.startYm);
      var j = m0 && m0.judgment;
      // 별점·판정명·헤드라인 일치: 월 판정 headline 우선
      var title = (j && j.headline) || forceTitle || meta.ko || (kt.copy && kt.copy[key]) || key;
      var note = (j && j.note) || meta.note || '';
      var clsKey = (j && j.primary) || key;
      var hits = (m0 && m0.topHits)
        ? m0.topHits.slice(0, 2).map(function (h) { return h.line; }).join(' · ')
        : '';
      items.push(
        '<div class="tl-judge-card tl-judge--' + escapeHtml(clsKey) + '">' +
        '<div class="tl-judge-label">' + escapeHtml(title) + '</div>' +
        '<div class="tl-judge-range">' + escapeHtml(String(pack.range).replace(/-/g, '.')) +
        (pack.months > 1 ? ' <span class="tl-win-len">(' + pack.months + '개월)</span>' : '') +
        '</div>' +
        (stars ? '<div class="tl-judge-stars">' + escapeHtml(starLine(stars)) + '</div>' : '') +
        (note ? '<div class="tl-judge-note">' + escapeHtml(note) + '</div>' : '') +
        (hits ? '<div class="tl-judge-hits">' + escapeHtml(hits) + '</div>' : '') +
        '</div>'
      );
    }

    // 노출 순서: 잡힌 타이밍만. stableUtilize는 있을 때만.
    pushCard('utilizeInChange', kt.utilizeInChange);
    pushCard('opportunityWithLoad', kt.opportunityWithLoad);
    pushCard('stableUtilize', kt.stableUtilize);
    pushCard('caution', kt.mostCaution, (JUDGMENT_META.caution && JUDGMENT_META.caution.ko) || '주의가 필요한 시기');
    // biggestChange: 주의 구간과 동일하면 중복 카드 생략
    if (kt.biggestChange && kt.mostCaution
      && kt.biggestChange.startYm === kt.mostCaution.startYm
      && kt.biggestChange.endYm === kt.mostCaution.endYm) {
      /* skip duplicate */
    } else {
      pushCard('bigChange', kt.biggestChange, (JUDGMENT_META.bigChange && JUDGMENT_META.bigChange.ko) || '변화가 큰 시기');
    }

    if (!items.length) return '';

    return (
      '<div class="tl-sec tl-judge-sec">' +
      '<h4>엔진 판정 · 주목할 타이밍</h4>' +
      '<p class="tl-judge-intro">별점은 5년 안에서의 <strong>세기</strong>이고, 아래 문장은 그 세기를 어떻게 읽을지의 <strong>판정</strong>입니다. ' +
      '기회★가 높아도 곧바로 「좋은 달」은 아닙니다.</p>' +
      '<div class="tl-judge-grid">' + items.join('') + '</div></div>'
    );
  }

  function renderHtml(data, filterTheme) {
    if (!data || !data.months || !data.months.length) {
      return '<div class="transit-empty">타임라인을 계산하지 못했어요.</div>';
    }
    var filter = filterTheme || 'all';
    var bars = data.months.map(function (m, idx) {
      var meta = STATE_META[m.state] || STATE_META.stability;
      var h = Math.max(12, m.intensity || 40);
      var j = m.judgment;
      var tip = m.ym + ' · ' + meta.ko;
      if (j && j.headline && j.primary && j.primary !== 'quiet') {
        tip += ' · ' + j.headline;
      }
      if (m.stars) tip += ' · ' + starLine(m.stars);
      var yearTick = m.mo === 1 || idx === 0
        ? '<span class="tl-year">' + m.y + '</span>'
        : '';
      var dim = '';
      if (filter !== 'all') {
        var tv = (m.themes && m.themes[filter]) || 0;
        if (tv < 0.25) dim = ' tl-col--dim';
      }
      return (
        '<div class="tl-col' + dim + '" title="' + escapeHtml(tip) + '">' +
        '<div class="tl-bar-wrap">' +
        '<div class="tl-bar ' + meta.cls + '" style="height:' + h + '%"></div>' +
        '</div>' + yearTick + '</div>'
      );
    }).join('');

    var legend = Object.keys(STATE_META).map(function (id) {
      var m = STATE_META[id];
      return '<span class="tl-leg"><i class="tl-dot ' + m.cls + '"></i>' + escapeHtml(m.ko) + '</span>';
    }).join('');

    var segs = (data.segments || []).filter(function (s) {
      if (filter === 'all') return true;
      return (s.themeScores && s.themeScores[filter] >= 0.28) || (s.themes || []).indexOf(filter) >= 0;
    });

    var segHtml = segs.length
      ? segs.map(function (s) {
          var tags = (s.themes || []).map(function (t) {
            return '<span class="tl-tag">' + escapeHtml(THEME_KR[t] || t) + '</span>';
          }).join('');
          var ep = s.episodeLine ? '<div class="tl-win-hits">' + escapeHtml(s.episodeLine) + '</div>' : '';
          var prog = (s.progNotes && s.progNotes[0])
            ? '<div class="tl-win-hits">' + escapeHtml(s.progNotes[0]) + '</div>'
            : '';
          return (
            '<div class="tl-win tl-win-state ' + (STATE_META[s.state] || {}).cls + '">' +
            '<div class="tl-win-range">' + escapeHtml(ymShort(s.startY, s.startM)) +
            ' ~ ' + escapeHtml(ymShort(s.endY, s.endM)) +
            ' <span class="tl-win-len">(' + s.months + '개월 · ' + escapeHtml(s.stateKo) + ')</span></div>' +
            '<div class="tl-win-tags">' + tags + '</div>' + ep + prog +
            '</div>'
          );
        }).join('')
      : '<p class="tl-empty-win">이 주제에서 두드러진 구간이 적어요. 「전체」로 보시면 흐름이 더 잘 보여요.</p>';

    var progHint = data.hasProgMoon
      ? ' 프로그레스 달(하우스 이동·주요 각)도 반영했습니다.'
      : ' 출생 시간이 있으면 프로그레스 달도 함께 봅니다.';

    return (
      '<div class="tl-guide">느린 행성 트랜짓을 <strong>확장기·안정기·압박기·전환기·도약·재편기</strong>로 읽습니다. ' +
      '조화각이 무조건 좋은 운이 아니고, 긴장각이 무조건 나쁜 운도 아니에요.' + progHint +
      ' (' + escapeHtml(data.fromYm) + ' ~ ' + escapeHtml(data.toYm) + ')</div>' +
      renderKeyTimingsHtml(data) +
      '<div class="tl-filter" data-tl-filter>' +
      '<button type="button" class="tl-filter-btn' + (filter === 'all' ? ' is-on' : '') + '" data-theme="all">전체</button>' +
      '<button type="button" class="tl-filter-btn' + (filter === 'relationship' ? ' is-on' : '') + '" data-theme="relationship">연애</button>' +
      '<button type="button" class="tl-filter-btn' + (filter === 'career' ? ' is-on' : '') + '" data-theme="career">일</button>' +
      '<button type="button" class="tl-filter-btn' + (filter === 'money' ? ' is-on' : '') + '" data-theme="money">금전</button>' +
      '</div>' +
      '<div class="tl-legend">' + legend + '</div>' +
      '<div class="tl-chart" role="img" aria-label="5년 상태 타임라인">' + bars + '</div>' +
      '<div class="tl-sec"><h4>상태 구간</h4>' + segHtml + '</div>'
    );
  }

  function buildAiSummary(data) {
    if (!data || !data.months) return '';
    var L = [];
    L.push('[5년 장기 운 타임라인 v2 · ' + data.fromYm + ' ~ ' + data.toYm + ']');
    L.push('※ 아래는 모델용 내부 요약이다. 사용자 최종 답변에 필드명·영문 primary·theme★ 표기를 그대로 쓰지 말고, 한국어 headline/생활 언어로만 풀어 쓸 것.');
    L.push('축: opportunity/stability/pressure/change · 상태는 확장기·안정기·압박기·전환기·도약·재편기');
    L.push('별점=60개월 상대 세기 · 판정(headline)=별점을 어떻게 읽을지(길흉 단정 아님)');
    if (data.hasProgMoon) L.push('프로그레스 달 반영됨');
    if (data.judgmentVersion) L.push('judgmentVersion: ' + data.judgmentVersion);

    var kt = data.keyTimings || {};
    L.push('');
    L.push('[엔진 판정 · keyTimings — AI는 이 판정명/헤드라인을 뒤집지 말 것. 출력에는 영문 ID 대신 한국어 headline 사용]');
    L.push('규칙: 아래에 없는 타이밍 종류는 「없다」「결핍」으로 강조하지 말 것. 잡힌 항목만 해석에 사용.');

    function emitTiming(key, pack, labelOverride) {
      if (!pack || !pack.range) return;
      var meta = JUDGMENT_META[key] || {};
      var label = labelOverride || meta.ko || key;
      var stars = packTimingStars(data.months, pack);
      var m0 = monthAtYm(data.months, pack.startYm);
      L.push('· ' + label + ' | ' + pack.range + (pack.months > 1 ? ' (' + pack.months + '개월)' : ''));
      if (stars) L.push('  stars: ' + starLine(stars));
      if (m0 && m0.judgment) {
        L.push('  primary: ' + m0.judgment.primary + ' | headline: ' + m0.judgment.headline);
        if (m0.judgment.note) L.push('  note: ' + m0.judgment.note);
      } else if (meta.note) {
        L.push('  note: ' + meta.note);
      }
      if (m0 && m0.state) L.push('  state(참고): ' + ((STATE_META[m0.state] || {}).ko || m0.state));
      if (m0 && m0.topHits && m0.topHits.length) {
        L.push('  topHits: ' + m0.topHits.slice(0, 3).map(function (h) { return h.line; }).join(' / '));
      }
    }

    emitTiming('utilizeInChange', kt.utilizeInChange);
    emitTiming('opportunityWithLoad', kt.opportunityWithLoad);
    emitTiming('stableUtilize', kt.stableUtilize);
    emitTiming('caution', kt.mostCaution, '주의가 필요한 시기');
    if (!(kt.biggestChange && kt.mostCaution
      && kt.biggestChange.startYm === kt.mostCaution.startYm
      && kt.biggestChange.endYm === kt.mostCaution.endYm)) {
      emitTiming('bigChange', kt.biggestChange, '변화가 큰 시기');
    }
    if (!kt.utilizeInChange && !kt.opportunityWithLoad && !kt.stableUtilize && !kt.mostCaution && !kt.biggestChange) {
      L.push('· (강조할 keyTimings 없음 — 상태 구간·에피소드 중심으로 설명)');
    }

    if (kt.themeActivation) {
      L.push('');
      L.push('[주제 활성 peak — 활성도일 뿐 길흉 아님]');
      ['relationship', 'career', 'money'].forEach(function (theme) {
        var t = kt.themeActivation[theme];
        if (!t) return;
        L.push(
          '· ' + (THEME_KR[theme] || theme) + ': ' + t.ym +
          ' theme★' + (t.themeStars || '') +
          (t.stars ? ' | ' + starLine(t.stars) : '') +
          (t.judgment && t.judgment.headline ? ' | ' + t.judgment.headline : '')
        );
      });
    }

    L.push('');
    L.push('상태 구간:');
    (data.segments || []).slice(0, 8).forEach(function (s) {
      var th = (s.themes || []).map(function (t) { return THEME_KR[t] || t; }).join('/');
      L.push(
        '  · ' + s.startYm + '~' + s.endYm + ' ' + s.stateKo +
        ' (' + s.months + '개월)' +
        (th ? ' [' + th + ']' : '') +
        (s.episodeLine ? ' — ' + s.episodeLine : '')
      );
    });
    L.push('주요 에피소드:');
    (data.episodes || []).slice(0, 10).forEach(function (ep) {
      L.push(
        '  · ' + ep.startYm + '~' + ep.endYm + ' ' + ep.line +
        ' (정점 ' + ep.peakYm + ', 접촉≈' + ep.contactsApprox + ')'
      );
    });
    return L.join('\n');
  }

  global.AstroTimelineV2 = {
    SLOW_KEYS: SLOW_KEYS,
    MONTHS: MONTHS,
    CHUNK: CHUNK,
    STATE_META: STATE_META,
    THEME_KR: THEME_KR,
    JUDGMENT_META: JUDGMENT_META,
    ymLabel: ymLabel,
    aggregateMonth: aggregateMonth,
    buildEpisodes: buildEpisodes,
    buildSegments: buildSegments,
    buildResult: buildResult,
    attachJudgmentLayer: attachJudgmentLayer,
    classifyMonthJudgment: classifyMonthJudgment,
    renderHtml: renderHtml,
    renderKeyTimingsHtml: renderKeyTimingsHtml,
    buildAiSummary: buildAiSummary,
    classifyState: classifyState,
  };
})(typeof window !== 'undefined' ? window : globalThis);
