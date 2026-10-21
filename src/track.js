/**
 * Track Definitions & Spline Geometry for Formula 1 Circuits
 * Includes Circuit de Spa-Francorchamps (Belgium) & Intercity Istanbul Park (Turkey)
 */

// ========================================================
// 1. CIRCUIT DE SPA-FRANCORCHAMPS
// ========================================================

export const SPA_CORNERS = [
  { name: "La Source", number: 1, type: "Hairpin Right", t: 0.064 },
  { name: "Eau Rouge", number: 2, type: "Left Flick Downhill", t: 0.195 },
  { name: "Raidillon", number: 4, type: "Uphill Right-Left", t: 0.220 },
  { name: "Kemmel Straight", number: null, type: "DRS Zone 1", t: 0.320 },
  { name: "Les Combes", number: 5, type: "Right Chicane Entry", t: 0.413 },
  { name: "Malmedy", number: 7, type: "Right Turn", t: 0.431 },
  { name: "Rivage / Bruxelles", number: 8, type: "180° Downhill Hairpin", t: 0.489 },
  { name: "Speaker's Corner", number: 9, type: "Sweeping Left", t: 0.541 },
  { name: "Pouhon (Double Gauche)", number: 10, type: "Fast Double Apex Left", t: 0.598 },
  { name: "Fagnes / Pif-Paf", number: 12, type: "Right-Left Chicane", t: 0.704 },
  { name: "Campus", number: 14, type: "Right Flick", t: 0.732 },
  { name: "Stavelot", number: 15, type: "Banked Right Exit", t: 0.747 },
  { name: "Courbe Paul Frère", number: 16, type: "High-Speed Right", t: 0.778 },
  { name: "Blanchimont", number: 17, type: "Flat-out Left", t: 0.812 },
  { name: "Bus Stop Chicane", number: 19, type: "Slow Right-Left Chicane", t: 0.949 },
];

export const SPA_DRS_ZONES = [
  {
    name: "Kemmel Straight DRS",
    detectionT: 0.175,
    activationStartT: 0.255,
    activationEndT: 0.390,
  },
  {
    name: "Main Straight DRS",
    detectionT: 0.920,
    activationStartT: 0.975,
    activationEndT: 0.040,
  }
];

export const SPA_SECTORS = {
  s1End: 0.44, // Exit of Turn 7 (Malmedy) - one corner after Les Combes / Kemmel DRS
  s2End: 0.78, // Courbe Paul Frère exit
  s3End: 1.00
};

export const SPA_CONTROL_POINTS = [
  // Start/Finish straight (Grid boxes, heading towards La Source)
  { x: 3400, y: 3800, width: 140, kerbL: false, kerbR: false, speedLimit: 330 },
  { x: 3600, y: 3300, width: 140, kerbL: false, kerbR: false, speedLimit: 320 },
  { x: 3750, y: 2800, width: 140, kerbL: false, kerbR: false, speedLimit: 280 }, // Braking 100m
  { x: 3850, y: 2450, width: 145, kerbL: true, kerbR: false, speedLimit: 140 },  // Turn-in La Source

  // Turn 1: La Source Hairpin (Right)
  { x: 4000, y: 2200, width: 145, kerbL: true, kerbR: true, speedLimit: 75, apex: true },
  { x: 4180, y: 2320, width: 145, kerbL: false, kerbR: true, speedLimit: 90 },
  { x: 4280, y: 2550, width: 145, kerbL: true, kerbR: false, speedLimit: 130 },  // Exit La Source curb

  // Downhill plunge towards Eau Rouge
  { x: 4350, y: 2900, width: 140, kerbL: false, kerbR: false, speedLimit: 180 },
  { x: 4430, y: 3400, width: 140, kerbL: false, kerbR: false, speedLimit: 225 },
  { x: 4520, y: 4000, width: 140, kerbL: false, kerbR: false, speedLimit: 265 },
  { x: 4620, y: 4600, width: 140, kerbL: false, kerbR: false, speedLimit: 295 },
  { x: 4720, y: 5100, width: 140, kerbL: false, kerbR: false, speedLimit: 305 },

  // Turn 2: Eau Rouge stream bridge & entry flick left
  { x: 4820, y: 5550, width: 145, kerbL: true, kerbR: false, speedLimit: 295, elevation: -20 },
  { x: 4940, y: 5850, width: 150, kerbL: true, kerbR: false, speedLimit: 290, elevation: 0 },

  // Turn 3-4: Raidillon uphill compression & blind crest (Right then Left)
  { x: 5120, y: 6150, width: 150, kerbL: false, kerbR: true, speedLimit: 285, elevation: 35, apex: true },
  { x: 5320, y: 6400, width: 150, kerbL: true, kerbR: true, speedLimit: 290, elevation: 70 },
  { x: 5560, y: 6600, width: 145, kerbL: true, kerbR: false, speedLimit: 300, elevation: 90 }, // Raidillon crest exit

  // Kemmel Straight (DRS Zone 1)
  { x: 6100, y: 6850, width: 140, kerbL: false, kerbR: false, speedLimit: 320, elevation: 100 },
  { x: 6900, y: 7150, width: 140, kerbL: false, kerbR: false, speedLimit: 335, elevation: 105 },
  { x: 7700, y: 7450, width: 140, kerbL: false, kerbR: false, speedLimit: 345, elevation: 110 },
  { x: 8500, y: 7750, width: 140, kerbL: false, kerbR: false, speedLimit: 350, elevation: 115 },
  { x: 9200, y: 8000, width: 140, kerbL: false, kerbR: false, speedLimit: 320, elevation: 120 }, // Braking 150m Les Combes

  // Turn 5-6: Les Combes (Chicane Right-Left at highest altitude)
  { x: 9600, y: 8120, width: 145, kerbL: true, kerbR: false, speedLimit: 170, elevation: 125 },
  { x: 9850, y: 8150, width: 140, kerbL: false, kerbR: true, speedLimit: 135, elevation: 125, apex: true },
  { x: 10050, y: 8050, width: 140, kerbL: true, kerbR: false, speedLimit: 130, elevation: 120, apex: true },

  // Turn 7: Malmedy (Right)
  { x: 10220, y: 7850, width: 140, kerbL: false, kerbR: true, speedLimit: 155, elevation: 115 },
  { x: 10320, y: 7550, width: 145, kerbL: true, kerbR: true, speedLimit: 180, elevation: 105 },

  // Downhill plunge to Rivage / Bruxelles
  { x: 10380, y: 7100, width: 140, kerbL: false, kerbR: false, speedLimit: 220, elevation: 95 },
  { x: 10400, y: 6650, width: 140, kerbL: true, kerbR: false, speedLimit: 160, elevation: 85 }, // Braking Bruxelles

  // Turn 8: Bruxelles / Rivage (180° Downhill Hairpin Right)
  { x: 10420, y: 6300, width: 145, kerbL: false, kerbR: true, speedLimit: 105, elevation: 75, apex: true },
  { x: 10340, y: 6000, width: 150, kerbL: false, kerbR: true, speedLimit: 95, elevation: 65, apex: true },
  { x: 10180, y: 5750, width: 145, kerbL: true, kerbR: false, speedLimit: 110, elevation: 60 },

  // Turn 9: Speaker's Corner (Left uphill hook)
  { x: 9880, y: 5500, width: 140, kerbL: false, kerbR: false, speedLimit: 145, elevation: 55 },
  { x: 9500, y: 5400, width: 145, kerbL: true, kerbR: false, speedLimit: 130, elevation: 50, apex: true },
  { x: 9150, y: 5450, width: 140, kerbL: false, kerbR: true, speedLimit: 175, elevation: 45 },

  // Turn 10-11: Pouhon / Double Gauche (Iconic high-speed double-apex left)
  { x: 8650, y: 5600, width: 145, kerbL: false, kerbR: false, speedLimit: 245, elevation: 40 },
  { x: 8050, y: 5850, width: 150, kerbL: true, kerbR: false, speedLimit: 215, elevation: 35, apex: true },
  { x: 7450, y: 6050, width: 150, kerbL: true, kerbR: false, speedLimit: 210, elevation: 30, apex: true },
  { x: 6850, y: 6150, width: 145, kerbL: false, kerbR: true, speedLimit: 235, elevation: 25 },

  // Turn 12-13: Fagnes / Pif-Paf (Right-Left chicane)
  { x: 6250, y: 6100, width: 140, kerbL: false, kerbR: false, speedLimit: 260, elevation: 25 },
  { x: 5700, y: 5900, width: 145, kerbL: true, kerbR: false, speedLimit: 170, elevation: 25 },
  { x: 5350, y: 5650, width: 145, kerbL: false, kerbR: true, speedLimit: 140, elevation: 25, apex: true },
  { x: 5050, y: 5450, width: 145, kerbL: true, kerbR: false, speedLimit: 145, elevation: 30, apex: true },

  // Turn 14: Campus (Right flick)
  { x: 4680, y: 5350, width: 145, kerbL: false, kerbR: true, speedLimit: 195, elevation: 35, apex: true },

  // Turn 15: Stavelot (Banked Right)
  { x: 4380, y: 5600, width: 150, kerbL: false, kerbR: true, speedLimit: 180, elevation: 40, apex: true },
  { x: 4120, y: 5900, width: 150, kerbL: true, kerbR: false, speedLimit: 220, elevation: 40 },

  // Turn 16: Courbe Paul Frère (Accelerating high-speed bend)
  { x: 3800, y: 6200, width: 145, kerbL: false, kerbR: true, speedLimit: 255, elevation: 35 },
  { x: 3450, y: 6400, width: 145, kerbL: true, kerbR: false, speedLimit: 285, elevation: 30 },

  // Turn 17-18: Blanchimont (Iconic ultra-high speed sweepers, 310+ km/h)
  { x: 2950, y: 6500, width: 145, kerbL: true, kerbR: false, speedLimit: 310, elevation: 20, apex: true },
  { x: 2450, y: 6400, width: 145, kerbL: false, kerbR: true, speedLimit: 315, elevation: 15 },
  { x: 2050, y: 6050, width: 140, kerbL: true, kerbR: false, speedLimit: 320, elevation: 10, apex: true },
  { x: 1800, y: 5500, width: 140, kerbL: false, kerbR: false, speedLimit: 325, elevation: 5 },
  { x: 1750, y: 4800, width: 140, kerbL: false, kerbR: false, speedLimit: 330, elevation: 0 },
  { x: 1850, y: 4200, width: 145, kerbL: false, kerbR: false, speedLimit: 310, elevation: 0 },

  // Turn 19-20: Bus Stop Chicane (Heavy braking, sharp Right then Left)
  { x: 2050, y: 3800, width: 145, kerbL: true, kerbR: false, speedLimit: 140, elevation: 0 },
  { x: 2280, y: 3650, width: 140, kerbL: false, kerbR: true, speedLimit: 80, elevation: 0, apex: true },
  { x: 2480, y: 3750, width: 140, kerbL: true, kerbR: false, speedLimit: 85, elevation: 0, apex: true },
  { x: 2700, y: 3950, width: 145, kerbL: false, kerbR: true, speedLimit: 140, elevation: 0 },

  // Connect back onto Start/Finish straight
  { x: 3000, y: 4100, width: 140, kerbL: false, kerbR: false, speedLimit: 230, elevation: 0 }
];

// ========================================================
// 2. INTERCITY ISTANBUL PARK (TURKEY)
// ========================================================

export const ISTANBUL_CORNERS = [
  { name: "Turn 1", number: 1, type: "Downhill 90° Left", t: 0.188 },
  { name: "Turn 2", number: 2, type: "Uphill Sweeping Right", t: 0.235 },
  { name: "Turn 3", number: 3, type: "Fast Right Bend", t: 0.298 },
  { name: "Turn 4", number: 4, type: "Uphill Left Flick", t: 0.335 },
  { name: "Turn 5", number: 5, type: "Sharp Right Hook", t: 0.364 },
  { name: "Turn 6", number: 6, type: "Medium Right", t: 0.399 },
  { name: "Turn 7", number: 7, type: "Fast Right Kink", t: 0.433 },
  { name: "Turn 8 (Triple Apex)", number: 8, type: "Legendary 3-Apex High-G Left", t: 0.497 },
  { name: "Turn 9", number: 9, type: "Sharp Left", t: 0.678 },
  { name: "Turn 10", number: 10, type: "Right Flick", t: 0.692 },
  { name: "Turn 11", number: 11, type: "Flat-out Backstraight Kink", t: 0.813 },
  { name: "Turn 12", number: 12, type: "Heavy Braking Left", t: 0.968 },
  { name: "Turn 13", number: 13, type: "Chicane Right", t: 0.981 },
  { name: "Turn 14", number: 14, type: "Chicane Exit Left", t: 0.991 }
];

export const ISTANBUL_DRS_ZONES = [
  {
    name: "Pit Straight DRS",
    detectionT: 0.985,
    activationStartT: 0.025,
    activationEndT: 0.145
  },
  {
    name: "Back Straight DRS",
    detectionT: 0.685,
    activationStartT: 0.730,
    activationEndT: 0.920
  }
];

export const ISTANBUL_SECTORS = {
  s1End: 0.44,
  s2End: 0.76,
  s3End: 1.00
};

export const ISTANBUL_CONTROL_POINTS = [
  // Start/Finish Straight (West to East along the bottom, anti-clockwise)
  { x: 2800, y: 7800, width: 140, kerbL: false, kerbR: false, speedLimit: 330 }, // T14 chicane exit
  { x: 3500, y: 7800, width: 140, kerbL: false, kerbR: false, speedLimit: 335 },
  { x: 4200, y: 7800, width: 140, kerbL: false, kerbR: false, speedLimit: 340 }, // START / FINISH LINE
  { x: 5500, y: 7800, width: 140, kerbL: false, kerbR: false, speedLimit: 345 }, // Main Straight DRS
  { x: 6700, y: 7800, width: 140, kerbL: false, kerbR: false, speedLimit: 310 }, // 100m braking T1
  { x: 7400, y: 7800, width: 145, kerbL: false, kerbR: false, speedLimit: 140 }, // Turn-in T1

  // Turn 1 (Downhill 90° Left)
  { x: 7800, y: 7600, width: 145, kerbL: true, kerbR: false, speedLimit: 110, apex: true },
  { x: 7850, y: 7100, width: 145, kerbL: false, kerbR: true, speedLimit: 130 },

  // Turn 2 (Uphill sweeping Right)
  { x: 8000, y: 6600, width: 145, kerbL: false, kerbR: true, speedLimit: 180 },
  { x: 8400, y: 6300, width: 145, kerbL: true, kerbR: false, speedLimit: 220 },

  // Turn 3 (Sweeping Right bend)
  { x: 9100, y: 6250, width: 140, kerbL: false, kerbR: false, speedLimit: 260 },
  { x: 9800, y: 6350, width: 145, kerbL: false, kerbR: true, speedLimit: 240, apex: true },

  // Turn 4 (Left flick uphill)
  { x: 10200, y: 6150, width: 145, kerbL: false, kerbR: false, speedLimit: 180 },
  { x: 10400, y: 5650, width: 145, kerbL: true, kerbR: false, speedLimit: 150, apex: true },

  // Turn 5 (Sharp Right Hook)
  { x: 10700, y: 5500, width: 145, kerbL: false, kerbR: true, speedLimit: 125 },
  { x: 11100, y: 5650, width: 145, kerbL: false, kerbR: true, speedLimit: 110, apex: true }, // T5

  // Turn 6 (Medium Right)
  { x: 11450, y: 5350, width: 145, kerbL: true, kerbR: false, speedLimit: 160 }, // T5 exit / T6 entry
  { x: 11650, y: 4950, width: 145, kerbL: false, kerbR: true, speedLimit: 175, apex: true }, // T6 Apex

  // Turn 7 (Fast Right Kink leading into Turn 8)
  { x: 11500, y: 4500, width: 145, kerbL: false, kerbR: false, speedLimit: 215 },
  { x: 11300, y: 4100, width: 145, kerbL: false, kerbR: true, speedLimit: 245, apex: true }, // T7 Apex

  // Turn 8 (Legendary 3-Apex Left-Hander)
  { x: 11450, y: 3700, width: 150, kerbL: false, kerbR: false, speedLimit: 260 }, // Entry T8
  { x: 11800, y: 3400, width: 150, kerbL: true, kerbR: false, speedLimit: 255, apex: true }, // Apex 1
  { x: 12050, y: 3100, width: 150, kerbL: false, kerbR: false, speedLimit: 250 }, // Mid 1-2
  { x: 12000, y: 2700, width: 150, kerbL: true, kerbR: false, speedLimit: 250, apex: true }, // Apex 2
  { x: 11750, y: 2400, width: 150, kerbL: false, kerbR: false, speedLimit: 255 }, // Mid 2-3
  { x: 11350, y: 2220, width: 150, kerbL: true, kerbR: false, speedLimit: 265, apex: true }, // Apex 3
  { x: 10900, y: 2150, width: 145, kerbL: false, kerbR: true, speedLimit: 285 }, // T8 exit onto straight

  // Top straight heading West towards Turn 9
  { x: 9800, y: 2100, width: 140, kerbL: false, kerbR: false, speedLimit: 310 },
  { x: 8600, y: 2050, width: 140, kerbL: false, kerbR: false, speedLimit: 320 },
  { x: 7700, y: 2050, width: 145, kerbL: false, kerbR: false, speedLimit: 180 }, // Braking T9

  // Turn 9 & 10 (Chicane Left-Right)
  { x: 7350, y: 2200, width: 140, kerbL: true, kerbR: false, speedLimit: 110, apex: true }, // T9
  { x: 7400, y: 2550, width: 140, kerbL: false, kerbR: true, speedLimit: 125, apex: true }, // T10
  { x: 7250, y: 2950, width: 140, kerbL: false, kerbR: false, speedLimit: 175 },

  // Long Back Straight (Heading South-West down towards T12) - DRS Zone
  { x: 6700, y: 3700, width: 140, kerbL: false, kerbR: false, speedLimit: 250 },
  { x: 6100, y: 4450, width: 140, kerbL: false, kerbR: false, speedLimit: 300 },
  { x: 5500, y: 5150, width: 140, kerbL: false, kerbR: false, speedLimit: 325 }, // T11 kink
  { x: 4800, y: 5800, width: 140, kerbL: false, kerbR: false, speedLimit: 340 },
  { x: 4100, y: 6400, width: 140, kerbL: false, kerbR: false, speedLimit: 350 },
  { x: 3300, y: 7000, width: 145, kerbL: false, kerbR: false, speedLimit: 280 }, // Braking 150m T12
  { x: 2600, y: 7450, width: 145, kerbL: false, kerbR: false, speedLimit: 150 }, // Turn-in T12

  // Turn 12, 13, 14 (Final Triple Chicane)
  { x: 2150, y: 7550, width: 140, kerbL: true, kerbR: false, speedLimit: 85, apex: true }, // T12 Left
  { x: 2300, y: 7850, width: 140, kerbL: false, kerbR: true, speedLimit: 95, apex: true }, // T13 Right
  { x: 2550, y: 7820, width: 145, kerbL: true, kerbR: false, speedLimit: 120, apex: true }  // T14 Left
];

// ========================================================
// 3. BASE TRACK CLASS
// ========================================================

export class BaseTrack {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.shortName = config.shortName;
    this.country = config.country;
    this.flag = config.flag;
    this.flagCode = config.flagCode;
    this.lapRecord = config.lapRecord;
    this.recordDriver = config.recordDriver;
    this.lengthMeters = config.lengthMeters;
    this.turnsCount = config.turnsCount;
    this.startPointIndex = config.startPointIndex || 0;
    this.bounds = config.bounds || { minX: 1400, maxX: 12500, minY: 1800, maxY: 8500 };

    this.rawPoints = config.rawPoints;
    this.corners = config.corners || [];
    this.drsZones = config.drsZones || [];
    this.sectors = config.sectors || { s1End: 0.33, s2End: 0.66, s3End: 1.0 };
    this.gravelRanges = config.gravelRanges || [];

    this.sampledPoints = [];
    this.totalLength = 0;
    this.subdivisions = 1200;

    this.decorations = [];
    this.grandstands = [];
    this.sponsorBanners = [];
    this.pineTrees = [];
    this.brakeMarkers = [];

    this.initSpline();
    this.initDecorations(config.seed || 42);
  }

  initSpline() {
    const pts = this.rawPoints;
    const n = pts.length;

    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];

      const steps = Math.floor(this.subdivisions / n);
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const pos = this.catmullRom(p0, p1, p2, p3, t);

        const width = this.lerp(p1.width || 140, p2.width || 140, t);
        const kerbL = t < 0.5 ? p1.kerbL : p2.kerbL;
        const kerbR = t < 0.5 ? p1.kerbR : p2.kerbR;
        const targetSpeed = this.lerp(p1.speedLimit || 220, p2.speedLimit || 220, t);
        const elevation = this.lerp(p1.elevation || 0, p2.elevation || 0, t);

        this.sampledPoints.push({
          x: pos.x,
          y: pos.y,
          width,
          kerbL: !!kerbL,
          kerbR: !!kerbR,
          targetSpeed,
          elevation,
          dist: 0,
          tGlobal: 0
        });
      }
    }

    const totalPts = this.sampledPoints.length;
    let distAcc = 0;
    this.sampledPoints[0].dist = 0;

    for (let i = 0; i < totalPts; i++) {
      const curr = this.sampledPoints[i];
      const next = this.sampledPoints[(i + 1) % totalPts];
      const prev = this.sampledPoints[(i - 1 + totalPts) % totalPts];

      if (i > 0) {
        distAcc += Math.hypot(curr.x - prev.x, curr.y - prev.y);
        curr.dist = distAcc;
      }

      const tDx = next.x - prev.x;
      const tDy = next.y - prev.y;
      const tLen = Math.hypot(tDx, tDy) || 1;
      curr.tangentX = tDx / tLen;
      curr.tangentY = tDy / tLen;

      curr.normalX = -curr.tangentY;
      curr.normalY = curr.tangentX;

      const halfW = curr.width * 0.5;
      curr.leftX = curr.x + curr.normalX * halfW;
      curr.leftY = curr.y + curr.normalY * halfW;
      curr.rightX = curr.x - curr.normalX * halfW;
      curr.rightY = curr.y - curr.normalY * halfW;

      const kerbW = 20;
      curr.kerbLeftX = curr.x + curr.normalX * (halfW + kerbW);
      curr.kerbLeftY = curr.y + curr.normalY * (halfW + kerbW);
      curr.kerbRightX = curr.x - curr.normalX * (halfW + kerbW);
      curr.kerbRightY = curr.y - curr.normalY * (halfW + kerbW);

      const runoffW = halfW + 110;
      curr.runoffLeftX = curr.x + curr.normalX * runoffW;
      curr.runoffLeftY = curr.y + curr.normalY * runoffW;
      curr.runoffRightX = curr.x - curr.normalX * runoffW;
      curr.runoffRightY = curr.y - curr.normalY * runoffW;
    }

    const last = this.sampledPoints[totalPts - 1];
    const first = this.sampledPoints[0];
    this.totalLength = last.dist + Math.hypot(first.x - last.x, first.y - last.y);

    for (let i = 0; i < totalPts; i++) {
      this.sampledPoints[i].tGlobal = this.sampledPoints[i].dist / this.totalLength;
    }
  }

  catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;

    const v0 = (p2.x - p0.x) * 0.5;
    const v1 = (p3.x - p1.x) * 0.5;
    const x = (2 * p1.x - 2 * p2.x + v0 + v1) * t3 +
              (-3 * p1.x + 3 * p2.x - 2 * v0 - v1) * t2 +
              v0 * t + p1.x;

    const u0 = (p2.y - p0.y) * 0.5;
    const u1 = (p3.y - p1.y) * 0.5;
    const y = (2 * p1.y - 2 * p2.y + u0 + u1) * t3 +
              (-3 * p1.y + 3 * p2.y - 2 * u0 - u1) * t2 +
              u0 * t + p1.y;

    return { x, y };
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  getPointAtT(t) {
    const pts = this.sampledPoints;
    const n = pts.length;
    if (n === 0) return null;
    const normT = ((t % 1) + 1) % 1;
    let low = 0;
    let high = n - 1;
    let bestIdx = 0;
    let minDiff = Infinity;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const ptT = pts[mid].tGlobal;
      const diff = Math.abs(ptT - normT);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = mid;
      }
      if (ptT < normT) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return pts[bestIdx];
  }

  initDecorations(seed = 42) {
    let s = seed;
    const pseudoRand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    const greenPalettes = [
      { shade: "#123819", highlight: "#1e5927" },
      { shade: "#174420", highlight: "#246832" },
      { shade: "#0e2d14", highlight: "#194f24" },
      { shade: "#1c4a25", highlight: "#2c723a" },
      { shade: "#143a1e", highlight: "#225e30" }
    ];

    this.pineTrees = [];
    const b = this.bounds;
    for (let i = 0; i < 1400; i++) {
      const rx = b.minX - 300 + pseudoRand() * (b.maxX - b.minX + 600);
      const ry = b.minY - 300 + pseudoRand() * (b.maxY - b.minY + 600);
      const radius = 20 + pseudoRand() * 25;

      const cp = this.getClosestPoint(rx, ry);
      const distToCenter = Math.sqrt(cp.distSq);
      const minClearance = cp.point.width * 0.5 + 130 + radius;
      if (distToCenter < minClearance) {
        continue;
      }

      let onStand = false;
      for (const gs of (this.grandstands || [])) {
        const gsSize = Math.max(gs.length || 0, gs.width || 0);
        if (Math.hypot(rx - gs.x, ry - gs.y) < gsSize * 0.5 + radius + 40) {
          onStand = true;
          break;
        }
      }
      if (onStand) continue;

      const palette = greenPalettes[Math.floor(pseudoRand() * greenPalettes.length)];
      this.pineTrees.push({
        x: rx,
        y: ry,
        radius,
        shade: palette.shade,
        highlight: palette.highlight,
        color: palette.shade
      });
    }
  }

  getClosestPoint(x, y) {
    const pts = this.sampledPoints;
    const n = pts.length;
    let minDistSq = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < n; i += 8) {
      const pt = pts[i];
      const dx = pt.x - x;
      const dy = pt.y - y;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestIndex = i;
      }
    }

    const start = Math.max(0, closestIndex - 12);
    const end = Math.min(n, closestIndex + 12);
    for (let i = start; i < end; i++) {
      const pt = pts[i];
      const dx = pt.x - x;
      const dy = pt.y - y;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestIndex = i;
      }
    }

    const pt = pts[closestIndex];
    const vx = x - pt.x;
    const vy = y - pt.y;
    const lateralOffset = vx * pt.normalX + vy * pt.normalY;

    return {
      index: closestIndex,
      point: pt,
      t: pt.tGlobal,
      distanceToCenter: Math.abs(lateralOffset),
      lateralOffset,
      distSq: minDistSq
    };
  }

  getSurface(x, y) {
    const cp = this.getClosestPoint(x, y);
    const pt = cp.point;
    const halfWidth = pt.width * 0.5;
    const lat = Math.abs(cp.lateralOffset);

    if (lat <= halfWidth - 8) {
      return {
        type: "tarmac",
        name: "Asphalt",
        grip: 1.0,
        drag: 1.0,
        rumble: false,
        dust: false,
        onTrack: true,
        cp
      };
    } else if (lat <= halfWidth + 18) {
      const isKerb = (cp.lateralOffset > 0 && pt.kerbL) || (cp.lateralOffset < 0 && pt.kerbR);
      return {
        type: isKerb ? "kerb" : "runoff_tarmac",
        name: isKerb ? "Kerb" : "Run-off Tarmac",
        grip: isKerb ? 0.92 : 0.88,
        drag: 1.02,
        rumble: isKerb,
        dust: false,
        onTrack: true,
        cp
      };
    } else if (lat <= halfWidth + 70) {
      const isGravel = (this.gravelRanges || []).some(([start, end]) => cp.t >= start && cp.t <= end);
      if (isGravel) {
        return {
          type: "gravel",
          name: "Gravel Trap",
          grip: 0.38,
          drag: 3.2,
          rumble: true,
          dust: true,
          onTrack: false,
          cp
        };
      }
      return {
        type: "runoff",
        name: "Asphalt Run-off",
        grip: 0.78,
        drag: 1.08,
        rumble: false,
        dust: false,
        onTrack: false,
        cp
      };
    } else {
      return {
        type: "grass",
        name: "Grass",
        grip: 0.42,
        drag: 1.45,
        rumble: false,
        dust: true,
        onTrack: false,
        cp
      };
    }
  }

  isDrsAvailable(t) {
    for (const zone of this.drsZones) {
      if (zone.activationStartT > zone.activationEndT) {
        if (t >= zone.activationStartT || t <= zone.activationEndT) {
          return zone;
        }
      } else {
        if (t >= zone.activationStartT && t <= zone.activationEndT) {
          return zone;
        }
      }
    }
    return null;
  }

  getCurrentCorner(t) {
    for (const corner of this.corners) {
      if (Math.abs(corner.t - t) < 0.035) {
        return corner;
      }
    }
    return null;
  }
}

// ========================================================
// 4. CONCRETE TRACK IMPLEMENTATIONS
// ========================================================

export class SpaTrack extends BaseTrack {
  constructor() {
    super({
      id: "spa",
      name: "Circuit de Spa-Francorchamps",
      shortName: "Spa-Francorchamps",
      country: "Belgium",
      flag: "🇧🇪",
      flagCode: "SPA",
      lapRecord: "1:41.252",
      recordDriver: "L. Hamilton",
      lengthMeters: 7004,
      turnsCount: 20,
      startPointIndex: 1025, // Before Bus Stop chicane (2 turns before finish line)
      bounds: { minX: 1400, maxX: 10800, minY: 2000, maxY: 8400 },
      rawPoints: SPA_CONTROL_POINTS,
      corners: SPA_CORNERS,
      drsZones: SPA_DRS_ZONES,
      sectors: SPA_SECTORS,
      gravelRanges: [[0.03, 0.08], [0.31, 0.36], [0.93, 0.97]],
      seed: 42
    });

    this.setupSpaDecorations();
    this.initDecorations(42);
  }

  setupSpaDecorations() {
    const placeStand = (tGlobal, lateralOffset, length, width, name) => {
      const idx = Math.floor(tGlobal * (this.sampledPoints.length - 1));
      const pt = this.sampledPoints[idx];
      const gx = pt.x + pt.normalX * lateralOffset;
      const gy = pt.y + pt.normalY * lateralOffset;
      const angle = Math.atan2(pt.tangentY, pt.tangentX);
      return { x: gx, y: gy, length, width, angle, name };
    };

    this.grandstands.push(placeStand(0.022, 185, 340, 45, "Main Straight Grandstand"));
    this.grandstands.push(placeStand(0.022, -185, 420, 55, "Pit Lane Building & Garages"));
    this.grandstands.push(placeStand(0.145, -185, 320, 45, "Raidillon Grandstand"));
    this.grandstands.push(placeStand(0.55, 185, 340, 45, "Pouhon Grandstand"));
    this.grandstands.push(placeStand(0.94, -185, 280, 45, "Bus Stop Grandstand"));

    this.brakeMarkers = [
      { x: 3750, y: 2850, text: "150", side: "left" },
      { x: 3800, y: 2650, text: "100", side: "left" },
      { x: 3850, y: 2500, text: "50", side: "left" },
      { x: 9100, y: 7950, text: "150", side: "left" },
      { x: 9300, y: 8050, text: "100", side: "left" },
      { x: 9480, y: 8100, text: "50", side: "left" },
      { x: 10400, y: 6750, text: "100", side: "left" },
      { x: 10420, y: 6500, text: "50", side: "left" },
      { x: 1780, y: 4400, text: "150", side: "right" },
      { x: 1880, y: 4100, text: "100", side: "right" },
      { x: 1980, y: 3900, text: "50", side: "right" }
    ];
  }
}

export class IstanbulParkTrack extends BaseTrack {
  constructor() {
    super({
      id: "istanbul",
      name: "Intercity Istanbul Park",
      shortName: "Istanbul Park",
      country: "Turkey",
      flag: "🇹🇷",
      flagCode: "IST",
      lapRecord: "1:24.770",
      recordDriver: "J. Montoya",
      lengthMeters: 5338,
      turnsCount: 14,
      startPointIndex: 1025, // End of back straight approaching Turn 12-14 (2 turns before finish line)
      bounds: { minX: 2000, maxX: 12500, minY: 1900, maxY: 8000 },
      rawPoints: ISTANBUL_CONTROL_POINTS,
      corners: ISTANBUL_CORNERS,
      drsZones: ISTANBUL_DRS_ZONES,
      sectors: ISTANBUL_SECTORS,
      gravelRanges: [[0.17, 0.22], [0.46, 0.55], [0.67, 0.72], [0.95, 0.99]],
      seed: 88
    });

    this.setupIstanbulDecorations();
    this.initDecorations(88);
  }

  setupIstanbulDecorations() {
    const placeStand = (tGlobal, lateralOffset, length, width, name) => {
      const idx = Math.floor(tGlobal * (this.sampledPoints.length - 1));
      const pt = this.sampledPoints[idx];
      const gx = pt.x + pt.normalX * lateralOffset;
      const gy = pt.y + pt.normalY * lateralOffset;
      const angle = Math.atan2(pt.tangentY, pt.tangentX);
      return { x: gx, y: gy, length, width, angle, name };
    };

    this.grandstands.push(placeStand(0.04, -180, 480, 50, "Main Grandstand"));
    this.grandstands.push(placeStand(0.04, 180, 520, 55, "Pit Complex & Paddock"));
    this.grandstands.push(placeStand(0.18, -170, 280, 45, "Turn 1 Grandstand"));
    this.grandstands.push(placeStand(0.48, -190, 360, 45, "Turn 8 Grandstand A"));
    this.grandstands.push(placeStand(0.52, -190, 360, 45, "Turn 8 Grandstand B"));
    this.grandstands.push(placeStand(0.96, 180, 300, 45, "Turn 12 Grandstand"));

    this.brakeMarkers = [
      { x: 6700, y: 7700, text: "150", side: "left" },
      { x: 7000, y: 7700, text: "100", side: "left" },
      { x: 7300, y: 7700, text: "50", side: "left" },
      { x: 8100, y: 2150, text: "100", side: "left" },
      { x: 7700, y: 2150, text: "50", side: "left" },
      { x: 3300, y: 7000, text: "150", side: "right" },
      { x: 2900, y: 7250, text: "100", side: "right" },
      { x: 2500, y: 7400, text: "50", side: "right" }
    ];
  }
}

// Track dictionary
export const TRACK_CLASSES = {
  spa: SpaTrack,
  istanbul: IstanbulParkTrack
};
