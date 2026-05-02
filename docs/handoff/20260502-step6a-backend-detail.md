# Task: 6단계-A — 백엔드 동네 상세 API

작성: 2026-05-02
backend-engineer 위임 → 핸드오프 미생성 (코드만 산출). 메인 코디네이터가 작성.

## 완료된 작업

### 신규 엔드포인트 `GET /api/dongs/<slug>/detail`

SPEC 6.3 6개 섹션 데이터 한 번에 응답.

### 산출물

- 신규: `backend/apps/neighborhoods/detail_dummy.py` — 결정적 더미 빌더
  - `build_dummy_detail(dong, weights, today=None) -> dict` (today는 테스트 주입용)
  - slug 해시 시드로 같은 입력 → 같은 응답 보장 (가중치 변경에는 영향 없음)
  - 6개 섹션 빌더: real_estate / amenities / transit / reviews / similar_dongs / hero
  - SPEC 14.2 거래 3건 미만 월 → null 처리
  - similar_dongs는 score_rent/amenity/transit 3D 유클리드 거리 기반 top 3
- 수정: `apps/neighborhoods/serializers.py` — `DongDetailSerializer(serializers.Serializer)` 추가, `to_representation`에서 빌더 호출
- 수정: `apps/neighborhoods/views.py` — `DongDetailView` 추가, `_parse_and_validate_weights` 재사용
- 수정: `apps/neighborhoods/urls.py` — `path("dongs/<slug:slug>/detail", ...)` 등록

### 응답 TS 인터페이스 (프론트가 그대로 import해도 OK)

```ts
interface DongDetail {
  // 1. Hero
  slug: string;
  name: string;
  gu: string;
  score: number;            // weighted, default 33/33/34
  summary: string;          // summary.py 룰베이스 결과
  vs_seoul_avg_pct: number; // 서울 평균(65) 대비 점수 차
  centroid: { lat: number; lng: number };

  // 2. 부동산 시세
  real_estate: {
    monthly_trend: Array<{
      month: string;        // 'YYYY-MM'
      villa: number | null;     // 거래 부족 시 null
      multi: number | null;
      officetel: number | null;
    }>;
    deposit_band_avg: Array<{
      band: string;         // '0' | '500' | '1000' | '2000' | '3000+'
      avg_monthly_rent: number;  // 만원
    }>;
    recent_deals: Array<{
      date: string;         // 'YYYY-MM-DD' (최신순)
      type: string;         // '연립다세대' | '단독다가구' | '오피스텔'
      area_m2: number;
      deposit: number;      // 만원
      monthly_rent: number; // 만원
    }>;
  };

  // 3. 편의시설 8개 카테고리
  amenities: Array<{
    category: string;       // '편의점' | '카페' | '음식점' | '마트' | '병원·약국' | '스터디카페' | '세탁소' | '올리브영'
    count: number;
    density_per_km2: number;
    level: 'sufficient' | 'normal' | 'lacking';
  }>;

  // 4. 교통
  transit: {
    nearest_stations: Array<{
      rank: number;         // 1~3
      name: string;
      line: string;
      walking_min: number;
      walking_distance_m: number;
    }>;
    bus: {
      stop_count: number;
      route_count: number;
    };
  };

  // 5. 자취생 리뷰
  reviews: {
    avg_rating: number;     // 1~5 (소수점 1자리)
    count: number;
    representatives: Array<{
      title: string;
      author_school: string;
      rating: number;       // 1~5 정수
      body: string;
      created_at: string;   // 'YYYY-MM-DD'
    }>;
  };

  // 6. 비슷한 동네
  similar_dongs: Array<{
    slug: string;
    name: string;
    gu: string;
    similarity_pct: number; // 0~100 (소수점 1자리)
  }>;
}
```

### 검증 결과

- `manage.py check` ✅
- `curl /api/dongs/pildong/detail` → 200, 모든 섹션 포함 (검증 완료)
- `curl /api/dongs/hoegidong/detail` → 200, score=71.55, summary "월세 저렴하고 시설도 무난, 가성비 좋아요", similar_dongs 3개
- `curl /api/dongs/nonexistent/detail` → 404
- 가중치 검증은 `_parse_and_validate_weights` 재사용으로 기존과 동일하게 동작

## 6단계 frontend-engineer가 알아야 할 것

- API base: `http://localhost:8000/api`, route `/dongs/:slug/detail`
- 라우트: `/dong/:slug` (SPEC 8 기준)
- 응답 형식 위 TS 인터페이스 그대로
- snake_case → 프론트는 받은 그대로 사용 권장 (DongSummary와 동일 패턴)
- 6개 섹션 컴포넌트 분리 권장: HeroSection, RealEstateSection, AmenitySection, TransitSection, ReviewSection, SimilarDongsSection
- Recharts 사용:
  - 월별 추이 → LineChart (3 라인: villa/multi/officetel, null 점은 자동 끊김)
  - 보증금 대역 → BarChart (가로 막대)
- 색상 매핑: amenity_level의 sufficient/normal/lacking → Badge variant success/warning/danger 또는 neutral (디자인 시스템 패턴 일관)
- 동네 패널의 "자세히 보기"가 이미 `/dong/:slug` 네비게이션 호출함 (5B 핸드오프 참조). 라우트만 만들면 자동 동작.

## 알려진 이슈 / 미완

- 모든 데이터(real_estate / amenities / transit / reviews) 더미. 실 데이터는 10단계 data-pipeline.
- similar_dongs는 5개 더미라 의미 있는 추천 불가. 10단계 후 정밀화.
- `vs_seoul_avg_pct`의 65 baseline은 임시. 10단계에서 실제 서울 평균으로 교체.
