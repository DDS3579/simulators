/**
 * @file RelativeVelocityScene.js
 * @description Pure canvas drawing functions for the 1D relative velocity scene
 * (two objects on a road/track) and the rain-on-moving-person scene.
 * These are NOT React components — they are pure drawing functions used as the
 * `draw` callback for PhysicsCanvas.
 *
 * @module RelativeVelocityScene
 */

import { drawArrow } from '../shared/vectorArrow';

/* ── Color Constants ────────────────────────────────────────────────── */
const COLORS = {
  objectA: '#6366f1',
  objectAFill: 'rgba(99, 102, 241, 0.25)',
  objectB: '#f59e0b',
  objectBFill: 'rgba(245, 158, 11, 0.25)',
  road: '#94a3b8',
  roadFill: 'rgba(148, 163, 184, 0.15)',
  roadLine: '#f59e0b',
  grass: '#10b981',
  grassFill: 'rgba(16, 185, 129, 0.1)',
  tree: '#10b981',
  treeTrunk: '#92400e',
  relative: '#8b5cf6',
  ground: '#78716c',
  groundHatch: '#a8a29e',
  rain: 'rgba(59, 130, 246, 0.55)',
  umbrella: '#ef4444',
  person: '#3b82f6',
  sky: 'rgba(59, 130, 246, 0.03)',
  label: '#334155',
  sublabel: '#64748b',
};

/* ── Helper: clamp arrow length ─────────────────────────────────────── */
function clampedArrowLen(velocity, scale, maxPx) {
  const raw = Math.abs(velocity) * scale * 0.6;
  return Math.min(raw, maxPx);
}

/* ── Helper: draw a simple car shape ────────────────────────────────── */
function drawCar(ctx, cx, bottomY, w, h, fill, stroke) {
  const x = cx - w / 2;
  const y = bottomY - h;
  const wheelR = h * 0.2;

  // Body
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h * 0.65, 4);
  ctx.fill();
  ctx.stroke();

  // Roof
  ctx.beginPath();
  ctx.roundRect(x + w * 0.2, y - h * 0.35, w * 0.6, h * 0.38, 3);
  ctx.fill();
  ctx.stroke();

  // Windshield
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.fillRect(x + w * 0.55, y - h * 0.3, w * 0.2, h * 0.28);

  // Wheels
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(x + w * 0.25, bottomY, wheelR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + w * 0.75, bottomY, wheelR, 0, Math.PI * 2);
  ctx.fill();
}

/* ── Helper: draw a train shape ─────────────────────────────────────── */
function drawTrain(ctx, cx, bottomY, w, h, fill, stroke) {
  const x = cx - w / 2;
  const y = bottomY - h;
  const wheelR = h * 0.15;

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h * 0.75, 3);
  ctx.fill();
  ctx.stroke();

  // Windows
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
  const winCount = Math.max(2, Math.floor(w / 20));
  const winW = (w * 0.7) / winCount;
  for (let i = 0; i < winCount; i++) {
    ctx.fillRect(x + w * 0.1 + i * (winW + 3), y + h * 0.12, winW - 2, h * 0.3);
  }

  // Wheels
  ctx.fillStyle = '#334155';
  const wheelCount = Math.max(2, Math.floor(w / 25));
  for (let i = 0; i < wheelCount; i++) {
    const wx = x + (w * (i + 0.5)) / wheelCount;
    ctx.beginPath();
    ctx.arc(wx, bottomY, wheelR, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ── Helper: draw a bike shape ──────────────────────────────────────── */
function drawBike(ctx, cx, bottomY, w, h, fill, stroke) {
  const wheelR = h * 0.3;
  const lx = cx - w * 0.35;
  const rx = cx + w * 0.35;

  // Wheels
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(lx, bottomY - wheelR, wheelR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rx, bottomY - wheelR, wheelR, 0, Math.PI * 2);
  ctx.stroke();

  // Frame
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(lx, bottomY - wheelR);
  ctx.lineTo(cx, bottomY - h * 0.7);
  ctx.lineTo(rx, bottomY - wheelR);
  ctx.lineTo(cx - w * 0.05, bottomY - h * 0.45);
  ctx.lineTo(lx, bottomY - wheelR);
  ctx.stroke();

  // Handlebars
  ctx.beginPath();
  ctx.moveTo(cx, bottomY - h * 0.7);
  ctx.lineTo(cx + w * 0.1, bottomY - h * 0.85);
  ctx.stroke();

  // Seat
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx - w * 0.05, bottomY - h * 0.7, 3, 0, Math.PI * 2);
  ctx.fill();
}

/* ── Helper: draw stick person ──────────────────────────────────────── */
function drawPersonFigure(ctx, cx, bottomY, h, color) {
  const headR = h * 0.12;
  const headY = bottomY - h + headR;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // Head
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
  ctx.fill();
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(cx, headY + headR);
  ctx.lineTo(cx, bottomY - h * 0.35);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(cx - h * 0.2, bottomY - h * 0.5);
  ctx.lineTo(cx, bottomY - h * 0.6);
  ctx.lineTo(cx + h * 0.2, bottomY - h * 0.5);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(cx - h * 0.15, bottomY);
  ctx.lineTo(cx, bottomY - h * 0.35);
  ctx.lineTo(cx + h * 0.15, bottomY);
  ctx.stroke();
}

/* ── Helper: draw object by type ────────────────────────────────────── */
function drawObject(ctx, type, cx, bottomY, scale, fill, stroke) {
  const baseW = type === 'train' ? 3 : type === 'car' ? 1.8 : type === 'bike' ? 1.2 : 0.8;
  const baseH = type === 'train' ? 1.5 : type === 'car' ? 1.1 : type === 'bike' ? 1.3 : 1.6;
  const w = baseW * scale;
  const h = baseH * scale;

  if (type === 'train') drawTrain(ctx, cx, bottomY, w, h, fill, stroke);
  else if (type === 'car') drawCar(ctx, cx, bottomY, w, h, fill, stroke);
  else if (type === 'bike') drawBike(ctx, cx, bottomY, w, h, fill, stroke);
  else drawPersonFigure(ctx, cx, bottomY, h, stroke);
}

/* ── Helper: draw a small tree ──────────────────────────────────────── */
function drawTree(ctx, cx, groundY, h) {
  // Trunk
  ctx.fillStyle = COLORS.treeTrunk;
  ctx.fillRect(cx - 2, groundY - h * 0.4, 4, h * 0.4);

  // Canopy
  ctx.fillStyle = COLORS.tree;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - h * 0.25, groundY - h * 0.35);
  ctx.lineTo(cx, groundY - h);
  ctx.lineTo(cx + h * 0.25, groundY - h * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ═══════════════════════════════════════════════════════════════════════
   draw1DScene
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Draw the 1D relative velocity scene with two objects on a road.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} helpers - PhysicsCanvas helpers.
 * @param {Object} state - Current state for the 1D scene.
 */
export function draw1DScene(ctx, helpers, state) {
  const {
    xA = 0,
    vA = 20,
    typeA = 'car',
    labelA = 'A',
    xB = 10,
    vB = 8,
    typeB = 'car',
    labelB = 'B',
    observerFrame = 'ground',
    frameOffsetX = 0,
    showVelocityArrows = true,
    showRelativeVelocity = true,
    showLabels = true,
    vArelB = 12,
    vBrelA = -12,
    effectiveVA = 20,
    effectiveVB = 8,
    groundVel = 0,
  } = state;

  const { width, height, toCanvasX, toCanvasY, scale } = helpers;

  // ── Sky ──
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, width, toCanvasY(0.5));

  // ── Grass (above and below road) ──
  const roadTopWorld = 1.8;
  const roadBottomWorld = -0.3;
  const roadTopCanvas = toCanvasY(roadTopWorld);
  const roadBottomCanvas = toCanvasY(roadBottomWorld);

  ctx.fillStyle = COLORS.grassFill;
  ctx.fillRect(0, 0, width, roadTopCanvas);
  ctx.fillRect(0, roadBottomCanvas, width, height - roadBottomCanvas);

  // ── Road surface ──
  ctx.fillStyle = COLORS.roadFill;
  ctx.fillRect(0, roadTopCanvas, width, roadBottomCanvas - roadTopCanvas);

  // Road edges
  ctx.strokeStyle = COLORS.road;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, roadTopCanvas);
  ctx.lineTo(width, roadTopCanvas);
  ctx.moveTo(0, roadBottomCanvas);
  ctx.lineTo(width, roadBottomCanvas);
  ctx.stroke();

  // Dashed center line
  const centerLineY = toCanvasY(0.75);
  ctx.strokeStyle = COLORS.roadLine;
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 10]);
  ctx.beginPath();
  ctx.moveTo(0, centerLineY);
  ctx.lineTo(width, centerLineY);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Ground reference markers (scrollable) ──
  ctx.fillStyle = COLORS.sublabel;
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const markerInterval = 5;
  const viewLeft = -30 + frameOffsetX;
  const viewRight = 60 + frameOffsetX;
  const startMark = Math.floor(viewLeft / markerInterval) * markerInterval;

  for (let worldX = startMark; worldX <= viewRight; worldX += markerInterval) {
    const actualWorldX = worldX - frameOffsetX;
    const cx = toCanvasX(actualWorldX);
    if (cx < -20 || cx > width + 20) continue;

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, roadBottomCanvas);
    ctx.lineTo(cx, roadBottomCanvas + 8);
    ctx.stroke();

    ctx.fillStyle = COLORS.sublabel;
    ctx.fillText(`${worldX}m`, cx, roadBottomCanvas + 10);
  }

  // ── Trees (fixed to ground, scroll in non-ground frame) ──
  const treePositions = [-20, -10, 0, 10, 20, 30, 40];
  const treeGroundY = roadTopCanvas;
  treePositions.forEach((tp) => {
    const treeWorldX = tp - frameOffsetX;
    const tcx = toCanvasX(treeWorldX);
    if (tcx > -40 && tcx < width + 40) {
      drawTree(ctx, tcx, treeGroundY - 2, 35);
    }
  });

  // ── Objects ──
  const objGroundY = toCanvasY(0.2);
  const objScale = Math.max(scale * 0.55, 18);

  // Object A
  const aCx = toCanvasX(xA);
  drawObject(ctx, typeA, aCx, objGroundY, objScale, COLORS.objectAFill, COLORS.objectA);

  // Object B
  const bCx = toCanvasX(xB);
  drawObject(ctx, typeB, bCx, objGroundY, objScale, COLORS.objectBFill, COLORS.objectB);

  // ── Labels ──
  if (showLabels) {
    const labelYA = toCanvasY(roadTopWorld + 0.8);
    const labelYB = labelYA;

    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    ctx.fillStyle = COLORS.objectA;
    ctx.fillText(labelA, aCx, labelYA);

    ctx.fillStyle = COLORS.objectB;
    ctx.fillText(labelB, bCx, labelYB);
  }

  // ── Velocity arrows ──
  if (showVelocityArrows) {
    const arrowY = toCanvasY(roadTopWorld + 1.5);
    const maxArrowPx = width * 0.2;

    // Velocity of A in current frame
    const dispVA = observerFrame === 'A' ? 0 : observerFrame === 'B' ? vA - vB : vA;
    if (Math.abs(dispVA) > 0.05) {
      const aLen = clampedArrowLen(dispVA, scale, maxArrowPx);
      const dir = dispVA > 0 ? 1 : -1;
      drawArrow(ctx, {
        fromX: aCx,
        fromY: arrowY,
        toX: aCx + dir * aLen,
        toY: arrowY,
        color: COLORS.objectA,
        lineWidth: 2.5,
        headLength: 10,
        label: showLabels ? `${dispVA.toFixed(1)} m/s` : '',
        labelPosition: 'top',
      });
    } else if (observerFrame !== 'ground') {
      ctx.fillStyle = COLORS.objectA;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('0 m/s (stationary)', aCx, arrowY - 6);
    }

    // Velocity of B in current frame
    const dispVB = observerFrame === 'B' ? 0 : observerFrame === 'A' ? vB - vA : vB;
    if (Math.abs(dispVB) > 0.05) {
      const bLen = clampedArrowLen(dispVB, scale, maxArrowPx);
      const dir = dispVB > 0 ? 1 : -1;
      drawArrow(ctx, {
        fromX: bCx,
        fromY: arrowY + 22,
        toX: bCx + dir * bLen,
        toY: arrowY + 22,
        color: COLORS.objectB,
        lineWidth: 2.5,
        headLength: 10,
        label: showLabels ? `${dispVB.toFixed(1)} m/s` : '',
        labelPosition: 'bottom',
      });
    } else if (observerFrame !== 'ground') {
      ctx.fillStyle = COLORS.objectB;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('0 m/s (stationary)', bCx, arrowY + 28);
    }
  }

  // ── Relative velocity arrow ──
  if (showRelativeVelocity && observerFrame === 'ground') {
    const relY = toCanvasY(-1.2);
    const midX = (aCx + bCx) / 2;

    if (Math.abs(vArelB) > 0.05) {
      const relLen = clampedArrowLen(vArelB, scale, width * 0.25);
      const dir = vArelB > 0 ? 1 : -1;
      drawArrow(ctx, {
        fromX: midX,
        fromY: relY,
        toX: midX + dir * relLen,
        toY: relY,
        color: COLORS.relative,
        lineWidth: 2,
        headLength: 9,
        label: `v_A/B = ${vArelB.toFixed(1)} m/s`,
        labelPosition: 'bottom',
        dashed: true,
      });
    }
  }

  // ── Observer marker ──
  if (observerFrame !== 'ground') {
    const obsX = observerFrame === 'A' ? aCx : bCx;
    const obsY = toCanvasY(roadTopWorld + 2.2);
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('👁', obsX, obsY);
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillStyle = COLORS.sublabel;
    ctx.fillText('Observer', obsX, obsY + 14);
  }

  // ── Frame label ──
  const frameLabelMap = {
    ground: 'Ground Frame (Observer on Ground)',
    A: `Frame of ${labelA} (Observer riding ${labelA})`,
    B: `Frame of ${labelB} (Observer riding ${labelB})`,
  };
  const frameColor =
    observerFrame === 'A'
      ? COLORS.objectA
      : observerFrame === 'B'
        ? COLORS.objectB
        : COLORS.label;

  ctx.fillStyle = frameColor;
  ctx.font = 'bold 14px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(frameLabelMap[observerFrame] || 'Ground Frame', width / 2, 12);
}

/* ═══════════════════════════════════════════════════════════════════════
   drawRainScene
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Draw the rain-on-moving-person scene.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} helpers - PhysicsCanvas helpers.
 * @param {Object} state - Current state for the rain scene.
 */
export function drawRainScene(ctx, helpers, state) {
  const {
    personX = 0,
    personSpeed = 5,
    rainParticles = [],
    rainAngle = 90,
    apparentRainAngle = 0,
    umbrellaAngle = 0,
    observerFrame = 'ground',
    frameOffsetX = 0,
    showVelocityArrows = true,
    showUmbrella = true,
    rainVelGround = { x: 0, y: -8 },
    rainVelPerson = { x: -5, y: -8 },
    personVelGround = { x: 5, y: 0 },
  } = state;

  const { width, height, toCanvasX, toCanvasY, scale } = helpers;

  // ── Sky background ──
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(148, 163, 184, 0.08)');
  grad.addColorStop(1, 'rgba(186, 230, 253, 0.05)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // ── Ground ──
  const groundCanvasY = toCanvasY(0);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
  ctx.fillRect(0, groundCanvasY, width, height - groundCanvasY);

  ctx.strokeStyle = COLORS.grass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundCanvasY);
  ctx.lineTo(width, groundCanvasY);
  ctx.stroke();

  // Grass ticks
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 1;
  const groundMarkers = [];
  for (let gx = -30; gx < 60; gx += 2) {
    const wx = gx - frameOffsetX;
    const cx = toCanvasX(wx);
    if (cx < -10 || cx > width + 10) continue;
    groundMarkers.push(cx);
    ctx.beginPath();
    ctx.moveTo(cx, groundCanvasY);
    ctx.lineTo(cx - 3, groundCanvasY + 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, groundCanvasY);
    ctx.lineTo(cx + 2, groundCanvasY + 5);
    ctx.stroke();
  }

  // Trees / lampposts
  const lampPositions = [-15, -5, 5, 15, 25, 35];
  lampPositions.forEach((lp) => {
    const wx = lp - frameOffsetX;
    const cx = toCanvasX(wx);
    if (cx > -30 && cx < width + 30) {
      drawTree(ctx, cx, groundCanvasY - 1, 30);
    }
  });

  // ── Rain particles ──
  const angleForDraw =
    observerFrame === 'person'
      ? Math.atan2(-rainVelPerson.y, rainVelPerson.x)
      : Math.atan2(-rainVelGround.y, rainVelGround.x);

  const streakLen = 8;
  ctx.strokeStyle = COLORS.rain;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  rainParticles.forEach((p) => {
    const px = toCanvasX(p.x);
    const py = toCanvasY(p.y);
    if (px < -20 || px > width + 20 || py < -20 || py > height + 20) return;

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - Math.cos(angleForDraw) * streakLen, py + Math.sin(angleForDraw) * streakLen);
    ctx.stroke();
  });

  // ── Person ──
  const personCx = toCanvasX(personX);
  const personH = 2.0 * scale;
  const personGroundY = groundCanvasY;

  drawPersonFigure(ctx, personCx, personGroundY, Math.max(personH, 50), COLORS.person);

  // ── Umbrella ──
  if (showUmbrella) {
    const umbCx = personCx;
    const umbCy = personGroundY - Math.max(personH, 50) * 0.85;
    const umbR = Math.max(personH * 0.4, 22);
    const tiltRad = (-umbrellaAngle * Math.PI) / 180;

    ctx.save();
    ctx.translate(umbCx, umbCy);
    ctx.rotate(tiltRad);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.strokeStyle = COLORS.umbrella;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, umbR, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Handle
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, umbR * 0.7);
    ctx.stroke();

    ctx.restore();

    // Tilt angle label
    if (Math.abs(umbrellaAngle) > 0.5) {
      ctx.fillStyle = COLORS.umbrella;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Tilt: ${Math.abs(umbrellaAngle).toFixed(1)}°`,
        umbCx,
        umbCy - umbR - 10
      );
    }
  }

  // ── Observer marker ──
  if (observerFrame === 'person') {
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('👁', personCx, personGroundY - Math.max(personH, 50) - 10);
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillStyle = COLORS.sublabel;
    ctx.fillText('Observer', personCx, personGroundY - Math.max(personH, 50) + 2);
  }

  // ── Velocity arrows ──
  if (showVelocityArrows) {
    const arrowStartX = personCx + 40;
    const arrowStartY = toCanvasY(5);
    const maxArrowLen = 80;

    if (observerFrame === 'ground') {
      // Rain velocity (ground)
      const rainLen = Math.min(
        Math.sqrt(rainVelGround.x ** 2 + rainVelGround.y ** 2) * 5,
        maxArrowLen
      );
      if (rainLen > 3) {
        const rAngle = Math.atan2(-rainVelGround.y, rainVelGround.x);
        drawArrow(ctx, {
          fromX: arrowStartX,
          fromY: arrowStartY,
          toX: arrowStartX + Math.cos(rAngle) * rainLen,
          toY: arrowStartY - Math.sin(rAngle) * rainLen,
          color: '#3b82f6',
          lineWidth: 2.5,
          headLength: 10,
          label: 'v_rain/G',
          labelPosition: 'right',
        });
      }

      // Person velocity
      if (Math.abs(personSpeed) > 0.05) {
        const pLen = Math.min(Math.abs(personSpeed) * 5, maxArrowLen);
        drawArrow(ctx, {
          fromX: arrowStartX,
          fromY: arrowStartY + 25,
          toX: arrowStartX + pLen,
          toY: arrowStartY + 25,
          color: COLORS.objectA,
          lineWidth: 2.5,
          headLength: 10,
          label: 'v_person/G',
          labelPosition: 'right',
        });
      }
    } else {
      // Person frame: show apparent rain
      const appLen = Math.min(
        Math.sqrt(rainVelPerson.x ** 2 + rainVelPerson.y ** 2) * 5,
        maxArrowLen
      );
      if (appLen > 3) {
        const appAngle = Math.atan2(-rainVelPerson.y, rainVelPerson.x);
        drawArrow(ctx, {
          fromX: arrowStartX,
          fromY: arrowStartY,
          toX: arrowStartX + Math.cos(appAngle) * appLen,
          toY: arrowStartY - Math.sin(appAngle) * appLen,
          color: COLORS.relative,
          lineWidth: 2.5,
          headLength: 10,
          label: 'v_rain/person',
          labelPosition: 'right',
        });
      }

      ctx.fillStyle = COLORS.person;
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Person: 0 m/s (stationary)', arrowStartX, arrowStartY + 30);
    }
  }

  // ── Frame label ──
  const frameLabel =
    observerFrame === 'person'
      ? "Person's Frame (Observer walking with person)"
      : 'Ground Frame (Observer standing still)';
  ctx.fillStyle = observerFrame === 'person' ? COLORS.objectA : COLORS.label;
  ctx.font = 'bold 14px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(frameLabel, width / 2, 12);

  // ── Angle indicator ──
  const angleDisplay =
    observerFrame === 'person'
      ? `Apparent angle from vertical: ${Math.abs(state.apparentRainAngle || 0).toFixed(1)}°`
      : `Rain angle from horizontal: ${rainAngle.toFixed(0)}°`;
  ctx.fillStyle = COLORS.sublabel;
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillText(angleDisplay, width / 2, 32);
}