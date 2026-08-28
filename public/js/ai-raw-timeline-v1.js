/**
 * ai-raw-timeline-v1 builder (browser)
 * Same rules as scripts/build_ai_raw_timeline_v1.js (compression v1.2 frozen).
 * Expects global Origin, Horoscope (circular-natal-horoscope-js).
 * Does NOT modify V3 score engine.
 */
(function (global) {
'use strict';

function makeHoroscope(y, mo, da, hh, mi, lat, lng) {
  var Origin = global.Origin;
  var Horoscope = global.Horoscope;
  if (!Origin || !Horoscope) throw new Error('circular-natal-horoscope-js not loaded');
  return new Horoscope({
    origin: new Origin({
      year: y, month: mo - 1, date: da, hour: hh, minute: mi,
      latitude: lat, longitude: lng,
    }),
    houseSystem: 'placidus', zodiac: 'tropical',
    aspectPoints: ['bodies'], aspectWithPoints: ['bodies'], aspectTypes: ['major'], language: 'en',
  });
}

const TIMING_PLANETS = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const BODY_KEYS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const EPISODE_GAP_MAX = 2;
const CAP = 40;
const B_FLOOR = 8;

/** Complementary aspect on opposite angle pole (ASC↔DSC, MC↔IC). */
const AXIS_ASPECT_PAIR = {
  conjunction: 'opposition',
  opposition: 'conjunction',
  sextile: 'trine',
  trine: 'sextile',
  square: 'square',
};
const AXIS_POLE = {
  asc: { axis: 'horizon', mate: 'dsc' },
  dsc: { axis: 'horizon', mate: 'asc' },
  mc: { axis: 'meridian', mate: 'ic' },
  ic: { axis: 'meridian', mate: 'mc' },
};

const ASPECTS_DEF = [
  { key: 'conjunction', a: 0, orb: 5 },
  { key: 'sextile', a: 60, orb: 3 },
  { key: 'square', a: 90, orb: 4 },
  { key: 'trine', a: 120, orb: 4 },
  { key: 'opposition', a: 180, orb: 5 },
];

const PLANET_KR = {
  jupiter: '목성', saturn: '토성', uranus: '천왕성', neptune: '해왕성', pluto: '명왕성',
  sun: '태양', moon: '달', mercury: '수성', venus: '금성', mars: '화성',
  asc: '상승궁', mc: '중천', dsc: '하강궁', ic: '천저',
};
const ASPECT_KR = {
  conjunction: '합', sextile: '육합', square: '사각', trine: '삼각', opposition: '충',
};

const CHARTS = {
  F: {
    id: 'F_1985대구',
    y: 1985, mo: 11, da: 3, hh: 18, mi: 45,
    lat: 35.8714, lng: 128.6014, place: '대구',
    timezone: 'Asia/Seoul', unknownTime: false,
  },
  TEEN: {
    id: 'TEEN_2012',
    y: 2012, mo: 1, da: 5, hh: 12, mi: 58,
    lat: 35.1796, lng: 129.0756, place: '부산',
    timezone: 'Asia/Seoul', unknownTime: false,
  },
  B: {
    id: 'B_김은정',
    y: 1979, mo: 12, da: 25, hh: 12, mi: 30,
    lat: 35.1796, lng: 129.0756, place: '부산',
    timezone: 'Asia/Seoul', unknownTime: false,
  },
};

function deg(obj) {
  try { return obj.ChartPosition.Ecliptic.DecimalDegrees; } catch (e) { return null; }
}
function houseStart(h) {
  try { return h.ChartPosition.StartPosition.Ecliptic.DecimalDegrees; } catch (e) { return null; }
}
function angDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}
function findAspect(d1, d2) {
  const diff = angDiff(d1, d2);
  for (const A of ASPECTS_DEF) {
    if (Math.abs(diff - A.a) <= A.orb) return { key: A.key, orbOff: Math.abs(diff - A.a) };
  }
  return null;
}
function addDays(y, mo, da, n) {
  const d = new Date(y, mo - 1, da);
  d.setDate(d.getDate() + n);
  return { y: d.getFullYear(), mo: d.getMonth() + 1, da: d.getDate() };
}
function ymLabel(y, m) {
  return y + '-' + String(m).padStart(2, '0');
}
function houseOfDeg(d, horoscope) {
  const houses = horoscope.Houses || [];
  if (!houses.length || d == null) return null;
  for (let i = 0; i < houses.length; i++) {
    const a = houseStart(houses[i]);
    const b = houseStart(houses[(i + 1) % houses.length]);
    if (a == null || b == null) continue;
    const span = (((b - a) % 360) + 360) % 360;
    const off = (((d - a) % 360) + 360) % 360;
    if (off < (span || 360)) return Number(houses[i].id || i + 1);
  }
  return null;
}

function buildNatal(chart) {
  const unknown = !!chart.unknownTime;
  const hh = unknown ? 12 : chart.hh;
  const mi = unknown ? 0 : chart.mi;
  const h = makeHoroscope(chart.y, chart.mo, chart.da, hh, mi, chart.lat, chart.lng);
  const bodies = {};
  BODY_KEYS.forEach((k) => {
    const d = deg(h.CelestialBodies[k]);
    if (d == null) return;
    const row = { lon: Math.round(d * 1000) / 1000 };
    if (!unknown) row.house = houseOfDeg(d, h);
    bodies[k] = row;
  });
  let angles = null;
  let houses = null;
  const natalDegs = Object.fromEntries(Object.keys(bodies).map((k) => [k, bodies[k].lon]));
  if (!unknown) {
    const asc = deg(h.Ascendant);
    const mc = deg(h.Midheaven);
    angles = {
      asc: { lon: Math.round(asc * 1000) / 1000 },
      mc: { lon: Math.round(mc * 1000) / 1000 },
      dsc: { lon: Math.round(((asc + 180) % 360) * 1000) / 1000 },
      ic: { lon: Math.round(((mc + 180) % 360) * 1000) / 1000 },
    };
    natalDegs.asc = asc;
    natalDegs.mc = mc;
    natalDegs.dsc = (asc + 180) % 360;
    natalDegs.ic = (mc + 180) % 360;
    houses = (h.Houses || []).map((hhouse, i) => ({
      id: hhouse.id || i + 1,
      startLon: Math.round((houseStart(hhouse) || 0) * 1000) / 1000,
    }));
  }
  return { bodies, angles, houses, natalDegs, horoscope: h, unknownTime: unknown };
}

function buildProgMoon(chart, natalH, natalDegs, sampleY, sampleMo, prevHouse, unknownTime) {
  if (unknownTime) return null;
  const sample = new Date(sampleY, sampleMo - 1, 15, 12, 0, 0);
  const birth = new Date(chart.y, chart.mo - 1, chart.da, chart.hh || 12, chart.mi || 0, 0);
  const ageYears = (sample.getTime() - birth.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (ageYears < 0) return null;
  const prog = addDays(chart.y, chart.mo, chart.da, Math.floor(ageYears));
  const progH = makeHoroscope(prog.y, prog.mo, prog.da, chart.hh, chart.mi, chart.lat, chart.lng);
  const moonDeg = deg(progH.CelestialBodies.moon);
  if (moonDeg == null) return null;
  const houseNum = houseOfDeg(moonDeg, natalH);
  const aspects = [];
  ['sun', 'moon', 'venus', 'mars', 'asc', 'mc'].forEach((nk) => {
    if (natalDegs[nk] == null) return;
    const asp = findAspect(moonDeg, natalDegs[nk]);
    if (asp) aspects.push({ nk, key: asp.key, orbOff: Math.round(asp.orbOff * 100) / 100 });
  });
  return {
    house: houseNum,
    houseChanged: prevHouse != null && houseNum != null && prevHouse !== houseNum,
    prevHouse,
    aspects,
  };
}

function sampleMonth(chart, natalDegs, y, mo) {
  const h = makeHoroscope(y, mo, 15, 12, 0, chart.lat, chart.lng);
  const hits = [];
  const transitMeta = {};
  TIMING_PLANETS.forEach((tk) => {
    const td = deg(h.CelestialBodies[tk]);
    if (td == null) return;
    let retro = false;
    try {
      const b = h.CelestialBodies[tk];
      retro = typeof b.isRetrograde === 'function' ? !!b.isRetrograde() : !!b.isRetrograde;
    } catch (e) { /* */ }
    transitMeta[tk] = { lon: Math.round(td * 100) / 100, retro };
    Object.keys(natalDegs).forEach((nk) => {
      if (natalDegs[nk] == null) return;
      const asp = findAspect(td, natalDegs[nk]);
      if (!asp) return;
      hits.push({
        tk, nk, key: asp.key,
        orbOff: Math.round(asp.orbOff * 1000) / 1000,
      });
    });
  });
  return { hits, transitMeta };
}

function buildEpisodesWithPeaks(samples) {
  const bySig = {};
  samples.forEach((s, idx) => {
    (s.hits || []).forEach((h) => {
      const sig = h.tk + '|' + h.nk + '|' + h.key;
      if (!bySig[sig]) bySig[sig] = [];
      bySig[sig].push({
        idx,
        ym: s.ym,
        orb: h.orbOff,
        retro: !!(s.transitMeta && s.transitMeta[h.tk] && s.transitMeta[h.tk].retro),
        hit: h,
      });
    });
  });

  const episodes = [];
  Object.keys(bySig).forEach((sig) => {
    const rows = bySig[sig].sort((a, b) => a.idx - b.idx);
    let cur = null;
    const flush = () => {
      if (!cur) return;
      const localPeaks = extractLocalPeaks(cur.samples);
      let peak = localPeaks[0] || { ym: cur.startYm, orb: cur.peakOrb };
      localPeaks.forEach((p) => {
        if (p.orb < peak.orb) peak = p;
      });
      const months = cur.endIdx - cur.startIdx + 1;
      episodes.push({
        signature: sig,
        transit: cur.tk,
        natal: cur.nk,
        aspect: cur.key,
        startYm: cur.startYm,
        endYm: cur.endYm,
        peakYm: peak.ym,
        peakOrb: Math.round(peak.orb * 1000) / 1000,
        months,
        activeSampleCount: cur.samples.length,
        localPeaks,
        hadRetrograde: cur.hadRetrograde,
        lineKo: (PLANET_KR[cur.tk] || cur.tk) + '–' + (PLANET_KR[cur.nk] || cur.nk) + ' ' + (ASPECT_KR[cur.key] || cur.key),
      });
      cur = null;
    };

    rows.forEach((r) => {
      if (!cur) {
        cur = {
          tk: r.hit.tk, nk: r.hit.nk, key: r.hit.key,
          startIdx: r.idx, endIdx: r.idx,
          startYm: r.ym, endYm: r.ym,
          peakOrb: r.orb, hadRetrograde: r.retro,
          samples: [r],
        };
        return;
      }
      if (r.idx - cur.endIdx <= EPISODE_GAP_MAX + 1) {
        cur.endIdx = r.idx;
        cur.endYm = r.ym;
        if (r.retro) cur.hadRetrograde = true;
        if (r.orb < cur.peakOrb) cur.peakOrb = r.orb;
        cur.samples.push(r);
      } else {
        flush();
        cur = {
          tk: r.hit.tk, nk: r.hit.nk, key: r.hit.key,
          startIdx: r.idx, endIdx: r.idx,
          startYm: r.ym, endYm: r.ym,
          peakOrb: r.orb, hadRetrograde: r.retro,
          samples: [r],
        };
      }
    });
    flush();
  });
  return episodes;
}

function extractLocalPeaks(samples) {
  if (!samples.length) return [];
  const peaks = [];
  for (let i = 0; i < samples.length; i++) {
    const prev = samples[i - 1];
    const next = samples[i + 1];
    const orb = samples[i].orb;
    const isMin = (!prev || orb <= prev.orb) && (!next || orb <= next.orb);
    const motionFlip = (prev && prev.retro !== samples[i].retro) || (next && next.retro !== samples[i].retro);
    if (isMin || samples.length === 1) {
      peaks.push({
        ym: samples[i].ym,
        orb: Math.round(orb * 1000) / 1000,
        motion: samples[i].retro ? 'retrograde' : 'direct',
        nearStation: !!motionFlip,
      });
    }
  }
  // dedupe same ym
  const seen = new Set();
  return peaks.filter((p) => {
    if (seen.has(p.ym)) return false;
    seen.add(p.ym);
    return true;
  });
}

function bucketOf(ep) {
  const orb = ep.peakOrb;
  if (ep.natalAxis === 'horizon' || ep.natalAxis === 'meridian') {
    return orb <= 1.5 ? 'A' : 'C';
  }
  const nk = ep.natal;
  if (['asc', 'mc', 'dsc', 'ic', 'sun', 'moon'].includes(nk) && orb <= 1.5) return 'A';
  if (['mercury', 'venus', 'mars'].includes(nk) && orb <= 2.0) return 'B';
  return 'C';
}

function scoreC(ep) {
  return ep.months * (1 + Math.max(0, 3 - ep.peakOrb) * 0.25);
}

function ymToIndex(ym) {
  const [y, m] = String(ym).split('-').map(Number);
  return y * 12 + m;
}

function rangesOverlap(a, b, slackMo) {
  const a0 = ymToIndex(a.startYm) - slackMo;
  const a1 = ymToIndex(a.endYm) + slackMo;
  const b0 = ymToIndex(b.startYm);
  const b1 = ymToIndex(b.endYm);
  return a0 <= b1 && b0 <= a1;
}

function poleView(ep) {
  return {
    natal: ep.natal,
    aspect: ep.aspect,
    startYm: ep.startYm,
    endYm: ep.endYm,
    peakYm: ep.peakYm,
    peakOrb: ep.peakOrb,
    months: ep.months,
    activeSampleCount: ep.activeSampleCount,
    localPeaks: ep.localPeaks,
    hadRetrograde: ep.hadRetrograde,
    lineKo: ep.lineKo,
  };
}

/**
 * Merge ASC/DSC or MC/IC complementary-aspect episodes into one axis episode.
 * Both poles kept under poles[]; frees cap slots without dropping evidence.
 */
function mergeAxisEpisodes(episodes) {
  const used = new Set();
  const out = [];
  const byKey = {};
  episodes.forEach((ep, idx) => {
    const pole = AXIS_POLE[ep.natal];
    if (!pole) return;
    const mateAsp = AXIS_ASPECT_PAIR[ep.aspect];
    if (!mateAsp) return;
    const k = ep.transit + '|' + pole.axis;
    if (!byKey[k]) byKey[k] = [];
    byKey[k].push(idx);
  });

  Object.keys(byKey).forEach((k) => {
    const idxs = byKey[k];
    for (let i = 0; i < idxs.length; i++) {
      const ia = idxs[i];
      if (used.has(ia)) continue;
      const a = episodes[ia];
      const poleA = AXIS_POLE[a.natal];
      const wantAsp = AXIS_ASPECT_PAIR[a.aspect];
      let bestJ = -1;
      let bestOrb = Infinity;
      for (let j = 0; j < idxs.length; j++) {
        if (i === j) continue;
        const ib = idxs[j];
        if (used.has(ib)) continue;
        const b = episodes[ib];
        if (b.natal !== poleA.mate) continue;
        if (b.aspect !== wantAsp) continue;
        if (!rangesOverlap(a, b, 2)) continue;
        const orb = Math.min(a.peakOrb, b.peakOrb);
        if (orb < bestOrb) {
          bestOrb = orb;
          bestJ = j;
        }
      }
      if (bestJ < 0) continue;
      const ib = idxs[bestJ];
      const b = episodes[ib];
      used.add(ia);
      used.add(ib);
      const primary = a.peakOrb <= b.peakOrb ? a : b;
      const secondary = primary === a ? b : a;
      const startIdx = Math.min(ymToIndex(a.startYm), ymToIndex(b.startYm));
      const endIdx = Math.max(ymToIndex(a.endYm), ymToIndex(b.endYm));
      const startYm = a.startYm <= b.startYm ? a.startYm : b.startYm;
      const endYm = a.endYm >= b.endYm ? a.endYm : b.endYm;
      const months = endIdx - startIdx + 1;
      const axisLabel = poleA.axis === 'horizon' ? 'ASC/DSC' : 'MC/IC';
      out.push({
        signature: primary.transit + '|' + poleA.axis + '|' + a.aspect + '_' + b.aspect,
        transit: primary.transit,
        natal: primary.natal,
        natalAxis: poleA.axis,
        aspect: primary.aspect,
        startYm,
        endYm,
        peakYm: primary.peakYm,
        peakOrb: primary.peakOrb,
        months,
        activeSampleCount: Math.max(a.activeSampleCount, b.activeSampleCount),
        localPeaks: primary.localPeaks,
        hadRetrograde: !!(a.hadRetrograde || b.hadRetrograde),
        poles: [poleView(a), poleView(b)],
        lineKo: (PLANET_KR[primary.transit] || primary.transit) + '–' + axisLabel + ' 축',
        _mergedFrom: [a.signature, b.signature],
      });
      void secondary;
    }
  });

  episodes.forEach((ep, idx) => {
    if (!used.has(idx)) out.push(ep);
  });
  return { episodes: out, mergedPairs: used.size / 2 };
}

/**
 * Cap fill: axis-merged pool → B floor (default 8) → rest A then leftover B then C.
 * No hard A ceiling. No C floor. No theme scores.
 */
function compressEpisodes(episodes, cap, bFloor) {
  const floor = bFloor == null ? B_FLOOR : bFloor;
  const A = [];
  const B = [];
  const C = [];
  episodes.forEach((ep) => {
    const b = bucketOf(ep);
    if (b === 'A') A.push(ep);
    else if (b === 'B') B.push(ep);
    else C.push(ep);
  });
  const byOrbThenDur = (a, b) => a.peakOrb - b.peakOrb || b.months - a.months;
  A.sort(byOrbThenDur);
  B.sort(byOrbThenDur);
  C.sort((a, b) => scoreC(b) - scoreC(a) || a.peakOrb - b.peakOrb);

  const bTake = Math.min(floor, B.length);
  const aRoom = Math.max(0, cap - bTake);
  const out = A.slice(0, aRoom);
  out.push.apply(out, B.slice(0, bTake));
  let left = cap - out.length;
  if (left > 0 && B.length > bTake) {
    out.push.apply(out, B.slice(bTake, bTake + left));
    left = cap - out.length;
  }
  if (left > 0) {
    out.push.apply(out, C.slice(0, left));
  }
  return out;
}

function buildAiRawTimelineV1(chart, windowOpt) {
  const from = windowOpt || { y: 2026, mo: 8, months: 60 };
  const natalPack = buildNatal(chart);
  const samples = [];
  let prevHouse = null;
  let y = from.y;
  let mo = from.mo;
  for (let i = 0; i < from.months; i++) {
    const built = sampleMonth(chart, natalPack.natalDegs, y, mo);
    const progMoon = buildProgMoon(
      chart, natalPack.horoscope, natalPack.natalDegs, y, mo, prevHouse, natalPack.unknownTime
    );
    if (progMoon && progMoon.house != null) prevHouse = progMoon.house;
    samples.push({
      y, mo, ym: ymLabel(y, mo),
      hits: built.hits,
      transitMeta: built.transitMeta,
      progMoon,
    });
    mo += 1;
    if (mo > 12) { mo = 1; y += 1; }
  }

  const allEpisodes = buildEpisodesWithPeaks(samples);
  const mergedPack = mergeAxisEpisodes(allEpisodes);
  const transitEpisodes = compressEpisodes(mergedPack.episodes, CAP, B_FLOOR);

  const progMoonEvents = [];
  if (!natalPack.unknownTime) {
    samples.forEach((s) => {
      if (s.progMoon && s.progMoon.houseChanged) {
        progMoonEvents.push({
          ym: s.ym,
          type: 'houseEnter',
          house: s.progMoon.house,
          fromHouse: s.progMoon.prevHouse,
          aspects: s.progMoon.aspects || [],
        });
      }
    });
  }

  const natalOut = { bodies: natalPack.bodies };
  if (!natalPack.unknownTime) {
    natalOut.angles = natalPack.angles;
    natalOut.houses = natalPack.houses;
  }

  return {
    version: 'ai-raw-timeline-v1',
    purpose: 'fiveYear',
    chartMeta: {
      id: chart.id,
      birth: {
        y: chart.y, mo: chart.mo, da: chart.da,
        hh: natalPack.unknownTime ? null : chart.hh,
        mi: natalPack.unknownTime ? null : chart.mi,
        unknownTime: natalPack.unknownTime,
      },
      place: { name: chart.place || null, lat: chart.lat, lng: chart.lng },
      timezone: chart.timezone || 'Asia/Seoul',
      zodiac: 'tropical',
      houseSystem: 'placidus',
      approxAgeAtWindowStart: from.y - chart.y,
    },
    window: {
      fromYm: samples[0].ym,
      toYm: samples[samples.length - 1].ym,
      months: samples.length,
      resolution: 'monthly',
    },
    natal: natalOut,
    timingPlanets: TIMING_PLANETS.slice(),
    transitEpisodes,
    progMoonEvents,
    deliberatelyOmitted: [
      'rawThemes', 'Top1/Top2', 'period headlines', 'themeGate', 'monthHitIndex',
    ],
    _debug: {
      episodesBeforeCap: allEpisodes.length,
      episodesAfterAxisMerge: mergedPack.episodes.length,
      axisMergedPairs: mergedPack.mergedPairs,
      episodesAfterCap: transitEpisodes.length,
      bucketCountsBeforeMerge: {
        A: allEpisodes.filter((e) => bucketOf(e) === 'A').length,
        B: allEpisodes.filter((e) => bucketOf(e) === 'B').length,
        C: allEpisodes.filter((e) => bucketOf(e) === 'C').length,
      },
      bucketCountsAfterMerge: {
        A: mergedPack.episodes.filter((e) => bucketOf(e) === 'A').length,
        B: mergedPack.episodes.filter((e) => bucketOf(e) === 'B').length,
        C: mergedPack.episodes.filter((e) => bucketOf(e) === 'C').length,
      },
      bucketCounts: {
        A: transitEpisodes.filter((e) => bucketOf(e) === 'A').length,
        B: transitEpisodes.filter((e) => bucketOf(e) === 'B').length,
        C: transitEpisodes.filter((e) => bucketOf(e) === 'C').length,
      },
      bFloor: B_FLOOR,
    },
  };
}

function stripDebug(payload) {
  const o = Object.assign({}, payload);
  delete o._debug;
  return o;
}

function schemaCheck(payload) {
  const missing = [];
  ['version', 'purpose', 'chartMeta', 'window', 'natal', 'timingPlanets', 'transitEpisodes', 'progMoonEvents', 'deliberatelyOmitted']
    .forEach((k) => { if (payload[k] == null) missing.push(k); });
  if (payload.chartMeta) {
    ['timezone', 'zodiac', 'houseSystem'].forEach((k) => {
      if (!payload.chartMeta[k]) missing.push('chartMeta.' + k);
    });
  }
  if (payload.transitEpisodes && payload.transitEpisodes[0]) {
    const e = payload.transitEpisodes[0];
    ['activeSampleCount', 'localPeaks', 'peakYm', 'peakOrb'].forEach((k) => {
      if (e[k] == null) missing.push('episode.' + k);
    });
    if (e.localPeaks && e.localPeaks[0]) {
      ['motion', 'nearStation'].forEach((k) => {
        if (e.localPeaks[0][k] == null) missing.push('localPeaks.' + k);
      });
    }
  }
  const forbidden = [];
  if (payload.rawThemes || payload.themeGate || payload.themeChips) {
    ['rawThemes', 'themeGate', 'themeChips'].forEach((k) => {
      if (payload[k] != null) forbidden.push(k);
    });
  }
  if (payload.periods) forbidden.push('periods');
  return { missing, forbidden, ok: missing.length === 0 && forbidden.length === 0 };
}

global.AiRawTimelineV1 = {
  build: buildAiRawTimelineV1,
  stripDebug: stripDebug,
  schemaCheck: schemaCheck,
  bucketOf: bucketOf,
  CAP: CAP,
  B_FLOOR: B_FLOOR,
  VERSION: 'compression-v1.2',
};

})(typeof window !== 'undefined' ? window : global);
