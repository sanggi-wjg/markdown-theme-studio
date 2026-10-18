// 언어 판정 합성 문서(run.mjs auditLangProbes) — 스냅샷 픽스처가 다루지 않는 언어 조합을 IDE 로드 순서(빈 body →
// mts.js → 본문 패치)로 싣고 <html> 표식과 표 셀·본문 word-break 계산값을 본다. 마크업은 번들 렌더와 같은 꼴이다
// (본문은 body 직속이 아니라 <div> 래퍼 안, 인라인 코드는 <code>).
// 표식: lang = data-mts-lang(한국어가 주된 문서 — 본문 keep-all·lang), hangul = data-mts-hangul(한국어가 의미 있게
// 든 문서 — 표 셀 keep-all, #68). 한자·가나 위주(띄어쓰기 없는 문자 체계) 문서는 회귀 방지용 대조군 하나다(언어별
// 특화는 한국어까지만)

const EN_PROSE =
  "Nebula Cache is a two-tier cache built for read-heavy workloads. Hot keys live in the heap tier, warm keys in the " +
  "off-heap tier, and promotion between tiers follows an LFU policy. A well-tuned deployment typically serves more " +
  "than ninety-five percent of reads from memory, which keeps p99 latency well under a millisecond even during " +
  "traffic spikes. Namespaces isolate configuration, so a catalog namespace can keep long TTLs while a session " +
  "namespace expires entries within minutes. Every namespace exports hit ratio, eviction count and load latency " +
  "through Micrometer, and the bundled dashboard aggregates them per node. When a node restarts, the warm-up job " +
  "replays the access log so that the hit ratio recovers before traffic is routed back. The loader contract is " +
  "simple: a miss calls the loader once, concurrent misses for the same key are merged into a single call, and the " +
  "result is written to the heap tier together with its TTL. Eviction never blocks readers; it runs on a background " +
  "thread that samples candidates and removes the least frequently used ones until the tier is back under its limit.";

const p = (t) => `<p>${t}</p>`;
const table = (head, rows) =>
  `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>` +
  rows.map((r, i) => `<tr${i % 2 ? ' class="intellij-row-even"' : ""}>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") +
  "</tbody></table>";
const code = (t) => `<code>${t}</code>`;

// tables.md의 세로 띠 사례(1.1.0)와 같은 꼴 — 영문 머리글·코드 열이 폭을 먹고 한국어 설명 열이 남는 폭을 받는다
const KO_ROWS = [
  [code("nebula.offheap.evictionPolicyClassName"), code("String"), code("LfuEvictionPolicy"), "restart",
    "오프힙 계층의 축출 정책 구현 클래스. 사용자 정의 구현은 SPI로 등록한다"],
  [code("nebula.heap.promotionThresholdAccessCount"), code("Int"), code("3"), "immediate",
    "웜 키가 핫 계층으로 승격되기 위한 최소 접근 횟수. 낮출수록 승격이 공격적이다"],
  [code("nebula.namespace.defaultTtlInheritanceMode"), code("Enum"), code("CASCADE"), "immediate",
    "부모 네임스페이스 TTL 상속 방식. 하위 키는 부모 값을 그대로 물려받는다"],
];
const EN_KO_TABLE = table(["Option", "Type", "Default", "Applies", "설명"], KO_ROWS);

const KO_PROSE =
  "Nebula Cache는 읽기 위주 워크로드를 위한 2계층 캐시다. 핫 키는 힙 계층에, 웜 키는 오프힙 계층에 두고 계층 간 승격은 " +
  "LFU 정책을 따른다. 잘 조정한 배포는 읽기의 95% 이상을 메모리에서 처리해 트래픽이 몰릴 때도 p99 지연을 1밀리초 아래로 " +
  "유지한다. 네임스페이스마다 설정이 분리돼 카탈로그는 TTL을 길게, 세션은 몇 분 안에 만료되게 둘 수 있다.";

// 띄어쓰기 없는 문자(한자·가나) 대조군 본문 — mts.js는 한자·가나를 한 묶음(han)으로 세므로 대조군 하나로 그 경로를 본다
const HANKANA_PROSE =
  "Nebula Cacheは読み取り中心のワークロード向けに設計された二層キャッシュです。ホットキーはヒープ層に、ウォームキーは" +
  "オフヒープ層に置かれ、層の間の昇格はLFUポリシーに従います。適切に調整された構成では読み取りの九割五分以上を" +
  "メモリから返すため、トラフィックが急増してもp99レイテンシは一ミリ秒を大きく下回ります。";

// 한국어 어절이 1/5을 넘지만 알파벳 단어가 많아 단어 문턱(1000)이 글자 문턱(1500)보다 먼저 차는 문서 — 판정이 단어
// 문턱에서 굳은 뒤에 오는 한자·가나 단락(한 텍스트 노드)이 문서 전체로는 한자·가나를 한글보다 많게 만든다. 한국어 판정
// 문서는 셀 표식도 있어야 한다(data-mts-lang="ko" ⊂ data-mts-hangul — mts.js는 ko로 굳으면 순회를 멈추고, 표식에 ko도 넣는다)
const KO_LINE = "캐시 계층은 읽기 요청을 먼저 받아 처리하고 미스가 나면 로더를 한 번만 부른다 ";

export const LANG_PROBES = [
  {
    // #68: 영어 README 안의 한국어 설명 표 — 문서는 영어(lang 없음), 표 셀만 keep-all(1.1.2 동작)
    name: "en+ko표", lang: null, hangul: true, cell: "keep-all", body: "normal",
    html: `<h1>Nebula Cache</h1>${p(EN_PROSE)}<h2>Configuration</h2>${EN_KO_TABLE}${p("See the runbook for details.")}`,
    // 표 셀 판정 대상(한국어 설명 열)과 수명 검사(테마 off·본문 패치로 표 제거)
    lifecycle: true,
  },
  {
    // 단어 문턱(1000)을 넘긴 뒤에 나오는 한국어 표 — 한국어 판정은 문턱에서 굳어도 셀 표식은 끝까지 센다
    name: "긴 en+ko표", lang: null, hangul: true, cell: "keep-all", body: "normal",
    html: `<h1>Nebula Cache</h1>${[1, 2, 3, 4, 5, 6].map(() => p(EN_PROSE)).join("")}<h2>Configuration</h2>${EN_KO_TABLE}`,
  },
  {
    // 영어 문서에 섞인 한글 몇 글자(번역본 안내 한 줄, 언어 선택 표) — 20자 미만이라 아무 표식도 없다
    name: "en+한글 한 줄", lang: null, hangul: false, cell: "normal", body: "normal",
    html: `<h1>Nebula Cache</h1>${p(EN_PROSE)}${p("한국어 안내는 README.ko.md를 참고하세요.")}` +
      table(["Language", "Document"], [["English", code("README.md")], ["한국어", code("README.ko.md")]]),
  },
  {
    // 한국어 문서 — 본문·셀 keep-all, lang="ko"(변화 없음)
    name: "ko", lang: "ko", hangul: true, cell: "keep-all", body: "keep-all",
    html: `<h1>Nebula Cache — 아키텍처 개요</h1>${p(KO_PROSE)}<h2>설정</h2>` +
      table(["옵션 키", "타입", "기본값", "적용 시점", "설명"], KO_ROWS.map((r) => [...r.slice(0, 3), "재시작 필요", r[4]])),
  },
  {
    name: "ko 판정 후 한자·가나 단락", lang: "ko", hangul: true, cell: "keep-all", body: "keep-all",
    html: `<h1>Nebula Cache</h1>${[1, 2, 3, 4].map(() => p(EN_PROSE)).join("")}${p(KO_LINE.repeat(28))}` +
      `${p(HANKANA_PROSE.repeat(16))}` +
      table(["Option", "설명"], [[code("nebula.ttl.default"), "기본 유효 기간이다. 하위 키가 상속한다"]]),
  },
  {
    // 띄어쓰기 없는 문자(한자·가나) 대조군 — 한글이 한자·가나보다 적어 표식이 없다. 셀 keep-all이 걸리면 문장이 한
    // 덩어리가 돼 표가 넘친다(#48)
    name: "한자·가나 표", lang: null, hangul: false, cell: "normal", body: "normal",
    html: `<h1>Nebula Cache</h1>${p(HANKANA_PROSE)}` + table(["オプション", "型", "既定値", "説明"], [
      [code("nebula.offheap.evictionPolicyClassName"), code("String"), code("LfuEvictionPolicy"),
        "オフヒープ層の追い出しポリシーを実装するクラス。独自実装はSPIで登録する"],
      [code("nebula.heap.promotionThresholdAccessCount"), code("Int"), code("3"),
        "ウォームキーがホット層に昇格するための最小アクセス回数。下げるほど昇格が積極的になる"],
    ]),
  },
];
