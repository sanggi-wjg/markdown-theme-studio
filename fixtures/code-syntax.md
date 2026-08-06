# Code Syntax Zoo

> 코드 신택스 하이라이트 대비 검증용 픽스처입니다. 마커: `mts-code-syntax-fixture`
>
> - **1부**는 IC(Community) 샌드박스의 번들 렉서가 색을 입히는 언어 — `tools/mts_tokens.py` 자동 감사 대상.
> - **2부**는 Ultimate/플러그인 전용 언어 — 샌드박스에선 민무늬로 나오며, 실사용 IDE에서 이 파일을 열어 수동 확인한다.
>
> 모든 코드는 [sample.md](sample.md)와 같은 가상의 Nebula Cache 프로젝트 설정이다.

## 1부 — 자동 감사 (IC 번들 렉서)

### Kotlin

```kotlin
/**
 * Nebula Cache 부트스트랩. [NebulaCache]의 KDoc 링크와 `인라인 코드`.
 */
@Suppress("MagicNumber")
class NebulaBootstrap(private val config: NebulaConfig) : AutoCloseable {

    companion object {
        const val DEFAULT_TTL_MINUTES: Long = 10L   // 상수 + 라인 주석
        val TIERS = listOf("heap", "offheap")
    }

    fun start(namespace: String, maxEntries: Int = 10_000): NebulaCache {
        val ttl = config.ttlOverride ?: DEFAULT_TTL_MINUTES
        val label = "ns=$namespace ttl=${ttl}m"          /* 문자열 템플릿 + 블록 주석 */
        require(maxEntries in 1..1_000_000) { "maxEntries out of range: $maxEntries" }
        return NebulaCache.builder()
            .namespace(namespace)
            .heapTier { this.maxEntries = maxEntries }
            .metrics(enabled = true, prefix = label)
            .build()
    }

    override fun close() = println("bye")
}
```

### Java

```java
/** Nebula Cache의 자바 클라이언트 어댑터. */
@Deprecated(since = "1.2")
public final class NebulaJavaAdapter implements AutoCloseable {

    private static final int MAX_RETRY = 3;          // 상수 + 라인 주석
    private static final String METRIC_PREFIX = "nebula.client";

    private final NebulaCache cache;

    public NebulaJavaAdapter(NebulaCache cache) {
        this.cache = Objects.requireNonNull(cache, "cache");
    }

    public Optional<Product> find(String key) {
        for (int attempt = 0; attempt < MAX_RETRY; attempt++) {
            var hit = cache.get(key);                /* var + 블록 주석 */
            if (hit != null) {
                return Optional.of((Product) hit);
            }
        }
        return Optional.empty();
    }

    @Override
    public void close() { cache.flush(true); }
}
```

### Groovy

```groovy
// Gradle 빌드 스니펫 (Groovy DSL)
plugins {
    id 'java-library'
}

def nebulaVersion = '1.2.0'
ext.tiers = ['heap', 'offheap']

dependencies {
    implementation "io.nebula:nebula-core:${nebulaVersion}"   // GString 보간
    testImplementation 'org.spockframework:spock-core:2.4-M1'
}

tasks.register('printTiers') {
    doLast {
        tiers.eachWithIndex { tier, i ->
            println """tier #${i}: ${tier.toUpperCase()}"""    // 트리플 쿼트 GString
        }
    }
}
```

### XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Nebula Cache 배포 디스크립터 -->
<nebula xmlns="https://example.com/schema/nebula" version="1.2">
  <namespace name="catalog" ttl="PT10M">
    <heap maxEntries="10000"/>
    <offheap size="256MB" enabled="true"/>
  </namespace>
  <metrics enabled="true">
    <tag key="env" value="prod &amp; staging"/>
    <script><![CDATA[ if (hitRate < 0.8) alert("low"); ]]></script>
  </metrics>
</nebula>
```

### HTML

```html
<!DOCTYPE html>
<!-- Nebula 대시보드 조각 -->
<section id="nebula-stats" class="panel panel--wide" data-refresh="30">
  <h2>Hit rate &mdash; last 24h</h2>
  <p style="margin:0">현재 <strong>92.5%</strong>, 목표 <em>90%</em> 초과</p>
  <a href="https://example.com/nebula/docs?from=widget&amp;v=2">문서 보기</a>
</section>
```

### JSON

```json
{
  "namespace": "catalog",
  "ttl": "PT10M",
  "maxEntries": 10000,
  "hitRateTarget": 0.9,
  "metricsEnabled": true,
  "fallback": null,
  "tiers": ["heap", "offheap"],
  "alert": { "channel": "#nebula-ops", "threshold": -1.5e2 }
}
```

### YAML

```yaml
# Nebula Cache 배포 설정 — 키·문자열·숫자·불리언·앵커·태그·멀티라인 총망라
defaults: &defaults
  ttl: PT10M
  metrics-enabled: true          # 불리언
  max-entries: 10_000
  hit-rate-target: 0.9

namespaces:
  catalog:
    <<: *defaults                # 앵커 병합
    tier: !tier offheap          # 커스텀 태그
    owner: "cache-team"
    created: 2026-08-05          # 날짜 스칼라
  session:
    <<: *defaults
    ttl: null
    banner: |
      멀티라인 리터럴 블록
      둘째 줄
    note: >
      폴디드 스칼라는
      한 줄로 접힌다
env-overrides:
  - NEBULA_HEAP_SIZE=512m
  - NEBULA_DEBUG=false
```

### Properties

```properties
# Nebula Cache 클라이언트 설정
! 느낌표 주석도 properties 문법이다
nebula.heap.maxEntries=10000
nebula.offheap.size=256MB
nebula.ttl.default=PT10M
nebula.metrics.enabled=true
nebula.alert.channel=#nebula-ops
nebula.banner=첫 줄 \
  이어지는 줄 (라인 컨티뉴에이션)
nebula.unicode.sample=한글
```

### Shell

```bash
#!/usr/bin/env bash
# Nebula Cache 롤링 재시작 스크립트
set -euo pipefail

NEBULA_HOME="${NEBULA_HOME:-/opt/nebula}"
readonly NODES=("cache-01" "cache-02")

for node in "${NODES[@]}"; do
  status=$(ssh "$node" "systemctl is-active nebula" || true)
  if [[ "$status" != "active" ]]; then
    echo "[$(date +%H:%M:%S)] $node inactive — skip" >&2
    continue
  fi
  ssh "$node" "systemctl restart nebula" && echo "$node restarted"
done

cat <<EOF > "$NEBULA_HOME/last-restart.txt"
restarted at $(date -Iseconds) by $USER
EOF
```

### 컨트롤 (미지원 언어)

렉서가 없는 언어는 색이 입혀지지 않아야 한다 — 토큰 감사의 대조군.

```nebulaql
FETCH catalog.* WHERE hitRate < 0.8 EMIT alert("#nebula-ops")
```

## 2부 — 실사용 IDE 수동 확인 (Ultimate/플러그인 렉서)

IC 샌드박스에서는 아래 블록에 색이 없다. IntelliJ Ultimate 등 실사용 IDE에서 이 파일을 열고, 4테마×라이트/다크에서 토큰이 읽히는지 눈으로 확인한다.

### SQL

```sql
-- 네임스페이스별 히트율 상위 10건
SELECT n.name        AS namespace,
       s.hit_rate    AS hit_rate,
       COUNT(*)      AS probes
FROM nebula_stats s
         JOIN namespaces n ON n.id = s.namespace_id
WHERE s.collected_at >= NOW() - INTERVAL '24 hours'
  AND s.hit_rate IS NOT NULL
GROUP BY n.name, s.hit_rate
HAVING COUNT(*) > 5
ORDER BY s.hit_rate DESC
LIMIT 10;
```

### Python

```python
"""Nebula Cache 통계 수집기."""
from dataclasses import dataclass
from datetime import timedelta

DEFAULT_TTL = timedelta(minutes=10)  # 상수 + 주석


@dataclass(frozen=True)
class NamespaceStat:
    name: str
    hit_rate: float
    probes: int = 0

    def healthy(self, target: float = 0.9) -> bool:
        return self.hit_rate >= target


def collect(namespaces: list[str]) -> dict[str, NamespaceStat]:
    stats = {}
    for ns in namespaces:
        raw = fetch_raw(ns)  # noqa: F821
        stats[ns] = NamespaceStat(name=ns, hit_rate=raw["hitRate"], probes=raw.get("probes", 0))
        print(f"{ns}: hit={stats[ns].hit_rate:.1%}")
    return stats
```

### JavaScript

```javascript
// Nebula 대시보드 위젯
const REFRESH_MS = 30_000;

export async function refreshStats(el) {
  const res = await fetch(`/api/nebula/stats?limit=${10}`);
  if (!res.ok) throw new Error(`stats failed: ${res.status}`);
  const { namespaces = [] } = await res.json();
  el.innerHTML = namespaces
    .map((ns) => `<li class="${ns.hitRate >= 0.9 ? "ok" : "warn"}">${ns.name}</li>`)
    .join("");
  return setTimeout(() => refreshStats(el), REFRESH_MS);
}
```

### TypeScript

```typescript
interface NamespaceStat {
  readonly name: string;
  hitRate: number;
  probes?: number;
}

type StatMap = Record<string, NamespaceStat>;

export function worstNamespace(stats: StatMap, floor = 0.8): NamespaceStat | undefined {
  return Object.values(stats)
    .filter((s): s is NamespaceStat => s.hitRate < floor)
    .sort((a, b) => a.hitRate - b.hitRate)[0];
}
```
