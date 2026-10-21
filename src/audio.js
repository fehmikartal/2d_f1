/**
 * High-Performance F1 Sound Engine using Web Audio API
 * Generates V6 Turbo Hybrid roar, turbo spool, gearshift pops, tire squeals, and kerb rumbles
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.volume = 0.7;
    this.masterGain = null;
    this.isInitialized = false;

    // Engine synth nodes
    this.engineGain = null;
    this.oscillators = [];
    this.engineFilter = null;
    this.subOsc = null;

    // Turbo synth nodes
    this.turboOsc = null;
    this.turboGain = null;

    // Tire squeal nodes
    this.squealSource = null;
    this.squealFilter = null;
    this.squealGain = null;

    // Kerb rumble nodes
    this.kerbOsc = null;
    this.kerbGain = null;

    // Wind rush nodes
    this.windSource = null;
    this.windFilter = null;
    this.windGain = null;

    // State tracking
    this.currentRPM = 4000;
    this.lastGear = 1;
    this.lastThrottle = 0;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master output
      this.masterGain = this.ctx.createGain();
      const initialGain = this.isMuted ? 0 : this.volume * 0.55;
      this.masterGain.gain.setValueAtTime(initialGain, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupTurboSynth();
      this.setupTireSquealSynth();
      this.setupKerbRumbleSynth();
      this.setupWindSynth();

      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio API not permitted without user gesture", e);
    }
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setupEngineSynth() {
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Resonant lowpass filter to shape V6 bite
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    // Distortion / saturation waveshaper for raw exhaust grit
    const distortion = this.ctx.createWaveShaper();
    distortion.curve = this.makeDistortionCurve(18);
    distortion.oversample = "2x";

    this.engineFilter.connect(distortion);
    distortion.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    // 4 Oscillators representing V6 combustion harmonics (Crankshaft, firing order)
    const harmonicRatios = [1.0, 1.5, 2.0, 3.0];
    const waveTypes = ["sawtooth", "triangle", "sawtooth", "square"];
    const gains = [0.45, 0.35, 0.25, 0.15];

    this.oscillators = [];
    harmonicRatios.forEach((ratio, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = waveTypes[idx];
      osc.frequency.setValueAtTime(70 * ratio, this.ctx.currentTime);
      gain.gain.setValueAtTime(gains[idx], this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.engineFilter);
      osc.start();

      this.oscillators.push({ osc, gain, ratio });
    });

    // Sub-bass rumble for cockpit vibration
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = "sine";
    this.subOsc.frequency.setValueAtTime(35, this.ctx.currentTime);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    this.subOsc.connect(subGain);
    subGain.connect(this.engineGain);
    this.subOsc.start();
  }

  setupTurboSynth() {
    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = "sine";
    this.turboOsc.frequency.setValueAtTime(2200, this.ctx.currentTime);

    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.masterGain);
    this.turboOsc.start();
  }

  setupTireSquealSynth() {
    // White noise buffer for tire slip
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.squealSource = this.ctx.createBufferSource();
    this.squealSource.buffer = noiseBuffer;
    this.squealSource.loop = true;

    this.squealFilter = this.ctx.createBiquadFilter();
    this.squealFilter.type = "bandpass";
    this.squealFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    this.squealFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    this.squealGain = this.ctx.createGain();
    this.squealGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.squealSource.connect(this.squealFilter);
    this.squealFilter.connect(this.squealGain);
    this.squealGain.connect(this.masterGain);
    this.squealSource.start();
  }

  setupKerbRumbleSynth() {
    this.kerbOsc = this.ctx.createOscillator();
    this.kerbOsc.type = "triangle";
    this.kerbOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.kerbGain = this.ctx.createGain();
    this.kerbGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.kerbOsc.connect(this.kerbGain);
    this.kerbGain.connect(this.masterGain);
    this.kerbOsc.start();
  }

  setupWindSynth() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = noiseBuffer;
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.frequency.setValueAtTime(300, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    this.windSource.start();
  }

  makeDistortionCurve(amount) {
    const k = typeof amount === "number" ? amount : 50;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  /**
   * Main update function called each game frame
   */
  update(carState) {
    if (!this.isInitialized || this.isMuted) return;

    const {
      rpm,
      throttle,
      gear,
      speedKmh,
      tireSlip,
      onKerb,
      drsActive
    } = carState;

    const now = this.ctx.currentTime;

    if (!rpm || rpm <= 0) {
      if (this.engineGain) this.engineGain.gain.setTargetAtTime(0.0, now, 0.04);
      if (this.turboGain) this.turboGain.gain.setTargetAtTime(0.0, now, 0.04);
      if (this.squealGain) this.squealGain.gain.setTargetAtTime(0.0, now, 0.03);
      if (this.kerbGain) this.kerbGain.gain.setTargetAtTime(0.0, now, 0.03);
      if (this.windGain) this.windGain.gain.setTargetAtTime(0.0, now, 0.04);
      return;
    }

    // Fundamental firing frequency: F1 V6 runs at (RPM / 60) * 3 Hz (combustions per rev)
    const baseFreq = (rpm / 60) * 3;

    // Update engine oscillators
    this.oscillators.forEach(({ osc, ratio }) => {
      osc.frequency.setTargetAtTime(baseFreq * ratio, now, 0.04);
    });

    if (this.subOsc) {
      this.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
    }

    // Engine filter cutoff rises with throttle & RPM
    const targetCutoff = 400 + (rpm / 15000) * 2800 + throttle * 1200;
    this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.04);

    // Engine volume: idle has low hum, full throttle roars
    const targetEngineVol = 0.15 + (rpm / 15000) * 0.45 + throttle * 0.35;
    this.engineGain.gain.setTargetAtTime(targetEngineVol, now, 0.05);

    // Turbo spool sound
    const targetTurboFreq = 1800 + (rpm / 15000) * 2200;
    const targetTurboVol = throttle > 0.4 ? (throttle - 0.4) * 0.09 : 0.0;
    this.turboOsc.frequency.setTargetAtTime(targetTurboFreq, now, 0.06);
    this.turboGain.gain.setTargetAtTime(targetTurboVol, now, 0.06);

    // Turbo blow-off flutter chirp on throttle lift
    if (this.lastThrottle > 0.8 && throttle < 0.2 && rpm > 9000) {
      this.playTurboBlowOff();
    }
    this.lastThrottle = throttle;

    // Gear shift pop / exhaust crackle
    if (gear !== this.lastGear) {
      this.playGearshiftPop(gear > this.lastGear);
      this.lastGear = gear;
    }

    // Tire squeal (bandpass noise)
    const squealVol = Math.min(1.0, Math.max(0, (tireSlip - 0.22) * 2.2));
    this.squealGain.gain.setTargetAtTime(squealVol * 0.35, now, 0.03);
    this.squealFilter.frequency.setTargetAtTime(950 + tireSlip * 700, now, 0.03);

    // Kerb rumble
    const kerbVol = onKerb ? Math.min(0.35, 0.1 + (speedKmh / 350) * 0.25) : 0;
    this.kerbGain.gain.setTargetAtTime(kerbVol, now, 0.03);
    this.kerbOsc.frequency.setTargetAtTime(35 + (speedKmh / 350) * 55, now, 0.03);

    // Wind noise
    const windVol = Math.min(0.28, Math.pow(speedKmh / 340, 2) * 0.25);
    this.windGain.gain.setTargetAtTime(windVol, now, 0.08);
    this.windFilter.frequency.setTargetAtTime(200 + (speedKmh / 340) * 600, now, 0.08);
  }

  playGearshiftPop(isUpshift) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isUpshift ? "square" : "sawtooth";
      osc.frequency.setValueAtTime(isUpshift ? 120 : 80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.07);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (_) {}
  }

  playTurboBlowOff() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(3000, now);
      osc.frequency.linearRampToValueAtTime(1400, now + 0.18);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch (_) {}
  }

  playDrsChime(activated) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(activated ? 1760 : 880, now);
      osc.frequency.setValueAtTime(activated ? 2200 : 700, now + 0.06);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch (_) {}
  }

  playRedLightBeep(isFinalGreen) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isFinalGreen ? "triangle" : "sine";
      osc.frequency.setValueAtTime(isFinalGreen ? 1318 : 659, now); // E6 or E5

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinalGreen ? 0.35 : 0.15));

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + (isFinalGreen ? 0.36 : 0.16));
    } catch (_) {}
  }

  setVolume(vol) {
    this.ensureContext();
    this.volume = Math.max(0, Math.min(1.0, vol));
    if (this.volume > 0 && this.isMuted) {
      this.isMuted = false;
    } else if (this.volume === 0) {
      this.isMuted = true;
    }
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume * 0.55;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.03);
    }
    return this.volume;
  }

  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    if (!this.isMuted && this.volume === 0) {
      this.volume = 0.5;
    }
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.volume * 0.55;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.03);
    }
    return this.isMuted;
  }
}
