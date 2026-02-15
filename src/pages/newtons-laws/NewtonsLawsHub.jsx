/**
 * @fileoverview Newton's Laws Hub Page — central navigation for all
 * Newton's Laws simulators. Provides card links to each simulator
 * with descriptions and visual status.
 *
 * @route /simulators/newtons-laws
 * @module NewtonsLawsHub
 */

import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Gauge,
    Scale,
    Zap,
    Activity,
    ArrowRightLeft,
    Sparkles,
} from 'lucide-react';

const SIMULATORS = [
    {
        title: "Newton's Second Law",
        subtitle: 'F = ma',
        description:
            'Explore how force, mass, and acceleration relate. Push objects on various surfaces and watch the motion unfold in real time.',
        path: '/simulators/newtons-laws/second-law',
        icon: Gauge,
        gradient: 'from-blue-500 to-cyan-500',
        bgGlow: 'bg-blue-100',
    },
    {
        title: 'Apparent Weight',
        subtitle: 'Elevator & N forces',
        description:
            'Stand on a scale inside an accelerating elevator and see how the normal force changes — experience weightlessness and heaviness.',
        path: '/simulators/newtons-laws/apparent-weight',
        icon: Scale,
        gradient: 'from-emerald-500 to-teal-500',
        bgGlow: 'bg-emerald-100',
    },
    {
        title: 'Impulse & Momentum',
        subtitle: 'J = FΔt = Δp',
        description:
            'Drop balls onto different surfaces to discover how collision time affects peak force while impulse stays constant.',
        path: '/simulators/newtons-laws/impulse-momentum',
        icon: Zap,
        gradient: 'from-violet-500 to-purple-500',
        bgGlow: 'bg-violet-100',
    },
    {
        title: 'Conservation of Momentum',
        subtitle: 'm₁u₁ + m₂u₂ = m₁v₁ + m₂v₂',
        description:
            'Collide two objects on a frictionless track — elastic, inelastic, or explosions. Watch momentum conserve while energy transforms.',
        path: '/simulators/newtons-laws/conservation',
        icon: Activity,
        gradient: 'from-amber-500 to-orange-500',
        bgGlow: 'bg-amber-100',
    },
    {
        title: 'Relative Velocity',
        subtitle: 'v⃗_A/B = v⃗_A/G − v⃗_B/G',
        description:
            'Switch reference frames to see how velocity measurements change — 1D cars, river crossing, and rain on a moving person.',
        path: '/simulators/newtons-laws/relative-velocity',
        icon: ArrowRightLeft,
        gradient: 'from-rose-500 to-pink-500',
        bgGlow: 'bg-rose-100',
    },
];

export default function NewtonsLawsHub() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 border border-white/60">
                    <div className="flex items-start gap-4">
                        <Link
                            to="/"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
                        >
                            <ArrowLeft size={22} className="text-slate-600" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-4xl">🍎</span>
                                <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    Newton's Laws
                                </h1>
                            </div>
                            <p className="text-slate-500 text-base md:text-lg max-w-2xl leading-relaxed">
                                Interactive simulations covering force, motion, momentum, and
                                reference frames. Each simulator lets you tweak parameters and
                                watch the physics play out in real time.
                            </p>
                            <div className="flex items-center gap-2 mt-3 text-sm text-indigo-600">
                                <Sparkles size={16} />
                                <span className="font-medium">
                                    {SIMULATORS.length} simulators available
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Simulator cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {SIMULATORS.map((sim) => {
                        const Icon = sim.icon;
                        return (
                            <Link
                                key={sim.path}
                                to={sim.path}
                                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Coloured top bar */}
                                <div
                                    className={`h-1.5 w-full bg-gradient-to-r ${sim.gradient}`}
                                />

                                <div className="p-5">
                                    {/* Icon + title */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <div
                                            className={`${sim.bgGlow} p-2.5 rounded-xl group-hover:scale-110 transition-transform`}
                                        >
                                            <Icon
                                                size={22}
                                                className={`text-${sim.gradient.split('-')[1]}-600`}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-800 text-lg leading-tight">
                                                {sim.title}
                                            </h3>
                                            <p className="text-xs font-mono text-slate-400 mt-0.5">
                                                {sim.subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        {sim.description}
                                    </p>

                                    {/* CTA */}
                                    <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                                        <span>Launch Simulator</span>
                                        <span className="group-hover:translate-x-1 transition-transform">
                                            →
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Footer note */}
                <div className="text-center text-sm text-slate-400 pb-4">
                    Part of the Physics Simulator Collection · Built for high school
                    students
                </div>
            </div>
        </div>
    );
}
