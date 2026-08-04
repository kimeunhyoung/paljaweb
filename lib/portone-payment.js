const { parsePlanOrderId, amountMatchesPlan } = require('./plan-billing');
const {
  fetchPortOnePayment,
  readPaymentTotal,
  testPaymentBlockReason,
} = require('./portone-client');

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

/**
 * 건별(일회성) 결제 전용 공개 설정.
 * KPN은 정기결제와 일반결제의 MID(=채널)가 다를 수 있어 채널키를 분리한다.
 * PORTONE_ONETIME_CHANNEL_KEY 미설정 시 기존 채널키로 폴백(단일 채널 운영).
 */
function portoneOneTimePublicConfig() {
  return {
    storeId: process.env.PORTONE_STORE_ID || '',
    channelKey: process.env.PORTONE_ONETIME_CHANNEL_KEY || process.env.PORTONE_CHANNEL_KEY || '',
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

function registerPortOneRoutes(app, planBilling, getUserIdFromAuth, checkoutStore, profileDeps = {}) {
  const resolveCtx = checkoutStore?.resolvePaymentContext;
  const fulfillDeps = {
    getProfile: profileDeps.getProfile,
    patchProfileFields: profileDeps.patchProfileFields,
  };

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

    const userId = await getUserIdFromAuth(req.headers.authorization);
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
        const alreadyApplied = checkoutStore?.findAppliedPayment
          ? await checkoutStore.findAppliedPayment(paymentId, userId)
          : false;
        if (alreadyApplied) {
          const profile = checkoutStore?.getProfile
            ? await checkoutStore.getProfile(userId)
            : null;
          if (profile?.plan && profile.plan !== 'free') {
            res.json({ ok: true, plan: profile.plan, skipped: true });
            return;
          }
        }
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

      const testBlock = testPaymentBlockReason(payment);
      if (testBlock) {
        console.warn('[portone confirm] blocked test payment', paymentId);
        res.status(400).json({ error: testBlock, testPayment: true });
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
            const testBlock = testPaymentBlockReason(payment);
            if (testBlock) {
              console.warn('[portone webhook] blocked test payment', paymentId, testBlock);
              res.sendStatus(200);
              return;
            }
            let ctx = null;
            if (resolveCtx) {
              try {
                ctx = await resolveCtx(paymentId, null);
              } catch (_) {
                ctx = null;
              }
            }
            if (ctx) {
              const total = readPaymentTotal(payment);
              const billingKey = payment.billingKey || payment.billing_key;
              if (billingKey) {
                await planBilling.activateSubscription(
                  ctx.userId,
                  ctx.plan,
                  ctx.cycle,
                  paymentId,
                  billingKey,
                  total,
                );
              } else {
                await planBilling.applyPlanPaymentSuccess(paymentId, paymentId, total, ctx);
              }
              if (checkoutStore?.deletePending) {
                await checkoutStore.deletePending(paymentId).catch(() => {});
              }
            } else {
              const { isLifecodePaymentId, fulfillLifecodeOrder } = require('./lifecode-one-time');
              if (isLifecodePaymentId(paymentId)) {
                await fulfillLifecodeOrder(paymentId, fulfillDeps).catch((e) => {
                  console.error('[portone webhook] lifecode fulfill', e);
                });
              } else {
                const { isAiCreditPaymentId, fulfillAiCreditOrder } = require('./ai-one-time');
                if (isAiCreditPaymentId(paymentId)) {
                  await fulfillAiCreditOrder(paymentId).catch((e) => {
                    console.error('[portone webhook] ai-credit fulfill', e);
                  });
                }
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
  portoneOneTimePublicConfig,
  portoneConfigStatus,
  registerPortOneRoutes,
};
