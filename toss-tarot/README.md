# 타로코드 · 앱인토스 (toss-tarot)

팔자연구소 타로코드를 토스 미니앱(`.ait` 번들)으로 빌드하는 프로젝트입니다.

- **콘솔 appName:** `tarotcode` (`granite.config.ts`와 동일해야 함)
- **본문:** `../public/Tarot.html` 을 빌드 전에 `public/` 으로 복사해 번들에 포함
- **UI:** 경량 셸(`entry.ts`) + iframe. `app=1` 이면 타로 페이지 자체 헤더·광고 슬롯 숨김, 토스 partner 내비 사용
- **`web.host: localhost`:** `granite dev` 전용. QR로 올린 `.ait` 는 **번들 안 `Tarot.html`** 을 씁니다 (`webViewProps.url` 은 공식 스키마에 없음)
- **광고:** 정산·광고 그룹 발급 후 `useTossBanner` 등으로 추가 (인트로 직후 배너는 가이드상 비권장)

## 사전 요구

- Node.js 18+
- [앱인토스 샌드박스 앱](https://developers-apps-in-toss.toss.im/) (로컬 개발용)

## 명령어

```bash
cd toss-tarot
npm install
npm run sync      # ../public 타로 자산 복사
npm run dev       # granite dev (샌드박스에서 intoss://tarotcode)
npm run build     # dist + .ait 생성
npm run release   # sync + build + .ait 경로 출력 (버전 등록용)
```

토스 출시본은 `app=1` · **✦ 한눈에 보기 flow-box** · 질문 6 + 에너지 4 통일 UI입니다.

**지금 올리기:** [UPLOAD.md](./UPLOAD.md) 체크리스트 → `npm run release` → 콘솔에 `.ait` 등록. 상세는 [RELEASE.md](./RELEASE.md).

## 광고 그룹 ID

배너 그룹 **타로코드_상단배너** (`ait.v2.live.a0b05a8e5a6c4135`) 는 `src/toss-ad-group.ts` 와 동기화된 `Tarot.html` 메타에 반영되어 있습니다.

다른 ID로 바꿀 때만 선택적으로 `.env` 에 설정:

```bash
# toss-tarot/.env
VITE_TOSS_AD_GROUP=ait.v2.live.xxxxx
```

출시 `.ait` 번들에는 **테스트** 광고 그룹 ID를 넣지 마세요 (검수 반려 사유).

### 전면 광고 (새 리딩)

토스 앱에서 **「↺ 새로운 리딩 시작하기」** 를 누르면 셸이 전면 광고를 띄운 뒤 리셋합니다.

1. 콘솔 → 인앱 광고 → **전면형** 광고 그룹 생성  
2. `toss-tarot/.env` 에 `VITE_TOSS_AD_INTERSTITIAL=발급_ID`  
3. `npm run build` 후 `.ait` 재등록  

ID를 넣기 전에는 광고 없이 바로 리셋됩니다 (배너만 유지).

## 콘솔에 .ait 업로드

1. `npm run build` 실행
2. `dist` 또는 프로젝트 루트에 생성된 **`*.ait`** 파일 확인
3. 앱인토스 콘솔 → **개발 → 앱 출시 → 버전 등록하기** → `.ait` 선택

## Render와 관계

- 이 번들은 **토스 앱 안**에서 동작하는 패키지입니다.
- `paljaweb.onrender.com` 은 웹·업데이트용으로 계속 쓸 수 있고, `npm run sync` 가 최신 `public/` 을 반영합니다.

## 유용한 링크

- [WebView 가이드](https://developers-apps-in-toss.toss.im/tutorials/webview.html)
- [배너 광고 WebView](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B4%91%EA%B3%A0/BannerAd.html)
- [미니앱 출시](https://developers-apps-in-toss.toss.im/development/deploy.html)
