# -*- coding: utf-8 -*-
"""Wire profile table + life zones into extended 48-week layout."""
import re
from pathlib import Path

HTML = Path(__file__).resolve().parents[1] / "public" / "analysis.html"
t = HTML.read_text(encoding="utf-8")

old_heading = """function period48ProfileHeading(p) {
  const no = p.no != null ? String(p.no).padStart(2, '0') : '';
  const name = p.displayName || p.name || '';
  const weekKo = p.weekTitleKo || '';
  const en = (p.en || p.title || '').trim();
  const head = [no ? `No. ${no}` : '', name].filter(Boolean).join(' ');
  const mid = weekKo ? ` : ${weekKo}` : '';
  const tail = en ? ` (${en})` : '';
  return `${head}${mid}${tail}`.trim();
}"""

new_heading = """function period48ProfileHeading(p) {
  const no = p.no != null ? String(p.no).padStart(2, '0') : '';
  const name = p.displayName || p.name || '';
  const en = (p.en || p.title || '').trim();
  const head = [no ? `No. ${no}` : '', name].filter(Boolean).join(' ');
  const tail = en ? ` (${en})` : '';
  return `${head}${tail}`.trim();
}"""

if old_heading not in t:
    raise SystemExit("period48ProfileHeading block not found")
t = t.replace(old_heading, new_heading, 1)

if "function period48CycleIntroHtml" not in t:
    cycle_fn = '''
function period48CycleIntroHtml(p) {
  const intro = (p.cyclePosition && String(p.cyclePosition).trim()) || '';
  if (!intro) return '';
  const noPart = p.no != null ? `No. ${String(p.no).padStart(2, '0')}` : '';
  const namePart = p.displayName || p.name || '';
  const label = noPart && namePart ? `${noPart} (${namePart})` : (noPart || namePart);
  if (!label) {
    return `<div class="period48-intro-narrative">"${escapeHtmlRich(intro)}"</div>`;
  }
  return `<div class="period48-intro-narrative"><strong>${escapeHtml(label)}:</strong> "${escapeHtmlRich(intro)}"</div>`;
}

'''
    t = t.replace("function buildPeriod48FinalLayout(p) {", cycle_fn + "function buildPeriod48FinalLayout(p) {", 1)

t = t.replace(
    "const showMetaPanel = !!(p && p.showPeriod48MetaPanel);",
    "const showProfileMeta = !!(p && (p.displayName || p.showPeriod48MetaPanel));",
    1,
)

t = t.replace(
    "? `${(zone.zoneTitle || zone.signName || '').trim()} [${zone.stageLabel || ''} : ${zone.ageRange || ''}]`",
    "? `${zone.symbol || ''} ${(zone.zoneTitle || zone.signName || '').trim()} [${zone.stageLabel || ''} : ${zone.ageRange || ''}]`.trim()",
    1,
)

m1 = re.search(
    r"  const block1 = (?:showMetaPanel|showProfileMeta) && zoneLine \? `[\s\S]*?    </section>` : '';",
    t,
)
if not m1:
    m1 = re.search(r"  const block1 = zoneLine \? `[\s\S]*?    </section>` : '';", t)
if not m1:
    raise SystemExit("block1 not found")

new_block1 = """  const syncText = zone && zone.syncKeywords ? escapeHtml(zone.syncKeywords) : '';
  const block1 = zoneLine ? `
    <section class="period48-block period48-block--zone">
      <div class="period48-zone-line">${escapeHtml(zoneLine)}</div>
      ${syncText ? `<div class="period48-sync-row"><strong>시스템 동기화 키워드:</strong> ${syncText}</div>` : ''}
    </section>` : '';"""

t = t[: m1.start()] + new_block1 + t[m1.end() :]

old_block2 = """  const block2Parts = [];
  if (showMetaPanel) {
    block2Parts.push(`<div class="period48-profile-heading">${escapeHtml(period48ProfileHeading(p))}</div>`);
  }"""

new_block2 = """  const block2Parts = [];
  if (showProfileMeta && (p.displayName || p.name)) {
    block2Parts.push(`<div class="period48-profile-heading">${escapeHtml(period48ProfileHeading(p))}</div>`);
  }
  const profileTheme = (p.weekProfileTheme && String(p.weekProfileTheme).trim()) || '';
  if (profileTheme) {
    block2Parts.push(`<div class="period48-profile-theme">${escapeHtml(profileTheme)}</div>`);
  }"""

if old_block2 not in t:
    old_block2 = old_block2.replace("showMetaPanel", "showProfileMeta")
if old_block2 not in t:
    raise SystemExit("block2 start not found")
t = t.replace(old_block2, new_block2, 1)

m3 = re.search(
    r"  const intro = \(p\.cyclePosition[\s\S]*?    </section>` : '';",
    t,
)
if m3:
    new_block3 = """  const block3 = period48CycleIntroHtml(p) ? `
    <section class="period48-block period48-block--intro">
      ${period48CycleIntroHtml(p)}
    </section>` : '';"""
    t = t[: m3.start()] + new_block3 + t[m3.end() :]

if ".period48-profile-theme" not in t:
    t = t.replace(
        ".period48-card--final .period48-profile-heading {",
        ".period48-card--final .period48-profile-theme {\n"
        "      margin-top: 0.35rem;\n"
        "      font-size: 0.95rem;\n"
        "      line-height: 1.55;\n"
        "      color: var(--text-secondary, #5a5a6e);\n"
        "    }\n"
        "    .period48-card--final .period48-profile-heading {",
        1,
    )

t = t.replace("p48v5", "p48v6")

HTML.write_text(t, encoding="utf-8")
print("ok")
