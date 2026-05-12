// CompareChip — top-right floating chip showing compare-basket count.
//
// R-1 D-9 decision: clicking the chip navigates to /compare immediately
// (no inline dropdown). The chip is purely a count + entry point.
//
// Renders only when count >= 1. Memoized since props are basket count +
// stable callback — no need to re-render on every map state change.

import { memo } from 'react';

export interface CompareChipProps {
  count: number;
  onClick: () => void;
}

function CompareChip({ count, onClick }: CompareChipProps) {
  if (count < 1) return null;

  return (
    <button
      type="button"
      className="bg-surface border border-border rounded-pill px-3 py-2 shadow-floating z-[500] pointer-events-auto inline-flex items-center gap-2 cursor-pointer font-inherit text-button font-medium tracking-normal text-surface bg-secondary border-secondary min-h-[40px] [animation:compare-chip-in_200ms_ease-out] hover:bg-secondary hover:border-secondary focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
      onClick={onClick}
      aria-label={`담은 동네 ${count}개, 비교 페이지로 이동`}
    >
      <span>비교</span>
      <span className="opacity-85 tabular">({count})</span>
      <span className="text-[14px]" aria-hidden="true">
        →
      </span>
    </button>
  );
}

export default memo(CompareChip);
