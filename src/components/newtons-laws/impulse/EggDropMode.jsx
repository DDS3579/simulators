/**
 * @fileoverview Egg Drop Challenge panel for the Impulse-Momentum Theorem simulator.
 *
 * Students determine whether a fragile egg survives a fall onto various surfaces.
 * The panel demonstrates that longer collision times reduce peak force even though
 * the impulse (change in momentum) remains the same. This is the physics behind
 * helmets, airbags, crumple zones, and protective padding.
 *
 * @example
 * <EggDropMode
 *   dropHeight={5}
 *   onDropHeightChange={setHeight}
 *   surfaceType="foam"
 *   onSurfaceTypeChange={setSurface}
 *   customTime={0.05}
 *   onCustomTimeChange={setCustomTime}
 *   gravity={9.8}
 *   disabled={false}
 * />
 *
 * @module EggDropMode
 */

import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Egg, AlertTriangle, ShieldCheck, ShieldX } from 'lucide-react';
import ParamSlider from '../shared/ParamSlider';
import SurfaceSelector from './SurfaceSelector';
import {
  impactVelocity,
  calculateImpulse,
  eggDropCheck,
} from '../../../utils/newtons-laws/collisionPhysics';

const EGG_MASS = 0.06;
const DEFAULT_BREAKING_FORCE = 25;
const MIN_BREAKING_FORCE = 5;
const MAX_BREAKING_FORCE = 100;
const EGG_RESTITUTION = 0.05;

const SURFACE_COLLISION_TIMES = {
  concrete: 0.005,
  wood: 0.02,
  foam: 0.08,
  trampoline: 0.2,
};

const EggDropMode = ({
  dropHeight,
  onDropHeightChange,
  surfaceType,
  onSurfaceTypeChange,
  customTime,
  onCustomTimeChange,
  gravity,
  disabled = false,
  className = '',
}) => {
  const [breakingForce, setBreakingForce] = useState(DEFAULT_BREAKING_FORCE);

  const results = useMemo(() => {
    const collisionTime =
      surfaceType === 'custom'
        ? customTime
        : SURFACE_COLLISION_TIMES[surfaceType] ?? 0.02;

    const vImpact = impactVelocity(dropHeight, gravity);

    const impulseResult = calculateImpulse({
      mass: EGG_MASS,
      impactSpeed: vImpact,
      restitution: EGG_RESTITUTION,
      collisionTime,
      gravity,
    });

    const check = eggDropCheck(impulseResult.peakForce, breakingForce);

    // Compute max safe height:
    // peakForce = (π/2) * avgForce = (π/2) * impulse / collisionTime
    // impulse = mass * vImpact * (1 + e)
    // So peakForce = (π/2) * mass * vImpact * (1 + e) / collisionTime
    // Set peakForce = breakingForce and solve for vImpact:
    // vImpact = breakingForce * collisionTime / ((π/2) * mass * (1 + e))
    // Then maxSafeHeight = vImpact² / (2 * gravity)
    const safeVImpact =
      (breakingForce * collisionTime) /
      ((Math.PI / 2) * EGG_MASS * (1 + EGG_RESTITUTION));
    const maxSafeHeight = Math.max(
      0,
      Math.min(20, (safeVImpact * safeVImpact) / (2 * gravity))
    );

    return {
      vImpact,
      collisionTime,
      peakForce: impulseResult.peakForce,
      avgForce: impulseResult.avgForce,
      impulse: impulseResult.impulse,
      survives: check.survives,
      ratio: check.ratio,
      maxSafeHeight,
    };
  }, [dropHeight, gravity, surfaceType, customTime, breakingForce]);

  const surfaceLabel =
    surfaceType === 'custom'
      ? 'custom surface'
      : surfaceType.charAt(0).toUpperCase() + surfaceType.slice(1);

  return (
    <div
      className={`bg-white rounded-xl shadow-lg border border-gray-100 p-4 ${className}`}
    >
      {/* Title row */}
      <div className="flex items-center gap-2 mb-4">
        <Egg size={20} className="text-amber-500" />
        <h3 className="font-bold text-slate-800">Egg Drop Challenge</h3>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500 mb-4">
        Can the egg survive the fall? Longer collision time = lower peak force =
        safer landing.
      </p>

      {/* Drop Height slider */}
      <ParamSlider
        label="Drop Height"
        value={dropHeight}
        onChange={onDropHeightChange}
        min={0.1}
        max={20}
        step={0.1}
        unit="m"
        disabled={disabled}
      />

      {/* Breaking Force slider */}
      <ParamSlider
        label="Egg Strength"
        value={breakingForce}
        onChange={setBreakingForce}
        min={MIN_BREAKING_FORCE}
        max={MAX_BREAKING_FORCE}
        step={1}
        unit="N"
        disabled={disabled}
        note="Force threshold before egg cracks"
      />

      {/* Surface selector */}
      <SurfaceSelector
        selected={surfaceType}
        onSelect={onSurfaceTypeChange}
        customTime={customTime}
        onCustomTimeChange={onCustomTimeChange}
        disabled={disabled}
        className="mt-3"
      />

      {/* Results card */}
      <div
        className={`mt-4 p-3 rounded-lg border-2 ${
          results.survives
            ? 'border-emerald-300 bg-emerald-50'
            : 'border-red-300 bg-red-50'
        }`}
      >
        {/* Survival icon + text */}
        <div className="flex items-center gap-2 mb-2">
          {results.survives ? (
            <ShieldCheck className="text-emerald-600" size={24} />
          ) : (
            <ShieldX className="text-red-600" size={24} />
          )}
          <span
            className={`font-bold text-lg ${
              results.survives ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {results.survives ? 'Egg Survives!' : 'Egg Breaks!'}
          </span>
        </div>

        {/* Force comparison */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Peak Force:</span>
            <span
              className={`font-mono font-bold ${
                results.survives ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {results.peakForce.toFixed(1)} N
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Egg Strength:</span>
            <span className="font-mono font-bold text-slate-700">
              {breakingForce.toFixed(0)} N
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Force Ratio:</span>
            <span className="font-mono">{results.ratio.toFixed(2)}×</span>
          </div>
        </div>

        {/* Force comparison bar */}
        <div className="mt-2">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                results.survives ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              style={{
                width: `${Math.min(results.ratio * 100, 100)}%`,
              }}
            />
            {/* Threshold marker line at 100% */}
            <div className="absolute right-0 top-0 h-full w-0.5 bg-slate-800" />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-0.5">
            <span>0 N</span>
            <span>{breakingForce} N</span>
          </div>
        </div>

        {/* Max safe height hint */}
        <div className="mt-2 pt-2 border-t border-opacity-30 text-xs text-slate-600">
          <span className="font-medium">
            Max safe height on {surfaceLabel}:
          </span>
          <span className="font-mono ml-1 font-bold text-indigo-600">
            {results.maxSafeHeight.toFixed(2)} m
          </span>
        </div>
      </div>

      {/* Educational note */}
      <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
        <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
        <span>
          Same impulse (Δp) is delivered regardless of surface. Softer surfaces
          spread the force over a longer time, reducing peak force. This is why
          helmets, airbags, and padding work!
        </span>
      </div>
    </div>
  );
};

EggDropMode.propTypes = {
  dropHeight: PropTypes.number.isRequired,
  onDropHeightChange: PropTypes.func.isRequired,
  surfaceType: PropTypes.string.isRequired,
  onSurfaceTypeChange: PropTypes.func.isRequired,
  customTime: PropTypes.number.isRequired,
  onCustomTimeChange: PropTypes.func.isRequired,
  gravity: PropTypes.number.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default EggDropMode;