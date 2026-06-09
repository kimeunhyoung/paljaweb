const crypto = require('crypto');

function naverConfigured() {
  return !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

function stateSecret() {
  return process.env.NAVER_STATE_SECRET || process.env.SUPABASE_JWT_SECRET || 'palja-naver-dev';
}

function signState(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', stateSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyState(state) {
  if (!state || typeof state !== 'string') return null;
  const i = state.lastIndexOf('.');
  if (i <= 0) return null;
  const data = state.slice(0, i);
  const sig = state.slice(i + 1);
  const expected = crypto.createHmac('sha256', stateSecret()).update(data).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function readSafeNext(raw) {
  if (!raw || typeof raw !== 'string') return '/dashboard.html';
  const n = decodeURIComponent(raw).trim();
  if (!n || n.includes('..') || n.startsWith('//') || /^https?:/i.test(n)) return '/dashboard.html';
  return n.startsWith('/') ? n : `/${n}`;
}

function naverRedirectUri(req) {
  if (process.env.NAVER_REDIRECT_URI) return process.env.NAVER_REDIRECT_URI;
  const host = req.get('x-forwarded-host') || req.get('host') || '8code.kr';
  const proto = req.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}/api/auth/naver/callback`;
}

function supabaseAdminHeaders(serviceKey, extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function exchangeNaverToken(code, state, redirectUri) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.NAVER_CLIENT_ID,
    client_secret: process.env.NAVER_CLIENT_SECRET,
    redirect_uri: redirectUri,
    code: String(code),
    state: String(state),
  });
  const res = await fetch(`https://nid.naver.com/oauth2.0/token?${params.toString()}`, { method: 'POST' });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error_description || json.error || 'naver token exchange failed');
  }
  return json;
}

async function fetchNaverProfile(accessToken) {
  const res = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok || json.resultcode !== '00' || !json.response?.id) {
    throw new Error(json.message || 'naver profile fetch failed');
  }
  return json.response;
}

async function ensureSupabaseUser(profile) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const naverId = String(profile.id);
  const email = (profile.email && String(profile.email).trim()) || `naver_${naverId}@oauth.8code.kr`;
  const name = profile.name || profile.nickname || '네이버 사용자';
  const avatar = profile.profile_image || null;

  const createRes = await fetch(`${base}/auth/v1/admin/users`, {
    method: 'POST',
    headers: supabaseAdminHeaders(key),
    body: JSON.stringify({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        name,
        avatar_url: avatar,
        naver_id: naverId,
      },
      app_metadata: {
        provider: 'naver',
        providers: ['naver'],
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    if (!/already|exists|duplicate|registered/i.test(errText)) {
      throw new Error(`supabase create user ${createRes.status}: ${errText}`);
    }
  }

  return email;
}

async function createMagicLinkSession(email, redirectTo) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${base}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: supabaseAdminHeaders(key),
    body: JSON.stringify({
      type: 'magiclink',
      email,
      options: { redirect_to: redirectTo },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.msg || json.message || `generate_link ${res.status}`);
  }
  const actionLink = json.action_link || json?.properties?.action_link;
  if (!actionLink) throw new Error('missing action_link from supabase');
  return actionLink;
}

function registerNaverAuthRoutes(app) {
  app.get('/api/auth/naver', (req, res) => {
    if (!naverConfigured()) {
      res.redirect('/login.html?error=' + encodeURIComponent('네이버 로그인 설정이 아직 완료되지 않았습니다.'));
      return;
    }
    const next = readSafeNext(req.query.next);
    const statePayload = signState({ n: crypto.randomBytes(12).toString('hex'), next });
    const redirectUri = naverRedirectUri(req);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.NAVER_CLIENT_ID,
      redirect_uri: redirectUri,
      state: statePayload,
    });
    res.redirect(`https://nid.naver.com/oauth2.0/authorize?${params.toString()}`);
  });

  app.get('/api/auth/naver/callback', async (req, res) => {
    if (!naverConfigured()) {
      res.redirect('/login.html?error=' + encodeURIComponent('네이버 로그인 설정이 아직 완료되지 않았습니다.'));
      return;
    }
    const { code, state, error, error_description: errorDescription } = req.query;
    if (error) {
      res.redirect('/login.html?error=' + encodeURIComponent(String(errorDescription || error)));
      return;
    }
    const stateData = verifyState(state);
    if (!code || !stateData) {
      res.redirect('/login.html?error=' + encodeURIComponent('네이버 로그인 상태 확인에 실패했습니다.'));
      return;
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      res.redirect('/login.html?error=' + encodeURIComponent('서버 Supabase 설정이 필요합니다.'));
      return;
    }

    try {
      const redirectUri = naverRedirectUri(req);
      const token = await exchangeNaverToken(code, state, redirectUri);
      const profile = await fetchNaverProfile(token.access_token);
      const email = await ensureSupabaseUser(profile);
      const host = req.get('x-forwarded-host') || req.get('host') || '8code.kr';
      const proto = req.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      const origin = `${proto}://${host}`;
      const next = readSafeNext(stateData.next);
      const actionLink = await createMagicLinkSession(email, `${origin}${next}`);
      res.redirect(actionLink);
    } catch (e) {
      console.error('[naver-auth]', e);
      res.redirect('/login.html?error=' + encodeURIComponent('네이버 로그인에 실패했습니다.'));
    }
  });
}

module.exports = { registerNaverAuthRoutes, naverConfigured };
