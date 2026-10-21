/**
 * High-Performance Circuit de Spa-Francorchamps 2D Canvas Renderer
 * Features dynamic bird's-eye camera, asphalt texturing, rumble kerbs,
 * persistent skidmarks, tire smoke, sparks, Ardennes environment, and mini-map.
 */

export class TrackRenderer {
  constructor(canvas, track) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.track = track;

    // Camera state
    this.camX = 3400;
    this.camY = 3800;
    this.camAngle = 0;
    this.camZoom = 1.0;
    this.targetZoom = 1.0;

    // Camera Modes: "car_follow" (rotates with car) | "north_up" (fixed track orientation)
    this.cameraMode = "car_follow";

    // Lightweight skidmark segment buffer (no 14000x10000 offscreen canvas!)
    this.skidmarks = [];
    this.lastSkidPt = null;

    // Viewport dimensions
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  setCameraMode(mode) {
    if (mode === "car_follow" || mode === "north_up") {
      this.cameraMode = mode;
    }
  }

  toggleCameraMode() {
    this.cameraMode = this.cameraMode === "car_follow" ? "north_up" : "car_follow";
    return this.cameraMode;
  }

  setTrack(track) {
    this.track = track;
    this.skidmarks = [];
    this.lastSkidPt = null;
    if (track && track.sampledPoints && track.startPointIndex !== undefined) {
      const pStart = track.sampledPoints[track.startPointIndex] || track.sampledPoints[0];
      if (pStart) {
        this.camX = pStart.x;
        this.camY = pStart.y;
      }
    }
  }

  drawTrack(tCtx) {
    const b = this.track.bounds || { minX: 1000, maxX: 12500, minY: 1500, maxY: 9000 };

    // 1. Forest Green Background (Ardennes / Turkish countryside)
    tCtx.fillStyle = "#162817";
    tCtx.fillRect(b.minX - 3000, b.minY - 3000, (b.maxX - b.minX) + 6000, (b.maxY - b.minY) + 6000);

    // Subtle grass patch variations
    tCtx.fillStyle = "#1e351f";
    for (let i = 0; i < 200; i++) {
      const gx = (i * 997) % 13800;
      const gy = (i * 1237) % 9800;
      tCtx.beginPath();
      tCtx.arc(gx, gy, 150 + (i % 80), 0, Math.PI * 2);
      tCtx.fill();
    }

    const pts = this.track.sampledPoints;
    const n = pts.length;

    // 2. Gravel Traps & Run-off Outlines
    tCtx.fillStyle = "#a88e5e"; // Gravel trap sand color
    for (let i = 0; i < n; i += 2) {
      const pt = pts[i];
      let isGravelZone = false;
      if (this.track.gravelRanges && this.track.gravelRanges.length > 0) {
        isGravelZone = this.track.gravelRanges.some(([gMin, gMax]) => pt.tGlobal >= gMin && pt.tGlobal <= gMax);
      } else {
        isGravelZone = (pt.tGlobal > 0.02 && pt.tGlobal < 0.07) ||
                       (pt.tGlobal > 0.31 && pt.tGlobal < 0.36) ||
                       (pt.tGlobal > 0.93 && pt.tGlobal < 0.97);
      }
      if (isGravelZone) {
        tCtx.beginPath();
        tCtx.arc(pt.x + pt.normalX * (pt.width * 0.5 + 45), pt.y + pt.normalY * (pt.width * 0.5 + 45), 35, 0, Math.PI * 2);
        tCtx.fill();
      }
    }

    // 3. Tarmac Run-off Areas
    tCtx.fillStyle = "#33373e";
    tCtx.beginPath();
    for (let i = 0; i < n; i++) {
      const pt = pts[i];
      const rX = pt.x + pt.normalX * (pt.width * 0.5 + 55);
      const rY = pt.y + pt.normalY * (pt.width * 0.5 + 55);
      if (i === 0) tCtx.moveTo(rX, rY);
      else tCtx.lineTo(rX, rY);
    }
    tCtx.closePath();
    tCtx.fill();

    tCtx.beginPath();
    for (let i = 0; i < n; i++) {
      const pt = pts[i];
      const rX = pt.x - pt.normalX * (pt.width * 0.5 + 55);
      const rY = pt.y - pt.normalY * (pt.width * 0.5 + 55);
      if (i === 0) tCtx.moveTo(rX, rY);
      else tCtx.lineTo(rX, rY);
    }
    tCtx.closePath();
    tCtx.fill();

    // 4. Main Asphalt Racing Ribbon
    tCtx.fillStyle = "#202227";
    tCtx.beginPath();
    for (let i = 0; i < n; i++) {
      const pt = pts[i];
      if (i === 0) tCtx.moveTo(pt.leftX, pt.leftY);
      else tCtx.lineTo(pt.leftX, pt.leftY);
    }
    for (let i = n - 1; i >= 0; i--) {
      const pt = pts[i];
      tCtx.lineTo(pt.rightX, pt.rightY);
    }
    tCtx.closePath();
    tCtx.fill();

    // 5. Racing Line Groove (Dark rubbered surface from F1 slicks)
    tCtx.strokeStyle = "rgba(16, 17, 20, 0.45)";
    tCtx.lineWidth = 42;
    tCtx.lineCap = "round";
    tCtx.lineJoin = "round";
    tCtx.beginPath();
    for (let i = 0; i < n; i++) {
      const pt = pts[i];
      // Racing line apex bias
      let apexBias = 0;
      if (pt.kerbL) apexBias = pt.width * 0.28;
      else if (pt.kerbR) apexBias = -pt.width * 0.28;

      const rx = pt.x + pt.normalX * apexBias;
      const ry = pt.y + pt.normalY * apexBias;
      if (i === 0) tCtx.moveTo(rx, ry);
      else tCtx.lineTo(rx, ry);
    }
    tCtx.closePath();
    tCtx.stroke();

    // 6. Red & White Rumble Kerbs (Striped along track boundary)
    for (let i = 0; i < n; i++) {
      const pt = pts[i];
      const isRed = Math.floor(i / 3) % 2 === 0;

      // Left Kerb
      if (pt.kerbL) {
        tCtx.fillStyle = isRed ? "#dc2626" : "#f4f4f5";
        tCtx.beginPath();
        tCtx.moveTo(pt.leftX, pt.leftY);
        tCtx.lineTo(pt.kerbLeftX, pt.kerbLeftY);
        const next = pts[(i + 1) % n];
        tCtx.lineTo(next.kerbLeftX, next.kerbLeftY);
        tCtx.lineTo(next.leftX, next.leftY);
        tCtx.closePath();
        tCtx.fill();
      }

      // Right Kerb
      if (pt.kerbR) {
        tCtx.fillStyle = isRed ? "#dc2626" : "#f4f4f5";
        tCtx.beginPath();
        tCtx.moveTo(pt.rightX, pt.rightY);
        tCtx.lineTo(pt.kerbRightX, pt.kerbRightY);
        const next = pts[(i + 1) % n];
        tCtx.lineTo(next.kerbRightX, next.kerbRightY);
        tCtx.lineTo(next.rightX, next.rightY);
        tCtx.closePath();
        tCtx.fill();
      }
    }

    // 7. Track Limit White Boundary Lines
    tCtx.strokeStyle = "#ffffff";
    tCtx.lineWidth = 2.5;

    // Left line
    tCtx.beginPath();
    for (let i = 0; i < n; i++) {
      const pt = pts[i];
      if (i === 0) tCtx.moveTo(pt.leftX, pt.leftY);
      else tCtx.lineTo(pt.leftX, pt.leftY);
    }
    tCtx.closePath();
    tCtx.stroke();

    // Right line
    tCtx.beginPath();
    for (let i = 0; i < n; i++) {
      const pt = pts[i];
      if (i === 0) tCtx.moveTo(pt.rightX, pt.rightY);
      else tCtx.lineTo(pt.rightX, pt.rightY);
    }
    tCtx.closePath();
    tCtx.stroke();

    // 8. Start/Finish Line & Starting Grid
    this.drawStartFinishGrid(tCtx);

    // 9. DRS Lines & Sector Timing Gates
    this.drawTrackSignage(tCtx);

    // 10. Grandstands & Spectator Facilities
    this.drawGrandstands(tCtx);

    // 11. Ardennes Pine Trees & Track Foliage
    for (const tree of (this.track.pineTrees || [])) {
      tCtx.fillStyle = tree.shade || tree.color || "#174420";
      tCtx.beginPath();
      tCtx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
      tCtx.fill();

      // Inner highlight for pine canopy depth
      tCtx.fillStyle = tree.highlight || "#246832";
      tCtx.beginPath();
      tCtx.arc(tree.x - tree.radius * 0.2, tree.y - tree.radius * 0.2, tree.radius * 0.55, 0, Math.PI * 2);
      tCtx.fill();
    }
  }

  drawStartFinishGrid(tCtx) {
    const pt0 = this.track.sampledPoints[0];

    // Chequered Finish Line
    const steps = 14;
    const segW = pt0.width / steps;
    for (let s = 0; s < steps; s++) {
      const isBlack = s % 2 === 0;
      tCtx.fillStyle = isBlack ? "#111111" : "#ffffff";
      const startX = pt0.rightX + pt0.normalX * (s * segW);
      const startY = pt0.rightY + pt0.normalY * (s * segW);

      tCtx.save();
      tCtx.translate(startX, startY);
      tCtx.rotate(Math.atan2(pt0.tangentY, pt0.tangentX));
      tCtx.fillRect(-5, -segW * 0.5, 10, segW);
      tCtx.restore();
    }

    // Starting Launch Box (2 turns behind Start/Finish line)
    const startIndex = this.track.startPointIndex || 0;
    const pStart = this.track.sampledPoints[startIndex];
    if (pStart) {
      tCtx.save();
      tCtx.translate(pStart.x, pStart.y);
      tCtx.rotate(Math.atan2(pStart.tangentY, pStart.tangentX));

      // White launch line across the track
      tCtx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      tCtx.lineWidth = 4.0;
      tCtx.beginPath();
      tCtx.moveTo(0, -pStart.width * 0.48);
      tCtx.lineTo(0, pStart.width * 0.48);
      tCtx.stroke();

      // Starting grid box outline
      tCtx.strokeStyle = "#e10600";
      tCtx.lineWidth = 3.0;
      tCtx.strokeRect(-22, -18, 44, 36);

      // Label "START GRID"
      tCtx.fillStyle = "#ffffff";
      tCtx.font = "bold 10px Inter, sans-serif";
      tCtx.textAlign = "center";
      tCtx.textBaseline = "middle";
      tCtx.fillText("START", 0, -28);
      tCtx.restore();
    }
  }

  drawTrackSignage(tCtx) {
    // DRS Activation & Deactivation Lines
    const drsZones = this.track.drsZones || [];
    drsZones.forEach(zone => {
      // DRS Activation Line
      const pt = this.track.getPointAtT ? this.track.getPointAtT(zone.activationStartT) : null;
      if (pt) {
        tCtx.strokeStyle = "#10b981"; // Emerald green
        tCtx.lineWidth = 4.5;
        tCtx.beginPath();
        tCtx.moveTo(pt.leftX, pt.leftY);
        tCtx.lineTo(pt.rightX, pt.rightY);
        tCtx.stroke();

        // "DRS" Text on Track
        tCtx.save();
        tCtx.translate(pt.x, pt.y);
        tCtx.rotate(Math.atan2(pt.tangentY, pt.tangentX));
        tCtx.fillStyle = "#10b981";
        tCtx.font = "900 18px Inter, sans-serif";
        tCtx.textAlign = "center";
        tCtx.fillText("DRS", 0, -8);
        tCtx.restore();
      }

      // DRS Deactivation / End Line
      const endPt = this.track.getPointAtT ? this.track.getPointAtT(zone.activationEndT) : null;
      if (endPt) {
        tCtx.save();
        tCtx.strokeStyle = "#34d399";
        tCtx.lineWidth = 3.5;
        tCtx.setLineDash([12, 8]);
        tCtx.beginPath();
        tCtx.moveTo(endPt.leftX, endPt.leftY);
        tCtx.lineTo(endPt.rightX, endPt.rightY);
        tCtx.stroke();
        tCtx.setLineDash([]);

        // "DRS END" Text on Track
        tCtx.translate(endPt.x, endPt.y);
        tCtx.rotate(Math.atan2(endPt.tangentY, endPt.tangentX));
        tCtx.fillStyle = "#34d399";
        tCtx.font = "bold 13px Inter, sans-serif";
        tCtx.textAlign = "center";
        tCtx.fillText("DRS END", 0, -6);
        tCtx.restore();
      }
    });

    // Sector 1 Split Line
    const sectors = this.track.sectors || { s1End: 0.44, s2End: 0.78 };
    const s1Pt = this.track.getPointAtT ? this.track.getPointAtT(sectors.s1End) : null;
    if (s1Pt) {
      tCtx.strokeStyle = "#ec4899"; // Magenta sector line
      tCtx.lineWidth = 4;
      tCtx.beginPath();
      tCtx.moveTo(s1Pt.leftX, s1Pt.leftY);
      tCtx.lineTo(s1Pt.rightX, s1Pt.rightY);
      tCtx.stroke();

      // Sector 2 Entry Marker
      tCtx.save();
      tCtx.translate(s1Pt.x, s1Pt.y);
      tCtx.rotate(Math.atan2(s1Pt.tangentY, s1Pt.tangentX));
      tCtx.fillStyle = "#ec4899";
      tCtx.font = "bold 14px Inter, sans-serif";
      tCtx.textAlign = "center";
      tCtx.fillText("SECTOR 2", 0, -6);
      tCtx.restore();
    }

    // Sector 2 Split Line
    const s2Pt = this.track.getPointAtT ? this.track.getPointAtT(sectors.s2End) : null;
    if (s2Pt) {
      tCtx.strokeStyle = "#ec4899";
      tCtx.lineWidth = 4;
      tCtx.beginPath();
      tCtx.moveTo(s2Pt.leftX, s2Pt.leftY);
      tCtx.lineTo(s2Pt.rightX, s2Pt.rightY);
      tCtx.stroke();

      // Sector 3 Entry Marker
      tCtx.save();
      tCtx.translate(s2Pt.x, s2Pt.y);
      tCtx.rotate(Math.atan2(s2Pt.tangentY, s2Pt.tangentX));
      tCtx.fillStyle = "#ec4899";
      tCtx.font = "bold 14px Inter, sans-serif";
      tCtx.textAlign = "center";
      tCtx.fillText("SECTOR 3", 0, -6);
      tCtx.restore();
    }

    // Distance Brake Marker Boards (150m, 100m, 50m)
    for (const marker of (this.track.brakeMarkers || [])) {
      tCtx.save();
      tCtx.translate(marker.x, marker.y);
      tCtx.fillStyle = "#ffffff";
      tCtx.strokeStyle = "#111111";
      tCtx.lineWidth = 2;
      tCtx.fillRect(-15, -10, 30, 20);
      tCtx.strokeRect(-15, -10, 30, 20);
      tCtx.fillStyle = "#000000";
      tCtx.font = "bold 12px Inter, sans-serif";
      tCtx.textAlign = "center";
      tCtx.textBaseline = "middle";
      tCtx.fillText(marker.text, 0, 1);
      tCtx.restore();
    }
  }

  drawGrandstands(tCtx) {
    for (const gs of this.track.grandstands) {
      tCtx.save();
      tCtx.translate(gs.x, gs.y);
      tCtx.rotate(gs.angle);

      if (gs.name.includes("Pit Lane")) {
        // Pit Building Complex & Team Garages
        tCtx.fillStyle = "#1e2025";
        tCtx.fillRect(-gs.length * 0.5, -gs.width * 0.5, gs.length, gs.width);

        // Pit Garage Doors / Team Bays
        const bays = 10;
        const bayW = (gs.length - 20) / bays;
        for (let b = 0; b < bays; b++) {
          tCtx.fillStyle = "#111215";
          tCtx.fillRect(-gs.length * 0.5 + 10 + b * bayW, -gs.width * 0.35, bayW - 6, gs.width * 0.7);

          // Team garage banner stripe
          const bannerColors = ["#0b1528", "#c30000", "#00d2be", "#ff8000", "#00594f"];
          tCtx.fillStyle = bannerColors[b % bannerColors.length];
          tCtx.fillRect(-gs.length * 0.5 + 10 + b * bayW, -gs.width * 0.45, bayW - 6, 5);
        }

        // Pit Lane Wall
        tCtx.fillStyle = "#3f3f46";
        tCtx.fillRect(-gs.length * 0.5, gs.width * 0.42, gs.length, 5);
      } else {
        // Spectator Grandstand Structure
        tCtx.fillStyle = "#27272a";
        tCtx.fillRect(-gs.length * 0.5, -gs.width * 0.5, gs.length, gs.width);

        // Canopy Roof & Seating
        tCtx.fillStyle = "#dc2626";
        tCtx.fillRect(-gs.length * 0.5 + 3, -gs.width * 0.5 + 3, gs.length - 6, gs.width - 6);

        // Spectator crowd dots pattern
        const rows = 3;
        const cols = Math.floor(gs.length / 15);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const colors = ["#f87171", "#ffffff", "#facc15", "#60a5fa", "#34d399"];
            tCtx.fillStyle = colors[(r * 5 + c) % colors.length];
            tCtx.beginPath();
            tCtx.arc(-gs.length * 0.46 + c * 15, -gs.width * 0.32 + r * 12, 2.4, 0, Math.PI * 2);
            tCtx.fill();
          }
        }

        // White canopy support pillars
        tCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
        for (let c = 0; c < cols; c += 4) {
          tCtx.fillRect(-gs.length * 0.46 + c * 15, -gs.width * 0.48, 3, gs.width * 0.96);
        }
      }

      tCtx.restore();
    }
  }

  addSkidmark(car) {
    if (car.tireSlip < 0.28 && Math.abs(car.wheelSpin) < 0.35) {
      this.lastSkidPt = null;
      return;
    }

    const rearX = car.x - Math.cos(car.heading) * (car.length * 0.35);
    const rearY = car.y - Math.sin(car.heading) * (car.length * 0.35);
    const normX = -Math.sin(car.heading) * (car.width * 0.42);
    const normY = Math.cos(car.heading) * (car.width * 0.42);
    const alpha = Math.min(0.45, (car.tireSlip - 0.2) * 0.8 + 0.1);

    if (this.lastSkidPt) {
      this.skidmarks.push({
        lx1: this.lastSkidPt.lx,
        ly1: this.lastSkidPt.ly,
        lx2: rearX + normX,
        ly2: rearY + normY,
        rx1: this.lastSkidPt.rx,
        ry1: this.lastSkidPt.ry,
        rx2: rearX - normX,
        ry2: rearY - normY,
        alpha
      });
      if (this.skidmarks.length > 500) {
        this.skidmarks.shift();
      }
    }

    this.lastSkidPt = {
      lx: rearX + normX,
      ly: rearY + normY,
      rx: rearX - normX,
      ry: rearY - normY
    };
  }

  drawSkidmarks(ctx) {
    if (!this.skidmarks || this.skidmarks.length === 0) return;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (let i = 0; i < this.skidmarks.length; i++) {
      const s = this.skidmarks[i];
      ctx.strokeStyle = `rgba(10, 10, 10, ${s.alpha})`;
      ctx.beginPath();
      ctx.moveTo(s.lx1, s.ly1);
      ctx.lineTo(s.lx2, s.ly2);
      ctx.moveTo(s.rx1, s.ry1);
      ctx.lineTo(s.rx2, s.ry2);
      ctx.stroke();
    }
  }

  /**
   * Main rendering pass
   */
  render(playerCar, remotePlayers = []) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Camera interpolation & framing
    // Dynamic look-ahead: camera shifts slightly ahead of car in direction of motion
    const speedRatio = Math.min(1.0, playerCar.speedKmh / 350);
    const lookAheadDist = 60 + speedRatio * 140;
    const targetCamX = playerCar.x + Math.cos(playerCar.heading) * lookAheadDist;
    const targetCamY = playerCar.y + Math.sin(playerCar.heading) * lookAheadDist;

    // Dynamic zoom: zooms in for slow corners (tight precision) and zooms out at 330 km/h (speed overview)
    this.targetZoom = 1.05 - speedRatio * 0.35;
    this.camZoom += (this.targetZoom - this.camZoom) * 0.08;

    this.camX += (targetCamX - this.camX) * 0.12;
    this.camY += (targetCamY - this.camY) * 0.12;

    if (this.cameraMode === "car_follow") {
      // Car-Oriented: Camera rotates so car always points upwards (-Math.PI/2)
      const targetAngle = -playerCar.heading - Math.PI * 0.5;
      let angleDiff = targetAngle - this.camAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.camAngle += angleDiff * 0.12;
    } else {
      // North-Up: Classic fixed top-down orientation
      this.camAngle += (0 - this.camAngle) * 0.15;
    }

    // 2. Clear canvas
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, w, h);

    // 3. Begin Camera Transform Matrix
    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.scale(this.camZoom, this.camZoom);
    ctx.rotate(this.camAngle);
    ctx.translate(-this.camX, -this.camY);

    // 4. Render Track directly to viewport
    this.drawTrack(ctx);

    // 5. Render Skidmarks
    this.drawSkidmarks(ctx);

    // 6. Record and Render Skidmarks for current frame
    this.addSkidmark(playerCar);

    // 7. Render Remote Ghost Cars with Nametags (no physical collision)
    for (let i = 0; i < remotePlayers.length; i++) {
      const rp = remotePlayers[i];
      if (rp && rp.car) {
        rp.car.draw(ctx);
        this.drawRemoteCarNametag(ctx, rp);
      }
    }

    // 8. Render Player Car
    playerCar.draw(ctx);

    // Restore Camera Transform
    ctx.restore();

    // 9. Render Telemetry Mini-Map Overlay in HUD
    this.renderMiniMap(playerCar, remotePlayers);
  }

  /**
   * Draw floating nametag above remote car that stays upright regardless of camera rotation
   */
  drawRemoteCarNametag(ctx, rp) {
    if (!rp || !rp.car) return;
    ctx.save();
    ctx.translate(rp.car.x, rp.car.y - 38);
    // Counter-rotate to remain readable
    ctx.rotate(-this.camAngle);

    const name = rp.name || "Driver";
    const teamColor = rp.car.team ? rp.car.team.primaryColor : "#e10600";
    const accentColor = rp.car.team ? rp.car.team.accentColor : "#ffffff";

    ctx.font = "bold 11px Outfit, sans-serif";
    const textWidth = ctx.measureText(name).width;
    const pillWidth = Math.max(54, textWidth + 24);
    const pillHeight = 20;

    // Glass pill background
    ctx.fillStyle = "rgba(10, 14, 22, 0.88)";
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Team indicator dot
    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.arc(-pillWidth / 2 + 9, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Driver name text
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 5, 0.5);

    ctx.restore();
  }

  /**
   * Render real-time mini-map in bottom-right corner
   */
  renderMiniMap(playerCar, remotePlayers = []) {
    const ctx = this.ctx;
    const mapW = 210;
    const mapH = 150;
    const mapX = this.width - mapW - 20;
    const mapY = this.height - mapH - 20;

    // Mini-map background card (Glassmorphic)
    ctx.save();
    ctx.fillStyle = "rgba(15, 17, 23, 0.85)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapW, mapH, 8);
    ctx.fill();
    ctx.stroke();

    // Header label
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText((this.track.shortName || this.track.name || "TRACK").toUpperCase(), mapX + 12, mapY + 16);

    // Map bounds mapping: dynamic bounds per track
    const bounds = this.track.bounds || { minX: 1400, maxX: 10800, minY: 2000, maxY: 8400 };
    const minX = bounds.minX, maxX = bounds.maxX;
    const minY = bounds.minY, maxY = bounds.maxY;
    const scaleX = (mapW - 32) / (maxX - minX);
    const scaleY = (mapH - 36) / (maxY - minY);

    const worldToMap = (wx, wy) => ({
      x: mapX + 16 + (wx - minX) * scaleX,
      y: mapY + 24 + (wy - minY) * scaleY
    });

    // Draw Track Outline Ribbon
    const pts = this.track.sampledPoints;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 6) {
      const pt = pts[i];
      const mPos = worldToMap(pt.x, pt.y);
      if (i === 0) ctx.moveTo(mPos.x, mPos.y);
      else ctx.lineTo(mPos.x, mPos.y);
    }
    ctx.closePath();
    ctx.stroke();

    // Start/Finish Line tick
    const startPos = worldToMap(pts[0].x, pts[0].y);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(startPos.x - 2, startPos.y - 2, 4, 4);

    // Draw Remote Cars dots on mini-map
    for (let i = 0; i < remotePlayers.length; i++) {
      const rp = remotePlayers[i];
      if (rp && rp.car) {
        const rPos = worldToMap(rp.car.x, rp.car.y);
        ctx.fillStyle = rp.car.team ? rp.car.team.accentColor : "#cbd5e1";
        ctx.beginPath();
        ctx.arc(rPos.x, rPos.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Player Car dot with pulse aura
    const pPos = worldToMap(playerCar.x, playerCar.y);
    ctx.fillStyle = playerCar.team.accentColor;
    ctx.shadowColor = playerCar.team.accentColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(pPos.x, pPos.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}
