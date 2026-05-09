/**
 * Color helpers — for use OUTSIDE of CSS where token variables are not
 * available. Leaflet (`fillColor`, `color`) and Recharts (`fill`, `stroke`)
 * cannot consume `var(--token)` strings, so this module mirrors the relevant
 * tokens.css values as JS hex constants.
 *
 * Where to use:
 *   - Leaflet polygon fill / stroke colors
 *   - Recharts fill / stroke / grid props
 *   - Any imperative canvas / WebGL drawing
 *
 * Where NOT to use:
 *   - JSX `style={{ color: ... }}` — prefer `var(--color-*)` from tokens.css.
 *
 * Update policy:
 *   These hex values MUST stay in sync with `frontend/src/styles/tokens.css`.
 *   Specifically the `--heatmap-1..5`, `--color-near-black`, `--color-coral`,
 *   `--color-deep-forest`, `--color-action-blue`, `--color-ink`,
 *   `--color-slate`, `--color-muted-slate`, `--color-hairline` tokens.
 *   If the design system shifts, update both places.
 */

/* -------------------------------------------------------------------------- */
/* Heatmap: 5-stop, Pale Green Wash → Deep Forest                             */
/* -------------------------------------------------------------------------- */

/**
 * 5-stop polygon fill palette, Pale Green Wash → Deep Forest.
 * Mirrors `--heatmap-1` … `--heatmap-5` in tokens.css.
 *
 * Bucket boundaries (per DESIGN_SYSTEM.md):
 *   bucket-1: [ 0, 20)  → #edfce9
 *   bucket-2: [20, 40)  → #b9dfb6
 *   bucket-3: [40, 60)  → #6fa985
 *   bucket-4: [60, 80)  → #2c7559
 *   bucket-5: [80, 100] → #003c33
 */
export const HEATMAP_COLORS = {
  q1: '#edfce9', // 0–20  (Pale Green Wash)
  q2: '#b9dfb6', // 20–40
  q3: '#6fa985', // 40–60
  q4: '#2c7559', // 60–80
  q5: '#003c33', // 80–100 (Deep Forest)
} as const;

/** 5-stop ordered tuple — convenient for legends or `.at(idx)` access. */
export const HEATMAP_COLORS_ORDERED = [
  HEATMAP_COLORS.q1,
  HEATMAP_COLORS.q2,
  HEATMAP_COLORS.q3,
  HEATMAP_COLORS.q4,
  HEATMAP_COLORS.q5,
] as const;

/** Polygon fill for dongs that have no score (data not yet available).
 *  Soft Stone keeps it on-palette and clearly distinct from the green ramp. */
export const HEATMAP_NO_DATA = '#eeece7'; // Soft Stone

export type HeatmapBucket = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

/**
 * Bucket a 0–100 score into one of five quintile buckets.
 * Boundaries: [0,20) / [20,40) / [40,60) / [60,80) / [80,100].
 *
 * Direction note: this function does NOT decide whether "low score = good" or
 * "high score = good". It just maps a number to a bucket. The caller (heatmap
 * layer, score bar) decides what the gradient direction means for each metric.
 */
export function scoreToHeatmapBucket(score: number): HeatmapBucket {
  const s = clamp(score, 0, 100);
  if (s < 20) return 'q1';
  if (s < 40) return 'q2';
  if (s < 60) return 'q3';
  if (s < 80) return 'q4';
  return 'q5';
}

/**
 * 0–100 score → hex color string.
 *
 * The optional second argument is kept for backward call-site compatibility
 * (a few HeatMap.tsx / HeroSection.tsx callers pass `'light'`). The new
 * design system has no dark mode, so the parameter is ignored.
 */
export function scoreToHeatmapColor(
  score: number,
  _theme: 'light' | 'dark' = 'light',
): string {
  return HEATMAP_COLORS[scoreToHeatmapBucket(score)];
}

/* -------------------------------------------------------------------------- */
/* Map polygon stroke (per DESIGN_SYSTEM.md "Map-Specific Shapes")            */
/* -------------------------------------------------------------------------- */

/**
 * Polygon stroke colors for Leaflet.
 *
 * Spec:
 *   - Default dong polygon stroke: 1px #ffffff @ 60% opacity
 *   - Selected polygon stroke:     2px #17171c (Near-Black)
 *
 * Leaflet's `style` callback expects `color` (hex) + `opacity` (0..1)
 * separately, so we expose both. There is no separate "dark theme" stroke;
 * the system is light-only.
 */
export const MAP_POLYGON_STROKE = {
  /** Default outline. Apply with `{ color, opacity }`. */
  default: { color: '#ffffff', opacity: 0.6, weight: 1 },
  /** Hover outline — slightly more opaque white, same color. */
  hover: { color: '#ffffff', opacity: 0.85, weight: 1.2 },
  /** Selected outline — Near-Black, full opacity. */
  selected: { color: '#17171c', opacity: 1, weight: 2 },

  /** Convenience aliases retained for older callers (HeroSection). */
  light: '#ffffff',
  dark: '#17171c',
} as const;

/**
 * Transaction pin / POI marker colors. Per DESIGN_SYSTEM.md:
 *   - default: Near-Black `#17171c`, 12px circle, white inner dot
 *   - selected: Coral `#ff7759`, 16px on hover
 */
export const MAP_PIN = {
  default: '#17171c',
  selected: '#ff7759',
  innerDot: '#ffffff',
} as const;

/* -------------------------------------------------------------------------- */
/* Recharts palette                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Recharts color palette — for the dong detail page (SPEC 6.3) and any
 * other charts. Per DESIGN_SYSTEM.md the chart shell stays mono (Ink + axis
 * Hairline + grid Hairline); colored series are reserved for "data is the
 * hero" moments.
 *
 * The three rent-trend lines use the **mono ink + Action Blue + Coral**
 * triplet so all three are readable on the same axes without resurrecting
 * the legacy 4-color category palette. If a future chart needs a 5-step
 * sequential palette, use `HEATMAP_COLORS_ORDERED`.
 *
 * Mapping (SPEC 6.3 RealEstate trend chart, 4 series):
 *   villa     → Ink (#212121)         — primary series, monochrome
 *   dagagu    → Action Blue (#1863dc) — secondary line (옛 multi 자리 이어받음)
 *   danok     → Slate Mid (#6b7280)   — tertiary, 단독 = mature mid-grey
 *   officetel → Coral (#ff7759)       — warm accent
 *
 * Phase 1 RDS 통합으로 단독다가구(multi) 카테고리가 다가구(dagagu)·단독(danok)
 * 두 시리즈로 분리됨. 차트 라인 4개로 늘어남 (apt는 별도 시장이라 미포함).
 */
export const CHART_COLORS = {
  /** 연립다세대 (villa) — primary series, Ink. */
  villa: '#212121',
  /** 다가구 (dagagu) — Action Blue. 자취 시장의 본진. */
  dagagu: '#1863dc',
  /** 단독 (danok) — Slate Mid. */
  danok: '#6b7280',
  /** 오피스텔 (officetel) — Coral. */
  officetel: '#ff7759',
  /** Generic bar fill — Near-Black for deposit bands. */
  bar: '#17171c',
  /** Axis tick / label color — Slate. */
  axis: '#75758a',
  /** Recharts grid line color — Hairline. */
  grid: '#d9d9dd',
} as const;

/* -------------------------------------------------------------------------- */
/* Internal                                                                   */
/* -------------------------------------------------------------------------- */

function clamp(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}
