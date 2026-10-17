# Mermaid Labels — 라벨 박스 픽스처

Mermaid는 노드·간선 라벨을 SVG `foreignObject` 안의 HTML(`div > span > p`)로 그리고, 렌더할 때 잰 라벨 크기로 노드와 간선 배치를 정한다. 테마 규칙이 라벨 박스를 바꾸면 그 배치와 어긋난다(#59). 모든 다이어그램의 라벨 박스는 테마 off와 같아야 한다. 마커: `mts-mermaid-fixture`

## Flowchart — 노드·간선 라벨

```mermaid
flowchart LR
    client[Client] -->|get| local{Local tier}
    local -->|miss| remote[(Remote tier)]
    remote -->|miss| origin[Origin DB]
```

## 서브그래프·마크다운 문자열·긴 라벨

```mermaid
flowchart TB
    subgraph tier[캐시 계층]
        md["`**굵은** 라벨과 _기울임_`"]
        ko[사용자 인증 요청을 처리하고 액세스 토큰을 발급하는 인증 게이트웨이 서비스]
    end
    md -->|"만료된 토큰을 갱신한 뒤 원래 요청을 다시 보낸다"| ko
    ko --> en[A long English label that wraps inside the node box at the default width]
    en --> kw[캐시무효화이벤트 원격저장소동기화 연결풀관리작업자]
    kw --> lw[NebulaCacheConfigurationPropertiesLoader]
```

## Sequence

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: 조회 요청
    Note over C,S: 캐시 미스면 원본을 읽는다
    S-->>C: 응답
```

## Class

```mermaid
classDiagram
    class NebulaCache {
      +String name
      +get(key) Value
    }
    NebulaCache <|-- LocalCache : 상속
```

## State

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Busy: 요청 수신
    Busy --> Idle: 완료
```

## ER

```mermaid
erDiagram
    TENANT ||--o{ NAMESPACE : owns
```

## Mindmap

```mermaid
mindmap
  root((Nebula Cache))
    로컬 계층
    원격 계층
```
