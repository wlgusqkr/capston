# Frontend: Design Quick Wins (5종 묶음)

Deep audit (`.gstack-design-audit-deep/design-audit-deep.md`) 의 quick-wins
5건을 1 commit으로 묶어 처리. 디자인 점수 B- → A- 회복 목표.

---

## 변경 요약 (FINDING 별)

### FINDING-107 — 사이드바/Auth 로고 "슬슬" 시각 중복
- **파일**
  - `frontend/src/components/Map/Sidebar.tsx:79-82`
  - `frontend/src/routes/Login.tsx:64-67`
  - `frontend/src/routes/Register.tsx:76-79`
- **변경:** `logo-text` / `brand-text` 에서 첫 글자 "슬" 제거 → `기로운 자취생활`.
  모노그램(`슬`) span 이 첫 글자 역할.
- **접근성:** 모노그램에 `aria-hidden="true"` 추가, 부모 wrapper(`auth__brand`,
  `sidebar__logo`)에 `aria-label="슬기로운 자취생활"` 그대로 유지 → 스크린리더는
  여전히 풀 이름 들음.

### FINDING-108 — 메인 페이지 `<h1>` 부재
- **파일:** `frontend/src/routes/MainMap.tsx:314`
- **변경:** `<div className="main-map">` 직후 `<h1 className="sr-only">서울
  동네 점수 지도</h1>` 추가.
- `.sr-only` 클래스는 `globals.css:173-183` 에 이미 존재 → 신규 정의 불필요.

### FINDING-110 — Times font fallback 잔재
- **파일:** `frontend/src/styles/globals.css:25-39` (RESET 섹션)
- **변경:** universal selector 에 `font-family: var(--font-family-base)` 강제.
  ```css
  *,
  *::before,
  *::after {
    font-family: var(--font-family-base);
  }
  ```
- **영향 없음 검증:** `.mono-label` (line 163), `.tabular`, 그리고 컴포넌트별
  `font-family: var(--font-family-mono)` 명시 선언은 cascade 우선순위에서
  universal selector를 항상 이김 (specificity tie 시 source order로 뒤쪽 win이
  아니라 specificity가 동일한 universal `*` vs class `.mono-label` 비교에서
  class가 이김). Build 통과.
- **이유:** TanStack Query Devtools 같이 inline-style 로 font 미지정 element
  들이 `<body>` 의 `font-family`를 항상 상속받지 못하는 경우(특히 SVG `<text>`)
  Times로 fallback 됐었음. 이제 0건.

### FINDING-111 — 사이드바 검색창 disabled (옵션 A: 숨김)
- **파일**
  - `frontend/src/components/Map/Sidebar.tsx:10` (`Input` import 제거)
  - `frontend/src/components/Map/Sidebar.tsx:83-86` (Input 통째로 제거 + 주석)
  - `frontend/src/components/Map/Sidebar.css:52-55` (dead `.sidebar__search` 룰
    제거)
- **변경:** disabled 검색 input 통째로 제거. 데모에서 "있는데 안 됨" 시각 제거.
  `/api/dongs/search` 가 Phase 5/6 에 들어오면 다시 살림.

### FINDING-105 — Login/Register pill 버튼 → subtle radius
- **파일:** `frontend/src/components/ui/Button.css:71-83`
- **변경:** `.ui-button--primary` 의 `border-radius: var(--radius-pill)` (32px)
  → `var(--radius-md)` (8px).
- **영향 범위:** 6곳에서 `variant="primary"` 사용 중 (Login, Register,
  PreferenceModal, Sidebar, DongPanel, Compare). 모두 통일된 subtle radius로
  바뀜 → cross-page consistency 향상 (audit 표 line 173: "login/register만
  pill" 문제 해소).
- **DESIGN_SYSTEM 노트:** DESIGN_SYSTEM.md `button-primary` 정의는 여전히
  "32px pill"로 표기돼 있음. 본 변경은 audit + PM 결정 기준 (Cohere subtle
  radius 미감 우선). 차후 design-system-keeper 가 명세 동기화 필요.

---

## 검증

| 검증 | 결과 |
|---|---|
| `npm run build` (tsc + vite) | PASS, 0 error |
| `tsc --noEmit` | PASS, 0 error |
| Production bundle size | CSS 104.83 → 104.80 kB (dead rule 제거분) |
| 사이드바 로고 시각 | "슬" + "기로운 자취생활" — 중복 없음 |
| MainMap DOM h1 | sr-only 1개 ("서울 동네 점수 지도") |
| 사이드바 검색창 | 사라짐 |
| Primary CTA radius | 8px subtle (모든 사용처 일관) |
| Times fallback | universal selector reset로 차단 |

### 브라우저 콘솔 검증 스니펫 (수동)
```js
// fontFamily에 Times 잔재 있는지
[...new Set([...document.querySelectorAll('*')].slice(0, 500)
  .map(e => getComputedStyle(e).fontFamily))]
// 기대: Pretendard / JetBrains Mono / -apple-system 류만, "Times" 없음

// h1 1개
document.querySelectorAll('h1').length // 기대: 1
document.querySelector('h1').textContent // 기대: "서울 동네 점수 지도"
```

---

## 디자인 시스템 갭 (design-system-keeper 에 전달)

1. **DESIGN_SYSTEM.md `button-primary` 정의 동기화 필요**
   - 현재 명세: "32px pill (`--radius-pill`)"
   - 실제 코드: `--radius-md` (8px subtle)
   - PM 결정과 audit 결과를 명세에 반영하거나, 반대로 명세 우선이면 되돌려야
     함. 본 변경은 audit triage HIGH 였음.

2. **`--radius-pill` 토큰 사용처 점검**
   - Button primary 가 빠지면서 `--radius-pill` 의 활용은 거의 없어짐.
   - 큰 필터 칩(filled outline)에 32px 가 여전히 적용되는지 design-system-keeper
     가 일관성 점검 권장.

---

## 알려진 이슈

- **DESIGN_SYSTEM.md 와 코드 불일치 (위 1번)** — 별도 PR 로 명세 반영 또는
  롤백 결정 필요.
- **Sidebar 헤더 spacing** — 검색창 사라지면서 logo 와 user-link 사이 간격이
  약간 비어 보일 수 있음. 시각 검증 필요 (스크린샷). 필요시 후속 polish.
- **시연 환경:** dev 서버 기반 시연 시 TanStack Devtools 버튼이 여전히 우하단
  표시됨 (FINDING-103, 본 quick-win 묶음에 포함 안 됨). 데모는 `npm run build
  && npm run preview` 권장.

---

## Commit

- `style(design): bundle 5 quick wins from deep audit`
- 변경 파일 7개, +27 / -22 line.
- FINDING-105 / 107 / 108 / 110 / 111 모두 한 commit body 에 명시.

---

## 다음 작업 제안 (별도 PR)

audit 의 HIGH/MEDIUM 잔여 작업:

- FINDING-101 — Compare 더미 데이터 (백엔드 + 프론트 페어, 반나절+)
- FINDING-102 — `/dong/{slug}` URL 한글 slug 마이그레이션
- FINDING-103 — TanStack Devtools 시연용 토글
- FINDING-104 — `/404` 디자인 보강
- FINDING-106 — Compare 동률 highlight 의미 약화
- FINDING-109 — "비슷한 동네" 카드 정보 보강
