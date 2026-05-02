/**
 * Button — base interactive primitive.
 *
 * Variants:
 *   - primary    teal fill, white text  (default)
 *   - secondary  outline + teal text
 *   - ghost      no border, teal text
 *
 * Sizes:
 *   - sm  32px height
 *   - md  40px height (default)
 *   - lg  48px height
 *
 * Examples:
 *   <Button>자세히 보기</Button>
 *   <Button variant="secondary">비교에 추가</Button>
 *   <Button variant="ghost" size="sm">건너뛰기</Button>
 *   <Button loading>저장 중</Button>
 *   <Button leftIcon={<HeartIcon />}>찜하기</Button>
 *   <Button onClick={handle} disabled>비활성</Button>
 */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show spinner and disable the button. */
  loading?: boolean;
  /** Stretch to fill parent width. */
  fullWidth?: boolean;
  /** Optional icon to render before children. */
  leftIcon?: ReactNode;
  /** Optional icon to render after children. */
  rightIcon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref
) {
  const classes = [
    'ui-button',
    `ui-button--${variant}`,
    `ui-button--${size}`,
    fullWidth ? 'ui-button--full' : '',
    loading ? 'ui-button--loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="ui-button__spinner" aria-hidden="true" />}
      {!loading && leftIcon && (
        <span className="ui-button__icon" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <span className="ui-button__label">{children}</span>
      {!loading && rightIcon && (
        <span className="ui-button__icon" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
});

export default Button;
