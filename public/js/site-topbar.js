/**
 * .site-top[data-nav-current] 마운트에 공통 탑바·프로그램 내비를 렌더합니다.
 * topbar-session.js보다 먼저 로드하세요.
 */
(function () {
  if (!document.querySelector('script[data-palja-analytics]')) {
    var a = document.createElement('script');
    a.src = 'js/analytics.js?v=1';
    a.defer = true;
    a.setAttribute('data-palja-analytics', '1');
    document.head.appendChild(a);
  }

  if (!document.querySelector('script[data-palja-launch-promo]')) {
    var lp = document.createElement('script');
    lp.src = '/js/launch-promo.js?v=6';
    lp.defer = true;
    lp.setAttribute('data-palja-launch-promo', '1');
    document.head.appendChild(lp);
  }

  var NAV = [
    { id: 'lifecode', href: 'analysis.html', label: '라이프코드' },
    { id: 'astro', href: 'astrology.html', label: '점성학' },
    { id: 'harmony', href: 'compatibility.html', label: '소울하모니' },
    { id: 'p48', href: 'period48-compat.html', label: '48궁합' },
    { id: 'name', href: 'name.html', label: '네임코드' },
    { id: 'calendar', href: 'numerology-calendar.html', label: '수비학달력' },
    { id: 'wallpaper', href: 'numerology-wallpaper.html', label: '에너지배경' },
    { id: 'tarot', href: 'Tarot.html', label: '타로코드' },
    { id: 'counselor', href: 'counselor.html', label: '상담사허브' },
    { id: 'counselor-reading', href: 'counselor-reading.html', label: 'AI리딩' },
    { id: 'counselor-lenormand', href: 'counselor-lenormand.html', label: '레노먼드' },
    { id: 'counselor-iching', href: 'counselor-iching.html', label: '주역' },
    { id: 'pricing', href: 'pricing.html', label: '요금제' }
  ];

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function pageFile() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function buildExportHtml(mount) {
    var exp = (mount.getAttribute('data-export') || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    if (!exp.length) return '';

    var pdfHandler = mount.getAttribute('data-pdf-handler') || 'topbarPdfClick';
    var pdfId = mount.getAttribute('data-pdf-btn-id') || 'topbarPdfBtn';
    var toggle = mount.getAttribute('data-export-mode') === 'toggle';
    var clusterClass = 'topbar-export-cluster' + (toggle ? '' : ' is-always');

    var html =
      '<div class="' + clusterClass + '" id="topbarExportCluster" aria-live="polite">' +
      '<div class="topbar-export-btns">';

    if (exp.indexOf('print') >= 0) {
      var printHandler = mount.getAttribute('data-print-handler');
      var printOnclick = printHandler ? esc(printHandler) + '()' : 'window.print()';
      html +=
        '<button type="button" class="counselor-bar-btn" id="topbarPrintBtn" onclick="' +
        printOnclick + '">🖨 인쇄</button>';
    }
    if (exp.indexOf('pdf') >= 0) {
      html +=
        '<button type="button" class="counselor-bar-btn" id="' + esc(pdfId) + '" onclick="' +
        esc(pdfHandler) + '()">⬇ PDF 저장</button>';
    }

    html += '</div></div>';
    return html;
  }

  function buildNavHtml(current) {
    return NAV.map(function (item) {
      if (item.id === current) {
        return '<span class="program-nav-current" aria-current="page">' + esc(item.label) + '</span>';
      }
      return '<a href="' + esc(item.href) + '">' + esc(item.label) + '</a>';
    }).join('\n    ');
  }

  function buildAuthPeerHref(peerBase) {
    var qs = location.search;
    return qs ? peerBase + qs : peerBase;
  }

  function renderAuth(mount) {
    var title = mount.getAttribute('data-topbar-title') || '';
    var peer = mount.getAttribute('data-auth-peer') || 'signup.html';
    var peerLabel = mount.getAttribute('data-auth-peer-label') || '회원가입';
    var peerHref = buildAuthPeerHref(peer);

    mount.innerHTML =
      '<header class="topbar">' +
      '<div class="topbar-inner">' +
      '<div class="topbar-left">' +
      '<a class="topbar-logo" href="index.html">' +
      '<span class="topbar-logo-mark" aria-hidden="true">八</span>팔자연구소</a>' +
      '<div class="topbar-sep"></div>' +
      '<span class="topbar-title">' + esc(title) + '</span>' +
      '</div>' +
      '<div class="topbar-right" aria-label="계정">' +
      '<a class="topbar-auth-link" id="auth-peer-link" href="' + esc(peerHref) + '">' +
      esc(peerLabel) +
      '</a>' +
      '</div>' +
      '</div>' +
      '</header>';
  }

  function render(mount) {
    if (!mount || mount.getAttribute('data-topbar-rendered') === '1') return;

    if (mount.getAttribute('data-topbar-variant') === 'auth') {
      renderAuth(mount);
      mount.setAttribute('data-topbar-rendered', '1');
      return;
    }

    var title = mount.getAttribute('data-topbar-title') || '';
    var current = mount.getAttribute('data-nav-current') || '';
    var loginNext = mount.getAttribute('data-login-next') || pageFile();
    var exportHtml = buildExportHtml(mount);

    mount.innerHTML =
      '<header class="topbar">' +
      '<div class="topbar-inner">' +
      '<div class="topbar-left">' +
      '<a class="topbar-logo" href="index.html">' +
      '<span class="topbar-logo-mark" aria-hidden="true">八</span>팔자연구소</a>' +
      '<div class="topbar-sep"></div>' +
      '<span class="topbar-title">' + esc(title) + '</span>' +
      '</div>' +
      '<div class="topbar-right" data-topbar-auth aria-label="계정">' +
      '<span class="plan-badge free" id="plan-badge">Free</span>' +
      '<span class="topbar-auth-row" data-topbar-auth-guest>' +
      '<a class="topbar-auth-link" href="login.html?next=' + encodeURIComponent(loginNext) + '">로그인</a>' +
      '<span class="topbar-auth-dot" aria-hidden="true">·</span>' +
      '<a class="topbar-auth-link" href="signup.html?next=' + encodeURIComponent(loginNext) + '">회원가입</a>' +
      '</span>' +
      exportHtml +
      '<span class="topbar-auth-row" data-topbar-auth-user hidden>' +
      '<a class="back-btn" href="dashboard.html">마이페이지</a>' +
      '<span class="topbar-auth-dot" aria-hidden="true">·</span>' +
      '<button type="button" class="topbar-auth-link topbar-auth-btn" data-topbar-auth-signout>로그아웃</button>' +
      '</span>' +
      '</div>' +
      '</div>' +
      '</header>' +
      '<nav class="program-nav" aria-label="팔자연구소 프로그램 이동">' +
      '<div class="program-nav-inner">' +
      buildNavHtml(current) +
      '</div>' +
      '</nav>';

    mount.setAttribute('data-topbar-rendered', '1');
  }

  function init() {
    document
      .querySelectorAll(
        '.site-top[data-nav-current], .site-top[data-topbar-title], .site-top[data-topbar-variant="auth"]'
      )
      .forEach(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
