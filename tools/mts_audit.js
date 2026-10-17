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
      // 취소선은 두 형태 — raw HTML <del>, 마크다운 ~~ ~~(GFM 라이브러리 span.user-del, 2025.1~)
      '<p class="z-inline"><strong>강조</strong> <em>기울임</em> <del>취소선</del> ' +
      '<span class="user-del">마크다운취소선</span> <ins>삽입</ins> ' +
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
      // GFM 열 정렬(#62) — 번들 렌더는 :---:·---:만 셀 align으로 단다(:---는 속성 없음). align="left"는 raw HTML
      '<table class="z-align"><thead><tr><th>키</th><th align="center">상태</th><th align="right">요청 수</th>' +
      '<th align="left">왼쪽</th></tr></thead><tbody><tr><td>catalog</td><td align="center">정상 운영</td>' +
      '<td align="right">1,204,882</td><td align="left">기본 TTL</td></tr></tbody></table>' +
      // raw HTML 행·행 그룹 align — 셀 자신은 align이 없고 행 정렬을 물려받는다(th는 UA 규칙이 부모 정렬을 따른다)
      '<table class="z-align-row"><thead align="center"><tr><th>그룹 머리</th></tr></thead>' +
      '<tbody><tr align="right"><th>행 머리</th><td>행 셀 내용</td></tr></tbody></table>' +
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
      }).join('') +
      // 취소선 안 맥락 — 흐림은 이미 흐린 색(머리글·h6·인용·코드·링크)에서 대비를 가장 크게 깎는다
      '<div class="z-strike"><p><span class="user-del"><a href="#" class="z-s-link">링크취소</a></span> ' +
      '<span class="user-del"><code class="z-s-code">코드취소</code></span> ' +
      '<span class="user-del"><strong class="z-s-strong">굵게취소</strong></span></p>' +
      '<blockquote><p><span class="user-del z-s-quote">인용취소</span></p></blockquote>' +
      '<table><thead><tr><th><span class="user-del z-s-th">머리글취소</span></th></tr></thead>' +
      '<tbody><tr><td>첫 행</td></tr><tr><td><span class="user-del z-s-td2">둘째행취소</span></td></tr></tbody></table>' +
      '<h6><span class="user-del z-s-h6">제목취소</span></h6>' +
      '<blockquote class="markdown-alert markdown-alert-note"><p class="markdown-alert-title">note</p>' +
      '<p><span class="user-del z-s-alert">알림취소</span></p></blockquote></div>';
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
  // 요소 위치의 최종 (글자색, 배경색) — static-harness/scan.js의 finalColors와 같은 식이다(복사했으니 바꾸면 함께).
  // 조상 사슬을 바깥부터 칠한다. opacity < 1인 요소(취소선 흐림)는 하위를 칠한 결과를 요소 아래 색과 opacity 비율로
  // 섞는다. 예전의 대비 × opacity 곱셈 근사는 흐림이 글자를 배경 쪽으로 섞는 효과를 못 담아, opacity 0.62에서 실제
  // 대비를 1.9~2.2배 높게 잡았다
  var WHITE = { r: 255, g: 255, b: 255, a: 1 };
  function colorOf(el, prop) { return parse(getComputedStyle(el)[prop]) || { r: 0, g: 0, b: 0, a: 0 }; }
  function canvas() {
    var h = colorOf(document.documentElement, 'backgroundColor');
    return h.a > 0 ? WHITE : blend(colorOf(document.body, 'backgroundColor'), WHITE);
  }
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

  ensureZoo();

  var sels = {
    p: '.z-p', li: '.z-li', li2: '.z-li2', strong: '.z-inline strong', em: '.z-inline em',
    del: '.z-inline del', userDel: '.z-inline span.user-del', ins: '.z-inline ins', small: '.z-inline small', mark: '.z-inline mark',
    b: '.z-inline b', i: '.z-inline i', u: '.z-inline u', sup: '.z-inline sup', sub: '.z-inline sub', oli: '.z-oli',
    kbd: '.z-inline kbd', link: '.z-inline a', quoteP: '.z-qp', nestedQuoteP: '.z-qqp',
    th: '.z-th', tdOdd: '.z-td1', tdEven: '.z-td2', preCode: '.z-pre code', inlineCode: '.z-code',
    dt: '.z-dt', dd: '.z-dd', h1: '#mts-audit h1', h3: '#mts-audit h3', h6: '#mts-audit h6',
    taskItem: '.task-list-item', fmKey: '.z-fmk', fmValue: '.z-fmv', fmChip: '.z-fmchip',
    fmObjKey: '.z-fmobjk', fmObjValue: '.z-fmobjv', fmPre: '.z-fmpre',
    runCode: '.z-runcode', runCell: '.z-runcell',
    strikeLink: '.z-s-link', strikeCode: '.z-s-code', strikeStrong: '.z-s-strong', strikeQuote: '.z-s-quote',
    strikeTh: '.z-s-th', strikeTd2: '.z-s-td2', strikeH6: '.z-s-h6', strikeAlert: '.z-s-alert'
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
    var c = finalColors(el);
    out[k] = {
      contrast: parse(cs.color) ? +contrast(c.fg, c.bg).toFixed(2) : null,
      fs: cs.fontSize, ta: cs.textAlign,
      bg: 'rgb(' + Math.round(c.bg.r) + ',' + Math.round(c.bg.g) + ',' + Math.round(c.bg.b) + ')',
      // 취소선 안 글자 — 판정(mts_audit.py·run.mjs)이 전용 임계값을 쓴다
      strike: el.closest('del, span.user-del') ? true : undefined
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
  // 취소선 흐림(opacity) — 테마 활성 시 두 형태(del·span.user-del)가 문서·동물원 모두 동물원 del과 같은 값이어야 한다.
  // 대비는 흐림이 빠져도 오히려 오르므로 대비 판정으로는 셀렉터 누락을 못 잡는다. 작성자가 인라인으로 흐림을 준
  // span.user-del은 작성자 값이 이기는 게 맞아(mts.css :where 제외) 뺀다
  var strikeOp = getComputedStyle(document.querySelector('#mts-audit .z-inline del')).opacity;
  var strikes = Array.prototype.slice.call(document.querySelectorAll('body del, body span.user-del'))
    .filter(function (e) { return !(e.matches('span') && /opacity/i.test(e.getAttribute('style') || '')); });
  out._strike = {
    opacity: strikeOp,
    doc: strikes.filter(function (e) { return !e.closest('#mts-audit'); }).length,
    off: strikes.filter(function (e) { return getComputedStyle(e).opacity !== strikeOp; }).map(function (e) {
      return (e.closest('#mts-audit') ? 'zoo ' : 'doc ') + e.tagName.toLowerCase() +
        (e.className ? '.' + e.className : '') + ' opacity=' + getComputedStyle(e).opacity;
    })
  };
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
  // 표 셀 정렬(#62) — 작성자 정렬(셀 align, 행·행 그룹 align)은 기본 preview 그대로여야 하고, 정렬이 없는 머리글만 테마
  // 기본 왼쪽이다. 기대값은 같은 셀을 테마 off + 사용자 CSS(inline.css) off로 잰 계산값 — Blink의 align 매핑(-webkit-*)을
  // 하드코딩하지 않는다. 같은 동기 구간에서 되돌린다. custom 조합에선 사용자 CSS의 th·td { text-align }도 이겨야 한다
  var cells = Array.prototype.slice.call(document.querySelectorAll(
    '#mts-audit .z-align th, #mts-audit .z-align td, #mts-audit .z-align-row th, #mts-audit .z-align-row td'));
  var root = document.documentElement;
  var themeAttr = root.getAttribute('data-mts-theme');
  // 시트 객체(CSSStyleSheet.disabled)로 끈다 — link.disabled는 시트를 버리고 다시 켤 때 비동기로 다시 받아, 뒤 측정이
  // 사용자 CSS 없이 돈다(실측)
  var userCss = Array.prototype.slice.call(document.styleSheets).filter(function (s) {
    return /\/inline\.css(\?|$)/.test(s.href || '');
  });
  var userCssOff = userCss.map(function (s) { return s.disabled; });
  root.removeAttribute('data-mts-theme');
  userCss.forEach(function (s) { s.disabled = true; });
  var cleanAlign = cells.map(function (c) { return getComputedStyle(c).textAlign; });
  userCss.forEach(function (s, i) { s.disabled = userCssOff[i]; });
  if (themeAttr !== null) root.setAttribute('data-mts-theme', themeAttr);
  // 기대값 측정이 헛돌면(테마·사용자 CSS가 안 꺼짐) 기대값이 곧 테마 값이라 조용히 통과한다 — 지정 없는 첫 머리글은
  // 기본 preview에서 UA 가운데여야 한다
  var offFailed = cleanAlign[0] === 'left' ? ['기본 preview 측정 실패: 지정 없는 th가 테마·사용자 CSS off에서도 left'] : [];
  out._align = {
    cells: cells.length,
    bad: offFailed.concat(cells.map(function (c, i) {
      var a = c.getAttribute('align');
      var themeDefault = c.tagName === 'TH' && a === null && !c.closest('.z-align-row');
      var want = themeDefault ? 'left' : cleanAlign[i];
      var got = getComputedStyle(c).textAlign;
      return got === want ? null : c.tagName.toLowerCase() + '[align=' + (a === null ? '없음' : a) + '] "' +
        c.textContent + '" text-align=' + got + ' (기대 ' + want + (themeDefault ? ', 테마 기본' : ', 기본 preview') + ')';
    }).filter(Boolean))
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
