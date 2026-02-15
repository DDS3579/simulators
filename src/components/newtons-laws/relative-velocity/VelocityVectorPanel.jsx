/**
 * @file VelocityVectorPanel.jsx
 * @description Displays velocity vector breakdowns for all relative velocity modes.
 * For 1D mode, shows horizontal bars representing velocities. For 2D modes (river, rain),
 * draws a mini vector triangle canvas and a numerical summary table.
 *
 * @module VelocityVectorPanel
 */

import React, { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ArrowRight } from 'lucide-react';

const COLORS = {
  objectA: '#6366f1',
  objectB: '#f59e0b',
  relative: '#8b5cf6',
  boatWater: '#6366f1',
  waterGround: '#3b82f6',
  resultant: '#10b981',
  rainGround: '#3b82f6',
  personGround: '#6366f1',
  rainPerson: '#8b5cf6',
};

/**
 * Small horizontal bar for 1D velocity display.
 */
function VelocityBar({ label, value, unit, color, maxVal }) {
  const safeMax = Math.max(maxVal, 0.1);
  const fraction = Math.abs(value) / safeMax;
  const widthPercent = Math.min(fraction * 100, 100);
  const isNeg = value < 0;

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="font-mono font-bold" style={{ color }}>
          {value >= 0 ? '+' : ''}{value.toFixed(1)} {unit}
        </span>
      </div>
      <div className="h-3.5 bg-gray-100 rounded-full relative overflow-hidden">
        {/* Center line for ±0 */}
        <div className="absolute top-0 h-full w-px bg-slate-300 left-1/2 z-10" />
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-300"
          style={{
            backgroundColor: color,
            opacity: 0.7,
            width: `${widthPercent / 2}%`,
            left: isNeg ? `${50 - widthPercent / 2}%` : '50%',
          }}
        />
      </div>
    </div>
  );
}

VelocityBar.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  unit: PropTypes.string,
  color: PropTypes.string,
  maxVal: PropTypes.number,
};

VelocityBar.defaultProps = {
  unit: 'm/s',
  color: '#6366f1',
  maxVal: 30,
};

/**
 * Mini canvas for drawing vector triangles in 2D modes.
 */
function VectorTriangleCanvas({ vectors, labels, colors, width: canvasW, height: canvasH }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvasW, canvasH);

    // Find scale to fit all vectors
    let maxMag = 1;
    vectors.forEach((v) => {
      const mag = Math.sqrt(v.x * v.x + v.y * v.y);
      if (mag > maxMag) maxMag = mag;
    });

    const padding = 45;
    const drawArea = Math.min(canvasW, canvasH) - padding * 2;
    const pixPerUnit = drawArea / (maxMag * 2.5);

    const originX = padding + 20;
    const originY = canvasH / 2;

    // Draw vectors tip-to-tail
    let tipX = originX;
    let tipY = originY;

    vectors.forEach((v, i) => {
      const dx = v.x * pixPerUnit;
      const dy = -v.y * pixPerUnit;
      const endX = tipX + dx;
      const endY = tipY + dy;

      const color = colors[i] || '#6366f1';
      const label = labels[i] || '';

      // Arrow line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      if (i === vectors.length - 1) {
        ctx.setLineDash([6, 3]);
      }
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      const angle = Math.atan2(endY - tipY, endX - tipX);
      const headLen = 8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLen * Math.cos(angle - Math.PI / 6),
        endY - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - headLen * Math.cos(angle + Math.PI / 6),
        endY - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // Label
      const midX = (tipX + endX) / 2;
      const midY = (tipY + endY) / 2;
      const perpX = -Math.sin(angle) * 14;
      const perpY = Math.cos(angle) * 14;

      ctx.fillStyle = color;
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, midX + perpX, midY + perpY);

      if (i < vectors.length - 1) {
        tipX = endX;
        tipY = endY;
      }
    });

    // Origin dot
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(originX, originY, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [vectors, labels, colors, canvasW, canvasH]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: canvasW, height: canvasH }}
      className="rounded-lg border border-gray-200 bg-white"
    />
  );
}

VectorTriangleCanvas.propTypes = {
  vectors: PropTypes.arrayOf(PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }))
    .isRequired,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
};

VectorTriangleCanvas.defaultProps = {
  width: 280,
  height: 160,
};

/**
 * VelocityVectorPanel displays velocity breakdowns for all modes.
 */
const VelocityVectorPanel = ({
  mode,
  observerFrame,
  vA,
  vB,
  vArelB,
  vBrelA,
  boatVelWater,
  waterVelGround,
  boatVelGround,
  resultantSpeed,
  resultantAngle,
  rainVelGround,
  personVelGround,
  rainVelPerson,
  apparentRainSpeed,
  apparentAngleFromVertical,
  className,
}) => {
  return (
    <div
      className={`bg-white rounded-xl shadow-lg border border-gray-100 p-4 ${className}`}
    >
      <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
        <ArrowRight size={16} className="text-indigo-500" />
        Velocity Vectors
      </h3>

      {/* ── 1D Mode ── */}
      {mode === '1d' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Ground Frame Velocities
          </div>
          <VelocityBar
            label="v_A/G (A rel. Ground)"
            value={vA}
            color={COLORS.objectA}
            maxVal={Math.max(Math.abs(vA), Math.abs(vB), Math.abs(vArelB), 1)}
          />
          <VelocityBar
            label="v_B/G (B rel. Ground)"
            value={vB}
            color={COLORS.objectB}
            maxVal={Math.max(Math.abs(vA), Math.abs(vB), Math.abs(vArelB), 1)}
          />

          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">
              Relative Velocities
            </div>
            <VelocityBar
              label="v_A/B = v_A/G − v_B/G"
              value={vArelB}
              color={COLORS.relative}
              maxVal={Math.max(Math.abs(vA), Math.abs(vB), Math.abs(vArelB), 1)}
            />
            <VelocityBar
              label="v_B/A = v_B/G − v_A/G"
              value={vBrelA}
              color={COLORS.relative}
              maxVal={Math.max(Math.abs(vA), Math.abs(vB), Math.abs(vBrelA), 1)}
            />
          </div>

          {/* Derivation */}
          <div className="bg-slate-50 rounded-lg p-2 text-xs font-mono text-slate-700 space-y-0.5">
            <div>v_A/B = v_A/G − v_B/G</div>
            <div>
              v_A/B = {vA >= 0 ? '' : '('}{vA.toFixed(1)}{vA < 0 ? ')' : ''} −{' '}
              {vB >= 0 ? '' : '('}{vB.toFixed(1)}{vB < 0 ? ')' : ''} ={' '}
              <span className="font-bold text-purple-600">{vArelB.toFixed(1)} m/s</span>
            </div>
          </div>
        </div>
      )}

      {/* ── River Mode ── */}
      {mode === 'river' && boatVelWater && waterVelGround && boatVelGround && (
        <div className="space-y-3">
          <VectorTriangleCanvas
            vectors={[boatVelWater, waterVelGround, boatVelGround]}
            labels={['v_b/w', 'v_w/g', 'v_b/g']}
            colors={[COLORS.boatWater, COLORS.waterGround, COLORS.resultant]}
          />

          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Vector Addition: v⃗_b/g = v⃗_b/w + v⃗_w/g
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 text-slate-600 font-semibold">Vector</th>
                  <th className="text-right py-1 text-slate-600">x (m/s)</th>
                  <th className="text-right py-1 text-slate-600">y (m/s)</th>
                  <th className="text-right py-1 text-slate-600">|v| (m/s)</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr>
                  <td className="py-1 font-semibold" style={{ color: COLORS.boatWater }}>
                    v_boat/water
                  </td>
                  <td className="text-right">{boatVelWater.x.toFixed(2)}</td>
                  <td className="text-right">{boatVelWater.y.toFixed(2)}</td>
                  <td className="text-right">
                    {Math.sqrt(boatVelWater.x ** 2 + boatVelWater.y ** 2).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold" style={{ color: COLORS.waterGround }}>
                    v_water/ground
                  </td>
                  <td className="text-right">{waterVelGround.x.toFixed(2)}</td>
                  <td className="text-right">{waterVelGround.y.toFixed(2)}</td>
                  <td className="text-right">
                    {Math.sqrt(waterVelGround.x ** 2 + waterVelGround.y ** 2).toFixed(2)}
                  </td>
                </tr>
                <tr className="border-t border-gray-200 font-bold">
                  <td className="py-1" style={{ color: COLORS.resultant }}>
                    v_boat/ground
                  </td>
                  <td className="text-right">{boatVelGround.x.toFixed(2)}</td>
                  <td className="text-right">{boatVelGround.y.toFixed(2)}</td>
                  <td className="text-right">{(resultantSpeed || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 rounded p-2 font-mono">
            Resultant angle: {(resultantAngle || 0).toFixed(1)}° from downstream
          </div>
        </div>
      )}

      {/* ── Rain Mode ── */}
      {mode === 'rain' && rainVelGround && personVelGround && rainVelPerson && (
        <div className="space-y-3">
          <VectorTriangleCanvas
            vectors={[
              rainVelGround,
              { x: -personVelGround.x, y: -personVelGround.y },
              rainVelPerson,
            ]}
            labels={['v_rain/G', '−v_person', 'v_rain/P']}
            colors={[COLORS.rainGround, COLORS.personGround, COLORS.rainPerson]}
          />

          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Vector Subtraction: v⃗_rain/P = v⃗_rain/G − v⃗_person/G
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1 text-slate-600 font-semibold">Vector</th>
                  <th className="text-right py-1 text-slate-600">x (m/s)</th>
                  <th className="text-right py-1 text-slate-600">y (m/s)</th>
                  <th className="text-right py-1 text-slate-600">|v| (m/s)</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr>
                  <td className="py-1 font-semibold" style={{ color: COLORS.rainGround }}>
                    v_rain/ground
                  </td>
                  <td className="text-right">{rainVelGround.x.toFixed(2)}</td>
                  <td className="text-right">{rainVelGround.y.toFixed(2)}</td>
                  <td className="text-right">
                    {Math.sqrt(rainVelGround.x ** 2 + rainVelGround.y ** 2).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold" style={{ color: COLORS.personGround }}>
                    v_person/ground
                  </td>
                  <td className="text-right">{personVelGround.x.toFixed(2)}</td>
                  <td className="text-right">{personVelGround.y.toFixed(2)}</td>
                  <td className="text-right">
                    {Math.sqrt(personVelGround.x ** 2 + personVelGround.y ** 2).toFixed(2)}
                  </td>
                </tr>
                <tr className="border-t border-gray-200 font-bold">
                  <td className="py-1" style={{ color: COLORS.rainPerson }}>
                    v_rain/person
                  </td>
                  <td className="text-right">{rainVelPerson.x.toFixed(2)}</td>
                  <td className="text-right">{rainVelPerson.y.toFixed(2)}</td>
                  <td className="text-right">{(apparentRainSpeed || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 rounded p-2 font-mono">
            Apparent angle from vertical: {(apparentAngleFromVertical || 0).toFixed(1)}°
          </div>
        </div>
      )}
    </div>
  );
};

VelocityVectorPanel.propTypes = {
  mode: PropTypes.oneOf(['1d', 'river', 'rain']).isRequired,
  observerFrame: PropTypes.string.isRequired,
  vA: PropTypes.number,
  vB: PropTypes.number,
  vArelB: PropTypes.number,
  vBrelA: PropTypes.number,
  boatVelWater: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  waterVelGround: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  boatVelGround: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  resultantSpeed: PropTypes.number,
  resultantAngle: PropTypes.number,
  rainVelGround: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  personVelGround: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  rainVelPerson: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  apparentRainSpeed: PropTypes.number,
  apparentAngleFromVertical: PropTypes.number,
  className: PropTypes.string,
};

VelocityVectorPanel.defaultProps = {
  vA: 0,
  vB: 0,
  vArelB: 0,
  vBrelA: 0,
  boatVelWater: null,
  waterVelGround: null,
  boatVelGround: null,
  resultantSpeed: 0,
  resultantAngle: 0,
  rainVelGround: null,
  personVelGround: null,
  rainVelPerson: null,
  apparentRainSpeed: 0,
  apparentAngleFromVertical: 0,
  className: '',
};

export default VelocityVectorPanel;