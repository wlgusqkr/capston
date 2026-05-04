# 로컬 개발

로컬 머신에서 개발 서버 띄우고 작업하기. 배포는 [`deploy/README.md`](https://github.com/wlgusqkr/capston/blob/main/deploy/README.md).

---

## 사전 준비 (macOS)

GeoDjango는 GDAL/GEOS/PROJ 시스템 라이브러리가 필요.

```bash
brew install gdal geos proj
brew install --cask docker        # Docker Desktop
```

`uv` (Python 의존성 매니저):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

## 1. PostgreSQL + PostGIS

```bash
docker compose up -d db
```

호스트 포트: **5433** (5432가 다른 프로젝트와 충돌해서 변경됨).

DB 직접 접속:

```bash
docker exec -it slgi-db psql -U slgi -d slgi
```

---

## 2. 백엔드

```bash
cd backend
uv venv --python 3.12
uv sync
cp .env.example .env       # API 키 채우기 → DATA.md §7
uv run python manage.py migrate
uv run python manage.py load_dongs data/seoul_dongs.geojson
uv run python manage.py runserver
```

→ http://localhost:8000
→ Swagger UI: http://localhost:8000/api/schema/swagger-ui/
→ Django Admin: http://localhost:8000/admin/

**macOS GDAL 자동 탐지 실패 시** — `.env`에 명시 (이미 `.env.example`에 들어 있음):

```env
GDAL_LIBRARY_PATH=/opt/homebrew/opt/gdal/lib/libgdal.dylib
GEOS_LIBRARY_PATH=/opt/homebrew/opt/geos/lib/libgeos_c.dylib
```

Django 5.1은 GDAL 3.0~3.8을 자동 탐지하지만 Homebrew는 3.12를 깔아서 자동 탐지 실패 가능.

---

## 3. 프론트엔드

```bash
cd frontend
npm install
cp .env.example .env       # VITE_VWORLD_API_KEY 채우기
npm run dev
```

→ http://localhost:5173

타입 체크:

```bash
npm run typecheck     # tsc -b --noEmit
```

프로덕션 빌드 (배포 전 점검):

```bash
npm run build         # tsc -b && vite build → dist/
npm run preview       # 빌드 결과 로컬 서버
```

---

## 4. 자주 쓰는 백엔드 명령

```bash
cd backend

# 마이그레이션
uv run python manage.py makemigrations
uv run python manage.py migrate

# 행정동 적재 (1회만)
uv run python manage.py load_dongs data/seoul_dongs.geojson

# 더미 5개 동 (실 데이터 적재 전 빠른 검증용)
uv run python manage.py seed_dummy_dongs

# 데이터 적재 — 키 필요 (DATA.md §7)
uv run python scripts/fetch_amenities.py --target all
uv run python scripts/fetch_transit.py --target all
uv run python scripts/fetch_realestate.py --gu 종로구 --months 6

# 점수 갱신
uv run python scripts/compute_scores.py --mode real

# 슈퍼유저 (admin 접근용)
uv run python manage.py createsuperuser

# 셸
uv run python manage.py shell
```

---

## 5. 디버깅

### 백엔드 로그
- `runserver` 콘솔에 SQL + request 로그 (DEBUG=True 시 SQL 표시)
- 에러 트레이스: 브라우저에서 Django debug 페이지 자동 표시

### DB 쿼리 카운트
- `runserver`에 [django-silk](https://github.com/jazzband/django-silk) 미설치. 필요 시 `INSTALLED_APPS`에 추가.

### 프론트엔드
- React DevTools (브라우저 확장)
- TanStack Query DevTools (앱 우하단 하단 패널, 개발 모드만)

### Leaflet 지도가 안 뜰 때
- `VITE_VWORLD_API_KEY` 설정 확인. 없으면 OSM 폴백.
- VWorld 키는 도메인 등록 필요 (vworld.kr 마이페이지). `localhost`도 명시 등록.

### CORS 에러
- `backend/.env` 의 `DJANGO_CORS_ALLOWED_ORIGINS` 확인
- 기본: `http://localhost:5173,http://127.0.0.1:5173`

---

## 6. 작업 흐름

이 프로젝트는 sub-agent 위임 패턴으로 진행됩니다 (단계별 프롬프트와 핸드오프는 `.claude/` 폴더에 있음 — 사이트 비공개).

| Sub-agent | 담당 |
|---|---|
| `backend-engineer` | Django, DRF, GeoDjango, PostGIS, 데이터 모델, API |
| `frontend-engineer` | React, TypeScript, Leaflet, Recharts, UI |
| `design-system-keeper` | CSS variables, 컬러 토큰, 타이포, Button/Card 등 베이스 |
| `data-pipeline` | 공공데이터 수집·매핑·점수 계산 스크립트 |
| `design-qa-reviewer` | 메인 코디네이터의 자체 QA 모드 |

원칙:
- 한 번에 하나의 화면 또는 기능을 완성 (백엔드 API + 프론트 UI 묶음)
- sub-agent에게 일을 시킬 때는 SPEC 섹션 번호를 명시
- 각 단계 산출물은 `.claude/handoff/YYYYMMDD-task-name.md` 로 핸드오프
- 단계 종료 시 conventional commits 형식으로 git commit

---

## 7. 코드 스타일

| 영역 | 도구 |
|---|---|
| Python 포맷 | black (line-length 100) |
| Python import 정렬 | isort (profile=black) |
| Python 린트 | ruff |
| Python 타입 | mypy + django-stubs |
| TypeScript | strict mode |
| 커밋 메시지 | conventional commits (feat/fix/refactor/docs/ci/...) |

자동화는 미설치 (pre-commit hook 등). 필요 시 `pyproject.toml`의 `[tool.*]` 섹션 참고.

---

## 8. 트러블슈팅 자주 보는 것

| 증상 | 원인 / 해결 |
|---|---|
| `GDALException: Could not find the GDAL library` | `.env`에 `GDAL_LIBRARY_PATH` 미설정. brew 경로 확인 |
| `psycopg.OperationalError: Connection refused` | docker compose db 미기동. `docker compose up -d db` |
| `npm run dev` 후 타일 회색 | VWorld 키 누락 또는 도메인 미등록. `.env` 확인 |
| API CORS 에러 | `DJANGO_CORS_ALLOWED_ORIGINS`에 프론트 origin 추가 |
| `migrate` 시 PostGIS extension 에러 | 일반 postgres 이미지 사용 중. `docker-compose.yml`이 `postgis/postgis` 인지 확인 |
| 점수가 모두 50.0 | `compute_scores.py`가 데이터 없는 상태에서 fallback. 데이터 적재 후 재실행 |
