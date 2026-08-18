/**
 * 가이드·소개·FAQ 등 콘텐츠 페이지 공통 상단 메뉴.
 * /guide/ 하위에서도 깨지지 않도록 루트 절대 경로를 씁니다.
 * <nav class="navbar"> 바로 다음에 로드하세요 (defer 없이).
 */
(function () {
  var nav = document.querySelector('.navbar');
  if (!nav) return;
  if (nav.getAttribute('data-content-nav') === '1') {
    bind();
    return;
  }

  var path = location.pathname || '';
  var next = encodeURIComponent(path + (location.search || ''));
  var loginHref = '/login.html?next=' + next;

  function isGuide() {
    return path.indexOf('/guide') === 0 || /\/guide(\/|\.html|$)/.test(path);
  }
  function currentKey() {
    if (isGuide()) return 'guide';
    if (/about\.html$/.test(path)) return 'about';
    if (/faq\.html$/.test(path)) return 'faq';
    if (/pricing\.html$/.test(path)) return 'pricing';
    if (/services\.html$/.test(path)) return 'services';
    if (/contact\.html$/.test(path)) return 'contact';
    return '';
  }
  function mark(href, key) {
    return currentKey() === key ? ' aria-current="page"' : '';
  }

  nav.outerHTML =
    '<nav class="navbar" id="navbar" data-content-nav="1">' +
    '<div class="nav-inner">' +
    '<a href="/index.html" class="nav-logo"><div class="logo-mark">八</div><span class="logo-text">팔자연구소</span></a>' +
    '<ul class="nav-links">' +
    '<li><a href="/services.html"' + mark('/services.html', 'services') + '>프로그램</a></li>' +
    '<li><a href="/guide/index.html"' + mark('/guide/', 'guide') + '>가이드</a></li>' +
    '<li><a href="/pricing.html"' + mark('/pricing.html', 'pricing') + '>요금제</a></li>' +
    '<li><a href="/faq.html"' + mark('/faq.html', 'faq') + '>FAQ</a></li>' +
    '</ul>' +
    '<div class="nav-actions">' +
    '<a href="' + loginHref + '" class="btn-nav-ghost">로그인</a>' +
    '<a href="/analysis.html" class="btn-nav-fill">무료 분석</a>' +
    '</div>' +
    '<button class="nav-menu-btn" id="navMenuBtn" type="button" aria-expanded="false" aria-controls="mobileNavPanel" aria-label="메뉴 열기">' +
    '<span></span><span></span><span></span>' +
    '</button>' +
    '</div>' +
    '<div class="mobile-nav-panel" id="mobileNavPanel" hidden>' +
    '<ul class="mobile-nav-links">' +
    '<li class="mobile-nav-group">수비학</li>' +
    '<li><a href="/analysis.html">라이프코드</a></li>' +
    '<li><a href="/numerology-calendar.html">수비학달력</a></li>' +
    '<li class="mobile-nav-group">점성학</li>' +
    '<li><a href="/astrology.html">점성학 차트</a></li>' +
    '<li class="mobile-nav-group">타로 AI</li>' +
    '<li><a href="/Tarot.html">타로코드</a></li>' +
    '<li><a href="/counselor-reading.html">타로 AI</a></li>' +
    '<li><a href="/counselor-lenormand.html">레노먼드 AI</a></li>' +
    '<li><a href="/counselor-iching.html">주역 AI</a></li>' +
    '<li class="mobile-nav-group">관계</li>' +
    '<li><a href="/compatibility.html">소울하모니</a></li>' +
    '<li><a href="/period48-compat.html">48궁합</a></li>' +
    '<li class="mobile-nav-group">생활 수비학</li>' +
    '<li><a href="/address-numerology.html">주소·전화</a></li>' +
    '<li><a href="/business-numerology.html">상호·브랜드</a></li>' +
    '<li><a href="/name.html">네임코드</a></li>' +
    '<li><a href="/numerology-wallpaper.html">에너지배경</a></li>' +
    '<li class="mobile-nav-group">상담사</li>' +
    '<li><a href="/counselor.html">상담사 허브</a></li>' +
    '<li class="mobile-nav-group">안내</li>' +
    '<li><a href="/guide/index.html">가이드</a></li>' +
    '<li><a href="/pricing.html">요금제</a></li>' +
    '<li><a href="/about.html">소개</a></li>' +
    '<li><a href="/faq.html">FAQ</a></li>' +
    '<li><a href="/contact.html">문의</a></li>' +
    '</ul>' +
    '<div class="mobile-nav-actions">' +
    '<a href="' + loginHref + '" class="btn-nav-ghost">로그인</a>' +
    '<a href="/analysis.html" class="btn-nav-fill">무료 분석</a>' +
    '</div>' +
    '</div>' +
    '</nav>';

  bind();

  function bind() {
    var btn = document.getElementById('navMenuBtn');
    var panel = document.getElementById('mobileNavPanel');
    if (!btn || !panel || btn.getAttribute('data-bound') === '1') return;
    btn.setAttribute('data-bound', '1');

    var closePanel = function () {
      panel.classList.remove('open');
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    };
    var openPanel = function () {
      panel.hidden = false;
      panel.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    };
    btn.addEventListener('click', function () {
      if (panel.classList.contains('open')) closePanel();
      else openPanel();
    });
    panel.addEventListener('click', function (e) {
      if (e.target && e.target.tagName === 'A') closePanel();
    });
  }
})();
