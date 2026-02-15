/**
 * @fileoverview Impulse-Momentum Theorem simulator page.
 *
 * Demonstrates J = F_avg × Δt = Δp = m(v₂ - v₁) through a ball drop scenario
 * where a ball falls from a configurable height onto various surfaces. The
 * simulator shows how collision time affects peak force while impulse remains
 * constant. Supports standard mode and an Egg Drop Challenge mode.
 *
 * Route: /newtons-laws/impulse-momentum
 *
 * @module ImpulseMomentum
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Gauge,
  Timer,
  ArrowDown,
  ArrowUp,
  Zap,
  Target,
  Ruler,
  Egg,
  Info,
} from 'lucide-react';
import { useAnimationLoop } from '../../hooks/newtons-laws/useAnimationLoop';
import PhysicsCanvas from '../../components/newtons-laws/shared/PhysicsCanvas';
import ParamSlider from '../../components/newtons-laws/shared/ParamSlider';
import PlaybackControls from '../../components/newtons-laws/shared/PlaybackControls';
import StatCard from '../../components/newtons-laws/shared/StatCard';
import EquationBar from '../../components/newtons-laws/shared/EquationBar';
import ForceTimeGraph from '../../components/newtons-laws/impulse/ForceTimeGraph';
import SurfaceSelector from '../../components/newtons-laws/impulse/SurfaceSelector';
import EggDropMode from '../../components/newtons-laws/impulse/EggDropMode';
import { drawCollisionScene } from '../../components/newtons-laws/impulse/CollisionScene';
import {
  impactVelocity,
  calculateImpulse,
} from '../../utils/newtons-laws/collisionPhysics';

const GRAVITY_PRESETS = [
  { label: 'Earth (9.8)', value: 9.8 },
  { label: 'Earth (10)', value: 10 },
  { label: 'Moon (1.62)', value: 1.62 },
  { label: 'Mars (3.71)', value: 3.71 },
];

const SURFACE_TIMES = {
  concrete: 0.005,
  wood: 0.02,
  foam: 0.08,
  trampoline: 0.2,
};

const ImpulseMomentum = () => {
  // ─── Parameter state ───────────────────────────────────────────────
  const [mass, setMass] = useState(1);
  const [dropHeight, setDropHeight] = useState(5);
  const [gravity, setGravity] = useState(9.8);
  const [restitution, setRestitution] = useState(0.5);
  const [surfaceType, setSurfaceType] = useState('wood');
  const [customTime, setCustomTime] = useState(0.05);
  const [mode, setMode] = useState('standard');

  // ─── Display toggles ──────────────────────────────────────────────
  const [showHeightMarkers, setShowHeightMarkers] = useState(true);
  const [showVelocityArrow, setShowVelocityArrow] = useState(true);
  const [showForceGraph, setShowForceGraph] = useState(true);

  // ─── Physics refs ─────────────────────────────────────────────────
  const ballYRef = useRef(dropHeight);
  const velocityRef = useRef(0);
  const phaseRef = useRef('idle');
  const collisionProgressRef = useRef(0);
  const collisionTimeAccumRef = useRef(0);

  // ─── Display state (synced from refs) ─────────────────────────────
  const [displayPhase, setDisplayPhase] = useState('idle');
  const [displayBallY, setDisplayBallY] = useState(dropHeight);
  const [displayVelocity, setDisplayVelocity] = useState(0);
  const [displayCollisionProgress, setDisplayCollisionProgress] = useState(0);

  // ─── Canvas ref ───────────────────────────────────────────────────
  const canvasRef = useRef(null);

  // ─── Computed collision time ──────────────────────────────────────
  const collisionTime =
    surfaceType === 'custom' ? customTime : (SURFACE_TIMES[surfaceType] ?? 0.02);

  // ─── Computed physics ─────────────────────────────────────────────
  const physics = useMemo(() => {
    const vImpact = impactVelocity(dropHeight, gravity);
    const result = calculateImpulse({
      mass,
      impactSpeed: vImpact,
      restitution,
      collisionTime,
      gravity,
    });
    return { vImpact, ...result };
  }, [mass, dropHeight, gravity, restitution, collisionTime]);

  // ─── Ball radius (visual, scales with mass) ───────────────────────
  const ballRadius = useMemo(
    () => Math.max(0.2, Math.min(0.8, 0.2 + mass * 0.06)),
    [mass]
  );

  // ─── World bounds ─────────────────────────────────────────────────
  const worldBounds = useMemo(() => {
    const maxH = Math.max(dropHeight, physics.bounceHeight) + 2;
    return { xMin: -5, xMax: 5, yMin: -1, yMax: maxH };
  }, [dropHeight, physics.bounceHeight]);

  // ─── Max animation time ───────────────────────────────────────────
  const maxTime = useMemo(() => {
    const tFall = Math.sqrt((2 * dropHeight) / gravity);
    const tRise = Math.sqrt((2 * physics.bounceHeight) / gravity);
    return tFall + collisionTime + tRise + 1;
  }, [dropHeight, gravity, collisionTime, physics.bounceHeight]);

  // ─── Reset logic (stable ref-based) ───────────────────────────────
  const resetPhysicsState = useCallback(
    (height) => {
      phaseRef.current = 'idle';
      ballYRef.current = height;
      velocityRef.current = 0;
      collisionProgressRef.current = 0;
      collisionTimeAccumRef.current = 0;
      setDisplayPhase('idle');
      setDisplayBallY(height);
      setDisplayVelocity(0);
      setDisplayCollisionProgress(0);
    },
    []
  );

  // ─── Animation loop ───────────────────────────────────────────────
  const { time, isRunning, speed, reset, togglePlayPause, setSpeed } =
    useAnimationLoop({
      onTick: (dt) => {
        const phase = phaseRef.current;

        if (phase === 'idle') {
          phaseRef.current = 'falling';
          ballYRef.current = dropHeight;
          velocityRef.current = 0;
        }

        if (phaseRef.current === 'falling') {
          velocityRef.current -= gravity * dt;
          ballYRef.current += velocityRef.current * dt;

          if (ballYRef.current <= ballRadius) {
            ballYRef.current = ballRadius;
            velocityRef.current = -physics.vImpact;
            phaseRef.current = 'colliding';
            collisionTimeAccumRef.current = 0;
            collisionProgressRef.current = 0;
          }
        }

        if (phaseRef.current === 'colliding') {
          collisionTimeAccumRef.current += dt;
          collisionProgressRef.current = Math.min(
            1,
            collisionTimeAccumRef.current / collisionTime
          );

          ballYRef.current = ballRadius;

          const t01 = collisionProgressRef.current;
          velocityRef.current =
            -physics.vImpact +
            t01 * (physics.vImpact + physics.reboundSpeed);

          if (collisionProgressRef.current >= 1) {
            phaseRef.current = 'rebounding';
            velocityRef.current = physics.reboundSpeed;
            collisionProgressRef.current = 1;
          }
        }

        if (phaseRef.current === 'rebounding') {
          velocityRef.current -= gravity * dt;
          ballYRef.current += velocityRef.current * dt;

          if (ballYRef.current <= ballRadius && velocityRef.current <= 0) {
            ballYRef.current = ballRadius;
            velocityRef.current = 0;
            phaseRef.current = 'done';
          }
        }

        if (phaseRef.current === 'done') {
          setDisplayPhase('done');
          setDisplayBallY(ballYRef.current);
          setDisplayVelocity(0);
          setDisplayCollisionProgress(1);
          canvasRef.current?.render();
          return false;
        }

        setDisplayPhase(phaseRef.current);
        setDisplayBallY(ballYRef.current);
        setDisplayVelocity(velocityRef.current);
        setDisplayCollisionProgress(collisionProgressRef.current);
        canvasRef.current?.render();

        return true;
      },
      maxTime,
      initialSpeed: 1,
    });

  // ─── Play handler ─────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (!isRunning && phaseRef.current === 'idle') {
      phaseRef.current = 'falling';
      ballYRef.current = dropHeight;
      velocityRef.current = 0;
    }
    togglePlayPause();
  }, [isRunning, dropHeight, togglePlayPause]);

  // ─── Reset handler ────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    reset();
    resetPhysicsState(dropHeight);
    setTimeout(() => canvasRef.current?.render(), 0);
  }, [reset, dropHeight, resetPhysicsState]);

  // ─── Mode change effect ───────────────────────────────────────────
  useEffect(() => {
    if (mode === 'eggdrop') {
      setMass(0.06);
      setRestitution(0.05);
    } else {
      setMass(1);
      setRestitution(0.5);
    }
    // Inline reset to avoid stale closure
    reset();
    phaseRef.current = 'idle';
    ballYRef.current = dropHeight;
    velocityRef.current = 0;
    collisionProgressRef.current = 0;
    collisionTimeAccumRef.current = 0;
    setDisplayPhase('idle');
    setDisplayBallY(dropHeight);
    setDisplayVelocity(0);
    setDisplayCollisionProgress(0);
    setTimeout(() => canvasRef.current?.render(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ─── Draw function ────────────────────────────────────────────────
  const drawScene = useCallback(
    (ctx, helpers) => {
      drawCollisionScene(ctx, helpers, {
        phase: phaseRef.current,
        ballX: 0,
        ballY: ballYRef.current,
        ballRadius,
        dropHeight,
        velocity: velocityRef.current,
        impactSpeed: physics.vImpact,
        reboundSpeed: physics.reboundSpeed,
        bounceHeight: physics.bounceHeight,
        surfaceType,
        collisionProgress: collisionProgressRef.current,
        showHeightMarkers,
        showVelocityArrow,
      });
    },
    [
      ballRadius,
      dropHeight,
      physics.vImpact,
      physics.reboundSpeed,
      physics.bounceHeight,
      surfaceType,
      showHeightMarkers,
      showVelocityArrow,
    ]
  );

  // ─── Equation bar parts ───────────────────────────────────────────
  const equationParts = useMemo(
    () => [
      { type: 'variable', content: 'J', color: '#10b981' },
      { type: 'equals', content: '=' },
      { type: 'variable', content: 'F', subscript: 'avg', color: '#ef4444' },
      { type: 'operator', content: '×' },
      { type: 'variable', content: 'Δt', color: '#3b82f6' },
      { type: 'equals', content: '=' },
      { type: 'variable', content: 'Δp', color: '#8b5cf6' },
      { type: 'equals', content: '=' },
      {
        type: 'value',
        content: physics.impulse.toFixed(2),
        unit: 'N·s',
        color: '#10b981',
      },
    ],
    [physics.impulse]
  );

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/simulators/newtons-laws"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                Impulse-Momentum Theorem
              </h1>
              <p className="text-sm text-slate-500">
                J = F<sub>avg</sub> × Δt = Δp — Explore how collision time
                affects force
              </p>
            </div>
            {/* Mode toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode('standard')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'standard'
                    ? 'bg-white shadow text-indigo-700'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Standard
              </button>
              <button
                onClick={() => setMode('eggdrop')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${mode === 'eggdrop'
                    ? 'bg-white shadow text-amber-700'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Egg size={14} /> Egg Drop
              </button>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT PANEL — Controls */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Parameters card */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-slate-800 mb-3">Parameters</h3>

              {mode === 'standard' && (
                <>
                  <ParamSlider
                    label="Mass"
                    value={mass}
                    onChange={setMass}
                    min={0.1}
                    max={10}
                    step={0.1}
                    unit="kg"
                    disabled={isRunning}
                  />
                  <ParamSlider
                    label="Drop Height"
                    value={dropHeight}
                    onChange={(v) => {
                      setDropHeight(v);
                      reset();
                      resetPhysicsState(v);
                      setTimeout(() => canvasRef.current?.render(), 0);
                    }}
                    min={0.5}
                    max={20}
                    step={0.1}
                    unit="m"
                    disabled={isRunning}
                  />
                  <ParamSlider
                    label="Coefficient of Restitution (e)"
                    value={restitution}
                    onChange={setRestitution}
                    min={0}
                    max={1}
                    step={0.05}
                    disabled={isRunning}
                    note="0 = no bounce, 1 = perfect bounce"
                  />
                </>
              )}

              {/* Gravity selector */}
              <div className="mt-3">
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Gravity
                </label>
                <div className="flex flex-wrap gap-1">
                  {GRAVITY_PRESETS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => {
                        setGravity(g.value);
                        reset();
                        resetPhysicsState(dropHeight);
                        setTimeout(() => canvasRef.current?.render(), 0);
                      }}
                      disabled={isRunning}
                      className={`px-2 py-1 text-xs rounded-md border transition-all ${gravity === g.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-gray-200 hover:border-indigo-300'
                        } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Surface selection card (standard mode) */}
            {mode === 'standard' && (
              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                <h3 className="font-bold text-slate-800 mb-3">Surface Type</h3>
                <SurfaceSelector
                  selected={surfaceType}
                  onSelect={(v) => {
                    setSurfaceType(v);
                    handleReset();
                  }}
                  customTime={customTime}
                  onCustomTimeChange={(v) => {
                    setCustomTime(v);
                    handleReset();
                  }}
                  disabled={isRunning}
                />
              </div>
            )}

            {/* Egg Drop Mode panel */}
            {mode === 'eggdrop' && (
              <EggDropMode
                dropHeight={dropHeight}
                onDropHeightChange={(v) => {
                  setDropHeight(v);
                  reset();
                  resetPhysicsState(v);
                  setTimeout(() => canvasRef.current?.render(), 0);
                }}
                surfaceType={surfaceType}
                onSurfaceTypeChange={(v) => {
                  setSurfaceType(v);
                  handleReset();
                }}
                customTime={customTime}
                onCustomTimeChange={(v) => {
                  setCustomTime(v);
                  handleReset();
                }}
                gravity={gravity}
                disabled={isRunning}
              />
            )}

            {/* Display toggles */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-slate-800 mb-2 text-sm">
                Display Options
              </h3>
              <div className="space-y-2">
                {[
                  {
                    label: 'Height Markers',
                    checked: showHeightMarkers,
                    onChange: setShowHeightMarkers,
                  },
                  {
                    label: 'Velocity Arrow',
                    checked: showVelocityArrow,
                    onChange: setShowVelocityArrow,
                  },
                  {
                    label: 'Force-Time Graph',
                    checked: showForceGraph,
                    onChange: setShowForceGraph,
                  },
                ].map((opt) => (
                  <label
                    key={opt.label}
                    className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      onChange={(e) => opt.onChange(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Playback controls */}
            <PlaybackControls
              isRunning={isRunning}
              onPlayPause={handlePlayPause}
              onReset={handleReset}
              speed={speed}
              onSpeedChange={setSpeed}
              time={time}
              maxTime={maxTime}
              disabled={false}
              className="bg-white rounded-xl shadow-lg p-4 border border-gray-100"
            />
          </div>

          {/* RIGHT PANEL — Canvas + Stats */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* Canvas */}
            <PhysicsCanvas
              ref={canvasRef}
              draw={drawScene}
              worldBounds={worldBounds}
              showGrid={true}
              showAxes={true}
              showGround={true}
              groundY={0}
              axisLabels={{ x: 'x (m)', y: 'Height (m)' }}
              className="bg-white rounded-xl shadow-lg"
            />

            {/* Equation bar */}
            <EquationBar
              parts={equationParts}
              label="Impulse-Momentum Theorem"
            />

            {/* Force-time graph */}
            {showForceGraph && (
              <ForceTimeGraph
                peakForce={physics.peakForce}
                collisionTime={collisionTime}
                impulse={physics.impulse}
                avgForce={physics.avgForce}
                currentTime={
                  displayPhase === 'colliding'
                    ? collisionTimeAccumRef.current
                    : null
                }
                isActive={displayPhase === 'colliding'}
                showAvgForce={true}
                showImpulseArea={true}
                className="bg-white rounded-xl shadow-lg border border-gray-100"
              />
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard
                label="Impact Speed"
                value={physics.vImpact}
                unit="m/s"
                precision={2}
                icon={<ArrowDown size={16} />}
                color="red"
              />
              <StatCard
                label="Rebound Speed"
                value={physics.reboundSpeed}
                unit="m/s"
                precision={2}
                icon={<ArrowUp size={16} />}
                color="green"
              />
              <StatCard
                label="Impulse (J)"
                value={physics.impulse}
                unit="N·s"
                precision={3}
                icon={<Zap size={16} />}
                color="purple"
              />
              <StatCard
                label="Δp"
                value={physics.deltaMomentum}
                unit="kg·m/s"
                precision={3}
                icon={<Target size={16} />}
                color="indigo"
              />
              <StatCard
                label="F_avg"
                value={physics.avgForce}
                unit="N"
                precision={1}
                icon={<Gauge size={16} />}
                color="amber"
              />
              <StatCard
                label="F_peak"
                value={physics.peakForce}
                unit="N"
                precision={1}
                icon={<Gauge size={16} />}
                color="red"
              />
              <StatCard
                label="Collision Time"
                value={collisionTime * 1000}
                unit="ms"
                precision={1}
                icon={<Timer size={16} />}
                color="blue"
              />
              <StatCard
                label="Bounce Height"
                value={physics.bounceHeight}
                unit="m"
                precision={2}
                icon={<Ruler size={16} />}
                color="green"
              />
            </div>

            {/* Educational note */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
              <div className="flex items-start gap-2">
                <Info
                  size={18}
                  className="text-indigo-500 mt-0.5 shrink-0"
                />
                <div className="text-sm text-slate-600">
                  <p className="font-semibold text-slate-800 mb-1">
                    Key Insight
                  </p>
                  <p>
                    The impulse (change in momentum) is the same regardless of
                    surface — it depends only on mass, impact speed, and
                    restitution. But the <strong>force</strong> is inversely
                    proportional to collision time. A 10× longer collision time
                    means 10× less force. This is the physics behind crumple
                    zones, airbags, and protective padding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpulseMomentum;