// TanStack Query hooks for dong-related endpoints.
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { getDongScores } from '@/lib/api';
import type { DongScore, Weights } from '@/types/api';

/** Subscribe to /api/dongs/scores for a given weights triple.
 *  Refetches automatically when any weight value changes (queryKey).
 *  staleTime 60s mirrors the django-redis cache TTL on the backend.
 */
export function useDongScores(weights: Weights): UseQueryResult<DongScore[]> {
  return useQuery({
    queryKey: ['dongs', 'scores', weights.rent, weights.amenity, weights.transit] as const,
    queryFn: () => getDongScores(weights),
    staleTime: 60_000,
  });
}
