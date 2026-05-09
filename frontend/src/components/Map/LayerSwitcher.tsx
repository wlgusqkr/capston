// LayerSwitcher — 4-tab pill toggle for the heatmap layer.
//
// Used today inside Sidebar (Stage 2a decomposition). Will also be mounted
// as the top-left floating LayerPills in R-1 (Stage 2b) — same component,
// new positioning class.
//
// Layers are intrinsic to the heatmap data (4 weight axes shown one at a
// time), so the LAYERS const lives here, not in the parent.

import './LayerSwitcher.css';

/** Phase 5: 'match' (자취 거래량 분포) 가 default 첫 옵션으로 추가됨.
 *  나머지 4종은 기존 score 기반 (composite/rent/amenity/transit). */
export const LAYERS = [
  { key: 'match', label: '매칭' },
  { key: 'composite', label: '종합' },
  { key: 'rent', label: '전월세' },
  { key: 'amenity', label: '생활시설' },
  { key: 'transit', label: '교통' },
] as const;

export type LayerKey = (typeof LAYERS)[number]['key'];

export interface LayerSwitcherProps {
  activeLayer: LayerKey;
  onLayerChange: (next: LayerKey) => void;
  /** Optional: render a "히트맵 표시" toggle below the tabs (Sidebar variant). */
  heatmapVisible?: boolean;
  onToggleHeatmap?: (next: boolean) => void;
  /** Override the role landmark for the wrapper. */
  className?: string;
}

export default function LayerSwitcher({
  activeLayer,
  onLayerChange,
  heatmapVisible,
  onToggleHeatmap,
  className,
}: LayerSwitcherProps) {
  const showHeatmapToggle =
    heatmapVisible !== undefined && onToggleHeatmap !== undefined;

  return (
    <div className={['layer-switcher', className].filter(Boolean).join(' ')}>
      <div className="layer-switcher__tabs" role="tablist" aria-label="히트맵 레이어">
        {LAYERS.map((layer) => {
          const selected = layer.key === activeLayer;
          return (
            <button
              key={layer.key}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? 'layer-switcher__tab layer-switcher__tab--active'
                  : 'layer-switcher__tab'
              }
              onClick={() => onLayerChange(layer.key)}
            >
              {layer.label}
            </button>
          );
        })}
      </div>
      {showHeatmapToggle && (
        <label className="layer-switcher__check">
          <input
            type="checkbox"
            checked={heatmapVisible}
            onChange={(e) => onToggleHeatmap(e.target.checked)}
          />
          <span>히트맵 표시</span>
        </label>
      )}
    </div>
  );
}
