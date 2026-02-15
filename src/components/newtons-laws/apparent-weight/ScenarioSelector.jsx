/**
 * @file ScenarioSelector.jsx
 * @description Scenario selector for the Apparent Weight simulator. Provides
 * interactive cards for choosing between elevator, free fall, and circular motion
 * (vertical loop) modes. Each card shows an icon, label, description, and tagline.
 *
 * @module ScenarioSelector
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Building2, ArrowDownToLine, CircleDot } from 'lucide-react';

const SCENARIOS = [
  {
    id: 'elevator',
    label: 'Elevator',
    icon: Building2,
    description: 'Person on a scale in an accelerating elevator',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-300',
    activeColor: 'text-white bg-indigo-600 border-indigo-600',
    hoverColor: 'hover:border-indigo-400 hover:shadow-md',
    tagline: 'Classic demonstration',
  },
  {
    id: 'freefall',
    label: 'Free Fall',
    icon: ArrowDownToLine,
    description: 'Scale inside a falling box — experience weightlessness',
    color: 'text-purple-600 bg-purple-50 border-purple-300',
    activeColor: 'text-white bg-purple-600 border-purple-600',
    hoverColor: 'hover:border-purple-400 hover:shadow-md',
    tagline: 'Zero-g experience',
  },
  {
    id: 'circular',
    label: 'Vertical Loop',
    icon: CircleDot,
    description: 'Scale on a vertical circular track — weight changes with position',
    color: 'text-orange-600 bg-orange-50 border-orange-300',
    activeColor: 'text-white bg-orange-600 border-orange-600',
    hoverColor: 'hover:border-orange-400 hover:shadow-md',
    tagline: 'Roller coaster physics',
  },
];

/**
 * ScenarioSelector renders clickable cards for choosing simulation scenarios.
 */
const ScenarioSelector = ({ scenario, onScenarioChange, disabled, className }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {SCENARIOS.map((s) => {
        const isActive = scenario === s.id;
        const Icon = s.icon;

        return (
          <button
            key={s.id}
            onClick={() => {
              if (!disabled) {
                onScenarioChange(s.id);
              }
            }}
            disabled={disabled}
            className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
              isActive ? s.activeColor : s.color
            } ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : isActive
                  ? 'shadow-lg cursor-default'
                  : `${s.hoverColor} cursor-pointer`
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isActive ? 'bg-white/20' : 'bg-white'
                }`}
              >
                <Icon
                  size={20}
                  className={isActive ? 'text-white' : ''}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{s.label}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20' : 'bg-white/80'
                    }`}
                  >
                    {s.tagline}
                  </span>
                </div>
                <p
                  className={`text-xs mt-0.5 leading-snug ${
                    isActive ? 'text-white/80' : 'opacity-70'
                  }`}
                >
                  {s.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

ScenarioSelector.propTypes = {
  scenario: PropTypes.oneOf(['elevator', 'freefall', 'circular']).isRequired,
  onScenarioChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

ScenarioSelector.defaultProps = {
  disabled: false,
  className: '',
};

export default ScenarioSelector;