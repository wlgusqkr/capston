// TransactionFilters — floating filter bar for the transaction pin layer.
//
// Two controls:
//   1. deal_type select — All / 아파트 / 오피스텔 / 연립다세대 / 단독다가구
//   2. period quick select — 1개월 / 3개월 / 6개월(default) / 1년
//
// Layout: a small white floating panel near the top of the map. Floating-on-
// map exception per DESIGN_SYSTEM.md "Elevation & Depth".
import { useMemo } from 'react';

import { Select } from '@/components/ui';
import type {
  TransactionDealTypeFilter,
  TransactionFilters as Filters,
} from '@/types/api';

import './TransactionFilters.css';

export type PeriodKey = '1m' | '3m' | '6m' | '12m';

const PERIOD_LABEL: Record<PeriodKey, string> = {
  '1m': '1개월',
  '3m': '3개월',
  '6m': '6개월',
  '12m': '1년',
};

const PERIOD_DAYS: Record<PeriodKey, number> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '12m': 365,
};

const DEAL_TYPE_OPTIONS: Array<{ value: TransactionDealTypeFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'apt', label: '아파트' },
  { value: 'officetel', label: '오피스텔' },
  { value: 'villa', label: '연립다세대' },
  { value: 'dagagu', label: '다가구' },
  { value: 'danok', label: '단독' },
];

export interface TransactionFiltersProps {
  dealType: TransactionDealTypeFilter;
  period: PeriodKey;
  onDealTypeChange: (next: TransactionDealTypeFilter) => void;
  onPeriodChange: (next: PeriodKey) => void;
}

/** Convert a PeriodKey to a `from` date (today minus N days, ISO YYYY-MM-DD). */
export function periodToFromDate(period: PeriodKey, today: Date = new Date()): string {
  const days = PERIOD_DAYS[period];
  const t = new Date(today);
  t.setDate(t.getDate() - days);
  return toISODate(t);
}

/** Stable, locale-safe YYYY-MM-DD formatter (avoids tz drift from toISOString). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Convenience: build a complete TransactionFilters payload from UI state. */
export function buildFilters(
  dealType: TransactionDealTypeFilter,
  period: PeriodKey
): Filters {
  return {
    deal_type: dealType,
    from: periodToFromDate(period),
    to: null,
  };
}

export default function TransactionFilters({
  dealType,
  period,
  onDealTypeChange,
  onPeriodChange,
}: TransactionFiltersProps) {
  // Period options memoized for ref stability (small, but neat).
  const periodOptions = useMemo(
    () =>
      (Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => ({
        value: k,
        label: PERIOD_LABEL[k],
      })),
    []
  );

  return (
    <div className="tx-filters" role="group" aria-label="거래 핀 필터">
      <p className="tx-filters__title mono-label">거래 필터</p>
      <div className="tx-filters__row">
        <Select
          aria-label="거래 유형"
          value={dealType}
          onChange={(e) => onDealTypeChange(e.target.value as TransactionDealTypeFilter)}
        >
          {DEAL_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="기간"
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as PeriodKey)}
        >
          {periodOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
