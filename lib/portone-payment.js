const { parsePlanOrderId, amountMatchesPlan } = require('./plan-billing');

function portoneConfigured() {
  return !!(
    process.env.PORTONE_API_SECRET &&
    process.env.PORTONE_STORE_ID &&
    process.env.PORTONE_CHANNEL_KEY
  );
}

function portonePublicConfig() {
  return {
    storeId: process.env.PORTONE_STORE_ID || '',
    channelKey: process.env.PORTONE_CHANNEL_KEY || '',
  };
}

function portoneConfigStatus() {
  return {
    configured: portoneConfigured(),
    hasStoreId: !!process.env.PORTONE_STORE_ID,
    hasChannelKey: !!process.env.PORTONE_CHANNEL_KEY,
    hasApiSecret: !!process.env.PORTONE_API_SECRET,
    hasWebhookSecret: !!process.env.PORTONE_WEBHOOK_SECRET,
  };
}

async function fetchPortOnePayment(paymentId) {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) throw new Error('PORTONE_API_SECRET missing');
  const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `PortOne ${secret}`,
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.type || `portone getPayment ${res.status}`);
  }
  return json;
}

function readPaymentTotal(payment) {
  if (payment?.amount?.total != null) return Number(payment.amount.total);
  if (payment?.amount?.paid != null) return Number(payment.amount.paid);
  if (typeof payment?.amount === 'number') return Number(payment.amount);
  return NaN;
}

function registerPortOneRoutes(app, planBilling, getUserIdFromAuth, checkoutStore) {
  const resolveCtx = checkoutStore?.resolvePaymentContext;
  app.get('/api/portone/status', (_req, res) => {
    res.json(portoneConfigStatus());
  });

  app.post('/api/portone/confirm', async (req, res) => {
    if (!portoneConfigured()) {
      res.status(503).json({ error: 'PortOne 결제 설정이 완료되지 않았습니다.' });
      return;
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      res.status(503).json({ error: 'Supabase server config missing' });
      return;
    }

    const userId = getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Invalid or missing session' });
      return;
    }

    const paymentId = String(req.body?.paymentId || '').trim();
    if (!paymentId) {
      res.status(400).json({ error: 'paymentId required' });
      return;
    }

    let ctx = null;
    if (resolveCtx) {
      try {
        ctx = await resolveCtx(paymentId, userId);
      } catch (e) {
        console.error('[portone confirm] resolve', e);
        res.status(400).json({ error: 'Invalid or expired checkout session' });
        return;
      }
    } else {
      const parsed = parsePlanOrderId(paymentId);
      if (!parsed || parsed.legacy || parsed.short || !parsed.userId || !parsed.plan) {
        res.status(400).json({ error: 'Unsupported paymentId format' });
        return;
      }
      if (parsed.userId !== userId) {
        res.status(403).json({ error: 'Payment does not match signed-in user' });
        return;
      }
      ctx = { userId: parsed.userId, plan: parsed.plan, cycle: parsed.cycle };
    }

    try {
      const payment = await fetchPortOnePayment(paymentId);
      if (payment.status !== 'PAID') {
        res.status(400).json({ error: 'Payment not completed', status: payment.status });
        return;
      }

      const total = readPaymentTotal(payment);
      if (!Number.isFinite(total) || !amountMatchesPlan(total, ctx.plan, ctx.cycle)) {
        res.status(400).json({ error: 'Payment amount mismatch' });
        return;
      }

      const applyResult = await planBilling.applyPlanPaymentSuccess(paymentId, paymentId, total, ctx);
      if (!applyResult.ok && !applyResult.skipped) {
        res.status(400).json({ error: 'Could not apply plan', reason: applyResult.reason });
        return;
      }

      if (checkoutStore?.deletePending) {
        await checkoutStore.deletePending(paymentId).catch(() => {});
      }

      res.json({ ok: true, plan: applyResult.plan || ctx.plan, skipped: !!applyResult.skipped });
    } catch (e) {
      console.error('[portone confirm]', e);
      res.status(502).json({ error: 'PortOne payment verification failed' });
    }
  });

  app.post('/api/portone/webhook', async (req, res) => {
    if (!portoneConfigured()) {
      res.sendStatus(503);
      return;
    }

    try {
      const event = req.body || {};

      if (event.type === 'Transaction.Paid' || event.type === 'Transaction.VirtualAccountIssued') {
        const paymentId = event.data?.paymentId;
        if (paymentId) {
          const payment = await fetchPortOnePayment(paymentId);
          if (payment.status === 'PAID') {
            let ctx = null;
            if (resolveCtx) {
              try {
                ctx = await resolveCtx(paymentId, null);
              } catch (_) {
                ctx = null;
              }
            }
            if (ctx) {
              await planBilling.applyPlanPaymentSuccess(
                paymentId,
                paymentId,
                readPaymentTotal(payment),
                ctx,
              );
              if (checkoutStore?.deletePending) {
                await checkoutStore.deletePending(paymentId).catch(() => {});
              }
            }
          }
        }
        res.sendStatus(200);
        return;
      }

      if (event.type === 'Transaction.Cancelled') {
        const paymentId = event.data?.paymentId;
        if (paymentId) {
          let uid = null;
          if (resolveCtx) {
            try {
              const ctx = await resolveCtx(paymentId, null);
              uid = ctx?.userId;
            } catch (_) {}
          }
          if (!uid) {
            const parsed = parsePlanOrderId(paymentId);
            uid = parsed?.userId;
          }
          if (uid) {
            await planBilling.downgradeToFree(uid, paymentId);
          }
        }
        res.sendStatus(200);
        return;
      }

      res.sendStatus(200);
    } catch (e) {
      console.error('[portone webhook]', e);
      res.sendStatus(500);
    }
  });
}

module.exports = {
  portoneConfigured,
  portonePublicConfig,
  portoneConfigStatus,
  registerPortOneRoutes,
};
