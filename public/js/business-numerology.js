/**
 * 상호(사업명) 수비학 — 운명·혼·성격수 + 업종 조화
 */
(function () {
  'use strict';

  var PY = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
    J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
    S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8
  };
  var VOWELS = { A: 1, E: 1, I: 1, O: 1, U: 1 };
  var HC = {
    ㄱ: 1, ㄲ: 1, ㄴ: 2, ㄷ: 3, ㄸ: 3, ㄹ: 4, ㅁ: 5, ㅂ: 6, ㅃ: 6,
    ㅅ: 7, ㅆ: 7, ㅇ: 8, ㅈ: 9, ㅉ: 9, ㅊ: 1, ㅋ: 2, ㅌ: 3, ㅍ: 4, ㅎ: 5
  };
  var HV = {
    ㅏ: 1, ㅑ: 2, ㅓ: 3, ㅕ: 4, ㅗ: 5, ㅛ: 6, ㅜ: 7, ㅠ: 8, ㅡ: 9, ㅣ: 1,
    ㅐ: 2, ㅒ: 3, ㅔ: 4, ㅖ: 5, ㅘ: 6, ㅙ: 7, ㅚ: 8, ㅝ: 9, ㅞ: 1, ㅟ: 2, ㅢ: 3
  };
  var CHOS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  var JUNGS = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  var JONGS = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  var LEGAL_STRIP = /\b(inc|incorporated|corp|corporation|co|ltd|llc|주식회사|㈜|유한회사|유한책임회사|합자회사|합명회사)\b/gi;

  function reduce(n, master) {
    if (master === undefined) master = true;
    n = Number(n) || 0;
    if (master && (n === 11 || n === 22 || n === 33)) return n;
    while (n > 9) {
      n = String(n)
        .split('')
        .reduce(function (a, b) {
          return a + Number(b);
        }, 0);
      if (master && (n === 11 || n === 22 || n === 33)) return n;
    }
    return n;
  }

  function decomposeChar(ch) {
    var c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) return null;
    return {
      cho: CHOS[Math.floor(c / (21 * 28))],
      jung: JUNGS[Math.floor((c % (21 * 28)) / 28)],
      jong: JONGS[c % 28] || ''
    };
  }

  function cleanBrand(raw) {
    return String(raw || '')
      .replace(LEGAL_STRIP, ' ')
      .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function calcName(name) {
    var s = cleanBrand(name).replace(/\s/g, '');
    if (!s) return null;
    var hasHangul = /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(s);
    var cv = 0;
    var vv = 0;
    if (hasHangul) {
      for (var i = 0; i < s.length; i++) {
        var ch = s[i];
        var d = decomposeChar(ch);
        if (d) {
          cv += HC[d.cho] || 0;
          if (d.jong) {
            for (var j = 0; j < d.jong.length; j++) cv += HC[d.jong[j]] || 0;
          }
          vv += HV[d.jung] || 0;
          continue;
        }
        cv += HC[ch] || 0;
        vv += HV[ch] || 0;
      }
    } else {
      var clean = s.toUpperCase().replace(/[^A-Z]/g, '');
      for (var k = 0; k < clean.length; k++) {
        var L = clean[k];
        var v = PY[L] || 0;
        if (VOWELS[L]) vv += v;
        else cv += v;
      }
    }
    var total = cv + vv;
    return {
      cleaned: cleanBrand(name),
      expression: { raw: total, val: reduce(total) },
      soul: { raw: vv, val: reduce(vv) },
      personality: { raw: cv, val: reduce(cv) }
    };
  }

  var TRAITS = {
    1: '개척·리더십',
    2: '협력·조화',
    3: '표현·창의',
    4: '안정·실행',
    5: '변화·자유',
    6: '돌봄·책임',
    7: '탐구·전문',
    8: '성취·권위',
    9: '완성·공헌',
    11: '영감(마스터)',
    22: '구축(마스터)',
    33: '치유(마스터)'
  };

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function numCard(label, tip, numObj) {
    return (
      '<div class="result-card">' +
      '<div class="result-num">' +
      numObj.val +
      '</div>' +
      '<div class="result-label">' +
      esc(label) +
      '</div>' +
      '<p class="theme">' +
      esc(TRAITS[numObj.val] || '') +
      '</p>' +
      '<p class="calc-line">합 ' +
      numObj.raw +
      (numObj.raw !== numObj.val ? ' → ' + numObj.val : '') +
      '</p>' +
      '<p>' +
      esc(tip) +
      '</p></div>'
    );
  }

  function run() {
    var input = document.getElementById('brandInput');
    var empty = document.getElementById('emptyState');
    var results = document.getElementById('resultsBlock');
    var cleanedEl = document.getElementById('cleanedLabel');
    var numsEl = document.getElementById('numsGrid');
    var indEl = document.getElementById('industryBox');
    if (!input) return;

    var raw = input.value;
    var data = calcName(raw);
    if (!data) {
      if (empty) empty.hidden = false;
      if (results) results.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (results) results.hidden = false;
    if (cleanedEl) {
      cleanedEl.textContent =
        data.cleaned !== String(raw).trim()
          ? '계산에 쓴 이름: ' + data.cleaned + ' (Inc./주식회사 등 일반 표기는 제외)'
          : '계산에 쓴 이름: ' + data.cleaned;
    }
    if (numsEl) {
      numsEl.innerHTML =
        numCard('운명·표현수', '상호가 세상에 내거는 방향·역할', data.expression) +
        numCard('혼의수', '브랜드가 진짜로 원하는 것(모음 에너지)', data.soul) +
        numCard('성격수', '공적 이미지·첫인상 — 상호에서 가장 중요', data.personality);
    }
    if (indEl && window.PaljaLifeTables) {
      indEl.innerHTML = PaljaLifeTables.renderIndustryMatchHtml(
        data.expression.val,
        data.personality.val
      );
    }
  }

  function bind() {
    var input = document.getElementById('brandInput');
    var btn = document.getElementById('calcBtn');
    if (input) {
      input.addEventListener('input', run);
      input.addEventListener('change', run);
    }
    if (btn) btn.addEventListener('click', run);
    run();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
