/**
 * 팔자연구소 — 공통 하단 푸터
 * site-topbar / content-site-nav 에서 로드합니다.
 */
(function (global) {
  var FOOTER_ATTR = 'data-site-footer';
  var CSS_HREF = '/css/site-footer.css?v=5';
  var cssReady = null;

  function ensureCss(done) {
    done = typeof done === 'function' ? done : function () {};
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      var h = links[i].getAttribute('href') || '';
      if (h.indexOf('/css/site-footer.css') === -1) continue;
      // 이미 로드됐거나 시트에 반영된 경우
      try {
        if (links[i].sheet) {
          done();
          return;
        }
      } catch (e) {}
      if (cssReady) {
        cssReady.then(done);
        return;
      }
      links[i].addEventListener('load', done);
      links[i].addEventListener('error', done);
      return;
    }

    if (cssReady) {
      cssReady.then(done);
      return;
    }

    cssReady = new Promise(function (resolve) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = CSS_HREF;
      l.onload = function () {
        resolve();
      };
      l.onerror = function () {
        resolve();
      };
      (document.head || document.documentElement).appendChild(l);
    });
    cssReady.then(done);
  }

  function footerHtml() {
    return (
      '<footer class="site-footer" ' +
      FOOTER_ATTR +
      '="1" style="visibility:hidden">' +
      '<div class="site-footer-inner">' +
      '<div class="site-footer-brand">' +
      '<a class="site-footer-logo" href="/index.html">' +
      '<span class="site-footer-mark" aria-hidden="true">八</span>' +
      '<span>팔자연구소</span>' +
      '</a>' +
      '<p class="site-footer-desc">수비학 · 점성학 · 타로로 읽는 인생 코드</p>' +
      '</div>' +
      '<nav class="site-footer-nav" aria-label="사이트 정보">' +
      '<a href="/pricing.html">요금제</a>' +
      '<a href="/guide/index.html">가이드</a>' +
      '<a href="/study/index.html">학습자료실</a>' +
      '<a href="/faq.html">FAQ</a>' +
      '<a href="/contact.html">문의</a>' +
      '<a href="/about.html">소개</a>' +
      '<a href="/terms.html">이용약관</a>' +
      '<a href="/privacy.html">개인정보처리방침</a>' +
      '</nav>' +
      '<div class="site-footer-legal">' +
      '<p>상호 8코드(8CODE) · 대표 김태훈 · 사업자등록번호 624-55-00806</p>' +
      '<p>통신판매업 신고번호 제 2026-부산수영-0361 호 · 부산광역시 수영구 수영로 632-1</p>' +
      '<p>휴대폰 <a href="tel:01086748481">010-8674-8481</a> · 이메일 <a href="mailto:ohayou989@gmail.com">ohayou989@gmail.com</a> · ' +
      '<a href="https://pf.kakao.com/_HXxmwX/chat" target="_blank" rel="noopener noreferrer">카카오톡 문의</a></p>' +
      '<p class="site-footer-copy">© 2026 8CODE (팔자연구소). All rights reserved.</p>' +
      '</div>' +
      '</div>' +
      '</footer>'
    );
  }

  /** 페이지에 있던 짧은 레거시 푸터(©만 있는 것 등) 제거 — 메인 풀 푸터는 유지 */
  function removeLegacyFooters() {
    var nodes = document.querySelectorAll('footer');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute(FOOTER_ATTR) === '1') continue;
      if (el.querySelector('#site-business-footer') || el.querySelector('.footer-links')) continue;
      if (el.classList.contains('footer') || el.parentElement === document.body) {
        el.parentNode && el.parentNode.removeChild(el);
      }
    }
  }

  function revealFooter(footer) {
    if (!footer) return;
    footer.style.visibility = '';
  }

  function mountSiteFooter(options) {
    options = options || {};
    if (document.body && document.body.getAttribute('data-no-site-footer') === '1') return null;
    var existingMarked = document.querySelector('[' + FOOTER_ATTR + ']');
    if (existingMarked) {
      var root = document.body || document.documentElement;
      if (root) root.appendChild(existingMarked);
      return existingMarked;
    }

    // 이미 풀 푸터(메인·소개 등)가 있으면 그걸 쓰고 중복 삽입 안 함
    var rich =
      document.querySelector('#site-business-footer') ||
      document.querySelector('footer.footer .footer-links') ||
      document.querySelector('footer.footer .footer-inner');
    if (rich) {
      var richFooter = rich.closest('footer') || rich;
      if (richFooter && richFooter.tagName === 'FOOTER') {
        richFooter.setAttribute(FOOTER_ATTR, '1');
        return richFooter;
      }
    }

    // CSS가 오기 전에 깨진 HTML이 보이지 않도록: 숨긴 채 삽입 → CSS 로드 후 표시
    ensureCss();
    if (!options.keepLegacy) removeLegacyFooters();

    var wrap = document.createElement('div');
    wrap.innerHTML = footerHtml();
    var footer = wrap.firstChild;

    function placeAtBodyEnd() {
      var root = document.body || document.documentElement;
      if (!root) return;
      root.appendChild(footer);
    }

    /* content-site-nav가 <main>보다 먼저 실행되면 푸터가 본문 위에 끼는 FOUC 방지 */
    if (document.readyState === 'loading') {
      document.addEventListener(
        'DOMContentLoaded',
        function () {
          placeAtBodyEnd();
          ensureCss(function () {
            requestAnimationFrame(function () {
              revealFooter(footer);
            });
          });
        },
        { once: true }
      );
    } else {
      placeAtBodyEnd();
      ensureCss(function () {
        requestAnimationFrame(function () {
          revealFooter(footer);
        });
      });
    }
    return footer;
  }

  global.PaljaSiteFooter = {
    mount: mountSiteFooter,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // site-topbar에서도 호출하므로 중복은 mount 내부에서 막음
      setTimeout(function () {
        mountSiteFooter();
      }, 0);
    });
  } else {
    setTimeout(function () {
      mountSiteFooter();
    }, 0);
  }
})(typeof window !== 'undefined' ? window : this);
