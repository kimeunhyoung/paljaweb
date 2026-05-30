# 타로코드 · 토스 업로드 체크리스트 (v0.2.6)

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
- 번들 안 `Tarot.html`의 `<meta name="tarot-bundle-version" content="0.2.6">` 로 버전 확인 가능

## 3. 샌드박스에서 확인

```bash
npm run dev
```

토스 샌드박스 → `intoss://tarotcode`

| 확인 | 동작 |
|------|------|
| 질문 → 사랑 3장 | **핵심 키워드 2개** (예: `인연운 상승 · 관계 발전`) |
| 질문 → 일 3장 | 주의/경계 없이 콤팩트한 키워드 |
| 데일리 5장 | ✦ 한눈에 보기 · flow-box · 힘/주의 |

## 4. 콘솔 업로드

1. **개발 → 앱 출시 → 버전 등록하기**
2. `npm run release` 가 출력한 `.ait` 선택
3. 버전 번호: **0.2.6**
4. 변경 내용: 아래 블록 복사
5. 검수 제출

### 변경 내용 (복사용)

```
v0.2.6
- 질문 모드 한눈에 보기: 주의 키워드 제거, 카드별 핵심 키워드 2개만 표시
- 78장×5주제 scanPair 전면 개편 (가독성·스캔 속도 개선)
- 상세 해설에서 조언·주의 확인 (한눈에 보기는 에너지만)
```

## 5. 주의

- 출시 `.ait` 에 **테스트** 광고 그룹 ID 넣지 않기
- `paljaweb.onrender.com` 은 웹 미리보기용

[README.md](./README.md) · [RELEASE.md](./RELEASE.md)
