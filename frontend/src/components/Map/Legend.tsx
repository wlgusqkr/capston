// Heatmap legend (SPEC 6.1) — bottom-left of the map area.
// Four-step gradient using the design-system data viz tokens.
import './Legend.css';

export default function Legend() {
  return (
    <div className="legend" aria-label="히트맵 색상 범례">
      <span className="legend__label legend__label--start">낮음</span>
      <div className="legend__bar" role="presentation">
        <span className="legend__step legend__step--low" />
        <span className="legend__step legend__step--mid1" />
        <span className="legend__step legend__step--mid2" />
        <span className="legend__step legend__step--high" />
      </div>
      <span className="legend__label legend__label--end">높음</span>
    </div>
  );
}
