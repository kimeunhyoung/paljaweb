/**
 * /study/class/* — Private 회원만 열람
 * 비로그인 → 로그인, Private 아님 → 잠금 안내
 * ※ 화면 표시용 확인이에요. 실제 수업자료 본문은 공개 폴더에 두지 말고
 *   서버(Private 확인 후 전달)로 내려줘야 소스 보기로 노출되지 않아요.
 */
(function () {
  var SB_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co';
  var SB_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1';
  var LABEL = { free: 'Free', basic: 'Basic', plus: 'Plus', professional: 'Professional', private: 'Private' };

  function nextPath() { return location.pathname + location.search + location.hash; }

  function effectivePlan(profile) {
    var p = String((profile && profile.plan) || 'free').toLowerCase();
    if (p === 'pro') p = 'plus';
    if (p === 'free') return 'free';
    if (profile && profile.plan_active_until && new Date(profile.plan_active_until) <= new Date()) return 'free';
    return p;
  }

  function show(state, plan) {
    var nodes = document.querySelectorAll('[data-class-state]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].style.display = nodes[i].getAttribute('data-class-state') === state ? 'block' : 'none';
    }
    var el = document.getElementById('classPlan');
    if (el && plan) el.textContent = LABEL[plan] || plan;
    document.documentElement.setAttribute('data-class-access', state);
  }

  async function run() {
    try {
      var g = window.supabase || globalThis.supabase;
      if (!g || typeof g.createClient !== 'function') { show('error'); return; }
      var sb = g.createClient(SB_URL, SB_KEY);
      var res = await sb.auth.getSession();
      var session = res.data && res.data.session;
      if (!session) {
        location.replace('/login.html?next=' + encodeURIComponent(nextPath()));
        return;
      }
      var pres = await sb.from('profiles').select('plan, plan_active_until').eq('id', session.user.id).maybeSingle();
      var plan = effectivePlan(pres.data);
      show(plan === 'private' ? 'open' : 'locked', plan);
    } catch (e) {
      show('error');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
