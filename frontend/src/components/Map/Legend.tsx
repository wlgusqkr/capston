// Heatmap legend (SPEC 6.1) — bottom-right of the map area.
// 5-stop gradient: Pale Green Wash → Deep Forest. Mirrors --heatmap-1..5
// in tokens.css and HEATMAP_COLORS in lib/colors.ts.
//
// Phase 5: mode 분기. 'score' (기존 라벨) vs 'match' (거래량 분포 라벨).
// match 모드일 때 좌측에 MatchModeBadge 인라인 표시 (Coral mono).

import MatchModeBadge from './MatchModeBadge';

export type LegendMode = 'score' | 'match';

export interface LegendProps {
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
    <div
      className="absolute right-4 bottom-[calc(16px+32px+8px)] flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-sm shadow-floating z-[400] font-[var(--font-family-mono)]"
      aria-label={ariaLabel}
    >
      {mode === 'match' ? <MatchModeBadge /> : null}
      <span
        key={`start-${mode}`}
        className="text-mono-label leading-[1.4] font-normal tracking-[0.26px] text-text-subtle uppercase [animation:legend-label-fade_200ms_ease-out]"
      >
        {startLabel}
      </span>
      <div className="flex w-[var(--legend-bar-w)] h-[var(--legend-bar-h)] rounded-full overflow-hidden" role="presentation">
        <span className="flex-1 bg-[var(--heatmap-1)]" />
        <span className="flex-1 bg-[var(--heatmap-2)]" />
        <span className="flex-1 bg-[var(--heatmap-3)]" />
        <span className="flex-1 bg-[var(--heatmap-4)]" />
        <span className="flex-1 bg-[var(--heatmap-5)]" />
      </div>
      <span
        key={`end-${mode}`}
        className="text-mono-label leading-[1.4] font-normal tracking-[0.26px] text-text-subtle uppercase [animation:legend-label-fade_200ms_ease-out]"
      >
        {endLabel}
      </span>
    </div>
  );
}
