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

  /** 무료·Basic·Pro 공통: 핵심수·별자리·48주기 (Basic도 무료와 동일하게 열람) */
  function hasCoreProfileAccess(plan, devUnlock) {
    if (devUnlock) return true;
    return true;
  }

  /** 대주기·10년타임라인·성장지도·AI요약 등 — Pro 이상 */
  function hasDeepAnalysisAccess(plan, devUnlock) {
    if (devUnlock) return true;
    return isPlanAtLeast({ plan: plan }, 'pro');
  }

  /** 분석 모듈 최소 플랜 (목차 배지용) */
  var ANALYSIS_MODULE_TIER = {
    '#nav-at-a-glance': 'free',
    '#nav-core': 'free',
    '#zodiacInsightSection': 'free',
    '#period48Section': 'free',
    '#nav-flow': 'basic',
    '#monthlySection': 'basic',
    '#weeklyForecastSection': 'basic',
    '#nav-major-cycle': 'pro',
    '#nav-life-four': 'pro',
    '#pyramidRhythmSection': 'pro',
    '#timelineSection': 'pro',
    '#growthSection': 'pro',
    '#aiSummarySection': 'pro',
    '#aiTodaySection': 'pro',
    '#loshuSection': 'pro',
    '#seqArrowSection': 'pro',
  };

  function moduleMinTier(href) {
    return ANALYSIS_MODULE_TIER[href] || 'pro';
  }

  function tierBadgeHtml(tier) {
    var labels = { free: 'Free', basic: 'Basic', pro: 'Pro' };
    var t = labels[tier] ? tier : 'pro';
    var label = labels[t] || 'Pro';
    return (
      '<span class="lc-guide-tier-badge lc-guide-tier-badge--' +
      t +
      '" title="' +
      label +
      ' 플랜">' +
      label +
      '</span>'
    );
  }

  function tierBadgeForHref(href) {
    return tierBadgeHtml(moduleMinTier(href));
  }

  function tierLegendHtml() {
    return (
      '<p class="lc-guide-tier-legend">' +
      '<span class="lc-guide-tier-badge lc-guide-tier-badge--free">Free</span> 무료 · ' +
      '<span class="lc-guide-tier-badge lc-guide-tier-badge--basic">Basic</span> 베이직 이상 · ' +
      '<span class="lc-guide-tier-badge lc-guide-tier-badge--pro">Pro</span> 프로 이상' +
      '</p>'
    );
  }

  global.PaljaPlan = {
    effectivePlan: effectivePlan,
    isPlanAtLeast: isPlanAtLeast,
    hasCoreProfileAccess: hasCoreProfileAccess,
    hasDeepAnalysisAccess: hasDeepAnalysisAccess,
    moduleMinTier: moduleMinTier,
    tierBadgeHtml: tierBadgeHtml,
    tierBadgeForHref: tierBadgeForHref,
    tierLegendHtml: tierLegendHtml,
  };
})(typeof window !== 'undefined' ? window : globalThis);
