/**
 * 48궁합 — UI
 */
(function () {
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function profileCardHtml(label, name, p, traits) {
    const no = p.no != null ? String(p.no).padStart(2, '0') : '—';
    const title = p.displayName || p.name || '—';
    const kw = (p.keywords || []).slice(0, 3).map((k) => `<span class="kw-chip">${escapeHtml(k)}</span>`).join('');
    const zodiac = p.zodiac || '';
    const dateLabel = p.dateLabel || '';
    return `
      <article class="p48-person-card">
        <div class="p48-person-label">${escapeHtml(label)}</div>
        <div class="p48-person-name">${escapeHtml(name || '이름 없음')}</div>
        <div class="p48-person-week">No.${no} · ${escapeHtml(title)}</div>
        <div class="p48-person-meta">${escapeHtml(zodiac)}${dateLabel ? ` · ${escapeHtml(dateLabel)}` : ''}</div>
        <div class="p48-trait-row">
          <span class="p48-trait-badge">원소 ${escapeHtml(traits.elementLabel)}</span>
          <span class="p48-trait-badge">${escapeHtml(traits.modalityLabel)}</span>
        </div>
        ${kw ? `<div class="p48-kw-row">${kw}</div>` : ''}
        ${p.coreSummary ? `<p class="p48-summary">${escapeHtml(p.coreSummary)}</p>` : ''}
      </article>`;
  }

  function renderResult(name1, name2, p1, p2, score) {
    const result = document.getElementById('p48Result');
    const arc = document.getElementById('p48ScoreArc');
    const num = document.getElementById('p48ScoreNum');
    const titleEl = document.getElementById('p48ScoreTitle');
    const cap = document.getElementById('p48ScoreCaption');
    const names = document.getElementById('p48ScoreNames');
    const grid = document.getElementById('p48PersonGrid');
    const detail = document.getElementById('p48Detail');

    const circumference = 2 * Math.PI * 76;
    // 관계 유형 번호는 점수가 아니므로 원은 장식으로 가득 채운다 (번호가 클수록 좋은 것처럼 보이지 않게)
    const fill = 100;
    const offset = circumference * (1 - fill / 100);
    if (arc) {
      arc.style.strokeDasharray = String(circumference);
      arc.style.strokeDashoffset = String(offset);
    }
    if (num) num.textContent = score.typeIdDisplay || '—';
    if (titleEl) titleEl.textContent = score.title || score.relationship_title || '';
    if (cap) cap.textContent = score.caption || '';
    if (names) {
      names.innerHTML = `${escapeHtml(name1 || '첫 번째')}<span class="amp">×</span>${escapeHtml(name2 || '두 번째')}`;
    }
    if (grid) {
      grid.innerHTML =
        profileCardHtml('첫 번째', name1, p1, score.traitsA) +
        profileCardHtml('두 번째', name2, p2, score.traitsB);
    }
    if (detail) {
      const lon1 = p1.sunLongitude != null ? ` · 태양 ${p1.sunLongitude}°` : '';
      const lon2 = p2.sunLongitude != null ? ` · 태양 ${p2.sunLongitude}°` : '';
      const layer2Line =
        score.layer2_type_id != null && score.determined_by === 'Layer3:AspectOverride'
          ? `<p class="p48-detail-line">두 주기의 각도(${escapeHtml(score.aspectKo || '')})를 반영해 No.${String(score.layer2_type_id).padStart(2, '0')} ${escapeHtml(window.PERIOD48_RELATIONSHIP_TYPES?.[score.layer2_type_id] || '')}에서 지금 유형으로 보정했어요.</p>`
          : '';
      // 각도는 유형을 보정했을 때만 layer2Line에서 설명한다 (판정에 쓰이지 않은 각도는 표시하지 않음)
      const aspectNote = '';
      const relFields = [
        { key: 'identity', label: '관계의 본질', text: score.relationship_identity },
        { key: 'virtue', label: '빛의 상호작용', text: score.relationship_virtue, mod: 'virtue' },
        { key: 'shadow', label: '그림자의 상호작용', text: score.relationship_shadow, mod: 'shadow' },
        { key: 'action', label: '실천 솔루션', text: score.relationship_action, mod: 'action' },
      ];
      const relRows = relFields
        .filter((f) => f.text)
        .map(
          (f) =>
            `<div class="p48-rel-field p48-rel-field--${f.mod || f.key}">
              <div class="p48-rel-field-label">${escapeHtml(f.label)}</div>
              <p class="p48-rel-field-text">${escapeHtml(f.text)}</p>
            </div>`
        )
        .join('');
      const descBlock =
        score.relationship_catchphrase || relRows
          ? `<div class="p48-rel-desc">
            <h3 class="p48-rel-desc-title">관계 유형 해설</h3>
            ${score.relationship_catchphrase ? `<p class="p48-rel-catchphrase">${escapeHtml(score.relationship_catchphrase)}</p>` : ''}
            ${relRows ? `<div class="p48-rel-fields">${relRows}</div>` : ''}
          </div>`
          : '';
      const determinationLine = score.sameWeek
        ? `<p class="p48-detail-meta">두 사람이 같은 48주기라서 같은 주기끼리의 유형으로 봤어요.</p>`
        : `<p class="p48-detail-meta">두 사람의 원소(불·흙·바람·물)와 성질(활동궁·고정궁·변통궁) 조합으로 관계 유형을 정했어요.</p>`;
      const techBlock = `
        <div class="p48-detail-foot">
          ${layer2Line}
          ${aspectNote}
          ${determinationLine}
          <p class="p48-detail-line">첫 번째: ${escapeHtml(score.traitsA.elementLabel)} · ${escapeHtml(score.traitsA.modalityLabel)}${escapeHtml(lon1)}</p>
          <p class="p48-detail-line">두 번째: ${escapeHtml(score.traitsB.elementLabel)} · ${escapeHtml(score.traitsB.modalityLabel)}${escapeHtml(lon2)}</p>
          <p class="p48-detail-hint">48주기는 태어난 날의 태양 위치(황도)로 정해요. 주기가 바뀌는 날 무렵에 태어났다면 태어난 시각에 따라 이웃 주기일 수도 있어요. 수비학 궁합은 <a href="compatibility.html">소울하모니</a>에서 따로 볼 수 있어요.</p>
        </div>`;
      detail.innerHTML = `
        <p class="p48-detail-headline">관계 유형 <strong>No.${escapeHtml(score.typeIdDisplay)}</strong> — ${escapeHtml(score.relationship_title || '')}</p>
        ${descBlock}
        ${techBlock}`;
    }
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function runP48Compat() {
    const err = document.getElementById('p48Err');
    if (window.PaljaPlan && !(await PaljaPlan.ensureBasicProductAccess('p48', err))) {
      return;
    }
    const dob1 = document.getElementById('p48Dob1')?.value;
    const dob2 = document.getElementById('p48Dob2')?.value;
    const name1 = (document.getElementById('p48Name1')?.value || '').trim();
    const name2 = (document.getElementById('p48Name2')?.value || '').trim();

    if (err) err.textContent = '';
    if (!dob1 || !dob2) {
      if (err) err.textContent = '두 분의 생년월일을 모두 입력해 주세요.';
      return;
    }
    const d1 = window.period48ParseIsoDate ? window.period48ParseIsoDate(dob1) : null;
    const d2 = window.period48ParseIsoDate ? window.period48ParseIsoDate(dob2) : null;
    if (!d1 || !d2) {
      if (err) err.textContent = '생년월일 형식을 확인해 주세요.';
      return;
    }
    const p1 = window.getPeriod48FromBirthdate(d1.year, d1.month, d1.day);
    const p2 = window.getPeriod48FromBirthdate(d2.year, d2.month, d2.day);
    if (!p1 || !p2) {
      if (err) err.textContent = '해당 날짜의 48주기 구간을 찾지 못했어요.';
      return;
    }
    const score = window.period48CompatScore(p1, p2);
    if (!score) {
      if (err) err.textContent = '궁합을 계산할 수 없어요. 페이지를 새로고침해 주세요.';
      return;
    }
    renderResult(name1, name2, p1, p2, score);
  }

  function resetP48Compat() {
    const result = document.getElementById('p48Result');
    if (result) result.hidden = true;
    const err = document.getElementById('p48Err');
    if (err) err.textContent = '';
    ['p48Name1', 'p48Name2'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['p48Dob1', 'p48Dob2'].forEach((id) => {
      if (window.PaljaBirthDatePicker?.clearInput) PaljaBirthDatePicker.clearInput(id);
      else {
        const el = document.getElementById(id);
        if (el) el.value = '';
      }
    });
    ['clientPickSelect1', 'clientPickSelect2'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['clientPickSearch1', 'clientPickSearch2'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    if (typeof populateCounselorClientSelect === 'function') {
      populateCounselorClientSelect(1, '');
      populateCounselorClientSelect(2, '');
    }
  }

  window.runP48Compat = runP48Compat;
  window.resetP48Compat = resetP48Compat;
})();
