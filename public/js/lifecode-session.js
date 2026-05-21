import { getLifecodeDeviceId } from './lifecode-device.js';

export function lifecodeDeviceQuery() {
  return `deviceId=${encodeURIComponent(getLifecodeDeviceId())}`;
}

export async function fetchLifecodeSession() {
  const r = await fetch(`/api/lifecode/session?${lifecodeDeviceQuery()}`, {
    credentials: 'include',
  });
  return r.json().catch(() => ({}));
}

/** @param {string} path e.g. /api/lifecode/clients */
export async function lifecodeApi(path, { method = 'GET', body } = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${path}${sep}${lifecodeDeviceQuery()}`;
  const r = await fetch(url, {
    method,
    credentials: 'include',
    headers: body != null ? { 'Content-Type': 'application/json' } : undefined,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}
