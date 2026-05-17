# -*- coding: utf-8 -*-
"""Apply official profile names + theme lines; merge life zones + cycle positions."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_OUT = ROOT / "public" / "js" / "period48Data.js"
PROFILES_OUT = ROOT / "public" / "js" / "period48Profiles.js"

# (displayName, en, dateLabel, weekProfileTheme) — full theme line with colon
PROFILE = {
    1: ("물고기-양 쿠스프", "Cusp of Rebirth", "03/19 ~ 03/24", "부활의 쿠스프: 삶과 죽음의 경계, 순수한 시작의 에너지"),
    2: ("양자리 I", "Week of the Pioneer", "03/25 ~ 04/02", "개척자의 주간: 두려움 없는 추진력, 직진성, 자아 중심"),
    3: ("양자리 II", "Week of the Star", "04/03 ~ 04/10", "스타의 주간: 주목받고자 하는 욕구, 리더십, 강한 자기주장"),
    4: ("양자리 III", "Week of the Iconoclast", "04/11 ~ 04/18", "우상파괴자의 주간: 전통에 도전하는 성향, 독립심, 개혁"),
    5: ("양-황소 쿠스프", "Cusp of Power", "04/19 ~ 04/24", "권력의 쿠스프: 양자리의 불과 황소자리의 흙이 만난 강력한 지배력"),
    6: ("황소자리 I", "Week of Manifestation", "04/25 ~ 05/02", "현실화의 주간: 물질적 토대 구축, 고집, 안정성 추구"),
    7: ("황소자리 II", "Week of the Teacher", "05/03 ~ 05/10", "교사의 주간: 지식 전달, 끈기, 보수적이고 체계적인 접근"),
    8: ("황소자리 III", "Week of the Natural", "05/11 ~ 05/18", "자연인의 주간: 본능적 감각, 예술성, 가식 없는 솔직함"),
    9: ("황소-쌍둥이 쿠스프", "Cusp of Energy", "05/19 ~ 05/24", "에너지의 쿠스프: 끊임없는 활동성, 물질과 정신의 결합"),
    10: ("쌍둥이자리 I", "Week of Freedom", "05/25 ~ 06/02", "자유의 주간: 구속을 싫어함, 다재다능, 가벼운 날개짓"),
    11: ("쌍둥이자리 II", "Week of New Age", "06/03 ~ 06/10", "새로운 시대의 주간: 미래지향적, 혁신적 생각, 트렌드 리더"),
    12: ("쌍둥이자리 III", "Week of the Seeker", "06/11 ~ 06/18", "탐구자의 주간: 지적 호기심, 끊임없는 질문, 방랑벽"),
    13: ("쌍둥이-게 쿠스프", "Cusp of Magic", "06/19 ~ 06/24", "마법의 쿠스프: 논리(쌍둥이)와 감정(게)의 융합, 높은 직관력"),
    14: ("게자리 I", "Week of the Empath", "06/25 ~ 07/02", "공감자의 주간: 극도의 민감성, 타인의 감정 흡수, 보호본능"),
    15: ("게자리 II", "Week of the Unconventional", "07/03 ~ 07/11", "독특함의 주간: 독창적인 내면세계, 은둔형 외톨이 성향, 기발함"),
    16: ("게자리 III", "Week of the Persuader", "07/12 ~ 07/18", "설득자의 주간: 부드러운 카리스마, 타인을 움직이는 감정적 능력"),
    17: ("게-사자 쿠스프", "Cusp of Oscillation", "07/19 ~ 07/25", "동요의 쿠스프: 내향성(게)과 외향성(사자) 사이의 격렬한 감정 기복"),
    18: ("사자자리 I", "Week of Authority", "07/26 ~ 08/02", "권위의 주간: 타고난 리더, 지시하고 통제하려는 성향"),
    19: ("사자자리 II", "Week of Balanced Strength", "08/03 ~ 08/10", "균형 잡힌 힘의 주간: 성숙한 리더십, 내면의 단단함과 보호력"),
    20: ("사자자리 III", "Week of Leadership", "08/11 ~ 08/18", "리더십의 주간: 대중을 이끄는 힘, 명예 중시, 가끔은 독선적"),
    21: ("사자-처녀 쿠스프", "Cusp of Exposure", "08/19 ~ 08/25", "노출의 쿠스프: 화려함(사자)과 정밀함(처녀)의 결합, 완벽주의"),
    22: ("처녀자리 I", "Week of Systematizers", "08/26 ~ 09/03", "조직가의 주간: 분석력, 체계화 능력, 극도의 정밀함과 실용성"),
    23: ("처녀자리 II", "Week of Enigma", "09/04 ~ 09/11", "수수께끼의 주간: 속을 알 수 없는 내면, 분석적이면서도 신비로움"),
    24: ("처녀자리 III", "Week of Literalists", "09/12 ~ 09/18", "원칙주의자의 주간: 글자 그대로 해석함, 사실 관계(Fact) 최우선"),
    25: ("처녀-천칭 쿠스프", "Cusp of Beauty", "09/19 ~ 09/24", "미의 쿠스프: 예술적 안목, 조화와 균형 추구, 이상주의"),
    26: ("천칭자리 I", "Week of Nature", "09/25 ~ 10/02", "자연의 주간: 직관적이고 본질적인 아름다움 추구, 공정함"),
    27: ("천칭자리 II", "Week of Society", "10/03 ~ 10/11", "사회의 주간: 대인관계 기술의 정점, 조직 내 중재자 역할"),
    28: ("천칭자리 III", "Week of Theater", "10/12 ~ 10/18", "무대의 주간: 극적인 삶, 표현력 풍부, 타인의 시선을 의식함"),
    29: ("천칭-전갈 쿠스프", "Cusp of Drama", "10/19 ~ 10/25", "드라마와 비평의 쿠스프: 날카로운 통찰, 매혹적이면서 비판적"),
    30: ("전갈자리 I", "Week of Intensity", "10/26 ~ 11/02", "강렬함의 주간: 타협 없는 진지함, 비밀주의, 엄청난 집중력"),
    31: ("전갈자리 II", "Week of Depth", "11/03 ~ 11/11", "심원함의 주간: 감정의 심연, 본질을 꿰뚫는 눈, 변형과 재생"),
    32: ("전갈자리 III", "Week of Charm", "11/12 ~ 11/18", "매력의 주간: 치명적인 카리스마, 대중을 매료시키는 지배력"),
    33: ("전갈-사수 쿠스프", "Cusp of Revolution", "11/19 ~ 11/24", "혁명의 쿠스프: 낡은 것의 파괴(전갈)와 새로운 이상(사수)의 결합"),
    34: ("사수자리 I", "Week of Independence", "11/25 ~ 12/02", "독립의 주간: 구속 거부, 모험가 정신, 솔직하고 직설적"),
    35: ("사수자리 II", "Week of the Unique", "12/03 ~ 12/10", "독창성의 주간: 독특한 철학, 비정형적 삶의 방식, 시대를 앞서감"),
    36: ("사수자리 III", "Week of the Titan", "12/11 ~ 12/18", "거인의 주간: 거시적 안목, 거대한 프로젝트 선호, 지적 야심"),
    37: ("사수-염소 쿠스프", "Cusp of Prophecy", "12/19 ~ 12/25", "예언의 쿠스프: 미래를 내다보는 비전(사수)과 현실적 실행력(염소)"),
    38: ("염소자리 I", "Week of Ruler", "12/26 ~ 01/02", "통치자의 주간: 엄격한 규율, 책임감, 조직과 구조 구축의 대가"),
    39: ("염소자리 II", "Week of Determination", "01/03 ~ 01/10", "결단력의 주간: 어떤 난관도 뚫고 나가는 강인한 의지, 워커홀릭"),
    40: ("염소자리 III", "Week of Dominance", "01/11 ~ 01/18", "지배의 주간: 최고 권위 추구, 철저한 현실 감각, 냉철함"),
    41: ("염소-물병 쿠스프", "Cusp of Mystery", "01/19 ~ 01/24", "미스터리의 쿠스프: 전통(염소)과 파괴(물병)의 공존, 독특한 천재성"),
    42: ("물병자리 I", "Week of Genius", "01/25 ~ 02/02", "천재성의 주간: 독창적 사고, 보편적 인류애, 비선형적 논리 구조"),
    43: ("물병자리 II", "Week of Youth", "02/03 ~ 02/10", "젊음의 주간: 늙지 않는 소년/소녀 감성, 이상주의, 반항심"),
    44: ("물병자리 III", "Week of Acceptance", "02/11 ~ 02/18", "수용의 주간: 우주적 관용, 차별 없는 시선, 개인보다 전체 중시"),
    45: ("물병-물고기 쿠스프", "Cusp of Sensitivity", "02/19 ~ 02/24", "민감성의 쿠스프: 영적 세계로의 진입, 극도의 영감과 영매 체질"),
    46: ("물고기자리 I", "Week of Spirit", "02/25 ~ 03/03", "정신의 주간: 영혼과 내면의 가치 추구, 비물질적 세계에 몰입"),
    47: ("물고기자리 II", "Week of Artists", "03/04 ~ 03/11", "예술가의 주간: 무한한 상상력, 감정의 시각화, 현실 도피 성향"),
    48: ("물고기자리 III", "Week of Dancers", "03/12 ~ 03/18", "무용수의 주간: 흐름에 몸을 맡기는 삶, 초월적 수용, 영원한 안식"),
}

ZONE_BY_NO = {}
for n in range(1, 5):
    ZONE_BY_NO[n] = "aries_youth"
for n in range(5, 9):
    ZONE_BY_NO[n] = "taurus_childhood"
for n in range(9, 13):
    ZONE_BY_NO[n] = "gemini_adolescence"
for n in range(13, 17):
    ZONE_BY_NO[n] = "cancer_youth"
for n in range(17, 21):
    ZONE_BY_NO[n] = "leo_adult"
for n in range(21, 25):
    ZONE_BY_NO[n] = "virgo_late_adult"
for n in range(25, 29):
    ZONE_BY_NO[n] = "libra_midlife_early"
for n in range(29, 33):
    ZONE_BY_NO[n] = "scorpio_midlife"
for n in range(33, 37):
    ZONE_BY_NO[n] = "sagittarius_late_midlife"
for n in range(37, 41):
    ZONE_BY_NO[n] = "capricorn_elder"
for n in range(41, 45):
    ZONE_BY_NO[n] = "aquarius_late_elder"
for n in range(45, 49):
    ZONE_BY_NO[n] = "pisces_transcendence"

# import cycle from sibling script
import importlib.util
spec = importlib.util.spec_from_file_location(
    "p48_lz", Path(__file__).parent / "p48_apply_lifezones_cycles.py"
)
lz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lz)
CYCLE_BY_NO = lz.CYCLE_BY_NO


def load_data():
    raw = DATA_OUT.read_text(encoding="utf-8")
    m = re.search(r"window\.PERIOD_48_DATA\s*=\s*(\[[\s\S]*\])\s*;\s*\n\}\)", raw)
    if not m:
        m = re.search(r"window\.PERIOD_48_DATA\s*=\s*(\[[\s\S]*\])\s*;", raw)
    return json.loads(m.group(1))


def write_all(data):
    lines = [
        "/**",
        " * 48주기 성격학 — energyBlend + strengthItems + weaknessItems (전 구간)",
        " */",
        "(function () {",
        "  window.PERIOD_48_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";",
        "})();",
        "",
    ]
    DATA_OUT.write_text("\n".join(lines), encoding="utf-8")
    profiles = {e["name"]: {k: v for k, v in e.items() if k != "r"} for e in data}
    PROFILES_OUT.write_text(
        "/** 48주기 성격학 — 전 구간 (extended profile fields) */\n"
        "(function () {\n  window.PERIOD_48_PROFILES = "
        + json.dumps(profiles, ensure_ascii=False, indent=2)
        + ";\n})();\n",
        encoding="utf-8",
    )


def main():
    data = load_data()
    for entry in data:
        no = entry.get("no")
        if not no or no not in PROFILE:
            continue
        disp, en, date_lbl, theme = PROFILE[no]
        entry["no"] = no
        entry["displayName"] = disp
        entry["en"] = en
        entry["title"] = en
        entry["dateLabel"] = date_lbl
        entry["weekProfileTheme"] = theme
        if ":" in theme:
            entry["weekTitleKo"] = theme.split(":", 1)[0].strip()
        if no in ZONE_BY_NO:
            entry["lifeZoneId"] = ZONE_BY_NO[no]
        if no in CYCLE_BY_NO:
            entry["cyclePosition"] = CYCLE_BY_NO[no]
    write_all(data)
    print("Applied profile names for", len(PROFILE), "weeks")


if __name__ == "__main__":
    main()
