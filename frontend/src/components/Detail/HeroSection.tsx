// HeroSection — top of dong detail page (SPEC 6.3 Section 1).
//
// 좌: 구·동 이름 + 종합 점수 + vs 서울 평균 배지 + 한 줄 요약
// 우: 280px 미니 지도 (카카오맵). 동 중심에 마커, 점수 색상 적용.
import { CustomOverlayMap, Map, MapMarker } from 'react-kakao-maps-sdk';

import { Badge, Card, Score } from '@/components/ui';
import { scoreToHeatmapColor } from '@/lib/colors';
import { useKakao } from '@/lib/kakaoMap';
import type { DongDetail } from '@/types/api';

import './HeroSection.css';

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
  const center = { lat: detail.centroid.lat, lng: detail.centroid.lng };
  const polygonColor = scoreToHeatmapColor(detail.score);
  const { loading, error } = useKakao();

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
            {error ? (
              <div className="hero__map-fallback">카카오맵 키 미설정</div>
            ) : loading ? (
              <div className="hero__map-fallback">지도 로드 중…</div>
            ) : (
              <Map
                center={center}
                level={5}
                draggable={false}
                zoomable={false}
                scrollwheel={false}
                disableDoubleClick
                disableDoubleClickZoom
                style={{ width: '100%', height: '100%' }}
              >
                <MapMarker position={center} />
                <CustomOverlayMap position={center} yAnchor={1.5}>
                  <div
                    className="hero__map-pin-label"
                    style={{ borderTop: `3px solid ${polygonColor}` }}
                  >
                    {detail.gu} · {detail.name}
                  </div>
                </CustomOverlayMap>
              </Map>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
