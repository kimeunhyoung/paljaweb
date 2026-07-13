/**
 * Append / normalize "팔자연구소 8CODE" in <title>, og:title, og:site_name, twitter:title
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'public');
const BRAND = '팔자연구소 8CODE';
const skipRe = /(admin|ai-credit-admin)\.html$/i;

let files = 0;
let changed = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name.endsWith('.html')) processFile(p);
  }
}

function brandify(text) {
  let t = String(text || '').trim();
  if (!t || t.includes('${')) return null;
  if (t.includes('8CODE')) return t;
  if (/팔자연구소/.test(t)) {
    return t.replace(/팔자연구소(?!\s*8CODE)/g, BRAND);
  }
  return `${t} | ${BRAND}`;
}

function processFile(file) {
  if (skipRe.test(file)) return;
  files += 1;
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;

  html = html.replace(/<title>([^<]*)<\/title>/g, (m, inner) => {
    if (inner.includes('${')) return m;
    const nt = brandify(inner);
    if (nt == null || nt === inner.trim()) return m;
    return `<title>${nt}</title>`;
  });

  html = html.replace(/property="og:site_name"\s+content="([^"]*)"/g, (m, v) => {
    if (v.includes('8CODE')) return m;
    return `property="og:site_name" content="${BRAND}"`;
  });
  html = html.replace(/content="([^"]*)"\s+property="og:site_name"/g, (m, v) => {
    if (v.includes('8CODE')) return m;
    return `content="${BRAND}" property="og:site_name"`;
  });

  html = html.replace(/property="og:title"\s+content="([^"]*)"/g, (m, v) => {
    const nt = brandify(v);
    if (!nt || nt === v) return m;
    return `property="og:title" content="${nt}"`;
  });
  html = html.replace(/content="([^"]*)"\s+property="og:title"/g, (m, v) => {
    const nt = brandify(v);
    if (!nt || nt === v) return m;
    return `content="${nt}" property="og:title"`;
  });

  html = html.replace(/name="twitter:title"\s+content="([^"]*)"/g, (m, v) => {
    const nt = brandify(v);
    if (!nt || nt === v) return m;
    return `name="twitter:title" content="${nt}"`;
  });

  if (html !== orig) {
    fs.writeFileSync(file, html);
    changed += 1;
    console.log('updated', path.relative(root, file));
  }
}

walk(root);
console.log(`done files=${files} changed=${changed}`);
