#!/usr/bin/env python3
"""IDE 설정 동기화(ThemeStudioSettings ↔ preview) 실렌더 검사 — CDP.

preview를 여러 개 띄웠으면 MTS_TARGET=<번호>로 고른다(번호는 targets 출력).
  mts_sync.py targets            preview 타겟 목록(번호·h1)
  mts_sync.py state              프리루드(window.__mtsIde)·mts-* localStorage·적용 상태
  mts_sync.py ask                mts:ready를 보내 IDE 현재 상태 응답을 받는다(메모리 상태 확인)
  mts_sync.py legacy             이전 버전 사용자의 localStorage를 만든다(동기화 기록 없음) — 뒤이어 reload
  mts_sync.py clearls            mts-* localStorage 삭제(포트가 바뀐 origin 흉내)
  mts_sync.py reload             페이지 재로드(본문은 사라진다 — IDE가 다시 안 보냄. 위젯·상태 검사엔 무관).
                                 같은 URL이라 프리루드는 304 캐시본(옛 값) — mts:ready 응답이 보정하는지 확인용
  mts_sync.py pick <gh|nt|dc|rd|off>   위젯 카드 클릭
  mts_sync.py fs <+1|-1>         위젯 글자 크기 단계
  mts_sync.py extset '<data>'    브리지를 거치지 않고 mts:set을 직접 post — IDE 쪽 변경 경로 흉내
                                 (seq는 위젯보다 큰 값으로, 예: 'seq=999&theme=dc'). 허용 밖 값이면 무시돼야 한다
  mts_sync.py block              이 페이지에서 messagePipe를 없애고 재로드(JS 쪽 BrowserPipe 부재 흉내)

Kotlin 쪽 BrowserPipe 부재는 IDE를 -DmarkdownThemeStudio.browserPipe.disabled=true로 띄워 재현한다.
"""
import json
import sys
import time
import urllib.request

from mts_shot import CDP, PORT

STATE = r"""JSON.stringify({
 ide: window.__mtsIde || null,
 ls: Object.keys(localStorage).filter(function(k){return k.indexOf('mts-')===0}).sort()
     .reduce(function(o,k){o[k]=localStorage.getItem(k);return o;},{}),
 theme: document.documentElement.getAttribute('data-mts-theme') || 'off',
 dark: document.documentElement.classList.contains('mts-dark'),
 fsVar: document.documentElement.style.getPropertyValue('--mts-fs-offset'),
 wVar: document.documentElement.style.getPropertyValue('--mts-w-offset'),
 checked: (function(){var c=document.querySelector('#mts-panel .mts-themes [aria-checked="true"]');
   return c?c.getAttribute('data-mts-id'):null;})(),
 origin: location.origin,
 pipe: !!(window.__IntelliJTools && window.__IntelliJTools.messagePipe),
 bridge: !!window.__mtsSync
})"""

# 페이지 스크립트보다 먼저 실행 — BrowserPipe.js가 messagePipe를 달지 못하게 막는다
BLOCK = r"""(function(){
  var t = {};
  Object.defineProperty(t, 'messagePipe', {get: function(){ return undefined; }, set: function(v){}, configurable: false});
  Object.defineProperty(window, '__IntelliJTools', {value: t, writable: false, configurable: false});
})();"""


def previews():
    with urllib.request.urlopen(f"http://localhost:{PORT}/json", timeout=5) as r:
        ts = json.loads(r.read())
    return [t for t in ts if "markdown-preview-index" in t.get("url", "") and t.get("type") == "page"]


def connect():
    import os
    ts = previews()
    if not ts:
        raise SystemExit("markdown preview 타겟 없음 — preview 패널이 열려 있어야 함")
    return CDP(ts[int(os.environ.get("MTS_TARGET", "0"))]["webSocketDebuggerUrl"])


def show(c, indent=None):
    print(json.dumps(json.loads(c.eval(STATE)), ensure_ascii=False, indent=indent))


def main():
    cmd = sys.argv[1]
    if cmd == "targets":
        for i, t in enumerate(previews()):
            h1 = CDP(t["webSocketDebuggerUrl"]).eval("(document.querySelector('h1')||{}).textContent || ''")
            print(i, t["url"].split("?")[0][-60:], "|", h1)
        return
    c = connect()
    if cmd == "state":
        show(c, 1)
    elif cmd == "ask":
        c.eval("(function(){ window.__mtsProbe = window.__mtsProbe || [];"
               " if (!window.__mtsProbeSub) { window.__mtsProbeSub = true;"
               "  __IntelliJTools.messagePipe.subscribe('mts:state', function(d){ window.__mtsProbe.push(d); }); }"
               " window.__mtsProbe.length = 0; __IntelliJTools.messagePipe.post('mts:ready', ''); })()")
        time.sleep(1.0)
        print(c.eval("JSON.stringify(window.__mtsProbe)"))
    elif cmd == "legacy":
        c.eval("localStorage.setItem('mts-theme','rd'); localStorage.setItem('mts-appearance','dark');"
               " localStorage.setItem('mts-fs-offset','2'); localStorage.setItem('mts-width-offset','-1');"
               " localStorage.removeItem('mts-ide-rev'); localStorage.removeItem('mts-pending');")
        show(c)
    elif cmd == "clearls":
        c.eval("Object.keys(localStorage).filter(function(k){return k.indexOf('mts-')===0})"
               ".forEach(function(k){localStorage.removeItem(k);})")
        show(c)
    elif cmd == "reload":
        c.call("Page.reload")
        time.sleep(3)
        show(c, 1)
    elif cmd == "pick":
        c.eval("document.querySelector('#mts-panel [data-mts-id=\"%s\"]').click()" % sys.argv[2])
        time.sleep(0.8)
        show(c)
    elif cmd == "fs":
        cls = "plus" if sys.argv[2] == "+1" else "minus"
        c.eval("(function(){var p=document.getElementById('mts-panel'); var was=p.hidden; p.hidden=false;"
               " document.querySelector('#mts-panel .mts-fs-%s').click(); p.hidden=was;})()" % cls)
        time.sleep(0.8)
        show(c)
    elif cmd == "extset":
        c.eval("__IntelliJTools.messagePipe.post('mts:set', %s)" % json.dumps(sys.argv[2]))
        time.sleep(0.8)
        show(c)
    elif cmd == "block":
        # addScriptToEvaluateOnNewDocument는 Page 도메인을 켜야 듣고, 이 CDP 세션이 끊기면 풀린다 —
        # 같은 세션에서 재로드해 그 문서에만 적용한다
        c.call("Page.enable")
        c.call("Page.addScriptToEvaluateOnNewDocument", source=BLOCK)
        c.call("Page.reload")
        time.sleep(3)
        show(c, 1)
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
