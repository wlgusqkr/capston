# Frontend Phase 5 cleanup — UX 모호성 해소 (LAYERS/WEIGHTS 겹침 + 좌우 거래 필터 중복)

사용자 지적 두 건 처리:

1. **LAYERS 라디오 ↔ WEIGHTS 슬라이더 의미 충돌** — LAYERS 라디오 폐기, MAP MODE 2-radio + WEIGHTS 프리셋 칩 4종으로 단순화.
2. **좌측 STUDIO MATCH ↔ 우측 floating TransactionFilters 중복** — 우측 floating 필터 폐기. 거래 핀 layer 가 STUDIO MATCH 필터를 단일 진실로 사용.

## 완료된 작업

### 1) MAP MODE 토글 신설 + LAYERS 폐기

- `MapModeToggle.tsx` (신규) — 2-radio: `매칭 (거래량 분포)` / `종합 점수 (가중치 기반)`. Soft Stone active fill + Ink outline (사이드바 어휘 일관). `min-height: 44px` (Phase 4.7 chip 정책 준수).
- `WeightSliders.tsx` (수정) — 슬라이더 위에 4 프리셋 칩 추가:
  - `균등` → 33/33/34
  - `전월세` → 100/0/0
  - `시설` → 0/100/0
  - `교통` → 0/0/100
  - 칩 active 표시는 현재 weights 와 정확 일치 시. 슬라이더 직접 조작도 OK (자연 해제).
  - DongExplore 의 `.explore__chip` 토큰 그대로 재사용.
- `MainMap.tsx` (수정):
  - `activeLayer: LayerKey` state → `mapMode: 'match' | 'score'` 단순화 (default `'match'`).
  - LAYERS 5-radio 섹션 → `MapModeToggle` 한 줄로 교체.
  - 매칭 모드일 때 `WeightSliders` 의 `disabled=true` + 안내 hint ("종합 점수 모드에서만 가중치 적용").
- `LayerSwitcher.tsx` + `.css` 삭제 (다른 import 사용처 0건 확인).

### 2) TransactionFilters (top-right floating) 폐기

- 우측 `<TransactionFilters>` JSX + `txDealType`/`txPeriod` state 제거.
- 거래 핀 layer 가 `matchFilters` (STUDIO MATCH) 를 단일 진실로 사용:
  - `matchFiltersToTxFilters(f)` 헬퍼 — `deal_types[0]` 단일이면 그대로, multi 면 `'all'` 로 backend 호출 (변경 없음).
  - `applyClientPinFilter(pins, f)` — bbox 응답 200건에 multi-select `deal_types` + `deposit_min/max` + `monthly_min/max` + `area_min/max` 클라 사이드 추가 필터.
  - **Backend 변경 0건** — bbox 엔드포인트는 deal_type single + from/to 만 받는다. limit 200 이라 클라 추가 필터 비용 무시 가능.
- 거래 핀 ON/OFF 토글 신규 — MAP MODE 섹션 안 `거래 핀 표시` 체크박스. **default OFF** (히트맵만으로 충분, 핀은 자세히 보고 싶을 때만 ON).
- `TransactionFilters.tsx` + `.css` 삭제 (`buildFilters`/`periodToFromDate` helper 도 같이 사라짐 — 다른 사용처 0건 확인).
- `.tx-zoom-hint` style 은 `MainMap.css` 의 `.main-map__zoom-hint` 로 이주.

### 3) HeatMap.tsx 정리

- `ScoreLayerKey` 보존 ('composite' | 'rent' | 'amenity' | 'transit') — pickScore 단위 테스트 + 잠재적 상세 화면 재사용. 호출측 (MainMap) 은 항상 `'composite'` 로 고정.
- `@deprecated LayerKey` 호환 alias 제거 (외부 사용처 0건).
- 코멘트에서 LayerSwitcher 표현 정리.

### 4) 회귀 가드 vitest

- `MapModeToggle.test.tsx` (신규, 5 tests) — 두 라디오 렌더 / mode prop 반영 / 다른 모드 클릭 onChange 호출 / 같은 모드 클릭 시 발화 안 함 (HTML 기본).
- `WeightSliders.test.tsx` (신규, 8 tests) — 4 프리셋 칩 렌더 / 각 칩 클릭 정확 weights 호출 / aria-pressed 매칭 / disabled 시 무반응.
- 기존 21 tests + 13 신규 = **34 tests all pass**.

## 산출

신규:
- `frontend/src/components/Map/MapModeToggle.tsx`
- `frontend/src/components/Map/MapModeToggle.css`
- `frontend/src/components/Map/MapModeToggle.test.tsx`
- `frontend/src/components/Map/WeightSliders.test.tsx`

수정:
- `frontend/src/components/Map/WeightSliders.tsx` — 프리셋 칩 추가
- `frontend/src/components/Map/WeightSliders.css` — `.weight-sliders__presets` 추가
- `frontend/src/components/Map/HeatMap.tsx` — LayerSwitcher 코멘트 정리, deprecated alias 제거
- `frontend/src/routes/MainMap.tsx` — LAYERS 폐기, MAP MODE + 거래 핀 토글, STUDIO MATCH → pin layer 통합
- `frontend/src/routes/MainMap.css` — LAYERS radio 스타일 제거, `.main-map__zoom-hint` 이주, compare-chip top 보정

삭제:
- `frontend/src/components/Map/LayerSwitcher.tsx`
- `frontend/src/components/Map/LayerSwitcher.css`
- `frontend/src/components/Map/TransactionFilters.tsx`
- `frontend/src/components/Map/TransactionFilters.css`

보존 확인 (사용 중):
- `frontend/src/components/Map/TransactionPanel.tsx` + `.css` — 핀 클릭 시 슬라이드 패널, 그대로 사용 중.
- `frontend/src/components/Map/TransactionPinLayer.tsx` + `.css` — 핀 렌더링, props 변경 없음 (filtered pins 는 MainMap 에서 미리 적용).

## 검증

- `npx tsc --noEmit` — clean (출력 없음, 에러 0).
- `npm run test` — **34/34 green** (Tests 34 passed).
- `npm run build` — 본 PR 의 변경 부분에는 TS 에러 없음. 단, **프로젝트 전반에 미리 존재하던 Recharts type 에러 5건** 확인됨 (RealEstateSection.tsx, DongExplore.tsx 의 `<Tooltip formatter>` 타입). 본 작업 범위 외 — git stash 후 main 에서도 동일 발생.

수동 검증 가이드:
1. `npm run dev` → http://localhost:5173/
2. 사이드바 좌측 위에서 아래로 STUDIO MATCH / MAP MODE / SCORE WEIGHTS 3블록 확인.
3. **MAP MODE = 매칭** (default) 상태에서 WEIGHTS 영역 회색 처리 + hint 메시지 노출 확인.
4. **MAP MODE = 종합 점수** 클릭 → WEIGHTS 활성화 + 헤더 Coral dot 사라짐 + 히트맵 색이 composite 점수로 즉시 변환.
5. WEIGHTS 프리셋 `전월세` 칩 클릭 → 슬라이더 100/0/0 즉시 점프, 히트맵 단일 축 시각화.
6. 슬라이더 직접 드래그 → 칩 active 자동 해제.
7. **거래 핀 표시** 토글 ON → STUDIO MATCH 필터를 그대로 따르는 핀 노출 (예: `villa,dagagu,officetel` × 보증금 0~5,000만 × 월세 30~80만 × 면적 15~40㎡).
8. STUDIO MATCH 의 보증금/월세 슬라이더 조작 → 핀이 클라 사이드 즉시 재필터링.
9. 우측 상단에 더 이상 floating `거래 필터` 패널 안 보임 (CompareChip 만 basket ≥ 1 일 때 노출).

## API hooks added / modified

- (변경 없음) — `useTransactions` 의 `filters: TransactionFilters` 시그니처 그대로. MainMap 에서 `matchFilters` → `txFilters` 변환만 추가.

## Design system gaps (design-system-keeper 재량)

- `tokens.css` 에 `--tx-filter-min-w: 220px` 토큰이 남아있음 (구 `TransactionFilters.css` 에서만 사용). 본 PR 범위 외 — 토큰 정리는 design-system-keeper 위임.

## Known issues / 다음 작업자에게 전달

- **Recharts type 에러 5건 (사전 존재)** — `RealEstateSection.tsx:190, 254` / `DongExplore.tsx:429, 509, 553` 의 `<Tooltip formatter={...}>` prop 타입. 본 PR 무관, main 에서도 동일 재현. 별도 PR 권장.
- `nearUniversityOnly` state 는 보존되지만 현재 히트맵 필터링 로직에 연결 안 된 상태 (Phase 5 plan 단계 그대로). `MatchFilterPanel` chip 토글만 동작하고 실제 매칭 카운트에는 미반영 — 별도 작업 필요.
- 거래 핀 backend bbox 엔드포인트는 `deposit/monthly/area` 미지원 — 현재 클라 사이드 필터링 (limit 200 이라 OK). 더 정밀하게 필터링하려면 backend 확장 PR 필요. 우선순위 낮음 (히트맵이 분포 시각화의 주역).
- WEIGHTS 슬라이더가 `rebalanceWeights` 로 합 100 보장하지만, 칩 클릭 → 100/0/0 직후 어느 슬라이더든 1만 움직여도 다른 두 축이 다시 분배되는 게 의도. 사용자가 `전월세 100` 칩 누른 직후 `시설` 슬라이더로 5 만큼만 키워도 `전월세 95 / 시설 5` 가 됨. 칩 active 자동 해제. 의도 동작 — 회귀 케이스 발생 시 `rebalanceWeights` 단위 테스트 확인.
