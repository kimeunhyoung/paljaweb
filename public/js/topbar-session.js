/**
 * [data-topbar-auth] 영역: 로그인 시 게스트 블록 숨김, 로그아웃만 표시.
 * 하위: [data-topbar-auth-guest], [data-topbar-auth-user] (초기 hidden)
 */
(function () {
  var SUPABASE_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1';

  function getClient() {
    var g = typeof window !== 'undefined' && (window.supabase || globalThis.supabase);
    if (!g || typeof g.createClient !== 'function') return null;
    return g.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function syncSlots(sb) {
    sb.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      document.querySelectorAll('[data-topbar-auth]').forEach(function (slot) {
        var guest = slot.querySelector('[data-topbar-auth-guest]');
        var user = slot.querySelector('[data-topbar-auth-user]');
        if (!guest || !user) return;
        if (session) {
          guest.setAttribute('hidden', '');
          user.removeAttribute('hidden');
        } else {
          guest.removeAttribute('hidden');
          user.setAttribute('hidden', '');
        }
      });
    });
  }

  function init() {
    var sb = getClient();
    if (!sb) return;
    syncSlots(sb);
    sb.auth.onAuthStateChange(function () {
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
