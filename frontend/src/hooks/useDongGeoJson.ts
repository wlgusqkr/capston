// Fetches the static Seoul 행정동 GeoJSON once and caches via TanStack Query.
// Joined with score data by feature.properties.adm_cd === dong.slug.
//
// 파일은 frontend/public/seoul_dongs.geojson 에 위치하며 Vite가 정적으로 서빙한다.
// raqoon886/Local_HangJeongDong 형식 (adm_cd, sggnm, adm_nm 등).

import { useQuery } from '@tanstack/react-query';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export interface DongFeatureProps {
  adm_nm: string;
  adm_cd: string;
  adm_cd2?: string;
  sgg?: string;
  sido?: string;
  sidonm?: string;
  sggnm?: string;
}

export type DongFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  DongFeatureProps
>;

const GEOJSON_URL = '/seoul_dongs.geojson';

async function fetchDongGeoJson(): Promise<DongFeatureCollection> {
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) {
    throw new Error(`GeoJSON fetch failed: ${res.status}`);
  }
  return (await res.json()) as DongFeatureCollection;
}

export function useDongGeoJson() {
  return useQuery({
    queryKey: ['static', 'seoul_dongs.geojson'],
    queryFn: fetchDongGeoJson,
    staleTime: Infinity,           // 정적 파일이라 캐시 무한
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
