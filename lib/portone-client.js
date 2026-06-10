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
  readPaymentTotal,
  confirmBillingKeyIssue,
  payWithBillingKey,
  deleteBillingKey,
  waitForPaymentPaid,
};
