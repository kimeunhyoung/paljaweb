/**
 * 키르케타로코드 — UI
 */
(function () {
  const DECK = window.KIRKE_TAROT_DECK || [];
  const SPREAD_COUNT = 3;
  const POSITIONS = ['과거 · 뿌리', '현재 · 섬', '미래 · 항로'];
  let shuffledDeck = [];
  let drawnCards = [];
  let flippedCount = 0;
  let selectedTopic = 'general';
  let customQuestion = '';

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  function syncQuestionField() {
    const topicEl = document.getElementById('kirkeTopic');
    const questionEl = document.getElementById('kirkeQuestion');
    if (!topicEl || !questionEl) return;
    const isCustom = topicEl.value === 'custom';
    questionEl.disabled = !isCustom;
    questionEl.setAttribute('aria-disabled', isCustom ? 'false' : 'true');
  }

  function syncTopicHint() {
    const topicEl = document.getElementById('kirkeTopic');
    const hintEl = document.getElementById('kirkeTopicHint');
    if (!topicEl || !hintEl) return;
    const meta = window.KIRKE_TAROT_TOPICS?.[topicEl.value];
    hintEl.textContent = meta?.hint || '';
  }

  function initKirkeTopicUi() {
    const topicEl = document.getElementById('kirkeTopic');
    if (!topicEl) return;
    topicEl.addEventListener('change', () => {
      syncTopicHint();
      syncQuestionField();
    });
    syncTopicHint();
    syncQuestionField();
  }

  function preloadKirkeImages(cards) {
    cards.forEach((card) => {
      const src = window.getKirkeCardImageSrc?.(card);
      if (!src) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    });
  }

  function startSpread() {
    const topic = document.getElementById('kirkeTopic')?.value || 'general';
    const custom = (document.getElementById('kirkeQuestion')?.value || '').trim();
    if (topic === 'custom' && !custom) {
      alert('질문을 입력해 주세요.');
      return;
    }

    selectedTopic = topic;
    customQuestion = topic === 'custom' ? custom : '';

    document.getElementById('kirkeStep1').hidden = true;
    document.getElementById('kirkeStep2').hidden = false;
    document.getElementById('kirkeDrawCount').textContent = String(SPREAD_COUNT);

    shuffledDeck = [...DECK].sort(() => Math.random() - 0.5);
    drawnCards = [];
    flippedCount = 0;

    const grid = document.getElementById('kirkeDeckGrid');
    if (!grid) return;
    grid.innerHTML = '';
    shuffledDeck.forEach((card, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'kirke-deck-card';
      el.dataset.index = String(i);
      el.setAttribute('aria-label', `카드 ${i + 1}`);
      el.onclick = () => drawCard(i, el);
      grid.appendChild(el);
    });

    requestAnimationFrame(() => {
      document.getElementById('kirkeStep2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function drawCard(index, el) {
    if (el.classList.contains('drawn') || drawnCards.length >= SPREAD_COUNT) return;
    const order = drawnCards.length + 1;
    el.classList.add('drawn');
    el.dataset.order = String(order);
    el.setAttribute('aria-label', `카드 ${index + 1} · ${order}번째 선택`);
    const card = shuffledDeck[index];
    drawnCards.push({ ...card });
    if (drawnCards.length >= SPREAD_COUNT) {
      preloadKirkeImages(drawnCards);
      setTimeout(showResults, 400);
    }
  }

  function showResults() {
    document.getElementById('kirkeStep2').hidden = true;
    document.getElementById('kirkeStep3').hidden = false;

    const row = document.getElementById('kirkeDrawnRow');
    const reading = document.getElementById('kirkeReading');
    if (!row || !reading) return;

    row.innerHTML = '';
    reading.innerHTML = '';

    drawnCards.forEach((card, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'kirke-card-wrap';
      const bg = window.KIRKE_CARD_COLORS?.[card.suit] || '#2a2438';
      const imgSrc = window.getKirkeCardImageSrc(card);
      wrap.innerHTML = `
        <div class="kirke-card-pos">${escapeHtml(POSITIONS[i])}</div>
        <div class="kirke-tarot-card" id="kirke-card-${i}" role="button" tabindex="0">
          <div class="kirke-tarot-inner">
            <div class="kirke-tarot-back"><span>키르케</span></div>
            <div class="kirke-tarot-front" style="--card-bg:${bg}">
              <div class="kirke-card-art">
                <img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(card.name)}"
                  width="400" height="600" decoding="async" fetchpriority="high" loading="eager"
                  onerror="this.style.display='none';var p=this.nextElementSibling;if(p)p.removeAttribute('hidden')" />
                <div class="kirke-card-placeholder" hidden>
                  <span class="kirke-ph-no">${String(card.id).padStart(2, '0')}</span>
                  <span class="kirke-ph-label">이미지 준비 중</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="kirke-card-meta-below">
          <div class="kirke-card-name">${escapeHtml(card.name)}</div>
          <div class="kirke-card-en">${escapeHtml(card.en)}</div>
        </div>`;
      const cardEl = wrap.querySelector('.kirke-tarot-card');
      cardEl.addEventListener('click', () => flipCard(i));
      cardEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          flipCard(i);
        }
      });
      row.appendChild(wrap);
    });

    requestAnimationFrame(() => {
      document.getElementById('kirkeStep3')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function flipCard(i) {
    const el = document.getElementById(`kirke-card-${i}`);
    if (!el || el.classList.contains('flipped')) return;
    el.classList.add('flipped');
    flippedCount++;
    if (flippedCount >= SPREAD_COUNT) {
      setTimeout(renderReading, 500);
    }
  }

  function formatReadingParagraphs(text) {
    if (!text) return '';
    return String(text)
      .split(/\n\n+/)
      .map((block) => {
        const lines = block.split('\n').filter(Boolean);
        if (!lines.length) return '';
        const isHeading = /^【.+】$/.test(lines[0]);
        if (isHeading) {
          const title = escapeHtml(lines[0]);
          const body = escapeHtml(lines.slice(1).join('\n')).replace(/\n/g, '<br/>');
          return `<p class="kirke-reading-section-title">${title}</p>${body ? `<p class="kirke-reading-body">${body}</p>` : ''}`;
        }
        return `<p class="kirke-reading-body">${escapeHtml(lines.join('\n')).replace(/\n/g, '<br/>')}</p>`;
      })
      .join('');
  }

  function renderReading() {
    const reading = document.getElementById('kirkeReading');
    if (!reading) return;

    const topicLabel = window.getKirkeTopicLabel?.(selectedTopic) || '전반적인 흐름';
    let html = '<div class="kirke-reading-title">리딩</div>';
    html += `<p class="kirke-reading-topic">주제 · ${escapeHtml(topicLabel)}</p>`;
    if (selectedTopic === 'custom' && customQuestion) {
      html += `<p class="kirke-reading-question">질문 · ${escapeHtml(customQuestion)}</p>`;
    }

    drawnCards.forEach((card, i) => {
      const mythLine = card.myth
        ? `<p class="kirke-reading-myth">신화: ${escapeHtml(card.myth)}</p>`
        : '';
      const readingText = window.getKirkeReadingText?.(card, selectedTopic) || card.upright || '';
      html += `
        <article class="kirke-reading-block">
          <h3>${escapeHtml(POSITIONS[i])} — ${escapeHtml(card.name)}</h3>
          <p class="kirke-reading-en">${escapeHtml(card.en || '')}</p>
          ${mythLine}
          <p class="kirke-reading-kw">키워드 · ${escapeHtml(card.keywords)}</p>
          <div class="kirke-reading-text">${formatReadingParagraphs(readingText)}</div>
        </article>`;
    });
    html +=
      '<p class="kirke-reading-note">키르케신화타로 · Circe Tarot · 8CODE. 공식 가이드북 정방향 해설입니다.</p>';
    reading.innerHTML = html;
  }

  function resetKirkeTarot() {
    drawnCards = [];
    shuffledDeck = [];
    flippedCount = 0;
    selectedTopic = 'general';
    customQuestion = '';
    document.getElementById('kirkeStep1').hidden = false;
    document.getElementById('kirkeStep2').hidden = true;
    document.getElementById('kirkeStep3').hidden = true;
    const reading = document.getElementById('kirkeReading');
    const row = document.getElementById('kirkeDrawnRow');
    if (reading) reading.innerHTML = '';
    if (row) row.innerHTML = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.startKirkeSpread = startSpread;
  window.resetKirkeTarot = resetKirkeTarot;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKirkeTopicUi);
  } else {
    initKirkeTopicUi();
  }
})();
