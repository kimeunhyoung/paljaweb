/**
 * 인생 운의 흐름 (만 20~80) — coarse→candidate→fine→episode→period→highlights
 *
 * importance = compute priority / display order ONLY (NOT good/bad fortune score).
 * strongEligible +0.05 = compute_priority_only bonus.
 *
 * DEFAULT_* = ship defaults (not astrological absolute truth).
 * CALIB_* overrides via setCalib() / buildPipeline(calib).
 */
(function (global) {
  'use strict';

  var AXES = ['opportunity', 'stability', 'pressure', 'change'];
  var SLOW_KEYS = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

  var DEFAULT = {
    RAW_SCALE: 4.0,
    P_SEED_PEAK: 0.72,
    P_SEED_RUN: 0.68,
    P_STRONG: 0.80,
    FLOOR_REL_MIN: 0.28,
    FLOOR_RUN_ABS: 0.32,
    FLOOR_ABS_ALWAYS: 0.55,
    FLOOR_STRONG: 0.48,
    RUN_MIN_STEPS: 2,
    TIER_A_ABS_SINGLE: 0.62,
    TIER_A_RUN_STEPS: 3,
    MULTI_AXIS_BONUS: 0.12,
    /** compute_priority_only — NOT fortune / good-bad */
    STRONG_ELIGIBLE_IMPORTANCE_BONUS: 0.05,
    FINE_A_PAD_MO: 1,
    FINE_B_RADIUS_MO: 4,
    FINE_C_RADIUS_MO: 1,
    FINE_C_SKIP: false,
    FINE_BUDGET: 180,
    JUP_ORB: 3.5,
    JUP_PAD_MO: 2,
    EPISODE_GAP_MAX: 3,
    SEGMENT_SIM: 0.70,
    PERIOD_MIN_MONTHS: 4,
    COARSE_STEP_MONTHS: 3,
    AGE_FROM: 20,
    AGE_TO: 80,
    SP_THEME_BONUS: 0.04,
  };

  var CALIB = {};

  function cfg() {
    var o = {};
    Object.keys(DEFAULT).forEach(function (k) { o[k] = DEFAULT[k]; });
    Object.keys(CALIB).forEach(function (k) {
      if (CALIB[k] != null) o[k] = CALIB[k];
    });
    return o;
  }

  function setCalib(partial) {
    if (!partial) return;
    Object.keys(partial).forEach(function (k) { CALIB[k] = partial[k]; });
  }

  function resetCalib() { CALIB = {}; }

  var CONTRIB = {
    jupiter: {
      trine: { opportunity: 2.2, stability: 0.4, pressure: 0.1, change: 0.2 },
      sextile: { opportunity: 1.8, stability: 0.3, pressure: 0.1, change: 0.3 },
      conjunction: { opportunity: 2.0, stability: 0.3, pressure: 0.4, change: 0.5 },
      square: { opportunity: 1.2, stability: 0.1, pressure: 1.4, change: 0.6 },
      opposition: { opportunity: 1.0, stability: 0.2, pressure: 1.3, change: 0.7 },
    },
    saturn: {
      trine: { opportunity: 0.3, stability: 2.2, pressure: 0.4, change: 0.2 },
      sextile: { opportunity: 0.4, stability: 1.8, pressure: 0.5, change: 0.2 },
      conjunction: { opportunity: 0.2, stability: 1.6, pressure: 1.5, change: 0.6 },
      square: { opportunity: 0.1, stability: 1.0, pressure: 2.2, change: 0.5 },
      opposition: { opportunity: 0.1, stability: 0.9, pressure: 2.0, change: 0.6 },
    },
    uranus: {
      trine: { opportunity: 1.0, stability: 0.2, pressure: 0.3, change: 1.8 },
      sextile: { opportunity: 0.9, stability: 0.2, pressure: 0.3, change: 1.5 },
      conjunction: { opportunity: 0.7, stability: 0.1, pressure: 0.8, change: 2.2 },
      square: { opportunity: 0.4, stability: 0.1, pressure: 1.5, change: 2.0 },
      opposition: { opportunity: 0.3, stability: 0.1, pressure: 1.4, change: 2.0 },
    },
    neptune: {
      trine: { opportunity: 1.2, stability: 0.3, pressure: 0.2, change: 1.2 },
      sextile: { opportunity: 1.0, stability: 0.3, pressure: 0.3, change: 1.0 },
      conjunction: { opportunity: 0.8, stability: 0.2, pressure: 0.7, change: 1.6 },
      square: { opportunity: 0.4, stability: 0.1, pressure: 1.6, change: 1.5 },
      opposition: { opportunity: 0.3, stability: 0.1, pressure: 1.5, change: 1.5 },
    },
    pluto: {
      trine: { opportunity: 0.9, stability: 0.3, pressure: 0.6, change: 1.6 },
      sextile: { opportunity: 0.8, stability: 0.3, pressure: 0.7, change: 1.4 },
      conjunction: { opportunity: 0.5, stability: 0.2, pressure: 1.4, change: 2.0 },
      square: { opportunity: 0.2, stability: 0.1, pressure: 2.0, change: 1.8 },
      opposition: { opportunity: 0.2, stability: 0.1, pressure: 1.9, change: 1.8 },
    },
  };

  var STATE_KO = {
    expansion: '상승·확장기',
    fruition: '안정·결실기',
    leap: '도약·재편기',
    major_transition: '대전환기',
    consolidation: '정비·점검기',
    pressure: '압력이 강한 시기',
  };

  var PLANET_KR = {
    sun: '태양', moon: '달', mercury: '수성', venus: '금성', mars: '화성',
    jupiter: '목성', saturn: '토성', uranus: '천왕성', neptune: '해왕성', pluto: '명왕성',
    asc: '상승궁', mc: '중천점',
  };
  var ASPECT_KR = {
    conjunction: '합', opposition: '충', trine: '삼각', square: '사각', sextile: '육각',
  };

  function emptyAxes() {
    return { opportunity: 0, stability: 0, pressure: 0, change: 0 };
  }
  function emptyThemes() {
    return { money: 0, career: 0, relationship: 0 };
  }
  function clamp01(n) {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  }
  function ymLabel(y, m) {
    return y + '-' + String(m).padStart(2, '0');
  }
  function parseYm(ym) {
    var p = String(ym).split('-');
    return { y: +p[0], mo: +p[1] };
  }
  function addMonthsYm(ym, delta) {
    var p = parseYm(ym);
    var t = p.y * 12 + (p.mo - 1) + delta;
    var y = Math.floor(t / 12);
    var mo = (t % 12) + 1;
    if (mo <= 0) { y -= 1; mo += 12; }
    return ymLabel(y, mo);
  }
  function monthsBetween(a, b) {
    var pa = parseYm(a);
    var pb = parseYm(b);
    return (pb.y - pa.y) * 12 + (pb.mo - pa.mo);
  }
  function softCap(raw, scale) {
    return clamp01((raw || 0) / (scale || 4));
  }
  function percentileRank(sortedAsc, value) {
    if (!sortedAsc.length) return 0;
    var less = 0;
    for (var i = 0; i < sortedAsc.length; i++) {
      if (sortedAsc[i] < value) less++;
      else break;
    }
    return less / sortedAsc.length;
  }
  function orbFactor(orbOff, tk) {
    var base = tk === 'jupiter' ? 6 : 5;
    return 1 + Math.max(0, (base - (orbOff || 0)) * 0.08);
  }

  function contribForHit(h) {
    var table = CONTRIB[h.tk];
    if (!table) return emptyAxes();
    var base = table[h.key] || table.conjunction || emptyAxes();
    var of = orbFactor(h.orbOff, h.tk);
    var o = emptyAxes();
    AXES.forEach(function (k) { o[k] = (base[k] || 0) * of; });
    return o;
  }

  function themeWeights(h, natalCtx) {
    var t = emptyThemes();
    var nk = h.nk;
    var tk = h.tk;
    if (nk === 'venus' || nk === 'moon' || nk === 'mars') t.relationship += 1.0;
    if (nk === 'sun' || nk === 'mc' || nk === 'saturn' || nk === 'mars' || nk === 'mercury') t.career += 1.0;
    if (nk === 'venus' || nk === 'jupiter' || nk === 'pluto' || nk === 'saturn') t.money += 1.0;
    if (tk === 'saturn' || tk === 'uranus') t.career += 0.5;
    if (tk === 'jupiter' || tk === 'pluto') t.money += 0.45;
    if (tk === 'neptune') t.relationship += 0.35;
    var anchors = natalCtx && natalCtx.topicAnchors;
    if (anchors) {
      ['money', 'career', 'relationship'].forEach(function (topic) {
        var a = anchors[topic];
        if (!a) return;
        if ((a.points || []).indexOf(nk) >= 0) t[topic] += 0.8;
        if ((a.rulers || []).indexOf(nk) >= 0) t[topic] += 0.7;
        if ((a.rulers || []).indexOf(tk) >= 0) t[topic] += 0.35;
      });
    }
    return t;
  }

  function scoreHits(hits, natalCtx, c) {
    c = c || cfg();
    var raw = emptyAxes();
    var themes = emptyThemes();
    var jupiterInOpp = false;
    (hits || []).forEach(function (h) {
      var vec = contribForHit(h);
      AXES.forEach(function (k) { raw[k] += vec[k] || 0; });
      var tw = themeWeights(h, natalCtx);
      ['money', 'career', 'relationship'].forEach(function (k) {
        themes[k] += (tw[k] || 0) * (1 + Math.max(vec.opportunity, vec.pressure, vec.change) * 0.25);
      });
      if (h.tk === 'jupiter') jupiterInOpp = true;
    });
    var axesAbs = emptyAxes();
    AXES.forEach(function (k) {
      axesAbs[k] = Math.round(softCap(raw[k], c.RAW_SCALE) * 1000) / 1000;
    });
    return { axesRaw: raw, axesAbs: axesAbs, themesRaw: themes, jupiterHit: jupiterInOpp };
  }

  function buildNatalContext(opts) {
    var HR = global.AstroHouseRulers;
    var houses = opts.houses || [];
    var byHouse = HR ? HR.buildByHouse(houses) : {};
    var moneyR = HR ? HR.topicRulerKeys(byHouse, [2, 8]) : [];
    var careerR = HR ? HR.topicRulerKeys(byHouse, [10, 6]) : [];
    var relR = HR ? HR.topicRulerKeys(byHouse, [5, 7]) : [];
    return {
      birth: opts.birth,
      coords: opts.coords,
      natalDegs: opts.natalDegs || {},
      houses: houses,
      houseRulers: {
        systemNote: 'dual_rulers_v1',
        bySign: HR ? HR.BY_SIGN : {},
        byHouse: byHouse,
      },
      topicAnchors: {
        money: { houses: [2, 8], points: ['venus', 'jupiter', 'pluto'], rulers: moneyR },
        career: { houses: [10, 6], points: ['sun', 'mars', 'saturn', 'mc'], rulers: careerR },
        relationship: { houses: [5, 7], points: ['venus', 'moon', 'mars'], rulers: relR },
      },
      unknownTime: !!(opts.birth && opts.birth.unknownTime),
    };
  }

  function attachPercentiles(samples) {
    var c = cfg();
    var series = {};
    AXES.forEach(function (ax) {
      series[ax] = samples.map(function (s) { return s.axesAbs[ax] || 0; }).slice().sort(function (a, b) { return a - b; });
    });
    samples.forEach(function (s) {
      s.axesPct = emptyAxes();
      AXES.forEach(function (ax) {
        s.axesPct[ax] = Math.round(percentileRank(series[ax], s.axesAbs[ax] || 0) * 1000) / 1000;
      });
      var thSeries = { money: [], career: [], relationship: [] };
      // themes pct computed after loop — fill below
    });
    var tSeries = { money: [], career: [], relationship: [] };
    samples.forEach(function (s) {
      ['money', 'career', 'relationship'].forEach(function (k) {
        tSeries[k].push((s.themesRaw && s.themesRaw[k]) || 0);
      });
    });
    ['money', 'career', 'relationship'].forEach(function (k) {
      tSeries[k].sort(function (a, b) { return a - b; });
    });
    samples.forEach(function (s) {
      s.themesAbs = emptyThemes();
      s.themesPct = emptyThemes();
      ['money', 'career', 'relationship'].forEach(function (k) {
        var raw = (s.themesRaw && s.themesRaw[k]) || 0;
        s.themesAbs[k] = Math.round(softCap(raw, c.RAW_SCALE * 1.2) * 1000) / 1000;
        s.themesPct[k] = Math.round(percentileRank(tSeries[k], raw) * 1000) / 1000;
      });
    });
    return samples;
  }

  function passesSeedGate(abs, pct, c, mode) {
    if (mode === 'peak') {
      return (pct >= c.P_SEED_PEAK && abs >= c.FLOOR_REL_MIN) || abs >= c.FLOOR_ABS_ALWAYS;
    }
    return (pct >= c.P_SEED_RUN && abs >= c.FLOOR_RUN_ABS) || abs >= c.FLOOR_ABS_ALWAYS;
  }

  function strongEligible(abs, pct, c) {
    return abs >= c.FLOOR_STRONG && pct >= c.P_STRONG;
  }

  function buildAxisSeeds(samples) {
    var c = cfg();
    var seeds = [];
    AXES.forEach(function (axis) {
      var peaks = [];
      for (var i = 0; i < samples.length; i++) {
        var v = samples[i].axesAbs[axis] || 0;
        var pct = samples[i].axesPct[axis] || 0;
        var left = i === 0 ? -1 : (samples[i - 1].axesAbs[axis] || 0);
        var right = i === samples.length - 1 ? -1 : (samples[i + 1].axesAbs[axis] || 0);
        var isMax = v >= left && v >= right && v > 0;
        if (isMax && passesSeedGate(v, pct, c, 'peak')) {
          peaks.push({
            axis: axis,
            kind: 'peak',
            startIdx: i,
            endIdx: i,
            peakIdx: i,
            peakYm: samples[i].ym,
            startYm: samples[i].ym,
            endYm: samples[i].ym,
            peakValue: v,
            peakPct: pct,
            strongEligible: strongEligible(v, pct, c),
          });
        }
      }
      var i = 0;
      while (i < samples.length) {
        var abs = samples[i].axesAbs[axis] || 0;
        var pct = samples[i].axesPct[axis] || 0;
        if (!passesSeedGate(abs, pct, c, 'run')) { i++; continue; }
        var j = i;
        var peakIdx = i;
        var peakVal = abs;
        while (j + 1 < samples.length) {
          var a2 = samples[j + 1].axesAbs[axis] || 0;
          var p2 = samples[j + 1].axesPct[axis] || 0;
          if (!passesSeedGate(a2, p2, c, 'run')) break;
          j++;
          if (a2 > peakVal) { peakVal = a2; peakIdx = j; }
        }
        var steps = j - i + 1;
        if (steps >= c.RUN_MIN_STEPS) {
          peaks.push({
            axis: axis,
            kind: 'run',
            startIdx: i,
            endIdx: j,
            peakIdx: peakIdx,
            peakYm: samples[peakIdx].ym,
            startYm: samples[i].ym,
            endYm: samples[j].ym,
            peakValue: peakVal,
            peakPct: samples[peakIdx].axesPct[axis] || 0,
            strongEligible: strongEligible(peakVal, samples[peakIdx].axesPct[axis] || 0, c),
            runSteps: steps,
          });
        }
        i = j + 1;
      }
      peaks.sort(function (a, b) { return b.peakValue - a.peakValue; });
      if (peaks.length > 40) {
        peaks.slice(40).forEach(function (s) { s.dormant = true; });
      }
      peaks.forEach(function (s) {
        if (!s.dormant) seeds.push(s);
      });
    });
    return seeds;
  }

  function mergeSeedsToCandidates(seeds, samples) {
    var c = cfg();
    if (!seeds.length) return [];
    var items = seeds.map(function (s) {
      return {
        startIdx: s.startIdx,
        endIdx: s.endIdx,
        seeds: [s],
      };
    }).sort(function (a, b) { return a.startIdx - b.startIdx; });

    var merged = [];
    var cur = items[0];
    for (var i = 1; i < items.length; i++) {
      var n = items[i];
      if (n.startIdx <= cur.endIdx + 1) {
        cur.endIdx = Math.max(cur.endIdx, n.endIdx);
        cur.seeds = cur.seeds.concat(n.seeds);
      } else {
        merged.push(cur);
        cur = n;
      }
    }
    merged.push(cur);

    return merged.map(function (m, idx) {
      var axesInvolved = [];
      var peakAbs = 0;
      var peakYm = samples[m.startIdx].ym;
      var anyStrong = false;
      var maxRun = 1;
      m.seeds.forEach(function (s) {
        if (axesInvolved.indexOf(s.axis) < 0) axesInvolved.push(s.axis);
        if (s.peakValue > peakAbs) {
          peakAbs = s.peakValue;
          peakYm = s.peakYm;
        }
        if (s.strongEligible) anyStrong = true;
        if (s.runSteps && s.runSteps > maxRun) maxRun = s.runSteps;
      });
      var multiAxis = axesInvolved.length >= 2;
      // importance: compute priority / display order ONLY — NOT good/bad fortune score
      var importance = peakAbs;
      if (multiAxis) importance += c.MULTI_AXIS_BONUS * (axesInvolved.length - 1);
      // strongEligible bonus = compute_priority_only (NOT fortune / good-bad)
      if (anyStrong) importance += c.STRONG_ELIGIBLE_IMPORTANCE_BONUS;
      if (importance > 1) importance = 1;

      var strengthBand = anyStrong ? 'strong' : 'relative_soft';
      var jupiterBoost = false;
      for (var si = m.startIdx; si <= m.endIdx; si++) {
        if (samples[si].jupiterBoostTrigger) jupiterBoost = true;
      }

      var tier = assignTier({
        multiAxis: multiAxis,
        axesInvolved: axesInvolved,
        seeds: m.seeds,
        anyStrong: anyStrong,
        peakAbs: peakAbs,
        maxRun: maxRun,
        jupiterBoost: jupiterBoost,
        strengthBand: strengthBand,
      }, c);

      return {
        id: 'cand_' + samples[m.startIdx].ym + '_' + idx,
        startIdx: m.startIdx,
        endIdx: m.endIdx,
        startYm: samples[m.startIdx].ym,
        endYm: samples[m.endIdx].ym,
        peakYm: peakYm,
        seeds: m.seeds,
        axesInvolved: axesInvolved,
        multiAxis: multiAxis,
        /**
         * importance: compute priority / display order only.
         * NOT a good/bad or fortune quality score.
         */
        importance: Math.round(importance * 1000) / 1000,
        importanceSemantics: 'compute_priority_only',
        strengthBand: strengthBand,
        computeTier: tier,
        jupiterBoost: jupiterBoost,
        discarded: false,
      };
    });
  }

  /**
   * Tier A: multiAxis strength OR strongEligible single-axis strength/sustained.
   * Jupiter never grants A — only up to B (applied after).
   */
  function assignTier(info, c) {
    var strongSeeds = (info.seeds || []).filter(function (s) { return s.strongEligible; });
    var axesAtStrongFloor = {};
    (info.seeds || []).forEach(function (s) {
      if (s.peakValue >= c.FLOOR_STRONG) axesAtStrongFloor[s.axis] = true;
    });
    var strongAxisCount = Object.keys(axesAtStrongFloor).length;

    if (info.multiAxis && strongAxisCount >= 2) return 'A';
    if (info.anyStrong && strongSeeds.length) {
      var best = strongSeeds[0];
      strongSeeds.forEach(function (s) {
        if (s.peakValue > best.peakValue) best = s;
      });
      if (best.peakValue >= c.TIER_A_ABS_SINGLE || (best.runSteps || 1) >= c.TIER_A_RUN_STEPS) {
        return 'A';
      }
    }
    if (info.strengthBand === 'relative_soft' && info.peakAbs < c.FLOOR_RUN_ABS) return 'C';
    if (info.peakAbs >= c.FLOOR_RUN_ABS || info.maxRun >= c.RUN_MIN_STEPS || info.anyStrong) return 'B';
    return 'C';
  }

  function applyJupiterTierCap(candidates) {
    // Jupiter boost may raise C → B, never → A
    candidates.forEach(function (cand) {
      if (!cand.jupiterBoost) return;
      if (cand.computeTier === 'C') cand.computeTier = 'B';
    });
    return candidates;
  }

  function markJupiterTriggers(samples) {
    var c = cfg();
    samples.forEach(function (s) {
      var trig = false;
      (s.hits || []).forEach(function (h) {
        if (h.tk === 'jupiter' && (h.orbOff == null || h.orbOff <= c.JUP_ORB)) trig = true;
      });
      s.jupiterBoostTrigger = trig;
    });
    return samples;
  }

  function fineRangesForCandidate(cand) {
    var c = cfg();
    var ranges = [];
    if (cand.computeTier === 'A') {
      ranges.push({
        fromYm: addMonthsYm(cand.startYm, -c.FINE_A_PAD_MO),
        toYm: addMonthsYm(cand.endYm, c.FINE_A_PAD_MO),
        mode: 'full',
      });
    } else if (cand.computeTier === 'B') {
      ranges.push({
        fromYm: addMonthsYm(cand.peakYm, -c.FINE_B_RADIUS_MO),
        toYm: addMonthsYm(cand.peakYm, c.FINE_B_RADIUS_MO),
        mode: 'peak_radius',
      });
    } else if (!c.FINE_C_SKIP) {
      ranges.push({
        fromYm: addMonthsYm(cand.peakYm, -c.FINE_C_RADIUS_MO),
        toYm: addMonthsYm(cand.peakYm, c.FINE_C_RADIUS_MO),
        mode: 'minimal',
      });
    }
    if (cand.jupiterBoost) {
      ranges.push({
        fromYm: addMonthsYm(cand.peakYm, -c.JUP_PAD_MO),
        toYm: addMonthsYm(cand.peakYm, c.JUP_PAD_MO),
        mode: 'jupiter_pad',
      });
    }
    return ranges;
  }

  function applyFineBudget(candidates) {
    var c = cfg();
    var sorted = candidates.slice().sort(function (a, b) {
      return b.importance - a.importance;
    });
    var used = 0;
    sorted.forEach(function (cand) {
      var ranges = fineRangesForCandidate(cand);
      var cost = 0;
      ranges.forEach(function (r) {
        cost += Math.max(1, monthsBetween(r.fromYm, r.toYm) + 1);
      });
      if (used + cost > c.FINE_BUDGET) {
        if (cand.computeTier === 'C') {
          cand.skipFine = true;
          cand.fineRanges = [];
          return;
        }
        if (cand.computeTier === 'B') {
          cand.fineRanges = [{
            fromYm: addMonthsYm(cand.peakYm, -2),
            toYm: addMonthsYm(cand.peakYm, 2),
            mode: 'budget_shrink',
          }];
          used += 5;
          return;
        }
      }
      cand.skipFine = false;
      cand.fineRanges = ranges;
      used += cost;
    });
    return candidates;
  }

  function buildEpisodes(monthSamples) {
    var c = cfg();
    var bySig = {};
    monthSamples.forEach(function (m, idx) {
      (m.hits || []).forEach(function (h) {
        var sig = h.tk + '|' + h.nk + '|' + h.key;
        if (!bySig[sig]) bySig[sig] = [];
        bySig[sig].push({ idx: idx, m: m, h: h });
      });
    });
    var episodes = [];
    Object.keys(bySig).forEach(function (sig) {
      var rows = bySig[sig].sort(function (a, b) { return a.idx - b.idx; });
      var cur = null;
      rows.forEach(function (r) {
        var rx = !!r.h.retro;
        if (!cur) {
          cur = {
            signature: sig, tk: r.h.tk, nk: r.h.nk, key: r.h.key,
            startIdx: r.idx, endIdx: r.idx, startYm: r.m.ym, endYm: r.m.ym,
            peakYm: r.m.ym, peakOrb: r.h.orbOff != null ? r.h.orbOff : 9,
            contactsApprox: 1, hadRetrograde: rx,
          };
          return;
        }
        if (r.idx - cur.endIdx <= c.EPISODE_GAP_MAX + 1) {
          cur.endIdx = r.idx;
          cur.endYm = r.m.ym;
          cur.contactsApprox++;
          if (rx) cur.hadRetrograde = true;
          if ((r.h.orbOff != null ? r.h.orbOff : 9) < cur.peakOrb) {
            cur.peakOrb = r.h.orbOff;
            cur.peakYm = r.m.ym;
          }
        } else {
          episodes.push(finalizeEp(cur));
          cur = {
            signature: sig, tk: r.h.tk, nk: r.h.nk, key: r.h.key,
            startIdx: r.idx, endIdx: r.idx, startYm: r.m.ym, endYm: r.m.ym,
            peakYm: r.m.ym, peakOrb: r.h.orbOff != null ? r.h.orbOff : 9,
            contactsApprox: 1, hadRetrograde: rx,
          };
        }
      });
      if (cur) episodes.push(finalizeEp(cur));
    });
    return episodes;
  }

  function finalizeEp(cur) {
    var line = (PLANET_KR[cur.tk] || cur.tk) + '–' + (PLANET_KR[cur.nk] || cur.nk) +
      ' ' + (ASPECT_KR[cur.key] || cur.key) + ' 에피소드';
    if (cur.hadRetrograde) line += ' (역행 포함)';
    return {
      id: 'ep_' + cur.signature.replace(/\|/g, '_') + '_' + cur.startYm,
      signature: cur.signature,
      tk: cur.tk, nk: cur.nk, key: cur.key,
      startYm: cur.startYm, endYm: cur.endYm, peakYm: cur.peakYm,
      peakOrb: cur.peakOrb, contactsApprox: cur.contactsApprox,
      hadRetrograde: cur.hadRetrograde, line: line,
      startIdx: cur.startIdx, endIdx: cur.endIdx,
    };
  }

  function classifyState(axesAbs) {
    var o = axesAbs.opportunity || 0;
    var s = axesAbs.stability || 0;
    var p = axesAbs.pressure || 0;
    var ch = axesAbs.change || 0;
    var max = Math.max(o, s, p, ch);
    var intensity = max;
    if (ch >= 0.55 && o >= 0.5) return 'leap';
    if (ch === max && ch >= 0.55 && o < 0.55 && s < 0.55) return 'major_transition';
    if (p === max && p >= 0.45) return 'pressure';
    if (o === max && ch < 0.45 && p < 0.45) return 'expansion';
    if (s === max && ch < 0.4) return 'fruition';
    if (intensity < 0.35 && (s >= o && s >= p)) return 'consolidation';
    if (ch === max) return 'major_transition';
    if (p === max) return 'pressure';
    if (o === max) return 'expansion';
    return 'fruition';
  }

  function cosineAxes(a, b) {
    var dot = 0, na = 0, nb = 0;
    AXES.forEach(function (k) {
      var x = a[k] || 0, y = b[k] || 0;
      dot += x * y; na += x * x; nb += y * y;
    });
    if (na < 1e-8 || nb < 1e-8) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  function compatibleStates(a, b) {
    if (a === b) return true;
    var pairs = [
      ['pressure', 'consolidation'],
      ['leap', 'major_transition'],
    ];
    return pairs.some(function (p) {
      return (p[0] === a && p[1] === b) || (p[1] === a && p[0] === b);
    });
  }

  function buildLifePeriods(months) {
    var c = cfg();
    if (!months.length) return [];
    var segs = [];
    var cur = { state: months[0].state, startIdx: 0, endIdx: 0, months: [months[0]] };
    for (var i = 1; i < months.length; i++) {
      var m = months[i];
      var same = m.state === cur.state || compatibleStates(m.state, cur.state);
      var sim = cosineAxes(m.axesAbs, cur.months[cur.months.length - 1].axesAbs);
      if (same && sim >= c.SEGMENT_SIM) {
        cur.endIdx = i;
        cur.months.push(m);
        if ((m.axesAbs[Object.keys(m.axesAbs).sort(function (a, b) {
          return (m.axesAbs[b] || 0) - (m.axesAbs[a] || 0);
        })[0]] || 0) >= (cur.months[0].axesAbs.pressure || 0)) {
          /* keep */
        }
      } else {
        segs.push(cur);
        cur = { state: m.state, startIdx: i, endIdx: i, months: [m] };
      }
    }
    segs.push(cur);

    return segs.map(function (seg, idx) {
      var peak = seg.months[0];
      seg.months.forEach(function (m) {
        var mi = Math.max(m.axesAbs.opportunity, m.axesAbs.stability, m.axesAbs.pressure, m.axesAbs.change);
        var pi = Math.max(peak.axesAbs.opportunity, peak.axesAbs.stability, peak.axesAbs.pressure, peak.axesAbs.change);
        if (mi > pi) peak = m;
      });
      var state = peak.state;
      var axes = emptyAxes();
      var themes = emptyThemes();
      seg.months.forEach(function (m) {
        AXES.forEach(function (k) { axes[k] += m.axesAbs[k] || 0; });
        ['money', 'career', 'relationship'].forEach(function (k) {
          themes[k] += (m.themesAbs && m.themesAbs[k]) || 0;
        });
      });
      var n = seg.months.length;
      AXES.forEach(function (k) { axes[k] = Math.round((axes[k] / n) * 1000) / 1000; });
      ['money', 'career', 'relationship'].forEach(function (k) {
        themes[k] = Math.round((themes[k] / n) * 1000) / 1000;
      });
      var start = months[seg.startIdx];
      var end = months[seg.endIdx];
      var len = monthsBetween(start.ym, end.ym) + 1;
      return {
        id: 'life_' + start.ym + '_' + state + '_' + idx,
        state: state,
        stateKo: STATE_KO[state] || state,
        startYm: start.ym,
        endYm: end.ym,
        peakYm: peak.ym,
        ageStart: start.ageExact,
        ageEnd: end.ageExact,
        months: len,
        axes: axes,
        themes: themes,
        strengthBand: (Math.max(axes.opportunity, axes.stability, axes.pressure, axes.change) >= cfg().FLOOR_STRONG)
          ? 'strong'
          : 'relative_soft',
        short: len < c.PERIOD_MIN_MONTHS,
      };
    }).filter(function (p) { return !p.short || p.strengthBand === 'strong'; });
  }

  function attachEpisodesToPeriods(periods, episodes) {
    periods.forEach(function (p) {
      var ids = [];
      var lines = [];
      episodes.forEach(function (ep) {
        if (ep.endYm < p.startYm || ep.startYm > p.endYm) return;
        ids.push(ep.id);
        lines.push(ep.line);
      });
      p.episodeIds = ids;
      p.summaryLine = lines[0] || (p.stateKo + ' 구간');
    });
  }

  /**
   * Highlight classes — transit strength alone ≠ same "daeun" type.
   * career_leap: NOT career+pressure alone.
   */
  function buildHighlights(periods, confirmations) {
    var c = cfg();
    var boostMap = {};
    (confirmations || []).forEach(function (cf) {
      boostMap[cf.periodId] = cf.importanceBoost || 1;
    });

    function scoreOpp(p) {
      return (p.axes.opportunity || 0) * (boostMap[p.id] || 1);
    }
    function pick(list, n) {
      return list.slice(0, n).map(function (p) {
        return {
          periodId: p.id,
          ymRange: p.startYm + '~' + p.endYm,
          stateKo: p.stateKo,
          why: p.summaryLine,
          strengthBand: p.strengthBand,
        };
      });
    }

    var strongPeriods = periods.filter(function (p) {
      return p.strengthBand === 'strong' ||
        strongEligible(Math.max(p.axes.opportunity, p.axes.change, p.axes.pressure, p.axes.stability), 0.75, c);
    });

    var opportunity_opening = strongPeriods
      .filter(function (p) {
        return (p.axes.opportunity || 0) >= c.FLOOR_STRONG &&
          (p.state === 'expansion' || p.state === 'leap');
      })
      .sort(function (a, b) { return scoreOpp(b) - scoreOpp(a); });

    var hard_passage = periods
      .filter(function (p) {
        return (p.axes.pressure || 0) >= c.FLOOR_STRONG &&
          (p.axes.opportunity || 0) < c.FLOOR_STRONG;
      })
      .sort(function (a, b) { return (b.axes.pressure || 0) - (a.axes.pressure || 0); });

    var major_change = periods
      .filter(function (p) {
        return (p.axes.change || 0) >= c.FLOOR_STRONG &&
          (p.state === 'major_transition' || p.state === 'leap');
      })
      .sort(function (a, b) { return (b.axes.change || 0) - (a.axes.change || 0); });

    var fruition_window = periods
      .filter(function (p) {
        return (p.axes.stability || 0) >= c.FLOOR_STRONG &&
          (p.state === 'fruition' || p.state === 'consolidation');
      })
      .sort(function (a, b) { return (b.axes.stability || 0) - (a.axes.stability || 0); });

    var money_activation = periods
      .filter(function (p) {
        return (p.themes.money || 0) >= 0.4 &&
          ((p.axes.opportunity || 0) >= c.FLOOR_RUN_ABS || (p.axes.stability || 0) >= c.FLOOR_RUN_ABS);
      })
      .sort(function (a, b) { return (b.themes.money || 0) - (a.themes.money || 0); });

    // career_leap: career + (opportunity OR change+opportunity OR stability rise) — NOT pressure alone
    var career_leap = periods
      .filter(function (p) {
        var career = p.themes.career || 0;
        if (career < 0.4) return false;
        var o = p.axes.opportunity || 0;
        var ch = p.axes.change || 0;
        var s = p.axes.stability || 0;
        var pr = p.axes.pressure || 0;
        if (pr >= c.FLOOR_STRONG && o < c.FLOOR_RUN_ABS && s < c.FLOOR_RUN_ABS) return false;
        return o >= c.FLOOR_STRONG || (ch >= c.FLOOR_STRONG && o >= c.FLOOR_REL_MIN) ||
          (s >= c.FLOOR_STRONG && o >= c.FLOOR_REL_MIN);
      })
      .sort(function (a, b) { return (b.themes.career || 0) - (a.themes.career || 0); });

    var career_pressure = periods
      .filter(function (p) {
        return (p.themes.career || 0) >= 0.4 &&
          (p.axes.pressure || 0) >= c.FLOOR_STRONG &&
          (p.axes.opportunity || 0) < c.FLOOR_STRONG;
      })
      .sort(function (a, b) { return (b.axes.pressure || 0) - (a.axes.pressure || 0); });

    var relationship_activation = periods
      .filter(function (p) {
        return (p.themes.relationship || 0) >= 0.4 &&
          ((p.axes.opportunity || 0) >= c.FLOOR_RUN_ABS || (p.axes.change || 0) >= c.FLOOR_RUN_ABS);
      })
      .sort(function (a, b) { return (b.themes.relationship || 0) - (a.themes.relationship || 0); });

    var high_activity = periods
      .filter(function (p) { return (p.episodeIds || []).length >= 3; })
      .sort(function (a, b) { return (b.episodeIds.length) - (a.episodeIds.length); });

    return {
      strongest_opportunity: pick(opportunity_opening, 5),
      money_activation: pick(money_activation, 5),
      career_leap: pick(career_leap, 5),
      career_pressure: pick(career_pressure, 5),
      relationship_activation: pick(relationship_activation, 5),
      major_turning: pick(major_change, 5),
      caution_passage: pick(hard_passage, 5),
      fruition_window: pick(fruition_window, 5),
      high_activity: pick(high_activity, 5),
    };
  }

  function processCoarseSamples(rawSamples, natalCtx) {
    var c = cfg();
    var samples = rawSamples.map(function (s) {
      var scored = scoreHits(s.hits || [], natalCtx, c);
      return {
        kind: 'coarse',
        ym: s.ym,
        y: s.y,
        mo: s.mo,
        ageExact: s.ageExact,
        hits: s.hits || [],
        axesRaw: scored.axesRaw,
        axesAbs: scored.axesAbs,
        themesRaw: scored.themesRaw,
        jupiterHit: scored.jupiterHit,
      };
    });
    attachPercentiles(samples);
    markJupiterTriggers(samples);
    // also trigger jupiter if opportunity seed would involve jupiter — marked on samples with jupiter hits
    var seeds = buildAxisSeeds(samples);
    var candidates = mergeSeedsToCandidates(seeds, samples);
    applyJupiterTierCap(candidates);
    applyFineBudget(candidates);

    // safeguard: too few strong — leave relative_soft; do not lower FLOOR_STRONG
    return {
      samples: samples,
      seeds: seeds,
      candidates: candidates,
      calib: c,
    };
  }

  function finalizeWithFine(coarseResult, fineSamples, confirmations) {
    var months = (fineSamples || []).map(function (s) {
      var scored = scoreHits(s.hits || [], null, cfg());
      // keep themesAbs from softCap of themesRaw
      var themesAbs = emptyThemes();
      ['money', 'career', 'relationship'].forEach(function (k) {
        themesAbs[k] = softCap((scored.themesRaw[k] || 0), cfg().RAW_SCALE * 1.2);
      });
      return {
        ym: s.ym,
        y: s.y,
        mo: s.mo,
        ageExact: s.ageExact,
        hits: s.hits || [],
        axesAbs: scored.axesAbs,
        themesAbs: themesAbs,
        state: classifyState(scored.axesAbs),
      };
    }).sort(function (a, b) { return a.ym < b.ym ? -1 : a.ym > b.ym ? 1 : 0; });

    // dedupe ym keep last
    var byYm = {};
    months.forEach(function (m) { byYm[m.ym] = m; });
    months = Object.keys(byYm).sort().map(function (k) { return byYm[k]; });

    var episodes = buildEpisodes(months);
    var periods = buildLifePeriods(months);
    attachEpisodesToPeriods(periods, episodes);
    var highlights = buildHighlights(periods, confirmations || []);

    return {
      version: 1,
      periods: periods,
      episodes: episodes,
      highlights: highlights,
      candidates: coarseResult.candidates,
      coarseSamples: coarseResult.samples.length,
      fineSamples: months.length,
      meta: {
        rulerSystem: 'dual_rulers_v1',
        calib: cfg(),
        importanceSemantics: 'compute_priority_only',
      },
    };
  }

  function spPlanForCandidate(cand) {
    if (cand.computeTier === 'A') {
      return { epochs: ['start', 'peak', 'end'], bodies: ['moon', 'sun'] };
    }
    if (cand.computeTier === 'B') {
      return { epochs: ['peak'], bodies: ['moon'] };
    }
    return { epochs: [], bodies: [] };
  }

  function renderHtml(result, nowYm) {
    if (!result || !result.periods) {
      return '<div class="transit-empty">인생 흐름을 계산하지 못했어요.</div>';
    }
    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    var past = [];
    var present = [];
    var future = [];
    result.periods.forEach(function (p) {
      if (p.endYm < nowYm) past.push(p);
      else if (p.startYm > nowYm) future.push(p);
      else present.push(p);
    });

    function listPeriods(arr, title) {
      if (!arr.length) return '<p class="tl-empty-win">' + esc(title) + '에 해당 구간이 적어요.</p>';
      return arr.slice(0, 12).map(function (p) {
        var soft = p.strengthBand === 'relative_soft'
          ? ' <span class="tl-tag">상대적 고점</span>'
          : '';
        return '<div class="tl-win tl-win-state">' +
          '<div class="tl-win-range">' + esc(p.startYm) + ' ~ ' + esc(p.endYm) +
          ' <span class="tl-win-len">(' + esc(p.stateKo) + ')</span>' + soft + '</div>' +
          '<div class="tl-win-hits">' + esc(p.summaryLine) + '</div></div>';
      }).join('');
    }

    function hlBlock(key, label) {
      var arr = (result.highlights && result.highlights[key]) || [];
      if (!arr.length) return '';
      return '<div class="tl-sec"><h4>' + esc(label) + '</h4>' +
        arr.map(function (h) {
          return '<div class="tl-win"><div class="tl-win-range">' + esc(h.ymRange) +
            '</div><div class="tl-win-hits">' + esc(h.why || h.stateKo || '') + '</div></div>';
        }).join('') + '</div>';
    }

    return (
      '<div class="tl-guide">만 20~80세 인생 흐름입니다. 조화각=무조건 좋음이 아니며, ' +
      '<strong>기회·결실·변화·압력·활동</strong>을 서로 다른 종류로 구분합니다. ' +
      '「상대적 고점」은 개인 대비 높은 시기이나 절대 강도가 약한 구간입니다.</div>' +
      '<div class="tl-sec"><h4>현재 흐름</h4>' + listPeriods(present, '현재') + '</div>' +
      '<div class="life-five-link-wrap" style="margin:10px 0 16px">' +
      '<button type="button" class="rt-btn rt-btn--share" id="btnLifeOpenFiveYear">앞으로 5년 자세히 보기</button></div>' +
      '<div class="tl-sec"><h4>과거 변곡점</h4>' + listPeriods(past, '과거') + '</div>' +
      '<div class="tl-sec"><h4>앞으로의 큰 줄기</h4>' + listPeriods(future, '미래') + '</div>' +
      hlBlock('strongest_opportunity', '가장 강한 기회 시기') +
      hlBlock('fruition_window', '성취·결실 가능성') +
      hlBlock('money_activation', '재물 활성 시기') +
      hlBlock('career_leap', '커리어 도약 시기') +
      hlBlock('career_pressure', '커리어 압력·전환') +
      hlBlock('relationship_activation', '연애·관계 활성') +
      hlBlock('major_turning', '중요한 전환점') +
      hlBlock('caution_passage', '신중히 지날 시기') +
      hlBlock('high_activity', '사건이 많은 시기')
    );
  }

  global.AstroLifeTimeline = {
    DEFAULT: DEFAULT,
    setCalib: setCalib,
    resetCalib: resetCalib,
    getConfig: cfg,
    SLOW_KEYS: SLOW_KEYS,
    AXES: AXES,
    buildNatalContext: buildNatalContext,
    scoreHits: scoreHits,
    processCoarseSamples: processCoarseSamples,
    finalizeWithFine: finalizeWithFine,
    fineRangesForCandidate: fineRangesForCandidate,
    spPlanForCandidate: spPlanForCandidate,
    ymLabel: ymLabel,
    addMonthsYm: addMonthsYm,
    renderHtml: renderHtml,
    STATE_KO: STATE_KO,
  };
})(typeof window !== 'undefined' ? window : globalThis);
