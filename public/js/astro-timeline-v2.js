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
    var axes = normalizeAxes(rawAxes);
    var themes = normalizeThemes(rawThemes);
    var state = classifyState(axes, { uranusPluto: uranusPluto });

    return {
      y: sample.y,
      mo: sample.mo,
      ym: sample.ym || ymLabel(sample.y, sample.mo),
      axes: axes,
      themes: themes,
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

  function buildResult(samples) {
    var months = (samples || []).map(aggregateMonth);
    var episodes = buildEpisodes(months);
    var segments = buildSegments(months);
    attachEpisodesToSegments(segments, episodes);
    return {
      version: 2,
      months: months,
      episodes: episodes.slice(0, 24),
      segments: segments,
      fromYm: months[0] ? months[0].ym : '',
      toYm: months.length ? months[months.length - 1].ym : '',
      hasProgMoon: samples.some(function (s) { return !!s.progMoon; }),
    };
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderHtml(data, filterTheme) {
    if (!data || !data.months || !data.months.length) {
      return '<div class="transit-empty">타임라인을 계산하지 못했어요.</div>';
    }
    var filter = filterTheme || 'all';
    var bars = data.months.map(function (m, idx) {
      var meta = STATE_META[m.state] || STATE_META.stability;
      var h = Math.max(12, m.intensity || 40);
      var yearTick = m.mo === 1 || idx === 0
        ? '<span class="tl-year">' + m.y + '</span>'
        : '';
      var dim = '';
      if (filter !== 'all') {
        var tv = (m.themes && m.themes[filter]) || 0;
        if (tv < 0.25) dim = ' tl-col--dim';
      }
      return (
        '<div class="tl-col' + dim + '" title="' + escapeHtml(m.ym + ' · ' + meta.ko) + '">' +
        '<div class="tl-bar-wrap">' +
        '<div class="tl-bar ' + meta.cls + '" style="height:' + h + '%"></div>' +
        '</div>' + yearTick + '</div>'
      );
    }).join('');

    var legend = AXES.map(function () { return ''; }).join('');
    legend = Object.keys(STATE_META).map(function (id) {
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
    L.push('축: opportunity/stability/pressure/change · 상태는 확장기·안정기·압박기·전환기·도약·재편기');
    if (data.hasProgMoon) L.push('프로그레스 달 반영됨');
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
    ['relationship', 'career', 'money'].forEach(function (theme) {
      var ranked = data.months
        .map(function (m) { return { ym: m.ym, v: (m.themes && m.themes[theme]) || 0, state: m.state }; })
        .sort(function (a, b) { return b.v - a.v; })
        .slice(0, 3);
      L.push('주제 peak · ' + (THEME_KR[theme] || theme) + ':');
      ranked.forEach(function (r) {
        L.push('  · ' + r.ym + ' (' + r.v + ', ' + ((STATE_META[r.state] || {}).ko || r.state) + ')');
      });
    });
    return L.join('\n');
  }

  global.AstroTimelineV2 = {
    SLOW_KEYS: SLOW_KEYS,
    MONTHS: MONTHS,
    CHUNK: CHUNK,
    STATE_META: STATE_META,
    THEME_KR: THEME_KR,
    ymLabel: ymLabel,
    aggregateMonth: aggregateMonth,
    buildEpisodes: buildEpisodes,
    buildSegments: buildSegments,
    buildResult: buildResult,
    renderHtml: renderHtml,
    buildAiSummary: buildAiSummary,
    classifyState: classifyState,
  };
})(typeof window !== 'undefined' ? window : globalThis);
