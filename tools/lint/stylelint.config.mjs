// 버그성 규칙만 쓴다(stylelint-config-recommended) + 프로젝트 계약.
// 서식·명명 규칙은 강제하지 않는다 — 리뷰 비용 대비 가치가 낮고 기존 주석 관례와 충돌한다.
export default {
  extends: ["stylelint-config-recommended"],
  rules: {
    // 계약: mts.css는 수동 !important 없이 쓴다 — Kotlin importantify()가 서빙 시 일괄 부여
    "declaration-no-important": true,
    // 서빙 시 전 선언이 !important라 순서가 아니라 특이도가 승부를 가른다. 공용 → 테마 구조상 낮은
    // 특이도가 뒤에 오는 쌍이 많지만(2026-10 기준 18건) 전수 확인 결과 겹치는 속성이 없거나 보정 규칙이
    // 있다 — 이 규칙은 그 구조를 오탐으로만 보고하므로 끈다
    "no-descending-specificity": null,
  },
};
