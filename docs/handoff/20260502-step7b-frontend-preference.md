# Frontend: 7단계-B — 선호 학습 온보딩 모달 (PreferenceModal, SPEC 6.5)

작성: 2026-05-02 (frontend-engineer)
근거: SPEC 6.5 (선호 학습 모달 — 절대 기준), SPEC 11.4 (Bradley-Terry),
step7a 백엔드 핸드오프 (`/api/preference/pairs`, `/api/preference/submit`).

---

## Routes added

- 새 라우트 추가 없음. 모달 컴포넌트로만 동작.
  (SPEC 8 `/onboarding`은 향후 라우트로도 접근 가능하게 하려면 한 줄 추가 가능, 현재는 메인 지도 진입만 사용.)

---

## Components added

신규 디렉토리 `src/components/Onboarding/`:

- `PreferenceModal.tsx` — 5번 비교 → POST `/api/preference/submit` → 결과 화면.
  - 내부 서브컴포넌트: `ComparisonCard`, `WeightRow`, `ResultScreen`.
  - 진행 상태(`currentIdx` / `comparisons` / `resultWeights`) 모두 컴포넌트 로컬.
  - **Submit은 5번째 비교 완료 후 정확히 한 번만** (`useEffect`로 `finished + !resultWeights + !pending + !error` 조건 체크).
- `PreferenceModal.css` — 디자인 토큰 100%, 하드코딩 hex 0건.

---

## API hooks added

`src/hooks/usePreference.ts` 신규:

- `usePreferencePairs(count = 5, enabled = true): UseQueryResult<PreferencePairsResponse>`
  - 엔드포인트: `GET /api/preference/pairs?count={count}`
  - `enabled` 플래그로 모달 닫혀 있을 땐 호출 안 함 (모달 open과 바인딩됨).
  - `staleTime: 30_000`, `refetchOnWindowFocus: false` (세션 중간 리셋 방지).
  - queryKey: `['preference', 'pairs', count]`
- `useSubmitPreference(): UseMutationResult<PreferenceWeightsResponse, Error, SubmitComparison[]>`
  - 엔드포인트: `POST /api/preference/submit`
  - 성공 시 `{ w_rent, w_amenity, w_transit }` 정수, 합 100.

수반 변경:
- `getPreferencePairs(count)`, `submitPreferenceComparisons(comparisons)` in `src/lib/api.ts`.
- `PairCard`, `PreferencePair`, `PreferencePairsResponse`, `SubmitComparison`, `PreferenceWeightsResponse` 인터페이스 in `src/types/api.ts`.

---

## 산출물 (모두 절대 경로)

신규:
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Onboarding/PreferenceModal.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Onboarding/PreferenceModal.css`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/hooks/usePreference.ts`

수정:
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/types/api.ts` — 5개 신규 인터페이스 (`PairCard` 등).
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/api.ts` — `getPreferencePairs` / `submitPreferenceComparisons`.
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MainMap.tsx` — `preferenceOpen` state, `<PreferenceModal>` 렌더, `handlePreferenceComplete`.
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/Sidebar.tsx` — `onOpenPreference` prop 추가, alert 제거, "5번 비교로 자동 추천" 버튼이 부모 콜백 호출하게 변경.

---

## 모달 흐름 (구현 디테일)

```
open=true
   │
   ├─ usePreferencePairs(5, enabled=true) → 백엔드 호출 (1회)
   │
   ├─ pairs[currentIdx] 표시 (currentIdx 0~4)
   │     ├─ "이게 더 좋아요" L 클릭 → comparisons.push({won: L, lost: R}); currentIdx++
   │     ├─ "이게 더 좋아요" R 클릭 → comparisons.push({won: R, lost: L}); currentIdx++
   │     └─ "둘 다 별로예요" 클릭 → currentIdx++ (push 없음)
   │
   ├─ currentIdx === 5 (finished)
   │     ├─ comparisons.length > 0 → useSubmitPreference.mutate(comparisons)
   │     │     └─ onSuccess(weights) → setResultWeights(weights)
   │     └─ comparisons.length === 0 (전부 skip) → setResultWeights({33,33,34}) (네트워크 X)
   │
   ├─ ResultScreen 표시
   │     ├─ 우선순위 정렬된 한 줄 요약: "통학 X%, 주거비 Y%, 생활시설 Z%를 중요시하시네요"
   │     ├─ 가중치 막대 3개 (color: --color-data-low/mid1/mid2)
   │     └─ "메인 지도에서 확인하기" → onComplete(weights)
   │
   └─ "건너뛰기" (top-right) 클릭 → onComplete({33,33,34}) (모든 단계 무시)
```

`onClose` (백드롭/ESC)로 닫히면 `useEffect`가 모든 내부 state 리셋.

---

## 결정 사항

### F1. 결과 가중치 적용 = `MainMap`의 `setWeights` 직접 호출

대안:
- (A) URL 쿼리 (`/?w_rent=...`)
- (B) WeightsContext provider (step6b 핸드오프 추천)
- **(C) `onComplete` 콜백 props로 부모(`MainMap`)가 `setWeights(next)` 호출**

채택: **C**. 7단계 범위 = 메인 지도 진입 한정. detail/compare 페이지에서도 같은
weights 공유는 8단계 이후 결정. 현재 7단계는 **선호 학습 → 메인 지도 색상
트랜지션** 한 시나리오만 충족하면 충분.

`onComplete` 시그니처는 `(weights: { rent, amenity, transit }) => void`. 백엔드
응답의 snake_case (`w_rent` 등)는 모달 내부에서 client-side `Weights` 형식으로 변환.

### F2. submit 호출 = 정확히 한 번

useEffect 가드:
- `finished`: `currentIdx >= 5`
- `!resultWeights`: 아직 결과 없음
- `!submitMutation.isPending`: 이미 호출 중이 아님
- `!submitMutation.isError`: 실패 후엔 자동 재시도 X (사용자 액션 필요)

빈 comparisons (전부 skip)는 backend 400 받지 않도록 client-side fallback로 33/33/34.

### F3. 진행도 = `currentIdx + 1` ("3 / 5"), bar = `(currentIdx / 5) * 100%`

마지막 답 직후 finished=true가 되면 이미 결과 화면이라 진행도는 보이지 않음.
진행 막대는 `--transition-base`로 부드럽게 차오름.

### F4. 비교 카드 = 전체 클릭 영역 + "이게 더 좋아요" CTA-styled 라벨

대안:
- (A) 카드는 시각적 컨테이너, 내부 `<button>` "이게 더 좋아요"가 실제 클릭
- **(B) 전체 카드를 `<button>`으로, 내부 "이게 더 좋아요"는 시각적 CTA 라벨 (aria-hidden)**

채택: **B**. SPEC 6.5 "카드 자체도 클릭 가능 (전체 클릭 영역)" 준수. nested
`<button>`은 invalid HTML이므로 라벨은 `<span aria-hidden="true">`로 처리.
호버 시 카드 보더가 primary로, CTA 라벨 배경이 primary-hover로 동시 전환되어
시각적 통일성 유지.

### F5. 결과 화면 우선순위 정렬

"통학 50%, 주거비 30%, 생활시설 20%" 형식. SPEC 6.5 예시 텍스트와 일치하도록
**transit/rent/amenity 순서가 아닌 값 내림차순**으로 정렬 (가장 중요한 축이 먼저).
가중치 막대는 항상 통학/주거비/생활시설 고정 순서 (시각적 일관성).

### F6. 모달은 `hideCloseButton`

SPEC 6.5는 X 버튼이 아니라 **"건너뛰기"** 텍스트 버튼 사용. `Modal` 프리미티브의
기본 X 닫기를 숨기고, top-bar의 "건너뛰기"가 명시적 종료 경로.
ESC와 백드롭 클릭은 `Modal` 기본값 그대로(닫힘) 유지 — 사용자가 모달에서
빠져나갈 다른 경로 보장.

### F7. submit 실패 처리

`useSubmitPreference`가 에러 반환 시 결과 화면 대신 에러 상태:
- "가중치 추정에 실패했습니다." + 에러 메시지 + "다시 시도" / "닫기" 두 버튼.
- 5번 답을 잃지 않음 (state 그대로 유지).

### F8. 카드 hover 강조

`.pref-modal__card:hover` → 보더 `--color-primary` + 배경 `--color-primary-soft`.
카드 두 장 중 어느 쪽에 마우스가 있는지 명확히 표시.

### F9. 결과 막대 컬러 매핑

가중치 막대 색은 데이터 토큰을 metric별로 고정:
- 통학 → `--color-data-low` (파랑)
- 주거비 → `--color-data-mid1` (청록)
- 생활시설 → `--color-data-mid2` (오렌지)

이는 점수가 아닌 metric 식별자. 메인 지도 히트맵 컬러와 시각적 친밀감 확보.

---

## 검증

### TS / 빌드
- `npx tsc --noEmit` → PASS (0 errors)
- `npm run build` → PASS
  - 945 modules transformed
  - dist/index-*.js: 821.57 KB / gzip 251.91 KB (recharts 영향 그대로)
  - dist/index-*.css: 66.27 KB / gzip 13.86 KB

### 백엔드 응답 (sanity)
- `GET /api/preference/pairs?count=5` → 200, pairs 배열 길이 5
- `POST /api/preference/submit` body 5개 비교 → 200, `{w_rent, w_amenity, w_transit}` 합 100

### Vite dev 서버
- `npm run dev` 부팅 정상, HTTP 200 (port 5173)
- `/src/components/Onboarding/PreferenceModal.tsx` transform 200
- `/src/hooks/usePreference.ts` transform 200
- `/api/preference/pairs?count=5` proxy 통과 200

### 시각 검증 절차

```bash
# 터미널 1
cd /Users/bagjihyeon/Desktop/School/capston/backend
.venv/bin/python manage.py runserver

# 터미널 2
cd /Users/bagjihyeon/Desktop/School/capston/frontend
npm run dev
```

브라우저 http://localhost:5173 (또는 자동 fallback 포트):

- [ ] 메인 지도 사이드바 → "5번 비교로 자동 추천 →" 클릭 → 모달 열림 (alert 사라짐 확인)
- [ ] 상단: "1 / 5" + "건너뛰기" 텍스트 버튼
- [ ] 진행 바 0% → 5번 진행마다 20% 단위 증가
- [ ] 큰 글씨 "어디가 더 끌리시나요?" + "실제 데이터 기반 비교 · 정답은 없어요"
- [ ] 두 카드: 구·동·평균 월세·통학 시간·편의시설(Badge)·"이게 더 좋아요" CTA
- [ ] 카드 호버 시 primary 강조
- [ ] 카드 클릭 → 다음 비교로 진행
- [ ] "둘 다 별로예요 · 다음 비교" → 비교 push 없이 다음 단계
- [ ] 5번째 답 직후 → "결과를 분석 중…" 잠깐 → 결과 화면
- [ ] 결과: "통학 X%, 주거비 Y%, 생활시설 Z%를 중요시하시네요" + 가중치 3개 막대
- [ ] "메인 지도에서 확인하기" 클릭 → 모달 닫힘 + 사이드바 가중치 슬라이더가 X/Y/Z%로 자동 이동 + 히트맵 색상 부드러운 트랜지션 (300ms)
- [ ] ESC / 백드롭 클릭으로 모달 닫기 → 다음 오픈 시 처음부터 다시 시작 (state 리셋)
- [ ] 다크 모드 (`document.documentElement.setAttribute('data-theme','dark')`) → 모든 카드/배지/버튼/막대 자동 다크 톤

### 권장 시나리오 (transit 우선 사용자)
step7a 핸드오프와 동일한 5번 답 (pildong vs hoegidong → pildong 등)을 클릭하면
결과는 `{0, 0, 100}` (통학 100%, 주거비 0%, 생활시설 0%)이어야 함. 메인 지도
슬라이더가 실제로 그렇게 이동하는지 확인.

---

## 8단계(비교) frontend-engineer가 알아야 할 것

### 모달 패턴 정착
- `Modal` 프리미티브 + `hideCloseButton` + 자체 top-bar 패턴이 PreferenceModal에서 처음
  사용됨. 8단계 비교 페이지 (SPEC 6.4)는 풀스크린 라우트라 다른 패턴.
- 향후 다른 모달 (찜/공유 confirm 등) 등장 시 동일 토큰 사용.

### Weights state 공유
- 현재 weights는 `MainMap` useState only. detail/compare 페이지에서 동일 weights를
  쓰려면 step6b 핸드오프의 권장(WeightsContext) 도입 필요. 7단계는 메인 지도만
  영향이라 lift 안 함.

### onComplete 콜백 시그니처 = client-side Weights
- 모달 외부 인터페이스는 snake_case 백엔드 응답이 아닌 camelCase `{rent, amenity, transit}`.
  비교/마이페이지에서도 동일 형식으로 가중치를 받으면 `setWeights`에 그대로 전달 가능.

---

## 알려진 이슈 / 한계

1. **5개 더미 동만 존재** — 백엔드가 5개 동에서 deterministic 5쌍을 반환하므로
   사용자가 매번 동일한 5쌍을 봄. 10단계 426동 적재 후 자연스럽게 해소.
2. **모달 내 weights 결과는 메인 지도에만 적용** — detail/compare는 여전히 33/33/34
   고정(F1, step6b F1과 일치). WeightsContext 도입은 8단계 또는 마이페이지 단계.
3. **빈 답안(전부 skip) → fallback 33/33/34** — 학부 데모상 자연스러우나 백엔드가
   빈 배열 400 던지므로 client-side fallback. 의도된 동작.
4. **submit 실패 시 5번 답을 다시 풀 필요 없음** — "다시 시도" 버튼이 동일
   comparisons로 재호출. UX 친화적.
5. **결과 화면에서 "다시 학습하기" 버튼 없음** — SPEC 6.5에 명시 없고, 마이페이지
   (SPEC 6.6)에 "다시 학습하기" 링크가 있음. 7단계 범위 외.
6. **`/onboarding` 라우트 미연결** — SPEC 8에 명시되어 있으나 모달 진입만 구현.
   라우트로도 접근하려면 `App.tsx`에 한 줄 + 자동 모달 오픈 wrapper 컴포넌트 필요.
7. **Bradley-Terry 결과 0/0/100 같은 극단값** — 5개 더미에서 transit 일관 답 시
   발생. 결과 화면 막대도 그대로 0% / 0% / 100% 표시. SPEC 6.5 부제 "정답은 없어요"
   문구로 사용자 기대치 관리.
8. **번들 크기 821 KB 초과 경고** — recharts 영향. 7단계는 추가 영향 미미(<5KB).
9. **모바일 반응형 X** — 1280px+ 데스크톱 가정.

---

## 디자인 시스템 갭 (design-system-keeper에 보고)

- 없음. PreferenceModal은 기존 `Modal`, `Button`, `Badge` + 토큰 시스템으로 100% 커버.
- "건너뛰기" 등 텍스트 버튼이 modal top-bar에 반복 사용된다면 향후 `TextLink` 또는
  `GhostButton size="sm"` 패턴 표준화 검토. 현 단계는 인라인 스타일로 충분.
- "WeightRow" (label / track / value) 패턴이 마이페이지 "내 가중치" 섹션에서 반복될
  가능성 높음 (SPEC 6.6). `MetricBar` 프리미티브 시스템화 후보 (DongPanel의 ScoreBar
  와 합쳐서). 8단계 진입 전 design-system-keeper와 협의 권장.
