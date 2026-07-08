/**
 * 신규 회원가입 → 관리자 전용 알림 (고객에게는 발송하지 않음)
 *
 * Render 환경변수 (하나 이상):
 *   Telegram: SIGNUP_NOTIFY_TELEGRAM_BOT_TOKEN + SIGNUP_NOTIFY_TELEGRAM_CHAT_ID
 *   Email (SMTP): SIGNUP_NOTIFY_EMAIL_TO + SMTP_HOST + SMTP_USER + SMTP_PASS
 *   Email (Resend): SIGNUP_NOTIFY_EMAIL_TO + RESEND_API_KEY + SIGNUP_NOTIFY_EMAIL_FROM
 *   (선택) Discord/Slack: SIGNUP_NOTIFY_WEBHOOK_URL
 */

const nodemailer = require('nodemailer');

function kstNow() {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function providerLabel(user) {
  const providers = user?.app_metadata?.providers;
  if (Array.isArray(providers) && providers.length) {
    return providers.join(', ');
  }
  const p = user?.app_metadata?.provider;
  if (p) return String(p);
  if (user?.email?.includes('@oauth.8code.kr')) return 'naver';
  return 'email';
}

function buildSignupMessage({ email, fullName, userId, provider, plan }) {
  const lines = [
    '🎉 팔자연구소 신규 회원가입',
    '',
    `이메일: ${email || '(없음)'}`,
    `이름: ${fullName || '-'}`,
    `플랜: ${plan || 'free'}`,
    `가입 경로: ${provider || 'email'}`,
    `시간: ${kstNow()} (KST)`,
    `userId: ${userId}`,
  ];
  return lines.join('\n');
}

function parseAdminEmails() {
  return String(process.env.SIGNUP_NOTIFY_EMAIL_TO || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasTelegramConfig() {
  return !!(
    process.env.SIGNUP_NOTIFY_TELEGRAM_BOT_TOKEN &&
    process.env.SIGNUP_NOTIFY_TELEGRAM_CHAT_ID
  );
}

function hasEmailConfig() {
  const to = parseAdminEmails();
  if (!to.length) return false;
  const resend = !!process.env.RESEND_API_KEY;
  const smtp = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
  return resend || smtp;
}

function hasAnyNotifyChannel() {
  return !!(
    String(process.env.SIGNUP_NOTIFY_WEBHOOK_URL || '').trim() ||
    hasTelegramConfig() ||
    hasEmailConfig()
  );
}

async function fetchAuthUser(userId) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key || !userId) return null;
  try {
    const res = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function postWebhook(url, message) {
  const isDiscord = /discord(app)?\.com/i.test(url);
  const body = isDiscord
    ? { content: message }
    : { text: message, content: message };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`webhook ${res.status}: ${t.slice(0, 200)}`);
  }
}

async function postTelegram(message) {
  const token = process.env.SIGNUP_NOTIFY_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.SIGNUP_NOTIFY_TELEGRAM_CHAT_ID;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`telegram ${res.status}: ${t.slice(0, 200)}`);
  }
}

async function postResendEmail({ to, subject, text }) {
  const from = process.env.SIGNUP_NOTIFY_EMAIL_FROM || '팔자연구소 <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`resend ${res.status}: ${t.slice(0, 200)}`);
  }
}

let smtpTransporter;
function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return smtpTransporter;
}

async function postSmtpEmail({ to, subject, text }) {
  const from = process.env.SIGNUP_NOTIFY_EMAIL_FROM || process.env.SMTP_USER;
  await getSmtpTransporter().sendMail({ from, to, subject, text });
}

async function postAdminEmail(message, signupEmail) {
  const to = parseAdminEmails();
  const subject = `[팔자연구소] 신규 회원가입${signupEmail ? ` — ${signupEmail}` : ''}`;
  if (process.env.RESEND_API_KEY) {
    await postResendEmail({ to, subject, text: message });
    return 'email-resend';
  }
  await postSmtpEmail({ to, subject, text: message });
  return 'email-smtp';
}

async function notifyNewSignup({ userId, fullName, plan }) {
  if (!hasAnyNotifyChannel()) {
    console.warn('[signup-notify] 관리자 알림 채널 미설정 (Telegram / Email / Webhook)');
    return { ok: false, skipped: true };
  }

  const authUser = await fetchAuthUser(userId);
  const signupEmail = authUser?.email || null;
  const message = buildSignupMessage({
    userId,
    fullName,
    plan: plan || 'free',
    email: signupEmail,
    provider: providerLabel(authUser),
  });

  const results = [];
  const webhookUrl = String(process.env.SIGNUP_NOTIFY_WEBHOOK_URL || '').trim();
  if (webhookUrl) {
    await postWebhook(webhookUrl, message);
    results.push('webhook');
  }
  if (hasTelegramConfig()) {
    await postTelegram(message);
    results.push('telegram');
  }
  if (hasEmailConfig()) {
    results.push(await postAdminEmail(message, signupEmail));
  }

  console.log('[signup-notify] admin only', userId, results.join('+'));
  return { ok: true, channels: results };
}

function extractSignupWebhookToken(req) {
  const auth = req.headers.authorization || '';
  const bearer =
    typeof auth === 'string'
      ? auth.startsWith('Bearer ')
        ? auth.slice(7)
        : auth
      : '';

  return (
    req.query?.secret ||
    req.headers['x-signup-secret'] ||
    req.headers['x_signup_secret'] ||
    req.headers['xsignupsecret'] ||
    bearer ||
    ''
  );
}

function verifySignupWebhookSecret(req) {
  const secret = process.env.SIGNUP_WEBHOOK_SECRET;
  // 디버깅/초기 세팅 시 secret이 비어 있으면 webhook 검증을 스킵합니다.
  // (이 상태로 운영하지 말고, 최종적으로 SIGNUP_WEBHOOK_SECRET을 꼭 설정하세요.)
  if (!secret) {
    console.warn('[signup-notify] SIGNUP_WEBHOOK_SECRET 미설정 → webhook 검증 스킵');
    return true;
  }

  const token = String(extractSignupWebhookToken(req) || '').trim();
  if (!token) {
    // Supabase Database Webhook은 커스텀 HTTP 헤더를 전달하지 않는 경우가 많아
    // URL 쿼리 ?secret=... 방식을 권장합니다.
    console.warn('[signup-notify] webhook secret missing', {
      hasQuerySecret: !!req.query?.secret,
      hasAuthorization: !!req.headers.authorization,
      hasXSignupSecret: !!req.headers['x-signup-secret'],
    });
    return false;
  }

  return token === secret;
}

function registerSignupNotifyRoutes(app) {
  app.post('/api/webhooks/signup', async (req, res) => {
    // Webhook이 실제로 들어오는지/바디가 파싱되는지 즉시 확인용 로그
    console.log('[webhooks/signup] hit', {
      contentType: req.headers['content-type'] || null,
      hasBody: !!req.body,
      hasQuerySecret: !!req.query?.secret,
      hasAuthorization: !!req.headers.authorization,
      hasXSignupSecret: !!req.headers['x-signup-secret'],
    });
    if (!verifySignupWebhookSecret(req)) {
      console.warn('[webhooks/signup] unauthorized', {
        hasAuthorization: !!req.headers.authorization,
        hasXSignupSecret: !!req.headers['x-signup-secret'],
      });
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    // Supabase payload shape varies by configuration.
    // Typical: { record: { id, full_name, plan, ... } }
    // Sometimes: { record: { new: { ... } } } or other nesting.
    const record = body?.record ?? body;
    const newRecord = record?.new ?? record;

    const userId = String(
      newRecord?.id || record?.id || body?.id || record?.user_id || body?.user_id || '',
    ).trim();
    if (!userId) {
      console.warn('[webhooks/signup] missing record.id', {
        bodyType: Array.isArray(body) ? 'array' : typeof body,
        bodyKeys: body && typeof body === 'object' ? Object.keys(body).slice(0, 25) : null,
        recordKeys: record && typeof record === 'object' ? Object.keys(record).slice(0, 25) : null,
      });
      res.status(400).json({ error: 'record.id required' });
      return;
    }

    try {
      const result = await notifyNewSignup({
        userId,
        fullName: newRecord?.full_name || record?.full_name || '',
        plan: newRecord?.plan || record?.plan || 'free',
      });
      res.json({ ok: true, ...result });
    } catch (e) {
      console.error('[webhooks/signup]', e);
      res.status(500).json({ error: '알림 전송 실패' });
    }
  });
}

module.exports = {
  registerSignupNotifyRoutes,
  notifyNewSignup,
  buildSignupMessage,
};
