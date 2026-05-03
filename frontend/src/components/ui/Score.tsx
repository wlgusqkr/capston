/**
 * Score — display a 0~100 score (or any KPI number) as a large number with
 * optional unit and delta.
 *
 * Per DESIGN_SYSTEM.md, the number itself reads in Ink (high-contrast on
 * Soft Stone score card). We retain optional `tone` overrides for cases where
 * a status color is explicitly desired, but the default is the calm
 * monochrome the new system wants.
 *
 * Auto-tone (only applied when `tone` is omitted):
 *   - 0  ~ 40   danger
 *   - 40 ~ 70   warning (coral)
 *   - 70 ~ 100  success (deep green)
 *
 * Sizes:
 *   - md  number 28px — fits in panel summary
 *   - lg  number 48px — score card hero KPI ("55만원")
 *
 * Examples:
 *   <Score value={78} unit="/ 100" />
 *   <Score value={62} delta={+4} />
 *   <Score value={45} unit="점" size="lg" />
 *   <Score value={92} delta={-2} tone="neutral" />
 */

import type { HTMLAttributes } from 'react';
import './Score.css';

export type ScoreSize = 'md' | 'lg';

export interface ScoreProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Score value 0 ~ 100. Out-of-range is clamped for color, displayed as-is. */
  value: number;
  /** Optional unit text (e.g. "/ 100", "점"). Rendered small to the right. */
  unit?: string;
  /** Optional delta value. Positive shows up arrow, negative shows down arrow. */
  delta?: number;
  size?: ScoreSize;
  /** Override the auto-detected color category. `neutral` keeps the
   *  monochrome Ink color preferred by the new design system. */
  tone?: 'danger' | 'warning' | 'success' | 'neutral';
  /** aria-label for screen readers (recommended for non-obvious context). */
  ariaLabel?: string;
}

function tonalCategoryFromValue(
  value: number
): 'danger' | 'warning' | 'success' | 'neutral' {
  if (value < 40) return 'danger';
  if (value < 70) return 'warning';
  return 'success';
}

function Score({
  value,
  unit,
  delta,
  size = 'md',
  tone,
  ariaLabel,
  className,
  ...rest
}: ScoreProps) {
  const tonalClass = tone ?? tonalCategoryFromValue(value);
  const classes = [
    'ui-score',
    `ui-score--${size}`,
    `ui-score--${tonalClass}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const deltaSign = delta != null ? (delta > 0 ? '▲' : delta < 0 ? '▼' : '') : '';
  const deltaTone =
    delta == null ? '' : delta > 0 ? 'ui-score__delta--up' : delta < 0 ? 'ui-score__delta--down' : '';

  return (
    <div
      className={classes}
      role="text"
      aria-label={ariaLabel ?? `${value}${unit ?? ''}`}
      {...rest}
    >
      <span className="ui-score__value tabular">{value}</span>
      {unit && <span className="ui-score__unit">{unit}</span>}
      {delta != null && (
        <span className={`ui-score__delta ${deltaTone}`}>
          <span aria-hidden="true">{deltaSign}</span>
          <span className="tabular">{Math.abs(delta)}</span>
        </span>
      )}
    </div>
  );
}

export default Score;
