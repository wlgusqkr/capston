# Frontend: 가격 chip = marker (호갱노노/직방 패턴)

## 무엇을 했나
거래 핀의 시각 패턴을 점(`CircleMarker` dot) + hover `Tooltip` 조합에서
**항상 보이는 가격 chip이 marker 자체**가 되는 패턴으로 교체. 사용자
요구("hover가 아니라 바로 보이는 chip")와 PM 디자인 결정에 따름.

## 변경 파일
- `frontend/src/components/Map/TransactionPinLayer.tsx`
  - `<CircleMarker>` → `<Marker icon={L.divIcon(...)}>`
  - `<Tooltip>` 제거 (chip이 항상 보이므로 hover 카드 불필요)
  - `pinRadiusForZoom` (px radius) → `chipVariantForZoom` (compact / standard / expanded)
  - `chipHtml(...)` 함수 신설 — divIcon용 HTML 문자열 빌더
  - `VARIANT_SIZE` 테이블 — variant별 iconSize/iconAnchor px 측정값
  - `MAP_PIN` import 제거 (KernelScoreLayer에선 여전히 사용)
  - `selectedJibunPins` `pin` 두 번째 인자 등 외부 시그니처는 유지
- `frontend/src/components/Map/TransactionPinLayer.css` (신설, 138 lines)
  - 모든 chip 스타일이 디자인 토큰만 사용
- `frontend/src/components/Map/HeatMap.css`
  - `.tx-pin-tooltip*` 스타일 블록 제거 (참조 없음). 자리 보존 주석으로 교체.

## 줌별 chip variant 표

| Zoom | Variant   | Label              | iconSize (px) | font-size | padding |
|-----:|-----------|--------------------|---------------|-----------|---------|
| 13~14| compact   | `82`               | 28 × 28       | 11px      | 4 6     |
| 15~16| standard  | `82만원`           | 64 × 30       | 12px      | 5 8     |
| 17+  | expanded  | `82만원` + `3건`   | 72 × 44       | 12 + 9px  | 6 10    |

iconAnchor는 항상 `[w/2, h]` — chip 하단 중앙(▼ 끝점)이 lat/lng에 정확히 anchor.
Leaflet `divIcon` HTML이 `iconSize` box를 약간 넘쳐도 (`overflow: visible`)
hover scale/selected scale 시 잘리지 않도록 `.tx-chip-icon` 컨테이너에 처리.

## 상태별 시각 변화

| State            | 적용                                                                |
|------------------|--------------------------------------------------------------------|
| default          | `--color-near-black` fill, white@40% stroke, subtle 1×3px shadow   |
| hover            | `transform: scale(1.04)` + 강조 shadow (CSS only, JS hover state X)|
| selected         | `--color-coral` fill, scale 1.08, `zIndexOffset: 1000`             |
| dimmed (panel ON)| opacity 0.4, `zIndexOffset: -100` (selected는 항상 1.0 유지)        |

`suppressTooltips` prop은 의미가 바뀌었지만 이름은 유지(외부 caller MainMap.tsx가 같은 트리거 사용). 컴포넌트 내부 변수는 `isDimmed`로 명확화하고 prop 주석에 의미 갱신을 명시. 추후 rename은 caller 영향 분석 후 별도 작업으로.

## 사용한 디자인 토큰 (전부 `tokens.css` 정의된 것만)

- `--color-near-black` (`#17171c`) — chip 기본 배경
- `--color-canvas-white` (`#ffffff`) — chip 텍스트
- `--color-coral` (`#ff7759`) — selected chip 배경
- `--font-family-mono` — chip 텍스트 페이스
- `--radius-md` (8px) — chip 둥근 사각 (pill 금지 규칙 준수)

CSS 안 쓰인 hardcoded 색은 단 두 군데뿐:
- `rgba(255, 255, 255, 0.4)` — chip border (white @ 40%, 디자인 명세 그대로)
- `rgba(23, 23, 28, 0.18)` / `0.25` — `--color-near-black` 알파 변형. 토큰
  시스템에 RGB-channel 변수가 없어서 직접 표기. (token 보강은 design-system-keeper
  에 후속 위임 가치.)

## 검증

| 단계 | 결과 |
|---|---|
| `npm run build` (`tsc -b && vite build`) | 통과, 콘솔 에러 0 |
| `npm run dev` 에서 `/` 200 응답 | OK (port 5174로 fallback) |
| Headless Chrome 캡처 (`AFTER-chip-marker.png`) | 초기 zoom 11에서는 chip 미표시 — 의도대로 (MIN_ZOOM_FOR_PINS=13) |

수동 검증이 필요한 항목 (사용자 직접 확인 권장):
- zoom 13~14 → 작은 숫자만 chip
- zoom 15~16 → "N만원" 표준 chip
- zoom 17+ → "N만원" + "Nb건" 두 줄 chip
- chip 클릭 → TransactionPanel OPEN, 그 chip만 coral
- 패널 열린 상태에서 다른 chip들 opacity 0.4
- 패널 닫으면 모든 chip 복원

## divIcon vs CircleMarker — trade-off 메모

**divIcon 채택 이유**
1. 가격 라벨이 항상 보이는 게 디자인 결정. CircleMarker + 영구 Tooltip을 합쳐도
   가능하나, 두 레이어 z-order 관리(특히 panel 열렸을 때 dim) 비용이 높다.
2. 디자인 토큰 CSS(폰트, radius, shadow, hover 전환)을 그대로 쓸 수 있다.
   CircleMarker는 Leaflet path 옵션(색/두께)만 받아서 systemic 일관성 떨어짐.
3. 어포던스 — chip 자체가 "여기 거래가 있다"를 한눈에 전달. dot은 줄임 표현.

**비용**
- DOM 노드 수 증가: jibun당 `tx-chip` div + price span + (sub span) + pointer span
  = 3~4 노드. 현 viewport zoom 13+에서 같은 jibun 중복은 dedup 후 보통 ≤ 200건
  이므로 800 노드 이내. Leaflet의 마커 풀과 React reconcile 비용이 약간 증가하지만
  체감 무 — 이미 zoom/bbox로 게이팅 중.
- divIcon은 Leaflet이 SVG path 대신 DOM 노드를 transform으로 위치시키므로,
  pan/zoom 중에는 CircleMarker보다 painting 비용이 약간 더 든다. 다만 우리는
  always-visible chip이 디자인 의도라서 trade-off는 정당화됨.

## 클릭 전파 검증

`bubblingMouseEvents={false}` + `eventHandlers.click`에서 `e.originalEvent.stopPropagation()` 모두 유지 — divIcon Marker도 default로 `mousedown` 만 stop하므로 이중 가드가 안전. KernelScoreLayer의 map-background click이 chip 클릭 시 함께 발화하지 않는지는 수동 확인 필요(zoom 13+에서 chip 클릭하고 KernelScorePanel이 함께 열리지 않으면 OK).

## 알려진 잔여 갭

1. **Chip 겹침 z-priority** — 같은 viewport에 chip이 가까이 모여 겹칠 때
   z-index 정책은 단순(selected > default > dimmed)뿐. 호갱노노처럼 가격 높은
   순으로 위로 띄우거나 cluster로 합치는 정책은 별도 작업. 현재는 Leaflet
   marker pane 기본 ordering(추가 순) + zIndexOffset으로 충분.
2. **`suppressTooltips` prop 이름** — 의미 변경(hover 억제 → chip dim) 후에도
   이름 유지. caller(MainMap.tsx) 단일이므로 후속 PR에서 `dimOtherChips` 같은
   이름으로 rename 가치 있음. 본 작업은 시각 교체에 집중하느라 deferred.
3. **avgConverted == null 처리** — `?` 라벨로 chip 자체는 그림. 같은 jibun
   거래 전부에 환산월세가 빠진 경우는 데이터 contract상 거의 없음(백엔드가
   serializer에서 강제 계산). 그럼에도 사용자 신뢰를 위해 어떤 chip을 hide할지
   추후 정책 정리 필요할 수 있음.
4. **헤들리스 시각 회귀 테스트 부재** — Chrome 헤들리스로 `/`만 200 확인했고
   zoom 13+에서 chip이 실제로 그려지는지는 사용자/PM의 수동 검증에 의존.
   Playwright 도입은 별도 인프라 작업.
5. **RGB token gap** — `rgba(23, 23, 28, X)` 같은 알파 변형을 chip box-shadow에서
   직접 표기. design-system-keeper에 `--color-near-black-rgb: 23, 23, 28` 같은
   3-channel token 보강 요청 가치(미해결, low priority).

## 다음 작업자에게 전달할 것
- chip 클릭 → TransactionPanel 흐름은 기존 `onPinClick(jibunKey, pin)` 시그니처
  그대로. MainMap에서 panel 상태 토글 로직 무수정.
- bbox/zoom emit (`onMapStateChange`) 동작 동일. `useTransactions` 훅 무수정.
- `MAP_PIN` 상수는 `KernelScoreLayer`가 여전히 참조 — 제거하지 말 것.
