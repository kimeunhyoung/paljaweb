const fs = require('fs');
const path = require('path');
function walk(d, a = []) {
  for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, n.name);
    if (n.isDirectory()) walk(p, a);
    else if (n.name.endsWith('.html')) a.push(p);
  }
  return a;
}
let n = 0;
for (const f of walk(path.join(__dirname, '..', 'public'))) {
  let h = fs.readFileSync(f, 'utf8');
  if (!h.includes('content-site-nav.js')) continue;
  const nh = h.replace(/content-site-nav\.js\?v=[^"'>\s]+/g, 'content-site-nav.js?v=4');
  if (nh !== h) {
    fs.writeFileSync(f, nh);
    n++;
  }
}
console.log('bumped', n);
