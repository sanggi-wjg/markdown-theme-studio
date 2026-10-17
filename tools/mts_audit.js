(function () {

  function ensureZoo() {
    // 매번 새로 만든다 — 이전 버전 하네스가 남긴 동물원이 있으면 새 요소가 MISSING으로 나온다
    var old = document.getElementById('mts-audit');
    if (old) old.remove();
    var d = document.createElement('div');
    d.id = 'mts-audit';
    function runLink(cls, icon, extra) {
      return '<a class="' + cls + '" href="#" role="button" data-command="Run:mts-audit"' + extra + '>' +
        '<img src="commandRunner/' + icon + '"></a>';
    }
    // Mermaid HTML 라벨 — 2026.2 번들(mermaid 11) 마크업 축약: svg 자체 <style>(#<id> p { margin: 0 } 포함) +
    // foreignObject > div(인라인 style) > span > p. mermaid.render가 라벨을 재는 자리(body 직속 div 안 svg)와 같은
    // 문맥에 둔다. 한 줄 라벨(nowrap, 굵게 포함)·간선 라벨(labelBkg)·200px에서 접히는 한글 라벨(break-spaces)
    function mermaidLabel(y, cls, span, style, text) {
      return '<g transform="translate(0,' + y + ')"><foreignObject width="240" height="80">' +
        '<div xmlns="http://www.w3.org/1999/xhtml"' + (cls ? ' class="' + cls + '"' : '') + ' style="' + style +
        ' line-height: 1.5; max-width: 200px; text-align: center;"><span class="' + span + '"><p>' + text +
        '</p></span></div></foreignObject></g>';
    }
    var oneLine = 'display: table-cell; white-space: nowrap;';
    // 라벨 색은 적대적 커스텀 CSS(p #333)·colors.css와 겹치지 않는 값 — 같으면 custom 모드에서 글자색 검사가 헛돈다
    var mermaidZoo = '<svg id="mermaid-mts-audit" xmlns="http://www.w3.org/2000/svg" width="240" height="130">' +
      '<style>#mermaid-mts-audit{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;fill:#333;}' +
      '#mermaid-mts-audit p{margin:0;}#mermaid-mts-audit .label{color:#1f6feb;}#mermaid-mts-audit span{color:#1f6feb;}' +
      '#mermaid-mts-audit .edgeLabel p{background-color:rgba(232,232,232,0.8);}</style>' +
      mermaidLabel(0, '', 'nodeLabel', oneLine, '<strong>노드</strong> 라벨') +
      mermaidLabel(30, 'labelBkg', 'edgeLabel', oneLine, 'miss') +
      mermaidLabel(60, '', 'nodeLabel', 'display: table; white-space: break-spaces; width: 200px;',
        '캐시무효화이벤트 원격저장소동기화 연결풀관리작업자') + '</svg>';
    d.innerHTML =
      '<h1>제목1</h1><h3>제목3</h3><h6>제목6</h6>' +
      '<p class="z-p">본문 텍스트 문단입니다.</p>' +
      '<p class="z-inline"><strong>강조</strong> <em>기울임</em> <del>취소선</del> <ins>삽입</ins> ' +
      '<small>스몰</small> <mark>마크</mark> <kbd>Cmd+C</kbd> <a href="#">링크텍스트</a> ' +
      // 원시 HTML로만 나오는 요소(b·i·u)와 위·아래 첨자(sup·sub) — color: inherit 리셋 블록 항목은 전부 여기 있어야
      // 리셋에서 빠졌을 때 커스텀 CSS의 맨 요소 색 규칙에 잡힌다
      '<b>굵게b</b> <i>기울임i</i> <u>밑줄</u> 위<sup>첨자</sup> 아래<sub>첨자</sub></p>' +
      '<ul><li class="z-li">목록 항목<ul><li class="z-li2">중첩 항목</li></ul></li></ul>' +
      '<ol><li class="z-oli">순서 항목</li></ol>' +
      '<ul><li class="task-list-item"><input type="checkbox" checked> 할일 항목</li></ul>' +
      '<blockquote><p class="z-qp">인용문 안 <code>인라인코드</code></p>' +
      '<blockquote><p class="z-qqp">중첩 인용문</p></blockquote></blockquote>' +
      '<table><thead><tr><th class="z-th">헤더</th></tr></thead>' +
      '<tbody><tr><td class="z-td1">첫 행</td></tr><tr><td class="z-td2">둘째 행</td></tr></tbody></table>' +
      '<pre class="z-pre"><code>val x = veryLongFunctionCallExample(argumentOne, argumentTwo, argumentThree, argumentFour)</code></pre>' +
      '<p class="z-code-holder"><code class="z-code">인라인코드칩</code></p>' +
      // commandRunner 실행 링크 (CommandRunnerExtension 템플릿 그대로) — 테마 활성 시 전부 숨어야 한다.
      // 인라인: 2026.1+ run-icon-line / 2025.1 run-icon, 펜스: 블록 run-icon code-block + 줄 run-icon-line code-block.
      // z-runtwin은 아이콘 없는 같은 텍스트 칩 — 숨긴 아이콘이 칩 폭·높이를 바꾸지 않는지 비교한다.
      // 문단을 나눠 칩마다 줄 머리에 둔다(한 줄에 몰면 좁은 폭에서 칩이 줄바꿈돼 박스 비교가 어긋난다)
      '<p><code class="z-runcode">' + runLink('run-icon-line', 'run.png', '') + './gradlew build</code></p>' +
      '<p><code class="z-runtwin">./gradlew build</code></p>' +
      '<p><code>' + runLink('run-icon', 'run.png', '') + './gradlew build</code></p>' +
      '<table><tbody><tr><td><code class="z-runcell">' + runLink('run-icon-line', 'run.png', '') +
      './gradlew :bench:run</code></td></tr></tbody></table>' +
      '<pre><code class="language-shell">' +
      runLink('run-icon code-block', 'runrun.png', ' data-commandtype="block"') + '<span>./gradlew build\n</span>' +
      runLink('run-icon-line code-block', 'run.png', '') + '</code></pre>' +
      '<dl><dt class="z-dt">용어</dt><dd class="z-dd">설명 텍스트</dd></dl>' +
      '<hr>' +
      '<p class="z-url">https://example.com/path/' + Array(24).join('longsegment') + '</p>' +
      // front matter (2026.3+ 번들 렌더와 같은 마크업 — 목록 값은 중첩 표)
      '<table class="frontmatter-header"><tbody><tr><th class="z-fmk">title</th><td class="z-fmv">문서 제목</td></tr>' +
      '<tr><th>tags</th><td><table><tbody><tr><td class="z-fmchip">fixture</td><td>tag</td></tr></tbody></table></td></tr>' +
      '<tr><th>author</th><td><table><thead><tr><th class="z-fmobjk">name</th></tr></thead>' +
      '<tbody><tr><td class="z-fmobjv">홍길동</td></tr></tbody></table></td></tr></tbody></table>' +
      // TOML·파싱 실패 front matter(2026.3에서도 pre) — 배경 투명이라 글자도 외관 도메인이어야 한다
      '<pre class="frontmatter-header z-fmpre">+++ title = "x" +++</pre>' +
      '<div class="z-mermaid">' + mermaidZoo + '</div>' +
      // GitHub Alert (2026.2+ 번들 렌더와 같은 마크업) — 유형 색 제목·본문 대비
      ['note', 'tip', 'important', 'warning', 'caution'].map(function (t) {
        return '<blockquote class="markdown-alert markdown-alert-' + t + '">' +
          '<p class="markdown-alert-title z-al-' + t + '">' + t + '</p>' +
          '<p class="z-al-body-' + t + '">알림 본문 텍스트</p></blockquote>';
      }).join('');
    document.body.appendChild(d);
  }

  function parse(c) {
    var m = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/.exec(c || '');
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    // color-mix() 결과는 color(srgb 0~1 ...) 형식으로 계산된다 — 놓치면 틴트 배경을 투명으로 오판
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
    b: '.z-inline b', i: '.z-inline i', u: '.z-inline u', sup: '.z-inline sup', sub: '.z-inline sub', oli: '.z-oli',
    kbd: '.z-inline kbd', link: '.z-inline a', quoteP: '.z-qp', nestedQuoteP: '.z-qqp',
    th: '.z-th', tdOdd: '.z-td1', tdEven: '.z-td2', preCode: '.z-pre code', inlineCode: '.z-code',
    dt: '.z-dt', dd: '.z-dd', h1: '#mts-audit h1', h3: '#mts-audit h3', h6: '#mts-audit h6',
    taskItem: '.task-list-item', fmKey: '.z-fmk', fmValue: '.z-fmv', fmChip: '.z-fmchip',
    fmObjKey: '.z-fmobjk', fmObjValue: '.z-fmobjv', fmPre: '.z-fmpre',
    runCode: '.z-runcode', runCell: '.z-runcell'
  };
  ['note', 'tip', 'important', 'warning', 'caution'].forEach(function (t) {
    sels['alert-' + t] = '.z-al-' + t;
    sels['alertBody-' + t] = '.z-al-body-' + t;
  });
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
  // 2026.2+ 번들은 체크박스를 appearance:none으로 직접 그린다(체크 = ::after 테두리) —
  // 체크 표시와 채움색의 대비를 본다. 네이티브 렌더(2025.1)는 측정 대상 아님
  var box = document.querySelector('#mts-audit input[type="checkbox"]');
  if (box && getComputedStyle(box).appearance === 'none') {
    var mark = parse(getComputedStyle(box, '::after').borderRightColor);
    var fill = parse(getComputedStyle(box).backgroundColor);
    out.checkMark = mark && fill ? {
      contrast: +contrast(mark, fill.a === 1 ? fill : blend(fill, effBg(box.parentElement))).toFixed(2),
      bg: getComputedStyle(box).backgroundColor
    } : 'MISSING';
  }
  // commandRunner 실행 링크 — 테마 활성 시 번들 렌더(문서)·동물원 모두 박스가 없어야 한다(display:none이면
  // 링크·이미지 모두 getClientRects가 빈다). 숨긴 링크가 칩 폭·높이를 바꾸지 않는지 같은 텍스트 칩과 비교
  var runs = Array.prototype.slice.call(document.querySelectorAll('body a[data-command]'));
  var runCode = document.querySelector('#mts-audit .z-runcode');
  var rc = runCode.getBoundingClientRect();
  var tw = document.querySelector('#mts-audit .z-runtwin').getBoundingClientRect();
  out._runIcons = {
    total: runs.length,
    doc: runs.filter(function (a) { return !a.closest('#mts-audit'); }).length,
    visible: runs.filter(function (a) {
      var img = a.querySelector('img');
      return a.getClientRects().length > 0 || (img !== null && img.getClientRects().length > 0);
    }).map(function (a) {
      return (a.closest('#mts-audit') ? 'zoo ' : 'doc ') + a.className +
        (a.closest('td') ? ' (td)' : a.closest('pre') ? ' (pre)' : ' (p)');
    }),
    chipDw: +(rc.width - tw.width).toFixed(2),
    chipDh: +(rc.height - tw.height).toFixed(2),
    chipText: runCode.textContent
  };
  // Mermaid 라벨 박스 — mermaid는 렌더할 때 잰 라벨 크기로 노드·간선을 배치하므로 테마가 라벨 박스를 바꾸면 배치와
  // 어긋난다(#59). 동물원(측정 문맥) + 문서의 실제 mermaid(표시 문맥, pre > code > div.mermaid) 라벨 전부를 테마 off·
  // 클린(사용자 Custom CSS 시트 inline.css 끔)과 견준다 — 사용자 CSS가 mermaid의 비-important 값을 덮는 것도 잡힌다.
  // 박스는 foreignObject 로컬 단위(svg 축척은 본문 폭에 따라 테마마다 달라 화면 px로는 비교할 수 없다)
  var htmlEl = document.documentElement;
  var labels = Array.prototype.slice.call(document.querySelectorAll('body svg foreignObject > *'));
  function labelBoxes() {
    return labels.map(function (el) {
      var r = el.getBoundingClientRect();
      var m = el.parentNode.getScreenCTM();
      return [r.width / m.a, r.height / m.d];
    });
  }
  var themedBoxes = labelBoxes();
  var theme = htmlEl.getAttribute('data-mts-theme');
  // link.disabled는 시트를 내렸다 다시 받는다(비동기) — 시트 자체를 끈다
  var customSheets = Array.prototype.filter.call(document.styleSheets, function (s) {
    return !s.disabled && (s.href || '').indexOf('inline.css') >= 0;
  });
  htmlEl.removeAttribute('data-mts-theme');
  customSheets.forEach(function (s) { s.disabled = true; });
  var offBoxes = labelBoxes();
  customSheets.forEach(function (s) { s.disabled = false; });
  if (theme !== null) htmlEl.setAttribute('data-mts-theme', theme);
  function labelName(el) {
    return (el.closest('#mts-audit') ? 'zoo ' : 'doc ') + JSON.stringify((el.textContent || '').trim().slice(0, 16));
  }
  var diffs = [];
  labels.forEach(function (el, i) {
    var dw = themedBoxes[i][0] - offBoxes[i][0];
    var dh = themedBoxes[i][1] - offBoxes[i][1];
    if (Math.abs(dw) > 0.5 || Math.abs(dh) > 0.5) {
      diffs.push(labelName(el) + ' 박스 ' + offBoxes[i].map(function (v) { return +v.toFixed(1); }).join('×') +
        '(off·클린) Δw=' + (+dw.toFixed(1)) + ' Δh=' + (+dh.toFixed(1)));
    }
    // 글자색은 mermaid가 라벨 span에 준 색이어야 한다 — 테마 색 리셋(color: inherit)이 사용자 CSS·colors.css의 p 색을
    // 막는다(Typora p { color: #333 }이면 다크 노드 위 라벨 대비 1.3). off는 colors.css p 색이라 off와는 견주지 않는다
    var p = el.querySelector('p');
    if (p && p.parentElement) {
      var pc = getComputedStyle(p).color;
      var sc = getComputedStyle(p.parentElement).color;
      if (pc !== sc) diffs.push(labelName(el) + ' 글자색 ' + pc + ' ≠ mermaid 지정색 ' + sc);
    }
  });
  out._mermaid = {
    zoo: labels.filter(function (el) { return el.closest('#mts-audit'); }).length,
    doc: labels.filter(function (el) { return !el.closest('#mts-audit'); }).length,
    diffs: diffs
  };
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
