const PLAN_AMOUNTS = {
  basic: { monthly: 9900, annual: 7920 * 12 },
  pro: { monthly: 29900, annual: 23920 * 12 },
  professional: { monthly: 39900, annual: 31920 * 12 },
};

const ORDER_PREFIX = {
  basic: 'pbas',
  pro: 'pmid',
  professional: 'ppro',
};

/** 빌링키 발급용 issueId prefix (KPN 32byte 제한) */
const ISSUE_PREFIX = {
  basic: 'kbas',
  pro: 'kmid',
  professional: 'kpro',
};

const PREFIX_TO_PLAN = {
  pbas: 'basic',
  pmid: 'pro',
  ppro: 'professional',
};

/** KPN PG MxIssueNO 최대 32byte */
const KPN_PAYMENT_ID_MAX = 32;

function randomAlnum(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < length; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function buildShortId(prefix, cycle) {
  const cycleTag = cycle === 'annual' ? 'a' : 'm';
  const tailLen = KPN_PAYMENT_ID_MAX - prefix.length - cycleTag.length;
  return `${prefix}${cycleTag}${randomAlnum(tailLen)}`;
}

function buildShortPaymentId(plan, cycle) {
  const prefix = ORDER_PREFIX[plan];
  if (!prefix) throw new Error('invalid plan');
  return buildShortId(prefix, cycle);
}

function buildShortIssueId(plan, cycle) {
  const prefix = ISSUE_PREFIX[plan];
  if (!prefix) throw new Error('invalid plan');
  return buildShortId(prefix, cycle);
}

function allValidAmounts() {
  const set = new Set();
  for (const cfg of Object.values(PLAN_AMOUNTS)) {
    set.add(cfg.monthly);
    set.add(cfg.annual);
  }
  return set;
}

function planFromOrderMatch(m) {
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

function parsePlanOrderId(orderId) {
  const s = String(orderId);
  // Short id (≤32): plan/cycle in prefix; user_id from checkout_pending
  const short = s.match(/^(pbas|pmid|ppro)([ma])([a-z0-9]*)$/i);
  if (short && s.length <= KPN_PAYMENT_ID_MAX) {
    return {
      plan: PREFIX_TO_PLAN[short[1].toLowerCase()],
      cycle: short[2].toLowerCase() === 'a' ? 'annual' : 'monthly',
      short: true,
    };
  }
  // Legacy long id (PortOne alphanumeric)
  let m = s.match(/^(pbas|pmid|ppro)([ma])([0-9a-f]{32})(\d+[a-z0-9]*)$/i);
  if (m) return planFromOrderMatch(m);
  m = s.match(/^(pbas|pmid|ppro)_([ma])_([0-9a-f]{32})_/i);
  if (m) return planFromOrderMatch(m);
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

function buildOrderId(plan, cycle) {
  return buildShortPaymentId(plan, cycle);
}

function createPlanBilling(deps) {
  const { patchProfileFields, getProfile, insertAppliedPaymentKey } = deps;

  async function extendPlanForUser(userId, plan, cycle, paymentKey, extra = {}) {
    const profile = await getProfile(userId);
    const curUntil = profile?.plan_active_until ? new Date(profile.plan_active_until) : null;
    const now = new Date();
    const baseDate = curUntil && curUntil > now ? curUntil : now;
    const until = addSubscriptionPeriod(baseDate, cycle);
    const fields = {
      plan,
      plan_active_until: until.toISOString(),
      professional_payment_key: paymentKey,
      subscription_cycle: cycle,
      subscription_cancel_at_period_end: false,
      ...extra,
    };
    await patchProfileFields(userId, fields);
    return until;
  }

  async function activateSubscription(userId, plan, cycle, paymentKey, billingKey) {
    return extendPlanForUser(userId, plan, cycle, paymentKey, {
      toss_billing_key: billingKey,
      subscription_cancel_at_period_end: false,
    });
  }

  async function markSubscriptionCancelled(userId) {
    await patchProfileFields(userId, {
      subscription_cancel_at_period_end: true,
    });
  }

  async function clearSubscriptionBilling(userId) {
    await patchProfileFields(userId, {
      plan: 'free',
      plan_active_until: null,
      professional_payment_key: null,
      toss_billing_key: null,
      subscription_cycle: null,
      subscription_cancel_at_period_end: false,
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

  async function applyPlanPaymentSuccess(paymentKey, orderId, totalAmount, ctx) {
    let userId;
    let plan;
    let cycle;
    if (ctx?.userId && ctx?.plan) {
      userId = ctx.userId;
      plan = ctx.plan;
      cycle = ctx.cycle || 'monthly';
    } else {
      const parsed = parsePlanOrderId(orderId);
      if (!parsed || parsed.legacy || parsed.short || !parsed.userId || !parsed.plan) {
        console.warn('[palja] skip apply: orderId format', orderId);
        return { ok: false, reason: 'order_format' };
      }
      userId = parsed.userId;
      plan = parsed.plan;
      cycle = parsed.cycle;
    }
    const amt = Number(totalAmount);
    if (!amountMatchesPlan(amt, plan, cycle)) {
      console.warn('[palja] amount/plan mismatch', amt, plan, cycle);
      return { ok: false, reason: 'amount' };
    }
    const claimed = await insertAppliedPaymentKey(paymentKey, userId, orderId);
    if (!claimed) return { ok: true, skipped: true, plan };
    await extendPlanForUser(userId, plan, cycle, paymentKey);
    return { ok: true, plan };
  }

  return {
    extendPlanForUser,
    activateSubscription,
    markSubscriptionCancelled,
    clearSubscriptionBilling,
    downgradeToFree,
    downgradeByBillingKey,
    applyPlanPaymentSuccess,
  };
}

module.exports = {
  PLAN_AMOUNTS,
  ORDER_PREFIX,
  ISSUE_PREFIX,
  KPN_PAYMENT_ID_MAX,
  allValidAmounts,
  parsePlanOrderId,
  parseProfessionalOrderId,
  amountMatchesPlan,
  addSubscriptionPeriod,
  buildOrderId,
  buildShortPaymentId,
  buildShortIssueId,
  createPlanBilling,
};
