// Heatmap legend (SPEC 6.1) — bottom-left of the map area.
// 5-stop gradient: Pale Green Wash → Deep Forest. Mirrors --heatmap-1..5
// in tokens.css and HEATMAP_COLORS in lib/colors.ts.
import './Legend.css';

export default function Legend() {
  return (
    <div className="legend" aria-label="히트맵 색상 범례">
      <span className="legend__label legend__label--start">낮음</span>
      <div className="legend__bar" role="presentation">
        <span className="legend__step legend__step--q1" />
        <span className="legend__step legend__step--q2" />
        <span className="legend__step legend__step--q3" />
        <span className="legend__step legend__step--q4" />
        <span className="legend__step legend__step--q5" />
      </div>
      <span className="legend__label legend__label--end">높음</span>
    </div>
  );
}
