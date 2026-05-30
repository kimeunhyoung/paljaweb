# 타로코드 · 토스 버전 등록

## 현재 버전

| 항목 | 값 |
|------|-----|
| npm `version` | **0.2.0** |
| 콘솔 appName | `tarotcode` |
| 변경 요약 | 오늘 **1장** 기본 · **한눈에 보기** · 상세 접이식 |

콘솔 **버전 설명** 예시 (복사용):

```
v0.2.0
- 토스: 오늘 1장 리딩 (빠른 진입)
- 한눈에 보기: 수비학·카드 한줄 요약
- 상세 리딩: 설명·현실 조언 접이식
- 새 리딩 시 전면 광고 (설정 시)
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

## 3. 콘솔 업로드

1. 앱인토스 콘솔 → **개발** → **앱 출시** → **버전 등록하기**
2. 출력된 `tarotcode.ait` (또는 `*.ait`) 선택
3. **버전 번호** / **변경 내용**에 위 표 참고해 입력
4. 검수 제출

## 4. 샌드박스 확인

```bash
npm run dev
```

토스 샌드박스에서 `intoss://tarotcode` 로 열어 **생년월일 → 오늘 1장 → 펼치기 → 한눈에 보기** 흐름을 확인하세요.

## 주의

- `.ait` 번들은 **번들 안 `public/Tarot.html`** 을 사용합니다 (`npm run sync` 로 최신 반영).
- `paljaweb.onrender.com` 은 웹 미리보기용이며, 토스 출시본과 다를 수 있습니다.
- **테스트** 광고 그룹 ID는 출시 `.ait` 에 넣지 마세요.
