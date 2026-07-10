/**
 * 라이프코드 단품 — 건별(1회) 결제 후 접속 코드 발급
 */
const crypto = require('crypto');
const { KPN_PAYMENT_ID_MAX } = require('./plan-billing');
const { fetchPortOnePayment, readPaymentTotal } = require('./portone-client');

const PAYMENT_PREFIX = {
  basic30: 'lonb',
  counselor30: 'lonc',
};

/** @type {Record<string, { key: string, amount: number, days: number, productTier: string, orderName: string, title: string, desc: string }>} */
const LIFECODE_ONETIME_PRODUCTS = {
  basic30: {
    key: 'basic30',
    amount: 7900,
    days: 15,
    productTier: 'basic',
    orderName: '라이프코드 베이직 15일 이용권',
    title: '베이직 15일 이용권',
    desc: '베이직과 동일 · AI 10크레딧 · 15일. 계속 이용하실 때는 월 9,900원 구독을 추천합니다.',
  },
  counselor30: {
    key: 'counselor30',
    amount: 29900,
    days: 15,
    productTier: 'counselor',
    orderName: '라이프코드 상담사 15일 체험권',
    title: '상담사 15일 체험권',
    desc: 'Professional 전 기능 · AI 25크레딧 · 15일. 계속 이용하실 때는 Professional 월 구독(49,900원)을 추천합니다.',
  },
};

function lifecodeOrdersConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// 단건(1회) 카드 결제는 PG 인증결제 MID가 필요하다. 인증 MID 발급 전에는
// LIFECODE_ONETIME_ENABLED=true 로 켜기 전까지 잠가 둔다(기본 잠금).
function lifecodeOneTimeEnabled() {
  return String(process.env.LIFECODE_ONETIME_ENABLED || '').toLowerCase() === 'true';
}

function supabaseBase() {
  return process.env.SUPABASE_URL.replace(/\/$/, '');
}

function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function sbFetch(path, options = {}) {
  const key = serviceKey();
  const res = await fetch(`${supabaseBase()}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headersExtra || {}),
    },
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

function randomAlnum(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < length; i += 1) {
    s += chars[crypto.randomInt(0, chars.length)];
  }
  return s;
}

function buildLifecodePaymentId(productKey) {
  const prefix = PAYMENT_PREFIX[productKey];
  if (!prefix) throw new Error('invalid product');
  const tailLen = KPN_PAYMENT_ID_MAX - prefix.length;
  return `${prefix}${randomAlnum(tailLen)}`;
}

function isLifecodePaymentId(paymentId) {
  const s = String(paymentId || '');
  return s.startsWith('lonb') || s.startsWith('lonc');
}

function getProduct(productKey) {
  return LIFECODE_ONETIME_PRODUCTS[productKey] || null;
}

function amountMatchesProduct(amount, productKey) {
  const p = getProduct(productKey);
  if (!p) return false;
  return Number(amount) === p.amount;
}

function publicProducts() {
  return Object.values(LIFECODE_ONETIME_PRODUCTS).map((p) => ({
    key: p.key,
    amount: p.amount,
    days: p.days,
    productTier: p.productTier,
    title: p.title,
    desc: p.desc,
    counselorHub: p.productTier === 'counselor',
  }));
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

async function getOrder(paymentId) {
  const { res, data } = await sbFetch(
    `/rest/v1/lifecode_orders?payment_id=eq.${encodeURIComponent(paymentId)}&limit=1`,
  );
  if (!res.ok) throw new Error(`lifecode_orders fetch ${res.status}`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function insertOrder(row) {
  const { res, data } = await sbFetch('/rest/v1/lifecode_orders', {
    method: 'POST',
    headersExtra: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`lifecode_orders insert ${res.status}: ${JSON.stringify(data)}`);
  return Array.isArray(data) ? data[0] : data;
}

async function patchOrder(paymentId, fields) {
  const { res, data } = await sbFetch(
    `/rest/v1/lifecode_orders?payment_id=eq.${encodeURIComponent(paymentId)}`,
    {
      method: 'PATCH',
      headersExtra: { Prefer: 'return=representation' },
      body: JSON.stringify(fields),
    },
  );
  if (!res.ok) throw new Error(`lifecode_orders patch ${res.status}: ${JSON.stringify(data)}`);
  return Array.isArray(data) ? data[0] : data;
}

async function insertLicense(row) {
  const { res, data } = await sbFetch('/rest/v1/lifecode_licenses', {
    method: 'POST',
    headersExtra: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`license insert ${res.status}: ${JSON.stringify(data)}`);
  return Array.isArray(data) ? data[0] : data;
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
  if (!res.ok) throw new Error(`license patch ${res.status}: ${JSON.stringify(data)}`);
}

async function createLicenseForProduct(productKey, paymentId, buyerEmail) {
  const product = getProduct(productKey);
  if (!product) throw new Error('invalid product');

  let normalized;
  let codeHash;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    normalized = normalizeCode(generateLicenseCode());
    codeHash = hashCode(normalized);
    const { res, data } = await sbFetch(
      `/rest/v1/lifecode_licenses?code_hash=eq.${encodeURIComponent(codeHash)}&limit=1`,
    );
    if (res.ok && (!Array.isArray(data) || !data.length)) break;
  }

  const expires = new Date();
  expires.setDate(expires.getDate() + product.days);

  const license = await insertLicense({
    code_hash: codeHash,
    code_hint: codeHintFromNormalized(normalized),
    status: 'active',
    expires_at: expires.toISOString(),
    product_tier: product.productTier,
    note: `건별결제 ${paymentId}${buyerEmail ? ` · ${buyerEmail}` : ''}`,
  });

  return {
    license,
    displayCode: formatDisplayCode(normalized),
    expiresAt: license.expires_at,
    productTier: product.productTier,
  };
}

/**
 * 결제 완료 라이선스를 로그인 계정에 연결 (코드 입력 없이)
 * basic → profiles.plan=basic (AI 10), counselor → professional 체험 (AI 25)
 */
async function linkLicenseToAccount(license, userId, product, deps = {}) {
  if (!license?.id || !userId) return { linked: false };
  await patchLicense(license.id, { linked_user_id: userId });

  if (typeof deps.patchProfileFields !== 'function') {
    return { linked: true };
  }

  const profile = typeof deps.getProfile === 'function' ? await deps.getProfile(userId) : null;
  if (profile?.toss_billing_key) {
    return { linked: true, profileSkipped: 'has_subscription' };
  }

  if (product?.productTier === 'counselor') {
    if (profile?.counselor_trial_license_id && profile.counselor_trial_license_id !== license.id) {
      return { linked: true, profileSkipped: 'other_trial' };
    }
    await deps.patchProfileFields(userId, {
      plan: 'professional',
      plan_active_until: license.expires_at,
      counselor_trial_license_id: license.id,
    });
    return { linked: true, counselorActivated: true };
  }

  if (product?.productTier === 'basic') {
    const curPlan = String(profile?.plan || 'free').toLowerCase();
    const rank = { free: 0, basic: 1, plus: 2, professional: 3, private: 4 };
    if ((rank[curPlan] || 0) > 1) {
      return { linked: true, profileSkipped: 'higher_plan' };
    }
    await deps.patchProfileFields(userId, {
      plan: 'basic',
      plan_active_until: license.expires_at,
    });
    return { linked: true, basicActivated: true };
  }

  return { linked: true };
}

/**
 * 결제 검증 후 라이선스 발급 + 계정 연결 (멱등)
 */
async function fulfillLifecodeOrder(paymentId, deps = {}) {
  if (!isLifecodePaymentId(paymentId)) {
    return { ok: false, error: 'invalid_payment_id' };
  }

  const order = await getOrder(paymentId);
  if (!order) return { ok: false, error: 'order_not_found' };

  if (order.status === 'paid' && order.license_id) {
    const lic = await getLicenseById(order.license_id);
    if (order.user_id && lic && !lic.linked_user_id) {
      const product = getProduct(order.product_key);
      await linkLicenseToAccount(lic, order.user_id, product, deps);
    }
    return {
      ok: true,
      alreadyFulfilled: true,
      expiresAt: lic?.expires_at || null,
      productTier: lic?.product_tier || null,
      counselorHub: String(lic?.product_tier || '') === 'counselor',
      linkedUserId: order.user_id || lic?.linked_user_id || null,
      accountLinked: true,
    };
  }

  const payment = await fetchPortOnePayment(paymentId);
  if (payment.status !== 'PAID') {
    return { ok: false, error: 'payment_not_paid', status: payment.status };
  }

  const total = readPaymentTotal(payment);
  if (!amountMatchesProduct(total, order.product_key)) {
    return { ok: false, error: 'amount_mismatch' };
  }

  const product = getProduct(order.product_key);
  const issued = await createLicenseForProduct(order.product_key, paymentId, order.buyer_email);
  let linkInfo = { linked: false };
  if (order.user_id) {
    linkInfo = await linkLicenseToAccount(issued.license, order.user_id, product, deps);
  }

  await patchOrder(paymentId, {
    status: 'paid',
    license_id: issued.license.id,
    paid_at: new Date().toISOString(),
  });

  return {
    ok: true,
    expiresAt: issued.expiresAt,
    productTier: issued.productTier,
    counselorHub: issued.productTier === 'counselor',
    linkedUserId: order.user_id || null,
    accountLinked: !!linkInfo.linked,
    counselorActivated: !!linkInfo.counselorActivated,
  };
}

function registerLifecodeOneTimeRoutes(app, {
  portoneConfigured,
  portonePublicConfig,
  portoneOneTimePublicConfig,
  lifecodeConfigured,
  getUserIdFromAuth,
  getProfile,
  patchProfileFields,
}) {
  // 건별 결제창은 일회성 전용 채널(MID)을 사용. 미설정 시 기존 채널로 폴백.
  const oneTimeConfig = portoneOneTimePublicConfig || portonePublicConfig;
  const fulfillDeps = { getProfile, patchProfileFields };

  app.get('/api/lifecode/checkout/products', (_req, res) => {
    res.json({ products: publicProducts() });
  });

  app.get('/api/lifecode/checkout/config', (_req, res) => {
    res.json({
      ...oneTimeConfig(),
      portoneConfigured: portoneConfigured(),
      oneTimeEnabled: lifecodeOneTimeEnabled(),
      products: publicProducts(),
      loginRequired: true,
    });
  });

  app.post('/api/lifecode/checkout/prepare', async (req, res) => {
    if (!lifecodeOneTimeEnabled()) {
      res.status(503).json({ error: 'one_time_disabled' });
      return;
    }
    if (!lifecodeConfigured()) {
      res.status(503).json({ error: 'lifecode_not_configured' });
      return;
    }
    if (!lifecodeOrdersConfigured()) {
      res.status(503).json({ error: 'lifecode_orders_table_missing' });
      return;
    }
    if (!portoneConfigured()) {
      res.status(503).json({ error: 'portone_not_configured' });
      return;
    }

    const userId = typeof getUserIdFromAuth === 'function'
      ? await getUserIdFromAuth(req.headers.authorization)
      : null;
    if (!userId) {
      res.status(401).json({ error: 'login_required' });
      return;
    }

    const productKey = String(req.body?.productKey || 'basic30');
    const product = getProduct(productKey);
    if (!product) {
      res.status(400).json({ error: 'invalid_product' });
      return;
    }

    const buyerEmail = req.body?.email ? String(req.body.email).trim().slice(0, 200) : null;

    try {
      const paymentId = buildLifecodePaymentId(productKey);
      await insertOrder({
        payment_id: paymentId,
        product_key: productKey,
        amount: product.amount,
        buyer_email: buyerEmail || null,
        user_id: userId,
        status: 'pending',
      });
      res.json({
        paymentId,
        productKey,
        amount: product.amount,
        orderName: product.orderName,
        billingMode: 'one_time',
      });
    } catch (e) {
      console.error('[lifecode/checkout/prepare]', e);
      const msg = String(e.message || '');
      if (msg.includes('lifecode_orders') && (msg.includes('404') || msg.includes('user_id'))) {
        res.status(503).json({
          error: 'lifecode_orders 스키마가 필요합니다. database/lifecode_orders.sql 을 실행해 주세요.',
        });
        return;
      }
      res.status(500).json({ error: 'prepare_failed' });
    }
  });

  app.post('/api/lifecode/checkout/confirm', async (req, res) => {
    if (!lifecodeConfigured() || !lifecodeOrdersConfigured()) {
      res.status(503).json({ error: 'server_not_configured' });
      return;
    }
    if (!portoneConfigured()) {
      res.status(503).json({ error: 'portone_not_configured' });
      return;
    }

    const userId = typeof getUserIdFromAuth === 'function'
      ? await getUserIdFromAuth(req.headers.authorization)
      : null;
    if (!userId) {
      res.status(401).json({ error: 'login_required' });
      return;
    }

    const paymentId = String(req.body?.paymentId || '').trim();
    if (!paymentId) {
      res.status(400).json({ error: 'payment_id_required' });
      return;
    }

    try {
      const order = await getOrder(paymentId);
      if (!order) {
        res.status(404).json({ ok: false, error: 'order_not_found' });
        return;
      }
      if (order.user_id && order.user_id !== userId) {
        res.status(403).json({ ok: false, error: 'forbidden' });
        return;
      }

      const result = await fulfillLifecodeOrder(paymentId, fulfillDeps);
      if (!result.ok) {
        const status = result.error === 'order_not_found' ? 404 : 400;
        res.status(status).json(result);
        return;
      }
      res.json(result);
    } catch (e) {
      console.error('[lifecode/checkout/confirm]', e);
      res.status(502).json({ error: 'confirm_failed' });
    }
  });
}

module.exports = {
  LIFECODE_ONETIME_PRODUCTS,
  publicProducts,
  isLifecodePaymentId,
  lifecodeOneTimeEnabled,
  fulfillLifecodeOrder,
  registerLifecodeOneTimeRoutes,
};
