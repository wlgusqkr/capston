// AdongPanel — slide-in summary panel for the main map (SPEC 6.2).
//
// Layout:
//   - Fixed to the right edge, full viewport height, ~400px wide.
//   - Slides in/out via translateX. Stays in DOM when closed (slug === null)
//     so the transition runs both directions.
//   - Internal scroll for tall content.
//
// Sections (top → bottom, per SPEC 6.2):
//   1. Header (gu small, adong large, close button)
//   2. 종합 점수 카드 (Card variant="inset" + Score size="lg" + 한 줄 요약)
//   3. 핵심 지표 5개 (key/value 행)
//        - 평균 월세, 가까운 역, 편의시설, 자취생 비율, 안전 지수
//   4. 점수 구성 (가로 막대 3개: 교통/전월세/생활시설)
//   5. CTA 3개 (자세히 보기 primary full / 비교에 추가 + 찜하기 가로 2분할 secondary)
//
// Score breakdown source:
//   The backend's /summary response no longer carries score_rent/amenity/transit;
//   they live on /scores. The parent MainMap already calls useAdongScores, so
//   it passes `rawScores` (the matching AdongScore row) as a prop. This avoids
//   a duplicate query and matches SPEC 14.3 (client recomputation friendly).
//
// Keyboard:
//   ESC closes the panel (only when open and the user is not typing in an
//   input — the panel does not contain any inputs in this iteration).
import type { ReactNode } from 'react';

import { Badge, Button, Card, MetricBar, Score } from '@/components/ui';
import { useAdongSummary } from '@/hooks/useAdongs';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type {
  AmenityLevel,
  AdongSummary,
  SafetyLevel,
  Weights,
} from '@/types/api';

export interface AdongPanelProps {
  /** Selected adong slug; null means panel is closed. */
  slug: string | null;
  /** Current main-map weights — passed through to /summary. */
  weights: Weights;
  /** Raw per-axis scores (rent/amenity/transit) for the selected adong.
   *  Sourced from the parent's useAdongScores result so we don't refetch.
   *  Null while the parent's scores list hasn't loaded or slug not found.
   */
  rawScores: { rent: number; amenity: number; transit: number } | null;
  onClose: () => void;
  onOpenDetail: (slug: string) => void;
  onAddCompare: (slug: string) => void;
  onFavorite: (slug: string) => void;
  /** Phase 5: match 모드일 때 score 카드 위에 노출되는 KPI 카드 (MatchKpiCard).
   *  match 모드 외에는 null/undefined → 미노출. */
  matchKpi?: ReactNode;
}

/** Korean label + Badge variant for amenity_level. */
const AMENITY_LABELS: Record<
  AmenityLevel,
  { text: string; variant: 'success' | 'warning' | 'danger' }
> = {
  sufficient: { text: '충분', variant: 'success' },
  normal: { text: '보통', variant: 'warning' },
  lacking: { text: '부족', variant: 'danger' },
};

/** Korean label + Badge variant for safety_level. */
const SAFETY_LABELS: Record<
  SafetyLevel,
  { text: string; variant: 'success' | 'warning' | 'danger' }
> = {
  high: { text: '높음', variant: 'success' },
  mid: { text: '보통', variant: 'warning' },
  low: { text: '낮음', variant: 'danger' },
};

export default function AdongPanel({
  slug,
  weights,
  rawScores,
  onClose,
  onOpenDetail,
  onAddCompare,
  onFavorite,
  matchKpi,
}: AdongPanelProps) {
  const isOpen = slug != null;
  const { data, isLoading, isError, error } = useAdongSummary(slug, weights);

  // ESC closes the panel when open — shared useEscapeKey (post-A-7 dedup).
  useEscapeKey(onClose, isOpen);

  return (
    <aside
      className={`absolute top-0 right-0 h-full w-[400px] max-w-full bg-surface border-l border-border transition-transform duration-[300ms] ease-out z-[500] flex flex-col ${isOpen ? 'translate-x-0 pointer-events-auto shadow-floating' : 'translate-x-full pointer-events-none'}`}
      // @ts-expect-error — `inert` lands as a boolean attr but React typed it later.
      inert={!isOpen ? '' : undefined}
      aria-hidden={!isOpen}
      aria-label="동네 요약 패널"
      role="complementary"
    >
      <div className="flex flex-col h-full min-h-0">
        <PanelHeader summary={data ?? null} fallbackSlug={slug} onClose={onClose} />

        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5">
          {isLoading && (
            <div className="text-body-base text-text-muted tracking-normal py-4" role="status">
              요약 정보를 불러오는 중…
            </div>
          )}

          {isError && (
            <div className="text-body-base text-danger tracking-normal py-4 flex flex-col gap-1" role="alert">
              요약 정보를 불러오지 못했습니다.
              <span className="text-caption text-text-muted">
                {error instanceof Error ? error.message : '알 수 없는 오류'}
              </span>
            </div>
          )}

          {data && (
            <>
              {matchKpi}
              <ScoreCard summary={data} />
              <KeyMetrics summary={data} />
              <ScoreBreakdown rawScores={rawScores} />
            </>
          )}
        </div>

        {data && (
          <PanelFooter
            slug={data.slug}
            onOpenDetail={onOpenDetail}
            onAddCompare={onAddCompare}
            onFavorite={onFavorite}
          />
        )}
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

interface PanelHeaderProps {
  summary: AdongSummary | null;
  fallbackSlug: string | null;
  onClose: () => void;
}

function PanelHeader({ summary, fallbackSlug, onClose }: PanelHeaderProps) {
  const gu = summary?.gu ?? '';
  const name = summary?.name ?? fallbackSlug ?? '';
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-border shrink-0">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-caption leading-[1.4] text-text-muted tracking-normal">{gu}</span>
        <h2 className="text-feature-heading leading-[1.3] font-semibold text-text m-0 tracking-normal">{name}</h2>
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
  );
}

/* -------------------------------------------------------------------------- */
/* Section 1 — Score card                                                      */
/* -------------------------------------------------------------------------- */

function ScoreCard({ summary }: { summary: AdongSummary }) {
  return (
    <Card variant="inset" padding="lg" className="flex flex-col gap-3">
      <Score
        value={Math.round(summary.score)}
        unit="/ 100"
        size="lg"
        ariaLabel={`${summary.name} 종합 점수 ${summary.score.toFixed(1)}점`}
      />
      <p className="m-0 text-body-base leading-[1.6] text-text-muted tracking-normal">{summary.summary}</p>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 2 — Key metrics (5 rows)                                            */
/* -------------------------------------------------------------------------- */

function KeyMetrics({ summary }: { summary: AdongSummary }) {
  const amenity = AMENITY_LABELS[summary.amenity_level];
  const safety = SAFETY_LABELS[summary.safety_level];
  return (
    <section
      className="flex flex-col gap-3"
      aria-label="핵심 지표"
    >
      <h3 className="text-mono-label leading-[1.4] font-normal text-text-subtle m-0 tracking-[0.26px] font-[var(--font-family-mono)] uppercase">핵심 지표</h3>
      <dl className="m-0 flex flex-col border-t border-border">
        <MetricRow
          label="평균 월세"
          value={
            <span className="tabular">
              {summary.rent_avg}
              <span className="text-caption text-text-muted font-normal"> 만원</span>
            </span>
          }
        />
        <MetricRow
          label="가까운 역"
          value={
            <span className="inline-flex items-baseline flex-wrap justify-end gap-0">
              <span className="font-medium">{summary.nearest_station.name}</span>
              <span className="text-text-subtle"> · </span>
              <span className="text-text-muted text-caption">{summary.nearest_station.line}</span>
              <span className="text-text-subtle"> · </span>
              <span className="text-text-muted text-caption">
                도보 <span className="tabular">{summary.nearest_station.walking_min}</span>분
              </span>
            </span>
          }
        />
        <MetricRow
          label="편의시설"
          value={<Badge variant={amenity.variant}>{amenity.text}</Badge>}
        />
        <MetricRow
          label="자취생 비율"
          value={
            <span className="tabular">
              {summary.single_household_pct.toFixed(0)}
              <span className="text-caption text-text-muted font-normal">%</span>
            </span>
          }
        />
        <MetricRow
          label="안전 지수"
          value={<Badge variant={safety.variant}>{safety.text}</Badge>}
        />
      </dl>
    </section>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border min-h-[40px]">
      <dt className="text-caption leading-[1.4] text-text-muted tracking-normal shrink-0">{label}</dt>
      <dd className="m-0 text-body-base leading-[1.6] text-text tracking-normal text-right inline-flex items-center gap-2">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 3 — Score breakdown (3 horizontal bars)                             */
/* -------------------------------------------------------------------------- */

interface ScoreBreakdownProps {
  rawScores: AdongPanelProps['rawScores'];
}

function ScoreBreakdown({ rawScores }: ScoreBreakdownProps) {
  return (
    <section className="flex flex-col gap-3" aria-label="점수 구성">
      <h3 className="text-mono-label leading-[1.4] font-normal text-text-subtle m-0 tracking-[0.26px] font-[var(--font-family-mono)] uppercase">점수 구성</h3>
      {rawScores ? (
        <div className="flex flex-col gap-3">
          <MetricBar label="교통" value={rawScores.transit} tone="score" />
          <MetricBar label="전월세" value={rawScores.rent} tone="score" />
          <MetricBar label="생활시설" value={rawScores.amenity} tone="score" />
        </div>
      ) : (
        <p className="m-0 text-caption text-text-muted tracking-normal">점수 정보를 준비 중입니다.</p>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer — CTA buttons                                                        */
/* -------------------------------------------------------------------------- */

interface PanelFooterProps {
  slug: string;
  onOpenDetail: (slug: string) => void;
  onAddCompare: (slug: string) => void;
  onFavorite: (slug: string) => void;
}

function PanelFooter({
  slug,
  onOpenDetail,
  onAddCompare,
  onFavorite,
}: PanelFooterProps) {
  return (
    <footer className="flex flex-col gap-2 px-5 pt-4 pb-5 border-t border-border bg-surface shrink-0">
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => onOpenDetail(slug)}
      >
        자세히 보기
      </Button>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onAddCompare(slug)}
        >
          비교에 추가
        </Button>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onFavorite(slug)}
        >
          찜하기
        </Button>
      </div>
    </footer>
  );
}
