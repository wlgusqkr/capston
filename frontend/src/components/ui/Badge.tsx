/**
 * Badge — small label for state / category.
 *
 * Variants:
 *   - success  청록 — 충분/양호
 *   - warning  오렌지 — 보통
 *   - danger   빨강 — 부족/위험
 *   - info     파랑 — 정보
 *   - neutral  회색 — 기본 카테고리 라벨
 *
 * Sizes:
 *   - sm  font 11px (default — fits within 22px chip)
 *   - md  font 13px
 *
 * Examples:
 *   <Badge variant="success">충분</Badge>
 *   <Badge variant="warning" size="md">보통</Badge>
 *   <Badge variant="neutral">편의점 12개</Badge>
 */

import type { HTMLAttributes, ReactNode } from 'react';
import './Badge.css';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
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
