// Axios client + endpoint functions.
// All API calls go through this module. Hooks in src/hooks/* wrap these.
import axios from 'axios';
import type { AxiosInstance } from 'axios';

import type {
  DongDetail,
  DongScore,
  DongSummary,
  PreferencePairsResponse,
  PreferenceWeightsResponse,
  SubmitComparison,
  Weights,
} from '@/types/api';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
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
