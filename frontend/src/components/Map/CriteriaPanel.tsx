// CriteriaPanel — bottom-left progressive-disclosure panel for R-1.
//
// Two states:
//   collapsed  → small pill `기준 (3) ▾` showing active filter count
//   expanded   → 280×360 floating panel with WeightSliders + FilterControls
//                + a (×) close button. ESC also collapses.
//
// Mutual exclusion: when ANY right-side panel opens (DongPanel etc.),
// the parent reducer flips criteriaOpen to false. CriteriaPanel itself
// only exposes a "toggle" callback — it doesn't know about other panels.

import FilterControls from './FilterControls';
import WeightSliders from './WeightSliders';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { Weights } from '@/types/api';

export interface CriteriaPanelProps {
  open: boolean;
  onToggle: () => void;
  weights: Weights;
  onWeightsChange: (next: Weights) => void;
  onOpenPreference: () => void;
  rentCapEnabled: boolean;
  onRentCapToggle: (next: boolean) => void;
  rentCap: number;
  onRentCapChange: (next: number) => void;
  nearUniversityOnly: boolean;
  onNearUniversityToggle: (next: boolean) => void;
}

/** Count of "active" filter conditions for the collapsed pill badge. */
function activeFilterCount(
  rentCapEnabled: boolean,
  nearUniversityOnly: boolean,
): number {
  return (rentCapEnabled ? 1 : 0) + (nearUniversityOnly ? 1 : 0);
}

export default function CriteriaPanel({
  open,
  onToggle,
  weights,
  onWeightsChange,
  onOpenPreference,
  rentCapEnabled,
  onRentCapToggle,
  rentCap,
  onRentCapChange,
  nearUniversityOnly,
  onNearUniversityToggle,
}: CriteriaPanelProps) {
  // ESC closes when expanded — shared useEscapeKey (post-A-7).
  useEscapeKey(onToggle, open);

  const filterCount = activeFilterCount(rentCapEnabled, nearUniversityOnly);

  if (!open) {
    return (
      <button
        type="button"
        className="bg-surface border border-border rounded-pill px-3 py-2 shadow-floating z-[500] pointer-events-auto inline-flex items-center gap-2 cursor-pointer font-inherit text-button font-medium tracking-normal text-text min-h-[40px] hover:text-secondary focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
        onClick={onToggle}
        aria-expanded={false}
        aria-controls="criteria-panel-body"
      >
        <span>기준</span>
        <span className="text-text-muted tabular">
          {filterCount > 0 ? `(${filterCount})` : ''}
        </span>
        <span className="text-text-muted text-[12px]" aria-hidden="true">
          ▾
        </span>
      </button>
    );
  }

  return (
    <aside
      className="bg-surface border border-border rounded-card px-5 py-4 shadow-floating z-[500] pointer-events-auto w-[280px] max-h-[calc(100vh-56px-24px-24px)] overflow-y-auto flex flex-col gap-3"
      aria-label="가중치와 필터"
      id="criteria-panel-body"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-text-subtle mono-label">CRITERIA</span>
        <button
          type="button"
          className="inline-flex items-center justify-center w-8 h-8 p-0 bg-transparent border-0 rounded-sm text-text-muted text-[20px] leading-none cursor-pointer transition-colors duration-[120ms] ease-out hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
          onClick={onToggle}
          aria-label="기준 패널 닫기"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div className="flex flex-col">
        <WeightSliders
          weights={weights}
          onWeightsChange={onWeightsChange}
          onOpenPreference={onOpenPreference}
          showSum={false}
        />
      </div>

      <div className="h-px bg-divider my-1" aria-hidden="true" />

      <div className="flex flex-col">
        <FilterControls
          rentCapEnabled={rentCapEnabled}
          onRentCapToggle={onRentCapToggle}
          rentCap={rentCap}
          onRentCapChange={onRentCapChange}
          nearUniversityOnly={nearUniversityOnly}
          onNearUniversityToggle={onNearUniversityToggle}
        />
      </div>
    </aside>
  );
}
