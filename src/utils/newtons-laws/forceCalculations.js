/**
 * @module forceCalculations
 *
 * @description
 * Pure physics calculation functions for Newton's Second Law simulator.
 * These functions have zero React dependencies, zero side effects, and zero state.
 * Every function takes numbers in and returns numbers out.
 *
 * Covers two scenarios:
 * 1. Flat surface — block on a horizontal surface with optional friction
 * 2. Inclined plane — block on a slope with gravity decomposition and optional friction
 *
 * All values use SI units: kg, m, m/s, m/s², N, radians/degrees as specified.
 *
 * @purpose
 * Centralizes all physics math so the simulator component (SecondLawSimulator)
 * and display components (FreeBodyDiagram) can call these functions without
 * duplicating physics logic. Makes the physics testable in isolation.
 *
 * @dependents
 * - SecondLawSimulator.jsx (calls in onTick for each animation frame)
 * - FreeBodyDiagram.jsx (reads computed force values for arrow rendering)
 *
 * @example
 * ```javascript
 * import {
 *   calculateFlatForces,
 *   calculateInclineForces,
 *   updateKinematics,
 *   getCriticalAngle,
 * } from '@/utils/newtons-laws/forceCalculations';
 *
 * // Flat surface: 5kg block, 20N applied, friction enabled
 * const forces = calculateFlatForces({
 *   mass: 5, appliedForce: 20, gravity: 9.8,
 *   muStatic: 0.3, muKinetic: 0.2,
 *   frictionEnabled: true, velocity: 0,
 * });
 * // forces.netForce → 10.2 N (20 - 0.2*5*9.8)
 * // forces.acceleration → 2.04 m/s²
 *
 * // Update position and velocity
 * const next = updateKinematics({
 *   velocity: 0, position: 0,
 *   acceleration: forces.acceleration,
 *   dt: 0.016, minPos: 0, maxPos: 20,
 * });
 * // next.velocity → 0.03264 m/s
 * // next.position → 0.000522 m
 *
 * // Inclined plane: critical angle for μs = 0.3
 * const critAngle = getCriticalAngle(0.3);
 * // critAngle → 16.7°
 * ```
 */

// ─── Constants ────────────────────────────────────────────────────

/** Velocity threshold below which a block is considered stationary (m/s) */
const VELOCITY_EPSILON = 0.001;

/** Force threshold below which a force is considered zero (N) */
const FORCE_EPSILON = 0.0001;

// ─── Flat Surface Forces ──────────────────────────────────────────

/**
 * Calculate all forces on a block on a FLAT horizontal surface.
 *
 * Physics model:
 * - Weight acts downward: W = mg
 * - Normal force acts upward: N = mg (flat surface, no vertical acceleration)
 * - Static friction prevents motion if |F_applied| ≤ μs × N
 * - Kinetic friction opposes motion if block is moving: fk = μk × N
 * - Net force: F_net = F_applied + friction (friction is signed, opposing motion)
 * - Acceleration: a = F_net / m
 *
 * @param {Object} params
 * @param {number} params.mass - Mass in kg (must be > 0)
 * @param {number} params.appliedForce - Applied force in N (positive = rightward, negative = leftward)
 * @param {number} params.gravity - Gravitational acceleration in m/s² (positive value, e.g., 9.8)
 * @param {number} params.muStatic - Static friction coefficient (0 to 1)
 * @param {number} params.muKinetic - Kinetic friction coefficient (0 to 1)
 * @param {boolean} params.frictionEnabled - Whether friction is active
 * @param {number} params.velocity - Current velocity in m/s (positive = rightward)
 *
 * @returns {Object} Computed forces:
 * @returns {number} .weight - Weight magnitude (positive, acts downward) [N]
 * @returns {number} .normal - Normal force magnitude (positive, acts upward) [N]
 * @returns {number} .frictionForce - Friction force, signed (negative = leftward) [N]
 * @returns {number} .netForce - Net horizontal force, signed [N]
 * @returns {number} .acceleration - Resulting acceleration, signed [m/s²]
 * @returns {boolean} .isStationary - True if block is held still by static friction
 * @returns {number} .maxStaticF - Maximum static friction magnitude [N]
 */
export function calculateFlatForces(params) {
  const {
    mass,
    appliedForce,
    gravity,
    muStatic,
    muKinetic,
    frictionEnabled,
    velocity,
  } = params;

  // Ensure mass is positive to avoid division by zero
  const safeMass = Math.max(mass, 0.001);

  const weight = safeMass * gravity;
  const normal = weight; // Flat surface: N = mg
  const maxStaticF = muStatic * normal;

  let frictionForce = 0;
  let isStationary = false;

  if (!frictionEnabled) {
    // No friction: block responds purely to applied force
    frictionForce = 0;
    isStationary = false;
  } else if (Math.abs(velocity) < VELOCITY_EPSILON) {
    // Block is at rest — check static friction
    if (Math.abs(appliedForce) <= maxStaticF + FORCE_EPSILON) {
      // Static friction exactly cancels applied force — block stays put
      frictionForce = -appliedForce;
      isStationary = true;
    } else {
      // Applied force overcomes static friction — block starts moving
      // Use kinetic friction in the direction opposing the applied force
      frictionForce = -Math.sign(appliedForce) * muKinetic * normal;
      isStationary = false;
    }
  } else {
    // Block is already moving — kinetic friction opposes velocity
    frictionForce = -Math.sign(velocity) * muKinetic * normal;
    isStationary = false;
  }

  const netForce = appliedForce + frictionForce;
  const acceleration = isStationary ? 0 : netForce / safeMass;

  return {
    weight,
    normal,
    frictionForce,
    netForce,
    acceleration,
    isStationary,
    maxStaticF,
  };
}

// ─── Inclined Plane Forces ────────────────────────────────────────

/**
 * Calculate all forces on a block on an INCLINED PLANE.
 *
 * Physics model:
 * - Weight acts straight down: W = mg
 * - Weight decomposes into:
 *   - Parallel to incline (down-slope): W∥ = mg sinθ
 *   - Perpendicular to incline (into surface): W⊥ = mg cosθ
 * - Normal force equals perpendicular component: N = mg cosθ
 * - Applied force acts along the incline surface (positive = up-slope)
 * - Gravity component along incline acts down-slope (negative in our convention)
 * - Static/kinetic friction follows same logic as flat surface
 *
 * Sign convention: positive = up-slope, negative = down-slope
 *
 * @param {Object} params
 * @param {number} params.mass - Mass in kg
 * @param {number} params.appliedForce - Force along incline in N (positive = up-slope)
 * @param {number} params.gravity - Gravitational acceleration in m/s²
 * @param {number} params.angleDeg - Incline angle in degrees (0 = flat, 90 = vertical)
 * @param {number} params.muStatic - Static friction coefficient
 * @param {number} params.muKinetic - Kinetic friction coefficient
 * @param {boolean} params.frictionEnabled - Whether friction is active
 * @param {number} params.velocity - Current velocity along incline (positive = up-slope)
 *
 * @returns {Object} Computed forces:
 * @returns {number} .weight - Total weight magnitude (mg) [N]
 * @returns {number} .weightParallel - Weight component along incline (mg sinθ, magnitude) [N]
 * @returns {number} .weightPerp - Weight component perpendicular to incline (mg cosθ, magnitude) [N]
 * @returns {number} .normal - Normal force magnitude [N]
 * @returns {number} .frictionForce - Friction along incline, signed [N]
 * @returns {number} .netForce - Net force along incline, signed [N]
 * @returns {number} .acceleration - Acceleration along incline, signed [m/s²]
 * @returns {boolean} .isStationary - True if block is held still
 * @returns {number} .maxStaticF - Maximum static friction magnitude [N]
 * @returns {number} .angleDeg - Echo of input angle in degrees
 * @returns {number} .angleRad - Angle converted to radians
 */
export function calculateInclineForces(params) {
  const {
    mass,
    appliedForce,
    gravity,
    angleDeg,
    muStatic,
    muKinetic,
    frictionEnabled,
    velocity,
  } = params;

  const safeMass = Math.max(mass, 0.001);
  const angleRad = (angleDeg * Math.PI) / 180;

  // Weight and its components
  const weight = safeMass * gravity;
  const weightParallel = weight * Math.sin(angleRad); // magnitude, down-slope
  const weightPerp = weight * Math.cos(angleRad); // magnitude, into surface

  // Normal force equals perpendicular weight component
  const normal = weightPerp;
  const maxStaticF = muStatic * normal;

  // Gravity along incline: acts down-slope (negative in our up-slope-positive convention)
  const gravityAlongIncline = -weightParallel;

  // Net force along incline WITHOUT friction
  const forceWithoutFriction = appliedForce + gravityAlongIncline;

  let frictionForce = 0;
  let isStationary = false;

  if (!frictionEnabled) {
    frictionForce = 0;
    isStationary = false;
  } else if (Math.abs(velocity) < VELOCITY_EPSILON) {
    // Block is at rest — check if net non-friction force overcomes static friction
    if (Math.abs(forceWithoutFriction) <= maxStaticF + FORCE_EPSILON) {
      // Static friction holds the block
      frictionForce = -forceWithoutFriction;
      isStationary = true;
    } else {
      // Block starts moving — use kinetic friction opposing the net tendency
      frictionForce = -Math.sign(forceWithoutFriction) * muKinetic * normal;
      isStationary = false;
    }
  } else {
    // Block is moving — kinetic friction opposes velocity direction
    frictionForce = -Math.sign(velocity) * muKinetic * normal;
    isStationary = false;
  }

  // Net force along incline
  const netForce = appliedForce + gravityAlongIncline + frictionForce;
  const acceleration = isStationary ? 0 : netForce / safeMass;

  return {
    weight,
    weightParallel,
    weightPerp,
    normal,
    frictionForce,
    netForce,
    acceleration,
    isStationary,
    maxStaticF,
    angleDeg,
    angleRad,
  };
}

// ─── Kinematics Update ───────────────────────────────────────────

/**
 * Update velocity and position given acceleration and time step.
 * Handles two important edge cases:
 * 1. Friction stopping: when velocity crosses zero due to deceleration,
 *    clamp to zero to prevent oscillation.
 * 2. Boundary clamping: when position exceeds min/max limits.
 *
 * Uses semi-implicit Euler integration:
 *   v_new = v + a × dt
 *   x_new = x + v_new × dt
 *
 * @param {Object} state
 * @param {number} state.velocity - Current velocity in m/s
 * @param {number} state.position - Current position in m
 * @param {number} state.acceleration - Current acceleration in m/s²
 * @param {number} state.dt - Time step in seconds
 * @param {number} [state.minPos=0] - Minimum position boundary
 * @param {number} [state.maxPos=20] - Maximum position boundary
 *
 * @returns {Object} Updated state:
 * @returns {number} .velocity - New velocity [m/s]
 * @returns {number} .position - New position, clamped to boundaries [m]
 * @returns {boolean} .hitBoundary - True if position was clamped
 * @returns {boolean} .stopped - True if friction caused velocity to cross zero this frame
 */
export function updateKinematics(state) {
  const {
    velocity,
    position,
    acceleration,
    dt,
    minPos = 0,
    maxPos = 20,
  } = state;

  let newVelocity = velocity + acceleration * dt;
  let stopped = false;
  let hitBoundary = false;

  // ── Friction stopping check ─────────────────────────────────
  // If velocity was positive and is now negative (or vice versa),
  // friction has brought the block to a stop. Clamp to zero to
  // prevent the "friction jitter" oscillation bug.
  if (velocity > VELOCITY_EPSILON && newVelocity < -VELOCITY_EPSILON) {
    newVelocity = 0;
    stopped = true;
  } else if (velocity < -VELOCITY_EPSILON && newVelocity > VELOCITY_EPSILON) {
    newVelocity = 0;
    stopped = true;
  }

  // ── Position update ─────────────────────────────────────────
  let newPosition = position + newVelocity * dt;

  // ── Boundary clamping ───────────────────────────────────────
  if (newPosition < minPos) {
    newPosition = minPos;
    newVelocity = 0;
    hitBoundary = true;
  } else if (newPosition > maxPos) {
    newPosition = maxPos;
    newVelocity = 0;
    hitBoundary = true;
  }

  return {
    velocity: newVelocity,
    position: newPosition,
    hitBoundary,
    stopped,
  };
}

// ─── Utility Functions ────────────────────────────────────────────

/**
 * Calculate the critical angle at which a block begins to slide on an inclined plane.
 * At the critical angle, the gravitational component along the incline exactly
 * equals maximum static friction:
 *   mg sinθ = μs × mg cosθ
 *   tanθ = μs
 *   θ_critical = arctan(μs)
 *
 * @param {number} muStatic - Static friction coefficient
 * @returns {number} Critical angle in degrees
 *
 * @example
 * getCriticalAngle(0.3)  // → 16.70°
 * getCriticalAngle(0.5)  // → 26.57°
 * getCriticalAngle(1.0)  // → 45.00°
 */
export function getCriticalAngle(muStatic) {
  if (muStatic <= 0) return 0;
  return (Math.atan(muStatic) * 180) / Math.PI;
}

/**
 * Calculate the minimum force required to START moving a block on a flat surface.
 * This equals the maximum static friction force.
 *
 * @param {number} mass - Mass in kg
 * @param {number} gravity - Gravitational acceleration in m/s²
 * @param {number} muStatic - Static friction coefficient
 * @returns {number} Minimum force in N
 *
 * @example
 * getMinForceToMove(5, 9.8, 0.3)  // → 14.7 N
 */
export function getMinForceToMove(mass, gravity, muStatic) {
  return muStatic * mass * gravity;
}

/**
 * Calculate the minimum force required to push a block UP an incline
 * against both gravity and friction.
 *
 * F_min = mg sinθ + μs × mg cosθ
 *
 * @param {number} mass - Mass in kg
 * @param {number} gravity - Gravitational acceleration in m/s²
 * @param {number} angleDeg - Incline angle in degrees
 * @param {number} muStatic - Static friction coefficient
 * @returns {number} Minimum force along incline in N
 *
 * @example
 * getMinForceUpIncline(5, 9.8, 30, 0.3)  // → 37.22 N
 */
export function getMinForceUpIncline(mass, gravity, angleDeg, muStatic) {
  const angleRad = (angleDeg * Math.PI) / 180;
  const weight = mass * gravity;
  return weight * Math.sin(angleRad) + muStatic * weight * Math.cos(angleRad);
}

/**
 * Calculate the terminal velocity when friction balances applied force.
 * This is the velocity at which acceleration becomes zero.
 * Only applicable when friction is kinetic and constant.
 *
 * For flat surface: when F_applied = μk × mg, a = 0
 * This function returns the applied force that produces zero acceleration.
 *
 * @param {number} mass - Mass in kg
 * @param {number} gravity - Gravitational acceleration in m/s²
 * @param {number} muKinetic - Kinetic friction coefficient
 * @returns {number} Force in N that produces zero net force (equilibrium)
 */
export function getEquilibriumForce(mass, gravity, muKinetic) {
  return muKinetic * mass * gravity;
}