// Leaflet 기반 행정동 히트맵 (SPEC 6.1) — VWorld 타일.
//
// 카카오맵 SDK 통합이 폴리곤 렌더링에서 일관성 문제를 일으켜 다시 Leaflet으로
// 복원. 타일은 VWorld(국토교통부) — 한국어 지명·도로·지하철이 OSM보다 풍부.
//
// /seoul_dongs.geojson 정적 파일에서 425개 행정동 경계를 1회 로드하고
// feature.properties.adm_cd2 (10자리 행정동 코드) === dong.code 로 score 데이터와 조인.
//
// VWorld 키: frontend/.env 의 VITE_VWORLD_API_KEY.
//   - 키 없으면 CartoDB Voyager 타일로 폴백 (시각적으로 무난, 그러나 한국어 라벨 약함).
//   - 키 발급: https://www.vworld.kr/ (회원가입 → 인증키 신청 → localhost 도메인 등록)

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import L from 'leaflet';
import type { Layer, LeafletMouseEvent } from 'leaflet';
import type { Feature, Geometry } from 'geojson';
import { GeoJSON, MapContainer, TileLayer, ZoomControl } from 'react-leaflet';

import { useDongGeoJson } from '@/hooks/useDongGeoJson';
import type { DongFeatureProps } from '@/hooks/useDongGeoJson';
import { HEATMAP_NO_DATA, MAP_POLYGON_STROKE, scoreToHeatmapColor } from '@/lib/colors';
import type { DongScore, MatchCountItem } from '@/types/api';

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

/** 레이어 탭 — 색상의 기준이 되는 점수 축. score 모드 전용.
 *  ('match' 는 LayerSwitcher 쪽 LayerKey 에만 등장하고 본 HeatMap 으로는
 *   mode='match' prop 으로 전달됨 — score 축과 의미가 다름.) */
export type ScoreLayerKey = 'composite' | 'rent' | 'amenity' | 'transit';

/** @deprecated Use ScoreLayerKey or LayerSwitcher's LayerKey. 호환 alias. */
export type LayerKey = ScoreLayerKey;

/** 히트맵 색칠 모드.
 *  - 'score': activeLayer 의 점수 (composite/rent/amenity/transit) 기반.
 *  - 'match': MatchCountItem.ratio (0~100, log scale 정규화) 기반.
 *  Phase 5 default 는 'match' (자취생 첫 화면이 자기 조건으로 즉시 시작). */
export type HeatMapMode = 'score' | 'match';

export interface HeatMapProps {
  /** score 모드용 데이터. match 모드에서도 click handler 의 dong 인자에 필요. */
  dongs: DongScore[];
  onDongClick?: (dong: DongScore) => void;
  /** 히트맵 폴리곤 표시 여부. false면 베이스맵만 보임. */
  heatmapVisible?: boolean;
  /** 색상 기준이 되는 점수 축. 기본 'composite' (가중합). score 모드에서만 사용. */
  activeLayer?: ScoreLayerKey;
  /** Phase 5: 'score' (기존) 또는 'match' (조건 거래량). default 'match'. */
  mode?: HeatMapMode;
  /** match 모드에서 폴리곤 색칠에 쓰는 카운트 분포. mode='match' 일 때만 의미. */
  matchCounts?: MatchCountItem[];
  /** 추가 레이어를 MapContainer 내부에 렌더링. react-leaflet 컴포넌트만 (e.g.,
   *  CircleMarker, useMap 사용 컴포넌트). 일반 DOM 노드는 작동 안 함. */
  children?: ReactNode;
}

export function pickScore(d: DongScore, layer: ScoreLayerKey): number {
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

/** Phase 4.7 fix 회귀 가드용 헬퍼. GeoJSON feature.properties.adm_cd2 (10자리
 *  행정동 코드) 와 DongScore.code 가 동일 키여야 정상 매칭된다. 7자리 adm_cd 로
 *  매칭하던 옛 코드가 RDS 통합 후 깨졌으므로 회귀 방지를 위해 분리. */
export function indexDongsByCode(
  dongs: DongScore[],
): Record<string, DongScore> {
  const m: Record<string, DongScore> = {};
  for (const d of dongs) m[d.code] = d;
  return m;
}

export default function HeatMap({
  dongs,
  onDongClick,
  heatmapVisible = true,
  activeLayer = 'composite',
  mode = 'match',
  matchCounts,
  children,
}: HeatMapProps) {
  const { data: geojson, isLoading: geoLoading } = useDongGeoJson();

  // GeoJSON 의 adm_cd2 (10자리 행정동 코드) 와 매칭하기 위해 code 키로 인덱싱.
  // (구버전은 adm_cd 7자리 ↔ slug 매칭이었으나 RDS 통합 후 한글 slug 라 깨짐.)
  const dongByCode = useMemo(() => indexDongsByCode(dongs), [dongs]);

  // match 모드용 — code 키로 인덱싱한 MatchCountItem 맵.
  const matchByCode = useMemo(() => {
    const m: Record<string, MatchCountItem> = {};
    for (const item of matchCounts ?? []) m[item.code] = item;
    return m;
  }, [matchCounts]);

  // 가중치/레이어/모드 변경마다 색이 갱신되도록 GeoJSON 레이어를 강제 리마운트.
  // 425개라 비용 약간 있지만 슬라이더 빈도 낮아 OK.
  // mode 도 키에 포함 (eng-review 회귀 가드 — score↔match 토글 시 리마운트).
  const layerKey = useMemo(() => {
    let acc = 0;
    if (mode === 'score') {
      for (const d of dongs) acc = (acc + Math.round(pickScore(d, activeLayer) * 100)) | 0;
      return `score-${activeLayer}-${dongs.length}-${acc}-${heatmapVisible ? 1 : 0}`;
    }
    // match — ratio 기반 키 (정수 부분만 충분).
    for (const item of matchCounts ?? []) {
      acc = (acc + Math.round(item.ratio * 10)) | 0;
    }
    return `match-${matchCounts?.length ?? 0}-${acc}-${heatmapVisible ? 1 : 0}`;
  }, [dongs, heatmapVisible, activeLayer, mode, matchCounts]);

  // match 모드 fillOpacity — 0.85 (eng-review #15 모드 시각 차이).
  const matchFillOpacity = 0.85;
  const scoreFillOpacity = 0.7;

  // DESIGN_SYSTEM.md "Map-Specific Shapes":
  //   - default polygon stroke: 1px white @ 60% opacity
  //   - heatmap fill opacity: 0.7 (score) / 0.85 (match — 모드 시각 차이)
  //   - cells without data: very faint Soft Stone wash
  const styleFn = (feature?: Feature<Geometry, DongFeatureProps>) => {
    const code = feature?.properties?.adm_cd2 ?? '';

    if (mode === 'match') {
      const item = matchByCode[code];
      // has_data=false 또는 ratio===0 → NO_DATA 색 (Soft Stone 70% opacity).
      const hasColor = item != null && item.has_data && item.ratio > 0;
      return {
        color: MAP_POLYGON_STROKE.default.color,
        weight: MAP_POLYGON_STROKE.default.weight,
        opacity: MAP_POLYGON_STROKE.default.opacity,
        fillColor: hasColor ? scoreToHeatmapColor(item.ratio) : HEATMAP_NO_DATA,
        fillOpacity: hasColor ? matchFillOpacity : 0.7 * 0.5,
      };
    }

    const dong = dongByCode[code];
    const score = dong ? pickScore(dong, activeLayer) : null;
    return {
      color: MAP_POLYGON_STROKE.default.color,
      weight: MAP_POLYGON_STROKE.default.weight,
      opacity: MAP_POLYGON_STROKE.default.opacity,
      fillColor: score !== null ? scoreToHeatmapColor(score) : HEATMAP_NO_DATA,
      fillOpacity: score !== null ? scoreFillOpacity : 0.15,
    };
  };

  const layerLabel: Record<ScoreLayerKey, string> = {
    composite: '종합점수',
    rent: '전월세 점수',
    amenity: '생활시설 점수',
    transit: '교통 점수',
  };

  const onEachFeature = (
    feature: Feature<Geometry, DongFeatureProps>,
    layer: Layer,
  ): void => {
    const code = feature.properties.adm_cd2 ?? '';
    const dong = dongByCode[code];
    if (!dong) return;

    if (mode === 'match') {
      const item = matchByCode[code];
      const countLabel =
        item != null
          ? `${item.count.toLocaleString()}건`
          : '데이터 없음';
      layer.bindTooltip(
        `<div class="map-tooltip__name">${dong.gu} · ${dong.name}</div>` +
          `<div class="map-tooltip__score tabular">조건 매칭 ${countLabel}</div>`,
        { sticky: true, direction: 'top', offset: [0, -4], opacity: 1 },
      );
    } else {
      const shownScore = pickScore(dong, activeLayer);
      layer.bindTooltip(
        `<div class="map-tooltip__name">${dong.gu} · ${dong.name}</div>` +
          `<div class="map-tooltip__score tabular">${layerLabel[activeLayer]} ${shownScore.toFixed(1)}</div>`,
        { sticky: true, direction: 'top', offset: [0, -4], opacity: 1 },
      );
    }

    const restingFillOpacity = mode === 'match' ? matchFillOpacity : scoreFillOpacity;

    layer.on({
      click: (e: LeafletMouseEvent) => {
        // Stop the click from bubbling to map.click — otherwise the kernel
        // score layer (Phase 2b) would also open. Polygon click → dong only.
        L.DomEvent.stopPropagation(e);
        onDongClick?.(dong);
      },
      mouseover: (e) =>
        (e.target as { setStyle: (s: object) => void }).setStyle({
          fillOpacity: Math.min(1, restingFillOpacity + 0.1),
          weight: MAP_POLYGON_STROKE.hover.weight,
          opacity: MAP_POLYGON_STROKE.hover.opacity,
        }),
      mouseout: (e) =>
        (e.target as { setStyle: (s: object) => void }).setStyle({
          fillOpacity: restingFillOpacity,
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
        maxZoom={19}
        zoomControl={false}
        scrollWheelZoom
        className="map-container"
      >
        {/* maxZoom 19까지 허용 — VWorld Base 타일이 z=19까지 응답 (서울 전역 OK).
         *  타일 누락 시 Leaflet이 자동으로 z=18 타일을 stretch — 빈 영역 X. */}
        <TileLayer attribution={VWORLD_ATTRIBUTION} url={VWORLD_TILE_URL} maxZoom={19} />
        <ZoomControl position="topright" />

        {heatmapVisible && (
          <GeoJSON
            key={layerKey}
            data={geojson}
            style={styleFn}
            onEachFeature={onEachFeature}
          />
        )}

        {children}
      </MapContainer>
    </div>
  );
}
