---
title: Element Zoo
tags: [fixture, nebula-cache]
---

# Element Zoo — h1

> 마크다운 전 요소 커버리지 픽스처입니다. 마커: `mts-elements-fixture`
> 모든 내용은 [sample.md](sample.md)와 같은 가상의 Nebula Cache 프로젝트 문서다.

## 인라인 전종 — h2

일반 본문에 **굵게**, *기울임*, ~~취소선~~, `인라인 코드`, [링크](https://example.com/nebula), <ins>삽입</ins>, <mark>하이라이트</mark>, <kbd>Cmd</kbd>+<kbd>K</kbd>, 위첨자<sup>2</sup>, 아래첨자<sub>i</sub>, <u>밑줄</u>, <small>스몰 텍스트</small>가 섞여 있다.

오토링크: https://example.com/grafana/d/nebula-cache-overview?orgId=1&refresh=30s

### 목록 — h3

- 1단계 항목
  - 2단계 항목
    - 3단계 항목 — `코드`와 **강조** 포함
- [x] 완료된 작업
- [ ] 미완료 작업 (체크박스 렌더 확인)

1. 순서 목록
2. 둘째
   1. 중첩 순서

#### 인용 — h4

> 1단계 인용에 `인라인 코드`와 [링크](https://example.com)가 있다.
>
> > 2단계 중첩 인용.
>
> - 인용 안 목록

##### 코드 — h5

```kotlin
val cache = NebulaCache.builder().namespace("catalog").build()  // 펜스 코드
```

    val indented = "들여쓰기 코드 블록"  // 펜스 아닌 pre

###### 표·이미지·수평선 — h6

| 키 | 값 |
|---|---|
| 모드 | 단일 |

![1px 이미지](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==)

---

용어 정의 시도 (지원 여부 확인용)
: 정의 목록이 파서에서 지원되면 dl/dt/dd로 렌더된다.

각주 시도[^1]

[^1]: 각주가 지원되면 별도 섹션으로 렌더된다.
