# Task: 디자인 폴리시 v2 완료 — 다음 세션 인수인계

이 문서는 **/clear 직후 새 세션이 읽고 바로 이어가기 위한 컨텍스트**다.
2026-05-04 기준, 슬기로운 자취생활 capstone, 마감 2026-06-05 (D-32).

먼저 `docs/SPEC.md` + `.claude/DESIGN_SYSTEM.md` + `CLAUDE.md` + 직전 핸드오프 (`.claude/handoff/20260503-deploy-ready.md`)를 정독한 뒤 본 문서를 읽을 것.

---

## 1. 현 상태 (한 문장)

**디자인 폴리시 v2 완료 — Cohere급 분석 터미널 룩으로 풀-블리드 맵 + 글로벌 TopNav + 데카드 디테일 페이지로 구조적 재작업, Design B+ → A-, AI Slop A → A 등급 달성. 다음은 발표 데모 리허설 / 폴리시 v3 (선택).**

작업 트리 clean. **35개 atomic commit** 완료 (2026-05-04 세션 분, 988e803~7e68c50).
HEAD: `7e68c50`. 마감까지 21일 버퍼.

---

## 2. 오늘 들어간 커밋 35개 (Stage 0 → Stage 5 + audit 후 fix)

### Stage 0 — 결정 잠금 (2개)
```
988e803 docs(plan): add design-polish-v2 plan (Stage 0 → Stage 5)
28621dd docs(design): D-11 reconcile --radius-md (8px) vs --radius-card (16px)
```

### Stage 1 — 토큰 + 프리미티브 (9개)
```
744963c style(tokens): P-4 tokenize floating layout magic px
f6072ab style(tokens): P-2 delete dead --color-data-* heatmap aliases
1de5535 style(map): A-3 add .map-floating-panel shared chrome class
86aa03c refactor(hooks): A-7 useEscapeKey dedups 4 ESC handlers
9e2abda feat(hooks): A-5 useIntersection hook (scaffold for R-3)
79f6d02 refactor(ui): R-5 MetricBar primitive dedups 3 score-bar implementations
8e42d7b refactor(map): R-6 KernelScorePanel uses shared <Slider> primitive
32a8cfc style(ui): P-1 Score warning value digits Coral → muted-slate
af61f57 style(404): P-7 word-break: keep-all on Korean description
3434e69 style(auth): P-8 widen login/register card max-width 420 → 480
```

### Stage 2a — Sidebar 분해 (1개)
```
dd768c7 refactor(map): Stage 2a Sidebar decomposition into 4 portable components
```
(LayerSwitcher / WeightSliders / FilterControls / CompareBlock 4개로 분리)

### Stage 2b — R-1 풀-블리드 맵 + Sidebar 제거 (2개)
```
0054236 feat(map): R-1 Stage 2b — full-bleed map + progressive-disclosure floating UI
16c0068 refactor(map): delete Sidebar — fully replaced by R-1 floating chrome
```
(`useReducer(panelReducer)` + LayerPills/CriteriaPanel/CompareChip + Legend 위치 이동)

### Stage 3 — 글로벌 TopNav + per-route topbar 제거 (1개)
```
87efaf0 feat(layout): R-2 Stage 3 — global TopNav + remove per-route topbars
```
(PageTitleContext로 /dong/:slug 페이지 → TopNav center 제목 publish)

### Stage 4 — DongDetail 재작업 + MyPage 2-column + polish (8개)
```
10fb55b feat(detail): R-3 monumental hero with score breakdown
d87e607 refactor(detail): R-3 strip Card wrappers from all 5 sections
0b4bff4 feat(detail): A-7a amenity 4-cell rows with TOP X% percentile
f0032ab feat(detail): D-3 scroll-sticky pill rail replaces sticky CTA bar
fa15dfc refactor(mypage): R-4 2-column workspace + de-card
ba707ba feat(mypage): R-4 inline edit, hover-reveal remove, empty states
2b62a72 style(compare): P-3 directional hint on rent row
0773340 style(compare): P-6 empty-state action becomes secondary button
```

### Stage 5 — 토큰 정리 + TopNav 버그 수정 (2개)
```
7da9f46 style(tokens): P-5 delete dead --radius-lg, document post-D-11 semantics
9bff279 fix(topnav): parse dong slug from pathname instead of useParams
```

### 디자인 리뷰 v2 (post-Stage 5) — Audit 후 fix-loop (8개)
```
f1d9b7d fix(a11y): F-19-2 complete the .mono-label WCAG AA fix
39dc091 fix(a11y): R-2 add id=main to MainMap section so skip-link works on /
5aa549d fix(a11y): D-3 scroll rail uses inert when hero is visible
a12254e style(detail): remove --shadow-floating from D-3 scroll rail (DS compliance)
f591261 style(tokens): replace 56px / 32px literals with --space-14 / --control-height-sm
6dd52e6 fix(detail): hero score bars show loading state instead of 0%
7e68c50 docs(tokens): correct DS source-of-truth path + stale --radius-pill comment
```

---

## 3. 의미 단위로 그룹핑한 변경

### A) 메인 지도 `/` — 완전 재작업
- **Sidebar (280px 좌측 고정) 삭제** → 풀-블리드 맵 + R-1 progressive-disclosure floating chrome
- 코너 배치 (1280×720 검증):
  - 상단 좌측: LayerSwitcher (4-탭 pill row, 종합/전월세/생활시설/교통)
  - 상단 우측: TransactionFilters + CompareChip (basket ≥1 일 때만)
  - 하단 좌측: 기준 pill (collapsed) ⇄ 확장 시 CriteriaPanel (WeightSliders + FilterControls)
  - 하단 우측: Legend + ViewToggle + Leaflet zoom 스택
- **첫-방문 코치마크**: 기준 pill 옆 "← 가중치 조절" — 4초 후 자동 dismiss / 첫 사용자 인터랙션 시 즉시 dismiss
- **Mutual exclusion via `useReducer`**: DongPanel/TransactionPanel/KernelScorePanel 셋 중 하나만 열림. 우측 패널 열리면 기준 패널 자동 collapse. (`MainMap.panelReducer.ts`에 invariant 코멘트 + ASCII 다이어그램)
- 모든 슬라이드인 패널은 닫힐 때 `inert` 속성 (post-F-20 패턴)
- ESC로 활성 패널 닫기 — `useEscapeKey` 훅 공유

### B) 글로벌 네비게이션
- `<TopNav>` 56px sticky, 모든 라우트 위에 렌더 (App.tsx)
- 3-zone 레이아웃, **center는 라우트 컨텍스트 따라 다름** (D-2 결정):
  - `/` → empty (지도가 콘텐츠)
  - `/dong/:slug` → "공릉1동" (PageTitleContext로 페이지가 publish, slug fallback 동안)
  - `/compare` → "동네 비교"
  - `/mypage` → 닉네임
  - `/login`/`/register` → empty + auth-route variant (right zone에 회원가입→/로그인→ 만)
- **Mode switcher 제거** (D-5 — `브리핑` 모드가 route-dependent라 mental model이 깨짐)
- Skip-link (`<a href="#main">`) 모든 라우트 첫 focusable
- Per-route topbar 모두 삭제 (`.dong-detail__topbar` / `.compare__topbar` / `.mypage__topbar`)

### C) `/dong/:slug` 디테일 페이지 — 데카드
- **Hero**: 노원구 캡션 (mono 아님!) + 60px 공릉1동 H1 + 한 줄 요약 + 점수 블록 + 3 MetricBar (전월세/생활시설/교통) + 미니맵 + 페이지-로컬 액션 그룹 (비교에 추가/찜하기/공유)
- Hero 높이 `min(520px, calc(100vh - var(--space-14)))` — 첫 fold에 BUDGET / RENT 시작 보임
- **5개 섹션 모두 데카드**: RealEstate/Amenity/Transit/Review/SimilarDongs → `<section className="detail-section">` (80px 패딩 + hairline rule + 720px max-width)
- 각 섹션 위 mono ENGLISH eyebrow: `BUDGET / RENT`, `AMENITIES`, `TRANSIT`, `VOICES`, `NEARBY`
- 한국어 섹션 헤딩 (부동산 시세 / 편의시설 등) 은 normal Pretendard
- **Sticky bottom CTA bar 제거** → hero action group + scroll-sticky pill rail (D-3)
- pill rail은 `useIntersection`으로 hero가 viewport 떠나면 페이드인, 다시 들어오면 페이드아웃
- pill rail은 hidden일 때 `inert` (focus leak 방지)

### D) `/mypage` — 2-column workspace
- 좌측 rail (max 360px, sticky): Profile + MY WEIGHTS
- 우측 column (max 720px, scrolls): MY FAVORITES + MY REVIEWS
- 모든 `<Card>` 제거, mono eyebrow + unframed row + hairline
- 인라인 edit (모달 X), 즐겨찾기 hover-reveal × 버튼 + 인라인 confirm
- Empty state 모두 spec 매치

### E) Component dedup
- `<MetricBar>` primitive — 3개 인라인 구현 dedup (DongPanel/KernelPanel/MyPage)
- `<Slider>` primitive — KernelScorePanel re-rolled native input 제거하고 공유 사용
- `useEscapeKey` hook — 4개 ESC handler dedup (Modal/DongPanel/TxPanel/KernelPanel)
- `useIntersection` hook — R-3 scroll-sticky pill rail용

### F) 디자인 토큰 정리
- D-11 reconcile: `--radius-md` 8px (CTA), `--radius-card` 16px (data block) 명확히 분리
- 죽은 `--radius-lg` (P-5) + `--color-data-*` aliases (P-2) 삭제
- P-4 신규 layout 토큰: `--map-control-size`, `--legend-bar-w/h`, `--hero-map-side`, `--tx-filter-min-w`
- P-1 Score warning Coral → muted-slate (DS "wide-surface coral 금지" 위반 수정)

### G) Audit 후 추가 fix (디자인 리뷰 v2 cross-model에서 잡힘)
- **AUDIT-1 (CRITICAL)**: F-19 부분 회귀 — `.mono-label` 유틸 + `.detail-section__eyebrow` 가 raw `--color-muted-slate` 직접 사용 → 3.04:1 contrast (WCAG AA fail). 둘 다 `--color-text-subtle` (slate, 4.47:1)로 라우팅. **Subagent가 codex 못 잡은 걸 잡음.**
- **AUDIT-3**: TopNav skip-link `#main`이 `/`에서 깨져 있었음 (가장 트래픽 많은 라우트!) → MainMap의 `<section>`에 `id="main"` 추가
- **AUDIT-4**: scroll-sticky pill rail이 hidden일 때 키보드 focusable → `inert` 추가
- **AUDIT-5**: pill rail이 `--shadow-floating` 사용 (DS는 floating-map-UI 전용) → 제거 (F-26 선례)
- **AUDIT-6**: HeroSection/CriteriaPanel/TopNav에 56/32px literal → `--space-14` / `--control-height-sm` 토큰화
- **AUDIT-7**: Hero 점수 바가 로딩 중 0%로 표시됨 (false data) → loading 상태에 바 숨기고 슬롯만 reserve

---

## 4. 점수 변화

|  | 사전 베이스라인 (Stage 0 직전) | 사후 (HEAD 7e68c50) | Δ |
|---|---|---|---|
| **Design Score** | B+ | **A−** | +1.5 letters |
| **AI Slop Score** | A | **A** | 유지 |
| 카테고리: Hierarchy | B | **A** | +1 |
| 카테고리: Typography | B+ | **A** | +0.5 |
| 카테고리: Spacing | B | **A** | +1 |
| 카테고리: Interaction | B+ | **A−** | +0.3 |
| 카테고리: Content | A− | **A** | +0.3 |
| 카테고리: Motion | B | **B+** | +0.3 |
| 카테고리: Responsive | C | C | 동결 (모바일 WONTFIX) |

A- (3.85 가중평균) 의 천장은 **Responsive C** — 모바일 미지원 프로젝트 결정. 그것 빼면 사실상 A.

---

## 5. 검토 / 리뷰 산출물 위치

```
docs/plan/design-polish-v2.md                                        # 1079 lines, 11 D-* + 7 A-* 결정 + outside voice 결과 모두 fold
~/.gstack/projects/wlgusqkr-capston/designs/
  design-audit-20260504/                                              # 사전 베이스라인 (B+/A) — 27개 commit 전
  design-audit-20260504-v2/                                           # 사후 (A-/A) — 이 세션 작업 + audit fix-loop
    design-audit-localhost.md                                         # 16 finding (8 fixed + 8 deferred)
    design-baseline.json                                              # 회귀 베이스 (다음 /design-review 회귀 모드용)
.gstack/design-reports/design-audit-localhost-2026-05-04-v2.md       # 같은 보고서 in-repo 미러
~/.gstack/projects/wlgusqkr-capston/bagjihyeon-main-eng-review-test-plan-20260504-120907.md  # /qa 입력용
```

---

## 6. 알려진 미해결 / deferred 항목 (다음 세션이 결정할 것)

### A) 데이터 한계 — 백엔드 확장 필요
1. **AUDIT-9 — Amenity TOP X% 가 모든 카테고리에 같은 값** (TOP 9% × 8개 카테고리). `useDongScores()` 가 dong당 `score_amenity` 하나만 반환하기 때문. `lib/percentile.ts` 헤더에 문서화. **데모 viewer가 "이거 가짜 아냐?" 의심할 위험.** 백엔드에 `amenity_breakdown_per_category` 같은 필드 추가하거나 이 컬럼 자체를 제거하는 게 정직.

### B) 8단계 구현 대기
2. **AUDIT-10 — Hero / scroll-rail 액션이 alert() placeholder** (비교에 추가 / 찜하기 / 공유). 코드에 "8단계에서 구현" 주석으로 표시. 백엔드 비교 basket / 찜 API 와 연결 필요.

### C) 의도된 디자인 결정
3. **AUDIT-11 — `/` TopNav center 비어있음 (시각적 페이지 H1 없음)**. D-2 명시적 결정 — TopNav wordmark가 브랜드 banner, 지도가 콘텐츠. sr-only H1 "서울 동네 점수 지도" 만 있음. 데모 reviewer가 "메인 페이지 제목 어디?" 물으면 의도된 거라고 설명 가능.

### D) 폴리시 (마감 전 시간 남으면)
4. **AUDIT-12 — `.mono-label` 유틸이 한국어 카피에도 사용** (TransactionFilters/Panel + RealEstate chart hint 6곳). 시각 피해는 미미 (text-transform: uppercase는 Hangul에 no-op, mono는 Pretendard로 fallback) but DS 의도 위반. `.system-hint` 같은 별도 유틸 만들고 마이그레이션.
5. **AUDIT-13 — `<SlidePanel>` primitive 추출**. DongPanel/TxPanel/KernelPanel/CriteriaPanel 각각 `__header` + `__close` (32×32 ghost button) 거의 동일하게 정의. ~120 LOC CSS dedup 가능.
6. **AUDIT-14 — `<Card>` primitive 가 DongPanel score block 한 곳에서만 사용**. Auth/Onboarding modal은 자기들 카드 클래스 따로 굴림. Card 마이그레이션 OR 제거 결정.
7. **AUDIT-15 — `<button aria-expanded>` on 기준 pill** — pill은 collapsed일 때만 마운트, 확장 시 `<aside>`로 교체. constant-true-when-mounted 패턴이라 a11y 도구가 flag할 수 있음. `aria-pressed` 토글로 변경 OR pill을 항상 마운트하고 `aria-expanded` 토글.

---

## 7. 다음에 할 가능성 높은 작업 (우선순위 추천)

### 1순위 — 데모 리허설
실제 사용 시나리오 1회 수행:
- 메인 지도 → 폴리곤 클릭 → 동네 패널 → "자세히 보기" → DongDetail (스크롤로 pill rail 확인) → "비교에 추가" 빠른-실패 alert 확인 → 메인 복귀 → CompareChip 보임 확인 → /compare 클릭 → 가중치 슬라이더 살짝 조절 → 히트맵 색 변화 확인 → /login → /register → /mypage (인증 후 2-column 워크스페이스 확인)

특히 확인할 포인트:
- 첫 방문 시 코치마크가 4초 안에 dismiss되는지
- 기준 pill 클릭 → 확장 → ESC → collapse 애니메이션 자연스러운지
- DongPanel 열렸을 때 기준 패널 자동 collapse되는지 (mutex)
- TopNav center가 라우트 따라 변하는지

### 2순위 — AUDIT-9 amenity 가짜 데이터 처리
백엔드 변경하기 싫으면 그냥 TOP X% 컬럼을 **삭제** 하는 게 정직. `AmenitySection.tsx`에서 4번째 셀 제거 + percentile.ts 삭제 + DongDetail에서 useDongScores call 제거 (다른 데서 안 쓰면).

### 3순위 — `/qa --deep` 한 바퀴
모든 7개 라우트 수동 QA. 테스트 프레임워크 opt-out (`.gstack/no-test-bootstrap`)이라 자동 테스트 없음. QA test plan은 `~/.gstack/projects/wlgusqkr-capston/bagjihyeon-main-eng-review-test-plan-20260504-120907.md` 에 있음 — `/qa` 가 자동으로 읽음.

### 4순위 — 폴리시 v3 (시간 남으면)
AUDIT-12 ~ AUDIT-16 처리. `<SlidePanel>` 추출이 가장 임팩트 큼 (~120 LOC dedup).

---

## 8. 환경 / 실행

### 로컬 개발
```bash
docker compose up -d db                                    # PostGIS 5433
cd backend && uv run python manage.py runserver 127.0.0.1:8000
cd frontend && npm run dev                                  # 5173
```

### 검증
```bash
cd frontend && npm run typecheck                            # tsc -b --noEmit, 깨끗해야 함
```

### 시각 확인 (browse 도구)
```bash
PATH="$HOME/.bun/bin:/bin:/usr/bin:/opt/homebrew/bin:$PATH"
B=~/.claude/skills/gstack/browse/dist/browse
$B viewport 1440x900
$B goto http://127.0.0.1:5173/
$B screenshot /tmp/check.png
```

### 다음 design-review (회귀 모드)
```bash
# 다음 /design-review --deep 호출 시 자동으로 design-baseline.json 비교 모드 진입
# 베이스라인 위치: ~/.gstack/projects/wlgusqkr-capston/designs/design-audit-20260504-v2/design-baseline.json
```

---

## 9. 마이크로 뉘앙스 / 함정

- **`.mono-label` 유틸이 다시 raw `--color-muted-slate` 사용하지 않게 주의**. `globals.css:174-180` 가 정답. F-19 alias-vs-utility 함정은 `~/.gstack/projects/.../learnings.jsonl` 에 기록됨.
- **Sidebar 더 이상 없음**. `Sidebar.tsx` 삭제됨 (commit 16c0068). `import Sidebar from ...` 같은 거 만들면 안 됨.
- **`useReducer(panelReducer)` invariant**: 새 `open_*` 액션 추가하면 `clearRightSelections()` 호출 필수. `MainMap.panelReducer.ts:30` 헤더 코멘트 확인.
- **TopNav center on `/dong/:slug`**: `useDongDetail(slug, weights)` 의 weights 다르면 React Query dedup 안됨. PageTitleContext 통해 page → TopNav 단방향 publish가 정답 (Codex 잡았던 A-4 버그).
- **모바일 미지원**: project memory `[project_no_mobile.md]`. `@media (max-width: 768px)` 추가 제안하지 말 것. 디자인 리뷰에서 모바일 finding은 자동 WONTFIX.
- **`.gstack/no-test-bootstrap`** 존재 — 테스트 프레임워크 opt-out. 새 sub-agent 가 테스트 추가 제안하지 말도록.
- **`docs/DESIGN_SYSTEM.md` 가 아님 — `.claude/DESIGN_SYSTEM.md` 가 정답**. 토큰 코멘트도 다 그렇게 됨 (commit 7e68c50).

---

## 10. 마지막 점검

작업 트리 클린:
```
$ git status
On main
nothing to commit, working tree clean
```

```
$ git log --oneline -5
7e68c50 docs(tokens): correct DS source-of-truth path + stale --radius-pill comment
6dd52e6 fix(detail): hero score bars show loading state instead of 0%
f591261 style(tokens): replace 56px / 32px literals with --space-14 / --control-height-sm
a12254e style(detail): remove --shadow-floating from D-3 scroll rail (DS compliance)
5aa549d fix(a11y): D-3 scroll rail uses inert when hero is visible
```

마감 2026-06-05까지 D-32. 시간 충분. 다음 세션은 데모 리허설부터.
