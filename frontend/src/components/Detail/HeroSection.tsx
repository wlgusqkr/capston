// HeroSection — top of dong detail page (SPEC 6.3 Section 1).
//
// Layout (two columns on desktop):
//   Left  — gu (caption) + dong name (h1) + 종합 점수 (Score lg) +
//           vs Seoul avg badge (success/warning/danger) + 한 줄 요약
//   Right — 280px square mini map with a single marker at centroid
//
// The mini map uses its own <MapContainer> — react-leaflet supports multiple
// independent maps without conflict. scrollWheelZoom is disabled so it stays
// out of the way of page scrolling.
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';

import { Badge, Card, Score } from '@/components/ui';
import { MAP_POLYGON_STROKE, scoreToHeatmapColor } from '@/lib/colors';
import type { DongDetail } from '@/types/api';

import 'leaflet/dist/leaflet.css';
import './HeroSection.css';

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface HeroSectionProps {
  detail: DongDetail;
}

/** Choose a Badge variant for the vs-seoul-avg label.
 *  Positive (better than average) → success, near zero → warning, negative → danger.
 */
function vsBadgeVariant(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 5) return 'success';
  if (pct <= -5) return 'danger';
  return 'warning';
}

function vsBadgeLabel(pct: number): string {
  // pct is already a percentage delta from baseline (step 6A: baseline 65).
  // Render with explicit sign and pp suffix so it reads as a percentage point delta.
  const sign = pct > 0 ? '+' : pct < 0 ? '' : '±';
  return `서울 평균 ${sign}${pct.toFixed(1)}%`;
}

export default function HeroSection({ detail }: HeroSectionProps) {
  const center: [number, number] = [detail.centroid.lat, detail.centroid.lng];
  const polygonColor = scoreToHeatmapColor(detail.score);

  return (
    <section className="hero" aria-label="동네 개요">
      <div className="hero__grid">
        <div className="hero__left">
          <p className="hero__gu">{detail.gu}</p>
          <h1 className="hero__name">{detail.name}</h1>

          <div className="hero__score-row">
            <Score
              value={Math.round(detail.score)}
              unit="/ 100"
              size="lg"
              ariaLabel={`${detail.name} 종합 점수 ${detail.score.toFixed(1)}점`}
            />
            <Badge variant={vsBadgeVariant(detail.vs_seoul_avg_pct)} size="md">
              {vsBadgeLabel(detail.vs_seoul_avg_pct)}
            </Badge>
          </div>

          <p className="hero__summary">{detail.summary}</p>
        </div>

        <Card className="hero__map-card" padding="none" aria-label="동네 위치 미니 지도">
          <div className="hero__map">
            <MapContainer
              center={center}
              zoom={14}
              scrollWheelZoom={false}
              zoomControl={false}
              dragging={false}
              doubleClickZoom={false}
              className="hero__map-container"
              attributionControl={false}
            >
              <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
              <CircleMarker
                center={center}
                radius={10}
                pathOptions={{
                  color: MAP_POLYGON_STROKE.light,
                  weight: 2,
                  fillColor: polygonColor,
                  fillOpacity: 1,
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} permanent>
                  <span className="hero__map-pin-label">
                    {detail.gu} · {detail.name}
                  </span>
                </Tooltip>
              </CircleMarker>
            </MapContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}
