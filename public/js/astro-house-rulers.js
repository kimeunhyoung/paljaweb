/**
 * House rulers — traditional + modern co-rulers
 * Life-timeline 전용. 기존 네이탈 휠/해석에는 영향 없음.
 */
(function (global) {
  'use strict';

  var SIGN_ORDER = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];

  /** traditional + modern (동일하면 둘 다 같은 키) */
  var BY_SIGN = {
    aries: { traditional: 'mars', modern: 'mars' },
    taurus: { traditional: 'venus', modern: 'venus' },
    gemini: { traditional: 'mercury', modern: 'mercury' },
    cancer: { traditional: 'moon', modern: 'moon' },
    leo: { traditional: 'sun', modern: 'sun' },
    virgo: { traditional: 'mercury', modern: 'mercury' },
    libra: { traditional: 'venus', modern: 'venus' },
    scorpio: { traditional: 'mars', modern: 'pluto' },
    sagittarius: { traditional: 'jupiter', modern: 'jupiter' },
    capricorn: { traditional: 'saturn', modern: 'saturn' },
    aquarius: { traditional: 'saturn', modern: 'uranus' },
    pisces: { traditional: 'jupiter', modern: 'neptune' },
  };

  function signKeyFromDegree(deg) {
    if (deg == null || isNaN(deg)) return null;
    var d = ((Number(deg) % 360) + 360) % 360;
    return SIGN_ORDER[Math.floor(d / 30)] || null;
  }

  function rulersForSign(signKey) {
    var s = BY_SIGN[signKey];
    if (!s) return { traditional: null, modern: null, cuspSign: signKey || null };
    return {
      cuspSign: signKey,
      traditional: s.traditional,
      modern: s.modern,
    };
  }

  /**
   * @param {Array<{id:number, cuspDeg:number, sign?:string}>} houses
   */
  function buildByHouse(houses) {
    var byHouse = {};
    (houses || []).forEach(function (h) {
      var id = String(h.id != null ? h.id : '');
      if (!id) return;
      var sign = h.sign || signKeyFromDegree(h.cuspDeg);
      byHouse[id] = rulersForSign(sign);
    });
    return byHouse;
  }

  function topicRulerKeys(byHouse, houseIds) {
    var keys = [];
    (houseIds || []).forEach(function (hid) {
      var r = byHouse[String(hid)];
      if (!r) return;
      if (r.traditional && keys.indexOf(r.traditional) < 0) keys.push(r.traditional);
      if (r.modern && keys.indexOf(r.modern) < 0) keys.push(r.modern);
    });
    return keys;
  }

  global.AstroHouseRulers = {
    BY_SIGN: BY_SIGN,
    SIGN_ORDER: SIGN_ORDER,
    signKeyFromDegree: signKeyFromDegree,
    rulersForSign: rulersForSign,
    buildByHouse: buildByHouse,
    topicRulerKeys: topicRulerKeys,
  };
})(typeof window !== 'undefined' ? window : globalThis);
