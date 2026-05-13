// KpiCard -- reusable KPI card for the dashboard top row.
//
// Features:
//   - Countup animation (0 -> target) using requestAnimationFrame (~1.2s)
//   - Optional subValue with up/down trend indicator
//   - Optional miniChart slot (e.g. tiny Recharts LineChart / BarChart)
//   - Optional hint text (data source / note)

import { useEffect, useRef, useState } from 'react';

export interface KpiCardProps {
  label: string;
  /** Display value as string (e.g. "72만원"). If numeric prefix exists, it will be countup-animated. */
  value: string;
  /** Trend indicator — e.g. "▲ 3.2%" or "▼ 1.5%". Positive = danger, negative = success. */
  subValue?: string;
  /** Small footnote — data source or caveat. */
  hint?: string;
  /** Slot for a tiny inline chart (Recharts tiny LineChart, etc). */
  miniChart?: React.ReactNode;
  className?: string;
  /** Whether to show loading skeleton. */
  isLoading?: boolean;
}

/** Extract the leading numeric portion from a string like "72만원" -> 72. */
function extractNumeric(s: string): { num: number; prefix: string; suffix: string } | null {
  const match = s.match(/^([^0-9]*)([0-9,]+(?:\.[0-9]+)?)(.*)$/);
  if (!match) return null;
  const num = parseFloat(match[2].replace(/,/g, ''));
  if (!Number.isFinite(num) || num === 0) return null;
  return { num, prefix: match[1], suffix: match[3] };
}

function useCountup(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * target);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}

function formatCountup(current: number, parsed: { num: number; prefix: string; suffix: string }): string {
  // If target is integer, display as integer with comma separators
  if (Number.isInteger(parsed.num)) {
    return `${parsed.prefix}${Math.round(current).toLocaleString()}${parsed.suffix}`;
  }
  // Otherwise preserve decimal places
  const decimals = parsed.num.toString().split('.')[1]?.length ?? 1;
  return `${parsed.prefix}${current.toFixed(decimals)}${parsed.suffix}`;
}

export default function KpiCard({
  label,
  value,
  subValue,
  hint,
  miniChart,
  className = '',
  isLoading = false,
}: KpiCardProps) {
  const parsed = extractNumeric(value);
  const animatedNum = useCountup(parsed?.num ?? 0);

  if (isLoading) {
    return (
      <div
        className={`p-5 border border-divider rounded-card bg-surface flex flex-col gap-2 ${className}`}
      >
        <div className="h-3 w-16 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
        <div className="h-8 w-24 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
        <div className="h-3 w-20 bg-primary-soft rounded animate-[match-panel-pulse_1.5s_ease-in-out_infinite]" />
      </div>
    );
  }

  const displayValue = parsed ? formatCountup(animatedNum, parsed) : value;

  // Determine trend color from subValue
  let trendColor = 'text-text-muted';
  if (subValue) {
    if (subValue.includes('\u25B2')) trendColor = 'text-danger'; // ▲
    if (subValue.includes('\u25BC')) trendColor = 'text-success'; // ▼
  }

  return (
    <div
      className={`p-5 border border-divider rounded-card bg-surface flex flex-col gap-2 ${className}`}
    >
      <p className="text-caption m-0 text-text-subtle">{label}</p>
      <div className="flex items-end gap-3">
        <p className="tabular m-0 text-card-heading font-semibold text-text leading-[1.1]">
          {displayValue}
        </p>
        {subValue && (
          <span className={`text-caption font-medium ${trendColor} mb-0.5`}>
            {subValue}
          </span>
        )}
      </div>
      {miniChart && <div className="mt-1">{miniChart}</div>}
      {hint && <p className="m-0 text-caption text-text-muted">{hint}</p>}
    </div>
  );
}
