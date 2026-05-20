// MatchKpiCard -- AdongPanel 안에 들어가는 매칭 KPI 카드 (Phase 5).

import { Link } from 'react-router-dom';

import { useAdongMatchDetail } from '@/hooks/useAdongMatchDetail';
import { writeMatchFiltersToSearch } from '@/hooks/useStudioMatchFilters';
import type { MatchFilters } from '@/types/api';

export interface MatchKpiCardProps {
  slug: string | null;
  filters: MatchFilters;
}

export default function MatchKpiCard({ slug, filters }: MatchKpiCardProps) {
  const { data, isLoading, isError } = useAdongMatchDetail(slug, filters);

  if (!slug) return null;

  const exploreQuery = writeMatchFiltersToSearch(filters).toString();
  const exploreHref = exploreQuery
    ? `/adong/${slug}/explore?${exploreQuery}`
    : `/adong/${slug}/explore`;

  return (
    <section
      className="flex flex-col gap-3 p-5 bg-surface border border-divider rounded-md"
      aria-label="조건 매칭 KPI"
    >
      <header className="flex flex-col gap-1">
        <p className="mono-label m-0 text-accent">STUDIO MATCH · 이 동네</p>
        <p className="m-0 text-feature-heading font-semibold text-text tracking-[var(--letter-spacing-ko)]">
          조건 매칭 거래
        </p>
      </header>

      {isLoading || !data ? (
        <MatchKpiSkeleton />
      ) : isError ? (
        <p className="m-0 text-body-base text-danger" role="alert">
          매칭 정보를 불러오지 못했어요.
        </p>
      ) : data.count === 0 ? (
        <div className="flex flex-col gap-1 p-3 bg-surface-alt rounded-sm">
          <p className="m-0 text-body-base text-text">
            이 동네는 조건에 맞는 거래가 없어요.
          </p>
          <p className="m-0 text-caption text-text-subtle">
            좌측 필터에서 보증금/월세 범위를 넓혀보세요.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1">
            <span className="text-card-heading font-semibold text-text leading-[1.1] tabular">
              {data.count.toLocaleString()}
            </span>
            <span className="text-body-base text-text-subtle">건</span>
          </div>

          <dl className="grid grid-cols-2 gap-3 m-0 pt-2 border-t border-divider">
            <div className="flex flex-col gap-1 m-0">
              <dt className="text-caption text-text-subtle m-0">평균 환산월세</dt>
              <dd className="text-body-large font-semibold text-text m-0 tabular">
                {data.avg_converted_rent != null
                  ? `${data.avg_converted_rent}만원`
                  : '-'}
              </dd>
            </div>
            <div className="flex flex-col gap-1 m-0">
              <dt className="text-caption text-text-subtle m-0">평균 보증금</dt>
              <dd className="text-body-large font-semibold text-text m-0 tabular">
                {data.avg_deposit != null
                  ? `${data.avg_deposit.toLocaleString()}만원`
                  : '-'}
              </dd>
            </div>
          </dl>

          <p className="mono-label m-0 text-text-subtle text-mono-label tracking-[0.26px] uppercase">
            MATCH RATIO:{' '}
            <span className="tabular">
              {data.match_ratio != null ? `${data.match_ratio}%` : '-'}
            </span>{' '}
            (period total {data.period_total.toLocaleString()})
          </p>
        </>
      )}

      <Link
        to={exploreHref}
        className="inline-block self-start py-2 text-text text-body-base font-medium no-underline border-b border-text hover:text-accent hover:border-accent"
      >
        이 동을 더 깊게 탐색 →
      </Link>

      <p className="mono-label m-0 text-text-muted text-mono-label tracking-[0.26px] uppercase">
        SOURCE: 국토부 실거래 (최근 6개월) · 현재 매물 재고 아님
      </p>
    </section>
  );
}

function MatchKpiSkeleton() {
  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite">
      <span className="block h-6 w-1/2 bg-divider rounded-xs [animation:match-kpi-pulse_1.2s_ease-in-out_infinite]" />
      <span className="block h-3.5 w-[90%] bg-divider rounded-xs [animation:match-kpi-pulse_1.2s_ease-in-out_infinite_0.1s]" />
      <span className="block h-3.5 w-3/4 bg-divider rounded-xs [animation:match-kpi-pulse_1.2s_ease-in-out_infinite_0.2s]" />
    </div>
  );
}
