# 라이프코드 단품 — DB · API 명세

경로: **`/lifecode`** (정적 UI)  
인증: **Supabase `lifecode_licenses` 테이블** + **Express `server.js`** (service_role)  
팔자연구소 Supabase **회원 계정과 분리** (접속 코드만 사용).

---

## 1. 환경 변수 (`.env`)

| 변수 | 용도 |
|------|------|
| `SUPABASE_URL` | 기존과 동일 |
| `SUPABASE_SERVICE_ROLE_KEY` | 라이선스 CRUD |
| `LIFECODE_CODE_PEPPER` | 코드 해시용 비밀 문자열 (32자 이상 권장) |
| `LIFECODE_JWT_SECRET` | 접속 세션 JWT 서명 |
| `LIFECODE_ADMIN_SECRET` | 관리 API `Authorization: Bearer …` |
| `NODE_ENV=production` | 쿠키 `Secure` 등 |

선택:

| 변수 | 기본 | 용도 |
|------|------|------|
| `LIFECODE_SESSION_DAYS` | `30` | 세션 JWT·쿠키 유효 일수 |
| `LIFECODE_COOKIE_NAME` | `lifecode_session` | HttpOnly 쿠키 이름 |

---

## 2. DB 스키마

SQL 파일: [`database/lifecode_licenses.sql`](../database/lifecode_licenses.sql)

Supabase SQL Editor에서 실행.

### 2.1 `lifecode_licenses`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid PK | 라이선스 ID (JWT `sub`에 사용) |
| `code_hash` | text UNIQUE | `SHA-256(pepper + normalize(code))` — **평문 코드 미저장** |
| `code_hint` | text | 관리 목록용 (예 `LC-****-7K2M`) |
| `status` | text | `active` \| `revoked` |
| `expires_at` | timestamptz | null = 무기한 |
| `device_id` | text | 바인딩된 기기 ID (클라이언트 UUID) |
| `device_bound_at` | timestamptz | 최초 바인딩 시각 |
| `note` | text | 구매자·주문 메모 |
| `created_at` | timestamptz | 발급 시각 |
| `updated_at` | timestamptz | 트리거 자동 갱신 |
| `last_seen_at` | timestamptz | 마지막 성공 접속 |

**만료 판정 (애플리케이션):**  
`status = 'revoked'` → 거절  
`expires_at IS NOT NULL AND expires_at < now()` → 거절 (DB status는 그대로 `active` 가능)

**계정당 기기 최대 4대 (단품·체험):**

- 로그인 계정에 코드 연결 (`linked_user_id`)
- `account_devices`에 기기 등록 (최대 4) — SQL: `database/account_devices.sql`
- 레거시 `device_id`는 기록용이며 접근 판정에 사용하지 않음
- 관리자 `reset-device` → 라이선스 레거시 필드 초기화

### 2.2 `lifecode_access_log`

| 컬럼 | 설명 |
|------|------|
| `license_id` | FK (삭제 시 null) |
| `event` | 아래 이벤트 코드 |
| `device_id` | 요청 기기 ID |
| `detail` | 짧은 메시지 (선택) |

이벤트: `activate_ok`, `activate_denied_revoked`, `activate_denied_expired`, `activate_denied_device`, `activate_denied_invalid`, `session_ok`, `session_denied`, `logout`, `device_reset`

### 2.3 RLS

정책 없음 → **anon/authenticated 클라이언트는 테이블 접근 불가**.  
모든 읽기/쓰기는 **Express + service_role** 만.

### 2.4 코드 정규화 (서버 공통)

```
normalize(code):
  - trim
  - 대문자
  - 하이픈·공백 제거 후 비교 (표시용 포맷 "LC-XXXX-XXXX" 허용)
code_hash = SHA256( LIFECODE_CODE_PEPPER + normalize(code) )  // hex
```

발급 시 관리 API가 **평문 코드 1회만** 응답 body에 담아 반환 → 이후 DB에는 `code_hash`만 존재.

---

## 3. 클라이언트 기기 ID

- 최초 방문 시 `crypto.randomUUID()` 생성
- `localStorage` 키: `lifecode_device_id`
- 모든 `activate` / 세션 검증 시 동일 값 전송
- 홈 화면 PWA·일반 브라우저 **같은 origin·같은 storage**면 동일 기기로 취급

---

## 4. 세션 (접속 유지)

- 성공 `activate` 후 HttpOnly 쿠키 `lifecode_session`
- JWT payload 예시:

```json
{
  "sub": "<license uuid>",
  "did": "<device_id>",
  "iat": 1710000000,
  "exp": 1712592000
}
```

- `/lifecode/app/`(또는 분석 페이지) 진입 전 `GET /api/lifecode/session` 또는 미들웨어에서 JWT 검증
- JWT의 `did` ≠ 요청 헤더/쿠키 컨텍스트의 `deviceId` → 세션 무효

---

## 5. API 목록

Base: 동일 호스트 (`server.js`).  
Content-Type: `application/json` (POST/PATCH body).

### 5.1 사용자 API (인증: 세션 쿠키)

#### `POST /api/lifecode/activate`

접속 코드로 기기 바인딩 및 세션 발급.

**Body**

```json
{
  "code": "LC-ABCD-EF12",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**성공 `200`**

```json
{
  "ok": true,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "licenseId": "uuid"
}
```

+ `Set-Cookie: lifecode_session=…; HttpOnly; Path=/; SameSite=Lax; Max-Age=…`

**실패**

| HTTP | `error` | 설명 |
|------|---------|------|
| 400 | `invalid_request` | code/deviceId 누락·형식 오류 |
| 401 | `invalid_code` | 코드 없음 |
| 403 | `revoked` | 차단됨 |
| 403 | `expired` | 만료 |
| 403 | `device_mismatch` | 다른 기기에 이미 바인딩 |
| 500 | `server_error` | DB/설정 오류 |

---

#### `GET /api/lifecode/session`

현재 쿠키 세션 유효 여부. 분석 페이지 가드용.

**Query (선택):** `deviceId` — 쿠키 JWT의 `did`와 일치 검증

**성공 `200`**

```json
{
  "ok": true,
  "licenseId": "uuid",
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "bound": true
}
```

**실패 `401`**

```json
{ "ok": false, "error": "no_session" | "expired" | "revoked" | "device_mismatch" }
```

성공 시 `last_seen_at` 갱신 (과도한 호출 방지: 예 5분에 1회만 PATCH).

---

#### `POST /api/lifecode/logout`

쿠키 삭제.

**성공 `200`:** `{ "ok": true }`

---

### 5.2 관리 API (인증: `Authorization: Bearer <LIFECODE_ADMIN_SECRET>`)

관리 UI: `/lifecode/admin.html` (또는 `/lifecode/admin/`).

#### `GET /api/lifecode/admin/licenses`

목록·검색.

**Query**

| 파라미터 | 설명 |
|----------|------|
| `status` | `active` \| `revoked` \| `all` (기본 `all`) |
| `q` | `note`, `code_hint` 부분 일치 |
| `limit` | 기본 50, 최대 200 |
| `offset` | 페이지네이션 |

**성공 `200`**

```json
{
  "items": [
    {
      "id": "uuid",
      "codeHint": "LC-****-EF12",
      "status": "active",
      "expiresAt": "2026-12-31T23:59:59.000Z",
      "deviceBound": true,
      "deviceBoundAt": "2026-05-01T10:00:00.000Z",
      "note": "홍길동",
      "createdAt": "...",
      "lastSeenAt": "..."
    }
  ],
  "total": 120
}
```

---

#### `POST /api/lifecode/admin/licenses`

코드 발급.

**Body**

```json
{
  "code": "LC-ABCD-EF12",
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "note": "홍길동 / 카톡결제"
}
```

- `code` 생략 시 서버가 `LC-` + 랜덤 8자 생성
- `expiresAt` 생략 → 무기한

**성공 `201`**

```json
{
  "id": "uuid",
  "code": "LC-ABCD-EF12",
  "codeHint": "LC-****-EF12",
  "expiresAt": "...",
  "note": "..."
}
```

`code`는 **이 응답에서만** 평문 노출.

---

#### `GET /api/lifecode/admin/licenses/:id`

단건 상세 (+ 최근 로그 20건).

---

#### `PATCH /api/lifecode/admin/licenses/:id`

만료·메모·상태 수정.

**Body (부분 업데이트)**

```json
{
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "note": "연장",
  "status": "active"
}
```

`expiresAt: null` → 무기한.

---

#### `POST /api/lifecode/admin/licenses/:id/revoke`

`status` → `revoked` (차단).

**성공 `200`:** `{ "ok": true, "status": "revoked" }`

---

#### `POST /api/lifecode/admin/licenses/:id/unrevoke`

`status` → `active`.

---

#### `POST /api/lifecode/admin/licenses/:id/reset-device`

`device_id`, `device_bound_at` null + 로그 `device_reset`.  
다른 기기에서 재등록 가능.

---

#### `DELETE /api/lifecode/admin/licenses/:id`

라이선스 행 삭제 (로그는 `license_id` null 유지).

---

#### `GET /api/lifecode/admin/licenses/:id/logs`

**Query:** `limit` (기본 50)

접속 로그 목록.

---

### 5.3 정적 경로 (구현 예정)

| 경로 | 파일 | 역할 |
|------|------|------|
| `/lifecode/` | `public/lifecode/index.html` | 코드 입력·PWA manifest 링크 |
| `/lifecode/app/` | `public/lifecode/app.html` 또는 `analysis.html` 래퍼 | 세션 가드 후 라이프코드 UI |
| `/lifecode/admin/` | `public/lifecode/admin.html` | 관리자 (admin secret 입력·API 호출) |
| `/lifecode/manifest.webmanifest` | PWA | 홈 화면 추가 |

`server.js` SPA fallback은 `/lifecode/*` 를 해당 HTML로내도록 **정적 라우트를 catch-all보다 앞에** 배치.

---

## 6. 구현 순서 (권장)

1. Supabase에 `lifecode_licenses.sql` 실행  
2. `.env`에 pepper / JWT / admin secret 추가  
3. `server.js` — hash·JWT 헬퍼 + §5 API  
4. `public/lifecode/index.html` — activate + deviceId  
5. `public/lifecode/app.html` — session 가드 후 기존 분석 로직 로드  
6. `public/lifecode/admin.html` — 관리 API 연동  
7. `manifest.webmanifest` + 아이콘  

---

## 7. 보안 메모

- 관리 secret·pepper·JWT secret은 저장소·클라이언트에 넣지 않음.  
- 코드 브루트포스 완화: `activate` rate limit (IP당 분당 10회 등) — 구현 시 `express-rate-limit` 또는 리버스 프록시.  
- 기기 바인딩은 **억제용**이며, 코드 유출 시 우회 가능 → CS는 `revoke` / `reset-device`로 대응.
