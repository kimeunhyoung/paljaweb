/**
 * 48주기 공통 — 구간 조회·원소·모달리티·궁합 점수
 * 궁합·엔진: PERIOD_MASTER (period48-engine.js) 기준
 */
(function () {
  function resolvePeriod48LifeZone(p) {
    const id = p?.lifeZoneId;
    const zones = window.PERIOD_48_LIFE_ZONES;
    if (!id || !zones || !zones[id]) return null;
    return zones[id];
  }

  function mergePeriod48Profile(row) {
    if (!row) return null;
    const profiles = window.PERIOD_48_PROFILES || {};
    const prof = profiles[row.name];
    const merged = prof ? { ...row, ...prof, traits: [] } : { ...row };
    const zone = resolvePeriod48LifeZone(merged);
    if (zone) merged.lifeZone = zone;
    const master = window.PERIOD48_BY_ID?.[merged.no];
    if (master) {
      merged.engineElement = master.element;
      merged.engineModality = master.modality;
      merged.engineName = master.name;
    }
    return merged;
  }

  function getPeriod48ByNo(periodId) {
    const data = window.PERIOD_48_DATA;
    if (!data) return null;
    const row = data.find((p) => p.no === periodId);
    return mergePeriod48Profile(row);
  }

  /** 달력 구간 (라이프코드 분석 화면용, 기존 동작) */
  function getPeriod48(m, d) {
    const data = window.PERIOD_48_DATA;
    if (!data || !data.length) return null;
    for (const p of data) {
      const [sm, sd, em, ed] = p.r;
      const dateVal = m * 100 + d;
      const startVal = sm * 100 + sd;
      const endVal = em * 100 + ed;
      const inRange = startVal <= endVal
        ? (dateVal >= startVal && dateVal <= endVal)
        : (dateVal >= startVal || dateVal <= endVal);
      if (!inRange) continue;
      return mergePeriod48Profile(p);
    }
    return null;
  }

  /**
   * 생년월일 → 태양 황도 → Period (48궁합·정밀 조회)
   */
  function getPeriod48FromBirthdate(year, month, day) {
    if (typeof window.birthdateToPeriod !== 'function') {
      return getPeriod48(month, day);
    }
    const engine = window.birthdateToPeriod(year, month, day);
    const merged = getPeriod48ByNo(engine.period_id);
    if (!merged) return null;
    return {
      ...merged,
      sunLongitude: engine.sun_longitude,
      engineElement: engine.element,
      engineModality: engine.modality,
      engineName: engine.name,
    };
  }

  function traitsFromMaster(periodId) {
    const master = window.PERIOD48_BY_ID?.[periodId];
    const elKo = window.PERIOD48_ELEMENT_KO || {};
    const modKo = window.PERIOD48_MODALITY_KO || {};
    if (!master) return null;
    return {
      elements: [master.element],
      modality: master.modality,
      elementLabel: elKo[master.element] || master.element,
      modalityLabel: modKo[master.modality] || master.modality,
      elementRaw: master.element,
    };
  }

  function period48CompatTraits(p) {
    const id = p?.no;
    const fromMaster = traitsFromMaster(id);
    if (fromMaster) return fromMaster;
    if (p?.engineElement && p?.engineModality) {
      const elKo = window.PERIOD48_ELEMENT_KO || {};
      const modKo = window.PERIOD48_MODALITY_KO || {};
      return {
        elements: [p.engineElement],
        modality: p.engineModality,
        elementLabel: elKo[p.engineElement] || p.engineElement,
        modalityLabel: modKo[p.engineModality] || p.engineModality,
        elementRaw: p.engineElement,
      };
    }
    return traitsFromMaster(1) || {
      elements: ['Fire'],
      modality: 'Cardinal',
      elementLabel: '불',
      modalityLabel: '활동궁',
      elementRaw: '',
    };
  }

  function period48CompatScore(pA, pB) {
    if (!pA || !pB) return null;
    if (typeof window.getPeriod48Compatibility !== 'function') return null;

    const r = window.getPeriod48Compatibility(pA, pB);
    const typeId = r.relationship_type_id;
    const traitsA = period48CompatTraits(pA);
    const traitsB = period48CompatTraits(pB);

    const relDetail = window.PERIOD48_RELATIONSHIP_DETAILS?.[typeId] || null;

    let determinationNote = `판정: ${r.determined_by_ko || r.determined_by || ''}`;
    if (r.layer2_type_id != null && r.determined_by === 'Layer3:AspectOverride') {
      const t2 = window.PERIOD48_RELATIONSHIP_TYPES?.[r.layer2_type_id] || '';
      determinationNote += ` (매트릭스 ${String(r.layer2_type_id).padStart(2, '0')} ${t2} → 각도 보정)`;
    }
    if (r.aspectKo) determinationNote += ` · 주간 각도 ${r.aspectKo}`;

    return {
      relationship_type_id: typeId,
      relationship_title: r.relationship_title,
      relationship_detail: relDetail,
      relationship_catchphrase: relDetail?.catchphrase || '',
      relationship_identity: relDetail?.identity || '',
      relationship_virtue: relDetail?.virtue || '',
      relationship_shadow: relDetail?.shadow || '',
      relationship_action: relDetail?.action || '',
      typeIdDisplay: String(typeId).padStart(2, '0'),
      ringPercent: Math.round((typeId / 20) * 100),
      title: r.relationship_title,
      caption: relDetail?.catchphrase || determinationNote,
      determinationNote,
      sameWeek: !!r.sameWeek,
      aspect: r.aspect,
      aspectKo: r.aspectKo,
      determined_by: r.determined_by,
      determined_by_ko: r.determined_by_ko,
      layer2_type_id: r.layer2_type_id,
      traitsA,
      traitsB,
    };
  }

  function parseIsoDate(iso) {
    if (!iso) return null;
    const parts = String(iso).split('-');
    if (parts.length < 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!year || !month || !day) return null;
    return { year, month, day };
  }

  /** @deprecated use parseIsoDate */
  function dobToMonthDay(iso) {
    const p = parseIsoDate(iso);
    return p ? { m: p.month, d: p.day } : null;
  }

  window.getPeriod48 = getPeriod48;
  window.getPeriod48ByNo = getPeriod48ByNo;
  window.getPeriod48FromBirthdate = getPeriod48FromBirthdate;
  window.resolvePeriod48LifeZone = resolvePeriod48LifeZone;
  window.period48CompatTraits = period48CompatTraits;
  window.period48CompatScore = period48CompatScore;
  window.period48DobToMonthDay = dobToMonthDay;
  window.period48ParseIsoDate = parseIsoDate;
  window.PERIOD48_COMPAT_MAX = 20;
})();
