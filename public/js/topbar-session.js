/**
 * [data-topbar-auth]: 로그인 시 게스트(로그인·가입) 숨김, 유저(로그아웃 등)만 표시.
 * 인라인 display와 [hidden] 충돌 방지용 CSS를 주입합니다.
 */
(function () {
  var SUPABASE_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1';

  function injectCss() {
    if (document.getElementById('topbar-session-css')) return;
    var s = document.createElement('style');
    s.id = 'topbar-session-css';
    s.textContent =
      '[data-topbar-auth-user][hidden],[data-topbar-auth-guest][hidden]{display:none!important}' +
      '[data-topbar-auth-guest]:not([hidden]),[data-topbar-auth-user]:not([hidden]){display:inline-flex;align-items:center;flex-wrap:wrap;gap:6px}';
    document.head.appendChild(s);
  }

  function getClient() {
    var g = typeof window !== 'undefined' && (window.supabase || globalThis.supabase);
    if (!g || typeof g.createClient !== 'function') return null;
    return g.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function setRow(el, visible) {
    if (!el) return;
    if (visible) {
      el.removeAttribute('hidden');
      el.setAttribute('aria-hidden', 'false');
    } else {
      el.setAttribute('hidden', '');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function applyPlanToBadge(badge, profile) {
    var plan = window.PaljaPlan
      ? PaljaPlan.effectivePlan(profile)
      : ((profile && profile.plan) || 'free');
    badge.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
    badge.className = 'plan-badge ' + plan;
  }

  function syncPlanBadge(sb) {
    var badge = document.getElementById('plan-badge');
    if (!badge) return;
    sb.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) {
        badge.textContent = 'Free';
        badge.className = 'plan-badge free';
        return Promise.resolve(null);
      }
      return sb.from('profiles').select('plan, plan_active_until').eq('id', session.user.id).maybeSingle();
    }).then(function (pres) {
      if (!badge) return;
      if (!pres || pres.error || !pres.data) {
        badge.textContent = 'Free';
        badge.className = 'plan-badge free';
        return;
      }
      applyPlanToBadge(badge, pres.data);
    });
  }

  function syncSlots(sb) {
    sb.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      document.querySelectorAll('[data-topbar-auth]').forEach(function (slot) {
        var guest = slot.querySelector('[data-topbar-auth-guest]');
        var user = slot.querySelector('[data-topbar-auth-user]');
        if (!guest || !user) return;
        if (session) {
          setRow(guest, false);
          setRow(user, true);
        } else {
          setRow(guest, true);
          setRow(user, false);
        }
      });
    });
  }

  function init() {
    if (document.documentElement && document.documentElement.classList.contains('tarot-standalone')) {
      return;
    }
    injectCss();
    var sb = getClient();
    if (!sb) return;
    syncPlanBadge(sb);
    syncSlots(sb);
    requestAnimationFrame(function () {
      syncPlanBadge(sb);
      syncSlots(sb);
    });
    sb.auth.onAuthStateChange(function (event, session) {
      if (session?.access_token && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        if (window.PaljaAttribution?.syncWithToken) {
          window.PaljaAttribution.syncWithToken(session.access_token);
        }
      }
      syncPlanBadge(sb);
      syncSlots(sb);
    });
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-topbar-auth-signout]');
      if (!t) return;
      e.preventDefault();
      sb.auth.signOut().then(function () {
        window.location.reload();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
