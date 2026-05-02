/**
 * Input — text input with optional label, hint and error message.
 *
 * Examples:
 *   <Input label="검색" placeholder="동 이름 검색" />
 *   <Input label="이메일" hint="로그인에 사용됩니다" type="email" />
 *   <Input label="제목" error="제목을 입력해주세요" />
 *   <Input value={query} onChange={e => setQuery(e.target.value)} />
 *
 * Notes:
 *   - Height 40px (control-height-md)
 *   - Border 1px gray-200, focus ring primary
 *   - For native search, pass type="search"
 */

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import './Input.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  /** Error string. When set the field renders in danger state. */
  error?: ReactNode;
  /** Optional element rendered inside, on the left (e.g. an icon). */
  leftSlot?: ReactNode;
  /** Optional element rendered inside, on the right. */
  rightSlot?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftSlot, rightSlot, id, className, disabled, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const wrapperClasses = [
    'ui-input',
    error ? 'ui-input--error' : '',
    disabled ? 'ui-input--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const describedBy =
    [error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className={wrapperClasses}>
      {label && (
        <label htmlFor={inputId} className="ui-input__label">
          {label}
        </label>
      )}
      <div className="ui-input__field">
        {leftSlot && <span className="ui-input__slot ui-input__slot--left">{leftSlot}</span>}
        <input
          ref={ref}
          id={inputId}
          className="ui-input__control"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          {...rest}
        />
        {rightSlot && <span className="ui-input__slot ui-input__slot--right">{rightSlot}</span>}
      </div>
      {error ? (
        <span id={errorId} className="ui-input__error" role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="ui-input__hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
});

export default Input;
