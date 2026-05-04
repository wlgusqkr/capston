// CompareChip — top-right floating chip showing compare-basket count.
//
// R-1 D-9 decision: clicking the chip navigates to /compare immediately
// (no inline dropdown). The chip is purely a count + entry point.
//
// Renders only when count >= 1. Memoized since props are basket count +
// stable callback — no need to re-render on every map state change.

import { memo } from 'react';

import './CompareChip.css';

export interface CompareChipProps {
  count: number;
  onClick: () => void;
}

function CompareChip({ count, onClick }: CompareChipProps) {
  if (count < 1) return null;

  return (
    <button
      type="button"
      className="compare-chip map-floating-panel map-floating-panel--snug"
      onClick={onClick}
      aria-label={`담은 동네 ${count}개, 비교 페이지로 이동`}
    >
      <span className="compare-chip__label">비교</span>
      <span className="compare-chip__count tabular">({count})</span>
      <span className="compare-chip__arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}

export default memo(CompareChip);
