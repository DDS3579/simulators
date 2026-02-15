/**
 * @module FrictionControls
 *
 * @description
 * A React UI panel that controls all friction-related settings for the Newton's
 * Second Law simulator. Provides an enable/disable toggle, static and kinetic
 * friction coefficient sliders, surface material presets (ice, wood, rubber),
 * a μk > μs warning, and an optional critical angle display.
 *
 * When friction is disabled, the coefficient sliders collapse with a smooth
 * animation, and the panel shows a brief explanation of frictionless surfaces.
 *
 * Uses the shared ParamSlider component from Phase 1 for the coefficient inputs.
 *
 * @purpose
 * Friction settings are complex enough to warrant their own panel. Extracting
 * them keeps SecondLawSimulator.jsx focused on orchestration and makes the
 * friction UI reusable if other simulators need friction controls.
 *
 * @dependents
 * - SecondLawSimulator.jsx (renders in the left control panel)
 *
 * @example
 * ```jsx
 * import FrictionControls from './FrictionControls';
 *
 * <FrictionControls
 *   frictionEnabled={true}
 *   onFrictionToggle={setFrictionEnabled}
 *   muStatic={0.3}
 *   onMuStaticChange={setMuStatic}
 *   muKinetic={0.2}
 *   onMuKineticChange={setMuKinetic}
 *   criticalAngle={16.7}
 * />
 * ```
 */

import { useCallback } from 'react';
import PropTypes from 'prop-types';
import ParamSlider from '../shared/ParamSlider';

// ─── Surface Presets ──────────────────────────────────────────────
const SURFACE_PRESETS = [
  { name: 'Ice', emoji: '🧊', muS: 0.03, muK: 0.01 },
  { name: 'Wood', emoji: '🪵', muS: 0.4, muK: 0.2 },
  { name: 'Rubber', emoji: '🛞', muS: 0.9, muK: 0.7 },
];

/**
 * FrictionControls — Panel for controlling friction parameters.
 *
 * @param {Object} props
 * @param {boolean} props.frictionEnabled - Whether friction is active
 * @param {function} props.onFrictionToggle - (enabled: boolean) => void
 * @param {number} props.muStatic - Static friction coefficient
 * @param {function} props.onMuStaticChange - (value: number) => void
 * @param {number} props.muKinetic - Kinetic friction coefficient
 * @param {function} props.onMuKineticChange - (value: number) => void
 * @param {boolean} [props.disabled=false] - Disable all controls
 * @param {number} [props.criticalAngle] - Critical angle in degrees
 * @param {string} [props.className=''] - Additional CSS classes
 */
function FrictionControls({
  frictionEnabled,
  onFrictionToggle,
  muStatic,
  onMuStaticChange,
  muKinetic,
  onMuKineticChange,
  disabled = false,
  criticalAngle,
  className = '',
}) {
  // ─── Handlers ──────────────────────────────────────────────

  const handleToggle = useCallback(() => {
    if (!disabled) {
      onFrictionToggle(!frictionEnabled);
    }
  }, [disabled, frictionEnabled, onFrictionToggle]);

  const handlePreset = useCallback(
    (preset) => {
      if (disabled) return;
      onMuStaticChange(preset.muS);
      onMuKineticChange(preset.muK);
    },
    [disabled, onMuStaticChange, onMuKineticChange]
  );

  // ─── Derived state ─────────────────────────────────────────
  const showMuWarning = frictionEnabled && muKinetic > muStatic;

  return (
    <div
      className={`${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
    >
      {/* ── Section header with toggle ─────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm" aria-hidden="true">✋</span>
          <h3 className="text-sm font-bold text-gray-700">
            Surface Friction
          </h3>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={frictionEnabled}
          aria-label="Toggle surface friction"
          onClick={handleToggle}
          disabled={disabled}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400
            ${frictionEnabled
              ? 'bg-indigo-600'
              : 'bg-gray-300'
            }
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 rounded-full bg-white shadow-sm
              transform transition-transform duration-200 ease-in-out
              ${frictionEnabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* ── Status text ────────────────────────────────────────── */}
      <div
        className={`
          text-xs rounded-lg px-3 py-2 mb-3 transition-colors duration-200
          ${frictionEnabled
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-gray-50 text-gray-500 border border-gray-200'
          }
        `}
      >
        {frictionEnabled ? (
          <span>
            Friction <span className="font-bold">enabled</span> — the surface resists motion
          </span>
        ) : (
          <span>
            Friction <span className="font-bold">disabled</span> — ideal frictionless surface (Newton&apos;s 1st Law!)
          </span>
        )}
      </div>

      {/* ── Collapsible friction controls ──────────────────────── */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${frictionEnabled ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        {/* μs slider */}
        <ParamSlider
          label="Static Coefficient (μₛ)"
          value={muStatic}
          onChange={onMuStaticChange}
          min={0}
          max={1}
          step={0.01}
          unit=""
          precision={2}
          disabled={disabled}
          note="How hard it is to START moving"
        />

        {/* μk slider */}
        <ParamSlider
          label="Kinetic Coefficient (μₖ)"
          value={muKinetic}
          onChange={onMuKineticChange}
          min={0}
          max={1}
          step={0.01}
          unit=""
          precision={2}
          disabled={disabled}
          note="Resistance WHILE moving"
        />

        {/* μk > μs warning */}
        {showMuWarning && (
          <div className="flex items-start gap-1.5 px-2 py-1.5 mb-3 bg-orange-50 border border-orange-200 rounded-lg">
            <span className="text-orange-500 text-xs mt-0.5 flex-shrink-0">⚠️</span>
            <p className="text-[11px] text-orange-600 leading-tight">
              Usually <span className="font-mono font-bold">μₖ ≤ μₛ</span> — kinetic friction
              is typically less than static friction. This setup is unusual but allowed for exploration.
            </p>
          </div>
        )}

        {/* Surface presets */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 select-none">
            Surface Presets
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {SURFACE_PRESETS.map((preset) => {
              const isActive =
                Math.abs(muStatic - preset.muS) < 0.005 &&
                Math.abs(muKinetic - preset.muK) < 0.005;

              return (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  disabled={disabled}
                  className={`
                    flex flex-col items-center gap-0.5
                    py-2 px-1 rounded-lg text-xs font-bold
                    transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400
                    ${isActive
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                    }
                  `}
                  aria-label={`Set surface to ${preset.name}: μs=${preset.muS}, μk=${preset.muK}`}
                  aria-pressed={isActive}
                >
                  <span className="text-base" aria-hidden="true">{preset.emoji}</span>
                  <span>{preset.name}</span>
                  <span
                    className={`
                      text-[9px] font-mono font-normal
                      ${isActive ? 'text-indigo-200' : 'text-gray-400'}
                    `}
                  >
                    {preset.muS}/{preset.muK}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coefficient comparison bar */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1 select-none">
            Coefficient Comparison
          </label>
          <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
            {/* μk bar */}
            <div
              className="absolute top-0 left-0 h-full bg-amber-400 rounded-full transition-all duration-200"
              style={{ width: `${Math.min(100, muKinetic * 100)}%` }}
            />
            {/* μs bar (taller indicator line) */}
            <div
              className="absolute top-0 h-full w-0.5 bg-indigo-600 transition-all duration-200"
              style={{ left: `${Math.min(100, muStatic * 100)}%` }}
            />
            {/* Labels */}
            <div className="absolute inset-0 flex items-center justify-between px-2">
              <span className="text-[9px] font-bold text-amber-700 relative z-10">
                μₖ = {muKinetic.toFixed(2)}
              </span>
              <span className="text-[9px] font-bold text-indigo-700 relative z-10">
                μₛ = {muStatic.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[9px] text-gray-400">0</span>
            <span className="text-[9px] text-gray-400">1</span>
          </div>
        </div>

        {/* Critical angle display */}
        {typeof criticalAngle === 'number' && criticalAngle > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs" aria-hidden="true">📐</span>
                <span className="text-xs font-semibold text-indigo-700">
                  Critical Angle
                </span>
              </div>
              <span className="text-sm font-bold font-mono text-indigo-600">
                θ<sub className="text-[9px]">c</sub> = {criticalAngle.toFixed(1)}°
              </span>
            </div>
            <p className="text-[10px] text-indigo-500 mt-1 leading-tight">
              At this angle, a block on an incline will just begin to slide.
              tan(θ<sub>c</sub>) = μₛ = {muStatic.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

FrictionControls.propTypes = {
  /** Whether surface friction is active */
  frictionEnabled: PropTypes.bool.isRequired,

  /** Toggle friction callback: (enabled: boolean) => void */
  onFrictionToggle: PropTypes.func.isRequired,

  /** Static friction coefficient (0 to 1) */
  muStatic: PropTypes.number.isRequired,

  /** Static coefficient change callback: (value: number) => void */
  onMuStaticChange: PropTypes.func.isRequired,

  /** Kinetic friction coefficient (0 to 1) */
  muKinetic: PropTypes.number.isRequired,

  /** Kinetic coefficient change callback: (value: number) => void */
  onMuKineticChange: PropTypes.func.isRequired,

  /** Disable all controls (e.g., during simulation). Default: false */
  disabled: PropTypes.bool,

  /** Critical angle in degrees where block starts sliding on incline.
   *  Calculated as arctan(μs). Shown when provided. */
  criticalAngle: PropTypes.number,

  /** Additional CSS classes for the wrapper div */
  className: PropTypes.string,
};

FrictionControls.defaultProps = {
  disabled: false,
  criticalAngle: undefined,
  className: '',
};

export default FrictionControls;