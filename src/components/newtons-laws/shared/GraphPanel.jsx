/**
 * @module GraphPanel
 *
 * @description
 * A reusable real-time graph renderer using Canvas. Can plot any x-y data
 * including Force-Time, Velocity-Time, Momentum-Time, or Energy curves.
 * Supports multiple datasets, filled areas, dashed lines, annotations
 * (vertical/horizontal lines, points, text), auto-scaling, and legends.
 *
 * Uses useCanvasSetup from Phase 1 for responsive, DPI-aware rendering.
 *
 * @purpose
 * Multiple simulators need graphs: ImpulseMomentum needs Force-Time,
 * Conservation could show Momentum-Time or Velocity-Time. This shared
 * component handles all the canvas graph rendering boilerplate so each
 * simulator only specifies datasets and labels.
 *
 * @dependents
 * - ForceTimeGraph.jsx (wraps this with impulse-specific datasets)
 * - ImpulseMomentum.jsx (may use directly for additional graphs)
 * - MomentumConservation.jsx (may use for momentum-time plots)
 *
 * @example
 * ```jsx
 * import GraphPanel from '../shared/GraphPanel';
 *
 * // Simple sine wave
 * <GraphPanel
 *   title="Force vs Time"
 *   xLabel="Time (s)"
 *   yLabel="Force (N)"
 *   datasets={[{
 *     label: 'F(t)',
 *     data: sineData,
 *     color: '#ef4444',
 *     lineWidth: 2,
 *     fill: true,
 *     fillColor: 'rgba(239, 68, 68, 0.15)',
 *   }]}
 *   xRange={{ min: 0, max: 0.1 }}
 *   yRange={{ min: 0, max: 500 }}
 *   annotations={[
 *     { type: 'hline', y: 300, label: 'F_avg', color: '#f59e0b' },
 *     { type: 'vline', x: 0.05, label: 'Δt', color: '#94a3b8' },
 *   ]}
 * />
 *
 * // Multiple datasets with auto-scale
 * <GraphPanel
 *   title="Momentum vs Time"
 *   xLabel="Time (s)"
 *   yLabel="Momentum (kg·m/s)"
 *   datasets={[
 *     { label: 'p₁', data: p1Data, color: '#6366f1' },
 *     { label: 'p₂', data: p2Data, color: '#f59e0b' },
 *     { label: 'p_total', data: pTotalData, color: '#8b5cf6', dashed: true },
 *   ]}
 *   autoScale
 *   showLegend
 * />
 * ```
 */

import { useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useCanvasSetup } from '../../../hooks/newtons-laws/useCanvasSetup';

// ─── Color Constants ──────────────────────────────────────────────
const BG_COLOR = '#ffffff';
const GRID_COLOR = '#e2e8f0';
const AXIS_COLOR = '#94a3b8';
const TICK_COLOR = '#94a3b8';
const TITLE_COLOR = '#334155';
const LABEL_COLOR = '#64748b';
const LEGEND_BG = 'rgba(255, 255, 255, 0.92)';
const LEGEND_BORDER = '#e2e8f0';
const ZERO_AXIS_COLOR = '#cbd5e1';

// ─── Font Constants ───────────────────────────────────────────────
const TITLE_FONT = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const LABEL_FONT = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const TICK_FONT = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const LEGEND_FONT = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const ANNOTATION_FONT = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

// ─── Layout Constants ─────────────────────────────────────────────
const PADDING = { top: 30, right: 20, bottom: 45, left: 55 };

/**
 * Calculate a "nice" interval for axis grid lines.
 *
 * @param {number} range - Total axis range
 * @param {number} [targetDivisions=6] - Approximate number of divisions
 * @returns {number} Clean interval value (multiple of 1, 2, or 5 × 10^n)
 */
function getNiceInterval(range, targetDivisions = 6) {
  if (range <= 0) return 1;
  const rawInterval = range / targetDivisions;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
  const residual = rawInterval / magnitude;

  let nice;
  if (residual <= 1.5) nice = 1;
  else if (residual <= 3.5) nice = 2;
  else if (residual <= 7.5) nice = 5;
  else nice = 10;

  return nice * magnitude;
}

/**
 * Format a tick value for axis labels.
 *
 * @param {number} value
 * @param {number} interval
 * @returns {string}
 */
function formatTick(value, interval) {
  if (Math.abs(value) < interval * 0.001) return '0';
  const decimals = Math.max(0, -Math.floor(Math.log10(interval)));
  return value.toFixed(decimals);
}

/**
 * GraphPanel — A reusable canvas-based graph component.
 */
function GraphPanel({
  title = '',
  xLabel = '',
  yLabel = '',
  datasets,
  xRange,
  yRange,
  autoScale = true,
  annotations = [],
  aspectRatio = 0.5,
  showLegend,
  renderTrigger = 0,
  className = '',
}) {
  const { canvasRef, containerRef, dimensions, dpr, getCtx } = useCanvasSetup({
    aspectRatio,
    minHeight: 150,
    maxHeight: 300,
  });

  // ─── Calculate axis ranges ─────────────────────────────────
  const axisRanges = useMemo(() => {
    let xMin, xMax, yMin, yMax;

    if (xRange) {
      xMin = xRange.min;
      xMax = xRange.max;
    } else if (autoScale && datasets.length > 0) {
      xMin = Infinity;
      xMax = -Infinity;
      for (const ds of datasets) {
        for (const pt of ds.data) {
          if (pt.x < xMin) xMin = pt.x;
          if (pt.x > xMax) xMax = pt.x;
        }
      }
      if (!isFinite(xMin)) { xMin = 0; xMax = 1; }
      const xPad = (xMax - xMin) * 0.1 || 0.5;
      xMin -= xPad;
      xMax += xPad;
    } else {
      xMin = 0;
      xMax = 1;
    }

    if (yRange) {
      yMin = yRange.min;
      yMax = yRange.max;
    } else if (autoScale && datasets.length > 0) {
      yMin = Infinity;
      yMax = -Infinity;
      for (const ds of datasets) {
        for (const pt of ds.data) {
          if (pt.y < yMin) yMin = pt.y;
          if (pt.y > yMax) yMax = pt.y;
        }
      }
      if (!isFinite(yMin)) { yMin = 0; yMax = 1; }
      const yPad = (yMax - yMin) * 0.1 || 0.5;
      yMin -= yPad;
      yMax += yPad;
    } else {
      yMin = 0;
      yMax = 1;
    }

    // Ensure ranges are non-zero
    if (Math.abs(xMax - xMin) < 1e-10) { xMin -= 0.5; xMax += 0.5; }
    if (Math.abs(yMax - yMin) < 1e-10) { yMin -= 0.5; yMax += 0.5; }

    return { xMin, xMax, yMin, yMax };
  }, [datasets, xRange, yRange, autoScale]);

  // ─── Coordinate transform functions ────────────────────────
  const transforms = useMemo(() => {
    const { width, height } = dimensions;
    const { xMin, xMax, yMin, yMax } = axisRanges;

    const plotW = width - PADDING.left - PADDING.right;
    const plotH = height - PADDING.top - PADDING.bottom;

    const scaleX = plotW / (xMax - xMin);
    const scaleY = plotH / (yMax - yMin);

    const toPixelX = (x) => PADDING.left + (x - xMin) * scaleX;
    const toPixelY = (y) => height - PADDING.bottom - (y - yMin) * scaleY;

    return { plotW, plotH, scaleX, scaleY, toPixelX, toPixelY };
  }, [dimensions, axisRanges]);

  // ─── Render function ───────────────────────────────────────
  const renderGraph = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;

    const { width, height } = dimensions;
    const { xMin, xMax, yMin, yMax } = axisRanges;
    const { toPixelX, toPixelY, plotW, plotH } = transforms;

    ctx.save();
    ctx.scale(dpr, dpr);

    // ── Clear ─────────────────────────────────────────────
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    // ── Border ────────────────────────────────────────────
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, width - 1, height - 1, 8);
    ctx.stroke();

    // ── Clip to plot area for data rendering ──────────────
    ctx.save();
    ctx.beginPath();
    ctx.rect(PADDING.left, PADDING.top, plotW, plotH);
    ctx.clip();

    // ── Draw grid ─────────────────────────────────────────
    drawGrid(ctx, axisRanges, transforms, dimensions);

    // ── Draw zero axes (if within range) ──────────────────
    drawZeroAxes(ctx, axisRanges, transforms, dimensions);

    // ── Draw datasets ─────────────────────────────────────
    for (const ds of datasets) {
      drawDataset(ctx, ds, transforms, dimensions, axisRanges);
    }

    // ── Draw annotations ──────────────────────────────────
    for (const ann of annotations) {
      drawAnnotation(ctx, ann, transforms, dimensions);
    }

    ctx.restore(); // remove clip

    // ── Draw tick labels (outside clip) ───────────────────
    drawTickLabels(ctx, axisRanges, transforms, dimensions);

    // ── Draw axis labels ──────────────────────────────────
    drawAxisLabels(ctx, xLabel, yLabel, dimensions);

    // ── Draw title ────────────────────────────────────────
    if (title) {
      ctx.font = TITLE_FONT;
      ctx.fillStyle = TITLE_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(title, width / 2, 6);
    }

    // ── Draw legend ───────────────────────────────────────
    const shouldShowLegend = showLegend !== undefined
      ? showLegend
      : datasets.length > 1;

    if (shouldShowLegend) {
      drawLegend(ctx, datasets, dimensions);
    }

    ctx.restore();
  }, [getCtx, dpr, dimensions, axisRanges, transforms, datasets, annotations, title, xLabel, yLabel, showLegend]);

  // ─── Trigger re-render ─────────────────────────────────────
  useEffect(() => {
    renderGraph();
  }, [renderGraph, renderTrigger]);

  // ─── JSX ───────────────────────────────────────────────────
  return (
    <div className={`${className}`}>
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// INTERNAL DRAWING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Draw grid lines with nice intervals.
 */
function drawGrid(ctx, ranges, transforms, dimensions) {
  const { xMin, xMax, yMin, yMax } = ranges;
  const { toPixelX, toPixelY } = transforms;
  const { height } = dimensions;

  const xInterval = getNiceInterval(xMax - xMin);
  const yInterval = getNiceInterval(yMax - yMin);

  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;

  // Vertical grid lines
  const xStart = Math.ceil(xMin / xInterval) * xInterval;
  for (let x = xStart; x <= xMax; x += xInterval) {
    x = Math.round(x / xInterval) * xInterval;
    const px = toPixelX(x);
    ctx.beginPath();
    ctx.moveTo(px, PADDING.top);
    ctx.lineTo(px, height - PADDING.bottom);
    ctx.stroke();
  }

  // Horizontal grid lines
  const yStart = Math.ceil(yMin / yInterval) * yInterval;
  for (let y = yStart; y <= yMax; y += yInterval) {
    y = Math.round(y / yInterval) * yInterval;
    const py = toPixelY(y);
    ctx.beginPath();
    ctx.moveTo(PADDING.left, py);
    ctx.lineTo(PADDING.left + transforms.plotW, py);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw zero-axis lines (x=0 and y=0) if they fall within the visible range.
 */
function drawZeroAxes(ctx, ranges, transforms, dimensions) {
  const { xMin, xMax, yMin, yMax } = ranges;
  const { toPixelX, toPixelY, plotW } = transforms;
  const { height } = dimensions;

  ctx.save();
  ctx.strokeStyle = ZERO_AXIS_COLOR;
  ctx.lineWidth = 1;

  // Y=0 horizontal line
  if (yMin <= 0 && yMax >= 0) {
    const y0 = toPixelY(0);
    ctx.beginPath();
    ctx.moveTo(PADDING.left, y0);
    ctx.lineTo(PADDING.left + plotW, y0);
    ctx.stroke();
  }

  // X=0 vertical line
  if (xMin <= 0 && xMax >= 0) {
    const x0 = toPixelX(0);
    ctx.beginPath();
    ctx.moveTo(x0, PADDING.top);
    ctx.lineTo(x0, height - PADDING.bottom);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw tick labels along both axes.
 */
function drawTickLabels(ctx, ranges, transforms, dimensions) {
  const { xMin, xMax, yMin, yMax } = ranges;
  const { toPixelX, toPixelY } = transforms;
  const { height } = dimensions;

  const xInterval = getNiceInterval(xMax - xMin);
  const yInterval = getNiceInterval(yMax - yMin);

  ctx.save();
  ctx.font = TICK_FONT;
  ctx.fillStyle = TICK_COLOR;

  // X-axis tick labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const xStart = Math.ceil(xMin / xInterval) * xInterval;
  for (let x = xStart; x <= xMax; x += xInterval) {
    x = Math.round(x / xInterval) * xInterval;
    const px = toPixelX(x);
    ctx.fillText(formatTick(x, xInterval), px, height - PADDING.bottom + 5);
  }

  // Y-axis tick labels
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const yStart = Math.ceil(yMin / yInterval) * yInterval;
  for (let y = yStart; y <= yMax; y += yInterval) {
    y = Math.round(y / yInterval) * yInterval;
    const py = toPixelY(y);
    ctx.fillText(formatTick(y, yInterval), PADDING.left - 6, py);
  }

  ctx.restore();
}

/**
 * Draw x and y axis labels.
 */
function drawAxisLabels(ctx, xLabel, yLabel, dimensions) {
  const { width, height } = dimensions;

  ctx.save();

  if (xLabel) {
    ctx.font = LABEL_FONT;
    ctx.fillStyle = LABEL_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(xLabel, PADDING.left + (width - PADDING.left - PADDING.right) / 2, height - 4);
  }

  if (yLabel) {
    ctx.font = LABEL_FONT;
    ctx.fillStyle = LABEL_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.save();
    ctx.translate(12, PADDING.top + (height - PADDING.top - PADDING.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draw a single dataset (line + optional fill).
 */
function drawDataset(ctx, dataset, transforms, dimensions, ranges) {
  const { data, color = '#6366f1', lineWidth = 2, dashed = false, fill = false, fillColor } = dataset;

  if (!data || data.length === 0) return;

  const { toPixelX, toPixelY } = transforms;
  const { height } = dimensions;
  const baselineY = toPixelY(Math.max(0, ranges.yMin));

  ctx.save();

  // ── Fill area under curve ───────────────────────────────
  if (fill) {
    ctx.beginPath();
    ctx.moveTo(toPixelX(data[0].x), baselineY);

    for (let i = 0; i < data.length; i++) {
      ctx.lineTo(toPixelX(data[i].x), toPixelY(data[i].y));
    }

    ctx.lineTo(toPixelX(data[data.length - 1].x), baselineY);
    ctx.closePath();
    ctx.fillStyle = fillColor || `${color}26`; // 15% opacity fallback
    ctx.fill();
  }

  // ── Draw line ───────────────────────────────────────────
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (dashed) {
    ctx.setLineDash([6, 3]);
  }

  let started = false;
  for (let i = 0; i < data.length; i++) {
    const px = toPixelX(data[i].x);
    const py = toPixelY(data[i].y);

    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.stroke();

  if (dashed) {
    ctx.setLineDash([]);
  }

  ctx.restore();
}

/**
 * Draw a single annotation.
 */
function drawAnnotation(ctx, annotation, transforms, dimensions) {
  const { type, x, y, x2, label, color = '#94a3b8' } = annotation;
  const { toPixelX, toPixelY, plotW } = transforms;
  const { height } = dimensions;

  ctx.save();

  switch (type) {
    case 'vline': {
      const px = toPixelX(x);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(px, PADDING.top);
      ctx.lineTo(px, height - PADDING.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      if (label) {
        ctx.font = ANNOTATION_FONT;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        drawAnnotationLabel(ctx, px, PADDING.top + 12, label, color);
      }
      break;
    }

    case 'hline': {
      const py = toPixelY(y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, py);
      ctx.lineTo(PADDING.left + plotW, py);
      ctx.stroke();
      ctx.setLineDash([]);

      if (label) {
        ctx.font = ANNOTATION_FONT;
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        drawAnnotationLabel(ctx, PADDING.left + 4, py - 4, label, color);
      }
      break;
    }

    case 'point': {
      const px = toPixelX(x);
      const py = toPixelY(y);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      // White ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.stroke();

      if (label) {
        drawAnnotationLabel(ctx, px + 8, py - 4, label, color);
      }
      break;
    }

    case 'area': {
      const px1 = toPixelX(x);
      const px2 = toPixelX(x2 || x);
      const py1 = PADDING.top;
      const py2 = height - PADDING.bottom;

      ctx.fillStyle = color.includes('rgba') ? color : `${color}15`;
      ctx.fillRect(px1, py1, px2 - px1, py2 - py1);

      if (label) {
        const cx = (px1 + px2) / 2;
        const cy = (py1 + py2) / 2;
        drawAnnotationLabel(ctx, cx, cy, label, color.replace(/[\d.]+\)$/, '1)'));
      }
      break;
    }

    case 'text': {
      const px = toPixelX(x);
      const py = toPixelY(y);
      drawAnnotationLabel(ctx, px, py, label, color);
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

/**
 * Draw a text label with a semi-transparent background pill for readability.
 */
function drawAnnotationLabel(ctx, x, y, text, color) {
  ctx.save();
  ctx.font = ANNOTATION_FONT;

  const metrics = ctx.measureText(text);
  const tw = metrics.width;
  const th = 13;
  const pad = 3;

  // Background pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.beginPath();
  ctx.roundRect(x - pad, y - th / 2 - pad, tw + pad * 2, th + pad * 2, 3);
  ctx.fill();

  // Text
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);

  ctx.restore();
}

/**
 * Draw a legend box in the top-right corner of the plot area.
 */
function drawLegend(ctx, datasets, dimensions) {
  const { width } = dimensions;

  const visibleDatasets = datasets.filter((ds) => ds.label);
  if (visibleDatasets.length === 0) return;

  ctx.save();
  ctx.font = LEGEND_FONT;

  // Measure legend items
  const itemHeight = 16;
  const swatchSize = 8;
  const itemGap = 4;
  const legendPad = 8;

  let maxLabelWidth = 0;
  for (const ds of visibleDatasets) {
    const w = ctx.measureText(ds.label).width;
    if (w > maxLabelWidth) maxLabelWidth = w;
  }

  const legendW = swatchSize + 6 + maxLabelWidth + legendPad * 2;
  const legendH = visibleDatasets.length * (itemHeight + itemGap) - itemGap + legendPad * 2;

  const legendX = width - PADDING.right - legendW - 4;
  const legendY = PADDING.top + 4;

  // Background
  ctx.fillStyle = LEGEND_BG;
  ctx.strokeStyle = LEGEND_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(legendX, legendY, legendW, legendH, 4);
  ctx.fill();
  ctx.stroke();

  // Items
  for (let i = 0; i < visibleDatasets.length; i++) {
    const ds = visibleDatasets[i];
    const itemY = legendY + legendPad + i * (itemHeight + itemGap);

    // Color swatch (line style)
    const swatchY = itemY + itemHeight / 2;
    ctx.strokeStyle = ds.color || '#6366f1';
    ctx.lineWidth = ds.dashed ? 1.5 : 2;

    if (ds.dashed) {
      ctx.setLineDash([3, 2]);
    }

    ctx.beginPath();
    ctx.moveTo(legendX + legendPad, swatchY);
    ctx.lineTo(legendX + legendPad + swatchSize, swatchY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Filled circle on swatch if dataset has fill
    if (ds.fill) {
      ctx.fillStyle = ds.fillColor || `${ds.color}40`;
      ctx.beginPath();
      ctx.arc(legendX + legendPad + swatchSize / 2, swatchY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(ds.label, legendX + legendPad + swatchSize + 6, swatchY);
  }

  ctx.restore();
}

// ─── PropTypes ────────────────────────────────────────────────────

const dataPointShape = PropTypes.shape({
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
});

const datasetShape = PropTypes.shape({
  /** Legend label for this dataset */
  label: PropTypes.string,
  /** Array of {x, y} data points */
  data: PropTypes.arrayOf(dataPointShape).isRequired,
  /** Line color (CSS color string). Default: '#6366f1' */
  color: PropTypes.string,
  /** Line width in pixels. Default: 2 */
  lineWidth: PropTypes.number,
  /** Whether to draw a dashed line. Default: false */
  dashed: PropTypes.bool,
  /** Whether to fill the area under the curve. Default: false */
  fill: PropTypes.bool,
  /** Fill color (should include alpha). Default: color at 15% opacity */
  fillColor: PropTypes.string,
});

const rangeShape = PropTypes.shape({
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
});

const annotationShape = PropTypes.shape({
  /** Annotation type */
  type: PropTypes.oneOf(['vline', 'hline', 'point', 'area', 'text']).isRequired,
  /** X coordinate (data space) */
  x: PropTypes.number,
  /** Y coordinate (data space) */
  y: PropTypes.number,
  /** Second X coordinate for 'area' type */
  x2: PropTypes.number,
  /** Text label */
  label: PropTypes.string,
  /** CSS color string */
  color: PropTypes.string,
});

GraphPanel.propTypes = {
  /** Graph title displayed at the top center */
  title: PropTypes.string,

  /** X-axis label */
  xLabel: PropTypes.string,

  /** Y-axis label */
  yLabel: PropTypes.string,

  /** Array of datasets to plot */
  datasets: PropTypes.arrayOf(datasetShape).isRequired,

  /** Fixed X-axis range. Overrides autoScale for X. */
  xRange: rangeShape,

  /** Fixed Y-axis range. Overrides autoScale for Y. */
  yRange: rangeShape,

  /** Auto-fit axes to data with 10% padding. Default: true */
  autoScale: PropTypes.bool,

  /** Optional markers/labels on the graph */
  annotations: PropTypes.arrayOf(annotationShape),

  /** Canvas height-to-width ratio. Default: 0.5 */
  aspectRatio: PropTypes.number,

  /** Show legend box. Default: true if multiple datasets. */
  showLegend: PropTypes.bool,

  /** Incrementing number that triggers re-render */
  renderTrigger: PropTypes.number,

  /** Additional CSS classes for the wrapper div */
  className: PropTypes.string,
};

GraphPanel.defaultProps = {
  title: '',
  xLabel: '',
  yLabel: '',
  xRange: undefined,
  yRange: undefined,
  autoScale: true,
  annotations: [],
  aspectRatio: 0.5,
  showLegend: undefined,
  renderTrigger: 0,
  className: '',
};

export default GraphPanel;