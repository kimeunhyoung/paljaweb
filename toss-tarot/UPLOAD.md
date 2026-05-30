# 타로코드 · 토스 업로드 체크리스트 (v0.2.2)

## 1. 한 번만 (아직 안 했다면)

- [ ] [앱인토스 콘솔](https://developers-apps-in-toss.toss.im/) 앱 **tarotcode** 생성
- [ ] `brand-icon.url.example` → `brand-icon.url` 복사 후 콘솔 아이콘 **HTTPS URL** 한 줄 입력
- [ ] `cd toss-tarot && npm install`

## 2. .ait 만들기

```bash
cd toss-tarot
npm run release
```

마지막에 출력되는 **`*.ait` 전체 경로**를 복사합니다.

- `npm run release` = `sync`(최신 `../public` 복사) + `build` + 경로 출력
- 번들 안 `Tarot.html`의 `<meta name="tarot-bundle-version" content="0.2.2">` 로 버전 확인 가능

## 3. 샌드박스에서 확인

```bash
npm run dev
```

토스 샌드박스 → `intoss://tarotcode`

| 확인 | 동작 |
|------|------|
| 생년월일 입력 | 상단 에너지 스트립 표시 |
| 에너지 → 데일리 | 5장 · **✦ 한눈에 보기** flow-box · 힘/주의 |
| 질문 → 사랑 등 | 3장 · flow-box · **✦ 상세 리딩** |
| 이번 달 / 다음 달 | 3장 flow |
| 올해 | 5단계 flow |

## 4. 콘솔 업로드

1. **개발 → 앱 출시 → 버전 등록하기**
2. `npm run release` 가 출력한 `.ait` 선택
3. 버전 번호: **0.2.2**
4. 변경 내용: 아래 블록 복사
5. 검수 제출

### 변경 내용 (복사용)

```
v0.2.2
- ✦ 한눈에 보기 / 상세 리딩 섹션 통일
- flow-box 연결 흐름 (질문 3장 · 데일리 5장 · 월간 3장 · 올해 5장)
- 데일리: 힘이 되는 에너지 / 오늘의 주의점
- 중복 제목·안내 문구 제거, 토스 여백·배지 정리
```

## 5. 주의

- 출시 `.ait` 에 **테스트** 광고 그룹 ID 넣지 않기
- `.env` 의 `VITE_TAROT_PAGE_URL`(Render URL)은 **출시 빌드에 사용하지 않기** — 번들 내 `Tarot.html` 사용
- `paljaweb.onrender.com` 은 웹 미리보기용, 토스 실제 번들과 다를 수 있음

## 문제 해결

| 증상 | 조치 |
|------|------|
| 예전 UI가 보임 | `npm run sync` 후 다시 `npm run build` |
| 아이콘 경고 | `brand-icon.url` 또는 `TOSS_BRAND_ICON_URL` 설정 후 재빌드 |
| 배너 안 나옴 | 콘솔 광고 그룹·검수 상태 확인, 샌드박스 한계일 수 있음 |

자세한 설정: [README.md](./README.md) · [RELEASE.md](./RELEASE.md)
