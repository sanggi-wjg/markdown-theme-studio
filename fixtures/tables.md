# Table Layout Zoo

> 테이블 열 폭 거동 검증용 픽스처입니다. 마커: `mts-tables-fixture`
> 모든 내용은 [sample.md](sample.md)와 같은 가상의 Nebula Cache 프로젝트 설정이다.

## T1 — 불균형 2열 (짧은 키 + 긴 한글 설명)

| 옵션 | 설명 |
|---|---|
| `nebula.ttl.default` | 네임스페이스에 TTL이 명시되지 않았을 때 적용되는 기본 유효 기간이다. ISO-8601 duration 형식을 사용하며, 부모 네임스페이스의 값을 하위 키가 상속한 뒤 키별 재정의가 가능하다. |
| `nebula.metrics.enabled` | Micrometer 메트릭 노출 여부. 끄면 히트율 대시보드와 알림이 모두 비활성화되므로 프로덕션에서는 끄지 않는 것을 권장한다. |

## T2 — 와이드 다열 (긴 식별자 + 한글 압착 유발)

| 옵션 키 | 타입 | 기본값 | 적용 시점 | 설명 | 비고 |
|---|---|---|---|---|---|
| `nebula.offheap.evictionPolicyClassName` | `String` | `LfuEvictionPolicy` | 재시작 필요 | 오프힙 계층의 축출 정책 구현 클래스. 사용자 정의 구현은 SPI로 등록한다 | 2.1부터 지원 |
| `nebula.heap.promotionThresholdAccessCount` | `Int` | `3` | 즉시 반영 | 웜 키가 핫 계층으로 승격되기 위한 최소 접근 횟수. 낮출수록 승격이 공격적이다 | 성능 민감 |
| `nebula.namespace.defaultTtlInheritanceMode` | `Enum` | `CASCADE` | 즉시 반영 | 부모 네임스페이스 TTL 상속 방식. CASCADE는 전파, ISOLATE는 차단이다 | |

## T3 — 긴 인라인 코드·URL 셀

| 항목 | 값 |
|---|---|
| 벤치마크 명령 | `./gradlew :nebula-bench:run --args="--namespace catalog --duration PT5M --concurrency 64"` |
| 대시보드 | https://example.com/grafana/d/nebula-cache-overview/nebula-cache?orgId=1&refresh=30s&var-namespace=catalog |
| 짧은 값 | 42 |

## T4 — 숫자 위주 다열

| 네임스페이스 | 히트율 | p50(ms) | p99(ms) | 엔트리 수 | 승격/s |
|---|---|---|---|---|---|
| catalog | 92.5% | 0.8 | 4.2 | 9,412 | 31 |
| session | 88.1% | 0.6 | 3.1 | 104,882 | 122 |
| pricing | 97.9% | 0.4 | 1.9 | 1,204 | 4 |

## T5 — 초소형

| 키 | 값 |
|---|---|
| 모드 | 단일 |

## T6 — 한글 장문 + 코드 혼합 3열

| 단계 | 코드 | 설명 |
|---|---|---|
| 초기화 | `NebulaCache.builder().namespace("catalog").build()` | 빌더가 네임스페이스 설정을 읽어 힙·오프힙 계층을 준비하고 메트릭 레지스트리에 게이지를 등록한다 |
| 조회 | `cache.getOrLoad(key) { repository.find(key) }` | 캐시 미스일 때만 로더가 실행되며 결과는 TTL과 함께 힙 계층에 기록된다. 동시 미스는 단일 로더 실행으로 병합된다 |
| 종료 | `cache.close()` | 오프힙 버퍼를 해제하고 미기록 통계를 플러시한다 |
