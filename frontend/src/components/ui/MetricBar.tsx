/**
 * MetricBar — labeled horizontal progress bar.
 *
 * Replaces 3 hand-rolled implementations (R-5 dedup):
 *   - .dong-panel__bar  (tone=score, value 0–100, no unit)
 *   - .kernel-panel__bar (tone=score, value 0–100, no unit)
 *   - .mypage__bar      (tone=weight, value 0–100, % unit)
 *
 * Tone:
 *   - 'score'  → fill colored by heatmap quintile (q1..q5). For dong/kernel
 *                score breakdown where the color signals magnitude.
 *   - 'weight' → solid near-black fill. For preference weights where color
 *                doesn't carry meaning (only the proportion does).
 *
 * Unit suffix appended to the rendered value:
 *   - undefined → just the number (e.g., "84")
 *   - '%'       → "84%"
 *   - '/100'    → "84/100"
 *
 * Usage:
 *   <MetricBar label="교통" value={85} tone="score" />
 *   <MetricBar label="전월세" value={40} tone="weight" unit="%" />
 */

import './MetricBar.css';

type Tone = 'score' | 'weight';
type Unit = '%' | '/100';

export interface MetricBarProps {
  /** Visible label (e.g., "전월세", "교통"). */
  label: string;
  /** Numeric value 0–100. Clamped on render; non-finite treated as 0. */
  value: number;
  /** Visual treatment for the fill. Default 'score'. */
  tone?: Tone;
  /** Optional unit suffix appended to the value display. */
  unit?: Unit;
  /** Override accessible name. Default: `${label} ${tone === 'weight' ? '가중치' : '점수'}`. */
  ariaLabel?: string;
}

/** Map a 0–100 score to a color: low=red, mid=green, high=blue. */
function scoreToColor(value: number): string {
  if (value < 25) return '#e53e3e';       // red
  if (value < 45) return '#ed8936';       // orange
  if (value < 65) return '#38a169';       // green
  if (value < 85) return '#3182ce';       // blue
  return '#2b6cb0';                       // deep blue
}

function MetricBar({
  label,
  value,
  tone = 'score',
  unit,
  ariaLabel,
}: MetricBarProps) {
  const clamped = Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;
  const rounded = Math.round(clamped);
  const display = unit ? `${rounded}${unit}` : `${rounded}`;
  const fillColor = tone === 'score' ? scoreToColor(clamped) : undefined;
  const computedAria =
    ariaLabel ?? `${label} ${tone === 'weight' ? '가중치' : '점수'}`;

  return (
    <div className="ui-metric-bar">
      <div className="ui-metric-bar__row">
        <span className="ui-metric-bar__label">{label}</span>
        <span className="ui-metric-bar__value tabular">{display}</span>
      </div>
      <div
        className="ui-metric-bar__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-label={computedAria}
      >
        <span
          className={`ui-metric-bar__fill ui-metric-bar__fill--${tone}`}
          style={{
            width: `${clamped}%`,
            ...(fillColor ? { backgroundColor: fillColor } : {}),
          }}
        />
      </div>
    </div>
  );
}

export default MetricBar;
