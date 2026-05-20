// MapModeToggle -- 메인 지도 사이드바의 MAP MODE 토글 (Phase 5 cleanup).

export type MapMode = 'match' | 'score';

const OPTIONS: Array<{ value: MapMode; label: string; sub: string }> = [
  { value: 'match', label: '매칭', sub: '거래량 분포' },
  { value: 'score', label: '종합 점수', sub: '가중치 기반' },
];

export interface MapModeToggleProps {
  mode: MapMode;
  onModeChange: (next: MapMode) => void;
}

export default function MapModeToggle({ mode, onModeChange }: MapModeToggleProps) {
  return (
    <div className="flex flex-col gap-1" role="radiogroup" aria-label="지도 모드">
      {OPTIONS.map((opt) => {
        const selected = opt.value === mode;
        return (
          <label
            key={opt.value}
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 border border-divider rounded-sm cursor-pointer text-body-base min-h-[44px] transition-all duration-[120ms] ease-out ${
              selected
                ? 'bg-surface-alt border-text text-text font-medium'
                : 'text-text-subtle hover:border-text-subtle hover:text-text'
            }`}
          >
            <input
              type="radio"
              name="map-mode"
              value={opt.value}
              checked={selected}
              onChange={() => onModeChange(opt.value)}
              className="m-0 accent-text"
            />
            <span>{opt.label}</span>
            <span
              className={`text-caption font-normal tracking-[var(--letter-spacing-ko)] ${
                selected ? 'text-text-muted' : 'text-text-subtle'
              }`}
            >
              {opt.sub}
            </span>
          </label>
        );
      })}
    </div>
  );
}
