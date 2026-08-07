/**
 * 출시 기간 구독 할인 안내 팝업 (site-topbar 페이지 + index)
 */
(function () {
  var DISMISS_KEY = 'palja_launch_promo_dismiss_v1';
  var SESSION_KEY = 'palja_launch_promo_session_v1';
  /** 할인 종료일 — 이후 팝업 자동 비표시 (YYYY-MM-DD, KST 기준) */
  var PROMO_END = '2026-12-31';

  function ensureStyles() {
    if (document.querySelector('link[data-palja-launch-promo-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/launch-promo.css?v=1';
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
      '    <p class="counselor-promo-lead">지금 가입하시면 출시 기념 할인가가 적용됩니다. 수요에 따라 <strong>정식가로 조정</strong>될 수 있으니, 이용을 검토 중이시라면 이 기간이 가장 유리합니다.</p>' +
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
      '    <div class="counselor-promo-actions">' +
      '      <a href="pricing.html" class="counselor-promo-btn counselor-promo-btn-accent">요금제 · 할인가 보기</a>' +
      '      <a href="signup.html" class="counselor-promo-btn counselor-promo-btn-ghost">회원가입</a>' +
      '    </div>' +
      '    <button type="button" class="counselor-promo-dismiss" id="launchPromoDismiss">다시 보지 않기</button>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(wrap.firstElementChild);
  }

  function initLaunchPromo() {
    if (!isPromoActive() || shouldSkipPage()) return;

    ensureStyles();

    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch (_) { /* ignore */ }

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
    }

    function open() {
      if (document.querySelector('.counselor-promo-overlay.is-open')) {
        setTimeout(open, 400);
        return;
      }
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

    function scheduleOpen() {
      setTimeout(open, 2200);
    }

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
            if (hasPaidPlan(profRes && profRes.data)) return;
          }
        }
      } catch (_) { /* ignore */ }

      scheduleOpen();
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLaunchPromo);
  } else {
    initLaunchPromo();
  }
})();
