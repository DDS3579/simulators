/**
 * @module useCanvasSetup
 *
 * @description
 * A custom React hook that handles canvas element sizing, DPI scaling, and
 * ResizeObserver attachment for responsive, retina-crisp canvas rendering.
 * Returns refs for the canvas and its container, current dimensions, device
 * pixel ratio, and a context getter function.
 *
 * This hook abstracts away the boilerplate of:
 * - Setting up a ResizeObserver to track container width
 * - Calculating height from an aspect ratio with min/max constraints
 * - Scaling the canvas buffer for devicePixelRatio (retina displays)
 * - Keeping CSS dimensions and buffer dimensions in sync
 *
 * @purpose
 * Every simulator has a canvas. Without this hook, every simulator copies
 * the same ~25 lines of ResizeObserver + DPI scaling code. This hook
 * centralizes that logic so canvas setup is consistent and bug-free.
 *
 * @dependents
 * - PhysicsCanvas.jsx (primary consumer)
 * - Indirectly: every simulator page component via PhysicsCanvas
 *
 * @note
 * The returned context from getCtx() is the RAW context — it has NOT been
 * pre-scaled by devicePixelRatio. The consumer MUST call:
 *   ctx.save();
 *   ctx.scale(dpr, dpr);
 *   // ... draw using CSS pixel coordinates ...
 *   ctx.restore();
 * This prevents scale compounding across multiple draw calls.
 *
 * @example
 * ```jsx
 * import { useCanvasSetup } from '@/hooks/newtons-laws/useCanvasSetup';
 *
 * function MyCanvas() {
 *   const { canvasRef, containerRef, dimensions, dpr, getCtx } = useCanvasSetup({
 *     aspectRatio: 0.55,
 *     minHeight: 300,
 *     maxHeight: 600,
 *   });
 *
 *   useEffect(() => {
 *     const ctx = getCtx();
 *     if (!ctx) return;
 *
 *     ctx.save();
 *     ctx.scale(dpr, dpr);
 *
 *     // Clear
 *     ctx.fillStyle = '#fafbff';
 *     ctx.fillRect(0, 0, dimensions.width, dimensions.height);
 *
 *     // Draw a circle at center
 *     ctx.beginPath();
 *     ctx.arc(dimensions.width / 2, dimensions.height / 2, 20, 0, Math.PI * 2);
 *     ctx.fillStyle = '#6366f1';
 *     ctx.fill();
 *
 *     ctx.restore();
 *   }, [dimensions]);
 *
 *   return (
 *     <div ref={containerRef} className="w-full">
 *       <canvas ref={canvasRef} className="w-full rounded-lg" />
 *     </div>
 *   );
 * }
 * ```
 */

import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * @typedef {Object} CanvasSetupConfig
 * @property {number} [aspectRatio=0.55]
 *   Height-to-width ratio. E.g., 0.55 means height = 55% of width.
 * @property {number} [minHeight=300]
 *   Minimum canvas height in CSS pixels.
 * @property {number} [maxHeight=600]
 *   Maximum canvas height in CSS pixels.
 */

/**
 * @typedef {Object} CanvasSetupReturn
 * @property {React.MutableRefObject<HTMLCanvasElement|null>} canvasRef
 *   Attach to the <canvas> element.
 * @property {React.MutableRefObject<HTMLDivElement|null>} containerRef
 *   Attach to the wrapper <div> that determines available width.
 * @property {{ width: number, height: number }} dimensions
 *   Current CSS pixel dimensions of the canvas (React state, triggers re-render on resize).
 * @property {number} dpr
 *   Device pixel ratio (1 on standard displays, 2 on retina, 3 on some mobile).
 * @property {() => CanvasRenderingContext2D|null} getCtx
 *   Returns the raw 2D rendering context. Consumer must handle DPI scaling manually.
 */

/**
 * Custom hook for responsive, retina-ready canvas setup.
 *
 * @param {CanvasSetupConfig} [config={}]
 * @returns {CanvasSetupReturn}
 */
export function useCanvasSetup({
  aspectRatio = 0.55,
  minHeight = 300,
  maxHeight = 600,
} = {}) {
  // ─── Refs ───────────────────────────────────────────────────────
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // ─── State ──────────────────────────────────────────────────────
  const [dimensions, setDimensions] = useState({ width: 800, height: 440 });

  // ─── Device pixel ratio (computed once, stable across renders) ──
  const dprRef = useRef(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);
  const dpr = dprRef.current;

  // ─── Context getter ─────────────────────────────────────────────
  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  // ─── ResizeObserver setup ───────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) return;

    /**
     * Recalculate canvas dimensions based on container width.
     * Sets both the CSS display size and the internal buffer size
     * (buffer = CSS size × devicePixelRatio for crisp rendering).
     *
     * @param {number} containerWidth - Available width in CSS pixels
     */
    const updateSize = (containerWidth) => {
      // Guard against zero or negative widths
      const width = Math.max(containerWidth, 100);

      // Calculate height from aspect ratio, clamped to min/max
      const rawHeight = width * aspectRatio;
      const height = Math.max(minHeight, Math.min(rawHeight, maxHeight));

      // Set the canvas internal buffer size (actual pixels rendered)
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      // Set the CSS display size (how large it appears on screen)
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Update React state so consuming components know the dimensions
      setDimensions({ width, height });
    };

    // Create ResizeObserver to watch the container element
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use contentRect for the most reliable width measurement
        // (excludes padding and border)
        const { width } = entry.contentRect;
        if (width > 0) {
          updateSize(width);
        }
      }
    });

    // Start observing
    observer.observe(container);

    // Initial size calculation (ResizeObserver fires on observe,
    // but do an immediate calculation for faster first paint)
    const initialWidth = container.getBoundingClientRect().width;
    if (initialWidth > 0) {
      updateSize(initialWidth);
    }

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, [aspectRatio, minHeight, maxHeight, dpr]);

  // ─── Return the full interface ──────────────────────────────────
  return {
    canvasRef,
    containerRef,
    dimensions,
    dpr,
    getCtx,
  };
}

export default useCanvasSetup;
