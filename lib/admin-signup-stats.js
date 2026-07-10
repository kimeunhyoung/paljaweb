/**
 * 관리자용 가입·전환 집계 (profiles + auth.users)
 */

function isPaidProfile(profile) {
  const plan = String(profile?.plan || 'free').toLowerCase();
  if (plan === 'free') return false;
  if (profile?.plan_active_until && new Date(profile.plan_active_until) <= new Date()) {
    return false;
  }
  return true;
}

function kstDayKey(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function bump(map, key, inc = 1) {
  const k = key && String(key).trim() ? String(key).trim() : '(없음)';
  map.set(k, (map.get(k) || 0) + inc);
}

function topEntries(map, limit = 10) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function buildSignupStats({ profiles, authUsers, providerLabel, days = 30 }) {
  const windowDays = Math.min(Math.max(Number(days) || 30, 1), 365);
  const cutoff = Date.now() - windowDays * 86400000;
  const authById = new Map((authUsers || []).map((u) => [u.id, u]));

  const byDay = new Map();
  const byProvider = new Map();
  const byLanding = new Map();
  const byUtmSource = new Map();
  const byPlan = new Map();
  let totalSignups = 0;
  let paidSignups = 0;
  let todaySignups = 0;
  let todayPaid = 0;
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

  for (const p of profiles || []) {
    const auth = authById.get(p.id);
    if (!auth?.created_at) continue;
    const joined = Date.parse(auth.created_at);
    if (Number.isNaN(joined) || joined < cutoff) continue;

    totalSignups += 1;
    const paid = isPaidProfile(p);
    if (paid) paidSignups += 1;

    const day = kstDayKey(auth.created_at);
    if (day === todayKey) {
      todaySignups += 1;
      if (paid) todayPaid += 1;
    }

    bump(byDay, day);
    bump(byProvider, providerLabel ? providerLabel(auth) : 'email');
    bump(byLanding, p.signup_landing_page || '(직접/미기록)');
    bump(byUtmSource, p.utm_source || '(없음)');
    bump(byPlan, paid ? String(p.plan || 'free').toLowerCase() : 'free');
  }

  const daily = [...byDay.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    days: windowDays,
    todayKey,
    todaySignups,
    todayPaid,
    totalSignups,
    paidSignups,
    freeSignups: totalSignups - paidSignups,
    conversionRate: totalSignups ? Math.round((paidSignups / totalSignups) * 1000) / 10 : 0,
    byDay: daily,
    byProvider: topEntries(byProvider, 20),
    byLanding: topEntries(byLanding, 15),
    byUtmSource: topEntries(byUtmSource, 15),
    byPlan: topEntries(byPlan, 10),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildSignupStats,
  isPaidProfile,
};
