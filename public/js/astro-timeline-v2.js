/**
 * 점성학 5년 장기 운 타임라인 v2
 * — Opportunity / Stability / Pressure / Change 4축
 * — money / career / relationship 코어 주제 + health/family/movement/growth 확장(표시·AI)
 * — period/phase/event 타이밍·병합은 코어 테마만 사용 (확장 테마가 날짜를 바꾸지 않음)
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

  var THEME_KR = {
    relationship: '연애·관계',
    career: '일·커리어',
    money: '금전',
    health: '건강·컨디션',
    family: '가족·가정',
    movement: '이동·환경',
    growth: '학습·성장',
    general: '전반',
  };
  var CORE_THEME_KEYS = ['money', 'career', 'relationship'];
  var EXT_THEME_KEYS = ['health', 'family', 'movement', 'growth'];
  var ALL_THEME_KEYS = CORE_THEME_KEYS.concat(EXT_THEME_KEYS);

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
    return {
      money: 0, career: 0, relationship: 0,
      health: 0, family: 0, movement: 0, growth: 0,
    };
  }

  function emptyThemeEvidence() {
    return {
      healthNatal: false,
      healthTransit: false,
      healthProg6: false,
      healthProg1: false,
      healthProg12: false,
      healthAsc: false,
      familyMoon: false,
      familyNatalOther: false,
      familyTransit: false,
      familyProg4: false,
      familyProgAux: false,
      movementNatal: false,
      movementUranus: false,
      movementTransitOther: false,
      movementProg39: false,
      movementProg4: false,
      growthNatal: false,
      growthTransit: false,
      growthProg: false,
    };
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
    CORE_THEME_KEYS.forEach(function (k) {
      max = Math.max(max, (raw && raw[k]) || 0);
    });
    return {
      money: Math.round(clamp01(((raw && raw.money) || 0) / max) * 1000) / 1000,
      career: Math.round(clamp01(((raw && raw.career) || 0) / max) * 1000) / 1000,
      relationship: Math.round(clamp01(((raw && raw.relationship) || 0) / max) * 1000) / 1000,
    };
  }

  function orbFactor(orbOff, tk) {
    var base = tk === 'jupiter' ? 6 : 5;
    return 1 + Math.max(0, (base - (orbOff || 0)) * 0.08);
  }

  /** 코어 3 가산식은 고정. 확장 4는 hit된 nk/tk에만 가산. */
  function themeWeightsForHit(tk, nk) {
    var t = emptyThemes();
    // —— 코어 (변경 금지) ——
    if (nk === 'venus' || nk === 'moon' || nk === 'mars') t.relationship += 1.2;
    if (nk === 'sun' || nk === 'mc' || nk === 'saturn' || nk === 'mars' || nk === 'mercury') t.career += 1.2;
    if (nk === 'venus' || nk === 'jupiter' || nk === 'pluto' || nk === 'saturn' || nk === 'fortune') t.money += 1.2;
    if (tk === 'saturn' || tk === 'uranus') t.career += 0.6;
    if (tk === 'jupiter' || tk === 'pluto' || tk === 'saturn') t.money += 0.5;
    if (tk === 'neptune') t.relationship += 0.4;
    // —— 확장 natal ——
    if (nk === 'asc') t.health += 1.0;
    if (nk === 'mars') {
      t.health += 0.8;
      t.movement += 0.45;
    }
    if (nk === 'moon') {
      t.health += 0.55;
      t.family += 1.0;
      t.movement += 0.35;
    }
    if (nk === 'sun') {
      t.health += 0.45;
      t.growth += 0.55;
    }
    if (nk === 'saturn') t.family += 0.65;
    if (nk === 'venus') t.family += 0.30;
    if (nk === 'mercury') {
      t.movement += 0.75;
      t.growth += 0.85;
    }
    if (nk === 'jupiter') t.growth += 0.30;
    // —— 확장 transit ——
    if (tk === 'saturn') {
      t.health += 0.40;
      t.family += 0.35;
      t.growth += 0.25;
    }
    if (tk === 'neptune') {
      t.health += 0.30;
      t.family += 0.20;
    }
    if (tk === 'pluto') t.health += 0.30;
    if (tk === 'uranus') {
      t.movement += 0.70;
      t.growth += 0.20;
    }
    if (tk === 'jupiter') {
      t.family += 0.25;
      t.movement += 0.30;
      t.growth += 0.45;
    }
    return t;
  }

  function markThemeEvidence(ev, tk, nk) {
    if (!ev) return;
    if (nk === 'asc' || nk === 'mars' || nk === 'moon' || nk === 'sun') ev.healthNatal = true;
    if (nk === 'asc') ev.healthAsc = true;
    if (tk === 'saturn' || tk === 'neptune' || tk === 'pluto') ev.healthTransit = true;
    if (nk === 'moon') ev.familyMoon = true;
    if (nk === 'saturn' || nk === 'venus') ev.familyNatalOther = true;
    if (tk === 'saturn' || tk === 'jupiter' || tk === 'neptune') ev.familyTransit = true;
    if (nk === 'mercury' || nk === 'mars' || nk === 'moon') ev.movementNatal = true;
    if (tk === 'uranus') ev.movementUranus = true;
    if (tk === 'jupiter') ev.movementTransitOther = true;
    if (nk === 'mercury' || nk === 'sun' || nk === 'jupiter') ev.growthNatal = true;
    if (tk === 'jupiter' || tk === 'saturn' || tk === 'uranus') ev.growthTransit = true;
  }

  function gateHealth(ev) {
    if (!ev) return false;
    var axis = !!(ev.healthAsc || ev.healthProg1 || ev.healthProg6);
    var kinds = 0;
    if (ev.healthNatal) kinds += 1;
    if (ev.healthTransit) kinds += 1;
    if (ev.healthProg6 || ev.healthProg1) kinds += 1;
    if (ev.healthProg12) kinds += 1;
    // 본선: ASC/1/6 + 다른 근거
    if (axis && kinds >= 2) return true;
    // 예외: ASC/1/6 없어도 natal+transit+추가(종류≥3). 단독 외행성·단독 12H 금지
    if (!axis && ev.healthNatal && ev.healthTransit && kinds >= 3) return true;
    return false;
  }

  function gateFamily(ev) {
    if (!ev) return false;
    if (!(ev.familyMoon || ev.familyProg4)) return false;
    var kinds = 0;
    if (ev.familyMoon) kinds += 1;
    if (ev.familyProg4) kinds += 1;
    if (ev.familyNatalOther) kinds += 1;
    if (ev.familyTransit) kinds += 1;
    if (ev.familyProgAux) kinds += 1;
    return kinds >= 2;
  }

  function gateMovement(ev) {
    if (!ev) return false;
    if (!(ev.movementUranus || ev.movementProg39)) return false;
    var kinds = 0;
    if (ev.movementUranus) kinds += 1;
    if (ev.movementProg39) kinds += 1;
    if (ev.movementNatal) kinds += 1;
    if (ev.movementTransitOther) kinds += 1;
    if (ev.movementProg4) kinds += 1;
    return kinds >= 2;
  }

  function gateGrowth(ev) {
    if (!ev) return false;
    // natal(수성·태양·목성 nk) 필수 + (transit 또는 prog) — 목성 tk 단독 금지
    if (!ev.growthNatal) return false;
    if (!(ev.growthTransit || ev.growthProg)) return false;
    return true;
  }

  function evalThemeGates(ev) {
    return {
      health: gateHealth(ev),
      family: gateFamily(ev),
      movement: gateMovement(ev),
      growth: gateGrowth(ev),
    };
  }

  function mergeThemeEvidence(a, b) {
    var o = emptyThemeEvidence();
    if (!a && !b) return o;
    Object.keys(o).forEach(function (k) {
      o[k] = !!(a && a[k]) || !!(b && b[k]);
    });
    return o;
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
    var themeEv = emptyThemeEvidence();
    var top = [];
    var uranusPluto = 0;
    var hits = sample.hits || [];

    hits.forEach(function (h) {
      var vec = contribForHit(h);
      addAxes(rawAxes, vec, 1);
      var tw = themeWeightsForHit(h.tk, h.nk);
      markThemeEvidence(themeEv, h.tk, h.nk);
      ALL_THEME_KEYS.forEach(function (k) {
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
        // —— 코어 prog (변경 금지) ——
        if ([2, 8].indexOf(hnum) >= 0) rawThemes.money += 0.8;
        if ([10, 6, 2].indexOf(hnum) >= 0) rawThemes.career += 0.8;
        if ([5, 7, 8, 4].indexOf(hnum) >= 0) rawThemes.relationship += 0.8;
        // —— 확장 prog ——
        if (hnum === 6) {
          rawThemes.health += 0.90;
          themeEv.healthProg6 = true;
        }
        if (hnum === 1) {
          rawThemes.health += 0.55;
          themeEv.healthProg1 = true;
        }
        if (hnum === 12) {
          rawThemes.health += 0.30;
          themeEv.healthProg12 = true;
        }
        if (hnum === 4) {
          rawThemes.family += 0.90;
          themeEv.familyProg4 = true;
        }
        // family 3/10: 코어(family moon|다른 natal|transit|prog4) 있을 때만
        if ((hnum === 3 || hnum === 10) &&
            (themeEv.familyMoon || themeEv.familyNatalOther || themeEv.familyTransit || themeEv.familyProg4)) {
          rawThemes.family += 0.25;
          themeEv.familyProgAux = true;
        }
        if (hnum === 3 || hnum === 9) {
          rawThemes.movement += 0.80;
          themeEv.movementProg39 = true;
          rawThemes.growth += 0.55;
          themeEv.growthProg = true;
        }
        if (hnum === 11) {
          rawThemes.growth += 0.25;
          themeEv.growthProg = true;
        }
        // movement prog4: movement 코어(uranus|prog3/9) 있을 때만
        if (hnum === 4 && (themeEv.movementUranus || themeEv.movementProg39)) {
          rawThemes.movement += 0.30;
          themeEv.movementProg4 = true;
        }
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
        markThemeEvidence(themeEv, 'moon', a.nk);
        ALL_THEME_KEYS.forEach(function (k) {
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
    var rawThemesSnap = emptyThemes();
    ALL_THEME_KEYS.forEach(function (k) {
      rawThemesSnap[k] = Math.round((rawThemes[k] || 0) * 1000) / 1000;
    });
    var axes = normalizeAxes(rawAxes);
    var themes = normalizeThemes(rawThemes);
    var state = classifyState(axes, { uranusPluto: uranusPluto });
    var themeGate = evalThemeGates(themeEv);

    return {
      y: sample.y,
      mo: sample.mo,
      ym: sample.ym || ymLabel(sample.y, sample.mo),
      axes: axes,
      rawAxes: rawAxesSnap,
      themes: themes,
      rawThemes: rawThemesSnap,
      themeEvidence: themeEv,
      themeGate: themeGate,
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
        if (EXT_THEME_KEYS.indexOf(theme) >= 0) {
          if (!(m.themeGate && m.themeGate[theme])) return -Infinity;
          if (((m.themeStars && m.themeStars[theme]) || 0) < 4) return -Infinity;
        }
        return (m.rawThemes && m.rawThemes[theme]) || 0;
      });
      if (idx < 0) return null;
      var m = months[idx];
      if (EXT_THEME_KEYS.indexOf(theme) >= 0 && !(m.themeGate && m.themeGate[theme])) return null;
      if (((m.rawThemes && m.rawThemes[theme]) || 0) <= 0) return null;
      if (EXT_THEME_KEYS.indexOf(theme) >= 0 && ((m.themeStars && m.themeStars[theme]) || 0) < 4) return null;
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
        health: themePeak('health'),
        family: themePeak('family'),
        movement: themePeak('movement'),
        growth: themePeak('growth'),
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

  function monthHitProfile(m) {
    var hits = (m.topHits && m.topHits.length)
      ? m.topHits.slice(0, 5)
      : (m.hits || []).slice(0, 5);
    var fullKeys = [];
    var pairKeys = [];
    var transitBodies = [];
    var natalPoints = [];
    var lines = [];
    hits.forEach(function (h) {
      if (!h) return;
      var tk = h.tk || '';
      var nk = h.nk || '';
      var key = h.key || '';
      if (tk && nk && key) fullKeys.push(tk + '|' + nk + '|' + key);
      if (tk && nk) pairKeys.push(tk + '|' + nk);
      if (tk && transitBodies.indexOf(tk) < 0) transitBodies.push(tk);
      if (nk && natalPoints.indexOf(nk) < 0) natalPoints.push(nk);
      if (h.line) lines.push(h.line);
    });
    return {
      fullKeys: fullKeys,
      pairKeys: pairKeys,
      transitBodies: transitBodies,
      natalPoints: natalPoints,
      lines: lines,
    };
  }

  function monthThemeRank(m) {
    var raw = m.rawThemes || emptyThemes();
    return ['career', 'money', 'relationship']
      .map(function (k) {
        return { k: k, raw: raw[k] || 0, stars: (m.themeStars && m.themeStars[k]) || 0 };
      })
      .sort(function (a, b) { return b.raw - a.raw; });
  }

  function setIntersectCount(a, b) {
    var n = 0;
    for (var i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) >= 0) n += 1;
    }
    return n;
  }

  function isSalientJudgmentMonth(m) {
    var j = m.judgment;
    var s = m.stars || {};
    if (!j) return false;
    if (j.primary && j.primary !== 'quiet') return true;
    if (j.signals && (j.signals.opportunity || j.signals.load || j.signals.change)) return true;
    if ((s.opportunity || 0) >= 4 || (s.pressure || 0) >= 4 || (s.change || 0) >= 4) return true;
    return false;
  }

  /**
   * 연속 월 묶기(1차): topHits 반복 + 주요 트랜짓/네이탈 겹침 + 주제 연속.
   * kind/점수 유사만으로는 묶지 않음. 과도하게 엄격하지 않게 OR·완화 조건 포함.
   */
  function monthsFlowCompatible(a, b) {
    // primary / 부담 ON·OFF / 기회 ON·OFF 단독으로는 절단하지 않음.
    // 절단은 topHits·트랜짓/네이탈·주제 연속성이 깨질 때만.
    var pa = monthHitProfile(a);
    var pb = monthHitProfile(b);
    var sharedFull = setIntersectCount(pa.fullKeys, pb.fullKeys);
    var sharedPair = setIntersectCount(pa.pairKeys, pb.pairKeys);
    var sharedTransit = setIntersectCount(pa.transitBodies, pb.transitBodies);
    var sharedNatal = setIntersectCount(pa.natalPoints, pb.natalPoints);
    var ta = monthThemeRank(a);
    var tb = monthThemeRank(b);
    var topA = ta.slice(0, 2).map(function (x) { return x.k; });
    var topB = tb.slice(0, 2).map(function (x) { return x.k; });
    var themeOverlap = setIntersectCount(topA, topB);
    var sameTopTheme = ta[0] && tb[0] && ta[0].k === tb[0].k;

    var hitOk = sharedFull >= 1 || sharedPair >= 2;
    var bodyOk = sharedTransit >= 1;
    var natalOk = sharedNatal >= 1;
    var themeOk = sameTopTheme || themeOverlap >= 1;

    var support = (bodyOk ? 1 : 0) + (natalOk ? 1 : 0) + (themeOk ? 1 : 0);
    if (hitOk && support >= 2) {
      return {
        ok: true,
        sharedFull: sharedFull,
        sharedPair: sharedPair,
        sharedTransit: sharedTransit,
        sharedNatal: sharedNatal,
        themeOk: themeOk,
        sameTopTheme: sameTopTheme,
        reason:
          'topHits공유(full ' + sharedFull + '/pair ' + sharedPair + ')' +
          ', 트랜짓바디 ' + sharedTransit +
          ', 네이탈 ' + sharedNatal +
          ', 주제연속 ' + (themeOk ? 'Y' : 'N'),
      };
    }
    if (sharedFull >= 2 && themeOk) {
      return {
        ok: true,
        sharedFull: sharedFull,
        sharedPair: sharedPair,
        sharedTransit: sharedTransit,
        sharedNatal: sharedNatal,
        themeOk: themeOk,
        sameTopTheme: sameTopTheme,
        reason: '강한 topHits 반복(full≥2) + 주제 연속',
      };
    }
    return {
      ok: false,
      sharedFull: sharedFull,
      sharedPair: sharedPair,
      sharedTransit: sharedTransit,
      sharedNatal: sharedNatal,
      themeOk: themeOk,
      reason: '주요 트랜짓/네이탈/주제 연속성 부족으로 분리',
    };
  }

  function monthPhaseKey(m) {
    var sig = (m.judgment && m.judgment.signals) || {};
    if (sig.stableUtilize) return 'stableUtilize';
    if (sig.utilizeInChange || (sig.opportunity && !sig.load && sig.change)) return 'selectiveUtilize';
    if (sig.opportunity && !sig.load && !sig.change) return 'openUtilize';
    if (sig.opportunity && sig.load && sig.change) return 'complexExpand';
    if (sig.opportunity && sig.load) return 'oppWithLoad';
    if (!sig.opportunity && sig.load && sig.change) return 'cautionChange';
    if (!sig.opportunity && sig.load) return 'caution';
    if (!sig.opportunity && sig.change) return 'transition';
    if (sig.opportunity) return 'opportunity';
    return 'other';
  }

  /** 사용자/상담사용 국면 라벨. key(알고리즘)는 그대로, 표시 문구만 자연어. */
  var PHASE_META = {
    stableUtilize: { title: '안정적 실행', note: '부담·변화가 크지 않아 움직이기 쉬운 때' },
    selectiveUtilize: { title: '선택적 실행', note: '기회는 있으나 변화가 있어 골라 움직일 때' },
    openUtilize: { title: '시도 검토', note: '기회를 검토해 볼 수 있는 때' },
    complexExpand: { title: '확장과 부담', note: '기회가 열리지만 부담·변수도 함께 커지는 때' },
    oppWithLoad: { title: '기회와 부담', note: '성과 가능성과 부담이 같이 있는 때' },
    cautionChange: { title: '주의가 필요한 변화', note: '부담과 변화가 앞서 신중이 필요한 때' },
    caution: { title: '주의', note: '부담이 앞서는 때' },
    transition: { title: '전환', note: '방향이 바뀌거나 재편되는 때' },
    opportunity: { title: '기회', note: '기회 신호가 있는 때' },
    other: { title: '안정', note: '강한 신호는 약하지만 흐름 안에 포함된 때' },
  };

  /**
   * 'other' 국면 표시명만 보정(알고리즘 key는 other 유지).
   * 고정어 '기타' 금지 → 구간 내 primary / state / theme·축 성격으로 선택.
   * 후보: 재편 · 조정 · 전환 준비 · 안정 · 활성화
   */
  function resolveSoftPhaseLabel(months, startIdx, endIdx, key) {
    var meta = PHASE_META[key] || PHASE_META.other;
    if (key !== 'other') return { title: meta.title, note: meta.note };

    var primaryCounts = {};
    var stateCounts = {};
    var i;
    for (i = startIdx; i <= endIdx; i++) {
      var m = months[i] || {};
      var pri = (m.judgment && m.judgment.primary) || 'quiet';
      var st = m.state || 'stability';
      primaryCounts[pri] = (primaryCounts[pri] || 0) + 1;
      stateCounts[st] = (stateCounts[st] || 0) + 1;
    }
    function topCounted(map) {
      var best = null;
      var bestV = -1;
      Object.keys(map).forEach(function (k) {
        if (map[k] > bestV) {
          bestV = map[k];
          best = k;
        }
      });
      return best;
    }
    var primary = topCounted(primaryCounts);
    var state = topCounted(stateCounts);
    var themes = aggregatePeriodThemes(months, startIdx, endIdx);
    var topTheme = themes[0] && themes[0].avgRaw > 0 ? themes[0].ko : '';
    var themeHint = topTheme ? ' · ' + topTheme + ' 쪽' : '';

    var byPrimary = {
      bigChange: { title: '재편', note: '전환·재편 성격이 있는 때' + themeHint },
      cautionChange: { title: '전환 준비', note: '변화가 앞설 수 있어 준비·조율이 필요한 때' + themeHint },
      caution: { title: '조정', note: '부담을 보며 속도를 조절할 때' + themeHint },
      opportunityWithLoad: { title: '활성화', note: '기회와 부담이 함께 살아나는 때' + themeHint },
      utilizeInChange: { title: '활성화', note: '기회와 변화가 함께 있는 때' + themeHint },
      stableUtilize: { title: '안정', note: '비교적 움직이기 수월한 때' + themeHint },
    };
    if (primary && primary !== 'quiet' && byPrimary[primary]) {
      return byPrimary[primary];
    }

    var byState = {
      leap: { title: '재편', note: '도약·재편 기운이 있는 때' + themeHint },
      transition: { title: '전환 준비', note: '방향이 바뀌기 전·중의 때' + themeHint },
      expansion: { title: '활성화', note: '확장·활성 기운이 있는 때' + themeHint },
      pressure: { title: '조정', note: '부담을 보며 조율할 때' + themeHint },
      stability: { title: '안정', note: '정비·안정 쪽에 가까운 때' + themeHint },
    };
    if (state && byState[state]) return byState[state];

    var avg = (aggregatePeriodStars(months, startIdx, endIdx) || {}).avg || {};
    var best = 'stability';
    var bestV = -1;
    AXES.forEach(function (k) {
      var v = avg[k] || 0;
      if (v > bestV) {
        bestV = v;
        best = k;
      }
    });
    if (best === 'opportunity') {
      return { title: '활성화', note: '기회 축이 상대적으로 앞서는 때' + themeHint };
    }
    if (best === 'pressure') {
      return { title: '조정', note: '부담 축이 상대적으로 앞서는 때' + themeHint };
    }
    if (best === 'change') {
      return { title: '전환 준비', note: '변화 축이 상대적으로 앞서는 때' + themeHint };
    }
    return { title: '안정', note: '강한 신호는 약하지만 흐름 안에 포함된 때' + themeHint };
  }

  /**
   * period 내부 phase. 별도 카드가 아니라 한 흐름 안의 국면 변화.
   * 성격이 한 가지뿐이면 빈 배열(굳이 phase 표기 안 함).
   */
  function buildPeriodPhases(months, startIdx, endIdx) {
    if (endIdx <= startIdx) return [];
    var blocks = [];
    var bStart = startIdx;
    var key = monthPhaseKey(months[startIdx]);
    var i;
    for (i = startIdx + 1; i <= endIdx; i++) {
      var k = monthPhaseKey(months[i]);
      if (k === key) continue;
      blocks.push({ startIdx: bStart, endIdx: i - 1, key: key });
      bStart = i;
      key = k;
    }
    blocks.push({ startIdx: bStart, endIdx: endIdx, key: key });
    if (blocks.length <= 1) return [];

    return blocks.map(function (b) {
      var soft = resolveSoftPhaseLabel(months, b.startIdx, b.endIdx, b.key);
      var range = ymRangeLabel({
        startYm: months[b.startIdx].ym,
        endYm: months[b.endIdx].ym,
      });
      var th = aggregatePeriodThemes(months, b.startIdx, b.endIdx);
      var topTheme = th[0] ? th[0].ko : '';
      return {
        range: range,
        startYm: months[b.startIdx].ym,
        endYm: months[b.endIdx].ym,
        months: b.endIdx - b.startIdx + 1,
        key: b.key,
        title: soft.title,
        note: topTheme ? '주제 무게: ' + topTheme : soft.note,
      };
    });
  }

  function buildPeriodTitle(themes, axisFlags, phases) {
    var topTheme = themes[0] ? themes[0].ko : '전반';
    if (phases && phases.length >= 2) {
      var a = phases[0].title || '';
      var b = phases[phases.length - 1].title || '';
      if (a && b && a === b) {
        return topTheme + ' 흐름 · ' + a + ' 지속';
      }
      return topTheme + ' 흐름 · ' + a + ' → ' + b;
    }
    if (axisFlags.utilizeInChange || (axisFlags.opportunity && axisFlags.change && !axisFlags.load)) {
      return topTheme + ' · 선택적 활용 시기';
    }
    if (axisFlags.opportunity && axisFlags.load && axisFlags.change) {
      return topTheme + ' · 기회·부담·변화가 겹치는 시기';
    }
    if (!axisFlags.opportunity && (axisFlags.load || axisFlags.change)) {
      return topTheme + ' · 주의·전환 시기';
    }
    if (axisFlags.opportunity) return topTheme + ' · 기회 시기';
    return topTheme + ' · 주목 시기';
  }

  function aggregatePeriodEvidence(months, startIdx, endIdx) {
    var freq = {};
    var i;
    for (i = startIdx; i <= endIdx; i++) {
      (months[i].topHits || []).slice(0, 5).forEach(function (h) {
        if (!h || !h.line) return;
        var k = h.tk + '|' + h.nk + '|' + h.key;
        if (!freq[k]) {
          freq[k] = { key: k, line: h.line, tk: h.tk, nk: h.nk, aspect: h.key, count: 0, weight: 0 };
        }
        freq[k].count += 1;
        freq[k].weight += (h.w || 1);
      });
    }
    return Object.keys(freq)
      .map(function (k) { return freq[k]; })
      .sort(function (a, b) { return b.count - a.count || b.weight - a.weight; })
      .slice(0, 8);
  }

  function aggregatePeriodThemes(months, startIdx, endIdx) {
    var sum = emptyThemes();
    var n = Math.max(1, endIdx - startIdx + 1);
    var i;
    for (i = startIdx; i <= endIdx; i++) {
      var raw = months[i].rawThemes || emptyThemes();
      sum.career += raw.career || 0;
      sum.money += raw.money || 0;
      sum.relationship += raw.relationship || 0;
    }
    return CORE_THEME_KEYS
      .map(function (k) {
        return {
          k: k,
          ko: THEME_KR[k] || k,
          avgRaw: Math.round((sum[k] / n) * 1000) / 1000,
          core: true,
        };
      })
      .sort(function (a, b) { return b.avgRaw - a.avgRaw; });
  }

  /** 표시·제목·AI용. 확장 테마는 게이트 + 상대 세기(theme★≥4 월 또는 코어 대비)일 때만. */
  function aggregatePeriodThemesDisplay(months, startIdx, endIdx) {
    var core = aggregatePeriodThemes(months, startIdx, endIdx);
    var n = Math.max(1, endIdx - startIdx + 1);
    var sum = emptyThemes();
    var ev = emptyThemeEvidence();
    var strongCount = { health: 0, family: 0, movement: 0, growth: 0 };
    var i;
    for (i = startIdx; i <= endIdx; i++) {
      var raw = months[i].rawThemes || emptyThemes();
      var gate = months[i].themeGate || {};
      var stars = months[i].themeStars || {};
      EXT_THEME_KEYS.forEach(function (k) {
        sum[k] += raw[k] || 0;
        if (gate[k] && (stars[k] || 0) >= 4) strongCount[k] += 1;
      });
      ev = mergeThemeEvidence(ev, months[i].themeEvidence);
    }
    var gates = evalThemeGates(ev);
    var topCore = core[0] ? core[0].avgRaw : 0;
    var coreSecond = core[1] ? core[1].avgRaw : 0;
    var ext = EXT_THEME_KEYS.map(function (k) {
      return {
        k: k,
        ko: THEME_KR[k] || k,
        avgRaw: Math.round((sum[k] / n) * 1000) / 1000,
        core: false,
        gated: !!gates[k],
        strongMonths: strongCount[k] || 0,
      };
    }).filter(function (t) {
      if (!t.gated || t.avgRaw <= 0) return false;
      // 강한 월이 있거나, 코어 1~2위와 견줄 만큼 커야 제목/테마 목록에 포함
      if (t.strongMonths >= 1) return true;
      if (topCore > 0 && t.avgRaw >= topCore * 0.85) return true;
      if (coreSecond > 0 && t.avgRaw >= coreSecond * 0.95 && t.avgRaw >= 0.5) return true;
      return false;
    }).sort(function (a, b) { return b.avgRaw - a.avgRaw; }).slice(0, 2);
    return core.concat(ext).sort(function (a, b) { return b.avgRaw - a.avgRaw; }).slice(0, 4);
  }

  function aggregatePeriodStars(months, startIdx, endIdx) {
    var sum = emptyAxes();
    var max = emptyAxes();
    var n = Math.max(1, endIdx - startIdx + 1);
    var i;
    for (i = startIdx; i <= endIdx; i++) {
      var s = months[i].stars || emptyAxes();
      AXES.forEach(function (k) {
        sum[k] += s[k] || 0;
        if ((s[k] || 0) > (max[k] || 0)) max[k] = s[k] || 0;
      });
    }
    var avg = {};
    AXES.forEach(function (k) {
      avg[k] = Math.round((sum[k] / n) * 10) / 10;
    });
    return { avg: avg, max: max };
  }

  function periodAxisFlags(months, startIdx, endIdx) {
    var anyOpp = false;
    var anyLoad = false;
    var anyChange = false;
    var anyStableUtil = false;
    var anyUtilizeChange = false;
    var i;
    for (i = startIdx; i <= endIdx; i++) {
      var sig = (months[i].judgment && months[i].judgment.signals) || {};
      if (sig.opportunity) anyOpp = true;
      if (sig.load) anyLoad = true;
      if (sig.change) anyChange = true;
      if (sig.stableUtilize) anyStableUtil = true;
      if (sig.utilizeInChange) anyUtilizeChange = true;
    }
    return {
      opportunity: anyOpp,
      load: anyLoad,
      change: anyChange,
      stableUtilize: anyStableUtil,
      utilizeInChange: anyUtilizeChange,
    };
  }

  function phaseThemeFromNote(note) {
    if (!note) return '';
    var m = String(note).match(/주제 무게:\s*(.+)$/);
    return m ? m[1].trim() : '';
  }

  function dominantPhase(phases) {
    if (!phases || !phases.length) return null;
    var best = phases[0];
    var i;
    for (i = 1; i < phases.length; i++) {
      if ((phases[i].months || 0) > (best.months || 0)) best = phases[i];
    }
    return best;
  }

  /**
   * meaning/howToUse: 계산 결과(themes·phases·axis)만으로 문장 차별화.
   * 새 판정·새 운 종류를 만들지 않음.
   */
  function buildPeriodMeaning(themes, starsAgg, axisFlags, evidence, phases) {
    var top = themes && themes[0];
    var second = themes && themes[1];
    var topTheme = top ? top.ko : '전반';
    var themeBit;
    if (second && second.avgRaw > 0 && top && top.avgRaw > 0 && (second.avgRaw / top.avgRaw) >= 0.55) {
      themeBit = topTheme + ' 쪽이 중심이고 ' + second.ko + ' 쪽도 함께 움직입니다';
    } else {
      themeBit = topTheme + ' 쪽이 중심인 흐름입니다';
    }

    var meaning;
    var firstKey = '';
    var lastKey = '';
    if (phases && phases.length >= 2) {
      var first = phases[0];
      var last = phases[phases.length - 1];
      firstKey = first.key || '';
      lastKey = last.key || '';
      var dom = dominantPhase(phases);
      var firstTh = phaseThemeFromNote(first.note);
      var lastTh = phaseThemeFromNote(last.note);
      var themeShift = '';
      if (firstTh && lastTh && firstTh !== lastTh) {
        themeShift = ' 후반 무게는 ' + firstTh + '에서 ' + lastTh + ' 쪽으로 옮아갑니다.';
      }
      var arc;
      if (first.title && last.title && first.title === last.title) {
        if (dom && dom.title && dom.title !== first.title && (dom.months || 0) >= 2) {
          arc = '대체로 ' + first.title + ' 기운이되, 중간에 ' + dom.title + '이 끼어듭니다.';
        } else {
          arc = first.title + ' 기운이 이어지는 구간입니다.';
        }
      } else if ((phases.length >= 4) && firstKey !== lastKey) {
        arc = '초반 ' + first.title + ' → 후반 ' + last.title +
          '. 그 사이에서 국면이 여러 번 바뀌는 ' + phases.length + '단 흐름입니다.';
      } else {
        arc = '초반 ' + (first.title || '') + '에서 후반 ' + (last.title || '') + ' 쪽으로 기운이 바뀝니다.';
      }
      meaning = themeBit + '. ' + arc + themeShift;
    } else {
      var axisPhrase = '';
      if (axisFlags.opportunity && axisFlags.load && axisFlags.change) {
        axisPhrase = '기회·부담·변화가 함께 큰 복합 흐름';
      } else if (axisFlags.opportunity && axisFlags.change && !axisFlags.load) {
        axisPhrase = '기회는 있으나 변화가 큰, 선택적 실행 흐름';
      } else if (axisFlags.opportunity && !axisFlags.load && !axisFlags.change) {
        axisPhrase = '부담·변화가 상대적으로 낮아 시도를 검토할 수 있는 흐름';
      } else if (axisFlags.opportunity && axisFlags.load && !axisFlags.change) {
        axisPhrase = '기회와 부담이 함께 있는 흐름';
      } else if (!axisFlags.opportunity && axisFlags.load && axisFlags.change) {
        axisPhrase = '주의가 필요한 변화·부담 흐름';
      } else if (!axisFlags.opportunity && axisFlags.load) {
        axisPhrase = '부담이 앞서는 주의 흐름';
      } else if (!axisFlags.opportunity && axisFlags.change) {
        axisPhrase = '전환·재편 성격이 큰 흐름';
      } else {
        axisPhrase = '두드러진 신호가 있는 흐름';
      }
      meaning = themeBit + '. ' + axisPhrase + '입니다.';
    }

    var howToUse;
    if (lastKey === 'caution' || lastKey === 'cautionChange') {
      howToUse = topTheme + ' 관련 결정·계약은 후반으로 갈수록 속도를 낮추는 편이 낫습니다.';
    } else if (lastKey === 'complexExpand' || lastKey === 'oppWithLoad') {
      if (firstKey === 'caution' || firstKey === 'cautionChange' || firstKey === 'transition') {
        howToUse = '초반의 신중함을 유지한 채, ' + topTheme + '에서 감당 가능한 확장만 고르세요.';
      } else {
        howToUse = topTheme + '에서 기회와 부담을 같이 보고, 한 번에 키우기보다 나눠 실행하세요.';
      }
    } else if (lastKey === 'selectiveUtilize' || lastKey === 'openUtilize' || lastKey === 'opportunity') {
      howToUse = topTheme + '에서 시도할 여지는 있으나, 과신 없이 선택적으로 움직이세요.';
    } else if (lastKey === 'stableUtilize') {
      howToUse = topTheme + '에서 실행·조율하기 비교적 수월한 편입니다. 다만 과신은 금물입니다.';
    } else if (lastKey === 'transition' || lastKey === 'other') {
      howToUse = '방향을 단정하기보다 ' + topTheme + ' 쪽 재편·조율에 에너지를 두세요.';
    } else if (axisFlags.opportunity && axisFlags.load && axisFlags.change) {
      howToUse = topTheme + '에서 기회와 부담을 같이 보고, 감당 가능한 범위만 선택적으로 실행하세요.';
    } else if (axisFlags.load) {
      howToUse = '결정·계약·갈등을 평소보다 신중히 보고, 무리한 확장은 미루는 편이 낫습니다.';
    } else if (axisFlags.opportunity) {
      howToUse = topTheme + '에서 시도·제안·조율을 검토해 볼 만합니다. 다만 과신은 금물입니다.';
    } else {
      howToUse = '급히 단정하기보다 흐름의 방향이 선명해지는지 관찰하세요.';
    }

    var labels = [];
    if (axisFlags.stableUtilize) labels.push('utilize-leaning');
    if (axisFlags.utilizeInChange) labels.push('utilize-in-change');
    if (axisFlags.opportunity && axisFlags.load && axisFlags.change) labels.push('high-intensity-complex');
    else if (axisFlags.opportunity && axisFlags.load) labels.push('opportunity-with-load');
    if (!axisFlags.opportunity && (axisFlags.load || axisFlags.change)) labels.push('caution-or-transition');
    if (themes[0]) labels.push('theme-' + themes[0].k);
    return { meaning: meaning, howToUse: howToUse, labels: labels };
  }

  /** 직전 period와 주제/국면 차이를 문장으로만 보강(구조·점수 불변). */
  function enrichPeriodsNarrative(periods) {
    if (!periods || !periods.length) return periods;
    var i;
    for (i = 0; i < periods.length; i++) {
      var p = periods[i];
      var prev = i > 0 ? periods[i - 1] : null;
      var curTheme = p.themes && p.themes[0] ? p.themes[0].ko : '';
      if (!prev) {
        p.compareNote = '이 구간부터 주요 챕터가 열립니다' + (curTheme ? ' (중심: ' + curTheme + ')' : '') + '.';
        continue;
      }
      var prevTheme = prev.themes && prev.themes[0] ? prev.themes[0].ko : '';
      var bits = [];
      if (prevTheme && curTheme && prevTheme !== curTheme) {
        bits.push('직전(' + prev.range + ')의 중심 ' + prevTheme + '에서 ' + curTheme + ' 쪽으로 무게가 이동합니다');
      } else if (prevTheme && curTheme && prevTheme === curTheme) {
        bits.push('직전 챕터에 이어 ' + curTheme + ' 주제가 이어지되, 국면 결이 달라집니다');
      }
      var prevLast = prev.phases && prev.phases.length
        ? prev.phases[prev.phases.length - 1].title
        : '';
      var curFirst = p.phases && p.phases.length ? p.phases[0].title : '';
      if (prevLast && curFirst && prevLast !== curFirst) {
        bits.push('직전 말미의 「' + prevLast + '」에서 「' + curFirst + '」 쪽으로 넘어옵니다');
      }
      p.compareNote = bits.length
        ? bits.join('. ') + '.'
        : '직전 챕터(' + prev.range + ') 다음에 이어지는 흐름입니다.';
    }
    return periods;
  }

  function scorePeriodCandidate(months, startIdx, endIdx, starsAgg, axisFlags, evidence) {
    var max = starsAgg.max || {};
    var score = (max.opportunity || 0) * 3
      + (max.pressure || 0) * 2
      + (max.change || 0) * 2
      + (max.stability || 0) * 0.5;
    score += Math.min(6, (evidence || []).length);
    if (axisFlags.utilizeInChange || axisFlags.stableUtilize) score += 12;
    if (axisFlags.opportunity && axisFlags.load && (max.pressure || 0) >= 4 && (max.change || 0) >= 4) {
      score += 10;
    }
    if (axisFlags.opportunity && !axisFlags.load) score += 6;
    // 구간 길이에 약한 보너스(클러스터 선호) + 과장 방지
    var len = endIdx - startIdx + 1;
    if (len >= 2 && len <= 4) score += 3;
    if (len > 6) score -= 2;
    return score;
  }

  /** 단독월 대표성: 각도·태양·달·금성 등 핵심 네이탈에 외행성(토성 포함) 하드 접촉 수 */
  var KEY_NATAL_STANDALONE = {
    sun: 1, moon: 1, venus: 1,
    asc: 1, ascendant: 1, mc: 1, midheaven: 1,
  };

  function monthIsQuietNeighbor(m) {
    if (!m) return true;
    return !isSalientJudgmentMonth(m);
  }

  function countKeyNatalOuterHard(m) {
    var n = 0;
    (m.topHits || []).forEach(function (h) {
      if (!h || !HARD_ASP[h.key]) return;
      var tk = String(h.tk || '').toLowerCase();
      if (!OUTER_BODY[tk] && tk !== 'saturn') return;
      var nk = String(h.nk || '').toLowerCase();
      if (KEY_NATAL_STANDALONE[nk]) n += 1;
    });
    return n;
  }

  /**
   * 단독월이 주변과 무관한 ‘약한 노이즈’인지.
   * 1개월이라서 삭제하지 않음. 앞뒤 quiet + 근거/축/네이탈 대표성이 약할 때만 drop.
   * 날짜 하드코딩 없음.
   */
  function isWeakIsolatedSingleMonth(c, months, minKeep) {
    if (!c || c.months !== 1) return false;
    var idx = c.startIdx;
    var m = months[idx];
    if (!m) return true;
    if (!monthIsQuietNeighbor(months[idx - 1]) || !monthIsQuietNeighbor(months[idx + 1])) {
      return false;
    }
    var s = m.stars || {};
    var sig = (m.judgment && m.judgment.signals) || {};
    // 독립 이벤트·전환으로 남을 만큼 강한 경우 keep
    if (sig.opportunity || sig.load || sig.stableUtilize || sig.utilizeInChange) return false;
    if ((s.opportunity || 0) >= 3 || (s.pressure || 0) >= 4 || (s.change || 0) >= 4) return false;
    if (countKeyNatalOuterHard(m) >= 3) return false;
    if (typeof minKeep === 'number' && c.score >= minKeep * 1.4) return false;
    return true;
  }

  function buildStemRank(months, startIdx, endIdx) {
    var freq = {};
    var total = 0;
    var i;
    for (i = startIdx; i <= endIdx; i++) {
      (months[i].topHits || []).slice(0, 5).forEach(function (h, rank) {
        if (!h || !h.tk || !h.nk) return;
        var pair = h.tk + '|' + h.nk;
        var w = (5 - rank) * (h.w || 1);
        if (!freq[pair]) freq[pair] = { pair: pair, weight: 0, count: 0 };
        freq[pair].weight += w;
        freq[pair].count += 1;
        total += w;
      });
    }
    var all = Object.keys(freq).map(function (k) {
      return {
        pair: k,
        weight: freq[k].weight,
        count: freq[k].count,
        share: total > 0 ? freq[k].weight / total : 0,
      };
    }).sort(function (a, b) { return b.weight - a.weight; });
    return {
      all: all,
      top1: all[0] || null,
      top2: all.slice(0, 2).map(function (x) { return x.pair; }),
      top3: all.slice(0, 3).map(function (x) { return x.pair; }),
    };
  }

  function pairRankAndShare(pair, stemRank) {
    var i;
    for (i = 0; i < (stemRank.all || []).length; i++) {
      if (stemRank.all[i].pair === pair) {
        return { rank: i + 1, share: stemRank.all[i].share };
      }
    }
    return { rank: 99, share: 0 };
  }

  function buildWindowProfile(months, startIdx, endIdx) {
    var stemRank = buildStemRank(months, startIdx, endIdx);
    var themes = aggregatePeriodThemes(months, startIdx, endIdx);
    var evidence = aggregatePeriodEvidence(months, startIdx, endIdx);
    var natalFreq = {};
    var transitFreq = {};
    evidence.forEach(function (e) {
      if (e.nk) natalFreq[e.nk] = (natalFreq[e.nk] || 0) + e.count;
      if (e.tk) transitFreq[e.tk] = (transitFreq[e.tk] || 0) + e.count;
    });
    var natalSorted = Object.keys(natalFreq).sort(function (a, b) { return natalFreq[b] - natalFreq[a]; });
    var transitSorted = Object.keys(transitFreq).sort(function (a, b) { return transitFreq[b] - transitFreq[a]; });
    return {
      startIdx: startIdx,
      endIdx: endIdx,
      stemRank: stemRank,
      theme1: themes[0] ? themes[0].k : '',
      themeRank: themes,
      natalTop1: natalSorted[0] || '',
      transitTop1: transitSorted[0] || '',
    };
  }

  function backgroundOnlyOverlap(L, R) {
    var shared = {};
    (L.stemRank.all || []).slice(0, 5).forEach(function (x) { shared[x.pair] = true; });
    var candidates = (R.stemRank.all || []).slice(0, 5).filter(function (x) { return shared[x.pair]; });
    var lTop1 = L.stemRank.top1 ? L.stemRank.top1.pair : '';
    var rTop1 = R.stemRank.top1 ? R.stemRank.top1.pair : '';
    var ci;
    for (ci = 0; ci < candidates.length; ci++) {
      var s = candidates[ci].pair;
      var lMeta = pairRankAndShare(s, L.stemRank);
      var rMeta = pairRankAndShare(s, R.stemRank);
      var dominatedToBackground =
        (lMeta.rank <= 2 && lMeta.share >= 0.25 && rMeta.rank >= 3 && rMeta.share < lMeta.share * 0.5) ||
        (rMeta.rank <= 2 && rMeta.share >= 0.25 && lMeta.rank >= 3 && lMeta.share < rMeta.share * 0.5);
      var newTopReplaced = lTop1 !== rTop1 && lTop1 !== s && rTop1 !== s;
      if (dominatedToBackground && newTopReplaced) return true;
    }
    return false;
  }

  function stemShiftStrong(L, R) {
    var lTop = L.stemRank.top1;
    var rTop = R.stemRank.top1;
    if (!lTop || !rTop || lTop.pair === rTop.pair) return false;
    if (lTop.share < 0.28 || rTop.share < 0.28) return false;
    return true;
  }

  function themeChapterShift(L, R) {
    if (!L.theme1 || !R.theme1 || L.theme1 === R.theme1) return false;
    var lTotal = 0;
    var rTotal = 0;
    (L.themeRank || []).forEach(function (t) { lTotal += t.avgRaw || 0; });
    (R.themeRank || []).forEach(function (t) { rTotal += t.avgRaw || 0; });
    var lShare = lTotal > 0 ? ((L.themeRank[0] && L.themeRank[0].avgRaw) || 0) / lTotal : 0;
    var rShare = rTotal > 0 ? ((R.themeRank[0] && R.themeRank[0].avgRaw) || 0) / rTotal : 0;
    return lShare >= 0.35 && rShare >= 0.35;
  }

  function axisShift(L, R) {
    return !!(L.natalTop1 && R.natalTop1 && L.natalTop1 !== R.natalTop1
      && L.transitTop1 && R.transitTop1 && L.transitTop1 !== R.transitTop1);
  }

  function sameChapter(L, R) {
    if (backgroundOnlyOverlap(L, R)) return false;
    if (setIntersectCount(L.stemRank.top2, R.stemRank.top2) >= 2 && L.theme1 === R.theme1) return true;
    if (setIntersectCount(L.stemRank.top2, R.stemRank.top2) >= 1 && L.theme1 === R.theme1) {
      var lShare = L.stemRank.top1 ? L.stemRank.top1.share : 0;
      var rShare = R.stemRank.top1 ? R.stemRank.top1.share : 0;
      if (Math.abs(lShare - rShare) < 0.20) return true;
    }
    return false;
  }

  function stemTop1Persistence(months, startIdx, endIdx, pair) {
    var n = 0;
    var i;
    for (i = startIdx; i <= endIdx; i++) {
      var t = buildStemRank(months, i, i).top1;
      if (t && t.pair === pair) n += 1;
    }
    return n;
  }

  function stemBackboneContinues(L, R) {
    if (L.stemRank.top1 && R.stemRank.top1 && L.stemRank.top1.pair === R.stemRank.top1.pair) return true;
    if (setIntersectCount(L.stemRank.top2, R.stemRank.top2) >= 1) {
      if (L.transitTop1 && R.transitTop1 && L.transitTop1 === R.transitTop1) return true;
    }
    return false;
  }

  function characterFamilyFromMonth(m) {
    var p = (m.judgment && m.judgment.primary) || 'quiet';
    if (p === 'opportunityWithLoad' || p === 'utilizeInChange' || p === 'stableUtilize') return 'opportunity-lean';
    if (p === 'caution' || p === 'cautionChange') return 'caution-lean';
    if (p === 'bigChange') return 'change-lean';
    return 'other';
  }

  function localizedChapterProfiles(months, leftEndIdx, rightStartIdx) {
    var lStart = Math.max(0, leftEndIdx - 4);
    var rEnd = Math.min(months.length - 1, rightStartIdx + 4);
    return {
      L: buildWindowProfile(months, lStart, leftEndIdx),
      R: buildWindowProfile(months, rightStartIdx, rEnd),
    };
  }

  function shouldStartNewPeriod(L, R, months, boundaryIdx) {
    if (typeof boundaryIdx === 'number' && boundaryIdx >= 0 && boundaryIdx + 1 < months.length) {
      var a = months[boundaryIdx];
      var b = months[boundaryIdx + 1];
      var priA = (a.judgment && a.judgment.primary) || 'quiet';
      var priB = (b.judgment && b.judgment.primary) || 'quiet';
      var famA = characterFamilyFromMonth(a);
      var famB = characterFamilyFromMonth(b);
      var phaseA = monthPhaseKey(a);
      var phaseB = monthPhaseKey(b);

      if (priA === priB && famA === famB) return false;

      var flow = monthsFlowCompatible(a, b);

      if (flow.ok) {
        // flow 연속이면 character/axis/primary/주제 비중 변화는 phase.
        // period는 bigChange 전환, 또는 왼쪽 구간에 없던 STEM이 강하게 지속 교체될 때만.
        if (priB === 'bigChange') return true;
        if (priA === 'bigChange' && priB === 'cautionChange') return true;
        if (priA === 'bigChange' && famA !== famB) {
          var hitA = (a.topHits && a.topHits[0]) ? a.topHits[0].tk + '|' + a.topHits[0].nk : '';
          var sameHitRun = 0;
          var k;
          for (k = boundaryIdx; k >= Math.max(0, boundaryIdx - 4); k--) {
            var hk = (months[k].topHits && months[k].topHits[0]) ? months[k].topHits[0].tk + '|' + months[k].topHits[0].nk : '';
            if (hk !== hitA) break;
            sameHitRun += 1;
          }
          if (sameHitRun <= 1) return true;
        }
        if (L.stemRank.top1 && R.stemRank.top1 && L.stemRank.top1.pair !== R.stemRank.top1.pair) {
          var rPair = R.stemRank.top1.pair;
          // 이미 왼쪽 백본(top3)에 있던 STEM이면 챕터 안 로테이션 → phase
          if ((L.stemRank.top3 || []).indexOf(rPair) >= 0) {
            return false;
          }
          var persistOk = stemTop1Persistence(months, R.startIdx, R.endIdx, rPair);
          if (persistOk < 2 && R.endIdx + 1 < months.length) {
            var pj;
            for (pj = R.endIdx + 1; pj < months.length && pj <= R.endIdx + 4; pj++) {
              if (!isSalientJudgmentMonth(months[pj])) continue;
              persistOk += stemTop1Persistence(months, pj, pj, rPair);
              if (persistOk >= 2) break;
            }
          }
          var monthPairA = (a.topHits && a.topHits[0]) ? a.topHits[0].tk + '|' + a.topHits[0].nk : '';
          var monthPairB = (b.topHits && b.topHits[0]) ? b.topHits[0].tk + '|' + b.topHits[0].nk : '';
          var monthLevelStemFlip = !!(monthPairA && monthPairB && monthPairA !== monthPairB && monthPairB === rPair);
          var strongNewStem = R.stemRank.top1.share >= 0.28 && persistOk >= 2;
          var strongBothSides = stemShiftStrong(L, R)
            || (axisShift(L, R) && L.stemRank.top1.share >= 0.24 && R.stemRank.top1.share >= 0.24);
          // A 2030: 새 STEM이 강하게 지속 + (축/주제/월단위 STEM 플립)이면 period
          if (strongNewStem && (strongBothSides || axisShift(L, R) || themeChapterShift(L, R) || monthLevelStemFlip)) {
            return true;
          }
        }
        return false;
      }

      if (priB === 'bigChange') return true;
      if (stemBackboneContinues(L, R) && L.theme1 === R.theme1) return false;
      if (famA !== famB && (phaseA !== phaseB || priA !== priB)) {
        if (stemShiftStrong(L, R) || axisShift(L, R) || themeChapterShift(L, R)) return true;
        if (L.natalTop1 && R.natalTop1 && L.natalTop1 !== R.natalTop1) return true;
        if (L.transitTop1 && R.transitTop1 && L.transitTop1 !== R.transitTop1) return true;
      }
    }

    if (themeChapterShift(L, R) && (stemShiftStrong(L, R) || axisShift(L, R))) return true;

    if (L.transitTop1 && R.transitTop1 && L.transitTop1 === R.transitTop1
        && !themeChapterShift(L, R) && !axisShift(L, R)) {
      return false;
    }

    if (stemShiftStrong(L, R)) {
      var rTop = R.stemRank.top1 ? R.stemRank.top1.pair : '';
      var persist = stemTop1Persistence(months, R.startIdx, R.endIdx, rTop);
      if (persist < 2 && R.endIdx + 1 < months.length) {
        var j;
        for (j = R.endIdx + 1; j < months.length && j <= R.endIdx + 4; j++) {
          if (!isSalientJudgmentMonth(months[j])) continue;
          persist += stemTop1Persistence(months, j, j, rTop);
          if (persist >= 2) break;
        }
      }
      var lLen = L.endIdx - L.startIdx + 1;
      if (persist >= 2 || (lLen >= 3 && R.stemRank.top1 && R.stemRank.top1.share >= 0.28)) return true;
    }

    if (axisShift(L, R)) return true;
    return false;
  }

  function shouldCutRangeAt(months, leftEndIdx, rangeStartIdx, rangeEndIdx) {
    if (leftEndIdx < rangeStartIdx || leftEndIdx >= rangeEndIdx) return false;
    var prof = localizedChapterProfiles(months, leftEndIdx, leftEndIdx + 1);
    return shouldStartNewPeriod(prof.L, prof.R, months, leftEndIdx);
  }

  function buildPhaseBlocksAlways(months, startIdx, endIdx) {
    var blocks = [];
    var bStart = startIdx;
    var key = monthPhaseKey(months[startIdx]);
    var i;
    for (i = startIdx + 1; i <= endIdx; i++) {
      var k = monthPhaseKey(months[i]);
      if (k === key) continue;
      blocks.push({ startIdx: bStart, endIdx: i - 1, key: key });
      bStart = i;
      key = k;
    }
    blocks.push({ startIdx: bStart, endIdx: endIdx, key: key });
    return blocks;
  }

  function isBridgeBlock(months, blocks, idx) {
    if (idx <= 0 || idx >= blocks.length - 1) return false;
    var b = blocks[idx];
    if (b.endIdx - b.startIdx + 1 > 2) return false;
    var L = buildWindowProfile(months, blocks[idx - 1].startIdx, blocks[idx - 1].endIdx);
    var N = buildWindowProfile(months, blocks[idx + 1].startIdx, blocks[idx + 1].endIdx);
    var B = buildWindowProfile(months, b.startIdx, b.endIdx);
    var overlapPrev = setIntersectCount(B.stemRank.top2, L.stemRank.top2) >= 1;
    var overlapNext = setIntersectCount(B.stemRank.top2, N.stemRank.top2) >= 1;
    return overlapPrev && overlapNext;
  }

  function splitLongRangeFallback(months, subRange) {
    var len = subRange.endIdx - subRange.startIdx + 1;
    if (len < 10) return [subRange];
    var pieces = [subRange];
    var changed = true;
    var guard = 0;
    while (changed && guard < 8) {
      guard += 1;
      changed = false;
      var next = [];
      pieces.forEach(function (p) {
        if (p.endIdx - p.startIdx + 1 < 10) {
          next.push(p);
          return;
        }
        var cut = -1;
        var i;
        for (i = p.startIdx; i < p.endIdx; i++) {
          if (!shouldCutRangeAt(months, i, p.startIdx, p.endIdx)) continue;
          var L = localizedChapterProfiles(months, i, i + 1).L;
          var R = localizedChapterProfiles(months, i, i + 1).R;
          if (shouldStartNewPeriod(L, R, months, i)) {
            cut = i;
            break;
          }
        }
        if (cut >= 0) {
          changed = true;
          next.push({
            startIdx: p.startIdx,
            endIdx: cut,
            linkReasons: p.linkReasons,
            splitNote: 'fallback split after ' + months[cut].ym,
          });
          next.push({
            startIdx: cut + 1,
            endIdx: p.endIdx,
            linkReasons: p.linkReasons,
          });
        } else {
          next.push(p);
        }
      });
      pieces = next;
    }
    return pieces;
  }

  function splitRawRangeByChapter(months, rawRange) {
    var len = rawRange.endIdx - rawRange.startIdx + 1;
    if (len <= 1) return [rawRange];
    var blocks = buildPhaseBlocksAlways(months, rawRange.startIdx, rawRange.endIdx);
    if (blocks.length <= 1 && len < 8) return splitLongRangeFallback(months, rawRange);

    var cutAfter = [];
    var segStart = rawRange.startIdx;
    var bi;
    for (bi = 0; bi < blocks.length - 1; bi++) {
      if (isBridgeBlock(months, blocks, bi) || isBridgeBlock(months, blocks, bi + 1)) continue;
      var boundaryIdx = blocks[bi].endIdx;
      if (!shouldCutRangeAt(months, boundaryIdx, rawRange.startIdx, rawRange.endIdx)) continue;
      var prof = localizedChapterProfiles(months, boundaryIdx, boundaryIdx + 1);
      var L = prof.L;
      var R = prof.R;
      if (shouldStartNewPeriod(L, R, months, boundaryIdx)) {
        cutAfter.push(bi);
        segStart = blocks[bi + 1].startIdx;
      }
    }
    var subRanges;
    if (!cutAfter.length) {
      subRanges = [rawRange];
    } else {
      subRanges = [];
      var segBlockStart = 0;
      var ci;
      for (ci = 0; ci < cutAfter.length; ci++) {
        var cutBlock = cutAfter[ci];
        subRanges.push({
          startIdx: blocks[segBlockStart].startIdx,
          endIdx: blocks[cutBlock].endIdx,
          linkReasons: rawRange.linkReasons,
          splitNote: 'chapter split after ' + months[blocks[cutBlock].endIdx].ym,
        });
        segBlockStart = cutBlock + 1;
      }
      subRanges.push({
        startIdx: blocks[segBlockStart].startIdx,
        endIdx: blocks[blocks.length - 1].endIdx,
        linkReasons: rawRange.linkReasons,
      });
    }
    var out = [];
    subRanges.forEach(function (sr) {
      splitLongRangeFallback(months, sr).forEach(function (x) { out.push(x); });
    });
    return out;
  }

  function startsNewChapter(months, idx) {
    var top = buildStemRank(months, idx, idx).top1;
    if (!top) return false;
    var theme = monthThemeRank(months[idx])[0];
    if (!theme) return false;
    var count = 1;
    var j;
    for (j = idx + 1; j < months.length && j <= idx + 5; j++) {
      if (!isSalientJudgmentMonth(months[j])) continue;
      var t2 = buildStemRank(months, j, j).top1;
      var th2 = monthThemeRank(months[j])[0];
      if (t2 && t2.pair === top.pair && th2 && th2.k === theme.k) count += 1;
      if (count >= 3) return true;
    }
    return false;
  }

  function buildEventFromCandidate(c) {
    return {
      ym: c.startYm,
      range: c.range,
      kind: 'event',
      title: c.title,
      score: Math.round(c.score * 10) / 10,
      axisFlags: c.axisFlags,
      themes: (c.themes || []).slice(0, 2),
      evidence: (c.evidence || []).slice(0, 5).map(function (e) { return e.line + ' (×' + e.count + ')'; }),
      meaning: c.meaning,
      whyStandalone: '단독 salient 월. period 챕터가 아니며 인접 period에 흡수하지 않음(event/peak).',
    };
  }

  function buildCandidateFromRange(months, r, id) {
    var evidence = aggregatePeriodEvidence(months, r.startIdx, r.endIdx);
    var themesCore = aggregatePeriodThemes(months, r.startIdx, r.endIdx);
    var themes = aggregatePeriodThemesDisplay(months, r.startIdx, r.endIdx);
    var starsAgg = aggregatePeriodStars(months, r.startIdx, r.endIdx);
    var axisFlags = periodAxisFlags(months, r.startIdx, r.endIdx);
    var phases = buildPeriodPhases(months, r.startIdx, r.endIdx);
    var meaningPack = buildPeriodMeaning(themes, starsAgg, axisFlags, evidence, phases);
    var score = scorePeriodCandidate(months, r.startIdx, r.endIdx, starsAgg, axisFlags, evidence);
    var title = buildPeriodTitle(themes, axisFlags, phases);
    var primaries = {};
    var i;
    for (i = r.startIdx; i <= r.endIdx; i++) {
      var p = (months[i].judgment && months[i].judgment.primary) || 'quiet';
      primaries[p] = (primaries[p] || 0) + 1;
    }
    return {
      id: id,
      startIdx: r.startIdx,
      endIdx: r.endIdx,
      startYm: months[r.startIdx].ym,
      endYm: months[r.endIdx].ym,
      months: r.endIdx - r.startIdx + 1,
      range: ymRangeLabel({
        startYm: months[r.startIdx].ym,
        endYm: months[r.endIdx].ym,
      }),
      title: title,
      linkReasons: r.linkReasons || [],
      splitNote: r.splitNote || '',
      evidence: evidence,
      themes: themes,
      themesCore: themesCore,
      stars: starsAgg,
      axisFlags: axisFlags,
      primaries: primaries,
      phases: phases,
      meaning: meaningPack.meaning,
      howToUse: meaningPack.howToUse,
      labels: meaningPack.labels,
      score: score,
    };
  }

  /**
   * keyTimings v3: evidence → axes/themes → meaning → optional labels.
   * period / phase / event / drop 4계층. UI 연결 전 검증용. 날짜 하드코딩 없음.
   */
  function buildKeyTimingsV3(months) {
    if (!months || !months.length) {
      return { version: 3, periods: [], events: [], note: 'empty' };
    }

    months.forEach(function (m) {
      if (!m.judgment) m.judgment = classifyMonthJudgment(m);
    });

    var salient = [];
    months.forEach(function (m, i) {
      if (isSalientJudgmentMonth(m)) salient.push(i);
    });

    var rawRanges = [];
    if (salient.length) {
      var start = salient[0];
      var prev = salient[0];
      var linkReasons = [];
      var si;
      for (si = 1; si < salient.length; si++) {
        var idx = salient[si];
        if (idx === prev + 1) {
          var link = monthsFlowCompatible(months[prev], months[idx]);
          if (link.ok) {
            linkReasons.push({ from: months[prev].ym, to: months[idx].ym, reason: link.reason });
            prev = idx;
            continue;
          }
        }
        rawRanges.push({
          startIdx: start,
          endIdx: prev,
          linkReasons: linkReasons.slice(),
        });
        start = idx;
        prev = idx;
        linkReasons = [];
      }
      rawRanges.push({
        startIdx: start,
        endIdx: prev,
        linkReasons: linkReasons.slice(),
      });
    }

    var splitRanges = [];
    rawRanges.forEach(function (r) {
      splitRawRangeByChapter(months, r).forEach(function (sr) { splitRanges.push(sr); });
    });

    var candidates = splitRanges.map(function (r, id) {
      return buildCandidateFromRange(months, r, id);
    });

    var sorted = candidates.slice().sort(function (a, b) { return b.score - a.score; });
    var selected = [];
    var topScore = sorted.length ? sorted[0].score : 0;
    var minKeep = Math.max(16, topScore * 0.28);

    function overlaps(a, b) {
      return !(a.endIdx < b.startIdx || b.endIdx < a.startIdx);
    }

    function tooSimilar(a, b) {
      // 겹치는 구간만 충돌. 다른 연도의 유사 STEM/주제 챕터는 각각 남긴다.
      return overlaps(a, b);
    }

    var droppedWeakSingles = [];
    var pendingSingles = [];
    sorted.forEach(function (c) {
      if (c.score < minKeep) return;
      if (isWeakIsolatedSingleMonth(c, months, minKeep)) {
        droppedWeakSingles.push({
          range: c.range,
          score: Math.round(c.score * 10) / 10,
          reason: '단독월+앞뒤 quiet+축/별점/핵심네이탈 근거가 대표 시기로 약함',
        });
        return;
      }
      if (c.months === 1 && !startsNewChapter(months, c.startIdx)) {
        pendingSingles.push(c);
        return;
      }
      var clash = selected.some(function (s) { return tooSimilar(s, c); });
      if (!clash) selected.push(c);
    });

    selected.sort(function (a, b) { return a.startIdx - b.startIdx; });

    var eventCandidates = [];
    pendingSingles.forEach(function (c) {
      var nearest = null;
      var nearestGap = Infinity;
      selected.forEach(function (s) {
        var gapAfter = c.startIdx - s.endIdx;
        var gapBefore = s.startIdx - c.endIdx;
        if (gapAfter > 0 && gapAfter < nearestGap) {
          nearestGap = gapAfter;
          nearest = { s: s, side: 'after' };
        }
        if (gapBefore > 0 && gapBefore < nearestGap) {
          nearestGap = gapBefore;
          nearest = { s: s, side: 'before' };
        }
      });
      if (nearest && nearestGap <= 2) {
        if (nearest.side === 'after') {
          nearest.s.endIdx = c.startIdx;
          nearest.s.mergePeaks = (nearest.s.mergePeaks || []).concat(c.range);
        } else {
          nearest.s.startIdx = c.startIdx;
          nearest.s.mergePeaks = (nearest.s.mergePeaks || []).concat(c.range);
        }
        return;
      }
      eventCandidates.push(c);
    });

    selected = selected.map(function (s, idx) {
      var note = s.splitNote || '';
      if (s.mergePeaks && s.mergePeaks.length) {
        note += (note ? ' ' : '') + '· peak ' + s.mergePeaks.join(', ') + ' 흡수';
      }
      var r = {
        startIdx: s.startIdx,
        endIdx: s.endIdx,
        linkReasons: s.linkReasons,
        splitNote: note,
      };
      return buildCandidateFromRange(months, r, idx);
    });
    selected.sort(function (a, b) { return a.startIdx - b.startIdx; });

    var events = eventCandidates.map(buildEventFromCandidate);

    var periods = selected.map(function (c, n) {
      var whyGrouped = '';
      if (c.splitNote) {
        whyGrouped = c.splitNote;
      } else if (c.months === 1) {
        whyGrouped = '단일 월이나 이후 STEM+주제 챕터가 지속되어 period 시작.';
      } else {
        whyGrouped = (c.linkReasons || []).map(function (l) {
          return l.from + '→' + l.to + ': ' + l.reason;
        }).join(' / ');
      }
      var whySelected =
        '구간 점수 ' + Math.round(c.score * 10) / 10 +
        ' · 주제1 ' + (c.themes[0] ? c.themes[0].ko : '-') +
        (c.phases && c.phases.length ? ' · 내부 phase ' + c.phases.length + '개' : '') +
        ' · chapter/flow 선별';
      return {
        id: 'p' + (n + 1),
        range: c.range,
        startYm: c.startYm,
        endYm: c.endYm,
        months: c.months,
        title: c.title,
        stars: c.stars,
        axisFlags: c.axisFlags,
        primaries: c.primaries,
        themes: c.themes,
        evidence: c.evidence,
        phases: c.phases || [],
        meaning: c.meaning,
        howToUse: c.howToUse,
        labels: c.labels,
        score: Math.round(c.score * 10) / 10,
        whySelected: whySelected,
        whyGrouped: whyGrouped,
      };
    });

    return {
      version: 3,
      selectionNote:
        'period=챕터 / phase=내부국면 / event=단독 salient peak / drop=약한 단독. ' +
        'chapter split: STEM+theme 또는 강한 STEM 교체+지속. bridge 1~2m는 phase. ' +
        '단독 salient→event(인접 period 흡수 없음). 날짜 하드코딩 없음.',
      candidateCount: candidates.length,
      selectedCount: periods.length,
      eventCount: events.length,
      minKeepScore: Math.round(minKeep * 10) / 10,
      droppedWeakSingles: droppedWeakSingles,
      events: events,
      periods: enrichPeriodsNarrative(periods),
      _debugCandidates: candidates.map(function (c) {
        return {
          range: c.range,
          months: c.months,
          score: Math.round(c.score * 10) / 10,
          title: c.title,
          axisFlags: c.axisFlags,
          topTheme: c.themes[0] ? c.themes[0].k : '',
          phaseCount: (c.phases || []).length,
          topEvidence: (c.evidence || []).slice(0, 3).map(function (e) { return e.line; }),
          weakIsolatedSingle: isWeakIsolatedSingleMonth(c, months, minKeep),
        };
      }),
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
    var themeKeys = ALL_THEME_KEYS;
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
    meta.keyTimingsV3 = buildKeyTimingsV3(months);
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
      keyTimingsV3: judgment.keyTimingsV3,
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
   * (legacy — V3 연결 후에도 유지. renderHtml은 V3를 사용)
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

  function periodCardClass(p) {
    var ax = p.axisFlags || {};
    if (ax.utilizeInChange) return 'utilizeInChange';
    if (ax.stableUtilize) return 'stableUtilize';
    if (ax.opportunity && ax.load) return 'opportunityWithLoad';
    if (!ax.opportunity && (ax.load || ax.change)) return 'caution';
    if (ax.change) return 'bigChange';
    if (ax.opportunity) return 'opportunityWithLoad';
    return 'period';
  }

  function themeChipsHtml(themes, opts) {
    opts = opts || {};
    var max = opts.max != null ? opts.max : 2;
    var list = (themes || []).slice(0, max);
    return list.map(function (t, i) {
      var cls = i === 0 ? 'tl-tag tl-tag--primary' : 'tl-tag';
      return '<span class="' + cls + '">' + escapeHtml(t.ko || THEME_KR[t.k] || t.k) + '</span>';
    }).join('');
  }

  function evidenceLineHtml(evidence) {
    var lines = (evidence || []).slice(0, 3).map(function (e) {
      if (typeof e === 'string') return e;
      return e.line + (e.count ? ' (×' + e.count + ')' : '');
    });
    return lines.length ? lines.join(' · ') : '';
  }

  function evidenceDetailsHtml(evidence) {
    var line = evidenceLineHtml(evidence);
    if (!line) return '';
    return (
      '<details class="tl-evidence-details">' +
      '<summary>상담 참고 · 행성 근거</summary>' +
      '<div class="tl-judge-hits">' + escapeHtml(line) + '</div>' +
      '</details>'
    );
  }

  function renderPeriodCardHtml(p) {
    var cls = periodCardClass(p);
    var themes = themeChipsHtml(p.themes, { max: 2 });
    var coreTheme = p.themes && p.themes[0] ? (p.themes[0].ko || '') : '';
    var phases = p.phases || [];
    var phaseHtml = '';
    if (phases.length >= 2) {
      phaseHtml =
        '<div class="tl-phase-list" aria-label="이 시기 안의 국면">' +
        '<div class="tl-phase-label">이 흐름 안의 국면</div>' +
        phases.map(function (ph) {
          var themeOnly = phaseThemeFromNote(ph.note);
          return (
            '<div class="tl-phase-item">' +
            '<span class="tl-phase-range">' + escapeHtml(String(ph.range || '').replace(/-/g, '.')) + '</span>' +
            '<span class="tl-phase-title">' + escapeHtml(ph.title || '') + '</span>' +
            (themeOnly ? '<span class="tl-phase-note">' + escapeHtml(themeOnly) + '</span>' : '') +
            '</div>'
          );
        }).join('') +
        '</div>';
    }
    return (
      '<div class="tl-period-card tl-judge-card tl-judge--' + escapeHtml(cls) + '">' +
      '<div class="tl-period-kicker">장기 흐름' +
      (coreTheme ? ' · ' + escapeHtml(coreTheme) : '') +
      '</div>' +
      '<div class="tl-judge-label">' + escapeHtml(p.title || '주요 시기') + '</div>' +
      '<div class="tl-judge-range">' + escapeHtml(String(p.range || '').replace(/-/g, '.')) +
      (p.months > 1 ? ' <span class="tl-win-len">· ' + p.months + '개월</span>' : '') +
      '</div>' +
      (themes ? '<div class="tl-win-tags">' + themes + '</div>' : '') +
      (p.compareNote ? '<div class="tl-period-compare">' + escapeHtml(p.compareNote) + '</div>' : '') +
      (p.meaning ? '<div class="tl-judge-note">' + escapeHtml(p.meaning) + '</div>' : '') +
      (p.howToUse ? '<div class="tl-period-howto">' + escapeHtml(p.howToUse) + '</div>' : '') +
      phaseHtml +
      evidenceDetailsHtml(p.evidence) +
      '</div>'
    );
  }

  function renderEventCardHtml(e) {
    var themes = themeChipsHtml(e.themes, { max: 2 });
    return (
      '<div class="tl-event-card tl-judge-card tl-judge--caution">' +
      '<div class="tl-period-kicker">주목할 시점</div>' +
      '<div class="tl-judge-label">' + escapeHtml(e.title || '두드러진 달') + '</div>' +
      '<div class="tl-judge-range">' + escapeHtml(String(e.range || e.ym || '').replace(/-/g, '.')) + '</div>' +
      (themes ? '<div class="tl-win-tags">' + themes + '</div>' : '') +
      (e.meaning ? '<div class="tl-judge-note">' + escapeHtml(e.meaning) + '</div>' : '') +
      evidenceDetailsHtml(e.evidence) +
      '</div>'
    );
  }

  /**
   * keyTimings V3 UI: period=메인 카드, phase=내부 국면, event=시간순 삽입.
   * droppedWeakSingles(drop)는 사용자에게 노출하지 않음.
   */
  function renderKeyTimingsV3Html(data) {
    var v3 = data.keyTimingsV3 || {};
    var periods = v3.periods || [];
    var events = v3.events || [];
    if (!periods.length && !events.length) return '';

    var items = [];
    periods.forEach(function (p) {
      items.push({ kind: 'period', ym: p.startYm || '', html: renderPeriodCardHtml(p) });
    });
    events.forEach(function (e) {
      items.push({
        kind: 'event',
        ym: e.ym || e.startYm || String(e.range || '').replace(/\./g, '-'),
        html: renderEventCardHtml(e),
      });
    });
    items.sort(function (a, b) {
      return String(a.ym).localeCompare(String(b.ym));
    });

    return (
      '<div class="tl-sec tl-judge-sec tl-v3-sec">' +
      '<h4>장기 흐름 · 주요 시기</h4>' +
      '<p class="tl-judge-intro">한 카드가 한 <strong>장기 챕터</strong>입니다. ' +
      '국면은 카드 안, 「주목할 시점」은 챕터 사이 독립 마커입니다.</p>' +
      '<div class="tl-period-stack">' + items.map(function (it) { return it.html; }).join('') + '</div>' +
      '</div>'
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
      '<div class="tl-guide">5년 흐름을 <strong>장기 챕터</strong>로 먼저 보고, 아래 막대는 배경 상태 참고용입니다.' +
      progHint +
      ' (' + escapeHtml(data.fromYm) + ' ~ ' + escapeHtml(data.toYm) + ')</div>' +
      renderKeyTimingsV3Html(data) +
      '<div class="tl-filter" data-tl-filter>' +
      '<button type="button" class="tl-filter-btn' + (filter === 'all' ? ' is-on' : '') + '" data-theme="all">전체</button>' +
      '<button type="button" class="tl-filter-btn' + (filter === 'relationship' ? ' is-on' : '') + '" data-theme="relationship">연애</button>' +
      '<button type="button" class="tl-filter-btn' + (filter === 'career' ? ' is-on' : '') + '" data-theme="career">일</button>' +
      '<button type="button" class="tl-filter-btn' + (filter === 'money' ? ' is-on' : '') + '" data-theme="money">금전</button>' +
      '</div>' +
      '<div class="tl-legend">' + legend + '</div>' +
      '<div class="tl-chart" role="img" aria-label="5년 상태 타임라인">' + bars + '</div>' +
      '<details class="tl-state-bg">' +
      '<summary>배경 상태 흐름 (참고 · 위 장기 챕터와 다른 층)</summary>' +
      '<p class="tl-state-bg-note">월별 상태 묶음입니다. 상담의 주 서사는 위의 장기 챕터·국면·주목 시점을 우선하세요.</p>' +
      segHtml +
      '</details>'
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
    var v3 = data.keyTimingsV3 || {};
    L.push('');
    if (v3.periods && v3.periods.length) {
      L.push('[엔진 판정 · 장기 흐름 V3 — AI는 이 챕터/국면/시점을 뒤집지 말 것. 출력에는 영문 ID 대신 한국어로만]');
      L.push('규칙: period=장기 챕터, phase=챕터 안 국면(별도 카드로 올리지 말 것), event=독립 시점. drop은 사용자에게 말하지 말 것.');
      L.push('※ 아래 period/phase/event 목록은 엔진 원본이다. 합치거나 삭제·기간 변경 금지. 상담문에서만 이야기로 연결한다.');
      L.push('서술 규칙: 화면/입력을 그대로 읽어 주지 말 것. 직전 period와 비교해 「무엇이 달라졌는지」를 상담 문장으로 이어서 말할 것.');
      L.push('서술 규칙: 같은 주제(예: 금전)가 이어지는 연속 period는 연도별로 따로 나열하지 말고, 「금전 이슈가 커짐 → 조율·선택 → 일로 무게 이동」처럼 한 이야기로 연결할 것.');
      L.push('서술 규칙: themes/areas에 나온 삶의 영역만 언급. 7영역을 매 연도 강제로 채우지 말 것.');
      L.push('서술 규칙: 건강·가족은 확정 질병·가정 파탄 등으로 단정하지 말 것. 약한 신호면 생략.');
      L.push('서술 규칙: 이동·환경은 약한 신호로 「이사」를 단정하지 말 것.');
      L.push('서술 규칙: phase는 챕터 안 세부 결로만 짧게. 별도 장기 챕터처럼 과장하지 말 것.');
      L.push('출력 금지 라벨(사용자 문장에 반복 금지): 확장, 부담, 변화, 전환, 재편, 확장과 부담, 주의가 필요한 변화, 선택적 실행, 확장기, 압박기, 도약·재편기.');
      L.push('대신 생활어: 속도를 내기 / 속도를 줄이기 / 선택적으로 실행 / 결정·계약을 미루기 / 역할·업무 조율 / 재정 점검 / 방향 재확인 등.');
      L.push('예(연결): 「2026 후반~2028 중반 금전·자원 이슈가 이어지되, 2027은 시도할 여지와 책임이 같이 커지고, 2028 하반부터는 일·역할 쪽으로 무게가 옮아간다」.');
      L.push('길흉 단정(무조건 좋다/나쁘다) 금지.');
      (v3.periods || []).forEach(function (p, idx) {
        L.push('· period | ' + p.range + (p.months > 1 ? ' (' + p.months + '개월)' : '') + ' | ' + (p.title || ''));
        if (p.themes && p.themes.length) {
          L.push('  themes: ' + p.themes.slice(0, 3).map(function (t) { return t.ko || t.k; }).join(' > '));
        }
        if (p.compareNote) L.push('  vsPrev: ' + p.compareNote);
        if (p.meaning) L.push('  meaning: ' + p.meaning);
        if (p.howToUse) L.push('  howToUse: ' + p.howToUse);
        if (p.phases && p.phases.length >= 2) {
          L.push('  phases: ' + p.phases.map(function (ph) {
            return ph.range + ' ' + (ph.title || '');
          }).join(' → '));
        }
        if (idx > 0) {
          L.push('  (서술 시 위 period와의 차이를 한 문장 이상 포함 · 엔진 라벨 반복 금지)');
        }
      });
      (v3.events || []).forEach(function (e) {
        L.push('· event | ' + (e.range || e.ym) + ' | ' + (e.title || ''));
        if (e.meaning) L.push('  meaning: ' + e.meaning);
        L.push('  (서술 시: 앞뒤 챕터 사이 독립 이정표로 왜 중요한지만 생활어로)');
      });
    } else {
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
    }

    if (kt.themeActivation) {
      L.push('');
      L.push('[주제 활성 peak — 활성도일 뿐 길흉 아님. 게이트 통과분만]');
      ALL_THEME_KEYS.forEach(function (theme) {
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
    L.push('상태 구간(배경 참고 · period와 다른 층, 주 서사로 쓰지 말 것):');
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
    CORE_THEME_KEYS: CORE_THEME_KEYS,
    EXT_THEME_KEYS: EXT_THEME_KEYS,
    ALL_THEME_KEYS: ALL_THEME_KEYS,
    JUDGMENT_META: JUDGMENT_META,
    ymLabel: ymLabel,
    aggregateMonth: aggregateMonth,
    buildEpisodes: buildEpisodes,
    buildSegments: buildSegments,
    buildResult: buildResult,
    attachJudgmentLayer: attachJudgmentLayer,
    classifyMonthJudgment: classifyMonthJudgment,
    buildKeyTimings: buildKeyTimings,
    buildKeyTimingsV3: buildKeyTimingsV3,
    _debugSplitProbe: function (months, leftEndYm, rightStartYm) {
      var li = -1;
      var ri = -1;
      var i;
      for (i = 0; i < months.length; i++) {
        if (months[i].ym === leftEndYm) li = i;
        if (months[i].ym === rightStartYm) ri = i;
      }
      if (li < 0 || ri < 0) return { err: 'ym not found', leftEndYm: leftEndYm, rightStartYm: rightStartYm };
      var prof = localizedChapterProfiles(months, li, ri);
      var L = prof.L;
      var R = prof.R;
      return {
        leftEndYm: leftEndYm,
        rightStartYm: rightStartYm,
        L: {
          theme1: L.theme1,
          stemTop1: L.stemRank.top1,
          natalTop1: L.natalTop1,
          transitTop1: L.transitTop1,
        },
        R: {
          theme1: R.theme1,
          stemTop1: R.stemRank.top1,
          natalTop1: R.natalTop1,
          transitTop1: R.transitTop1,
        },
        stemShiftStrong: stemShiftStrong(L, R),
        themeChapterShift: themeChapterShift(L, R),
        axisShift: axisShift(L, R),
        shouldStartNewPeriod: shouldStartNewPeriod(L, R, months, ri - 1),
      };
    },
    renderHtml: renderHtml,
    renderKeyTimingsHtml: renderKeyTimingsHtml,
    renderKeyTimingsV3Html: renderKeyTimingsV3Html,
    buildAiSummary: buildAiSummary,
    classifyState: classifyState,
  };
})(typeof window !== 'undefined' ? window : globalThis);
