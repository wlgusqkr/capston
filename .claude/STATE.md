# 자취맵 -- 프로젝트 상태

마지막 업데이트: 2026-05-13

## Project Status

- **단계**: Phase 3 완료 — 대시보드 사용자 데이터 위젯 (인기 차트 / 자취생 리뷰)
- **활성 모드**: 프론트엔드 + 디자인 집중. 백엔드/데이터는 휴면.
- **데이터**: 426개 행정동 실데이터 적재 완료 (RDS ETL).
- **CSS 방식**: Tailwind CSS v4 (globals.css 단일 파일). 컴포넌트별 CSS 파일 없음.

## Design System

### 토큰 (globals.css @theme)
시맨틱 역할명 기반 토큰. hex 값 변경 시 토큰명 충돌 없음.

- **Core**: --color-primary (#059669), --color-primary-hover (#047857), --color-primary-soft (#ECFDF5)
- **Secondary**: --color-secondary (#4C4C4C), --color-secondary-dark (#003c33)
- **Surface**: --color-bg (#fff), --color-surface (#fff), --color-surface-alt (#F4F4F5)
- **Text**: --color-text (#212121), --color-text-muted (#75758a), --color-text-subtle (#93939f)
- **Border**: --color-border (#e5e7eb), --color-divider (#d9d9dd)
- **Accent**: --color-accent (#ff7759), --color-link (#1863dc)
- **Status/MetricBar**: danger (#FB6666), warning (#FFD82A), warning-deep (#F59E0B, **NEW**), success (#059669), info (#5570F1) + soft + metric-4/5
- **Focus**: --color-focus-ring (primary 40%)
- **히트맵 종합**: 5분위 (불변), **지하철**: 1~9호선 (불변)
- **Category (NEW)**: realestate (#F59E0B), transport (#3B82F6), amenity (#10B981), safety (#EF4444), population (#8B5CF6), environment (#14B8A6) -- 대시보드 섹션 헤더/아이콘용
- **히트맵 레이어 (NEW)**: rent/activity/youth/studio/safety 각 5단계 팔레트 (--color-hm-{layer}-{1..5})
- **타이포**: Pretendard only (--font-sans, --font-mono 모두 Pretendard로 오버라이드). 12단계 + Data Display
- **스페이싱**: 8px base (Tailwind 기본 스케일과 동일)
- **라디우스**: xs(4)/sm,md(8)/card(16)/hero(22)/xl(30)/pill(32)/full(9999)

### CSS 구조
- `globals.css` 단일 파일: @theme(토큰) + @layer base(리셋) + @utility(tabular, mono-label) + @keyframes(9개) + Leaflet 오버라이드 + DivIcon 스타일
- 컴포넌트별 .css 파일 0개. 모든 스타일은 JSX className에 Tailwind 유틸리티로 인라인.
- 예외: Recharts tooltip/legend는 inline style 필수 (라이브러리 API 제약)
- 예외: Leaflet DivIcon/tooltip은 string HTML로 렌더링되어 globals.css에 CSS 클래스 유지

### Tailwind 유틸리티 예시
`bg-primary`, `text-text-muted`, `border-divider`, `rounded-card`, `shadow-floating`, `text-caption`, `text-mono-label`, `bg-cat-realestate`, `bg-hm-rent-3`

### 토큰 추가 이력
- **Disabled**: --color-disabled (#A1A1AA) -- Button disabled 상태용
- **Category colors**: 6종 -- 대시보드 카테고리 섹션 헤더/아이콘
- **Heatmap layer palettes**: 5종 x 5단계 -- 레이어별 히트맵 팔레트
- **shimmer-border keyframe** -- AI 검색창 등 shimmer 효과용
- **--font-sans, --font-mono**: Tailwind 내장 유틸리티를 Pretendard로 오버라이드
- **--color-warning-deep (#F59E0B, NEW)**: 차트용 '주의' 시그널. warning(#FFD82A)보다 진하고 danger(#FB6666)보다 약함. 음주/뺑소니 비율 같은 부정 시그널용. CHART_COLORS.warning(#FFD82A) / CHART_COLORS.warningDeep(#F59E0B) 키로 JS 미러 노출.

### JS 미러 (colors.ts)
- HEATMAP_COLORS, HEATMAP_COLORS_ORDERED, scoreToHeatmapBucket, scoreToHeatmapColor
- MAP_POLYGON_STROKE, MAP_PIN
- CHART_COLORS (villa/dagagu/danok/officetel/apt/bar/axis/grid + **warning/warningDeep NEW**)
- CATEGORY_COLORS, HEATMAP_LAYER_COLORS, scoreToLayerColor

### 프리미티브 (ui/)
Button, Card, Badge, Chip, Score, MetricBar, Input, Select, Slider, Modal, Tooltip, Gauge -- 12개 완성.

Badge 타이포 정책: sm/md 모두 `text-caption`(14px, Pretendard, 0 tracking, normal case). 기존 sm의 `text-mono-label`(13px uppercase 0.26px) 은 mono 잔재라 제거. uppercase/tracking은 `variant="mono"` 에서만 유지.

### 쇼케이스
`/design-system` 라우트. 모든 토큰 + 프리미티브 시각 확인. (Gauge 아직 쇼케이스 미반영)

## Frontend

### 라우트 (10개)
| 경로 | 컴포넌트 | 상태 |
|---|---|---|
| `/` | MainMap | 완성 |
| `/dashboard` | Dashboard (lazy) | Phase 3 위젯 (A~G 섹션) |
| `/dong/:slug` | DongDetail | 완성 |
| `/dong/:slug/explore` | DongExplore | 완성 |
| `/compare` | Compare | 완성 |
| `/login` | Login | 완성 |
| `/register` | Register | 완성 |
| `/mypage` | MyPage | 완성 |
| `/design-system` | DesignSystem | 완성 (dev용) |
| `*` | NotFound | 완성 |

### 신규 컴포넌트 (Phase 0)
- **AiPanelContext** (`contexts/AiPanelContext.tsx`) — AI 사이드 패널 열림/닫힘 전역 상태
- **AiSidePanel** (`components/Layout/AiSidePanel.tsx`) — 고정 우측 슬라이드인 AI 채팅 셸 (mock 응답)
- **DongSelector** (`components/Dashboard/DongSelector.tsx`) — 426동 검색 콤보박스, 구별 그룹핑
- **DashboardHeader** (`components/Dashboard/DashboardHeader.tsx`) — 동 셀렉터 + 선택된 동 + 요약 텍스트
- **Dashboard** (`routes/Dashboard.tsx`) — URL 기반 동 선택 (?dong=), Phase 1 위젯 조립

### 신규 컴포넌트 (Phase 1)
- **KpiCard** (`components/Dashboard/KpiCard.tsx`) — 카운트업 애니메이션 + 미니차트 슬롯
- **KpiRow** (`components/Dashboard/KpiRow.tsx`) — KPI 2행 그리드. Row 1: 4칸(환산월세/보증금/거래건수/안전게이지). Row 2: 자취촌 지수 게이지(col-span-2) + 계약 활발도(col-span-2). 2행은 `useDongDerivedIndices`(SPEC §4.5) 의존.
- **DashboardMiniMap** (`components/Dashboard/DashboardMiniMap.tsx`) — Leaflet 미니맵 + 히트맵 레이어 토글 6종 + 컬러칩 범례 + 확장 버튼
- **RealEstateSection** (`components/Dashboard/sections/RealEstateSection.tsx`) — 4개 Recharts 차트 (라인/도넛/산점도/바)
- **AmenitySection** (`components/Dashboard/sections/AmenitySection.tsx`) — 카테고리별 테이블 + 자취생 필수시설 칩 그리드 + **대형 공원 카드 리스트(TOP 6, id dedupe, area_m2 desc, ha/㎡ 포맷, 도보 분 환산)** + **도서관 placeholder (opacity-60)**. props에 `parks?: DongParksResponse` 추가.
- **TransitSection** (`components/Dashboard/sections/TransitSection.tsx`) — 지하철 TOP3 + 버스 통계 + placeholder 위젯

### 신규 컴포넌트 (Phase 2)
- **PopulationSection** (`components/Dashboard/sections/PopulationSection.tsx`) — 남녀 비율 도넛 + 인구 추이 AreaChart + 청년 비율 카드 (구 단위, POP_YOUTH_19_34÷POP_TOTAL_YOUTH_BASE 계산) + **평균 연령 카드 (B1: 전체/남/여 칩)** + **고령 인구 비율 도넛 (B2: POP_ELDERLY_RATIO)** + 1인 가구 추정 도넛
- **SafetyEconomySection** (`components/Dashboard/sections/SafetyEconomySection.tsx`) — 안전 등급 6분야 레이더 (TRAFFIC/CRIME/FIRE/DISEASE/LIFE/SUICIDE, 종합 평균 텍스트) + 교통사고 통계 (ACC_TOTAL_COUNT/INJURY/DRUNK/HITRUN, 비율 계산) + **교통사고 추이 LineChart (Phase 4, ACC_TOTAL_COUNT 시계열, 구 + 서울 평균, safety 색)** + **화재 발생 추이 LineChart (Phase 4, FIRE_COUNT 시계열, warningDeep 색)** + **교통문화지수 레이더 (B3)** + GRDP 총액+1인당 + 녹지비율/1인당녹지/화재 MetricCard. 모든 카드에 metric date 푸터. props에 `series?: GuMetricSeriesResponse` 추가.
- **TransitSection** (`components/Dashboard/sections/TransitSection.tsx`) — 지하철 TOP3 + 버스 통계 + **1인당 차량 등록 KPI (B4: VEHICLE_REGISTERED÷POP_RESIDENT, 보행 친화도 시그널)** + **지하철 시간대 혼잡도 LineChart (평일/토/일 3시리즈, transport·warningDeep·warning 색, ticks 0/6/12/18/23, connectNulls)** + **버스 시간대 혼잡도 LineChart (평일/주말, stop_count=0이면 빈 상태)** + **동 성격 추정 카드 (label/reason + 4개 패턴 막대: 출근/낮/퇴근/주말). 라벨별 톤: 주거 중심→primary-soft, 상업·업무 중심→warning-soft, 유동인구 많음→info-soft, null→primary-soft dimmed)**
- **RealEstateSection** (`components/Dashboard/sections/RealEstateSection.tsx`) — **지가 변동률 (B5: LAND_PRICE_CHANGE_RATE)** + **주택 수 (B6: HOUSING_COUNT)** KPI 행 추가, 그 아래 기존 4개 Recharts 차트
- **useDongPopulation** (`hooks/useDongs.ts`) — /api/dongs/:slug/population 훅 (staleTime 10min)
- **useDongGuMetrics** (`hooks/useDongs.ts`) — /api/dongs/:slug/gu-metrics 훅 (staleTime 5min)
- **useDongParks** (`hooks/useDongs.ts`) — /api/dongs/:slug/parks 훅 (staleTime 10min). Dashboard.tsx에서 호출 → AmenitySection `parks` prop.
- **useDongTransitCongestion** (`hooks/useDongs.ts`) — /api/dongs/:slug/transit-congestion 훅 (staleTime 5min, 백엔드 캐시와 동일). Dashboard.tsx에서 호출 → TransitSection `congestion` prop.
- **CongestionPoint, TransitCongestionResponse** (`types/api.ts`) — Section C 시간대 혼잡도 응답 타입. subway.by_day(평일/토/일), bus.by_pattern(평일/주말), personality(label|null + reason + 4 scores).
- **DongPark, DongParksResponse** (`types/api.ts`) — 공원 API 응답 타입 (id/name/category/area_m2/lat/lng/distance_m). RDS 중복 행 → 프론트 dedupe.
- **useDongGuMetricsSeries** (`hooks/useDongs.ts`, **Phase 4**) — /api/dongs/:slug/gu-metrics/series 훅. `(slug, codes, years?)` 인자. codes 정렬 후 queryKey에 join (백엔드 캐시 키와 일치). staleTime 5min. enabled=codes.length>0. Dashboard에서 ACC_TOTAL_COUNT/FIRE_COUNT 2개 코드로 10년치 시계열 페치.
- **DongPopulationResponse, DongGuMetricsResponse, GuMetricValue.date, SeoulAvgValue** (`types/api.ts`) — Phase 2 API 타입. gu-metrics 응답이 35종으로 확장되어 metric_code별 date 필드 추가, top-level date는 optional로 deprecated.
- **GuMetricSeriesPoint, GuMetricSeries, GuMetricSeriesResponse** (`types/api.ts`, **Phase 4**) — gu-metrics/series 응답 타입. series + seoul_series 두 맵 (code→points). points는 date ASC, value nullable.

### 신규 컴포넌트 (Phase 3)
- **PopularitySection** (`components/Dashboard/sections/PopularitySection.tsx`) — 서울 자취 TOP 10 리스트 (현재 동 하이라이트) + 학교별 TOP 5 (KERNEL_SCHOOL_OPTIONS Select, 현재는 종합 점수 폴백) + 인근 비슷한 동 카드 3장 (similarity_pct + 비교하기 링크). 동 클릭 → handleDongChange (대시보드 내 전환).
- **ReviewDashboardSection** (`components/Dashboard/sections/ReviewDashboardSection.tsx`) — 평균 별점 (avg_rating 카운트업 + 별 5개) + 리뷰 수 + 대표 리뷰 가로 스크롤 카드 (line-clamp-2) + 리뷰 작성 CTA (Detail 페이지로 이동).
- Dashboard.tsx: LATER_SECTIONS / PlaceholderSection / CategoryKey import 제거. Section F·G 추가 (둘 다 environment 색).

### KPI 행 확장 (2026-05-13 — SPEC §4.5 자취촌 지수 + 계약 활발도)
- **KpiRow** 2행 구조로 확장 (`grid-cols-4` 두 번, gap-4). Row 1 = 기존 4 KPI(환산월세/보증금/거래/안전 게이지) 그대로. Row 2 = 자취촌 지수 게이지 카드(col-span-2) + 계약 활발도 카드(col-span-2).
  - **자취촌 지수**: 좌측 `Gauge size=sm`(score 0~100) + 우측 메타. `상위 {100-percentile}%` Badge(primary-soft) + `{rank}/{total_dongs}위` tabular. breakdown 1줄(`비아파트 X% · 소형 Y% · 월세 활발 Z%`). 보조 텍스트 "비아파트·소형·월세 가중평균". score=null → "데이터 부족" 폴백.
  - **계약 활발도**: 우측 상단 `상위 {100-percentile}%` Badge. 큰 숫자 `deals_per_1000.toFixed(1)` + "회/천명" 단위. 부가 텍스트 "최근 12개월 거래 N건 · 인구 N명". population=null → "데이터 부족" 폴백.
- **types/api.ts**: `StudioIndexBreakdown` / `StudioIndex` / `ActivityIndex` / `DongDerivedIndicesResponse` 4개 신설.
- **lib/api.ts**: `getDongDerivedIndices(slug)` 추가.
- **hooks/useDongs.ts**: `useDongDerivedIndices(slug)` 추가. staleTime 30분(1_800_000ms) — 백엔드가 일일 갱신.
- **Dashboard.tsx**: 훅 호출 후 `derived` prop으로 KpiRow에 전달. KPI 영역 세로 길이 증가(2행).
- 신림동 score ~64 / rank 21위, 필동 score ~45 / rank 152위, 역삼1동 활발도 deals_per_1000 큰 값 표시되도록 라이브 데이터 그대로 매핑.

### 알려진 이슈 (KPI 행 확장 추가분)
- KPI 보조 카드(자취촌/활발도)의 skeleton 펄스 트리거가 `!derived`(undefined) 기준. detailLoading과 분리되어 두 영역이 동시에 끝나지 않으면 시각적으로 살짝 튐. 무해.

### TopNav 변경
- 네비 탭 (맵/대시보드) NavLink 추가 (pill 스타일, active 상태 bg-primary-soft)
- 컨텍스트 타이틀 (동네 비교, 동 이름 등) 탭 우측 middot 구분
- AI 검색 버튼 (shimmer-border keyframe 활용, AiPanelContext.open 호출)
- 인증 페이지(login/register)에서는 탭/AI 버튼 숨김

### App.tsx 변경
- AiPanelProvider 래핑, AppContent 내부 컴포넌트 분리 (AI 패널 열림 시 mr-[400px] 레이아웃 시프트)
- Dashboard lazy import + Suspense 래핑
- AiSidePanel 글로벌 배치 (AppContent 바깥, AiPanelProvider 안)

### 빌드
- CSS: 73KB (18KB gz)
- JS main: 985KB (293KB gz), Dashboard chunk: 138KB (33.1KB gz) — KPI 2행(자취촌 지수 게이지 + 계약 활발도) 추가 +4KB
- tsc + vite build 통과

### Phase 5 정정 (2026-05-13) — SeoulMetric raw → 25구 평균 / 순위
대시보드 모든 동·구 비교 라벨을 SeoulMetric raw(서울 합계/대표값)에서 신규 응답 키 `gu_avg`/`gu_avg_series`/`rank_in_seoul`/`current_rank` 기반으로 교체. 합계 raw와의 비교는 "구의 ~33배"인 케이스(예: 중구 824건 vs SeoulMetric 27000건)가 많아 의미가 약했음.
- **types/api.ts**: `GuMetricValue`에 `rank_in_seoul`/`gu_count`/`gu_avg` 추가, `GuMetricSeries`에 `current_rank` 추가, `GuMetricSeriesResponse`에 `gu_avg_series` 추가. 기존 `seoul_avg`/`seoul_series` 키는 타입 유지하되 대시보드 코드에서 참조 제거.
- **SafetyEconomySection.tsx**: 안전 레이더·교통문화 레이더의 비교 시리즈 dataKey `서울` → `평균`, 라벨 `서울 평균` → `25구 평균`. 종합 텍스트 "서울 X" → "25구 평균 X". 교통사고·화재 추이 라인 차트의 비교선을 `seoul_series` → `gu_avg_series`로 교체, dataKey `seoul` → `guAvg`, 우상단에 `N위 / 25구` Badge 추가. MetricCard prop `seoulValue` → `guAvg` + `rank` 추가. 녹지/화재/GRDP/교통문화지수에 순위 노출.
- **PopulationSection.tsx**: 청년 비율(19~34, 19~39)·평균 연령·고령 비율 비교를 SeoulMetric raw 기반 비율 계산(`seoul_avg.X / seoul_avg.Y`)에서 `gu_avg.X / gu_avg.Y`로 교체. 모든 카드에 `25구 중 N위` 노출.
- **RealEstateSection.tsx**: 지가 변동률·주택 수 KPI 비교를 `gu_avg`로 교체, 순위 노출.
- **TransitSection.tsx**: 1인당 차량 등록 비교를 `gu_avg` 1인당으로 교체. 순위는 raw 차량 등록 절대량 기준이라 "차량 등록 총량 기준" 주석 추가.

### 알려진 이슈
- weights가 글로벌 Context로 미승격
- 모바일 반응형 미구현 (데스크톱 전용)
- DongSelector가 useDongScores(DEFAULT_WEIGHTS)로 목록 페치 (실 weights 무관)
- 미니맵 히트맵 레이어: composite 외 레이어(rent/activity/youth/studio/safety)는 per-layer score API 미구현으로 composite 점수 폴백

### Phase 1 미구현 API 필요 목록
| 위젯 | 필요 데이터 | 비고 |
|---|---|---|
| KPI 인구/가구 수 | `adong_population` | **구현 완료** (`/api/dongs/<slug>/population`) |
| 구 지표 (안전/환경 등) | `gu_metric` + `seoul_metric` | **구현 완료** (`/api/dongs/<slug>/gu-metrics`) |
| KPI 자취촌 지수 | 파생 지표 | **구현 완료** (`/api/dongs/<slug>/derived-indices`, KpiRow Row 2 연동) |
| 섹션 C 시간대 혼잡도 | `subway_congestion`, `bus_congestion` | **구현 완료** (`/api/dongs/<slug>/transit-congestion`) |
| 섹션 C 동 성격 추정 | 혼잡도 패턴 분석 | **구현 완료** (위 endpoint 응답 `personality` 필드) |
| 공원 | `park`, `park_adong` | **구현 완료** (`/api/dongs/<slug>/parks`) |
| 도서관 | `library`, `library_hours` | DB 모델 미존재 — placeholder 유지 |
| 미니맵 per-layer scores | rent/activity/youth/studio/safety 개별 점수 | DongScore 확장 또는 신규 endpoint |

## Backend (휴면)

Django + DRF + GeoDjango. 9개 앱, 28개 모델, 24개 API 엔드포인트.

### 대시보드 §4.5 파생 지표 엔드포인트 (2026-05-13)
- `GET /api/dongs/<slug>/derived-indices` — 자취촌 지수 + 계약 활발도. 426동 통째 계산 후 dict 캐시.
  - **자취촌 지수**: SPEC §4.5 공식 그대로 `0.5×비아파트 비율 + 0.3×≤25㎡ 비율 + 0.2×월세 계약 건수 정규화(서울 동별 min-max)` × 100. 입력은 `rent_deal` 최근 365일.
    - **비아파트 비율** = `housing_type != '아파트'` 카운트 / 전체. housing_type 분포: 아파트 246K, 다세대 122K, 오피스텔 91K, 다가구 91K, 단독 55K, 연립 9K, 연립다세대 762 (지난 12개월 614K행 기준).
    - **소형 면적 비율** = `area_m2 <= 25` 카운트 / 전체.
    - **월세 계약 건수 정규화** = `monthly_rent > 0` 카운트의 426동 min-max. 전세(monthly_rent=0)는 분자 제외 (SPEC "월세 계약 건수").
    - 0~100 score → 동률은 같은 rank, percentile = round(100 - (rank-1)/N × 100).
  - **계약 활발도**: 12개월 전체 계약 건수 / `AdongPopulation` 최신 인구 × 1000. 인구 0/null이면 score/rank/percentile 모두 null.
  - 캐시 키 `derived_indices_all_dongs:v1:{YYYY-MM-DD}`, TTL 5시간. 매일 자동 갱신.
  - 응답시간: **cold 1.9~2.2s** (RentDeal 3개 conditional Count + AdongPopulation DISTINCT ON, 단일 요청만 계산), **warm 7~30ms** (Redis dict 조회).
  - 라이브 검증: 신림동 score 63.78 rank 21/426 (백분위 95) — 비아파트 82%, 소형 67%로 자취촌 명확. 역삼1동 score 58.59 rank 50 (오피스텔 많아 비아파트 82%, 소형 38%). 합정동 score 55.81 rank 66 (비아파트 95%). 필동 score 45.48 rank 152 (거래량 적어 monthly_norm=0.04).
  - view 파일: `apps/realestate/views.py` (`DongDerivedIndicesView` + `_compute_all_dongs_derived` 함수). URL은 `apps/neighborhoods/urls.py`의 dong-scoped 패턴에 추가.
  - 주의: RentDeal.dong은 Dong.id(int) FK이지만 AdongPopulation.dong은 `to_field='code'`라 dong_id에 code 문자열이 들어감. `_compute_all_dongs_derived`에서 `code_to_dong` 매핑으로 정렬.
  - 스키마 변경 없음. `python manage.py check` / `makemigrations --dry-run` PASS.

### 대시보드 §4.4 섹션 C / §4.5 추가 엔드포인트 (2026-05-13)
- `GET /api/dongs/<slug>/transit-congestion` -- 시간대 혼잡도 + 동 성격 추정. 캐시 5분 (`dong_transit_congestion:v1:<slug>`). 스키마 변경 없음.
  - subway: `NearestSubway` 사전계산된 TOP 3 역의 `SubwayCongestion` 평균. day_type=`평일/토요일/일요일` x hour 0~23 배열. `direction`(상선/하선/내선/외선)과 `express_yn`(일반/급행)은 전부 합산 평균. `휴일` day_type 행은 `일요일` 버킷에 가중평균(행 수 n 기준)으로 합쳐서 일요일 평균 계산. 30분 단위 raw 행은 같은 hour로 추가 평균.
  - bus: `BusStop.dong` FK 매핑된 정류장 전체의 `BusCongestion`. **주의: BusStop.dong은 `to_field='code'`라 `dong_id`(컬럼)에 code 값이 들어감. 반드시 `BusStop.objects.filter(dong__id=dong.id)` 조인** (`dong_id=dong.id`로 필터하면 0건). 평일/주말은 `EXTRACT(DOW FROM date) IN (0,6)` 분기. 최근 60일 윈도우 (현재 RDS 적재 31일치라 사실상 전체). `congestion IS NOT NULL` 필터.
  - personality: subway 우선(데이터 있으면), 없으면 bus. 평일 morning_peak(7~9)/midday(11~14)/evening_peak(18~20) + weekend 평균. 우선순위: 1) `weekend/평일 > 1.2` → 유동인구 많음, 2) `midday/morning > 0.8` → 상업·업무 중심, 3) `morning/midday > 1.5 && evening/midday > 1.3` → 주거 중심. 모두 빗나가면 label=null.
  - hour 데이터 없는 슬롯은 `{hour: H, congestion: null}`. 24슬롯 길이 보장.
  - 응답시간: cold 400~440ms (subway 23ms + bus 35ms 집계, 나머지는 Django 오버헤드), warm 170~200ms.
  - 라이브 검증: 중구-필동 → "상업·업무 중심", 관악구-신림동 → "주거 중심"(1.8배), 마포구-합정동 → "주거 중심"(1.5배), 강남구-역삼1동 → null(경계지, midday/morning=0.73 임계 미달).
  - view 파일: `apps/transit/views.py` 신설 (`DongTransitCongestionView`). URL은 `apps/neighborhoods/urls.py`의 dong-scoped 패턴에 추가.

### 대시보드 §4.4 섹션 B 추가 엔드포인트 (2026-05-13)
- `GET /api/dongs/<slug>/parks` -- park_adong 매핑을 통한 행정동 공원 목록. 면적 내림차순(null 뒤). 캐시 5분(`dong_parks:v1:<slug>`). 스키마 변경 없음.
  - 응답: `{dong, count, parks:[{id, name, category, area_m2, lat, lng, distance_m}]}`.
  - `distance_m`: `ST_DistanceSphere(park.location, dong.centroid)` 미터, 좌표 누락 시 null. 프로젝트 표준 패턴(geography cast 없이 GiST 활용).
  - 0건이어도 200 + `count:0` + `parks:[]`, 미존재 slug 404.
  - view 파일: `apps/parks/views.py` 신설 (`DongParksView`). URL은 `apps/neighborhoods/urls.py` 의 dong-scoped 패턴에 추가.
  - 라이브 검증: `중구-필동` 4건(남산 도시자연공원 2건 등), `강남구-역삼1동` 8건. 정렬·거리 정상.
  - 도서관 모델 미존재 → 도서관 위젯용 endpoint는 이번 작업 범위 밖.

### Phase 2 추가 엔드포인트 (2026-05-13)
- `GET /api/dongs/<slug>/population` -- AdongPopulation 시계열 (latest + trend). 캐시 10분.
- `GET /api/dongs/<slug>/gu-metrics` -- 소속 구의 GuMetric을 metric_code별 최신 1행씩 + SeoulMetric도 metric_code별 최신. 캐시 5분.
- 스키마 변경 없음 (마이그레이션 없음). views.py + urls.py만 수정.

### Phase 4 추가 엔드포인트 (2026-05-13)
- `GET /api/dongs/<slug>/gu-metrics/series?codes=A,B,...&years=10` -- 구별 지표 시계열 (추이 차트용).
  - `codes` 콤마 구분 1~10개, `years` 1~20 (default 10). 잘못된 파라미터 400, 미존재 slug 404.
  - 응답: `{dong, gu_code, gu_name, series: {code: {name,unit,category,points:[{date,value}]}}, seoul_series: {code: {points:[...]}}}`.
  - cutoff = `date(today.year - years, 1, 1)`. points는 date 오름차순, value null은 그대로 노출(프론트 connectNulls).
  - 요청한 모든 code가 응답 키로 포함됨 (데이터 없으면 빈 points 배열) — 프론트 분기 단순화 목적.
  - 캐시: `dong_gu_metrics_series:{gu_code}:{sorted_codes_joined}:{years}` 5분 TTL. dong 헤더는 캐시 외부에서 합성하여 같은 구 다른 동 재사용.
  - 기존 `/gu-metrics`는 그대로 유지 (KPI/단일값용). 추이 차트는 신규 endpoint 사용.
- 스키마 변경 없음 (마이그레이션 없음). views.py + urls.py만 수정. `python manage.py check` / `makemigrations --dry-run` PASS.

### gu-metrics 응답 스키마 (2026-05-13 수정)
metric_code마다 적재 주기가 다르므로 "구의 최신 1개 날짜" 잡는 방식 폐기.
PostgreSQL `DISTINCT ON (metric_code) ORDER BY metric_code, date DESC`로 35종 모두 채움.

```json
{
  "dong":      { "slug": "...", "name": "...", "gu": "..." },
  "gu_code":   "11140",
  "gu_name":   "중구",
  "metrics": {
    "POP_RESIDENT":     { "value": 117760, "date": "2026-04-01", "name": "주민등록인구",     "unit": "명",  "category": "인구", "rank_in_seoul": 18, "gu_count": 25, "gu_avg": 378271.6 },
    "POP_YOUTH_19_34":  { "value": 34815,  "date": "2024-01-01", "name": "청년인구_19~34세", "unit": "명",  "category": "인구", "rank_in_seoul":  8, "gu_count": 25, "gu_avg":  86275.6 },
    "SAFETY_GRADE_FIRE":{ "value": 5,      "date": "2024-01-01", "name": "지역안전등급_화재",  "unit": "등급", "category": "안전", "rank_in_seoul":  1, "gu_count": 25, "gu_avg": 4.0 }
  },
  "seoul_avg": {
    "POP_RESIDENT":    { "value": 9456789.0, "date": "2026-04-01" },
    "POP_YOUTH_19_34": { "value": 2156890.0, "date": "2024-01-01" }
  }
}
```

**breaking-ish 변경**: top-level `date` 필드 제거 (코드별 `metrics[code].date` / `seoul_avg[code].date`로 대체). 프론트가 top-level `date`를 참조하지 않는 한 호환.

### Phase 5 추가 (2026-05-13) — 25개 구 평균선 + 순위
기존 `seoul_avg`는 SeoulMetric raw 그대로 (서울시 전체 합/대표값) — 라이브 검증 결과 "구의 ~33배"인 합계 케이스 다수. "다른 구 대비" 비교가 불명확하던 문제를 새 키로 해결. 캐시 키 `v2`로 무효화.

- `/gu-metrics` 응답 `metrics[code]`에 3개 키 추가:
  - `rank_in_seoul`: 같은 date 기준 25구 중 값이 큰 순으로 1위 (value=null이면 null, 동률은 같은 rank).
  - `gu_count`: 그 date에 데이터를 가진 구 수 (값 null 제외, 일반적으로 25).
  - `gu_avg`: 같은 date 기준 25구 산술 평균 (null 제외). SeoulMetric raw와 의미 다름.
- `/gu-metrics/series` 응답에:
  - `series[code].current_rank: { rank, total, value, date } | null` — series의 가장 최신 non-null point 기준 25구 중 순위.
  - `gu_avg_series: { CODE: { points: [{date, value}] } }` — date별 25구 산술 평균 시계열. seoul_series와 alignment 동일.
- 기존 `seoul_avg` / `seoul_series` 키 그대로 유지 (호환성). 프론트는 비교용으로는 `gu_avg`/`gu_avg_series` 사용 권장.
- 구현: in-memory 집계 (25구 × ~35 metric ≒ 875행 / 시계열은 25구 × code × ~10년). N+1 없음, 추가 쿼리는 endpoint당 1회.

### 메트릭 카탈로그 요약 (참고)

총 35종, 카테고리: 인구(13) / 안전(7) / 교통(10) / 환경(2) / 경제(4). 적재 범위:
- 월간 (M): `POP_RESIDENT*` (~2026-04), `POP_TOTAL` / `POP_ELDERLY_RATIO` (~2026-03), `LAND_PRICE_CHANGE_RATE` (~2026-03)
- 연간 (A): `SAFETY_GRADE_*` / `POP_YOUTH_*` / `POP_MEAN_AGE*` / `ACC_*` / `VEHICLE_REGISTERED` / `HOUSING_COUNT` (~2024-01), `TRAFFIC_CULTURE_*` / `FIRE_COUNT` (~2025-01), `AREA_GREEN` / `AREA_URBAN` (~2024-01), `GRDP_*` (~2022-01)
- 모든 35종이 25개 구 전체에 적재됨 (gu_metric에서 누락 코드 없음).

## Data (휴면)

426개 행정동, 740만 거래, 53만 상점, 800만 버스혼잡 데이터 적재 완료.

## QA Notes

마지막 리뷰: 2026-05-13 (Phase 3 -- 인기 차트 + 자취생 리뷰)

### 해결 완료
- explore__chip/radio/range-inputs CSS 누락 -> Chip 프리미티브 + 인라인 Tailwind 전환
- Slider thumb 정렬 버그 -> [-mt-2] (무효 문법) -> -mt-[8px] (20px thumb, 4px track 기준 정중앙)
- Slider track gradient를 .ui-slider-track 클래스로 스코프 (필터 레인지에 50% 채우기 노출 방지)
- Button disabled hex #A1A1AA -> --color-disabled 토큰 추가
- Legend bg-[var(--heatmap-N)] -> bg-heatmap-N 토큰 유틸리티로 전환
- DongExplore apt 차트 색상 -> CHART_COLORS.apt로 통합
- MatchFilterPanel/MatchKpiCard/KernelScorePanel/CriteriaPanel 임의 px값 -> 토큰 전환
- TransactionPanel 닫기 버튼 transition-all -> transition-colors 통일
- AiSidePanel text-white -> text-surface 통일 (Phase 0 QA)
- Dashboard setSearchParams 렌더 중 호출 -> useEffect로 이동 (Phase 0 QA)
- Dashboard CategoryKey 로컬 재정의 -> lib/colors.ts에서 import (Phase 0 QA)
- KpiCard text-[28px] -> text-card-heading 토큰 전환 (Phase 1 QA)
- TransitSection text-[32px] -> text-card-heading 토큰 전환 (Phase 1 QA)
- Dashboard 섹션 aria-labelledby 추가 (Phase 1 QA)
- Phase 2 hardcoded hex -> CATEGORY_COLORS 상수 전환 (Phase 2 QA)
- Phase 2 tooltipStyle -> TOOLTIP_STYLE (Phase 1 패턴 통일) (Phase 2 QA)
- Phase 2 h3 text-body-base -> text-feature-heading 통일 (Phase 2 QA)
- Dashboard mono-label / text-mono-label -> text-caption 전환, font-mono -> Pretendard 통일
- Dashboard bg-surface-alt -> bg-primary-soft 그린워시 전환 (메인 배경, 스켈레톤, 게이지 뱃지, 테이블 헤더)
- CHART_COLORS.bar #4C4C4C -> #059669 (primary green) 전환
- --font-sans, --font-mono -> Pretendard 오버라이드 (프로젝트 전체 적용)
- Phase 3 QA: PopularitySection / ReviewDashboardSection / Dashboard.tsx PASS WITH NOTES -- 토큰 위반/any/storage/신규 CSS 없음. Stars는 기존 Detail/ReviewSection 패턴 재사용. (Phase 3 QA)

### 잔여 관찰
- CriteriaPanel 닫기 버튼 text-[20px]: 정확 매핑 토큰 없음 (feature-heading 22px 근사). 시각 차이 미미하여 유지.
- CompareChip의 중복 bg-/border- 클래스: Tailwind JIT 우선순위에 의존. 동작 정상이나 코드 정리 권장.
- App.tsx + AiSidePanel.tsx: AI 패널 너비 400px이 두 곳에 하드코딩. CSS variable 통합 권장.
- Card 프리미티브에 shadow-floating 미포함. SPEC 플로팅 카드 느낌 보강 필요.
- Gauge 쇼케이스(/design-system) 미반영.
- DashboardMiniMap z-[1000] x3: Leaflet 스태킹 컨텍스트 내 overlay용. modal backdrop z-index와 동일하나 기능 충돌 없음.
- Dashboard 차트 컨테이너 h-[220px] vs Detail h-[240px]: 대시보드 밀도 높은 레이아웃 의도.
- Detail/RealEstateSection 로컬 KpiCard과 Dashboard/KpiCard 중복: 향후 통합 권장.
- PopulationSection GENDER_COLORS 내 #EC4899 하드코딩: colors.ts 상수 추출 권장.
- CHART_COLORS.bar 변경이 DongExplore 탐색 페이지에도 전파됨 (의도적이면 OK).
- KPI 위젯 세로 높이가 컨텐츠 대비 넉넉함: 추후 KPI 추가 시 리사이징 예정.
- Phase 3 PopularitySection: 학교별 TOP 5가 선택된 학교와 무관하게 종합 점수 폴백 (UI 안내 카피 있음). 학교별 ranking API 신규 endpoint 필요 (SPEC 9.3 5번). 별도 세션에서 사용자 보고 후 호출.
- Phase 3 F/G 섹션 헤더 색이 모두 --color-cat-environment (민트) -- 별도 카테고리 토큰 미정. 시각 식별 약함, popularity/community 토큰 추가 검토.
- Phase 3 ReviewDashboardSection Stars text-secondary (#4C4C4C 회색): Detail/ReviewSection과 동일 패턴 의도적 재사용. SPEC 1.3 '알록달록' 톤과 다소 충돌 -- amber/warning 전환 시 두 군데 동시 변경 필요.
- Phase 3 PopularitySection '비슷한 동' 카드: absolute-button + 내부 Link(stopPropagation) sibling 구조로 a11y 유효. outline-offset이 음수(-2px)라 outline이 카드 안쪽에 그려짐 (의도된 디자인이면 유지).
- Phase 3 useCountup이 KpiCard와 사실상 같은 로직 (easeOutCubic, 1.2s default) -- hooks/useCountup.ts로 추출 권장.

### Phase 4 QA (2026-05-13 — metric 35종 데이터 확장 + 새 위젯 7개)
- Verdict: **PASS WITH NOTES**. 블로커 없음.
- 검사 통과: hex 하드코딩 0 (Dashboard 범위), `bg-[/text-[/border-[` arbitrary value 0, localStorage/sessionStorage 0, font-size px 0, `: any` 0, mono-label/font-mono 0, bg-surface-alt 0 (Dashboard 범위), 새 .css 파일 0, MainMap/Map/* 변경 0. tsc + vite build 통과 (Dashboard chunk 119KB).
- types/api.ts: 기존 `date: string | null` → `date?: string | null` (optional)로 deprecated, `GuMetricValue.date` / `SeoulAvgValue` 신설. 프론트 전역에 `guMetrics.date` 잔존 0건 확인.
- 새 토큰 사용: `--color-info-soft`/`--color-danger-soft`/`--color-primary-soft`/`--color-cat-*` 모두 globals.css에 존재. 미정의 토큰 참조 없음.
- Section A·C·D·E 모두 `text-feature-heading leading-[1.3] font-semibold` h3, TOOLTIP_STYLE, MetricCard 푸터 패턴 일관.
- 관찰 (note-level):
  - SafetyEconomySection 교통사고 카드의 내부 KPI 숫자(총 발생건수/부상자수)가 `text-feature-heading`(22px) — 다른 KPI 위치(card-heading 28px)와 사이즈 다름. 2열 좁은 그리드 안 sub-KPI라 의도된 다운사이즈로 보임.
  - accBarColors가 `CATEGORY_COLORS.realestate`(amber) 우회 사용. 차트용 warning 토큰(`CHART_COLORS.warning` / `CHART_COLORS.warningDeep` + `--color-warning-deep`) 추가 완료 — frontend-engineer가 다음 단계에 색 교체할 것.
  - PopulationSection 평균연령 카드의 색 로직 `meanAgeDiff <= 0 ? success : danger` — '서울보다 젊으면 좋음'으로 단정. 학생 타겟에선 합리적이나 의견성 derivation.
  - PopulationSection `singleHouseholdPct` = round((2 - avgPersonsPerHousehold) * 100)는 거친 추정. 카드 하단에 "추정값" 주석 있어 OK이나 SPEC 통계와 다를 수 있음.
  - greenRatio 계산 `AREA_GREEN / (AREA_GREEN + AREA_URBAN)` — 도시면적이 총면적을 포함하는지 별개인지 메트릭 카탈로그 정의 미확인. 결과값 자체는 합리적 범위로 보이나 정의 검증 권장.
  - GRDP 단위 변환: `백만원 → 조원(÷1,000,000)` 표기. `--unit` 응답 필드를 무시하고 클라이언트가 단위 결정 — 단위 변경 시 양쪽 동기화 필요.
  - vehiclePerCapita Card padding이 `md`, B5/B6 RealEstate KPI도 `padding="md"`. 기존 Phase 2 MetricCard/KpiCard는 `padding="lg"` 또는 inline 패딩(p-4). 의도된 컴팩트 KPI면 OK이나 시각적으로 살짝 얕음.
