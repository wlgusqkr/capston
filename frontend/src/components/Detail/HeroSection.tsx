// HeroSection — top of dong detail page (SPEC 6.3 Section 1).
//
// 좌: 구·동 이름 + 종합 점수 + vs 서울 평균 배지 + 한 줄 요약
// 우: 280px 미니 지도 (Leaflet + VWorld). 동 중심에 점수 색상 마커.

import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';

import { Badge, Card, Score } from '@/components/ui';
import { MAP_POLYGON_STROKE, scoreToHeatmapColor } from '@/lib/colors';
import type { DongDetail } from '@/types/api';

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
}

function vsBadgeVariant(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 5) return 'success';
  if (pct <= -5) return 'danger';
  return 'warning';
}

function vsBadgeLabel(pct: number): string {
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
