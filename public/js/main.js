// ===== 팔자연구소 메인 JS =====

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://sghsryumnrnftyjoqmwf.supabase.co',
  'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1'
)

// 네비게이션 스크롤 효과 (rAF로 쓰로틀 — 스크롤 이벤트마다 바로 실행하지 않고
// 프레임당 한 번만 갱신해서 블러 트랜지션이 스크롤과 겹쳐 렌더링이 밀리는 걸 방지)
let navScrollTicking = false
let navScrolledState = null
function updateNavScrolled() {
  navScrollTicking = false
  const on = window.scrollY > 50
  if (on === navScrolledState) return
  navScrolledState = on
  const chrome = document.getElementById('siteChrome')
  const navbar = document.getElementById('navbar')
  if (chrome) chrome.classList.toggle('scrolled', on)
  if (navbar) navbar.classList.toggle('scrolled', on)
}
window.addEventListener('scroll', () => {
  if (navScrollTicking) return
  navScrollTicking = true
  requestAnimationFrame(updateNavScrolled)
}, { passive: true })

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
  const chrome = document.getElementById('siteChrome')
  if (!btn || !panel) return

  const closePanel = () => {
    panel.classList.remove('open')
    panel.hidden = true
    btn.setAttribute('aria-expanded', 'false')
    document.body.classList.remove('nav-menu-open')
    chrome?.classList.remove('is-nav-open')
  }
  const openPanel = () => {
    panel.hidden = false
    panel.classList.add('open')
    btn.setAttribute('aria-expanded', 'true')
    document.body.classList.add('nav-menu-open')
    chrome?.classList.add('is-nav-open')
    // 로그인 버튼이 바로 보이도록 패널 맨 위로
    panel.scrollTop = 0
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
    let navName = ''
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, plan_active_until, full_name')
        .eq('id', sess.user.id)
        .single()
      if (profile && profile.full_name) navName = String(profile.full_name).trim()
      if (isProfessionalAccess(profile)) {
        counselorNav =
          '<a href="counselor.html" class="btn-nav-ghost">상담사 허브</a>'
      }
    } catch (e) { /* ignore */ }

    // 상단에는 이메일 대신 이름(없으면 이메일 앞부분)만 보여 줌
    const who = navName
      || String(sess.user.user_metadata?.full_name || '').trim()
      || String(sess.user.email || '').split('@')[0]
    const loggedInHtml = `
      ${who ? `<span class="nav-user-name">${escapeHtmlText(who)}님</span>` : ''}
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
      <a href="signup.html" class="btn-nav-fill">회원가입</a>
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
  if (lpAlt == null || lpAlt === '' || Number(lpAlt) === Number(lp)) return String(lp)
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


// ── 별자리 아이콘 (기기마다 컬러 이모지로 바뀌지 않도록 그림으로 그림 · 글리프 출처: DejaVu Sans, 자유 라이선스) ──
const ZODIAC_GLYPH = {
  '♈': ['M854 0Q854 600 711.0 986.5Q568 1373 399 1373Q270 1373 253.0 1274.5Q236 1176 236 1142Q236 1014 320 886H186Q93 1018 93 1179Q93 1311 174.5 1404.5Q256 1498 402 1498Q774 1498 905 725Q913 676 918 636Q922 676 930 725Q1062 1498 1433 1498Q1580 1498 1661.0 1404.5Q1742 1311 1742 1179Q1742 1018 1649 886H1515Q1600 1014 1600 1143Q1600 1177 1583.0 1275.0Q1566 1373 1436 1373Q1268 1373 1125.0 986.5Q982 600 982 0Z', '27 -1639 1781 1781'],
  '♉': ['M917 860Q770 860 667.0 756.5Q564 653 564.0 506.0Q564 359 667.0 256.0Q770 153 917.0 153.0Q1064 153 1167.5 256.0Q1271 359 1271.0 506.0Q1271 653 1168.5 756.5Q1066 860 917 860ZM917 1010Q1048 1015 1124 1076Q1210 1142 1258.5 1232.0Q1307 1322 1387.5 1409.0Q1468 1496 1653 1496V1388Q1530 1388 1446.5 1232.0Q1363 1076 1232 968Q1211 949 1188 934Q1234 904 1277 863Q1423 714 1423 504Q1423 295 1275.5 147.5Q1128 0 917 0Q709 0 561.0 147.5Q413 295 413 504Q413 714 561 863Q602 905 650 935Q626 949 605 968Q476 1076 390.5 1232.0Q305 1388 183 1388V1496Q368 1496 461.0 1409.0Q554 1322 590.0 1232.0Q626 1142 711 1076Q788 1015 917 1010Z', '110 -1556 1616 1616'],
  '♊': ['M530 1276Q362 1298 192 1350V1498Q539 1408 919.0 1408.0Q1299 1408 1642 1498V1347Q1466 1300 1300 1276V222Q1466 199 1642 152V0Q1299 91 919.0 91.0Q539 91 192 0V148Q362 201 530 222ZM682 234Q798 247 915 247Q915 247 1148 234V1265Q1032 1252 915 1252Q915 1252 682 1265Z', '108 -1558 1618 1618'],
  '♋': ['M1251 241Q1345 241 1411.5 307.5Q1478 374 1478.0 469.0Q1478 564 1412.0 630.0Q1346 696 1251.0 696.0Q1156 696 1090.0 630.0Q1024 564 1024.0 469.0Q1024 374 1090.0 307.5Q1156 241 1251 241ZM1060 64Q748 66 566.0 86.0Q384 106 231 149V273Q484 189 666.0 178.0Q848 167 907 167Q1037 167 1029 193Q898 301 898 468Q898 615 1000.5 718.5Q1103 822 1250 822Q1399 822 1502.0 718.5Q1605 615 1605.0 468.0Q1605 321 1501 218Q1428 141 1305.0 103.0Q1182 65 1060 64ZM585 759Q679 759 745.5 825.0Q812 891 812.0 986.0Q812 1081 745.5 1147.0Q679 1213 585.0 1213.0Q491 1213 424.0 1147.0Q357 1081 357.0 986.0Q357 891 423.5 825.0Q490 759 585 759ZM775 1391Q1088 1389 1270.0 1368.5Q1452 1348 1605 1305V1182Q1352 1266 1171.0 1276.5Q990 1287 932 1287Q799 1287 807 1261Q938 1153 938 987Q938 839 835.5 735.5Q733 632 586 632Q437 632 334.0 735.5Q231 839 231 987Q231 1133 335 1236Q408 1313 530.5 1351.5Q653 1390 775 1391Z', '176 -1469 1484 1484'],
  '♌': ['M660 396Q735 425 760.0 481.5Q785 538 785 577Q785 612 771 647Q742 722 685.5 747.0Q629 772 590 772Q554 772 519 758Q444 728 419.5 672.5Q395 617 395 578Q395 543 409 507Q439 431 494.5 406.5Q550 382 589 382Q624 382 660 396ZM672 1134Q672 1295 783.5 1395.5Q895 1496 1075 1496Q1247 1496 1356.0 1385.5Q1465 1275 1465 1099Q1465 912 1320.0 661.0Q1175 410 1175 230Q1179 106 1313 103Q1384 103 1484 191L1549 119Q1422 0 1311 0Q1212 0 1140.0 60.5Q1068 121 1068 232Q1068 431 1211.5 671.5Q1355 912 1355 1106Q1355 1240 1273.0 1322.5Q1191 1405 1059 1405Q932 1405 857.0 1327.5Q782 1250 782 1121Q782 1061 805.0 988.5Q828 916 853 854Q890 756 894.5 692.0Q899 628 899 611Q899 524 867 456Q816 341 700 296Q644 274 588 274Q528 274 441.5 311.5Q355 349 308 469Q286 523 286 579Q286 639 313 699Q364 813 481 859Q536 880 591 880Q667 880 741 839Q749 839 749 852Q749 878 710.5 970.0Q672 1062 672 1134Z', '110 -1556 1616 1616'],
  '♍': ['M680 1496Q743 1496 802.5 1397.0Q862 1298 862 1170Q902 1289 1001.0 1392.5Q1100 1496 1175 1496Q1237 1496 1278.0 1412.5Q1319 1329 1319 1110V908Q1367 1033 1432.5 1092.5Q1498 1152 1566 1152Q1626 1152 1676.0 1036.0Q1726 920 1726 647Q1726 239 1345 -82Q1346 -176 1492 -369H1324Q1278 -328 1204 -167Q1037 -268 862 -275V-159Q1053 -131 1177 -44L1168 173V1028Q1168 1046 1168 1063Q1168 1344 1122 1345Q1064 1344 997.5 1235.5Q931 1127 868 927V0H717V922Q717 1243 701.5 1296.0Q686 1349 651 1349Q651 1349 650 1349Q650 1349 649 1349Q608 1349 518.5 1236.0Q429 1123 410 908V0H261V1089Q261 1279 109 1470H251Q369 1391 405 1215Q428 1308 519.5 1402.0Q611 1496 680 1496ZM1319 618V58Q1577 308 1601 646Q1601 839 1578.5 908.5Q1556 978 1528 978Q1528 978 1524 978Q1494 978 1422.5 875.0Q1351 772 1319 618Z', '-90 -1571 2014 2014'],
  '♎': ['M171 259H1665V107H171ZM728 506H171V658H525Q458 762 458 893Q458 1078 586.5 1207.5Q715 1337 900 1337Q1086 1337 1215.5 1207.5Q1345 1078 1345 893Q1345 762 1277 658H1665V506H1072V658H1071Q1089 671 1106 688Q1192 773 1192 894Q1192 1016 1107.0 1101.0Q1022 1186 900.0 1186.0Q778 1186 693.0 1101.0Q608 1016 608 894Q608 773 693 688Q709 671 728 658Z', '111 -1529 1614 1614'],
  '♏': ['M1280 271Q1280 160 1331.5 97.5Q1383 35 1472 34H1561V152H1565L1768 -21L1565 -196L1561 -192V-74H1472Q1269 -74 1201 46Q1157 120 1149 238L1128 1028Q1128 1046 1128 1063Q1128 1344 1082 1345Q1024 1344 957.5 1235.5Q891 1127 828 927V0H677V922Q677 1243 661.5 1296.0Q646 1349 611 1349Q611 1349 610 1349Q610 1349 609 1349Q568 1349 478.5 1236.0Q389 1123 370 908V0H221V1089Q221 1279 69 1470H211Q329 1391 365 1215Q388 1308 479.5 1402.0Q571 1496 640 1496Q703 1496 762.5 1397.0Q822 1298 822 1170Q862 1289 961.0 1392.5Q1060 1496 1135 1496Q1197 1496 1238.0 1412.5Q1279 1329 1279 1110V908L1280 272Z', '1 -1567 1835 1835'],
  '♐': ['M1514 728V1236L809 531L1126 214L1018 106L701 423L277 -1L276 0L170 106L169 107L593 531L276 848L277 849L383 955L384 956L701 639L1406 1344H898V1496H1666V728Z', '109 -1556 1617 1617'],
  '♑': ['M851 1496Q958 1496 998.5 1063.0Q1039 630 1064 634Q1173 855 1368 855Q1489 855 1565.5 760.0Q1642 665 1642 562Q1642 417 1570.5 331.5Q1499 246 1357 246Q1202 246 1080 379Q1036 219 973.0 111.5Q910 4 772 0H604V118L758 119Q880 123 985 499Q935 515 903.0 909.5Q871 1304 813 1304Q777 1304 700.0 1070.5Q623 837 623 642Q623 627 623 613L465 611Q465 864 394.5 1112.0Q324 1360 192 1366V1463Q339 1463 419.5 1352.0Q500 1241 540 966Q586 1167 631 1255Q672 1346 733.0 1421.0Q794 1496 851 1496ZM1137 510Q1230 365 1360 365Q1521 365 1530 562Q1523 719 1364 738Q1212 738 1137 510Z', '109 -1556 1616 1616'],
  '♒': ['M176 413Q501 684 616 684Q661 684 674 644Q698 573 754.0 573.0Q810 573 896.0 644.0Q982 715 1038 715Q1092 715 1116 644Q1142 573 1199.0 573.0Q1256 573 1342 644Q1385 680 1426 680Q1550 680 1659 364L1565 313Q1502 498 1407 498Q1356 498 1296 445Q1210 369 1154.0 369.0Q1098 369 1073 444Q1045 522 986 522Q931 522 848 455Q761 384 706 384Q650 384 625 456Q601 526 547 526Q492 526 363.0 419.5Q234 313 229 313L176 411ZM176 884Q500 1153 616 1153Q660 1153 674 1114Q698 1044 754 1044Q809 1044 895 1114Q982 1186 1037.0 1186.0Q1092 1186 1115 1114Q1142 1044 1198 1044Q1255 1044 1341 1114Q1384 1149 1425 1149Q1550 1149 1659 834L1565 784Q1502 969 1407 969Q1356 969 1296 915Q1209 838 1154 838Q1098 838 1072 914Q1045 992 986 992Q931 992 847 924Q761 853 705 853Q650 853 625 925Q601 997 546.0 997.0Q491 997 362.5 890.5Q234 784 229 784L176 881Z', '117 -1550 1602 1602'],
  '♓': ['M1038 665 797 662Q765 324 487 3L322 0Q629 351 656 662H360V834H656Q628 1144 321 1496L487 1493Q765 1173 797 834H1039Q1070 1173 1349 1493L1514 1496Q1207 1144 1180 834H1475L1474 662H1178Q1207 351 1514 0L1348 3Q1069 324 1038 662Z', '110 -1556 1616 1616'],
}

function zodiacIconSvg(sym) {
  const g = ZODIAC_GLYPH[sym]
  if (!g) return escapeHtmlText(sym || '')
  return `<svg viewBox="${g[1]}" aria-hidden="true" focusable="false"><path transform="scale(1,-1)" d="${g[0]}"/></svg>`
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
  1:  "<b>1번 · 자립적 선구자</b><br>스스로 길을 여는 타입이에요. 남이 가지 않은 방향을 먼저 선택하고, 아이디어를 행동으로 옮기는 추진력이 강점이에요.",
  2:  "<b>2번 · 조화로운 연결자</b><br>사람 사이의 미묘한 감정을 잘 읽고 다리 역할을 자연스럽게 해내요. 경청과 배려가 몸에 배어 있어요.",
  3:  "<b>3번 · 창의적 표현자</b><br>말과 글, 아이디어로 사람들을 끌어당기는 재능이 있어요. 자신을 표현할 때 가장 빛나는 사람이에요.",
  4:  "<b>4번 · 성실한 실행가</b><br>계획을 세우고 끝까지 해내는 사람이에요. 신뢰와 성실함이 가장 큰 무기예요.",
  5:  "<b>5번 · 자유로운 모험가</b><br>변화와 새로운 자극을 즐기고 다양한 경험 속에서 성장해요. 적응력이 탁월해요.",
  6:  "<b>6번 · 따뜻한 돌봄이</b><br>주변 사람을 살피고 챙기는 일이 자연스러운 사람이에요. 관계 안에서 따뜻한 안정감을 줘요.",
  7:  "<b>7번 · 깊이 있는 탐구자</b><br>겉보다 속을, 현상보다 본질을 보려 해요. 전문성과 통찰력으로 주변에 신뢰를 줘요.",
  8:  "<b>8번 · 현실적 성취가</b><br>목표를 설정하고 결과로 증명하는 사람이에요. 실행력과 판단력이 강해요.",
  9:  "<b>9번 · 포용력 있는 완성자</b><br>넓은 시야와 깊은 공감으로 사람들을 이해해요. 베풀수록 풍요로워지는 삶의 방식을 가져요.",
  11: "<b>11번 · 예민한 직관가 (마스터 넘버)</b><br>보통 사람이 느끼지 못하는 것을 먼저 감지하는 탁월한 직관이 있어요.",
  22: "<b>22번 · 위대한 설계자 (마스터 넘버)</b><br>큰 그림을 그리고 실제로 현실에 구현하는 능력을 타고났어요.",
  33: "<b>33번 · 헌신적 치유자 (마스터 넘버)</b><br>타인을 돕고 치유하는 일에서 깊은 보람을 느끼는 사람이에요.",
}

const HERO_INSIGHT = {
  1:  { main: "당신의 삶은 <b>독립과 개척</b>이라는 테마를 따라 흘러요. 스스로 결정하고 혼자 길을 만드는 경험이 반복되며, 이 과정을 통해 자신만의 진정한 주도성이 완성돼요." },
  2:  { main: "당신의 삶은 <b>연결과 조화</b>라는 테마를 따라 흘러요. 사람 사이에서 균형을 맞추고 협력하는 경험이 반복되며, 관계 속에서 자신의 진가가 드러나요." },
  3:  { main: "당신의 삶은 <b>표현과 창조</b>라는 테마를 따라 흘러요. 자신을 드러내고 아이디어를 세상에 내놓는 경험이 반복되며, 표현할수록 더 풍부해지는 삶을 살아가요." },
  4:  { main: "당신의 삶은 <b>안정과 축적</b>이라는 테마를 따라 흘러요. 기초를 다지고 꾸준히 쌓아가는 경험이 반복되며, 시간이 지날수록 더 단단해지는 방식으로 성장해요." },
  5:  { main: "당신의 삶은 <b>자유와 변화</b>라는 테마를 따라 흘러요. 새로운 경험을 향해 움직이고 변화 속에서 성장하는 일이 반복되며, 다양성 속에서 자신을 완성해 가요." },
  6:  { main: "당신의 삶은 <b>책임과 돌봄</b>이라는 테마를 따라 흘러요. 주변 사람을 살피고 관계 안에서 의미를 찾는 경험이 반복되며, 사랑을 주는 과정에서 자신도 함께 성장해요." },
  7:  { main: "당신의 삶은 <b>탐구와 내면 성장</b>이라는 테마를 따라 흘러요. 본질을 파고들고 혼자만의 깊이를 쌓는 경험이 반복되며, 지식과 통찰을 통해 자신과 세상을 이해해 가요." },
  8:  { main: "당신의 삶은 <b>성취와 실행</b>이라는 테마를 따라 흘러요. 목표를 세우고 실제 결과를 만들어내는 경험이 반복되며, 현실에서 증명하는 것이 삶의 핵심 동력이에요." },
  9:  { main: "당신의 삶은 <b>포용과 완성</b>이라는 테마를 따라 흘러요. 개인을 넘어 더 큰 가치를 위해 움직이는 경험이 반복되며, 베풀고 나눌수록 더 풍요로워지는 흐름을 가져요." },
  11: { main: "당신의 삶은 <b>영감과 깨달음</b>이라는 마스터 테마를 따라 흘러요. 직관을 통해 앞을 감지하고 사람들에게 빛을 비추는 경험이 반복되며, 내면의 목소리를 믿을 때 가장 큰 잠재력이 열려요." },
  22: { main: "당신의 삶은 <b>비전의 현실화</b>라는 마스터 테마를 따라 흘러요. 큰 그림을 그리고 실제로 구현하는 경험이 반복되며, 이상과 실행력이 함께 작동할 때 세상을 바꾸는 힘을 발휘해요." },
  33: { main: "당신의 삶은 <b>치유와 헌신</b>이라는 마스터 테마를 따라 흘러요. 타인을 이해하고 성장을 돕는 경험이 반복되며, 조건 없는 사랑이 삶의 중심 방향이자 에너지예요." },
}

const ZODIAC_CLOSING = {
  '양자리':    '뜨거운 열정과 즉각적인 행동력을 타고났어요. 먼저 뛰어드는 용기와 경쟁 속에서 에너지를 얻는 기질이에요.',
  '황소자리':  '깊은 인내와 감각적 풍요로움을 타고났어요. 안정을 중시하고 한번 결심하면 흔들리지 않는 끈기를 가진 기질이에요.',
  '쌍둥이자리':'날카로운 지성과 언어 감각을 타고났어요. 빠른 사고와 유연한 소통으로 어디서든 활력을 만들어내는 기질이에요.',
  '게자리':    '깊은 감수성과 따뜻한 보호 본능을 타고났어요. 감정의 흐름에 민감하고 소중한 사람을 지키는 것에서 에너지를 얻는 기질이에요.',
  '사자자리':  '타고난 카리스마와 강한 자존감을 가졌어요. 표현하고 이끄는 상황에서 자연스럽게 빛을 발하는 기질이에요.',
  '처녀자리':  '예리한 분석력과 꼼꼼한 성실함을 타고났어요. 완성도를 높이고 세부를 다듬는 일에서 만족과 에너지를 얻는 기질이에요.',
  '천칭자리':  '균형 감각과 아름다움을 향한 안목을 타고났어요. 조화로운 관계와 미적인 환경에서 에너지를 회복하는 기질이에요.',
  '전갈자리':  '강렬한 통찰력과 불굴의 집중력을 타고났어요. 표면 아래 본질을 파고드는 것에서 에너지를 얻고 변화를 통해 성장하는 기질이에요.',
  '사수자리':  '자유로운 탐구심과 낙천적인 확장 에너지를 타고났어요. 넓은 세계와 새로운 가능성을 향해 나아가는 것에서 활력을 얻는 기질이에요.',
  '염소자리':  '강인한 인내와 현실적 목표 지향성을 타고났어요. 성실하게 쌓아가며 시간이 지날수록 더 단단해지는 기질이에요.',
  '물병자리':  '독창적 사고와 인도주의적 시각을 타고났어요. 관습에 얽매이지 않고 미래 지향적 아이디어에서 영감을 얻는 기질이에요.',
  '물고기자리':'깊은 공감과 신비로운 직관력을 타고났어요. 눈에 보이지 않는 감정의 흐름을 감지하고, 경계를 초월한 연결에서 힘을 얻는 기질이에요.',
}

// 문 넘버 — 내면의 성향과 감정적 동력
const MOON_NATURE_MAP = {
  1:  "내면에는 강한 독립심과 자아의식이 자리해요. 스스로 결정하고 스스로 책임지고 싶은 욕구가 강하며, 자신의 가치관을 지키는 것을 매우 중요하게 여겨요.",
  2:  "내면에는 깊은 공감 능력과 조화에 대한 갈망이 흘러요. 관계에서 평화가 유지될 때 가장 안정되고, 갈등 상황에서 감정의 변화를 누구보다 예민하게 감지해요.",
  3:  "내면에는 표현하고 싶은 충동이 항상 살아 있어요. 감정과 생각을 말·글·창작으로 드러낼 때 가장 가볍고 자유롭다고 느끼는 성향이에요.",
  4:  "내면에는 안정과 질서에 대한 강한 욕구가 있어요. 체계가 잡혀 있을 때 안심하고, 꾸준함과 일관성이 자신을 지탱하는 중심이라고 느껴요.",
  5:  "내면에는 자유에 대한 끝없는 갈망이 있어요. 제한받거나 틀에 갇히는 느낌을 가장 답답하게 여기며, 새로운 자극과 변화 속에서 활력을 되찾아요.",
  6:  "내면에는 사람에 대한 사랑과 책임감이 깊이 뿌리내려 있어요. 주변이 잘 되는 것을 볼 때 가장 큰 보람을 느끼며, 관계와 돌봄 속에서 삶의 의미를 찾아요.",
  7:  "내면에는 끊임없이 본질을 파고드는 탐구심이 있어요. 표면적인 답으로는 만족하지 못하고, 혼자 깊이 생각하는 시간이 에너지를 회복시켜요.",
  8:  "내면에는 성취와 능력 발휘에 대한 강한 욕구가 있어요. 목표를 향해 집중하고 결과를 만들어낼 때 자신감이 차오르고, 방향 없이 정체되는 것을 가장 힘들어해요.",
  9:  "내면에는 더 큰 의미와 연결되고 싶은 마음이 흘러요. 개인의 이익보다 넓은 가치를 위해 움직일 때 가장 충만함을 느끼며, 이타적인 감정이 자연스럽게 솟아나요.",
  11: "내면이 매우 예민하게 주변을 감지해요. 다른 사람의 에너지와 감정을 자신도 모르게 흡수하는 경향이 있어, 혼자만의 시간이 없으면 쉽게 에너지가 소진돼요.",
  22: "내면에는 크고 구체적인 이상이 자리잡고 있어요. 단순한 일보다 의미 있고 규모 있는 일에 에너지를 쏟을 때 내면이 가장 살아있다고 느껴요.",
  33: "내면 깊은 곳에 타인을 치유하고자 하는 마음이 있어요. 누군가에게 도움이 되었을 때 가장 큰 보람을 느끼며, 이타심이 삶의 에너지 원천이 돼요.",
}

const PERSONAL_YEAR_MAP = {
  1:  "올해는 새로운 시작의 해예요. 적극적으로 씨앗을 뿌리고 주도적으로 움직이세요.",
  2:  "올해는 협력과 관계의 해예요. 기다림과 연대로 기회를 만드세요.",
  3:  "올해는 표현과 확장의 해예요. 창의력을 드러내며 사람들과 소통하세요.",
  4:  "올해는 내실을 다지는 해예요. 기초를 튼튼히 하고 꾸준히 쌓아가세요.",
  5:  "올해는 변화와 모험의 해예요. 유연하게 흐르고 새로운 기회를 받아들이세요.",
  6:  "올해는 돌봄과 책임의 해예요. 주변을 보살피며 관계에 집중하세요.",
  7:  "올해는 성찰과 학습의 해예요. 혼자만의 시간을 통해 내면을 단단히 하세요.",
  8:  "올해는 성취와 실천의 해예요. 실행력을 발휘해 결과를 만들어가세요.",
  9:  "올해는 마무리와 통합의 해예요. 정리하고 다음 주기를 준비하세요.",
  11: "영감과 직관이 예민하게 깨어나는 해예요. 내면의 목소리에 귀 기울이고 직관을 신뢰하세요.",
  22: "현실적 실행과 큰 설계가 가능한 해예요. 계획을 구조화하고 실현에 집중하세요.",
  33: "치유와 봉사의 에너지가 강해지는 해예요. 타인을 돕는 일이 곧 자신의 성장으로 이어져요.",
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
    '예요.', '에요.', '어요.', '아요.', '해요.', '돼요.', '워요.', '져요.', '려요.', '나요.', '가요.', '같아요.',
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

const HERO_SAMPLE_BIRTH = '1990-05-15'

async function populateHeroWithUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const heroExists = document.querySelector('.hero-right .hero-card-main')
    if (!heroExists) return

    let name = null, birth = null
    let profileForPlan = null
    // 비로그인: 빈 카드 대신 예시 생년월일로 계산해 보여 줌
    const isSample = !session
    if (isSample) {
      syncHeroCtas(null, null)
      name = '예시 분석'
      birth = HERO_SAMPLE_BIRTH
    }
    if (!isSample) try {
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

    if (!isSample) syncHeroCtas(session, profileForPlan)

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
        insightEl.innerHTML = `생년월일을 입력하면 나만의 라이프코드를 보여 드려요. <a href="dashboard.html" style="color:inherit;text-decoration:underline;">프로필 입력하기</a>`
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
    // 개인연도: 라이프코드·수비학 달력과 같은 계산 (연·월·일을 각각 한 자리로 줄인 뒤 합산, 합계만 11·22·33 유지)
    const pyY   = reduceToSingle(curY_digitSum, false)
    const pyM   = reduceToSingle(m, false)
    const pyD   = reduceToSingle(d, false)
    const pyS   = pyY + pyM + pyD
    const py    = reduceToSingle(pyS)
    const z     = getZodiacInfo(m, d)

    const hero = document.querySelector('.hero-right .hero-card-main')
    if (!hero) return

    const nameEl = hero.querySelector('.card-name')
    const dateEl = hero.querySelector('.card-date')
    if (nameEl) nameEl.textContent = name
    if (dateEl) dateEl.textContent = isSample ? `${y}년 ${m}월 ${d}일생 예시 · 로그인하면 내 숫자로 바뀌어요` : `${y}년 ${m}월 ${d}일`

    // ── insight 렌더링 (인생여정수 + 문넘버 + 별자리 + 올해) ──
    const insightEl = hero.querySelector('.card-insight')
    if (insightEl) {
      const moonInner = MOON_NATURE_MAP[mn] || (mn >= 0 && mn <= 21 ? `타로 메이저 ${mn}번 에너지가 무의식·감정 반응의 바탕이 돼요.` : '')
      const zodiacLine = ZODIAC_CLOSING[z.n] || ''
      const yearText = PERSONAL_YEAR_MAP[py] || ''
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
          <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:rgba(200,169,110,0.5);margin-bottom:3px;">타고난 기질 · <span class="zodiac-icon zodiac-icon--sm">${zodiacIconSvg(z.i)}</span> ${z.n}</div>
          <div style="font-size:11.5px;line-height:1.5;color:rgba(245,240,232,0.68);">${zodiacTeaser}</div>
        </div>` : ''}
        <div style="font-size:11px;color:rgba(245,240,232,0.5);padding-top:6px;border-top:1px solid rgba(200,169,110,0.15);">
          <strong style="font-size:10px;letter-spacing:0.08em;color:var(--accent);">올해 에너지 · 개인연도 ${py}</strong>
          <span style="line-height:1.5;display:block;margin-top:3px;">${escapeHtmlText(yearText)}</span>
        </div>
        <div style="margin-top:10px;text-align:right;">
          <a href="analysis.html" style="font-size:11px;color:var(--gold2);text-decoration:underline;">${isSample ? '내 숫자로 보기 →' : '전체 해석 보기 →'}</a>
        </div>
      `
    }

    // ── 숫자 카드 업데이트 ──
    hero.querySelectorAll('.card-num-item').forEach(item => {
      const label = (item.querySelector('.card-num-label')?.textContent || '').trim()
      const valEl = item.querySelector('.card-num-val')
      if (!label || !valEl) return
      if (label.includes('인생여정수')) {
        valEl.innerHTML = `${lpDisplay} <span class="card-num-pre">(환원 전 ${lpPreLabel})</span>`
      } else if (label.includes('문')) {
        valEl.innerHTML = `${mn} <span class="card-num-pre">(${mnPre !== mn ? `자릿수합 ${mnPre} → 타로 ${mn}` : `자릿수합 ${mnPre}`})</span>`
      } else if (label.includes('개인연도') || label.includes('개인 연도')) {
        valEl.innerHTML = `${py} <span class="card-num-pre">(연 ${pyY}+월 ${pyM}+일 ${pyD}=${pyS})</span>`
      } else if (label.includes('별자리')) {
        valEl.innerHTML = `<span class="zodiac-symbol zodiac-icon">${zodiacIconSvg(z.i)}</span><span class="zodiac-name-small">${z.n}</span>`
      }
    })

  } catch (err) {
    console.error('populateHeroWithUser error', err)
  }
}

function syncChromeHeight() {
  const chrome = document.getElementById('siteChrome')
  // 맨 위에서, 모바일 메뉴가 닫혀 있을 때만 잼 (열린 메뉴 높이가 섞이지 않게)
  if (!chrome || window.scrollY > 10 || chrome.classList.contains('is-nav-open')) return
  document.documentElement.style.setProperty('--chrome-h', `${Math.ceil(chrome.offsetHeight)}px`)
}
window.addEventListener('resize', syncChromeHeight)
window.addEventListener('load', syncChromeHeight)

document.addEventListener('DOMContentLoaded', () => {
  syncChromeHeight()
  populateHeroWithUser()
  initCounselorPromo()
})

const COUNSELOR_PROMO_KEY = 'palja_counselor_promo_dismiss_v1'
const COUNSELOR_PROMO_SESSION = 'palja_counselor_promo_session_v1'

function initCounselorPromo() {
  const overlay = document.getElementById('counselorPromo')
  if (!overlay) return

  try {
    if (window.PaljaSiteMode && window.PaljaSiteMode.testerQuiet) return
    if (document.documentElement.classList.contains('palja-tester-quiet')) return
  } catch (_) { /* ignore */ }

  // 출시 할인 기간에는 launch-promo 통합 팝업만 사용 (연속 팝업 방지)
  try {
    const launchEnd = new Date('2026-12-31T23:59:59+09:00')
    const launchDismissed =
      localStorage.getItem('palja_launch_promo_dismiss_v1') === '1' ||
      sessionStorage.getItem('palja_launch_promo_session_v1') === '1'
    if (Date.now() <= launchEnd.getTime() && !launchDismissed) return
  } catch (_) { /* ignore */ }

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