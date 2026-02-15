/**
 * @fileoverview Pure canvas drawing function for the 1D collision track.
 *
 * Renders two block objects on a frictionless track with velocity arrows,
 * mass labels, momentum arrows, and collision/explosion visual effects.
 * This is NOT a React component — it is a pure function called from within
 * a PhysicsCanvas draw callback.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context.
 * @param {Object} helpers - PhysicsCanvas helpers with coordinate transforms.
 * @param {Object} state - Current simulation state (positions, velocities, phase, etc.).
 *
 * @example
 * const drawScene = (ctx, helpers) => {
 *   drawCollisionTrack(ctx, helpers, {
 *     phase: 'pre',
 *     x1: -5, w1: 1.5, m1: 3, u1: 5, v1: -1.8, currentV1: 5,
 *     x2: 5, w2: 1.2, m2: 2, u2: -3, v2: 6.2, currentV2: -3,
 *     collisionProgress: 0, collisionX: 0, collisionType: 'elastic',
 *     merged: false, showVelocityArrows: true, showLabels: true, showMomentumArrows: false,
 *   });
 * };
 *
 * @module CollisionTrack
 */

import { drawArrow } from '../shared/vectorArrow';

const OBJ1_COLOR = '#6366f1';
const OBJ1_FILL = 'rgba(99, 102, 241, 0.15)';
const OBJ1_STROKE = '#6366f1';
const OBJ2_COLOR = '#f59e0b';
const OBJ2_FILL = 'rgba(245, 158, 11, 0.15)';
const OBJ2_STROKE = '#f59e0b';
const TRACK_COLOR = '#94a3b8';
const COLLISION_FLASH = '#fbbf24';
const PURPLE = '#8b5cf6';
const MERGED_FILL_1 = 'rgba(99, 102, 241, 0.2)';
const MERGED_FILL_2 = 'rgba(245, 158, 11, 0.2)';

/**
 * Draws a single block object on the track.
 */
function drawBlock(ctx, helpers, x, y, w, h, fillColor, strokeColor, label, squashFactor) {
  const squashedW = w * (1 + 0.15 * squashFactor);
  const squashedH = h * (1 - 0.15 * squashFactor);

  const leftX = helpers.toCanvasX(x - squashedW / 2);
  const rightX = helpers.toCanvasX(x + squashedW / 2);
  const topY = helpers.toCanvasY(y + squashedH);
  const bottomY = helpers.toCanvasY(y);

  const canvasW = rightX - leftX;
  const canvasH = bottomY - topY;

  ctx.fillStyle = fillColor;
  ctx.fillRect(leftX, topY, canvasW, canvasH);

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(leftX, topY, canvasW, canvasH);

  if (label) {
    const fontSize = Math.max(10, Math.min(14, canvasW * 0.15));
    ctx.font = `bold ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = strokeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, leftX + canvasW / 2, topY + canvasH / 2);
  }
}

/**
 * Draws a merged block for perfectly inelastic post-collision.
 */
function drawMergedBlock(ctx, helpers, x, w1, w2, h, m1, m2) {
  const totalW = w1 + w2;
  const leftX = helpers.toCanvasX(x - totalW / 2);
  const rightX = helpers.toCanvasX(x + totalW / 2);
  const midX = helpers.toCanvasX(x - totalW / 2 + w1);
  const topY = helpers.toCanvasY(h);
  const bottomY = helpers.toCanvasY(0);

  const canvasH = bottomY - topY;

  // Left half (object 1 color)
  ctx.fillStyle = MERGED_FILL_1;
  ctx.fillRect(leftX, topY, midX - leftX, canvasH);

  // Right half (object 2 color)
  ctx.fillStyle = MERGED_FILL_2;
  ctx.fillRect(midX, topY, rightX - midX, canvasH);

  // Divider line
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(midX, topY);
  ctx.lineTo(midX, bottomY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Outer stroke
  ctx.strokeStyle = PURPLE;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(leftX, topY, rightX - leftX, canvasH);

  // Label
  const totalMass = m1 + m2;
  const fontSize = Math.max(10, Math.min(14, (rightX - leftX) * 0.12));
  ctx.font = `bold ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = PURPLE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${totalMass.toFixed(1)} kg`, (leftX + rightX) / 2, topY + canvasH / 2);
}

/**
 * Draws velocity arrow for an object.
 */
function drawVelocityArrow(ctx, helpers, x, blockTopY, velocity, color, label) {
  if (Math.abs(velocity) < 0.01) return;

  const arrowScale = 0.3;
  const arrowLength = Math.max(0.3, Math.abs(velocity) * arrowScale);
  const direction = velocity > 0 ? 1 : -1;

  const fromWorldX = x;
  const toWorldX = x + direction * arrowLength;
  const arrowWorldY = blockTopY + 0.4;

  const fromCX = helpers.toCanvasX(fromWorldX);
  const fromCY = helpers.toCanvasY(arrowWorldY);
  const toCX = helpers.toCanvasX(toWorldX);
  const toCY = helpers.toCanvasY(arrowWorldY);

  drawArrow(ctx, {
    fromX: fromCX,
    fromY: fromCY,
    toX: toCX,
    toY: toCY,
    color,
    lineWidth: 2.5,
    headLength: 8,
    label: label || `${velocity.toFixed(1)} m/s`,
    labelPosition: 'top',
  });
}

/**
 * Draws momentum arrow below the track.
 */
function drawMomentumArrow(ctx, helpers, x, mass, velocity, color) {
  const momentum = mass * velocity;
  if (Math.abs(momentum) < 0.01) return;

  const arrowScale = 0.04;
  const arrowLength = Math.max(0.3, Math.abs(momentum) * arrowScale);
  const direction = momentum > 0 ? 1 : -1;

  const fromCX = helpers.toCanvasX(x);
  const fromCY = helpers.toCanvasY(-1);
  const toCX = helpers.toCanvasX(x + direction * arrowLength);
  const toCY = helpers.toCanvasY(-1);

  drawArrow(ctx, {
    fromX: fromCX,
    fromY: fromCY,
    toX: toCX,
    toY: toCY,
    color,
    lineWidth: 2,
    headLength: 7,
    label: `p = ${momentum.toFixed(1)}`,
    labelPosition: 'bottom',
  });
}

/**
 * Draws collision flash effect.
 */
function drawCollisionFlash(ctx, helpers, collisionX, progress, isExplosion) {
  const intensity = Math.sin(progress * Math.PI);
  if (intensity < 0.01) return;

  const cx = helpers.toCanvasX(collisionX);
  const cy = helpers.toCanvasY(0.8);
  const maxRadius = helpers.scale * (isExplosion ? 1.2 : 0.6);
  const radius = maxRadius * intensity;

  // Radial gradient
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  if (isExplosion) {
    gradient.addColorStop(0, `rgba(249, 115, 22, ${0.8 * intensity})`);
    gradient.addColorStop(0.4, `rgba(239, 68, 68, ${0.5 * intensity})`);
    gradient.addColorStop(1, `rgba(239, 68, 68, 0)`);
  } else {
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 * intensity})`);
    gradient.addColorStop(0.3, `rgba(251, 191, 36, ${0.6 * intensity})`);
    gradient.addColorStop(1, `rgba(251, 191, 36, 0)`);
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Radiating lines
  const numLines = isExplosion ? 10 : 6;
  ctx.strokeStyle = isExplosion
    ? `rgba(249, 115, 22, ${0.7 * intensity})`
    : `rgba(251, 191, 36, ${0.7 * intensity})`;
  ctx.lineWidth = 1.5;

  for (let i = 0; i < numLines; i++) {
    const angle = (i / numLines) * Math.PI * 2;
    const innerR = radius * 0.3;
    const outerR = radius * (0.7 + Math.random() * 0.3);
    ctx.beginPath();
    ctx.moveTo(
      cx + Math.cos(angle) * innerR,
      cy + Math.sin(angle) * innerR
    );
    ctx.lineTo(
      cx + Math.cos(angle) * outerR,
      cy + Math.sin(angle) * outerR
    );
    ctx.stroke();
  }

  // Explosion particles
  if (isExplosion && intensity > 0.2) {
    const numParticles = 8;
    ctx.fillStyle = `rgba(249, 115, 22, ${0.6 * intensity})`;
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2 + progress * 0.5;
      const dist = radius * (0.5 + progress * 0.5);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Draws the frictionless track surface.
 */
function drawTrackSurface(ctx, helpers, xMin, xMax) {
  const leftCX = helpers.toCanvasX(xMin);
  const rightCX = helpers.toCanvasX(xMax);
  const trackCY = helpers.toCanvasY(0);

  // Track line
  ctx.strokeStyle = TRACK_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftCX, trackCY);
  ctx.lineTo(rightCX, trackCY);
  ctx.stroke();

  // Tick marks
  ctx.lineWidth = 1;
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '9px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const startTick = Math.ceil(xMin / 2) * 2;
  for (let wx = startTick; wx <= xMax; wx += 2) {
    const tx = helpers.toCanvasX(wx);
    ctx.beginPath();
    ctx.moveTo(tx, trackCY);
    ctx.lineTo(tx, trackCY + 6);
    ctx.stroke();
    ctx.fillText(`${wx}`, tx, trackCY + 8);
  }

  // Track label
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 10px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Frictionless Track', (leftCX + rightCX) / 2, trackCY + 22);
}

/**
 * Draws phase label at the top of the canvas.
 */
function drawPhaseLabel(ctx, helpers, phase) {
  const cx = helpers.width / 2;
  const cy = 24;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (phase === 'pre') {
    ctx.font = 'bold 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Before Collision', cx, cy);
  } else if (phase === 'colliding') {
    ctx.font = 'bold 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('Collision!', cx, cy);
  } else if (phase === 'post') {
    ctx.font = 'bold 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('After Collision', cx, cy);
  }
}

/**
 * Draws velocity labels below objects.
 */
function drawObjectVelocityLabel(ctx, helpers, x, w, phase, u, v, color) {
  const cx = helpers.toCanvasX(x);
  const bottomY = helpers.toCanvasY(0) + 40;

  ctx.font = '11px ui-monospace, monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (phase === 'pre') {
    ctx.fillText(`u = ${u.toFixed(1)} m/s`, cx, bottomY);
  } else if (phase === 'post') {
    ctx.fillText(`v = ${v.toFixed(1)} m/s`, cx, bottomY);
  }
}

/**
 * Main drawing function for the 1D collision track.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context.
 * @param {Object} helpers - PhysicsCanvas coordinate helpers.
 * @param {Object} state - Current simulation state.
 */
export function drawCollisionTrack(ctx, helpers, state) {
  const {
    phase,
    x1,
    w1,
    m1,
    u1,
    v1,
    currentV1,
    x2,
    w2,
    m2,
    u2,
    v2,
    currentV2,
    collisionProgress,
    collisionX,
    collisionType,
    merged,
    showVelocityArrows,
    showLabels,
    showMomentumArrows,
  } = state;

  const xMin = -12;
  const xMax = 12;

  // 1. Draw track surface
  drawTrackSurface(ctx, helpers, xMin, xMax);

  // 2. Phase label
  if (showLabels) {
    drawPhaseLabel(ctx, helpers, phase);
  }

  // 3. Compute squash factor
  const squashAmount =
    phase === 'colliding'
      ? Math.sin(collisionProgress * Math.PI)
      : 0;

  // 4. Block heights
  const h1 = w1 * 0.8;
  const h2 = w2 * 0.8;

  // 5. Draw collision/explosion effect
  if (phase === 'colliding') {
    drawCollisionFlash(
      ctx,
      helpers,
      collisionX,
      collisionProgress,
      collisionType === 'explosion'
    );
  }

  // 6. Draw objects
  if (merged && phase === 'post') {
    // Draw merged block
    const mergedH = Math.max(h1, h2);
    drawMergedBlock(ctx, helpers, x1, w1, w2, mergedH, m1, m2);

    // Velocity arrow for merged block
    if (showVelocityArrows) {
      drawVelocityArrow(
        ctx,
        helpers,
        x1,
        mergedH,
        currentV1,
        PURPLE,
        `${currentV1.toFixed(1)} m/s`
      );
    }

    // Momentum arrow for merged block
    if (showMomentumArrows) {
      drawMomentumArrow(ctx, helpers, x1, m1 + m2, currentV1, PURPLE);
    }

    // Velocity label for merged block
    if (showLabels) {
      drawObjectVelocityLabel(ctx, helpers, x1, w1 + w2, phase, u1, v1, PURPLE);
    }
  } else {
    // Check if objects are within visible range
    const isObj1Visible = x1 >= xMin - w1 && x1 <= xMax + w1;
    const isObj2Visible = x2 >= xMin - w2 && x2 <= xMax + w2;

    // Draw Object 1
    if (isObj1Visible) {
      const sq1 = phase === 'colliding' ? squashAmount : 0;
      drawBlock(
        ctx,
        helpers,
        x1,
        0,
        w1,
        h1,
        OBJ1_FILL,
        OBJ1_STROKE,
        `m₁=${m1.toFixed(1)}`,
        sq1
      );

      if (showVelocityArrows) {
        drawVelocityArrow(ctx, helpers, x1, h1, currentV1, OBJ1_COLOR, null);
      }

      if (showMomentumArrows) {
        drawMomentumArrow(ctx, helpers, x1, m1, currentV1, OBJ1_COLOR);
      }

      if (showLabels) {
        drawObjectVelocityLabel(ctx, helpers, x1, w1, phase, u1, v1, OBJ1_COLOR);
      }
    }

    // Draw Object 2
    if (isObj2Visible) {
      const sq2 = phase === 'colliding' ? squashAmount : 0;
      drawBlock(
        ctx,
        helpers,
        x2,
        0,
        w2,
        h2,
        OBJ2_FILL,
        OBJ2_STROKE,
        `m₂=${m2.toFixed(1)}`,
        sq2
      );

      if (showVelocityArrows) {
        drawVelocityArrow(ctx, helpers, x2, h2, currentV2, OBJ2_COLOR, null);
      }

      if (showMomentumArrows) {
        drawMomentumArrow(ctx, helpers, x2, m2, currentV2, OBJ2_COLOR);
      }

      if (showLabels) {
        drawObjectVelocityLabel(ctx, helpers, x2, w2, phase, u2, v2, OBJ2_COLOR);
      }
    }
  }
}