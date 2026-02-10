import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, SkipForward, BookOpen, Calculator, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const GRAVITY_PRESETS = {
  'Earth (9.8)': 9.8,
  'Earth (10.0)': 10.0,
  'Moon (1.62)': 1.62,
  'Mars (3.71)': 3.71,
  'Jupiter (24.79)': 24.79,
};

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];
const TRAIL_MAX = 200;
const SOLVE_TOLERANCE = 1e-6;
const SOLVE_MAX_ITER = 100;

// ─── Physics Engine ──────────────────────────────────────────────────────────
const physics = {
  /** Get trajectory parameters */
  getTrajectory(v0, angleDeg, h0, g, type) {
    if (type === 'horizontal') {
      const tFlight = h0 > 0 ? Math.sqrt((2 * h0) / g) : 0;
      const range = v0 * tFlight;
      return { tFlight, maxHeight: h0, range, vx: v0, vy0: 0 };
    }

    const rad = (angleDeg * Math.PI) / 180;
    const vx = v0 * Math.cos(rad);
    const vy0 = v0 * Math.sin(rad);
    const disc = vy0 * vy0 + 2 * g * h0;

    if (disc < 0) return { tFlight: 0, maxHeight: h0, range: 0, vx, vy0 };

    const tFlight = (vy0 + Math.sqrt(disc)) / g;
    const tPeak = vy0 / g;
    const maxHeight = tPeak > 0 ? h0 + (vy0 * vy0) / (2 * g) : h0;
    const range = vx * tFlight;

    return { tFlight, maxHeight, range, vx, vy0 };
  },

  /** Position and velocity at time t */
  getState(t, v0, angleDeg, h0, g, type) {
    let vx, vy0;
    if (type === 'horizontal') {
      vx = v0;
      vy0 = 0;
    } else {
      const rad = (angleDeg * Math.PI) / 180;
      vx = v0 * Math.cos(rad);
      vy0 = v0 * Math.sin(rad);
    }

    const x = vx * t;
    const y = h0 + vy0 * t - 0.5 * g * t * t;
    const vy = vy0 - g * t;

    return { x, y: Math.max(0, y), vx, vy, speed: Math.sqrt(vx * vx + vy * vy) };
  },

  /** Generate full trail points */
  generateTrail(v0, angleDeg, h0, g, type, numPoints = TRAIL_MAX) {
    const { tFlight } = this.getTrajectory(v0, angleDeg, h0, g, type);
    if (tFlight <= 0) return [];

    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * tFlight;
      const { x, y } = this.getState(t, v0, angleDeg, h0, g, type);
      points.push({ x, y, t });
    }
    return points;
  },
};

// ─── Numerical Solvers ───────────────────────────────────────────────────────
const solvers = {
  /** Bisection method - robust root finding */
  _bisect(f, lo, hi, tol = SOLVE_TOLERANCE, maxIter = SOLVE_MAX_ITER) {
    let fLo = f(lo);
    for (let i = 0; i < maxIter; i++) {
      const mid = (lo + hi) / 2;
      const fMid = f(mid);
      if (Math.abs(fMid) < tol || (hi - lo) / 2 < tol) return mid;
      if (fLo * fMid < 0) {
        hi = mid;
      } else {
        lo = mid;
        fLo = fMid;
      }
    }
    return (lo + hi) / 2;
  },

  /** Find velocity from range */
  velocityFromRange(targetRange, angleDeg, h0, g, type) {
    if (targetRange <= 0) return 0;

    if (type === 'horizontal') {
      if (h0 <= 0) return 0;
      const t = Math.sqrt((2 * h0) / g);
      return t > 0 ? targetRange / t : 0;
    }

    // Search for velocity that gives target range
    const f = (v) => {
      const { range } = physics.getTrajectory(v, angleDeg, h0, g, type);
      return range - targetRange;
    };

    // Find upper bound
    let hi = 10;
    while (f(hi) < 0 && hi < 10000) hi *= 2;
    if (hi >= 10000) return NaN;

    return this._bisect(f, 0.01, hi);
  },

  /** Find velocity from max height */
  velocityFromMaxHeight(targetH, angleDeg, h0, g, type) {
    if (type === 'horizontal') return NaN; // Max height = h0 for horizontal
    if (targetH < h0) return NaN; // Can't have max height less than launch height for upward

    const rad = (angleDeg * Math.PI) / 180;
    const sinA = Math.sin(rad);
    if (sinA <= 0) return NaN; // Need upward component

    // maxHeight = h0 + v²sin²θ / (2g)
    const vyNeeded = Math.sqrt(2 * g * (targetH - h0));
    return vyNeeded / sinA;
  },

  /** Find velocity from flight time */
  velocityFromFlightTime(targetT, angleDeg, h0, g, type) {
    if (targetT <= 0) return 0;

    if (type === 'horizontal') {
      // t = sqrt(2h/g), velocity doesn't affect flight time for horizontal
      return NaN;
    }

    const f = (v) => {
      const { tFlight } = physics.getTrajectory(v, angleDeg, h0, g, type);
      return tFlight - targetT;
    };

    let hi = 10;
    while (f(hi) < 0 && hi < 10000) hi *= 2;
    if (hi >= 10000) return NaN;

    return this._bisect(f, 0.01, hi);
  },

  /** Find angle from range */
  angleFromRange(targetRange, v0, h0, g) {
    if (targetRange <= 0 || v0 <= 0) return NaN;

    const f = (deg) => {
      const { range } = physics.getTrajectory(v0, deg, h0, g, 'angled');
      return range - targetRange;
    };

    // Check if solution exists at 45 degrees (usually max range for h0=0)
    // Search in [0, 89] first (typical projectile)
    let bestAngle = NaN;
    let bestError = Infinity;

    // Scan to find bracket
    for (let deg = 1; deg < 89; deg += 1) {
      const err = f(deg);
      if (Math.abs(err) < bestError) {
        bestError = Math.abs(err);
        bestAngle = deg;
      }
      if (Math.abs(err) < 0.01) break;
    }

    // Refine with bisection if we found a sign change
    for (let deg = 1; deg < 88; deg++) {
      if (f(deg) * f(deg + 1) < 0) {
        return this._bisect(f, deg, deg + 1);
      }
    }

    // Also check negative angles
    for (let deg = -1; deg > -89; deg--) {
      if (f(deg) * f(deg + 1) < 0) {
        return this._bisect(f, deg, deg + 1);
      }
    }

    return bestAngle;
  },

  /** Find angle from max height */
  angleFromMaxHeight(targetH, v0, h0, g) {
    if (targetH < h0 || v0 <= 0) return NaN;

    // maxHeight = h0 + v²sin²θ/(2g)
    const sinSq = (2 * g * (targetH - h0)) / (v0 * v0);
    if (sinSq < 0 || sinSq > 1) return NaN;
    return (Math.asin(Math.sqrt(sinSq)) * 180) / Math.PI;
  },

  /** Find angle from flight time */
  angleFromFlightTime(targetT, v0, h0, g) {
    if (targetT <= 0 || v0 <= 0) return NaN;

    const f = (deg) => {
      const { tFlight } = physics.getTrajectory(v0, deg, h0, g, 'angled');
      return tFlight - targetT;
    };

    // Scan for bracket
    for (let deg = -89; deg < 89; deg++) {
      if (f(deg) * f(deg + 1) < 0) {
        return this._bisect(f, deg, deg + 1);
      }
    }
    return NaN;
  },

  /** Find height from range */
  heightFromRange(targetRange, v0, angleDeg, g, type) {
    if (targetRange <= 0) return 0;

    const f = (h) => {
      const { range } = physics.getTrajectory(v0, angleDeg, h, g, type);
      return range - targetRange;
    };

    // Find upper bound
    let hi = 10;
    while (f(hi) < 0 && hi < 1000) hi *= 2;
    if (hi >= 1000) return NaN;

    // Height can be 0
    if (f(0) > 0) return this._bisect(f, 0, 0.01);
    return this._bisect(f, 0, hi);
  },

  /** Find height from max height */
  heightFromMaxHeight(targetH, v0, angleDeg, g, type) {
    if (type === 'horizontal') return targetH; // maxHeight = h0

    const rad = (angleDeg * Math.PI) / 180;
    const vy0 = v0 * Math.sin(rad);
    if (vy0 <= 0) return targetH; // For downward, maxHeight = h0

    // maxHeight = h0 + vy0²/(2g)
    const h = targetH - (vy0 * vy0) / (2 * g);
    return Math.max(0, h);
  },

  /** Find height from flight time */
  heightFromFlightTime(targetT, v0, angleDeg, g, type) {
    if (targetT <= 0) return 0;

    if (type === 'horizontal') {
      // t = sqrt(2h/g) => h = g*t²/2
      return (g * targetT * targetT) / 2;
    }

    const f = (h) => {
      const { tFlight } = physics.getTrajectory(v0, angleDeg, h, g, type);
      return tFlight - targetT;
    };

    let hi = 10;
    while (f(hi) < 0 && hi < 1000) hi *= 2;
    if (hi >= 1000) return NaN;

    if (f(0) * f(hi) > 0) return NaN;
    return this._bisect(f, 0, hi);
  },
};

// ─── Canvas Renderer ─────────────────────────────────────────────────────────
const renderer = {
  COLORS: {
    bg: '#fafbff',
    grid: '#e2e8f0',
    gridText: '#94a3b8',
    ground: '#6366f1',
    platform: '#818cf8',
    platformStroke: '#6366f1',
    trail: '#a78bfa',
    trailDot: '#c4b5fd',
    prediction: '#ddd6fe',
    projectile: '#7c3aed',
    projectileStroke: '#5b21b6',
    projectileGlow: 'rgba(124, 58, 237, 0.3)',
    velocityUp: '#10b981',
    velocityDown: '#ef4444',
    vxColor: '#3b82f6',
    vyColor: '#f59e0b',
    peakMarker: '#f59e0b',
    rangeMarker: '#10b981',
    axisLabel: '#64748b',
    heightLabel: '#8b5cf6',
  },

  getNiceInterval(maxVal) {
    if (maxVal <= 0) return 1;
    const raw = maxVal / 8;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    if (norm <= 1) return mag;
    if (norm <= 2) return 2 * mag;
    if (norm <= 5) return 5 * mag;
    return 10 * mag;
  },

  draw(ctx, canvas, state) {
    const { width, height } = canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = width / dpr;
    const h = height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = this.COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    const {
      trajectory,
      currentState,
      trail,
      predictionTrail,
      isRunning,
      time,
      launchHeight,
    } = state;

    const padding = { top: 30, right: 30, bottom: 50, left: 60 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    // Calculate scale
    const maxX = Math.max(trajectory.range || 50, (currentState?.x || 0) + 10, 20);
    const maxY = Math.max(trajectory.maxHeight || 30, (currentState?.y || 0) + 5, launchHeight + 10, 15);

    const scaleX = plotW / (maxX * 1.1);
    const scaleY = plotH / (maxY * 1.15);

    const toCanvasX = (x) => padding.left + x * scaleX;
    const toCanvasY = (y) => h - padding.bottom - y * scaleY;

    // ── Grid ──
    ctx.strokeStyle = this.COLORS.grid;
    ctx.lineWidth = 0.5;
    ctx.fillStyle = this.COLORS.gridText;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';

    const xInterval = this.getNiceInterval(maxX);
    const yInterval = this.getNiceInterval(maxY);

    // Vertical grid + x labels
    ctx.textAlign = 'center';
    for (let x = 0; x <= maxX * 1.1; x += xInterval) {
      const cx = toCanvasX(x);
      if (cx > w - padding.right) break;
      ctx.beginPath();
      ctx.moveTo(cx, padding.top);
      ctx.lineTo(cx, h - padding.bottom);
      ctx.stroke();
      ctx.fillText(`${Math.round(x * 100) / 100}`, cx, h - padding.bottom + 18);
    }

    // Horizontal grid + y labels
    ctx.textAlign = 'right';
    for (let y = 0; y <= maxY * 1.15; y += yInterval) {
      const cy = toCanvasY(y);
      if (cy < padding.top) break;
      ctx.beginPath();
      ctx.moveTo(padding.left, cy);
      ctx.lineTo(w - padding.right, cy);
      ctx.stroke();
      ctx.fillText(`${Math.round(y * 100) / 100}`, padding.left - 8, cy + 4);
    }

    // ── Axis labels ──
    ctx.fillStyle = this.COLORS.axisLabel;
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Distance (m)', w / 2, h - 5);

    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Height (m)', 0, 0);
    ctx.restore();

    // ── Ground ──
    const groundY = toCanvasY(0);
    ctx.strokeStyle = this.COLORS.ground;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, groundY);
    ctx.lineTo(w - padding.right, groundY);
    ctx.stroke();

    // Ground pattern
    ctx.strokeStyle = '#a5b4fc';
    ctx.lineWidth = 1;
    for (let x = padding.left; x < w - padding.right; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x - 6, groundY + 8);
      ctx.stroke();
    }

    // ── Launch platform ──
    if (launchHeight > 0) {
      const platX = toCanvasX(0);
      const platTop = toCanvasY(launchHeight);
      const platWidth = 16;
      const platH = groundY - platTop;

      // Platform body
      const grad = ctx.createLinearGradient(platX - platWidth / 2, 0, platX + platWidth / 2, 0);
      grad.addColorStop(0, '#a5b4fc');
      grad.addColorStop(0.5, '#818cf8');
      grad.addColorStop(1, '#a5b4fc');
      ctx.fillStyle = grad;
      ctx.fillRect(platX - platWidth / 2, platTop, platWidth, platH);

      ctx.strokeStyle = this.COLORS.platformStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(platX - platWidth / 2, platTop, platWidth, platH);

      // Height label
      ctx.fillStyle = this.COLORS.heightLabel;
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`h=${launchHeight}m`, platX + platWidth / 2 + 4, platTop + platH / 2 + 4);
    }

    // ── Prediction path (dashed) ──
    if (predictionTrail && predictionTrail.length > 1) {
      ctx.strokeStyle = this.COLORS.prediction;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      predictionTrail.forEach((p, i) => {
        const cx = toCanvasX(p.x);
        const cy = toCanvasY(p.y);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Trail ──
    if (trail && trail.length > 1) {
      // Trail line
      ctx.strokeStyle = this.COLORS.trail;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      trail.forEach((p, i) => {
        const cx = toCanvasX(p.x);
        const cy = toCanvasY(p.y);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      // Trail dots (every nth point)
      const dotInterval = Math.max(1, Math.floor(trail.length / 20));
      ctx.fillStyle = this.COLORS.trailDot;
      trail.forEach((p, i) => {
        if (i % dotInterval !== 0) return;
        const cx = toCanvasX(p.x);
        const cy = toCanvasY(p.y);
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ── Peak marker ──
    if (trajectory.maxHeight > launchHeight && trajectory.tFlight > 0) {
      const tPeak = trajectory.vy0 > 0 ? trajectory.vy0 / (state.gravity || 9.8) : 0;
      if (tPeak > 0 && tPeak < trajectory.tFlight) {
        const peakState = physics.getState(tPeak, state.v0, state.angleDeg, launchHeight, state.gravity, state.type);
        const px = toCanvasX(peakState.x);
        const py = toCanvasY(peakState.y);

        // Dashed vertical line from peak to ground
        ctx.strokeStyle = this.COLORS.peakMarker;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, groundY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Peak dot
        ctx.fillStyle = this.COLORS.peakMarker;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();

        // Peak label
        ctx.fillStyle = this.COLORS.peakMarker;
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Peak: ${peakState.y.toFixed(1)}m`, px, py - 10);
      }
    }

    // ── Range marker ──
    if (trajectory.range > 0 && (time >= trajectory.tFlight || !isRunning)) {
      const rx = toCanvasX(trajectory.range);
      ctx.fillStyle = this.COLORS.rangeMarker;
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`R=${trajectory.range.toFixed(1)}m`, rx, groundY + 35);

      // Small triangle marker
      ctx.beginPath();
      ctx.moveTo(rx, groundY + 2);
      ctx.lineTo(rx - 5, groundY + 10);
      ctx.lineTo(rx + 5, groundY + 10);
      ctx.closePath();
      ctx.fill();
    }

    // ── Projectile ──
    if (currentState) {
      const px = toCanvasX(currentState.x);
      const py = toCanvasY(currentState.y);

      // Glow
      ctx.fillStyle = this.COLORS.projectileGlow;
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = this.COLORS.projectile;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = this.COLORS.projectileStroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      // ── Velocity vector ──
      if (isRunning || time > 0) {
        const vScale = 1.5;
        const maxLen = 80;

        const drawArrow = (fromX, fromY, dx, dy, color, label) => {
          const len = Math.sqrt(dx * dx + dy * dy) * vScale;
          if (len < 2) return;
          const clampedLen = Math.min(len, maxLen);
          const angle = Math.atan2(dy, dx);

          const ex = fromX + clampedLen * Math.cos(angle);
          const ey = fromY + clampedLen * Math.sin(angle);

          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.8;

          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // Arrowhead
          const headLen = 8;
          const headAngle = Math.PI / 6;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(
            ex - headLen * Math.cos(angle - headAngle),
            ey - headLen * Math.sin(angle - headAngle)
          );
          ctx.lineTo(
            ex - headLen * Math.cos(angle + headAngle),
            ey - headLen * Math.sin(angle + headAngle)
          );
          ctx.closePath();
          ctx.fill();

          // Label
          if (label) {
            ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, ex + 12 * Math.cos(angle + 0.3), ey + 12 * Math.sin(angle + 0.3));
          }

          ctx.globalAlpha = 1;
        };

        // Resultant velocity
        const vyCanvas = -currentState.vy; // Flip for canvas coords
        const color = currentState.vy >= 0 ? this.COLORS.velocityUp : this.COLORS.velocityDown;
        drawArrow(px, py, currentState.vx, vyCanvas, color,
          `${currentState.speed.toFixed(1)} m/s`);

        // Component vectors (smaller, dimmer)
        ctx.globalAlpha = 0.5;
        drawArrow(px, py, currentState.vx, 0, this.COLORS.vxColor, null);
        drawArrow(px, py, 0, vyCanvas, this.COLORS.vyColor, null);
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  },
};

// ─── Slider Component ────────────────────────────────────────────────────────
function ParamSlider({ label, value, onChange, min, max, step = 1, unit, disabled, note, highlight }) {
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleTextChange = (e) => {
    const raw = e.target.value;
    setLocalValue(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    const num = parseFloat(localValue);
    if (isNaN(num) || num < min) {
      setLocalValue(String(min));
      onChange(min);
    } else if (num > max) {
      setLocalValue(String(max));
      onChange(max);
    } else {
      const rounded = Math.round(num * 100) / 100;
      setLocalValue(String(rounded));
      onChange(rounded);
    }
  };

  return (
    <div className={`mb-4 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-gray-700">
          {label}
          {highlight && <span className="ml-1 text-xs text-orange-600 font-bold">(solving...)</span>}
        </label>
        <span className="text-sm font-mono text-indigo-700 font-bold">
          {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-indigo-100
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600
                   [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md
                   disabled:cursor-not-allowed"
      />
      <input
        type="text"
        value={localValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        disabled={disabled}
        className="w-full mt-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                   disabled:cursor-not-allowed disabled:bg-gray-100"
      />
      {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color = 'indigo', icon }) {
  const colorMap = {
    indigo: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    purple: 'text-purple-700 bg-purple-50 border-purple-200',
    green: 'text-green-700 bg-green-50 border-green-200',
    red: 'text-red-700 bg-red-50 border-red-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
  };

  return (
    <div className={`rounded-xl border-2 p-3 ${colorMap[color] || colorMap.indigo}`}>
      <div className="text-xs font-medium opacity-70 mb-0.5 flex items-center gap-1">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className="text-xl font-bold font-mono">
        {typeof value === 'number' ? value.toFixed(2) : value}
        <span className="text-sm font-normal ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

// ─── Formulas Panel ──────────────────────────────────────────────────────────
function FormulasPanel({ type, isOpen, onToggle }) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-600" />
          <span className="font-semibold text-gray-800">Key Formulas</span>
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isOpen && (
        <div className="px-5 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {type === 'horizontal' ? (
              <>
                <FormulaCard title="Horizontal Displacement" formula="x = v₀ · t" />
                <FormulaCard title="Vertical Displacement" formula="y = h - ½gt²" />
                <FormulaCard title="Flight Time" formula="t = √(2h/g)" />
                <FormulaCard title="Range" formula="R = v₀ · √(2h/g)" />
                <FormulaCard title="Final Vertical Velocity" formula="vᵧ = gt" />
                <FormulaCard title="Resultant Velocity" formula="v = √(v₀² + (gt)²)" />
              </>
            ) : (
              <>
                <FormulaCard title="Horizontal" formula="x = v₀cosθ · t" />
                <FormulaCard title="Vertical" formula="y = h + v₀sinθ·t - ½gt²" />
                <FormulaCard title="Max Height" formula="H = h + v₀²sin²θ/(2g)" />
                <FormulaCard title="Flight Time" formula="t = (v₀sinθ + √(v₀²sin²θ+2gh))/g" />
                <FormulaCard title="Range" formula="R = v₀cosθ · t" />
                <FormulaCard title="At h=0, θ>0" formula="R = v₀²sin2θ/g" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FormulaCard({ title, formula }) {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-100">
      <div className="text-xs font-semibold text-indigo-600 mb-1">{title}</div>
      <div className="text-sm font-mono text-gray-800">{formula}</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProjectileMotion() {
  // ── State ──
  const [projectileType, setProjectileType] = useState('angled');
  const [velocity, setVelocity] = useState(40);
  const [angle, setAngle] = useState(45);
  const [height, setHeight] = useState(0);
  const [gravity, setGravity] = useState(9.8);

  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);
  const [showFormulas, setShowFormulas] = useState(false);

  // Inverse mode
  const [calcMode, setCalcMode] = useState('forward');
  const [givenParam, setGivenParam] = useState('range');
  const [solveFor, setSolveFor] = useState('velocity');
  const [inputValue, setInputValue] = useState('');
  const [solveError, setSolveError] = useState('');
  const [solveSuccess, setSolveSuccess] = useState('');

  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const lastFrameTime = useRef(0);
  const trailRef = useRef([]);
  const timeRef = useRef(0);
  const runningRef = useRef(false);
  const canvasSizeRef = useRef({ width: 800, height: 500 });

  // Keep running ref in sync
  useEffect(() => {
    runningRef.current = isRunning;
  }, [isRunning]);

  // ── Derived calculations ──
  const trajectory = useMemo(
    () => physics.getTrajectory(velocity, angle, height, gravity, projectileType),
    [velocity, angle, height, gravity, projectileType]
  );

  const currentState = useMemo(
    () => physics.getState(time, velocity, angle, height, gravity, projectileType),
    [time, velocity, angle, height, gravity, projectileType]
  );

  const predictionTrail = useMemo(
    () => physics.generateTrail(velocity, angle, height, gravity, projectileType, 100),
    [velocity, angle, height, gravity, projectileType]
  );

  // ── Canvas sizing ──
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w } = entry.contentRect;
        const h = Math.max(300, Math.min(w * 0.55, 600));
        const dpr = window.devicePixelRatio || 1;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        canvasSizeRef.current = { width: w * dpr, height: h * dpr };

        // Redraw
        drawFrame();
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Draw function ──
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const currentT = timeRef.current;
    const state = physics.getState(currentT, velocity, angle, height, gravity, projectileType);
    const traj = physics.getTrajectory(velocity, angle, height, gravity, projectileType);
    const pred = physics.generateTrail(velocity, angle, height, gravity, projectileType, 100);

    renderer.draw(ctx, canvas, {
      trajectory: traj,
      currentState: state,
      trail: trailRef.current,
      predictionTrail: pred,
      isRunning: runningRef.current,
      time: currentT,
      launchHeight: height,
      gravity,
      v0: velocity,
      angleDeg: angle,
      type: projectileType,
    });
  }, [velocity, angle, height, gravity, projectileType]);

  // Redraw when params change
  useEffect(() => {
    drawFrame();
  }, [drawFrame, time]);

  // ── Animation loop ──
  useEffect(() => {
    if (!isRunning) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    lastFrameTime.current = 0;

    const tick = (timestamp) => {
      if (!runningRef.current) return;

      if (!lastFrameTime.current) lastFrameTime.current = timestamp;
      const dt = Math.min((timestamp - lastFrameTime.current) / 1000, 0.05); // Cap delta
      lastFrameTime.current = timestamp;

      const newTime = timeRef.current + dt * speed;
      const traj = physics.getTrajectory(velocity, angle, height, gravity, projectileType);
      const state = physics.getState(newTime, velocity, angle, height, gravity, projectileType);

      // Add to trail
      trailRef.current = [...trailRef.current.slice(-(TRAIL_MAX - 1)), { x: state.x, y: state.y }];

      if (newTime >= traj.tFlight) {
        // Landing
        const finalState = physics.getState(traj.tFlight, velocity, angle, height, gravity, projectileType);
        trailRef.current.push({ x: finalState.x, y: 0 });
        timeRef.current = traj.tFlight;
        setTime(traj.tFlight);
        setIsRunning(false);
        drawFrame();
        return;
      }

      timeRef.current = newTime;
      setTime(newTime);
      drawFrame();

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isRunning, speed, velocity, angle, height, gravity, projectileType, drawFrame]);

  // ── Controls ──
  const handleLaunch = () => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      if (timeRef.current >= trajectory.tFlight || timeRef.current === 0) {
        // Reset first
        timeRef.current = 0;
        trailRef.current = [{ x: 0, y: height }];
        setTime(0);
      }
      lastFrameTime.current = 0;
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    timeRef.current = 0;
    trailRef.current = [];
    setTime(0);
    lastFrameTime.current = 0;
    setTimeout(drawFrame, 0);
  };

  const handleComplete = () => {
    setIsRunning(false);
    timeRef.current = trajectory.tFlight;
    setTime(trajectory.tFlight);
    trailRef.current = physics.generateTrail(velocity, angle, height, gravity, projectileType, TRAIL_MAX);
    setTimeout(drawFrame, 0);
  };

  // ── Inverse solve ──
  const handleSolve = () => {
    setSolveError('');
    setSolveSuccess('');

    const val = parseFloat(inputValue);
    if (isNaN(val) || val < 0) {
      setSolveError('Please enter a valid positive number.');
      return;
    }

    let result = NaN;
    let label = '';

    try {
      if (solveFor === 'velocity') {
        if (givenParam === 'range') result = solvers.velocityFromRange(val, angle, height, gravity, projectileType);
        else if (givenParam === 'maxHeight') result = solvers.velocityFromMaxHeight(val, angle, height, gravity, projectileType);
        else if (givenParam === 'flightTime') result = solvers.velocityFromFlightTime(val, angle, height, gravity, projectileType);
        label = 'Velocity';
      } else if (solveFor === 'angle') {
        if (givenParam === 'range') result = solvers.angleFromRange(val, velocity, height, gravity);
        else if (givenParam === 'maxHeight') result = solvers.angleFromMaxHeight(val, velocity, height, gravity);
        else if (givenParam === 'flightTime') result = solvers.angleFromFlightTime(val, velocity, height, gravity);
        label = 'Angle';
      } else if (solveFor === 'height') {
        if (givenParam === 'range') result = solvers.heightFromRange(val, velocity, angle, gravity, projectileType);
        else if (givenParam === 'maxHeight') result = solvers.heightFromMaxHeight(val, velocity, angle, gravity, projectileType);
        else if (givenParam === 'flightTime') result = solvers.heightFromFlightTime(val, velocity, angle, gravity, projectileType);
        label = 'Height';
      }
    } catch {
      setSolveError('Calculation error. Check your inputs.');
      return;
    }

    if (isNaN(result) || !isFinite(result) || result < 0) {
      setSolveError(`No valid solution found. This combination of parameters may be physically impossible.`);
      return;
    }

    const rounded = Math.round(result * 100) / 100;

    if (solveFor === 'velocity') {
      setVelocity(Math.min(100, rounded));
      setSolveSuccess(`${label} = ${rounded} m/s`);
    } else if (solveFor === 'angle') {
      setAngle(Math.max(-90, Math.min(90, rounded)));
      setSolveSuccess(`${label} = ${rounded}°`);
    } else if (solveFor === 'height') {
      setHeight(Math.min(200, rounded));
      setSolveSuccess(`${label} = ${rounded} m`);
    }

    handleReset();
  };

  // Ensure givenParam ≠ solveFor
  useEffect(() => {
    const paramMap = { range: 'range', maxHeight: 'maxHeight', flightTime: 'flightTime' };
    // No conflict since givenParam and solveFor are different categories
    // But handle edge cases
    if (projectileType === 'horizontal' && solveFor === 'angle') {
      setSolveFor('velocity');
    }
  }, [projectileType, solveFor]);

  // ── Disabled state for params being solved ──
  const isParamDisabled = (param) => {
    if (isRunning) return true;
    if (calcMode === 'inverse') {
      if (param === solveFor) return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-5 border border-indigo-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                Projectile Motion Simulator
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Interactive physics visualization — Grade 11/12 Nepal Curriculum
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                projectileType === 'angled'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {projectileType === 'angled' ? 'Angled Launch' : 'Horizontal Launch'}
              </span>
              {calcMode === 'inverse' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                  <Calculator size={12} className="inline mr-1" />
                  Solver Mode
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ── Left Panel ── */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Type selector */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Projectile Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {['angled', 'horizontal'].map((type) => (
                  <button
                    key={type}
                    onClick={() => { if (!isRunning) { setProjectileType(type); handleReset(); } }}
                    disabled={isRunning}
                    className={`py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                      projectileType === type
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {type === 'angled' ? '↗ Angled' : '→ Horizontal'}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode selector */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Mode</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => { setCalcMode('forward'); setSolveError(''); setSolveSuccess(''); handleReset(); }}
                  disabled={isRunning}
                  className={`py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                    calcMode === 'forward'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  ▶ Simulate
                </button>
                <button
                  onClick={() => { setCalcMode('inverse'); setSolveError(''); setSolveSuccess(''); handleReset(); }}
                  disabled={isRunning}
                  className={`py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                    calcMode === 'inverse'
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Calculator size={14} className="inline mr-1" />
                  Solve
                </button>
              </div>

              {calcMode === 'inverse' && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-orange-700 mb-1.5">Given (what you know):</label>
                    <select
                      value={givenParam}
                      onChange={(e) => { setGivenParam(e.target.value); setSolveError(''); setSolveSuccess(''); }}
                      disabled={isRunning}
                      className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg bg-orange-50
                                 focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                    >
                      <option value="range">Range (R)</option>
                      <option value="maxHeight">Max Height (H_max)</option>
                      <option value="flightTime">Flight Time (T)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-orange-700 mb-1.5">Solve for:</label>
                    <select
                      value={solveFor}
                      onChange={(e) => { setSolveFor(e.target.value); setSolveError(''); setSolveSuccess(''); }}
                      disabled={isRunning}
                      className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg bg-orange-50
                                 focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                    >
                      <option value="velocity">Initial Velocity (v₀)</option>
                      {projectileType === 'angled' && <option value="angle">Launch Angle (θ)</option>}
                      <option value="height">Launch Height (h)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-orange-700 mb-1.5">
                      {givenParam === 'range' ? 'Range value (m):' :
                       givenParam === 'maxHeight' ? 'Max Height value (m):' :
                       'Flight Time value (s):'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={inputValue}
                      onChange={(e) => { setInputValue(e.target.value); setSolveError(''); setSolveSuccess(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSolve()}
                      disabled={isRunning}
                      className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg bg-white
                                 focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                      placeholder="Enter value..."
                    />
                  </div>

                  <button
                    onClick={handleSolve}
                    disabled={isRunning || !inputValue}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg
                             text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                             shadow-md shadow-orange-200"
                  >
                    Solve for {solveFor === 'velocity' ? 'v₀' : solveFor === 'angle' ? 'θ' : 'h'}
                  </button>

                  {solveError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                      ⚠️ {solveError}
                    </div>
                  )}
                  {solveSuccess && (
                    <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2.5">
                      ✅ {solveSuccess}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Parameters */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Parameters</h3>

              <ParamSlider
                label={projectileType === 'horizontal' ? 'Horizontal Velocity (v₀)' : 'Initial Velocity (v₀)'}
                value={velocity}
                onChange={(v) => { setVelocity(v); if (!isRunning) handleReset(); }}
                min={0}
                max={100}
                step={0.5}
                unit=" m/s"
                disabled={isParamDisabled('velocity')}
                highlight={calcMode === 'inverse' && solveFor === 'velocity'}
              />

              {projectileType === 'angled' && (
                <ParamSlider
                  label="Launch Angle (θ)"
                  value={angle}
                  onChange={(a) => { setAngle(a); if (!isRunning) handleReset(); }}
                  min={-90}
                  max={90}
                  step={1}
                  unit="°"
                  disabled={isParamDisabled('angle')}
                  highlight={calcMode === 'inverse' && solveFor === 'angle'}
                  note="Positive = upward, Negative = downward"
                />
              )}

              <ParamSlider
                label="Launch Height (h)"
                value={height}
                onChange={(h) => { setHeight(h); if (!isRunning) handleReset(); }}
                min={projectileType === 'horizontal' ? 1 : 0}
                max={200}
                step={0.5}
                unit=" m"
                disabled={isParamDisabled('height')}
                highlight={calcMode === 'inverse' && solveFor === 'height'}
                note={projectileType === 'horizontal' ? 'Required for horizontal launch' : undefined}
              />

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gravity</label>
                <select
                  value={Object.keys(GRAVITY_PRESETS).find((k) => GRAVITY_PRESETS[k] === gravity) || ''}
                  onChange={(e) => {
                    if (!isRunning) {
                      setGravity(GRAVITY_PRESETS[e.target.value]);
                      handleReset();
                    }
                  }}
                  disabled={isRunning}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Object.entries(GRAVITY_PRESETS).map(([name, val]) => (
                    <option key={name} value={name}>
                      {name} m/s²
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Playback */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Playback</h3>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Speed: {speed}×
                </label>
                <div className="flex gap-1.5">
                  {SPEED_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                        speed === s
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleLaunch}
                    className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2
                              transition-all shadow-md text-sm ${
                      isRunning
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    }`}
                  >
                    {isRunning ? <Pause size={18} /> : <Play size={18} />}
                    {isRunning ? 'Pause' : time > 0 && time < trajectory.tFlight ? 'Resume' : 'Launch'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg
                             font-bold transition-all shadow-md shadow-gray-200"
                    title="Reset"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>

                <button
                  onClick={handleComplete}
                  disabled={isRunning}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300
                           text-white py-2.5 rounded-lg font-bold transition-all text-sm
                           disabled:cursor-not-allowed shadow-md shadow-purple-200
                           flex items-center justify-center gap-2"
                >
                  <SkipForward size={16} />
                  Skip to End
                </button>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>t = {time.toFixed(2)}s</span>
                  <span>T = {trajectory.tFlight.toFixed(2)}s</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-100"
                    style={{
                      width: `${trajectory.tFlight > 0 ? Math.min(100, (time / trajectory.tFlight) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* Canvas */}
            <div
              ref={containerRef}
              className="bg-white rounded-xl shadow-lg p-2 border border-gray-100"
            >
              <canvas
                ref={canvasRef}
                className="w-full rounded-lg cursor-crosshair"
                style={{ display: 'block' }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Time" value={time} unit="s" color="indigo" icon="⏱" />
              <StatCard label="Height" value={currentState.y} unit="m" color="purple" icon="↕" />
              <StatCard label="Distance" value={currentState.x} unit="m" color="blue" icon="↔" />
              <StatCard label="Max Height" value={trajectory.maxHeight} unit="m" color="amber" icon="⬆" />
              <StatCard label="Range" value={trajectory.range} unit="m" color="green" icon="🎯" />
              <StatCard label="Flight Time" value={trajectory.tFlight} unit="s" color="red" icon="🕐" />
            </div>

            {/* Velocity stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Vₓ (Horizontal)"
                value={currentState.vx}
                unit=" m/s"
                color="blue"
                icon="→"
              />
              <StatCard
                label="Vᵧ (Vertical)"
                value={currentState.vy}
                unit=" m/s"
                color="amber"
                icon={currentState.vy >= 0 ? '↑' : '↓'}
              />
              <StatCard
                label="Speed |v|"
                value={currentState.speed}
                unit=" m/s"
                color="purple"
                icon="⚡"
              />
            </div>

            {/* Formulas */}
            <FormulasPanel
              type={projectileType}
              isOpen={showFormulas}
              onToggle={() => setShowFormulas(!showFormulas)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}