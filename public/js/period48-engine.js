/**
 * Period Engine — 생년월일 → 태양 황도 → Period 01~48
 * Python period_engine.py 와 동일한 PERIOD_MASTER · 경계 규칙
 */
(function () {
  const PERIOD_MASTER = [
    { id: 1, name: '물고기-양 쿠스프', element: 'Water', modality: 'Mutable', start: 356, end: 364 },
    { id: 2, name: '양자리 I', element: 'Fire', modality: 'Cardinal', start: 4, end: 11.33 },
    { id: 3, name: '양자리 II', element: 'Fire', modality: 'Cardinal', start: 11.33, end: 18.66 },
    { id: 4, name: '양자리 III', element: 'Fire', modality: 'Cardinal', start: 18.66, end: 26 },
    { id: 5, name: '양-황소 쿠스프', element: 'Earth', modality: 'Fixed', start: 26, end: 34 },
    { id: 6, name: '황소자리 I', element: 'Earth', modality: 'Fixed', start: 34, end: 41.33 },
    { id: 7, name: '황소자리 II', element: 'Earth', modality: 'Fixed', start: 41.33, end: 48.66 },
    { id: 8, name: '황소자리 III', element: 'Earth', modality: 'Fixed', start: 48.66, end: 56 },
    { id: 9, name: '황소-쌍둥이 쿠스프', element: 'Air', modality: 'Mutable', start: 56, end: 64 },
    { id: 10, name: '쌍둥이자리 I', element: 'Air', modality: 'Mutable', start: 64, end: 71.33 },
    { id: 11, name: '쌍둥이자리 II', element: 'Air', modality: 'Mutable', start: 71.33, end: 78.66 },
    { id: 12, name: '쌍둥이자리 III', element: 'Air', modality: 'Mutable', start: 78.66, end: 86 },
    { id: 13, name: '쌍둥이-게 쿠스프', element: 'Water', modality: 'Cardinal', start: 86, end: 94 },
    { id: 14, name: '게자리 I', element: 'Water', modality: 'Cardinal', start: 94, end: 101.33 },
    { id: 15, name: '게자리 II', element: 'Water', modality: 'Cardinal', start: 101.33, end: 108.66 },
    { id: 16, name: '게자리 III', element: 'Water', modality: 'Cardinal', start: 108.66, end: 116 },
    { id: 17, name: '게-사자 쿠스프', element: 'Fire', modality: 'Fixed', start: 116, end: 124 },
    { id: 18, name: '사자자리 I', element: 'Fire', modality: 'Fixed', start: 124, end: 131.33 },
    { id: 19, name: '사자자리 II', element: 'Fire', modality: 'Fixed', start: 131.33, end: 138.66 },
    { id: 20, name: '사자자리 III', element: 'Fire', modality: 'Fixed', start: 138.66, end: 146 },
    { id: 21, name: '사자-처녀 쿠스프', element: 'Earth', modality: 'Mutable', start: 146, end: 154 },
    { id: 22, name: '처녀자리 I', element: 'Earth', modality: 'Mutable', start: 154, end: 161.33 },
    { id: 23, name: '처녀자리 II', element: 'Earth', modality: 'Mutable', start: 161.33, end: 168.66 },
    { id: 24, name: '처녀자리 III', element: 'Earth', modality: 'Mutable', start: 168.66, end: 176 },
    { id: 25, name: '처녀-천칭 쿠스프', element: 'Air', modality: 'Cardinal', start: 176, end: 184 },
    { id: 26, name: '천칭자리 I', element: 'Air', modality: 'Cardinal', start: 184, end: 191.33 },
    { id: 27, name: '천칭자리 II', element: 'Air', modality: 'Cardinal', start: 191.33, end: 198.66 },
    { id: 28, name: '천칭자리 III', element: 'Air', modality: 'Cardinal', start: 198.66, end: 206 },
    { id: 29, name: '천칭-전갈 쿠스프', element: 'Water', modality: 'Fixed', start: 206, end: 214 },
    { id: 30, name: '전갈자리 I', element: 'Water', modality: 'Fixed', start: 214, end: 221.33 },
    { id: 31, name: '전갈자리 II', element: 'Water', modality: 'Fixed', start: 221.33, end: 228.66 },
    { id: 32, name: '전갈자리 III', element: 'Water', modality: 'Fixed', start: 228.66, end: 236 },
    { id: 33, name: '전갈-사수 쿠스프', element: 'Fire', modality: 'Mutable', start: 236, end: 244 },
    { id: 34, name: '사수자리 I', element: 'Fire', modality: 'Mutable', start: 244, end: 251.33 },
    { id: 35, name: '사수자리 II', element: 'Fire', modality: 'Mutable', start: 251.33, end: 258.66 },
    { id: 36, name: '사수자리 III', element: 'Fire', modality: 'Mutable', start: 258.66, end: 266 },
    { id: 37, name: '사수-염소 쿠스프', element: 'Earth', modality: 'Cardinal', start: 266, end: 274 },
    { id: 38, name: '염소자리 I', element: 'Earth', modality: 'Cardinal', start: 274, end: 281.33 },
    { id: 39, name: '염소자리 II', element: 'Earth', modality: 'Cardinal', start: 281.33, end: 288.66 },
    { id: 40, name: '염소자리 III', element: 'Earth', modality: 'Cardinal', start: 288.66, end: 296 },
    { id: 41, name: '염소-물병 쿠스프', element: 'Air', modality: 'Fixed', start: 296, end: 304 },
    { id: 42, name: '물병자리 I', element: 'Air', modality: 'Fixed', start: 304, end: 311.33 },
    { id: 43, name: '물병자리 II', element: 'Air', modality: 'Fixed', start: 311.33, end: 318.66 },
    { id: 44, name: '물병자리 III', element: 'Air', modality: 'Fixed', start: 318.66, end: 326 },
    { id: 45, name: '물병-물고기 쿠스프', element: 'Water', modality: 'Mutable', start: 326, end: 334 },
    { id: 46, name: '물고기자리 I', element: 'Water', modality: 'Mutable', start: 334, end: 341.33 },
    { id: 47, name: '물고기자리 II', element: 'Water', modality: 'Mutable', start: 341.33, end: 348.66 },
    { id: 48, name: '물고기자리 III', element: 'Water', modality: 'Mutable', start: 348.66, end: 356 },
  ];

  const PERIOD_BY_ID = Object.fromEntries(
    PERIOD_MASTER.map((p) => [p.id, p])
  );

  /** Julian Day (정오 UTC 근사) */
  function julianDay(year, month, day) {
    let y = year;
    let m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return (
      Math.floor(365.25 * (y + 4716)) +
      Math.floor(30.6001 * (m + 1)) +
      day +
      B -
      1524.5
    );
  }

  /**
   * 태양 황도 경도 (0~360°) — Meeus 근사 (ephem 12:00 UT 기준과 유사)
   */
  function getSunLongitude(year, month, day) {
    const jd = julianDay(year, month, day);
    const d = jd - 2451545.0;
    let L = (280.46646 + 0.9856474 * d) % 360;
    if (L < 0) L += 360;
    const gRad = (((357.528 + 0.9856003 * d) % 360) + 360) % 360 * (Math.PI / 180);
    let lambda = L + 1.915 * Math.sin(gRad) + 0.02 * Math.sin(2 * gRad);
    lambda = ((lambda % 360) + 360) % 360;
    return lambda;
  }

  function getPeriodFromLongitude(lon) {
    let row;
    if (lon >= 356 || lon < 4) {
      row = PERIOD_MASTER[0];
    } else {
      row = PERIOD_MASTER.slice(1).find((p) => lon >= p.start && lon < p.end);
      if (!row) {
        row = PERIOD_MASTER.slice(1).find((p) => lon >= p.start && lon < p.end + 0.01);
      }
      if (!row) row = PERIOD_MASTER[0];
    }
    return {
      period_id: row.id,
      name: row.name,
      element: row.element,
      modality: row.modality,
      sun_longitude: Math.round(lon * 100) / 100,
    };
  }

  function birthdateToPeriod(year, month, day) {
    const lon = getSunLongitude(year, month, day);
    return getPeriodFromLongitude(lon);
  }

  function getPeriodCenterDegree(periodId) {
    const p = PERIOD_BY_ID[periodId];
    if (!p) return 0;
    if (periodId === 1) return 0;
    return (p.start + p.end) / 2;
  }

  function calculateAspect(periodIdA, periodIdB) {
    const ca = getPeriodCenterDegree(periodIdA);
    const cb = getPeriodCenterDegree(periodIdB);
    let delta = Math.abs(ca - cb);
    if (delta > 180) delta = 360 - delta;
    if (delta >= 177.5 && delta <= 182.5) return 'Opposition';
    if (delta >= 87.5 && delta <= 92.5) return 'Square';
    if (delta >= 117.5 && delta <= 122.5) return 'Trine';
    return null;
  }

  const ASPECT_KO = {
    Opposition: '대립 (180°)',
    Square: '긴장 (90°)',
    Trine: '조화 (120°)',
  };

  window.PERIOD48_MASTER = PERIOD_MASTER;
  window.PERIOD48_BY_ID = PERIOD_BY_ID;
  window.getSunLongitude = getSunLongitude;
  window.getPeriodFromLongitude = getPeriodFromLongitude;
  window.birthdateToPeriod = birthdateToPeriod;
  window.getPeriodCenterDegree = getPeriodCenterDegree;
  window.calculatePeriod48Aspect = calculateAspect;
  window.PERIOD48_ASPECT_KO = ASPECT_KO;
})();
