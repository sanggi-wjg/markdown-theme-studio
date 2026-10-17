// CI 정적 렌더 하네스 — IDE 없이 PR마다 4테마×2외관 감사를 돌린다.
// 입력: snapshots/<laf>/*.html(실제 preview 캡처, capture.py) + build/served(IDE가 서빙하는 바이트,
// ./gradlew exportServedResources). IDE가 mts.js 앞에 함께 서빙하는 설정 동기화 브리지(mts-ide-<토큰>.js —
// window.__mtsIde 프리루드 + window.__mtsSync)는 연동 검사 한 조합(auditBridge)에서만 싣는다 — 나머지 조합의
// 위젯은 localStorage 강등 경로로 동작하고 초기 상태는 기본값이다. 사용자 Custom CSS 자리(inline.css)는 비우거나(clean) 적대적 스니펫
// (adversarial-custom.css, custom)으로 채운다.
// 검사(판정 기준은 tools/mts_audit.py와 같다 — FAIL 3.0 / WARN 4.5, small 3.0, del 1.8):
//   - 동물원: tools/mts_audit.js가 주입하는 요소 동물원의 대비·레이아웃(가로 넘침, pre 스크롤, URL 줄바꿈,
//     본문 크기·정렬)과 commandRunner 실행 아이콘 숨김(동물원 + 스냅샷 본문의 실제 실행 링크)
//   - 본문: 실제 스냅샷 본문의 보이는 글자 노드 전부의 대비(scan.js — 코드펜스·취소선·SVG·수식·동물원 제외)와
//     본문 단 폭(--mts-measure)
//   - 위젯: 스위처의 보이는 글자 노드 대비를 닫힌 상태(휴지 Aa 버튼)·열린 상태(패널) × 테마 5(off 포함)
//     × 외관 2로 직접 잰다(clean·custom 둘 다). axe-core는 ARIA·접근 가능한 이름 규칙만 —
//     color-contrast는 fixed 위젯에서 전부 incomplete(판정 불가)라 끄고 위 직접 계산으로 대신한다
//   - 언어: IDE 로드 순서(빈 body에서 mts.js 실행 → 본문 패치)를 재현한 뒤 픽스처별 판정 기대값
//   - 연동: 한 조합(다크 LaF·클린·sample·900px)에서 브리지 → mts.js 순으로 실어 고정 IDE 상태가 위젯 초기 상태·
//     localStorage 미러로 가는지, rev 0이면 기본값으로 시작하는지, 위젯 변경이 브리지로 넘어가는지(미확인 표시),
//     같은 저장소로 다시 열면 그 미확인 변경이 이기는지(rev 0이면 마이그레이션 대기로 남는지)와 페이지 에러 없음·
//     첫 패치 언어 판정을 본다
// 한계 — 회귀 조기 검출용이고 최종 판정은 CDP 하네스(verify-preview)다:
//   - Linux headless Chromium + Playwright 기본 폰트다. macOS JCEF의 폰트 폴백에 좌우되는 문제(이모지
//     글리프, 한글 폴백 폰트, 427px 패널의 실제 줄바꿈 폭)는 재현하지 않는다. JCEF와 Chromium 버전도 다르다
//   - 스냅샷은 2026.2 번들 렌더 캡처다. 2025.1(요소 적음)·2026.3(table.frontmatter-header 등) DOM 차이는
//     동물원(mts_audit.js)에 넣은 만큼만 다룬다
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const SERVED = path.join(ROOT, "build/served");
const OUT = path.join(ROOT, "build/static-harness");
const AUDIT_JS = fs.readFileSync(path.join(ROOT, "tools/mts_audit.js"), "utf8");
const SCAN_JS = fs.readFileSync(path.join(HERE, "scan.js"), "utf8");
const AXE_JS = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const ADVERSARIAL = fs.readFileSync(path.join(HERE, "adversarial-custom.css"), "utf8");

const THEMES = ["gh", "nt", "dc", "rd"];
const APPEARANCES = ["light", "dark"];
// tools/mts_audit.py와 같은 기준
const EXPECTED_FS = { gh: 16.0, nt: 16.5, dc: 15.5, rd: 18.0 };
const LOW_CONTRAST_OK = { del: 1.8, small: 3.0 };
const FAIL = 3.0;
const WARN = 4.5;
// 픽스처별 문서 언어 판정 기대값(mts.js detectLang) — 한국어는 ko, 영어는 판정 없음(null = 기본 동작).
// 스냅샷 목록이기도 하다: snapshots/<laf>/<키>.html이 전부 있어야 한다
const EXPECTED_LANG = { elements: "ko", sample: "ko", english: null };
const FIXTURES = Object.keys(EXPECTED_LANG).sort();
// 스냅샷 본문의 commandRunner 실행 링크(a[data-command]) 최소 개수 — 숨김 판정이 실제 번들 마크업에도 걸리는지.
// elements.md: 인라인 1 + 표 셀 1 + shell 펜스(블록 1·줄 1), sample.md: 작업 목록의 인라인 1
const EXPECTED_RUN_LINKS = { elements: 4, sample: 1 };
// 30×30 단색 PNG — 번들 실행 아이콘의 원본 크기(30px) 대역
const RUN_ICON_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAK0lEQVR42u3NMQEAAAQAMDVF0ExLYnDs2L3IrrkQYrFYLBaLxWKxWCz+Gy904Xmdae+ZnQAAAABJRU5ErkJggg==",
  "base64");
// preview 기본 폭(노트북 분할 레이아웃 실측 427px)과 넓은 패널
const VIEWPORTS = [{ width: 900, height: 1200 }, { width: 427, height: 900 }];
const WIDE = VIEWPORTS[0].width;
// 첫 본문 패치는 MutationObserver에서 즉시 판정, 이후 변경은 400ms로 묶는다(mts.js watchLang). 언어 첫 판정은
// 대기 없이 재부착 직후에 읽고(openPage), 이 정착 시간은 나머지 검사와 "디바운스 재판정이 뒤집지 않는지" 확인용
const LANG_SETTLE_MS = 500;
// 본문 단 폭 허용 오차(px) — 서브픽셀 반올림
const MEASURE_TOL = 1.5;
// 위젯 axe: ARIA·이름 규칙만 본다(대비는 scan.js가 직접)
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } }, resultTypes: ["violations", "incomplete"] };

/** 출력이 다 나간 뒤 끝낸다 — process.exit()은 파이프로 받는 stdout·stderr에 아직 못 쓴 출력을 버린다(#60).
 *  끝나지 않는 Promise다: await하면 아래로 진행하지 않고 쓰기 콜백의 exit으로 끝난다 */
function exitAfter(stream, text, code) {
  return new Promise(() => stream.write(text + "\n", () => process.exit(code)));
}

if (!fs.existsSync(path.join(SERVED, "mts.css"))) {
  await exitAfter(process.stderr, "build/served 없음 — 먼저 ./gradlew exportServedResources", 2);
}
// 스냅샷이 빠지면 조합이 조용히 줄어든다 — LaF 둘 × 기대 픽스처 전부가 있어야 돈다
const missing = APPEARANCES.flatMap((laf) => [
  ...FIXTURES.map((f) => `snapshots/${laf}/${f}.html`),
  `snapshots/${laf}/upstream`,
]).filter((p) => !fs.existsSync(path.join(HERE, p)));
if (missing.length) {
  await exitAfter(process.stderr, `스냅샷 없음: ${missing.join(", ")} — capture-all.sh <light|dark>로 찍을 것`, 2);
}
// 픽스처가 바뀌었는데 스냅샷을 다시 찍지 않으면 낡은 DOM으로 조용히 통과한다 — 캡처 때 기록한 해시와 비교
const stale = APPEARANCES.flatMap((laf) => FIXTURES.filter((f) => {
  const rec = path.join(HERE, "snapshots", laf, `${f}.fixture-sha256`);
  const now = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, "fixtures", `${f}.md`))).digest("hex");
  return !fs.existsSync(rec) || fs.readFileSync(rec, "utf8").trim() !== now;
}).map((f) => `${laf}/${f}`));
if (stale.length) {
  await exitAfter(process.stderr,
    `스냅샷이 현재 fixtures와 다름: ${stale.join(", ")} — capture-all.sh <light|dark> <fixtures/x.md…>로 다시 찍을 것`, 2);
}
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });

/** 스냅샷 디렉터리를 모드별 작업 디렉터리로 복사하고 자리표시자·custom CSS를 채운다 */
function stage(laf, mode) {
  const src = path.join(HERE, "snapshots", laf);
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), `mts-${laf}-${mode}-`));
  fs.cpSync(src, dst, { recursive: true });
  fs.copyFileSync(path.join(SERVED, "mts.css"), path.join(dst, "mts.css"));
  // preview에서 사용자 Custom CSS는 우리 시트 뒤 inline.css로 로드된다 — 같은 자리를 채운다
  fs.writeFileSync(path.join(dst, "upstream", "inline.css"), mode === "custom" ? ADVERSARIAL : "");
  // commandRunner 실행 아이콘 이미지는 IDE가 서빙해 스냅샷에 없다 — 깨진 이미지는 0×0이라 아이콘이 새도
  // 칩 크기 비교(_runIcons.chipDw/Dh)가 링크 여백(약 4px)만 보고 실제 증상(30px 아이콘으로 칩 +34px)을
  // 재현하지 못한다. 원본과 같은 30px 대역 이미지를 같은 경로에 둔다
  fs.mkdirSync(path.join(dst, "commandRunner"), { recursive: true });
  for (const icon of ["run.png", "runrun.png"]) fs.writeFileSync(path.join(dst, "commandRunner", icon), RUN_ICON_PNG);
  for (const f of FIXTURES) {
    const p = path.join(dst, f + ".html");
    fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("__MTS_CSS__", "mts.css"));
  }
  return dst;
}

const violations = [];
const counts = {};
function flag(cat, msg) {
  counts[cat] = (counts[cat] || 0) + 1;
  violations.push(msg);
}

function judgeZoo(combo, data) {
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith("_")) continue;
    if (v === "MISSING") { flag("동물원", `[${combo}] 동물원 ${k}: 요소 렌더 실패(MISSING)`); continue; }
    const c = v.contrast;
    if (c == null) continue;
    const limit = LOW_CONTRAST_OK[k] ?? FAIL;
    if (c < limit) flag("동물원", `[${combo}] 동물원 ${k}: 대비 ${c} (FAIL <${limit}) bg=${v.bg}`);
    else if (c < WARN && !(k in LOW_CONTRAST_OK)) flag("동물원", `[${combo}] 동물원 ${k}: 대비 ${c} (WARN <4.5) bg=${v.bg}`);
  }
  // commandRunner 실행 아이콘은 테마 활성 시 숨는다(CLAUDE.md 계약) — mts_audit.py와 같은 판정
  const run = data._runIcons;
  if (!run) flag("실행 아이콘", `[${combo}] mts_audit.js가 _runIcons를 내지 않음`);
  else {
    for (const v of run.visible) flag("실행 아이콘", `[${combo}] 실행 아이콘 보임: ${v}`);
    if (Math.abs(run.chipDw) > 0.5 || Math.abs(run.chipDh) > 0.5) {
      flag("실행 아이콘", `[${combo}] 실행 칩 크기 차이 Δw=${run.chipDw} Δh=${run.chipDh} (아이콘 없는 칩 대비)`);
    }
    if (run.chipText !== "./gradlew build") flag("실행 아이콘", `[${combo}] 실행 칩 텍스트 손상: ${JSON.stringify(run.chipText)}`);
    // 스냅샷에서 실행 링크가 빠지면(번들 commandRunner가 링크를 달지 않은 채 캡처 등) 문서 쪽 판정이 조용히 빈다
    const want = EXPECTED_RUN_LINKS[combo.split("/")[2].split("@")[0]] ?? 0;
    if (run.doc < want) flag("실행 아이콘", `[${combo}] 스냅샷 실행 링크 ${run.doc}개 (기대 ${want}개 이상) — 캡처 확인`);
  }
  const lay = data._layout;
  if (lay.bodyHScroll > 2) flag("레이아웃", `[${combo}] body 가로 오버플로 ${lay.bodyHScroll}px`);
  if (!["auto", "scroll"].includes(lay.preOverflowX)) flag("레이아웃", `[${combo}] pre overflow-x=${lay.preOverflowX}`);
  if (lay.urlOverflows) flag("레이아웃", `[${combo}] 긴 URL 문단이 넘침(줄바꿈 안 됨)`);
  const theme = combo.split("/")[3];
  const fs_ = parseFloat(lay.pFontSize);
  if (Math.abs(fs_ - EXPECTED_FS[theme]) > 0.6) flag("레이아웃", `[${combo}] 본문 크기 ${fs_}px (기대 ${EXPECTED_FS[theme]}px)`);
  if (lay.pTextAlign !== "start") flag("레이아웃", `[${combo}] p text-align=${lay.pTextAlign} (기대 start)`);
}

function judgeLow(cat, label, low) {
  for (const x of low) {
    flag(cat, `[${label}] ${cat} ${x.key} "${x.text}": 대비 ${x.contrast} (${x.level} <${x.limit}) fg=${x.fg} bg=${x.bg}`);
  }
}

function judgeBody(combo, r) {
  // 스냅샷이 깨져 본문이 비면 대비 검사가 조용히 통과한다
  if (r.scanned < 30) flag("본문", `[${combo}] 본문 글자 노드 ${r.scanned}개 — 스냅샷 렌더 실패?`);
  judgeLow("본문", combo, r.low);
  if (r.unparsed.length) flag("본문", `[${combo}] 본문 색 파싱 실패 ${r.unparsed.join(" | ")}`);
  const m = r.measure;
  if (Math.abs(m.content - m.expected) > MEASURE_TOL) {
    flag("레이아웃", `[${combo}] 본문 단 폭 ${m.content}px (기대 ${m.expected}px, 좌우 패딩 ${m.padX}px / 설계 ${m.designPadX}px)`);
  }
}

function judgeWidget(label, r, open) {
  if (r.missing) { flag("위젯", `[${label}] 위젯 없음(#mts-root)`); return; }
  if (r.open !== open) flag("위젯", `[${label}] 패널 ${r.open ? "열림" : "닫힘"} (기대 ${open ? "열림" : "닫힘"})`);
  // 패널 글자 노드 ~20개(견본 4·라벨·스테퍼 값·세그먼트), 닫힌 상태는 Aa 하나
  if (r.scanned < (open ? 15 : 1)) flag("위젯", `[${label}] 위젯 글자 노드 ${r.scanned}개 — 렌더 실패?`);
  judgeLow("위젯", label, r.low);
  if (r.unparsed.length) flag("위젯", `[${label}] 위젯 색 파싱 실패 ${r.unparsed.join(" | ")}`);
}

async function scan(page, target) {
  // 진행 중인 전환(Aa 버튼 opacity 0.15s 등)이 끝난 값을 잰다 — 아니면 측정이 타이밍에 따라 흔들린다
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect && a.effect.getComputedTiming().endTime !== Infinity)
    .map((a) => a.finished.catch(() => null))));
  return JSON.parse(await page.evaluate(`(${SCAN_JS})(${JSON.stringify(target)})`));
}

/** IDE 로드 순서로 연다 — preview는 빈 body로 로드돼 mts.js가 먼저 돌고, 본문은 그 뒤 IncrementalDOM
 *  패치로 채워진다. 본문이 찬 상태에서 주입하면 첫 패치 감시(watchLang)가 고장 나도 판정이 맞아 보인다 */
async function openPage(browser, file, vp, servedJs) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await page.goto("file://" + file);
  await page.evaluate(() => { window.__mtsBody = [...document.body.childNodes]; document.body.replaceChildren(); });
  await page.addScriptTag({ content: servedJs }); // IDE와 같은 프리루드(LaF) + 위젯
  // 첫 패치 즉시 판정(첫 페인트 전 lang)을 시간 의존 없이 검증한다 — 재부착과 같은 evaluate에서 macrotask
  // 경계 하나(MutationObserver 콜백은 그 전 microtask)만 넘기고 읽는다. 벽시계 대기를 두면 400ms 디바운스로
  // 늦게 다는 회귀가 가려진다
  const firstLang = await page.evaluate(async () => {
    document.body.append(...window.__mtsBody);
    delete window.__mtsBody;
    await new Promise((r) => setTimeout(r, 0));
    return ["data-mts-lang", "lang"].map((a) => document.documentElement.getAttribute(a));
  });
  await page.waitForTimeout(LANG_SETTLE_MS);
  return { page, firstLang };
}

async function hideZoo(page, hidden) {
  await page.evaluate((h) => { const z = document.getElementById("mts-audit"); if (z) z.hidden = h; }, hidden);
}

/** 위젯 감사 — 상태는 위젯 자체 UI로 바꾼다(applyTheme·setAppearance 경로라 off 표시·스테퍼 비활성까지 실제와 같다) */
async function auditWidget(page, prefix, shots) {
  await page.addScriptTag({ content: AXE_JS });
  for (const theme of [...THEMES, "off"]) {
    for (const ap of APPEARANCES) {
      await page.evaluate(([t, a]) => {
        const q = (s) => document.querySelector(s);
        if (q("#mts-panel").hidden) q("#mts-aa").click();
        q(`#mts-root .mts-themes [data-mts-id="${t}"]`).click();
        q(`#mts-root .mts-segment [data-mts-id="${a}"]`).click();
      }, [theme, ap]);
      const label = `${prefix}/${theme}/${ap}`;
      judgeWidget(`${label}/열림`, await scan(page, "widget"), true);
      if (theme === "gh") {
        await axeWidget(page, `${label}/열림`);
        if (shots) {
          const box = await page.evaluate(() => {
            const r = document.getElementById("mts-root").getBoundingClientRect();
            return { x: r.left - 12, y: 0, width: r.width + 24, height: r.bottom + 12 };
          });
          await page.screenshot({ path: path.join(OUT, "shots", `${shots}_widget-${ap}.png`), clip: box });
        }
      }
      // Esc로 닫으면 Aa로 포커스가 돌아와 :focus-visible(opacity 1)이 된다 — 휴지 상태를 재려고 포커스를 뺀다
      await page.evaluate(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        document.activeElement.blur();
      });
      judgeWidget(`${label}/닫힘`, await scan(page, "widget"), false);
      if (theme === "gh") await axeWidget(page, `${label}/닫힘`);
    }
  }
}

// axe 판정 불가(incomplete)도 실패로 본다 — 단, aria-haspopup 버튼의 aria-controls는 axe가 팝업의 지연 생성을
// 가정해 항상 "검토 필요"(controlsWithinPopup)로 남긴다. 참조 대상이 실제로 있는지 직접 확인해 대신한다
async function axeWidget(page, label) {
  const res = await page.evaluate(async (opts) => {
    const r = await window.axe.run({ include: [["#mts-root"]] }, opts);
    const resolved = (n) => [...n.any, ...n.all, ...n.none].every((c) => {
      const id = c.data && c.data.messageKey === "controlsWithinPopup" && /aria-controls="([^"]+)"/.exec(c.data.needsReview || "");
      return id && id[1].split(/\s+/).every((x) => document.getElementById(x));
    });
    r.incomplete = r.incomplete.map((v) => ({ ...v, nodes: v.nodes.filter((n) => !resolved(n)) })).filter((v) => v.nodes.length);
    return { violations: r.violations, incomplete: r.incomplete };
  }, AXE_OPTIONS);
  for (const [kind, list] of [["위반", res.violations], ["판정 불가", res.incomplete]]) {
    for (const v of list) {
      flag("axe", `[${label}] axe ${kind} ${v.id}: ${v.help} (${v.nodes.length}곳: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")})`);
    }
  }
}

// 설정 동기화 브리지 연동 검사의 고정 IDE 상태(프리루드 필드 이름) — ExportServedResources.kt BRIDGE_PREFS와 같아야
// 한다. build/served/mts-ide.stored.js는 이 값, mts-ide.unset.js는 같은 값에 rev 0이다(서빙 코드
// PreviewProtocol.servedBridge로 만든 바이트)
const BRIDGE_STATE = { rev: 7, theme: "nt", appearance: "light", fs: 1, w: -1 };

/** 설정 동기화 브리지(mts-ide.js) ↔ mts.js 연동 — IDE처럼 브리지를 mts.js 앞에 싣고 결과 상태를 본다. mts.js는
 *  connect()·push() 예외를 삼키고 로컬 값으로 강등하므로 연동이 깨져도 위젯은 멀쩡해 보인다. 한 조합만 —
 *  다크 LaF(appearance=light가 기본값 auto → 다크와 갈린다)·클린·sample(ko)·900px */
async function auditBridge(browser) {
  const laf = "dark";
  const fixture = "sample";
  const vp = VIEWPORTS[0];
  const dir = stage(laf, "clean");
  const mtsJs = fs.readFileSync(path.join(SERVED, `mts.${laf}.js`), "utf8");
  const s = BRIDGE_STATE;
  const variants = [
    // IDE 값으로 시작하고 localStorage 미러를 맞춘다(확인된 rev, 미확인 변경 없음)
    { name: "IDE 값", file: "mts-ide.stored.js", rev: s.rev, want: {
      theme: s.theme, appearance: s.appearance, dark: s.appearance !== "light", lafDark: true,
      fs: s.fs ? `${s.fs}px` : "", w: s.w ? `${s.w * 80}px` : "", // 80 = mts.js W_STEP
      store: {
        "mts-appearance": s.appearance, "mts-fs-offset": String(s.fs), "mts-ide-rev": String(s.rev),
        "mts-pending": "0", "mts-theme": s.theme, "mts-width-offset": String(s.w),
      },
    } },
    // rev 0 = IDE에 값 없음 — 실려 온 값을 무시하고 로컬(빈 저장소 = 기본값)로 시작한다. 기본값이라 올리지도 적지도 않는다
    { name: "IDE 값 없음(rev 0)", file: "mts-ide.unset.js", rev: 0, want: {
      theme: "gh", appearance: "auto", dark: true, lafDark: true, fs: "", w: "", store: {},
    } },
  ];
  const wantLang = EXPECTED_LANG[fixture];
  // localStorage는 키 순서가 없다 — 페이지에서 읽을 때와 같은 정렬로 맞춰 비교한다
  const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  for (const v of variants) {
    const label = `${laf}-laf/clean/${fixture}@${vp.width}/연동/${v.name}`;
    const file = path.join(SERVED, v.file);
    if (!fs.existsSync(file)) {
      flag("연동", `[${label}] build/served/${v.file} 없음 — ./gradlew exportServedResources`);
      continue;
    }
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    // 스크립트 오류만 — 리소스 로드 실패(스냅샷에 없는 IDE 서빙 이미지: 코드펜스 복사 버튼 아이콘 등)는 Chromium이
    // console error로 내지만 연동과 무관하다
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().startsWith("Failed to load resource:")) errors.push(`console.error: ${m.text()}`);
    });
    await page.goto("file://" + path.join(dir, fixture + ".html"));
    // IDE 로드 순서(openPage와 같다): 빈 body → 브리지 → mts.js(별개 스크립트 — 한쪽이 던져도 다른 쪽은 돈다) → 본문 패치
    await page.evaluate(() => { window.__mtsBody = [...document.body.childNodes]; document.body.replaceChildren(); });
    await page.addScriptTag({ content: fs.readFileSync(file, "utf8") });
    await page.addScriptTag({ content: mtsJs });
    const firstLang = await page.evaluate(async () => {
      document.body.append(...window.__mtsBody);
      delete window.__mtsBody;
      await new Promise((r) => setTimeout(r, 0));
      return ["data-mts-lang", "lang"].map((a) => document.documentElement.getAttribute(a));
    });
    await page.waitForTimeout(LANG_SETTLE_MS);
    const read = () => page.evaluate(() => {
      const r = document.documentElement;
      const picked = (group) => {
        const el = document.querySelector(`#mts-root ${group} [aria-checked="true"]`);
        return el && el.getAttribute("data-mts-id");
      };
      return {
        theme: r.getAttribute("data-mts-theme"), widgetTheme: picked(".mts-themes"), appearance: picked(".mts-segment"),
        dark: r.classList.contains("mts-dark"), lafDark: r.classList.contains("mts-laf-dark"),
        fs: r.style.getPropertyValue("--mts-fs-offset"), w: r.style.getPropertyValue("--mts-w-offset"),
        lang: ["data-mts-lang", "lang"].map((a) => r.getAttribute(a)),
        store: Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])),
      };
    });
    const got = await read();
    const want = { ...v.want, store: sorted(v.want.store), widgetTheme: v.want.theme, lang: [wantLang, wantLang] };
    for (const k of Object.keys(want)) {
      if (JSON.stringify(got[k]) !== JSON.stringify(want[k])) {
        flag("연동", `[${label}] 초기 ${k}=${JSON.stringify(got[k])} (기대 ${JSON.stringify(want[k])})`);
      }
    }
    if (JSON.stringify(firstLang) !== JSON.stringify(want.lang)) {
      flag("연동", `[${label}] 언어 판정(첫 패치 직후) ${JSON.stringify(firstLang)} (기대 ${JSON.stringify(want.lang)})`);
    }
    judgeWidget(`${label}/위젯/닫힘`, await scan(page, "widget"), false);
    // 위젯 변경 → 로컬 미러 + 브리지 push(pipe=false라 IDE로는 못 가고 미확인으로 남는다 — 기준 rev는 IDE에서 받은 값)
    await page.evaluate(() => {
      document.getElementById("mts-aa")?.click(); // 위젯이 없으면 위 judgeWidget이 이미 잡았다 — 여기서 멈추지 않는다
      document.querySelector('#mts-root .mts-themes [data-mts-id="dc"]')?.click();
    });
    const pushed = (await read()).store;
    const wantPushed = sorted({ ...v.want.store, "mts-theme": "dc", "mts-ide-rev": String(v.rev), "mts-pending": "1" });
    if (JSON.stringify(pushed) !== JSON.stringify(wantPushed)) {
      flag("연동", `[${label}] 위젯 변경 뒤 store=${JSON.stringify(pushed)} (기대 ${JSON.stringify(wantPushed)})`);
    }
    // 같은 컨텍스트(localStorage 유지)로 다시 연다 — mts.js가 저장값을 읽는 경로와, 미확인 로컬 변경이 같은 rev의
    // 다음 로드에서도 이기는지(브리지 connect 규칙 2, pipe 없는 강등 경로). IDE 값이 없으면(rev 0) 마이그레이션 대기 상태로 남는다
    await page.reload();
    await page.evaluate(() => { window.__mtsBody = [...document.body.childNodes]; document.body.replaceChildren(); });
    await page.addScriptTag({ content: fs.readFileSync(file, "utf8") });
    await page.addScriptTag({ content: mtsJs });
    await page.evaluate(() => { document.body.append(...window.__mtsBody); delete window.__mtsBody; });
    const again = await read();
    const wantAgain = v.rev ? wantPushed : sorted({ "mts-theme": "dc", "mts-ide-rev": "0", "mts-pending": "1" });
    if (again.theme !== "dc" || again.widgetTheme !== "dc" || JSON.stringify(again.store) !== JSON.stringify(wantAgain)) {
      flag("연동", `[${label}] 재로드 뒤 theme=${again.theme} widget=${again.widgetTheme} store=${JSON.stringify(again.store)} (기대 dc, ${JSON.stringify(wantAgain)})`);
    }
    for (const e of errors) flag("연동", `[${label}] ${e}`);
    report[label] = { initial: got, firstLang, pushed, reloaded: again, errors };
    await page.close();
  }
}

const browser = await chromium.launch();
const report = {};
let combos = 0;

for (const laf of APPEARANCES) {
  const servedJs = fs.readFileSync(path.join(SERVED, `mts.${laf}.js`), "utf8");
  for (const mode of ["clean", "custom"]) {
    const dir = stage(laf, mode);
    for (const fixture of FIXTURES) {
      for (const vp of VIEWPORTS) {
        const { page, firstLang } = await openPage(browser, path.join(dir, fixture + ".html"), vp, servedJs);
        if (mode === "clean" && vp.width === WIDE) {
          const want = EXPECTED_LANG[fixture];
          // 첫 판정(재부착 직후)과 정착 뒤(디바운스 재판정 포함)가 모두 기대값이어야 한다 — 흔들림을 대기로 덮지 않고
          // 실제 값을 남긴 채 실패시킨다
          const settled = await page.evaluate(() => ["data-mts-lang", "lang"].map((a) => document.documentElement.getAttribute(a)));
          for (const [when, [mark, lang]] of [["첫 패치 직후", firstLang], ["정착 뒤", settled]]) {
            if (mark !== want || lang !== want) {
              flag("언어", `[${laf}-laf/${fixture}] 언어 판정(${when}) data-mts-lang=${mark} lang=${lang} (기대 ${want})`);
            }
          }
        }
        for (const theme of THEMES) {
          for (const ap of APPEARANCES) {
            const combo = `${laf}-laf/${mode}/${fixture}@${vp.width}/${theme}/${ap}`;
            await page.evaluate(([t, dark]) => {
              document.documentElement.setAttribute("data-mts-theme", t);
              document.documentElement.classList.toggle("mts-dark", dark);
            }, [theme, ap === "dark"]);
            const data = JSON.parse(await page.evaluate(AUDIT_JS));
            judgeZoo(combo, data);
            const body = await scan(page, "body");
            judgeBody(combo, body);
            report[combo] = { ...data, _body: body };
            combos++;
            // 클린은 전 조합, 커스텀(최악 조건)은 깨지기 쉬운 다크 외관만 남긴다
            if (vp.width === WIDE && (mode === "clean" || ap === "dark")) {
              await hideZoo(page, true);
              await page.screenshot({ path: path.join(OUT, "shots", `${mode}_${laf}-laf_${fixture}_${theme}-${ap}.png`) });
              await hideZoo(page, false);
            }
          }
        }
        if (vp.width === WIDE) {
          await hideZoo(page, true);
          await auditWidget(page, `${laf}-laf/${mode}/${fixture}/위젯`, fixture === FIXTURES[0] ? `${mode}_${laf}-laf` : null);
        }
        await page.close();
      }
    }
  }
}
await auditBridge(browser);
await browser.close();

fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
const byCat = Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(", ");
const summary = [
  `정적 렌더 하네스: ${combos}조합, 위반 ${violations.length}건${byCat ? ` (${byCat})` : ""}`,
  ...violations.map((v) => "- " + v),
].join("\n");
fs.writeFileSync(path.join(OUT, "summary.md"), summary + "\n");
console.log(summary);
// process.exit()이 아니라 exitCode — 위반 목록이 길면 파이프 stdout 쓰기가 남아 있다(#60). 이벤트 루프가 비면 끝난다
process.exitCode = violations.length ? 1 : 0;
