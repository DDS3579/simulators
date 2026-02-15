/**
 * @file RiverCrossingScene.js
 * @description Pure canvas drawing function for the river crossing scenario.
 * Draws the river with current, banks, boat, velocity vectors, boat path trail,
 * and drift markers. Supports multiple observer frames (ground, water, boat).
 *
 * NOT a React component — a pure drawing function for PhysicsCanvas draw callback.
 *
 * @module RiverCrossingScene
 */

import { drawArrow } from '../shared/vectorArrow';

const COLORS = {
  riverFill: 'rgba(59, 130, 246, 0.08)',
  riverStroke: '#93c5fd',
  currentArrow: 'rgba(59, 130, 246, 0.3)',
  bankGreen: 'rgba(16, 185, 129, 0.12)',
  bankStroke: '#10b981',
  bankLabel: '#065f46',
  boatFill: 'rgba(99, 102, 241, 0.35)',
  boatStroke: '#6366f1',
  path: '#6366f1',
  boatVelWater: '#6366f1',
  waterVelGround: '#3b82f6',
  resultant: '#10b981',
  drift: '#f59e0b',
  target: '#ef4444',
  label: '#334155',
  sublabel: '#64748b',
};

/**
 * Draw a small boat (triangle) at a position and rotation.
 */
function drawBoat(ctx, cx, cy, size, angleDeg, fill, stroke) {
  const angleRad = (angleDeg * Math.PI) / 180;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-angleRad + Math.PI / 2);

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, -size * 0.6);
  ctx.lineTo(-size * 0.35, size * 0.4);
  ctx.lineTo(0, size * 0.25);
  ctx.lineTo(size * 0.35, size * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw the river crossing scene on a canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} helpers - PhysicsCanvas helpers.
 * @param {Object} state - Current state for the river scene.
 */
export function drawRiverScene(ctx, helpers, state) {
  const {
    boatX = 0,
    boatY = 0,
    boatAngle = 90,
    riverWidth = 50,
    riverSpeed = 3,
    boatVelWater = { x: 0, y: 5 },
    waterVelGround = { x: 3, y: 0 },
    boatVelGround = { x: 3, y: 5 },
    showVelocityVectors = true,
    showPath = true,
    showVectorTriangle = true,
    path = [],
    observerFrame = 'ground',
    frameOffsetX = 0,
    frameOffsetY = 0,
    drift = 0,
    crossingTime = 10,
    canCross = true,
  } = state;

  const { width, height, toCanvasX, toCanvasY, scale } = helpers;

  // ── Scale the river for display ──
  // River occupies most of the vertical canvas space
  const displayRiverWidth = riverWidth;

  // ── Bottom bank ──
  const bottomBankTopWorld = 0;
  const bottomBankBottomWorld = -3;
  const bbtCanvas = toCanvasY(bottomBankTopWorld);
  const bbbCanvas = toCanvasY(bottomBankBottomWorld);

  ctx.fillStyle = COLORS.bankGreen;
  ctx.fillRect(0, bbtCanvas, width, bbbCanvas - bbtCanvas);

  ctx.strokeStyle = COLORS.bankStroke;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, bbtCanvas);
  ctx.lineTo(width, bbtCanvas);
  ctx.stroke();

  // Bank label
  ctx.fillStyle = COLORS.bankLabel;
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('South Bank (Start)', 10, bbtCanvas + 6);

  // ── Top bank ──
  const topBankBottomWorld = displayRiverWidth;
  const topBankTopWorld = displayRiverWidth + 3;
  const tbbCanvas = toCanvasY(topBankBottomWorld);
  const tbtCanvas = toCanvasY(topBankTopWorld);

  ctx.fillStyle = COLORS.bankGreen;
  ctx.fillRect(0, tbtCanvas, width, tbbCanvas - tbtCanvas);

  ctx.strokeStyle = COLORS.bankStroke;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, tbbCanvas);
  ctx.lineTo(width, tbbCanvas);
  ctx.stroke();

  ctx.fillStyle = COLORS.bankLabel;
  ctx.textBaseline = 'bottom';
  ctx.fillText('North Bank (Destination)', 10, tbbCanvas - 6);

  // ── River ──
  ctx.fillStyle = COLORS.riverFill;
  ctx.fillRect(0, tbbCanvas, width, bbtCanvas - tbbCanvas);

  // ── Current flow arrows ──
  const numRows = Math.max(3, Math.floor(displayRiverWidth / 8));
  const numCols = Math.max(4, Math.floor(width / 80));
  const arrowSpacingY = displayRiverWidth / (numRows + 1);
  const arrowSpacingX = width / (numCols + 1);

  ctx.strokeStyle = COLORS.currentArrow;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = COLORS.currentArrow;

  for (let r = 1; r <= numRows; r++) {
    const wy = arrowSpacingY * r;
    const cy = toCanvasY(wy);

    for (let c = 1; c <= numCols; c++) {
      // In water frame, current arrows don't move.
      // In ground frame, they should appear at fixed positions.
      let arrowCx;
      if (observerFrame === 'water') {
        arrowCx = arrowSpacingX * c;
      } else {
        const worldCx = (arrowSpacingX * c) / scale - frameOffsetX;
        arrowCx = toCanvasX(worldCx);
      }

      if (arrowCx < -20 || arrowCx > width + 20) continue;

      const arrowLen = Math.min(riverSpeed * 4, 25);
      if (arrowLen < 2) continue;

      ctx.beginPath();
      ctx.moveTo(arrowCx - arrowLen / 2, cy);
      ctx.lineTo(arrowCx + arrowLen / 2, cy);
      ctx.stroke();

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(arrowCx + arrowLen / 2, cy);
      ctx.lineTo(arrowCx + arrowLen / 2 - 5, cy - 3);
      ctx.lineTo(arrowCx + arrowLen / 2 - 5, cy + 3);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── Start position marker ──
  const startCx = toCanvasX(0 - frameOffsetX);
  ctx.strokeStyle = COLORS.sublabel;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(startCx, bbtCanvas);
  ctx.lineTo(startCx, tbbCanvas);
  ctx.stroke();
  ctx.setLineDash([]);

  // Target marker (directly across)
  ctx.strokeStyle = COLORS.target;
  ctx.lineWidth = 2;
  const targetX = startCx;
  const targetY = tbbCanvas;
  ctx.beginPath();
  ctx.moveTo(targetX - 6, targetY + 6);
  ctx.lineTo(targetX + 6, targetY - 6);
  ctx.moveTo(targetX + 6, targetY + 6);
  ctx.lineTo(targetX - 6, targetY - 6);
  ctx.stroke();

  ctx.fillStyle = COLORS.target;
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Target', targetX, targetY - 8);

  // ── Boat path trail ──
  if (showPath && path.length > 1) {
    ctx.strokeStyle = COLORS.path;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    const first = path[0];
    ctx.moveTo(toCanvasX(first.x), toCanvasY(first.y));
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(toCanvasX(path[i].x), toCanvasY(path[i].y));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // ── Boat ──
  const boatCx = toCanvasX(boatX);
  const boatCy = toCanvasY(boatY);
  const boatSize = Math.max(scale * 0.8, 14);

  drawBoat(ctx, boatCx, boatCy, boatSize, boatAngle, COLORS.boatFill, COLORS.boatStroke);

  // ── Velocity vectors at boat ──
  if (showVelocityVectors) {
    const maxArrowPx = Math.min(width * 0.18, 100);
    const velScale = maxArrowPx / Math.max(
      Math.sqrt(boatVelWater.x ** 2 + boatVelWater.y ** 2),
      Math.sqrt(waterVelGround.x ** 2 + waterVelGround.y ** 2),
      Math.sqrt(boatVelGround.x ** 2 + boatVelGround.y ** 2),
      0.1
    );

    // v_boat/water (indigo)
    const bwDx = boatVelWater.x * velScale;
    const bwDy = -boatVelWater.y * velScale;
    if (Math.abs(bwDx) > 2 || Math.abs(bwDy) > 2) {
      drawArrow(ctx, {
        fromX: boatCx,
        fromY: boatCy,
        toX: boatCx + bwDx,
        toY: boatCy + bwDy,
        color: COLORS.boatVelWater,
        lineWidth: 2.5,
        headLength: 9,
        label: 'v_b/w',
        labelPosition: 'left',
      });
    }

    // v_water/ground (blue)
    const wgDx = waterVelGround.x * velScale;
    const wgDy = -waterVelGround.y * velScale;
    if (Math.abs(wgDx) > 2 || Math.abs(wgDy) > 2) {
      const tipBw = { x: boatCx + bwDx, y: boatCy + bwDy };
      drawArrow(ctx, {
        fromX: showVectorTriangle ? tipBw.x : boatCx,
        fromY: showVectorTriangle ? tipBw.y : boatCy + 15,
        toX: (showVectorTriangle ? tipBw.x : boatCx) + wgDx,
        toY: (showVectorTriangle ? tipBw.y : boatCy + 15) + wgDy,
        color: COLORS.waterVelGround,
        lineWidth: 2.5,
        headLength: 9,
        label: 'v_w/g',
        labelPosition: 'right',
      });
    }

    // v_boat/ground (resultant, emerald, dashed)
    const bgDx = boatVelGround.x * velScale;
    const bgDy = -boatVelGround.y * velScale;
    if (Math.abs(bgDx) > 2 || Math.abs(bgDy) > 2) {
      drawArrow(ctx, {
        fromX: boatCx,
        fromY: boatCy,
        toX: boatCx + bgDx,
        toY: boatCy + bgDy,
        color: COLORS.resultant,
        lineWidth: 2.5,
        headLength: 9,
        label: 'v_b/g',
        labelPosition: 'right',
        dashed: true,
      });
    }
  }

  // ── Drift indicator ──
  if (boatY >= displayRiverWidth - 0.5 && drift !== null && Math.abs(drift) > 0.01) {
    const landingCx = toCanvasX(boatX);
    const landingCy = tbbCanvas;

    ctx.strokeStyle = COLORS.drift;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(startCx, landingCy + 4);
    ctx.lineTo(landingCx, landingCy + 4);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.drift;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Drift: ${Math.abs(drift).toFixed(1)} m`,
      (startCx + landingCx) / 2,
      landingCy + 18
    );
  }

  // ── Frame label ──
  const frameLabelMap = {
    ground: 'Ground Frame',
    water: 'Water Frame (Riding the current)',
    boat: 'Boat Frame (On the boat)',
  };
  ctx.fillStyle = COLORS.label;
  ctx.font = 'bold 14px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(frameLabelMap[observerFrame] || 'Ground Frame', width / 2, 10);

  // ── Cannot cross warning ──
  if (!canCross) {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ Boat cannot cross — no perpendicular velocity component!', width / 2, 32);
  }

  // ── Info overlay ──
  if (crossingTime !== null && canCross) {
    ctx.fillStyle = COLORS.sublabel;
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`Crossing time: ${crossingTime.toFixed(1)}s`, width - 10, 10);
    if (drift !== null) {
      ctx.fillText(
        `Expected drift: ${drift.toFixed(1)}m`,
        width - 10,
        24
      );
    }
  }

  // Observer marker
  if (observerFrame === 'boat') {
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('👁', boatCx, boatCy - boatSize - 8);
  }
}