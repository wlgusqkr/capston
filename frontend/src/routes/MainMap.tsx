// MainMap (`/`) — entry point of the app.
//
// Phase 5 layout (STUDIO MATCH):
//   ┌──────────────┬───────────────────────────────────────┐
//   │  STUDIO      │                                        │
//   │  MATCH       │                                        │
//   │  (filters)   │                                        │
//   │  ─────────   │       Leaflet map (full-bleed)         │
//   │  LAYERS      │       425 행정동 polygon               │
//   │  (5 radio)   │                                        │
//   │  ─────────   │       Legend + ViewToggle floating     │
//   │  WEIGHTS     │       (bottom-right)                   │
//   │  (sliders)   │                                        │
//   └──────────────┴───────────────────────────────────────┘
//   280px sidebar  +  fluid map
//
// State:
//   - useReducer(panelReducer)        right slide-in 패널 코디네이션
//   - useStudioMatchFilters()         URL state, debounced 200ms via hook
//   - activeLayer                     'match' (Phase 5 default) | 'composite' | ...
//   - weights                         가중치 (match 모드일 때 disabled)
//   - heatmapVisible                  히트맵 표시 (legacy 보존)
//
// 제거됨 (Phase 5, eng-review #1·#13):
//   - rentCapEnabled / rentCap        — 월세 슬라이더로 흡수
//   - nearUniversityOnly              — STUDIO MATCH 패널 안 chip 으로 보존
//   - CriteriaPanel (floating pill)   — fixed sidebar 로 전환
//   - LayerSwitcher (floating pills)  — fixed sidebar 의 LAYERS 섹션으로 전환
//   - FilterControls                  — 필터들이 STUDIO MATCH 로 통합
//
// SPEC 6.1. Mobile is WONTFIX project decision (desktop-only).
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import CompareChip from '@/components/Map/CompareChip';
import DongPanel from '@/components/Map/DongPanel';
import HeatMap from '@/components/Map/HeatMap';
import KernelScoreLayer from '@/components/Map/KernelScoreLayer';
import KernelScorePanel from '@/components/Map/KernelScorePanel';
import { LAYERS } from '@/components/Map/LayerSwitcher';
import type { LayerKey } from '@/components/Map/LayerSwitcher';
import Legend from '@/components/Map/Legend';
import MatchFilterPanel from '@/components/Map/MatchFilterPanel';
import MatchKpiCard from '@/components/Map/MatchKpiCard';
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
import WeightSliders from '@/components/Map/WeightSliders';
import PreferenceModal from '@/components/Onboarding/PreferenceModal';
import { useAuth } from '@/contexts/AuthContext';
import { useAddFavorite } from '@/hooks/useFavorites';
import { useDongMatchCounts } from '@/hooks/useDongMatchCounts';
import { useDongScores } from '@/hooks/useDongs';
import { useKernelScore } from '@/hooks/useKernelScore';
import { useStudioMatchFilters } from '@/hooks/useStudioMatchFilters';
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

  // Phase 5: default 'match' (자취생 첫 화면이 자기 조건으로 즉시 시작).
  const [activeLayer, setActiveLayer] = useState<LayerKey>('match');
  const [nearUniversityOnly, setNearUniversityOnly] = useState(false);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  // Studio Match 필터 (URL state 동기, debounce는 useDongMatchCounts 안에서).
  const { filters: matchFilters, patch: patchMatchFilters, reset: resetMatchFilters } =
    useStudioMatchFilters();

  // Panel coordination — single source of truth for "which panel is open".
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
  } = panelState;

  // ---- Phase 1b: transaction pin layer state ------------------------------
  const [mapState, setMapState] = useState<MapState | null>(null);
  const [txDealType, setTxDealType] = useState<TransactionDealTypeFilter>('all');
  const [txPeriod, setTxPeriod] = useState<PeriodKey>('6m');

  // ---- Phase 2b: kernel-score debounce ------------------------------------
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

  useEffect(() => {
    if (kernelPoint != null) {
      setKernelWeightsDebounced(kernelWeights);
    }
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

  const { data: scoresData, isLoading: scoresLoading, isError: scoresError, error: scoresErr } =
    useDongScores(weights);

  // Phase 5: match-counts 항상 fetch (히트맵 둘 다 동시 사용 가능).
  const matchQuery = useDongMatchCounts(matchFilters);
  const matchCounts = matchQuery.data?.dongs ?? [];
  const totalMatched = matchQuery.data?.total_matched ?? null;
  const matchedDongs = useMemo(() => {
    if (!matchQuery.data) return null;
    return matchQuery.data.dongs.filter((d) => d.count > 0).length;
  }, [matchQuery.data]);

  /** Raw per-axis scores for the currently selected dong, looked up on the
   *  /scores list we already have. Avoids a second network call. */
  const selectedRawScores = useMemo(() => {
    if (!selectedSlug || !scoresData) return null;
    const row = scoresData.find((d) => d.slug === selectedSlug);
    if (!row) return null;
    return {
      rent: row.score_rent,
      amenity: row.score_amenity,
      transit: row.score_transit,
    };
  }, [scoresData, selectedSlug]);

  const suppressTooltips = useMemo(
    () =>
      selectedJibun != null || selectedSlug != null || kernelPoint != null,
    [selectedJibun, selectedSlug, kernelPoint],
  );

  const isMatchMode = activeLayer === 'match';

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
        const dongName = scoresData?.find((d) => d.slug === slug)?.name ?? slug;
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
      const dongName = scoresData?.find((d) => d.slug === slug)?.name ?? slug;
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
    const dongName = scoresData?.find((d) => d.slug === slug)?.name ?? slug;
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
      void putMyPreference(next).catch(() => {});
    }
  };

  // HeatMap mode + activeLayer 분리. 'match' → mode='match', score 축은 미사용.
  const heatmapMode = isMatchMode ? 'match' : 'score';
  const scoreLayer = isMatchMode ? 'composite' : (activeLayer as 'composite' | 'rent' | 'amenity' | 'transit');

  return (
    <div className="main-map">
      <h1 className="sr-only">서울 동네 점수 지도</h1>

      {/* ───── 좌측 사이드바 (Phase 5) ───── */}
      <aside className="main-map__sidebar" aria-label="필터 + 가중치 사이드바">
        {/* 1) STUDIO MATCH (top) */}
        <MatchFilterPanel
          filters={matchFilters}
          onPatch={patchMatchFilters}
          onReset={resetMatchFilters}
          modeActive={isMatchMode}
          totalMatched={totalMatched}
          matchedDongs={matchedDongs}
          isLoading={matchQuery.isLoading || matchQuery.isFetching}
          nearUniversityOnly={nearUniversityOnly}
          onNearUniversityToggle={setNearUniversityOnly}
        />

        <div className="main-map__sidebar-divider" aria-hidden="true" />

        {/* 2) LAYERS — radio 5종 */}
        <section className="main-map__sidebar-section">
          <p className="mono-label main-map__sidebar-eyebrow">LAYERS</p>
          <h3 className="main-map__sidebar-title">히트맵 모드</h3>
          <div className="main-map__layer-radio" role="radiogroup" aria-label="히트맵 레이어">
            {LAYERS.map((layer) => {
              const selected = layer.key === activeLayer;
              return (
                <label
                  key={layer.key}
                  className={`main-map__layer-radio-item${
                    selected ? ' main-map__layer-radio-item--active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="active-layer"
                    value={layer.key}
                    checked={selected}
                    onChange={() => setActiveLayer(layer.key)}
                  />
                  <span>{layer.label}</span>
                </label>
              );
            })}
          </div>
          <label className="main-map__heatmap-toggle">
            <input
              type="checkbox"
              checked={heatmapVisible}
              onChange={(e) => setHeatmapVisible(e.target.checked)}
            />
            <span>히트맵 표시</span>
          </label>
        </section>

        <div className="main-map__sidebar-divider" aria-hidden="true" />

        {/* 3) WEIGHTS (bottom) — match 모드에서는 disabled */}
        <section className="main-map__sidebar-section">
          <p className="mono-label main-map__sidebar-eyebrow">WEIGHTS</p>
          <h3 className="main-map__sidebar-title">종합 점수 가중치</h3>
          {isMatchMode ? (
            <p className="main-map__sidebar-hint">
              매칭 모드에서는 가중치가 적용되지 않아요. LAYERS 에서 종합/전월세/시설/교통 으로
              전환하면 활성화됩니다.
            </p>
          ) : null}
          <WeightSliders
            weights={weights}
            onWeightsChange={setWeights}
            onOpenPreference={() => setPreferenceOpen(true)}
            showSum={false}
            disabled={isMatchMode}
            disabledHint="매칭 모드에서는 가중치 미사용"
          />
        </section>
      </aside>

      {/* ───── 우측 지도 영역 ───── */}
      <section
        id="main"
        className="main-map__map"
        aria-label="서울 동네 히트맵"
      >
        <HeatMap
          dongs={scoresData ?? []}
          onDongClick={handleDongClick}
          heatmapVisible={heatmapVisible}
          mode={heatmapMode}
          activeLayer={scoreLayer}
          matchCounts={isMatchMode ? matchCounts : undefined}
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

        {/* ---- Top-right: TransactionFilters + CompareChip (when basket ≥ 1) ---- */}
        <TransactionFilters
          dealType={txDealType}
          period={txPeriod}
          onDealTypeChange={setTxDealType}
          onPeriodChange={setTxPeriod}
        />
        <div className="main-map__compare-chip">
          <CompareChip count={compareSlugs.length} onClick={handleOpenCompare} />
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

        {scoresLoading && (
          <div className="main-map__overlay" role="status" aria-live="polite">
            동네 점수를 불러오는 중…
          </div>
        )}
        {scoresError && (
          <div className="main-map__overlay main-map__overlay--error" role="alert">
            데이터를 불러오지 못했습니다.
            <span className="main-map__overlay-detail">
              {scoresErr instanceof Error ? scoresErr.message : '알 수 없는 오류'}
            </span>
          </div>
        )}

        {toast && (
          <div className="main-map__overlay main-map__toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        {/* ---- Bottom-right: Legend + ViewToggle ---- */}
        <Legend mode={isMatchMode ? 'match' : 'score'} />
        <ViewToggle />

        {/* ---- Right slide-in panels ---- */}
        <DongPanel
          slug={selectedSlug}
          weights={weights}
          rawScores={selectedRawScores}
          onClose={handleClosePanel}
          onOpenDetail={handleOpenDetail}
          onAddCompare={handleAddCompare}
          onFavorite={handleFavorite}
          /* Phase 5: match 모드일 때 score 카드 위에 매칭 KPI 카드 노출 */
          matchKpi={
            isMatchMode ? (
              <MatchKpiCard slug={selectedSlug} filters={matchFilters} />
            ) : null
          }
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
