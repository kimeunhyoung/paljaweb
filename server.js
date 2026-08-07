require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { registerLifecodeRoutes } = require('./lib/lifecode-api');
const { registerNaverAuthRoutes } = require('./lib/naver-auth');
const { registerCounselorPushRoutes, startCounselorPushScheduler } = require('./lib/counselor-push');
const { registerCounselorTrialRoutes } = require('./lib/counselor-trial');
const { registerAiUsageRoutes, isAiUpstreamAvailable, kstPeriod, resolveAiCreditLimit, aiUsagePeriod } = require('./lib/ai-usage');
const { registerAiOneTimeRoutes } = require('./lib/ai-one-time');
const { registerSignupNotifyRoutes, providerLabel } = require('./lib/signup-notify');
const { buildSignupStats } = require('./lib/admin-signup-stats');
const { registerVerifyRemindRoutes } = require('./lib/verify-remind');

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

const { registerPortOneRoutes, portonePublicConfig, portoneOneTimePublicConfig, portoneConfigured } = require('./lib/portone-payment');
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
    '&select=id,full_name,plan,plan_active_until,professional_payment_key,toss_billing_key,subscription_cycle,subscription_cancel_at_period_end,counselor_trial_license_id,counselor_trial_device_id,basic_pass_license_id,ai_credits_bonus,calendar_pass_until,signup_landing_page,signup_referrer,utm_source,utm_medium,utm_campaign,utm_term,utm_content,signup_attribution_at';
  const res = await fetch(url, { headers: supabaseHeaders(key) });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

function truncateText(value, max) {
  const s = String(value || '').trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function buildAttributionFields(body) {
  const capturedAt = truncateText(body?.capturedAt, 40);
  let attributionAt = null;
  if (capturedAt) {
    const parsed = Date.parse(capturedAt);
    attributionAt = Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
  }
  return {
    signup_landing_page: truncateText(body?.landingPage, 300),
    signup_referrer: truncateText(body?.referrer, 500),
    utm_source: truncateText(body?.utmSource, 120),
    utm_medium: truncateText(body?.utmMedium, 120),
    utm_campaign: truncateText(body?.utmCampaign, 200),
    utm_term: truncateText(body?.utmTerm, 200),
    utm_content: truncateText(body?.utmContent, 200),
    signup_attribution_at: attributionAt || new Date().toISOString(),
  };
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

function parseAdminEmails() {
  return new Set(
    String(process.env.AI_CREDIT_ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function isAiCreditAdmin(authHeader) {
  const userId = await getUserIdFromAuth(authHeader);
  if (!userId) return { ok: false };
  const email = (await getUserEmail(userId) || '').toLowerCase();
  const allowlist = parseAdminEmails();
  return { ok: allowlist.has(email), userId, email };
}

async function listAuthUsers() {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return [];
  const all = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const res = await fetch(`${base}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    const users = Array.isArray(data?.users) ? data.users : [];
    if (!users.length) break;
    all.push(...users);
    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }
  return all;
}

async function listProfilesBasic() {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return [];
  const url = `${base}/rest/v1/profiles?select=id,full_name,plan,plan_active_until,toss_billing_key,counselor_trial_license_id,basic_pass_license_id,ai_credits_bonus,signup_landing_page,signup_referrer,utm_source,utm_medium,utm_campaign,utm_term,utm_content`;
  const res = await fetch(url, { headers: supabaseHeaders(key) });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function listAiUsageMonthly(period) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return [];
  const url =
    `${base}/rest/v1/ai_usage_monthly?period=eq.${encodeURIComponent(period)}` +
    '&select=user_id,credits_used,updated_at';
  const res = await fetch(url, { headers: supabaseHeaders(key) });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function getAiMonthlyUsed(userId, period) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return 0;
  const url =
    `${base}/rest/v1/ai_usage_monthly?user_id=eq.${encodeURIComponent(userId)}` +
    `&period=eq.${encodeURIComponent(period)}&select=credits_used`;
  const res = await fetch(url, { headers: supabaseHeaders(key) });
  if (!res.ok) return 0;
  const rows = await res.json();
  return Number(rows?.[0]?.credits_used) || 0;
}

async function upsertAiMonthlyUsed(userId, period, creditsUsed) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Missing Supabase config');
  const res = await fetch(`${base}/rest/v1/ai_usage_monthly`, {
    method: 'POST',
    headers: supabaseHeaders(key, { Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify({
      user_id: userId,
      period,
      credits_used: creditsUsed,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ai_usage_monthly upsert ${res.status}: ${t}`);
  }
  const rows = await res.json();
  return Number(rows?.[0]?.credits_used) || creditsUsed;
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

/** 단품·이용권 등 빌링키 없이 만료된 유료 plan 잔상 (DB plan 정리용) */
async function listExpiredOneTimeProfiles() {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const now = new Date().toISOString();
  const url =
    `${base}/rest/v1/profiles` +
    `?plan=neq.free` +
    `&toss_billing_key=is.null` +
    `&plan_active_until=not.is.null` +
    `&plan_active_until=lte.${encodeURIComponent(now)}` +
    '&select=id,plan,plan_active_until';
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

// 정식 도메인(8code.kr)으로 통일 — onrender 등으로 들어온 브라우저 페이지 요청은 301 리다이렉트
// (SEO 중복 콘텐츠 방지). 헬스체크/API/에셋 요청은 건드리지 않도록 GET + text/html 만 대상.
// AdSense·AdsBot은 등록 URL(paljaweb.onrender.com)에서 실제 HTML을 읽을 수 있게 리다이렉트 제외.
const CANONICAL_HOST = '8code.kr';

function isGoogleAdsCrawler(userAgent) {
  const ua = String(userAgent || '');
  return /AdsBot-Google|Mediapartners-Google|Google-Ads/i.test(ua);
}

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const host = (req.headers.host || '').toLowerCase();
  if (!host.endsWith('.onrender.com')) return next();
  if (isGoogleAdsCrawler(req.headers['user-agent'])) return next();
  const accept = req.headers.accept || '';
  if (!accept.includes('text/html')) return next();
  return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
});

app.use(express.json({ limit: '512kb' }));

app.get('/api/checkout-config', (req, res) => {
  res.json({
    ...portonePublicConfig(),
    portoneConfigured: portoneConfigured(),
    demoUpgrade: isDemoUpgradeAllowed(),
    plans: PLAN_AMOUNTS,
  });
});

app.get('/api/site-config', (req, res) => {
  res.json({
    gaMeasurementId: String(process.env.GA_MEASUREMENT_ID || '').trim(),
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

app.get('/api/subscription/upgrade-preview', async (req, res) => {
  const userId = await getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or missing session' });
    return;
  }
  try {
    const targetPlan = String(req.query.plan || '').trim();
    const calc = await subscriptionService.previewUpgrade(userId, targetPlan);
    res.json(calc);
  } catch (e) {
    console.error('[subscription/upgrade-preview]', e);
    res.status(500).json({ error: '업그레이드 금액 계산에 실패했습니다.' });
  }
});

const UPGRADE_ERROR_MESSAGES = {
  no_active_subscription: '활성 구독이 없어 업그레이드할 수 없습니다.',
  no_billing_key: '등록된 결제 수단이 없습니다.',
  cancelled: '해지 예약된 구독은 업그레이드할 수 없습니다.',
  invalid_target: '잘못된 플랜입니다.',
  not_upgrade: '현재 플랜보다 상위 플랜만 업그레이드할 수 있습니다.',
  expired: '구독 기간이 만료되어 업그레이드할 수 없습니다.',
  invalid_cycle: '결제 주기 정보가 올바르지 않습니다.',
  amount_too_small: '남은 기간이 짧아 차액이 거의 없습니다. 다음 결제일에 전환하는 것을 권장합니다.',
};

app.post('/api/subscription/upgrade', async (req, res) => {
  if (!portoneConfigured()) {
    res.status(503).json({ error: 'PortOne 결제 설정이 완료되지 않았습니다.' });
    return;
  }
  const userId = await getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or missing session' });
    return;
  }
  try {
    const targetPlan = String(req.body?.plan || '').trim();
    const email = await getUserEmail(userId);
    const result = await subscriptionService.upgradeSubscription({ userId, targetPlan, email });
    res.json(result);
  } catch (e) {
    if (e.code && UPGRADE_ERROR_MESSAGES[e.code]) {
      res.status(400).json({ error: UPGRADE_ERROR_MESSAGES[e.code], code: e.code });
      return;
    }
    console.error('[subscription/upgrade]', e);
    res.status(502).json({ error: '업그레이드 결제에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
  }
});

app.get('/api/admin/ai-credits/users', async (req, res) => {
  const admin = await isAiCreditAdmin(req.headers.authorization);
  if (!admin.ok) {
    res.status(403).json({ error: '관리자 권한이 필요합니다. (AI_CREDIT_ADMIN_EMAILS 확인)' });
    return;
  }
  const period = String(req.query.period || '').trim() || kstPeriod();
  const q = String(req.query.q || '').trim().toLowerCase();
  try {
    const [profiles, authUsers] = await Promise.all([
      listProfilesBasic(),
      listAuthUsers(),
    ]);
    const authByUser = new Map(authUsers.map((u) => [u.id, u]));
    const merged = await Promise.all(profiles.map(async (p) => {
      const authUser = authByUser.get(p.id);
      const email = (authUser?.email || '').toLowerCase();
      const usagePeriod = aiUsagePeriod(p);
      const used = await getAiMonthlyUsed(p.id, usagePeriod);
      const limit = await resolveAiCreditLimit(p);
      return {
        userId: p.id,
        email,
        fullName: p.full_name || '',
        plan: p.plan || 'free',
        planActiveUntil: p.plan_active_until || null,
        usagePeriod,
        signupProvider: providerLabel(authUser),
        joinedAt: authUser?.created_at || null,
        landingPage: p.signup_landing_page || '',
        referrer: p.signup_referrer || '',
        utmSource: p.utm_source || '',
        utmMedium: p.utm_medium || '',
        utmCampaign: p.utm_campaign || '',
        utmTerm: p.utm_term || '',
        used,
        limit,
        remaining: Math.max(0, limit - used),
      };
    }));
    const filtered = q
      ? merged.filter((u) =>
        u.email.includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        String(u.userId).toLowerCase().includes(q) ||
        String(u.signupProvider || '').toLowerCase().includes(q) ||
        String(u.landingPage || '').toLowerCase().includes(q) ||
        String(u.referrer || '').toLowerCase().includes(q) ||
        String(u.utmSource || '').toLowerCase().includes(q) ||
        String(u.utmCampaign || '').toLowerCase().includes(q) ||
        String(u.utmTerm || '').toLowerCase().includes(q))
      : merged;
    filtered.sort((a, b) => {
      const aJoined = a.joinedAt ? Date.parse(a.joinedAt) : 0;
      const bJoined = b.joinedAt ? Date.parse(b.joinedAt) : 0;
      return (bJoined - aJoined) || (b.used - a.used) || a.email.localeCompare(b.email);
    });
    res.json({ period, count: filtered.length, users: filtered });
  } catch (e) {
    console.error('[admin/ai-credits/users]', e);
    res.status(500).json({ error: '사용자/크레딧 목록 조회에 실패했습니다.' });
  }
});

app.get('/api/admin/signup-stats', async (req, res) => {
  const admin = await isAiCreditAdmin(req.headers.authorization);
  if (!admin.ok) {
    res.status(403).json({ error: '관리자 권한이 필요합니다. (AI_CREDIT_ADMIN_EMAILS 확인)' });
    return;
  }
  const days = Number(req.query.days) || 30;
  try {
    const [profiles, authUsers] = await Promise.all([
      listProfilesBasic(),
      listAuthUsers(),
    ]);
    const stats = buildSignupStats({
      profiles,
      authUsers,
      providerLabel,
      days,
    });
    res.json(stats);
  } catch (e) {
    console.error('[admin/signup-stats]', e);
    res.status(500).json({ error: '가입 통계 조회에 실패했습니다.' });
  }
});

app.post('/api/admin/ai-credits/adjust', async (req, res) => {
  const admin = await isAiCreditAdmin(req.headers.authorization);
  if (!admin.ok) {
    res.status(403).json({ error: '관리자 권한이 필요합니다. (AI_CREDIT_ADMIN_EMAILS 확인)' });
    return;
  }
  const userId = String(req.body?.userId || '').trim();
  const delta = Number(req.body?.delta);
  if (!userId || !Number.isInteger(delta) || delta === 0) {
    res.status(400).json({ error: 'userId와 정수 delta(0 제외)가 필요합니다.' });
    return;
  }
  if (Math.abs(delta) > 500) {
    res.status(400).json({ error: '한 번에 조정 가능한 delta는 ±500 입니다.' });
    return;
  }
  try {
    const profile = await getProfile(userId);
    const period = String(req.body?.period || '').trim() || aiUsagePeriod(profile || {});
    const prev = await getAiMonthlyUsed(userId, period);
    const next = Math.max(0, prev + delta);
    const saved = await upsertAiMonthlyUsed(userId, period, next);
    const limit = await resolveAiCreditLimit(profile || {});
    res.json({
      ok: true,
      userId,
      period,
      previousUsed: prev,
      delta,
      nextUsed: saved,
      limit,
      remaining: Math.max(0, limit - saved),
      adjustedBy: admin.email,
    });
  } catch (e) {
    console.error('[admin/ai-credits/adjust]', e);
    res.status(500).json({ error: '크레딧 조정에 실패했습니다.' });
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
    const expiredOneTime = await listExpiredOneTimeProfiles();
    for (const row of expiredOneTime) {
      await planBilling.clearSubscriptionBilling(row.id);
    }
    res.json({
      ok: true,
      renewed: renewResults.filter((r) => r.ok).length,
      failed: renewResults.filter((r) => r.ok === false).length,
      downgraded: expired.length,
      downgradedOneTime: expiredOneTime.length,
      details: renewResults,
    });
  } catch (e) {
    console.error('[cron/renew-subscriptions]', e);
    res.status(500).json({ error: 'Renewal job failed' });
  }
});

app.post('/api/profile/signup-attribution', async (req, res) => {
  const userId = await getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: '로그인이 필요합니다.' });
    return;
  }
  try {
    const profile = await getProfile(userId);
    if (!profile) {
      res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });
      return;
    }
    if (profile.signup_landing_page) {
      res.json({ ok: true, skipped: true });
      return;
    }
    const fields = buildAttributionFields(req.body || {});
    const hasData = !!(
      fields.signup_landing_page ||
      fields.signup_referrer ||
      fields.utm_source ||
      fields.utm_medium ||
      fields.utm_campaign ||
      fields.utm_term ||
      fields.utm_content
    );
    if (!hasData) {
      res.json({ ok: true, skipped: true, reason: 'empty' });
      return;
    }
    await patchProfileFields(userId, fields);
    res.json({ ok: true, saved: true });
  } catch (e) {
    console.error('[profile/signup-attribution]', e);
    res.status(500).json({ error: '유입 정보 저장 실패' });
  }
});

registerPortOneRoutes(app, planBilling, getUserIdFromAuth, checkoutStore, {
  getProfile,
  patchProfileFields,
});

registerLifecodeRoutes(app, {
  portoneConfigured,
  portonePublicConfig,
  portoneOneTimePublicConfig,
  getUserIdFromAuth,
  getProfile,
  patchProfileFields,
});
const { registerAccountDeviceRoutes } = require('./lib/account-devices');
registerAccountDeviceRoutes(app, { getUserIdFromAuth });
registerNaverAuthRoutes(app);
registerSignupNotifyRoutes(app);
registerVerifyRemindRoutes(app);
registerCounselorPushRoutes(app, getUserIdFromAuth);
registerCounselorTrialRoutes(app, { getUserIdFromAuth, getProfile, patchProfileFields });

registerAiUsageRoutes(app, {
  getUserIdFromAuth,
  getProfile,
  isAiAvailable: isAiUpstreamAvailable,
});

registerAiOneTimeRoutes(app, {
  portoneConfigured,
  portonePublicConfig,
  portoneOneTimePublicConfig,
  getUserIdFromAuth,
  getProfile,
});

app.get('/favicon.ico', (req, res) => {
  res.type('image/svg+xml');
  res.sendFile(path.join(pathPublic, 'favicon.svg'));
});

// TWA(안드로이드 앱)–도메인 연결 인증 파일. express.static은 .well-known(점 폴더)을
// 기본적으로 무시하므로 명시적 라우트로 제공한다.
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.type('application/json');
  res.sendFile(path.join(pathPublic, '.well-known', 'assetlinks.json'));
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
  startCounselorPushScheduler();
});
