const { PLAN_AMOUNTS, computeUpgradeAmount, buildShortPaymentId } = require('./plan-billing');
const {
  confirmBillingKeyIssue,
  payWithBillingKey,
  waitForPaymentPaid,
  readPaymentTotal,
  deleteBillingKey,
  isTestPayment,
  allowTestPlanActivation,
} = require('./portone-client');

const PLAN_ORDER_NAMES = {
  basic: 'Basic 플랜',
  pro: 'Pro 플랜',
  professional: 'Professional 상담사 플랜',
};

function buildCustomerPayload(userId, profile, email) {
  const fullName =
    profile?.full_name ||
    email?.split('@')[0] ||
    '회원';
  return {
    id: userId,
    name: { full: fullName },
    email: email || undefined,
  };
}

function createSubscriptionService(deps) {
  const { planBilling, getProfile, getUserEmail, insertAppliedPaymentKey } = deps;

  async function resolveBillingKey({ billingKey, billingIssueToken }) {
    if (billingKey && billingKey !== 'NEEDS_CONFIRMATION') return billingKey;
    if (!billingIssueToken) {
      throw new Error('빌링키가 없습니다. 카드 등록을 다시 시도해 주세요.');
    }
    const confirmed = await confirmBillingKeyIssue({ billingIssueToken });
    const key = confirmed?.billingKey || confirmed?.billingKeyInfo?.billingKey;
    if (!key || key === 'NEEDS_CONFIRMATION') {
      throw new Error('빌링키 발급 확인에 실패했습니다.');
    }
    return key;
  }

  async function chargeSubscription({ userId, paymentId, plan, cycle, billingKey, email }) {
    const amount = PLAN_AMOUNTS[plan]?.[cycle];
    if (!amount) throw new Error('Invalid plan cycle');

    const profile = await getProfile(userId);
    const customer = buildCustomerPayload(userId, profile, email);

    await payWithBillingKey(paymentId, {
      billingKey,
      orderName: `${PLAN_ORDER_NAMES[plan] || plan} 정기결제`,
      customer,
      amount: { total: amount },
      currency: 'KRW',
      productCount: 1,
    });

    const payment = await waitForPaymentPaid(paymentId);
    const total = readPaymentTotal(payment);
    if (total !== amount) {
      throw new Error('Payment amount mismatch');
    }

    const claimed = await insertAppliedPaymentKey(paymentId, userId, paymentId);
    if (!claimed) {
      return { ok: true, skipped: true, plan };
    }

    await planBilling.activateSubscription(userId, plan, cycle, paymentId, billingKey);
    return { ok: true, plan, cycle };
  }

  async function renewUserSubscription(userId, profile) {
    const plan = profile.plan;
    const cycle = profile.subscription_cycle || 'monthly';
    const billingKey = profile.toss_billing_key;
    if (!plan || plan === 'free' || !billingKey) return { skipped: true, reason: 'no_billing' };
    if (profile.subscription_cancel_at_period_end) return { skipped: true, reason: 'cancelled' };

    const until = profile.plan_active_until ? new Date(profile.plan_active_until) : null;
    if (!until) return { skipped: true, reason: 'no_until' };

    const renewWindow = new Date(until.getTime() - 24 * 60 * 60 * 1000);
    if (new Date() < renewWindow) return { skipped: true, reason: 'not_due' };

    const { buildShortPaymentId } = require('./plan-billing');
    const paymentId = buildShortPaymentId(plan, cycle);
    const email = await getUserEmail(userId);

    try {
      const result = await chargeSubscription({
        userId,
        paymentId,
        plan,
        cycle,
        billingKey,
        email,
      });
      return { ok: true, userId, paymentId, ...result };
    } catch (e) {
      console.error('[subscription renew]', userId, e.message || e);
      return { ok: false, userId, error: e.message || 'renew failed' };
    }
  }

  async function cancelSubscription(userId) {
    const profile = await getProfile(userId);
    if (!profile || profile.plan === 'free') {
      return { ok: true, already: true };
    }
    await planBilling.markSubscriptionCancelled(userId);
    return { ok: true, until: profile.plan_active_until };
  }

  // 상위 플랜 전환 시 결제될 일할 차액을 미리 계산(결제 X)
  async function previewUpgrade(userId, targetPlan) {
    const profile = await getProfile(userId);
    return computeUpgradeAmount(profile, targetPlan);
  }

  // 차액을 저장된 빌링키로 즉시 결제하고 플랜을 격상
  async function upgradeSubscription({ userId, targetPlan, email }) {
    const profile = await getProfile(userId);
    const calc = computeUpgradeAmount(profile, targetPlan);
    if (!calc.ok) {
      const err = new Error(calc.reason);
      err.code = calc.reason;
      throw err;
    }
    if (calc.amount < 100) {
      const err = new Error('amount_too_small');
      err.code = 'amount_too_small';
      throw err;
    }

    const billingKey = profile.toss_billing_key;
    const paymentId = buildShortPaymentId(targetPlan, calc.cycle);
    const customer = buildCustomerPayload(userId, profile, email);

    await payWithBillingKey(paymentId, {
      billingKey,
      orderName: `${PLAN_ORDER_NAMES[targetPlan] || targetPlan} 업그레이드 차액`,
      customer,
      amount: { total: calc.amount },
      currency: 'KRW',
      productCount: 1,
    });

    const payment = await waitForPaymentPaid(paymentId);
    const total = readPaymentTotal(payment);
    if (total !== calc.amount) {
      throw new Error('Payment amount mismatch');
    }

    const claimed = await insertAppliedPaymentKey(paymentId, userId, paymentId);
    if (!claimed) {
      return { ok: true, skipped: true, plan: targetPlan };
    }

    await planBilling.applyPlanUpgrade(userId, targetPlan, paymentId);
    return {
      ok: true,
      plan: targetPlan,
      amount: calc.amount,
      until: profile.plan_active_until,
    };
  }

  async function revokeBillingKey(userId) {
    const profile = await getProfile(userId);
    const key = profile?.toss_billing_key;
    if (key) {
      try {
        await deleteBillingKey(key);
      } catch (e) {
        console.warn('[subscription] delete billing key', e.message || e);
      }
    }
    await planBilling.clearSubscriptionBilling(userId);
    return { ok: true };
  }

  return {
    resolveBillingKey,
    chargeSubscription,
    renewUserSubscription,
    cancelSubscription,
    previewUpgrade,
    upgradeSubscription,
    revokeBillingKey,
  };
}

module.exports = { createSubscriptionService, PLAN_ORDER_NAMES };
