// AmenitySection — SPEC 6.3 Section 3 (편의시설).
//
// 8 categories rendered as a 2-column card grid. Each card shows category name,
// count, density per km², and a level badge (sufficient → success, normal →
// warning, lacking → danger).
import { Badge, Card } from '@/components/ui';
import type { AmenityLevel, DongDetail } from '@/types/api';

import './AmenitySection.css';

interface AmenitySectionProps {
  amenities: DongDetail['amenities'];
}

const LEVEL_LABELS: Record<
  AmenityLevel,
  { text: string; variant: 'success' | 'warning' | 'danger' }
> = {
  sufficient: { text: '충분', variant: 'success' },
  normal: { text: '보통', variant: 'warning' },
  lacking: { text: '부족', variant: 'danger' },
};

export default function AmenitySection({ amenities }: AmenitySectionProps) {
  return (
    <section className="amenity" aria-label="편의시설">
      <header className="amenity__header">
        <h2 className="amenity__title">편의시설</h2>
        <p className="amenity__hint">서울 전체 기준 상위 33% 충분 / 중간 33% 보통 / 하위 33% 부족</p>
      </header>

      <div className="amenity__grid">
        {amenities.map((item) => {
          const label = LEVEL_LABELS[item.level];
          return (
            <Card key={item.category} padding="lg" className="amenity__card">
              <div className="amenity__card-row">
                <h3 className="amenity__category">{item.category}</h3>
                <Badge variant={label.variant}>{label.text}</Badge>
              </div>
              <div className="amenity__metrics">
                <div className="amenity__metric">
                  <span className="amenity__metric-value tabular">{item.count}</span>
                  <span className="amenity__metric-unit">개</span>
                </div>
                <div className="amenity__metric amenity__metric--secondary">
                  <span className="amenity__metric-value tabular">
                    {item.density_per_km2.toFixed(1)}
                  </span>
                  <span className="amenity__metric-unit">개/㎢</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
