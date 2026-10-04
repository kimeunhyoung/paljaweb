/**
 * Step1 동일성 테스트: 올해 운세·트랜짓 서버 프롬프트/캐시키
 * 실행: node scripts/test-ai-prompt-parity.js
 */
const assert = require('assert');
const flow = require('../lib/astro-flow-ai-prompts');

const yearPayload = {
  yearKey: '2026',
  chartLines: [
    '[출생 차트]',
    '이름: 홍길동',
    '태양: 양 / 달: 게 / 상승궁: 사자',
    '행성 배치:',
    ' - 태양: 양 / 1하우스',
    ' - 달: 게 / 4하우스',
    '원소 균형: 불 3, 흙 1, 바람 1, 물 2',
    '모달리티: 활동 2, 고정 2, 변통 2',
    '주요 어스펙트: 태양 삼각 목성, 달 충 토성',
  ],
  yearLines: [
    '[올해 운세 · 프로그레션 & 솔라 리턴 · 2026년]',
    '적용 기간: 2026.4.7 생일부터 다음 생일 전까지 1년 (지금 이 기간 안에 있어요). 「올해」는 이 1년을 뜻해요.',
    '프로그레션(만 47세): 태양 쌍둥이 · 달 물병',
    '솔라 리턴 상승궁: 천칭 · 솔라 리턴 중천(MC): 게',
    '솔라 리턴 태양: 7하우스 (올해 핵심 무대)',
    '솔라 리턴 달: 물고기 / 6하우스 (올해 마음이 쏠리는 곳)',
    '솔라 리턴 각진 하우스(1·4·7·10) 행성 — 올해 겉으로 크게 드러나는 힘: 금성(1), 화성(10)',
    '',
    '[올해 시기 데이터 — 프로그레션 이벤트]',
    ' - 2026-06 프로그레션 달 물병 진입',
  ],
};

const transitFastPayload = {
  mode: 'fast',
  aspectKey: 'fp1|fp2|fp3',
  dstr: '2026.10.5',
  stamp: '1979|4|7|12|0|0|37.5|127.0|홍길동',
  chartLines: yearPayload.chartLines.slice(),
  transitLines: [
    '[이번 주 트랜짓 · 10.5~10.11]',
    '오늘 달 위치(하루짜리 참고): 달 전갈 14°',
    '빠른 행성 트랜짓 (오차 작은 순):',
    ' - 금성 충 카이런 · 지금 위치: 내 7하우스 · 영향 ~3일 [관련:연애]',
    ' - 수성 삼각 목성 · 지금 위치: 내 3하우스 · 영향 ~5일 [관련:배움]',
    '',
    '[이번 주 정점일 — 이 날짜만 쓰세요]',
    ' - 10/7 금성 충 카이런 정확',
  ],
};

function checkYear() {
  const prompt = flow.buildYearAiPrompt(yearPayload);
  assert.ok(prompt.includes('[출생 차트]'), 'year has chart');
  assert.ok(prompt.includes('## 0. 3초 브리핑 노트'), 'year has briefing');
  assert.ok(prompt.includes('[올해 시기 데이터'), 'year has timing');
  assert.ok(prompt.indexOf('[출생 차트]') > 200, 'instructions before chart');
  const key = flow.resolveAstroFlowCacheKey('astro_year', yearPayload);
  const expect = flow.clientHashKey('v3:year:2026:' + prompt);
  assert.strictEqual(key, expect, 'year cacheKey formula');
  const msgs = flow.buildAstroFlowCachedMessages('astro_year', yearPayload);
  assert.strictEqual(msgs[0].role, 'user');
  console.log('OK astro_year', 'promptChars=', prompt.length, 'cacheKey=', key);
}

function checkTransit() {
  const prompt = flow.buildTransitAiPrompt(transitFastPayload);
  assert.ok(prompt.includes('이번 주'), 'transit fast wording');
  assert.ok(prompt.includes('[이번 주 정점일'), 'transit peaks');
  const raw = flow.resolveTransitCacheRaw(transitFastPayload);
  assert.strictEqual(
    raw,
    'v6:fast:fp1|fp2|fp3:2026.10.5:1979|4|7|12|0|0|37.5|127.0|홍길동',
  );
  const key = flow.resolveAstroFlowCacheKey('astro_transit', transitFastPayload);
  assert.strictEqual(key, flow.clientHashKey(raw), 'transit cacheKey');
  console.log('OK astro_transit', 'promptChars=', prompt.length, 'cacheKey=', key);
}

function checkSanitize() {
  const dirty = {
    yearKey: '2026',
    chartLines: ['[출생 차트]', '이름: A\nB<script>', '태양: 양'],
    yearLines: ['[올해 운세 · 프로그레션 & 솔라 리턴 · 2026년]', 'line'],
  };
  const prompt = flow.buildYearAiPrompt(dirty);
  assert.ok(!prompt.includes('\nB<script>'), 'newline stripped from name line');
  assert.ok(prompt.includes('이름: A B<script>'), 'collapsed to spaces');
  console.log('OK sanitize');
}

checkYear();
checkTransit();
checkSanitize();

const couple = require('../lib/astro-couple-ai-prompts');
function checkCouple() {
  const payload = {
    nameA: '김은형',
    nameB: '홍길동',
    dataLines: [
      '[김은형]',
      ' - 태양: 염소 3° / 1하우스',
      ' - 달: 게 12° / 7하우스',
      ' - 상승궁: 염소',
      '[홍길동]',
      ' - 태양: 양 10° / 5하우스',
      ' - 달: 사자 2° / 9하우스',
      ' - 상승궁: 사자',
      '',
      '[시너스트리 각 — 오차 작은 순]',
      ' - 김은형 금성 삼각 홍길동 화성 (오차 1.2°)',
      '',
      '[하우스 겹침]',
      ' - 김은형의 행성이 홍길동의 하우스에: 금성→7하우스',
    ],
  };
  const prompt = couple.buildCoupleAiPrompt(payload);
  assert.ok(prompt.includes('김은형 님은 홍길동 님에게서'), 'names in instructions');
  assert.ok(prompt.includes('[시너스트리 각'), 'has synastry');
  assert.ok(prompt.includes('## 관계를 키우는 법'), 'has sections');
  const key = couple.resolveCoupleCacheKey(payload);
  const { clientHashKey } = require('../lib/astro-flow-ai-prompts');
  assert.strictEqual(key, clientHashKey('v2:couple:' + prompt), 'couple cacheKey');
  const msgs = couple.buildCoupleCachedMessages(payload);
  assert.strictEqual(msgs[0].role, 'user');
  console.log('OK astro_couple', 'promptChars=', prompt.length, 'cacheKey=', key);
}
checkCouple();

console.log('All parity checks passed.');
