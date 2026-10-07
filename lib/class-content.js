/**
 * Private 전용 수업자료 본문 전달
 * - 본문은 public 밖(private-content/class/)에 두고, 로그인 + Private 확인 후에만 내려줌
 * - GET /api/class/:course/:part  →  { html }
 */
const path = require('path');
const fs = require('fs');

const CONTENT_ROOT = path.join(__dirname, '..', 'private-content', 'class');
const SAFE = /^[a-z0-9-]{1,40}$/;

function isPrivateActive(profile) {
  if (!profile) return false;
  const plan = String(profile.plan || '').toLowerCase();
  if (plan !== 'private') return false;
  if (profile.plan_active_until && new Date(profile.plan_active_until) <= new Date()) return false;
  return true;
}

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

function registerClassContentRoutes(app, { getUserIdFromAuth, getProfile }) {
  app.get('/api/class/:course/:part', async (req, res) => {
    noStore(res);
    const { course, part } = req.params;
    if (!SAFE.test(course) || !SAFE.test(part)) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'login_required' });
      return;
    }
    let profile = null;
    try {
      profile = await getProfile(userId);
    } catch (e) {
      console.error('[class-content] profile', e);
    }
    if (!isPrivateActive(profile)) {
      res.status(403).json({ error: 'private_only', plan: (profile && profile.plan) || 'free' });
      return;
    }
    const file = path.join(CONTENT_ROOT, course, `${part}.html`);
    if (!file.startsWith(CONTENT_ROOT + path.sep)) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    fs.readFile(file, 'utf8', (err, html) => {
      if (err) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json({ html });
    });
  });
}

module.exports = { registerClassContentRoutes, isPrivateActive };
