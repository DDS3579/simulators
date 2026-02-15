/**
 * @fileoverview CollisionTypeSelector — lets users pick between
 * elastic, inelastic, partially-inelastic, and explosion collisions.
 * Shows a restitution slider for 'partial' and an energy slider for
 * 'explosion' mode.
 *
 * Used by MomentumConservation.jsx.
 */

import PropTypes from 'prop-types';

const TYPES = [
    {
        id: 'elastic',
        label: 'Elastic',
        color: 'indigo',
        desc: 'KE conserved (e = 1)',
    },
    {
        id: 'inelastic',
        label: 'Perfectly Inelastic',
        color: 'amber',
        desc: 'Objects stick (e = 0)',
    },
    {
        id: 'partial',
        label: 'Partial',
        color: 'emerald',
        desc: 'Custom restitution',
    },
    {
        id: 'explosion',
        label: 'Explosion',
        color: 'red',
        desc: 'Objects pushed apart',
    },
];

const colorMap = {
    indigo: {
        active: 'bg-indigo-600 text-white border-indigo-600',
        dot: 'bg-indigo-500',
    },
    amber: {
        active: 'bg-amber-600 text-white border-amber-600',
        dot: 'bg-amber-500',
    },
    emerald: {
        active: 'bg-emerald-600 text-white border-emerald-600',
        dot: 'bg-emerald-500',
    },
    red: {
        active: 'bg-red-600 text-white border-red-600',
        dot: 'bg-red-500',
    },
};

export default function CollisionTypeSelector({
    collisionType,
    onTypeChange,
    restitution,
    onRestitutionChange,
    explosionEnergy,
    onExplosionEnergyChange,
    disabled,
}) {
    return (
        <div className="space-y-3">
            {/* Type buttons */}
            <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => {
                    const isActive = collisionType === t.id;
                    const colors = colorMap[t.color];
                    return (
                        <button
                            key={t.id}
                            onClick={() => onTypeChange(t.id)}
                            disabled={disabled}
                            className={`p-2 rounded-lg border-2 text-left transition-all text-xs ${isActive
                                    ? colors.active
                                    : 'bg-white text-slate-600 border-gray-200 hover:border-gray-300'
                                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <div className="flex items-center gap-1.5">
                                <div
                                    className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : colors.dot
                                        }`}
                                />
                                <span className="font-semibold">{t.label}</span>
                            </div>
                            <p
                                className={`mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-400'
                                    }`}
                            >
                                {t.desc}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Restitution slider (partial mode) */}
            {collisionType === 'partial' && (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                    <label className="flex items-center justify-between text-sm font-medium text-emerald-800 mb-1">
                        <span>Coefficient of Restitution (e)</span>
                        <span className="font-mono text-emerald-600">
                            {restitution.toFixed(2)}
                        </span>
                    </label>
                    <input
                        type="range"
                        min={0.01}
                        max={0.99}
                        step={0.01}
                        value={restitution}
                        onChange={(e) => onRestitutionChange(Number(e.target.value))}
                        disabled={disabled}
                        className="w-full accent-emerald-600"
                    />
                    <div className="flex justify-between text-[10px] text-emerald-500 mt-0.5">
                        <span>Nearly inelastic</span>
                        <span>Nearly elastic</span>
                    </div>
                </div>
            )}

            {/* Explosion energy slider */}
            {collisionType === 'explosion' && (
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <label className="flex items-center justify-between text-sm font-medium text-red-800 mb-1">
                        <span>Explosion Energy</span>
                        <span className="font-mono text-red-600">
                            {explosionEnergy.toFixed(0)} J
                        </span>
                    </label>
                    <input
                        type="range"
                        min={5}
                        max={500}
                        step={5}
                        value={explosionEnergy}
                        onChange={(e) => onExplosionEnergyChange(Number(e.target.value))}
                        disabled={disabled}
                        className="w-full accent-red-600"
                    />
                    <div className="flex justify-between text-[10px] text-red-500 mt-0.5">
                        <span>Gentle push</span>
                        <span>Powerful blast</span>
                    </div>
                </div>
            )}
        </div>
    );
}

CollisionTypeSelector.propTypes = {
    collisionType: PropTypes.string.isRequired,
    onTypeChange: PropTypes.func.isRequired,
    restitution: PropTypes.number.isRequired,
    onRestitutionChange: PropTypes.func.isRequired,
    explosionEnergy: PropTypes.number.isRequired,
    onExplosionEnergyChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
};

CollisionTypeSelector.defaultProps = {
    disabled: false,
};
