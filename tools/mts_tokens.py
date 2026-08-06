#!/usr/bin/env python3
"""코드펜스 토큰 색 대비 감사 — fixtures/code-syntax.md가 preview에 열려 있어야 한다.

측정: 테마 off 베이스라인(기본 preview) + 4테마 x 2외관 = 9콤보.
토큰 색은 실행 중인 IDE LaF가 결정하므로 결과에 LaF를 명기한다. LaF와 외관이
다른 콤보(예: 라이트 LaF 토큰 + 다크 외관)는 '미스매치'로 표시한다 — 위젯에서
외관을 강제하면 실제로 발생하는 조합이다.

판정: FAIL < 3.0, WARN < 4.5 (mts_audit.py와 동일).
베이스라인에서도 FAIL인 토큰은 BASELINE-LIMIT(IDE 스킴 한계), 베이스라인은
통과하는데 테마에서 FAIL이면 REGRESSION(우리 배경이 악화시킨 것 — 수정 대상).
"""
import json
import os
import sys

from mts_shot import CDP, preview_targets

HERE = os.path.dirname(os.path.abspath(__file__))
JS = open(os.path.join(HERE, "mts_tokens.js")).read()

FAIL, WARN = 3.0, 4.5

MARKER = "(document.body.textContent||'').indexOf('mts-code-syntax-fixture')>=0"


def fixture_cdp():
    """preview 타겟이 여러 프로젝트 창에 걸쳐 있을 수 있어 마커로 픽스처 창을 찾는다."""
    found = preview_targets()
    if not found:
        raise SystemExit("markdown preview 타겟 없음 — preview 패널이 열려 있어야 함")
    for t in found:
        c = CDP(t["webSocketDebuggerUrl"])
        if c.eval(MARKER):
            return c
        c.ws.close()
    raise SystemExit(f"preview 타겟 {len(found)}개 중 fixtures/code-syntax.md가 열린 창 없음 "
                     "(마커 'mts-code-syntax-fixture' 미검출)")


cdp = fixture_cdp()

orig = json.loads(cdp.eval(
    "JSON.stringify({t: document.documentElement.getAttribute('data-mts-theme'),"
    " d: document.documentElement.classList.contains('mts-dark')})"
))


def set_state(theme, dark):
    if theme is None:
        cdp.eval("document.documentElement.removeAttribute('data-mts-theme')")
    else:
        cdp.eval("document.documentElement.setAttribute('data-mts-theme', %r)" % theme)
    cdp.eval("document.documentElement.classList.toggle('mts-dark', %s)"
             % ("true" if dark else "false"))


PLAIN = "__plain__"  # 렉서가 색을 안 입힌 텍스트(--mts-pre-fg)의 baseline 키


def collect():
    data = json.loads(cdp.eval(JS))
    if data.get("error") == "fixture-not-open":
        raise SystemExit("fixtures/code-syntax.md가 preview에 열려 있지 않음 "
                         "(마커 'mts-code-syntax-fixture' 미검출)")
    return data


report = {}
try:
    set_state(None, False)
    base = collect()
    laf = base["laf"]
    report["off"] = base

    baseline = {}
    for b in base["blocks"]:
        baseline[(b["lang"], PLAIN)] = b["plainContrast"]
        for t in b["tokens"]:
            baseline[(b["lang"], t["color"])] = t["contrast"]

    for theme in ["gh", "nt", "dc", "rd"]:
        for ap in ["light", "dark"]:
            set_state(theme, ap == "dark")
            report[f"{theme}-{ap}"] = collect()
finally:
    set_state(orig["t"], orig["d"])

violations = []
plain_blocks = []


def judge(label, lang, key, c, color_desc, sample, bg):
    if c is None or c >= WARN:
        return
    base_c = baseline.get((lang, key))
    if c < FAIL:
        tag = ("REGRESSION" if base_c is not None and base_c >= FAIL
               else "BASELINE-LIMIT" if base_c is not None else "")
        level = "FAIL"
    else:
        tag, level = "", "WARN"
    violations.append(
        f"[{label}] {lang} {color_desc} '{sample}' "
        f"대비 {c} ({level}{' ' + tag if tag else ''}"
        f"{', 기본 ' + str(base_c) if base_c is not None else ''}) bg={bg}"
    )


for combo, data in report.items():
    if combo != "off":
        ap = combo.split("-")[1]
        label = combo + (" 미스매치" if laf != "unknown" and ap != laf else "")
    else:
        label = combo
    for b in data["blocks"]:
        if combo == "off" and not b["tokens"] and "컨트롤" not in b["lang"]:
            plain_blocks.append(b["lang"])
        # 렉서 비착색 텍스트(--mts-pre-fg)도 동일 기준으로 판정
        judge(label, b["lang"], PLAIN, b["plainContrast"], "(pre 기본색)", "(플레인 텍스트)", b["bg"])
        if "컨트롤" in b["lang"] and b["tokens"]:
            violations.append(f"[{combo}] 컨트롤 블록에 토큰 색 검출 — 픽스처/수집기 점검 필요")
            continue
        for t in b["tokens"]:
            judge(label, b["lang"], t["color"], t["contrast"], t["color"], t["sample"], b["bg"])

with open(os.path.join(HERE, "tokens-full.json"), "w") as f:
    json.dump({"laf": laf, "report": report}, f, ensure_ascii=False, indent=1)

print(f"IDE LaF: {laf} — 이 실행은 {laf} LaF 토큰만 측정함 (다크 LaF는 LaF 전환 후 재실행)")
if plain_blocks:
    print(f"민무늬 블록(렉서 없음, 실사용 IDE에서 수동 확인): {', '.join(plain_blocks)}")
print(f"총 위반: {len(violations)}건")
for v in violations:
    print(" -", v)
print("\n전체 데이터: tokens-full.json")
