# 슬기로운 자취생활 — Claude Code 셋업 가이드

이 폴더의 파일들을 본인 프로젝트 루트에 복사하면 Claude Code가 sub-agent들과 함께 작업할 준비가 끝납니다.

## 폴더 구조

```
your-project/
├── CLAUDE.md                       ← 메인 코디네이터 지시사항
├── .claude/
│   └── agents/
│       ├── backend-engineer.md     ← Django, DRF, GeoDjango 전문
│       ├── frontend-engineer.md    ← React, TS, Leaflet, UI 전문
│       ├── design-system-keeper.md ← 디자인 토큰, 베이스 컴포넌트 전문
│       └── data-pipeline.md        ← 공공데이터 수집, 점수 계산 전문
└── docs/
    ├── SPEC.md                     ← 기존에 만든 명세서 (이전 작업물)
    ├── PROMPTS.md                  ← 단계별 작업 지시 프롬프트 모음
    ├── wireframes/                 ← 와이어프레임 이미지들 (수동 추가)
    └── handoff/                    ← sub-agent 간 핸드오프 (자동 생성)
```

## 셋업 순서

### 1. 프로젝트 폴더 만들기

```bash
mkdir slgi && cd slgi
git init
```

### 2. 이 폴더의 파일들을 복사

```bash
cp -r .claude ./
cp CLAUDE.md ./
mkdir -p docs
cp docs/PROMPTS.md ./docs/
```

### 3. 명세서 추가

이전 대화에서 받으신 `slgi_design_spec.md` 를 `docs/SPEC.md` 로 저장.

### 4. 와이어프레임 이미지 추가

위 채팅에서 만든 와이어프레임 5개를 스크린샷 또는 export해서 `docs/wireframes/` 에 저장:

- `main_map.png` — 메인 지도 + 사이드바
- `dong_panel.png` — 동네 패널
- `detail_page.png` — 동네 상세
- `compare.png` — 동네 비교
- `preference_onboarding.png` — 선호 학습 모달
- `mypage.png` — 마이페이지

(파일명은 그대로 유지하면 PROMPTS.md의 지시와 일치합니다.)

### 5. Claude Code 실행

```bash
claude
```

세션이 시작되면 sub-agent들이 자동으로 로드됩니다. 확인:

```
/agents
```

4개의 agent가 보여야 합니다. 안 보이면 세션 재시작.

### 6. 첫 작업 시작

`docs/PROMPTS.md` 의 0단계 프롬프트를 메인 세션에 붙여넣기. 컨텍스트가 적재됩니다.

그 다음 1단계 프롬프트를 던지면 셋업이 시작됩니다.

## 작업 진행 시 체크리스트

매 단계마다:

- [ ] 단계 시작 전 PROMPTS.md에서 해당 단계 프롬프트 확인
- [ ] 메인 세션에 프롬프트 붙여넣기
- [ ] 메인이 sub-agent에게 위임하는 것 확인
- [ ] sub-agent 작업 완료 후 직접 검증 (curl, 브라우저, 등)
- [ ] handoff 파일이 docs/handoff/ 에 생성되었는지 확인
- [ ] git commit (sub-agent가 안 했으면 직접)
- [ ] 다음 단계 진행

## 트러블슈팅

### sub-agent가 호출되지 않음

CLAUDE.md의 "Sub-agent 위임 규칙" 섹션을 메인 에이전트가 인지하고 있는지 확인. 새 세션이라면 컨텍스트 적재(0단계)부터 다시.

명시적으로 위임을 강제하려면 프롬프트에 `@agent-backend-engineer` 처럼 멘션:

```
@agent-backend-engineer 에게 다음 작업을 위임해줘:
[작업 내용]
```

### sub-agent가 명세서를 안 읽음

agent 정의 파일의 "Required Reading" 섹션이 읽히도록, 작업 프롬프트에서 명시적으로 지시:

```
명세서 섹션 9를 먼저 읽고 시작해줘.
```

### 핸드오프가 누락됨

agent 정의 파일에 핸드오프 규칙이 있지만, 가끔 잊습니다. 작업 끝날 때:

```
docs/handoff/ 에 핸드오프 문서 작성하고 끝내줘.
```

### 컨텍스트가 너무 길어졌을 때

새 세션을 시작하고 0단계 (컨텍스트 적재)부터 다시. 프로젝트 상태는 `docs/handoff/` 의 파일들로 복원됩니다.

또는 `/clear` 명령으로 컨텍스트만 리셋.

### sub-agent끼리 정보 공유가 안 될 때

sub-agent는 서로 직접 통신할 수 없습니다. 메인 코디네이터가 핸드오프 파일을 읽어서 다음 sub-agent에게 전달해야 합니다. 메인 세션에서:

```
이전 backend-engineer가 만든 API의 응답 형식을 frontend-engineer에게 전달해야 해.
docs/handoff/ 의 가장 최근 backend 핸드오프를 읽고, 거기 있는 API 정보를 다음 frontend 작업에 포함해줘.
```

## 주의사항

- **절대 4개 sub-agent를 동시에 돌리지 마세요.** 컨텍스트 충돌 + 토큰 낭비. 순차 위임이 정석입니다.
- **명세서를 sub-agent가 매번 읽도록 강제하세요.** 컨텍스트가 비어 있으면 환각 시작됩니다.
- **단계마다 직접 검증하세요.** Claude Code도 잘못 만들 수 있습니다. 코드 한 줄도 확인 없이 다음 단계로 가지 마세요.
- **git commit을 잘 하세요.** sub-agent가 망쳤을 때 되돌릴 수 있어야 합니다.

## 다음

PROMPTS.md 0단계로 시작하세요.
