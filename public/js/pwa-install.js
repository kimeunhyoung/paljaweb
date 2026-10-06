/**
 * 8code.kr 홈 화면 추가 CTA
 * Android: beforeinstallprompt → 클릭 시 설치창
 * iOS: 공유 → 홈 화면에 추가 단계만 안내
 */
(function () {
  if (window.__paljaPwaInstallInit) return;
  window.__paljaPwaInstallInit = true;

  var DISMISS_KEY = 'palja:pwaInstallDismissedAt';
  var DISMISS_DAYS = 14;
  var deferredPrompt = null;
  var promptReady = false;

  function isStandalone() {
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    } catch (e) {}
    if (window.navigator.standalone === true) return true;
    var html = document.documentElement;
    if (html.classList.contains('tarot-standalone') || html.classList.contains('kirke-standalone')) {
      return true;
    }
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('standalone') === '1' || q.get('app') === '1') return true;
      if (q.get('embedded') === '1') return true;
    } catch (e2) {}
    return false;
  }

  function isMobileWeb() {
    var ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
    try {
      return window.matchMedia('(max-width: 820px)').matches && 'ontouchstart' in window;
    } catch (e) {
      return false;
    }
  }

  function isIos() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function isDismissed() {
    try {
      var raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      if (raw === '1') return true;
      var at = Number(raw);
      if (!at) return false;
      return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch (e) {
      return false;
    }
  }

  function setDismissed() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (e) {}
  }

  function ensureManifestLink() {
    if (document.querySelector('link[rel="manifest"]')) return;
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);
  }

  function ensureServiceWorker() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register('/sw.js').catch(function () {
      return null;
    });
  }

  function injectStyle() {
    if (document.getElementById('pwaInstallStyle')) return;
    var css =
      '#pwaInstallBar{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;' +
      'display:flex;align-items:center;gap:8px;padding:10px 10px 10px 14px;' +
      'background:#fffdf8;border:1px solid rgba(61,43,31,.14);border-radius:16px;' +
      'box-shadow:0 10px 28px rgba(61,43,31,.18);animation:pwaBarIn .28s ease both;' +
      'font-family:"Noto Sans KR",Pretendard,-apple-system,BlinkMacSystemFont,sans-serif}' +
      '#pwaInstallBar .pwa-copy{flex:1;min-width:0}' +
      '#pwaInstallBar .pwa-kicker{display:block;font-size:11px;font-weight:700;letter-spacing:.04em;' +
      'color:#9b7b6a;margin-bottom:2px}' +
      '#pwaInstallBar .pwa-title{display:block;font-size:14px;font-weight:700;color:#3d2b1f;line-height:1.3}' +
      '#pwaInstallBarBtn{flex:0 0 auto;border:0;cursor:pointer;background:#c4603a;color:#fff;' +
      'font-weight:700;font-size:13px;border-radius:999px;padding:10px 14px;line-height:1;font-family:inherit}' +
      '#pwaInstallBarBtn:disabled{opacity:.55;cursor:wait}' +
      '#pwaInstallBarClose{border:0;background:transparent;cursor:pointer;color:#9b7b6a;' +
      'font-size:20px;line-height:1;padding:6px 8px;border-radius:999px}' +
      '#pwaInstallBarClose:hover{background:rgba(61,43,31,.06)}' +
      '@keyframes pwaBarIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}' +
      '.topbar-install-btn{display:none;align-items:center;gap:4px;border:1px solid rgba(196,96,58,.35);' +
      'background:rgba(196,96,58,.1);color:#a84a2a;font-weight:700;font-size:12px;line-height:1;' +
      'border-radius:999px;padding:7px 11px;cursor:pointer;font-family:inherit;white-space:nowrap}' +
      '.topbar-install-btn:hover{background:rgba(196,96,58,.16)}' +
      '.topbar-install-btn:disabled{opacity:.55;cursor:wait}' +
      '@media (max-width:820px){.topbar-install-btn{display:inline-flex}}' +
      '#pwaInstallSheet{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:flex-end;' +
      'justify-content:center;background:rgba(44,31,14,.42);padding:16px;box-sizing:border-box}' +
      '#pwaInstallSheet[hidden]{display:none!important}' +
      '#pwaInstallSheet .pwa-sheet{width:min(420px,100%);background:#fffdf8;border-radius:18px 18px 14px 14px;' +
      'padding:22px 20px 18px;box-shadow:0 16px 40px rgba(44,31,14,.22);' +
      'font-family:"Noto Sans KR",Pretendard,-apple-system,BlinkMacSystemFont,sans-serif}' +
      '#pwaInstallSheet h2{margin:0 0 8px;font-size:18px;color:#2c1f0e}' +
      '#pwaInstallSheet p{margin:0 0 12px;font-size:14px;line-height:1.55;color:#5c4a3a}' +
      '#pwaInstallSheet ol{margin:0 0 16px;padding-left:1.2em;font-size:14px;line-height:1.6;color:#3d2b1f}' +
      '#pwaInstallSheet .pwa-sheet-actions{display:flex;gap:8px;flex-wrap:wrap}' +
      '#pwaInstallSheet .pwa-sheet-btn{flex:1;min-width:120px;border:0;border-radius:999px;padding:12px 14px;' +
      'font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}' +
      '#pwaInstallSheet .pwa-sheet-btn.primary{background:#c4603a;color:#fff}' +
      '#pwaInstallSheet .pwa-sheet-btn.ghost{background:transparent;color:#6b5545;border:1px solid rgba(61,43,31,.16)}';
    var style = document.createElement('style');
    style.id = 'pwaInstallStyle';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function removeBar() {
    var bar = document.getElementById('pwaInstallBar');
    if (bar) bar.remove();
  }

  function closeSheet() {
    var sheet = document.getElementById('pwaInstallSheet');
    if (sheet) sheet.hidden = true;
  }

  function syncButtonLabels() {
    var barBtn = document.getElementById('pwaInstallBarBtn');
    var barTitle = document.querySelector('#pwaInstallBar .pwa-title');
    var topBtn = document.querySelector('.topbar-install-btn');

    if (isIos()) {
      if (barBtn) {
        barBtn.disabled = false;
        barBtn.textContent = '홈 화면 추가';
      }
      if (barTitle) barTitle.textContent = '홈 화면에 추가';
      if (topBtn) {
        topBtn.disabled = false;
        topBtn.innerHTML = '<span aria-hidden="true">⬇</span><span>홈 추가</span>';
      }
      return;
    }

    if (promptReady && deferredPrompt) {
      if (barBtn) {
        barBtn.disabled = false;
        barBtn.textContent = '홈 화면 추가';
      }
      if (barTitle) barTitle.textContent = '홈 화면에 추가';
      if (topBtn) {
        topBtn.disabled = false;
        topBtn.innerHTML = '<span aria-hidden="true">⬇</span><span>홈 추가</span>';
      }
      return;
    }

    if (barBtn) {
      barBtn.disabled = true;
      barBtn.textContent = '홈 화면 추가';
    }
    if (barTitle) barTitle.textContent = '홈 화면에 추가';
    if (topBtn) {
      topBtn.disabled = true;
      topBtn.innerHTML = '<span aria-hidden="true">⬇</span><span>홈 추가</span>';
    }
  }

  function showIosSheet() {
    injectStyle();
    var sheet = document.getElementById('pwaInstallSheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'pwaInstallSheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-labelledby', 'pwaInstallSheetTitle');
      sheet.innerHTML =
        '<div class="pwa-sheet">' +
        '<h2 id="pwaInstallSheetTitle">홈 화면에 추가</h2>' +
        '<ol>' +
        '<li><strong>공유</strong> 버튼</li>' +
        '<li><strong>홈 화면에 추가</strong></li>' +
        '</ol>' +
        '<div class="pwa-sheet-actions">' +
        '<button type="button" class="pwa-sheet-btn primary" id="pwaSheetOk">확인</button>' +
        '<button type="button" class="pwa-sheet-btn ghost" id="pwaSheetLater">닫기</button>' +
        '</div></div>';
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) closeSheet();
      });
      document.getElementById('pwaSheetOk').addEventListener('click', function () {
        setDismissed();
        removeBar();
        closeSheet();
      });
      document.getElementById('pwaSheetLater').addEventListener('click', closeSheet);
    }
    sheet.hidden = false;
  }

  function showAndroidFallbackSheet() {
    injectStyle();
    var sheet = document.getElementById('pwaInstallSheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'pwaInstallSheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-labelledby', 'pwaInstallSheetTitle');
      sheet.innerHTML =
        '<div class="pwa-sheet">' +
        '<h2 id="pwaInstallSheetTitle">홈 화면에 추가</h2>' +
        '<ol id="pwaInstallSheetSteps"></ol>' +
        '<div class="pwa-sheet-actions">' +
        '<button type="button" class="pwa-sheet-btn primary" id="pwaSheetOk">확인</button>' +
        '<button type="button" class="pwa-sheet-btn ghost" id="pwaSheetLater">닫기</button>' +
        '</div></div>';
      document.body.appendChild(sheet);
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) closeSheet();
      });
      document.getElementById('pwaSheetOk').addEventListener('click', function () {
        setDismissed();
        removeBar();
        closeSheet();
      });
      document.getElementById('pwaSheetLater').addEventListener('click', closeSheet);
    }
    document.getElementById('pwaInstallSheetTitle').textContent = '홈 화면에 추가';
    var lead = document.getElementById('pwaInstallSheetLead');
    if (lead) lead.remove();
    document.getElementById('pwaInstallSheetSteps').innerHTML =
      '<li>메뉴(⋮)</li>' +
      '<li><strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong></li>';
    sheet.hidden = false;
  }

  async function runInstall() {
    // 사용자 제스처 안에서 바로 호출해야 Chrome 설치창이 열림
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (e) {}
      deferredPrompt = null;
      promptReady = false;
      setDismissed();
      removeBar();
      return;
    }
    if (isIos()) {
      showIosSheet();
      return;
    }
    showAndroidFallbackSheet();
  }

  function showBar() {
    if (isDismissed()) return;
    if (document.getElementById('pwaInstallBar')) {
      syncButtonLabels();
      return;
    }
    // Android: 원클릭 가능할 때만 배너 노출 (준비되면 뜸). iOS는 안내용으로 바로 노출.
    if (!isIos() && !(promptReady && deferredPrompt)) return;

    injectStyle();
    var bar = document.createElement('div');
    bar.id = 'pwaInstallBar';
    bar.innerHTML =
      '<div class="pwa-copy">' +
      '<span class="pwa-kicker">8code.kr</span>' +
      '<span class="pwa-title">홈 화면에 추가</span>' +
      '</div>' +
      '<button type="button" id="pwaInstallBarBtn">홈 화면 추가</button>' +
      '<button type="button" id="pwaInstallBarClose" aria-label="닫기">×</button>';
    document.body.appendChild(bar);
    document.getElementById('pwaInstallBarBtn').addEventListener('click', function () {
      runInstall();
    });
    document.getElementById('pwaInstallBarClose').addEventListener('click', function () {
      setDismissed();
      removeBar();
    });
    syncButtonLabels();
  }

  function injectTopbarBtn() {
    var right = document.querySelector('.site-top .topbar-right');
    if (!right) return;
    var btn = right.querySelector('.topbar-install-btn');
    if (!btn) {
      injectStyle();
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'topbar-install-btn';
      btn.setAttribute('aria-label', '홈 화면에 추가');
      btn.innerHTML = '<span aria-hidden="true">⬇</span><span>홈 추가</span>';
      btn.addEventListener('click', function () {
        runInstall();
      });
      right.insertBefore(btn, right.firstChild);
    }
    // Android: 설치 준비 전엔 탑바 버튼 숨김 → 준비되면 바로 설치만
    if (!isIos() && !(promptReady && deferredPrompt)) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    syncButtonLabels();
  }

  function onPromptReady(e) {
    e.preventDefault();
    deferredPrompt = e;
    promptReady = true;
    if (isStandalone() || !isMobileWeb() || isDismissed()) return;
    showBar();
    injectTopbarBtn();
  }

  function mount() {
    if (isStandalone() || !isMobileWeb()) return;
    ensureManifestLink();
    ensureServiceWorker();

    if (isIos()) {
      injectTopbarBtn();
      setTimeout(injectTopbarBtn, 400);
      if (!isDismissed()) showBar();
      return;
    }

    // Android: SW 등록 후 이벤트 대기. 준비되면 배너/버튼 노출 → 클릭=바로 설치창
    injectTopbarBtn();
    setTimeout(injectTopbarBtn, 400);
    setTimeout(injectTopbarBtn, 1500);
    // 이벤트가 이미 늦었을 수 있어 SW ready 후 한 번 더 UI sync
    ensureServiceWorker().then(function () {
      syncButtonLabels();
      injectTopbarBtn();
    });
  }

  window.addEventListener('beforeinstallprompt', onPromptReady);

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    promptReady = false;
    setDismissed();
    removeBar();
    closeSheet();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
