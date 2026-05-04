// DongDetail — full detail page (SPEC 6.3).
// Six sections: Hero, RealEstate, Amenity, Transit, Review, SimilarDongs.
import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AmenitySection from '@/components/Detail/AmenitySection';
import HeroSection from '@/components/Detail/HeroSection';
import RealEstateSection from '@/components/Detail/RealEstateSection';
import ReviewSection from '@/components/Detail/ReviewSection';
import SimilarDongsSection from '@/components/Detail/SimilarDongsSection';
import TransitSection from '@/components/Detail/TransitSection';
import { Button } from '@/components/ui';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { useDongDetail, useDongScores } from '@/hooks/useDongs';
import { DEFAULT_WEIGHTS } from '@/types/api';

import './DongDetail.css';

export default function DongDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Detail page weights default to 33/33/34. Main map weights are not lifted
  // here in this iteration — see step 6B handoff "known issues" / step 8 plan.
  const weights = DEFAULT_WEIGHTS;
  const { data, isLoading, isError, error } = useDongDetail(slug, weights);

  // All-dongs scores feed the hero MetricBar breakdown (R-3) — same /scores
  // call that powers the heatmap, so React Query usually dedups with MainMap.
  const scoresQ = useDongScores(weights);
  const breakdown = useMemo(() => {
    if (!data?.slug || !scoresQ.data) return undefined;
    const row = scoresQ.data.find((d) => d.slug === data.slug);
    if (!row) return undefined;
    return {
      score_rent: row.score_rent,
      score_amenity: row.score_amenity,
      score_transit: row.score_transit,
    };
  }, [data?.slug, scoresQ.data]);

  // Publish page title to TopNav center zone (R-2 contextual nav).
  usePageTitle(data?.name);

  const handleAddCompare = useCallback(
    () => alert('비교 목록에 추가됨 (8단계에서 구현)'),
    [],
  );
  const handleFavorite = useCallback(
    () => alert('로그인 후 찜하기 (9단계에서 구현)'),
    [],
  );
  const handleShare = useCallback(
    () => alert('URL 복사 공유 (8단계에서 구현)'),
    [],
  );

  return (
    <div className="dong-detail">
      {isLoading && (
        <div className="dong-detail__status" role="status">
          동네 상세 정보를 불러오는 중…
        </div>
      )}

      {isError && (
        <div className="dong-detail__status dong-detail__status--error" role="alert">
          정보를 불러오지 못했습니다.
          <span className="dong-detail__status-detail">
            {error instanceof Error ? error.message : '알 수 없는 오류'}
          </span>
          <div className="dong-detail__status-actions">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/')}
            >
              지도로 돌아가기
            </Button>
          </div>
        </div>
      )}

      {data && (
        <main className="dong-detail__main" id="main">
          <HeroSection
            detail={data}
            breakdown={breakdown}
            onAddCompare={handleAddCompare}
            onFavorite={handleFavorite}
            onShare={handleShare}
          />
          <RealEstateSection realEstate={data.real_estate} />
          <AmenitySection amenities={data.amenities} />
          <TransitSection transit={data.transit} />
          <ReviewSection reviews={data.reviews} />
          <SimilarDongsSection similar={data.similar_dongs} />

          <footer className="dong-detail__cta-bar" aria-label="동네 액션">
            <Button variant="secondary" size="md" onClick={handleAddCompare}>
              비교에 추가
            </Button>
            <Button variant="secondary" size="md" onClick={handleFavorite}>
              찜하기
            </Button>
            <Button variant="secondary" size="md" onClick={handleShare}>
              공유
            </Button>
          </footer>
        </main>
      )}
    </div>
  );
}
