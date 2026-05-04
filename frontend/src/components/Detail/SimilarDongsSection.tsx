// SimilarDongsSection — SPEC 6.3 Section 6 (비슷한 동네).
//
// R-3 (design-polish-v2.md): Card wrappers stripped. Mono English eyebrow
// "NEARBY" + Korean Section Heading. Each similar dong is a clickable
// unframed row separated by hairlines.
import { useNavigate } from 'react-router-dom';

import type { DongDetail } from '@/types/api';

import './SimilarDongsSection.css';

interface SimilarDongsSectionProps {
  similar: DongDetail['similar_dongs'];
}

export default function SimilarDongsSection({ similar }: SimilarDongsSectionProps) {
  const navigate = useNavigate();

  if (similar.length === 0) {
    return null;
  }

  return (
    <section
      className="detail-section similar"
      aria-labelledby="similar-heading"
    >
      <p className="mono-label detail-section__eyebrow" aria-hidden="true">
        NEARBY
      </p>
      <header className="similar__header">
        <h2 id="similar-heading" className="detail-section__heading">
          비슷한 동네
        </h2>
        <p className="similar__hint">데이터 유사도 기반 추천</p>
      </header>

      <ul className="similar__list">
        {similar.map((d) => (
          <li key={d.slug} className="similar__row">
            <button
              type="button"
              className="similar__row-btn"
              onClick={() => navigate(`/dong/${d.slug}`)}
              aria-label={`${d.gu} ${d.name}, 유사도 ${d.similarity_pct}%`}
            >
              <span className="similar__titles">
                <span className="similar__gu">{d.gu}</span>
                <span className="similar__name">{d.name}</span>
              </span>
              <span className="similar__sim">
                유사도 <span className="tabular">{d.similarity_pct.toFixed(1)}</span>%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
