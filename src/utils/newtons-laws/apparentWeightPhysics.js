/**
 * @file apparentWeightPhysics.js
 * @description Pure physics calculations for apparent weight in accelerating reference frames.
 * Covers elevator, free-fall, and circular motion scenarios.
 * All functions are stateless and side-effect free.
 *
 * Core formula: N = m(g + a_frame)
 * where a_frame > 0 means frame accelerates upward,
 *       a_frame < 0 means frame accelerates downward.
 *
 * @module apparentWeightPhysics
 */

/**
 * Classify the weight state based on g-force value.
 * @param {number} gForce - The ratio of apparent weight to real weight.
 * @returns {'weightless'|'lighter'|'normal'|'heavier'|'crushed'} The weight state classification.
 */
export function classifyWeightState(gForce) {
  if (gForce <= 0.01) return 'weightless';
  if (gForce < 0.9) return 'lighter';
  if (gForce <= 1.1) return 'normal';
  if (gForce <= 3) return 'heavier';
  return 'crushed';
}

/**
 * Calculate apparent weight for a mass in an accelerating reference frame.
 * @param {Object} params
 * @param {number} params.mass - Mass in kg.
 * @param {number} params.gravity - Gravitational acceleration in m/s².
 * @param {number} params.frameAcceleration - Acceleration of the reference frame (positive = upward).
 * @returns {Object} { realWeight, apparentWeight, gForce, state }
 */
export function calculateApparentWeight({ mass, gravity, frameAcceleration }) {
  const realWeight = mass * gravity;
  let apparentWeight = mass * (gravity + frameAcceleration);

  if (apparentWeight < 0) {
    apparentWeight = 0;
  }

  let gForce = 0;
  if (realWeight > 0) {
    gForce = apparentWeight / realWeight;
  } else if (apparentWeight > 0) {
    gForce = Infinity;
  }

  const state = classifyWeightState(gForce);

  return { realWeight, apparentWeight, gForce, state };
}

/**
 * Generate a complete elevator round-trip timeline with 9 phases.
 * The elevator starts at rest on the ground floor, travels up to a top floor,
 * rests, then returns to the ground floor.
 *
 * @param {Object} params
 * @param {number} [params.acceleration=2] - Magnitude of acceleration during accel/decel phases (m/s²).
 * @param {number} [params.restDuration=2] - Duration of rest phases (s).
 * @param {number} [params.accelDuration=3] - Duration of acceleration/deceleration phases (s).
 * @param {number} [params.constVelDuration=4] - Duration of constant velocity phases (s).
 * @returns {Array<Object>} Array of 9 phase objects with { phase, label, startTime, endTime, acceleration, description }.
 */
export function generateElevatorTimeline({
  acceleration = 2,
  restDuration = 2,
  accelDuration = 3,
  constVelDuration = 4,
} = {}) {
  const a = Math.abs(acceleration);
  let t = 0;
  const phases = [];

  // Phase 0: REST_BOTTOM
  phases.push({
    phase: 'REST_BOTTOM',
    label: 'Rest (Ground Floor)',
    startTime: t,
    endTime: t + restDuration,
    acceleration: 0,
    description: 'Elevator at rest on ground floor',
  });
  t += restDuration;

  // Phase 1: ACCEL_UP
  phases.push({
    phase: 'ACCEL_UP',
    label: 'Accelerating Up',
    startTime: t,
    endTime: t + accelDuration,
    acceleration: a,
    description: 'Elevator accelerates upward — you feel heavier',
  });
  t += accelDuration;

  // Phase 2: CONST_VEL_UP
  phases.push({
    phase: 'CONST_VEL_UP',
    label: 'Constant Velocity (Up)',
    startTime: t,
    endTime: t + constVelDuration,
    acceleration: 0,
    description: 'Elevator moves up at constant speed — normal weight',
  });
  t += constVelDuration;

  // Phase 3: DECEL_UP
  phases.push({
    phase: 'DECEL_UP',
    label: 'Decelerating (Arriving Top)',
    startTime: t,
    endTime: t + accelDuration,
    acceleration: -a,
    description: 'Elevator slows down approaching top floor — you feel lighter',
  });
  t += accelDuration;

  // Phase 4: REST_TOP
  phases.push({
    phase: 'REST_TOP',
    label: 'Rest (Top Floor)',
    startTime: t,
    endTime: t + restDuration,
    acceleration: 0,
    description: 'Elevator at rest on top floor',
  });
  t += restDuration;

  // Phase 5: ACCEL_DOWN
  phases.push({
    phase: 'ACCEL_DOWN',
    label: 'Accelerating Down',
    startTime: t,
    endTime: t + accelDuration,
    acceleration: -a,
    description: 'Elevator accelerates downward — you feel lighter',
  });
  t += accelDuration;

  // Phase 6: CONST_VEL_DOWN
  phases.push({
    phase: 'CONST_VEL_DOWN',
    label: 'Constant Velocity (Down)',
    startTime: t,
    endTime: t + constVelDuration,
    acceleration: 0,
    description: 'Elevator moves down at constant speed — normal weight',
  });
  t += constVelDuration;

  // Phase 7: DECEL_DOWN
  phases.push({
    phase: 'DECEL_DOWN',
    label: 'Decelerating (Arriving Ground)',
    startTime: t,
    endTime: t + accelDuration,
    acceleration: a,
    description: 'Elevator slows down approaching ground floor — you feel heavier',
  });
  t += accelDuration;

  // Phase 8: REST_FINAL
  phases.push({
    phase: 'REST_FINAL',
    label: 'Rest (Ground Floor)',
    startTime: t,
    endTime: t + restDuration,
    acceleration: 0,
    description: 'Elevator at rest on ground floor again',
  });

  return phases;
}

/**
 * Get the complete elevator state at a given time by integrating through phases.
 *
 * @param {Array<Object>} timeline - Array of phase objects from generateElevatorTimeline().
 * @param {number} t - Current time in seconds.
 * @param {number} mass - Person mass in kg.
 * @param {number} gravity - Gravitational acceleration in m/s².
 * @returns {Object} { phase, phaseLabel, acceleration, velocity, position, apparentWeight, gForce, state, progress }
 */
export function getElevatorStateAtTime(timeline, t, mass, gravity) {
  if (!timeline || timeline.length === 0) {
    const { apparentWeight, gForce, state } = calculateApparentWeight({
      mass,
      gravity,
      frameAcceleration: 0,
    });
    return {
      phase: { phase: 'REST', label: 'Rest', startTime: 0, endTime: 0, acceleration: 0, description: '' },
      phaseLabel: 'Rest',
      acceleration: 0,
      velocity: 0,
      position: 0,
      apparentWeight,
      gForce,
      state,
      progress: 1,
    };
  }

  const clampedT = Math.max(0, t);
  const lastPhase = timeline[timeline.length - 1];

  // Find current phase
  let currentPhase = lastPhase;
  for (let i = 0; i < timeline.length; i++) {
    if (clampedT >= timeline[i].startTime && clampedT < timeline[i].endTime) {
      currentPhase = timeline[i];
      break;
    }
  }

  if (clampedT >= lastPhase.endTime) {
    currentPhase = lastPhase;
  }

  // Integrate velocity and position through all phases up to current time
  let velocity = 0;
  let position = 0;

  for (let i = 0; i < timeline.length; i++) {
    const phase = timeline[i];
    if (clampedT <= phase.startTime) break;

    const phaseStart = phase.startTime;
    const phaseEnd = Math.min(clampedT, phase.endTime);
    const phaseDt = phaseEnd - phaseStart;

    if (phaseDt <= 0) continue;

    position += velocity * phaseDt + 0.5 * phase.acceleration * phaseDt * phaseDt;
    velocity += phase.acceleration * phaseDt;
  }

  const a = currentPhase.acceleration;

  const { apparentWeight, gForce, state } = calculateApparentWeight({
    mass,
    gravity,
    frameAcceleration: a,
  });

  const phaseDuration = currentPhase.endTime - currentPhase.startTime;
  const progress =
    phaseDuration > 0
      ? Math.min(1, Math.max(0, (clampedT - currentPhase.startTime) / phaseDuration))
      : 1;

  return {
    phase: currentPhase,
    phaseLabel: currentPhase.label,
    acceleration: a,
    velocity,
    position,
    apparentWeight,
    gForce,
    state,
    progress,
  };
}

/**
 * Get the state of a free-fall scenario at a given time.
 * Timeline: held → free fall → impact → rest.
 *
 * @param {Object} params
 * @param {number} params.t - Current time in seconds.
 * @param {number} params.mass - Mass in kg.
 * @param {number} params.gravity - Gravitational acceleration in m/s².
 * @param {number} params.dropHeight - Initial drop height in meters.
 * @param {number} [params.impactDuration=0.1] - Duration of impact deceleration in seconds.
 * @returns {Object} { phase, acceleration, velocity, position, apparentWeight, gForce, heightAboveGround, tRelease, tImpact, tEnd, vImpact }
 */
export function getFreeFallStateAtTime({ t, mass, gravity, dropHeight, impactDuration = 0.1 }) {
  const tRelease = 2;

  if (dropHeight <= 0 || gravity <= 0) {
    const { apparentWeight, gForce } = calculateApparentWeight({
      mass,
      gravity,
      frameAcceleration: 0,
    });
    return {
      phase: 'rest',
      acceleration: 0,
      velocity: 0,
      position: 0,
      apparentWeight,
      gForce,
      heightAboveGround: 0,
      tRelease,
      tImpact: tRelease,
      tEnd: tRelease,
      vImpact: 0,
    };
  }

  const tFall = Math.sqrt((2 * dropHeight) / gravity);
  const tImpact = tRelease + tFall;
  const vImpact = gravity * tFall;
  const aImpact = vImpact / impactDuration;
  const tEnd = tImpact + impactDuration;

  let phase, frameAcceleration, velocity, heightAboveGround;

  if (t < 0) {
    phase = 'held';
    frameAcceleration = 0;
    velocity = 0;
    heightAboveGround = dropHeight;
  } else if (t < tRelease) {
    // HELD
    phase = 'held';
    frameAcceleration = 0;
    velocity = 0;
    heightAboveGround = dropHeight;
  } else if (t < tImpact) {
    // FREE FALL
    phase = 'freefall';
    const dt = t - tRelease;
    frameAcceleration = -gravity;
    velocity = -gravity * dt;
    heightAboveGround = dropHeight - 0.5 * gravity * dt * dt;
    heightAboveGround = Math.max(0, heightAboveGround);
  } else if (t < tEnd) {
    // IMPACT
    phase = 'impact';
    frameAcceleration = aImpact;
    const dt = t - tImpact;
    velocity = -vImpact + aImpact * dt;
    heightAboveGround = 0;
  } else {
    // REST on ground
    phase = 'rest';
    frameAcceleration = 0;
    velocity = 0;
    heightAboveGround = 0;
  }

  const { apparentWeight, gForce } = calculateApparentWeight({
    mass,
    gravity,
    frameAcceleration,
  });

  return {
    phase,
    acceleration: frameAcceleration,
    velocity,
    position: heightAboveGround,
    apparentWeight,
    gForce,
    heightAboveGround,
    tRelease,
    tImpact,
    tEnd,
    vImpact,
  };
}

/**
 * Get the state of circular motion at a given angle on a vertical loop.
 *
 * Formula: N = m(v²/R + g·cos(θ))
 * where θ = 0 is the bottom of the loop, θ = π is the top.
 *
 * @param {Object} params
 * @param {number} params.theta - Angle from bottom of loop in radians (0 = bottom, π = top).
 * @param {number} params.mass - Mass in kg.
 * @param {number} params.gravity - Gravitational acceleration in m/s².
 * @param {number} params.radius - Loop radius in meters.
 * @param {number} params.speed - Tangential speed in m/s (constant for uniform circular motion).
 * @returns {Object} { apparentWeight, gForce, normalForce, centripetalAccel, x, y, state, minSpeedForContact, contactLost }
 */
export function getCircularMotionState({ theta, mass, gravity, radius, speed }) {
  if (radius <= 0) {
    const { apparentWeight, gForce, state } = calculateApparentWeight({
      mass,
      gravity,
      frameAcceleration: 0,
    });
    return {
      apparentWeight,
      gForce,
      normalForce: apparentWeight,
      centripetalAccel: 0,
      x: 0,
      y: 0,
      state,
      minSpeedForContact: 0,
      contactLost: false,
    };
  }

  const centripetalAccel = (speed * speed) / radius;
  const normalForce = mass * (centripetalAccel + gravity * Math.cos(theta));
  const apparentWeight = Math.max(0, normalForce);

  const realWeight = mass * gravity;
  let gForce = 0;
  if (realWeight > 0) {
    gForce = apparentWeight / realWeight;
  } else if (apparentWeight > 0) {
    gForce = Infinity;
  }

  // Position on the loop
  // Center of circle at (0, radius), bottom at (0, 0)
  const x = radius * Math.sin(theta);
  const y = radius - radius * Math.cos(theta);

  const minSpeedForContact = Math.sqrt(gravity * radius);
  const contactLost = normalForce < 0;
  const state = classifyWeightState(gForce);

  return {
    apparentWeight,
    gForce,
    normalForce,
    centripetalAccel,
    x,
    y,
    state,
    minSpeedForContact,
    contactLost,
  };
}