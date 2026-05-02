// ReviewSection — SPEC 6.3 Section 5 (자취생 리뷰).
//
// Aggregate header (avg rating + review count) plus 1~3 representative review
// cards. "전체 리뷰 보기 →" CTA opens an alert for now (full review page is
// out of scope until later).
import { Button, Card } from '@/components/ui';
import type { DongDetail } from '@/types/api';

import './ReviewSection.css';

interface ReviewSectionProps {
  reviews: DongDetail['reviews'];
}

/** Render a 5-star row. Filled stars are tinted with secondary (warm orange);
 *  empty stars use border-strong gray.
 */
function Stars({ rating, ariaLabel }: { rating: number; ariaLabel?: string }) {
  // Render integer stars; sub-integer ratings (e.g. 4.3) round half-up for display.
  const filled = Math.round(rating);
  return (
    <span
      className="review__stars"
      role="img"
      aria-label={ariaLabel ?? `${rating}점`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`review__star${i <= filled ? ' review__star--filled' : ''}`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function ReviewSection({ reviews }: ReviewSectionProps) {
  return (
    <section className="review" aria-label="자취생 리뷰">
      <header className="review__header">
        <div className="review__heading-group">
          <h2 className="review__title">자취생 리뷰</h2>
          <div className="review__summary-line">
            <Stars
              rating={reviews.avg_rating}
              ariaLabel={`평균 ${reviews.avg_rating}점`}
            />
            <span className="review__avg tabular">{reviews.avg_rating.toFixed(1)}</span>
            <span className="review__count">
              · 리뷰 <span className="tabular">{reviews.count}</span>개
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="md"
          onClick={() => alert('전체 리뷰 페이지는 추후 구현 예정입니다.')}
        >
          전체 리뷰 보기 →
        </Button>
      </header>

      <div className="review__cards">
        {reviews.representatives.map((r, idx) => (
          <Card key={`${r.title}-${idx}`} padding="lg" className="review__card">
            <div className="review__card-meta">
              <h3 className="review__card-title">{r.title}</h3>
              <div className="review__card-author">{r.author_school}</div>
            </div>
            <div className="review__card-rating">
              <Stars rating={r.rating} ariaLabel={`${r.rating}점`} />
            </div>
            <p className="review__card-body">{r.body}</p>
            <time className="review__card-date" dateTime={r.created_at}>
              {r.created_at}
            </time>
          </Card>
        ))}
        {reviews.representatives.length === 0 && (
          <Card padding="lg" className="review__empty">
            아직 등록된 리뷰가 없습니다. 첫 리뷰를 남겨주세요.
          </Card>
        )}
      </div>
    </section>
  );
}
