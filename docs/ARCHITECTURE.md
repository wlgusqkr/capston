# 시스템 설명

서비스가 무엇으로, 왜 그렇게 만들어졌는지. 기술 스택과 결정 근거.

명세 원본은 [`SPEC.md`](SPEC.md), 데이터는 [`DATA.md`](DATA.md), 배포는 [`deploy/README.md`](https://github.com/wlgusqkr/capston/blob/main/deploy/README.md) 참고.

---

## 1. 한 줄 정의

> 서울 자취 입문 대학생이 방을 보러 가기 전에 동네를 먼저 이해할 수 있도록, 공공데이터 7개 출처를 통합해 425개 행정동의 점수와 실거래를 한 화면에 띄운 대시보드.

---

## 2. 기술 스택

| 레이어 | 스택 | 선택 이유 |
|---|---|---|
| 백엔드 | Django 5 + DRF + GeoDjango | 공간 쿼리 1급 지원 (`ST_Distance`, `geom__contains` 등을 ORM에서) |
| DB | PostgreSQL 16 + PostGIS 3.4 | 단일 DB로 지오메트리·관계형 동시 처리 |
| 캐시 | Redis 7 | 5분 TTL (현재 활성). API 가중치 쿼리 캐시 |
| 프론트 | React 18 + Vite + TypeScript (strict) | 학습 비용 낮고 생태계 풍부 |
| 지도 | Leaflet + react-leaflet + VWorld 타일 | 2D 히트맵·핀에 충분. deck.gl/Mapbox는 3D 필요 시만 |
| 차트 | Recharts | React 친화, 학습 곡선 완만 |
| 인증 | Django session (username/password) | CSRF 면제, 카카오 명시적 미사용 |
| API 문서 | drf-spectacular | OpenAPI 3 스키마 자동 생성, Swagger UI 제공 |
| 배포 | GCP VM 단일 인스턴스 + nginx + gunicorn(systemd) + docker compose(DB/Redis) | 학부 캡스톤 트래픽 0~100명, 마이크로서비스 안티패턴 |
| CI/CD | GitHub Actions → SSH 배포 | 50초 배포, 시크릿 관리 단순 |

---

## 3. 핵심 결정 근거

### 3.1 왜 GeoDjango + PostGIS?
- 매물 좌표 → 행정동 매핑이 한 줄: `Dong.objects.filter(geom__contains=point)`
- 가까운 지하철 top-3 사전계산: `ST_Distance(geography)` raw SQL 한 번으로 1,275행 생성
- 별도 GIS 서버 (GeoServer 등) 불필요

### 3.2 왜 단일 모놀리식 VM?
- Kubernetes/마이크로서비스 = 학부 캡스톤 안티패턴 (CLAUDE.md 명시)
- 단일 nginx 오리진으로 프론트 + 백엔드 동시 서빙 → CORS / CSRF 단순화
- GitHub Actions → SSH 배포 50초. 빠르고 시크릿 관리 단순

### 3.3 왜 Leaflet (3D 아님)?
- 2D 히트맵 + 실거래 핀이면 Leaflet 충분
- VWorld 타일로 한국 행정동 지명·지번 정확 (OSM은 부정확)
- 3D는 SPEC 우선순위 10번 (시간 남으면 deck.gl)

### 3.4 왜 카카오 로그인 X?
- 명시적 결정 (CLAUDE.md). 외부 의존성·도메인 등록·CSRF 페이로드 등 학부 일정 대비 비용 큼
- Django 표준 username/password + session = 5줄 코드

### 3.5 왜 sub-agent 위임 패턴?
- 5개 전문 에이전트 (`backend-engineer`, `frontend-engineer`, `design-system-keeper`, `data-pipeline`, `design-qa-reviewer`) 로 작업 분해
- 단계별 핸드오프 문서 (`.claude/handoff/`) 로 컨텍스트 보존
- 메인 코디네이터는 SPEC 부합 검증과 git commit 담당

---

## 4. 시스템 다이어그램

```
                          ┌────────────────────┐
                          │   Browser / Client │
                          │   (React + Leaflet)│
                          └─────────┬──────────┘
                                    │ HTTP
                                    ▼
                  ┌──────────────────────────────┐
                  │  nginx :80  (단일 오리진)    │
                  │  ├─ /              → SPA     │
                  │  ├─ /api,/admin    → gunicorn│
                  │  └─ /static,/media → Django  │
                  └──────────────┬───────────────┘
                                 │
                ┌────────────────┴────────────────┐
                ▼                                 ▼
        ┌──────────────┐                  ┌──────────────┐
        │   gunicorn   │                  │  Django      │
        │   (systemd)  │  ◀── ORM ──▶     │  staticfiles │
        │   :8000      │                                  │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐                  ┌──────────────┐
        │  PostgreSQL  │                  │    Redis     │
        │  + PostGIS   │                  │   (캐시 5분) │
        │   :5433      │                  │   :6379      │
        └──────────────┘                  └──────────────┘
            (docker compose)                  (docker compose)
```

---

## 5. 프로젝트 구조

```
capston/
├── backend/                  Django + GeoDjango
│   ├── apps/
│   │   ├── neighborhoods/    Dong 모델 + scores/summary/detail/compare API
│   │   ├── realestate/       RentDeal + JibunGeocodeCache + 환산식
│   │   ├── amenities/        Amenity (10 카테고리)
│   │   ├── transit/          SubwayStation, BusStop, NearestSubway
│   │   ├── preference/       선호 학습 (scipy SLSQP, Bradley-Terry)
│   │   └── users/            인증 + Favorite + 마이페이지
│   ├── scripts/              공공데이터 적재 + 점수 계산 (자세히 → DATA.md §5)
│   ├── data/seoul_dongs.geojson   행정동 경계
│   └── config/settings/      base / local / production
├── frontend/
│   └── src/
│       ├── routes/           MainMap, DongDetail, Compare, Login/Register, MyPage
│       ├── components/
│       │   ├── ui/           디자인 프리미티브 (자세히 → DESIGN_SYSTEM.md)
│       │   ├── Map/          HeatMap, Sidebar, DongPanel, Legend, ViewToggle
│       │   ├── Detail/       6 sections of /dong/:slug
│       │   └── Onboarding/   PreferenceModal
│       └── styles/tokens.css 디자인 토큰 (light/dark)
├── deploy/                   배포 (자세히 → deploy/README.md)
├── docs/                     문서 (이 파일 포함)
├── .github/workflows/        deploy.yml (push to main → SSH 배포)
├── .claude/agents/           sub-agent 정의 5개
├── docker-compose.yml        PostgreSQL/PostGIS + Redis
└── CLAUDE.md
```

---

## 6. 데이터 흐름

```
공공 API (data.go.kr / data.seoul.go.kr / VWorld)
        │
        ▼
backend/scripts/fetch_*.py  ──▶  PostgreSQL/PostGIS  ◀──  scripts/compute_scores.py
        │                         │                           (백분위 정규화)
        │                         │
        │                         ▼
        │                  apps/*/views.py (DRF)
        │                         │
        │                         ▼
        │                  /api/dongs/scores 등
        │                         │
        │                         ▼
        │                  React (TanStack Query)
        │                         │
        │                         ▼
        │                  Leaflet HeatMap
        │
        └─ 갱신 주기: 월 1회 cron 권장
```

자세한 데이터 출처·처리·점수 알고리즘은 [`DATA.md`](DATA.md).

---

## 7. API 표면 (요약)

전체 OpenAPI 스키마: http://34.47.101.188/api/schema/swagger-ui/

```
GET    /api/dongs/scores                  # 메인 지도 히트맵 (425 동)
GET    /api/dongs/:slug/summary           # 동네 패널
GET    /api/dongs/:slug/detail            # 동네 상세 (6 섹션)
GET    /api/compare?slugs=A,B,C           # 동네 비교
GET    /api/transactions/bbox             # 줌 13+ 실거래 핀

GET    /api/preference/pairs?count=5      # 선호 학습 비교 쌍
POST   /api/preference/submit             # 5쌍 → 가중치 추정

POST   /api/auth/register | login | logout
GET    /api/users/me | preference | favorites | reviews
```

가중치 검증: 합 100±1, 0~100 범위. 한국어 에러 메시지.

---

## 8. 모듈별 책임

| 모듈 | 책임 | 다른 모듈 의존 |
|---|---|---|
| `apps.neighborhoods` | Dong 모델, scores/summary/detail/compare API | realestate, amenities, transit (read-only) |
| `apps.realestate` | RentDeal, JibunGeocodeCache, 환산식 | neighborhoods (FK) |
| `apps.amenities` | Amenity (10 카테고리) | neighborhoods (FK) |
| `apps.transit` | SubwayStation, BusStop, NearestSubway | neighborhoods (FK) |
| `apps.preference` | 5쌍 비교 → SLSQP 가중치 추정 | neighborhoods (read-only), users (FK) |
| `apps.users` | username/password 인증, Favorite, 마이페이지 | neighborhoods (FK via Favorite) |
| `scripts/` | 공공 API 호출 → DB 적재. Django ORM 직접 사용 | 모든 앱 모델 |
| `frontend/src/routes/` | URL ↔ 화면 매핑 | components, lib |
| `frontend/src/components/Map/` | Leaflet 히트맵·핀·사이드바 | lib/api, lib/colors |
| `frontend/src/components/Detail/` | 6 섹션 상세 페이지 | lib/api, Recharts |
| `deploy/` | systemd unit, nginx conf, 배포 스크립트 | — (인프라) |

---

## 9. 비기능 요구사항

| 항목 | 목표 | 현재 |
|---|---|---|
| 메인 히트맵 응답 | < 500ms | ~200ms (425 동, Redis 캐시 hit 시) |
| 배포 시간 | < 2분 | ~50초 (GitHub Actions → SSH) |
| 동시 접속 | 100명 | 단일 VM gunicorn 3 worker로 충분 |
| HTTPS | TODO | 도메인 + Let's Encrypt 미적용 |
| 모바일 반응형 | 데스크톱 우선 | viewport=1280 고정 — 데모 PC 가정 |

---

## 10. 참고 문서

- [`SPEC.md`](SPEC.md) — 명세 원본 (798줄, 권위 문서)
- [`DATA.md`](DATA.md) — 데이터 출처·처리·점수 알고리즘
- [`DEVELOPMENT.md`](DEVELOPMENT.md) — 로컬 개발 환경
- [`deploy/README.md`](https://github.com/wlgusqkr/capston/blob/main/deploy/README.md) — 배포 운영 가이드
- [`ROADMAP.md`](ROADMAP.md) — 한계와 고도화 방향
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — 디자인 토큰
