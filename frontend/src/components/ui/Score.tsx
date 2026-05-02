/**
 * Score — display a 0~100 score as a big number with optional unit and delta.
 *
 * Color rules (SPEC 4.4 점수 표시):
 *   - 0  ~ 40   danger (red)
 *   - 40 ~ 70   warning (orange)
 *   - 70 ~ 100  success (teal)
 *
 * Sizes:
 *   - md  number 28px (default — fits in panel summary)
 *   - lg  number 36px (display token, hero / detail page)
 *
 * Examples:
 *   <Score value={78} unit="/ 100" />
 *   <Score value={62} delta={+4} />
 *   <Score value={45} unit="점" size="lg" />
 *   <Score value={92} delta={-2} ariaLabel="필동 종합점수 92점" />
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
  /** Override the auto-detected color category. */
  tone?: 'danger' | 'warning' | 'success';
  /** aria-label for screen readers (recommended for non-obvious context). */
  ariaLabel?: string;
}

function tonalCategoryFromValue(value: number): 'danger' | 'warning' | 'success' {
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
