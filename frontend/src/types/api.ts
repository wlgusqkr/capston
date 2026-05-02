// API response types — mirror Django DRF serializers.
// Source of truth:
//   - docs/handoff/20260502-step3-backend-foundation.md
//   - docs/handoff/20260502-step5a-backend-summary.md (DongSummary, raw scores)
// SPEC sections 9, 10.

/** Single dong score row from GET /api/dongs/scores. */
export interface DongScore {
  /** URL-safe slug, used in /dong/:slug routes. */
  slug: string;
  /** 행정동 한국어 이름, e.g. "필동". */
  name: string;
  /** 구 이름, e.g. "중구". */
  gu: string;
  /** Composite weighted score 0~100, two decimals. */
  score: number;
  /** centroid Y (latitude). */
  lat: number;
  /** centroid X (longitude). */
  lng: number;
  /** Raw 전월세 score 0~100 (added in step 5A — SPEC 14.3 client recompute). */
  score_rent: number;
  /** Raw 생활시설 score 0~100. */
  score_amenity: number;
  /** Raw 교통 score 0~100. */
  score_transit: number;
}

/** Nearest subway station shown in the dong panel (SPEC 6.2). */
export interface NearestStation {
  name: string;
  line: string;
  walking_min: number;
}

/** Three-level rating for amenity coverage (SPEC 6.2 핵심 지표). */
export type AmenityLevel = 'sufficient' | 'normal' | 'lacking';

/** Three-level rating for safety (SPEC 6.2 핵심 지표). */
export type SafetyLevel = 'high' | 'mid' | 'low';

/** Response of GET /api/dongs/:slug/summary — drives the slide-in dong panel.
 *  Source: docs/handoff/20260502-step5a-backend-summary.md
 */
export interface DongSummary {
  slug: string;
  name: string;
  gu: string;
  /** Weighted composite 0~100, two decimals. */
  score: number;
  /** Rule-based one-line summary (Korean). */
  summary: string;
  /** Average monthly rent in 만원 (정수). */
  rent_avg: number;
  nearest_station: NearestStation;
  amenity_level: AmenityLevel;
  /** Single-household ratio 0~100 (소수 가능). */
  single_household_pct: number;
  safety_level: SafetyLevel;
}

/** User-controlled weights for the main map sidebar (SPEC 6.1).
 *  Values are integers 0~100. Sum must equal 100.
 *  Backend tolerates ±1 sum drift (rounding); we still normalize on the client.
 */
export interface Weights {
  rent: number;
  amenity: number;
  transit: number;
}

/** Default weights on first load (SPEC 6.1). */
export const DEFAULT_WEIGHTS: Weights = {
  rent: 33,
  amenity: 33,
  transit: 34,
};

/** Response of GET /api/dongs/:slug/detail — full detail page (SPEC 6.3).
 *  Source: docs/handoff/20260502-step6a-backend-detail.md
 */
export interface DongDetail {
  // 1. Hero
  slug: string;
  name: string;
  gu: string;
  /** Weighted composite 0~100. */
  score: number;
  /** Rule-based one-line summary. */
  summary: string;
  /** Score difference vs Seoul average (baseline 65 in step 6A dummy). */
  vs_seoul_avg_pct: number;
  centroid: { lat: number; lng: number };

  // 2. 부동산 시세
  real_estate: {
    monthly_trend: Array<{
      /** 'YYYY-MM'. */
      month: string;
      /** Average monthly rent (만원). null when fewer than 3 deals that month. */
      villa: number | null;
      multi: number | null;
      officetel: number | null;
    }>;
    deposit_band_avg: Array<{
      /** '0' | '500' | '1000' | '2000' | '3000+'. */
      band: string;
      /** 만원. */
      avg_monthly_rent: number;
    }>;
    recent_deals: Array<{
      /** 'YYYY-MM-DD'. */
      date: string;
      /** '연립다세대' | '단독다가구' | '오피스텔'. */
      type: string;
      area_m2: number;
      /** 만원. */
      deposit: number;
      /** 만원. */
      monthly_rent: number;
    }>;
  };

  // 3. 편의시설 8개 카테고리
  amenities: Array<{
    /** '편의점' | '카페' | '음식점' | '마트' | '병원·약국' | '스터디카페' | '세탁소' | '올리브영'. */
    category: string;
    count: number;
    density_per_km2: number;
    level: AmenityLevel;
  }>;

  // 4. 교통
  transit: {
    nearest_stations: Array<{
      rank: number;
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
    /** 1~5 with 1 decimal. */
    avg_rating: number;
    count: number;
    representatives: Array<{
      title: string;
      author_school: string;
      /** 1~5 integer. */
      rating: number;
      body: string;
      /** 'YYYY-MM-DD'. */
      created_at: string;
    }>;
  };

  // 6. 비슷한 동네
  similar_dongs: Array<{
    slug: string;
    name: string;
    gu: string;
    /** 0~100 with 1 decimal. */
    similarity_pct: number;
  }>;
}
