/**
 * @module MomentumBar
 *
 * @description
 * A horizontal bar visualization showing momentum magnitude and direction.
 * The bar extends leftward for negative momentum and rightward for positive
 * momentum from a center zero-point, providing an intuitive directional
 * representation.
 *
 * Used by both the Impulse-Momentum and Conservation of Momentum simulators
 * to display individual object momentum, system total momentum, and
 * before/after comparisons.
 *
 * @purpose
 * Momentum is a signed quantity — students need to see both magnitude AND
 * direction simultaneously. A centered bar with left/right extension makes
 * the sign convention immediately visual. Multiple bars with the same
 * maxValue scale allow direct comparison.
 *
 * @dependents
 * - MomentumDisplay.jsx (renders multiple bars for before/after comparison)
 * - ImpulseMomentum.jsx (shows before/after momentum)
 * - MomentumConservation.jsx (shows individual + total momentum)
 *
 * @example
 * ```jsx
 * import MomentumBar from '../shared/MomentumBar';
 *
 * // Positive momentum (rightward)
 * <MomentumBar label="Object 1" value={15} maxValue={20} color="#6366f1" />
 *
 * // Negative momentum (leftward)
 * <MomentumBar label="Object 2" value={-6} maxValue={20} color="#f59e0b" />
 *
 * // Zero momentum
 * <MomentumBar label="Total" value={0} maxValue={20} color="#8b5cf6" />
 *
 * // Multiple bars sharing same scale for visual comparison
 * const maxP = Math.max(Math.abs(p1), Math.abs(p2), Math.abs(pTotal), 1);
 * <MomentumBar label="p₁" value={p1} maxValue={maxP} color="#6366f1" />
 * <MomentumBar label="p₂" value={p2} maxValue={maxP} color="#f59e0b" />
 * <MomentumBar label="p_total" value={pTotal} maxValue={maxP} color="#8b5cf6" />
 * ```
 */

import PropTypes from 'prop-types';

// ─── Size Variant Configs ─────────────────────────────────────────

const sizeConfig = {
  sm: {
    barHeight: 'h-1.5',
    labelText: 'text-[10px]',
    valueText: 'text-[10px]',
    padding: 'py-1.5 px-2.5',
    arrowSize: 'text-[9px]',
    gap: 'gap-1',
  },
  md: {
    barHeight: 'h-2.5',
    labelText: 'text-xs',
    valueText: 'text-xs',
    padding: 'py-2 px-3',
    arrowSize: 'text-[10px]',
    gap: 'gap-1.5',
  },
  lg: {
    barHeight: 'h-3.5',
    labelText: 'text-sm',
    valueText: 'text-sm',
    padding: 'py-2.5 px-3.5',
    arrowSize: 'text-xs',
    gap: 'gap-2',
  },
};

/**
 * MomentumBar — Horizontal bar showing momentum magnitude and direction.
 *
 * @param {Object} props
 * @param {string} props.label - Display label (e.g., "Object 1", "Total")
 * @param {number} props.value - Momentum in kg·m/s (positive=right, negative=left)
 * @param {number} [props.maxValue] - Maximum |momentum| for scaling. If omitted, bar fills to 50%.
 * @param {string} [props.color='#6366f1'] - Bar fill CSS color
 * @param {boolean} [props.showValue=true] - Show numeric value
 * @param {boolean} [props.showDirection=true] - Show direction arrow indicator
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Height variant
 * @param {boolean} [props.animated=true] - Smooth width transitions
 * @param {string} [props.className=''] - Additional CSS classes
 */
function MomentumBar({
  label,
  value,
  maxValue,
  color = '#6366f1',
  showValue = true,
  showDirection = true,
  size = 'md',
  animated = true,
  className = '',
}) {
  const config = sizeConfig[size] || sizeConfig.md;

  // ─── Calculate bar geometry ────────────────────────────────
  const absValue = Math.abs(value);
  const effectiveMax = maxValue && maxValue > 0 ? maxValue : Math.max(absValue, 0.01);

  // Bar width as percentage of half the track (50% = full scale to one side)
  const barWidthPercent = Math.min((absValue / effectiveMax) * 50, 50);

  const isPositive = value >= 0;
  const isZero = absValue < 0.001;

  // ─── Format value ──────────────────────────────────────────
  const formattedValue = formatMomentum(value);

  // ─── Direction arrow ───────────────────────────────────────
  const directionArrow = isZero ? '·' : isPositive ? '►' : '◄';

  return (
    <div className={`${config.padding} ${className}`}>
      {/* ── Top row: label + value ────────────────────────────── */}
      <div className={`flex items-center justify-between mb-1 ${config.gap}`}>
        {/* Label with optional direction arrow */}
        <div className={`flex items-center gap-1 ${config.labelText} font-semibold text-gray-600`}>
          <span className="truncate">{label}</span>
          {showDirection && !isZero && (
            <span
              className={`${config.arrowSize} font-bold flex-shrink-0`}
              style={{ color }}
            >
              {directionArrow}
            </span>
          )}
        </div>

        {/* Numeric value */}
        {showValue && (
          <span
            className={`${config.valueText} font-bold font-mono flex-shrink-0`}
            style={{ color: isZero ? '#94a3b8' : color }}
          >
            {formattedValue}
            <span className="text-gray-400 font-normal ml-0.5">kg·m/s</span>
          </span>
        )}
      </div>

      {/* ── Bar track ─────────────────────────────────────────── */}
      <div className="relative w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`w-full ${config.barHeight} relative`}>
          {/* Center line (zero point) */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300 z-10" />

          {/* Bar fill */}
          {isZero ? (
            /* Zero indicator: small diamond at center */
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#94a3b8' }}
              />
            </div>
          ) : isPositive ? (
            /* Positive: bar extends rightward from center */
            <div
              className={`absolute top-0 bottom-0 left-1/2 rounded-r-full ${animated ? 'transition-all duration-300 ease-out' : ''}`}
              style={{
                width: `${barWidthPercent}%`,
                backgroundColor: color,
              }}
            >
              {/* Arrow cap at the end */}
              {showDirection && barWidthPercent > 3 && (
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
                  style={{ color }}
                >
                  <svg
                    width="6"
                    height="10"
                    viewBox="0 0 6 10"
                    fill="currentColor"
                    className="opacity-80"
                  >
                    <path d="M0 0 L6 5 L0 10 Z" />
                  </svg>
                </div>
              )}
            </div>
          ) : (
            /* Negative: bar extends leftward from center */
            <div
              className={`absolute top-0 bottom-0 right-1/2 rounded-l-full ${animated ? 'transition-all duration-300 ease-out' : ''}`}
              style={{
                width: `${barWidthPercent}%`,
                backgroundColor: color,
              }}
            >
              {/* Arrow cap at the end */}
              {showDirection && barWidthPercent > 3 && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ color }}
                >
                  <svg
                    width="6"
                    height="10"
                    viewBox="0 0 6 10"
                    fill="currentColor"
                    className="opacity-80"
                  >
                    <path d="M6 0 L0 5 L6 10 Z" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Scale labels ──────────────────────────────────────── */}
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] text-gray-300 select-none">
          −{effectiveMax.toFixed(0)}
        </span>
        <span className="text-[8px] text-gray-300 select-none">
          0
        </span>
        <span className="text-[8px] text-gray-300 select-none">
          +{effectiveMax.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Format a momentum value for display.
 * Shows sign, 2 decimal places, handles near-zero.
 *
 * @param {number} value - Momentum in kg·m/s
 * @returns {string} Formatted string with sign
 */
function formatMomentum(value) {
  if (Math.abs(value) < 0.005) return '0.00';

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

// ─── PropTypes ────────────────────────────────────────────────────

MomentumBar.propTypes = {
  /** Display label for this momentum bar (e.g., "Object 1", "Total") */
  label: PropTypes.string.isRequired,

  /** Momentum value in kg·m/s. Positive = rightward, negative = leftward. */
  value: PropTypes.number.isRequired,

  /** Maximum |momentum| for consistent scaling across multiple bars.
   *  If omitted, the bar scales to its own |value|. */
  maxValue: PropTypes.number,

  /** CSS color string for the bar fill. Default: '#6366f1' (indigo-600) */
  color: PropTypes.string,

  /** Whether to show the numeric value. Default: true */
  showValue: PropTypes.bool,

  /** Whether to show direction arrows. Default: true */
  showDirection: PropTypes.bool,

  /** Height variant: 'sm', 'md', or 'lg'. Default: 'md' */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),

  /** Whether to animate bar width changes. Default: true */
  animated: PropTypes.bool,

  /** Additional CSS classes for the wrapper div */
  className: PropTypes.string,
};

MomentumBar.defaultProps = {
  maxValue: undefined,
  color: '#6366f1',
  showValue: true,
  showDirection: true,
  size: 'md',
  animated: true,
  className: '',
};

export default MomentumBar;