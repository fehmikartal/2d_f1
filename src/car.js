/**
 * Top-down Formula 1 Car Entity & Realistic Livery Renderer
 */

export const F1_TEAMS = {
  redbull: {
    id: "redbull",
    name: "Red Bull Racing",
    driver: "Max Verstappen",
    number: "1",
    primaryColor: "#0b1528",
    secondaryColor: "#dc0000",
    accentColor: "#ffd200",
    helmetColor: "#ffd200"
  },
  ferrari: {
    id: "ferrari",
    name: "Scuderia Ferrari",
    driver: "Charles Leclerc",
    number: "16",
    primaryColor: "#c30000",
    secondaryColor: "#111111",
    accentColor: "#ffe600",
    helmetColor: "#ffffff"
  },
  mercedes: {
    id: "mercedes",
    name: "Mercedes-AMG Petronas",
    driver: "Lewis Hamilton",
    number: "44",
    primaryColor: "#15151e",
    secondaryColor: "#c0c0c8",
    accentColor: "#00d2be",
    helmetColor: "#e6e600"
  },
  mclaren: {
    id: "mclaren",
    name: "McLaren F1 Team",
    driver: "Lando Norris",
    number: "4",
    primaryColor: "#ff8000",
    secondaryColor: "#1a1a24",
    accentColor: "#47c7fc",
    helmetColor: "#ffff00"
  },
  aston: {
    id: "aston",
    name: "Aston Martin Aramco",
    driver: "Fernando Alonso",
    number: "14",
    primaryColor: "#00594f",
    secondaryColor: "#00352f",
    accentColor: "#cedc00",
    helmetColor: "#39b54a"
  }
};

export class F1Car {
  constructor(teamId = "redbull", isPlayer = true) {
    this.isPlayer = isPlayer;
    this.team = F1_TEAMS[teamId] || F1_TEAMS.redbull;

    // Spatial & Dynamic State (Starting 2 turns behind Start/Finish line)
    this.x = 1749;
    this.y = 4837;
    this.heading = -1.53; // Heading north towards Bus Stop chicane
    this.speed = 0;       // m/s
    this.speedKmh = 0;
    this.vx = 0;
    this.vy = 0;
    this.angularVelocity = 0;
    this.steerAngle = 0;

    // Transmission & Engine
    this.gear = 1;
    this.rpm = 4200;
    this.wheelSpin = 0;
    this.tireSlip = 0;
    this.lateralG = 0;
    this.accelG = 0;

    // ERS & DRS Systems
    this.ersBattery = 1.0; // 100% capacity
    this.ersDeploying = false;
    this.drsAvailable = false;
    this.drsActive = false;
    this.drsFlapOpen = 0; // Animation 0..1

    // Lap & Timing
    this.currentLap = 1;
    this.lapDistance = 0;
    this.lapProgress = 0; // t in [0..1]
    this.lapStartTime = 0;
    this.currentLapTime = 0;
    this.lastLapTime = null;
    this.bestLapTime = null;
    this.sectorTimes = [null, null, null];
    this.bestSectors = [null, null, null];
    this.currentSector = 1;
    this.lapValid = true;
    this.trackLimitsStrikes = 0;

    // Visual Dimensions (World Units)
    this.length = 56;
    this.width = 24;

    // Particles & FX
    this.sparks = [];
    this.smoke = [];
    this.rearLightBlink = 0;
    this.flameTimer = 0;
  }

  setTeam(teamId) {
    if (F1_TEAMS[teamId]) {
      this.team = F1_TEAMS[teamId];
    }
  }

  resetToGrid(x = 1749, y = 4837, heading = -1.53) {
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.speed = 0;
    this.speedKmh = 0;
    this.vx = 0;
    this.vy = 0;
    this.gear = 1;
    this.rpm = 4200;
    this.angularVelocity = 0;
    this.steerAngle = 0;
    this.drsActive = false;
    this.drsFlapOpen = 0;
    this.ersBattery = 1.0;
    this.ersDeploying = false;
    this.sparks = [];
    this.smoke = [];
  }

  updateFX(dt, surface, isBraking) {
    // DRS flap animation
    const targetFlap = this.drsActive ? 1.0 : 0.0;
    this.drsFlapOpen += (targetFlap - this.drsFlapOpen) * Math.min(1.0, dt * 20);

    // Rear FIA rain / battery safety light blinking
    this.rearLightBlink = (this.rearLightBlink + dt * 7) % 1.0;

    // Bottoming out / sparks generation:
    // Eau Rouge compression (high speed + elevation change) or aggressive kerb riding
    const speedRatio = Math.abs(this.speedKmh) / 330;
    if ((surface.rumble || speedRatio > 0.88) && Math.random() < speedRatio * 0.45) {
      this.spawnSparks();
    }

    // Tire smoke on heavy slide or lockup
    if ((this.tireSlip > 0.45 || (isBraking && this.speedKmh > 120)) && Math.random() < 0.6) {
      this.spawnSmoke();
    }

    // Update existing spark particles
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 2.8;
      if (p.life <= 0) this.sparks.splice(i, 1);
    }

    // Update existing smoke particles
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const p = this.smoke[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += dt * 14;
      p.alpha -= dt * 1.5;
      if (p.alpha <= 0) this.smoke.splice(i, 1);
    }
  }

  spawnSparks() {
    // Underbody titanium skid block sparks emitted behind the rear axle
    const rearX = this.x - Math.cos(this.heading) * (this.length * 0.4);
    const rearY = this.y - Math.sin(this.heading) * (this.length * 0.4);

    for (let i = 0; i < 3; i++) {
      const spread = (Math.random() - 0.5) * 0.8;
      const angle = this.heading + Math.PI + spread;
      const spd = 40 + Math.random() * 80;
      this.sparks.push({
        x: rearX + (Math.random() - 0.5) * 8,
        y: rearY + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.25 + Math.random() * 0.25,
        color: Math.random() > 0.3 ? "#ffaa11" : "#ffffff"
      });
    }
  }

  spawnSmoke() {
    // Smoke from rear/front sliding tires
    const rearX = this.x - Math.cos(this.heading) * (this.length * 0.35);
    const rearY = this.y - Math.sin(this.heading) * (this.length * 0.35);

    this.smoke.push({
      x: rearX + (Math.random() - 0.5) * 12,
      y: rearY + (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15,
      size: 5 + Math.random() * 4,
      alpha: 0.65
    });
  }

  /**
   * Render the top-down Formula 1 Car onto the canvas context
   */
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading);

    const L = this.length;
    const W = this.width;
    const halfL = L * 0.5;
    const halfW = W * 0.5;

    // --- 1. Vehicle Drop Shadow ---
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.filter = "blur(4px)";
    ctx.fillRect(-halfL - 2, -halfW - 2, L + 4, W + 4);
    ctx.restore();

    // --- 2. Wheels / Tires (Pirelli Slicks with compound rings) ---
    const tireL = 13;
    const tireW = 6.5;
    const tireFrontX = halfL * 0.62;
    const tireRearX = -halfL * 0.64;
    const tireOffsetY = halfW * 0.88;

    // Render Front Left & Front Right Wheels (Steerable)
    this.drawTire(ctx, tireFrontX, -tireOffsetY, tireL, tireW, this.steerAngle);
    this.drawTire(ctx, tireFrontX, tireOffsetY, tireL, tireW, this.steerAngle);

    // Render Rear Left & Rear Right Wheels (Fixed)
    this.drawTire(ctx, tireRearX, -tireOffsetY - 1, tireL + 1, tireW + 1.5, 0);
    this.drawTire(ctx, tireRearX, tireOffsetY + 1, tireL + 1, tireW + 1.5, 0);

    // --- 3. Front Wing Assembly (Proportionate F1 wing span) ---
    const fwSpan = 27; // Matches front tire outer width (sleek & realistic)
    ctx.fillStyle = "#111115";
    // Front wing main plane
    ctx.beginPath();
    ctx.roundRect(halfL * 0.82, -fwSpan * 0.5, 5.5, fwSpan, 1.5);
    ctx.fill();

    // Endplates & Team colored tips
    ctx.fillStyle = this.team.primaryColor;
    ctx.fillRect(halfL * 0.79, -fwSpan * 0.5, 6.5, 1.8);
    ctx.fillRect(halfL * 0.79, fwSpan * 0.5 - 1.8, 6.5, 1.8);

    // Front wing aerodynamic flaps
    ctx.fillStyle = this.team.accentColor;
    ctx.fillRect(halfL * 0.83, -fwSpan * 0.44, 2.0, fwSpan * 0.88);

    // --- 4. Main Monocoque Chassis & Nosecone ---
    // Smooth sculpted F1 carbon body shape
    ctx.beginPath();
    ctx.moveTo(halfL * 0.95, 0); // Tip of the nose
    ctx.lineTo(halfL * 0.65, -halfW * 0.28); // Nose cone widening
    ctx.lineTo(halfL * 0.35, -halfW * 0.40); // Cockpit front bulkhead
    ctx.lineTo(halfL * 0.15, -halfW * 0.75); // Sidepod leading edge
    ctx.lineTo(-halfL * 0.25, -halfW * 0.70); // Sidepod undercut waist
    ctx.lineTo(-halfL * 0.60, -halfW * 0.35); // Coke-bottle engine cover taper
    ctx.lineTo(-halfL * 0.85, -halfW * 0.22); // Rear crash structure
    ctx.lineTo(-halfL * 0.85, halfW * 0.22);
    ctx.lineTo(-halfL * 0.60, halfW * 0.35);
    ctx.lineTo(-halfL * 0.25, halfW * 0.70);
    ctx.lineTo(halfL * 0.15, halfW * 0.75);
    ctx.lineTo(halfL * 0.35, halfW * 0.40);
    ctx.lineTo(halfL * 0.95, 0);
    ctx.closePath();

    ctx.fillStyle = this.team.primaryColor;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- 5. Livery Accent Stripes & Sidepod Highlights ---
    ctx.fillStyle = this.team.secondaryColor;
    // Sidepod radiator tops
    ctx.fillRect(-halfL * 0.1, -halfW * 0.65, halfL * 0.35, halfW * 0.3);
    ctx.fillRect(-halfL * 0.1, halfW * 0.35, halfL * 0.35, halfW * 0.3);

    // Accent line along spine
    ctx.fillStyle = this.team.accentColor;
    ctx.beginPath();
    ctx.moveTo(halfL * 0.75, 0);
    ctx.lineTo(halfL * 0.20, -1.5);
    ctx.lineTo(-halfL * 0.50, -1.0);
    ctx.lineTo(-halfL * 0.50, 1.0);
    ctx.lineTo(halfL * 0.20, 1.5);
    ctx.closePath();
    ctx.fill();

    // Driver Number on nosecone
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 6px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.team.number, halfL * 0.65, 0);

    // --- 6. Cockpit & Driver Helmet & Halo ---
    // Cockpit opening
    ctx.fillStyle = "#0a0a0d";
    ctx.beginPath();
    ctx.ellipse(halfL * 0.05, 0, 8, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Driver Helmet
    ctx.fillStyle = this.team.helmetColor;
    ctx.beginPath();
    ctx.arc(halfL * 0.02, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    // Helmet visor
    ctx.fillStyle = "#111111";
    ctx.fillRect(halfL * 0.04, -1.8, 1.6, 3.6);

    // Halo Titanium Safety Structure
    ctx.strokeStyle = "#1b1b22";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    // Center pillar
    ctx.moveTo(halfL * 0.18, 0);
    ctx.lineTo(halfL * 0.05, 0);
    // Halo curved hoop around driver head
    ctx.arc(halfL * 0.05, 0, 4.8, -Math.PI * 0.6, Math.PI * 0.6, false);
    ctx.stroke();

    // Airbox intake above driver head
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.roundRect(-halfL * 0.15, -2, 5, 4, 1.5);
    ctx.fill();

    // --- 7. Engine Cover Shark Fin ---
    ctx.fillStyle = this.team.primaryColor;
    ctx.beginPath();
    ctx.moveTo(-halfL * 0.15, 0);
    ctx.lineTo(-halfL * 0.70, 0);
    ctx.strokeStyle = this.team.accentColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- 8. Rear Wing Assembly & Moving DRS Flap (Proportionate F1 wing span) ---
    const rearWingX = -halfL * 0.85;
    const rwSpan = 21; // Compact, fits cleanly between and over rear tires

    // Rear wing main plane
    ctx.fillStyle = "#111115";
    ctx.beginPath();
    ctx.roundRect(rearWingX, -rwSpan * 0.5, 5, rwSpan, 1.5);
    ctx.fill();

    // Endplates
    ctx.fillStyle = this.team.primaryColor;
    ctx.fillRect(rearWingX - 1, -rwSpan * 0.5, 6.5, 1.8);
    ctx.fillRect(rearWingX - 1, rwSpan * 0.5 - 1.8, 6.5, 1.8);

    // DRS Upper Wing Flap (Swings open backwards when active)
    ctx.save();
    ctx.fillStyle = this.team.accentColor;
    const flapOffset = this.drsFlapOpen * 3.5;
    ctx.fillRect(rearWingX + 1.5 + flapOffset, -rwSpan * 0.44, 2.0, rwSpan * 0.88);
    ctx.restore();

    // --- 9. Rear FIA Red Rain/Safety Light ---
    const lightX = -halfL * 0.92;
    const isBlinkingOn = this.ersDeploying || this.speedKmh < 40 || this.rearLightBlink > 0.5;
    ctx.fillStyle = isBlinkingOn ? "#ff0022" : "#550009";
    ctx.fillRect(lightX, -1.5, 2, 3);
    if (isBlinkingOn) {
      ctx.shadowColor = "#ff0022";
      ctx.shadowBlur = 6;
      ctx.fillRect(lightX, -1.5, 2, 3);
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // --- 10. Draw Global Particles (Sparks & Smoke) ---
    this.drawParticles(ctx);
  }

  drawTire(ctx, x, y, length, width, steerAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(steerAngle);

    // Rubber tread
    ctx.fillStyle = "#18181b";
    ctx.beginPath();
    ctx.roundRect(-length * 0.5, -width * 0.5, length, width, 2);
    ctx.fill();

    // Inner rim
    ctx.fillStyle = "#27272a";
    ctx.beginPath();
    ctx.roundRect(-length * 0.35, -width * 0.35, length * 0.7, width * 0.7, 1);
    ctx.fill();

    // Pirelli Tire compound colored ring (Red = Soft)
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 1;
    ctx.strokeRect(-length * 0.45, -width * 0.45, length * 0.9, width * 0.9);

    ctx.restore();
  }

  drawParticles(ctx) {
    // Draw Sparks
    for (const p of this.sparks) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = "#ffbb33";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Smoke
    for (const p of this.smoke) {
      ctx.save();
      ctx.fillStyle = `rgba(220, 225, 230, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
