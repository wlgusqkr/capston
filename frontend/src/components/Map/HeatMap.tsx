// Leaflet heatmap of Seoul 행정동 polygons (SPEC 6.1).
//
// Real boundary GeoJSON loaded once from /seoul_dongs.geojson and joined with
// score data by feature.properties.adm_cd === dong.slug. The polygon color
// follows the composite score; tooltip shows the gu·name + numeric score.
import { useMemo } from 'react';
import type { Layer } from 'leaflet';
import type { Feature, Geometry } from 'geojson';
import { GeoJSON, MapContainer, TileLayer, ZoomControl } from 'react-leaflet';

import { useDongGeoJson } from '@/hooks/useDongGeoJson';
import { MAP_POLYGON_STROKE, scoreToHeatmapColor } from '@/lib/colors';
import type { DongFeatureProps } from '@/hooks/useDongGeoJson';
import type { DongScore } from '@/types/api';

import 'leaflet/dist/leaflet.css';
import './HeatMap.css';

const SEOUL_CITY_HALL: [number, number] = [37.5665, 126.978];
const INITIAL_ZOOM = 11;

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface HeatMapProps {
  dongs: DongScore[];
  onDongClick?: (dong: DongScore) => void;
}

export default function HeatMap({ dongs, onDongClick }: HeatMapProps) {
  const { data: geojson, isLoading: geoLoading } = useDongGeoJson();

  // slug → DongScore 룩업. 가중치 변경마다 dongs 새 객체이므로 useMemo.
  const dongBySlug = useMemo(() => {
    const map = new Map<string, DongScore>();
    for (const d of dongs) map.set(d.slug, d);
    return map;
  }, [dongs]);

  // 각 Feature에 부착할 이벤트/툴팁 핸들러.
  // GeoJSON은 dongs/key가 바뀌어도 layer를 다시 그리지 않으므로
  // setStyle을 통해 색상 갱신을 하려면 ref + 외부 useEffect가 필요한데,
  // 여기서는 key prop으로 강제 리마운트하여 단순화한다 (425개라 부담 적음).
  const onEachFeature = (feature: Feature<Geometry, DongFeatureProps>, layer: Layer) => {
    const props = feature.properties;
    const slug = props.adm_cd;
    const dong = dongBySlug.get(slug);
    if (!dong) return;

    layer.bindTooltip(
      `<div class="map-tooltip"><div class="map-tooltip__name">${dong.gu} · ${dong.name}</div>` +
        `<div class="map-tooltip__score tabular">종합점수 ${dong.score.toFixed(1)}</div></div>`,
      { sticky: true, direction: 'top', offset: [0, -4], opacity: 1 },
    );

    layer.on({
      click: () => onDongClick?.(dong),
      mouseover: (e) =>
        (e.target as { setStyle: (s: object) => void }).setStyle({ fillOpacity: 0.85, weight: 1.5 }),
      mouseout: (e) =>
        (e.target as { setStyle: (s: object) => void }).setStyle({ fillOpacity: 0.6, weight: 0.5 }),
    });
  };

  const styleFn = (feature?: Feature<Geometry, DongFeatureProps>) => {
    if (!feature) {
      return { color: MAP_POLYGON_STROKE.light, weight: 0.5, fillOpacity: 0.6 };
    }
    const slug = feature.properties.adm_cd;
    const dong = dongBySlug.get(slug);
    return {
      color: MAP_POLYGON_STROKE.light,
      weight: 0.5,
      fillColor: dong ? scoreToHeatmapColor(dong.score) : '#cccccc',
      fillOpacity: dong ? 0.6 : 0.15,
    };
  };

  // dongs 변경 시 GeoJSON 레이어 강제 리마운트 → 새 색상 적용.
  // 425개 폴리곤이지만 GeoJSON 단일 레이어라 비용 작음.
  const geoKey = useMemo(() => {
    let acc = 0;
    for (const d of dongs) {
      // 가중치가 바뀌면 score가 바뀌므로 합으로 디지스트
      acc = (acc + d.score * 100) | 0;
    }
    return `geo-${dongs.length}-${acc}`;
  }, [dongs]);

  return (
    <div className="map-root">
      <MapContainer
        center={SEOUL_CITY_HALL}
        zoom={INITIAL_ZOOM}
        zoomControl={false}
        scrollWheelZoom
        className="map-container"
      >
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
        <ZoomControl position="topright" />

        {!geoLoading && geojson && (
          <GeoJSON
            key={geoKey}
            data={geojson}
            style={styleFn}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}
