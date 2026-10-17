---
title: Nebula Cache Architecture Overview
tags: [fixture, english]
---

# Nebula Cache — Architecture Overview

> English rendering fixture. Marker: `mts-english-fixture`
> Everything below describes Nebula Cache, a fictional in-memory caching library invented for these fixtures.

## 1. Overview

Nebula Cache is a **two-tier cache** built for *read-heavy* workloads. Hot keys live in the `HeapTier`, warm keys in the `OffHeapTier`, and promotion between tiers follows an [LFU policy](https://example.com/nebula/docs/eviction). A well-tuned deployment typically serves more than ninety-five percent of reads from memory, which keeps p99 latency well under a millisecond even during traffic spikes.

Long identifiers and URLs must wrap without pushing the page sideways: `NebulaCacheConfigurationPropertiesAutoConfigurationRegistrar` and https://example.com/grafana/d/nebula-cache-overview?orgId=1&refresh=30s&from=now-6h&to=now&var-namespace=catalog are both deliberately long.

Typographic details: “curly quotes” and ‘single quotes’, apostrophes (it’s the cache’s TTL), straight "ASCII quotes" for contrast, em dashes — like this — en dashes (2019–2026), ellipses…, fractions ½, the ellipsis-heavy sentence that keeps going, superscript x<sup>2</sup>, and a hyphenated compound like state-of-the-art read-through-and-write-behind caching.

### 1.1 Key features

- **Tiered storage** — heap and off-heap tiers with automatic promotion and demotion
- **TTL inheritance** — child keys inherit the namespace TTL
  - Overridable per namespace (`ns.ttl.override`)
- ~~Distributed mode~~ (removed in v2.0; single node only)
- [x] Metrics exported through Micrometer
- [ ] Cluster-wide invalidation (planned)

1. Configure the namespace
2. Warm the cache
   1. Replay the access log
   2. Verify the hit ratio

## 2. Configuration

| Option | Default | Description |
|---|---|---|
| `nebula.heap.maxEntries` | `10_000` | Maximum number of entries kept in the heap tier before the least recently used ones are evicted |
| `nebula.offheap.size` | `256MB` | Size of the off-heap buffer |
| `nebula.ttl.default` | `PT10M` | Default TTL (ISO-8601 duration) |
| `nebula.metrics.enabled` | `true` | Whether Micrometer metrics are exported |

## 3. Usage — Nebula’s “read-through” path

```kotlin
val cache = NebulaCache.builder()
    .namespace("catalog")
    .heapTier { maxEntries = 10_000 }
    .build()

val product = cache.getOrLoad(key) { repository.findProduct(it) }
```

> [!WARNING]
> Calling `evictAll()` propagates to every node. Never call it during a rolling restart.

Press <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> to reload the configuration, and see the <mark>highlighted</mark> notes in the runbook.

---

Footnote example[^1].

[^1]: Footnotes render as a separate section at the end of the document.
