# 장바구니·주문서 견적 API 성능 개선 (FMP-5137)

> 대상: `mall/api` `BasicOrderService.estimateCart`(OrderService.kt:605), `estimateOrder`(OrderService.kt:735) 및 전체 호출 경로
> 작성일: 2026-07-23 / **최종 갱신: 2026-07-31 — 잔여 항목 전수 재검증 및 우선순위 재정렬([§1.1](#11))**. 코드 정적 분석 기반이며 수치는 대표 시나리오 기준 추정치(→ [§8 측정 권고](#8)).

---

## 1. 진행 현황

| Phase       | 내용                                                                                                              | 진행 방식                            | 상태                            |
|-------------|-----------------------------------------------------------------------------------------------------------------|----------------------------------|-------------------------------|
| **Phase 1** | 무손실 쿼리 제거 3건 + 마일리지 정책 캐시 → [§2](#2)                                                                | [PR #3433](https://example.com)  | ✅ **완료** (2026-07-27 main 머지) |
| **Phase 2** | **A. projection `product`→`productId` 축소** ✅ / B. refresh 3메서드 통합·카트 4중 조회 → 1 ⏸ **보류**(§3.2)     | 현재 브랜치 (`raynor/cart-order-api`) | ✅ **A 완료** (B는 Phase 5로 이월)   |
| **Phase 3** | ~~SkuService IN-배치화~~ ❌ **미착수 확정**, 준정적 데이터 캐시(**`getFitpetSellerIds` ✅ 적용**, 나머지 2곳 미적용)   | 현재 브랜치 (캐시) / 나머지는 새 태스크(Jira)   | 🔸 일부 완료                      |
| **Phase 4** | **쿠폰 커버리지 IN-batch(B1) → 📄 별도 문서 분리**, 다중옵션 경량 projection, ~~Validator IN-일괄~~                | B1은 별도 트랙(FMP-5156) / 나머지 새 태스크  | B1 분리 / A7 미착수               |

> ⚠️ **2026-07-31 재평가**: Phase 3~5 잔여 항목을 전수 재검증했다.
> **다음 작업은 B1 쿠폰 커버리지 단독 최우선.** 잔여 항목 대부분은 쿼리 *횟수*만 줄여 효과가 밀리초 단위인데, B1만은 ① 횟수 기준 최대(~10쿼리) ② LOB 페이로드라는 비선형 요인 ③ **매핑을 공유하는 호출부 13곳**을 한 번에 개선한다는 세 축을 모두 갖는다.

**진행 원칙**

- 각 Phase는 이전 Phase의 **배포·안정화 확인 후 착수**. 항목별 커밋 분리(문제 발생 시 개별 revert 가능하게).
- 기대 효과(정적 추정): Phase 1만으로 estimateOrder **-26~40%**, estimateCart **-13~21%** 쿼리 감소.
    - Phase별 우선순위 근거: 비용(변경 범위+회귀 리스크) 小 · 보상(쿼리 절감 규모×API 빈도) 大 순.

### 3.2 실측 — `@Lob` 페이로드 규모 (2026-07-27)

```sql
SELECT AVG(LENGTH(p.description)), MAX(LENGTH(p.description))
FROM products_product p
         JOIN accounts_status s ON p.status_id = s.id
WHERE s.value = 'APPROVED';
-- 806.67 , 34323
```

- `description` 평균 **약 807바이트**, 최대 **34KB**. 카트 10건 기준 실행당 약 8KB, 4회 실행에 32KB(낭비분 24KB) 수준.
- **해석: LOB 페이로드는 estimateCart의 지배적 병목이 아니다.**
- 단서 2가지:
    - 6개 LOB 중 `description`만 측정(나머지 5개는 미측정, 그중 2개는 deprecated)
    - **카탈로그 전체 평균이지 장바구니 담김 가중 평균이 아니다** — MAX 34KB의 꼬리도 존재한다.

### 3.4 작업 B — 세 메서드를 단일 메서드로 통합 (카트 조회 4 → 1)

`CartService`의 `updateIfExceedMaxOrderQuantity`·`refreshDuplicatedCartItems`·`refreshPromotionOfCartItems` 3개를 **공개 메서드 1개로 통합**하고, 내부에서 카트를 1회만 조회한다.

```kotlin
override fun resolveCartItems(userId: Int): List<CartItemWithRelatedProjection> {
    val cartItems = cartItemRepository.findCartItemsWithRelatedByUserId(userId)
    updateIfExceedMaxOrderQuantity(cartItems)   // in-place 수정, 반환 불요
    return refreshPromotionOfCartItems(refreshDuplicatedCartItems(cartItems))
}
```

**B1을 측정보다 앞세우는 근거** — 다른 항목과 달리 세 축을 모두 갖는다.

| 축      | B1                       | 나머지 잔여 항목     |
|--------|--------------------------|---------------|
| 쿼리 횟수  | **~10쿼리**로 최대            | 1~9쿼리         |
| 비선형 요인 | **LOB 페이로드**             | A3·B4 외에는 없음  |
| 파급 범위  | **매핑 공유 호출부 13곳**        | 단일 경로         |
