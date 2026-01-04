import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const ProjectileMotion = () => {
  const [projectileType, setProjectileType] = useState('angled'); // 'angled' or 'horizontal'
  const [velocity, setVelocity] = useState(40);
  const [angle, setAngle] = useState(45);
  const [height, setHeight] = useState(20);
  const [gravity, setGravity] = useState(9.8);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [maxHeight, setMaxHeight] = useState(0);
  const [range, setRange] = useState(0);
  const [flightTime, setFlightTime] = useState(0);
  const [trail, setTrail] = useState([]);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  const gravityOptions = {
    'Earth': 9.8,
    'Moon': 1.62,
    'Mars': 3.71
  };

  // Calculate trajectory parameters
  const calculateTrajectory = () => {
    if (projectileType === 'horizontal') {
      // Horizontal projectile: vx = velocity, vy = 0 initially
      const vx = velocity;
      const vy = 0;
      
      // Time of flight: y = h - 0.5*g*t² = 0 => t = sqrt(2h/g)
      const tFlight = Math.sqrt((2 * height) / gravity);
      
      // Maximum height is just the initial height
      const hMax = height;
      
      // Range
      const totalRange = vx * tFlight;
      
      return { vx, vy, tFlight, hMax, totalRange };
    } else {
      // Angled projectile
      const angleRad = (angle * Math.PI) / 180;
      const vx = velocity * Math.cos(angleRad);
      const vy = velocity * Math.sin(angleRad);
      
      // Time of flight: solve y = h + vy*t - 0.5*g*t² = 0
      const discriminant = vy * vy + 2 * gravity * height;
      const tFlight = (vy + Math.sqrt(discriminant)) / gravity;
      
      // Maximum height
      const tMaxHeight = vy / gravity;
      const hMax = height + (vy * vy) / (2 * gravity);
      
      // Range
      const totalRange = vx * tFlight;
      
      return { vx, vy, tFlight, hMax, totalRange };
    }
  };

  // Calculate current position and velocity
  const calculatePosition = (t) => {
    if (projectileType === 'horizontal') {
      const vx = velocity;
      const x = vx * t;
      const y = height - 0.5 * gravity * t * t;
      const currentVy = -gravity * t;
      
      return { x, y: Math.max(0, y), vx, vy: currentVy };
    } else {
      const angleRad = (angle * Math.PI) / 180;
      const vx = velocity * Math.cos(angleRad);
      const vy = velocity * Math.sin(angleRad);
      
      const x = vx * t;
      const y = height + vy * t - 0.5 * gravity * t * t;
      
      const currentVy = vy - gravity * t;
      
      return { x, y: Math.max(0, y), vx, vy: currentVy };
    }
  };

  // Animation loop
  useEffect(() => {
    if (!isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      setTime(prevTime => {
        const newTime = prevTime + deltaTime * speed;
        const { x, y, vx, vy } = calculatePosition(newTime);
        
        setPosition({ x, y });
        
        // Add to trail
        setTrail(prev => [...prev.slice(-50), { x, y }]);
        
        // Check if landed
        if (y <= 0 && newTime > 0) {
          setIsRunning(false);
          const { tFlight, totalRange } = calculateTrajectory();
          setFlightTime(tFlight);
          setRange(totalRange);
          return tFlight;
        }
        
        return newTime;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, speed, velocity, angle, height, gravity]);

  // Calculate max height and range when parameters change
  useEffect(() => {
    const { hMax, totalRange, tFlight } = calculateTrajectory();
    setMaxHeight(hMax);
    if (!isRunning) {
      setRange(totalRange);
      setFlightTime(tFlight);
    }
  }, [velocity, angle, height, gravity, projectileType]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate scale
    const { totalRange, hMax } = calculateTrajectory();
    const maxDistance = Math.max(totalRange, 50);
    const maxHeightDisplay = Math.max(hMax + 10, 30);
    
    const scaleX = (width - 100) / maxDistance;
    const scaleY = (height - 100) / maxHeightDisplay;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = 50;
    const offsetY = height - 50;

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= maxDistance; i += 10) {
      ctx.beginPath();
      ctx.moveTo(offsetX + i * scale, offsetY);
      ctx.lineTo(offsetX + i * scale, 20);
      ctx.stroke();
    }
    
    for (let i = 0; i <= maxHeightDisplay; i += 5) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY - i * scale);
      ctx.lineTo(width - 20, offsetY - i * scale);
      ctx.stroke();
    }

    // Draw ground
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(width - 20, offsetY);
    ctx.stroke();

    // Draw launch platform if height > 0
    if (height > 0) {
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(offsetX - 10, offsetY - height * scale - 5, 20, height * scale + 5);
    }

    // Draw trajectory trail
    if (trail.length > 1) {
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      trail.forEach((point, i) => {
        const x = offsetX + point.x * scale;
        const y = offsetY - point.y * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw full trajectory path (prediction)
    if (!isRunning && time === 0) {
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      
      const { tFlight } = calculateTrajectory();
      for (let t = 0; t <= tFlight; t += 0.1) {
        const { x, y } = calculatePosition(t);
        const canvasX = offsetX + x * scale;
        const canvasY = offsetY - y * scale;
        if (t === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw projectile
    const projX = offsetX + position.x * scale;
    const projY = offsetY - position.y * scale;
    
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.arc(projX, projY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw velocity vector
    if (isRunning || time > 0) {
      const { vx, vy } = calculatePosition(time);
      const vMag = Math.sqrt(vx * vx + vy * vy);
      const arrowLength = Math.min(vMag * 2, 60);
      const arrowAngle = Math.atan2(vy, vx);
      
      const endX = projX + arrowLength * Math.cos(arrowAngle);
      const endY = projY - arrowLength * Math.sin(arrowAngle);
      
      // Color based on direction
      ctx.strokeStyle = vy >= 0 ? '#10b981' : '#ef4444';
      ctx.fillStyle = vy >= 0 ? '#10b981' : '#ef4444';
      ctx.lineWidth = 2;
      
      // Arrow line
      ctx.beginPath();
      ctx.moveTo(projX, projY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Arrow head
      const headLength = 10;
      const headAngle = Math.PI / 6;
      
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLength * Math.cos(arrowAngle - headAngle),
        endY + headLength * Math.sin(arrowAngle - headAngle)
      );
      ctx.lineTo(
        endX - headLength * Math.cos(arrowAngle + headAngle),
        endY + headLength * Math.sin(arrowAngle + headAngle)
      );
      ctx.closePath();
      ctx.fill();
    }

    // Draw distance markers
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    for (let i = 0; i <= maxDistance; i += 20) {
      ctx.fillText(`${i}m`, offsetX + i * scale, offsetY + 20);
    }

  }, [position, trail, isRunning, time, velocity, angle, height, gravity]);

  const handleLaunch = () => {
    if (isRunning) {
      setIsRunning(false);
    } else if (time === 0 || time >= flightTime) {
      setTime(0);
      setPosition({ x: 0, y: height });
      setTrail([]);
      lastTimeRef.current = 0;
      setIsRunning(true);
    } else {
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    setPosition({ x: 0, y: height });
    setTrail([]);
    lastTimeRef.current = 0;
    const { hMax, totalRange, tFlight } = calculateTrajectory();
    setMaxHeight(hMax);
    setRange(totalRange);
    setFlightTime(tFlight);
  };

  const currentVelocity = calculatePosition(time);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">Projectile Motion Simulator</h1>
          <p className="text-gray-600">Interactive physics visualization for Grade 11-12 students</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-5">
              <h2 className="text-xl font-bold text-indigo-900 mb-4">Launch Parameters</h2>
              
              {/* Projectile Type Selector */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Projectile Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => !isRunning && setProjectileType('angled')}
                    disabled={isRunning}
                    className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                      projectileType === 'angled'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    Angled Launch
                  </button>
                  <button
                    onClick={() => !isRunning && setProjectileType('horizontal')}
                    disabled={isRunning}
                    className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                      projectileType === 'horizontal'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    Horizontal Launch
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {projectileType === 'angled' 
                    ? 'Launch at an angle with initial vertical velocity'
                    : 'Launch horizontally from a height (initial Vy = 0)'}
                </p>
              </div>
              
              {/* Initial Velocity */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {projectileType === 'horizontal' ? 'Horizontal Velocity' : 'Initial Velocity'}: {velocity} m/s
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={velocity}
                  onChange={(e) => !isRunning && setVelocity(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={velocity}
                  onChange={(e) => !isRunning && setVelocity(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>

              {/* Launch Angle - Only show for angled projectile */}
              {projectileType === 'angled' && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Launch Angle: {angle}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={angle}
                    onChange={(e) => !isRunning && setAngle(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  />
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={angle}
                    onChange={(e) => !isRunning && setAngle(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
              )}

              {/* Launch Height */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Launch Height: {height} m
                  {projectileType === 'horizontal' && <span className="text-red-600"> *</span>}
                </label>
                <input
                  type="range"
                  min={projectileType === 'horizontal' ? '1' : '0'}
                  max="50"
                  value={height}
                  onChange={(e) => !isRunning && setHeight(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
                <input
                  type="number"
                  min={projectileType === 'horizontal' ? '1' : '0'}
                  max="50"
                  value={height}
                  onChange={(e) => !isRunning && setHeight(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                {projectileType === 'horizontal' && (
                  <p className="text-xs text-red-600 mt-1">* Required for horizontal launch</p>
                )}
              </div>

              {/* Gravity */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gravity Environment
                </label>
                <select
                  value={Object.keys(gravityOptions).find(key => gravityOptions[key] === gravity)}
                  onChange={(e) => !isRunning && setGravity(gravityOptions[e.target.value])}
                  disabled={isRunning}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {Object.keys(gravityOptions).map(planet => (
                    <option key={planet} value={planet}>
                      {planet} ({gravityOptions[planet]} m/s²)
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed Control */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Playback Speed: {speed}x
                </label>
                <div className="flex gap-2">
                  {[0.5, 1, 2].map(s => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        speed === s
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleLaunch}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {isRunning ? <Pause size={20} /> : <Play size={20} />}
                  {isRunning ? 'Pause' : 'Launch'}
                </button>
                <button
                  onClick={handleReset}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Area - Visualization */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-5">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="w-full border border-gray-200 rounded-lg"
              />
            </div>

            {/* Live Calculations */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Time</div>
                <div className="text-2xl font-bold text-indigo-900">{time.toFixed(2)}s</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Height</div>
                <div className="text-2xl font-bold text-indigo-900">{position.y.toFixed(2)}m</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Distance</div>
                <div className="text-2xl font-bold text-indigo-900">{position.x.toFixed(2)}m</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Max Height</div>
                <div className="text-2xl font-bold text-purple-900">{maxHeight.toFixed(2)}m</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total Range</div>
                <div className="text-2xl font-bold text-purple-900">{range.toFixed(2)}m</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Flight Time</div>
                <div className="text-2xl font-bold text-purple-900">{flightTime.toFixed(2)}s</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Vₓ (Horizontal)</div>
                <div className="text-2xl font-bold text-green-900">{currentVelocity.vx.toFixed(2)}m/s</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Vᵧ (Vertical)</div>
                <div className="text-2xl font-bold text-red-900">{currentVelocity.vy.toFixed(2)}m/s</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectileMotion;