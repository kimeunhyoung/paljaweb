/**
 * 타로코드 광고 — 토스 미니앱(인앱 배너) + 웹(AdSense) 분기
 *
 * meta name="tarot-toss-ad-group" — 콘솔 발급 광고 그룹 ID (출시 번들에만 실제 ID 사용)
 * meta name="tarot-adsense-slot"   — AdSense 슬롯 (웹)
 *
 * 로컬 QR 테스트: ?tossAdGroup=콘솔에서_복사한_ID (테스트용 ID 문자열은 번들에 넣지 않음)
 */
(function () {
  const AD_CLIENT = 'ca-pub-7451075921625740';

  const standalone = document.documentElement.classList.contains('tarot-standalone');
  const slot = document.getElementById('tarotAdSlotTop');
  const host = document.getElementById('tarotAdBannerHost');
  if (!slot || !host) return;

  const params = new URLSearchParams(window.location.search);
  function meta(name) {
    const el = document.querySelector('meta[name="' + name + '"]');
    return (el && el.getAttribute('content')) ? el.getAttribute('content').trim() : '';
  }

  const tossAdGroup =
    params.get('tossAdGroup') || meta('tarot-toss-ad-group') || '';
  const adsenseSlot =
    params.get('adsenseSlot') || meta('tarot-adsense-slot') || '';

  function activateSlot() {
    slot.classList.add('tarot-ad-slot--active');
  }

  function prepareHost() {
    host.innerHTML = '';
    host.style.width = '100%';
    host.style.minHeight = '96px';
    host.style.boxSizing = 'border-box';
  }

  function loadAdsense() {
    if (!adsenseSlot) return false;
    prepareHost();
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', AD_CLIENT);
    ins.setAttribute('data-ad-slot', adsenseSlot);
    ins.setAttribute('data-ad-format', 'horizontal');
    ins.setAttribute('data-full-width-responsive', 'true');
    host.appendChild(ins);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      activateSlot();
      return true;
    } catch (e) {
      console.warn('[tarot-ads] AdSense push failed', e);
      return false;
    }
  }

  function waitTossInitialized(TossAds) {
    return new Promise(function (resolve, reject) {
      TossAds.initialize({
        callbacks: {
          onInitialized: function () { resolve(); },
          onInitializationFailed: function (err) {
            reject(err || new Error('TossAds init failed'));
          },
        },
      });
    });
  }

  function attachTossBanner(TossAds, adGroupId) {
    if (!TossAds.attachBanner.isSupported()) return false;
    prepareHost();
    var attached = TossAds.attachBanner(adGroupId, host, {
      theme: 'auto',
      tone: 'grey',
      variant: 'expanded',
      callbacks: {
        onAdRendered: function () { activateSlot(); },
        onNoFill: function () { console.warn('[tarot-ads] Toss no fill'); },
        onAdFailedToRender: function (p) {
          console.warn('[tarot-ads] Toss render failed', p && p.error);
        },
      },
    });
    window.__tarotDestroyTossBanner = function () {
      try { attached && attached.destroy && attached.destroy(); } catch (e) {}
      try { TossAds.destroyAll && TossAds.destroyAll(); } catch (e) {}
    };
    window.addEventListener('pagehide', window.__tarotDestroyTossBanner);
    return true;
  }

  function loadTossSdk() {
    return import(
      /* webpackIgnore: true */
      'https://esm.sh/@apps-in-toss/web-framework@2.6.0'
    ).then(function (mod) {
      return mod.TossAds || (mod.default && mod.default.TossAds);
    });
  }

  function tryTossBanner() {
    if (params.get('app') === '1') return Promise.resolve(false);
    if (!standalone) return Promise.resolve(false);
    if (!tossAdGroup) return Promise.resolve(false);

    return loadTossSdk()
      .then(function (TossAds) {
        if (!TossAds || !TossAds.initialize || !TossAds.initialize.isSupported()) {
          return false;
        }
        return waitTossInitialized(TossAds).then(function () {
          return attachTossBanner(TossAds, tossAdGroup);
        });
      })
      .catch(function (e) {
        console.warn('[tarot-ads] Toss SDK unavailable', e);
        return false;
      });
  }

  function init() {
    tryTossBanner().then(function (ok) {
      if (!ok) loadAdsense();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
