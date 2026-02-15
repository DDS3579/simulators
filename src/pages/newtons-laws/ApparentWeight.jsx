/**
 * @file ApparentWeight.jsx
 * @description Apparent Weight simulator page. Demonstrates how apparent weight
 * (the reading on a scale) changes in accelerating reference frames across three
 * scenarios: elevator, free fall, and vertical circular motion. Targets Nepalese
 * NEB Grade 11–12 physics curriculum (Newton's Laws unit).
 *
 * Core formula: N = m(g + a_frame) for linear scenarios.
 *               N = m(v²/R + g·cosθ) for circular motion.
 *
 * @module ApparentWeight
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Info,
  Weight,
  Gauge,
  Timer,
  ArrowUpDown,
  Activity,
  TrendingUp,
  RotateCw,
} from 'lucide-react';

import { useAnimationLoop } from '../../hooks/newtons-laws/useAnimationLoop';
import PhysicsCanvas from '../../components/newtons-laws/shared/PhysicsCanvas';
import ParamSlider from '../../components/newtons-laws/shared/ParamSlider';
import PlaybackControls from '../../components/newtons-laws/shared/PlaybackControls';
import StatCard from '../../components/newtons-laws/shared/StatCard';
import EquationBar from '../../components/newtons-laws/shared/EquationBar';
import GraphPanel from '../../components/newtons-laws/shared/GraphPanel';

import {
  drawElevatorScene,
  drawFreeFallScene,
  drawCircularScene,
} from '../../components/newtons-laws/apparent-weight/ElevatorScene';
import ScaleDisplay from '../../components/newtons-laws/apparent-weight/ScaleDisplay';
import ScenarioSelector from '../../components/newtons-laws/apparent-weight/ScenarioSelector';
import AccelerationTimeline from '../../components/newtons-laws/apparent-weight/AccelerationTimeline';
import WeightAnalysisPanel from '../../components/newtons-laws/apparent-weight/WeightAnalysisPanel';

import {
  generateElevatorTimeline,
  getElevatorStateAtTime,
  getFreeFallStateAtTime,
  getCircularMotionState,
  classifyWeightState,
} from '../../utils/newtons-laws/apparentWeightPhysics';

const GRAVITY_PRESETS = [
  { label: 'Earth (9.8)', value: 9.8 },
  { label: 'Earth (10)', value: 10 },
  { label: 'Moon (1.62)', value: 1.62 },
  { label: 'Mars (3.71)', value: 3.71 },
];

const MAX_GRAPH_POINTS = 500;

/**
 * ApparentWeight is the main page component for the Apparent Weight simulator.
 */
const ApparentWeight = () => {
  // ── Parameter state ──
  const [scenario, setScenario] = useState('elevator');
  const [mass, setMass] = useState(70);
  const [gravity, setGravity] = useState(9.8);

  // Elevator-specific
  const [elevAccel, setElevAccel] = useState(2);

  // Free fall-specific
  const [dropHeight, setDropHeight] = useState(20);

  // Circular-specific
  const [radius, setRadius] = useState(5);
  const [circSpeed, setCircSpeed] = useState(10);

  // Display toggles
  const [showForceArrows, setShowForceArrows] = useState(true);
  const [showAccelArrow, setShowAccelArrow] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [showGraph, setShowGraph] = useState(true);

  // ── Computed real weight ──
  const realWeight = useMemo(() => mass * gravity, [mass, gravity]);

  // ── Elevator timeline ──
  const elevatorTimeline = useMemo(
    () =>
      generateElevatorTimeline({
        acceleration: elevAccel,
        restDuration: 2,
        accelDuration: 3,
        constVelDuration: 4,
      }),
    [elevAccel]
  );

  const elevatorTotalTime = useMemo(() => {
    if (elevatorTimeline.length === 0) return 25;
    return elevatorTimeline[elevatorTimeline.length - 1].endTime;
  }, [elevatorTimeline]);

  // ── Max time per scenario ──
  const maxTime = useMemo(() => {
    if (scenario === 'elevator') return elevatorTotalTime;
    if (scenario === 'freefall') {
      const g = Math.max(gravity, 0.01);
      const tFall = Math.sqrt((2 * dropHeight) / g);
      return 2 + tFall + 0.1 + 2;
    }
    if (scenario === 'circular') {
      const v = Math.max(circSpeed, 0.01);
      const period = (2 * Math.PI * radius) / v;
      return period * 3;
    }
    return 30;
  }, [scenario, elevatorTotalTime, dropHeight, gravity, radius, circSpeed]);

  // ── Elevator max position (for floor indicator) ──
  const elevatorMaxPosition = useMemo(() => {
    if (scenario !== 'elevator' || elevatorTimeline.length < 3) return 1;
    const endOfConstVel = elevatorTimeline[2]?.endTime || 10;
    const state = getElevatorStateAtTime(elevatorTimeline, endOfConstVel, mass, gravity);
    return Math.max(state.position, 1);
  }, [scenario, elevatorTimeline, mass, gravity]);

  // ── Physics refs ──
  const thetaRef = useRef(0);
  const currentAccelRef = useRef(0);
  const currentVelocityRef = useRef(0);
  const currentPositionRef = useRef(0);
  const apparentWeightRef = useRef(realWeight);
  const gForceRef = useRef(1);
  const weightStateRef = useRef('normal');
  const phaseRef = useRef('');

  // ── Display state ──
  const [displayAccel, setDisplayAccel] = useState(0);
  const [displayVelocity, setDisplayVelocity] = useState(0);
  const [displayPosition, setDisplayPosition] = useState(0);
  const [displayApparentWeight, setDisplayApparentWeight] = useState(realWeight);
  const [displayGForce, setDisplayGForce] = useState(1);
  const [displayWeightState, setDisplayWeightState] = useState('normal');
  const [displayPhase, setDisplayPhase] = useState('');
  const [displayTheta, setDisplayTheta] = useState(0);

  // ── Graph data ──
  const graphDataRef = useRef({ accel: [], weight: [], gforce: [] });

  // ── Canvas ref ──
  const canvasRef = useRef(null);

  // ── World bounds ──
  const worldBounds = useMemo(() => {
    if (scenario === 'elevator') {
      return {
        xMin: -6,
        xMax: 6,
        yMin: -2,
        yMax: Math.max(elevatorMaxPosition + 10, 30),
      };
    }
    if (scenario === 'freefall') {
      return { xMin: -6, xMax: 6, yMin: -2, yMax: dropHeight + 5 };
    }
    if (scenario === 'circular') {
      const pad = Math.max(radius * 0.5, 3);
      return {
        xMin: -(radius + pad),
        xMax: radius + pad,
        yMin: -2,
        yMax: 2 * radius + pad,
      };
    }
    return { xMin: -10, xMax: 10, yMin: -2, yMax: 30 };
  }, [scenario, elevatorMaxPosition, dropHeight, radius]);

  // ── Animation loop ──
  const {
    time,
    isRunning,
    speed,
    reset,
    togglePlayPause,
    setSpeed,
    skipTo,
  } = useAnimationLoop({
    onTick: (dt, totalTime) => {
      let accel = 0;
      let vel = 0;
      let pos = 0;
      let appW = realWeight;
      let gf = 1;
      let ws = 'normal';
      let phase = '';

      if (scenario === 'elevator') {
        const state = getElevatorStateAtTime(elevatorTimeline, totalTime, mass, gravity);
        accel = state.acceleration;
        vel = state.velocity;
        pos = state.position;
        appW = state.apparentWeight;
        gf = state.gForce;
        ws = state.state;
        phase = state.phaseLabel;
      } else if (scenario === 'freefall') {
        const state = getFreeFallStateAtTime({
          t: totalTime,
          mass,
          gravity,
          dropHeight,
          impactDuration: 0.1,
        });
        accel = state.acceleration;
        vel = state.velocity;
        pos = state.heightAboveGround;
        appW = state.apparentWeight;
        gf = state.gForce;
        ws = classifyWeightState(gf);
        phase = state.phase;
      } else if (scenario === 'circular') {
        const r = Math.max(radius, 0.01);
        const v = Math.max(circSpeed, 0.01);
        const omega = v / r;
        const theta = (omega * totalTime) % (2 * Math.PI);
        thetaRef.current = theta;

        const state = getCircularMotionState({
          theta,
          mass,
          gravity,
          radius: r,
          speed: v,
        });
        accel = state.centripetalAccel;
        pos = state.y;
        appW = state.apparentWeight;
        gf = state.gForce;
        ws = state.state;
        vel = v;

        const angleDeg = (theta * 180) / Math.PI;
        if (angleDeg < 30 || angleDeg > 330) phase = 'Bottom';
        else if (angleDeg > 150 && angleDeg < 210) phase = 'Top';
        else if (angleDeg >= 30 && angleDeg <= 150) phase = 'Rising';
        else phase = 'Descending';
      }

      // Update refs
      currentAccelRef.current = accel;
      currentVelocityRef.current = vel;
      currentPositionRef.current = pos;
      apparentWeightRef.current = appW;
      gForceRef.current = gf;
      weightStateRef.current = ws;
      phaseRef.current = phase;

      // Accumulate graph data
      const graphData = graphDataRef.current;
      const lastX =
        graphData.weight.length > 0
          ? graphData.weight[graphData.weight.length - 1].x
          : -1;
      if (totalTime - lastX > 0.08 && graphData.weight.length < MAX_GRAPH_POINTS) {
        graphData.accel.push({ x: totalTime, y: accel });
        graphData.weight.push({ x: totalTime, y: appW });
        graphData.gforce.push({ x: totalTime, y: gf });
      }

      // Update display state
      setDisplayAccel(accel);
      setDisplayVelocity(vel);
      setDisplayPosition(pos);
      setDisplayApparentWeight(appW);
      setDisplayGForce(gf);
      setDisplayWeightState(ws);
      setDisplayPhase(phase);
      if (scenario === 'circular') {
        setDisplayTheta(thetaRef.current);
      }

      // Re-render canvas
      if (canvasRef.current && canvasRef.current.render) {
        canvasRef.current.render();
      }

      return true;
    },
    maxTime,
  });

  // ── Handle reset ──
  const handleReset = useCallback(() => {
    reset();
    thetaRef.current = 0;
    currentAccelRef.current = 0;
    currentVelocityRef.current = 0;
    currentPositionRef.current = scenario === 'freefall' ? dropHeight : 0;
    apparentWeightRef.current = realWeight;
    gForceRef.current = 1;
    weightStateRef.current = 'normal';
    phaseRef.current = '';
    graphDataRef.current = { accel: [], weight: [], gforce: [] };

    setDisplayAccel(0);
    setDisplayVelocity(0);
    setDisplayPosition(scenario === 'freefall' ? dropHeight : 0);
    setDisplayApparentWeight(realWeight);
    setDisplayGForce(1);
    setDisplayWeightState('normal');
    setDisplayPhase('');
    setDisplayTheta(0);

    setTimeout(() => {
      if (canvasRef.current && canvasRef.current.render) {
        canvasRef.current.render();
      }
    }, 0);
  }, [reset, scenario, dropHeight, realWeight]);

  // ── Reset when parameters change ──
  const prevParamsRef = useRef({ scenario, mass, gravity, elevAccel, dropHeight, radius, circSpeed });
  useEffect(() => {
    const prev = prevParamsRef.current;
    const changed =
      prev.scenario !== scenario ||
      prev.mass !== mass ||
      prev.gravity !== gravity ||
      prev.elevAccel !== elevAccel ||
      prev.dropHeight !== dropHeight ||
      prev.radius !== radius ||
      prev.circSpeed !== circSpeed;

    if (changed) {
      prevParamsRef.current = { scenario, mass, gravity, elevAccel, dropHeight, radius, circSpeed };
      handleReset();
    }
  }, [scenario, mass, gravity, elevAccel, dropHeight, radius, circSpeed, handleReset]);

  // ── Handle seek (elevator timeline) ──
  const handleSeek = useCallback(
    (t) => {
      if (skipTo) {
        skipTo(t);
      }
    },
    [skipTo]
  );

  // ── Draw function ──
  const drawScene = useCallback(
    (ctx, helpers) => {
      if (scenario === 'elevator') {
        drawElevatorScene(ctx, helpers, {
          position: currentPositionRef.current,
          velocity: currentVelocityRef.current,
          acceleration: currentAccelRef.current,
          mass,
          gravity,
          apparentWeight: apparentWeightRef.current,
          realWeight,
          gForce: gForceRef.current,
          phaseLabel: phaseRef.current,
          maxPosition: elevatorMaxPosition,
          showForceArrows,
          showAccelArrow,
          showValues,
          weightState: weightStateRef.current,
        });
      } else if (scenario === 'freefall') {
        drawFreeFallScene(ctx, helpers, {
          heightAboveGround: currentPositionRef.current,
          dropHeight,
          velocity: currentVelocityRef.current,
          acceleration: currentAccelRef.current,
          mass,
          gravity,
          apparentWeight: apparentWeightRef.current,
          realWeight,
          gForce: gForceRef.current,
          phase: phaseRef.current,
          showForceArrows,
          showValues,
          weightState: weightStateRef.current,
        });
      } else if (scenario === 'circular') {
        const currentTheta = thetaRef.current;
        const r = Math.max(radius, 0.01);
        const v = Math.max(circSpeed, 0.01);
        const cState = getCircularMotionState({
          theta: currentTheta,
          mass,
          gravity,
          radius: r,
          speed: v,
        });
        drawCircularScene(ctx, helpers, {
          theta: currentTheta,
          radius: r,
          speed: v,
          mass,
          gravity,
          apparentWeight: cState.apparentWeight,
          realWeight,
          gForce: cState.gForce,
          personX: cState.x,
          personY: cState.y,
          showForceArrows,
          showValues,
          weightState: cState.state,
          contactLost: cState.contactLost,
        });
      }
    },
    [
      scenario,
      mass,
      gravity,
      realWeight,
      dropHeight,
      radius,
      circSpeed,
      elevatorMaxPosition,
      showForceArrows,
      showAccelArrow,
      showValues,
    ]
  );

  // ── Equation bar parts ──
  const equationParts = useMemo(() => {
    if (scenario === 'elevator' || scenario === 'freefall') {
      return [
        { type: 'variable', content: 'N', color: '#10b981' },
        { type: 'equals', content: '=' },
        { type: 'variable', content: 'm', color: '#6366f1' },
        { type: 'bracket', content: '(' },
        { type: 'variable', content: 'g', color: '#ef4444' },
        { type: 'operator', content: '+' },
        { type: 'variable', content: 'a', color: '#f59e0b' },
        { type: 'bracket', content: ')' },
        { type: 'equals', content: '=' },
        {
          type: 'value',
          content: displayApparentWeight.toFixed(1),
          unit: 'N',
          color: '#10b981',
        },
      ];
    }
    return [
      { type: 'variable', content: 'N', color: '#10b981' },
      { type: 'equals', content: '=' },
      { type: 'variable', content: 'm', color: '#6366f1' },
      { type: 'bracket', content: '(' },
      { type: 'variable', content: 'v²/R', color: '#f97316' },
      { type: 'operator', content: '+' },
      { type: 'variable', content: 'g', color: '#ef4444' },
      { type: 'operator', content: '·' },
      { type: 'variable', content: 'cosθ', color: '#06b6d4' },
      { type: 'bracket', content: ')' },
      { type: 'equals', content: '=' },
      {
        type: 'value',
        content: displayApparentWeight.toFixed(1),
        unit: 'N',
        color: '#10b981',
      },
    ];
  }, [scenario, displayApparentWeight]);

  // ── Graph datasets ──
  const graphDatasets = useMemo(
    () => [
      {
        label: 'Apparent Weight (N)',
        data: graphDataRef.current.weight,
        color: '#10b981',
        lineWidth: 2,
        fill: false,
      },
      {
        label: 'Real Weight (mg)',
        data: [
          { x: 0, y: realWeight },
          { x: maxTime, y: realWeight },
        ],
        color: '#ef4444',
        lineWidth: 1,
        dashed: true,
        fill: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [time, realWeight, maxTime]
  );

  // ── Graph annotations ──
  const graphAnnotations = useMemo(
    () => [
      { type: 'hline', y: realWeight, label: 'mg', color: '#ef4444' },
      { type: 'hline', y: 0, label: 'Weightless', color: '#8b5cf6' },
      { type: 'vline', x: time, label: '', color: '#6366f1' },
    ],
    [realWeight, time]
  );

  // ── Min speed for circular ──
  const minSpeedForContact = useMemo(
    () => Math.sqrt(gravity * radius),
    [gravity, radius]
  );

  // ── Display toggle options ──
  const displayOptions = useMemo(() => {
    const options = [
      {
        label: 'Force Arrows',
        checked: showForceArrows,
        onChange: setShowForceArrows,
      },
    ];
    if (scenario === 'elevator') {
      options.push({
        label: 'Acceleration Arrow',
        checked: showAccelArrow,
        onChange: setShowAccelArrow,
      });
    }
    options.push(
      { label: 'Value Labels', checked: showValues, onChange: setShowValues },
      {
        label: 'Weight vs Time Graph',
        checked: showGraph,
        onChange: setShowGraph,
      }
    );
    return options;
  }, [scenario, showForceArrows, showAccelArrow, showValues, showGraph]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* ── Header ── */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
          <div className="flex items-center gap-3">
            <Link
              to="/simulators/newtons-laws"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                Apparent Weight Simulator
              </h1>
              <p className="text-sm text-slate-500">
                How does acceleration change what the scale reads?
              </p>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ── LEFT PANEL ── */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Scenario selector */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-slate-800 mb-3 text-sm">Scenario</h3>
              <ScenarioSelector
                scenario={scenario}
                onScenarioChange={setScenario}
                disabled={isRunning}
              />
            </div>

            {/* Parameters */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-slate-800 mb-3 text-sm">Parameters</h3>
              <ParamSlider
                label="Person Mass"
                value={mass}
                onChange={setMass}
                min={10}
                max={200}
                step={1}
                unit="kg"
                disabled={isRunning}
              />

              {/* Gravity selector */}
              <div className="mt-3">
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Gravity
                </label>
                <div className="flex flex-wrap gap-1">
                  {GRAVITY_PRESETS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setGravity(g.value)}
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

              {/* Scenario-specific params */}
              {scenario === 'elevator' && (
                <ParamSlider
                  label="Elevator Acceleration"
                  value={elevAccel}
                  onChange={setElevAccel}
                  min={0.5}
                  max={10}
                  step={0.5}
                  unit="m/s²"
                  disabled={isRunning}
                  note="Magnitude during accel/decel phases"
                  className="mt-3"
                />
              )}

              {scenario === 'freefall' && (
                <ParamSlider
                  label="Drop Height"
                  value={dropHeight}
                  onChange={setDropHeight}
                  min={5}
                  max={100}
                  step={1}
                  unit="m"
                  disabled={isRunning}
                  className="mt-3"
                />
              )}

              {scenario === 'circular' && (
                <>
                  <ParamSlider
                    label="Loop Radius"
                    value={radius}
                    onChange={setRadius}
                    min={2}
                    max={20}
                    step={0.5}
                    unit="m"
                    disabled={isRunning}
                    className="mt-3"
                  />
                  <ParamSlider
                    label="Tangential Speed"
                    value={circSpeed}
                    onChange={setCircSpeed}
                    min={1}
                    max={30}
                    step={0.5}
                    unit="m/s"
                    disabled={isRunning}
                    note={`Min for contact at top: ${minSpeedForContact.toFixed(1)} m/s`}
                  />
                </>
              )}
            </div>

            {/* Display toggles */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-slate-800 mb-2 text-sm">Display Options</h3>
              <div className="space-y-2">
                {displayOptions.map((opt) => (
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
              onPlayPause={togglePlayPause}
              onReset={handleReset}
              speed={speed}
              onSpeedChange={setSpeed}
              time={time}
              maxTime={maxTime}
              className="bg-white rounded-xl shadow-lg p-4 border border-gray-100"
            />
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* Canvas + Scale side by side */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2">
                <PhysicsCanvas
                  ref={canvasRef}
                  draw={drawScene}
                  worldBounds={worldBounds}
                  showGrid={scenario !== 'circular'}
                  showAxes={scenario !== 'circular'}
                  showGround={scenario === 'freefall'}
                  groundY={0}
                  axisLabels={
                    scenario === 'circular'
                      ? { x: '', y: '' }
                      : { x: '', y: 'Height (m)' }
                  }
                  className="bg-white rounded-xl shadow-lg"
                />
              </div>
              <div className="xl:col-span-1">
                <ScaleDisplay
                  apparentWeight={displayApparentWeight}
                  realWeight={realWeight}
                  gForce={displayGForce}
                  mass={mass}
                  weightState={displayWeightState}
                  showInKg={true}
                  gravity={gravity}
                />
              </div>
            </div>

            {/* Equation bar */}
            <EquationBar parts={equationParts} label="Apparent Weight Formula" />

            {/* Elevator timeline (elevator mode only) */}
            {scenario === 'elevator' && (
              <AccelerationTimeline
                timeline={elevatorTimeline}
                currentTime={time}
                totalTime={elevatorTotalTime}
                onSeek={handleSeek}
                acceleration={elevAccel}
                disabled={false}
              />
            )}

            {/* Weight vs Time graph */}
            {showGraph && (
              <GraphPanel
                title="Apparent Weight vs Time"
                xLabel="Time (s)"
                yLabel="Weight (N)"
                datasets={graphDatasets}
                xRange={[0, maxTime]}
                autoScale={true}
                annotations={graphAnnotations}
                showLegend={true}
                renderTrigger={time}
                className="bg-white rounded-xl shadow-lg border border-gray-100"
              />
            )}

            {/* Weight Analysis Panel */}
            <WeightAnalysisPanel
              mass={mass}
              gravity={gravity}
              acceleration={displayAccel}
              apparentWeight={displayApparentWeight}
              realWeight={realWeight}
              gForce={displayGForce}
              scenario={scenario}
              weightState={displayWeightState}
              theta={scenario === 'circular' ? displayTheta : 0}
              radius={radius}
              speed={circSpeed}
            />

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard
                label="Apparent Weight"
                value={displayApparentWeight}
                unit="N"
                precision={1}
                icon={<Weight size={16} />}
                color="green"
              />
              <StatCard
                label="Real Weight (mg)"
                value={realWeight}
                unit="N"
                precision={1}
                icon={<Weight size={16} />}
                color="red"
              />
              <StatCard
                label="G-Force"
                value={displayGForce}
                unit="g"
                precision={2}
                icon={<Gauge size={16} />}
                color="purple"
              />
              <StatCard
                label="Acceleration"
                value={displayAccel}
                unit="m/s²"
                precision={2}
                icon={<ArrowUpDown size={16} />}
                color="amber"
              />
              <StatCard
                label="Velocity"
                value={displayVelocity}
                unit="m/s"
                precision={1}
                icon={<Activity size={16} />}
                color="blue"
              />
              <StatCard
                label="Position"
                value={displayPosition}
                unit="m"
                precision={1}
                icon={<TrendingUp size={16} />}
                color="indigo"
              />
              <StatCard
                label="Time"
                value={time}
                unit="s"
                precision={1}
                icon={<Timer size={16} />}
                color="slate"
              />
              {scenario === 'circular' && (
                <StatCard
                  label="Angle"
                  value={(displayTheta * 180) / Math.PI}
                  unit="°"
                  precision={0}
                  icon={<RotateCw size={16} />}
                  color="amber"
                />
              )}
            </div>

            {/* Educational note */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
              <div className="flex items-start gap-2">
                <Info size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                <div className="text-sm text-slate-600">
                  <p className="font-semibold text-slate-800 mb-1">Key Insight</p>
                  {scenario === 'elevator' && (
                    <p>
                      Your <strong>real weight (mg)</strong> never changes — only
                      your <strong>apparent weight</strong> (what the scale reads)
                      changes. When the elevator accelerates upward, the floor must
                      push harder (N {'>'} mg). When it accelerates downward, the
                      floor pushes less (N {'<'} mg). At{' '}
                      <strong>constant velocity</strong> (zero acceleration), the
                      scale reads your true weight, whether you&apos;re moving or
                      stationary.
                    </p>
                  )}
                  {scenario === 'freefall' && (
                    <p>
                      During free fall,{' '}
                      <strong>everything falls together</strong> — you, the scale,
                      and the box all accelerate at g. The scale can&apos;t push on
                      you because it&apos;s falling just as fast. This creates{' '}
                      <strong>weightlessness</strong> (N = 0). Astronauts in orbit
                      experience this continuously — they&apos;re in perpetual free
                      fall around Earth!
                    </p>
                  )}
                  {scenario === 'circular' && (
                    <p>
                      On a vertical loop, the{' '}
                      <strong>
                        normal force must provide centripetal acceleration
                      </strong>{' '}
                      in addition to supporting your weight. At the{' '}
                      <strong>bottom</strong>, both gravity and the normal force act
                      toward the center, making you feel heaviest. At the{' '}
                      <strong>top</strong>, gravity provides some of the centripetal
                      force, so the normal force is reduced — you feel lightest. If
                      speed is too low (v {'<'} {minSpeedForContact.toFixed(1)} m/s),
                      you&apos;d lose contact at the top!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApparentWeight;