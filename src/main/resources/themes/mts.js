// Markdown Theme Studio — theme switcher.
// 서빙 시 Kotlin ResourceProvider가 IDE LaF 기반 프리루드를 앞에 붙인다:
//   window.__mtsDark = true|false;
// 위젯은 <html> 직속 자식으로 붙여 본문 incremental 업데이트에서 살아남는다.
// 외관 아이콘은 유니코드 글리프가 JCEF 폰트에서 깨질 수 있어 인라인 SVG를 쓴다.
(function () {
  'use strict';

  var THEME_KEY = 'mts-theme';
  var APPEARANCE_KEY = 'mts-appearance'; // 'auto' | 'light' | 'dark'
  var DEFAULT_THEME = 'gh';
  var THEMES = [
    { id: 'off', label: 'Default' }, // 속성 제거 = 플러그인 비활성(기본 preview)
    { id: 'gh', label: 'GitHub' },
    { id: 'nt', label: 'Soft' },
    { id: 'dc', label: 'Docs' },
    { id: 'rd', label: 'Reader' }
  ];
  var FS_KEY = 'mts-fs-offset';
  var FS_MIN = -3;
  var FS_MAX = 3;
  var ICONS = {
    auto: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M8 1.8 A6.2 6.2 0 0 1 8 14.2 Z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="3.4" fill="currentColor"/>' +
      '<g stroke="currentColor" stroke-width="1.4" stroke-linecap="round">' +
      '<line x1="8" y1="0.9" x2="8" y2="2.7"/><line x1="8" y1="13.3" x2="8" y2="15.1"/>' +
      '<line x1="0.9" y1="8" x2="2.7" y2="8"/><line x1="13.3" y1="8" x2="15.1" y2="8"/>' +
      '<line x1="3" y1="3" x2="4.3" y2="4.3"/><line x1="11.7" y1="11.7" x2="13" y2="13"/>' +
      '<line x1="3" y1="13" x2="4.3" y2="11.7"/><line x1="11.7" y1="4.3" x2="13" y2="3"/></g></svg>',
    dark: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' +
      '<path d="M13.8 9.6 A6.3 6.3 0 1 1 6.4 2.2 A5.1 5.1 0 0 0 13.8 9.6 Z" fill="currentColor"/></svg>'
  };
  var TITLES = {
    auto: 'Appearance: Auto (follows IDE theme) — click to switch',
    light: 'Appearance: Light — click to switch',
    dark: 'Appearance: Dark — click to switch'
  };
  var root = document.documentElement;
  var appearanceMode = savedAppearance();
  var currentTheme = null; // applyTheme가 설정 — off는 속성이 없어 DOM에서 못 읽는다
  var fsOffset = savedFsOffset();

  function savedTheme() {
    try {
      var v = localStorage.getItem(THEME_KEY);
      return THEMES.some(function (t) { return t.id === v; }) ? v : DEFAULT_THEME;
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

  function applyTheme(id) {
    currentTheme = id;
    if (id === 'off') {
      root.removeAttribute('data-mts-theme');
    } else {
      root.setAttribute('data-mts-theme', id);
    }
    try { localStorage.setItem(THEME_KEY, id); } catch (e) { /* persistence unavailable */ }
    refreshWidget();
  }

  function savedFsOffset() {
    try {
      var v = parseInt(localStorage.getItem(FS_KEY), 10);
      return v >= FS_MIN && v <= FS_MAX ? v : 0;
    } catch (e) {
      return 0;
    }
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
    try { localStorage.setItem(FS_KEY, String(fsOffset)); } catch (e) { /* ignore */ }
    applyFsOffset();
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

  function cycleAppearance() {
    appearanceMode = appearanceMode === 'auto' ? 'light' : appearanceMode === 'light' ? 'dark' : 'auto';
    try { localStorage.setItem(APPEARANCE_KEY, appearanceMode); } catch (e) { /* ignore */ }
    applyAppearance();
    refreshWidget();
  }

  function refreshWidget() {
    var host = document.getElementById('mts-switcher');
    if (!host) return;
    var buttons = host.querySelectorAll('button[data-mts-id]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('mts-on', buttons[i].getAttribute('data-mts-id') === currentTheme);
    }
    var appearanceButton = host.querySelector('.mts-appearance');
    if (appearanceButton) {
      appearanceButton.innerHTML = ICONS[appearanceMode];
      appearanceButton.setAttribute('title', TITLES[appearanceMode]);
    }
    var minus = host.querySelector('.mts-fs-minus');
    var plus = host.querySelector('.mts-fs-plus');
    if (minus && plus) {
      var off = currentTheme === 'off';
      minus.disabled = off || fsOffset <= FS_MIN;
      plus.disabled = off || fsOffset >= FS_MAX;
      var now = ' (now ' + (fsOffset > 0 ? '+' : '') + fsOffset + 'px)';
      minus.setAttribute('title', off ? 'Font size — pick a theme first' : 'Decrease font size' + now);
      plus.setAttribute('title', off ? 'Font size — pick a theme first' : 'Increase font size' + now);
    }
  }

  // 스크롤 중에는 스위처 대신 미니 핸들(점)을 남기고,
  // 핸들에 호버/클릭하면 스위처가 복귀한다(peeking). 스위처에서 벗어나면 다시 핸들로.
  var peeking = false;

  function isScrolled() {
    return (window.scrollY || document.documentElement.scrollTop || 0) > 24;
  }

  function refreshCorner() {
    var host = document.getElementById('mts-switcher');
    var handle = document.getElementById('mts-handle');
    if (!host || !handle) return;
    var scrolled = isScrolled();
    if (!scrolled) peeking = false;
    host.classList.toggle('mts-hidden', scrolled && !peeking);
    handle.classList.toggle('mts-visible', scrolled && !peeking);
  }

  function ensureWidget() {
    if (document.getElementById('mts-switcher')) return;
    var host = document.createElement('div');
    host.id = 'mts-switcher';
    THEMES.forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = t.label;
      btn.setAttribute('data-mts-id', t.id);
      btn.setAttribute('title', 'Switch to ' + t.label + ' theme');
      btn.addEventListener('click', function () { applyTheme(t.id); });
      host.appendChild(btn);
    });
    var sep = document.createElement('span');
    sep.className = 'mts-sep';
    host.appendChild(sep);
    function fsButton(cls, text, delta) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mts-fs ' + cls;
      b.textContent = text;
      b.addEventListener('click', function () { nudgeFontSize(delta); });
      return b;
    }
    host.appendChild(fsButton('mts-fs-minus', 'A-', -1));
    host.appendChild(fsButton('mts-fs-plus', 'A+', 1));
    var sep2 = document.createElement('span');
    sep2.className = 'mts-sep';
    host.appendChild(sep2);
    var appearanceButton = document.createElement('button');
    appearanceButton.type = 'button';
    appearanceButton.className = 'mts-appearance';
    appearanceButton.addEventListener('click', cycleAppearance);
    host.appendChild(appearanceButton);
    host.addEventListener('mouseleave', function () {
      if (isScrolled()) {
        peeking = false;
        refreshCorner();
      }
    });
    root.appendChild(host);

    var handle = document.createElement('div');
    handle.id = 'mts-handle';
    handle.setAttribute('title', 'Markdown theme');
    function peek() {
      peeking = true;
      refreshCorner();
    }
    handle.addEventListener('mouseenter', peek);
    handle.addEventListener('click', peek);
    root.appendChild(handle);

    refreshWidget();
    refreshCorner();
  }

  applyAppearance();
  applyFsOffset();
  applyTheme(savedTheme());

  window.addEventListener('scroll', refreshCorner, { passive: true });

  // 위젯은 <html> 직속이라 본문 incremental 패치에 제거되지 않는다 — 1회 부착으로 충분
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureWidget);
  } else {
    ensureWidget();
  }
})();
