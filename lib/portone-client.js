const PORTONE_API = 'https://api.portone.io';

function requireSecret() {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) throw new Error('PORTONE_API_SECRET missing');
  return secret;
}

async function portoneRequest(path, options = {}) {
  const secret = requireSecret();
  const res = await fetch(`${PORTONE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `PortOne ${secret}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.message || json.type || json.pgMessage || `PortOne ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function fetchPortOnePayment(paymentId) {
  return portoneRequest(`/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });
}

function allowTestPlanActivation() {
  const v = (process.env.ALLOW_TEST_PLAN_ACTIVATION || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** KPN/PortOne 테스트 채널 승인은 PAID로 오지만 실제 출금은 없음 */
function isTestPayment(payment) {
  if (!payment) return false;
  if (payment.isTest === true || payment.test === true) return true;
  const channelType = String(payment.channel?.type || payment.channelType || '').toUpperCase();
  if (channelType === 'TEST' || channelType === 'SANDBOX') return true;
  const merchant = String(
    payment.channel?.pgMerchantId ||
    payment.channel?.merchantId ||
    payment.merchantId ||
    '',
  ).toLowerCase();
  if (
    merchant.includes('merchantest') ||
    merchant.startsWith('test_') ||
    merchant.endsWith('_test') ||
    merchant === 'test'
  ) {
    return true;
  }
  if (process.env.PORTONE_TEST_MODE === '1' || process.env.PORTONE_TEST_MODE === 'true') return true;
  return false;
}

/**
 * 테스트/샌드박스 결제로 실상품·요금제를 열지 못하게 막습니다.
 * ALLOW_TEST_PLAN_ACTIVATION=1 이면 허용(스테이징용).
 * @returns {string|null} 차단 사유 또는 null
 */
function testPaymentBlockReason(payment) {
  if (!isTestPayment(payment)) return null;
  if (allowTestPlanActivation()) return null;
  return '테스트 결제는 상품/요금제 활성화에 사용할 수 없습니다.';
}

function readPaymentTotal(payment) {
  if (payment?.amount?.total != null) return Number(payment.amount.total);
  if (payment?.amount?.paid != null) return Number(payment.amount.paid);
  if (typeof payment?.amount === 'number') return Number(payment.amount);
  return NaN;
}

async function confirmBillingKeyIssue({ billingIssueToken, storeId }) {
  return portoneRequest('/billing-keys/confirm', {
    method: 'POST',
    body: JSON.stringify({
      billingIssueToken,
      storeId: storeId || process.env.PORTONE_STORE_ID,
    }),
  });
}

async function payWithBillingKey(paymentId, payload) {
  return portoneRequest(`/payments/${encodeURIComponent(paymentId)}/billing-key`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function deleteBillingKey(billingKey) {
  return portoneRequest(`/billing-keys/${encodeURIComponent(billingKey)}`, {
    method: 'DELETE',
  });
}

async function waitForPaymentPaid(paymentId, { attempts = 12, delayMs = 500 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const payment = await fetchPortOnePayment(paymentId);
    if (payment.status === 'PAID') return payment;
    if (payment.status === 'FAILED' || payment.status === 'CANCELLED') {
      throw new Error(`Payment ${payment.status}`);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error('Payment confirmation timeout');
}

module.exports = {
  portoneRequest,
  fetchPortOnePayment,
  allowTestPlanActivation,
  isTestPayment,
  testPaymentBlockReason,
  readPaymentTotal,
  confirmBillingKeyIssue,
  payWithBillingKey,
  deleteBillingKey,
  waitForPaymentPaid,
};
