require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { registerLifecodeRoutes } = require('./lib/lifecode-api');
const { registerNaverAuthRoutes } = require('./lib/naver-auth');

const app = express();

const PORT = Number(process.env.PORT || process.env.PORT_STATIC || 3001);
const pathPublic = path.join(__dirname, 'public');

/** 로컬에서 F5만 눌렀을 때 브라우저가 옛 HTML/CSS를 붙잡는 것 완화 (운영은 NODE_ENV=production) */
const isProd = process.env.NODE_ENV === 'production';

const {
  PLAN_AMOUNTS,
  ORDER_PREFIX,
  buildShortPaymentId,
  buildShortIssueId,
  createPlanBilling,
} = require('./lib/plan-billing');

const { registerPortOneRoutes, portonePublicConfig, portoneConfigured } = require('./lib/portone-payment');
const { createSubscriptionService } = require('./lib/subscription-service');

let planBilling;

function supabaseHeaders(serviceKey, extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function isDemoUpgradeAllowed() {
  const v = (process.env.ALLOW_DEMO_PLAN_UPGRADE || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

async function getUserIdFromAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (secret) {
    try {
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
      if (typeof payload.sub === 'string') return payload.sub;
    } catch {
      /* fall through — validate via Supabase Auth API */
    }
  }

  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return typeof user?.id === 'string' ? user.id : null;
  } catch {
    return null;
  }
}

async function patchProfileFields(userId, fields) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  const url = `${base.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: supabaseHeaders(key, { Prefer: 'return=minimal' }),
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`profiles update ${res.status}: ${t}`);
  }
}

async function getProfile(userId) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  const url =
    `${base.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}` +
    '&select=id,full_name,plan,plan_active_until,professional_payment_key,toss_billing_key,subscription_cycle,subscription_cancel_at_period_end';
  const res = await fetch(url, { headers: supabaseHeaders(key) });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

/** @returns {Promise<boolean>} true = 새로 기록됨(이어서 플랜 적용), false = 이미 처리된 payment */
async function insertAppliedPaymentKey(paymentKey, userId, orderId) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${base}/rest/v1/toss_applied_payments`, {
    method: 'POST',
    headers: supabaseHeaders(key, { Prefer: 'return=minimal' }),
    body: JSON.stringify({
      payment_key: paymentKey,
      user_id: userId,
      order_id: String(orderId),
    }),
  });
  if (res.status === 409) return false;
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 400 && /duplicate|unique|already exists/i.test(t)) return false;
    throw new Error(`toss_applied_payments ${res.status}: ${t}`);
  }
  return true;
}

async function findAppliedPayment(paymentKey, userId) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url =
    `${base}/rest/v1/toss_applied_payments?payment_key=eq.${encodeURIComponent(paymentKey)}` +
    `&user_id=eq.${encodeURIComponent(userId)}&select=payment_key`;
  const res = await fetch(url, { headers: supabaseHeaders(key) });
  if (!res.ok) return false;
  const rows = await res.json();
  return rows.length > 0;
}

planBilling = createPlanBilling({
  patchProfileFields,
  getProfile,
  insertAppliedPaymentKey,
});

async function getUserEmail(userId) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.email || null;
  } catch {
    return null;
  }
}

const subscriptionService = createSubscriptionService({
  planBilling,
  getProfile,
  getUserEmail,
  insertAppliedPaymentKey,
});

async function listRenewalCandidates() {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const url =
    `${base}/rest/v1/profiles` +
    `?plan=neq.free` +
    `&toss_billing_key=not.is.null` +
    `&subscription_cancel_at_period_end=eq.false` +
    `&plan_active_until=lte.${encodeURIComponent(until)}` +
    '&select=id,plan,plan_active_until,toss_billing_key,subscription_cycle,subscription_cancel_at_period_end';
  const res = await fetch(url, { headers: supabaseHeaders(key) });
  if (!res.ok) return [];
  return res.json();
}

async function listExpiredCancelledProfiles() {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const now = new Date().toISOString();
  const url =
    `${base}/rest/v1/profiles` +
    `?subscription_cancel_at_period_end=eq.true` +
    `&plan_active_until=lte.${encodeURIComponent(now)}` +
    '&select=id';
  const res = await fetch(url, { headers: supabaseHeaders(key) });
  if (!res.ok) return [];
  return res.json();
}

async function insertCheckoutPending(paymentId, userId, plan, cycle) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${base}/rest/v1/checkout_pending`, {
    method: 'POST',
    headers: supabaseHeaders(key, { Prefer: 'return=minimal' }),
    body: JSON.stringify({
      payment_id: paymentId,
      user_id: userId,
      plan,
      cycle,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`checkout_pending ${res.status}: ${t}`);
  }
}

async function getCheckoutPending(paymentId) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url =
    `${base}/rest/v1/checkout_pending?payment_id=eq.${encodeURIComponent(paymentId)}` +
    '&select=payment_id,user_id,plan,cycle';
  const res = await fetch(url, { headers: supabaseHeaders(key) });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

async function deleteCheckoutPending(paymentId) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  await fetch(
    `${base}/rest/v1/checkout_pending?payment_id=eq.${encodeURIComponent(paymentId)}`,
    { method: 'DELETE', headers: supabaseHeaders(key, { Prefer: 'return=minimal' }) },
  );
}

async function resolvePaymentContext(paymentId, authUserId) {
  const pending = await getCheckoutPending(paymentId);
  if (!pending) throw new Error('pending not found');
  if (authUserId && pending.user_id !== authUserId) {
    throw new Error('user mismatch');
  }
  return {
    userId: pending.user_id,
    plan: pending.plan,
    cycle: pending.cycle,
  };
}

const checkoutStore = {
  resolvePaymentContext,
  deletePending: deleteCheckoutPending,
  findAppliedPayment,
  getProfile,
};

app.use(express.json({ limit: '512kb' }));

app.get('/api/checkout-config', (req, res) => {
  res.json({
    ...portonePublicConfig(),
    portoneConfigured: portoneConfigured(),
    demoUpgrade: isDemoUpgradeAllowed(),
    plans: PLAN_AMOUNTS,
  });
});

app.post('/api/checkout/prepare', async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'Supabase server config missing' });
    return;
  }
  const userId = await getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or missing session' });
    return;
  }
  const plan = String(req.body?.plan || '').toLowerCase();
  const cycle = 'monthly';
  if (!ORDER_PREFIX[plan]) {
    res.status(400).json({ error: 'Invalid plan' });
    return;
  }
  const amount = PLAN_AMOUNTS[plan]?.[cycle];
  if (!amount) {
    res.status(400).json({ error: 'Invalid plan cycle' });
    return;
  }
  try {
    const paymentId = buildShortPaymentId(plan, cycle);
    const issueId = buildShortIssueId(plan, cycle);
    await insertCheckoutPending(paymentId, userId, plan, cycle);
    res.json({ paymentId, issueId, plan, cycle, amount, billingMode: 'recurring' });
  } catch (e) {
    console.error('[checkout/prepare]', e);
    const msg = String(e.message || '');
    if (msg.includes('checkout_pending') && msg.includes('404')) {
      res.status(503).json({
        error: 'checkout_pending 테이블이 없습니다. Supabase에서 database/checkout_pending.sql 을 실행해 주세요.',
      });
      return;
    }
    res.status(500).json({ error: 'Could not prepare checkout' });
  }
});

app.post('/api/demo-upgrade-professional', async (req, res) => {
  if (!isDemoUpgradeAllowed()) {
    res.status(403).json({ error: 'Demo upgrade disabled' });
    return;
  }
  const userId = await getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or missing session' });
    return;
  }
  try {
    await patchProfileFields(userId, {
      plan: 'professional',
      plan_active_until: null,
      professional_payment_key: null,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update plan' });
  }
});

app.post('/api/checkout/subscribe', async (req, res) => {
  if (!portoneConfigured()) {
    res.status(503).json({ error: 'PortOne 결제 설정이 완료되지 않았습니다.' });
    return;
  }
  const userId = await getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or missing session' });
    return;
  }
  const paymentId = String(req.body?.paymentId || '').trim();
  const billingKey = String(req.body?.billingKey || '').trim() || undefined;
  const billingIssueToken = String(req.body?.billingIssueToken || '').trim() || undefined;
  if (!paymentId) {
    res.status(400).json({ error: 'paymentId required' });
    return;
  }
  let ctx;
  try {
    ctx = await resolvePaymentContext(paymentId, userId);
  } catch (e) {
    res.status(400).json({ error: 'Invalid or expired checkout session' });
    return;
  }
  try {
    const resolvedKey = await subscriptionService.resolveBillingKey({ billingKey, billingIssueToken });
    const email = await getUserEmail(userId);
    const result = await subscriptionService.chargeSubscription({
      userId,
      paymentId,
      plan: ctx.plan,
      cycle: ctx.cycle,
      billingKey: resolvedKey,
      email,
    });
    await deleteCheckoutPending(paymentId).catch(() => {});
    res.json(result);
  } catch (e) {
    console.error('[checkout/subscribe]', e);
    res.status(502).json({ error: e.message || '정기결제 등록에 실패했습니다.' });
  }
});

app.get('/api/subscription/status', async (req, res) => {
  const userId = await getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or missing session' });
    return;
  }
  const profile = await getProfile(userId);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json({
    plan: profile.plan,
    cycle: profile.subscription_cycle,
    activeUntil: profile.plan_active_until,
    cancelAtPeriodEnd: !!profile.subscription_cancel_at_period_end,
    hasBillingKey: !!profile.toss_billing_key,
  });
});

app.post('/api/subscription/cancel', async (req, res) => {
  const userId = await getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or missing session' });
    return;
  }
  try {
    const result = await subscriptionService.cancelSubscription(userId);
    res.json(result);
  } catch (e) {
    console.error('[subscription/cancel]', e);
    res.status(500).json({ error: '구독 해지 요청에 실패했습니다.' });
  }
});

app.post('/api/cron/renew-subscriptions', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.headers['x-cron-secret'];
  if (!secret || token !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const candidates = await listRenewalCandidates();
    const renewResults = [];
    for (const profile of candidates) {
      renewResults.push(await subscriptionService.renewUserSubscription(profile.id, profile));
    }
    const expired = await listExpiredCancelledProfiles();
    for (const row of expired) {
      await planBilling.clearSubscriptionBilling(row.id);
    }
    res.json({
      ok: true,
      renewed: renewResults.filter((r) => r.ok).length,
      failed: renewResults.filter((r) => r.ok === false).length,
      downgraded: expired.length,
      details: renewResults,
    });
  } catch (e) {
    console.error('[cron/renew-subscriptions]', e);
    res.status(500).json({ error: 'Renewal job failed' });
  }
});

registerPortOneRoutes(app, planBilling, getUserIdFromAuth, checkoutStore);

registerLifecodeRoutes(app, { portoneConfigured, portonePublicConfig });
registerNaverAuthRoutes(app);

/** AI 호출은 ANTHROPIC_API_KEY + AI_ENABLED=true 일 때만 (기본 꺼짐) */
function isAiAvailable() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return false;
  const flag = String(process.env.AI_ENABLED || '').toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

app.get('/api/ai/status', (req, res) => {
  res.json({ available: isAiAvailable() });
});

app.post('/api/ai/messages', async (req, res) => {
  if (!isAiAvailable()) {
    res.status(503).json({ error: 'AI server not configured' });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const { model, max_tokens, messages } = req.body || {};
  if (!model || !Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: 'model and messages are required' });
    return;
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: Number(max_tokens) || 1000,
        messages,
      }),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    console.error('ai proxy error', e);
    res.status(502).json({ error: 'AI upstream request failed' });
  }
});

app.get('/favicon.ico', (req, res) => {
  res.type('image/svg+xml');
  res.sendFile(path.join(pathPublic, 'favicon.svg'));
});

app.use(
  express.static(pathPublic, {
    etag: isProd,
    lastModified: isProd,
    setHeaders(res) {
      if (isProd) return;
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    },
  }),
);

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(404).send('Not found');
    return;
  }
  if (!isProd) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  if (req.path === '/lifecode' || req.path === '/lifecode/') {
    res.sendFile(path.join(pathPublic, 'lifecode', 'index.html'));
    return;
  }
  if (req.path.startsWith('/lifecode/')) {
    const rel = req.path.slice('/lifecode/'.length) || 'index.html';
    const candidate = path.join(pathPublic, 'lifecode', rel);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      res.sendFile(candidate);
      return;
    }
  }
  res.sendFile(path.join(pathPublic, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`paljaweb static server — http://localhost:${PORT}`);
  console.log('[palja] PortOne webhook URL: .../api/portone/webhook');
  console.log('[lifecode] Entry: /lifecode/  Admin: /lifecode/admin.html');
});
