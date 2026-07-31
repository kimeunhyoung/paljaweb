# 8CODE 수비학 Lite · 토스 등록 가이드

| 항목 | 값 |
|------|-----|
| 콘솔 appName | `lifecodelite` (`granite.config.ts`와 동일) |
| 표시 이름 | 8CODE 수비학 |
| 이번 버전 | **0.1.0** |
| 딥링크 | `intoss://lifecodelite` |

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
