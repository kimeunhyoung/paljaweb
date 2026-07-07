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

  var PLAN_RANKS = { free: 0, basic: 1, pro: 2, professional: 3, professional2: 4 };

  function isPlanAtLeast(profile, required) {
    return (PLAN_RANKS[effectivePlan(profile)] || 0) >= (PLAN_RANKS[required] || 0);
  }

  /** 상담사(Professional) 또는 초대 전용 professional2(상담사+피라미드) */
  function isCounselorPlan(planOrProfile) {
    var p =
      typeof planOrProfile === 'string'
        ? planOrProfile
        : effectivePlan(planOrProfile);
    return p === 'professional' || p === 'professional2';
  }

  function hasCounselorAccess(profile) {
    return isCounselorPlan(profile);
  }

  /** 피라미드 리듬 — 초대 전용 professional2만 (공개 요금제·Pro 미포함) */
  function hasPyramidRhythmAccess(plan, devUnlock) {
    if (devUnlock) return false;
    return effectivePlan({ plan: plan }) === 'professional2';
  }

  function syncPyramidRhythmSectionVisibility(plan, devUnlock) {
    if (typeof document === 'undefined') return;
    var can = hasPyramidRhythmAccess(plan, devUnlock);
    var el = document.getElementById('pyramidRhythmSection');
    if (el) {
      if (can) {
        el.classList.remove('lc-product-off');
        el.style.display = '';
        el.removeAttribute('aria-hidden');
      } else {
        el.classList.add('lc-product-off');
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      }
    }
    document.querySelectorAll('a[href="#pyramidRhythmSection"]').forEach(function (a) {
      var row = a.closest('.lc-guide-row, li, .analysis-jump-item');
      var target = row || a;
      if (can) {
        target.classList.remove('lc-product-off');
        if (row) row.style.display = '';
        else a.style.display = '';
      } else {
        target.classList.add('lc-product-off');
        if (row) row.style.display = 'none';
        else a.style.display = 'none';
      }
    });
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

  /** 인생전반표·성장지도·로슈 등 — Pro 이상 (피라미드 리듬은 professional2 전용) */
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
    '#pyramidRhythmSection': 'professional2',
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

  /** 팔자연구소 프로그램별 최소 플랜 — 타로코드·라이프코드 무료, 수비학달력 Basic+, 네임·소울하모니·48궁합 Pro+ */
  var PRODUCT_MIN_PLAN = {
    tarot: 'free',
    lifecode: 'free',
    name: 'pro',
    harmony: 'pro',
    p48: 'pro',
    calendar: 'basic',
  };

  var BASIC_PRODUCT_GATE_MSG = 'Basic 이상 플랜에서 이용할 수 있습니다.';

  function productMinPlan(product) {
    return PRODUCT_MIN_PLAN[product] || 'basic';
  }

  function planKoLabel(plan) {
    if (plan === 'pro') return 'Pro';
    if (plan === 'professional') return 'Professional';
    if (plan === 'professional2') return 'Professional2';
    return 'Basic';
  }

  function productGateMsg(product) {
    return planKoLabel(productMinPlan(product)) + ' 이상 플랜에서 이용할 수 있습니다.';
  }

  function hasProductAccess(product, plan, devUnlock) {
    if (devUnlock) return true;
    return isPlanAtLeast({ plan: plan }, productMinPlan(product));
  }

  function productGateHtml(product) {
    return (
      productGateMsg(product) +
      ' <a href="pricing.html" style="color:var(--accent);text-decoration:underline">요금제 보기</a>'
    );
  }

  /** @deprecated use productGateHtml(product) */
  function basicProductGateHtml() {
    return (
      BASIC_PRODUCT_GATE_MSG +
      ' <a href="pricing.html" style="color:var(--accent);text-decoration:underline">요금제 보기</a>'
    );
  }

  function checkBasicProductAccess(product, plan, errEl, devUnlock) {
    if (hasProductAccess(product, plan, devUnlock)) return true;
    var msg = productGateMsg(product);
    if (errEl) {
      errEl.innerHTML = productGateHtml(product);
      if (errEl.scrollIntoView) {
        errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      alert(msg);
    }
    return false;
  }

  global.PaljaPlan = {
    PLAN_RANKS: PLAN_RANKS,
    effectivePlan: effectivePlan,
    isPlanAtLeast: isPlanAtLeast,
    planKoLabel: planKoLabel,
    isCounselorPlan: isCounselorPlan,
    hasCounselorAccess: hasCounselorAccess,
    hasPyramidRhythmAccess: hasPyramidRhythmAccess,
    syncPyramidRhythmSectionVisibility: syncPyramidRhythmSectionVisibility,
    hasCoreProfileAccess: hasCoreProfileAccess,
    hasBasicProfileDetailAccess: hasBasicProfileDetailAccess,
    hasDeepAnalysisAccess: hasDeepAnalysisAccess,
    hasBasicYearTimelineAccess: hasBasicYearTimelineAccess,
    hasFullTimelineAccess: hasFullTimelineAccess,
    moduleMinTier: moduleMinTier,
    tierBadgeHtml: tierBadgeHtml,
    tierBadgeForHref: tierBadgeForHref,
    tierLegendHtml: tierLegendHtml,
    PRODUCT_MIN_PLAN: PRODUCT_MIN_PLAN,
    productMinPlan: productMinPlan,
    hasProductAccess: hasProductAccess,
    productGateMsg: productGateMsg,
    productGateHtml: productGateHtml,
    BASIC_PRODUCT_GATE_MSG: BASIC_PRODUCT_GATE_MSG,
    basicProductGateHtml: basicProductGateHtml,
    checkBasicProductAccess: checkBasicProductAccess,
  };
})(typeof window !== 'undefined' ? window : globalThis);
