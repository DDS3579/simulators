/**
 * @module useAnimationLoop
 *
 * @description
 * A custom React hook that provides a clean, ref-based animation loop with
 * play/pause/reset/speed controls for physics simulations. This hook replaces
 * the messy useEffect + requestAnimationFrame + useState pattern by keeping
 * animation state in refs (to avoid re-render overhead) and only syncing
 * UI-critical values (time, isRunning, speed) to React state on a throttled basis.
 *
 * @purpose
 * Every Newton's Laws simulator needs an animation loop. Without this hook,
 * each simulator would duplicate 40+ lines of timing logic, speed control,
 * and cleanup code.
 *
 * @dependents
 * - SecondLawSimulator (F=ma)
 * - ImpulseMomentumSimulator
 * - MomentumConservationSimulator
 * - ApparentWeightSimulator
 * - RelativeVelocitySimulator
 *
 * @example
 * ```jsx
 * import { useAnimationLoop } from '@/hooks/newtons-laws/useAnimationLoop';
 *
 * function MySimulator() {
 *   const physicsState = useRef({ position: 0, velocity: 5 });
 *   const canvasRef = useRef(null);
 *
 *   const handleTick = useCallback((deltaTime, totalTime) => {
 *     // Update physics
 *     physicsState.current.position += physicsState.current.velocity * deltaTime;
 *
 *     // Draw to canvas
 *     const ctx = canvasRef.current?.getContext('2d');
 *     if (ctx) drawScene(ctx, physicsState.current);
 *
 *     // Return false to stop, true to continue
 *     if (physicsState.current.position > 100) return false;
 *     return true;
 *   }, []);
 *
 *   const {
 *     time, isRunning, speed,
 *     play, pause, reset, togglePlayPause, setSpeed, skipTo
 *   } = useAnimationLoop({
 *     onTick: handleTick,
 *     maxTime: 20,
 *     initialSpeed: 1,
 *   });
 *
 *   return (
 *     <div>
 *       <p>Time: {time.toFixed(2)}s</p>
 *       <button onClick={togglePlayPause}>{isRunning ? 'Pause' : 'Play'}</button>
 *       <button onClick={reset}>Reset</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * @typedef {Object} AnimationLoopConfig
 * @property {(deltaTime: number, totalTime: number) => boolean} onTick
 *   Called every animation frame.
 *   - deltaTime: seconds elapsed since last frame (already multiplied by speed).
 *   - totalTime: cumulative simulation time in seconds.
 *   - Return `true` to continue the animation, `false` to auto-pause.
 * @property {number|null} [maxTime=null] - Optional auto-stop time in seconds.
 * @property {number} [initialSpeed=1] - Initial playback speed multiplier.
 */

/**
 * @typedef {Object} AnimationLoopReturn
 * @property {number} time - Current simulation time (React state, triggers re-render).
 * @property {boolean} isRunning - Whether the animation is currently active (React state).
 * @property {number} speed - Current playback speed multiplier (React state).
 * @property {React.MutableRefObject<number>} timeRef - Current time ref (for canvas reads without re-render).
 * @property {React.MutableRefObject<boolean>} isRunningRef - Current running state ref.
 * @property {() => void} play - Start or resume the animation.
 * @property {() => void} pause - Pause the animation.
 * @property {() => void} reset - Stop and reset time to 0.
 * @property {() => void} togglePlayPause - Convenience toggle between play and pause.
 * @property {(speed: number) => void} setSpeed - Set the playback speed multiplier.
 * @property {(time: number) => void} skipTo - Jump to a specific simulation time.
 */

/**
 * Custom hook providing a ref-based animation loop with playback controls.
 *
 * @param {AnimationLoopConfig} config
 * @returns {AnimationLoopReturn}
 */
export function useAnimationLoop({ onTick, maxTime = null, initialSpeed = 1 } = {}) {
  // ─── React state (triggers UI re-renders) ───────────────────────
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeedState] = useState(initialSpeed || 1);

  // ─── Refs (no re-renders, used inside animation loop) ──────────
  const timeRef = useRef(0);
  const isRunningRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const animFrameRef = useRef(null);
  const speedRef = useRef(initialSpeed || 1);
  const onTickRef = useRef(onTick);
  const stateUpdateTimestampRef = useRef(0);
  const pauseRef = useRef(null);

  // ─── Keep refs in sync with state ──────────────────────────────
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // ─── Internal pause (callable from within tick without stale closure) ──
  const pauseInternal = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    isRunningRef.current = false;
    setIsRunning(false);
  }, []);

  // Store pauseInternal in a ref so the tick function can access it
  // without depending on it as a closure variable that might change
  pauseRef.current = pauseInternal;

  // ─── Animation loop (the tick function) ─────────────────────────
  const tick = useCallback((timestamp) => {
    // Guard: if we've been paused externally, bail out
    if (!isRunningRef.current) {
      return;
    }

    // First frame: skip to establish baseline timestamp
    if (lastFrameTimeRef.current === 0) {
      lastFrameTimeRef.current = timestamp;
      stateUpdateTimestampRef.current = timestamp;
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    // Calculate delta time in seconds
    const rawDelta = (timestamp - lastFrameTimeRef.current) / 1000;

    // Clamp to max 0.05s (50ms) to prevent physics explosions
    // when tab is backgrounded and then refocused
    const clampedDelta = Math.min(rawDelta, 0.05);

    // Apply speed multiplier
    const scaledDelta = clampedDelta * speedRef.current;

    // Update baseline
    lastFrameTimeRef.current = timestamp;

    // Advance simulation time
    timeRef.current += scaledDelta;

    // Check maxTime before calling onTick
    if (maxTime !== null && timeRef.current >= maxTime) {
      timeRef.current = maxTime;
      // Call onTick one final time at the boundary
      if (onTickRef.current) {
        onTickRef.current(scaledDelta, timeRef.current);
      }
      setTime(timeRef.current);
      pauseRef.current();
      return;
    }

    // Call the consumer's tick callback
    if (onTickRef.current) {
      const shouldContinue = onTickRef.current(scaledDelta, timeRef.current);

      // If callback returns false, stop the animation
      if (shouldContinue === false) {
        setTime(timeRef.current);
        pauseRef.current();
        return;
      }
    }

    // Throttle React state updates to every ~50ms to avoid excessive re-renders
    if (timestamp - stateUpdateTimestampRef.current >= 50) {
      setTime(timeRef.current);
      stateUpdateTimestampRef.current = timestamp;
    }

    // Request next frame
    animFrameRef.current = requestAnimationFrame(tick);
  }, [maxTime]);

  // ─── Control functions ──────────────────────────────────────────

  const play = useCallback(() => {
    if (isRunningRef.current) return; // Already running

    // Reset the frame timestamp so the first frame calculates a fresh delta
    lastFrameTimeRef.current = 0;
    isRunningRef.current = true;
    setIsRunning(true);

    // Start the animation loop
    animFrameRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    pauseInternal();
  }, [pauseInternal]);

  const reset = useCallback(() => {
    // Stop animation first
    pauseInternal();

    // Reset time
    timeRef.current = 0;
    lastFrameTimeRef.current = 0;
    setTime(0);

    // Notify consumer so the scene resets to initial state
    if (onTickRef.current) {
      onTickRef.current(0, 0);
    }
  }, [pauseInternal]);

  const togglePlayPause = useCallback(() => {
    if (isRunningRef.current) {
      pauseInternal();
    } else {
      play();
    }
  }, [pauseInternal, play]);

  const setSpeed = useCallback((newSpeed) => {
    setSpeedState(newSpeed);
    // speedRef is synced via useEffect above
  }, []);

  const skipTo = useCallback((targetTime) => {
    // Pause if running
    pauseInternal();

    // Clamp to maxTime if set
    const clampedTime = maxTime !== null ? Math.min(targetTime, maxTime) : targetTime;

    // Update refs and state
    timeRef.current = clampedTime;
    lastFrameTimeRef.current = 0;
    setTime(clampedTime);

    // Notify consumer at the new time so the scene updates
    if (onTickRef.current) {
      onTickRef.current(0, clampedTime);
    }
  }, [pauseInternal, maxTime]);

  // ─── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, []);

  // ─── Return the full interface ──────────────────────────────────
  return {
    time,
    isRunning,
    speed,
    timeRef,
    isRunningRef,
    play,
    pause,
    reset,
    togglePlayPause,
    setSpeed,
    skipTo,
  };
}

export default useAnimationLoop;