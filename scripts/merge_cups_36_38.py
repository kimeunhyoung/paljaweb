# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).resolve().parents[1]
main = root / "public/js/tarot-minor-scripted.js"
snip = root / "scripts/_minor_cups_36_38.js"
text = main.read_text(encoding="utf-8")
chunk = snip.read_text(encoding="utf-8")
anchor = "\n  };\n\n  function pickSectionKey"
pos = text.find(anchor)
if pos < 0:
    raise SystemExit("anchor not found")
end_card = text.rfind("    },", 0, pos)
if end_card < 0:
    raise SystemExit("last card end not found")
insert_at = end_card + len("    },")
text = text[:insert_at] + chunk + text[insert_at:]
old_hdr = "입력 완료: 완즈 22–35 (에이스~킹)"
new_hdr = "입력 완료: 완즈 22–35, 컵 36–38 (에이스~쓰리)"
if old_hdr in text:
    text = text.replace(old_hdr, new_hdr, 1)
else:
    text = text.replace(
        "입력 완료: 완즈 22–35 (에이스~킹)\n",
        new_hdr + "\n",
        1,
    )
main.write_text(text, encoding="utf-8")
print("merged cups 36-38")
