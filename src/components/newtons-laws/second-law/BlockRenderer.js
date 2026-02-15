/**
 * @module blockRenderer
 *
 * @description
 * Pure canvas drawing function that renders the flat-surface scene for the
 * Newton's Second Law simulator. Draws the block at its current position,
 * mass label, applied force arrow, friction arrow, velocity arrow, acceleration
 * arrow, position markers, and a reference line at x=0.
 *
 * This is NOT a React component. It exports a single function that is called
 * inside the `draw` callback passed to PhysicsCanvas.
 *
 * @purpose
 * Separates the flat-surface rendering logic from the main simulator component,
 * keeping SecondLawSimulator.jsx focused on state management and layout. The
 * incline mode has its own renderer (inclinedPlane.js).
 *
 * @dependents
 * - SecondLawSimulator.jsx (calls drawFlatScene inside its PhysicsCanvas draw callback)
 *
 * @example
 * ```javascript
 * import { drawFlatScene } from './blockRenderer';
 *
 * // Inside PhysicsCanvas draw callback:
 * const draw = (ctx, helpers) => {
 *   drawFlatScene(ctx, helpers, {
 *     position: 3.5,
 *     velocity: 2.1,
 *     blockWidth: 1,
 *     blockHeight: 0.8,
 *     appliedForce: 20,
 *     frictionForce: -9.8,
 *     netForce: 10.2,
 *     mass: 5,
 *     showForceArrows: true,
 *     showVelocityArrow: true,
 *     showAccelArrow: true,
 *     acceleration: 2.04,
 *   });
 * };
 * ```
 */

import { drawArrow, drawPhysicsVector } from '../shared/vectorArrow';

// ─── Color Constants ──────────────────────────────────────────────
const BLOCK_FILL = '#e2e8f0';        // slate-200
const BLOCK_STROKE = '#94a3b8';      // slate-400
const BLOCK_TEXT = '#475569';         // slate-600
const APPLIED_COLOR = '#6366f1';     // indigo-600
const FRICTION_COLOR = '#f59e0b';    // amber-500
const VELOCITY_COLOR = '#3b82f6';    // blue-500
const ACCEL_COLOR = '#8b5cf6';       // purple-500
const NET_FORCE_COLOR = '#8b5cf6';   // purple-500
const NORMAL_COLOR = '#10b981';      // emerald-500
const WEIGHT_COLOR = '#ef4444';      // red-500
const MARKER_COLOR = '#94a3b8';      // slate-400
const REFERENCE_COLOR = '#c7d2fe';   // indigo-200
const POSITION_LABEL_COLOR = '#6366f1'; // indigo-600

// ─── Font Constants ───────────────────────────────────────────────
const BLOCK_FONT = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const MARKER_FONT = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const POSITION_FONT = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

// ─── Layout Constants ─────────────────────────────────────────────
const FORCE_SCALE_FACTOR = 0.04;     // Newtons → world-units for arrow length
const MIN_ARROW_WORLD = 0.3;         // minimum arrow length in world units
const MAX_ARROW_WORLD = 4.0;         // maximum arrow length in world units
const VELOCITY_SCALE = 0.15;         // m/s → world-units for velocity arrow
const ACCEL_SCALE = 0.25;            // m/s² → world-units for acceleration arrow

/**
 * Scale a force/value to a reasonable arrow length in world units.
 * Ensures arrows are visible but don't dominate the scene.
 *
 * @param {number} value - The value to scale (force in N, velocity in m/s, etc.)
 * @param {number} scaleFactor - Multiplier to convert value to world units
 * @param {number} minLen - Minimum arrow length in world units
 * @param {number} maxLen - Maximum arrow length in world units
 * @returns {number} Scaled length in world units (preserves sign)
 */
function scaleArrow(value, scaleFactor, minLen, maxLen) {
  if (Math.abs(value) < 0.01) return 0;
  const raw = value * scaleFactor;
  const sign = Math.sign(raw);
  const clamped = Math.max(minLen, Math.min(Math.abs(raw), maxLen));
  return sign * clamped;
}

/**
 * Draw the flat-surface scene: block at position, force arrows, velocity/acceleration arrows,
 * position markers, and reference line.
 *
 * All coordinates are in world space and converted to canvas pixels via helpers.
 * The PhysicsCanvas already draws the grid, axes, and ground line — this function
 * only draws the simulation-specific content.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context (already DPI-scaled by PhysicsCanvas)
 * @param {Object} helpers - Coordinate helpers from PhysicsCanvas
 * @param {number} helpers.toCanvasX - World X → canvas pixel X
 * @param {number} helpers.toCanvasY - World Y → canvas pixel Y
 * @param {number} helpers.scale - Pixels per world-unit (meter)
 * @param {number} helpers.width - Canvas CSS pixel width
 * @param {number} helpers.height - Canvas CSS pixel height
 * @param {Object} state - Current simulation state
 * @param {number} state.position - Block x position in meters
 * @param {number} state.velocity - Block velocity in m/s (positive = rightward)
 * @param {number} [state.blockWidth=1] - Block width in meters
 * @param {number} [state.blockHeight=0.8] - Block height in meters
 * @param {number} state.appliedForce - Applied force in N (signed)
 * @param {number} state.frictionForce - Friction force in N (signed)
 * @param {number} state.netForce - Net force in N (signed)
 * @param {number} state.mass - Mass in kg
 * @param {boolean} [state.showForceArrows=true] - Whether to draw force arrows
 * @param {boolean} [state.showVelocityArrow=true] - Whether to draw velocity arrow
 * @param {boolean} [state.showAccelArrow=false] - Whether to draw acceleration arrow
 * @param {number} state.acceleration - Acceleration in m/s²
 * @param {number} [state.normal=0] - Normal force magnitude in N
 * @param {number} [state.weight=0] - Weight magnitude in N
 */
export function drawFlatScene(ctx, helpers, state) {
  const {
    position = 0,
    velocity = 0,
    blockWidth = 1,
    blockHeight = 0.8,
    appliedForce = 0,
    frictionForce = 0,
    netForce = 0,
    mass = 1,
    showForceArrows = true,
    showVelocityArrow = true,
    showAccelArrow = false,
    acceleration = 0,
    normal = 0,
    weight = 0,
  } = state;

  const { toCanvasX, toCanvasY, scale } = helpers;

  // ─── Canvas coordinates for the block ───────────────────────
  const blockLeftX = toCanvasX(position);
  const blockRightX = toCanvasX(position + blockWidth);
  const blockTopY = toCanvasY(blockHeight);
  const blockBottomY = toCanvasY(0);
  const blockCanvasW = blockRightX - blockLeftX;
  const blockCanvasH = blockBottomY - blockTopY;
  const blockCenterX = blockLeftX + blockCanvasW / 2;
  const blockCenterY = blockTopY + blockCanvasH / 2;

  // ─── Draw reference line at x=0 ────────────────────────────
  drawReferenceLine(ctx, helpers);

  // ─── Draw position marker on ground ─────────────────────────
  drawPositionMarker(ctx, helpers, position);

  // ─── Draw the block ─────────────────────────────────────────
  drawBlock(ctx, blockLeftX, blockTopY, blockCanvasW, blockCanvasH, mass);

  // ─── Draw force arrows ─────────────────────────────────────
  if (showForceArrows) {
    // Applied force arrow (from block center, horizontal)
    drawForceArrowHorizontal(ctx, helpers, {
      originX: blockCenterX,
      originY: blockCenterY,
      force: appliedForce,
      color: APPLIED_COLOR,
      label: `F = ${Math.abs(appliedForce).toFixed(1)} N`,
      yOffset: 0,
    });

    // Friction force arrow (from bottom center, along surface)
    drawForceArrowHorizontal(ctx, helpers, {
      originX: blockCenterX,
      originY: blockBottomY - 2,
      force: frictionForce,
      color: FRICTION_COLOR,
      label: `f = ${Math.abs(frictionForce).toFixed(1)} N`,
      yOffset: 14,
    });

    // Weight arrow (from block center, downward)
    if (weight > 0.01) {
      const weightLen = scaleArrow(weight, FORCE_SCALE_FACTOR, MIN_ARROW_WORLD, MAX_ARROW_WORLD);
      const weightEndY = toCanvasY(-weightLen);
      drawArrow(ctx, {
        fromX: blockCenterX,
        fromY: blockCenterY,
        toX: blockCenterX,
        toY: weightEndY,
        color: WEIGHT_COLOR,
        lineWidth: 2.5,
        headLength: 10,
        label: `mg = ${weight.toFixed(1)} N`,
        labelPosition: 'end',
      });
    }

    // Normal force arrow (from block top center, upward)
    if (normal > 0.01) {
      const normalLen = scaleArrow(normal, FORCE_SCALE_FACTOR, MIN_ARROW_WORLD, MAX_ARROW_WORLD);
      const normalEndY = toCanvasY(blockHeight + normalLen);
      drawArrow(ctx, {
        fromX: blockCenterX,
        fromY: blockTopY,
        toX: blockCenterX,
        toY: normalEndY,
        color: NORMAL_COLOR,
        lineWidth: 2.5,
        headLength: 10,
        label: `N = ${normal.toFixed(1)} N`,
        labelPosition: 'end',
      });
    }
  }

  // ─── Draw velocity arrow ───────────────────────────────────
  if (showVelocityArrow && Math.abs(velocity) > 0.01) {
    const vArrowWorld = scaleArrow(velocity, VELOCITY_SCALE, MIN_ARROW_WORLD, MAX_ARROW_WORLD);
    const vStartX = blockCenterX;
    const vStartY = toCanvasY(blockHeight + 0.3);
    const vEndX = toCanvasX(position + blockWidth / 2 + vArrowWorld);

    drawArrow(ctx, {
      fromX: vStartX,
      fromY: vStartY,
      toX: vEndX,
      toY: vStartY,
      color: VELOCITY_COLOR,
      lineWidth: 2,
      headLength: 9,
      label: `v = ${velocity.toFixed(2)} m/s`,
      labelPosition: 'end',
    });
  }

  // ─── Draw acceleration arrow ───────────────────────────────
  if (showAccelArrow && Math.abs(acceleration) > 0.01) {
    const aArrowWorld = scaleArrow(acceleration, ACCEL_SCALE, MIN_ARROW_WORLD, MAX_ARROW_WORLD);
    const aStartX = blockCenterX;
    const aStartY = toCanvasY(blockHeight + 0.7);
    const aEndX = toCanvasX(position + blockWidth / 2 + aArrowWorld);

    drawArrow(ctx, {
      fromX: aStartX,
      fromY: aStartY,
      toX: aEndX,
      toY: aStartY,
      color: ACCEL_COLOR,
      lineWidth: 2,
      headLength: 9,
      dashed: true,
      label: `a = ${acceleration.toFixed(2)} m/s²`,
      labelPosition: 'end',
    });
  }

  // ─── Draw motion trail ─────────────────────────────────────
  drawMotionTrail(ctx, helpers, position, blockWidth);
}

// ═══════════════════════════════════════════════════════════════════
// Internal Drawing Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Draw the block rectangle with mass label.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Canvas x of top-left corner
 * @param {number} y - Canvas y of top-left corner
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {number} mass - Mass in kg for label
 */
function drawBlock(ctx, x, y, w, h, mass) {
  ctx.save();

  // Block shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Block body
  ctx.fillStyle = BLOCK_FILL;
  ctx.fillRect(x, y, w, h);

  // Reset shadow before stroke
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Block border
  ctx.strokeStyle = BLOCK_STROKE;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Inner gradient effect (subtle 3D look)
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

  // Mass label
  ctx.font = BLOCK_FONT;
  ctx.fillStyle = BLOCK_TEXT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const labelText = `${mass} kg`;
  const centerX = x + w / 2;
  const centerY = y + h / 2;

  // Only draw label if block is wide enough
  if (w > 30) {
    ctx.fillText(labelText, centerX, centerY);
  }

  ctx.restore();
}

/**
 * Draw a horizontal force arrow from an origin point.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} helpers - PhysicsCanvas helpers
 * @param {Object} opts
 * @param {number} opts.originX - Canvas x of arrow start
 * @param {number} opts.originY - Canvas y of arrow start
 * @param {number} opts.force - Force in N (signed, positive = right)
 * @param {string} opts.color - Arrow color
 * @param {string} opts.label - Arrow label text
 * @param {number} opts.yOffset - Additional vertical pixel offset for label
 */
function drawForceArrowHorizontal(ctx, helpers, opts) {
  const { originX, originY, force, color, label, yOffset = 0 } = opts;
  const { scale } = helpers;

  if (Math.abs(force) < 0.01) return;

  // Scale force to canvas pixels
  const arrowWorldLen = scaleArrow(force, FORCE_SCALE_FACTOR, MIN_ARROW_WORLD, MAX_ARROW_WORLD);
  const arrowPixelLen = arrowWorldLen * scale;

  const endX = originX + arrowPixelLen;

  drawArrow(ctx, {
    fromX: originX,
    fromY: originY,
    toX: endX,
    toY: originY,
    color,
    lineWidth: 2.5,
    headLength: 10,
    label,
    labelPosition: 'end',
  });
}

/**
 * Draw a dashed vertical reference line at x=0 (starting position).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} helpers
 */
function drawReferenceLine(ctx, helpers) {
  const { toCanvasX, toCanvasY } = helpers;

  const x0 = toCanvasX(0);
  const topY = toCanvasY(4);
  const bottomY = toCanvasY(0);

  ctx.save();
  ctx.strokeStyle = REFERENCE_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(x0, topY);
  ctx.lineTo(x0, bottomY);
  ctx.stroke();

  ctx.setLineDash([]);

  // Label
  ctx.font = MARKER_FONT;
  ctx.fillStyle = MARKER_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('x = 0', x0, topY - 4);

  ctx.restore();
}

/**
 * Draw a position marker (small triangle) on the ground line below the block.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} helpers
 * @param {number} position - Block x position in world meters
 */
function drawPositionMarker(ctx, helpers, position) {
  const { toCanvasX, toCanvasY } = helpers;

  const markerX = toCanvasX(position);
  const groundY = toCanvasY(0);

  ctx.save();

  // Small upward-pointing triangle
  const triSize = 5;
  ctx.fillStyle = POSITION_LABEL_COLOR;
  ctx.beginPath();
  ctx.moveTo(markerX, groundY + 2);
  ctx.lineTo(markerX - triSize, groundY + 2 + triSize * 1.5);
  ctx.lineTo(markerX + triSize, groundY + 2 + triSize * 1.5);
  ctx.closePath();
  ctx.fill();

  // Position label
  ctx.font = POSITION_FONT;
  ctx.fillStyle = POSITION_LABEL_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`x = ${position.toFixed(1)} m`, markerX, groundY + 2 + triSize * 1.5 + 3);

  ctx.restore();
}

/**
 * Draw a subtle motion trail behind the block showing recent movement.
 * Renders as a series of fading dots along the ground line.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} helpers
 * @param {number} position - Current block position in meters
 * @param {number} blockWidth - Block width in meters
 */
function drawMotionTrail(ctx, helpers, position, blockWidth) {
  const { toCanvasX, toCanvasY } = helpers;

  // Only draw trail if block has moved from origin
  if (position < 0.2) return;

  const groundY = toCanvasY(0);
  const trailStartX = toCanvasX(0 + blockWidth / 2);
  const trailEndX = toCanvasX(position + blockWidth / 2);
  const trailLength = trailEndX - trailStartX;

  if (trailLength < 5) return;

  ctx.save();

  // Draw a gradient line along the ground
  const gradient = ctx.createLinearGradient(trailStartX, 0, trailEndX, 0);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.0)');
  gradient.addColorStop(0.3, 'rgba(99, 102, 241, 0.15)');
  gradient.addColorStop(1, 'rgba(99, 102, 241, 0.3)');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(trailStartX, groundY - 1);
  ctx.lineTo(trailEndX, groundY - 1);
  ctx.stroke();

  // Draw dots at regular intervals
  const dotSpacing = Math.max(20, trailLength / 15);
  const dotRadius = 2;

  for (let dx = dotSpacing; dx < trailLength; dx += dotSpacing) {
    const dotX = trailStartX + dx;
    const alpha = 0.1 + 0.2 * (dx / trailLength);

    ctx.beginPath();
    ctx.arc(dotX, groundY - 1, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`;
    ctx.fill();
  }

  ctx.restore();
}