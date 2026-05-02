// Compare — side-by-side comparison of up to 3 dongs (SPEC 6.4).
//
// URL contract (SPEC 8): /compare?dongs=A,B,C
//   - The frontend uses `dongs` in the URL to match the spec wording.
//   - The backend API expects `?slugs=...` — getCompare() handles that mapping.
//
// Layout:
//   - Topbar: ← 지도로 + breadcrumb
//   - Main:
//       Empty state when no slugs.
//       Table when 1~3 slugs:
//         left column = metric labels
//         other columns = dongs (max 3)
//         column header has dong name + 제거(×) + (1위 한정) "최고 점수" Badge
//   - Footer: "+ 동네 추가하기" (안내), "공유" (URL clipboard)
//
// Highlight rule (SPEC 6.4):
//   In each row, the best value(s) get font-weight 500 + color: --color-primary.
//   Direction differs by metric:
//     높을수록 좋음: score, single_household_pct, review_avg_rating, review_count
//     낮을수록 좋음: rent_avg, transit_min
//     amenity_label: 충분 > 보통 > 부족
//     safety_label:   높음 > 보통 > 낮음
//   Ties: every value tied with the max gets highlighted.
//
// "최고 점수" Badge:
//   The single dong with the strictly maximum score (ties → first column).

import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Badge, Button } from '@/components/ui';
import { useCompare } from '@/hooks/useDongs';
import { DEFAULT_WEIGHTS } from '@/types/api';
import type {
  CompareAmenityLabel,
  CompareItem,
  CompareSafetyLabel,
} from '@/types/api';

import './Compare.css';

const MAX_SLUGS = 3;

const AMENITY_RANK: Record<CompareAmenityLabel, number> = {
  충분: 3,
  보통: 2,
  부족: 1,
};

const SAFETY_RANK: Record<CompareSafetyLabel, number> = {
  높음: 3,
  보통: 2,
  낮음: 1,
};

const AMENITY_VARIANT: Record<CompareAmenityLabel, 'success' | 'warning' | 'danger'> = {
  충분: 'success',
  보통: 'warning',
  부족: 'danger',
};

const SAFETY_VARIANT: Record<CompareSafetyLabel, 'success' | 'warning' | 'danger'> = {
  높음: 'success',
  보통: 'warning',
  낮음: 'danger',
};

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
  const { data, isLoading, isError, error } = useCompare(
    slugs,
    weights,
    slugs.length > 0
  );

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
          <span className="compare__crumb-current">동네 비교</span>
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

        {slugs.length > 0 && data && data.dongs.length > 0 && (
          <CompareTable
            dongs={data.dongs}
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
  onRemove: (slug: string) => void;
  onAddMore: () => void;
}

function CompareTable({ dongs, onRemove, onAddMore }: CompareTableProps) {
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  // For "최고 점수" badge — column with the strictly highest score.
  const topScoreIdx = useMemo(() => {
    if (dongs.length === 0) return -1;
    let bestIdx = 0;
    for (let i = 1; i < dongs.length; i += 1) {
      if (dongs[i].score > dongs[bestIdx].score) bestIdx = i;
    }
    return bestIdx;
  }, [dongs]);

  // Per-row best index sets — used for highlight styling.
  const bestSets = useMemo(() => computeBestSets(dongs), [dongs]);

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
          <Row label="종합점수">
            {dongs.map((d, i) => (
              <Cell key={d.slug} highlight={bestSets.score.has(i)}>
                <span className="tabular">{d.score.toFixed(1)}</span>
                <span className="compare__cell-unit"> / 100</span>
              </Cell>
            ))}
          </Row>
          <Row label="평균 월세">
            {dongs.map((d, i) => (
              <Cell key={d.slug} highlight={bestSets.rent.has(i)}>
                <span className="tabular">{d.rent_avg}</span>
                <span className="compare__cell-unit"> 만원</span>
              </Cell>
            ))}
          </Row>
          <Row label="통학 시간">
            {dongs.map((d, i) => (
              <Cell key={d.slug} highlight={bestSets.transit.has(i)}>
                <span className="tabular">{d.transit_min}</span>
                <span className="compare__cell-unit"> 분</span>
              </Cell>
            ))}
          </Row>
          <Row label="편의시설">
            {dongs.map((d, i) => (
              <Cell key={d.slug} highlight={bestSets.amenity.has(i)}>
                <Badge variant={AMENITY_VARIANT[d.amenity_label]}>
                  {d.amenity_label}
                </Badge>
              </Cell>
            ))}
          </Row>
          <Row label="자취생 비율">
            {dongs.map((d, i) => (
              <Cell key={d.slug} highlight={bestSets.singleHousehold.has(i)}>
                <span className="tabular">
                  {d.single_household_pct.toFixed(1)}
                </span>
                <span className="compare__cell-unit"> %</span>
              </Cell>
            ))}
          </Row>
          <Row label="안전 지수">
            {dongs.map((d, i) => (
              <Cell key={d.slug} highlight={bestSets.safety.has(i)}>
                <Badge variant={SAFETY_VARIANT[d.safety_label]}>
                  {d.safety_label}
                </Badge>
              </Cell>
            ))}
          </Row>
          <Row label="자취생 평점">
            {dongs.map((d, i) => (
              <Cell
                key={d.slug}
                highlight={
                  bestSets.reviewRating.has(i) || bestSets.reviewCount.has(i)
                }
              >
                <span className="compare__rating">
                  <span aria-hidden="true">★</span>
                  <span className="tabular">{d.review_avg_rating.toFixed(1)}</span>
                </span>
                <span className="compare__cell-unit">
                  {' '}
                  · 리뷰 <span className="tabular">{d.review_count}</span>개
                </span>
              </Cell>
            ))}
          </Row>
        </tbody>
      </table>

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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <th scope="row" className="compare__row-label">
        {label}
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

/* -------------------------------------------------------------------------- */
/* Highlight computation                                                       */
/* -------------------------------------------------------------------------- */

interface BestSets {
  score: Set<number>;
  rent: Set<number>;
  transit: Set<number>;
  amenity: Set<number>;
  singleHousehold: Set<number>;
  safety: Set<number>;
  reviewRating: Set<number>;
  reviewCount: Set<number>;
}

/** For each metric, find the indices of the best values (allowing ties).
 *  Direction per SPEC 6.4 / step 8A handoff.
 */
function computeBestSets(dongs: CompareItem[]): BestSets {
  const result: BestSets = {
    score: new Set(),
    rent: new Set(),
    transit: new Set(),
    amenity: new Set(),
    singleHousehold: new Set(),
    safety: new Set(),
    reviewRating: new Set(),
    reviewCount: new Set(),
  };
  if (dongs.length === 0) return result;

  // Single dong: nothing to highlight (no comparison happening).
  if (dongs.length === 1) return result;

  pushBestIndices(result.score, dongs.map((d) => d.score), 'max');
  pushBestIndices(result.rent, dongs.map((d) => d.rent_avg), 'min');
  pushBestIndices(result.transit, dongs.map((d) => d.transit_min), 'min');
  pushBestIndices(
    result.amenity,
    dongs.map((d) => AMENITY_RANK[d.amenity_label]),
    'max'
  );
  pushBestIndices(
    result.singleHousehold,
    dongs.map((d) => d.single_household_pct),
    'max'
  );
  pushBestIndices(
    result.safety,
    dongs.map((d) => SAFETY_RANK[d.safety_label]),
    'max'
  );
  pushBestIndices(
    result.reviewRating,
    dongs.map((d) => d.review_avg_rating),
    'max'
  );
  pushBestIndices(
    result.reviewCount,
    dongs.map((d) => d.review_count),
    'max'
  );

  return result;
}

function pushBestIndices(
  out: Set<number>,
  values: number[],
  direction: 'max' | 'min'
) {
  if (values.length === 0) return;
  let best = values[0];
  for (let i = 1; i < values.length; i += 1) {
    if (direction === 'max' ? values[i] > best : values[i] < best) {
      best = values[i];
    }
  }
  // Don't highlight when all values are equal (no winner).
  const allEqual = values.every((v) => v === best);
  if (allEqual) return;
  values.forEach((v, idx) => {
    if (v === best) out.add(idx);
  });
}
