# 8CODE 수비학 Lite · 토스 등록 가이드

| 항목 | 값 |
|------|-----|
| 콘솔 appName | `lifecodelite` (`granite.config.ts`와 동일) |
| 표시 이름 | **수비학 Lite** (`granite.config.ts` displayName과 콘솔 앱 이름 동일해야 함) |
| 이번 버전 | **0.1.3** |
| 딥링크 | `intoss://lifecodelite` |

---

## ★ v0.1.3 — 광고 연결

상단 배너 + 「나의 수비학 확인하기」전면 광고.

1. **먼저** `public/lifecode-play/app.js` 를 **8code.kr(Render 등)에 배포**  
   (전면 광고는 iframe이 `8code.kr` 를 불러서, 사이트 배포 없으면 전면만 안 뜸)
2. PowerShell:

```powershell
cd "b:\앱설계\라이프코드내꺼\paljaweb\toss-lifecode"
npm run release
```

3. 콘솔 → **앱 출시 → 버전 등록** → 새 `lifecodelite.ait` · 버전 **0.1.3**

### 메모 (복사용)

```
v0.1.3
- 상단 배너·확인하기 전면 광고 연결
- 동일 생년월일 10분 내 재조회 시 전면 스킵
```

광고 ID: 배너 `ait.v2.live.dba17bf3f3234811` / 전면 `ait.v2.live.c9265b6a59f84ea8`

---

## A. 최초 1회 (신규 앱)

1. [앱인토스 콘솔](https://developers-apps.in-toss.toss.im/) → **새 앱 만들기**
2. appName: **`lifecodelite`** (변경 시 `granite.config.ts`도 같이)
3. 아이콘 업로드 → 아이콘 **링크 복사** → `brand-icon.url`에 한 줄 저장  
   (예시는 `brand-icon.url.example`)
4. 카테고리·소개 문구: 오락·자기성찰 수비학 Lite / 심화는 8code.kr

## B. 빌드 · 업로드

```bash
cd toss-lifecode
npm install
npm run release
```

콘솔 → **개발 → 앱 출시 → 버전 등록하기** → 출력된 `.ait` 업로드 · 버전 `0.1.0`

### 변경 내용 (복사용)

```
v0.1.0
- 8CODE 수비학 Lite 최초 등록
- 생년월일·이름 핵심 수 계산
- 심화 분석은 8code.kr로 연결
```

## C. 확인

- 샌드박스/미리보기에서 Lite 계산 동작
- 「수비학 심화 보기」「전체 서비스」→ 8code.kr 이동
- AdSense가 안 뜨는지 (`source=toss`)

짧은 체크: [UPLOAD.md](./UPLOAD.md)
