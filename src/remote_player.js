/**
 * Remote Player Ghost Car Entity
 * Represents remote drivers with interpolation, team liveries,
 * and pass-through ghost physics (zero physical collision).
 */

import { F1Car } from "./car.js";

export class RemotePlayer {
  constructor(id, name, teamId, track) {
    this.id = id;
    this.name = name || "Driver";
    this.teamId = teamId || "redbull";
    this.car = new F1Car(this.teamId);

    // Initial spawn coordinates matching track grid
    const startIndex = track ? (track.startPointIndex || 0) : 0;
    const pStart = (track && track.sampledPoints && track.sampledPoints[startIndex])
      ? track.sampledPoints[startIndex]
      : { x: 1749, y: 4837, tangentX: 0, tangentY: 1 };

    const heading = Math.atan2(pStart.tangentY, pStart.tangentX);
    this.car.resetToGrid(pStart.x, pStart.y, heading);

    // Network target targets for interpolation
    this.targetX = pStart.x;
    this.targetY = pStart.y;
    this.targetHeading = heading;
    this.targetSpeedKmh = 0;
    this.targetSteerAngle = 0;
    this.targetDrs = false;
    this.targetBraking = false;

    this.lastPacketTime = performance.now();
  }

  applyNetworkUpdate(data) {
    if (typeof data.x === "number") this.targetX = data.x;
    if (typeof data.y === "number") this.targetY = data.y;
    if (typeof data.heading === "number") this.targetHeading = data.heading;
    if (typeof data.speedKmh === "number") this.targetSpeedKmh = data.speedKmh;
    if (typeof data.steerAngle === "number") this.targetSteerAngle = data.steerAngle;
    this.targetDrs = !!data.drsActive;
    this.targetBraking = !!data.braking;
    this.lastPacketTime = performance.now();
  }

  updateInterpolation(dt) {
    // Smooth LERP factor based on frame delta
    const factor = Math.min(1.0, Math.max(0.05, dt * 18));

    // Linear position interpolation
    this.car.x += (this.targetX - this.car.x) * factor;
    this.car.y += (this.targetY - this.car.y) * factor;

    // Shortest-path angular heading interpolation
    let diff = this.targetHeading - this.car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.car.heading += diff * factor;

    this.car.speedKmh += (this.targetSpeedKmh - this.car.speedKmh) * factor;
    this.car.speed = this.car.speedKmh / 3.6;
    this.car.steerAngle += (this.targetSteerAngle - this.car.steerAngle) * factor;
    this.car.drsActive = this.targetDrs;
    this.car.braking = this.targetBraking;
  }
}
