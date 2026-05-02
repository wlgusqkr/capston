// MainMap (`/`) — entry point of the app.
// Layout per SPEC 6.1:
//   left fixed sidebar (280px) + right full-screen Leaflet map
//   bottom-left legend, bottom-right 2D/3D toggle
//
// State owned here:
//   - weights (rent/amenity/transit) — drives the score query
//   - activeLayer / filters — UI only for step 4 (no behavior yet)
//
// Click on a polygon currently logs to console; the slide-in DongPanel
// arrives in step 5.
import { useState } from 'react';

import HeatMap from '@/components/Map/HeatMap';
import Legend from '@/components/Map/Legend';
import Sidebar from '@/components/Map/Sidebar';
import ViewToggle from '@/components/Map/ViewToggle';
import { useDongScores } from '@/hooks/useDongs';
import { DEFAULT_WEIGHTS } from '@/types/api';
import type { DongScore, Weights } from '@/types/api';

import './MainMap.css';

type LayerKey = 'composite' | 'rent' | 'amenity' | 'transit';

export default function MainMap() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [activeLayer, setActiveLayer] = useState<LayerKey>('composite');
  const [rentCapEnabled, setRentCapEnabled] = useState(false);
  const [rentCap, setRentCap] = useState(50);
  const [nearUniversityOnly, setNearUniversityOnly] = useState(false);

  const { data, isLoading, isError, error } = useDongScores(weights);

  const handleDongClick = (dong: DongScore) => {
    // Step 5 will replace this with the slide-in DongPanel.
    // eslint-disable-next-line no-console
    console.log('[main-map] dong clicked', { slug: dong.slug, name: dong.name, score: dong.score });
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
      </section>
    </div>
  );
}
