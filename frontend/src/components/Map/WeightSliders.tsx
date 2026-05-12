// WeightSliders -- three rebalancing sliders + 4 preset chips + CTA.

import { Button, Chip, Slider } from '@/components/ui';
import { rebalanceWeights } from '@/lib/weights';
import type { Weights } from '@/types/api';
import type { WeightKey } from '@/lib/weights';

export interface WeightSlidersProps {
  weights: Weights;
  onWeightsChange: (next: Weights) => void;
  onOpenPreference: () => void;
  showSum?: boolean;
  disabled?: boolean;
  disabledHint?: string;
}

const PRESETS: Array<{ key: string; label: string; weights: Weights }> = [
  { key: 'balanced', label: '균등', weights: { rent: 33, amenity: 33, transit: 34 } },
  { key: 'rent', label: '전월세', weights: { rent: 100, amenity: 0, transit: 0 } },
  { key: 'amenity', label: '시설', weights: { rent: 0, amenity: 100, transit: 0 } },
  { key: 'transit', label: '교통', weights: { rent: 0, amenity: 0, transit: 100 } },
];

function weightsEqual(a: Weights, b: Weights): boolean {
  return a.rent === b.rent && a.amenity === b.amenity && a.transit === b.transit;
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

  const handlePreset = (preset: Weights) => {
    if (disabled) return;
    onWeightsChange(preset);
  };

  return (
    <div
      className={`flex flex-col gap-3${disabled ? ' opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      title={disabled ? disabledHint : undefined}
      aria-disabled={disabled}
    >
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="가중치 프리셋"
      >
        {PRESETS.map((p) => {
          const active = weightsEqual(weights, p.weights);
          return (
            <Chip
              key={p.key}
              active={active}
              onClick={() => handlePreset(p.weights)}
              disabled={disabled}
            >
              {p.label}
            </Chip>
          );
        })}
      </div>

      {showSum && (
        <div className="flex justify-end">
          <span className="font-[family-name:var(--font-family-mono)] text-mono-label tracking-[0.26px] text-text-subtle uppercase tabular">
            합 {weights.rent + weights.amenity + weights.transit}
          </span>
        </div>
      )}
      <div className="flex flex-col gap-3">
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
