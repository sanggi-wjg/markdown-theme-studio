// 정적 렌더 하네스의 실제 DOM 대비 스캔 — run.mjs가 `(<이 파일>)(대상)`으로 페이지에서 평가한다.
// 대상 'body': 실제 스냅샷 본문의 글자 노드 전부(감사 동물원·코드펜스 등 제외) + 본문 단 폭.
// 대상 'widget': #mts-root(테마 스위처)의 보이는 글자 노드 전부 — axe color-contrast는 fixed 위젯 위에서
//   전부 incomplete(판정 불가)로 끝나 직접 잰다.
// 색 파싱·휘도·대비는 tools/mts_audit.js와 같은 식(복사 — 바꾸면 함께). 다른 점 하나: mts_audit.js는
// opacity를 대비에 곱하는 근사인데, 여기선 opacity 그룹을 실제 합성식으로 배경 위에 섞는다. 휴지 상태
// Aa 버튼(opacity 0.7)처럼 불투명 배경째 반투명한 요소는 곱셈 근사가 대비를 2배 가까이 높게 잡는다.
(function (target) {
  'use strict';

  function parse(c) {
    var m = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/.exec(c || '');
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    m = /color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)/.exec(c || '');
    if (m) return { r: m[1] * 255, g: m[2] * 255, b: m[3] * 255, a: m[4] === undefined ? 1 : +m[4] };
    return null;
  }
  function lum(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function blend(top, bot) {
    var a = top.a;
    return { r: top.r * a + bot.r * (1 - a), g: top.g * a + bot.g * (1 - a), b: top.b * a + bot.b * (1 - a), a: 1 };
  }
  function contrast(fg, bg) {
    var L1 = lum(fg), L2 = lum(bg);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }
  function rgb(c) { return 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')'; }

  var WHITE = { r: 255, g: 255, b: 255, a: 1 };
  var unparsed = [];
  function colorOf(el, prop) {
    var v = getComputedStyle(el)[prop];
    var c = parse(v);
    if (!c && unparsed.indexOf(v) < 0) unparsed.push(v);
    return c || { r: 0, g: 0, b: 0, a: 0 };
  }
  // 캔버스: html 배경이 없으면 body 배경이 캔버스로 전파된다(테마 off에서 위젯 뒤 = IDE·커스텀 body 배경)
  function canvas() {
    var h = colorOf(document.documentElement, 'backgroundColor');
    return h.a > 0 ? WHITE : blend(colorOf(document.body, 'backgroundColor'), WHITE);
  }

  // 글자 노드 위치의 최종 (글자색, 배경색). 조상 사슬을 바깥부터 칠하고, opacity < 1인 요소는 그 하위를
  // 칠한 결과를 요소 아래 색과 opacity 비율로 섞는다(그룹 합성과 같은 식 — 하위에 불투명 배경이 없으면
  // 배경은 그대로, 글자만 섞인다)
  function finalColors(el) {
    var chain = [];
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) chain.push(n);
    var fg = colorOf(el, 'color');
    function paint(i, under) {
      var node = chain[i];
      var own = colorOf(node, 'backgroundColor');
      var here = own.a > 0 ? blend(own, under) : under;
      var r = i === 0 ? { fg: blend(fg, here), bg: here } : paint(i - 1, here);
      var o = parseFloat(getComputedStyle(node).opacity);
      if (o < 1) {
        r = { fg: blend({ r: r.fg.r, g: r.fg.g, b: r.fg.b, a: o }, under), bg: blend({ r: r.bg.r, g: r.bg.g, b: r.bg.b, a: o }, under) };
      }
      return r;
    }
    return paint(chain.length - 1, canvas());
  }

  function path(el, stop) {
    var p = [];
    for (var n = el; n && n !== stop && p.length < 3; n = n.parentElement) {
      // 본문 제목 id(슬러그)는 묶음 키로 쓰지 않는다 — 위젯 요소 id(mts-*)만
      p.push(n.tagName.toLowerCase() + (/^mts-/.test(n.id) ? '#' + n.id : n.classList.length ? '.' + n.classList[0] : ''));
    }
    return p.join('<');
  }

  // 대비 기준은 tools/mts_audit.py와 같다 — FAIL 3.0, WARN 4.5, small은 3.0만(위젯은 전부 4.5 = 작은 UI 글자)
  function scan(root, skip, limitOf) {
    var worst = {}, scanned = 0, n;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while ((n = walker.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      var el = n.parentElement;
      if (!el || (skip && el.closest(skip))) continue;
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      scanned++;
      var c = finalColors(el);
      var ratio = contrast(c.fg, c.bg);
      var lim = limitOf(el);
      if (ratio >= lim.warn) continue;
      var key = path(el, root);
      if (!worst[key] || worst[key].contrast > ratio) {
        worst[key] = {
          key: key, contrast: +ratio.toFixed(2), level: ratio < lim.fail ? 'FAIL' : 'WARN',
          limit: ratio < lim.fail ? lim.fail : lim.warn,
          text: n.nodeValue.trim().slice(0, 24), fg: rgb(c.fg), bg: rgb(c.bg)
        };
      }
    }
    return { scanned: scanned, low: Object.keys(worst).map(function (k) { return worst[k]; }) };
  }

  var out;
  if (target === 'widget') {
    var host = document.getElementById('mts-root');
    if (!host) return JSON.stringify({ missing: true });
    // 비활성 컨트롤(끝값의 스테퍼)은 WCAG 1.4.3 예외
    out = scan(host, 'button:disabled', function () { return { fail: 3.0, warn: 4.5 }; });
    out.open = !document.getElementById('mts-panel').hidden;
  } else {
    // 코드펜스 토큰 색은 IDE 렉서 인라인(감사 밖), 취소선은 의도적 저대비(동물원의 del 기준이 따로),
    // SVG·수식은 글자 색이 테마 밖이다. 동물원은 mts_audit.js가 따로 판정한다
    out = scan(document.body, '#mts-audit, pre, del, svg, mjx-container, .math, style, script', function (el) {
      return el.closest('small') ? { fail: 3.0, warn: 3.0 } : { fail: 3.0, warn: 4.5 };
    });
    // 본문 단 폭 = min(--mts-measure, 가용 폭 - 좌우 패딩). body는 border-box(mts.css 명시) — 박스 모델이나
    // 패딩·max-width를 커스텀 CSS에 뺏기면 프로젝트마다 단 폭이 달라진다
    var bs = getComputedStyle(document.body);
    var padX = parseFloat(bs.paddingLeft) + parseFloat(bs.paddingRight);
    var designPad = 2 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mts-pad-x'));
    var measure = parseFloat(bs.getPropertyValue('--mts-measure'));
    out.measure = {
      content: +(document.body.getBoundingClientRect().width - padX).toFixed(1),
      expected: +Math.min(measure, document.documentElement.clientWidth - designPad).toFixed(1),
      padX: padX, designPadX: designPad
    };
  }
  out.unparsed = unparsed;
  return JSON.stringify(out);
})
