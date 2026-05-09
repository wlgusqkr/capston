# Phase 5 Frontend — 메인 지도 STUDIO MATCH 필터

작성일: 2026-05-09
상태: 구현 완료, 검수 대기 (commit 미생성)
선행: `docs/plan/main-map-studio-filter.md`

## Routes / 화면 변화

- `/` (메인 지도) — 좌측 280px fixed 사이드바 + 우측 fluid 지도로 layout 전환.
  - 사이드바 3 섹션: STUDIO MATCH (top) / LAYERS (mid) / WEIGHTS (bottom),
    Hairline divider 로 구분.
  - LAYERS 5 옵션 라디오: 매칭 / 종합 / 전월세 / 시설 / 교통. default `매칭`.
  - 매칭 모드일 때 WEIGHTS sliders + CTA 회색 disabled (hover title 툴팁
    "매칭 모드에서는 가중치 미사용").
  - 매칭 모드에서 동 클릭 → 동 패널 상단에 MatchKpiCard (score 카드 위).
- `/dong/:slug/explore` — Phase 5 에서 변화 없음. 단 메인 지도 MatchKpiCard 의
  "더 깊게 탐색 →" 링크가 현재 필터를 query string 으로 그대로 전달.

## Files added (신규)

- `frontend/vitest.config.ts` — vitest jsdom 환경 + alias 미러.
- `frontend/src/test/setup.ts` — jest-dom matchers + ResizeObserver/matchMedia stub + RTL cleanup.
- `frontend/src/lib/colors.test.ts` — `scoreToHeatmapBucket` 5분위 boundary smoke test (8 cases).
- `frontend/src/components/Map/HeatMap.test.tsx` — Phase 4.7 fix 회귀 가드 (adm_cd2 ↔ code 매칭, 3 cases).
- `frontend/src/hooks/useStudioMatchFilters.ts` — Studio Match URL state hook + helpers (replace=true).
- `frontend/src/hooks/useStudioMatchFilters.test.ts` — pure parsing 검증 (10 cases).
- `frontend/src/hooks/useDongMatchCounts.ts` — React Query + 200ms debounce.
- `frontend/src/hooks/useDongMatchDetail.ts` — React Query (slug-gated, no debounce).
- `frontend/src/components/Map/MatchFilterPanel.tsx` + `.css` — 사이드바 신규 패널.
- `frontend/src/components/Map/MatchKpiCard.tsx` + `.css` — 동 패널 매칭 KPI 카드.
- `frontend/src/components/Map/MatchModeBadge.tsx` + `.css` — Legend 좌측 Coral mono 배지.

## Files modified

- `frontend/package.json` — vitest/@testing-library/jsdom devDeps + `test` / `test:watch` scripts.
- `frontend/tsconfig.app.json` — `types: ["vitest/globals", "@testing-library/jest-dom"]`.
- `frontend/src/components/Map/HeatMap.tsx` — `mode: 'score' | 'match'` prop +
  matchCounts 분기, fillOpacity 분기 (score 0.7 / match 0.85),
  layerKey 메모에 mode 포함, score 모드 동작 100% 보존.
  `pickScore` / `indexDongsByCode` named export 로 회귀 테스트 가능.
  `LayerKey` 는 deprecated alias 로 유지, 새 `ScoreLayerKey` 가 score 축 4종 narrow.
- `frontend/src/components/Map/Legend.tsx` — `mode` prop + match 라벨 분기 + MatchModeBadge inline.
- `frontend/src/components/Map/Legend.css` — 라벨 200ms cross-fade animation (key 리마운트).
- `frontend/src/components/Map/LayerSwitcher.tsx` — LAYERS 5종 ('match' default 첫 옵션).
- `frontend/src/components/Map/WeightSliders.tsx` + `.css` — `disabled` / `disabledHint` prop.
- `frontend/src/components/Map/DongPanel.tsx` — `matchKpi?: ReactNode` prop. score 카드 위에 렌더.
- `frontend/src/routes/MainMap.tsx` — fixed sidebar layout 으로 rework.
  rentCap / rentCapEnabled / rentCapEnabled state 6개 제거, CriteriaPanel +
  LayerSwitcher floating chrome 제거, MatchFilterPanel 통합. `nearUniversityOnly`
  는 STUDIO MATCH 패널 chip 으로 보존.
- `frontend/src/routes/MainMap.css` — 사이드바 grid (320px + fluid) layout.

## API hooks added

- `useStudioMatchFilters()` → `{ filters, patch, reset }`. URL 쿼리스트링과 동기.
  patch 는 `replace: true` (slider drag 중 history 폭주 방지, eng-review #11).
- `useDongMatchCounts(filters, enabled?)` → `MatchCountsResponse`.
  내부 200ms debounce + `placeholderData: prev` (필터 변경 중 깜빡임 ↓).
- `useDongMatchDetail(slug, filters)` → `MatchDetailResponse`. slug null/undefined → disabled.

## 검증 결과

### Typecheck
```
npx tsc -b --noEmit
```
본 작업 관련 에러 0개. (기존 Recharts Tooltip formatter 타입 에러 5개 — pre-existing,
이번 작업과 무관.)

### Tests
```
npm run test
3 file · 21 tests passed.
```
- `colors.test.ts` (8): scoreToHeatmapBucket 0/19.99/20/40/60/80/100 boundary + scoreToHeatmapColor.
- `HeatMap.test.tsx` (3): adm_cd2 ↔ code 인덱싱 회귀 가드, slug 키 금지, pickScore axis.
- `useStudioMatchFilters.test.ts` (10): URL parse / write / dirty 검증.

### Vite build
```
npx vite build --mode development
✓ 995 modules transformed.
✓ built in 1.68s
```
모듈 해석 OK.

### Dev server boot
```
npx vite
VITE v5.4.21 ready in 273 ms
GET / → index.html serves
```

### Manual verification 가이드 (사용자가 브라우저로 검증할 항목)

1. 메인 지도 진입 → STUDIO MATCH 패널 보임 + 매칭 모드 active (Coral dot 노출)
   + 히트맵 색칠 (5단 그린).
2. STUDIO MATCH 보증금/월세/면적 슬라이더 drag → 200ms 후 결과 카운트 갱신
   + 히트맵 색 transition.
3. LAYERS 라디오 "종합" 클릭 → WEIGHTS 활성, Legend 라벨 "낮음 ← 높음" 으로 전환,
   MatchModeBadge 사라짐, 히트맵 score 색.
4. 동 클릭 (매칭 모드) → 우측 동 패널 슬라이드인. 상단 MatchKpiCard,
   그 아래 score 카드.
5. MatchKpiCard "이 동을 더 깊게 탐색 →" 클릭 → `/dong/<slug>/explore?<필터>`
   로 이동, 필터 query string 그대로 보존.
6. URL 새로고침 (e.g. `/?monthly_max=60`) → 필터 복원.

## Design system gaps (design-system-keeper 에게 전달)

없음. 모든 새 컴포넌트가 기존 토큰 (`--color-coral`, `--color-soft-stone`,
`--color-hairline`, `--color-text-subtle`, `--font-mono-label-*`,
`--font-feature-heading-*`) + Phase 4.7 design-review 산출 (`.explore__chip` /
`.explore__radio` / `.explore__range-inputs` 18px Ink thumb) 을 그대로 재사용.

향후 정리(별도 PR) 권장:
- `.explore__chip` → `.chip` 베이스로 추출 (DongExplore + MatchFilterPanel 공유).
- `.explore__range-inputs input[type=range]` → `.range-slider` generic 베이스.

## Known issues / 의도적 미완

- **Pre-existing Recharts 타입 에러 5건** (RealEstateSection, DongExplore) — 이번
  작업 범위 밖. 별도 이슈로 처리 권장.
- **CriteriaPanel.tsx / FilterControls.tsx 파일 자체는 보존** — MainMap 에서
  import 끊었고 다른 곳에서도 사용 X. 변경 표면 최소화 위해 파일 삭제는
  미실시 (별도 cleanup PR 에서 함께).
- **panelReducer.ts 의 `criteriaOpen` / `coachVisible` / `toggle_criteria` /
  `dismiss_coach` 액션** — MainMap 이 더 이상 사용 안 함이지만 reducer 자체는
  type clean. 별도 cleanup 으로 정리 권장.
- **대학교 chip은 single boolean toggle** — plan §5.10 #13 의 옵션 중 minimal
  (12개 대학 multi-select chip group 까지는 안 갔음). 시간/UX 트레이드오프.
- **MatchFilterPanel 의 결과 카운트 옆 "M개 동에서"** — 0건 케이스 메시지가
  단순 `matchedDongs=0` 일 때 그냥 "0개 동에서" 표시. plan §5.5 의 "조건에 맞는
  매물이 없어요 — 범위를 넓혀보세요" 같은 풀 EMPTY 메시지는 미구현 (Step F
  핵심 동작에 우선). 후속 polish 에서 보강.
- **commit 은 사용자 검수 대기 — 미생성.**

## 참고 파일 경로

- Plan: `/Users/bagjihyeon/Desktop/School/capston/docs/plan/main-map-studio-filter.md`
- Backend match.py: `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/match.py`
- Wireframe ASCII: plan §5.1
