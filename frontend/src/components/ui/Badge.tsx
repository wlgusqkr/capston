/**
 * Badge — small label for state / category / mono technical marker.
 *
 * Variants:
 *   - success   dark green / pale green wash — 충분/양호
 *   - warning   coral wash — 보통
 *   - danger    error red wash — 부족/위험
 *   - neutral   stone wash, slate text — 기본 카테고리 라벨, mono label
 *   - info      action blue / pale blue wash — 정보
 *   - category  coral pill — 동네 카테고리 칩 (`대학가형`, `1인가구 밀집형`)
 *               Coral fill, white text. Active editorial chip.
 *   - mono      transparent + 1px hairline + uppercase mono. System markers
 *               like `WALK 5MIN`, `LINE 3`, `PERCENTILE 87`.
 *
 * Sizes:
 *   - sm  12-13px font, 22px height (default)
 *   - md  14px font, taller
 *
 * Examples:
 *   <Badge variant="success">충분</Badge>
 *   <Badge variant="category">대학가형</Badge>
 *   <Badge variant="mono">WALK 5MIN</Badge>
 *   <Badge variant="neutral">편의점 12개</Badge>
 */

import type { HTMLAttributes, ReactNode } from 'react';
import './Badge.css';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'category'
  | 'mono';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
}

function Badge({
  variant = 'neutral',
  size = 'sm',
  className,
  children,
  ...rest
}: BadgeProps) {
  const classes = [
    'ui-badge',
    `ui-badge--${variant}`,
    `ui-badge--${size}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}

export default Badge;
