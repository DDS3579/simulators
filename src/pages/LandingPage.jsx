// src/pages/LandingPage.jsx
import { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Stars } from '@react-three/drei';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Play, Atom, ChevronDown, ExternalLink, MousePointer2 } from 'lucide-react';
import * as THREE from 'three';

/* ───────────────────────────── 3D COMPONENTS ───────────────────────────── */

function Nucleus({ color = '#6366f1' }) {
  const ref = useRef();
  useFrame((s) => {
    ref.current.rotation.y = s.clock.elapsedTime * 0.15;
    ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.1) * 0.1;
  });

  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[1, 1]} />
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          roughness={0.3}
          metalness={0.8}
          distort={0.25}
          speed={1.5}
          transparent
          opacity={0.9}
        />
      </mesh>

      {[0, 1, 2].map((i) => (
        <OrbitRing key={i} index={i} color={color} />
      ))}
    </group>
  );
}

function OrbitRing({ index, color }) {
  const ref = useRef();
  const electronRef = useRef();
  const radius = 1.8 + index * 0.5;

  useFrame((s) => {
    const t = s.clock.elapsedTime * (0.6 - index * 0.1);
    ref.current.rotation.x = index * 1.05;
    ref.current.rotation.y = t;

    if (electronRef.current) {
      const angle = t * 3;
      electronRef.current.position.x = Math.cos(angle) * radius;
      electronRef.current.position.z = Math.sin(angle) * radius;
    }
  });

  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.008, 16, 100]} />
        <meshStandardMaterial color={color} transparent opacity={0.2} />
      </mesh>
      <mesh ref={electronRef}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial emissive="#fff" emissiveIntensity={2} color="#fff" />
      </mesh>
    </group>
  );
}

function HeroCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={0.6} color="#a5b4fc" />
        <pointLight position={[-5, -3, 3]} intensity={0.3} color="#c084fc" />
        <Stars radius={40} depth={60} count={800} factor={3} fade speed={0.3} />
        <Float speed={1} floatIntensity={0.4} rotationIntensity={0.2}>
          <Nucleus />
        </Float>
      </Suspense>
    </Canvas>
  );
}

/* ──────────────────── MINI INTERACTIVE PROJECTILE DEMO ─────────────────── */

function MiniProjectileDemo() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [launched, setLaunched] = useState(false);
  const tRef = useRef(0);
  const trailRef = useRef([]);

  const v0 = 38;
  const angle = 55;
  const g = 9.8;
  const rad = (angle * Math.PI) / 180;
  const vx = v0 * Math.cos(rad);
  const vy = v0 * Math.sin(rad);
  const tFlight = (2 * vy) / g;

  const getPos = useCallback(
    (t) => {
      const x = vx * t;
      const y = vy * t - 0.5 * g * t * t;
      return { x, y: Math.max(0, y) };
    },
    [vx, vy, g]
  );

  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = cvs.width / dpr;
    const h = cvs.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const maxX = vx * tFlight * 1.1;
    const maxY = (vy * vy) / (2 * g) * 1.3;
    const scX = (w - 60) / maxX;
    const scY = (h - 50) / maxY;
    const sc = Math.min(scX, scY);
    const ox = 30;
    const oy = h - 25;

    // grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= maxX; x += 20) {
      ctx.beginPath();
      ctx.moveTo(ox + x * sc, 10);
      ctx.lineTo(ox + x * sc, oy);
      ctx.stroke();
    }
    for (let y = 0; y <= maxY; y += 10) {
      ctx.beginPath();
      ctx.moveTo(ox, oy - y * sc);
      ctx.lineTo(w - 10, oy - y * sc);
      ctx.stroke();
    }

    // ground
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(w - 10, oy);
    ctx.stroke();

    // dashed prediction
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let t = 0; t <= tFlight; t += 0.05) {
      const { x, y } = getPos(t);
      const px = ox + x * sc;
      const py = oy - y * sc;
      t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // trail
    if (trailRef.current.length > 1) {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      trailRef.current.forEach((p, i) => {
        const px = ox + p.x * sc;
        const py = oy - p.y * sc;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();

      // dots
      ctx.fillStyle = '#a5b4fc';
      const step = Math.max(1, Math.floor(trailRef.current.length / 12));
      trailRef.current.forEach((p, i) => {
        if (i % step !== 0) return;
        ctx.beginPath();
        ctx.arc(ox + p.x * sc, oy - p.y * sc, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // projectile
    const pos = getPos(tRef.current);
    const px = ox + pos.x * sc;
    const py = oy - pos.y * sc;

    ctx.shadowColor = 'rgba(99,102,241,0.4)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // velocity arrow
    if (launched && tRef.current < tFlight) {
      const cvx = vx;
      const cvy = vy - g * tRef.current;
      const mag = Math.sqrt(cvx * cvx + cvy * cvy);
      const arrowLen = Math.min(mag * 1.2, 50);
      const ang = Math.atan2(cvy, cvx);
      const ex = px + arrowLen * Math.cos(ang);
      const ey = py - arrowLen * Math.sin(ang);

      ctx.strokeStyle = cvy >= 0 ? '#10b981' : '#ef4444';
      ctx.fillStyle = cvy >= 0 ? '#10b981' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      const hl = 7;
      const ha = 0.4;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - hl * Math.cos(ang - ha), ey + hl * Math.sin(ang - ha));
      ctx.lineTo(ex - hl * Math.cos(ang + ha), ey + hl * Math.sin(ang + ha));
      ctx.closePath();
      ctx.fill();
    }

    // angle arc
    if (!launched || tRef.current === 0) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ox, oy, 30, -rad, 0);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui';
      ctx.fillText(`${angle}°`, ox + 34, oy - 8);
    }

    ctx.restore();
  }, [getPos, tFlight, launched, vx, vy, g, angle]);

  // resize
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const parent = cvs.parentElement;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      cvs.width = rect.width * dpr;
      cvs.height = rect.height * dpr;
      cvs.style.width = rect.width + 'px';
      cvs.style.height = rect.height + 'px';
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [draw]);

  // animation
  useEffect(() => {
    if (!launched) return;
    let prev = 0;
    const tick = (ts) => {
      if (!prev) prev = ts;
      const dt = Math.min((ts - prev) / 1000, 0.05);
      prev = ts;
      tRef.current += dt;

      const pos = getPos(tRef.current);
      trailRef.current.push(pos);
      if (trailRef.current.length > 300) trailRef.current = trailRef.current.slice(-300);

      draw();

      if (tRef.current >= tFlight) {
        tRef.current = tFlight;
        setLaunched(false);
        return;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [launched, getPos, tFlight, draw]);

  const handleLaunch = () => {
    tRef.current = 0;
    trailRef.current = [];
    setLaunched(true);
  };

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />

      {!launched && (
        <button
          onClick={handleLaunch}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full
                   bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30
                   hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <Play size={14} fill="currentColor" />
          {tRef.current > 0 ? 'Replay' : 'Launch'}
        </button>
      )}

      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full
                     bg-white/80 backdrop-blur text-[11px] font-medium text-gray-500 border border-gray-200/60">
        <MousePointer2 size={11} />
        Interactive Demo
      </div>
    </div>
  );
}

/* ───────────────────────────── REVEAL ANIMATION ────────────────────────── */

function Reveal({ children, className = '', delay = 0, direction = 'up' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  const dirs = {
    up: { hidden: { y: 30 }, show: { y: 0 } },
    down: { hidden: { y: -30 }, show: { y: 0 } },
    left: { hidden: { x: 40 }, show: { x: 0 } },
    right: { hidden: { x: -40 }, show: { x: 0 } },
    none: { hidden: {}, show: {} },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...dirs[direction].hidden }}
      animate={inView ? { opacity: 1, ...dirs[direction].show } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────── HORIZONTAL SCROLL ─────────────────────────── */

const allSimulators = [
  {
    id: 'projectile',
    title: 'Projectile Motion',
    desc: 'Trajectory, velocity vectors, inverse solver',
    icon: '🎯',
    subject: 'Physics',
    path: '/simulators/projectile-motion',
    live: true,
    color: '#6366f1',
    chapter: 'Mechanics',
  },
  {
    id: 'pendulum',
    title: 'Simple Pendulum',
    desc: 'SHM, period, energy conservation',
    icon: '🕰️',
    subject: 'Physics',
    path: '/simulators/pendulum',
    live: false,
    color: '#8b5cf6',
    chapter: 'Oscillations',
  },
  {
    id: 'waves',
    title: 'Wave Motion',
    desc: 'Transverse, longitudinal, interference',
    icon: '🌊',
    subject: 'Physics',
    path: '/simulators/waves',
    live: false,
    color: '#0ea5e9',
    chapter: 'Waves',
  },
  {
    id: 'newton',
    title: "Newton's Laws",
    desc: 'Force diagrams, friction, inclined planes',
    icon: '🍎',
    subject: 'Physics',
    path: '/simulators/newtons-laws',
    live: false,
    color: '#ef4444',
    chapter: 'Mechanics',
  },
  {
    id: 'circular',
    title: 'Circular Motion',
    desc: 'Centripetal force, angular velocity',
    icon: '🔄',
    subject: 'Physics',
    path: '/simulators/circular-motion',
    live: false,
    color: '#f59e0b',
    chapter: 'Mechanics',
  },
  {
    id: 'molecular',
    title: 'Molecular Viewer',
    desc: '3D structures, bond angles, geometry',
    icon: '🧬',
    subject: 'Chemistry',
    path: '/simulators/molecular-viewer',
    live: false,
    color: '#10b981',
    chapter: 'Chemical Bonding',
  },
  {
    id: 'periodic',
    title: 'Periodic Table',
    desc: 'Electron config, trends, properties',
    icon: '📊',
    subject: 'Chemistry',
    path: '/simulators/periodic-table',
    live: false,
    color: '#06b6d4',
    chapter: 'Classification',
  },
  {
    id: 'gaslaw',
    title: 'Gas Laws',
    desc: "Boyle's, Charles's, ideal gas",
    icon: '💨',
    subject: 'Chemistry',
    path: '/simulators/gas-laws',
    live: false,
    color: '#a855f7',
    chapter: 'States of Matter',
  },
  {
    id: 'bonding',
    title: 'Chemical Bonding',
    desc: 'Ionic, covalent, metallic bonds',
    icon: '🔗',
    subject: 'Chemistry',
    path: '/simulators/bonding',
    live: false,
    color: '#ec4899',
    chapter: 'Chemical Bonding',
  },
  {
    id: 'circuits',
    title: 'Electric Circuits',
    desc: 'Ohm\'s law, series, parallel',
    icon: '🔌',
    subject: 'Physics',
    path: '/simulators/circuits',
    live: false,
    color: '#14b8a6',
    chapter: 'Current Electricity',
  },
  {
    id: 'optics',
    title: 'Optics & Lenses',
    desc: 'Reflection, refraction, lens formula',
    icon: '🔍',
    subject: 'Physics',
    path: '/simulators/optics',
    live: false,
    color: '#f97316',
    chapter: 'Optics',
  },
  {
    id: 'thermo',
    title: 'Thermodynamics',
    desc: 'Heat engines, entropy, PV diagrams',
    icon: '🌡️',
    subject: 'Physics',
    path: '/simulators/thermodynamics',
    live: false,
    color: '#dc2626',
    chapter: 'Heat',
  },
];

function SimCard({ sim, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={sim.live ? { y: -6 } : {}}
      className="flex-shrink-0 w-[280px] md:w-[300px]"
    >
      <Link
        to={sim.live ? sim.path : '#'}
        onClick={(e) => !sim.live && e.preventDefault()}
        className={`block h-full ${!sim.live ? 'cursor-default' : ''}`}
      >
        <div
          className={`h-full rounded-2xl border transition-all duration-300 overflow-hidden ${
            sim.live
              ? 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/8 group'
              : 'bg-gray-50/80 border-gray-100'
          }`}
        >
          {/* top color bar */}
          <div className="h-1 w-full" style={{ backgroundColor: sim.live ? sim.color : '#e2e8f0' }} />

          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{sim.icon}</span>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    sim.subject === 'Physics'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {sim.subject}
                </span>
                {sim.live && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
            </div>

            <h3
              className={`font-bold text-base mb-1 transition-colors ${
                sim.live ? 'text-gray-900 group-hover:text-indigo-700' : 'text-gray-400'
              }`}
            >
              {sim.title}
            </h3>
            <p className={`text-sm leading-relaxed ${sim.live ? 'text-gray-500' : 'text-gray-300'}`}>
              {sim.desc}
            </p>
            <p className={`text-[11px] mt-2 ${sim.live ? 'text-gray-400' : 'text-gray-300'}`}>
              Ch: {sim.chapter}
            </p>

            {sim.live && (
              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-indigo-600
                            opacity-0 group-hover:opacity-100 transition-all duration-300">
                Open
                <ArrowUpRight size={14} />
              </div>
            )}

            {!sim.live && (
              <div className="mt-4 text-xs font-medium text-gray-300">Coming soon</div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────── FEATURE BLOCKS ─────────────────────────────── */

const featureBlocks = [
  {
    tag: 'Simulate',
    title: 'Watch physics happen',
    body: 'Not a video. Not a GIF. Real-time physics calculated frame by frame. Change any parameter and see the result instantly.',
    visual: 'projectile',
  },
  {
    tag: 'Solve',
    title: "Find what's unknown",
    body: "Enter what you know — range, flight time, or max height — and the simulator calculates the missing variable. Exam prep made visual.",
    visual: 'solver',
  },
  {
    tag: 'Understand',
    title: 'See the vectors',
    body: "Velocity decomposition, component arrows, trajectory prediction — everything that's hard to imagine on paper becomes obvious on screen.",
    visual: 'vectors',
  },
];

function FeatureVisual({ type }) {
  if (type === 'projectile') {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden bg-white border border-gray-200 shadow-inner">
        <MiniProjectileDemo />
      </div>
    );
  }

  if (type === 'solver') {
    return (
      <div className="w-full h-full rounded-xl bg-white border border-gray-200 p-6 flex flex-col justify-center shadow-inner">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-400 w-20">Given:</span>
            <div className="flex-1 h-10 bg-orange-50 border border-orange-200 rounded-lg flex items-center px-3">
              <span className="text-sm font-mono text-orange-700">Range = 163.27 m</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-400 w-20">Angle:</span>
            <div className="flex-1 h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center px-3">
              <span className="text-sm font-mono text-gray-600">θ = 45°</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-400 w-20">Height:</span>
            <div className="flex-1 h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center px-3">
              <span className="text-sm font-mono text-gray-600">h = 0 m</span>
            </div>
          </div>

          <div className="h-px bg-gray-200 my-2" />

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
          >
            <span className="text-sm font-semibold text-indigo-600 w-20">Solved:</span>
            <div className="flex-1 h-10 bg-indigo-50 border-2 border-indigo-300 rounded-lg flex items-center px-3">
              <motion.span
                className="text-sm font-mono font-bold text-indigo-700"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9 }}
              >
                v₀ = 40.00 m/s ✓
              </motion.span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // vectors
  return (
    <div className="w-full h-full rounded-xl bg-white border border-gray-200 shadow-inner flex items-center justify-center p-8">
      <svg viewBox="0 0 200 200" className="w-full h-full max-w-[280px]">
        {/* resultant */}
        <motion.line
          x1="40" y1="160" x2="160" y2="40"
          stroke="#6366f1" strokeWidth="2.5"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}
        />
        <motion.polygon
          points="160,40 150,52 155,55"
          fill="#6366f1"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ delay: 0.9 }}
        />

        {/* vx */}
        <motion.line
          x1="40" y1="160" x2="160" y2="160"
          stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.5 }}
        />
        <motion.polygon
          points="160,160 150,155 150,165"
          fill="#3b82f6"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ delay: 1 }}
        />

        {/* vy */}
        <motion.line
          x1="160" y1="160" x2="160" y2="40"
          stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.7 }}
        />
        <motion.polygon
          points="160,40 155,50 165,50"
          fill="#f59e0b"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ delay: 1.2 }}
        />

        {/* angle arc */}
        <motion.path
          d="M 70 160 A 30 30 0 0 1 60 140"
          fill="none" stroke="#94a3b8" strokeWidth="1.5"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ delay: 1.3 }}
        />

        {/* labels */}
        <motion.text x="95" y="88" fill="#6366f1" fontSize="13" fontWeight="700" fontFamily="system-ui"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1 }}>
          v
        </motion.text>
        <motion.text x="95" y="178" fill="#3b82f6" fontSize="11" fontWeight="600" fontFamily="system-ui"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.1 }}>
          vₓ
        </motion.text>
        <motion.text x="166" y="105" fill="#f59e0b" fontSize="11" fontWeight="600" fontFamily="system-ui"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }}>
          vᵧ
        </motion.text>
        <motion.text x="52" y="148" fill="#64748b" fontSize="11" fontFamily="system-ui"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.4 }}>
          θ
        </motion.text>

        {/* ball */}
        <motion.circle cx="40" cy="160" r="5" fill="#4f46e5"
          initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} />
      </svg>
    </div>
  );
}

/* ──────────────────────────── LANDING PAGE ──────────────────────────────── */

export default function LandingPage() {
  const scrollContainerRef = useRef(null);
  const { scrollYProgress } = useScroll();

  // marquee
  const marqueeItems = useMemo(
    () => [
      'Projectile Motion', 'Simple Pendulum', 'Wave Motion', "Newton's Laws",
      'Molecular Viewer', 'Periodic Table', 'Gas Laws', 'Circular Motion',
      'Chemical Bonding', 'Electric Circuits', 'Optics', 'Thermodynamics',
    ],
    []
  );

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">
      {/* ════════════ HERO ════════════ */}
      <section className="relative min-h-screen">
        {/* 3D background — right half only on desktop */}
        <div className="absolute inset-0 md:left-[45%] z-0">
          <div className="absolute inset-0 bg-gray-950" />
          <HeroCanvas />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/80 to-transparent md:hidden" />
        </div>

        {/* Left dark panel */}
        <div className="absolute inset-y-0 left-0 w-full md:w-[55%] bg-gray-950 z-[1]" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 min-h-screen flex items-center">
          <div className="w-full md:w-[50%] py-32">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-700
                        text-xs font-medium text-gray-400 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Nepal NEB Grade 11 & 12
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-[clamp(2.5rem,6vw,4.5rem)] font-black leading-[1.05] tracking-tight text-white mb-6"
            >
              Don't memorize
              <br />
              physics.
              <br />
              <span className="text-indigo-400">Simulate it.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="text-gray-400 text-lg leading-relaxed max-w-md mb-10"
            >
              Interactive simulators for every chapter in your physics and chemistry
              textbook. Solve numericals visually. Understand — don't just calculate.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                to="/simulators/projectile-motion"
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full
                         bg-indigo-600 text-white font-semibold text-sm
                         hover:bg-indigo-500 transition-all duration-200 hover:scale-[1.03]
                         active:scale-[0.98] shadow-xl shadow-indigo-500/20"
              >
                <Play size={16} fill="currentColor" />
                Launch Simulator
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <a
                href="#all-simulators"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full
                         text-gray-300 font-semibold text-sm border border-gray-700
                         hover:border-gray-500 hover:text-white transition-all duration-200"
              >
                Browse all
                <ChevronDown size={15} />
              </a>
            </motion.div>

            {/* micro stat strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex gap-8 mt-16 pt-6 border-t border-gray-800"
            >
              {[
                { n: '12', l: 'Simulators' },
                { n: '2', l: 'Subjects' },
                { n: '∞', l: 'Free forever' },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-xl font-black text-white">{s.n}</div>
                  <div className="text-[11px] text-gray-500 font-medium">{s.l}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:block"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border-2 border-gray-600 flex justify-center pt-1.5"
          >
            <div className="w-1 h-1.5 rounded-full bg-gray-400" />
          </motion.div>
        </motion.div>
      </section>

      {/* ════════════ MARQUEE STRIP ════════════ */}
      <div className="relative py-4 bg-gray-950 border-y border-gray-800 overflow-hidden">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="flex gap-8 whitespace-nowrap"
        >
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="flex items-center gap-3 text-gray-500 text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
              {item}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ════════════ FEATURES ════════════ */}
      <section className="py-24 md:py-32 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <Reveal>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 max-w-lg leading-tight">
              Three things your textbook can't do
            </h2>
            <p className="text-gray-500 text-base max-w-md mb-16">
              Every simulator is built to help you build intuition — not just get the right number.
            </p>
          </Reveal>

          <div className="space-y-20 md:space-y-28">
            {featureBlocks.map((f, i) => (
              <div
                key={f.tag}
                className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center ${
                  i % 2 === 1 ? 'md:direction-rtl' : ''
                }`}
              >
                <Reveal delay={0.1} direction={i % 2 === 0 ? 'left' : 'right'}
                  className={i % 2 === 1 ? 'md:order-2' : ''}>
                  <span className="inline-block text-xs font-bold text-indigo-600 uppercase tracking-widest
                                 bg-indigo-50 px-3 py-1 rounded-full mb-4">
                    {String(i + 1).padStart(2, '0')} — {f.tag}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 leading-tight">
                    {f.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed max-w-sm">{f.body}</p>
                </Reveal>

                <Reveal delay={0.25} direction={i % 2 === 0 ? 'right' : 'left'}
                  className={`h-[300px] md:h-[360px] ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                  <FeatureVisual type={f.visual} />
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ ALL SIMULATORS ════════════ */}
      <section id="all-simulators" className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
              <div>
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">Simulators</p>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                  The full lab
                </h2>
              </div>
              <p className="text-gray-400 text-sm max-w-xs">
                Scroll horizontally. Green dot = live. More simulators shipping regularly.
              </p>
            </div>
          </Reveal>

          {/* Horizontal scroll */}
          <div
            ref={scrollContainerRef}
            className="flex gap-5 overflow-x-auto pb-6 -mx-6 px-6 snap-x snap-mandatory
                     scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
            style={{ scrollbarWidth: 'thin' }}
          >
            {allSimulators.map((sim, i) => (
              <div key={sim.id} className="snap-start">
                <SimCard sim={sim} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ CURRICULUM BADGES ════════════ */}
      <section className="py-20 bg-gray-950">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <Reveal>
            <div className="text-center mb-12">
              <p className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3">Curriculum</p>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                Built for your syllabus
              </h2>
              <p className="text-gray-500 mt-2 max-w-md mx-auto text-sm">
                Every simulation maps directly to NEB Grade 11 & 12 Physics and Chemistry chapters.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { ch: 'Mechanics', sub: 'Physics', count: 4 },
              { ch: 'Heat & Thermodynamics', sub: 'Physics', count: 1 },
              { ch: 'Waves & Optics', sub: 'Physics', count: 3 },
              { ch: 'Electricity', sub: 'Physics', count: 1 },
              { ch: 'Chemical Bonding', sub: 'Chemistry', count: 2 },
              { ch: 'States of Matter', sub: 'Chemistry', count: 1 },
              { ch: 'Periodic Classification', sub: 'Chemistry', count: 1 },
              { ch: 'Electrochemistry', sub: 'Chemistry', count: 1 },
            ].map((c, i) => (
              <Reveal key={c.ch} delay={i * 0.05}>
                <div className="p-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700
                              transition-colors duration-200">
                  <div className="text-sm font-bold text-white mb-1">{c.ch}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      c.sub === 'Physics' ? 'text-blue-400' : 'text-emerald-400'
                    }`}>
                      {c.sub}
                    </span>
                    <span className="text-[10px] text-gray-600">•</span>
                    <span className="text-[10px] text-gray-500">{c.count} sim{c.count > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ CTA ════════════ */}
      <section className="relative py-24 md:py-32 bg-white overflow-hidden">
        {/* subtle grid bg */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-8">
              <Atom size={32} className="text-indigo-600" />
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-5 leading-tight">
              Stop reading about physics.
              <br />
              <span className="text-indigo-600">Start playing with it.</span>
            </h2>

            <p className="text-gray-500 text-lg mb-10 max-w-lg mx-auto">
              Open the simulator. Change the angle. Watch what happens. That's it.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/simulators/projectile-motion"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full
                         bg-gray-900 text-white font-semibold text-base
                         hover:bg-gray-800 transition-all duration-200 hover:scale-[1.03]
                         active:scale-[0.98] shadow-xl shadow-gray-900/20"
              >
                <Play size={16} fill="currentColor" />
                Open Projectile Motion
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <a
                href="https://github.com/dds3579"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full
                         text-gray-700 font-semibold text-base border-2 border-gray-200
                         hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                View on GitHub
                <ExternalLink size={14} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}