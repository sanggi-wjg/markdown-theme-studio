// CI 정적 렌더 하네스 — IDE 없이 PR마다 4테마×2외관 감사를 돌린다.
// 입력: snapshots/<laf>/*.html(실제 preview 캡처, capture.py) + build/served(IDE가 서빙하는 바이트,
// ./gradlew exportServedResources). IDE가 mts.js 앞에 함께 서빙하는 설정 동기화 브리지(mts-ide-<토큰>.js —
// window.__mtsIde 프리루드 + window.__mtsSync)는 연동 검사 한 조합(auditBridge)에서만 싣는다 — 나머지 조합의
// 위젯은 localStorage 강등 경로로 동작하고 초기 상태는 기본값이다. 사용자 Custom CSS 자리(inline.css)는 비우거나(clean) 적대적 스니펫
// (adversarial-custom.css, custom)으로 채운다.
// 검사(판정 기준은 tools/mts_audit.py와 같다 — FAIL 3.0 / WARN 4.5, small·취소선(del·span.user-del) 안 글자는 FAIL 3.0만.
// 대비는 opacity를 그룹 합성한 실제 값이다):
//   - 동물원: tools/mts_audit.js가 주입하는 요소 동물원의 대비·레이아웃(가로 넘침, pre 스크롤, URL 줄바꿈,
//     본문 크기·정렬)과 commandRunner 실행 아이콘 숨김(동물원 + 스냅샷 본문의 실제 실행 링크), 취소선 두 형태의
//     같은 흐림(동물원 + 스냅샷 본문)과 스냅샷 취소선 개수
//   - Mermaid: 동물원(측정 문맥)·스냅샷 본문 mermaid의 HTML 라벨 박스가 테마 off·클린(custom CSS 시트 끔)과 같은지,
//     라벨 글자색이 mermaid 지정색(span)인지(#59)
//   - 본문: 실제 스냅샷 본문의 보이는 글자 노드 전부의 대비(scan.js — 코드펜스·SVG·수식·동물원 제외)와
//     본문 단 폭(--mts-measure)
//   - 위젯: 스위처의 보이는 글자 노드 대비를 닫힌 상태(휴지 Aa 버튼)·열린 상태(패널) × 테마 5(off 포함)
//     × 외관 2로 직접 잰다(clean·custom 둘 다). axe-core는 ARIA·접근 가능한 이름 규칙만 —
//     color-contrast는 fixed 위젯에서 전부 incomplete(판정 불가)라 끄고 위 직접 계산으로 대신한다
//   - 언어: IDE 로드 순서(빈 body에서 mts.js 실행 → 본문 패치)를 재현한 뒤 픽스처별 판정 기대값(data-mts-lang·lang·
//     data-mts-hangul). 스냅샷에 없는 언어 조합(영어 문서 안 한국어 표 #68, 띄어쓰기 없는 문자(한자·가나) 대조군 등)은 합성 문서
//     (lang-probes.mjs)를 같은 순서로 싣고 표식·수명(테마 off, 본문 패치로 표 제거·복원)과 표 셀·본문 word-break를 본다
//   - 연동: 한 조합(다크 LaF·클린·sample·900px)에서 브리지 → mts.js 순으로 실어 고정 IDE 상태가 위젯 초기 상태·
//     localStorage 미러로 가는지, rev 0이면 기본값으로 시작하는지, 위젯 변경이 브리지로 넘어가는지(미확인 표시),
//     같은 저장소로 다시 열면 그 미확인 변경이 이기는지(rev 0이면 마이그레이션 대기로 남는지)와 페이지 에러 없음·
//     첫 패치 언어 판정을 본다
//   - 불변식: 테마가 관여하는 계산 스타일(INVARIANT_PROPS)은 사용자 Custom CSS가 있어도 clean과 같아야 한다 —
//     같은 조합의 clean·custom을 본문·동물원 요소마다 비교한다(대비가 멀쩡해도 테마 줄 간격·여백·굵기가
//     사용자 값으로 바뀌는 누수, #54)
//   - 작성자 스타일: 문서 raw HTML의 인라인 style·표현 속성 존중(#54, #63 단계적 존중 — checkAuthorStyles). 배치·조판 속성은
//     작성자 값, 글자색·배경은 둘 다 정했을 때만 작성자 값(한쪽만이면 테마), 둘 다 정한 요소 안(작성자 색 영역)의 테마 글자색·칩은
//     작성자 색에 맞춘다. elements@900의 테마 4 × 외관 2 × LaF 2에서 값(clean)과 프로브 글자 대비(clean·custom)를, innerHTML
//     그대로와 IDE처럼 CSSOM 직렬화한 style 두 형태로 본다
//   - 체크박스: 빈 작업 목록 체크박스 테두리의 실제 픽셀이 계산값과 같은지(checkCheckboxPaint — 계산 스타일 비교로는 안 잡히는
//     Chromium 그림 회귀)
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
import { LANG_PROBES } from "./lang-probes.mjs";

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
const LOW_CONTRAST_OK = { small: 3.0 };
const FAIL = 3.0;
const WARN = 4.5;
// 취소선(del·span.user-del) 안 글자(동물원 strike 표시)는 의도한 흐림이라 FAIL 3.0만(WARN 없음) — scan.js 본문도 같다
const STRIKE_FAIL = 3.0;
// 픽스처별 문서 언어 판정 기대값(mts.js detectLang) — 한국어는 ko, 영어는 판정 없음(null = 기본 동작).
// 스냅샷 목록이기도 하다: snapshots/<laf>/<키>.html이 전부 있어야 한다
const EXPECTED_LANG = { elements: "ko", sample: "ko", english: null };
const FIXTURES = Object.keys(EXPECTED_LANG).sort();
// 픽스처별 한글 표식(data-mts-hangul — 표 셀 keep-all, #68) 기대값. 한국어 문서는 늘 함께 달린다(ko ⊂ hangul)
const EXPECTED_HANGUL = { elements: true, sample: true, english: false };
// <html>의 언어 표식 [data-mts-lang, lang, data-mts-hangul 유무] — page.evaluate로 넘긴다
const LANG_ATTRS = () => {
  const r = document.documentElement;
  return [r.getAttribute("data-mts-lang"), r.getAttribute("lang"), r.hasAttribute("data-mts-hangul")];
};
// 스냅샷 본문의 commandRunner 실행 링크(a[data-command]) 최소 개수 — 숨김 판정이 실제 번들 마크업에도 걸리는지.
// elements.md: 인라인 1 + 표 셀 1 + shell 펜스(블록 1·줄 1), sample.md: 작업 목록의 인라인 1
const EXPECTED_RUN_LINKS = { elements: 4, sample: 1 };
// 스냅샷 본문의 Mermaid HTML 라벨(svg foreignObject 안) 최소 개수 — 캡처가 mermaid 렌더 전이면 라벨 박스 판정이 동물원만
// 보고 조용히 통과한다. elements.md: flowchart 노드 4 + 간선 3
const EXPECTED_MERMAID_LABELS = { elements: 7 };
// 스냅샷 본문의 취소선(del·span.user-del) 최소 개수 — 흐림 판정(_strike)이 실제 번들 마크업에도 걸리는지.
// 세 픽스처 모두 마크다운 ~~ ~~ 1개(2026.2 = span.user-del)
const EXPECTED_STRIKES = { elements: 1, sample: 1, english: 1 };
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
// 커스텀 누수 불변식 — 테마가 관여하는 속성. 계산값만 본다: 박스 크기·위치·스크롤바처럼 폰트·환경에 좌우되거나
// 테마 밖 속성(아래 허용 목록)의 차이에 끌려 움직이는 레이아웃 파생값은 넣지 않는다. clean·custom을 같은 환경에서
// 비교하므로 폰트 폴백 차이는 상쇄된다(font-family는 사용 폰트가 아니라 선언 목록이다)
const INVARIANT_PROPS = [
  "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-align",
  "text-decoration-line", "color", "background-color", "background-image", "box-sizing",
  ...["top", "right", "bottom", "left"].flatMap((s) =>
    [`margin-${s}`, `padding-${s}`, `border-${s}-width`, `border-${s}-style`, `border-${s}-color`]),
  "border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius",
];
// 테마가 다루지 않는 자리(근거): 작업 목록 체크박스 여백은 default.css(.task-list-item input)가 주고 테마는 체크
// 색만 다룬다 — 적대적 CSS의 margin-right: 6px는 실제 Typora 스니펫 값이다
const INVARIANT_ALLOW = [{ el: /^input\b/, prop: /^margin-/ }];

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
    const limit = v.strike ? STRIKE_FAIL : (LOW_CONTRAST_OK[k] ?? FAIL);
    if (c < limit) flag("동물원", `[${combo}] 동물원 ${k}: 대비 ${c} (FAIL <${limit}) bg=${v.bg}`);
    else if (c < WARN && !v.strike && !(k in LOW_CONTRAST_OK)) flag("동물원", `[${combo}] 동물원 ${k}: 대비 ${c} (WARN <4.5) bg=${v.bg}`);
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
  // Mermaid 라벨 박스는 테마 off·클린과, 글자색은 mermaid 지정색과 같아야 한다(#59) — mts_audit.py와 같은 판정 +
  // 스냅샷 라벨 개수
  const mm = data._mermaid;
  if (!mm) flag("Mermaid", `[${combo}] mts_audit.js가 _mermaid를 내지 않음`);
  else {
    if (mm.zoo < 3) flag("Mermaid", `[${combo}] Mermaid 동물원 라벨 ${mm.zoo}개 (기대 3) — 렌더 실패?`);
    for (const d of mm.diffs) flag("Mermaid", `[${combo}] Mermaid 라벨: ${d}`);
    const want = EXPECTED_MERMAID_LABELS[combo.split("/")[2].split("@")[0]] ?? 0;
    if (mm.doc < want) flag("Mermaid", `[${combo}] 스냅샷 Mermaid 라벨 ${mm.doc}개 (기대 ${want}개 이상) — 캡처 확인`);
  }
  // 표 셀 정렬(#62) — mts_audit.py와 같은 판정. custom 모드에선 적대적 CSS의 th·td text-align도 이겨야 한다
  const align = data._align;
  if (!align) flag("표 정렬", `[${combo}] mts_audit.js가 _align을 내지 않음`);
  else {
    if (align.cells < 11) flag("표 정렬", `[${combo}] 동물원 셀 ${align.cells}개 (기대 11개)`);
    for (const v of align.bad) flag("표 정렬", `[${combo}] 표 정렬: ${v}`);
  }
  // 취소선 흐림은 두 형태(del·span.user-del) 모두 같아야 한다(#58) — mts_audit.py와 같은 판정
  const strike = data._strike;
  if (!strike) flag("취소선", `[${combo}] mts_audit.js가 _strike를 내지 않음`);
  else {
    if (!(parseFloat(strike.opacity) < 1)) flag("취소선", `[${combo}] 취소선 흐림 없음: del opacity=${strike.opacity}`);
    for (const v of strike.off) flag("취소선", `[${combo}] 취소선 흐림 불일치: ${v} (del ${strike.opacity})`);
    const want = EXPECTED_STRIKES[combo.split("/")[2].split("@")[0]] ?? 0;
    if (strike.doc < want) flag("취소선", `[${combo}] 스냅샷 취소선 ${strike.doc}개 (기대 ${want}개 이상) — 캡처 확인`);
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

/** 불변식 비교용 계산 스타일 — body와 본문·동물원 요소 전부. 제외: 위젯, SVG·수식 내부(mermaid·MathJax가 스스로
 *  스타일을 준다), mermaid 줌 버튼(2026.3+ 번들이 body 안에 두는 IDE UI 컨트롤 — 테마가 다루지 않고 적대적 CSS의
 *  맨 button 규칙을 그대로 받는다). 키는 DOM 경로, 값은 [태그.클래스, INVARIANT_PROPS 순서의 계산값] */
async function themeStyles(page) {
  return page.evaluate((props) => {
    const out = {};
    for (const el of [document.body, ...document.body.querySelectorAll("*")]) {
      if (el.closest("#mts-root, svg, mjx-container, .mermaid-zoom-button")) continue;
      const steps = [];
      for (let n = el; n !== document.body; n = n.parentElement) {
        steps.unshift(`${n.tagName.toLowerCase()}:${[...n.parentElement.children].indexOf(n)}`);
      }
      const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).join(".") : "";
      const cs = getComputedStyle(el);
      out[steps.join(">") || "body"] = [el.tagName.toLowerCase() + cls, props.map((p) => cs.getPropertyValue(p))];
    }
    return out;
  }, INVARIANT_PROPS);
}

/** custom 조합을 같은 조합의 clean과 비교한다. 테두리 색은 그 변이 그려지지 않으면(style none·hidden) 보지 않는다 —
 *  테마는 그리지 않는 변의 style만 고정하고 색은 UA 값(표 gray 등)을 그대로 둔다(클린 렌더 불변).
 *  누수 하나가 수십 조합·수백 요소에 반복되므로 (요소, 속성)별로 모아 끝에 한 건씩 낸다(reportInvariant) */
const invariantLeaks = new Map();
function judgeInvariant(combo, clean, custom) {
  if (!clean) { flag("불변식", `[${combo}] 같은 조합의 clean 기준 없음`); return; }
  const ck = Object.keys(clean);
  const uk = Object.keys(custom);
  if (ck.length !== uk.length || ck.some((k, i) => k !== uk[i])) {
    flag("불변식", `[${combo}] clean·custom DOM 불일치(${ck.length}·${uk.length}요소) — 비교 불가`);
    return;
  }
  for (const k of ck) {
    const [label, a] = clean[k];
    const b = custom[k][1];
    INVARIANT_PROPS.forEach((p, i) => {
      if (a[i] === b[i]) return;
      const side = /^border-(\w+)-color$/.exec(p);
      if (side) {
        const s = INVARIANT_PROPS.indexOf(`border-${side[1]}-style`);
        if (/^(none|hidden)$/.test(a[s]) && /^(none|hidden)$/.test(b[s])) return;
      }
      if (INVARIANT_ALLOW.some((x) => x.el.test(label) && x.prop.test(p))) return;
      const key = `${label} ${p}`;
      if (!invariantLeaks.has(key)) invariantLeaks.set(key, { combos: new Set(), n: 0, ex: `${a[i]} → ${b[i]}`, at: combo });
      const v = invariantLeaks.get(key);
      v.combos.add(combo);
      v.n++;
    });
  }
}

/** 작성자 인라인 style·표현 속성 존중(#54, #63 단계적 존중) — 테마 선언은 문서 raw HTML이 요소에 직접 단 값을 덮지 않아야
 *  한다(mts.css의 :where(:not(…)) 제외). 프로브 요소를 주입해 계산값을 보고 바로 걷어낸다. 기대값:
 *    문자열 = 작성자 값 / null = 기본 preview(테마 off)에서 잰 값(표현 속성 — Blink 매핑을 하드코딩하지 않는다) /
 *    "=<id>" = 같은 테마의 기준 요소(style 없음)와 같은 값(테마가 맡는 자리 — 글자색·배경을 한쪽만 정한 요소) /
 *    "centered" = 부모 안에서 좌우 여백이 같다(표 align — 표 폭이 테마·off에서 달라 px로 비교할 수 없다)
 *  배치·조판 속성은 작성자 값, 글자색·배경은 둘 다 정했을 때만 작성자 값이고 한쪽만이면 테마 값이다. 둘 다 정한 요소 안
 *  (작성자 색 영역)의 테마 글자색·칩은 작성자 색에 맞춘다. 판정 셀렉터의 부분 문자열 충돌(background-color 단독·border-color +
 *  background·transparent·대소문자·줄바꿈)도 여기서 본다. 값 판정은 clean 조합에서만(custom은 사용자 CSS !important가 인라인
 *  style을 이기는 게 정상), 대비 판정(프로브 글자 전부 FAIL 3.0 / WARN 4.5 — 작성자 값을 따르는 자리에서 안 보이는 글자가 생기지
 *  않는지)은 clean·custom 둘 다 */
const PROBE_HTML = [
  // 기준 요소(style 없음) — "=<id>" 기대값의 출처
  '<p id="rf-p">p</p><h3 id="rf-h3">h3</h3><p><a id="rf-a" href="#">a</a> <mark id="rf-mark">m</mark> <code id="rf-code">c</code>',
  ' <span id="rf-del" class="user-del">d</span></p><blockquote id="rf-bq"><p>q</p></blockquote>',
  '<table><thead id="rf-thead"><tr><th id="rf-th">h</th></tr></thead><tbody><tr><td id="rf-td">c</td></tr></tbody></table>',
  // ── 배치·조판 (#54에서 넘어온 것 포함) ──
  '<p id="ap-p" style="line-height: 3; font-size: 22px; font-family: monospace">p</p>',
  '<p id="ap-pfont" style="font: italic 20px/2 serif">p font</p>',
  '<p id="ap-pm" style="margin-top: 0">p</p><p id="ap-pal" align="center">p</p><p id="ap-pta" style="text-align: right">p</p>',
  '<h1 id="ap-h1" style="font-size: 20px; margin: 0; letter-spacing: 2px">h1</h1><h1 id="ap-h1al" align="right">h1</h1>',
  '<h2 id="ap-h2" style="border-bottom: none; font-family: monospace; padding-top: 2px">h2</h2>',
  '<h3 id="ap-h3l" style="line-height: 50px; font-weight: 300; padding-bottom: 5px">h3</h3>',
  '<h5 id="ap-h5" style="font-family: monospace">h5</h5>',
  '<p><img id="ap-img" width="20" height="20" style="border-radius: 50%; box-sizing: content-box; padding: 2px; max-width: 10px"></p>',
  '<table id="ap-t" style="border: 2px solid; border-radius: 6px; font-size: 19px; line-height: 30px; display: table; ' +
    'width: 300px; max-width: none; border-collapse: separate; border-spacing: 4px 6px; margin: 7px; overflow-x: visible">',
  '<thead id="ap-thead" style="border: 2px solid"><tr id="ap-tr" style="border-top: 2px solid">',
  '<th id="ap-th" style="font-size: 20px; border-radius: 4px; border: 3px dotted; padding: 1px; font-weight: 400; ' +
    'white-space: normal">h</th></tr></thead>',
  '<tbody><tr><td id="ap-td" style="font-size: 20px; line-height: 2; font-family: monospace; border-radius: 4px; ' +
    'border: 3px dotted; padding: 1px">c</td></tr></tbody></table>',
  '<table id="ap-tb" border="1"><tbody><tr><td>c</td></tr></tbody></table>',
  // HTML4 표현 속성 frame(바깥 테두리)·rules(행 그룹 테두리)도 작성자 값이다
  '<table id="ap-tf" frame="box"><tbody><tr><td>c</td></tr></tbody></table>',
  '<table border="1" rules="groups"><thead id="ap-trh"><tr><th>h</th></tr></thead><tbody id="ap-trb"><tr><td>c</td></tr></tbody></table>',
  '<table id="ap-talign" align="center"><tbody><tr><td>가운데 표</td></tr></tbody></table>',
  // 머리글·셀 정렬(#62): 인라인 text-align, 행 align(UA th 규칙이 물려받는다), align보다 우선하는 인라인 style,
  // 표의 인라인 text-align(셀이 물려받는다)
  '<table><thead><tr><th id="ap-thta" style="text-align: right">h</th></tr></thead><tbody><tr align="right">',
  '<th id="ap-trath">h</th><td id="ap-tdta" align="center" style="text-align: right">c</td></tr></tbody></table>',
  '<table style="text-align: right"><thead><tr><th id="ap-tsth">h</th></tr></thead><tbody><tr><td id="ap-tstd">c</td></tr></tbody></table>',
  // 셀 폭: 코드 셀 바닥 폭(min-width 8em)은 작성자 폭 지정을 이기지 않는다
  '<table><tbody><tr><td id="ap-tdw" width="40"><code>x</code></td><td id="ap-tdmw" style="min-width: 0"><code>y</code></td>',
  '<td><code id="ap-tdcode" style="overflow-wrap: normal">z</code></td><td id="ap-tdwb" style="word-break: break-all">한국어 셀</td></tr></tbody></table>',
  '<ul id="ap-ul" style="padding: 10px 20px; margin: 3px"><li id="ap-li" style="line-height: 3; font-size: 20px; margin: 9px 0">li</li></ul>',
  '<blockquote id="ap-bq" style="border: 1px solid; border-left: 6px double; border-radius: 10px; padding: 0; margin: 4px; ' +
    'font-size: 20px">bq</blockquote>',
  '<p><a id="ap-a" href="#" style="font-weight: 900; text-decoration: underline wavy">a</a> ',
  '<strong id="ap-strong" style="font-weight: 400">s</strong></p>',
  '<p data-ap-faint><span id="ap-del" class="user-del" style="opacity: 0.3">d</span> <del id="ap-rdel" style="opacity: 0.4">d</del></p>',
  '<dl><dt id="ap-dt" style="margin: 0; padding: 5px">dt</dt><dd id="ap-dd" style="margin: 0; padding: 0">dd</dd></dl>',
  '<p><code id="ap-icode" style="font-size: 20px; padding: 0; border: 1px solid; border-radius: 0; font-family: serif">c</code> ',
  '<kbd id="ap-kbd" style="border: none; padding: 0; font-size: 20px">k</kbd> <mark id="ap-mark" style="padding: 0; border-radius: 0">m</mark></p>',
  '<pre id="ap-pre" style="border: 2px dashed; border-radius: 0; padding: 0; margin: 0; line-height: 30px; font-size: 20px; ' +
    'overflow-x: hidden"><code id="ap-code" style="line-height: 30px; font-size: 20px">x</code></pre>',
  '<p><input id="ap-cb" type="checkbox" disabled style="color: rgb(200, 0, 0)"></p>',
  '<hr id="ap-hr" style="border-radius: 3px; height: 3px; border-top: 1px dashed; margin: 5px 0; background: none">',
  '<hr id="ap-hrw" width="120"><hr id="ap-hrws" style="width: 200px">',
  // ── 글자색·배경: 둘 다 정했을 때만 작성자 값 ──
  '<p id="cb-both" style="color: rgb(0, 0, 0); background: rgb(255, 243, 176)">both</p>',
  '<p id="cb-rev" style="background: rgb(255, 243, 176); color: rgb(0, 0, 0)">reversed</p>',
  '<p id="cb-case" style="COLOR : rgb(0, 0, 0) ; BACKGROUND : rgb(255, 243, 176)">upper</p>',
  '<p id="cb-nl" style="background: rgb(255, 243, 176);\ncolor: rgb(0, 0, 0)">newline</p>',
  '<p id="cb-img" style="color: rgb(0, 0, 0); background-image: linear-gradient(rgb(255, 255, 255), rgb(255, 255, 255))">img</p>',
  // 이미지·상속 배경은 글자 뒤 바탕을 보장하지 못한다(못 불러오거나 투명) — 배경으로 치지 않는다
  '<p id="cb-url" style="color: rgb(0, 0, 0); background: url(missing-mts-probe.png)">url</p>',
  '<p id="cb-inherit" style="color: rgb(0, 0, 0); background: inherit">inherit</p>',
  '<p id="cb-color" style="color: rgb(51, 51, 51)">color only</p>',
  '<p id="cb-bg" style="background: rgb(255, 243, 176)">bg only</p>',
  '<p id="cb-bgc" style="background-color: rgb(255, 255, 255)">bg-color only</p>',
  '<p id="cb-border" style="border-color: rgb(255, 0, 0); background: rgb(255, 255, 255)">border-color + bg</p>',
  '<p id="cb-tdc" style="text-decoration-color: rgb(255, 0, 0); background: rgb(255, 255, 255)">decoration-color + bg</p>',
  '<p id="cb-tr" style="color: rgb(0, 0, 0); background: transparent">transparent</p>',
  '<p id="cb-none" style="color: rgb(0, 0, 0); background: none">none</p>',
  // Google Docs·Word 붙여넣기 HTML의 실제 형태 — 글자색 + 투명 배경
  '<p id="cb-gdocs" style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400">gdocs</p>',
  // 반투명·투명 알파 배경은 바탕이 아니다(#63 리뷰) — 다크 페이지 위 거의 투명한 칸에 작성자 어두운 글자가 남으면 대비 1.35~1.66.
  // IDE는 알파 색을 rgba()로 직렬화한다. #RRGGBBAA·#RGBA는 직렬화 전엔 부분 문자열로 못 가려 cssom 단계에서만 본다
  '<p id="cb-rgba" style="color: rgb(51, 51, 51); background: rgba(0, 0, 0, 0.05)">rgba</p>',
  '<p id="cb-rgba0" style="color: rgb(51, 51, 51); background-color: rgba(255, 255, 255, 0)">rgba 0</p>',
  '<p id="cb-slash" style="color: rgb(51, 51, 51); background: rgb(0 0 0 / 4%)">slash</p>',
  '<p id="cb-hsl" style="color: rgb(51, 51, 51); background: hsl(0 0% 100% / 0)">hsl</p>',
  '<p id="cb-hsla" style="color: rgb(51, 51, 51); background: hsla(0, 0%, 100%, 0.1)">hsla</p>',
  '<p id="cb-hex8" data-ap-cssom style="color: #333; background: #0000000d">hex8</p>',
  '<p id="cb-hex4" data-ap-cssom style="color: #333; background: #0001">hex4</p>',
  '<table><tbody><tr><td id="cb-tdrgba" style="color: rgb(51, 51, 51); background: rgba(0, 0, 0, 0.05)">td rgba</td></tr></tbody></table>',
  // 판정 부분 문자열의 오탐 — 글꼴 이름의 transparent, 색 이름의 url(burlywood)은 배경 판정을 막지 않는다. 탭 + 콜론 앞 공백
  '<p id="cb-tsans" style="font-family: \'Transparent Sans\', sans-serif; color: rgb(0, 0, 0); background: rgb(255, 243, 176)">tsans</p>',
  '<p id="cb-burly" style="color: rgb(0, 0, 0); background: burlywood">burly</p>',
  '<p id="cb-tabsp" style="background: rgb(255, 243, 176);\tcolor : rgb(0, 0, 0)">tab</p>',
  '<h3 id="cb-h3" style="background-color: rgb(224, 240, 255)">h3 bg only</h3>',
  '<h3 id="cb-h3b" style="color: rgb(0, 0, 0); background-color: rgb(224, 240, 255)">h3 both</h3>',
  '<p><a id="cb-a" href="#" style="color: rgb(200, 0, 0)">a color</a> ',
  '<a id="cb-ab" href="#" style="color: rgb(0, 0, 255); background: rgb(255, 255, 255)">a both</a> ',
  '<span id="cb-del" class="user-del" style="color: rgb(200, 0, 0)">d</span> ',
  '<span id="cb-delbg" class="user-del" style="background: rgb(255, 243, 176)">d</span> ',
  '<span id="cb-delb" class="user-del" style="color: rgb(0, 0, 0); background: rgb(255, 243, 176)">d</span> ',
  '<mark id="cb-markbg" style="background: rgb(150, 220, 255)">m</mark> ',
  '<mark id="cb-markb" style="color: rgb(0, 0, 0); background: rgb(150, 220, 255)">m</mark> ',
  '<code id="cb-codec" style="color: rgb(200, 0, 0)">c</code> ',
  '<code id="cb-codeb" style="color: rgb(0, 0, 0); background: rgb(230, 230, 230)">c</code></p>',
  '<pre id="cb-pre" style="background: rgb(39, 40, 34); color: rgb(248, 248, 242)">pre</pre>',
  '<blockquote id="cb-bq" style="color: rgb(0, 0, 0); background: rgb(255, 255, 255)">bq</blockquote>',
  '<table><thead id="cb-thead" style="color: rgb(200, 0, 0)"><tr><th id="cb-th" style="background: rgb(255, 243, 176)">h</th>',
  '<th id="cb-thb" style="color: rgb(0, 0, 0); background: rgb(255, 243, 176)">h</th></tr></thead>',
  '<tbody id="cb-tbody" style="color: rgb(0, 128, 0)"><tr><td id="cb-td" style="background: rgb(255, 204, 204)">c</td>',
  '<td id="cb-tdb" style="color: rgb(0, 0, 0); background: rgb(255, 204, 204)">c</td></tr></tbody></table>',
  // ── 작성자 색 영역 — 둘 다 정한 요소 안의 테마 글자색·칩 ──
  '<p id="ad-p" style="color: rgb(0, 0, 0); background: rgb(255, 243, 176)">영역 <a id="ad-a" href="#">링크</a> ',
  '<code id="ad-code">코드</code> <kbd id="ad-kbd">키</kbd> <mark id="ad-mark">마크</mark> <strong id="ad-strong">굵게</strong> ',
  '<a id="ad-anone" href="#" style="text-decoration: none">밑줄 없음</a> <a id="ad-ac" href="#" style="color: rgb(200, 0, 0)">색만</a> ',
  '<a id="ad-ab" href="#" style="color: rgb(0, 0, 255); background: rgb(255, 255, 255)">자체 쌍</a></p>',
  '<table id="ad-t" style="color: rgb(0, 0, 0); background: rgb(255, 255, 255)"><thead><tr><th id="ad-th">머리글</th></tr></thead>',
  '<tbody><tr><td>첫 행</td></tr><tr id="ad-tr2"><td id="ad-td2">둘째 행 <code>칩</code> <a href="#">링크</a></td></tr></tbody></table>',
  '<table><tbody><tr id="ad-trow" style="color: rgb(0, 0, 0); background: rgb(255, 255, 204)"><td id="ad-trtd">행 영역</td></tr>',
  '<tr><td>둘째</td></tr></tbody></table>',
  '<div id="ad-div" style="color: rgb(0, 0, 0); background: rgb(255, 255, 255)"><h3 id="ad-h3">영역 제목</h3><h6>작은 제목</h6>',
  '<blockquote id="ad-bq"><p>영역 인용</p></blockquote><ul><li><a href="#">목록 링크</a></li></ul>',
  '<pre id="ad-pre"><code>pre 쌍은 테마 그대로</code></pre></div>',
  // 작성자 색 영역 안의 GitHub Alert — 닫지 않은 <blockquote style> 뒤 > [!NOTE]가 그 안에 렌더된다(알림 규칙은 특이도가 높다)
  '<blockquote id="ad-alq" style="color: rgb(0, 0, 0); background: rgb(255, 255, 255)"><blockquote class="markdown-alert markdown-alert-note">',
  '<p class="markdown-alert-title" id="ad-alt">Note</p><p id="ad-alb">영역 안 알림 본문</p></blockquote></blockquote>',
  '<div style="color: rgb(240, 240, 240); background: rgb(34, 34, 34)"><h3>어두운 영역</h3><p><a href="#">링크</a> <code>칩</code></p>',
  '<table><thead><tr><th>머리글</th></tr></thead><tbody><tr><td>1</td></tr><tr><td>2</td></tr></tbody></table></div>',
].join("");
const AUTHOR_BLACK = "rgb(0, 0, 0)";
const PROBE_EXPECT = [
  ["ap-p", "line-height", "66px"], ["ap-p", "font-size", "22px"], ["ap-p", "font-family", "monospace"],
  ["ap-pfont", "line-height", "40px"], ["ap-pfont", "font-family", "serif"], ["ap-pfont", "font-style", "italic"],
  ["ap-pm", "margin-top", "0px"], ["ap-pal", "text-align", null], ["ap-pta", "text-align", "right"],
  ["ap-h1", "font-size", "20px"], ["ap-h1", "margin-top", "0px"], ["ap-h1", "margin-bottom", "0px"],
  ["ap-h1", "letter-spacing", "2px"], ["ap-h1al", "text-align", null],
  ["ap-h2", "border-bottom-style", "none"], ["ap-h2", "font-family", "monospace"], ["ap-h2", "padding-top", "2px"],
  ["ap-h3l", "line-height", "50px"], ["ap-h3l", "font-weight", "300"], ["ap-h3l", "padding-bottom", "5px"],
  ["ap-h5", "font-family", "monospace"],
  ["ap-img", "border-top-left-radius", "50%"], ["ap-img", "box-sizing", "content-box"], ["ap-img", "max-width", "10px"],
  ["ap-t", "border-top-style", "solid"], ["ap-t", "border-top-width", "2px"], ["ap-t", "border-top-left-radius", "6px"],
  ["ap-t", "font-size", "19px"], ["ap-t", "line-height", "30px"], ["ap-t", "display", "table"], ["ap-t", "width", "300px"],
  ["ap-t", "max-width", "none"], ["ap-t", "border-collapse", "separate"], ["ap-t", "border-spacing", "4px 6px"],
  ["ap-t", "margin-left", "7px"], ["ap-t", "margin-top", "7px"], ["ap-t", "overflow-x", "visible"],
  ["ap-thead", "border-top-style", "solid"], ["ap-tr", "border-top-style", "solid"],
  ["ap-th", "font-size", "20px"], ["ap-th", "border-top-left-radius", "4px"], ["ap-th", "border-left-style", "dotted"],
  ["ap-th", "padding-left", "1px"], ["ap-th", "font-weight", "400"], ["ap-th", "white-space", "normal"],
  ["ap-td", "font-size", "20px"], ["ap-td", "line-height", "40px"], ["ap-td", "font-family", "monospace"],
  ["ap-td", "border-top-left-radius", "4px"], ["ap-td", "border-bottom-style", "dotted"], ["ap-td", "padding-left", "1px"],
  ["ap-tb", "border-top-style", "outset"], ["ap-tf", "border-top-style", "solid"],
  ["ap-trh", "border-bottom-style", "solid"], ["ap-trb", "border-top-style", "solid"],
  ["ap-talign", "centered"],
  ["ap-thta", "text-align", "right"], ["ap-trath", "text-align", null], ["ap-tdta", "text-align", "right"],
  ["ap-tsth", "text-align", null], ["ap-tstd", "text-align", null],
  ["ap-tdw", "min-width", null], ["ap-tdmw", "min-width", "0px"], ["ap-tdcode", "overflow-wrap", "normal"], ["ap-tdwb", "word-break", "break-all"],
  ["ap-ul", "padding-top", "10px"], ["ap-ul", "padding-left", "20px"], ["ap-ul", "margin-top", "3px"],
  ["ap-li", "line-height", "60px"], ["ap-li", "font-size", "20px"], ["ap-li", "margin-top", "9px"],
  ["ap-bq", "border-top-style", "solid"], ["ap-bq", "border-left-style", "double"], ["ap-bq", "border-left-width", "6px"],
  ["ap-bq", "border-top-right-radius", "10px"], ["ap-bq", "padding-left", "0px"], ["ap-bq", "margin-top", "4px"],
  ["ap-bq", "font-size", "20px"],
  ["ap-a", "font-weight", "900"], ["ap-a", "text-decoration-line", "underline"], ["ap-a", "text-decoration-style", "wavy"],
  ["ap-strong", "font-weight", "400"],
  ["ap-del", "opacity", "0.3"], ["ap-rdel", "opacity", "0.4"],
  ["ap-dt", "margin-top", "0px"], ["ap-dt", "padding-left", "5px"], ["ap-dd", "margin-bottom", "0px"], ["ap-dd", "padding-left", "0px"],
  ["ap-icode", "font-size", "20px"], ["ap-icode", "padding-left", "0px"], ["ap-icode", "border-top-style", "solid"],
  ["ap-icode", "border-top-left-radius", "0px"], ["ap-icode", "font-family", "serif"],
  ["ap-kbd", "border-bottom-style", "none"], ["ap-kbd", "padding-left", "0px"], ["ap-kbd", "font-size", "20px"],
  ["ap-mark", "padding-left", "0px"], ["ap-mark", "border-top-left-radius", "0px"],
  ["ap-pre", "border-left-style", "dashed"], ["ap-pre", "border-top-style", "dashed"], ["ap-pre", "border-top-left-radius", "0px"],
  ["ap-pre", "padding-left", "0px"], ["ap-pre", "margin-bottom", "0px"], ["ap-pre", "line-height", "30px"],
  ["ap-pre", "font-size", "20px"], ["ap-pre", "overflow-x", "hidden"],
  ["ap-code", "line-height", "30px"], ["ap-code", "font-size", "20px"],
  ["ap-cb", "color", "rgb(200, 0, 0)"],
  ["ap-hr", "border-top-left-radius", "3px"], ["ap-hr", "height", "3px"], ["ap-hr", "border-top-style", "dashed"],
  ["ap-hr", "margin-top", "5px"], ["ap-hr", "background-image", "none"], ["ap-hr", "background-color", "rgba(0, 0, 0, 0)"],
  ["ap-hrw", "width", "120px"], ["ap-hrws", "width", "200px"],
  // 글자색·배경
  ...["cb-both", "cb-rev", "cb-case", "cb-nl"].flatMap((id) => [
    [id, "color", AUTHOR_BLACK], [id, "background-color", "rgb(255, 243, 176)"]]),
  ["cb-img", "color", "=rf-p"], ["cb-url", "color", "=rf-p"], ["cb-inherit", "color", "=rf-p"],
  ["cb-color", "color", "=rf-p"], ["cb-bg", "background-color", "=rf-p"], ["cb-bgc", "background-color", "=rf-p"],
  ["cb-border", "background-color", "=rf-p"], ["cb-tdc", "background-color", "=rf-p"],
  ["cb-tr", "color", "=rf-p"], ["cb-none", "color", "=rf-p"], ["cb-gdocs", "color", "=rf-p"],
  ...["cb-rgba", "cb-rgba0", "cb-slash", "cb-hsl", "cb-hsla", "cb-tdrgba"].map((id) => [id, "color", id === "cb-tdrgba" ? "=rf-td" : "=rf-p"]),
  ["cb-hex8", "color", "=rf-p", "cssom"], ["cb-hex4", "color", "=rf-p", "cssom"],
  ...["cb-tsans", "cb-burly", "cb-tabsp"].map((id) => [id, "color", AUTHOR_BLACK]),
  ["cb-h3", "background-color", "=rf-h3"], ["cb-h3b", "color", AUTHOR_BLACK], ["cb-h3b", "background-color", "rgb(224, 240, 255)"],
  ["cb-a", "color", "=rf-a"], ["cb-ab", "color", "rgb(0, 0, 255)"], ["cb-ab", "background-color", "rgb(255, 255, 255)"],
  ["cb-del", "color", "=rf-del"], ["cb-delbg", "background-color", "=rf-del"],
  ["cb-delb", "color", AUTHOR_BLACK], ["cb-delb", "background-color", "rgb(255, 243, 176)"],
  ["cb-markbg", "background-color", "=rf-mark"], ["cb-markbg", "color", "=rf-mark"],
  ["cb-markb", "color", AUTHOR_BLACK], ["cb-markb", "background-color", "rgb(150, 220, 255)"],
  ["cb-codec", "color", "=rf-code"], ["cb-codeb", "color", AUTHOR_BLACK], ["cb-codeb", "background-color", "rgb(230, 230, 230)"],
  ["cb-pre", "color", "rgb(248, 248, 242)"], ["cb-pre", "background-color", "rgb(39, 40, 34)"],
  ["cb-bq", "color", AUTHOR_BLACK], ["cb-bq", "background-color", "rgb(255, 255, 255)"],
  ["cb-thead", "color", "=rf-thead"], ["cb-th", "background-color", "=rf-th"],
  ["cb-thb", "color", AUTHOR_BLACK], ["cb-thb", "background-color", "rgb(255, 243, 176)"],
  ["cb-tbody", "color", "=rf-thead"], ["cb-td", "background-color", "=rf-td"],
  ["cb-tdb", "color", AUTHOR_BLACK], ["cb-tdb", "background-color", "rgb(255, 204, 204)"],
  // 작성자 색 영역
  ["ad-a", "color", AUTHOR_BLACK], ["ad-a", "text-decoration-line", "underline"],
  ["ad-code", "color", AUTHOR_BLACK], ["ad-code", "background-color", "color(srgb 0 0 0 / 0.12)"],
  ["ad-kbd", "color", AUTHOR_BLACK], ["ad-kbd", "background-color", "color(srgb 0 0 0 / 0.12)"],
  ["ad-mark", "color", "=rf-mark"], ["ad-mark", "background-color", "=rf-mark"], ["ad-strong", "color", AUTHOR_BLACK],
  ["ad-anone", "text-decoration-line", "none"], ["ad-ac", "color", AUTHOR_BLACK],
  ["ad-ab", "color", "rgb(0, 0, 255)"], ["ad-ab", "background-color", "rgb(255, 255, 255)"],
  ["ad-th", "color", AUTHOR_BLACK], ["ad-th", "background-color", "rgba(0, 0, 0, 0)"],
  ["ad-tr2", "background-color", "rgba(0, 0, 0, 0)"], ["ad-td2", "color", AUTHOR_BLACK],
  ["ad-trow", "background-color", "rgb(255, 255, 204)"], ["ad-trtd", "color", AUTHOR_BLACK],
  ["ad-h3", "color", AUTHOR_BLACK], ["ad-bq", "color", AUTHOR_BLACK],
  ["ad-pre", "background-color", "=rf-pre-bg"],
  ["ad-alt", "color", AUTHOR_BLACK], ["ad-alb", "color", AUTHOR_BLACK],
];

/** checkAuthorStyles — 값 판정(values=true, clean 조합)과 프로브 글자 대비. 주입·측정·제거를 한 evaluate에서 끝낸다(mts.js
 *  언어 재판정(400ms 디바운스)은 걷어낸 뒤의 본문을 본다) */
async function checkAuthorStyles(page, combo, values) {
  const res = await page.evaluate(([h, ex, scanSrc, wantValues]) => {
    const host = document.createElement("div");
    host.id = "mts-author-probe";
    host.innerHTML = h + '<pre id="rf-pre"><code>x</code></pre>';
    document.body.appendChild(host);
    const read = (id, prop) => {
      const el = document.getElementById(id);
      if (!el) return "(요소 없음)";
      if (prop === "centered") {
        const r = el.getBoundingClientRect();
        const p = el.parentElement.getBoundingClientRect();
        const l = r.left - p.left, rt = p.right - r.right;
        return l > 4 && Math.abs(l - rt) < 2 ? "centered" : `좌 ${l.toFixed(1)} / 우 ${rt.toFixed(1)}`;
      }
      return getComputedStyle(el).getPropertyValue(prop);
    };
    const ref = (want, prop) => (want === "=rf-pre-bg" ? read("rf-pre", "background-color") : read(want.slice(1), prop));
    // 기본 preview 값(표현 속성)은 같은 동기 구간에서 테마를 잠깐 떼고 한 번 잰다(clean 조합이라 사용자 CSS 없음). 측정이 헛돌면
    // 기대값이 곧 테마 값이라 조용히 통과한다 — 정렬 없는 머리글(rf-th)이 테마 left ↔ UA 가운데로 갈리는지로 확인한다
    const root = document.documentElement;
    const theme = root.getAttribute("data-mts-theme");
    const themedRef = read("rf-th", "text-align");
    root.removeAttribute("data-mts-theme");
    const offRef = read("rf-th", "text-align");
    const offVals = ex.map(([id, prop, want]) => (want === null ? read(id, prop) : null));
    root.setAttribute("data-mts-theme", theme);
    const scan = (0, eval)(scanSrc);
    // 두 번 잰다 — raw: innerHTML 그대로(작성자가 쓴 형태), cssom: IDE preview가 갖는 형태. IDE는 raw HTML의 style을 CSSOM으로
    // 직렬화해 단다(#333 → color: rgb(51, 51, 51);, 알파 색 → rgba(), 소문자·"; " 구분 — 2025.1·2026.2 실측) — 판정 셀렉터가
    // 두 형태 모두에서 같아야 한다. 직렬화 전에는 부분 문자열로 가릴 수 없는 형태(#RRGGBBAA·#RGBA 알파)의 프로브(data-ap-cssom)는
    // cssom 단계에서만 본다
    const passes = {};
    for (const pass of ["raw", "cssom"]) {
      const cssomOnly = [...host.querySelectorAll("[data-ap-cssom]")];
      if (pass === "raw") cssomOnly.forEach((e) => e.setAttribute("data-ap-faint", ""));
      else {
        cssomOnly.forEach((e) => e.removeAttribute("data-ap-faint"));
        host.querySelectorAll("[style]").forEach((e) => { e.style.cssText = e.getAttribute("style"); });
      }
      const out = [];
      if (wantValues) {
        ex.forEach(([id, prop, want, only], i) => {
          if (only === "cssom" && pass === "raw") return;
          const got = read(id, prop);
          if (prop === "centered") {
            if (got !== "centered") out.push(`${id} 가운데 정렬 아님(${got}) — 표 align 표현 속성`);
            return;
          }
          const w = want === null ? offVals[i] : typeof want === "string" && want.startsWith("=") ? ref(want, prop) : want;
          const kind = want === null ? "기본 preview" : typeof want === "string" && want.startsWith("=") ? `테마(${want.slice(1)})` : "작성자";
          if (got !== w) {
            const st = document.getElementById(id)?.getAttribute("style");
            out.push(`${id} ${prop}=${got} (${kind} 값 ${w})${pass === "cssom" ? ` [CSSOM style="${st}"]` : ""}`);
          }
        });
        if (offRef === themedRef) out.push(`기본 preview 측정 실패: rf-th text-align이 테마 off에서도 ${offRef}`);
      }
      passes[pass] = { bad: out, ...JSON.parse(scan("probe")) };
    }
    host.remove();
    return passes;
  }, [PROBE_HTML, PROBE_EXPECT, SCAN_JS, values]);
  for (const [pass, r] of Object.entries(res)) {
    const tag = `${combo}${pass === "cssom" ? " CSSOM" : ""}`;
    for (const b of r.bad) flag("작성자 스타일", `[${tag}] 작성자 style 판정 어긋남: ${b}`);
    // 프로브 글자가 다 잡혔는지(주입 실패·스캔 대상 오류로 대비 판정이 조용히 비지 않게) — 프로브 글자 노드 약 120개
    if (r.scanned < 100) flag("작성자 스타일", `[${tag}] 프로브 글자 노드 ${r.scanned}개 — 주입 실패?`);
    // custom 조합은 안 보이는 글자(FAIL)만 — 작성자 값을 따르는 자리는 사용자 CSS의 !important가 인라인 style을 이겨 그 CSS가 고른
    // 색 쌍(테마 off와 같다 — 적대적 CSS의 Typora 코드색 3.05·인용 4.29)이 나오는 게 정상이다
    judgeLow("작성자 스타일", tag, values ? r.low : r.low.filter((x) => x.level === "FAIL"));
    if (r.unparsed.length) flag("작성자 스타일", `[${tag}] 프로브 색 파싱 실패 ${r.unparsed.join(" | ")}`);
  }
  return { low: [...res.raw.low, ...res.cssom.low], scanned: res.raw.scanned };
}

/** 작업 목록 빈 체크박스 테두리의 실제 그림 = 계산값인지. main의 [style*="color" i] 제외 규칙은 Chromium에서 계산값(테마
 *  글자색)과 달리 사용자 CSS의 input 색(#333)으로 그리게 했다 — 다크에서 빈 칸이 사라진다(#63 리뷰, 계산 스타일 비교로는
 *  안 잡힌다). 같은 체크박스를 인라인 style로 계산값 그대로 칠한 그림과 픽셀 단위로 견준다(인라인은 그 판정을 거치지 않는다).
 *  색만 바꾸므로 배치가 같아 결정적이다 */
async function checkCheckboxPaint(page, combo) {
  // 요소 스크린샷(locator)은 안정화 대기로 조합마다 수 초가 걸려 뷰포트 clip으로 찍는다
  const rects = await page.evaluate(() => [...document.querySelectorAll("body input[type=checkbox]:not(:checked)")]
    .map((e, i) => { e.dataset.mtsCb = i; return e; })
    .filter((e) => !e.closest("#mts-audit") && e.checkVisibility()).map((e) => e.dataset.mtsCb));
  for (const i of rects) {
    const clip = await page.evaluate((i) => {
      const e = document.querySelector(`[data-mts-cb="${i}"]`);
      e.scrollIntoView({ block: "center" });
      const r = e.getBoundingClientRect();
      return { x: Math.floor(r.left) - 1, y: Math.floor(r.top) - 1, width: Math.ceil(r.width) + 3, height: Math.ceil(r.height) + 3 };
    }, i);
    const painted = await page.screenshot({ clip });
    const color = await page.evaluate((i) => {
      const e = document.querySelector(`[data-mts-cb="${i}"]`);
      const c = getComputedStyle(e).color;
      e.setAttribute("style", `color: ${c} !important`);
      return c;
    }, i);
    const reference = await page.screenshot({ clip });
    await page.evaluate((i) => document.querySelector(`[data-mts-cb="${i}"]`).removeAttribute("style"), i);
    if (!painted.equals(reference)) flag("체크박스", `[${combo}] 빈 체크박스 테두리가 계산값(${color})과 다르게 그려짐`);
  }
  await page.evaluate(() => {
    document.querySelectorAll("[data-mts-cb]").forEach((e) => e.removeAttribute("data-mts-cb"));
    window.scrollTo(0, 0);
  });
  if (!rects.length) flag("체크박스", `[${combo}] 스냅샷에 빈 체크박스 없음 — 그림 검사 불가`);
}

function reportInvariant() {
  for (const [key, v] of invariantLeaks) {
    flag("불변식", `[${v.at} 외 ${v.combos.size - 1}조합] 커스텀 CSS 누수 ${key}: ${v.ex} (${v.n}곳)`);
  }
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
    const r = document.documentElement;
    return [r.getAttribute("data-mts-lang"), r.getAttribute("lang"), r.hasAttribute("data-mts-hangul")];
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
      const r = document.documentElement;
      return [r.getAttribute("data-mts-lang"), r.getAttribute("lang"), r.hasAttribute("data-mts-hangul")];
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
        lang: [r.getAttribute("data-mts-lang"), r.getAttribute("lang"), r.hasAttribute("data-mts-hangul")],
        store: Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])),
      };
    });
    const got = await read();
    const want = {
      ...v.want, store: sorted(v.want.store), widgetTheme: v.want.theme, lang: [wantLang, wantLang, EXPECTED_HANGUL[fixture]],
    };
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

/** 언어 판정 합성 문서(lang-probes.mjs) — IDE 로드 순서(빈 body → mts.js → 본문 패치)로 싣고 첫 패치 직후·정착 뒤
 *  <html> 표식, 테마 4종의 표 셀(th·td 전부)·본문(body·p) word-break 계산값을 본다. lifecycle 문서는 수명도 본다: 테마
 *  off에서 표식이 모두 빠지고 테마를 다시 켜면 돌아오는지(위젯 UI — applyTheme 경로), 본문 패치로 표를 걷어내면 한글
 *  표식이 빠지고 되돌리면 다시 달리는지(디바운스 재판정). 셸은 라이트 LaF·클린 english 스냅샷(본문만 갈아 끼운다),
 *  폭은 표가 폭을 다투는 기본 패널 427px — 첫 표의 열 폭·한국어(마지막) 열 줄 수를 report에 남긴다(판정 아님, 폰트 의존) */
async function auditLangProbes(browser) {
  const dir = stage("light", "clean");
  const servedJs = fs.readFileSync(path.join(SERVED, "mts.light.js"), "utf8");
  const vp = VIEWPORTS[1];
  const show = (v) => JSON.stringify(v);
  for (const pr of LANG_PROBES) {
    const label = `light-laf/clean/합성 ${pr.name}@${vp.width}`;
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("file://" + path.join(dir, "english.html"));
    await page.evaluate(() => document.body.replaceChildren());
    await page.addScriptTag({ content: servedJs });
    // 첫 패치 즉시 판정 — openPage와 같이 macrotask 경계 하나만 넘기고 읽는다
    const first = await page.evaluate(async (h) => {
      const d = document.createElement("div");
      d.innerHTML = h;
      document.body.append(d);
      await new Promise((r) => setTimeout(r, 0));
      const r = document.documentElement;
      return [r.getAttribute("data-mts-lang"), r.getAttribute("lang"), r.hasAttribute("data-mts-hangul")];
    }, pr.html);
    await page.waitForTimeout(LANG_SETTLE_MS);
    const settled = await page.evaluate(LANG_ATTRS);
    const want = [pr.lang, pr.lang, pr.hangul];
    for (const [when, got] of [["첫 패치 직후", first], ["정착 뒤", settled]]) {
      if (show(got) !== show(want)) flag("언어", `[${label}] 표식(${when}) ${show(got)} (기대 ${show(want)} — data-mts-lang, lang, data-mts-hangul)`);
    }
    const styles = await page.evaluate((themes) => {
      const root = document.documentElement;
      const before = root.getAttribute("data-mts-theme");
      const out = themes.map((t) => {
        root.setAttribute("data-mts-theme", t);
        const cells = [...document.querySelectorAll("body th, body td")];
        return {
          theme: t, cells: cells.length,
          cell: [...new Set(cells.map((c) => getComputedStyle(c).wordBreak))],
          body: [...new Set([document.body, ...document.querySelectorAll("body p")].map((e) => getComputedStyle(e).wordBreak))],
        };
      });
      root.setAttribute("data-mts-theme", before);
      return out;
    }, THEMES);
    for (const s of styles) {
      if (!s.cells) flag("언어", `[${label}/${s.theme}] 표 셀 없음 — 합성 문서 확인`);
      if (show(s.cell) !== show([pr.cell])) flag("언어", `[${label}/${s.theme}] 표 셀 word-break ${show(s.cell)} (기대 ${pr.cell})`);
      if (show(s.body) !== show([pr.body])) flag("언어", `[${label}/${s.theme}] 본문 word-break ${show(s.body)} (기대 ${pr.body})`);
    }
    // 첫 표의 열 폭(머리글 셀 폭)·표 넘침·마지막 열 셀 줄 수 — 세로 띠 압착 회귀(#68)의 근거 수치
    const layout = await page.evaluate(() => {
      const t = document.querySelector("body table");
      const lines = (c) => {
        const cs = getComputedStyle(c);
        return Math.round((c.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) /
          parseFloat(cs.lineHeight));
      };
      return {
        cols: [...t.querySelectorAll("thead th")].map((th) => Math.round(th.getBoundingClientRect().width)),
        scrollWidth: t.scrollWidth, clientWidth: t.clientWidth,
        lastColLines: [...t.querySelectorAll("tbody td:last-child")].map(lines),
      };
    });
    const life = {};
    if (pr.lifecycle) {
      const pick = (id) => page.evaluate((t) => {
        const q = (s) => document.querySelector(s);
        if (q("#mts-panel").hidden) q("#mts-aa").click();
        q(`#mts-root .mts-themes [data-mts-id="${t}"]`).click();
      }, id);
      const steps = [
        ["테마 off", () => pick("off"), [null, null, false], 0],
        ["테마 다시 켬", () => pick("gh"), want, 0],
        // 본문 패치(편집)로 표를 걷어낸다 — 디바운스(400ms) 재판정을 기다린다
        ["표 제거 패치", () => page.evaluate(() => {
          const t = document.querySelector("body table");
          const stub = Object.assign(document.createElement("p"), { textContent: "Configuration moved to the wiki." });
          window.__mtsProbeSwap = [t, stub];
          t.replaceWith(stub);
        }), [null, null, false], LANG_SETTLE_MS],
        ["표 복원 패치", () => page.evaluate(() => {
          const [t, stub] = window.__mtsProbeSwap;
          stub.replaceWith(t);
          delete window.__mtsProbeSwap;
        }), want, LANG_SETTLE_MS],
      ];
      for (const [name, act, w, wait] of steps) {
        await act();
        if (wait) await page.waitForTimeout(wait);
        const got = await page.evaluate(LANG_ATTRS);
        life[name] = got;
        if (show(got) !== show(w)) flag("언어", `[${label}] 수명 — ${name}: 표식 ${show(got)} (기대 ${show(w)})`);
      }
    }
    for (const e of errors) flag("언어", `[${label}] pageerror: ${e}`);
    report[label] = { first, settled, styles, layout, life };
    await page.close();
  }
}

const browser = await chromium.launch();
const report = {};
let combos = 0;

for (const laf of APPEARANCES) {
  const servedJs = fs.readFileSync(path.join(SERVED, `mts.${laf}.js`), "utf8");
  const cleanStyles = new Map(); // 불변식 기준 — clean 모드가 먼저 돈다
  for (const mode of ["clean", "custom"]) {
    const dir = stage(laf, mode);
    for (const fixture of FIXTURES) {
      for (const vp of VIEWPORTS) {
        const { page, firstLang } = await openPage(browser, path.join(dir, fixture + ".html"), vp, servedJs);
        if (mode === "clean" && vp.width === WIDE) {
          const want = EXPECTED_LANG[fixture];
          const wantHangul = EXPECTED_HANGUL[fixture];
          // 첫 판정(재부착 직후)과 정착 뒤(디바운스 재판정 포함)가 모두 기대값이어야 한다 — 흔들림을 대기로 덮지 않고
          // 실제 값을 남긴 채 실패시킨다
          const settled = await page.evaluate(LANG_ATTRS);
          for (const [when, [mark, lang, hangul]] of [["첫 패치 직후", firstLang], ["정착 뒤", settled]]) {
            if (mark !== want || lang !== want || hangul !== wantHangul) {
              flag("언어", `[${laf}-laf/${fixture}] 언어 판정(${when}) data-mts-lang=${mark} lang=${lang} ` +
                `data-mts-hangul=${hangul} (기대 ${want}/${want}/${wantHangul})`);
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
            const styles = await themeStyles(page);
            const styleKey = `${fixture}@${vp.width}/${theme}/${ap}`;
            if (mode === "clean") cleanStyles.set(styleKey, styles);
            else judgeInvariant(combo, cleanStyles.get(styleKey), styles);
            // 작성자 style 프로브 — 테마 4 × 외관 2 × LaF 2, 값 판정은 clean만(custom은 대비만)
            const author = fixture === "elements" && vp.width === WIDE ? await checkAuthorStyles(page, combo, mode === "clean") : undefined;
            report[combo] = { ...data, _body: body, ...(author && { _author: { low: author.low, scanned: author.scanned } }) };
            await checkCheckboxPaint(page, combo);
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
await auditLangProbes(browser);
await browser.close();
reportInvariant();

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
