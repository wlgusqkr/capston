# 자취맵 -- 프로젝트 상태

마지막 업데이트: 2026-05-12

## Project Status

- **단계**: 디자인 시스템 재정비 완료 → 추가 화면 개발 대기
- **활성 모드**: 프론트엔드 + 디자인 집중. 백엔드/데이터는 휴면.
- **데이터**: 426개 행정동 실데이터 적재 완료 (RDS ETL). 더미 아님.
- **CSS 방식**: Tailwind + 디자인 토큰 매핑 예정. 현재 순수 CSS + tokens.css.

## Design System

### 토큰 (tokens.css)
- **컬러**: Primary Green (#059669), Near-Black (#4C4C4C), Deep Forest (#003c33), Canvas White, Green Wash, Coral, Action Blue, Ink/Slate/Muted-Slate, Surface Inset (#F4F4F5)
- **시맨틱 alias**: --color-primary, --color-bg, --color-surface, --color-text, --color-border 등 13개
- **상태색**: success/warning/danger/info/neutral + soft 변형
- **히트맵**: 5분위 (#edfce9 → #003c33)
- **MetricBar**: 5단계 desaturated (#FB6666, #FFCC3F, #32936F, #A6B6FF, #5570F1)
- **지하철**: 1~9호선 공식색
- **타이포**: Pretendard 12단계 (Hero 80px ~ Micro 12px) + Data Display 48px
- **스페이싱**: 8px base, 12단계 (4~120px)
- **라디우스**: xs(4) / sm,md(8) / card(16) / hero(22) / xl(30) / pill(32) / full(9999)
- **높이**: sm(32) / md(40) / cta(44) / lg(48) / badge(22)
- **맵 레이아웃**: control(40px), legend bar(144x8), hero-map(280px), filter dropdown(220px)

### 프리미티브 (ui/)
Button, Card, Badge, Score, MetricBar, Input, Select, Slider, Modal, Tooltip -- 10개 완성.
배럴 export: `ui/index.ts`

### 쇼케이스
`/design-system` 라우트. tokens.css 전체 토큰 + 모든 프리미티브 시각 확인 가능.

### 삭제된 토큰 (구버전)
--color-soft-stone, --color-soft-coral, --color-secondary, --color-primary-soft, --color-gray-* alias들, --letter-spacing-ko-relaxed, JetBrains Mono 참조 -- 모두 제거 완료.

### 알려진 갭
- Tailwind 매핑 미적용 (순수 CSS 상태)
- DESIGN_SYSTEM.md가 구버전(#17171c primary, Soft Stone 등)으로 되돌려짐 -- tokens.css 기준으로 재동기화 필요
- Toast/TabGroup/Spinner 프리미티브 없음 (필요 시 추가)

## Frontend

### 라우트 (9개)
| 경로 | 컴포넌트 | 상태 |
|---|---|---|
| `/` | MainMap | 완성 |
| `/dong/:slug` | DongDetail | 완성 |
| `/dong/:slug/explore` | DongExplore | 완성 |
| `/compare` | Compare | 완성 |
| `/login` | Login | 완성 |
| `/register` | Register | 완성 |
| `/mypage` | MyPage | 완성 |
| `/design-system` | DesignSystem | 완성 (dev용) |
| `*` | NotFound | 완성 |

### 주요 컴포넌트
- **Map/**: HeatMap, Sidebar, Legend, ViewToggle, DongPanel, MapModeToggle, MatchFilterPanel, MatchKpiCard, CriteriaPanel, TransactionPanel
- **Detail/**: HeroSection, RealEstateSection, AmenitySection, TransitSection, ReviewSection, SimilarDongsSection
- **Onboarding/**: PreferenceModal
- **Layout/**: TopNav

### 데이터 훅 (13개)
useDongs, useDongGeoJson, useDongExplore, useDongMatchCounts, useDongMatchDetail, useKernelScore, useTransactions, usePreference, useFavorites, useStudioMatchFilters, useEscapeKey, useIntersection

### 알려진 이슈
- weights가 글로벌 Context로 미승격 → DongDetail/Compare에서 항상 33/33/34 기본값 사용
- Recharts tooltip formatter 타입 에러 5건 (기능에 영향 없음)
- MyPage 프로필 "수정" 버튼: PATCH 연결됐지만 다이얼로그 UI 없음
- 모바일 반응형: 미구현 (데스크톱 1280px+ 전용)
- 번들 사이즈: ~844KB gz (Recharts ~400KB 차지)

## Backend (휴면)

### API 엔드포인트
| Method | Path | 용도 |
|---|---|---|
| GET | `/api/dongs/scores` | 가중치 기반 전체 동 점수 |
| GET | `/api/dongs/match-counts` | 매칭 거래량 분포 |
| GET | `/api/dongs/<slug>/summary` | 동 요약 |
| GET | `/api/dongs/<slug>/detail` | 동 상세 (6섹션) |
| GET | `/api/dongs/<slug>/explore` | 자취 시세 BI |
| GET | `/api/dongs/<slug>/match-detail` | 매칭 KPI |
| GET | `/api/compare` | 동네 비교 (최대 3개) |
| POST | `/api/score/point` | 임의 지점 커널 점수 |
| GET | `/api/preference/pairs` | 선호 학습 쌍 |
| POST | `/api/preference/submit` | 선호 결과 제출 |
| GET | `/api/transactions/bbox` | BBox 거래 핀 |
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/users/me` | 내 정보 |
| PUT | `/api/users/me/preference` | 가중치 저장 |
| GET/POST | `/api/users/me/favorites` | 즐겨찾기 목록/추가 |
| DELETE | `/api/users/me/favorites/<slug>` | 즐겨찾기 삭제 |
| GET | `/api/users/me/reviews` | 내 리뷰 |

### Django 앱 (9개)
neighborhoods, realestate, amenities, transit, regions, metrics, parks, preference, users

### 모델 (28개)
Dong, RentDeal, Store, StoreCategory, Amenity, SubwayStation, SubwayLine, BusStop, BusCongestion, SubwayCongestion, Seoul, Gu, Ldong, DongAdjacency, GuAdjacency, LdongAdjacency, DongPopulation, LdongPopulation, Metric, GuMetric, SeoulMetric, Park, ParkDong, ParkLdong, User, Favorite, UserPreference + StoreSubcategory

## Data (휴면)

### 적재 완료 데이터
| 테이블 | 건수 | 출처 |
|---|---|---|
| dong | 426 | RDS (행정동) |
| ldong | 467 | RDS (법정동) |
| rent_deal | 7,442,630 | RDS (국토부 실거래가) |
| store | 534,977 | RDS (소상공인진흥공단) |
| amenity | 187,585 | Store → 11카테고리 파생 |
| bus_congestion | 7,996,016 | RDS (서울교통빅데이터) |
| subway_station | ~300 | RDS |
| park | ~2,000 | RDS |

### 점수 알고리즘
- score_rent: 월세 평균 → percentile 역전 (저렴=100)
- score_amenity: 카테고리별 가중합 (log-scaled) → percentile
- score_transit: 최근접 지하철 거리 + 버스정류장 수 (log-scaled) → percentile

## QA Notes

- 디자인 시스템 토큰 리팩토링 완료 (Soft Stone/JetBrains Mono 제거, MetricBar desaturated 색상, weight tone primary-green)
- tokens.css ↔ DesignSystem.tsx 완전 동기화 확인됨
- DESIGN_SYSTEM.md는 구버전으로 되돌려진 상태 — 주의 필요

## Open Questions / Decisions Pending

- Tailwind CSS 도입 시점 및 방법 (design-system-keeper 담당)
- DESIGN_SYSTEM.md 구버전/신버전 충돌 해결 필요
- 모바일 반응형 우선순위 결정
- 카카오 소셜 로그인 활성화 시점
