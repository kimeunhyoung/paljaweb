// ===== 팔자연구소 Supabase 인증 =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co'
const SUPABASE_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    detectSessionInUrl: true,
    flowType: 'pkce',
    persistSession: true
  }
})

// 메시지 표시 함수
function readSafeNextUrl() {
  try {
    const raw = new URLSearchParams(window.location.search).get('next')
    if (!raw) return null
    let n = decodeURIComponent(raw).trim()
    if (!n || n.includes('..') || n.startsWith('//')) return null
    if (/^https?:/i.test(n)) return null
    return n
  } catch {
    return null
  }
}

function buildOAuthRedirectUrl() {
  const next = readSafeNextUrl()
  const path = window.location.pathname.includes('signup') ? '/signup.html' : '/login.html'
  const base = window.location.origin + path
  return next ? `${base}?next=${encodeURIComponent(next)}` : base
}

function showMsg(msg, isError = false) {
  const el = document.getElementById('auth-msg')
  if (!el) return
  el.innerHTML = `
    <div style="
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      background: ${isError ? '#fef2f2' : '#f0fdf4'};
      color: ${isError ? '#dc2626' : '#16a34a'};
      border: 1px solid ${isError ? '#fecaca' : '#bbf7d0'};
    ">${msg}</div>
  `
}

function trackAuthEvent(name, params) {
  if (window.PaljaAnalytics?.track) {
    window.PaljaAnalytics.track(name, params || {});
  }
}

function isSignupPage() {
  return window.location.pathname.includes('signup');
}

// ===== 로그인 페이지 =====
const loginForm = document.getElementById('login-form')
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value
    const btn = loginForm.querySelector('button[type="submit"]')

    btn.textContent = '로그인 중...'
    btn.disabled = true

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      showMsg('로그인 실패: ' + (error.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 틀렸어요.' : error.message), true)
      btn.textContent = '로그인'
      btn.disabled = false
    } else {
      showMsg('로그인 성공! 이동 중...')
      const next = readSafeNextUrl()
      setTimeout(() => { window.location.href = next || 'dashboard.html' }, 1000)
    }
  })
}

const forgotForm = document.getElementById('forgot-form')
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('forgot-email')?.value?.trim()
    const btn = forgotForm.querySelector('button[type="submit"]')
    if (!email) return

    btn.textContent = '전송 중...'
    btn.disabled = true

    const redirectTo = window.location.origin + '/login.html'
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      showMsg('전송 실패: ' + error.message, true)
      btn.textContent = '재설정 링크 보내기'
      btn.disabled = false
    } else {
      showMsg('✅ 재설정 링크를 이메일로 보냈습니다. 받은편지함을 확인해주세요.')
      btn.textContent = '재설정 링크 보내기'
      btn.disabled = false
    }
  })
}

// ===== 회원가입 페이지 =====
const signupForm = document.getElementById('signup-form')
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('signup-email').value
    const password = document.getElementById('signup-password').value
    const btn = signupForm.querySelector('button[type="submit"]')

    btn.textContent = '가입 중...'
    btn.disabled = true
    trackAuthEvent('signup_start', { method: 'email' })

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: window.PaljaAttribution?.read?.()
        ? { data: { palja_attribution: window.PaljaAttribution.read() } }
        : undefined,
    })

    if (error) {
      showMsg('가입 실패: ' + error.message, true)
      btn.textContent = '회원가입'
      btn.disabled = false
    } else {
      trackAuthEvent('signup_complete', { method: 'email' })
      showMsg('✅ 가입 완료! 이메일을 확인해서 인증을 완료해주세요.')
      btn.textContent = '회원가입'
      btn.disabled = false
    }
  })
}

// ===== 소셜 로그인 (구글·카카오·네이버) =====
function bindOAuthButton(selector, loadingText, failLabel, extraOptions = {}, oauthProvider) {
  const provider = oauthProvider || selector
  document.querySelectorAll(`[data-provider="${selector}"]`).forEach(btn => {
    btn.addEventListener('click', async () => {
      const label = btn.textContent
      btn.disabled = true
      btn.textContent = loadingText
      if (isSignupPage()) trackAuthEvent('signup_start', { method: selector })

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: buildOAuthRedirectUrl(),
          ...extraOptions
        }
      })

      if (error) {
        showMsg(failLabel + ': ' + error.message, true)
        btn.disabled = false
        btn.textContent = label
      }
    })
  })
}

bindOAuthButton('google', '구글로 이동 중...', '구글 로그인 실패', {
  queryParams: { prompt: 'select_account' }
})
bindOAuthButton('kakao', '카카오로 이동 중...', '카카오 로그인 실패')

// ===== 네이버 로그인 (서버 OAuth — Supabase Custom Provider 불필요) =====
document.querySelectorAll('[data-provider="naver"]').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.disabled = true
    btn.textContent = '네이버로 이동 중...'
    if (isSignupPage()) trackAuthEvent('signup_start', { method: 'naver' })
    const next = readSafeNextUrl()
    let url = '/api/auth/naver'
    if (next) url += '?next=' + encodeURIComponent(next)
    window.location.href = url
  })
})

function waitForSession(timeoutMs = 8000) {
  return new Promise((resolve) => {
    let done = false
    const finish = (session) => {
      if (done) return
      done = true
      subscription.unsubscribe()
      clearTimeout(timer)
      resolve(session || null)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        finish(session)
      }
    })

    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      finish(session)
    }, timeoutMs)
  })
}

function cleanAuthQuery() {
  const params = new URLSearchParams(window.location.search)
  params.delete('code')
  params.delete('error')
  params.delete('error_description')
  const next = params.get('next')
  const qs = next ? '?next=' + encodeURIComponent(next) : ''
  window.history.replaceState({}, '', window.location.pathname + qs)
}

// ===== OAuth 복귀 (?code=) — 로그인 시작한 같은 페이지에서 세션 교환 =====
async function handleOAuthReturn() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (!code) return false

  showMsg('로그인 처리 중...')

  await new Promise((r) => setTimeout(r, 200))

  let session = await waitForSession(2500)
  if (!session) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      cleanAuthQuery()
      showMsg('소셜 로그인 실패: ' + error.message, true)
      return true
    }
    session = await waitForSession(4000)
  }

  if (session) {
    if (window.PaljaAttribution?.syncWithToken) {
      await window.PaljaAttribution.syncWithToken(session.access_token);
    }
    if (isSignupPage()) trackAuthEvent('signup_complete', { method: 'oauth' })
    const next = readSafeNextUrl()
    window.location.replace(next || '/dashboard.html')
    return true
  }

  cleanAuthQuery()
  showMsg('소셜 로그인 실패: 로그인 세션을 확인할 수 없습니다.', true)
  return true
}

const isAuthPage = window.location.pathname.includes('login') || window.location.pathname.includes('signup')
const authParams = new URLSearchParams(window.location.search)

if (isAuthPage && authParams.get('code')) {
  handleOAuthReturn()
} else {
  const oauthErr = authParams.get('error_description') || authParams.get('error')
  if (oauthErr && document.getElementById('auth-msg')) {
    showMsg('소셜 로그인 실패: ' + decodeURIComponent(oauthErr), true)
    cleanAuthQuery()
  }

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session && isAuthPage) {
      const next = readSafeNextUrl()
      window.location.href = next || 'dashboard.html'
    }
  })
}