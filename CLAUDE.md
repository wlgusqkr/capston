# 자취맵

서울 자취 입문자를 위한 공공데이터 기반 동네 대시보드. 마감 2026.06.05.

## 현재 진행 상태

- **모드**: 프론트엔드 + 디자인 집중. 백엔드/데이터는 휴면 — 새 API가 필요할 때만 사용자 보고 후 별도 세션으로 호출.
- **완료**: 디자인 시스템 일부 (토큰/베이스 컴포넌트 부분 구축), 메인 지도 (`/`), 동네 패널, 동네 상세, 동네 비교, 마이페이지.
- **다음**: 대시보드 화면(`/dashboard`) 신규 개발. **`.claude/SPEC.md`가 최신 기획서.**
- **CSS 방식**: Tailwind v4 + 디자인 토큰 매핑. 현재 미적용이며 `design-system-keeper`가 Phase 0에서 셋업.

새 세션 시작 시 읽는 순서: `.claude/SPEC.md` → `.claude/STATE.md` → 본 파일.

## 시각·인터랙션 톤

대학생 타겟. 전문가용 대시보드 아님. **깔끔하고 한눈에 보기 편하게**, 위젯은 플로팅 카드 느낌으로 배치, 그래프는 알록달록한 컬러 + 풍부한 애니메이션 (게이지 차오름·카운트업·도넛 회전·라인 그려짐). 자세한 톤·인터랙션 규칙은 SPEC.md 섹션 1.3.

## 기술 스택 (확정 — 변경 금지)

- 백엔드: Django + DRF + GeoDjango + PostgreSQL/PostGIS
- 프론트: React + Vite + TypeScript + Tailwind CSS v4
- 지도: Leaflet
- 차트: Recharts (내장 애니메이션 적극 활용)
- 배포: 모놀리식 단일 서버

## 절대 하지 말 것

- 마이크로서비스 분리 (Django 단일 서비스)
- Kafka, Elasticsearch, Logstash 도입
- 회원 자체 가입 (카카오 소셜만)
- 과도한 추상화 (학부 프로젝트 규모에 맞게)
- `localStorage` / `sessionStorage` 사용 (메모리 상태로 처리)
- 기존 메인 지도 / 동네 패널 / 상세 / 비교와 평행한 구현 만들기 — 새 Button, Card, 데이터 훅 등 만들기 전에 `frontend/src/components/`와 `ui/`에서 grep 먼저
- 프론트 작업 중 새 백엔드 API가 필요할 때 그 자리에서 백엔드 코드 손대기 — 멈추고 데이터 스펙 정리해서 사용자에게 보고
- **DB 스키마 변경** — 새 컬럼/테이블/인덱스 필요 시 즉시 멈추고 사용자에게 요청
- **맵뷰(`/`, `routes/MainMap.tsx`, `components/Map/*`) 변경** — 히트맵 레이어 옵션 확장(SPEC §6.2)만 예외이며, 그것도 사용자 사전 승인 후
- `docs/`는 일단 무시. legacy 폴더이므로 참고할 필요 없음. **현재 기획 진실은 `.claude/SPEC.md`.**
- 애니메이션 라이브러리 (Framer Motion 등) 도입 — CSS transition + Recharts 내장 + keyframes로 해결

## Sub-agent 위임 규칙

이 프로젝트는 5개의 sub-agent와 함께 작업합니다. **현재 활성 에이전트는 `design-system-keeper`, `frontend-engineer`, `design-qa-reviewer` 3개.** `backend-engineer`와 `data-pipeline`은 휴면이며, 프론트 작업 중 새 API가 필요한 경우에만 사용자 보고 후 별도 세션으로 호출합니다.

- `design-system-keeper` — Tailwind v4 셋업, CSS variables, 카테고리별 컬러 토큰, 히트맵 컬러 매핑, 공통 UI 프리미티브 (Button, Card, Badge, Gauge 등), shimmer 검색창. 모든 UI 작업의 기반.
- `frontend-engineer` — React, TypeScript, Vite, Leaflet 지도, Recharts, 화면별 컴포넌트 및 API 연동, AI 사이드 패널 shell.
- `design-qa-reviewer` — 다른 에이전트 작업물의 일관성·규칙·톤 검토. 코드 작성 없음.
- `backend-engineer` (휴면) — Django, DRF, GeoDjango, PostGIS, API 엔드포인트. DB 스키마는 절대 변경 안 함.
- `data-pipeline` (휴면) — 공공데이터 수집, 점수 계산. 현재 사용 안 함.

위임 원칙:
- 한 번에 하나의 화면 또는 Phase를 완성.
- 디자인 시스템 확장이 필요한 새 화면은 `design-system-keeper` 먼저, 그 다음 `frontend-engineer`.
- 각 sub-agent는 작업 끝에 `.claude/STATE.md` 자기 섹션 갱신 + `.claude/CHANGELOG.md` 한 줄 append + 인라인 요약 (3~5줄) 출력.
- 단계 종료 시 항상 git commit. conventional commits (feat:, fix:, refactor: 등).

## 핸드오프 시스템

에이전트 간 컨텍스트 전달은 두 파일로:

### `.claude/SPEC.md` (기획 진실 — 변경 빈도 낮음)

전체 기획·아키텍처·위젯 카탈로그·Phase 분리. 사용자가 관리. 에이전트는 읽기만. 본 SPEC을 거스르는 작업이 필요해 보이면 사용자에게 보고하고 SPEC 수정 요청.

### `.claude/STATE.md` (현재 상태 — 메인 핸드오프)

각 에이전트가 자기 섹션을 덮어쓰기. 히스토리 없음.

구조:

```markdown
# 자취맵 — 프로젝트 상태

마지막 업데이트: YYYY-MM-DD

## Project Status
(메인 에이전트 갱신: 현재 Phase, 활성 모드, 우선순위)

## Design System
(design-system-keeper 갱신: 정의된 토큰, 빌드된 프리미티브, Tailwind 상태,
공개된 ui/index.ts 내용, 알려진 갭)

## Frontend
(frontend-engineer 갱신: 빌드된 화면/라우트, 사용 중인 API 엔드포인트,
데이터 훅 목록, 알려진 이슈)

## Backend (휴면)
(backend-engineer 갱신: 노출 중인 API 엔드포인트, 모델 요약. 휴면이면 마지막 상태 유지)

## Data (휴면)
(data-pipeline 갱신: 수집된 데이터 종류, 마지막 갱신일. 휴면이면 마지막 상태 유지)

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

```markdown
# 변경 이력

## 2026-05-13
- 대시보드 라우트 추가, TopNav AI 검색창 UI shell 구현
- Tailwind v4 셋업 완료
```

규칙:
- 작업 끝에 오늘 날짜 헤더 아래 한 줄 append. 헤더 없으면 생성.
- prefix 없이 자연스러운 한국어. 발표 자료에 그대로 들어갈 수 있는 톤.
- 코드 디테일이 아니라 "무엇이 추가/변경됐는지" 사용자 관점.

## 코드 스타일

- TypeScript strict mode
- Python: Black + isort + mypy (가능하면)
- 커밋 메시지: conventional commits
- 파일 경로는 항상 절대 경로로 명시
- 컴포넌트 스타일은 `className` 인라인 (Tailwind). 별도 `.css` 파일 만들지 않음.

## 검증 원칙

- 프론트 작업 후: `npm run dev` 브라우저 확인 + `npm run build` (타입 에러 체크)
- 디자인 시스템 작업 후: 기존 화면 (메인 지도, 동네 패널, 상세, 비교)에서 깨지는 곳 없는지 확인
- 맵뷰 변경 금지를 어기지 않았는지 `git diff frontend/src/routes/MainMap.tsx frontend/src/components/Map/` 확인 (히트맵 레이어 확장 작업 제외)
- 무언가 작동하지 않으면 sub-agent 호출 전에 사용자에게 보고

## 사용자에게 질문해야 할 때

- 디자인 결정이 필요할 때 (색, 사이즈, 레이아웃 등) — 추측하지 말고 물어보기
- 기술 스택을 벗어나야 할 때
- 우선순위·Phase 변경이 필요할 때
- 마감 위협 상황일 때
- 새 백엔드 API가 필요할 때
- **DB 스키마 변경이 필요할 때 (사용자만 결정)**
- **맵뷰 변경이 필요할 때 (히트맵 레이어 확장 외에는 원칙적으로 금지, 그것도 사전 승인)**

추측해서 진행하지 말고 물어보세요.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore