/**
 * @module PhysicsCanvas
 *
 * @description
 * A ready-to-use canvas component with built-in grid, axes, ground line, and
 * coordinate transformation helpers. The parent passes a `draw` function that
 * receives the canvas context and helper utilities. This component handles all
 * the boilerplate (clearing, grid, DPI scaling) so each simulator only writes
 * its unique rendering code.
 *
 * This component uses `forwardRef` + `useImperativeHandle` to expose a `render()`
 * method. The parent simulator calls `canvasRef.current.render()` from inside its
 * animation loop (onTick callback) to trigger a canvas redraw without causing
 * React re-renders. This is the most performant approach for 60fps animation.
 *
 * @purpose
 * Every simulator needs a canvas with a grid and coordinate system. Without this
 * component, every simulator duplicates 80+ lines of grid/axis rendering code.
 *
 * @dependents
 * - SecondLawSimulator (F=ma)
 * - ImpulseMomentumSimulator
 * - MomentumConservationSimulator
 * - ApparentWeightSimulator
 * - RelativeVelocitySimulator
 *
 * @example
 * ```jsx
 * import PhysicsCanvas from './shared/PhysicsCanvas';
 * import { drawArrow } from './shared/vectorArrow';
 *
 * function MySimulator() {
 *   const canvasRef = useRef(null);
 *   const stateRef = useRef({ x: 0, y: 0, vx: 5 });
 *
 *   const draw = useCallback((ctx, helpers) => {
 *     const { toCanvasX, toCanvasY, scale } = helpers;
 *     const s = stateRef.current;
 *
 *     // Draw an object
 *     ctx.beginPath();
 *     ctx.arc(toCanvasX(s.x), toCanvasY(s.y), 12, 0, Math.PI * 2);
 *     ctx.fillStyle = '#6366f1';
 *     ctx.fill();
 *
 *     // Draw velocity arrow
 *     drawArrow(ctx, {
 *       fromX: toCanvasX(s.x),
 *       fromY: toCanvasY(s.y),
 *       toX: toCanvasX(s.x) + s.vx * scale * 0.3,
 *       toY: toCanvasY(s.y),
 *       color: '#10b981',
 *       label: `v = ${s.vx.toFixed(1)} m/s`,
 *     });
 *   }, []);
 *
 *   // In onTick callback:
 *   // canvasRef.current?.render();
 *
 *   return (
 *     <PhysicsCanvas
 *       ref={canvasRef}
 *       draw={draw}
 *       worldBounds={{ minX: -1, maxX: 15, minY: -1, maxY: 8 }}
 *       showGrid
 *       showAxes
 *       showGround
 *     />
 *   );
 * }
 * ```
 */

import {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import { useCanvasSetup } from '../../hooks/newtons-laws/useCanvasSetup';

// ─── Color Constants ──────────────────────────────────────────────
const CANVAS_BG = '#fafbff';
const GRID_LINE_COLOR = '#e2e8f0';   // slate-200
const GRID_TEXT_COLOR = '#94a3b8';    // slate-400
const AXIS_LABEL_COLOR = '#64748b';   // slate-500
const GROUND_COLOR = '#6366f1';       // indigo-600
const HATCH_COLOR = '#a5b4fc';        // indigo-300

// ─── Font Constants ───────────────────────────────────────────────
const GRID_FONT = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const AXIS_FONT = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

// ─── Padding ──────────────────────────────────────────────────────
const PADDING = { top: 30, right: 30, bottom: 50, left: 55 };

/**
 * Calculate a "nice" interval for grid lines given a range and desired
 * number of divisions. Returns an interval that is a multiple of
 * 1, 2, or 5 × 10^n for clean axis labels.
 *
 * @param {number} range - Total range (max - min) in world units.
 * @param {number} [targetDivisions=8] - Approximate number of grid divisions.
 * @returns {number} A clean interval value.
 */
function getNiceInterval(range, targetDivisions = 8) {
  if (range <= 0) return 1;

  const rawInterval = range / targetDivisions;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
  const residual = rawInterval / magnitude;

  let niceResidual;
  if (residual <= 1.5) {
    niceResidual = 1;
  } else if (residual <= 3.5) {
    niceResidual = 2;
  } else if (residual <= 7.5) {
    niceResidual = 5;
  } else {
    niceResidual = 10;
  }

  return niceResidual * magnitude;
}

/**
 * Format a number for axis labels. Removes unnecessary trailing zeros
 * and handles near-zero floating point noise.
 *
 * @param {number} value
 * @param {number} interval - The grid interval, used to determine precision.
 * @returns {string}
 */
function formatAxisValue(value, interval) {
  // Snap near-zero values to exactly 0
  if (Math.abs(value) < interval * 0.001) return '0';

  // Determine decimal places from interval
  const decimalPlaces = Math.max(0, -Math.floor(Math.log10(interval)));
  return value.toFixed(decimalPlaces);
}

/**
 * PhysicsCanvas — A reusable canvas component with grid, axes, and ground.
 *
 * Exposes `render()` via ref for imperative canvas redraws from animation loops.
 */
const PhysicsCanvas = forwardRef(function PhysicsCanvas(props, ref) {
  const {
    draw,
    worldBounds,
    showGrid = true,
    showAxes = true,
    showGround = true,
    groundY = 0,
    axisLabels = { x: 'Distance (m)', y: 'Height (m)' },
    className = '',
    aspectRatio,
    onCanvasClick,
  } = props;

  // ─── Canvas setup ─────────────────────────────────────────────
  const { canvasRef, containerRef, dimensions, dpr, getCtx } = useCanvasSetup({
    aspectRatio: aspectRatio || 0.55,
  });

  // ─── Coordinate transformations ───────────────────────────────
  const helpers = useMemo(() => {
    const { width, height } = dimensions;
    const { minX, maxX, minY, maxY } = worldBounds;

    const plotWidth = width - PADDING.left - PADDING.right;
    const plotHeight = height - PADDING.top - PADDING.bottom;

    const worldWidth = maxX - minX;
    const worldHeight = maxY - minY;

    // Guard against zero-size worlds
    const safeWorldWidth = worldWidth > 0 ? worldWidth : 1;
    const safeWorldHeight = worldHeight > 0 ? worldHeight : 1;

    const scaleX = plotWidth / safeWorldWidth;
    const scaleY = plotHeight / safeWorldHeight;

    // Use uniform scaling so circles stay circular
    const scale = Math.min(scaleX, scaleY);

    // Center the plot area if uniform scaling leaves extra space
    const usedWidth = safeWorldWidth * scale;
    const usedHeight = safeWorldHeight * scale;
    const offsetX = PADDING.left + (plotWidth - usedWidth) / 2;
    const offsetY = PADDING.top + (plotHeight - usedHeight) / 2;

    const toCanvasX = (worldX) => offsetX + (worldX - minX) * scale;
    const toCanvasY = (worldY) =>
      height - PADDING.bottom - (plotHeight - usedHeight) / 2 - (worldY - minY) * scale;
    const toWorldX = (canvasX) => (canvasX - offsetX) / scale + minX;
    const toWorldY = (canvasY) =>
      (height - PADDING.bottom - (plotHeight - usedHeight) / 2 - canvasY) / scale + minY;

    return {
      width,
      height,
      toCanvasX,
      toCanvasY,
      toWorldX,
      toWorldY,
      scale,
      padding: { ...PADDING },
      plotWidth: usedWidth,
      plotHeight: usedHeight,
      offsetX,
      offsetY,
    };
  }, [dimensions, worldBounds]);

  // ─── Grid drawing ─────────────────────────────────────────────
  const drawGrid = useCallback(
    (ctx) => {
      const { width, height, toCanvasX, toCanvasY } = helpers;
      const { minX, maxX, minY, maxY } = worldBounds;

      const worldWidth = maxX - minX;
      const worldHeight = maxY - minY;

      const intervalX = getNiceInterval(worldWidth);
      const intervalY = getNiceInterval(worldHeight);

      ctx.save();

      // ── Vertical grid lines ─────────────────────────────────
      ctx.strokeStyle = GRID_LINE_COLOR;
      ctx.lineWidth = 0.5;

      const startX = Math.ceil(minX / intervalX) * intervalX;
      for (let wx = startX; wx <= maxX; wx += intervalX) {
        // Avoid floating-point drift
        wx = Math.round(wx / intervalX) * intervalX;
        const cx = toCanvasX(wx);

        ctx.beginPath();
        ctx.moveTo(cx, toCanvasY(maxY));
        ctx.lineTo(cx, toCanvasY(minY));
        ctx.stroke();

        // X-axis label
        ctx.fillStyle = GRID_TEXT_COLOR;
        ctx.font = GRID_FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(
          formatAxisValue(wx, intervalX),
          cx,
          toCanvasY(minY) + 6
        );
      }

      // ── Horizontal grid lines ───────────────────────────────
      const startY = Math.ceil(minY / intervalY) * intervalY;
      for (let wy = startY; wy <= maxY; wy += intervalY) {
        wy = Math.round(wy / intervalY) * intervalY;
        const cy = toCanvasY(wy);

        ctx.beginPath();
        ctx.moveTo(toCanvasX(minX), cy);
        ctx.lineTo(toCanvasX(maxX), cy);
        ctx.stroke();

        // Y-axis label
        ctx.fillStyle = GRID_TEXT_COLOR;
        ctx.font = GRID_FONT;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          formatAxisValue(wy, intervalY),
          toCanvasX(minX) - 8,
          cy
        );
      }

      ctx.restore();
    },
    [helpers, worldBounds]
  );

  // ─── Axes labels drawing ──────────────────────────────────────
  const drawAxes = useCallback(
    (ctx) => {
      const { width, height, toCanvasX, toCanvasY } = helpers;
      const { minX, maxX, minY, maxY } = worldBounds;

      ctx.save();
      ctx.fillStyle = AXIS_LABEL_COLOR;
      ctx.font = AXIS_FONT;

      // X-axis label — bottom center
      const xLabelX = (toCanvasX(minX) + toCanvasX(maxX)) / 2;
      const xLabelY = toCanvasY(minY) + 32;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(axisLabels.x || 'Distance (m)', xLabelX, xLabelY);

      // Y-axis label — left center, rotated -90°
      const yLabelX = toCanvasX(minX) - 42;
      const yLabelY = (toCanvasY(minY) + toCanvasY(maxY)) / 2;
      ctx.save();
      ctx.translate(yLabelX, yLabelY);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(axisLabels.y || 'Height (m)', 0, 0);
      ctx.restore();

      ctx.restore();
    },
    [helpers, worldBounds, axisLabels]
  );

  // ─── Ground drawing ───────────────────────────────────────────
  const drawGroundLine = useCallback(
    (ctx) => {
      const { toCanvasX, toCanvasY } = helpers;
      const { minX, maxX, minY } = worldBounds;

      const groundCanvasY = toCanvasY(groundY);
      const leftX = toCanvasX(minX);
      const rightX = toCanvasX(maxX);
      const bottomY = toCanvasY(minY);

      ctx.save();

      // ── Main ground line ────────────────────────────────────
      ctx.strokeStyle = GROUND_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftX, groundCanvasY);
      ctx.lineTo(rightX, groundCanvasY);
      ctx.stroke();

      // ── Hatching below ground ───────────────────────────────
      // Short diagonal lines every 12px to indicate solid ground
      ctx.strokeStyle = HATCH_COLOR;
      ctx.lineWidth = 1;

      const hatchSpacing = 12;
      const hatchLength = 8;

      for (let hx = leftX; hx <= rightX; hx += hatchSpacing) {
        ctx.beginPath();
        ctx.moveTo(hx, groundCanvasY);
        ctx.lineTo(hx - hatchLength, groundCanvasY + hatchLength);
        ctx.stroke();
      }

      // Fill below hatching with a subtle color
      ctx.fillStyle = 'rgba(165, 180, 252, 0.08)';
      ctx.fillRect(leftX, groundCanvasY, rightX - leftX, bottomY - groundCanvasY);

      ctx.restore();
    },
    [helpers, worldBounds, groundY]
  );

  // ─── Main render function ─────────────────────────────────────
  const renderFrame = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;

    const { width, height } = helpers;

    ctx.save();
    ctx.scale(dpr, dpr);

    // ── Clear canvas ──────────────────────────────────────────
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, width, height);

    // ── Draw grid ─────────────────────────────────────────────
    if (showGrid) {
      drawGrid(ctx);
    }

    // ── Draw ground ───────────────────────────────────────────
    if (showGround) {
      drawGroundLine(ctx);
    }

    // ── Draw axis labels ──────────────────────────────────────
    if (showAxes) {
      drawAxes(ctx);
    }

    // ── Call parent's custom draw function ─────────────────────
    if (draw) {
      draw(ctx, helpers);
    }

    ctx.restore();
  }, [getCtx, dpr, helpers, showGrid, showAxes, showGround, drawGrid, drawAxes, drawGroundLine, draw]);

  // ─── Expose render() via ref ──────────────────────────────────
  useImperativeHandle(
    ref,
    () => ({
      render: renderFrame,
      getCtx,
      helpers,
      canvasElement: canvasRef.current,
    }),
    [renderFrame, getCtx, helpers]
  );

  // ─── Initial render + re-render on dimension/config changes ───
  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  // ─── Click handler ────────────────────────────────────────────
  const handleClick = useCallback(
    (e) => {
      if (!onCanvasClick) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const worldX = helpers.toWorldX(canvasX);
      const worldY = helpers.toWorldY(canvasY);

      onCanvasClick(worldX, worldY);
    },
    [onCanvasClick, helpers]
  );

  // ─── JSX ──────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`w-full ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg cursor-crosshair"
        onClick={handleClick}
      />
    </div>
  );
});

PhysicsCanvas.displayName = 'PhysicsCanvas';

PhysicsCanvas.propTypes = {
  /** Custom draw function called after grid/axes/ground are rendered.
   *  Receives (ctx, helpers) where helpers contain coordinate transforms. */
  draw: PropTypes.func.isRequired,

  /** Visible world-space rectangle in SI units (meters).
   *  E.g., { minX: -1, maxX: 10, minY: -1, maxY: 8 } */
  worldBounds: PropTypes.shape({
    minX: PropTypes.number.isRequired,
    maxX: PropTypes.number.isRequired,
    minY: PropTypes.number.isRequired,
    maxY: PropTypes.number.isRequired,
  }).isRequired,

  /** Whether to render grid lines. Default: true */
  showGrid: PropTypes.bool,

  /** Whether to render axis labels. Default: true */
  showAxes: PropTypes.bool,

  /** Whether to render the ground line at groundY. Default: true */
  showGround: PropTypes.bool,

  /** World-space y-coordinate of the ground line. Default: 0 */
  groundY: PropTypes.number,

  /** Labels for the x and y axes */
  axisLabels: PropTypes.shape({
    x: PropTypes.string,
    y: PropTypes.string,
  }),

  /** Additional CSS classes for the wrapper div */
  className: PropTypes.string,

  /** Height-to-width ratio passed to useCanvasSetup. Default: 0.55 */
  aspectRatio: PropTypes.number,

  /** Click handler that receives world coordinates. (worldX, worldY) => void */
  onCanvasClick: PropTypes.func,
};

PhysicsCanvas.defaultProps = {
  showGrid: true,
  showAxes: true,
  showGround: true,
  groundY: 0,
  axisLabels: { x: 'Distance (m)', y: 'Height (m)' },
  className: '',
  aspectRatio: 0.55,
  onCanvasClick: null,
};

export default PhysicsCanvas;