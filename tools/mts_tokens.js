(function () {
  var body = document.body;
  if ((body.textContent || '').indexOf('mts-code-syntax-fixture') < 0) {
    return JSON.stringify({ error: 'fixture-not-open' });
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
    var f = fg.a < 1 ? blend(fg, bg) : fg;
    var L1 = lum(f), L2 = lum(bg);
    var hi = Math.max(L1, L2), lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function fmt(c) { return 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')'; }

  var nodes = document.querySelectorAll('body h1, body h2, body h3, body pre');
  var blocks = [];
  var lastHeading = '(제목 없음)';
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    // mts_audit.py가 같은 창에 주입한 동물원(#mts-audit) 잔재는 제외
    if (node.closest && node.closest('#mts-audit')) continue;
    if (node.tagName !== 'PRE') { lastHeading = (node.textContent || '').trim(); continue; }
    if (node.classList.contains('frontmatter-header')) continue;

    var bg = effBg(node);
    var preFg = parse(getComputedStyle(node).color);
    var colorMap = {};
    var spans = node.querySelectorAll('*');
    for (var j = 0; j < spans.length; j++) {
      var el = spans[j];
      if (!el.style || !el.style.color) continue; // 렉서 토큰 = 인라인 color만 수집
      var cs = getComputedStyle(el);
      var fg = parse(cs.color);
      if (!fg) continue;
      var text = (el.textContent || '').trim();
      if (!text) continue;
      var op = parseFloat(cs.opacity);
      var c = +(contrast(fg, bg) * (isNaN(op) ? 1 : op)).toFixed(2);
      var key = cs.color;
      if (!colorMap[key]) colorMap[key] = { color: key, contrast: c, count: 0, sample: text.slice(0, 24) };
      colorMap[key].count++;
    }
    var tokens = Object.keys(colorMap).map(function (k) { return colorMap[k]; });
    tokens.sort(function (a, b) { return a.contrast - b.contrast; });
    blocks.push({
      lang: lastHeading,
      bg: fmt(bg),
      plainContrast: preFg ? +contrast(preFg, bg).toFixed(2) : null,
      tokens: tokens
    });
  }

  return JSON.stringify({
    laf: typeof window.__mtsDark === 'boolean' ? (window.__mtsDark ? 'dark' : 'light') : 'unknown',
    blocks: blocks
  });
})()
