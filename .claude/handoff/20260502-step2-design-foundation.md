# Task: 2단계 — 디자인 시스템 베이스

작성: 2026-05-02 (design-system-keeper)
PROMPTS.md 2단계 / SPEC.md 섹션 4 기준.

와이어프레임 이미지가 없으므로 SPEC 4(디자인 시스템) + 6(화면별 명세)의 텍스트 명세만 기준으로 진행했음.

---

## 완료된 작업

1. CSS 토큰 (`tokens.css`) — 컬러/타이포/스페이싱/라디우스/트랜지션 + 라이트/다크 두 모드
2. 전역 스타일 (`globals.css`) — Pretendard, reset, body 디폴트, `.tabular`/`.sr-only` 유틸
3. UI 프리미티브 9종 (TypeScript + 동반 CSS)
   - Button, Card, Badge, Score, Input, Select, Slider, Modal, Tooltip
4. 컬러 매핑 함수 (`lib/colors.ts`) — Leaflet/Recharts 등 비-CSS 환경용
5. Barrel export (`ui/index.ts`)

---

## 산출물 (파일 경로)

### 스타일 토큰 / 전역
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/styles/tokens.css`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/styles/globals.css`

### UI 프리미티브
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/ui/Button.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/ui/Card.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/ui/Badge.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/ui/Score.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/ui/Input.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/ui/Select.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/ui/Slider.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/ui/Modal.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/ui/Tooltip.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/ui/index.ts`

### 유틸
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/colors.ts`

---

## 추가된 토큰 (변수 이름 + 의도 + 라이트/다크 값)

### Brand
| 변수 | 의도 | 라이트 | 다크 |
|---|---|---|---|
| `--color-primary` | 짙은 청록, 메인 버튼/액센트 | `#0F6E56` | `#1D8E70` |
| `--color-primary-hover` | primary hover 상태 | `#0C5C48` | `#25A481` |
| `--color-primary-soft` | primary 톤 배경 (배지·hover) | `#E2EFEA` | `rgba(29,142,112,.18)` |
| `--color-secondary` | 따뜻한 오렌지 강조 | `#BA7517` | `#D08A2C` |
| `--color-secondary-hover` | secondary hover | `#A16513` | `#E69D3D` |
| `--color-secondary-soft` | secondary 배경 톤 | `#F6EADB` | `rgba(208,138,44,.18)` |

### Neutral
| 변수 | 라이트 | 다크 |
|---|---|---|
| `--color-gray-50` | `#F9F9F8` | `#1B1B1A` |
| `--color-gray-100` | `#F1EFE8` | `#232321` |
| `--color-gray-200` | `#D3D1C7` | `#3A3A36` |
| `--color-gray-400` | `#888780` | `#8C8B83` |
| `--color-gray-600` | `#5F5E5A` | `#B8B6AC` |
| `--color-gray-900` | `#2C2C2A` | `#ECEBE3` |

### Semantic surface
- `--color-bg` (페이지 배경)
- `--color-surface` (카드 배경 default)
- `--color-surface-inset` (카드 배경 inset variant, gray-50)
- `--color-border` (카드 보더, `rgba(0,0,0,.08)` / 다크 `rgba(255,255,255,.10)`)
- `--color-border-strong` (입력 컨트롤 보더, gray-200)
- `--color-text` / `--color-text-muted` / `--color-text-subtle`
- `--color-text-on-primary` (primary 위 텍스트, `#FFFFFF`)

### Data viz (히트맵 4단계)
| 변수 | 라이트 | 다크 |
|---|---|---|
| `--color-data-low` | `#378ADD` | `#5AA3E8` |
| `--color-data-mid1` | `#1D9E75` | `#2DB084` |
| `--color-data-mid2` | `#EF9F27` | `#F2AE43` |
| `--color-data-high` | `#E24B4A` | `#EC6160` |

### Status
- `--color-success` / `--color-success-soft`
- `--color-warning` / `--color-warning-soft`
- `--color-danger` / `--color-danger-soft`
- `--color-info` / `--color-info-soft`
- `--color-neutral` / `--color-neutral-soft`

### Focus / Backdrop
- `--color-focus-ring` (primary 35%)
- `--color-backdrop` (모달 백드롭)

### Typography
- 폰트: `--font-family-base` (Pretendard variable)
- 사이즈/라인/굵기 페어:
  - h1: 28 / 1.2 / 600
  - h2: 22 / 1.2 / 600
  - h3: 18 / 1.3 / 600
  - display: 36 / 1.1 / 700  ← 핵심 지표 숫자
  - body: 15 / 1.5 / 400
  - caption: 13 / 1.5 / 400
  - hint: 11 / 1.4 / 500
- `--letter-spacing-ko: -0.01em` (Pretendard 권장)

### Spacing
- `--space-1..8`: 4 / 8 / 12 / 16 / 20 / 24 / 32

### Radius
- `--radius-sm: 6px` (배지)
- `--radius-md: 8px` (버튼·인풋)
- `--radius-lg: 12px` (카드·모달)
- `--radius-full: 9999px`

### Control / Transition / Z-index
- `--control-height-sm/md/lg`: 32 / 40 / 48
- `--badge-height: 22px`
- `--transition-fast/base/slow`: 120 / 200 / 300ms (slow는 SPEC 6.1 히트맵 색상 트랜지션용)
- `--z-modal-backdrop / --z-modal / --z-tooltip`: 1000 / 1010 / 1100

---

## 추가된 컴포넌트 (props 시그니처 + 사용 예시)

### Button
```ts
{ variant?: 'primary'|'secondary'|'ghost', size?: 'sm'|'md'|'lg',
  loading?: boolean, fullWidth?: boolean,
  leftIcon?: ReactNode, rightIcon?: ReactNode, ...ButtonHTMLAttributes }
```
```tsx
<Button onClick={openDetail}>자세히 보기</Button>
<Button variant="secondary" size="sm">비교에 추가</Button>
<Button loading>저장 중</Button>
```

### Card
```ts
{ variant?: 'default'|'inset', padding?: 'none'|'md'|'lg', as?: ElementType }
```
```tsx
<Card padding="lg">{...}</Card>
<Card variant="inset">{...}</Card>
```

### Badge
```ts
{ variant?: 'success'|'warning'|'danger'|'info'|'neutral', size?: 'sm'|'md' }
```
```tsx
<Badge variant="success">충분</Badge>
```

### Score
```ts
{ value: number, unit?: string, delta?: number,
  size?: 'md'|'lg', tone?: 'danger'|'warning'|'success', ariaLabel?: string }
```
점수 색은 자동: 0~40 danger, 40~70 warning, 70~100 success.
```tsx
<Score value={78} unit="/ 100" size="lg" />
<Score value={62} delta={+4} />
```

### Input
```ts
{ label?, hint?, error?, leftSlot?, rightSlot?, ...InputHTMLAttributes }
```
```tsx
<Input label="검색" placeholder="동 이름" />
```

### Select
```ts
{ label?, hint?, error?, ...SelectHTMLAttributes, children: ReactNode }
```
네이티브 `<select>` 래핑 + 인라인 SVG chevron.
```tsx
<Select label="기간" value={p} onChange={e=>setP(e.target.value)}>
  <option value="3m">3개월</option>
</Select>
```

### Slider — **SPEC 6.1 가중치 슬라이더의 핵심**
```ts
{ value: number, onChange: (value: number) => void,
  min?: number, max?: number, step?: number,
  label?: ReactNode, valueText?: ReactNode, hideHeader?: boolean }
```
**onChange는 number를 직접 받음** (이벤트 X). 가중치 정규화 코드를 깔끔하게 하기 위함.
```tsx
<Slider
  label="전월세"
  value={wRent}
  onChange={(v) => setWRent(v)}   // number, not event
  valueText={`${wRent}%`}
/>
```

### Modal
```ts
{ open: boolean, onClose: () => void,
  title?: ReactNode, ariaLabel?: string, maxWidth?: number,
  dismissOnBackdrop?: boolean, dismissOnEsc?: boolean,
  hideCloseButton?: boolean, children: ReactNode }
```
- `createPortal`로 `document.body`에 렌더 → React 18+ 필요
- ESC, 백드롭 클릭, body scroll lock, Tab 포커스 트랩, 이전 포커스 복원 모두 처리됨
```tsx
<Modal open={open} onClose={() => setOpen(false)} title="가중치 학습" maxWidth={600}>
  <p>5번 비교를 시작할까요?</p>
</Modal>
```

### Tooltip
```ts
{ label: ReactNode, placement?: 'top'|'bottom'|'left'|'right', children: ReactElement }
```
DOM 요소용. **Leaflet 폴리곤 호버 툴팁(SPEC 6.1)에는 사용하지 말 것** — Leaflet 내장 tooltip 사용.
```tsx
<Tooltip label="비교 목록에 추가"><Button>+</Button></Tooltip>
```

---

## 4단계 frontend-engineer가 알아야 할 사항

### 1. Vite 프로젝트 셋업 시 기존 파일 보존

`frontend/src/styles/`, `frontend/src/components/ui/`, `frontend/src/lib/colors.ts`는 **이미 존재**.
`npm create vite@latest`로 생성 시 만들어지는 디폴트는 **삭제하고**, 다음 파일들만 새로 작성:
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/tsconfig.node.json`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- (디폴트로 생기는 `App.css`, `index.css`, `assets/`는 우리 토큰 시스템과 충돌하므로 삭제)

### 2. main.tsx에서 import 순서 (반드시 이 순서)

```ts
import './styles/tokens.css';   // CSS variables 먼저
import './styles/globals.css';  // reset/base 다음
// 그 다음 라우팅, App 등
```

### 3. tsconfig.json 권장 설정

- `"strict": true`
- `"jsx": "react-jsx"`
- 모듈 alias `@/*` → `src/*` 권장 (그러면 `import { Button } from '@/components/ui'` 가능)
- alias 안 쓸 거면 상대 경로 OK: `import { Button } from '../components/ui'`

### 4. 컬러 매핑 함수 시그니처

```ts
// frontend/src/lib/colors.ts
export function scoreToHeatmapColor(score: number, theme?: 'light'|'dark'): string;
export function scoreToHeatmapBucket(score: number): 'low'|'mid1'|'mid2'|'high';
export const HEATMAP_COLORS;       // 라이트 팔레트 객체
export const HEATMAP_COLORS_DARK;  // 다크 팔레트 객체
```

Leaflet polygon style 콜백에서 직접 사용:
```ts
const style = (feature) => ({
  fillColor: scoreToHeatmapColor(feature.properties.score, theme),
  fillOpacity: 0.7,
  color: '#fff',
  weight: 1,
});
```

**중요**: 이 함수는 단순히 0~100 → 4구간 컬러 매핑. "낮은 점수=좋음/저렴" 같은 의미 매핑은 호출부 책임. 점수가 의미상 항상 "높을수록 좋다"이면 그대로 쓰면 되고, 반대 방향이면 `100 - score`를 넘기거나 caller가 변환.

### 5. 다크 모드 토글 방법

```ts
// 라이트 강제
document.documentElement.removeAttribute('data-theme');
// 또는
document.documentElement.setAttribute('data-theme', 'light');

// 다크 강제
document.documentElement.setAttribute('data-theme', 'dark');

// 시스템 따라가기 (디폴트)
document.documentElement.removeAttribute('data-theme');
// → @media (prefers-color-scheme: dark) 적용됨
```

영속화는 `localStorage`/`sessionStorage` 금지(CLAUDE.md). 4단계에서 영속화 필요하면 백엔드 `UserPreference` 모델에 컬럼 추가하거나, 메모리 컨텍스트로 두고 새로고침 시 시스템 설정 따라가게 두는 게 적절.

### 6. 핵심 사용 패턴

- 컴포넌트 import: `import { Button, Card, Score } from '@/components/ui'`
- CSS 변수만 사용. 하드코딩 hex/px 금지.
- 숫자 표시는 항상 `<span className="tabular">` 또는 `Score` 컴포넌트.
- 한글 텍스트는 자동으로 letter-spacing -0.01em 적용됨 (body에 걸려 있음).

### 7. SPEC 매핑 빠른 참조

| SPEC 위치 | 사용할 컴포넌트 |
|---|---|
| 6.1 메인 지도 사이드바 가중치 슬라이더 | `Slider` (3개) |
| 6.1 호버 툴팁 (지도 위) | Leaflet 내장 tooltip (우리 `Tooltip` 아님) |
| 6.1 검색창 | `Input type="search"` |
| 6.1 레이어 탭 | 직접 구현 (탭 프리미티브 미제공) |
| 6.2 동네 패널 종합점수 카드 | `Card variant="inset"` + `Score size="lg"` |
| 6.2 핵심 지표 5개 | `Card` + 직접 테이블 |
| 6.2 점수 구성 가로 막대 | 직접 구현 (또는 Recharts) |
| 6.2 CTA 버튼 | `Button variant="primary"`, `Button variant="secondary"` |
| 6.3 동네 상세 — 카드 그리드 | `Card` |
| 6.3 카테고리 충분/보통/부족 배지 | `Badge variant="success/warning/danger"` |
| 6.4 비교 표 | 직접 테이블, 헤더 배경 `var(--color-gray-100)` |
| 6.5 선호 학습 모달 | `Modal maxWidth={600}` |

---

## 결정사항 / 메모

- **`tone` prop을 Score에 추가**: 자동 색상 외에 강제 오버라이드 필요할 때 (예: 평균 대비 표시).
- **Slider onChange가 number 받음**: 가중치 정규화 코드의 가독성을 위해 이벤트 대신 값 전달.
- **dark theme primary 살짝 밝게 (`#1D8E70`)**: 다크 surface 위에서 명도 차이 확보. WCAG AA 텍스트 대비 충족.
- **Tooltip은 DOM 전용**: 지도 폴리곤 호버는 Leaflet 내장 사용 (성능 + 좌표 추적이 Leaflet 쪽에서 더 정확).
- **컴포넌트 CSS는 동반 `.css` 파일로 분리**: 4단계에서 Vite는 자동 번들링 → 추가 설정 불필요.
- **데이터 컬러와 Status 컬러를 분리한 토큰**: hex가 같지만 의미가 다르므로 미래에 한쪽이 바뀌어도 안전.
- **focus ring 토큰화**: 컴포넌트 9종 모두 동일한 ring 사용 → 일관성.

## 미완 / 알려진 이슈

- **Toast / Snackbar 미제공**: SPEC 6.2 "비교 목록에 추가됨" 토스트는 4단계에서 frontend-engineer가 별도 구현 필요. 시스템 일부가 될 정도의 빈도가 아니어서 의도적으로 빼둠.
- **Tabs / RadioGroup 미제공**: SPEC 6.1 레이어 탭은 4단계에서 직접 구현 (간단). 시스템화는 사용 패턴 보고 추후 결정.
- **Spinner 단독 컴포넌트 없음**: Button 내부에만 있음. 페이지 로딩용 큰 스피너 필요하면 4단계에서 추가.
- **다크 모드 영속화 미정**: PROMPTS.md 지시에 따라 일단 컴포넌트/메모리 레벨로만. 4단계 또는 마이페이지 단계에서 결정.
- **테마 토글 컨트롤 미제공**: 토글 컴포넌트(스위치)는 SPEC에 명시적으로 없음. 마이페이지 단계에서 필요시 추가.
- **검증**: Vite 프로젝트가 아직 없어서 실제 컴파일/렌더 검증은 4단계 첫 실행 시 확인 필요. CSS는 standalone validity 확인했고, TypeScript는 React 18 + strict mode 가정으로 작성.
