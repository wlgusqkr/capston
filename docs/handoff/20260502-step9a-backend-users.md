# Task: 9단계-A — 백엔드 사용자/인증/찜하기 API

작성: 2026-05-02
SPEC 6.6 (마이페이지), 9 (사용자 API), 10 (UserPreference, Favorite) 기준.
사용자 명시 결정: **카카오 / django-allauth 비활성화. 표준 Django username/password (세션) 인증만 사용.**

---

## 완료된 작업

### Phase A — 모델 + 마이그레이션

기존 8단계 시점에 이미 모델이 있었음. 추가 변경 없음.

- `apps/users/models.py`
  - `User(AbstractUser)`: `school`(80, blank), `year`(int, null OK), `nickname`(30, blank)
  - `Favorite(user, dong, created_at)` — `unique_together=("user","dong")`, `ordering=["-created_at"]`
- `apps/preference/models.py`
  - `UserPreference(user OneToOne, w_rent, w_amenity, w_transit, updated_at)` — float, 합 1
- 마이그레이션 (이미 적용됨):
  - `users.0001_initial`, `users.0002_user_nickname_user_school_user_year_favorite`
  - `preference.0001_initial`
- `python manage.py makemigrations --dry-run` → No changes detected.

### Phase B — 인증 + 사용자 API

#### settings 변경 (`config/settings/base.py`)

- `INSTALLED_APPS`에서 `allauth*`, `django.contrib.sites` 주석 처리
- `MIDDLEWARE`에서 `AccountMiddleware` 주석 처리
- `AUTHENTICATION_BACKENDS`는 `ModelBackend`만
- 카카오/allauth 관련 설정 전체 주석 처리 (필요 시 복구 가능)

#### URL 마운트 변경 (`config/urls.py`)

- `path("api/auth/", include("allauth.urls"))` 제거
- `path("api/users/", include("apps.users.urls"))` → `path("api/", include("apps.users.urls"))`로 변경
- 즉 users 앱이 `/api/auth/*` 와 `/api/users/me*` 를 함께 제공

#### 신규/수정 파일

- `apps/users/views.py` — 전면 개편
  - `CsrfExemptSessionAuthentication` (DRF SessionAuthentication 서브클래스, `enforce_csrf` no-op)
  - `_AuthRequiredMixin`: `authentication_classes = [CsrfExemptSessionAuthentication]`, 미인증 시 401 + 한국어 detail
  - `RegisterView` (csrf_exempt) — POST /api/auth/register
  - `LoginView` (csrf_exempt) — POST /api/auth/login
  - `LogoutView` (csrf_exempt) — POST /api/auth/logout
  - `MeView` — GET / PATCH /api/users/me
  - `PreferenceView` — GET / PUT /api/users/me/preference
  - `FavoritesView` — GET / POST /api/users/me/favorites
  - `FavoriteDetailView` — DELETE /api/users/me/favorites/<slug>
  - `MyReviewsView` — GET /api/users/me/reviews (빈 list)
- `apps/users/serializers.py`
  - `RegisterSerializer`, `LoginSerializer` 추가
  - `MePatchSerializer` (school/year/nickname 부분 업데이트) 추가
  - `MeSerializer` 유지 (preference 포함)
  - `FavoriteItemSerializer` 응답 필드명 변경: `added_at` → `created_at`
  - `build_favorite_item(fav, weights)` — 사용자 가중치 dict를 인자로 받아 점수 계산
  - `preference_to_floats(pref)` 헬퍼 추가
  - `PreferenceWriteSerializer` (이전 `PreferencePatchSerializer`의 alias 유지)
- `apps/users/urls.py`
  - 인증 3개 + me 5개 + reviews 1개, 총 9개 라우트
- `config/settings/base.py`, `config/urls.py` (위 변경)

#### CSRF 처리

CSRF 면제는 두 단계로 처리:

1. 클래스에 `@method_decorator(csrf_exempt, name="dispatch")` — Django의 `CsrfViewMiddleware` 우회.
2. `CsrfExemptSessionAuthentication.enforce_csrf` no-op — DRF `SessionAuthentication`이 unsafe method에서 내부적으로 호출하는 CSRF 강제도 우회.

이 두 가지를 모두 적용해야 PATCH/PUT/POST/DELETE에서 403이 나지 않는다. 학부 데모 수준에서 OK. 운영 단계에서는 토큰 인증 또는 정식 CSRF 토큰 흐름으로 교체 권장.

---

## API 엔드포인트 (베이스: `http://localhost:8000`)

### 1. POST /api/auth/register

요청 (CSRF 면제):
```json
{
  "username": "demo",
  "password": "demo1234",
  "school": "동국대",
  "year": 3,
  "nickname": "홍길동"
}
```

성공 (201) — 자동 로그인 (세션 쿠키 set):
```json
{
  "id": 2,
  "username": "demo",
  "nickname": "홍길동",
  "school": "동국대",
  "year": 3,
  "preference": {"w_rent": 33, "w_amenity": 33, "w_transit": 34}
}
```

오류:
- 409 `{"username": "이미 사용 중인 username입니다."}`
- 400 `{"username": ["..."], "password": ["..."]}` (검증 실패)

### 2. POST /api/auth/login

요청:
```json
{"username": "demo", "password": "demo1234"}
```

성공 200 + 세션 쿠키. 응답 본문은 register와 동일 형태.

오류:
- 401 `{"detail": "아이디 또는 비밀번호가 올바르지 않습니다."}`
- 400 `{"username": [...], "password": [...]}`

### 3. POST /api/auth/logout

성공 200 `{"detail": "로그아웃 되었습니다."}`. 미인증 호출도 200(idempotent).

### 4. GET /api/users/me

200:
```json
{
  "id": 2,
  "username": "demo",
  "nickname": "홍자취",
  "school": "동국대",
  "year": 4,
  "preference": {"w_rent": 40, "w_amenity": 20, "w_transit": 40}
}
```

미인증 401 `{"detail":"로그인이 필요합니다."}`.
- `nickname`이 빈 문자열이면 `username` 폴백.
- `preference`는 항상 정수 % (합 100). 미저장 시 default 33/33/34.

### 5. PATCH /api/users/me

요청 (모든 필드 선택):
```json
{"school": "동국대학교", "year": 4, "nickname": "홍자취"}
```

성공 200, 응답은 GET /api/users/me와 동일 형태.

### 6. GET /api/users/me/preference

200 `{"w_rent":33,"w_amenity":33,"w_transit":34}` (정수, 합 100).

### 7. PUT /api/users/me/preference

요청 (정수 %, 합 100±1):
```json
{"w_rent": 40, "w_amenity": 20, "w_transit": 40}
```

성공 200 → 같은 형태 반환. 내부 저장은 float(합 1).

오류 400:
```json
{"weights": ["가중치 합이 100이어야 합니다 (현재 50). 허용 오차는 ±1입니다."]}
```

### 8. GET /api/users/me/favorites

200 — 최신순 배열 (`created_at desc`):
```json
[
  {
    "slug": "seogyodong", "name": "서교동", "gu": "마포구",
    "score": 61.6, "created_at": "2026-05-02T21:14:03.182987+09:00"
  },
  {
    "slug": "hoegidong", "name": "회기동", "gu": "동대문구",
    "score": 71.0, "created_at": "2026-05-02T21:14:03.125999+09:00"
  }
]
```

`score`는 **사용자 가중치 적용** (`UserPreference`가 없으면 default 33/33/34). 동네 가중치 슬라이더가 변경된 직후 favorites를 새로 fetch하면 score가 갱신됨.

### 9. POST /api/users/me/favorites

요청 `{"slug":"pildong"}`.

성공 201 — 단일 항목 (favorites 리스트 한 row와 동일 스키마):
```json
{"slug":"pildong","name":"필동","gu":"중구","score":61.0,"created_at":"2026-05-02T21:14:02.961496+09:00"}
```

오류:
- 400 `{"slug":"slug 문자열이 필요합니다."}`
- 404 `{"detail":"찾을 수 없는 동네: <slug>"}`
- 409 `{"detail":"이미 찜한 동네입니다."}`

### 10. DELETE /api/users/me/favorites/<slug>

성공 204 (응답 본문 없음).
오류 404 `{"detail":"찜 목록에 없는 동네: <slug>"}`.

### 11. GET /api/users/me/reviews

항상 200 `[]` (Review 모델 미구현).

---

## TypeScript 인터페이스 (프론트가 그대로 import 권장)

```ts
// 공통
export interface PreferenceWeights {
  w_rent: number;     // 0~100, 정수, 합 100
  w_amenity: number;
  w_transit: number;
}

// /api/users/me
export interface MeUser {
  id: number;
  username: string;
  nickname: string;       // 빈 문자열이면 백엔드가 username으로 폴백
  school: string;         // "" 가능
  year: number | null;    // null = 미입력
  preference: PreferenceWeights;
}

// /api/auth/register, /api/auth/login 응답 = MeUser

export interface RegisterPayload {
  username: string;
  password: string;
  school?: string;
  year?: number | null;
  nickname?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

// PATCH /api/users/me body — 모두 선택
export interface MePatchPayload {
  school?: string;
  year?: number | null;
  nickname?: string;
}

// /api/users/me/favorites
export interface FavoriteItem {
  slug: string;
  name: string;
  gu: string;
  score: number;          // 0~100, 사용자 가중치 적용
  created_at: string;     // ISO 8601 (KST +09:00)
}

// 오류 형태
export interface ApiErrorDetail {
  detail?: string;
  username?: string | string[];
  password?: string | string[];
  slug?: string;
  weights?: string | string[];
  w_rent?: string | string[];
  w_amenity?: string | string[];
  w_transit?: string | string[];
}
```

---

## 검증 결과 (curl 시나리오)

`python manage.py check` → System check identified no issues.
`python manage.py makemigrations --dry-run` → No changes detected.

```
1) POST /api/auth/register (demo)         → 201 + MeUser, Set-Cookie: sessionid
2) POST /api/auth/register (중복 demo)    → 409 {"username":"이미 사용 중인 username입니다."}
3) POST /api/auth/login (잘못된 비번)     → 401 {"detail":"아이디 또는 비밀번호가 올바르지 않습니다."}
4) POST /api/auth/login (정상)            → 200 + MeUser
5) GET  /api/users/me                     → 200 + MeUser
6) PATCH /api/users/me {year:4,...}       → 200 + MeUser (변경 반영)
7) GET  /api/users/me/preference          → 200 {33,33,34}
8) PUT  preference {40,20,40}             → 200 {40,20,40}
9) PUT  preference {20,15,15} (합 50)     → 400 {"weights":["...현재 50..."]}
10) GET preference                        → 200 {40,20,40}
11) GET favorites (빈)                    → 200 []
12) POST favorites pildong                → 201 + FavoriteItem(score=61.0)
13) POST favorites pildong (중복)         → 409 {"detail":"이미 찜한 동네입니다."}
14) POST favorites nope                   → 404 {"detail":"찾을 수 없는 동네: nope"}
15) POST favorites hoegidong, seogyodong  → 201 (×2)
16) GET favorites                         → 200 [seogyodong(61.6), hoegidong(71.0), pildong(61.0)]
17) DELETE favorites/pildong              → 204
18) DELETE favorites/pildong (없음)       → 404 {"detail":"찜 목록에 없는 동네: pildong"}
19) GET reviews                           → 200 []
20) POST /api/auth/logout                 → 200 {"detail":"로그아웃 되었습니다."}
21) GET /api/users/me (로그아웃 후)       → 401 {"detail":"로그인이 필요합니다."}
22) GET favorites (로그아웃 후)           → 401 동일
```

---

## 9단계 frontend가 알아야 할 것

### 1. axios 설정 — `withCredentials: true` 필수

세션 쿠키를 보내고 받기 위해 axios 인스턴스 전역에:

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,         // 필수 — 세션 쿠키 송수신
  headers: { 'Content-Type': 'application/json' },
});
```

fetch를 직접 쓴다면 매 호출에 `credentials: 'include'`.

### 2. CORS

백엔드 `base.py`에서 이미:
- `CORS_ALLOW_CREDENTIALS = True`
- `CORS_ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]` (env 기본값)

프론트 dev 서버를 5173 외 포트로 띄운다면 `.env`의 `DJANGO_CORS_ALLOWED_ORIGINS`에 추가 필요.

### 3. CSRF 토큰 — 필요 없음

본 9단계 인증 라우트는 모두 CSRF 면제. 프론트는 토큰을 보낼 필요 없다. 운영 배포 시 정책이 바뀔 수 있다는 점만 알아두면 됨.

### 4. 로그인 흐름 (권장 UX)

- 앱 시작 시 `GET /api/users/me` 호출 → 200이면 로그인 상태 복원, 401이면 로그아웃 상태로 가드.
- 로그인/회원가입 성공 후 `MeUser`를 그대로 React 전역 상태에 저장.
- 메인 지도/마이페이지에서 `preference` 변경 시 `PUT /api/users/me/preference` → 응답으로 상태 갱신 → favorites 등 의존 화면은 다음 fetch에서 자동 반영.

### 5. favorites 점수와 가중치

`GET /api/users/me/favorites`의 `score`는 사용자 저장 가중치 기준. 마이페이지에서 가중치 슬라이더가 없는 단순 리스트를 보여줄 때 의미 있는 점수가 나오도록 의도적 설계 (SPEC 6.6).

만약 마이페이지에서 가중치 슬라이더를 띄우는 변형 UI를 만든다면:
- 슬라이더 변경 → `PUT /api/users/me/preference` → 성공 후 favorites 재조회.

### 6. 에러 메시지 직접 표시 OK

모든 4xx 응답의 한국어 메시지(`detail`, `weights`, `username` 등)는 사용자에게 그대로 토스트로 보여줘도 자연스러움. 추가 번역/매핑 불필요.

### 7. 라우트/화면 매핑 힌트 (SPEC 6.6)

- 프로필 카드: `me.nickname` (또는 `username`), `me.school`, `me.year`
- 내 가중치 카드: `me.preference` 또는 `GET /me/preference`. "다시 학습하기" → 7단계 모달 → 결과를 `PUT /me/preference`로 저장.
- 찜한 동네 카드 리스트: `GET /me/favorites`. 클릭 → `/dong/<slug>`. "N개 모두 비교하기" → `/compare?dongs=<slugs>`.
- 내가 쓴 리뷰: 9단계 시점에는 빈 리스트 → "아직 작성한 리뷰가 없어요" 빈 상태 컴포넌트.

---

## 알려진 이슈 / 미완

- 가입 비밀번호 검증은 Django 기본(`MinimumLengthValidator`, `CommonPasswordValidator`, `NumericPasswordValidator`, `UserAttributeSimilarityValidator`)에 위임. 학부 데모용으로 4자 이상으로 완화하려면 `RegisterSerializer.password.min_length`를 조정.
- Review 모델 미구현 — `/api/users/me/reviews`는 항상 `[]`. 6.7 우선순위 5라 보류.
- CSRF 면제는 학부 데모 가정. 운영 배포 전에는 토큰 또는 SameSite + CSRF 정식 흐름으로 교체할 것.
- 사용자가 `GET/POST /me/favorites`를 가중치 변경 직후 호출하면 score가 갱신되지만, 캐시 도입(redis)은 미적용. 5분 cache 도입 시 user-scoped key로 분리해야 함.
- 가입 시 자동 로그인은 명세 외 편의. 프론트가 즉시 마이페이지로 보내는 흐름을 단순화하기 위함. 원치 않으면 `LoginView` 호출만으로 분리 가능 (`RegisterView`에서 `login(request, user)` 라인 제거).
- 슬러그 케이스: 5개 더미 동네(pildong / hoegidong / seogyodong / yeoksamdong / jamsildong) 외 슬러그는 favorites 추가 시 404. 10단계 적재 후 자동 해소.

---

## 산출물

- `/Users/bagjihyeon/Desktop/School/capston/backend/config/settings/base.py` (allauth 비활성화)
- `/Users/bagjihyeon/Desktop/School/capston/backend/config/urls.py` (allauth 라우트 제거, users 마운트 변경)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/users/views.py` (전면 개편: Register/Login/Logout + Me + Preference + Favorites)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/users/serializers.py` (Register/Login/MePatch 추가, FavoriteItem 필드명 변경, build_favorite_item 시그니처 변경)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/users/urls.py` (인증 + me 라우트 9개)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/users/models.py` (변경 없음, 8단계 시점 모델 그대로)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/preference/models.py` (변경 없음)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/users/migrations/0002_user_nickname_user_school_user_year_favorite.py` (이미 존재, 변경 없음)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/preference/migrations/0001_initial.py` (이미 존재, 변경 없음)
