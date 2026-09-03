/**
 * 프로그램 페이지: 로그인 확인 + PALJA_USER_PLAN 설정
 * plan-access.js를 먼저 로드하세요.
 *
 * 레이스 방지: bootstrap() 동안 PALJA_PLAN_READY === false.
 * 게이트는 PaljaPlan.ensureBasicProductAccess / whenReady 를 사용하세요.
 */
(function (global) {
  var SB_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co';
  var SB_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1';

  var readyResolve = null;
  var readyPromise = null;

  function getClient() {
    if (global.__paljaSupabaseClient) return global.__paljaSupabaseClient;
    var g = global.supabase || globalThis.supabase;
    if (!g || typeof g.createClient !== 'function') return null;
    global.__paljaSupabaseClient = g.createClient(SB_URL, SB_KEY);
    return global.__paljaSupabaseClient;
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

  function markReady() {
    global.PALJA_PLAN_READY = true;
    if (readyResolve) {
      readyResolve(global.PALJA_USER_PLAN || 'free');
      readyResolve = null;
    }
  }

  /** bootstrap 완료까지 대기. bootstrap이 없으면 즉시 resolve */
  function whenReady() {
    if (global.PALJA_PLAN_READY !== false) {
      return Promise.resolve(global.PALJA_USER_PLAN || 'free');
    }
    return readyPromise || Promise.resolve(global.PALJA_USER_PLAN || 'free');
  }

  async function bootstrap(options) {
    options = options || {};
    var product = options.product || 'harmony';
    var requireLogin = options.requireLogin !== false;
    global.PALJA_PRODUCT = product;
    global.PALJA_USER_PLAN = 'free';
    global.PALJA_LOGGED_IN = false;
    global.PALJA_PLAN_READY = false;
    readyPromise = new Promise(function (resolve) {
      readyResolve = resolve;
    });

    try {
      var sb = getClient();
      if (!sb) return global.PALJA_USER_PLAN;

      var res = await sb.auth.getSession();
      var session = res.data && res.data.session;
      if (!session) {
        if (requireLogin) {
          var next = loginNext();
          var url = global.PaljaPlan && global.PaljaPlan.loginUrl
            ? global.PaljaPlan.loginUrl(next)
            : 'login.html?next=' + encodeURIComponent(next);
          global.location.replace(url);
        }
        return global.PALJA_USER_PLAN;
      }

      global.PALJA_LOGGED_IN = true;

      var pres = await sb
        .from('profiles')
        .select('plan, plan_active_until')
        .eq('id', session.user.id)
        .maybeSingle();
      if (pres.data) {
        global.PALJA_USER_PLAN = effectivePlan(pres.data);
      }
      return global.PALJA_USER_PLAN;
    } finally {
      markReady();
    }
  }

  global.PaljaProductBootstrap = {
    bootstrap: bootstrap,
    whenReady: whenReady,
  };
})(typeof window !== 'undefined' ? window : globalThis);
