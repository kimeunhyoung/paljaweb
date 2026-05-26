# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).resolve().parents[1]
main = root / "public/js/tarot-minor-scripted.js"
snip = root / "scripts/_minor_wands_22_24.js"
text = main.read_text(encoding="utf-8")
chunk = snip.read_text(encoding="utf-8")
anchor = "  const CARDS = {\n    // 완즈 22–35, 컵 36–49, 소드 50–63, 펜타클 64–77\n  };"
if anchor not in text:
    raise SystemExit("anchor not found")
text = text.replace(anchor, "  const CARDS = {" + chunk + "\n  };", 1)
main.write_text(text, encoding="utf-8")
print("merged", snip.name)
