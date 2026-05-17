# -*- coding: utf-8 -*-
from pathlib import Path

HTML = Path(__file__).resolve().parents[1] / "public" / "analysis.html"
t = HTML.read_text(encoding="utf-8")

start = t.find("\n\nfunction period48CycleIntroHtml(p) {")
end = t.find("\n\nfunction buildPeriod48LifeZoneHtml(p) {")
if start < 0 or end < 0:
    raise SystemExit(f"markers not found start={start} end={end}")

d = "div"
fixed = f"""

function period48CycleIntroHtml(p) {{
  const intro = (p.cyclePosition && String(p.cyclePosition).trim()) || '';
  if (!intro) return '';
  const noPart = p.no != null ? `No. ${{String(p.no).padStart(2, '0')}}` : '';
  const namePart = p.displayName || p.name || '';
  const label = noPart && namePart ? `${{noPart}} (${{namePart}})` : (noPart || namePart);
  if (!label) {{
    return `<{d} class="period48-intro-narrative">"${{escapeHtmlRich(intro)}}"</{d}>`;
  }}
  return `<{d} class="period48-intro-narrative"><strong>${{escapeHtml(label)}}:</strong> "${{escapeHtmlRich(intro)}}"</{d}>`;
}}

function buildPeriod48FinalLayout(p) {{
  const showProfileMeta = !!(p && (p.displayName || p.showPeriod48MetaPanel));
  const zone = p.lifeZone || resolvePeriod48LifeZone(p);
  const zoneLine = zone
    ? `${{zone.symbol || ''}} ${{(zone.zoneTitle || zone.signName || '').trim()}} [${{zone.stageLabel || ''}} : ${{zone.ageRange || ''}}]`.trim()
    : '';
  const syncText = zone && zone.syncKeywords ? escapeHtml(zone.syncKeywords) : '';
  const block1 = zoneLine ? `
    <section class="period48-block period48-block--zone">
      <{d} class="period48-zone-line">${{escapeHtml(zoneLine)}}</{d}>
      ${{syncText ? `<{d} class="period48-sync-row"><strong>시스템 동기화 키워드:</strong> ${{syncText}}</{d}>` : ''}}
    </section>` : '';

  const block2Parts = [];
  if (showProfileMeta && (p.displayName || p.name)) {{
    block2Parts.push(`<{d} class="period48-profile-heading">${{escapeHtml(period48ProfileHeading(p))}}</{d}>`);
  }}
  const profileTheme = (p.weekProfileTheme && String(p.weekProfileTheme).trim()) || '';
  if (profileTheme) {{
    block2Parts.push(`<{d} class="period48-profile-theme">${{escapeHtml(profileTheme)}}</{d}>`);
  }}
  if (p.degreeRange || p.dateLabel) {{
    block2Parts.push(
      `<{d} class="period48-degree-line">${{escapeHtml(p.degreeRange || '')}}${{p.degreeRange && p.dateLabel ? ' ' : ''}}${{p.dateLabel ? `(표준 날짜: ${{escapeHtml(p.dateLabel)}})` : ''}}</{d}>`
    );
  }}
  if (p.coreSummary) {{
    block2Parts.push(
      `<{d} class="period48-core-summary-line"><span class="period48-core-summary-quote">"${{escapeHtml(p.coreSummary)}}"</span></{d}>`
    );
  }}
  const block2 = block2Parts.length
    ? `<section class="period48-block period48-block--title">${{block2Parts.join('')}}</section>`
    : '';

  const block3 = period48CycleIntroHtml(p) ? `
    <section class="period48-block period48-block--intro">
      ${{period48CycleIntroHtml(p)}}
    </section>` : '';

  const pos = Array.isArray(p.keywords) ? p.keywords : [];
  const neg = Array.isArray(p.shadowKeywords) ? p.shadowKeywords : [];
  const hashHtml = [...pos, ...neg].map((k, i) => {{
    const shadow = i >= pos.length;
    return `<span class="period48-hash-tag${{shadow ? ' period48-hash-tag--shadow' : ''}}">#${{escapeHtml(k)}}</span>`;
  }}).join('');
  const block4 = hashHtml ? `
    <section class="period48-block period48-block--tags">
      <{d} class="period48-hash-tags">${{hashHtml}}</{d}>
    </section>` : '';

  const strengthLabel = p.strengthSectionLabel || '빛의 영역 (Strengths & Talents)';
  const weaknessLabel = p.weaknessSectionLabel || '그림자의 영역 (Weaknesses & Shadows)';
  const block5 = `
    <section class="period48-block period48-block--reading">
      ${{p.temperament ? `
      <{d} class="period48-reading-section">
        <{d} class="period48-reading-section-title">내면적 기질 및 행동 패턴:</{d}>
        <{d} class="period48-desc">${{escapeHtml(p.temperament)}}</{d}>
      </{d}>` : ''}}
      ${{(p.strengthItems || []).length ? `
      <{d} class="period48-reading-section">
        <{d} class="period48-reading-section-title">${{escapeHtml(strengthLabel)}}:</{d}>
        ${{renderPeriod48ReadingItems(p.strengthItems)}}
      </{d}>` : ''}}
      ${{(p.weaknessItems || []).length ? `
      <{d} class="period48-reading-section">
        <{d} class="period48-reading-section-title">${{escapeHtml(weaknessLabel)}}:</{d}>
        ${{renderPeriod48ReadingItems(p.weaknessItems)}}
      </{d}>` : ''}}
      ${{p.lifeMission ? `
      <{d} class="period48-reading-section">
        <{d} class="period48-reading-section-title">인생의 핵심 과제:</{d}>
        <{d} class="period48-life-mission-block"><{d} class="period48-desc">${{escapeHtml(p.lifeMission)}}</{d}></{d}>
      </{d}>` : ''}}
    </section>`;

  return `${{block1}}${{block2}}${{block3}}${{block4}}${{block5}}
    <{d} class="period48-source">* Gary Goldschneider & Joost Elffers의 《The Secret Language of Birthdays》를 바탕으로 한 48주기 성격 분석 체계입니다.</{d}>`;
}}

"""

t = t[:start] + fixed + t[end:]

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

HTML.write_text(t, encoding="utf-8")
print("ok")
