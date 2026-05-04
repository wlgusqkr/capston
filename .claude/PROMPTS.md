# 작업 지시 프롬프트 모음

이 문서는 사용자(개발자)가 Claude Code 메인 세션에서 단계별로 던질 프롬프트입니다. 각 프롬프트는 메인 코디네이터에게 주는 지시이며, 코디네이터가 적절한 sub-agent에게 위임합니다.

**원칙**: 한 단계가 끝나면 직접 검증 → git commit → 다음 단계.

---

## 0단계: 컨텍스트 적재 (매 세션 시작 시)

```
명세서를 읽어줘.

1. CLAUDE.md
2. docs/SPEC.md (전체)
3. docs/wireframes/ 안에 있는 이미지 파일 목록 확인

다 읽고 나서 다음을 한 줄씩 답해줘:
- 프로젝트 한 줄 정의
- 기술 스택
- 현재 단계 (docs/handoff/ 의 가장 최근 파일 기준)
- 다음 작업 후보 (우선순위 순)

준비 완료하면 "다음 지시 대기"라고 답하고 멈춰.
```

---

## 1단계: 프로젝트 셋업 (메인 에이전트가 직접 수행)

```
프로젝트 초기 셋업을 진행해줘. sub-agent 위임 없이 직접.

작업 내용:
1. 디렉토리 구조 생성 (명세서 섹션 12 참고)
   - backend/ (Django)
   - frontend/ (Vite + React + TS)
   - docs/handoff/
2. .gitignore (Python + Node.js 표준)
3. README.md 1페이지 (프로젝트 개요만)
4. backend/.env.example, frontend/.env.example
5. docker-compose.yml (PostgreSQL + PostGIS만 우선)

완료 후:
- git init && 초기 커밋
- 각 디렉토리 구조를 ls로 확인해서 보고
- "1단계 완료, 다음 지시 대기"라고 답해

질문 있으면 작업 전에 물어봐.
```

---

## 2단계: 디자인 시스템 베이스 구축

```
@design-system-keeper 에게 위임:

작업: 디자인 시스템 토큰과 베이스 컴포넌트를 구축한다.

읽을 것:
- docs/SPEC.md 섹션 4 (디자인 시스템 전체)
- docs/wireframes/ 모든 이미지

만들 것:
1. frontend/src/styles/tokens.css — 모든 CSS variable
2. frontend/src/styles/globals.css — reset + Pretendard 폰트 import
3. frontend/src/components/ui/ 안에:
   - Button.tsx (primary/secondary/ghost, 3 sizes)
   - Card.tsx (default/inset variant)
   - Badge.tsx (success/warning/danger/info/neutral)
   - Score.tsx (큰 숫자 + 단위 + 선택적 delta)
   - Input.tsx, Select.tsx, Slider.tsx
   - Modal.tsx (반투명 백드롭)
   - index.ts (barrel export)
4. 라이트/다크 모드 둘 다 작동
5. 각 컴포넌트 파일 상단에 사용 예시 주석

완료 후:
- handoff 문서 docs/handoff/YYYYMMDD-design-foundation.md 작성
- git commit (feat: design system foundation)
- 결과 보고

질문 있으면 작업 전에 물어봐.
```

---

## 3단계: 백엔드 기초 + Dong 모델

```
@backend-engineer 에게 위임:

작업: Django 프로젝트 초기화 + Dong 모델 + 행정동 GeoJSON 적재 + 첫 API 엔드포인트.

읽을 것:
- docs/SPEC.md 섹션 9, 10, 12, 14
- docs/handoff/ 가장 최근 파일

만들 것:
1. Django 프로젝트 생성, GeoDjango 설정, PostgreSQL/PostGIS 연결
2. apps/neighborhoods/ 앱 생성, Dong 모델 정의 (명세서 10번)
3. 마이그레이션 생성/적용
4. 행정동 GeoJSON 적재용 management command
   (예: python manage.py load_dongs path/to/seoul_dongs.geojson)
   GeoJSON은 사용자가 별도 제공 — 없으면 더미 5개로 시작
5. 첫 API: GET /api/dongs/scores
   - 쿼리 파라미터: w_rent, w_amenity, w_transit (default 33/33/34)
   - response: [{slug, name, gu, score, lat, lng}, ...]
   - 점수는 더미값(고정 또는 random)으로 시작 — 진짜 점수는 나중에
6. CORS 설정 (django-cors-headers)
7. requirements.txt

완료 후:
- python manage.py runserver 실행
- curl로 /api/dongs/scores 응답 확인
- handoff 문서 작성
- git commit
- 결과 보고

추가 지시:
- 설정 분리 패턴 사용: config/settings/{base,local,production}.py
- django-environ으로 .env 관리
- 커스텀 User 모델 미리 설정 (apps.users.User)
- django-allauth 추가 (카카오 소셜 로그인용)
- pre-commit 설정 (Black, isort, ruff)
- pyproject.toml + uv 사용

참고: cookiecutter-django의 패턴을 따라하되, 명세서 섹션 12의 폴더 구조 유지

질문:
- GeoJSON 파일 경로?
- DB 비밀번호는 .env로?
```

---

## 4단계: 프론트 메인 지도

```
@frontend-engineer 에게 위임:

작업: 메인 지도 화면 구현 (명세서 섹션 6.1)

읽을 것:
- docs/SPEC.md 섹션 4, 6.1, 8, 9, 12
- docs/wireframes/main_map.png (또는 해당 이미지)
- docs/handoff/ 디자인 시스템과 백엔드 핸드오프

만들 것:
1. Vite + React + TS 프로젝트 셋업
2. 라우터 (React Router v6)
3. TanStack Query 설정
4. src/lib/api.ts (axios 또는 fetch 래퍼)
5. src/types/api.ts (Dong, Score 등 타입)
6. src/hooks/useDongs.ts (점수 가져오기)
7. src/routes/MainMap.tsx — 메인 지도 화면
8. src/components/Map/HeatMap.tsx — Leaflet 폴리곤 렌더링
9. src/components/Map/Sidebar.tsx — 좌측 280px 사이드바
   - 레이어 탭 (종합/전월세/생활/교통)
   - 가중치 슬라이더 3개
   - "5번 비교로 자동 추천" 버튼 (UI만, 클릭 시 alert)
   - 필터 (UI만)
10. src/components/Map/Legend.tsx — 하단 범례
11. 색상 매핑 함수: 점수 → 4단계 컬러 (lib/colors.ts)
12. 가중치 슬라이더 변경 시 클라이언트에서 색 재계산

확인 사항:
- 와이어프레임과 레이아웃 일치
- 디자인 토큰만 사용 (하드코딩 금지)
- /api/dongs/scores 호출 잘 됨
- 호버 시 툴팁
- 클릭 시 콘솔에 동 정보 (패널은 다음 단계)

완료 후:
- npm run dev로 실행 확인
- 스크린샷 제공
- handoff 작성
- git commit

질문 있으면 작업 전에 물어봐. 특히 백엔드 API의 정확한 응답 형식.
```

---

## 5단계: 동네 패널 (메인 지도 + 백엔드 동시 작업)

```
이번 단계는 두 sub-agent에 순차 위임:

먼저 @backend-engineer:

작업: 동네 패널용 API
- GET /api/dongs/:slug/summary
- response 형식은 명세서 섹션 6.2 참고
- 한 줄 요약은 룰 베이스로 (섹션 11.3)
- 더미 데이터로 시작해도 됨

완료 후 handoff. 다음으로 @frontend-engineer 위임 예정이라고 메모.

---

@backend-engineer 끝나면 @frontend-engineer:

작업: 동네 패널 컴포넌트 (명세서 섹션 6.2 + 와이어프레임 dong_panel.png)
- src/components/Map/DongPanel.tsx
- 우측에서 슬라이드 인 (CSS transform/transition)
- 명세서의 모든 섹션 (헤더, 종합 점수 카드, 핵심 지표 5개, 점수 구성, CTA 3개)
- 메인 지도에서 폴리곤 클릭 시 열림
- 닫기 버튼
- "자세히 보기" 클릭 시 /dong/:slug 로 라우트 이동 (다음 단계에서 구현)
- "비교에 추가" / "찜하기"는 토스트만 (실제 기능은 나중에)

완료 후 handoff + commit.
```

---

## 6단계: 동네 상세 페이지

```
백엔드 → 프론트 순차 작업.

@backend-engineer:
- GET /api/dongs/:slug/detail (명세서 섹션 6.3 참고)
- 모든 섹션 데이터 한 번에 (부동산, 편의시설, 교통, 리뷰, 비슷한 동네)
- 더미 데이터로 시작
- handoff

@frontend-engineer:
- src/routes/DongDetail.tsx
- 6개 섹션 컴포넌트 (HeroSection, RealEstateSection, AmenitySection, TransitSection, ReviewSection, SimilarDongsSection)
- Recharts로 꺾은선 + 가로 막대
- 와이어프레임 detail_page.png 준수
- handoff + commit
```

---

## 7단계: 선호 학습 온보딩

```
백엔드 → 프론트 순차.

@backend-engineer:
- POST /api/preference/submit (명세서 섹션 11.4)
- scipy.optimize로 가중치 추정
- 5번 비교 결과 → {w_rent, w_amenity, w_transit}
- GET /api/preference/pairs?count=5 — 비교용 동네 쌍 5개
- handoff

@frontend-engineer:
- Modal로 구현 (명세서 섹션 6.5)
- 와이어프레임 preference_onboarding.png 준수
- 진행도 표시 + 비교 카드 2개 + "둘 다 별로"
- 5번 완료 후 결과 표시 → 메인 지도 슬라이더 자동 이동
- 메인 지도 사이드바 "5번 비교로 자동 추천" 버튼과 연결
- handoff + commit
```

---

## 8단계: 동네 비교

```
@backend-engineer:
- GET /api/compare?slugs=A,B,C
- handoff

@frontend-engineer:
- src/routes/Compare.tsx
- 와이어프레임 compare.png
- 표 형태, 같은 지표 중 가장 좋은 값에 청록 강조
- 동네 패널의 "비교에 추가" 버튼과 연결 (URL 파라미터 누적)
- handoff + commit
```

---

## 9단계 (시간 남으면): 마이페이지 + 카카오 로그인

```
이 단계는 시간 남을 때만. 발표에 꼭 필요하지 않음.

@backend-engineer:
- django-allauth 카카오 설정
- /api/users/me, /api/users/me/favorites, /api/users/me/reviews

@frontend-engineer:
- src/routes/Login.tsx (카카오 버튼 하나)
- src/routes/MyPage.tsx (와이어프레임 mypage.png)
- 인증 상태 관리 (localStorage 가능, 학부 프로젝트 수준에서)
```

---

## 10단계 (보너스): 실제 데이터 적재

```
@data-pipeline 에게 위임:

작업: 공공데이터 API에서 실제 데이터 수집

순서대로:
1. 행정동 GeoJSON (이미 있으면 스킵)
2. 법정동 → 행정동 매핑 테이블 구축 (행안부 코드 기준)
3. 전월세 실거래가 (3종류) → 최근 3~12개월
4. 소상공인 편의시설 → 행정동별 카테고리별 카운트
5. 지하철역 위치 + 행정동별 가까운 역 3개 사전 계산
6. 버스 정류장 → 행정동별 카운트
7. 점수 계산 (rent/amenity/transit) → Dong 모델 업데이트

각 단계마다 handoff 작성. 한 번에 다 하지 말고 단계별로.

API 키 필요한 거 있으면 미리 알려줘.
```

---

## 11단계: 발표 리허설 + 버그 수정

```
이 단계는 sub-agent 위임 X. 메인 코디네이터가 직접.

작업:
1. 명세서 섹션 13의 발표 시나리오를 따라 실제 사용 시나리오 1회 수행
2. 막히는 곳, 어색한 곳, 버그 리스트업
3. 우선순위 정해서 수정
4. 데모용 더미 데이터 정리 (이상한 값 없게)
5. README.md 업데이트 (실행 방법, 발표 가이드)

각 버그는 적절한 sub-agent에게 위임해서 수정.
```

---

## 응급 상황별 프롬프트

### "사용자가 만든 결정을 바꾸고 싶어"

```
명세서 섹션 [번호] 의 [내용]을 변경하고 싶어.
새로운 내용: [...]

영향 받는 파일과 작업 리스트업해줘. 그 다음 어느 sub-agent들에게 어떤 순서로 위임할지 계획만 세우고, 내 승인 받기 전엔 실행하지 마.
```

### "버그 발견"

```
[버그 설명]

증상: ...
재현 단계: ...
관련 파일 (추측): ...

원인 분석부터. 수정은 분석 결과 보고 결정.
```

### "API 응답이 프론트랑 안 맞아"

```
프론트가 기대하는 형식: ...
백엔드가 보내는 형식: ...

명세서 섹션 9를 기준으로 누가 틀렸는지 판단하고 그쪽을 수정. 양쪽 다 명세서랑 다르면 명세서를 따르도록 둘 다 수정.
```

### "시간이 부족해"

```
오늘이 [날짜]. 마감 6/5까지 남은 시간 [N일].
지금 완성된 것: ...
미완성: ...

명세서 섹션 7의 우선순위 기준으로, 지금 시점에 무엇을 빼고 무엇을 남겨야 발표 가능한 데모가 나오는지 판단해줘. 추천만, 실행은 내 승인 후.
```
