# 이메일 인증 리마인드 (cron)

가입 후 약 20~30시간이 지났는데도 이메일 인증이 안 된 회원에게 리마인드 메일을 보냅니다.

## Render 환경변수

| Key | 설명 |
|-----|------|
| `CRON_SECRET` | cron 호출 인증 (구독 갱신 cron과 동일) |
| `RESEND_API_KEY` | 이미 있으면 그대로 |
| `USER_EMAIL_FROM` | 예: `팔자연구소 <hello@8code.kr>` |
| `VERIFY_REMIND_ENABLED` | 끄려면 `false` (기본: 메일 설정 있으면 ON) |

## Render Cron Job 추가

1. Render Dashboard → **Cron Jobs** → New Cron Job  
2. 또는 외부 cron (cron-job.org 등)에서 매일 1회:

```http
POST https://8code.kr/api/cron/verify-remind
Authorization: Bearer <CRON_SECRET>
```

권장 스케줄: `0 10 * * *` (매일 10:00 UTC 또는 KST에 맞게 조정)

## 테스트 (dry run)

```http
POST https://8code.kr/api/cron/verify-remind?dryRun=1
Authorization: Bearer <CRON_SECRET>
```

실제 발송 없이 대상 이메일 목록만 반환합니다.

## 동작

- Supabase Auth 사용자 중 `email_confirmed_at` 없음
- 가입 후 20~30시간 사이
- OAuth 더미 메일(`@oauth.8code.kr`) 제외
- Resend/SMTP로 리마인드 발송
