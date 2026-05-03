# Task: DESIGN_SYSTEM.md ↔ 코드 button radius 동기화

## 배경
- 직전 `/design-review --deep`에서 FINDING-105 발견: 1차 CTA가 32px pill → Cohere-inspired 미감과 충돌
- frontend-engineer가 commit `53401c6`에서 `.ui-button--primary`의 radius를 `--radius-pill`(32px) → `--radius-md`(8px)로 이미 변경
- 명세 문서는 여전히 "32px pill" 명시 → 단일 진실 원칙 깨짐
- **본 작업은 명세 동기화 only.** 코드 변경은 53401c6에 들어감.

## 변경 라인 (`docs/DESIGN_SYSTEM.md`)

### 1) Shapes & Radii 표 — `pill` 토큰 용도 재정의
- L177: `| `pill` | 32px | 1차 CTA, 큰 필터 칩 |`
  → `| `pill` | 32px | 큰 필터 칩(`button-pill-filled`), brand mark, 일부 micro-surface 한정 |`
- L180 (신규): subtle radius 가이드 한 줄 추가
  > **Cohere-inspired subtle radius** — 1차 CTA(`button-primary`)와 카드/인풋/모달 등 주요 surface는 `sm`(8px) ~ `md`(16px)로 통일한다. `pill`/`full` 같은 둥근 형태는 brand mark, badge, filter chip 같은 micro-surface에서만 쓴다.

### 2) Components — `button-primary` 명세
- L193: `12×24 padding, 32px pill. Hover #000000.`
  → `12×24 padding, **8px radius (--radius-md)**. Hover #000000. (Subtle radius로 통일 — Card/Input/Modal과 같은 어휘. 과거 32px pill은 deep audit FINDING-105에서 폐기됨.)`

### 3) Do's and Don'ts
- L226: `1차 CTA는 pill + near-black on light surface`
  → `1차 CTA는 near-black + subtle 8px radius on light surface (Card/Input과 동일 어휘)`

### 4) `dark-cta-band` 컴포넌트 — pill CTA 표현 정정
- L203: `... white pill CTA. ...`
  → `... white CTA(button-primary inverse — white fill, near-black text, 8px radius). ...`
- (이 컴포넌트는 아직 미구현. 미래 구현 시 일관성 보장)

### 5) Button.css 주석 정합 (코드 변경 아님, 주석만)
- `frontend/src/components/ui/Button.css` L4
  - `primary = Near-Black pill (radius-pill, 32px)` → `primary = Near-Black, subtle radius (radius-md, 8px)`
  - 이미 commit 53401c6에서 CSS 룰은 정확하지만 헤더 주석이 stale했음.

## 토큰 사용 현황 (`--radius-pill` 32px)

`grep -rn "radius-pill" frontend/src/` 결과:
| 위치 | 평가 |
|---|---|
| `styles/tokens.css:341` | 토큰 정의. **유지.** brand mark·향후 마이크로 표면 대비. |
| `components/ui/Button.css` | **참조 없음** (commit 53401c6 이후). 주석도 정합 처리 완료. |
| `components/Detail/RealEstateSection.css:43` | filter chip 추정. micro-surface 카테고리. **유지.** |
| `components/Map/Sidebar.css:105` | filter/segmented control. micro-surface. **유지.** |
| `components/Onboarding/PreferenceModal.css:202` | preference chip 추정. micro-surface. **유지.** |

→ Button 외 사용처 모두 정당 (filter/segmented chip = `button-pill-*` 어휘). 토큰 자체는 살려둠.

## Cross-check: UI primitives radius 일관성

| Primitive | radius token | 평가 |
|---|---|---|
| Button primary | `--radius-md` (8px) | OK — 본 task 결과 |
| Button outline / filled | `--radius-xl` (30px) | OK — 의도된 filter chip |
| Button secondary | `--radius-xs` (4px) | OK — text-only, 거의 안 보임 |
| Card | `--radius-lg` (12px) | **소폭 갭** — Card.css 주석에 의도 명시 ("legacy preserved, new 16px lives at --radius-card") |
| Input / Select | `--radius-sm` (8px) | OK — Button primary와 동일 어휘 ✓ |
| Modal surface | `--radius-card` (16px) | OK — DESIGN_SYSTEM `md` 토큰 (브리핑 데이터 블록) |
| Modal close button | `--radius-sm` (8px) | OK |
| Badge | `--radius-sm` (8px) / `--radius-xs` (4px) | **갭** — 명세는 22px chip 언급(`neighborhood-chip`)인데 코드는 8px. 추가 finding 가치 있음. |
| Tooltip | `--radius-xs` (4px) | OK |
| Slider track/thumb | `--radius-full` | OK — 의도된 round |

**핵심 일관성**: Button primary (8px) ↔ Input/Select (8px) ↔ Modal close (8px) — 어휘 통일됨. ✓

## 알려진 잔여 갭

1. **Card primitive (`--radius-lg`, 12px) vs Modal surface (`--radius-card`, 16px)**
   — 두 카드성 컨테이너가 다른 radius. Card.css 주석에 "legacy preserved" 의도가 적혀 있어 의도된 차이로 보이나, 향후 정리 여지. 본 task 범위 외.

2. **Badge (8px) vs `neighborhood-chip` 명세 (22px radius, Coral)**
   — 명세의 `neighborhood-chip`은 별도 컴포넌트로 `Badge`와 분리될 수 있음 (Badge는 status chip, neighborhood-chip은 카테고리 chip). 현재는 미구현. 향후 `neighborhood-chip` 만들 때 명세 그대로 22px로.

3. **`dark-cta-band` 컴포넌트 미구현**
   — 명세 정합만 완료. 추후 구현 담당자(`frontend-engineer`)에게 "white inverse primary, 8px radius" 가이드 명시.

## 검증 결과

- [x] `grep -i "pill\|32px" docs/DESIGN_SYSTEM.md` — pill 언급은 모두 micro-surface(filter chip, POI marker, brand mark) 한정으로만 남음
- [x] `grep -rn "radius-pill" frontend/src/components/ui/` — Button.css에 더 이상 없음
- [x] `npm run dev` → HTTP 200 응답. (시각 cross-check는 commit 53401c6 시점에 frontend-engineer가 이미 수행한 것으로 가정 — 본 task는 docs only)

## 산출물

- `/Users/bagjihyeon/Desktop/School/capston/docs/DESIGN_SYSTEM.md` (수정)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/ui/Button.css` (헤더 주석 stale 정합만)

## 다음 작업자에게 전달할 것

- `--radius-pill` 토큰은 유지. 새 컴포넌트가 1차 CTA 성격이라면 절대 쓰지 말 것 (`--radius-md` 사용).
- `dark-cta-band` 구현 시: white fill + near-black text + `--radius-md` (subtle). pill 금지.
- 새 segmented control / filter chip은 `--radius-xl` (30px outline) 또는 `--radius-pill` (32px filled) 지속 사용 가능.
- Badge ↔ neighborhood-chip 분리 결정은 디자인 시스템 v2 시점으로 미룸.

## Commit

`docs(design): sync DESIGN_SYSTEM.md primary button radius to subtle (8px)` (단일 commit)
