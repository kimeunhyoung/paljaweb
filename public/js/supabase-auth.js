// ===== 팔자연구소 Supabase 인증 =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co'
const SUPABASE_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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
  const base = window.location.origin + '/auth/callback.html'
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

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      showMsg('가입 실패: ' + error.message, true)
      btn.textContent = '회원가입'
      btn.disabled = false
    } else {
      showMsg('✅ 가입 완료! 이메일을 확인해서 인증을 완료해주세요.')
      btn.textContent = '회원가입'
      btn.disabled = false
    }
  })
}

// ===== 구글 로그인 =====
const googleBtns = document.querySelectorAll('[data-provider="google"]')
googleBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    const label = btn.textContent
    btn.disabled = true
    btn.textContent = '구글로 이동 중...'

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildOAuthRedirectUrl(),
        queryParams: {
          prompt: 'select_account'
        }
      }
    })

    if (error) {
      showMsg('구글 로그인 실패: ' + error.message, true)
      btn.disabled = false
      btn.textContent = label
    }
  })
})

// ===== 카카오/네이버 버튼 비활성화 (추후 설정) =====
document.querySelectorAll('[data-provider="kakao"], [data-provider="naver"]').forEach(btn => {
  btn.disabled = true
  btn.style.opacity = '0.4'
  btn.style.cursor = 'not-allowed'
  btn.title = '도메인 설정 후 이용 가능합니다'
})

// ===== OAuth 오류 메시지 (callback 실패 후 login.html?error=) =====
const oauthErr = new URLSearchParams(window.location.search).get('error')
if (oauthErr && document.getElementById('auth-msg')) {
  showMsg('소셜 로그인 실패: ' + decodeURIComponent(oauthErr), true)
}

// ===== 로그인 상태 확인 (이미 로그인된 경우 대시보드로) =====
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session && (window.location.pathname.includes('login') || window.location.pathname.includes('signup'))) {
    const next = readSafeNextUrl()
    window.location.href = next || 'dashboard.html'
  }
})