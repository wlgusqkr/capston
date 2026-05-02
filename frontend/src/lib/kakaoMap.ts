// Kakao Maps SDK loader + GeoJSON path conversion utilities.
//
// 카카오맵 JS 키는 frontend/.env의 VITE_KAKAO_JS_KEY. 미설정 시 useKakaoLoader가
// 에러를 반환하므로 호출부는 isError 분기로 안내 메시지를 띄운다.

import { useKakaoLoader } from 'react-kakao-maps-sdk';

const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;

/**
 * 모든 카카오맵 컴포넌트의 진입점에서 호출. SDK 로드 상태를 반환한다.
 * services 라이브러리는 서비스 검색/지오코딩에 필요 (현재 미사용이지만 미리 옵션).
 */
export function useKakao(): { loading: boolean; error: unknown } {
  const [loading, error] = useKakaoLoader({
    appkey: KAKAO_JS_KEY ?? '',
    libraries: ['services'],
  });
  return { loading, error: KAKAO_JS_KEY ? error : new Error('VITE_KAKAO_JS_KEY 미설정') };
}

/**
 * GeoJSON 좌표 ([lng, lat][][]) → 카카오맵 Polygon path ([{lat, lng}][]) 변환.
 * MultiPolygon은 첫 번째 외곽 ring만 사용 (행정동은 거의 단일 폴리곤).
 */
export function geoJsonToKakaoPath(
  coordinates: number[][][] | number[][][][],
  geomType: 'Polygon' | 'MultiPolygon',
): { lat: number; lng: number }[][] {
  if (geomType === 'Polygon') {
    // Polygon: [ring0, ring1, ...] — ring0 = outer
    const rings = coordinates as number[][][];
    return rings.map((ring) => ring.map(([lng, lat]) => ({ lat, lng })));
  }
  // MultiPolygon: [[ring0, ring1...], [ring0...]]
  const polys = coordinates as number[][][][];
  // 모든 외곽 ring을 path 배열로 변환 (구멍이 있는 폴리곤은 ring1+가 hole)
  const paths: { lat: number; lng: number }[][] = [];
  for (const poly of polys) {
    for (const ring of poly) {
      paths.push(ring.map(([lng, lat]) => ({ lat, lng })));
    }
  }
  return paths;
}
