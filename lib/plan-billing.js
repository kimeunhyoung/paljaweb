const PLAN_AMOUNTS = {
  basic: { monthly: 9900, annual: 7920 * 12 },
  pro: { monthly: 19900, annual: 15920 * 12 },
  professional: { monthly: 49900, annual: 39920 * 12 },
};

const ORDER_PREFIX = {
  basic: 'pbas',
  pro: 'pmid',
  professional: 'ppro',
};

const PREFIX_TO_PLAN = {
  pbas: 'basic',
  pmid: 'pro',
  ppro: 'professional',
};

function allValidAmounts() {
  const set = new Set();
  for (const cfg of Object.values(PLAN_AMOUNTS)) {
    set.add(cfg.monthly);
    set.add(cfg.annual);
  }
  return set;
}

function parsePlanOrderId(orderId) {
  const s = String(orderId);
  const m = s.match(/^(pbas|pmid|ppro)_([ma])_([0-9a-f]{32})_/i);
  if (m) {
    const prefix = m[1].toLowerCase();
    const h = m[3].toLowerCase();
    const userId =
      `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    return {
      plan: PREFIX_TO_PLAN[prefix],
      userId,
      cycle: m[2].toLowerCase() === 'a' ? 'annual' : 'monthly',
    };
  }
  if (/^palja_pro_/i.test(s)) return { legacy: true, plan: 'professional' };
  return null;
}

/** @deprecated use parsePlanOrderId */
function parseProfessionalOrderId(orderId) {
  return parsePlanOrderId(orderId);
}

function amountMatchesPlan(amount, plan, cycle) {
  const cfg = PLAN_AMOUNTS[plan];
  if (!cfg) return false;
  const n = Number(amount);
  if (cycle === 'annual') return n === cfg.annual;
  return n === cfg.monthly;
}

function addSubscriptionPeriod(fromDate, cycle) {
  const d = new Date(fromDate.getTime());
  if (cycle === 'annual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

function buildOrderId(plan, cycle, userId) {
  const prefix = ORDER_PREFIX[plan];
  if (!prefix) throw new Error('invalid plan');
  const uidCompact = String(userId).replace(/-/g, '');
  const cycleTag = cycle === 'annual' ? 'a' : 'm';
  return `${prefix}_${cycleTag}_${uidCompact}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createPlanBilling(deps) {
  const { patchProfileFields, getProfile, insertAppliedPaymentKey } = deps;

  async function extendPlanForUser(userId, plan, cycle, paymentKey) {
    const profile = await getProfile(userId);
    const curUntil = profile?.plan_active_until ? new Date(profile.plan_active_until) : null;
    const now = new Date();
    const baseDate = curUntil && curUntil > now ? curUntil : now;
    const until = addSubscriptionPeriod(baseDate, cycle);
    await patchProfileFields(userId, {
      plan,
      plan_active_until: until.toISOString(),
      professional_payment_key: paymentKey,
    });
  }

  async function downgradeToFree(userId, paymentKey) {
    const profile = await getProfile(userId);
    if (!profile || profile.plan === 'free') return;
    if (paymentKey && profile.professional_payment_key !== paymentKey) return;
    await patchProfileFields(userId, {
      plan: 'free',
      plan_active_until: null,
      professional_payment_key: null,
      toss_billing_key: null,
    });
  }

  async function downgradeByBillingKey(billingKey) {
    const base = process.env.SUPABASE_URL.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const fr = await fetch(
      `${base}/rest/v1/profiles?toss_billing_key=eq.${encodeURIComponent(billingKey)}&select=id,plan`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );
    const rows = await fr.json();
    for (const row of rows || []) {
      if (row.plan && row.plan !== 'free') {
        await patchProfileFields(row.id, {
          plan: 'free',
          plan_active_until: null,
          professional_payment_key: null,
          toss_billing_key: null,
        });
      }
    }
  }

  async function applyPlanPaymentSuccess(paymentKey, orderId, totalAmount) {
    const parsed = parsePlanOrderId(orderId);
    if (!parsed || parsed.legacy || !parsed.userId || !parsed.plan) {
      console.warn('[palja] skip apply: orderId format', orderId);
      return { ok: false, reason: 'order_format' };
    }
    const amt = Number(totalAmount);
    if (!amountMatchesPlan(amt, parsed.plan, parsed.cycle)) {
      console.warn('[palja] amount/plan mismatch', amt, parsed.plan, parsed.cycle);
      return { ok: false, reason: 'amount' };
    }
    const claimed = await insertAppliedPaymentKey(paymentKey, parsed.userId, orderId);
    if (!claimed) return { ok: true, skipped: true, plan: parsed.plan };
    await extendPlanForUser(parsed.userId, parsed.plan, parsed.cycle, paymentKey);
    return { ok: true, plan: parsed.plan };
  }

  return {
    extendPlanForUser,
    downgradeToFree,
    downgradeByBillingKey,
    applyPlanPaymentSuccess,
  };
}

module.exports = {
  PLAN_AMOUNTS,
  allValidAmounts,
  parsePlanOrderId,
  parseProfessionalOrderId,
  amountMatchesPlan,
  addSubscriptionPeriod,
  buildOrderId,
  createPlanBilling,
};
