/**
 * 유료(구독·체험·달력패스) 계정당 기기 최대 4대
 * topbar-session / 각 페이지에서 ensurePaidAccess 호출
 */
(function (global) {
  var DEVICE_KEY = 'lifecode_device_id';
  var MAX = 4;
  var readyResolve;
  var readyPromise = new Promise(function (resolve) {
    readyResolve = resolve;
  });
  var settled = false;

  function getDeviceId() {
    try {
      var id = localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch (_) {
      return 'fallback-' + String(Date.now());
    }
  }

  function setLimitHit(hit) {
    global.PALJA_DEVICE_LIMIT_HIT = !!hit;
    global.PALJA_DEVICE_OK = !hit;
  }

  function showBanner() {
    if (document.getElementById('palja-device-limit-banner')) return;
    var el = document.createElement('div');
    el.id = 'palja-device-limit-banner';
    el.setAttribute('role', 'alert');
    el.style.cssText =
      'position:sticky;top:0;z-index:9999;background:#fff7ed;border-bottom:1px solid #fdba74;' +
      'color:#9a3412;padding:10px 16px;font-size:13px;line-height:1.5;text-align:center;';
    el.innerHTML =
      '이 계정은 이미 <strong>기기 ' +
      MAX +
      '대</strong>까지 등록되어 이 브라우저에서는 유료 기능을 열 수 없습니다. ' +
      '다른 기기 사용을 줄이거나 고객센터로 문의해 주세요.';
    var top = document.querySelector('.site-top');
    if (top && top.parentNode) top.parentNode.insertBefore(el, top.nextSibling);
    else document.body.insertBefore(el, document.body.firstChild);
  }

  function hideBanner() {
    var el = document.getElementById('palja-device-limit-banner');
    if (el) el.remove();
  }

  function needsDeviceGate(profile) {
    if (!profile) return false;
    var plan = global.PaljaPlan
      ? global.PaljaPlan.effectivePlan(profile)
      : String(profile.plan || 'free').toLowerCase();
    if (plan && plan !== 'free') return true;
    if (profile.calendar_pass_until && new Date(profile.calendar_pass_until) > new Date()) return true;
    return false;
  }

  /**
   * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
   */
  async function ensurePaidAccess(accessToken, profile) {
    if (!needsDeviceGate(profile)) {
      setLimitHit(false);
      hideBanner();
      markReady({ ok: true, skipped: true });
      return { ok: true, skipped: true };
    }
    if (!accessToken) {
      setLimitHit(false);
      markReady({ ok: true, skipped: true });
      return { ok: true, skipped: true };
    }
    try {
      var res = await fetch('/api/account/devices/register', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (res.ok && data.ok !== false) {
        setLimitHit(false);
        hideBanner();
        markReady({ ok: true });
        return { ok: true };
      }
      if (data.error === 'device_limit' || res.status === 403) {
        setLimitHit(true);
        showBanner();
        markReady({ ok: false, error: 'device_limit' });
        return { ok: false, error: 'device_limit' };
      }
      // 테이블 미적용 등 — 서비스 막지 않음
      setLimitHit(false);
      markReady({ ok: true, skipped: true });
      return { ok: true, skipped: true };
    } catch (_) {
      setLimitHit(false);
      markReady({ ok: true, skipped: true });
      return { ok: true, skipped: true };
    }
  }

  function markReady(result) {
    if (settled) return;
    settled = true;
    readyResolve(result);
    try {
      global.dispatchEvent(new CustomEvent('palja-device-gate', { detail: result }));
    } catch (_) {}
  }

  function whenReady() {
    return readyPromise;
  }

  // 로그인 없는 페이지에서도 whenReady가 끝나도록
  if (typeof document !== 'undefined') {
    setTimeout(function () {
      if (!settled) markReady({ ok: true, skipped: true });
    }, 8000);
  }

  global.PaljaDevice = {
    MAX: MAX,
    getDeviceId: getDeviceId,
    ensurePaidAccess: ensurePaidAccess,
    whenReady: whenReady,
    needsDeviceGate: needsDeviceGate,
  };
  setLimitHit(false);
})(typeof window !== 'undefined' ? window : globalThis);
