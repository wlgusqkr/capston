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

// -------- Preference learning (SPEC 6.5, 11.4) ---------------------------
// Source: docs/handoff/20260502-step7a-backend-preference.md

/** A single comparison card shown in the preference learning modal.
 *  Backend computes rent_avg / transit_min / amenity_label deterministically.
 */
export interface PairCard {
  slug: string;
  name: string;
  gu: string;
  /** Average monthly rent (만원, score 기반 derived dummy). */
  rent_avg: number;
  /** 평균 환산월세 (만원, 정수). 월세 + 보증금 × 0.005, RentDeal 실거래 기반.
   *  null 또는 undefined → 데이터 부족(거래 적재 안 된 동) 또는 백엔드가 아직
   *  필드를 노출하지 않은 경우. UI는 두 케이스 모두 동일하게 폴백 표기 처리. */
  rent_converted?: number | null;
  /** Walking minutes to nearest subway station. */
  transit_min: number;
  /** Korean human-readable amenity coverage. */
  amenity_label: '충분' | '보통' | '부족';
  /** Composite score @ 33/33/34, two decimals. */
  score: number;
}

/** A pair of dongs the user is asked to choose between. */
export interface PreferencePair {
  left: PairCard;
  right: PairCard;
}

/** Response of GET /api/preference/pairs?count=N. */
export interface PreferencePairsResponse {
  pairs: PreferencePair[];
}

/** Body element for POST /api/preference/submit. */
export interface SubmitComparison {
  /** slug of the chosen (won) dong. */
  won: string;
  /** slug of the rejected (lost) dong. */
  lost: string;
}

/** Response of POST /api/preference/submit.
 *  Integers in 0~100 that sum to exactly 100 — drop straight into Weights.
 */
export interface PreferenceWeightsResponse {
  w_rent: number;
  w_amenity: number;
  w_transit: number;
}

// -------- Compare (SPEC 6.4) ---------------------------------------------
// Source: docs/handoff/20260502-step8a-backend-compare.md

/** Korean-readable amenity coverage label used in the compare table. */
export type CompareAmenityLabel = '충분' | '보통' | '부족';

/** Korean-readable safety label used in the compare table. */
export type CompareSafetyLabel = '높음' | '보통' | '낮음';

/** A single compare-table column (one dong) — GET /api/compare row.
 *  Backend returns rows in the input slug order (preserved for column order).
 */
export interface CompareItem {
  slug: string;
  name: string;
  gu: string;
  /** Weighted composite 0~100 (two decimals). */
  score: number;
  /** Raw average monthly rent in 만원 (정수, dummy: 120 - score_rent). */
  rent_avg: number;
  /** 환산월세 평균 in 만원 (정수). 월세 + 보증금 × 0.005, RentDeal 실거래 기반. null = 데이터 부족. */
  rent_converted_avg: number | null;
  /** Walking minutes to nearest subway station (정수). */
  transit_min: number;
  amenity_label: CompareAmenityLabel;
  /** Single-household ratio 0~100 (one decimal). */
  single_household_pct: number;
  safety_label: CompareSafetyLabel;
  /** Average review rating 1~5 (one decimal). */
  review_avg_rating: number;
  /** Review count (정수). */
  review_count: number;
}

/** Echoed weights — the values the backend actually applied. */
export interface CompareWeights {
  w_rent: number;
  w_amenity: number;
  w_transit: number;
}

/** GET /api/compare?slugs=A,B,C[&w_rent=&w_amenity=&w_transit=] response. */
export interface CompareResponse {
  weights: CompareWeights;
  /** Same order as the input slugs (max 3). */
  dongs: CompareItem[];
}

// -------- Auth + Users (SPEC 6.6, 9 — step 9) -----------------------------
// Source: docs/handoff/20260502-step9a-backend-users.md
//   세션 쿠키 기반 (axios withCredentials: true).
//   카카오/소셜 X — 표준 username/password.

/** Stored preference weights as integer percents (sum = 100, ±1).
 *  Same shape as `Weights` but with backend field names.
 *  Use `mePreferenceToWeights` / `weightsToMePreference` to convert.
 */
export interface MePreference {
  w_rent: number;
  w_amenity: number;
  w_transit: number;
}

/** Bare user — used in many response shapes. */
export interface User {
  id: number;
  username: string;
  /** May be the empty string; backend falls back to username on GET /me. */
  nickname: string;
  /** May be the empty string. */
  school: string;
  /** Null when not provided. */
  year: number | null;
}

/** GET /api/users/me — adds the user's saved preference weights. */
export interface MeResponse extends User {
  preference: MePreference;
}

/** POST /api/auth/register body. */
export interface RegisterPayload {
  username: string;
  password: string;
  school?: string;
  year?: number | null;
  nickname?: string;
}

/** POST /api/auth/login body. */
export interface LoginPayload {
  username: string;
  password: string;
}

/** PATCH /api/users/me body — all fields optional. */
export interface MePatchPayload {
  school?: string;
  year?: number | null;
  nickname?: string;
}

/** Single row of GET /api/users/me/favorites and the POST response. */
export interface FavoriteItem {
  slug: string;
  name: string;
  gu: string;
  /** 0~100, applied with the user's saved weights. */
  score: number;
  /** ISO 8601 KST. */
  created_at: string;
}

/** Shape of 4xx error payloads from the auth/users routes (step9a).
 *  Field arrays come from DRF serializers; `detail` from custom messages.
 */
export interface ApiErrorDetail {
  detail?: string;
  username?: string | string[];
  password?: string | string[];
  slug?: string | string[];
  weights?: string | string[];
  w_rent?: string | string[];
  w_amenity?: string | string[];
  w_transit?: string | string[];
}

// -------- Transactions (Phase 1 — main map raw pin layer) ----------------
// Source: docs/handoff/20260503-phase1a-transactions-api.md
//   GET /api/transactions/bbox?bbox=lng1,lat1,lng2,lat2&deal_type=&from=&to=&limit=
//   - Backend filters out geom IS NULL rows (단독다가구 좌표 없음).
//   - Same jibun → same coordinates (privacy: 지번 중심점만, SPEC 14.2).

/** Backend whitelist for the `deal_type` query parameter.
 *  `all` is a sentinel meaning "no filter" — never appears in `RentDealPin.deal_type`.
 */
export type TransactionDealType = 'apt' | 'officetel' | 'villa' | 'dagagu' | 'danok';

/** Same as `TransactionDealType` but with the `all` sentinel for filter UI. */
export type TransactionDealTypeFilter = TransactionDealType | 'all';

/** Single transaction pin row from GET /api/transactions/bbox. */
export interface RentDealPin {
  id: number;
  /** 'YYYY-MM-DD'. */
  date: string;
  deal_type: TransactionDealType;
  /** Square meters (소수 가능). */
  area_m2: number;
  /** Deposit (만원). */
  deposit: number;
  /** Monthly rent (만원). 0 → 전세. */
  monthly_rent: number;
  /** 환산월세 (만원, 정수). 보증금을 월세로 환산해 합산: monthly_rent + deposit × 0.005.
   *  Backend가 RentDealPinSerializer에서 직접 계산해 내려준다 (lib/rent.ts와 동일 계수). */
  converted_rent: number;
  /** WGS84 latitude. */
  lat: number;
  /** WGS84 longitude. */
  lng: number;
  /** 지번 (e.g., "90-24"). */
  jibun: string;
  /** 행정동 한국어 이름 (e.g., "광희동"). */
  dong_name: string;
  /** 구 이름 (e.g., "중구"). */
  gu: string;
}

/** Response of GET /api/transactions/bbox. */
export interface TransactionsBboxResponse {
  items: RentDealPin[];
  /** True when limit + 1 fetch returned the +1 → next page exists. */
  has_more: boolean;
  /** Display-only count, capped at `limit * 5`. */
  total: number;
  /** True when `total` itself is the cap (real count is higher). */
  has_more_total: boolean;
}

/** WGS84 bbox in (lng, lat) order matching backend query string format. */
export interface Bbox {
  lng1: number;
  lat1: number;
  lng2: number;
  lat2: number;
}

/** Filters applied to /api/transactions/bbox. */
export interface TransactionFilters {
  deal_type: TransactionDealTypeFilter;
  /** ISO date 'YYYY-MM-DD' (inclusive lower bound) or null. */
  from: string | null;
  /** ISO date 'YYYY-MM-DD' (inclusive upper bound) or null. */
  to: string | null;
}

// -------- Kernel score (Phase 2 — POST /api/score/point) -----------------
// Source: docs/handoff/20260503-phase2a-kernel-score.md
//   POST body: { lat, lng, weights:{rent,amenity,transit}, school?:string }
//   - Backend normalizes weights (sum need not be 1.0).
//   - school is optional; backend's SCHOOL_COORDS dict has 16 keys
//     (캠퍼스 정문 좌표). Unknown school → commute_min: null (not an error).

/** Weights body for kernel score. Float values (0~1 range typical, but any
 *  non-negative value works — backend normalizes by sum). */
export interface KernelScoreWeights {
  rent: number;
  amenity: number;
  transit: number;
}

/** Request body for POST /api/score/point. */
export interface KernelScoreRequest {
  lat: number;
  lng: number;
  weights: KernelScoreWeights;
  /** Optional school name (e.g. "동국대"). Unknown name → commute_min null. */
  school?: string;
}

/** Categories returned in `nearest` rows. Subway is special-cased
 *  (carries `line` field). Others mirror Amenity.category. */
export type NearestFacilityCategory =
  | 'subway'
  | 'convenience'
  | 'cafe'
  | 'hospital'
  | 'park'
  | 'mart'
  | 'pharmacy'
  | string;

/** Single nearest facility row in the kernel score response. */
export interface NearestFacility {
  category: NearestFacilityCategory;
  name: string;
  /** Subway only. */
  line?: string;
  /** Walking minutes (rounded). */
  walk_min: number;
  /** Distance in meters (integer). */
  distance_m: number;
}

/** 1km-radius facility counts. Keys are amenity categories. */
export interface RadiusCounts {
  convenience: number;
  cafe: number;
  hospital: number;
  park: number;
  mart: number;
  pharmacy: number;
  /** Forward-compat: backend may add categories. */
  [k: string]: number;
}

/** Debug-only metadata. Phase 2b frontend may ignore. */
export interface KernelScoreMeta {
  dong_slug: string | null;
  dong_name: string | null;
  bus_count_1km: number;
}

/** Response of POST /api/score/point. */
export interface KernelScoreResponse {
  /** 0~100, two decimals. */
  score: number;
  breakdown: {
    rent: number;
    amenity: number;
    transit: number;
  };
  nearest: NearestFacility[];
  radius_counts: RadiusCounts;
  /** Walking + train minutes to school (haversine + 22 km/h). null when
   *  school omitted or unknown. */
  commute_min: number | null;
  _meta?: KernelScoreMeta;
}

/** Backend SCHOOL_COORDS keys (16 — see Phase 2a handoff).
 *  Two pairs are aliases (외대/한국외대, 시립대/서울시립대). */
export const KERNEL_SCHOOL_OPTIONS = [
  '동국대',
  '한양대',
  '고려대',
  '연세대',
  '서강대',
  '이화여대',
  '홍익대',
  '서울대',
  '중앙대',
  '건국대',
  '성균관대',
  '경희대',
  '한국외대',
  '서울시립대',
] as const;
export type KernelSchool = (typeof KERNEL_SCHOOL_OPTIONS)[number];
