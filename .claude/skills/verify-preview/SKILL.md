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
2. CSS/JS는 preview **패널 생성 시점**에 서빙된다. 파일이 바뀌었으면 샌드박스 재시작이 확실한 반영 수단이다: 기존 runIde를 띄운 백그라운드 태스크를 종료(잔존 IDE 프로세스는 `pkill -f 'idea.plugin.in.sandbox.mode=true'` — 경로 기반 패턴은 실제 프로세스 커맨드라인과 안 맞고, `idea`류 광역 패턴은 사용자의 실제 IntelliJ를 죽일 수 있다) → `./gradlew runIde`를 백그라운드로 재실행
3. CDP 타겟 확인: `tools/.venv/bin/python tools/mts_shot.py list`
   - 포트는 9223 (build.gradle.kts의 runIde jvmArgs `-Dide.browser.jcef.debug.port=9223`로 설정)
   - preview 타겟이 안 보이면 샌드박스에서 md 파일이 열려 preview 패널이 떠 있는지부터 확인

## 2. 전수 감사 — 스타일 변경 시 필수

- `tools/.venv/bin/python tools/mts_audit.py`
- 요소 동물원을 주입해 4테마×2외관 8조합의 WCAG 대비·레이아웃·테마 정체성을 검사하고 `tools/audit-full.json`에 기록한다
- 판정 기준(mts_audit.py 실제 임계값): **전 요소** 대비 3.0 미만 FAIL, 4.5 미만 WARN — 둘 다 위반 목록에 출력된다(예외 임계값: `del` 1.8, `small` 3.0). FAIL은 무조건 수정, WARN도 원인 확인 없이 통과 처리하지 않는다. 가로 오버플로는 무조건 수정 대상

## 3. 회귀 — 해당되는 것만

- 번들 기능(copy 버튼 생존, 실행 아이콘 숨김, 링크·data URI 이미지 로드): `tools/.venv/bin/python tools/mts_review2.py features`
- 좁은 패널: `tools/.venv/bin/python tools/mts_review2.py narrow 400` → 확인 후 `clearemu`로 원복
- 커스텀 CSS 경쟁: `css off` = 클린 환경 시뮬레이션, `css on` = Typora 최악 조건 복원

## 4. 스팟 체크

- 스크린샷: `tools/.venv/bin/python tools/mts_shot.py shot <gh|nt|dc|rd> <light|dark> <out.png>` → Read로 직접 눈 확인
- JS 평가: `tools/.venv/bin/python tools/mts_shot.py eval '<js>'`

## 함정 — 실제로 겪은 것들

- **위젯 기하 측정은 보이는 상태에서만.** 숨김 상태(`mts-hidden`)는 `translateY(-8px)`가 걸려 rect가 8px 어긋난다. `window.scrollTo(0,0)`를 **별도 eval로 먼저** 보내고 ~200ms 뒤에 측정하거나 peek 상태를 만들 것 — transition(0.18s)과 scroll 이벤트 비동기 때문에 같은 eval 안에서 scrollTo+측정을 하면 여전히 어긋난다. (숨김 상태 측정으로 거짓 음성이 난 전례가 있다)
- 감사는 "라이트 정상 / 다크 깨짐" 패턴을 잡으라고 있는 것이다 — 다크 결과부터 본다
- 샌드박스가 마지막으로 연 프로젝트에 Typora 커스텀 CSS가 있으면 그 자체가 최악 조건 테스트다 (의도적으로 유용 — 클린 환경이 필요하면 `css off`)

## 보고 형식

8조합 결과를 표로: 조합 | 대비 | 레이아웃 | 정체성 | 특이사항. 실패 항목은 원인 셀렉터까지 특정해서 보고한다.
