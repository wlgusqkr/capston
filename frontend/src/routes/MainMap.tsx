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
import KernelScoreLayer from '@/components/Map/KernelScoreLayer';
import KernelScorePanel from '@/components/Map/KernelScorePanel';
import Legend from '@/components/Map/Legend';
import Sidebar from '@/components/Map/Sidebar';
import TransactionFilters, {
  buildFilters,
} from '@/components/Map/TransactionFilters';
import type { PeriodKey } from '@/components/Map/TransactionFilters';
import TransactionPanel from '@/components/Map/TransactionPanel';
import TransactionPinLayer, {
  MIN_ZOOM_FOR_PINS,
  jibunKeyOf,
} from '@/components/Map/TransactionPinLayer';
import type { MapState } from '@/components/Map/TransactionPinLayer';
import ViewToggle from '@/components/Map/ViewToggle';
import PreferenceModal from '@/components/Onboarding/PreferenceModal';
import { useAuth } from '@/contexts/AuthContext';
import { useAddFavorite } from '@/hooks/useFavorites';
import { useDongScores } from '@/hooks/useDongs';
import { useKernelScore } from '@/hooks/useKernelScore';
import type { LatLng } from '@/hooks/useKernelScore';
import { useTransactions } from '@/hooks/useTransactions';
import { putMyPreference } from '@/lib/api';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { DEFAULT_WEIGHTS } from '@/types/api';
import type {
  DongScore,
  TransactionDealTypeFilter,
  Weights,
} from '@/types/api';

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

  // ---- Phase 1b: transaction pin layer state ------------------------------
  // Map state — bbox + zoom — pushed up from TransactionPinLayer (debounced).
  const [mapState, setMapState] = useState<MapState | null>(null);
  // Filter UI state.
  const [txDealType, setTxDealType] = useState<TransactionDealTypeFilter>('all');
  const [txPeriod, setTxPeriod] = useState<PeriodKey>('6m');
  // Selected jibun (panel state). null → panel closed.
  const [selectedJibun, setSelectedJibun] = useState<string | null>(null);

  // ---- Phase 2b: kernel-score (arbitrary point click) state ---------------
  // Clicked point. Null → kernel panel closed + marker hidden.
  const [kernelPoint, setKernelPoint] = useState<LatLng | null>(null);
  // Per-panel weights — start as a copy of the sidebar weights when panel
  // opens, then evolve independently. The sliders inside the panel let the
  // user explore "what if" without disturbing the main heatmap.
  const [kernelWeights, setKernelWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  // Debounced version sent to the API. State updates are immediate (UI feels
  // snappy); the network call lags by 300ms (no spam during slider drag).
  const [kernelWeightsDebounced, setKernelWeightsDebounced] =
    useState<Weights>(DEFAULT_WEIGHTS);
  const kernelWeightsTimer = useRef<number | null>(null);
  const [kernelSchool, setKernelSchool] = useState<string>('');

  const txFilters = useMemo(() => buildFilters(txDealType, txPeriod), [txDealType, txPeriod]);

  const txQuery = useTransactions({
    bbox: mapState?.bbox ?? null,
    zoom: mapState?.zoom ?? 0,
    filters: txFilters,
  });

  const showZoomHint = mapState != null && mapState.zoom < MIN_ZOOM_FOR_PINS;

  // Pins for the currently selected jibun — used by TransactionPanel.
  const selectedJibunPins = useMemo(() => {
    if (!selectedJibun || !txQuery.data) return [];
    return txQuery.data.items.filter((p) => jibunKeyOf(p) === selectedJibun);
  }, [selectedJibun, txQuery.data]);

  // If filter changes drop the selected jibun from the result set, close.
  useEffect(() => {
    if (selectedJibun && txQuery.data && selectedJibunPins.length === 0) {
      setSelectedJibun(null);
    }
  }, [selectedJibun, txQuery.data, selectedJibunPins.length]);

  // ---- Phase 2b: kernel score query (debounced weights) -------------------
  const kernelQuery = useKernelScore({
    point: kernelPoint,
    weights: kernelWeightsDebounced,
    school: kernelSchool,
  });

  // Debounce kernelWeights → kernelWeightsDebounced (300ms).
  useEffect(() => {
    if (kernelWeightsTimer.current != null) {
      window.clearTimeout(kernelWeightsTimer.current);
    }
    kernelWeightsTimer.current = window.setTimeout(() => {
      setKernelWeightsDebounced(kernelWeights);
      kernelWeightsTimer.current = null;
    }, 300);
    return () => {
      if (kernelWeightsTimer.current != null) {
        window.clearTimeout(kernelWeightsTimer.current);
      }
    };
  }, [kernelWeights]);

  // When the kernel panel opens (point becomes non-null after being null),
  // seed the panel weights from the current sidebar weights — that's the
  // most intuitive starting point. Compares an isOpen transition.
  const wasKernelOpenRef = useRef(false);
  useEffect(() => {
    const isOpen = kernelPoint != null;
    if (isOpen && !wasKernelOpenRef.current) {
      setKernelWeights(weights);
      setKernelWeightsDebounced(weights);
    }
    wasKernelOpenRef.current = isOpen;
  }, [kernelPoint, weights]);

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
    // Mutually exclusive with the transaction & kernel panels.
    setSelectedJibun(null);
    setKernelPoint(null);
  };

  const handleClosePanel = () => setSelectedSlug(null);

  const handlePinClick = (jibunKey: string) => {
    setSelectedJibun(jibunKey);
    // Mutually exclusive with the dong & kernel panels.
    setSelectedSlug(null);
    setKernelPoint(null);
  };

  /** Empty-map click → kernel score panel (Phase 2b).
   *  Click priority: pin (zoom 13+) > map background (kernel) > dong polygon.
   *  - Pin clicks: Leaflet stops propagation by default; useMapEvents.click
   *    here never fires.
   *  - Polygon clicks: HeatMap.tsx onEachFeature stops propagation so this
   *    handler never fires (DongPanel takes over).
   *  - Empty (tile) clicks: only this handler runs.
   *  Mutually exclusive with the dong & transaction panels.
   */
  const handleKernelPointClick = (latLng: LatLng) => {
    setKernelPoint(latLng);
    setSelectedSlug(null);
    setSelectedJibun(null);
  };

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
          activeLayer={activeLayer}
        >
          <TransactionPinLayer
            pins={txQuery.data?.items ?? []}
            selectedJibun={selectedJibun}
            onPinClick={handlePinClick}
            onMapStateChange={setMapState}
          />
          <KernelScoreLayer
            point={kernelPoint}
            onPointClick={handleKernelPointClick}
          />
        </HeatMap>

        <TransactionFilters
          dealType={txDealType}
          period={txPeriod}
          onDealTypeChange={setTxDealType}
          onPeriodChange={setTxPeriod}
        />

        {showZoomHint && (
          <p className="tx-zoom-hint mono-label" role="status">
            더 확대해 거래 핀 보기
          </p>
        )}

        {!showZoomHint && txQuery.isError && (
          <div
            className="main-map__overlay main-map__overlay--error"
            role="alert"
          >
            거래 정보를 불러오지 못했어요.
          </div>
        )}

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

        <TransactionPanel
          jibunKey={selectedJibun}
          pins={selectedJibunPins}
          hasMore={txQuery.data?.has_more ?? false}
          onClose={() => setSelectedJibun(null)}
        />

        <KernelScorePanel
          point={kernelPoint}
          data={kernelQuery.data}
          isLoading={kernelQuery.isLoading}
          isError={kernelQuery.isError}
          isFetching={kernelQuery.isFetching}
          weights={kernelWeights}
          onWeightsChange={setKernelWeights}
          school={kernelSchool}
          onSchoolChange={setKernelSchool}
          onClose={() => setKernelPoint(null)}
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
