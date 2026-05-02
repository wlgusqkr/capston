// Axios client + endpoint functions.
// All API calls go through this module. Hooks in src/hooks/* wrap these.
import axios from 'axios';
import type { AxiosInstance } from 'axios';

import type { DongScore, Weights } from '@/types/api';

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
