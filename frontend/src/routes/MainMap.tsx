// MainMap (`/`) — entry point of the app.
// Layout per SPEC 6.1:
//   left fixed sidebar (280px) + right full-screen Leaflet map
//   bottom-left legend, bottom-right 2D/3D toggle
//
// State owned here:
//   - weights (rent/amenity/transit) — drives the score query
//   - activeLayer / filters — UI only for step 4 (no behavior yet)
//   - selectedSlug — drives the slide-in DongPanel (SPEC 6.2)
//
// On polygon click we open the right-side DongPanel and pass the matching
// row's raw axis scores so the panel can render its 점수 구성 bars without
// a duplicate query.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import DongPanel from '@/components/Map/DongPanel';
import HeatMap from '@/components/Map/HeatMap';
import Legend from '@/components/Map/Legend';
import Sidebar from '@/components/Map/Sidebar';
import ViewToggle from '@/components/Map/ViewToggle';
import PreferenceModal from '@/components/Onboarding/PreferenceModal';
import { useDongScores } from '@/hooks/useDongs';
import { DEFAULT_WEIGHTS } from '@/types/api';
import type { DongScore, Weights } from '@/types/api';

import './MainMap.css';

type LayerKey = 'composite' | 'rent' | 'amenity' | 'transit';

export default function MainMap() {
  const navigate = useNavigate();
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [activeLayer, setActiveLayer] = useState<LayerKey>('composite');
  const [rentCapEnabled, setRentCapEnabled] = useState(false);
  const [rentCap, setRentCap] = useState(50);
  const [nearUniversityOnly, setNearUniversityOnly] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [preferenceOpen, setPreferenceOpen] = useState(false);

  const { data, isLoading, isError, error } = useDongScores(weights);

  /** Raw per-axis scores for the currently selected dong, looked up on the
   *  /scores list we already have. Avoids a second network call.
   */
  const selectedRawScores = useMemo(() => {
    if (!selectedSlug || !data) return null;
    const row = data.find((d) => d.slug === selectedSlug);
    if (!row) return null;
    return {
      rent: row.score_rent,
      amenity: row.score_amenity,
      transit: row.score_transit,
    };
  }, [data, selectedSlug]);

  const handleDongClick = (dong: DongScore) => {
    setSelectedSlug(dong.slug);
  };

  const handleClosePanel = () => setSelectedSlug(null);

  const handleOpenDetail = (slug: string) => {
    // Detail route arrives in step 6. For now navigate; NotFound will catch it.
    navigate(`/dong/${slug}`);
  };

  const handleAddCompare = (_slug: string) => {
    // Compare flow arrives in step 8.
    window.alert('비교 목록에 추가됨 (8단계에서 구현)');
  };

  const handleFavorite = (_slug: string) => {
    // Auth + favorites arrive in step 9.
    window.alert('로그인 후 찜하기 (9단계에서 구현)');
  };

  const handlePreferenceComplete = (next: Weights) => {
    // Apply learned weights and close the modal. The /scores query refetches
    // automatically via TanStack Query's queryKey invalidation, and HeatMap's
    // setStyle transitions colors over --transition-slow (300ms).
    setWeights(next);
    setPreferenceOpen(false);
  };

  return (
    <div className="main-map">
      <Sidebar
        weights={weights}
        onWeightsChange={setWeights}
        activeLayer={activeLayer}
        onLayerChange={setActiveLayer}
        rentCapEnabled={rentCapEnabled}
        onRentCapToggle={setRentCapEnabled}
        rentCap={rentCap}
        onRentCapChange={setRentCap}
        nearUniversityOnly={nearUniversityOnly}
        onNearUniversityToggle={setNearUniversityOnly}
        onOpenPreference={() => setPreferenceOpen(true)}
      />

      <section className="main-map__map" aria-label="서울 동네 히트맵">
        <HeatMap dongs={data ?? []} onDongClick={handleDongClick} />

        {isLoading && (
          <div className="main-map__overlay" role="status" aria-live="polite">
            동네 점수를 불러오는 중…
          </div>
        )}
        {isError && (
          <div className="main-map__overlay main-map__overlay--error" role="alert">
            데이터를 불러오지 못했습니다.
            <span className="main-map__overlay-detail">
              {error instanceof Error ? error.message : '알 수 없는 오류'}
            </span>
          </div>
        )}

        <Legend />
        <ViewToggle />

        <DongPanel
          slug={selectedSlug}
          weights={weights}
          rawScores={selectedRawScores}
          onClose={handleClosePanel}
          onOpenDetail={handleOpenDetail}
          onAddCompare={handleAddCompare}
          onFavorite={handleFavorite}
        />
      </section>

      <PreferenceModal
        open={preferenceOpen}
        onClose={() => setPreferenceOpen(false)}
        onComplete={handlePreferenceComplete}
      />
    </div>
  );
}
