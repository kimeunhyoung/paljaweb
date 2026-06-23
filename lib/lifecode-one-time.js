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
    days: 30,
    productTier: 'basic',
    orderName: '라이프코드 30일 이용권',
    title: '라이프코드 30일 이용권',
    desc: '접속 코드 1개 · 기기 1대 · 30일간 라이프코드 단품 리포트(구독 없음)',
  },
  counselor30: {
    key: 'counselor30',
    amount: 29900,
    days: 30,
    productTier: 'counselor',
    orderName: '라이프코드 상담사 30일 이용권',
    title: '라이프코드 상담사 30일',
    desc: '기본 분석 + 상담사 허브(고객 카드) · 30일 1회 결제',
  },
};

function lifecodeOrdersConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
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
 * 결제 검증 후 라이선스 발급 (멱등)
 * @returns {{ ok: boolean, code?: string, codeHint?: string, expiresAt?: string, productTier?: string, alreadyFulfilled?: boolean, error?: string }}
 */
async function fulfillLifecodeOrder(paymentId) {
  if (!isLifecodePaymentId(paymentId)) {
    return { ok: false, error: 'invalid_payment_id' };
  }

  const order = await getOrder(paymentId);
  if (!order) return { ok: false, error: 'order_not_found' };

  if (order.status === 'paid' && order.license_id) {
    const lic = await getLicenseById(order.license_id);
    return {
      ok: true,
      alreadyFulfilled: true,
      codeHint: lic?.code_hint || null,
      expiresAt: lic?.expires_at || null,
      productTier: lic?.product_tier || null,
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

  const issued = await createLicenseForProduct(order.product_key, paymentId, order.buyer_email);
  await patchOrder(paymentId, {
    status: 'paid',
    license_id: issued.license.id,
    paid_at: new Date().toISOString(),
  });

  return {
    ok: true,
    code: issued.displayCode,
    expiresAt: issued.expiresAt,
    productTier: issued.productTier,
    counselorHub: issued.productTier === 'counselor',
  };
}

function registerLifecodeOneTimeRoutes(app, { portoneConfigured, portonePublicConfig, lifecodeConfigured }) {
  app.get('/api/lifecode/checkout/products', (_req, res) => {
    res.json({ products: publicProducts() });
  });

  app.get('/api/lifecode/checkout/config', (_req, res) => {
    res.json({
      ...portonePublicConfig(),
      portoneConfigured: portoneConfigured(),
      products: publicProducts(),
    });
  });

  app.post('/api/lifecode/checkout/prepare', async (req, res) => {
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
      if (msg.includes('lifecode_orders') && msg.includes('404')) {
        res.status(503).json({
          error: 'lifecode_orders 테이블이 없습니다. database/lifecode_orders.sql 을 실행해 주세요.',
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

    const paymentId = String(req.body?.paymentId || '').trim();
    if (!paymentId) {
      res.status(400).json({ error: 'payment_id_required' });
      return;
    }

    try {
      const result = await fulfillLifecodeOrder(paymentId);
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
  fulfillLifecodeOrder,
  registerLifecodeOneTimeRoutes,
};
