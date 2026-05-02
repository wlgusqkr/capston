# 슬기로운 자취생활 — 디자인 & 화면 명세서

> **목적**: 이 문서는 claude code에게 프론트엔드 작업을 지시하기 위한 디자인 시스템과 화면별 명세서입니다.
> **상태**: 와이어프레임 단계. 실제 픽셀 단위 디자인은 구현하면서 다듬습니다.
> **마감**: 2026.06.05 발표

---

## 1. 프로젝트 한 줄 정의

서울에서 자취를 처음 시작하는 대학생이 방을 보러 가기 전에 동네를 먼저 이해할 수 있는 공공데이터 기반 대시보드.

## 2. 핵심 차별점

- **공공데이터 기반 객관적 점수**: 부동산, 편의시설, 교통, 안전 데이터 통합
- **사용자 가중치 조절**: 슬라이더로 직접 조절 또는 5번 비교로 자동 학습
- **2D 히트맵 + (시간 되면) 3D 시각화**: 도시 데이터 대시보드 정체성
- **자취생 리뷰**: 객관 데이터 + 실거주자 리뷰 결합

---

## 3. 기술 스택 (확정)

- **백엔드**: Django + DRF + GeoDjango (PostgreSQL + PostGIS)
- **프론트엔드**: React (Vite 추천) + TypeScript
- **지도**: Leaflet (2D 메인) → 시간 되면 deck.gl로 3D 추가
- **차트**: Recharts
- **데이터 수집**: 별도 Python 스크립트 (Django와 DB만 공유)
- **배포**: 모놀리식 단일 서버

서비스 분리 없음. 마이크로서비스 아님. AI 추론은 Django 안에서 처리.

---

## 4. 디자인 시스템

### 4.1 톤 & 정체성

두 정체성의 교차점:
- **도시 데이터 대시보드**: 전문성, 신뢰
- **슬기로운 자취생활**: 친근함, 따뜻함

중간보다 약간 데이터 쪽으로. 신뢰감이 결정 도구로 쓰이게 만드는 핵심.

구체적 적용:
- 레이아웃은 데이터 도구처럼 (격자, 정렬, 정보 위계)
- 카피는 친근하게 ("종합점수 78점" 대신 "필동, 자취하기 괜찮아요 78점")
- 색은 따뜻한 데이터 톤 (차가운 블루 대신 청록 + 따뜻한 오렌지 액센트)
- 일러스트는 빈 상태에만 (메인 화면에는 없음)

### 4.2 컬러 시스템

```
프라이머리: #0F6E56 (짙은 청록 - 브랜드, 메인 버튼, 액센트)
서브: #BA7517 (따뜻한 오렌지 - 강조, 알림)

중립 (텍스트, 보더, 배경):
  --gray-50: #F9F9F8
  --gray-100: #F1EFE8
  --gray-200: #D3D1C7
  --gray-400: #888780
  --gray-600: #5F5E5A
  --gray-900: #2C2C2A

데이터 시각화 (히트맵 4단계):
  낮음 (좋음/저렴): #378ADD (파랑)
  중간 1 (보통):   #1D9E75 (청록)
  중간 2 (애매):   #EF9F27 (오렌지)
  높음 (나쁨/비쌈): #E24B4A (빨강)

상태:
  성공: #1D9E75 (청록 계열)
  경고: #EF9F27 (앰버)
  위험: #E24B4A (레드)
  정보: #378ADD (블루)
```

다크모드 대응 필수. CSS variable로 관리.

### 4.3 타이포그래피

```
폰트: Pretendard (cdn.jsdelivr.net/gh/orioncactus/pretendard)
숫자에는 Tabular Nums 옵션 (font-variant-numeric: tabular-nums)

크기 / 굵기:
  H1 - 28px / 600 - 페이지 타이틀
  H2 - 22px / 600 - 섹션 타이틀
  H3 - 18px / 600 - 카드 타이틀
  숫자 강조 - 32~48px / 700 - 핵심 지표
  본문 - 15px / 400 - 일반 텍스트
  캡션 - 13px / 400 - 보조 정보, 라벨
  힌트 - 11px / 500 - 작은 라벨, 단위

라인 하이트: 1.5 (본문), 1.2 (헤딩, 숫자)
한글 letter-spacing: -0.01em (Pretendard 권장)
```

### 4.4 컴포넌트 시스템

**카드**
- 흰 배경, 1px 보더 (rgba(0,0,0,0.08))
- border-radius: 12px
- padding: 16~20px
- 그림자 없음 (플랫 디자인)

**버튼**
- 프라이머리: 청록 채움 + 흰 글자
- 세컨더리: 보더만 + 청록 글자
- 텍스트: 보더 X, 청록 글자만
- 높이: 40px (기본), 32px (작은 것), 48px (큰 것)
- border-radius: 8px

**배지**
- 작은 라벨, 의미별 색
- 충분/양호: 청록 배경 + 청록 텍스트
- 보통: 오렌지 배경 + 오렌지 텍스트
- 부족/위험: 빨강 배경 + 빨강 텍스트
- font-size: 11px, padding: 3px 8px, border-radius: 6px

**점수 표시**
- 큰 숫자 (28~40px) + 작은 단위 (12~14px) + 변화 화살표 (선택)
- 점수 색은 점수 구간에 따라 다름 (0~40 빨강, 40~70 오렌지, 70~100 청록)

**데이터 테이블 / 비교 표**
- 헤더 회색 배경 (--gray-100)
- 행 구분은 1px 보더
- 같은 지표 중 가장 좋은 값에 청록 강조 (font-weight: 500 + color: 청록)

**차트**
- Recharts 디폴트 스타일 오버라이드
- 회색 회피, 컬러 시스템 따르기
- 격자선 최소화, 레이블 명확히

**빈 상태**
- 작은 일러스트 (선택) + 안내 텍스트 + CTA 버튼
- 메인 화면에는 없음. 리뷰 없음, 검색 결과 없음 등에만.

---

## 5. 앱 전체 흐름

```
랜딩 (선택, 스킵 권장)
    ↓
메인 지도 (히트맵, 가중치 슬라이더) ────────────┐
    ↓ 동네 클릭                              │
동네 패널 (우측 슬라이드 인, 핵심 지표 5개)     │
    ↓ "자세히 보기"                          │
동네 상세 페이지 (전체 대시보드)               │
    ↓ "비교 추가" / "공유"                   │
동네 비교 (최대 3개 나란히)                   │
                                              │
가중치 슬라이더 옆 "5번 비교로 자동 추천"        │
    ↓                                         │
선호 학습 온보딩 (5번 비교) ──────────────────┘
    ↓ 완료
메인 지도로 자동 복귀, 가중치 자동 적용

부가 기능:
- 자취생 리뷰 (동네 상세 안)
- 동네 추천 (동네 상세 안, 임베딩 유사도)
- 마이페이지 (찜한 동네, 내 가중치, 내 리뷰)
- 로그인 (카카오 소셜만 추천)
```

핵심 동선 = 메인 지도 → 동네 패널 → 동네 상세. 사용자 80%가 이 길로만 다님.

---

## 6. 화면별 명세

### 6.1 메인 지도 (`/`)

#### 레이아웃
- 좌측 사이드바 280px 고정
- 메인 영역 = 2D 히트맵 풀스크린
- 상단 헤더 (로고, 검색창, 로그인)
- 하단 좌측 색 범례 (낮음 → 높음 그라디언트)
- 우측 상단 줌 컨트롤 (+/−/리셋)
- 우측 하단 "2D ↔ 3D" 토글 (3D는 시간 되면 추가)

#### 좌측 사이드바 구성 (위에서 아래로)
1. **레이어 탭**: 종합 (선택) / 전월세 / 생활시설 / 교통
2. **가중치 슬라이더**: 전월세 / 생활시설 / 교통 (각 0~100%, 합 100%)
3. **자동 추천 버튼**: "5번 비교로 자동 추천 →" (선호 학습 온보딩 진입)
4. **높이로 표현 (3D 모드일 때만)**: 평균 월세 / 편의시설 수 / 거래량 / 평평하게
5. **필터**: 대학교 근처만 / 월세 50만원 이하 등

#### 인터랙션
- 마우스 호버 → 작은 툴팁 (동네 이름, 종합 점수)
- 클릭 → 우측 동네 패널 슬라이드 인 (지도는 약간 어두워짐)
- 가중치 슬라이더 변경 → 전체 색상 부드럽게 transition (300ms)
- 검색 → 동네 자동완성, 선택 시 카메라 줌 + 패널 자동 오픈

#### 첫 진입 시 가중치 기본값
**전월세 33% / 생활시설 33% / 교통 34%**. 균등 시작. 강제 모달 없음. 사용자가 만지작거리다가 자연스럽게 자동 추천 버튼 누르도록.

#### 데이터 요청
- `GET /api/dongs/scores?w_rent=33&w_amenity=33&w_transit=34` → 426개 행정동 점수 리스트
- GeoJSON은 정적 파일로 (`/static/seoul_dongs.geojson`) 한 번만 로드

---

### 6.2 동네 패널 (메인 지도 위 슬라이드 인)

#### 레이아웃
- 우측에서 슬라이드 인, 폭 380~420px
- 내부 스크롤 가능
- 닫기 (×) 우측 상단

#### 섹션 (위에서 아래로)
1. **헤더**: "{구}" (작게) + "{동}" (크게) + 닫기 버튼
2. **종합 점수 카드** (회색 배경)
   - 큰 숫자 (36px) + "/ 100"
   - 한 줄 요약 ("교통 좋고 생활시설 부족, 자취 입문자에게 추천")
3. **핵심 지표 5개** (테이블 형태)
   - 평균 월세 / 가까운 역 / 편의시설 / 자취생 비율 / 안전 지수
4. **점수 구성** (가로 막대 3개)
   - 교통 / 전월세 / 생활시설 각각 0~100 막대
5. **CTA 버튼**
   - "자세히 보기" (프라이머리, 청록 채움)
   - "비교에 추가" / "찜하기" (세컨더리, 가로 2분할)

#### 인터랙션
- "자세히 보기" 클릭 → `/dong/{동이름}` 라우트 이동 (URL 변경)
- "비교에 추가" 클릭 → 좌측 사이드바 또는 토스트로 "비교 목록에 추가됨"
- "찜하기" 클릭 → 로그인 안 되어 있으면 로그인 모달

#### 한 줄 요약 자동 생성 규칙
점수 구성에 따라 템플릿 매칭. 예시:
- 교통 80+, 생활 60-, 전월세 70+ → "교통 좋고 생활시설 부족"
- 교통 60-, 생활 80+, 전월세 70+ → "조용한 편이지만 생활시설 풍부"
- 셋 다 70+ → "자취 입문자에게 추천"

LLM 활용 가능 (Claude API 호출, 비용 적음). 또는 룰 베이스로 시작.

---

### 6.3 동네 상세 페이지 (`/dong/{동이름}`)

#### 레이아웃
- 풀스크린, 상단 헤더 (브레드크럼: ← 지도로 / 필동)
- 섹션 단위로 세로 스크롤
- 모든 섹션 풀 폭 (좌우 padding 24px)

#### 섹션 (위에서 아래로)

**섹션 1 — 히어로**
- 좌측: 동 이름 (크게) + 종합 점수 + "서울 평균 +12%" + 한 줄 요약
- 우측: 미니 지도 (280px 정사각형, 동 위치 핀)

**섹션 2 — 부동산 시세**
- 상단: "부동산 시세" 제목 + 기간 토글 (3개월/6개월/12개월)
- 중간 좌: 월별 평균 월세 추이 (꺾은선, 다가구/다세대/오피스텔)
- 중간 우: 보증금 구간별 평균 월세 (가로 막대, 0/500/1000/2000/3000만)
- 하단: 최근 실거래 5건 (테이블: 날짜/유형/면적/보증금/월세)

**섹션 3 — 편의시설**
- 카테고리별 카드 그리드 (2열)
- 각 카드: 카테고리명 + 개수 + 밀도 + 충분/보통/부족 배지
- 카테고리: 편의점 / 카페 / 음식점 / 마트 / 병원·약국 / 스터디카페 / 세탁소 / 올리브영
- 백분위 기준: 상위 33% 충분, 중간 33% 보통, 하위 33% 부족 (서울 전체 기준)

**섹션 4 — 교통**
- 좌측: 가까운 지하철역 3개 리스트 (1위는 강조)
  - 각 항목: 순위 배지 / 역명·호선 / 도보 거리·시간
- 우측: 버스 정류장 카드 (큰 숫자: 정류장 수 + 작은 숫자: 노선 수)

**섹션 5 — 자취생 리뷰**
- 평균 별점 + 리뷰 개수
- 대표 리뷰 1~3개 (제목 + 작성자 학교 + 별점 + 본문)
- "전체 리뷰 보기 →" CTA

**섹션 6 — 비슷한 동네**
- 임베딩 유사도 기반 추천 3개 (시간 남으면 구현)
- 카드 그리드 (3열): 구 / 동 이름 / 유사도 %

**하단 고정 CTA 바 (선택)**
- "비교에 추가" / "찜하기" / "공유"

#### 데이터 요청
- `GET /api/dongs/{동이름}/detail` → 모든 섹션 데이터 한 번에
- 또는 섹션별 lazy loading (스크롤 진입 시)

---

### 6.4 동네 비교 (`/compare?dongs={동1},{동2},{동3}`)

#### 레이아웃
- 풀스크린, 상단 헤더
- 표 형태: 좌측 첫 열 = 지표명, 그 외 열 = 동네 (최대 3개)
- 각 열 헤더에 동 이름 + 제거 (×)
- 최고 점수 동네는 헤더에 "최고 점수" 배지 + 청록 강조

#### 비교 지표 (행)
1. 종합점수
2. 평균 월세
3. 통학 시간 (지하철 기준)
4. 편의시설 (충분/보통/부족 배지)
5. 자취생 비율
6. 안전 지수
7. 자취생 평점 (별점 + 리뷰 수)

#### 하이라이트 규칙
같은 지표 중 가장 좋은 값에 `font-weight: 500` + `color: 청록`. 숫자는 작을수록 좋은 것 (월세, 통학 시간)도 있고 클수록 좋은 것 (점수, 자취생 비율)도 있으니 지표별 방향 정의 필요.

#### 하단
- "+ 동네 추가하기" 버튼 (3개 미만일 때 표시)
- "공유" 버튼 (URL 복사)

---

### 6.5 선호 학습 온보딩 (모달)

#### 진입 트리거
- 메인 지도 좌측 사이드바 "5번 비교로 자동 추천 →" 버튼
- 또는 첫 방문 사용자에게 자동 노출 (선택, 거부 가능)

#### 레이아웃
- 화면 전체 어두워짐 (반투명 백드롭)
- 중앙에 모달 카드 (max-width: 600px)

#### 모달 구성
1. **상단**: 진행도 ("3 / 5") + "건너뛰기"
2. **진행 바**: 0~100% 청록 막대
3. **질문**: "어디가 더 끌리시나요?" (큰 글씨)
4. **부제**: "실제 데이터 기반 비교 · 정답은 없어요"
5. **비교 카드 2개** (가로 분할)
   - 각 카드: 구 / 동 이름 / 평균 월세 / 통학 시간 / 생활시설 + "이게 더 좋아요" 버튼
6. **하단**: "둘 다 별로예요 · 다음 비교"

#### 비교 동네 선택 알고리즘
5번 비교는 정보량이 최대가 되도록. 첫 비교는 양극단 (예: 월세 저렴 + 통학 멀음 vs 월세 비쌈 + 통학 가까움), 이후엔 사용자 선택 패턴 보고 다음 쌍 결정.

간단 버전: 무작위 5쌍. 동작은 함.

#### 5번 완료 후 결과 화면
"통학 50%, 주거비 30%, 생활시설 20%를 중요시하시네요" → "메인 지도에서 확인하기" 버튼 → 메인 지도로 자동 복귀, 슬라이더 자동 이동, 히트맵 색상 트랜지션 (애니메이션 1초)

#### 알고리즘
Bradley-Terry 또는 단순 Logistic Regression on diff features. `scipy.optimize` 50줄로 충분.

5번 비교 = 5개 부등식 (선택된 쪽이 더 점수 높음) → 가중치 (w_rent, w_amenity, w_transit) 추정. 정규화해서 합 100%로.

#### 데이터 요청
- `POST /api/preference/submit` body: `{comparisons: [{won: dong_id, lost: dong_id}, ...]}` → response: `{w_rent: 0.3, w_amenity: 0.2, w_transit: 0.5}`

---

### 6.6 마이페이지 (`/mypage`)

#### 레이아웃
- 풀스크린, 상단 헤더 (← 지도로)
- 섹션 단위로 세로 스크롤

#### 섹션
1. **프로필**: 아바타 (이니셜) + 이름 + 학교·학년
2. **내 가중치**: 통학/주거비/생활시설 % + "다시 학습하기" 링크
3. **찜한 동네**: 최대 N개 리스트 (동 이름 / 구 / 종합 점수 / 추가 시점)
   - "N개 모두 비교하기 →" CTA
4. **내가 쓴 리뷰**: 리뷰 카드 리스트

#### 인터랙션
- 찜한 동네 클릭 → 동네 상세 페이지
- "다시 학습하기" 클릭 → 선호 학습 온보딩 모달

---

### 6.7 자취생 리뷰 (동네 상세 안 또는 별도 페이지)

#### 우선순위: 낮음
6월 5일 마감 고려하면 더미 데이터 5개 박아두고 화면만 보여주기.

#### 만든다면
- 리뷰 카드: 제목 / 작성자 학교 / 별점 / 본문 / 작성일
- 작성 폼 (모달): 별점 + 제목 + 본문 + 작성자 학교 (자동)
- 신고 / 좋아요 (선택)

---

## 7. 우선순위 (마감 기준)

| 순위 | 화면 | 필수도 | 마감일 |
|---|---|---|---|
| 1 | 메인 지도 + 동네 패널 | 절대 필수 | 5/10 |
| 2 | 동네 상세 페이지 | 필수 | 5/17 |
| 3 | 선호 학습 온보딩 | 발표 임팩트 | 5/17 |
| 4 | 동네 비교 | 차별화 | 5/24 |
| 5 | 자취생 리뷰 (UI만) | 차별화 | 5/24 |
| 6 | 마이페이지 / 로그인 | 있으면 좋음 | 5/24 |
| 7 | 커뮤니티 | 안 만들어도 됨 | 빼기 |
| 8 | 랜딩 페이지 | 안 만들어도 됨 | 빼기 |
| 9 | 동네 추천 (임베딩) | 시간 남으면 | 5/31 |
| 10 | 3D 시각화 | 시간 남으면 | 5/31 |

---

## 8. URL 구조

```
/                       메인 지도
/dong/:slug             동네 상세 (예: /dong/필동)
/compare?dongs=...      동네 비교
/mypage                 마이페이지
/login                  로그인 (카카오 소셜만)
/onboarding             선호 학습 온보딩 (모달이지만 라우트로도 접근 가능)
```

---

## 9. API 엔드포인트 (Django DRF)

### 동네 관련
- `GET /api/dongs/scores?w_rent=33&w_amenity=33&w_transit=34`
  - 426개 행정동 점수 리스트 (메인 지도용)
  - response: `[{slug, name, gu, score, lat, lng}, ...]`

- `GET /api/dongs/:slug/summary`
  - 동네 패널용 요약 (5개 핵심 지표)
  - response: `{name, gu, score, summary, rent_avg, nearest_station, amenity_level, single_household_pct, safety_level}`

- `GET /api/dongs/:slug/detail`
  - 동네 상세 페이지용 전체 데이터
  - response: 모든 섹션 데이터 + 비슷한 동네 (시간 되면)

- `GET /api/dongs/search?q=...`
  - 검색 자동완성

### 비교 관련
- `GET /api/compare?slugs=A,B,C`
  - 비교 화면 데이터

### 선호 학습
- `GET /api/preference/pairs?count=5`
  - 비교용 동네 쌍 5개 반환

- `POST /api/preference/submit`
  - body: `{comparisons: [{won, lost}, ...]}`
  - response: `{w_rent, w_amenity, w_transit}`

### 사용자
- `POST /api/auth/kakao` 카카오 로그인 콜백
- `GET /api/users/me` 내 정보
- `GET /api/users/me/favorites` 찜한 동네
- `POST /api/users/me/favorites` 찜하기
- `DELETE /api/users/me/favorites/:slug` 찜 해제
- `GET /api/users/me/reviews` 내 리뷰

### 리뷰
- `GET /api/dongs/:slug/reviews` 동네 리뷰 리스트
- `POST /api/dongs/:slug/reviews` 리뷰 작성

---

## 10. 데이터 모델 (Django)

```python
# apps/neighborhoods/models.py
class Dong(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=50)  # 행정동 이름 (예: "필동")
    gu = models.CharField(max_length=50)    # 구 (예: "중구")
    code = models.CharField(max_length=10)  # 행정동 코드
    geom = models.MultiPolygonField()       # PostGIS 폴리곤
    centroid = models.PointField()          # 중심점
    area_km2 = models.FloatField()          # 면적

    # 사전 계산된 점수 (캐시)
    score_rent = models.FloatField()        # 0~100
    score_amenity = models.FloatField()
    score_transit = models.FloatField()

# apps/realestate/models.py
class RentDeal(models.Model):
    dong = models.ForeignKey(Dong, on_delete=models.CASCADE)
    deal_type = models.CharField(choices=[('연립다세대', ...), ('단독다가구', ...), ('오피스텔', ...)])
    deal_date = models.DateField()
    area_m2 = models.FloatField()
    deposit = models.IntegerField()  # 만원 단위
    monthly_rent = models.IntegerField()  # 만원 단위

# apps/amenities/models.py
class Amenity(models.Model):
    dong = models.ForeignKey(Dong, on_delete=models.CASCADE)
    category = models.CharField(...)  # 편의점, 카페, 음식점 등
    name = models.CharField(...)
    location = models.PointField()

# apps/transit/models.py
class SubwayStation(models.Model):
    name = models.CharField(...)
    line = models.CharField(...)
    location = models.PointField()

class BusStop(models.Model):
    dong = models.ForeignKey(Dong, on_delete=models.CASCADE)
    location = models.PointField()

# apps/community/models.py
class Review(models.Model):
    dong = models.ForeignKey(Dong, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(...)
    body = models.TextField()
    rating = models.IntegerField()  # 1~5
    school = models.CharField(...)
    created_at = models.DateTimeField(auto_now_add=True)

# apps/preference/models.py
class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    w_rent = models.FloatField(default=0.33)
    w_amenity = models.FloatField(default=0.33)
    w_transit = models.FloatField(default=0.34)
    updated_at = models.DateTimeField(auto_now=True)

class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    dong = models.ForeignKey(Dong, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## 11. 핵심 알고리즘

### 11.1 종합 점수 계산
```python
def calculate_score(dong, w_rent=0.33, w_amenity=0.33, w_transit=0.34):
    return (
        dong.score_rent * w_rent +
        dong.score_amenity * w_amenity +
        dong.score_transit * w_transit
    )
```

각 점수 (rent/amenity/transit)는 사전 계산. 클라이언트에서 가중치만 바꿔 재계산도 가능 (서버 왕복 없이).

### 11.2 점수 정규화
- 전월세: 평균 월세를 서울 전체에서 백분위 → 100 - 백분위 (저렴할수록 점수 높음)
- 생활시설: 카테고리별 밀도 가중합 → 백분위
- 교통: (가까운 역까지 거리 역수) + (버스 정류장 수) 가중합 → 백분위

### 11.3 한 줄 요약 자동 생성
점수 구성에 따른 룰 베이스:
```python
def generate_summary(scores):
    transit, rent, amenity = scores['transit'], scores['rent'], scores['amenity']
    # 룰 매트릭스
    if transit > 80 and amenity < 60:
        return "교통 좋고 생활시설 부족"
    if amenity > 80 and transit < 60:
        return "조용하지만 생활시설 풍부"
    if all(s > 70 for s in scores.values()):
        return "자취 입문자에게 추천"
    # ... 등등
```

LLM 호출은 비용 들어서 룰 베이스 우선. 템플릿 10~15개로 충분.

### 11.4 선호 학습 (Bradley-Terry 단순 버전)

5번 비교 결과 → Logistic Regression with scipy:

```python
from scipy.optimize import minimize
import numpy as np

def estimate_weights(comparisons):
    # comparisons: [(won_dong_features, lost_dong_features), ...]
    # features: [score_rent, score_amenity, score_transit]

    def neg_log_likelihood(w):
        ll = 0
        for won_feat, lost_feat in comparisons:
            diff = np.dot(w, won_feat) - np.dot(w, lost_feat)
            # 시그모이드
            ll += -np.log(1 + np.exp(-diff))
        return -ll

    # 초기값 균등
    w0 = np.array([0.33, 0.33, 0.34])
    # 합 = 1, 모두 양수 제약
    constraints = [{'type': 'eq', 'fun': lambda w: w.sum() - 1}]
    bounds = [(0, 1)] * 3
    result = minimize(neg_log_likelihood, w0, bounds=bounds, constraints=constraints)
    return result.x
```

50줄로 충분. PyMC 같은 거 안 써도 됨.

### 11.5 비슷한 동네 추천 (시간 되면)

**옵션 A — POI 기반 단순**
1. 각 동을 카테고리별 시설 수 벡터로 표현 (예: 50차원)
2. 정규화 (z-score)
3. 코사인 유사도로 top-K

벡터는 사전 계산, DB에 저장. 추천 시점엔 코사인 유사도만 계산.

**옵션 B — Autoencoder 압축 (시간 더 있으면)**
PyTorch 100줄로 학습. 16차원으로 압축.

---

## 12. 파일 구조 (제안)

### 백엔드 (Django)
```
backend/
├── manage.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── neighborhoods/   # Dong 모델, 점수 계산, 공간 쿼리
│   ├── realestate/      # 전월세 데이터
│   ├── amenities/       # 편의시설
│   ├── transit/         # 지하철, 버스
│   ├── community/       # 리뷰
│   ├── preference/      # 가중치, 선호학습
│   └── users/           # 인증, 마이페이지
├── scripts/             # 데이터 수집 (cron으로 실행, Django 외부)
│   ├── fetch_realestate.py
│   ├── fetch_amenities.py
│   ├── geocode_dongs.py
│   └── compute_scores.py
└── requirements.txt
```

### 프론트엔드 (React + Vite + TypeScript)
```
frontend/
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── MainMap.tsx
│   │   ├── DongDetail.tsx
│   │   ├── Compare.tsx
│   │   ├── MyPage.tsx
│   │   └── Login.tsx
│   ├── components/
│   │   ├── Map/
│   │   │   ├── HeatMap.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── DongPanel.tsx
│   │   ├── Detail/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── RealEstateSection.tsx
│   │   │   ├── AmenitySection.tsx
│   │   │   ├── TransitSection.tsx
│   │   │   └── ReviewSection.tsx
│   │   ├── Onboarding/
│   │   │   └── PreferenceModal.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       └── Score.tsx
│   ├── hooks/
│   │   ├── useDongs.ts
│   │   ├── useDongDetail.ts
│   │   └── usePreference.ts
│   ├── lib/
│   │   ├── api.ts
│   │   └── colors.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── tokens.css      # CSS variables (디자인 시스템)
│   └── types/
│       └── api.ts
└── public/
    └── seoul_dongs.geojson
```

---

## 13. 발표 데모 시나리오 (5분)

```
[1. 인트로 - 30초]
"서울 자취 처음 시작하면 어디가 좋을지 모르죠"
→ 메인 지도 화면 등장 (서울 전체 색깔)

[2. 가중치 조절 - 1분]
"교통이 중요하면..." 슬라이더 올림 → 색깔 출렁
"주거비도 중요하면..." 슬라이더 올림 → 다시 출렁
"이렇게 자기 기준에 맞춰 동네를 볼 수 있어요"

[3. 자동 추천 (선호 학습) - 1분 30초]
"근데 자기가 뭘 원하는지 정확히 모를 수도 있죠"
"심사위원님 한번 골라보세요" → 5번 비교
"이 결과를 보세요. 통학을 가장 중요하게 생각하시네요"
→ 슬라이더 자동 이동, 지도 색깔 변함

[4. 동네 클릭 - 1분]
"필동이 빨갛게 떠올랐네요. 클릭해보면..."
→ 카메라 줌인, 패널 슬라이드 인
"종합점수 78점, 교통 좋고 생활시설 부족"

[5. 자세히 보기 - 1분]
"자세히 보기 누르면..."
→ 동네 상세 페이지
"평균 월세, 가까운 역, 자취생 리뷰까지 한 번에"

[6. 비교 - 30초]
"두 동네를 비교하면..."
→ 동네 비교 화면
"필동 vs 회기동, 어느 쪽이 본인에게 맞는지 한눈에"

[클로징]
"공공데이터 + AI로 자취 입문자가 동네를 이해하게 돕는 서비스"
```

---

## 14. 주의사항 / 결정사항

### 14.1 안 만드는 것 (스코프 컨트롤)
- 매물 검색 (직방·다방 영역, 우리 차별점 아님)
- 실시간 채팅
- 모바일 앱 (반응형 웹만)
- SEO 최적화 (학부 프로젝트라 불필요)
- 다국어

### 14.2 데이터 수집 처리
- 법정동 → 행정동 매핑은 사전 계산된 테이블 (행안부 코드)
- VWorld 지오코딩은 매물 단위가 아니라 법정동 단위로만
- 이상치 처리: 보증금 0 또는 월세 5000만원 이상은 IQR 클리핑
- 거래량 3건 미만 월은 점 생략하고 점선으로 연결

### 14.3 성능
- 426개 행정동 GeoJSON 클라이언트에서 한 번만 로드 (정적 파일)
- 가중치 슬라이더 변경 시 색상 재계산은 클라이언트에서 (서버 왕복 X)
- API 응답 5분 캐싱 (django-redis)
- DRF queryset에 `select_related`, `prefetch_related` 적극 활용

### 14.4 접근성
- 색맹 대응: 히트맵 색만으로 정보 전달 X. 호버 시 숫자 툴팁 필수.
- 키보드 내비게이션: Tab 순서 정의
- alt 텍스트: 미니 지도 등 이미지 요소

### 14.5 다크 모드
- CSS variables로 라이트/다크 둘 다 지원
- 시스템 설정 따라가는 게 기본 (`prefers-color-scheme: dark`)
- 토글 옵션 마이페이지에 추가 (선택)

---

## 15. 다음 작업 체크리스트 (Claude Code용)

### 백엔드 우선 (5/3 ~ 5/10)
- [ ] Django 프로젝트 초기화 + GeoDjango 설정 + PostGIS 연결
- [ ] Dong 모델 + 426개 행정동 GeoJSON 적재
- [ ] 데이터 수집 스크립트 (전월세, 편의시설, 지하철, 버스)
- [ ] 점수 계산 스크립트 (rent/amenity/transit 0~100)
- [ ] 기본 API: `/api/dongs/scores`, `/api/dongs/:slug/summary`

### 프론트 메인 지도 (5/3 ~ 5/10 병행)
- [ ] React + Vite + TypeScript 셋업
- [ ] 디자인 시스템 (CSS variables, 폰트, 컴포넌트 베이스)
- [ ] Leaflet 연결 + GeoJSON 폴리곤 렌더링
- [ ] 색상 매핑 (점수 → 4단계 컬러)
- [ ] 좌측 사이드바 (가중치 슬라이더)
- [ ] 클라이언트 사이드 점수 재계산
- [ ] 동네 호버 툴팁 / 클릭 패널

### 동네 상세 + 선호 학습 (5/11 ~ 5/17)
- [ ] `/dong/:slug` 라우트 + API
- [ ] 5개 섹션 컴포넌트 + Recharts 차트
- [ ] 선호 학습 모달 (5번 비교)
- [ ] 가중치 추정 API (scipy)

### 비교 + 리뷰 + 마이페이지 (5/18 ~ 5/24)
- [ ] `/compare` 라우트 + API
- [ ] 더미 리뷰 데이터 + 리뷰 컴포넌트
- [ ] 카카오 로그인 (선택)
- [ ] 마이페이지

### 마무리 (5/25 ~ 5/31)
- [ ] 통합 테스트
- [ ] 발표 시나리오 리허설
- [ ] (시간 남으면) 임베딩 추천 / 3D 시각화

---

## 16. 참고 레퍼런스

- 디자인 톤: Linear, Vercel 대시보드, 토스 인사이트, 디스콰이엇 트렌드
- 지도 시각화: Kepler.gl, deck.gl 예제
- 부동산 시장 비교 대상: 호갱노노, 아실, 직방 동네 리포트 (이들의 부족한 점이 우리 차별점)
- Django + GeoDjango 공식 튜토리얼
- Bradley-Terry 모델 위키 / scipy.optimize 문서
