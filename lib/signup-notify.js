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

function buildSignupMessage({ email, fullName, userId, provider, plan, attribution }) {
  const attr = attribution || {};
  const utmParts = [attr.utm_source, attr.utm_medium, attr.utm_campaign].filter(Boolean);
  const lines = [
    '🎉 팔자연구소 신규 회원가입',
    '',
    `이메일: ${email || '(없음)'}`,
    `이름: ${fullName || '-'}`,
    `플랜: ${plan || 'free'}`,
    `가입 경로: ${provider || 'email'}`,
    `유입 페이지: ${attr.signup_landing_page || '-'}`,
    `유입 사이트: ${attr.signup_referrer || '-'}`,
    `UTM: ${utmParts.length ? utmParts.join(' / ') : '-'}`,
    `키워드(utm_term): ${attr.utm_term || '-'}`,
    `시간: ${kstNow()} (KST)`,
    `userId: ${userId}`,
  ];
  return lines.join('\n');
}

function extractAttributionFromRecord(record) {
  if (!record || typeof record !== 'object') return {};
  return {
    signup_landing_page: record.signup_landing_page || null,
    signup_referrer: record.signup_referrer || null,
    utm_source: record.utm_source || null,
    utm_medium: record.utm_medium || null,
    utm_campaign: record.utm_campaign || null,
    utm_term: record.utm_term || null,
    utm_content: record.utm_content || null,
  };
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

function hasUserEmailTransport() {
  const off = String(process.env.USER_WELCOME_EMAIL || '').toLowerCase();
  if (off === '0' || off === 'false' || off === 'no') return false;
  return !!(
    process.env.RESEND_API_KEY ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  );
}

function userEmailFrom() {
  return (
    process.env.USER_EMAIL_FROM ||
    process.env.SIGNUP_NOTIFY_EMAIL_FROM ||
    '팔자연구소 <onboarding@resend.dev>'
  );
}

function buildWelcomeEmail({ fullName }) {
  const name = fullName || '회원';
  const text = [
    `${name}님, 팔자연구소에 오신 것을 환영합니다!`,
    '',
    '지금 바로 시작해 보세요:',
    '· 라이프코드 무료 분석 — https://8code.kr/analysis.html',
    '· 마이페이지에서 생년월일 저장 → 맞춤 분석 자동 실행',
    '· 수비학 달력·소울하모니·48궁합은 Basic부터 이용 가능',
    '',
    '마이페이지: https://8code.kr/dashboard.html',
    '요금제 안내: https://8code.kr/pricing.html',
    '',
    '— 팔자연구소',
  ].join('\n');
  return {
    subject: `${name}님, 팔자연구소에 오신 것을 환영합니다`,
    text,
  };
}

async function postUserEmail({ to, subject, text }) {
  const from = userEmailFrom();
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`resend user ${res.status}: ${t.slice(0, 200)}`);
    }
    return;
  }
  await getSmtpTransporter().sendMail({ from, to, subject, text });
}

async function sendWelcomeEmail({ email, fullName }) {
  if (!hasUserEmailTransport()) return { skipped: true, reason: 'disabled' };
  const to = String(email || '').trim();
  if (!to || !to.includes('@') || to.includes('@oauth.8code.kr')) {
    return { skipped: true, reason: 'no-email' };
  }
  const { subject, text } = buildWelcomeEmail({ fullName });
  await postUserEmail({ to, subject, text });
  return { sent: true, to };
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

async function notifyNewSignup({ userId, fullName, plan, attribution }) {
  const authUser = await fetchAuthUser(userId);
  const signupEmail = authUser?.email || null;
  const results = [];

  try {
    const welcome = await sendWelcomeEmail({ email: signupEmail, fullName });
    if (welcome.sent) {
      results.push('welcome-email');
      console.log('[signup-notify] welcome email', userId, signupEmail);
    }
  } catch (e) {
    console.error('[signup-notify] welcome email failed', userId, e);
  }

  if (!hasAnyNotifyChannel()) {
    if (!results.length) {
      console.warn('[signup-notify] 관리자 알림 채널 미설정 (Telegram / Email / Webhook)');
    }
    return { ok: results.length > 0, channels: results, adminSkipped: true };
  }

  const message = buildSignupMessage({
    userId,
    fullName,
    plan: plan || 'free',
    email: signupEmail,
    provider: providerLabel(authUser),
    attribution,
  });

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

  console.log('[signup-notify]', userId, results.join('+'));
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
        attribution: extractAttributionFromRecord(newRecord || record),
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
  providerLabel,
  extractAttributionFromRecord,
};
