/**
 * @file FrameSelector.jsx
 * @description Reference frame selector component for the Relative Velocity simulator.
 * Renders a row of selectable frame buttons, each with an icon and label.
 * The active frame shows an observer badge. Supports dynamic frames arrays
 * for different simulation modes (1D, river, rain).
 *
 * @module FrameSelector
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Mapping from frame color keys to Tailwind class sets.
 */
const COLOR_MAP = {
  indigo: {
    active: 'bg-indigo-600 text-white border-indigo-600 shadow-md',
    inactive: 'bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50',
  },
  amber: {
    active: 'bg-amber-500 text-white border-amber-500 shadow-md',
    inactive: 'bg-white text-amber-700 border-amber-200 hover:border-amber-400 hover:bg-amber-50',
  },
  blue: {
    active: 'bg-blue-600 text-white border-blue-600 shadow-md',
    inactive: 'bg-white text-blue-700 border-blue-200 hover:border-blue-400 hover:bg-blue-50',
  },
  emerald: {
    active: 'bg-emerald-600 text-white border-emerald-600 shadow-md',
    inactive: 'bg-white text-emerald-700 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
  },
  purple: {
    active: 'bg-purple-600 text-white border-purple-600 shadow-md',
    inactive: 'bg-white text-purple-700 border-purple-200 hover:border-purple-400 hover:bg-purple-50',
  },
  slate: {
    active: 'bg-slate-700 text-white border-slate-700 shadow-md',
    inactive: 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50',
  },
};

/**
 * FrameSelector renders interactive buttons for choosing the observer reference frame.
 */
const FrameSelector = ({ frames, selectedFrame, onFrameChange, disabled, className }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-slate-700 block">
        Observer Reference Frame
      </label>
      <div className="flex gap-2">
        {frames.map((frame) => {
          const isActive = selectedFrame === frame.id;
          const colorKey = frame.color || 'indigo';
          const colors = COLOR_MAP[colorKey] || COLOR_MAP.indigo;

          return (
            <button
              key={frame.id}
              onClick={() => {
                if (!disabled) {
                  onFrameChange(frame.id);
                }
              }}
              disabled={disabled}
              className={`flex-1 p-2.5 rounded-lg border-2 text-center transition-all ${
                isActive ? colors.active : colors.inactive
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-center gap-1.5">
                {frame.icon && (
                  <span className="shrink-0">{frame.icon}</span>
                )}
                <span className="text-sm font-semibold truncate">{frame.label}</span>
              </div>
              {isActive && (
                <div className="text-xs mt-0.5 opacity-80">👁 Observer</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

FrameSelector.propTypes = {
  frames: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      color: PropTypes.string,
      icon: PropTypes.node,
    })
  ).isRequired,
  selectedFrame: PropTypes.string.isRequired,
  onFrameChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

FrameSelector.defaultProps = {
  disabled: false,
  className: '',
};

export default FrameSelector;