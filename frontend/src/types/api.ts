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
