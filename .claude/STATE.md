# 자취맵 -- 프로젝트 상태

마지막 업데이트: 2026-05-13

## Project Status

- **단계**: Phase 1 완료 — 대시보드 핵심 위젯 (KPI/미니맵/부동산/편의시설/교통)
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
- **Status/MetricBar**: danger (#FB6666), warning (#FFD82A), success (#059669), info (#5570F1) + soft + metric-4/5
- **Focus**: --color-focus-ring (primary 40%)
- **히트맵 종합**: 5분위 (불변), **지하철**: 1~9호선 (불변)
- **Category (NEW)**: realestate (#F59E0B), transport (#3B82F6), amenity (#10B981), safety (#EF4444), population (#8B5CF6), environment (#14B8A6) -- 대시보드 섹션 헤더/아이콘용
- **히트맵 레이어 (NEW)**: rent/activity/youth/studio/safety 각 5단계 팔레트 (--color-hm-{layer}-{1..5})
- **타이포**: Pretendard only. 12단계 + Data Display
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

### JS 미러 (colors.ts)
- HEATMAP_COLORS, HEATMAP_COLORS_ORDERED, scoreToHeatmapBucket, scoreToHeatmapColor
- MAP_POLYGON_STROKE, MAP_PIN
- CHART_COLORS
- CATEGORY_COLORS (NEW), HEATMAP_LAYER_COLORS (NEW), scoreToLayerColor (NEW)

### 프리미티브 (ui/)
Button, Card, Badge, Chip, Score, MetricBar, Input, Select, Slider, Modal, Tooltip, Gauge -- 12개 완성.

### 쇼케이스
`/design-system` 라우트. 모든 토큰 + 프리미티브 시각 확인. (Gauge 아직 쇼케이스 미반영)

## Frontend

### 라우트 (10개)
| 경로 | 컴포넌트 | 상태 |
|---|---|---|
| `/` | MainMap | 완성 |
| `/dashboard` | Dashboard (lazy) | Phase 1 위젯 |
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
- **KpiRow** (`components/Dashboard/KpiRow.tsx`) — KPI 4칸 그리드 (환산월세/보증금/거래건수/안전게이지)
- **DashboardMiniMap** (`components/Dashboard/DashboardMiniMap.tsx`) — Leaflet 미니맵 + 히트맵 레이어 토글 6종 + 컬러칩 범례 + 확장 버튼
- **RealEstateSection** (`components/Dashboard/sections/RealEstateSection.tsx`) — 4개 Recharts 차트 (라인/도넛/산점도/바)
- **AmenitySection** (`components/Dashboard/sections/AmenitySection.tsx`) — 카테고리별 테이블 + 자취생 필수시설 칩 그리드
- **TransitSection** (`components/Dashboard/sections/TransitSection.tsx`) — 지하철 TOP3 + 버스 통계 + placeholder 위젯

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
- CSS: 72KB (18KB gz)
- JS main: 982KB (292KB gz), Dashboard chunk: 47KB (15KB gz)
- tsc + vite build 통과

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
| KPI 자취촌 지수 | 파생 지표 | 신규 endpoint 또는 프론트 계산 |
| 섹션 C 시간대 혼잡도 | `subway_congestion`, `bus_congestion` | 신규 endpoint 필요 |
| 섹션 C 동 성격 추정 | 혼잡도 패턴 분석 | 혼잡도 데이터 의존 |
| 공원·도서관 | `park`, `library` | 신규 endpoint 필요 |
| 미니맵 per-layer scores | rent/activity/youth/studio/safety 개별 점수 | DongScore 확장 또는 신규 endpoint |

## Backend (휴면)

Django + DRF + GeoDjango. 9개 앱, 28개 모델, 20개 API 엔드포인트.

### Phase 2 추가 엔드포인트 (2026-05-13)
- `GET /api/dongs/<slug>/population` -- AdongPopulation 시계열 (latest + trend). 캐시 10분.
- `GET /api/dongs/<slug>/gu-metrics` -- 소속 구의 최신 GuMetric 35종 + SeoulMetric 서울 평균. 캐시 5분.
- 스키마 변경 없음 (마이그레이션 없음). views.py + urls.py만 수정.

## Data (휴면)

426개 행정동, 740만 거래, 53만 상점, 800만 버스혼잡 데이터 적재 완료.

## QA Notes

마지막 리뷰: 2026-05-13 (Phase 1 대시보드 핵심 위젯)

### 해결 완료
- explore__chip/radio/range-inputs CSS 누락 → Chip 프리미티브 + 인라인 Tailwind 전환
- Slider thumb 정렬 버그 → [-mt-2] (무효 문법) → -mt-[8px] (20px thumb, 4px track 기준 정중앙)
- Slider track gradient를 .ui-slider-track 클래스로 스코프 (필터 레인지에 50% 채우기 노출 방지)
- Button disabled hex #A1A1AA → --color-disabled 토큰 추가
- Legend bg-[var(--heatmap-N)] → bg-heatmap-N 토큰 유틸리티로 전환
- DongExplore apt 차트 색상 → CHART_COLORS.apt로 통합
- MatchFilterPanel/MatchKpiCard/KernelScorePanel/CriteriaPanel 임의 px값 → 토큰 전환
- TransactionPanel 닫기 버튼 transition-all → transition-colors 통일
- AiSidePanel text-white → text-surface 통일 (Phase 0 QA)
- Dashboard setSearchParams 렌더 중 호출 → useEffect로 이동 (Phase 0 QA)
- Dashboard CategoryKey 로컬 재정의 → lib/colors.ts에서 import (Phase 0 QA)
- KpiCard text-[28px] → text-card-heading 토큰 전환 (Phase 1 QA)
- TransitSection text-[32px] → text-card-heading 토큰 전환 (Phase 1 QA)
- Dashboard 섹션 aria-labelledby 추가 (Phase 1 QA)

### 잔여 관찰
- CriteriaPanel 닫기 버튼 text-[20px]: 정확 매핑 토큰 없음 (feature-heading 22px 근사). 시각 차이 미미하여 유지.
- CompareChip의 중복 bg-/border- 클래스: Tailwind JIT 우선순위에 의존. 동작 정상이나 코드 정리 권장.
- App.tsx + AiSidePanel.tsx: AI 패널 너비 400px이 두 곳에 하드코딩. CSS variable 통합 권장.
- Card 프리미티브에 shadow-floating 미포함. SPEC 플로팅 카드 느낌 보강 필요.
- Gauge 쇼케이스(/design-system) 미반영.
- DashboardMiniMap z-[1000] x3: Leaflet 스태킹 컨텍스트 내 overlay용. modal backdrop z-index와 동일하나 기능 충돌 없음.
- Dashboard 차트 컨테이너 h-[220px] vs Detail h-[240px]: 대시보드 밀도 높은 레이아웃 의도.
- Detail/RealEstateSection 로컬 KpiCard과 Dashboard/KpiCard 중복: 향후 통합 권장.
