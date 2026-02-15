/**
 * @fileoverview Conservation of Momentum simulator page.
 *
 * Two objects on a frictionless 1D track collide. Demonstrates
 * m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂ for elastic, perfectly inelastic,
 * partially inelastic, and explosion collision types. Shows that
 * total momentum is always conserved while kinetic energy may not be.
 *
 * Route: /newtons-laws/conservation
 *
 * @module MomentumConservation
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Info,
  Gauge,
  Timer,
  Zap,
  MoveHorizontal,
  Activity,
} from 'lucide-react';
import { useAnimationLoop } from '../../hooks/newtons-laws/useAnimationLoop';
import PhysicsCanvas from '../../components/newtons-laws/shared/PhysicsCanvas';
import ParamSlider from '../../components/newtons-laws/shared/ParamSlider';
import PlaybackControls from '../../components/newtons-laws/shared/PlaybackControls';
import StatCard from '../../components/newtons-laws/shared/StatCard';
import EquationBar from '../../components/newtons-laws/shared/EquationBar';
import { drawCollisionTrack } from '../../components/newtons-laws/conservation/CollisionTrack';
import CollisionTypeSelector from '../../components/newtons-laws/conservation/CollisionTypeSelector';
import MomentumDisplay from '../../components/newtons-laws/conservation/MomentumDisplay';
import EnergyComparison from '../../components/newtons-laws/conservation/EnergyComparison';
import {
  calculateCollision,
  calculateExplosion,
  findCollisionTime,
} from '../../utils/newtons-laws/collisionPhysics';

const COLLISION_VISUAL_DURATION = 0.3;

const MomentumConservation = () => {
  // ─── Parameter state ───────────────────────────────────────────────
  const [m1, setM1] = useState(3);
  const [m2, setM2] = useState(2);
  const [u1, setU1] = useState(5);
  const [u2, setU2] = useState(-3);
  const [collisionType, setCollisionType] = useState('elastic');
  const [restitution, setRestitution] = useState(0.5);
  const [explosionEnergy, setExplosionEnergy] = useState(50);

  // ─── Display toggles ──────────────────────────────────────────────
  const [showVelocityArrows, setShowVelocityArrows] = useState(true);
  const [showMomentumArrows, setShowMomentumArrows] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // ─── Object widths (visual, scale with mass) ──────────────────────
  const w1 = useMemo(
    () => Math.max(0.5, Math.min(2.5, 0.5 + m1 * 0.1)),
    [m1]
  );
  const w2 = useMemo(
    () => Math.max(0.5, Math.min(2.5, 0.5 + m2 * 0.1)),
    [m2]
  );

  // ─── Collision results ────────────────────────────────────────────
  const collisionResults = useMemo(() => {
    if (collisionType === 'explosion') {
      return calculateExplosion({
        m1,
        m2,
        energy: explosionEnergy,
        initialVelocity: 0,
      });
    }

    const e =
      collisionType === 'elastic'
        ? 1
        : collisionType === 'inelastic'
        ? 0
        : restitution;

    return calculateCollision({ m1, m2, u1, u2, restitution: e });
  }, [m1, m2, u1, u2, collisionType, restitution, explosionEnergy]);

  // ─── Starting positions and collision timing ──────────────────────
  const setup = useMemo(() => {
    if (collisionType === 'explosion') {
      return {
        startX1: 0,
        startX2: 0,
        tCollision: 0.5,
        xCollision: 0,
        objectsWillCollide: true,
      };
    }

    const timing = findCollisionTime({
      x1: -5,
      x2: 5,
      u1,
      u2,
      w1,
      w2,
    });

    if (!timing) {
      return {
        startX1: -5,
        startX2: 5,
        tCollision: null,
        xCollision: null,
        objectsWillCollide: false,
      };
    }

    return {
      startX1: -5,
      startX2: 5,
      tCollision: timing.tCollision,
      xCollision: timing.xCollision,
      objectsWillCollide: true,
    };
  }, [u1, u2, w1, w2, collisionType]);

  // ─── Max time ─────────────────────────────────────────────────────
  const maxTime = useMemo(() => {
    if (!setup.objectsWillCollide) return 10;
    return setup.tCollision + COLLISION_VISUAL_DURATION + 5;
  }, [setup]);

  // ─── Physics refs ─────────────────────────────────────────────────
  const x1Ref = useRef(setup.startX1);
  const x2Ref = useRef(setup.startX2);
  const v1Ref = useRef(collisionType === 'explosion' ? 0 : u1);
  const v2Ref = useRef(collisionType === 'explosion' ? 0 : u2);
  const phaseRef = useRef('pre');
  const collisionProgressRef = useRef(0);
  const collisionTimeAccumRef = useRef(0);

  // ─── Display state ────────────────────────────────────────────────
  const [displayPhase, setDisplayPhase] = useState('pre');
  const [displayX1, setDisplayX1] = useState(setup.startX1);
  const [displayX2, setDisplayX2] = useState(setup.startX2);
  const [displayV1, setDisplayV1] = useState(
    collisionType === 'explosion' ? 0 : u1
  );
  const [displayV2, setDisplayV2] = useState(
    collisionType === 'explosion' ? 0 : u2
  );

  // ─── Canvas ref ───────────────────────────────────────────────────
  const canvasRef = useRef(null);

  // ─── World bounds ─────────────────────────────────────────────────
  const worldBounds = useMemo(
    () => ({ xMin: -12, xMax: 12, yMin: -2, yMax: 5 }),
    []
  );

  // ─── Animation loop ───────────────────────────────────────────────
  const { time, isRunning, speed, reset, togglePlayPause, setSpeed } =
    useAnimationLoop({
      onTick: (dt, totalTime) => {
        const phase = phaseRef.current;

        if (phase === 'pre') {
          x1Ref.current += v1Ref.current * dt;
          x2Ref.current += v2Ref.current * dt;

          if (setup.objectsWillCollide) {
            if (collisionType === 'explosion') {
              if (totalTime >= setup.tCollision) {
                phaseRef.current = 'colliding';
                collisionTimeAccumRef.current = 0;
                collisionProgressRef.current = 0;
              }
            } else {
              const rightEdge1 = x1Ref.current + w1 / 2;
              const leftEdge2 = x2Ref.current - w2 / 2;

              if (rightEdge1 >= leftEdge2) {
                phaseRef.current = 'colliding';
                collisionTimeAccumRef.current = 0;
                collisionProgressRef.current = 0;

                const overlap = rightEdge1 - leftEdge2;
                x1Ref.current -= overlap / 2;
                x2Ref.current += overlap / 2;
              }
            }
          }
        }

        if (phaseRef.current === 'colliding') {
          collisionTimeAccumRef.current += dt;
          collisionProgressRef.current = Math.min(
            1,
            collisionTimeAccumRef.current / COLLISION_VISUAL_DURATION
          );

          if (collisionProgressRef.current >= 1) {
            phaseRef.current = 'post';
            v1Ref.current = collisionResults.v1;
            v2Ref.current = collisionResults.v2;

            if (collisionType === 'inelastic') {
              const mergedX =
                (x1Ref.current + x2Ref.current) / 2;
              x1Ref.current = mergedX;
              x2Ref.current = mergedX;
            }
          }
        }

        if (phaseRef.current === 'post') {
          x1Ref.current += v1Ref.current * dt;
          x2Ref.current += v2Ref.current * dt;

          if (
            Math.abs(x1Ref.current) > 20 &&
            Math.abs(x2Ref.current) > 20
          ) {
            setDisplayPhase('post');
            setDisplayX1(x1Ref.current);
            setDisplayX2(x2Ref.current);
            setDisplayV1(v1Ref.current);
            setDisplayV2(v2Ref.current);
            canvasRef.current?.render();
            return false;
          }
        }

        setDisplayPhase(phaseRef.current);
        setDisplayX1(x1Ref.current);
        setDisplayX2(x2Ref.current);
        setDisplayV1(v1Ref.current);
        setDisplayV2(v2Ref.current);
        canvasRef.current?.render();

        return true;
      },
      maxTime,
    });

  // ─── Play handler ─────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    togglePlayPause();
  }, [togglePlayPause]);

  // ─── Reset handler ────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    reset();
    phaseRef.current = 'pre';
    x1Ref.current = setup.startX1;
    x2Ref.current = setup.startX2;
    const initV1 = collisionType === 'explosion' ? 0 : u1;
    const initV2 = collisionType === 'explosion' ? 0 : u2;
    v1Ref.current = initV1;
    v2Ref.current = initV2;
    collisionProgressRef.current = 0;
    collisionTimeAccumRef.current = 0;
    setDisplayPhase('pre');
    setDisplayX1(setup.startX1);
    setDisplayX2(setup.startX2);
    setDisplayV1(initV1);
    setDisplayV2(initV2);
    setTimeout(() => canvasRef.current?.render(), 0);
  }, [reset, setup, collisionType, u1, u2]);

  // ─── Auto-reset when parameters change ────────────────────────────
  useEffect(() => {
    reset();
    const initV1 = collisionType === 'explosion' ? 0 : u1;
    const initV2 = collisionType === 'explosion' ? 0 : u2;
    phaseRef.current = 'pre';
    x1Ref.current = setup.startX1;
    x2Ref.current = setup.startX2;
    v1Ref.current = initV1;
    v2Ref.current = initV2;
    collisionProgressRef.current = 0;
    collisionTimeAccumRef.current = 0;
    setDisplayPhase('pre');
    setDisplayX1(setup.startX1);
    setDisplayX2(setup.startX2);
    setDisplayV1(initV1);
    setDisplayV2(initV2);
    setTimeout(() => canvasRef.current?.render(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m1, m2, u1, u2, collisionType, restitution, explosionEnergy]);

  // ─── Draw function ────────────────────────────────────────────────
  const drawScene = useCallback(
    (ctx, helpers) => {
      drawCollisionTrack(ctx, helpers, {
        phase: phaseRef.current,
        x1: x1Ref.current,
        w1,
        m1,
        u1: collisionType === 'explosion' ? 0 : u1,
        v1: collisionResults.v1,
        currentV1: v1Ref.current,
        x2: x2Ref.current,
        w2,
        m2,
        u2: collisionType === 'explosion' ? 0 : u2,
        v2: collisionResults.v2,
        currentV2: v2Ref.current,
        collisionProgress: collisionProgressRef.current,
        collisionX: setup.xCollision ?? 0,
        collisionType,
        merged:
          collisionType === 'inelastic' && phaseRef.current === 'post',
        showVelocityArrows,
        showLabels,
        showMomentumArrows,
      });
    },
    [
      w1,
      w2,
      m1,
      m2,
      u1,
      u2,
      collisionResults,
      setup,
      collisionType,
      showVelocityArrows,
      showLabels,
      showMomentumArrows,
    ]
  );

  // ─── Equation bar parts ───────────────────────────────────────────
  const equationParts = useMemo(
    () => [
      { type: 'variable', content: 'm', subscript: '1', color: '#6366f1' },
      { type: 'variable', content: 'u', subscript: '1', color: '#6366f1' },
      { type: 'operator', content: '+' },
      { type: 'variable', content: 'm', subscript: '2', color: '#f59e0b' },
      { type: 'variable', content: 'u', subscript: '2', color: '#f59e0b' },
      { type: 'equals', content: '=' },
      { type: 'variable', content: 'm', subscript: '1', color: '#6366f1' },
      { type: 'variable', content: 'v', subscript: '1', color: '#6366f1' },
      { type: 'operator', content: '+' },
      { type: 'variable', content: 'm', subscript: '2', color: '#f59e0b' },
      { type: 'variable', content: 'v', subscript: '2', color: '#f59e0b' },
    ],
    []
  );

  // ─── Warning for non-colliding objects ────────────────────────────
  const showWarning =
    !setup.objectsWillCollide && collisionType !== 'explosion';

  // ─── Computed display values for momentum / energy ────────────────
  const effectiveU1 = collisionType === 'explosion' ? 0 : u1;
  const effectiveU2 = collisionType === 'explosion' ? 0 : u2;

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
          <div className="flex items-center gap-3">
            <Link
              to="/newtons-laws"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                Conservation of Momentum
              </h1>
              <p className="text-sm text-slate-500">
                m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂ — Total momentum is always
                conserved
              </p>
            </div>
          </div>
        </div>

        {/* Warning banner */}
        {showWarning && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-center gap-2">
            <Info size={18} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>Objects will not collide!</strong> They are moving apart
              or in the same direction without catching up. Adjust velocities
              so they approach each other.
            </p>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT PANEL */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Object 1 parameters */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-indigo-500" />
                Object 1
              </h3>
              <ParamSlider
                label="Mass (m₁)"
                value={m1}
                onChange={setM1}
                min={0.5}
                max={20}
                step={0.5}
                unit="kg"
                disabled={isRunning}
              />
              {collisionType !== 'explosion' && (
                <ParamSlider
                  label="Velocity (u₁)"
                  value={u1}
                  onChange={setU1}
                  min={-20}
                  max={20}
                  step={0.5}
                  unit="m/s"
                  disabled={isRunning}
                  note="Positive = rightward"
                />
              )}
            </div>

            {/* Object 2 parameters */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                Object 2
              </h3>
              <ParamSlider
                label="Mass (m₂)"
                value={m2}
                onChange={setM2}
                min={0.5}
                max={20}
                step={0.5}
                unit="kg"
                disabled={isRunning}
              />
              {collisionType !== 'explosion' && (
                <ParamSlider
                  label="Velocity (u₂)"
                  value={u2}
                  onChange={setU2}
                  min={-20}
                  max={20}
                  step={0.5}
                  unit="m/s"
                  disabled={isRunning}
                  note="Negative = leftward"
                />
              )}
            </div>

            {/* Collision type */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-slate-800 mb-3">
                Collision Type
              </h3>
              <CollisionTypeSelector
                collisionType={collisionType}
                onTypeChange={setCollisionType}
                restitution={restitution}
                onRestitutionChange={setRestitution}
                explosionEnergy={explosionEnergy}
                onExplosionEnergyChange={setExplosionEnergy}
                disabled={isRunning}
              />
            </div>

            {/* Display toggles */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-slate-800 mb-2 text-sm">
                Display Options
              </h3>
              <div className="space-y-2">
                {[
                  {
                    label: 'Velocity Arrows',
                    checked: showVelocityArrows,
                    onChange: setShowVelocityArrows,
                  },
                  {
                    label: 'Momentum Arrows',
                    checked: showMomentumArrows,
                    onChange: setShowMomentumArrows,
                  },
                  {
                    label: 'Labels',
                    checked: showLabels,
                    onChange: setShowLabels,
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
              disabled={showWarning}
              className="bg-white rounded-xl shadow-lg p-4 border border-gray-100"
            />
          </div>

          {/* RIGHT PANEL */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* Canvas */}
            <PhysicsCanvas
              ref={canvasRef}
              draw={drawScene}
              worldBounds={worldBounds}
              showGrid={true}
              showAxes={true}
              showGround={false}
              axisLabels={{ x: 'Position (m)', y: '' }}
              className="bg-white rounded-xl shadow-lg"
            />

            {/* Equation bar */}
            <EquationBar
              parts={equationParts}
              label="Conservation of Momentum"
            />

            {/* Momentum display */}
            <MomentumDisplay
              m1={m1}
              m2={m2}
              u1={effectiveU1}
              u2={effectiveU2}
              v1={displayPhase === 'post' ? collisionResults.v1 : null}
              v2={displayPhase === 'post' ? collisionResults.v2 : null}
              collisionType={collisionType}
              showAfter={displayPhase === 'post'}
            />

            {/* Energy comparison */}
            <EnergyComparison
              keBefore={collisionResults.keBefore}
              keAfter={
                displayPhase === 'post' ? collisionResults.keAfter : null
              }
              energyLost={
                displayPhase === 'post'
                  ? collisionResults.energyLost
                  : null
              }
              collisionType={collisionType}
              explosionEnergy={explosionEnergy}
              showAfter={displayPhase === 'post'}
            />

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard
                label="v₁ (after)"
                value={collisionResults.v1}
                unit="m/s"
                precision={2}
                icon={<MoveHorizontal size={16} />}
                color="indigo"
              />
              <StatCard
                label="v₂ (after)"
                value={collisionResults.v2}
                unit="m/s"
                precision={2}
                icon={<MoveHorizontal size={16} />}
                color="amber"
              />
              <StatCard
                label="Total p (before)"
                value={collisionResults.totalMomentumBefore}
                unit="kg·m/s"
                precision={2}
                icon={<Activity size={16} />}
                color="purple"
              />
              <StatCard
                label="Total p (after)"
                value={collisionResults.totalMomentumAfter}
                unit="kg·m/s"
                precision={2}
                icon={<Activity size={16} />}
                color="purple"
              />
              <StatCard
                label="KE Before"
                value={collisionResults.keBefore}
                unit="J"
                precision={2}
                icon={<Zap size={16} />}
                color="blue"
              />
              <StatCard
                label="KE After"
                value={collisionResults.keAfter}
                unit="J"
                precision={2}
                icon={<Zap size={16} />}
                color="blue"
              />
              <StatCard
                label="Energy Lost"
                value={collisionResults.energyLost ?? 0}
                unit="J"
                precision={2}
                icon={<Zap size={16} />}
                color="red"
              />
              <StatCard
                label="Time"
                value={time}
                unit="s"
                precision={2}
                icon={<Timer size={16} />}
                color="slate"
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
                    Total momentum is <strong>always conserved</strong> in all
                    collision types (no external forces). Kinetic energy is
                    only conserved in perfectly elastic collisions. In
                    inelastic collisions, some KE converts to heat, sound, and
                    deformation. In explosions, internal energy converts to
                    KE.
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

export default MomentumConservation;