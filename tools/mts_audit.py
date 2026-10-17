#!/usr/bin/env python3
"""4테마 x 라이트/다크 = 8조합 전수 뷰어 품질 감사."""
import json
import os

from mts_shot import CDP, preview_target

HERE = os.path.dirname(os.path.abspath(__file__))
JS = open(os.path.join(HERE, "mts_audit.js")).read()

EXPECTED_FS = {"gh": 16.0, "nt": 16.5, "dc": 15.5, "rd": 18.0}
# 대비는 opacity를 그룹 합성한 실제 값이다(mts_audit.js finalColors). small은 FAIL 3.0만 본다
LOW_CONTRAST_OK = {"small": 3.0}
FAIL, WARN = 3.0, 4.5
# 취소선(del·마크다운 span.user-del) 안 글자(동물원 strike 표시)는 의도한 흐림이라 FAIL 3.0만 본다(WARN 없음).
# static-harness run.mjs·scan.js와 같은 기준
STRIKE_FAIL = 3.0

cdp = CDP(preview_target()["webSocketDebuggerUrl"])
report = {}
violations = []

for theme in ["gh", "nt", "dc", "rd"]:
    for ap in ["light", "dark"]:
        combo = f"{theme}-{ap}"
        cdp.eval(
            "document.documentElement.setAttribute('data-mts-theme', %r);"
            "document.documentElement.classList.toggle('mts-dark', %s);"
            % (theme, "true" if ap == "dark" else "false")
        )
        data = json.loads(cdp.eval(JS))
        report[combo] = data

        for k, v in data.items():
            if k.startswith("_"):
                continue
            if v == "MISSING":
                violations.append(f"[{combo}] {k}: 요소 렌더 실패(MISSING)")
                continue
            c = v.get("contrast")
            if c is None:
                continue
            limit = STRIKE_FAIL if v.get("strike") else LOW_CONTRAST_OK.get(k, FAIL)
            if c < limit:
                violations.append(f"[{combo}] {k}: 대비 {c} (FAIL <{limit}) bg={v['bg']}")
            elif c < WARN and not v.get("strike") and k not in LOW_CONTRAST_OK:
                violations.append(f"[{combo}] {k}: 대비 {c} (WARN <4.5) bg={v['bg']}")

        # commandRunner 실행 아이콘은 테마 활성 시 숨는다(CLAUDE.md 계약) — 보이면 위반. 숨긴 링크가
        # 칩에 자리를 남기거나 코드 텍스트까지 지우면 역시 위반
        run = data["_runIcons"]
        for v in run["visible"]:
            violations.append(f"[{combo}] 실행 아이콘 보임: {v}")
        if abs(run["chipDw"]) > 0.5 or abs(run["chipDh"]) > 0.5:
            violations.append(f"[{combo}] 실행 칩 크기 차이 Δw={run['chipDw']} Δh={run['chipDh']} (아이콘 없는 칩 대비)")
        if run["chipText"] != "./gradlew build":
            violations.append(f"[{combo}] 실행 칩 텍스트 손상: {run['chipText']!r}")

        # Mermaid 라벨 박스는 테마 off·클린과, 글자색은 mermaid 지정색과 같아야 한다(#59) — 동물원 라벨 3개 + 열린 문서
        mm = data["_mermaid"]
        if mm["zoo"] < 3:
            violations.append(f"[{combo}] Mermaid 동물원 라벨 {mm['zoo']}개 (기대 3) — 렌더 실패?")
        for d in mm["diffs"]:
            violations.append(f"[{combo}] Mermaid 라벨: {d}")
        # 표 셀 정렬(#62) — 셀·행 정렬이 기본 preview 그대로인지(기대값은 mts_audit.js가 테마 off로 잰다). 지정 없는 머리글은 왼쪽
        align = data["_align"]
        if align["cells"] < 11:
            violations.append(f"[{combo}] 표 정렬: 동물원 셀 {align['cells']}개 (기대 11개)")
        for v in align["bad"]:
            violations.append(f"[{combo}] 표 정렬: {v}")
        # 취소선 흐림은 두 형태(del·span.user-del) 모두 같아야 한다(#58)
        strike = data["_strike"]
        if not float(strike["opacity"]) < 1:
            violations.append(f"[{combo}] 취소선 흐림 없음: del opacity={strike['opacity']}")
        for v in strike["off"]:
            violations.append(f"[{combo}] 취소선 흐림 불일치: {v} (del {strike['opacity']})")

        lay = data["_layout"]
        if lay["bodyHScroll"] > 2:
            violations.append(f"[{combo}] body 가로 오버플로 {lay['bodyHScroll']}px")
        if lay["preOverflowX"] not in ("auto", "scroll"):
            violations.append(f"[{combo}] pre overflow-x={lay['preOverflowX']}")
        if lay["urlOverflows"]:
            violations.append(f"[{combo}] 긴 URL 문단이 넘침(줄바꿈 안 됨)")
        fs = float(lay["pFontSize"].replace("px", ""))
        if abs(fs - EXPECTED_FS[theme]) > 0.6:
            violations.append(f"[{combo}] 본문 크기 {fs}px (기대 {EXPECTED_FS[theme]}px)")
        # Reader도 justify를 쓰지 않는다 — 한글 justify가 자간까지 벌려 제거함
        if lay["pTextAlign"] != "start":
            violations.append(f"[{combo}] p text-align={lay['pTextAlign']} (기대 start)")

with open(os.path.join(HERE, "audit-full.json"), "w") as f:
    json.dump(report, f, ensure_ascii=False, indent=1)

print(f"총 위반: {len(violations)}건")
print(f"실행 링크: 문서 {report['gh-light']['_runIcons']['doc']}개 + 동물원 "
      f"{report['gh-light']['_runIcons']['total'] - report['gh-light']['_runIcons']['doc']}개 검사")
print(f"Mermaid 라벨: 문서 {report['gh-light']['_mermaid']['doc']}개 + 동물원 "
      f"{report['gh-light']['_mermaid']['zoo']}개 검사")
for v in violations:
    print(" -", v)
print("\n전체 데이터: audit-full.json")
