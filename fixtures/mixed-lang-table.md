# Mixed Language Table — Korean Table in an English Document

> English document with a Korean description table (#68). Marker: `mts-mixed-lang-fixture`
> The document is English (no `data-mts-lang`), but its Korean table cells must wrap at word boundaries
> (`data-mts-hangul` → `word-break: keep-all` on cells only). Everything below describes Nebula Cache,
> the fictional caching library used by the other fixtures.

## Overview

Nebula Cache is a two-tier cache built for read-heavy workloads. Hot keys live in the heap tier, warm keys in the off-heap tier, and promotion between tiers follows an LFU policy. A well-tuned deployment typically serves more than ninety-five percent of reads from memory, which keeps p99 latency well under a millisecond even during traffic spikes.

Namespaces isolate configuration, so a catalog namespace can keep long TTLs while a session namespace expires entries within minutes. Every namespace exports hit ratio, eviction count and load latency through Micrometer, and the bundled dashboard aggregates them per node.

## Configuration

The option descriptions below are maintained by the Korean team and kept in Korean on purpose.

| Option | Type | Default | Applies | 설명 |
|---|---|---|---|---|
| `nebula.offheap.evictionPolicyClassName` | `String` | `LfuEvictionPolicy` | restart | 오프힙 계층의 축출 정책 구현 클래스. 사용자 정의 구현은 SPI로 등록한다 |
| `nebula.heap.promotionThresholdAccessCount` | `Int` | `3` | immediate | 웜 키가 핫 계층으로 승격되기 위한 최소 접근 횟수. 낮출수록 승격이 공격적이다 |
| `nebula.namespace.defaultTtlInheritanceMode` | `Enum` | `CASCADE` | immediate | 부모 네임스페이스 TTL 상속 방식. 하위 키는 부모 값을 그대로 물려받는다 |

| Key | 설명 |
|---|---|
| `nebula.ttl.default` | 네임스페이스에 TTL이 명시되지 않았을 때 적용되는 기본 유효 기간이다 |
| `nebula.metrics.enabled` | Micrometer 메트릭 노출 여부. 끄면 히트율 대시보드와 알림이 모두 비활성화된다 |

## Notes

English cells are unaffected by the Korean table rule: keep-all does not change where Latin text wraps, so long English descriptions such as this one still break between words as usual.

| Option | Description |
|---|---|
| `nebula.metrics.percentilesHistogram` | Enables client-side percentile histograms for latency metrics so that dashboards can aggregate p50/p99 across nodes |
