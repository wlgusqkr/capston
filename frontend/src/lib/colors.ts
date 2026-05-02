/**
 * Color helpers — for use outside of CSS where token variables are not available.
 *
 * Where to use:
 *   - Leaflet polygon `fillColor` (Leaflet does not consume CSS vars)
 *   - Recharts `fill` / `stroke` props
 *   - Any imperative canvas / WebGL drawing
 *
 * Where NOT to use:
 *   - JSX style attributes — prefer `var(--color-*)` from tokens.css
 *
 * The four heatmap colors mirror tokens.css exactly so that map polygons
 * and DOM elements visually agree.
 */

/* Light-theme heatmap palette. Mirrors --color-data-* in tokens.css. */
export const HEATMAP_COLORS = {
  low: '#378ADD',   // 0~25
  mid1: '#1D9E75',  // 25~50
  mid2: '#EF9F27',  // 50~75
  high: '#E24B4A',  // 75~100
} as const;

/* Dark-theme heatmap palette (slightly lifted hues). */
export const HEATMAP_COLORS_DARK = {
  low: '#5AA3E8',
  mid1: '#2DB084',
  mid2: '#F2AE43',
  high: '#EC6160',
} as const;

export type HeatmapBucket = 'low' | 'mid1' | 'mid2' | 'high';

/**
 * Bucket a 0~100 score into one of four heatmap buckets.
 * Boundaries: [0, 25), [25, 50), [50, 75), [75, 100].
 *
 * NOTE on direction:
 *   This function does NOT decide whether "low score = good" or "high score = bad".
 *   It just maps a number to a bucket. The caller (e.g., heatmap layer) decides
 *   what the gradient direction means for each metric.
 */
export function scoreToHeatmapBucket(score: number): HeatmapBucket {
  const s = clamp(score, 0, 100);
  if (s < 25) return 'low';
  if (s < 50) return 'mid1';
  if (s < 75) return 'mid2';
  return 'high';
}

/**
 * 0~100 score → hex color string (light theme).
 *
 * For dark theme pass `theme: 'dark'`. We do not auto-detect because callers
 * (Leaflet/Recharts) usually know which theme they are rendering in via the
 * surrounding React context.
 */
export function scoreToHeatmapColor(
  score: number,
  theme: 'light' | 'dark' = 'light'
): string {
  const palette = theme === 'dark' ? HEATMAP_COLORS_DARK : HEATMAP_COLORS;
  return palette[scoreToHeatmapBucket(score)];
}

/**
 * Polygon stroke colors for Leaflet (Leaflet does not consume CSS vars).
 * Light: white (matches surface). Dark: faint warm gray (matches dark surface).
 */
export const MAP_POLYGON_STROKE = {
  light: '#FFFFFF',
  dark: '#3A3A36', // matches --color-gray-200 in dark theme
} as const;

/**
 * Recharts color palette — for the dong detail page (SPEC 6.3).
 *
 * Recharts cannot consume CSS variables, so we mirror tokens.css here.
 * The three line colors for the rent trend chart use distinct hues from the
 * data palette so all three lines are readable on the same axes.
 *
 * IMPORTANT: keep these values in sync with tokens.css if the palette evolves.
 */
export const CHART_COLORS = {
  /** 연립다세대 (villa) — primary brand teal. */
  villa: '#0F6E56',
  /** 단독다가구 (multi) — warm secondary orange. */
  multi: '#BA7517',
  /** 오피스텔 (officetel) — data-low blue. */
  officetel: '#378ADD',
  /** Generic bar fill — neutral gray-900 on light, used for deposit bands. */
  bar: '#5F5E5A',
  /** Bar fill (dark theme variant). */
  barDark: '#B8B6AC',
  /** Axis tick / grid line color. */
  axis: '#888780',
  /** Recharts grid line color. */
  grid: '#D3D1C7',
} as const;

/** Chart palette adjusted for dark mode surfaces. */
export const CHART_COLORS_DARK = {
  villa: '#1D8E70',
  multi: '#D08A2C',
  officetel: '#5AA3E8',
  bar: '#B8B6AC',
  barDark: '#5F5E5A',
  axis: '#8C8B83',
  grid: '#3A3A36',
} as const;

/* Internal helper. Not exported — keep API small. */
function clamp(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}
