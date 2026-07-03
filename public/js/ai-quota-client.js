/**
 * AI 크레딧 API 클라이언트 (점성학·네임코드)
 */
(function (global) {
  const SB_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co';
  const SB_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1';
  const DEFAULT_MODEL = 'claude-sonnet-4-6';

  function getClient() {
    const g = global.supabase || globalThis.supabase;
    if (!g || typeof g.createClient !== 'function') return null;
    return g.createClient(SB_URL, SB_KEY);
  }

  async function authHeaders() {
    const sb = getClient();
    if (!sb) throw new Error('no_supabase');
    const { data } = await sb.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('login_required');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  function hashKey(text) {
    const s = String(text || '');
    let h = 5381;
    for (let i = 0; i < s.length; i += 1) {
      h = ((h << 5) + h) ^ s.charCodeAt(i);
    }
    return `k${(h >>> 0).toString(16)}`;
  }

  async function fetchQuota() {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/ai/quota', { headers });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async function fetchStatus() {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/ai/status', { headers });
      if (!res.ok) return { available: false };
      return res.json();
    } catch {
      try {
        const res = await fetch('/api/ai/status');
        return res.ok ? res.json() : { available: false };
      } catch {
        return { available: false };
      }
    }
  }

  function formatQuotaLine(quota) {
    if (!quota || quota.limit == null) return '';
    const rem = quota.remaining != null ? quota.remaining : Math.max(0, quota.limit - (quota.used || 0));
    return `이번 달 AI ${rem}/${quota.limit}크레딧`;
  }

  function applyQuotaBadge(el, quota) {
    if (!el) return;
    const line = formatQuotaLine(quota);
    if (!line) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = line;
  }

  function extractText(data) {
    return (data?.content || []).map((i) => i.text || '').join('').trim();
  }

  function quotaFromResponse(data) {
    return data?._palja?.quota || null;
  }

  async function callAi({ feature, cacheKey, model, max_tokens, messages }) {
    const headers = await authHeaders();
    const res = await fetch('/api/ai/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        feature,
        cacheKey: cacheKey || undefined,
        model: model || DEFAULT_MODEL,
        max_tokens,
        messages,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `AI 요청 실패(${res.status})`);
      err.status = res.status;
      err.code = data.code;
      err.quota = data.quota;
      throw err;
    }
    return {
      data,
      text: extractText(data),
      quota: quotaFromResponse(data),
      cached: !!data?._palja?.cached,
      stopReason: data?.stop_reason || null,
    };
  }

  global.PaljaAiQuota = {
    DEFAULT_MODEL,
    hashKey,
    authHeaders,
    fetchQuota,
    fetchStatus,
    formatQuotaLine,
    applyQuotaBadge,
    callAi,
    extractText,
  };
})(typeof window !== 'undefined' ? window : globalThis);
