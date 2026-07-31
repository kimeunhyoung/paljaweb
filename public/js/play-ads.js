/**
 * lifecode-play AdSense — 본문 하단 수동 슬롯 (탐색 정책 준수)
 *
 * meta name="play-adsense-slot" content="슬롯ID"
 * ?source=play (TWA) / ?source=toss (앱인토스) 일 때는 AdMob·토스광고용으로 AdSense 미로드
 */
(function () {
  const AD_CLIENT = 'ca-pub-7451075921625740';
  const src = new URLSearchParams(window.location.search).get('source');
  if (src === 'play' || src === 'toss') return;

  const host = document.getElementById('playAdHost');
  if (!host) return;

  const meta = document.querySelector('meta[name="play-adsense-slot"]');
  const slot = (meta && meta.getAttribute('content') || '').trim();
  if (!slot) return;

  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', AD_CLIENT);
  ins.setAttribute('data-ad-slot', slot);
  ins.setAttribute('data-ad-format', 'auto');
  ins.setAttribute('data-full-width-responsive', 'true');
  host.appendChild(ins);

  host.closest('.play-ad-slot')?.classList.add('play-ad-slot--active');

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.warn('[play-ads] AdSense push failed', e);
  }
})();
