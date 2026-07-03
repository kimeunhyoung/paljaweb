/**
 * 라이프코드 분석 — AI 종합·오늘 메시지 노출 여부
 * 기본 숨김. 개발·테스트 시 URL에 ?ai=on
 */
(function (global) {
  const AI_SECTION_IDS = ['aiSummarySection', 'aiTodaySection'];

  function publicAiSectionsEnabled() {
    try {
      return new URLSearchParams(global.location.search).get('ai') === 'on';
    } catch {
      return false;
    }
  }

  function hidePublicAiSections() {
    if (publicAiSectionsEnabled()) return;
    AI_SECTION_IDS.forEach((id) => {
      const el = global.document.getElementById(id);
      if (el) {
        el.classList.add('lc-product-off');
        el.setAttribute('aria-hidden', 'true');
      }
    });
    global.document.querySelectorAll(
      '#analysisJumpPanel a[href="#aiSummarySection"], #analysisJumpPanel a[href="#aiTodaySection"]',
    ).forEach((a) => a.classList.add('lc-product-off'));
  }

  global.PaljaAnalysisAi = {
    AI_SECTION_IDS,
    publicAiSectionsEnabled,
    hidePublicAiSections,
  };

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', hidePublicAiSections);
  } else {
    hidePublicAiSections();
  }
})(typeof window !== 'undefined' ? window : globalThis);
