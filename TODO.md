# TODO

## 1. 라이트 모드 코드 신택스 대비 검증 루트 — 완료 (feat/code-syntax-audit)

- [x] `fixtures/code-syntax.md` — 2계층 언어 픽스처 (IC 자동 감사 9언어 + 실사용 IDE 수동 확인 4언어)
- [x] `tools/mts_tokens.py` — 베이스라인+9콤보 토큰 대비 감사, REGRESSION/BASELINE-LIMIT 판정
- [x] 발견된 회귀 수정: nt/dc/rd 라이트 코드 배경 밝기 상향 + 코드펜스를 외관 대신 LaF(`mts-laf-dark`)에 묶어 외관 강제 시 토큰 안 읽히던 구조 문제 해결

남은 것: 실사용 IDE(Ultimate)에서 `fixtures/code-syntax.md` 2부(SQL·Python·JS/TS)를 열어 수동 확인 — 노란색 저대비가 재현되면 해당 스킴 색과 콤보를 기록할 것.

## 2. 테이블 열 너비 안정화

- [ ] 열 크기가 제멋대로 잡히는 원인 파악 (기본 `table-layout: auto` + 콘텐츠 기반 배분)
- [ ] 개선 방향 검토 후 수정: `table-layout: fixed` vs `min-width`/`max-width` 가드 vs 셀 `white-space`/`word-break` 조정 등 — 좁은 패널(`mts_review2.py narrow`)에서도 깨지지 않아야 함
- [ ] 수정 후 `/verify-preview`로 4테마×2외관 + 좁은 패널 회귀 확인

배경: 테이블 열 너비가 콘텐츠에 따라 들쭉날쭉해서 읽기 불편하다.

## 3. 문서 폭(width) 조절 버튼

- [ ] 스위처 위젯에 폰트 크기(±) 버튼과 같은 방식의 문서 폭 조절 컨트롤 추가
- [ ] 폭 값은 CSS 변수(예: `--mts-width-offset` 또는 단계형 max-width)로 적용, localStorage에 저장
- [ ] 테마 off(Default) 상태에서의 동작 정책 결정 (위젯은 테마 스코프 밖이지만 본문 폭은 테마 규칙에 의존)

배경: 테마별 고정 max-width가 화면/취향에 안 맞을 수 있어, 폰트 크기 조절처럼 사용자가 직접 조절하고 싶다.
