# PLAN: Design Polish v2 — Desktop UI Rework

**Date:** 2026-05-04
**Branch:** main (will land via feature branches per item)
**Sequel to:** `/design-review` 2026-05-04 (11 fixes shipped, 19 deferred)
**Scope authorization:** desktop-only ([no mobile support](../../.. — see project memory)) + structural rework allowed (no surface-only polish)
**Out of scope:** backend/API/DB changes; mobile responsive (deliberately wontfix); auth flow changes
**Design system source of truth:** `.claude/DESIGN_SYSTEM.md` (NOTE: moved from `docs/` to `.claude/` in commit `ed67691` — internal reference, not public docs site)

---

## TL;DR

Four structural reworks (R-1 to R-4) reframe MainMap, navigation, DongDetail, MyPage to match the design system's "Cohere-inspired analytical terminal" intent and absorb 5 of the deferred high/medium findings as side-effects. Eleven smaller polish/dedup items (P-1 to P-11) close the rest.

Estimated scope: 3-4 sub-agent sessions. **Cap is the demo on 2026-06-05** — anything that can't ship cleanly by 2026-05-25 must be re-scoped or dropped.

---

## Why now

The just-completed `/design-review` shipped 11 surgical fixes (commits `66c2adb` → `b1ecd12`). The remaining gap isn't more surgical fixes — it's that the **structural shape of the screens** drifts from `.claude/DESIGN_SYSTEM.md`:

| DS spec says | Today ships |
|---|---|
| "Exploration: full-bleed map + floating UI panel" | Permanent 280px left rail consumes 19% of the canvas |
| "Mono labels are system markers (`WALK 5MIN`, `PERCENTILE 87`)" | Korean section names ("레이어", "가중치") rendered as 13px mono uppercase — wrong subject for that treatment (post-/design-review F-03 fix moved them to `<div>` but visual treatment still mismatched) |
| "Hero photo / score block as page anchor" | MainMap H1 is `sr-only`; DongDetail score chip is buried under amenity grid |
| "Cards earn their existence — no decorative card grids" | DongDetail wraps every section in `<Card>`; MyPage stacks 4 cards vertically |
| "Floating chrome: top nav 3-zone (logo / mode switch / user)" | No global nav; each route duplicates its own back link + crumb |

These aren't bugs we can patch — they're structural choices that are **nearly invisible to a quick reviewer** but accumulate into "this looks like a SaaS template that never finished" instead of "this looks like a Cohere-tier research terminal." The 2026-06-05 demo benefit from closing this gap is large; the post-mockup implementation effort is medium.

---

## Structural reworks

### R-1: MainMap → full-bleed map + progressive-disclosure floating UI

**DS reference:** `.claude/DESIGN_SYSTEM.md` §Layout > Grid Patterns, §Components > `map-floating-panel`, §Map UI Specific Guidance.

**Outside-voice revision:** initial draft showed 4 always-visible panels at every corner. Both Codex and the Claude subagent flagged that as Google-Maps-style card constellation, not Cohere-tier minimal chrome. **Revised: progressive disclosure.** First load shows the absolute minimum chrome; weight + filter + compare appear when invoked.

**What changes (DOM/CSS):**

```
BEFORE:
  ┌──────────────┬───────────────────────────────────┐
  │ [sidebar]    │                                   │
  │  280px       │           <map>                   │
  │  full        │       (squeezed)                  │
  │  height      │                                   │
  └──────────────┴───────────────────────────────────┘

AFTER (first load — ~minimum chrome):
  ┌──────────────────────────────────────────────────┐
  │  [TopNav: 슬기로운 자취생활 / 탐색 / 로그인]      │  ← R-2 (56px)
  ├──────────────────────────────────────────────────┤
  │                                                  │
  │  [Layer pills: 종합·전월세·생활시설·교통]         │  ← top-left (40px tall, ~480 wide)
  │                                                  │
  │              <map>                               │
  │           (full-bleed)                           │
  │                                                  │
  │  [기준 (3) ▾] ← compact pill                    │  ← bottom-left when collapsed (140 wide, 40 tall)
  │                                                  │
  │                            [Legend] [+]          │
  │                            [bottom-right]  [−]   │
  └──────────────────────────────────────────────────┘

ON WEIGHT-PILL CLICK or first-time tooltip:
  the [기준] pill expands UPWARD into a panel
  containing the 3 sliders + filter checkboxes
  (~280×320). Secondary "5번 비교로 자동 추천 →" CTA
  inside the panel. Compare basket count appears
  as a floating chip top-right ONLY when ≥1 dong
  added.
```

**The visible-on-load surface budget (1280×720 reference):**

| Element | Position | Size | When visible | z-index |
|---|---|---|---|---|
| TopNav (R-2) | sticky top, full width | 1280 × 56 | always | 1000 |
| Layer pill row | top-left, inset 24,80 | ~480 × 40 | always (`/` only) | 500 |
| 기준 pill (collapsed) | bottom-left, inset 24,24 | 140 × 40 | always (`/` only) | 500 |
| 기준 panel (expanded) | bottom-left, inset 24,24 | 280 × 360 | on click of pill, ESC to close | 510 |
| Compare chip | top-right, inset 24,24 | ~120 × 40 | only when basket ≥ 1 | 500 |
| Legend | bottom-right, inset 24,80 | 144 × 80 | always (`/` only) | 500 |
| Leaflet zoom | bottom-right, inset 24,24 | 40 × 80 | always (Leaflet default position) | 500 |
| DongPanel (selection) | right edge, slide-in | 400 × full-h | only on polygon click | 600 |
| TransactionPanel | right edge | 400 × full-h | only on pin click | 600 |
| KernelScorePanel | right edge | 400 × full-h | only on map ctrl-click | 600 |
| PreferenceModal | center | 600 × auto | only when invoked | 1100 |

**Mutual exclusion rules (z-coordinate map):**
- DongPanel / TransactionPanel / KernelScorePanel are **mutually exclusive**: at most one slide-in panel open at a time. Opening one closes the others.
- 기준 panel collapses if a slide-in panel opens (saves ~280px of canvas).
- Compare chip expands inline (small dropdown) OR navigates to `/compare` when clicked — see D-9.
- At 1280×720, the right slide-in panel (400px) leaves 880px of map width, with Layer pills at top-left. No collision.

**Concrete deltas:**
- `MainMap.css` — remove `display: flex` row, change to `position: relative` shell. `.sidebar` removed entirely. Map container `width: 100%; height: calc(100vh - 56px)` (56 = top nav height).
- New components: `LayerPills`, `CriteriaPanel` (combines weight + filter), `CompareChip`, `LegendPanel`. Each is `<aside class="map-floating-panel">` (existing class).
- Existing slide-in panels (DongPanel, TransactionPanel, KernelScorePanel) — keep as-is (post-F-20 inert fix), just verify they coexist with the new floating chrome.
- First-time visit: small ephemeral coach-mark on the 기준 pill ("← 가중치 조절") that auto-dismisses after 4s or on first click. No localStorage; resets per session (CLAUDE.md rule). See D-10.
- Empty state for the map (e.g., score data fetch failed): existing `.main-map__overlay--error` already handles this, just verify it renders above the floating chrome.

**Closes:** F-01 (sidebar deviation), F-02 partial (TopNav wordmark + per-panel headings), F-25 partial.

**Acceptance:**
- [ ] No `.sidebar` element on `/`.
- [ ] Map fills the viewport minus 56px top nav.
- [ ] First load shows: TopNav, Layer pills, 기준 pill (collapsed), Legend, Leaflet zoom — that's it. No always-on weight panel, no always-on filter panel, no always-on compare panel.
- [ ] 기준 pill expands UPWARD on click into a 280×360 panel. ESC collapses it.
- [ ] Compare chip appears top-right only when basket ≥ 1.
- [ ] Slide-in DongPanel coexists with floating chrome at 1280×720 with no overlap (verify visually + via JS bbox).
- [ ] All existing functionality reachable: layer tabs, weight sliders, filter checkboxes, compare basket → /compare, polygon-click → DongPanel.

---

### R-2: Global TopNav (3-zone)

**DS reference:** `.claude/DESIGN_SYSTEM.md` §Layout > Grid Patterns: "Top nav: 3-zone — logo 좌, mode switcher 가운데(`탐색/브리핑/미리보기`), user/login 우".

**Outside-voice revision:** initial draft used `탐색 / 브리핑 / 비교` as a 3-mode switcher with `브리핑` route-dependent on last-selected dong. Both Codex and the subagent flagged this as a broken mental model — `브리핑` is a "recent detail" shortcut, not a stable mode. Subagent also flagged that the mode switcher on `/login` and `/register` is meaningless. **Revised: contextual nav.**

**What changes:**
- New component `frontend/src/components/Layout/TopNav.tsx` + `TopNav.css`.
- Render in `App.tsx` above `<Routes>` so every route shares it.
- **Three zones, but center zone is contextual:**
  - **Left:** brand mark "슬" + wordmark "기로운 자취생활" (matches login/register card composition). Click → `/`.
  - **Center (CONTEXTUAL — varies by route):**
    - On `/` (탐색): empty (the map IS the whole content).
    - On `/dong/:slug`: shows the dong name as a breadcrumb-style label (`공릉1동`) rendered as the page H1 — this gives the page its visible monumental anchor that R-3 hero also reinforces. NO mode switcher.
    - On `/compare`: shows `동네 비교` (already the H1 from F-13 fix).
    - On `/mypage`: shows `{nickname}` — the user's name IS the page identity (matches R-4 hero).
    - On `/login`, `/register`: empty.
  - **Right (CONTEXTUAL):**
    - On `/` and content routes: auth zone — `로그인 →` link if unauthed, else `{nickname} · 마이페이지`.
    - On `/login`: `회원가입 →` link only.
    - On `/register`: `로그인 →` link only.
    - **NO mode switcher** anywhere (decision D-5 revised — see below).
- The `compare basket count` lives on `/` as a floating chip (R-1), NOT in TopNav. On other routes, basket count is shown next to the user's name on hover OR in the compare empty state.
- Per-route back links (`← 지도로`) on `/login`, `/register`, `/dong/:slug`, `/compare`, `/mypage` removed — TopNav logo click handles "back to map".
- Height: 56px (`--space-7`).
- Surface: white with bottom hairline (`border-bottom: 1px solid var(--color-hairline)`).
- Sticky top.

**Closes:** F-25 (three duplicate topbar implementations — all routes converge on TopNav), part of F-02 (visible page-context heading in TopNav center on every route).

**Acceptance:**
- [ ] One `<TopNav>` element at top of every route.
- [ ] Removed `.dong-detail__topbar`, `.compare__topbar`, `.mypage__topbar` (and their CSS).
- [ ] Center zone correctly contextual per route (verify all 7 routes including 404).
- [ ] Auth state correctly rendered in right zone.
- [ ] No mode-switcher pills (D-5 revised — Codex finding #3).
- [ ] `/login` and `/register` show only logo + auth-toggle link.

---

### R-3: DongDetail rework — monumental hero + dense data

**DS reference:** §Components > `score-card`, `transaction-row`; §Layout > Whitespace ("80px+ between data blocks"); §Hierarchy ("페이지당 거대 헤드라인 1개").

**Outside-voice revisions (3):**
1. Codex flagged that initial draft labeled `노원구` as `mono-label` — that's the **same mono-on-Korean misuse** the plan claims to fix elsewhere. Mono is for English system markers (`WALK 5MIN`, `PERCENTILE 87`), not Korean place names. Revised: 노원구 is rendered as caption/body metadata.
2. Codex flagged that "hero takes the top viewport" is too vague — could push budget/transit below the fold. Revised: explicit hero height `min(520px, calc(100vh - 56px))`. The first fold must show hero PLUS the start of "BUDGET / RENT".
3. Both voices flagged D-3 (move CTA to TopNav OR float bottom-right) as wrong — DongDetail isn't a map page; floating bottom-right reads as mobile FAB. Revised: page-local action group in hero right column + scroll-sticky compact action rail. See D-3 below.
4. Subagent flagged that unframed rows with only 3-4 cells will look "lost in whitespace". Revised: amenity rows get a 4th data cell (trend or rank arrow), AND content max-width is 720px to keep rows dense.

**What changes:**

```
BEFORE (current):
  ← 지도로 / 공릉1동
  공릉1동 (48px H1)
  95점 [위치]
  [mini-map card]
  ─────
  부동산 시세 (boxed card)
  편의시설 (8 boxed amenity cards)
  교통 (boxed cards)
  자취생 리뷰 (boxed cards)
  비슷한 동네 (boxed cards)
  [sticky bottom CTA bar]

AFTER:
  [TopNav: 슬 / 공릉1동 / jihyeon ▾]                ← R-2 (page H1 lives here)
  ┌─── HERO (height: min(520px, calc(100vh - 56px))) ───┐
  │ 노원구  (caption 14px, --color-text-subtle)         │
  │ 공릉1동  (60px Page Display, h1 inside hero too)    │
  │ 매일 데이터 갱신 · 467개 동 중 8위 (Body 16 subtle) │
  │                                                      │
  │ ┌──────────────────┐    ┌──────────────────────────┐│
  │ │ 95 / 100         │    │  [지번 미니맵]            ││
  │ │ ←── score 60px   │    │   280 × 280              ││
  │ │ [위치] coral chip│    │   --radius-hero (22px)   ││
  │ │ MetricBar bars   │    │                          ││
  │ │ 전월세  ████░░ 90│    └──────────────────────────┘│
  │ │ 생활시설 █████ 95│                                 │
  │ │ 교통    ███░░░ 78│   ┌──────────────────────────┐│
  │ │                  │   │ Action group (page-local)││
  │ │                  │   │ [비교에 추가] primary     ││
  │ │                  │   │ [찜하기]      secondary   ││
  │ │                  │   │ [공유]        secondary   ││
  │ └──────────────────┘   └──────────────────────────┘│
  └──────────────────────────────────────────────────────┘
  [80px gap]
  ─── BUDGET / RENT (mono section eyebrow — English mono is correct here)
  부동산 시세  (Section Heading 36px)
  ┌─ chart ──┬─ chart ──┐    ← unframed grid, hairlines between
  └──────────┴──────────┘
  ─── 최근 실거래 ── (caption 14, NOT mono — Korean)
  [transaction-row × 5]                            ← already DS-spec
  [80px gap]
  ─── AMENITIES (mono — English)
  편의시설  (Section Heading 36px)
  편의점       84/100  69.6/㎢  TOP 12%   ← 4 cells now (added rank %), max-width 720
  카페         99/100  82.0/㎢  TOP  2%
  …
  [80px gap]
  ─── TRANSIT (mono)
  교통  (Section Heading)
  가까운 지하철역 (Feature Heading 22px, NOT mono)
  ─ row ─ row ─ row ─
  버스 (Feature Heading)
  48 노선  143 정류장
  [80px gap]
  ─── VOICES (mono)
  자취생 리뷰  (Section Heading)
  ★★★★★ 4.6 (24건)
  ─ unframed reviews ─
  [80px gap]
  ─── NEARBY (mono)
  비슷한 동네  (Section Heading)
  [3-4 dong rows with score + diff bar — unframed]
  
  [scroll-sticky compact action rail appears at bottom-right after
   user scrolls past hero: pill row [비교에 추가] [찜] [공유]]
```

**Action affordance (D-3 resolution):**
- Hero contains a primary action group (right column, see ASCII) — visible on first fold.
- After scrolling past hero (`IntersectionObserver` on the hero element), a compact pill rail slides in from bottom-right with the same 3 actions in mini form. Disappears when scrolling back to hero.
- This is page-local, NOT a global FAB and NOT a TopNav addition. Matches DS "floating chrome" only-on-map rule by being page-content-aware, not screen-floating.

**Concrete deltas:**
- Hero refactor: `<DetailHero>` component, two-column flex (text left, mini-map + actions right), explicit height per spec above.
- Strip `<Card>` from `RealEstateSection`, `AmenitySection`, `TransitSection`, `ReviewSection`, `SimilarDongs`. Replace with `<section className="detail-section">` (`padding: var(--space-10) 0` = 80px, `border-top: 1px solid var(--color-hairline)`, content `max-width: 720px`).
- Each section: mono eyebrow `<p class="mono-label">BUDGET / RENT</p>` (English mono — DS spec). Korean sub-labels stay normal weight.
- Amenity row: 4 cells — name | score/100 | density/㎢ | rank-percentile (NEW, e.g., `TOP 12%`). Uses `transaction-row` styling pattern.
- Sticky bottom CTA bar (`.dong-detail__cta-bar`) — remove. Replace with hero action group + scroll-sticky pill rail (D-3).
- F-11 (amenity "광고" label) — verify in source: if it's actually rank/position metadata, rename in copy. If it's an unimplemented ad slot, remove. Decision D-4 below.

**Closes:** F-23 (over-carded), F-12 (80px rhythm explicit), F-02 partial (TopNav center + hero combined give clear page identity), F-11 (clarified in D-4).

**Acceptance:**
- [ ] No `<Card>` wrapper on detail page sections.
- [ ] Hero height: `min(520px, calc(100vh - 56px))`.
- [ ] First fold shows hero + start of "BUDGET / RENT" (verify at 1280×720 and 1440×900).
- [ ] Each section: 80px top padding, 1px hairline top, content max-width 720px.
- [ ] Each section has a mono ENGLISH eyebrow; Korean section headings stay normal-cased Pretendard.
- [ ] 노원구 in hero is rendered as caption (Pretendard 14px, --color-text-subtle), NOT mono.
- [ ] Amenity rows have 4 cells (added rank % column).
- [ ] No sticky bottom CTA bar; instead: hero action group + scroll-sticky pill rail bottom-right after hero leaves viewport.
- [ ] All actions reachable in both states (hero + scrolled).

---

### R-4: MyPage rework — 2-column workspace

**Outside-voice revision:** initial draft was a vertical stack of unframed sections. Codex flagged that this is "still not a workspace, just a vertical pile". Subagent flagged missing edit states + empty states. Revised: explicit 2-column desktop layout with profile/preferences as a left rail and activity (favorites + reviews) as a right column.

```
BEFORE:
  [topbar]
  My Page
  [Card: profile]
  [Card: weights]
  [Card: favorites grid]
  [Card: reviews list]

AFTER (1280×900 reference):
  [TopNav: 슬 / jihyeon / 로그아웃]                ← R-2 center = nickname (R-2 contextual)
  ┌─────────────────────┬───────────────────────────┐
  │ LEFT (max 360px)    │ RIGHT (max 720px, scrolls)│
  │                     │                           │
  │ ─── PROFILE         │ ─── FAVORITES             │
  │ jihyeon (60px)      │ 찜한 동네 (5)              │
  │ 동국대 · 3학년       │ ─ unframed row × 5 ─       │
  │ [수정] secondary     │   공릉1동 │ 노원구 │ 95   │
  │                     │   미아동  │ 강북구 │ 90   │
  │ [80px gap]          │   …                       │
  │                     │ [전체 보기 →] secondary    │
  │ ─── MY WEIGHTS      │                           │
  │ 내 자취 기준 (28px) │ [80px gap]                │
  │ MetricBar 전월세 40 │                           │
  │ MetricBar 생활시설35│ ─── MY REVIEWS            │
  │ MetricBar 교통    25│ 내가 쓴 리뷰 (3)           │
  │ [선호 학습 다시 →]  │ ─ unframed row × 3 ─       │
  │   secondary         │   공릉1동 ★★★★★         │
  │                     │   "근처 편의점 많음 …"    │
  │  (sticky on scroll) │   2일 전                  │
  │                     │   …                       │
  │                     │ [더 보기]                 │
  └─────────────────────┴───────────────────────────┘
  
  At <1080px wide: collapses to single column (left → on top, right → below).
  At <768px: not supported (mobile WONTFIX).
```

**Edit states (subagent gap):**
- Profile [수정]: opens an inline edit panel (NOT a modal — modal is for transient flows). Replace static rows with form fields, primary [저장] / secondary [취소]. Validation inline.
- Weight [선호 학습 다시 →]: navigates to `/?onboarding=1` (existing flow).
- Favorite remove: each row has a hover-reveal × button. Confirm via `confirm()` browser dialog OR inline "확실해요? [예] [아니요]" — pick the latter for warmth (decision baked-in, no D-* needed).
- Review edit: each review row has hover-reveal [수정] [삭제] secondary actions.

**Empty states (per the state coverage table above):**
- Profile: never empty (logged-in user has a profile).
- Weights: empty if user skipped onboarding → primary action `[선호 학습 시작 →]`.
- Favorites: empty → "메인 지도에서 동네를 찜해보세요. [메인 지도 →]"
- Reviews: empty → "동네 상세에서 리뷰를 남겨보세요." (no primary action — passive)

**Concrete deltas:**
- `MyPage.tsx` — restructure into `<main className="mypage"><aside className="mypage__rail">...</aside><div className="mypage__content">...</div></main>` two-column flex.
- Strip `<Card>` from all MyPage sections.
- Left rail: `position: sticky; top: 56px+24px; height: fit-content; max-height: calc(100vh - 56px - 48px)`. Stays visible while user scrolls right column.
- Use `<MetricBar>` (R-5) for weights.
- Inline edit form for profile (not modal).
- Per-row hover-reveal actions for favorites + reviews.

**Closes:** F-23 (MyPage portion), depends on R-5 (MetricBar).

---

### R-5: Component dedup — `<MetricBar>`

**Outside-voice revision:** initial draft conflated MetricBar AND RouteTopbar into one item. Codex flagged that R-5 owns chrome dedup that R-2 also touches — mixed ownership. Revised: R-5 = MetricBar only. ALL topbar removal/dedup belongs to R-2 (including the Compare breadcrumb fragment, which after F-13 promoted "동네 비교" to h1, just becomes a styled span when TopNav center handles page identity).

**Closes:** F-24 (3× score-bar). F-25 fully owned by R-2.

- `frontend/src/components/ui/MetricBar.tsx` — props: `label` (string), `value` (number 0-100), `unit?` ('%' or '/100' or 'pts'), `tone?` ('score' | 'weight'), `size?` ('sm' | 'md').
  - Replaces: `.dong-panel__bar`, `.kernel-panel__bar`, `.mypage__bar`.
  - Track 8px tall, fill colored per tone (score → heatmap-q4 green, weight → near-black).

---

### R-6: Slider dedup (F-30)

`KernelScorePanel.css` re-rolls a native `input[type=range]` with a 16px thumb + linear-gradient track. DS spec says 20px white thumb + 2px Near-Black border. Replace the inline implementation with the existing `<Slider>` primitive. CSS-only delta + small JSX rewrite.

---

## Polish + cleanup

| ID | Change | File(s) | Note |
|---|---|---|---|
| P-1 (F-29) | Coral warning value digits → muted-slate | `Score.css:53` | Single line. |
| P-2 (F-31) | Delete dead `--color-data-*` aliases | `tokens.css` (4 lines) | Verified zero call sites. |
| P-3 (F-14) | Compare row label gets directional hint (`평균 환산 월세 ↓`) | `Compare.tsx`, `Compare.css` | One arrow per row. |
| P-4 (F-28) | Tokenize floating component magic px (`--map-control-size: 40px`, `--legend-bar-w: 144px`, `--hero-map-side: 280px`, `--tx-filter-min-w: 220px`) | `tokens.css` + 4 consumers | Pure rename. |
| P-5 (F-32) | Collapse `--radius-md` overload — rename CTA usage to `--radius-sm` (8px); chip uses `--radius-sm` too | `tokens.css` + ~6 consumers | Risk: visual delta if values diverge — verify both are 8px first. |
| P-6 (F-15) | Compare empty-state action → `<Button variant="secondary">` | `Compare.tsx` | One JSX swap. |
| P-7 (F-18) | 404 description `word-break: keep-all` for Korean | `NotFound.tsx` (inline style) | One CSS line. |
| P-8 (F-10) | Login/Auth card max-width 360 → 480 | `Auth.css` | One value change — verify visual. |
| P-9 (F-05) | Mode tabs height 38 → 44px | (in R-1 floating layer panel) | Folded into R-1 floating Layer panel since the bar moves anyway. |
| P-10 (F-06) | Leaflet attribution font (third-party) | — | **WONTFIX** — Leaflet renders attribution; not worth a Leaflet override. Document. |
| P-11 (F-11) | Amenity ad/status label clarification | `AmenitySection.tsx` | Decision D-4 below. |

---

## Decisions to lock in (D-* — answer before implementation)

These are the "if deferred, what happens" items the design audit flagged. Each gets a recommendation; user must explicitly say go/no-go before R-1 implementation starts.

| ID | Decision | Recommendation | If deferred |
|---|---|---|---|
| D-1 | Floating panel disclosure: 4 always-visible (initial draft), 2 zones (subagent), or progressive disclosure (Codex)? | **Progressive disclosure** (Codex). First load = Layer pills + 기준 pill (collapsed) + Legend + Zoom. 기준 panel expands on click. Compare chip appears only when basket ≥1. Selection panels (DongPanel etc.) mutually exclusive. Cohere Compass uses the same minimal-then-on-demand pattern; Google-Maps-style 4-corner panels read as SaaS GIS, not analytical terminal. Both cross-model voices flagged the 4-panel default as wrong. | Map turns into a card constellation; users scan UI before data; 1280px collisions inevitable. |
| D-2 | ~~Visible H1 on `/`: TopNav wordmark only, OR separate page title in Layer panel?~~ **REVISED per subagent finding #6.** Wordmark IS NOT page H1; it's the global product banner. | **TopNav center is contextual per route** — on `/` it's empty (map is the content), on `/dong/:slug` shows "공릉1동" as visible H1, on `/compare` shows "동네 비교", on `/mypage` shows nickname. `/` keeps a `sr-only` H1 ("서울 동네 점수 지도") for screen readers — accept that visible H1 on `/` is intentionally absent because the map IS the page. | Confused screen readers (every route has same H1) AND `/` has no monumental anchor. |
| D-3 | ~~Bottom CTA bar: keep / TopNav / float bottom-right?~~ **REVISED per Codex finding #4 + subagent finding #3.** All three were wrong. Page-local action is the right model. | **Page-local action group** in DongDetail hero right column (visible on first fold) + scroll-sticky compact pill rail bottom-right after hero leaves viewport. NOT in TopNav (object-specific actions don't belong in global chrome). NOT a generic floating bottom-right (reads as mobile FAB on a non-map page). | Primary action becomes hard to discover after scroll; user reads detail page but misses comparison workflow. |
| D-4 | Amenity card "광고" / status label: clarify or remove? | **Verify in source then rename.** Per audit context, this is likely rank/position metadata (not an ad slot). Rename to mono `TOP {n}%` per amenity (folded into R-3 4th cell). If it IS an unimplemented ad placement, remove entirely. | Engineer leaves the ambiguous label; demo viewer asks "is this an ad?" |
| D-5 | ~~Mode switcher in TopNav~~ **REVISED per Codex finding #3 + subagent finding #9.** Mode switcher concept is broken. | **Remove the mode switcher entirely.** TopNav center is contextual per-route page identity (D-2 revised). Navigation between modes happens by URL: logo→/, dong-click→/dong/:slug, compare-chip→/compare, user→/mypage. No "modes" mental model; routes ARE the modes. | Disabled-state mode pills look broken; route-dependent "브리핑" is a recent-shortcut not a stable mode; users mistrust nav. |
| D-6 | Existing data hooks (`useDongs`, `useFavorites`, `useDongScores`): can we reuse them as-is in the new floating panels? | **Yes** — verified that all four panels in R-1 only consume data already in these hooks. No new API contracts needed. | If hooks need props refactor, R-1 grows to a backend touch. |
| D-7 | (NEW per subagent finding #8) Floating panel collapse state: persist (URL hash) or reset per page-load? | **Reset per page-load.** CLAUDE.md forbids localStorage for state. URL-hash persistence (`#기준=open`) is doable but adds 200 LOC for a marginal nice-to-have on a desktop tool used in single sessions. Document the reset trade-off. | Power user collapses Filter panel, refreshes, has to collapse again — minor friction. |
| D-8 | (NEW per subagent finding #9) TopNav variant on `/login` and `/register`? | **Auth-route variant.** TopNav on `/login` shows: logo only + `회원가입 →` link in right zone. On `/register`: logo only + `로그인 →` link. No center content (D-2 revised allows). | Mode switcher (already removed in D-5) on auth route would be meaningless; without that decision, login/register would show grayed-out chrome. |
| D-9 | (NEW from R-1 revision) Compare chip click behavior on `/`: expand inline dropdown showing the 0-3 dongs, OR navigate to `/compare`? | **Navigate to /compare immediately.** The chip is a count + entry point; the comparison page does the comparing. Inline dropdown adds complexity without value (user has to click again to actually compare). | Two-click pattern; chip becomes a slow disclosure instead of a fast portal. |
| D-10 | (NEW per subagent finding #7) First-time user orientation on `/`: silent (let them figure it out), coach-mark on 기준 pill, or full welcome panel? | **Single coach-mark** on 기준 pill ("← 가중치 조절"). Auto-dismisses after 4s or on first click of any UI. Resets per session (CLAUDE.md no-localStorage rule means it shows every refresh — accept that; a returning user scans past it). Welcome panel is too heavy for an analytical tool; silent is too cold. | First-time user lands on full-bleed map with no orientation; bounces to login or refreshes thinking the page is broken. |
| D-11 | (NEW per subagent finding #11 + Codex finding #8) DS internal contradiction: `--radius-md` is documented as "8px subtle" in the button section but the radii table lists `md = 16px`. Which is correct? | **Resolve to 8px subtle for `--radius-md`, introduce `--radius-card` (16px) as the cards-only token** — this matches the post-F-22 fix that already added `--radius-card` and used it in Card.css. Update DS line 193 + radii table to be consistent. THEN P-5 can rename CTA usage to `--radius-sm` if collapse is desired (or skip P-5 if `--radius-md` is now the unambiguous "8px CTA" token). | Plan ships with two contradictory canonical values; future devs reintroduce the bug we just fixed. |

---

## User journey storyboard

Pass 3 gap. Trace the emotional arc through the whole product so the rework doesn't break it.

| Step | User does | Sees | Feels | Plan supports? |
|---|---|---|---|---|
| 1 | Lands on `/` (logged out, first time) | Full-bleed Seoul map, heatmap fade-in, TopNav with 슬 logo, Layer pills, 기준 pill (collapsed) + coach-mark, Legend, Zoom | "Whoa, this is a real map of Seoul, not a marketing page" — orienting | ✓ R-1 + D-10 coach-mark |
| 2 | Clicks 기준 pill | Panel slides up, 3 sliders + filter checkboxes visible, [5번 비교로 자동 추천 →] CTA | "I can change what 'best' means here" — empowered | ✓ R-1 progressive disclosure |
| 3 | Drags 전월세 slider to 60% | Heatmap recolors live, Compare chip still hidden | "Real data, real responsiveness" — trust | ✓ existing behavior preserved |
| 4 | Clicks a dark-green polygon | DongPanel slides in from right (400px), 기준 panel auto-collapses | "Now I'm investigating ONE neighborhood" — focused | ✓ R-1 mutual exclusion |
| 5 | Clicks "비교에 추가" in DongPanel | Compare chip appears top-right with count `(1)` | "I'm building up a list" — collecting | ✓ R-1 chip on basket ≥1 |
| 6 | Clicks "자세히 보기" | Navigates to `/dong/:slug`. TopNav center now shows "공릉1동" | "I'm in the briefing for THIS dong" — depth | ✓ R-2 contextual center + R-3 hero |
| 7 | Reads the page | Hero with score + actions, scrolls past, scroll-sticky pill rail appears bottom-right | "I have actions but they're not in my way" — calm | ✓ R-3 D-3 page-local action |
| 8 | Scrolls to similar-dong section, clicks one | Navigate to that dong's detail | "I'm in a research loop now" — exploration | ✓ existing |
| 9 | Clicks Compare chip in TopNav-area or returns to `/` and clicks chip | Navigates to `/compare?dongs=...` | "Let me see them side by side" — synthesis | ✓ D-9 immediate navigation |
| 10 | Decides on a dong, registers | Top-right `로그인 →` → register flow → returns to `/` with personalized weights | "This is for me now" — ownership | ✓ R-4 + existing auth |
| 11 | Returns later, opens `/mypage` | TopNav center = nickname; left rail shows weights, right column shows favorites + reviews | "My research workspace" — returning power user | ✓ R-4 |

**Fault lines this storyboard exposes:**
- Step 5: between adding to compare and seeing the chip, there's no animation/feedback. **Action item:** Compare chip should fade-in or slide-in from outside viewport when first appearing. Add to R-1 acceptance.
- Step 7: scroll-sticky pill rail needs an entry animation too — sliding in feels less abrupt than instant-appear.
- Step 10: register → returns to `/` with which weights? If user hadn't done onboarding, weights are still default. **Action item:** post-register redirect should land on `/?onboarding=1` for a first-time pref-learning prompt. Already implemented (`MyPage.tsx` has the pattern); verify still works post-rework.

---

## Interaction state coverage (per panel/section)

Plan-design-review Pass 2 gap. Specify what the user SEES in each state, not backend behavior.

### R-1 floating panels

| Panel | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL |
|---|---|---|---|---|---|
| Layer pill row | tabs render immediately, no loading state | n/a (always 4 layers) | n/a | tab indicates active layer | n/a |
| Weight panel | sliders render immediately at default 33/33/34, no loading | n/a (always shows 3 sliders) | if weight save fails, inline error below sliders ("저장 실패. 다시 시도") | sliders update, "5번 비교로 자동 추천 →" CTA always available | n/a |
| Compare panel | n/a — purely client-state | "동네 패널에서 '비교에 추가'를 누르세요." (current copy preserved) | n/a | shows count "비교 보기 (N)" — already correct post-F-04 | "현재 N/3개 담겼어요." — already in source |
| Filter panel | dropdowns render immediately | n/a | if filter API call fails, dropdown shows "데이터 없음" in error red | filter applied, count visible | n/a |
| Legend | renders immediately, derived from active layer | n/a | n/a | shows 5-stop ramp + active layer label | n/a |

### R-3 DongDetail sections

| Section | LOADING | EMPTY | ERROR |
|---|---|---|---|
| Hero | skeleton: dong name placeholder bar 60px tall + skeleton score chip | redirect to `/` with toast "동네 정보 없음" | "동네 정보를 불러오지 못했습니다. {error.message}" centered, secondary action `← 메인 지도로` (matches NotFound pattern post-F-17) |
| 부동산 시세 | chart skeleton bars (already exists) | "최근 1년 거래가 없습니다. 기간을 늘려보세요." (DS empty-state pattern) | inline error within section, other sections still render |
| 편의시설 | 8 amenity rows render with `—` for counts/scores during fetch | "주변 편의시설 데이터가 부족합니다." | inline error within section |
| 교통 | row skeletons | "지하철역/버스 노선 정보가 없습니다." | inline error |
| 자취생 리뷰 | row skeletons | "아직 리뷰가 없어요. 첫 리뷰를 남겨보세요. [리뷰 작성하기]" — empty state with primary action per DS | inline error |
| 비슷한 동네 | row skeletons | "비슷한 동네 데이터가 부족합니다." (rare; embedding-driven) | hide section if error |

### R-4 MyPage sections

| Section | LOADING | EMPTY | ERROR |
|---|---|---|---|
| Profile | skeleton name bar + meta line | n/a (logged-in user always has profile) | redirect to `/login` with toast |
| Weights | sliders render at default | "선호 학습을 시작하면 자동으로 채워져요. [선호 학습 시작 →]" — empty state with primary action | inline error |
| Favorites | row skeletons | "아직 찜한 동네가 없어요. 메인 지도에서 동네를 찜해보세요. [메인 지도 →]" — DS empty-state pattern | inline error |
| Reviews | row skeletons | "아직 작성한 리뷰가 없어요. 동네 상세에서 리뷰를 남겨보세요." | inline error |

---

## Accessibility specification

Plan-design-review Pass 6 gap. Desktop-only product but keyboard navigation matters for a research tool.

### Global (TopNav + every route) — REVISED post-Codex finding #10

- TopNav is `<header role="banner">` with `<nav aria-label="주 내비게이션">` inside.
- **NO mode switcher** (D-5 revised — removed entirely). Center zone is contextual page title (D-2 revised).
- Center zone, when present, is the page `<h1>` (e.g., dong name on `/dong/:slug`, "동네 비교" on `/compare`, nickname on `/mypage`).
- Keyboard: Tab order is **skip-link → logo → page-title (focusable as `<h1 tabindex="-1">` only when programmatically focused on route change for SR announcement) → auth/user link → page content via skip-link**.
- Skip link: `<a class="sr-only sr-only-focusable" href="#main">메인 콘텐츠로 건너뛰기</a>` as the very first focusable element.
- Every page wraps content in `<main id="main">`.
- Auth-route variant (D-8): `/login`/`/register` show only logo + auth-toggle link. Tab order: skip-link → logo → auth-toggle.

### R-1 MainMap floating panels — REVISED post-Codex finding #11

Stale draft assumed 4 always-visible panels. R-1 was revised to progressive disclosure (D-1). A11y must match.

- TopNav above the map (always present).
- Each floating panel is `<aside aria-label="...">` (e.g., `aria-label="레이어 선택"`, `aria-label="가중치 조절"`).
- **Tab order on `/` (post-progressive-disclosure):**
  1. Skip-link → 2. Logo → 3. Auth/user link → 4. Layer pill row (4 stops, role=tablist + arrow-key navigation) → 5. 기준 pill (single stop while collapsed) → 6. Compare chip (1 stop, ONLY when basket ≥1) → 7. Map container (single tabindex=0 stop with `aria-label="히트맵 — Tab으로 패널, 화살표로 지도 조작"`) → 8. Leaflet zoom (2 stops).
- **When 기준 panel expanded** (focus moves into the panel after click): tab order INSIDE panel = 3 sliders → filter checkboxes → "5번 비교로 자동 추천 →" CTA → close (×) button. ESC collapses, returns focus to the 기준 pill.
- **When right-side slide-in panel opens** (DongPanel/TxPanel/KernelPanel): panel content is in tab order; closed panels are `inert` (post-F-20). Mutual exclusion ensures only one is in tab order at a time.
- Visual focus order matches DOM order; no `tabindex` overrides except the `<h1 tabindex="-1">` for programmatic focus on route change.
- Panel collapse button: `<button aria-expanded="true|false" aria-controls="panel-id">`. When collapsed, panel content is `inert`.
- Layer pill row: implements `role="tablist"` with each pill `role="tab"` + `aria-selected`. Arrow keys cycle.
- Weight sliders: native `<input type="range">` with `<label>` association. `aria-valuetext` includes the % value.
- ESC key closes the topmost open panel (managed by `useEscapeKey` hook + `enabled` flag per panel).

### R-3 DongDetail / R-4 MyPage

- Each section is `<section aria-labelledby="section-heading-id">` with the H2/H3 carrying that ID.
- Mono eyebrow is `aria-hidden="true"` (decorative; section is named by its real heading).
- Tab order: TopNav → Hero (no focusable items besides any button) → section by section in DOM order.
- Tables (transactions, favorites, reviews) use `<table>` with `<caption class="sr-only">` for context.
- Action buttons in floating action group (D-3 outcome) have visible focus ring (`outline: 2px var(--color-focus-blue)` — already standard from design system).

### Color contrast (already enforced post-design-review fixes)

- All body text on white: `--color-text` (#212121) → 16.4:1 ✓ AAA
- All subtle text on white: `--color-text-subtle` post-F-19 = `--color-slate` (#75758a) → ~4.47:1 ✓ AA
- Heatmap polygon labels (when shown): white outline + drop shadow per `lib/colors.ts` polygon stroke spec
- Coral chips on white: `--color-coral` (#ff7759) used only for chip BACKGROUND with white text; never as text on white

### Touch targets (desktop precision pointer, but enforced for keyboard activation)

- All interactive elements ≥ 32px in their smaller dimension on desktop.
- Primary CTAs ≥ 44px (already enforced post-F-04).
- Mode switcher pills ≥ 40px tall (P-9).
- Floating panel close buttons ≥ 32px (small but precision-pointer-only context is fine).

---

## Architecture decisions (locked by /plan-eng-review)

### A-1: MainMap interaction-state reducer (REVISED post-Codex finding #4-5)

Initial draft scoped the reducer narrowly (5 vars). Codex flagged that this leaves two state models in MainMap with the OTHER coupled "which panel is open" state still scattered (selectedJibunPins derived state, kernelWeights, tooltip suppression in TransactionPinLayer). **Revised per user decision: expand the reducer to cover ALL panel-coordination state.**

```
panelReducer state shape (EXPANDED):
{
  // Right-side slide-in panels (mutually exclusive)
  selectedSlug: string | null,      // DongPanel target
  selectedJibun: string | null,     // TransactionPanel target
  kernelPoint: LatLng | null,       // KernelScorePanel target

  // KernelScorePanel-internal state (coupled to kernelPoint lifetime)
  kernelWeights: Weights,           // independent of main weights
  kernelSchool: string,             // selected school context

  // Bottom-left CriteriaPanel
  criteriaOpen: boolean,            // 기준 panel expanded?

  // Ephemeral first-time UX
  coachVisible: boolean,            // 4s coach-mark on 기준 pill
}

panelReducer actions:
  - { type: 'toggle_criteria' }
      → flips criteriaOpen, sets coachVisible: false
  - { type: 'open_dong'; slug }
      → criteriaOpen: false, selectedSlug: slug,
        selectedJibun: null, kernelPoint: null
        (mutual exclusion + 기준 auto-collapse)
  - { type: 'open_jibun'; key }
      → criteriaOpen: false, selectedJibun: key,
        selectedSlug: null, kernelPoint: null
  - { type: 'open_kernel'; point }
      → criteriaOpen: false, kernelPoint: point,
        selectedSlug: null, selectedJibun: null,
        kernelWeights: <reset to current main weights>,
        kernelSchool: ''
  - { type: 'close_all_right' }    → all three nulls
  - { type: 'set_kernel_weights'; weights } → updates kernelWeights only
  - { type: 'set_kernel_school'; school }   → updates kernelSchool only
  - { type: 'dismiss_coach' }      → coachVisible: false

Derived (NOT in reducer state, computed via selector/useMemo):
  - selectedJibunPins: derived from txQuery.data + state.selectedJibun
  - tooltipSuppression: state.selectedSlug != null
                     || state.selectedJibun != null
                     || state.kernelPoint != null
```

State that STAYS as plain useState (independent of panel coordination):
- `weights`, `activeLayer` (heatmap controls, not panel state)
- `compareSlugs` (basket — independent of any panel)
- `txDealType`, `txPeriod` (transaction filters)
- `mapState`, `heatmapVisible`, `rentCapEnabled`, `rentCap`, `nearUniversityOnly`
- `preferenceOpen`, `toast` (modal + toast — independent overlays)

Lives in `frontend/src/routes/MainMap.panelReducer.ts` (separate file for testability — even without test framework, isolated reducer is easier to debug). MainMap.tsx imports `{ panelReducer, INITIAL_PANEL_STATE, type PanelAction }` and uses `useReducer`.

Action items:
- [ ] Define `PanelState`, `PanelAction`, `panelReducer`, `INITIAL_PANEL_STATE` in `MainMap.panelReducer.ts`.
- [ ] Replace `selectedSlug` / `selectedJibun` / `kernelPoint` / `kernelWeights` / `kernelSchool` useStates with `state.*` via reducer.
- [ ] Compute `selectedJibunPins` and `suppressTooltips` as `useMemo` selectors over reducer state + queries.
- [ ] Wire dispatchers into existing handlers (`handleClosePanel`, polygon click, pin click, kernel click, etc.).
- [ ] Smoke-test all paths in the user-journey storyboard (Steps 1-11) before considering done.

### A-2: `<CompareChip>` data flow

Plan glossed over how the chip gets the basket count. Resolved: same prop pattern Sidebar uses today.

```tsx
// MainMap.tsx (existing pattern, line 327: compareCount={compareSlugs.length})
<CompareChip
  count={compareSlugs.length}
  onClick={() => navigate(`/compare?dongs=${compareSlugs.join(',')}`)}
/>
```

No Context needed; MainMap is the only owner of `compareSlugs`. CompareChip is a stateless presentation component.

### A-3: `.map-floating-panel` CSS class doesn't exist yet

Plan claimed R-1 reuses the "existing" `map-floating-panel` class. **It doesn't exist** (0 hits in `frontend/src/**/*.css`). The class is documented in `.claude/DESIGN_SYSTEM.md` line 201 but never implemented.

Action: Stage 1 (foundation tokens) adds `frontend/src/styles/components/map-floating-panel.css`:

```css
.map-floating-panel {
  position: absolute;
  background: var(--color-canvas-white);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);  /* 8px subtle, post-D-11 */
  padding: var(--space-3) var(--space-4);  /* 12-16, panel-dependent */
  box-shadow: var(--shadow-floating);
  z-index: 500;
  /* When closed via inert (post-F-20 pattern) — caller controls */
}
```

Imported globally in `frontend/src/main.tsx` alongside the rest of the styles.

### A-4: TopNav center on `/dong/:slug` — REVISED post-Codex finding #8 + #9

Initial draft claimed React Query would dedup TopNav's `useDongDetail(slug)` with the page's. **That was wrong.** The hook signature is `useDongDetail(slug, weights)` — query key includes weights. If TopNav uses default weights and the page uses current user weights, the keys differ → no dedup → extra HTTP request → AND TopNav and page can show different "current" data briefly.

Codex also flagged: making TopNav fetch dong-detail data from a global chrome layer is too much responsibility for a navigation component.

**Revised: pass page title via React Router `handle` metadata.**

```tsx
// frontend/src/App.tsx — route definitions get a `handle` field
<Route
  path="/dong/:slug"
  element={<DongDetail />}
  handle={{ topNavCenter: 'dongDetail' }}
/>
<Route path="/compare" element={<Compare />} handle={{ topNavCenter: 'static', label: '동네 비교' }} />
<Route path="/mypage" element={<MyPage />} handle={{ topNavCenter: 'mypage' }} />
<Route path="/" element={<MainMap />} handle={{ topNavCenter: 'none' }} />
<Route path="/login" element={<Login />} handle={{ topNavCenter: 'none', auth: true }} />
<Route path="/register" element={<Register />} handle={{ topNavCenter: 'none', auth: true }} />
```

```tsx
// frontend/src/components/Layout/TopNav.tsx
function TopNav() {
  const matches = useMatches();
  const handle = matches[matches.length - 1]?.handle as RouteHandle | undefined;
  // ...
  switch (handle?.topNavCenter) {
    case 'dongDetail':
      // Page itself owns the title via Outlet context — TopNav reads from context
      return <DongDetailTitle />;
    case 'static':
      return <span>{handle.label}</span>;
    case 'mypage':
      return <MyPageTitle />;  // reads useMe() — already fetched by AuthContext
    default:
      return null;
  }
}

// DongDetailTitle reads from React Router's Outlet context that DongDetail sets
function DongDetailTitle() {
  const { dongName } = useOutletContext<DongDetailContext>();
  return <h1 className="topnav__page-title">{dongName ?? slugFallback}</h1>;
}
```

DongDetail page wraps its render in `<Outlet context={{ dongName: data?.name, slug }}>` and the existing `useDongDetail` query (page-owned, with current weights) is the single source of truth. TopNav consumes via context — zero extra HTTP, no signature mismatch.

For `/mypage`: `useMe()` is already in `AuthContext` (no HTTP, in-memory). TopNav reads `user?.nickname` directly. No new fetch.

**Loading state:** during dong-detail fetch, dongName is undefined; TopNav renders the slug as fallback.
**Error state:** on 404, page renders error UI; TopNav still shows slug fallback.
**No flash on route change:** route handle is synchronous; TopNav center variant changes the moment React Router commits.

### A-5: IntersectionObserver lifecycle on R-3 hero

Plan adds `IntersectionObserver` to detect when DongDetail hero leaves the viewport (so the scroll-sticky pill rail appears). New pattern in this codebase (0 existing usages). Need an explicit lifecycle:

```tsx
// frontend/src/hooks/useIntersection.ts (NEW — could land in Stage 1)
export function useIntersection(
  ref: RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [intersecting, setIntersecting] = useState(true);  // safe default
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIntersecting(entry.isIntersecting),
      { threshold: 0, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, options.threshold, options.root, options.rootMargin]);
  return intersecting;
}
```

Used in DongDetail:
```tsx
const heroRef = useRef<HTMLElement>(null);
const heroVisible = useIntersection(heroRef);
// scroll-sticky pill rail renders only when !heroVisible
```

The `intersecting: true` default means the pill rail does NOT show on first render before the observer reports. Avoids the "flash on mount" race.

### A-6: TopNav rendering across redirect flows

`/mypage` unauthed → React Router redirects to `/login`. During the redirect, does TopNav re-render with the auth-route variant or flash the wrong nav? Resolved:

- TopNav renders synchronously based on `useLocation()`. After redirect, `location.pathname` is `/login` and TopNav renders the auth variant (D-8). React Router's redirect is single-tick — no flash.
- Verify post-implementation: navigate from `/` → `/mypage` (unauthed) and confirm TopNav center is empty (auth variant), not "내 페이지".

### A-7a: Amenity row rank percentile (Q3)

R-3 amenity rows add a 4th cell `TOP {n}%`. Data not in `/api/dongs/:slug/detail` response. Plan rules out backend changes, so compute on frontend:

- All-dong amenity scores already fetched by the existing `useDongScores()` hook (used for heatmap).
- For the current dong's amenity score `S` in category `C`, percentile = `(count of dongs with score < S in category C) / total_dongs * 100`.
- Round and invert: `TOP X%` where `X = 100 - percentile`.

Add a helper `computeAmenityPercentile(allDongs, category, currentScore): number` in `frontend/src/lib/percentile.ts` (~20 LOC). Tested in unit form via the regression-test pattern (when test bootstrap is re-enabled later).

Edge case: if all dongs have the same score in a category (synthetic data warning), no percentile can be computed → render the cell as `—` not `TOP 0%`.

### A-7b: Detail/ CSS cleanup alongside Card removal (Q4)

R-3 acceptance:
- [ ] Delete obsolete per-section card classes after `<Card>` removal:
  - `.real-estate__chart-card` (RealEstateSection.css)
  - `.real-estate__deals-card` (same)
  - `.amenity__card` (AmenitySection.css)
  - `.transit__stations`, `.transit__bus` (TransitSection.css)
  - `.review__card`, `.review__empty` (ReviewSection.css)
  - `.hero__map-card` (HeroSection.css — keep `.hero__map-container` which is the map wrapper)
  - `.mypage__section` (MyPage.css — replaced by `.mypage__rail` + `.mypage__content` per R-4)

Without this cleanup, dead CSS classes accumulate and future devs get confused about which styling pattern is canonical.

### A-7c: MainMap.tsx panel-coordination ASCII diagram

Per CLAUDE.md eng preferences: "embed ASCII diagrams in code comments where complex." R-1 introduces a non-trivial state machine. Add a comment block at the top of `MainMap.tsx` (or in `MainMap.panelReducer.ts`) showing:

```
// Panel coordination state machine (post-design-polish-v2)
//
//   ┌─────────────┐  open_dong   ┌──────────────────┐
//   │ idle (none) │ ───────────→ │ DongPanel (right)│
//   └─────────────┘              └──────────────────┘
//        ▲ ▲                            │
//        │ │ close_all_right            │ open_jibun
//        │ └────────────────────────────┘
//        │                              │
//   open_jibun                          ▼
//        │                       ┌──────────────────┐
//        ▼                       │ TxPanel (right)  │
//   ┌──────────────────┐         └──────────────────┘
//   │ KernelPanel(rt)  │
//   └──────────────────┘
//
// Independent: criteriaOpen (bottom-left), coachVisible (4s timer).
// criteriaOpen closes when ANY right panel opens.
//
```

Update this diagram if the state machine changes. **Stale diagrams are worse than no diagrams.**

### A-7d: Performance pinning

- **R-3 amenity percentile** computed in `useMemo`, keyed on `(slug, allDongScoresFingerprint)`. Recompute only when current dong or the score list changes.
- **`React.memo` for stateless floating panels:** LayerPills, CompareChip, LegendPanel. CriteriaPanel NOT memoed (its weights/filter props change frequently and shallow-equal would always be false).
- **`useDongScores` weight-slider refetch storm** is pre-existing and out of scope for this plan. If perf becomes a problem post-rework, add slider debounce (200ms after last input) — capture as TODO if it bites during QA.

### A-7: ESC handler dedup — `useEscapeKey` hook

Codebase already has 4 ESC handlers (Modal, DongPanel, TransactionPanel, KernelScorePanel). R-1 adds a 5th (close 기준 panel). Time to dedup.

```tsx
// frontend/src/hooks/useEscapeKey.ts (NEW — Stage 1)
export function useEscapeKey(handler: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handler();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler, enabled]);
}
```

Migration: 4 existing handlers + 1 new = 5 call sites converge on the hook. ~30 LOC saved. No behavior change.

---

## Sequencing

**Outside-voice revision** (Codex finding #10 + finding #8): initial draft put P-4/P-5 in Stage 1 as "low-risk polish", but P-4 (tokenize floating-component layout px values) is FOUNDATION for R-1/R-3 — they consume those tokens. P-5 (`--radius-md` collapse) is NOT polish — it's a token-semantics change while DS itself is internally inconsistent (DS line 193 says "8px (`--radius-md`)" but DS radii table says md=16px). P-5 must wait until DS is reconciled (action item: D-11 below) and then ship as its own migration with visual diff, NOT bundled.

Also: R-1 doesn't truly DEPEND on R-2; they're parallel-developable. The real dependency is **decisions before geometry, geometry before chrome.**

```
  Stage 0 — Lock decisions (no code, ~1 day):
    Lock D-1 D-3 D-5 D-7 D-8 D-9 D-10 (all REVISED based on outside voices)
    Lock D-11 (NEW): reconcile DS --radius-md (8px or 16px?)
    User sign-off on the 4 ASCII wireframes (R-1, R-3 hero, R-4 layout)
  
  Stage 1 — Foundation tokens + primitives (parallel work, ~1 day):
    P-4 Tokenize floating layout magic px (--map-control-size, --legend-bar-w, --hero-map-side, --tx-filter-min-w)
    R-5 MetricBar primitive
    R-6 Slider dedup (KernelScorePanel uses <Slider>)
    P-1 (Coral warning → muted-slate)
    P-2 (delete dead heatmap aliases)
    P-7 (404 word-break: keep-all)
    P-8 (Auth card max-width)
  
  Stage 2a — Sidebar decomposition (REVISED post-Codex #2-#3, ~half day):
    Extract Sidebar-owned controls into portable child components:
      <LayerSwitcher>     — currently inlined in Sidebar.tsx as the tabs
      <WeightSliders>     — currently inlined as the slider section
      <FilterControls>    — currently inlined as the filter section
      <CompareBlock>      — currently inlined as the compare section
    Each becomes a standalone component in components/Map/.
    Sidebar.tsx becomes a thin shell: <aside class="sidebar">{children}</aside>
    No visual change yet — Sidebar still renders these components.
    Validates that controls work outside the sidebar shell.
  
  Stage 2b — R-1 floating chrome + sidebar removal (SAME PR, ~1 day):
    Mount the same <LayerSwitcher>/<CriteriaPanel>/<CompareChip> in floating
    positions per R-1's z-coordinate map.
    REMOVE Sidebar from MainMap.tsx in the same diff (no duplicate state).
    Verify z-coordinate map at 1280×720, 1440×900, 1920×1080.
    Verify mutual-exclusion rules with existing DongPanel/TransactionPanel/KernelScorePanel.
    A-1 reducer lands here.
    Acceptance: full-bleed map, no .sidebar element, all functions reachable.
    
  ⏰ TIME-CHECK after Stage 2b (target 2026-05-10):
     If R-1 done → proceed to Stage 3.
     If R-1 not done → extend Stage 2b, drop R-4 from later scope.
  
  Stage 3 — Chrome (after Stage 2 verified, ~1 day):
    R-2 Global TopNav (with contextual center per D-2 + route handle metadata per A-4)
    Remove per-route topbars (DongDetail / Compare / MyPage) IN THE SAME PR as TopNav
    (Sidebar already removed in Stage 2b — nothing to remove here on MainMap)
    Verify all 7 routes render with TopNav correctly
    
  ⏰ TIME-CHECK after Stage 3 (target 2026-05-17):
     If TopNav done → proceed to Stage 4.
     If TopNav not done → ship R-3 hero only, skip R-4 + remaining polish.
  
  Stage 4 — Detail views (after Stage 3 lands, ~1.5 day):
    R-3 DongDetail rework (hero + de-card + page-local action D-3)
    R-4 MyPage rework (2-column workspace)
    P-3 Compare directional hints
    P-6 (Compare empty-state action button)
    P-11 Amenity label decision (D-4)
    
  ⏰ TIME-CHECK after Stage 4 hero (target 2026-05-22):
     If hero done → broaden to remaining detail sections + R-4.
     If hero not done → freeze R-1+R-2+hero, skip R-3 broad de-card and R-4.
  
  Stage 5 — Token migration (post-launch or pre-launch if time, ~0.5 day):
    P-5 Reconcile and rename --radius-md per D-11 decision
    Visual diff verification across all consumers
  
  ⏰ HARD STOP: 2026-05-25.
     Anything not in main by this date doesn't ship for the 2026-06-05 demo.
     `/qa --deep` must run against everything that DID land before this date.
```

Each stage = one PR. Stages 0-1 can run parallel to one another. Stages 2-4 are sequential. Stage 5 ships independently when DS reconciliation is done.

**Drop priority if time slips (Codex finding #12):**
1. Drop R-4 entirely — MyPage is behind auth, least likely to be demo'd live, lowest traffic.
2. Drop P-5/P-3/P-6/P-11.
3. **Never drop R-1, R-2, R-3** — those are the demo-critical reworks.

---

## Acceptance — overall

After all four stages land:
- [ ] `/` reads as Cohere-style analytical terminal (full-bleed map + 3-4 floating panels), not a SaaS dashboard.
- [ ] Every route has the same TopNav chrome (logo + mode switch + user).
- [ ] No `<Card>` wrapping section content on `/dong/:slug` or `/mypage`.
- [ ] All headings hit DS scale: visible H1 60-80px on hero pages, H2 36px sections, H3 22px subsections.
- [ ] No `--radius-pill` on primary CTAs (already enforced post-F-21 fix; verify regression-free).
- [ ] WCAG AA contrast on all body/caption text (already enforced post-F-19 fix; verify).
- [ ] All primary CTAs ≥ 44px touch target (already enforced post-F-04 fix).
- [ ] Re-run `/design-review --deep` post-implementation; expect Design Score A-, AI Slop A.

---

## NOT in scope

- **Mobile responsive** — explicit project decision. Desktop-only.
- **Auth flow rework** — login/register cards stay as-is (P-8 widens slightly).
- **Backend/API changes** — all four reworks consume existing hooks unchanged.
- **Onboarding modal rework** — current pairwise comparison works; mockup-validated post-/design-review.
- **3D map (deck.gl)** — SPEC priority 10, time-permitting. Not in this plan.
- **New features** — this is a design rework, not a feature plan.

---

## Unframed-row design guarantee (subagent finding #4)

When R-3 and R-4 strip `<Card>` from sections, the rows must NOT look "lost in whitespace" with only 3-4 cells on a 1280px-wide page. Three guardrails baked into the plan:

1. **Content max-width 720px** on R-3 detail sections, **720px right column** on R-4 MyPage. Rows stay dense; whitespace lives outside the content column, not between cells.
2. **Minimum 4 cells per row** wherever possible. R-3 amenity rows get a rank percentile cell (`TOP 12%`). R-4 favorite rows already have name/구/score; add `[찜 해제]` hover-revealed action as the 4th cell.
3. **Row hover state.** `hover { background: var(--color-soft-stone); }` (Soft Stone at full opacity — already DS-spec for `transaction-row`). Provides visual feedback that the row is interactive AND fills space subtly without adding chrome.

If any specific section CAN'T meet these (e.g., similar-dongs has only name/score/diff), ship it as a 3-cell row with the right-side cell being a small MetricBar (visual weight) instead of a 4th text column.

---

## What already exists (reuse, don't reinvent)

- `Card.css` post-F-22 16px radius — when we DO use cards (e.g., onboarding cards), they're already correct.
- `transaction-row` styling pattern — the unframed-row vocabulary for R-3/R-4 already lives here. Copy the visual language, don't invent a new one.
- `Slider.css` primitive — R-6 just deletes the duplicate.
- `Button.css` post-F-04 — secondary+full enforces 44px min-height. The new floating panels can use `<Button>` freely.
- `useDongs`, `useFavorites`, `useDongScores`, `useDongScoresQuery` hooks — verified sufficient for R-1.
- `mono-label` class + `--font-mono-label-*` tokens — the eyebrow pattern in R-3/R-4 uses these unchanged.
- `--shadow-floating` token — already the only allowed shadow per DS, exactly what floating panels need.

---

## Risks

1. **R-1 floating-panel collisions on small desktop (1280px wide).** Mitigation: define non-overlap zones, allow panel to scroll-collapse if it would clip the legend/zoom controls. Verify in `/design-review` post-implementation at 1280, 1440, 1920.
2. **Removing per-route topbars before TopNav is wired everywhere will leave routes with no nav.** Mitigation: stage 2 lands TopNav AND removes per-route topbars in the same PR.
3. **R-3 amenity grid → unframed rows visual regression.** Today the amenity card layout is recognizable; flat rows might feel less "data-block". Mitigation: mockup comparison in this plan; user approval before implementation.
4. **P-5 `--radius-md` collapse touches 6 consumers.** Mitigation: verify both tokens resolve to 8px before rename; visual diff after.
5. **Time.** This is multi-stage. If any stage slips past 2026-05-25, drop the lowest-priority remaining items (P-6, P-7, P-8, P-11) to keep R-1 → R-4 + dedup intact.

---

## Approved Mockups

*(Will be filled in during Step 0.5 of `/plan-design-review`. Each row points at the approved variant in `~/.gstack/projects/wlgusqkr-capston/designs/design-polish-v2-20260504/`.)*

| Screen | Mockup path | Direction | Constraints |
|---|---|---|---|
| MainMap floating layout | `_DESIGN_DIR/mainmap-rework/approved.png` | TBD | Full-bleed map, 3-4 floating panels, single TopNav |
| DongDetail decarded | `_DESIGN_DIR/dong-detail-rework/approved.png` | TBD | Monumental hero, mono eyebrows, unframed sections, hairline rules, 80px gaps |
| MyPage rework | `_DESIGN_DIR/mypage-rework/approved.png` | TBD | Same vocabulary as DongDetail, profile-as-hero |

---

## Failure modes (per /plan-eng-review)

For each new codepath, one realistic production failure scenario:

| Codepath | Realistic failure | Test exists? | Error handling? | User sees | Critical gap? |
|---|---|---|---|---|---|
| `panelReducer` mutual exclusion | New action added later forgets to clear other selections | NO (no tests) | NO (relies on impl care) | DongPanel + KernelPanel both visible at once | **YES — flag for QA per stage** |
| `useEscapeKey` on 5+ panels | All 5 listeners fire; if any returns truthy from non-isOpen path → state desync | NO | Existing pattern: `if (!isOpen) return` per handler | ESC closes wrong panel or no panel | Medium — manual test in QA |
| `useIntersection` on hero unmount | Observer not disconnected on `/dong/A` → `/dong/B` nav | NO | Plan A-5 specs `observer.disconnect()` in cleanup | Pill rail flickers / stale | Low (caught by impl care) |
| TopNav route handle metadata | Route added without `handle` field | NO | Plan: `default: null` in switch | Center zone empty (graceful) | Low |
| TopNav `useOutletContext` for dong title | Page renders before context sets dongName | NO | Plan: slug fallback | Slug code shown briefly, then name | Low |
| `computeAmenityPercentile` | All dongs have equal score in a category (synthetic data) | NO | Plan: render `—` not `TOP 0%` | Em-dash in cell | Low |
| `computeAmenityPercentile` | New amenity category added; falls outside the lookup | NO | Throws? Returns 0? | Plan doesn't spec — **needs default to `—`** | **YES — silent UX bug** |
| `<MetricBar>` with value > 100 | Backend returns 105 (capping bug) | NO | Plan doesn't spec | Bar overflows visually | Low — clamp in MetricBar |
| Compare basket clear (URL nav and back) | basket state in MainMap stale after returning from /compare | NO | Plan doesn't spec — relies on existing behavior | Stale chip count | Medium — verify in QA |
| Sticky left rail on MyPage with short content | `position: sticky` orphaned at top | NO | Plan doesn't spec | Visual bug | Low |
| Sidebar decomposition stage 2a | Decomposed component breaks an existing prop contract | NO | TypeScript catches signature mismatch | Build fails | Low (TS protects) |
| Stage 3 TopNav rolls out before per-route topbars removed | Two headers stacked | NO | Plan: SAME PR enforces atomicity | If split: visual regression | Medium |

**Critical silent-failure gaps:**
1. **`panelReducer` future-state-add regression** — adding a new action later that forgets `selectedSlug: null` would silently break mutual exclusion. **Mitigation:** code-comment in `panelReducer.ts` listing the invariant + manual QA per stage.
2. **`computeAmenityPercentile` undefined category** — silent wrong number is worse than no number. **Mitigation:** default to `—` for unknown category; document explicitly.

---

## Worktree parallelization strategy

Most stages are sequential by design (chrome must wait on prototype, detail must wait on chrome). But Stage 1 has parallelizable work:

| Stage | Step | Modules touched | Depends on |
|---|---|---|---|
| 1 | P-4 layout tokens | `styles/tokens.css` | — |
| 1 | P-2 dead alias delete | `styles/tokens.css` | P-4 (same file) |
| 1 | R-5 MetricBar primitive | `components/ui/MetricBar.*` (NEW) | P-4 (uses tokens) |
| 1 | R-6 Slider dedup | `components/Map/KernelScorePanel.*` | — |
| 1 | P-1 Coral warning | `components/ui/Score.css` | — |
| 1 | useEscapeKey hook | `hooks/useEscapeKey.ts` (NEW) | — |
| 1 | useIntersection hook | `hooks/useIntersection.ts` (NEW) | — |
| 1 | map-floating-panel CSS | `styles/components/map-floating-panel.css` (NEW) | P-4 (uses tokens) |
| 1 | P-7 404 word-break | `routes/NotFound.tsx` | — |
| 1 | P-8 Auth card max-w | `routes/Auth.css` | — |
| 2a | Sidebar decomposition | `components/Map/Sidebar*.tsx` + new sub-components | Stage 1 done |
| 2b | R-1 floating + sidebar removal | `routes/MainMap.*`, `Map/CriteriaPanel*`, `Map/CompareChip*`, `Map/LegendPanel*`, `Map/LayerPills*` | Stage 2a |
| 3 | R-2 TopNav + per-route topbar removal | `Layout/TopNav.*`, `App.tsx`, route files | Stage 2b |
| 4 | R-3 DongDetail rework | `components/Detail/*`, `routes/DongDetail.*` | Stage 3 |
| 4 | R-4 MyPage rework | `routes/MyPage.*` | Stage 3, R-5 done |
| 4 | P-3 Compare hints | `routes/Compare.*` | Stage 3 |
| 4 | P-11 Amenity label | `components/Detail/AmenitySection.tsx` | R-3 (same file) |
| 5 | P-5 radius rename | `tokens.css` + ~6 consumers | D-11 DS reconcile done |

**Stage 1 parallel lanes** (5 lanes can launch simultaneously):
- Lane A (tokens, blocking): P-4 → P-2 (sequential within file)
- Lane B (UI primitives): R-5 MetricBar, P-1 Score.css (independent files; can start after Lane A merges so MetricBar uses new tokens)
- Lane C (hooks): useEscapeKey + useIntersection (independent new files)
- Lane D (Map dedup): R-6 Slider in KernelScorePanel (independent)
- Lane E (auth/404 polish): P-7 + P-8 (independent files)

Execution: **Lane A first** (gating). Then **Lanes B/C/D/E in parallel**.

**Stage 4 parallel lanes** (3 lanes):
- Lane A: R-3 DongDetail (Detail/* directory) + P-11 Amenity label (same dir → must serialize within lane)
- Lane B: R-4 MyPage (routes/MyPage)
- Lane C: P-3/P-6 Compare (routes/Compare)

**Stages 2a, 2b, 3 are NOT parallelizable** — single-lane, sequential.

**Conflict flags:**
- Lane A in Stage 1 (P-4 → P-2) modifies the same `tokens.css` file → must serialize.
- Stage 4 Lane A: R-3 broad de-card touches AmenitySection.tsx; P-11 also touches it → must serialize within the lane (R-3 first).

---

## /plan-design-review completion summary

| Pass | Initial | Final | Notes |
|---|---|---|---|
| 1. Information Architecture | 4/10 | **9/10** | Added z-coordinate map + mutual-exclusion rules to R-1; explicit hero height to R-3; 2-column layout with widths to R-4 |
| 2. Interaction State Coverage | 5/10 | **9/10** | Added per-panel + per-section state matrix (loading/empty/error); edit states for MyPage |
| 3. User Journey & Emotional Arc | 5/10 | **9/10** | Added 11-step storyboard exposing Step 5 (compare-chip animation) + Step 7 (scroll-pill rail entry) + Step 10 (post-register redirect) fault lines |
| 4. AI Slop Risk | 8/10 | **9/10** | R-1 progressive disclosure removed the "4 panels = SaaS GIS" risk. R-3 caught its own mono-on-Korean misuse. Drop-priority list keeps R-3 above polish |
| 5. Design System Alignment | 9/10 | **9/10** | D-11 (resolve `--radius-md` DS contradiction) is itself a DS improvement |
| 6. Responsive & Accessibility | 4/10 | **8/10** | Added explicit a11y section (ARIA, focus order, keyboard nav, ESC handling, mode-switcher removal simplified focus). Responsive intentionally skipped (mobile WONTFIX). Remaining gap: SR announcement test coverage deferred to QA |
| 7. Decisions | — | **11 D-* (6 revised based on outside voices), 0 unresolved** | D-1 progressive disclosure, D-2 contextual TopNav center, D-3 page-local action, D-5 no mode switcher, D-7 no panel persistence, D-8 auth-route TopNav variant, D-9 chip → /compare immediate, D-10 single coach-mark, D-11 reconcile DS radius |

**Overall plan design score: 4/10 → 9/10.**

**Outside voice contributions (cross-model consensus):**
- **Codex** caught the mono-on-Korean misuse (R-3 노원구), the broken `브리핑` mode-switcher mental model (D-5 revision), the wrong DS path (`docs/` vs `.claude/`), and the P-4/P-5 sequencing inversion.
- **Claude subagent** caught the floating-CTA-on-non-map-page mismatch (D-3 revision), the "wordmark != page H1" semantic gap (D-2 revision), the de-carded section visual collapse risk (3-cell rows look lost), the missing first-time orientation (D-10), and the missing TopNav auth-route variant (D-8).
- **Both agreed** on the biggest finding: R-1's 4-always-visible-panels was wrong. Subagent suggested 2 zones; Codex suggested progressive disclosure. **Adopted Codex's recommendation** (simpler, matches Cohere Compass actual pattern) and folded subagent's collision-math concern into the explicit z-coordinate map.

**11 decisions made and locked in the plan (D-1 through D-11).** No unresolved questions blocking implementation.

**Mockups:** PNG mockups not generated — `OPENAI_API_KEY` not configured for the gstack designer. ASCII wireframes in R-1, R-3, R-4 serve as the visual reference. If high-fidelity mockups become important, set `OPENAI_API_KEY` and re-run `/design-shotgun` for each section.

---

## /plan-eng-review completion summary

| Section | Issues found | Status |
|---|---|---|
| Step 0 — Scope challenge | 1 (claim about `map-floating-panel` class existence) | Folded into A-3 (add class as part of Stage 1) |
| Architecture | 7 (A-1 reducer, A-2 chip data flow, A-3 missing class, A-4 TopNav weights bug, A-5 IO lifecycle, A-6 redirect re-render, A-7 ESC dedup) | All folded into plan; A-1 expanded post-Codex; A-4 rewritten to use route handle |
| Code quality | 4 (Q1-Q4, including stale CSS cleanup + ASCII diagram in MainMap) | All folded into plan as A-7a, A-7b, A-7c |
| Tests | 30+ uncovered paths | No-test-bootstrap project decision; QA test plan written to `~/.gstack/projects/wlgusqkr-capston/bagjihyeon-main-eng-review-test-plan-20260504-120907.md` |
| Performance | 2 (memoize percentile, React.memo stateless panels) | Folded into A-7d |
| Outside voice (Codex) | 18 findings, 3 cross-model tensions surfaced | Tensions resolved by user decisions (full plan + checkpoints, expanded reducer, keep useIntersection); 7 factual fixes folded in (A-1 expansion, A-4 rewrite, a11y section unstaling, Stage 2 split into 2a+2b sidebar decomposition) |
| Failure modes | 12 codepaths analyzed, 2 critical silent-failure gaps flagged | panelReducer invariant comment + percentile unknown-category default = `—` |
| Worktree parallelization | Stage 1 has 5 parallel lanes; Stage 4 has 3 | Lane structure documented above |
| Lake score | User chose B (full plan + checkpoints) over A (cut hard now) | Boil the lake with timeline insurance |

**Issues found total:** 7 architecture + 4 code quality + 30 test gaps (uncovered, accepted) + 2 perf + 18 outside-voice = ~30 actionable. **Critical gaps:** 2 (panelReducer invariant, percentile unknown category). **Decisions in this review (added or revised):** 3 user-decided cross-model tensions + ~10 factual edits.

**Mode:** FULL_REVIEW

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|---|---|---|---|---|---|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 2 | issues_found | First (design): 12 findings folded into design plan. Second (eng): 18 findings; 3 cross-model tensions resolved by user; 7 factual fixes auto-folded |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | clean | 7 architecture + 4 code quality + 2 perf + 30 test gaps (no-test-bootstrap accepted); 2 critical silent-failure gaps with mitigations |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | initial 4/10 → 9/10, 11 decisions made |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**CROSS-MODEL:** Across both Codex runs (design + eng) and the Claude subagent run, ~30 distinct findings. Design review folded all design-side findings; eng review folded all factual findings + asked user on 3 genuine tensions. Codex challenged 4 of my own architectural recommendations (A-1 narrow scope, A-4 dedup claim, A-5 over-engineered, Stage 2 contradiction) — all corrected.

**UNRESOLVED:** 0 — all 11 design decisions (D-1..D-11) locked, all 7 architecture decisions (A-1..A-7d) locked, all 3 cross-model tensions resolved by user.

**VERDICT:** DESIGN + ENG CLEARED — ready to implement once D-11 (DS `--radius-md` reconciliation) is committed to `.claude/DESIGN_SYSTEM.md`. Implementation starts at Stage 1 (parallel foundation work). First time-check: 2026-05-10 (Stage 2b sidebar removal + R-1 floating chrome). Hard stop: 2026-05-25.
