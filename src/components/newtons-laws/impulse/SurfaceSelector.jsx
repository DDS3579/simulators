/**
 * @module SurfaceSelector
 *
 * @description
 * A UI component for selecting the collision surface type in the
 * Impulse-Momentum simulator. Displays a grid of selectable surface cards,
 * each showing an icon, name, and collision duration (Δt). When 'custom'
 * is selected, a ParamSlider appears for manually setting the collision time.
 *
 * The surface type determines the collision duration, which directly affects
 * the average and peak forces for the same impulse — this is the core
 * concept of the impulse-momentum theorem.
 *
 * @purpose
 * Surface selection is the primary experimental variable in the impulse
 * simulator. Students change surfaces to see how the same momentum change
 * produces different forces depending on collision duration. The visual
 * cards with Δt values make this comparison immediately accessible.
 *
 * @dependents
 * - ImpulseMomentum.jsx (renders in the left control panel)
 *
 * @example
 * ```jsx
 * import SurfaceSelector from './SurfaceSelector';
 *
 * <SurfaceSelector
 *   selected="wood"
 *   onSelect={setSurfaceType}
 *   customTime={0.05}
 *   onCustomTimeChange={setCustomTime}
 * />
 * ```
 */

import { useCallback } from 'react';
import PropTypes from 'prop-types';
import ParamSlider from '../shared/ParamSlider';

// ─── Surface Data ─────────────────────────────────────────────────

const SURFACES = [
  {
    id: 'concrete',
    label: 'Concrete',
    icon: '🧱',
    time: 0.005,
    desc: 'Very hard, very short contact',
    forceLevel: 'Extreme force',
    forceBadge: 'bg-red-100 text-red-700',
  },
  {
    id: 'wood',
    label: 'Wood',
    icon: '🪵',
    time: 0.02,
    desc: 'Hard surface, brief contact',
    forceLevel: 'High force',
    forceBadge: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'foam',
    label: 'Foam',
    icon: '🧽',
    time: 0.08,
    desc: 'Soft, absorbs impact',
    forceLevel: 'Moderate force',
    forceBadge: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'trampoline',
    label: 'Trampoline',
    icon: '🤸',
    time: 0.2,
    desc: 'Very soft, long contact',
    forceLevel: 'Low force',
    forceBadge: 'bg-green-100 text-green-700',
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: '⚙️',
    time: null,
    desc: 'Set your own Δt',
    forceLevel: 'Variable',
    forceBadge: 'bg-purple-100 text-purple-700',
  },
];

/**
 * Get the collision time for a surface type.
 * Exported so the parent can access it.
 *
 * @param {string} surfaceId
 * @param {number} [customTime=0.05]
 * @returns {number} Collision duration in seconds
 */
export function getSurfaceTime(surfaceId, customTime = 0.05) {
  if (surfaceId === 'custom') return customTime;
  const surface = SURFACES.find((s) => s.id === surfaceId);
  return surface ? surface.time : 0.02;
}

/**
 * SurfaceSelector — Grid of surface cards with optional custom Δt slider.
 *
 * @param {Object} props
 * @param {string} props.selected - Currently selected surface id
 * @param {function} props.onSelect - Callback: (surfaceType: string) => void
 * @param {number} [props.customTime=0.05] - Custom Δt value (when selected='custom')
 * @param {function} [props.onCustomTimeChange] - Callback: (value: number) => void
 * @param {boolean} [props.disabled=false] - Disable all controls
 * @param {string} [props.className=''] - Additional CSS classes
 */
function SurfaceSelector({
  selected,
  onSelect,
  customTime = 0.05,
  onCustomTimeChange,
  disabled = false,
  className = '',
}) {
  const handleSelect = useCallback(
    (surfaceId) => {
      if (!disabled) {
        onSelect(surfaceId);
      }
    },
    [disabled, onSelect]
  );

  // Current collision time for display
  const currentTime = getSurfaceTime(selected, customTime);

  return (
    <div className={`${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      {/* ── Section header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
          <span className="text-sm" aria-hidden="true">🎯</span>
          Surface Type
        </h3>
        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
          Δt = {formatCollisionTime(currentTime)}
        </span>
      </div>

      {/* ── Surface cards grid ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        {SURFACES.map((surface) => {
          const isSelected = selected === surface.id;

          return (
            <button
              key={surface.id}
              onClick={() => handleSelect(surface.id)}
              disabled={disabled}
              className={`
                relative flex flex-col items-center gap-0.5
                p-2.5 rounded-lg border-2
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400
                ${isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                  : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100'
                }
              `}
              aria-pressed={isSelected}
              aria-label={`Select ${surface.label} surface${surface.time ? ` with Δt = ${surface.time}s` : ''}`}
            >
              {/* Icon */}
              <span className="text-2xl" aria-hidden="true">
                {surface.icon}
              </span>

              {/* Label */}
              <span
                className={`
                  text-xs font-bold
                  ${isSelected ? 'text-indigo-700' : 'text-gray-700'}
                `}
              >
                {surface.label}
              </span>

              {/* Collision time */}
              {surface.time !== null ? (
                <span
                  className={`
                    text-[9px] font-mono
                    ${isSelected ? 'text-indigo-500' : 'text-gray-400'}
                  `}
                >
                  Δt = {formatCollisionTime(surface.time)}
                </span>
              ) : (
                <span
                  className={`
                    text-[9px] font-mono
                    ${isSelected ? 'text-indigo-500' : 'text-gray-400'}
                  `}
                >
                  Δt = custom
                </span>
              )}

              {/* Force level badge */}
              <span
                className={`
                  text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-0.5
                  ${isSelected ? surface.forceBadge : 'bg-gray-100 text-gray-400'}
                `}
              >
                {surface.forceLevel}
              </span>

              {/* Selected indicator dot */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Description for selected surface ───────────────────── */}
      <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 border border-gray-100">
        <p className="text-[11px] text-gray-500 leading-tight">
          <span className="font-bold text-gray-600">
            {SURFACES.find((s) => s.id === selected)?.label}:
          </span>
          {' '}
          {SURFACES.find((s) => s.id === selected)?.desc}
        </p>
      </div>

      {/* ── Custom time slider (only for custom surface) ────────── */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${selected === 'custom' ? 'max-h-[120px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <ParamSlider
          label="Collision Time (Δt)"
          value={customTime}
          onChange={onCustomTimeChange || (() => {})}
          min={0.001}
          max={0.5}
          step={0.001}
          unit=" s"
          precision={3}
          disabled={disabled || selected !== 'custom'}
          note="Shorter time = higher force for same impulse"
        />
      </div>

      {/* ── Visual comparison bar ──────────────────────────────── */}
      <div className="mt-1">
        <label className="block text-[10px] font-semibold text-gray-400 mb-1 select-none">
          Collision Duration Comparison
        </label>
        <div className="space-y-1">
          {SURFACES.filter((s) => s.time !== null).map((surface) => {
            const isActive = selected === surface.id;
            const maxTime = 0.2; // trampoline is the longest preset
            const barWidth = Math.min(100, (surface.time / maxTime) * 100);

            return (
              <div key={surface.id} className="flex items-center gap-2">
                <span
                  className={`
                    text-[9px] w-16 text-right flex-shrink-0
                    ${isActive ? 'font-bold text-indigo-600' : 'text-gray-400'}
                  `}
                >
                  {surface.label}
                </span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`
                      h-full rounded-full transition-all duration-300
                      ${isActive ? 'bg-indigo-500' : 'bg-gray-300'}
                    `}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span
                  className={`
                    text-[8px] font-mono w-12 flex-shrink-0
                    ${isActive ? 'font-bold text-indigo-600' : 'text-gray-400'}
                  `}
                >
                  {formatCollisionTime(surface.time)}
                </span>
              </div>
            );
          })}

          {/* Custom bar (only when custom is selected) */}
          {selected === 'custom' && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] w-16 text-right flex-shrink-0 font-bold text-purple-600">
                Custom
              </span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (customTime / 0.2) * 100)}%` }}
                />
              </div>
              <span className="text-[8px] font-mono w-12 flex-shrink-0 font-bold text-purple-600">
                {formatCollisionTime(customTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Key insight ────────────────────────────────────────── */}
      <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        <p className="text-[10px] text-emerald-700 leading-tight">
          <span className="font-bold">💡 Key Insight:</span> Same impulse (Δp) for all surfaces.
          Longer contact time → lower force. This is why helmets and airbags work!
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Format a collision time for display with appropriate units.
 *
 * @param {number} time - Time in seconds
 * @returns {string} Formatted string
 */
function formatCollisionTime(time) {
  if (time === null || time === undefined) return '—';
  if (time >= 1) return `${time.toFixed(2)}s`;
  if (time >= 0.001) return `${(time * 1000).toFixed(1)}ms`;
  return `${(time * 1000000).toFixed(0)}μs`;
}

// ─── PropTypes ────────────────────────────────────────────────────

SurfaceSelector.propTypes = {
  /** Currently selected surface id: 'concrete' | 'wood' | 'foam' | 'trampoline' | 'custom' */
  selected: PropTypes.string.isRequired,

  /** Surface selection callback: (surfaceType: string) => void */
  onSelect: PropTypes.func.isRequired,

  /** Custom collision time in seconds. Only used when selected='custom'.
   *  Default: 0.05 */
  customTime: PropTypes.number,

  /** Custom time change callback: (value: number) => void */
  onCustomTimeChange: PropTypes.func,

  /** Disable all controls. Default: false */
  disabled: PropTypes.bool,

  /** Additional CSS classes for the wrapper div */
  className: PropTypes.string,
};

SurfaceSelector.defaultProps = {
  customTime: 0.05,
  onCustomTimeChange: undefined,
  disabled: false,
  className: '',
};

export default SurfaceSelector;