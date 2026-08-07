/**
 * PortOne V2 웹훅 서명 검증 (Standard Webhooks)
 * @see https://developers.portone.io/opi/ko/integration/webhook/readme-v2
 */
const crypto = require('crypto');

const WEBHOOK_TOLERANCE_SEC = 5 * 60;
const WHSEC_PREFIX = 'whsec_';

class WebhookVerificationError extends Error {
  constructor(reason, message) {
    super(message || reason);
    this.name = 'WebhookVerificationError';
    this.reason = reason;
  }
}

function findHeader(headers, name) {
  if (!headers || typeof headers !== 'object') return undefined;
  const want = name.toLowerCase();
  let found;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== want) continue;
    const list = Array.isArray(value) ? value : [value];
    for (const v of list) {
      if (v == null) continue;
      if (typeof v !== 'string') return undefined;
      if (found !== undefined) return undefined;
      found = v;
    }
  }
  return found;
}

function decodeSecret(secret) {
  if (secret instanceof Buffer || secret instanceof Uint8Array) {
    return Buffer.from(secret);
  }
  if (typeof secret !== 'string' || !secret) {
    throw new WebhookVerificationError('INVALID_SECRET', '웹훅 시크릿이 없습니다.');
  }
  const b64 = secret.startsWith(WHSEC_PREFIX) ? secret.slice(WHSEC_PREFIX.length) : secret;
  try {
    const buf = Buffer.from(b64, 'base64');
    if (!buf.length) throw new Error('empty');
    return buf;
  } catch {
    throw new WebhookVerificationError('INVALID_SECRET', '웹훅 시크릿이 올바른 Base64가 아닙니다.');
  }
}

function verifyTimestamp(timestampHeader) {
  const now = Math.floor(Date.now() / 1000);
  const timestamp = Number.parseInt(timestampHeader, 10);
  if (Number.isNaN(timestamp)) {
    throw new WebhookVerificationError('INVALID_SIGNATURE', '타임스탬프가 유효하지 않습니다.');
  }
  if (now - timestamp > WEBHOOK_TOLERANCE_SEC) {
    throw new WebhookVerificationError('TIMESTAMP_TOO_OLD', '웹훅 타임스탬프가 만료되었습니다.');
  }
  if (timestamp > now + WEBHOOK_TOLERANCE_SEC) {
    throw new WebhookVerificationError('TIMESTAMP_TOO_NEW', '웹훅 타임스탬프가 미래입니다.');
  }
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * @param {string|Buffer|Uint8Array} secret PORTONE_WEBHOOK_SECRET (whsec_… 또는 base64)
 * @param {string} payload 원문 JSON 문자열 (파싱 전)
 * @param {Record<string, string|string[]|undefined>} headers
 * @returns {object} 검증된 후 JSON.parse 된 본문
 */
function verifyPortOneWebhook(secret, payload, headers) {
  if (typeof payload !== 'string') {
    throw new WebhookVerificationError('INVALID_PAYLOAD', 'payload는 string이어야 합니다.');
  }

  const msgId = findHeader(headers, 'webhook-id');
  const msgSignature = findHeader(headers, 'webhook-signature');
  const msgTimestamp = findHeader(headers, 'webhook-timestamp');
  if (!msgId || !msgSignature || !msgTimestamp) {
    throw new WebhookVerificationError('MISSING_REQUIRED_HEADERS', '필수 웹훅 헤더가 없습니다.');
  }

  verifyTimestamp(msgTimestamp);

  const key = decodeSecret(secret);
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${msgId}.${msgTimestamp}.${payload}`, 'utf8')
    .digest();

  for (const versioned of msgSignature.split(' ')) {
    const parts = versioned.split(',');
    if (parts.length < 2) continue;
    const [version, signatureB64] = parts;
    if (version !== 'v1') continue;
    let decoded;
    try {
      decoded = Buffer.from(signatureB64, 'base64');
    } catch {
      continue;
    }
    if (decoded.length === expected.length && crypto.timingSafeEqual(decoded, expected)) {
      try {
        return JSON.parse(payload);
      } catch {
        throw new WebhookVerificationError('INVALID_PAYLOAD', '본문 JSON 파싱 실패');
      }
    }
  }

  throw new WebhookVerificationError('NO_MATCHING_SIGNATURE', '웹훅 시그니처가 일치하지 않습니다.');
}

/** 환경변수에서 시크릿 목록 (교체용 보조 시크릿 지원) */
function webhookSecretsFromEnv() {
  const primary = String(process.env.PORTONE_WEBHOOK_SECRET || '').trim();
  const secondary = String(process.env.PORTONE_WEBHOOK_SECRET_PREV || '').trim();
  return [primary, secondary].filter(Boolean);
}

/**
 * 등록된 시크릿 중 하나로 검증. 시크릿이 없으면 null 반환(호출측에서 거부).
 */
function verifyWithConfiguredSecrets(payload, headers) {
  const secrets = webhookSecretsFromEnv();
  if (!secrets.length) return null;

  let lastErr = null;
  for (const secret of secrets) {
    try {
      return { ok: true, event: verifyPortOneWebhook(secret, payload, headers) };
    } catch (e) {
      lastErr = e;
      if (e instanceof WebhookVerificationError && e.reason === 'INVALID_SECRET') {
        continue;
      }
      // 헤더/타임스탬프 문제는 시크릿을 바꿔도 동일 → 즉시 실패
      if (
        e instanceof WebhookVerificationError &&
        (e.reason === 'MISSING_REQUIRED_HEADERS' ||
          e.reason === 'TIMESTAMP_TOO_OLD' ||
          e.reason === 'TIMESTAMP_TOO_NEW' ||
          e.reason === 'INVALID_PAYLOAD')
      ) {
        throw e;
      }
    }
  }
  throw lastErr || new WebhookVerificationError('NO_MATCHING_SIGNATURE', '웹훅 시그니처가 일치하지 않습니다.');
}

module.exports = {
  WebhookVerificationError,
  verifyPortOneWebhook,
  verifyWithConfiguredSecrets,
  webhookSecretsFromEnv,
  timingSafeEqualStr,
};
