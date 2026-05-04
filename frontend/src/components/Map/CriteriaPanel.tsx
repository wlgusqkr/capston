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

import './CriteriaPanel.css';

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
        className="criteria-panel__pill map-floating-panel map-floating-panel--snug"
        onClick={onToggle}
        aria-expanded={false}
        aria-controls="criteria-panel-body"
      >
        <span className="criteria-panel__pill-label">기준</span>
        <span className="criteria-panel__pill-count tabular">
          {filterCount > 0 ? `(${filterCount})` : ''}
        </span>
        <span className="criteria-panel__pill-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
    );
  }

  return (
    <aside
      className="criteria-panel map-floating-panel map-floating-panel--card"
      aria-label="가중치와 필터"
      id="criteria-panel-body"
    >
      <div className="criteria-panel__header">
        <span className="criteria-panel__title mono-label">CRITERIA</span>
        <button
          type="button"
          className="criteria-panel__close"
          onClick={onToggle}
          aria-label="기준 패널 닫기"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div className="criteria-panel__section">
        <WeightSliders
          weights={weights}
          onWeightsChange={onWeightsChange}
          onOpenPreference={onOpenPreference}
          showSum={false}
        />
      </div>

      <div className="criteria-panel__divider" aria-hidden="true" />

      <div className="criteria-panel__section">
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
