(function () {
  var root = document.documentElement;

  function ensureZoo() {
    if (document.getElementById('mts-audit')) return;
    var d = document.createElement('div');
    d.id = 'mts-audit';
    d.innerHTML =
      '<h1>제목1</h1><h3>제목3</h3><h6>제목6</h6>' +
      '<p class="z-p">본문 텍스트 문단입니다.</p>' +
      '<p class="z-inline"><strong>강조</strong> <em>기울임</em> <del>취소선</del> <ins>삽입</ins> ' +
      '<small>스몰</small> <mark>마크</mark> <kbd>Cmd+C</kbd> <a href="#">링크텍스트</a></p>' +
      '<ul><li class="z-li">목록 항목<ul><li class="z-li2">중첩 항목</li></ul></li></ul>' +
      '<ul><li class="task-list-item"><input type="checkbox" checked> 할일 항목</li></ul>' +
      '<blockquote><p class="z-qp">인용문 안 <code>인라인코드</code></p>' +
      '<blockquote><p class="z-qqp">중첩 인용문</p></blockquote></blockquote>' +
      '<table><thead><tr><th class="z-th">헤더</th></tr></thead>' +
      '<tbody><tr><td class="z-td1">첫 행</td></tr><tr><td class="z-td2">둘째 행</td></tr></tbody></table>' +
      '<pre class="z-pre"><code>val x = veryLongFunctionCallExample(argumentOne, argumentTwo, argumentThree, argumentFour)</code></pre>' +
      '<p class="z-code-holder"><code class="z-code">인라인코드칩</code></p>' +
      '<dl><dt class="z-dt">용어</dt><dd class="z-dd">설명 텍스트</dd></dl>' +
      '<hr>' +
      '<p class="z-url">https://example.com/path/' + Array(24).join('longsegment') + '</p>';
    document.body.appendChild(d);
  }

  function parse(c) {
    var m = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/.exec(c || '');
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  function lum(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function blend(top, bot) {
    var a = top.a;
    return { r: top.r * a + bot.r * (1 - a), g: top.g * a + bot.g * (1 - a), b: top.b * a + bot.b * (1 - a), a: 1 };
  }
  function effBg(el) {
    var stack = [];
    var n = el;
    while (n && n.nodeType === 1) {
      var bg = parse(getComputedStyle(n).backgroundColor);
      if (bg && bg.a > 0) { stack.push(bg); if (bg.a === 1) break; }
      n = n.parentElement;
    }
    var res = { r: 255, g: 255, b: 255, a: 1 };
    for (var i = stack.length - 1; i >= 0; i--) res = blend(stack[i], res);
    return res;
  }
  function contrast(fg, bg) {
    var L1 = lum(fg), L2 = lum(bg);
    var hi = Math.max(L1, L2), lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }

  ensureZoo();

  var sels = {
    p: '.z-p', li: '.z-li', li2: '.z-li2', strong: '.z-inline strong', em: '.z-inline em',
    del: '.z-inline del', ins: '.z-inline ins', small: '.z-inline small', mark: '.z-inline mark',
    kbd: '.z-inline kbd', link: '.z-inline a', quoteP: '.z-qp', nestedQuoteP: '.z-qqp',
    th: '.z-th', tdOdd: '.z-td1', tdEven: '.z-td2', preCode: '.z-pre code', inlineCode: '.z-code',
    dt: '.z-dt', dd: '.z-dd', h1: '#mts-audit h1', h3: '#mts-audit h3', h6: '#mts-audit h6',
    taskItem: '.task-list-item'
  };
  var out = {};
  Object.keys(sels).forEach(function (k) {
    var el = document.querySelector('#mts-audit ' + sels[k].replace('#mts-audit ', ''));
    if (!el) { out[k] = 'MISSING'; return; }
    var cs = getComputedStyle(el);
    var fg = parse(cs.color);
    var bg = effBg(el);
    var op = parseFloat(cs.opacity);
    out[k] = {
      contrast: fg ? +(contrast(fg, bg) * (isNaN(op) ? 1 : op)).toFixed(2) : null,
      fs: cs.fontSize, ta: cs.textAlign,
      bg: 'rgb(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + ')'
    };
  });
  var body = document.body;
  var pre = document.querySelector('#mts-audit .z-pre');
  var urlP = document.querySelector('#mts-audit .z-url');
  out._layout = {
    bodyHScroll: body.scrollWidth - body.clientWidth,
    preOverflowX: getComputedStyle(pre).overflowX,
    urlOverflows: urlP.scrollWidth > urlP.clientWidth + 2,
    pFontSize: getComputedStyle(document.querySelector('#mts-audit .z-p')).fontSize,
    pTextAlign: getComputedStyle(document.querySelector('#mts-audit .z-p')).textAlign
  };
  return JSON.stringify(out);
})()
