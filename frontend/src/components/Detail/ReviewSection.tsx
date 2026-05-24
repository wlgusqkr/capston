// ReviewSection — SPEC 6.3 Section 5 (자취생 리뷰).
import { Button } from '@/components/ui';
import type { AdongDetail } from '@/types/api';

interface ReviewSectionProps {
  reviews: AdongDetail['reviews'];
}

function Stars({ rating, ariaLabel }: { rating: number; ariaLabel?: string }) {
  const filled = Math.round(rating);
  return (
    <span
      className="inline-flex gap-[2px] text-feature-heading leading-none tracking-[0]"
      role="img"
      aria-label={ariaLabel ?? `${rating}점`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= filled ? 'text-warning' : 'text-divider'}
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
      className="max-w-[720px] pt-20 border-t border-divider"
      aria-labelledby="review-heading"
    >
      <p className="mono-label m-0 mb-3 text-text-subtle" aria-hidden="true">
        VOICES
      </p>
      <header className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div className="flex flex-col gap-2">
          <h2 id="review-heading" className="m-0 text-section-heading leading-[1.15] font-semibold text-text tracking-[-0.36px]">
            자취생 리뷰
          </h2>
          <div className="flex items-center gap-2 text-body-base text-text-muted tracking-normal">
            <Stars
              rating={reviews.avg_rating}
              ariaLabel={`평균 ${reviews.avg_rating}점`}
            />
            <span className="text-feature-heading font-normal text-text tabular">{reviews.avg_rating.toFixed(1)}</span>
            <span className="text-caption">
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

      <ul className="list-none m-0 p-0">
        {reviews.representatives.map((r, idx) => (
          <li key={`${r.title}-${idx}`} className="flex flex-col gap-2 py-4 border-b border-divider last:border-b-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="m-0 text-feature-heading leading-[1.3] font-semibold text-text">{r.title}</h3>
              <Stars rating={r.rating} ariaLabel={`${r.rating}점`} />
            </div>
            <div className="flex gap-2 text-caption text-text-subtle tracking-normal">
              <span>{r.author_school}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={r.created_at} className="tabular">{r.created_at}</time>
            </div>
            <p className="m-0 text-body-base leading-[1.6] text-text tracking-normal">{r.body}</p>
          </li>
        ))}
        {reviews.representatives.length === 0 && (
          <li className="py-5 text-center text-text-muted tracking-normal">
            아직 등록된 리뷰가 없어요. 첫 리뷰를 남겨주세요.
          </li>
        )}
      </ul>
    </section>
  );
}
