# Render Cron — 이메일 인증 리마인드

가입 후 약 20~30시간이 지났는데도 이메일 인증이 안 된 회원에게 리마인드 메일을 보냅니다.

API: `POST https://8code.kr/api/cron/verify-remind`

---

## 1) `CRON_SECRET`이란?

서버가 “아무나 cron을 호출하지 못하게” 막는 **비밀번호**입니다.  
구독 자동갱신(` /api/cron/renew-subscriptions `)과 **같은 값**을 씁니다.

### Render에서 확인·추가

1. [dashboard.render.com](https://dashboard.render.com) → **paljaweb** 웹 서비스
2. **Environment**
3. 목록에 `CRON_SECRET`이 있는지 확인
   - **있으면** → 그 값을 복사해 두세요 (Edit에서 눈 아이콘으로 보기)
   - **없으면** → **Add variable**

| Key | Value |
|-----|--------|
| `CRON_SECRET` | 긴 랜덤 문자열 (예: 비밀번호 생성기로 32자 이상) |

4. **Save, rebuild, and deploy**

이미 구독 갱신 cron을 쓰고 있다면 `CRON_SECRET`은 있을 가능성이 큽니다.

---

## 2) Render에 Cron Job 등록 (권장)

Render의 **Cron Job**은 웹 서비스와 별도 서비스입니다.  
정해진 시간에 `curl`로 우리 API를 한 번 호출합니다.

### 단계

1. Render Dashboard 왼쪽 위 **New +** → **Cron Job**
2. 설정 예시:

| 항목 | 값 |
|------|-----|
| Name | `palja-verify-remind` |
| Region | 웹 서비스와 같게 (예: Singapore / Oregon) |
| Schedule | `0 1 * * *` → **매일 UTC 01:00** = **한국시간 오전 10:00** |
| Command | 아래 참고 |

**Command (한 줄):**

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" "https://8code.kr/api/cron/verify-remind"
```

3. **Environment** 탭에서 Cron Job에도 변수 추가:

| Key | Value |
|-----|--------|
| `CRON_SECRET` | paljaweb 웹 서비스와 **똑같은** 값 |

4. Create Cron Job / Save

### 스케줄 참고 (UTC 기준)

| Cron | 의미 (한국시간) |
|------|----------------|
| `0 1 * * *` | 매일 오전 10:00 |
| `0 0 * * *` | 매일 오전 9:00 |
| `30 2 * * *` | 매일 오전 11:30 |

---

## 3) Render Cron이 안 되면 (무료 대안)

Render 플랜에 Cron Job가 없거나 유료인 경우:

1. [https://cron-job.org](https://cron-job.org) 가입
2. **Create cronjob**
3. URL: `https://8code.kr/api/cron/verify-remind`
4. Method: **POST**
5. Headers:
   - Name: `Authorization`
   - Value: `Bearer 여기에_CRON_SECRET`
6. Schedule: 매일 1회 (예: 10:00)

---

## 4) 동작 확인

### A. 브라우저로는 안 됩니다
주소창 GET은 401이 납니다. **POST + Authorization** 이 필요합니다.

### B. 로컬/PowerShell 테스트

```powershell
$secret = "여기에_CRON_SECRET"
Invoke-RestMethod -Method POST -Uri "https://8code.kr/api/cron/verify-remind?dryRun=1" -Headers @{ Authorization = "Bearer $secret" }
```

- `dryRun=1` → 메일 안 보내고 **대상만** 반환
- `dryRun` 없이 호출 → 실제 발송

### C. 성공 시 응답 예

```json
{ "ok": true, "candidates": 0, "sent": 0, "emails": [], "errors": [] }
```

대상이 없으면 `0`이 정상입니다. (미인증·20~30시간 구간 유저가 없을 때)

### D. Render Logs
웹 서비스 Logs에서 `[verify-remind]` 로그를 확인합니다.

---

## 환경변수 요약

| Key | 어디에 | 용도 |
|-----|--------|------|
| `CRON_SECRET` | **웹 서비스** + **Cron Job** | 호출 인증 |
| `RESEND_API_KEY` | 웹 서비스 | 메일 발송 |
| `USER_EMAIL_FROM` | 웹 서비스 | 발신 주소 |
| `VERIFY_REMIND_ENABLED=false` | 웹 서비스 (선택) | 리마인드만 끄기 |

---

## 이미 있는 다른 cron (참고)

같은 `CRON_SECRET`으로 호출하는 API:

- `POST /api/cron/renew-subscriptions` — 구독 갱신 + 만료된 해지 구독·단품/이용권(`plan` 잔상) free 정리
- `POST /api/cron/counselor-morning-push` — 상담사 푸시
- `POST /api/cron/verify-remind` — 이메일 인증 리마인드 (신규)
