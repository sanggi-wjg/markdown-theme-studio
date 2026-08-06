#!/usr/bin/env python3
"""Markdown preview 검증용 CDP 클라이언트.
사용법:
  mts_shot.py list                          # 디버깅 타겟 나열
  mts_shot.py shot <theme> <light|dark> <out.png>   # 테마 적용 후 스크린샷
  mts_shot.py eval '<js>'                   # preview 페이지에서 JS 평가
"""
import json
import sys
import base64
import urllib.request

import websocket

PORT = 9223


def targets():
    with urllib.request.urlopen(f"http://localhost:{PORT}/json", timeout=5) as r:
        return json.loads(r.read())


def preview_targets():
    """열려 있는 모든 markdown preview 타겟 (프로젝트 창마다 하나씩 나올 수 있다)."""
    return [t for t in targets()
            if "markdown-preview-index" in t.get("url", "") and t.get("type") == "page"]


def preview_target():
    found = preview_targets()
    if not found:
        raise SystemExit("markdown preview 타겟 없음 — preview 패널이 열려 있어야 함")
    return found[0]


class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=15)
        self.mid = 0

    def call(self, method, **params):
        self.mid += 1
        self.ws.send(json.dumps({"id": self.mid, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.mid:
                if "error" in msg:
                    raise SystemExit(f"CDP error: {msg['error']}")
                return msg.get("result", {})

    def eval(self, expr):
        r = self.call("Runtime.evaluate", expression=expr, returnByValue=True)
        return r.get("result", {}).get("value")


def main():
    cmd = sys.argv[1]
    if cmd == "list":
        for t in targets():
            print(t.get("type"), "|", t.get("url", "")[:110])
        return

    t = preview_target()
    cdp = CDP(t["webSocketDebuggerUrl"])

    if cmd == "eval":
        print(json.dumps(cdp.eval(sys.argv[2]), ensure_ascii=False, indent=1))
        return

    if cmd == "shot":
        theme, appearance, out = sys.argv[2], sys.argv[3], sys.argv[4]
        cdp.eval(
            "document.documentElement.setAttribute('data-mts-theme', %r);"
            "document.documentElement.classList.toggle('mts-dark', %s);"
            % (theme, "true" if appearance == "dark" else "false")
        )
        shot = cdp.call("Page.captureScreenshot", format="png")
        with open(out, "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        print("saved", out)


if __name__ == "__main__":
    main()
