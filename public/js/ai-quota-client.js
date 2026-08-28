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
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    if (global.PaljaDevice && typeof global.PaljaDevice.getDeviceId === 'function') {
      headers['X-Device-Id'] = global.PaljaDevice.getDeviceId();
    } else {
      try {
        let id = localStorage.getItem('lifecode_device_id');
        if (!id) {
          id = crypto.randomUUID();
          localStorage.setItem('lifecode_device_id', id);
        }
        headers['X-Device-Id'] = id;
      } catch (_) {}
    }
    return headers;
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
    if (quota.counselorTrial) {
      return `체험 AI ${rem}/${quota.limit}크레딧`;
    }
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

  async function callAi({ feature, cacheKey, model, max_tokens, messages, payload }) {
    const headers = await authHeaders();
    const body = {
      feature,
      cacheKey: cacheKey || undefined,
      model: model || DEFAULT_MODEL,
      max_tokens,
      stream: false,
    };
    if (payload != null) body.payload = payload;
    else body.messages = messages;
    const res = await fetch('/api/ai/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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

  /**
   * SSE 스트리밍. onDelta(chunk)로 조각 수신.
   * 실패 시 throw (err.quota 가능).
   */
  async function callAiStream({ feature, cacheKey, cacheKeyRaw, model, max_tokens, messages, payload, onDelta, continuePartial }) {
    const headers = await authHeaders();
    headers.Accept = 'text/event-stream';
    const body = {
      feature,
      cacheKey: cacheKey || undefined,
      model: model || DEFAULT_MODEL,
      max_tokens,
      stream: true,
    };
    if (cacheKeyRaw) body.cacheKeyRaw = cacheKeyRaw;
    if (payload != null) body.payload = payload;
    else body.messages = messages;
    if (continuePartial) body.continuePartial = continuePartial;
    const res = await fetch('/api/ai/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const ct = String(res.headers.get('content-type') || '');
    if (!ct.includes('text/event-stream')) {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || `AI 요청 실패(${res.status})`);
        err.status = res.status;
        err.code = data.code;
        err.quota = data.quota || data._palja?.quota;
        throw err;
      }
      const text = extractText(data);
      if (text && typeof onDelta === 'function') onDelta(text);
      return {
        data,
        text,
        quota: quotaFromResponse(data),
        cached: !!data?._palja?.cached,
        stopReason: data?.stop_reason || null,
      };
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err = new Error(data.error || `AI 요청 실패(${res.status})`);
      err.status = res.status;
      err.code = data.code;
      err.quota = data.quota;
      throw err;
    }

    const reader = res.body && res.body.getReader ? res.body.getReader() : null;
    if (!reader) {
      throw new Error('이 브라우저에서는 스트리밍을 지원하지 않습니다.');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let donePayload = null;
    let streamError = null;
    let eventName = 'message';
    let doneReceived = false;
    let deltaReceived = false;

    function handleEvent(name, raw) {
      if (!raw) return;
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch (_) {
        return;
      }
      if (name === 'delta' && payload && payload.text) {
        deltaReceived = true;
        fullText += payload.text;
        if (typeof onDelta === 'function') onDelta(payload.text);
      } else if (name === 'done') {
        doneReceived = true;
        donePayload = payload;
        if (payload && payload.content && !fullText) {
          fullText = extractText(payload);
        }
      } else if (name === 'error') {
        streamError = payload || { error: 'stream_error' };
      }
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() || '';
      for (const rawLine of parts) {
        const line = rawLine.replace(/\r$/, '');
        if (!line) {
          eventName = 'message';
          continue;
        }
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim() || 'message';
          continue;
        }
        if (line.startsWith('data:')) {
          handleEvent(eventName, line.slice(5).trim());
          eventName = 'message';
        }
      }
    }

    if (streamError) {
      if (fullText.trim()) {
        const partialData = {
          content: [{ type: 'text', text: fullText }],
          stop_reason: 'stream_cut',
          _palja: { incomplete: true },
        };
        return {
          data: partialData,
          text: fullText,
          quota: quotaFromResponse(partialData),
          cached: false,
          stopReason: 'stream_cut',
          streamIncomplete: true,
          doneReceived: false,
        };
      }
      const err = new Error(streamError.error || 'AI 스트리밍에 실패했습니다.');
      err.status = streamError.status || 502;
      err.code = streamError.code;
      err.quota = streamError.quota;
      throw err;
    }

    const data = donePayload || {
      content: [{ type: 'text', text: fullText }],
      stop_reason: doneReceived ? 'end_turn' : 'stream_cut',
    };
    if (!fullText) fullText = extractText(data);
    const streamIncomplete = !doneReceived && !!deltaReceived;

    return {
      data,
      text: fullText,
      quota: quotaFromResponse(data),
      cached: !!data?._palja?.cached,
      stopReason: data?.stop_reason || null,
      streamIncomplete,
      doneReceived,
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
    callAiStream,
    extractText,
  };
})(typeof window !== 'undefined' ? window : globalThis);
