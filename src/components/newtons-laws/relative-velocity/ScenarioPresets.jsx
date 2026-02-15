/**
 * @file ScenarioPresets.jsx
 * @description Quick preset buttons for common relative velocity problems from the NEB
 * curriculum. Organizes presets by mode (1D, river crossing, rain) and allows students
 * to load pre-configured parameter sets with a single click.
 *
 * @module ScenarioPresets
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Train, Car, Bike, PersonStanding, Ship, CloudRain, Zap } from 'lucide-react';

const PRESETS_1D = [
  {
    label: 'Trains — Same Direction',
    description: 'Fast train passes slow train',
    icon: Train,
    data: { vA: 25, vB: 15, typeA: 'train', typeB: 'train' },
  },
  {
    label: 'Trains — Opposite',
    description: 'Trains approaching each other',
    icon: Train,
    data: { vA: 20, vB: -20, typeA: 'train', typeB: 'train' },
  },
  {
    label: 'Car Overtaking Cyclist',
    description: 'Car overtakes a cyclist',
    icon: Car,
    data: { vA: 20, vB: 5, typeA: 'car', typeB: 'bike' },
  },
  {
    label: 'Person on Moving Bus',
    description: 'Walking inside a moving bus',
    icon: PersonStanding,
    data: { vA: 1.5, vB: 15, typeA: 'person', typeB: 'train' },
  },
  {
    label: 'Same Speed',
    description: 'Both objects at identical speed',
    icon: Car,
    data: { vA: 15, vB: 15, typeA: 'car', typeB: 'car' },
  },
  {
    label: 'Stationary Observer',
    description: 'B stationary, A moves',
    icon: Bike,
    data: { vA: 10, vB: 0, typeA: 'bike', typeB: 'person' },
  },
];

const PRESETS_RIVER = [
  {
    label: 'Straight Across',
    description: 'Boat aims perpendicular (θ = 90°)',
    icon: Ship,
    data: { boatSpeed: 5, boatAngle: 90, riverSpeed: 3, riverWidth: 50 },
  },
  {
    label: 'Minimum Drift',
    description: 'Aim upstream to reach directly opposite',
    icon: Ship,
    data: { boatSpeed: 5, boatAngle: 126.87, riverSpeed: 3, riverWidth: 50 },
  },
  {
    label: 'Strong Current',
    description: 'Current faster than boat speed',
    icon: Ship,
    data: { boatSpeed: 3, boatAngle: 90, riverSpeed: 5, riverWidth: 50 },
  },
  {
    label: 'Wide River',
    description: 'Crossing a wide river',
    icon: Ship,
    data: { boatSpeed: 8, boatAngle: 90, riverSpeed: 4, riverWidth: 150 },
  },
  {
    label: 'Fast Boat, No Current',
    description: 'Still water crossing',
    icon: Ship,
    data: { boatSpeed: 10, boatAngle: 90, riverSpeed: 0, riverWidth: 80 },
  },
  {
    label: 'Aiming 45° Upstream',
    description: 'Boat at 45° into current',
    icon: Ship,
    data: { boatSpeed: 6, boatAngle: 135, riverSpeed: 4, riverWidth: 60 },
  },
];

const PRESETS_RAIN = [
  {
    label: 'Vertical Rain, Walking',
    description: 'Rain straight down, person walks',
    icon: CloudRain,
    data: { rainSpeed: 8, rainAngle: 90, personSpeed: 5 },
  },
  {
    label: 'Vertical Rain, Running',
    description: 'Same rain, person runs faster',
    icon: Zap,
    data: { rainSpeed: 8, rainAngle: 90, personSpeed: 10 },
  },
  {
    label: 'Windy Rain',
    description: 'Rain at 60° from horizontal',
    icon: CloudRain,
    data: { rainSpeed: 10, rainAngle: 60, personSpeed: 3 },
  },
  {
    label: 'Standing Still',
    description: 'Person stationary in vertical rain',
    icon: PersonStanding,
    data: { rainSpeed: 8, rainAngle: 90, personSpeed: 0 },
  },
  {
    label: 'Heavy Downpour',
    description: 'Fast vertical rain, slow walk',
    icon: CloudRain,
    data: { rainSpeed: 15, rainAngle: 85, personSpeed: 2 },
  },
  {
    label: 'Light Drizzle, Jogging',
    description: 'Slow rain, moderate speed',
    icon: Zap,
    data: { rainSpeed: 4, rainAngle: 90, personSpeed: 8 },
  },
];

/**
 * ScenarioPresets renders a grid of preset buttons for common physics problems.
 */
const ScenarioPresets = ({ mode, onApplyPreset, disabled, className }) => {
  const presets =
    mode === '1d'
      ? PRESETS_1D
      : mode === 'river'
        ? PRESETS_RIVER
        : PRESETS_RAIN;

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-bold text-slate-700">Quick Presets</h4>
      <div className="grid grid-cols-2 gap-1.5">
        {presets.map((preset, idx) => {
          const Icon = preset.icon;
          return (
            <button
              key={idx}
              onClick={() => {
                if (!disabled) {
                  onApplyPreset(preset.data);
                }
              }}
              disabled={disabled}
              className={`text-left p-2 rounded-lg border border-gray-200 transition-all ${
                disabled
                  ? 'opacity-50 cursor-not-allowed bg-gray-50'
                  : 'bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon size={14} className="text-indigo-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 leading-tight truncate">
                  {preset.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-1">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

ScenarioPresets.propTypes = {
  mode: PropTypes.oneOf(['1d', 'river', 'rain']).isRequired,
  onApplyPreset: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

ScenarioPresets.defaultProps = {
  disabled: false,
  className: '',
};

export default ScenarioPresets;