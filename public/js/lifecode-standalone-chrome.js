/**
 * ?lifecode=1 단품 모드 — 공통 URL·세션·헤더 도구
 */
export function isLifecodeStandalonePage() {
  return new URLSearchParams(window.location.search).get('lifecode') === '1';
}

export function lifecodeDeviceId() {
  const key = 'lifecode_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function hasValidLifecodeSession() {
  try {
    const r = await fetch(
      `/api/lifecode/session?deviceId=${encodeURIComponent(lifecodeDeviceId())}`,
      { credentials: 'include' },
    );
    const data = await r.json();
    return !!data.ok;
  } catch {
    return false;
  }
}

export async function lifecodeLogout() {
  await fetch('/api/lifecode/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/lifecode/';
}

export function markLifecodeStandaloneRoot() {
  document.documentElement.classList.add('lifecode-standalone');
}

/** @param {'analysis'|'counselor'} active */
export function lifecodeTopbarToolsHtml(active = 'analysis') {
  const analysis =
    active === 'analysis'
      ? '<span class="lifecode-topbar-link" style="color:var(--deep-brown,#4a3520);font-weight:600">라이프코드 분석</span>'
      : '<a class="lifecode-topbar-link" href="analysis.html?lifecode=1">라이프코드 분석</a>';
  const counselor =
    active === 'counselor'
      ? '<span class="lifecode-topbar-link" style="color:var(--deep-brown,#4a3520);font-weight:600">상담사 허브</span>'
      : '<a class="lifecode-topbar-link" href="counselor.html?lifecode=1">상담사 허브</a>';
  return `<div class="lifecode-topbar-tools">${analysis}${counselor}</div>`;
}

export function bindLifecodeTopbarTools() {
  /* 단품: 접속 종료 UI 없음 — 1기기 라이선스, 실수 로그아웃 방지 */
}
