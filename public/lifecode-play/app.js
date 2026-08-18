(function () {
  const D = window.LC_PLAY_DATA;
  const HISTORY_KEY = 'lc_play_history_v1';
  const HISTORY_MAX = 15;

  const $ = (id) => document.getElementById(id);

  function reduceToSingle(n, allowM = true) {
    let r = n;
    while (r > 9) {
      if (allowM && (r === 11 || r === 22 || r === 33)) return r;
      r = String(r)
        .split('')
        .reduce((a, b) => Number(a) + Number(b), 0);
    }
    return r;
  }

  function getNameScore(name) {
    let soulSum = 0;
    let consSum = 0;
    const isH = /[ㄱ-ㅎ|가-힣]/.test(name);
    const hc = {
      ㄱ: 1, ㄴ: 2, ㄷ: 3, ㄹ: 4, ㅁ: 5, ㅂ: 6, ㅅ: 7, ㅇ: 8, ㅈ: 9, ㅊ: 1, ㅋ: 2, ㅌ: 3, ㅍ: 4, ㅎ: 5,
    };
    const hv = {
      ㅏ: 1, ㅐ: 2, ㅑ: 2, ㅒ: 3, ㅓ: 3, ㅔ: 4, ㅕ: 4, ㅖ: 5, ㅗ: 5, ㅘ: 6, ㅙ: 7, ㅚ: 8, ㅛ: 6, ㅜ: 7, ㅝ: 8, ㅞ: 9, ㅟ: 1, ㅠ: 8, ㅡ: 9, ㅢ: 1, ㅣ: 1,
    };
    const enVal = {
      A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9, S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
    };
    if (isH) {
      for (const char of name) {
        const code = char.charCodeAt(0) - 44032;
        if (code < 0 || code > 11171) continue;
        const cho = Math.floor(code / 588);
        const jung = Math.floor((code % 588) / 28);
        const jong = code % 28;
        const choList = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        const jungList = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
        const jongList = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        const choChar = choList[cho];
        const nCho = { ㄲ: 'ㄱ', ㄸ: 'ㄷ', ㅃ: 'ㅂ', ㅆ: 'ㅅ', ㅉ: 'ㅈ' }[choChar] || choChar;
        soulSum += hv[jungList[jung]] || 0;
        consSum += hc[nCho] || 0;
        if (jong > 0) {
          const jChar = jongList[jong].substring(0, 1);
          const nJ = { ㄲ: 'ㄱ', ㄸ: 'ㄷ', ㅃ: 'ㅂ', ㅆ: 'ㅅ', ㅉ: 'ㅈ' }[jChar] || jChar;
          consSum += hc[nJ] || 0;
        }
      }
    } else {
      for (const c of name.toUpperCase().replace(/[^A-Z]/g, '')) {
        const val = enVal[c] || 0;
        if (['A', 'E', 'I', 'O', 'U'].includes(c)) soulSum += val;
        else consSum += val;
      }
    }
    return { soulSum, consSum };
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveHistory(name, birth) {
    const list = loadHistory().filter((h) => !(h.name === name && h.birth === birth));
    list.unshift({ name, birth, at: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
    renderHistory();
  }

  function formatBirthLabel(birth) {
    const [y, m, d] = String(birth || '').split('-');
    if (!y || !m || !d) return birth || '';
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  function historyInitial(name) {
    const t = (name || '').trim();
    if (!t) return '?';
    return t.charAt(0).toUpperCase();
  }

  function clearAllHistory() {
    if (!loadHistory().length) return;
    if (!window.confirm('저장된 기록을 모두 삭제할까요?\n(이 기기에만 저장된 데이터입니다.)')) return;
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  }

  function renderHistory() {
    const box = $('historyList');
    const countEl = $('historyCount');
    const clearBtn = $('historyClearAll');
    if (!box) return;

    const list = loadHistory();
    if (countEl) countEl.textContent = list.length ? `${list.length}/${HISTORY_MAX}` : '';
    if (clearBtn) clearBtn.hidden = list.length === 0;

    if (!list.length) {
      box.innerHTML = '<p class="history-empty">계산하면 이름·생년월일이 이 기기에 저장됩니다.<br>탭하면 바로 다시 볼 수 있어요.</p>';
      return;
    }

    box.innerHTML = list
      .map(
        (h, i) => `
      <article class="history-card">
        <button type="button" class="history-load" data-i="${i}">
          <span class="history-avatar" aria-hidden="true">${escapeHtml(historyInitial(h.name))}</span>
          <span class="history-text">
            <strong>${escapeHtml(h.name || '이름 없음')}</strong>
            <span>${escapeHtml(formatBirthLabel(h.birth))}</span>
          </span>
        </button>
        <button type="button" class="history-del" data-i="${i}" aria-label="${escapeHtml(h.name || '이름 없음')} 삭제">×</button>
      </article>`,
      )
      .join('');

    box.querySelectorAll('.history-load').forEach((btn) => {
      btn.onclick = () => {
        const item = list[Number(btn.dataset.i)];
        $('inputName').value = item.name || '';
        $('inputBirth').value = item.birth;
        startAnalysis();
      };
    });
    box.querySelectorAll('.history-del').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.i);
        const next = loadHistory().filter((_, j) => j !== idx);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        renderHistory();
      };
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function bindAccordions(root) {
    root.querySelectorAll('.accordion-header').forEach((h) => {
      h.onclick = () => h.parentElement.classList.toggle('active');
    });
  }

  function shortFor(key, num) {
    if (key === '문 넘버') return D.MOON_SHORT[num] || '';
    return D.CORE_SHORT[num] || '';
  }

  function runAnalysis() {
    const nameRaw = $('inputName').value.trim();
    const name = nameRaw || '무명';
    const dateStr = $('inputBirth').value;
    if (!dateStr) {
      $('inputBirth').focus();
      return;
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    saveHistory(nameRaw, dateStr);

    const yr_r = reduceToSingle(String(y).split('').reduce((a, b) => Number(a) + Number(b), 0), true);
    const mr_r = reduceToSingle(m, true);
    const dr_r = reduceToSingle(d, true);
    const lpS = yr_r + mr_r + dr_r;
    const lp = reduceToSingle(lpS, true);
    const mnS = mr_r + dr_r;
    const mn = reduceToSingle(mnS, true);
    const hasName = nameRaw.length > 0;
    const sc = getNameScore(name);
    const su = reduceToSingle(sc.soulSum, true);
    const ps = reduceToSingle(sc.consSum, true);
    const dt = reduceToSingle(sc.soulSum + sc.consSum, true);
    const mt = reduceToSingle(lp + dt, true);

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const curY_r = reduceToSingle(String(curY).split('').reduce((a, b) => Number(a) + Number(b), 0), true);
    const pyS = curY_r + mr_r + dr_r;
    const py = reduceToSingle(pyS, true);
    const pmS = py + curM;
    const pm = reduceToSingle(pmS, true);

    const z = D.getZodiac(m, d);
    $('resultArea').hidden = false;
    $('resultTitle').textContent = hasName ? nameRaw : '생년월일 분석';
    $('resultBirth').textContent = `${y}년 ${m}월 ${d}일`;

    $('zodiacName').textContent = `${z.i} ${z.n}`;
    $('zodiacDesc').textContent = z.t;

    const cards = [
      { label: '인생여정수', val: `${lp}(${lpS})`, key: '인생여정수', n: lp },
      { label: '문 넘버', val: `${mn}(${mnS})`, key: '문 넘버', n: mn },
    ];
    if (hasName) {
      cards.push(
        { label: '운명수', val: String(dt), key: '운명수', n: dt },
        { label: '혼의 수', val: String(su), key: '혼의 수', n: su },
        { label: '성격수', val: String(ps), key: '성격수', n: ps },
        { label: '완성수', val: String(mt), key: '완성수', n: mt },
      );
    }
    $('coreGrid').innerHTML = cards
      .map((c) => `<div class="card"><span>${c.label}</span><strong>${c.val}</strong></div>`)
      .join('');

    $('coreAccordions').innerHTML = cards
      .map(
        (c) => `
      <div class="accordion">
        <div class="accordion-header"><h4>✦ ${c.label} ${c.n}번</h4></div>
        <div class="accordion-content"><p>${escapeHtml(shortFor(c.key, c.n))}</p></div>
      </div>`,
      )
      .join('');
    bindAccordions($('coreAccordions'));

    const ys = D.YEAR_HINT[py] || D.YEAR_HINT[reduceToSingle(py, false)] || { goal: '', action: '' };
    $('yearBox').innerHTML = `
      <div class="year-num">${py}</div>
      <div class="year-meta">
        <strong>${curY}년 · ${D.TITLE_MAP[py] || ''}</strong>
        <p>목표: ${ys.goal} · ${ys.action}</p>
      </div>`;

    const lpV = lp === 11 ? 2 : lp === 22 ? 4 : lp === 33 ? 6 : lp;
    const age1 = 36 - lpV;
    const userAge = curY - y;
    let curStageIdx = 3;
    if (userAge <= age1) curStageIdx = 0;
    else if (userAge <= age1 + 9) curStageIdx = 1;
    else if (userAge <= age1 + 18) curStageIdx = 2;

    const p1 = reduceToSingle(mr_r + dr_r, true);
    const p2 = reduceToSingle(dr_r + yr_r, true);
    const p3 = reduceToSingle(p1 + p2, true);
    const p4 = reduceToSingle(mr_r + yr_r, true);
    const c1 = reduceToSingle(Math.abs(mr_r - dr_r), true);
    const c2 = reduceToSingle(Math.abs(dr_r - yr_r), true);
    const c3 = reduceToSingle(Math.abs(c1 - c2), true);
    const c4 = reduceToSingle(Math.abs(mr_r - yr_r), true);
    const stages = [
      { s: '1단계', a: `0~${age1}`, p: p1, c: c1 },
      { s: '2단계', a: `${age1 + 1}~${age1 + 9}`, p: p2, c: c2 },
      { s: '3단계', a: `${age1 + 10}~${age1 + 18}`, p: p3, c: c3 },
      { s: '4단계', a: `${age1 + 19}~`, p: p4, c: c4 },
    ];
    $('stageTable').innerHTML = stages
      .map(
        (c, i) => `
      <tr class="${i === curStageIdx ? 'stage-current-row' : ''}">
        <td>${c.s}${i === curStageIdx ? ' <span class="now-badge">현재</span>' : ''}</td>
        <td>${c.a}</td>
        <td class="p-num">${c.p}</td>
        <td class="c-num">${c.c}</td>
      </tr>`,
      )
      .join('');

    const curMajorIdx = userAge <= age1 ? 0 : userAge <= age1 + 27 ? 1 : 2;
    const major = [
      { label: '1주기 (월)', num: mr_r, range: `0~${age1}세` },
      { label: '2주기 (일)', num: dr_r, range: `${age1 + 1}~${age1 + 27}세` },
      { label: '3주기 (년)', num: yr_r, range: `${age1 + 28}세~` },
    ];
    $('majorGrid').innerHTML = major
      .map(
        (mc, i) => `
      <div class="cycle-mini-card ${i === curMajorIdx ? 'cycle-mini-active' : ''}">
        <span>${mc.label}</span>
        <strong>${mc.num}</strong>
        <div class="cycle-mini-range">${mc.range}${i === curMajorIdx ? ' · 현재' : ''}</div>
      </div>`,
      )
      .join('');

    const monthNums = [];
    for (let mo = 1; mo <= 12; mo += 1) {
      monthNums.push({ mo, num: reduceToSingle(py + mo, true) });
    }
    $('monthGrid').innerHTML = monthNums
      .map(
        (item) => `
      <button type="button" class="month-cell ${item.mo === curM ? 'is-current' : ''}" data-m="${item.mo}" data-n="${item.num}">
        <span>${item.mo}월</span>
        <strong>${item.num}</strong>
        <small>${D.TL_KEYWORD[item.num] || ''}</small>
      </button>`,
      )
      .join('');

    function showMonthDetail(mo, num) {
      const tag = D.MONTH_TAG[num] || '';
      const blurb = D.MONTH_BLURB[num] || '';
      $('monthDetail').innerHTML = `
        <strong>${mo}월 · ${num}번 · ${tag}</strong>
        <p>${escapeHtml(blurb)}</p>`;
    }
    showMonthDetail(curM, pm);
    $('monthGrid').querySelectorAll('.month-cell').forEach((btn) => {
      btn.onclick = () => {
        $('monthGrid').querySelectorAll('.month-cell').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        showMonthDetail(Number(btn.dataset.m), Number(btn.dataset.n));
      };
    });

    $('resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const TOSS_MSG = 'paljaweb-lifecode';
  const isTossApp =
    document.documentElement.classList.contains('toss-app') ||
    new URLSearchParams(window.location.search).get('source') === 'toss';
  const isPlayNative = typeof window.PaljaPlayAds !== 'undefined';
  const AD_SKIP_MS = 10 * 60 * 1000;
  let tossAdPending = false;
  let tossAdTimer = 0;
  let playAdPending = false;
  let playAdTimer = 0;

  function shouldSkipAd(storageKey, dateStr) {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return false;
      const { date, t } = JSON.parse(raw);
      return date === dateStr && Date.now() - t < AD_SKIP_MS;
    } catch {
      return false;
    }
  }

  function markAdSkip(storageKey, dateStr) {
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ date: dateStr, t: Date.now() }),
      );
    } catch {
      /* ignore */
    }
  }

  function shouldSkipTossAd(dateStr) {
    return shouldSkipAd('lc_toss_ad_skip', dateStr);
  }

  function markTossAd(dateStr) {
    markAdSkip('lc_toss_ad_skip', dateStr);
  }

  function shouldSkipPlayAd(dateStr) {
    return shouldSkipAd('lc_play_ad_skip', dateStr);
  }

  function markPlayAd(dateStr) {
    markAdSkip('lc_play_ad_skip', dateStr);
  }

  function requestTossAdThenRun() {
    if (tossAdPending) return;
    tossAdPending = true;
    window.clearTimeout(tossAdTimer);
    tossAdTimer = window.setTimeout(() => {
      if (!tossAdPending) return;
      tossAdPending = false;
      runAnalysis();
    }, 12000);
    window.parent.postMessage({ source: TOSS_MSG, type: 'run-analysis-ad' }, '*');
  }

  function requestPlayAdThenRun() {
    if (playAdPending) return;
    playAdPending = true;
    window.clearTimeout(playAdTimer);
    playAdTimer = window.setTimeout(() => {
      if (!playAdPending) return;
      playAdPending = false;
      runAnalysis();
    }, 12000);
    window.__paljaOnPlayAdDone = () => {
      playAdPending = false;
      window.clearTimeout(playAdTimer);
      const dateStr = $('inputBirth').value;
      if (dateStr) markPlayAd(dateStr);
      runAnalysis();
    };
    try {
      window.PaljaPlayAds.requestInterstitial();
    } catch {
      playAdPending = false;
      window.clearTimeout(playAdTimer);
      runAnalysis();
    }
  }

  /** 확인하기·기록 탭 공통 — Play·토스는 전면 광고 후 결과 */
  function startAnalysis() {
    const dateStr = $('inputBirth').value;
    if (!dateStr) {
      $('inputBirth').focus();
      return;
    }
    if (isPlayNative && !shouldSkipPlayAd(dateStr)) {
      requestPlayAdThenRun();
      return;
    }
    if (
      isTossApp &&
      window.parent !== window &&
      !shouldSkipTossAd(dateStr)
    ) {
      requestTossAdThenRun();
      return;
    }
    runAnalysis();
  }

  $('btnRun').addEventListener('click', startAnalysis);

  if (isTossApp) {
    window.addEventListener('message', (ev) => {
      if (
        !ev.data ||
        ev.data.source !== TOSS_MSG ||
        ev.data.type !== 'run-analysis-continue'
      ) {
        return;
      }
      tossAdPending = false;
      window.clearTimeout(tossAdTimer);
      const dateStr = $('inputBirth').value;
      if (dateStr) markTossAd(dateStr);
      runAnalysis();
    });
  }

  $('btnReset').addEventListener('click', () => {
    $('inputName').value = '';
    $('inputBirth').value = '';
    $('resultArea').hidden = true;
  });
  $('historyClearAll').addEventListener('click', clearAllHistory);

  renderHistory();
})();
