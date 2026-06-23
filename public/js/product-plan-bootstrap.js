/**
 * 프로그램 페이지: 로그인 확인 + PALJA_USER_PLAN 설정
 * plan-access.js를 먼저 로드하세요.
 */
(function (global) {
  var SB_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co';
  var SB_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1';

  function getClient() {
    var g = global.supabase || globalThis.supabase;
    if (!g || typeof g.createClient !== 'function') return null;
    return g.createClient(SB_URL, SB_KEY);
  }

  function loginNext() {
    var p = global.location.pathname.split('/').pop() || 'index.html';
    return p + global.location.search + global.location.hash;
  }

  function effectivePlan(profile) {
    if (global.PaljaPlan && global.PaljaPlan.effectivePlan) {
      return global.PaljaPlan.effectivePlan(profile);
    }
    return (profile && profile.plan) || 'free';
  }

  async function bootstrap(options) {
    options = options || {};
    var product = options.product || 'harmony';
    var requireLogin = options.requireLogin !== false;
    global.PALJA_PRODUCT = product;
    global.PALJA_USER_PLAN = 'free';

    var sb = getClient();
    if (!sb) return global.PALJA_USER_PLAN;

    var res = await sb.auth.getSession();
    var session = res.data && res.data.session;
    if (!session) {
      if (requireLogin) {
        global.location.replace('login.html?next=' + encodeURIComponent(loginNext()));
      }
      return global.PALJA_USER_PLAN;
    }

    var pres = await sb
      .from('profiles')
      .select('plan, plan_active_until')
      .eq('id', session.user.id)
      .maybeSingle();
    if (pres.data) {
      global.PALJA_USER_PLAN = effectivePlan(pres.data);
    }
    return global.PALJA_USER_PLAN;
  }

  global.PaljaProductBootstrap = {
    bootstrap: bootstrap,
  };
})(typeof window !== 'undefined' ? window : globalThis);
