# -*- coding: utf-8 -*-
from pathlib import Path

HTML = Path(__file__).resolve().parents[1] / "public" / "analysis.html"
t = HTML.read_text(encoding="utf-8")

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
  return `<motion class="period48-intro-narrative"><strong>${escapeHtml(label)}:</strong> "${escapeHtmlRich(intro)}"</motion>`;
}

'''
    cycle_fn = cycle_fn.replace("<motion ", "<div ").replace("</motion>", "</motion>")
    t = t.replace("function buildPeriod48FinalLayout(p) {", cycle_fn + "function buildPeriod48FinalLayout(p) {", 1)

t = t.replace(
    "const showMetaPanel = !!(p && p.showPeriod48MetaPanel);",
    "const showProfileHeading = !!(p && p.showPeriod48MetaPanel);",
    1,
)
t = t.replace(
    "? `${(zone.zoneTitle || zone.signName || '').trim()} [${zone.stageLabel || ''} : ${zone.ageRange || ''}]`",
    "? `${zone.symbol || ''} ${(zone.zoneTitle || zone.signName || '').trim()} [${zone.stageLabel || ''} : ${zone.ageRange || ''}]`.trim()",
    1,
)

old_block1 = """  const block1 = showMetaPanel && zoneLine ? `
    <section class="period48-block period48-block--zone">
      <div class="period48-block-kicker">구역 및 발달단계 정보</div>
      <div class="period48-zone-line">${escapeHtml(zoneLine)}</div>
      <div class="period48-sync-row"><strong>시스템 동기화 키워드:</strong></motion>
      <motion class="period48-sync-chips">${period48SyncChipsHtml(zone)}</motion>
    </section>` : '';"""

# read actual from file
import re
m = re.search(
    r"  const block1 = showMetaPanel && zoneLine \? `[\s\S]*?    </section>` : '';",
    t,
)
if not m:
    m = re.search(
        r"  const block1 = showProfileHeading && zoneLine \? `[\s\S]*?    </section>` : '';",
        t,
    )
if m:
    new_block1 = """  const syncText = zone && zone.syncKeywords ? escapeHtml(zone.syncKeywords) : '';
  const block1 = zoneLine ? `
    <section class="period48-block period48-block--zone">
      <div class="period48-zone-line">${escapeHtml(zoneLine)}</div>
      ${syncText ? `<div class="period48-sync-row"><strong>시스템 동기화 키워드:</strong> ${syncText}</div>` : ''}
    </section>` : '';"""
    t = t[: m.start()] + new_block1 + t[m.end() :]
else:
    raise SystemExit("block1 regex not found")

t = t.replace("if (showMetaPanel) {", "if (showProfileHeading) {", 1)

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

HTML.write_text(t, encoding="utf-8")
print("ok")
