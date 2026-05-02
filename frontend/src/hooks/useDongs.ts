// TanStack Query hooks for dong-related endpoints.
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { getCompare, getDongDetail, getDongScores, getDongSummary } from '@/lib/api';
import type {
  CompareResponse,
  DongDetail,
  DongScore,
  DongSummary,
  Weights,
} from '@/types/api';

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

/** Subscribe to /api/dongs/:slug/summary for the slide-in dong panel.
 *  Disabled until a slug is selected (slug === null).
 *
 *  Re-fetches when slug or any weight changes. The backend recomputes the
 *  weighted score per request; the rule-based summary text depends only on
 *  raw scores so it stays stable across weight tweaks.
 */
export function useDongSummary(
  slug: string | null,
  weights: Weights
): UseQueryResult<DongSummary> {
  return useQuery({
    queryKey: [
      'dongs',
      'summary',
      slug,
      weights.rent,
      weights.amenity,
      weights.transit,
    ] as const,
    queryFn: () => getDongSummary(slug as string, weights),
    enabled: slug != null,
    staleTime: 60_000,
  });
}

/** Subscribe to /api/compare for the compare page (SPEC 6.4).
 *  Backend preserves input slug order in the response. The hook is disabled
 *  when slugs is empty or `enabled` is false (e.g. before URL parsing).
 */
export function useCompare(
  slugs: string[],
  weights: Weights,
  enabled: boolean = true
): UseQueryResult<CompareResponse> {
  return useQuery({
    queryKey: [
      'compare',
      // Stable key: join here so reordering produces a different key.
      slugs.join(','),
      weights.rent,
      weights.amenity,
      weights.transit,
    ] as const,
    queryFn: () => getCompare(slugs, weights),
    enabled: enabled && slugs.length > 0,
    staleTime: 60_000,
  });
}

/** Subscribe to /api/dongs/:slug/detail for the detail page (SPEC 6.3).
 *  Disabled until a slug is available (route param undefined / empty).
 *  Refetches on weights changes — backend recomputes weighted score and
 *  vs_seoul_avg_pct each call.
 */
export function useDongDetail(
  slug: string | null | undefined,
  weights: Weights
): UseQueryResult<DongDetail> {
  return useQuery({
    queryKey: [
      'dongs',
      'detail',
      slug,
      weights.rent,
      weights.amenity,
      weights.transit,
    ] as const,
    queryFn: () => getDongDetail(slug as string, weights),
    enabled: !!slug,
    staleTime: 60_000,
  });
}
