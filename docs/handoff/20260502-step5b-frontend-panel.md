# Frontend: 5단계-B — 동네 패널 (DongPanel, SPEC 6.2)

작성: 2026-05-02 (frontend-engineer)
근거: SPEC 6.2 (동네 패널 — 절대 기준), step5a 백엔드 핸드오프 (`/api/dongs/<slug>/summary`, `/scores` 확장).

---

## 완료된 작업

### Phase A — 타입 + API hook

- `src/types/api.ts`
  - 추가: `NearestStation`, `AmenityLevel ('sufficient'|'normal'|'lacking')`,
    `SafetyLevel ('high'|'mid'|'low')`, `DongSummary` (10필드).
  - `DongScore`에 백엔드 5단계-A 확장 반영: `score_rent`, `score_amenity`,
    `score_transit` 세 필드 (필수, snake_case 그대로).
- `src/lib/api.ts`
  - `getDongSummary(slug, weights): Promise<DongSummary>` 추가.
    엔드포인트 `GET /api/dongs/${slug}/summary?w_rent=&w_amenity=&w_transit=`.
- `src/hooks/useDongs.ts`
  - `useDongSummary(slug, weights)` 추가. `enabled: slug != null`,
    `staleTime: 60_000`, queryKey에 weights 3종 포함 (슬라이더 변경 시 재요청).

### Phase B — DongPanel 컴포넌트

- `src/components/Map/DongPanel.tsx` 신규
  - 우측 고정 슬라이드 패널 (width 400px, 100vh, top:0/right:0).
  - 닫힘 상태(`slug === null`)에서도 DOM 유지 + `transform: translateX(100%)`.
    열릴 때 `translateX(0)` + `transition: transform var(--transition-slow)` (300ms).
  - `aria-hidden`, `pointer-events: none`로 닫힘 시 포커스 유입 차단.
  - 헤더 — 구(작게, caption) + 동(H2 토큰) + 닫기 버튼(`×`, `--control-height-sm`).
  - 본문(스크롤):
    1. **종합 점수 카드** — `Card variant="inset" padding="lg"` + `Score size="lg"`
       (lg는 display 36px) + `unit="/ 100"` + 한 줄 요약(`summary` 필드, body 톤).
       `Score` 컴포넌트 자동 색(0~40 danger / 40~70 warning / 70~100 success).
    2. **핵심 지표 5개** — `<dl>` 기반 5행 테이블. 각 행 `border-bottom`.
       - 평균 월세: `{rent_avg}만원` (tabular)
       - 가까운 역: `{station} · {line} · 도보 {min}분`
       - 편의시설: `Badge` (sufficient="충분"/success, normal="보통"/warning,
         lacking="부족"/danger)
       - 자취생 비율: `{pct}%` (tabular)
       - 안전 지수: `Badge` (high="높음"/success, mid="보통"/warning,
         low="낮음"/danger)
    3. **점수 구성** — 가로 막대 3개 (교통 / 전월세 / 생활시설).
       내부 컴포넌트 `ScoreBar`(label, value 0~100). 트랙은 `--color-gray-100`,
       fill은 점수 구간(0~25/25~50/50~75/75~100)에 따라 `--color-data-low/mid1/mid2/high`.
       `role="progressbar"` + `aria-valuenow`.
  - 푸터(고정) — `Button variant="primary" size="lg" fullWidth`로 "자세히 보기",
    그 아래 `Button variant="secondary"` 두 개("비교에 추가" / "찜하기") 가로 2분할.
  - 로딩 상태: `dong-panel__status` 텍스트.
  - 에러 상태: `dong-panel__status--error` (`--color-danger` + 메시지 detail).
  - 키보드: ESC → `onClose`. body scroll lock 안 함, 포커스 트랩 안 함
    (모달 X — SPEC상 panel).
- `src/components/Map/DongPanel.css` 신규
  - 모든 색/타이포/스페이싱/라디우스/트랜지션 토큰. **하드코딩 hex 0건**.
  - 인지 가능한 plain px 3개:
    - `width: 400px` (panel — SPEC 6.2 380~420 중간)
    - `font-size: 22px` (× glyph — control box 자체는 `--control-height-sm` 토큰)
    - `box-shadow: -2px 0 12px rgba(0,0,0,0.06)` (얇은 layering hint —
      토큰에 shadow 스케일 미정의, 주석으로 정당화)

### Phase C — MainMap 통합

- `src/routes/MainMap.tsx`
  - 새 state: `selectedSlug: string | null` (초기 null).
  - `useNavigate()` 추가.
  - `handleDongClick`: `console.log` 제거, `setSelectedSlug(dong.slug)`.
  - `useMemo`로 `selectedRawScores` 도출:
    `data.find(d => d.slug === selectedSlug)`에서
    `{ rent: row.score_rent, amenity: row.score_amenity, transit: row.score_transit }`
    (없으면 null). → DongPanel 점수 막대용. **별도 query 없음.**
  - 콜백:
    - `onClose` → `setSelectedSlug(null)`
    - `onOpenDetail(slug)` → `navigate('/dong/${slug}')` (현재 NotFound로 이동, 6단계에서 라우트 등록)
    - `onAddCompare` → `alert('비교 목록에 추가됨 (8단계에서 구현)')`
    - `onFavorite` → `alert('로그인 후 찜하기 (9단계에서 구현)')`
  - `<DongPanel ... />`을 `.main-map__map` (position: relative) 내부에 렌더 →
    panel이 지도 영역 우측에 absolute로 위치.

---

## 산출물 (모두 절대 경로)

신규:
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/DongPanel.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/DongPanel.css`

수정:
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/types/api.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/api.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/hooks/useDongs.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MainMap.tsx`

기존 보존: 디자인 시스템, ui/* 프리미티브, Map 외 기타 모두 무수정.

---

## API hooks 추가

- `useDongSummary(slug: string | null, weights: Weights): UseQueryResult<DongSummary>`
  - 엔드포인트: `GET /api/dongs/${slug}/summary?w_rent=&w_amenity=&w_transit=`
  - `enabled: slug != null` — slug가 null이면 비활성 (네트워크 호출 X)
  - queryKey: `['dongs', 'summary', slug, w_rent, w_amenity, w_transit]`

---

## 결정 사항

### F1. 점수 구성 (rent/amenity/transit) 데이터 소스 — **부모(MainMap)에서 prop 전달**

대안:
- (A) DongPanel 내부에서 `useDongScores`를 한 번 더 호출
- (B) `useQuery({queryKey: ['dongs','scores',weights], select: (d) => d.find(...)})` 분리
- **(C) 부모가 이미 `useDongScores(weights)` 결과를 가지고 있으니, 그 리스트에서
  matching slug의 raw 점수 3종을 `rawScores` prop으로 내려보낸다.**

채택: **C**. 이유:
- 동일 query를 두 번 마운트하지 않음 (TanStack Query가 캐시한다 해도 hook이 두 번
  실행되는 건 가독성 떨어짐).
- DongPanel은 단일 책임에 집중 (summary fetch + 표시).
- raw 점수가 변하는 트리거는 **가중치가 아니라 백엔드 데이터 변경**이고,
  이는 부모의 `useDongScores`가 이미 잡고 있음.

`useMemo`로 lookup 캐시 → MainMap re-render 시에도 안정.

### F2. /summary 응답에 raw 점수 X — 의도적

step5a 백엔드 핸드오프 명시: summary 응답은 가중치 적용된 `score`만 포함하고
raw 점수는 `/scores`에 위치. F1과 정합. 5단계에서 응답 형식 변경 요청 없음.

### F3. ESC 닫기 — body scroll lock / focus trap 안 함

DongPanel은 modal이 아니라 panel. SPEC 6.2도 모달이라 적시하지 않음. 지도 위에
떠 있긴 하지만 사용자가 지도와 동시에 보는 UI. `Modal`(`ui/Modal`) 사용 X.

### F4. summary.score 표시 — 정수 반올림 + tabular

`Score` 컴포넌트가 정수 값을 받도록 설계되어 `Math.round(summary.score)` 적용.
실 점수(소수 둘째 자리)는 `aria-label`에 보존: "필동 종합 점수 60.3점".

### F5. 한 줄 요약 — 백엔드 결정값 그대로

룰베이스(SPEC 11.3)는 백엔드(step5a `apps/neighborhoods/summary.py`)에서 수행.
프론트는 `summary` 필드를 그대로 노출. 프론트에서 후처리 없음.

### F6. 검색창 / 레이어 탭 / 필터 — 4단계 그대로 미구현

PROMPTS 5단계 범위 외. 6단계 이후 고려.

---

## 검증

### TS / 빌드
- `npx tsc --noEmit` → PASS (0 errors)
- `npm run build` → PASS
  - 222 modules transformed
  - dist/index-*.js: 414.72 KB / gzip 131.99 KB
  - dist/index-*.css: 46.59 KB / gzip 11.78 KB

### 백엔드 응답 (sanity check)
- `GET /api/dongs/scores?w_rent=33&w_amenity=33&w_transit=34`
  → 200, `score_rent/score_amenity/score_transit` 포함된 5개 항목 (예: hoegidong 80/75/60).
- `GET /api/dongs/pildong/summary?w_rent=33&w_amenity=33&w_transit=34`
  → 200, 정확한 응답 형식 (10필드).

### Vite dev 서버
- `npm run dev` 부팅 정상.
- `/src/components/Map/DongPanel.tsx`, `/src/routes/MainMap.tsx` transform 200.

### 시각 검증 절차 (메인 코디네이터/사용자가 수행)

```bash
# 터미널 1
cd /Users/bagjihyeon/Desktop/School/capston/backend
.venv/bin/python manage.py runserver

# 터미널 2
cd /Users/bagjihyeon/Desktop/School/capston/frontend
npm run dev
```

브라우저 http://localhost:5173 (또는 5174/5175 등 노출된 포트) 확인:

- [ ] 폴리곤 클릭 → 우측 패널이 0.3s 슬라이드 인.
- [ ] 헤더에 "{구}" 작게 + "{동}" 크게.
- [ ] 종합 점수 카드 — 큰 숫자 + "/ 100" + 한 줄 요약 (회색 inset 배경).
- [ ] 핵심 지표 5행 — 평균 월세 / 가까운 역 / 편의시설(배지) / 자취생 비율 / 안전 지수(배지).
- [ ] 점수 구성 3개 막대 — 교통 / 전월세 / 생활시설. 점수 구간별 4단계 컬러.
- [ ] CTA 3개 — "자세히 보기"(primary, full) + "비교에 추가" / "찜하기"(secondary 2분할).
- [ ] 닫기(×) 클릭 → 패널 슬라이드 아웃.
- [ ] ESC 키 → 패널 닫힘.
- [ ] "자세히 보기" 클릭 → URL이 `/dong/{slug}`로 변경, NotFound 표시 (6단계까지 정상).
- [ ] "비교에 추가" / "찜하기" → 각각 alert 메시지.
- [ ] 가중치 슬라이더 변경 → 패널의 `score`와 `summary` 갱신 (raw 점수 막대는 변하지 않음).
- [ ] 동을 바꿔 클릭(pildong/hoegidong/seogyodong/jamsildong/yeoksamdong)
      → 한 줄 요약, 점수 막대, 핵심 지표가 동마다 시각적으로 명확히 다름.
      예시:
      - pildong (rent 35 / amenity 55 / transit 90): 교통 강조, "교통 좋고 생활시설 부족..."
      - hoegidong (80/75/60): 균형형, "월세 저렴하고 시설도 무난..."
      - seogyodong (30/92/78): 시설+교통, "시설·교통 모두 좋아..."
- [ ] 다크 모드 (`document.documentElement.setAttribute('data-theme','dark')`)
      → 패널 배경/보더/텍스트 모두 자동 다크 톤. 점수 막대 컬러도 다크 팔레트.

---

## 6단계 frontend-engineer가 알아야 할 것

### 라우트 `/dong/:slug` 등록

- `MainMap`의 "자세히 보기" 콜백은 이미 `useNavigate()`로 `/dong/${slug}` 이동.
- `App.tsx`에 다음 라우트 추가 시점 = 6단계:
  ```tsx
  <Route path="/dong/:slug" element={<DongDetail />} />
  ```
- 라우트 등록 전까지는 NotFound가 잡음 (의도된 동작).

### DongPanel 재사용/확장 가능성

- DongPanel 자체는 내부 fetch + 표시 책임. 만약 `/dong/:slug` 페이지에서
  동일 정보가 필요하면 `useDongSummary(slug, weights)` 직접 호출 가능 (hook 재사용).
- DongPanel을 detail 페이지에서 미리보기로 재사용하는 건 권장하지 않음
  (detail은 풀스크린 H1 페이지, panel은 sidebar UI — 책임 다름).

### 검색 진입 시 패널 자동 오픈 (SPEC 6.1)

- 6단계에서 검색 자동완성 구현 시, 선택된 동의 `slug`로
  `setSelectedSlug(slug)` 호출 + 카메라 `flyTo(latlng)` 결합.

### 가중치 영속화

- 현재 weights는 `MainMap` useState. 다크 모드와 동일하게 메모리 only.
  영속화 결정은 8단계 마이페이지 / 백엔드 UserPreference 모델 시점.

---

## 알려진 이슈 / 한계

1. **더미 5개라 패널 다양성 제한** — pildong/hoegidong/seogyodong/yeoksamdong/
   jamsildong 5개. 426개 적재(10단계)되면 자연스럽게 해소.
2. **`nearest_station.line`이 "정보 없음" 또는 "-" 케이스** — 5개 더미는
   하드코딩된 실제 역이지만, 그 외 slug에서 백엔드가 fallback `{name:"정보 없음",
   line:"-", walking_min:0}` 반환. 현재 5개만 클릭 가능하므로 실제 노출 X.
   향후 필요 시 클라에서 walking_min:0 가드 검토.
3. **detail 라우트 미존재** — "자세히 보기" 클릭 시 NotFound 표시. 6단계까지 의도.
4. **toast 컴포넌트 미존재** — alert로 임시 처리. step2 핸드오프에 명시된 대로
   토스트 시스템화는 추후. CTA 빈도가 낮아 알림이면 충분.
5. **panel과 sidebar 사이 z-index 충돌 없음** — sidebar는 정적 flex 영역, panel은
   `.main-map__map` 내부 absolute. legend(z-index 미설정)와 panel(z-index 500) 사이
   panel이 위. 의도된 적층.
6. **panel 열린 상태 URL 동기화 X** — step4 결정 그대로. 6단계 detail 진입 시
   URL이 바뀌므로 별도 영속화 불필요.
7. **모바일 반응형 X** — 1280px+ 데스크톱 가정 (frontend-engineer 가이드).

---

## 디자인 시스템 갭 (design-system-keeper에 보고)

- 없음. 이번 패널은 기존 토큰/컴포넌트(Button, Card, Score, Badge)로 100% 커버.
- 점수 막대(`ScoreBar`)는 단순한 `<div>` 트랙 + fill로 직접 구현. 향후 동네 비교
  화면(SPEC 6.4) 또는 동네 상세(SPEC 6.3 편의시설 카드)에서 동일한 패턴이 반복되면
  `ProgressBar` / `MetricBar` 프리미티브로 시스템화 검토 가능. 현재 단계에선 과추상화.
