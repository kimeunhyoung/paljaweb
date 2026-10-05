/**
 * 한글 자모 수비학 공통 — 겹받침은 구성 자음 합산
 * 예: ㄺ = ㄹ(4) + ㄱ(1) → 5
 */
(function (root) {
  'use strict';

  var HC = {
    ㄱ: 1, ㄲ: 1, ㄴ: 2, ㄷ: 3, ㄸ: 3, ㄹ: 4, ㅁ: 5, ㅂ: 6, ㅃ: 6,
    ㅅ: 7, ㅆ: 7, ㅇ: 8, ㅈ: 9, ㅉ: 9, ㅊ: 1, ㅋ: 2, ㅌ: 3, ㅍ: 4, ㅎ: 5
  };

  var COMPLEX_JONG = {
    ㄳ: ['ㄱ', 'ㅅ'],
    ㄵ: ['ㄴ', 'ㅈ'],
    ㄶ: ['ㄴ', 'ㅎ'],
    ㄺ: ['ㄹ', 'ㄱ'],
    ㄻ: ['ㄹ', 'ㅁ'],
    ㄼ: ['ㄹ', 'ㅂ'],
    ㄽ: ['ㄹ', 'ㅅ'],
    ㄾ: ['ㄹ', 'ㅌ'],
    ㄿ: ['ㄹ', 'ㅍ'],
    ㅀ: ['ㄹ', 'ㅎ'],
    ㅄ: ['ㅂ', 'ㅅ']
  };

  function expandJong(jong) {
    if (!jong) return [];
    return COMPLEX_JONG[jong] || [jong];
  }

  /** 자음(또는 겹받침) 숫자 합 */
  function consonantValue(ch, map) {
    map = map || HC;
    if (!ch) return 0;
    var parts = COMPLEX_JONG[ch];
    if (parts) {
      var sum = 0;
      for (var i = 0; i < parts.length; i++) sum += map[parts[i]] || 0;
      return sum;
    }
    return map[ch] || 0;
  }

  function forEachJongPart(jong, map, fn) {
    map = map || HC;
    var parts = expandJong(jong);
    for (var i = 0; i < parts.length; i++) {
      fn(parts[i], map[parts[i]] || 0);
    }
  }

  root.PaljaHangulNumerology = {
    HC: HC,
    COMPLEX_JONG: COMPLEX_JONG,
    expandJong: expandJong,
    consonantValue: consonantValue,
    forEachJongPart: forEachJongPart
  };
})(typeof window !== 'undefined' ? window : globalThis);
