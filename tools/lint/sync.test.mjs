// mts-ide.js(IDE 설정 동기화 브리지) 단위 테스트 — 초기값 우선순위·마이그레이션·강등·확인 응답 처리.
// 의존성 없음(node:test + vm). 실행: npm run test:sync (npm run lint에 포함 — CI lint 잡이 돈다)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const BRIDGE = readFileSync(new URL("../../src/main/resources/themes/mts-ide.js", import.meta.url), "utf8");

const DEFAULTS = { theme: "gh", appearance: "auto", fs: 0, w: 0 };
const THEMES = ["off", "gh", "nt", "dc", "rd"];
const APPEARANCES = ["auto", "light", "dark"];

// mts.js normalizeState와 같은 규칙
function normalize(s) {
  const int = (v) => typeof v === "number" && Math.floor(v) === v && v >= -3 && v <= 3;
  if (!s || !THEMES.includes(s.theme) || !APPEARANCES.includes(s.appearance) || !int(s.fs) || !int(s.w)) return null;
  return { theme: s.theme, appearance: s.appearance, fs: s.fs, w: s.w };
}

/**
 * 브리지를 새 페이지처럼 로드한다.
 * ide: 프리루드(window.__mtsIde) — undefined면 프리루드 없음. pipe: false면 messagePipe 자체가 없음.
 * store: localStorage 내용(페이지 간 공유 — 같은 객체를 넘기면 "재로드"가 된다)
 */
function load({ ide, store = {}, pipe = true, alreadyReady = false } = {}) {
  const posted = [];
  const listeners = {};
  const events = {};
  const applied = [];
  const win = {
    addEventListener: (name, fn) => { (events[name] ||= []).push(fn); },
    localStorage: {
      getItem: (k) => (Object.hasOwn(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
  };
  if (ide !== undefined) win.__mtsIde = ide;
  if (pipe) {
    win.__IntelliJTools = {
      messagePipe: {
        post: (tag, data) => posted.push([tag, data]),
        subscribe: (tag, fn) => { (listeners[tag] ||= []).push(fn); },
      },
    };
    if (alreadyReady) win.__IntelliJTools.___jcefMessagePipePostToIdeFunction = () => {};
  }
  win.window = win;
  vm.runInNewContext(BRIDGE, win);
  const sync = win.__mtsSync;
  return {
    store, posted, applied,
    connect: (local) => sync.connect({ local, defaults: DEFAULTS, normalize, apply: (s) => applied.push(s) }),
    push: (fields) => sync.push(fields),
    ideReady: () => (events.IdeReady || []).forEach((fn) => fn()),
    receive: (obj) => (listeners["mts:state"] || []).forEach((fn) => fn(typeof obj === "string" ? obj : JSON.stringify(obj))),
  };
}

const ide = (rev, s = {}, pipe = true) => ({ pipe, rev, ...DEFAULTS, ...s });
const fields = (data) => Object.fromEntries(new URLSearchParams(data));
const custom = { theme: "rd", appearance: "dark", fs: 2, w: -1 };

test("프리루드가 없으면 로컬 값 그대로 — 보내지 않고 미확인으로만 남긴다", () => {
  const p = load({});
  assert.deepEqual(p.connect(custom), custom);
  p.ideReady();
  p.push({ theme: "nt" });
  assert.deepEqual(p.posted, []);
  assert.equal(p.store["mts-pending"], "1");
});

test("IDE 값이 없고(rev 0) 로컬이 기본값이면 올리지 않는다 — 현재 상태만 묻는다", () => {
  const p = load({ ide: ide(0) });
  assert.deepEqual(p.connect({ ...DEFAULTS }), DEFAULTS);
  p.ideReady();
  assert.deepEqual(p.posted, [["mts:ready", ""]]);
});

test("마이그레이션: IDE 값이 없으면 기존 로컬 선택을 base=0 조건부로 올린다(IdeReady 뒤에)", () => {
  const p = load({ ide: ide(0), store: { "mts-theme": "rd" } });
  assert.deepEqual(p.connect(custom), custom);
  assert.deepEqual(p.posted, [], "IdeReady 전에는 post하지 않는다");
  p.ideReady();
  assert.equal(p.posted.length, 1, "보낼 변경이 있으면 ready는 따로 보내지 않는다");
  assert.equal(p.posted[0][0], "mts:set");
  assert.deepEqual(fields(p.posted[0][1]), { seq: "1", base: "0", theme: "rd", appearance: "dark", fs: "2", w: "-1" });
  assert.equal(p.store["mts-pending"], "1");
  // 확인 응답 → 미확인 해제, 기준 revision 기록
  p.receive({ rev: 500, ...custom, seq: 1 });
  assert.equal(p.store["mts-pending"], "0");
  assert.equal(p.store["mts-ide-rev"], "500");
});

test("IDE에 값이 있으면 이전 버전의 로컬 값(동기화 기록 없음)보다 IDE가 이긴다", () => {
  const store = { "mts-theme": "rd" };
  const p = load({ ide: ide(700, { theme: "nt" }), store });
  assert.deepEqual(p.connect(custom), { ...DEFAULTS, theme: "nt" });
  assert.equal(store["mts-ide-rev"], "700");
  assert.equal(store["mts-pending"], "0");
  p.ideReady();
  assert.deepEqual(p.posted, [["mts:ready", ""]]);
});

test("미확인 로컬 변경은 그 뒤 IDE 값이 그대로일 때만 이긴다 — base=rev 조건부로 다시 올린다", () => {
  const p = load({ ide: ide(700), store: { "mts-ide-rev": "700", "mts-pending": "1" } });
  assert.deepEqual(p.connect(custom), custom);
  p.ideReady();
  assert.deepEqual(fields(p.posted[0][1]), { seq: "1", base: "700", ...Object.fromEntries(Object.entries(custom).map(([k, v]) => [k, String(v)])) });
});

test("미확인 로컬 변경이 있어도 그 사이 IDE 값이 바뀌었으면(다른 IDE·액션) IDE가 이긴다", () => {
  const store = { "mts-ide-rev": "700", "mts-pending": "1" };
  const p = load({ ide: ide(900, { theme: "dc" }), store });
  assert.deepEqual(p.connect(custom), { ...DEFAULTS, theme: "dc" });
  assert.equal(store["mts-pending"], "0");
  assert.equal(store["mts-ide-rev"], "900");
});

test("강등: IDE에 보낼 수 없으면(pipe=false) 위젯 변경이 로컬에 남고 다음 로드에서 유지된다", () => {
  const store = {};
  const p1 = load({ ide: ide(700, {}, false), store });
  p1.connect({ ...DEFAULTS });
  p1.ideReady();
  p1.push({ theme: "nt" });
  assert.deepEqual(p1.posted, []);
  store["mts-theme"] = "nt"; // mts.js가 미러에 쓴다
  // 재로드 — IDE 값은 그대로(700)
  const p2 = load({ ide: ide(700, {}, false), store });
  assert.deepEqual(p2.connect({ ...DEFAULTS, theme: "nt" }), { ...DEFAULTS, theme: "nt" });
});

test("강등: post가 조용히 실패해 확인이 안 와도 다음 로드에서 로컬 선택이 유지된다", () => {
  const store = {};
  const p1 = load({ ide: ide(700), store });
  p1.connect({ ...DEFAULTS });
  p1.ideReady();
  p1.push({ fs: 1 }); // 응답 없음
  const p2 = load({ ide: ide(700), store });
  assert.deepEqual(p2.connect({ ...DEFAULTS, fs: 1 }), { ...DEFAULTS, fs: 1 });
});

test("IdeReady 전 변경은 순서대로 쌓였다가 보내진다", () => {
  const p = load({ ide: ide(700) });
  p.connect({ ...DEFAULTS });
  p.push({ fs: 1 });
  p.push({ fs: 2 });
  assert.deepEqual(p.posted, []);
  p.ideReady();
  assert.deepEqual(p.posted.map(([t, d]) => [t, fields(d)]), [
    ["mts:set", { seq: "1", fs: "1" }],
    ["mts:set", { seq: "2", fs: "2" }],
  ]);
});

test("이미 IdeReady가 지난 페이지면 바로 보낸다", () => {
  const p = load({ ide: ide(700), alreadyReady: true });
  p.connect({ ...DEFAULTS });
  assert.deepEqual(p.posted, [["mts:ready", ""]]);
});

test("자기 변경의 앞선 확인은 무시하고(연타 깜빡임 방지) 마지막 확인만 적용한다", () => {
  const p = load({ ide: ide(700), alreadyReady: true });
  p.connect({ ...DEFAULTS });
  p.push({ fs: 1 });
  p.push({ fs: 2 });
  p.receive({ rev: 701, ...DEFAULTS, fs: 1, seq: 1 });
  assert.deepEqual(p.applied, []);
  assert.equal(p.store["mts-pending"], "1");
  p.receive({ rev: 702, ...DEFAULTS, fs: 2, seq: 2 });
  assert.deepEqual(p.applied, [{ ...DEFAULTS, fs: 2 }]);
  assert.equal(p.store["mts-pending"], "0");
  assert.equal(p.store["mts-ide-rev"], "702");
});

test("다른 곳에서 온 상태(다른 preview·액션·Settings Sync)는 바로 적용한다", () => {
  const p = load({ ide: ide(700) });
  p.connect({ ...DEFAULTS });
  p.receive({ rev: 800, ...DEFAULTS, theme: "off" });
  assert.deepEqual(p.applied, [{ ...DEFAULTS, theme: "off" }]);
  assert.equal(p.store["mts-ide-rev"], "800");
});

test("IDE에서 온 값도 검증한다 — 허용 밖·rev 0·깨진 JSON은 버린다", () => {
  const p = load({ ide: ide(700) });
  p.connect({ ...DEFAULTS });
  p.receive({ rev: 800, ...DEFAULTS, theme: "evil" });
  p.receive({ rev: 800, ...DEFAULTS, fs: 9 });
  p.receive({ rev: 800, ...DEFAULTS, w: 1.5 });
  p.receive({ rev: 0, ...DEFAULTS, theme: "nt" });
  p.receive({ rev: -1, ...DEFAULTS });
  p.receive("{not json");
  assert.deepEqual(p.applied, []);
});

test("허용 밖 값의 프리루드는 없는 것으로 친다 — 로컬로 동작", () => {
  const p = load({ ide: { pipe: true, rev: 700, theme: "x", appearance: "auto", fs: 0, w: 0 } });
  assert.deepEqual(p.connect(custom), custom);
});

test("messagePipe가 없는 환경(정적 하네스 등)에서도 예외 없이 로컬로 동작한다", () => {
  const p = load({ ide: ide(700), pipe: false });
  assert.deepEqual(p.connect({ ...DEFAULTS }), DEFAULTS);
  p.push({ theme: "nt" });
  assert.equal(p.store["mts-pending"], "1");
});
