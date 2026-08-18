# lifecode-play · AdSense 준비

## 배치 원칙 (탐색 정책)

- 광고는 **입력 버튼·기록 목록과 분리** → 페이지 **맨 아래** (소개 글 아래)
- **「광고」** 라벨 표시
- **자동 광고(앵커·전면)** 끄기 — AdSense 콘솔 → 광고 → 자동 광고
- Play TWA (`?source=play`) 에서는 AdSense **비표시** → 추후 **AdMob** 연결

## 콘솔에서 할 일

1. [AdSense](https://adsense.google.com) → **광고** → **광고 단위 기준** → 디스플레이 광고
2. 이름 예: `lifecode-play-bottom`
3. 생성된 **data-ad-slot** 숫자를 `index.html` 의 meta에 입력:

```html
<meta name="play-adsense-slot" content="여기에_슬롯ID"/>
```

4. 사이트 등록 URL: **`https://8code.kr`** (또는 `https://8code.kr/lifecode-play/`)
5. `public/ads.txt` — 이미 `pub-7451075921625740` 등록됨  
   Play/AdMob 앱 인증은 `https://8code.kr/app-ads.txt` (같은 한 줄)
6. 배포 후 **검토 요청**

## 심사용 확인 URL

- https://8code.kr/lifecode-play/
- https://8code.kr/about.html
- https://8code.kr/guide/index.html

## Play 앱 광고

- 웹 AdSense ≠ Play 수익
- TWA 앱 수익: **AdMob** (앱 승인 후 AdMob에서 앱 연결)
