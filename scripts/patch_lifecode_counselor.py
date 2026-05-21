# -*- coding: utf-8 -*-
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "public" / "lifecode" / "counselor.html"
text = path.read_text(encoding="utf-8")

text = text.replace(
  "<title>상담사 허브 — 팔자연구소 8CODE</title>",
  "<title>상담사 허브 — 라이프코드</title>",
)
text = text.replace(
  '  <script src="/js/lifecode-guard.js"></script>\n  <link rel="stylesheet" href="/css/lifecode-standalone.css"/>',
  '  <script src="/js/lifecode-product-guard.js"></script>\n  <link rel="stylesheet" href="/css/lifecode-product.css"/>',
)
text = text.replace('<script src="js/topbar-session.js?v=5" defer></script>\n', '')

old_top = """<div class="site-top">
<header class="topbar">
  <div class="topbar-left">
    <a class="topbar-logo" href="index.html"><span class="topbar-logo-mark" aria-hidden="true">八</span>팔자연구소</a>
    <div class="topbar-sep"></div>
    <span class="topbar-title">상담사 허브</span>
  </div>
  <div class="topbar-right" data-topbar-auth aria-label="계정">
    <span class="plan-badge free" id="plan-badge">Free</span>
    <span class="topbar-auth-row" data-topbar-auth-guest>
      <a class="topbar-auth-link" href="login.html?next=counselor.html">로그인</a>
      <span class="topbar-auth-dot" aria-hidden="true">·</span>
      <a class="topbar-auth-link" href="signup.html?next=counselor.html">회원가입</a>
    </span>
    <a class="back-btn" href="dashboard.html">대시보드</a>
    <div class="lifecode-topbar-tools" id="lifecodeTopbarTools" hidden></div>
    <span class="topbar-auth-row" data-topbar-auth-user hidden>
      <button type="button" class="topbar-auth-link topbar-auth-btn" data-topbar-auth-signout>로그아웃</button>
    </span>
  </div>
</header>
<nav class="program-nav" aria-label="팔자연구소 프로그램 이동">
  <div class="program-nav-inner">
    <a href="analysis.html">라이프코드</a>
    <a href="Tarot.html">타로코드</a>
    <a href="name.html">네임코드</a>
    <a href="compatibility.html">소울하모니</a>
    <span class="program-nav-current" aria-current="page">상담사 허브</span>
    <a href="pricing.html">요금제</a>
  </div>
</nav>
</div>"""

new_top = """<div class="site-top lc-product-top">
<header class="topbar lc-product-bar">
  <div class="topbar-left">
    <a class="topbar-logo" href="/lifecode/"><span class="topbar-title">라이프코드</span></a>
  </div>
  <div class="topbar-right" aria-label="라이프코드 메뉴">
    <a class="lc-product-link" href="analyze.html">라이프코드 분석</a>
    <span class="lc-product-link" style="color:var(--deep);font-weight:600">상담사 허브</span>
    <span class="plan-badge free" id="plan-badge" hidden></span>
  </div>
</header>
</div>"""

text = text.replace(old_top, new_top)

text = text.replace(
  '      <a class="cta" href="analysis.html?lifecode=1">라이프코드 분석 열기</a>\n'
  '      <a class="cta" href="login.html?next=counselor.html%3Flifecode%3D1"',
  '      <a class="cta" href="analyze.html">라이프코드 분석 열기</a>\n'
  '      <a class="cta" href="../login.html?next=' + "lifecode%2Fcounselor.html" + '"',
)

text = text.replace('href="analysis.html"', 'href="analyze.html"')
text = text.replace('analysis.html?lifecode=1', 'analyze.html')
text = text.replace('counselor.html?lifecode=1', 'counselor.html')
text = text.replace('counselor.html%3Flifecode%3D1', 'lifecode%2Fcounselor.html')

# Replace module script with product init
old_script_start = '<script type="module">\nimport {'
if old_script_start in text:
  import re
  text = re.sub(
    r'<script type="module">.*?</script>\s*</body>',
    '''<script type="module">
import { hasValidLifecodeSession } from '/js/lifecode-standalone-chrome.js';

const SUPABASE_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const LS_KEY = 'palja_counselor_session_notes_v1';

async function main() {
  if (!(await hasValidLifecodeSession())) {
    window.location.replace('/lifecode/');
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  document.getElementById('guard').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  if (!session) {
    document.getElementById('lifecodeBridge').hidden = false;
    return;
  }

  const { data: profile } = await sb.from('profiles').select('plan, plan_active_until').eq('id', session.user.id).single();
  const plan = profile?.plan || 'free';
  const proOk =
    plan === 'professional' &&
    (!profile?.plan_active_until || new Date(profile.plan_active_until) > new Date());

  if (!proOk) {
    document.getElementById('lifecodeBridge').hidden = false;
    document.querySelector('#lifecodeBridge p').innerHTML =
      '로그인되었지만 <strong>Professional</strong> 플랜이 아닙니다.<br>고객 카드 저장은 Professional에서 이용할 수 있어요. 라이프코드 분석은 접속 코드로 계속 쓸 수 있습니다.';
    return;
  }

  document.getElementById('workspace').style.display = 'block';
  PLACEHOLDER_MAIN_BODY
}

main();
</script>
</body>''',
    text,
    flags=re.DOTALL,
    count=1,
  )

path.write_text(text, encoding="utf-8")
print("partial patch - check file manually")
