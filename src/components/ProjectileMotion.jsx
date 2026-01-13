import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

const ProjectileMotion = () => {
  const [projectileType, setProjectileType] = useState("angled"); // 'angled' or 'horizontal'
  const [velocity, setVelocity] = useState(40);
  const [angle, setAngle] = useState(45);
  const [height, setHeight] = useState(20);
  const [gravity, setGravity] = useState(9.8);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [maxHeight, setMaxHeight] = useState(0);
  const [range, setRange] = useState(0);
  const [flightTime, setFlightTime] = useState(0);
  const [trail, setTrail] = useState([]);
  const [calculationMode, setCalculationMode] = useState("forward");
  const [givenParameter, setGivenParameter] = useState("range"); // what user inputs
  const [solveFor, setSolveFor] = useState("velocity"); // what to calculate
  const [inputValue, setInputValue] = useState(0); // the input value for inverse mode

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  const gravityOptions = {
    Earth: 9.8,
    "Earth 2": 10.0,
    Moon: 1.62,
    Mars: 3.71,
  };

  // Calculate trajectory parameters
  const calculateTrajectory = () => {
    if (projectileType === "horizontal") {
      // Horizontal projectile: vx = velocity, vy = 0 initially
      const vx = velocity;
      const vy = 0;

      // Time of flight: y = h - 0.5*g*t² = 0 => t = sqrt(2h/g)
      const tFlight = Math.sqrt((2 * height) / gravity);

      // Maximum height is just the initial height
      const hMax = height;

      // Range
      const totalRange = vx * tFlight;

      return { vx, vy, tFlight, hMax, totalRange };
    } else {
      // Angled projectile
      const angleRad = (angle * Math.PI) / 180;
      const vx = velocity * Math.cos(angleRad);
      const vy = velocity * Math.sin(angleRad);

      // Time of flight: solve y = h + vy*t - 0.5*g*t² = 0
      const discriminant = vy * vy + 2 * gravity * height;
      const tFlight = (vy + Math.sqrt(discriminant)) / gravity;

      // Maximum height
      const tMaxHeight = vy / gravity;
      const hMax = height + (vy * vy) / (2 * gravity);

      // Range
      const totalRange = vx * tFlight;

      return { vx, vy, tFlight, hMax, totalRange };
    }
  };

  // Calculate current position and velocity
  const calculatePosition = (t) => {
    if (projectileType === "horizontal") {
      const vx = velocity;
      const x = vx * t;
      const y = height - 0.5 * gravity * t * t;
      const currentVy = -gravity * t;

      return { x, y: Math.max(0, y), vx, vy: currentVy };
    } else {
      const angleRad = (angle * Math.PI) / 180;
      const vx = velocity * Math.cos(angleRad);
      const vy = velocity * Math.sin(angleRad);

      const x = vx * t;
      const y = height + vy * t - 0.5 * gravity * t * t;

      const currentVy = vy - gravity * t;

      return { x, y: Math.max(0, y), vx, vy: currentVy };
    }
  };

  // Solve for velocity given different parameters
  const solveForVelocityFromRange = (
    targetRange,
    launchAngle,
    launchHeight,
    g
  ) => {
    if (projectileType === "horizontal") {
      if (launchHeight <= 0) return 0;
      const timeOfFlight = Math.sqrt((2 * launchHeight) / g);
      return targetRange / timeOfFlight;
    } else {
      const angleRad = (launchAngle * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);

      // For negative angles, we need to ensure proper calculation
      let v = Math.sqrt(
        Math.abs(targetRange * g) / (Math.abs(Math.sin(2 * angleRad)) || 0.1)
      );

      // Newton's method iterations
      for (let i = 0; i < 20; i++) {
        const vx = v * cosA;
        const vy = v * sinA;
        const discriminant = vy * vy + 2 * g * launchHeight;

        if (discriminant < 0) {
          v += 1;
          continue;
        }

        const sqrtDisc = Math.sqrt(discriminant);
        const tFlight = (vy + sqrtDisc) / g;

        // For negative angles, time might be shorter
        if (tFlight <= 0) {
          v += 1;
          continue;
        }

        const calculatedRange = vx * tFlight;
        const error = calculatedRange - targetRange;

        if (Math.abs(error) < 0.01) break;

        // Derivative approximation
        const delta = 0.1;
        const vx2 = (v + delta) * cosA;
        const vy2 = (v + delta) * sinA;
        const discriminant2 = vy2 * vy2 + 2 * g * launchHeight;

        if (discriminant2 >= 0) {
          const tFlight2 = (vy2 + Math.sqrt(discriminant2)) / g;
          const calculatedRange2 = vx2 * tFlight2;
          const derivative = (calculatedRange2 - calculatedRange) / delta;

          if (Math.abs(derivative) > 0.01) {
            v = v - error / derivative;
          }
        }

        if (v < 0.1) v = 0.1;
        if (v > 1000) break; // Prevent infinite growth
      }

      return Math.max(0, v);
    }
  };

  const solveForVelocityFromMaxHeight = (
    targetMaxHeight,
    launchAngle,
    launchHeight,
    g
  ) => {
    if (projectileType === "horizontal") {
      return 0;
    }

    const angleRad = (launchAngle * Math.PI) / 180;
    const sinA = Math.sin(angleRad);

    // For negative angles (diving), max height equals launch height
    if (launchAngle < 0) {
      // Can't have max height > launch height for diving projectile
      if (targetMaxHeight > launchHeight) return 0;
      return 0; // Not solvable for diving projectiles this way
    }

    // For positive angles: h_max = h + vy²/(2g)
    const vySquared = 2 * g * (targetMaxHeight - launchHeight);
    if (vySquared < 0) return 0;
    const vy = Math.sqrt(vySquared);
    return vy / (sinA || 0.01);
  };

  const solveForVelocityFromFlightTime = (
    targetTime,
    launchAngle,
    launchHeight,
    g
  ) => {
    if (projectileType === "horizontal") {
      return 0;
    }

    const angleRad = (launchAngle * Math.PI) / 180;
    const sinA = Math.sin(angleRad);

    // t = (vy + sqrt(vy² + 2gh))/g where vy = v*sin(θ)
    // For negative angles, vy is negative

    // Rearranging: vy = (g*t ± sqrt((g*t)² - 8gh)) / 2
    const discriminant =
      g * targetTime * (g * targetTime) - 8 * g * launchHeight;

    if (discriminant < 0) return 0;

    // For negative angles, use the minus sign
    // For positive angles, use the minus sign (to get smaller positive vy)
    const vy = (g * targetTime - Math.sqrt(discriminant)) / 2;

    return Math.abs(vy) / (Math.abs(sinA) || 0.01);
  };

  // Solve for angle given different parameters
  const solveForAngleFromRange = (
    targetRange,
    launchVelocity,
    launchHeight,
    g
  ) => {
    if (projectileType === "horizontal") return 0;

    let low = -90,
      high = 90,
      bestAngle = 0; // Start at 0 instead of 45

    for (let i = 0; i < 60; i++) {
      // Increased iterations for better accuracy
      const mid = (low + high) / 2;
      const angleRad = (mid * Math.PI) / 180;
      const vx = launchVelocity * Math.cos(angleRad);
      const vy = launchVelocity * Math.sin(angleRad);
      const discriminant = vy * vy + 2 * g * launchHeight;

      if (discriminant < 0) {
        // Can't reach this with current parameters
        if (mid < 0) low = mid;
        else high = mid;
        continue;
      }

      const tFlight = (vy + Math.sqrt(discriminant)) / g;
      const calculatedRange = vx * tFlight;

      if (Math.abs(calculatedRange - targetRange) < 0.01) {
        bestAngle = mid;
        break;
      }

      if (calculatedRange < targetRange) {
        if (mid < 0) high = mid; // For negative angles, increase angle
        else low = mid;
      } else {
        if (mid < 0) low = mid;
        else high = mid;
      }
      bestAngle = mid;
    }

    return bestAngle;
  };

  const solveForAngleFromMaxHeight = (
    targetMaxHeight,
    launchVelocity,
    launchHeight,
    g
  ) => {
    if (projectileType === "horizontal") return 0;

    // For negative angles (diving), max height might be at launch
    if (targetMaxHeight <= launchHeight) {
      // Diving projectile - max height is at start
      // This means we need negative angle
      return -45; // Approximate, would need more complex solving
    }

    // h_max = h + v²sin²(θ)/(2g)
    // sin²(θ) = 2g(h_max - h)/v²
    const sinSquared =
      (2 * g * (targetMaxHeight - launchHeight)) /
      (launchVelocity * launchVelocity);
    if (sinSquared < 0 || sinSquared > 1) return 0;
    return (Math.asin(Math.sqrt(sinSquared)) * 180) / Math.PI;
  };

  const solveForAngleFromFlightTime = (
    targetTime,
    launchVelocity,
    launchHeight,
    g
  ) => {
    if (projectileType === "horizontal") return 0;

    let low = -90,
      high = 90,
      bestAngle = 45; // Changed from 0 to -90

    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2;
      const angleRad = (mid * Math.PI) / 180;
      const vy = launchVelocity * Math.sin(angleRad);
      const discriminant = vy * vy + 2 * g * launchHeight;

      if (discriminant < 0) {
        high = mid;
        continue;
      }

      const tFlight = (vy + Math.sqrt(discriminant)) / g;

      if (Math.abs(tFlight - targetTime) < 0.01) {
        bestAngle = mid;
        break;
      }

      if (tFlight < targetTime) low = mid;
      else high = mid;
      bestAngle = mid;
    }

    return bestAngle;
  };

  // Solve for height given different parameters
  const solveForHeightFromRange = (
    targetRange,
    launchVelocity,
    launchAngle,
    g
  ) => {
    const angleRad = (launchAngle * Math.PI) / 180;
    const vx = launchVelocity * Math.cos(angleRad);
    const vy = launchVelocity * Math.sin(angleRad);

    const term1 = targetRange * g - vx * vy;
    const h = (term1 * term1 - vx * vx * vy * vy) / (2 * g * vx * vx);

    return Math.max(0, h);
  };

  const solveForHeightFromMaxHeight = (
    targetMaxHeight,
    launchVelocity,
    launchAngle,
    g
  ) => {
    if (projectileType === "horizontal") {
      return targetMaxHeight; // Max height IS the launch height
    }
    const angleRad = (launchAngle * Math.PI) / 180;
    const vy = launchVelocity * Math.sin(angleRad);
    // h_max = h + vy²/(2g) => h = h_max - vy²/(2g)
    return targetMaxHeight - (vy * vy) / (2 * g);
  };

  const solveForHeightFromFlightTime = (
    targetTime,
    launchVelocity,
    launchAngle,
    g
  ) => {
    const angleRad = (launchAngle * Math.PI) / 180;
    const vy = launchVelocity * Math.sin(angleRad);
    // t = (vy + sqrt(vy² + 2gh))/g
    // Solving for h: h = ((g*t - vy)² - vy²)/(2g)
    const term = g * targetTime - vy;
    return (term * term - vy * vy) / (2 * g);
  };

  const isMaxHeightValid = () => {
    if (projectileType === "horizontal") return true;
    if (solveFor === "angle") return true;
    return angle >= 0;
  };

  const isLaunchHeightAsGivenValid = () => {
    // Launch height as "given" only makes sense when:
    // 1. We're NOT solving for height (obviously)
    // 2. Angle is negative (diving projectile) - most useful here
    if (solveFor === "height") return false;
    return true; // Allow for all angles, but especially useful for negative
  };

  // Main calculation dispatcher
  const performInverseCalculation = () => {
    const roundedInput = Math.round(inputValue * 100) / 100;

    // Special handling when launch height is the given parameter
    if (givenParameter === "launchHeight") {
      if (solveFor === "height") {
        alert(
          "Error: Cannot calculate launch height when it is the given parameter!"
        );
        return;
      }

      // For launch height as given, we need another constraint (use range)
      const currentRange = range || 100; // Use current calculated range or default

      if (solveFor === "velocity") {
        const calculatedV = solveForVelocityFromRange(
          currentRange,
          angle,
          roundedInput,
          gravity
        );
        setVelocity(Math.round(calculatedV * 10) / 10);
        setHeight(roundedInput); // Update the height to the given value
      } else if (solveFor === "angle" && projectileType === "angled") {
        const calculatedAngle = solveForAngleFromRange(
          currentRange,
          velocity,
          roundedInput,
          gravity
        );
        setAngle(Math.round(calculatedAngle * 10) / 10);
        setHeight(roundedInput);
      }
      return;
    }

    // Validation: Check if combination makes sense
    if (givenParameter === "maxHeight" && angle < 0 && solveFor !== "angle") {
      alert(
        "Error: Cannot use Max Height as input for diving projectiles (negative angles). The maximum height is the launch height itself."
      );
      return;
    }

    if (solveFor === "velocity") {
      let calculatedV = 0;
      if (givenParameter === "range") {
        calculatedV = solveForVelocityFromRange(
          roundedInput,
          angle,
          height,
          gravity
        );
      } else if (givenParameter === "maxHeight") {
        if (angle < 0) {
          alert(
            "Cannot calculate velocity from max height for diving projectiles."
          );
          return;
        }
        calculatedV = solveForVelocityFromMaxHeight(
          roundedInput,
          angle,
          height,
          gravity
        );
      } else if (givenParameter === "flightTime") {
        calculatedV = solveForVelocityFromFlightTime(
          roundedInput,
          angle,
          height,
          gravity
        );
      }
      setVelocity(Math.round(calculatedV * 10) / 10);
    } else if (solveFor === "angle" && projectileType === "angled") {
      let calculatedAngle = 0;
      if (givenParameter === "range") {
        calculatedAngle = solveForAngleFromRange(
          roundedInput,
          velocity,
          height,
          gravity
        );
      } else if (givenParameter === "maxHeight") {
        if (roundedInput < height) {
          alert(
            "Max height less than launch height suggests a diving projectile. Please use Range or Flight Time instead."
          );
          return;
        }
        calculatedAngle = solveForAngleFromMaxHeight(
          roundedInput,
          velocity,
          height,
          gravity
        );
      } else if (givenParameter === "flightTime") {
        calculatedAngle = solveForAngleFromFlightTime(
          roundedInput,
          velocity,
          height,
          gravity
        );
      }
      setAngle(Math.round(calculatedAngle * 10) / 10);
    } else if (solveFor === "height") {
      let calculatedHeight = 0;
      if (givenParameter === "range") {
        calculatedHeight = solveForHeightFromRange(
          roundedInput,
          velocity,
          angle,
          gravity
        );
      } else if (givenParameter === "maxHeight") {
        if (angle < 0) {
          alert(
            "Cannot calculate launch height from max height for diving projectiles."
          );
          return;
        }
        calculatedHeight = solveForHeightFromMaxHeight(
          roundedInput,
          velocity,
          angle,
          gravity
        );
      } else if (givenParameter === "flightTime") {
        calculatedHeight = solveForHeightFromFlightTime(
          roundedInput,
          velocity,
          angle,
          gravity
        );
      }
      setHeight(Math.round(calculatedHeight * 10) / 10);
    }
  };

  // Solve for velocity given range, angle, height, and gravity
  const solveForVelocity = (targetRange, launchAngle, launchHeight, g) => {
    if (projectileType === "horizontal") {
      // For horizontal: R = v * sqrt(2h/g)
      // v = R / sqrt(2h/g)
      if (launchHeight <= 0) return 0;
      const timeOfFlight = Math.sqrt((2 * launchHeight) / g);
      return targetRange / timeOfFlight;
    } else {
      // For angled: R = v²sin(2θ)/g + v*cos(θ)*sqrt(v²sin²(θ) + 2gh)/g
      // This requires solving quadratic equation
      const angleRad = (launchAngle * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const sin2A = Math.sin(2 * angleRad);

      // Using simplified approach for the quadratic formula
      // v² = (R * g) / (sin(2θ) + 2*cos²(θ)*sqrt(1 + 2gh/(R*sin(θ))²))
      // Approximation: v² ≈ (R * g) / (sin(2θ))  for h = 0, then adjust

      const a = sin2A / g;
      const b = (2 * cosA * sinA) / g;
      const c = -targetRange;

      // Better approach: iterate to find v
      let v = Math.sqrt((targetRange * g) / (sin2A || 1));

      // Newton's method iterations
      for (let i = 0; i < 10; i++) {
        const vx = v * cosA;
        const vy = v * sinA;
        const discriminant = vy * vy + 2 * g * launchHeight;
        const tFlight = (vy + Math.sqrt(discriminant)) / g;
        const calculatedRange = vx * tFlight;
        const error = calculatedRange - targetRange;

        if (Math.abs(error) < 0.01) break;

        // Derivative approximation
        const delta = 0.1;
        const vx2 = (v + delta) * cosA;
        const vy2 = (v + delta) * sinA;
        const discriminant2 = vy2 * vy2 + 2 * g * launchHeight;
        const tFlight2 = (vy2 + Math.sqrt(discriminant2)) / g;
        const calculatedRange2 = vx2 * tFlight2;
        const derivative = (calculatedRange2 - calculatedRange) / delta;

        if (Math.abs(derivative) > 0.01) {
          v = v - error / derivative;
        }

        if (v < 0) v = 1;
      }

      return Math.max(0, v);
    }
  };

  // Solve for angle given range, velocity, height, and gravity (angled launch only)
  const solveForAngle = (targetRange, launchVelocity, launchHeight, g) => {
    if (projectileType === "horizontal") return 0;

    // Binary search for angle
    let low = 0,
      high = 90;
    let bestAngle = 45;

    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2;
      const angleRad = (mid * Math.PI) / 180;
      const vx = launchVelocity * Math.cos(angleRad);
      const vy = launchVelocity * Math.sin(angleRad);
      const discriminant = vy * vy + 2 * g * launchHeight;
      const tFlight = (vy + Math.sqrt(discriminant)) / g;
      const calculatedRange = vx * tFlight;

      if (Math.abs(calculatedRange - targetRange) < 0.01) {
        bestAngle = mid;
        break;
      }

      if (calculatedRange < targetRange) {
        low = mid;
      } else {
        high = mid;
      }
      bestAngle = mid;
    }

    return bestAngle;
  };

  // Solve for height given range, velocity, angle, and gravity
  const solveForHeight = (targetRange, launchVelocity, launchAngle, g) => {
    const angleRad = (launchAngle * Math.PI) / 180;
    const vx = launchVelocity * Math.cos(angleRad);
    const vy = launchVelocity * Math.sin(angleRad);

    // R = vx * ((vy + sqrt(vy² + 2gh)) / g)
    // Solving for h:
    // R*g = vx*vy + vx*sqrt(vy² + 2gh)
    // R*g - vx*vy = vx*sqrt(vy² + 2gh)
    // (R*g - vx*vy)² = vx²(vy² + 2gh)
    // (R*g - vx*vy)² = vx²*vy² + 2*g*h*vx²
    // h = ((R*g - vx*vy)² - vx²*vy²) / (2*g*vx²)

    const term1 = targetRange * g - vx * vy;
    const h = (term1 * term1 - vx * vx * vy * vy) / (2 * g * vx * vx);

    return Math.max(0, h);
  };

  const solveForVelocityFromLaunchHeight = (
    givenHeight,
    launchAngle,
    targetRange,
    g
  ) => {
    // When launch height is "given", we solve using the range
    // This is essentially the same as solveForVelocityFromRange but with the given height
    return solveForVelocityFromRange(targetRange, launchAngle, givenHeight, g);
  };

  const solveForAngleFromLaunchHeight = (
    givenHeight,
    launchVelocity,
    targetRange,
    g
  ) => {
    return solveForAngleFromRange(targetRange, launchVelocity, givenHeight, g);
  };

  // Animation loop
  useEffect(() => {
    if (!isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      setTime((prevTime) => {
        const newTime = prevTime + deltaTime * speed;
        const { x, y, vx, vy } = calculatePosition(newTime);

        setPosition({ x, y });

        // Add to trail
        setTrail((prev) => [...prev.slice(-50), { x, y }]);

        // Check if landed
        if (y <= 0 && newTime > 0) {
          setIsRunning(false);
          const { tFlight, totalRange } = calculateTrajectory();
          setFlightTime(tFlight);
          setRange(totalRange);
          return tFlight;
        }

        return newTime;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, speed, velocity, angle, height, gravity]);

  // Calculate max height and range when parameters change
  useEffect(() => {
    const { hMax, totalRange, tFlight } = calculateTrajectory();
    setMaxHeight(hMax);
    if (!isRunning && calculationMode !== "inverse") {
      setRange(totalRange);
      setFlightTime(tFlight);
    }
  }, [velocity, angle, height, gravity, projectileType, calculationMode]);

  // Add this new useEffect after the existing useEffects
  useEffect(() => {
    if (calculationMode === "inverse") {
      // Auto-switch from maxHeight if it becomes invalid
      if (givenParameter === "maxHeight" && !isMaxHeightValid()) {
        setGivenParameter("range");
        setInputValue(0);
      }

      // Auto-switch from launchHeight if we're solving for height
      if (givenParameter === "launchHeight" && solveFor === "height") {
        setGivenParameter("range");
        setInputValue(0);
      }

      // Update input value when height changes and it's the given parameter
      if (givenParameter === "launchHeight") {
        setInputValue(height);
      }
    }
  }, [
    angle,
    solveFor,
    calculationMode,
    givenParameter,
    projectileType,
    height,
  ]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate scale
    const { totalRange, hMax } = calculateTrajectory();
    const maxDistance = Math.max(totalRange, 50);
    const maxHeightDisplay = Math.max(hMax + 10, 30);

    const scaleX = (width - 100) / maxDistance;
    const scaleY = (height - 100) / maxHeightDisplay;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = 50;
    const offsetY = height - 50;

    // Draw grid with dynamic intervals
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;

    // Calculate appropriate grid intervals to keep line count constant
    const targetGridLines = 10; // Keep this constant for performance

    // Calculate nice intervals (round to 5, 10, 20, 50, etc.)
    const getNiceInterval = (maxValue) => {
      const rawInterval = maxValue / targetGridLines;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
      const normalized = rawInterval / magnitude;

      let niceInterval;
      if (normalized <= 1) niceInterval = magnitude;
      else if (normalized <= 2) niceInterval = 2 * magnitude;
      else if (normalized <= 5) niceInterval = 5 * magnitude;
      else niceInterval = 10 * magnitude;

      return niceInterval;
    };

    const xInterval = getNiceInterval(maxDistance);
    const yInterval = getNiceInterval(maxHeightDisplay);

    // Draw vertical grid lines (constant number)
    for (let i = 0; i <= maxDistance; i += xInterval) {
      ctx.beginPath();
      ctx.moveTo(offsetX + i * scale, offsetY);
      ctx.lineTo(offsetX + i * scale, 20);
      ctx.stroke();
    }

    // Draw horizontal grid lines (constant number)
    for (let i = 0; i <= maxHeightDisplay; i += yInterval) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY - i * scale);
      ctx.lineTo(width - 20, offsetY - i * scale);
      ctx.stroke();
    }

    // Draw ground
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(width - 20, offsetY);
    ctx.stroke();

    // Draw launch platform if height > 0
    if (height > 0) {
      ctx.fillStyle = "#6366f1";
      ctx.fillRect(
        offsetX - 10,
        offsetY - height * scale - 5,
        20,
        height * scale + 5
      );
    }

    // Draw trajectory trail
    if (trail.length > 1) {
      ctx.strokeStyle = "#a78bfa";
      ctx.lineWidth = 2;
      ctx.beginPath();
      trail.forEach((point, i) => {
        const x = offsetX + point.x * scale;
        const y = offsetY - point.y * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw full trajectory path (prediction)
    if (!isRunning && time === 0) {
      ctx.strokeStyle = "#c4b5fd";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();

      const { tFlight } = calculateTrajectory();
      for (let t = 0; t <= tFlight; t += 0.1) {
        const { x, y } = calculatePosition(t);
        const canvasX = offsetX + x * scale;
        const canvasY = offsetY - y * scale;
        if (t === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw projectile
    const projX = offsetX + position.x * scale;
    const projY = offsetY - position.y * scale;

    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.arc(projX, projY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw velocity vector
    if (isRunning || time > 0) {
      const { vx, vy } = calculatePosition(time);
      const vMag = Math.sqrt(vx * vx + vy * vy);
      const arrowLength = Math.min(vMag * 2, 60);
      const arrowAngle = Math.atan2(vy, vx);

      const endX = projX + arrowLength * Math.cos(arrowAngle);
      const endY = projY - arrowLength * Math.sin(arrowAngle);

      // Color based on direction
      ctx.strokeStyle = vy >= 0 ? "#10b981" : "#ef4444";
      ctx.fillStyle = vy >= 0 ? "#10b981" : "#ef4444";
      ctx.lineWidth = 2;

      // Arrow line
      ctx.beginPath();
      ctx.moveTo(projX, projY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Arrow head
      const headLength = 10;
      const headAngle = Math.PI / 6;

      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLength * Math.cos(arrowAngle - headAngle),
        endY + headLength * Math.sin(arrowAngle - headAngle)
      );
      ctx.lineTo(
        endX - headLength * Math.cos(arrowAngle + headAngle),
        endY + headLength * Math.sin(arrowAngle + headAngle)
      );
      ctx.closePath();
      ctx.fill();
    }

    // Draw distance markers
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";

    for (let i = 0; i <= maxDistance; i += xInterval) {
      ctx.fillText(`${i}m`, offsetX + i * scale, offsetY + 20);
    }
  }, [position, trail, isRunning, time, velocity, angle, height, gravity]);

  const handleLaunch = () => {
    if (isRunning) {
      setIsRunning(false);
    } else if (time === 0 || time >= flightTime) {
      setTime(0);
      setPosition({ x: 0, y: height });
      setTrail([]);
      lastTimeRef.current = 0;
      setIsRunning(true);
    } else {
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    setPosition({ x: 0, y: height });
    setTrail([]);
    lastTimeRef.current = 0;
    const { hMax, totalRange, tFlight } = calculateTrajectory();
    setMaxHeight(hMax);
    setRange(totalRange);
    setFlightTime(tFlight);
  };

  const handleCompleteSimulation = () => {
    setIsRunning(false);
    const { tFlight, totalRange } = calculateTrajectory();

    // Set final position
    setPosition({ x: totalRange, y: 0 });
    setTime(tFlight);
    setFlightTime(tFlight);
    setRange(totalRange);

    // Generate complete trail
    const completeTrail = [];
    for (let t = 0; t <= tFlight; t += tFlight / 50) {
      const { x, y } = calculatePosition(t);
      completeTrail.push({ x, y });
    }
    setTrail(completeTrail);

    lastTimeRef.current = 0;
  };

  const currentVelocity = calculatePosition(time);
  const resultantVelocity = Math.sqrt(
    currentVelocity.vx * currentVelocity.vx +
      currentVelocity.vy * currentVelocity.vy
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">
            Projectile Motion Simulator
          </h1>
          <p className="text-gray-600">
            Interactive physics visualization for Grade 11-12 students
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-5">
              <h2 className="text-xl font-bold text-indigo-900 mb-4">
                Launch Parameters
              </h2>

              {/* Projectile Type Selector */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Projectile Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => !isRunning && setProjectileType("angled")}
                    disabled={isRunning}
                    className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                      projectileType === "angled"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    Angled Launch
                  </button>
                  <button
                    onClick={() =>
                      !isRunning && setProjectileType("horizontal")
                    }
                    disabled={isRunning}
                    className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                      projectileType === "horizontal"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    Horizontal Launch
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {projectileType === "angled"
                    ? "Launch at any angle (-90° to 90°). Use negative for diving projectiles"
                    : "Launch horizontally from a height (initial Vy = 0)"}
                </p>
              </div>

              {/* New Code start */}
              {/* Calculation Mode Toggle */}
              <div className="mb-5 pb-5 border-b border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Calculation Mode
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => {
                      setCalculationMode("forward");
                      !isRunning && handleReset();
                    }}
                    disabled={isRunning}
                    className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                      calculationMode === "forward"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    Standard Mode
                  </button>
                  <button
                    onClick={() => {
                      setCalculationMode("inverse");
                      !isRunning && handleReset();
                    }}
                    disabled={isRunning}
                    className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                      calculationMode === "inverse"
                        ? "bg-orange-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    Inverse Mode
                  </button>
                </div>

                {calculationMode === "inverse" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">
                        Given (Input):
                      </label>
                      <select
                        value={givenParameter}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setGivenParameter(newValue);

                          // Set initial input value based on selection
                          if (newValue === "launchHeight") {
                            setInputValue(height);
                          } else {
                            setInputValue(0);
                          }

                          !isRunning && handleReset();
                        }}
                        disabled={isRunning}
                        className="w-full px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      >
                        <option value="range">Range (R)</option>
                        {isMaxHeightValid() && (
                          <option value="maxHeight">Max Height (H_max)</option>
                        )}
                        <option value="flightTime">Flight Time (t)</option>
                        {isLaunchHeightAsGivenValid() && (
                          <option value="launchHeight">
                            Launch Height (h)
                          </option>
                        )}
                      </select>

                      {angle < 0 && givenParameter === "launchHeight" && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Launch height is useful for diving projectile
                          calculations
                        </p>
                      )}

                      {!isMaxHeightValid() &&
                        givenParameter === "maxHeight" && (
                          <p className="text-xs text-red-600 mt-1">
                            ⚠ Max height not valid for diving projectiles.
                            Switching to Range.
                          </p>
                        )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">
                        Calculate (Solve for):
                      </label>
                      <select
                        value={solveFor}
                        onChange={(e) => {
                          setSolveFor(e.target.value);
                          !isRunning && handleReset();
                        }}
                        disabled={isRunning}
                        className="w-full px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                      >
                        <option value="velocity">Initial Velocity (v₀)</option>
                        {projectileType === "angled" && (
                          <option value="angle">Launch Angle (θ)</option>
                        )}
                        <option value="height">Launch Height (h)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">
                        Input Value:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={inputValue}
                        onChange={(e) => setInputValue(Number(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            performInverseCalculation();
                          }
                        }}
                        disabled={isRunning}
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        placeholder={
                          givenParameter === "range"
                            ? "Enter range (m)"
                            : givenParameter === "maxHeight"
                            ? "Enter max height (m) - only for upward launches"
                            : givenParameter === "flightTime"
                            ? "Enter flight time (s)"
                            : "Enter launch height (m)"
                        }
                      />
                    </div>

                    <p className="text-xs text-orange-600">
                      Enter the{" "}
                      {givenParameter === "range"
                        ? "range"
                        : givenParameter === "maxHeight"
                        ? "max height"
                        : "flight time"}{" "}
                      value and press Enter or click Calculate below
                    </p>
                  </div>
                )}
              </div>

              {/* New Code End */}

              {/* Initial Velocity */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {projectileType === "horizontal"
                    ? "Horizontal Velocity"
                    : "Initial Velocity"}
                  : {velocity} m/s
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={velocity}
                  onChange={(e) =>
                    !isRunning && setVelocity(Number(e.target.value))
                  }
                  disabled={
                    isRunning ||
                    (calculationMode === "inverse" && solveFor === "velocity")
                  }
                  className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={velocity}
                  onChange={(e) =>
                    !isRunning && setVelocity(Number(e.target.value))
                  }
                  disabled={
                    isRunning ||
                    (calculationMode === "inverse" && solveFor === "velocity")
                  }
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>

              {/* Launch Angle - Only show for angled projectile */}
              {projectileType === "angled" && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Launch Angle: {angle}°
                  </label>

                  {/* Improve range slider with better styling for negative values */}
                  <div className="relative">
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      step="1"
                      value={angle}
                      onChange={(e) =>
                        !isRunning && setAngle(Number(e.target.value))
                      }
                      disabled={
                        isRunning ||
                        (calculationMode === "inverse" && solveFor === "angle")
                      }
                      className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>-90°</span>
                      <span>0°</span>
                      <span>90°</span>
                    </div>
                  </div>

                  {/* Better number input that handles negative signs properly */}
                  <input
                    type="text"
                    value={angle}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow typing negative sign, numbers, and empty string
                      if (value === "" || value === "-") {
                        // Temporarily allow these during typing
                        return;
                      }
                      const numValue = parseFloat(value);
                      if (
                        !isNaN(numValue) &&
                        numValue >= -90 &&
                        numValue <= 90
                      ) {
                        !isRunning && setAngle(numValue);
                      }
                    }}
                    onBlur={(e) => {
                      // When user leaves the field, ensure valid number
                      const value = e.target.value;
                      if (value === "" || value === "-") {
                        setAngle(0);
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          setAngle(Math.max(-90, Math.min(90, numValue)));
                        } else {
                          setAngle(0);
                        }
                      }
                    }}
                    disabled={
                      isRunning ||
                      (calculationMode === "inverse" && solveFor === "angle")
                    }
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    placeholder="Enter angle (-90 to 90)"
                  />

                  <p className="text-xs text-gray-500 mt-1">
                    Positive = upward launch, 0° = horizontal, Negative =
                    diving/downward
                  </p>
                </div>
              )}

              {/* Launch Height */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Launch Height: {height} m
                  {projectileType === "horizontal" && (
                    <span className="text-red-600"> *</span>
                  )}
                  {calculationMode === "inverse" &&
                    givenParameter === "launchHeight" && (
                      <span className="text-orange-600"> (Given)</span>
                    )}
                </label>
                <input
                  type="range"
                  min={projectileType === "horizontal" ? "1" : "0"}
                  max="50"
                  value={height}
                  onChange={(e) =>
                    !isRunning && setHeight(Number(e.target.value))
                  }
                  disabled={
                    isRunning ||
                    (calculationMode === "inverse" &&
                      (solveFor === "height" ||
                        givenParameter === "launchHeight"))
                  }
                  className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
                <input
                  type="number"
                  min={projectileType === "horizontal" ? "1" : "0"}
                  max="50"
                  value={height}
                  onChange={(e) =>
                    !isRunning && setHeight(Number(e.target.value))
                  }
                  disabled={
                    isRunning ||
                    (calculationMode === "inverse" &&
                      (solveFor === "height" ||
                        givenParameter === "launchHeight"))
                  }
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                {projectileType === "horizontal" && (
                  <p className="text-xs text-red-600 mt-1">
                    * Required for horizontal launch
                  </p>
                )}
              </div>

              {/* Gravity */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gravity Environment
                </label>
                <select
                  value={Object.keys(gravityOptions).find(
                    (key) => gravityOptions[key] === gravity
                  )}
                  onChange={(e) =>
                    !isRunning && setGravity(gravityOptions[e.target.value])
                  }
                  disabled={isRunning}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {Object.keys(gravityOptions).map((planet) => (
                    <option key={planet} value={planet}>
                      {planet} ({gravityOptions[planet]} m/s²)
                    </option>
                  ))}
                </select>
              </div>

              {/* Calculate Button - Only show in inverse mode */}
              {calculationMode === "inverse" && (
                <div className="mb-5">
                  <button
                    onClick={performInverseCalculation}
                    disabled={isRunning}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Calculate{" "}
                    {solveFor === "velocity"
                      ? "Velocity"
                      : solveFor === "angle"
                      ? "Angle"
                      : "Height"}
                  </button>
                </div>
              )}

              {/* Speed Control */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Playback Speed: {speed}x
                </label>
                <div className="flex gap-2">
                  {[0.5, 1, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        speed === s
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Control Buttons */}
              {/* <div className="flex gap-2">
                <button
                  onClick={handleLaunch}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {isRunning ? <Pause size={20} /> : <Play size={20} />}
                  {isRunning ? "Pause" : "Launch"}
                </button>
                <button
                  onClick={handleReset}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors"
                >
                  <RotateCcw size={20} />
                </button>
              </div> */}

              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleLaunch}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {isRunning ? <Pause size={20} /> : <Play size={20} />}
                    {isRunning ? "Pause" : "Launch"}
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors"
                  >
                    <RotateCcw size={20} />
                  </button>
                </div>

                <button
                  onClick={handleCompleteSimulation}
                  disabled={isRunning}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  Complete Simulation
                </button>
              </div>
            </div>
          </div>

          {/* Main Area - Visualization */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-5">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="w-full border border-gray-200 rounded-lg"
              />
            </div>

            {/* Live Calculations */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Time</div>
                <div className="text-2xl font-bold text-indigo-900">
                  {time.toFixed(2)}s
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Height</div>
                <div className="text-2xl font-bold text-indigo-900">
                  {position.y.toFixed(2)}m
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Distance</div>
                <div className="text-2xl font-bold text-indigo-900">
                  {position.x.toFixed(2)}m
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Max Height</div>
                <div className="text-2xl font-bold text-purple-900">
                  {maxHeight.toFixed(2)}m
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total Range</div>
                <div className="text-2xl font-bold text-purple-900">
                  {range.toFixed(2)}m
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Flight Time</div>
                <div className="text-2xl font-bold text-purple-900">
                  {flightTime.toFixed(2)}s
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">
                  Vₓ (Horizontal)
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {currentVelocity.vx.toFixed(2)}m/s
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Vᵧ (Vertical)</div>
                <div className="text-2xl font-bold text-red-900">
                  {currentVelocity.vy.toFixed(2)}m/s
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="text-sm text-gray-600 mb-1">
                  Resultant Velocity
                </div>
                <div className="text-2xl font-bold text-indigo-900">
                  {resultantVelocity.toFixed(2)}m/s
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectileMotion;
