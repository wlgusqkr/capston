// WeightSliders — three rebalancing sliders (전월세 / 생활시설 / 교통) +
// "5번 비교로 자동 추천" CTA. Sum is always 100 (rebalanceWeights handles it).
//
// Used inside Sidebar (Stage 2a) and inside CriteriaPanel R-1 (Stage 2b).

import { Button, Slider } from '@/components/ui';
import { rebalanceWeights } from '@/lib/weights';
import type { Weights } from '@/types/api';
import type { WeightKey } from '@/lib/weights';

import './WeightSliders.css';

export interface WeightSlidersProps {
  weights: Weights;
  onWeightsChange: (next: Weights) => void;
  onOpenPreference: () => void;
  /** Show the "합 100" sum readout above the sliders. */
  showSum?: boolean;
  /** Disable all sliders + CTA. Phase 5 — match 모드일 때 회색 처리. */
  disabled?: boolean;
  /** Disabled 일 때 hover 툴팁 메시지. */
  disabledHint?: string;
}

export default function WeightSliders({
  weights,
  onWeightsChange,
  onOpenPreference,
  showSum = true,
  disabled = false,
  disabledHint,
}: WeightSlidersProps) {
  const handleWeight = (key: WeightKey) => (next: number) => {
    onWeightsChange(rebalanceWeights(weights, key, next));
  };

  return (
    <div
      className={`weight-sliders${disabled ? ' weight-sliders--disabled' : ''}`}
      title={disabled ? disabledHint : undefined}
      aria-disabled={disabled}
    >
      {showSum && (
        <div className="weight-sliders__sum-row">
          <span className="weight-sliders__sum tabular">
            합 {weights.rent + weights.amenity + weights.transit}
          </span>
        </div>
      )}
      <div className="weight-sliders__list">
        <Slider
          label="전월세"
          value={weights.rent}
          onChange={handleWeight('rent')}
          valueText={`${weights.rent}%`}
          disabled={disabled}
        />
        <Slider
          label="생활시설"
          value={weights.amenity}
          onChange={handleWeight('amenity')}
          valueText={`${weights.amenity}%`}
          disabled={disabled}
        />
        <Slider
          label="교통"
          value={weights.transit}
          onChange={handleWeight('transit')}
          valueText={`${weights.transit}%`}
          disabled={disabled}
        />
      </div>
      <Button
        variant="primary"
        fullWidth
        onClick={onOpenPreference}
        disabled={disabled}
      >
        5번 비교로 자동 추천 →
      </Button>
    </div>
  );
}
