// DongPanel — slide-in summary panel for the main map (SPEC 6.2).
//
// Layout:
//   - Fixed to the right edge, full viewport height, ~400px wide.
//   - Slides in/out via translateX. Stays in DOM when closed (slug === null)
//     so the transition runs both directions.
//   - Internal scroll for tall content.
//
// Sections (top → bottom, per SPEC 6.2):
//   1. Header (gu small, dong large, close button)
//   2. 종합 점수 카드 (Card variant="inset" + Score size="lg" + 한 줄 요약)
//   3. 핵심 지표 5개 (key/value 행)
//        - 평균 월세, 가까운 역, 편의시설, 자취생 비율, 안전 지수
//   4. 점수 구성 (가로 막대 3개: 교통/전월세/생활시설)
//   5. CTA 3개 (자세히 보기 primary full / 비교에 추가 + 찜하기 가로 2분할 secondary)
//
// Score breakdown source:
//   The backend's /summary response no longer carries score_rent/amenity/transit;
//   they live on /scores. The parent MainMap already calls useDongScores, so
//   it passes `rawScores` (the matching DongScore row) as a prop. This avoids
//   a duplicate query and matches SPEC 14.3 (client recomputation friendly).
//
// Keyboard:
//   ESC closes the panel (only when open and the user is not typing in an
//   input — the panel does not contain any inputs in this iteration).
import type { ReactNode } from 'react';

import { Badge, Button, Card, MetricBar, Score } from '@/components/ui';
import { useDongSummary } from '@/hooks/useDongs';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type {
  AmenityLevel,
  DongSummary,
  SafetyLevel,
  Weights,
} from '@/types/api';

import './DongPanel.css';

export interface DongPanelProps {
  /** Selected dong slug; null means panel is closed. */
  slug: string | null;
  /** Current main-map weights — passed through to /summary. */
  weights: Weights;
  /** Raw per-axis scores (rent/amenity/transit) for the selected dong.
   *  Sourced from the parent's useDongScores result so we don't refetch.
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

export default function DongPanel({
  slug,
  weights,
  rawScores,
  onClose,
  onOpenDetail,
  onAddCompare,
  onFavorite,
  matchKpi,
}: DongPanelProps) {
  const isOpen = slug != null;
  const { data, isLoading, isError, error } = useDongSummary(slug, weights);

  // ESC closes the panel when open — shared useEscapeKey (post-A-7 dedup).
  useEscapeKey(onClose, isOpen);

  return (
    <aside
      className={`dong-panel${isOpen ? ' dong-panel--open' : ''}`}
      // `inert` removes descendants from the tab order entirely while closed —
      // aria-hidden alone leaves <button> elements keyboard-focusable behind the
      // hidden panel. design-audit F-20.
      // @ts-expect-error — `inert` lands as a boolean attr but React typed it later.
      inert={!isOpen ? '' : undefined}
      aria-hidden={!isOpen}
      aria-label="동네 요약 패널"
      role="complementary"
    >
      <div className="dong-panel__inner">
        <PanelHeader summary={data ?? null} fallbackSlug={slug} onClose={onClose} />

        <div className="dong-panel__body">
          {isLoading && (
            <div className="dong-panel__status" role="status">
              요약 정보를 불러오는 중…
            </div>
          )}

          {isError && (
            <div className="dong-panel__status dong-panel__status--error" role="alert">
              요약 정보를 불러오지 못했습니다.
              <span className="dong-panel__status-detail">
                {error instanceof Error ? error.message : '알 수 없는 오류'}
              </span>
            </div>
          )}

          {data && (
            <>
              {/* Phase 5: match 모드 — match KPI 카드가 score 카드 위에 (eng-review #14). */}
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
  summary: DongSummary | null;
  fallbackSlug: string | null;
  onClose: () => void;
}

function PanelHeader({ summary, fallbackSlug, onClose }: PanelHeaderProps) {
  const gu = summary?.gu ?? '';
  const name = summary?.name ?? fallbackSlug ?? '';
  return (
    <header className="dong-panel__header">
      <div className="dong-panel__title">
        <span className="dong-panel__gu">{gu}</span>
        <h2 className="dong-panel__name">{name}</h2>
      </div>
      <button
        type="button"
        className="dong-panel__close"
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

function ScoreCard({ summary }: { summary: DongSummary }) {
  return (
    <Card variant="inset" padding="lg" className="dong-panel__score-card">
      <Score
        value={Math.round(summary.score)}
        unit="/ 100"
        size="lg"
        ariaLabel={`${summary.name} 종합 점수 ${summary.score.toFixed(1)}점`}
      />
      <p className="dong-panel__summary-text">{summary.summary}</p>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 2 — Key metrics (5 rows)                                            */
/* -------------------------------------------------------------------------- */

function KeyMetrics({ summary }: { summary: DongSummary }) {
  const amenity = AMENITY_LABELS[summary.amenity_level];
  const safety = SAFETY_LABELS[summary.safety_level];
  return (
    <section
      className="dong-panel__section"
      aria-label="핵심 지표"
    >
      <h3 className="dong-panel__section-title">핵심 지표</h3>
      <dl className="dong-panel__metrics">
        <MetricRow
          label="평균 월세"
          value={
            <span className="tabular">
              {summary.rent_avg}
              <span className="dong-panel__metric-unit"> 만원</span>
            </span>
          }
        />
        <MetricRow
          label="가까운 역"
          value={
            <span className="dong-panel__station">
              <span className="dong-panel__station-name">{summary.nearest_station.name}</span>
              <span className="dong-panel__metric-sep"> · </span>
              <span className="dong-panel__metric-sub">{summary.nearest_station.line}</span>
              <span className="dong-panel__metric-sep"> · </span>
              <span className="dong-panel__metric-sub">
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
              <span className="dong-panel__metric-unit">%</span>
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
    <div className="dong-panel__metric">
      <dt className="dong-panel__metric-label">{label}</dt>
      <dd className="dong-panel__metric-value">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 3 — Score breakdown (3 horizontal bars)                             */
/* -------------------------------------------------------------------------- */

interface ScoreBreakdownProps {
  rawScores: DongPanelProps['rawScores'];
}

function ScoreBreakdown({ rawScores }: ScoreBreakdownProps) {
  return (
    <section className="dong-panel__section" aria-label="점수 구성">
      <h3 className="dong-panel__section-title">점수 구성</h3>
      {rawScores ? (
        <div className="dong-panel__bars">
          <MetricBar label="교통" value={rawScores.transit} tone="score" />
          <MetricBar label="전월세" value={rawScores.rent} tone="score" />
          <MetricBar label="생활시설" value={rawScores.amenity} tone="score" />
        </div>
      ) : (
        <p className="dong-panel__bars-empty">점수 정보를 준비 중입니다.</p>
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
    <footer className="dong-panel__footer">
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => onOpenDetail(slug)}
      >
        자세히 보기
      </Button>
      <div className="dong-panel__footer-row">
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
