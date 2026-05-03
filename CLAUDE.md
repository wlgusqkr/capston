# 슬기로운 자취생활

서울 자취 입문자를 위한 공공데이터 기반 동네 대시보드. 마감 2026.06.05.

## 컨텍스트 (작업 시작 전 반드시 읽기)

- `docs/SPEC.md` — 전체 명세서 (가장 중요)
- `docs/wireframes/` — 화면별 와이어프레임 이미지
- `docs/DESIGN_SYSTEM.md` — 디자인 시스템 단일 진실 (Cohere-inspired, white canvas + near-black CTA + Deep Forest 히트맵). UI 작업 전에 반드시 참고.

명세서를 먼저 읽지 않고 코드를 작성하지 않습니다. 새 세션이 시작되거나 컨텍스트를 잃었다면 명세서 재확인부터.

## 기술 스택 (확정 — 변경 금지)

- 백엔드: Django + DRF + GeoDjango + PostgreSQL/PostGIS
- 프론트: React + Vite + TypeScript
- 지도: Leaflet (2D 메인, 3D는 시간 남으면 deck.gl)
- 차트: Recharts
- 배포: 모놀리식 단일 서버

## 절대 하지 말 것

- 마이크로서비스 분리 (Django 단일 서비스로 모든 것 처리)
- Kafka, Elasticsearch, Logstash 도입
- 회원 자체 가입 (카카오 소셜만)
- 명세서에 없는 기능 임의 추가
- 와이어프레임 무시한 화면 디자인
- 과도한 추상화 (학부 프로젝트 규모에 맞게)
- localStorage / sessionStorage 사용 (메모리 상태로 처리, 단 React 일반 환경에선 OK)

## 작업 우선순위

명세서 섹션 7과 15 참고. 1번 (메인 지도)이 절대 우선. 9, 10번 (3D, 임베딩)은 시간 남으면.

## Sub-agent 위임 규칙

이 프로젝트는 4개의 전문 sub-agent와 함께 작업합니다. 작업 성격에 따라 적절히 위임하세요:

- `backend-engineer` — Django, DRF, GeoDjango, PostGIS, 데이터 모델, API 엔드포인트, 데이터 수집 스크립트 관련 작업
- `frontend-engineer` — React, TypeScript, Vite, Leaflet 지도, Recharts, UI 컴포넌트 관련 작업
- `design-system-keeper` — CSS variables, 컬러 토큰, 타이포 시스템, 공통 컴포넌트 (Button, Card, Badge 등) 관련 작업. 모든 UI 작업의 기반.
- `data-pipeline` — 공공데이터 수집, 법정동→행정동 매핑, 점수 계산, 정규화 스크립트 관련 작업

위임 원칙:
- 한 번에 하나의 화면 또는 기능을 완성합니다 (백엔드 API + 프론트 UI 묶어서)
- sub-agent에게 일을 시킬 때는 명세서의 해당 섹션 번호를 명시하세요 (예: "명세서 섹션 6.1 참고")
- 각 sub-agent의 출력은 `docs/handoff/` 디렉토리의 마크다운 파일로 핸드오프합니다
- 단계 종료 시 항상 git commit. conventional commits 형식 (feat:, fix:, refactor: 등)

## 단계별 작업 순서 (제안)

명세서 섹션 15 체크리스트 따름. 각 단계는 한 번에 한 sub-agent에게 위임:

1. **셋업** — 프로젝트 구조, Git, 환경 변수. 메인 에이전트가 직접.
2. **디자인 시스템** — `design-system-keeper`에게 위임. 토큰과 베이스 컴포넌트.
3. **데이터 수집** — `data-pipeline`에게 위임. 행정동 GeoJSON, 더미 데이터로 시작.
4. **백엔드 메인 API** — `backend-engineer`에게 위임. Dong 모델 + `/api/dongs/scores`.
5. **프론트 메인 지도** — `frontend-engineer`에게 위임. Leaflet 히트맵 + 사이드바.
6. **동네 패널 + 상세** — 백엔드/프론트 페어 작업.
7. **선호 학습** — 백엔드/프론트 페어 작업.
8. **비교 / 마이페이지** — 우선순위 낮음.

## 코드 스타일

- TypeScript strict mode
- Python: Black + isort + mypy (가능하면)
- 커밋 메시지: conventional commits
- 파일 경로는 항상 절대 경로로 명시

## 핸드오프 파일 규칙

작업 결과를 다음 sub-agent에게 넘길 때 `docs/handoff/YYYYMMDD-task-name.md` 형식으로 작성:

```markdown
# Task: <무엇을 했는지>

## 완료된 작업
- ...

## 산출물
- 파일 경로 1
- 파일 경로 2

## 다음 작업자에게 전달할 것
- API 스펙, 데이터 형식, 알려진 이슈 등

## 미완 / 알려진 이슈
- ...
```

이 핸드오프 파일은 다음 sub-agent의 컨텍스트가 됩니다. 본인 머릿속만으로 다음 단계로 넘기지 마세요.

## 검증 원칙

- 백엔드 작업 후: `python manage.py runserver` + 해당 API curl 테스트
- 프론트 작업 후: `npm run dev` + 브라우저 확인
- 통합 작업 후: 실제 사용 시나리오 1회 수행 (예: 메인 → 동네 클릭 → 상세 → 비교)
- 무언가 작동하지 않으면 sub-agent 호출 전에 사용자에게 보고

## 사용자에게 질문해야 할 때

- 명세서/와이어프레임에 없는 결정이 필요할 때
- 기술 스택을 벗어나야 할 때
- 우선순위 변경이 필요할 때
- 마감 위협 상황일 때

추측해서 진행하지 말고 물어보세요.
