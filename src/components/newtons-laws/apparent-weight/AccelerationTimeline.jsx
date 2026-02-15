/**
 * @file AccelerationTimeline.jsx
 * @description Acceleration timeline component for the elevator scenario in the
 * Apparent Weight simulator. Shows all journey phases as colored segments with
 * labels and a progress indicator. Allows clicking on phases to jump to that time.
 *
 * The timeline visualizes the complete elevator round-trip: rest → accel up →
 * constant velocity → decel → rest at top → accel down → constant velocity →
 * decel → rest at bottom.
 *
 * @module AccelerationTimeline
 */

import React from 'react';
import PropTypes from 'prop-types';
import { ArrowUp, ArrowDown, Pause } from 'lucide-react';

/**
 * Get visual configuration for a phase based on its label.
 * @param {string} label - Phase label from timeline.
 * @param {number} acceleration - Phase acceleration value.
 * @returns {Object} Visual config with bg, border, text, and icon.
 */
function getPhaseConfig(label, acceleration) {
  if (label.includes('Rest')) {
    return {
      bg: 'bg-emerald-100',
      border: 'border-emerald-400',
      text: 'text-emerald-700',
      icon: Pause,
      barBg: '#a7f3d0',
    };
  }
  if (label.includes('Accelerating Up')) {
    return {
      bg: 'bg-red-100',
      border: 'border-red-400',
      text: 'text-red-700',
      icon: ArrowUp,
      barBg: '#fecaca',
    };
  }
  if (label.includes('Constant Velocity') && label.includes('Up')) {
    return {
      bg: 'bg-emerald-100',
      border: 'border-emerald-400',
      text: 'text-emerald-700',
      icon: ArrowUp,
      barBg: '#a7f3d0',
    };
  }
  if (label.includes('Decelerating') && label.includes('Top')) {
    return {
      bg: 'bg-amber-100',
      border: 'border-amber-400',
      text: 'text-amber-700',
      icon: ArrowUp,
      barBg: '#fde68a',
    };
  }
  if (label.includes('Accelerating Down')) {
    return {
      bg: 'bg-amber-100',
      border: 'border-amber-400',
      text: 'text-amber-700',
      icon: ArrowDown,
      barBg: '#fde68a',
    };
  }
  if (label.includes('Constant Velocity') && label.includes('Down')) {
    return {
      bg: 'bg-emerald-100',
      border: 'border-emerald-400',
      text: 'text-emerald-700',
      icon: ArrowDown,
      barBg: '#a7f3d0',
    };
  }
  if (label.includes('Decelerating') && label.includes('Ground')) {
    return {
      bg: 'bg-red-100',
      border: 'border-red-400',
      text: 'text-red-700',
      icon: ArrowDown,
      barBg: '#fecaca',
    };
  }

  // Default
  return {
    bg: acceleration > 0 ? 'bg-red-100' : acceleration < 0 ? 'bg-amber-100' : 'bg-emerald-100',
    border: acceleration > 0 ? 'border-red-400' : acceleration < 0 ? 'border-amber-400' : 'border-emerald-400',
    text: acceleration > 0 ? 'text-red-700' : acceleration < 0 ? 'text-amber-700' : 'text-emerald-700',
    icon: acceleration !== 0 ? (acceleration > 0 ? ArrowUp : ArrowDown) : Pause,
    barBg: acceleration > 0 ? '#fecaca' : acceleration < 0 ? '#fde68a' : '#a7f3d0',
  };
}

/**
 * AccelerationTimeline visualizes elevator journey phases with a clickable progress bar.
 */
const AccelerationTimeline = ({
  timeline,
  currentTime,
  totalTime,
  onSeek,
  acceleration,
  disabled,
  className,
}) => {
  if (!timeline || timeline.length === 0) return null;

  // Find current phase index
  let activeIndex = timeline.length - 1;
  for (let i = 0; i < timeline.length; i++) {
    if (currentTime >= timeline[i].startTime && currentTime < timeline[i].endTime) {
      activeIndex = i;
      break;
    }
  }

  // If time hasn't started yet, use first phase
  if (currentTime <= 0) {
    activeIndex = 0;
  }

  const activePhase = timeline[activeIndex];
  const activeConfig = getPhaseConfig(activePhase.label, activePhase.acceleration);
  const ActiveIcon = activeConfig.icon;

  // Progress percentage
  const progressPercent = totalTime > 0 ? Math.min((currentTime / totalTime) * 100, 100) : 0;

  // Weight description for current phase
  const getWeightDescription = (acc) => {
    if (acc > 0.01) return 'Scale > mg (heavier)';
    if (acc < -0.01) return 'Scale < mg (lighter)';
    return 'Scale = mg (normal)';
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 p-4 ${className}`}>
      <h3 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
        <span>🛗</span>
        Elevator Journey
      </h3>

      {/* Segmented progress bar */}
      <div className="relative mb-4">
        <div className="flex h-8 rounded-lg overflow-hidden border border-gray-200">
          {timeline.map((phase, idx) => {
            const duration = phase.endTime - phase.startTime;
            const widthPercent = totalTime > 0 ? (duration / totalTime) * 100 : 0;
            const config = getPhaseConfig(phase.label, phase.acceleration);
            const isActive = idx === activeIndex;
            const Icon = config.icon;

            return (
              <button
                key={idx}
                onClick={() => {
                  if (onSeek && !disabled) {
                    onSeek(phase.startTime + 0.01);
                  }
                }}
                disabled={disabled && !onSeek}
                className={`relative flex items-center justify-center transition-all ${config.bg} ${
                  isActive
                    ? 'ring-2 ring-indigo-500 ring-inset z-10 brightness-105'
                    : 'opacity-60 hover:opacity-90'
                } ${!disabled && onSeek ? 'cursor-pointer' : 'cursor-default'}`}
                style={{
                  width: `${widthPercent}%`,
                  minWidth: widthPercent > 0 ? '20px' : '0px',
                }}
                title={`${phase.label} (${phase.startTime.toFixed(1)}s – ${phase.endTime.toFixed(1)}s)`}
              >
                <Icon size={12} className={config.text} />
              </button>
            );
          })}
        </div>

        {/* Progress needle */}
        <div
          className="absolute top-0 h-full w-0.5 bg-indigo-600 z-20"
          style={{
            left: `${progressPercent}%`,
            transition: 'left 0.1s linear',
          }}
        >
          <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white shadow" />
        </div>
      </div>

      {/* Current phase details */}
      <div className={`p-3 rounded-lg border ${activeConfig.bg} ${activeConfig.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ActiveIcon size={16} className={activeConfig.text} />
            <span className={`font-semibold text-sm ${activeConfig.text}`}>
              {activePhase.label}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {activePhase.startTime.toFixed(1)}s — {activePhase.endTime.toFixed(1)}s
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1">{activePhase.description}</p>
        <div className="flex gap-4 mt-1.5 text-xs font-mono text-slate-600">
          <span>
            a ={' '}
            {activePhase.acceleration > 0 ? '+' : ''}
            {activePhase.acceleration.toFixed(1)} m/s²
          </span>
          <span>{getWeightDescription(activePhase.acceleration)}</span>
        </div>
      </div>

      {/* Phase legend (compact) */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400" />
          <span>Normal (a=0)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-200 border border-red-400" />
          <span>Heavier (a↑)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-200 border border-amber-400" />
          <span>Lighter (a↓)</span>
        </div>
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs text-slate-400 mt-2">
        <span>0s</span>
        <span className="font-mono font-bold text-slate-600">
          {currentTime.toFixed(1)}s
        </span>
        <span>{totalTime.toFixed(1)}s</span>
      </div>
    </div>
  );
};

AccelerationTimeline.propTypes = {
  timeline: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      startTime: PropTypes.number.isRequired,
      endTime: PropTypes.number.isRequired,
      acceleration: PropTypes.number.isRequired,
      description: PropTypes.string,
    })
  ).isRequired,
  currentTime: PropTypes.number.isRequired,
  totalTime: PropTypes.number.isRequired,
  onSeek: PropTypes.func,
  acceleration: PropTypes.number.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

AccelerationTimeline.defaultProps = {
  onSeek: null,
  disabled: false,
  className: '',
};

export default AccelerationTimeline;