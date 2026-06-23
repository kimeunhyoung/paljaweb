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

  /** 대주기·인생4단계·10년 전체·성장지도·AI요약 등 — Pro 이상 */
  function hasDeepAnalysisAccess(plan, devUnlock) {
    if (devUnlock) return true;
    return isPlanAtLeast({ plan: plan }, 'pro');
  }

  /** Basic: 10년 타임라인에서 올해(수비학 개인연도·타로 올해의 수)만 — 전체 차트·인생전반표는 Pro */
  function hasBasicYearTimelineAccess(plan, devUnlock) {
    if (devUnlock) return true;
    return isPlanAtLeast({ plan: plan }, 'basic');
  }

  function hasFullTimelineAccess(plan, devUnlock) {
    return hasDeepAnalysisAccess(plan, devUnlock);
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
    '#timelineSection': 'basic',
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
    if (tier === 'free') return '';
    var labels = { basic: 'B', pro: 'P' };
    var titles = { basic: 'Basic', pro: 'Pro' };
    var t = labels[tier] ? tier : 'pro';
    var label = labels[t] || 'P';
    var title = (titles[t] || 'Pro') + ' 플랜';
    return (
      '<span class="lc-guide-tier-badge lc-guide-tier-badge--' +
      t +
      '" title="' +
      title +
      '">' +
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
      '<span class="lc-guide-tier-badge lc-guide-tier-badge--basic" title="Basic 플랜">B</span> 베이직 이상 · ' +
      '<span class="lc-guide-tier-badge lc-guide-tier-badge--pro" title="Pro 플랜">P</span> 프로 이상' +
      '</p>'
    );
  }

  global.PaljaPlan = {
    effectivePlan: effectivePlan,
    isPlanAtLeast: isPlanAtLeast,
    hasCoreProfileAccess: hasCoreProfileAccess,
    hasDeepAnalysisAccess: hasDeepAnalysisAccess,
    hasBasicYearTimelineAccess: hasBasicYearTimelineAccess,
    hasFullTimelineAccess: hasFullTimelineAccess,
    moduleMinTier: moduleMinTier,
    tierBadgeHtml: tierBadgeHtml,
    tierBadgeForHref: tierBadgeForHref,
    tierLegendHtml: tierLegendHtml,
  };
})(typeof window !== 'undefined' ? window : globalThis);
