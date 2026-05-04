// ReviewSection — SPEC 6.3 Section 5 (자취생 리뷰).
//
// R-3 (design-polish-v2.md): Card wrappers stripped. Mono English eyebrow
// "VOICES" + Korean Section Heading. Reviews are unframed rows separated
// by hairlines, matching the transaction-row vocabulary.
import { Button } from '@/components/ui';
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
    <section
      className="detail-section review"
      aria-labelledby="review-heading"
    >
      <p className="mono-label detail-section__eyebrow" aria-hidden="true">
        VOICES
      </p>
      <header className="review__header">
        <div className="review__heading-group">
          <h2 id="review-heading" className="detail-section__heading">
            자취생 리뷰
          </h2>
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

      <ul className="review__list">
        {reviews.representatives.map((r, idx) => (
          <li key={`${r.title}-${idx}`} className="review__item">
            <div className="review__item-head">
              <h3 className="review__item-title">{r.title}</h3>
              <Stars rating={r.rating} ariaLabel={`${r.rating}점`} />
            </div>
            <div className="review__item-meta">
              <span>{r.author_school}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={r.created_at}>{r.created_at}</time>
            </div>
            <p className="review__item-body">{r.body}</p>
          </li>
        ))}
        {reviews.representatives.length === 0 && (
          <li className="review__empty">
            아직 등록된 리뷰가 없어요. 첫 리뷰를 남겨주세요.
          </li>
        )}
      </ul>
    </section>
  );
}
