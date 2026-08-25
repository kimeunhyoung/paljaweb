/**
 * 테스터 모집용 「조용 모드」
 * - 팝업·결제 CTA 숨김
 * - Render 환경변수 PALJA_TESTER_QUIET=0 이면 끔 (미설정/1이면 켬)
 * - URL ?tester_quiet=1|0 으로 임시 확인 가능
 */
(function () {
  // 모집 기간 기본 ON — 끝나면 Render에서 PALJA_TESTER_QUIET=0
  var DEFAULT_QUIET = true;

  function apply(quiet) {
    quiet = !!quiet;
    window.PaljaSiteMode = {
      testerQuiet: quiet,
      ready: true,
    };
    document.documentElement.classList.toggle('palja-tester-quiet', quiet);
    try {
      document.dispatchEvent(
        new CustomEvent('palja-site-mode', { detail: { testerQuiet: quiet } }),
      );
    } catch (_) { /* ignore */ }
  }

  function ensureCss() {
    if (document.querySelector('link[data-palja-site-mode-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/site-mode.css?v=1';
    link.setAttribute('data-palja-site-mode-css', '1');
    document.head.appendChild(link);
  }

  ensureCss();

  try {
    var q = new URLSearchParams(location.search).get('tester_quiet');
    if (q === '1' || q === 'true') {
      apply(true);
      return;
    }
    if (q === '0' || q === 'false') {
      apply(false);
      return;
    }
  } catch (_) { /* ignore */ }

  // 깜빡임 방지: fetch 전 기본값 적용
  apply(DEFAULT_QUIET);

  fetch('/api/site-config', { credentials: 'same-origin' })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (cfg) {
      if (!cfg || typeof cfg.testerQuiet !== 'boolean') return;
      apply(cfg.testerQuiet);
    })
    .catch(function () { /* keep default */ });
})();
