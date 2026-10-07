/**
 * 가이드·소개·FAQ·학습자료실 등 콘텐츠 페이지 → 메인과 같은 site-top 프로그램 내비.
 * 기존 <nav class="navbar"> 를 교체하고 site-topbar + 세션을 붙입니다.
 * /guide/ · /nakshatra/ 하위에서도 절대 경로로 동작합니다.
 */
(function () {
  var path = location.pathname || '';
  var loginNext = (path.replace(/^\//, '') || 'index.html') + (location.search || '');

  function ensureLink(href, attrs) {
    var head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return;
    var part = href.split('?')[0];
    var links = head.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      if ((links[i].getAttribute('href') || '').indexOf(part) !== -1) return;
      if ((links[i].href || '').indexOf(part) !== -1) return;
    }
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        l.setAttribute(k, attrs[k]);
      });
    }
    head.appendChild(l);
  }

  function ensureScript(src, onload) {
    var key = src.split('?')[0];
    var nodes = document.getElementsByTagName('script');
    for (var i = 0; i < nodes.length; i++) {
      var ssrc = nodes[i].getAttribute('src') || '';
      if (ssrc.indexOf(key) !== -1) {
        if (onload) {
          if (nodes[i].getAttribute('data-loaded') === '1') onload();
          else nodes[i].addEventListener('load', onload);
        }
        return;
      }
    }
    var s = document.createElement('script');
    s.src = src;
    s.addEventListener('load', function () {
      s.setAttribute('data-loaded', '1');
      if (onload) onload();
    });
    (document.head || document.body).appendChild(s);
  }

  /* CSS 파일보다 먼저 레이아웃을 잡아 FOUC(세로 나열·PrivatePrivate) 방지 */
  var CRITICAL_TOPBAR_CSS =
    '.site-top{min-height:92px;box-sizing:border-box;background:#f5f0e8!important;font-family:"Noto Sans KR",system-ui,sans-serif;-webkit-font-smoothing:antialiased}' +
    '.site-top .topbar{min-height:52px;padding:10px 32px;border-bottom:1px solid rgba(139,111,71,.15);box-sizing:border-box;background:#f5f0e8!important}' +
    '.site-top .topbar-inner{max-width:1140px;margin:0 auto;width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:nowrap;min-width:0}' +
    '.site-top .topbar-left{display:flex;align-items:center;gap:12px;min-width:0}' +
    '.site-top .topbar-logo{display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#4a3520;font-weight:700;white-space:nowrap}' +
    '.site-top .topbar-logo-mark{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#4a3520;color:#f5f0e8;font-size:14px}' +
    '.site-top .topbar-title{font-size:13px;color:#8a7a68;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.site-top .topbar-links{display:flex;align-items:center;gap:22px;margin-left:auto;margin-right:8px;flex-shrink:0}' +
    '.site-top .topbar-links a{font-size:14px;font-weight:500;color:#8a7a68;text-decoration:none;white-space:nowrap}' +
    '.site-top .topbar-right{display:flex;align-items:center;gap:10px;flex-shrink:0}' +
    '.site-top .topbar-auth-row{display:inline-flex;align-items:center;gap:6px}' +
    '.site-top .topbar-auth-link,.site-top .back-btn{font-size:12px;font-weight:600;color:#8a7a68;text-decoration:none;white-space:nowrap;background:none;border:0;padding:0;cursor:pointer;font-family:inherit}' +
    '.site-top .plan-badge-short{display:none!important}' +
    '.site-top .plan-badge{font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:5px 11px;border-radius:999px;color:#f5f0e8;background:#4a3520;white-space:nowrap}' +
    '.site-top .program-nav{background:#fff!important;border-bottom:1px solid rgba(139,111,71,.15);padding:0 32px}' +
    '.site-top .program-nav-inner{max-width:1140px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:0 14px;min-height:40px;font-size:12px;font-weight:600}' +
    '.site-top .program-nav-inner>a,.site-top .program-nav-inner>.program-nav-current,.site-top .program-nav-inner>.program-nav-dd{display:inline-flex;align-items:center;min-height:40px;color:#4a3520;text-decoration:none}' +
    '.site-top .program-nav-dd{position:relative}' +
    '.site-top .program-nav-dd-btn{border:0;background:transparent;font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:0;color:#4a3520;font-size:12px;font-weight:600}' +
    '.site-top .program-nav-dd-menu{display:none}' +
    '[data-topbar-auth]:not([data-auth-ready="1"]) [data-topbar-auth-guest]{visibility:hidden!important;pointer-events:none}' +
    '[data-topbar-auth-user][hidden],[data-topbar-auth-guest][hidden]{display:none!important}';
  function applyTopbarChrome() {
    var el = document.getElementById('palja-topbar-critical');
    if (!el) {
      el = document.createElement('style');
      el.id = 'palja-topbar-critical';
      (document.head || document.documentElement).insertBefore(
        el,
        (document.head || document.documentElement).firstChild
      );
    }
    el.textContent = CRITICAL_TOPBAR_CSS;
    ensureLink(
      'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css',
      { crossorigin: 'anonymous' }
    );
    ensureLink(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@400;500;600;700&display=swap'
    );
    ensureLink('/css/site-topbar.css?v=23');
    ensureLink('/css/site-footer.css?v=5');
    ensureLink('/css/site-header.css?v=9');
  }
  applyTopbarChrome();
  /* 뒤로가기(bfcache) 복원 시 동적 CSS가 빠지는 경우 다시 걸기 */
  window.addEventListener('pageshow', function (ev) {
    if (ev && ev.persisted) applyTopbarChrome();
  });

  function isGuide() {
    return path.indexOf('/guide') === 0 || /\/guide(\/|\.html|$)/.test(path);
  }
  function isStudyHub() {
    return path.indexOf('/study') === 0 || /\/study(\/|\.html|$)/.test(path);
  }
  function pageMeta() {
    if (isStudyHub()) return { title: '학습자료실', current: 'study' };
    if (isGuide()) return { title: '가이드', current: 'guide' };
    if (/about\.html$/.test(path)) return { title: '소개', current: 'about' };
    if (/faq\.html$/.test(path)) return { title: 'FAQ', current: 'faq' };
    if (/contact\.html$/.test(path)) return { title: '문의', current: 'contact' };
    if (/privacy\.html$/.test(path)) return { title: '개인정보', current: '' };
    if (/terms\.html$/.test(path)) return { title: '이용약관', current: '' };
    return { title: '', current: '' };
  }

  var meta = pageMeta();
  var mount = document.querySelector('.site-top[data-content-chrome]');
  if (!mount) {
    var oldNav = document.querySelector('nav.navbar');
    mount = document.createElement('div');
    mount.className = 'site-top';
    mount.setAttribute('data-content-chrome', '1');
    mount.setAttribute('data-topbar-title', meta.title);
    mount.setAttribute('data-nav-current', meta.current);
    mount.setAttribute('data-login-next', loginNext);
    /* 가이드·학습자료실·요금제·FAQ는 상단/푸터에 있으므로 프로그램 줄에는 넣지 않음 */
    if (oldNav && oldNav.parentNode) {
      oldNav.parentNode.replaceChild(mount, oldNav);
    } else if (document.body) {
      document.body.insertBefore(mount, document.body.firstChild);
    }
  } else {
    if (!mount.getAttribute('data-topbar-title')) mount.setAttribute('data-topbar-title', meta.title);
    if (!mount.getAttribute('data-nav-current')) mount.setAttribute('data-nav-current', meta.current);
    if (!mount.getAttribute('data-login-next')) mount.setAttribute('data-login-next', loginNext);
  }

  ensureScript('/js/plan-access.js?v=13');
  ensureScript('/js/site-footer.js?v=6');
  ensureScript('/js/site-topbar.js?v=40', function () {
    ensureScript('/js/topbar-session.js?v=14');
  });
})();
