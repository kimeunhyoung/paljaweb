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

  /** 무료: 핵심수 카드(숫자)만 · Basic+: 아코디언·스토리·별자리 상세·48주기 */
  function hasBasicProfileDetailAccess(plan, devUnlock) {
    if (devUnlock) return true;
    return isPlanAtLeast({ plan: plan }, 'basic');
  }

  /** @deprecated use hasBasicProfileDetailAccess — 하위 호환 */
  function hasCoreProfileAccess(plan, devUnlock) {
    return hasBasicProfileDetailAccess(plan, devUnlock);
  }

  /** 인생전반표·피라미드·성장지도·AI요약·로슈 등 — Pro 이상 */
  function hasDeepAnalysisAccess(plan, devUnlock) {
    if (devUnlock) return true;
    return isPlanAtLeast({ plan: plan }, 'pro');
  }

  /** Basic+: 10년 차트(수비학·타로) · Pro+: 인생전반표(0~100세) */
  function hasBasicYearTimelineAccess(plan, devUnlock) {
    if (devUnlock) return true;
    return isPlanAtLeast({ plan: plan }, 'basic');
  }

  /** 인생전반표(0~100세) — Pro 이상 */
  function hasFullTimelineAccess(plan, devUnlock) {
    return hasDeepAnalysisAccess(plan, devUnlock);
  }

  /** 분석 모듈 최소 플랜 (목차 배지용) */
  var ANALYSIS_MODULE_TIER = {
    '#nav-at-a-glance': 'free',
    '#nav-core': 'free',
    '#zodiacInsightSection': 'free',
    '#period48Section': 'basic',
    '#nav-flow': 'basic',
    '#monthlySection': 'basic',
    '#weeklyForecastSection': 'basic',
    '#nav-major-cycle': 'basic',
    '#nav-life-four': 'basic',
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
    hasBasicProfileDetailAccess: hasBasicProfileDetailAccess,
    hasDeepAnalysisAccess: hasDeepAnalysisAccess,
    hasBasicYearTimelineAccess: hasBasicYearTimelineAccess,
    hasFullTimelineAccess: hasFullTimelineAccess,
    moduleMinTier: moduleMinTier,
    tierBadgeHtml: tierBadgeHtml,
    tierBadgeForHref: tierBadgeForHref,
    tierLegendHtml: tierLegendHtml,
  };
})(typeof window !== 'undefined' ? window : globalThis);
