/**
 * @fileoverview Momentum display panel showing before/after momentum bars for
 * both objects and the system total.
 *
 * Visually demonstrates conservation of momentum by rendering MomentumBar
 * components for each object and the system total, with a before/after
 * comparison and a conservation verification box.
 *
 * @example
 * <MomentumDisplay
 *   m1={3} m2={2}
 *   u1={5} u2={-3}
 *   v1={-1.8} v2={6.2}
 *   collisionType="elastic"
 *   showAfter={true}
 * />
 *
 * @module MomentumDisplay
 */

import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Equal } from 'lucide-react';
import MomentumBar from '../shared/MomentumBar';

const MomentumDisplay = ({
  m1,
  m2,
  u1,
  u2,
  v1,
  v2,
  collisionType,
  showAfter,
  className = '',
}) => {
  const momentum = useMemo(() => {
    const p1Before = m1 * u1;
    const p2Before = m2 * u2;
    const pTotalBefore = p1Before + p2Before;

    const hasV1 = v1 !== null && v1 !== undefined;
    const hasV2 = v2 !== null && v2 !== undefined;

    const p1After = hasV1 ? m1 * v1 : null;
    const p2After = hasV2 ? m2 * v2 : null;
    const pTotalAfter =
      p1After !== null && p2After !== null ? p1After + p2After : null;

    const allValues = [
      Math.abs(p1Before),
      Math.abs(p2Before),
      Math.abs(pTotalBefore),
    ];
    if (p1After !== null) allValues.push(Math.abs(p1After));
    if (p2After !== null) allValues.push(Math.abs(p2After));
    if (pTotalAfter !== null) allValues.push(Math.abs(pTotalAfter));
    const maxMomentum = Math.max(...allValues, 1);

    return {
      p1Before,
      p2Before,
      pTotalBefore,
      p1After,
      p2After,
      pTotalAfter,
      maxMomentum,
    };
  }, [m1, m2, u1, u2, v1, v2]);

  return (
    <div
      className={`bg-white rounded-xl shadow-lg border border-gray-100 p-4 ${className}`}
    >
      <h3 className="font-bold text-slate-800 mb-3">Momentum Breakdown</h3>

      <div
        className={`grid ${showAfter ? 'grid-cols-2 gap-4' : 'grid-cols-1'}`}
      >
        {/* BEFORE column */}
        <div>
          <h4 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Before Collision
          </h4>
          <div className="space-y-2">
            <MomentumBar
              label="Object 1 (p₁)"
              value={momentum.p1Before}
              maxValue={momentum.maxMomentum}
              color="#6366f1"
              size="sm"
            />
            <MomentumBar
              label="Object 2 (p₂)"
              value={momentum.p2Before}
              maxValue={momentum.maxMomentum}
              color="#f59e0b"
              size="sm"
            />
            <div className="border-t border-gray-200 pt-1">
              <MomentumBar
                label="Total (Σp)"
                value={momentum.pTotalBefore}
                maxValue={momentum.maxMomentum}
                color="#8b5cf6"
                size="md"
              />
            </div>
          </div>
        </div>

        {/* AFTER column */}
        {showAfter && (
          <div>
            <h4 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              After Collision
            </h4>
            <div className="space-y-2">
              <MomentumBar
                label="Object 1 (p₁')"
                value={momentum.p1After ?? 0}
                maxValue={momentum.maxMomentum}
                color="#6366f1"
                size="sm"
              />
              <MomentumBar
                label="Object 2 (p₂')"
                value={momentum.p2After ?? 0}
                maxValue={momentum.maxMomentum}
                color="#f59e0b"
                size="sm"
              />
              <div className="border-t border-gray-200 pt-1">
                <MomentumBar
                  label="Total (Σp')"
                  value={momentum.pTotalAfter ?? 0}
                  maxValue={momentum.maxMomentum}
                  color="#8b5cf6"
                  size="md"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conservation verification */}
      {showAfter && momentum.pTotalAfter !== null && (
        <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
            <span className="font-mono font-bold text-purple-700">
              Σp_before = {momentum.pTotalBefore.toFixed(2)} kg·m/s
            </span>
            <Equal size={16} className="text-purple-500" />
            <span className="font-mono font-bold text-purple-700">
              Σp_after = {momentum.pTotalAfter.toFixed(2)} kg·m/s
            </span>
          </div>
          <p className="text-xs text-center text-purple-600 mt-1 font-semibold">
            ✓ Momentum is conserved!
          </p>
        </div>
      )}
    </div>
  );
};

MomentumDisplay.propTypes = {
  m1: PropTypes.number.isRequired,
  m2: PropTypes.number.isRequired,
  u1: PropTypes.number.isRequired,
  u2: PropTypes.number.isRequired,
  v1: PropTypes.number,
  v2: PropTypes.number,
  collisionType: PropTypes.string.isRequired,
  showAfter: PropTypes.bool.isRequired,
  className: PropTypes.string,
};

export default MomentumDisplay;