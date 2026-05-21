require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { registerLifecodeRoutes } = require('./lib/lifecode-api');

const app = express();

const PORT = Number(process.env.PORT || process.env.PORT_STATIC || 3001);
const pathPublic = path.join(__dirname, 'public');

/** 로컬에서 F5만 눌렀을 때 브라우저가 옛 HTML/CSS를 붙잡는 것 완화 (운영은 NODE_ENV=production) */
const isProd = process.env.NODE_ENV === 'production';

const AMOUNTS = {
  monthly: 49900,
  annual: 39920 * 12,
};

/** pricing.html과 동일한 Professional 금액(원) */
const PROFESSIONAL_AMOUNTS = new Set([AMOUNTS.monthly, AMOUNTS.annual]);

function tossAuthHeader() {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) return null;
  return 'Basic ' + Buffer.from(`${secret}:`, 'utf8').toString('base64');
}

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

function getUserIdFromAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function parseProfessionalOrderId(orderId) {
  const s = String(orderId);
  const m = s.match(/^ppro_([ma])_([0-9a-f]{32})_/i);
  if (m) {
    const h = m[2].toLowerCase();
    const userId =
      `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    return {
      userId,
      cycle: m[1].toLowerCase() === 'a' ? 'annual' : 'monthly',
    };
  }
  if (/^palja_pro_/i.test(s)) return { legacy: true };
  return null;
}

function amountMatchesCycle(amount, cycle) {
  const n = Number(amount);
  if (cycle === 'annual') return n === AMOUNTS.annual;
  return n === AMOUNTS.monthly;
}

function addSubscriptionPeriod(fromDate, cycle) {
  const d = new Date(fromDate.getTime());
  if (cycle === 'annual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

async function tossGetPayment(paymentKey) {
  const auth = tossAuthHeader();
  if (!auth) throw new Error('No TOSS_SECRET_KEY');
  const r = await fetch(
    `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
    { headers: { Authorization: auth } },
  );
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || `get payment ${r.status}`);
  return j;
}

async function tossConfirmPayment(paymentKey, orderId, amount) {
  const auth = tossAuthHeader();
  if (!auth) throw new Error('No TOSS_SECRET_KEY');
  const r = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentKey: String(paymentKey),
      orderId: String(orderId),
      amount: Number(amount),
    }),
  });
  const j = await r.json();
  if (!r.ok) {
    const err = new Error(j.message || 'confirm failed');
    err.toss = j;
    err.status = r.status;
    throw err;
  }
  return j;
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
    '&select=plan,plan_active_until,professional_payment_key,toss_billing_key';
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

async function extendProfessionalForUser(userId, cycle, paymentKey) {
  const profile = await getProfile(userId);
  const curUntil = profile?.plan_active_until ? new Date(profile.plan_active_until) : null;
  const now = new Date();
  const baseDate = curUntil && curUntil > now ? curUntil : now;
  const until = addSubscriptionPeriod(baseDate, cycle);
  await patchProfileFields(userId, {
    plan: 'professional',
    plan_active_until: until.toISOString(),
    professional_payment_key: paymentKey,
  });
}

async function downgradeIfProfessionalPayment(paymentKey, userId) {
  const profile = await getProfile(userId);
  if (!profile || profile.plan !== 'professional') return;
  if (profile.professional_payment_key !== paymentKey) return;
  await patchProfileFields(userId, {
    plan: 'pro',
    plan_active_until: null,
    professional_payment_key: null,
  });
}

async function downgradeByBillingKey(billingKey) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fr = await fetch(
    `${base}/rest/v1/profiles?toss_billing_key=eq.${encodeURIComponent(billingKey)}&select=id,plan`,
    { headers: supabaseHeaders(key) },
  );
  const rows = await fr.json();
  for (const row of rows || []) {
    if (row.plan === 'professional') {
      await patchProfileFields(row.id, {
        plan: 'pro',
        plan_active_until: null,
        professional_payment_key: null,
        toss_billing_key: null,
      });
    }
  }
}

/**
 * 승인 API 또는 웹훅에서 공통: 한 paymentKey당 1회만 구독 기간 연장
 */
async function applyProfessionalPaymentSuccess(paymentKey, orderId, totalAmount) {
  const parsed = parseProfessionalOrderId(orderId);
  if (!parsed || parsed.legacy || !parsed.userId) {
    console.warn('[palja] skip apply: orderId not in ppro_ format', orderId);
    return { ok: false, reason: 'order_format' };
  }
  const amt = Number(totalAmount);
  if (!amountMatchesCycle(amt, parsed.cycle)) {
    console.warn('[palja] amount/cycle mismatch', amt, parsed.cycle);
    return { ok: false, reason: 'amount' };
  }
  const claimed = await insertAppliedPaymentKey(paymentKey, parsed.userId, orderId);
  if (!claimed) return { ok: true, skipped: true };
  await extendProfessionalForUser(parsed.userId, parsed.cycle, paymentKey);
  return { ok: true };
}

app.use(express.json({ limit: '512kb' }));

app.get('/api/checkout-config', (req, res) => {
  res.json({
    tossClientKey: process.env.TOSS_CLIENT_KEY || '',
    demoUpgrade: isDemoUpgradeAllowed(),
  });
});

app.post('/api/demo-upgrade-professional', async (req, res) => {
  if (!isDemoUpgradeAllowed()) {
    res.status(403).json({ error: 'Demo upgrade disabled' });
    return;
  }
  const userId = getUserIdFromAuth(req.headers.authorization);
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

/**
 * 토스 대시보드에 등록: PAYMENT_STATUS_CHANGED, BILLING_DELETED 권장
 * https://docs.tosspayments.com/guides/v2/webhook
 */
app.post('/api/toss/webhook', async (req, res) => {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) {
    res.status(503).json({ error: 'Not configured' });
    return;
  }

  try {
    const body = req.body || {};
    const eventType = body.eventType;

    if (eventType === 'PAYMENT_STATUS_CHANGED') {
      const paymentKey = body.data?.paymentKey;
      const orderId = body.data?.orderId;
      if (!paymentKey || !orderId) {
        res.sendStatus(200);
        return;
      }

      const pay = await tossGetPayment(paymentKey);
      if (pay.orderId !== orderId) {
        res.status(400).json({ error: 'orderId mismatch' });
        return;
      }

      if (pay.status === 'DONE') {
        await applyProfessionalPaymentSuccess(paymentKey, pay.orderId, pay.totalAmount);
        res.sendStatus(200);
        return;
      }

      if (pay.status === 'CANCELED') {
        const parsed = parseProfessionalOrderId(pay.orderId);
        if (parsed && parsed.userId) {
          await downgradeIfProfessionalPayment(paymentKey, parsed.userId);
        }
        res.sendStatus(200);
        return;
      }

      res.sendStatus(200);
      return;
    }

    if (eventType === 'BILLING_DELETED') {
      const billingKey = body.data?.billingKey;
      if (billingKey) await downgradeByBillingKey(billingKey);
      res.sendStatus(200);
      return;
    }

    res.sendStatus(200);
  } catch (e) {
    console.error('webhook', e);
    res.sendStatus(500);
  }
});

app.post('/api/toss/confirm', async (req, res) => {
  if (!process.env.TOSS_SECRET_KEY) {
    res.status(503).json({ error: 'Payment server not configured' });
    return;
  }

  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or missing session' });
    return;
  }

  const { paymentKey, orderId, amount } = req.body || {};
  if (!paymentKey || !orderId || amount === undefined || amount === null) {
    res.status(400).json({ error: 'paymentKey, orderId, amount required' });
    return;
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || !PROFESSIONAL_AMOUNTS.has(amt)) {
    res.status(400).json({ error: 'Invalid amount for Professional plan' });
    return;
  }

  const parsed = parseProfessionalOrderId(orderId);
  let cycle;
  if (parsed && parsed.userId) {
    if (parsed.userId !== userId) {
      res.status(403).json({ error: 'Order does not match signed-in user' });
      return;
    }
    if (!amountMatchesCycle(amt, parsed.cycle)) {
      res.status(400).json({ error: 'Amount does not match billing cycle' });
      return;
    }
    cycle = parsed.cycle;
  } else if (parsed && parsed.legacy) {
    cycle = amt === AMOUNTS.annual ? 'annual' : 'monthly';
    if (!amountMatchesCycle(amt, cycle)) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }
  } else {
    res.status(400).json({
      error: 'Unsupported orderId. Use latest checkout (order starts with ppro_).',
    });
    return;
  }

  let tossJson;
  try {
    tossJson = await tossConfirmPayment(paymentKey, orderId, amt);
  } catch (e) {
    if (e.toss) {
      res.status(400).json({ error: e.message, toss: e.toss.code });
      return;
    }
    console.error(e);
    res.status(502).json({ error: 'Toss request failed' });
    return;
  }

  if (tossJson.status !== 'DONE') {
    res.status(400).json({ error: 'Payment not completed', status: tossJson.status });
    return;
  }

  if (Number(tossJson.totalAmount) !== amt) {
    res.status(400).json({ error: 'Amount mismatch' });
    return;
  }

  try {
    if (parsed.userId) {
      await applyProfessionalPaymentSuccess(paymentKey, orderId, tossJson.totalAmount);
    } else {
      const claimed = await insertAppliedPaymentKey(paymentKey, userId, orderId);
      if (claimed) await extendProfessionalForUser(userId, cycle, paymentKey);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Paid but profile update failed — contact support with orderId' });
  }
});

registerLifecodeRoutes(app);

app.post('/api/ai/messages', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'AI server not configured' });
    return;
  }

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
  console.log('[palja] Webhook URL (register in Toss): .../api/toss/webhook');
  console.log('[lifecode] Entry: /lifecode/  Admin: /lifecode/admin.html');
});
