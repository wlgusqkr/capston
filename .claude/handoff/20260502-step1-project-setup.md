# Task: 1단계 — 프로젝트 셋업

작성: 2026-05-02 (메인 코디네이터 직접)
PROMPTS.md 1단계.

## 완료된 작업

1. 디렉토리 구조 생성
   - `backend/` — Django 프로젝트 위치 (3단계에서 채워질 예정)
   - `frontend/` — Vite + React + TS 프로젝트 위치 (4단계)
   - `docs/handoff/` — sub-agent 핸드오프 디렉토리 (이 파일이 첫 핸드오프)
2. `.gitignore` — Python + Node.js + Django + Vite + Docker 표준 + 프로젝트별 데이터 디렉토리
3. `README.md` — 1페이지 (프로젝트 개요, 기술 스택, 구조, 실행 방법)
4. `backend/.env.example` — Django, DB, CORS, Redis, 카카오, 공공데이터 API 키
5. `frontend/.env.example` — Vite 환경변수 (VITE_API_BASE_URL 등)
6. `docker-compose.yml` — PostgreSQL/PostGIS 16-3.4 + Redis 7 (둘 다 healthcheck 포함)
7. `design-qa-reviewer` agent 정의 추가 (.claude/agents/design-qa-reviewer.md)
   - 5개 모드: A 디자인 시스템 / B 프론트 화면 / C 백엔드 API / D 데이터 파이프라인 / E 크로스 화면 일관성
8. git 초기 커밋

## 산출물 (파일 경로)

- `/Users/bagjihyeon/Desktop/School/capston/.gitignore`
- `/Users/bagjihyeon/Desktop/School/capston/README.md`
- `/Users/bagjihyeon/Desktop/School/capston/docker-compose.yml`
- `/Users/bagjihyeon/Desktop/School/capston/backend/.env.example`
- `/Users/bagjihyeon/Desktop/School/capston/frontend/.env.example`
- `/Users/bagjihyeon/Desktop/School/capston/docs/handoff/.gitkeep`
- `/Users/bagjihyeon/Desktop/School/capston/.claude/agents/design-qa-reviewer.md`
- `/Users/bagjihyeon/Desktop/School/capston/backend/` (빈 디렉토리, 3단계에서 Django 생성)
- `/Users/bagjihyeon/Desktop/School/capston/frontend/` (빈 디렉토리, 4단계에서 Vite 생성)

## DB 접속 정보 (개발용)

```
DATABASE_URL=postgis://slgi:slgi@localhost:5432/slgi
```

`docker compose up -d`로 실행. `backend/.env`에 그대로 사용.

## 다음 작업자 (design-system-keeper)에게 전달

- SPEC.md 섹션 4가 디자인 시스템 명세. 절대 기준.
- 와이어프레임 이미지(`docs/wireframes/`)는 **존재하지 않음**. SPEC.md 섹션 6의 텍스트 명세만 기준.
- `frontend/` 디렉토리는 비어 있음. Vite 셋업은 4단계에서 frontend-engineer가 함.
  → 2단계에서는 **`frontend/src/styles/`와 `frontend/src/components/ui/`만 채우면 됨**.
  → 단, 4단계에서 Vite가 만든 디폴트 구조와 충돌하지 않도록, package.json/vite.config.ts는 생성하지 말 것.
  → Vite가 나중에 동일 경로를 만들 때 우리가 미리 만든 파일들이 덮어써지지 않도록 주의.
- 컴포넌트 작성 시 React import 가능하다고 가정. (4단계에서 의존성 설치 시 react/react-dom 들어옴)
- TypeScript 사용. `.tsx` 확장자.
- 핸드오프 파일은 `docs/handoff/20260502-step2-design-foundation.md`로 남길 것.

## 미완 / 알려진 이슈

- 와이어프레임 이미지 부재 — SPEC.md 섹션 6 텍스트 명세로 진행하기로 사용자와 합의 (2026-05-02)
- `backend/`, `frontend/`는 빈 디렉토리. 3단계, 4단계에서 채움.
- Vite가 만들 `frontend/src/` 구조와 design-system-keeper가 미리 만들 파일들의 충돌 가능성 → 4단계 시작 시 frontend-engineer가 기존 파일 보존 여부 확인 필요.
- 프로덕션 배포 설정(Nginx, Gunicorn, 환경별 분리) 미작성. 발표 리허설 단계(11)에서 결정.
