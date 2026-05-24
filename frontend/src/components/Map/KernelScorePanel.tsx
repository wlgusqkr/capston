// KernelScorePanel — slide-in right-side panel for arbitrary-point scoring
// (Phase 2b). Mirrors TransactionPanel structure for visual consistency.
//
// Sections (top → bottom):
//   1. Header — "선택 지점" mono uppercase + lat,lng caption + close ×
//   2. Score card — Score primitive size="lg" tone="neutral" + "/ 100"
//   3. Breakdown bars — rent / amenity / transit (5-stop quintile colors)
//   4. Weight sliders — debounced 300ms (parent owns weight state)
//   5. School select — 16-option dropdown + commute_min line when present
//   6. Nearest facilities list — emoji + mono uppercase name + walk_min
//   7. Radius counts grid — 6 categories, mono uppercase label + big number
//
// ESC closes the panel.
import { useMemo } from 'react';

import { MetricBar, Score, Select, Slider } from '@/components/ui';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { KERNEL_SCHOOL_OPTIONS } from '@/types/api';
import type {
  KernelScoreResponse,
  NearestFacility,
  Weights,
} from '@/types/api';

/** Emoji for each nearest-facility category. */
const CATEGORY_EMOJI: Record<string, string> = {
  subway: '🚇',
  convenience: '🏪',
  cafe: '☕',
  hospital: '🏥',
  park: '🌳',
  mart: '🛒',
  pharmacy: '💊',
  restaurant: '🍚',
};

/** Korean label for each radius_counts category. SPEC keeps the response
 *  keys in English; the UI surfaces Korean. */
const CATEGORY_LABEL_KO: Record<string, string> = {
  convenience: '편의점',
  cafe: '카페',
  hospital: '병원',
  park: '공원',
  mart: '마트',
  pharmacy: '약국',
  restaurant: '음식점',
  subway: '지하철',
};

/** Stable display order for the radius_counts grid (2 cols × 3 rows). */
const RADIUS_GRID_ORDER = [
  'convenience',
  'cafe',
  'hospital',
  'park',
  'mart',
  'pharmacy',
] as const;

/** Stable display order for nearest list (subway first, then alphabetical). */
const NEAREST_ORDER: Record<string, number> = {
  subway: 0,
  convenience: 1,
  cafe: 2,
  mart: 3,
  hospital: 4,
  pharmacy: 5,
  park: 6,
};

export interface KernelScorePanelProps {
  /** Selected point [lat, lng]. Null → panel closed. */
  point: [number, number] | null;
  /** Latest server response (or stale placeholder). */
  data: KernelScoreResponse | null | undefined;
  /** True while the first load is fetching. Subsequent slider drags use
   *  placeholderData (previous data) and do NOT raise this flag. */
  isLoading: boolean;
  /** True when the latest fetch errored. */
  isError: boolean;
  /** True while a refetch is in progress (for subtle "updating…" hint). */
  isFetching: boolean;
  /** Current weights (integer percent 0~100, from MainMap state). */
  weights: Weights;
  /** Live-update weights on every slider step (parent should debounce
   *  the API call, not the state — UI must feel responsive). */
  onWeightsChange: (next: Weights) => void;
  /** Selected school (one of KERNEL_SCHOOL_OPTIONS) or empty string. */
  school: string;
  onSchoolChange: (next: string) => void;
  onClose: () => void;
}

export default function KernelScorePanel({
  point,
  data,
  isLoading,
  isError,
  isFetching,
  weights,
  onWeightsChange,
  school,
  onSchoolChange,
  onClose,
}: KernelScorePanelProps) {
  const isOpen = point != null;

  // ESC closes when open — shared useEscapeKey (post-A-7 dedup).
  useEscapeKey(onClose, isOpen);

  const sortedNearest = useMemo<NearestFacility[]>(() => {
    if (!data?.nearest) return [];
    const copy = [...data.nearest];
    copy.sort((a, b) => {
      const oa = NEAREST_ORDER[a.category] ?? 99;
      const ob = NEAREST_ORDER[b.category] ?? 99;
      return oa - ob;
    });
    return copy;
  }, [data?.nearest]);

  const coordLabel = point
    ? `${point[0].toFixed(5)}, ${point[1].toFixed(5)}`
    : '';

  return (
    <aside
      className={`absolute top-0 right-0 h-full w-[400px] max-w-full bg-surface border-l border-border transition-transform duration-[300ms] ease-out z-[520] flex flex-col ${isOpen ? 'translate-x-0 pointer-events-auto shadow-floating' : 'translate-x-full pointer-events-none'}`}
      // @ts-expect-error — `inert` lands as a boolean attr but React typed it later.
      inert={!isOpen ? '' : undefined}
      aria-hidden={!isOpen}
      aria-label="커널 점수 패널"
      role="complementary"
    >
      <div className="flex flex-col h-full min-h-0">
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="m-0 text-text-subtle uppercase mono-label">선택 지점</p>
            <p className="m-0 font-[var(--font-family-mono)] text-caption leading-[1.4] text-text-muted tabular">{coordLabel}</p>
            {data?._meta?.dong_name && (
              <p className="mt-1 mb-0 text-feature-heading leading-[1.3] font-semibold text-text tracking-normal">{data._meta.dong_name}</p>
            )}
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-md border border-transparent bg-transparent text-text-muted text-feature-heading leading-none cursor-pointer shrink-0 transition-colors duration-[120ms] ease-out inline-flex items-center justify-center hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
            aria-label="패널 닫기"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5">
          {isLoading && !data && (
            <div className="text-body-base text-text-muted tracking-normal py-4 text-center" role="status">
              점수 계산 중…
            </div>
          )}

          {isError && !data && (
            <div className="text-body-base text-danger tracking-normal py-4 text-center" role="alert">
              점수를 계산하지 못했습니다.
            </div>
          )}

          {data && (
            <>
              <ScoreSection score={data.score} isFetching={isFetching} />

              <BreakdownSection breakdown={data.breakdown} />

              <WeightsSection
                weights={weights}
                onChange={onWeightsChange}
              />

              <SchoolSection
                school={school}
                onSchoolChange={onSchoolChange}
                commuteMin={data.commute_min}
              />

              {sortedNearest.length > 0 && (
                <NearestSection items={sortedNearest} />
              )}

              {data.radius_counts && (
                <RadiusSection counts={data.radius_counts} />
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Score section                                                              */
/* -------------------------------------------------------------------------- */

function ScoreSection({
  score,
  isFetching,
}: {
  score: number;
  isFetching: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Score
          value={Math.round(score)}
          unit="/ 100"
          size="lg"
          tone="neutral"
          ariaLabel={`종합 점수 ${score.toFixed(1)}점`}
        />
        {isFetching && (
          <span className="text-text-subtle uppercase mono-label">갱신 중</span>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Breakdown bars                                                             */
/* -------------------------------------------------------------------------- */

function BreakdownSection({
  breakdown,
}: {
  breakdown: KernelScoreResponse['breakdown'];
}) {
  return (
    <section className="flex flex-col gap-3" aria-label="점수 구성">
      <h3 className="font-[var(--font-family-mono)] text-mono-label leading-[1.4] font-normal text-text-subtle m-0 tracking-[0.26px] uppercase">점수 구성</h3>
      <div className="flex flex-col gap-3">
        <MetricBar label="전월세" value={breakdown.rent} tone="score" />
        <MetricBar label="생활시설" value={breakdown.amenity} tone="score" />
        <MetricBar label="교통" value={breakdown.transit} tone="score" />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Weights section                                                            */
/* -------------------------------------------------------------------------- */

function WeightsSection({
  weights,
  onChange,
}: {
  weights: Weights;
  onChange: (next: Weights) => void;
}) {
  return (
    <section className="flex flex-col gap-3" aria-label="가중치">
      <h3 className="font-[var(--font-family-mono)] text-mono-label leading-[1.4] font-normal text-text-subtle m-0 tracking-[0.26px] uppercase">가중치</h3>
      <div className="flex flex-col gap-3">
        <WeightRow
          label="전월세"
          value={weights.rent}
          onChange={(v) => onChange({ ...weights, rent: v })}
        />
        <WeightRow
          label="생활시설"
          value={weights.amenity}
          onChange={(v) => onChange({ ...weights, amenity: v })}
        />
        <WeightRow
          label="교통"
          value={weights.transit}
          onChange={(v) => onChange({ ...weights, transit: v })}
        />
      </div>
    </section>
  );
}

function WeightRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  // Uses the shared <Slider> primitive (post-R-6 dedup). DS spec is
  // 4px track + 20px white thumb + 2px Near-Black border — owned by
  // Slider.css, not re-rolled here.
  return (
    <Slider
      label={label}
      value={value}
      onChange={onChange}
      valueText={`${value}`}
      aria-label={`${label} 가중치`}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* School + commute                                                           */
/* -------------------------------------------------------------------------- */

function SchoolSection({
  school,
  onSchoolChange,
  commuteMin,
}: {
  school: string;
  onSchoolChange: (next: string) => void;
  commuteMin: number | null;
}) {
  return (
    <section className="flex flex-col gap-3" aria-label="통학">
      <h3 className="font-[var(--font-family-mono)] text-mono-label leading-[1.4] font-normal text-text-subtle m-0 tracking-[0.26px] uppercase">통학 학교</h3>
      <Select
        value={school}
        onChange={(e) => onSchoolChange(e.target.value)}
        aria-label="학교 선택"
      >
        <option value="">선택 안 함</option>
        {KERNEL_SCHOOL_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      {school && commuteMin != null && (
        <p className="m-0 p-3 bg-surface-alt rounded-card inline-flex items-center gap-2 text-body-base tracking-normal text-text">
          <span aria-hidden="true">🎓</span>
          <span className="inline-flex items-baseline flex-wrap gap-0">
            <span className="font-medium">{school}</span>
            <span className="text-text-muted"> 통학 </span>
            <span className="tabular font-[var(--font-family-mono)] text-body-large font-medium mx-1">{commuteMin}</span>
            <span className="text-text-muted">분</span>
          </span>
        </p>
      )}
      {school && commuteMin == null && (
        <p className="m-0 text-text-subtle bg-transparent p-0 uppercase mono-label">
          학교 매핑 정보 없음
        </p>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Nearest list                                                               */
/* -------------------------------------------------------------------------- */

function NearestSection({ items }: { items: NearestFacility[] }) {
  return (
    <section className="flex flex-col gap-3" aria-label="가까운 시설">
      <h3 className="font-[var(--font-family-mono)] text-mono-label leading-[1.4] font-normal text-text-subtle m-0 tracking-[0.26px] uppercase">가까운 시설</h3>
      <ul className="list-none m-0 p-0 flex flex-col border-t border-border">
        {items.map((it) => (
          <NearestRow key={`${it.category}-${it.name}`} item={it} />
        ))}
      </ul>
    </section>
  );
}

function NearestRow({ item }: { item: NearestFacility }) {
  const emoji = CATEGORY_EMOJI[item.category] ?? '📍';
  return (
    <li className="grid grid-cols-[24px_1fr_auto] items-baseline gap-2 py-3 border-b border-border text-body-base tracking-normal">
      <span className="text-body-base leading-none" aria-hidden="true">
        {emoji}
      </span>
      <span className="min-w-0 text-text inline-flex items-baseline flex-wrap gap-0 overflow-hidden">
        <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
        {item.line && (
          <span className="text-text-muted text-caption"> ({item.line})</span>
        )}
      </span>
      <span className="inline-flex flex-col items-end gap-1">
        <span className="text-text uppercase mono-label tabular">
          WALK {item.walk_min}MIN
        </span>
        <span className="text-text-muted text-caption tabular">
          {item.distance_m}m
        </span>
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Radius counts grid                                                         */
/* -------------------------------------------------------------------------- */

function RadiusSection({
  counts,
}: {
  counts: KernelScoreResponse['radius_counts'];
}) {
  return (
    <section className="flex flex-col gap-3" aria-label="반경 1km 시설">
      <h3 className="font-[var(--font-family-mono)] text-mono-label leading-[1.4] font-normal text-text-subtle m-0 tracking-[0.26px] uppercase">반경 1KM 시설</h3>
      <div className="grid grid-cols-2 gap-2">
        {RADIUS_GRID_ORDER.map((cat) => (
          <div key={cat} className="flex flex-col gap-1 p-3 bg-surface-alt rounded-md min-h-[64px] justify-center">
            <span className="text-text-subtle uppercase mono-label">
              {CATEGORY_LABEL_KO[cat] ?? cat}
            </span>
            <span className="font-[var(--font-family-mono)] text-card-heading font-semibold leading-none text-text tracking-[0] tabular">
              {(counts[cat] ?? 0).toLocaleString('ko-KR')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
