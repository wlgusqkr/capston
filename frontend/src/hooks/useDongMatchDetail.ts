// React Query hook for /api/dongs/<slug>/match-detail (Phase 5).
//
// 동 패널 매칭 KPI 카드. slug 없으면 disabled. 필터는 메인 지도의 Studio Match
// 필터를 그대로 받는다 (URL state 와 동기). 카운트 hook 과 달리 slug 가
// 명시적으로 변하는 시점에만 fetch — 별도 debounce 불필요 (필터는 이미
// useDongMatchCounts 쪽에서 debounce 됨, 동 클릭은 의도된 trigger).

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { getDongMatchDetail } from '@/lib/api';
import type { MatchDetailResponse, MatchFilters } from '@/types/api';

/** GET /api/dongs/:slug/match-detail 구독. slug null/undefined → disabled. */
export function useDongMatchDetail(
  slug: string | null | undefined,
  filters: MatchFilters,
): UseQueryResult<MatchDetailResponse> {
  return useQuery({
    queryKey: [
      'dongs',
      'match-detail',
      slug,
      filters.deal_types.join(','),
      filters.period,
      filters.deposit_min,
      filters.deposit_max,
      filters.monthly_min,
      filters.monthly_max,
      filters.area_min,
      filters.area_max,
    ] as const,
    queryFn: () => getDongMatchDetail(slug as string, filters),
    enabled: !!slug,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
