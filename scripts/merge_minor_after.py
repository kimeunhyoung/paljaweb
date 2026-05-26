# -*- coding: utf-8 -*-
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
main = root / "public/js/tarot-minor-scripted.js"
snip = Path(sys.argv[1])
after_id = int(sys.argv[2])
text = main.read_text(encoding="utf-8")
chunk = snip.read_text(encoding="utf-8")
pattern = rf"(\s+{after_id}: \{{[\s\S]*?\n    \}},)\n\n  \}};"
m = re.search(pattern, text)
if not m:
    raise SystemExit(f"card {after_id} block not found")
text = text[: m.end(1)] + chunk + text[m.end(1) - len("\n\n  };") :]
main.write_text(text, encoding="utf-8")
print("merged after", after_id, "from", snip.name)
