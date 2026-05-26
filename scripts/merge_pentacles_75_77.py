# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).resolve().parents[1]
main = root / "public/js/tarot-minor-scripted.js"
snip = root / "scripts/_minor_pentacles_75_77.js"
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
    "입력 완료: 완즈 22–35, 컵 36–49, 소드 50–63, 펜타클 64–74 (에이스~페이지)",
    "입력 완료: 완즈 22–35, 컵 36–49, 소드 50–63, 펜타클 64–77 (전체)",
    1,
)
main.write_text(text, encoding="utf-8")
print("merged pentacles 75-77 — minor arcana complete")
