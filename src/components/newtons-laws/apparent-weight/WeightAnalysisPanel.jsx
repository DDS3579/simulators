/**
 * @file WeightAnalysisPanel.jsx
 * @description Weight analysis panel showing the free body diagram, Newton's second
 * law derivation, and educational explanation for the current apparent weight state.
 * Reuses the FreeBodyDiagram component from the Second Law simulator. Supports all
 * three scenarios: elevator, free fall, and circular motion.
 *
 * @module WeightAnalysisPanel
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import FreeBodyDiagram from '../second-law/FreeBodyDiagram';

/**
 * WeightAnalysisPanel displays force analysis with FBD, equations, and explanations.
 */
const WeightAnalysisPanel = ({
  mass,
  gravity,
  acceleration,
  apparentWeight,
  realWeight,
  gForce,
  scenario,
  weightState,
  theta,
  radius,
  speed,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Prepare FBD forces array
  const forces = useMemo(() => {
    if (scenario === 'circular') {
      // Normal force direction toward center of loop
      // Person at angle theta from bottom of vertical circle
      // Direction toward center from person:
      // atan2(cos(theta), -sin(theta)) converted to degrees
      let normalDirectionRad = Math.atan2(Math.cos(theta), -Math.sin(theta));
      let normalDirectionDeg = (normalDirectionRad * 180) / Math.PI;
      if (normalDirectionDeg < 0) normalDirectionDeg += 360;

      return [
        {
          label: 'mg',
          magnitude: realWeight,
          direction: 270,
          color: '#ef4444',
          subscript: '',
        },
        {
          label: 'N',
          magnitude: Math.max(0, apparentWeight),
          direction: normalDirectionDeg,
          color: '#10b981',
          subscript: '',
        },
      ];
    }

    // Elevator and freefall: weight down, normal up
    return [
      {
        label: 'mg',
        magnitude: realWeight,
        direction: 270,
        color: '#ef4444',
        subscript: '',
      },
      {
        label: 'N',
        magnitude: Math.max(0, apparentWeight),
        direction: 90,
        color: '#10b981',
        subscript: '',
      },
    ];
  }, [scenario, realWeight, apparentWeight, theta]);

  // Render trigger for FBD re-rendering
  const renderTrigger = `${apparentWeight.toFixed(2)}-${acceleration.toFixed(2)}-${theta.toFixed(3)}-${scenario}`;

  // Compute derived values for circular mode
  const centripetalAccel = speed > 0 && radius > 0 ? (speed * speed) / radius : 0;
  const cosTheta = Math.cos(theta);

  return (
    <div
      className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${className}`}
    >
      {/* Header with collapse toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-500" />
          <h3 className="font-bold text-slate-800 text-sm">Force Analysis</h3>
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-slate-400" />
        ) : (
          <ChevronDown size={18} className="text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Free Body Diagram */}
          <FreeBodyDiagram
            forces={forces}
            mode="flat"
            inclineAngle={0}
            showComponents={false}
            showNetForce={false}
            netForce={0}
            renderTrigger={renderTrigger}
            className="h-48"
          />

          {/* Newton's Second Law Derivation */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Newton&apos;s Second Law
            </h4>

            {(scenario === 'elevator' || scenario === 'freefall') && (
              <div className="space-y-1.5 text-sm font-mono">
                <div className="text-slate-700">
                  <span className="text-slate-500">Step 1:</span> ΣF = ma
                </div>
                <div className="text-slate-700">
                  <span className="text-slate-500">Step 2:</span>{' '}
                  <span className="text-emerald-600">N</span> −{' '}
                  <span className="text-red-500">mg</span> = m·a
                </div>
                <div className="text-indigo-600 font-bold text-base">
                  <span className="text-slate-500 text-sm font-normal">Step 3:</span>{' '}
                  N = m(g + a)
                </div>

                <div className="border-t border-slate-200 pt-2 mt-2">
                  <div className="text-slate-500 text-xs mb-1">Substituting values:</div>
                  <div className="text-slate-700">
                    N = {mass.toFixed(1)} × ({gravity.toFixed(1)}{' '}
                    {acceleration >= 0 ? '+' : '−'} {Math.abs(acceleration).toFixed(2)})
                  </div>
                  <div className="text-slate-700">
                    N = {mass.toFixed(1)} × {(gravity + acceleration).toFixed(2)}
                  </div>
                  <div className="text-indigo-700 font-bold text-lg mt-1">
                    N = {apparentWeight.toFixed(1)} N
                  </div>
                </div>

                {scenario === 'freefall' && Math.abs(acceleration + gravity) < 0.1 && (
                  <div className="bg-purple-50 rounded p-2 mt-2 text-purple-700 text-xs">
                    <strong>Special case:</strong> a = −g → N = m(g − g) = 0 (Weightless!)
                  </div>
                )}
              </div>
            )}

            {scenario === 'circular' && (
              <div className="space-y-1.5 text-sm font-mono">
                <div className="text-slate-700">
                  <span className="text-slate-500">At angle</span> θ ={' '}
                  {((theta * 180) / Math.PI).toFixed(0)}° from bottom:
                </div>
                <div className="text-slate-700">
                  <span className="text-slate-500">Centripetal:</span>{' '}
                  <span className="text-emerald-600">N</span> −{' '}
                  <span className="text-red-500">mg·cosθ</span> = mv²/R
                </div>
                <div className="text-indigo-600 font-bold text-base">
                  N = m(v²/R + g·cosθ)
                </div>

                <div className="border-t border-slate-200 pt-2 mt-2">
                  <div className="text-slate-500 text-xs mb-1">Substituting values:</div>
                  <div className="text-slate-700">
                    v²/R = {speed.toFixed(1)}² / {radius.toFixed(1)} ={' '}
                    {centripetalAccel.toFixed(2)} m/s²
                  </div>
                  <div className="text-slate-700">
                    g·cosθ = {gravity.toFixed(1)} × cos({((theta * 180) / Math.PI).toFixed(0)}°)
                    = {(gravity * cosTheta).toFixed(2)} m/s²
                  </div>
                  <div className="text-slate-700">
                    N = {mass.toFixed(1)} × ({centripetalAccel.toFixed(2)} +{' '}
                    {(gravity * cosTheta).toFixed(2)})
                  </div>
                  <div className="text-indigo-700 font-bold text-lg mt-1">
                    N = {apparentWeight.toFixed(1)} N
                  </div>
                </div>

                {/* Min speed info */}
                <div className="bg-slate-100 rounded p-2 mt-2 text-xs text-slate-600">
                  Min speed to maintain contact at top: v<sub>min</sub> = √(gR) ={' '}
                  {Math.sqrt(gravity * radius).toFixed(2)} m/s
                </div>
              </div>
            )}
          </div>

          {/* G-Force comparison */}
          <div className="bg-slate-50 rounded-lg p-3">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
              G-Force Analysis
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white rounded p-2">
                <div className="text-slate-500">Real Weight</div>
                <div className="font-bold text-red-600 font-mono">{realWeight.toFixed(1)} N</div>
                <div className="text-slate-400">1.00g</div>
              </div>
              <div
                className={`rounded p-2 ${
                  weightState === 'normal'
                    ? 'bg-emerald-50'
                    : weightState === 'weightless'
                      ? 'bg-purple-50'
                      : weightState === 'lighter'
                        ? 'bg-amber-50'
                        : 'bg-red-50'
                }`}
              >
                <div className="text-slate-500">Apparent</div>
                <div className="font-bold text-emerald-600 font-mono">
                  {apparentWeight.toFixed(1)} N
                </div>
                <div className="font-bold font-mono text-indigo-600">{gForce.toFixed(2)}g</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-slate-500">Difference</div>
                <div className="font-bold text-indigo-600 font-mono">
                  {(apparentWeight - realWeight) >= 0 ? '+' : ''}
                  {(apparentWeight - realWeight).toFixed(1)} N
                </div>
                <div className="text-slate-400">
                  {((gForce - 1) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          {/* Explanation text */}
          <div className="text-xs text-slate-600 leading-relaxed bg-indigo-50 rounded-lg p-3 border border-indigo-100">
            <p className="font-semibold text-indigo-700 mb-1">What&apos;s happening?</p>

            {scenario === 'elevator' && acceleration > 0.01 && (
              <p>
                The elevator accelerates <strong>upward</strong> at{' '}
                {Math.abs(acceleration).toFixed(1)} m/s². The floor must push harder on you (N{' '}
                {'>'} mg), so you feel <strong>heavier</strong>. The scale reads{' '}
                {apparentWeight.toFixed(1)} N instead of your real weight {realWeight.toFixed(1)} N
                — that&apos;s {((gForce - 1) * 100).toFixed(0)}% more than normal!
              </p>
            )}

            {scenario === 'elevator' && acceleration < -0.01 && (
              <p>
                The elevator accelerates <strong>downward</strong> at{' '}
                {Math.abs(acceleration).toFixed(1)} m/s². The floor pushes less on you (N {'<'}{' '}
                mg), so you feel <strong>lighter</strong>. The scale reads{' '}
                {apparentWeight.toFixed(1)} N instead of your real weight {realWeight.toFixed(1)} N
                — that&apos;s {Math.abs(((1 - gForce) * 100)).toFixed(0)}% less than normal!
              </p>
            )}

            {scenario === 'elevator' && Math.abs(acceleration) <= 0.01 && (
              <p>
                The elevator has <strong>zero acceleration</strong> (at rest or constant velocity).
                Newton&apos;s first law tells us that no net force means no acceleration.
                The scale reads your true weight: N = mg = {realWeight.toFixed(1)} N. Moving at
                constant velocity feels identical to being stationary!
              </p>
            )}

            {scenario === 'freefall' && (
              <p>
                {apparentWeight < 0.5
                  ? 'In free fall, both you and the scale accelerate at g downward. The scale cannot push on you (N = 0). You experience weightlessness — the same sensation astronauts feel in orbit! This is because the entire reference frame (the box) is accelerating at g, so a_frame = −g and N = m(g − g) = 0.'
                  : gForce > 2
                    ? `During impact, the box decelerates rapidly. The floor pushes up with enormous force to stop you. You experience ${gForce.toFixed(1)}g — that's ${gForce.toFixed(1)} times your normal weight!`
                    : `The scale reads your weight normally when the box is stationary. Gravity pulls you down with force mg = ${realWeight.toFixed(1)} N, and the scale pushes up with equal force.`}
              </p>
            )}

            {scenario === 'circular' && (
              <p>
                On a vertical loop at θ = {((theta * 180) / Math.PI).toFixed(0)}°,{' '}
                {cosTheta > 0.5
                  ? 'gravity has a large component along the radial direction toward the center. The normal force must be large to provide centripetal acceleration AND support your weight component. You feel heavier.'
                  : cosTheta < -0.5
                    ? 'gravity has a component pointing away from the center. This helps provide centripetal acceleration, so the track pushes less on you. You feel lighter.'
                    : 'the radial component of gravity is small. The normal force mainly provides centripetal acceleration.'}{' '}
                The centripetal acceleration is v²/R = {centripetalAccel.toFixed(1)} m/s² (
                {speed.toFixed(1)}²/{radius.toFixed(1)}).
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

WeightAnalysisPanel.propTypes = {
  mass: PropTypes.number.isRequired,
  gravity: PropTypes.number.isRequired,
  acceleration: PropTypes.number.isRequired,
  apparentWeight: PropTypes.number.isRequired,
  realWeight: PropTypes.number.isRequired,
  gForce: PropTypes.number.isRequired,
  scenario: PropTypes.oneOf(['elevator', 'freefall', 'circular']).isRequired,
  weightState: PropTypes.string.isRequired,
  theta: PropTypes.number,
  radius: PropTypes.number,
  speed: PropTypes.number,
  className: PropTypes.string,
};

WeightAnalysisPanel.defaultProps = {
  theta: 0,
  radius: 5,
  speed: 10,
  className: '',
};

export default WeightAnalysisPanel;