/**
 * @file RelativeVelocity.jsx
 * @description Relative Velocity simulator page — the fifth and final simulator
 * in the Newton's Laws suite. Demonstrates how velocity measurements depend on
 * the observer's reference frame across three modes: 1D relative motion,
 * river crossing, and rain on a moving person.
 *
 * Core equation: v⃗_A/B = v⃗_A/G − v⃗_B/G
 *
 * @module RelativeVelocity
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Info,
  Timer,
  ArrowRightLeft,
  Gauge,
  MoveHorizontal,
  Navigation,
  Compass,
  Eye,
  Droplets,
  Waves,
} from 'lucide-react';

import { useAnimationLoop } from '../../hooks/newtons-laws/useAnimationLoop';
import PhysicsCanvas from '../../components/newtons-laws/shared/PhysicsCanvas';
import ParamSlider from '../../components/newtons-laws/shared/ParamSlider';
import PlaybackControls from '../../components/newtons-laws/shared/PlaybackControls';
import StatCard from '../../components/newtons-laws/shared/StatCard';
import EquationBar from '../../components/newtons-laws/shared/EquationBar';

import { draw1DScene, drawRainScene } from '../../components/newtons-laws/relative-velocity/RelativeVelocityScene';
import { drawRiverScene } from '../../components/newtons-laws/relative-velocity/RiverCrossingScene';
import FrameSelector from '../../components/newtons-laws/relative-velocity/FrameSelector';
import VelocityVectorPanel from '../../components/newtons-laws/relative-velocity/VelocityVectorPanel';
import ScenarioPresets from '../../components/newtons-laws/relative-velocity/ScenarioPresets';

import {
  calculate1DRelativeVelocity,
  calculateRiverCrossing,
  calculateRainRelative,
  get1DFrameVelocities,
  initRainParticles,
  updateRainParticles,
} from '../../utils/newtons-laws/relativeVelocityPhysics';

const MODE_OPTIONS = [
  { id: '1d', label: '1D Motion', icon: <MoveHorizontal size={14} /> },
  { id: 'river', label: 'River Crossing', icon: <Waves size={14} /> },
  { id: 'rain', label: 'Rain & Person', icon: <Droplets size={14} /> },
];

const MAX_TIME_1D = 30;
const MAX_TIME_RAIN = 25;
const RAIN_PARTICLE_COUNT = 90;

/**
 * RelativeVelocity is the main page for the Relative Velocity simulator.
 */
const RelativeVelocity = () => {
  // ── Mode ──
  const [mode, setMode] = useState('1d');

  // ── 1D params ──
  const [vA, setVA] = useState(20);
  const [vB, setVB] = useState(8);
  const [typeA, setTypeA] = useState('car');
  const [typeB, setTypeB] = useState('car');

  // ── River params ──
  const [boatSpeed, setBoatSpeed] = useState(5);
  const [boatAngle, setBoatAngle] = useState(90);
  const [riverSpeed, setRiverSpeed] = useState(3);
  const [riverWidth, setRiverWidth] = useState(50);

  // ── Rain params ──
  const [rainSpeed, setRainSpeed] = useState(8);
  const [rainAngle, setRainAngle] = useState(90);
  const [personSpeed, setPersonSpeed] = useState(5);

  // ── Common ──
  const [observerFrame, setObserverFrame] = useState('ground');
  const [showVelocityArrows, setShowVelocityArrows] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showPath, setShowPath] = useState(true);
  const [showVectorTriangle, setShowVectorTriangle] = useState(true);
  const [showUmbrella, setShowUmbrella] = useState(true);

  // ── Physics computations ──
  const relVel1D = useMemo(
    () => calculate1DRelativeVelocity({ vA, vB }),
    [vA, vB]
  );

  const frameVels1D = useMemo(
    () => get1DFrameVelocities({ vA, vB, frame: observerFrame }),
    [vA, vB, observerFrame]
  );

  const riverPhysics = useMemo(
    () => calculateRiverCrossing({ boatSpeed, boatAngle, riverSpeed, riverWidth }),
    [boatSpeed, boatAngle, riverSpeed, riverWidth]
  );

  const rainPhysics = useMemo(
    () => calculateRainRelative({ rainSpeed, rainAngle, personSpeed }),
    [rainSpeed, rainAngle, personSpeed]
  );

  // ── Max time ──
  const maxTime = useMemo(() => {
    if (mode === '1d') return MAX_TIME_1D;
    if (mode === 'river') {
      return riverPhysics.crossingTime
        ? Math.min(riverPhysics.crossingTime + 3, 120)
        : 30;
    }
    return MAX_TIME_RAIN;
  }, [mode, riverPhysics]);

  // ── Refs for animation state ──
  const xARef = useRef(-8);
  const xBRef = useRef(8);
  const frameOffsetRef = useRef(0);

  const boatXRef = useRef(0);
  const boatYRef = useRef(0);
  const pathRef = useRef([]);
  const riverCompleteRef = useRef(false);

  const personXRef = useRef(0);
  const rainParticlesRef = useRef([]);

  // ── Display state ──
  const [displayXA, setDisplayXA] = useState(-8);
  const [displayXB, setDisplayXB] = useState(8);
  const [displayBoatX, setDisplayBoatX] = useState(0);
  const [displayBoatY, setDisplayBoatY] = useState(0);
  const [displayPersonX, setDisplayPersonX] = useState(0);
  const [displayRiverComplete, setDisplayRiverComplete] = useState(false);

  const canvasRef = useRef(null);

  // ── World bounds ──
  const worldBounds = useMemo(() => {
    if (mode === '1d') {
      return { xMin: -25, xMax: 40, yMin: -3, yMax: 5 };
    }
    if (mode === 'river') {
      const xPad = Math.max(riverWidth * 0.3, 15);
      return {
        xMin: -xPad,
        xMax: xPad + (riverPhysics.drift || 0) * 1.2,
        yMin: -5,
        yMax: riverWidth + 5,
      };
    }
    return { xMin: -15, xMax: 25, yMin: -2, yMax: 12 };
  }, [mode, riverWidth, riverPhysics]);

  // ── Frames for FrameSelector ──
  const frames = useMemo(() => {
    if (mode === '1d') {
      return [
        { id: 'ground', label: 'Ground', color: 'slate', icon: <Eye size={14} /> },
        { id: 'A', label: 'Object A', color: 'indigo', icon: <Navigation size={14} /> },
        { id: 'B', label: 'Object B', color: 'amber', icon: <Navigation size={14} /> },
      ];
    }
    if (mode === 'river') {
      return [
        { id: 'ground', label: 'Ground', color: 'slate', icon: <Eye size={14} /> },
        { id: 'water', label: 'Water', color: 'blue', icon: <Waves size={14} /> },
        { id: 'boat', label: 'Boat', color: 'indigo', icon: <Navigation size={14} /> },
      ];
    }
    return [
      { id: 'ground', label: 'Ground', color: 'slate', icon: <Eye size={14} /> },
      { id: 'person', label: 'Person', color: 'indigo', icon: <Navigation size={14} /> },
    ];
  }, [mode]);

  // ── Initialize rain particles ──
  const initParticles = useCallback(() => {
    rainParticlesRef.current = initRainParticles(RAIN_PARTICLE_COUNT, 0, 18, 12);
  }, []);

  // ── Animation loop ──
  const {
    time,
    isRunning,
    speed,
    reset,
    togglePlayPause,
    setSpeed,
  } = useAnimationLoop({
    onTick: (dt) => {
      if (mode === '1d') {
        const { effectiveVA, effectiveVB, groundVel } = frameVels1D;
        xARef.current += effectiveVA * dt;
        xBRef.current += effectiveVB * dt;
        frameOffsetRef.current += groundVel * dt;

        setDisplayXA(xARef.current);
        setDisplayXB(xBRef.current);
      } else if (mode === 'river') {
        if (!riverCompleteRef.current && riverPhysics.canCross) {
          boatXRef.current += riverPhysics.boatVelGround.x * dt;
          boatYRef.current += riverPhysics.boatVelGround.y * dt;

          if (pathRef.current.length < 2000) {
            pathRef.current.push({
              x: boatXRef.current,
              y: boatYRef.current,
            });
          }

          if (boatYRef.current >= riverWidth) {
            boatYRef.current = riverWidth;
            riverCompleteRef.current = true;
            setDisplayRiverComplete(true);
          }

          setDisplayBoatX(boatXRef.current);
          setDisplayBoatY(boatYRef.current);
        }
      } else if (mode === 'rain') {
        if (observerFrame === 'ground') {
          personXRef.current += personSpeed * dt;
          frameOffsetRef.current = 0;
        } else {
          frameOffsetRef.current += personSpeed * dt;
        }

        const velForParticles =
          observerFrame === 'person'
            ? rainPhysics.rainVelPerson
            : rainPhysics.rainVelGround;

        const centerX =
          observerFrame === 'person' ? 0 : personXRef.current;

        updateRainParticles(
          rainParticlesRef.current,
          velForParticles,
          dt,
          centerX,
          18,
          12,
          -1
        );

        setDisplayPersonX(
          observerFrame === 'person' ? 0 : personXRef.current
        );
      }

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

    xARef.current = -8;
    xBRef.current = 8;
    frameOffsetRef.current = 0;

    boatXRef.current = 0;
    boatYRef.current = 0;
    pathRef.current = [];
    riverCompleteRef.current = false;

    personXRef.current = 0;
    initParticles();

    setDisplayXA(-8);
    setDisplayXB(8);
    setDisplayBoatX(0);
    setDisplayBoatY(0);
    setDisplayPersonX(0);
    setDisplayRiverComplete(false);

    setTimeout(() => {
      if (canvasRef.current && canvasRef.current.render) {
        canvasRef.current.render();
      }
    }, 0);
  }, [reset, initParticles]);

  // ── Reset on param / mode / frame changes ──
  const prevRef = useRef({
    mode, vA, vB, boatSpeed, boatAngle, riverSpeed, riverWidth,
    rainSpeed, rainAngle, personSpeed, observerFrame,
  });

  useEffect(() => {
    const p = prevRef.current;
    const changed =
      p.mode !== mode || p.vA !== vA || p.vB !== vB ||
      p.boatSpeed !== boatSpeed || p.boatAngle !== boatAngle ||
      p.riverSpeed !== riverSpeed || p.riverWidth !== riverWidth ||
      p.rainSpeed !== rainSpeed || p.rainAngle !== rainAngle ||
      p.personSpeed !== personSpeed || p.observerFrame !== observerFrame;

    if (changed) {
      prevRef.current = {
        mode, vA, vB, boatSpeed, boatAngle, riverSpeed, riverWidth,
        rainSpeed, rainAngle, personSpeed, observerFrame,
      };
      handleReset();
    }
  }, [
    mode, vA, vB, boatSpeed, boatAngle, riverSpeed, riverWidth,
    rainSpeed, rainAngle, personSpeed, observerFrame, handleReset,
  ]);

  // ── Initialize rain particles on mount ──
  useEffect(() => {
    initParticles();
  }, [initParticles]);

  // ── Preset application ──
  const handleApplyPreset = useCallback(
    (data) => {
      if (mode === '1d') {
        if (data.vA !== undefined) setVA(data.vA);
        if (data.vB !== undefined) setVB(data.vB);
        if (data.typeA !== undefined) setTypeA(data.typeA);
        if (data.typeB !== undefined) setTypeB(data.typeB);
      } else if (mode === 'river') {
        if (data.boatSpeed !== undefined) setBoatSpeed(data.boatSpeed);
        if (data.boatAngle !== undefined) setBoatAngle(data.boatAngle);
        if (data.riverSpeed !== undefined) setRiverSpeed(data.riverSpeed);
        if (data.riverWidth !== undefined) setRiverWidth(data.riverWidth);
      } else {
        if (data.rainSpeed !== undefined) setRainSpeed(data.rainSpeed);
        if (data.rainAngle !== undefined) setRainAngle(data.rainAngle);
        if (data.personSpeed !== undefined) setPersonSpeed(data.personSpeed);
      }
    },
    [mode]
  );

  // ── Draw function ──
  const drawScene = useCallback(
    (ctx, helpers) => {
      if (mode === '1d') {
        draw1DScene(ctx, helpers, {
          xA: xARef.current,
          vA,
          typeA,
          labelA: 'A',
          xB: xBRef.current,
          vB,
          typeB,
          labelB: 'B',
          observerFrame,
          frameOffsetX: frameOffsetRef.current,
          showVelocityArrows,
          showRelativeVelocity: showLabels,
          showLabels,
          vArelB: relVel1D.vArelB,
          vBrelA: relVel1D.vBrelA,
          effectiveVA: frameVels1D.effectiveVA,
          effectiveVB: frameVels1D.effectiveVB,
          groundVel: frameVels1D.groundVel,
        });
      } else if (mode === 'river') {
        drawRiverScene(ctx, helpers, {
          boatX: boatXRef.current,
          boatY: boatYRef.current,
          boatAngle,
          riverWidth,
          riverSpeed,
          boatVelWater: riverPhysics.boatVelWater,
          waterVelGround: riverPhysics.waterVelGround,
          boatVelGround: riverPhysics.boatVelGround,
          showVelocityVectors: showVelocityArrows,
          showPath,
          showVectorTriangle,
          path: pathRef.current,
          observerFrame,
          frameOffsetX: frameOffsetRef.current,
          frameOffsetY: 0,
          drift: riverPhysics.drift,
          crossingTime: riverPhysics.crossingTime,
          canCross: riverPhysics.canCross,
        });
      } else {
        drawRainScene(ctx, helpers, {
          personX: observerFrame === 'person' ? 0 : personXRef.current,
          personSpeed,
          rainParticles: rainParticlesRef.current,
          rainAngle,
          apparentRainAngle: rainPhysics.apparentAngleFromVertical,
          umbrellaAngle: rainPhysics.umbrellaAngle,
          observerFrame,
          frameOffsetX: frameOffsetRef.current,
          showVelocityArrows,
          showUmbrella,
          rainVelGround: rainPhysics.rainVelGround,
          rainVelPerson: rainPhysics.rainVelPerson,
          personVelGround: rainPhysics.personVelGround,
        });
      }
    },
    [
      mode, vA, vB, typeA, typeB, boatAngle, riverWidth, riverSpeed,
      personSpeed, rainAngle, observerFrame, showVelocityArrows, showLabels,
      showPath, showVectorTriangle, showUmbrella,
      relVel1D, frameVels1D, riverPhysics, rainPhysics,
    ]
  );

  // ── Equation parts ──
  const equationParts = useMemo(() => {
    if (mode === '1d') {
      return [
        { type: 'variable', content: 'v', subscript: 'A/B', color: '#8b5cf6' },
        { type: 'equals', content: '=' },
        { type: 'variable', content: 'v', subscript: 'A/G', color: '#6366f1' },
        { type: 'operator', content: '−' },
        { type: 'variable', content: 'v', subscript: 'B/G', color: '#f59e0b' },
        { type: 'equals', content: '=' },
        { type: 'value', content: relVel1D.vArelB.toFixed(1), unit: 'm/s', color: '#8b5cf6' },
      ];
    }
    if (mode === 'river') {
      return [
        { type: 'variable', content: 'v⃗', subscript: 'b/g', color: '#10b981' },
        { type: 'equals', content: '=' },
        { type: 'variable', content: 'v⃗', subscript: 'b/w', color: '#6366f1' },
        { type: 'operator', content: '+' },
        { type: 'variable', content: 'v⃗', subscript: 'w/g', color: '#3b82f6' },
        { type: 'equals', content: '=' },
        { type: 'value', content: riverPhysics.resultantSpeed.toFixed(1), unit: 'm/s', color: '#10b981' },
      ];
    }
    return [
      { type: 'variable', content: 'v⃗', subscript: 'rain/P', color: '#8b5cf6' },
      { type: 'equals', content: '=' },
      { type: 'variable', content: 'v⃗', subscript: 'rain/G', color: '#3b82f6' },
      { type: 'operator', content: '−' },
      { type: 'variable', content: 'v⃗', subscript: 'person/G', color: '#6366f1' },
      { type: 'equals', content: '=' },
      { type: 'value', content: rainPhysics.apparentRainSpeed.toFixed(1), unit: 'm/s', color: '#8b5cf6' },
    ];
  }, [mode, relVel1D, riverPhysics, rainPhysics]);

  // ── Display toggles ──
  const displayOptions = useMemo(() => {
    const opts = [
      { label: 'Velocity Arrows', checked: showVelocityArrows, onChange: setShowVelocityArrows },
      { label: 'Labels', checked: showLabels, onChange: setShowLabels },
    ];
    if (mode === 'river') {
      opts.push(
        { label: 'Boat Path Trail', checked: showPath, onChange: setShowPath },
        { label: 'Vector Triangle', checked: showVectorTriangle, onChange: setShowVectorTriangle }
      );
    }
    if (mode === 'rain') {
      opts.push(
        { label: 'Show Umbrella', checked: showUmbrella, onChange: setShowUmbrella }
      );
    }
    return opts;
  }, [mode, showVelocityArrows, showLabels, showPath, showVectorTriangle, showUmbrella]);

  // ── Type selectors for 1D ──
  const objectTypes = ['car', 'train', 'bike', 'person'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* ── Header ── */}
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
                Relative Velocity Simulator
              </h1>
              <p className="text-sm text-slate-500">
                How does velocity depend on who&apos;s watching?
              </p>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ── LEFT PANEL ── */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Mode selector */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-slate-800 mb-2 text-sm">Mode</h3>
              <div className="flex gap-1.5">
                {MODE_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    disabled={isRunning}
                    className={`flex-1 flex items-center justify-center gap-1 p-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                      mode === m.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-gray-200 hover:border-indigo-300'
                    } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Frame selector */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <FrameSelector
                frames={frames}
                selectedFrame={observerFrame}
                onFrameChange={setObserverFrame}
                disabled={isRunning}
              />
            </div>

            {/* Parameters */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-bold text-slate-800 mb-3 text-sm">Parameters</h3>

              {mode === '1d' && (
                <div className="space-y-3">
                  <ParamSlider
                    label="Velocity of A"
                    value={vA}
                    onChange={setVA}
                    min={-30}
                    max={30}
                    step={0.5}
                    unit="m/s"
                    disabled={isRunning}
                    note="Positive = rightward"
                  />
                  <ParamSlider
                    label="Velocity of B"
                    value={vB}
                    onChange={setVB}
                    min={-30}
                    max={30}
                    step={0.5}
                    unit="m/s"
                    disabled={isRunning}
                    note="Positive = rightward"
                  />

                  {/* Type selectors */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">
                        Object A Type
                      </label>
                      <select
                        value={typeA}
                        onChange={(e) => setTypeA(e.target.value)}
                        disabled={isRunning}
                        className="w-full text-xs p-1.5 rounded border border-gray-200 bg-white text-slate-700"
                      >
                        {objectTypes.map((t) => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">
                        Object B Type
                      </label>
                      <select
                        value={typeB}
                        onChange={(e) => setTypeB(e.target.value)}
                        disabled={isRunning}
                        className="w-full text-xs p-1.5 rounded border border-gray-200 bg-white text-slate-700"
                      >
                        {objectTypes.map((t) => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'river' && (
                <div className="space-y-3">
                  <ParamSlider
                    label="Boat Speed (rel. water)"
                    value={boatSpeed}
                    onChange={setBoatSpeed}
                    min={1}
                    max={20}
                    step={0.5}
                    unit="m/s"
                    disabled={isRunning}
                  />
                  <ParamSlider
                    label="Boat Angle"
                    value={boatAngle}
                    onChange={setBoatAngle}
                    min={0}
                    max={180}
                    step={1}
                    unit="°"
                    disabled={isRunning}
                    note="90° = straight across, >90° = upstream"
                  />
                  <ParamSlider
                    label="River Current Speed"
                    value={riverSpeed}
                    onChange={setRiverSpeed}
                    min={0}
                    max={15}
                    step={0.5}
                    unit="m/s"
                    disabled={isRunning}
                  />
                  <ParamSlider
                    label="River Width"
                    value={riverWidth}
                    onChange={setRiverWidth}
                    min={10}
                    max={200}
                    step={5}
                    unit="m"
                    disabled={isRunning}
                  />
                  {!riverPhysics.canCross && (
                    <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2 border border-red-200">
                      ⚠ Boat cannot cross — the perpendicular velocity component is zero or negative.
                      Adjust the boat angle.
                    </div>
                  )}
                  {riverPhysics.minDriftAngle !== null && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                      Zero-drift angle: {riverPhysics.minDriftAngle.toFixed(1)}°
                    </div>
                  )}
                </div>
              )}

              {mode === 'rain' && (
                <div className="space-y-3">
                  <ParamSlider
                    label="Rain Speed"
                    value={rainSpeed}
                    onChange={setRainSpeed}
                    min={2}
                    max={20}
                    step={0.5}
                    unit="m/s"
                    disabled={isRunning}
                  />
                  <ParamSlider
                    label="Rain Angle (from horizontal)"
                    value={rainAngle}
                    onChange={setRainAngle}
                    min={10}
                    max={170}
                    step={1}
                    unit="°"
                    disabled={isRunning}
                    note="90° = vertical rain"
                  />
                  <ParamSlider
                    label="Person Speed"
                    value={personSpeed}
                    onChange={setPersonSpeed}
                    min={0}
                    max={15}
                    step={0.5}
                    unit="m/s"
                    disabled={isRunning}
                  />
                </div>
              )}
            </div>

            {/* Presets */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <ScenarioPresets
                mode={mode}
                onApplyPreset={handleApplyPreset}
                disabled={isRunning}
              />
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

            {/* Playback */}
            <PlaybackControls
              isRunning={isRunning}
              onPlayPause={togglePlayPause}
              onReset={handleReset}
              speed={speed}
              onSpeedChange={setSpeed}
              time={time}
              maxTime={maxTime}
              disabled={mode === 'river' && !riverPhysics.canCross}
              className="bg-white rounded-xl shadow-lg p-4 border border-gray-100"
            />
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* Canvas */}
            <PhysicsCanvas
              ref={canvasRef}
              draw={drawScene}
              worldBounds={worldBounds}
              showGrid={false}
              showAxes={false}
              showGround={false}
              className="bg-white rounded-xl shadow-lg"
              aspectRatio={mode === 'river' ? 4 / 3 : 16 / 9}
            />

            {/* Equation bar */}
            <EquationBar parts={equationParts} label="Relative Velocity Formula" />

            {/* Velocity Vector Panel */}
            <VelocityVectorPanel
              mode={mode}
              observerFrame={observerFrame}
              vA={vA}
              vB={vB}
              vArelB={relVel1D.vArelB}
              vBrelA={relVel1D.vBrelA}
              boatVelWater={riverPhysics.boatVelWater}
              waterVelGround={riverPhysics.waterVelGround}
              boatVelGround={riverPhysics.boatVelGround}
              resultantSpeed={riverPhysics.resultantSpeed}
              resultantAngle={riverPhysics.resultantAngle}
              rainVelGround={rainPhysics.rainVelGround}
              personVelGround={rainPhysics.personVelGround}
              rainVelPerson={rainPhysics.rainVelPerson}
              apparentRainSpeed={rainPhysics.apparentRainSpeed}
              apparentAngleFromVertical={rainPhysics.apparentAngleFromVertical}
            />

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {mode === '1d' && (
                <>
                  <StatCard
                    label="v_A/G"
                    value={vA}
                    unit="m/s"
                    precision={1}
                    icon={<ArrowRightLeft size={16} />}
                    color="indigo"
                  />
                  <StatCard
                    label="v_B/G"
                    value={vB}
                    unit="m/s"
                    precision={1}
                    icon={<ArrowRightLeft size={16} />}
                    color="amber"
                  />
                  <StatCard
                    label="v_A/B"
                    value={relVel1D.vArelB}
                    unit="m/s"
                    precision={1}
                    icon={<Gauge size={16} />}
                    color="purple"
                  />
                  <StatCard
                    label="v_B/A"
                    value={relVel1D.vBrelA}
                    unit="m/s"
                    precision={1}
                    icon={<Gauge size={16} />}
                    color="purple"
                  />
                </>
              )}
              {mode === 'river' && (
                <>
                  <StatCard
                    label="Boat Speed"
                    value={boatSpeed}
                    unit="m/s"
                    precision={1}
                    icon={<Navigation size={16} />}
                    color="indigo"
                  />
                  <StatCard
                    label="River Speed"
                    value={riverSpeed}
                    unit="m/s"
                    precision={1}
                    icon={<Waves size={16} />}
                    color="blue"
                  />
                  <StatCard
                    label="Resultant Speed"
                    value={riverPhysics.resultantSpeed}
                    unit="m/s"
                    precision={1}
                    icon={<Gauge size={16} />}
                    color="green"
                  />
                  <StatCard
                    label="Resultant Angle"
                    value={riverPhysics.resultantAngle}
                    unit="°"
                    precision={1}
                    icon={<Compass size={16} />}
                    color="amber"
                  />
                  {riverPhysics.crossingTime !== null && (
                    <StatCard
                      label="Crossing Time"
                      value={riverPhysics.crossingTime}
                      unit="s"
                      precision={1}
                      icon={<Timer size={16} />}
                      color="purple"
                    />
                  )}
                  {riverPhysics.drift !== null && (
                    <StatCard
                      label="Drift"
                      value={riverPhysics.drift}
                      unit="m"
                      precision={1}
                      icon={<MoveHorizontal size={16} />}
                      color="red"
                    />
                  )}
                </>
              )}
              {mode === 'rain' && (
                <>
                  <StatCard
                    label="Rain Speed"
                    value={rainSpeed}
                    unit="m/s"
                    precision={1}
                    icon={<Droplets size={16} />}
                    color="blue"
                  />
                  <StatCard
                    label="Person Speed"
                    value={personSpeed}
                    unit="m/s"
                    precision={1}
                    icon={<Navigation size={16} />}
                    color="indigo"
                  />
                  <StatCard
                    label="Apparent Rain Speed"
                    value={rainPhysics.apparentRainSpeed}
                    unit="m/s"
                    precision={1}
                    icon={<Gauge size={16} />}
                    color="purple"
                  />
                  <StatCard
                    label="Apparent Angle"
                    value={rainPhysics.apparentAngleFromVertical}
                    unit="°"
                    precision={1}
                    icon={<Compass size={16} />}
                    color="amber"
                  />
                  <StatCard
                    label="Umbrella Tilt"
                    value={Math.abs(rainPhysics.umbrellaAngle)}
                    unit="°"
                    precision={1}
                    icon={<Compass size={16} />}
                    color="red"
                  />
                </>
              )}
              <StatCard
                label="Time"
                value={time}
                unit="s"
                precision={1}
                icon={<Timer size={16} />}
                color="slate"
              />
            </div>

            {/* Educational note */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
              <div className="flex items-start gap-2">
                <Info size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                <div className="text-sm text-slate-600">
                  <p className="font-semibold text-slate-800 mb-1">Key Insight</p>
                  {mode === '1d' && (
                    <p>
                      Velocity is always measured <strong>relative to a reference frame</strong>.
                      A passenger on a moving train sees a stationary person on the platform rushing
                      backward. The equation <strong>v_A/B = v_A/G − v_B/G</strong> converts
                      velocities between frames. When both objects move in the same direction,
                      their relative speed is the <em>difference</em> of their speeds. When they
                      move in opposite directions, relative speed is the <em>sum</em>.
                    </p>
                  )}
                  {mode === 'river' && (
                    <p>
                      A boat&apos;s velocity relative to the ground is the{' '}
                      <strong>vector sum</strong> of its velocity relative to water and the
                      water&apos;s velocity relative to ground:{' '}
                      <strong>v⃗_b/g = v⃗_b/w + v⃗_w/g</strong>. To reach directly opposite,
                      aim upstream so the current component is cancelled. For the{' '}
                      <strong>shortest crossing time</strong>, aim straight across (90°) — you&apos;ll
                      drift downstream but cross fastest.
                      {riverPhysics.minDriftAngle !== null &&
                        ` To eliminate drift completely, aim at ${riverPhysics.minDriftAngle.toFixed(1)}°.`}
                    </p>
                  )}
                  {mode === 'rain' && (
                    <p>
                      When you walk through rain, the rain appears to come from a{' '}
                      <strong>different angle</strong> than it actually falls. The apparent rain
                      velocity is{' '}
                      <strong>v⃗_rain/person = v⃗_rain/ground − v⃗_person/ground</strong>.
                      Walking forward makes vertical rain appear to slant toward you — so you tilt
                      your umbrella forward by{' '}
                      <strong>{rainPhysics.apparentAngleFromVertical.toFixed(1)}°</strong> from
                      vertical. The faster you walk, the more you must tilt!
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

export default RelativeVelocity;