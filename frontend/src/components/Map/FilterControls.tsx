// FilterControls — university near-only checkbox + 환산 월세 상한 slider.
//
// Used inside Sidebar (Stage 2a) and inside CriteriaPanel R-1 (Stage 2b).

import { useId } from 'react';

import { Slider } from '@/components/ui';

import './FilterControls.css';

export interface FilterControlsProps {
  rentCapEnabled: boolean;
  onRentCapToggle: (next: boolean) => void;
  rentCap: number;
  onRentCapChange: (next: number) => void;
  nearUniversityOnly: boolean;
  onNearUniversityToggle: (next: boolean) => void;
}

export default function FilterControls({
  rentCapEnabled,
  onRentCapToggle,
  rentCap,
  onRentCapChange,
  nearUniversityOnly,
  onNearUniversityToggle,
}: FilterControlsProps) {
  const universityCheckId = useId();
  const rentCapCheckId = useId();

  return (
    <div className="filter-controls">
      <label className="filter-controls__check" htmlFor={universityCheckId}>
        <input
          id={universityCheckId}
          type="checkbox"
          checked={nearUniversityOnly}
          onChange={(e) => onNearUniversityToggle(e.target.checked)}
        />
        <span>대학교 근처만</span>
      </label>

      <div className="filter-controls__block">
        <label className="filter-controls__check" htmlFor={rentCapCheckId}>
          <input
            id={rentCapCheckId}
            type="checkbox"
            checked={rentCapEnabled}
            onChange={(e) => onRentCapToggle(e.target.checked)}
          />
          {/* "환산 월세" — 보증금을 0.005/월로 환산해 합산한 값.
              전월세 score 자체가 환산값 기반이므로 라벨만 정직하게 표기. */}
          <span>환산 월세 상한</span>
        </label>
        <Slider
          min={20}
          max={150}
          step={5}
          value={rentCap}
          onChange={onRentCapChange}
          valueText={`${rentCap}만원 이하`}
          disabled={!rentCapEnabled}
          hideHeader={false}
          label={null}
        />
        <p className="filter-controls__hint mono-label">
          보증금 환산 포함 (0.005/월)
        </p>
      </div>
    </div>
  );
}
