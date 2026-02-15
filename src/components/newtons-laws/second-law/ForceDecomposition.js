/**
 * @module forceDecomposition
 *
 * @description
 * A supplementary canvas drawing function that renders a self-contained force
 * decomposition diagram. Shows how weight (mg) decomposes into components
 * parallel (mg sinθ) and perpendicular (mg cosθ) to an inclined surface,
 * forming a clear right triangle.
 *
 * This diagram is rendered as an overlay box in the corner of the main
 * PhysicsCanvas. It provides a zoomed-in, clean educational view of the
 * vector decomposition that may be hard to see on the main incline scene
 * when arrows are small or overlapping.
 *
 * This is NOT a React component — it exports a pure drawing function.
 *
 * @purpose
 * The gravity decomposition on the main incline scene can be cluttered with
 * other arrows. This standalone diagram provides a clear, isolated view of
 * the mg → mg sinθ + mg cosθ triangle that students can reference. It can
 * be drawn on the main canvas or on the FBD canvas.
 *
 * @dependents
 * - SecondLawSimulator.jsx (draws in corner of main canvas when showComponents=true)
 * - FreeBodyDiagram.jsx (optionally uses for decomposition overlay)
 *
 * @example
 * ```javascript
 * import { drawForceDecompositionDiagram } from './forceDecomposition';
 *
 * // Inside a PhysicsCanvas draw callback:
 * function draw(ctx, helpers) {
 *   // ... draw main scene ...
 *
 *   // Draw decomposition diagram in top-right corner
 *   drawForceDecompositionDiagram(ctx, {
 *     x: helpers.width - 180,
 *     y: 10,
 *     size: 160,
 *     angleDeg: 30,
 *     weight: 49.0,
 *     weightParallel: 24.5,
 *     weightPerp: 42.4,
 *     showLabels: true,
 *     showAngle: true,
 *   });
 * }
 * ```
 */

import { drawArrow } from '../shared/vectorArrow';

// ─── Color Constants ──────────────────────────────────────────────
const BG_COLOR = 'rgba(255, 255, 255, 0.92)';
const BORDER_COLOR = '#e2e8f0';           // slate-200
const TITLE_COLOR = '#64748b';            // slate-500
const INCLINE_LINE_COLOR = '#94a3b8';     // slate-400
const WEIGHT_COLOR = '#ef4444';           // red-500
const PARALLEL_COLOR = '#f97316';         // orange-500
const PERP_COLOR = '#06b6d4';             // cyan-500
const ANGLE_COLOR = '#64748b';            // slate-500
const RIGHT_ANGLE_COLOR = '#94a3b8';      // slate-400
const HORIZONTAL_REF_COLOR = '#cbd5e1';   // slate-300

// ─── Font Constants ───────────────────────────────────────────────
const TITLE_FONT = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const LABEL_FONT = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const VALUE_FONT = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const ANGLE_FONT = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

// ─── Layout Constants ─────────────────────────────────────────────
const TITLE_HEIGHT = 20;
const PADDING = 12;
const ARROW_HEAD_SIZE = 7;
const RIGHT_ANGLE_SIZE = 7;
const MIN_ARROW_LENGTH = 15;

/**
 * Draw a force decomposition diagram showing how weight decomposes into
 * components along and perpendicular to an inclined surface.
 *
 * The diagram is self-contained within a rounded rectangle at the specified
 * position. It draws:
 * 1. A faint incline reference line
 * 2. The mg vector (straight down, red)
 * 3. The mg sinθ component (along incline, orange, dashed)
 * 4. The mg cosθ component (perpendicular to incline, cyan, dashed)
 * 5. A right-angle symbol at the decomposition corner
 * 6. The angle θ arc between mg and mg cosθ
 * 7. Labels with formulas and numeric values
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context (already DPI-scaled)
 * @param {Object} options - Diagram configuration
 * @param {number} options.x - Canvas x of diagram top-left corner (pixels)
 * @param {number} options.y - Canvas y of diagram top-left corner (pixels)
 * @param {number} options.size - Width and height of the diagram box (pixels)
 * @param {number} options.angleDeg - Incline angle in degrees (0-90)
 * @param {number} options.weight - mg value in Newtons
 * @param {number} options.weightParallel - mg sinθ value in Newtons
 * @param {number} options.weightPerp - mg cosθ value in Newtons
 * @param {boolean} [options.showLabels=true] - Whether to show formula + value labels
 * @param {boolean} [options.showAngle=true] - Whether to show the angle arc
 * @param {number} [options.opacity=1] - Overall diagram opacity (0 to 1)
 */
export function drawForceDecompositionDiagram(ctx, options) {
  const {
    x,
    y,
    size,
    angleDeg,
    weight,
    weightParallel,
    weightPerp,
    showLabels = true,
    showAngle = true,
    opacity = 1,
  } = options;

  // Skip if weight is negligible or angle is invalid
  if (weight < 0.01 || size < 50) return;

  const angleRad = (angleDeg * Math.PI) / 180;

  ctx.save();
  ctx.globalAlpha = opacity;

  // ─── Draw background box ───────────────────────────────────
  drawBackground(ctx, x, y, size);

  // ─── Draw title ────────────────────────────────────────────
  ctx.font = TITLE_FONT;
  ctx.fillStyle = TITLE_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Force Decomposition', x + size / 2, y + 6);

  // ─── Calculate diagram geometry ────────────────────────────
  // Available drawing area (below title, with padding)
  const drawAreaX = x + PADDING;
  const drawAreaY = y + TITLE_HEIGHT + 4;
  const drawAreaW = size - PADDING * 2;
  const drawAreaH = size - TITLE_HEIGHT - PADDING - 4;

  // The "block" point (origin of all three vectors) is positioned
  // in the upper portion of the drawing area, offset from center
  // so the downward mg arrow and the along-incline arrow both fit
  const originX = drawAreaX + drawAreaW * 0.45;
  const originY = drawAreaY + drawAreaH * 0.2;

  // Scale all arrows proportionally so the longest one fits
  // The mg arrow (straight down) is the longest since it's the hypotenuse
  const maxArrowSpace = drawAreaH * 0.55;
  const arrowScale = weight > 0 ? maxArrowSpace / weight : 1;

  // Arrow lengths in pixels
  const mgLength = Math.max(MIN_ARROW_LENGTH, weight * arrowScale);
  const sinLength = Math.max(angleDeg > 1 ? MIN_ARROW_LENGTH * 0.5 : 0, weightParallel * arrowScale);
  const cosLength = Math.max(angleDeg < 89 ? MIN_ARROW_LENGTH * 0.5 : 0, weightPerp * arrowScale);

  // ─── Draw incline reference line ───────────────────────────
  drawInclineReference(ctx, originX, originY, angleRad, drawAreaW * 0.8);

  // ─── Draw horizontal reference line ────────────────────────
  drawHorizontalReference(ctx, originX, originY, drawAreaW * 0.35);

  // ─── Calculate vector endpoints ────────────────────────────

  // mg: straight down (canvas +y)
  const mgEndX = originX;
  const mgEndY = originY + mgLength;

  // mg sinθ: along the incline surface, downslope
  // Downslope direction in canvas: (-cos(θ), +sin(θ)) but we want it pointing
  // from origin down along incline, so use (cos(θ_from_vertical), sin(θ_from_vertical))
  // Actually in canvas coords, down-slope from block:
  // The incline goes up to the right, so downslope = left and down
  // Downslope direction = (-cos(θ), sin(θ)) in canvas (x left, y down)
  // But for a nice diagram, let's orient so the incline goes down-right
  // Incline surface direction going downhill: (cos(θ), sin(θ)) rotated...
  //
  // Cleaner approach: think in the rotated frame
  // mg points straight down = (0, mgLength) in canvas
  // mg cosθ is the component perpendicular to incline (into surface)
  // mg sinθ is the component parallel to incline (down-slope)
  //
  // Perpendicular to incline (into surface from above):
  //   direction = (sin(θ), cos(θ)) in canvas coords
  // Parallel to incline (down-slope):
  //   direction = (cos(θ), -sin(θ)) reflected... let me work this out properly
  //
  // The incline surface goes from bottom-left to upper-right at angle θ from horizontal.
  // In canvas (y-down) coordinates:
  //   Along incline upward: (cos(θ), -sin(θ))
  //   Along incline downward (down-slope): (-cos(θ), sin(θ))
  //   Into surface (perpendicular, toward incline): (sin(θ), cos(θ))
  //   Away from surface: (-sin(θ), -cos(θ))

  // mg sinθ: down-slope direction
  const sinDirX = -Math.cos(angleRad);
  const sinDirY = Math.sin(angleRad);
  const sinEndX = originX + sinDirX * sinLength;
  const sinEndY = originY + sinDirY * sinLength;

  // mg cosθ: into-surface direction
  const cosDirX = Math.sin(angleRad);
  const cosDirY = Math.cos(angleRad);
  const cosEndX = originX + cosDirX * cosLength;
  const cosEndY = originY + cosDirY * cosLength;

  // ─── Draw connecting dashed lines (triangle sides) ─────────
  // These show the triangle relationship between mg, mg sinθ, mg cosθ
  // Line from sinθ end → mg end
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);

  ctx.beginPath();
  ctx.moveTo(sinEndX, sinEndY);
  ctx.lineTo(mgEndX, mgEndY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cosEndX, cosEndY);
  ctx.lineTo(mgEndX, mgEndY);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();

  // ─── Draw mg sinθ arrow (dashed, orange) ───────────────────
  if (angleDeg > 0.5 && sinLength > 3) {
    drawArrow(ctx, {
      fromX: originX,
      fromY: originY,
      toX: sinEndX,
      toY: sinEndY,
      color: PARALLEL_COLOR,
      lineWidth: 2,
      headLength: ARROW_HEAD_SIZE,
      dashed: true,
    });
  }

  // ─── Draw mg cosθ arrow (dashed, cyan) ─────────────────────
  if (angleDeg < 89.5 && cosLength > 3) {
    drawArrow(ctx, {
      fromX: originX,
      fromY: originY,
      toX: cosEndX,
      toY: cosEndY,
      color: PERP_COLOR,
      lineWidth: 2,
      headLength: ARROW_HEAD_SIZE,
      dashed: true,
    });
  }

  // ─── Draw mg arrow (solid, red) — drawn last to be on top ──
  drawArrow(ctx, {
    fromX: originX,
    fromY: originY,
    toX: mgEndX,
    toY: mgEndY,
    color: WEIGHT_COLOR,
    lineWidth: 2.5,
    headLength: ARROW_HEAD_SIZE + 2,
  });

  // ─── Draw right-angle symbol ───────────────────────────────
  if (angleDeg > 2 && angleDeg < 88) {
    drawRightAngle(ctx, sinEndX, sinEndY, sinDirX, sinDirY, cosDirX, cosDirY);
  }

  // ─── Draw angle arc between mg and mg cosθ ─────────────────
  if (showAngle && angleDeg > 2 && angleDeg < 88) {
    drawAngle(ctx, originX, originY, angleDeg, angleRad, mgLength);
  }

  // ─── Draw labels ───────────────────────────────────────────
  if (showLabels) {
    drawDecompLabels(ctx, {
      originX, originY,
      mgEndX, mgEndY,
      sinEndX, sinEndY,
      cosEndX, cosEndY,
      mgLength, sinLength, cosLength,
      weight, weightParallel, weightPerp,
      angleDeg, angleRad,
      sinDirX, sinDirY, cosDirX, cosDirY,
    });
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════
// Internal Drawing Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Draw the rounded rectangle background with border.
 */
function drawBackground(ctx, x, y, size) {
  ctx.save();

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = BG_COLOR;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 8);
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Border
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 8);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw a faint incline reference line through the origin point.
 */
function drawInclineReference(ctx, originX, originY, angleRad, length) {
  ctx.save();
  ctx.strokeStyle = INCLINE_LINE_COLOR;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);

  // Incline goes from lower-left to upper-right
  // Upslope direction: (cos(θ), -sin(θ)) in canvas
  const halfLen = length / 2;
  const dx = Math.cos(angleRad) * halfLen;
  const dy = Math.sin(angleRad) * halfLen;

  ctx.beginPath();
  // Extend downhill from origin
  ctx.moveTo(originX + dx, originY - dy); // uphill
  ctx.lineTo(originX - dx, originY + dy); // downhill
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draw a faint horizontal reference line through the origin.
 */
function drawHorizontalReference(ctx, originX, originY, length) {
  ctx.save();
  ctx.strokeStyle = HORIZONTAL_REF_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);

  ctx.beginPath();
  ctx.moveTo(originX - length * 0.3, originY);
  ctx.lineTo(originX + length, originY);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draw a right-angle symbol (small square) at the corner where
 * the sinθ and cosθ components meet.
 *
 * The corner is at sinEndX, sinEndY. The two edge directions are
 * along the cosθ direction and along the connecting line to mg endpoint.
 */
function drawRightAngle(ctx, cornerX, cornerY, sinDirX, sinDirY, cosDirX, cosDirY) {
  const s = RIGHT_ANGLE_SIZE;

  // Edge 1: along cos direction (from corner toward the cos vector direction)
  const e1x = cosDirX * s;
  const e1y = cosDirY * s;

  // Edge 2: opposite of sin direction (from corner back toward mg endpoint)
  // The connecting line from sinEnd to mgEnd goes in the (cosDir) direction
  // Actually, the right angle is between the parallel and perpendicular components
  // Edge 2 direction: from sinθ end toward mgEnd = cosDir direction effectively
  // Let me use the actual perpendicular: the mg vector direction = (0, 1) in canvas
  const e2x = 0;
  const e2y = s;

  ctx.save();
  ctx.strokeStyle = RIGHT_ANGLE_COLOR;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(cornerX + e1x, cornerY + e1y);
  ctx.lineTo(cornerX + e1x + e2x, cornerY + e1y + e2y);
  ctx.lineTo(cornerX + e2x, cornerY + e2y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw the angle θ arc between the mg vector and the mg cosθ vector.
 * The angle is measured at the origin between the two vectors.
 */
function drawAngle(ctx, originX, originY, angleDeg, angleRad, mgLength) {
  const arcRadius = Math.min(25, mgLength * 0.3);

  ctx.save();
  ctx.strokeStyle = ANGLE_COLOR;
  ctx.lineWidth = 1.5;

  // mg direction: straight down → angle = π/2 in canvas (pointing down)
  // mg cosθ direction: into surface = (sin(θ), cos(θ))
  //   angle of this vector = atan2(cos(θ), sin(θ)) = π/2 - θ
  // So the arc goes from the cosθ direction angle to the mg direction angle (π/2)

  // In canvas coordinates:
  // mg vector angle from positive x-axis: π/2 (pointing down)
  // cosθ vector angle from positive x-axis: atan2(cosθ_dirY, cosθ_dirX) = atan2(cos(θ), sin(θ))
  const mgAngle = Math.PI / 2;
  const cosAngle = Math.atan2(Math.cos(angleRad), Math.sin(angleRad));

  // Draw arc from cosθ direction to mg direction
  // Determine which direction to sweep
  const startAngle = Math.min(cosAngle, mgAngle);
  const endAngle = Math.max(cosAngle, mgAngle);

  ctx.beginPath();
  ctx.arc(originX, originY, arcRadius, startAngle, endAngle);
  ctx.stroke();

  // Angle label
  const labelAngle = (startAngle + endAngle) / 2;
  const labelR = arcRadius + 12;
  const labelX = originX + labelR * Math.cos(labelAngle);
  const labelY = originY + labelR * Math.sin(labelAngle);

  ctx.font = ANGLE_FONT;
  ctx.fillStyle = ANGLE_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`θ`, labelX, labelY);

  ctx.restore();
}

/**
 * Draw labels for each vector in the decomposition diagram.
 * Each label shows the formula and numeric value.
 */
function drawDecompLabels(ctx, params) {
  const {
    originX, originY,
    mgEndX, mgEndY,
    sinEndX, sinEndY,
    cosEndX, cosEndY,
    weight, weightParallel, weightPerp,
    angleDeg,
    sinDirX, sinDirY, cosDirX, cosDirY,
  } = params;

  ctx.save();

  // ── mg label (to the right of the mg arrow midpoint) ────────
  const mgMidX = (originX + mgEndX) / 2;
  const mgMidY = (originY + mgEndY) / 2;
  drawVectorLabel(ctx, {
    x: mgMidX + 10,
    y: mgMidY,
    formula: 'mg',
    value: `${weight.toFixed(1)} N`,
    color: WEIGHT_COLOR,
    align: 'left',
  });

  // ── mg sinθ label (offset perpendicular to the sinθ arrow) ──
  if (angleDeg > 1 && weightParallel > 0.01) {
    const sinMidX = (originX + sinEndX) / 2;
    const sinMidY = (originY + sinEndY) / 2;
    // Offset perpendicular to sin direction (away from the triangle interior)
    const perpX = sinDirY;   // rotate 90° CW
    const perpY = -sinDirX;
    drawVectorLabel(ctx, {
      x: sinMidX + perpX * 16,
      y: sinMidY + perpY * 16,
      formula: 'mg sinθ',
      value: `${weightParallel.toFixed(1)} N`,
      color: PARALLEL_COLOR,
      align: 'center',
    });
  }

  // ── mg cosθ label (offset perpendicular to the cosθ arrow) ──
  if (angleDeg < 89 && weightPerp > 0.01) {
    const cosMidX = (originX + cosEndX) / 2;
    const cosMidY = (originY + cosEndY) / 2;
    // Offset perpendicular to cos direction (away from triangle interior)
    const perpX = -cosDirY;
    const perpY = cosDirX;
    drawVectorLabel(ctx, {
      x: cosMidX + perpX * 16,
      y: cosMidY + perpY * 16,
      formula: 'mg cosθ',
      value: `${weightPerp.toFixed(1)} N`,
      color: PERP_COLOR,
      align: 'center',
    });
  }

  ctx.restore();
}

/**
 * Draw a two-line vector label (formula on top, value below) with a
 * semi-transparent background pill.
 */
function drawVectorLabel(ctx, opts) {
  const { x, y, formula, value, color, align = 'center' } = opts;

  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  // Measure text for background
  ctx.font = LABEL_FONT;
  const formulaMetrics = ctx.measureText(formula);
  ctx.font = VALUE_FONT;
  const valueMetrics = ctx.measureText(value);

  const maxWidth = Math.max(formulaMetrics.width, valueMetrics.width);
  const totalHeight = 22;
  const padX = 4;
  const padY = 2;

  // Calculate background position based on alignment
  let bgX;
  if (align === 'left') {
    bgX = x - padX;
  } else if (align === 'right') {
    bgX = x - maxWidth - padX;
  } else {
    bgX = x - maxWidth / 2 - padX;
  }

  // Background pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.beginPath();
  ctx.roundRect(
    bgX,
    y - totalHeight / 2 - padY,
    maxWidth + padX * 2,
    totalHeight + padY * 2,
    3
  );
  ctx.fill();

  // Formula text (bold, colored)
  ctx.font = LABEL_FONT;
  ctx.fillStyle = color;
  ctx.fillText(formula, x, y - 5);

  // Value text (normal, slightly muted)
  ctx.font = VALUE_FONT;
  ctx.globalAlpha = 0.8;
  ctx.fillText(value, x, y + 7);

  ctx.restore();
}