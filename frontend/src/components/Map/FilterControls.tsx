// FilterControls — university near-only checkbox + 환산 월세 상한 slider.
//
// Used inside Sidebar (Stage 2a) and inside CriteriaPanel R-1 (Stage 2b).

import { useId } from 'react';

import { Slider } from '@/components/ui';

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
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-caption text-text cursor-pointer" htmlFor={universityCheckId}>
        <input
          id={universityCheckId}
          type="checkbox"
          checked={nearUniversityOnly}
          onChange={(e) => onNearUniversityToggle(e.target.checked)}
          className="w-4 h-4 accent-secondary cursor-pointer"
        />
        <span>대학교 근처만</span>
      </label>

      <div className="flex flex-col gap-2 pl-1">
        <label className="flex items-center gap-2 text-caption text-text cursor-pointer" htmlFor={rentCapCheckId}>
          <input
            id={rentCapCheckId}
            type="checkbox"
            checked={rentCapEnabled}
            onChange={(e) => onRentCapToggle(e.target.checked)}
            className="w-4 h-4 accent-secondary cursor-pointer"
          />
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
        <p className="m-0 text-text-subtle text-mono-label mono-label">
          보증금 환산 포함 (0.005/월)
        </p>
      </div>
    </div>
  );
}
