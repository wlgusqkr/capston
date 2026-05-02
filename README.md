# 슬기로운 자취생활

서울에서 자취를 처음 시작하는 대학생이 방을 보러 가기 전에 동네를 먼저 이해할 수 있는 공공데이터 기반 동네 대시보드.

**마감**: 2026.06.05 발표

## 핵심 기능

- 행정동별 종합 점수 히트맵 (전월세 / 생활시설 / 교통)
- 가중치 슬라이더 직접 조절 또는 5번 비교로 자동 학습
- 동네 클릭 → 핵심 지표 패널 → 상세 페이지
- 동네 비교 (최대 3개)
- 자취생 리뷰 (UI 우선, 실데이터는 후순위)

자세한 내용은 [`docs/SPEC.md`](docs/SPEC.md) 참고.

## 기술 스택

| 레이어 | 스택 |
|---|---|
| 백엔드 | Django + DRF + GeoDjango (PostgreSQL + PostGIS) |
| 프론트엔드 | React + Vite + TypeScript |
| 지도 | Leaflet (2D 메인) |
| 차트 | Recharts |
| 인프라 | Docker Compose (개발), 모놀리식 단일 서버 (배포) |

## 프로젝트 구조

```
capston/
├── backend/          Django 프로젝트
├── frontend/         Vite + React 프로젝트
├── docs/
│   ├── SPEC.md       전체 명세서 (가장 중요)
│   ├── PROMPTS.md    단계별 작업 지시 프롬프트
│   └── handoff/      sub-agent 간 핸드오프 기록
├── .claude/agents/   sub-agent 정의 (5개)
├── docker-compose.yml
└── CLAUDE.md         메인 코디네이터 지시사항
```

## 개발 환경 시작

### 1. PostgreSQL + PostGIS 컨테이너 실행

```bash
docker compose up -d
```

기본 포트: `5432`. `.env.example` 참고해서 `backend/.env` 작성.

### 2. 백엔드

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

→ http://localhost:8000

### 3. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

→ http://localhost:5173

## 작업 흐름

`docs/PROMPTS.md`의 단계별 프롬프트를 메인 세션에 던지면, 메인 코디네이터가 적절한 sub-agent에게 위임합니다.

- `backend-engineer` — Django, DRF, GeoDjango
- `frontend-engineer` — React, TypeScript, Leaflet
- `design-system-keeper` — 디자인 토큰, 베이스 컴포넌트
- `data-pipeline` — 공공데이터 수집, 점수 계산
- `design-qa-reviewer` — 단계 결과물 명세서 부합 검증

각 단계 끝 → `design-qa-reviewer` 검증 → git commit → 다음 단계.

## 라이선스

학부 캡스톤 프로젝트. 외부 배포 시 별도 결정.
