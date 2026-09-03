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
    // 같은 페이지의 다른 스크립트(ai-quota-client.js 등)와 Supabase 클라이언트를 공유.
    // 각자 createClient()를 새로 만들면 GoTrueClient 인스턴스가 늘어나며 인증 상태가
    // 꼬이고, 인증이 걸린 요청(AI 리딩 스트리밍 등)이 멈추는 원인이 됨.
    if (window.__paljaSupabaseClient) return window.__paljaSupabaseClient;
    var g = typeof window !== 'undefined' && (window.supabase || globalThis.supabase);
    if (!g || typeof g.createClient !== 'function') return null;
    window.__paljaSupabaseClient = g.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window.__paljaSupabaseClient;
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
    if (plan === 'pro') plan = 'plus';
    badge.textContent =
      window.PaljaPlan && PaljaPlan.planKoLabel
        ? PaljaPlan.planKoLabel(plan)
        : plan.charAt(0).toUpperCase() + plan.slice(1);
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
        if (window.PaljaDevice && window.PaljaDevice.ensurePaidAccess) {
          window.PaljaDevice.ensurePaidAccess(null, null);
        }
        return Promise.resolve(null);
      }
      return sb
        .from('profiles')
        .select('plan, plan_active_until, calendar_pass_until')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(function (pres) {
          return { session: session, pres: pres };
        });
    }).then(function (pack) {
      if (!badge) return;
      if (!pack || !pack.pres || pack.pres.error || !pack.pres.data) {
        if (pack && pack.session) {
          /* keep going */
        } else {
          badge.textContent = 'Free';
          badge.className = 'plan-badge free';
          return;
        }
      }
      var profile = pack && pack.pres && pack.pres.data ? pack.pres.data : null;
      if (profile) applyPlanToBadge(badge, profile);
      else {
        badge.textContent = 'Free';
        badge.className = 'plan-badge free';
      }
      if (window.PaljaDevice && pack && pack.session) {
        return window.PaljaDevice.ensurePaidAccess(pack.session.access_token, profile || { plan: 'free' });
      }
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

  function ensureDeviceScript() {
    if (window.PaljaDevice) return;
    if (document.querySelector('script[data-palja-device]')) return;
    var s = document.createElement('script');
    s.src = 'js/account-device-client.js?v=1';
    s.setAttribute('data-palja-device', '1');
    document.head.appendChild(s);
  }

  function withPaljaDevice(cb) {
    if (window.PaljaDevice) {
      cb();
      return;
    }
    ensureDeviceScript();
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      if (window.PaljaDevice || n > 40) {
        clearInterval(t);
        cb();
      }
    }, 50);
  }

  function init() {
    if (document.documentElement && document.documentElement.classList.contains('tarot-standalone')) {
      return;
    }
    injectCss();
    ensureDeviceScript();
    var sb = getClient();
    if (!sb) return;
    withPaljaDevice(function () {
      syncPlanBadge(sb);
      syncSlots(sb);
    });
    requestAnimationFrame(function () {
      withPaljaDevice(function () {
        syncPlanBadge(sb);
        syncSlots(sb);
      });
    });
    sb.auth.onAuthStateChange(function (event, session) {
      if (session?.access_token && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        if (window.PaljaAttribution?.syncWithToken) {
          window.PaljaAttribution.syncWithToken(session.access_token);
        }
      }
      withPaljaDevice(function () {
        syncPlanBadge(sb);
        syncSlots(sb);
      });
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
