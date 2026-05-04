# Frontend: Phase 1b — 메인 지도 실거래 핀 layer + 우측 거래 패널

`docs/handoff/20260503-phase0a-kickoff.md` 섹션 4 Phase 1 → Frontend 완료.
`docs/handoff/20260503-phase1a-transactions-api.md` API 사양에 맞춰 클라이언트 통합.
SPEC `docs/SPEC.md` 섹션 6.1 (메인 지도) 준수. `docs/DESIGN_SYSTEM.md` 토큰 엄수.

---

## 완료된 작업

1. **`GET /api/transactions/bbox` 클라이언트 래퍼** — types + lib + 훅
2. **메인 지도에 raw pin layer** — `react-leaflet` `<CircleMarker>` 기반, jibun 단위 그룹화
3. **우측 슬라이드 패널 `TransactionPanel`** — 같은 지번 거래 list, 전세/월세 분기, hasMore 풋터
4. **상단-우측 floating 필터** — deal_type select + period (1/3/6/12개월) select
5. **줌 레벨 13 미만 hint overlay** + 에러 시 토스트
6. **DongPanel ↔ TransactionPanel 상호배제** — 한 패널 열면 다른 쪽 자동 닫힘

---

## 변경/추가 파일

### 신규
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/hooks/useTransactions.ts`
  - `useTransactions({ bbox, zoom, filters, limit })` TanStack Query 훅
  - `MIN_ZOOM_FOR_PINS = 13` 상수 export
  - bbox 4자리 소수점 quantize → 작은 마우스 드래그에도 cache key 안정
  - `placeholderData: (prev) => prev` — 새 fetch 동안 이전 데이터 유지 (flicker 방지)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/TransactionPinLayer.tsx`
  - MapContainer 자식으로 마운트. `useMap` + `useMapEvents` 훅으로 zoom/bbox 추적
  - moveend/zoomend → 250ms debounce → `onMapStateChange` 콜백
  - 같은 jibun 그룹화: `jibunKeyOf(p) = "${gu}|${dong_name}|${jibun}"` (jibun 문자열만으론 unique 안 됨)
  - 핀 사양 (DESIGN_SYSTEM.md):
    - 기본: radius 6 (지름 12px), fill `#17171c` (Near-Black), stroke white opacity 0.6, fillOpacity 0.85
    - 선택: radius 8 (지름 16px), fill `#ff7759` (Coral), stroke white opacity 1, weight 1.5
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/TransactionPanel.tsx` + `.css`
  - 우측 400px 슬라이드 패널, DongPanel과 동일한 패턴
  - 헤더: gu·dong_name (caption muted) + jibun (mono uppercase, feature-heading size) + 거래 건수 mono
  - 거래 row: deal_type Badge + 면적 (m² + 평 환산, 1평=3.3058m²) + 가격
    - 전세 (`monthly_rent === 0`): "전세 / 보증금" 1행
    - 월세: "월세 X / 보증금 Y" 2행, mono 가격
    - 날짜 우상단 caption muted
  - hasMore footer: "지도를 확대하면 더 많은 거래가 표시됩니다" mono-label
  - ESC로 닫기
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/TransactionFilters.tsx` + `.css`
  - top-right floating panel (zoom 컨트롤 아래로 64px offset)
  - `Select` 프리미티브 재사용 (deal_type / period 두 개)
  - `buildFilters(dealType, period)` + `periodToFromDate(period)` 헬퍼 export
  - period 옵션: 1m/3m/6m(default)/12m → today - N일 → from 파라미터
  - tx-zoom-hint 클래스도 같은 CSS 파일에 정의 (top-center hint overlay)

### 수정
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/types/api.ts`
  - 추가: `TransactionDealType`, `TransactionDealTypeFilter`, `RentDealPin`,
    `TransactionsBboxResponse`, `Bbox`, `TransactionFilters`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/api.ts`
  - 추가: `getTransactionsBbox(bbox, filters, limit?)` — `/transactions/bbox` GET
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/HeatMap.tsx`
  - `children?: ReactNode` prop 추가 → `<MapContainer>` 내부에서 렌더 (react-leaflet 컴포넌트 전용)
  - 기존 폴리곤·툴팁 동작 그대로
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MainMap.tsx`
  - 상태 추가: `mapState` (bbox+zoom from layer), `txDealType`, `txPeriod`, `selectedJibun`
  - `useTransactions` 훅 호출 + `selectedJibunPins` 메모
  - `handleDongClick` / `handlePinClick` — 두 패널 상호배제
  - JSX: `<HeatMap>` 자식으로 `<TransactionPinLayer>`, 형제로 `<TransactionFilters>`,
    `<TransactionPanel>`, hint/에러 overlay 추가

---

## 사용한 디자인 토큰 (DESIGN_SYSTEM.md 준수)

### 색
- `--color-near-black` `#17171c` — 핀 기본 fill, 패널 본문 텍스트 (`--color-text` 경유)
- `--color-coral` `#ff7759` — 선택 핀 fill (MAP_PIN.selected, 이미 colors.ts에 등록되어 있던 토큰)
- `--color-surface` / `--color-surface-inset` — 패널/필터 배경, row hover
- `--color-border` / `--color-border-strong` — 패널 보더, row separator
- `--color-text` / `--color-text-muted` / `--color-text-subtle` — 본문 위계
- `--shadow-floating` — 패널·필터·hint 모두 (Floating map UI 예외)

### 타이포
- `--font-feature-heading-*` — jibun 헤더
- `--font-family-mono` + `--font-mono-label-*` — 시스템 라벨 ("거래 필터", "월세", "보증금", 줌 hint)
- `--font-body-large-size` — 가격 숫자 (mono)
- `--font-caption-*` — 날짜, gu·dong meta
- `--font-body-base-*` — 면적
- `.tabular` 글로벌 유틸 — 숫자/날짜 정렬

### 도형/스페이싱
- `--radius-card` (16px) — 필터 패널
- `--radius-sm` (8px) — hint overlay
- `--radius-md` — 닫기 버튼
- `--space-*` 8px 베이스만 사용
- 패널 너비 400px (DongPanel과 동일, SPEC 6.2 380~420px 범위)

### Z-index
| Component | z |
|---|---|
| TransactionFilters | 480 |
| Legend / ViewToggle | 400 |
| DongPanel (open) | 500 |
| TransactionPanel (open) | 510 |

TransactionPanel이 DongPanel보다 위 — 둘은 상호배제이므로 문제 없음.
필터(480)는 두 패널보다 아래 → 패널 열렸을 때 가려짐. 의도된 UX.

---

## 검증 결과

### 빌드/타입
- `npm run typecheck` → 0 에러
- `npm run build` → 0 에러, 853KB JS / 96KB CSS (Phase 0a 대비 +6KB JS, +3KB CSS, 핀/패널/필터 추가분)
- `npm run dev` → vite 정상 부팅 (`http://127.0.0.1:5173/`)

### 백엔드 연동
- `/api/dongs/scores` 200 OK 확인 (기존 동작)
- `/api/transactions/bbox` — 백엔드 서버 재시작 필요. 현재 실행 중인 서버 프로세스가 Phase 1a URL include 이전에 시작되어 404 반환 (코드 자체는 정상 등록되어 있음).
  → **운영자 액션**: 백엔드 `runserver` 재시작 후 `curl 'http://localhost:8000/api/transactions/bbox?bbox=126.95,37.55,127.00,37.58&limit=10'`로 200 확인.

### 시각 사양 (DESIGN_SYSTEM.md 매핑)
- 핀 기본 12px diameter, 선택 16px diameter — `radius` 6/8 px (Leaflet은 radius=반지름)
- 핀 stroke white opacity 0.6 (기본) / 1.0 (선택), weight 1 / 1.5 — DESIGN_SYSTEM.md "Map-Specific Shapes"
- 패널 슬라이드: `transform: translateX(100%) → 0`, `var(--transition-slow)` (300ms)
- floating 필터: white + 1px border + `--shadow-floating`
- hint overlay: top-center 작은 white pill, mono-label 텍스트

---

## 알려진 이슈

### 1. 좌표 jitter 없음 → 같은 jibun 다건은 단일 마커
SPEC 14.2 "지번 중심점만" 정책에 따라 같은 jibun의 모든 거래는 정확히 동일 lat/lng. 시각적으로 1개 점으로만 보이며, 클릭 시 패널에서 N건 list로 펼쳐짐. supercluster 같은 클러스터링은 Phase 1 스코프 외 (kickoff 4(d) 결정).

### 2. 백엔드 적재 범위는 5개 구만
중구·종로구·관악구·마포구·동대문구만. 다른 구 줌인해도 핀이 없음. 사용자에게는 "결과 0건" 상태로 보일 뿐 별도 공지 X (Phase 1 스코프 외, 데이터 적재 진척도 의존).

### 3. `danok` 필터는 영구 빈 결과
국토부 API가 단독다가구 jibun을 응답에 안 내려줘서 좌표 0%. 필터에 옵션은 노출하되, 선택해도 핀 0개. 사용자 혼란 방지를 위해 "단독다가구는 좌표 데이터 부재" 안내가 향후 필요할 수 있음 (지금은 미구현).

### 4. has_more 처리는 hint만, 페이지네이션 X
`has_more=true`일 때 패널 풋터에 "지도를 확대하면 더 많은 거래가 표시됩니다" 노출. 백엔드가 cursor/offset 미지원 (Phase 1a 제약)이므로 클라이언트 측 페이지 fetch 불가. 학부 데모 충분.

### 5. 패널 동시 열림 미허용
DongPanel과 TransactionPanel은 상호배제. 동네 클릭 → 동네 패널 열리고 거래 패널 닫힘 (반대도 동일). 두 데이터를 동시에 보고 싶다면 추후 design system 결정 필요.

### 6. 필터 패널 가림
패널이 열리면 우상단 필터(width ~250px)가 패널(400px) 뒤로 가려짐. 패널 닫으면 다시 노출. 의도된 동작이지만, "패널이 열린 상태에서 필터 변경" 시나리오는 패널을 닫고 변경해야 함.

### 7. 단일 zoom-out moveend 트리거 시 이전 결과가 잠시 보임
`placeholderData`로 이전 데이터 유지하므로 줌 변화 직후 250ms 동안 이전 핀이 잠시 표시되다가 새 결과로 교체. 정상 동작이지만 zoom < 13으로 떨어진 직후에는 `TransactionPinLayer` 내부에서 `map.getZoom() < MIN_ZOOM_FOR_PINS`로 즉시 null 반환하여 시각 잡음 없음.

### 8. 접근성
- 패널/필터 모두 `aria-label`, `role="complementary"`, ESC 닫기 지원.
- 핀 자체는 시각 요소만 (스크린리더 대응 미흡). Phase 2에서 keyboard navigation 추가 검토 필요.

---

## 검증 시나리오 (수동)

1. `cd backend && python manage.py runserver` (재시작 필요)
2. `cd frontend && npm run dev` → `http://127.0.0.1:5173/` 접속
3. 초기 화면: 줌 11 → 우상단 필터 + 상단 hint "더 확대해 거래 핀 보기" 노출, 핀 0
4. 명동/필동 일대로 드래그 + 줌 인 (zoom 13~14)
5. → 핀 표시 확인. 색은 Near-Black (`#17171c`), stroke white 60%
6. 핀 hover (마우스 올림) → 색 변화 없음 (hover state는 코드상 구현 안 함, click → selected만 적용됨; 향후 개선 가능)
7. 핀 클릭 → 우측 패널 슬라이드 인. 헤더: "중구 · 광희동" + jibun mono + N건 거래
8. 같은 jibun에 거래 2~3건 묶이는지 확인
9. 가격 표기: 전세 (월세 0) → "전세 14,700만원". 월세 → "월세 50만원 · 보증금 1,000만원"
10. 면적: "20.4m² · 6.2평" (1평 환산)
11. deal_type 필터 → "오피스텔" 선택 → 핀 갱신, villa 핀 사라짐
12. period 필터 → "1개월" 선택 → 더 적은 핀
13. 줌 아웃 (12 이하) → 핀 사라짐 + hint 노출
14. 다른 구로 panning → 250ms 후 bbox refetch (Network 탭에서 호출 빈도 확인)
15. 동 폴리곤 클릭 → DongPanel 열리고 TransactionPanel 닫힘 (반대도 동일)
16. ESC → 열린 패널 닫힘
17. 콘솔 에러 0

---

## 다음 작업자 (Phase 2b 커널 점수 패널)에게 전달

### floating panel 패턴 재사용 위치
이 단계에서 확립된 우측 슬라이드 패널 패턴은 다음 두 파일이 표준:
- `frontend/src/components/Map/DongPanel.{tsx,css}` — 동네 요약 (SPEC 6.2)
- `frontend/src/components/Map/TransactionPanel.{tsx,css}` — 거래 list (Phase 1b)

Phase 2b 커널 점수 패널도 같은 패턴을 따르세요:
- `position: absolute; right: 0; width: 400px; transform: translateX(100%); transition: transform var(--transition-slow);`
- `--open` modifier 클래스로 `translateX(0)` + `box-shadow: var(--shadow-floating)`
- 패널은 항상 DOM 유지 (slide-out 트윈 위함)
- ESC 닫기 + 우상단 × 버튼
- z-index는 500 (DongPanel) 이상, **단** TransactionPanel(510)과 충돌 시 상호배제 처리 필요

### 상호배제 처리 패턴
`MainMap.tsx`의 `handlePinClick` / `handleDongClick`처럼:
```tsx
const handleKernelPointClick = (latLng) => {
  setKernelPoint(latLng);
  setSelectedSlug(null);   // close DongPanel
  setSelectedJibun(null);  // close TransactionPanel
};
```

### 지도 클릭 핸들러 (Phase 2b 핵심)
`HeatMap.tsx`는 현재 children prop으로 react-leaflet 컴포넌트를 받음. Phase 2b에서 임의 지점 클릭 핸들러는 `useMapEvents({ click: ... })`를 사용하는 별도 컴포넌트(`KernelClickLayer.tsx` 등)를 만들고 children으로 전달:

```tsx
function KernelClickLayer({ onPointClick }) {
  useMapEvents({ click: (e) => onPointClick(e.latlng) });
  return null;
}

// MainMap.tsx
<HeatMap ...>
  <TransactionPinLayer ... />
  <KernelClickLayer onPointClick={handleKernelPointClick} />
</HeatMap>
```

이렇게 하면 HeatMap을 또 수정할 필요가 없고 layer를 자유롭게 추가 가능.

### Coral 마커 단일 인스턴스
Phase 2b "클릭 지점에 Coral 12px 마커, 다음 클릭 시 덮어쓰기" — `MAP_PIN.selected = '#ff7759'` 그대로 사용. 단일 `<CircleMarker>`를 조건부 렌더(state로 관리)하면 자동으로 1개만 유지됨.

### 동시 핀 상호작용 주의
TransactionPinLayer가 click 이벤트를 자식 마커에서 처리. 만약 Phase 2b가 빈 지도 영역 클릭만 잡고 싶다면 `useMapEvents`의 `click`은 마커 클릭과 별개로 fire되므로 (Leaflet 마커 클릭은 stopPropagation 기본) 큰 문제 없음. 다만 GeoJSON 폴리곤 click은 동시 발생할 수 있으니 `e.originalEvent`로 분기 필요할 수 있음.

### useTransactions 훅 패턴
`useTransactions`는 `placeholderData: (prev) => prev` 패턴을 사용해 fetch 동안 이전 데이터 유지. Phase 2b의 score point query (`POST /api/score/point`)도 동일 패턴 권장 — 가중치 슬라이더 변경 시 패널 깜빡임 방지.

---

## 미해결 / 후속 과제

- 핀 hover 시 색 변화 미구현 (현재는 click → selected만). 향후 `mouseover`/`mouseout` 핸들러로 hover state 토큰화 가능.
- 핀 popup/tooltip 미구현 — DESIGN_SYSTEM.md "POI marker card" 패턴(작은 white pill + mono 라벨)을 hover에 적용하면 패널 열기 전 quick peek 가능. 사용자 피드백 후 결정.
- danok deal_type "데이터 부재" 안내 UI 추가 검토.
- 모바일 반응형은 스코프 외 (CLAUDE.md 명시).
