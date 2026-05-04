// AmenitySection — SPEC 6.3 Section 3 (편의시설).
//
// R-3 + A-7a (design-polish-v2.md): each row exposes 4 data cells:
//   name | score (count) | density per ㎢ | TOP X% rank percentile
// The 4th cell is computed on the frontend via lib/percentile.ts using the
// all-dongs /api/dongs/scores response (`useDongScores` already cached by
// MainMap → React Query usually dedups on this route).
//
// P-11 / D-4: the Badge used to encode the level (충분/보통/부족). Now that
// the row carries a numeric TOP X% cell, the verbal duplicate is removed —
// the score and rank percentile encode the same information without the
// ambiguous "ad-like" label the audit flagged.
import { useMemo } from 'react';

import { computeAmenityPercentile } from '@/lib/percentile';
import type { DongDetail, DongScore } from '@/types/api';

import './AmenitySection.css';

interface AmenitySectionProps {
  amenities: DongDetail['amenities'];
  /** All-dongs score table for the percentile compute. Optional — when
   *  absent (loading or error), the rank cell renders "—". */
  allDongs?: DongScore[];
  /** Slug of the dong currently being shown — needed to look up its
   *  score_amenity in the all-dongs table. */
  currentSlug: string;
}

export default function AmenitySection({
  amenities,
  allDongs,
  currentSlug,
}: AmenitySectionProps) {
  // Compute percentile once per (slug, allDongs identity). The category arg
  // is reserved for a future per-category distribution; today it folds back
  // to a single dong-level percentile (see lib/percentile.ts comment).
  const currentScore = useMemo(() => {
    if (!allDongs) return undefined;
    return allDongs.find((d) => d.slug === currentSlug)?.score_amenity;
  }, [allDongs, currentSlug]);

  return (
    <section
      className="detail-section amenity"
      aria-labelledby="amenity-heading"
    >
      <p className="mono-label detail-section__eyebrow" aria-hidden="true">
        AMENITIES
      </p>
      <header className="amenity__header">
        <h2 id="amenity-heading" className="detail-section__heading">
          편의시설
        </h2>
        <p className="amenity__hint">
          개수와 ㎢당 밀도, 서울 기준 상위 % (TOP) 함께 표시.
        </p>
      </header>

      <ul className="amenity__list">
        {amenities.map((item) => {
          const top =
            currentScore != null
              ? computeAmenityPercentile(allDongs, item.category, currentScore)
              : null;
          return (
            <li key={item.category} className="amenity__row">
              <span className="amenity__category">{item.category}</span>
              <span className="amenity__cell amenity__cell--count">
                <span className="amenity__cell-value tabular">{item.count}</span>
                <span className="amenity__cell-unit">개</span>
              </span>
              <span className="amenity__cell amenity__cell--density">
                <span className="amenity__cell-value tabular">
                  {item.density_per_km2.toFixed(1)}
                </span>
                <span className="amenity__cell-unit">/㎢</span>
              </span>
              <span className="amenity__cell amenity__cell--rank mono-label">
                {top == null ? '—' : `TOP ${top}%`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
