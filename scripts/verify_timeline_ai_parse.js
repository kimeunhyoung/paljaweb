#!/usr/bin/env node
/**
 * 5년 AI 타임라인 파싱·정리 로직 로컬 검증 (API 호출 없음)
 * 실행: node scripts/verify_timeline_ai_parse.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'public/astrology.html'), 'utf8');

function extractTimelineFns() {
  const start = HTML.indexOf('function extractYearsFromHeading');
  const end = HTML.indexOf('function paintTimelineTabView');
  if (start < 0 || end < 0) throw new Error('timeline fn block not found in astrology.html');
  return HTML.slice(start, end);
}

function loadClientApi() {
  const ctx = {
    LAST_AI_RAW_PAYLOAD: { utilizeRecommendations: { items: [{ kind: 'peakUtilize' }] } },
    LAST_TIMELINE: { fromYm: '2026-08', toYm: '2031-07' },
    TIMELINE_AI_FULL_TEXT: '',
    isAiRawTimelineV1Enabled: () => true,
  };
  vm.createContext(ctx);
  vm.runInContext(
    extractTimelineFns() +
      '\nthis.api = {' +
      'cleanTimelineAiText, parseTimelineAiSections, validateTimelineAiCustomerFormat,' +
      'getTimelineTabMarkdown, parseTimelineYearLineMeta, isTimelineYearPeriodStarLine,' +
      'isTimelineScheduleItemLine, getTimelineWindowYears' +
      '};',
    ctx,
  );
  return ctx.api;
}

function loadServerClean() {
  const src = fs.readFileSync(path.join(ROOT, 'lib/ai-usage.js'), 'utf8');
  const chunk = src.slice(
    src.indexOf('function isTimelineCustomerClosingLine'),
    src.indexOf('function shouldPersistAiCache'),
  );
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(chunk + '\nthis.cleanTimelineCustomerText = cleanTimelineCustomerText;', ctx);
  return ctx.cleanTimelineCustomerText;
}

/** 사용자 스크린샷에서 재현한 깨진 AI 출력 */
const SAMPLE_BROKEN = `## 5년 전체 스토리

역할·관계·겉모습이 5년 동안 흔들려요.

## 연도별 해석

**2026년 (2026년 8월~12월)**

2026년 가을(9~11월)부터 변화가 시작돼요.

◆ 2026년 10~12월

겨울에는 한 가지씩 정리하는 편이 나을 수 있어요.

★ **2027년 — 역할·방향·겉모습이 가장 크게 흔들리는 첫 변곡**

2027년은 역할과 겉모습이 함께 흔들려요.

2027년 봄(3~5월)

말하거나 제안하는 일에서 흐름이 부드러워요.

2027년 여름(6~8월)

맡은 역할·책임 쪽에서 범위가 넓어질 수 있어요.

★ **2028년 — 가까운 관계와 역할이 함께 재정비되는 두 번째 변곡**

2028년은 가까운 관계와 맡은 역할을 다시 맞추는 흐름이에요.

◆ **2029년**

2029년 겨울(11~12월) 감정·일상 리듬이 안정돼요.

2030년은 감정·일상의 안정이 자리를 잡고, 가까운 관계와 말·전달 쪽에서 기준이 잡혀요.

2030년 초(1~3월)

감정·일상 쪽에서 리듬을 다시 잡을 수 있어요.

**2031년 (2031년 1~7월)**

2031년 여름(6~7월) 마무리 흐름이에요.

**가까운 관계의 거리·방식을 다시 맞추는 일** — 2026년 8월~2030년 2월

**감정·일상 리듬을 다시 잡는 일** — 2029년 11월~2030년 3월

이 5년 동안 건강과 금전 쪽은 별도로 큰 흐름이 뚜렷하지 않아요.

**말·글·제안·계약으로 전달하는 일** — 2029년 4~6월, 2031년 3~5월

위의 내용이 이 5년 타임라인 해석의 전부예요.

궁금한 부분이 있거나, 특정 시기·주제를 더 깊게 보고 싶다면 말씀해 주세요.

**역할·책임의 범위를 넓히는 일** — 2027년 6~8월
`;

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

const api = loadClientApi();
const serverClean = loadServerClean();

test('◆ 2026년 10~12월 은 연도 헤더가 아님', () => {
  assert(api.isTimelineYearPeriodStarLine('◆ 2026년 10~12월'), 'period star');
  assert(api.parseTimelineYearLineMeta('◆ 2026년 10~12월') === null, 'not year meta');
});

test('★ 2027년 — 부제 는 연도 헤더', () => {
  const m = api.parseTimelineYearLineMeta('★ **2027년 — 역할·방향**');
  assert(m && m.year === '2027' && m.major, '2027 major head');
});

test('clean: 조기 마무리 문장 제거', () => {
  const cleaned = api.cleanTimelineAiText(SAMPLE_BROKEN);
  assert(!/위의 내용이/.test(cleaned), 'no premature closing');
  assert(!/궁금한 부분이/.test(cleaned), 'no ask-more closing');
});

test('clean: 일정 섹션 헤더 자동 삽입', () => {
  const cleaned = api.cleanTimelineAiText(SAMPLE_BROKEN);
  assert(/^##\s+(?:일정|5년 중 언제)/m.test(cleaned), 'schedule header present');
  const idxSched = cleaned.search(/^##\s+(?:일정|5년 중 언제)/m);
  const idx2031 = cleaned.indexOf('**2031년');
  assert(idxSched > idx2031, 'schedule header after last year block');
});

test('clean: 건강·금전 약함 문장은 일정 중간에 없음', () => {
  const cleaned = api.cleanTimelineAiText(SAMPLE_BROKEN);
  const sch = cleaned.match(/^##\s+(?:일정|5년 중 언제)[^\n]*\n([\s\S]*)$/m);
  assert(sch, 'schedule section');
  assert(!/건강과 금전/.test(sch[1]), 'weak note not in schedule body');
  const ov = cleaned.match(/^##\s+(?:5년 전체 스토리|한눈에)[^\n]*\n([\s\S]*?)(?=\n##\s+)/m);
  assert(ov && /건강과 금전/.test(ov[1]), 'weak note in overview');
});

test('parse: 2026 한 덩어리 (10~12월 시기 포함)', () => {
  const cleaned = api.cleanTimelineAiText(SAMPLE_BROKEN);
  const sec = api.parseTimelineAiSections(cleaned);
  const y26 = String(sec.years['2026'] || '');
  assert(/가을\(9~11월\)/.test(y26), '2026 autumn');
  assert(/10~12월/.test(y26), '2026 winter period in same year block');
  assert(Object.keys(sec.yearsHead).filter((y) => y === '2026').length <= 1, 'single 2026 head');
});

test('parse: 2030이 2029와 분리', () => {
  const cleaned = api.cleanTimelineAiText(SAMPLE_BROKEN);
  const sec = api.parseTimelineAiSections(cleaned);
  assert(String(sec.years['2029'] || '').includes('겨울'), '2029 body');
  assert(!String(sec.years['2029'] || '').includes('2030년은'), '2030 not in 2029');
  assert(String(sec.years['2030'] || '').includes('2030년은'), '2030 own block');
});

test('parse: 일정이 2031 연도 본문에 붙지 않음', () => {
  const cleaned = api.cleanTimelineAiText(SAMPLE_BROKEN);
  const sec = api.parseTimelineAiSections(cleaned);
  const y31 = String(sec.years['2031'] || '');
  assert(!/\*\*가까운 관계/.test(y31), 'no schedule in 2031');
  assert(String(sec.schedule || '').includes('가까운 관계'), 'schedule has items');
});

test('tabs: 언제 움직일까 탭에 2031 본문 없음', () => {
  const cleaned = api.cleanTimelineAiText(SAMPLE_BROKEN);
  const sec = api.parseTimelineAiSections(cleaned);
  const schedMd = api.getTimelineTabMarkdown(sec, 'schedule');
  assert(/언제/.test(schedMd), 'schedule tab title');
  assert(!/2031년 여름/.test(schedMd), 'no year narrative in schedule tab');
});

test('format: 윈도우 2026~2031 검증 통과', () => {
  const cleaned = api.cleanTimelineAiText(SAMPLE_BROKEN);
  assert(api.validateTimelineAiCustomerFormat(cleaned), 'validate ok after clean');
});

test('server clean: 조기 마무리 제거 + 일정 헤더', () => {
  const cleaned = serverClean(SAMPLE_BROKEN);
  assert(!/궁금한 부분이/.test(cleaned), 'server strips closing');
  assert(/^##\s+(?:일정|5년 중 언제)/m.test(cleaned), 'server injects schedule header');
});

let passed = 0;
let failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log('  ✓', t.name);
    passed += 1;
  } catch (e) {
    console.error('  ✗', t.name);
    console.error('   ', e.message);
    failed += 1;
  }
}
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
