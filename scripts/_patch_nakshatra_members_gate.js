const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'public', 'nakshatra', 'members');
const inject =
  '\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\/script>\n' +
  '<script src="/nakshatra/members-gate.js"><\/script>\n';
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) {
  const p = path.join(dir, f);
  let h = fs.readFileSync(p, 'utf8');
  if (h.includes('members-gate.js')) {
    console.log('skip', f);
    continue;
  }
  if (/<\/head>/i.test(h)) h = h.replace(/<\/head>/i, inject + '</head>');
  else h = inject + h;
  fs.writeFileSync(p, h);
  console.log('patched', f);
}
