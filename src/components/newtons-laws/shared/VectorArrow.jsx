/**
 * @module vectorArrow
 *
 * @description
 * A utility module that provides pure functions for drawing vector arrows on
 * an HTML5 Canvas context. These are NOT React components — they are plain
 * JavaScript functions designed to be called inside `draw` callbacks passed
 * to PhysicsCanvas.
 *
 * Three functions are exported:
 * - `drawArrow`: Draws a vector arrow between two canvas-pixel points.
 * - `drawArrowPolar`: Draws a vector arrow from a point using magnitude and angle.
 * - `drawPhysicsVector`: Draws a physics vector (force/velocity) with automatic
 *   color coding based on direction (green for positive, red for negative).
 *
 * @purpose
 * Every simulator draws force arrows, velocity arrows, and acceleration arrows.
 * This module centralizes arrow rendering so each simulator's draw function
 * only specifies what to draw (start, direction, magnitude, label), not how
 * to render arrowheads and labels.
 *
 * @dependents
 * - Every simulator's `draw` callback function (SecondLaw, ImpulseMomentum,
 *   MomentumConservation, ApparentWeight, RelativeVelocity)
 * - Used inside PhysicsCanvas draw calls
 *
 * @example
 * ```javascript
 * import { drawArrow, drawArrowPolar, drawPhysicsVector } from './vectorArrow';
 *
 * // Inside a PhysicsCanvas draw callback:
 * function drawScene(ctx, helpers) {
 *   const { toCanvasX, toCanvasY, scale } = helpers;
 *
 *   // Draw a simple arrow between two canvas points
 *   drawArrow(ctx, {
 *     fromX: 100, fromY: 300,
 *     toX: 250, toY: 200,
 *     color: '#6366f1',
 *     label: 'F',
 *   });
 *
 *   // Draw from a point with magnitude and angle
 *   drawArrowPolar(ctx, {
 *     x: toCanvasX(2),
 *     y: toCanvasY(0),
 *     magnitude: 80,
 *     angle: Math.PI / 4,
 *     color: '#10b981',
 *     label: 'v₀',
 *   });
 *
 *   // Draw a physics vector with auto color (green/red by direction)
 *   drawPhysicsVector(ctx, {
 *     x: toCanvasX(5),
 *     y: toCanvasY(1),
 *     dx: forceX * scale * 0.5,   // scale world units to canvas pixels
 *     dy: forceY * scale * 0.5,
 *     label: 'F = 15 N',
 *     maxLength: 100,
 *   });
 * }
 * ```
 */

// ─── Color Constants ──────────────────────────────────────────────
const COLOR_POSITIVE = '#10b981'; // emerald-500 — rightward/upward
const COLOR_NEGATIVE = '#ef4444'; // red-500 — leftward/downward
const COLOR_NEUTRAL = '#64748b';  // slate-500 — zero or ambiguous

// ─── Default Values ──────────────────────────────────────────────
const DEFAULT_LINE_WIDTH = 2;
const DEFAULT_HEAD_LENGTH = 10;
const DEFAULT_HEAD_ANGLE = Math.PI / 6; // 30 degrees
const DEFAULT_FONT = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const MIN_DRAWABLE_LENGTH = 1; // pixels — below this, don't draw

/**
 * Draw a vector arrow on canvas between two points.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
 * @param {Object} options - Arrow configuration.
 * @param {number} options.fromX - Start x position in canvas pixels.
 * @param {number} options.fromY - Start y position in canvas pixels.
 * @param {number} options.toX - End x position in canvas pixels.
 * @param {number} options.toY - End y position in canvas pixels.
 * @param {string} options.color - CSS color string for the arrow.
 * @param {number} [options.lineWidth=2] - Width of the arrow shaft in pixels.
 * @param {number} [options.headLength=10] - Length of the arrowhead sides in pixels.
 * @param {number} [options.headAngle=Math.PI/6] - Half-angle of the arrowhead in radians.
 * @param {string} [options.label] - Optional text label to display near the arrow.
 * @param {'end'|'middle'} [options.labelPosition='end'] - Where to place the label.
 * @param {boolean} [options.dashed=false] - Whether to draw the shaft as a dashed line.
 * @param {number} [options.opacity=1] - Opacity of the entire arrow (0 to 1).
 * @returns {void}
 */
export function drawArrow(ctx, options) {
  const {
    fromX,
    fromY,
    toX,
    toY,
    color,
    lineWidth = DEFAULT_LINE_WIDTH,
    headLength = DEFAULT_HEAD_LENGTH,
    headAngle = DEFAULT_HEAD_ANGLE,
    label,
    labelPosition = 'end',
    dashed = false,
    opacity = 1,
  } = options;

  // Calculate arrow length — skip if too small
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < MIN_DRAWABLE_LENGTH) return;

  // Calculate arrow angle
  const angle = Math.atan2(dy, dx);

  // Scale head length if the arrow is shorter than the head
  const effectiveHeadLength = Math.min(headLength, length * 0.4);

  ctx.save();

  // Apply opacity
  ctx.globalAlpha = opacity;

  // ─── Draw shaft ─────────────────────────────────────────────
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (dashed) {
    ctx.setLineDash([6, 3]);
  }

  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Reset dash pattern before drawing head
  if (dashed) {
    ctx.setLineDash([]);
  }

  // ─── Draw arrowhead ─────────────────────────────────────────
  const headX1 = toX - effectiveHeadLength * Math.cos(angle - headAngle);
  const headY1 = toY - effectiveHeadLength * Math.sin(angle - headAngle);
  const headX2 = toX - effectiveHeadLength * Math.cos(angle + headAngle);
  const headY2 = toY - effectiveHeadLength * Math.sin(angle + headAngle);

  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(toX, toY);
  ctx.lineTo(headX1, headY1);
  ctx.lineTo(headX2, headY2);
  ctx.closePath();
  ctx.fill();

  // ─── Draw label ─────────────────────────────────────────────
  if (label) {
    drawLabel(ctx, {
      label,
      labelPosition,
      fromX,
      fromY,
      toX,
      toY,
      angle,
      length,
      color,
    });
  }

  ctx.restore();
}

/**
 * Draw a vector arrow from a point given magnitude and angle (polar coordinates).
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
 * @param {Object} options - Arrow configuration.
 * @param {number} options.x - Start x position in canvas pixels.
 * @param {number} options.y - Start y position in canvas pixels.
 * @param {number} options.magnitude - Length of the arrow in canvas pixels.
 * @param {number} options.angle - Direction angle in radians.
 *   0 = right, π/2 = down (canvas coordinates). For standard math coords
 *   where up is positive, pass negative angle or pre-negate y.
 * @param {string} options.color - CSS color string.
 * @param {string} [options.label] - Optional text label.
 * @param {'end'|'middle'} [options.labelPosition='end'] - Where to place the label.
 * @param {number} [options.lineWidth=2] - Shaft width.
 * @param {number} [options.headLength=10] - Arrowhead side length.
 * @param {number} [options.headAngle=Math.PI/6] - Arrowhead half-angle.
 * @param {boolean} [options.dashed=false] - Dashed shaft.
 * @param {number} [options.opacity=1] - Arrow opacity.
 * @returns {void}
 */
export function drawArrowPolar(ctx, options) {
  const {
    x,
    y,
    magnitude,
    angle,
    color,
    label,
    labelPosition = 'end',
    lineWidth = DEFAULT_LINE_WIDTH,
    headLength = DEFAULT_HEAD_LENGTH,
    headAngle = DEFAULT_HEAD_ANGLE,
    dashed = false,
    opacity = 1,
  } = options;

  // Skip if magnitude is too small
  if (Math.abs(magnitude) < MIN_DRAWABLE_LENGTH) return;

  // Convert polar to cartesian end point
  const toX = x + magnitude * Math.cos(angle);
  const toY = y + magnitude * Math.sin(angle);

  // Delegate to drawArrow
  drawArrow(ctx, {
    fromX: x,
    fromY: y,
    toX,
    toY,
    color,
    label,
    labelPosition,
    lineWidth,
    headLength,
    headAngle,
    dashed,
    opacity,
  });
}

/**
 * Draw a physics vector (force, velocity, acceleration) with automatic color
 * coding based on direction. Positive directions (right/up) are drawn in
 * green (#10b981), negative directions (left/down) in red (#ef4444).
 *
 * The `dy` parameter uses standard physics convention: positive = upward.
 * This function internally flips it for canvas rendering (where y increases downward).
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
 * @param {Object} options - Vector configuration.
 * @param {number} options.x - Start x position in canvas pixels.
 * @param {number} options.y - Start y position in canvas pixels.
 * @param {number} options.dx - X component in canvas pixels (positive = right).
 * @param {number} options.dy - Y component in world convention (positive = UP).
 *   Will be flipped internally for canvas rendering.
 * @param {string} [options.label] - Optional text label.
 * @param {'end'|'middle'} [options.labelPosition='end'] - Label placement.
 * @param {number} [options.maxLength=80] - Maximum arrow length in canvas pixels.
 *   Vectors exceeding this are clamped while preserving direction.
 * @param {string} [options.color] - Override automatic color. If provided, disables
 *   automatic green/red coloring.
 * @param {number} [options.lineWidth=2.5] - Shaft width.
 * @param {number} [options.headLength=12] - Arrowhead side length.
 * @param {number} [options.headAngle=Math.PI/6] - Arrowhead half-angle.
 * @param {boolean} [options.dashed=false] - Dashed shaft.
 * @param {number} [options.opacity=1] - Arrow opacity.
 * @returns {void}
 */
export function drawPhysicsVector(ctx, options) {
  const {
    x,
    y,
    dx,
    dy,
    label,
    labelPosition = 'end',
    maxLength = 80,
    color: overrideColor,
    lineWidth = 2.5,
    headLength = 12,
    headAngle = DEFAULT_HEAD_ANGLE,
    dashed = false,
    opacity = 1,
  } = options;

  // Flip dy for canvas coordinates (canvas y-axis is inverted)
  const canvasDx = dx;
  const canvasDy = -dy;

  // Calculate magnitude in canvas pixels
  const magnitude = Math.sqrt(canvasDx * canvasDx + canvasDy * canvasDy);

  // Skip if vector is too small to be visible
  if (magnitude < MIN_DRAWABLE_LENGTH) return;

  // Clamp to maxLength while preserving direction
  let finalDx = canvasDx;
  let finalDy = canvasDy;

  if (magnitude > maxLength) {
    const scaleFactor = maxLength / magnitude;
    finalDx = canvasDx * scaleFactor;
    finalDy = canvasDy * scaleFactor;
  }

  // ─── Determine color based on direction ─────────────────────
  let arrowColor = overrideColor;

  if (!arrowColor) {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 0.5 && absDy < 0.5) {
      // Effectively zero vector — use neutral color
      arrowColor = COLOR_NEUTRAL;
    } else if (absDx >= absDy) {
      // Primary direction is horizontal
      arrowColor = dx >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
    } else {
      // Primary direction is vertical
      arrowColor = dy >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
    }
  }

  // Calculate end point
  const toX = x + finalDx;
  const toY = y + finalDy;

  // Delegate to drawArrow
  drawArrow(ctx, {
    fromX: x,
    fromY: y,
    toX,
    toY,
    color: arrowColor,
    label,
    labelPosition,
    lineWidth,
    headLength,
    headAngle,
    dashed,
    opacity,
  });
}

// ─── Internal Helper ──────────────────────────────────────────────

/**
 * Internal helper to draw a text label near an arrow.
 * Positions the label perpendicular to the arrow direction so it
 * doesn't overlap with the shaft.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} params
 * @param {string} params.label - The text to draw.
 * @param {'end'|'middle'} params.labelPosition - Where to place it.
 * @param {number} params.fromX
 * @param {number} params.fromY
 * @param {number} params.toX
 * @param {number} params.toY
 * @param {number} params.angle - Arrow angle in radians.
 * @param {number} params.length - Arrow length in pixels.
 * @param {string} params.color - Text color.
 * @returns {void}
 */
function drawLabel(ctx, params) {
  const {
    label,
    labelPosition,
    fromX,
    fromY,
    toX,
    toY,
    angle,
    length,
    color,
  } = params;

  // Determine anchor point based on label position
  let anchorX, anchorY;

  if (labelPosition === 'middle') {
    anchorX = (fromX + toX) / 2;
    anchorY = (fromY + toY) / 2;
  } else {
    // 'end' — position near the arrowhead, slightly beyond
    const overshoot = Math.min(8, length * 0.15);
    anchorX = toX + overshoot * Math.cos(angle);
    anchorY = toY + overshoot * Math.sin(angle);
  }

  // Calculate perpendicular offset to avoid overlapping the shaft.
  // The offset direction is chosen to push the label "above" the arrow
  // in the visual sense (perpendicular, to the left of the direction).
  const perpAngle = angle - Math.PI / 2;
  const offsetDistance = 14;
  const offsetX = offsetDistance * Math.cos(perpAngle);
  const offsetY = offsetDistance * Math.sin(perpAngle);

  const labelX = anchorX + offsetX;
  const labelY = anchorY + offsetY;

  // ─── Draw text with background for readability ──────────────
  ctx.font = DEFAULT_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure text for background pill
  const metrics = ctx.measureText(label);
  const textWidth = metrics.width;
  const textHeight = 14; // approximate line height
  const paddingX = 4;
  const paddingY = 2;

  // Draw semi-transparent background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.roundRect(
    labelX - textWidth / 2 - paddingX,
    labelY - textHeight / 2 - paddingY,
    textWidth + paddingX * 2,
    textHeight + paddingY * 2,
    3
  );
  ctx.fill();

  // Draw text
  ctx.fillStyle = color;
  ctx.fillText(label, labelX, labelY);
}