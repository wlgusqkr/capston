// Compare — side-by-side comparison of up to 3 dongs (SPEC 6.4).
//
// URL contract (SPEC 8): /compare?dongs=A,B,C
//   - The frontend uses `dongs` in the URL to match the spec wording.
//   - The backend API expects `?slugs=...` — getCompare() handles that mapping.
//
// Honest Compare (FINDING-101 + FINDING-106, 2026-05-03):
//   The original 7-row table contained 4 placeholder fields (transit_min,
//   single_household_pct, safety_label, review_avg/review_count) where every
//   dong returned the same dummy value (10분 / 40.0% / 높음 / 4.7★). For a
//   capstone demo this destroys the comparison value AND lights the "best in
//   row" highlight on every cell. We dropped those rows and replaced them
//   with the real, score-driven breakdown that already exists on the backend
//   (`/api/dongs/scores` exposes `score_rent` / `score_amenity` /
//   `score_transit` per dong — genuine variation).
//
//   Final 4 rows:
//     1) 종합점수      — composite score (CompareItem.score, weighted)
//     2) 평균 월세      — CompareItem.rent_avg (만원, derived from score_rent)
//     3) 생활시설 점수  — DongScore.score_amenity (0~100)
//     4) 교통 점수      — DongScore.score_transit (0~100)
//
// Highlight rule (FINDING-106):
//   In each row, the best value(s) get a Pale Green background.
//   Direction:
//     높을수록 좋음: score, score_amenity, score_transit
//     낮을수록 좋음: rent_avg
//   Ties: when all displayed values agree within tolerance (±0.5 for scores,
//   ±0 for integer rent), NO cell is highlighted and the row label shows a
//   small "동률" badge instead. This stops the demo from lighting up every
//   single cell when all dongs land in the same bin.
//
// "최고 점수" Badge:
//   The single dong with the strictly maximum composite score (ties → no
//   badge anywhere — same fairness rule as cell highlights).

import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Badge, Button } from '@/components/ui';
import { useCompare, useDongScores } from '@/hooks/useDongs';
import { DEFAULT_WEIGHTS } from '@/types/api';
import type { CompareItem, DongScore } from '@/types/api';

import './Compare.css';

const MAX_SLUGS = 3;

/** Score equality tolerance — values within this band are considered tied
 *  and no highlight is awarded. Half a percentage point is below display
 *  precision (we render scores to 1 decimal) so a tie here is visually
 *  indistinguishable for the demo viewer. */
const SCORE_TIE_EPSILON = 0.5;

/** Parse comma-separated `dongs` query param into a clean slug list (≤3). */
function parseSlugs(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(',')) {
    const slug = piece.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= MAX_SLUGS) break;
  }
  return out;
}

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const slugs = useMemo(
    () => parseSlugs(searchParams.get('dongs')),
    [searchParams]
  );

  // SPEC 6.4 doesn't expose a weight slider on this page (compare uses the
  // map's current sense of "best"). Weights are 33/33/34 for now — see step
  // 7B handoff F1 / step 6B handoff for the WeightsContext follow-up.
  const weights = DEFAULT_WEIGHTS;

  const compareQ = useCompare(slugs, weights, slugs.length > 0);

  // Pull raw breakdown scores from the main /scores endpoint (already cached
  // by the map at 60s staleTime, so on-route this is usually a cache hit).
  // We need score_amenity and score_transit per dong — neither is included
  // in /api/compare. Rather than expand the backend (capstone scope), we
  // join client-side by slug.
  const scoresQ = useDongScores(weights);

  const isLoading = compareQ.isLoading || (slugs.length > 0 && scoresQ.isLoading);
  const isError = compareQ.isError || scoresQ.isError;
  const error = compareQ.error ?? scoresQ.error;

  // Build a slug → DongScore lookup. Stable as long as scoresQ.data is.
  const scoresBySlug = useMemo(() => {
    const map = new Map<string, DongScore>();
    if (scoresQ.data) {
      for (const row of scoresQ.data) map.set(row.slug, row);
    }
    return map;
  }, [scoresQ.data]);

  const handleRemove = (slug: string) => {
    const next = slugs.filter((s) => s !== slug);
    if (next.length === 0) {
      // Drop the param entirely when nothing remains.
      const params = new URLSearchParams(searchParams);
      params.delete('dongs');
      setSearchParams(params, { replace: true });
    } else {
      const params = new URLSearchParams(searchParams);
      params.set('dongs', next.join(','));
      setSearchParams(params, { replace: true });
    }
  };

  const handleAddMore = () => {
    window.alert(
      '메인 지도에서 동네를 클릭한 뒤 "비교에 추가"를 눌러주세요.'
    );
  };

  return (
    <div className="compare">
      <header className="compare__topbar">
        <div className="compare__topbar-inner">
          <Link to="/" className="compare__back" aria-label="지도로 돌아가기">
            <span aria-hidden="true">←</span>
            <span>지도로</span>
          </Link>
          <span className="compare__crumb-sep" aria-hidden="true">/</span>
          <h1 className="compare__crumb-current">동네 비교</h1>
        </div>
      </header>

      <main className="compare__main">
        {slugs.length === 0 && <EmptyState onBack={() => navigate('/')} />}

        {slugs.length > 0 && isLoading && (
          <div className="compare__status" role="status">
            비교 정보를 불러오는 중…
          </div>
        )}

        {slugs.length > 0 && isError && (
          <div className="compare__status compare__status--error" role="alert">
            비교 정보를 불러오지 못했습니다.
            <span className="compare__status-detail">
              {error instanceof Error ? error.message : '알 수 없는 오류'}
            </span>
            <div className="compare__status-actions">
              <Button variant="secondary" size="md" onClick={() => navigate('/')}>
                지도로 돌아가기
              </Button>
            </div>
          </div>
        )}

        {slugs.length > 0 && compareQ.data && compareQ.data.dongs.length > 0 && (
          <CompareTable
            dongs={compareQ.data.dongs}
            scoresBySlug={scoresBySlug}
            onRemove={handleRemove}
            onAddMore={handleAddMore}
          />
        )}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                 */
/* -------------------------------------------------------------------------- */

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="compare__empty">
      <h1 className="compare__empty-title">비교할 동네가 없어요</h1>
      <p className="compare__empty-text">
        메인 지도에서 동네를 클릭한 뒤 <strong>비교에 추가</strong> 버튼을
        누르면 이곳에 나란히 보여드릴게요.
      </p>
      <Button variant="primary" size="md" onClick={onBack}>
        메인 지도로 가기
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Compare table                                                               */
/* -------------------------------------------------------------------------- */

interface CompareTableProps {
  dongs: CompareItem[];
  scoresBySlug: Map<string, DongScore>;
  onRemove: (slug: string) => void;
  onAddMore: () => void;
}

/** Per-row best-cell decision. `bestIdx` is empty when the row is a tie
 *  (within tolerance) — the row label then shows the "동률" mini-badge. */
interface RowDecision {
  bestIdx: Set<number>;
  isTie: boolean;
}

function CompareTable({
  dongs,
  scoresBySlug,
  onRemove,
  onAddMore,
}: CompareTableProps) {
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  // Resolve breakdown values per dong, falling back to NaN when a dong is
  // missing from the /scores response (shouldn't happen — every dong in the
  // compare list comes from the same DB — but stay defensive for the demo).
  const breakdown = useMemo(() => {
    return dongs.map((d) => {
      const row = scoresBySlug.get(d.slug);
      return {
        score_amenity: row?.score_amenity ?? NaN,
        score_transit: row?.score_transit ?? NaN,
      };
    });
  }, [dongs, scoresBySlug]);

  // Composite score: use compare's `score` (already weighted by backend).
  const scoreVals = useMemo(() => dongs.map((d) => d.score), [dongs]);
  // 환산 월세(rent_converted_avg)를 primary 비교값으로. raw rent_avg는 derived dummy
  // (120 - score_rent) 라 신뢰 어렵고, score_rent 자체가 환산값 기반이라 환산이
  // 시스템적으로 일관됨. null(데이터 부족) 인 동은 highlight 제외.
  const rentVals = useMemo(
    () => dongs.map((d) => (d.rent_converted_avg ?? NaN)),
    [dongs]
  );
  const amenityVals = useMemo(
    () => breakdown.map((b) => b.score_amenity),
    [breakdown]
  );
  const transitVals = useMemo(
    () => breakdown.map((b) => b.score_transit),
    [breakdown]
  );

  const scoreDecision = useMemo(
    () => decideRow(scoreVals, 'max', SCORE_TIE_EPSILON),
    [scoreVals]
  );
  const rentDecision = useMemo(
    () => decideRow(rentVals, 'min', 0),
    [rentVals]
  );
  const amenityDecision = useMemo(
    () => decideRow(amenityVals, 'max', SCORE_TIE_EPSILON),
    [amenityVals]
  );
  const transitDecision = useMemo(
    () => decideRow(transitVals, 'max', SCORE_TIE_EPSILON),
    [transitVals]
  );

  // For "최고 점수" badge — strictly highest score, ties → no badge.
  // Reuses the same fairness rule as cell highlights.
  const topScoreIdx = useMemo(() => {
    if (dongs.length <= 1) return -1;
    if (scoreDecision.isTie) return -1;
    // bestIdx will have a single element when not tied AND when only one
    // dong matches the max; for multiple co-winners (above tolerance from
    // the rest but tied with each other), bestIdx still contains them all
    // — in that case we also withhold the single-winner badge.
    if (scoreDecision.bestIdx.size !== 1) return -1;
    return [...scoreDecision.bestIdx][0];
  }, [dongs.length, scoreDecision]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareNotice('비교 URL이 복사되었습니다.');
      } else {
        setShareNotice(`복사를 지원하지 않는 브라우저입니다: ${url}`);
      }
    } catch {
      setShareNotice('복사에 실패했어요. 주소창의 URL을 사용해주세요.');
    }
    window.setTimeout(() => setShareNotice(null), 3000);
  };

  return (
    <div className="compare__table-wrap">
      <table className="compare__table" role="table">
        <colgroup>
          <col className="compare__col-label" />
          {dongs.map((d) => (
            <col key={d.slug} className="compare__col-dong" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="compare__th-label">
              <span className="compare__th-label-text">지표</span>
            </th>
            {dongs.map((dong, idx) => (
              <th key={dong.slug} scope="col" className="compare__th-dong">
                <ColumnHeader
                  dong={dong}
                  isTopScore={idx === topScoreIdx && dongs.length > 1}
                  onRemove={() => onRemove(dong.slug)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Row label="종합점수" decision={scoreDecision} showTie={dongs.length > 1}>
            {dongs.map((d, i) => (
              <Cell key={d.slug} highlight={scoreDecision.bestIdx.has(i)}>
                <span className="tabular">{d.score.toFixed(1)}</span>
                <span className="compare__cell-unit"> / 100</span>
              </Cell>
            ))}
          </Row>
          {/* 평균 환산 월세 — 월세 + 보증금×0.005. 백엔드 rent_converted_avg
              사용. score_rent와 같은 가정이라 시스템 일관. 데이터 부족 동은
              "—" 표시 (highlight 제외). */}
          <Row label="평균 환산 월세" decision={rentDecision} showTie={dongs.length > 1}>
            {dongs.map((d, i) => {
              const v = d.rent_converted_avg;
              if (v == null) {
                return (
                  <Cell key={d.slug} highlight={false}>
                    <span className="compare__cell-empty">—</span>
                  </Cell>
                );
              }
              return (
                <Cell key={d.slug} highlight={rentDecision.bestIdx.has(i)}>
                  <span className="tabular">{v}</span>
                  <span className="compare__cell-unit"> 만원</span>
                </Cell>
              );
            })}
          </Row>
          <Row
            label="생활시설 점수"
            decision={amenityDecision}
            showTie={dongs.length > 1}
          >
            {breakdown.map((b, i) => (
              <Cell
                key={dongs[i].slug}
                highlight={amenityDecision.bestIdx.has(i)}
              >
                <ScoreValue value={b.score_amenity} />
              </Cell>
            ))}
          </Row>
          <Row
            label="교통 점수"
            decision={transitDecision}
            showTie={dongs.length > 1}
          >
            {breakdown.map((b, i) => (
              <Cell
                key={dongs[i].slug}
                highlight={transitDecision.bestIdx.has(i)}
              >
                <ScoreValue value={b.score_transit} />
              </Cell>
            ))}
          </Row>
        </tbody>
      </table>

      {/* Provenance footer — mirrors the sidebar pattern (mono key + value).
          Honest about derived rent + the three score sources. RENT row makes
          the 환산식을 explicit so reviewers can spot-check ("왜 26만원인 동이
          비싸 보여요?" — 환산값 = 월세 + 보증금×0.005 = 다른 숫자). */}
      <div className="compare__provenance" aria-label="데이터 출처">
        <p className="compare__prov-row">
          <span className="compare__prov-key">SCORES</span>
          <span className="compare__prov-val">
            자체 산출 — 소상공인진흥공단 · 서울교통빅데이터 · 국토교통부 (2026-04 기준)
          </span>
        </p>
        <p className="compare__prov-row">
          <span className="compare__prov-key">RENT</span>
          <span className="compare__prov-val">
            환산 월세 = 월세 + 보증금 × 0.005 (서울 평균 전환률 6%/년 가정).
            점수(score_rent)와 동일 공식. 국토부 실거래가 5개 구 적재 한정 — 그 외 동은 "—".
          </span>
        </p>
        <p className="compare__prov-note">
          통학시간 · 자취생 비율 · 안전 지수 · 자취생 평점은 데이터 적재 전까지
          비교에서 제외되었습니다.
        </p>
      </div>

      <footer className="compare__footer" aria-label="비교 액션">
        {dongs.length < MAX_SLUGS && (
          <Button variant="secondary" size="md" onClick={onAddMore}>
            + 동네 추가하기
          </Button>
        )}
        <Button variant="secondary" size="md" onClick={handleShare}>
          공유
        </Button>
        {shareNotice && (
          <span className="compare__share-notice" role="status">
            {shareNotice}
          </span>
        )}
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Column header (dong name + remove + 최고 점수 badge)                         */
/* -------------------------------------------------------------------------- */

interface ColumnHeaderProps {
  dong: CompareItem;
  isTopScore: boolean;
  onRemove: () => void;
}

function ColumnHeader({ dong, isTopScore, onRemove }: ColumnHeaderProps) {
  return (
    <div className="compare__col-header">
      <div className="compare__col-titles">
        <span className="compare__col-gu">{dong.gu}</span>
        <span className="compare__col-name">{dong.name}</span>
      </div>
      <div className="compare__col-meta">
        {isTopScore && (
          <Badge variant="success" size="sm">
            최고 점수
          </Badge>
        )}
        <button
          type="button"
          className="compare__remove"
          onClick={onRemove}
          aria-label={`${dong.name} 비교에서 제거`}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Row + Cell helpers                                                          */
/* -------------------------------------------------------------------------- */

function Row({
  label,
  decision,
  showTie,
  children,
}: {
  label: string;
  decision: RowDecision;
  /** Suppress the 동률 badge when there's only 1 dong (no comparison). */
  showTie: boolean;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <th scope="row" className="compare__row-label">
        <span className="compare__row-label-text">{label}</span>
        {showTie && decision.isTie && (
          <span className="compare__row-tie" aria-label="모든 동네 값이 같음">
            동률
          </span>
        )}
      </th>
      {children}
    </tr>
  );
}

function Cell({
  highlight,
  children,
}: {
  highlight: boolean;
  children: React.ReactNode;
}) {
  return (
    <td
      className={
        highlight ? 'compare__cell compare__cell--best' : 'compare__cell'
      }
    >
      {children}
    </td>
  );
}

/** Render a 0~100 score with a /100 suffix, or "—" for missing data. */
function ScoreValue({ value }: { value: number }) {
  if (!Number.isFinite(value)) {
    return <span className="compare__cell-empty">—</span>;
  }
  return (
    <>
      <span className="tabular">{value.toFixed(1)}</span>
      <span className="compare__cell-unit"> / 100</span>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Highlight computation                                                       */
/* -------------------------------------------------------------------------- */

/** For a single row of values, decide which cell(s) get the "best" highlight
 *  and whether the row should be flagged as a tie.
 *
 *  - direction: 'max' = higher is better; 'min' = lower is better.
 *  - epsilon:   values within this band of the best are considered equal.
 *               Use 0 for integer-only metrics (rent_avg).
 *
 *  Tie semantics (FINDING-106):
 *    - If ALL values are within `epsilon` of the best, the row is a tie:
 *      bestIdx is empty, isTie is true. No cell is highlighted.
 *    - Otherwise, every cell within `epsilon` of the best wins.
 *
 *  Pre-NaN values (missing data) are skipped from the "best" computation
 *  but never receive a highlight. If the entire row is NaN, isTie is false
 *  and bestIdx is empty (nothing to compare).
 */
function decideRow(
  values: number[],
  direction: 'max' | 'min',
  epsilon: number
): RowDecision {
  const result: RowDecision = { bestIdx: new Set(), isTie: false };
  if (values.length === 0) return result;
  // No comparison happening with a single dong.
  if (values.length === 1) return result;

  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return result;

  let best = finite[0];
  for (let i = 1; i < finite.length; i += 1) {
    if (direction === 'max' ? finite[i] > best : finite[i] < best) {
      best = finite[i];
    }
  }

  const isWithin = (v: number) =>
    Number.isFinite(v) && Math.abs(v - best) <= epsilon;

  // Tie detection: every finite value within epsilon of the best.
  // We require that ALL displayed (finite) values agree — partial NaN rows
  // can't be called a tie because we can't compare what we don't have.
  const allAgree =
    finite.length === values.filter((v) => Number.isFinite(v)).length &&
    finite.every(isWithin);
  if (allAgree && finite.length === values.length) {
    result.isTie = true;
    return result; // No highlights when tied.
  }

  values.forEach((v, idx) => {
    if (isWithin(v)) result.bestIdx.add(idx);
  });
  return result;
}
