// 카카오맵 기반 행정동 히트맵 (SPEC 6.1).
//
// 425개 행정동 GeoJSON을 카카오맵 Polygon으로 렌더하고 score에 따라 색을 입힌다.
// 카카오맵은 한국어 지명·지하철·POI가 기본으로 표시되어 SPEC의 "직관적인 도시
// 데이터 대시보드" 요구를 OSM 보다 잘 충족한다.
import { useMemo, useRef } from 'react';
import { Map, Polygon } from 'react-kakao-maps-sdk';

import { useDongGeoJson } from '@/hooks/useDongGeoJson';
import { scoreToHeatmapColor, MAP_POLYGON_STROKE } from '@/lib/colors';
import { geoJsonToKakaoPolygons, useKakao } from '@/lib/kakaoMap';
import type { DongScore } from '@/types/api';

import './HeatMap.css';

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
const INITIAL_LEVEL = 8; // 카카오맵 zoom level (작을수록 가까움)

export interface HeatMapProps {
  dongs: DongScore[];
  onDongClick?: (dong: DongScore) => void;
  /** 히트맵 폴리곤 표시 여부. false면 일반 카카오맵만 보임. */
  heatmapVisible?: boolean;
}

export default function HeatMap({ dongs, onDongClick, heatmapVisible = true }: HeatMapProps) {
  const { loading: kakaoLoading, error: kakaoError } = useKakao();
  const { data: geojson, isLoading: geoLoading } = useDongGeoJson();

  const dongBySlug = useMemo(() => {
    const m: Record<string, DongScore> = {};
    for (const d of dongs) m[d.slug] = d;
    return m;
  }, [dongs]);

  const tooltipRef = useRef<HTMLDivElement>(null);

  if (kakaoError) {
    return (
      <div className="map-root map-root--error">
        <div className="map-fallback">
          <div className="map-fallback__title">카카오맵 키가 설정되지 않았습니다</div>
          <div className="map-fallback__body">
            <code>frontend/.env</code>의 <code>VITE_KAKAO_JS_KEY</code>에 카카오 디벨로퍼스에서
            발급받은 JavaScript 키를 넣고 dev 서버를 재시작하세요. <br />
            플랫폼 → Web → 사이트 도메인에 <code>http://localhost:5173</code> 등록 필요.
          </div>
        </div>
      </div>
    );
  }

  if (kakaoLoading || geoLoading || !geojson) {
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
      <Map
        center={SEOUL_CITY_HALL}
        level={INITIAL_LEVEL}
        style={{ width: '100%', height: '100%' }}
      >
        {heatmapVisible &&
          geojson.features.flatMap((feature) => {
            const props = feature.properties;
            const slug = props.adm_cd;
            const dong = dongBySlug[slug];
            const geom = feature.geometry;
            if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') return [];

            const subPolygons = geoJsonToKakaoPolygons(
              geom.coordinates as number[][][] | number[][][][],
              geom.type,
            );
            const fill = dong ? scoreToHeatmapColor(dong.score) : '#cccccc';
            const fillOpacity = dong ? 0.55 : 0.1;

            return subPolygons.map((rings, idx) => (
              <Polygon
                key={`${slug}-${idx}`}
                path={rings}
                strokeWeight={1}
                strokeColor={MAP_POLYGON_STROKE.light}
                strokeOpacity={0.9}
                fillColor={fill}
                fillOpacity={fillOpacity}
                onClick={() => dong && onDongClick?.(dong)}
                onMouseover={() => {
                  if (!dong || !tooltipRef.current) return;
                  const tip = tooltipRef.current;
                  tip.style.display = 'block';
                  tip.innerHTML = `
                    <div class="map-tooltip__name">${dong.gu} · ${dong.name}</div>
                    <div class="map-tooltip__score tabular">종합점수 ${dong.score.toFixed(1)}</div>
                  `;
                }}
                onMouseout={() => {
                  if (!tooltipRef.current) return;
                  tooltipRef.current.style.display = 'none';
                }}
              />
            ));
          })}
      </Map>
      <div ref={tooltipRef} className="map-tooltip-floating" style={{ display: 'none' }} />
    </div>
  );
}
