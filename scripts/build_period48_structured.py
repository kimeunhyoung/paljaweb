# -*- coding: utf-8 -*-
"""Convert PERIOD_48_DATA traits → energyBlend + strengthItems + weaknessItems."""
import re
import json
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "public" / "js" / "period48Data.js"
OUT = SRC

GROWTH_LABEL = re.compile(
    r"숙제|보완|방지|조절|완화|위임|마무리|결정|경계|케어|접지|연민|돌봄|소진|관리|명료|허용|동조|표명|검증|비판|거리|수용|회복|전달|실행|채널|책임|온기|학습|연결|번역|선택|보호|구조와|집중|우선순위|협업|자기 |겸손|유연|인간|정서|감정|회복|접지|표현의 선택|건설적|온화|신뢰|마무리|집중|결단|현실 검증|자기 "
)
GROWTH_BODY = re.compile(
    r"필요합니다|필요하다|필요가|훈련이|연습이|지칠|소진|미루기|줄이|없으면|쉬우니|주의|보완|균형.*필요|택할 때|배울 때|연습이|할 필요"
)

SIGN_TAG_DEFAULTS = {
    "물고기": ["감수성", "상상", "영성"],
    "양자리": ["열정", "시작", "자유"],
    "황소": ["안정", "감각", "인내"],
    "쌍둥이": ["소통", "호기심", "다양성"],
    "게": ["공감", "보호", "직관"],
    "사자": ["표현", "리더십", "카리스마"],
    "처녀": ["분석", "실용", "완벽"],
    "천칭": ["균형", "외교", "심미"],
    "전갈": ["통찰", "집중", "변혁"],
    "사수": ["철학", "모험", "확장"],
    "염소": ["야망", "현실", "책임"],
    "물병": ["혁신", "독립", "이상"],
}


def parse_trait(html: str) -> dict:
    m = re.match(r"<strong>([^<]+):</strong>\s*(.*)", html, re.S)
    if m:
        return {"title": m.group(1).strip(), "desc": m.group(2).strip()}
    return {"title": re.sub(r"<[^>]+>", "", html)[:40], "desc": html}


def is_growth(item: dict) -> bool:
    return bool(GROWTH_LABEL.search(item["title"]) or GROWTH_BODY.search(item["desc"]))


def sign_tags(sign: str, keywords: list, idx: int) -> list:
    if len(keywords) >= 4:
        chunk = keywords[idx * 2 : idx * 2 + 2]
        if len(chunk) >= 2:
            return chunk
    base = sign.replace("자리", "").strip()
    for key, tags in SIGN_TAG_DEFAULTS.items():
        if key in base or base in key:
            return tags
    return keywords[:3] if keywords else ["에너지", "성향", "표현"]


def normalize_sign(name: str) -> str:
    name = name.strip()
    if "자리" in name:
        return name
    return name + "자리"


def parse_zodiac_sides(zodiac: str) -> list:
    parts = re.split(r"\s*[↔←→]\s*", zodiac)
    return [normalize_sign(p) for p in parts if p.strip()]


def weakness_from_overview(overview: str) -> list:
    """overview에서 주의 문장 추출해 약점 1개 생성."""
    if not overview:
        return []
    parts = re.split(r"[.。]\s*", overview)
    for p in parts:
        if re.search(r"쉬우|주의|미루|소진|번아웃|지치|어려|함정|과하면|너무 ", p):
            title = "균형과 자기 돌봄"
            if "완벽" in p or "기준" in p:
                title = "과한 기준"
            elif "산만" in p or "집중" in p:
                title = "산만함·집중"
            elif "고립" in p or "외로" in p:
                title = "고립·외로움"
            elif "번아웃" in p or "지치" in p or "소진" in p:
                title = "소진·번아웃"
            elif "완벽" in p:
                title = "완벽주의"
            return [{"title": title, "desc": p.strip() + ("." if not p.endswith(".") else "")}]
    return []


def structure_entry(entry: dict) -> dict:
    traits = [parse_trait(t) for t in entry.get("traits") or []]
    strengths = [t for t in traits if not is_growth(t)]
    weaknesses = [t for t in traits if is_growth(t)]

    if not weaknesses and len(strengths) > 3:
        weaknesses = [strengths.pop()]

    if not weaknesses:
        weaknesses = weakness_from_overview(entry.get("overview", ""))

    if not weaknesses and traits:
        last = traits[-1]
        if last not in strengths:
            weaknesses = [last]
        elif len(strengths) > 2:
            weaknesses = [{"title": "성장 포인트", "desc": last["desc"]}]

    kws = entry.get("keywords") or []
    if entry.get("cusp"):
        signs = parse_zodiac_sides(entry.get("zodiac", ""))
        sides = []
        for i, sign in enumerate(signs[:2]):
            sides.append({"sign": sign, "tags": sign_tags(sign, kws, i)})
        energy = {"sides": sides, "summary": "두 에너지가 동시에 작용합니다."}
    else:
        sign = normalize_sign(entry.get("zodiac", entry.get("name", "")))
        energy = {
            "sides": [{"sign": sign, "tags": kws[:4] if kws else sign_tags(sign, kws, 0)}],
            "summary": f"「{entry.get('title', '')}」— {sign} 기운이 삶 전반에 스며듭니다.",
        }

    out = dict(entry)
    out["energyBlend"] = energy
    out["strengthItems"] = strengths[:4]
    out["weaknessItems"] = weaknesses[:3]
    out["traits"] = []
    return out


def extract_entries(js: str) -> list:
    """간단 파서: window.PERIOD_48_DATA = [ ... ];"""
    start = js.index("[")
    end = js.rindex("];") + 1
    raw = js[start:end]
    # traits 문자열 배열을 JSON 호환으로 — eval 대신 exec with safe-ish approach
    # Use regex to split top-level objects (fragile) — instead run node or manual
    # Fallback: import via stripping to python literals
    raw = raw.replace("cusp:true", "cusp:True").replace("cusp:false", "cusp:False")
    raw = re.sub(r"(\w+):", r'"\1":', raw)  # keys quoted — breaks en: with spaces
    raise NotImplementedError("use embedded load")


def main():
    import subprocess
    script_path = Path(__file__).parent / "_export_period48.mjs"
    subprocess.run(["node", str(script_path)], check=True, cwd=script_path.parent)
    data = json.loads((script_path.parent / "_period48.json").read_text(encoding="utf-8"))

    SAGITTARIUS_CAP = {
        "energyBlend": {
            "sides": [
                {"sign": "사수자리", "tags": ["자유", "철학", "모험"]},
                {"sign": "염소자리", "tags": ["야망", "현실", "인내"]},
            ],
            "summary": "두 에너지가 동시에 작용합니다.",
        },
        "strengthItems": [
            {"title": "직관력과 예지력", "desc": "이면의 흐름·패턴을 먼저 감지하고, 말로 다 설명되지 않는 징후도 놓치지 않는 편입니다. 영감이 오면 과감히 방향을 잡을 수 있습니다."},
            {"title": "이상적이면서도 현실적", "desc": "사수의 비전으로 큰 그림을 그리고, 염소의 현실 감각으로 일정·자원·책임을 붙입니다. 꿈만 크거나 현실만 쫓는 극단에 덜 갇힙니다."},
            {"title": "카리스마 있는 리더십", "desc": "열정과 신뢰가 함께 느껴져 사람을 끌어당깁니다. 의미 있는 목표를 제시하면 팀이 자연스럽게 따라오는 경우가 많습니다."},
            {"title": "철학적 사고 + 실행력", "desc": "왜 해야 하는지(철학)와 어떻게 할지(실행)를 한 몸처럼 연결합니다. 막연한 이상을 구체적인 계획과 성과로 바꾸는 힘이 있습니다."},
        ],
        "weaknessItems": [
            {"title": "자기 확신이 너무 강함", "desc": "내면 기준이 확고해 결단은 빠르지만, 틀렸을 때 되돌리기 어렵습니다. ‘내가 맞다’는 감각이 커지면 피드백을 방어적으로 받을 수 있습니다."},
            {"title": "타인 의견 무시하기 쉬움", "desc": "통찰이 앞서면 상대 말을 끝까지 듣지 않거나, 이미 결론이 난 것처럼 느껴질 수 있습니다. 한 사람의 반론만 들어도 균형이 잡힙니다."},
            {"title": "완벽주의 경향", "desc": "염소의 높은 기준과 사수의 이상이 겹치면 스스로와 타인에게 과한 완성도를 요구합니다. ‘충분히 좋음’의 기준이 없으면 번아웃으로 이어지기 쉽습니다."},
        ],
    }

    structured = []
    for e in data:
        s = structure_entry(e)
        if s.get("name") == "사수-염소자리 경계":
            s.update(SAGITTARIUS_CAP)
        structured.append(s)

    lines = [
        "/**",
        " * 48주기 성격학 — energyBlend + strengthItems + weaknessItems (전 구간)",
        " */",
        "(function () {",
        "  window.PERIOD_48_DATA = " + json.dumps(structured, ensure_ascii=False, indent=2) + ";",
        "})();",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    (script_path.parent / "_period48.json").unlink(missing_ok=True)
    script_path.unlink(missing_ok=True)
    print(f"Wrote {len(structured)} entries to {OUT}")


if __name__ == "__main__":
    main()
