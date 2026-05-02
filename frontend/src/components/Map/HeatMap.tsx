// Leaflet heatmap of dong polygons (SPEC 6.1).
//
// For now each dong is a small rectangle around its centroid (`boundingPolygon`)
// because the backend ships only 5 dummies and no MultiPolygon GeoJSON yet.
// Once step 10 loads /public/seoul_dongs.geojson, replace the <Polygon>.map with
// a single <GeoJSON> layer + style callback (see notes in src/lib/geo.ts).
import { MapContainer, Polygon, TileLayer, Tooltip, ZoomControl } from 'react-leaflet';

import { MAP_POLYGON_STROKE, scoreToHeatmapColor } from '@/lib/colors';
import { boundingPolygon } from '@/lib/geo';
import type { DongScore } from '@/types/api';

import 'leaflet/dist/leaflet.css';
import './HeatMap.css';

/** Seoul City Hall — initial map center per SPEC 6.1 wording. */
const SEOUL_CITY_HALL: [number, number] = [37.5665, 126.978];
const INITIAL_ZOOM = 11;

/** OpenStreetMap default tile, plus a dimmer overlay class for theme aware UX. */
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface HeatMapProps {
  dongs: DongScore[];
  onDongClick?: (dong: DongScore) => void;
}

export default function HeatMap({ dongs, onDongClick }: HeatMapProps) {
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

        {dongs.map((dong) => {
          const positions = boundingPolygon(dong.lat, dong.lng);
          const color = scoreToHeatmapColor(dong.score);
          return (
            <Polygon
              key={dong.slug}
              positions={positions}
              pathOptions={{
                color: MAP_POLYGON_STROKE.light,
                weight: 1,
                fillColor: color,
                fillOpacity: 0.6,
              }}
              eventHandlers={{
                click: () => onDongClick?.(dong),
                mouseover: (e) => e.target.setStyle({ fillOpacity: 0.85, weight: 2 }),
                mouseout: (e) => e.target.setStyle({ fillOpacity: 0.6, weight: 1 }),
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1} sticky>
                <div className="map-tooltip">
                  <div className="map-tooltip__name">
                    {dong.gu} · {dong.name}
                  </div>
                  <div className="map-tooltip__score tabular">
                    종합점수 {dong.score.toFixed(1)}
                  </div>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
}
