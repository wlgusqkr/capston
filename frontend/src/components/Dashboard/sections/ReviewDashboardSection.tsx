// Dashboard ReviewDashboardSection -- SPEC 4.4 Section G (자취생 리뷰).
//
// Widgets:
//   1. 평균 별점 + 리뷰 수 — 큰 별점 (countup) + 별 5개
//   2. 리뷰 카드 가로 스크롤 — reviews.representatives
//   3. 리뷰 작성 CTA — Detail 페이지로 이동
//
// Data: DongDetail.reviews (no new API)

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { DongDetail } from '@/types/api';

interface ReviewDashboardSectionProps {
  reviews: DongDetail['reviews'] | undefined;
  dongSlug: string;
  dongName: string | undefined;
}

/** Countup hook for the avg_rating big number (mirrors KpiCard pattern). */
function useCountup(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * target);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}

/** Star rating display: filled stars based on rounded rating. */
function Stars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const filled = Math.round(rating);
  const sizeClass =
    size === 'lg'
      ? 'text-section-heading'
      : size === 'sm'
        ? 'text-body-base'
        : 'text-feature-heading';
  return (
    <span
      className={`inline-flex gap-[2px] ${sizeClass} leading-none tracking-[0]`}
      role="img"
      aria-label={`${rating}점`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= filled ? 'text-secondary' : 'text-divider'}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function ReviewDashboardSection({
  reviews,
  dongSlug,
  dongName,
}: ReviewDashboardSectionProps) {
  const navigate = useNavigate();
  const avgRating = reviews?.avg_rating ?? 0;
  const reviewCount = reviews?.count ?? 0;
  const representatives = reviews?.representatives ?? [];

  const animatedRating = useCountup(avgRating);

  return (
    <div className="flex flex-col gap-5">
      {/* Row 1: Avg rating + Review CTA */}
      <div className="grid grid-cols-3 gap-5">
        {/* 1. 평균 별점 + 리뷰 수 */}
        <Card padding="lg">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            평균 별점
          </h3>
          {reviews && reviewCount > 0 ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
                {animatedRating.toFixed(1)}
              </p>
              <Stars rating={avgRating} size="lg" />
              <p className="m-0 text-caption text-text-muted">
                총 <span className="tabular">{reviewCount.toLocaleString()}</span>개 리뷰
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[140px] gap-2">
              <Stars rating={0} size="lg" />
              <p className="m-0 text-caption text-text-muted">아직 리뷰가 없습니다</p>
            </div>
          )}
        </Card>

        {/* 3. 리뷰 작성 CTA (placed top-right for visibility) */}
        <Card padding="lg" className="col-span-2">
          <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
            리뷰 작성
          </h3>
          <div className="flex flex-col items-start gap-3">
            <p className="m-0 text-body-base text-text">
              {dongName ? `${dongName}에서 자취하고 계신가요?` : '이 동네에서 자취하고 계신가요?'}
            </p>
            <p className="m-0 text-caption text-text-muted">
              자취 경험을 남기면 다른 학생들에게 큰 도움이 됩니다.
            </p>
            <Button
              variant="filled"
              size="md"
              onClick={() => navigate(`/dong/${encodeURIComponent(dongSlug)}`)}
            >
              이 동네 리뷰 작성하기 →
            </Button>
          </div>
        </Card>
      </div>

      {/* Row 2: 리뷰 카드 가로 스크롤 */}
      <Card padding="lg">
        <h3 className="m-0 mb-3 text-feature-heading leading-[1.3] font-semibold text-text">
          대표 리뷰
        </h3>
        {representatives.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {representatives.map((r, idx) => (
              <article
                key={`${r.title}-${idx}`}
                className="shrink-0 min-w-[280px] max-w-[320px] flex flex-col gap-2 p-4 rounded-card border border-divider bg-surface"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="m-0 text-body-base font-semibold text-text leading-[1.3] line-clamp-2">
                    {r.title}
                  </h4>
                  <Stars rating={r.rating} size="sm" />
                </div>
                <p className="m-0 text-caption text-text leading-[1.5] line-clamp-2">
                  {r.body}
                </p>
                <div className="flex items-center gap-2 text-caption text-text-subtle mt-auto">
                  <span className="truncate">{r.author_school}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={r.created_at} className="tabular shrink-0">
                    {r.created_at}
                  </time>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[140px] text-text-muted text-caption">
            아직 등록된 리뷰가 없습니다. 첫 리뷰를 남겨주세요.
          </div>
        )}
      </Card>
    </div>
  );
}
