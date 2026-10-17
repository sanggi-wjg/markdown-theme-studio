---
name: verify-preview
description: mts.css/mts.js 변경 후 preview 실렌더 검증 절차 — 빌드·샌드박스 재배포 후 CDP로 4테마×2외관 전수 감사와 기능 회귀를 돌리고 요약 보고한다. 스타일/위젯을 수정했거나 렌더링 이슈를 조사할 때 사용.
---

# preview 실렌더 검증

추측 금지 — 렌더링은 CDP로 눈으로 확인한다. 아래 절차를 순서대로 진행하고 마지막에 표로 보고한다.

## 0. 준비 (최초 1회)

- venv 없으면: `python3 -m venv tools/.venv && tools/.venv/bin/pip install websocket-client`
- 이후 모든 파이썬 실행은 `tools/.venv/bin/python` 사용

## 1. 배포

1. `./gradlew prepareSandbox`
2. CSS/JS는 preview **패널 생성 시점**에 서빙된다. 파일이 바뀌었으면 샌드박스 재시작이 확실한 반영 수단이다: 기존 runIde를 띄운 백그라운드 태스크를 종료(잔존 IDE 프로세스는 `r=$(git -C <worktree> rev-parse --show-toplevel) && pkill -f "$r/.intellijPlatform/"; pgrep -lf "${r:?}/.intellijPlatform/"`로 종료 후 비었는지 확인 — 이 worktree 샌드박스의 `-Didea.config.path` 인자에 매칭된다. `&&`·`${r:?}` 가드를 빼면 경로 오류 시 치환이 비어 모든 worktree 샌드박스가 걸린다. 셸 cwd에 기대는 `$(pwd)`는 하위 디렉터리나 호출마다 cwd가 돌아가는 에이전트 셸에서 엉뚱한 대상을 겨냥한다. `idea.plugin.in.sandbox.mode=true`는 다른 worktree에서 병렬로 띄운 샌드박스까지 죽이고, `idea`류 광역 패턴은 사용자의 실제 IntelliJ를 죽일 수 있다) → `./gradlew runIde`를 백그라운드로 재실행
3. **최신 플랫폼 확인**: 기본 샌드박스는 IC 2025.1이라 최신 번들 Markdown의 새 렌더 요소(2026.2의 GitHub Alert 등)가 보이지 않는다. 스타일 변경이면 2025.1 감사 후 `./gradlew runIdeLatest -PlatestIdePath="<IDE 설치 경로>" --args="$PWD $PWD/fixtures/elements.md"`로 한 번 더 감사한다(포트가 같아 기존 샌드박스를 먼저 종료하거나 `-PcdpPort`로 다른 포트에 띄운다)
4. CDP 타겟 확인: `tools/.venv/bin/python tools/mts_shot.py list`
   - 포트는 기본 9223 (build.gradle.kts `cdpPort` → jvmArgs `-Dide.browser.jcef.debug.port`). 다른 worktree 샌드박스와 병렬이면 `-PcdpPort=9224`로 띄우고 모든 하네스 명령에 `MTS_CDP_PORT=9224`를 준다(tools/*.py는 mts_shot.PORT를 공유). worktree엔 `tools/.venv`가 없으니(gitignore) 만들거나 main 체크아웃의 venv 파이썬으로 실행
   - preview 타겟이 안 보이면 샌드박스에서 md 파일이 열려 preview 패널이 떠 있는지부터 확인

## 2. 전수 감사 — 스타일 변경 시 필수

- `tools/.venv/bin/python tools/mts_audit.py`
- 요소 동물원을 주입해 4테마×2외관 8조합의 WCAG 대비·레이아웃·테마 정체성을 검사하고 `tools/audit-full.json`에 기록한다
- 판정 기준(mts_audit.py 실제 임계값): **전 요소** 대비 3.0 미만 FAIL, 4.5 미만 WARN — 둘 다 위반 목록에 출력된다(예외: `small`과 취소선(`del`·마크다운 `span.user-del`) 안 글자는 FAIL 3.0만 — 동물원은 링크·코드·굵게·인용·표·h6·Alert 안 취소선까지 잰다). 대비는 opacity를 그룹 합성한 실제 값이다(대비 × opacity 곱셈은 흐림을 2배 가까이 과대평가한다). 취소선 흐림은 두 형태(문서·동물원)가 같은 opacity여야 한다(`_strike`). FAIL은 무조건 수정, WARN도 원인 확인 없이 통과 처리하지 않는다. 가로 오버플로는 무조건 수정 대상

## 2.5 코드펜스 토큰 감사 — 코드블록 배경/글자색을 건드렸을 때 필수

- 전제: `fixtures/code-syntax.md`가 preview에 열려 있어야 한다. 샌드박스 기동 시 인자로 열 수 있다:
  `./gradlew runIde --args="$PWD $PWD/fixtures/code-syntax.md"` (프로젝트 창이 여럿이면 스크립트가 마커로 픽스처 창을 찾는다)
- `tools/.venv/bin/python tools/mts_tokens.py` — 기본 preview 베이스라인 + 4테마×2외관 9콤보에서 렉서 인라인 토큰의 WCAG 대비를 측정, `tools/tokens-full.json`에 기록
- 판정: **REGRESSION**(기본 preview에선 통과인데 우리 테마에서 FAIL) = 무조건 수정. **BASELINE-LIMIT**(기본에서도 FAIL) = IDE 스킴 한계로 기록만. 토큰 색은 실행 중 LaF의 에디터 스킴을 따르므로 라이트 LaF 1차 → 코드펜스 스코프(`mts-laf-dark`)를 건드렸으면 다크 LaF로 전환해 2차
- LaF 전환은 샌드박스 종료 후 `config/options/laf.xml`(themeId Experimental{Light,Dark})과 `config/options/colors.scheme.xml`(name Light/Dark)을 함께 바꾼다 — **스킴을 같이 안 바꾸면 LaF만 바뀐 혼합 상태로 측정이 오염된다** (실제로 겪음)

## 3. 회귀 — 해당되는 것만

- 번들 기능(copy 버튼 생존, 실행 아이콘 숨김, 링크·data URI 이미지 로드): `tools/.venv/bin/python tools/mts_review2.py features`
- 좁은 패널: `tools/.venv/bin/python tools/mts_review2.py narrow 400` → 확인 후 `clearemu`로 원복
- 위젯 키보드 접근성(위젯을 건드렸을 때 필수): `tools/.venv/bin/python tools/mts_review2.py widget` — Enter로 열기→선택 테마에 포커스, 방향키로 전환, Esc로 닫고 Aa로 포커스 복귀, 보이지 않는 포커스 대상 0. `ok: true`여야 한다. 방향키 전환은 IDE 설정(`options/markdownThemeStudio.xml`)까지 영구히 바꾼다 — 끝나면 원래 테마로 되돌리고, 감사 전엔 글자 크기·폭 오프셋도 0으로
- 커스텀 CSS 경쟁: `css off` = 클린 환경 시뮬레이션, `css on` = Typora 최악 조건 복원

## 3.5 IDE 설정 동기화 — 설정 상태 경로(ThemeStudioSettings·PreviewSettingsSync·mts-ide.js·위젯 저장)를 건드렸을 때

`tools/mts_sync.py`(사용법은 파일 머리말). 상태 파일은 샌드박스 `config_runIde/options/markdownThemeStudio.xml`(2025.1), `config_runIdeLatest/options/…`(최신)

- **IDE는 설정을 창 비활성화·정상 종료 때만 저장한다** — 샌드박스는 비활성화가 안 일어나고, pkill(SIGTERM)은 저장 없이 끝난다(설정도, JCEF localStorage의 미커밋 쓰기도 잃는다 — Chromium은 첫 커밋 뒤 커밋을 분 단위로 미룬다). 번들 performanceTesting 스크립트로 저장·정상 종료한다: 스크립트 파일에 `%sleep 15000` + `%saveDocumentsAndSettings`/`%sleep 10000` 반복(주기 저장) 또는 `%sleep 150000` + `%saveDocumentsAndSettings` + `%exitApp`(정상 종료)을 쓰고 `JAVA_TOOL_OPTIONS="-Dtestscript.filename=<파일>"`로 샌드박스를 띄운다. `%openFile <절대경로>`로 두 번째 preview, `%action MarkdownThemeStudio.SwitchTheme` + `%takeScreenshot <폴더>`로 액션 팝업 캡처(`log_*/screenshots/`). 팝업 항목 선택은 자동화할 수 없다(입력 이벤트 불가) — 선택 이후 경로는 `extset`(같은 Kotlin 갱신·방송 경로)으로 본다
- 2026.2는 정상 종료 뒤에도 `cef_server` 프로세스가 남아 Gradle runIde가 끝나지 않는다 — 종료 뒤 자기 worktree 패턴으로 정리
- 확인 항목: ① 위젯 변경 → `ask` 응답·XML ② 재기동(+`clearls`) 후 XML 값으로 복원 ③ `legacy` → `reload` 마이그레이션(rev 0일 때만) ④ preview 두 개에서 한쪽 변경이 다른 쪽에 즉시 반영 ⑤ `-DmarkdownThemeStudio.browserPipe.disabled=true`로 띄워 위젯 변경이 로컬에만 남고(pending), 같은 조건 재기동에서 유지되며, 정상 재기동 때 IDE로 올라가는지 ⑥ `extset` 허용 밖 값 무시
- 감사(`mts_audit.py`)는 글자 크기·폭 오프셋 0을 전제한다 — 오프셋은 IDE 설정이라 재기동해도 남으므로 감사 전에 0으로(`extset 'seq=9999&fs=0&w=0'` 또는 위젯 Reset all)
- preview origin은 내장 서버 포트(63342부터 빈 포트)라 다른 IDE·샌드박스가 먼저 떠 있으면 바뀐다 — 그때 localStorage는 비어 보인다(IDE 상태가 원천이라 정상 동작)

## 4. 스팟 체크

- 스크린샷: `tools/.venv/bin/python tools/mts_shot.py shot <gh|nt|dc|rd> <light|dark> <out.png>` → Read로 직접 눈 확인
- JS 평가: `tools/.venv/bin/python tools/mts_shot.py eval '<js>'`

## 함정 — 실제로 겪은 것들

- **위젯 패널 기하는 열린 상태에서만 의미가 있다.** 닫힌 패널(`hidden`)은 rect가 0이다 — `narrow`는 측정 순간에만 펼쳐 잰다. 패널 안 값(px)은 `getComputedStyle` 기반이라 테마 전환 직후 같은 eval에서 읽어도 된다
- 감사는 "라이트 정상 / 다크 깨짐" 패턴을 잡으라고 있는 것이다 — 다크 결과부터 본다
- 샌드박스가 마지막으로 연 프로젝트에 Typora 커스텀 CSS가 있으면 그 자체가 최악 조건 테스트다 (의도적으로 유용 — 클린 환경이 필요하면 `css off`)

## 보고 형식

8조합 결과를 표로: 조합 | 대비 | 레이아웃 | 정체성 | 특이사항. 실패 항목은 원인 셀렉터까지 특정해서 보고한다.
