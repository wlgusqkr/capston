# Task: Design system 전면 교체 (Cohere-inspired pivot)

`docs/DESIGN_SYSTEM.md`를 단일 진실로 삼아 디자인 토큰과 베이스 UI 프리미티브를 전면 재작성. 기존 청록(#0F6E56) primary + 4색 히트맵 + 600/700 weight 헤딩 시스템은 폐기. 새 시스템은 white canvas + Near-Black(#17171c) CTA + Pale Green→Deep Forest 5-stop 히트맵 + Pretendard 400 본문 + 코랄(#ff7759)은 카테고리 칩 전용.

## 완료된 작업

### 토큰 (`frontend/src/styles/tokens.css`)
- 전체 재작성. 기존 var 이름 80여개를 alias로 보존하면서 hex 값만 새 시스템으로 매핑.
- 신규 raw 컬러 토큰 17개 추가 (`--color-near-black`, `--color-deep-forest`, `--color-soft-stone`, `--color-coral`, `--color-action-blue`, `--color-form-focus-violet`, …).
- 신규 5-stop heatmap 토큰 `--heatmap-1..5` (Pale Green → Deep Forest, OKLCH-ish 보간).
- 9개 지하철 노선 색 토큰 (`--subway-line-1..9`).
- 12-step 신규 타이포 스케일 (`--font-hero-display-*` … `--font-micro-*`) + KPI 전용 `--font-data-display-*` 추가. 폰트 weight는 거의 모두 400; 버튼/액티브 칩만 500.
- Display / mono 폰트 스택 추가 (`--font-family-display`, `--font-family-mono`).
- Spacing 8px 베이스 풀 스케일 (`--space-10/14/16/20/30` 추가).
- Radius 7-단 스케일 (`--radius-xs/sm/lg/card/hero/xl/pill/full`). `--radius-md`는 의도적으로 8px 유지(레거시 보호).
- `--control-height-cta: 44px` 추가 (모바일 hit target).
- Dark mode (`[data-theme='dark']`, `prefers-color-scheme`) 전면 삭제.
- `--shadow-floating`(≤8% 검정) 토큰 추가 — 모달/floating map UI 전용.

### Globals (`frontend/src/styles/globals.css`)
- 헤딩 default weight 400 + KO letter-spacing 0 강제.
- `:focus-visible` 링을 Focus Blue로 통일 (a, button, [role=button]).
- `.mono-label` 유틸리티 추가 (시스템 마커 — `WALK 5MIN`, `LINE 3` 등).
- `::selection` 컬러를 Soft Stone으로.
- 스크롤바 톤 hairline.
- Pretendard import는 그대로.

### UI 프리미티브 재구축
- **`Button.tsx` / `Button.css`** — variant에 `outline`(필터 토글) / `filled`(active 필터) 추가. primary는 Near-Black pill(radius-pill 32px) + 모바일 44px 보장. secondary는 underline 텍스트 링크. ghost는 secondary alias로 유지.
- **`Card.css`** — default(white + border-light + radius-lg 12px), inset(soft-stone fill + transparent border). 그림자 없음.
- **`Badge.tsx` / `Badge.css`** — variant에 `category`(coral 칩, 22px radius), `mono`(uppercase mono technical marker, 1px hairline) 추가. 기존 success/warning/danger/info/neutral은 새 톤으로 재조정.
- **`Score.tsx` / `Score.css`** — 기본 색을 Ink로(monochrome). `tone="neutral"` 옵션 추가. lg 사이즈는 `--font-data-display-*` (48px) 사용. delta는 mono.
- **`Input.css`** — 1px border-light, focus는 2px Form Focus Violet border (blue ring 분리하지 않고 violet으로 일원화). 배경은 white.
- **`Select.css`** — Input과 동일 폼 트리트먼트.
- **`Slider.css`** — weight-slider 스펙 정확히 적용: track 4px Border Light, fill 4px Near-Black, thumb 20px white + 2px Near-Black border. 값 라벨은 mono 14/13px.
- **`Modal.css`** — backdrop Near-Black 55%, 카드 white + 16px radius(`--radius-card`) + Hairline border + `--shadow-floating`(허용된 한 번의 예외). 타이틀은 22px Feature Heading.
- **`Tooltip.css`** — Near-Black surface, white text, 4px radius, 12px micro.

### 검증
- `tsc --noEmit` 통과 (no output).
- `npm run build` 성공 — 87.75 kB CSS, 846 kB JS, 1.45s.

## 산출물

- `frontend/src/styles/tokens.css` (전면 재작성)
- `frontend/src/styles/globals.css` (재작성)
- `frontend/src/components/ui/Button.tsx` (variant 확장)
- `frontend/src/components/ui/Button.css` (재작성)
- `frontend/src/components/ui/Card.css` (재작성)
- `frontend/src/components/ui/Badge.tsx` (variant 확장)
- `frontend/src/components/ui/Badge.css` (재작성)
- `frontend/src/components/ui/Score.tsx` (tone='neutral' 추가, 주석)
- `frontend/src/components/ui/Score.css` (재작성)
- `frontend/src/components/ui/Input.css` (재작성)
- `frontend/src/components/ui/Select.css` (재작성)
- `frontend/src/components/ui/Slider.css` (재작성)
- `frontend/src/components/ui/Modal.css` (재작성)
- `frontend/src/components/ui/Tooltip.css` (재작성)

## 토큰 매핑 표 (구→신)

### Color (semantic alias 유지, 값만 교체)

| 토큰명 | 구 hex | 신 hex / 매핑 | 의도 |
|---|---|---|---|
| `--color-primary` | `#0F6E56` (teal) | `#17171c` (Near-Black) | CTA primary 변경 |
| `--color-primary-hover` | `#0C5C48` | `#000000` (Pure Black) | hover 어둡게 |
| `--color-primary-soft` | `#E2EFEA` | `#eeece7` (Soft Stone) | 칩/배지 배경 |
| `--color-secondary` | `#BA7517` (orange) | `#ff7759` (Coral) | 카테고리 칩 전용 (CTA 금지) |
| `--color-secondary-hover` | `#A16513` | `#ff5a3a` | 코랄 어둡게 |
| `--color-secondary-soft` | `#F6EADB` | `#fff1ec` | pale coral wash |
| `--color-bg` / `--color-surface` | `#FFFFFF` | `#ffffff` | 동일 |
| `--color-surface-inset` | `#F9F9F8` (gray-50) | `#eeece7` (Soft Stone) | 따뜻한 인셋 |
| `--color-text` | `#2C2C2A` | `#212121` (Ink) | 약간 진하게 |
| `--color-text-muted` | `#5F5E5A` | `#75758a` (Slate) | 차가운 톤 |
| `--color-text-subtle` | `#888780` | `#93939f` (Muted Slate) | 동일 의미 |
| `--color-border` | `rgba(0,0,0,0.08)` | `#e5e7eb` (Border Light) | 명시적 hex |
| `--color-border-strong` | `#D3D1C7` | `#d9d9dd` (Hairline) | 차가운 톤 |
| `--color-focus-ring` | `rgba(15,110,86,0.35)` | `rgba(76,110,230,0.40)` (Focus Blue) | 포커스 컬러 변경 |
| `--color-backdrop` | `rgba(20,20,18,0.45)` | `rgba(23,23,28,0.55)` (Near-Black) | 더 진하게 |
| `--color-success` | `#1D9E75` | `#1f7a5e` | Deep Forest 계열 |
| `--color-success-soft` | `#E1F1EA` | `#edfce9` (Pale Green) | |
| `--color-warning` | `#EF9F27` | `#ff7759` (Coral) | 시스템에 amber 없음 |
| `--color-warning-soft` | `#FCEBD0` | `#fff1ec` | |
| `--color-danger` | `#E24B4A` | `#b30000` (Error Red) | 차분한 적 |
| `--color-danger-soft` | `#FADAD9` | `#fbe5e5` | |
| `--color-info` | `#378ADD` | `#1863dc` (Action Blue) | |
| `--color-info-soft` | `#DBEAF8` | `#f1f5ff` (Pale Blue) | |
| `--color-data-low/mid1/mid2/high` | 4색(파/청/오/적) | `--heatmap-2/3/4/5` 매핑 | 5-stop으로 통합 |
| `--color-gray-50/100/200/400/600/900` | 따뜻한 회색 | 새 시스템 톤으로 alias | back-compat 유지 |

### Typography (alias 보존, 의미 일부 변경)

| 토큰 | 구 (size/weight) | 신 (size/weight) | 비고 |
|---|---|---|---|
| `--font-h1-*` | 28px / 600 | 28px / 400 | weight만 변경 (Card Heading) |
| `--font-h2-*` | 22px / 600 | 22px / 400 | (Feature Heading) |
| `--font-h3-*` | 18px / 600 | 18px / 400 | |
| `--font-display-*` | 36px / 700 | 36px / 400 | (Section Heading) |
| `--font-body-*` | 15px / 400 | 16px / 400 | size 1px 증가 |
| `--font-caption-*` | 13px / 400 | 14px / 400 | size 1px 증가 |
| `--font-hint-*` | 11px / 500 | 12px / 400 | size 증가 + weight 감소 |
| `--letter-spacing-ko` | `-0.01em` | `0` | DESIGN_SYSTEM 한글 본문 규칙 |

### Radius (alias 의도적 보호)

| 토큰 | 구 | 신 | 비고 |
|---|---|---|---|
| `--radius-sm` | 6px | 8px | 디자인 시스템 sm |
| `--radius-md` | 8px | 8px | **변경 없음 — 레거시 보호** |
| `--radius-lg` | 12px | 12px | **변경 없음 — 레거시 보호** |
| `--radius-card` (신규) | — | 16px | 디자인 시스템 md(브리핑 데이터 블록) |
| `--radius-hero` (신규) | — | 22px | 디자인 시스템 lg(hero 미디어) |
| `--radius-xl` (신규) | — | 30px | 필터 pill outline |
| `--radius-pill` (신규) | — | 32px | 1차 CTA |

## 의도적으로 변경된 것 vs 호환 유지된 것

### 의도적으로 시각이 바뀌는 것 (사용자가 즉시 알아챌 수 있음)
- 모든 primary 버튼: 청록 → Near-Black pill (32px radius)
- 모든 헤딩의 weight: 600/700 → 400 (typography 톤이 가벼워짐)
- 본문 사이즈: 15px → 16px
- 인풋 focus: teal border + teal ring → violet 2px border (no ring)
- 모달 카드 모서리: 12px → 16px
- 카드 인셋 배경: 차가운 회색-50 → 따뜻한 Soft Stone
- 히트맵: 파/청/오/적 4단 → Pale Green→Deep Forest 5-단(연속 그라데이션)
- 텍스트 컬러: 따뜻한 회색 → 차가운 슬레이트
- Score 컴포넌트의 큰 숫자: 36px/700 → 48px/400 (lg 사이즈)
- 다크 모드: 완전히 사라짐 (light only)

### Alias로 호환 유지된 것 (코드 변경 없이 자동으로 새 색이 적용됨)
- `--color-primary*`, `--color-secondary*`, `--color-text*`, `--color-border*`, `--color-success/warning/danger/info*` 등 80개 var 이름 모두 그대로 사용 가능.
- `--color-gray-50..900` legacy gray scale도 새 톤으로 alias.
- `--font-h1..h3-*`, `--font-display-*`, `--font-body-*`, `--font-caption-*`, `--font-hint-*` 모두 그대로 사용 가능 (하지만 weight 등 의미가 약간 변경됨).
- `--radius-sm/md/lg/full` 그대로 사용 가능 (md=8px, lg=12px 의도적 보호).
- `--space-1..8` 그대로, 추가로 10/14/16/20/30 사용 가능.

## 다음 작업자에게 전달할 것

### 페이지/feature 컴포넌트가 손봐야 할 곳 (선택, 점진 마이그레이션)
다음 파일들은 아직 구 시스템 잔영(예: `--color-data-low/mid1/mid2/high` 직접 참조, 청록 가정)이 있다. 토큰이 alias로 동작하므로 **빌드는 깨지지 않지만**, 새 시스템 본연의 모습을 보여주려면 점진적 리디자인 필요:

- `frontend/src/lib/colors.ts` — `HEATMAP_COLORS` / `HEATMAP_COLORS_DARK` / `CHART_COLORS*`가 구 hex를 하드코딩. `lib/colors.ts`는 Leaflet/Recharts가 CSS var를 못 읽기 때문에 의도적으로 hex를 둔 파일. **새 5-stop 히트맵으로 교체 필요** (Map 작업자 = `frontend-engineer`에게 위임).
- `frontend/src/components/Map/Legend.css` — `--color-data-*`를 사용 중. 새 5-단 토큰(`--heatmap-1..5`)으로 교체 권장.
- `frontend/src/components/Map/DongPanel.css`, `DongPanel.tsx` — 동일.
- `frontend/src/components/Onboarding/PreferenceModal.css` — 동일.
- `frontend/src/components/Detail/ReviewSection.css`, `routes/Compare.css` — `--color-secondary`(이제 Coral)를 텍스트 색으로 사용 중. 의도가 "강조 라벨"이면 Action Blue나 Ink로 바꿔야 함 (코랄은 카테고리 칩에만).
- `frontend/src/components/Map/Sidebar.css` — `--color-primary` 배경 사용. 이제 Near-Black이라 의도와 다를 수 있음 (사이드바를 black 패널로 재해석할지, light로 바꿀지 결정 필요).

### 새 코드 작성 시 가이드
- 1차 CTA: `<Button variant="primary">탐색 시작하기</Button>` (자동으로 Near-Black pill)
- 필터 토글: `<Button variant="outline">원룸/오피스텔</Button>` ↔ active 시 `variant="filled"`
- 인라인 링크 액션: `<Button variant="secondary">더 자세히</Button>`
- 동네 분류 칩: `<Badge variant="category">대학가형</Badge>`
- 시스템 마커: `<Badge variant="mono">WALK 5MIN</Badge>` 또는 `<span className="mono-label">WALK 5MIN</span>`
- 큰 KPI 숫자: `<Score value={55} unit="만원" size="lg" tone="neutral" />` (Ink 색)
- 모달 가로폭은 명시 (`maxWidth={600}` 등). 16px radius 기본.

### 직접 참조 권장 토큰 (신규)
- 다크 밴드: `--color-deep-forest` 또는 `--color-dark-navy` 위에 white text
- score-card: `background: var(--color-soft-stone)` + `border-radius: var(--radius-card)`
- floating map UI: `--shadow-floating` 한 번만 허용
- 에디토리얼 링크: `<a className="editorial-link">`

## 미완 / 알려진 이슈

1. **히트맵 중간 3색은 직접 보간한 hex** — 정확한 OKLCH 보간이 아니라 시각적으로 단조 어두워지는 hex(`#b9dfb6 / #6fa985 / #2c7559`). 디자이너가 보고 톤을 미세 조정할 수 있음. 양 끝(`#edfce9`, `#003c33`)은 디자인 시스템 명시 hex로 고정.
2. **`lib/colors.ts`는 아직 구 4-색 히트맵** — Leaflet/Recharts 콜러 사이드 변경이 동반되어야 안전. 본 핸드오프에선 변경하지 않음. `frontend-engineer`에게 위임.
3. **`color-secondary`(이제 코랄)를 CTA로 못 쓴다는 규칙은 토큰 레이어에서 강제 불가** — 컴포넌트 레이어/리뷰에서 강제. Button의 `variant="primary"`는 Near-Black 고정이라 코랄 CTA가 만들어지지 않음 (정책적으로 OK).
4. **`color-warning`이 코랄과 같은 hex** — 의미가 "warning"인지 "category 강조"인지 코드 컨텍스트로 구별. 디자인 시스템에 별도 amber가 없어 의도적.
5. **Korean 헤딩의 negative tracking** — 새 토큰 (`--font-card-heading-tracking: -0.28px` 등)을 컴포넌트 CSS에서 명시적으로 적용. 페이지 CSS가 alias만 쓰면 negative tracking이 없는 상태로 렌더링됨. 페이지 리디자인 시 `--font-{role}-tracking` 토큰을 같이 적용 권장.
6. **subway 노선 4-9호선만 추가** — 신분당선/GTX-A 등 추가 노선은 추후 Map 작업 시 합류.
7. **존재하지 않는 라우트들의 페이지 CSS 톤 정합성** — 라우트 .css 파일들은 alias 호환만으로 빌드는 통과하지만, 실제 새 시스템 톤(Soft Stone 카드, mono 라벨, 80px 섹션 갭)은 페이지별 리디자인이 필요. Phase 2 작업.

## 참고 파일

- `docs/DESIGN_SYSTEM.md` — 단일 진실
- `docs/handoff/20260502-step2-design-foundation.md` — 구 시스템 핸드오프 (참고용, 더 이상 권위 없음)
