/**
 * @file ElevatorScene.js
 * @description Pure canvas drawing functions for the Apparent Weight simulator scenes.
 * Exports three drawing functions: drawElevatorScene, drawFreeFallScene, drawCircularScene.
 * Each function renders the complete visual scene onto a canvas context using
 * coordinate helpers from PhysicsCanvas.
 *
 * These are NOT React components — they are pure drawing functions used as the
 * `draw` callback for PhysicsCanvas.
 *
 * @module ElevatorScene
 */

import { drawArrow } from '../shared/vectorArrow';

/* ── Color Constants ────────────────────────────────────────────────── */
const COLORS = {
  elevatorFill: 'rgba(99, 102, 241, 0.08)',
  elevatorStroke: '#6366f1',
  cable: '#94a3b8',
  person: '#3b82f6',
  scaleFill: 'rgba(245, 158, 11, 0.2)',
  scaleStroke: '#f59e0b',
  weight: '#ef4444',
  normal: '#10b981',
  accel: '#f59e0b',
  net: '#8b5cf6',
  centripetal: '#f97316',
  floorIndicator: '#10b981',
  ground: '#78716c',
  groundHatch: '#a8a29e',
  trackStroke: '#94a3b8',
  contactLost: '#ef4444',
};

const STATE_COLORS = {
  weightless: '#8b5cf6',
  lighter: '#f59e0b',
  normal: '#10b981',
  heavier: '#ef4444',
  crushed: '#ef4444',
};

/* ── Helper: draw stick figure ──────────────────────────────────────── */
function drawStickFigure(ctx, cx, feetY, height, scale, color) {
  const headRadius = 0.25 * scale;
  const bodyLength = height * 0.45 * scale;
  const legLength = height * 0.35 * scale;
  const armLength = height * 0.3 * scale;
  const armY = feetY - legLength - bodyLength * 0.6;

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, scale * 0.04);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const headCenterY = feetY - legLength - bodyLength - headRadius;

  // Head
  ctx.beginPath();
  ctx.arc(cx, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
  ctx.fill();
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(cx, headCenterY + headRadius);
  ctx.lineTo(cx, feetY - legLength);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(cx - armLength * 0.7, armY - armLength * 0.3);
  ctx.lineTo(cx, armY);
  ctx.lineTo(cx + armLength * 0.7, armY - armLength * 0.3);
  ctx.stroke();

  // Legs
  const legSpread = height * 0.15 * scale;
  ctx.beginPath();
  ctx.moveTo(cx - legSpread, feetY);
  ctx.lineTo(cx, feetY - legLength);
  ctx.lineTo(cx + legSpread, feetY);
  ctx.stroke();
}

/* ── Helper: draw ground with hatching ──────────────────────────────── */
function drawGround(ctx, helpers, groundWorldY) {
  const leftX = helpers.toCanvasX(helpers.worldBounds ? helpers.worldBounds.xMin : -10);
  const rightX = helpers.toCanvasX(helpers.worldBounds ? helpers.worldBounds.xMax : 10);
  const groundCanvasY = helpers.toCanvasY(groundWorldY);

  // Ground line
  ctx.strokeStyle = COLORS.ground;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(leftX, groundCanvasY);
  ctx.lineTo(rightX, groundCanvasY);
  ctx.stroke();

  // Hatching below ground
  ctx.strokeStyle = COLORS.groundHatch;
  ctx.lineWidth = 1;
  const hatchSpacing = 12;
  const hatchLength = 15;
  for (let x = leftX; x < rightX; x += hatchSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, groundCanvasY);
    ctx.lineTo(x - hatchLength * 0.5, groundCanvasY + hatchLength);
    ctx.stroke();
  }
}

/* ── Helper: compute force arrow scale ──────────────────────────────── */
function getForceArrowLength(forceN, referenceForceN, maxWorldUnits, scale) {
  if (Math.abs(forceN) < 0.01) return 0;
  const ref = Math.max(Math.abs(referenceForceN), 1);
  const worldLen = (Math.abs(forceN) / ref) * 2.5;
  const clampedWorld = Math.min(worldLen, maxWorldUnits);
  return clampedWorld * scale;
}

/* ═══════════════════════════════════════════════════════════════════════
   drawElevatorScene
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Draw the elevator cabin scene on a canvas.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {Object} helpers - PhysicsCanvas helpers: { width, height, toCanvasX, toCanvasY, scale, padding }.
 * @param {Object} state - Current physics state for the elevator scene.
 */
export function drawElevatorScene(ctx, helpers, state) {
  const {
    position = 0,
    velocity = 0,
    acceleration = 0,
    mass = 70,
    gravity = 9.8,
    apparentWeight = 686,
    realWeight = 686,
    gForce = 1,
    phaseLabel = '',
    maxPosition = 30,
    showForceArrows = true,
    showAccelArrow = true,
    showValues = true,
    weightState = 'normal',
  } = state;

  const { width, height, toCanvasX, toCanvasY, scale } = helpers;
  const cabinHeight = 4;
  const cabinWidth = 3;

  // ── Floor indicator (left side) ──
  const trackX = toCanvasX(-5);
  const trackTop = toCanvasY(Math.max(maxPosition, 1));
  const trackBottom = toCanvasY(0);
  const trackHeight = trackBottom - trackTop;

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(trackX, trackTop);
  ctx.lineTo(trackX, trackBottom);
  ctx.stroke();

  // Position indicator on track
  const normalizedPos = maxPosition > 0 ? Math.min(position / maxPosition, 1) : 0;
  const indicatorY = trackBottom - normalizedPos * trackHeight;

  ctx.fillStyle = COLORS.floorIndicator;
  ctx.beginPath();
  ctx.arc(trackX, indicatorY, 6, 0, Math.PI * 2);
  ctx.fill();

  // Floor labels
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('G', trackX, trackBottom + 16);
  ctx.fillText('Top', trackX, trackTop - 8);

  // ── Elevator cabin ──
  const cabinLeft = toCanvasX(-cabinWidth / 2);
  const cabinRight = toCanvasX(cabinWidth / 2);
  const cabinBottom = toCanvasY(position);
  const cabinTop = toCanvasY(position + cabinHeight);
  const cabinW = cabinRight - cabinLeft;
  const cabinH = cabinBottom - cabinTop;

  // Cabin fill
  ctx.fillStyle = COLORS.elevatorFill;
  ctx.fillRect(cabinLeft, cabinTop, cabinW, cabinH);

  // Cabin border
  ctx.strokeStyle = COLORS.elevatorStroke;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(cabinLeft, cabinTop, cabinW, cabinH);

  // Door line (center vertical dashed)
  const doorX = toCanvasX(0);
  ctx.strokeStyle = '#a5b4fc';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(doorX, cabinTop + 4);
  ctx.lineTo(doorX, cabinBottom - 4);
  ctx.stroke();
  ctx.setLineDash([]);

  // Cabin floor line
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cabinLeft + 4, cabinBottom - 1);
  ctx.lineTo(cabinRight - 4, cabinBottom - 1);
  ctx.stroke();

  // ── Cable ──
  const cableTopY = toCanvasY(position + cabinHeight + 3);
  const cableMidX = toCanvasX(0);
  const cableBottomY = cabinTop;

  ctx.strokeStyle = COLORS.cable;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(cableMidX, cableBottomY);
  ctx.lineTo(cableMidX, cableTopY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Pulley circle
  ctx.strokeStyle = COLORS.cable;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cableMidX, cableTopY - 6, 6, 0, Math.PI * 2);
  ctx.stroke();

  // ── Scale ──
  const scaleWorldW = 1.2;
  const scaleWorldH = 0.3;
  const scaleLeft = toCanvasX(-scaleWorldW / 2);
  const scaleBottom = toCanvasY(position);
  const scaleTop = toCanvasY(position + scaleWorldH);
  const scaleW = toCanvasX(scaleWorldW / 2) - scaleLeft;
  const scaleH = scaleBottom - scaleTop;

  ctx.fillStyle = COLORS.scaleFill;
  ctx.strokeStyle = COLORS.scaleStroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(scaleLeft, scaleTop, scaleW, scaleH, 3);
  ctx.fill();
  ctx.stroke();

  // Scale reading text
  if (showValues) {
    ctx.fillStyle = '#92400e';
    ctx.font = `bold ${Math.max(10, Math.min(13, scale * 0.2))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${apparentWeight.toFixed(1)} N`,
      toCanvasX(0),
      (scaleTop + scaleBottom) / 2
    );
  }

  // ── Person (stick figure) ──
  const personFeetCanvasY = scaleTop;
  const personCenterX = toCanvasX(0);
  const personHeight = cabinHeight * 0.55;
  const personScale = scale;

  drawStickFigure(ctx, personCenterX, personFeetCanvasY, personHeight, personScale, COLORS.person);

  // ── Force arrows ──
  if (showForceArrows) {
    const refForce = Math.max(realWeight, 1);
    const maxArrowPx = Math.min(height * 0.25, 150);

    const personMidY = personFeetCanvasY - personHeight * 0.4 * scale;

    // Weight (mg) — downward from person center
    const weightLen = getForceArrowLength(realWeight, refForce, 3, scale);
    if (weightLen > 2) {
      drawArrow(ctx, {
        fromX: personCenterX - 15,
        fromY: personMidY,
        toX: personCenterX - 15,
        toY: personMidY + Math.min(weightLen, maxArrowPx),
        color: COLORS.weight,
        lineWidth: 2.5,
        headLength: 10,
        label: showValues ? `mg = ${realWeight.toFixed(1)} N` : 'mg',
        labelPosition: 'left',
      });
    }

    // Normal force (N) — upward from feet
    const normalLen = getForceArrowLength(apparentWeight, refForce, 3, scale);
    if (normalLen > 2) {
      drawArrow(ctx, {
        fromX: personCenterX + 15,
        fromY: personFeetCanvasY,
        toX: personCenterX + 15,
        toY: personFeetCanvasY - Math.min(normalLen, maxArrowPx),
        color: COLORS.normal,
        lineWidth: 2.5,
        headLength: 10,
        label: showValues ? `N = ${apparentWeight.toFixed(1)} N` : 'N',
        labelPosition: 'right',
      });
    }
  }

  // ── Acceleration arrow (right side of elevator) ──
  if (showAccelArrow && Math.abs(acceleration) > 0.01) {
    const arrowX = cabinRight + 30;
    const arrowMidY = (cabinTop + cabinBottom) / 2;
    const accelDir = acceleration > 0 ? -1 : 1;
    const arrowLen = Math.min(Math.abs(acceleration) * 8, 80);

    drawArrow(ctx, {
      fromX: arrowX,
      fromY: arrowMidY,
      toX: arrowX,
      toY: arrowMidY + accelDir * arrowLen,
      color: COLORS.accel,
      lineWidth: 3,
      headLength: 12,
      label: showValues ? `a = ${acceleration >= 0 ? '+' : ''}${acceleration.toFixed(1)} m/s²` : 'a',
      labelPosition: 'right',
    });
  }

  // ── Phase label (top of canvas) ──
  const phaseColor = STATE_COLORS[weightState] || STATE_COLORS.normal;
  ctx.fillStyle = phaseColor;
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(phaseLabel, width / 2, 15);

  // ── Velocity indicator ──
  const velIcon = velocity > 0.1 ? '↑' : velocity < -0.1 ? '↓' : '—';
  ctx.fillStyle = '#64748b';
  ctx.font = '13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${velIcon} v = ${velocity.toFixed(1)} m/s`, width / 2, 36);

  // ── G-force badge ──
  ctx.fillStyle = phaseColor;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${gForce.toFixed(2)}g`, width - 15, 20);
}

/* ═══════════════════════════════════════════════════════════════════════
   drawFreeFallScene
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Draw the free-fall box scene on a canvas.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {Object} helpers - PhysicsCanvas helpers.
 * @param {Object} state - Current physics state for the free-fall scene.
 */
export function drawFreeFallScene(ctx, helpers, state) {
  const {
    heightAboveGround = 20,
    dropHeight = 20,
    velocity = 0,
    acceleration = 0,
    mass = 70,
    gravity = 9.8,
    apparentWeight = 686,
    realWeight = 686,
    gForce = 1,
    phase = 'held',
    showForceArrows = true,
    showValues = true,
    weightState = 'normal',
  } = state;

  const { width, height, toCanvasX, toCanvasY, scale } = helpers;

  // ── Ground ──
  drawGround(ctx, helpers, 0);

  // ── Height reference marker ──
  const markerX = toCanvasX(-4);
  const groundY = toCanvasY(0);
  const dropTopY = toCanvasY(dropHeight);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(markerX, groundY);
  ctx.lineTo(markerX, dropTopY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Height label
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`h = ${dropHeight} m`, markerX - 6, (groundY + dropTopY) / 2);

  // ── Box / crate ──
  const boxWidth = 2.5;
  const boxHeight = 3;
  const boxCenterX = 0;
  const boxBottomWorld = heightAboveGround;
  const boxTopWorld = heightAboveGround + boxHeight;

  const boxLeft = toCanvasX(boxCenterX - boxWidth / 2);
  const boxRight = toCanvasX(boxCenterX + boxWidth / 2);
  const boxBottom = toCanvasY(boxBottomWorld);
  const boxTop = toCanvasY(boxTopWorld);
  const boxW = boxRight - boxLeft;
  const boxH = boxBottom - boxTop;

  // Shake effect during impact
  let shakeX = 0;
  let shakeY = 0;
  if (phase === 'impact') {
    shakeX = (Math.random() - 0.5) * 6;
    shakeY = (Math.random() - 0.5) * 4;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Box fill
  ctx.fillStyle = phase === 'freefall' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(99, 102, 241, 0.1)';
  ctx.fillRect(boxLeft, boxTop, boxW, boxH);

  // Box border
  ctx.strokeStyle = phase === 'freefall' ? '#8b5cf6' : '#6366f1';
  ctx.lineWidth = 2.5;
  if (phase === 'freefall') {
    ctx.setLineDash([8, 4]);
  }
  ctx.strokeRect(boxLeft, boxTop, boxW, boxH);
  ctx.setLineDash([]);

  // ── Scale inside box ──
  const scaleWorldW = 1.0;
  const scaleWorldH = 0.25;
  const sLeft = toCanvasX(-scaleWorldW / 2);
  const sBottom = toCanvasY(boxBottomWorld + 0.05);
  const sTop = toCanvasY(boxBottomWorld + 0.05 + scaleWorldH);
  const sW = toCanvasX(scaleWorldW / 2) - sLeft;
  const sH = sBottom - sTop;

  ctx.fillStyle = COLORS.scaleFill;
  ctx.strokeStyle = COLORS.scaleStroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(sLeft, sTop, sW, sH, 2);
  ctx.fill();
  ctx.stroke();

  if (showValues) {
    ctx.fillStyle = '#92400e';
    ctx.font = `bold ${Math.max(9, Math.min(11, scale * 0.15))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${apparentWeight.toFixed(0)} N`, toCanvasX(0), (sTop + sBottom) / 2);
  }

  // ── Person inside box ──
  const personFeetY = sTop;
  const personCenterX = toCanvasX(0);
  const personH = boxHeight * 0.5;

  drawStickFigure(ctx, personCenterX, personFeetY, personH, scale, COLORS.person);

  ctx.restore();

  // ── Holding mechanism (during 'held' phase) ──
  if (phase === 'held') {
    const hookY = toCanvasY(boxTopWorld + 1.5);
    const boxTopCanvasY = toCanvasY(boxTopWorld);

    ctx.strokeStyle = COLORS.cable;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(-0.8), boxTopCanvasY);
    ctx.lineTo(toCanvasX(-0.8), hookY);
    ctx.lineTo(toCanvasX(0.8), hookY);
    ctx.lineTo(toCanvasX(0.8), boxTopCanvasY);
    ctx.stroke();

    // Bracket at top
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(-1.5), hookY - 4);
    ctx.lineTo(toCanvasX(1.5), hookY - 4);
    ctx.stroke();
  }

  // ── Speed lines (during freefall) ──
  if (phase === 'freefall' && Math.abs(velocity) > 0.5) {
    const numLines = Math.min(Math.floor(Math.abs(velocity) / 2) + 2, 8);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    ctx.lineWidth = 1.5;
    const bTop = toCanvasY(boxTopWorld);

    for (let i = 0; i < numLines; i++) {
      const lx = boxLeft + (boxW * (i + 1)) / (numLines + 1);
      const lineLen = 8 + Math.abs(velocity) * 1.5;
      ctx.beginPath();
      ctx.moveTo(lx + shakeX, bTop - 4);
      ctx.lineTo(lx + shakeX, bTop - 4 - lineLen);
      ctx.stroke();
    }
  }

  // ── Impact effect ──
  if (phase === 'impact') {
    const impactY = toCanvasY(0);
    const cx = toCanvasX(0);

    // Starburst
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    const rays = 12;
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2;
      const innerR = 8;
      const outerR = 20 + Math.random() * 15;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, impactY + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, impactY + Math.sin(angle) * outerR);
      ctx.stroke();
    }
  }

  // ── Force arrows ──
  if (showForceArrows) {
    const refForce = Math.max(realWeight, 1);
    const maxArrowPx = Math.min(height * 0.2, 120);
    const personMidCanvasY = toCanvasY(boxBottomWorld + boxHeight * 0.5);
    const cx = toCanvasX(0);

    // Weight (mg) — always present and downward
    const weightLen = getForceArrowLength(realWeight, refForce, 3, scale);
    if (weightLen > 2) {
      drawArrow(ctx, {
        fromX: cx - 20,
        fromY: personMidCanvasY,
        toX: cx - 20,
        toY: personMidCanvasY + Math.min(weightLen, maxArrowPx),
        color: COLORS.weight,
        lineWidth: 2.5,
        headLength: 10,
        label: showValues ? `mg = ${realWeight.toFixed(0)} N` : 'mg',
        labelPosition: 'left',
      });
    }

    // Normal force (N) — upward, zero during freefall
    if (apparentWeight > 0.5) {
      const normalLen = getForceArrowLength(apparentWeight, refForce, 3, scale);
      if (normalLen > 2) {
        drawArrow(ctx, {
          fromX: cx + 20,
          fromY: toCanvasY(boxBottomWorld + 0.3),
          toX: cx + 20,
          toY: toCanvasY(boxBottomWorld + 0.3) - Math.min(normalLen, maxArrowPx),
          color: COLORS.normal,
          lineWidth: 2.5,
          headLength: 10,
          label: showValues ? `N = ${apparentWeight.toFixed(0)} N` : 'N',
          labelPosition: 'right',
        });
      }
    } else if (phase === 'freefall') {
      // Show "N = 0" text
      ctx.fillStyle = COLORS.normal;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('N = 0', cx + 25, toCanvasY(boxBottomWorld + 0.5));
    }
  }

  // ── Phase label ──
  const phaseLabels = {
    held: 'HELD — Normal Weight',
    freefall: 'FREE FALL — WEIGHTLESS!',
    impact: 'IMPACT!',
    rest: 'AT REST — Normal Weight',
  };
  const phaseColor = phase === 'freefall' ? STATE_COLORS.weightless
    : phase === 'impact' ? STATE_COLORS.crushed
    : STATE_COLORS.normal;

  ctx.fillStyle = phaseColor;
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(phaseLabels[phase] || phase, width / 2, 15);

  // Velocity
  ctx.fillStyle = '#64748b';
  ctx.font = '13px Inter, system-ui, sans-serif';
  ctx.fillText(`v = ${velocity.toFixed(1)} m/s   h = ${heightAboveGround.toFixed(1)} m`, width / 2, 36);

  // G-force badge
  ctx.fillStyle = phaseColor;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${gForce.toFixed(1)}g`, width - 15, 20);
}

/* ═══════════════════════════════════════════════════════════════════════
   drawCircularScene
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Draw the circular motion (vertical loop) scene on a canvas.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {Object} helpers - PhysicsCanvas helpers.
 * @param {Object} state - Current physics state for the circular scene.
 */
export function drawCircularScene(ctx, helpers, state) {
  const {
    theta = 0,
    radius = 5,
    speed = 10,
    mass = 70,
    gravity = 9.8,
    apparentWeight = 686,
    realWeight = 686,
    gForce = 1,
    personX = 0,
    personY = 0,
    showForceArrows = true,
    showValues = true,
    weightState = 'normal',
    contactLost = false,
  } = state;

  const { width, height, toCanvasX, toCanvasY, scale } = helpers;

  // Loop center in world coords: (0, radius)
  const centerWorldX = 0;
  const centerWorldY = radius;
  const centerCanvasX = toCanvasX(centerWorldX);
  const centerCanvasY = toCanvasY(centerWorldY);
  const radiusPx = radius * scale;

  // ── Ground line at y = 0 ──
  drawGround(ctx, helpers, 0);

  // ── Loop track ──
  ctx.strokeStyle = COLORS.trackStroke;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.arc(centerCanvasX, centerCanvasY, radiusPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Track inner shadow
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(centerCanvasX, centerCanvasY, radiusPx, 0, Math.PI * 2);
  ctx.stroke();

  // ── Position markers ──
  const markers = [
    { angle: 0, label: 'Bottom', align: 'center', baseline: 'top', dx: 0, dy: 18 },
    { angle: Math.PI, label: 'Top', align: 'center', baseline: 'bottom', dx: 0, dy: -14 },
    { angle: Math.PI / 2, label: '90°', align: 'left', baseline: 'middle', dx: 14, dy: 0 },
    { angle: (3 * Math.PI) / 2, label: '270°', align: 'right', baseline: 'middle', dx: -14, dy: 0 },
  ];

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, system-ui, sans-serif';
  markers.forEach(({ angle, label, align, baseline, dx, dy }) => {
    const mx = centerCanvasX + Math.sin(angle) * (radiusPx + 4);
    const my = centerCanvasY + Math.cos(angle) * (radiusPx + 4);
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    // Small dot
    ctx.beginPath();
    ctx.arc(
      centerCanvasX + Math.sin(angle) * radiusPx,
      centerCanvasY + Math.cos(angle) * radiusPx,
      3,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.fillText(label, mx + dx, my + dy);
  });

  // ── Angle arc from bottom to current position ──
  if (theta > 0.05) {
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Canvas arc: 0 is right, angles clockwise. We need to convert.
    // In canvas coords (Y down), our world theta from bottom:
    // bottom is at canvas angle PI/2 (straight down from center)
    // Our theta increases counterclockwise in world, which is clockwise in canvas.
    const startAngle = Math.PI / 2;
    const endAngle = Math.PI / 2 - theta;
    ctx.arc(centerCanvasX, centerCanvasY, radiusPx * 0.25, endAngle, startAngle);
    ctx.stroke();

    // Angle label
    const angleDeg = ((theta * 180) / Math.PI) % 360;
    const labelAngle = Math.PI / 2 - theta / 2;
    ctx.fillStyle = '#6366f1';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `θ=${angleDeg.toFixed(0)}°`,
      centerCanvasX + Math.cos(labelAngle) * radiusPx * 0.35,
      centerCanvasY + Math.sin(labelAngle) * radiusPx * 0.35
    );
  }

  // ── Person on loop ──
  const pxCanvasX = toCanvasX(personX);
  const pxCanvasY = toCanvasY(personY);
  const personRadius = Math.max(8, scale * 0.3);

  // Person circle/dot
  ctx.fillStyle = contactLost ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)';
  ctx.strokeStyle = contactLost ? COLORS.contactLost : COLORS.person;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pxCanvasX, pxCanvasY, personRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner dot
  ctx.fillStyle = contactLost ? COLORS.contactLost : COLORS.person;
  ctx.beginPath();
  ctx.arc(pxCanvasX, pxCanvasY, personRadius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Contact lost warning
  if (contactLost) {
    ctx.fillStyle = COLORS.contactLost;
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ Contact Lost!', pxCanvasX, pxCanvasY - personRadius - 12);
  }

  // ── Force arrows ──
  if (showForceArrows) {
    const refForce = Math.max(realWeight, 1);
    const maxArrowPx = Math.min(height * 0.2, 120);

    // Weight — always downward
    const weightLen = getForceArrowLength(realWeight, refForce, 3, scale);
    if (weightLen > 2) {
      drawArrow(ctx, {
        fromX: pxCanvasX - 18,
        fromY: pxCanvasY,
        toX: pxCanvasX - 18,
        toY: pxCanvasY + Math.min(weightLen, maxArrowPx),
        color: COLORS.weight,
        lineWidth: 2.5,
        headLength: 10,
        label: showValues ? `mg` : 'mg',
        labelPosition: 'left',
      });
    }

    // Normal force — toward center of circle
    if (apparentWeight > 0.5) {
      const normalLen = getForceArrowLength(apparentWeight, refForce, 3, scale);
      if (normalLen > 2) {
        // Direction from person toward center
        const dx = centerCanvasX - pxCanvasX;
        const dy = centerCanvasY - pxCanvasY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dist > 0 ? dx / dist : 0;
        const ny = dist > 0 ? dy / dist : -1;
        const arrowLen = Math.min(normalLen, maxArrowPx);

        drawArrow(ctx, {
          fromX: pxCanvasX + nx * (personRadius + 4),
          fromY: pxCanvasY + ny * (personRadius + 4),
          toX: pxCanvasX + nx * (personRadius + 4 + arrowLen),
          toY: pxCanvasY + ny * (personRadius + 4 + arrowLen),
          color: COLORS.normal,
          lineWidth: 2.5,
          headLength: 10,
          label: showValues ? `N` : 'N',
          labelPosition: 'right',
        });
      }
    }

    // Tangential velocity arrow — perpendicular to radius, in direction of motion
    const tangentDx = -Math.cos(theta);
    const tangentDy = Math.sin(theta);
    const velArrowLen = Math.min(speed * 3, 60);

    if (velArrowLen > 3) {
      // Convert tangent direction to canvas coords
      const tCanvasDx = tangentDx;
      const tCanvasDy = -tangentDy;
      const tDist = Math.sqrt(tCanvasDx * tCanvasDx + tCanvasDy * tCanvasDy);
      const tnx = tDist > 0 ? tCanvasDx / tDist : 1;
      const tny = tDist > 0 ? tCanvasDy / tDist : 0;

      drawArrow(ctx, {
        fromX: pxCanvasX + tnx * (personRadius + 6),
        fromY: pxCanvasY + tny * (personRadius + 6),
        toX: pxCanvasX + tnx * (personRadius + 6 + velArrowLen),
        toY: pxCanvasY + tny * (personRadius + 6 + velArrowLen),
        color: '#06b6d4',
        lineWidth: 2,
        headLength: 8,
        label: showValues ? `v` : '',
        labelPosition: 'right',
        dashed: false,
      });
    }
  }

  // ── Phase label ──
  const phaseColor = STATE_COLORS[weightState] || STATE_COLORS.normal;
  const angleDeg = ((theta * 180) / Math.PI) % 360;
  let posLabel = '';
  if (angleDeg < 30 || angleDeg > 330) posLabel = 'Bottom (Max Weight)';
  else if (angleDeg > 150 && angleDeg < 210) posLabel = 'Top (Min Weight)';
  else if (angleDeg >= 30 && angleDeg <= 150) posLabel = 'Rising';
  else posLabel = 'Descending';

  ctx.fillStyle = phaseColor;
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(posLabel, width / 2, 15);

  // Speed and angle info
  ctx.fillStyle = '#64748b';
  ctx.font = '13px Inter, system-ui, sans-serif';
  ctx.fillText(
    `v = ${speed.toFixed(1)} m/s   θ = ${angleDeg.toFixed(0)}°   R = ${radius.toFixed(1)} m`,
    width / 2,
    36
  );

  // G-force badge
  ctx.fillStyle = phaseColor;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${gForce.toFixed(2)}g`, width - 15, 20);

  // Scale reading
  if (showValues) {
    ctx.fillStyle = phaseColor;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`N = ${apparentWeight.toFixed(1)} N`, width - 15, 40);
  }

  // Min speed warning
  const minSpeed = Math.sqrt(gravity * radius);
  if (speed < minSpeed) {
    ctx.fillStyle = '#ef4444';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `⚠ Speed < min (${minSpeed.toFixed(1)} m/s) — contact lost at top!`,
      15,
      height - 15
    );
  }
}