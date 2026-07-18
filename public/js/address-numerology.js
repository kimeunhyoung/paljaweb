/**
 * 주소·전화번호 수비학 계산 (피타고라스 환원 1~9)
 * 도로명 영문·숫자·라틴 문자만 환산. 한글 도로명은 숫자만 추출.
 */
(function () {
  'use strict';

  var LETTER_MAP = {
    a: 1, j: 1, s: 1,
    b: 2, k: 2, t: 2,
    c: 3, l: 3, u: 3,
    d: 4, m: 4, v: 4,
    e: 5, n: 5, w: 5,
    f: 6, o: 6, x: 6,
    g: 7, p: 7, y: 7,
    h: 8, q: 8, z: 8,
    i: 9, r: 9
  };

  var KARMA = {
    13: '변형·재구성의 진동(카르마 13). 낡은 구조를 깨고 다시 쌓는 기운이 강합니다.',
    14: '변화·해체와 재편의 진동(카르마 14). 급격한 전환이 올 수 있어 균형이 중요합니다.',
    16: '각성·재건의 진동(카르마 16). 겉모습이 흔들리며 본질을 다시 보게 합니다.',
    19: '독립·재출발의 진동(카르마 19). 혼자 서려는 에너지와 책임이 함께 옵니다.'
  };

  var HOUSE = {
    1: {
      title: '독립과 리더십의 집',
      theme: '개성·용기·추진력',
      body: '창조적 사업·새 출발을 모색하기에 좋은 진동입니다. 리더십과 자주성이 자랍니다.',
      caution: '함께 살아도 고독감이 생길 수 있고, 인내심을 키우는 과제가 따릅니다.',
      keywords: '용기 · 독립 · 혁신 · 리더십 · 새로운 시작'
    },
    2: {
      title: '평화와 파트너십의 집',
      theme: '조용함·조화·관계',
      body: '파트너십·결혼에 긍정적인 집입니다. 직관·예술·음악 감수성이 살아납니다.',
      caution: '혼자만의 공간을 원하면 맞지 않을 수 있고, 갈등 시 상처가 깊어질 수 있습니다.',
      keywords: '인내 · 협동 · 민감성 · 온정 · 조화'
    },
    3: {
      title: '창조와 열정의 집',
      theme: '표현·사회성·로맨스',
      body: '긍정 에너지와 창조성이 풍부합니다. 자기표현·사회생활·로맨스가 활발해지기 쉽습니다.',
      caution: '충동적 행동·산만한 에너지에 주의하고, 재정 관리를 꼭 챙기세요.',
      keywords: '창조성 · 우정 · 낙관 · 상상력 · 삶의 기쁨'
    },
    4: {
      title: '안전과 안정의 집',
      theme: '질서·실용·토대',
      body: '질서·검소함·실용성의 집입니다. 근면하고 훈련된 사람에게 안정감을 줍니다.',
      caution: '가족·친척 이슈가 생길 수 있으나 상식으로 풀어가면 됩니다. 차 번호도 삶의 리듬에 영향을 줄 수 있습니다.',
      keywords: '안전 · 토대 · 미래계획 · 질서 · 근면'
    },
    5: {
      title: '변화와 활동의 집',
      theme: '이동·자극·네트워크',
      body: '변화·이동·자극이 잦습니다. 세일즈·네트워크·출판·기업가 정신에 유리합니다.',
      caution: '혼돈·충동적 결정·잦은 이사가 오기 쉽고, 편안한 휴식은 기대하기 어렵습니다. 스트레스 많은 직업에는 부담이 될 수 있습니다.',
      keywords: '변화 · 다양성 · 사교 · 세일즈 · 이동'
    },
    6: {
      title: '가족과 사랑의 집',
      theme: '양육·보금자리·돌봄',
      body: '가족·아이·반려동물에게 좋은 보금자리입니다. 예술·홈스쿨링·상담에도 잘 맞습니다.',
      caution: '지나친 희생, 의무와 책임이 이어질 수 있습니다.',
      keywords: '가족 · 양육 · 사랑 · 책임 · 봉사'
    },
    7: {
      title: '성찰과 수행의 집',
      theme: '명상·연구·내면',
      body: '명상·연구·내면 탐구의 성지입니다. 작가·과학자·학생에게 이상적입니다. 영적 성장·공부를 원할 때 잘 맞습니다.',
      caution: '비즈니스·결혼·동거에는 다소 불리할 수 있고, 고독감이 깊어질 수 있습니다.',
      keywords: '내면 · 전문성 · 분석 · 신비 · 요양'
    },
    8: {
      title: '성공과 권위의 집',
      theme: '번영·비즈니스·재정',
      body: '물질적 번영·비즈니스 성공의 진동입니다. 재정 어려움이 있던 사람에게 전환점이 되기도 합니다.',
      caution: '헤프게 쓰면 부담이 커집니다. 생활비가 높을 수 있어 엄격한 재정 규율이 필요합니다.',
      keywords: '번영 · 권위 · 리더십 · 자기훈련 · 돈 관리'
    },
    9: {
      title: '자비와 인류애의 집',
      theme: '치유·완성·공헌',
      body: '인도주의·치유·완성의 공간입니다. 지난 노력에 대한 보상과 직관이 열리기 쉽습니다.',
      caution: '감정이 강하게 올라올 수 있고, 가까운 사람을 소홀히 할 위험이 있습니다.',
      keywords: '이타 · 인류애 · 관용 · 예술 · 완성'
    }
  };

  var DIGIT_MEANING = {
    0: '순환·잠재',
    1: '자기표현·시작·독립',
    2: '협력·민감·균형',
    3: '감정·대화·창조성',
    4: '안정·실용·토대',
    5: '변화·소통·이동',
    6: '돌봄·책임·조언',
    7: '분석·내면·전문성',
    8: '권위·재물·성취',
    9: '완성·자비·확장'
  };

  function sumDigits(n) {
    return String(Math.abs(n))
      .split('')
      .reduce(function (a, b) {
        return a + Number(b);
      }, 0);
  }

  function reduceToSingle(value) {
    var n = Number(value) || 0;
    var path = [n];
    while (n > 9) {
      n = sumDigits(n);
      path.push(n);
    }
    return { single: n, path: path, pre: path[0] };
  }

  function detectSpecial(pre) {
    var notes = [];
    var p = Number(pre) || 0;
    var seenMaster = {};
    var seenKarma = {};
    if (p === 11 || p === 22 || p === 33) {
      notes.push('마스터 수 ' + p + ' 진동을 거칩니다. 한 자리로 줄여도 본래 울림을 함께 보세요.');
      seenMaster[p] = true;
    }
    while (p > 9) {
      if ((p === 11 || p === 22 || p === 33) && !seenMaster[p]) {
        notes.push('마스터 수 ' + p + ' 진동을 거칩니다. 한 자리로 줄여도 본래 울림을 함께 보세요.');
        seenMaster[p] = true;
      }
      if (KARMA[p] && !seenKarma[p]) {
        notes.push(KARMA[p]);
        seenKarma[p] = true;
      }
      p = sumDigits(p);
    }
    return notes;
  }

  function tokenizeValue(raw) {
    var s = String(raw || '').trim();
    var digits = [];
    var letters = [];
    var skippedHangul = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (/\d/.test(ch)) {
        digits.push(Number(ch));
      } else if (/[A-Za-z]/.test(ch)) {
        var v = LETTER_MAP[ch.toLowerCase()];
        if (v) letters.push({ ch: ch.toUpperCase(), value: v });
      } else if (/[가-힣]/.test(ch)) {
        skippedHangul = true;
      }
    }
    return { digits: digits, letters: letters, skippedHangul: skippedHangul, raw: s };
  }

  function valueFromTokens(tokens) {
    if (!tokens.digits.length && !tokens.letters.length) return null;
    var sum = 0;
    var parts = [];
    tokens.digits.forEach(function (d) {
      sum += d;
      parts.push(String(d));
    });
    tokens.letters.forEach(function (L) {
      sum += L.value;
      parts.push(L.ch + '=' + L.value);
    });
    var red = reduceToSingle(sum);
    return {
      sum: sum,
      single: red.single,
      path: red.path,
      parts: parts,
      special: detectSpecial(sum),
      skippedHangul: tokens.skippedHangul
    };
  }

  function analyzeSegment(raw) {
    return valueFromTokens(tokenizeValue(raw));
  }

  function combineHouse(house, road) {
    if (!house && !road) return null;
    if (house && !road) {
      return {
        single: house.single,
        sum: house.sum,
        path: house.path,
        special: house.special.slice(),
        formula: '번지/건물 ' + house.single
      };
    }
    if (!house && road) {
      return {
        single: road.single,
        sum: road.sum,
        path: road.path,
        special: road.special.slice(),
        formula: '도로명 ' + road.single
      };
    }
    var sum = house.single + road.single;
    var red = reduceToSingle(sum);
    return {
      single: red.single,
      sum: sum,
      path: red.path,
      special: detectSpecial(sum).concat(house.special, road.special),
      formula: '번지 ' + house.single + ' + 도로 ' + road.single + ' = ' + sum + (sum !== red.single ? ' → ' + red.single : '')
    };
  }

  function stripPhoneArea(digitsOnly) {
    var d = digitsOnly.replace(/\D/g, '');
    // 국내 휴대: 010/011/016/017/018/019
    if (/^01[016789]\d{7,8}$/.test(d)) return d.slice(3);
    // 서울 02
    if (/^02\d{7,8}$/.test(d)) return d.slice(2);
    // 지역 0XX
    if (/^0\d{1,2}\d{7,8}$/.test(d) && d.length >= 9) {
      return d.length === 10 ? d.slice(2) : d.slice(3);
    }
    return d;
  }

  function analyzePhone(raw) {
    var all = String(raw || '').replace(/\D/g, '');
    if (all.length < 4) return null;
    var local = stripPhoneArea(all);
    if (local.length < 4) local = all;
    var full = reduceToSingle(
      local.split('').reduce(function (a, b) {
        return a + Number(b);
      }, 0)
    );
    var end4 = local.slice(-4);
    var endSum = end4.split('').reduce(function (a, b) {
      return a + Number(b);
    }, 0);
    var endRed = reduceToSingle(endSum);
    var digitNotes = end4.split('').map(function (ch) {
      return { digit: ch, meaning: DIGIT_MEANING[Number(ch)] || '' };
    });
    return {
      local: local,
      full: full,
      end4: end4,
      end: endRed,
      endSpecial: detectSpecial(endSum),
      digitNotes: digitNotes,
      special: detectSpecial(full.path[0] || full.pre || full.single)
    };
  }

  function houseCopy(n) {
    return HOUSE[n] || null;
  }

  function pathLabel(path) {
    if (!path || !path.length) return '';
    return path.join(' → ');
  }

  function el(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    var node = el(id);
    if (node) node.textContent = text;
  }

  function show(id, on) {
    var node = el(id);
    if (!node) return;
    node.hidden = !on;
  }

  function renderCard(containerId, result, label) {
    var box = el(containerId);
    if (!box) return;
    if (!result) {
      box.innerHTML = '<p class="muted">입력 없음</p>';
      return;
    }
    var info = houseCopy(result.single);
    var specialHtml = (result.special || [])
      .filter(function (s, i, arr) {
        return arr.indexOf(s) === i;
      })
      .map(function (s) {
        return '<li>' + escapeHtml(s) + '</li>';
      })
      .join('');
    box.innerHTML =
      '<div class="result-num">' +
      result.single +
      '</div>' +
      '<div class="result-label">' +
      escapeHtml(label) +
      '</div>' +
      (info
        ? '<h3>' +
          escapeHtml(info.title) +
          '</h3><p class="theme">' +
          escapeHtml(info.theme) +
          '</p><p>' +
          escapeHtml(info.body) +
          '</p><p class="caution"><strong>주의</strong> ' +
          escapeHtml(info.caution) +
          '</p><p class="keywords">' +
          escapeHtml(info.keywords) +
          '</p>'
        : '') +
      '<p class="calc-line">계산: ' +
      escapeHtml(pathLabel(result.path) || String(result.sum) + ' → ' + result.single) +
      (result.parts && result.parts.length
        ? ' · (' + escapeHtml(result.parts.join(' + ')) + ')'
        : '') +
      '</p>' +
      (specialHtml ? '<ul class="special-list">' + specialHtml + '</ul>' : '');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderPhone(phone) {
    var box = el('phoneResult');
    if (!box) return;
    if (!phone) {
      box.innerHTML = '<p class="muted">전화번호를 입력하면 전체 합산과 끝 4자리 해석이 나옵니다.</p>';
      return;
    }
    var info = houseCopy(phone.end.single);
    var fullInfo = houseCopy(phone.full.single);
    var digits = phone.digitNotes
      .map(function (d) {
        return '<li><strong>' + d.digit + '</strong> — ' + escapeHtml(d.meaning) + '</li>';
      })
      .join('');
    box.innerHTML =
      '<div class="phone-grid">' +
      '<div><div class="result-num">' +
      phone.end.single +
      '</div><div class="result-label">끝 4자리 수 (가장 중요)</div>' +
      '<p class="calc-line">' +
      escapeHtml(phone.end4) +
      ' → ' +
      escapeHtml(pathLabel(phone.end.path)) +
      '</p>' +
      (info
        ? '<h3>' +
          escapeHtml(info.title.replace('의 집', '') || info.title) +
          ' · 끝자리 테마</h3><p>' +
          escapeHtml(info.theme) +
          ' 진동으로 참고합니다. (전화 전용 표준 체계가 아니라 1~9 공통 의미를 빌려 씁니다.)</p><p>' +
          escapeHtml(info.body) +
          '</p>'
        : '') +
      '</div>' +
      '<div><div class="result-num sm">' +
      phone.full.single +
      '</div><div class="result-label">지역번호 제외 전체 합</div>' +
      '<p class="calc-line">' +
      escapeHtml(phone.local) +
      ' → ' +
      escapeHtml(pathLabel(phone.full.path)) +
      '</p>' +
      (fullInfo ? '<p>' + escapeHtml(fullInfo.theme) + ' 진동(참고)</p>' : '') +
      '</div></div>' +
      '<h4>끝자리 각 수</h4><ul class="digit-list">' +
      digits +
      '</ul>' +
      '<p class="hint-inline">끝자리가 가장 중요합니다. 지역번호·앞자리는 보조로만 봅니다. 아래 해석은 주택 수와 같은 1~9 의미를 참고로 옮긴 것입니다.</p>';
  }

  function run() {
    var houseRaw = (el('houseInput') && el('houseInput').value) || '';
    var roadRaw = (el('roadInput') && el('roadInput').value) || '';
    var aptRaw = (el('aptInput') && el('aptInput').value) || '';
    var phoneRaw = (el('phoneInput') && el('phoneInput').value) || '';

    var house = analyzeSegment(houseRaw);
    var road = analyzeSegment(roadRaw);
    var apt = analyzeSegment(aptRaw);
    var finalHouse = combineHouse(house, road);
    var phone = analyzePhone(phoneRaw);

    var hasAny = !!(house || road || apt || phone);
    show('emptyState', !hasAny);
    show('resultsBlock', hasAny);

    if (house && house.skippedHangul) show('hangulNote', true);
    else if (road && road.skippedHangul) show('hangulNote', true);
    else show('hangulNote', false);

    renderCard('houseCard', house, '번지 · 건물 번호');
    renderCard('roadCard', road, '도로명 · 이웃 환경');
    if (finalHouse) {
      var finalBox = el('finalCard');
      if (finalBox) {
        var info = houseCopy(finalHouse.single);
        var specialHtml = (finalHouse.special || [])
          .filter(function (s, i, arr) {
            return arr.indexOf(s) === i;
          })
          .map(function (s) {
            return '<li>' + escapeHtml(s) + '</li>';
          })
          .join('');
        finalBox.innerHTML =
          '<div class="result-num hero">' +
          finalHouse.single +
          '</div>' +
          '<div class="result-label">최종 주택 수</div>' +
          (info
            ? '<h3>' +
              escapeHtml(info.title) +
              '</h3><p class="theme">' +
              escapeHtml(info.theme) +
              '</p><p>' +
              escapeHtml(info.body) +
              '</p><p class="caution"><strong>주의</strong> ' +
              escapeHtml(info.caution) +
              '</p><p class="keywords">' +
              escapeHtml(info.keywords) +
              '</p>'
            : '') +
          '<p class="calc-line">' +
          escapeHtml(finalHouse.formula) +
          '</p>' +
          (specialHtml ? '<ul class="special-list">' + specialHtml + '</ul>' : '');
      }
    } else {
      setText('finalCard', '');
      var fc = el('finalCard');
      if (fc) fc.innerHTML = '<p class="muted">번지 또는 도로명을 입력하세요.</p>';
    }

    renderCard('aptCard', apt, '아파트 · 호수 (거주자 직접 영향)');
    renderPhone(phone);

    // checklist highlight
    var checks = document.querySelectorAll('[data-check]');
    checks.forEach(function (node) {
      var key = node.getAttribute('data-check');
      var ok = false;
      if (key === 'house') ok = !!house;
      if (key === 'road') ok = !!road;
      if (key === 'special') ok = !!(finalHouse && finalHouse.special && finalHouse.special.length);
      if (key === 'apt') ok = !!apt;
      if (key === 'phone') ok = !!phone;
      node.classList.toggle('is-done', ok);
    });
  }

  function bind() {
    ['houseInput', 'roadInput', 'aptInput', 'phoneInput'].forEach(function (id) {
      var node = el(id);
      if (!node) return;
      node.addEventListener('input', run);
      node.addEventListener('change', run);
    });
    var btn = el('calcBtn');
    if (btn) btn.addEventListener('click', run);
    run();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
