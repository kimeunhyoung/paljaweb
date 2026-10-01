/**
 * /nakshatra/members/* — 베이직 이상만 본문 열람
 * 비로그인 → 로그인, 무료 → 요금제
 */
(function () {
  var SB_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co';
  var SB_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1';

  function hideBody() {
    if (document.documentElement) {
      document.documentElement.style.visibility = 'hidden';
    }
  }
  function showBody() {
    if (document.documentElement) {
      document.documentElement.style.visibility = '';
    }
  }

  hideBody();

  function nextPath() {
    return location.pathname + location.search + location.hash;
  }

  function goLogin() {
    location.replace('/login.html?next=' + encodeURIComponent(nextPath()));
  }
  function goPricing() {
    location.replace('/pricing.html?from=nakshatra&next=' + encodeURIComponent(nextPath()));
  }

  function effectivePlan(profile) {
    var p = String((profile && profile.plan) || 'free').toLowerCase();
    if (p === 'pro') p = 'plus';
    if (p === 'free') return 'free';
    if (profile && profile.plan_active_until && new Date(profile.plan_active_until) <= new Date()) {
      return 'free';
    }
    return p;
  }

  function rank(plan) {
    var m = { free: 0, basic: 1, plus: 2, professional: 3, private: 4 };
    return m[plan] || 0;
  }

  function fail(msg) {
    showBody();
    document.body.innerHTML =
      '<main style="max-width:560px;margin:3rem auto;padding:1.5rem;font-family:sans-serif;line-height:1.6">' +
      '<h1 style="font-size:1.25rem">회원 전용 학습 자료</h1>' +
      '<p>' +
      (msg || '요금제 회원만 열람할 수 있습니다.') +
      '</p>' +
      '<p><a href="/pricing.html">요금제 보기</a> · <a href="/nakshatra/index.html">학습자료실 목차로</a></p>' +
      '</main>';
  }

  async function run() {
    try {
      var g = window.supabase || globalThis.supabase;
      if (!g || typeof g.createClient !== 'function') {
        fail('인증 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      var sb = g.createClient(SB_URL, SB_KEY);
      var res = await sb.auth.getSession();
      var session = res.data && res.data.session;
      if (!session) {
        goLogin();
        return;
      }
      var pres = await sb
        .from('profiles')
        .select('plan, plan_active_until')
        .eq('id', session.user.id)
        .maybeSingle();
      var plan = effectivePlan(pres.data);
      if (rank(plan) < 1) {
        goPricing();
        return;
      }
      showBody();
    } catch (e) {
      fail('접근 확인 중 오류가 났습니다. 새로고침 후 다시 시도해 주세요.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
