// Axios client + endpoint functions.
// All API calls go through this module. Hooks in src/hooks/* wrap these.
import axios from 'axios';
import type { AxiosInstance } from 'axios';

import type {
  CompareResponse,
  DongDetail,
  DongScore,
  DongSummary,
  FavoriteItem,
  LoginPayload,
  MePatchPayload,
  MePreference,
  MeResponse,
  PreferencePairsResponse,
  PreferenceWeightsResponse,
  RegisterPayload,
  SubmitComparison,
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
