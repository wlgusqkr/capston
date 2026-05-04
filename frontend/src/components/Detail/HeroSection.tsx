// HeroSection — top of dong detail page (SPEC 6.3 Section 1).
// Rebuilt for R-3 (design-polish-v2.md):
//
//   ┌─── HERO ──────────────────────────────────────────┐
//   │ 노원구 (caption, NOT mono — Codex finding #1)       │
//   │ 공릉1동 (60px Page Display)                          │
//   │ 매일 데이터 갱신 · ... (18px subtle)                  │
//   │ ┌──────────────┐  ┌─────────────────────────────┐ │
//   │ │ Score lg     │  │ 280×280 mini-map (no Card)  │ │
//   │ │ 3× MetricBar │  └─────────────────────────────┘ │
//   │ │              │  [비교] [찜] [공유] page-local    │
//   │ └──────────────┘                                  │
//   └──────────────────────────────────────────────────┘
//
// No <Card> wrapper anywhere — hero is its own composition. Height:
// `min(520px, calc(100vh - 56px))` so first fold shows hero + start of
// next section.
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';

import { Button, MetricBar, Score } from '@/components/ui';
import { MAP_POLYGON_STROKE, scoreToHeatmapColor } from '@/lib/colors';
import type { DongDetail, DongScore } from '@/types/api';

import 'leaflet/dist/leaflet.css';
import './HeroSection.css';

const VWORLD_KEY = import.meta.env.VITE_VWORLD_API_KEY as string | undefined;
const TILE_URL =
  VWORLD_KEY && VWORLD_KEY.length > 0
    ? `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png`
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  VWORLD_KEY && VWORLD_KEY.length > 0
    ? '&copy; VWorld'
    : '&copy; OpenStreetMap &copy; CARTO';

interface HeroSectionProps {
  detail: DongDetail;
  /** Score breakdown for the current dong, joined client-side from
   *  /api/dongs/scores. Optional — when absent the MetricBar block
   *  renders zeros (rare; same /scores call already powers percentile). */
  breakdown?: Pick<DongScore, 'score_rent' | 'score_amenity' | 'score_transit'>;
  onAddCompare: () => void;
  onFavorite: () => void;
  onShare: () => void;
}

export default function HeroSection({
  detail,
  breakdown,
  onAddCompare,
  onFavorite,
  onShare,
}: HeroSectionProps) {
  const center: [number, number] = [detail.centroid.lat, detail.centroid.lng];
  const polygonColor = scoreToHeatmapColor(detail.score);

  return (
    <section className="hero" aria-label="동네 개요">
      {/* 노원구 — Pretendard 14px subtle, NOT mono.
       *  Codex flagged the initial draft's mono-on-Korean misuse (R-3 #1). */}
      <p className="hero__gu">{detail.gu}</p>
      <h1 className="hero__name">{detail.name}</h1>
      <p className="hero__summary">{detail.summary}</p>

      <div className="hero__split">
        <div className="hero__data">
          <Score
            value={Math.round(detail.score)}
            unit="/ 100"
            size="lg"
            ariaLabel={`${detail.name} 종합 점수 ${detail.score.toFixed(1)}점`}
          />
          {breakdown ? (
            <div className="hero__bars" aria-label="점수 구성">
              <MetricBar
                label="전월세"
                value={breakdown.score_rent}
                tone="score"
              />
              <MetricBar
                label="생활시설"
                value={breakdown.score_amenity}
                tone="score"
              />
              <MetricBar
                label="교통"
                value={breakdown.score_transit}
                tone="score"
              />
            </div>
          ) : (
            // Loading: hide the bars entirely instead of rendering 0%.
            // Codex flagged the prior `?? 0` fallback as "false data, not
            // a loading state" — a 0% bar reads as a verdict.
            <div className="hero__bars hero__bars--loading" aria-busy="true" />
          )}
        </div>

        <div className="hero__aside">
          <div className="hero__map-container" aria-label="동네 위치 미니 지도">
            <MapContainer
              center={center}
              zoom={14}
              scrollWheelZoom={false}
              zoomControl={false}
              dragging={false}
              doubleClickZoom={false}
              className="hero__map-leaflet"
              attributionControl={false}
            >
              <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={18} />
              <CircleMarker
                center={center}
                radius={10}
                pathOptions={{
                  color: MAP_POLYGON_STROKE.light,
                  weight: 2,
                  fillColor: polygonColor,
                  fillOpacity: 1,
                }}
              />
            </MapContainer>
          </div>

          {/* Page-local action group (D-3, R-3 wireframe right column).
           *  Visible on first fold. After hero leaves viewport,
           *  DongDetail renders a scroll-sticky pill rail with the same 3
           *  actions. */}
          <div className="hero__actions" aria-label="동네 액션">
            <Button variant="secondary" size="md" onClick={onAddCompare}>
              비교에 추가
            </Button>
            <Button variant="secondary" size="md" onClick={onFavorite}>
              찜하기
            </Button>
            <Button variant="secondary" size="md" onClick={onShare}>
              공유
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
