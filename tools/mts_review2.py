#!/usr/bin/env python3
"""번들 기능 회귀 + 좁은 패널 + 위젯 키보드 접근성 검사."""
import json
import sys

from mts_shot import CDP, preview_target

cdp = CDP(preview_target()["webSocketDebuggerUrl"])
cmd = sys.argv[1]

if cmd == "features":
    features = json.loads(cdp.eval(
        "JSON.stringify({"
        " codeFences: document.querySelectorAll('.code-fence').length,"
        " copyBtns: document.querySelectorAll('.code-fence-highlighter-copy-button').length,"
        " copyBtnDisplay: (function(){var b=document.querySelector('.code-fence-highlighter-copy-button');"
        "   return b ? getComputedStyle(b).display : 'no-element';})(),"
        " runIconsHidden: (function(){var r=document.querySelector('.run-icon');"
        "   return r ? getComputedStyle(r).display : 'no-element';})(),"
        # 실행 링크 전수(펜스 블록·줄, 인라인 코드·표 셀) — 테마 활성 시 visible이 비어야 한다
        " runLinks: (function(){var a=Array.from(document.querySelectorAll('a[data-command]'));"
        "   return {total: a.length, visible: a.filter(function(x){var i=x.querySelector('img');"
        "     return x.getClientRects().length>0 || (i && i.getClientRects().length>0);})"
        "     .map(function(x){return x.className;})};})(),"
        " loadedScripts: Array.from(document.querySelectorAll('script[src]'))"
        "   .map(function(s){return s.src.split('/').pop().split('?')[0];}),"
        " links: document.querySelectorAll('a[href]').length"
        "})"
    ))
    img = cdp.call(
        "Runtime.evaluate",
        expression=(
            "new Promise(function(r){var i=new Image();"
            "i.onload=function(){r('loaded:'+i.naturalWidth+'x'+i.naturalHeight)};"
            "i.onerror=function(){r('ERROR')};"
            "i.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';})"
        ),
        awaitPromise=True, returnByValue=True,
    )["result"].get("value")
    features["imgDataUri"] = img
    print(json.dumps(features, ensure_ascii=False, indent=1))

elif cmd == "narrow":
    width = int(sys.argv[2])
    cdp.call("Emulation.setDeviceMetricsOverride",
             width=width, height=900, deviceScaleFactor=0, mobile=False)
    r = json.loads(cdp.eval(
        "window.scrollTo(0,0);"
        "var a=document.getElementById('mts-aa');"
        "var rect=a?a.getBoundingClientRect():null;"
        "var first=document.querySelector('body h1, body h2, body p');"
        "var frect=first?first.getBoundingClientRect():null;"
        "var p=document.getElementById('mts-panel'); var wasHidden=p.hidden; p.hidden=false;"
        "var prect=p.getBoundingClientRect(); p.hidden=wasHidden;"
        "JSON.stringify({viewportW: document.documentElement.clientWidth,"
        " aaW: rect?Math.round(rect.width):null,"
        " panelLeft: Math.round(prect.left), panelRight: Math.round(prect.right),"
        " panelInViewport: prect.left>=0 && prect.right<=document.documentElement.clientWidth,"
        " overlapsContent: (rect&&frect)? !(rect.bottom<frect.top||rect.right<frect.left||rect.left>frect.right) : null})"
    ))
    print(json.dumps(r, ensure_ascii=False))

elif cmd == "widget":
    # 키보드 접근성 회귀 — 실제 키 입력(CDP Input)으로 열기·방향키·Esc·포커스 복귀를 검증
    import time

    def key(k, code, vk, text=None):
        # 버튼 활성화(Enter/Space)는 text가 있는 keyDown이어야 click으로 이어진다 — 없으면 keydown만 발생
        extra = {"text": text, "unmodifiedText": text} if text else {}
        cdp.call("Input.dispatchKeyEvent", type="keyDown", key=k, code=code,
                 windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk, **extra)
        cdp.call("Input.dispatchKeyEvent", type="keyUp", key=k, code=code,
                 windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk)
        time.sleep(0.15)

    state = ("JSON.stringify({open: !document.getElementById('mts-panel').hidden,"
             " expanded: document.getElementById('mts-aa').getAttribute('aria-expanded'),"
             " theme: document.documentElement.getAttribute('data-mts-theme') || 'off',"
             " focus: (function(e){return e ? (e.id || e.getAttribute('data-mts-id') || e.tagName) : null;})"
             "(document.activeElement)})")
    # 시작 상태를 맞춘다: 패널 닫힘 + Aa 포커스 (이전 조작으로 열려 있으면 Enter가 닫는 쪽으로 토글된다).
    # mts_audit·mts_shot은 data-mts-theme을 직접 바꿔 위젯 내부 상태와 어긋나므로 위젯 경로로 다시 맞춘다
    cdp.eval("(function(){var p=document.getElementById('mts-panel');"
             " if(!p.hidden) document.getElementById('mts-aa').click();"
             " var t=document.documentElement.getAttribute('data-mts-theme')||'off';"
             " p.querySelector('[data-mts-id=\"'+t+'\"]').click();})()")
    before = json.loads(cdp.eval(state))["theme"]
    cdp.eval("document.getElementById('mts-aa').focus()")
    steps = {}
    key("Enter", "Enter", 13, "\r"); steps["enter"] = json.loads(cdp.eval(state))
    key("ArrowRight", "ArrowRight", 39); steps["arrowRight"] = json.loads(cdp.eval(state))
    key("Escape", "Escape", 27); steps["escape"] = json.loads(cdp.eval(state))
    # 원래 테마로 복원
    cdp.eval("(function(){var b=document.querySelector('#mts-panel [data-mts-id=\"%s\"]'); b.click();})()" % before)
    hidden_focusable = json.loads(cdp.eval(
        "JSON.stringify(Array.from(document.querySelectorAll('#mts-root button')).filter(function(b){"
        " var r=b.getBoundingClientRect(); return b.tabIndex>=0 && !b.disabled && (r.width===0||r.height===0)"
        " && !b.closest('[hidden]');}).length)"))
    # 포커스 유실 엣지(리뷰에서 재현된 것들) — 각 시나리오 뒤 Esc가 닫고 Aa로 돌아와야 한다
    st = ("JSON.stringify({open: !document.getElementById('mts-panel').hidden,"
          " focus: (function(e){return e.id || e.className || e.tagName;})(document.activeElement)})")

    def opened(focus_js):
        cdp.eval("(function(){var p=document.getElementById('mts-panel');"
                 " if(p.hidden) document.getElementById('mts-aa').click(); %s;})()" % focus_js)
        time.sleep(0.15)

    edges = {}
    # A: 스테퍼 끝값 도달 — 비활성화되는 버튼의 포커스가 짝 버튼으로 옮겨져야 한다
    opened("document.querySelector('#mts-panel .mts-fs-plus').focus()")
    for _ in range(7):
        key("Enter", "Enter", 13, "\r")
    edges["maxReached"] = json.loads(cdp.eval(st))
    key("Escape", "Escape", 27)
    edges["maxReachedEsc"] = json.loads(cdp.eval(st))
    cdp.eval("localStorage.removeItem('mts-fs-offset')")
    # B: 패널 안 빈 곳(헤딩) 클릭 — 포커스가 패널에 남아 Esc가 들어야 한다
    opened("")
    r = json.loads(cdp.eval("(function(){var h=document.querySelector('#mts-panel .mts-heading')"
                            ".getBoundingClientRect(); return JSON.stringify([h.left+4, h.top+4]);})()"))
    for t in ("mousePressed", "mouseReleased"):
        cdp.call("Input.dispatchMouseEvent", type=t, x=r[0], y=r[1], button="left", clickCount=1)
    time.sleep(0.15)
    edges["blankClick"] = json.loads(cdp.eval(st))
    key("Escape", "Escape", 27)
    edges["blankClickEsc"] = json.loads(cdp.eval(st))
    # C: 마지막 요소(Reset all)에서 Tab으로 문서 밖 — 패널이 닫혀야 한다
    opened("document.querySelector('#mts-panel .mts-reset').focus()")
    key("Tab", "Tab", 9)
    time.sleep(0.15)
    edges["tabOut"] = json.loads(cdp.eval(st))
    # 글자 크기 오프셋 원복(A가 바꾼 값) — 위젯 경로로
    cdp.eval("(function(){var p=document.getElementById('mts-panel'); if(p.hidden) document.getElementById('mts-aa').click();"
             " for(var i=0;i<7;i++) document.querySelector('#mts-panel .mts-fs-minus').click();"
             " for(var j=0;j<3;j++) document.querySelector('#mts-panel .mts-fs-plus').click();"
             " document.getElementById('mts-aa').click();})()")
    # D: 짧은 preview(높이 300) — fixed 패널의 마지막 컨트롤까지 패널 스크롤로 닿아야 한다
    cdp.call("Emulation.setDeviceMetricsOverride", width=800, height=300, deviceScaleFactor=0, mobile=False)
    time.sleep(0.3)
    opened("")
    edges["short300"] = json.loads(cdp.eval(
        "(function(){var p=document.getElementById('mts-panel'), b=document.querySelector('#mts-panel .mts-reset');"
        " b.scrollIntoView({block:'nearest'}); var r=b.getBoundingClientRect(), pr=p.getBoundingClientRect();"
        " return JSON.stringify({panelFits: pr.bottom <= innerHeight, resetReachable: r.top >= 0 && r.bottom <= innerHeight});})()"))
    cdp.eval("document.getElementById('mts-aa').click()")
    cdp.call("Emulation.clearDeviceMetricsOverride")
    edge_ok = (edges["short300"]["panelFits"] and edges["short300"]["resetReachable"]
               and edges["maxReached"]["open"] and edges["maxReached"]["focus"].endswith("mts-fs-minus")
               and not edges["maxReachedEsc"]["open"] and edges["maxReachedEsc"]["focus"] == "mts-aa"
               and edges["blankClick"]["open"] and edges["blankClick"]["focus"] == "mts-panel"
               and not edges["blankClickEsc"]["open"]
               and not edges["tabOut"]["open"])
    ok = (steps["enter"]["open"] and steps["enter"]["focus"] == before
          and steps["arrowRight"]["theme"] != before
          and not steps["escape"]["open"] and steps["escape"]["focus"] == "mts-aa"
          and hidden_focusable == 0 and edge_ok)
    print(json.dumps({"ok": ok, "steps": steps, "edges": edges, "hiddenFocusable": hidden_focusable},
                     ensure_ascii=False, indent=1))

elif cmd == "clearemu":
    cdp.call("Emulation.clearDeviceMetricsOverride")
    print("cleared")

elif cmd == "css":
    off = sys.argv[2] == "off"
    # 비활성 <link>의 시트는 document.styleSheets에서 빠져 다시 켤 대상을 못 찾는다 — link 요소로 찾는다.
    # 커스텀 CSS가 없는 프로젝트도 빈 inline.css가 로드되므로 끄기 직전 규칙 수로 클린 여부를 보여 준다
    # (다시 켠 직후엔 sheet가 아직 붙지 않는다)
    print(cdp.eval(
        "var l=Array.from(document.querySelectorAll('link[rel~=stylesheet]'))"
        ".find(function(e){return (e.href||'').indexOf('inline.css')>=0;});"
        "var n=l && l.sheet ? l.sheet.cssRules.length : null;"
        "l ? (l.disabled=%s, 'inline.css disabled=' + l.disabled + (n === null ? '' : ' (규칙 ' + n + '개)'))"
        " : 'inline.css 링크 없음'"
        % ("true" if off else "false")
    ))
