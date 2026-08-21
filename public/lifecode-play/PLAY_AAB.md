# lifecode-play → Play AAB 빌드 가이드

패키지: **kr.co.palja.app** (기존 팔자연구소 앱 업데이트)

## 사전 확인

- [x] https://8code.kr/lifecode-play/ 동작
- [x] https://8code.kr/lifecode-play/manifest.webmanifest
- [x] Bubblewrap 설치 (`bubblewrap --version`)
- [ ] **기존 keystore** (첫 AAB 올릴 때 쓴 파일) — **새로 만들면 Play 업로드 불가**

---

## 1. 프로젝트 폴더 만들기

PowerShell:

```powershell
cd "B:\앱설계\라이프코드내꺼\paljaweb"
mkdir twa-palja-lite -Force
cd twa-palja-lite
bubblewrap init --manifest https://8code.kr/lifecode-play/manifest.webmanifest
```

## 2. init 질문 — 이렇게 입력

| 질문 | 입력 |
|------|------|
| Domain | **Enter** (기본값 `8code.kr`) |
| URL path | `/lifecode-play/` |
| Application name | **Enter** 또는 `8CODE 수비학` |
| Short name | **Enter** |
| Application ID (package) | **`kr.co.palja.app`** ← 반드시 기존과 동일 |
| Display mode | **Enter** (standalone) |
| Theme / nav / background color | **Enter** (기본 `#090a10`) |
| Icon URL | **Enter** |
| Maskable / Monochrome icon | **Enter** |
| Shortcuts | **n** |
| Play Billing | **n** |
| Location delegation | **n** |
| **Signing key** | **기존 keystore 사용** (아래 중요) |

### Signing key (중요)

- **이미 Play에 올린 적 있음** → **Create new? No** → 기존 `.keystore` 경로 + 비밀번호
- **처음이면** → 새 keystore 생성 후 SHA-256을 `assetlinks.json`에 추가·배포

---

## 3. AAB 빌드

업로드 키: `twa-palja-lite/upload-key.jks` (alias `upload`)  
로컬에 `keystore.properties` 필요 (`keystore.properties.example` 복사 후 비밀번호 입력). Git에는 올라가지 않음.

**JDK 17** 권장. Java 25 등 최신 버전이면 Gradle 오류(`major version 69`) 날 수 있음.

```powershell
cd "B:\앱설계\라이프코드내꺼\paljaweb\twa-palja-lite"
# JDK 17 (Temurin) — 설치 경로 예시
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.8-hotspot"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
# Android SDK — local.properties 또는 ANDROID_HOME (예: C:\Android\Sdk)
Copy-Item keystore.properties.example keystore.properties   # 최초 1회
# keystore.properties 에 storePassword / keyPassword 수정
.\gradlew.bat bundleRelease
```

결과 파일: **`app\build\outputs\bundle\release\app-release.aab`**

bubblewrap 대신 gradlew 사용 (AdMob WebView 빌드는 `twa-palja-lite` Gradle 프로젝트 기준).

---

## 4. assetlinks 확인

```powershell
bubblewrap validate --url https://8code.kr/.well-known/assetlinks.json
```

**Digital Asset Links file verified successfully** 나오면 OK.

새 keystore 썼다면 `public/.well-known/assetlinks.json`에 SHA-256 추가 후 Git 푸시·배포.

---

## 5. Play Console 업로드

1. [Play Console](https://play.google.com/console) → **팔자연구소**
2. **테스트 → 클로즈드 테스트** → **새 버전 만들기**
3. `app-release-bundle.aab` 업로드
4. **버전 코드**는 이전보다 **큰 숫자** (자동 증가면 OK)
5. 출시 노트 예:
   ```
   수비학 Lite 화면으로 시작 URL 변경.
   생년월일·이름으로 핵심 수비학 숫자를 확인할 수 있습니다.
   ```
6. **검토 → 출시**

---

## 6. 실기기 테스트

- 클로즈드 테스터 링크로 설치
- 다크 테마 Lite 화면 · 계산 · 기록 확인
- `8code.kr` 심화 링크는 브라우저로 열리는 것 정상

---

## 7. AdMob (전면)

| 항목 | 값 |
|------|-----|
| 앱 ID | `ca-app-pub-7451075921625740~5129794869` |
| 전면 광고 단위 | `ca-app-pub-7451075921625740/6850904792` |

- Play 앱은 **WebView + AdMob SDK** (`LauncherActivity.java`, `PlayAdManager.java`)
- **확인하기** 누르면 전면 → 같은 생년월일 **10분** 안 재조회는 스킵 (`app.js`)
- TWA(Chrome)만 쓰면 네이티브 광고 불가 → WebView로 전환함
- `app-ads.txt`: `https://8code.kr/app-ads.txt`
- Play Console **광고 포함: 예** (이 AAB 업로드 후)
- 새 광고 단위는 **최대 1시간** 후 게재 시작 (테스트 기기 등록 권장)

빌드 후 `versionCode`는 Play에 올린 것보다 **큰 숫자** (현재 **8**).

---

## 8. 토스(앱인토스) 병행

같은 Lite를 토스 미니앱으로 올릴 때는 `toss-lifecode/` 프로젝트 사용.

- URL: `https://8code.kr/lifecode-play/?source=toss`
- 가이드: `toss-lifecode/TOSS_REGISTER.md`
- Play(`source=play`)와 별개 채널 · 사이트 유입 CTA 동일 패턴
