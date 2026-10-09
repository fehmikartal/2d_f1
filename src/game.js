/**
 * Main Formula 1 Game Controller
 * Manages game loop, physics ticks, lap timing, race starts, UI telemetry,
 * keyboard controls (Arrow Keys + WASD), and camera state.
 */

import { SpaTrack, IstanbulParkTrack, TRACK_CLASSES } from "./track.js";
import { F1Physics } from "./physics.js";
import { F1Car, F1_TEAMS } from "./car.js";
import { AudioManager } from "./audio.js";
import { TrackRenderer } from "./renderer.js";

export class F1Game {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.tracks = {
      spa: new SpaTrack(),
      istanbul: new IstanbulParkTrack()
    };

    // Load persisted track or default to spa
    const savedTrack = localStorage.getItem("f1_selected_track");
    this.currentTrackId = (savedTrack && this.tracks[savedTrack]) ? savedTrack : "spa";
    this.track = this.tracks[this.currentTrackId];
    this.physics = new F1Physics();
    this.audio = new AudioManager();
    this.renderer = new TrackRenderer(this.canvas, this.track);

    // Persisted camera mode
    const savedCam = localStorage.getItem("f1_camera_mode");
    if (savedCam === "car_follow" || savedCam === "north_up") {
      this.renderer.setCameraMode(savedCam);
    }

    // Persisted audio volume & mute state
    const savedVol = localStorage.getItem("f1_volume");
    if (savedVol !== null) {
      const v = parseFloat(savedVol);
      if (!isNaN(v)) this.audio.volume = Math.max(0, Math.min(1.0, v));
    }
    const savedMuted = localStorage.getItem("f1_muted");
    if (savedMuted !== null) {
      this.audio.isMuted = (savedMuted === "true");
    }

    // Persisted Team & Player Car
    const savedTeam = localStorage.getItem("f1_selected_team");
    this.selectedTeam = (savedTeam && F1_TEAMS[savedTeam]) ? savedTeam : "redbull";
    this.playerCar = new F1Car(this.selectedTeam);

    // Game Mode
    this.gameMode = "time_trial";
    this.raceState = "idle";

    // Starting Position
    this.startPointIndex = this.track.startPointIndex || 0;

    // Timing, Sectors & Lap History
    this.hasCrossedStartLine = false;
    this.lapStartTime = null;
    this.currentLap = 0;
    
    // Load all-time best lap time for current track as initial benchmark
    const initialTopLaps = this.getTop10Laps(this.currentTrackId);
    this.bestLapTime = initialTopLaps.length > 0 ? initialTopLaps[0].time : null;
    this.playerCar.bestLapTime = this.bestLapTime;

    this.currentSector = 1;
    this.sectorTimes = [null, null, null];
    this.bestSectors = [null, null, null];
    const pStart = this.track.sampledPoints[this.startPointIndex];
    this.lastProgress = pStart ? pStart.tGlobal : 0.90;
    this.lapValid = true;
    this.lapTopSpeed = 0;
    this.lapHistory = [];
    this.lastLapData = null;
    this.isModalOpen = false;
    this.modalTab = "top10"; // Default to Top 10 All-Time table

    // User Input State (Arrow Keys + WASD)
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      ers: false,
      drs: false
    };

    // UI Cache Elements
    this.ui = {
      speedNum: document.getElementById("telemetry-speed"),
      gearNum: document.getElementById("telemetry-gear"),
      rpmBar: document.getElementById("rpm-bar-fill"),
      rpmLeds: document.querySelectorAll(".led-light"),
      currentLapTime: document.getElementById("current-lap-time"),
      lastLapTime: document.getElementById("last-lap-time"),
      bestLapTime: document.getElementById("best-lap-time"),
      lapCounterBadge: document.getElementById("lap-counter-badge"),
      timingCard: document.getElementById("timing-card"),
      deltaBadge: document.getElementById("lap-delta"),
      s1Badge: document.getElementById("sector-1-time"),
      s2Badge: document.getElementById("sector-2-time"),
      s3Badge: document.getElementById("sector-3-time"),
      drsBadge: document.getElementById("drs-indicator"),
      ersBar: document.getElementById("ers-bar-fill"),
      ersPct: document.getElementById("ers-percentage"),
      camModeBtn: document.getElementById("cam-mode-btn"),
      laptimesBtn: document.getElementById("laptimes-btn"),
      laptimesModal: document.getElementById("laptimes-modal"),
      closeModalBtn: document.getElementById("close-modal-btn"),
      clearLapsBtn: document.getElementById("clear-laps-btn"),
      modalThead: document.getElementById("laptimes-thead"),
      laptimesTbody: document.getElementById("laptimes-tbody"),
      laptimesEmptyState: document.getElementById("laptimes-empty-state"),
      modalTitle: document.getElementById("modal-title"),
      tabTop10Btn: document.getElementById("tab-top10-btn"),
      tabSessionBtn: document.getElementById("tab-session-btn"),
      modalStatLabel1: document.getElementById("modal-stat-label-1"),
      modalStatLabel2: document.getElementById("modal-stat-label-2"),
      modalStatLabel3: document.getElementById("modal-stat-label-3"),
      modalStatLabel4: document.getElementById("modal-stat-label-4"),
      modalStatBest: document.getElementById("modal-stat-best"),
      modalStatTotal: document.getElementById("modal-stat-total"),
      modalStatOptimal: document.getElementById("modal-stat-optimal"),
      modalStatSpeed: document.getElementById("modal-stat-speed"),
      modalEmptyTitle: document.getElementById("modal-empty-title"),
      modalEmptySub: document.getElementById("modal-empty-sub"),
      modalSessionSubtitle: document.getElementById("modal-session-subtitle"),
      volumeSlider: document.getElementById("volume-slider"),
      soundToggleBtn: document.getElementById("sound-toggle-btn"),
      volumePct: document.getElementById("volume-pct"),
      trackSelect: document.getElementById("track-select"),
      teamSelect: document.getElementById("team-select"),
      trackSubtitle: document.getElementById("track-subtitle"),
      trackFlagBadge: document.getElementById("track-flag-badge"),
      trackLimitsAlert: document.getElementById("track-limits-warning")
    };

    this.lastTimestamp = performance.now();
    this.activeCornerDismissTimer = 0;

    this.initEvents();
    this.initHUD();
    this.resizeCanvas();
    this.resetCar();

    // Start Game Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  getTop10Laps(trackId = this.currentTrackId) {
    try {
      const raw = localStorage.getItem(`f1_top10_laps_${trackId}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => a.time - b.time).slice(0, 10);
      }
      return [];
    } catch (e) {
      console.warn("Failed to load top 10 laps:", e);
      return [];
    }
  }

  saveTop10Laps(trackId, laps) {
    try {
      localStorage.setItem(`f1_top10_laps_${trackId}`, JSON.stringify(laps.slice(0, 10)));
    } catch (e) {
      console.warn("Failed to save top 10 laps:", e);
    }
  }

  addTop10Lap(record) {
    if (!record || !record.isValid || !record.time) return;
    const topLaps = this.getTop10Laps(this.currentTrackId);

    topLaps.push({
      time: record.time,
      lapTime: record.time,
      formatted: record.formatted,
      s1Time: record.s1Time,
      s2Time: record.s2Time,
      s3Time: record.s3Time,
      s1: record.s1,
      s2: record.s2,
      s3: record.s3,
      topSpeed: record.topSpeed,
      team: record.team,
      teamName: record.teamName,
      driver: record.driver,
      teamColor: record.teamColor,
      trackId: this.currentTrackId,
      date: record.date || new Date().toLocaleDateString()
    });

    // Sort ascending by lap time
    topLaps.sort((a, b) => a.time - b.time);
    const trimmed = topLaps.slice(0, 10);
    this.saveTop10Laps(this.currentTrackId, trimmed);

    // Update session benchmark if improved
    if (trimmed.length > 0) {
      this.bestLapTime = trimmed[0].time;
      this.playerCar.bestLapTime = this.bestLapTime;
      if (this.ui.bestLapTime) {
        this.ui.bestLapTime.innerText = this.formatLapTime(this.bestLapTime);
      }
    }
  }

  resizeCanvas() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);
  }

  initEvents() {
    window.addEventListener("resize", () => this.resizeCanvas());

    // Keyboard controls: Arrow Keys + WASD
    window.addEventListener("keydown", (e) => {
      this.audio.ensureContext();

      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          this.keys.up = true;
          e.preventDefault();
          break;
        case "ArrowDown":
        case "KeyS":
          this.keys.down = true;
          e.preventDefault();
          break;
        case "ArrowLeft":
        case "KeyA":
          this.keys.left = true;
          e.preventDefault();
          break;
        case "ArrowRight":
        case "KeyD":
          this.keys.right = true;
          e.preventDefault();
          break;
        case "Space":
        case "KeyE":
          this.keys.ers = true;
          e.preventDefault();
          break;
        case "KeyF":
        case "ShiftLeft":
        case "ShiftRight":
          // DRS toggle via key F or Shift
          this.toggleDRS();
          e.preventDefault();
          break;
        case "KeyC":
          this.toggleCamera();
          break;
        case "KeyR":
          this.resetCar();
          break;
        case "KeyM":
          this.toggleSound();
          break;
        case "KeyT":
          this.toggleLapTimesModal();
          break;
        case "Escape":
          this.closeLapTimesModal();
          break;
      }
    });

    window.addEventListener("keyup", (e) => {
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          this.keys.up = false;
          break;
        case "ArrowDown":
        case "KeyS":
          this.keys.down = false;
          break;
        case "ArrowLeft":
        case "KeyA":
          this.keys.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          this.keys.right = false;
          break;
        case "Space":
        case "KeyE":
          this.keys.ers = false;
          break;
      }
    });

    // Touch & mouse click controls for on-screen buttons
    const bindTouch = (id, keyName) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (e) => {
        this.audio.ensureContext();
        this.keys[keyName] = true;
        if (e.cancelable) e.preventDefault();
      };
      const end = (e) => {
        this.keys[keyName] = false;
        if (e.cancelable) e.preventDefault();
      };
      el.addEventListener("mousedown", start);
      el.addEventListener("mouseup", end);
      el.addEventListener("mouseleave", end);
      el.addEventListener("touchstart", start, { passive: false });
      el.addEventListener("touchend", end, { passive: false });
    };

    bindTouch("touch-throttle", "up");
    bindTouch("touch-brake", "down");
    bindTouch("touch-left", "left");
    bindTouch("touch-right", "right");
    bindTouch("touch-ers", "ers");

    // UI Buttons
    if (this.ui.camModeBtn) {
      this.ui.camModeBtn.addEventListener("click", () => this.toggleCamera());
    }
    if (this.ui.volumeSlider) {
      this.ui.volumeSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        this.setVolume(val / 100);
      });
    }
    if (this.ui.soundToggleBtn) {
      this.ui.soundToggleBtn.addEventListener("click", () => this.toggleSound());
    }
    if (this.ui.drsBadge) {
      this.ui.drsBadge.addEventListener("click", () => this.toggleDRS());
    }

    if (this.ui.laptimesBtn) {
      this.ui.laptimesBtn.addEventListener("click", () => this.toggleLapTimesModal());
    }
    if (this.ui.timingCard) {
      this.ui.timingCard.addEventListener("click", () => this.toggleLapTimesModal());
    }
    if (this.ui.closeModalBtn) {
      this.ui.closeModalBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeLapTimesModal();
      });
    }
    if (this.ui.clearLapsBtn) {
      this.ui.clearLapsBtn.addEventListener("click", () => this.handleClearLaps());
    }
    if (this.ui.tabTop10Btn) {
      this.ui.tabTop10Btn.addEventListener("click", () => {
        this.modalTab = "top10";
        this.ui.tabTop10Btn.classList.add("active");
        if (this.ui.tabSessionBtn) this.ui.tabSessionBtn.classList.remove("active");
        this.updateLapTimesModal();
      });
    }
    if (this.ui.tabSessionBtn) {
      this.ui.tabSessionBtn.addEventListener("click", () => {
        this.modalTab = "session";
        this.ui.tabSessionBtn.classList.add("active");
        if (this.ui.tabTop10Btn) this.ui.tabTop10Btn.classList.remove("active");
        this.updateLapTimesModal();
      });
    }
    if (this.ui.laptimesModal) {
      this.ui.laptimesModal.addEventListener("click", (e) => {
        if (e.target === this.ui.laptimesModal) {
          this.closeLapTimesModal();
        }
      });
    }

    const resetBtn = document.getElementById("reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.resetCar());
    }

    const teamSelect = document.getElementById("team-select");
    if (teamSelect) {
      teamSelect.addEventListener("change", (e) => {
        this.setTeam(e.target.value);
      });
    }

    if (this.ui.trackSelect) {
      this.ui.trackSelect.addEventListener("change", (e) => {
        this.switchTrack(e.target.value);
      });
    }
  }

  switchTrack(trackId) {
    if (!this.tracks[trackId]) return;
    this.currentTrackId = trackId;
    localStorage.setItem("f1_selected_track", trackId);
    this.track = this.tracks[trackId];
    this.startPointIndex = this.track.startPointIndex || 0;
    this.renderer.setTrack(this.track);

    if (this.ui.trackSelect && this.ui.trackSelect.value !== trackId) {
      this.ui.trackSelect.value = trackId;
    }
    if (this.ui.trackSubtitle) {
      this.ui.trackSubtitle.innerText = `${(this.track.lengthMeters / 1000).toFixed(3)} KM • ${this.track.turnsCount} TURNS`;
    }
    if (this.ui.trackFlagBadge) {
      this.ui.trackFlagBadge.innerText = `${this.track.flag} ${this.track.flagCode}`;
    }
    document.title = `F1 2D Racing - ${this.track.name}`;

    // Reset current session lap history
    this.lapHistory = [];
    this.lastLapData = null;
    this.playerCar.lastLapTime = null;

    // Load all-time best for newly selected track
    const topLaps = this.getTop10Laps(this.currentTrackId);
    this.bestLapTime = topLaps.length > 0 ? topLaps[0].time : null;
    this.playerCar.bestLapTime = this.bestLapTime;

    if (this.ui.lastLapTime) this.ui.lastLapTime.innerText = "--:--.---";
    if (this.ui.bestLapTime) {
      this.ui.bestLapTime.innerText = this.bestLapTime ? this.formatLapTime(this.bestLapTime) : "--:--.---";
    }

    this.resetCar();
    this.updateLapTimesModal();
  }

  initHUD() {
    if (this.ui.trackSelect) {
      this.ui.trackSelect.value = this.currentTrackId;
    }
    if (this.ui.trackSubtitle) {
      this.ui.trackSubtitle.innerText = `${(this.track.lengthMeters / 1000).toFixed(3)} KM • ${this.track.turnsCount} TURNS`;
    }
    if (this.ui.trackFlagBadge) {
      this.ui.trackFlagBadge.innerText = `${this.track.flag} ${this.track.flagCode}`;
    }
    document.title = `F1 2D Racing - ${this.track.name}`;

    if (this.ui.teamSelect) {
      this.ui.teamSelect.value = this.selectedTeam;
    }
    if (this.ui.camModeBtn) {
      this.ui.camModeBtn.innerText = this.renderer.cameraMode === "car_follow" ? "🎥 CHASE CAM" : "🗺️ NORTH-UP";
    }
    if (this.ui.bestLapTime) {
      this.ui.bestLapTime.innerText = this.bestLapTime ? this.formatLapTime(this.bestLapTime) : "--:--.---";
    }

    this.updateHUDTeamDetails();
    this.updateVolumeUI();
    this.updateLapTimesModal();
  }

  setTeam(teamId) {
    if (!F1_TEAMS[teamId]) return;
    this.selectedTeam = teamId;
    localStorage.setItem("f1_selected_team", teamId);
    this.playerCar.setTeam(teamId);
    this.updateHUDTeamDetails();
    this.updateLapTimesModal();
  }

  updateHUDTeamDetails() {
    const team = this.playerCar.team;
    const teamBadge = document.getElementById("team-badge");
    const driverName = document.getElementById("driver-name");
    if (teamBadge) {
      teamBadge.style.backgroundColor = team.primaryColor;
      teamBadge.style.borderColor = team.accentColor;
      teamBadge.innerText = `#${team.number}`;
    }
    if (driverName) {
      driverName.innerText = `${team.driver} (${team.name})`;
    }
  }

  toggleCamera() {
    const newMode = this.renderer.toggleCameraMode();
    localStorage.setItem("f1_camera_mode", newMode);
    if (this.ui.camModeBtn) {
      this.ui.camModeBtn.innerText = newMode === "car_follow" ? "🎥 CHASE CAM" : "🗺️ NORTH-UP";
    }
  }

  toggleSound() {
    this.audio.ensureContext();
    this.audio.toggleMute();
    localStorage.setItem("f1_muted", String(this.audio.isMuted));
    localStorage.setItem("f1_volume", String(this.audio.volume));
    this.updateVolumeUI();
  }

  setVolume(vol) {
    this.audio.ensureContext();
    this.audio.setVolume(vol);
    localStorage.setItem("f1_volume", String(this.audio.volume));
    localStorage.setItem("f1_muted", String(this.audio.isMuted));
    this.updateVolumeUI();
  }

  updateVolumeUI() {
    const isMuted = this.audio.isMuted;
    const vol = this.audio.volume;
    const pct = Math.round(vol * 100);

    if (this.ui.volumeSlider) {
      this.ui.volumeSlider.value = isMuted ? 0 : pct;
    }
    if (this.ui.volumePct) {
      this.ui.volumePct.innerText = isMuted ? "MUTE" : `${pct}%`;
    }
    if (this.ui.soundToggleBtn) {
      if (isMuted || pct === 0) {
        this.ui.soundToggleBtn.innerText = "🔇";
      } else if (pct < 35) {
        this.ui.soundToggleBtn.innerText = "🔈";
      } else if (pct < 70) {
        this.ui.soundToggleBtn.innerText = "🔉";
      } else {
        this.ui.soundToggleBtn.innerText = "🔊";
      }
    }
  }

  toggleDRS() {
    if (this.playerCar.drsAvailable) {
      this.playerCar.drsActive = !this.playerCar.drsActive;
      this.audio.playDrsChime(this.playerCar.drsActive);
    }
  }

  resetCar() {
    const startIndex = this.track.startPointIndex || 0;
    const pStart = this.track.sampledPoints[startIndex];
    const angle = Math.atan2(pStart.tangentY, pStart.tangentX);
    this.playerCar.resetToGrid(pStart.x, pStart.y, angle);
    this.playerCar.ersBattery = 1.0;
    this.playerCar.ersDeploying = false;
    this.hasCrossedStartLine = false;
    this.lapStartTime = null;
    this.currentSector = 1;
    this.sectorTimes = [null, null, null];
    this.lapValid = true;
    this.lapTopSpeed = 0;
    this.lastProgress = pStart.tGlobal;
  }

  /**
   * Main game physics & animation loop
   */
  loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    this.updatePhysics(dt, timestamp);
    this.updateTiming(timestamp);
    this.updateHUD();

    // Render Canvas
    this.renderer.render(this.playerCar);

    requestAnimationFrame((t) => this.loop(t));
  }

  updatePhysics(dt, timestamp) {
    const car = this.playerCar;
    const canDrive = true;

    // Driver Input
    const throttle = canDrive && this.keys.up ? 1.0 : 0.0;
    const brake = canDrive && this.keys.down ? 1.0 : 0.0;
    let steer = 0;
    if (canDrive) {
      if (this.keys.left) steer -= 1.0;
      if (this.keys.right) steer += 1.0;
    }

    // Auto-disable DRS if brake is hit
    if (brake > 0.1 && car.drsActive) {
      car.drsActive = false;
    }

    // Surface detection & track bounds
    const surface = this.track.getSurface(car.x, car.y);
    const cp = surface.cp;
    car.lapProgress = cp.t;

    // DRS Zone availability
    const drsZone = this.track.isDrsAvailable(cp.t);
    car.drsAvailable = !!drsZone;
    if (!car.drsAvailable) {
      car.drsActive = false;
    }

    // Track Limits Invalidation (marks lap dirty without deleting time)
    if (!surface.onTrack && car.speedKmh > 40) {
      if (this.lapValid) {
        this.lapValid = false;
        this.showTrackLimitsWarning();
      }
    }

    // Run physics tick
    const input = {
      throttle,
      brake,
      steer,
      ers: this.keys.ers,
      drs: car.drsActive
    };

    this.physics.update(car, input, surface, dt);
    car.updateFX(dt, surface, brake > 0.4);

    // Update Audio Synthesizer
    this.audio.update({
      rpm: car.rpm,
      throttle,
      gear: car.gear,
      speedKmh: car.speedKmh,
      tireSlip: car.tireSlip,
      onKerb: surface.rumble,
      drsActive: car.drsActive
    });
  }

  showTrackLimitsWarning() {
    if (this.ui.trackLimitsAlert) {
      this.ui.trackLimitsAlert.classList.remove("hidden");
      setTimeout(() => {
        if (this.ui.trackLimitsAlert) this.ui.trackLimitsAlert.classList.add("hidden");
      }, 2500);
    }
  }

  updateTiming(timestamp) {
    const car = this.playerCar;
    const t = car.lapProgress;
    const dtProgress = t - this.lastProgress;

    // Track peak speed
    if (car.speedKmh > this.lapTopSpeed) {
      this.lapTopSpeed = car.speedKmh;
    }

    // Detect Start/Finish line crossing (wrap from ~0.85 -> ~0.15)
    if (this.lastProgress > 0.85 && t < 0.15 && dtProgress < -0.5) {
      if (!this.hasCrossedStartLine) {
        // Run-up completed! First crossing begins official flying Lap 1
        this.hasCrossedStartLine = true;
        this.currentLap = 1;
        this.lapStartTime = timestamp;
        this.currentSector = 1;
        this.sectorTimes = [null, null, null];
        this.lapValid = true;
        this.lapTopSpeed = car.speedKmh;
      } else {
        // Completed timed lap!
        const lapDuration = (timestamp - this.lapStartTime) / 1000;

        if (lapDuration > 40) {
          // Calculate Sector 3 split
          const s1 = this.sectorTimes[0];
          const s2 = this.sectorTimes[1];
          const s3 = (s1 && s2) ? Math.max(0, lapDuration - s1 - s2) : null;
          this.sectorTimes[2] = s3;

          const isClean = this.lapValid;
          const isPb = isClean && (!this.bestLapTime || lapDuration < this.bestLapTime);

          if (isPb) {
            this.bestLapTime = lapDuration;
            this.playerCar.bestLapTime = lapDuration;
          }

          const record = {
            lap: this.currentLap,
            time: lapDuration,
            lapTime: lapDuration,
            formatted: this.formatLapTime(lapDuration),
            s1Time: s1 || null,
            s2Time: s2 || null,
            s3Time: s3 || null,
            s1: s1 ? this.formatSectorTime(s1) : "--.---",
            s2: s2 ? this.formatSectorTime(s2) : "--.---",
            s3: s3 ? this.formatSectorTime(s3) : "--.---",
            topSpeed: Math.round(Math.max(this.lapTopSpeed || 0, car.speedKmh)),
            team: this.selectedTeam,
            teamName: this.playerCar.team.name,
            driver: this.playerCar.team.driver,
            teamColor: this.playerCar.team.primaryColor,
            trackId: this.currentTrackId,
            isValid: isClean,
            isPb: isPb,
            date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          };

          this.lapHistory.push(record);
          this.lastLapData = record;
          this.playerCar.lastLapTime = lapDuration;

          // If clean lap, add to all-time top 10
          if (isClean) {
            this.addTop10Lap(record);
          }

          this.updateLapTimesModal();
        }

        this.currentLap++;
        this.lapStartTime = timestamp;
        this.currentSector = 1;
        this.sectorTimes = [null, null, null];
        this.lapValid = true;
        this.lapTopSpeed = car.speedKmh;
      }
    }

    // Sector timing when on a timed lap
    if (this.hasCrossedStartLine && this.lapStartTime) {
      const s1Cut = this.track.sectors?.s1End || 0.30;
      const s2Cut = this.track.sectors?.s2End || 0.78;
      if (this.currentSector === 1 && t >= s1Cut) {
        this.sectorTimes[0] = (timestamp - this.lapStartTime) / 1000;
        this.currentSector = 2;
      }

      if (this.currentSector === 2 && t >= s2Cut) {
        this.sectorTimes[1] = ((timestamp - this.lapStartTime) / 1000) - (this.sectorTimes[0] || 0);
        this.currentSector = 3;
      }

      car.currentLapTime = (timestamp - this.lapStartTime) / 1000;
    } else {
      car.currentLapTime = 0;
    }

    this.lastProgress = t;
  }

  openLapTimesModal() {
    if (this.ui.laptimesModal) {
      this.ui.laptimesModal.classList.remove("hidden");
      this.isModalOpen = true;
      this.updateLapTimesModal();
    }
  }

  closeLapTimesModal() {
    if (this.ui.laptimesModal) {
      this.ui.laptimesModal.classList.add("hidden");
      this.isModalOpen = false;
    }
  }

  toggleLapTimesModal() {
    if (this.isModalOpen) {
      this.closeLapTimesModal();
    } else {
      this.openLapTimesModal();
    }
  }

  handleClearLaps() {
    if (this.modalTab === "top10") {
      if (confirm(`Are you sure you want to clear the all-time Top 10 lap records for ${this.track.name}?`)) {
        localStorage.removeItem(`f1_top10_laps_${this.currentTrackId}`);
        this.bestLapTime = null;
        this.playerCar.bestLapTime = null;
        if (this.ui.bestLapTime) this.ui.bestLapTime.innerText = "--:--.---";
        this.updateLapTimesModal();
      }
    } else {
      this.clearSessionLapTimes();
    }
  }

  clearSessionLapTimes() {
    this.lapHistory = [];
    this.lastLapData = null;
    this.playerCar.lastLapTime = null;
    if (this.ui.lastLapTime) this.ui.lastLapTime.innerText = "--:--.---";
    this.updateLapTimesModal();
  }

  updateLapTimesModal() {
    if (this.modalTab === "top10") {
      this.renderTop10Modal();
    } else {
      this.renderSessionModal();
    }
  }

  renderTop10Modal() {
    const topLaps = this.getTop10Laps(this.currentTrackId);
    if (this.ui.modalTitle) {
      this.ui.modalTitle.innerText = "⏱️ ALL-TIME TOP 10 LEADERBOARD";
    }
    if (this.ui.modalSessionSubtitle) {
      this.ui.modalSessionSubtitle.innerText = `${(this.track.shortName || this.track.name).toUpperCase()} • ALL-TIME TOP 10 FASTEST LAPS • ${this.playerCar.team.name}`;
    }

    // Find best total lap time and best sector times between all of them
    const validLaps = topLaps.map(l => l.time).filter(t => !isNaN(t) && t > 0);
    const validS1 = topLaps.map(l => l.s1Time !== undefined ? l.s1Time : parseFloat(l.s1)).filter(t => !isNaN(t) && t > 0);
    const validS2 = topLaps.map(l => l.s2Time !== undefined ? l.s2Time : parseFloat(l.s2)).filter(t => !isNaN(t) && t > 0);
    const validS3 = topLaps.map(l => l.s3Time !== undefined ? l.s3Time : parseFloat(l.s3)).filter(t => !isNaN(t) && t > 0);

    const bestLap = validLaps.length > 0 ? Math.min(...validLaps) : null;
    const bestS1 = validS1.length > 0 ? Math.min(...validS1) : null;
    const bestS2 = validS2.length > 0 ? Math.min(...validS2) : null;
    const bestS3 = validS3.length > 0 ? Math.min(...validS3) : null;
    const optimalLap = (bestS1 && bestS2 && bestS3) ? (bestS1 + bestS2 + bestS3) : null;
    const maxSpeed = topLaps.length > 0 ? Math.max(...topLaps.map(l => l.topSpeed || 0)) : 0;

    // Stat Pills
    if (this.ui.modalStatLabel1) this.ui.modalStatLabel1.innerText = "ALL-TIME RECORD";
    if (this.ui.modalStatBest) this.ui.modalStatBest.innerText = bestLap ? this.formatLapTime(bestLap) : "--:--.---";
    if (this.ui.modalStatLabel2) this.ui.modalStatLabel2.innerText = "RECORD LAPS";
    if (this.ui.modalStatTotal) this.ui.modalStatTotal.innerText = `${topLaps.length} / 10`;
    if (this.ui.modalStatLabel3) this.ui.modalStatLabel3.innerText = "OPTIMAL LAP (S1+S2+S3)";
    if (this.ui.modalStatOptimal) this.ui.modalStatOptimal.innerText = optimalLap ? this.formatLapTime(optimalLap) : "--:--.---";
    if (this.ui.modalStatLabel4) this.ui.modalStatLabel4.innerText = "TOP SPEED";
    if (this.ui.modalStatSpeed) this.ui.modalStatSpeed.innerText = maxSpeed > 0 ? `${maxSpeed} KM/H` : "-- KM/H";

    if (this.ui.clearLapsBtn) {
      this.ui.clearLapsBtn.innerText = "🗑️ CLEAR TOP 10";
      this.ui.clearLapsBtn.title = "Clear all-time top 10 records for this track";
    }

    if (this.ui.modalThead) {
      this.ui.modalThead.innerHTML = `
        <tr>
          <th style="width: 50px;">POS</th>
          <th>CAR / DRIVER</th>
          <th>LAP TIME</th>
          <th>SECTOR 1</th>
          <th>SECTOR 2</th>
          <th>SECTOR 3</th>
          <th>TOP SPEED</th>
          <th>DELTA</th>
          <th>DATE</th>
        </tr>
      `;
    }

    if (!this.ui.laptimesTbody) return;

    if (topLaps.length === 0) {
      this.ui.laptimesTbody.innerHTML = "";
      if (this.ui.laptimesEmptyState) this.ui.laptimesEmptyState.classList.remove("hidden");
      if (this.ui.modalEmptyTitle) this.ui.modalEmptyTitle.innerText = "No all-time lap records yet";
      if (this.ui.modalEmptySub) this.ui.modalEmptySub.innerText = "Complete clean laps around the circuit to enter the Top 10 All-Time Leaderboard!";
      return;
    }

    if (this.ui.laptimesEmptyState) this.ui.laptimesEmptyState.classList.add("hidden");

    let rowsHtml = "";
    topLaps.forEach((r, idx) => {
      const rS1 = r.s1Time !== undefined ? r.s1Time : parseFloat(r.s1);
      const rS2 = r.s2Time !== undefined ? r.s2Time : parseFloat(r.s2);
      const rS3 = r.s3Time !== undefined ? r.s3Time : parseFloat(r.s3);

      // Check for purple highlights between all of them
      const isPurpleLap = bestLap !== null && Math.abs(r.time - bestLap) < 0.001;
      const isPurpleS1 = bestS1 !== null && !isNaN(rS1) && Math.abs(rS1 - bestS1) < 0.001;
      const isPurpleS2 = bestS2 !== null && !isNaN(rS2) && Math.abs(rS2 - bestS2) < 0.001;
      const isPurpleS3 = bestS3 !== null && !isNaN(rS3) && Math.abs(rS3 - bestS3) < 0.001;

      let rankClass = "rank-badge";
      if (idx === 0) rankClass += " rank-gold";
      else if (idx === 1) rankClass += " rank-silver";
      else if (idx === 2) rankClass += " rank-bronze";

      let deltaStr = "-";
      let deltaClass = "delta-plus";
      if (bestLap) {
        if (idx === 0) {
          deltaStr = "BENCHMARK";
          deltaClass = "delta-best";
        } else {
          const diff = r.time - bestLap;
          deltaStr = `+${diff.toFixed(3)}s`;
        }
      }

      rowsHtml += `
        <tr class="${isPurpleLap ? 'row-pb' : ''}">
          <td><span class="${rankClass}">#${idx + 1}</span></td>
          <td>
            <div class="team-pill-badge">
              <span class="team-dot" style="background:${r.teamColor || '#e10600'}"></span>
              <span style="font-weight: 700; color: #ffffff;">${r.driver || r.teamName || r.team}</span>
            </div>
          </td>
          <td class="${isPurpleLap ? 'f1-purple-text' : ''}" style="font-weight: 800;">
            ${r.formatted} ${isPurpleLap ? '🟣' : ''}
          </td>
          <td class="${isPurpleS1 ? 'f1-purple-text' : ''}">${r.s1}</td>
          <td class="${isPurpleS2 ? 'f1-purple-text' : ''}">${r.s2}</td>
          <td class="${isPurpleS3 ? 'f1-purple-text' : ''}">${r.s3}</td>
          <td>${r.topSpeed} KM/H</td>
          <td class="${deltaClass}">${deltaStr}</td>
          <td style="color:var(--f1-text-muted);font-size:11px;">${r.date || '-'}</td>
        </tr>
      `;
    });

    this.ui.laptimesTbody.innerHTML = rowsHtml;
  }

  renderSessionModal() {
    const team = this.playerCar.team;
    if (this.ui.modalTitle) {
      this.ui.modalTitle.innerText = "⏱️ CURRENT SESSION LAPS";
    }
    if (this.ui.modalSessionSubtitle) {
      this.ui.modalSessionSubtitle.innerText = `${(this.track.shortName || this.track.name).toUpperCase()} • CURRENT HOTLAP SESSION • ${team.name}`;
    }

    const totalLaps = this.lapHistory.length;
    const cleanLaps = this.lapHistory.filter(l => l.isValid);
    const offTrackLaps = totalLaps - cleanLaps.length;

    // Find best total lap time and best sector times between all of them in this session
    const validLaps = cleanLaps.map(l => l.time).filter(t => !isNaN(t) && t > 0);
    const validS1 = cleanLaps.map(l => l.s1Time !== undefined ? l.s1Time : parseFloat(l.s1)).filter(t => !isNaN(t) && t > 0);
    const validS2 = cleanLaps.map(l => l.s2Time !== undefined ? l.s2Time : parseFloat(l.s2)).filter(t => !isNaN(t) && t > 0);
    const validS3 = cleanLaps.map(l => l.s3Time !== undefined ? l.s3Time : parseFloat(l.s3)).filter(t => !isNaN(t) && t > 0);

    const bestLap = validLaps.length > 0 ? Math.min(...validLaps) : null;
    const bestS1 = validS1.length > 0 ? Math.min(...validS1) : null;
    const bestS2 = validS2.length > 0 ? Math.min(...validS2) : null;
    const bestS3 = validS3.length > 0 ? Math.min(...validS3) : null;

    // Stat Pills
    if (this.ui.modalStatLabel1) this.ui.modalStatLabel1.innerText = "SESSION BEST";
    if (this.ui.modalStatBest) this.ui.modalStatBest.innerText = bestLap ? this.formatLapTime(bestLap) : "--:--.---";
    if (this.ui.modalStatLabel2) this.ui.modalStatLabel2.innerText = "TOTAL LAPS";
    if (this.ui.modalStatTotal) this.ui.modalStatTotal.innerText = totalLaps;
    if (this.ui.modalStatLabel3) this.ui.modalStatLabel3.innerText = "CLEAN LAPS";
    if (this.ui.modalStatOptimal) this.ui.modalStatOptimal.innerText = cleanLaps.length;
    if (this.ui.modalStatLabel4) this.ui.modalStatLabel4.innerText = "OFF-TRACK LAPS";
    if (this.ui.modalStatSpeed) this.ui.modalStatSpeed.innerText = offTrackLaps;

    if (this.ui.clearLapsBtn) {
      this.ui.clearLapsBtn.innerText = "🗑️ CLEAR SESSION";
      this.ui.clearLapsBtn.title = "Clear current session lap history";
    }

    if (this.ui.modalThead) {
      this.ui.modalThead.innerHTML = `
        <tr>
          <th style="width: 55px;">LAP</th>
          <th>LAP TIME</th>
          <th>SECTOR 1</th>
          <th>SECTOR 2</th>
          <th>SECTOR 3</th>
          <th>TOP SPEED</th>
          <th>DELTA</th>
          <th>STATUS</th>
        </tr>
      `;
    }

    if (!this.ui.laptimesTbody) return;

    if (totalLaps === 0) {
      this.ui.laptimesTbody.innerHTML = "";
      if (this.ui.laptimesEmptyState) this.ui.laptimesEmptyState.classList.remove("hidden");
      if (this.ui.modalEmptyTitle) this.ui.modalEmptyTitle.innerText = "No session laps completed yet";
      if (this.ui.modalEmptySub) this.ui.modalEmptySub.innerText = "Complete laps around the track to record timing telemetry!";
      return;
    }

    if (this.ui.laptimesEmptyState) this.ui.laptimesEmptyState.classList.add("hidden");

    let rowsHtml = "";
    const reversed = [...this.lapHistory].reverse();

    reversed.forEach((r) => {
      const rS1 = r.s1Time !== undefined ? r.s1Time : parseFloat(r.s1);
      const rS2 = r.s2Time !== undefined ? r.s2Time : parseFloat(r.s2);
      const rS3 = r.s3Time !== undefined ? r.s3Time : parseFloat(r.s3);

      const isPurpleLap = r.isValid && bestLap !== null && Math.abs(r.time - bestLap) < 0.001;
      const isPurpleS1 = r.isValid && bestS1 !== null && !isNaN(rS1) && Math.abs(rS1 - bestS1) < 0.001;
      const isPurpleS2 = r.isValid && bestS2 !== null && !isNaN(rS2) && Math.abs(rS2 - bestS2) < 0.001;
      const isPurpleS3 = r.isValid && bestS3 !== null && !isNaN(rS3) && Math.abs(rS3 - bestS3) < 0.001;

      let deltaStr = "-";
      let deltaClass = "";
      if (bestLap && r.isValid) {
        if (isPurpleLap) {
          deltaStr = "BENCHMARK";
          deltaClass = "delta-best";
        } else {
          const diff = r.time - bestLap;
          deltaStr = `+${diff.toFixed(3)}s`;
          deltaClass = "delta-plus";
        }
      }

      let badgeHtml = "";
      let rowClass = "";
      if (isPurpleLap) {
        badgeHtml = `<span class="lap-badge badge-pb">🟣 BEST LAP</span>`;
        rowClass = "row-pb";
      } else if (r.isValid) {
        badgeHtml = `<span class="lap-badge badge-valid">✓ CLEAN</span>`;
      } else {
        badgeHtml = `<span class="lap-badge badge-invalid">⚠️ OFF-TRACK</span>`;
        rowClass = "row-invalid";
      }

      rowsHtml += `
        <tr class="${rowClass}">
          <td style="font-weight: 700;">#${r.lap}</td>
          <td class="${isPurpleLap ? 'f1-purple-text' : ''}" style="font-weight: 800; color: ${isPurpleLap ? 'var(--f1-purple)' : (r.isValid ? '#ffffff' : '#fbbf24')};">
            ${r.formatted} ${!r.isValid ? '⚠️' : ''}
          </td>
          <td class="${isPurpleS1 ? 'f1-purple-text' : ''}">${r.s1}</td>
          <td class="${isPurpleS2 ? 'f1-purple-text' : ''}">${r.s2}</td>
          <td class="${isPurpleS3 ? 'f1-purple-text' : ''}">${r.s3}</td>
          <td>${r.topSpeed} KM/H</td>
          <td class="${deltaClass}">${deltaStr}</td>
          <td>${badgeHtml}</td>
        </tr>
      `;
    });

    this.ui.laptimesTbody.innerHTML = rowsHtml;
  }

  formatLapTime(seconds) {
    if (!seconds || seconds <= 0) return "--:--.---";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
  }

  formatSectorTime(seconds) {
    if (!seconds || seconds <= 0) return "--.---";
    return seconds.toFixed(3);
  }

  updateHUD() {
    const car = this.playerCar;

    // 1. Digital Speedometer & Gear
    if (this.ui.speedNum) {
      this.ui.speedNum.innerText = Math.round(car.speedKmh);
    }
    if (this.ui.gearNum) {
      this.ui.gearNum.innerText = car.gear === -1 ? "R" : (car.gear === 0 ? "N" : car.gear);
    }

    // 2. RPM Bar & Shift LEDs (Green -> Red -> Blue Flash)
    const rpmNorm = (car.rpm - 4200) / (15000 - 4200);
    if (this.ui.rpmBar) {
      this.ui.rpmBar.style.width = `${Math.min(100, Math.max(0, rpmNorm * 100))}%`;
    }

    if (this.ui.rpmLeds) {
      const activeLeds = Math.floor(rpmNorm * this.ui.rpmLeds.length);
      const isShiftLimit = car.rpm > 13600;
      this.ui.rpmLeds.forEach((led, idx) => {
        if (idx < activeLeds) {
          led.classList.add("lit");
          if (isShiftLimit && idx >= this.ui.rpmLeds.length - 4) {
            led.classList.add("flash");
          } else {
            led.classList.remove("flash");
          }
        } else {
          led.classList.remove("lit", "flash");
        }
      });
    }

    // 3. DRS Indicator
    if (this.ui.drsBadge) {
      if (car.drsActive) {
        this.ui.drsBadge.className = "drs-status enabled";
        this.ui.drsBadge.innerText = "DRS ENABLED";
      } else if (car.drsAvailable) {
        this.ui.drsBadge.className = "drs-status available";
        this.ui.drsBadge.innerText = "DRS AVAILABLE";
      } else {
        this.ui.drsBadge.className = "drs-status disabled";
        this.ui.drsBadge.innerText = "DRS DISABLED";
      }
    }

    // 4. ERS Battery
    if (this.ui.ersBar) {
      this.ui.ersBar.style.width = `${Math.round(car.ersBattery * 100)}%`;
    }
    if (this.ui.ersPct) {
      this.ui.ersPct.innerText = `${Math.round(car.ersBattery * 100)}%`;
    }

    // 5. Lap Times & Status
    if (this.ui.lapCounterBadge) {
      if (!this.hasCrossedStartLine) {
        this.ui.lapCounterBadge.innerText = "OUT LAP / TIME TRIAL";
      } else {
        this.ui.lapCounterBadge.innerText = `LAP ${this.currentLap} / TIME TRIAL`;
      }
    }

    if (this.ui.currentLapTime) {
      if (!this.hasCrossedStartLine) {
        this.ui.currentLapTime.innerText = "--:--.---";
        this.ui.currentLapTime.style.color = "#94a3b8";
      } else {
        this.ui.currentLapTime.innerText = this.formatLapTime(car.currentLapTime);
        this.ui.currentLapTime.style.color = this.lapValid ? "#ffffff" : "#ef4444";
      }
    }

    if (this.ui.lastLapTime) {
      if (this.lastLapData) {
        this.ui.lastLapTime.innerText = `${this.lastLapData.formatted}${this.lastLapData.isValid ? "" : " ⚠️"}`;
        this.ui.lastLapTime.style.color = this.lastLapData.isValid ? (this.lastLapData.isPb ? "#c084fc" : "#ffffff") : "#f59e0b";
      } else {
        this.ui.lastLapTime.innerText = "--:--.---";
        this.ui.lastLapTime.style.color = "#94a3b8";
      }
    }

    if (this.ui.bestLapTime) {
      this.ui.bestLapTime.innerText = this.bestLapTime ? this.formatLapTime(this.bestLapTime) : "--:--.---";
    }

    // 6. Sectors
    if (this.ui.s1Badge) {
      this.ui.s1Badge.innerText = `S1: ${this.formatSectorTime(this.sectorTimes[0])}`;
    }
    if (this.ui.s2Badge) {
      this.ui.s2Badge.innerText = `S2: ${this.formatSectorTime(this.sectorTimes[1])}`;
    }
    if (this.ui.s3Badge) {
      this.ui.s3Badge.innerText = `S3: ${this.formatSectorTime(this.sectorTimes[2])}`;
    }
  }
}

// Bootstrap Game on Page Load
function bootstrapGame() {
  if (!window.game) {
    try {
      window.game = new F1Game();
    } catch (err) {
      console.error("Critical error starting F1Game:", err);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapGame);
} else {
  // DOM is already ready (interactive or complete)
  bootstrapGame();
}

