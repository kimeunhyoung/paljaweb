/**
 * 키르케타로코드 — UI (뼈대)
 */
(function () {
  const DECK = window.KIRKE_TAROT_DECK || [];
  const SPREAD_COUNT = 3;
  const POSITIONS = ['과거 · 뿌리', '현재 · 섬', '미래 · 항로'];
  const ENABLE_REVERSED = true;
  const REVERSED_RATE = 0.35;

  let shuffledDeck = [];
  let drawnCards = [];
  let flippedCount = 0;

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

  function startSpread() {
    const topic = document.getElementById('kirkeTopic')?.value || 'general';
    const custom = (document.getElementById('kirkeQuestion')?.value || '').trim();
    if (topic === 'custom' && !custom) {
      alert('질문을 입력해 주세요.');
      return;
    }

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
  }

  function drawCard(index, el) {
    if (el.classList.contains('drawn') || drawnCards.length >= SPREAD_COUNT) return;
    el.classList.add('drawn');
    const card = shuffledDeck[index];
    const faceRev = ENABLE_REVERSED && Math.random() < REVERSED_RATE;
    drawnCards.push({ ...card, faceRev });
    if (drawnCards.length >= SPREAD_COUNT) {
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
            <div class="kirke-tarot-front${card.faceRev ? ' reversed' : ''}" style="--card-bg:${bg}">
              ${card.faceRev ? '<span class="kirke-rev-badge">역방향</span>' : ''}
              <div class="kirke-card-art">
                <img src="${escapeAttr(imgSrc)}" alt="" loading="lazy"
                  onerror="this.style.display='none';var p=this.nextElementSibling;if(p)p.removeAttribute('hidden')" />
                <div class="kirke-card-placeholder" hidden>
                  <span class="kirke-ph-no">${String(card.id).padStart(2, '0')}</span>
                  <span class="kirke-ph-label">이미지 준비 중</span>
                </div>
              </div>
              <div class="kirke-card-meta">
                <div class="kirke-card-name">${escapeHtml(card.name)}</div>
                <div class="kirke-card-en">${escapeHtml(card.en)}</div>
              </div>
            </div>
          </div>
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

  function renderReading() {
    const reading = document.getElementById('kirkeReading');
    if (!reading) return;
    let html = '<div class="kirke-reading-title">리딩</div>';
    drawnCards.forEach((card, i) => {
      const text = card.faceRev ? card.reversed : card.upright;
      html += `
        <article class="kirke-reading-block">
          <h3>${escapeHtml(POSITIONS[i])} — ${escapeHtml(card.name)}${card.faceRev ? ' (역)' : ''}</h3>
          <p class="kirke-reading-kw">${escapeHtml(card.keywords)}</p>
          <p class="kirke-reading-body">${escapeHtml(text)}</p>
        </article>`;
    });
    html +=
      '<p class="kirke-reading-note">Circe Tarot · 팔자연구소. 카드별 신화 해설은 이미지 시리즈 완료 후 순차 반영됩니다.</p>';
    reading.innerHTML = html;
  }

  function resetKirkeTarot() {
    drawnCards = [];
    shuffledDeck = [];
    flippedCount = 0;
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
})();
