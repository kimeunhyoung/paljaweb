# AI 프롬프트 서버 이전 작업 지시서 (Cursor용)

작성: Claude · 2026-10-05

## 1. 목표

화면(브라우저)에서 프롬프트 글을 만들어 `messages`로 보내는 기능을, **서버가 프롬프트를 조립**하도록 바꾼다.

- 브라우저: 차트·숫자 계산은 지금처럼 하고, **계산된 데이터만 `payload`로** 보낸다.
- 서버: `payload`를 검사한 뒤, 지금 화면 코드와 **글자 하나까지 같은 프롬프트**를 만든다.
- 이미 쓰는 방식이 있으니 그대로 따른다: `astro`, `astro_*`, `counselor_*`, `tarot_reading*`는 `lib/ai-usage.js`에서 `payload` → `build…CachedMessages()`로 처리하고 있다.

## 2. 꼭 지킬 원칙

1. **결제된 저장 결과를 잃지 않는다.** 서버 저장 키는 `hashCacheKey(feature, cacheKey)`이고, `cacheKey`는 지금 화면에서 프롬프트 글로 만든다. 그래서 이전한 기능은 서버가 **같은 식으로 cacheKey를 다시 계산**해야 한다. 화면이 보낸 cacheKey는 쓰지 않는다.
   - `PaljaAiQuota.hashKey`(public/js/ai-quota-client.js 45행, djb2 변형)를 서버에 **그대로** 옮겨 쓴다.
   - 버전 접두어(`v3:year:`, `v2:couple:`, `raw_v47`, `v8`, `v1:` 등)는 **절대 바꾸지 않는다.** 바꾸면 고객이 다시 결제하게 된다.
2. **프롬프트가 완전히 같아야 한다.** 화면 함수를 옮긴 뒤, 같은 입력으로 화면 쪽 결과와 서버 쪽 결과를 `===`로 비교하는 테스트를 기능마다 만든다(아래 5장). 다르면 배포하지 않는다.
3. **옛 방식은 잠시 열어 둔다.** 배포 직후에는 브라우저에 옛 화면 코드가 남아 있을 수 있다. 이전한 기능도 `messages`로 오면 지금처럼 받아 준다(기존 `checkClientMessages` 유지). 6단계에서 닫는다.
4. **payload 검사:** 타입·길이·배열 개수 상한을 둔다. 이름·장소·질문처럼 사용자가 쓴 글은 길이를 자르고(예: 이름 40자, 추가 요청 300자), 프롬프트에 넣을 때 줄바꿈과 「[」「]」「---」 같은 구분 기호를 정리한다.
5. **건드리지 말 것:**
   - `scripts/_gen_counselor_ai_prompts.js`는 실행하지 않는다. 수정된 상담사 프롬프트를 덮어쓴다.
   - 기존 payload 기능(`astro`, `counselor_*`, `tarot_reading*`)의 동작과 저장 키는 바꾸지 않는다.
   - 5년 흐름의 완성 검사·이어쓰기 로직(`isTimelineCustomerOutputComplete`, `cacheKeyRaw`)은 그대로 둔다.

## 3. 대상 기능과 저장 키 식

| 단계 | feature | 화면 위치 | 프롬프트 함수 | 지금 cacheKey 식 (서버가 똑같이 재현) |
|---|---|---|---|---|
| 1 | astro_year | astrology.html | `buildYearAiPrompt` + `appendChartContextLines` | ``hashKey(`v3:year:${yKey}:` + prompt)``, yKey = 올해 연도 |
| 1 | astro_transit (fast/slow) | astrology.html | `buildTransitAiPrompt(mode)` | `hashKey(cacheRaw)`, cacheRaw = `transitAiCacheRaw(mode)`. 이 값이 없을 때만 `` `v6:${mode}:fallback:` + prompt.slice(0,120) `` |
| 2 | astro_couple | astrology-couple.html | `buildAiPrompt` | `hashKey('v2:couple:' + prompt)` |
| 3 | numerology_daily / numerology_monthly | js/numerology-calendar.js | `buildDailyAiPrompt` / `buildMonthlyAiPrompt` | ``hashKey(`v1:${mode}:${baseKey}:${birthDate}:${prompt}`)`` |
| 4 | name_opinion | name.html | `callAI` 안의 템플릿 | `hashKey(prompt)` |
| 4 | name_recommend | name.html | `buildRecommendPrompt` | `hashKey('v2:' + prompt)` |
| 5 | astro_timeline | astrology.html + js/ai-raw-timeline-v1.js + js/ai-raw-timeline-prompt-v2.js | `buildAiRawTimelineCustomerPrompt` | `hashKey(cacheKeyRaw + ':' + prompt.slice(0,400))`, cacheKeyRaw = `` `${prefix}:timeline:${stamp}:${fromYm}:${toYm}` `` 또는 `…:60m`. prefix `raw_v47`/`v8`. cacheKeyRaw도 같이 보냄 |
| 5 | astro_timeline_topic | astrology.html | `buildAiRawTimelineTopicPrompt` | `hashKey(cacheKeyRaw + ':' + prompt.slice(0,400))`, cacheKeyRaw = `timelineCacheKey()+':topic:'+topicId+':tp1'` |

화면에서 숨겨져 있어 제외: `astro_life_timeline`(카드 hidden), analysis.html의 AI 종합·오늘 메시지(`?ai=on` 전용).

## 4. 단계별 작업 순서 (단계마다 따로 배포)

각 단계에서 할 일:

1. 화면 함수에서 **글을 만드는 부분만** 떼어 `lib/<영역>-ai-prompts.js`에 옮긴다(예: `lib/astro-flow-ai-prompts.js`). 입력은 순수 데이터 객체 하나로 받게 정리한다.
2. 화면은 같은 데이터 객체를 `payload`로 보낸다(`messages` 대신). 화면 저장 키 식은 남겨 두어도 되지만, 서버는 그 값을 쓰지 않는다.
3. `lib/ai-usage.js`의 feature 분기에 추가한다:
   - `resolvedMessages = build…Messages(feature, payload)`
   - `cacheKey = <3장 식을 서버에서 재현>`
   - `cacheKeyRaw`가 필요한 기능(5단계)은 서버가 직접 만든 값을 `timelineCompleteKey`로 쓴다.
4. 5장의 동일성 테스트를 통과시킨다.
5. 화면 파일의 스크립트 버전(`?v=`)을 올린다. 화면 파일과 서버 파일을 **같이** 푸시하고 서버를 다시 배포한다.
6. 배포 후 그 기능을 한 번 실행한다. **이미 결과를 본 차트로 다시 열었을 때 크레딧이 차감되지 않는지** 확인한다.

단계: 1) 올해 운세 + 트랜짓 → 2) 궁합 → 3) 수비학 달력 → 4) 네임코드 → 5) 5년 흐름 + 주제별 → 6) 옛 방식 닫기.

6단계(닫기): 이전한 feature는 `messages`만 오면 400(`code: 'client_messages_retired'`)을 돌려준다. 이렇게 하면 `checkClientMessages` 경로는 쓰이지 않는다. 최소 1~2주 지난 뒤에 한다.

## 5. 동일성 테스트 방법

- 테스트용 입력 데이터를 기능마다 3~5개 준비한다(마스터 수, 이름 없음, 긴 이름, 달 경계 날짜 등). 화면에서 콘솔로 `JSON.stringify(payload)`를 찍어 저장하면 된다.
- 같은 입력으로 다음 두 가지를 만든다.
  - (가) 옛 화면 함수가 만든 프롬프트. jsdom이나 vm으로 화면 함수를 불러와 실행한다.
  - (나) 서버 함수가 만든 프롬프트
- `prompt === serverPrompt`와 `hashKey(옛 식) === 서버 cacheKey`를 확인한다.
- `scripts/test-ai-prompt-parity.js`로 남겨서 `node`로 돌릴 수 있게 한다.

## 6. 참고: 이미 반영된 것

- name.html의 AI 종합 의견은 분석 후 자동으로 실행하지 않는다. 「AI 종합 의견 받기 (1크레딧)」 버튼을 눌러야 실행된다(2026-10-05). 서버 `name_opinion` 비용(`FEATURES.name_opinion.cost`)을 바꾸면 name.html의 `NAME_AI_COST`도 같이 바꾼다.
- 서버는 `pickAllowedModel`로 모델을 정하고, `CLIENT_MESSAGES_MAX_CHARS`(160000)로 크기를 제한한다.
