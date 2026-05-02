/**
 * Card — flat, bordered container.
 *
 * Variants:
 *   - default  white surface (in dark mode: --color-surface)
 *   - inset    gray-50 surface, used inside a default card or section
 *
 * Padding props:
 *   - padding="md" (16px, default)
 *   - padding="lg" (20px)
 *   - padding="none" (no padding, you control internal layout)
 *
 * Examples:
 *   <Card>...</Card>
 *   <Card variant="inset" padding="lg">...</Card>
 *   <Card as="article">...</Card>
 *   <Card padding="none"><Header /><Body /></Card>
 */

import { forwardRef } from 'react';
import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import './Card.css';

export type CardVariant = 'default' | 'inset';
export type CardPadding = 'none' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Render as a different element (e.g. 'article', 'section'). Default: 'div'. */
  as?: ElementType;
  children?: ReactNode;
}

const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { variant = 'default', padding = 'md', as, className, children, ...rest },
  ref
) {
  const Tag = (as ?? 'div') as ElementType;
  const classes = [
    'ui-card',
    `ui-card--${variant}`,
    `ui-card--pad-${padding}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag ref={ref} className={classes} {...rest}>
      {children}
    </Tag>
  );
});

export default Card;
