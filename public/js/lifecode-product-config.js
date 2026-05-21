/**
 * 라이프코드 단품(/lifecode/analyze.html) 전용 — 팔자 analysis.html 과 콘텐츠 구성 분리
 */
export const LIFECODE_PRODUCT = {
  enabled: true,
  brand: '라이프코드',

  hero: {
    tag: 'Life Code · 개인용 수비학 리포트',
    titleHtml: '숫자로 읽는<br><em>나의 리듬과 패턴</em>',
    desc: '생년월일과 이름으로 핵심 수·인생 주기·지금의 흐름을 한 화면에 정리합니다. 팔자연구소 전체 메뉴 없이, 라이프코드 단품만 담았습니다.',
  },

  waitNote: '접속 코드로 열린 <strong>라이프코드 단품</strong> 리포트입니다. 분석하기를 누르면 아래에 결과가 펼쳐집니다.',

  /** DOM id — 단품에서 제외 */
  hiddenSections: ['aiSummarySection', 'aiTodaySection'],

  readingGuideKicker: '라이프코드 단품에 포함된 모듈입니다.',
  readingGuideFootnote:
    '단품에는 AI 요약·오늘 메시지는 포함하지 않습니다. 우측 목차에서 이동할 수 있습니다.',

  pdfFilenamePrefix: '라이프코드',

  /** 단품 목차에 노출할 앵커 (hidden 제외) */
  guideModules: [
    { href: '#nav-core', title: '핵심 수', desc: '생년월일·이름에서 뽑은 대표 수비학 숫자와 해석.' },
    { href: '#zodiacInsightSection', title: '별자리', desc: '생일 기준 별자리 레이어(수비 숫자와 함께 읽기).' },
    { href: '#period48Section', title: '48주기 성격', desc: '생일 구간별 성격·역할 패턴(48 세그먼트).' },
    { href: '#nav-major-cycle', title: '대주기', desc: '인생을 세 구간으로 나눈 장기 흐름.' },
    { href: '#nav-life-four', title: '인생 4단계', desc: '절정수·도전수 네 구간.' },
    { href: '#timelineSection', title: '10년 타임라인', desc: '앞으로 10년 개인년도 흐름.' },
    { href: '#monthlySection', title: '월간 흐름', desc: '선택 연도의 월별 리듬.' },
    { href: '#nav-flow', title: '지금의 흐름', desc: '올해·이번 달·오늘의 수.' },
    {
      href: '#weeklyForecastSection',
      title: '향후 7일',
      desc: '오늘부터 7일간 일간 수·에너지 가이드 표.',
    },
    { href: '#growthSection', title: '성장 지도', desc: '비어 있는 숫자·보완 포인트.' },
    {
      href: '#loshuSection',
      title: '로슈 격자',
      desc: '생일 숫자를 마방진에 올려 화살·결손·반복 패턴을 읽습니다.',
    },
  ],
};

export function lcSectionEnabled(sectionId) {
  if (!LIFECODE_PRODUCT.enabled) return true;
  return !LIFECODE_PRODUCT.hiddenSections.includes(sectionId);
}

export function applyLifecodeProductShell() {
  if (!LIFECODE_PRODUCT.enabled) return;

  document.documentElement.classList.add('lifecode-product');

  const h = LIFECODE_PRODUCT.hero;
  const tag = document.querySelector('.hero-tag');
  const title = document.querySelector('.hero-title');
  const desc = document.querySelector('.hero-desc');
  if (tag) tag.textContent = h.tag;
  if (title) title.innerHTML = h.titleHtml;
  if (desc) desc.textContent = h.desc;

  const wait = document.querySelector('#analysisWait p');
  if (wait) wait.innerHTML = LIFECODE_PRODUCT.waitNote;

  for (const id of LIFECODE_PRODUCT.hiddenSections) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('lc-product-off');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  for (const [id, label] of Object.entries(LIFECODE_PRODUCT.sectionLabels || {})) {
    const sec = document.getElementById(id);
    const lab = sec?.querySelector('.section-label');
    if (lab) lab.textContent = label;
  }

  document.querySelectorAll('#analysisJumpPanel a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const id = href.replace('#', '');
    if (!lcSectionEnabled(id)) a.classList.add('lc-product-off');
  });

  const footer = document.querySelector('.site-legal-footer');
  if (footer) {
    footer.innerHTML =
      '<span style="color:var(--muted);font-size:12px;">라이프코드 단품</span>' +
      '<span aria-hidden="true"> · </span>' +
      '<a href="../privacy.html">개인정보처리방침</a>' +
      '<span aria-hidden="true"> · </span>' +
      '<a href="mailto:ohayou989@gmail.com">문의</a>';
  }
}

export function buildLifecodeProductReadingGuideInner() {
  const rows = LIFECODE_PRODUCT.guideModules
    .map(
      (m) => `
    <div class="lc-guide-row">
      <div class="lc-guide-nav"><a href="${m.href}" class="lc-guide-link"><strong>${m.title}</strong></a></div>
      <p class="lc-guide-desc">${m.desc}</p>
    </div>`,
    )
    .join('');
  return `
    <p class="lc-guide-catalog-kicker">${LIFECODE_PRODUCT.readingGuideKicker}</p>
    ${rows}
    <p class="lc-guide-catalog-footnote">${LIFECODE_PRODUCT.readingGuideFootnote}</p>`;
}
