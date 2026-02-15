/**
 * @fileoverview Energy comparison panel for the Conservation of Momentum simulator.
 *
 * Displays a visual comparison of kinetic energy before and after a collision
 * using horizontal bars, numerical values, and status indicators. Highlights
 * energy lost (inelastic), conserved (elastic), or gained (explosion).
 *
 * @example
 * <EnergyComparison
 *   keBefore={37.5}
 *   keAfter={37.5}
 *   energyLost={0}
 *   collisionType="elastic"
 *   showAfter={true}
 * />
 *
 * @module EnergyComparison
 */

import PropTypes from 'prop-types';
import { Zap, TrendingDown, TrendingUp, Minus } from 'lucide-react';

const EnergyComparison = ({
  keBefore,
  keAfter,
  energyLost,
  collisionType,
  explosionEnergy,
  showAfter,
  className = '',
}) => {
  const keAfterSafe = keAfter ?? 0;
  const energyLostSafe = energyLost ?? 0;
  const maxKE = Math.max(keBefore, keAfterSafe, 1);

  const energyChangePercent =
    keBefore > 0 ? ((keAfterSafe - keBefore) / keBefore) * 100 : 0;

  const isEnergyConserved = Math.abs(energyLostSafe) < 0.01;
  const isEnergyLost = energyLostSafe > 0.01;
  const isEnergyGained = energyLostSafe < -0.01;

  let statusIcon;
  let statusText;
  let statusColor;

  if (!showAfter) {
    statusIcon = <Minus size={16} />;
    statusText = 'Awaiting collision...';
    statusColor = 'text-slate-400';
  } else if (isEnergyConserved) {
    statusIcon = <Zap size={16} />;
    statusText = 'KE Conserved (Elastic)';
    statusColor = 'text-emerald-600';
  } else if (isEnergyLost) {
    statusIcon = <TrendingDown size={16} />;
    statusText = `${Math.abs(energyChangePercent).toFixed(1)}% KE Lost`;
    statusColor = 'text-red-600';
  } else {
    statusIcon = <TrendingUp size={16} />;
    statusText = `${Math.abs(energyChangePercent).toFixed(1)}% KE Gained`;
    statusColor = 'text-orange-600';
  }

  const statusBg = !showAfter
    ? ''
    : isEnergyConserved
    ? 'bg-emerald-50'
    : isEnergyLost
    ? 'bg-red-50'
    : 'bg-orange-50';

  return (
    <div
      className={`bg-white rounded-xl shadow-lg border border-gray-100 p-4 ${className}`}
    >
      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
        <Zap size={18} className="text-blue-500" />
        Kinetic Energy
      </h3>

      <div className="space-y-3">
        {/* Before bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600 font-medium">Before</span>
            <span className="font-mono font-bold text-blue-600">
              {keBefore.toFixed(2)} J
            </span>
          </div>
          <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(keBefore / maxKE) * 100}%` }}
            />
          </div>
        </div>

        {/* After bar */}
        {showAfter && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 font-medium">After</span>
              <span className="font-mono font-bold text-blue-600">
                {keAfterSafe.toFixed(2)} J
              </span>
            </div>
            <div className="h-6 bg-gray-100 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(keAfterSafe / maxKE) * 100}%` }}
              />
              {/* Energy lost portion (red section) */}
              {isEnergyLost && (
                <div
                  className="absolute top-0 h-full bg-red-400 rounded-r-full transition-all duration-500 opacity-50"
                  style={{
                    left: `${(keAfterSafe / maxKE) * 100}%`,
                    width: `${(energyLostSafe / maxKE) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Energy change summary */}
        {showAfter && (
          <div
            className={`flex items-center gap-2 p-2 rounded-lg ${statusBg}`}
          >
            <span className={statusColor}>{statusIcon}</span>
            <span className={`text-sm font-semibold ${statusColor}`}>
              {statusText}
            </span>
          </div>
        )}

        {/* Detailed breakdown */}
        {showAfter && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <div className="text-slate-500">KE Before</div>
              <div className="font-mono font-bold text-slate-700">
                {keBefore.toFixed(2)} J
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <div className="text-slate-500">KE After</div>
              <div className="font-mono font-bold text-slate-700">
                {keAfterSafe.toFixed(2)} J
              </div>
            </div>
            {isEnergyLost && (
              <div className="col-span-2 bg-red-50 rounded-lg p-2 text-center">
                <div className="text-red-500">
                  Energy Lost (Heat, Sound, Deformation)
                </div>
                <div className="font-mono font-bold text-red-700">
                  {energyLostSafe.toFixed(2)} J
                </div>
              </div>
            )}
            {isEnergyGained && (
              <div className="col-span-2 bg-orange-50 rounded-lg p-2 text-center">
                <div className="text-orange-500">
                  Energy Added (Internal → KE)
                </div>
                <div className="font-mono font-bold text-orange-700">
                  {Math.abs(energyLostSafe).toFixed(2)} J
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

EnergyComparison.propTypes = {
  keBefore: PropTypes.number.isRequired,
  keAfter: PropTypes.number,
  energyLost: PropTypes.number,
  collisionType: PropTypes.string.isRequired,
  explosionEnergy: PropTypes.number,
  showAfter: PropTypes.bool.isRequired,
  className: PropTypes.string,
};

export default EnergyComparison;