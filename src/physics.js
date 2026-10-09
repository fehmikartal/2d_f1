/**
 * Formula 1 2D Vehicle Physics Simulation Engine
 * Models 8-speed gearbox, aerodynamics (downforce & drag), tire friction circle,
 * ERS hybrid deployment, DRS drag reduction, and track surface modifiers.
 */

export const GEAR_RATIOS = [
  { gear: 1, minSpeed: 0, maxSpeed: 108, ratio: 3.40 },
  { gear: 2, minSpeed: 70, maxSpeed: 152, ratio: 2.50 },
  { gear: 3, minSpeed: 110, maxSpeed: 195, ratio: 1.95 },
  { gear: 4, minSpeed: 150, maxSpeed: 236, ratio: 1.58 },
  { gear: 5, minSpeed: 190, maxSpeed: 275, ratio: 1.30 },
  { gear: 6, minSpeed: 230, maxSpeed: 312, ratio: 1.10 },
  { gear: 7, minSpeed: 270, maxSpeed: 342, ratio: 0.94 },
  { gear: 8, minSpeed: 305, maxSpeed: 375, ratio: 0.82 }
];

export class F1Physics {
  constructor() {
    // F1 Vehicle Specifications
    this.mass = 798; // kg (FIA minimum weight)
    this.enginePowerBhp = 840; // ICE internal combustion engine power
    this.ersPowerBhp = 270;    // MGU-K electric hybrid deploy (this was previously 160)
    this.idleRPM = 4200;
    this.maxRPM = 15000;
    this.shiftRPM = 13500;

    // Aerodynamics
    this.baseDragCoeff = 0.85;
    this.drsDragCoeff = 0.62;  // Drag reduction when wing open
    this.downforceCoeff = 1.65; // $F_{df} \propto v^2$

    // Mechanical Braking & Steering
    this.brakeForce = 28500; // N (Carbon-carbon discs, 5+ G capability)
    this.maxSteerAngle = 0.45; // Radians maximum wheel lock

    // =========================================================================
    // ⚙️ ADJUST TURNING SPEED HERE:
    // `this.turnRateMultiplier`: Turning multiplier for higher gears (Gears 2 to 8) -> 0.30
    // `this.firstGearTurnRateMultiplier`: Turning multiplier in 1st gear / reverse -> 0.60
    // =========================================================================
    this.turnRateMultiplier = 0.30; // <-- Gears 2 to 8: Smooth, controlled
    this.firstGearTurnRateMultiplier = 0.60; // <-- 1st Gear (and Reverse): Agile turning for hairpins

    this.steerResponseSpeed = 4.5;  // How smoothly the wheels turn into position
    this.turnHeadingDamping = 3.8;  // How smoothly the car body rotates into the turn

    // Wheelbase & geometry (meters in physics world, scaled for canvas)
    this.wheelbase = 3.6; // meters
    this.trackWidth = 2.0; // meters
  }

  /**
   * Calculate vehicle state update for a single physics tick
   * @param {Object} car - Current car entity
   * @param {Object} input - Driver inputs { throttle, brake, steer, ers, drs }
   * @param {Object} surface - Track surface under car { grip, drag, rumble, type }
   * @param {number} dt - Delta time in seconds
   */
  update(car, input, surface, dt) {
    // Current forward speed in m/s (1 unit/sec = 1 m/s)
    let speed = car.speed;
    const speedKmh = Math.abs(speed) * 3.6;

    // Dynamic surface grip & rolling resistance
    const surfaceGrip = surface.grip || 1.0;
    const surfaceDrag = surface.drag || 1.0;

    // 1. Aerodynamic Calculations
    const currentDragCoeff = (car.drsActive ? this.drsDragCoeff : this.baseDragCoeff) * surfaceDrag;
    // Aerodynamic drag force: $F_{drag} = 0.5 \cdot \rho \cdot C_D \cdot A \cdot v^2$
    const aeroDrag = 0.5 * 1.225 * currentDragCoeff * 1.6 * (speed * speed) * Math.sign(speed);
    // Aerodynamic downforce: increases vertical load and tire cornering grip at speed!
    const aeroDownforce = 0.5 * 1.225 * this.downforceCoeff * 1.8 * (speed * speed);

    // 2. Transmission & Automatic Gear Selection
    let gear = car.gear;
    if (input.throttle > 0) {
      // Forward throttle input: always desires forward drive
      if (speed < 0) {
        // Recovering from reverse: brake reverse momentum fast and engage forward
        speed += 55 * dt;
        if (speed >= 0) speed = 1.0;
        gear = 1;
      } else {
        if (gear < 1) gear = 1;
        // Auto upshift through gears 1-8
        if (gear < 8 && speedKmh > GEAR_RATIOS[gear - 1].maxSpeed * 0.94) {
          gear++;
        }
        // Auto downshift
        else if (gear > 1 && speedKmh < GEAR_RATIOS[gear - 1].minSpeed * 0.88) {
          gear--;
        }
      }
    } else if (input.brake > 0) {
      if (speed > 1.2) {
        // Forward braking
        if (gear > 1 && speedKmh < GEAR_RATIOS[gear - 1].minSpeed * 0.88) {
          gear--;
        }
      } else {
        // At low speed or stopped: engage reverse
        gear = -1;
      }
    } else {
      // Coasting
      if (speed < -0.5) {
        gear = -1;
      } else if (gear < 1) {
        gear = 1;
      }
    }
    car.gear = gear;

    // 3. Engine RPM calculation
    let targetRPM = this.idleRPM;
    if (gear > 0) {
      const gRatio = GEAR_RATIOS[gear - 1];
      const speedNorm = Math.max(0, (speedKmh - gRatio.minSpeed * 0.4) / (gRatio.maxSpeed - gRatio.minSpeed * 0.4));
      targetRPM = this.idleRPM + speedNorm * (this.maxRPM - this.idleRPM);
      if (input.throttle > 0 && Math.abs(speed) < 5) {
        targetRPM = Math.max(targetRPM, 11500 * input.throttle);
      }
    } else if (gear === -1) {
      // Reverse RPM
      targetRPM = this.idleRPM + (Math.abs(speedKmh) / 60) * 6000;
    }
    targetRPM = Math.min(this.maxRPM, Math.max(this.idleRPM, targetRPM));
    car.rpm = car.rpm + (targetRPM - car.rpm) * Math.min(1.0, dt * 14);

    // 4. Drive Force (Throttle + Hybrid ERS)
    let driveForce = 0;
    if (input.throttle > 0 && gear > 0) {
      let totalBhp = this.enginePowerBhp * (car.rpm / this.maxRPM);

      // ERS Boost deployment (Push to pass)
      if (input.ers && car.ersBattery > 0.01) {
        totalBhp += this.ersPowerBhp;
        car.ersBattery = Math.max(0, car.ersBattery - dt * 0.07);
        car.ersDeploying = true;
      } else {
        car.ersDeploying = false;
      }

      const enginePowerWatts = totalBhp * 745.7;
      const effectiveSpeed = Math.max(12.0, Math.abs(speed));
      driveForce = (enginePowerWatts / effectiveSpeed) * input.throttle * 0.95;

      // Penalize off-track wheel spin & drive traction
      if (!surface.onTrack) {
        if (surface.type === "gravel") driveForce *= 0.18;
        else if (surface.type === "grass") driveForce *= 0.35;
        else if (surface.type === "runoff") driveForce *= 0.65;
      }

      // Traction limit check
      const normalLoad = (this.mass * 9.81 + aeroDownforce) * surfaceGrip;
      const maxTraction = normalLoad * 1.8;
      if (driveForce > maxTraction) {
        driveForce = maxTraction * 0.96;
        car.wheelSpin = 0.4;
      } else {
        car.wheelSpin = Math.max(0, car.wheelSpin - dt * 4);
      }
    } else if (input.brake > 0 && gear === -1) {
      // Reverse drive force (capped at ~65 km/h)
      if (Math.abs(speedKmh) < 65) {
        driveForce = -input.brake * 4200;
      }
    }

    // 5. Braking Force
    let brakeForce = 0;
    if (input.brake > 0 && speed > 1.0) {
      const normalLoad = (this.mass * 9.81 + aeroDownforce) * surfaceGrip;
      const maxBrakeFriction = normalLoad * 2.1;
      brakeForce = Math.min(this.brakeForce * input.brake, maxBrakeFriction);

      // ERS Regeneration under braking
      car.ersBattery = Math.min(1.0, car.ersBattery + dt * 0.05 * input.brake);
    }

    // 6. Net Longitudinal Force & Acceleration
    const netForce = driveForce - (brakeForce * Math.sign(speed)) - aeroDrag;
    const accel = netForce / this.mass;

    // Integrate speed
    speed += accel * dt;

    // Punitive Off-Track Slowdown (Gravel traps, Grass, and Run-off)
    if (!surface.onTrack) {
      if (surface.type === "gravel") {
        // Deep gravel trap: rapidly bleeds speed and prevents acceleration
        speed *= Math.max(0, 1.0 - 4.5 * dt);
      } else if (surface.type === "grass") {
        // Ardennes grass: strong drag, penalizing corner cutting
        speed *= Math.max(0, 1.0 - 2.5 * dt);
      } else if (surface.type === "runoff") {
        // Run-off tarmac beyond track boundary
        speed *= Math.max(0, 1.0 - 0.75 * dt);
      }
    }

    // Natural rolling resistance when coasting
    if (input.throttle === 0 && input.brake === 0) {
      speed *= Math.max(0, 1.0 - (0.008 * surfaceDrag * dt * 60));
    }

    // 7. Steering Dynamics (Controlled, smooth arc - adjustable via this.turnRateMultiplier)
    // Speed-sensitive steering damping: gentle and stable at high speed
    const steerSpeedFactor = Math.max(0.35, 1.0 - (speedKmh / 380) * 0.55);
    const targetSteerAngle = input.steer * this.maxSteerAngle * steerSpeedFactor;
    // Smooth steering wheel transition
    car.steerAngle += (targetSteerAngle - car.steerAngle) * Math.min(1.0, dt * this.steerResponseSpeed);

    // Calculate smooth turning rate: 0.45 in 1st gear (and reverse), 0.30 in later gears (2-8)
    const activeTurnMultiplier = (gear <= 2) ? this.firstGearTurnRateMultiplier : this.turnRateMultiplier;
    const turningSpeed = Math.max(8.0, Math.min(32.0, Math.abs(speed)));
    const turnRadius = this.wheelbase / (Math.sin(car.steerAngle) || 0.0001);
    const targetAngularVel = (turningSpeed / turnRadius) * (speed < 0 ? -1 : 1) * activeTurnMultiplier;

    // Smooth heading rotation transition (graceful, controlled arc)
    car.angularVelocity += (targetAngularVel - car.angularVelocity) * Math.min(1.0, dt * this.turnHeadingDamping);
    car.heading += car.angularVelocity * dt;

    // Fun tire slip calculation (produces visual smoke/skidmarks without draining car speed!)
    const lateralAccel = (speed * speed) / (Math.abs(turnRadius) || 1);
    const maxLateralAccel = 2.6 * 9.81 * surfaceGrip;
    let tireSlip = 0;
    if (lateralAccel > maxLateralAccel && Math.abs(speed) > 25) {
      tireSlip = Math.min(0.55, (lateralAccel - maxLateralAccel) / maxLateralAccel);
      // Very gentle speed bleed on extreme slides
      speed *= (1.0 - tireSlip * 0.012 * dt);
    } else {
      tireSlip = Math.abs(input.steer) * (speedKmh / 350) * 0.22;
    }

    // 8. World Position Update
    const moveAngle = car.heading + (car.angularVelocity > 0 ? -tireSlip * 0.08 : tireSlip * 0.08);
    car.vx = Math.cos(moveAngle) * speed;
    car.vy = Math.sin(moveAngle) * speed;

    car.x += car.vx * dt * 6.5;
    car.y += car.vy * dt * 6.5;

    // Save state back to car
    car.speed = speed;
    car.speedKmh = speedKmh;
    car.tireSlip = tireSlip;
    car.lateralG = lateralAccel / 9.81;
    car.accelG = accel / 9.81;
  }
}
