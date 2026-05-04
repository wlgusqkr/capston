# 슬기로운 자취생활 — Web Design System

> 이 문서가 디자인의 단일 진실(single source of truth)입니다.
> 기존 `frontend/src/styles/tokens.css`(짙은 청록 primary, 4색 히트맵)는 **구버전**이며, 본 문서 기준으로 마이그레이션 예정.
> Cohere의 enterprise AI 미감을 차용한 절제된 리서치 터미널 톤. 분석적·신뢰감·차분함이 핵심.

---

## Core Aesthetic Principles

- **Restraint over decoration** — 흰 캔버스가 기본. 색은 지도 데이터·다크 모듈·에디토리얼 칩에서만 등장.
- **Monumental typography, measured UI** — 페이지당 거대한 헤드라인 1개. 그 외는 16-24px 본문.
- **Surface alternation, not shadows** — 깊이는 white↔dark 밴드 교차와 라운드 미디어 카드로. 드롭섀도우 금지.
- **Whitespace as trust signal** — 섹션 간 큰 여백이 진지함을 신호한다.
- **Data is the hero** — 지도·차트·점수가 주역. 주변 chrome은 조용해야 한다.

---

## Brand Voice (한국어 카피 가이드)

- **Headline**: 선언적·차분. "동네를 먼저 이해하세요" (O), "최고의 자취 동네 찾기!" (X)
- **Body**: 짧은 문장, 마케팅 과장 없음. 안내문은 `-요/-해요`, 시스템 메시지/데이터 라벨은 `-다/-습니다`.
- **숫자/단위**: 단위 항상 표기 (`만원`, `분`, `m²`, `%`). 한국어 자연 표기 우선.
- **기술 라벨**: 시스템 마커는 mono 대문자 영문(`AVG MONTHLY RENT`, `WALKING TIME`, `PERCENTILE`). 사용자 카테고리는 한국어(`평균 월세`, `도보 시간`, `생활시설 점수`).

---

## Color Palette

### Primary Surfaces

| Token | Hex | 용도 |
|---|---|---|
| Canvas White | `#ffffff` | 기본 배경, 폼, 브리핑 카드 |
| Near-Black Primary | `#17171c` | 1차 CTA, 다크 지도 컨트롤, footer |
| Pure Black | `#000000` | announcement bar, top nav border, 최고 대비 텍스트 |
| Deep Forest | `#003c33` | 지도 탐색 모드 hero band, "find your neighborhood" CTA |
| Dark Navy | `#071829` | 브리핑 hero panel, 거래 분석 |

### Warm Neutrals

| Token | Hex | 용도 |
|---|---|---|
| Soft Stone | `#eeece7` | score card, 동네 요약 카드, 비교 패널 |
| Pale Green Wash | `#edfce9` | "what we measure" 같은 capability 섹션 배경 |
| Pale Blue Wash | `#f1f5ff` | POI 인트로, 온보딩 힌트 |

### Editorial Accents (CTA로 절대 사용 금지)

| Token | Hex | 용도 |
|---|---|---|
| Coral | `#ff7759` | 동네 카테고리 칩(`대학가형`, `1인가구 밀집형`), warm marker |
| Soft Coral | `#ffad9b` | pale 칩 보더, 보조 분류 |
| Action Blue | `#1863dc` | 에디토리얼 링크, "더 보기", 거래 상세 링크 |

### Map & Data Visualization

- **Heatmap**: Pale Green Wash `#edfce9` → Deep Forest `#003c33` 그라디언트, 5분위(0-20/20-40/40-60/60-80/80-100), polygon opacity 0.7
- **Transaction Pin**: 기본 `#17171c`, 선택 시 Coral
- **Subway Line**: 서울 지하철 공식 색만 사용 (1호선 `#0052A4`, 2호선 `#00A84D`, 3호선 `#EF7C1C`, …) — **지도 위에서만**, UI chrome엔 절대 안 씀

### Text & Rules

| Token | Hex | 용도 |
|---|---|---|
| Ink | `#212121` | 라이트 표면 본문 |
| Muted Slate | `#93939f` | 메타데이터, 날짜, footer 링크, "n건 거래" 카운트 |
| Slate | `#75758a` | 3차 텍스트, 표 구분 |
| Hairline | `#d9d9dd` | 기본 디바이더, 표 row rule |
| Border Light | `#e5e7eb` | 폼 보더, utility rule |

### Semantic

| Token | Hex | 용도 |
|---|---|---|
| Focus Blue | `#4c6ee6` | 키보드 포커스 링 |
| Form Focus Violet | `#9b60aa` | 인풋 필드 focus border |
| Error Red | `#b30000` | 검증 에러, "데이터 없음" |

> Coral·Blue를 **넓은 surface fill**로 쓰지 말 것. 지도 히트맵·대형 미디어 패널 외에는 **채도 높은 그라디언트** 금지.

---

## Typography

### Stack

- **Display**: `Pretendard`, `Space Grotesk`, `Inter`, `ui-sans-serif`, `system-ui`
- **Body/UI**: `Pretendard`, `Inter`, `-apple-system`, `Apple SD Gothic Neo`, `Arial`
- **Mono**: `JetBrains Mono`, `D2Coding`, `Consolas`, `monospace`

> Pretendard 400을 거의 모든 곳에. 500은 버튼/활성 필터 칩에만.

### Scale

| Role | Size | Weight | Line | Tracking | 용도 |
|---|--:|--:|--:|--:|---|
| Hero Display | 80px | 400 | 1.00 | -1.6px | 랜딩 only — "동네를 먼저 이해하세요" |
| Page Display | 60px | 400 | 1.00 | -1.2px | 브리핑 페이지 상단, 탐색 모드 진입 |
| Section Display | 48px | 400 | 1.05 | -0.96px | 주요 섹션 헤딩 ("평균 전월세") |
| Section Heading | 36px | 400 | 1.15 | -0.36px | CTA 블록, 비교 섹션 |
| Card Heading | 28px | 400 | 1.20 | -0.28px | score card, 동네 요약 타이틀 |
| Feature Heading | 22px | 400 | 1.30 | 0 | POI 카테고리 헤더, 표 섹션 타이틀 |
| Body Large | 18px | 400 | 1.50 | 0 | 리드 단락, 브리핑 요약 |
| Body | 16px | 400 | 1.60 | 0 | 기본 본문, 표 셀 |
| Button | 14px | 500 | 1.40 | 0 | CTA 라벨 |
| Caption | 14px | 400 | 1.40 | 0 | 메타, "거래 5건", 날짜 |
| Mono Label | 13px | 400 | 1.40 | 0.26px | 대문자 영문, 기술 분류 |
| Micro | 12px | 400 | 1.40 | 0 | footer, nav micro copy |

### Korean-Specific Rules

- Korean display는 Latin보다 **약간 느슨한 line-height** (60px+에서 1.05 최소, 절대 1.00 아님).
- 본문 사이즈 한국어 tracking은 **0 또는 살짝 양수**. 24px 미만에서 negative 금지.
- Hero 음수 트래킹은 한국어 글자 간격에만, 글자 자체를 붙이지는 말 것.
- 화폐/단위는 일관: `55만원`, `25분`, `18m²`.

### Hierarchy Rules

- 페이지당 거대 헤드라인 1개 최대. 지도·데이터가 시각 앵커.
- 굵은 weight 회피. 위계는 크기·표면 대비·여백으로.
- mono 라벨은 시스템 마커 전용: `WALK 5MIN`, `LINE 3`, `RANK TOP 10%`. 장식 금지.

---

## Layout

### Spacing

8px base. 8, 12, 16, 20, 24, 32, 40, 56, 64, 80, 120px. 데스크톱 브리핑 페이지 섹션 간 80px+.

### Container Widths

- **Marketing/landing**: max 1280px center
- **Briefing dashboard**: max 1440px (지도는 viewport edge까지 허용)
- **Exploration (heatmap)**: full-bleed map + floating UI panel
- **Transaction tables**: max 1200px

### Grid Patterns

- **Top nav**: 3-zone — logo 좌, mode switcher 가운데(`탐색/브리핑/미리보기`), user/login 우
- **Briefing**: top score cards (3) → middle facility chart band → bottom transaction table
- **Exploration**: full map underlay + 우상단 또는 하단 중앙 weight slider panel + 클릭 시 동네 preview card
- **Preview mode**: desktop은 map 60% / POI·거래 사이드 40%; 모바일은 bottom sheet

### Whitespace Philosophy

밀집 데이터 카드 → 80px 갭 → 다음 데이터 블록. **공간을 채우려고 카드를 붙이지 말 것.**

---

## Elevation & Depth

대부분 평면. 깊이는 표면 교차·라운드·얇은 보더.

| Level | 처리 | 용도 |
|---|---|---|
| Flat | 섀도우 없음, white/dark fill | hero copy, 거래 리스트, 에디토리얼 |
| Bordered | 1px `#d9d9dd` or `#e5e7eb` | 표 row, 폼, score card 외곽 |
| Media Lift | 라운드 패널 + 대비 밴드 | 다크 섹션 위 지도 카드, 브리핑 요약 |
| Dark Data Field | Deep Forest / Navy full-width | hero band, "explore" CTA, premium 분석 |
| Floating Map UI | white card + 1px border + 선택적 2-4% 검정 섀도우 | weight slider panel, preview card |

> 부드러운 섀도우 허용은 **floating map UI**뿐. 8% 이하, blur halo 없음.

---

## Shapes & Radii

| Token | Value | 용도 |
|---|--:|---|
| `xs` | 4px | 지도 legend, 거래표 셀, 작은 썸네일 |
| `sm` | 8px | 표준 카드, 인풋, 1차 CTA (subtle) |
| `md` | 8px | `sm`의 별칭 — `button-primary`, modal, panel 등 1차 surface는 모두 여기로 통일 |
| `card` | 16px | 브리핑 데이터 블록, 동네 요약, `<Card>` 프리미티브 |
| `hero` | 22px | hero 사진 카드, 대형 미디어 |
| `xl` | 30px | 필터 pill (`원룸/오피스텔`), 카테고리 토글 |
| `pill` | 32px | 큰 필터 칩(`button-pill-filled`), brand mark, 일부 micro-surface 한정 |
| `full` | 9999px | 라운드 상태 도트, full-pill 컨트롤 |

> **Cohere-inspired subtle radius** — 1차 CTA(`button-primary`)와 인풋/모달 등 control surface는 `sm`/`md`(8px)로 통일한다. 데이터 블록·동네 요약 카드는 `card`(16px). hero 미디어는 `hero`(22px). `pill`/`full` 같은 둥근 형태는 brand mark, badge, filter chip 같은 micro-surface에서만. (큰 표면에 pill을 쓰면 SaaS 템플릿 느낌이 나고 분석 도구의 차분함이 깨진다.)
>
> **`md` vs `card` 정리 (post-D-11):** 이전 표기는 `md = 16px` 라고 적혀 있어서 `button-primary` 8px 정의와 모순됐다. 이제 `md` 는 8px (control surface), `card` 가 16px (데이터 블록) 으로 분리. 코드는 `--radius-md` (8px) 와 `--radius-card` (16px) 두 토큰으로 이미 구현되어 있음.

### Map-Specific Shapes

- 동 polygon stroke: 1px `#ffffff` @ 60% opacity
- 선택 polygon stroke: 2px `#17171c`
- transaction pin: 12px circle, `#17171c` fill, 흰 inner dot, hover 시 16px
- POI card: 8px radius, white fill, 1px hairline, 12px padding

---

## Components

- **`button-primary`** — `#17171c` fill, white text, Pretendard 14px/500, 12×24 padding, **8px radius (`--radius-md`)**. Hover `#000000`. "이 동네 보러가기" 등. (Subtle radius로 통일 — Card/Input/Modal과 같은 어휘. 과거 32px pill은 deep audit FINDING-105에서 폐기됨.)
- **`button-secondary`** — text-only + underline. "더 자세히", "직방에서 매물 보기".
- **`button-pill-outline`** — transparent + 1px `#17171c` border, 30px radius. 필터 토글.
- **`button-pill-filled`** — outline의 active 상태. `#17171c` fill + white text.
- **`weight-slider`** — 가중치 슬라이더 (교통/생활/주거비). track 4px `#e5e7eb`, fill 4px `#17171c`, thumb 20px white + 2px `#17171c` border. 값은 thumb 위 mono.
- **`score-card`** — Soft Stone 카드, 16px radius, 32px padding. mono 라벨 헤더 + 큰 숫자(28px) + 비교 라인 + 트렌드. 데스크톱 3카드 row.
- **`neighborhood-chip`** — Coral 분류 칩. 활성 시 coral fill, 비활성 시 outline + pale-coral fill, 22px radius. (`대학가형`, `1인가구 밀집형`, `직장인 통근형`)
- **`transaction-row`** — rule-separated row. 좌측 날짜 / 타입 칩 / 면적 / 보증금·월세 / 층 / 클릭 지점 거리. 1px `#d9d9dd` bottom. Hover `#f9f9f7`.
- **`map-floating-panel`** — white + 8px radius + 1px `#e5e7eb` + 선택적 4% 섀도우. 16-24px padding.
- **`poi-marker-card`** — 흰 pill, 4×8 padding, mono 라벨(`🚇 충무로역 5MIN`), 1px hairline.
- **`dark-cta-band`** — Deep Forest / Dark Navy full-width. 단일 declarative headline (Section Display, white) + white CTA(`button-primary` inverse — white fill, near-black text, 8px radius). ("다른 동네와 비교해 보세요")
- **`announcement-bar`** — 36px tall 검정 strip. 가운데 microcopy, 우측 close. ("베타 서비스 운영 중 · 데이터 출처: 국토교통부 실거래가")
- **`pairwise-comparison-card`** — 선호 학습 핵심 UI. 두 동네 카드 좌우 + 3-4 메트릭 + 하단 `[왼쪽이 좋아요]` `[오른쪽이 좋아요]` `[둘 다 별로]` + 상단 mono "QUESTION 3 OF 5".
- **`empty-state`** — center 텍스트 only: 큰 헤드라인 + 한 줄 설명 + 1개 secondary action. 일러스트 금지.
- **`footer-newsletter`** — dark footer. coral mono 라벨 "DATA UPDATES WEEKLY", white headline "새 거래 알림 받기", muted disclaimer, 단일 이메일 + 화살표 submit.

---

## Map UI Specific Guidance

지도는 Cohere의 hero photo와 같은 역할. 색·에너지를 담고 chrome은 조용하게.

- **Heatmap fill**: Pale Green Wash → Deep Forest 5분위. opacity 0.7
- **Hover**: outline 2px `#17171c`, fill opacity 0.85
- **Selected**: outline 유지, polygon centroid에 floating preview card
- **Transaction pins**: 저줌에서 적극 클러스터, mono cluster 카운트(`32`), 고줌 12px 검정 도트
- **POI markers**: 전통 핀 X, 작은 pill card + emoji + mono. 카테고리별 토글
- **Map controls**: 우하단 zoom 컨트롤 white pill만, 그 외 컨트롤은 기본 비표시

---

## Do's and Don'ts

### Do
- 흰 캔버스 기본 + Deep Forest / Dark Navy를 강조 밴드로
- 1차 CTA는 near-black + subtle 8px radius on light surface (Card/Input과 동일 어휘)
- 주요 미디어/지도 preview는 22px radius
- coral은 동네 분류 칩과 작은 warm accent에만
- 기술 마커는 mono 대문자 영문 (`PERCENTILE 87`, `WALK 5MIN`)
- 색은 지도·차트가, UI shell은 절제
- 브리핑 섹션 사이 80px+ 여백
- 데이터 출처는 mono 라벨로 투명하게 (`출처: 국토교통부`)

### Don't
- 장난스런 일러스트·마스코트·라운드 친근 아이콘 (이건 분석 도구임)
- coral·blue를 넓은 장식 surface로
- 카드에 무거운 드롭섀도우 (지도 위 floating만 예외)
- 모든 섹션을 카드화 (거래 리스트는 unframed row + rule + 여백)
- headline·body에 emoji (POI 마커 🚇 🏪 🏥 만 예외)
- 8px 미만 라운드 카드를 메인 컨텐츠 블록으로
- UI 배경에 saturated 그라디언트 (지도 히트맵·대형 미디어만)
- mockup에 가짜 데이터 (실제 서울 주소, 원룸 40-90만원 같은 그럴듯한 수치)
- 한 화면에 너무 많은 POI 카테고리 (기본 4-5개 + 토글로 확장)

---

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|--:|---|
| Small Mobile | <425px | 단일 컬럼 브리핑, compact nav, hero 40px |
| Mobile | 425-640px | 지도 풀스크린 + bottom sheet, score cards stack |
| Large Mobile | 640-768px | 2-up score cards, bottom sheet half snap |
| Tablet | 768-1024px | 3-up score cards 복귀, 사이드 패널 옵션 |
| Desktop | 1024-1440px | 풀 브리핑, map split + 사이드 패널 |
| Large Desktop | 1440px+ | wide container, 넉넉한 수직 간격 |

### Mobile Map Behavior

- 지도 viewport 채움, weight slider는 상단 collapsible drawer
- 동네 상세는 bottom sheet (drag handle, 3 snap: peek 20%, half 50%, full 90%)
- 거래 리스트는 bottom sheet 안. 별도 페이지 X
- POI 카테고리 토글은 지도 상단 horizontal scroll strip

### Touch Targets

1차 CTA는 padding으로 44px 최소 hit. 지도 핀은 touch 시 24px hit. 모바일 필터 칩은 14px button text.

### Collapsing Strategy

- 3-zone nav → logo + 햄버거
- 3카드 row → 단일 컬럼
- 좌우 비교 카드 → 수직 stack + 메트릭 밀도 축소
- 거래표 → rule-separated card + 메타 stack

---

## Iteration Guide

1. 지도 / 데이터부터 시작. hero는 마케팅 카피가 아니라 polygon이나 score block.
2. 흰 캔버스 + Deep Forest 또는 Dark Navy 1개 밴드. 중간 톤 페이지 배경 X.
3. 최우선 1개 액션에 `button-primary`, 짝꿍에 `button-secondary`.
4. 데이터 밀집 화면(브리핑·거래)은 무거운 카드보다 unframed row + hairline.
5. 탐색 화면(히트맵)은 floating UI panel + 최소 chrome.
6. coral은 동네 카테고리 칩과 warm 에디토리얼에만. CTA·대형 surface 금지.
7. 데이터 출처/업데이트 시점을 mono 라벨로 항상 노출.
8. 거래 카드는 정직하게. 가짜 listing 금지, 실제 서울 자치구·그럴듯한 수치.

---

## Sample Microcopy

- Hero: "동네를 먼저 이해하세요"
- Sub: "매물을 보기 전에, 467개 법정동을 비교해 보세요."
- CTA Primary: "탐색 시작하기"
- CTA Secondary: "동국대 학생이신가요?"
- Score card label: `AVG MONTHLY RENT` / 평균 월세 (보증금 1000 환산)
- Empty state: "이 조건의 거래가 없습니다. 기간을 늘려보세요."
- Provenance: `DATA: 국토교통부 · UPDATED 2026.05.01`

---

## Known Constraints

- 프로덕션 폰트는 Pretendard. CohereText 라이선스 없음. Cohere의 차분한 기하학적 페이스를 Pretendard 400 + 적절한 스케일로 재현.
- 한국어 우선. 영어 라벨은 mono 기술 마커와 nav/footer 폴백에만.
- 지도 타일은 muted 커스텀 스타일 (Mapbox/Google 기본 채도 X). gray base, soft green 공원, 매우 muted blue 한강.
- 거래 데이터는 지번 중심점까지만. 원룸 building-specific 정밀도는 사생활 보호 위해 사용 X.
