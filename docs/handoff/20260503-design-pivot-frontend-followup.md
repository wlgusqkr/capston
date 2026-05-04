# Task: Cohere-pivot 후속 — 지도 색상 + 라우트 CSS 마이그레이션

`20260503-design-system-pivot` 핸드오프의 후속 작업. 이전 단계에서 토큰과 베이스 UI 프리미티브는 새 시스템(Cohere-inspired: white canvas + Near-Black CTA + Pale Green→Deep Forest 5-stop 히트맵 + Pretendard 400)으로 갈아엎었으나, 두 영역이 아직 구 시스템의 잔영을 갖고 있었다:

1. **`frontend/src/lib/colors.ts`** — Leaflet/Recharts가 CSS var를 못 읽어서 hex가 직박힌 모듈. 4-카테고리 팔레트(파/청/오/적) 그대로였음.
2. **라우트/피처 .css 파일들** — 토큰 alias 덕에 빌드는 깨지지 않았지만 구 톤의 잔영(font-weight 600/700, primary teal 가정, 4-bucket data viz 매핑, manual shadow)이 곳곳에 있었음.

본 작업은 그것들을 일괄 청소.

## 완료된 작업

### `lib/colors.ts` 전면 교체

- 4-bucket `HEATMAP_COLORS = { low/mid1/mid2/high }` → 5-quintile `HEATMAP_COLORS = { q1/q2/q3/q4/q5 }`
- 추가: `HEATMAP_COLORS_ORDERED` 5-튜플 (legend 등에서 인덱스 접근 편의용)
- `HEATMAP_COLORS_DARK`, `CHART_COLORS_DARK` 삭제 (light only)
- `scoreToHeatmapBucket` 분기를 [0,20)/[20,40)/[40,60)/[60,80)/[80,100]으로 재계산
- `scoreToHeatmapColor`의 `theme` 파라미터는 시그니처 유지하되 무시 (back-compat)
- `MAP_POLYGON_STROKE` 재구성: `default/hover/selected` 객체 (color/opacity/weight 분리)와 기존 `.light/.dark` 문자열 alias 보존
- 신규: `MAP_PIN = { default, selected, innerDot }` — 디자인 시스템 transaction pin 사양
- `CHART_COLORS` 재배색: 청록 villa/오렌지 multi/블루 officetel → Ink/Action Blue/Coral (mono ink + 강조 2색). axis는 Slate, grid는 Hairline

### `HeatMap.tsx`

- 폴리곤 stroke을 디자인 시스템 사양대로: 1px white @ 0.6 opacity (default), 1.2px @ 0.85 opacity (hover)
- 데이터 없는 셀 fillColor: 회색 → Soft Stone (`#eeece7`)
- 활성 셀 fillOpacity: 0.6 → 0.7 (DESIGN_SYSTEM.md "Heatmap fill opacity 0.7")

### `DongPanel.tsx`

- `pickBucket` 4-bucket → 5-quintile (`q1..q5`)
- 점수 막대 클래스 `--low/--mid1/--mid2/--high` → `--q1..--q5`

### Map 컴포넌트 CSS

- `Legend.tsx` — 5-step DOM (q1..q5)
- `Legend.css` — `--color-data-*` → `--heatmap-1..5`, mono uppercase 라벨, `--shadow-floating` 적용
- `HeatMap.css` — 모든 manual shadow → `--shadow-floating`, 툴팁 톤 정리, 스타일 토큰 신규명으로
- `DongPanel.css` — 점수 바 fill `--heatmap-1..5`, 섹션 타이틀을 mono uppercase technical marker로, manual shadow → `--shadow-floating`, 헤딩 weight 정리
- `Sidebar.css` — 로고 mark를 Near-Black 배경으로, 활성 레이어 탭을 Near-Black filled pill로, 섹션 타이틀 mono uppercase, font-weight 600/700 모두 제거 (필터 active만 500)
- `ViewToggle.css` — 활성 버튼을 Near-Black filled pill로, manual shadow → `--shadow-floating`

### 라우트 CSS

- `MainMap.css` — manual shadow → `--shadow-floating`, 표면 톤 정리
- `DongDetail.css` — 백 링크 청록 → Action Blue 에디토리얼 underline, sticky CTA bar shadow → `--shadow-floating`, 라운드 12 → 16(--radius-card)
- `Compare.css` — 백 링크 Action Blue, 빈 상태를 카드 프레임 없는 center text로 변경, 표 헤더를 mono uppercase technical marker로, "best in row" cell을 청록 → Pale Green 인셋 + Ink 텍스트, rating 코랄 → Ink (코랄은 카테고리 칩 전용이므로)
- `MyPage.css` — 백 링크 + 재학습 + empty link 모두 Action Blue 에디토리얼, 아바타 청록 원판 → Soft Stone 원판 with Ink 이니셜 (font-weight 700 → 400), 선호 막대 fill 청록 → Near-Black, 트랙 배경 회색 → Soft Stone, 선호 값 라벨 mono treatment
- `Auth.css` — 브랜드 mark 청록 → Near-Black, 타이틀 28px h1 → 48px Section Display, 푸터 링크 Action Blue underline, 라운드 정리

### Detail 섹션 CSS

- `HeroSection.css` — 동 이름 28px h1 → 48px Section Display + negative tracking, 미니 지도 라운드 12 → 22 hero, 핀 라벨 mono uppercase, manual shadow → `--shadow-floating`
- `AmenitySection.css` — 타이틀 22px h2 → 36px Section Heading, KPI 숫자 36px display → 48px Data Display
- `RealEstateSection.css` — 타이틀 36px Section Heading, 기간 셀렉터 active를 Near-Black filled pill로, 표 헤더 mono uppercase technical marker, 그레이 배경 → Soft Stone
- `SimilarDongsSection.css` — 타이틀 36px, 카드명 28px Card Heading, 유사도 % 청록 → Ink mono technical marker, 카드 hover border 청록 → Near-Black
- `ReviewSection.css` — 타이틀 36px, 평균 평점 weight 600 → 400, 별점 filled 코랄 → Near-Black (코랄은 카테고리 칩에만), 카드 타이틀 22px Feature Heading
- `TransitSection.css` — 타이틀 36px, 부제 22px Feature Heading, 1위 역 Soft Stone 인셋, 버스 KPI 36px display → 48px Data Display, 하위 라벨 weight 600 → 400

### Onboarding

- `PreferenceModal.css` — 진행 텍스트 "QUESTION 3 OF 5" 같은 mono uppercase technical marker, 진행 바 fill 청록 → Near-Black, 카드 hover 청록 → Near-Black border + Soft Stone 배경, 카드 CTA radius 8 → pill (32), 결과 eyebrow 청록 → Coral mono(허용된 warm accent), 결과 가중치 막대 3색 → 단일 Near-Black (mono 차트 셸 원칙), 가중치 값 라벨 mono 처리

### 기타

- `routes/NotFound.tsx` — 메인 지도 링크 inline color 청록 → Action Blue underline

## 산출물

- `frontend/src/lib/colors.ts` (전면 재작성)
- `frontend/src/components/Map/HeatMap.tsx` (stroke 사양 적용)
- `frontend/src/components/Map/HeatMap.css` (재작성)
- `frontend/src/components/Map/Legend.tsx` (5-step DOM)
- `frontend/src/components/Map/Legend.css` (재작성)
- `frontend/src/components/Map/DongPanel.tsx` (5-bucket pickBucket)
- `frontend/src/components/Map/DongPanel.css` (재작성)
- `frontend/src/components/Map/Sidebar.css` (재작성)
- `frontend/src/components/Map/ViewToggle.css` (재작성)
- `frontend/src/routes/MainMap.css` (재작성)
- `frontend/src/routes/DongDetail.css` (수정)
- `frontend/src/routes/Compare.css` (수정)
- `frontend/src/routes/MyPage.css` (수정)
- `frontend/src/routes/Auth.css` (수정)
- `frontend/src/routes/NotFound.tsx` (inline 색 교체)
- `frontend/src/components/Detail/HeroSection.css` (수정)
- `frontend/src/components/Detail/AmenitySection.css` (수정)
- `frontend/src/components/Detail/RealEstateSection.css` (수정)
- `frontend/src/components/Detail/SimilarDongsSection.css` (수정)
- `frontend/src/components/Detail/ReviewSection.css` (수정)
- `frontend/src/components/Detail/TransitSection.css` (수정)
- `frontend/src/components/Onboarding/PreferenceModal.css` (수정)

## colors.ts 새 시그니처

```ts
// 5-stop heatmap
HEATMAP_COLORS = { q1: '#edfce9', q2: '#b9dfb6', q3: '#6fa985', q4: '#2c7559', q5: '#003c33' }
HEATMAP_COLORS_ORDERED = [q1, q2, q3, q4, q5] as const
type HeatmapBucket = 'q1' | 'q2' | 'q3' | 'q4' | 'q5'
scoreToHeatmapBucket(score: number): HeatmapBucket  // 5-quintile
scoreToHeatmapColor(score: number, _theme?: 'light' | 'dark'): string  // theme arg ignored

// Polygon stroke (object-form for default/hover/selected, plus legacy string alias)
MAP_POLYGON_STROKE = {
  default: { color: '#ffffff', opacity: 0.6, weight: 1 },
  hover:   { color: '#ffffff', opacity: 0.85, weight: 1.2 },
  selected:{ color: '#17171c', opacity: 1, weight: 2 },
  light:   '#ffffff',  // kept for back-compat (HeroSection)
  dark:    '#17171c',  // kept for back-compat
}

// Transaction pin / POI marker
MAP_PIN = { default: '#17171c', selected: '#ff7759', innerDot: '#ffffff' }

// Recharts (mono ink + 2 accents)
CHART_COLORS = {
  villa:    '#212121',  // Ink
  multi:    '#1863dc',  // Action Blue
  officetel:'#ff7759',  // Coral
  bar:      '#17171c',  // Near-Black
  axis:     '#75758a',  // Slate
  grid:     '#d9d9dd',  // Hairline
}
```

## 의도적으로 보존한 호환성

1. **`MAP_POLYGON_STROKE.light/.dark` 문자열 필드 유지** — `HeroSection.tsx`가 이 형태로 import한다. 새 코드는 `.default.color`를 권장.
2. **`scoreToHeatmapColor`의 두 번째 인자(theme)** — 현재 light only지만 시그니처는 그대로. 호출부가 `'light'`를 명시적으로 넘겨도 동작.
3. **legacy 폰트 alias (`--font-h1-*`, `--font-h2-*`, `--font-body-size`, `--font-caption-size` 등)** — tokens.css에 살아있어 본 작업에서 굳이 강제로 제거하지 않음. 본문/캡션 위주의 작은 텍스트는 alias 그대로 사용 (alias가 새 사이즈로 매핑됨). 헤딩 위주는 새 토큰명(`--font-section-heading-*` 등)으로 교체해 negative tracking 등이 적용되도록 함.
4. **`Card variant="inset"` 의 Soft Stone 배경** — 베이스 컴포넌트에 이미 적용되어 있어 별도 수정 없음.
5. **`Badge variant="success/warning/danger"`** — `success`는 dark green, `warning`은 코랄(시스템에 amber 없음 — 의도적), `danger`는 Error Red. AmenityLevel/SafetyLevel 매핑은 그대로.

## 주요 시각 변화 (의도된 것)

- **메인 지도 히트맵**: 파/청/오/적 4단 → Pale Green Wash → Deep Forest 5-단 연속 그라디언트. fillOpacity 0.7. polygon stroke 1px white @ 60%
- **Sidebar**: 활성 레이어 탭 = 청록 soft 배경 → Near-Black filled pill. 로고 mark 청록 → Near-Black. 모든 헤딩/라벨 weight 600/700 → 400 (또는 mono technical marker로)
- **DongPanel**: 점수 막대가 5-stop으로 단일 색조에서 단조 어두워지는 그라디언트. 섹션 타이틀이 mono uppercase technical marker(작은 회색)로 바뀌어 헤더가 가벼워짐
- **DongDetail Hero**: 동 이름 28px → 48px (Section Display, Pretendard 400 + negative tracking)
- **Compare 표**: "best in row" 강조가 청록 → Pale Green 인셋 + Ink. 별점 코랄 → Ink. 헤더가 mono uppercase
- **MyPage 선호 막대**: 청록 fill → Near-Black, 막대 값이 mono treatment, 아바타가 Soft Stone 원판
- **Auth (Login/Register)**: 타이틀 28px → 48px, 브랜드 mark 청록 → Near-Black, 푸터 링크 Action Blue underline
- **PreferenceModal**: 진행 라벨이 "QUESTION 3 OF 5" 같은 mono uppercase, 카드 hover 청록 → Near-Black border + Soft Stone, 카드 CTA radius 8 → pill 32, 결과 막대 3색 → 단일 Near-Black mono

## 검증

- `npm run build` 통과 — 91.10 kB CSS (이전 87.75 kB), 846 kB JS, 1.42s. CSS 증가는 새 mono technical marker용 `font-family`/`letter-spacing` 명시 추가가 주원인.
- `npm run typecheck` 통과 (no output).
- `npm run dev` 부팅 OK, http://127.0.0.1:5175/ 200 응답.
- **시각 검증 못 했음** — 자동화 환경이라 브라우저 스크린샷 불가. 빌드 + TS + 부팅까지만 확인. 다음 사용자 또는 후속 작업자가 메인 지도/상세/비교/마이페이지를 직접 띄워 잔여 청록·블루·오렌지 hex가 보이는지 확인 권장.

## 알려진 잔여 이슈 / 미완

1. **`--font-caption-size`, `--font-body-size`, `--font-hint-size` 같은 legacy alias가 본문/캡션 사이즈에 광범위하게 남아있음** — 빌드는 깨지지 않고 새 시스템 사이즈로 자동 매핑되므로 의도적으로 두었음. 새 코드 작성 시 가능한 한 `--font-caption-base-*`, `--font-body-base-*`, `--font-micro-*`, `--font-mono-label-*` 등 신 토큰을 직접 쓸 것.

2. **헤딩 negative tracking 일관성** — h1/h2/h3 alias를 그대로 쓰면 negative tracking이 빠진다. 본 작업에서는 페이지의 큰 헤딩(48px+)만 새 토큰으로 갈아탔고, 작은 카드 헤딩 등은 그대로 둔 것이 일부 있다. 큰 시각 차이는 없으나 디자이너가 보고 미세 조정 가능.

3. **HeroSection의 미니 지도 핀** — 현재 흰 stroke + 점수 색 fill. 디자인 시스템상 transaction pin은 Near-Black + 흰 inner dot이지만, 이건 점수 시각화 핀이라 heatmap 색상을 유지하는 게 더 자연스러움. 의도적 차이.

4. **VWorld 타일 자체의 채도** — 디자인 시스템은 muted 커스텀 타일을 권장하지만 본 작업에선 VWorld 그대로. 타일 스타일 변경은 별도 작업으로 분리.

5. **3D / deck.gl 작업이 추후 진행될 경우** — `lib/colors.ts`의 `HEATMAP_COLORS_ORDERED`를 그대로 쓸 것. 5-stop 그라디언트 양 끝점은 디자인 시스템 명시 hex(`#edfce9`, `#003c33`)로 고정됨.

6. **HeatMap.tsx의 selected 상태 표현 미구현** — 현재 클릭 후 패널이 열려도 polygon은 hover 스타일까지만 반응. 디자인 시스템 명시 사양인 "selected outline 2px Near-Black"은 다음 인터랙션 작업 때 적용 권장 (`MAP_POLYGON_STROKE.selected`가 이미 콜러에서 쓸 준비됨).

## 다음 작업자에게 전달할 것

### 차트 추가 시
- `lib/colors.ts`의 `CHART_COLORS`를 import. villa/multi/officetel은 의미가 아니라 단순 시리즈 슬롯이므로 새 차트에서도 1-3번 라인을 그대로 매핑하면 됨.
- 5-stop 시퀀셜 차트가 필요하면 `HEATMAP_COLORS_ORDERED`.
- mono ink + 강조 1색 정책 위배 금지 — 4색 카테고리 막대는 시스템에 안 맞음.

### 새 라우트 추가 시
- 백 링크는 Action Blue underline 패턴 (DongDetail/Compare/MyPage 동일 패턴).
- 큰 페이지 헤딩은 `--font-section-display-*` (48px) 또는 `--font-page-display-*` (60px). h1 alias 쓰면 28px Card Heading이 적용되니 의도와 다를 수 있음.
- 표 헤더는 mono uppercase technical marker (`Compare.css`, `RealEstateSection.css` 패턴 참고).
- floating UI 외에는 box-shadow 금지. 카드 elevation = hairline border + radius.

### 카테고리 칩이 등장할 때
- `<Badge variant="category">대학가형</Badge>` 사용. CSS는 design-system-keeper가 관리하는 `Badge.css`가 처리. 코랄을 라우트 CSS에서 직접 쓰지 말 것.

### 참고
- 직전 핸드오프: `docs/handoff/20260503-design-system-pivot.md`
- 단일 진실: `docs/DESIGN_SYSTEM.md`
- 토큰: `frontend/src/styles/tokens.css`
