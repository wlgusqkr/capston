# 슬기로운 자취생활

서울에서 자취를 처음 시작하는 대학생이 방을 보러 가기 전에 동네를 먼저 이해할 수 있는 공공데이터 기반 동네 대시보드.

**마감**: 2026.06.05 발표 · **상태**: PROMPTS.md 11단계 모두 완료 (더미 데이터 모드)

## 핵심 기능

- **행정동 히트맵**: 종합 점수를 4단계 색으로 시각화 (Leaflet 2D)
- **가중치 슬라이더**: 전월세 / 생활시설 / 교통 비율을 직접 조절. 합 100% 자동 보정.
- **선호 학습 온보딩**: 5번의 비교로 가중치 자동 추정 (scipy SLSQP — Bradley-Terry)
- **동네 패널 + 상세 페이지**: 6개 섹션 (히어로 / 부동산 / 편의시설 / 교통 / 리뷰 / 비슷한 동네)
- **동네 비교**: 최대 3개 나란히, 최고값 자동 강조
- **마이페이지**: 프로필 / 내 가중치 / 찜한 동네 / 리뷰 (username/password 인증)
- **다크 모드**: `<html data-theme="dark">` 또는 시스템 설정 따름

## 기술 스택

| 레이어 | 스택 |
|---|---|
| 백엔드 | Django 5 + DRF + GeoDjango (PostgreSQL 16 + PostGIS 3.4) |
| 프론트엔드 | React 18 + Vite + TypeScript (strict) |
| 지도 | Leaflet + react-leaflet |
| 차트 | Recharts |
| 인프라 | Docker Compose (DB만), 모놀리식 단일 서버 (배포) |
| 인증 | Django session (username/password, CSRF 면제) |

## 프로젝트 구조

```
capston/
├── backend/                  Django + GeoDjango
│   ├── apps/
│   │   ├── neighborhoods/    Dong 모델 + scores/summary/detail/compare API
│   │   ├── preference/       선호 학습 (scipy 가중치 추정) + UserPreference
│   │   └── users/            인증 + Favorite + 마이페이지 API
│   ├── scripts/              공공데이터 수집 골격 (10단계, 키 필요)
│   └── config/settings/      base / local / production
├── frontend/
│   └── src/
│       ├── routes/           MainMap, DongDetail, Compare, Login, Register, MyPage
│       ├── components/
│       │   ├── ui/           디자인 시스템 프리미티브 (Button/Card/Badge/Score/...)
│       │   ├── Map/          HeatMap, Sidebar, DongPanel, Legend, ViewToggle
│       │   ├── Detail/       6 sections of /dong/:slug
│       │   └── Onboarding/   PreferenceModal
│       └── styles/tokens.css 디자인 토큰 (light/dark)
├── docs/
│   ├── SPEC.md               전체 명세서 (gitignored 옵션)
│   ├── PROMPTS.md            단계별 작업 지시 프롬프트
│   └── handoff/              sub-agent 간 핸드오프 (gitignored)
├── .claude/agents/           sub-agent 정의 5개
├── docker-compose.yml        PostgreSQL/PostGIS + Redis
└── CLAUDE.md
```

## 개발 환경 시작

### 1. PostgreSQL + PostGIS 컨테이너 실행

```bash
docker compose up -d db
```

호스트 포트: **5433** (5432가 다른 프로젝트와 충돌해서 변경됨).

### 2. 백엔드

```bash
cd backend
uv venv --python 3.12
VIRTUAL_ENV="$(pwd)/.venv" uv pip install -e .
cp .env.example .env
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_dummy_dongs
.venv/bin/python manage.py runserver
```

→ http://localhost:8000

**macOS 주의**: GeoDjango는 GDAL/GEOS/PROJ 시스템 라이브러리가 필요합니다.
```bash
brew install gdal geos proj
```
Django 5.1은 GDAL 3.0~3.8을 자동 탐지하지만 Homebrew는 3.12를 깔아주므로 `.env`에 다음을 명시 (이미 `.env.example`에 들어 있음):
```
GDAL_LIBRARY_PATH=/opt/homebrew/opt/gdal/lib/libgdal.dylib
GEOS_LIBRARY_PATH=/opt/homebrew/opt/geos/lib/libgeos_c.dylib
```

### 3. 프론트엔드

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

→ http://localhost:5173

## 발표 데모 시나리오 (5분)

`docs/SPEC.md` 섹션 13의 시나리오대로 다음 흐름이 작동합니다.

| # | 동작 | 라우트/엔드포인트 |
|---|---|---|
| 1 | 메인 지도 등장 (5개 더미 동) | `/` → `GET /api/dongs/scores` |
| 2 | 가중치 슬라이더로 색상 출렁 | 동일 (queryKey에 weights 포함, 자동 refetch) |
| 3 | "5번 비교로 자동 추천" → 선호 학습 모달 | `GET /api/preference/pairs` + `POST /api/preference/submit` |
| 4 | 동 클릭 → 우측 슬라이드 패널 | `GET /api/dongs/:slug/summary` |
| 5 | "자세히 보기" → 6개 섹션 상세 페이지 | `/dong/:slug` → `GET /api/dongs/:slug/detail` |
| 6 | "비교에 추가" 누적 → "비교 보기" → 표 | `/compare?dongs=A,B,C` → `GET /api/compare` |
| 7 | (선택) 회원가입 → 찜하기 → 마이페이지 | `/login` `/register` `/mypage` |

5개 더미 동 `pildong / hoegidong / seogyodong / yeoksamdong / jamsildong`의 점수가 의도적으로 다양한 분포를 가지므로 가중치 변화가 시각적으로 명확합니다.

## API 엔드포인트 한눈에

```
GET    /api/dongs/scores                  # 메인 지도 히트맵
GET    /api/dongs/:slug/summary           # 동네 패널
GET    /api/dongs/:slug/detail            # 동네 상세
GET    /api/compare?slugs=A,B,C           # 동네 비교

GET    /api/preference/pairs?count=5      # 선호 학습 비교 쌍
POST   /api/preference/submit             # 가중치 추정

POST   /api/auth/register                 # 회원가입
POST   /api/auth/login                    # 로그인
POST   /api/auth/logout                   # 로그아웃

GET    /api/users/me                      # 내 프로필
PATCH  /api/users/me
GET    /api/users/me/preference
PUT    /api/users/me/preference
GET    /api/users/me/favorites
POST   /api/users/me/favorites
DELETE /api/users/me/favorites/:slug
GET    /api/users/me/reviews              # 빈 리스트 (Review 미구현)
```

모든 가중치 검증은 합 100±1, 0~100 범위. 한국어 에러 메시지.

## 알려진 한계 (10단계 작업 대상)

- **5개 더미 동만**: 실 행정동 GeoJSON 미적재. `python manage.py load_dongs <geojson>`으로 적재 가능.
- **부동산/편의시설/교통/리뷰는 모두 더미**: 점수 기반 결정적 합리화. 실 데이터는 `backend/scripts/` 골격을 참고해 공공 API 키 발급 후 적재.
- **공공 API 키 미설정**: 국토교통부, 소상공인진흥공단, 서울 열린 데이터, VWorld. `backend/scripts/README.md`에 발급 절차 정리.
- **카카오 로그인 미사용**: 명시적 결정. `django-allauth`는 의존성에만 남아 있고 활성화하지 않음.
- **3D 시각화 미구현**: SPEC 우선순위 10번 (시간 남으면).

## 작업 흐름 (기록용)

- `docs/PROMPTS.md`의 단계별 프롬프트 → 메인 코디네이터 → 적절한 sub-agent 위임
- sub-agents: `backend-engineer`, `frontend-engineer`, `design-system-keeper`, `data-pipeline`
- 각 단계 끝 → 메인이 명세서 부합 자체 검증 (`design-qa-reviewer` 정의 기반) → git commit
- 핸드오프 문서는 `docs/handoff/`에 단계별 기록 (현재 gitignored)

## 라이선스

학부 캡스톤 프로젝트. 외부 배포 시 별도 결정.
