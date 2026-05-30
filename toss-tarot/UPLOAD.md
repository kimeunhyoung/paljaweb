# 타로코드 · 토스 업로드 체크리스트 (v0.2.4)

## 1. 한 번만 (아직 안 했다면)

- [ ] [앱인토스 콘솔](https://developers-apps.in-toss.toss.im/) 앱 **tarotcode** 생성
- [ ] `brand-icon.url.example` → `brand-icon.url` 복사 후 콘솔 아이콘 **HTTPS URL** 한 줄 입력
- [ ] `cd toss-tarot && npm install`

## 2. .ait 만들기

```bash
cd toss-tarot
npm run release
```

마지막에 출력되는 **`*.ait` 전체 경로**를 복사합니다.

- `npm run release` = `sync`(최신 `../public` 복사) + `build` + 경로 출력
- 번들 안 `Tarot.html`의 `<meta name="tarot-bundle-version" content="0.2.4">` 로 버전 확인 가능

## 3. 샌드박스에서 확인

```bash
npm run dev
```

토스 샌드박스 → `intoss://tarotcode`

| 확인 | 동작 |
|------|------|
| 생년월일 없이 카드 뽑기 | 「에너지 확인」 안내 + 생년월일로 스크롤 |
| 생년월일 → 데일리 5장 | ✦ 한눈에 보기 · flow-box · 힘/주의 |
| 질문 → 사랑 3장 | 주제 키워드(일반 덱 키워드 아님) · flow 제목 구분선 |
| 수비학 줄 | 텍스트형 · 글자 크기 읽기 좋음 |

## 4. 콘솔 업로드

1. **개발 → 앱 출시 → 버전 등록하기**
2. `npm run release` 가 출력한 `.ait` 선택
3. 버전 번호: **0.2.4**
4. 변경 내용: 아래 블록 복사
5. 검수 제출

### 변경 내용 (복사용)

```
v0.2.4
- 질문 모드 한눈에 보기: 주제별 요약 키워드 (사랑·일 등 맥락 맞춤)
- flow-box 제목과 첫 해석 줄 시각적 분리
- 수비학 맥락 글자 크기·가독성 개선
- 에너지 확인 전 카드 뽑기 클릭 시 안내
- ✦ 한눈에 보기 / flow-box UI 정리
```

## 5. 주의

- 출시 `.ait` 에 **테스트** 광고 그룹 ID 넣지 않기
- `.env` 의 `VITE_TAROT_PAGE_URL`(Render URL)은 **출시 빌드에 사용하지 않기**
- `paljaweb.onrender.com` 은 웹 미리보기용

## 문제 해결

| 증상 | 조치 |
|------|------|
| 예전 UI | `npm run release` 다시 실행 |
| 아이콘 경고 | `brand-icon.url` 설정 후 재빌드 |

[README.md](./README.md) · [RELEASE.md](./RELEASE.md)
