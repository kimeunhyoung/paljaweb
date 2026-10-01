const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');

const SITE_CSS =
  '<link rel="stylesheet" href="/css/style.css?v=20260818a">\n' +
  '<link rel="stylesheet" href="/css/content-pages.css?v=1">\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Noto+Sans+KR:wght@400;500&family=Noto+Serif+KR:wght@400;600&display=swap" rel="stylesheet">\n';

const NAV =
  '<nav class="navbar" id="navbar">\n' +
  '  <div class="nav-inner">\n' +
  '    <a href="/index.html" class="nav-logo"><div class="logo-mark">八</div><span class="logo-text">팔자연구소</span></a>\n' +
  '    <div class="nav-actions"><a href="/nakshatra/index.html" class="btn-nav-fill">학습자료실</a></div>\n' +
  '  </div>\n' +
  '</nav>\n' +
  '<script src="/js/content-site-nav.js?v=3"><\/script>\n';

const DISCLAIMER =
  '<div class="banner">학습 노트입니다. 원전과 직접 대조하지 않았고, 자료에 따라 다른 내용은 그렇게 표시했습니다. 특정인의 성격이나 운명을 단정하는 근거로 쓰지 마세요.</div>';

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.html')) out.push(p);
  }
  return out;
}

// 1) bump content-site-nav cache on all public HTML
let bumped = 0;
for (const f of walk(ROOT)) {
  let h = fs.readFileSync(f, 'utf8');
  if (!h.includes('content-site-nav.js')) continue;
  const nh = h.replace(/content-site-nav\.js\?v=[^"'>\s]+/g, 'content-site-nav.js?v=3');
  if (nh !== h) {
    fs.writeFileSync(f, nh);
    bumped++;
  }
}
console.log('bumped nav cache', bumped);

// 2) patch nakshatra pages: site nav + strip internal copy
const nkRoot = path.join(ROOT, 'nakshatra');
const nkFiles = walk(nkRoot).filter((f) => !f.endsWith('README_배포.md'));

for (const f of nkFiles) {
  let h = fs.readFileSync(f, 'utf8');
  const isMember = f.includes(`${path.sep}members${path.sep}`);
  const cssHref = isMember ? '../site.css' : 'site.css';

  // ensure site chrome CSS once
  if (!h.includes('/css/style.css')) {
    h = h.replace(
      new RegExp(`<link rel="stylesheet" href="${cssHref.replace('.', '\\.')}">`),
      SITE_CSS + `<link rel="stylesheet" href="${cssHref}">`
    );
  }

  // replace custom orange top bar with site navbar
  h = h.replace(
    /<div class="top"><div class="in">[\s\S]*?<\/div><\/div>\s*/,
    NAV
  );

  // remove freemium / preview strategy blurbs from banners
  h = h.replace(
    /<div class="banner"[^>]*>[\s\S]*?<\/div>/,
    DISCLAIMER
  );
  // index had hidden banner + separate note — remove strategy note
  h = h.replace(
    /<div class="note">🔒[\s\S]*?<\/div>\s*/,
    ''
  );

  // soften card lock labels: keep 🔒 but remove explanatory note already done
  // members-gate soft text
  fs.writeFileSync(f, h);
  console.log('patched', path.relative(ROOT, f));
}

// 3) members-gate customer copy
const gatePath = path.join(nkRoot, 'members-gate.js');
let gate = fs.readFileSync(gatePath, 'utf8');
gate = gate
  .replace('맛보기 목차로', '학습자료실 목차로')
  .replace(
    '베이직 이상 요금제에서 열람할 수 있습니다.',
    '요금제 회원만 열람할 수 있습니다.'
  );
fs.writeFileSync(gatePath, gate);
console.log('gate copy updated');
