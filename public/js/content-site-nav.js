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

  ensureLink(
    'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css',
    { crossorigin: 'anonymous' }
  );
  ensureLink('/css/site-topbar.css?v=11');
  ensureLink('/css/site-footer.css?v=1');
  ensureLink('/css/site-header.css?v=7');

  function isGuide() {
    return path.indexOf('/guide') === 0 || /\/guide(\/|\.html|$)/.test(path);
  }
  function isStudy() {
    return (
      path.indexOf('/nakshatra') === 0 ||
      /\/nakshatra(\/|\.html|$)/.test(path) ||
      path.indexOf('/study') === 0 ||
      /\/study(\/|\.html|$)/.test(path)
    );
  }
  function pageMeta() {
    if (isStudy()) return { title: '학습자료실', current: 'study' };
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
    mount.setAttribute('data-nav-extra', 'guide,study,faq');
    if (oldNav && oldNav.parentNode) {
      oldNav.parentNode.replaceChild(mount, oldNav);
    } else if (document.body) {
      document.body.insertBefore(mount, document.body.firstChild);
    }
  } else {
    if (!mount.getAttribute('data-topbar-title')) mount.setAttribute('data-topbar-title', meta.title);
    if (!mount.getAttribute('data-nav-current')) mount.setAttribute('data-nav-current', meta.current);
    if (!mount.getAttribute('data-login-next')) mount.setAttribute('data-login-next', loginNext);
    if (!mount.getAttribute('data-nav-extra')) mount.setAttribute('data-nav-extra', 'guide,study,faq');
  }

  ensureScript('/js/plan-access.js?v=13');
  ensureScript('/js/site-footer.js?v=1');
  ensureScript('/js/site-topbar.js?v=19', function () {
    ensureScript('/js/topbar-session.js?v=9');
  });
})();
