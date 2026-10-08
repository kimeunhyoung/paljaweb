/**
 * 질문점·내 차트로 묻기 → counselor_clients 연결
 * service role fetch 헬퍼는 호출측에서 넘김 (prashna/natal-ask fetch 형태가 다름)
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {string} userId
 * @param {string} clientIdRaw
 * @param {(path: string) => Promise<{ ok: boolean, data: any }>} getJson
 * @returns {Promise<{ id: string, label: string } | null>}
 */
async function resolveOwnedClient(userId, clientIdRaw, getJson) {
  const clientId = String(clientIdRaw || '').trim();
  if (!userId || !UUID_RE.test(clientId)) return null;
  const path =
    '/rest/v1/counselor_clients?id=eq.' +
    encodeURIComponent(clientId) +
    '&counselor_id=eq.' +
    encodeURIComponent(userId) +
    '&select=id,display_name,legal_name&limit=1';
  try {
    const { ok, data } = await getJson(path);
    if (!ok || !Array.isArray(data) || !data[0]) return null;
    const row = data[0];
    const label = String(row.display_name || row.legal_name || '').trim().slice(0, 80);
    return { id: row.id, label: label || null };
  } catch (e) {
    console.error('[counselor-ask-link] resolve', e);
    return null;
  }
}

function askModeLabel(category) {
  const c = String(category || '');
  if (c.indexOf('natal:') === 0) return '내 차트로 묻기';
  return '질문점';
}

module.exports = { resolveOwnedClient, askModeLabel, UUID_RE };
