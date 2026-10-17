# Markdown Theme Studio

JetBrains IDE의 기본 Markdown preview 가독성을 개선하는 플러그인입니다. 번들 Markdown 플러그인의 렌더링 파이프라인(파싱, 싱크 스크롤, 코드 하이라이트)은 그대로 두고 스타일만 재정의합니다.

- **테마 4종 + Default** — 타이포그래피, 코드 블록, 표, CJK 텍스트에 맞춰 다듬은 테마를 preview 우측 상단 **Aa** 메뉴에서 바로 전환. Default를 고르면 기본 preview 스타일로 복귀
- **글자 크기·본문 폭 조절** — 현재 값(px)을 보면서 단계 조절, Reset all로 한 번에 초기화
- **라이트/다크 자동 추종** — IDE 테마를 따라가며, 수동 고정(Auto / Light / Dark)도 가능
- **키보드로 전부 조작** — Enter로 열고, 방향키로 고르고, Esc로 닫는다
- **선택 기억** — 테마·외관·글자 크기·폭 설정은 localStorage에 저장되어 유지
- **한국어·일본어·중국어 조판** — 문서 언어를 자동 판정해 한국어는 어절 단위, 일본어는 문절 단위로 줄을 바꾸고, 한자를 언어에 맞는 폰트로 그림
- **프로젝트 커스텀 CSS 위에서도 동작** — `.idea/markdown.xml`의 기존 커스텀 CSS(예: Typora 이식 스니펫)가 있어도 테마가 우선 적용

## 테마

| 테마 | 성격 |
|---|---|
| **GitHub** | GitHub 문서 스타일에 충실한 기본 테마 |
| **Soft** | 크림 톤 배경의 편안한 저대비 테마 |
| **Docs** | 인디고 포인트의 기술 문서 스타일 |
| **Reader** | serif 헤딩, 좁은 본문 폭의 긴 글 읽기용 테마 |

### 미리보기

| | 라이트 | 다크 |
|---|---|---|
| **GitHub** | ![GitHub 라이트](docs/screenshots/gh-light.png) | ![GitHub 다크](docs/screenshots/gh-dark.png) |
| **Soft** | ![Soft 라이트](docs/screenshots/nt-light.png) | ![Soft 다크](docs/screenshots/nt-dark.png) |
| **Docs** | ![Docs 라이트](docs/screenshots/dc-light.png) | ![Docs 다크](docs/screenshots/dc-dark.png) |
| **Reader** | ![Reader 라이트](docs/screenshots/rd-light.png) | ![Reader 다크](docs/screenshots/rd-dark.png) |

## 설치

지원 범위: **2025.1 이상** (IntelliJ IDEA·WebStorm·PyCharm 등 번들 Markdown 플러그인이 있는 JetBrains IDE). 새 IDE 버전은 매주 최신 릴리즈·EAP로 호환성을 자동 점검합니다

1. 플러그인 zip 빌드 (또는 배포된 zip 사용)

   ```
   ./gradlew buildPlugin
   ```

   → `build/distributions/markdown-theme-studio-<버전>.zip`

2. IDE에서 **Settings → Plugins → ⚙️ → Install Plugin from Disk…** 로 zip 선택

   대부분 재시작 없이 바로 설치됩니다(Plugin Verifier 판정: 재시작 없이 활성화·비활성화 가능). 다만 **이미 열려 있던 Markdown preview에는 적용되지 않으므로** 파일을 닫았다 다시 열어 주세요. preview가 열린 상태에서 업데이트·제거하면 IDE가 재시작을 요청할 수 있습니다.

## 사용법

Markdown preview 우측 상단의 **Aa** 버튼을 누르면 설정 패널이 열립니다.

| 라이트 | 다크 |
|---|---|
| ![설정 패널 라이트](docs/screenshots/switcher-light.png) | ![설정 패널 다크](docs/screenshots/switcher-dark.png) |

- **Theme** — 견본 카드(GitHub / Soft / Docs / Reader)를 눌러 전환. **Default**는 플러그인 스타일을 끄고 기본 preview로 되돌립니다
- **Text size / Max width** — − / + 로 본문 글자 크기(±3px)와 본문 최대 폭(±240px)을 조절. 가운데에 현재 값이 표시됩니다(preview 패널이 더 좁으면 실제 본문 폭은 패널에 맞춰 줄어듭니다)
- **Appearance** — Auto(IDE 테마 추종) / Light / Dark
- **Reset all** — GitHub 테마·Auto·기본 크기와 폭으로 초기화

키보드: Aa에 포커스 후 Enter/Space로 열고, 방향키로 항목 안에서 이동·선택, Tab으로 다음 항목, Esc로 닫습니다. 패널 밖을 클릭해도 닫힙니다.

## 개발

```
./gradlew runIde        # IC 2025.1 샌드박스 실행
./gradlew buildPlugin   # 배포 zip 생성
./gradlew test          # 단위 테스트
./gradlew verifyPlugin  # 지원 IDE 범위 바이너리 호환성 검사
tools/build-zip.sh      # 배포 zip 빌드 + 패키징 검증 (테스트 포함)
```

구조는 소스 3파일이 전부입니다.

- `ThemeStudioPreviewExtension.kt` — `browserPreviewExtensionProvider` 확장점 구현. CSS/JS를 preview에 서빙
- `themes/mts.css` — 테마 스타일. `html[data-mts-theme]` 스코프라 속성이 없으면 기본 preview 그대로
- `themes/mts.js` — 스위처 위젯과 테마/외관 상태 관리

자세한 아키텍처와 플랫폼 제약은 [CLAUDE.md](CLAUDE.md)를 참고하세요.

## 문제 해결

**테마가 보이지 않는다**

- **preview 렌더러가 Compose로 설정돼 있다** — 2025.2~2026.2에는 실험 기능인 Compose 렌더러를 고르는 옵션이 있습니다. 이 플러그인은 Chromium(JCEF) preview에 스타일을 입히는 방식이라 Compose 렌더러에서는 동작하지 않습니다. **Settings → Languages & Frameworks → Markdown → Preview rendering engine**을 **Chromium browser**로 바꾸세요. (Compose 렌더러에는 외부 스타일을 넣을 공식 경로가 없습니다 — [#26](https://github.com/sanggi-wjg/markdown-theme-studio/issues/26))
- **Default가 선택돼 있다** — preview 우측 상단 **Aa**에서 테마를 고르세요. Default는 플러그인 스타일을 끈 상태입니다.
- **설치 직후 이미 열려 있던 preview** — 파일을 다시 열면 적용됩니다.

**프로젝트에 커스텀 CSS가 있다**

`.idea/markdown.xml`의 커스텀 CSS(예: Typora 테마 이식 스니펫)가 있어도 테마가 우선합니다. 커스텀 CSS를 그대로 쓰고 싶으면 **Aa → Default**를 고르세요.

**설정이 IDE마다 따로 저장된다**

테마·외관·글자 크기·폭은 preview 내부 저장소(localStorage)에 저장되어 IDE 설치본마다 따로입니다. IDE 간 동기화(Settings Sync)는 검토 중입니다 — [#33](https://github.com/sanggi-wjg/markdown-theme-studio/issues/33).

## 라이선스

[MIT](LICENSE)
