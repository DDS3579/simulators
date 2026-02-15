/**
 * @module ParamSlider
 *
 * @description
 * A reusable parameter input component that combines a labeled slider (range input),
 * a text input for precise values, and an optional unit display. Handles the tricky
 * synchronization between slider position, text input, and parent state including
 * edge cases like typing partial numbers ("-", "3.", empty string).
 *
 * Used for every adjustable physics parameter across all Newton's Laws simulators:
 * mass, force, velocity, angle, height, coefficient of friction, etc.
 *
 * @purpose
 * Every simulator has 3-8 parameter sliders. This component handles label, range,
 * text input sync, validation, clamping, and styling in one place so simulators
 * don't duplicate input logic.
 *
 * @dependents
 * - SecondLawSimulator (mass, applied force, friction coefficient)
 * - ImpulseMomentumSimulator (force, duration, mass)
 * - MomentumConservationSimulator (mass1, mass2, v1, v2)
 * - ApparentWeightSimulator (mass, acceleration)
 * - RelativeVelocitySimulator (vA, vB, angle)
 *
 * @example
 * ```jsx
 * import ParamSlider from './shared/ParamSlider';
 *
 * function Controls() {
 *   const [mass, setMass] = useState(5);
 *   const [force, setForce] = useState(20);
 *
 *   return (
 *     <div className="space-y-2">
 *       <ParamSlider
 *         label="Mass"
 *         value={mass}
 *         onChange={setMass}
 *         min={0.5}
 *         max={50}
 *         step={0.5}
 *         unit=" kg"
 *         precision={1}
 *       />
 *       <ParamSlider
 *         label="Applied Force"
 *         value={force}
 *         onChange={setForce}
 *         min={-100}
 *         max={100}
 *         step={1}
 *         unit=" N"
 *         highlight={true}
 *         note="Negative = leftward"
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * ParamSlider — A combined slider + text input for physics parameters.
 *
 * @param {Object} props
 * @param {string} props.label - Display label for the parameter.
 * @param {number} props.value - Current value (controlled by parent).
 * @param {function} props.onChange - Callback when value changes: (newValue: number) => void.
 * @param {number} props.min - Minimum allowed value.
 * @param {number} props.max - Maximum allowed value.
 * @param {number} [props.step=0.1] - Step increment for the slider.
 * @param {string} [props.unit=''] - Unit string displayed after the value (e.g., " kg").
 * @param {boolean} [props.disabled=false] - Whether the input is disabled.
 * @param {boolean} [props.highlight=false] - Orange highlight when being "solved for".
 * @param {string} [props.note=''] - Small helper text below the input.
 * @param {number} [props.precision=2] - Decimal places for display formatting.
 * @param {string} [props.className=''] - Additional CSS classes.
 */
function ParamSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  unit = '',
  disabled = false,
  highlight = false,
  note = '',
  precision = 2,
  className = '',
}) {
  // ─── Local state for text input ─────────────────────────────
  // This allows the user to type freely (including "-", "3.", empty)
  // without the parent's numeric state interfering mid-edit.
  const [localValue, setLocalValue] = useState(String(value));

  // Track whether the text input is currently focused to prevent
  // external updates from overwriting the user's typing.
  const isFocusedRef = useRef(false);

  // ─── Sync local value when parent value changes externally ──
  // Only sync when the input is NOT focused (to avoid fighting
  // the user's typing with external updates from solvers).
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(formatDisplay(value, precision));
    }
  }, [value, precision]);

  // ─── Slider change handler ──────────────────────────────────
  const handleSliderChange = useCallback(
    (e) => {
      const parsed = parseFloat(e.target.value);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    },
    [onChange]
  );

  // ─── Text input change handler ──────────────────────────────
  // Update local state freely. Only propagate to parent if the
  // parsed value is a valid number within range.
  const handleTextChange = useCallback(
    (e) => {
      const raw = e.target.value;
      setLocalValue(raw);

      // Attempt to parse and propagate valid values immediately
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed >= min && parsed <= max) {
        onChange(parsed);
      }
    },
    [onChange, min, max]
  );

  // ─── Text input blur handler ────────────────────────────────
  // On blur, validate, clamp, round, and sync everything.
  const handleTextBlur = useCallback(() => {
    isFocusedRef.current = false;

    let parsed = parseFloat(localValue);

    // If invalid or empty, reset to min
    if (isNaN(parsed)) {
      parsed = min;
    }

    // Clamp to range
    parsed = Math.max(min, Math.min(max, parsed));

    // Round to precision
    const factor = Math.pow(10, precision);
    parsed = Math.round(parsed * factor) / factor;

    // Update parent
    onChange(parsed);

    // Sync local display
    setLocalValue(formatDisplay(parsed, precision));
  }, [localValue, min, max, precision, onChange]);

  // ─── Text input focus handler ───────────────────────────────
  const handleTextFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  // ─── Text input keydown handler ─────────────────────────────
  const handleTextKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.target.blur(); // triggers handleTextBlur
      }
    },
    []
  );

  // ─── Formatted display value for the header ─────────────────
  const displayValue = formatDisplay(value, precision);

  // ─── Slider fill percentage for visual feedback ─────────────
  const fillPercent = ((value - min) / (max - min)) * 100;

  return (
    <div
      className={`mb-4 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
    >
      {/* ── Label row ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-gray-700 select-none">
          {label}
          {highlight && (
            <span className="ml-1.5 text-[11px] text-orange-500 font-bold">
              (solving)
            </span>
          )}
        </label>
        <span className="text-sm font-mono text-indigo-700 font-bold">
          {displayValue}
          {unit}
        </span>
      </div>

      {/* ── Range slider ───────────────────────────────────────── */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        disabled={disabled}
        className={`
          w-full h-2 rounded-lg appearance-none cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-offset-1
          ${highlight
            ? 'bg-orange-100 focus:ring-orange-400'
            : 'bg-indigo-100 focus:ring-indigo-500'
          }
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:duration-150
          [&::-webkit-slider-thumb]:hover:scale-110
          ${highlight
            ? '[&::-webkit-slider-thumb]:bg-orange-500'
            : '[&::-webkit-slider-thumb]:bg-indigo-600'
          }
          [&::-moz-range-thumb]:appearance-none
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:shadow-md
          [&::-moz-range-thumb]:cursor-pointer
          ${highlight
            ? '[&::-moz-range-thumb]:bg-orange-500'
            : '[&::-moz-range-thumb]:bg-indigo-600'
          }
          [&::-moz-range-track]:bg-transparent
        `}
      />

      {/* ── Text input ─────────────────────────────────────────── */}
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        onFocus={handleTextFocus}
        onKeyDown={handleTextKeyDown}
        disabled={disabled}
        className={`
          w-full mt-1.5 px-3 py-1.5 text-sm font-mono
          border rounded-lg
          transition-colors duration-150
          focus:outline-none focus:ring-2
          ${highlight
            ? 'border-orange-300 focus:ring-orange-400 focus:border-orange-400'
            : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
          }
          disabled:bg-gray-100 disabled:cursor-not-allowed
        `}
      />

      {/* ── Note text ──────────────────────────────────────────── */}
      {note && (
        <p className="text-[11px] text-gray-400 mt-1 leading-tight">
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * Format a numeric value for display with the specified precision.
 * Returns a string with exactly `precision` decimal places.
 *
 * @param {number} val - The numeric value.
 * @param {number} precision - Number of decimal places.
 * @returns {string}
 */
function formatDisplay(val, precision) {
  if (typeof val !== 'number' || isNaN(val)) return '0';
  return val.toFixed(precision);
}

ParamSlider.propTypes = {
  /** Display label for the parameter, e.g., "Mass (m)" */
  label: PropTypes.string.isRequired,

  /** Current numeric value (controlled by parent) */
  value: PropTypes.number.isRequired,

  /** Callback fired when the value changes: (newValue: number) => void */
  onChange: PropTypes.func.isRequired,

  /** Minimum allowed value */
  min: PropTypes.number.isRequired,

  /** Maximum allowed value */
  max: PropTypes.number.isRequired,

  /** Step increment for the range slider. Default: 0.1 */
  step: PropTypes.number,

  /** Unit string displayed after the value, e.g., " kg", " m/s", "°". Default: '' */
  unit: PropTypes.string,

  /** Whether the input is disabled. Default: false */
  disabled: PropTypes.bool,

  /** Orange highlight when this parameter is being solved for. Default: false */
  highlight: PropTypes.bool,

  /** Small helper text displayed below the input. Default: '' */
  note: PropTypes.string,

  /** Number of decimal places for display formatting. Default: 2 */
  precision: PropTypes.number,

  /** Additional CSS classes for the wrapper div */
  className: PropTypes.string,
};

ParamSlider.defaultProps = {
  step: 0.1,
  unit: '',
  disabled: false,
  highlight: false,
  note: '',
  precision: 2,
  className: '',
};

export default ParamSlider;