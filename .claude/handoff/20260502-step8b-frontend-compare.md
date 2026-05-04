# Frontend: 8단계-B — 동네 비교 화면 (Compare, SPEC 6.4)

작성: 2026-05-02 (frontend-engineer)
근거: SPEC 6.4 (동네 비교 — 절대 기준), SPEC 8 (URL 구조),
step8a 백엔드 핸드오프 (`/api/compare`).

---

## Routes added

- `/compare?dongs=A,B,C` → `src/routes/Compare.tsx`
  - URL 쿼리는 SPEC 8 명시대로 `dongs`. 백엔드 API는 `?slugs=...`이므로
    `getCompare()` 안에서 매핑. 프론트 라우트 ↔ 백엔드 파라미터의 명명 차이를
    이 한 군데서만 흡수.

`src/App.tsx`에 라우트 한 줄 추가.

---

## Components added

신규 라우트:
- `src/routes/Compare.tsx`
  - 내부 서브컴포넌트: `EmptyState`, `CompareTable`, `ColumnHeader`, `Row`, `Cell`.
  - `parseSlugs()` — `?dongs=` 쿼리 → 슬러그 배열 (공백 trim, 빈문자 필터, 중복
    제거, 최대 3개로 자름). 동일 로직이 메인 지도의 누적 메커니즘과 일관.
  - `computeBestSets()` — 각 행마다 "가장 좋은 값" 인덱스 집합 산출. 방향
    매핑(SPEC 6.4 + step8a F):
    - 높을수록 좋음: score / single_household_pct / review_avg_rating /
      review_count
    - 낮을수록 좋음: rent_avg / transit_min
    - amenity_label: `충분(3) > 보통(2) > 부족(1)`
    - safety_label: `높음(3) > 보통(2) > 낮음(1)`
    - 모든 값이 동일하면 하이라이트 X (승자 없음)
    - 동률이 있으면 동률인 모든 컬럼 하이라이트
- `src/routes/Compare.css` — 토큰 100%, 하드코딩 hex 0건.
  - 카드(테이블 wrap): `var(--color-surface)` + 1px `var(--color-border)` +
    `var(--radius-lg)` + `overflow: hidden`로 모서리 깎임.
  - 헤더 행: `var(--color-gray-100)` 배경 (SPEC 4.4 데이터 테이블 규약).
  - 좌측 라벨 컬럼: `var(--color-surface-inset)` 배경 + `--font-caption-size`
    + 회색 텍스트.
  - 셀 하이라이트: `.compare__cell--best` → `font-weight: 500` +
    `color: var(--color-primary)`, 단위(`만원`, `/100` 등)도 같은 색에
    `opacity: 0.75`로 부속 강조.

수정:
- `src/components/Map/Sidebar.tsx`
  - props `compareCount: number`, `onOpenCompare: () => void` 추가.
  - 가중치 섹션 다음에 **"비교 목록"** 섹션 추가 — 안내 텍스트 + "비교 보기 (N)"
    버튼. count=0이면 버튼 disabled.
- `src/components/Map/Sidebar.css`
  - `.sidebar__compare-hint` (--font-hint-size, muted) 추가.
- `src/routes/MainMap.tsx`
  - `compareSlugs: string[]` state (max 3, 중복 X, 삽입 순서 유지).
  - `flashToast()` 헬퍼 (2.4초 자동 dismiss, `useRef` 타이머, unmount 정리).
  - `handleAddCompare`가 alert 대신 setCompareSlugs + 토스트로 전환.
  - `handleOpenCompare()` → `navigate('/compare?dongs=A,B,C')`.
  - DongPanel `onAddCompare`, Sidebar `onOpenCompare` 양쪽 연결.
  - 동 이름 lookup은 `data.find(d => d.slug === slug)`로 이미 받은 /scores 응답에서.
- `src/routes/MainMap.css`
  - `.main-map__toast` — overlay 스타일을 재사용하되 bottom 위치 + primary
    border + z-index 600. 로딩/에러 overlay와 시각 충돌 X.

---

## API hooks added

- `useCompare(slugs: string[], weights: Weights, enabled?: boolean):
  UseQueryResult<CompareResponse>` — `src/hooks/useDongs.ts`
  - 엔드포인트: `GET /api/compare?slugs=A,B,C&w_rent=&w_amenity=&w_transit=`
  - `enabled = enabled && slugs.length > 0` — 빈 배열이면 호출 안 함.
  - queryKey: `['compare', slugs.join(','), w_rent, w_amenity, w_transit]`
    → 슬러그 순서 변경 시 다른 키(컬럼 순서가 응답 순서를 따름).
  - `staleTime: 60_000` (TanStack 표준).

수반 변경:
- `getCompare(slugs, weights)` in `src/lib/api.ts`.
  - 백엔드 `?slugs=` 형태로 `slugs.join(',')` 후 GET.
- `CompareItem`, `CompareWeights`, `CompareResponse`, `CompareAmenityLabel`,
  `CompareSafetyLabel` 인터페이스 in `src/types/api.ts`.

---

## 산출물 (모두 절대 경로)

신규:
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/Compare.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/Compare.css`

수정:
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/types/api.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/api.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/hooks/useDongs.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/App.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MainMap.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MainMap.css`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/Sidebar.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/Sidebar.css`

---

## 결정 사항

### F1. 누적은 메인 지도 state, 비교 페이지는 stateless

대안:
- (A) URL이 진실 — DongPanel이 직접 `/compare?dongs=...&...`로 즉시 navigate
- **(B) 메인 지도 `compareSlugs` state 누적 → "비교 보기" 버튼 → /compare**
- (C) 전역 store / context

채택: **B**. 이유:
- SPEC 6.4 와이어프레임 + 핸드오프 노트의 시나리오("동 1 추가 → 동 2 추가 → 비교
  보기")와 정확히 일치.
- "비교에 추가" 누른 즉시 navigate되면 사용자는 **여러 동을 둘러보다 비교**하는
  자연스러운 흐름을 잃음.
- compareSlugs는 메인 지도가 마운트되어 있는 동안만 유효하면 충분 — 8단계
  범위 안에선 영속화 X.

### F2. URL 진실 vs state 진실 분리 — `/compare`는 URL이 진실

비교 페이지 자체에서는 `useSearchParams`만으로 슬러그를 결정. 메인 지도의
`compareSlugs`와는 통신 없음. 사용자가 비교 페이지에서 컬럼 ×를 누르면
URL이 갱신되고 `useCompare`가 재호출.

이 분리 덕에 **비교 페이지를 직접 URL로 공유**해도 동일 동작 보장 (SPEC 6.4
"공유 (URL 복사)" 요구의 토대).

### F3. parseSlugs — 클라이언트에서 한 번 더 정리

URL에서 받은 `dongs` 파라미터가 `pildong, , hoegidong, pildong`처럼 더러운
경우를 가정.
- trim
- 빈 문자열 drop
- 중복 drop (앞쪽 우선)
- 최대 3개로 자름

백엔드도 같은 방어를 하고 있지만 클라이언트가 먼저 정리하면 불필요한 호출 X.
queryKey도 정규화된 슬러그 배열로 만들어 캐시 적중률을 올림.

### F4. 가중치 — 비교 페이지에선 33/33/34 고정 (현 단계)

step6b/7b 핸드오프와 일관: 가중치 lift는 8단계 범위 외. 비교 페이지에 슬라이더
재배치는 SPEC 6.4 와이어프레임에 명시 X. WeightsContext 도입은 마이페이지
단계로 미룸. 백엔드 `weights` 응답 필드는 받아두지만 UI에 노출하지 않음 (필요
시 향후 회색 caption로 한 줄 추가 가능).

### F5. 하이라이트 동률 처리

같은 행에 동률이 둘이면 둘 다 하이라이트. **모두 동일**한 경우는 하이라이트
하지 않음 (의미 없음). 단일 컬럼(슬러그 1개) 비교 시에도 하이라이트 X (비교가
일어나지 않음).

### F6. "최고 점수" 배지 = 종합점수 strict 1위 컬럼만

score 동률이 있어도 첫 컬럼만 배지 표시. 이유:
- "최고 점수"는 한 컬럼만 강조해야 시각적으로 의미 있음.
- 동률은 score 셀 하이라이트(F5)로 충분히 표시.
- 슬러그 1개일 때는 비교가 아니므로 배지 X.

### F7. "공유" = `navigator.clipboard.writeText(window.location.href)`

`navigator.clipboard?.writeText` optional chaining로 환경 가드. 실패/미지원 시
3초 동안 inline notice로 안내 ("주소창의 URL을 사용해주세요"). 외부 toast
시스템 미존재이므로 로컬 state 기반 인라인 메시지.

### F8. "+ 동네 추가하기" — alert로 라우팅 안내

현재 비교 페이지에는 동 검색 UI가 없음 (SPEC 6.4도 미명시). 메인 지도에서만
비교에 추가할 수 있다는 설계 의도이므로, 버튼은 alert로 동선 안내. 4개 미만일
때만 표시.

### F9. 토스트 — `MainMap` 내 inline overlay 재사용

별도 toast primitive 미존재. 기존 `.main-map__overlay` 토큰 위에
`.main-map__toast`만 얹어서 위치(top→bottom) + border-color + z-index 조정.
디자인 시스템 변경 X. 자동 dismiss 2.4초 (메시지 한 줄 읽기 충분, 흐름 방해
적음).

토스트 트리거:
- 추가됨: `"{동} 추가됨 (N/3)"`
- 이미 있음: `"{동}은(는) 이미 비교 목록에 있어요."`
- 가득 참: `"비교 목록은 최대 3개까지예요. ..."`

### F10. Sidebar "비교 목록" 섹션은 가중치 섹션 직후

대안:
- (A) 헤더 우상단 (지도 영역) — 와이어프레임에 헤더 X
- (B) 사이드바 별도 섹션 — 가중치 ↔ 필터 사이
- (C) 사이드바 최상단

채택: **B**. 이유:
- 가중치 변경 후 자연스럽게 "비교"가 연상되는 사용자 동선.
- 헤더에 별도 영역을 추가하면 SPEC 6.1 사이드바 5요소 위계가 흐트러짐.
- compareCount=0일 땐 버튼 disabled로 학습 가능 (영구 노출).

---

## 검증

### TS / 빌드
- `npx tsc --noEmit` → PASS (0 errors)
- `npm run build` → PASS
  - 947 modules transformed
  - dist/index-*.js: 830.71 KB / gzip 254.54 KB (Compare 페이지 추가분 ~9 KB)
  - dist/index-*.css: 72.01 KB / gzip 14.46 KB

### 백엔드 응답 (sanity)
- `GET /api/compare?slugs=pildong,hoegidong,seogyodong` → 200, dongs 길이 3,
  스키마 일치
- `GET /api/compare?slugs=hoegidong` → 200, dongs 길이 1
- Vite 프록시 `/api/compare?slugs=...` → 200 (proxy 통과)

### Vite dev 서버
- `/src/routes/Compare.tsx`, `/src/routes/Compare.css` transform 200
- 백엔드 `127.0.0.1:8000`, 프론트 `5173` 동시 부팅 정상

### 시각 검증 절차

```bash
# 터미널 1
cd /Users/bagjihyeon/Desktop/School/capston/backend
.venv/bin/python manage.py runserver

# 터미널 2
cd /Users/bagjihyeon/Desktop/School/capston/frontend
npm run dev
```

브라우저 http://localhost:5173:

- [ ] 메인 지도 → 임의 동(예: pildong) 클릭 → 패널 열림 → "비교에 추가"
      → 화면 하단에 토스트 "필동 추가됨 (1/3)" 노출 + 사이드바 "비교 목록"
      섹션 텍스트 "현재 1/3개 담겼어요." + 버튼이 "비교 보기 (1)"로 enabled
- [ ] 패널 닫고 다른 동(예: hoegidong) 클릭 → "비교에 추가" → 토스트 "회기동
      추가됨 (2/3)" + 버튼 "비교 보기 (2)"
- [ ] 같은 동을 다시 추가 → "이미 비교 목록에 있어요" 토스트 (count 그대로)
- [ ] 3번째 동 추가 후 4번째 동 추가 시도 → "최대 3개까지예요" 토스트
- [ ] "비교 보기 (N)" 클릭 → URL이 `/compare?dongs=pildong,hoegidong,...`로 변경
- [ ] 비교 페이지: ← 지도로 / 동네 비교 브레드크럼
- [ ] 표 좌측 첫 열 = 지표명 7개 (종합점수 / 평균 월세 / 통학 시간 / 편의시설
      / 자취생 비율 / 안전 지수 / 자취생 평점)
- [ ] 표 헤더: `{구}` (작게) + `{동}` (크게) + 우측에 "최고 점수" 배지(1위만)
      + × 버튼
- [ ] 종합점수 1위 컬럼: 셀이 청록 + 굵게, 헤더에 "최고 점수" 배지
- [ ] 평균 월세, 통학 시간 행: **가장 작은 값**이 청록 + 굵게
- [ ] 편의시설/안전 지수 행: 충분(또는 높음) 컬럼이 청록 강조 (배지는 그대로
      변형색 유지)
- [ ] 자취생 평점 행: ★ 평점 + "리뷰 N개" 표시, 평점 또는 리뷰 수 1위 컬럼
      청록
- [ ] 컬럼 × 클릭 → URL의 dongs 파라미터에서 해당 슬러그 빠짐 (`replace`로
      히스토리 안 쌓임), 표가 N-1 컬럼으로 재렌더, 하이라이트 재계산
- [ ] 마지막 × → 빈 상태("비교할 동네가 없어요" + "메인 지도로 가기")
- [ ] "+ 동네 추가하기" (3개 미만일 때) → alert 안내
- [ ] "공유" 클릭 → 인라인 메시지 "비교 URL이 복사되었습니다." (3초 자동 사라짐)
- [ ] URL 직접 접근 `/compare?dongs=pildong,hoegidong` → 표 정상 렌더 (URL 진실)
- [ ] URL `/compare` (쿼리 없음) → 빈 상태
- [ ] 다크 모드 (`document.documentElement.setAttribute('data-theme','dark')`)
      → 헤더 배경 / 셀 배경 / 텍스트 / 배지 전부 다크 톤. 청록 강조도
      라이트→다크용 토큰으로 자동 전환.

---

## 9단계가 알아야 할 것

### compareSlugs는 MainMap 메모리만

새로고침 / 라우트 이동(예: /dong/:slug 다녀오기) → `MainMap` 언마운트 → 누적
초기화. 영속이 필요해지면(마이페이지 / 사용자 설정), `Favorite`처럼 백엔드
저장 또는 useState lifting 필요. 현 단계는 SPEC 6.4 직접 시나리오만 충족.

### 비교 페이지에서도 가중치 노출?

현재 33/33/34 고정. SPEC 6.4 와이어프레임은 슬라이더 미명시. 만약 마이페이지
구현 시 "내 가중치 → 비교에도 적용" 동선이 필요하면 다음 옵션 중 택1:
- 비교 페이지 헤더에 작은 슬라이더 카드 (셀 표 위쪽)
- WeightsContext provider → 메인 지도 / 비교 / 마이페이지 공통 훅으로 합류
- URL 쿼리 `&w_rent=...&w_amenity=...&w_transit=...` 옵션 추가

API는 이미 가중치 파라미터를 받음 → 추가 백엔드 작업 불필요.

### "최고 점수" 배지 ↔ score 강조 중복 방지

현재는 첫 컬럼이 score 1위면 헤더 배지 + 셀 강조 둘 다 있음. 디자이너 의견에
따라 한쪽만 남기는 것도 가능 (현재는 SPEC 6.4 "헤더에 배지 + 청록 강조" 둘 다
허용으로 해석).

### 외부 toast 시스템 부재

이번에 inline notice를 두 곳(메인 지도 / 비교 footer)에서 비슷하게 사용. 향후
공통 `useToast` 훅 + 포털 컴포넌트로 추출 검토. 현재는 디자인 시스템 가드라인
지키며 라이트하게 처리.

---

## 디자인 시스템 갭 (design-system-keeper에 보고)

- **없음**. 비교 페이지는 기존 `Badge`, `Button` + tokens.css만으로 100% 커버.
- 토스트가 두 곳에서 inline 패턴으로 반복됨 — 향후 다른 화면에서 한 번 더
  반복되면 `Toast` primitive 도입 후보. 단, 현 시점엔 over-abstraction.
- 비교 표(`.compare__table`) 패턴은 마이페이지 "찜한 동네" 리스트(SPEC 6.6)나
  대시보드 형 화면에서 쓰일 수 있음 — 그때 같이 묶어 `DataTable` primitive로
  표준화 검토.

---

## 알려진 이슈 / 한계

1. **5개 더미 동만 비교 가능** — 그 외 슬러그는 백엔드 404. 메인 지도에서
   클릭할 수 있는 동 자체가 5개라 자연스럽게 가드됨. 10단계 후 자동 해소.
2. **비교 슬러그 영속화 X** — F1 결정. /dong/:slug 등 다른 라우트로 이동
   후 돌아오면 누적이 비워짐.
3. **+ 동네 추가하기 = alert** — 비교 페이지 자체에서 검색 UI를 제공하지 않음.
   SPEC 6.4가 검색을 명시하지 않아 의도된 단순화.
4. **공유 URL은 현재 라우트 그대로 복사** — 가중치 쿼리 미포함. 마이페이지
   구현 후 가중치 lift되면 자동 포함하도록 정리 가능.
5. **단일 컬럼 비교 시 하이라이트 없음** — 비교가 일어나지 않으므로 의도된
   동작. 컬럼 ×로 1개 남았을 때 빈 상태 안내가 더 적절할 수도 있어 향후 UX
   재검토 가능.
6. **모바일 반응형 X** — 1280px+ 데스크톱 가정. 표가 가로로 길어지면 가로
   스크롤은 발생하지 않음 (overflow hidden) — 1200px 컨테이너 안에 3컬럼
   기준으로 안전.
7. **번들 크기 830 KB 경고** — Recharts 의존성 영향. 8단계 추가분 미미
   (~9 KB). 코드 스플릿은 마무리 단계에서.
