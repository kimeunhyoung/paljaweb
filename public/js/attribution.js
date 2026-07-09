/**
 * 첫 방문 유입 정보(first-touch)를 localStorage에 저장하고, 가입 후 profiles에 동기화합니다.
 */
(function () {
  const STORAGE_KEY = 'palja_signup_attribution';
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  function readParams() {
    try {
      return new URLSearchParams(window.location.search || '');
    } catch {
      return new URLSearchParams();
    }
  }

  function hasUtm(params) {
    return UTM_KEYS.some((k) => params.get(k));
  }

  function buildSnapshot() {
    const params = readParams();
    const path = window.location.pathname || '/';
    const search = window.location.search || '';
    return {
      landingPage: path + (search ? search.split('#')[0] : ''),
      referrer: document.referrer || '',
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
      utmTerm: params.get('utm_term') || '',
      utmContent: params.get('utm_content') || '',
      capturedAt: new Date().toISOString(),
    };
  }

  function capture() {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return read();
      const snap = buildSnapshot();
      if (!snap.referrer && !hasUtm(readParams()) && (snap.landingPage === '/' || snap.landingPage === '/index.html')) {
        // 직접 접속(북마크 등)도 첫 페이지는 기록
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
      return snap;
    } catch {
      return null;
    }
  }

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function syncWithToken(token) {
    const data = read();
    if (!data || !token) return { ok: false, skipped: true };
    try {
      const res = await fetch('/api/profile/signup-attribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, ...json };
    } catch {
      return { ok: false };
    }
  }

  capture();

  window.PaljaAttribution = {
    capture,
    read,
    syncWithToken,
  };
})();
