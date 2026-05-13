// Axios client + endpoint functions.
// All API calls go through this module. Hooks in src/hooks/* wrap these.
import axios from 'axios';
import type { AxiosInstance } from 'axios';

import type {
  Bbox,
  CompareResponse,
  DongDetail,
  DongGuMetricsResponse,
  GuMetricSeriesResponse,
  DongPopulationResponse,
  DongScore,
  DongSummary,
  ExploreFilters,
  ExploreResponse,
  MatchCountsResponse,
  MatchDetailResponse,
  MatchFilters,
  FavoriteItem,
  KernelScoreRequest,
  KernelScoreResponse,
  LoginPayload,
  MePatchPayload,
  MePreference,
  MeResponse,
  PreferencePairsResponse,
  PreferenceWeightsResponse,
  RegisterPayload,
  SubmitComparison,
  TransactionFilters,
  TransactionsBboxResponse,
  User,
  Weights,
} from '@/types/api';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 10_000,
  // Required for Django session cookies. The backend marks all auth routes
  // CSRF-exempt (see step9a handoff) so no token wrangling is needed.
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

/** GET /api/dongs/scores — main map heatmap data (SPEC 6.1).
 *
 *  Backend validates that w_rent + w_amenity + w_transit sums to 100±1
 *  and that each is in 0~100. Caller should normalize on the client first.
 */
export async function getDongScores(weights: Weights): Promise<DongScore[]> {
  const { data } = await api.get<DongScore[]>('/dongs/scores', {
    params: {
      w_rent: weights.rent,
      w_amenity: weights.amenity,
      w_transit: weights.transit,
    },
  });
  return data;
}

/** GET /api/dongs/:slug/summary — dong panel data (SPEC 6.2).
 *
 *  Same weight params as /scores; backend recomputes weighted score and
 *  returns 5 핵심 지표 + rule-based 한 줄 요약.
 */
export async function getDongSummary(
  slug: string,
  weights: Weights
): Promise<DongSummary> {
  const { data } = await api.get<DongSummary>(`/dongs/${slug}/summary`, {
    params: {
      w_rent: weights.rent,
      w_amenity: weights.amenity,
      w_transit: weights.transit,
    },
  });
  return data;
}

/** GET /api/dongs/:slug/detail — full detail page data (SPEC 6.3).
 *
 *  Same weight params as /scores and /summary. Backend returns all six
 *  sections in a single payload. See DongDetail in types/api.ts.
 */
export async function getDongDetail(
  slug: string,
  weights: Weights
): Promise<DongDetail> {
  const { data } = await api.get<DongDetail>(`/dongs/${slug}/detail`, {
    params: {
      w_rent: weights.rent,
      w_amenity: weights.amenity,
      w_transit: weights.transit,
    },
  });
  return data;
}

/** GET /api/dongs/:slug/explore — 자취 시세 BI 대시보드 (Phase 4.8).
 *  필터는 ExploreFilters 그대로 전송. deal_types 는 콤마 join.
 */
export async function getDongExplore(
  slug: string,
  filters: ExploreFilters,
): Promise<ExploreResponse> {
  const { data } = await api.get<ExploreResponse>(`/dongs/${slug}/explore`, {
    params: {
      deal_types: filters.deal_types.join(','),
      period: filters.period,
      deposit_min: filters.deposit_min,
      deposit_max: filters.deposit_max,
      monthly_min: filters.monthly_min,
      monthly_max: filters.monthly_max,
      area_min: filters.area_min,
      area_max: filters.area_max,
      page: filters.page,
      page_size: filters.page_size,
      sort: filters.sort,
    },
  });
  return data;
}

/** GET /api/dongs/match-counts — 메인 지도 자취 거래량 분포 (Phase 5).
 *  필터 통과 거래 수를 동별로 반환. ratio 는 log scale 정규화 + min_sample 가드.
 */
export async function getDongMatchCounts(
  filters: MatchFilters,
): Promise<MatchCountsResponse> {
  const { data } = await api.get<MatchCountsResponse>('/dongs/match-counts', {
    params: matchFiltersToParams(filters),
  });
  return data;
}

/** GET /api/dongs/:slug/match-detail — 동 패널 매칭 KPI 카드 (Phase 5).
 *  count / 평균 환산월세 / 평균 보증금 / 매칭률 + denominator.
 */
export async function getDongMatchDetail(
  slug: string,
  filters: MatchFilters,
): Promise<MatchDetailResponse> {
  const { data } = await api.get<MatchDetailResponse>(
    `/dongs/${slug}/match-detail`,
    { params: matchFiltersToParams(filters) },
  );
  return data;
}

/** MatchFilters → axios params (csv join + 통일된 키). Explore 와 호환. */
function matchFiltersToParams(filters: MatchFilters): Record<string, string | number> {
  return {
    deal_types: filters.deal_types.join(','),
    period: filters.period,
    deposit_min: filters.deposit_min,
    deposit_max: filters.deposit_max,
    monthly_min: filters.monthly_min,
    monthly_max: filters.monthly_max,
    area_min: filters.area_min,
    area_max: filters.area_max,
  };
}

/** GET /api/preference/pairs?count=N — fetch pairs for the onboarding modal
 *  (SPEC 6.5). Backend deterministically picks max-info pairs across rent/
 *  amenity/transit axes. count must be in 1~20.
 */
export async function getPreferencePairs(
  count: number = 5
): Promise<PreferencePairsResponse> {
  const { data } = await api.get<PreferencePairsResponse>('/preference/pairs', {
    params: { count },
  });
  return data;
}

/** GET /api/compare?slugs=A,B,C[&w_rent=&w_amenity=&w_transit=] — compare
 *  table data (SPEC 6.4). Backend preserves input slug order in the response
 *  so the caller can map slugs[i] → dongs[i] directly into table columns.
 *  1~3 slugs allowed; weights default to 33/33/34 if omitted.
 */
export async function getCompare(
  slugs: string[],
  weights: Weights
): Promise<CompareResponse> {
  const { data } = await api.get<CompareResponse>('/compare', {
    params: {
      slugs: slugs.join(','),
      w_rent: weights.rent,
      w_amenity: weights.amenity,
      w_transit: weights.transit,
    },
  });
  return data;
}

/** POST /api/preference/submit — Bradley-Terry weight estimation (SPEC 11.4).
 *
 *  Returns integer weights summing to 100. Caller can plug straight into the
 *  main map's Weights state.
 */
export async function submitPreferenceComparisons(
  comparisons: SubmitComparison[]
): Promise<PreferenceWeightsResponse> {
  const { data } = await api.post<PreferenceWeightsResponse>(
    '/preference/submit',
    { comparisons }
  );
  return data;
}

// -------- Dashboard Phase 2 — Population + Gu Metrics ----------------------

/** GET /api/dongs/:slug/population — time-series population data. */
export async function getDongPopulation(
  slug: string,
): Promise<DongPopulationResponse> {
  const { data } = await api.get<DongPopulationResponse>(
    `/dongs/${slug}/population`,
  );
  return data;
}

/** GET /api/dongs/:slug/gu-metrics — gu-level metrics + Seoul averages. */
export async function getDongGuMetrics(
  slug: string,
): Promise<DongGuMetricsResponse> {
  const { data } = await api.get<DongGuMetricsResponse>(
    `/dongs/${slug}/gu-metrics`,
  );
  return data;
}

/** GET /api/dongs/:slug/gu-metrics/series — gu-level metric time series.
 *
 *  - `codes` is sent as a comma-joined whitelist (backend caps at 10).
 *  - `years` defaults backend-side to 10 (clamp 1~20).
 *  - All requested codes are present in the response (empty points array
 *    when no data) — frontend can iterate without per-code existence checks.
 */
export async function getDongGuMetricsSeries(
  slug: string,
  codes: string[],
  years?: number,
): Promise<GuMetricSeriesResponse> {
  const params: Record<string, string | number> = {
    codes: codes.join(','),
  };
  if (years != null) params.years = years;
  const { data } = await api.get<GuMetricSeriesResponse>(
    `/dongs/${slug}/gu-metrics/series`,
    { params },
  );
  return data;
}

// -------- Transactions (Phase 1 — main map raw pin layer) ------------------
// Spec source: docs/handoff/20260503-phase1a-transactions-api.md

/** GET /api/transactions/bbox — bbox-scoped RentDeal pin list.
 *
 *  - bbox order is (SW lng, SW lat, NE lng, NE lat); backend rejects SW>=NE.
 *  - `deal_type='all'` is sent as the literal string 'all' (backend whitelist).
 *    To omit the filter entirely, pass undefined.
 *  - `from` / `to` are 'YYYY-MM-DD'; null/undefined means no bound.
 *  - `limit` defaults to 200 server-side; the server caps at 500.
 */
export async function getTransactionsBbox(
  bbox: Bbox,
  filters: TransactionFilters,
  limit: number = 200
): Promise<TransactionsBboxResponse> {
  const params: Record<string, string | number> = {
    bbox: `${bbox.lng1},${bbox.lat1},${bbox.lng2},${bbox.lat2}`,
    limit,
  };
  // 'all' is a valid filter token on the backend (no filter applied), but we
  // still send it explicitly so the URL is deterministic for caching.
  params.deal_type = filters.deal_type;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  const { data } = await api.get<TransactionsBboxResponse>(
    '/transactions/bbox',
    { params }
  );
  return data;
}

// -------- Kernel score (Phase 2 — POST /api/score/point) ------------------
// Spec source: docs/handoff/20260503-phase2a-kernel-score.md

/** POST /api/score/point — Gaussian kernel score for an arbitrary lat/lng.
 *
 *  - Backend normalizes weights so the caller need not enforce sum = 1.0.
 *  - `school` is optional; unknown name returns commute_min: null.
 *  - Accepts an AbortSignal so a quick re-click can cancel an in-flight call.
 */
export async function postScorePoint(
  body: KernelScoreRequest,
  signal?: AbortSignal,
): Promise<KernelScoreResponse> {
  const { data } = await api.post<KernelScoreResponse>('/score/point', body, {
    signal,
  });
  return data;
}

// -------- Auth + Users (SPEC 6.6, 9 — step 9) ------------------------------
// All routes rely on the session cookie set by Django. Make sure axios
// `withCredentials` stays true (set above on the shared instance).

/** POST /api/auth/register — creates the user and auto-logs in. */
export async function register(payload: RegisterPayload): Promise<MeResponse> {
  const { data } = await api.post<MeResponse>('/auth/register', payload);
  return data;
}

/** POST /api/auth/login — sets the session cookie. */
export async function login(payload: LoginPayload): Promise<MeResponse> {
  const { data } = await api.post<MeResponse>('/auth/login', payload);
  return data;
}

/** POST /api/auth/logout — idempotent (200 even if not logged in). */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/** GET /api/users/me — used on app boot to restore session. */
export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/users/me');
  return data;
}

/** PATCH /api/users/me — partial profile update. */
export async function patchMe(payload: MePatchPayload): Promise<MeResponse> {
  const { data } = await api.patch<MeResponse>('/users/me', payload);
  return data;
}

/** GET /api/users/me/preference — saved weights (integer percent, sum 100). */
export async function getMyPreference(): Promise<MePreference> {
  const { data } = await api.get<MePreference>('/users/me/preference');
  return data;
}

/** PUT /api/users/me/preference — overwrite saved weights.
 *  Backend tolerates ±1 sum drift. Caller normalizes via lib/weights helpers.
 */
export async function putMyPreference(
  weights: Weights
): Promise<MePreference> {
  const body: MePreference = {
    w_rent: weights.rent,
    w_amenity: weights.amenity,
    w_transit: weights.transit,
  };
  const { data } = await api.put<MePreference>('/users/me/preference', body);
  return data;
}

/** GET /api/users/me/favorites — newest first. Score uses saved weights. */
export async function getFavorites(): Promise<FavoriteItem[]> {
  const { data } = await api.get<FavoriteItem[]>('/users/me/favorites');
  return data;
}

/** POST /api/users/me/favorites — adds a dong by slug. */
export async function addFavorite(slug: string): Promise<FavoriteItem> {
  const { data } = await api.post<FavoriteItem>('/users/me/favorites', {
    slug,
  });
  return data;
}

/** DELETE /api/users/me/favorites/:slug — 204 on success. */
export async function removeFavorite(slug: string): Promise<void> {
  await api.delete(`/users/me/favorites/${slug}`);
}

/** GET /api/users/me/reviews — currently always []. */
export async function getMyReviews(): Promise<unknown[]> {
  const { data } = await api.get<unknown[]>('/users/me/reviews');
  return data;
}

// Re-exports so callers can `import type { User } from '@/lib/api'` if they
// prefer barreling through the API module rather than `types/api`.
export type {
  FavoriteItem,
  LoginPayload,
  MePatchPayload,
  MePreference,
  MeResponse,
  RegisterPayload,
  User,
};
