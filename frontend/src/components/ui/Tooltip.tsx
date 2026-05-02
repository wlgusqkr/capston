/**
 * Tooltip — small label appearing on hover or focus.
 *
 * NOTE: For map hover tooltips on Leaflet polygons (SPEC 6.1), use Leaflet's
 * built-in tooltip layer instead. This component is for DOM elements
 * (icons, buttons, abbreviated labels, etc.).
 *
 * Examples:
 *   <Tooltip label="비교 목록에 추가">
 *     <Button variant="ghost" size="sm">+</Button>
 *   </Tooltip>
 *
 *   <Tooltip label="0~100점, 높을수록 좋음" placement="bottom">
 *     <span className="tabular">78</span>
 *   </Tooltip>
 *
 * Implementation:
 *   - Pure CSS positioning (no external lib)
 *   - Trigger: hover + focus-within
 *   - Wraps a single child in a span (sets aria-describedby)
 */

import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import './Tooltip.css';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  label: ReactNode;
  placement?: TooltipPlacement;
  /** A single React element (button, span, icon button, etc.). */
  children: ReactElement;
}

function Tooltip({ label, placement = 'top', children }: TooltipProps) {
  const id = useId();
  return (
    <span className="ui-tooltip">
      <span
        className="ui-tooltip__trigger"
        aria-describedby={id}
      >
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={`ui-tooltip__bubble ui-tooltip__bubble--${placement}`}
      >
        {label}
      </span>
    </span>
  );
}

export default Tooltip;
