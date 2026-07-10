/**
 * 이메일 미인증 유저 리마인드 (가입 약 24시간 후)
 *
 * Render Cron Jobs 또는 외부 cron:
 *   POST https://8code.kr/api/cron/verify-remind
 *   Header: Authorization: Bearer <CRON_SECRET>
 *           또는 x-cron-secret: <CRON_SECRET>
 *
 * 환경변수:
 *   CRON_SECRET (필수)
 *   RESEND_API_KEY 또는 SMTP_*
 *   USER_EMAIL_FROM / SIGNUP_NOTIFY_EMAIL_FROM
 *   VERIFY_REMIND_ENABLED=false 로 끄기
 */

function isRemindEnabled() {
  const off = String(process.env.VERIFY_REMIND_ENABLED || '').toLowerCase();
  if (off === '0' || off === 'false' || off === 'no') return false;
  return !!(
    process.env.RESEND_API_KEY ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  );
}

function emailFrom() {
  return (
    process.env.USER_EMAIL_FROM ||
    process.env.SIGNUP_NOTIFY_EMAIL_FROM ||
    '팔자연구소 <onboarding@resend.dev>'
  );
}

function buildVerifyRemindEmail() {
  const text = [
    '팔자연구소 가입을 환영합니다.',
    '',
    '아직 이메일 인증이 완료되지 않은 것 같아요.',
    '받은편지함(또는 스팸함)에서 인증 메일을 확인해 주세요.',
    '',
    '메일이 없다면 로그인 페이지에서 「인증 메일 다시 보내기」를 눌러 주세요.',
    'https://8code.kr/login.html',
    '',
    '인증 후 마이페이지에서 생년월일을 저장하면 맞춤 분석을 바로 이어갈 수 있어요.',
    'https://8code.kr/dashboard.html',
    '',
    '— 팔자연구소',
  ].join('\n');
  return {
    subject: '팔자연구소 — 이메일 인증을 완료해 주세요',
    text,
  };
}

async function sendRemindEmail(to) {
  const from = emailFrom();
  const { subject, text } = buildVerifyRemindEmail();
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
      throw new Error(`resend ${res.status}: ${t.slice(0, 200)}`);
    }
    return;
  }
  const nodemailer = require('nodemailer');
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({ from, to, subject, text });
}

async function listUnconfirmedUsersInWindow({ minAgeHours = 20, maxAgeHours = 30 } = {}) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return [];

  const now = Date.now();
  const minMs = minAgeHours * 3600 * 1000;
  const maxMs = maxAgeHours * 3600 * 1000;
  const candidates = [];
  let page = 1;
  const perPage = 200;

  while (page <= 20) {
    const res = await fetch(`${base}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    const users = Array.isArray(data?.users) ? data.users : [];
    if (!users.length) break;

    for (const u of users) {
      if (u.email_confirmed_at) continue;
      const email = String(u.email || '');
      if (!email || !email.includes('@') || email.includes('@oauth.8code.kr')) continue;
      const created = Date.parse(u.created_at);
      if (Number.isNaN(created)) continue;
      const age = now - created;
      if (age < minMs || age > maxMs) continue;
      candidates.push({ id: u.id, email, created_at: u.created_at });
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return candidates;
}

async function runVerifyRemind({ dryRun = false } = {}) {
  if (!isRemindEnabled()) {
    return { ok: false, skipped: true, reason: 'disabled_or_no_transport' };
  }

  const users = await listUnconfirmedUsersInWindow();
  const sent = [];
  const errors = [];

  for (const u of users) {
    try {
      if (!dryRun) await sendRemindEmail(u.email);
      sent.push(u.email);
    } catch (e) {
      errors.push({ email: u.email, error: String(e.message || e) });
    }
  }

  console.log('[verify-remind]', { count: users.length, sent: sent.length, errors: errors.length });
  return {
    ok: true,
    candidates: users.length,
    sent: sent.length,
    emails: dryRun ? users.map((u) => u.email) : sent,
    errors,
  };
}

function verifyCronSecret(req) {
  const secret = process.env.CRON_SECRET || process.env.LIFECODE_ADMIN_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const header = req.headers['x-cron-secret'] || '';
  const q = req.query?.secret || '';
  return bearer === secret || header === secret || q === secret;
}

function registerVerifyRemindRoutes(app) {
  app.post('/api/cron/verify-remind', async (req, res) => {
    if (!verifyCronSecret(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const dryRun = String(req.query.dryRun || req.body?.dryRun || '') === '1';
      const result = await runVerifyRemind({ dryRun });
      res.json(result);
    } catch (e) {
      console.error('[cron/verify-remind]', e);
      res.status(500).json({ error: 'verify remind failed' });
    }
  });
}

module.exports = {
  registerVerifyRemindRoutes,
  runVerifyRemind,
  listUnconfirmedUsersInWindow,
};
