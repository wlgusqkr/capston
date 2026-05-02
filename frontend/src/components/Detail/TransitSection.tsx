// TransitSection — SPEC 6.3 Section 4 (교통).
//
// Layout (2 columns on desktop):
//   Left  — top 3 nearest subway stations (rank badge + name·line + distance/time).
//           Rank 1 emphasized via a success Badge; ranks 2/3 use neutral.
//   Right — bus stop card (large stop count + small route count).
import { Badge, Card } from '@/components/ui';
import type { DongDetail } from '@/types/api';

import './TransitSection.css';

interface TransitSectionProps {
  transit: DongDetail['transit'];
}

export default function TransitSection({ transit }: TransitSectionProps) {
  const stations = [...transit.nearest_stations].sort((a, b) => a.rank - b.rank);

  return (
    <section className="transit" aria-label="교통">
      <header className="transit__header">
        <h2 className="transit__title">교통</h2>
      </header>

      <div className="transit__grid">
        <Card padding="lg" className="transit__stations" aria-label="가까운 지하철역 3곳">
          <h3 className="transit__subtitle">가까운 지하철역</h3>
          <ol className="transit__station-list">
            {stations.map((s) => {
              const isFirst = s.rank === 1;
              const variant: 'success' | 'neutral' = isFirst ? 'success' : 'neutral';
              return (
                <li
                  key={`${s.rank}-${s.name}`}
                  className={`transit__station${
                    isFirst ? ' transit__station--top' : ''
                  }`}
                >
                  <div className="transit__station-rank">
                    <Badge variant={variant} size="md">
                      {s.rank}위
                    </Badge>
                  </div>
                  <div className="transit__station-info">
                    <div className="transit__station-name">
                      {s.name}
                      <span className="transit__station-line"> · {s.line}</span>
                    </div>
                    <div className="transit__station-distance">
                      도보 <span className="tabular">{s.walking_min}</span>분
                      <span className="transit__station-sep"> · </span>
                      <span className="tabular">{s.walking_distance_m.toLocaleString()}</span>m
                    </div>
                  </div>
                </li>
              );
            })}
            {stations.length === 0 && (
              <li className="transit__station-empty">근처 지하철역 정보가 없습니다.</li>
            )}
          </ol>
        </Card>

        <Card padding="lg" className="transit__bus" aria-label="버스 정류장">
          <h3 className="transit__subtitle">버스</h3>
          <div className="transit__bus-metrics">
            <div className="transit__bus-metric">
              <span className="transit__bus-value tabular">{transit.bus.stop_count}</span>
              <span className="transit__bus-unit">정류장</span>
            </div>
            <div className="transit__bus-divider" aria-hidden="true" />
            <div className="transit__bus-metric transit__bus-metric--secondary">
              <span className="transit__bus-value-sub tabular">
                {transit.bus.route_count}
              </span>
              <span className="transit__bus-unit">노선</span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
