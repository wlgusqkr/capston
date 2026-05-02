/**
 * Select — wraps native <select> with a custom chevron icon.
 *
 * Examples:
 *   <Select label="기간" value={period} onChange={e => setPeriod(e.target.value)}>
 *     <option value="3m">3개월</option>
 *     <option value="6m">6개월</option>
 *     <option value="12m">12개월</option>
 *   </Select>
 *
 *   <Select label="레이어" hint="히트맵에 표시할 지표" defaultValue="total">
 *     <option value="total">종합</option>
 *     <option value="rent">전월세</option>
 *   </Select>
 *
 * Notes:
 *   - Height 40px (control-height-md)
 *   - Native <select> — accessibility comes for free
 */

import { forwardRef, useId } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import './Select.css';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

const ChevronDown = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M3.5 5.25L7 8.75L10.5 5.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, id, className, disabled, children, ...rest },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = `${selectId}-hint`;
  const errorId = `${selectId}-error`;

  const wrapperClasses = [
    'ui-select',
    error ? 'ui-select--error' : '',
    disabled ? 'ui-select--disabled' : '',
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
        <label htmlFor={selectId} className="ui-select__label">
          {label}
        </label>
      )}
      <div className="ui-select__field">
        <select
          ref={ref}
          id={selectId}
          className="ui-select__control"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          {...rest}
        >
          {children}
        </select>
        <span className="ui-select__chevron" aria-hidden="true">
          <ChevronDown />
        </span>
      </div>
      {error ? (
        <span id={errorId} className="ui-select__error" role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="ui-select__hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
});

export default Select;
