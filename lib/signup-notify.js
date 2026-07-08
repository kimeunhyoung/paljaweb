/**
 * 신규 회원가입 관리자 알림 (Discord / Slack / Telegram)
 *
 * Render 환경변수 (하나 이상 설정):
 *   SIGNUP_NOTIFY_WEBHOOK_URL  — Discord·Slack Incoming Webhook URL
 *   SIGNUP_NOTIFY_TELEGRAM_BOT_TOKEN + SIGNUP_NOTIFY_TELEGRAM_CHAT_ID
 */

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
  if (!token || !chatId) return;
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

async function notifyNewSignup({ userId, fullName, plan }) {
  const webhookUrl = String(process.env.SIGNUP_NOTIFY_WEBHOOK_URL || '').trim();
  const hasTelegram = !!(
    process.env.SIGNUP_NOTIFY_TELEGRAM_BOT_TOKEN &&
    process.env.SIGNUP_NOTIFY_TELEGRAM_CHAT_ID
  );
  if (!webhookUrl && !hasTelegram) {
    console.warn('[signup-notify] 알림 채널 미설정 (SIGNUP_NOTIFY_WEBHOOK_URL 또는 Telegram)');
    return { ok: false, skipped: true };
  }

  const authUser = await fetchAuthUser(userId);
  const message = buildSignupMessage({
    userId,
    fullName,
    plan: plan || 'free',
    email: authUser?.email || null,
    provider: providerLabel(authUser),
  });

  const results = [];
  if (webhookUrl) {
    await postWebhook(webhookUrl, message);
    results.push('webhook');
  }
  if (hasTelegram) {
    await postTelegram(message);
    results.push('telegram');
  }

  console.log('[signup-notify] sent', userId, results.join('+'));
  return { ok: true, channels: results };
}

function verifySignupWebhookSecret(req) {
  const secret = process.env.SIGNUP_WEBHOOK_SECRET;
  if (!secret) return false;
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const header = req.headers['x-signup-secret'] || bearer;
  return header === secret;
}

function registerSignupNotifyRoutes(app) {
  app.post('/api/webhooks/signup', async (req, res) => {
    if (!verifySignupWebhookSecret(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const record = req.body?.record || req.body;
    const userId = String(record?.id || '').trim();
    if (!userId) {
      res.status(400).json({ error: 'record.id required' });
      return;
    }

    try {
      const result = await notifyNewSignup({
        userId,
        fullName: record.full_name || '',
        plan: record.plan || 'free',
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
