/**
 * @module PlaybackControls
 *
 * @description
 * A self-contained playback control bar with Play/Pause, Reset, Skip-to-End,
 * speed selector buttons, and an optional progress bar. Designed to connect
 * directly to the `useAnimationLoop` hook's control functions.
 *
 * The component is stateless — all state (isRunning, speed, time) is passed
 * in as props from the parent, and all actions (play/pause, reset, speed change)
 * are delegated to parent callbacks. This makes it a pure presentational component
 * that can be reused with any animation system.
 *
 * @purpose
 * Every simulator has the same playback UI: play/pause, reset, speed selector,
 * and progress indicator. This component prevents duplicating 50+ lines of
 * button markup, icon imports, and conditional styling across 5 simulators.
 *
 * @dependents
 * - SecondLawSimulator
 * - ImpulseMomentumSimulator
 * - MomentumConservationSimulator
 * - ApparentWeightSimulator
 * - RelativeVelocitySimulator
 *
 * @example
 * ```jsx
 * import PlaybackControls from './shared/PlaybackControls';
 * import { useAnimationLoop } from '@/hooks/newtons-laws/useAnimationLoop';
 *
 * function MySimulator() {
 *   const {
 *     time, isRunning, speed,
 *     togglePlayPause, reset, setSpeed, skipTo,
 *   } = useAnimationLoop({
 *     onTick: handleTick,
 *     maxTime: 10,
 *   });
 *
 *   return (
 *     <PlaybackControls
 *       isRunning={isRunning}
 *       onPlayPause={togglePlayPause}
 *       onReset={reset}
 *       onSkipToEnd={() => skipTo(10)}
 *       speed={speed}
 *       onSpeedChange={setSpeed}
 *       speedOptions={[0.25, 0.5, 1, 2, 4]}
 *       time={time}
 *       maxTime={10}
 *       showProgress
 *     />
 *   );
 * }
 * ```
 */

import PropTypes from 'prop-types';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

// ─── Default speed options ────────────────────────────────────────
const DEFAULT_SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];

/**
 * PlaybackControls — Playback control bar for physics simulators.
 *
 * @param {Object} props
 * @param {boolean} props.isRunning - Whether the animation is currently playing.
 * @param {function} props.onPlayPause - Toggle play/pause callback.
 * @param {function} props.onReset - Reset callback.
 * @param {function} [props.onSkipToEnd] - Skip to end callback. Button hidden if not provided.
 * @param {number} props.speed - Current playback speed multiplier.
 * @param {function} props.onSpeedChange - Speed change callback: (speed: number) => void.
 * @param {number[]} [props.speedOptions] - Available speed multipliers.
 * @param {number} [props.time=0] - Current simulation time for progress bar.
 * @param {number} [props.maxTime=0] - Total simulation duration for progress bar.
 * @param {boolean} [props.showProgress=true] - Whether to show the progress bar.
 * @param {boolean} [props.disabled=false] - Disable all controls.
 * @param {string} [props.className=''] - Additional CSS classes.
 */
function PlaybackControls({
  isRunning,
  onPlayPause,
  onReset,
  onSkipToEnd,
  speed,
  onSpeedChange,
  speedOptions = DEFAULT_SPEED_OPTIONS,
  time = 0,
  maxTime = 0,
  showProgress = true,
  disabled = false,
  className = '',
}) {
  // ─── Determine play button label ────────────────────────────
  const getPlayButtonLabel = () => {
    if (isRunning) return 'Pause';
    if (time > 0 && maxTime > 0 && time < maxTime) return 'Resume';
    return 'Launch';
  };

  // ─── Progress percentage ────────────────────────────────────
  const progressPercent = maxTime > 0
    ? Math.min(100, (time / maxTime) * 100)
    : 0;

  // ─── Whether simulation is complete ─────────────────────────
  const isComplete = maxTime > 0 && time >= maxTime;

  return (
    <div
      className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
    >
      {/* ── Speed Selector ─────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 select-none">
          Speed: {formatSpeed(speed)}×
        </label>
        <div className="flex gap-1.5">
          {speedOptions.map((s) => {
            const isActive = s === speed;
            return (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                disabled={disabled}
                className={`
                  flex-1 py-1.5 rounded-md text-xs font-bold
                  transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                  }
                `}
                aria-label={`Set speed to ${s}x`}
                aria-pressed={isActive}
              >
                {formatSpeed(s)}×
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Controls (Play/Pause + Reset) ─────────────────── */}
      <div className="flex gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={onPlayPause}
          disabled={disabled || isComplete}
          className={`
            flex-1 flex items-center justify-center gap-2
            py-3 rounded-lg
            font-bold text-sm text-white
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-1
            ${disabled || isComplete
              ? 'bg-gray-300 cursor-not-allowed shadow-none'
              : isRunning
                ? 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 shadow-md shadow-amber-200 focus:ring-amber-400'
                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-md shadow-indigo-200 focus:ring-indigo-400'
            }
          `}
          aria-label={isRunning ? 'Pause simulation' : 'Play simulation'}
        >
          {isRunning ? (
            <Pause size={18} strokeWidth={2.5} />
          ) : (
            <Play size={18} fill="currentColor" strokeWidth={0} />
          )}
          {getPlayButtonLabel()}
        </button>

        {/* Reset Button */}
        <button
          onClick={onReset}
          disabled={disabled}
          className={`
            flex items-center justify-center
            py-3 px-4 rounded-lg
            text-white font-bold
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400
            ${disabled
              ? 'bg-gray-300 cursor-not-allowed shadow-none'
              : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800 shadow-md shadow-gray-200'
            }
          `}
          aria-label="Reset simulation"
        >
          <RotateCcw size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Skip to End Button ─────────────────────────────────── */}
      {onSkipToEnd && (
        <button
          onClick={onSkipToEnd}
          disabled={disabled || isRunning || isComplete}
          className={`
            w-full flex items-center justify-center gap-2
            py-2.5 rounded-lg
            text-sm font-bold
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-400
            ${disabled || isRunning || isComplete
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-md shadow-purple-200'
            }
          `}
          aria-label="Skip to end of simulation"
        >
          <SkipForward size={16} strokeWidth={2.5} />
          Skip to End
        </button>
      )}

      {/* ── Progress Bar ───────────────────────────────────────── */}
      {showProgress && maxTime > 0 && (
        <div>
          {/* Time labels */}
          <div className="flex justify-between text-xs text-gray-500 mb-1 font-mono select-none">
            <span>t = {formatTime(time)}s</span>
            <span>T = {formatTime(maxTime)}s</span>
          </div>

          {/* Progress track */}
          <div
            className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Simulation progress: ${progressPercent.toFixed(0)}%`}
          >
            <div
              className={`
                h-full rounded-full
                transition-all duration-100 ease-linear
                ${isComplete
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                }
              `}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Completion indicator */}
          {isComplete && (
            <p className="text-xs text-green-600 font-semibold mt-1 text-center">
              ✓ Simulation Complete
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Format a speed multiplier for display.
 * Removes unnecessary trailing zeros (e.g., 1.0 → "1", 0.50 → "0.5").
 *
 * @param {number} s - Speed multiplier.
 * @returns {string}
 */
function formatSpeed(s) {
  if (Number.isInteger(s)) return String(s);
  // Remove trailing zeros from decimal
  return parseFloat(s.toFixed(2)).toString();
}

/**
 * Format a time value for display with 2 decimal places.
 *
 * @param {number} t - Time in seconds.
 * @returns {string}
 */
function formatTime(t) {
  if (typeof t !== 'number' || isNaN(t)) return '0.00';
  return t.toFixed(2);
}

PlaybackControls.propTypes = {
  /** Whether the animation is currently playing */
  isRunning: PropTypes.bool.isRequired,

  /** Toggle play/pause callback: () => void */
  onPlayPause: PropTypes.func.isRequired,

  /** Reset callback: () => void */
  onReset: PropTypes.func.isRequired,

  /** Skip to end callback: () => void. Button is hidden if not provided. */
  onSkipToEnd: PropTypes.func,

  /** Current playback speed multiplier */
  speed: PropTypes.number.isRequired,

  /** Speed change callback: (speed: number) => void */
  onSpeedChange: PropTypes.func.isRequired,

  /** Array of available speed multipliers. Default: [0.25, 0.5, 1, 2, 4] */
  speedOptions: PropTypes.arrayOf(PropTypes.number),

  /** Current simulation time in seconds (for progress bar). Default: 0 */
  time: PropTypes.number,

  /** Total simulation duration in seconds (for progress bar). Default: 0 */
  maxTime: PropTypes.number,

  /** Whether to show the progress bar. Default: true */
  showProgress: PropTypes.bool,

  /** Disable all controls. Default: false */
  disabled: PropTypes.bool,

  /** Additional CSS classes for the wrapper div */
  className: PropTypes.string,
};

PlaybackControls.defaultProps = {
  onSkipToEnd: null,
  speedOptions: DEFAULT_SPEED_OPTIONS,
  time: 0,
  maxTime: 0,
  showProgress: true,
  disabled: false,
  className: '',
};

export default PlaybackControls;