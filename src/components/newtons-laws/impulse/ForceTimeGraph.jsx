/**
 * @module ForceTimeGraph
 *
 * @description
 * A specialized wrapper around GraphPanel that displays the Force vs Time
 * curve during a collision in the Impulse-Momentum simulator. Renders a
 * half-sine pulse, shades the area under the curve (= impulse), and
 * annotates key values (F_peak, F_avg, Δt, J).
 *
 * This component computes the force profile dataset from physics parameters
 * using generateForceProfile() from collisionPhysics.js, builds the
 * appropriate annotations, and passes everything to GraphPanel.
 *
 * @purpose
 * The Force-Time graph is the centerpiece of the impulse concept. Students
 * need to see that the same impulse (area under curve) can be achieved with
 * a high-force/short-time combination (concrete) or a low-force/long-time
 * combination (trampoline). This graph makes that relationship visual.
 *
 * @dependents
 * - ImpulseMomentum.jsx (renders below the main canvas)
 *
 * @example
 * ```jsx
 * import ForceTimeGraph from './ForceTimeGraph';
 *
 * <ForceTimeGraph
 *   peakForce={4668}
 *   collisionTime={0.005}
 *   impulse={14.85}
 *   avgForce={2970}
 *   currentTime={0.003}
 *   isActive={true}
 *   showAvgForce
 *   showImpulseArea
 * />
 * ```
 */

import { useMemo } from 'react';
import PropTypes from 'prop-types';
import GraphPanel from '../shared/GraphPanel';
import { generateForceProfile } from '../../../utils/newtons-laws/collisionPhysics';

/**
 * ForceTimeGraph — Displays the F(t) half-sine collision curve with annotations.
 *
 * @param {Object} props
 * @param {number} props.peakForce - Peak force in Newtons (F_peak)
 * @param {number} props.collisionTime - Duration of collision in seconds (Δt)
 * @param {number} props.impulse - Impulse magnitude in N·s (area under curve)
 * @param {number} props.avgForce - Average force in Newtons
 * @param {number} [props.currentTime] - Current time within collision (0 to Δt)
 * @param {boolean} [props.isActive=false] - Whether collision is happening now
 * @param {boolean} [props.showAvgForce=true] - Show F_avg horizontal line
 * @param {boolean} [props.showImpulseArea=true] - Shade area under curve
 * @param {string} [props.className=''] - Additional CSS classes
 */
function ForceTimeGraph({
  peakForce,
  collisionTime,
  impulse,
  avgForce,
  currentTime,
  isActive = false,
  showAvgForce = true,
  showImpulseArea = true,
  className = '',
}) {
  // ─── Generate force-time data ──────────────────────────────
  const forceData = useMemo(() => {
    if (peakForce <= 0 || collisionTime <= 0) {
      return [{ x: 0, y: 0 }, { x: 0.01, y: 0 }];
    }
    const profile = generateForceProfile(peakForce, collisionTime, 120);
    return profile.map((pt) => ({ x: pt.t, y: pt.f }));
  }, [peakForce, collisionTime]);

  // ─── Build datasets ────────────────────────────────────────
  const datasets = useMemo(() => {
    const ds = [
      {
        label: 'F(t)',
        data: forceData,
        color: '#ef4444',
        lineWidth: 2.5,
        fill: showImpulseArea,
        fillColor: 'rgba(16, 185, 129, 0.15)',
      },
    ];

    // Average force line as a flat dataset
    if (showAvgForce && avgForce > 0 && collisionTime > 0) {
      ds.push({
        label: 'F_avg',
        data: [
          { x: 0, y: avgForce },
          { x: collisionTime, y: avgForce },
        ],
        color: '#f59e0b',
        lineWidth: 1.5,
        dashed: true,
      });
    }

    return ds;
  }, [forceData, showAvgForce, avgForce, collisionTime, showImpulseArea]);

  // ─── Build annotations ─────────────────────────────────────
  const annotations = useMemo(() => {
    const anns = [];

    if (peakForce <= 0 || collisionTime <= 0) return anns;

    // Peak force horizontal marker
    anns.push({
      type: 'hline',
      y: peakForce,
      label: `F_peak = ${formatForce(peakForce)}`,
      color: '#ef4444',
    });

    // Average force label (if line dataset is drawn, just add label annotation)
    if (showAvgForce && avgForce > 0) {
      anns.push({
        type: 'text',
        x: collisionTime * 0.75,
        y: avgForce * 1.08,
        label: `F_avg = ${formatForce(avgForce)}`,
        color: '#f59e0b',
      });
    }

    // Collision duration marker
    anns.push({
      type: 'vline',
      x: collisionTime,
      label: `Δt = ${formatTime(collisionTime)}`,
      color: '#64748b',
    });

    // Impulse label in the shaded area (center of the sine curve)
    if (showImpulseArea && impulse > 0) {
      anns.push({
        type: 'text',
        x: collisionTime * 0.5,
        y: peakForce * 0.35,
        label: `J = ${impulse.toFixed(2)} N·s`,
        color: '#10b981',
      });
    }

    // Current time progress marker during active collision
    if (isActive && typeof currentTime === 'number' && currentTime >= 0 && currentTime <= collisionTime) {
      anns.push({
        type: 'vline',
        x: currentTime,
        label: '',
        color: '#6366f1',
      });

      // Point on curve at current time
      const currentForce = peakForce * Math.sin((Math.PI * currentTime) / collisionTime);
      if (currentForce > 0) {
        anns.push({
          type: 'point',
          x: currentTime,
          y: currentForce,
          label: `${formatForce(currentForce)}`,
          color: '#6366f1',
        });
      }
    }

    return anns;
  }, [peakForce, collisionTime, impulse, avgForce, showAvgForce, showImpulseArea, isActive, currentTime]);

  // ─── Axis ranges ───────────────────────────────────────────
  const xRange = useMemo(() => ({
    min: 0,
    max: collisionTime > 0 ? collisionTime * 1.2 : 0.01,
  }), [collisionTime]);

  const yRange = useMemo(() => ({
    min: 0,
    max: peakForce > 0 ? peakForce * 1.2 : 1,
  }), [peakForce]);

  // ─── Render trigger (changes when any input changes) ───────
  const renderTrigger = useMemo(() => {
    return peakForce + collisionTime * 1000 + (currentTime || 0) * 10000 + (isActive ? 1 : 0);
  }, [peakForce, collisionTime, currentTime, isActive]);

  return (
    <div className={`${className}`}>
      <GraphPanel
        title="Force vs Time (Collision)"
        xLabel="Time (s)"
        yLabel="Force (N)"
        datasets={datasets}
        xRange={xRange}
        yRange={yRange}
        autoScale={false}
        annotations={annotations}
        aspectRatio={0.5}
        showLegend={showAvgForce}
        renderTrigger={renderTrigger}
      />

      {/* ── Summary text below graph ──────────────────────────── */}
      <div className="mt-2 space-y-1">
        {/* Impulse equation */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-500">
            Area under curve
          </span>
          <span className="text-xs text-gray-400">=</span>
          <span className="text-xs font-bold text-emerald-600">
            Impulse (J)
          </span>
          <span className="text-xs text-gray-400">=</span>
          <span className="text-xs font-bold text-emerald-600">
            Δp
          </span>
          <span className="text-xs text-gray-400">=</span>
          <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
            {impulse.toFixed(2)} N·s
          </span>
        </div>

        {/* Force comparison */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-gray-500">
              F<sub>peak</sub> = <span className="font-mono font-bold text-red-600">{formatForce(peakForce)}</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 bg-amber-500" />
            <span className="text-[10px] text-gray-500">
              F<sub>avg</sub> = <span className="font-mono font-bold text-amber-600">{formatForce(avgForce)}</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-gray-300" />
            <span className="text-[10px] text-gray-500">
              Δt = <span className="font-mono font-bold text-gray-600">{formatTime(collisionTime)}</span>
            </span>
          </div>
        </div>

        {/* Peak vs Average explanation */}
        <p className="text-[10px] text-gray-400 text-center leading-tight">
          F<sub>peak</sub> = (π/2) × F<sub>avg</sub> ≈ 1.571 × F<sub>avg</sub>
          &nbsp;·&nbsp;
          Same impulse, different force profiles
        </p>
      </div>
    </div>
  );
}

// ─── Formatting Helpers ───────────────────────────────────────────

/**
 * Format a force value with appropriate unit prefix.
 *
 * @param {number} force - Force in Newtons
 * @returns {string} Formatted string (e.g., "4.67 kN", "234 N")
 */
function formatForce(force) {
  if (!isFinite(force) || isNaN(force)) return '0 N';

  const abs = Math.abs(force);
  if (abs >= 1000000) {
    return `${(force / 1000000).toFixed(1)} MN`;
  }
  if (abs >= 1000) {
    return `${(force / 1000).toFixed(2)} kN`;
  }
  if (abs >= 1) {
    return `${force.toFixed(1)} N`;
  }
  return `${(force * 1000).toFixed(1)} mN`;
}

/**
 * Format a time value with appropriate unit prefix.
 *
 * @param {number} time - Time in seconds
 * @returns {string} Formatted string (e.g., "5.0 ms", "0.20 s")
 */
function formatTime(time) {
  if (!isFinite(time) || isNaN(time)) return '0 s';

  const abs = Math.abs(time);
  if (abs >= 1) {
    return `${time.toFixed(2)} s`;
  }
  if (abs >= 0.001) {
    return `${(time * 1000).toFixed(1)} ms`;
  }
  return `${(time * 1000000).toFixed(0)} μs`;
}

// ─── PropTypes ────────────────────────────────────────────────────

ForceTimeGraph.propTypes = {
  /** Peak force during collision in Newtons */
  peakForce: PropTypes.number.isRequired,

  /** Duration of the collision in seconds (Δt) */
  collisionTime: PropTypes.number.isRequired,

  /** Total impulse in N·s (area under the F-t curve) */
  impulse: PropTypes.number.isRequired,

  /** Average force during collision in Newtons */
  avgForce: PropTypes.number.isRequired,

  /** Current time within the collision (0 to Δt) for progress marker.
   *  Only used when isActive is true. */
  currentTime: PropTypes.number,

  /** Whether the collision is currently happening (shows progress marker).
   *  Default: false */
  isActive: PropTypes.bool,

  /** Whether to show the F_avg horizontal dashed line. Default: true */
  showAvgForce: PropTypes.bool,

  /** Whether to shade the area under the curve (representing impulse).
   *  Default: true */
  showImpulseArea: PropTypes.bool,

  /** Additional CSS classes for the wrapper div */
  className: PropTypes.string,
};

ForceTimeGraph.defaultProps = {
  currentTime: undefined,
  isActive: false,
  showAvgForce: true,
  showImpulseArea: true,
  className: '',
};

export default ForceTimeGraph;