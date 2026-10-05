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

  // 영문 회사 형태 표기 (단어 경계 기준)
  var LEGAL_STRIP_EN = /\b(inc|incorporated|corp|corporation|co|ltd|llc)\b\.?/gi;
  // 한글 회사·법인 형태 표기 (\b는 한글에 안 먹혀서 따로 처리)
  var LEGAL_STRIP_KO = /(주식회사|유한책임회사|유한회사|합자회사|합명회사|사단법인|재단법인|협동조합|농업회사법인)/g;
  var LEGAL_STRIP_PAREN = /[(（]\s*(주|유|사|재|합)\s*[)）]|[㈜㈲㈳㈴]/g;

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
      .replace(LEGAL_STRIP_PAREN, ' ')
      .replace(LEGAL_STRIP_KO, ' ')
      .replace(LEGAL_STRIP_EN, ' ')
      .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function addLatinLetter(L, bag) {
    var v = PY[L] || 0;
    if (!v) return;
    if (VOWELS[L]) bag.vv += v;
    else bag.cv += v;
  }

  /** 한글·영문·숫자 혼용: 글자/숫자는 각각 합산. 숫자는 모음(혼의수)이 아니라 바깥(성격·표현)에만 가산 */
  function calcName(name) {
    var s = cleanBrand(name).replace(/\s/g, '');
    if (!s) return null;
    var bag = { cv: 0, vv: 0 };
    var usedHangul = false;
    var usedLatin = false;
    var usedDigit = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (/\d/.test(ch)) {
        var digit = Number(ch);
        if (digit > 0) {
          bag.cv += digit;
          usedDigit = true;
        }
        continue;
      }
      var d = decomposeChar(ch);
      if (d) {
        usedHangul = true;
        bag.cv += HC[d.cho] || 0;
        if (d.jong) {
          // 겹받침(ㄺ 등)은 구성 자음 합산 — PaljaHangulNumerology
          if (window.PaljaHangulNumerology) {
            bag.cv += PaljaHangulNumerology.consonantValue(d.jong, HC);
          } else {
            bag.cv += HC[d.jong] || 0;
          }
        }
        bag.vv += HV[d.jung] || 0;
        continue;
      }
      if (HC[ch] || HV[ch]) {
        usedHangul = true;
        bag.cv += HC[ch] || 0;
        bag.vv += HV[ch] || 0;
        continue;
      }
      var up = ch.toUpperCase();
      if (PY[up]) {
        usedLatin = true;
        addLatinLetter(up, bag);
      }
    }
    if (!bag.cv && !bag.vv) return null;
    var total = bag.cv + bag.vv;
    return {
      cleaned: cleanBrand(name),
      mixedScript: usedHangul && usedLatin,
      usedDigit: usedDigit,
      expression: { raw: total, val: reduce(total) },
      soul: { raw: bag.vv, val: reduce(bag.vv) },
      personality: { raw: bag.cv, val: reduce(bag.cv) }
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

  /** 운명수(표현수) 기준 상호 방향 — 참고용 해석 */
  var BIZ = {
    1: '앞장서서 새 시장을 여는 상호예요. 신규 브랜드·1인 창업·리더형 사업과 잘 맞아요. 협업이 중요한 업종이라면 독단적으로 보이지 않게 소통을 챙겨 주세요.',
    2: '협력과 신뢰로 자라는 상호예요. 상담·중개·서비스·파트너십 사업과 잘 맞아요. 존재감이 약해 보일 수 있으니 브랜드 메시지를 분명하게 해 주세요.',
    3: '표현력과 재미로 사람을 모으는 상호예요. 콘텐츠·디자인·광고·외식처럼 소통이 중요한 업종과 잘 맞아요. 운영 체계를 함께 갖추면 오래가요.',
    4: '꼼꼼함과 신뢰를 앞세우는 상호예요. 제조·건설·회계·관리처럼 안정이 중요한 업종과 잘 맞아요. 너무 딱딱해 보이지 않게 친근함을 더하면 좋아요.',
    5: '변화와 확장에 강한 상호예요. 여행·유통·마케팅·온라인 사업과 잘 맞아요. 방향이 자주 흔들리지 않도록 핵심 상품을 분명히 해 두세요.',
    6: '돌봄과 책임감이 느껴지는 상호예요. 교육·의료·뷰티·가정·지역 밀착형 사업과 잘 맞아요. 단골과의 관계가 곧 자산이 돼요.',
    7: '전문성과 깊이를 내세우는 상호예요. 연구·기술·컨설팅·상담처럼 지식이 중요한 업종과 잘 맞아요. 고객에게는 쉽게 풀어 설명하는 노력이 필요해요.',
    8: '성취와 규모를 지향하는 상호예요. 금융·부동산·기업 거래·제조처럼 실적이 중요한 사업과 잘 맞아요. 숫자만 앞세우기보다 신뢰를 함께 쌓으면 좋아요.',
    9: '폭넓게 아우르고 베푸는 상호예요. 예술·문화·공익·국제 교류 사업과 잘 맞아요. 수익 구조를 분명히 챙겨야 오래 이어 갈 수 있어요.',
    11: '영감과 메시지를 전하는 상호예요(마스터 넘버). 상담·교육·영성·예술 브랜드와 잘 맞아요. 기본 수 2의 협력 에너지도 함께 살려 주세요.',
    22: '큰 구조를 세우는 상호예요(마스터 넘버). 플랫폼·건설·조직형 사업처럼 규모 있는 사업과 잘 맞아요. 기본 수 4처럼 차근차근 실행하는 게 중요해요.',
    33: '치유와 헌신을 전하는 상호예요(마스터 넘버). 치유·교육·돌봄 분야와 잘 맞아요. 기본 수 6처럼 책임감을 꾸준히 보여 주면 좋아요.'
  };

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function numCard(label, tip, numObj) {
    var m = String(label).match(/^(.+?)\s*\((.+)\)$/);
    var labelHtml = m
      ? esc(m[1]) + '<span class="lbl-sub"> (' + esc(m[2]) + ')</span>'
      : esc(label);
    return (
      '<div class="result-card">' +
      '<div class="result-num">' +
      numObj.val +
      '</div>' +
      '<div class="result-label">' +
      labelHtml +
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
      var parts = [];
      if (data.cleaned !== String(raw).trim()) {
        parts.push('계산에 쓴 이름: ' + data.cleaned + ' (주식회사·Inc. 같은 회사 형태 표기는 빼고 계산했어요)');
      } else {
        parts.push('계산에 쓴 이름: ' + data.cleaned);
      }
      var how = [];
      if (data.mixedScript) how.push('한글과 영문을 함께 더했어요');
      if (data.usedDigit) how.push('숫자는 적힌 값 그대로 성격수·운명수에 더했어요');
      if (how.length) parts.push(how.join(' · '));
      cleanedEl.textContent = parts.join(' · ');
    }
    if (numsEl) {
      numsEl.innerHTML =
        numCard('운명수 (표현수)', '상호가 세상에 내거는 방향과 역할이에요.', data.expression) +
        numCard('혼의수', '브랜드가 속으로 추구하는 가치예요. 모음으로 계산해요.', data.soul) +
        numCard('성격수', '고객이 처음 받는 인상이에요. 자음으로 계산해요.', data.personality);
    }
    var bizEl = document.getElementById('bizMeaning');
    if (bizEl) {
      var bv = data.expression.val;
      bizEl.innerHTML =
        '<div class="biz-meaning-title">운명수 ' + bv + ' · ' + esc(TRAITS[bv] || '') + '</div>' +
        '<p>' + esc(BIZ[bv] || '') + '</p>';
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
