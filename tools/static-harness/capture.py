#!/usr/bin/env python3
"""실행 중인 preview(CDP 기본 9223, MTS_CDP_PORT로 변경)의 렌더 결과를 정적 스냅샷으로 저장한다 — CI 정적 렌더 하네스의 입력.

보통은 tools/static-harness/capture-all.sh <light|dark>로 돌린다(픽스처마다 샌드박스를 띄워 이 스크립트 호출).
단독 사용법: MTS_CAPTURE_PROJECT=<캡처용 프로젝트 경로> tools/.venv/bin/python tools/static-harness/capture.py <laf: light|dark>
  열려 있는 preview 타겟(픽스처)마다 snapshots/<laf>/<픽스처>.html, 참조 스타일시트는
  snapshots/<laf>/upstream/<이름>.css로 저장한다. 스크립트·위젯·우리 테마 속성은 걷어내고,
  mts.css 자리는 __MTS_CSS__ 자리표시자로 남겨 하네스가 서빙 바이트를 같은 cascade 위치에 꽂게 한다.
  코드펜스 토큰 색(렉서 인라인 스타일)과 colors.css는 캡처 시점 LaF를 따르므로 LaF별로 따로 찍는다.
"""
import hashlib
import json
import os
import re
import sys
import time
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from mts_shot import CDP, PORT  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

SNAPSHOT_JS = r"""
(function () {
  var doc = document.documentElement.cloneNode(true);
  doc.querySelectorAll('script').forEach(function (s) { s.remove(); });
  // CSP는 세션 포트가 박힌 스크립트 허용 목록이다 — 정적 하네스의 주입을 막고 diff 잡음만 된다
  doc.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach(function (m) { m.remove(); });
  doc.querySelectorAll('#mts-root, #mts-switcher, #mts-handle, #mts-audit').forEach(function (n) { n.remove(); });
  doc.removeAttribute('data-mts-theme');
  doc.removeAttribute('style');
  // 문서 언어·한글 표식은 mts.js가 판정해 다는 값 — 하네스가 서빙 JS로 다시 판정하므로 우리가 단 것만 걷어낸다
  if (doc.hasAttribute('data-mts-lang')) { doc.removeAttribute('lang'); doc.removeAttribute('data-mts-lang'); }
  doc.removeAttribute('data-mts-hangul');
  doc.classList.remove('mts-dark', 'mts-laf-dark');
  var sheets = [];
  doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
    var name = l.getAttribute('href').split('?')[0].split('/').pop();
    if (name === 'mts.css') { l.setAttribute('href', '__MTS_CSS__'); return; }
    sheets.push(name);
    l.setAttribute('href', 'upstream/' + name);
  });
  var css = {};
  Array.prototype.forEach.call(document.styleSheets, function (s) {
    if (!s.href) return;
    var name = s.href.split('?')[0].split('/').pop();
    if (sheets.indexOf(name) < 0) return;
    css[name] = Array.prototype.map.call(s.cssRules, function (r) { return r.cssText; }).join('\n');
  });
  var h1 = document.querySelector('h1');
  return JSON.stringify({ html: '<!doctype html>\n' + doc.outerHTML, css: css, h1: h1 ? h1.textContent : '' });
})()
"""

# 픽스처 식별 — body 텍스트가 아니라 h1로 (tables.md 본문에도 "Nebula Cache"가 있어 오매칭 전례)
FIXTURES = {"Element Zoo": "elements", "Nebula Cache — 아키텍처 개요": "sample",
            "Nebula Cache — Architecture Overview": "english"}


# capture-all.sh가 넘기는 캡처용 임시 프로젝트 경로
PROJECT = os.environ.get("MTS_CAPTURE_PROJECT")
LOCAL_PATH = re.compile(r"/(?:Users|home|private|var/folders|tmp)/[^\s\"'<>]+")


def main():
    laf = sys.argv[1]
    assert laf in ("light", "dark"), "laf는 light|dark"
    with urllib.request.urlopen("http://localhost:%d/json" % PORT, timeout=5) as r:
        targets = [t for t in json.loads(r.read())
                   if "markdown-preview-index" in t.get("url", "") and t.get("type") == "page"]
    out = os.path.join(HERE, "snapshots", laf)
    os.makedirs(os.path.join(out, "upstream"), exist_ok=True)
    saved = 0
    for t in targets:
        cdp = CDP(t["webSocketDebuggerUrl"])
        # 타겟이 떠도 본문은 첫 IncrementalDOM 패치 뒤에 채워진다 — H1이 생길 때까지 기다린 뒤
        # MathJax·Mermaid 렌더가 가라앉을 시간을 더 준다
        for _ in range(120):
            if cdp.eval("(document.querySelector('body h1') || {}).textContent || ''"):
                break
            time.sleep(0.5)
        time.sleep(3)
        snap = json.loads(cdp.eval(SNAPSHOT_JS))
        name = next((v for k, v in FIXTURES.items() if snap["h1"].startswith(k)), None)
        if name is None:
            print("건너뜀(알 수 없는 픽스처): %r" % snap["h1"])
            continue
        # 캡처 환경 고유 값(포트·세션 경로, md-src-pos)은 diff 잡음이라 제거
        html = re.sub(r'\smd-src-pos="[^"]*"', "", snap["html"])
        html = re.sub(r"http://localhost:\d+/markdownPreview/\d+/", "upstream/", html)
        # commandRunner 실행 링크의 명령 해시는 캡처(프로젝트 경로)마다 바뀐다 — 속성은 남기고(mts.css 숨김
        # 안전망 a[data-command]가 기댄다) 값만 고정
        html = re.sub(r'data-command="(\w+):[0-9a-f]{16,}"', r'data-command="\1:hash"', html)
        # 로컬 이미지 경로는 md 파일 디렉터리(= 캡처용 임시 프로젝트) 기준으로 풀린다 — 코드펜스 복사
        # 버튼 아이콘처럼 빈 경로도 프로젝트 경로가 된다. 실행마다 바뀌고 사용자 로컬 경로가 커밋되므로
        # 고정 토큰으로 바꾼다(macOS는 /var ↔ /private/var 두 표기가 섞여 둘 다)
        for proj in sorted(filter(None, {PROJECT and os.path.normpath(PROJECT), PROJECT and os.path.realpath(PROJECT)}),
                           key=len, reverse=True):
            html = html.replace(proj, "project")
        leak = LOCAL_PATH.search(html)
        if leak:
            sys.exit("로컬 경로가 스냅샷에 남음: %r — MTS_CAPTURE_PROJECT(캡처용 프로젝트 경로)를 지정할 것"
                     % html[max(0, leak.start() - 60):leak.end() + 60])
        with open(os.path.join(out, name + ".html"), "w") as f:
            f.write(html)
        # 어느 픽스처 내용으로 찍었는지 — run.mjs가 현재 fixtures/<이름>.md와 비교해 낡은 스냅샷을 거부한다
        # (HTML 안에 두면 doctype 앞 주석이 quirks 모드를 부를 수 있어 옆 파일로)
        with open(os.path.join(HERE, "..", "..", "fixtures", name + ".md"), "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        with open(os.path.join(out, name + ".fixture-sha256"), "w") as f:
            f.write(digest + "\n")
        for css_name, text in snap["css"].items():
            with open(os.path.join(out, "upstream", css_name), "w") as f:
                f.write(text + "\n")
        print("saved %s/%s.html (+%d css)" % (laf, name, len(snap["css"])))
        saved += 1
    if not saved:
        sys.exit("저장된 픽스처 없음 — preview에 fixtures/elements.md·sample.md가 열려 있어야 한다")


if __name__ == "__main__":
    main()
