/**
 * profiles.plan + plan_active_until → 실제 이용 플랜
 * 만료 시 한 단계가 아니라 free
 */
(function (global) {
  /** DB plan 값 정규화 — legacy 값은 새 키로 변환 */
  function normalizeDbPlan(dbPlan) {
    return String(dbPlan || 'free').toLowerCase();
  }

  function effectivePlan(profile) {
    var dbPlan = normalizeDbPlan(profile && profile.plan);
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

  var PLAN_RANKS = { free: 0, basic: 1, plus: 2, professional: 3, private: 4 };

  function isPlanAtLeast(profile, required) {
    var req = normalizeDbPlan(required);
    var ok = (PLAN_RANKS[effectivePlan(profile)] || 0) >= (PLAN_RANKS[req] || 0);
    if (!ok) return false;
    // 유료 플랜 권한이 있어도 기기 한도 초과 시 잠금
    if (req !== 'free' && global.PALJA_DEVICE_LIMIT_HIT === true) return false;
    return true;
  }

  /** 상담사(Professional) 또는 Private */
  function isCounselorPlan(planOrProfile) {
    var p =
      typeof planOrProfile === 'string'
        ? normalizeDbPlan(planOrProfile)
        : effectivePlan(planOrProfile);
    return p === 'professional' || p === 'private';
  }

  function hasCounselorAccess(profile) {
    return isCounselorPlan(profile);
  }

  /** Private — 인생리듬·타로 타임라인 */
  function hasSpecialAccess(plan, devUnlock) {
    if (devUnlock) return true;
    return effectivePlan({ plan: plan }) === 'private';
  }

  /** @deprecated use hasSpecialAccess */
  function hasPyramidRhythmAccess(plan, devUnlock) {
    return hasSpecialAccess(plan, devUnlock);
  }

  function syncPyramidRhythmSectionVisibility(plan, devUnlock) {
    if (typeof document === 'undefined') return;
    var can = hasSpecialAccess(plan, devUnlock);
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

  /** 인생전반표(수비학)·성장지도·로슈 등 — Plus 이상 · 인생리듬·타로 타임라인은 Private+ */
  function hasDeepAnalysisAccess(plan, devUnlock) {
    if (devUnlock) return true;
    return isPlanAtLeast({ plan: plan }, 'plus');
  }

  /** Basic+: 수비학 10년 차트 · Plus+: 수비학 인생전반표(0~100세) · 타로는 Private+ */
  function hasBasicYearTimelineAccess(plan, devUnlock) {
    if (devUnlock) return true;
    return isPlanAtLeast({ plan: plan }, 'basic');
  }

  /** 수비학 인생전반표(0~100세) — Plus 이상 */
  function hasFullTimelineAccess(plan, devUnlock) {
    return hasDeepAnalysisAccess(plan, devUnlock);
  }

  /** 타로 10년·100년 타임라인 — Private 이상 */
  function hasTarotTimelineAccess(plan, devUnlock) {
    return hasSpecialAccess(plan, devUnlock);
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
    '#pyramidRhythmSection': 'private',
    '#timelineSection': 'basic',
    '#growthSection': 'plus',
    '#aiSummarySection': 'plus',
    '#aiTodaySection': 'plus',
    '#loshuSection': 'plus',
    '#seqArrowSection': 'plus',
  };

  function moduleMinTier(href) {
    return ANALYSIS_MODULE_TIER[href] || 'plus';
  }

  function tierBadgeHtml(tier) {
    if (tier === 'free') return '';
    var labels = { basic: 'B', plus: 'P', private: 'S' };
    var titles = {
      basic: 'B: Basic 이상',
      plus: 'P: Plus·Professional 이상',
      private: 'S: Private',
    };
    var t = labels[tier] ? tier : 'plus';
    var css = t === 'plus' ? 'pro' : (t === 'private' ? 'special' : t);
    var label = labels[tier] || labels[t] || 'P';
    var title = titles[tier] || titles[t] || 'Plus 플랜';
    return (
      '<span class="lc-guide-tier-badge lc-guide-tier-badge--' +
      css +
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
      '<span class="lc-guide-tier-badge lc-guide-tier-badge--basic" title="B: Basic 이상">B</span> 베이직 이상 · ' +
      '<span class="lc-guide-tier-badge lc-guide-tier-badge--pro" title="P: Plus·Professional 이상">P</span> Plus·Professional 이상 · ' +
      '<span class="lc-guide-tier-badge lc-guide-tier-badge--special" title="S: Private">S</span> Private' +
      '</p>'
    );
  }

  /** 팔자연구소 프로그램별 최소 플랜 — 타로·라이프코드 무료, 달력·소울하모니·48궁합 Basic+, 네임코드 Plus+ */
  var PRODUCT_MIN_PLAN = {
    tarot: 'free',
    lifecode: 'free',
    name: 'plus',
    harmony: 'basic',
    p48: 'basic',
    calendar: 'basic',
  };

  var BASIC_PRODUCT_GATE_MSG = 'Basic 이상 플랜에서 이용할 수 있습니다.';

  function productMinPlan(product) {
    return PRODUCT_MIN_PLAN[product] || 'basic';
  }

  function planKoLabel(plan) {
    if (plan === 'plus') return 'Plus';
    if (plan === 'professional') return 'Professional';
    if (plan === 'private') return 'Private';
    return 'Basic';
  }

  function productGateMsg(product) {
    return planKoLabel(productMinPlan(product)) + ' 이상 플랜에서 이용할 수 있습니다.';
  }

  function pageNextUrl() {
    if (typeof global.location === 'undefined') return 'index.html';
    var p = global.location.pathname.split('/').pop() || 'index.html';
    return p + global.location.search + global.location.hash;
  }

  function signupUrl(next) {
    var n = next || pageNextUrl();
    return 'signup.html?next=' + encodeURIComponent(n);
  }

  function loginUrl(next) {
    var n = next || pageNextUrl();
    return 'login.html?next=' + encodeURIComponent(n);
  }

  function isLoggedInFlag() {
    return !!global.PALJA_LOGGED_IN;
  }

  function productGateLinksHtml(product, options) {
    options = options || {};
    var next = options.next || pageNextUrl();
    var loggedIn = options.loggedIn;
    if (loggedIn === undefined) loggedIn = isLoggedInFlag();
    var btn =
      'display:inline-block;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin:4px 8px 4px 0;';
    if (!loggedIn) {
      return (
        '<div style="margin-top:14px;">' +
        '<a href="' + signupUrl(next) + '" style="' + btn + 'background:#4a3520;color:#f5f0e8;">무료 가입하기</a>' +
        '<a href="' + loginUrl(next) + '" style="' + btn + 'background:#fff;color:#4a3520;border:1px solid rgba(139,111,71,.35);">로그인</a>' +
        '<a href="pricing.html" style="font-size:13px;color:var(--accent,#c4603a);text-decoration:underline;">요금제 보기</a>' +
        '</div>'
      );
    }
    return (
      '<div style="margin-top:14px;">' +
      '<a href="pricing.html?highlight=' + encodeURIComponent(productMinPlan(product)) + '" style="' + btn + 'background:#4a3520;color:#f5f0e8;">' +
      planKoLabel(productMinPlan(product)) + ' 업그레이드</a>' +
      '</div>'
    );
  }

  function productGatePanelHtml(product, options) {
    options = options || {};
    var title = options.title || planKoLabel(productMinPlan(product)) + ' 이상에서 이용 가능';
    var desc = options.desc || productGateMsg(product);
    var extras = options.extrasHtml || '';
    return (
      '<div class="palja-gate-panel">' +
      '<h2 style="margin:0 0 8px;font-size:20px;color:var(--ink,#2c1f0e);">' + title + '</h2>' +
      '<p class="palja-gate-desc" style="margin:0;color:var(--muted,#9a8570);line-height:1.7;">' + desc + '</p>' +
      extras +
      productGateLinksHtml(product, options) +
      '</div>'
    );
  }

  function hasActiveCalendarPass(profileOrUntil) {
    var until =
      profileOrUntil && typeof profileOrUntil === 'object'
        ? profileOrUntil.calendar_pass_until || profileOrUntil.calendarPassUntil
        : profileOrUntil;
    if (!until) return false;
    var t = new Date(until).getTime();
    return Number.isFinite(t) && t > Date.now();
  }

  function hasProductAccess(product, plan, devUnlock, extras) {
    if (devUnlock) return true;
    if (global.PALJA_DEVICE_LIMIT_HIT === true) return false;
    extras = extras || {};
    if (
      product === 'calendar' &&
      (hasActiveCalendarPass(extras) || hasActiveCalendarPass(extras.profile))
    ) {
      return true;
    }
    return isPlanAtLeast({ plan: plan }, productMinPlan(product));
  }

  function productGateHtml(product, options) {
    return productGatePanelHtml(product, options);
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
    if (errEl) {
      errEl.innerHTML = productGatePanelHtml(product, { loggedIn: isLoggedInFlag() });
      if (errEl.scrollIntoView) {
        errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      alert(productGateMsg(product));
    }
    return false;
  }

  global.PaljaPlan = {
    normalizeDbPlan: normalizeDbPlan,
    PLAN_RANKS: PLAN_RANKS,
    effectivePlan: effectivePlan,
    isPlanAtLeast: isPlanAtLeast,
    planKoLabel: planKoLabel,
    isCounselorPlan: isCounselorPlan,
    hasCounselorAccess: hasCounselorAccess,
    hasSpecialAccess: hasSpecialAccess,
    hasPyramidRhythmAccess: hasPyramidRhythmAccess,
    syncPyramidRhythmSectionVisibility: syncPyramidRhythmSectionVisibility,
    hasCoreProfileAccess: hasCoreProfileAccess,
    hasBasicProfileDetailAccess: hasBasicProfileDetailAccess,
    hasDeepAnalysisAccess: hasDeepAnalysisAccess,
    hasBasicYearTimelineAccess: hasBasicYearTimelineAccess,
    hasFullTimelineAccess: hasFullTimelineAccess,
    hasTarotTimelineAccess: hasTarotTimelineAccess,
    moduleMinTier: moduleMinTier,
    tierBadgeHtml: tierBadgeHtml,
    tierBadgeForHref: tierBadgeForHref,
    tierLegendHtml: tierLegendHtml,
    PRODUCT_MIN_PLAN: PRODUCT_MIN_PLAN,
    productMinPlan: productMinPlan,
    hasActiveCalendarPass: hasActiveCalendarPass,
    hasProductAccess: hasProductAccess,
    productGateMsg: productGateMsg,
    pageNextUrl: pageNextUrl,
    signupUrl: signupUrl,
    loginUrl: loginUrl,
    isLoggedInFlag: isLoggedInFlag,
    productGateLinksHtml: productGateLinksHtml,
    productGatePanelHtml: productGatePanelHtml,
    productGateHtml: productGateHtml,
    BASIC_PRODUCT_GATE_MSG: BASIC_PRODUCT_GATE_MSG,
    basicProductGateHtml: basicProductGateHtml,
    checkBasicProductAccess: checkBasicProductAccess,
  };
})(typeof window !== 'undefined' ? window : globalThis);
