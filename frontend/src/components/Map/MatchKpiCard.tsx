// MatchKpiCard — DongPanel 안에 들어가는 매칭 KPI 카드 (Phase 5).
//
// match 모드일 때 동 패널 상단에 렌더 (score 카드 위 — eng-review #14 우선).
// 큰 카운트 + 평균 환산월세/보증금 + 매칭률 mono + Explore 링크.
//
// LOADING: skeleton 3줄
// EMPTY:   "이 동네는 조건에 맞는 거래가 없어요" 한 줄 + 조건 완화 안내
// SUCCESS: 데이터 + "더 깊게 탐색 →" 링크 (필터 query 그대로 전달)

import { Link } from 'react-router-dom';

import { useDongMatchDetail } from '@/hooks/useDongMatchDetail';
import { writeMatchFiltersToSearch } from '@/hooks/useStudioMatchFilters';
import type { MatchFilters } from '@/types/api';

import './MatchKpiCard.css';

export interface MatchKpiCardProps {
  /** 클릭된 동 slug. */
  slug: string | null;
  /** 현재 메인 지도 필터 (URL state). */
  filters: MatchFilters;
}

export default function MatchKpiCard({ slug, filters }: MatchKpiCardProps) {
  const { data, isLoading, isError } = useDongMatchDetail(slug, filters);

  if (!slug) return null;

  // explore 페이지로 넘길 query string — base 그대로 (page/sort 없음 → default).
  const exploreQuery = writeMatchFiltersToSearch(filters).toString();
  const exploreHref = exploreQuery
    ? `/dong/${slug}/explore?${exploreQuery}`
    : `/dong/${slug}/explore`;

  return (
    <section className="match-kpi" aria-label="조건 매칭 KPI">
      <header className="match-kpi__header">
        <p className="mono-label match-kpi__eyebrow">STUDIO MATCH · 이 동네</p>
        <p className="match-kpi__title">조건 매칭 거래</p>
      </header>

      {isLoading || !data ? (
        <MatchKpiSkeleton />
      ) : isError ? (
        <p className="match-kpi__error" role="alert">
          매칭 정보를 불러오지 못했어요.
        </p>
      ) : data.count === 0 ? (
        <div className="match-kpi__empty">
          <p className="match-kpi__empty-line">
            이 동네는 조건에 맞는 거래가 없어요.
          </p>
          <p className="match-kpi__hint">
            좌측 필터에서 보증금/월세 범위를 넓혀보세요.
          </p>
        </div>
      ) : (
        <>
          <div className="match-kpi__primary">
            <span className="match-kpi__count tabular">
              {data.count.toLocaleString()}
            </span>
            <span className="match-kpi__count-unit">건</span>
          </div>

          <dl className="match-kpi__stats">
            <div className="match-kpi__stat">
              <dt className="match-kpi__stat-label">평균 환산월세</dt>
              <dd className="match-kpi__stat-value tabular">
                {data.avg_converted_rent != null
                  ? `${data.avg_converted_rent}만원`
                  : '-'}
              </dd>
            </div>
            <div className="match-kpi__stat">
              <dt className="match-kpi__stat-label">평균 보증금</dt>
              <dd className="match-kpi__stat-value tabular">
                {data.avg_deposit != null
                  ? `${data.avg_deposit.toLocaleString()}만원`
                  : '-'}
              </dd>
            </div>
          </dl>

          <p className="mono-label match-kpi__ratio">
            MATCH RATIO:{' '}
            <span className="tabular">
              {data.match_ratio != null ? `${data.match_ratio}%` : '-'}
            </span>{' '}
            (period total {data.period_total.toLocaleString()})
          </p>
        </>
      )}

      <Link to={exploreHref} className="match-kpi__cta">
        이 동을 더 깊게 탐색 →
      </Link>

      <p className="mono-label match-kpi__source">
        SOURCE: 국토부 실거래 (최근 6개월) · 현재 매물 재고 아님
      </p>
    </section>
  );
}

function MatchKpiSkeleton() {
  return (
    <div className="match-kpi__skeleton" role="status" aria-live="polite">
      <span className="match-kpi__skeleton-line match-kpi__skeleton-line--lg" />
      <span className="match-kpi__skeleton-line" />
      <span className="match-kpi__skeleton-line" />
    </div>
  );
}
