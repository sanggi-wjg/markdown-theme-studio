#!/usr/bin/env python3
"""4테마 x 라이트/다크 = 8조합 전수 뷰어 품질 감사."""
import json
import os

from mts_shot import CDP, preview_target

HERE = os.path.dirname(os.path.abspath(__file__))
JS = open(os.path.join(HERE, "mts_audit.js")).read()

EXPECTED_FS = {"gh": 16.0, "nt": 16.5, "dc": 15.5, "rd": 18.0}
# del은 의도적 저대비(취소선), 통과 기준 완화
LOW_CONTRAST_OK = {"del": 1.8, "small": 3.0}
FAIL, WARN = 3.0, 4.5

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
            limit = LOW_CONTRAST_OK.get(k, FAIL)
            if c < limit:
                violations.append(f"[{combo}] {k}: 대비 {c} (FAIL <{limit}) bg={v['bg']}")
            elif c < WARN and k not in LOW_CONTRAST_OK:
                violations.append(f"[{combo}] {k}: 대비 {c} (WARN <4.5) bg={v['bg']}")

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
        expected_ta = "justify" if theme == "rd" else "start"
        if lay["pTextAlign"] != expected_ta:
            violations.append(f"[{combo}] p text-align={lay['pTextAlign']} (기대 {expected_ta})")

with open(os.path.join(HERE, "audit-full.json"), "w") as f:
    json.dump(report, f, ensure_ascii=False, indent=1)

print(f"총 위반: {len(violations)}건")
for v in violations:
    print(" -", v)
print("\n전체 데이터: audit-full.json")
