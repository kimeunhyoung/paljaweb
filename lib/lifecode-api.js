const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const COOKIE_NAME = () => process.env.LIFECODE_COOKIE_NAME || 'lifecode_session';
const SESSION_DAYS = () => Math.max(1, Number(process.env.LIFECODE_SESSION_DAYS) || 30);

const activateAttempts = new Map();

function lifecodeConfigured() {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.LIFECODE_CODE_PEPPER &&
    process.env.LIFECODE_JWT_SECRET
  );
}

function adminConfigured() {
  return !!process.env.LIFECODE_ADMIN_SECRET;
}

function supabaseBase() {
  return process.env.SUPABASE_URL.replace(/\/$/, '');
}

function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function sbHeaders(extra = {}) {
  const key = serviceKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '');
}

function hashCode(normalized) {
  const pepper = process.env.LIFECODE_CODE_PEPPER || '';
  return crypto.createHash('sha256').update(pepper + normalized, 'utf8').digest('hex');
}

function codeHintFromNormalized(normalized) {
  if (normalized.length <= 4) return '****';
  const tail = normalized.slice(-4);
  if (normalized.startsWith('LC')) return `LC-****-${tail}`;
  return `****-${tail}`;
}

function formatDisplayCode(normalized) {
  if (normalized.length <= 8) return normalized;
  if (normalized.startsWith('LC') && normalized.length >= 10) {
    return `LC-${normalized.slice(2, 6)}-${normalized.slice(6, 10)}`.replace(/-$/, '');
  }
  return normalized;
}

function generateLicenseCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'LC';
  for (let i = 0; i < 8; i += 1) {
    s += chars[crypto.randomInt(0, chars.length)];
  }
  return formatDisplayCode(s);
}

function isLicenseExpired(row) {
  if (!row?.expires_at) return false;
  return new Date(row.expires_at).getTime() < Date.now();
}

function normalizeProductTier(tier) {
  const t = String(tier || 'basic').toLowerCase();
  return t === 'counselor' ? 'counselor' : 'basic';
}

function hasCounselorHub(row) {
  return normalizeProductTier(row?.product_tier) === 'counselor';
}

function licenseToPublic(row) {
  const productTier = normalizeProductTier(row?.product_tier);
  return {
    id: row.id,
    codeHint: row.code_hint,
    status: row.status,
    productTier,
    counselorHub: productTier === 'counselor',
    expiresAt: row.expires_at,
    deviceBound: !!row.device_id,
    deviceBoundAt: row.device_bound_at,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at,
  };
}

function clientToPublic(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    legalName: row.legal_name,
    birthDate: row.birth_date,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

async function sbFetch(path, options = {}) {
  const url = `${supabaseBase()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: sbHeaders(options.headersExtra),
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { res, data };
}

async function getLicenseByHash(codeHash) {
  const { res, data } = await sbFetch(
    `/rest/v1/lifecode_licenses?code_hash=eq.${encodeURIComponent(codeHash)}&limit=1`,
  );
  if (!res.ok) throw new Error(`license fetch ${res.status}`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function getLicenseById(id) {
  const { res, data } = await sbFetch(
    `/rest/v1/lifecode_licenses?id=eq.${encodeURIComponent(id)}&limit=1`,
  );
  if (!res.ok) throw new Error(`license fetch ${res.status}`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function patchLicense(id, fields) {
  const { res, data } = await sbFetch(
    `/rest/v1/lifecode_licenses?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headersExtra: { Prefer: 'return=minimal' },
      body: JSON.stringify(fields),
    },
  );
  if (!res.ok) {
    throw new Error(`license patch ${res.status}: ${JSON.stringify(data)}`);
  }
}

async function insertLicense(row) {
  const { res, data } = await sbFetch('/rest/v1/lifecode_licenses', {
    method: 'POST',
    headersExtra: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    throw new Error(`license insert ${res.status}: ${JSON.stringify(data)}`);
  }
  return Array.isArray(data) ? data[0] : data;
}

async function deleteLicense(id) {
  const { res } = await sbFetch(`/rest/v1/lifecode_licenses?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headersExtra: { Prefer: 'return=minimal' },
  });
  if (!res.ok) throw new Error(`license delete ${res.status}`);
}

async function insertAccessLog(licenseId, event, deviceId, detail) {
  await sbFetch('/rest/v1/lifecode_access_log', {
    method: 'POST',
    headersExtra: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      license_id: licenseId || null,
      event,
      device_id: deviceId || null,
      detail: detail || null,
    }),
  }).catch((e) => console.warn('[lifecode] log failed', e.message));
}

function signSession(licenseId, deviceId) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS() * 86400;
  return jwt.sign({ sub: licenseId, did: deviceId, exp }, process.env.LIFECODE_JWT_SECRET, {
    algorithm: 'HS256',
  });
}

function readSessionToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const name = COOKIE_NAME();
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function verifySessionToken(token) {
  try {
    return jwt.verify(token, process.env.LIFECODE_JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  const maxAge = SESSION_DAYS() * 86400;
  const parts = [
    `${COOKIE_NAME()}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (isProd()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  const parts = [`${COOKIE_NAME()}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isProd()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function isProd() {
  return process.env.NODE_ENV === 'production';
}

function validDeviceId(deviceId) {
  const s = String(deviceId || '').trim();
  return s.length >= 8 && s.length <= 128;
}

function checkActivateRateLimit(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const max = 15;
  let bucket = activateAttempts.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    activateAttempts.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= max;
}

function getAdminSecret(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return req.headers['x-lifecode-admin'] || null;
}

function requireAdmin(req, res) {
  if (!adminConfigured()) {
    res.status(503).json({ error: 'admin_not_configured' });
    return false;
  }
  if (getAdminSecret(req) !== process.env.LIFECODE_ADMIN_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

function isSessionRevokedByRotation(row, jwtPayload) {
  if (!row?.code_rotated_at || !jwtPayload?.iat) return false;
  return jwtPayload.iat * 1000 < new Date(row.code_rotated_at).getTime();
}

async function validateLicenseRow(row, deviceId, jwtPayload = null) {
  if (!row) return { ok: false, error: 'invalid_code' };
  if (row.status === 'revoked') return { ok: false, error: 'revoked' };
  if (isLicenseExpired(row)) return { ok: false, error: 'expired' };
  if (jwtPayload && isSessionRevokedByRotation(row, jwtPayload)) {
    return { ok: false, error: 'session_revoked' };
  }
  if (row.device_id && row.device_id !== deviceId) {
    return { ok: false, error: 'device_mismatch' };
  }
  return { ok: true };
}

async function regenerateLicenseCode(licenseId) {
  const row = await getLicenseById(licenseId);
  if (!row) return null;

  let normalized;
  let codeHash;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    normalized = normalizeCode(generateLicenseCode());
    codeHash = hashCode(normalized);
    const existing = await getLicenseByHash(codeHash);
    if (!existing || existing.id === licenseId) break;
  }

  const nowIso = new Date().toISOString();
  const fields = {
    code_hash: codeHash,
    code_hint: codeHintFromNormalized(normalized),
    device_id: null,
    device_bound_at: null,
    code_rotated_at: nowIso,
  };
  try {
    await patchLicense(licenseId, fields);
  } catch (e) {
    if (!String(e.message).includes('code_rotated_at')) throw e;
    delete fields.code_rotated_at;
    await patchLicense(licenseId, fields);
  }
  await insertAccessLog(licenseId, 'code_regenerate', null, 'admin');

  return {
    normalized,
    display: formatDisplayCode(normalized),
    hint: codeHintFromNormalized(normalized),
  };
}

const lastSeenThrottle = new Map();

async function touchLastSeen(licenseId) {
  const now = Date.now();
  const prev = lastSeenThrottle.get(licenseId) || 0;
  if (now - prev < 5 * 60_000) return;
  lastSeenThrottle.set(licenseId, now);
  await patchLicense(licenseId, { last_seen_at: new Date().toISOString() });
}

function sessionDeviceId(req) {
  const fromQuery = req.query.deviceId ? String(req.query.deviceId) : '';
  const fromBody = req.body?.deviceId ? String(req.body.deviceId) : '';
  return fromQuery || fromBody;
}

async function requireLifecodeSession(req, res) {
  if (!lifecodeConfigured()) {
    res.status(503).json({ error: 'server_not_configured' });
    return null;
  }
  const deviceId = sessionDeviceId(req);
  const payload = verifySessionToken(readSessionToken(req));
  if (!payload?.sub) {
    res.status(401).json({ error: 'no_session' });
    return null;
  }
  if (deviceId && payload.did !== deviceId) {
    res.status(401).json({ error: 'device_mismatch' });
    return null;
  }
  try {
    const row = await getLicenseById(payload.sub);
    const check = await validateLicenseRow(row, payload.did, payload);
    if (!check.ok) {
      clearSessionCookie(res);
      res.status(401).json({ error: check.error });
      return null;
    }
    return { payload, row, licenseId: row.id, deviceId: payload.did };
  } catch (e) {
    console.error('[lifecode] session resolve', e);
    res.status(500).json({ error: 'server_error' });
    return null;
  }
}

function requireCounselorHub(sessionCtx, res) {
  if (!hasCounselorHub(sessionCtx.row)) {
    res.status(403).json({ error: 'counselor_hub_not_included' });
    return false;
  }
  return true;
}

async function getLifecodeClient(licenseId, clientId) {
  const { res, data } = await sbFetch(
    `/rest/v1/lifecode_clients?id=eq.${encodeURIComponent(clientId)}&license_id=eq.${encodeURIComponent(licenseId)}&limit=1`,
  );
  if (!res.ok) throw new Error(`client fetch ${res.status}`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

function registerLifecodeRoutes(app, deps = {}) {
  const { portoneConfigured, portonePublicConfig, portoneOneTimePublicConfig } = deps;
  registerLifecodeRoutesImpl(app);
  if (portoneConfigured && portonePublicConfig) {
    const { registerLifecodeOneTimeRoutes } = require('./lifecode-one-time');
    registerLifecodeOneTimeRoutes(app, {
      portoneConfigured,
      portonePublicConfig,
      portoneOneTimePublicConfig,
      lifecodeConfigured,
    });
  }
}

function registerLifecodeRoutesImpl(app) {
  app.post('/api/lifecode/activate', async (req, res) => {
    if (!lifecodeConfigured()) {
      res.status(503).json({ error: 'server_not_configured' });
      return;
    }
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
    if (!checkActivateRateLimit(ip)) {
      res.status(429).json({ error: 'too_many_attempts' });
      return;
    }

    const { code, deviceId } = req.body || {};
    if (!code || !validDeviceId(deviceId)) {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }

    try {
      const normalized = normalizeCode(code);
      const row = await getLicenseByHash(hashCode(normalized));
      if (!row) {
        await insertAccessLog(null, 'activate_denied_invalid', deviceId, 'no match');
        res.status(401).json({ error: 'invalid_code' });
        return;
      }

      if (row.status === 'revoked') {
        await insertAccessLog(row.id, 'activate_denied_revoked', deviceId);
        res.status(403).json({ error: 'revoked' });
        return;
      }
      if (isLicenseExpired(row)) {
        await insertAccessLog(row.id, 'activate_denied_expired', deviceId);
        res.status(403).json({ error: 'expired' });
        return;
      }
      if (row.device_id && row.device_id !== deviceId) {
        await insertAccessLog(row.id, 'activate_denied_device', deviceId);
        res.status(403).json({ error: 'device_mismatch' });
        return;
      }

      const nowIso = new Date().toISOString();
      if (!row.device_id) {
        await patchLicense(row.id, {
          device_id: deviceId,
          device_bound_at: nowIso,
          last_seen_at: nowIso,
        });
      } else {
        await patchLicense(row.id, { last_seen_at: nowIso });
      }

      const token = signSession(row.id, deviceId);
      setSessionCookie(res, token);
      await insertAccessLog(row.id, 'activate_ok', deviceId);

      res.json({
        ok: true,
        licenseId: row.id,
        expiresAt: row.expires_at,
        productTier: normalizeProductTier(row.product_tier),
        counselorHub: hasCounselorHub(row),
      });
    } catch (e) {
      console.error('[lifecode] activate', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.get('/api/lifecode/session', async (req, res) => {
    if (!lifecodeConfigured()) {
      res.status(503).json({ ok: false, error: 'server_not_configured' });
      return;
    }

    const deviceId = req.query.deviceId ? String(req.query.deviceId) : '';
    const payload = verifySessionToken(readSessionToken(req));
    if (!payload?.sub) {
      res.status(401).json({ ok: false, error: 'no_session' });
      return;
    }

    if (deviceId && payload.did !== deviceId) {
      await insertAccessLog(payload.sub, 'session_denied', deviceId, 'device mismatch');
      res.status(401).json({ ok: false, error: 'device_mismatch' });
      return;
    }

    try {
      const row = await getLicenseById(payload.sub);
      const check = await validateLicenseRow(row, payload.did, payload);
      if (!check.ok) {
        await insertAccessLog(row?.id, 'session_denied', payload.did, check.error);
        clearSessionCookie(res);
        res.status(401).json({ ok: false, error: check.error });
        return;
      }

      await touchLastSeen(row.id);
      await insertAccessLog(row.id, 'session_ok', payload.did);
      res.json({
        ok: true,
        licenseId: row.id,
        expiresAt: row.expires_at,
        bound: !!row.device_id,
        productTier: normalizeProductTier(row.product_tier),
        counselorHub: hasCounselorHub(row),
      });
    } catch (e) {
      console.error('[lifecode] session', e);
      res.status(500).json({ ok: false, error: 'server_error' });
    }
  });

  app.post('/api/lifecode/logout', async (req, res) => {
    const payload = verifySessionToken(readSessionToken(req));
    if (payload?.sub) {
      await insertAccessLog(payload.sub, 'logout', payload.did);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/lifecode/clients', async (req, res) => {
    const ctx = await requireLifecodeSession(req, res);
    if (!ctx || !requireCounselorHub(ctx, res)) return;
    try {
      const { res: sbRes, data } = await sbFetch(
        `/rest/v1/lifecode_clients?license_id=eq.${encodeURIComponent(ctx.licenseId)}&select=id,display_name,legal_name,birth_date,notes,updated_at&order=updated_at.desc`,
      );
      if (!sbRes.ok) {
        if (String(data).includes('lifecode_clients') || sbRes.status === 404) {
          res.status(503).json({
            error: 'db_migration_required',
            hint: 'database/lifecode_clients.sql 실행',
          });
          return;
        }
        res.status(502).json({ error: 'db_error' });
        return;
      }
      res.json({ items: (data || []).map(clientToPublic) });
    } catch (e) {
      console.error('[lifecode] clients list', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.post('/api/lifecode/clients', async (req, res) => {
    const ctx = await requireLifecodeSession(req, res);
    if (!ctx || !requireCounselorHub(ctx, res)) return;
    const { displayName, legalName, birthDate, notes } = req.body || {};
    if (!displayName || !birthDate) {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }
    try {
      const { res: sbRes, data } = await sbFetch('/rest/v1/lifecode_clients', {
        method: 'POST',
        headersExtra: { Prefer: 'return=representation' },
        body: JSON.stringify({
          license_id: ctx.licenseId,
          display_name: String(displayName).trim(),
          legal_name: legalName ? String(legalName).trim() : null,
          birth_date: birthDate,
          notes: notes ? String(notes).trim() : null,
        }),
      });
      if (!sbRes.ok) {
        res.status(502).json({ error: 'db_error', detail: data });
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      res.status(201).json({ ok: true, client: clientToPublic(row) });
    } catch (e) {
      console.error('[lifecode] clients create', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.patch('/api/lifecode/clients/:id', async (req, res) => {
    const ctx = await requireLifecodeSession(req, res);
    if (!ctx || !requireCounselorHub(ctx, res)) return;
    const { displayName, legalName, birthDate, notes } = req.body || {};
    if (!displayName || !birthDate) {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }
    try {
      const existing = await getLifecodeClient(ctx.licenseId, req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const { res: sbRes, data } = await sbFetch(
        `/rest/v1/lifecode_clients?id=eq.${encodeURIComponent(req.params.id)}&license_id=eq.${encodeURIComponent(ctx.licenseId)}`,
        {
          method: 'PATCH',
          headersExtra: { Prefer: 'return=representation' },
          body: JSON.stringify({
            display_name: String(displayName).trim(),
            legal_name: legalName ? String(legalName).trim() : null,
            birth_date: birthDate,
            notes: notes ? String(notes).trim() : null,
          }),
        },
      );
      if (!sbRes.ok) {
        res.status(502).json({ error: 'db_error', detail: data });
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      res.json({ ok: true, client: clientToPublic(row) });
    } catch (e) {
      console.error('[lifecode] clients patch', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.delete('/api/lifecode/clients/:id', async (req, res) => {
    const ctx = await requireLifecodeSession(req, res);
    if (!ctx || !requireCounselorHub(ctx, res)) return;
    try {
      const existing = await getLifecodeClient(ctx.licenseId, req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const { res: sbRes } = await sbFetch(
        `/rest/v1/lifecode_clients?id=eq.${encodeURIComponent(req.params.id)}&license_id=eq.${encodeURIComponent(ctx.licenseId)}`,
        { method: 'DELETE', headersExtra: { Prefer: 'return=minimal' } },
      );
      if (!sbRes.ok) {
        res.status(502).json({ error: 'db_error' });
        return;
      }
      res.json({ ok: true });
    } catch (e) {
      console.error('[lifecode] clients delete', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.get('/api/lifecode/clients/:id', async (req, res) => {
    const ctx = await requireLifecodeSession(req, res);
    if (!ctx || !requireCounselorHub(ctx, res)) return;
    try {
      const row = await getLifecodeClient(ctx.licenseId, req.params.id);
      if (!row) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json({ client: clientToPublic(row) });
    } catch (e) {
      console.error('[lifecode] clients get', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.get('/api/lifecode/admin/licenses', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    if (!lifecodeConfigured()) {
      res.status(503).json({ error: 'server_not_configured' });
      return;
    }

    try {
      const status = String(req.query.status || 'all');
      const q = String(req.query.q || '').trim();
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const offset = Math.max(0, Number(req.query.offset) || 0);

      let path =
        '/rest/v1/lifecode_licenses?select=id,code_hint,status,product_tier,expires_at,device_id,device_bound_at,note,created_at,updated_at,last_seen_at';
      path += '&order=created_at.desc';
      if (status === 'active' || status === 'revoked') {
        path += `&status=eq.${status}`;
      }
      if (q) {
        const enc = encodeURIComponent(`%${q}%`);
        path += `&or=(note.ilike.${enc},code_hint.ilike.${enc})`;
      }
      path += `&limit=${limit}&offset=${offset}`;

      const { res: sbRes, data } = await sbFetch(path, {
        headersExtra: { Prefer: 'count=exact' },
      });
      if (!sbRes.ok) {
        res.status(502).json({ error: 'db_error', detail: data });
        return;
      }

      const range = sbRes.headers.get('content-range') || '';
      const totalMatch = range.match(/\/(\d+)$/);
      const total = totalMatch ? Number(totalMatch[1]) : (Array.isArray(data) ? data.length : 0);

      res.json({
        items: (data || []).map(licenseToPublic),
        total,
      });
    } catch (e) {
      console.error('[lifecode] admin list', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.post('/api/lifecode/admin/licenses', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    if (!lifecodeConfigured()) {
      res.status(503).json({ error: 'server_not_configured' });
      return;
    }

    try {
      const body = req.body || {};
      const plain = body.code ? normalizeCode(body.code) : normalizeCode(generateLicenseCode());
      if (plain.length < 6) {
        res.status(400).json({ error: 'invalid_code' });
        return;
      }

      const product_tier = normalizeProductTier(body.productTier);
      const row = await insertLicense({
        code_hash: hashCode(plain),
        code_hint: codeHintFromNormalized(plain),
        status: 'active',
        expires_at: body.expiresAt || null,
        note: body.note || null,
        product_tier,
      });

      res.status(201).json({
        id: row.id,
        code: formatDisplayCode(plain),
        codeHint: row.code_hint,
        productTier: normalizeProductTier(row.product_tier),
        counselorHub: hasCounselorHub(row),
        expiresAt: row.expires_at,
        note: row.note,
      });
    } catch (e) {
      console.error('[lifecode] admin create', e);
      if (String(e.message).includes('409') || String(e.message).includes('duplicate')) {
        res.status(409).json({ error: 'duplicate_code' });
        return;
      }
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.get('/api/lifecode/admin/licenses/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const row = await getLicenseById(req.params.id);
      if (!row) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const { res: logRes, data: logs } = await sbFetch(
        `/rest/v1/lifecode_access_log?license_id=eq.${encodeURIComponent(row.id)}&order=created_at.desc&limit=20`,
      );
      res.json({
        license: licenseToPublic(row),
        logs: logRes.ok ? logs : [],
      });
    } catch (e) {
      console.error('[lifecode] admin get', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.patch('/api/lifecode/admin/licenses/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const row = await getLicenseById(req.params.id);
      if (!row) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const body = req.body || {};
      const fields = {};
      if (body.note !== undefined) fields.note = body.note;
      if (body.status !== undefined) {
        if (!['active', 'revoked'].includes(body.status)) {
          res.status(400).json({ error: 'invalid_status' });
          return;
        }
        fields.status = body.status;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'expiresAt')) {
        fields.expires_at = body.expiresAt;
      }
      if (body.productTier !== undefined) {
        fields.product_tier = normalizeProductTier(body.productTier);
      }
      if (!Object.keys(fields).length) {
        res.status(400).json({ error: 'nothing_to_update' });
        return;
      }
      await patchLicense(row.id, fields);
      const updated = await getLicenseById(row.id);
      res.json({ ok: true, license: licenseToPublic(updated) });
    } catch (e) {
      console.error('[lifecode] admin patch', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.post('/api/lifecode/admin/licenses/:id/revoke', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const row = await getLicenseById(req.params.id);
      if (!row) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      await patchLicense(row.id, { status: 'revoked' });
      res.json({ ok: true, status: 'revoked' });
    } catch (e) {
      console.error('[lifecode] revoke', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.post('/api/lifecode/admin/licenses/:id/unrevoke', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const row = await getLicenseById(req.params.id);
      if (!row) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      await patchLicense(row.id, { status: 'active' });
      res.json({ ok: true, status: 'active' });
    } catch (e) {
      console.error('[lifecode] unrevoke', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.post('/api/lifecode/admin/licenses/:id/regenerate-code', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    if (!lifecodeConfigured()) {
      res.status(503).json({ error: 'server_not_configured' });
      return;
    }
    try {
      const result = await regenerateLicenseCode(req.params.id);
      if (!result) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json({
        ok: true,
        code: result.display,
        codeHint: result.hint,
        message: '이전 코드는 사용할 수 없습니다. 새 코드를 구매자에게 전달하세요.',
      });
    } catch (e) {
      console.error('[lifecode] regenerate-code', e);
      if (String(e.message).includes('code_rotated_at')) {
        res.status(503).json({
          error: 'db_migration_required',
          hint: 'Supabase에서 database/lifecode_code_rotated_at.sql 실행',
        });
        return;
      }
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.post('/api/lifecode/admin/licenses/:id/reset-device', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const row = await getLicenseById(req.params.id);
      if (!row) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      await patchLicense(row.id, { device_id: null, device_bound_at: null });
      await insertAccessLog(row.id, 'device_reset', null, 'admin');
      res.json({ ok: true });
    } catch (e) {
      console.error('[lifecode] reset-device', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.delete('/api/lifecode/admin/licenses/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      await deleteLicense(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      console.error('[lifecode] delete', e);
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.get('/api/lifecode/admin/licenses/:id/logs', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const { res: logRes, data } = await sbFetch(
        `/rest/v1/lifecode_access_log?license_id=eq.${encodeURIComponent(req.params.id)}&order=created_at.desc&limit=${limit}`,
      );
      if (!logRes.ok) {
        res.status(502).json({ error: 'db_error' });
        return;
      }
      res.json({ items: data || [] });
    } catch (e) {
      console.error('[lifecode] logs', e);
      res.status(500).json({ error: 'server_error' });
    }
  });
}

module.exports = { registerLifecodeRoutes, lifecodeConfigured };
