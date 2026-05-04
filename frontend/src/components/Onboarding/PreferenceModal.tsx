// PreferenceModal — 5번 비교로 가중치 자동 학습 (SPEC 6.5).
//
// Flow:
//   1. usePreferencePairs(5) loads 5 deterministic pairs from the backend.
//   2. User picks "this one" on each pair (or skips).
//      - Picking left/right pushes a {won, lost} entry into `comparisons`.
//      - "둘 다 별로예요" advances without recording.
//   3. After the 5th decision we POST /api/preference/submit and show the
//      result screen with the estimated weights.
//   4. "메인 지도에서 확인하기" calls onComplete(weights) and closes.
//
// Important guarantees:
//   - submit is fired exactly once when comparisons array is finalized after
//     the last pair (not before).
//   - If every pair was skipped, comparisons is empty — backend returns 400,
//     so we show the error inline rather than calling submit. (Fallback: if
//     ALL skipped, we keep equal weights 33/33/34 client-side.)
import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, Modal } from '@/components/ui';
import { usePreferencePairs, useSubmitPreference } from '@/hooks/usePreference';
import type {
  PairCard,
  PreferenceWeightsResponse,
  SubmitComparison,
} from '@/types/api';

import './PreferenceModal.css';

const TOTAL_PAIRS = 5;

/** Weights handed back to MainMap. Snake-cased on wire, camelCased here for
 *  consistency with the existing `Weights` shape on the client.
 */
export interface LearnedWeights {
  rent: number;
  amenity: number;
  transit: number;
}

export interface PreferenceModalProps {
  open: boolean;
  onClose: () => void;
  /** Called once after the user clicks "메인 지도에서 확인하기" with the
   *  learned weights. The modal does NOT close itself; the parent should
   *  call onClose() if it wants the modal dismissed too.
   */
  onComplete: (weights: LearnedWeights) => void;
}

/* ------------------------------------------------------------------ */
/* Pair card — one of two options the user is choosing between.        */
/* ------------------------------------------------------------------ */

function amenityVariant(label: PairCard['amenity_label']): 'success' | 'warning' | 'danger' {
  if (label === '충분') return 'success';
  if (label === '보통') return 'warning';
  return 'danger';
}

interface ComparisonCardProps {
  card: PairCard;
  side: 'left' | 'right';
  onPick: () => void;
}

function ComparisonCard({ card, side, onPick }: ComparisonCardProps) {
  return (
    <button
      type="button"
      className="pref-modal__card"
      onClick={onPick}
      aria-label={`${card.gu} ${card.name} 선택`}
      data-side={side}
    >
      <div className="pref-modal__card-head">
        <span className="pref-modal__card-gu">{card.gu}</span>
        <span className="pref-modal__card-name">{card.name}</span>
      </div>

      <dl className="pref-modal__metrics">
        <div className="pref-modal__metric">
          <dt>
            평균 환산 월세
            <span className="pref-modal__metric-hint mono-label">보증금 환산</span>
          </dt>
          <dd className="tabular">
            {card.rent_converted != null
              ? `${card.rent_converted}만원`
              : `${card.rent_avg}만원`}
          </dd>
        </div>
        <div className="pref-modal__metric">
          <dt>통학 시간</dt>
          <dd className="tabular">도보 {card.transit_min}분</dd>
        </div>
        <div className="pref-modal__metric">
          <dt>편의시설</dt>
          <dd>
            <Badge variant={amenityVariant(card.amenity_label)}>
              {card.amenity_label}
            </Badge>
          </dd>
        </div>
      </dl>

      <span
        className="pref-modal__card-cta"
        // Visually styled like a primary button but the whole card is the
        // actual <button>; this is a label, not a nested button.
        aria-hidden="true"
      >
        이게 더 좋아요
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Weights bar (result screen)                                         */
/* ------------------------------------------------------------------ */

interface WeightRowProps {
  label: string;
  value: number; // 0~100 integer
  tone: 'rent' | 'amenity' | 'transit';
}

function WeightRow({ label, value, tone }: WeightRowProps) {
  return (
    <div className="pref-modal__weight-row">
      <span className="pref-modal__weight-label">{label}</span>
      <div
        className="pref-modal__weight-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={`${label} 가중치 ${value}%`}
      >
        <span
          className={`pref-modal__weight-fill pref-modal__weight-fill--${tone}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="pref-modal__weight-value tabular">{value}%</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Result screen                                                       */
/* ------------------------------------------------------------------ */

interface ResultScreenProps {
  weights: PreferenceWeightsResponse;
  onConfirm: () => void;
}

/** Build the human-readable summary line in priority order.
 *  Example output: "통학 50%, 주거비 30%, 생활시설 20%를 중요시하시네요"
 */
function buildSummaryLine(weights: PreferenceWeightsResponse): string {
  const items: Array<{ key: 'rent' | 'amenity' | 'transit'; label: string; value: number }> = [
    { key: 'transit', label: '통학', value: weights.w_transit },
    { key: 'rent', label: '주거비', value: weights.w_rent },
    { key: 'amenity', label: '생활시설', value: weights.w_amenity },
  ];
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const text = sorted.map((s) => `${s.label} ${s.value}%`).join(', ');
  return `${text}를 중요시하시네요`;
}

function ResultScreen({ weights, onConfirm }: ResultScreenProps) {
  const summary = buildSummaryLine(weights);
  return (
    <div className="pref-modal__result">
      <p className="pref-modal__result-eyebrow">학습 완료</p>
      <h3 className="pref-modal__result-title">{summary}</h3>
      <p className="pref-modal__result-sub">
        메인 지도에서 가중치가 자동으로 적용됩니다.
      </p>

      <div className="pref-modal__weights">
        <WeightRow label="통학" value={weights.w_transit} tone="transit" />
        <WeightRow label="주거비" value={weights.w_rent} tone="rent" />
        <WeightRow label="생활시설" value={weights.w_amenity} tone="amenity" />
      </div>

      <Button variant="primary" size="lg" fullWidth onClick={onConfirm}>
        메인 지도에서 확인하기
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PreferenceModal                                                     */
/* ------------------------------------------------------------------ */

export default function PreferenceModal({
  open,
  onClose,
  onComplete,
}: PreferenceModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [comparisons, setComparisons] = useState<SubmitComparison[]>([]);
  const [resultWeights, setResultWeights] = useState<PreferenceWeightsResponse | null>(
    null
  );

  const pairsQuery = usePreferencePairs(TOTAL_PAIRS, open);
  const submitMutation = useSubmitPreference();

  /* Reset all internal state whenever the modal closes. We do this in an
   * effect rather than on the close click so external onClose paths
   * (ESC, backdrop) reset too.
   */
  useEffect(() => {
    if (open) return;
    setCurrentIdx(0);
    setComparisons([]);
    setResultWeights(null);
    submitMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pairs = pairsQuery.data?.pairs ?? [];
  const currentPair = pairs[currentIdx];
  const totalSteps = TOTAL_PAIRS;
  const stepNumber = Math.min(currentIdx + 1, totalSteps);
  const progressPct = (currentIdx / totalSteps) * 100;

  /* Submit when we've collected all 5 decisions (won or skipped). We track
   * progress via currentIdx hitting TOTAL_PAIRS, then fire submit if we
   * have at least one recorded comparison. If everything was skipped we
   * fall back to equal weights without hitting the network.
   */
  const finished = currentIdx >= totalSteps;

  useEffect(() => {
    if (!open || !finished || resultWeights) return;
    if (submitMutation.isPending) return;
    if (submitMutation.isError) return; // user must retry / close

    if (comparisons.length === 0) {
      // All skipped → keep defaults. No backend call.
      setResultWeights({ w_rent: 33, w_amenity: 33, w_transit: 34 });
      return;
    }

    submitMutation.mutate(comparisons, {
      onSuccess: (data) => setResultWeights(data),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, finished, comparisons, resultWeights]);

  /* ---------- handlers ---------- */

  const handlePick = (winnerSide: 'left' | 'right') => {
    if (!currentPair) return;
    const won =
      winnerSide === 'left' ? currentPair.left.slug : currentPair.right.slug;
    const lost =
      winnerSide === 'left' ? currentPair.right.slug : currentPair.left.slug;
    setComparisons((prev) => [...prev, { won, lost }]);
    setCurrentIdx((idx) => idx + 1);
  };

  const handleSkipPair = () => {
    setCurrentIdx((idx) => idx + 1);
  };

  const handleSkipAll = () => {
    // "건너뛰기" — bail out entirely. Equal weights, no submit.
    onComplete({ rent: 33, amenity: 33, transit: 34 });
  };

  const handleConfirmResult = () => {
    if (!resultWeights) return;
    onComplete({
      rent: resultWeights.w_rent,
      amenity: resultWeights.w_amenity,
      transit: resultWeights.w_transit,
    });
  };

  /* ---------- derived UI states ---------- */

  // Show the result screen as soon as we have weights (either from submit
  // success or from the all-skipped fallback).
  const showingResult = resultWeights !== null;

  const showingSubmitSpinner = finished && !showingResult && submitMutation.isPending;
  const showingSubmitError = finished && !showingResult && submitMutation.isError;
  const showingPair = !finished && !showingResult && currentPair !== undefined;
  const showingPairsError = !pairsQuery.isLoading && pairsQuery.isError && !showingResult;
  const showingPairsLoading =
    pairsQuery.isLoading && !showingResult && !finished;

  /* ---------- render ---------- */

  // Memoize aria-label so screen readers announce a single short phrase.
  const ariaLabel = useMemo(
    () => (showingResult ? '선호 학습 완료' : '선호 학습 — 동네 비교'),
    [showingResult]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={ariaLabel}
      // When the comparison view is shown, the visible <h2> "어디가 더 끌리시나요?"
      // is the real heading — let the screen reader announce it instead of a
      // synthetic label. design-audit F-16.
      ariaLabelledBy={showingPair ? 'pref-modal-question' : undefined}
      maxWidth={600}
      hideCloseButton
    >
      <div className="pref-modal">
        {/* Top bar — progress text + skip-all (only while comparing). */}
        {!showingResult && (
          <div className="pref-modal__top">
            <span className="pref-modal__progress-text tabular">
              {stepNumber} / {totalSteps}
            </span>
            <button
              type="button"
              className="pref-modal__skip-all"
              onClick={handleSkipAll}
            >
              건너뛰기
            </button>
          </div>
        )}

        {/* Progress bar */}
        {!showingResult && (
          <div
            className="pref-modal__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalSteps}
            aria-valuenow={currentIdx}
            aria-label="진행 상황"
          >
            <span
              className="pref-modal__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Title + subtitle (only while comparing). */}
        {showingPair && (
          <div className="pref-modal__heading">
            <h2 id="pref-modal-question" className="pref-modal__question">
              어디가 더 끌리시나요?
            </h2>
            <p className="pref-modal__sub">실제 데이터 기반 비교 · 정답은 없어요</p>
          </div>
        )}

        {/* Loading pairs */}
        {showingPairsLoading && (
          <div className="pref-modal__status" role="status" aria-live="polite">
            비교 동네를 불러오는 중…
          </div>
        )}

        {/* Pairs query error */}
        {showingPairsError && (
          <div className="pref-modal__status pref-modal__status--error" role="alert">
            비교 동네를 불러오지 못했습니다.
            <Button
              variant="secondary"
              size="sm"
              onClick={() => pairsQuery.refetch()}
            >
              다시 시도
            </Button>
          </div>
        )}

        {/* Active pair */}
        {showingPair && (
          <>
            <div className="pref-modal__pair">
              <ComparisonCard
                card={currentPair.left}
                side="left"
                onPick={() => handlePick('left')}
              />
              <ComparisonCard
                card={currentPair.right}
                side="right"
                onPick={() => handlePick('right')}
              />
            </div>

            <div className="pref-modal__bottom">
              <button
                type="button"
                className="pref-modal__skip-pair"
                onClick={handleSkipPair}
              >
                둘 다 별로예요 · 다음 비교
              </button>
            </div>
          </>
        )}

        {/* Submitting */}
        {showingSubmitSpinner && (
          <div className="pref-modal__status" role="status" aria-live="polite">
            결과를 분석 중…
          </div>
        )}

        {/* Submit error — give user a way to retry without losing answers. */}
        {showingSubmitError && (
          <div className="pref-modal__status pref-modal__status--error" role="alert">
            가중치 추정에 실패했습니다.
            <span className="pref-modal__status-detail">
              {submitMutation.error instanceof Error
                ? submitMutation.error.message
                : '알 수 없는 오류'}
            </span>
            <div className="pref-modal__status-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  submitMutation.reset();
                  submitMutation.mutate(comparisons, {
                    onSuccess: (data) => setResultWeights(data),
                  });
                }}
              >
                다시 시도
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                닫기
              </Button>
            </div>
          </div>
        )}

        {/* Result */}
        {showingResult && resultWeights && (
          <ResultScreen weights={resultWeights} onConfirm={handleConfirmResult} />
        )}
      </div>
    </Modal>
  );
}
