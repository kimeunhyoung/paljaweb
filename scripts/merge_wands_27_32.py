# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).resolve().parents[1]
main = root / "public/js/tarot-minor-scripted.js"
snip = root / "scripts/_minor_wands_27_32.js"
text = main.read_text(encoding="utf-8")
chunk = snip.read_text(encoding="utf-8")
marker = "    26: {"
idx = text.rfind(marker)
if idx < 0:
    raise SystemExit("card 26 not found")
close = text.find("\n  };", idx)
if close < 0:
    raise SystemExit("CARDS close not found")
# insert after card 26's closing `    },`
end_card = text.rfind("    },", idx, close)
if end_card < 0:
    raise SystemExit("card 26 end not found")
insert_at = end_card + len("    },")
text = text[:insert_at] + chunk + text[insert_at:]
text = text.replace(
    "입력 완료: 완즈 22–26 (에이스~파이브)",
    "입력 완료: 완즈 22–32 (에이스~페이지)",
    1,
)
main.write_text(text, encoding="utf-8")
print("merged 27-32")
