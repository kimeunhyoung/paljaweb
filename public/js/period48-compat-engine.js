/**
 * 48궁합 — Compatibility Engine (Layer 1~4)
 * matrix4d.json 과 동일한 4D 표 → 관계 유형 No.01~20
 */
(function () {
  const MATRIX_4D = {
    Fire: {
      Fire: {
        Cardinal: { Cardinal: 3, Fixed: 2, Mutable: 9 },
        Fixed: { Cardinal: 2, Fixed: 20, Mutable: 6 },
        Mutable: { Cardinal: 9, Fixed: 6, Mutable: 8 },
      },
      Earth: {
        Cardinal: { Cardinal: 4, Fixed: 2, Mutable: 14 },
        Fixed: { Cardinal: 2, Fixed: 18, Mutable: 13 },
        Mutable: { Cardinal: 14, Fixed: 13, Mutable: 16 },
      },
      Air: {
        Cardinal: { Cardinal: 5, Fixed: 3, Mutable: 17 },
        Fixed: { Cardinal: 3, Fixed: 12, Mutable: 9 },
        Mutable: { Cardinal: 17, Fixed: 9, Mutable: 8 },
      },
      Water: {
        Cardinal: { Cardinal: 6, Fixed: 7, Mutable: 19 },
        Fixed: { Cardinal: 7, Fixed: 11, Mutable: 6 },
        Mutable: { Cardinal: 19, Fixed: 6, Mutable: 10 },
      },
    },
    Earth: {
      Fire: {
        Cardinal: { Cardinal: 4, Fixed: 2, Mutable: 14 },
        Fixed: { Cardinal: 2, Fixed: 18, Mutable: 13 },
        Mutable: { Cardinal: 14, Fixed: 13, Mutable: 16 },
      },
      Earth: {
        Cardinal: { Cardinal: 4, Fixed: 18, Mutable: 14 },
        Fixed: { Cardinal: 18, Fixed: 20, Mutable: 13 },
        Mutable: { Cardinal: 14, Fixed: 13, Mutable: 8 },
      },
      Air: {
        Cardinal: { Cardinal: 13, Fixed: 2, Mutable: 18 },
        Fixed: { Cardinal: 2, Fixed: 14, Mutable: 16 },
        Mutable: { Cardinal: 18, Fixed: 16, Mutable: 5 },
      },
      Water: {
        Cardinal: { Cardinal: 1, Fixed: 7, Mutable: 12 },
        Fixed: { Cardinal: 7, Fixed: 14, Mutable: 19 },
        Mutable: { Cardinal: 12, Fixed: 19, Mutable: 8 },
      },
    },
    Air: {
      Fire: {
        Cardinal: { Cardinal: 5, Fixed: 3, Mutable: 17 },
        Fixed: { Cardinal: 3, Fixed: 12, Mutable: 9 },
        Mutable: { Cardinal: 17, Fixed: 9, Mutable: 8 },
      },
      Earth: {
        Cardinal: { Cardinal: 13, Fixed: 2, Mutable: 18 },
        Fixed: { Cardinal: 2, Fixed: 14, Mutable: 16 },
        Mutable: { Cardinal: 18, Fixed: 16, Mutable: 5 },
      },
      Air: {
        Cardinal: { Cardinal: 5, Fixed: 17, Mutable: 13 },
        Fixed: { Cardinal: 17, Fixed: 20, Mutable: 16 },
        Mutable: { Cardinal: 13, Fixed: 16, Mutable: 8 },
      },
      Water: {
        Cardinal: { Cardinal: 6, Fixed: 7, Mutable: 10 },
        Fixed: { Cardinal: 7, Fixed: 11, Mutable: 15 },
        Mutable: { Cardinal: 10, Fixed: 15, Mutable: 5 },
      },
    },
    Water: {
      Fire: {
        Cardinal: { Cardinal: 6, Fixed: 7, Mutable: 19 },
        Fixed: { Cardinal: 7, Fixed: 11, Mutable: 6 },
        Mutable: { Cardinal: 19, Fixed: 6, Mutable: 10 },
      },
      Earth: {
        Cardinal: { Cardinal: 1, Fixed: 7, Mutable: 12 },
        Fixed: { Cardinal: 7, Fixed: 14, Mutable: 19 },
        Mutable: { Cardinal: 12, Fixed: 19, Mutable: 8 },
      },
      Air: {
        Cardinal: { Cardinal: 6, Fixed: 7, Mutable: 10 },
        Fixed: { Cardinal: 7, Fixed: 11, Mutable: 15 },
        Mutable: { Cardinal: 10, Fixed: 15, Mutable: 5 },
      },
      Water: {
        Cardinal: { Cardinal: 1, Fixed: 7, Mutable: 6 },
        Fixed: { Cardinal: 7, Fixed: 11, Mutable: 19 },
        Mutable: { Cardinal: 6, Fixed: 19, Mutable: 10 },
      },
    },
  };

  const RELATIONSHIP_TYPES = {
    1: '평화와 영적 조화',
    2: '통제와 복종의 구도',
    3: '드라마틱한 스파크',
    4: '건설적 비즈니스 파트너십',
    5: '소통과 지적 자극',
    6: '동요와 감정의 격랑',
    7: '소유와 집착의 감옥',
    8: '담백한 자연주의 친구',
    9: '혁명과 판도 뒤집기',
    10: '영원한 소년소녀의 유토피아',
    11: '차가운 얼음왕국',
    12: '서번트 수호와 리더십',
    13: '피상적 평판의 가면',
    14: '지독한 인내와 지구력',
    15: '본질 파헤치기와 비평',
    16: '보편적 관용과 달관',
    17: '비선형적 천재성과 아웃사이더',
    18: '숨 막히는 강박과 마이크로 매니징',
    19: '카르마적 희생과 연민',
    20: '독고다이 평행선',
  };

  const ASPECT_OVERRIDE = {
    Opposition: 15,
    Square: 11,
    Trine: 1,
  };

  const LAYER3_DEFAULTS = new Set([8, 16]);

  const DETERMINED_BY_KO = {
    'Layer1:ManualOverride': '수동 예외 조합',
    'Layer2:Matrix4D': '원소·모달리티 매트릭스',
    'Layer3:AspectOverride': '주간 각도(대립·사각·삼분) 보정',
    'Layer4:Fallback': '기본값(오류 방어)',
  };

  /** @type {Record<string, number>} */
  const MANUAL_OVERRIDE = {};

  function layer1Manual(userPid, partnerPid) {
    const key = `${userPid},${partnerPid}`;
    return MANUAL_OVERRIDE[key] ?? null;
  }

  function layer2Matrix(userElem, partnerElem, userMod, partnerMod) {
    return MATRIX_4D[userElem][partnerElem][userMod][partnerMod];
  }

  function layer3Aspect(relTypeId, userPid, partnerPid) {
    if (!LAYER3_DEFAULTS.has(relTypeId)) return relTypeId;
    const aspect = window.calculatePeriod48Aspect?.(userPid, partnerPid);
    if (aspect && ASPECT_OVERRIDE[aspect] != null) {
      return ASPECT_OVERRIDE[aspect];
    }
    return relTypeId;
  }

  function layer4Fallback(userElem, partnerElem) {
    return userElem === partnerElem ? 8 : 16;
  }

  function resolveCompatibility(userPid, partnerPid, userElem, userMod, partnerElem, partnerMod) {
    let relId = null;
    let layerUsed = null;
    let layer2Id = null;

    try {
      relId = layer1Manual(userPid, partnerPid);
      if (relId != null) {
        layerUsed = 'Layer1:ManualOverride';
      } else {
        layer2Id = layer2Matrix(userElem, partnerElem, userMod, partnerMod);
        relId = layer2Id;
        layerUsed = 'Layer2:Matrix4D';
        const corrected = layer3Aspect(relId, userPid, partnerPid);
        if (corrected !== relId) {
          relId = corrected;
          layerUsed = 'Layer3:AspectOverride';
        }
      }
    } catch (e) {
      relId = layer4Fallback(userElem, partnerElem);
      layerUsed = 'Layer4:Fallback';
    }

    const aspect =
      typeof window.calculatePeriod48Aspect === 'function'
        ? window.calculatePeriod48Aspect(userPid, partnerPid)
        : null;
    const aspectKo = aspect && window.PERIOD48_ASPECT_KO
      ? window.PERIOD48_ASPECT_KO[aspect]
      : null;

    return {
      relationship_type_id: relId,
      relationship_title: RELATIONSHIP_TYPES[relId] || '알 수 없음',
      determined_by: layerUsed,
      determined_by_ko: DETERMINED_BY_KO[layerUsed] || layerUsed,
      layer2_type_id: layer2Id,
      aspect,
      aspectKo,
    };
  }

  function getCompatibilityFromBirthdates(userBirth, partnerBirth) {
    const uy = userBirth.year;
    const um = userBirth.month;
    const ud = userBirth.day;
    const py = partnerBirth.year;
    const pm = partnerBirth.month;
    const pd = partnerBirth.day;
    const user = window.birthdateToPeriod(uy, um, ud);
    const partner = window.birthdateToPeriod(py, pm, pd);
    return getCompatibilityFromPeriods(user, partner);
  }

  function getCompatibilityFromPeriods(userPeriod, partnerPeriod) {
    const userPid = userPeriod.period_id;
    const partnerPid = partnerPeriod.period_id;

    if (userPid === partnerPid) {
      return {
        user: userPeriod,
        partner: partnerPeriod,
        relationship_type_id: 10,
        relationship_title: '같은 48주간 · 영원한 소년소녀의 유토피아',
        determined_by: 'SamePeriod',
        determined_by_ko: '동일 주간',
        sameWeek: true,
        layer2_type_id: null,
        aspect: null,
        aspectKo: null,
      };
    }

    const resolved = resolveCompatibility(
      userPid,
      partnerPid,
      userPeriod.element,
      userPeriod.modality,
      partnerPeriod.element,
      partnerPeriod.modality
    );

    return {
      user: userPeriod,
      partner: partnerPeriod,
      sameWeek: false,
      ...resolved,
    };
  }

  function getCompatibilityFromProfiles(pA, pB) {
    const traitsA = window.period48CompatTraits(pA);
    const traitsB = window.period48CompatTraits(pB);
    const userPeriod = {
      period_id: pA.no,
      name: pA.engineName || pA.displayName || pA.name,
      element: pA.engineElement || traitsA.elements[0],
      modality: pA.engineModality || traitsA.modality,
      sun_longitude: pA.sunLongitude,
    };
    const partnerPeriod = {
      period_id: pB.no,
      name: pB.engineName || pB.displayName || pB.name,
      element: pB.engineElement || traitsB.elements[0],
      modality: pB.engineModality || traitsB.modality,
      sun_longitude: pB.sunLongitude,
    };
    return getCompatibilityFromPeriods(userPeriod, partnerPeriod);
  }

  window.MATRIX_4D = MATRIX_4D;
  window.PERIOD48_COMPAT_MATRIX = MATRIX_4D;
  window.PERIOD48_RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;
  window.getPeriod48Compatibility = getCompatibilityFromProfiles;
  window.getPeriod48CompatibilityFromBirthdates = getCompatibilityFromBirthdates;
})();
