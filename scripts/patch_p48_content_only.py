# -*- coding: utf-8 -*-
from pathlib import Path

HTML = Path(__file__).resolve().parents[1] / "public" / "analysis.html"
t = HTML.read_text(encoding="utf-8")

start = t.index("function buildPeriod48FinalLayout(p)")
end = t.index("  const strengthLabel = p.strengthSectionLabel", start)

D = "div"
new_fn_head = f"""function buildPeriod48FinalLayout(p) {{
  const showMetaPanel = !!(p && p.showPeriod48MetaPanel);
  const zone = p.lifeZone || resolvePeriod48LifeZone(p);
  const zoneLine = zone
    ? `${{(zone.zoneTitle || zone.signName || '').trim()}} [${{zone.stageLabel || ''}} : ${{zone.ageRange || ''}}]`
    : '';
  const block1 = showMetaPanel && zoneLine ? `
    <section class="period48-block period48-block--zone">
      <{D} class="period48-block-kicker">구역 및 발달단계 정보</{D}>
      <{D} class="period48-zone-line">${{escapeHtml(zoneLine)}}</{D}>
      <{D} class="period48-sync-row"><strong>시스템 동기화 키워드:</strong></{D}>
      <{D} class="period48-sync-chips">${{period48SyncChipsHtml(zone)}}</{D}>
    </section>` : '';

  const block2Parts = [];
  if (showMetaPanel) {{
    block2Parts.push(`<{D} class="period48-profile-heading">${{escapeHtml(period48ProfileHeading(p))}}</{D}>`);
  }}
  if (p.degreeRange || p.dateLabel) {{
    block2Parts.push(
      `<{D} class="period48-degree-line">${{escapeHtml(p.degreeRange || '')}}${{p.degreeRange && p.dateLabel ? ' ' : ''}}${{p.dateLabel ? `(표준 날짜: ${{escapeHtml(p.dateLabel)}})` : ''}}</{D}>`
    );
  }}
  if (p.coreSummary) {{
    block2Parts.push(
      `<{D} class="period48-core-summary-line"><span class="period48-core-summary-quote">"${{escapeHtml(p.coreSummary)}}"</span></{D}>`
    );
  }}
  const block2 = block2Parts.length
    ? `<section class="period48-block period48-block--title">${{block2Parts.join('')}}</section>`
    : '';

  const intro = (p.cyclePosition && String(p.cyclePosition).trim()) || '';
  const block3 = intro ? `
    <section class="period48-block period48-block--intro">
      <{D} class="period48-intro-narrative">"${{escapeHtmlRich(intro)}}"</{D}>
    </section>` : '';

  const pos = Array.isArray(p.keywords) ? p.keywords : [];
  const neg = Array.isArray(p.shadowKeywords) ? p.shadowKeywords : [];
  const hashHtml = [...pos, ...neg].map((k, i) => {{
    const shadow = i >= pos.length;
    return `<span class="period48-hash-tag${{shadow ? ' period48-hash-tag--shadow' : ''}}">#${{escapeHtml(k)}}</span>`;
  }}).join('');
  const block4 = hashHtml ? `
    <section class="period48-block period48-block--tags">
      <{D} class="period48-hash-tags">${{hashHtml}}</{D}>
    </section>` : '';

"""

t = t[:start] + new_fn_head + t[end:]
HTML.write_text(t, encoding="utf-8")
print("ok showMetaPanel", "showMetaPanel" in t)
