/**
 * 질문점(프라슈나) API
 * - 제출 시각은 서버에서 고정 (클라이언트 시계 조작 방지)
 * - 같은 카테고리 재질문: 일반 회원만 coolDays 제한
 *   상담사(Professional/Private)는 고객을 여러 명 보므로 쿨다운 없음
 * - 차트 계산·판정은 클라이언트가 VedicCore로 수행
 */
const crypto = require('crypto');
const { isCounselorPlan } = require('./plan-billing');

const COOL_DAYS = 30;
const BLOCKED =
  /(수명|사망|죽을|자살|암\b|시한부|소송|재판|고소|투자|주식|코인|도박|임신중절|낙태)/;

/** @type {Map<string, { at: number, category: string, question: string, result?: object }>} */
const recentByUser = new Map();

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

function coolKey(userId, category) {
  return String(userId || 'anon') + ':' + String(category || '');
}

function registerPrashnaRoutes(app, { getUserIdFromAuth, getProfile }) {
  /** 질문 제출 직전 — 서버 시각 발급 */
  app.post('/api/prashna/stamp', async (req, res) => {
    noStore(res);
    const category = String((req.body && req.body.category) || '').trim();
    const question = String((req.body && req.body.question) || '').trim();
    const city = String((req.body && req.body.city) || '').trim();
    const lat = Number(req.body && req.body.lat);
    const lng = Number(req.body && req.body.lng);

    if (!category || !question || question.length < 4) {
      res.status(400).json({ error: 'bad_request', message: '카테고리와 질문을 확인해 주세요.' });
      return;
    }
    if (BLOCKED.test(question)) {
      res.status(400).json({
        error: 'blocked_topic',
        message: '건강·수명·소송·투자처럼 민감한 주제는 다루지 않아요. 다른 질문으로 바꿔 주세요.',
      });
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !city) {
      res.status(400).json({ error: 'bad_location', message: '현재 도시를 선택해 주세요.' });
      return;
    }

    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'login_required' });
      return;
    }

    let profile = null;
    try {
      profile = typeof getProfile === 'function' ? await getProfile(userId) : null;
    } catch (e) {
      console.error('[prashna] profile', e);
    }
    const counselor = isCounselorPlan(profile);

    if (!counselor) {
      const key = coolKey(userId, category);
      const prev = recentByUser.get(key);
      if (prev && Date.now() - prev.at < COOL_DAYS * 86400000) {
        res.status(429).json({
          error: 'cooldown',
          message:
            '같은 종류의 질문은 ' +
            COOL_DAYS +
            '일 안에 다시 볼 수 없어요. 이전 결과를 확인해 주세요.',
          previous: {
            askedAt: new Date(prev.at).toISOString(),
            question: prev.question,
            result: prev.result || null,
          },
          coolDays: COOL_DAYS,
        });
        return;
      }
    }

    const askedAt = new Date();
    const stampId = crypto.randomBytes(12).toString('hex');
    res.json({
      stampId,
      askedAt: askedAt.toISOString(),
      category,
      city,
      lat,
      lng,
      coolDays: counselor ? 0 : COOL_DAYS,
      counselorExempt: counselor,
      note: '이 시각이 프라슈나 차트의 기준입니다.',
    });
  });

  /** 판정 결과 저장(쿨다운용). 상담사는 저장해도 제한에 쓰지 않음 */
  app.post('/api/prashna/complete', async (req, res) => {
    noStore(res);
    const userId = await getUserIdFromAuth(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'login_required' });
      return;
    }
    const category = String((req.body && req.body.category) || '').trim();
    const question = String((req.body && req.body.question) || '').trim();
    const askedAt = String((req.body && req.body.askedAt) || '').trim();
    const result = (req.body && req.body.result) || null;
    if (!category || !question || !askedAt) {
      res.status(400).json({ error: 'bad_request' });
      return;
    }
    const at = Date.parse(askedAt);
    if (!Number.isFinite(at)) {
      res.status(400).json({ error: 'bad_time' });
      return;
    }

    let profile = null;
    try {
      profile = typeof getProfile === 'function' ? await getProfile(userId) : null;
    } catch (e) {
      /* ignore */
    }
    const counselor = isCounselorPlan(profile);

    if (!counselor) {
      recentByUser.set(coolKey(userId, category), {
        at,
        category,
        question: question.slice(0, 200),
        result: result
          ? {
              conclusion: result.conclusion,
              tone: result.tone,
              timings: result.timings,
            }
          : null,
      });
    }
    res.json({ ok: true, coolDays: counselor ? 0 : COOL_DAYS, counselorExempt: counselor });
  });
}

module.exports = { registerPrashnaRoutes, COOL_DAYS, BLOCKED };
