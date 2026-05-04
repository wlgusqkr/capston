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

import { Score, Select } from '@/components/ui';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { KERNEL_SCHOOL_OPTIONS } from '@/types/api';
import type {
  KernelScoreResponse,
  NearestFacility,
  Weights,
} from '@/types/api';

import './KernelScorePanel.css';

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
      className={`kernel-panel${isOpen ? ' kernel-panel--open' : ''}`}
      // @ts-expect-error — `inert` lands as a boolean attr but React typed it later.
      // design-audit F-20: keep focusable buttons behind a closed panel out of tab order.
      inert={!isOpen ? '' : undefined}
      aria-hidden={!isOpen}
      aria-label="커널 점수 패널"
      role="complementary"
    >
      <div className="kernel-panel__inner">
        <header className="kernel-panel__header">
          <div className="kernel-panel__title">
            <p className="kernel-panel__label mono-label">선택 지점</p>
            <p className="kernel-panel__coord tabular">{coordLabel}</p>
            {data?._meta?.dong_name && (
              <p className="kernel-panel__dong">{data._meta.dong_name}</p>
            )}
          </div>
          <button
            type="button"
            className="kernel-panel__close"
            aria-label="패널 닫기"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="kernel-panel__body">
          {isLoading && !data && (
            <div className="kernel-panel__status" role="status">
              점수 계산 중…
            </div>
          )}

          {isError && !data && (
            <div className="kernel-panel__status kernel-panel__status--error" role="alert">
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
    <section className="kernel-panel__section kernel-panel__score-section">
      <div className="kernel-panel__score-row">
        <Score
          value={Math.round(score)}
          unit="/ 100"
          size="lg"
          tone="neutral"
          ariaLabel={`종합 점수 ${score.toFixed(1)}점`}
        />
        {isFetching && (
          <span className="kernel-panel__updating mono-label">갱신 중</span>
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
    <section className="kernel-panel__section" aria-label="점수 구성">
      <h3 className="kernel-panel__section-title">점수 구성</h3>
      <div className="kernel-panel__bars">
        <BreakdownBar label="전월세" value={breakdown.rent} />
        <BreakdownBar label="생활시설" value={breakdown.amenity} />
        <BreakdownBar label="교통" value={breakdown.transit} />
      </div>
    </section>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const bucket = bucketOf(clamped);
  return (
    <div className="kernel-panel__bar">
      <div className="kernel-panel__bar-row">
        <span className="kernel-panel__bar-label">{label}</span>
        <span className="kernel-panel__bar-value tabular">{Math.round(clamped)}</span>
      </div>
      <div
        className="kernel-panel__bar-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-label={`${label} 점수`}
      >
        <span
          className={`kernel-panel__bar-fill kernel-panel__bar-fill--${bucket}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function bucketOf(score: number): 'q1' | 'q2' | 'q3' | 'q4' | 'q5' {
  if (score < 20) return 'q1';
  if (score < 40) return 'q2';
  if (score < 60) return 'q3';
  if (score < 80) return 'q4';
  return 'q5';
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
  // We keep the underlying weights as integer percent. Backend normalizes
  // anyway, so we don't enforce sum=100 on local panel changes — that's the
  // sidebar's contract. Each slider here is independent.
  return (
    <section className="kernel-panel__section" aria-label="가중치">
      <h3 className="kernel-panel__section-title">가중치</h3>
      <div className="kernel-panel__weight-list">
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
  return (
    <div className="kernel-panel__weight">
      <div className="kernel-panel__weight-header">
        <span className="kernel-panel__weight-label">{label}</span>
        <span className="kernel-panel__weight-value tabular">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="kernel-panel__weight-input"
        aria-label={`${label} 가중치`}
        style={{ ['--ui-slider-fill' as string]: `${value}%` }}
      />
    </div>
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
    <section className="kernel-panel__section" aria-label="통학">
      <h3 className="kernel-panel__section-title">통학 학교</h3>
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
        <p className="kernel-panel__commute">
          <span aria-hidden="true">🎓</span>
          <span className="kernel-panel__commute-text">
            <span className="kernel-panel__commute-school">{school}</span>
            <span className="kernel-panel__commute-sep"> 통학 </span>
            <span className="tabular kernel-panel__commute-min">{commuteMin}</span>
            <span className="kernel-panel__commute-unit">분</span>
          </span>
        </p>
      )}
      {school && commuteMin == null && (
        <p className="kernel-panel__commute kernel-panel__commute--missing mono-label">
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
    <section className="kernel-panel__section" aria-label="가까운 시설">
      <h3 className="kernel-panel__section-title">가까운 시설</h3>
      <ul className="kernel-panel__nearest">
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
    <li className="kernel-panel__nearest-row">
      <span className="kernel-panel__nearest-emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="kernel-panel__nearest-main">
        <span className="kernel-panel__nearest-name">{item.name}</span>
        {item.line && (
          <span className="kernel-panel__nearest-line"> ({item.line})</span>
        )}
      </span>
      <span className="kernel-panel__nearest-meta">
        <span className="kernel-panel__nearest-walk mono-label tabular">
          WALK {item.walk_min}MIN
        </span>
        <span className="kernel-panel__nearest-dist tabular">
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
    <section className="kernel-panel__section" aria-label="반경 1km 시설">
      <h3 className="kernel-panel__section-title">반경 1KM 시설</h3>
      <div className="kernel-panel__radius-grid">
        {RADIUS_GRID_ORDER.map((cat) => (
          <div key={cat} className="kernel-panel__radius-cell">
            <span className="kernel-panel__radius-label mono-label">
              {CATEGORY_LABEL_KO[cat] ?? cat}
            </span>
            <span className="kernel-panel__radius-value tabular">
              {(counts[cat] ?? 0).toLocaleString('ko-KR')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
