# 8CODE 수비학 Lite · 앱인토스 (toss-lifecode)

Play Store TWA(`/lifecode-play/`)와 같은 Lite 경험을 토스 미니앱으로 올리는 프로젝트입니다.

| 항목 | 값 |
|------|-----|
| 콘솔 appName | `lifecodelite` |
| 표시 이름 | 8CODE 수비학 |
| 본문 URL (기본) | `https://8code.kr/lifecode-play/?source=toss` |
| 딥링크 | `intoss://lifecodelite` |

## Play Store와의 관계

- **Play:** TWA → `?source=play` (AdSense 숨김 → 이후 AdMob)
- **토스:** 미니앱 `.ait` → `?source=toss` (AdSense 숨김 → 토스 배너 광고)
- 둘 다 **같은 Lite 페이지**를 쓰고, 심화 기능은 `8code.kr`로 보냅니다 (사이트 유입).

## 사이트 유입

- Lite 안 CTA·가이드 링크 → `https://8code.kr/...&utm_source=toss`
- 셸 하단 버튼 **「8CODE 전체 서비스 보기」** → 메인 사이트

## 명령어

```bash
cd toss-lifecode
npm install
npm run sync      # public/lifecode-play 복사 (로컬 폴백용)
npm run dev       # granite dev (포트 5174, 타로와 충돌 방지)
npm run release   # sync + build + .ait 경로 출력
```

등록: [TOSS_REGISTER.md](./TOSS_REGISTER.md)

## 광고

| 용도 | 콘솔 이름 | 기본 ID |
|------|-----------|---------|
| 상단 배너 | 수비학lite상단배너 | `ait.v2.live.dba17bf3f3234811` |
| 전면 (확인하기) | 수비학lite전면형 | `ait.v2.live.c9265b6a59f84ea8` |

ID는 `src/toss-ad-group.ts`에 반영됨. 바꿀 때만 `.env`:

```bash
VITE_TOSS_AD_GROUP=ait.v2.live.xxxxx
VITE_TOSS_AD_INTERSTITIAL=ait.v2.live.yyyyy
```

- 배너: 셸 상단
- 전면: Lite iframe에서 「나의 수비학 확인하기」→ 광고 후 결과 (같은 생년월일 10분 내 재조회는 스킵)
- **전면이 동작하려면** `public/lifecode-play/app.js`가 **8code.kr에 배포**되어 있어야 함 (iframe이 원격 URL을 씀)

## 로컬 번들만 보고 싶을 때

셸 URL에 `?local=1` 을 붙이거나:

```bash
# .env
VITE_LIFECODE_PAGE_URL=./lifecode-play/index.html?source=toss
```
