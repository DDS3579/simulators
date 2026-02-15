/**
 * @module inclinedPlane
 *
 * @description
 * Pure canvas drawing function that renders the inclined plane scene for the
 * Newton's Second Law simulator. Draws the wedge/slope surface, the block
 * sitting on the incline, force arrows (applied, friction, normal, weight),
 * gravity decomposition vectors (mg sinθ, mg cosθ), velocity arrow, angle arc,
 * and height indicator.
 *
 * This is NOT a React component. It exports a single function called inside
 * the `draw` callback passed to PhysicsCanvas. The incline scene replaces
 * the flat scene (blockRenderer.js) when the simulator is in incline mode.
 *
 * Coordinate conventions:
 * - World coordinates: standard physics (x = right, y = up)
 * - Along-incline: positive = up-slope, negative = down-slope
 * - The incline starts at world origin (0, 0) and extends upward to the right
 *
 * @purpose
 * Separates incline rendering from the main simulator. The incline involves
 * rotated drawing contexts, trigonometric positioning, and gravity decomposition
 * visuals that would clutter SecondLawSimulator.jsx if inlined.
 *
 * @dependents
 * - SecondLawSimulator.jsx (calls drawInclineScene inside PhysicsCanvas draw callback)
 *
 * @example
 * ```javascript
 * import { drawInclineScene } from './inclinedPlane';
 *
 * const draw = (ctx, helpers) => {
 *   drawInclineScene(ctx, helpers, {
 *     angleDeg: 30,
 *     position: 2.5,
 *     velocity: 1.2,
 *     mass: 5,
 *     appliedForce: 30,
 *     frictionForce: -8.5,
 *     normal: 42.4,
 *     weightParallel: 24.5,
 *     weightPerp: 42.4,
 *     weight: 49,
 *     netForce: -3.0,
 *     acceleration: -0.6,
 *     blockSize: 0.8,
 *     showForceArrows: true,
 *     showVelocityArrow: true,
 *     showComponents: true,
 *   });
 * };
 * ```
 */

import { drawArrow } from '../shared/vectorArrow';

// ─── Color Constants ──────────────────────────────────────────────
const INCLINE_SURFACE_COLOR = '#6366f1';    // indigo-600
const INCLINE_FILL_COLOR = '#f1f5f9';       // slate-100
const HATCH_COLOR = '#cbd5e1';              // slate-300
const BLOCK_FILL = '#e2e8f0';              // slate-200
const BLOCK_STROKE = '#94a3b8';            // slate-400
const BLOCK_TEXT = '#475569';              // slate-600
const APPLIED_COLOR = '#6366f1';           // indigo-600
const FRICTION_COLOR = '#f59e0b';          // amber-500
const NORMAL_COLOR = '#10b981';            // emerald-500
const WEIGHT_COLOR = '#ef4444';            // red-500
const VELOCITY_COLOR = '#3b82f6';          // blue-500
const WEIGHT_PARALLEL_COLOR = '#f97316';   // orange-500
const WEIGHT_PERP_COLOR = '#06b6d4';       // cyan-500
const ANGLE_ARC_COLOR = '#64748b';         // slate-500
const HEIGHT_LINE_COLOR = '#a5b4fc';       // indigo-300
const POSITION_LABEL_COLOR = '#6366f1';    // indigo-600

// ─── Font Constants ───────────────────────────────────────────────
const BLOCK_FONT = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const LABEL_FONT = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const ANGLE_FONT = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

// ─── Layout Constants ─────────────────────────────────────────────
const FORCE_SCALE = 0.04;         // N → world-unit arrow length
const MIN_ARROW_WORLD = 0.3;
const MAX_ARROW_WORLD = 3.5;
const VELOCITY_SCALE = 0.15;
const INCLINE_LENGTH = 15;        // meters — total length of the incline surface

/**
 * Scale a value to a clamped arrow length in world units.
 *
 * @param {number} value - The value to scale
 * @param {number} factor - Scale factor
 * @param {number} minLen - Minimum arrow length
 * @param {number} maxLen - Maximum arrow length
 * @returns {number} Signed, clamped arrow length
 */
function scaleArrow(value, factor, minLen, maxLen) {
  if (Math.abs(value) < 0.01) return 0;
  const raw = value * factor;
  const sign = Math.sign(raw);
  const clamped = Math.max(minLen, Math.min(Math.abs(raw), maxLen));
  return sign * clamped;
}

/**
 * Draw the complete inclined plane scene.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context (already DPI-scaled)
 * @param {Object} helpers - PhysicsCanvas coordinate helpers
 * @param {Function} helpers.toCanvasX - World x → canvas pixel x
 * @param {Function} helpers.toCanvasY - World y → canvas pixel y
 * @param {number} helpers.scale - Pixels per world-unit (meter)
 * @param {number} helpers.width - Canvas CSS width
 * @param {number} helpers.height - Canvas CSS height
 * @param {Object} state - Current simulation state
 * @param {number} state.angleDeg - Incline angle in degrees
 * @param {number} state.position - Position along incline from bottom (meters)
 * @param {number} state.velocity - Velocity along incline (positive = up-slope)
 * @param {number} state.mass - Mass in kg
 * @param {number} state.appliedForce - Force along incline in N (positive = up-slope)
 * @param {number} state.frictionForce - Friction along incline in N (signed)
 * @param {number} state.normal - Normal force magnitude in N
 * @param {number} state.weightParallel - mg sinθ magnitude in N
 * @param {number} state.weightPerp - mg cosθ magnitude in N
 * @param {number} state.weight - Total weight (mg) magnitude in N
 * @param {number} state.netForce - Net force along incline in N (signed)
 * @param {number} state.acceleration - Acceleration along incline in m/s²
 * @param {number} [state.blockSize=0.8] - Block visual size in meters
 * @param {boolean} [state.showForceArrows=true] - Show applied, friction, normal, weight arrows
 * @param {boolean} [state.showVelocityArrow=true] - Show velocity arrow
 * @param {boolean} [state.showComponents=true] - Show mg sinθ / mg cosθ decomposition
 */
export function drawInclineScene(ctx, helpers, state) {
  const {
    angleDeg = 30,
    position = 0,
    velocity = 0,
    mass = 1,
    appliedForce = 0,
    frictionForce = 0,
    normal = 0,
    weightParallel = 0,
    weightPerp = 0,
    weight = 0,
    netForce = 0,
    acceleration = 0,
    blockSize = 0.8,
    showForceArrows = true,
    showVelocityArrow = true,
    showComponents = true,
  } = state;

  const { toCanvasX, toCanvasY, scale } = helpers;
  const angleRad = (angleDeg * Math.PI) / 180;

  // ─── Incline geometry in world coordinates ──────────────────
  const inclineEndX = INCLINE_LENGTH * Math.cos(angleRad);
  const inclineEndY = INCLINE_LENGTH * Math.sin(angleRad);

  // ─── Draw the wedge (filled area below incline) ─────────────
  drawWedge(ctx, helpers, angleRad, inclineEndX, inclineEndY);

  // ─── Draw angle arc at base ─────────────────────────────────
  drawAngleArc(ctx, helpers, angleDeg, angleRad);

  // ─── Calculate block position on incline ────────────────────
  // Block center position in world coords
  const blockCenterAlongIncline = position + blockSize / 2;
  const blockWorldX = blockCenterAlongIncline * Math.cos(angleRad);
  const blockWorldY = blockCenterAlongIncline * Math.sin(angleRad);
  const blockCenterCanvasX = toCanvasX(blockWorldX);
  const blockCenterCanvasY = toCanvasY(blockWorldY);

  // ─── Draw height indicator ─────────────────────────────────
  drawHeightIndicator(ctx, helpers, blockWorldX, blockWorldY);

  // ─── Draw position label along incline ──────────────────────
  drawPositionLabel(ctx, helpers, position, angleRad);

  // ─── Draw the block (rotated to sit on incline) ─────────────
  drawRotatedBlock(ctx, helpers, blockCenterCanvasX, blockCenterCanvasY, blockSize, angleRad, mass);

  // ─── Draw force arrows ─────────────────────────────────────
  if (showForceArrows) {
    // Weight arrow (straight down, NOT along incline)
    drawWeightArrow(ctx, helpers, blockCenterCanvasX, blockCenterCanvasY, weight);

    // Normal force arrow (perpendicular to incline, away from surface)
    drawNormalArrow(ctx, helpers, blockCenterCanvasX, blockCenterCanvasY, normal, angleRad);

    // Applied force arrow (along incline surface)
    drawAlongInclineArrow(ctx, helpers, blockCenterCanvasX, blockCenterCanvasY, appliedForce, angleRad, {
      color: APPLIED_COLOR,
      label: `F = ${Math.abs(appliedForce).toFixed(1)} N`,
      offset: 0,
    });

    // Friction force arrow (along incline surface)
    drawAlongInclineArrow(ctx, helpers, blockCenterCanvasX, blockCenterCanvasY, frictionForce, angleRad, {
      color: FRICTION_COLOR,
      label: `f = ${Math.abs(frictionForce).toFixed(1)} N`,
      offset: 12,
    });
  }

  // ─── Draw gravity decomposition ────────────────────────────
  if (showComponents && weight > 0.01) {
    drawGravityDecomposition(ctx, helpers, blockCenterCanvasX, blockCenterCanvasY, {
      weight,
      weightParallel,
      weightPerp,
      angleRad,
    });
  }

  // ─── Draw velocity arrow ───────────────────────────────────
  if (showVelocityArrow && Math.abs(velocity) > 0.01) {
    drawVelocityArrow(ctx, helpers, blockCenterCanvasX, blockCenterCanvasY, velocity, angleRad, blockSize);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Internal Drawing Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Draw the wedge shape: filled triangle below the incline surface with hatching.
 */
function drawWedge(ctx, helpers, angleRad, endX, endY) {
  const { toCanvasX, toCanvasY } = helpers;

  const originCX = toCanvasX(0);
  const originCY = toCanvasY(0);
  const topCX = toCanvasX(endX);
  const topCY = toCanvasY(endY);
  const baseCX = toCanvasX(endX);
  const baseCY = toCanvasY(0);

  ctx.save();

  // Filled wedge
  ctx.beginPath();
  ctx.moveTo(originCX, originCY);
  ctx.lineTo(topCX, topCY);
  ctx.lineTo(baseCX, baseCY);
  ctx.closePath();
  ctx.fillStyle = INCLINE_FILL_COLOR;
  ctx.fill();

  // Hatching inside wedge
  ctx.strokeStyle = HATCH_COLOR;
  ctx.lineWidth = 0.5;
  const hatchSpacing = 15;

  // Clip to wedge shape for clean hatching
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(originCX, originCY);
  ctx.lineTo(topCX, topCY);
  ctx.lineTo(baseCX, baseCY);
  ctx.closePath();
  ctx.clip();

  // Draw diagonal hatch lines
  const totalWidth = baseCX - originCX;
  const totalHeight = originCY - topCY;
  const maxDim = Math.max(totalWidth, totalHeight) * 2;

  for (let i = -maxDim; i < maxDim; i += hatchSpacing) {
    ctx.beginPath();
    ctx.moveTo(originCX + i, originCY);
    ctx.lineTo(originCX + i + totalHeight, originCY - totalHeight);
    ctx.stroke();
  }

  ctx.restore(); // remove clip

  // Incline surface line (thick, on top)
  ctx.strokeStyle = INCLINE_SURFACE_COLOR;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(originCX, originCY);
  ctx.lineTo(topCX, topCY);
  ctx.stroke();

  // Base line (ground under wedge)
  ctx.strokeStyle = INCLINE_SURFACE_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(originCX, originCY);
  ctx.lineTo(baseCX, baseCY);
  ctx.stroke();

  // Vertical line at the right side of the wedge
  ctx.strokeStyle = HATCH_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(baseCX, baseCY);
  ctx.lineTo(topCX, topCY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

/**
 * Draw the angle arc at the base of the incline showing θ.
 */
function drawAngleArc(ctx, helpers, angleDeg, angleRad) {
  const { toCanvasX, toCanvasY, scale } = helpers;

  const originCX = toCanvasX(0);
  const originCY = toCanvasY(0);
  const arcRadius = Math.min(40, scale * 1.5);

  ctx.save();
  ctx.strokeStyle = ANGLE_ARC_COLOR;
  ctx.lineWidth = 1.5;

  // Arc from 0 (horizontal right) to -angleRad (canvas y is inverted)
  ctx.beginPath();
  ctx.arc(originCX, originCY, arcRadius, 0, -angleRad, true);
  ctx.stroke();

  // Angle label
  const labelAngle = -angleRad / 2;
  const labelRadius = arcRadius + 14;
  const labelX = originCX + labelRadius * Math.cos(labelAngle);
  const labelY = originCY + labelRadius * Math.sin(labelAngle);

  ctx.font = ANGLE_FONT;
  ctx.fillStyle = ANGLE_ARC_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`θ = ${angleDeg}°`, labelX, labelY);

  ctx.restore();
}

/**
 * Draw the block rotated to sit on the incline surface.
 */
function drawRotatedBlock(ctx, helpers, centerX, centerY, blockSize, angleRad, mass) {
  const { scale } = helpers;
  const halfSize = (blockSize * scale) / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(-angleRad); // Rotate canvas so x-axis aligns with incline

  // Block shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Block body
  ctx.fillStyle = BLOCK_FILL;
  ctx.fillRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Border
  ctx.strokeStyle = BLOCK_STROKE;
  ctx.lineWidth = 2;
  ctx.strokeRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);

  // Inner gradient
  const gradient = ctx.createLinearGradient(-halfSize, -halfSize, -halfSize, halfSize);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
  ctx.fillStyle = gradient;
  ctx.fillRect(-halfSize + 1, -halfSize + 1, halfSize * 2 - 2, halfSize * 2 - 2);

  // Mass label (drawn in rotated frame so text aligns with block)
  if (halfSize * 2 > 25) {
    ctx.font = BLOCK_FONT;
    ctx.fillStyle = BLOCK_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${mass} kg`, 0, 0);
  }

  ctx.restore();
}

/**
 * Draw the weight (mg) arrow pointing straight down from block center.
 */
function drawWeightArrow(ctx, helpers, blockCX, blockCY, weight) {
  if (weight < 0.01) return;

  const { scale } = helpers;
  const arrowLen = scaleArrow(weight, FORCE_SCALE, MIN_ARROW_WORLD, MAX_ARROW_WORLD) * scale;

  drawArrow(ctx, {
    fromX: blockCX,
    fromY: blockCY,
    toX: blockCX,
    toY: blockCY + Math.abs(arrowLen), // canvas y increases downward
    color: WEIGHT_COLOR,
    lineWidth: 2.5,
    headLength: 10,
    label: `mg = ${weight.toFixed(1)} N`,
    labelPosition: 'end',
  });
}

/**
 * Draw the normal force arrow perpendicular to the incline surface (away from surface).
 */
function drawNormalArrow(ctx, helpers, blockCX, blockCY, normal, angleRad) {
  if (normal < 0.01) return;

  const { scale } = helpers;
  const arrowLen = scaleArrow(normal, FORCE_SCALE, MIN_ARROW_WORLD, MAX_ARROW_WORLD) * scale;

  // Perpendicular to incline, pointing away from surface
  // In canvas coords: the normal direction is rotated 90° CCW from the incline direction
  // Incline direction in canvas: (cos(-angleRad), sin(-angleRad))
  // Normal (away from surface): (-sin(-angleRad), -cos(-angleRad)) → (sin(angleRad), -cos(angleRad))
  // But in canvas y-down: normal away from surface = (sin(angleRad), -cos(angleRad))... need to negate for canvas
  const normalDirX = -Math.sin(angleRad);
  const normalDirY = -Math.cos(angleRad);

  drawArrow(ctx, {
    fromX: blockCX,
    fromY: blockCY,
    toX: blockCX + normalDirX * Math.abs(arrowLen),
    toY: blockCY + normalDirY * Math.abs(arrowLen),
    color: NORMAL_COLOR,
    lineWidth: 2.5,
    headLength: 10,
    label: `N = ${normal.toFixed(1)} N`,
    labelPosition: 'end',
  });
}

/**
 * Draw a force arrow along the incline surface direction.
 * Positive force = up-slope, negative = down-slope.
 */
function drawAlongInclineArrow(ctx, helpers, blockCX, blockCY, force, angleRad, opts) {
  const { color, label, offset = 0 } = opts;

  if (Math.abs(force) < 0.01) return;

  const { scale } = helpers;
  const arrowLen = scaleArrow(force, FORCE_SCALE, MIN_ARROW_WORLD, MAX_ARROW_WORLD) * scale;

  // Up-slope direction in canvas coordinates
  const upSlopeDirX = Math.cos(angleRad);     // right component
  const upSlopeDirY = -Math.sin(angleRad);    // up component (canvas y inverted)

  // Perpendicular offset to separate overlapping arrows
  const perpDirX = Math.sin(angleRad);
  const perpDirY = Math.cos(angleRad);

  const startX = blockCX + perpDirX * offset;
  const startY = blockCY + perpDirY * offset;

  drawArrow(ctx, {
    fromX: startX,
    fromY: startY,
    toX: startX + upSlopeDirX * arrowLen,
    toY: startY + upSlopeDirY * arrowLen,
    color,
    lineWidth: 2.5,
    headLength: 10,
    label,
    labelPosition: 'end',
  });
}

/**
 * Draw the gravity decomposition: mg sinθ (along incline) and mg cosθ (perpendicular).
 * These form a right triangle with the mg vector.
 */
function drawGravityDecomposition(ctx, helpers, blockCX, blockCY, opts) {
  const { weight, weightParallel, weightPerp, angleRad } = opts;

  if (weight < 0.01) return;

  const { scale } = helpers;

  // The mg vector endpoint (straight down)
  const mgLen = scaleArrow(weight, FORCE_SCALE, MIN_ARROW_WORLD, MAX_ARROW_WORLD) * scale;
  const mgEndX = blockCX;
  const mgEndY = blockCY + Math.abs(mgLen);

  // mg sinθ: component along incline (down-slope from block center)
  const sinLen = scaleArrow(weightParallel, FORCE_SCALE, MIN_ARROW_WORLD, MAX_ARROW_WORLD) * scale;
  // Down-slope direction in canvas
  const downSlopeDirX = -Math.cos(angleRad);   // negative up-slope = down-slope
  const downSlopeDirY = Math.sin(angleRad);     // canvas y inverted

  // mg sinθ arrow from block center, along down-slope
  const sinEndX = blockCX + downSlopeDirX * Math.abs(sinLen);
  const sinEndY = blockCY + downSlopeDirY * Math.abs(sinLen);

  drawArrow(ctx, {
    fromX: blockCX,
    fromY: blockCY,
    toX: sinEndX,
    toY: sinEndY,
    color: WEIGHT_PARALLEL_COLOR,
    lineWidth: 2,
    headLength: 8,
    dashed: true,
    label: `mg sinθ = ${weightParallel.toFixed(1)} N`,
    labelPosition: 'end',
  });

  // mg cosθ: component perpendicular to incline (into surface from block center)
  const cosLen = scaleArrow(weightPerp, FORCE_SCALE, MIN_ARROW_WORLD, MAX_ARROW_WORLD) * scale;
  // Into-surface direction (opposite of normal)
  const intoSurfaceDirX = Math.sin(angleRad);
  const intoSurfaceDirY = Math.cos(angleRad);

  const cosEndX = blockCX + intoSurfaceDirX * Math.abs(cosLen);
  const cosEndY = blockCY + intoSurfaceDirY * Math.abs(cosLen);

  drawArrow(ctx, {
    fromX: blockCX,
    fromY: blockCY,
    toX: cosEndX,
    toY: cosEndY,
    color: WEIGHT_PERP_COLOR,
    lineWidth: 2,
    headLength: 8,
    dashed: true,
    label: `mg cosθ = ${weightPerp.toFixed(1)} N`,
    labelPosition: 'end',
  });

  // Right angle symbol at the corner between sinθ and cosθ components
  drawRightAngleSymbol(ctx, sinEndX, sinEndY, angleRad);

  // Connecting lines to show the triangle (from sinθ end to mg end, from cosθ end to mg end)
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);

  // Line from mg sinθ endpoint down to mg endpoint
  ctx.beginPath();
  ctx.moveTo(sinEndX, sinEndY);
  ctx.lineTo(mgEndX, mgEndY);
  ctx.stroke();

  // Line from mg cosθ endpoint across to mg endpoint
  ctx.beginPath();
  ctx.moveTo(cosEndX, cosEndY);
  ctx.lineTo(mgEndX, mgEndY);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draw a right-angle symbol (small square) at a corner.
 */
function drawRightAngleSymbol(ctx, cornerX, cornerY, angleRad) {
  const size = 8;

  // The two directions at the right angle corner
  // Direction 1: perpendicular to incline (into surface)
  const d1x = Math.sin(angleRad) * size;
  const d1y = Math.cos(angleRad) * size;
  // Direction 2: along incline (opposite direction from the sinθ arrow)
  const d2x = Math.cos(angleRad) * size;
  const d2y = -Math.sin(angleRad) * size;

  ctx.save();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(cornerX + d1x, cornerY + d1y);
  ctx.lineTo(cornerX + d1x + d2x, cornerY + d1y + d2y);
  ctx.lineTo(cornerX + d2x, cornerY + d2y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a velocity arrow along the incline above the block.
 */
function drawVelocityArrow(ctx, helpers, blockCX, blockCY, velocity, angleRad, blockSize) {
  const { scale } = helpers;
  const halfBlock = (blockSize * scale) / 2;

  const vLen = scaleArrow(velocity, VELOCITY_SCALE, MIN_ARROW_WORLD, MAX_ARROW_WORLD) * scale;

  // Position above the block (perpendicular offset from surface)
  const perpOffsetDist = halfBlock + 15;
  const normalDirX = -Math.sin(angleRad);
  const normalDirY = -Math.cos(angleRad);

  const startX = blockCX + normalDirX * perpOffsetDist;
  const startY = blockCY + normalDirY * perpOffsetDist;

  // Along incline direction
  const upSlopeDirX = Math.cos(angleRad);
  const upSlopeDirY = -Math.sin(angleRad);

  drawArrow(ctx, {
    fromX: startX,
    fromY: startY,
    toX: startX + upSlopeDirX * vLen,
    toY: startY + upSlopeDirY * vLen,
    color: VELOCITY_COLOR,
    lineWidth: 2,
    headLength: 9,
    label: `v = ${velocity.toFixed(2)} m/s`,
    labelPosition: 'end',
  });
}

/**
 * Draw a dashed vertical height indicator from block position to ground.
 */
function drawHeightIndicator(ctx, helpers, blockWorldX, blockWorldY) {
  const { toCanvasX, toCanvasY } = helpers;

  if (blockWorldY < 0.1) return;

  const topCX = toCanvasX(blockWorldX);
  const topCY = toCanvasY(blockWorldY);
  const bottomCX = toCanvasX(blockWorldX);
  const bottomCY = toCanvasY(0);

  ctx.save();

  // Dashed vertical line
  ctx.strokeStyle = HEIGHT_LINE_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);

  ctx.beginPath();
  ctx.moveTo(topCX, topCY);
  ctx.lineTo(bottomCX, bottomCY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Height label
  const midY = (topCY + bottomCY) / 2;
  ctx.font = LABEL_FONT;
  ctx.fillStyle = HEIGHT_LINE_COLOR;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Background pill for readability
  const text = `h = ${blockWorldY.toFixed(1)} m`;
  const metrics = ctx.measureText(text);
  const pillX = topCX + 6;
  const pillY = midY;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.roundRect(
    pillX - 3,
    pillY - 8,
    metrics.width + 6,
    16,
    3
  );
  ctx.fill();

  ctx.fillStyle = POSITION_LABEL_COLOR;
  ctx.fillText(text, pillX, pillY);

  ctx.restore();
}

/**
 * Draw a position label along the incline surface.
 */
function drawPositionLabel(ctx, helpers, position, angleRad) {
  const { toCanvasX, toCanvasY } = helpers;

  if (position < 0.05) return;

  // Position marker at the base of the block along the incline
  const markerWorldX = position * Math.cos(angleRad);
  const markerWorldY = position * Math.sin(angleRad);
  const markerCX = toCanvasX(markerWorldX);
  const markerCY = toCanvasY(markerWorldY);

  ctx.save();

  // Small circle on the incline surface
  ctx.fillStyle = POSITION_LABEL_COLOR;
  ctx.beginPath();
  ctx.arc(markerCX, markerCY, 3, 0, Math.PI * 2);
  ctx.fill();

  // Label offset below the incline surface
  const offsetDirX = Math.sin(angleRad);
  const offsetDirY = Math.cos(angleRad);
  const labelX = markerCX + offsetDirX * 18;
  const labelY = markerCY + offsetDirY * 18;

  ctx.font = LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Background pill
  const text = `s = ${position.toFixed(1)} m`;
  const metrics = ctx.measureText(text);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.roundRect(
    labelX - metrics.width / 2 - 3,
    labelY - 8,
    metrics.width + 6,
    16,
    3
  );
  ctx.fill();

  ctx.fillStyle = POSITION_LABEL_COLOR;
  ctx.fillText(text, labelX, labelY);

  ctx.restore();
}