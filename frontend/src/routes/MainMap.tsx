// MainMap (`/`) — entry point of the app.
//
// R-1 layout (Stage 2b):
//   Full-bleed Leaflet map underneath. Floating chrome at the corners:
//     top-left:     <LayerSwitcher>  (4-tab pill row)
//     bottom-left:  <CriteriaPanel>  (collapsed pill → expanded card with
//                                     WeightSliders + FilterControls)
//                   first-visit ephemeral coach-mark (D-10) anchored beside
//     top-right:    <TransactionFilters> + <CompareChip> (chip when basket≥1)
//     bottom-right: <Legend>, <ViewToggle>, Leaflet zoom (stacked)
//   Right edge (slide-in, mutually exclusive):
//     <DongPanel>, <TransactionPanel>, <KernelScorePanel>
//
// State:
//   - useReducer(panelReducer)   panel coordination + criteria + coach
//                                (selectedSlug / selectedJibun / kernelPoint
//                                 + kernelWeights / kernelSchool +
//                                 criteriaOpen + coachVisible). See
//                                 ./MainMap.panelReducer.ts for the state
//                                 machine + invariant comment.
//   - useState                   non-panel state (weights, activeLayer,
//                                filters, compareSlugs, mapState, toast,
//                                heatmapVisible, preferenceOpen, etc.)
//
// SPEC 6.1. Mobile is WONTFIX project decision (desktop-only).
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import CompareChip from '@/components/Map/CompareChip';
import CriteriaPanel from '@/components/Map/CriteriaPanel';
import DongPanel from '@/components/Map/DongPanel';
import HeatMap from '@/components/Map/HeatMap';
import KernelScoreLayer from '@/components/Map/KernelScoreLayer';
import KernelScorePanel from '@/components/Map/KernelScorePanel';
import LayerSwitcher from '@/components/Map/LayerSwitcher';
import type { LayerKey } from '@/components/Map/LayerSwitcher';
import Legend from '@/components/Map/Legend';
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
import { useTransactions } from '@/hooks/useTransactions';
import { putMyPreference } from '@/lib/api';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { DEFAULT_WEIGHTS } from '@/types/api';
import type {
  DongScore,
  TransactionDealTypeFilter,
  Weights,
} from '@/types/api';

import {
  INITIAL_PANEL_STATE,
  panelReducer,
} from './MainMap.panelReducer';

import './MainMap.css';

const MAX_COMPARE = 3;
/** D-10: coach-mark on the 기준 pill auto-dismisses after this delay. */
const COACH_DISMISS_MS = 4000;

export default function MainMap() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const addFavoriteMut = useAddFavorite();

  // Initial weights — user's saved prefs once login resolves, default otherwise.
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
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  // Panel coordination — single source of truth for "which panel is open"
  // and friends. See ./MainMap.panelReducer.ts.
  const [panelState, dispatchPanel] = useReducer(
    panelReducer,
    INITIAL_PANEL_STATE,
  );
  const {
    selectedSlug,
    selectedJibun,
    kernelPoint,
    kernelWeights,
    kernelSchool,
    criteriaOpen,
    coachVisible,
  } = panelState;

  // ---- Phase 1b: transaction pin layer state ------------------------------
  const [mapState, setMapState] = useState<MapState | null>(null);
  const [txDealType, setTxDealType] = useState<TransactionDealTypeFilter>('all');
  const [txPeriod, setTxPeriod] = useState<PeriodKey>('6m');

  // ---- Phase 2b: kernel-score debounce ------------------------------------
  // kernelWeights lives in panelReducer (coupled to kernelPoint lifetime).
  // We still need a debounced mirror sent to the API.
  const [kernelWeightsDebounced, setKernelWeightsDebounced] =
    useState<Weights>(DEFAULT_WEIGHTS);
  const kernelWeightsTimer = useRef<number | null>(null);

  const txFilters = useMemo(
    () => buildFilters(txDealType, txPeriod),
    [txDealType, txPeriod],
  );

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
      dispatchPanel({ type: 'close_all_right' });
    }
  }, [selectedJibun, txQuery.data, selectedJibunPins.length]);

  // ---- kernel score query (debounced weights) -----------------------------
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

  // When the kernel panel opens, the reducer already seeds kernelWeights
  // from the action payload. Mirror to debounced so the first fetch is
  // immediate (no 300ms blank).
  useEffect(() => {
    if (kernelPoint != null) {
      setKernelWeightsDebounced(kernelWeights);
    }
    // We intentionally only re-sync on kernelPoint identity change; weight
    // changes flow through the debounce above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kernelPoint]);

  // ?onboarding=1 — auto-open the preference modal (entry from MyPage).
  useEffect(() => {
    if (searchParams.get('onboarding') === '1') {
      setPreferenceOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('onboarding');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // D-10: auto-dismiss the coach-mark after 4s if untouched.
  useEffect(() => {
    if (!coachVisible) return;
    const timer = window.setTimeout(() => {
      dispatchPanel({ type: 'dismiss_coach' });
    }, COACH_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [coachVisible]);

  const { data, isLoading, isError, error } = useDongScores(weights);

  /** Raw per-axis scores for the currently selected dong, looked up on the
   *  /scores list we already have. Avoids a second network call. */
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

  // Tooltip suppression — derived from the reducer state. Memo to keep
  // TransactionPinLayer stable.
  const suppressTooltips = useMemo(
    () =>
      selectedJibun != null || selectedSlug != null || kernelPoint != null,
    [selectedJibun, selectedSlug, kernelPoint],
  );

  /* ---------- Click handlers (dispatch into the reducer) ------------------ */

  const handleDongClick = (dong: DongScore) => {
    dispatchPanel({ type: 'open_dong', slug: dong.slug });
  };

  const handleClosePanel = () => {
    dispatchPanel({ type: 'close_all_right' });
  };

  const handlePinClick = (jibunKey: string) => {
    dispatchPanel({ type: 'open_jibun', key: jibunKey });
  };

  const handleKernelPointClick = (latLng: typeof kernelPoint) => {
    if (latLng == null) return;
    dispatchPanel({
      type: 'open_kernel',
      point: latLng,
      resetWeightsTo: weights,
    });
  };

  const handleOpenDetail = (slug: string) => {
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

  useEffect(
    () => () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    },
    [],
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
          `비교 목록은 최대 ${MAX_COMPARE}개까지예요. 비교 화면에서 빼고 다시 추가해주세요.`,
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
    setWeights(next);
    setPreferenceOpen(false);
    if (user) {
      void putMyPreference(next).catch(() => {
        // Silent — saving prefs is best-effort.
      });
    }
  };

  return (
    <div className="main-map">
      {/* sr-only H1 — visible page title for `/` lives in TopNav center
       *   when contextual nav lands in Stage 3 (D-2 revised: contextual
       *   per-route). Until then keep the sr-only heading so screen
       *   readers have something to land on. */}
      <h1 className="sr-only">서울 동네 점수 지도</h1>

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
            suppressTooltips={suppressTooltips}
          />
          <KernelScoreLayer
            point={kernelPoint}
            onPointClick={handleKernelPointClick}
          />
        </HeatMap>

        {/* ---- Top-left: Layer pills ---- */}
        <div className="main-map__layer-pills map-floating-panel map-floating-panel--card">
          <LayerSwitcher
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
            heatmapVisible={heatmapVisible}
            onToggleHeatmap={setHeatmapVisible}
            className="layer-switcher--floating"
          />
        </div>

        {/* ---- Top-right: existing TransactionFilters + CompareChip (when basket ≥ 1) ---- */}
        <TransactionFilters
          dealType={txDealType}
          period={txPeriod}
          onDealTypeChange={setTxDealType}
          onPeriodChange={setTxPeriod}
        />
        <div className="main-map__compare-chip">
          <CompareChip count={compareSlugs.length} onClick={handleOpenCompare} />
        </div>

        {/* ---- Bottom-left: 기준 pill / panel + coach-mark ---- */}
        <div className="main-map__criteria">
          <CriteriaPanel
            open={criteriaOpen}
            onToggle={() => dispatchPanel({ type: 'toggle_criteria' })}
            weights={weights}
            onWeightsChange={setWeights}
            onOpenPreference={() => setPreferenceOpen(true)}
            rentCapEnabled={rentCapEnabled}
            onRentCapToggle={setRentCapEnabled}
            rentCap={rentCap}
            onRentCapChange={setRentCap}
            nearUniversityOnly={nearUniversityOnly}
            onNearUniversityToggle={setNearUniversityOnly}
          />
          {coachVisible && !criteriaOpen && (
            <span
              className="criteria-coach"
              role="status"
              aria-live="polite"
              data-testid="criteria-coach"
            >
              ← 가중치 조절
            </span>
          )}
        </div>

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

        {/* ---- Bottom-right: Legend + ViewToggle (Leaflet zoom is at top-right by default) ---- */}
        <Legend />
        <ViewToggle />

        {/* ---- Right slide-in panels (mutually exclusive via reducer) ---- */}
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
          onClose={handleClosePanel}
        />

        <KernelScorePanel
          point={kernelPoint}
          data={kernelQuery.data}
          isLoading={kernelQuery.isLoading}
          isError={kernelQuery.isError}
          isFetching={kernelQuery.isFetching}
          weights={kernelWeights}
          onWeightsChange={(next) =>
            dispatchPanel({ type: 'set_kernel_weights', weights: next })
          }
          school={kernelSchool}
          onSchoolChange={(next) =>
            dispatchPanel({ type: 'set_kernel_school', school: next })
          }
          onClose={handleClosePanel}
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
