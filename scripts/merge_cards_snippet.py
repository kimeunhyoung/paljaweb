# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).resolve().parents[1]
main = root / "public/js/tarot-major-scripted.js"
snip = root / "scripts/_cards_10_17_snippet.js"
text = main.read_text(encoding="utf-8")
chunk = snip.read_text(encoding="utf-8")
anchor = (
    "고독을 즐기되, 고립되어 고집불통이 되지 않도록 스스로의 경직성을 깨부수어야 합니다.',\n"
    "    },\n"
    "  };"
)
if anchor not in text:
    raise SystemExit("anchor not found")
text = text.replace(
    anchor,
    "고독을 즐기되, 고립되어 고집불통이 되지 않도록 스스로의 경직성을 깨부수어야 합니다.',"
    + chunk
    + "\n  };",
    1,
)
main.write_text(text, encoding="utf-8")
print("merged", snip.name)
