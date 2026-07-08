# -*- coding: utf-8 -*-
"""lifecode/analyze.html 단품 전용 패치 (analysis.html 복사본)"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "public" / "lifecode" / "analyze.html"
text = path.read_text(encoding="utf-8")

old_head = """  <script src="/js/lifecode-guard.js"></script>
  <link rel="stylesheet" href="/css/lifecode-standalone.css"/>
  <style>html.lifecode-guard-pending body { visibility: hidden; }</style>
  <title>라이프코드 분석 — 팔자연구소 8CODE</title>"""

new_head = """  <script src="/js/lifecode-product-guard.js"></script>
  <link rel="stylesheet" href="/css/lifecode-product.css"/>
  <link rel="manifest" href="/lifecode/manifest.webmanifest"/>
  <meta name="theme-color" content="#4a3520"/>
  <title>라이프코드 분석</title>"""

text = text.replace(old_head, new_head)
text = text.replace('<script src="js/topbar-session.js?v=5" defer></script>\n', '')

text = text.replace('href="css/site-header.css?v=6"', 'href="../css/site-header.css?v=6"')
text = text.replace('src="js/', 'src="../js/')

old_top = """<!-- TOP BAR -->
<div class="site-top">
<header class="topbar">
  <div class="topbar-left">
    <a class="topbar-logo" href="index.html"><span class="topbar-logo-mark" aria-hidden="true">八</span>팔자연구소</a>
    <div class="topbar-sep"></div>
    <span class="topbar-title">라이프코드 분석</span>
  </div>
  <div class="topbar-right" data-topbar-auth aria-label="계정">
    <span class="plan-badge free" id="plan-badge">Free</span>
    <span class="topbar-auth-row" data-topbar-auth-guest>
      <a class="topbar-auth-link" href="login.html?next=analysis.html">로그인</a>
      <span class="topbar-auth-dot" aria-hidden="true">·</span>
      <a class="topbar-auth-link" href="signup.html?next=analysis.html">회원가입</a>
    </span>

    <div class="topbar-export-cluster" id="topbarExportCluster" aria-live="polite">
      <div class="topbar-export-btns">
        <button type="button" class="counselor-bar-btn" id="topbarPrintBtn" onclick="window.print()">🖨 인쇄</button>
        <button type="button" class="counselor-bar-btn" id="topbarPdfBtn" onclick="topbarPdfClick()">⬇ PDF 저장</button>
      </div>
    </div>

    <a class="back-btn" href="dashboard.html">대시보드</a>
    <div class="lifecode-topbar-tools" id="lifecodeTopbarTools" hidden></div>
    <span class="topbar-auth-row" data-topbar-auth-user hidden>
      <button type="button" class="topbar-auth-link topbar-auth-btn" data-topbar-auth-signout>로그아웃</button>
    </span>
  </div>
</header>
<nav class="program-nav" aria-label="팔자연구소 프로그램 이동">
  <div class="program-nav-inner">
    <span class="program-nav-current" aria-current="page">라이프코드</span>
    <a href="Tarot.html">타로코드</a>
    <a href="name.html">네임코드</a>
    <a href="compatibility.html">소울하모니</a>
    <a href="counselor.html">상담사 허브</a>
    <a href="pricing.html">요금제</a>
  </div>
</nav>
</div>"""

new_top = """<!-- 라이프코드 단품 상단 -->
<div class="site-top lc-product-top">
<header class="topbar lc-product-bar">
  <div class="topbar-left">
    <a class="topbar-logo" href="/lifecode/"><span class="topbar-title">라이프코드</span></a>
  </div>
  <div class="topbar-right" aria-label="라이프코드 메뉴">
    <div class="topbar-export-btns">
      <button type="button" class="counselor-bar-btn" id="topbarPrintBtn" onclick="window.print()">🖨 인쇄</button>
      <button type="button" class="counselor-bar-btn" id="topbarPdfBtn" onclick="topbarPdfClick()">⬇ PDF</button>
    </div>
    <a class="lc-product-link" href="counselor.html">상담사 허브</a>
    <span class="plan-badge free" id="plan-badge" hidden aria-hidden="true">Plus</span>
  </div>
</header>
</div>"""

text = text.replace(old_top, new_top)
text = text.replace('href="counselor.html" class="counselor-bar-link"', 'href="counselor.html" class="counselor-bar-link lc-product-link"')

old_auth = """function isLifecodeStandalone() {
  return new URLSearchParams(window.location.search).get('lifecode') === '1';
}

async function applyLifecodeStandaloneChrome() {
  const mod = await import('/js/lifecode-standalone-chrome.js');
  mod.markLifecodeStandaloneRoot();
  const logo = document.querySelector('.topbar-logo');
  if (logo) {
    logo.href = '/lifecode/';
    logo.innerHTML = '<span class="topbar-title" style="font-size:15px;">라이프코드</span>';
  }
  const tools = document.getElementById('lifecodeTopbarTools');
  if (tools) {
    tools.hidden = false;
    tools.innerHTML = mod.lifecodeTopbarToolsHtml('analysis');
    mod.bindLifecodeTopbarTools(tools);
  }
}

async function initAuth() {
  if (isLifecodeStandalone()) {
    USER_PLAN = 'pro';
    CURRENT_USER_ID = 'lifecode';
    await applyLifecodeStandaloneChrome();
    return;
  }
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const next = encodeURIComponent(
      `${window.location.pathname.split('/').pop() || 'analysis.html'}${window.location.search || ''}${window.location.hash || ''}`
    );
    window.location.replace(`login.html?next=${next}`);
    return;
  }
  CURRENT_USER_ID = session.user?.id || 'guest';

  const { data: profile } = await sb.from('profiles')
    .select('plan, plan_active_until')
    .eq('id', session.user.id)
    .single();

  const dbPlan = profile?.plan || 'free';
  const proExpired =
    dbPlan === 'professional' &&
    profile?.plan_active_until &&
    new Date(profile.plan_active_until) <= new Date();

  if (profile?.plan) {
    let effective = profile.plan;
    if (proExpired) effective = 'pro';
    USER_PLAN = effective;
    // 개발 모드: Basic 이하만 Pro로 끌어올림. Professional은 상담사 기능 유지
    if (DEV_UNLOCK_PAID) {
      const _r = { free: 0, basic: 1, pro: 2, professional: 3 };
      if ((_r[USER_PLAN] ?? 0) < _r.pro) USER_PLAN = 'pro';
    }
    const badge = document.getElementById('plan-badge');
    if (badge) {
      badge.textContent = USER_PLAN.charAt(0).toUpperCase() + USER_PLAN.slice(1);
      badge.className = `plan-badge ${USER_PLAN}`;
    }
  }

  // 상담사 고객 입력 필드 표시 (DB Professional + 이용 기간 유효)
  if (USER_PLAN === 'professional') {
  document.getElementById('clientGroup').style.display = 'flex';
  const bar = document.getElementById('counselorBar');
  if (bar) bar.style.display = 'block';
  const cluster = document.getElementById('topbarExportCluster');
  if (cluster) cluster.classList.add('is-visible');
}

  if (dbPlan === 'professional' && !proExpired) {
    await loadPrefilledCounselorClient(session);
  }
}"""

new_auth = """function isLifecodeStandalone() {
  return true;
}

async function initAuth() {
  USER_PLAN = 'pro';
  CURRENT_USER_ID = 'lifecode';

  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  CURRENT_USER_ID = session.user.id;
  const { data: profile } = await sb
    .from('profiles')
    .select('plan, plan_active_until')
    .eq('id', session.user.id)
    .single();

  const dbPlan = profile?.plan || 'free';
  const proExpired =
    dbPlan === 'professional' &&
    profile?.plan_active_until &&
    new Date(profile.plan_active_until) <= new Date();

  if (dbPlan === 'professional' && !proExpired) {
    USER_PLAN = 'professional';
    document.getElementById('clientGroup').style.display = 'flex';
    const bar = document.getElementById('counselorBar');
    if (bar) bar.style.display = 'block';
    await loadPrefilledCounselorClient(session);
  }
}"""

text = text.replace(old_auth, new_auth)

# 단품 콘텐츠 패치는 lifecode-product-config.js + analyze.html 수동 동기화
# 복사 후: python scripts/patch_lifecode_analyze.py && (analyze.html 단품 전용 diff 재적용)

path.write_text(text, encoding="utf-8")
print("patched", path)
print("NOTE: re-apply lifecode product hooks in analyze.html if you regenerate from analysis.html")
