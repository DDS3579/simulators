/**
 * @module collisionPhysics
 *
 * @description
 * Pure physics calculation functions for impulse-momentum and conservation
 * of momentum simulators. Zero React dependencies, zero side effects.
 * Every function takes numbers in and returns numbers out.
 *
 * Covers:
 * 1. Impulse-Momentum: free-fall impact, collision forces, force-time profiles,
 *    egg drop analysis
 * 2. Conservation of Momentum: 1D collisions (elastic, inelastic, partial),
 *    explosions, collision timing
 *
 * All values use SI units: kg, m, m/s, m/s², N, N·s, J, s.
 *
 * @purpose
 * Centralizes all momentum/collision physics so both simulator pages and
 * display components can call these functions without duplicating math.
 * Pure functions are independently testable.
 *
 * @dependents
 * - ImpulseMomentum.jsx (impulse calculations, force profiles)
 * - MomentumConservation.jsx (collision outcomes, energy analysis)
 * - ForceTimeGraph.jsx (force profile generation)
 * - EggDropMode.jsx (egg survival check)
 * - MomentumDisplay.jsx (momentum values)
 * - EnergyComparison.jsx (energy values)
 *
 * @example
 * ```javascript
 * import {
 *   impactVelocity,
 *   calculateImpulse,
 *   calculateCollision,
 *   calculateExplosion,
 * } from '@/utils/newtons-laws/collisionPhysics';
 *
 * // Ball dropped from 5m
 * const vImpact = impactVelocity(5, 9.8); // ≈ 9.90 m/s
 *
 * // Impulse on concrete (Δt = 0.005s), e = 0.5
 * const result = calculateImpulse({
 *   mass: 1, impactSpeed: vImpact, restitution: 0.5,
 *   collisionTime: 0.005, gravity: 9.8,
 * });
 * // result.impulse ≈ 14.85 N·s
 * // result.peakForce ≈ 4668 N
 *
 * // Elastic collision: 3kg @ 5m/s hits 2kg @ -3m/s
 * const col = calculateCollision({ m1: 3, m2: 2, u1: 5, u2: -3, restitution: 1 });
 * // col.v1 ≈ -1.8 m/s, col.v2 ≈ 6.2 m/s
 * // Momentum conserved: 3*5 + 2*(-3) = 9 = 3*(-1.8) + 2*(6.2) = 9 ✓
 * ```
 */

// ─── Constants ────────────────────────────────────────────────────

/** Minimum collision time to prevent division by zero */
const MIN_COLLISION_TIME = 0.0001;

/** Velocity threshold for considering an object stationary */
const VELOCITY_EPSILON = 0.0001;

// ═══════════════════════════════════════════════════════════════════
// IMPULSE-MOMENTUM FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculate impact velocity from free fall.
 * Uses v = √(2gh) from energy conservation.
 *
 * @param {number} height - Drop height in meters (must be ≥ 0)
 * @param {number} gravity - Gravitational acceleration in m/s² (positive)
 * @returns {number} Impact speed in m/s (positive value, magnitude only)
 *
 * @example
 * impactVelocity(5, 9.8)   // → 9.899 m/s
 * impactVelocity(0, 9.8)   // → 0
 * impactVelocity(20, 1.62) // → 8.050 m/s (Moon)
 */
export function impactVelocity(height, gravity) {
  if (height <= 0 || gravity <= 0) return 0;
  return Math.sqrt(2 * gravity * height);
}

/**
 * Calculate impulse, forces, and energy for a collision with a surface.
 *
 * Models a ball hitting a surface and bouncing. The collision is treated
 * as instantaneous with a known duration Δt. The force profile is a
 * half-sine pulse.
 *
 * Sign convention: all returned values are magnitudes (positive) except
 * where explicitly noted. The caller handles direction.
 *
 * @param {Object} params
 * @param {number} params.mass - Ball mass in kg
 * @param {number} params.impactSpeed - Speed just before impact in m/s (positive)
 * @param {number} params.restitution - Coefficient of restitution (0 to 1)
 * @param {number} params.collisionTime - Duration of contact in seconds (Δt)
 * @param {number} params.gravity - Gravitational acceleration in m/s²
 *
 * @returns {Object} Collision results:
 * @returns {number} .reboundSpeed - Speed just after impact (positive)
 * @returns {number} .momentumBefore - Momentum magnitude before impact (m × v_impact)
 * @returns {number} .momentumAfter - Momentum magnitude after impact (m × v_rebound)
 * @returns {number} .deltaMomentum - Total momentum change magnitude (includes direction reversal)
 * @returns {number} .impulse - Impulse magnitude (= deltaMomentum)
 * @returns {number} .avgForce - Average force during collision (J / Δt)
 * @returns {number} .peakForce - Peak force assuming half-sine profile (π/2 × F_avg)
 * @returns {number} .bounceHeight - Maximum rebound height in meters
 * @returns {number} .keBefore - Kinetic energy before impact in Joules
 * @returns {number} .keAfter - Kinetic energy after impact in Joules
 * @returns {number} .energyLost - Energy dissipated in collision in Joules
 */
export function calculateImpulse(params) {
  const {
    mass,
    impactSpeed,
    restitution,
    collisionTime,
    gravity,
  } = params;

  const safeMass = Math.max(mass, 0.001);
  const safeSpeed = Math.max(impactSpeed, 0);
  const safeE = Math.max(0, Math.min(1, restitution));
  const safeDt = Math.max(collisionTime, MIN_COLLISION_TIME);
  const safeG = Math.max(gravity, 0.01);

  // Rebound speed
  const reboundSpeed = safeE * safeSpeed;

  // Momentum magnitudes
  const momentumBefore = safeMass * safeSpeed;
  const momentumAfter = safeMass * reboundSpeed;

  // Total momentum change: direction reverses, so Δp = m(v_impact + v_rebound)
  // Before: p = -m*v_impact (downward)
  // After:  p = +m*v_rebound (upward)
  // Δp = m*v_rebound - (-m*v_impact) = m*(v_impact + v_rebound)
  const deltaMomentum = safeMass * (safeSpeed + reboundSpeed);

  // Impulse equals momentum change
  const impulse = deltaMomentum;

  // Average force
  const avgForce = impulse / safeDt;

  // Peak force for half-sine profile
  // Area under half-sine from 0 to Δt: integral of F_peak*sin(πt/Δt) dt
  // = F_peak × (Δt/π) × [-cos(πt/Δt)] from 0 to Δt
  // = F_peak × (2Δt/π)
  // Set equal to impulse: F_peak × (2Δt/π) = J
  // F_peak = J × π / (2Δt) = F_avg × π/2
  const peakForce = (Math.PI / 2) * avgForce;

  // Bounce height: all rebound KE converts to PE
  // ½mv² = mgh' → h' = v²/(2g)
  const bounceHeight = (reboundSpeed * reboundSpeed) / (2 * safeG);

  // Kinetic energy
  const keBefore = 0.5 * safeMass * safeSpeed * safeSpeed;
  const keAfter = 0.5 * safeMass * reboundSpeed * reboundSpeed;
  const energyLost = keBefore - keAfter;

  return {
    reboundSpeed,
    momentumBefore,
    momentumAfter,
    deltaMomentum,
    impulse,
    avgForce,
    peakForce,
    bounceHeight,
    keBefore,
    keAfter,
    energyLost,
  };
}

/**
 * Generate a force-time profile for a collision using a half-sine model.
 *
 * F(t) = F_peak × sin(π × t / Δt)  for  0 ≤ t ≤ Δt
 *
 * The area under this curve equals the impulse.
 *
 * @param {number} peakForce - Peak force in Newtons
 * @param {number} collisionTime - Total collision duration in seconds (Δt)
 * @param {number} [numPoints=100] - Number of data points to generate
 * @returns {Array<{t: number, f: number}>} Array of time-force data points
 *
 * @example
 * const profile = generateForceProfile(1000, 0.02, 50);
 * // Returns 50 points tracing a half-sine from F=0 to F=1000 and back to F=0
 */
export function generateForceProfile(peakForce, collisionTime, numPoints = 100) {
  const safeDt = Math.max(collisionTime, MIN_COLLISION_TIME);
  const safePoints = Math.max(numPoints, 2);
  const points = [];

  for (let i = 0; i < safePoints; i++) {
    const t = (i / (safePoints - 1)) * safeDt;
    const f = peakForce * Math.sin((Math.PI * t) / safeDt);
    points.push({ t, f: Math.max(0, f) });
  }

  return points;
}

/**
 * Check if peak force exceeds an egg's breaking threshold.
 *
 * @param {number} peakForce - Peak collision force in Newtons
 * @param {number} breakingForce - Egg breaking threshold in Newtons
 * @returns {Object} Analysis result:
 * @returns {boolean} .survives - True if egg survives (peakForce ≤ breakingForce)
 * @returns {number} .ratio - Force ratio (peakForce / breakingForce). >1 means breakage.
 *
 * @example
 * eggDropCheck(20, 25)  // → { survives: true, ratio: 0.8 }
 * eggDropCheck(30, 25)  // → { survives: false, ratio: 1.2 }
 */
export function eggDropCheck(peakForce, breakingForce) {
  const safeBreak = Math.max(breakingForce, 0.01);
  return {
    survives: peakForce <= safeBreak,
    ratio: peakForce / safeBreak,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CONSERVATION OF MOMENTUM FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculate final velocities for a 1D collision using conservation of
 * momentum and the coefficient of restitution.
 *
 * From:
 *   m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂           (momentum conservation)
 *   e = (v₂ - v₁) / (u₁ - u₂)            (restitution definition)
 *
 * Solving:
 *   v₁ = (m₁u₁ + m₂u₂ - m₂e(u₁ - u₂)) / (m₁ + m₂)
 *   v₂ = v₁ + e(u₁ - u₂)
 *
 * @param {Object} params
 * @param {number} params.m1 - Mass of object 1 in kg
 * @param {number} params.m2 - Mass of object 2 in kg
 * @param {number} params.u1 - Initial velocity of object 1 in m/s (signed)
 * @param {number} params.u2 - Initial velocity of object 2 in m/s (signed)
 * @param {number} params.restitution - Coefficient of restitution (0 to 1)
 *
 * @returns {Object} Collision results:
 * @returns {number} .v1 - Final velocity of object 1
 * @returns {number} .v2 - Final velocity of object 2
 * @returns {number} .totalMomentumBefore - Total momentum before collision
 * @returns {number} .totalMomentumAfter - Total momentum after collision
 * @returns {number} .keBefore - Total kinetic energy before
 * @returns {number} .keAfter - Total kinetic energy after
 * @returns {number} .energyLost - Energy dissipated (≥ 0 for inelastic)
 * @returns {boolean} .isElastic - Whether collision is perfectly elastic
 *
 * @example
 * // Elastic: 3kg @ 5m/s hits 2kg @ -3m/s
 * calculateCollision({ m1: 3, m2: 2, u1: 5, u2: -3, restitution: 1 })
 * // v1 ≈ -1.8, v2 ≈ 6.2, momentum = 9 before and after
 *
 * // Perfectly inelastic: same setup
 * calculateCollision({ m1: 3, m2: 2, u1: 5, u2: -3, restitution: 0 })
 * // v1 = v2 = 1.8 (common velocity)
 */
export function calculateCollision(params) {
  const { m1, m2, u1, u2, restitution } = params;

  const safeM1 = Math.max(m1, 0.001);
  const safeM2 = Math.max(m2, 0.001);
  const totalMass = safeM1 + safeM2;
  const e = Math.max(0, Math.min(1, restitution));

  // Solve using momentum conservation + restitution
  const relativeApproach = u1 - u2;
  const totalMomentum = safeM1 * u1 + safeM2 * u2;

  const v1 = (totalMomentum - safeM2 * e * relativeApproach) / totalMass;
  const v2 = v1 + e * relativeApproach;

  // Momentum
  const totalMomentumBefore = safeM1 * u1 + safeM2 * u2;
  const totalMomentumAfter = safeM1 * v1 + safeM2 * v2;

  // Kinetic energy
  const keBefore = 0.5 * safeM1 * u1 * u1 + 0.5 * safeM2 * u2 * u2;
  const keAfter = 0.5 * safeM1 * v1 * v1 + 0.5 * safeM2 * v2 * v2;
  const energyLost = keBefore - keAfter;

  const isElastic = Math.abs(e - 1) < 0.001;

  return {
    v1,
    v2,
    totalMomentumBefore,
    totalMomentumAfter,
    keBefore,
    keAfter,
    energyLost: Math.max(0, energyLost),
    isElastic,
  };
}

/**
 * Calculate explosion velocities where objects start together and push apart.
 *
 * Physics:
 *   Both objects start at rest (or common velocity v₀).
 *   Internal energy Q is released, converting to kinetic energy.
 *   Momentum is conserved: m₁v₁ + m₂v₂ = (m₁ + m₂)v₀
 *   Energy added: ½m₁v₁² + ½m₂v₂² = ½(m₁+m₂)v₀² + Q
 *
 * For rest start (v₀ = 0):
 *   m₁v₁ = -m₂v₂ (momentum conservation)
 *   v₁ = -√(2Q·m₂ / (m₁·(m₁+m₂)))
 *   v₂ = +√(2Q·m₁ / (m₂·(m₁+m₂)))
 *
 * For moving start (v₀ ≠ 0):
 *   Compute relative velocities from Q, then add v₀.
 *
 * @param {Object} params
 * @param {number} params.m1 - Mass of object 1 in kg
 * @param {number} params.m2 - Mass of object 2 in kg
 * @param {number} params.energy - Energy released in Joules (Q)
 * @param {number} [params.initialVelocity=0] - Common initial velocity in m/s
 *
 * @returns {Object} Explosion results:
 * @returns {number} .v1 - Velocity of object 1 (typically negative = leftward)
 * @returns {number} .v2 - Velocity of object 2 (typically positive = rightward)
 * @returns {number} .totalMomentumBefore - Total momentum before explosion
 * @returns {number} .totalMomentumAfter - Total momentum after explosion
 * @returns {number} .keBefore - KE before explosion
 * @returns {number} .keAfter - KE after explosion
 * @returns {number} .energyAdded - Energy added (= Q)
 *
 * @example
 * // 3kg and 2kg at rest, 100J released
 * calculateExplosion({ m1: 3, m2: 2, energy: 100, initialVelocity: 0 })
 * // v1 ≈ -5.16 m/s (leftward), v2 ≈ 7.75 m/s (rightward)
 * // Total momentum = 0 (conserved from rest)
 */
export function calculateExplosion(params) {
  const {
    m1,
    m2,
    energy,
    initialVelocity = 0,
  } = params;

  const safeM1 = Math.max(m1, 0.001);
  const safeM2 = Math.max(m2, 0.001);
  const safeQ = Math.max(energy, 0);
  const totalMass = safeM1 + safeM2;
  const v0 = initialVelocity;

  // Relative velocities from explosion energy
  // In center-of-mass frame, KE = Q
  // ½ × m1 × v1_rel² + ½ × m2 × v2_rel² = Q
  // m1 × v1_rel + m2 × v2_rel = 0 (momentum conservation in COM frame)
  // Solving: v1_rel = -√(2Q × m2 / (m1 × totalMass))
  //          v2_rel = +√(2Q × m1 / (m2 × totalMass))
  let v1Rel = 0;
  let v2Rel = 0;

  if (safeQ > 0) {
    v1Rel = -Math.sqrt((2 * safeQ * safeM2) / (safeM1 * totalMass));
    v2Rel = Math.sqrt((2 * safeQ * safeM1) / (safeM2 * totalMass));
  }

  // Add initial velocity
  const v1 = v0 + v1Rel;
  const v2 = v0 + v2Rel;

  // Momentum
  const totalMomentumBefore = totalMass * v0;
  const totalMomentumAfter = safeM1 * v1 + safeM2 * v2;

  // Kinetic energy
  const keBefore = 0.5 * totalMass * v0 * v0;
  const keAfter = 0.5 * safeM1 * v1 * v1 + 0.5 * safeM2 * v2 * v2;
  const energyAdded = keAfter - keBefore;

  return {
    v1,
    v2,
    totalMomentumBefore,
    totalMomentumAfter,
    keBefore,
    keAfter,
    energyAdded: Math.max(0, energyAdded),
  };
}

/**
 * Calculate the time and position at which two objects collide on a 1D track.
 *
 * Objects collide when the right edge of object 1 meets the left edge of object 2:
 *   x1 + u1×t + w1/2 = x2 + u2×t - w2/2
 *   t = (x2 - w2/2 - x1 - w1/2) / (u1 - u2)
 *
 * @param {Object} params
 * @param {number} params.x1 - Initial x-position of object 1 center
 * @param {number} params.x2 - Initial x-position of object 2 center
 * @param {number} params.u1 - Velocity of object 1 (signed)
 * @param {number} params.u2 - Velocity of object 2 (signed)
 * @param {number} params.w1 - Width of object 1
 * @param {number} params.w2 - Width of object 2
 *
 * @returns {Object|null} Collision info, or null if objects never meet:
 * @returns {number} .tCollision - Time until collision in seconds
 * @returns {number} .xCollision - X-position of the contact point
 *
 * @example
 * findCollisionTime({ x1: -5, x2: 5, u1: 5, u2: -3, w1: 1, w2: 1 })
 * // → { tCollision: 1.0, xCollision: 0.5 }
 *
 * findCollisionTime({ x1: -5, x2: 5, u1: -2, u2: 3, w1: 1, w2: 1 })
 * // → null (objects moving apart)
 */
export function findCollisionTime(params) {
  const { x1, x2, u1, u2, w1, w2 } = params;

  const relativeVelocity = u1 - u2;

  // If relative velocity is zero or objects are moving apart
  if (Math.abs(relativeVelocity) < VELOCITY_EPSILON) {
    return null; // Same velocity, never collide (or always overlapping)
  }

  // Gap between edges
  const rightEdge1 = x1 + w1 / 2;
  const leftEdge2 = x2 - w2 / 2;
  const gap = leftEdge2 - rightEdge1;

  // Time to close the gap
  const tCollision = gap / relativeVelocity;

  // Negative time means collision was in the past
  if (tCollision < -VELOCITY_EPSILON) {
    return null;
  }

  // Objects already overlapping
  if (tCollision < 0) {
    const xCollision = rightEdge1;
    return { tCollision: 0, xCollision };
  }

  // Contact point: where right edge of object 1 will be at collision time
  const xCollision = rightEdge1 + u1 * tCollision;

  return { tCollision, xCollision };
}

/**
 * Calculate momentum and kinetic energy for a single object.
 *
 * @param {number} mass - Mass in kg
 * @param {number} velocity - Velocity in m/s (signed)
 * @returns {Object} { momentum: number, kineticEnergy: number }
 *
 * @example
 * objectMomentum(3, 5)   // → { momentum: 15, kineticEnergy: 37.5 }
 * objectMomentum(2, -3)  // → { momentum: -6, kineticEnergy: 9 }
 */
export function objectMomentum(mass, velocity) {
  return {
    momentum: mass * velocity,
    kineticEnergy: 0.5 * mass * velocity * velocity,
  };
}

/**
 * Determine if two objects will collide given their positions and velocities.
 * Useful for showing warnings in the UI.
 *
 * @param {number} x1 - Position of object 1
 * @param {number} x2 - Position of object 2
 * @param {number} u1 - Velocity of object 1
 * @param {number} u2 - Velocity of object 2
 * @returns {boolean} True if objects are approaching each other
 *
 * @example
 * willObjectsCollide(-5, 5, 3, -2)  // → true (approaching)
 * willObjectsCollide(-5, 5, -3, 2)  // → false (moving apart)
 */
export function willObjectsCollide(x1, x2, u1, u2) {
  // Object 1 is to the left of object 2
  if (x1 < x2) {
    return u1 > u2; // Object 1 must be faster (rightward) than object 2
  }
  // Object 1 is to the right of object 2
  if (x1 > x2) {
    return u1 < u2; // Object 1 must be slower (or more leftward) than object 2
  }
  // Same position — they're already colliding
  return true;
}

/**
 * Calculate starting positions for two objects so that their collision
 * occurs approximately at the center of the track after a given delay.
 *
 * @param {number} u1 - Velocity of object 1
 * @param {number} u2 - Velocity of object 2
 * @param {number} w1 - Width of object 1
 * @param {number} w2 - Width of object 2
 * @param {number} [targetTime=2] - Desired time until collision in seconds
 * @param {number} [collisionX=0] - Desired collision point on track
 * @returns {Object} { x1: number, x2: number } Starting positions
 *
 * @example
 * calculateStartPositions(5, -3, 1, 1, 2, 0)
 * // → { x1: -10.5, x2: 6.5 } (they meet at x=0 after 2 seconds)
 */
export function calculateStartPositions(u1, u2, w1, w2, targetTime = 2, collisionX = 0) {
  const relVel = u1 - u2;

  // If they won't collide, just place them symmetrically
  if (Math.abs(relVel) < VELOCITY_EPSILON) {
    return { x1: -5, x2: 5 };
  }

  // At collision, right edge of 1 = left edge of 2 = collisionX
  // x1 + u1*t + w1/2 = collisionX → x1 = collisionX - w1/2 - u1*t
  // x2 + u2*t - w2/2 = collisionX → x2 = collisionX + w2/2 - u2*t

  const x1 = collisionX - w1 / 2 - u1 * targetTime;
  const x2 = collisionX + w2 / 2 - u2 * targetTime;

  return { x1, x2 };
}