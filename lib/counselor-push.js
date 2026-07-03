/**
 * 상담사 허브 — 웹 푸시(오전 일정 알림) + 크론 발송
 * 환경 변수: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…)
 */
const webpush = require('web-push');

function supabaseBase() {
  return (process.env.SUPABASE_URL || '').replace(/\/$/, '');
}

function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
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

function todayKstYmd() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function vapidConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureVapid() {
  if (!vapidConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:ohayou989@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  return true;
}

async function sbGet(path, query = '') {
  const base = supabaseBase();
  const key = serviceKey();
  if (!base || !key) throw new Error('Supabase not configured');
  const url = `${base}/rest/v1/${path}${query ? `?${query}` : ''}`;
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase GET ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

async function isProfessionalUser(userId) {
  const rows = await sbGet('profiles', `id=eq.${encodeURIComponent(userId)}&select=plan,plan_active_until`);
  const profile = rows[0];
  if (!profile || profile.plan !== 'professional') return false;
  if (profile.plan_active_until && new Date(profile.plan_active_until) <= new Date()) return false;
  return true;
}

async function getTodayAppointmentsForCounselor(counselorId, today) {
  const clients = await sbGet(
    'counselor_clients',
    `counselor_id=eq.${encodeURIComponent(counselorId)}&select=id,display_name,legal_name,next_appointment`,
  );
  const names = new Map();
  clients.forEach((c) => {
    names.set(c.id, (c.display_name || c.legal_name || '고객').trim());
  });

  const items = [];
  const seen = new Set();

  function add(clientId, dateStr) {
    if (!dateStr || dateStr !== today) return;
    const key = clientId + '|' + dateStr;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ clientId, name: names.get(clientId) || '고객' });
  }

  clients.forEach((c) => add(c.id, c.next_appointment));

  let sessions = [];
  try {
    sessions = await sbGet(
      'counselor_sessions',
      `counselor_id=eq.${encodeURIComponent(counselorId)}&select=client_id,next_appointment`,
    );
  } catch {
    /* counselor_sessions 없으면 무시 */
  }
  sessions.forEach((s) => add(s.client_id, s.next_appointment));

  return items;
}

function buildMorningMessage(items) {
  if (!items.length) return null;
  const n = items.length;
  const preview = items.slice(0, 3).map((x) => x.name).join(', ');
  const more = n > 3 ? ` 외 ${n - 3}명` : '';
  return {
    title: `오늘 상담 ${n}건`,
    body: preview + more,
    url: '/counselor.html',
  };
}

async function sendPushToSubscription(row, payload) {
  const subscription = {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth_key },
  };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 86400 });
    return { ok: true };
  } catch (e) {
    const gone = e.statusCode === 404 || e.statusCode === 410;
    if (gone) {
      const base = supabaseBase();
      await fetch(`${base}/rest/v1/counselor_push_subscriptions?id=eq.${row.id}`, {
        method: 'DELETE',
        headers: sbHeaders(),
      });
    }
    return { ok: false, error: e.message, gone };
  }
}

async function runMorningPushJob() {
  if (!ensureVapid()) {
    return { ok: false, error: 'VAPID keys not configured' };
  }

  const today = todayKstYmd();
  const subs = await sbGet(
    'counselor_push_subscriptions',
    'morning_enabled=eq.true&select=id,counselor_id,endpoint,p256dh,auth_key',
  );

  const byCounselor = new Map();
  subs.forEach((s) => {
    if (!byCounselor.has(s.counselor_id)) byCounselor.set(s.counselor_id, []);
    byCounselor.get(s.counselor_id).push(s);
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const [counselorId, counselorSubs] of byCounselor) {
    const pro = await isProfessionalUser(counselorId);
    if (!pro) {
      skipped += counselorSubs.length;
      continue;
    }
    const items = await getTodayAppointmentsForCounselor(counselorId, today);
    const msg = buildMorningMessage(items);
    if (!msg) {
      skipped += counselorSubs.length;
      continue;
    }
    const payload = {
      title: msg.title,
      body: msg.body,
      url: msg.url,
      tag: 'counselor-morning-' + today,
    };
    for (const sub of counselorSubs) {
      const r = await sendPushToSubscription(sub, payload);
      if (r.ok) sent += 1;
      else failed += 1;
    }
  }

  return { ok: true, date: today, sent, skipped, failed, counselors: byCounselor.size };
}

function registerCounselorPushRoutes(app, getUserIdFromAuth) {
  app.get('/api/counselor/push/vapid-public', (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
      res.status(503).json({ error: 'Push not configured', enabled: false });
      return;
    }
    res.json({ enabled: true, publicKey: key });
  });

  app.post('/api/counselor/push/subscribe', async (req, res) => {
    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!(await isProfessionalUser(userId))) {
      res.status(403).json({ error: 'Professional plan required' });
      return;
    }
    const { endpoint, keys, morning_enabled: morningEnabled } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: 'Invalid subscription' });
      return;
    }

    const base = supabaseBase();
    const key = serviceKey();
    if (!base || !key) {
      res.status(503).json({ error: 'Server config missing' });
      return;
    }

    const row = {
      counselor_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
      morning_enabled: morningEnabled !== false,
    };

    const upsertRes = await fetch(
      `${base}/rest/v1/counselor_push_subscriptions?on_conflict=counselor_id,endpoint`,
      {
        method: 'POST',
        headers: sbHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify(row),
      },
    );
    if (!upsertRes.ok) {
      const text = await upsertRes.text();
      console.error('[counselor/push/subscribe]', text);
      res.status(502).json({ error: 'Failed to save subscription' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/counselor/push/unsubscribe', async (req, res) => {
    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const endpoint = req.body?.endpoint;
    if (!endpoint) {
      res.status(400).json({ error: 'endpoint required' });
      return;
    }
    const base = supabaseBase();
    await fetch(
      `${base}/rest/v1/counselor_push_subscriptions?counselor_id=eq.${encodeURIComponent(userId)}&endpoint=eq.${encodeURIComponent(endpoint)}`,
      { method: 'DELETE', headers: sbHeaders() },
    );
    res.json({ ok: true });
  });

  app.post('/api/cron/counselor-morning-push', async (req, res) => {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.headers['x-cron-secret'];
    if (!secret || token !== secret) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const result = await runMorningPushJob();
      res.json(result);
    } catch (e) {
      console.error('[cron/counselor-morning-push]', e);
      res.status(500).json({ error: e.message || 'Job failed' });
    }
  });
}

module.exports = { registerCounselorPushRoutes, runMorningPushJob, todayKstYmd };
