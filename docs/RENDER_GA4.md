# Render 환경변수 — GA4 (Google Analytics)

가입·분석·결제 퍼널을 숫자로 보려면 GA4 측정 ID를 Render에 넣으면 됩니다.  
코드는 이미 `/api/site-config` → `public/js/analytics.js` 로 연결되어 있습니다.

## 1) GA4에서 측정 ID 만들기

1. [https://analytics.google.com](https://analytics.google.com) 접속
2. **관리(톱니바퀴)** → **속성 만들기** (또는 기존 속성)
3. **데이터 스트림** → **웹** → URL `https://8code.kr`
4. 스트림 생성 후 **측정 ID** 복사 (`G-XXXXXXXXXX` 형식)

## 2) Render에 변수 추가

1. [https://dashboard.render.com](https://dashboard.render.com) → 팔자연구소 웹 서비스
2. **Environment** → **Add Environment Variable**

| Key | Value 예시 |
|-----|------------|
| `GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` |

3. **Save Changes** → 재배포 대기

변수를 **안 넣으면** GA는 로드되지 않습니다(오류 없음).

## 3) 동작 확인

1. 배포 후 `https://8code.kr/` 접속
2. 브라우저 개발자도구 → Network에서 `gtag/js?id=G-` 요청 확인  
   또는 GA4 **실시간** 보고서에서 본인 방문 확인
3. 주요 이벤트(코드에 이미 심어 둠):
   - `signup_start` / `signup_complete`
   - `analysis_complete`
   - `guest_signup_prompt`
   - `checkout_start` / `subscribe_success`
   - `onboarding_complete`

## 4) 관련 파일

- `server.js` — `GET /api/site-config` → `{ gaMeasurementId }`
- `public/js/analytics.js` — GA 스크립트 로드 + `PaljaAnalytics.track()`
- `public/js/site-topbar.js` — 탑바 페이지에 analytics 자동 삽입

## 환영 메일과 함께 쓸 때

| Key | 용도 |
|-----|------|
| `GA_MEASUREMENT_ID` | 퍼널 측정 |
| `RESEND_API_KEY` | 환영 메일 (고객) |
| `USER_EMAIL_FROM` | 환영 메일 발신 주소 |

환영 메일 설정: [`RENDER_WELCOME_EMAIL.md`](./RENDER_WELCOME_EMAIL.md)
