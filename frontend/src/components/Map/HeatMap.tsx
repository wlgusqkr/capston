// Leaflet 기반 행정동 히트맵 (SPEC 6.1) — VWorld 타일.
//
// 카카오맵 SDK 통합이 폴리곤 렌더링에서 일관성 문제를 일으켜 다시 Leaflet으로
// 복원. 타일은 VWorld(국토교통부) — 한국어 지명·도로·지하철이 OSM보다 풍부.
//
// /seoul_dongs.geojson 정적 파일에서 425개 행정동 경계를 1회 로드하고
// feature.properties.adm_cd === dong.slug 로 score 데이터와 조인한다.
//
// VWorld 키: frontend/.env 의 VITE_VWORLD_API_KEY.
//   - 키 없으면 CartoDB Voyager 타일로 폴백 (시각적으로 무난, 그러나 한국어 라벨 약함).
//   - 키 발급: https://www.vworld.kr/ (회원가입 → 인증키 신청 → localhost 도메인 등록)

import { useMemo } from 'react';
import type { Layer } from 'leaflet';
import type { Feature, Geometry } from 'geojson';
import { GeoJSON, MapContainer, TileLayer, ZoomControl } from 'react-leaflet';

import { useDongGeoJson } from '@/hooks/useDongGeoJson';
import type { DongFeatureProps } from '@/hooks/useDongGeoJson';
import { MAP_POLYGON_STROKE, scoreToHeatmapColor } from '@/lib/colors';
import type { DongScore } from '@/types/api';

import 'leaflet/dist/leaflet.css';
import './HeatMap.css';

const SEOUL_CITY_HALL: [number, number] = [37.5665, 126.978];
const INITIAL_ZOOM = 11;

const VWORLD_KEY = import.meta.env.VITE_VWORLD_API_KEY as string | undefined;

// VWorld WMTS Base 타일 (한국 지명·지하철·도로 풍부).
const VWORLD_TILE_URL =
  VWORLD_KEY && VWORLD_KEY.length > 0
    ? `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png`
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

const VWORLD_ATTRIBUTION =
  VWORLD_KEY && VWORLD_KEY.length > 0
    ? '&copy; <a href="https://www.vworld.kr/">VWorld</a> 국토교통부'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

/** 레이어 탭 — 색상의 기준이 되는 점수 축. */
export type LayerKey = 'composite' | 'rent' | 'amenity' | 'transit';

export interface HeatMapProps {
  dongs: DongScore[];
  onDongClick?: (dong: DongScore) => void;
  /** 히트맵 폴리곤 표시 여부. false면 베이스맵만 보임. */
  heatmapVisible?: boolean;
  /** 색상 기준이 되는 점수 축. 기본 'composite' (가중합). */
  activeLayer?: LayerKey;
}

function pickScore(d: DongScore, layer: LayerKey): number {
  switch (layer) {
    case 'rent':
      return d.score_rent;
    case 'amenity':
      return d.score_amenity;
    case 'transit':
      return d.score_transit;
    case 'composite':
    default:
      return d.score;
  }
}

export default function HeatMap({
  dongs,
  onDongClick,
  heatmapVisible = true,
  activeLayer = 'composite',
}: HeatMapProps) {
  const { data: geojson, isLoading: geoLoading } = useDongGeoJson();

  const dongBySlug = useMemo(() => {
    const m: Record<string, DongScore> = {};
    for (const d of dongs) m[d.slug] = d;
    return m;
  }, [dongs]);

  // 가중치/레이어 변경마다 색이 갱신되도록 GeoJSON 레이어를 강제 리마운트.
  // 425개라 비용 약간 있지만 슬라이더 빈도 낮아 OK.
  const layerKey = useMemo(() => {
    let acc = 0;
    for (const d of dongs) acc = (acc + Math.round(pickScore(d, activeLayer) * 100)) | 0;
    return `${activeLayer}-${dongs.length}-${acc}-${heatmapVisible ? 1 : 0}`;
  }, [dongs, heatmapVisible, activeLayer]);

  // DESIGN_SYSTEM.md "Map-Specific Shapes":
  //   - default polygon stroke: 1px white @ 60% opacity
  //   - heatmap fill opacity: 0.7
  //   - cells without data: very faint Soft Stone wash
  const styleFn = (feature?: Feature<Geometry, DongFeatureProps>) => {
    const slug = feature?.properties?.adm_cd ?? '';
    const dong = dongBySlug[slug];
    const score = dong ? pickScore(dong, activeLayer) : null;
    return {
      color: MAP_POLYGON_STROKE.default.color,
      weight: MAP_POLYGON_STROKE.default.weight,
      opacity: MAP_POLYGON_STROKE.default.opacity,
      fillColor: score !== null ? scoreToHeatmapColor(score) : '#eeece7',
      fillOpacity: score !== null ? 0.7 : 0.15,
    };
  };

  const layerLabel: Record<LayerKey, string> = {
    composite: '종합점수',
    rent: '전월세 점수',
    amenity: '생활시설 점수',
    transit: '교통 점수',
  };

  const onEachFeature = (
    feature: Feature<Geometry, DongFeatureProps>,
    layer: Layer,
  ): void => {
    const slug = feature.properties.adm_cd;
    const dong = dongBySlug[slug];
    if (!dong) return;
    const shownScore = pickScore(dong, activeLayer);

    layer.bindTooltip(
      `<div class="map-tooltip__name">${dong.gu} · ${dong.name}</div>` +
        `<div class="map-tooltip__score tabular">${layerLabel[activeLayer]} ${shownScore.toFixed(1)}</div>`,
      { sticky: true, direction: 'top', offset: [0, -4], opacity: 1 },
    );

    layer.on({
      click: () => onDongClick?.(dong),
      mouseover: (e) =>
        (e.target as { setStyle: (s: object) => void }).setStyle({
          fillOpacity: 0.85,
          weight: MAP_POLYGON_STROKE.hover.weight,
          opacity: MAP_POLYGON_STROKE.hover.opacity,
        }),
      mouseout: (e) =>
        (e.target as { setStyle: (s: object) => void }).setStyle({
          fillOpacity: 0.7,
          weight: MAP_POLYGON_STROKE.default.weight,
          opacity: MAP_POLYGON_STROKE.default.opacity,
        }),
    });
  };

  if (geoLoading || !geojson) {
    return (
      <div className="map-root">
        <div className="map-fallback">
          <div className="map-fallback__title">지도 불러오는 중…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-root">
      <MapContainer
        center={SEOUL_CITY_HALL}
        zoom={INITIAL_ZOOM}
        zoomControl={false}
        scrollWheelZoom
        className="map-container"
      >
        <TileLayer attribution={VWORLD_ATTRIBUTION} url={VWORLD_TILE_URL} maxZoom={18} />
        <ZoomControl position="topright" />

        {heatmapVisible && (
          <GeoJSON
            key={layerKey}
            data={geojson}
            style={styleFn}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}
