# 타로코드 · 토스 버전 등록

## 현재 버전

| 항목 | 값 |
|------|-----|
| npm `version` | **0.2.2** |
| 콘솔 appName | `tarotcode` |
| 변경 요약 | flow-box 한눈에 보기 · 10모드 통일 · 토스 UI 정리 |

콘솔 **버전 설명** 예시 (복사용):

```
v0.2.2
- ✦ 한눈에 보기 / 상세 리딩 섹션 통일
- flow-box 연결 흐름 (질문 3장 · 데일리 5장 · 월간 3장 · 올해 5장)
- 데일리: 힘이 되는 에너지 / 오늘의 주의점
- 중복 제목·안내 문구 제거, 토스 여백·배지 정리
```

## 1. 사전 준비 (최초 1회)

1. [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/) 에 앱 **tarotcode** 생성
2. `brand-icon.url.example` → `brand-icon.url` 복사 후 **콘솔 아이콘 HTTPS URL** 한 줄 입력  
   (또는 `.env` 에 `TOSS_BRAND_ICON_URL=...`)
3. `cd toss-tarot && npm install`

## 2. .ait 빌드

```bash
cd toss-tarot
npm run release
```

또는:

```bash
npm run sync
npm run build
npm run ait:path
```

마지막 명령이 **업로드할 `.ait` 파일 전체 경로**를 출력합니다.

빌드 후 `toss-tarot/public/Tarot.html` 에 `tarot-bundle-version` 메타가 **0.2.2** 인지 확인하면 sync 반영 여부를 검증할 수 있습니다.

## 3. 콘솔 업로드

1. 앱인토스 콘솔 → **개발** → **앱 출시** → **버전 등록하기**
2. 출력된 `tarotcode.ait` (또는 `*.ait`) 선택
3. **버전 번호** `0.2.2` / **변경 내용**에 위 블록 입력
4. 검수 제출

단계별 체크리스트: [UPLOAD.md](./UPLOAD.md)

## 4. 샌드박스 확인

```bash
npm run dev
```

토스 샌드박스에서 `intoss://tarotcode` 로 열어 아래를 확인하세요.

- 생년월일 → **데일리** 5장 → **✦ 한눈에 보기** (flow-box + 힘/주의)
- **질문** (예: 사랑) 3장 → flow-box
- (선택) 이번 달 3장, 올해 5장

## 주의

- `.ait` 번들은 **번들 안 `public/Tarot.html`** 을 사용합니다 (`npm run sync` 로 최신 반영).
- `paljaweb.onrender.com` 은 웹 미리보기용이며, 토스 출시본과 다를 수 있습니다.
- **테스트** 광고 그룹 ID는 출시 `.ait` 에 넣지 마세요.
- 출시 빌드에 `VITE_TAROT_PAGE_URL`(원격 Render)을 넣지 마세요.
