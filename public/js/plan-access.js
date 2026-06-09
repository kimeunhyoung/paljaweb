/**
 * profiles.plan + plan_active_until → 실제 이용 플랜
 * 만료 시 한 단계가 아니라 free
 */
(function (global) {
  function effectivePlan(profile) {
    var dbPlan = (profile && profile.plan) || 'free';
    if (dbPlan === 'free') return 'free';
    if (
      profile &&
      profile.plan_active_until &&
      new Date(profile.plan_active_until) <= new Date()
    ) {
      return 'free';
    }
    return dbPlan;
  }

  function isPlanAtLeast(profile, required) {
    var ranks = { free: 0, basic: 1, pro: 2, professional: 3 };
    return (ranks[effectivePlan(profile)] || 0) >= (ranks[required] || 0);
  }

  global.PaljaPlan = {
    effectivePlan: effectivePlan,
    isPlanAtLeast: isPlanAtLeast,
  };
})(typeof window !== 'undefined' ? window : globalThis);
