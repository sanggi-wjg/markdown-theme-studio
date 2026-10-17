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
- 판정 기준(mts_audit.py 실제 임계값): **전 요소** 대비 3.0 미만 FAIL, 4.5 미만 WARN — 둘 다 위반 목록에 출력된다(예외 임계값: `del` 1.8, `small` 3.0). FAIL은 무조건 수정, WARN도 원인 확인 없이 통과 처리하지 않는다. 가로 오버플로는 무조건 수정 대상

## 2.5 코드펜스 토큰 감사 — 코드블록 배경/글자색을 건드렸을 때 필수

- 전제: `fixtures/code-syntax.md`가 preview에 열려 있어야 한다. 샌드박스 기동 시 인자로 열 수 있다:
  `./gradlew runIde --args="$PWD $PWD/fixtures/code-syntax.md"` (프로젝트 창이 여럿이면 스크립트가 마커로 픽스처 창을 찾는다)
- `tools/.venv/bin/python tools/mts_tokens.py` — 기본 preview 베이스라인 + 4테마×2외관 9콤보에서 렉서 인라인 토큰의 WCAG 대비를 측정, `tools/tokens-full.json`에 기록
- 판정: **REGRESSION**(기본 preview에선 통과인데 우리 테마에서 FAIL) = 무조건 수정. **BASELINE-LIMIT**(기본에서도 FAIL) = IDE 스킴 한계로 기록만. 토큰 색은 실행 중 LaF의 에디터 스킴을 따르므로 라이트 LaF 1차 → 코드펜스 스코프(`mts-laf-dark`)를 건드렸으면 다크 LaF로 전환해 2차
- LaF 전환은 샌드박스 종료 후 `config/options/laf.xml`(themeId Experimental{Light,Dark})과 `config/options/colors.scheme.xml`(name Light/Dark)을 함께 바꾼다 — **스킴을 같이 안 바꾸면 LaF만 바뀐 혼합 상태로 측정이 오염된다** (실제로 겪음)

## 3. 회귀 — 해당되는 것만

- 번들 기능(copy 버튼 생존, 실행 아이콘 숨김, 링크·data URI 이미지 로드): `tools/.venv/bin/python tools/mts_review2.py features`
- 좁은 패널: `tools/.venv/bin/python tools/mts_review2.py narrow 400` → 확인 후 `clearemu`로 원복
- 위젯 키보드 접근성(위젯을 건드렸을 때 필수): `tools/.venv/bin/python tools/mts_review2.py widget` — Enter로 열기→선택 테마에 포커스, 방향키로 전환, Esc로 닫고 Aa로 포커스 복귀, 보이지 않는 포커스 대상 0. `ok: true`여야 한다
- 커스텀 CSS 경쟁: `css off` = 클린 환경 시뮬레이션, `css on` = Typora 최악 조건 복원

## 4. 스팟 체크

- 스크린샷: `tools/.venv/bin/python tools/mts_shot.py shot <gh|nt|dc|rd> <light|dark> <out.png>` → Read로 직접 눈 확인
- JS 평가: `tools/.venv/bin/python tools/mts_shot.py eval '<js>'`

## 함정 — 실제로 겪은 것들

- **위젯 패널 기하는 열린 상태에서만 의미가 있다.** 닫힌 패널(`hidden`)은 rect가 0이다 — `narrow`는 측정 순간에만 펼쳐 잰다. 패널 안 값(px)은 `getComputedStyle` 기반이라 테마 전환 직후 같은 eval에서 읽어도 된다
- 감사는 "라이트 정상 / 다크 깨짐" 패턴을 잡으라고 있는 것이다 — 다크 결과부터 본다
- 샌드박스가 마지막으로 연 프로젝트에 Typora 커스텀 CSS가 있으면 그 자체가 최악 조건 테스트다 (의도적으로 유용 — 클린 환경이 필요하면 `css off`)

## 보고 형식

8조합 결과를 표로: 조합 | 대비 | 레이아웃 | 정체성 | 특이사항. 실패 항목은 원인 셀렉터까지 특정해서 보고한다.
