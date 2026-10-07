/**
 * 8code.kr 홈 화면 추가 CTA
 * 모바일 브라우저: 우측 하단 작은 플로팅 버튼
 * Android: beforeinstallprompt → 클릭 시 설치창 (없으면 안내)
 * iOS: 공유 → 홈 화면에 추가 안내
 * 홈 아이콘(standalone) / 닫기(14일) 시 숨김
 */
(function () {
  if (window.__paljaPwaInstallInit) return;
  window.__paljaPwaInstallInit = true;

  /* 예전 하단 배너 dismiss 키와 분리 — 예전 × 눌러도 새 FAB는 다시 보여요 */
  var DISMISS_KEY = 'palja:pwaFabDismissedAt';
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
      // 좁은 화면이면 표시 (DevTools 기기 모드 포함). PC 와이드는 제외.
      if (window.matchMedia('(max-width: 820px)').matches) return true;
    } catch (e) {}
    return false;
  }

  function isIos() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /** 카카오톡·네이버·인스타그램 등 앱 안 브라우저 — 홈 화면 추가가 안 돼요 */
  function isInAppBrowser() {
    return /KAKAOTALK|NAVER\(inapp|NAVER|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|BAND\//i.test(navigator.userAgent || '');
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
      '#pwaInstallFab{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));' +
      'z-index:2147483000;display:flex;align-items:center;gap:0;' +
      'font-family:"Noto Sans KR",Pretendard,-apple-system,BlinkMacSystemFont,sans-serif;' +
      'animation:pwaFabIn .28s ease both}' +
      '#pwaInstallFab[hidden]{display:none!important}' +
      '#pwaInstallFabBtn{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(61,43,31,.14);' +
      'background:#fffdf8;color:#4a3520;font-weight:700;font-size:12px;line-height:1;' +
      'border-radius:999px;padding:10px 12px 10px 11px;cursor:pointer;font-family:inherit;' +
      'box-shadow:0 8px 22px rgba(61,43,31,.16)}' +
      '#pwaInstallFabBtn:active{transform:scale(.98)}' +
      '#pwaInstallFabBtn .pwa-fab-ico{width:18px;height:18px;border-radius:6px;background:#c4603a;color:#fffdf8;' +
      'display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}' +
      '#pwaInstallFabClose{border:0;background:rgba(255,253,248,.92);color:#9b7b6a;cursor:pointer;' +
      'width:28px;height:28px;margin-left:4px;border-radius:999px;font-size:16px;line-height:1;' +
      'box-shadow:0 4px 12px rgba(61,43,31,.1);border:1px solid rgba(61,43,31,.1);padding:0}' +
      '@keyframes pwaFabIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
      '#pwaInstallSheet{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:flex-end;' +
      'justify-content:center;background:rgba(44,31,14,.42);padding:16px;box-sizing:border-box}' +
      '#pwaInstallSheet[hidden]{display:none!important}' +
      '#pwaInstallSheet .pwa-sheet{width:min(420px,100%);background:#fffdf8;border-radius:18px 18px 14px 14px;' +
      'padding:22px 20px 18px;box-shadow:0 16px 40px rgba(44,31,14,.22);' +
      'font-family:"Noto Sans KR",Pretendard,-apple-system,BlinkMacSystemFont,sans-serif}' +
      '#pwaInstallSheet h2{margin:0 0 8px;font-size:18px;color:#2c1f0e}' +
      '#pwaInstallSheet p{margin:0 0 12px;font-size:14px;line-height:1.55;color:#5c4a3a}' +
      '#pwaInstallSheet ol{margin:0 0 16px;padding-left:1.2em;font-size:14px;line-height:1.6;color:#3d2b1f}' +
      '#pwaInstallSheet ol li{margin-bottom:6px}' +
      '#pwaInstallSheet .pwa-sheet-note{font-size:12.5px;color:#8a7262;margin:-4px 0 14px}' +
      '#pwaInstallSheet .pwa-sheet-actions{display:flex;gap:8px;flex-wrap:wrap}' +
      '#pwaInstallSheet .pwa-sheet-btn{flex:1;min-width:120px;border:0;border-radius:999px;padding:12px 14px;' +
      'font-weight:700;font-size:14px;cursor:pointer;font-family:inherit}' +
      '#pwaInstallSheet .pwa-sheet-btn.primary{background:#c4603a;color:#fff}' +
      '#pwaInstallSheet .pwa-sheet-btn.ghost{background:transparent;color:#6b5545;border:1px solid rgba(61,43,31,.16)}' +
      /* 예전 상단/하단 CTA 잔여 숨김 */
      '.topbar-install-btn,#pwaInstallBar{display:none!important}';
    var style = document.createElement('style');
    style.id = 'pwaInstallStyle';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function removeFab() {
    var fab = document.getElementById('pwaInstallFab');
    if (fab) fab.remove();
  }

  function closeSheet() {
    var sheet = document.getElementById('pwaInstallSheet');
    if (sheet) sheet.hidden = true;
  }

  function bindSheetOnce(sheet) {
    if (sheet.getAttribute('data-bound') === '1') return;
    sheet.setAttribute('data-bound', '1');
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) closeSheet();
    });
    var ok = document.getElementById('pwaSheetOk');
    var later = document.getElementById('pwaSheetLater');
    if (ok) {
      ok.addEventListener('click', function () {
        setDismissed();
        removeFab();
        closeSheet();
      });
    }
    if (later) later.addEventListener('click', closeSheet);
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
        '<h2 id="pwaInstallSheetTitle">아이폰 홈 화면에 추가하기</h2>' +
        (isInAppBrowser()
          ? '<p>카카오톡·네이버 같은 앱 안에서는 홈 화면에 추가할 수 없어요.</p>' +
            '<ol>' +
            '<li>화면 오른쪽 아래(또는 위)의 <strong>⋯</strong> 메뉴를 눌러요.</li>' +
            '<li><strong>Safari로 열기</strong>(다른 브라우저로 열기)를 눌러요.</li>' +
            '<li>Safari에서 아래 방법으로 추가해요.</li>' +
            '</ol>'
          : '') +
        '<ol>' +
        '<li>화면 아래(또는 주소창 옆)의 <strong>공유 버튼</strong>(네모에 위 화살표)을 눌러요.</li>' +
        '<li>메뉴를 아래로 내려 <strong>홈 화면에 추가</strong>를 눌러요.</li>' +
        '<li>오른쪽 위 <strong>추가</strong>를 누르면 끝이에요.</li>' +
        '</ol>' +
        '<p class="pwa-sheet-note">홈 화면의 팔자연구소 아이콘을 누르면 앱처럼 바로 열려요.</p>' +
        '<div class="pwa-sheet-actions">' +
        '<button type="button" class="pwa-sheet-btn primary" id="pwaSheetOk">알겠어요</button>' +
        '<button type="button" class="pwa-sheet-btn ghost" id="pwaSheetLater">닫기</button>' +
        '</div></div>';
      document.body.appendChild(sheet);
      bindSheetOnce(sheet);
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
        '<h2 id="pwaInstallSheetTitle">홈 화면에 추가하기</h2>' +
        (isInAppBrowser()
          ? '<p>카카오톡·네이버 같은 앱 안에서는 홈 화면에 추가가 어려워요. 메뉴에서 <strong>브라우저로 열기</strong> 후 다시 시도해 주세요.</p>'
          : '') +
        '<ol id="pwaInstallSheetSteps">' +
        '<li>브라우저 메뉴(오른쪽 위 <strong>⋮</strong>, 삼성 인터넷은 아래 <strong>≡</strong>)를 열어요.</li>' +
        '<li><strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 눌러요.</li>' +
        '</ol>' +
        '<div class="pwa-sheet-actions">' +
        '<button type="button" class="pwa-sheet-btn primary" id="pwaSheetOk">알겠어요</button>' +
        '<button type="button" class="pwa-sheet-btn ghost" id="pwaSheetLater">닫기</button>' +
        '</div></div>';
      document.body.appendChild(sheet);
      bindSheetOnce(sheet);
    }
    sheet.hidden = false;
  }

  async function runInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (e) {}
      deferredPrompt = null;
      promptReady = false;
      setDismissed();
      removeFab();
      return;
    }
    if (isIos()) {
      showIosSheet();
      return;
    }
    showAndroidFallbackSheet();
  }

  function showFab() {
    if (isStandalone() || !isMobileWeb() || isDismissed()) return;
    injectStyle();
    var fab = document.getElementById('pwaInstallFab');
    if (fab) {
      fab.hidden = false;
      return;
    }
    fab = document.createElement('div');
    fab.id = 'pwaInstallFab';
    fab.innerHTML =
      '<button type="button" id="pwaInstallFabBtn" aria-label="앱 설치 (홈 화면에 추가)">' +
      '<span class="pwa-fab-ico" aria-hidden="true">八</span>' +
      '<span>앱설치</span>' +
      '</button>' +
      '<button type="button" id="pwaInstallFabClose" aria-label="닫기">×</button>';
    document.body.appendChild(fab);
    document.getElementById('pwaInstallFabBtn').addEventListener('click', function () {
      runInstall();
    });
    document.getElementById('pwaInstallFabClose').addEventListener('click', function () {
      setDismissed();
      removeFab();
    });
  }

  function onPromptReady(e) {
    e.preventDefault();
    deferredPrompt = e;
    promptReady = true;
    if (isStandalone() || !isMobileWeb() || isDismissed()) return;
    showFab();
  }

  function mount() {
    if (isStandalone() || !isMobileWeb()) return;
    ensureManifestLink();
    ensureServiceWorker();
    // 예전 UI 잔여 제거
    var oldBar = document.getElementById('pwaInstallBar');
    if (oldBar) oldBar.remove();
    var oldTop = document.querySelectorAll('.topbar-install-btn');
    for (var i = 0; i < oldTop.length; i++) oldTop[i].remove();

    function tryShow() {
      if (!isDismissed()) showFab();
    }
    tryShow();
    // body/레이아웃이 늦게 붙는 페이지 대비
    setTimeout(tryShow, 300);
    setTimeout(tryShow, 1200);
  }

  window.addEventListener('beforeinstallprompt', onPromptReady);

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    promptReady = false;
    setDismissed();
    removeFab();
    closeSheet();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
