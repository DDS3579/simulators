/**
 * @module FreeBodyDiagram
 *
 * @description
 * A React component that renders a Free Body Diagram (FBD) in its own mini-canvas.
 * Shows all forces acting on the block as labeled arrows emanating from a central
 * point. Updates in real-time as forces change during simulation.
 *
 * The FBD is conceptually separate from the main simulation canvas — it's a
 * schematic diagram showing force magnitudes and directions, not the spatial
 * position of the block. Having its own canvas allows it to be positioned
 * anywhere in the layout (sidebar, below main canvas, overlay).
 *
 * Uses a `renderTrigger` prop (incrementing number) to efficiently trigger
 * redraws without deep-comparing the forces array.
 *
 * @purpose
 * The FBD is a critical educational tool. Students need to see all forces
 * acting on an object simultaneously to understand Newton's Second Law.
 * This component provides that view with clean, proportional arrows.
 *
 * @dependents
 * - SecondLawSimulator.jsx (renders alongside the main PhysicsCanvas)
 *
 * @example
 * ```jsx
 * import FreeBodyDiagram from './FreeBodyDiagram';
 *
 * <FreeBodyDiagram
 *   forces={[
 *     { label: 'F', subscript: 'app', magnitude: 20, direction: 0, color: '#6366f1' },
 *     { label: 'mg', magnitude: 49, direction: 270, color: '#ef4444' },
 *     { label: 'N', magnitude: 49, direction: 90, color: '#10b981' },
 *     { label: 'f', magnitude: 9.8, direction: 180, color: '#f59e0b' },
 *   ]}
 *   mode="flat"
 *   showNetForce
 *   netForce={{ magnitude: 10.2, direction: 0, color: '#8b5cf6' }}
 *   renderTrigger={frameCount}
 * />
 * ```
 */

import { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useCanvasSetup } from '../../../hooks/newtons-laws/useCanvasSetup';
import { drawArrow } from '../shared/vectorArrow';

// ─── Color Constants ──────────────────────────────────────────────
const BG_COLOR = '#ffffff';
const BLOCK_FILL = '#e2e8f0';
const BLOCK_STROKE = '#94a3b8';
const TITLE_COLOR = '#64748b';
const ORIGIN_DOT_COLOR = '#cbd5e1';
const INCLINE_REF_COLOR = '#e2e8f0';

// ─── Font Constants ───────────────────────────────────────────────
const TITLE_FONT = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const LABEL_FONT = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const VALUE_FONT = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

// ─── Layout Constants ─────────────────────────────────────────────
const TITLE_HEIGHT = 28;
const BLOCK_SIZE = 28;
const MIN_ARROW_PX = 20;
const MAX_ARROW_PX = 55;
const FORCE_DISPLAY_THRESHOLD = 0.01;

/**
 * FreeBodyDiagram — Renders a mini-canvas showing all forces on the block.
 */
function FreeBodyDiagram({
  forces,
  mode = 'flat',
  inclineAngle = 0,
  showComponents = false,
  showNetForce = false,
  netForce = null,
  renderTrigger = 0,
  className = '',
}) {
  const { canvasRef, containerRef, dimensions, dpr, getCtx } = useCanvasSetup({
    aspectRatio: 1,
    minHeight: 180,
    maxHeight: 280,
  });

  // Store forces and config in refs to avoid stale closures
  const forcesRef = useRef(forces);
  const configRef = useRef({
    mode, inclineAngle, showComponents, showNetForce, netForce,
  });

  // Keep refs in sync
  useEffect(() => {
    forcesRef.current = forces;
  }, [forces]);

  useEffect(() => {
    configRef.current = {
      mode, inclineAngle, showComponents, showNetForce, netForce,
    };
  }, [mode, inclineAngle, showComponents, showNetForce, netForce]);

  // ─── Main render function ─────────────────────────────────
  const renderDiagram = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;

    const { width, height } = dimensions;
    const currentForces = forcesRef.current;
    const config = configRef.current;

    ctx.save();
    ctx.scale(dpr, dpr);

    // ── Clear background ──────────────────────────────────
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    // ── Draw border ───────────────────────────────────────
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, width - 1, height - 1, 12);
    ctx.stroke();

    // ── Draw title ────────────────────────────────────────
    ctx.font = TITLE_FONT;
    ctx.fillStyle = TITLE_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Free Body Diagram', width / 2, 8);

    // ── Available drawing area ────────────────────────────
    const drawAreaTop = TITLE_HEIGHT;
    const drawAreaHeight = height - TITLE_HEIGHT - 10;
    const centerX = width / 2;
    const centerY = drawAreaTop + drawAreaHeight / 2;

    // ── Draw incline reference (if in incline mode) ───────
    if (config.mode === 'incline' && config.inclineAngle > 0) {
      drawInclineReference(ctx, centerX, centerY, config.inclineAngle, width * 0.7);
    }

    // ── Draw the block ────────────────────────────────────
    drawFBDBlock(ctx, centerX, centerY, config.mode, config.inclineAngle);

    // ── Draw origin dot ───────────────────────────────────
    ctx.fillStyle = ORIGIN_DOT_COLOR;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();

    // ── Calculate arrow scale ─────────────────────────────
    // Find maximum magnitude to scale all arrows proportionally
    const visibleForces = (currentForces || []).filter(
      (f) => f.magnitude > FORCE_DISPLAY_THRESHOLD
    );

    let maxMagnitude = 0;
    for (const f of visibleForces) {
      if (f.magnitude > maxMagnitude) maxMagnitude = f.magnitude;
    }
    if (config.showNetForce && config.netForce && config.netForce.magnitude > maxMagnitude) {
      maxMagnitude = config.netForce.magnitude;
    }
    if (maxMagnitude < 0.1) maxMagnitude = 1; // prevent division by zero

    const arrowScale = MAX_ARROW_PX / maxMagnitude;

    // ── Draw each force arrow ─────────────────────────────
    for (const force of visibleForces) {
      drawForceVector(ctx, centerX, centerY, force, arrowScale);
    }

    // ── Draw net force arrow (dashed) ─────────────────────
    if (config.showNetForce && config.netForce && config.netForce.magnitude > FORCE_DISPLAY_THRESHOLD) {
      drawForceVector(ctx, centerX, centerY, {
        label: 'F',
        subscript: 'net',
        magnitude: config.netForce.magnitude,
        direction: config.netForce.direction,
        color: config.netForce.color || '#8b5cf6',
      }, arrowScale, true);
    }

    // ── Draw legend ───────────────────────────────────────
    drawLegend(ctx, width, height, visibleForces, config);

    ctx.restore();
  }, [dimensions, dpr, getCtx]);

  // ─── Trigger re-render on renderTrigger or dimensions change ─
  useEffect(() => {
    renderDiagram();
  }, [renderTrigger, renderDiagram]);

  // ─── JSX ──────────────────────────────────────────────────
  return (
    <div className={`${className}`}>
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Internal Drawing Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Draw the central block in the FBD. In flat mode it's axis-aligned;
 * in incline mode it's rotated to match the incline angle.
 */
function drawFBDBlock(ctx, cx, cy, mode, inclineAngle) {
  const half = BLOCK_SIZE / 2;

  ctx.save();
  ctx.translate(cx, cy);

  if (mode === 'incline' && inclineAngle > 0) {
    const angleRad = (inclineAngle * Math.PI) / 180;
    ctx.rotate(-angleRad);
  }

  // Block shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = BLOCK_FILL;
  ctx.fillRect(-half, -half, BLOCK_SIZE, BLOCK_SIZE);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = BLOCK_STROKE;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-half, -half, BLOCK_SIZE, BLOCK_SIZE);

  // Subtle gradient
  const gradient = ctx.createLinearGradient(-half, -half, -half, half);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.04)');
  ctx.fillStyle = gradient;
  ctx.fillRect(-half + 0.5, -half + 0.5, BLOCK_SIZE - 1, BLOCK_SIZE - 1);

  ctx.restore();
}

/**
 * Draw a faint incline reference line through the block center.
 */
function drawInclineReference(ctx, cx, cy, angleDeg, lineLength) {
  const angleRad = (angleDeg * Math.PI) / 180;
  const halfLen = lineLength / 2;

  ctx.save();
  ctx.strokeStyle = INCLINE_REF_COLOR;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);

  // Incline direction
  const dx = Math.cos(angleRad) * halfLen;
  const dy = Math.sin(angleRad) * halfLen;

  ctx.beginPath();
  ctx.moveTo(cx - dx, cy + dy);   // downhill end
  ctx.lineTo(cx + dx, cy - dy);   // uphill end
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draw a single force vector arrow from the block center.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - Block center x
 * @param {number} cy - Block center y
 * @param {Object} force - Force descriptor
 * @param {number} arrowScale - Pixels per Newton
 * @param {boolean} [isDashed=false] - Whether to render dashed (for net force)
 */
function drawForceVector(ctx, cx, cy, force, arrowScale, isDashed = false) {
  const { label, subscript, magnitude, direction, color } = force;

  if (magnitude < FORCE_DISPLAY_THRESHOLD) return;

  // Calculate arrow length
  const rawLength = magnitude * arrowScale;
  const arrowLength = Math.max(MIN_ARROW_PX, Math.min(rawLength, MAX_ARROW_PX));

  // Convert direction (degrees) to canvas radians
  // 0° = right, 90° = up, 180° = left, 270° = down
  // Canvas: 0 = right, positive = clockwise
  // So canvas angle = -direction in radians (to flip y)
  const canvasAngle = -(direction * Math.PI) / 180;

  const endX = cx + arrowLength * Math.cos(canvasAngle);
  const endY = cy + arrowLength * Math.sin(canvasAngle);

  // Offset start point to edge of block (not center) for cleaner look
  const startOffset = BLOCK_SIZE / 2 + 2;
  const startX = cx + startOffset * Math.cos(canvasAngle);
  const startY = cy + startOffset * Math.sin(canvasAngle);

  drawArrow(ctx, {
    fromX: startX,
    fromY: startY,
    toX: endX,
    toY: endY,
    color,
    lineWidth: isDashed ? 2 : 2.5,
    headLength: 8,
    dashed: isDashed,
    opacity: isDashed ? 0.8 : 1,
  });

  // ── Draw force label near arrowhead ─────────────────────
  drawForceLabel(ctx, endX, endY, canvasAngle, {
    label,
    subscript,
    magnitude,
    color,
  });
}

/**
 * Draw a two-line force label near the arrowhead.
 * Line 1: Force symbol with optional subscript (e.g., "F_app")
 * Line 2: Magnitude with unit (e.g., "20.0 N")
 */
function drawForceLabel(ctx, arrowEndX, arrowEndY, canvasAngle, opts) {
  const { label, subscript, magnitude, color } = opts;

  // Position label beyond the arrowhead, offset perpendicular to avoid overlap
  const beyondDist = 8;
  const perpDist = 4;

  // Beyond arrowhead
  let labelX = arrowEndX + beyondDist * Math.cos(canvasAngle);
  let labelY = arrowEndY + beyondDist * Math.sin(canvasAngle);

  // Perpendicular offset
  const perpAngle = canvasAngle - Math.PI / 2;
  labelX += perpDist * Math.cos(perpAngle);
  labelY += perpDist * Math.sin(perpAngle);

  ctx.save();

  // Build display string
  const nameStr = subscript ? `${label}_${subscript}` : label;
  const valueStr = `${magnitude.toFixed(1)} N`;

  // Measure for background
  ctx.font = LABEL_FONT;
  const nameWidth = ctx.measureText(nameStr).width;
  ctx.font = VALUE_FONT;
  const valueWidth = ctx.measureText(valueStr).width;
  const maxWidth = Math.max(nameWidth, valueWidth);

  const totalHeight = 22;
  const padX = 4;
  const padY = 2;

  // Determine text alignment based on arrow direction
  // If arrow points right, align left. If left, align right. Otherwise center.
  const normalizedAngle = ((canvasAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let textAlign = 'center';
  if (normalizedAngle < Math.PI / 4 || normalizedAngle > 7 * Math.PI / 4) {
    textAlign = 'left';
  } else if (normalizedAngle > 3 * Math.PI / 4 && normalizedAngle < 5 * Math.PI / 4) {
    textAlign = 'right';
  }

  ctx.textAlign = textAlign;
  ctx.textBaseline = 'middle';

  // Background pill
  let bgX;
  if (textAlign === 'left') bgX = labelX - padX;
  else if (textAlign === 'right') bgX = labelX - maxWidth - padX;
  else bgX = labelX - maxWidth / 2 - padX;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.roundRect(bgX, labelY - totalHeight / 2 - padY, maxWidth + padX * 2, totalHeight + padY * 2, 3);
  ctx.fill();

  // Force name (bold, colored)
  ctx.font = LABEL_FONT;
  ctx.fillStyle = color;
  ctx.fillText(nameStr, labelX, labelY - 5);

  // Value (normal, slightly muted)
  ctx.font = VALUE_FONT;
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = color;
  ctx.fillText(valueStr, labelX, labelY + 7);

  ctx.restore();
}

/**
 * Draw a compact legend at the bottom of the FBD showing force colors.
 */
function drawLegend(ctx, width, height, forces, config) {
  if (!forces || forces.length === 0) return;

  const legendY = height - 12;
  const dotSize = 4;
  const gap = 6;

  // Build legend items
  const items = forces.map((f) => ({
    label: f.subscript ? `${f.label}_${f.subscript}` : f.label,
    color: f.color,
  }));

  if (config.showNetForce && config.netForce && config.netForce.magnitude > FORCE_DISPLAY_THRESHOLD) {
    items.push({ label: 'F_net', color: config.netForce.color || '#8b5cf6' });
  }

  // Measure total width
  ctx.font = '8px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  let totalWidth = 0;
  const itemWidths = items.map((item) => {
    const w = ctx.measureText(item.label).width + dotSize * 2 + 4;
    totalWidth += w + gap;
    return w;
  });
  totalWidth -= gap; // remove last gap

  // Only draw if it fits
  if (totalWidth > width - 20) return;

  let currentX = (width - totalWidth) / 2;

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Color dot
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(currentX + dotSize, legendY, dotSize, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
    ctx.fillText(item.label, currentX + dotSize * 2 + 4, legendY);

    currentX += itemWidths[i] + gap;
  }

  ctx.restore();
}

// ─── PropTypes ────────────────────────────────────────────────────

FreeBodyDiagram.propTypes = {
  /** Array of force descriptors to draw as arrows */
  forces: PropTypes.arrayOf(
    PropTypes.shape({
      /** Force symbol, e.g., "F", "mg", "N", "f" */
      label: PropTypes.string.isRequired,
      /** Force magnitude in Newtons (always positive for display) */
      magnitude: PropTypes.number.isRequired,
      /** Direction in degrees: 0=right, 90=up, 180=left, 270=down */
      direction: PropTypes.number.isRequired,
      /** CSS color string for the arrow */
      color: PropTypes.string.isRequired,
      /** Optional subscript, e.g., "app" for F_app */
      subscript: PropTypes.string,
    })
  ).isRequired,

  /** Surface mode: 'flat' or 'incline' */
  mode: PropTypes.oneOf(['flat', 'incline']),

  /** Incline angle in degrees (only used when mode='incline') */
  inclineAngle: PropTypes.number,

  /** Show mg sinθ and mg cosθ decomposition (incline mode) */
  showComponents: PropTypes.bool,

  /** Whether to show the net force arrow (dashed) */
  showNetForce: PropTypes.bool,

  /** Net force descriptor */
  netForce: PropTypes.shape({
    /** Net force magnitude in Newtons */
    magnitude: PropTypes.number,
    /** Direction in degrees */
    direction: PropTypes.number,
    /** Arrow color */
    color: PropTypes.string,
  }),

  /** Incrementing number that triggers re-render. Parent increments this
   *  each animation frame to cause the FBD to redraw with latest forces. */
  renderTrigger: PropTypes.number,

  /** Additional CSS classes for the wrapper div */
  className: PropTypes.string,
};

FreeBodyDiagram.defaultProps = {
  mode: 'flat',
  inclineAngle: 0,
  showComponents: false,
  showNetForce: false,
  netForce: null,
  renderTrigger: 0,
  className: '',
};

export default FreeBodyDiagram;