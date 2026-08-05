// ===== 팔자연구소 메인 JS =====

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://sghsryumnrnftyjoqmwf.supabase.co',
  'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1'
)

// 네비게이션 스크롤 효과
window.addEventListener('scroll', () => {
  const chrome = document.getElementById('siteChrome')
  const navbar = document.getElementById('navbar')
  const on = window.scrollY > 50
  if (chrome) chrome.classList.toggle('scrolled', on)
  if (navbar) navbar.classList.toggle('scrolled', on)
})

// 히어로 '프로그램 바로가기' → 상단 프로그램 바 강조
document.getElementById('heroProgramsLink')?.addEventListener('click', (e) => {
  e.preventDefault()
  const nav = document.getElementById('programs')
  if (!nav) return
  nav.classList.add('is-pulse')
  window.scrollTo({ top: 0, behavior: 'smooth' })
  setTimeout(() => nav.classList.remove('is-pulse'), 1400)
})

function initMobileMenu() {
  const btn = document.getElementById('navMenuBtn')
  const panel = document.getElementById('mobileNavPanel')
  if (!btn || !panel) return

  const closePanel = () => {
    panel.classList.remove('open')
    panel.hidden = true
    btn.setAttribute('aria-expanded', 'false')
  }
  const openPanel = () => {
    panel.hidden = false
    panel.classList.add('open')
    btn.setAttribute('aria-expanded', 'true')
  }

  btn.addEventListener('click', () => {
    const isOpen = panel.classList.contains('open')
    if (isOpen) closePanel()
    else openPanel()
  })

  panel.addEventListener('click', (e) => {
    const t = e.target
    if (t instanceof HTMLElement && t.closest('a')) closePanel()
  })

  document.addEventListener('click', (e) => {
    const t = e.target
    if (!(t instanceof Node)) return
    if (!panel.contains(t) && !btn.contains(t)) closePanel()
  })

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closePanel()
  })
}

// 서비스 아이템 클릭 활성화
document.querySelectorAll('.service-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.service-item').forEach(i => i.classList.remove('active'))
    item.classList.add('active')
  })
})

// 스크롤 애니메이션
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1'
        entry.target.style.transform = 'translateY(0)'
      }
    })
  }, { threshold: 0.1 })

  document.querySelectorAll('.service-item, .pricing-card, .about-card').forEach(el => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(20px)'
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease'
    observer.observe(el)
  })
}

function isProfessionalAccess(profile) {
  if (!profile) return false
  const p = String(profile.plan || 'free').toLowerCase()
  if (p !== 'professional' && p !== 'private') return false
  if (!profile.plan_active_until) return true
  return new Date(profile.plan_active_until) > new Date()
}

// 로그인 상태에 따라 네비게이션 변경
async function updateNav() {
  const { data: { session } } = await supabase.auth.getSession()
  let sess = session

  if (!sess) {
    try {
      const keysToCheck = ['supabase.auth.token', 'sb:auth.token', 'sb.auth.token', 'supabase:auth.token']
      for (const key of keysToCheck) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        try {
          let parsed = JSON.parse(raw)
          if (typeof parsed === 'string') parsed = JSON.parse(parsed)
          let candidate = parsed.currentSession || parsed.session || parsed
          if (parsed?.value) {
            try {
              const inner = JSON.parse(parsed.value)
              candidate = inner.currentSession || inner.session || inner || candidate
            } catch (e) { /* ignore */ }
          }
          if (candidate?.access_token && candidate?.user) {
            sess = { user: candidate.user }
            break
          }
          if (candidate?.user) {
            sess = { user: candidate.user }
            break
          }
        } catch (e) {
          continue
        }
      }
    } catch (e) { /* ignore */ }
  }

  const navActions = document.querySelector('.nav-actions')
  const mobileNavActions = document.querySelector('.mobile-nav-actions')
  if (!navActions && !mobileNavActions) return

  const renderAuthActions = (target, html, isLoggedIn = false) => {
    if (!target) return
    target.innerHTML = html
    if (isLoggedIn) {
      const logoutBtn = target.querySelector('.logout-btn')
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          await supabase.auth.signOut()
          window.location.href = 'index.html'
        })
      }
    }
  }

  if (sess && sess.user) {
    let counselorNav = ''
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, plan_active_until')
        .eq('id', sess.user.id)
        .single()
      if (isProfessionalAccess(profile)) {
        counselorNav =
          '<a href="counselor.html" class="btn-nav-ghost">상담사 허브</a>' +
          '<a href="counselor-reading.html" class="btn-nav-ghost">AI리딩</a>'
      }
    } catch (e) { /* ignore */ }

    const email = sess.user.email || sess.user.user_metadata?.full_name || sess.user.id
    const loggedInHtml = `
      <span style="font-size:13px; color:var(--text2); max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${email}</span>
      ${counselorNav}
      <a href="dashboard.html" class="btn-nav-ghost">마이페이지</a>
      <button class="btn-nav-fill logout-btn">로그아웃</button>
    `
    const mobileLoggedInHtml = `
      ${counselorNav}
      <a href="dashboard.html" class="btn-nav-ghost">마이페이지</a>
      <button class="btn-nav-fill logout-btn">로그아웃</button>
    `
    renderAuthActions(navActions, loggedInHtml, true)
    renderAuthActions(mobileNavActions, mobileLoggedInHtml, true)
  } else {
    const guestHtml = `
      <a href="login.html" class="btn-nav-ghost">로그인</a>
      <a href="signup.html" class="btn-nav-fill">무료 시작</a>
    `
    renderAuthActions(navActions, guestHtml, false)
    renderAuthActions(mobileNavActions, guestHtml, false)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu()
  initScrollAnimations()
  updateNav()
})

// ===== HERO: 로그인 사용자 정보로 카드 업데이트 =====

function reduceToSingle(n, allowM = true) {
  let r = Number(n)
  while (r > 9) {
    if (allowM && (r === 11 || r === 22 || r === 33)) return r
    r = String(r).split('').reduce((a, b) => Number(a) + Number(b), 0)
  }
  return r
}

function sumMonthDayDigits(month, day) {
  return String(month).split('').concat(String(day).split(''))
    .reduce((a, b) => a + Number(b), 0)
}

function sumAllBirthDigits(year, month, day) {
  return String(year).split('')
    .concat(String(month).split(''), String(day).split(''))
    .reduce((a, b) => a + Number(b), 0)
}

function lifePathPreLabel(lpS, lpSAlt) {
  if (lpSAlt == null || lpSAlt === '') return String(lpS)
  return `${lpS}/${lpSAlt}`
}

function lifePathValueLabel(lp, lpAlt) {
  if (lpAlt == null || lpAlt === '') return String(lp)
  return `${lp}/${lpAlt}`
}

function reduceToTarotNumber(n) {
  let r = Number(n)
  if (!Number.isFinite(r)) return 0
  while (true) {
    if (r === 22) return 0
    if (r >= 0 && r <= 21) return r
    r = String(Math.abs(r)).split('').reduce((a, b) => a + Number(b), 0)
  }
}

function calcMoonNumber(month, day) {
  const pre = sumMonthDayDigits(month, day)
  return { pre, single: reduceToTarotNumber(pre) }
}

function sumYearDigits(year) {
  return String(year).split('').reduce((a, b) => Number(a) + Number(b), 0)
}

function calcPersonalYearTarot(year, moonPre) {
  const pre = sumYearDigits(year) + moonPre
  return { pre, single: reduceToTarotNumber(pre) }
}

const TAROT_MAJOR_KR = {
  0: '바보', 1: '마법사', 2: '여사제', 3: '여황제', 4: '황제', 5: '교황', 6: '연인', 7: '전차', 8: '힘', 9: '은둔자',
  10: '운명의 수레바퀴', 11: '정의', 12: '매달린 사람', 13: '죽음(변환)', 14: '절제', 15: '악마', 16: '탑', 17: '별', 18: '달', 19: '태양', 20: '심판', 21: '세계',
}

function getZodiacInfo(m, d) {
  const Z = [
    { n: '염소자리',   s: [12, 22], e: [1,  19], i: '♑' },
    { n: '물병자리',   s: [1,  20], e: [2,  18], i: '♒' },
    { n: '물고기자리', s: [2,  19], e: [3,  20], i: '♓' },
    { n: '양자리',     s: [3,  21], e: [4,  19], i: '♈' },
    { n: '황소자리',   s: [4,  20], e: [5,  20], i: '♉' },
    { n: '쌍둥이자리', s: [5,  21], e: [6,  21], i: '♊' },
    { n: '게자리',     s: [6,  22], e: [7,  22], i: '♋' },
    { n: '사자자리',   s: [7,  23], e: [8,  22], i: '♌' },
    { n: '처녀자리',   s: [8,  23], e: [9,  23], i: '♍' },
    { n: '천칭자리',   s: [9,  24], e: [10, 22], i: '♎' },
    { n: '전갈자리',   s: [10, 23], e: [11, 22], i: '♏' },
    { n: '사수자리',   s: [11, 23], e: [12, 21], i: '♐' },
  ]
  return Z.find(z => (m === z.s[0] && d >= z.s[1]) || (m === z.e[0] && d <= z.e[1])) || { n: '미지', i: '✨' }
}

// ── 수비학 데이터 ──────────────────────────────────────

const DEEP_MAP = {
  1:  "<b>1번 · 자립적 선구자</b><br>스스로 길을 여는 타입입니다. 남이 가지 않은 방향을 먼저 선택하고, 아이디어를 행동으로 옮기는 추진력이 강점이에요.",
  2:  "<b>2번 · 조화로운 연결자</b><br>사람 사이의 미묘한 감정을 잘 읽고 다리 역할을 자연스럽게 해냅니다. 경청과 배려가 몸에 배어 있습니다.",
  3:  "<b>3번 · 창의적 표현자</b><br>말과 글, 아이디어로 사람들을 끌어당기는 재능이 있습니다. 자신을 표현할 때 가장 빛나는 사람입니다.",
  4:  "<b>4번 · 성실한 실행가</b><br>계획을 세우고 끝까지 해내는 사람입니다. 신뢰와 성실함이 가장 큰 무기입니다.",
  5:  "<b>5번 · 자유로운 모험가</b><br>변화와 새로운 자극을 즐기고 다양한 경험 속에서 성장합니다. 적응력이 탁월합니다.",
  6:  "<b>6번 · 따뜻한 돌봄이</b><br>주변 사람을 살피고 챙기는 일이 자연스러운 사람입니다. 관계 안에서 따뜻한 안정감을 줍니다.",
  7:  "<b>7번 · 깊이 있는 탐구자</b><br>겉보다 속을, 현상보다 본질을 보려 합니다. 전문성과 통찰력으로 주변에 신뢰를 줍니다.",
  8:  "<b>8번 · 현실적 성취가</b><br>목표를 설정하고 결과로 증명하는 사람입니다. 실행력과 판단력이 강합니다.",
  9:  "<b>9번 · 포용력 있는 완성자</b><br>넓은 시야와 깊은 공감으로 사람들을 이해합니다. 베풀수록 풍요로워지는 삶의 방식을 가집니다.",
  11: "<b>11번 · 예민한 직관가 (마스터 넘버)</b><br>보통 사람이 느끼지 못하는 것을 먼저 감지하는 탁월한 직관이 있습니다.",
  22: "<b>22번 · 위대한 설계자 (마스터 넘버)</b><br>큰 그림을 그리고 실제로 현실에 구현하는 능력을 타고났습니다.",
  33: "<b>33번 · 헌신적 치유자 (마스터 넘버)</b><br>타인을 돕고 치유하는 일에서 깊은 보람을 느끼는 사람입니다.",
}

const HERO_INSIGHT = {
  1:  { main: "당신의 삶은 <b>독립과 개척</b>이라는 테마를 따라 흐릅니다. 스스로 결정하고 혼자 길을 만드는 경험이 반복되며, 이 과정을 통해 자신만의 진정한 주도성이 완성됩니다." },
  2:  { main: "당신의 삶은 <b>연결과 조화</b>라는 테마를 따라 흐릅니다. 사람 사이에서 균형을 맞추고 협력하는 경험이 반복되며, 관계 속에서 자신의 진가가 드러납니다." },
  3:  { main: "당신의 삶은 <b>표현과 창조</b>라는 테마를 따라 흐릅니다. 자신을 드러내고 아이디어를 세상에 내놓는 경험이 반복되며, 표현할수록 더 풍부해지는 삶을 살아갑니다." },
  4:  { main: "당신의 삶은 <b>안정과 축적</b>이라는 테마를 따라 흐릅니다. 기초를 다지고 꾸준히 쌓아가는 경험이 반복되며, 시간이 지날수록 더 단단해지는 방식으로 성장합니다." },
  5:  { main: "당신의 삶은 <b>자유와 변화</b>라는 테마를 따라 흐릅니다. 새로운 경험을 향해 움직이고 변화 속에서 성장하는 일이 반복되며, 다양성 속에서 자신을 완성해 갑니다." },
  6:  { main: "당신의 삶은 <b>책임과 돌봄</b>이라는 테마를 따라 흐릅니다. 주변 사람을 살피고 관계 안에서 의미를 찾는 경험이 반복되며, 사랑을 주는 과정에서 자신도 함께 성장합니다." },
  7:  { main: "당신의 삶은 <b>탐구와 내면 성장</b>이라는 테마를 따라 흐릅니다. 본질을 파고들고 혼자만의 깊이를 쌓는 경험이 반복되며, 지식과 통찰을 통해 자신과 세상을 이해해 갑니다." },
  8:  { main: "당신의 삶은 <b>성취와 실행</b>이라는 테마를 따라 흐릅니다. 목표를 세우고 실제 결과를 만들어내는 경험이 반복되며, 현실에서 증명하는 것이 삶의 핵심 동력입니다." },
  9:  { main: "당신의 삶은 <b>포용과 완성</b>이라는 테마를 따라 흐릅니다. 개인을 넘어 더 큰 가치를 위해 움직이는 경험이 반복되며, 베풀고 나눌수록 더 풍요로워지는 흐름을 가집니다." },
  11: { main: "당신의 삶은 <b>영감과 깨달음</b>이라는 마스터 테마를 따라 흐릅니다. 직관을 통해 앞을 감지하고 사람들에게 빛을 비추는 경험이 반복되며, 내면의 목소리를 믿을 때 가장 큰 잠재력이 열립니다." },
  22: { main: "당신의 삶은 <b>비전의 현실화</b>라는 마스터 테마를 따라 흐릅니다. 큰 그림을 그리고 실제로 구현하는 경험이 반복되며, 이상과 실행력이 함께 작동할 때 세상을 바꾸는 힘을 발휘합니다." },
  33: { main: "당신의 삶은 <b>치유와 헌신</b>이라는 마스터 테마를 따라 흐릅니다. 타인을 이해하고 성장을 돕는 경험이 반복되며, 조건 없는 사랑이 삶의 중심 방향이자 에너지입니다." },
}

const ZODIAC_CLOSING = {
  '양자리':    '뜨거운 열정과 즉각적인 행동력을 타고났습니다. 먼저 뛰어드는 용기와 경쟁 속에서 에너지를 얻는 기질입니다.',
  '황소자리':  '깊은 인내와 감각적 풍요로움을 타고났습니다. 안정을 중시하고 한번 결심하면 흔들리지 않는 끈기를 가진 기질입니다.',
  '쌍둥이자리':'날카로운 지성과 언어 감각을 타고났습니다. 빠른 사고와 유연한 소통으로 어디서든 활력을 만들어내는 기질입니다.',
  '게자리':    '깊은 감수성과 따뜻한 보호 본능을 타고났습니다. 감정의 흐름에 민감하고 소중한 사람을 지키는 것에서 에너지를 얻는 기질입니다.',
  '사자자리':  '타고난 카리스마와 강한 자존감을 가졌습니다. 표현하고 이끄는 상황에서 자연스럽게 빛을 발하는 기질입니다.',
  '처녀자리':  '예리한 분석력과 꼼꼼한 성실함을 타고났습니다. 완성도를 높이고 세부를 다듬는 일에서 만족과 에너지를 얻는 기질입니다.',
  '천칭자리':  '균형 감각과 아름다움을 향한 안목을 타고났습니다. 조화로운 관계와 미적인 환경에서 에너지를 회복하는 기질입니다.',
  '전갈자리':  '강렬한 통찰력과 불굴의 집중력을 타고났습니다. 표면 아래 본질을 파고드는 것에서 에너지를 얻고 변화를 통해 성장하는 기질입니다.',
  '사수자리':  '자유로운 탐구심과 낙천적인 확장 에너지를 타고났습니다. 넓은 세계와 새로운 가능성을 향해 나아가는 것에서 활력을 얻는 기질입니다.',
  '염소자리':  '강인한 인내와 현실적 목표 지향성을 타고났습니다. 성실하게 쌓아가며 시간이 지날수록 더 단단해지는 기질입니다.',
  '물병자리':  '독창적 사고와 인도주의적 시각을 타고났습니다. 관습에 얽매이지 않고 미래 지향적 아이디어에서 영감을 얻는 기질입니다.',
  '물고기자리':'깊은 공감과 신비로운 직관력을 타고났습니다. 눈에 보이지 않는 감정의 흐름을 감지하고, 경계를 초월한 연결에서 힘을 얻는 기질입니다.',
}

// 문 넘버 — 내면의 성향과 감정적 동력
const MOON_NATURE_MAP = {
  1:  "내면에는 강한 독립심과 자아의식이 자리합니다. 스스로 결정하고 스스로 책임지고 싶은 욕구가 강하며, 자신의 가치관을 지키는 것을 매우 중요하게 여깁니다.",
  2:  "내면에는 깊은 공감 능력과 조화에 대한 갈망이 흐릅니다. 관계에서 평화가 유지될 때 가장 안정되고, 갈등 상황에서 감정의 변화를 누구보다 예민하게 감지합니다.",
  3:  "내면에는 표현하고 싶은 충동이 항상 살아있습니다. 감정과 생각을 말·글·창작으로 드러낼 때 가장 가볍고 자유롭다고 느끼는 성향입니다.",
  4:  "내면에는 안정과 질서에 대한 강한 욕구가 있습니다. 체계가 잡혀 있을 때 안심하고, 꾸준함과 일관성이 자신을 지탱하는 중심이라고 느낍니다.",
  5:  "내면에는 자유에 대한 끝없는 갈망이 있습니다. 제한받거나 틀에 갇히는 느낌을 가장 답답하게 여기며, 새로운 자극과 변화 속에서 활력을 되찾습니다.",
  6:  "내면에는 사람에 대한 사랑과 책임감이 깊이 뿌리내려 있습니다. 주변이 잘 되는 것을 볼 때 가장 큰 보람을 느끼며, 관계와 돌봄 속에서 삶의 의미를 찾습니다.",
  7:  "내면에는 끊임없이 본질을 파고드는 탐구심이 있습니다. 표면적인 답으로는 만족하지 못하고, 혼자 깊이 생각하는 시간이 에너지를 회복시킵니다.",
  8:  "내면에는 성취와 능력 발휘에 대한 강한 욕구가 있습니다. 목표를 향해 집중하고 결과를 만들어낼 때 자신감이 차오르고, 방향 없이 정체되는 것을 가장 힘들어합니다.",
  9:  "내면에는 더 큰 의미와 연결되고 싶은 마음이 흐릅니다. 개인의 이익보다 넓은 가치를 위해 움직일 때 가장 충만함을 느끼며, 이타적인 감정이 자연스럽게 솟아납니다.",
  11: "내면이 매우 예민하게 주변을 감지합니다. 다른 사람의 에너지와 감정을 자신도 모르게 흡수하는 경향이 있어, 혼자만의 시간이 없으면 쉽게 에너지가 소진됩니다.",
  22: "내면에는 크고 구체적인 이상이 자리잡고 있습니다. 단순한 일보다 의미 있고 규모 있는 일에 에너지를 쏟을 때 내면이 가장 살아있다고 느낍니다.",
  33: "내면 깊은 곳에 타인을 치유하고자 하는 마음이 있습니다. 누군가에게 도움이 되었을 때 가장 큰 보람을 느끼며, 이타심이 삶의 에너지 원천이 됩니다.",
}

const PERSONAL_YEAR_MAP = {
  1:  "올해는 새로운 시작의 해입니다. 적극적으로 씨앗을 뿌리고 주도적으로 움직이세요.",
  2:  "올해는 협력과 관계의 해입니다. 기다림과 연대로 기회를 만드세요.",
  3:  "올해는 표현과 확장의 해입니다. 창의력을 드러내며 사람들과 소통하세요.",
  4:  "올해는 내실을 다지는 해입니다. 기초를 튼튼히 하고 꾸준히 쌓아가세요.",
  5:  "올해는 변화와 모험의 해입니다. 유연하게 흐르고 새로운 기회를 받아들이세요.",
  6:  "올해는 돌봄과 책임의 해입니다. 주변을 보살피며 관계에 집중하세요.",
  7:  "올해는 성찰과 학습의 해입니다. 혼자만의 시간을 통해 내면을 단단히 하세요.",
  8:  "올해는 성취와 실천의 해입니다. 실행력을 발휘해 결과를 만들어가세요.",
  9:  "올해는 마무리와 통합의 해입니다. 정리하고 다음 주기를 준비하세요.",
  11: "영감과 직관이 예민하게 깨어나는 해입니다. 내면의 목소리에 귀 기울이고 직관을 신뢰하세요.",
  22: "현실적 실행과 큰 설계가 가능한 해입니다. 계획을 구조화하고 실현에 집중하세요.",
  33: "치유와 봉사의 에너지가 강해지는 해입니다. 타인을 돕는 일이 곧 자신의 성장으로 이어집니다.",
}

function stripHtml(html) {
  if (!html) return ''
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function escapeHtmlText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 히어로 카드용: 첫 문장·구까지만 (전체는 analysis.html) */
function heroTextTeaser(rawHtml, maxChars = 52) {
  const t = stripHtml(rawHtml).replace(/\s+/g, ' ').trim()
  if (!t) return ''
  let bestEnd = -1
  let bestStart = Infinity
  const boundaries = [
    '습니다.', '입니다.', '여깁니다.', '집니다.', '빕니다.',
    '예요.', '어요.', '해요.', '돼요.', '같아요.',
  ]
  for (const b of boundaries) {
    const i = t.indexOf(b)
    if (i !== -1 && i < bestStart) {
      bestStart = i
      bestEnd = i + b.length
    }
  }
  let out = bestEnd > 0 ? t.slice(0, bestEnd) : t
  if (out.length > maxChars) {
    out = `${out.slice(0, maxChars - 1).trim()}…`
  }
  return escapeHtmlText(out)
}

function lifePathHeroLine(lp) {
  const insight = HERO_INSIGHT[lp]?.main
  if (insight) {
    const m = insight.match(/<b>([^<]+)<\/b>/)
    if (m) {
      const theme = escapeHtmlText(m[1])
      return `<b>${theme}</b> 테마가 삶의 큰 방향을 잡아줘요.`
    }
  }
  const full = insight || DEEP_MAP[lp] || ''
  return heroTextTeaser(full, 54)
}

// ── Hero 카드 업데이트 ─────────────────────────────────

/** 히어로 주요 버튼: 비로그인 / 일반 로그인 / Professional(상담사) 에 맞게 전환 */
function syncHeroCtas(session, profile) {
  const heroCta = document.getElementById('heroCta')
  const counselorRow = document.getElementById('heroCounselorRow')
  if (!heroCta) return

  // 상담사 경로는 항상 노출 (이중 진입)
  if (counselorRow) {
    counselorRow.style.display = 'flex'
    counselorRow.classList.toggle('is-pro', !!(session && isProfessionalAccess(profile)))
  }

  if (!session) {
    heroCta.style.display = ''
    heroCta.textContent = '무료로 시작하기'
    heroCta.href = 'analysis.html'
    return
  }

  if (isProfessionalAccess(profile)) {
    heroCta.style.display = 'none'
    return
  }

  heroCta.style.display = ''
  heroCta.textContent = '라이프코드 분석 보기'
  heroCta.href = 'analysis.html'
}

async function populateHeroWithUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const heroExists = document.querySelector('.hero-right .hero-card-main')
    if (!heroExists) return

    if (!session) {
      syncHeroCtas(null, null)
      const nameEl = heroExists.querySelector('.card-name')
      const dateEl = heroExists.querySelector('.card-date')
      if (nameEl) nameEl.textContent = '로그인하면 맞춤 분석 보기'
      if (dateEl) dateEl.textContent = ''
      return
    }

    let name = null, birth = null
    let profileForPlan = null
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name,birth,plan,plan_active_until')
        .eq('id', session.user.id)
        .single()
      if (profile) {
        profileForPlan = profile
        name = profile.full_name || null
        birth = profile.birth || null
      }
    } catch (e) { /* ignore */ }

    syncHeroCtas(session, profileForPlan)

    if (!name) name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || null
    if (!birth) birth = session.user.user_metadata?.birth || null

    if (!birth) {
      const hero = document.querySelector('.hero-right .hero-card-main')
      if (!hero) return
      const nameEl = hero.querySelector('.card-name')
      const dateEl = hero.querySelector('.card-date')
      const insightEl = hero.querySelector('.card-insight')
      if (nameEl) nameEl.textContent = name || '홍길동'
      if (dateEl) dateEl.textContent = '생년월일을 입력해주세요'
      if (insightEl) {
        insightEl.className = 'card-insight'
        insightEl.innerHTML = `이름과 생년월일을 입력하면 개인화된 라이프코드를 제공합니다. <a href="dashboard.html" style="color:inherit;text-decoration:underline;">프로필 입력하기</a>`
      }
      hero.querySelectorAll('.card-num-item').forEach(item => {
        const valEl = item.querySelector('.card-num-val')
        if (valEl) valEl.textContent = '—'
      })
      return
    }

    const parts = birth.split('-')
    if (parts.length !== 3) return
    const y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2])
    if (!y || !m || !d) return

    const yr_r  = reduceToSingle(String(y).split('').reduce((a, b) => Number(a) + Number(b), 0))
    const mr_r  = reduceToSingle(m)
    const dr_r  = reduceToSingle(d)
    const lpS   = yr_r + mr_r + dr_r
    const lp    = reduceToSingle(lpS)
    const lpSAlt = sumAllBirthDigits(y, m, d)
    const lpAlt = reduceToSingle(lpSAlt, false)
    const lpDisplay = lifePathValueLabel(lp, lpAlt)
    const lpPreLabel = lifePathPreLabel(lpS, lpSAlt)
    const moonNums = calcMoonNumber(m, d)
    const mnPre = moonNums.pre
    const mn    = moonNums.single
    const curY  = new Date().getFullYear()
    const curY_digitSum = sumYearDigits(curY)
    const pyS   = curY_digitSum + mnPre
    const py    = reduceToTarotNumber(pyS)
    const z     = getZodiacInfo(m, d)

    const hero = document.querySelector('.hero-right .hero-card-main')
    if (!hero) return

    const nameEl = hero.querySelector('.card-name')
    const dateEl = hero.querySelector('.card-date')
    if (nameEl) nameEl.textContent = name
    if (dateEl) dateEl.textContent = `${y}년 ${m}월 ${d}일`

    // ── insight 렌더링 (인생여정수 + 문넘버 + 별자리 + 올해) ──
    const insightEl = hero.querySelector('.card-insight')
    if (insightEl) {
      const moonInner = MOON_NATURE_MAP[mn] || (mn >= 0 && mn <= 21 ? `타로 메이저 ${mn}번 에너지가 무의식·감정 반응의 바탕이 됩니다.` : '')
      const zodiacLine = ZODIAC_CLOSING[z.n] || ''
      const yearText = PERSONAL_YEAR_MAP[py]
        || (TAROT_MAJOR_KR[py] != null ? `올해는 타로 ${py}번 ${TAROT_MAJOR_KR[py]} 에너지의 해입니다.` : '')
      const mainLine = lifePathHeroLine(lp)
      const moonTeaser = moonInner ? heroTextTeaser(moonInner, 48) : ''
      const zodiacTeaser = zodiacLine ? heroTextTeaser(zodiacLine, 44) : ''

      insightEl.className = 'card-insight card-insight--teaser'
      insightEl.innerHTML = `
        <div style="margin-bottom:8px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:var(--accent);margin-bottom:4px;">삶의 방향 · 인생여정수 ${lpDisplay}</div>
          <div style="font-size:12px;line-height:1.55;color:var(--cream);">${mainLine}</div>
        </div>
        ${moonTeaser ? `
        <div style="margin-bottom:8px;padding-left:8px;border-left:2px solid rgba(200,169,110,0.35);">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:rgba(200,169,110,0.75);margin-bottom:3px;">내면의 성향 · 문 넘버 ${mn}</div>
          <div style="font-size:11.5px;line-height:1.5;color:rgba(245,240,232,0.82);">${moonTeaser}</div>
        </div>` : ''}
        ${zodiacTeaser ? `
        <div style="margin-bottom:8px;padding-left:8px;border-left:2px solid rgba(200,169,110,0.2);">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:rgba(200,169,110,0.5);margin-bottom:3px;">타고난 기질 · ${z.i} ${z.n}</div>
          <div style="font-size:11.5px;line-height:1.5;color:rgba(245,240,232,0.68);">${zodiacTeaser}</div>
        </div>` : ''}
        <div style="font-size:11px;color:rgba(245,240,232,0.5);padding-top:6px;border-top:1px solid rgba(200,169,110,0.15);">
          <strong style="font-size:10px;letter-spacing:0.08em;color:var(--accent);">올해 에너지 · 개인연도 ${py}번</strong>
          <span style="line-height:1.5;display:block;margin-top:3px;">${escapeHtmlText(yearText)}</span>
        </div>
        <div style="margin-top:10px;text-align:right;">
          <a href="analysis.html" style="font-size:11px;color:var(--gold2);text-decoration:underline;">전체 해석 보기 →</a>
        </div>
      `
    }

    // ── 숫자 카드 업데이트 ──
    hero.querySelectorAll('.card-num-item').forEach(item => {
      const label = (item.querySelector('.card-num-label')?.textContent || '').trim()
      const valEl = item.querySelector('.card-num-val')
      if (!label || !valEl) return
      if (label.includes('인생여정수')) {
        valEl.innerHTML = `${lpDisplay} <span class="card-num-pre">(합산전수: ${lpPreLabel})</span>`
      } else if (label.includes('문')) {
        valEl.innerHTML = `${mn} <span class="card-num-pre">(${mnPre !== mn ? `자릿수합 ${mnPre} → 타로 ${mn}` : `자릿수합 ${mnPre}`})</span>`
      } else if (label.includes('개인 연도')) {
        valEl.innerHTML = `${py} <span class="card-num-pre">(연 ${curY_digitSum}+문 ${mnPre}=${pyS}${pyS !== py ? ` → 타로 ${py}` : ''})</span>`
      } else if (label.includes('별자리')) {
        valEl.innerHTML = `<span class="zodiac-symbol">${z.i}</span><span class="zodiac-name-small">${z.n}</span>`
      }
    })

  } catch (err) {
    console.error('populateHeroWithUser error', err)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  populateHeroWithUser()
  initCounselorPromo()
})

const COUNSELOR_PROMO_KEY = 'palja_counselor_promo_dismiss_v1'
const COUNSELOR_PROMO_SESSION = 'palja_counselor_promo_session_v1'

function initCounselorPromo() {
  const overlay = document.getElementById('counselorPromo')
  if (!overlay) return

  const closeBtn = document.getElementById('counselorPromoClose')
  const dismissBtn = document.getElementById('counselorPromoDismiss')

  function close(permanent) {
    overlay.classList.remove('is-open')
    overlay.setAttribute('hidden', '')
    document.body.style.overflow = ''
    try {
      if (permanent) localStorage.setItem(COUNSELOR_PROMO_KEY, '1')
      else sessionStorage.setItem(COUNSELOR_PROMO_SESSION, '1')
    } catch (_) { /* ignore */ }
  }

  function open() {
    overlay.removeAttribute('hidden')
    requestAnimationFrame(() => overlay.classList.add('is-open'))
    document.body.style.overflow = 'hidden'
  }

  closeBtn?.addEventListener('click', () => close(false))
  dismissBtn?.addEventListener('click', () => close(true))
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close(false)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) close(false)
  })

  try {
    if (localStorage.getItem(COUNSELOR_PROMO_KEY) === '1') return
    if (sessionStorage.getItem(COUNSELOR_PROMO_SESSION) === '1') return
  } catch (_) { /* ignore */ }

  // Professional 이용 중이면 안내 팝업 생략
  ;(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, plan_active_until')
          .eq('id', session.user.id)
          .maybeSingle()
        if (isProfessionalAccess(profile)) return
      }
    } catch (_) { /* ignore — 비로그인 등 */ }

    setTimeout(open, 1400)
  })()
}