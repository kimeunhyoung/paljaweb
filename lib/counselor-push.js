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

function currentKstHour() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const hourPart = parts.find((p) => p.type === 'hour');
  return Number(hourPart?.value ?? 0);
}

function normalizeMorningHour(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 23) return 9;
  return n;
}

function parseEventTime(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, min };
}

function formatKstTimeLabel(timeStr) {
  const t = parseEventTime(timeStr);
  if (!t) return '';
  if (t.h === 0) return '자정 12:' + String(t.min).padStart(2, '0');
  if (t.h < 12) return '오전 ' + t.h + ':' + String(t.min).padStart(2, '0');
  if (t.h === 12) return '낮 12:' + String(t.min).padStart(2, '0');
  return '오후 ' + (t.h - 12) + ':' + String(t.min).padStart(2, '0');
}

function eventSortMin(timeStr) {
  const t = parseEventTime(timeStr);
  if (!t) return 24 * 60;
  return t.h * 60 + t.min;
}

function eventDisplayName(title, eventTime) {
  const label = formatKstTimeLabel(eventTime);
  const name = (title || '일정').trim();
  return label ? `${label} ${name}` : name;
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

async function getTodayScheduleForCounselor(counselorId, today) {
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

  function addClient(clientId, dateStr) {
    if (!dateStr || dateStr !== today) return;
    const key = 'c|' + clientId + '|' + dateStr;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ type: 'client', name: names.get(clientId) || '고객', sortMin: 24 * 60 + 1 });
  }

  clients.forEach((c) => addClient(c.id, c.next_appointment));

  let sessions = [];
  try {
    sessions = await sbGet(
      'counselor_sessions',
      `counselor_id=eq.${encodeURIComponent(counselorId)}&select=client_id,next_appointment`,
    );
  } catch {
    /* counselor_sessions 없으면 무시 */
  }
  sessions.forEach((s) => addClient(s.client_id, s.next_appointment));

  try {
    const events = await sbGet(
      'counselor_events',
      `counselor_id=eq.${encodeURIComponent(counselorId)}&event_date=eq.${encodeURIComponent(today)}&select=id,title,event_time`,
    );
    events.forEach((ev) => {
      const key = 'e|' + ev.id;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        type: 'event',
        name: eventDisplayName(ev.title, ev.event_time),
        sortMin: eventSortMin(ev.event_time),
      });
    });
  } catch {
    /* counselor_events 없으면 무시 */
  }

  items.sort((a, b) => (a.sortMin ?? 0) - (b.sortMin ?? 0));
  return items;
}

function buildMorningMessage(items) {
  if (!items.length) return null;
  const clientN = items.filter((x) => x.type === 'client').length;
  const eventN = items.filter((x) => x.type === 'event').length;
  const titleParts = [];
  if (clientN) titleParts.push(`상담 ${clientN}건`);
  if (eventN) titleParts.push(`일정 ${eventN}건`);
  const preview = items.slice(0, 3).map((x) => x.name).join(', ');
  const more = items.length > 3 ? ` 외 ${items.length - 3}건` : '';
  return {
    title: `오늘 ${titleParts.join(' · ')}`,
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

async function runMorningPushJob(forcedHour) {
  if (!ensureVapid()) {
    return { ok: false, error: 'VAPID keys not configured' };
  }

  const today = todayKstYmd();
  const kstHour = forcedHour !== undefined ? normalizeMorningHour(forcedHour) : currentKstHour();
  const subs = await sbGet(
    'counselor_push_subscriptions',
    `morning_enabled=eq.true&morning_hour=eq.${kstHour}&select=id,counselor_id,endpoint,p256dh,auth_key,morning_hour`,
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
    const items = await getTodayScheduleForCounselor(counselorId, today);
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

  return { ok: true, date: today, kstHour, sent, skipped, failed, counselors: byCounselor.size };
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
    const { endpoint, keys, morning_enabled: morningEnabled, morning_hour: morningHour } = req.body || {};
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
      morning_hour: normalizeMorningHour(morningHour),
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

  app.post('/api/counselor/push/settings', async (req, res) => {
    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!(await isProfessionalUser(userId))) {
      res.status(403).json({ error: 'Professional plan required' });
      return;
    }
    const endpoint = req.body?.endpoint;
    if (!endpoint) {
      res.status(400).json({ error: 'endpoint required' });
      return;
    }
    const morningHour = normalizeMorningHour(req.body?.morning_hour);
    const base = supabaseBase();
    const key = serviceKey();
    if (!base || !key) {
      res.status(503).json({ error: 'Server config missing' });
      return;
    }
    const patchRes = await fetch(
      `${base}/rest/v1/counselor_push_subscriptions?counselor_id=eq.${encodeURIComponent(userId)}&endpoint=eq.${encodeURIComponent(endpoint)}`,
      {
        method: 'PATCH',
        headers: sbHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ morning_hour: morningHour }),
      },
    );
    if (!patchRes.ok) {
      const text = await patchRes.text();
      console.error('[counselor/push/settings]', text);
      res.status(502).json({ error: 'Failed to update settings' });
      return;
    }
    res.json({ ok: true, morning_hour: morningHour });
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
      const forcedHour = req.body?.kst_hour ?? req.query?.kst_hour;
      const result = await runMorningPushJob(forcedHour);
      res.json(result);
    } catch (e) {
      console.error('[cron/counselor-morning-push]', e);
      res.status(500).json({ error: e.message || 'Job failed' });
    }
  });
}

module.exports = {
  registerCounselorPushRoutes,
  runMorningPushJob,
  todayKstYmd,
  currentKstHour,
};
