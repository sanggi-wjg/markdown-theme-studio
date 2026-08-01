---
name: visual-diff
description: 스타일 변경의 before/after 스크린샷 비교 — 수정 전 기준 컷을 찍어두고 수정 후 같은 조합을 다시 찍어, 나란히 붙인 비교 페이지를 만들어 보여준다. 시각 피드백("깨져 보인다", "너무 작다" 등)을 처리하거나 수정 효과를 사용자에게 확인받을 때 사용.
---

# before/after 시각 비교

시각 피드백은 말로 "고쳤습니다"가 아니라 비교 컷으로 답한다. CDP 하네스는 verify-preview 스킬과 동일한 전제(샌드박스 + 포트 9223 + tools/.venv).

## 절차

1. **before 캡처 — 코드 수정 전에.** 변경이 영향을 주는 조합만 고른다(전역 변경일 때만 8조합 전부).
   ```
   tools/.venv/bin/python tools/mts_shot.py shot <테마> <light|dark> <스크래치패드>/before/<테마>-<외관>.png
   ```
2. 수정 적용 → 재배포(verify-preview 스킬 1단계: prepareSandbox + 샌드박스 재시작)
3. **after 캡처 — 같은 조합, 같은 조건.** 파일명 규칙 동일, `after/` 디렉토리에.
4. 비교 페이지 생성: HTML에 조합별로 before/after를 나란히 배치하고 발행한다. CSP 때문에 이미지는 반드시 data URI로 임베드한다:
   ```
   base64 -i <파일>.png
   ```
   각 쌍에 조합 라벨(테마·외관)과 변경 요지 캡션을 붙인다.

## 조건 통제 — 어기면 비교가 무효

- **외관은 light/dark로 고정해서 찍는다.** auto는 IDE LaF에 의존해 before/after 시점에 다를 수 있다
- 같은 문서, 같은 스크롤 위치에서 찍는다. 특정 요소가 대상이면 `mts_shot.py eval 'document.querySelector(...).scrollIntoView()'`로 위치를 맞춘 뒤 촬영
- 위젯(스위처/핸들)이 대상이면 상태를 명시적으로 만든다: 최상단(`window.scrollTo(0,0)`) = 스위처 노출, 스크롤 후 = 핸들 노출
- before를 못 찍고 지나쳤으면: 스크린샷은 워킹트리가 아니라 **샌드박스에 배포된 빌드**를 찍는다는 점에 주의. 수정본을 아직 배포하지 않았다면 지금 찍는 것이 곧 before다. 이미 배포했다면 `git stash` → `prepareSandbox` + 샌드박스 재시작 → before 촬영 → `git stash pop` → 재배포·재시작 후 after 촬영. before 없는 비교 페이지는 만들지 않는다
