/**
 * AI 크레딧 단건 결제 — 로그인 계정에 보너스 크레딧 지급
 */
const crypto = require('crypto');
const { KPN_PAYMENT_ID_MAX } = require('./plan-billing');
const { fetchPortOnePayment, readPaymentTotal } = require('./portone-client');

const PAYMENT_PREFIX = {
  ai_chart: 'aich',
  ai_fortune: 'aifr',
  cal_pass_3d: 'acal',
  ai_topup: 'aitp',
};

/**
 * @typedef {{ key: string, amount: number, credits: number, passDays?: number, minPlan?: string, orderName: string, title: string, desc: string, scope?: string }} AiOneTimeProduct
 * @type {Record<string, AiOneTimeProduct>}
 */
const AI_ONETIME_PRODUCTS = {
  ai_chart: {
    key: 'ai_chart',
    amount: 1000,
    credits: 2,
    scope: 'astrology',
    orderName: '점성학 AI 차트 해석 (2크레딧)',
    title: '점성학 AI 차트 해석',
    desc: '점성학 「AI 차트 해석」용 2크레딧. 타고난 성향(출생 차트) AI 해설. 올해·이번 주 운세는 포함되지 않습니다.',
  },
  ai_fortune: {
    key: 'ai_fortune',
    amount: 2500,
    credits: 6,
    scope: 'astrology',
    orderName: '점성학 AI 운세 체험팩',
    title: '점성학 AI 운세 체험팩',
    desc: '점성학용 AI 6크레딧(기간 제한 없음·소진까지). 예: 차트 해석(2) + 올해 운세(1) + 이번 주 운세(1) + 오늘 운세(1) + 여유 1.',
  },
  cal_pass_3d: {
    key: 'cal_pass_3d',
    amount: 1900,
    credits: 3,
    passDays: 3,
    scope: 'calendar',
    orderName: '수비학 달력 3일 체험',
    title: '수비학 달력 3일 체험',
    desc: '수비학 달력 3일 이용 + AI 3크레딧. 월간 달력·일별 가이드·AI 오늘 운세/이번 달 흐름을 짧게 체험. 계속 이용하실 때는 Basic 월 9,900원 구독을 추천합니다.',
  },
  ai_topup: {
    key: 'ai_topup',
    amount: 3500,
    credits: 10,
    minPlan: 'basic',
    scope: 'subscriber',
    orderName: 'AI 크레딧 +10 (구독자)',
    title: 'AI 크레딧 +10',
    desc: 'Basic 이상 구독자 전용. 이번 달 AI가 부족할 때 10크레딧을 추가합니다. 점성학·수비학 달력·네임코드 AI 공통.',
  },
};

function aiOneTimeEnabled() {
  const ai = String(process.env.AI_ONETIME_ENABLED || '').toLowerCase();
  if (ai === 'true' || ai === '1' || ai === 'yes') return true;
  if (ai === 'false' || ai === '0' || ai === 'no') return false;
  // 라이프코드 단건이 켜져 있으면 같은 원타임 채널로 허용
  return String(process.env.LIFECODE_ONETIME_ENABLED || '').toLowerCase() === 'true';
}

function ordersConfigured() {
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

function buildPaymentId(productKey) {
  const prefix = PAYMENT_PREFIX[productKey];
  if (!prefix) throw new Error('invalid product');
  const tailLen = KPN_PAYMENT_ID_MAX - prefix.length;
  return `${prefix}${randomAlnum(tailLen)}`;
}

function isAiCreditPaymentId(paymentId) {
  const s = String(paymentId || '');
  return s.startsWith('aich') || s.startsWith('aifr') || s.startsWith('acal') || s.startsWith('aitp');
}

function getProduct(productKey) {
  return AI_ONETIME_PRODUCTS[productKey] || null;
}

function publicProducts() {
  return Object.values(AI_ONETIME_PRODUCTS).map((p) => ({
    key: p.key,
    amount: p.amount,
    credits: p.credits,
    passDays: p.passDays || 0,
    scope: p.scope || 'ai',
    minPlan: p.minPlan || null,
    title: p.title,
    desc: p.desc,
  }));
}

function planRank(plan) {
  const ranks = { free: 0, basic: 1, plus: 2, professional: 3, private: 4 };
  return ranks[String(plan || 'free').toLowerCase()] || 0;
}

function assertSubscriberProductAccess(product, profile) {
  if (!product?.minPlan) return { ok: true };
  const { effectivePlan } = require('./ai-usage');
  const plan = effectivePlan(profile);
  if (planRank(plan) < planRank(product.minPlan)) {
    return {
      ok: false,
      error: 'subscriber_required',
      message: 'AI 크레딧 추가 구매는 Basic 이상 구독 중에만 이용할 수 있어요.',
      minPlan: product.minPlan,
      plan,
    };
  }
  return { ok: true };
}

async function insertOrder(row) {
  const { res, data } = await sbFetch('/rest/v1/ai_credit_orders', {
    method: 'POST',
    headersExtra: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const msg = typeof data === 'object' ? JSON.stringify(data) : String(data);
    throw new Error(`ai_credit_orders insert ${res.status}: ${msg}`);
  }
  return Array.isArray(data) ? data[0] : data;
}

async function getOrder(paymentId) {
  const { res, data } = await sbFetch(
    `/rest/v1/ai_credit_orders?payment_id=eq.${encodeURIComponent(paymentId)}&limit=1`,
  );
  if (!res.ok) throw new Error(`order fetch ${res.status}`);
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function patchOrder(paymentId, fields) {
  const { res, data } = await sbFetch(
    `/rest/v1/ai_credit_orders?payment_id=eq.${encodeURIComponent(paymentId)}`,
    {
      method: 'PATCH',
      headersExtra: { Prefer: 'return=minimal' },
      body: JSON.stringify(fields),
    },
  );
  if (!res.ok) {
    const msg = typeof data === 'object' ? JSON.stringify(data) : String(data);
    throw new Error(`order patch ${res.status}: ${msg}`);
  }
}

async function addBonusCredits(userId, credits) {
  const { res, data } = await sbFetch(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=ai_credits_bonus`,
  );
  if (!res.ok) throw new Error(`profile fetch ${res.status}`);
  const row = Array.isArray(data) && data[0] ? data[0] : null;
  if (!row) throw new Error('profile_not_found');
  const next = Math.max(0, Number(row.ai_credits_bonus) || 0) + credits;
  const patch = await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headersExtra: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ai_credits_bonus: next }),
  });
  if (!patch.res.ok) {
    const msg = typeof patch.data === 'object' ? JSON.stringify(patch.data) : String(patch.data);
    throw new Error(`bonus patch ${patch.res.status}: ${msg}`);
  }
  return next;
}

/** 수비학 달력 단건 이용권 — 남은 기간이 있으면 그 끝에서부터 연장 */
async function extendCalendarPass(userId, days) {
  const dayCount = Math.max(0, Number(days) || 0);
  if (!dayCount) return null;

  const { res, data } = await sbFetch(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=calendar_pass_until`,
  );
  if (!res.ok) throw new Error(`profile fetch ${res.status}`);
  const row = Array.isArray(data) && data[0] ? data[0] : null;
  if (!row) throw new Error('profile_not_found');

  const now = Date.now();
  const curMs = row.calendar_pass_until ? new Date(row.calendar_pass_until).getTime() : 0;
  const base = Number.isFinite(curMs) && curMs > now ? curMs : now;
  const until = new Date(base + dayCount * 24 * 60 * 60 * 1000).toISOString();

  const patch = await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headersExtra: { Prefer: 'return=minimal' },
    body: JSON.stringify({ calendar_pass_until: until }),
  });
  if (!patch.res.ok) {
    const msg = typeof patch.data === 'object' ? JSON.stringify(patch.data) : String(patch.data);
    throw new Error(`calendar_pass patch ${patch.res.status}: ${msg}`);
  }
  return until;
}

/**
 * @returns {{ ok: boolean, credits?: number, bonusTotal?: number, alreadyFulfilled?: boolean, error?: string }}
 */
async function fulfillAiCreditOrder(paymentId) {
  if (!isAiCreditPaymentId(paymentId)) {
    return { ok: false, error: 'invalid_payment_id' };
  }

  const order = await getOrder(paymentId);
  if (!order) return { ok: false, error: 'order_not_found' };

  if (order.status === 'paid') {
    return {
      ok: true,
      alreadyFulfilled: true,
      credits: order.credits,
      productKey: order.product_key,
      passDays: (getProduct(order.product_key) || {}).passDays || 0,
      title: (getProduct(order.product_key) || {}).title,
    };
  }

  const payment = await fetchPortOnePayment(paymentId);
  if (payment.status !== 'PAID') {
    return { ok: false, error: 'payment_not_paid', status: payment.status };
  }

  const total = readPaymentTotal(payment);
  const product = getProduct(order.product_key);
  if (!product || Number(total) !== product.amount) {
    return { ok: false, error: 'amount_mismatch' };
  }

  const bonusTotal = await addBonusCredits(order.user_id, product.credits);
  let calendarPassUntil = null;
  if (product.passDays) {
    calendarPassUntil = await extendCalendarPass(order.user_id, product.passDays);
  }
  await patchOrder(paymentId, {
    status: 'paid',
    paid_at: new Date().toISOString(),
  });

  return {
    ok: true,
    credits: product.credits,
    bonusTotal,
    passDays: product.passDays || 0,
    calendarPassUntil,
    productKey: product.key,
    title: product.title,
  };
}

function registerAiOneTimeRoutes(app, {
  portoneConfigured,
  portonePublicConfig,
  portoneOneTimePublicConfig,
  getUserIdFromAuth,
  getProfile,
}) {
  const oneTimeConfig = portoneOneTimePublicConfig || portonePublicConfig;

  app.get('/api/ai-credits/checkout/config', (_req, res) => {
    res.json({
      ...oneTimeConfig(),
      portoneConfigured: portoneConfigured(),
      oneTimeEnabled: aiOneTimeEnabled(),
      products: publicProducts(),
    });
  });

  app.post('/api/ai-credits/checkout/prepare', async (req, res) => {
    if (!aiOneTimeEnabled()) {
      res.status(503).json({ error: 'one_time_disabled' });
      return;
    }
    if (!ordersConfigured()) {
      res.status(503).json({ error: 'server_not_configured' });
      return;
    }
    if (!portoneConfigured()) {
      res.status(503).json({ error: 'portone_not_configured' });
      return;
    }

    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'login_required' });
      return;
    }

    const productKey = String(req.body?.productKey || 'ai_chart');
    const product = getProduct(productKey);
    if (!product) {
      res.status(400).json({ error: 'invalid_product' });
      return;
    }

    if (product.minPlan) {
      if (typeof getProfile !== 'function') {
        res.status(503).json({ error: 'server_not_configured' });
        return;
      }
      const profile = await getProfile(userId);
      const gate = assertSubscriberProductAccess(product, profile);
      if (!gate.ok) {
        res.status(403).json(gate);
        return;
      }
    }

    const buyerEmail = req.body?.email ? String(req.body.email).trim().slice(0, 200) : null;

    try {
      const paymentId = buildPaymentId(productKey);
      await insertOrder({
        payment_id: paymentId,
        user_id: userId,
        product_key: productKey,
        amount: product.amount,
        credits: product.credits,
        buyer_email: buyerEmail || null,
        status: 'pending',
      });
      res.json({
        paymentId,
        productKey,
        amount: product.amount,
        credits: product.credits,
        orderName: product.orderName,
        billingMode: 'one_time',
      });
    } catch (e) {
      console.error('[ai-credits/checkout/prepare]', e);
      const msg = String(e.message || '');
      if (msg.includes('ai_credit_orders') && (msg.includes('404') || msg.includes('PGRST'))) {
        res.status(503).json({
          error: 'ai_credit_orders 테이블이 없습니다. database/ai_credit_orders.sql 을 실행해 주세요.',
        });
        return;
      }
      if (msg.includes('ai_credits_bonus') || msg.includes('calendar_pass_until')) {
        res.status(503).json({
          error: 'profiles 컬럼이 없습니다. database/ai_credit_orders.sql 을 실행해 주세요.',
        });
        return;
      }
      res.status(500).json({ error: 'prepare_failed' });
    }
  });

  app.post('/api/ai-credits/checkout/confirm', async (req, res) => {
    if (!ordersConfigured()) {
      res.status(503).json({ error: 'server_not_configured' });
      return;
    }
    if (!portoneConfigured()) {
      res.status(503).json({ error: 'portone_not_configured' });
      return;
    }

    const userId = await getUserIdFromAuth(req.headers.authorization);
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
      if (order.user_id !== userId) {
        res.status(403).json({ ok: false, error: 'forbidden' });
        return;
      }

      const result = await fulfillAiCreditOrder(paymentId);
      if (!result.ok) {
        const status = result.error === 'order_not_found' ? 404 : 400;
        res.status(status).json(result);
        return;
      }
      res.json(result);
    } catch (e) {
      console.error('[ai-credits/checkout/confirm]', e);
      res.status(502).json({ error: 'confirm_failed' });
    }
  });
}

module.exports = {
  AI_ONETIME_PRODUCTS,
  publicProducts,
  isAiCreditPaymentId,
  aiOneTimeEnabled,
  fulfillAiCreditOrder,
  registerAiOneTimeRoutes,
};
