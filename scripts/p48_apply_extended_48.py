# -*- coding: utf-8 -*-
"""Parse user bulk text (No.01–48) and merge extended profile fields into period48Data/Profiles."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_OUT = ROOT / "public" / "js" / "period48Data.js"
PROFILES_OUT = ROOT / "public" / "js" / "period48Profiles.js"
BULK_PATH = Path(__file__).parent / "p48_weeks_bulk_202605.txt"
TRANSCRIPT = Path(
    r"C:\Users\김은형\.cursor\projects\b-paljaweb\agent-transcripts"
    r"\0d0e0265-6748-4205-964d-2529eb19ab09\0d0e0265-6748-4205-964d-2529eb19ab09.jsonl"
)

WEEK_ORDER = [
    "물고기-양자리 경계", "양자리 I", "양자리 II", "양자리 III", "양자리-황소자리 경계",
    "황소자리 I", "황소자리 II", "황소자리 III", "황소-쌍둥이자리 경계",
    "쌍둥이자리 I", "쌍둥이자리 II", "쌍둥이자리 III", "쌍둥이-게자리 경계",
    "게자리 I", "게자리 II", "게자리 III", "게-사자자리 경계",
    "사자자리 I", "사자자리 II", "사자자리 III", "사자-처녀자리 경계",
    "처녀자리 I", "처녀자리 II", "처녀자리 III", "처녀-천칭자리 경계",
    "천칭자리 I", "천칭자리 II", "천칭자리 III", "천칭-전갈자리 경계",
    "전갈자리 I", "전갈자리 II", "전갈자리 III", "전갈-사수자리 경계",
    "사수자리 I", "사수자리 II", "사수자리 III", "사수-염소자리 경계",
    "염소자리 I", "염소자리 II", "염소자리 III", "염소-물병자리 경계",
    "물병자리 I", "물병자리 II", "물병자리 III", "물병-물고기자리 경계",
    "물고기자리 I", "물고기자리 II", "물고기자리 III",
]

LABELS = [
    "황도대 도수:",
    "인간 발달 단계:",
    "한 줄 핵심 요약:",
    "성향 태그 키워드:",
    "내면적 기질 및 행동 패턴:",
    "빛의 영역 (Strengths & Talents):",
    "그림자의 영역 (Weaknesses & Shadows):",
    "인생의 핵심 과제:",
]


def clean_bulk_text(text):
    for marker in ("\n\n1~48번까지", "1~48번까지이고", "최상단 구역패널"):
        i = text.find(marker)
        if i > 0:
            text = text[:i]
    return text.strip()


def load_bulk_text():
    if BULK_PATH.exists():
        return clean_bulk_text(BULK_PATH.read_text(encoding="utf-8"))
    if not TRANSCRIPT.exists():
        raise SystemExit(f"Missing bulk file: {BULK_PATH}")
    for line in TRANSCRIPT.read_text(encoding="utf-8").splitlines():
        if "No. 01 : 물고기-양 쿠스프" not in line or "인생의 핵심 과제" not in line:
            continue
        obj = json.loads(line)
        for part in obj.get("message", {}).get("content", []):
            if part.get("type") == "text" and "No. 48" in part.get("text", ""):
                text = part["text"]
                if text.startswith("<user_query>"):
                    text = text[len("<user_query>") :]
                if text.endswith("</user_query>"):
                    text = text[: -len("</user_query>")]
                text = clean_bulk_text(text.strip())
                BULK_PATH.write_text(text, encoding="utf-8")
                return text
    raise SystemExit("Bulk text not found in transcript")


def normalize_degree(s):
    s = re.sub(r"\$([^$]+)\$", r"\1", s)
    s = s.replace(r"^\circ", "°").replace(r"\sim", "~")
    s = re.sub(r"360\s*°\s*\(\s*00\s*°\s*\)", "0°", s, flags=re.I)
    s = re.sub(r"360\s*°\s*\(00°\)", "0°", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_sw_items(section):
    section = section.strip()
    if not section:
        return []
    items = []
    buf = section
    while buf:
        idx = buf.find(":")
        if idx < 0:
            break
        title = buf[:idx].strip()
        rest = buf[idx + 1 :].lstrip()
        nxt = re.search(r"\.(?=[\uac00-\ud7a3A-Za-z(（])", rest)
        if nxt and nxt.start() > 0:
            desc = rest[: nxt.start() + 1].strip()
            buf = rest[nxt.start() + 1 :].lstrip()
        else:
            desc = rest.strip()
            buf = ""
        if title and desc:
            items.append({"title": title, "desc": desc})
    return items


def parse_tags(raw):
    tags = [t.lstrip("#").strip() for t in re.findall(r"#\S+", raw)]
    if len(tags) >= 6:
        return tags[:3], tags[3:6]
    if len(tags) == 3:
        return tags, []
    mid = len(tags) // 2
    return tags[:mid], tags[mid:]


def parse_header(head):
    m = re.match(r"No\.\s*(\d+)\s*:\s*(.+)", head.strip())
    if not m:
        return None
    no = int(m.group(1))
    rest = m.group(2).strip()
    en_m = re.search(r"\(([^)]+)\)\s*$", rest)
    en = en_m.group(1).strip() if en_m else ""
    display = rest[: en_m.start()].strip() if en_m else rest
    return {"no": no, "displayName": display, "en": en}


def split_sections(body):
    parts = {}
    positions = []
    for lab in LABELS:
        i = body.find(lab)
        if i >= 0:
            positions.append((i, lab))
    positions.sort(key=lambda x: x[0])
    for j, (i, lab) in enumerate(positions):
        start = i + len(lab)
        end = positions[j + 1][0] if j + 1 < len(positions) else len(body)
        parts[lab] = body[start:end].strip()
    return parts


def parse_week_block(block):
    block = block.strip()
    if not block:
        return None
    head_end = block.find("황도대 도수:")
    if head_end < 0:
        return None
    header = block[:head_end]
    body = block[head_end:]
    meta = parse_header(header)
    if not meta:
        return None
    parts = split_sections(body)
    deg_raw = parts.get("황도대 도수:", "")
    date_m = re.search(r"\(표준 날짜:\s*([^)]+)\)", deg_raw)
    date_label = date_m.group(1).strip() if date_m else ""
    deg_line = normalize_degree(re.sub(r"\(표준 날짜:[^)]+\)", "", deg_raw).strip())
    core = parts.get("한 줄 핵심 요약:", "").strip().strip("""\u201c\u201d"'""")
    kw, sh = parse_tags(parts.get("성향 태그 키워드:", ""))
    strengths = parse_sw_items(parts.get("빛의 영역 (Strengths & Talents):", ""))
    weaknesses = parse_sw_items(parts.get("그림자의 영역 (Weaknesses & Shadows):", ""))
    return {
        **meta,
        "degreeRange": deg_line,
        "dateLabel": date_label,
        "developmentStage": parts.get("인간 발달 단계:", "").strip(),
        "coreSummary": core,
        "keywords": kw,
        "shadowKeywords": sh,
        "temperament": parts.get("내면적 기질 및 행동 패턴:", "").strip(),
        "strengthItems": strengths,
        "weaknessItems": weaknesses,
        "lifeMission": parts.get("인생의 핵심 과제:", "").strip(),
        "strengthSectionLabel": "빛의 영역 (Strengths & Talents)",
        "weaknessSectionLabel": "그림자의 영역 (Weaknesses & Shadows)",
    }


def parse_all_weeks(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    chunks = re.split(r"(?=No\.\s*\d+\s*:)", text)
    by_no = {}
    for chunk in chunks:
        w = parse_week_block(chunk)
        if w:
            by_no[w["no"]] = w
    return by_no


def load_data_array():
    raw = DATA_OUT.read_text(encoding="utf-8")
    m = re.search(r"window\.PERIOD_48_DATA\s*=\s*(\[[\s\S]*\])\s*;\s*\n\}\)", raw)
    if not m:
        m = re.search(r"window\.PERIOD_48_DATA\s*=\s*(\[[\s\S]*\])\s*;", raw)
    if not m:
        raise SystemExit("PERIOD_48_DATA array not found")
    return json.loads(m.group(1))


def merge_entry(entry, parsed, keep_cycle=True):
    name = entry.get("name")
    p = dict(parsed)
    for k in (
        "displayName",
        "en",
        "degreeRange",
        "dateLabel",
        "developmentStage",
        "coreSummary",
        "keywords",
        "shadowKeywords",
        "temperament",
        "strengthItems",
        "weaknessItems",
        "lifeMission",
        "strengthSectionLabel",
        "weaknessSectionLabel",
    ):
        if p.get(k):
            entry[k] = p[k]
    if p.get("en"):
        entry["title"] = p["en"]
    if p.get("no") is not None:
        entry["no"] = p["no"]
    entry["overview"] = ""
    entry["traits"] = []
    if keep_cycle and entry.get("cyclePosition"):
        pass
    return entry


def build_profiles(data_arr):
    profiles = {}
    for entry in data_arr:
        name = entry["name"]
        prof = {k: v for k, v in entry.items() if k != "r"}
        profiles[name] = prof
    return profiles


def write_data_js(data_arr):
    lines = [
        "/**",
        " * 48주기 성격학 — energyBlend + strengthItems + weaknessItems (전 구간)",
        " */",
        "(function () {",
        "  window.PERIOD_48_DATA = " + json.dumps(data_arr, ensure_ascii=False, indent=2) + ";",
        "})();",
        "",
    ]
    DATA_OUT.write_text("\n".join(lines), encoding="utf-8")


def write_profiles_js(profiles):
    lines = [
        "/** 48주기 성격학 — 전 구간 (extended profile fields) */",
        "(function () {",
        "  window.PERIOD_48_PROFILES = "
        + json.dumps(profiles, ensure_ascii=False, indent=2)
        + ";",
        "})();",
        "",
    ]
    PROFILES_OUT.write_text("\n".join(lines), encoding="utf-8")


def main():
    bulk = load_bulk_text()
    parsed_by_no = parse_all_weeks(bulk)
    if len(parsed_by_no) < 48:
        print(f"WARN: parsed {len(parsed_by_no)} weeks (expected 48)", file=sys.stderr)
        missing = [i for i in range(1, 49) if i not in parsed_by_no]
        if missing:
            print("Missing nos:", missing[:20], file=sys.stderr)
    data = load_data_array()
  # map name -> entry
    for i, entry in enumerate(data):
        no = entry.get("no") or (i + 1)
        if no in parsed_by_no:
            merge_entry(entry, parsed_by_no[no])
    profiles = build_profiles(data)
    write_data_js(data)
    write_profiles_js(profiles)
    print(f"Applied extended fields to {len(parsed_by_no)} weeks")
    print(f"Wrote {DATA_OUT.name}, {PROFILES_OUT.name}")


if __name__ == "__main__":
    main()
