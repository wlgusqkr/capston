/**
 * Button — base interactive primitive.
 *
 * Variants (DESIGN_SYSTEM.md):
 *   - primary    Near-Black pill fill, white text. 1차 CTA. (default)
 *                "이 동네 보러가기", "탐색 시작하기"
 *   - secondary  text-only + underline. "더 자세히", "직방에서 매물 보기"
 *   - outline    transparent + 1px Near-Black border, 30px radius. 필터 토글.
 *   - filled     outline의 active 상태. Near-Black fill + white text. 활성 필터.
 *   - ghost      legacy alias of secondary; new code should use `secondary`.
 *
 * Sizes:
 *   - sm  32px height (compact filter, inline action)
 *   - md  40px height (default — controls)
 *   - lg  48px height (CTA in dense contexts; primary uses 44px min on mobile)
 *
 * Examples:
 *   <Button>탐색 시작하기</Button>
 *   <Button variant="secondary">더 자세히</Button>
 *   <Button variant="outline">원룸/오피스텔</Button>
 *   <Button variant="filled">활성</Button>
 *   <Button loading>저장 중</Button>
 *   <Button leftIcon={<HeartIcon />}>찜하기</Button>
 *   <Button onClick={handle} disabled>비활성</Button>
 */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'filled' | 'ghost';
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
