// MainMap (`/`) — entry point of the app.
// Layout per SPEC 6.1:
//   left fixed sidebar (280px) + right full-screen Leaflet map
//   bottom-left legend, bottom-right 2D/3D toggle
//
// State owned here:
//   - weights (rent/amenity/transit) — drives the score query
//   - activeLayer / filters — UI only for step 4 (no behavior yet)
//   - selectedSlug — drives the slide-in DongPanel (SPEC 6.2)
//   - compareSlugs — accumulated dongs queued for /compare (SPEC 6.4),
//                    capped at 3, deduplicated, in insertion order
//
// On polygon click we open the right-side DongPanel and pass the matching
// row's raw axis scores so the panel can render its 점수 구성 bars without
// a duplicate query.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DongPanel from '@/components/Map/DongPanel';
import HeatMap from '@/components/Map/HeatMap';
import Legend from '@/components/Map/Legend';
import Sidebar from '@/components/Map/Sidebar';
import ViewToggle from '@/components/Map/ViewToggle';
import PreferenceModal from '@/components/Onboarding/PreferenceModal';
import { useAuth } from '@/contexts/AuthContext';
import { useAddFavorite } from '@/hooks/useFavorites';
import { useDongScores } from '@/hooks/useDongs';
import { putMyPreference } from '@/lib/api';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { DEFAULT_WEIGHTS } from '@/types/api';
import type { DongScore, Weights } from '@/types/api';

import './MainMap.css';

type LayerKey = 'composite' | 'rent' | 'amenity' | 'transit';

const MAX_COMPARE = 3;

export default function MainMap() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const addFavoriteMut = useAddFavorite();

  // Initial weights — user's saved prefs once login resolves, default otherwise.
  // We store in component state (the source of truth for the slider) and
  // sync from `user.preference` exactly once when it transitions from null
  // to an authenticated user.
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const hasSyncedFromUserRef = useRef(false);

  useEffect(() => {
    if (!user || hasSyncedFromUserRef.current) return;
    setWeights({
      rent: user.preference.w_rent,
      amenity: user.preference.w_amenity,
      transit: user.preference.w_transit,
    });
    hasSyncedFromUserRef.current = true;
  }, [user]);

  const [activeLayer, setActiveLayer] = useState<LayerKey>('composite');
  const [rentCapEnabled, setRentCapEnabled] = useState(false);
  const [rentCap, setRentCap] = useState(50);
  const [nearUniversityOnly, setNearUniversityOnly] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  // ?onboarding=1 — auto-open the preference modal (entry from MyPage).
  useEffect(() => {
    if (searchParams.get('onboarding') === '1') {
      setPreferenceOpen(true);
      // Strip the param so refresh / back doesn't reopen.
      const next = new URLSearchParams(searchParams);
      next.delete('onboarding');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  /** Show a transient inline toast (auto-dismiss in 2.4s). */
  const flashToast = (message: string) => {
    setToast(message);
    if (toastTimer.current != null) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 2400);
  };

  // Cleanup toast timer on unmount.
  useEffect(
    () => () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    },
    []
  );

  const handleAddCompare = (slug: string) => {
    setCompareSlugs((prev) => {
      if (prev.includes(slug)) {
        const dongName = data?.find((d) => d.slug === slug)?.name ?? slug;
        flashToast(`${dongName}은(는) 이미 비교 목록에 있어요.`);
        return prev;
      }
      if (prev.length >= MAX_COMPARE) {
        flashToast(
          `비교 목록은 최대 ${MAX_COMPARE}개까지예요. 비교 화면에서 빼고 다시 추가해주세요.`
        );
        return prev;
      }
      const next = [...prev, slug];
      const dongName = data?.find((d) => d.slug === slug)?.name ?? slug;
      flashToast(`${dongName} 추가됨 (${next.length}/${MAX_COMPARE})`);
      return next;
    });
  };

  const handleOpenCompare = () => {
    if (compareSlugs.length === 0) return;
    navigate(`/compare?dongs=${compareSlugs.join(',')}`);
  };

  const handleFavorite = (slug: string) => {
    if (!user) {
      flashToast('로그인이 필요합니다 — 로그인 페이지로 이동');
      // Slight delay so the toast renders before the route swap.
      window.setTimeout(() => navigate('/login'), 300);
      return;
    }
    const dongName = data?.find((d) => d.slug === slug)?.name ?? slug;
    addFavoriteMut.mutate(slug, {
      onSuccess: () => flashToast(`${dongName} 찜 목록에 추가됨`),
      onError: (err) => {
        flashToast(getAuthErrorMessage(err, '찜 추가에 실패했어요.'));
      },
    });
  };

  const handlePreferenceComplete = (next: Weights) => {
    // Apply learned weights and close the modal. The /scores query refetches
    // automatically via TanStack Query's queryKey invalidation, and HeatMap's
    // setStyle transitions colors over --transition-slow (300ms).
    setWeights(next);
    setPreferenceOpen(false);
    // Persist to backend if logged in. Failures are non-fatal (UX-only feature).
    if (user) {
      void putMyPreference(next).catch(() => {
        // Silent — saving prefs is best-effort.
      });
    }
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
        compareCount={compareSlugs.length}
        onOpenCompare={handleOpenCompare}
        heatmapVisible={heatmapVisible}
        onToggleHeatmap={setHeatmapVisible}
        userName={
          user ? (user.nickname && user.nickname.trim()) || user.username : null
        }
      />

      <section className="main-map__map" aria-label="서울 동네 히트맵">
        <HeatMap
          dongs={data ?? []}
          onDongClick={handleDongClick}
          heatmapVisible={heatmapVisible}
        />

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

        {toast && (
          <div className="main-map__overlay main-map__toast" role="status" aria-live="polite">
            {toast}
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
