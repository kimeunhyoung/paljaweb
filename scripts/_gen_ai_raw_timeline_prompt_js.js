/* Generate prompt JS from v2: node scripts/_gen_ai_raw_timeline_prompt_js.js */
const fs = require('fs');
const path = require('path');
const srcName = '_prompt_ai_raw_timeline_customer_v2.txt';
const txt = fs.readFileSync(path.join(__dirname, srcName), 'utf8').replace(/\r\n/g, '\n');
const start = txt.indexOf('상품 정의');
const end = txt.indexOf('USER MESSAGE');
if (start < 0 || end < 0) throw new Error('prompt markers not found start=' + start + ' end=' + end);
const system = txt.slice(start, end).replace(/^=+\s*$/gm, '').trim();
const userStart = txt.indexOf('아래 JSON은 ai-raw-timeline-v1');
const userEnd = txt.indexOf('--- RAW PAYLOAD');
const userHead = txt.slice(userStart, userEnd).trim();
if (!/상대적으로 센가/.test(system)) throw new Error('6 judgment items missing from SYSTEM');
const out = [
  '/* customer prompt v2 — generated from scripts/' + srcName + ' */',
  '(function (global) {',
  '  var SYSTEM = ' + JSON.stringify(system) + ';',
  '  var USER_HEAD = ' + JSON.stringify(userHead) + ';',
  '  function buildCustomerPrompt(payload) {',
  "    var json = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);",
  "    return SYSTEM + '\\n\\n' + USER_HEAD + '\\n\\n--- RAW PAYLOAD (JSON) ---\\n' + json + '\\n--- END ---';",
  '  }',
  "  global.AiRawTimelinePromptV2 = { version: 'v2.8', SYSTEM: SYSTEM, buildCustomerPrompt: buildCustomerPrompt };",
  '})(typeof window !== \'undefined\' ? window : global);',
  '',
].join('\n');
const dest = path.join(__dirname, '..', 'public', 'js', 'ai-raw-timeline-prompt-v2.js');
fs.writeFileSync(dest, out);
console.log('wrote', dest, 'chars', out.length, 'system', system.length);
