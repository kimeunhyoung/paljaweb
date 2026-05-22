/**
 * 팔자연구소 · 48궁합 — 관계 유형 20종 설명 (Node)
 * 원본: public/js/period48-relationship-types.js
 *
 * 사용법:
 *   const { COMPAT_DESCRIPTIONS } = require('./compat-descriptions');
 *   const desc = COMPAT_DESCRIPTIONS[13];
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcPath = path.join(__dirname, '../public/js/period48-relationship-types.js');
const src = fs.readFileSync(srcPath, 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);

const COMPAT_DESCRIPTIONS = sandbox.window.COMPAT_DESCRIPTIONS;

module.exports = { COMPAT_DESCRIPTIONS };
