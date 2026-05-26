# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).resolve().parents[1]
main = root / "public/js/tarot-minor-scripted.js"
snip = root / "scripts/_minor_swords_50_52.js"
text = main.read_text(encoding="utf-8")
chunk = snip.read_text(encoding="utf-8")
anchor = "\n  };\n\n  function pickSectionKey"
pos = text.find(anchor)
if pos < 0:
    raise SystemExit("anchor not found")
end_card = text.rfind("    },", 0, pos)
insert_at = end_card + len("    },")
text = text[:insert_at] + chunk + text[insert_at:]
text = text.replace(
    "입력 완료: 완즈 22–35, 컵 36–49 (에이스~킹)",
    "입력 완료: 완즈 22–35, 컵 36–49, 소드 50–52 (에이스~쓰리)",
    1,
)
main.write_text(text, encoding="utf-8")
print("merged swords 50-52")
