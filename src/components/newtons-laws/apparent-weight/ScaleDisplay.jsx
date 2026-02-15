/**
 * @file ScaleDisplay.jsx
 * @description Scale display component showing apparent weight reading with visual gauge,
 * g-force indicator, and state-based coloring. Simulates a bathroom scale readout
 * with real-time updates showing how apparent weight differs from real weight
 * in accelerating reference frames.
 *
 * @module ScaleDisplay
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Weight, Gauge, AlertTriangle } from 'lucide-react';

const STATE_CONFIG = {
  weightless: {
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    barColor: 'bg-purple-500',
    icon: '🪶',
    label: 'Weightless!',
  },
  lighter: {
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    barColor: 'bg-amber-500',
    icon: '⬆️',
    label: 'Feels Lighter',
  },
  normal: {
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    barColor: 'bg-emerald-500',
    icon: '✓',
    label: 'Normal Weight',
  },
  heavier: {
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300',
    barColor: 'bg-red-500',
    icon: '⬇️',
    label: 'Feels Heavier',
  },
  crushed: {
    color: 'text-red-700',
    bg: 'bg-red-100',
    border: 'border-red-500',
    barColor: 'bg-red-600',
    icon: '⚠️',
    label: 'Extreme G-Force!',
  },
};

/**
 * ScaleDisplay component renders a visual scale/gauge showing apparent weight.
 */
const ScaleDisplay = ({
  apparentWeight,
  realWeight,
  gForce,
  mass,
  weightState,
  showInKg,
  gravity,
  animated,
  className,
}) => {
  const config = STATE_CONFIG[weightState] || STATE_CONFIG.normal;
  const apparentMassKg = gravity > 0 ? apparentWeight / gravity : 0;
  const weightPercent = realWeight > 0 ? (apparentWeight / realWeight) * 100 : 0;
  const barPercent = Math.min(weightPercent, 300);
  const transitionClass = animated ? 'transition-all duration-300' : '';

  return (
    <div
      className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${className}`}
    >
      {/* Status banner */}
      <div
        className={`px-4 py-2.5 ${config.bg} ${config.border} border-b-2 flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className={`font-bold text-sm ${config.color}`}>{config.label}</span>
        </div>
        <span className={`font-mono font-bold text-lg ${config.color}`}>
          {gForce.toFixed(2)}g
        </span>
      </div>

      {/* Main readout */}
      <div className="p-4">
        {/* Scale reading — big number */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-2">
            <Weight size={18} className="text-slate-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">
              Scale Reading
            </span>
          </div>
          <div
            className={`text-4xl font-mono font-bold mt-1 ${transitionClass} ${config.color}`}
          >
            {apparentWeight.toFixed(1)}
            <span className="text-lg text-slate-400 ml-1">N</span>
          </div>
          {showInKg && (
            <div className="text-sm text-slate-500 font-mono mt-0.5">
              ({apparentMassKg.toFixed(2)} kg equivalent)
            </div>
          )}
        </div>

        {/* Weight comparison bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>0%</span>
            <span className="font-medium">Real Weight ({realWeight.toFixed(1)} N)</span>
            <span>300%</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full relative overflow-hidden">
            {/* Reference line at 100% (1/3 of bar width since range is 0-300%) */}
            <div
              className="absolute top-0 h-full w-0.5 bg-slate-700 z-10"
              style={{ left: '33.33%' }}
            />
            {/* Actual bar */}
            <div
              className={`h-full rounded-full ${transitionClass} ${config.barColor}`}
              style={{ width: `${Math.max(barPercent / 3, 0)}%` }}
            />
          </div>
          <div className="text-center text-xs font-mono text-slate-600">
            {weightPercent.toFixed(0)}% of real weight
          </div>
        </div>

        {/* Real vs Apparent comparison */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
            <div className="text-xs text-slate-500 font-medium">Real Weight (mg)</div>
            <div className="font-mono font-bold text-slate-700 text-lg">
              {realWeight.toFixed(1)}
              <span className="text-xs text-slate-400 ml-0.5">N</span>
            </div>
          </div>
          <div className={`rounded-lg p-2.5 text-center ${config.bg}`}>
            <div className={`text-xs font-medium ${config.color}`}>Apparent (N)</div>
            <div className={`font-mono font-bold text-lg ${config.color}`}>
              {apparentWeight.toFixed(1)}
              <span className="text-xs opacity-70 ml-0.5">N</span>
            </div>
          </div>
        </div>

        {/* G-Force gauge */}
        <div className="mt-3 bg-slate-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Gauge size={14} className="text-slate-500" />
              <span className="text-xs font-medium text-slate-600">G-Force</span>
            </div>
            <span className={`text-sm font-mono font-bold ${config.color}`}>
              {gForce.toFixed(2)}g
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-4">0</span>
            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden relative">
              {/* 1g marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-slate-500 z-10"
                style={{ left: '25%' }}
              />
              <div
                className={`h-full rounded-full ${transitionClass} ${config.barColor}`}
                style={{ width: `${Math.min((gForce / 4) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 w-4">4g</span>
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-400">
            <span>Weightless</span>
            <span>1g</span>
            <span>Extreme</span>
          </div>
        </div>

        {/* Warning for extreme g-force */}
        {gForce > 3 && (
          <div className="mt-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <span className="text-xs text-red-700">
              G-forces above 3g can cause loss of consciousness!
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

ScaleDisplay.propTypes = {
  apparentWeight: PropTypes.number.isRequired,
  realWeight: PropTypes.number.isRequired,
  gForce: PropTypes.number.isRequired,
  mass: PropTypes.number.isRequired,
  weightState: PropTypes.oneOf(['weightless', 'lighter', 'normal', 'heavier', 'crushed'])
    .isRequired,
  showInKg: PropTypes.bool,
  gravity: PropTypes.number,
  animated: PropTypes.bool,
  className: PropTypes.string,
};

ScaleDisplay.defaultProps = {
  showInKg: true,
  gravity: 9.8,
  animated: true,
  className: '',
};

export default ScaleDisplay;