/**
 * 출시 할인 + 상담사 안내 통합 팝업 (한 번에 닫기)
 * site-topbar 페이지 + index
 */
(function () {
  var DISMISS_KEY = 'palja_launch_promo_dismiss_v1';
  var SESSION_KEY = 'palja_launch_promo_session_v1';
  /** 상담사 단독 팝업과 동기화 — 통합 팝업을 닫으면 둘 다 안 뜨게 */
  var COUNSELOR_DISMISS_KEY = 'palja_counselor_promo_dismiss_v1';
  var COUNSELOR_SESSION_KEY = 'palja_counselor_promo_session_v1';
  /** 할인 종료일 — 이후 팝업 자동 비표시 (YYYY-MM-DD, KST 기준) */
  var PROMO_END = '2026-12-31';

  /** main.js 상담사 단독 팝업이 이 값을 보고 생략 */
  window.PaljaCombinedPromoActive = false;

  function ensureStyles() {
    if (document.querySelector('link[data-palja-launch-promo-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/launch-promo.css?v=5';
    link.setAttribute('data-palja-launch-promo-css', '1');
    document.head.appendChild(link);
  }

  function pageFile() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function isPromoActive() {
    try {
      var end = new Date(PROMO_END + 'T23:59:59+09:00');
      return Date.now() <= end.getTime();
    } catch (_) {
      return true;
    }
  }

  function shouldSkipPage() {
    var file = pageFile();
    if (file === 'pricing.html') return true;
    try {
      if (new URLSearchParams(location.search).get('embedded') === '1') return true;
    } catch (_) { /* ignore */ }
    return false;
  }

  function injectMarkup() {
    if (document.getElementById('launchPromo')) return;

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="counselor-promo-overlay" id="launchPromo" hidden>' +
      '  <div class="counselor-promo launch-promo" role="dialog" aria-modal="true" aria-labelledby="launchPromoTitle">' +
      '    <button type="button" class="counselor-promo-close" id="launchPromoClose" aria-label="닫기">×</button>' +
      '    <p class="counselor-promo-kicker">Launch offer</p>' +
      '    <h2 class="counselor-promo-title" id="launchPromoTitle">출시 기간 한정 · 구독료 할인 중</h2>' +
      '    <p class="counselor-promo-lead">팔자연구소의 첫 시작을 함께하시는 분들께 드리는 특별 혜택입니다. Plus·Professional을 부담 없이 먼저 경험해 보세요.<br>새로운 기능과 추가 업데이트도 함께 진행 중입니다. 불편한 점이나 요청 사항이 있으시면 <a href="https://pf.kakao.com/_HXxmwX/chat" target="_blank" rel="noopener noreferrer">카카오톡</a>으로 남겨 주세요.</p>' +
      '    <div class="launch-promo-prices">' +
      '      <div class="launch-promo-price-card">' +
      '        <span class="launch-promo-plan">Plus</span>' +
      '        <span class="launch-promo-was">29,900원/월</span>' +
      '        <span class="launch-promo-now">19,900<span>원/월</span></span>' +
      '      </div>' +
      '      <div class="launch-promo-price-card launch-promo-price-card-accent">' +
      '        <span class="launch-promo-plan">Professional</span>' +
      '        <span class="launch-promo-was">49,900원/월</span>' +
      '        <span class="launch-promo-now">29,900<span>원/월</span></span>' +
      '      </div>' +
      '    </div>' +
      '    <div class="launch-promo-counselor">' +
      '      <h3 class="launch-promo-counselor-title">상담사이신가요?</h3>' +
      '      <p class="launch-promo-counselor-lead">Professional로 고객 CRM·일정·<strong>AI 타로 리딩</strong>까지 한곳에서. 출시 기념가 <strong>29,900원/월</strong>입니다.</p>' +
      '      <ul class="launch-promo-counselor-points">' +
      '        <li>고객 CRM · 일정 캘린더 · 상담 기록</li>' +
      '        <li>AI 타로 리딩 · 레노먼드 · 주역 해석 초안</li>' +
      '        <li>브랜디드 PDF · 재방문 관리</li>' +
      '      </ul>' +
      '      <a href="/for-counselors.html" class="launch-promo-counselor-cta">상담사 전용 안내 보기 →</a>' +
      '    </div>' +
      '    <div class="counselor-promo-actions">' +
      '      <a href="/pricing.html" class="counselor-promo-btn counselor-promo-btn-accent">요금제 · 할인가 보기</a>' +
      '      <a href="/signup.html" class="counselor-promo-btn counselor-promo-btn-ghost">회원가입</a>' +
      '    </div>' +
      '    <button type="button" class="counselor-promo-dismiss" id="launchPromoDismiss">다시 보지 않기</button>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(wrap.firstElementChild);
  }

  function syncCounselorDismiss(permanent) {
    try {
      if (permanent) {
        localStorage.setItem(COUNSELOR_DISMISS_KEY, '1');
      } else {
        sessionStorage.setItem(COUNSELOR_SESSION_KEY, '1');
      }
    } catch (_) { /* ignore */ }
  }

  function initLaunchPromo() {
    if (!isPromoActive() || shouldSkipPage()) return;

    ensureStyles();

    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch (_) { /* ignore */ }

    window.PaljaCombinedPromoActive = true;
    injectMarkup();

    var overlay = document.getElementById('launchPromo');
    if (!overlay) return;

    var closeBtn = document.getElementById('launchPromoClose');
    var dismissBtn = document.getElementById('launchPromoDismiss');

    function close(permanent) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('hidden', '');
      document.body.style.overflow = '';
      try {
        if (permanent) localStorage.setItem(DISMISS_KEY, '1');
        else sessionStorage.setItem(SESSION_KEY, '1');
      } catch (_) { /* ignore */ }
      syncCounselorDismiss(permanent);
    }

    function open() {
      overlay.removeAttribute('hidden');
      requestAnimationFrame(function () {
        overlay.classList.add('is-open');
      });
      document.body.style.overflow = 'hidden';
    }

    closeBtn?.addEventListener('click', function () { close(false); });
    dismissBtn?.addEventListener('click', function () { close(true); });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) close(false);
    });

    function hasPaidPlan(profile) {
      if (window.PaljaPlanAccess && typeof window.PaljaPlanAccess.isPlanAtLeast === 'function') {
        return window.PaljaPlanAccess.isPlanAtLeast(profile, 'plus');
      }
      var plan = String((profile && profile.plan) || 'free').toLowerCase();
      if (plan === 'plus' || plan === 'professional' || plan === 'private') {
        if (profile && profile.plan_active_until && new Date(profile.plan_active_until) <= new Date()) {
          return false;
        }
        return true;
      }
      return false;
    }

    (async function () {
      try {
        var sb = window.supabase;
        if (sb && sb.auth) {
          var res = await sb.auth.getSession();
          var session = res && res.data && res.data.session;
          if (session && session.user) {
            var profRes = await sb
              .from('profiles')
              .select('plan, plan_active_until')
              .eq('id', session.user.id)
              .maybeSingle();
            if (hasPaidPlan(profRes && profRes.data)) {
              window.PaljaCombinedPromoActive = false;
              return;
            }
          }
        }
      } catch (_) { /* ignore */ }

      setTimeout(open, 1600);
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLaunchPromo);
  } else {
    initLaunchPromo();
  }
})();
