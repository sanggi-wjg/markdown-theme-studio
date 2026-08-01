# Nebula Cache — 아키텍처 개요

> **Nebula Cache**는 이 문서를 위해 지어낸 가상의 인메모리 캐시 라이브러리입니다.
> 이 문서는 Markdown Theme Studio의 렌더링 확인용 픽스처로, 모든 내용은 허구입니다.

## 1. 개요

Nebula Cache는 *읽기 중심* 워크로드를 위한 **2계층 캐시**입니다. 핫 키는 `HeapTier`에, 웜 키는 `OffHeapTier`에 저장하며, 계층 간 승격은 [LFU 정책](https://example.com/docs/lfu)을 따릅니다.

### 1.1 핵심 특징

- **계층형 저장** — 힙/오프힙 2계층, 키별 자동 승격·강등
- **TTL 상속** — 부모 네임스페이스의 TTL을 하위 키가 상속
    - 네임스페이스별 재정의 가능 (`ns.ttl.override`)
- ~~분산 모드~~ (v2.0에서 제거, 단일 노드 전용)

## 2. 구성

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `nebula.heap.maxEntries` | `10_000` | 힙 계층 최대 엔트리 수 |
| `nebula.offheap.size` | `256MB` | 오프힙 버퍼 크기 |
| `nebula.ttl.default` | `PT10M` | 기본 TTL (ISO-8601 duration) |
| `nebula.metrics.enabled` | `true` | Micrometer 메트릭 노출 여부 |

## 3. 사용 예

```kotlin
val cache = NebulaCache.builder()
    .namespace("catalog")
    .heapTier { maxEntries = 10_000 }
    .offHeapTier { size = Memory.mb(256) }
    .build()

val product = cache.getOrLoad(key) { repository.findProduct(key) }
```

통계 조회는 SQL 인터페이스로도 가능합니다:

```sql
SELECT namespace, hit_count, miss_count,
       ROUND(hit_count * 100.0 / (hit_count + miss_count), 1) AS hit_ratio
FROM nebula_stats
WHERE captured_at > NOW() - INTERVAL 1 HOUR
ORDER BY hit_ratio DESC;
```

> ⚠️ **주의**: 오프힙 크기를 컨테이너 메모리 한도의 50% 이상으로 잡으면 OOM 킬 위험이 있습니다.

## 4. 릴리스 체크리스트

- [x] 벤치마크 회귀 없음 (`./gradlew jmh`)
- [x] 메트릭 대시보드 갱신
- [ ] 마이그레이션 가이드 작성

---

*이 문서는 렌더링 데모용 픽스처입니다.*
