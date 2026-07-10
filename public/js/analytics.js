/**
 * GA4 — Render 환경변수 GA_MEASUREMENT_ID 설정 시 활성화
 */
(function () {
  if (window.__paljaAnalyticsLoaded) return;
  window.__paljaAnalyticsLoaded = true;

  var ready = false;
  var queue = [];
  var measurementId = '';

  function flush() {
    if (!ready || typeof window.gtag !== 'function') return;
    while (queue.length) {
      var item = queue.shift();
      window.gtag('event', item.name, item.params || {});
    }
  }

  function init(id) {
    if (!id || ready) return;
    measurementId = id;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { send_page_view: true });

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    ready = true;
    flush();
  }

  function track(name, params) {
    if (!name) return;
    if (ready && typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    } else {
      queue.push({ name: name, params: params || {} });
    }
  }

  window.PaljaAnalytics = { track: track, init: init };

  fetch('/api/site-config')
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (cfg) {
      if (cfg && cfg.gaMeasurementId) init(cfg.gaMeasurementId);
    })
    .catch(function () {});
})();
