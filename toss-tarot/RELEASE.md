# 타로코드 · 토스 버전 등록

## 현재 버전

| 항목 | 값 |
|------|-----|
| npm `version` | **0.2.4** |
| 콘솔 appName | `tarotcode` |
| 변경 요약 | 주제별 flow 키워드 · UI 가독성 · 에너지 확인 안내 |

콘솔 **버전 설명** 예시 (복사용):

```
v0.2.4
- 질문 모드 한눈에 보기: 주제별 요약 키워드 (사랑·일 등 맥락 맞춤)
- flow-box 제목과 첫 해석 줄 시각적 분리
- 수비학 맥락 글자 크기·가독성 개선
- 에너지 확인 전 카드 뽑기 클릭 시 안내
- ✦ 한눈에 보기 / flow-box UI 정리
```

## 1. 사전 준비 (최초 1회)

1. [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/) 에 앱 **tarotcode** 생성
2. `brand-icon.url.example` → `brand-icon.url` 복사 후 **콘솔 아이콘 HTTPS URL** 한 줄 입력
3. `cd toss-tarot && npm install`

## 2. .ait 빌드

```bash
cd toss-tarot
npm run release
```

마지막 명령이 **업로드할 `.ait` 파일 전체 경로**를 출력합니다.

## 3. 콘솔 업로드

1. 앱인토스 콘솔 → **개발** → **앱 출시** → **버전 등록하기**
2. 출력된 `tarotcode.ait` 선택
3. 버전 **0.2.4** / 변경 내용 위 블록 입력
4. 검수 제출

체크리스트: [UPLOAD.md](./UPLOAD.md)

## 4. 샌드박스 확인

```bash
npm run dev
```

- 생년월일 없이 **카드 뽑기** → 안내 문구
- **데일리** · **질문(사랑)** 각각 한눈에 보기 확인

## 주의

- `.ait` 는 `npm run sync` 후 빌드한 **번들 안 Tarot.html** 사용
- **테스트** 광고 ID는 출시 번들에 넣지 마세요
