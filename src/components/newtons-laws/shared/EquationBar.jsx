/**
 * @module EquationBar
 *
 * @description
 * A React component that displays a live physics equation with dynamically
 * updating values. Each part of the equation (variable name, operator, value,
 * equals sign, bracket) is rendered as a separate styled span so values can
 * be highlighted, color-coded, and updated independently.
 *
 * Supports subscripts (e.g., F_net), units (e.g., "N", "m/s²"), color coding
 * per part, and a subtle highlight effect for values being actively computed.
 * Wraps gracefully on small screens via flexbox.
 *
 * @purpose
 * Every simulator displays the key equation with live values (e.g.,
 * F_net = F_applied - f = ma = 15N). This component makes equations readable,
 * dynamic, and consistent across all simulators without duplicating markup.
 *
 * @dependents
 * - SecondLawSimulator (F = ma equation)
 * - ImpulseMomentumSimulator (J = FΔt = Δp equation)
 * - MomentumConservationSimulator (p₁ + p₂ = p₁' + p₂' equation)
 * - ApparentWeightSimulator (W_app = m(g ± a) equation)
 * - RelativeVelocitySimulator (v_AB = v_A - v_B equation)
 *
 * @example
 * ```jsx
 * import EquationBar from './shared/EquationBar';
 *
 * // Newton's Second Law with live values:
 * <EquationBar
 *   label="Newton's Second Law"
 *   parts={[
 *     { type: 'variable', content: 'F', subscript: 'net', color: 'text-indigo-600' },
 *     { type: 'equals', content: '=' },
 *     { type: 'variable', content: 'm' },
 *     { type: 'operator', content: '×' },
 *     { type: 'variable', content: 'a' },
 *     { type: 'equals', content: '=' },
 *     { type: 'value', content: 3, unit: 'kg', color: 'text-purple-600' },
 *     { type: 'operator', content: '×' },
 *     { type: 'value', content: 5, unit: 'm/s²', color: 'text-amber-600' },
 *     { type: 'equals', content: '=' },
 *     { type: 'value', content: 15, unit: 'N', color: 'text-indigo-600', highlight: true },
 *   ]}
 * />
 *
 * // Momentum conservation:
 * <EquationBar
 *   label="Conservation of Momentum"
 *   parts={[
 *     { type: 'variable', content: 'p', subscript: 'before' },
 *     { type: 'equals', content: '=' },
 *     { type: 'variable', content: 'p', subscript: 'after' },
 *     { type: 'equals', content: '=' },
 *     { type: 'value', content: 42.5, unit: 'kg·m/s', highlight: true },
 *   ]}
 * />
 *
 * // With brackets:
 * <EquationBar
 *   parts={[
 *     { type: 'variable', content: 'W', subscript: 'app' },
 *     { type: 'equals', content: '=' },
 *     { type: 'variable', content: 'm' },
 *     { type: 'bracket', content: '(' },
 *     { type: 'variable', content: 'g' },
 *     { type: 'operator', content: '+' },
 *     { type: 'variable', content: 'a' },
 *     { type: 'bracket', content: ')' },
 *   ]}
 * />
 * ```
 */

import PropTypes from 'prop-types';

// ─── Default precision for numeric values ─────────────────────────
const DEFAULT_VALUE_PRECISION = 2;

/**
 * Format a value for display within the equation.
 * Numbers get toFixed formatting; strings are returned as-is.
 *
 * @param {number|string} content - The value to format.
 * @param {number} precision - Decimal places for numeric values.
 * @returns {string}
 */
function formatContent(content, precision) {
  if (typeof content === 'number') {
    if (isNaN(content) || !isFinite(content)) return '—';
    return content.toFixed(precision);
  }
  return String(content);
}

/**
 * Renders a single part of the equation based on its type.
 *
 * @param {Object} part - The equation part configuration.
 * @param {number} index - Array index for React key.
 * @returns {JSX.Element}
 */
function renderPart(part, index) {
  const { type, content, subscript, unit, color, highlight } = part;

  switch (type) {
    // ── Variable (italic, with optional subscript) ────────────
    case 'variable':
      return (
        <span
          key={index}
          className={`font-semibold italic ${color || 'text-slate-700'}`}
        >
          {content}
          {subscript && (
            <sub className="text-[0.65em] not-italic font-medium opacity-80">
              {subscript}
            </sub>
          )}
        </span>
      );

    // ── Operator (+, -, ×, ÷) ─────────────────────────────────
    case 'operator':
      return (
        <span
          key={index}
          className="mx-1 text-gray-400 font-normal select-none"
        >
          {content}
        </span>
      );

    // ── Equals sign ───────────────────────────────────────────
    case 'equals':
      return (
        <span
          key={index}
          className="mx-1.5 text-gray-400 font-normal select-none"
        >
          =
        </span>
      );

    // ── Numeric/string value with optional unit and highlight ─
    case 'value':
      return (
        <span
          key={index}
          className={`
            font-bold font-mono
            ${color || 'text-slate-700'}
            ${highlight ? 'bg-indigo-50 px-1.5 py-0.5 rounded-md ring-1 ring-indigo-200' : ''}
            transition-colors duration-200
          `}
        >
          {formatContent(content, DEFAULT_VALUE_PRECISION)}
          {unit && (
            <span className="text-[0.75em] font-normal ml-0.5 opacity-70">
              {unit}
            </span>
          )}
        </span>
      );

    // ── Bracket ( or ) ────────────────────────────────────────
    case 'bracket':
      return (
        <span
          key={index}
          className="text-gray-300 text-lg font-light select-none leading-none"
        >
          {content}
        </span>
      );

    // ── Fallback for unknown types ────────────────────────────
    default:
      return (
        <span key={index} className="text-gray-500">
          {String(content)}
        </span>
      );
  }
}

/**
 * EquationBar — Displays a live physics equation with styled, dynamic parts.
 *
 * @param {Object} props
 * @param {Array} props.parts - Array of equation part objects defining the equation.
 * @param {string} [props.label] - Optional label above the equation (e.g., "Newton's Second Law").
 * @param {string} [props.className=''] - Additional CSS classes for the wrapper.
 */
function EquationBar({ parts, label, className = '' }) {
  return (
    <div className={`${className}`}>
      {/* ── Label (optional) ─────────────────────────────────── */}
      {label && (
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 select-none">
          {label}
        </div>
      )}

      {/* ── Equation container ───────────────────────────────── */}
      <div
        className="
          bg-white rounded-xl border border-gray-200
          px-4 py-3
          shadow-sm
          flex items-center flex-wrap gap-y-1.5 gap-x-0.5
          text-sm md:text-base
          overflow-x-auto
        "
      >
        {parts.map((part, index) => renderPart(part, index))}
      </div>
    </div>
  );
}

// ─── Part shape definition ────────────────────────────────────────
const partShape = PropTypes.shape({
  /** The type of equation element:
   *  - 'variable': An italic physics variable (F, m, a, v, p)
   *  - 'operator': A math operator (+, -, ×, ÷)
   *  - 'equals': An equals sign (content is ignored, always renders "=")
   *  - 'value': A numeric or string value with optional unit
   *  - 'bracket': A parenthesis or bracket character
   */
  type: PropTypes.oneOf(['variable', 'operator', 'value', 'equals', 'bracket'])
    .isRequired,

  /** The content to display. Numbers are formatted with toFixed(2) for 'value' type.
   *  For 'equals' type, this is ignored (always renders "="). */
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,

  /** Subscript text for variables (e.g., "net" renders as F_net).
   *  Only used with type 'variable'. */
  subscript: PropTypes.string,

  /** Unit string for values (e.g., "N", "m/s²", "kg·m/s").
   *  Only used with type 'value'. */
  unit: PropTypes.string,

  /** Tailwind color class for this part (e.g., "text-indigo-600").
   *  Falls back to text-slate-700 if not provided. */
  color: PropTypes.string,

  /** Whether to apply a subtle highlight effect (indigo background + ring).
   *  Used to draw attention to computed/active values. */
  highlight: PropTypes.bool,
});

EquationBar.propTypes = {
  /** Array of equation part objects that define the equation structure.
   *  Each part has a type, content, and optional styling properties. */
  parts: PropTypes.arrayOf(partShape).isRequired,

  /** Optional label displayed above the equation in uppercase.
   *  E.g., "Newton's Second Law", "Conservation of Momentum". */
  label: PropTypes.string,

  /** Additional CSS classes for the outermost wrapper div */
  className: PropTypes.string,
};

EquationBar.defaultProps = {
  label: '',
  className: '',
};

export default EquationBar;