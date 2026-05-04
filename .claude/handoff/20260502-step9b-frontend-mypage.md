# Frontend: 9단계-B — Login / Register / MyPage + 인증 컨텍스트

작성: 2026-05-02 (frontend-engineer)
근거: SPEC 6.6 (마이페이지), SPEC 8 (URL 구조), step9a 백엔드 핸드오프
(`/api/auth/*`, `/api/users/me*`, `/api/users/me/favorites`).

사용자 결정: **카카오/소셜 X — username/password (Django 세션 쿠키).**

---

## Routes added

- `/login` → `src/routes/Login.tsx` (username + password 폼)
- `/register` → `src/routes/Register.tsx` (username + password + nickname/school/year)
- `/mypage` → `src/routes/MyPage.tsx` (SPEC 6.6)

`src/App.tsx`에 위 3개 라우트 추가. 로그인 안 된 상태로 `/mypage` 접근 시
`<Navigate to="/login" replace />`.

---

## Components added

신규:
- `src/routes/Login.tsx` — `Input` × 2 + `Button` 프라이머리 + 회원가입 링크
- `src/routes/Register.tsx` — `Input` × 5 (username/password/nickname/school/year)
  + 가입 후 `useAuth().register()` → 성공 시 `/mypage`
- `src/routes/MyPage.tsx` — 4섹션 (Profile / 내 가중치 / 찜한 동네 / 리뷰)
- `src/routes/Auth.css` — Login/Register 공통 스타일 (토큰 100%)
- `src/routes/MyPage.css` — MyPage 스타일 (토큰 100%)
- `src/contexts/AuthContext.tsx` — `<AuthProvider>` + `useAuth()`
- `src/hooks/useFavorites.ts` — `useFavorites` / `useAddFavorite` / `useRemoveFavorite`
- `src/lib/authErrors.ts` — `getAuthErrorMessage(err, fallback)` 한국어 에러
  메시지 평탄화

수정:
- `src/lib/api.ts` — axios에 `withCredentials: true` 추가 + 11개 인증/유저
  엔드포인트 함수 (register, login, logout, getMe, patchMe, getMyPreference,
  putMyPreference, getFavorites, addFavorite, removeFavorite, getMyReviews)
- `src/types/api.ts` — `User`, `MeResponse`, `MePreference`, `RegisterPayload`,
  `LoginPayload`, `MePatchPayload`, `FavoriteItem`, `ApiErrorDetail` 추가
- `src/main.tsx` — `<AuthProvider>`로 `<BrowserRouter>` 래핑
  (QueryClientProvider 안쪽 위치)
- `src/App.tsx` — `/login` `/register` `/mypage` 라우트 등록
- `src/routes/MainMap.tsx`
  - `useAuth()` + `useAddFavorite` 통합
  - `handleFavorite`: 비로그인 시 toast + `/login`으로 이동, 로그인 시
    `addFavorite(slug)` mutation → "찜 목록에 추가됨" 토스트
  - `handlePreferenceComplete`: 인증 시 `putMyPreference(...)` 호출 (실패 무시)
  - 사용자 가중치 1회 동기화: `user.preference` → `weights` state
    (`hasSyncedFromUserRef`로 한 번만)
  - `?onboarding=1` 쿼리: 마운트 시 PreferenceModal 자동 오픈 후 쿼리 제거
  - Sidebar에 `userName` prop 전달
- `src/components/Map/Sidebar.tsx`
  - `userName: string | null` prop 추가
  - 헤더 내 사용자 영역: 로그인 시 `{nickname} · 마이페이지` (Link), 비로그인 시
    `로그인 →` (Link)
- `src/components/Map/Sidebar.css` — `.sidebar__user*` 토큰 기반 스타일

---

## API hooks added

- `useFavorites(enabled?: boolean): UseQueryResult<FavoriteItem[]>`
  - 엔드포인트: `GET /api/users/me/favorites`
  - queryKey: `['users', 'me', 'favorites']`
  - `enabled` false 시 호출 안 함 (로그아웃 가드)
- `useAddFavorite(): UseMutationResult<FavoriteItem, Error, string>`
  - 엔드포인트: `POST /api/users/me/favorites { slug }`
  - 성공 시 favorites 캐시 무효화
- `useRemoveFavorite(): UseMutationResult<void, Error, string>`
  - 엔드포인트: `DELETE /api/users/me/favorites/<slug>`
  - 성공 시 favorites 캐시 무효화

---

## Auth flow 요약

```
앱 부팅 → AuthProvider 마운트 → GET /api/users/me
  ├ 200 → user state set, isLoading=false
  └ 401 → user=null,    isLoading=false

/login     → POST /api/auth/login   → user state set → navigate(-1) || /
/register  → POST /api/auth/register → 자동 로그인 + user state set → /mypage
/mypage    → user 없으면 <Navigate to="/login">
              로그아웃 버튼 → POST /api/auth/logout → /login
```

**localStorage / sessionStorage 미사용.** 인증 상태는 `AuthContext` 메모리 +
백엔드 세션 쿠키만으로 유지. axios `withCredentials: true`로 쿠키 자동 전송.

---

## 결정 사항

### F1. AuthProvider 위치 — QueryClientProvider 안쪽 / BrowserRouter 바깥쪽

이유:
- QueryClientProvider 바깥에 두면 useFavorites 같은 훅이 AuthProvider 내부의
  useMutation/useQuery에서 사용하지 못함.
- BrowserRouter 바깥에 두면 라우트 변경과 무관하게 단일 인스턴스가 유지됨.
  AuthProvider가 자체 router 훅을 쓰지 않으므로 가능.

### F2. localStorage 미사용 — 메모리 + 세션 쿠키만

CLAUDE.md / frontend-engineer 가이드 모두 명시.
- 새로고침 시: AuthProvider가 GET /me로 세션 복원
- 탭 종료 시: 세션 쿠키 만료 정책에 따름 (백엔드 결정)
- React 메모리 only이므로 다른 탭 동기화는 X. 학부 데모 OK.

### F3. 인증 후 가중치 1회 동기화

`user.preference` → `weights` state. 슬라이더가 인증된 사용자의 저장값으로
초기화되되, 이후 슬라이더 조작은 즉시 백엔드 저장 X (UX 흐름이 떨림).
"5번 비교" 또는 명시적 저장 시점에만 PUT.

대안 — 슬라이더 매번 PUT:
- 슬라이더가 디바운스 없이 PUT을 쏘면 네트워크 폭발.
- 디바운스 도입은 디자인 시스템 수준 결정 — 9단계 범위 외.

### F4. 가입 후 자동 로그인 폴백

백엔드(step9a)가 register 시점에 `login(request, user)`를 호출 → 자동 로그인.
하지만 백엔드 정책이 바뀌어 register만으로는 미인증 상태가 될 수 있음.
`AuthContext.register()`는 401이 떨어지면 즉시 `apiLogin()`을 호출해 같은
결과를 보장.

### F5. 찜하기 — 비로그인 토스트 + 자동 이동

대안:
- (A) 즉시 navigate('/login') — 사용자가 무슨 일이 일어나는지 모름
- **(B) "로그인이 필요합니다 — 로그인 페이지로 이동" 토스트 후 300ms 뒤 이동**
- (C) 모달 띄우기 — Modal primitive로 구현 가능하지만 9단계 범위 외

채택: B. 메인 지도 위 toast 인프라(step8b)를 그대로 재사용.

### F6. 마이페이지 비교 CTA — 첫 3개 자동 선택

`/compare?dongs=A,B,C`는 최대 3개. 4개 이상 찜한 경우 "최신순 첫 3개"를 선택
(GET /me/favorites가 created_at desc로 반환하므로 가장 최근 것).
사용자가 비교할 동을 직접 고르려면 비교 페이지에서 ×로 빼고 메인 지도에서
다시 추가 — 8단계 결정과 일관.

### F7. 프로필 "수정" 버튼 — alert 임시

PATCH /api/users/me는 lib/api.ts에 wired. UI는 `window.alert` 안내. 본격 편집
다이얼로그는 마이페이지 추가 작업 시점에 분리.

### F8. "다시 학습하기" — `/?onboarding=1` 파라미터

대안:
- (A) 마이페이지에서 직접 PreferenceModal 띄우기 — 모달 결과 반영을
  마이페이지로 routing back 필요, 흐름 복잡
- **(B) `/?onboarding=1`로 메인 지도에 진입 → 자동 모달 오픈 → 모달 닫히면
  지도로 자연스럽게 진입**

채택: B. SPEC 5.x 흐름("선호 학습 완료 → 메인 지도로 자동 복귀")과 일관.

### F9. 가중치 라벨 순서 — 통학 / 주거비 / 생활시설

SPEC 6.6 명시 그대로. 메인 지도(전월세/생활시설/교통)와 라벨이 다름. SPEC을
직접 인용했으므로 와이어프레임 정합 보장.

### F10. 토큰 미사용 px 4건만 (모두 정당)

- `width: 56px` (avatar 크기) — control-height 토큰 부재. 디자인 시스템
  primitive화는 아바타가 다른 화면에서 한 번 더 등장할 때 검토.
- `font-size: 18px` (×, ✕ glyph) — control box 자체는 control-height 토큰.
  glyph 크기는 step8b Compare ×와 동일 패턴.
- `width: 16px / height: 16px` (체크박스, 기존 코드)
- `height: 8px` (가중치 막대 트랙) — DongPanel ScoreBar와 동일 패턴.
  PROMPTS 9단계 범위에서 토큰화는 over-abstraction.

---

## 검증

### TypeScript / 빌드
- `npx tsc --noEmit` → PASS (0 errors)
- `npm run build` → PASS
  - 955 modules transformed
  - dist/index-*.js: 844.29 KB / gzip 258.17 KB (9단계 추가분 ~14 KB)
  - dist/index-*.css: 82.29 KB / gzip 15.40 KB

### 백엔드 통합 (curl, cookie jar로 세션 유지)

```
1) POST /api/auth/register {step9bdemo}            → 201 + MeUser
2) GET  /api/users/me                              → 200 + MeUser
3) POST /api/auth/login WRONG                      → 401 {"detail":"아이디 또는 ..."}
4) POST /api/auth/login OK                         → 200 + MeUser
5) POST /api/users/me/favorites {pildong}          → 201 + FavoriteItem
6) GET  /api/users/me/favorites                    → 200 [pildong]
7) PUT  /api/users/me/preference {40,20,40}        → 200 {40,20,40}
8) POST /api/auth/logout                           → 200 {"detail":"..."}
9) GET  /api/users/me                              → 401
```

세션 쿠키가 정상 저장되고 모든 보호 라우트가 인증 상태를 인식.

### Vite dev 서버 (localhost:5173)

- `/login`, `/register`, `/mypage` → 200
- 신규 모듈 transform 모두 200:
  Login.tsx, Register.tsx, MyPage.tsx, AuthContext.tsx, useFavorites.ts,
  Auth.css, MyPage.css

### 시각 검증 절차 (메인 코디네이터/사용자가 수행)

```bash
# 터미널 1
cd /Users/bagjihyeon/Desktop/School/capston/backend
.venv/bin/python manage.py runserver

# 터미널 2
cd /Users/bagjihyeon/Desktop/School/capston/frontend
npm run dev
```

브라우저 http://localhost:5173 (또는 5174):

- [ ] 비로그인 상태로 메인 진입 → 사이드바 헤더에 "로그인 →" 링크
- [ ] /register → 폼 입력 (username/password 필수, 나머지 선택) → 가입 버튼
      → /mypage로 이동 → 프로필 섹션에 닉네임 + 학교·학년 노출
- [ ] /mypage → "← 지도로" 클릭 → / 진입 → 사이드바 헤더에
      "{nickname} · 마이페이지" 노출
- [ ] /mypage → "로그아웃" 클릭 → /login으로 이동 → 사이드바는 다시
      "로그인 →"
- [ ] /login → 잘못된 비밀번호 → 폼 위에 "아이디 또는 비밀번호가
      올바르지 않습니다." (한국어 에러) 노출
- [ ] /login → 정상 비밀번호 → 직전 페이지(또는 /)로 복귀
- [ ] 메인 지도 → 동(예: pildong) 클릭 → 패널 → "찜하기" 클릭
      → "필동 찜 목록에 추가됨" 토스트
- [ ] /mypage → 찜한 동네 섹션에 필동 카드 표시 → ×로 제거 → 즉시 사라짐
- [ ] /mypage → 찜이 2개 이상 → "N개 모두 비교하기 →" 버튼 → 클릭
      → /compare?dongs=A,B 진입
- [ ] /mypage → "다시 학습하기 →" 클릭 → /?onboarding=1로 이동
      → PreferenceModal 자동 오픈 → 5번 비교 완료 → 메인 지도로 복귀,
      슬라이더가 학습된 가중치로 이동, 1초 후 favorites 점수도 갱신
- [ ] 비로그인 상태에서 메인 지도 → 동 클릭 → "찜하기" → 토스트
      "로그인이 필요합니다 — 로그인 페이지로 이동" → 300ms 뒤 /login 이동
- [ ] 다크 모드 (`document.documentElement.setAttribute('data-theme','dark')`)
      → 모든 신규 화면이 다크 톤으로 자동 전환

---

## 디자인 시스템 갭 (design-system-keeper에 보고)

- **없음**. Login/Register/MyPage 모두 기존 토큰/프리미티브(Button, Input,
  Card, Badge)로 100% 커버.
- 마이페이지 가중치 막대(`mypage__bar*`)는 DongPanel ScoreBar와 매우 비슷한
  패턴. 향후 한 번 더 반복되면 `MetricBar` 또는 `ProgressBar` primitive
  도입 후보. 현 시점엔 over-abstraction.
- 아바타(이니셜 원형)도 마이페이지 한 군데만 사용 중. 동네 상세 리뷰 카드에
  작성자 표시가 도입되면 함께 묶어 `Avatar` primitive 검토.

---

## 알려진 이슈 / 한계

1. **프로필 편집은 alert 임시** — PATCH /api/users/me 호출 함수는 wired
   되어 있으므로 `MeEditDialog`만 추가하면 됨. 별도 작업으로 분리.
2. **5개 더미 동만 찜 가능** — 그 외 슬러그는 백엔드 404. 메인 지도에서
   클릭 가능한 동이 5개라 자연스럽게 가드. 10단계 적재 후 자동 해소.
3. **마이페이지 가중치 슬라이더 없음** — 읽기 전용 막대만. SPEC 6.6
   와이어프레임에도 슬라이더 없음. 변경은 메인 지도/온보딩 모달에서.
4. **가중치 백엔드 저장은 PreferenceModal 결과에서만** — 슬라이더를 직접
   움직였을 때 매 프레임 PUT은 부하. 디바운스 도입 또는 "저장" 버튼은
   추후 결정.
5. **CompareSlugs는 여전히 메인 지도 메모리** — 마이페이지에서
   "N개 모두 비교"로 진입하면 URL 진실로 이동. 메인 지도의 메모리 누적과는
   분리. step8b 결정 그대로.
6. **profile "수정" / 가입 자동 로그인 분기 / "프로필 편집"** 모두 9단계
   범위 외 보강 가능.
7. **모바일 반응형 X** — 1280px+ 데스크톱 가정. 마이페이지는 880px max-width
   컨테이너 안에서 안전.
8. **번들 크기 844 KB 경고** — Recharts 의존성 영향. 9단계 추가분 ~14 KB.
   코드 스플릿은 마무리 단계에서.
9. **strict mode + 단일 useEffect 동기화** — `hasSyncedFromUserRef`로
   한 번만 동기화되도록 가드. React 18 StrictMode에서 useEffect 두 번 실행
   시에도 안전.

---

## 산출물 (모두 절대 경로)

신규:
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/contexts/AuthContext.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/hooks/useFavorites.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/authErrors.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/Login.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/Register.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MyPage.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/Auth.css`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MyPage.css`

수정:
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/main.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/App.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/types/api.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/lib/api.ts`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/routes/MainMap.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/Sidebar.tsx`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/src/components/Map/Sidebar.css`
