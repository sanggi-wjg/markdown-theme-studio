# TODO

## 1. 라이트 모드 코드 신택스 대비 검증 루트 — 완료 (PR #13)

- [x] `fixtures/code-syntax.md` — 2계층 언어 픽스처 (IC 자동 감사 9언어 + 실사용 IDE 수동 확인 4언어)
- [x] `tools/mts_tokens.py` — 베이스라인+9콤보 토큰 대비 감사, REGRESSION/BASELINE-LIMIT 판정
- [x] 발견된 회귀 수정: nt/dc/rd 라이트 코드 배경 밝기 상향 + 코드펜스를 외관 대신 LaF(`mts-laf-dark`)에 묶어 외관 강제 시 토큰 안 읽히던 구조 문제 해결

남은 것: 실사용 IDE(Ultimate)에서 `fixtures/code-syntax.md` 2부(SQL·Python·JS/TS)를 열어 수동 확인 — 노란색 저대비가 재현되면 해당 스킴 색과 콤보를 기록할 것.

## 2. 테이블 열 너비 안정화 — 완료 (PR #14)

- [x] 원인 파악: 한글은 글자 단위 줄바꿈이라 min-content가 1글자 → auto 레이아웃이 한글 열을 세로 띠로 압착, 긴 코드 식별자·URL은 열 폭 독식
- [x] 수정: `th/td word-break: keep-all` + `th white-space: nowrap` + 셀 내 `code/a overflow-wrap: anywhere` — 부족한 폭은 기존 overflow-x 스크롤이 수용
- [x] `fixtures/tables.md` 병리 케이스 픽스처 + 4테마×2외관·좁은 패널 회귀 확인

## 3. 문서 폭(width) 조절 버튼 — 완료 (PR #16, 머지 대기)

- [x] 위젯에 W-/W+ 버튼 추가 (A-/A+ 패턴, `.mts-fs` 스타일·접힘 공유)
- [x] `--mts-w-offset` 인라인 변수(±3단계 × 80px)로 적용, localStorage `mts-width-offset`에 단계 수 저장
- [x] 테마 off 정책: 비활성 + "pick a theme first" 타이틀
