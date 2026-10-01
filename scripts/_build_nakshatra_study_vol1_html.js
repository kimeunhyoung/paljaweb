/**
 * Build site-only readable HTML from 낙샤트라_학습노트_제1권 extract.
 * No PDF is published; print/save/copy are deterred client-side.
 */
const fs = require('fs');
const path = require('path');

const EXTRACT = path.join(__dirname, '_nakshatra_vol1_extract.txt');
const OUT = path.join(__dirname, '..', 'public', 'study', 'nakshatra-vol1.html');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tagBadge(label) {
  const map = {
    '전통 정보': 'trad',
    '전통 전승': 'trad',
    '해석': 'interp',
    '해석적 연결': 'link',
    '풍습': 'custom',
  };
  const cls = map[label] || 'misc';
  return `<span class="nk-badge nk-badge-${cls}">${esc(label)}</span>`;
}

function joinPages(raw) {
  const pages = raw.replace(/\r\n/g, '\n').split(/\n-- \d+ of \d+ --\n/).slice(1);
  return pages.map((p) => p.trim()).join('\n');
}

/** Prefer content heading over TOC: line must equal title (optional trailing spaces), not "title\\tpage". */
function findHeading(text, title) {
  const re = new RegExp(
    '^' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$',
    'gm'
  );
  let m;
  let last = -1;
  while ((m = re.exec(text)) !== null) last = m.index;
  return last;
}

function splitMajor(text) {
  const markers = [
    { id: 'how', title: '이 문서를 읽는 법', first: true },
    { id: 'basics', title: '낙샤트라 기초' },
    { id: 'n1', title: '1. 아쉬위니 Ashwini' },
    { id: 'n2', title: '2. 바라니 Bharani' },
    { id: 'n3', title: '3. 크리티카 Krittika' },
    { id: 'n4', title: '4. 로히니 Rohini' },
    { id: 'n5', title: '5. 므리가시라 Mrigashira' },
    { id: 'n6', title: '6. 아르드라 Ardra' },
    { id: 'n7', title: '7. 푸나르바수 Punarvasu' },
    { id: 'n8', title: '8. 푸쉬야 Pushya' },
    { id: 'n9', title: '9. 아슐레샤 Ashlesha' },
    { id: 'a', title: '부록 A. 분류 한눈에 보기' },
    { id: 'b', title: '부록 B. 서양(열대황도)으로 옮기면' },
    { id: 'c', title: '부록 C. 간단타(Gandanta)', alt: '부록 C. 간단타' },
    { id: 'd', title: '부록 D. 용어집과 확인 필요 목록' },
  ];
  const hits = [];
  for (const m of markers) {
    let r = -1;
    if (m.first) {
      r = text.indexOf(m.title);
    } else {
      r = findHeading(text, m.title);
      if (r < 0 && m.alt) r = findHeading(text, m.alt);
      // fallback: title at line start not followed by tab+digit (TOC)
      if (r < 0) {
        const re = new RegExp(
          '^' + m.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!\\t\\d)',
          'gm'
        );
        let mm;
        while ((mm = re.exec(text)) !== null) r = mm.index;
      }
    }
    if (r >= 0) hits.push({ id: m.id, title: m.title, start: r });
    else console.warn('missing marker', m.id, m.title);
  }
  hits.sort((a, b) => a.start - b.start);
  const sections = [];
  for (let i = 0; i < hits.length; i++) {
    const end = i + 1 < hits.length ? hits[i + 1].start : text.length;
    sections.push({
      id: hits[i].id,
      title: hits[i].title,
      body: text.slice(hits[i].start, end).trim(),
    });
  }
  return sections;
}

function isTableLine(line) {
  return line.includes('\t') && line.split('\t').filter(Boolean).length >= 2;
}

function stepHeadingFromTabLine(line) {
  if (!line.includes('\t')) return null;
  const parts = line.split('\t').map((c) => c.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return null;
  const head = parts[0];
  const badge = parts.find((p) =>
    /^(전통 정보|전통 전승|해석|해석적 연결|풍습)$/.test(p)
  );
  if (!badge) return null;
  if (
    /^\d+단계 · /.test(head) ||
    /^[①-⑨]\s/.test(head) ||
    /^(가나|구나|27개|지배 행성|1~9번)/.test(head)
  ) {
    return { title: head, badge };
  }
  // short section labels like "27개로 나눈 하늘"
  if (head.length <= 40 && parts.length === 2) {
    return { title: head, badge };
  }
  return null;
}

function renderTable(rows) {
  if (!rows.length) return '';
  const cells = rows.map((r) => r.split('\t').map((c) => c.trim()));
  const maxCols = Math.max(...cells.map((c) => c.length));
  const padded = cells.map((c) => {
    while (c.length < maxCols) c.push('');
    return c;
  });
  const head = padded[0];
  // Real column headers are short labels; long prose in row 0 is a key–value pair, not a header.
  const looksHeader =
    padded.length > 1 &&
    head.length >= 3 &&
    head.every((h) => h.length <= 28) &&
    /번호|낙샤트라|파다|위치|이름 음절|지배|가나|야니|성질|구나|원소|순서|다샤|별자리|음절|대응|핵심/.test(
      head.join(' ')
    );
  let html = '<div class="nk-table-wrap"><table class="nk-table">';
  if (looksHeader) {
    html +=
      '<thead><tr>' +
      head.map((h) => `<th>${esc(h)}</th>`).join('') +
      '</tr></thead><tbody>';
    for (let i = 1; i < padded.length; i++) {
      html +=
        '<tr>' + padded[i].map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>';
    }
    html += '</tbody>';
  } else {
    html += '<tbody>';
    for (const row of padded) {
      if (row.length >= 2 && row[0].length <= 28) {
        html +=
          `<tr><th scope="row">${esc(row[0])}</th>` +
          row
            .slice(1)
            .map((c) => `<td>${esc(c)}</td>`)
            .join('') +
          '</tr>';
      } else {
        html +=
          '<tr>' + row.map((c) => `<td>${esc(c)}</td>`).join('') + '</tr>';
      }
    }
    html += '</tbody>';
  }
  html += '</table></div>';
  return html;
}

function renderBody(body, sectionId) {
  const lines = body.split('\n');
  if (lines.length) lines.shift();
  let text = lines.join('\n').trim();
  if (sectionId === 'how') {
    text = text
      .replace(/^27개 낙샤트라 학습 노트[^\n]*\n/, '')
      .replace(/^목차\n[\s\S]*?(?=1\. 이 노트의 기준)/, '');
  }

  // Force structural breaks so PDF line-wraps don't glue headings into paragraphs
  text = text
    .replace(/(?<!\n)(\d+단계 · )/g, '\n$1')
    .replace(/(?<!\n)([①-⑨]\s)/g, '\n$1')
    .replace(/(?<!\n)(\d+장:\s)/g, '\n$1')
    .replace(/(?<!\n)(사용상 주의)/g, '\n$1')
    .replace(/(?<!\n)(주의\s)/g, '\n$1')
    .replace(/(?<!\n)(이 이야기를 바라니와)/g, '\n$1')
    .replace(/(?<!\n)(한 문장으로 읽기:)/g, '\n$1')
    .replace(/(?<!\n)(앞뒤 흐름:)/g, '\n$1')
    .replace(/(?<!\n)(9단계 · 한 줄 핵심)\s*/g, '\n$1\n')
    .replace(/(?<!\n)(용어집|확인 필요 목록)/g, '\n$1');

  const out = [];
  const rawLines = text.split('\n');
  let i = 0;
  let para = [];

  function isHeadingLine(joined) {
    if (/^\d+단계 · /.test(joined)) return true;
    if (/^[①-⑨]\s/.test(joined)) return true;
    if (/^\d+\.\s.{0,40}$/.test(joined) && joined.length < 80) return true;
    if (/^(사용상 주의|정의|용어집|확인 필요)/.test(joined)) return true;
    if (/^이 이야기를 /.test(joined) && joined.length < 80) return true;
    return false;
  }

  function flushPara() {
    if (!para.length) return;
    const joined = para.join(' ').replace(/\s+/g, ' ').trim();
    para = [];
    if (!joined) return;

    if (isHeadingLine(joined) || /^(?:\d+)\.\s/.test(joined) && joined.length < 90) {
      const badgeMatch = joined.match(
        /\s(전통 정보|전통 전승|해석|해석적 연결|풍습)\s*$/
      );
      let title = joined;
      let badge = '';
      if (badgeMatch) {
        title = joined.slice(0, badgeMatch.index).trim();
        badge = ' ' + tagBadge(badgeMatch[1]);
      }
      // strip trailing badge words glued without space quirks
      title = title.replace(/\s+(전통 정보|전통 전승|해석|해석적 연결|풍습)$/, '').trim();
      if (title.length < 140) {
        out.push(`<h3>${esc(title)}${badge}</h3>`);
        return;
      }
    }

    const headBadge = joined.match(
      /^(.{2,60}?)\s+(전통 정보|전통 전승|해석|해석적 연결|풍습)$/
    );
    if (headBadge && !/[.。]/.test(headBadge[1])) {
      out.push(
        `<h3 class="nk-subhead">${esc(headBadge[1])} ${tagBadge(headBadge[2])}</h3>`
      );
      return;
    }

    if (/^앞뒤 흐름:/.test(joined)) {
      out.push(`<p class="nk-flow">${esc(joined)}</p>`);
      return;
    }
    if (
      /^(가장 먼저 |끝을 마주|불로 가려내고|달이 가장|소마의 부드러운|루드라의 활|폭풍이 지나간|스승 브리하스파티|똬리를 튼)/.test(
        joined
      ) &&
      joined.length < 160
    ) {
      out.push(`<p class="nk-keyline">${esc(joined)}</p>`);
      return;
    }
    out.push(`<p>${esc(joined)}</p>`);
  }

  while (i < rawLines.length) {
    const line = rawLines[i];
    if (!line.trim()) {
      flushPara();
      i++;
      continue;
    }
    if (isTableLine(line)) {
      flushPara();
      const stepHead = stepHeadingFromTabLine(line);
      if (stepHead) {
        out.push(
          `<h3>${esc(stepHead.title)} ${tagBadge(stepHead.badge)}</h3>`
        );
        i++;
        continue;
      }
      const rows = [];
      while (i < rawLines.length && isTableLine(rawLines[i])) {
        // break if next tab-line is actually a step heading
        if (rows.length && stepHeadingFromTabLine(rawLines[i])) break;
        rows.push(rawLines[i]);
        i++;
      }
      out.push(renderTable(rows));
      continue;
    }
    const trimmed = line.trim();
    if (
      para.length === 0 &&
      out.length === 0 &&
      sectionId.startsWith('n') &&
      !/단계|이름|대응|위치|지배/.test(trimmed)
    ) {
      out.push(`<p class="nk-tagline">${esc(trimmed)}</p>`);
      i++;
      continue;
    }
    if (
      para.length === 0 &&
      out.length === 0 &&
      /^(1~9번|베다|물과)/.test(trimmed)
    ) {
      out.push(`<p class="nk-tagline">${esc(trimmed)}</p>`);
      i++;
      continue;
    }
    // Start new block on structural lines
    if (
      para.length &&
      (/^\d+단계 · /.test(trimmed) ||
        /^[①-⑨]\s/.test(trimmed) ||
        /^\d+장:/.test(trimmed) ||
        /^앞뒤 흐름:/.test(trimmed) ||
        /^9단계/.test(trimmed) ||
        /^사용상 주의/.test(trimmed))
    ) {
      flushPara();
    }
    para.push(trimmed);
    // Flush after short structural headings immediately
    if (
      /^\d+단계 · /.test(trimmed) ||
      /^[①-⑨]\s.{0,80}(전통 정보|전통 전승|해석|해석적 연결|풍습)?\s*$/.test(
        trimmed
      )
    ) {
      // If heading-only line (short), flush now; else keep collecting body of ① title line
      if (trimmed.length < 100 || /\s(전통 정보|전통 전승|해석|해석적 연결|풍습)\s*$/.test(trimmed)) {
        flushPara();
      }
    }
    i++;
  }
  flushPara();
  return out.join('\n');
}

function buildHtml(sections) {
  const toc = sections
    .map(
      (s) =>
        `<li><a href="#${s.id}">${esc(s.title.replace(/^부록 [A-D]\. /, '부록 · '))}</a></li>`
    )
    .join('\n');

  const body = sections
    .map((s) => {
      return `<section class="content-section nk-section" id="${s.id}">
  <h2>${esc(s.title)}</h2>
  ${renderBody(s.body, s.id)}
</section>`;
    })
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <title>낙샤트라 학습 노트 제1권 (1~9) — 사이트 열람 | 팔자연구소 8CODE</title>
  <meta name="description" content="낙샤트라 27 학습 노트 제1권(아쉬위니~아슐레샤). 사이트에서만 열람 가능합니다.">
  <link rel="canonical" href="https://8code.kr/study/nakshatra-vol1.html">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="팔자연구소 8CODE">
  <meta property="og:title" content="낙샤트라 학습 노트 제1권 — 사이트 열람">
  <meta property="og:description" content="1~9번 낙샤트라 학습 노트. PDF 다운로드 없이 사이트에서만 읽습니다.">
  <meta property="og:url" content="https://8code.kr/study/nakshatra-vol1.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="../css/style.css?v=20260818a">
  <link rel="stylesheet" href="../css/content-pages.css?v=1">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Noto+Sans+KR:wght@400;500&family=Noto+Serif+KR:wght@400;600&display=swap" rel="stylesheet">
  <style>
    .nk-protect {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }
    .nk-toc {
      background: rgba(248, 244, 236, 0.9);
      border: 1px solid rgba(139, 111, 71, 0.18);
      border-radius: 10px;
      padding: 1rem 1.15rem;
      margin: 0 0 2rem;
    }
    .nk-toc h2 {
      font-size: 1rem;
      margin: 0 0 0.55rem;
      border: none;
      padding: 0;
    }
    .nk-toc ol {
      margin: 0;
      padding-left: 1.2rem;
      columns: 1;
    }
    @media (min-width: 640px) {
      .nk-toc ol { columns: 2; column-gap: 1.5rem; }
    }
    .nk-toc li { margin: 0.25rem 0; break-inside: avoid; }
    .nk-toc a { color: #8b6f47; text-decoration: none; }
    .nk-toc a:hover { text-decoration: underline; }
    .nk-tagline {
      font-family: 'Noto Serif KR', serif;
      color: #6b5742;
      font-size: 1.02rem;
      margin: -0.35rem 0 1.1rem;
    }
    .nk-subhead { margin-top: 1.35rem; }
    .nk-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 500;
      font-family: 'Noto Sans KR', sans-serif;
      padding: 0.12rem 0.45rem;
      border-radius: 4px;
      margin-left: 0.35rem;
      vertical-align: middle;
      letter-spacing: 0.02em;
    }
    .nk-badge-trad { background: #e8f0e6; color: #2f5a2a; }
    .nk-badge-interp { background: #efe8f5; color: #5a3d72; }
    .nk-badge-link { background: #f5efe0; color: #7a5a20; }
    .nk-badge-custom { background: #e6eef5; color: #2a4a6a; }
    .nk-badge-misc { background: #eee; color: #555; }
    .nk-table-wrap {
      overflow-x: auto;
      margin: 0.75rem 0 1.15rem;
      border: 1px solid rgba(139, 111, 71, 0.2);
      border-radius: 8px;
      -webkit-overflow-scrolling: touch;
    }
    .nk-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.86rem;
      line-height: 1.45;
      table-layout: fixed;
    }
    .nk-table th, .nk-table td {
      padding: 0.45rem 0.55rem;
      border-bottom: 1px solid rgba(139, 111, 71, 0.12);
      text-align: left;
      vertical-align: top;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: keep-all;
    }
    .nk-table thead th {
      background: rgba(139, 111, 71, 0.1);
      font-weight: 600;
    }
    .nk-table tbody th {
      font-weight: 600;
      color: #5c451f;
      width: 7.2rem;
      background: rgba(139, 111, 71, 0.04);
    }
    .nk-table tr:last-child th,
    .nk-table tr:last-child td { border-bottom: none; }
    .nk-keyline {
      font-family: 'Noto Serif KR', serif;
      font-weight: 600;
      color: #3d2e18;
      background: rgba(200, 169, 110, 0.15);
      padding: 0.75rem 1rem;
      border-radius: 8px;
    }
    .nk-flow { font-size: 0.92rem; color: #6b5742; }
    .nk-section h3 {
      font-size: 1.02rem;
      margin: 1.35rem 0 0.5rem;
      color: #4a3520;
    }
    .nk-section h2 { scroll-margin-top: 4.5rem; }
    .nk-legend {
      display: flex; flex-wrap: wrap; gap: 0.45rem 0.85rem;
      font-size: 0.82rem; color: #6b5742; margin: 0 0 1.25rem;
    }
    @media print {
      body * { visibility: hidden !important; }
      body::before {
        visibility: visible !important;
        content: "이 학습 노트는 사이트에서만 열람할 수 있습니다. 인쇄·PDF 저장은 지원하지 않습니다.";
        display: block;
        padding: 3rem;
        font-size: 16pt;
        font-family: sans-serif;
      }
    }
  </style>
</head>
<body class="nk-protect">
  <nav class="navbar"><div class="nav-inner">
    <a href="../index.html" class="nav-logo"><div class="logo-mark">八</div><span class="logo-text">팔자연구소</span></a>
    <div class="nav-actions"><a href="index.html" class="btn-nav-fill">스터디</a></div>
  </div></nav>
  <script src="/js/content-site-nav.js?v=2"></script>

  <main class="content-main nk-protect">
    <h1>낙샤트라 학습 노트 · 제1권</h1>
    <p class="content-meta"><a href="index.html">스터디</a> · 베다 점성학 · 1번~9번 (첫 번째 바퀴)</p>
    <p class="content-lead">
      27개 낙샤트라 중 <strong>1~9번</strong>(아쉬위니·바라니·크리티카·로히니·므리가시라·아르드라·푸나르바수·푸쉬야·아슐레샤)을
      전통 정보 · 해석 · 해석적 연결로 구분해 정리한 학습 노트입니다.
      베다 점성학(항성황도) 기준이며, 원전을 직접 대조하지 않은 정리본입니다.
    </p>
    <div class="nk-legend">
      <span>${tagBadge('전통 정보')} 비교적 일관된 전승</span>
      <span>${tagBadge('해석')} 후대·현대 풀이</span>
      <span>${tagBadge('해석적 연결')} 비유·연결 읽기</span>
      <span>${tagBadge('풍습')} 의례·축제</span>
    </div>

    <nav class="nk-toc" aria-label="목차">
      <h2>목차</h2>
      <ol>
${toc}
      </ol>
    </nav>

${body}

    <div class="content-note">상징 해석은 낙샤트라를 이해하기 위한 틀입니다. 특정인의 성격이나 운명을 단정하는 근거로 쓰지 마세요.</div>
    <div class="content-footer-links">
      <a href="../guide/what-is-astrology.html">점성학이란?</a> ·
      <a href="../guide/astrology.html">점성학 차트 가이드</a> ·
      <a href="index.html">← 스터디 목록</a>
    </div>
  </main>
  <footer class="footer"><div class="container"><div class="footer-bottom"><p>© 2026 8CODE (팔자연구소)</p></div></div></footer>
  <script>
  (function () {
    var root = document.body;
    function block(e) { e.preventDefault(); return false; }
    root.addEventListener('contextmenu', block);
    root.addEventListener('dragstart', block);
    root.addEventListener('copy', block);
    root.addEventListener('cut', block);
    document.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase();
      var mod = e.ctrlKey || e.metaKey;
      if (mod && (k === 's' || k === 'p' || k === 'u' || k === 'c' || k === 'a' || k === 'x')) {
        e.preventDefault();
        return false;
      }
      if (k === 'printscreen') {
        e.preventDefault();
        return false;
      }
      if (e.keyCode === 123) { e.preventDefault(); return false; } // F12
    }, true);
    window.addEventListener('beforeprint', function () {
      document.body.setAttribute('data-printing', '1');
    });
  })();
  </script>
</body>
</html>
`;
}

function main() {
  const raw = fs.readFileSync(EXTRACT, 'utf8');
  const text = joinPages(raw);
  const sections = splitMajor(text);
  if (sections.length < 10) {
    console.error('Expected more sections, got', sections.length);
    process.exit(1);
  }
  const html = buildHtml(sections);
  fs.writeFileSync(OUT, html, 'utf8');
  console.log('Wrote', OUT);
  console.log('sections', sections.map((s) => s.id).join(', '));
  console.log('bytes', Buffer.byteLength(html));
}

main();
