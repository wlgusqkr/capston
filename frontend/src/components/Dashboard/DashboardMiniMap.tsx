// DashboardMiniMap -- SPEC 4.3 mini map for the dashboard (1/4 of outlet).
//
// Separate from components/Map/HeatMap.tsx (which is frozen for MainMap).
// Reuses the same data hooks and color utilities.

import { useCallback, useMemo, useState } from 'react';
import L from 'leaflet';
import type { Feature, Geometry } from 'geojson';
import type { Layer, LeafletMouseEvent } from 'leaflet';
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';

import { useAdongGeoJson } from '@/hooks/useAdongGeoJson';
import type { AdongFeatureProps } from '@/hooks/useAdongGeoJson';
import {
  HEATMAP_LAYER_COLORS,
  HEATMAP_NO_DATA,
  MAP_POLYGON_STROKE,
  scoreToLayerColor,
} from '@/lib/colors';
import type { HeatmapLayerKey } from '@/lib/colors';
import type { AdongScore } from '@/types/api';

import 'leaflet/dist/leaflet.css';

const SEOUL_CENTER: [number, number] = [37.5665, 126.978];
const MINI_ZOOM = 11;

const VWORLD_KEY = import.meta.env.VITE_VWORLD_API_KEY as string | undefined;
const TILE_URL =
  VWORLD_KEY && VWORLD_KEY.length > 0
    ? `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png`
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR =
  VWORLD_KEY && VWORLD_KEY.length > 0
    ? '&copy; <a href="https://www.vworld.kr/">VWorld</a>'
    : '&copy; OpenStreetMap &copy; CARTO';

interface LayerOption {
  key: HeatmapLayerKey;
  label: string;
}

const LAYER_OPTIONS: LayerOption[] = [
  { key: 'composite', label: '종합' },
  { key: 'rent', label: '월세' },
  { key: 'activity', label: '활발도' },
  { key: 'youth', label: '청년' },
  { key: 'studio', label: '자취촌' },
  { key: 'safety', label: '안전' },
];

const LEGEND_LABELS: Record<HeatmapLayerKey, readonly [string, string]> = {
  composite: ['낮음', '높음'],
  rent: ['저렴', '비쌈'],
  activity: ['한산', '활발'],
  youth: ['낮음', '높음'],
  studio: ['낮음', '높음'],
  safety: ['위험', '안전'],
};

interface DashboardMiniMapProps {
  adongs: AdongScore[];
  selectedSlug: string | null;
  onAdongSelect: (slug: string) => void;
}

export default function DashboardMiniMap({
  adongs,
  selectedSlug,
  onAdongSelect,
}: DashboardMiniMapProps) {
  const navigate = useNavigate();
  const { data: geojson, isLoading: geoLoading } = useAdongGeoJson();
  const [activeLayer, setActiveLayer] = useState<HeatmapLayerKey>('composite');

  const dongByCode = useMemo(() => {
    const m: Record<string, AdongScore> = {};
    for (const d of adongs) m[d.code] = d;
    return m;
  }, [adongs]);

  const selectedAdong = useMemo(
    () => adongs.find((d) => d.slug === selectedSlug) ?? null,
    [adongs, selectedSlug],
  );

  const center: [number, number] = selectedAdong
    ? [selectedAdong.lat, selectedAdong.lng]
    : SEOUL_CENTER;

  // Force GeoJSON re-render on layer/data change
  const layerKey = useMemo(() => {
    let acc = 0;
    for (const d of adongs) acc = (acc + Math.round(d.score * 100)) | 0;
    return `mini-${activeLayer}-${adongs.length}-${acc}-${selectedSlug ?? ''}`;
  }, [adongs, activeLayer, selectedSlug]);

  const styleFn = useCallback(
    (feature?: Feature<Geometry, AdongFeatureProps>) => {
      const code = feature?.properties?.adm_cd2 ?? '';
      const adong = dongByCode[code];
      const isSelected = adong?.slug === selectedSlug;

      if (!adong) {
        return {
          color: MAP_POLYGON_STROKE.default.color,
          weight: MAP_POLYGON_STROKE.default.weight,
          opacity: MAP_POLYGON_STROKE.default.opacity,
          fillColor: HEATMAP_NO_DATA,
          fillOpacity: 0.15,
        };
      }

      // For composite, use adong.score. Other layers fall back to composite
      // until per-layer scores are available from the API.
      const score = adong.score;
      const fillColor = scoreToLayerColor(score, activeLayer);

      return {
        color: isSelected
          ? MAP_POLYGON_STROKE.selected.color
          : MAP_POLYGON_STROKE.default.color,
        weight: isSelected
          ? MAP_POLYGON_STROKE.selected.weight
          : MAP_POLYGON_STROKE.default.weight,
        opacity: isSelected
          ? MAP_POLYGON_STROKE.selected.opacity
          : MAP_POLYGON_STROKE.default.opacity,
        fillColor,
        fillOpacity: 0.7,
      };
    },
    [dongByCode, selectedSlug, activeLayer],
  );

  const onEachFeature = useCallback(
    (feature: Feature<Geometry, AdongFeatureProps>, layer: Layer) => {
      const code = feature.properties.adm_cd2 ?? '';
      const adong = dongByCode[code];
      if (!adong) return;

      layer.bindTooltip(
        `<div class="map-tooltip__name">${adong.gu} ${adong.name}</div>` +
          `<div class="map-tooltip__score tabular">종합 ${adong.score.toFixed(1)}</div>`,
        { sticky: true, direction: 'top', offset: [0, -4], opacity: 1 },
      );

      layer.on({
        click: (e: LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          onAdongSelect(adong.slug);
        },
        mouseover: (e) =>
          (e.target as { setStyle: (s: object) => void }).setStyle({
            fillOpacity: 0.85,
            weight: MAP_POLYGON_STROKE.hover.weight,
          }),
        mouseout: (e) => {
          const isSelected = adong.slug === selectedSlug;
          (e.target as { setStyle: (s: object) => void }).setStyle({
            fillOpacity: 0.7,
            weight: isSelected
              ? MAP_POLYGON_STROKE.selected.weight
              : MAP_POLYGON_STROKE.default.weight,
          });
        },
      });
    },
    [dongByCode, onAdongSelect, selectedSlug],
  );

  const handleExpand = useCallback(() => {
    navigate(selectedSlug ? `/?adong=${selectedSlug}` : '/');
  }, [navigate, selectedSlug]);

  if (geoLoading || !geojson) {
    return (
      <div className="w-full h-full min-h-[300px] bg-surface-alt rounded-card border border-border flex items-center justify-center">
        <span className="text-caption text-text-muted">지도 불러오는 중...</span>
      </div>
    );
  }

  const legendColors = HEATMAP_LAYER_COLORS[activeLayer];
  const [legendLow, legendHigh] = LEGEND_LABELS[activeLayer];

  return (
    <div className="relative w-full h-full min-h-[300px] rounded-card overflow-hidden border border-border">
      <MapContainer
        center={center}
        zoom={MINI_ZOOM}
        zoomControl={false}
        scrollWheelZoom={true}
        dragging={true}
        attributionControl={false}
        style={{ width: '100%', height: '100%', minHeight: 300 }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
        <GeoJSON
          key={layerKey}
          data={geojson}
          style={styleFn}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* Layer toggle chips */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap gap-1.5">
        {LAYER_OPTIONS.map((opt) => {
          const isActive = opt.key === activeLayer;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setActiveLayer(opt.key)}
              className={`px-2.5 py-1 rounded-full text-caption font-medium transition-colors cursor-pointer border-none ${
                isActive
                  ? 'bg-primary-soft text-primary'
                  : 'bg-surface/90 text-text-muted hover:text-text hover:bg-surface'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Expand button */}
      <button
        type="button"
        onClick={handleExpand}
        className="absolute top-3 right-3 z-[1000] w-8 h-8 rounded-md bg-surface/90 border border-border flex items-center justify-center text-text-muted hover:text-text hover:bg-surface cursor-pointer transition-colors"
        aria-label="맵뷰에서 보기"
        title="맵뷰에서 보기"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" />
        </svg>
      </button>

      {/* Color legend */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-surface/90 rounded-md px-2.5 py-2 flex flex-col gap-1">
        <div className="flex gap-0.5">
          {legendColors.map((color, i) => (
            <div
              key={i}
              className="w-5 h-3 first:rounded-l-sm last:rounded-r-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="flex justify-between text-caption text-text-subtle">
          <span>{legendLow}</span>
          <span>{legendHigh}</span>
        </div>
      </div>
    </div>
  );
}
