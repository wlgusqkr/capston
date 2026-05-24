// MainMap (`/`) — entry point of the app.
//
// Phase 5 cleanup layout:
//   ┌──────────────┬───────────────────────────────────────┐
//   │  STUDIO      │                                        │
//   │  MATCH       │                                        │
//   │  (filters)   │                                        │
//   │  ─────────   │       Leaflet map (full-bleed)         │
//   │  MAP MODE    │       425 행정동 polygon               │
//   │  (2 radio)   │                                        │
//   │  거래핀 OFF  │       Legend + ViewToggle floating     │
//   │  ─────────   │       (bottom-right)                   │
//   │  WEIGHTS     │                                        │
//   │  (chips +    │                                        │
//   │   sliders)   │                                        │
//   └──────────────┴───────────────────────────────────────┘
//   320px sidebar  +  fluid map
//
// State:
//   - useReducer(panelReducer)        right slide-in 패널 코디네이션
//   - useStudioMatchFilters()         URL state (자취 거래량 필터, 단일 진실)
//   - mapMode                         'match' (default) | 'score'
//   - weights                         (score 모드 + 핀 layer 재사용)
//   - showPins                        거래 핀 layer 토글 (default OFF)
//   - heatmapVisible                  히트맵 표시 (legacy 보존)
//
// 제거됨 (Phase 5 cleanup, 사용자 지적 #1·#2):
//   - LayerSwitcher (LAYERS 5라디오) — MapModeToggle 2라디오로 단순화.
//                                     단일 축 (rent/amenity/transit) 보기는
//                                     WEIGHTS 프리셋 chip (100/0/0) 으로 흡수.
//   - TransactionFilters (top-right floating) — STUDIO MATCH 와 의미 중복.
//                                                핀 layer 가 STUDIO MATCH 필터 사용.
//
// SPEC 6.1. Mobile is WONTFIX project decision (desktop-only).
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import CompareChip from '@/components/Map/CompareChip';
import AdongPanel from '@/components/Map/AdongPanel';
import HeatMap from '@/components/Map/HeatMap';
import KernelScoreLayer from '@/components/Map/KernelScoreLayer';
import KernelScorePanel from '@/components/Map/KernelScorePanel';
import Legend from '@/components/Map/Legend';
import MapModeToggle from '@/components/Map/MapModeToggle';
import type { MapMode } from '@/components/Map/MapModeToggle';
import MatchFilterPanel from '@/components/Map/MatchFilterPanel';
import MatchKpiCard from '@/components/Map/MatchKpiCard';
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
import { useAdongMatchCounts } from '@/hooks/useAdongMatchCounts';
import { useAdongScores } from '@/hooks/useAdongs';
import { useKernelScore } from '@/hooks/useKernelScore';
import { useStudioMatchFilters } from '@/hooks/useStudioMatchFilters';
import { useTransactions } from '@/hooks/useTransactions';
import { putMyPreference } from '@/lib/api';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { DEFAULT_WEIGHTS } from '@/types/api';
import type {
  AdongScore,
  ExplorePeriod,
  MatchFilters,
  RentDealPin,
  TransactionDealTypeFilter,
  TransactionFilters,
  Weights,
} from '@/types/api';

import {
  INITIAL_PANEL_STATE,
  panelReducer,
} from './MainMap.panelReducer';


const MAX_COMPARE = 3;

/** ExplorePeriod → bbox 핀 layer 의 from 일자 변환.
 *  'all' 은 from=null 로 보내 backend 가 전체 기간을 응답하게. */
function periodToFrom(period: ExplorePeriod, today: Date = new Date()): string | null {
  if (period === 'all') return null;
  const days =
    period === '3m' ? 90 : period === '6m' ? 180 : period === '12m' ? 365 : 730;
  const t = new Date(today);
  t.setDate(t.getDate() - days);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** STUDIO MATCH 필터 → bbox 핀 layer 의 backend 필터 (deal_type single + from/to).
 *  deal_types 가 1개면 그대로, 그 외엔 'all' 로 보내고 클라이언트에서 다시 거른다.
 *  backend 변경 없이 단순화 — 핀 limit 200 이라 클라 사이드 추가 필터 비용 무시 가능. */
function matchFiltersToTxFilters(f: MatchFilters): TransactionFilters {
  const dealType: TransactionDealTypeFilter =
    f.deal_types.length === 1
      ? (f.deal_types[0] as TransactionDealTypeFilter)
      : 'all';
  return {
    deal_type: dealType,
    from: periodToFrom(f.period),
    to: null,
  };
}

/** STUDIO MATCH 필터의 deal_types/deposit/monthly/area 까지 핀 결과에 적용.
 *  backend 가 single deal_type 만 받으므로 multi-select 는 클라에서 재필터링.
 *  (Backend bbox 엔드포인트는 deposit/monthly/area 미지원 — 클라 사이드만.) */
function applyClientPinFilter(
  pins: RentDealPin[],
  f: MatchFilters,
): RentDealPin[] {
  return pins.filter((p) => {
    if (!f.deal_types.includes(p.deal_type)) return false;
    if (p.deposit < f.deposit_min || p.deposit > f.deposit_max) return false;
    if (p.monthly_rent < f.monthly_min || p.monthly_rent > f.monthly_max) return false;
    if (p.area_m2 < f.area_min || p.area_m2 > f.area_max) return false;
    return true;
  });
}

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

  // Phase 5 cleanup: mapMode 'match' (default) | 'score'.
  const [mapMode, setMapMode] = useState<MapMode>('match');
  const [nearUniversityOnly, setNearUniversityOnly] = useState(false);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  // Phase 5 cleanup: 거래 핀 toggle (default OFF — 히트맵만으로도 충분).
  const [showPins, setShowPins] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  // Studio Match 필터 (URL state 동기, debounce는 useAdongMatchCounts 안에서).
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

  // ---- Phase 1b → 5 cleanup: pin layer state, STUDIO MATCH 필터 그대로 사용 ----
  const [mapState, setMapState] = useState<MapState | null>(null);

  // ---- Phase 2b: kernel-score debounce ------------------------------------
  const [kernelWeightsDebounced, setKernelWeightsDebounced] =
    useState<Weights>(DEFAULT_WEIGHTS);
  const kernelWeightsTimer = useRef<number | null>(null);

  // STUDIO MATCH 필터 → backend bbox 필터 (deal_type single + from/to).
  const txFilters = useMemo(
    () => matchFiltersToTxFilters(matchFilters),
    [matchFilters],
  );

  const txQuery = useTransactions({
    bbox: mapState?.bbox ?? null,
    zoom: mapState?.zoom ?? 0,
    filters: txFilters,
    // showPins=false 면 useTransactions 가 enabled 라도 결과를 안 그릴 뿐이므로
    // 호출 자체는 켜둠 (zoom 변경 시 이미 캐시되어 ON 토글 즉시 표시).
  });

  // 클라이언트 측 추가 필터 (multi-select deal_types + deposit/monthly/area).
  // backend bbox 엔드포인트는 deposit/monthly/area 미지원 → 여기서 정밀 매칭.
  const filteredPins = useMemo(() => {
    if (!txQuery.data) return [];
    return applyClientPinFilter(txQuery.data.items, matchFilters);
  }, [txQuery.data, matchFilters]);

  const showZoomHint =
    showPins && mapState != null && mapState.zoom < MIN_ZOOM_FOR_PINS;

  // Pins for the currently selected jibun — used by TransactionPanel.
  const selectedJibunPins = useMemo(() => {
    if (!selectedJibun) return [];
    return filteredPins.filter((p) => jibunKeyOf(p) === selectedJibun);
  }, [selectedJibun, filteredPins]);

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
    useAdongScores(weights);

  // Phase 5: match-counts 항상 fetch (히트맵 둘 다 동시 사용 가능).
  const matchQuery = useAdongMatchCounts(matchFilters);
  const matchCounts = matchQuery.data?.adongs ?? [];
  const totalMatched = matchQuery.data?.total_matched ?? null;
  const matchedAdongs = useMemo(() => {
    if (!matchQuery.data) return null;
    return matchQuery.data.adongs.filter((d) => d.count > 0).length;
  }, [matchQuery.data]);

  /** Raw per-axis scores for the currently selected adong, looked up on the
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

  const isMatchMode = mapMode === 'match';

  /* ---------- Click handlers (dispatch into the reducer) ------------------ */

  const handleAdongClick = (adong: AdongScore) => {
    dispatchPanel({ type: 'open_dong', slug: adong.slug });
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
    navigate(`/adong/${slug}`);
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
    navigate(`/compare?adongs=${compareSlugs.join(',')}`);
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

  // HeatMap mode + activeLayer. score 모드는 항상 'composite' (단일 축은 weights 100/0/0 으로 표현).
  const heatmapMode = isMatchMode ? 'match' : 'score';

  return (
    <div className="relative grid grid-cols-[320px_minmax(0,1fr)] w-screen h-[calc(100vh-var(--space-14))] overflow-hidden bg-bg">
      <h1 className="sr-only">서울 동네 점수 지도</h1>

      {/* ───── 좌측 사이드바 (Phase 5 cleanup) ───── */}
      <aside className="relative h-full overflow-y-auto bg-surface border-r border-divider z-[200]" aria-label="필터 + 가중치 사이드바">
        {/* 1) STUDIO MATCH (top) */}
        <MatchFilterPanel
          filters={matchFilters}
          onPatch={patchMatchFilters}
          onReset={resetMatchFilters}
          modeActive={isMatchMode}
          totalMatched={totalMatched}
          matchedAdongs={matchedAdongs}
          isLoading={matchQuery.isLoading || matchQuery.isFetching}
          nearUniversityOnly={nearUniversityOnly}
          onNearUniversityToggle={setNearUniversityOnly}
        />

        <div className="h-px bg-divider m-0" aria-hidden="true" />

        {/* 2) MAP MODE — 매칭 / 종합 점수 + 거래 핀 토글 + 히트맵 토글 */}
        <section className="flex flex-col gap-3 p-6">
          <p className="mono-label m-0 text-text-subtle">MAP MODE</p>
          <h3 className="m-0 text-body-base font-semibold text-text tracking-normal">지도 모드</h3>
          <MapModeToggle mode={mapMode} onModeChange={setMapMode} />
          <label className="flex items-center gap-2 text-caption text-text-subtle cursor-pointer">
            <input
              type="checkbox"
              checked={showPins}
              onChange={(e) => setShowPins(e.target.checked)}
            />
            <span>거래 핀 표시</span>
          </label>
          <label className="flex items-center gap-2 text-caption text-text-subtle cursor-pointer">
            <input
              type="checkbox"
              checked={heatmapVisible}
              onChange={(e) => setHeatmapVisible(e.target.checked)}
            />
            <span>히트맵 표시</span>
          </label>
        </section>

        <div className="h-px bg-divider m-0" aria-hidden="true" />

        {/* 3) WEIGHTS (bottom) — match 모드에서는 disabled */}
        <section className="flex flex-col gap-3 p-6">
          <p className="mono-label m-0 text-text-subtle">SCORE WEIGHTS</p>
          <h3 className="m-0 text-body-base font-semibold text-text tracking-normal">종합 점수 가중치</h3>
          {isMatchMode ? (
            <p className="m-0 text-caption text-text-subtle leading-[1.5] py-2 px-3 bg-surface-alt rounded-sm">
              종합 점수 모드에서만 가중치 적용. 위 MAP MODE 에서 종합 점수로
              전환하면 활성화됩니다.
            </p>
          ) : null}
          <WeightSliders
            weights={weights}
            onWeightsChange={setWeights}
            onOpenPreference={() => setPreferenceOpen(true)}
            showSum={false}
            disabled={isMatchMode}
            disabledHint="종합 점수 모드에서만 가중치 적용"
          />
        </section>
      </aside>

      {/* ───── 우측 지도 영역 ───── */}
      <section
        id="main"
        className="relative w-full h-full bg-surface-alt"
        aria-label="서울 동네 히트맵"
      >
        <HeatMap
          adongs={scoresData ?? []}
          onAdongClick={handleAdongClick}
          heatmapVisible={heatmapVisible}
          mode={heatmapMode}
          activeLayer="composite"
          matchCounts={isMatchMode ? matchCounts : undefined}
        >
          {showPins && (
            <TransactionPinLayer
              pins={filteredPins}
              selectedJibun={selectedJibun}
              onPinClick={handlePinClick}
              onMapStateChange={setMapState}
              suppressTooltips={suppressTooltips}
            />
          )}
          <KernelScoreLayer
            point={kernelPoint}
            onPointClick={handleKernelPointClick}
          />
        </HeatMap>

        {/* ---- Top-right: CompareChip (when basket ≥ 1) ---- */}
        <div className="absolute top-[calc(var(--space-4)+var(--space-16))] right-4 z-[500]">
          <CompareChip count={compareSlugs.length} onClick={handleOpenCompare} />
        </div>

        {showZoomHint && (
          <p className="absolute top-4 left-1/2 -translate-x-1/2 z-[470] py-2 px-4 bg-surface border border-border rounded-sm shadow-floating text-text-subtle m-0 mono-label" role="status">
            더 확대해 거래 핀 보기
          </p>
        )}

        {showPins && !showZoomHint && txQuery.isError && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 py-2 px-4 bg-surface border border-danger rounded-sm shadow-floating text-caption text-danger z-[500] tracking-normal"
            role="alert"
          >
            거래 정보를 불러오지 못했어요.
          </div>
        )}

        {scoresLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 py-2 px-4 bg-surface border border-border rounded-sm shadow-floating text-caption text-text z-[500] tracking-normal" role="status" aria-live="polite">
            동네 점수를 불러오는 중…
          </div>
        )}
        {scoresError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 py-2 px-4 bg-surface border border-danger rounded-sm shadow-floating text-caption text-danger z-[500] tracking-normal" role="alert">
            데이터를 불러오지 못했습니다.
            <span className="text-micro text-text-muted">
              {scoresErr instanceof Error ? scoresErr.message : '알 수 없는 오류'}
            </span>
          </div>
        )}

        {toast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 py-2 px-4 bg-surface border border-secondary rounded-sm shadow-floating text-caption text-text z-[600] tracking-normal" role="status" aria-live="polite">
            {toast}
          </div>
        )}

        {/* ---- Bottom-right: Legend + ViewToggle ---- */}
        <Legend mode={isMatchMode ? 'match' : 'score'} />
        <ViewToggle />

        {/* ---- Right slide-in panels ---- */}
        <AdongPanel
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
