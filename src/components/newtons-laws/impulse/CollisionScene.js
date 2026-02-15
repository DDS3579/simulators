/**
 * @module CollisionScene
 *
 * @description
 * Pure canvas drawing function for the Impulse-Momentum Theorem simulator.
 * Draws the complete collision scene: ground surface with type-specific
 * appearance, falling ball with shadow, ball compression during collision,
 * rebound trajectory, height markers, velocity arrow, and impact flash.
 *
 * This is NOT a React component. It exports a single function called
 * inside the `draw` callback passed to PhysicsCanvas.
 *
 * @purpose
 * Separates the visual rendering from the simulation logic in
 * ImpulseMomentum.jsx, keeping the page component focused on state
 * management and physics calculations.
 *
 * @dependents
 * - ImpulseMomentum.jsx (calls drawCollisionScene in PhysicsCanvas draw callback)
 *
 * @example
 * ```javascript
 * import { drawCollisionScene } from './CollisionScene';
 *
 * const draw = (ctx, helpers) => {
 *   drawCollisionScene(ctx, helpers, {
 *     phase: 'falling',
 *     ballX: 3,
 *     ballY: 3.2,
 *     ballRadius: 0.3,
 *     dropHeight: 5,
 *     velocity: -4.5,
 *     impactSpeed: 9.9,
 *     reboundSpeed: 4.95,
 *     bounceHeight: 1.25,
 *     surfaceType: 'wood',
 *     collisionProgress: 0,
 *     showHeightMarkers: true,
 *     showVelocityArrow: true,
 *   });
 * };
 * ```
 */

import { drawArrow } from '../shared/vectorArrow';

// ─── Color Constants ──────────────────────────────────────────────
const BALL_PRIMARY = '#6366f1';
const BALL_SECONDARY = '#4f46e5';
const BALL_SHADOW = 'rgba(99, 102, 241, 0.25)';
const HEIGHT_MARKER_COLOR = '#94a3b8';
const DROP_HEIGHT_COLOR = '#6366f1';
const BOUNCE_HEIGHT_COLOR = '#10b981';
const VELOCITY_DOWN_COLOR = '#ef4444';
const VELOCITY_UP_COLOR = '#10b981';
const FLASH_COLOR = 'rgba(255, 255, 255, 0.9)';
const TRAIL_COLOR = 'rgba(99, 102, 241, 0.12)';
const SURFACE_LABEL_COLOR = '#64748b';

// ─── Surface Colors ──────────────────────────────────────────────
const SURFACE_STYLES = {
  concrete: {
    fill: '#64748b',
    stroke: '#475569',
    label: 'Concrete',
    topColor: '#94a3b8',
  },
  wood: {
    fill: '#a3805e',
    stroke: '#8b6b4a',
    label: 'Wood',
    topColor: '#c4a882',
  },
  foam: {
    fill: '#bef264',
    stroke: '#a3e635',
    label: 'Foam Pad',
    topColor: '#d9f99d',
  },
  trampoline: {
    fill: '#60a5fa',
    stroke: '#3b82f6',
    label: 'Trampoline',
    topColor: '#93c5fd',
  },
  custom: {
    fill: '#a78bfa',
    stroke: '#8b5cf6',
    label: 'Custom',
    topColor: '#c4b5fd',
  },
};

// ─── Font Constants ───────────────────────────────────────────────
const LABEL_FONT = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const SMALL_FONT = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const SURFACE_FONT = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

// ─── Layout Constants ─────────────────────────────────────────────
const SURFACE_DEPTH = 0.4; // world units below y=0
const VELOCITY_SCALE = 0.06; // m/s → world units for arrow length
const MIN_ARROW_LEN = 0.3;
const MAX_ARROW_LEN = 3.0;

/**
 * Draw the complete impulse-momentum collision scene.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context (already DPI-scaled by PhysicsCanvas)
 * @param {Object} helpers - Coordinate helpers from PhysicsCanvas
 * @param {Function} helpers.toCanvasX - World x → canvas pixel x
 * @param {Function} helpers.toCanvasY - World y → canvas pixel y
 * @param {number} helpers.scale - Pixels per world-unit (meter)
 * @param {number} helpers.width - Canvas CSS pixel width
 * @param {number} helpers.height - Canvas CSS pixel height
 * @param {Object} state - Current simulation state
 * @param {string} state.phase - 'idle' | 'falling' | 'colliding' | 'rebounding' | 'done'
 * @param {number} state.ballX - Ball horizontal center in world coordinates
 * @param {number} state.ballY - Ball vertical center in world coordinates (0 = ground)
 * @param {number} state.ballRadius - Ball radius in meters
 * @param {number} state.dropHeight - Initial drop height in meters
 * @param {number} state.velocity - Current velocity (signed: negative = downward)
 * @param {number} state.impactSpeed - Speed at impact (positive, for display)
 * @param {number} state.reboundSpeed - Speed after bounce (positive, for display)
 * @param {number} state.bounceHeight - Maximum rebound height in meters
 * @param {string} state.surfaceType - 'concrete' | 'wood' | 'foam' | 'trampoline' | 'custom'
 * @param {number} state.collisionProgress - 0 to 1 during collision phase
 * @param {boolean} state.showHeightMarkers - Show drop height and bounce height labels
 * @param {boolean} state.showVelocityArrow - Show velocity arrow on the ball
 */
export function drawCollisionScene(ctx, helpers, state) {
  const {
    phase = 'idle',
    ballX = 3,
    ballY = 0,
    ballRadius = 0.3,
    dropHeight = 5,
    velocity = 0,
    impactSpeed = 0,
    reboundSpeed = 0,
    bounceHeight = 0,
    surfaceType = 'wood',
    collisionProgress = 0,
    showHeightMarkers = true,
    showVelocityArrow = true,
  } = state;

  const { toCanvasX, toCanvasY, scale } = helpers;

  // ─── Draw surface ──────────────────────────────────────────
  drawSurface(ctx, helpers, surfaceType, collisionProgress, phase);

  // ─── Draw height markers ───────────────────────────────────
  if (showHeightMarkers) {
    drawHeightMarkers(ctx, helpers, {
      ballX,
      dropHeight,
      bounceHeight,
      phase,
    });
  }

  // ─── Draw ghost ball at drop height (idle phase) ───────────
  if (phase === 'idle') {
    drawGhostBall(ctx, helpers, ballX, dropHeight, ballRadius);
  }

  // ─── Draw trail ────────────────────────────────────────────
  if (phase === 'falling' || phase === 'rebounding') {
    drawTrail(ctx, helpers, ballX, ballY, dropHeight, bounceHeight, phase);
  }

  // ─── Draw ground shadow ────────────────────────────────────
  drawGroundShadow(ctx, helpers, ballX, ballY, ballRadius, dropHeight);

  // ─── Draw the ball ─────────────────────────────────────────
  drawBall(ctx, helpers, {
    x: ballX,
    y: ballY,
    radius: ballRadius,
    phase,
    collisionProgress,
  });

  // ─── Draw impact flash ────────────────────────────────────
  if (phase === 'colliding') {
    drawImpactFlash(ctx, helpers, ballX, collisionProgress);
  }

  // ─── Draw velocity arrow ──────────────────────────────────
  if (showVelocityArrow && Math.abs(velocity) > 0.1 && phase !== 'colliding' && phase !== 'done') {
    drawVelocityArrow(ctx, helpers, {
      x: ballX,
      y: ballY,
      velocity,
      radius: ballRadius,
    });
  }

  // ─── Draw speed labels at key points ──────────────────────
  drawSpeedLabels(ctx, helpers, {
    phase,
    ballX,
    ballY,
    ballRadius,
    impactSpeed,
    reboundSpeed,
    dropHeight,
    bounceHeight,
  });
}

// ═══════════════════════════════════════════════════════════════════
// INTERNAL DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Draw the surface at y=0 with type-specific appearance.
 */
function drawSurface(ctx, helpers, surfaceType, collisionProgress, phase) {
  const { toCanvasX, toCanvasY, scale, width } = helpers;
  const style = SURFACE_STYLES[surfaceType] || SURFACE_STYLES.custom;

  const groundY = toCanvasY(0);
  const surfaceBottom = toCanvasY(-SURFACE_DEPTH);
  const leftX = toCanvasX(-1);
  const rightX = toCanvasX(7);

  ctx.save();

  // ── Main surface body ───────────────────────────────────
  ctx.fillStyle = style.fill;
  ctx.fillRect(leftX, groundY, rightX - leftX, surfaceBottom - groundY);

  // ── Top surface highlight ───────────────────────────────
  ctx.fillStyle = style.topColor;
  ctx.fillRect(leftX, groundY, rightX - leftX, 3);

  // ── Surface border ──────────────────────────────────────
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftX, groundY);
  ctx.lineTo(rightX, groundY);
  ctx.stroke();

  // ── Surface type-specific details ───────────────────────
  if (surfaceType === 'concrete') {
    // Speckle texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    for (let i = 0; i < 30; i++) {
      const sx = leftX + Math.random() * (rightX - leftX);
      const sy = groundY + 4 + Math.random() * (surfaceBottom - groundY - 8);
      ctx.fillRect(sx, sy, 2, 2);
    }
  } else if (surfaceType === 'wood') {
    // Wood grain lines
    ctx.strokeStyle = 'rgba(139, 107, 74, 0.3)';
    ctx.lineWidth = 0.5;
    const grainSpacing = 6;
    for (let gy = groundY + 5; gy < surfaceBottom - 2; gy += grainSpacing) {
      ctx.beginPath();
      ctx.moveTo(leftX, gy);
      // Wavy grain
      for (let gx = leftX; gx < rightX; gx += 20) {
        ctx.lineTo(gx + 10, gy + (Math.random() - 0.5) * 2);
        ctx.lineTo(gx + 20, gy);
      }
      ctx.stroke();
    }
  } else if (surfaceType === 'foam') {
    // Dot pattern for foam texture
    ctx.fillStyle = 'rgba(163, 230, 53, 0.3)';
    for (let i = 0; i < 40; i++) {
      const fx = leftX + Math.random() * (rightX - leftX);
      const fy = groundY + 3 + Math.random() * (surfaceBottom - groundY - 6);
      ctx.beginPath();
      ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (surfaceType === 'trampoline') {
    drawTrampolineSurface(ctx, helpers, collisionProgress, phase);
  }

  // ── Surface label ───────────────────────────────────────
  ctx.font = SURFACE_FONT;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelY = (groundY + surfaceBottom) / 2;
  ctx.fillText(style.label, (leftX + rightX) / 2, labelY);

  ctx.restore();
}

/**
 * Draw trampoline with springs and deformable fabric surface.
 */
function drawTrampolineSurface(ctx, helpers, collisionProgress, phase) {
  const { toCanvasX, toCanvasY } = helpers;

  const groundY = toCanvasY(0);
  const bottomY = toCanvasY(-SURFACE_DEPTH);
  const leftX = toCanvasX(1);
  const rightX = toCanvasX(5);
  const centerX = (leftX + rightX) / 2;

  // Deformation during collision
  const deformAmount = phase === 'colliding'
    ? Math.sin(Math.PI * collisionProgress) * 12
    : 0;

  // ── Fabric surface (curved when deformed) ───────────────
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(leftX, groundY);
  ctx.quadraticCurveTo(centerX, groundY + deformAmount, rightX, groundY);
  ctx.stroke();

  // ── Spring legs ─────────────────────────────────────────
  const numSprings = 5;
  const springWidth = (rightX - leftX) / (numSprings + 1);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;

  for (let i = 1; i <= numSprings; i++) {
    const sx = leftX + i * springWidth;
    const springTop = groundY + (deformAmount * (1 - Math.abs(sx - centerX) / (centerX - leftX)));
    const springBottom = bottomY - 2;
    const springHeight = springBottom - springTop;
    const coils = 4;
    const coilHeight = springHeight / coils;
    const coilWidth = 4;

    ctx.beginPath();
    ctx.moveTo(sx, springTop);
    for (let c = 0; c < coils; c++) {
      const cy = springTop + c * coilHeight;
      ctx.lineTo(sx + coilWidth, cy + coilHeight * 0.25);
      ctx.lineTo(sx - coilWidth, cy + coilHeight * 0.75);
      ctx.lineTo(sx, cy + coilHeight);
    }
    ctx.stroke();
  }

  // ── Frame legs ──────────────────────────────────────────
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(leftX, groundY);
  ctx.lineTo(leftX, bottomY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightX, groundY);
  ctx.lineTo(rightX, bottomY);
  ctx.stroke();
}

/**
 * Draw height markers for drop height and bounce height.
 */
function drawHeightMarkers(ctx, helpers, opts) {
  const { ballX, dropHeight, bounceHeight, phase } = opts;
  const { toCanvasX, toCanvasY } = helpers;

  const markerX = toCanvasX(ballX + 1.2);
  const groundY = toCanvasY(0);

  ctx.save();

  // ── Drop height marker ──────────────────────────────────
  const dropTopY = toCanvasY(dropHeight);

  ctx.strokeStyle = DROP_HEIGHT_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);

  ctx.beginPath();
  ctx.moveTo(markerX, groundY);
  ctx.lineTo(markerX, dropTopY);
  ctx.stroke();

  ctx.setLineDash([]);

  // Arrow tips
  drawSmallArrow(ctx, markerX, groundY, 'down', DROP_HEIGHT_COLOR);
  drawSmallArrow(ctx, markerX, dropTopY, 'up', DROP_HEIGHT_COLOR);

  // Label
  const dropLabelY = (groundY + dropTopY) / 2;
  drawPillLabel(ctx, markerX + 8, dropLabelY, `h = ${dropHeight.toFixed(1)} m`, DROP_HEIGHT_COLOR);

  // ── Bounce height marker (after collision) ──────────────
  if (bounceHeight > 0.01 && (phase === 'rebounding' || phase === 'done')) {
    const bounceMarkerX = toCanvasX(ballX - 1.2);
    const bounceTopY = toCanvasY(bounceHeight);

    ctx.strokeStyle = BOUNCE_HEIGHT_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(bounceMarkerX, groundY);
    ctx.lineTo(bounceMarkerX, bounceTopY);
    ctx.stroke();

    ctx.setLineDash([]);

    drawSmallArrow(ctx, bounceMarkerX, groundY, 'down', BOUNCE_HEIGHT_COLOR);
    drawSmallArrow(ctx, bounceMarkerX, bounceTopY, 'up', BOUNCE_HEIGHT_COLOR);

    drawPillLabel(ctx, bounceMarkerX - 8, (groundY + bounceTopY) / 2,
      `h' = ${bounceHeight.toFixed(2)} m`, BOUNCE_HEIGHT_COLOR, 'right');
  }

  ctx.restore();
}

/**
 * Draw a small arrowhead for height markers.
 */
function drawSmallArrow(ctx, x, y, direction, color) {
  const size = 4;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();

  if (direction === 'up') {
    ctx.moveTo(x, y);
    ctx.lineTo(x - size, y + size * 1.5);
    ctx.lineTo(x + size, y + size * 1.5);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x - size, y - size * 1.5);
    ctx.lineTo(x + size, y - size * 1.5);
  }

  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a ghost ball (faded) at the drop height position for idle phase.
 */
function drawGhostBall(ctx, helpers, x, y, radius) {
  const { toCanvasX, toCanvasY, scale } = helpers;

  const cx = toCanvasX(x);
  const cy = toCanvasY(y);
  const r = radius * scale;

  ctx.save();
  ctx.globalAlpha = 0.3;

  const gradient = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  gradient.addColorStop(0, '#818cf8');
  gradient.addColorStop(1, BALL_PRIMARY);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Dashed outline
  ctx.strokeStyle = BALL_PRIMARY;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

/**
 * Draw a faint trail showing the ball's vertical path.
 */
function drawTrail(ctx, helpers, ballX, ballY, dropHeight, bounceHeight, phase) {
  const { toCanvasX, toCanvasY } = helpers;

  const cx = toCanvasX(ballX);
  const groundY = toCanvasY(0);
  const topY = toCanvasY(phase === 'falling' ? dropHeight : bounceHeight);
  const currentY = toCanvasY(Math.max(0, ballY));

  ctx.save();

  // Gradient trail from start to current position
  const gradient = ctx.createLinearGradient(0, topY, 0, currentY);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.03)');
  gradient.addColorStop(1, TRAIL_COLOR);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx, currentY);
  ctx.stroke();

  // Dots along trail
  const numDots = 8;
  const trailLen = currentY - topY;
  if (trailLen > 10) {
    for (let i = 1; i < numDots; i++) {
      const dotY = topY + (trailLen * i) / numDots;
      const alpha = 0.05 + 0.1 * (i / numDots);
      ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`;
      ctx.beginPath();
      ctx.arc(cx, dotY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Draw a shadow on the ground that gets darker as the ball approaches.
 */
function drawGroundShadow(ctx, helpers, ballX, ballY, ballRadius, dropHeight) {
  const { toCanvasX, toCanvasY, scale } = helpers;

  const cx = toCanvasX(ballX);
  const groundY = toCanvasY(0);

  // Shadow size and opacity based on height
  const heightRatio = Math.max(0, 1 - (ballY / Math.max(dropHeight, 1)));
  const shadowRadius = ballRadius * scale * (0.5 + 0.7 * heightRatio);
  const shadowAlpha = 0.05 + 0.15 * heightRatio;

  ctx.save();

  const gradient = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, shadowRadius);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${shadowAlpha})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(cx, groundY, shadowRadius, shadowRadius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw the main ball with optional squash during collision.
 */
function drawBall(ctx, helpers, opts) {
  const { x, y, radius, phase, collisionProgress } = opts;
  const { toCanvasX, toCanvasY, scale } = helpers;

  const cx = toCanvasX(x);
  const cy = toCanvasY(Math.max(radius * 0.2, y));
  const r = radius * scale;

  ctx.save();

  // Squash/stretch during collision
  let scaleX = 1;
  let scaleY = 1;

  if (phase === 'colliding') {
    const squashAmount = Math.sin(Math.PI * collisionProgress);
    scaleY = 1 - 0.4 * squashAmount;
    scaleX = 1 + 0.2 * squashAmount;
  }

  ctx.translate(cx, cy);
  ctx.scale(scaleX, scaleY);

  // Ball shadow
  ctx.shadowColor = BALL_SHADOW;
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Ball gradient (3D sphere effect)
  const gradient = ctx.createRadialGradient(
    -r * 0.3, -r * 0.3, r * 0.1,
    0, 0, r
  );
  gradient.addColorStop(0, '#818cf8');
  gradient.addColorStop(0.5, BALL_PRIMARY);
  gradient.addColorStop(1, BALL_SECONDARY);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Highlight spot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.25, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = BALL_SECONDARY;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw impact flash effect during collision.
 */
function drawImpactFlash(ctx, helpers, ballX, collisionProgress) {
  const { toCanvasX, toCanvasY, scale } = helpers;

  const cx = toCanvasX(ballX);
  const groundY = toCanvasY(0);

  // Flash is brightest at start, fades out
  const flashIntensity = Math.max(0, 1 - collisionProgress * 2);

  if (flashIntensity <= 0) return;

  ctx.save();

  // Central flash
  const flashRadius = scale * 0.5 * flashIntensity;
  const gradient = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, flashRadius);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${0.6 * flashIntensity})`);
  gradient.addColorStop(0.5, `rgba(255, 200, 50, ${0.3 * flashIntensity})`);
  gradient.addColorStop(1, 'rgba(255, 200, 50, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, groundY, flashRadius, 0, Math.PI * 2);
  ctx.fill();

  // Radiating lines
  const numRays = 8;
  ctx.strokeStyle = `rgba(255, 200, 50, ${0.4 * flashIntensity})`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2 - Math.PI / 2;
    const innerR = scale * 0.15;
    const outerR = scale * (0.3 + 0.4 * flashIntensity);

    ctx.beginPath();
    ctx.moveTo(cx + innerR * Math.cos(angle), groundY + innerR * Math.sin(angle));
    ctx.lineTo(cx + outerR * Math.cos(angle), groundY + outerR * Math.sin(angle));
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw velocity arrow from ball center.
 */
function drawVelocityArrow(ctx, helpers, opts) {
  const { x, y, velocity, radius } = opts;
  const { toCanvasX, toCanvasY, scale } = helpers;

  const cx = toCanvasX(x);
  const cy = toCanvasY(y);

  // Scale velocity to arrow length in canvas pixels
  const absVel = Math.abs(velocity);
  const rawLen = absVel * VELOCITY_SCALE * scale;
  const arrowLen = Math.max(MIN_ARROW_LEN * scale, Math.min(rawLen, MAX_ARROW_LEN * scale));

  // Direction: negative velocity = downward (canvas positive y)
  const isDownward = velocity < 0;
  const endY = isDownward ? cy + arrowLen : cy - arrowLen;
  const color = isDownward ? VELOCITY_DOWN_COLOR : VELOCITY_UP_COLOR;

  // Offset start from ball edge
  const startOffset = radius * scale + 4;
  const startY = isDownward ? cy + startOffset : cy - startOffset;

  drawArrow(ctx, {
    fromX: cx,
    fromY: startY,
    toX: cx,
    toY: isDownward ? startY + arrowLen : startY - arrowLen,
    color,
    lineWidth: 2.5,
    headLength: 9,
    label: `v = ${absVel.toFixed(1)} m/s`,
    labelPosition: 'end',
  });
}

/**
 * Draw speed labels at impact and rebound points.
 */
function drawSpeedLabels(ctx, helpers, opts) {
  const {
    phase, ballX, ballY, ballRadius,
    impactSpeed, reboundSpeed, dropHeight, bounceHeight,
  } = opts;
  const { toCanvasX, toCanvasY } = helpers;

  // Impact speed at ground level (shown after collision starts)
  if ((phase === 'colliding' || phase === 'rebounding' || phase === 'done') && impactSpeed > 0.01) {
    const labelX = toCanvasX(ballX - 0.8);
    const labelY = toCanvasY(0.5);
    drawPillLabel(ctx, labelX, labelY,
      `v_impact = ${impactSpeed.toFixed(2)} m/s`, VELOCITY_DOWN_COLOR, 'right');
  }

  // Rebound speed (shown during/after rebound)
  if ((phase === 'rebounding' || phase === 'done') && reboundSpeed > 0.01) {
    const labelX = toCanvasX(ballX + 0.8);
    const labelY = toCanvasY(Math.min(bounceHeight * 0.5, 1.5));
    drawPillLabel(ctx, labelX, labelY,
      `v_rebound = ${reboundSpeed.toFixed(2)} m/s`, VELOCITY_UP_COLOR, 'left');
  }
}

/**
 * Draw a text label with semi-transparent background pill.
 */
function drawPillLabel(ctx, x, y, text, color, align = 'left') {
  ctx.save();
  ctx.font = SMALL_FONT;

  const metrics = ctx.measureText(text);
  const tw = metrics.width;
  const th = 13;
  const pad = 4;

  let bgX;
  if (align === 'right') {
    bgX = x - tw - pad * 2;
  } else if (align === 'center') {
    bgX = x - tw / 2 - pad;
  } else {
    bgX = x;
  }

  // Background pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.beginPath();
  ctx.roundRect(bgX, y - th / 2 - pad, tw + pad * 2, th + pad * 2, 4);
  ctx.fill();

  // Border
  ctx.strokeStyle = `${color}40`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(bgX, y - th / 2 - pad, tw + pad * 2, th + pad * 2, 4);
  ctx.stroke();

  // Text
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bgX + pad, y);

  ctx.restore();
}