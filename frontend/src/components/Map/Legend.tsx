// Heatmap legend (SPEC 6.1) — bottom-right of the map area.
// 5-stop gradient: Pale Green Wash → Deep Forest. Mirrors --heatmap-1..5
// in tokens.css and HEATMAP_COLORS in lib/colors.ts.
//
// Phase 5: mode 분기. 'score' (기존 라벨) vs 'match' (거래량 분포 라벨).
// match 모드일 때 좌측에 MatchModeBadge 인라인 표시 (Coral mono).

import MatchModeBadge from './MatchModeBadge';

import './Legend.css';

export type LegendMode = 'score' | 'match';

export interface LegendProps {
  /** Phase 5: 'score' (기존) 또는 'match' (조건 거래량). default 'match'. */
  mode?: LegendMode;
}

export default function Legend({ mode = 'match' }: LegendProps) {
  const startLabel = mode === 'match' ? '0건' : '낮음';
  const endLabel = mode === 'match' ? '가장 많음' : '높음';
  const ariaLabel =
    mode === 'match'
      ? '거래량 분포 색상 범례'
      : '히트맵 색상 범례';

  return (
    <div className="legend" aria-label={ariaLabel}>
      {mode === 'match' ? <MatchModeBadge /> : null}
      {/* key 변경 시 cross-fade 대신 리마운트 — CSS animation 으로 200ms fade. */}
      <span
        key={`start-${mode}`}
        className="legend__label legend__label--start legend__label--fade"
      >
        {startLabel}
      </span>
      <div className="legend__bar" role="presentation">
        <span className="legend__step legend__step--q1" />
        <span className="legend__step legend__step--q2" />
        <span className="legend__step legend__step--q3" />
        <span className="legend__step legend__step--q4" />
        <span className="legend__step legend__step--q5" />
      </div>
      <span
        key={`end-${mode}`}
        className="legend__label legend__label--end legend__label--fade"
      >
        {endLabel}
      </span>
    </div>
  );
}
