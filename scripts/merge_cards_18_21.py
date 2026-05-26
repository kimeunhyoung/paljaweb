# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).resolve().parents[1]
main = root / "public/js/tarot-major-scripted.js"
snip = root / "scripts/_cards_18_21_snippet.js"
text = main.read_text(encoding="utf-8")
chunk = snip.read_text(encoding="utf-8")
anchor = "    },\n\n  };\n\n  function pickSectionKey(ctx)"
if anchor not in text:
    raise SystemExit("anchor not found")
text = text.replace(anchor, "    }," + chunk + "\n  };\n\n  function pickSectionKey(ctx)", 1)
main.write_text(text, encoding="utf-8")
print("merged", snip.name)
