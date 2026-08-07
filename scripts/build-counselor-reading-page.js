/**
 * Build public/counselor-reading.html from counselor.html pieces.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/counselor.html'), 'utf8');
const jsChunk = fs.readFileSync(path.join(root, 'public/js/_extract_reading.js'), 'utf8');

function sliceBetween(src, startMark, endMark) {
  const i = src.indexOf(startMark);
  const j = src.indexOf(endMark, i + startMark.length);
  if (i < 0 || j < 0) throw new Error('slice failed: ' + startMark);
  return src.slice(i, j);
}

const cssAi = sliceBetween(html, '/* 상담사 AI 리딩 */', '.copy-sum-out {');
const cssScript = sliceBetween(html, '/* 신입용 세션 스크립트 */', '/* 관계 분석 */');
const cssModal = sliceBetween(html, '/* 고객 상세 · 세션 모달 */', '.session-add');
const htmlBlock = sliceBetween(
  html,
  '<div class="section-title" id="ai-draft"',
  '<div class="section-title" style="margin-top:28px">운영 · 매출</div>'
);
const modalBlock = sliceBetween(
  html,
  '<div class="modal-overlay" id="numTableModal">',
  '<div class="modal-overlay" id="sessionModal">'
);

const page = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/manifest.json">
  <title>상담사 AI 리딩 — 팔자연구소 8CODE</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="js/plan-access.js?v=1"></script>
  <script src="js/ai-quota-client.js?v=2"></script>
  <script src="js/counselor-tarot-deck.js?v=2"></script>
  <script src="js/attribution.js"></script>
  <script src="js/site-topbar.js?v=5" defer></script>
  <script src="js/topbar-session.js?v=6" defer></script>
  <style>
    :root {
      --cream: #f5f0e8;
      --parchment: #ede5d4;
      --deep: #4a3520;
      --ink: #2c1f0e;
      --muted: #9a8570;
      --accent: #c8a96e;
      --border: rgba(139,111,71,.18);
      --teal: #2e8b7a;
      --font-serif: 'Noto Serif KR', serif;
      --font-body: 'Noto Serif KR', serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-body); background: var(--cream); color: var(--ink); min-height: 100vh; }
    #guard { position: fixed; inset: 0; background: var(--cream); display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; z-index: 99; }
    #guard .spinner { width: 32px; height: 32px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .85s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .guard-text { font-size: 13px; color: var(--muted); }
    #app { display: none; max-width: 820px; margin: 0 auto; padding: 24px 24px 80px; }
    .site-top {
      position: sticky; top: 0; z-index: 100;
      background: rgba(245, 240, 232, 0.98);
      box-shadow: 0 6px 18px rgba(45, 38, 28, 0.06);
    }
    .hub-intro { margin-bottom: 22px; }
    .hub-intro h1 { font-family: var(--font-serif); font-size: 28px; color: var(--deep); margin-bottom: 8px; }
    .hub-intro p { font-size: 13.5px; color: var(--muted); line-height: 1.65; }
    .hub-intro a { color: var(--deep); font-weight: 600; }
    .trial-badge {
      display: inline-block; margin-top: 10px; font-size: 12px; color: var(--teal);
      background: rgba(46,139,122,.08); border: 1px solid rgba(46,139,122,.22);
      border-radius: 999px; padding: 5px 12px;
    }
    #gate, #trialDeviceGate {
      display: none; text-align: center; padding: 48px 24px; background: var(--parchment);
      border-radius: 12px; border: 1px solid var(--border);
    }
    #gate h2, #trialDeviceGate h2 { font-family: var(--font-serif); font-size: 22px; color: var(--deep); margin-bottom: 12px; }
    #gate p, #trialDeviceGate p { font-size: 14px; color: var(--muted); line-height: 1.75; margin-bottom: 20px; }
    #gate .cta, #trialDeviceGate .cta {
      display: inline-block; background: var(--deep); color: var(--cream); padding: 12px 24px;
      border-radius: 6px; text-decoration: none; font-size: 13px; margin-top: 4px;
    }
    #workspace { display: none; }
    .section-title {
      font-family: var(--font-serif); font-size: 18px; color: var(--deep);
      margin: 0 0 12px; font-weight: 600;
    }
    .btn-sm {
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--deep); color: #fff; border: none; border-radius: 8px;
      padding: 8px 14px; font-size: 13px; font-family: var(--font-body); cursor: pointer; font-weight: 600;
    }
    .btn-sm.outline { background: white; color: var(--deep); border: 1px solid var(--border); }
    .form-msg { font-size: 12px; margin-top: 12px; min-height: 1.2em; color: var(--muted); }
    .form-msg.err { color: #8b3a3a; }
    .back-row { margin-bottom: 18px; }
    .back-row a {
      font-size: 13px; color: var(--muted); text-decoration: none; font-weight: 600;
    }
    .back-row a:hover { color: var(--deep); }
    .copy-sum-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
${cssAi}
${cssScript}
${cssModal}
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" crossorigin />
  <link rel="stylesheet" href="css/site-topbar.css?v=5" />
  <link rel="stylesheet" href="css/site-header.css?v=7" />
</head>
<body>
<div id="guard"><div class="spinner"></div><p class="guard-text">확인 중…</p></div>

<div class="site-top" data-topbar-title="상담사 AI 리딩" data-nav-current="counselor" data-login-next="counselor-reading.html"></div>

<div id="app">
  <div class="hub-intro">
    <div class="back-row"><a href="counselor.html">← 상담사 허브</a></div>
    <h1>상담사 AI 리딩</h1>
    <p>질문·카드·칸별 해석 요청으로 고객에게 붙여넣을 초안을 만듭니다. 신입용 세션 스크립트도 이 페이지에 있습니다. <strong>Professional</strong> 전용.</p>
    <p id="trialBadge" class="trial-badge" style="display:none" role="status"></p>
  </div>
  <div id="gate">
    <h2>Professional 플랜 전용</h2>
    <p>상담사 AI 리딩은 <strong>Professional</strong> 요금제에서 이용할 수 있어요.</p>
    <a class="cta" href="for-counselors.html">Professional 안내 보기</a>
    <a class="cta" href="/lifecode/buy.html?product=counselor30" style="margin-left:8px;background:transparent;border:1.5px solid var(--border);color:var(--deep);">15일 체험 구매</a>
    <a class="cta" href="pricing.html?checkout=professional" style="margin-left:8px;background:transparent;border:1.5px solid var(--border);color:var(--deep);">바로 구독</a>
  </div>
  <div id="trialDeviceGate" style="display:none">
    <h2>등록 기기 한도 초과</h2>
    <p>이 계정은 이미 <strong>기기 4대</strong>까지 등록되어 이 브라우저에서는 열 수 없습니다.<br><a href="dashboard.html#devices">마이페이지에서 기기 해제</a> 후 다시 시도해 주세요.</p>
    <a class="cta" href="for-counselors.html">체험·구독 안내</a>
  </div>
  <div id="workspace">
${htmlBlock}
  </div>
</div>

${modalBlock}

<script>
(function () {
  const SUPABASE_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1';
  const { createClient } = supabase;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let workspaceReady = false;
  let clientRows = [];
  let sessionRows = [];

  function getLifecodeDeviceId() {
    const KEY = 'lifecode_device_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function clientLastSession(clientId) {
    const rows = sessionRows
      .filter((s) => s.client_id === clientId)
      .slice()
      .sort((a, b) => String(b.session_date || '').localeCompare(String(a.session_date || '')));
    if (!rows.length) return { last: '', topic: '', count: 0 };
    return {
      last: rows[0].session_date || '',
      topic: rows[0].topic || '',
      count: rows.length,
    };
  }

  function populateAiClientSelect() {
    const sel = document.getElementById('aiClient');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">— 고객 선택 —</option>' +
      clientRows.map((c) =>
        '<option value="' + c.id + '">' + escapeHtml(c.display_name || c.legal_name || '고객') +
        (c.birth_date ? ' · ' + escapeHtml(String(c.birth_date)) : '') + '</option>'
      ).join('');
    if (cur && clientRows.some((c) => c.id === cur)) sel.value = cur;
  }

  async function checkAccess() {
    const guard = document.getElementById('guard');
    const gate = document.getElementById('gate');
    const trialDeviceGate = document.getElementById('trialDeviceGate');
    const workspace = document.getElementById('workspace');
    guard.style.display = 'flex';
    gate.style.display = 'none';
    trialDeviceGate.style.display = 'none';
    workspace.style.display = 'none';

    const { data: { session } } = await sb.auth.getSession();
    guard.style.display = 'none';
    document.getElementById('app').style.display = 'block';

    if (!session) {
      window.location.replace('login.html?next=' + encodeURIComponent('counselor-reading.html'));
      return null;
    }

    const { data: profile, error } = await sb.from('profiles')
      .select('plan, plan_active_until, counselor_trial_license_id, counselor_trial_device_id')
      .eq('id', session.user.id)
      .maybeSingle();

    const proOk = !error && profile &&
      window.PaljaPlan &&
      PaljaPlan.hasCounselorAccess(profile);

    if (!proOk) {
      gate.style.display = 'block';
      return null;
    }

    {
      const deviceId = getLifecodeDeviceId();
      let deviceOk = true;
      try {
        const { data: { session: s2 } } = await sb.auth.getSession();
        if (window.PaljaDevice && s2) {
          const gateRes = await window.PaljaDevice.ensurePaidAccess(s2.access_token, profile);
          deviceOk = !!gateRes.ok;
        } else if (s2) {
          const st = await fetch('/api/account/devices/register', {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + s2.access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ deviceId }),
          });
          const stJson = await st.json().catch(() => ({}));
          if (st.status === 403 || stJson.error === 'device_limit') deviceOk = false;
        }
      } catch (_) { /* ignore */ }
      if (!deviceOk) {
        trialDeviceGate.style.display = 'block';
        return null;
      }
      if (profile.counselor_trial_license_id) {
        const badge = document.getElementById('trialBadge');
        if (badge && profile.plan_active_until) {
          const exp = new Date(profile.plan_active_until);
          const expStr = exp.getFullYear() + '년 ' + (exp.getMonth() + 1) + '월 ' + exp.getDate() + '일';
          badge.textContent = '체험 이용 중 · ' + expStr + '까지 (기기 최대 4대)';
          badge.style.display = 'inline-block';
        }
      }
    }

    workspace.style.display = 'block';
    return session;
  }

  async function main() {
    const session = await checkAccess();
    if (!session || workspaceReady) return;
    workspaceReady = true;
    const uid = session.user.id;

    const { data: clients } = await sb
      .from('counselor_clients')
      .select('id, display_name, legal_name, birth_date')
      .eq('counselor_id', uid)
      .order('display_name', { ascending: true });
    clientRows = clients || [];

    const { data: sessions } = await sb
      .from('counselor_sessions')
      .select('id, client_id, session_date, topic')
      .eq('counselor_id', uid)
      .order('session_date', { ascending: false })
      .limit(200);
    sessionRows = sessions || [];

    populateAiClientSelect();

${jsChunk}
  }

  main();
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      workspaceReady = false;
      main();
    }
  });
})();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'public/counselor-reading.html'), page);
console.log('wrote public/counselor-reading.html', page.length);
