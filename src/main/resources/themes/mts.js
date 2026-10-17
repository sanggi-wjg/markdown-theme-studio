// Markdown Theme Studio — theme switcher.
// 서빙 시 Kotlin ResourceProvider가 IDE LaF 기반 프리루드를 앞에 붙인다:
//   window.__mtsDark = true|false;
// 위젯은 <html> 직속 자식으로 붙여 본문 incremental 업데이트에서 살아남는다.
// 아이콘은 유니코드 글리프가 JCEF 폰트에서 깨질 수 있어 인라인 SVG를 쓴다.
// 구조: 우측 상단 Aa 버튼 하나 + 클릭으로 여는 설정 패널(비모달 dialog).
// 독서 앱의 "Aa" 메뉴 패턴 — 상시 노출 면적을 버튼 하나로 줄이고 값·초기화를 패널에 모은다.
(function () {
  'use strict';

  var THEME_KEY = 'mts-theme';
  var APPEARANCE_KEY = 'mts-appearance'; // 'auto' | 'light' | 'dark'
  var DEFAULT_THEME = 'gh';
  // 'off'(Default) = 속성 제거 = 플러그인 비활성(기본 preview). 견본 카드가 아니라 별도 행으로 둔다
  var THEMES = [
    { id: 'gh', label: 'GitHub' },
    { id: 'nt', label: 'Soft' },
    { id: 'dc', label: 'Docs' },
    { id: 'rd', label: 'Reader' }
  ];
  var THEME_IDS = ['off', 'gh', 'nt', 'dc', 'rd'];
  var APPEARANCES = [
    { id: 'auto', label: 'Auto', title: 'Follow the IDE theme' },
    { id: 'light', label: 'Light', title: 'Always light' },
    { id: 'dark', label: 'Dark', title: 'Always dark' }
  ];
  var FS_KEY = 'mts-fs-offset';
  var FS_MIN = -3;
  var FS_MAX = 3;
  var W_KEY = 'mts-width-offset'; // 단계 수 저장(px 아님) — 스텝 크기 변경에 안전
  var W_MIN = -3;
  var W_MAX = 3;
  var W_STEP = 80; // px per step — 테마별 measure(640~860px)에 공통 적용
  var ICONS = {
    auto: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M8 1.8 A6.2 6.2 0 0 1 8 14.2 Z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="3.4" fill="currentColor"/>' +
      '<g stroke="currentColor" stroke-width="1.4" stroke-linecap="round">' +
      '<line x1="8" y1="0.9" x2="8" y2="2.7"/><line x1="8" y1="13.3" x2="8" y2="15.1"/>' +
      '<line x1="0.9" y1="8" x2="2.7" y2="8"/><line x1="13.3" y1="8" x2="15.1" y2="8"/>' +
      '<line x1="3" y1="3" x2="4.3" y2="4.3"/><line x1="11.7" y1="11.7" x2="13" y2="13"/>' +
      '<line x1="3" y1="13" x2="4.3" y2="11.7"/><line x1="11.7" y1="4.3" x2="13" y2="3"/></g></svg>',
    dark: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">' +
      '<path d="M13.8 9.6 A6.3 6.3 0 1 1 6.4 2.2 A5.1 5.1 0 0 0 13.8 9.6 Z" fill="currentColor"/></svg>',
    minus: '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">' +
      '<line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">' +
      '<g stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
      '<line x1="2" y1="6" x2="10" y2="6"/><line x1="6" y1="2" x2="6" y2="10"/></g></svg>'
  };
  var root = document.documentElement;
  var appearanceMode = savedAppearance();
  var currentTheme = null; // applyTheme가 설정 — off는 속성이 없어 DOM에서 못 읽는다
  var fsOffset = savedFsOffset();
  var wOffset = savedWOffset();

  function savedTheme() {
    try {
      var v = localStorage.getItem(THEME_KEY);
      return THEME_IDS.indexOf(v) >= 0 ? v : DEFAULT_THEME;
    } catch (e) {
      return DEFAULT_THEME;
    }
  }

  function savedAppearance() {
    try {
      var v = localStorage.getItem(APPEARANCE_KEY);
      return v === 'light' || v === 'dark' ? v : 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  function savedFsOffset() {
    try {
      var v = parseInt(localStorage.getItem(FS_KEY), 10);
      return v >= FS_MIN && v <= FS_MAX ? v : 0;
    } catch (e) {
      return 0;
    }
  }

  function savedWOffset() {
    try {
      var v = parseInt(localStorage.getItem(W_KEY), 10);
      return v >= W_MIN && v <= W_MAX ? v : 0;
    } catch (e) {
      return 0;
    }
  }

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* persistence unavailable */ }
  }

  function applyTheme(id) {
    currentTheme = id;
    if (id === 'off') {
      root.removeAttribute('data-mts-theme');
    } else {
      root.setAttribute('data-mts-theme', id);
    }
    save(THEME_KEY, id);
    refreshWidget();
  }

  function applyFsOffset() {
    if (fsOffset === 0) {
      root.style.removeProperty('--mts-fs-offset');
    } else {
      root.style.setProperty('--mts-fs-offset', fsOffset + 'px');
    }
  }

  function nudgeFontSize(delta) {
    var next = fsOffset + delta;
    if (next < FS_MIN || next > FS_MAX) return;
    fsOffset = next;
    save(FS_KEY, String(fsOffset));
    applyFsOffset();
    refreshWidget();
  }

  function applyWOffset() {
    if (wOffset === 0) {
      root.style.removeProperty('--mts-w-offset');
    } else {
      root.style.setProperty('--mts-w-offset', (wOffset * W_STEP) + 'px');
    }
  }

  function nudgeWidth(delta) {
    var next = wOffset + delta;
    if (next < W_MIN || next > W_MAX) return;
    wOffset = next;
    save(W_KEY, String(wOffset));
    applyWOffset();
    refreshWidget();
  }

  function systemDark() {
    if (typeof window.__mtsDark === 'boolean') return window.__mtsDark;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyAppearance() {
    var dark = appearanceMode === 'dark' || (appearanceMode === 'auto' && systemDark());
    root.classList.toggle('mts-dark', dark);
    // 코드펜스 스코프(mts.css의 mts-laf-dark): 토큰 색의 출처인 실제 LaF를
    // 따르며 외관 강제의 영향을 받지 않는다
    root.classList.toggle('mts-laf-dark', systemDark());
  }

  function setAppearance(mode) {
    appearanceMode = mode;
    save(APPEARANCE_KEY, mode);
    applyAppearance();
    refreshWidget();
  }

  function resetAll() {
    fsOffset = 0;
    wOffset = 0;
    save(FS_KEY, '0');
    save(W_KEY, '0');
    applyFsOffset();
    applyWOffset();
    appearanceMode = 'auto';
    save(APPEARANCE_KEY, 'auto');
    applyAppearance();
    applyTheme(DEFAULT_THEME);
  }

  // ---------- 위젯 DOM ----------

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text) n.textContent = text;
    return n;
  }

  // WAI-ARIA radio 패턴: 그룹 안에서 방향키가 포커스와 선택을 함께 옮기고(roving tabindex),
  // Tab은 그룹 전체를 한 번에 건너뛴다
  function radioGroupKeys(group, onPick) {
    group.addEventListener('keydown', function (e) {
      var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      var radios = Array.prototype.slice.call(group.querySelectorAll('[role="radio"]'));
      var i = radios.indexOf(document.activeElement);
      if (i < 0) return;
      var next;
      if (keys[e.key]) next = (i + keys[e.key] + radios.length) % radios.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = radios.length - 1;
      else return;
      e.preventDefault();
      onPick(radios[next].getAttribute('data-mts-id'));
      radios[next].focus();
    });
  }

  function stepper(label, cls, onMinus, onPlus) {
    var row = el('div', { 'class': 'mts-row' });
    row.appendChild(el('span', { 'class': 'mts-row-label', id: 'mts-' + cls + '-label' }, label));
    var minus = el('button', { type: 'button', 'class': 'mts-step mts-' + cls + '-minus' });
    var value = el('output', { 'class': 'mts-value mts-' + cls + '-value', 'aria-live': 'polite' });
    var plus = el('button', { type: 'button', 'class': 'mts-step mts-' + cls + '-plus' });
    minus.innerHTML = ICONS.minus;
    plus.innerHTML = ICONS.plus;
    minus.addEventListener('click', onMinus);
    plus.addEventListener('click', onPlus);
    row.appendChild(minus);
    row.appendChild(value);
    row.appendChild(plus);
    return row;
  }

  function buildPanel() {
    // tabindex=-1: 패널 안 빈 곳(헤딩 등)을 눌러도 포커스가 body로 빠지지 않고 패널에 남는다
    var panel = el('div', { id: 'mts-panel', role: 'dialog', 'aria-label': 'Markdown theme', tabindex: '-1' });
    panel.hidden = true;

    panel.appendChild(el('div', { 'class': 'mts-heading', id: 'mts-theme-heading' }, 'Theme'));
    var themeGroup = el('div', { 'class': 'mts-themes', role: 'radiogroup', 'aria-labelledby': 'mts-theme-heading' });
    var cards = el('div', { 'class': 'mts-cards' });
    THEMES.forEach(function (t) {
      var card = el('button', { type: 'button', role: 'radio', 'class': 'mts-card', 'data-mts-id': t.id });
      // 견본: 그 테마의 배경·글자·포인트 색으로 그린 "Aa" (색은 mts.css 위젯 섹션)
      var swatch = el('span', { 'class': 'mts-swatch', 'aria-hidden': 'true' });
      swatch.appendChild(el('span', { 'class': 'mts-swatch-aa' }, 'Aa'));
      swatch.appendChild(el('span', { 'class': 'mts-swatch-bar' }));
      card.appendChild(swatch);
      card.appendChild(el('span', { 'class': 'mts-card-label' }, t.label));
      card.addEventListener('click', function () { applyTheme(t.id); });
      cards.appendChild(card);
    });
    themeGroup.appendChild(cards);
    var off = el('button', { type: 'button', role: 'radio', 'class': 'mts-off', 'data-mts-id': 'off' });
    off.appendChild(el('span', { 'class': 'mts-off-dot', 'aria-hidden': 'true' }));
    off.appendChild(el('span', null, 'Default'));
    off.appendChild(el('span', { 'class': 'mts-hint' }, 'stock preview'));
    off.addEventListener('click', function () { applyTheme('off'); });
    themeGroup.appendChild(off);
    radioGroupKeys(themeGroup, applyTheme);
    panel.appendChild(themeGroup);

    panel.appendChild(el('div', { 'class': 'mts-divider' }));
    panel.appendChild(stepper('Text size', 'fs',
      function () { nudgeFontSize(-1); }, function () { nudgeFontSize(1); }));
    panel.appendChild(stepper('Max width', 'w',
      function () { nudgeWidth(-1); }, function () { nudgeWidth(1); }));
    panel.appendChild(el('div', { 'class': 'mts-hint mts-off-note' }, 'Pick a theme to adjust size and width'));

    panel.appendChild(el('div', { 'class': 'mts-divider' }));
    var apRow = el('div', { 'class': 'mts-row mts-row-stack' }); // 세그먼트가 라벨 옆에 들어가지 않는다 — 아래 줄 전체 폭
    apRow.appendChild(el('span', { 'class': 'mts-row-label', id: 'mts-ap-label' }, 'Appearance'));
    var segment = el('div', { 'class': 'mts-segment', role: 'radiogroup', 'aria-labelledby': 'mts-ap-label' });
    APPEARANCES.forEach(function (a) {
      var b = el('button', { type: 'button', role: 'radio', 'data-mts-id': a.id, title: a.title });
      b.innerHTML = ICONS[a.id];
      b.appendChild(el('span', null, a.label));
      b.addEventListener('click', function () { setAppearance(a.id); });
      segment.appendChild(b);
    });
    radioGroupKeys(segment, setAppearance);
    apRow.appendChild(segment);
    panel.appendChild(apRow);

    var footer = el('div', { 'class': 'mts-footer' });
    var reset = el('button', { type: 'button', 'class': 'mts-reset',
      title: 'GitHub theme, Auto appearance, default text size and width' }, 'Reset all');
    reset.addEventListener('click', resetAll);
    footer.appendChild(reset);
    panel.appendChild(footer);
    return panel;
  }

  function setRadios(container, selectedId) {
    var radios = container.querySelectorAll('[role="radio"]');
    for (var i = 0; i < radios.length; i++) {
      var on = radios[i].getAttribute('data-mts-id') === selectedId;
      radios[i].setAttribute('aria-checked', on ? 'true' : 'false');
      radios[i].tabIndex = on ? 0 : -1;
    }
  }

  function setStepper(cls, text, minDisabled, maxDisabled, what) {
    var host = document.getElementById('mts-root');
    var minus = host.querySelector('.mts-' + cls + '-minus');
    var plus = host.querySelector('.mts-' + cls + '-plus');
    host.querySelector('.mts-' + cls + '-value').textContent = text;
    // 끝값에 닿아 비활성화되는 버튼에 포커스가 있으면 body로 빠진다(스크린리더 위치 유실, Esc 불능) —
    // 비활성화하기 전에 짝 버튼으로 옮긴다
    if (maxDisabled && document.activeElement === plus && !minDisabled) minus.focus();
    if (minDisabled && document.activeElement === minus && !maxDisabled) plus.focus();
    minus.disabled = minDisabled;
    plus.disabled = maxDisabled;
    minus.setAttribute('aria-label', 'Decrease ' + what);
    plus.setAttribute('aria-label', 'Increase ' + what);
  }

  function refreshWidget() {
    var host = document.getElementById('mts-root');
    if (!host) return;
    setRadios(host.querySelector('.mts-themes'), currentTheme);
    setRadios(host.querySelector('.mts-segment'), appearanceMode);
    var off = currentTheme === 'off';
    host.classList.toggle('mts-theme-off', off);
    if (off) {
      setStepper('fs', '—', true, true, 'text size');
      setStepper('w', '—', true, true, 'maximum content width');
    } else {
      // 실제 적용 값을 보여준다 — 오프셋(±px)보다 사용자가 바로 이해하는 단위.
      // 폭은 본문 단의 최대 폭(computed max-width; border-box면 패딩 제외). 패널이 더 좁으면 실제 단은
      // 패널에 맞춰 줄어드므로 라벨이 "Max width"다
      var bs = getComputedStyle(document.body);
      var fs = parseFloat(bs.fontSize);
      var maxWidth = parseFloat(bs.maxWidth) -
        (bs.boxSizing === 'border-box' ? parseFloat(bs.paddingLeft) + parseFloat(bs.paddingRight) : 0);
      setStepper('fs', isNaN(fs) ? '—' : (Math.round(fs * 2) / 2) + 'px',
        fsOffset <= FS_MIN, fsOffset >= FS_MAX, 'text size');
      setStepper('w', isNaN(maxWidth) ? '—' : Math.round(maxWidth) + 'px',
        wOffset <= W_MIN, wOffset >= W_MAX, 'maximum content width');
    }
  }

  // ---------- 열기/닫기 ----------

  function isOpen() {
    var panel = document.getElementById('mts-panel');
    return !!panel && !panel.hidden;
  }

  function setOpen(open, focusTarget) {
    var panel = document.getElementById('mts-panel');
    var button = document.getElementById('mts-aa');
    if (!panel || !button) return;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.getElementById('mts-root').classList.toggle('mts-open', open);
    if (open) {
      refreshWidget();
      var checked = panel.querySelector('.mts-themes [aria-checked="true"]');
      if (checked) checked.focus();
    } else if (focusTarget) {
      focusTarget.focus();
    }
  }

  function ensureWidget() {
    if (document.getElementById('mts-root')) return;
    var host = el('div', { id: 'mts-root' });
    var button = el('button', {
      id: 'mts-aa', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
      'aria-controls': 'mts-panel', 'aria-label': 'Markdown theme settings',
      title: 'Markdown theme — theme, text size, width, appearance'
    }, 'Aa');
    button.addEventListener('click', function () { setOpen(!isOpen()); });
    host.appendChild(button);
    host.appendChild(buildPanel());
    // Esc는 문서 수준에서 받는다 — 포커스가 body로 빠진 경우에도 열린 패널을 닫는다
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        e.preventDefault();
        setOpen(false, button);
      }
    }, true);
    // 비모달: 위젯 밖을 누르거나 포커스가 위젯 밖으로 나가면 닫는다
    document.addEventListener('mousedown', function (e) {
      if (isOpen() && !host.contains(e.target)) setOpen(false);
    }, true);
    // relatedTarget이 없으면(문서 끝으로 Tab 등) 다음 틱에 실제 포커스 위치로 판단한다.
    // 창이 포커스를 잃을 때(IDE 다른 패널로 이동)는 activeElement가 위젯 안에 남아 닫히지 않는다
    host.addEventListener('focusout', function (e) {
      if (!isOpen()) return;
      if (e.relatedTarget) {
        if (!host.contains(e.relatedTarget)) setOpen(false);
        return;
      }
      setTimeout(function () {
        if (isOpen() && !host.contains(document.activeElement)) setOpen(false);
      }, 0);
    });
    root.appendChild(host);
    refreshWidget();
  }

  applyAppearance();
  applyFsOffset();
  applyWOffset();
  applyTheme(savedTheme());

  // 위젯은 <html> 직속이라 본문 incremental 패치에 제거되지 않는다 — 1회 부착으로 충분
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureWidget);
  } else {
    ensureWidget();
  }
})();
