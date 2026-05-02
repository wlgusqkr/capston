# Task: 8단계-A — 백엔드 동네 비교 API

작성: 2026-05-02
SPEC 6.4 (동네 비교, 7개 비교 지표), 9 (API) 기준.

## 완료된 작업

### 신규 모듈

- `backend/apps/neighborhoods/compare_dummy.py` — `build_compare_row(dong, weights) -> dict`
  - SPEC 6.4 비교 한 행 빌더
  - DongSummarySerializer / detail_dummy 룰 재사용 (rent_avg = 120 - score_rent, transit_min = NEAREST_STATIONS_FALLBACK[1].walking_min, single_household_pct = SINGLE_HOUSEHOLD_PCT_FALLBACK)
  - 라벨은 한국어 (SPEC 6.4 비교표 직접 표기): amenity_label "충분/보통/부족", safety_label "높음/보통/낮음"
  - review_avg_rating / review_count는 detail_dummy._build_reviews와 동일 시드 룰로 산출 (`_review_summary` 헬퍼)

### 변경된 파일

- `backend/apps/neighborhoods/serializers.py` — `DongCompareItemSerializer` 추가 (Serializer; build_compare_row dict의 스키마 정의)
- `backend/apps/neighborhoods/views.py` — `CompareView(APIView)` 추가
  - `_parse_and_validate_weights` 재사용 (default 33/33/34)
  - `slugs` 쿼리 파라미터 콤마 분할 → 공백 제거 → 빈 문자열 필터
  - 한 번의 `Dong.objects.filter(slug__in=slugs).only(...)` 쿼리 후 dict 룩업 (입력 슬러그 순서 보존)
  - `COMPARE_MAX_SLUGS = 3`
- `backend/apps/neighborhoods/urls.py` — `path("compare", CompareView.as_view(), name="compare")`. config/urls.py에서 `path("api/", include("apps.neighborhoods.urls"))`로 마운트되어 있어 최종 경로는 `/api/compare`.

### 모델 / 마이그레이션

- 모델 추가/변경 없음.
- 마이그레이션 없음.

## API 엔드포인트

### `GET /api/compare?slugs=A,B,C[&w_rent=&w_amenity=&w_transit=]`

- `slugs`: 콤마 분리 슬러그 목록. 1~3개. 공백 자동 제거.
- 가중치 파라미터는 옵션, 기본 33/33/34. 합 100±1.

응답 (200):
```json
{
  "weights": { "w_rent": 33, "w_amenity": 33, "w_transit": 34 },
  "dongs": [
    {
      "slug": "pildong",
      "name": "필동",
      "gu": "중구",
      "score": 60.3,
      "rent_avg": 85,
      "transit_min": 8,
      "amenity_label": "보통",
      "single_household_pct": 42.0,
      "safety_label": "높음",
      "review_avg_rating": 4.3,
      "review_count": 12
    },
    {
      "slug": "hoegidong",
      "name": "회기동",
      "gu": "동대문구",
      "score": 71.55,
      "rent_avg": 40,
      "transit_min": 5,
      "amenity_label": "충분",
      "single_household_pct": 58.0,
      "safety_label": "보통",
      "review_avg_rating": 4.5,
      "review_count": 16
    },
    {
      "slug": "seogyodong",
      "name": "서교동",
      "gu": "마포구",
      "score": 66.78,
      "rent_avg": 90,
      "transit_min": 7,
      "amenity_label": "충분",
      "single_household_pct": 51.0,
      "safety_label": "높음",
      "review_avg_rating": 4.4,
      "review_count": 13
    }
  ]
}
```

`dongs` 배열 순서는 **입력 슬러그 순서 그대로** (프론트 비교표 컬럼 순서 보존).

오류 (한국어, 모두 단일 키):
- 400 `{"slugs": "최소 1개의 슬러그가 필요합니다."}` — slugs 미지정/공백
- 400 `{"slugs": "최대 3개 동네까지 비교할 수 있습니다."}` — 4개 이상
- 400 `{"weights": "가중치 합이 100이어야 합니다 (현재 N). 허용 오차는 ±1입니다."}` — 가중치 합 오류
- 400 `{"w_rent": "정수여야 합니다 (0~100)."}` 등 — 가중치 형식
- 404 `{"detail": "찾을 수 없는 동네: slug_x"}` — 존재하지 않는 슬러그 (여러 개면 콤마 결합)

## TypeScript 인터페이스

프론트가 그대로 import 권장. snake_case 유지 (DongSummary 패턴 일관).

```ts
// GET /api/compare?slugs=A,B,C&w_rent=&w_amenity=&w_transit=
export interface CompareWeights {
  w_rent: number;     // 0~100, 정수
  w_amenity: number;
  w_transit: number;
}

export type AmenityLabel = '충분' | '보통' | '부족';
export type SafetyLabel = '높음' | '보통' | '낮음';

export interface DongCompareItem {
  slug: string;
  name: string;
  gu: string;
  score: number;                  // 0~100, 가중합, 소수 둘째자리
  rent_avg: number;               // 만원, 정수
  transit_min: number;            // 통학 시간 (1위 역 walking_min), 정수
  amenity_label: AmenityLabel;
  single_household_pct: number;   // 0~100, 소수 한자리
  safety_label: SafetyLabel;
  review_avg_rating: number;      // 1~5, 소수 한자리
  review_count: number;           // 정수
}

export interface CompareResponse {
  weights: CompareWeights;        // 적용된 가중치
  dongs: DongCompareItem[];       // 입력 슬러그 순서 보존
}

export interface CompareErrorResponse {
  detail?: string;
  slugs?: string;
  weights?: string;
  w_rent?: string;
  w_amenity?: string;
  w_transit?: string;
}
```

## 검증 결과

- `python manage.py check` → System check identified no issues
- `GET /api/compare?slugs=pildong,hoegidong,seogyodong` → 200, dongs 길이 3
- `GET /api/compare?slugs=pildong&w_rent=80&w_amenity=10&w_transit=10` → 200, dongs 길이 1, score=42.5 (rent 80% 가중)
- `GET /api/compare?slugs=` → 400 `{"slugs": "최소 1개의 슬러그가 필요합니다."}`
- `GET /api/compare` (slugs 자체 누락) → 400 동일 메시지
- `GET /api/compare?slugs=a,b,c,d` → 400 `{"slugs": "최대 3개 동네까지 비교할 수 있습니다."}`
- `GET /api/compare?slugs=pildong,nonexistent` → 404 `{"detail": "찾을 수 없는 동네: nonexistent"}`
- `GET /api/compare?slugs=pildong&w_rent=50&w_amenity=50&w_transit=50` → 400 weights 합 오류

## 8단계 frontend가 알아야 할 것

- **API 베이스**: `http://localhost:8000/api`, 라우트 `GET /compare?slugs=A,B,C`
- **순서 보장**: `dongs` 응답은 요청 슬러그 순서 그대로. 프론트는 비교표 컬럼 순서를 그대로 매핑하면 됨. 동네 추가/제거 시 URL 쿼리 재조립 → 다시 GET.
- **하이라이트(SPEC 6.4)**: 같은 지표 행 안에서 가장 좋은 값에 청록 강조. 방향이 지표마다 다름:
  - 높을수록 좋음: `score`, `single_household_pct`, `review_avg_rating`, `review_count`
  - 낮을수록 좋음: `rent_avg`, `transit_min`
  - 라벨은 등급 비교: `amenity_label` (충분 > 보통 > 부족), `safety_label` (높음 > 보통 > 낮음)
- **가중치 슬라이더**: 비교 화면에서도 가중치를 변경 가능하게 한다면 `&w_rent=&w_amenity=&w_transit=`을 함께 보내라. 응답 `weights` 필드는 적용된 가중치 정수 % — 표시용으로 활용 가능.
- **에러 처리**: `detail`(404, 미존재) / `slugs` / `weights` / `w_rent`,`w_amenity`,`w_transit` (400) 중 한 키만 옴. 토스트 그대로 보여줘도 한국어로 자연스러움.
- **공유 URL(SPEC 6.4 하단)**: 프론트 라우트는 `/compare?dongs=A,B,C`로 명세 (SPEC 6.4 헤더 표기) — 백엔드 API는 `?slugs=...`임에 주의. 프론트가 dongs ↔ slugs 매핑.
- **카드 데이터 정합성**: rent_avg / transit_min / amenity_label 룰은 동네 패널(SPEC 6.2 summary) / 선호 학습 카드(SPEC 6.5 pairs) / 비교표(6.4)에서 모두 동일. 같은 동네는 어느 화면에서나 같은 숫자.

## 알려진 이슈 / 미완

- 5개 더미 환경 — pildong / hoegidong / seogyodong / yeoksamdong / jamsildong 외 슬러그는 404. 10단계 데이터 적재 후 자동 해소.
- `single_household_pct` / `safety_label` / `review_avg_rating` / `review_count`는 모두 점수 기반 휴리스틱 또는 slug 폴백. 실 데이터 없음 (SPEC 14.2 — 5/24 이후).
- `transit_min` 폴백 10분은 NEAREST_STATIONS_FALLBACK에 없는 slug 전용. 10단계 후 SubwayStation ST_DistanceSphere 쿼리로 교체.
- 응답 캐싱 미적용 — 5개 더미 단계라 생략. 426동 환경에서 비교 호출이 빈번하면 5분 redis 캐시 도입 검토.
- `weights` 응답 필드는 정수 % (입력 그대로). 입력 가중치 누락 시 default 33/33/34가 그대로 반환됨 — 프론트 슬라이더 초기값과 일관.
- 슬러그 중복(예: `slugs=pildong,pildong`)은 현재 통과 — dict 룩업 시 같은 키로 두 행 빌드. 의도된 동작이라 보지만, SPEC 6.4의 "비교 가능한 동네" 의미상 프론트에서 클라이언트 가드 권장. 필요 시 set 변환으로 추가 가능.

## 산출물

- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/compare_dummy.py` (신규)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/serializers.py` (DongCompareItemSerializer 추가)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/views.py` (CompareView 추가)
- `/Users/bagjihyeon/Desktop/School/capston/backend/apps/neighborhoods/urls.py` (compare 라우트 추가)
