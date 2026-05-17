/**
 * 48주기 — 인생 발달 구역(별자리 구역 × 발달 단계)
 * 주차 데이터의 lifeZoneId로 참조
 */
(function () {
  window.PERIOD_48_LIFE_ZONES = {
    aries_youth: {
      id: "aries_youth",
      symbol: "♈",
      signName: "양자리",
      zoneTitle: "양자리 구역",
      stageLabel: "유년기",
      ageRange: "0세 ~ 7세",
      syncKeywords: "자아(Ego)의 최초 탄생, 본능적 생존, 세상의 중심",
      syncKeywordChips: ["자아(Ego)의 최초 탄생", "본능적 생존", "세상의 중심"]
    },
    taurus_childhood: {
      id: "taurus_childhood",
      symbol: "♉",
      signName: "황소자리",
      zoneTitle: "황소자리 구역",
      stageLabel: "아동기",
      ageRange: "7세 ~ 14세",
      syncKeywords: "물질적 소유 개념, 가치관 및 지식 축적, 현실 안착",
      syncKeywordChips: ["물질적 소유 개념", "가치관 및 지식 축적", "현실 안착"]
    },
    gemini_adolescence: {
      id: "gemini_adolescence",
      symbol: "♊",
      signName: "쌍둥이자리",
      zoneTitle: "쌍둥이자리 구역",
      stageLabel: "사춘기 및 청소년기",
      ageRange: "14세 ~ 21세",
      syncKeywords: "지적 호기심 폭발, 구속 거부와 자유, 사회적 소통",
      syncKeywordChips: ["지적 호기심 폭발", "구속 거부와 자유", "사회적 소통"]
    },
    cancer_youth: {
      id: "cancer_youth",
      symbol: "♋",
      signName: "게자리",
      zoneTitle: "게자리 구역",
      stageLabel: "청년기",
      ageRange: "21세 ~ 28세",
      syncKeywords: "정서적 안식처 구축, 내 사람을 지키는 방어벽, 보호 본능",
      syncKeywordChips: ["정서적 안식처 구축", "내 사람을 지키는 방어벽", "보호 본능"]
    },
    leo_adult: {
      id: "leo_adult",
      symbol: "♌",
      signName: "사자자리",
      zoneTitle: "사자자리 구역",
      stageLabel: "성인기",
      ageRange: "28세 ~ 35세",
      syncKeywords: "완전한 보스로서의 독립, 내 왕국(비즈니스) 건설, 수직적 리더십",
      syncKeywordChips: ["완전한 보스로서의 독립", "내 왕국(비즈니스) 건설", "수직적 리더십"]
    },
    virgo_late_adult: {
      id: "virgo_late_adult",
      symbol: "♍",
      signName: "처녀자리",
      zoneTitle: "처녀자리 구역",
      stageLabel: "성인기 후기",
      ageRange: "35세 ~ 42세",
      syncKeywords: "시스템 효율성 극대화, 정밀한 실무력, 팩트와 완벽주의",
      syncKeywordChips: ["시스템 효율성 극대화", "정밀한 실무력", "팩트와 완벽주의"]
    },
    libra_midlife_early: {
      id: "libra_midlife_early",
      symbol: "♎",
      signName: "천칭자리",
      zoneTitle: "천칭자리 구역",
      stageLabel: "중년기 초기",
      ageRange: "42세 ~ 49세",
      syncKeywords: "인생의 반환점, 사교적 네트워크 정점, 대인관계 속 본질적 균형",
      syncKeywordChips: ["인생의 반환점", "사교적 네트워크 정점", "대인관계 속 본질적 균형"]
    },
    scorpio_midlife: {
      id: "scorpio_midlife",
      symbol: "♏",
      signName: "전갈자리",
      zoneTitle: "전갈자리 구역",
      stageLabel: "중년기",
      ageRange: "49세 ~ 56세",
      syncKeywords: "위기와 격랑(갱년기), 영혼의 심연 대면, 죽음과 재생",
      syncKeywordChips: ["위기와 격랑(갱년기)", "영혼의 심연 대면", "죽음과 재생"]
    },
    sagittarius_late_midlife: {
      id: "sagittarius_late_midlife",
      symbol: "♐",
      signName: "사수자리",
      zoneTitle: "사수자리 구역",
      stageLabel: "중년기 후기",
      ageRange: "56세 ~ 63세",
      syncKeywords: "세속적 구속 거부, 완전한 철학적 독립, 거시적 안목의 거인",
      syncKeywordChips: ["세속적 구속 거부", "완전한 철학적 독립", "거시적 안목의 거인"]
    },
    capricorn_elder: {
      id: "capricorn_elder",
      symbol: "♑",
      signName: "염소자리",
      zoneTitle: "염소자리 구역",
      stageLabel: "노년기",
      ageRange: "63세 ~ 70세",
      syncKeywords: "구조적 통치력 확립, 엄격한 자기 절제와 의무, 바위를 뚫는 집념",
      syncKeywordChips: ["구조적 통치력 확립", "엄격한 자기 절제와 의무", "바위를 뚫는 집념"]
    },
    aquarius_late_elder: {
      id: "aquarius_late_elder",
      symbol: "♒",
      signName: "물병자리",
      zoneTitle: "물병자리 구역",
      stageLabel: "노년기 후기",
      ageRange: "70세 ~ 77세",
      syncKeywords: "우주적 지성으로의 진입, 사사로운 이권 초월, 인류애와 달관",
      syncKeywordChips: ["우주적 지성으로의 진입", "사사로운 이권 초월", "인류애와 달관"]
    },
    pisces_transcendence: {
      id: "pisces_transcendence",
      symbol: "♓",
      signName: "물고기자리",
      zoneTitle: "물고기자리 구역",
      stageLabel: "초월기",
      ageRange: "77세 ~ 84세 및 그 이후",
      syncKeywords: "육체의 물리적 한계 탈피, 연민과 조건 없는 희생, 우주의 흐름에 자아 용해",
      syncKeywordChips: ["육체의 물리적 한계 탈피", "연민과 조건 없는 희생", "우주의 흐름에 자아 용해"]
    }
  };
})();
