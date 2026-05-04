// TransitSection — SPEC 6.3 Section 4 (교통).
//
// R-3 (design-polish-v2.md): Card wrappers stripped. Mono English eyebrow
// "TRANSIT" + Korean Section Heading. Inner Feature headings (가까운
// 지하철역, 버스) stay normal-weight Pretendard, NOT mono — they are user
// categories not system markers.
//
// Layout (2 columns on desktop):
//   Left  — top 3 nearest subway stations (rank badge + name·line + distance).
//   Right — bus stop card (large stop count + small route count).
import { Badge } from '@/components/ui';
import type { DongDetail } from '@/types/api';

import './TransitSection.css';

interface TransitSectionProps {
  transit: DongDetail['transit'];
}

export default function TransitSection({ transit }: TransitSectionProps) {
  const stations = [...transit.nearest_stations].sort((a, b) => a.rank - b.rank);

  return (
    <section
      className="detail-section transit"
      aria-labelledby="transit-heading"
    >
      <p className="mono-label detail-section__eyebrow" aria-hidden="true">
        TRANSIT
      </p>
      <h2 id="transit-heading" className="detail-section__heading">
        교통
      </h2>

      <div className="transit__grid">
        <div className="transit__block" aria-label="가까운 지하철역 3곳">
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
        </div>

        <div className="transit__block" aria-label="버스 정류장">
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
        </div>
      </div>
    </section>
  );
}
