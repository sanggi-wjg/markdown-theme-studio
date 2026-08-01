#!/usr/bin/env python3
"""번들 기능 회귀 + 좁은 패널 검사."""
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
        "var w=document.getElementById('mts-switcher');"
        "var rect=w?w.getBoundingClientRect():null;"
        "var first=document.querySelector('body h1, body h2, body p');"
        "var frect=first?first.getBoundingClientRect():null;"
        "JSON.stringify({viewportW: document.documentElement.clientWidth,"
        " widgetW: rect?Math.round(rect.width):null,"
        " widgetVisibleButtons: w?Array.from(w.querySelectorAll('button'))"
        "   .filter(function(b){return getComputedStyle(b).display!=='none';}).length:0,"
        " overlapsContent: (rect&&frect)? !(rect.bottom<frect.top||rect.right<frect.left||rect.left>frect.right) : null})"
    ))
    print(json.dumps(r, ensure_ascii=False))

elif cmd == "clearemu":
    cdp.call("Emulation.clearDeviceMetricsOverride")
    print("cleared")

elif cmd == "css":
    onoff = sys.argv[2] == "off"
    print(cdp.eval(
        "var l=Array.from(document.styleSheets).find(function(s){return (s.href||'').indexOf('inline.css')>=0;});"
        "l ? (l.ownerNode.disabled=%s, 'inline.css disabled=%s') : 'inline.css 없음(이미 클린 환경)'"
        % ("true" if onoff else "false", onoff)
    ))
