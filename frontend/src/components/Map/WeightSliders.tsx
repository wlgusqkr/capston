// WeightSliders — three rebalancing sliders (전월세 / 생활시설 / 교통) +
// 4 preset chips ("균등 / 전월세 / 시설 / 교통") + "5번 비교로 자동 추천" CTA.
//
// Phase 5 cleanup: 프리셋 칩이 추가됨. LayerSwitcher 의 단일 축 (rent/amenity/
// transit) 보기를 WEIGHTS 100/0/0 형태로 흡수. 슬라이더와 칩은 같은 state 를
// 양방향 조작 — 슬라이더로 직접 조절도 가능, 칩 클릭으로 즉시 점프도 가능.
//
// 합은 항상 100 (rebalanceWeights). chip active 여부는 현재 weights 가 프리셋
// 와 정확히 일치할 때만 true.

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

/** 프리셋 — chip 어휘 그대로. 합 100 보장. */
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
      className={`weight-sliders${disabled ? ' weight-sliders--disabled' : ''}`}
      title={disabled ? disabledHint : undefined}
      aria-disabled={disabled}
    >
      {/* 프리셋 칩 — DongExplore 의 .explore__chip 토큰 재사용 (Soft Stone active fill). */}
      <div
        className="weight-sliders__presets"
        role="group"
        aria-label="가중치 프리셋"
      >
        {PRESETS.map((p) => {
          const active = weightsEqual(weights, p.weights);
          return (
            <button
              key={p.key}
              type="button"
              className={`explore__chip${active ? ' explore__chip--active' : ''}`}
              onClick={() => handlePreset(p.weights)}
              aria-pressed={active}
              disabled={disabled}
            >
              {p.label}
            </button>
          );
        })}
      </div>

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
