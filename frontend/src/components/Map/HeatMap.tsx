// 카카오맵 기반 행정동 히트맵 (SPEC 6.1).
//
// react-kakao-maps-sdk 의 <Polygon> 컴포넌트로 425개를 declarative하게 그리는
// 대신, 카카오 공식 vanilla 예제와 같은 패턴(`new kakao.maps.Polygon({...})`)을
// 따른다. 이유:
//   1) Polygon 컴포넌트의 path는 `new kakao.maps.LatLng` 인스턴스를 기대하고,
//      plain {lat,lng} 객체로 보내면 1.2.x 버전에서 폴리곤이 그려지지 않는 케이스
//      가 있음.
//   2) 425개 React 컴포넌트보다 imperative 1회 일괄 생성이 마운트 비용이 작음.
//   3) score 변경 시 setOptions만 호출해 색을 갱신하므로 리렌더 부담 없음.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Map } from 'react-kakao-maps-sdk';

import { useDongGeoJson } from '@/hooks/useDongGeoJson';
import type { DongFeatureCollection } from '@/hooks/useDongGeoJson';
import { scoreToHeatmapColor } from '@/lib/colors';
import { useKakao } from '@/lib/kakaoMap';
import type { DongScore } from '@/types/api';

import './HeatMap.css';

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
const INITIAL_LEVEL = 8;

export interface HeatMapProps {
  dongs: DongScore[];
  onDongClick?: (dong: DongScore) => void;
  /** 히트맵 폴리곤 표시 여부. false면 일반 카카오맵만 보임. */
  heatmapVisible?: boolean;
}

/** 한 sub-polygon 인스턴스에 dong slug를 같이 보관해 이벤트 핸들러에서 lookup. */
interface PolygonEntry {
  slug: string;
  polygon: kakao.maps.Polygon;
}

export default function HeatMap({ dongs, onDongClick, heatmapVisible = true }: HeatMapProps) {
  const { loading: kakaoLoading, error: kakaoError } = useKakao();
  const { data: geojson, isLoading: geoLoading } = useDongGeoJson();

  const [mapInstance, setMapInstance] = useState<kakao.maps.Map | null>(null);

  // slug → DongScore 룩업 (가중치 변경 시 새 객체).
  const dongBySlug = useMemo(() => {
    const m: Record<string, DongScore> = {};
    for (const d of dongs) m[d.slug] = d;
    return m;
  }, [dongs]);

  // 폴리곤 인스턴스를 ref에 저장 — 다음 effect에서 정리하기 위함.
  const polygonsRef = useRef<PolygonEntry[]>([]);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 콜백 ref — 의존성에 안 넣고 항상 최신을 호출하기 위함.
  const onDongClickRef = useRef(onDongClick);
  useEffect(() => {
    onDongClickRef.current = onDongClick;
  }, [onDongClick]);

  const dongBySlugRef = useRef(dongBySlug);
  useEffect(() => {
    dongBySlugRef.current = dongBySlug;
  }, [dongBySlug]);

  // ── 1) GeoJSON + map이 준비되면 폴리곤을 한 번에 생성 ────────────────────
  useEffect(() => {
    if (!mapInstance || !geojson) return;

    const created = createPolygons(mapInstance, geojson);

    // 이벤트 핸들러 부착
    for (const { slug, polygon } of created) {
      kakao.maps.event.addListener(polygon, 'click', () => {
        const dong = dongBySlugRef.current[slug];
        if (dong) onDongClickRef.current?.(dong);
      });
      kakao.maps.event.addListener(polygon, 'mouseover', () => {
        const dong = dongBySlugRef.current[slug];
        if (!dong || !tooltipRef.current) return;
        polygon.setOptions({ fillOpacity: 0.85 });
        const tip = tooltipRef.current;
        tip.style.display = 'block';
        tip.innerHTML =
          `<div class="map-tooltip__name">${dong.gu} · ${dong.name}</div>` +
          `<div class="map-tooltip__score tabular">종합점수 ${dong.score.toFixed(1)}</div>`;
      });
      kakao.maps.event.addListener(polygon, 'mouseout', () => {
        polygon.setOptions({ fillOpacity: 0.7 });
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
      });
    }

    polygonsRef.current = created;

    return () => {
      for (const { polygon } of created) polygon.setMap(null);
      polygonsRef.current = [];
    };
  }, [mapInstance, geojson]);

  // ── 2) dongs (점수) 변경 시 색상만 setOptions로 갱신 — 리메이크 X ─────────
  useEffect(() => {
    for (const { slug, polygon } of polygonsRef.current) {
      const dong = dongBySlug[slug];
      polygon.setOptions({
        fillColor: dong ? scoreToHeatmapColor(dong.score) : '#cccccc',
        fillOpacity: dong ? 0.7 : 0.1,
      });
    }
  }, [dongBySlug]);

  // ── 3) 토글: 히트맵 끄면 모든 폴리곤 비표시 (인스턴스는 유지) ─────────────
  useEffect(() => {
    for (const { polygon } of polygonsRef.current) {
      polygon.setMap(heatmapVisible ? mapInstance : null);
    }
  }, [heatmapVisible, mapInstance]);

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
        onCreate={setMapInstance}
      />
      <div ref={tooltipRef} className="map-tooltip-floating" style={{ display: 'none' }} />
    </div>
  );
}

// ============================================================================
// 폴리곤 생성 유틸
// ============================================================================

function createPolygons(
  map: kakao.maps.Map,
  geojson: DongFeatureCollection,
): PolygonEntry[] {
  const out: PolygonEntry[] = [];
  for (const feature of geojson.features) {
    const slug = feature.properties.adm_cd;
    const geom = feature.geometry;
    if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') continue;

    const subPolygons =
      geom.type === 'Polygon'
        ? [geom.coordinates as number[][][]]
        : (geom.coordinates as number[][][][]);

    for (const subPoly of subPolygons) {
      // 외곽 ring(`subPoly[0]`) → LatLng 인스턴스 배열. hole은 일단 무시.
      const outerRing = subPoly[0];
      if (!outerRing || outerRing.length < 3) continue;

      const path = outerRing.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng));
      const polygon = new kakao.maps.Polygon({
        path,
        strokeWeight: 1.2,
        strokeColor: '#2C2C2A',
        strokeOpacity: 0.6,
        fillColor: '#cccccc',  // 초기값 — 다음 effect에서 score 색으로 갱신
        fillOpacity: 0.1,
      });
      polygon.setMap(map);
      out.push({ slug, polygon });
    }
  }
  return out;
}
