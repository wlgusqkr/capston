# Task: 3단계 — 백엔드 기초 + Dong 모델 + /api/dongs/scores

작성: 2026-05-02
backend-engineer 위임 → 진행 중 stall (600s 무진행) → 메인 코디네이터가 마무리.

## 완료된 작업

### 패키지 / 환경
- `pyproject.toml`: django 5.1, DRF, GeoDjango, django-cors-headers, django-environ,
  psycopg[binary], django-allauth, django-redis, scipy, gunicorn + dev deps (black, isort, ruff, mypy, pytest)
- `.python-version`: 3.12
- `.env`, `.env.example`: DATABASE_URL (포트 5433), GDAL/GEOS 라이브러리 경로 명시 (Mac)

### Django 프로젝트
- `config/settings/{base,local,production}.py` — 환경 분리, django-environ 사용
- `config/urls.py`, `wsgi.py`, `asgi.py`
- DRF 기본 설정 (JSON only + DEBUG 시 BrowsableAPI)
- CORS (.env로 제어)
- django-redis 캐시 (5분 TTL, IGNORE_EXCEPTIONS)
- LANGUAGE_CODE=ko-kr, TIME_ZONE=Asia/Seoul

### 앱
- `apps.users` — 커스텀 User (현재 AbstractUser 그대로, 9단계 확장 대비)
- `apps.neighborhoods` — Dong 모델 + serializer + view + URL
  - `Dong` 필드: slug, name, gu, code, geom (MultiPolygon, SRID 4326), centroid (Point), area_km2, score_rent/amenity/transit, created_at, updated_at
  - `composite_score(w_rent, w_amenity, w_transit)` 메서드
  - `GET /api/dongs/scores?w_rent=&w_amenity=&w_transit=` 엔드포인트
  - 가중치 default 33/33/34, 합 100±1, 0~100 범위 검증
  - 응답: `[{slug, name, gu, score, lat, lng}, ...]` score desc 정렬
  - 페이지네이션 비활성 (426개 한 번에)

### 관리 명령
- `seed_dummy_dongs` — 5개 더미 동 생성/갱신, `--reset` 옵션
- `load_dongs <path>` — GeoJSON FeatureCollection 적재 (10단계 data-pipeline용)

### 마이그레이션
- `users.0001_initial`, `neighborhoods.0001_initial`
- migrate 성공, postgis ENGINE 사용
- (PostGIS extension은 도커 이미지에 이미 활성화됨)

### 검증 결과 (curl 응답 첨부)

**기본 가중치 33/33/34**
```json
[
  {"slug": "hoegidong",   "name": "회기동", "gu": "동대문구", "score": 71.55, "lat": 37.5917, "lng": 127.0533},
  {"slug": "jamsildong",  "name": "잠실동", "gu": "송파구",   "score": 71.04, "lat": 37.5121, "lng": 127.0823},
  {"slug": "seogyodong",  "name": "서교동", "gu": "마포구",   "score": 66.78, "lat": 37.5512, "lng": 126.9223},
  {"slug": "pildong",     "name": "필동",   "gu": "중구",     "score": 60.30, "lat": 37.5589, "lng": 126.9954},
  {"slug": "yeoksamdong", "name": "역삼동", "gu": "강남구",   "score": 60.25, "lat": 37.5009, "lng": 127.0364}
]
```

**transit 강조 (10/10/80)** → 필동 1위로 점프 (transit=90)
**rent 강조 (80/10/10)** → 회기동 1위 유지, 역삼동 5위로 추락 (rent=15)

검증: 가중치 슬라이더 효과가 시각적으로 확인 가능한 분포로 더미 데이터 설계됨.

**에러 케이스**
- 합 != 100 (±1): HTTP 400 + `{"weights": "가중치 합이 100이어야 합니다 (현재 150)..."}`
- 범위 밖 (200): HTTP 400 + `{"w_rent": "0~100 범위여야 합니다."}`

## 산출물 (파일 경로)

- `/Users/bagjihyeon/Desktop/School/capston/backend/pyproject.toml`
- `/Users/bagjihyeon/Desktop/School/capston/backend/.python-version`
- `/Users/bagjihyeon/Desktop/School/capston/backend/.env.example` (GDAL 경로 추가)
- `/Users/bagjihyeon/Desktop/School/capston/backend/manage.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/README.md`
- `/Users/bagjihyeon/Desktop/School/capston/backend/config/{__init__,urls,wsgi,asgi}.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/config/settings/{__init__,base,local,production}.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/__init__.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/users/{__init__,apps,models,admin}.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/users/migrations/{__init__,0001_initial}.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/{__init__,apps,models,admin,serializers,views,urls}.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/migrations/{__init__,0001_initial}.py`
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/management/commands/{seed_dummy_dongs,load_dongs}.py`

## 다음 작업자 (frontend-engineer / 4단계)에게 전달

### API
- **Base URL**: `http://localhost:8000/api`
- **엔드포인트**: `GET /api/dongs/scores?w_rent=33&w_amenity=33&w_transit=34`
- **응답 필드 타입**:
  - `slug: string`
  - `name: string` (한국어 행정동 이름)
  - `gu: string` (한국어 구 이름)
  - `score: number` (0~100, 소수점 둘째 자리, weighted sum)
  - `lat: number` (centroid Y, 6자리)
  - `lng: number` (centroid X, 6자리)
- **정렬**: score 내림차순
- **에러**: 400 Bad Request + `{"<field>": "<korean message>"}` (DRF ValidationError 형식)
- **CORS**: `http://localhost:5173`, `http://127.0.0.1:5173` 허용

### 메인 지도(SPEC 6.1) 구현 시
- 가중치 슬라이더는 정수 0~100, 합 100. 합이 안 맞으면 클라이언트에서 정규화 후 호출.
- 더미 동은 5개라 GeoJSON 정적 파일 부재 시에도 폴리곤은 `centroid` 좌표 주변에 클라이언트가 임의 사각형 그려서 데모 가능 (또는 백엔드 추가 엔드포인트 필요 — 5단계에서 결정).
- `score`는 클라이언트 색 매핑 (`scoreToHeatmapColor` 이미 있음)에 그대로 전달 가능.

### 5단계로 미룬 것
- `/api/dongs/:slug/summary` 엔드포인트 (한 줄 요약 룰베이스 포함)
- 한 줄 요약 generator (SPEC 11.3)

### 9단계 활성화 항목
- `INSTALLED_APPS`에서 allauth 주석 해제
- `urls.py`에서 `path("api/auth/", include("allauth.urls"))` 활성화
- 카카오 키 .env에 채우기

## 알려진 이슈 / 결정사항

1. **GDAL 3.12 자동 탐지 실패** — Django 5.1 코드에 3.0~3.8 하드코딩.
   `.env`에 `GDAL_LIBRARY_PATH` 명시로 우회. `.env.example`에 동일 라인 추가하여 다음 개발자도 빠르게 따라 셋업 가능.

2. **PostGIS 도커 이미지 amd64** — Apple Silicon에서 에뮬레이션. 개발에는 무관, 운영 배포 시 ARM 호환 이미지 검토 필요.

3. **scipy** — 7단계 가중치 추정용. 이미 설치되어 있음.

4. **pre-commit 미설정** — 시간 부족 시 스킵 가능 항목이라 보류. 11단계 마무리에서 추가 검토.

5. **load_dongs 명령** — GeoJSON 속성 키 추측 매칭 (`ADM_NM`, `EMD_KOR_NM` 등). 실제 행안부 GeoJSON 받으면 키 매핑 수정 필요할 수 있음 (10단계).

6. **stall 원인 미확정** — backend-engineer agent가 management 명령 작성 단계에서 600초 무응답. 메인 코디네이터가 같은 사양으로 마무리. 결과는 동일하게 동작.
