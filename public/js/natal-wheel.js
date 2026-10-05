/**
 * 팔자연구소 네이탈 차트 원판 (직접 그리는 SVG)
 * - 별자리·행성 기호는 astrochart 라이브러리의 벡터 기호(getSymbol)를 빌려 써서 글꼴과 무관하게 같은 모양으로 나와요.
 * - 바깥 별자리 링(원소 색) · 1°/5°/10° 눈금 · 행성(기호·도·별자리·분) · 하우스 · ASC/MC 축 · 어스펙트 선
 * window.PaljaNatalWheel.draw(paperId, size, data)
 *   data = { points: [{key, lon, retro}], cusps: [12 lon], aspectKeys: [...], compact?: bool }
 */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  var SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  // 원소: 불·흙·바람·물 순환
  var EL_FILL = ['#fbe8e3', '#ecf2e3', '#fdf5df', '#e6eef8'];
  var EL_INK = ['#c8412f', '#4f7d32', '#b88a1c', '#2f68ad'];
  var INK = '#2b2118';
  var LINE = '#5b4a38';
  var SOFT = '#b9a68c';

  // 라이브러리 기호 이름
  var SYMBOL = {
    sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
    jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
    chiron: 'Chiron', northnode: 'NNode', southnode: 'SNode', lilith: 'Lilith', fortune: 'Fortune'
  };
  // 어스펙트 선 (합은 선 대신 행성이 붙어 보이므로 생략)
  var ASPECTS = [
    { key: 'opposition', a: 180, orb: 8, tense: true },
    { key: 'square', a: 90, orb: 7, tense: true },
    { key: 'trine', a: 120, orb: 7, tense: false },
    { key: 'sextile', a: 60, orb: 5, tense: false }
  ];

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, String(attrs[k])); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function norm(d) { return ((d % 360) + 360) % 360; }
  function angDiff(a, b) { var d = Math.abs(norm(a) - norm(b)); return d > 180 ? 360 - d : d; }

  function draw(paperId, size, data) {
    var paper = document.getElementById(paperId);
    if (!paper || !global.astrochart || !data || !data.cusps || data.cusps.length !== 12) return false;
    paper.innerHTML = '';
    var S = size;
    var compact = data.compact != null ? data.compact : S < 470;
    // 라이브러리로 빈 SVG와 기호 도구만 만든다 (원판은 직접 그림)
    var chart = new global.astrochart.Chart(paperId, S, S, { SYMBOL_SCALE: 1, COLOR_BACKGROUND: 'transparent' });
    var lib = chart.paper;
    var svg = lib.root;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + S + ' ' + S);
    svg.setAttribute('font-family', "'Pretendard Variable', Pretendard, -apple-system, 'Noto Sans KR', sans-serif");

    var c = S / 2;
    var asc = norm(data.cusps[0]);
    var mc = norm(data.cusps[9]);
    var u = S / 600; // 기준 600px 대비 배율
    function fs(px, min) { return Math.max(px * u, min || 0).toFixed(2); }

    var R_out = S / 2 - Math.max(26 * u, 24);  // 별자리 링 바깥 (축 이름 자리 확보)
    var R_z = R_out - 40 * u;           // 별자리 링 안쪽
    var R_t = R_z - 13 * u;             // 눈금 끝
    var R_h = R_out * (compact ? 0.47 : 0.5);   // 하우스 번호 링 바깥
    var R_i = R_h - 20 * u;             // 어스펙트 원
    var R_g = R_t - (compact ? 14 : 16) * u; // 행성 기호 링
    // 행성·도수 라벨이 차지하는 구간 (이 구간만 축선을 끊음)
    var R_gapIn = Math.max(R_h, R_g - (compact ? 26 : 74) * u);
    var R_gapOut = R_z;

    function ang(lon) { return Math.PI + (norm(lon) - asc) * Math.PI / 180; }
    function pt(lon, r) { var t = ang(lon); return { x: c + r * Math.cos(t), y: c - r * Math.sin(t) }; }
    function line(lon, r1, r2, attrs, parent) {
      var a = pt(lon, r1), b = pt(lon, r2);
      return el('line', Object.assign({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, attrs || {}), parent);
    }
    function text(x, y, s, attrs, parent) {
      var t = el('text', Object.assign({ x: x, y: y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, attrs || {}), parent);
      t.textContent = s;
      return t;
    }
    function symbol(name, x, y, color, scale, parent) {
      var g = lib.getSymbol(name, x, y);
      if (!g) return null;
      var sc = scale || 1;
      if (sc !== 1) g.setAttribute('transform', 'translate(' + (x - x * sc) + ',' + (y - y * sc) + ') scale(' + sc + ')');
      g.querySelectorAll('path,circle,line,polyline').forEach(function (p) {
        p.setAttribute('stroke', color);
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke-width', String(1.6 / sc));
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('stroke-linejoin', 'round');
      });
      (parent || svg).appendChild(g);
      return g;
    }
    function arc(r1, r2, lon1, lon2, attrs, parent) {
      // lon1→lon2 반시계(황도 순) 고리 조각
      var a1 = pt(lon1, r1), a2 = pt(lon2, r1), b2 = pt(lon2, r2), b1 = pt(lon1, r2);
      var d = 'M' + a1.x + ',' + a1.y + ' A' + r1 + ',' + r1 + ' 0 0 0 ' + a2.x + ',' + a2.y +
        ' L' + b2.x + ',' + b2.y + ' A' + r2 + ',' + r2 + ' 0 0 1 ' + b1.x + ',' + b1.y + ' Z';
      return el('path', Object.assign({ d: d }, attrs || {}), parent);
    }

    var gBg = el('g', {}, svg);
    el('circle', { cx: c, cy: c, r: R_out, fill: '#fffdf8', stroke: 'none' }, gBg);

    // ── 별자리 링 ──
    var gZ = el('g', {}, svg);
    for (var i = 0; i < 12; i++) {
      var e4 = i % 4;
      arc(R_out, R_z, i * 30, i * 30 + 30, { fill: EL_FILL[e4], stroke: 'none' }, gZ);
      line(i * 30, R_t, R_out, { stroke: LINE, 'stroke-width': 1 * u }, gZ);
      var mid = pt(i * 30 + 15, (R_out + R_z) / 2);
      symbol(SIGN_NAMES[i], mid.x, mid.y, EL_INK[e4], Math.max(1.15 * u, 0.62), gZ);
    }
    el('circle', { cx: c, cy: c, r: R_out, fill: 'none', stroke: INK, 'stroke-width': 1.6 * u }, gZ);
    el('circle', { cx: c, cy: c, r: R_z, fill: 'none', stroke: LINE, 'stroke-width': 1.1 * u }, gZ);

    // ── 도수 눈금 ──
    var gT = el('g', { stroke: SOFT }, svg);
    for (var dgr = 0; dgr < 360; dgr++) {
      var len = dgr % 10 === 0 ? 10 : dgr % 5 === 0 ? 7 : 4;
      line(dgr, R_z, R_z - len * u, { 'stroke-width': Math.max((dgr % 5 === 0 ? 1.1 : 0.7) * u, 0.5), stroke: dgr % 5 === 0 ? LINE : '#a8957a' }, gT);
    }

    // ── 하우스 ──
    // 어스펙트 원(가운데 그리드)에는 굵은 축을 그리지 않음.
    // 하우스 링 ↔ 별자리 링으로 굵게 잇되, 행성·도수 구간(R_gapIn~R_gapOut)만 비움.
    var gH = el('g', {}, svg);
    el('circle', { cx: c, cy: c, r: R_h, fill: '#fbf6ec', stroke: LINE, 'stroke-width': 1 * u }, gH);
    el('circle', { cx: c, cy: c, r: R_i, fill: '#ffffff', stroke: LINE, 'stroke-width': 1 * u }, gH);
    for (var h = 0; h < 12; h++) {
      var cu = data.cusps[h];
      var axis = h === 0 || h === 3 || h === 6 || h === 9;
      if (axis) {
        if (R_gapIn > R_i + 1) {
          line(cu, R_i, R_gapIn, { stroke: INK, 'stroke-width': 2.6 * u }, gH);
        }
        if (R_out > R_gapOut + 1) {
          line(cu, R_gapOut, R_out, { stroke: INK, 'stroke-width': 2.6 * u }, gH);
        }
      } else {
        if (R_gapIn > R_i + 1) {
          line(cu, R_i, R_gapIn, { stroke: LINE, 'stroke-width': 0.9 * u, 'stroke-opacity': 0.75 }, gH);
        }
      }
      var next = data.cusps[(h + 1) % 12];
      var span = norm(next - cu);
      var hm = pt(cu + span / 2, (R_h + R_i) / 2);
      text(hm.x, hm.y, String(h + 1), { 'font-size': fs(11, 8), fill: '#8a7558', 'font-weight': 600 }, gH);
    }

    // ── 축 이름 (ASC·DSC·MC·IC) — 바깥 여백 (행성 링과 겹치지 않게) ──
    var gA = el('g', {}, svg);
    function fmtDM(lon) {
      var d = norm(lon) % 30; var w = Math.floor(d); var m = Math.floor((d - w) * 60 + 1e-6);
      return w + '°' + String(m).padStart(2, '0') + "'";
    }
    [['ASC', data.cusps[0]], ['DSC', data.cusps[6]], ['MC', data.cusps[9]], ['IC', data.cusps[3]]].forEach(function (a) {
      var p = pt(a[1], R_out + Math.max(13 * u, 12));
      text(p.x, p.y, a[0], { 'font-size': fs(11, 8), 'font-weight': 800, fill: INK }, gA);
      if (!compact && (a[0] === 'ASC' || a[0] === 'MC')) {
        var q = pt(a[1] + (a[0] === 'ASC' ? -5.5 : 5.5), R_out + Math.max(13 * u, 12));
        var si = Math.floor(norm(a[1]) / 30);
        text(q.x, q.y, fmtDM(a[1]), { 'font-size': fs(10, 8), 'font-weight': 700, fill: EL_INK[si % 4] }, gA);
      }
    });

    // ── 행성 배치 (겹치지 않게 펼치기) ──
    var pts = (data.points || []).filter(function (p) { return p && isFinite(p.lon) && SYMBOL[p.key]; })
      .map(function (p) { return { key: p.key, lon: norm(p.lon), retro: !!p.retro, minor: !!p.minor, disp: norm(p.lon) }; })
      .sort(function (a, b) { return a.lon - b.lon; });
    var minSep = (compact ? Math.max(34 * u, 19) : 34 * u) / R_g * 180 / Math.PI;
    spread(pts, minSep);

    var gP = el('g', {}, svg);
    pts.forEach(function (p) {
      // 실제 위치 표시: 눈금 링 안쪽 짧은 점선 + 기호까지 가는 선
      line(p.lon, R_z, R_t - 2 * u, { stroke: INK, 'stroke-width': 1.4 * u }, gP);
      var a = pt(p.lon, R_t - 2 * u), b = pt(p.disp, R_g + 10 * u);
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: SOFT, 'stroke-width': 0.8 * u }, gP);
      var g = pt(p.disp, R_g);
      // 보조점(남교점·행운점)은 연한 색·조금 작게
      var ink = p.minor ? '#8a7558' : INK;
      var gs = compact ? Math.max(0.95 * u, 0.68) : 1.1 * u;
      symbol(SYMBOL[p.key], g.x, g.y, ink, p.minor ? gs * 0.88 : gs, gP);
      var si = Math.floor(p.lon / 30);
      var d = p.lon % 30; var w = Math.floor(d); var m = Math.floor((d - w) * 60 + 1e-6);
      if (compact) {
        var t1 = pt(p.disp, R_g - Math.max(19 * u, 13));
        text(t1.x, t1.y, w + '°' + (p.retro ? 'R' : ''), { 'font-size': fs(10, 8.5), 'font-weight': 700, fill: p.retro ? '#c8412f' : ink }, gP);
      } else {
        var t1b = pt(p.disp, R_g - 23 * u);
        text(t1b.x, t1b.y, w + '°', { 'font-size': 12 * u, 'font-weight': 700, fill: ink }, gP);
        var t2 = pt(p.disp, R_g - 41 * u);
        symbol(SIGN_NAMES[si], t2.x, t2.y, EL_INK[si % 4], 0.62 * u, gP);
        var t3 = pt(p.disp, R_g - 58 * u);
        text(t3.x, t3.y, String(m).padStart(2, '0') + "'", { 'font-size': 10.5 * u, fill: '#5d4c3a' }, gP);
        if (p.retro) {
          var tr = pt(p.disp, R_g - 70 * u);
          text(tr.x, tr.y, 'R', { 'font-size': 9.5 * u, 'font-weight': 700, fill: '#c8412f' }, gP);
        }
      }
    });

    // ── 어스펙트 선 ──
    var gL = el('g', {}, svg);
    var aspPts = pts.filter(function (p) { return (data.aspectKeys || []).indexOf(p.key) >= 0; })
      .map(function (p) { return { key: p.key, lon: p.lon }; });
    if (data.withAngles) {
      aspPts.push({ key: 'asc', lon: asc });
      aspPts.push({ key: 'mc', lon: mc });
    }
    for (var x1 = 0; x1 < aspPts.length; x1++) {
      for (var x2 = x1 + 1; x2 < aspPts.length; x2++) {
        // ASC–MC 축끼리만 선 생략 (행성–축·행성–행성은 그림)
        var kA = aspPts[x1].key, kB = aspPts[x2].key;
        if ((kA === 'asc' || kA === 'mc') && (kB === 'asc' || kB === 'mc')) continue;
        var diff = angDiff(aspPts[x1].lon, aspPts[x2].lon);
        for (var k = 0; k < ASPECTS.length; k++) {
          var A = ASPECTS[k];
          var off = Math.abs(diff - A.a);
          if (off > A.orb) continue;
          var p1 = pt(aspPts[x1].lon, R_i - 1), p2 = pt(aspPts[x2].lon, R_i - 1);
          var tight = 1 - off / A.orb;
          el('line', {
            x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
            stroke: A.tense ? '#d2463a' : '#2f68ad',
            'stroke-width': ((0.7 + 1.6 * tight) * u).toFixed(2),
            'stroke-opacity': (0.45 + 0.5 * tight).toFixed(2),
            'stroke-dasharray': off > A.orb * 0.6 ? (4 * u) + ',' + (3 * u) : 'none'
          }, gL);
          break;
        }
      }
    }
    return true;
  }

  /** 각도 순으로 정렬된 점들을 최소 간격 이상으로 벌린다 (원형) */
  function spread(pts, sep) {
    var n = pts.length;
    if (n < 2) return;
    if (sep * n > 330) sep = 330 / n;
    for (var it = 0; it < 120; it++) {
      var moved = false;
      for (var i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        var gap = norm(b.disp - a.disp);
        if (n === 2 && gap > 180) continue;
        if (gap < sep) {
          var push = (sep - gap) / 2 + 0.01;
          a.disp = norm(a.disp - push);
          b.disp = norm(b.disp + push);
          moved = true;
        }
      }
      if (!moved) break;
    }
    // 실제 위치에서 너무 멀어지지 않게(최대 25°) 묶음 중심 유지
    pts.forEach(function (p) {
      var d = norm(p.disp - p.lon); if (d > 180) d -= 360;
      if (d > 25) p.disp = norm(p.lon + 25);
      if (d < -25) p.disp = norm(p.lon - 25);
    });
  }

  global.PaljaNatalWheel = { draw: draw };
})(typeof window !== 'undefined' ? window : globalThis);
