# 자취맵

서울 자취 입문자를 위한 공공데이터 기반 동네 대시보드. 마감 2026.06.05.

## 현재 진행 상태

- **모드**: 프론트엔드 + 디자인 집중. 백엔드/데이터는 휴면 — 새 API가 필요할 때만 사용자 보고 후 별도 세션으로 호출.
- **완료**: 디자인 시스템 일부 (토큰/베이스 컴포넌트 부분 구축), 메인 지도, 동네 패널.
- **다음**: 디자인 시스템 재정비 → 추가 화면 개발.
- **CSS 방식**: Tailwind + 디자인 토큰 매핑. 현재 미적용이며 `design-system-keeper`가 셋업 책임.

새 세션 시작 시 `.claude/STATE.md` 먼저 읽기.

## 기술 스택 (확정 — 변경 금지)

- 백엔드: Django + DRF + GeoDjango + PostgreSQL/PostGIS
- 프론트: React + Vite + TypeScript + Tailwind CSS
- 지도: Leaflet
- 차트: Recharts
- 배포: 모놀리식 단일 서버

## 절대 하지 말 것

- 마이크로서비스 분리 (Django 단일 서비스)
- Kafka, Elasticsearch, Logstash 도입
- 회원 자체 가입 (카카오 소셜만)
- 과도한 추상화 (학부 프로젝트 규모에 맞게)
- `localStorage` / `sessionStorage` 사용 (메모리 상태로 처리)
- 기존 메인 지도 / 동네 패널과 평행한 구현 만들기 — 새 Button, Card, 데이터 훅 등 만들기 전에 `frontend/src/components/`와 `ui/`에서 grep 먼저
- 프론트 작업 중 새 백엔드 API가 필요할 때 그 자리에서 백엔드 코드 손대기 — 멈추고 필요한 데이터 스펙 정리해서 사용자에게 보고
- `docs/`는 일단 무시. legacy 폴더이므로 참고할 필요 없음.

## Sub-agent 위임 규칙

이 프로젝트는 5개의 sub-agent와 함께 작업합니다. **현재 활성 에이전트는 `design-system-keeper`, `frontend-engineer`, `design-qa-reviewer` 3개.** `backend-engineer`와 `data-pipeline`은 휴면이며, 프론트 작업 중 새 API가 필요한 경우에만 사용자 보고 후 별도 세션으로 호출합니다.

- `design-system-keeper` — Tailwind 셋업, CSS variables, 컬러/타이포 토큰, 공통 UI 프리미티브 (Button, Card, Badge 등). 모든 UI 작업의 기반.
- `frontend-engineer` — React, TypeScript, Vite, Leaflet 지도, Recharts, 화면별 컴포넌트 및 API 연동.
- `design-qa-reviewer` — 다른 에이전트 작업물의 일관성/규칙 준수 검토. 코드 작성 없음.
- `backend-engineer` (휴면) — Django, DRF, GeoDjango, PostGIS, API 엔드포인트.
- `data-pipeline` (휴면) — 공공데이터 수집, 점수 계산.

위임 원칙:
- 한 번에 하나의 화면 또는 기능을 완성합니다.
- 디자인 시스템 확장이 필요한 새 화면은 `design-system-keeper` 먼저, 그 다음 `frontend-engineer`.
- 각 sub-agent는 작업 끝에 `.claude/STATE.md` 갱신 + `.claude/CHANGELOG.md` 한 줄 append + 인라인 요약 (3~5줄) 출력.
- 단계 종료 시 항상 git commit. conventional commits 형식 (feat:, fix:, refactor: 등).

## 핸드오프 시스템

에이전트 간 컨텍스트 전달은 두 파일로:

### `.claude/STATE.md` (메인 — 에이전트용)

현재 상태만 반영. 각 에이전트가 자기 섹션을 덮어쓰기. 히스토리 없음.

구조:

```markdown
# 자취맵 — 프로젝트 상태

마지막 업데이트: YYYY-MM-DD

## Project Status
(메인 에이전트 갱신: 현재 단계, 활성 모드, 우선순위)

## Design System
(design-system-keeper 갱신: 정의된 토큰, 빌드된 프리미티브, Tailwind 상태,
공개된 ui/index.ts 내용, 알려진 갭)

## Frontend
(frontend-engineer 갱신: 빌드된 화면/라우트, 사용 중인 API 엔드포인트,
데이터 훅 목록, 알려진 이슈)

## Backend (휴면)
(backend-engineer 갱신: 노출 중인 API 엔드포인트, 모델 요약.
휴면이면 마지막 상태 유지)

## Data (휴면)
(data-pipeline 갱신: 수집된 데이터 종류, 마지막 갱신일.
휴면이면 마지막 상태 유지)

## QA Notes
(design-qa-reviewer 갱신: 미해결 블로커, 일관성 관찰)

## Open Questions / Decisions Pending
(누구나 추가 가능: 결정 대기 중인 항목)
```

규칙:
- 자기 섹션만 갱신. 다른 섹션 건드리지 않음.
- 섹션 내용은 덮어쓰기 — 히스토리 X.
- 섹션이 없으면 새로 만들기.
- 새 결정/이슈가 자기 섹션 범위를 벗어나면 "Open Questions / Decisions Pending"에 추가.

### `.claude/CHANGELOG.md` (서브 — 발표용)

시간순 append-only 로그. 한국어. 짧게.

구조:

```markdown
# 변경 이력

## 2026-05-12
- 디자인 토큰 셋업: 컬러 팔레트, 타이포 스케일 정의
- Button, Card 프리미티브 추가

## 2026-05-11
- 메인 지도 동네 패널 슬라이드 인 애니메이션 추가
```

규칙:
- 작업 끝에 오늘 날짜 헤더 아래 한 줄 append.
- 오늘 날짜 헤더가 없으면 생성.
- 한 줄은 prefix 없이 자연스러운 한국어. 발표 자료에 그대로 들어갈 수 있는 톤.
- 코드 디테일이 아니라 "무엇이 추가/변경됐는지" 사용자 관점.

## 코드 스타일

- TypeScript strict mode
- Python: Black + isort + mypy (가능하면)
- 커밋 메시지: conventional commits
- 파일 경로는 항상 절대 경로로 명시

## 검증 원칙

- 프론트 작업 후: `npm run dev` 브라우저 확인 + `npm run build` (타입 에러 체크)
- 디자인 시스템 작업 후: 기존 화면 (메인 지도, 동네 패널)에서 깨지는 곳 없는지 확인
- 무언가 작동하지 않으면 sub-agent 호출 전에 사용자에게 보고

## 사용자에게 질문해야 할 때

- 디자인 결정이 필요할 때 (색, 사이즈, 레이아웃 등) — 추측하지 말고 물어보기
- 기술 스택을 벗어나야 할 때
- 우선순위 변경이 필요할 때
- 마감 위협 상황일 때
- 새 백엔드 API가 필요할 때

추측해서 진행하지 말고 물어보세요.