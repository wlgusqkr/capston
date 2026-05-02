# Task: 4단계 — 프론트 메인 지도 (SPEC 6.1)

작성: 2026-05-02 (frontend-engineer)
PROMPTS.md 4단계 / SPEC 섹션 6.1 기준.

기존 디자인 시스템(`src/styles/`, `src/components/ui/`, `src/lib/colors.ts`) 그대로 보존. Vite + React + TypeScript strict 신규 셋업, Leaflet 히트맵 + 좌측 사이드바 + 범례 + 2D/3D 토글까지 1차 구현.

---

## 완료된 작업

### Phase A — Vite 셋업
- `package.json`, `vite.config.ts`, `tsconfig.{json,app.json,node.json}`, `index.html` 작성
- `npm install` 성공 (104 패키지). 의존성:
  - 런타임: react 18.3, react-dom, react-router-dom 6.27, @tanstack/react-query 5.59 (+ devtools), axios 1.7, leaflet 1.9, react-leaflet 4.2
  - 개발: vite 5.4 + @vitejs/plugin-react, typescript 5.6, @types/{react, react-dom, node, leaflet}
- alias `@/*` → `src/*` (`vite.config.ts` + `tsconfig.app.json` 양쪽)
- dev proxy `/api` → `http://localhost:8000` (CORS 우회 옵션)
- `frontend/.env`: `cp .env.example .env` (VITE_API_BASE_URL=http://localhost:8000/api)
- `index.html`: `<html lang="ko">`, title "슬기로운 자취생활", meta charset utf-8

### Phase B — 데이터 파이프
- 타입: `src/types/api.ts` — `DongScore`, `Weights`, `DEFAULT_WEIGHTS`
- API 클라이언트: `src/lib/api.ts` — axios 인스턴스 + `getDongScores(weights)`
- 훅: `src/hooks/useDongs.ts` — `useDongScores(weights)` (TanStack Query)
- 라우터: `src/App.tsx` — `/` → MainMap, `*` → NotFound
- `main.tsx`: tokens.css → globals.css → StrictMode → QueryClient → BrowserRouter → App. 개발 모드에서만 ReactQueryDevtools.

### Phase C — 메인 지도 UI
SPEC 6.1 그대로:
- `src/routes/MainMap.tsx` + `MainMap.css` — 좌(280) + 우(map full-bleed) flex 레이아웃, 가중치/필터 상태 owner
- `src/components/Map/HeatMap.tsx` (+ `.css`)
  - `MapContainer` center 서울 시청 (37.5665, 126.978), zoom 11
  - OSM tile + `ZoomControl position="topright"`
  - 5개 동을 `boundingPolygon(lat, lng, 0.005)` 사각형으로 렌더 (10단계 GeoJSON 적재 시 교체)
  - `fillColor = scoreToHeatmapColor(score)` (라이트 팔레트, weight 1, fillOpacity 0.6)
  - hover: setStyle로 fillOpacity 0.85 + weight 2, Leaflet 내장 `<Tooltip>` (구·동·점수)
  - click: `onDongClick` props 콜백 → MainMap에서 `console.log` (5단계 패널은 별도)
- `src/components/Map/Sidebar.tsx` (+ `.css`)
  - 헤더: 로고 자리 + 검색창 placeholder (`Input type="search" disabled`)
  - 레이어 탭 4개 (종합/전월세/생활시설/교통, 시각만)
  - 가중치 슬라이더 3개 (`ui/Slider`), 한 슬라이더 변경 시 나머지 둘을 비례 분배 (정확히 합 100)
  - "5번 비교로 자동 추천 →" 프라이머리 버튼 → `alert('선호 학습 온보딩 — 7단계에서 구현됨')`
  - 필터: "대학교 근처만" 체크박스 + "월세 상한" 체크박스 + 슬라이더 (UI만, 로직 없음)
- `src/components/Map/Legend.tsx` (+ `.css`) — 4단계 그라디언트 (`var(--color-data-low/mid1/mid2/high)`), 좌하단
- `src/components/Map/ViewToggle.tsx` (+ `.css`) — 2D 활성/3D disabled, 우하단

### Phase D — 검증
- `npm run typecheck` → 통과
- `npm run build` → 통과 (220 modules, 408 KB JS / 41 KB CSS, gzip 130 / 11 KB)
- `npm run dev` → 200, transform 정상 (단발성 dep optimization race 1회 → `.vite` 캐시 삭제 후 재기동으로 해결)
- 백엔드 미기동 (PROMPTS 지시: frontend-engineer는 백엔드 직접 띄우지 말 것). 메인 코디네이터가 백엔드 띄운 뒤 브라우저 검증 필요.

---

## 산출물 (파일 경로, 모두 절대 경로)

### 셋업
- `/Users/bagjihyeon/Desktop/School/capston/frontend/package.json`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/package-lock.json`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/vite.config.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/tsconfig.json`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/tsconfig.app.json`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/tsconfig.node.json`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/index.html`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/.env` (gitignored, .env.example과 동일 키)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/vite-env.d.ts`

### 부트스트랩
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/main.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/App.tsx`

### 라우트
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MainMap.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MainMap.css`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/NotFound.tsx`

### 지도 컴포넌트 (`src/components/Map/`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/HeatMap.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/Sidebar.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/Legend.tsx` (+ `.css`)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/ViewToggle.tsx` (+ `.css`)

### 데이터 / 유틸 / 타입
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/types/api.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/api.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/weights.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/geo.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/hooks/useDongs.ts`

기존 보존 (수정/덮어쓰기 0건):
- `frontend/src/styles/{tokens,globals}.css`
- `frontend/src/components/ui/*` (9 컴포넌트 + index.ts)
- `frontend/src/lib/colors.ts`
- `frontend/.env.example`

---

## 주요 결정 사항

### D1. 가중치 변경 시 — **백엔드 재호출** 채택 (클라 재계산 X)
SPEC 14.3은 "가중치 변경 시 색상 재계산은 클라이언트에서"를 권장하지만, **현재 백엔드 응답에 분리 점수 (score_rent/amenity/transit)가 포함되지 않아** 클라가 재계산할 베이스가 없다. 응답 필드는 `slug, name, gu, score, lat, lng`만이라 score는 이미 가중합. 5개 더미라 재호출 비용은 무시 가능.

→ 5단계 또는 데이터-파이프(10단계) 시점에 백엔드에 옵션을 제안 권장:
- A안 (가벼움): 응답에 `score_rent, score_amenity, score_transit` 3종 추가. 클라가 dot product 직접 계산.
- B안 (현 상태 유지): 5개~426개라도 백엔드 캐시(django-redis 5분)로 충분. 슬라이더 throttle 100ms 정도 필요.

### D2. 가중치 슬라이더 정규화 — 비례 재분배
한 슬라이더가 X% 이동하면 나머지 둘을 기존 비율 유지하며 (100 - X)로 분배. 둘이 모두 0이면 균등 분배. 정수 보정으로 합이 정확히 100이 되도록 보장 (`src/lib/weights.ts`).

### D3. 더미 폴리곤 — 클라이언트 사각형
`/public/seoul_dongs.geojson` 부재 (10단계 산출물). `boundingPolygon(lat, lng, 0.005)` 헬퍼로 약 555m 변 사각형을 그려 데모 가시성 확보. **GeoJSON 들어오면 `<Polygon>.map`을 `<GeoJSON>` 한 개로 교체하고 헬퍼 제거**.

### D4. Tooltip — Leaflet 내장 사용
DOM Tooltip 컴포넌트(`ui/Tooltip`)는 SPEC 4 디자인 시스템 자산이지만, 426개 폴리곤에서 좌표 추적 비용 때문에 SPEC 6.1 호버 툴팁은 Leaflet `<Tooltip>` 사용. 디자인 토큰 매핑은 `HeatMap.css`에서 `.leaflet-tooltip` 직접 오버라이드.

### D5. 필터/검색 — 시각만
"대학교 근처만", "월세 상한", 검색창 모두 SPEC 6.1에 명시되어 있어 **표시는 하되 동작은 미구현**. 백엔드 엔드포인트(`/api/dongs/search`, 필터링)가 5단계 이후 들어오면 wire up.

### D6. 다크모드 영속화 없음
PROMPTS와 step2 핸드오프 결정 그대로. 토글 UI도 만들지 않았음. 검증 시 DevTools에서 `<html data-theme="dark">` 직접 입력. tokens.css의 `prefers-color-scheme: dark` 자동 fallback 작동.

### D7. dep optimization race 1회
첫 dev run 직후 `chunk-*.js` not found 경고 1회 발생 → `node_modules/.vite` 삭제 후 재기동으로 해결됨. 재현되지 않음. 향후 발생 시 동일 절차.

---

## 5단계 backend-engineer가 알아야 할 것

### 신규 엔드포인트 필요: `/api/dongs/:slug/summary`
SPEC 6.2 동네 패널을 위해 다음 응답 형식이 필요합니다 (SPEC 9에 명시):

```ts
{
  slug: string,
  name: string,
  gu: string,
  score: number,           // weighted, 0~100 (현재 가중치 적용)
  summary: string,         // 한 줄 요약 (룰 베이스, SPEC 11.3)
  rent_avg: number,        // 평균 월세 (만원)
  nearest_station: {
    name: string,
    line: string,
    walking_min: number
  },
  amenity_level: 'sufficient' | 'normal' | 'lacking',  // 충분/보통/부족
  single_household_pct: number,
  safety_level: 'sufficient' | 'normal' | 'lacking'
}
```

쿼리에 가중치 (`?w_rent=&w_amenity=&w_transit=`) 동일하게 받으면 좋음. 더미 5개 그대로 작동 가능.

### 가능하면 함께 — 응답에 점수 분해 추가
`/api/dongs/scores` 응답에 `score_rent, score_amenity, score_transit` 세 필드 추가하면 클라가 슬라이더 변경 시 백엔드 호출 없이 재계산 가능. SPEC 14.3 권장 사양 충족.

→ 안 해도 5단계는 진행 가능. 시간 여유 있을 때 추가하면 됨.

---

## 5단계 frontend-engineer (또는 다음 본인)가 할 것

1. **DongPanel** — 우측 슬라이드 인 380~420px (SPEC 6.2). `MainMap`에 `selectedDong` 상태 추가, `HeatMap.onDongClick` → setSelectedDong. 패널은 `react-router`로 URL 동기화 (`?dong=slug`) 권장.
2. **검색 자동완성** — `/api/dongs/search?q=...` wired. `Input`을 enable.
3. **레이어 탭 동작** — 활성 레이어에 따라 polygon `fillColor` 결정 (composite vs 단일 점수). 백엔드 D2 추가 필요.
4. **클라이언트 사이드 점수 재계산** (백엔드 D2 후) — `src/lib/weights.ts`에 `recomputeScore(base: {rent,amenity,transit}, weights)` 추가.
5. **검색 결과 카메라 이동** — `useMap()` ref로 `flyTo(latlng)`.

---

## 알려진 이슈 / 한계

1. **더미 5개라 폴리곤 단조로움** — 동들이 서울 전역에 흩어진 작은 사각형 5개. 가중치 슬라이더 색 변화는 보이지만 "히트맵" 느낌은 없음. 10단계에서 426개 GeoJSON 적재되면 해결.
2. **백엔드 미기동 시 에러 오버레이** — 메인 화면에 빨강 오버레이 "데이터를 불러오지 못했습니다" + axios 메시지가 뜸 (의도적). 사용자 검증 시 백엔드 띄운 뒤 새로고침.
3. **검색창 / 필터 / 레이어 탭 / 3D 토글 동작 없음** — 시각만. SPEC 6.1에 명시된 항목이라 표시는 함.
4. **Leaflet 디폴트 마커 아이콘 fix 미적용** — 우리는 폴리곤만 사용해서 무관. 만약 5단계에서 핀 추가 시 `delete L.Icon.Default.prototype._getIconUrl` boilerplate 추가 필요.
5. **dep optimization 캐시 race** — D7 참조. 재현 시 `.vite` 캐시 삭제.
6. **모바일 반응형 0** — 1280px+ 데스크톱 가정 (frontend-engineer 가이드 명시).

---

## 스크린샷 / 검증 방법

자동 스크린샷 캡처는 이 환경에서 불가. 메인 코디네이터 또는 사용자가 다음 절차로 확인:

```bash
# 1. 백엔드 띄우기 (별도 터미널)
cd /Users/bagjihyeon/Desktop/School/capston/backend
.venv/bin/python manage.py runserver

# 2. 프론트 dev 서버
cd /Users/bagjihyeon/Desktop/School/capston/frontend
npm run dev
# → http://127.0.0.1:5173/ 접속
```

확인 항목:
- [ ] 좌측 사이드바 280px (로고 + 검색창 + 레이어 탭 + 가중치 3 + 자동추천 + 필터)
- [ ] 우측 지도 풀스크린, 서울 시청 중심 zoom 11
- [ ] 5개 사각형(필동/회기동/잠실동/서교동/역삼동) — 점수에 따라 4단계 색
- [ ] 폴리곤 호버 → 툴팁 (구·동 + 종합점수)
- [ ] 폴리곤 클릭 → 콘솔 `[main-map] dong clicked {slug,name,score}` 로그
- [ ] 가중치 슬라이더 한 개 드래그 → 합 100 유지, 짧게 후 색 재배치 (백엔드 재호출)
- [ ] "5번 비교로 자동 추천 →" 클릭 → alert "선호 학습 온보딩 — 7단계에서 구현됨"
- [ ] 좌하단 범례 (낮음→높음 그라디언트), 우하단 2D/3D 토글, 우상단 줌 컨트롤
- [ ] 한국어 깨짐 없음
- [ ] DevTools에서 `document.documentElement.setAttribute('data-theme','dark')` → 다크 팔레트 자동 적용 (사이드바, 카드, 토큰 색상)

빌드 검증:
```bash
cd /Users/bagjihyeon/Desktop/School/capston/frontend
npm run typecheck   # tsc -b --noEmit
npm run build       # tsc -b && vite build
```
둘 다 PASS 확인했습니다.

---

## 디자인 시스템 갭 (design-system-keeper에 요청)

없음. 이번 화면에 필요한 토큰/컴포넌트는 기존 디자인 시스템으로 100% 커버. 하드코딩 hex/px 0건 (Slider 컴포넌트 내부 thumb px는 step2에서 의도적으로 허용).

향후 6단계 동네 패널에서 "가로 막대 점수 구성"이 필요하면 새 프리미티브(ProgressBar/StackedScoreBar) 검토 가능. 단, Recharts로 처리해도 충분.
