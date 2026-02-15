/**
 * @file relativeVelocityPhysics.js
 * @description Pure physics calculations for relative velocity in multiple reference frames.
 * Covers 1D relative velocity (trains/cars), 2D river crossing (boat in current),
 * and rain-on-moving-person scenarios. All functions are stateless and side-effect free.
 *
 * Core equation: v⃗_A/B = v⃗_A/G − v⃗_B/G
 * (velocity of A relative to B equals velocity of A relative to ground
 *  minus velocity of B relative to ground)
 *
 * @module relativeVelocityPhysics
 */

/**
 * Subtract two 2D vectors: v1 - v2.
 * @param {{ x: number, y: number }} v1
 * @param {{ x: number, y: number }} v2
 * @returns {{ x: number, y: number }}
 */
export function vectorSubtract(v1, v2) {
  return { x: v1.x - v2.x, y: v1.y - v2.y };
}

/**
 * Add two 2D vectors: v1 + v2.
 * @param {{ x: number, y: number }} v1
 * @param {{ x: number, y: number }} v2
 * @returns {{ x: number, y: number }}
 */
export function vectorAdd(v1, v2) {
  return { x: v1.x + v2.x, y: v1.y + v2.y };
}

/**
 * Calculate the magnitude of a 2D vector.
 * @param {{ x: number, y: number }} v
 * @returns {number}
 */
export function vectorMagnitude(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Calculate the angle of a 2D vector in degrees from positive x-axis.
 * Returns value in [0, 360).
 * @param {{ x: number, y: number }} v
 * @returns {number} Angle in degrees.
 */
export function vectorAngle(v) {
  if (Math.abs(v.x) < 1e-12 && Math.abs(v.y) < 1e-12) return 0;
  let angleDeg = Math.atan2(v.y, v.x) * (180 / Math.PI);
  if (angleDeg < 0) angleDeg += 360;
  return angleDeg;
}

/**
 * Calculate 1D relative velocities between two objects.
 *
 * @param {Object} params
 * @param {number} params.vA - Velocity of object A relative to ground (positive = rightward).
 * @param {number} params.vB - Velocity of object B relative to ground.
 * @returns {{ vArelB: number, vBrelA: number, vArelG: number, vBrelG: number }}
 */
export function calculate1DRelativeVelocity({ vA, vB }) {
  return {
    vArelB: vA - vB,
    vBrelA: vB - vA,
    vArelG: vA,
    vBrelG: vB,
  };
}

/**
 * Calculate all river crossing physics.
 *
 * Boat velocity relative to water is specified by speed and angle.
 * Angle is measured from the positive x-axis (downstream direction):
 *   90° = straight across (upstream bank to downstream bank perpendicular)
 *   >90° = aiming upstream
 *   <90° = aiming downstream
 *
 * @param {Object} params
 * @param {number} params.boatSpeed - Speed of boat relative to water (m/s).
 * @param {number} params.boatAngle - Direction boat points, degrees from positive x-axis.
 * @param {number} params.riverSpeed - Speed of river current (rightward/downstream, m/s).
 * @param {number} params.riverWidth - Width of river in meters.
 * @returns {Object} Complete crossing analysis.
 */
export function calculateRiverCrossing({ boatSpeed, boatAngle, riverSpeed, riverWidth }) {
  const angleRad = boatAngle * (Math.PI / 180);

  const boatVelWater = {
    x: boatSpeed * Math.cos(angleRad),
    y: boatSpeed * Math.sin(angleRad),
  };

  const waterVelGround = { x: riverSpeed, y: 0 };

  const boatVelGround = vectorAdd(boatVelWater, waterVelGround);

  const resultantSpeed = vectorMagnitude(boatVelGround);
  const resultantAngle = vectorAngle(boatVelGround);

  const vy = boatVelGround.y;
  const canCross = vy > 0.001;

  const crossingTime = canCross ? riverWidth / vy : null;
  const drift = canCross ? boatVelGround.x * crossingTime : null;

  let minDriftAngle = null;
  if (boatSpeed > riverSpeed && riverSpeed > 0) {
    minDriftAngle = Math.acos(-riverSpeed / boatSpeed) * (180 / Math.PI);
  } else if (riverSpeed <= 0) {
    minDriftAngle = 90;
  }

  const minTimeCrossingTime = boatSpeed > 0 ? riverWidth / boatSpeed : null;
  const minTimeDrift = minTimeCrossingTime !== null ? riverSpeed * minTimeCrossingTime : null;

  return {
    boatVelWater,
    waterVelGround,
    boatVelGround,
    resultantSpeed,
    resultantAngle,
    crossingTime,
    drift,
    canCross,
    minDriftAngle,
    minTimeCrossingTime,
    minTimeDrift,
  };
}

/**
 * Calculate how rain appears to a moving person.
 *
 * rainAngle is measured from the horizontal:
 *   90° = straight down (vertical rain)
 *   <90° = rain tilted rightward (wind blowing right)
 *   >90° = rain tilted leftward (wind blowing left)
 *
 * @param {Object} params
 * @param {number} params.rainSpeed - Speed of rain relative to ground (m/s).
 * @param {number} params.rainAngle - Angle of rain from horizontal (degrees). 90 = vertical.
 * @param {number} params.personSpeed - Speed of person walking rightward (m/s).
 * @returns {Object} Rain velocity analysis from both frames.
 */
export function calculateRainRelative({ rainSpeed, rainAngle, personSpeed }) {
  const angleRad = rainAngle * (Math.PI / 180);

  const rainVelGround = {
    x: rainSpeed * Math.cos(angleRad),
    y: -rainSpeed * Math.sin(angleRad),
  };

  const personVelGround = { x: personSpeed, y: 0 };

  const rainVelPerson = vectorSubtract(rainVelGround, personVelGround);

  const apparentRainSpeed = vectorMagnitude(rainVelPerson);

  const absRx = Math.abs(rainVelPerson.x);
  const absRy = Math.abs(rainVelPerson.y);

  let apparentAngleFromVertical = 0;
  if (absRy > 1e-9) {
    apparentAngleFromVertical = Math.atan2(absRx, absRy) * (180 / Math.PI);
  } else if (absRx > 1e-9) {
    apparentAngleFromVertical = 90;
  }

  let umbrellaAngle = apparentAngleFromVertical;
  if (rainVelPerson.x < 0) {
    umbrellaAngle = -apparentAngleFromVertical;
  }

  return {
    rainVelGround,
    personVelGround,
    rainVelPerson,
    apparentRainSpeed,
    apparentAngleFromVertical,
    umbrellaAngle,
  };
}

/**
 * Transform an array of objects' velocities into a given observer's reference frame.
 * Each object's velocity is reduced by the observer's velocity.
 *
 * @param {Object} params
 * @param {Array<{ id: string, vx: number, vy: number, x: number, y: number }>} params.objects
 * @param {{ vx: number, vy: number }} params.observerVelocity
 * @returns {Array<{ id: string, vx: number, vy: number, x: number, y: number }>}
 */
export function transformToFrame({ objects, observerVelocity }) {
  return objects.map((obj) => ({
    ...obj,
    vx: obj.vx - observerVelocity.vx,
    vy: obj.vy - observerVelocity.vy,
  }));
}

/**
 * Compute effective velocities for 1D mode in a given observer frame.
 *
 * @param {Object} params
 * @param {number} params.vA - Velocity of A relative to ground.
 * @param {number} params.vB - Velocity of B relative to ground.
 * @param {string} params.frame - 'ground' | 'A' | 'B'
 * @returns {{ effectiveVA: number, effectiveVB: number, groundVel: number }}
 */
export function get1DFrameVelocities({ vA, vB, frame }) {
  if (frame === 'A') {
    return { effectiveVA: 0, effectiveVB: vB - vA, groundVel: -vA };
  }
  if (frame === 'B') {
    return { effectiveVA: vA - vB, effectiveVB: 0, groundVel: -vB };
  }
  return { effectiveVA: vA, effectiveVB: vB, groundVel: 0 };
}

/**
 * Initialize rain particles at random positions.
 *
 * @param {number} count - Number of particles.
 * @param {number} xCenter - Center X of visible area.
 * @param {number} xRange - Half-width of visible area.
 * @param {number} yMax - Maximum Y (top of visible area).
 * @returns {Array<{ x: number, y: number }>}
 */
export function initRainParticles(count, xCenter, xRange, yMax) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: xCenter + (Math.random() - 0.5) * 2 * xRange,
      y: Math.random() * yMax,
    });
  }
  return particles;
}

/**
 * Update rain particle positions and recycle those that fall below ground.
 *
 * @param {Array<{ x: number, y: number }>} particles - Mutable array of particles.
 * @param {{ x: number, y: number }} velocity - Rain velocity in current frame.
 * @param {number} dt - Time step in seconds.
 * @param {number} xCenter - Center X of recycle zone.
 * @param {number} xRange - Half-width of recycle zone.
 * @param {number} yMax - Maximum Y to recycle to.
 * @param {number} [yMin=0] - Minimum Y (ground level).
 */
export function updateRainParticles(particles, velocity, dt, xCenter, xRange, yMax, yMin) {
  const ground = yMin !== undefined ? yMin : 0;
  for (let i = 0; i < particles.length; i++) {
    particles[i].x += velocity.x * dt;
    particles[i].y += velocity.y * dt;
    if (particles[i].y < ground) {
      particles[i].x = xCenter + (Math.random() - 0.5) * 2 * xRange;
      particles[i].y = yMax + Math.random() * 2;
    }
    if (particles[i].y > yMax + 3) {
      particles[i].y = ground + Math.random() * yMax;
    }
  }
}