/**
 * 팔자연구소 네이탈 차트 원판 (직접 그리는 SVG)
 * - 별자리·행성 기호는 astrochart 라이브러리의 벡터 기호(getSymbol)를 빌려 씀
 * - Astro-Seek식: 바깥 얇은 밴드에 기호+도수, 겹치면 각도만 살짝 펼침(짧은 연결선)
 * - ASC/MC 굵은 축은 전체를 그리되, 행성 기호와 겹치는 구간만 살짝 띄움
 * window.PaljaNatalWheel.draw(paperId, size, data)
 */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  var SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  var EL_FILL = ['#fbe8e3', '#ecf2e3', '#fdf5df', '#e6eef8'];
  var EL_INK = ['#c8412f', '#4f7d32', '#b88a1c', '#2f68ad'];
  var INK = '#2b2118';
  var LINE = '#5b4a38';
  var SOFT = '#b9a68c';
  var PAPER = '#fffdf8';

  var SYMBOL = {
    sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
    jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
    chiron: 'Chiron', northnode: 'NNode', southnode: 'SNode', lilith: 'Lilith', fortune: 'Fortune'
  };
  // 원차트 안쪽 선: 읽는 순서 위주(태양·달·ASC 강조 + 개인·사회 행성)
  // 메이저 5각만. 천왕·해왕·명왕·보조점은 오른쪽 표/행성표에서 봄.
  var ASPECTS = [
    { key: 'conjunction', a: 0, orb: 8, color: '#888888' },
    { key: 'opposition', a: 180, orb: 8, color: '#c0392b' },
    { key: 'square', a: 90, orb: 7, color: '#e74c3c' },
    { key: 'trine', a: 120, orb: 7, color: '#2980b9' },
    { key: 'sextile', a: 60, orb: 5, color: '#27ae60' }
  ];
  var ASPECT_FOCUS = { sun: 1, moon: 1, asc: 1 };

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
    var chart = new global.astrochart.Chart(paperId, S, S, { SYMBOL_SCALE: 1, COLOR_BACKGROUND: 'transparent' });
    var lib = chart.paper;
    var svg = lib.root;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + S + ' ' + S);
    svg.setAttribute('font-family', "'Pretendard Variable', Pretendard, -apple-system, 'Noto Sans KR', sans-serif");

    var c = S / 2;
    var asc = norm(data.cusps[0]);
    var mc = norm(data.cusps[9]);
    var u = S / 600;
    function fs(px, min) { return Math.max(px * u, min || 0).toFixed(2); }

    var R_out = S / 2 - Math.max(26 * u, 24);
    var R_z = R_out - 40 * u;
    var R_t = R_z - 13 * u;
    var R_h = R_out * (compact ? 0.44 : 0.47);   // 하우스 링을 조금 안쪽으로 — 행성 라벨 여유
    var R_i = R_h - 20 * u;
    var R_g = R_t - (compact ? 11 : 13) * u; // 행성 기호
    var R_deg = R_g - (compact ? Math.max(18 * u, 14) : 22 * u); // 2°
    var R_sign = R_deg - (compact ? 17 : 21) * u; // 별자리
    var R_min = R_sign - (compact ? 16 : 21) * u; // 43' (별자리 기호와 겹치지 않게 간격 넓힘)
    var R_lab = R_min; // 축 틈: 기호~분

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
      var a1 = pt(lon1, r1), a2 = pt(lon2, r1), b2 = pt(lon2, r2), b1 = pt(lon1, r2);
      var d = 'M' + a1.x + ',' + a1.y + ' A' + r1 + ',' + r1 + ' 0 0 0 ' + a2.x + ',' + a2.y +
        ' L' + b2.x + ',' + b2.y + ' A' + r2 + ',' + r2 + ' 0 0 1 ' + b1.x + ',' + b1.y + ' Z';
      return el('path', Object.assign({ d: d }, attrs || {}), parent);
    }
    /** 반지름 구간 [r0,r1]을 gaps(로·hi)만큼 끊어서 선분으로 그림 */
    function lineGaps(lon, r0, r1, gaps, attrs, parent) {
      var lo = Math.min(r0, r1), hi = Math.max(r0, r1);
      var cuts = (gaps || []).map(function (g) {
        return { lo: Math.max(lo, Math.min(g.lo, g.hi)), hi: Math.min(hi, Math.max(g.lo, g.hi)) };
      }).filter(function (g) { return g.hi - g.lo > 1; })
        .sort(function (a, b) { return a.lo - b.lo; });
      var merged = [];
      cuts.forEach(function (g) {
        var last = merged[merged.length - 1];
        if (!last || g.lo > last.hi + 0.5) merged.push({ lo: g.lo, hi: g.hi });
        else last.hi = Math.max(last.hi, g.hi);
      });
      var cursor = lo;
      merged.forEach(function (g) {
        if (g.lo - cursor > 1) line(lon, cursor, g.lo, attrs, parent);
        cursor = Math.max(cursor, g.hi);
      });
      if (hi - cursor > 1) line(lon, cursor, hi, attrs, parent);
    }

    var gBg = el('g', {}, svg);
    el('circle', { cx: c, cy: c, r: R_out, fill: PAPER, stroke: 'none' }, gBg);

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

    // ── 행성 위치 계산(축 틈 계산에 먼저 필요) ──
    // Astro-Seek처럼 바깥 밴드에 기호+도수만 두고, 겹치면 각도만 살짝 펼침
    var pts = (data.points || []).filter(function (p) { return p && isFinite(p.lon) && SYMBOL[p.key]; })
      .map(function (p) { return { key: p.key, lon: norm(p.lon), retro: !!p.retro, minor: !!p.minor, disp: norm(p.lon) }; })
      .sort(function (a, b) { return a.lon - b.lon; });
    // 겹치지 않을 만큼만 최소로 벌려요(제 각도에서 크게 꺾이지 않게)
    var minSep = compact
      ? Math.max(26 * u, 17) / R_g * 180 / Math.PI
      : Math.max(21 * u / R_g, 16 * u / R_min) * 180 / Math.PI;
    spread(pts, minSep); // 보통은 조금만 움직이고, 행성이 아주 몰린 차트에서만 더 벌어져요

    // ── 하우스 + 축 ──
    var gH = el('g', {}, svg);
    el('circle', { cx: c, cy: c, r: R_h, fill: '#fbf6ec', stroke: LINE, 'stroke-width': 1 * u }, gH);
    el('circle', { cx: c, cy: c, r: R_i, fill: '#ffffff', stroke: LINE, 'stroke-width': 1 * u }, gH);

    var axisPad = Math.max(11 * u, 9);
    function planetGapsNear(axisLon) {
      var gaps = [];
      pts.forEach(function (p) {
        if (angDiff(p.disp, axisLon) > 4.2 && angDiff(p.lon, axisLon) > 3.2) return;
        // 행성 기호·도수·별자리 있는 반지름만 살짝 띄움
        gaps.push({ lo: R_min - axisPad, hi: R_g + axisPad });
      });
      return gaps;
    }

    for (var h = 0; h < 12; h++) {
      var cu = data.cusps[h];
      var axis = h === 0 || h === 3 || h === 6 || h === 9;
      if (axis) {
        // 가운데 어스펙트 원(R_i 안)에는 ASC/MC/IC 굵은 선 없음 — 하우스~외곽만
        lineGaps(cu, R_i, R_out, planetGapsNear(cu), { stroke: INK, 'stroke-width': 2.6 * u }, gH);
      } else {
        line(cu, R_i, R_z, { stroke: LINE, 'stroke-width': 0.9 * u, 'stroke-opacity': 0.75 }, gH);
      }
      var next = data.cusps[(h + 1) % 12];
      var span = norm(next - cu);
      var hm = pt(cu + span / 2, (R_h + R_i) / 2);
      text(hm.x, hm.y, String(h + 1), { 'font-size': fs(11, 8), fill: '#8a7558', 'font-weight': 600 }, gH);
    }

    // ── 축 이름 (바깥) ──
    var gA = el('g', {}, svg);
    function fmtDM(lon) {
      var d = norm(lon) % 30; var w = Math.floor(d); var m = Math.floor((d - w) * 60 + 1e-6);
      return w + '°' + String(m).padStart(2, '0') + "'";
    }
    [['ASC', data.cusps[0]], ['DSC', data.cusps[6]], ['MC', data.cusps[9]], ['IC', data.cusps[3]]].forEach(function (a) {
      var p = pt(a[1], R_out + Math.max(13 * u, 12));
      text(p.x, p.y, a[0], {
        'font-size': fs(11, 8), 'font-weight': 800, fill: INK,
        stroke: PAPER, 'stroke-width': 4 * u, 'paint-order': 'stroke fill'
      }, gA);
      if (!compact && (a[0] === 'ASC' || a[0] === 'MC')) {
        // 축 도수는 이름 위(아래)에 — 화면 밖으로 잘리지 않게 가장자리에서 안쪽으로 맞춤
        var si = Math.floor(norm(a[1]) / 30);
        var dy = (p.y < c ? 1 : -1) * 13 * u;
        var qx = p.x, anchor = 'middle', half = 18 * u;
        if (qx - half < 2) { qx = 2; anchor = 'start'; }
        else if (qx + half > S - 2) { qx = S - 2; anchor = 'end'; }
        var qy = a[0] === 'MC' ? p.y : p.y + (Math.abs(p.y - c) < 40 * u ? -13 * u : dy);
        if (a[0] === 'MC') { qx = p.x + (p.x < c ? -22 * u : 22 * u); anchor = p.x < c ? 'end' : 'start'; }
        text(qx, qy, fmtDM(a[1]), {
          'font-size': fs(10, 8), 'font-weight': 700, fill: EL_INK[si % 4], 'text-anchor': anchor,
          stroke: PAPER, 'stroke-width': 3.5 * u, 'paint-order': 'stroke fill'
        }, gA);
      }
    });

    // ── 행성 그리기 ──
    var gP = el('g', {}, svg);
    pts.forEach(function (p) {
      line(p.lon, R_z, R_t - 2 * u, { stroke: INK, 'stroke-width': 1.4 * u }, gP);
      // 어스펙트 원 위에도 실제 도수 표시(작은 눈금) — 선이 이 점에서 출발해요
      line(p.lon, R_i, R_i + 5 * u, { stroke: p.minor ? SOFT : INK, 'stroke-width': 1.2 * u }, gP);
      var a = pt(p.lon, R_t - 2 * u), b = pt(p.disp, R_g + 6 * u);
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: SOFT, 'stroke-width': 0.85 * u }, gP);

      var g = pt(p.disp, R_g);
      el('circle', { cx: g.x, cy: g.y, r: Math.max(8.5 * u, 7), fill: PAPER, stroke: 'none' }, gP);
      var ink = p.minor ? '#8a7558' : INK;
      var gs = compact ? Math.max(0.9 * u, 0.64) : 1.0 * u;
      symbol(SYMBOL[p.key], g.x, g.y, ink, p.minor ? gs * 0.88 : gs, gP);

      var si = Math.floor(p.lon / 30);
      var d = p.lon % 30; var w = Math.floor(d); var m = Math.floor((d - w) * 60 + 1e-6);
      if (compact) {
        // 모바일: 기호 + 도(역행 R)만 — 작은 화면에서 글자가 겹치지 않게
        var tc = pt(p.disp, R_deg);
        el('circle', { cx: tc.x, cy: tc.y, r: Math.max(6.5 * u, 6), fill: PAPER, stroke: 'none' }, gP);
        text(tc.x, tc.y, w + '°' + (p.retro ? 'R' : ''), {
          'font-size': fs(10, 9), 'font-weight': 700, fill: p.retro ? '#c8412f' : ink,
          stroke: PAPER, 'stroke-width': 2.4 * u, 'paint-order': 'stroke fill'
        }, gP);
        return;
      }
      // Astro-Seek식: 도 / 별자리 / 분을 위아래로 따로 (간격 확보)
      var tDeg = pt(p.disp, R_deg);
      el('circle', { cx: tDeg.x, cy: tDeg.y, r: Math.max(6.5 * u, 5.5), fill: PAPER, stroke: 'none' }, gP);
      text(tDeg.x, tDeg.y, w + '°', {
        'font-size': fs(compact ? 9.5 : 11, 8),
        'font-weight': 700,
        fill: ink,
        stroke: PAPER, 'stroke-width': 2.4 * u, 'paint-order': 'stroke fill'
      }, gP);

      var tSign = pt(p.disp, R_sign);
      el('circle', { cx: tSign.x, cy: tSign.y, r: Math.max(6.5 * u, 5.5), fill: PAPER, stroke: 'none' }, gP);
      symbol(SIGN_NAMES[si], tSign.x, tSign.y, EL_INK[si % 4], (compact ? 0.52 : 0.58) * u, gP);

      var tMin = pt(p.disp, R_min);
      el('circle', { cx: tMin.x, cy: tMin.y, r: Math.max(6.5 * u, 5.5), fill: PAPER, stroke: 'none' }, gP);
      text(tMin.x, tMin.y, String(m).padStart(2, '0') + "'" + (p.retro ? 'R' : ''), {
        'font-size': fs(compact ? 9 : 10, 7.5),
        'font-weight': 600,
        fill: p.retro ? '#c8412f' : '#5d4c3a',
        stroke: PAPER, 'stroke-width': 2.2 * u, 'paint-order': 'stroke fill'
      }, gP);
    });

    // ── 어스펙트 선 (읽는 핵심만) ──
    var gL = el('g', {}, svg);
    var OUTER = { uranus: 1, neptune: 1, pluto: 1 };
    var aspPts = pts.filter(function (p) { return (data.aspectKeys || []).indexOf(p.key) >= 0 || OUTER[p.key]; })
      .map(function (p) { return { key: p.key, lon: p.lon }; });
    if (data.withAngles) {
      aspPts.push({ key: 'asc', lon: asc });
      aspPts.push({ key: 'mc', lon: mc });
    }
    for (var x1 = 0; x1 < aspPts.length; x1++) {
      for (var x2 = x1 + 1; x2 < aspPts.length; x2++) {
        var kA = aspPts[x1].key, kB = aspPts[x2].key;
        if ((kA === 'asc' || kA === 'mc') && (kB === 'asc' || kB === 'mc')) continue;
        var diff = angDiff(aspPts[x1].lon, aspPts[x2].lon);
        for (var k = 0; k < ASPECTS.length; k++) {
          var A = ASPECTS[k];
          var off = Math.abs(diff - A.a);
          if (off > A.orb) continue;
          if (A.key === 'conjunction') break; // 합은 행성이 붙어 보이니 선 생략
          // 천왕·해왕·명왕은 개인 행성·축과 3° 이내로 정확할 때만 (세대 공통 각 생략)
          var outerA = OUTER[kA], outerB = OUTER[kB];
          if ((outerA && outerB) || ((outerA || outerB) && off > 3)) break;
          var focus = !!(ASPECT_FOCUS[kA] || ASPECT_FOCUS[kB]);
          var tight = 1 - off / A.orb; // 1 = 정확
          var p1 = pt(aspPts[x1].lon, R_i - 1), p2 = pt(aspPts[x2].lon, R_i - 1);
          // 정확할수록 굵고 진하게, 느슨하면 가늘고 점선 (Astro-Seek식 강약)
          el('line', {
            x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
            stroke: A.color,
            'stroke-width': ((0.8 + 2.4 * tight * tight + (focus ? 0.35 : 0)) * u).toFixed(2),
            'stroke-opacity': (0.5 + 0.45 * tight).toFixed(2),
            'stroke-dasharray': tight < 0.4 ? (4 * u).toFixed(1) + ',' + (3 * u).toFixed(1) : 'none',
            'stroke-linecap': 'round'
          }, gL);
          break;
        }
      }
    }
    return true;
  }

  /**
   * 겹치는 행성을 각도로만 최소한 벌린다.
   * 가까운 행성끼리 묶음을 만들고, 묶음 안에서 sep 간격으로 고르게 놓되 묶음의 중심은 실제 위치 평균에 둔다.
   * 묶음끼리 다시 닿으면 합쳐서 반복 — 보통 차트는 1~3°만 움직이고, 아주 몰린 차트만 크게 벌어져요.
   */
  function spread(pts, sep) {
    var n = pts.length;
    if (n < 2) return;
    if (sep * n > 340) sep = 340 / n;
    // 가장 넓은 빈틈 다음부터 시작해서 원을 일렬로 편다
    var order = pts.slice().sort(function (a, b) { return a.lon - b.lon; });
    var bestGap = -1, start = 0;
    for (var i = 0; i < n; i++) {
      var g = norm(order[(i + 1) % n].lon - order[i].lon);
      if (n === 1) g = 360;
      if (g > bestGap) { bestGap = g; start = (i + 1) % n; }
    }
    var base = order[start].lon;
    var lin = [];
    for (var k = 0; k < n; k++) {
      var p = order[(start + k) % n];
      lin.push({ p: p, x: norm(p.lon - base) });
    }
    // 묶음 만들기
    var groups = lin.map(function (o) { return { items: [o], center: o.x }; });
    function place(gr) {
      var m = gr.items.reduce(function (s0, o) { return s0 + o.x; }, 0) / gr.items.length;
      gr.start = m - sep * (gr.items.length - 1) / 2;
      gr.end = gr.start + sep * (gr.items.length - 1);
    }
    groups.forEach(place);
    var changed = true;
    while (changed) {
      changed = false;
      for (var gi = 0; gi < groups.length - 1; gi++) {
        if (groups[gi + 1].start - groups[gi].end < sep - 1e-6) {
          groups[gi].items = groups[gi].items.concat(groups[gi + 1].items);
          groups.splice(gi + 1, 1);
          place(groups[gi]);
          changed = true;
          break;
        }
      }
      // 처음과 끝 묶음이 원을 돌아 닿는 경우
      if (!changed && groups.length > 1) {
        var first = groups[0], last = groups[groups.length - 1];
        if (first.start + 360 - last.end < sep - 1e-6) {
          first.items.forEach(function (o) { o.x += 360; });
          last.items = last.items.concat(first.items);
          groups.shift();
          place(last);
          changed = true;
        }
      }
    }
    groups.forEach(function (gr) {
      gr.items.forEach(function (o, idx) {
        o.p.disp = norm(base + gr.start + idx * sep);
      });
    });
  }

  global.PaljaNatalWheel = { draw: draw };
})(typeof window !== 'undefined' ? window : globalThis);
