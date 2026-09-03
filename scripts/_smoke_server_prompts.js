'use strict';
/** Smoke checks for server-side counselor/tarot prompts. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const pages = [
  'public/counselor-reading.html',
  'public/counselor-lenormand.html',
  'public/counselor-iching.html',
  'public/counselor-kirke.html',
  'public/Tarot.html',
];

let failed = 0;
for (const rel of pages) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  const bad = [];
  if (html.includes('core_directives')) bad.push('core_directives');
  if (html.includes('<quality_bar>')) bad.push('quality_bar');
  if (html.includes('content: prompt')) bad.push('content:prompt');
  if (!html.includes('payload: aiPayload')) bad.push('missing payload:aiPayload');
  if (bad.length) {
    failed += 1;
    console.error('FAIL', rel, bad.join(','));
  } else {
    console.log('OK', rel);
  }
}

const counselor = require('../lib/counselor-ai-prompts');
const tarot = require('../lib/tarot-ai-prompts');

const reading = counselor.buildCounselorCachedMessages('counselor_session', {
  displayName: '고객',
  question: '관계가 어떻게 될까?',
  topicLabel: '연애',
  mode: 'advanced',
  readingDepth: 'card',
  spreadId: 'love',
  spreadLabel: '내 마음 · 상대 · 관계',
  cards: [
    { pos: '내 마음', num: 6, name: '연인', rev: false, keywords: '선택' },
    { pos: '상대 마음', num: 3, name: '여황제', rev: true, keywords: '돌봄' },
    { pos: '관계 흐름', num: 16, name: '탑', rev: false, keywords: '붕괴' },
  ],
});
if (!reading[0].content.includes('love3_spread_rule')) {
  console.error('FAIL reading spread rule missing');
  failed += 1;
} else {
  console.log('OK reading spread rule');
}

try {
  counselor.buildCounselorCachedMessages('counselor_session_basic', {
    question: 'q',
    cards: [
      { pos: 'a', num: 1, name: 'n' },
      { pos: 'b', num: 2, name: 'n' },
    ],
  });
  console.error('FAIL expected feature_card_mismatch');
  failed += 1;
} catch (e) {
  console.log('OK feature mismatch', e.message);
}

// Simulate ai-usage gate: messages ignored when payload present
const { buildCounselorCachedMessages } = counselor;
const spoof = buildCounselorCachedMessages('counselor_kirke_basic', {
  displayName: 'K',
  question: '오늘 메시지?',
  topicId: 'general',
  topicLabel: '일반',
  cards: [{ pos: '1장', num: 0, name: '오디세우스', keywords: '여정', guideText: '키워드: 여정' }],
  spread: { title: '한 장', labels: ['메시지'] },
});
if (!spoof[0].content.includes('guidebook_excerpts')) {
  console.error('FAIL kirke guide');
  failed += 1;
} else {
  console.log('OK kirke');
}

const t = tarot.buildTarotReadingCachedMessages('tarot_reading', {
  mode: 'question',
  question: '이직할까?',
  topicLabel: '일',
  cards: [
    { id: 1, name: '마법사', faceRev: false, keywords: '실행', pos: '상황' },
    { id: 8, name: '힘', faceRev: true, keywords: '인내', pos: '조언' },
    { id: 21, name: '세계', faceRev: false, keywords: '완성', pos: '결과' },
  ],
});
if (t[0].content.indexOf('\n\n<context>\n') < 0) {
  console.error('FAIL tarot context marker');
  failed += 1;
} else {
  console.log('OK tarot');
}

// Ensure ai-usage wires the builders
const usage = fs.readFileSync(path.join(root, 'lib/ai-usage.js'), 'utf8');
if (!usage.includes("require('./counselor-ai-prompts')") || !usage.includes("require('./tarot-ai-prompts')")) {
  console.error('FAIL ai-usage wiring');
  failed += 1;
} else {
  console.log('OK ai-usage wiring');
}

if (failed) {
  console.error('FAILED', failed);
  process.exit(1);
}
console.log('ALL SMOKE OK');
