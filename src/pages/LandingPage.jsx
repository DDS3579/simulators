// src/pages/LandingPage.jsx
import { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, MeshTransmissionMaterial } from '@react-three/drei';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Play, ChevronDown, ExternalLink, MousePointer2 } from 'lucide-react';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   3D HERO SCENE — Glass orbs with internal particle systems
   ═══════════════════════════════════════════════════════════════════════════ */

function ParticleSwarm({ count = 60, radius = 1.2, color = '#818cf8', speed = 0.4 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.3 + Math.random() * 0.7);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count, radius]);

  const initialPositions = useMemo(() => new Float32Array(positions), [positions]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed;
    const posArray = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
      posArray[ix] = initialPositions[ix] + Math.sin(t + i * 0.5) * 0.08;
      posArray[iy] = initialPositions[iy] + Math.cos(t + i * 0.3) * 0.08;
      posArray[iz] = initialPositions[iz] + Math.sin(t + i * 0.7) * 0.06;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.035} transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

function GlassOrb({ position, radius = 1, color = '#6366f1', particleColor = '#a5b4fc', distort = 0.15, speed = 1 }) {
  const groupRef = useRef();
  const meshRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.3 * speed;
    groupRef.current.position.y = position[1] + Math.sin(t) * 0.15;
    groupRef.current.rotation.y = t * 0.2;
    groupRef.current.rotation.x = Math.sin(t * 0.7) * 0.05;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Outer glass shell */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          transparent
          opacity={0.08}
          distort={distort}
          speed={2}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[radius * 0.92, 32, 32]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.04}
          emissive={color}
          emissiveIntensity={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Wireframe structure */}
      <mesh>
        <icosahedronGeometry args={[radius * 0.55, 1]} />
        <meshStandardMaterial
          color={particleColor}
          wireframe
          transparent
          opacity={0.15}
          emissive={particleColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Particles inside */}
      <ParticleSwarm count={40} radius={radius * 0.8} color={particleColor} speed={0.5} />
    </group>
  );
}

function OrbitalRing({ radius = 3, speed = 0.2, color = '#6366f1', opacity = 0.06, tilt = 0 }) {
  const ref = useRef();

  useFrame((state) => {
    ref.current.rotation.z = state.clock.elapsedTime * speed;
  });

  return (
    <group rotation={[tilt, 0, 0]}>
      <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.006, 16, 200]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

function FloatingParticles() {
  const count = 120;
  const ref = useRef();

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 3;
    }
    return pos;
  }, []);

  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#6366f1" size={0.02} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

function ConnectionLines() {
  const ref = useRef();

  const linePoints = useMemo(() => {
    const points = [];
    const connections = [
      [[-2.5, 0.5, -1], [0, 0.2, 0]],
      [[0, 0.2, 0], [2.8, -0.3, -1.5]],
      [[-2.5, 0.5, -1], [2.8, -0.3, -1.5]],
      [[0, 0.2, 0], [1.5, 1.8, -0.5]],
      [[-2.5, 0.5, -1], [1.5, 1.8, -0.5]],
    ];

    connections.forEach(([start, end]) => {
      const midX = (start[0] + end[0]) / 2 + (Math.random() - 0.5) * 0.5;
      const midY = (start[1] + end[1]) / 2 + (Math.random() - 0.5) * 0.5;
      const midZ = (start[2] + end[2]) / 2;

      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...start),
        new THREE.Vector3(midX, midY, midZ),
        new THREE.Vector3(...end)
      );
      points.push(...curve.getPoints(30));
    });
    return points;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <group ref={ref}>
      {linePoints.length > 0 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={linePoints.length}
              array={new Float32Array(linePoints.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#6366f1" transparent opacity={0.05} />
        </line>
      )}
    </group>
  );
}

function HeroScene() {
  const { viewport } = useThree();
  const isMobile = viewport.width < 6;

  return (
    <>
      <color attach="background" args={['#030712']} />
      <fog attach="fog" args={['#030712', 6, 18]} />

      <ambientLight intensity={0.15} />
      <pointLight position={[4, 4, 4]} intensity={0.5} color="#a5b4fc" />
      <pointLight position={[-4, -2, 3]} intensity={0.3} color="#c084fc" />
      <pointLight position={[0, 3, -2]} intensity={0.2} color="#818cf8" />

      {/* Main central orb — the "knowledge" nucleus */}
      <GlassOrb
        position={[0, 0.2, 0]}
        radius={isMobile ? 1.3 : 1.5}
        color="#6366f1"
        particleColor="#a5b4fc"
        distort={0.12}
        speed={0.8}
      />

      {/* Satellite orbs — representing different subjects */}
      <GlassOrb
        position={[-2.5, 0.5, -1]}
        radius={0.6}
        color="#8b5cf6"
        particleColor="#c4b5fd"
        distort={0.2}
        speed={1.2}
      />
      <GlassOrb
        position={[2.8, -0.3, -1.5]}
        radius={0.5}
        color="#6366f1"
        particleColor="#818cf8"
        distort={0.18}
        speed={0.9}
      />
      <GlassOrb
        position={[1.5, 1.8, -0.5]}
        radius={0.35}
        color="#a78bfa"
        particleColor="#ddd6fe"
        distort={0.25}
        speed={1.5}
      />

      {/* Orbital rings around main orb */}
      <OrbitalRing radius={2.2} speed={0.08} color="#6366f1" opacity={0.08} tilt={0.3} />
      <OrbitalRing radius={2.8} speed={-0.05} color="#8b5cf6" opacity={0.05} tilt={-0.5} />
      <OrbitalRing radius={3.4} speed={0.03} color="#a78bfa" opacity={0.03} tilt={0.8} />

      {/* Connection lines between orbs */}
      <ConnectionLines />

      {/* Background particles */}
      <FloatingParticles />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MINI INTERACTIVE PROJECTILE DEMO
   ═══════════════════════════════════════════════════════════════════════════ */

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
    (t) => ({
      x: vx * t,
      y: Math.max(0, vy * t - 0.5 * g * t * t),
    }),
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
    const sc = Math.min((w - 60) / maxX, (h - 50) / maxY);
    const ox = 30;
    const oy = h - 25;

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= maxX; x += 20) {
      ctx.beginPath(); ctx.moveTo(ox + x * sc, 10); ctx.lineTo(ox + x * sc, oy); ctx.stroke();
    }
    for (let y = 0; y <= maxY; y += 10) {
      ctx.beginPath(); ctx.moveTo(ox, oy - y * sc); ctx.lineTo(w - 10, oy - y * sc); ctx.stroke();
    }

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(w - 10, oy); ctx.stroke();

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let t = 0; t <= tFlight; t += 0.05) {
      const p = getPos(t);
      const px = ox + p.x * sc, py = oy - p.y * sc;
      t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (trailRef.current.length > 1) {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      trailRef.current.forEach((p, i) => {
        const px = ox + p.x * sc, py = oy - p.y * sc;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.fillStyle = '#a5b4fc';
      const step = Math.max(1, Math.floor(trailRef.current.length / 12));
      trailRef.current.forEach((p, i) => {
        if (i % step !== 0) return;
        ctx.beginPath();
        ctx.arc(ox + p.x * sc, oy - p.y * sc, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const pos = getPos(tRef.current);
    const px = ox + pos.x * sc, py = oy - pos.y * sc;

    ctx.shadowColor = 'rgba(99,102,241,0.4)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    if (launched && tRef.current < tFlight) {
      const cvxNow = vx;
      const cvyNow = vy - g * tRef.current;
      const mag = Math.sqrt(cvxNow * cvxNow + cvyNow * cvyNow);
      const arrowLen = Math.min(mag * 1.2, 50);
      const ang = Math.atan2(cvyNow, cvxNow);
      const ex = px + arrowLen * Math.cos(ang);
      const ey = py - arrowLen * Math.sin(ang);

      ctx.strokeStyle = cvyNow >= 0 ? '#10b981' : '#ef4444';
      ctx.fillStyle = cvyNow >= 0 ? '#10b981' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
      const hl = 7, ha = 0.4;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - hl * Math.cos(ang - ha), ey + hl * Math.sin(ang - ha));
      ctx.lineTo(ex - hl * Math.cos(ang + ha), ey + hl * Math.sin(ang + ha));
      ctx.closePath(); ctx.fill();
    }

    if (!launched || tRef.current === 0) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ox, oy, 30, -rad, 0); ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui';
      ctx.fillText(`${angle}°`, ox + 34, oy - 8);
    }

    ctx.restore();
  }, [getPos, tFlight, launched, vx, vy, g, angle, rad]);

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

  useEffect(() => {
    if (!launched) return;
    let prev = 0;
    const tick = (ts) => {
      if (!prev) prev = ts;
      const dt = Math.min((ts - prev) / 1000, 0.05);
      prev = ts;
      tRef.current += dt;
      trailRef.current.push(getPos(tRef.current));
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
        <button onClick={handleLaunch}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full
                   bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30
                   hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all duration-200">
          <Play size={14} fill="currentColor" />
          {tRef.current > 0 ? 'Replay' : 'Launch'}
        </button>
      )}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full
                     bg-white/80 backdrop-blur text-[11px] font-medium text-gray-500 border border-gray-200/60">
        <MousePointer2 size={11} /> Interactive Demo
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REVEAL ANIMATION
   ═══════════════════════════════════════════════════════════════════════════ */

function Reveal({ children, className = '', delay = 0, direction = 'up' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const dirs = {
    up: { hidden: { y: 30 }, show: { y: 0 } },
    left: { hidden: { x: 40 }, show: { x: 0 } },
    right: { hidden: { x: -40 }, show: { x: 0 } },
    none: { hidden: {}, show: {} },
  };

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, ...dirs[direction].hidden }}
      animate={inView ? { opacity: 1, ...dirs[direction].show } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE VISUALS
   ═══════════════════════════════════════════════════════════════════════════ */

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
          {[
            { label: 'Given:', val: 'Range = 163.27 m', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
            { label: 'Angle:', val: 'θ = 45°', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
            { label: 'Height:', val: 'h = 0 m', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-400 w-20">{r.label}</span>
              <div className={`flex-1 h-10 ${r.bg} border ${r.border} rounded-lg flex items-center px-3`}>
                <span className={`text-sm font-mono ${r.text}`}>{r.val}</span>
              </div>
            </div>
          ))}
          <div className="h-px bg-gray-200 my-2" />
          <motion.div className="flex items-center gap-3"
            initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.6 }}>
            <span className="text-sm font-semibold text-indigo-600 w-20">Solved:</span>
            <div className="flex-1 h-10 bg-indigo-50 border-2 border-indigo-300 rounded-lg flex items-center px-3">
              <motion.span className="text-sm font-mono font-bold text-indigo-700"
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                viewport={{ once: true }} transition={{ delay: 0.9 }}>
                v₀ = 40.00 m/s ✓
              </motion.span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl bg-white border border-gray-200 shadow-inner flex items-center justify-center p-8">
      <svg viewBox="0 0 200 200" className="w-full h-full max-w-[280px]">
        <motion.line x1="40" y1="160" x2="160" y2="40" stroke="#6366f1" strokeWidth="2.5" fill="none"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }} />
        <motion.polygon points="160,40 150,52 155,55" fill="#6366f1"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.9 }} />
        <motion.line x1="40" y1="160" x2="160" y2="160" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.5 }} />
        <motion.polygon points="160,160 150,155 150,165" fill="#3b82f6"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1 }} />
        <motion.line x1="160" y1="160" x2="160" y2="40" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.7 }} />
        <motion.polygon points="160,40 155,50 165,50" fill="#f59e0b"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }} />
        <motion.path d="M 70 160 A 30 30 0 0 1 60 140" fill="none" stroke="#94a3b8" strokeWidth="1.5"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true }} transition={{ delay: 1.3 }} />
        <motion.text x="95" y="88" fill="#6366f1" fontSize="13" fontWeight="700" fontFamily="system-ui"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1 }}>v</motion.text>
        <motion.text x="95" y="178" fill="#3b82f6" fontSize="11" fontWeight="600" fontFamily="system-ui"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.1 }}>vₓ</motion.text>
        <motion.text x="166" y="105" fill="#f59e0b" fontSize="11" fontWeight="600" fontFamily="system-ui"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }}>vᵧ</motion.text>
        <motion.text x="52" y="148" fill="#64748b" fontSize="11" fontFamily="system-ui"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.4 }}>θ</motion.text>
        <motion.circle cx="40" cy="160" r="5" fill="#4f46e5"
          initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIMULATORS DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const allSimulators = [
  { id: 'projectile', title: 'Projectile Motion', desc: 'Trajectory, velocity vectors, inverse solver', icon: '🎯', subject: 'Physics', path: '/simulators/projectile-motion', live: true, chapter: 'Mechanics' },
  { id: 'pendulum', title: 'Simple Pendulum', desc: 'SHM, period, energy conservation', icon: '🕰️', subject: 'Physics', path: '/simulators/pendulum', live: false, chapter: 'Oscillations' },
  { id: 'waves', title: 'Wave Motion', desc: 'Transverse, longitudinal, interference', icon: '🌊', subject: 'Physics', path: '/simulators/waves', live: false, chapter: 'Waves' },
  { id: 'newton', title: "Newton's Laws", desc: 'Force diagrams, friction, inclined planes', icon: '🍎', subject: 'Physics', path: '/simulators/newtons-laws', live: false, chapter: 'Mechanics' },
  { id: 'circular', title: 'Circular Motion', desc: 'Centripetal force, angular velocity', icon: '🔄', subject: 'Physics', path: '/simulators/circular-motion', live: false, chapter: 'Mechanics' },
  { id: 'molecular', title: 'Molecular Viewer', desc: '3D structures, bond angles, geometry', icon: '🧬', subject: 'Chemistry', path: '/simulators/molecular-viewer', live: false, chapter: 'Chemical Bonding' },
  { id: 'periodic', title: 'Periodic Table', desc: 'Electron config, trends, properties', icon: '📊', subject: 'Chemistry', path: '/simulators/periodic-table', live: false, chapter: 'Classification' },
  { id: 'gaslaw', title: 'Gas Laws', desc: "Boyle's, Charles's, ideal gas", icon: '💨', subject: 'Chemistry', path: '/simulators/gas-laws', live: false, chapter: 'States of Matter' },
  { id: 'bonding', title: 'Chemical Bonding', desc: 'Ionic, covalent, metallic bonds', icon: '🔗', subject: 'Chemistry', path: '/simulators/bonding', live: false, chapter: 'Chemical Bonding' },
  { id: 'circuits', title: 'Electric Circuits', desc: "Ohm's law, series, parallel", icon: '🔌', subject: 'Physics', path: '/simulators/circuits', live: false, chapter: 'Current Electricity' },
  { id: 'optics', title: 'Optics & Lenses', desc: 'Reflection, refraction, lens formula', icon: '🔍', subject: 'Physics', path: '/simulators/optics', live: false, chapter: 'Optics' },
  { id: 'thermo', title: 'Thermodynamics', desc: 'Heat engines, entropy, PV diagrams', icon: '🌡️', subject: 'Physics', path: '/simulators/thermodynamics', live: false, chapter: 'Heat' },
];

const chapters = [
  { ch: 'Mechanics', sub: 'Physics', count: 4, icon: '⚙️' },
  { ch: 'Heat & Thermodynamics', sub: 'Physics', count: 1, icon: '🔥' },
  { ch: 'Waves & Optics', sub: 'Physics', count: 3, icon: '🌊' },
  { ch: 'Electricity', sub: 'Physics', count: 1, icon: '⚡' },
  { ch: 'Chemical Bonding', sub: 'Chemistry', count: 2, icon: '🔗' },
  { ch: 'States of Matter', sub: 'Chemistry', count: 1, icon: '💧' },
  { ch: 'Periodic Classification', sub: 'Chemistry', count: 1, icon: '📋' },
  { ch: 'Electrochemistry', sub: 'Chemistry', count: 1, icon: '🔋' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SIMULATOR CARD (for horizontal scroll)
   ═══════════════════════════════════════════════════════════════════════════ */

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
      <Link to={sim.live ? sim.path : '#'} onClick={(e) => !sim.live && e.preventDefault()}
        className={`block h-full ${!sim.live ? 'cursor-default' : ''}`}>
        <div className={`h-full rounded-2xl border transition-all duration-300 overflow-hidden ${
          sim.live
            ? 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/8 group'
            : 'bg-gray-50/80 border-gray-100'
        }`}>
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{sim.icon}</span>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  sim.subject === 'Physics' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                }`}>{sim.subject}</span>
                {sim.live && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                  </span>
                )}
              </div>
            </div>
            <h3 className={`font-bold text-base mb-1 transition-colors ${
              sim.live ? 'text-gray-900 group-hover:text-indigo-700' : 'text-gray-400'
            }`}>{sim.title}</h3>
            <p className={`text-sm leading-relaxed ${sim.live ? 'text-gray-500' : 'text-gray-300'}`}>{sim.desc}</p>
            <p className={`text-[11px] mt-2 ${sim.live ? 'text-gray-400' : 'text-gray-300'}`}>Ch: {sim.chapter}</p>
            {sim.live && (
              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-indigo-600
                            opacity-0 group-hover:opacity-100 transition-all duration-300">
                Open <ArrowUpRight size={14} />
              </div>
            )}
            {!sim.live && <div className="mt-4 text-xs font-medium text-gray-300">Coming soon</div>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MARQUEE
   ═══════════════════════════════════════════════════════════════════════════ */

const marqueeItems = [
  'Projectile Motion', 'Simple Pendulum', 'Wave Motion', "Newton's Laws",
  'Molecular Viewer', 'Periodic Table', 'Gas Laws', 'Circular Motion',
  'Chemical Bonding', 'Electric Circuits', 'Optics', 'Thermodynamics',
];

/* ═══════════════════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredSims = useMemo(() => {
    if (activeFilter === 'All') return allSimulators;
    return allSimulators.filter((s) => s.subject === activeFilter);
  }, [activeFilter]);

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">

      {/* ════════════════════ HERO ════════════════════ */}
      <section className="relative min-h-screen bg-gray-950 overflow-hidden">
        {/* Full-screen 3D canvas */}
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 5.5], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}>
            <Suspense fallback={null}>
              <HeroScene />
            </Suspense>
          </Canvas>
        </div>

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-gray-950 via-gray-950/30 to-gray-950/50" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-gray-950/70 via-transparent to-gray-950/70 md:from-gray-950/50 md:to-gray-950/50" />

        {/* Hero content — centered */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6">
          <div className="max-w-3xl">
            {/* Tag */}
            {/* <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-700/80
                        text-xs font-medium text-gray-400 mb-8 backdrop-blur-sm bg-gray-900/30"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </motion.div> */}

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-[clamp(2.2rem,5.5vw,4.2rem)] font-black leading-[1.08] tracking-tight text-white mb-6"
            >
              Science was never meant
              <br />
              to be memorized.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400
                             bg-clip-text text-transparent bg-[length:200%_auto]
                             animate-[gradient_4s_ease-in-out_infinite]">
                It was meant to be seen.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55 }}
              className="text-gray-400 text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-10"
            >
              Interactive simulators that turn textbook formulas into visual experiences.
              Projectiles fly. Molecules rotate. Waves propagate. You understand.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex flex-wrap justify-center gap-3"
            >
              <Link to="/simulators/projectile-motion"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full
                         bg-indigo-600 text-white font-semibold text-sm
                         hover:bg-indigo-500 transition-all duration-200 hover:scale-[1.03]
                         active:scale-[0.98] shadow-xl shadow-indigo-500/25">
                <Play size={16} fill="currentColor" />
                Start Simulating
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="#all-simulators"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full
                         text-gray-300 font-semibold text-sm border border-gray-700
                         hover:border-gray-500 hover:text-white transition-all duration-200
                         backdrop-blur-sm bg-gray-900/20">
                Explore all simulators
                <ChevronDown size={15} />
              </a>
            </motion.div>

            {/* Subject pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-wrap justify-center gap-2 mt-12"
            >
              {['⚡ Mechanics', '🌊 Waves', '🔌 Electricity', '🌡️ Heat', '🧬 Molecular', '🔗 Bonding', '💨 Gas Laws', '📊 Periodic Table'].map((s) => (
                <span key={s} className="px-3 py-1.5 rounded-full border border-gray-800 text-[11px]
                                       font-medium text-gray-500 bg-gray-900/30 backdrop-blur-sm">
                  {s}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        {/* <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <motion.div animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border-2 border-gray-600 flex justify-center pt-1.5">
            <div className="w-1 h-1.5 rounded-full bg-gray-400" />
          </motion.div>
        </motion.div> */}
      </section>

      {/* ════════════════════ MARQUEE ════════════════════ */}
      <div className="relative py-4 bg-gray-950 border-y border-gray-800 overflow-hidden">
        <motion.div animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="flex gap-8 whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="flex items-center gap-3 text-gray-500 text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
              {item}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ════════════════════ FEATURES ════════════════════ */}
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
              <div key={f.tag}
                className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center`}>
                <Reveal delay={0.1} direction={i % 2 === 0 ? 'left' : 'right'}
                  className={i % 2 === 1 ? 'md:order-2' : ''}>
                  <span className="inline-block text-xs font-bold text-indigo-600 uppercase tracking-widest
                                 bg-indigo-50 px-3 py-1 rounded-full mb-4">
                    {String(i + 1).padStart(2, '0')} — {f.tag}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 leading-tight">{f.title}</h3>
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

      {/* ════════════════════ ALL SIMULATORS ════════════════════ */}
      <section id="all-simulators" className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
              <div>
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">
                  The Lab
                </p>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">
                  Every simulator, one scroll
                </h2>
                <p className="text-gray-500 text-sm mt-2 max-w-md">
                  Filter by subject. Green dot means it's live and ready to use.
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex gap-2">
                {['All', 'Physics', 'Chemistry'].map((f) => (
                  <button key={f} onClick={() => setActiveFilter(f)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                      activeFilter === f
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {f === 'Physics' && '⚡ '}
                    {f === 'Chemistry' && '🧪 '}
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Grid layout for simulators */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilter}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredSims.map((sim, i) => (
                <motion.div key={sim.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  whileHover={sim.live ? { y: -4 } : {}}>
                  <Link to={sim.live ? sim.path : '#'}
                    onClick={(e) => !sim.live && e.preventDefault()}
                    className={`block h-full ${!sim.live ? 'cursor-default' : ''}`}>
                    <div className={`h-full rounded-xl border transition-all duration-300 ${
                      sim.live
                        ? 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 group'
                        : 'bg-gray-50/60 border-gray-100'
                    }`}>
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl">{sim.icon}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              sim.subject === 'Physics' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                            }`}>{sim.subject}</span>
                            {sim.live ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-gray-200" />
                            )}
                          </div>
                        </div>
                        <h3 className={`font-bold text-sm mb-1 transition-colors ${
                          sim.live ? 'text-gray-900 group-hover:text-indigo-700' : 'text-gray-400'
                        }`}>{sim.title}</h3>
                        <p className={`text-xs leading-relaxed ${
                          sim.live ? 'text-gray-500' : 'text-gray-300'
                        }`}>{sim.desc}</p>
                        {sim.live && (
                          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600
                                        opacity-0 group-hover:opacity-100 transition-all duration-200">
                            Open simulator <ArrowUpRight size={12} />
                          </div>
                        )}
                        {!sim.live && (
                          <div className="mt-3 text-[11px] text-gray-300 font-medium">Coming soon</div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ════════════════════ CURRICULUM MAP ════════════════════ */}
      <section className="py-20 md:py-24 bg-gray-950">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
              <div>
                <p className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">
                  Syllabus Coverage
                </p>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                  Mapped to every chapter you study
                </h2>
              </div>
              <p className="text-sm text-gray-500 max-w-xs">
                Every simulator connects directly to your NEB textbook.
                No extra topics, no missing ones.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {chapters.map((c, i) => (
              <Reveal key={c.ch} delay={i * 0.05}>
                <div className="group relative p-5 rounded-xl border border-gray-800 bg-gray-900/40
                              hover:border-gray-700 hover:bg-gray-900/70 transition-all duration-300
                              cursor-default overflow-hidden">
                  {/* Subtle hover glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0
                                group-hover:from-indigo-500/5 group-hover:to-purple-500/5
                                transition-all duration-500 rounded-xl" />

                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{c.icon}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${
                        c.sub === 'Physics' ? 'text-blue-400' : 'text-emerald-400'
                      }`}>{c.sub}</span>
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1">{c.ch}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: c.count }).map((_, j) => (
                          <div key={j} className="w-2 h-2 rounded-full bg-indigo-500/60" />
                        ))}
                        {Array.from({ length: Math.max(0, 4 - c.count) }).map((_, j) => (
                          <div key={j} className="w-2 h-2 rounded-full bg-gray-800" />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {c.count} sim{c.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ CTA ════════════════════ */}
      <section className="relative py-24 md:py-32 bg-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />

        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <Reveal>
            <p className="text-gray-400 text-sm font-medium mb-3">Enough scrolling.</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-5 leading-tight">
              Go watch a projectile fly.
            </h2>
            <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
              Open the simulator. Change the angle. See what happens. That's the whole point.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/simulators/projectile-motion"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full
                         bg-gray-900 text-white font-semibold text-base
                         hover:bg-gray-800 transition-all duration-200 hover:scale-[1.03]
                         active:scale-[0.98] shadow-xl shadow-gray-900/20">
                <Play size={16} fill="currentColor" />
                Open Simulator
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="https://github.com/dds3579" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full
                         text-gray-700 font-semibold text-base border-2 border-gray-200
                         hover:border-gray-300 hover:bg-gray-50 transition-all duration-200">
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