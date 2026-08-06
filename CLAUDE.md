# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

JetBrains 번들 Markdown 플러그인의 preview에 CSS/JS를 주입해 가독성 테마 4종(GitHub/Soft/Docs/Reader)과 preview 우측 상단 테마 스위처를 제공하는 플러그인. 파싱·싱크스크롤 등 렌더링 파이프라인은 건드리지 않고 스타일만 재정의한다. 지원 범위 2025.1~2026.x, 컴파일은 항상 최소 버전(IC 2025.1) 기준.

## Git 전략

- `main` 직접 커밋 금지. 모든 작업은 **main 기준으로 브랜치 생성 → PR**로 진행한다
- 브랜치명: `feat/<주제>`, `fix/<주제>`, `chore/<주제>` (예: `feat/i18n-english`)
- PR 생성은 `gh pr create`, 머지 대상은 `main`. CI(GitHub Actions: test+buildPlugin) 통과 확인 후 머지
- 작업 시작 전 `git pull origin main`으로 최신화 후 분기

## 명령어

- `./gradlew buildPlugin` — `build/distributions/*.zip` 생성 (Install Plugin from Disk용)
- `tools/build-zip.sh` — 배포용: test + buildPlugin + 패키징 검증(버전·idea-version·아이콘·리소스 포함 여부). 배포 zip은 이걸로 만든다
- `./gradlew runIde` — IC 2025.1 샌드박스 실행. EUA 다이얼로그 스킵과 JCEF 원격 디버깅(포트 9223)이 jvmArgs로 켜져 있음
- `./gradlew prepareSandbox` — 샌드박스에 재배포. 단 CSS/JS는 패널 생성 시점에 서빙되므로 확실한 반영은 샌드박스 재시작
- `./gradlew verifyPlugin` — 지원 IDE 범위 바이너리 호환성 검사

## 아키텍처 (소스 3파일)

- `ThemeStudioPreviewExtension.kt` — EP `org.intellij.markdown.browserPreviewExtensionProvider` 구현. `Priority.AFTER_ALL`이라 우리 스타일시트가 cascade 마지막에 로드된다. ResourceProvider로 리소스를 서빙하며 서빙 시점에 두 변환을 한다: ① `importantify()` — mts.css의 전 선언에 `!important` 부여, ② mts.js 앞에 `window.__mtsDark = <IDE LaF 다크 여부>` 프리루드 주입
- `themes/mts.css` — 스코프 계약: `html[data-mts-theme="gh|nt|dc|rd"]` = 활성 테마, `html.mts-dark` = 다크 외관, `html.mts-laf-dark` = 실제 IDE LaF 다크(코드펜스 전용 도메인 — 외관 강제와 무관하게 mts.js가 항상 LaF 기준으로 세팅). 속성이 없으면 플러그인 완전 비활성(기본 preview 그대로). 공용 구조 규칙 → 테마별 규칙 순서이며, 같은 특이도끼리는 파일 내 뒤가 이긴다
- `themes/mts.js` — 스위처 위젯. 본문은 IncrementalDOM이 `document.body`만 패치하므로 위젯은 반드시 `<html>` 직속에 부착한다. 테마(Default='off'=속성 제거)·외관(auto/light/dark)·폰트 오프셋(±3px, `--mts-fs-offset` 인라인 변수)은 localStorage에 저장. 위젯 스타일은 테마 스코프 **밖**에 둔다 — off 상태에서도 위젯은 살아야 한다

## 플랫폼 제약 — 어기면 조용히, 주로 다크 모드에서만 깨진다

- **사용자 Custom CSS와의 경쟁이 상수다.** 프로젝트 `.idea/markdown.xml`의 커스텀 CSS(InlineStylesExtension)는 우리 시트 *뒤에* 로드되고 흔히 전 선언 `!important`다(Typora 이식 스니펫이 실제 사용자 프로젝트들에 존재). `importantify()`가 이를 이기는 유일한 수단이므로 **테마가 관여하는 모든 시각 속성은 명시 선언**해야 한다. 새 요소를 다룰 때: 텍스트 색은 `color: inherit` 리셋 블록에, 배경은 `background: transparent` 리셋 블록에 등록. 비워두면 라이트에선 멀쩡해 보이고 다크에서만 깨진다
- **mts.css 작성 계약**: `importantify()`는 주석·문자열·`url()`을 인지하는 단일 패스 변환이라 문자열/`url(data:...;...)` 내부 세미콜론과 수동 `!important`(이중 승격 안 함)에 안전하다. 다만 mts.css는 관례상 수동 `!important` 없이 작성한다(테스트가 강제)
- 기본 스타일이 body `font-size`에 `!important`를 쓰므로 크기는 `--default-font-size` **변수를 재정의**해 우회한다
- 코드 펜스 토큰 색은 IDE 렉서가 **인라인 스타일**로 넣는다 — 컨테이너(배경·패딩·폰트)만 스타일링하고 토큰 색은 건드리지 않는다. 코드펜스의 배경(`--mts-code-bg`)·기본 글자색(`--mts-pre-fg`)은 외관(`mts-dark`)이 아니라 **LaF**(`mts-laf-dark`)를 따른다 — 토큰 색의 출처가 LaF의 에디터 스킴이라, 외관을 강제해도 코드블록은 LaF 도메인에 남아야 대비가 유지된다 (auto에선 둘이 같아 시각 차이 없음)
- 라이트 코드 배경은 IDE Light 스킴 주석 회색(#8c8c8c) 대비가 기본 preview(3.126) 이상이어야 한다 — `tools/mts_tokens.py`가 REGRESSION으로 검출
- IDE LaF 변경 시 패널·확장 인스턴스가 파기 후 재생성된다. JS 상태는 살아남지 않는다는 전제로 작성 (프리루드가 매번 새로 주입되는 이유)
- 번들 commandRunner의 실행 아이콘은 테마 활성 시 숨긴다(`.run-icon`, `.code-block`) — copy 버튼(`.code-fence-highlighter-*`)은 살려둘 것

## 렌더링 검증 — 추측하지 말고 눈으로 확인

preview 렌더링 문제는 CDP로 직접 본다. `tools/`에 하네스가 있다 (python3 + `websocket-client` 필요):

- `tools/mts_shot.py list|shot <테마> <light|dark> <out.png>|eval '<js>'` — 타겟 확인·스크린샷·JS 평가
- `tools/mts_audit.py` — 요소 동물원을 주입해 4테마×2외관 전수 대비(WCAG)·레이아웃 검사
- `tools/mts_review2.py features|narrow <px>|clearemu|css off|on` — 번들 기능 회귀·좁은 패널·커스텀 CSS 유무 시뮬레이션
- `tools/mts_tokens.py` — 코드펜스 토큰 색 대비 감사 (기본 preview 베이스라인 + 4테마×2외관 = 9콤보). `fixtures/code-syntax.md`가 preview에 열려 있어야 한다: `./gradlew runIde --args="$PWD $PWD/fixtures/code-syntax.md"`. 토큰 색은 실행 중 LaF를 따르므로 라이트 LaF 1차 → 필요시 다크 LaF 2차. REGRESSION(기본 preview보다 악화) 0가 목표, BASELINE-LIMIT은 IDE 스킴 한계

샌드박스가 여는 마지막 프로젝트에 Typora 커스텀 CSS가 있으면 최악 조건 테스트가 된다(의도적으로 유용). 클린 환경은 `css off`로 시뮬레이션.

절차 전체는 `/verify-preview` 스킬, 수정 전후 비교 컷은 `/visual-diff` 스킬로 진행한다. 플랫폼 API의 버전 안정성 조사는 `platform-api-scout` 에이전트, 코드 리뷰는 `mts-reviewer` 에이전트에 위임한다.
