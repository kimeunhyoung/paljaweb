# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).resolve().parents[1]
main = root / "public/js/tarot-minor-scripted.js"
snip = root / "scripts/_minor_cups_43_46.js"
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
    "입력 완료: 완즈 22–35, 컵 36–42 (에이스~세븐)",
    "입력 완료: 완즈 22–35, 컵 36–46 (에이스~페이지)",
    1,
)
main.write_text(text, encoding="utf-8")
print("merged cups 43-46")
