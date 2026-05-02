// SimilarDongsSection — SPEC 6.3 Section 6 (비슷한 동네).
//
// 3-column card grid; each card is clickable and routes to /dong/:slug.
// Backend currently uses 3D euclidean distance over (rent/amenity/transit)
// to surface top-3 similar dongs (step 6A handoff). UX is unchanged when
// step 9 swaps in embedding-based similarity.
import { useNavigate } from 'react-router-dom';

import { Card } from '@/components/ui';
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
    <section className="similar" aria-label="비슷한 동네">
      <header className="similar__header">
        <h2 className="similar__title">비슷한 동네</h2>
        <p className="similar__hint">데이터 유사도 기반 추천</p>
      </header>

      <div className="similar__grid">
        {similar.map((d) => (
          <Card
            key={d.slug}
            padding="lg"
            as="button"
            className="similar__card"
            onClick={() => navigate(`/dong/${d.slug}`)}
            aria-label={`${d.gu} ${d.name}, 유사도 ${d.similarity_pct}%`}
          >
            <span className="similar__gu">{d.gu}</span>
            <span className="similar__name">{d.name}</span>
            <span className="similar__sim">
              유사도 <span className="tabular">{d.similarity_pct.toFixed(1)}</span>%
            </span>
          </Card>
        ))}
      </div>
    </section>
  );
}
