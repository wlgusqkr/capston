# 자취맵 -- 프로젝트 상태

마지막 업데이트: 2026-05-12

## Project Status

- **단계**: 디자인 시스템 v2 + Tailwind CSS 전환 완료
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
- **히트맵**: 5분위 (불변), **지하철**: 1~9호선 (불변)
- **타이포**: Pretendard only. 12단계 + Data Display
- **스페이싱**: 8px base (Tailwind 기본 스케일과 동일)
- **라디우스**: xs(4)/sm,md(8)/card(16)/hero(22)/xl(30)/pill(32)/full(9999)

### CSS 구조
- `globals.css` 단일 파일: @theme(토큰) + @layer base(리셋) + @utility(tabular, mono-label) + @keyframes(8개) + Leaflet 오버라이드 + DivIcon 스타일
- 컴포넌트별 .css 파일 0개. 모든 스타일은 JSX className에 Tailwind 유틸리티로 인라인.
- 예외: Recharts tooltip/legend는 inline style 필수 (라이브러리 API 제약)
- 예외: Leaflet DivIcon/tooltip은 string HTML로 렌더링되어 globals.css에 CSS 클래스 유지

### Tailwind 유틸리티 예시
`bg-primary`, `text-text-muted`, `border-divider`, `rounded-card`, `shadow-floating`, `text-caption`, `text-mono-label`

### 프리미티브 (ui/)
Button, Card, Badge, Score, MetricBar, Input, Select, Slider, Modal, Tooltip — 10개 완성.

### 쇼케이스
`/design-system` 라우트. 모든 토큰 + 프리미티브 시각 확인.

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

### 빌드
- CSS: 69KB (17KB gz) — Tailwind 전환 후 46% 감소
- JS: 971KB (288KB gz)
- tsc + vite build 통과

### 알려진 이슈
- weights가 글로벌 Context로 미승격
- Recharts tooltip formatter 타입 에러 5건 (기능 영향 없음)
- 모바일 반응형 미구현 (데스크톱 전용)

## Backend (휴면)

Django + DRF + GeoDjango. 9개 앱, 28개 모델, 18개 API 엔드포인트.

## Data (휴면)

426개 행정동, 740만 거래, 53만 상점, 800만 버스혼잡 데이터 적재 완료.
