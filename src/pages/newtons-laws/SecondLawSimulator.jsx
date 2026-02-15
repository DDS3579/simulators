/**
 * @module SecondLawSimulator
 *
 * @description
 * The main page component for the Newton's Second Law (F = ma) interactive
 * simulator. This is the orchestrator that connects user inputs, the physics
 * engine, canvas rendering, and all UI display components.
 *
 * Students can:
 * 1. Place a block on a flat surface or inclined plane
 * 2. Apply a force (magnitude + direction)
 * 3. Watch the block accelerate based on F = ma
 * 4. See the Free Body Diagram update in real-time
 * 5. Toggle friction on/off and adjust coefficients
 * 6. Switch between flat surface and inclined plane modes
 * 7. View the live equation: F_net = F_applied − f = m × a
 *
 * Architecture:
 * - Physics state (position, velocity) lives in useRef for 60fps canvas reads
 * - UI-visible values (stats, equation) live in useState, throttled by useAnimationLoop
 * - Canvas rendering is imperative via PhysicsCanvas.render()
 * - All physics calculations are pure functions from forceCalculations.js
 *
 * @route /simulators/newtons-laws/second-law
 *
 * @dependents None — this is a page-level component
 *
 * @example
 * ```jsx
 * // In React Router:
 * <Route path="/simulators/newtons-laws/second-law" element={<SecondLawSimulator />} />
 * ```
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import {
  Mountain,
  Minus,
  Eye,
  ArrowRight,
  Gauge,
  RotateCcw,
} from 'lucide-react';

// Phase 1 — shared components
import PhysicsCanvas from '../../components/newtons-laws/shared/PhysicsCanvas';
import ParamSlider from '../../components/newtons-laws/shared/ParamSlider';
import PlaybackControls from '../../components/newtons-laws/shared/PlaybackControls';
import StatCard from '../../components/newtons-laws/shared/StatCard';
import EquationBar from '../../components/newtons-laws/shared/EquationBar';

// Phase 1 — hooks
import { useAnimationLoop } from '../../hooks/newtons-laws/useAnimationLoop';

// Phase 2 — simulator-specific components
import FreeBodyDiagram from '../../components/newtons-laws/second-law/FreeBodyDiagram';
import FrictionControls from '../../components/newtons-laws/second-law/FrictionControls';
import FormulaSheet from '../../components/newtons-laws/second-law/FormulaSheet';
import { drawFlatScene } from '../../components/newtons-laws/second-law/BlockRenderer';
import { drawInclineScene } from '../../components/newtons-laws/second-law/InclinedPlane';
import { drawForceDecompositionDiagram } from '../../components/newtons-laws/second-law/ForceDecomposition';

// Physics engine
import {
  calculateFlatForces,
  calculateInclineForces,
  updateKinematics,
  getCriticalAngle,
  getMinForceToMove,
} from '../../utils/newtons-laws/forceCalculations';

// ─── Constants ────────────────────────────────────────────────────

const GRAVITY_PRESETS = [
  { label: 'Earth (9.8)', value: 9.8 },
  { label: 'Earth (10)', value: 10.0 },
  { label: 'Moon (1.62)', value: 1.62 },
  { label: 'Mars (3.71)', value: 3.71 },
];

const POSITION_MIN = 0;
const POSITION_MAX = 20;
const BLOCK_WIDTH = 1;
const BLOCK_HEIGHT = 0.8;
const BLOCK_SIZE_INCLINE = 0.8;

const INITIAL_DISPLAY_STATE = {
  position: 0,
  velocity: 0,
  acceleration: 0,
  netForce: 0,
  frictionForce: 0,
  normalForce: 0,
  weight: 0,
  isStationary: true,
  weightParallel: 0,
  weightPerp: 0,
};

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

// ═══════════════════════════════════════════════════════════════════
// INTERNAL SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

/**
 * A styled checkbox toggle for display options.
 */
function ToggleCheckbox({ label, checked, onChange, color = 'indigo' }) {
  const colorClasses = {
    indigo: 'bg-indigo-600 border-indigo-600',
    blue: 'bg-blue-600 border-blue-600',
    purple: 'bg-purple-600 border-purple-600',
    emerald: 'bg-emerald-600 border-emerald-600',
    cyan: 'bg-cyan-600 border-cyan-600',
    amber: 'bg-amber-600 border-amber-600',
  };

  const activeClass = colorClasses[color] || colorClasses.indigo;

  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none group">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={`
            w-4 h-4 rounded border-2 transition-all duration-150
            flex items-center justify-center
            ${checked
              ? `${activeClass} text-white`
              : 'bg-white border-gray-300 group-hover:border-gray-400'
            }
          `}
        >
          {checked && (
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={4}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-xs font-medium text-gray-600 group-hover:text-gray-800 transition-colors">
        {label}
      </span>
    </label>
  );
}

ToggleCheckbox.propTypes = {
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  color: PropTypes.string,
};

ToggleCheckbox.defaultProps = {
  color: 'indigo',
};

/**
 * Status bar showing the current physics state in plain language.
 */
function StatusBar({ isStationary, isRunning, velocity, hitBoundary, position }) {
  let message = '';
  let bgClass = 'bg-gray-50 border-gray-200 text-gray-500';
  let icon = '💤';

  if (!isRunning && Math.abs(velocity) < 0.001 && position < 0.01) {
    message = 'Ready — Press Launch to start the simulation';
    icon = '🚀';
    bgClass = 'bg-indigo-50 border-indigo-200 text-indigo-600';
  } else if (isStationary && isRunning) {
    message = 'Static friction holds the block — applied force is not enough to overcome friction';
    icon = '🧱';
    bgClass = 'bg-amber-50 border-amber-200 text-amber-700';
  } else if (hitBoundary) {
    message = `Block reached the boundary at x = ${position.toFixed(1)} m`;
    icon = '🚧';
    bgClass = 'bg-red-50 border-red-200 text-red-600';
  } else if (Math.abs(velocity) < 0.01 && isRunning) {
    message = 'Block has stopped — friction brought it to rest (or no net force)';
    icon = '⏹';
    bgClass = 'bg-green-50 border-green-200 text-green-700';
  } else if (isRunning) {
    const dir = velocity > 0 ? 'rightward' : 'leftward';
    message = `Block is moving ${dir} at ${Math.abs(velocity).toFixed(2)} m/s`;
    icon = velocity > 0 ? '➡️' : '⬅️';
    bgClass = 'bg-blue-50 border-blue-200 text-blue-600';
  } else if (Math.abs(velocity) > 0.01) {
    message = `Paused — velocity is ${velocity.toFixed(2)} m/s. Press Resume to continue.`;
    icon = '⏸';
    bgClass = 'bg-purple-50 border-purple-200 text-purple-600';
  } else {
    message = 'Simulation paused';
    icon = '⏸';
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${bgClass} transition-all duration-300`}>
      <span className="text-base flex-shrink-0" aria-hidden="true">{icon}</span>
      <p className="text-xs font-medium leading-tight">{message}</p>
    </div>
  );
}

StatusBar.propTypes = {
  isStationary: PropTypes.bool.isRequired,
  isRunning: PropTypes.bool.isRequired,
  velocity: PropTypes.number.isRequired,
  hitBoundary: PropTypes.bool.isRequired,
  position: PropTypes.number.isRequired,
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

function SecondLawSimulator() {
  // ─── Mode ──────────────────────────────────────────────────
  const [mode, setMode] = useState('flat');

  // ─── Physics parameters (user-adjustable) ──────────────────
  const [mass, setMass] = useState(5);
  const [appliedForce, setAppliedForce] = useState(20);
  const [gravity, setGravity] = useState(9.8);
  const [inclineAngle, setInclineAngle] = useState(30);
  const [frictionEnabled, setFrictionEnabled] = useState(true);
  const [muStatic, setMuStatic] = useState(0.3);
  const [muKinetic, setMuKinetic] = useState(0.2);

  // ─── Display toggles ──────────────────────────────────────
  const [showForceArrows, setShowForceArrows] = useState(true);
  const [showVelocityArrow, setShowVelocityArrow] = useState(true);
  const [showAccelArrow, setShowAccelArrow] = useState(false);
  const [showComponents, setShowComponents] = useState(true);
  const [showFBD, setShowFBD] = useState(true);

  // ─── Physics state (ref-based for animation perf) ──────────
  const positionRef = useRef(0);
  const velocityRef = useRef(0);
  const forcesRef = useRef(null);

  // ─── UI display state ──────────────────────────────────────
  const [displayState, setDisplayState] = useState(INITIAL_DISPLAY_STATE);

  // ─── Refs ──────────────────────────────────────────────────
  const canvasRef = useRef(null);
  const [fbdTrigger, setFbdTrigger] = useState(0);

  // ─── Derived values ────────────────────────────────────────
  const criticalAngle = useMemo(() => getCriticalAngle(muStatic), [muStatic]);

  const minForceToMove = useMemo(() => {
    if (mode === 'flat') {
      return getMinForceToMove(mass, gravity, muStatic);
    }
    const angleRad = (inclineAngle * Math.PI) / 180;
    return mass * gravity * Math.sin(angleRad) + muStatic * mass * gravity * Math.cos(angleRad);
  }, [mode, mass, gravity, muStatic, inclineAngle]);

  // ─── Force calculator ──────────────────────────────────────
  const calculateCurrentForces = useCallback(
    (vel) => {
      if (mode === 'flat') {
        return calculateFlatForces({
          mass, appliedForce, gravity, muStatic, muKinetic, frictionEnabled, velocity: vel,
        });
      }
      return calculateInclineForces({
        mass, appliedForce, gravity, angleDeg: inclineAngle,
        muStatic, muKinetic, frictionEnabled, velocity: vel,
      });
    },
    [mode, mass, appliedForce, gravity, inclineAngle, muStatic, muKinetic, frictionEnabled]
  );

  // ─── Display state syncer ──────────────────────────────────
  const syncDisplayState = useCallback((pos, vel, forces) => {
    setDisplayState({
      position: pos,
      velocity: vel,
      acceleration: forces.acceleration,
      netForce: forces.netForce,
      frictionForce: forces.frictionForce,
      normalForce: forces.normal,
      weight: forces.weight,
      isStationary: forces.isStationary,
      weightParallel: forces.weightParallel || 0,
      weightPerp: forces.weightPerp || 0,
    });
  }, []);

  // ─── Animation tick ────────────────────────────────────────
  const onTick = useCallback(
    (dt, totalTime) => {
      // Handle reset (dt=0, totalTime=0)
      if (dt === 0 && totalTime === 0) {
        positionRef.current = 0;
        velocityRef.current = 0;
        const forces = calculateCurrentForces(0);
        forcesRef.current = forces;
        syncDisplayState(0, 0, forces);
        if (canvasRef.current) canvasRef.current.render();
        setFbdTrigger((p) => p + 1);
        return true;
      }

      // 1. Calculate forces
      let forces = calculateCurrentForces(velocityRef.current);
      forcesRef.current = forces;

      // 2. Update kinematics
      const kin = updateKinematics({
        velocity: velocityRef.current,
        position: positionRef.current,
        acceleration: forces.acceleration,
        dt,
        minPos: POSITION_MIN,
        maxPos: POSITION_MAX,
      });

      // 3. Recalculate if friction stopped the block
      if (kin.stopped) {
        forces = calculateCurrentForces(0);
        forcesRef.current = forces;
      }

      // 4. Store new state
      velocityRef.current = kin.velocity;
      positionRef.current = kin.position;

      // 5. Sync display
      syncDisplayState(kin.position, kin.velocity, forces);

      // 6. Render
      if (canvasRef.current) canvasRef.current.render();
      setFbdTrigger((p) => p + 1);

      return true;
    },
    [calculateCurrentForces, syncDisplayState]
  );

  // ─── Animation loop hook ───────────────────────────────────
  const {
    time, isRunning, speed,
    reset, togglePlayPause, setSpeed,
  } = useAnimationLoop({ onTick, maxTime: null, initialSpeed: 1 });

  // ─── Handlers ──────────────────────────────────────────────
  const handleReset = useCallback(() => { reset(); }, [reset]);

  const handleModeSwitch = useCallback(
    (newMode) => {
      if (newMode === mode) return;
      setMode(newMode);
      positionRef.current = 0;
      velocityRef.current = 0;
      reset();
    },
    [mode, reset]
  );

  // ─── Recalculate when params change while paused ───────────
  useEffect(() => {
    if (!isRunning) {
      const forces = calculateCurrentForces(velocityRef.current);
      forcesRef.current = forces;
      syncDisplayState(positionRef.current, velocityRef.current, forces);
      requestAnimationFrame(() => {
        if (canvasRef.current) canvasRef.current.render();
      });
      setFbdTrigger((p) => p + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, mass, appliedForce, gravity, inclineAngle, muStatic, muKinetic, frictionEnabled, isRunning]);

  // ─── Canvas draw ───────────────────────────────────────────
  const draw = useCallback(
    (ctx, helpers) => {
      if (mode === 'flat') {
        drawFlatScene(ctx, helpers, {
          position: positionRef.current,
          velocity: velocityRef.current,
          blockWidth: BLOCK_WIDTH,
          blockHeight: BLOCK_HEIGHT,
          appliedForce,
          frictionForce: forcesRef.current?.frictionForce || 0,
          netForce: forcesRef.current?.netForce || 0,
          mass,
          showForceArrows,
          showVelocityArrow,
          showAccelArrow,
          acceleration: forcesRef.current?.acceleration || 0,
          normal: forcesRef.current?.normal || 0,
          weight: forcesRef.current?.weight || 0,
        });
      } else {
        drawInclineScene(ctx, helpers, {
          angleDeg: inclineAngle,
          position: positionRef.current,
          velocity: velocityRef.current,
          mass,
          appliedForce,
          frictionForce: forcesRef.current?.frictionForce || 0,
          normal: forcesRef.current?.normal || 0,
          weightParallel: forcesRef.current?.weightParallel || 0,
          weightPerp: forcesRef.current?.weightPerp || 0,
          weight: forcesRef.current?.weight || 0,
          netForce: forcesRef.current?.netForce || 0,
          acceleration: forcesRef.current?.acceleration || 0,
          blockSize: BLOCK_SIZE_INCLINE,
          showForceArrows,
          showVelocityArrow,
          showComponents,
        });

        if (showComponents) {
          drawForceDecompositionDiagram(ctx, {
            x: helpers.width - 180,
            y: 10,
            size: 160,
            angleDeg: inclineAngle,
            weight: forcesRef.current?.weight || 0,
            weightParallel: forcesRef.current?.weightParallel || 0,
            weightPerp: forcesRef.current?.weightPerp || 0,
          });
        }
      }
    },
    [mode, mass, appliedForce, inclineAngle, showForceArrows, showVelocityArrow, showAccelArrow, showComponents]
  );

  // ─── World bounds ──────────────────────────────────────────
  const worldBounds = useMemo(() => {
    if (mode === 'flat') {
      return { minX: -1, maxX: 22, minY: -1, maxY: 5 };
    }
    const angleRad = (inclineAngle * Math.PI) / 180;
    const len = 18;
    return {
      minX: -1,
      maxX: len * Math.cos(angleRad) + 2,
      minY: -1,
      maxY: len * Math.sin(angleRad) + 2,
    };
  }, [mode, inclineAngle]);

  // ─── FBD forces ────────────────────────────────────────────
  const fbdForces = useMemo(() => {
    const f = [];
    const ds = displayState;

    if (Math.abs(appliedForce) > 0.01) {
      let dir;
      if (mode === 'flat') {
        dir = appliedForce > 0 ? 0 : 180;
      } else {
        dir = appliedForce > 0 ? 90 - inclineAngle : 270 + inclineAngle;
      }
      f.push({ label: 'F', subscript: 'app', magnitude: Math.abs(appliedForce), direction: dir, color: '#6366f1' });
    }

    if (ds.weight > 0.01) {
      f.push({ label: 'W', subscript: '', magnitude: ds.weight, direction: 270, color: '#ef4444' });
    }

    if (ds.normalForce > 0.01) {
      f.push({ label: 'N', subscript: '', magnitude: ds.normalForce, direction: mode === 'flat' ? 90 : 90 + inclineAngle, color: '#10b981' });
    }

    if (frictionEnabled && Math.abs(ds.frictionForce) > 0.01) {
      let frDir;
      if (mode === 'flat') {
        frDir = ds.frictionForce > 0 ? 0 : 180;
      } else {
        frDir = ds.frictionForce > 0 ? 90 - inclineAngle : 270 + inclineAngle;
      }
      f.push({ label: 'f', subscript: '', magnitude: Math.abs(ds.frictionForce), direction: frDir, color: '#f59e0b' });
    }

    return f;
  }, [displayState, appliedForce, mode, inclineAngle, frictionEnabled]);

  // ─── FBD net force ─────────────────────────────────────────
  const fbdNetForce = useMemo(() => {
    const mag = Math.abs(displayState.netForce);
    if (mag < 0.01) return null;
    let dir;
    if (mode === 'flat') {
      dir = displayState.netForce > 0 ? 0 : 180;
    } else {
      dir = displayState.netForce > 0 ? 90 - inclineAngle : 270 + inclineAngle;
    }
    return { magnitude: mag, direction: dir, color: '#8b5cf6' };
  }, [displayState.netForce, mode, inclineAngle]);

  // ─── Equation parts ────────────────────────────────────────
  const equationParts = useMemo(() => [
    { type: 'variable', content: 'F', subscript: 'net', color: 'text-purple-600' },
    { type: 'equals', content: '=' },
    { type: 'value', content: displayState.netForce, unit: 'N', color: 'text-purple-600', highlight: true },
    { type: 'equals', content: '=' },
    { type: 'variable', content: 'm', color: 'text-gray-700' },
    { type: 'operator', content: '×' },
    { type: 'variable', content: 'a', color: 'text-indigo-600' },
    { type: 'equals', content: '=' },
    { type: 'value', content: mass, unit: 'kg', color: 'text-gray-700' },
    { type: 'operator', content: '×' },
    { type: 'value', content: displayState.acceleration, unit: 'm/s²', color: 'text-indigo-600', highlight: true },
  ], [displayState.netForce, displayState.acceleration, mass]);

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 p-3 md:p-6"
    >
      <div className="max-w-7xl mx-auto">

        {/* ═══════ HEADER ═══════ */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-5 mb-4 md:mb-5 border border-indigo-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-indigo-600">⚡</span>
                Newton&apos;s Second Law
                <span className="text-indigo-600 font-mono text-lg md:text-xl">F = ma</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Explore how force, mass, and acceleration are related. Apply forces to a block
                and observe Newton&apos;s Second Law in action.
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 self-start sm:self-auto flex-shrink-0">
              <button
                onClick={() => handleModeSwitch('flat')}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold
                  transition-all duration-150
                  ${mode === 'flat'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
                aria-pressed={mode === 'flat'}
              >
                <Minus size={14} />
                Flat Surface
              </button>
              <button
                onClick={() => handleModeSwitch('incline')}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold
                  transition-all duration-150
                  ${mode === 'incline'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
                aria-pressed={mode === 'incline'}
              >
                <Mountain size={14} />
                Inclined Plane
              </button>
            </div>
          </div>
        </div>

        {/* ═══════ MAIN GRID ═══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">

          {/* ═══════ LEFT PANEL ═══════ */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">

            {/* Parameters */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <Gauge size={14} className="text-indigo-500" />
                Parameters
              </h3>

              <ParamSlider
                label="Mass (m)"
                value={mass}
                onChange={setMass}
                min={0.5}
                max={50}
                step={0.5}
                unit=" kg"
                precision={1}
              />

              <ParamSlider
                label="Applied Force (F)"
                value={appliedForce}
                onChange={setAppliedForce}
                min={-100}
                max={100}
                step={0.5}
                unit=" N"
                precision={1}
                note={mode === 'flat' ? 'Negative = leftward' : 'Negative = down-slope'}
              />

              {mode === 'incline' && (
                <ParamSlider
                  label="Incline Angle (θ)"
                  value={inclineAngle}
                  onChange={setInclineAngle}
                  min={0}
                  max={60}
                  step={1}
                  unit="°"
                  precision={0}
                  note={`Critical angle: ${criticalAngle.toFixed(1)}°`}
                />
              )}

              {/* Gravity selector */}
              <div className="mt-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Gravity (g)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {GRAVITY_PRESETS.map((preset) => {
                    const isActive = Math.abs(gravity - preset.value) < 0.01;
                    return (
                      <button
                        key={preset.value}
                        onClick={() => setGravity(preset.value)}
                        className={`
                          py-1.5 px-2 rounded-md text-xs font-bold
                          transition-all duration-150
                          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400
                          ${isActive
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                        aria-pressed={isActive}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {frictionEnabled && (
                <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-indigo-600 font-semibold">
                    Min force to move: {minForceToMove.toFixed(1)} N
                  </p>
                </div>
              )}
            </div>

            {/* Friction */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <FrictionControls
                frictionEnabled={frictionEnabled}
                onFrictionToggle={setFrictionEnabled}
                muStatic={muStatic}
                onMuStaticChange={setMuStatic}
                muKinetic={muKinetic}
                onMuKineticChange={setMuKinetic}
                criticalAngle={criticalAngle}
              />
            </div>

            {/* Display Options */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <Eye size={14} className="text-indigo-500" />
                Display Options
              </h3>
              <div className="space-y-2">
                <ToggleCheckbox label="Force Arrows" checked={showForceArrows} onChange={setShowForceArrows} color="indigo" />
                <ToggleCheckbox label="Velocity Arrow" checked={showVelocityArrow} onChange={setShowVelocityArrow} color="blue" />
                <ToggleCheckbox label="Acceleration Arrow" checked={showAccelArrow} onChange={setShowAccelArrow} color="purple" />
                <ToggleCheckbox label="Free Body Diagram" checked={showFBD} onChange={setShowFBD} color="emerald" />
                {mode === 'incline' && (
                  <ToggleCheckbox label="Force Decomposition" checked={showComponents} onChange={setShowComponents} color="cyan" />
                )}
              </div>
            </div>

            {/* Playback */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <ArrowRight size={14} className="text-indigo-500" />
                Simulation
              </h3>
              <PlaybackControls
                isRunning={isRunning}
                onPlayPause={togglePlayPause}
                onReset={handleReset}
                speed={speed}
                onSpeedChange={setSpeed}
                speedOptions={[0.25, 0.5, 1, 2, 4]}
                time={time}
                maxTime={0}
                showProgress={false}
              />
            </div>

            {/* Quick Reset */}
            <button
              onClick={handleReset}
              className="
                w-full flex items-center justify-center gap-2
                bg-white rounded-xl shadow-lg p-3 border border-gray-100
                text-sm font-bold text-gray-600
                hover:bg-gray-50 active:bg-gray-100
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400
              "
            >
              <RotateCcw size={14} />
              Reset Position &amp; Velocity
            </button>
          </div>

          {/* ═══════ RIGHT PANEL ═══════ */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">

            {/* Canvas + FBD */}
            <div className="flex gap-4">
              <div className="flex-1 bg-white rounded-xl shadow-lg p-2 border border-gray-100 min-w-0">
                <PhysicsCanvas
                  ref={canvasRef}
                  draw={draw}
                  worldBounds={worldBounds}
                  showGrid
                  showAxes
                  showGround={mode === 'flat'}
                  groundY={0}
                  axisLabels={{
                    x: mode === 'flat' ? 'Position (m)' : 'Horizontal (m)',
                    y: mode === 'flat' ? '' : 'Vertical (m)',
                  }}
                />
              </div>

              {showFBD && (
                <div className="hidden lg:block w-[220px] flex-shrink-0">
                  <FreeBodyDiagram
                    forces={fbdForces}
                    mode={mode}
                    inclineAngle={inclineAngle}
                    showComponents={showComponents && mode === 'incline'}
                    showNetForce
                    netForce={fbdNetForce}
                    renderTrigger={fbdTrigger}
                    className="sticky top-4"
                  />
                </div>
              )}
            </div>

            {/* Equation */}
            <EquationBar label="Newton's Second Law" parts={equationParts} />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard label="Time" value={time} unit="s" icon="⏱" color="indigo" />
              <StatCard label="Position" value={displayState.position} unit="m" icon="📍" color="blue" />
              <StatCard label="Velocity" value={displayState.velocity} unit="m/s" icon="💨" color={displayState.velocity >= 0 ? 'green' : 'red'} />
              <StatCard label="Acceleration" value={displayState.acceleration} unit="m/s²" icon="⚡" color="amber" />
              <StatCard label="Net Force" value={displayState.netForce} unit="N" icon="⟹" color="purple" />
              <StatCard label="Applied Force" value={appliedForce} unit="N" icon="🫸" color="indigo" />
              <StatCard label="Friction" value={displayState.frictionForce} unit="N" icon="✋" color="amber" />
              <StatCard label="Normal Force" value={displayState.normalForce} unit="N" icon="↑" color="green" />
              {mode === 'incline' && (
                <>
                  <StatCard label="mg sinθ" value={displayState.weightParallel} unit="N" icon="↘" color="red" />
                  <StatCard label="mg cosθ" value={displayState.weightPerp} unit="N" icon="↙" color="blue" />
                </>
              )}
            </div>

            {/* Status */}
            <StatusBar
              isStationary={displayState.isStationary}
              isRunning={isRunning}
              velocity={displayState.velocity}
              hitBoundary={displayState.position >= POSITION_MAX - 0.01 || displayState.position <= POSITION_MIN + 0.01}
              position={displayState.position}
            />

            {/* Formulas */}
            <FormulaSheet mode={mode} frictionEnabled={frictionEnabled} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default SecondLawSimulator;