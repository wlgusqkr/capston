/**
 * Slider — wraps native <input type="range"> with a primary track + thumb.
 *
 * Critical use case (SPEC 6.1): 가중치 슬라이더.
 * Three sliders for 전월세 / 생활시설 / 교통, each 0~100. Parent computes sum.
 *
 * Props:
 *   - value, onChange (controlled)
 *   - min/max/step (defaults 0/100/1)
 *   - label, valueText (optional display)
 *   - showValue (default true if valueText is provided)
 *
 * Examples:
 *   <Slider
 *     label="전월세"
 *     value={wRent}
 *     onChange={(v) => setWRent(v)}
 *     valueText={`${wRent}%`}
 *   />
 *
 *   <Slider min={0} max={50} step={5} value={radius} onChange={setRadius} />
 *
 *   <Slider label="안전 가중치" value={ws} onChange={setWs} disabled />
 *
 * Notes:
 *   - onChange is called with a NUMBER, not the event. This is the cleanest API
 *     for the weight-slider use case where parent normalizes the trio.
 *   - Use onInput-equivalent semantics: fires on every drag step.
 */

import { forwardRef, useId } from 'react';
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import './Slider.css';

export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'size'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: ReactNode;
  /** Right-side text shown next to the label, e.g. "33%". */
  valueText?: ReactNode;
  /** Hide the label/value row even if `label` is set. */
  hideHeader?: boolean;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    label,
    valueText,
    hideHeader = false,
    disabled,
    id,
    className,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const percent = ((value - min) / (max - min)) * 100;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const wrapperClasses = [
    'ui-slider',
    disabled ? 'ui-slider--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      {!hideHeader && (label || valueText) && (
        <div className="ui-slider__header">
          {label && (
            <label htmlFor={inputId} className="ui-slider__label">
              {label}
            </label>
          )}
          {valueText != null && (
            <span className="ui-slider__value tabular">{valueText}</span>
          )}
        </div>
      )}
      <input
        ref={ref}
        id={inputId}
        type="range"
        className="ui-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        aria-valuetext={typeof valueText === 'string' ? valueText : undefined}
        style={{ ['--ui-slider-fill' as string]: `${percent}%` }}
        {...rest}
      />
    </div>
  );
});

export default Slider;
