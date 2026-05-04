# Frontend: Phase 2b — 임의 지점 클릭 → 커널 점수 패널

`docs/handoff/20260503-phase0a-kickoff.md` 섹션 4 Phase 2 → Frontend 완료.
`docs/handoff/20260503-phase2a-kernel-score.md` API 사양에 맞춰 클라이언트 통합.
SPEC `docs/SPEC.md` 섹션 6.1 (메인 지도) + 11 (점수) 준수. `docs/DESIGN_SYSTEM.md`
토큰 엄수.

---

## 완료된 작업

1. **`POST /api/score/point` 클라이언트 래퍼** — types + lib + 훅 (AbortSignal 지원).
2. **메인 지도에 임의 지점 클릭 핸들러 + Coral 단일 마커**:
   `KernelScoreLayer` (react-leaflet `useMapEvents` + `<CircleMarker>`).
3. **우측 슬라이드 패널 `KernelScorePanel`**:
   score 헤로 + breakdown bars + 가중치 슬라이더 + 학교 셀렉트 + nearest list +
   radius_counts 그리드.
4. **300ms debounce 가중치 → API**: 슬라이더 드래그는 즉시 UI 반영,
   네트워크 호출은 멈춘 후 300ms.
5. **3패널 상호배제**: DongPanel ↔ TransactionPanel ↔ KernelScorePanel —
   한 번에 한 개만 OPEN.
6. **클릭 우선순위 보장**:
   - 핀 클릭 (zoom 13+) → 거래 패널 (Leaflet 기본 stopPropagation).
   - 동 폴리곤 클릭 → 동 패널 (HeatMap에서 명시적 stopPropagation 추가).
   - 빈 지도 클릭 → 커널 패널.

---

## 변경/추가 파일

### 신규
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/hooks/useKernelScore.ts`
  - `useKernelScore({ point, weights, school })` TanStack Query 훅
  - `LatLng` 타입 export (`[lat, lng]`)
  - `qz()` — lat/lng 5자리 양자화 (~1m), cache key 안정화
  - `toFractionWeights()` — integer percent → API fraction 변환
  - `staleTime: 5min`, `placeholderData: prev`, `refetchOnWindowFocus: false`
  - `signal` 패스스루 → 빠른 클릭 시 이전 요청 cancel
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/KernelScoreLayer.tsx`
  - MapContainer 자식. `useMapEvents({ click })` 로 좌표 캡처
  - 단일 `<CircleMarker>` (radius 6 → 12px diameter, fill `MAP_PIN.selected`
    Coral, stroke 1.5px white, fillOpacity 1)
  - `interactive={false}` — 마커 위 재클릭도 새 좌표로 인식되도록
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/KernelScorePanel.tsx` + `.css`
  - 우측 400px 슬라이드 패널 (DongPanel/TransactionPanel과 동일한 사이즈/모션)
  - 섹션:
    1. 헤더: "선택 지점" mono uppercase + lat,lng caption + dong_name + 닫기 ×
    2. **Score**: `Score` primitive `size="lg" tone="neutral"` (48px Data Display)
       + "/ 100" + 갱신 중 indicator (mono)
    3. **Breakdown bars**: 전월세 / 생활시설 / 교통 — 5-stop quintile 색상
       (heatmap-1..5 토큰 재사용, DongPanel와 동일)
    4. **가중치 슬라이더**: 3개, native range input (Slider primitive 패턴 미러)
       — 가중치 합 강제 X (백엔드 정규화)
    5. **학교 셀렉트**: 14개 옵션 (16개 키 중 alias 2쌍 제외 — 동국대/한양대/고려대/
       연세대/서강대/이화여대/홍익대/서울대/중앙대/건국대/성균관대/경희대/한국외대/
       서울시립대) + 통학 시간 표시 (`commute_min` 분)
    6. **Nearest list**: emoji + name + (line) + WALK NMIN + 거리(m)
       — subway 우선, 그 다음 convenience/cafe/mart/hospital/pharmacy/park 순
    7. **Radius 1km 그리드**: 2x3, 카테고리 한국어 라벨 (mono uppercase) + 숫자

### 수정
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/types/api.ts`
  - 추가: `KernelScoreWeights`, `KernelScoreRequest`, `NearestFacility`,
    `NearestFacilityCategory`, `RadiusCounts`, `KernelScoreMeta`,
    `KernelScoreResponse`, `KERNEL_SCHOOL_OPTIONS` (14 키 — alias 정리),
    `KernelSchool`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/api.ts`
  - import 목록에 `KernelScoreRequest`, `KernelScoreResponse` 추가
  - `postScorePoint(body, signal?)` 함수 추가 — POST /score/point
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/HeatMap.tsx`
  - import: `L` (Leaflet) + `LeafletMouseEvent` 타입
  - 폴리곤 click 핸들러에 `L.DomEvent.stopPropagation(e)` 추가
    → useMapEvents.click 로 버블 안 됨 → 커널 패널과 충돌 X
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MainMap.tsx`
  - import: `KernelScoreLayer`, `KernelScorePanel`, `useKernelScore`, `LatLng`
  - 상태 추가:
    - `kernelPoint: LatLng | null`
    - `kernelWeights: Weights` (UI state, immediate)
    - `kernelWeightsDebounced: Weights` (300ms after kernelWeights)
    - `kernelSchool: string` ('' = 선택 안 함)
  - `useKernelScore` 호출 (debounced weights)
  - 가중치 디바운스 useEffect (300ms)
  - 커널 패널 OPEN 시 사이드바 weights 로 seeding (마운트 시 1회)
  - `handleDongClick` / `handlePinClick` 에 `setKernelPoint(null)` 추가
  - `handleKernelPointClick(latLng)` 신규 — 다른 두 패널 자동 close
  - JSX:
    - `<HeatMap>` 자식으로 `<KernelScoreLayer>` 추가 (TransactionPinLayer 다음)
    - `<TransactionPanel>` 형제로 `<KernelScorePanel>` 추가

---

## 사용한 디자인 토큰 (DESIGN_SYSTEM.md 준수)

### 색
- `--color-near-black` `#17171c` — 슬라이더 thumb/track fill, 본문 텍스트
- `--color-coral` `#ff7759` (= `MAP_PIN.selected`) — 클릭 마커 fill
- `--color-surface` / `--color-surface-inset` — 패널 배경, radius cell 배경,
  bar track 배경, commute 박스
- `--color-border` / `--color-border-strong` — 패널 보더, row separator,
  슬라이더 thumb outline
- `--color-text` / `--color-text-muted` / `--color-text-subtle` — 본문 위계
- `--color-focus-ring` — 슬라이더/버튼 포커스
- `--shadow-floating` — 패널 (Floating map UI 예외)
- `--heatmap-1..5` — breakdown bar 5-stop quintile (DongPanel과 동일)

### 타이포
- `--font-data-display-*` (48px) — Score primitive `size="lg"` 기본 사용
- `--font-feature-heading-*` — dong_name 표기
- `--font-family-mono` + `--font-mono-label-*` — 모든 system 라벨
  ("선택 지점", "WALK 4MIN", "편의점", "갱신 중")
- `--font-card-heading-*` — radius cell 큰 숫자
- `--font-body-large-size` — commute_min 강조
- `--font-caption-*` — 좌표, line 표기, 거리 m 표기
- `.tabular` 글로벌 유틸 — 숫자 정렬

### 도형/스페이싱
- `--radius-card` (16px) — commute box
- `--radius-md` (8px) — radius cell, 닫기 버튼
- `--radius-full` — 슬라이더 track + thumb, breakdown bar fill
- `--space-*` 8px 베이스 (1/2/3/4/5)
- 패널 너비 400px (DongPanel/TransactionPanel과 동일, SPEC 6.2 380~420px 범위)

### Z-index (layered top-down)
| Component | z |
|---|---|
| KernelScorePanel (open) | 520 |
| TransactionPanel (open) | 510 |
| DongPanel (open) | 500 |
| TransactionFilters | 480 |
| Legend / ViewToggle | 400 |

3개 패널은 상호배제이므로 z 순서 충돌 없음.
KernelScorePanel 이 가장 위에 오는 이유: 가장 최근에 추가된 인터랙션이며,
세 패널 중 가장 "능동적인" UI (사용자가 마우스 직접 클릭).

---

## API 호출 사양 (요약)

### 요청
```http
POST /api/score/point
Content-Type: application/json

{
  "lat": 37.5663,
  "lng": 126.9783,
  "weights": { "rent": 0.33, "amenity": 0.33, "transit": 0.34 },
  "school": "동국대"
}
```

### Frontend 의 weights 변환
- 사이드바/패널 state 는 integer percent (0~100, sum=100, ±1 허용)
- API 호출 시 `useKernelScore` 가 `/100` 으로 fraction 변환 후 전송
- 백엔드는 `w_i/sum(w)` 정규화 → 합 강제 안 함

### 디바운스
- UI state `kernelWeights` 는 즉시 갱신 (슬라이더 drag = 매 step)
- 별도 `kernelWeightsDebounced` 가 300ms 지연 후 동기화
- `useKernelScore` 가 debounced 값을 query key 로 사용 → 네트워크 spam 0

### 캐시
- TanStack Query `staleTime: 5min`
- queryKey: `['kernel-score', lat(5d), lng(5d), w_rent|w_amenity|w_transit, school|null]`
- 같은 좌표/가중치/학교 재클릭 → 캐시 hit, 네트워크 호출 X
- 다른 좌표 클릭 시 이전 요청 abort (TanStack Query `signal` 자동 패스스루)

---

## 검증 결과

### 빌드/타입
- `npx tsc --noEmit` → **0 에러**
- `npm run build` → **0 에러**, 862KB JS / 105KB CSS
  (Phase 1b 대비 +9KB JS, +9KB CSS — 새 패널/레이어/훅/타입 추가분)
- `npm run dev` → vite 정상 부팅 (`http://127.0.0.1:5173/`)

### 백엔드 연동 (실측)
백엔드 8001 임시 포트로 검증 — Phase 2a 완료 코드 그대로:

#### 1. 명동 (37.5663, 126.9783) — 기본 가중치
```
HTTP 200 — 200ms
score: 68.89
breakdown: { rent: 3.8, amenity: 100.0, transit: 92.5 }
nearest: 7개 카테고리 (subway/convenience/cafe/hospital/mart/pharmacy/park)
radius_counts: convenience 207, cafe 735, hospital 398, park 5, mart 245, pharmacy 107
commute_min: null
```

#### 2. 명동 + school=동국대
```
HTTP 200
commute_min: 11
```

#### 3. weights 변경 (rent 80%) — 동일 좌표
```
HTTP 200
score: 22.29  (← 명동은 rent 점수가 낮으므로 큰 가중치 → 종합 낮음)
```

#### 4. 학교명 매칭 실패 (`존재하지않는대학`)
```
HTTP 200
commute_min: null  (오류 아님 — UI에서 "학교 매핑 정보 없음" mono label)
```

### UX 사양 (DESIGN_SYSTEM.md 매핑) 수동 확인 체크리스트
- [x] Coral 마커 12px diameter (`radius=6`), white stroke 1.5px
- [x] 패널 슬라이드 transform translateX 300ms (`--transition-slow`)
- [x] 헤더 "선택 지점" mono uppercase + 좌표 caption mono
- [x] Score 48px Data Display (`size="lg"`)
- [x] Breakdown bars 5-stop quintile (heatmap-1..5 토큰)
- [x] 가중치 슬라이더 — Near-Black thumb + Soft Stone inset track
- [x] 학교 셀렉트 — Select primitive 재사용
- [x] commute 표기 — 🎓 emoji + mono 분 숫자
- [x] Nearest list — emoji + uppercase mono "WALK 4MIN"
- [x] Radius grid 2x3 — 한국어 라벨 mono uppercase + tabular 숫자
- [x] 패널 닫기 ESC + 우상단 ×

---

## 통합 시나리오 회귀 (메인 → 동 클릭 → 상세 → 비교)

자동 빌드/타입 통과 + 코드 변경 영향도 분석:
- `HeatMap.tsx` 변경: 폴리곤 click 에 stopPropagation 추가 (only `click` 이벤트
  버블 차단). hover/tooltip/styling 무영향. 동 클릭 → DongPanel 정상 동작.
- `MainMap.tsx` 변경: 새 상태/핸들러 추가, 기존 핸들러 1줄 추가
  (`setKernelPoint(null)`). DongPanel/TransactionPanel/CompareSlugs/Favorites
  로직 무영향.
- 라우팅 (`/dong/:slug`, `/compare`) 변경 X.

브라우저 스모크 테스트 (반자동, 백엔드 8001 모드):
- [x] 메인 → 동 폴리곤 클릭: DongPanel 슬라이드 인 + 기존 metric 정상 표시
- [x] 메인 → 핀 (zoom 13+) 클릭: TransactionPanel 슬라이드 인
- [x] 메인 → 빈 지도 클릭: KernelScorePanel + Coral 마커 (★ 신규)
- [x] 동 폴리곤 → 빈 지도 → 다시 동: 패널 상호배제 (한 번에 1개만 OPEN)
- [x] 가중치 슬라이더 빠른 드래그: UI 즉시 반영, 멈춘 후 ~300ms 뒤 score 갱신
- [x] 학교 변경: 즉시 refetch, commute 라인 갱신
- [x] 다른 좌표 클릭: 마커 위치 + score 갱신, 이전 요청 abort
- [x] ESC: 열린 패널 닫힘
- [x] DongPanel "자세히 보기" → /dong/:slug 페이지 이동 정상
- [x] DongPanel "비교에 추가" → 토스트 + count 증가 정상

---

## 알려진 이슈

### 1. 메인 사이드바 weights vs 패널 weights 분리
사이드바 가중치(전체 히트맵용)와 패널 가중치(임의 지점 점수용)가 **독립**.
패널 OPEN 시 사이드바 값으로 seeding 하지만 이후 슬라이더 변경은 사이드바에
반영 안 됨. 의도된 동작 ("what if" 탐색용). 사용자 요구 시 양방향 sync 가능.

### 2. 5개 구 외 좌표는 rent fallback 47.8 plateau
Phase 2a handoff 명시. 강북·노원·은평 등 클릭 시 `breakdown.rent: 47.8` 동률
(점수 정보 부족). UI 에 "데이터 보강 중" 안내 미구현 — Phase 2a 미완 이슈와
동일.

### 3. commute_min 정밀도 (haversine + 22 km/h)
Phase 2a handoff 명시. 한강 도하/지하철 환승 무시. 학부 데모 OK.

### 4. 학교 셀렉트는 14개 키만
Phase 2a `SCHOOL_COORDS` 16개 중 alias 2쌍 (외대=한국외대, 시립대=서울시립대)
제외. 정식 명칭만 노출. 자동완성/검색 입력은 Phase 3 이후.

### 5. radius_counts 카테고리 추가 시 grid 깨짐
현재 6개 카테고리 hardcode (convenience/cafe/hospital/park/mart/pharmacy).
백엔드가 `restaurant` 등 새 카테고리 추가 시 `RADIUS_GRID_ORDER` 업데이트 필요.
타입은 `[k: string]: number` index signature 로 forward-compat 처리.

### 6. 가중치 슬라이더 visual fill 구현 방식
Slider primitive 의 `--ui-slider-fill` CSS var 패턴을 인라인 style 로 재현.
간단하므로 native `<input type="range">` 사용. 추후 Slider primitive 직접
재사용으로 리팩터 가능.

### 7. 마커는 단 하나만 표시 (next click overwrites)
의도된 동작. 비교용 다중 마커는 Phase 3 이후 (만약 요구된다면).

### 8. Polygon click + stopPropagation 부수 효과
HeatMap onEachFeature 의 click 에 `L.DomEvent.stopPropagation` 추가했으므로
이제 폴리곤 click 은 useMapEvents.click 으로 버블 안 됨. 다른 useMapEvents
컨슈머가 추가되면 동일하게 영향. 현재는 KernelScoreLayer 만 리스닝하므로 안전.

### 9. 모바일 반응형 스코프 외 (CLAUDE.md 명시)

### 10. KernelScorePanel ARIA
`role="complementary"` + `aria-label="커널 점수 패널"` + `aria-hidden`
+ ESC 닫기. 슬라이더는 `aria-label`. 그러나 score 의 라이브 업데이트는
`aria-live` 미적용 — 스크린리더 사용자가 점수 변화를 즉시 알기 어려움.
Phase 3 접근성 개선 시 검토.

---

## 다음 작업 (있다면)

- 사용자 피드백 수렴 후 Phase 2c (필요 시) — 가중치 sync 정책,
  반경 슬라이더 (300m/500m/1km), 학교 자동완성 입력 등.
- 디자인 리뷰 (`/design-review`) 권장 — 이번 변경분만 빠르게 훑어보기.
- 백엔드 서버 재시작 필수 — 현재 8000 포트 인스턴스가 Phase 1a/2a URL include
  이전에 시작되어 있으면 404. 사용자 액션:
  ```
  cd backend && source .venv/bin/activate
  python manage.py runserver 0.0.0.0:8000
  ```

---

## 산출물 경로

### 신규
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/hooks/useKernelScore.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/KernelScoreLayer.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/KernelScorePanel.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/KernelScorePanel.css`

### 수정
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/types/api.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/api.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/HeatMap.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MainMap.tsx`
