# -*- coding: utf-8 -*-
"""Extract user 48-week bullet lines from agent transcript."""
import json, re
from pathlib import Path

TRANSCRIPT = Path(
    r"C:\Users\김은형\.cursor\projects\b-paljaweb\agent-transcripts"
    r"\0d0e0265-6748-4205-964d-2529eb19ab09"
    r"\0d0e0265-6748-4205-964d-2529eb19ab09.jsonl"
)

NAME_MAP = {
    "물고기-양자리 경계": "물고기-양자리 경계",
    "양자리 I": "양자리 I",
    "양자리 II": "양자리 II",
    # ... built from pattern
}

def parse_user_text(text):
    if "<user_query>" in text:
        text = text.split("<user_query>", 1)[-1]
    if "</user_query>" in text:
        text = text.split("</user_query>", 1)[0]
    weeks = {}
    current = None
    section = None
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
            weeks.setdefault(current, {"s": [], "w": []})[section].append(line[1:].strip())
            continue
        # week header: "양자리 II · 스타의 주간" or boundary
        if "·" in line and not line.startswith("→"):
            name_part = line.split("·", 1)[0].strip()
            # normalize name
            current = name_part
            weeks.setdefault(current, {"s": [], "w": []})
            section = None
    return weeks

def main():
    all_weeks = {}
    with TRANSCRIPT.open(encoding="utf-8") as f:
        for line in f:
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get("role") != "user":
                continue
            content = obj.get("message", {}).get("content", [])
            if not content:
                continue
            text = content[0].get("text", "")
            if "→" not in text or "주간" not in text:
                continue
            parsed = parse_user_text(text)
            for k, v in parsed.items():
                if k not in all_weeks:
                    all_weeks[k] = v
                else:
                    for sec in "sw":
                        for item in v[sec]:
                            if item not in all_weeks[k][sec]:
                                all_weeks[k][sec].append(item)
    print(f"weeks: {len(all_weeks)}")
    for k in sorted(all_weeks.keys()):
        print(k, len(all_weeks[k]["s"]), len(all_weeks[k]["w"]))

    out = Path(__file__).parent / "p48_user_extracted.json"
    out.write_text(json.dumps(all_weeks, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", out)

if __name__ == "__main__":
    main()
