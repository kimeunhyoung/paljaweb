# Raw timeline AI — feature-flag wire (2026-08)

## What was wired
- Builder (browser): `public/js/ai-raw-timeline-v1.js` (= compression v1.2)
- Prompt (browser): `public/js/ai-raw-timeline-prompt-v2.js` (= customer v2.1 대화체)
  - Source: `scripts/_prompt_ai_raw_timeline_customer_v2.txt`
  - Regenerate: `node scripts/_gen_ai_raw_timeline_prompt_js.js`
- Hook: `public/astrology.html` → `buildTimelineAiPrompt()` / `callTimelineAi`
- UI: `#timelineRawSignalCal` — 중요한 시기 미리보기 (일상어, flag ON일 때만)
- Same credit feature: `astro_timeline` (unchanged)
- V3 score engine + timeline UI: **unchanged** (보조 경로)

## How to enable

**Default ON** for all users (`AI_RAW_TIMELINE_V1_FORCE = true` in astrology.html).

Disable for testing:
1. URL: `astrology.html?rawTimeline=0`
2. Or DevTools: `localStorage.setItem('palja:aiRawTimelineV1','0')` then reload

Re-enable after test: remove query / `localStorage.removeItem('palja:aiRawTimelineV1')`

## QA checklist
1. v2.1 대화체 applied when flag on (보고서·표·행성명 금지)
2. Multiple birth dates on live site
3. `unknownTime=true` → no House/ASC/MC/progMoon house talk
4. Quiet charts → no forced events
5. Signal calendar matches top `transitEpisodes` (not V3 themes)
6. Result length / readability on phone

## Cache
Flag on uses cache prefix `raw_v21:` (separate from `v7:` and old `raw_v2:`/`raw_v13:`).

## Samples
- F: `scripts/_sample_customer_reading_F_v2.txt`
- TEEN: `scripts/_sample_customer_reading_TEEN_v2.txt`
