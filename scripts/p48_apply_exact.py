# -*- coding: utf-8 -*-
"""Apply user-exact strength/weakness lines to profiles + period48Data.js."""
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROFILES_OUT = ROOT / "public" / "js" / "period48Profiles.js"
DATA_OUT = ROOT / "public" / "js" / "period48Data.js"
EXTRACTED = Path(__file__).parent / "p48_user_extracted.json"
BATCH2_SRC = Path(__file__).parent / "p48_user_source_batch2.txt"

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

BATCH1_END = "황소자리 III"
BATCH2_START = "황소-쌍둥이자리 경계"
BATCH2_END = "전갈-사수자리 경계"
BATCH3_START = "사수자리 I"


def parse_user_text(text):
    weeks = {}
    current = None
    section = None
    week_title = None
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        if line in ("강점", "약점"):
            section = "s" if line == "강점" else "w"
            continue
        if line.startswith("→"):
            if not current or not section:
                continue
            weeks.setdefault(current, {"s": [], "w": [], "title": week_title})[section].append(
                line[1:].strip()
            )
            continue
        if "·" in line and not line.startswith("→"):
            name_part = line.split("·", 1)[0].strip()
            week_title = line.split("·", 1)[1].strip() if "·" in line else None
            current = name_part
            weeks.setdefault(current, {"s": [], "w": [], "title": week_title})
            section = None
    return weeks


def derive_title(desc):
    """Short keyword label for UI (bold left column)."""
    s = desc.strip()
    if not s:
        return ""

    # 약점: …하기 쉬움 / …할 수 있음 / …경우도 있음
    if re.search(r"하기\s+쉬움$", s):
        m = re.search(r"(\S+)\s+(\S+)(?:을|를)\s*무시", s)
        if m:
            return f"{m.group(2)} 무시"
        m = re.search(r"(\S+)(?:을|를)\s*무시", s)
        if m:
            return f"{m.group(1)} 무시"
    if "몰아붙임" in s and "완벽" in s:
        return "자기 완벽주의"
    if "고립" in s:
        return "고립 위험"

    # 강점: 자주 쓰는 축약
    if "두 에너지" in s and "동시 작동" in s:
        return "이중 에너지"
    if "독립적 상태를 유지" in s:
        return "독립 유지"

    # …보는/하는/되는 + 핵심구
    for pat in (
        r"보는\s+(.+)$",
        r"하는\s+(.+)$",
        r"되는\s+(.+)$",
        r"있는\s+(.+)$",
        r"공존하는\s+(.+)$",
        r"(\S+과\s+\S+)$",
        r"(\S+\s+\S+)$",
    ):
        m = re.search(pat, s)
        if m:
            t = m.group(1).strip()
            if 2 <= len(t) <= 14 and t != s:
                return t

    parts = s.split()
    if len(parts) >= 2:
        tail = " ".join(parts[-2:])
        return tail[:14]
    return (parts[0][:12] + "…") if len(parts[0]) > 12 else parts[0]


def to_items(lines):
    return [{"title": derive_title(x), "desc": x} for x in lines]


def load_user_exact():
    extracted = json.loads(EXTRACTED.read_text(encoding="utf-8"))
    batch2 = parse_user_text(BATCH2_SRC.read_text(encoding="utf-8"))
    i1 = WEEK_ORDER.index(BATCH1_END)
    i2s = WEEK_ORDER.index(BATCH2_START)
    i2e = WEEK_ORDER.index(BATCH2_END)
    out = {}
    for i, name in enumerate(WEEK_ORDER):
        if i <= i1:
            src = extracted.get(name)
        elif i2s <= i <= i2e:
            src = batch2.get(name)
        else:
            src = extracted.get(name)
        if not src or not src.get("s"):
            raise SystemExit(f"Missing user copy for: {name}")
        out[name] = src
    return out


def load_profiles_base():
    spec = importlib.util.spec_from_file_location("p48_rewrite_all", ROOT / "scripts" / "p48_rewrite_all.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    from p48_patch_profiles import PATCHES
    from p48_user_batch1 import apply_user_batch1
    from p48_user_batch2 import apply_user_batch2
    from p48_user_batch3 import apply_user_batch3

    profiles = dict(mod.PROFILES)
    profiles.update(PATCHES)
    profiles.update(apply_user_batch1(mod))
    profiles.update(apply_user_batch2(mod))
    profiles.update(apply_user_batch3(mod))
    return profiles


def apply_exact(profiles, user_exact):
    for name, data in user_exact.items():
        if name not in profiles:
            raise SystemExit(f"Profile key missing: {name}")
        p = profiles[name]
        p["strengthItems"] = to_items(data["s"])
        p["weaknessItems"] = to_items(data["w"])
        wt = data.get("title")
        if wt and p.get("energyBlend"):
            if len(p["energyBlend"].get("sides", [])) > 1:
                p["energyBlend"]["summary"] = f"「{wt}」— 두 별자리 에너지가 동시에 작용합니다."
            else:
                p["energyBlend"]["summary"] = (
                    f"「{wt}」의 핵심 기운이 하루의 선택과 관계 방식에 스며듭니다."
                )
    return profiles


def write_profiles(profiles):
    lines = [
        "/** 48주기 성격학 — 전 구간 (energy / 강점 / 약점, 사용자 원문 desc) */",
        "(function () {",
        "  window.PERIOD_48_PROFILES = " + json.dumps(profiles, ensure_ascii=False, indent=2) + ";",
        "})();",
        "",
    ]
    PROFILES_OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {PROFILES_OUT} ({len(profiles)} weeks)")


def sync_data_js(profiles):
    text = DATA_OUT.read_text(encoding="utf-8")
    for name in WEEK_ORDER:
        prof = profiles[name]
        s_json = json.dumps(prof["strengthItems"], ensure_ascii=False, indent=4)
        w_json = json.dumps(prof["weaknessItems"], ensure_ascii=False, indent=4)
        s_block = "\n".join("    " + ln if ln else ln for ln in s_json.split("\n"))
        w_block = "\n".join("    " + ln if ln else ln for ln in w_json.split("\n"))
        pat = (
            rf'("name": "{re.escape(name)}"[\s\S]*?"strengthItems":\s*)\[[\s\S]*?\]'
            rf'(\s*,\s*"weaknessItems":\s*)\[[\s\S]*?\](\s*)'
        )
        repl = rf"\1{s_block}\2{w_block}\3"
        new_text, n = re.subn(pat, repl, text, count=1)
        if n != 1:
            raise SystemExit(f"sync failed for {name} (replacements={n})")
        text = new_text
    DATA_OUT.write_text(text, encoding="utf-8")
    print(f"Synced S/W in {DATA_OUT}")


def main():
    user_exact = load_user_exact()
    assert len(user_exact) == 48, len(user_exact)
    profiles = load_profiles_base()
    profiles = apply_exact(profiles, user_exact)
    write_profiles(profiles)
    sync_data_js(profiles)
  # verify counts
    for name in WEEK_ORDER:
        u = user_exact[name]
        p = profiles[name]
        if len(p["strengthItems"]) != len(u["s"]):
            print(f"WARN {name} strengths {len(u['s'])} items")
        if len(p["weaknessItems"]) != len(u["w"]):
            print(f"WARN {name} weaknesses {len(u['w'])} items")
    print("Done: 48 weeks exact user lines applied.")


if __name__ == "__main__":
    main()
