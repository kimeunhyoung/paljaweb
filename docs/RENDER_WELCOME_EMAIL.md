# Render 환경변수 — 환영 메일

신규 가입 시 **고객에게** 환영 메일을 보내려면 Resend(또는 SMTP)가 필요합니다.  
관리자 텔레그램 알림과는 별개입니다.

## 1) Resend에서 API 키 발급

1. [https://resend.com](https://resend.com) 가입·로그인
2. **API Keys** → **Create API Key** → 키 복사 (`re_...`)
3. (권장) **Domains**에서 `8code.kr` 도메인 인증 후, 인증된 주소로 발송  
   - 도메인 미인증 시 Resend 테스트 주소만 가능: `onboarding@resend.dev`  
   - 테스트 주소는 **본인 Resend 계정 이메일로만** 발송되는 제한이 있을 수 있음

## 2) Render에 변수 추가

1. [https://dashboard.render.com](https://dashboard.render.com) 접속
2. 팔자연구소 웹 서비스(예: `paljaweb` / `8code`) 클릭
3. 왼쪽 **Environment**
4. **Add Environment Variable** 로 아래를 추가한 뒤 **Save Changes**  
   (저장 시 자동 재배포되는 경우가 많음)

| Key | Value 예시 | 필수 |
|-----|------------|------|
| `RESEND_API_KEY` | `re_xxxxxxxx` (Resend에서 복사한 키) | ✅ 환영 메일·관리자 메일용 |
| `USER_EMAIL_FROM` | `팔자연구소 <hello@8code.kr>` | 권장 (도메인 인증 후) |
| `SIGNUP_NOTIFY_EMAIL_FROM` | `팔자연구소 <hello@8code.kr>` | 선택 (관리자 메일 From, USER_EMAIL_FROM 없을 때 폴백) |

### 환영 메일만 끄고 싶을 때

| Key | Value |
|-----|--------|
| `USER_WELCOME_EMAIL` | `false` |

이 변수를 **아예 안 넣으면** → `RESEND_API_KEY`만 있으면 환영 메일이 **켜진 상태**입니다.  
끄려면 `USER_WELCOME_EMAIL=false` 를 **추가**하세요.

### 아직 도메인 인증 전이면

임시로:

```
USER_EMAIL_FROM=팔자연구소 <onboarding@resend.dev>
```

도메인 인증이 끝나면 `팔자연구소 <hello@8code.kr>` 같은 주소로 바꾸세요.  
(`hello@` 는 예시 — Resend에 등록한 발신 주소를 쓰면 됩니다.)

## 3) 동작 확인

1. Render 배포 완료 대기
2. 이메일로 테스트 회원가입
3. Render **Logs**에서 `[signup-notify] welcome email` 검색
4. 가입한 메일함(스팸함 포함) 확인

OAuth(구글/카카오/네이버)만으로 가입한 경우, 실제 이메일이 있으면 발송됩니다.  
네이버 더미(`@oauth.8code.kr`)는 발송하지 않습니다.

## 4) SMTP를 쓰는 경우 (Resend 대신)

`RESEND_API_KEY` 없이 SMTP만 쓸 때:

| Key | 설명 |
|-----|------|
| `SMTP_HOST` | 예: `smtp.gmail.com` |
| `SMTP_PORT` | 예: `587` |
| `SMTP_USER` | SMTP 계정 |
| `SMTP_PASS` | 앱 비밀번호 |
| `USER_EMAIL_FROM` 또는 `SIGNUP_NOTIFY_EMAIL_FROM` | 발신 표시 이름 |

## 이미 있는 관련 변수 (참고)

| Key | 용도 |
|-----|------|
| `SIGNUP_NOTIFY_TELEGRAM_BOT_TOKEN` / `CHAT_ID` | 관리자 텔레그램 (고객 X) |
| `SIGNUP_WEBHOOK_SECRET` | Supabase 가입 웹훅 인증 |
| `AI_CREDIT_ADMIN_EMAILS` | 크레딧·통계 관리자 |
| `GA_MEASUREMENT_ID` | GA4 (선택) — [`RENDER_GA4.md`](./RENDER_GA4.md) |
