// Amenity rank percentile helper (A-7a, design-polish-v2.md).
//
// R-3 amenity rows add a 4th cell `TOP {n}%`. The data does NOT live in
// /api/dongs/:slug/detail — the per-dong detail response has only `count` and
// `density_per_km2` per category, no peer distribution.
//
// To avoid expanding the backend (capstone scope), we compute the percentile
// on the client using `useDongScores()` which is already cached for the map.
// `score_amenity` is one number per dong (the composite amenity axis) — we
// don't have per-category peer distributions, so every amenity row of a given
// dong shares the same percentile. The `category` arg is kept in the signature
// to match the plan's contract and to leave room for a future per-category
// expansion if the backend ever exposes it.
//
// Edge cases:
//   - Empty / undefined `allDongs` → null (caller renders "—").
//   - All dongs share the same `score_amenity` (synthetic data) → null.
//     Plan A-7a mandates "—" not "TOP 0%" in this case.
//   - currentScore is non-finite → null.
//
// Output: integer 1..100 representing "TOP X%". Lower X is better
// (TOP 5% = better than 95% of dongs). Caller renders `TOP ${X}%`.

import type { DongScore } from '@/types/api';

export function computeAmenityPercentile(
  allDongs: DongScore[] | undefined,
  // Reserved for future per-category distributions; currently unused —
  // see header comment.
  _category: string,
  currentScore: number,
): number | null {
  if (!allDongs || allDongs.length === 0) return null;
  if (!Number.isFinite(currentScore)) return null;

  const scores = allDongs.map((d) => d.score_amenity).filter((s) => Number.isFinite(s));
  if (scores.length === 0) return null;

  // Synthetic-data edge case: every dong has the same score → no distribution.
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (min === max) return null;

  const lower = scores.filter((s) => s < currentScore).length;
  const percentile = (lower / scores.length) * 100;
  // Invert + round so "TOP X%" reads as "better than (100 - X)% of dongs".
  // Clamp to [1, 100] so we never render "TOP 0%".
  const top = Math.max(1, Math.min(100, Math.round(100 - percentile)));
  return top;
}
