/**
 * @module FormulaSheet
 *
 * @description
 * A collapsible panel that displays relevant physics formulas for Newton's
 * Second Law. Shows different formula sets based on the current simulator
 * mode (flat surface vs inclined plane) and whether friction is enabled.
 *
 * Students can reference these formulas while using the simulator to connect
 * the visual simulation to the mathematical relationships. Formulas are
 * organized into categorized cards with clear titles and monospace rendering.
 *
 * @purpose
 * Physics students need easy access to reference formulas while experimenting.
 * Rather than requiring a separate textbook, this panel provides contextual
 * formulas that match the current simulation mode. It collapses to save
 * screen space when not needed.
 *
 * @dependents
 * - SecondLawSimulator.jsx (renders below the stats grid)
 *
 * @example
 * ```jsx
 * import FormulaSheet from './FormulaSheet';
 *
 * <FormulaSheet
 *   mode="incline"
 *   frictionEnabled={true}
 * />
 * ```
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

// ─── Formula Data ─────────────────────────────────────────────────

/**
 * @typedef {Object} Formula
 * @property {string} name - Short descriptive name
 * @property {string} equation - The formula in text notation
 */

/**
 * @typedef {Object} FormulaCategory
 * @property {string} title - Category heading
 * @property {string} icon - Emoji icon for the category
 * @property {Formula[]} formulas - Array of formulas in this category
 * @property {string} color - Tailwind gradient class for the card
 */

/** Core Newton's Laws formulas — always shown */
const CORE_FORMULAS = {
  title: "Newton's Laws",
  icon: '⚖️',
  color: 'from-indigo-50 to-purple-50 border-indigo-100',
  formulas: [
    { name: "Newton's Second Law", equation: 'F_net = m × a' },
    { name: 'Weight (Gravity)', equation: 'W = m × g' },
    { name: 'Net Force', equation: 'F_net = ΣF (sum of all forces)' },
  ],
};

/** Flat surface friction formulas */
const FLAT_FRICTION_FORMULAS = {
  title: 'Friction (Flat Surface)',
  icon: '✋',
  color: 'from-amber-50 to-orange-50 border-amber-100',
  formulas: [
    { name: 'Normal Force', equation: 'N = m × g' },
    { name: 'Max Static Friction', equation: 'f_s ≤ μₛ × N' },
    { name: 'Kinetic Friction', equation: 'f_k = μₖ × N' },
    { name: 'Net Force', equation: 'F_net = F_applied − f_k' },
  ],
};

/** Incline formulas (without friction) */
const INCLINE_FORMULAS = {
  title: 'Inclined Plane',
  icon: '📐',
  color: 'from-cyan-50 to-blue-50 border-cyan-100',
  formulas: [
    { name: 'Normal Force', equation: 'N = m × g × cosθ' },
    { name: 'Weight ∥ (along slope)', equation: 'W∥ = m × g × sinθ' },
    { name: 'Weight ⊥ (into surface)', equation: 'W⊥ = m × g × cosθ' },
    { name: 'Net Force (no friction)', equation: 'F_net = F_applied − m×g×sinθ' },
  ],
};

/** Incline + friction formulas */
const INCLINE_FRICTION_FORMULAS = {
  title: 'Friction on Incline',
  icon: '🔺',
  color: 'from-orange-50 to-red-50 border-orange-100',
  formulas: [
    { name: 'Friction Force', equation: 'f = μ × m × g × cosθ' },
    { name: 'Net Force (with friction)', equation: 'F_net = F_applied − m×g×sinθ − f' },
    { name: 'Critical Angle', equation: 'tan(θ_c) = μₛ' },
    { name: 'Sliding Condition', equation: 'm×g×sinθ > μₛ × m×g×cosθ' },
  ],
};

/** Kinematics formulas — always shown */
const KINEMATICS_FORMULAS = {
  title: 'Kinematics',
  icon: '🚀',
  color: 'from-green-50 to-emerald-50 border-green-100',
  formulas: [
    { name: 'Velocity', equation: 'v = u + a × t' },
    { name: 'Displacement', equation: 's = u×t + ½×a×t²' },
    { name: 'Velocity-Displacement', equation: 'v² = u² + 2×a×s' },
  ],
};

/** Useful relationships — always shown */
const RELATIONSHIPS = {
  title: 'Key Relationships',
  icon: '💡',
  color: 'from-violet-50 to-fuchsia-50 border-violet-100',
  formulas: [
    { name: 'Acceleration', equation: 'a = F_net / m' },
    { name: 'Equilibrium', equation: 'F_net = 0 → a = 0 (constant v)' },
    { name: 'Static Condition', equation: '|F_applied| ≤ f_s,max → no motion' },
  ],
};

/**
 * FormulaSheet — Collapsible panel showing contextual physics formulas.
 *
 * @param {Object} props
 * @param {'flat'|'incline'} [props.mode='flat'] - Current simulator mode
 * @param {boolean} [props.frictionEnabled=true] - Whether friction is active
 * @param {string} [props.className=''] - Additional CSS classes
 */
function FormulaSheet({
  mode = 'flat',
  frictionEnabled = true,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);

  // ─── Build formula categories based on current mode ────────
  const categories = buildCategories(mode, frictionEnabled);

  return (
    <div className={`${className}`}>
      {/* ── Toggle button ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="
          w-full flex items-center justify-between
          bg-white rounded-xl border border-gray-200
          px-4 py-3 shadow-sm
          hover:bg-gray-50 active:bg-gray-100
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400
          group
        "
        aria-expanded={isOpen}
        aria-controls="formula-sheet-content"
      >
        <div className="flex items-center gap-2">
          <BookOpen
            size={16}
            className="text-indigo-500 group-hover:text-indigo-600 transition-colors"
          />
          <span className="text-sm font-bold text-gray-700">
            Key Formulas
          </span>
          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {mode === 'flat' ? 'Flat Surface' : 'Inclined Plane'}
            {frictionEnabled ? ' + Friction' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 hidden sm:inline">
            {isOpen ? 'Hide' : 'Show'}
          </span>
          {isOpen ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* ── Collapsible content ─────────────────────────────────── */}
      <div
        id="formula-sheet-content"
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? 'max-h-[1200px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}
        `}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map((category, idx) => (
            <FormulaCard key={`${category.title}-${idx}`} category={category} />
          ))}
        </div>

        {/* ── Footer tip ───────────────────────────────────────── */}
        <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-[10px] text-gray-400 leading-relaxed text-center">
            <span className="font-bold">Tip:</span> Change the mode or toggle friction
            to see formulas update automatically. Try predicting the result before running
            the simulation!
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Build the list of formula categories based on current mode and friction state.
 *
 * @param {'flat'|'incline'} mode
 * @param {boolean} frictionEnabled
 * @returns {FormulaCategory[]}
 */
function buildCategories(mode, frictionEnabled) {
  const categories = [CORE_FORMULAS];

  if (mode === 'flat') {
    if (frictionEnabled) {
      categories.push(FLAT_FRICTION_FORMULAS);
    }
  } else {
    categories.push(INCLINE_FORMULAS);
    if (frictionEnabled) {
      categories.push(INCLINE_FRICTION_FORMULAS);
    }
  }

  categories.push(KINEMATICS_FORMULAS);
  categories.push(RELATIONSHIPS);

  return categories;
}

/**
 * Renders a single formula category card.
 *
 * @param {Object} props
 * @param {FormulaCategory} props.category
 */
function FormulaCard({ category }) {
  const { title, icon, color, formulas } = category;

  return (
    <div
      className={`
        bg-gradient-to-r ${color}
        rounded-lg p-3 border
      `}
    >
      {/* Card title */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm" aria-hidden="true">{icon}</span>
        <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
          {title}
        </h4>
      </div>

      {/* Formula list */}
      <div className="space-y-1.5">
        {formulas.map((formula, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-medium leading-tight">
              {formula.name}
            </span>
            <span className="text-sm font-mono text-gray-800 font-medium leading-tight">
              {formula.equation}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

FormulaCard.propTypes = {
  category: PropTypes.shape({
    title: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    formulas: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        equation: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
};

// ─── PropTypes ────────────────────────────────────────────────────

FormulaSheet.propTypes = {
  /** Current simulator mode — determines which formulas to show */
  mode: PropTypes.oneOf(['flat', 'incline']),

  /** Whether friction is enabled — shows/hides friction formulas */
  frictionEnabled: PropTypes.bool,

  /** Additional CSS classes for the wrapper div */
  className: PropTypes.string,
};

FormulaSheet.defaultProps = {
  mode: 'flat',
  frictionEnabled: true,
  className: '',
};

export default FormulaSheet;