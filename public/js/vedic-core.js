/**
 * 베다(항성황도) 차트 계산 코어
 * - 입력: circular-natal-horoscope-js 의 Horoscope(열대, placidus) 결과
 * - 처리: 라히리(치트라파크샤) 아야남사를 연도별로 계산해 빼서 항성 경도로 변환
 *   (라이브러리 자체 sidereal 옵션은 24.1° 고정값이라 쓰지 않음)
 * - 전역 window.VedicCore 로 노출 (노드에서는 module.exports)
 * 아야남사는 일반 세차 근사식이며 참고용입니다.
 */
(function (root) {
  var SIGNS = [
    { sa: '메샤', ko: '양자리' }, { sa: '브리샤바', ko: '황소자리' }, { sa: '미투나', ko: '쌍둥이자리' },
    { sa: '카르카', ko: '게자리' }, { sa: '심하', ko: '사자자리' }, { sa: '칸야', ko: '처녀자리' },
    { sa: '툴라', ko: '천칭자리' }, { sa: '브리슈치카', ko: '전갈자리' }, { sa: '다누', ko: '궁수자리' },
    { sa: '마카라', ko: '염소자리' }, { sa: '꿈바', ko: '물병자리' }, { sa: '미나', ko: '물고기자리' }
  ];
  var SIGN_LORD = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
  var NAK = [
    ['아쉬위니', 'Ashwini'], ['바라니', 'Bharani'], ['크리티카', 'Krittika'], ['로히니', 'Rohini'], ['므리가시라', 'Mrigashira'],
    ['아르드라', 'Ardra'], ['푸나르바수', 'Punarvasu'], ['푸쉬야', 'Pushya'], ['아슐레샤', 'Ashlesha'], ['마가', 'Magha'],
    ['푸르바 팔구니', 'Purva Phalguni'], ['우타라 팔구니', 'Uttara Phalguni'], ['하스타', 'Hasta'], ['치트라', 'Chitra'],
    ['스와티', 'Swati'], ['비샤카', 'Vishakha'], ['아누라다', 'Anuradha'], ['제슈타', 'Jyeshtha'], ['물라', 'Mula'],
    ['푸르바 아샤다', 'Purva Ashadha'], ['우타라 아샤다', 'Uttara Ashadha'], ['슈라바나', 'Shravana'], ['다니슈타', 'Dhanishta'],
    ['샤타비샤', 'Shatabhisha'], ['푸르바 바드라파다', 'Purva Bhadrapada'], ['우타라 바드라파다', 'Uttara Bhadrapada'], ['레바티', 'Revati']
  ];
  var DASHA_ORDER = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury'];
  var DASHA_YEARS = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 };
  var GRAHA_KO = { sun: '태양', moon: '달', mars: '화성', mercury: '수성', jupiter: '목성', venus: '금성', saturn: '토성', rahu: '라후', ketu: '케투' };
  var GRAHA_SHORT = { sun: '태', moon: '달', mars: '화', mercury: '수', jupiter: '목', venus: '금', saturn: '토', rahu: '라', ketu: '케' };
  var NAK_SPAN = 360 / 27, PADA_SPAN = NAK_SPAN / 4;

  function norm(d) { d = d % 360; return d < 0 ? d + 360 : d; }

  /** 라히리 아야남사: J2000 기준값 23.857092°(표준 천문력 Lahiri와 1900~2050년 0.0001° 안쪽으로 일치) + 일반 세차 */
  function lahiriAyanamsa(year, month, day) {
    var jd = Date.UTC(year, month - 1, day, 12) / 86400000 + 2440587.5;
    var T = (jd - 2451545.0) / 36525;
    return 23.857092 + (5028.796195 * T + 1.1054348 * T * T) / 3600;
  }

  /**
   * ΔT(초) = 지구시(TT) − 세계시(UT). Espenak·Meeus 다항식.
   * 계산 라이브러리가 세계시를 그대로 써서 달 위치가 ΔT만큼(1967년 약 38초 = 약 0.005°) 늦게 나옴 → 다샤 날짜가 2일쯤 밀렸음
   */
  function deltaTSeconds(year, month) {
    var y = year + ((month || 6) - 0.5) / 12;
    var t;
    if (y < 1900) return 0;
    if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t; }
    if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t * t * t; }
    if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547; }
    if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718; }
    if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t + 0.000651814 * Math.pow(t, 4) + 0.00002373599 * Math.pow(t, 5); }
    if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    return -20 + 32 * Math.pow((y - 1820) / 100, 2) - 0.5628 * (2150 - y);
  }
  var MOON_MEAN_DEG_PER_SEC = 13.176358 / 86400;

  /**
   * 황경 장동 Δψ(도). 행성 위치(겉보기 황경)에서 항성 위치로 바꿀 때 표준 천문력과 같게 맞추려면 아야남사에 더해야 함 (최대 약 0.005°)
   */
  function nutationLonDeg(year, month, day) {
    var jd = Date.UTC(year, month - 1, day, 12) / 86400000 + 2440587.5;
    var T = (jd - 2451545.0) / 36525;
    var r = Math.PI / 180;
    var om = (125.04452 - 1934.136261 * T) * r;
    var Ls = (280.4665 + 36000.7698 * T) * r;
    var Lm = (218.3165 + 481267.8813 * T) * r;
    var arcsec = -17.20 * Math.sin(om) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * om);
    return arcsec / 3600;
  }

  function rashiOf(lon) { return Math.floor(lon / 30); }
  function nakOf(lon) {
    var idx = Math.floor(lon / NAK_SPAN);
    var pada = Math.floor((lon - idx * NAK_SPAN) / PADA_SPAN) + 1;
    return { index: idx, pada: pada, lord: DASHA_ORDER[idx % 9], frac: (lon - idx * NAK_SPAN) / NAK_SPAN };
  }
  /** 가장 가까운 경계까지의 거리(도) */
  function boundaryDist(lon, span) { var r = lon % span; return Math.min(r, span - r); }

  function dd(obj) { return obj.ChartPosition.Ecliptic.DecimalDegrees; }

  /** horoscope(열대) → 항성 차트 데이터 */
  function build(horoscope, birth, opts) {
    opts = opts || {};
    var ay = lahiriAyanamsa(birth.y, birth.mo, birth.da);
    // 겉보기 황경 기준이라 장동만큼 더해 줌 (표준 천문력의 항성 위치와 일치)
    var ayEff = ay + nutationLonDeg(birth.y, birth.mo, birth.da);
    var keys = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
    var grahas = [];
    keys.forEach(function (k) {
      var b = horoscope.CelestialBodies[k];
      var trop = dd(b);
      if (k === 'moon') {
        // 달은 빠르게 움직여 ΔT 보정이 필요 — 정확한 값이 주어지면 그걸 쓰고, 아니면 평균 속도로 보정
        trop = Number.isFinite(opts.moonTrop)
          ? opts.moonTrop
          : norm(trop + MOON_MEAN_DEG_PER_SEC * deltaTSeconds(birth.y, birth.mo));
      }
      grahas.push({ key: k, trop: trop, retro: !!b.isRetrograde });
    });
    var rahuTrop = dd(horoscope.CelestialPoints.northnode);
    grahas.push({ key: 'rahu', trop: rahuTrop, retro: true });
    grahas.push({ key: 'ketu', trop: norm(rahuTrop + 180), retro: true });
    var lagna = null;
    if (!opts.unknownTime) lagna = { key: 'lagna', trop: dd(horoscope.Ascendant), retro: false };
    var all = grahas.slice(); if (lagna) all.push(lagna);
    all.forEach(function (g) {
      g.sid = norm(g.trop - ayEff);
      g.rashi = rashiOf(g.sid);
      g.deg = g.sid - g.rashi * 30;
      var n = nakOf(g.sid); g.nak = n.index; g.pada = n.pada; g.nakLord = n.lord; g.nakFrac = n.frac;
      g.rashiEdge = boundaryDist(g.sid, 30);
      g.d9 = navamsaOf(g.sid);
      g.d9Edge = boundaryDist(g.sid, 30 / 9);
      g.dignity = dignity(g.key, g.rashi, g.deg);
      g.nakEdge = boundaryDist(g.sid, NAK_SPAN);
    });
    if (lagna) grahas.forEach(function (g) { g.house = ((g.rashi - lagna.rashi + 12) % 12) + 1; });
    return { ayanamsa: ay, grahas: grahas, lagna: lagna };
  }

  /**
   * 빔쇼타리 다샤: 출생 달 낙샤트라 기준
   * - 1년 = 항성년 365.256364일 (다샤 앱·표준력과 맞춤)
   * - 4단계: 마하 → 안타르 → 프라얀타르 → 숙슈마 (subs[].prats[].sukshmas)
   * - 고객용(내 차트로 묻기)은 보통 3단계까지만 씀
   */
  var DASHA_YEAR_DAYS = 365.256364;
  var YEAR_MS = DASHA_YEAR_DAYS * 86400000;
  function dasha(moonSid, birthMs) {
    var n = nakOf(moonSid);
    var startIdx = DASHA_ORDER.indexOf(n.lord);
    var firstFull = DASHA_YEARS[n.lord];
    var elapsed = n.frac * firstFull;           // 이미 지난 햇수
    var t0 = birthMs - elapsed * YEAR_MS;       // 첫 마하다샤 시작(출생 이전)
    var list = [], t = t0;
    for (var i = 0; i < 9; i++) {
      var lord = DASHA_ORDER[(startIdx + i) % 9], yrs = DASHA_YEARS[lord];
      var end = t + yrs * YEAR_MS;
      var subs = [], st = t;
      for (var j = 0; j < 9; j++) {
        var sl = DASHA_ORDER[(startIdx + i + j) % 9];
        var sy = yrs * DASHA_YEARS[sl] / 120;
        var subEnd = st + sy * YEAR_MS;
        var antarIdx = DASHA_ORDER.indexOf(sl);
        var prats = [], pt = st;
        for (var k = 0; k < 9; k++) {
          var pl = DASHA_ORDER[(antarIdx + k) % 9];
          var py = sy * DASHA_YEARS[pl] / 120;
          var pratEnd = pt + py * YEAR_MS;
          var pratIdx = DASHA_ORDER.indexOf(pl);
          var sukshmas = [], qt = pt;
          for (var m = 0; m < 9; m++) {
            var ql = DASHA_ORDER[(pratIdx + m) % 9];
            var qy = py * DASHA_YEARS[ql] / 120;
            sukshmas.push({ lord: ql, start: qt, end: qt + qy * YEAR_MS });
            qt += qy * YEAR_MS;
          }
          prats.push({ lord: pl, start: pt, end: pratEnd, sukshmas: sukshmas });
          pt = pratEnd;
        }
        subs.push({ lord: sl, start: st, end: subEnd, prats: prats });
        st = subEnd;
      }
      list.push({ lord: lord, years: yrs, start: t, end: end, subs: subs });
      t = end;
    }
    return {
      list: list,
      balanceYears: firstFull - elapsed,
      firstLord: n.lord,
      yearDays: DASHA_YEAR_DAYS,
      levels: 4,
    };
  }

  /** 나밤샤(D9): 한 별자리를 3°20'씩 9칸으로 나눔. 불(양)·흙(염소)·바람(천칭)·물(게) 순서 규칙을 한 식으로 */
  function navamsaOf(sid) { return Math.floor(norm(sid) / (30 / 9)) % 12; }

  /** 행성 품위(파라샤라 기준). 라후·케투는 학파마다 달라 표시하지 않음 */
  var EXALT = { sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6 };
  var MT = { sun: [4, 0, 20], moon: [1, 3, 30], mars: [0, 0, 12], mercury: [5, 15, 20], jupiter: [8, 0, 10], venus: [6, 0, 15], saturn: [10, 0, 20] };
  function dignity(key, rashi, deg) {
    if (!(key in EXALT)) return '';
    var mt = MT[key];
    if (key === 'moon' && rashi === 1) return deg < 3 ? 'exalted' : 'moolatrikona';
    if (key === 'mercury' && rashi === 5) return deg < 15 ? 'exalted' : (deg < 20 ? 'moolatrikona' : 'own');
    if (rashi === EXALT[key]) return 'exalted';
    if (rashi === (EXALT[key] + 6) % 12) return 'debilitated';
    if (rashi === mt[0] && deg >= mt[1] && deg < mt[2]) return 'moolatrikona';
    if (SIGN_LORD[rashi] === key) return 'own';
    return '';
  }

  /** 그라하 드리슈티: 자기 자리에서 n번째 별자리(자기 자리=1번째). 라후·케투는 학파마다 달라 제외 */
  var DRISHTI = { sun: [7], moon: [7], mercury: [7], venus: [7], mars: [4, 7, 8], jupiter: [5, 7, 9], saturn: [3, 7, 10] };
  function drishtiSigns(key, rashi) {
    var list = DRISHTI[key];
    if (!list) return [];
    return list.map(function (n) { return { nth: n, rashi: (rashi + n - 1) % 12 }; });
  }

  var api = {
    SIGNS: SIGNS, SIGN_LORD: SIGN_LORD, NAK: NAK, GRAHA_KO: GRAHA_KO, GRAHA_SHORT: GRAHA_SHORT,
    DASHA_YEARS: DASHA_YEARS, DASHA_YEAR_DAYS: DASHA_YEAR_DAYS, DASHA_ORDER: DASHA_ORDER,
    NAK_SPAN: NAK_SPAN, PADA_SPAN: PADA_SPAN,
    lahiriAyanamsa: lahiriAyanamsa, deltaTSeconds: deltaTSeconds, build: build, dasha: dasha, norm: norm,
    navamsaOf: navamsaOf, dignity: dignity, drishtiSigns: drishtiSigns, DRISHTI: DRISHTI
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VedicCore = api;
})(typeof window !== 'undefined' ? window : this);
