/**
 * ?¼ì´?„ì½”???¨í’ˆ(/lifecode/analyze.html) ?„ìš© ???”ì analysis.html ê³?ì½˜í…ì¸?êµ¬ì„± ë¶„ë¦¬
 */
export const LIFECODE_PRODUCT = {
  enabled: true,
  brand: '?¼ì´?„ì½”??,

  hero: {
    tag: 'Life Code Â· ê°œì¸???˜ë¹„??ë¦¬í¬??,
    titleHtml: '?«ìë¡??½ëŠ”<br><em>?˜ì˜ ë¦¬ë“¬ê³??¨í„´</em>',
    desc: '?ë…„?”ì¼ê³??´ë¦„?¼ë¡œ ?µì‹¬ ?˜Â·ì¸??ì£¼ê¸°Â·ì§€ê¸ˆì˜ ?ë¦„?????”ë©´???•ë¦¬?©ë‹ˆ?? ?”ì?°êµ¬???„ì²´ ë©”ë‰´ ?†ì´, ?¼ì´?„ì½”???¨í’ˆë§??´ì•˜?µë‹ˆ??',
  },

  waitNote: '?‘ì† ì½”ë“œë¡??´ë¦° <strong>?¼ì´?„ì½”???¨í’ˆ</strong> ë¦¬í¬?¸ì…?ˆë‹¤. ë¶„ì„?˜ê¸°ë¥??„ë¥´ë©??„ë˜??ê²°ê³¼ê°€ ?¼ì³ì§‘ë‹ˆ??',

  /** DOM id ???¨í’ˆ?ì„œ ?œì™¸ (pyramidRhythmSection?€ Private ?œì—ë§??œì‹œ) */
  hiddenSections: ['aiSummarySection', 'aiTodaySection', 'pyramidRhythmSection'],

  readingGuideKicker: '?¼ì´?„ì½”???¨í’ˆ???¬í•¨??ëª¨ë“ˆ?…ë‹ˆ??',
  readingGuideFootnote:
    '?œëª© ??<strong>B</strong>Â·<strong>P</strong>Â·<strong>S</strong> ??B=ë² ì´ì§? P=PlusÂ·Professional(ê²°ì œ), S=Private(Professionalê³?ë³„ë„).',

  pdfFilenamePrefix: '?¼ì´?„ì½”??,

  /** ?¨í’ˆ Basic(30?? ëª©ì°¨ ??ë¬´ë£Œ ?ˆì´??+ ë¦¬ë“¬ ë¬¶ìŒ */
  basicGuideHrefs: [
    '#nav-at-a-glance',
    '#nav-core',
    '#zodiacInsightSection',
    '#period48Section',
    '#nav-flow',
    '#monthlySection',
    '#weeklyForecastSection',
    '#timelineSection',
  ],

  /** ?¨í’ˆ ëª©ì°¨???¸ì¶œ???µì»¤ (hidden ?œì™¸) */
  guideModules: [
    {
      href: '#nav-at-a-glance',
      title: 'ë¨¼ì? ë³´ëŠ” ??,
      tier: 'free',
      desc: 'ë³„ìë¦?·í•µ???˜Â·ì´ë¦??˜Â·ì˜¬?´Â·ì´ë²????”ì•½ ê·¸ë¦¬??',
    },
    { href: '#nav-core', title: '?µì‹¬ ??, tier: 'free', desc: '?ë…„?”ì¼Â·?´ë¦„?ì„œ ë½‘ì? ?€???˜ë¹„???«ì?€ ?´ì„.' },
    { href: '#zodiacInsightSection', title: 'ë³„ìë¦?, tier: 'free', desc: '?ì¼ ê¸°ì? ë³„ìë¦??”ì•½. ?ì„¸ ?´ì„?€ Basic ?´ìƒ.' },
    { href: '#period48Section', title: '48ì£¼ê¸° ?±ê²©', tier: 'basic', desc: '?ì¼ êµ¬ê°„ë³??±ê²©Â·??•  ?¨í„´(48 ?¸ê·¸ë¨¼íŠ¸).' },
    { href: '#nav-major-cycle', title: '?€ì£¼ê¸°', tier: 'basic', desc: '?¸ìƒ????êµ¬ê°„?¼ë¡œ ?˜ëˆˆ ?¥ê¸° ?ë¦„.' },
    { href: '#nav-life-four', title: '?¸ìƒ 4?¨ê³„', tier: 'basic', desc: '?ˆì •?˜Â·ë„?„ìˆ˜ ??êµ¬ê°„.' },
    {
      href: '#pyramidRhythmSection',
      title: '?¸ìƒë¦¬ë“¬',
      tier: 'private',
      desc: '?¸ìƒ?¬ì •??ê¸°ì? ??êµ¬ê°„Â·?œë™/?•ë¹„ ë¦¬ë“¬ê³?36???œí™˜??',
    },
    { href: '#timelineSection', title: '10???€?„ë¼??Â· ?˜ë¹„??, tier: 'basic', desc: '?˜ë¹„??ê°œì¸?°ë„ 10?? 100???¸ìƒ?„ë°˜?œëŠ” PlusÂ·Professional.' },
    { href: '#tlBlockTarot', title: '10???€?„ë¼??Â· ?€ë¡?, tier: 'private', desc: '?€ë¡??¬í•´????10??ì°¨íŠ¸?€ 100???¸ìƒ?„ë°˜??' },
    { href: '#monthlySection', title: '?”ê°„ ?ë¦„', tier: 'basic', desc: '? íƒ ?°ë„???”ë³„ ë¦¬ë“¬.' },
    { href: '#nav-flow', title: 'ì§€ê¸ˆì˜ ?ë¦„', tier: 'basic', desc: '?˜ë¹„??ê°œì¸?°ë„Â·?€ë¡??¬í•´???? ?´ë²ˆ ??·ì˜¤??' },
    {
      href: '#weeklyForecastSection',
      title: '?¥í›„ 7??,
      tier: 'basic',
      desc: '?¤ëŠ˜ë¶€??7?¼ê°„ ?¼ê°„ ?˜Â·ì—?ˆì? ê°€?´ë“œ ??',
    },
    { href: '#growthSection', title: '?±ì¥ ì§€??, tier: 'plus', desc: 'ë¹„ì–´ ?ˆëŠ” ?«ìÂ·ë³´ì™„ ?¬ì¸??' },
    {
      href: '#loshuSection',
      title: 'ë¡œìŠˆ ê²©ì',
      tier: 'plus',
      desc: '?ì¼ ?«ìë¥?ë§ˆë°©ì§„ì— ?¬ë ¤ ?”ì‚´Â·ê²°ì†Â·ë°˜ë³µ ?¨í„´???½ìŠµ?ˆë‹¤.',
    },
    {
      href: '#seqArrowSection',
      title: '?€ ? ë¡œ??Â· ?œì°¨ ê²©ì',
      tier: 'plus',
      desc: '?œì–‘??3Â·6Â·9 / 2Â·5Â·8 / 1Â·4Â·7 ?œì°¨ ê²©ì??8ê°€ì§€ ?€Â·ë¹??”ì‚´ ?´ì„.',
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
      '<span class="site-legal-business">' +
      '8ì½”ë“œ(8CODE) Â· ?€??ê¹€?œí›ˆ Â· ?¬ì—…?ë“±ë¡ë²ˆ??624-55-00806 Â· ?µì‹ ?ë§¤??? ê³ ë²ˆí˜¸ ??2026-ë¶€?°ìˆ˜??0361 ??br>' +
      'ë¶€?°ê´‘??‹œ ?˜ì˜êµ??˜ì˜ë¡?632-1, 602??Â· ? ì„ ë²ˆí˜¸ <a href="tel:0519250441">051-925-0441</a> Â· ?´ë???<a href="tel:01086748481">010-8674-8481</a>' +
      '</span>' +
      '<span class="lifecode-product-footer-label">?¼ì´?„ì½”???¨í’ˆ</span>' +
      '<span aria-hidden="true"> Â· </span>' +
      '<a href="../terms.html">?´ìš©?½ê?</a>' +
      '<span aria-hidden="true"> Â· </span>' +
      '<a href="../privacy.html">ê°œì¸?•ë³´ì²˜ë¦¬ë°©ì¹¨</a>' +
      '<span aria-hidden="true"> Â· </span>' +
      '<a href="mailto:ohayou989@gmail.com">ë¬¸ì˜</a>';
  }
}

export function buildLifecodeProductReadingGuideInner() {
  const plan = (typeof window !== 'undefined' && window.USER_PLAN) || 'basic';
  const normalizedPlan =
    typeof window !== 'undefined' && window.PaljaPlan?.normalizeDbPlan
      ? window.PaljaPlan.normalizeDbPlan(plan)
      : plan;
  const isFullTier = normalizedPlan === 'plus' || normalizedPlan === 'professional' || normalizedPlan === 'private';
  const allowed = new Set(LIFECODE_PRODUCT.basicGuideHrefs || []);
  const modules = (isFullTier ? LIFECODE_PRODUCT.guideModules : LIFECODE_PRODUCT.guideModules.filter((m) => allowed.has(m.href)))
    .filter((m) => {
      if (m.href !== '#pyramidRhythmSection') return true;
      return typeof window !== 'undefined' && window.PaljaPlan?.hasSpecialAccess?.(plan, false);
    });
  const badge = (tier) => {
    const g = typeof window !== 'undefined' ? window.PaljaPlan : null;
    if (g && g.tierBadgeHtml) return g.tierBadgeHtml(tier);
    if (tier === 'free') return '';
    const labels = { basic: 'B', plus: 'P', private: 'S' };
    const t = labels[tier] ? tier : 'plus';
    const css = t === 'plus' ? 'pro' : (t === 'private' ? 'special' : t);
    const title = t === 'private' ? 'S: Private' : (t === 'basic' ? 'B: Basic ?´ìƒ' : 'P: PlusÂ·Professional ?´ìƒ');
    return `<span class="lc-guide-tier-badge lc-guide-tier-badge--${css}" title="${title} ?Œëœ">${labels[tier] || labels[t] || 'P'}</span>`;
  };
  const legend =
    typeof window !== 'undefined' && window.PaljaPlan && window.PaljaPlan.tierLegendHtml
      ? window.PaljaPlan.tierLegendHtml()
      : '<p class="lc-guide-tier-legend"><span class="lc-guide-tier-badge lc-guide-tier-badge--basic" title="Basic ?Œëœ">B</span> 30???¨í’ˆ Â· <span class="lc-guide-tier-badge lc-guide-tier-badge--pro" title="Plus ?Œëœ">P</span> ?ë‹´???´ìš©ê¶?/p>';
  const rows = modules
    .map(
      (m) => `
    <div class="lc-guide-row">
      <div class="lc-guide-nav"><a href="${m.href}" class="lc-guide-link"><strong>${m.title}</strong></a>${badge(m.tier || 'basic')}</div>
      <p class="lc-guide-desc">${m.desc}</p>
    </div>`,
    )
    .join('');
  return `
    <p class="lc-guide-catalog-kicker">${LIFECODE_PRODUCT.readingGuideKicker}</p>
    ${legend}
    ${rows}
    <p class="lc-guide-catalog-footnote">${LIFECODE_PRODUCT.readingGuideFootnote}</p>`;
}
