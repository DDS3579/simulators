/**
 * @module StatCard
 *
 * @description
 * A small card component that displays a single live physics value with a label,
 * formatted numeric value, unit, optional emoji icon, and color coding. Designed
 * to be used in grids or rows to show real-time simulation outputs like time,
 * velocity, acceleration, force, momentum, etc.
 *
 * Supports two size variants (`sm` and `md`) and seven color themes that map to
 * the application's design system. Handles both numeric values (auto-formatted
 * with toFixed) and string values (displayed as-is).
 *
 * @purpose
 * Every simulator displays 6-9 live values during animation. This component
 * ensures consistent styling, formatting, and color coding across all simulators
 * without duplicating card markup.
 *
 * @dependents
 * - SecondLawSimulator (time, velocity, acceleration, net force, displacement)
 * - ImpulseMomentumSimulator (impulse, momentum change, velocity)
 * - MomentumConservationSimulator (total momentum, KE before/after)
 * - ApparentWeightSimulator (apparent weight, real weight, acceleration)
 * - RelativeVelocitySimulator (relative velocity, individual velocities)
 *
 * @example
 * ```jsx
 * import StatCard from './shared/StatCard';
 *
 * function LiveStats({ time, velocity, acceleration }) {
 *   return (
 *     <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
 *       <StatCard
 *         label="Time"
 *         value={time}
 *         unit="s"
 *         icon="⏱️"
 *         color="indigo"
 *       />
 *       <StatCard
 *         label="Velocity"
 *         value={velocity}
 *         unit="m/s"
 *         icon="💨"
 *         color={velocity >= 0 ? 'green' : 'red'}
 *         precision={3}
 *       />
 *       <StatCard
 *         label="Acceleration"
 *         value={acceleration}
 *         unit="m/s²"
 *         icon="⚡"
 *         color="amber"
 *       />
 *       <StatCard
 *         label="Status"
 *         value="Moving"
 *         color="blue"
 *         size="sm"
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

import PropTypes from 'prop-types';

// ─── Color Theme Map ──────────────────────────────────────────────
// Maps color names to Tailwind class strings for text, background, and border.
const colorMap = {
  indigo: {
    container: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    value: 'text-indigo-700',
    unit: 'text-indigo-500',
  },
  purple: {
    container: 'text-purple-700 bg-purple-50 border-purple-200',
    value: 'text-purple-700',
    unit: 'text-purple-500',
  },
  green: {
    container: 'text-green-700 bg-green-50 border-green-200',
    value: 'text-green-700',
    unit: 'text-green-500',
  },
  red: {
    container: 'text-red-700 bg-red-50 border-red-200',
    value: 'text-red-700',
    unit: 'text-red-500',
  },
  amber: {
    container: 'text-amber-700 bg-amber-50 border-amber-200',
    value: 'text-amber-700',
    unit: 'text-amber-500',
  },
  blue: {
    container: 'text-blue-700 bg-blue-50 border-blue-200',
    value: 'text-blue-700',
    unit: 'text-blue-500',
  },
  slate: {
    container: 'text-slate-700 bg-slate-50 border-slate-200',
    value: 'text-slate-700',
    unit: 'text-slate-500',
  },
};

// ─── Size Variant Map ─────────────────────────────────────────────
const sizeMap = {
  sm: {
    padding: 'p-2.5',
    labelText: 'text-[10px]',
    valueText: 'text-base',
    unitText: 'text-[10px]',
    gap: 'mb-0',
  },
  md: {
    padding: 'p-3',
    labelText: 'text-xs',
    valueText: 'text-xl',
    unitText: 'text-sm',
    gap: 'mb-0.5',
  },
};

// ─── Fallback defaults ────────────────────────────────────────────
const DEFAULT_COLOR = 'indigo';
const DEFAULT_SIZE = 'md';
const DEFAULT_PRECISION = 2;

/**
 * StatCard — Displays a single live physics value with label, formatting, and color.
 *
 * @param {Object} props
 * @param {string} props.label - Display label (e.g., "Velocity", "Net Force").
 * @param {number|string} props.value - The value to display. Numbers are auto-formatted.
 * @param {string} [props.unit] - Unit string (e.g., "m/s", "N", "kg·m/s").
 * @param {number} [props.precision=2] - Decimal places for numeric values.
 * @param {string} [props.icon] - Emoji icon displayed before the label.
 * @param {'indigo'|'purple'|'green'|'red'|'amber'|'blue'|'slate'} [props.color='indigo']
 *   Color theme for the card.
 * @param {'sm'|'md'} [props.size='md'] - Size variant.
 * @param {string} [props.className=''] - Additional CSS classes.
 */
function StatCard({
  label,
  value,
  unit = '',
  precision = DEFAULT_PRECISION,
  icon = '',
  color = DEFAULT_COLOR,
  size = DEFAULT_SIZE,
  className = '',
}) {
  // ─── Resolve theme classes ──────────────────────────────────
  const theme = colorMap[color] || colorMap[DEFAULT_COLOR];
  const sizeClasses = sizeMap[size] || sizeMap[DEFAULT_SIZE];

  // ─── Format value ───────────────────────────────────────────
  let formattedValue;
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      formattedValue = '—';
    } else {
      formattedValue = value.toFixed(precision);
    }
  } else {
    // String values are displayed as-is
    formattedValue = value;
  }

  return (
    <div
      className={`
        rounded-xl border-2
        ${sizeClasses.padding}
        ${theme.container}
        transition-colors duration-200
        ${className}
      `}
    >
      {/* ── Label row with optional icon ───────────────────────── */}
      <div
        className={`
          ${sizeClasses.labelText}
          font-medium opacity-70
          ${sizeClasses.gap}
          flex items-center gap-1
          leading-tight
          select-none
        `}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>

      {/* ── Value display ──────────────────────────────────────── */}
      <div
        className={`
          ${sizeClasses.valueText}
          font-bold font-mono
          ${theme.value}
          leading-tight
          truncate
        `}
      >
        {formattedValue}
        {unit && (
          <span
            className={`
              ${sizeClasses.unitText}
              font-normal
              ml-0.5
              ${theme.unit}
            `}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

StatCard.propTypes = {
  /** Display label for the statistic, e.g., "Velocity" */
  label: PropTypes.string.isRequired,

  /** The value to display. Numbers are formatted with toFixed(precision).
   *  Strings are displayed as-is (useful for status text like "Moving"). */
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,

  /** Unit string displayed after the value, e.g., "m/s", "N" */
  unit: PropTypes.string,

  /** Number of decimal places for numeric value formatting. Default: 2 */
  precision: PropTypes.number,

  /** Emoji icon displayed before the label, e.g., "⚡", "💨" */
  icon: PropTypes.string,

  /** Color theme for the card. Determines background, border, and text colors.
   *  Default: 'indigo' */
  color: PropTypes.oneOf(['indigo', 'purple', 'green', 'red', 'amber', 'blue', 'slate']),

  /** Size variant. 'sm' is compact with smaller text, 'md' is the standard size.
   *  Default: 'md' */
  size: PropTypes.oneOf(['sm', 'md']),

  /** Additional CSS classes for the wrapper div */
  className: PropTypes.string,
};

StatCard.defaultProps = {
  unit: '',
  precision: DEFAULT_PRECISION,
  icon: '',
  color: DEFAULT_COLOR,
  size: DEFAULT_SIZE,
  className: '',
};

export default StatCard;