"use client";

import { useEffect, useRef } from "react";
import { getSharedAudioContext, resumeSharedAudioContext } from "@/lib/audio";

/**
 * Animated pixel scene: dithered sky + Toronto skyline + Lake Ontario.
 *
 * Everything snaps to a fixed cell grid and animates in discrete steps so
 * motion reads as deliberate pixel art. Static layers (dithered sky bands,
 * shaded skyline) are pre-rendered to offscreen canvases; only dynamic
 * elements redraw each tick.
 *
 * Night: twinkling + sparkling stars, crater moon with pulsing halo, stepped
 * shooting stars, drifting satellite, plane with blinking beacon, flickering
 * building windows, CN Tower beacon, moonlight lane on the lake.
 * Day: pulsing sun with stepped halo, bobbing puffy clouds in two layers,
 * bird flocks, a hot-air balloon, sun glitter lane on the lake.
 *
 * Respects prefers-reduced-motion (single static frame).
 */

const CELL = 5; // css px per sky pixel
const TICK = 90; // ms per animation step (~11fps, intentionally chunky)
const SEED = 20260703;
const MOBILE_LAYOUT_MAX_WIDTH = 820;
const NAME_STAR_GLOW_EVENT = "xinge:name-star-glow";
const SUNRISE_SKYLINE_GLOW_EVENT = "xinge:sunrise-skyline-glow";
const SUNRISE_SKYLINE_GLOW_DURATION_MS = 1600;
const MIDNIGHT_WINDOW_FLASH_DURATION_MS = 320;
const MIDNIGHT_BUILDING_SLEEP_DURATION_MS = 2000;
const MIDNIGHT_FERRY_PAUSE_DURATION_MS = 1500;
const SLEEPY_Z_MAP = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 1, 1],
  [0, 0, 1, 1, 0],
  [0, 1, 1, 0, 0],
  [1, 1, 0, 0, 0],
  [1, 1, 1, 1, 1],
];
const SKYLINE_GLOW_FAR_OFFSETS = [
  [-4, 0], [4, 0], [0, -4], [0, 4],
  [-4, -4], [4, -4], [-4, 4], [4, 4],
];
const SKYLINE_GLOW_OUTER_OFFSETS = [
  [-2, 0], [2, 0], [0, -2], [0, 2],
  [-2, -2], [2, -2], [-2, 2], [2, 2],
];
const SKYLINE_GLOW_INNER_OFFSETS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];
const TOP_BAR_HEIGHT = 54;
const SKY_SAFE_TOP = Math.ceil(TOP_BAR_HEIGHT / CELL) + 4;
const AIR_TRAFFIC_STAGGER = 3; // 15 CSS px between successive entrances
const PLANE_SPRITE_SRC = "/background-plane.png";
const PLANE_WIDTH_CELLS = 12;
const PLANE_SPRITE_ASPECT = 192 / 74;
const PLANE_SMOKE = "#898f97";
const BALLOON_STEP_MS = 480;
const SUNRISE_SUN_JOURNEY_MS = 48000;
const MOON_PREVIEW_DURATION_MS = 4500;
const SYNODIC_MONTH_MS = 29.53059 * 24 * 60 * 60 * 1000;
// U.S. Naval Observatory: new moon on 2026-09-11 at 03:27 UTC.
const MOON_REFERENCE_NEW_MOON_UTC = Date.UTC(2026, 8, 11, 3, 27);
const TORONTO_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  year: "numeric",
  month: "long",
  day: "numeric",
});
const MOON_PHASE_NAMES = [
  "new moon",
  "waxing crescent",
  "first quarter",
  "waxing gibbous",
  "full moon",
  "waning gibbous",
  "last quarter",
  "waning crescent",
] as const;

/** Eight equal phase windows centered on the four primary lunar phases. */
function getMoonPhaseIndex(date = new Date()) {
  const lunations = (date.getTime() - MOON_REFERENCE_NEW_MOON_UTC) / SYNODIC_MONTH_MS;
  const cyclePosition = ((lunations % 1) + 1) % 1;
  return Math.floor(cyclePosition * MOON_PHASE_NAMES.length + 0.5) % MOON_PHASE_NAMES.length;
}

/* ── palettes ── */

const NIGHT = {
  bands: ["#02040a", "#03060f", "#040813", "#060b19", "#080f20", "#0a1327", "#0d182f", "#101d37"],
  starColors: ["#e9eff8", "#cfe2ff", "#ffe6ae", "#aecbeb", "#f8fbff"],
  far: "#0d1830",
  farLight: "#122040",
  nearShades: ["#050b18", "#060d1d", "#040914"],
  nearEdge: "#0f1d38",
  nearShadow: "#02050c",
  tower: "#3e4a5f",
  towerLit: "#5a6a82",
  dome: "#4a5464",
  domeLit: "#6b7688",
  domeSeam: "#39424f",
  stadiumBase: "#2b3442",
  window: "#ffd98c",
  waterBase: "#04101f",
  waterGlint: "#122946",
  moonLane: "#2a3f60",
  beacon: "#ff4d4d",
  moonBody: "#e8e0c8",
  moonShade: "#c4bca4",
  moonCrater: "#a89f87",
};

const DAY = {
  bands: ["#7db9ea", "#8ac1ee", "#98c9f1", "#a7d1f3", "#b6daf6", "#c5e2f8", "#d3eafa", "#e0f1fc"],
  far: "#8fb0cf",
  farLight: "#9fbeda",
  nearShades: ["#5f83a8", "#557a9f", "#6a8db1"],
  nearEdge: "#7fa0c0",
  nearShadow: "#496c92",
  tower: "#a8b0ba",
  towerLit: "#c6ccd4",
  dome: "#b3bac3",
  domeLit: "#d2d7dd",
  domeSeam: "#949ca7",
  stadiumBase: "#7e8894",
  window: "#d7e6f2",
  waterBase: "#6fadde",
  waterGlint: "#c9e6f9",
  sunLane: "#ffe9b0",
  sunCore: "#ffd24a",
  sunCoreHot: "#fff0a8",
  sunRim: "#f0ae2e",
  sunRay: "#ffe79a",
  cloudBackHi: "#f4f9fd",
  cloudBack: "#dfecf7",
  cloudBackMid: "#d0e2f0",
  cloudBackShade: "#c3d8ea",
  cloudFrontHi: "#ffffff",
  cloudFront: "#f2f8fd",
  cloudFrontMid: "#e2eef8",
  cloudShade: "#c9def0",
  bird: "#27476b",
  birdWing: "#3a5d84",
  balloonA: "#e2584d",
  balloonB: "#f2ede4",
  basket: "#7a5a3a",
  rope: "#54402c",
  planeBody: "#f6fafd",
  planeTail: "#b9c9d8",
};

const TWILIGHT = {
  bands: ["#ffe58a", "#ffc266", "#f59b6f", "#ef7f7d", "#e98796", "#e58fac", "#dd96c0", "#ca8bcb", "#ad78c7"],
  far: "#8e7197",
  farLight: "#bd8fae",
  nearShades: ["#493650", "#56405b", "#624764"],
  nearEdge: "#94657d",
  nearShadow: "#33273e",
  tower: "#82677e",
  towerLit: "#c18aa0",
  dome: "#765d76",
  domeLit: "#bd8ba3",
  domeSeam: "#5c485f",
  stadiumBase: "#4d3d52",
  window: "#ffd889",
  waterBase: "#846087",
  waterGlint: "#f2a18e",
  sunLane: "#ffe0a0",
  sunCore: "#ffb24f",
  sunCoreHot: "#ffe1a3",
  sunRim: "#e66b4f",
  sunRay: "#ffbd70",
  cloudBackHi: "#ffe0bf",
  cloudBack: "#e7a2b0",
  cloudBackMid: "#cf89aa",
  cloudBackShade: "#a86f96",
  cloudFrontHi: "#fff2cf",
  cloudFront: "#ffcaa9",
  cloudFrontMid: "#ed9fa9",
  cloudShade: "#bd7899",
  bird: "#372644",
  birdWing: "#563653",
  balloonA: "#e85f56",
  balloonB: "#ffffff",
  basket: "#654032",
  rope: "#4a2e2a",
  planeBody: "#ffe2c2",
  planeTail: "#d38b82",
};

/* ── bitmaps ── */

/** Moon disc at 1× cell scale (all pixels uniform): 1 body / 2 bright rim / 3 crater. */
function makeMoonMap(): number[][] {
  const n = 15;
  const cR = (n - 1) / 2;
  const map: number[][] = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => {
      const d = Math.hypot(r - cR, c - cR);
      if (d > cR + 0.4) return 0;
      if (d > cR - 0.9) return 2;
      return 1;
    })
  );
  for (const [r, c] of [[4, 6], [5, 9], [7, 5], [8, 10], [10, 6], [9, 8]] as const) map[r][c] = 3;
  return map;
}

/** Sun disc at 1× cell scale, no rays: 1 body / 3 hot core / 4 deep-gold rim. */
function makeSunMap(): number[][] {
  const n = 17;
  const cR = (n - 1) / 2;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => {
      const d = Math.hypot(r - cR, c - cR);
      if (d > cR + 0.4) return 0;
      if (d > cR - 1.2) return 4;
      if (d <= 3.2) return 3;
      return 1;
    })
  );
}

const MOON_MAP = makeMoonMap();
const SUN_MAP = makeSunMap();

// hot-air balloon: 1 stripe A / 2 stripe B / 3 basket / 4 ropes
const BALLOON: number[][] = [
  [0, 0, 1, 2, 1, 0, 0],
  [0, 1, 2, 1, 2, 1, 0],
  [1, 2, 1, 2, 1, 2, 1],
  [1, 1, 2, 1, 2, 1, 1],
  [1, 2, 1, 2, 1, 2, 1],
  [0, 1, 2, 1, 2, 1, 0],
  [0, 0, 1, 2, 1, 0, 0],
  [0, 0, 4, 0, 4, 0, 0],
  [0, 0, 3, 3, 3, 0, 0],
];

// Toronto Island-style ferry: 1 hull / 2 stripe / 3 cabin / 4 windows /
// 5 flag + funnel / 6 dark keel.
const FERRY = [
  "00000000000000500000000",
  "00000000000005500000000",
  "00003333333333333330000",
  "00034434434434434430000",
  "00333333333333333333000",
  "02222222222222222222200",
  "11111111111111111111110",
  "06666666666666666666600",
].map((row) => Array.from(row, Number));

/* ── types ── */

type Star = { x: number; y: number; big: boolean; level: number; every: number; acc: number; color: string };
type Sparkle = { x: number; y: number; ttl: number; color: string };
type Cloud = { x: number; y: number; bob: number; map: number[][]; every: number; acc: number; bobEvery: number; bobAcc: number; front: boolean };
type FlockKind = "three" | "five";
type Flock = {
  kind: FlockKind;
  x: number;
  y: number;
  frame: number;
  acc: number;
  scatterElapsed: number | null;
};
type FerrySplash = { x: number; y: number; vx: number; vy: number; ttl: number; maxTtl: number };
type Balloon = {
  x: number;
  y: number;
  sway: number;
  bob: number;
  acc: number;
  yAcc: number;
  jiggleElapsed: number | null;
  trafficOffset: number;
  trafficYOffset: number;
};
type Ferry = { x: number; acc: number; bob: number; bobAcc: number; boostRemaining: number; frame: number };
type Plane = { x: number; y: number; acc: number; boostRemaining: number };
type PlaneSmoke = { x: number; y: number; ttl: number; maxTtl: number; size: number };
type Building = {
  x: number; w: number; h: number; near: boolean; shade: number; antenna: number;
  roof: "flat" | "tank" | "ac"; setback: number; windows: { wx: number; wy: number }[];
};
type SleepyZ = {
  delay: number;
  direction: -1 | 1;
  drift: number;
  ferryOffsetX?: number;
  trailLength: 1 | 3;
  x: number;
  y: number;
};
type Trail = { x: number; y: number }[];
type SkyPhase = "day" | "twilight" | "night";

function getSkyPhase(now = new Date()): SkyPhase {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes >= 8 * 60 + 30 && minutes <= 16 * 60 + 30) return "day";
  if (minutes >= 16 * 60 + 31 && minutes <= 23 * 60 + 30) return "twilight";
  if (minutes >= 23 * 60 + 31 || minutes <= 3 * 60 + 30) return "night";
  return "twilight";
}

const BIRD_FORMATIONS = {
  three: [[0, 0], [-6, -3], [-6, 3]],
  five: [[0, 0], [-6, -3], [-6, 3], [-12, -6], [-12, 6]],
} as const;
const BIRD_SCATTERED = {
  three: [[8, -7], [-12, -9], [-9, 4]],
  five: [[8, -4], [-12, -6], [-9, 9], [-23, -7], [-19, 14]],
} as const;
const BIRD_JIGGLE = [
  [[-1, -1], [1, 0], [0, 1], [-1, 0], [1, 1]],
  [[1, 0], [-1, 1], [1, -1], [0, 1], [-1, -1]],
  [[0, 1], [1, -1], [-1, 0], [1, 1], [0, -1]],
  [[1, -1], [0, 1], [-1, 1], [1, 0], [-1, 0]],
] as const;
const BALLOON_SCALE = 1;

/* ── seeded rng ── */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hand-drawn cloud silhouettes (from reference art). X = cloud, . = sky. */
const CLOUD_SHAPES: string[][] = [
  [
    // wide flat-bottomed cloud with a stepped center dome
    "........XXXXXX........",
    "....XXXXXXXXXXXX......",
    "..XXXXXXXXXXXXXXXX....",
    ".XXXXXXXXXXXXXXXXXXXX.",
    "XXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXX",
  ],
  [
    // classic two-hump cloud: big left dome, smaller right dome
    "......XXXXXX................",
    "....XXXXXXXXXX....XXXXX.....",
    "...XXXXXXXXXXXX..XXXXXXX....",
    "..XXXXXXXXXXXXXXXXXXXXXXX...",
    ".XXXXXXXXXXXXXXXXXXXXXXXXXX.",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  ],
  [
    // long low stratus with gentle bumps
    "..........XXXXXX....XXXX.......",
    "....XXXXXXXXXXXXXXXXXXXXXX.....",
    ".XXXXXXXXXXXXXXXXXXXXXXXXXXXX..",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.",
  ],
  [
    // three-bump cumulus
    ".....XXXX....XXX........",
    "...XXXXXXXX.XXXXX..XXX..",
    ".XXXXXXXXXXXXXXXXXXXXXX.",
    "XXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXX",
    "XXXXXXXXXXXXXXXXXXXXXXXX",
  ],
];

/** Parse a silhouette, optionally mirror it, then apply the shading pass:
 *  3 = sunlit top, 1 = body, 4 = mid-tone edges, 2 = shaded underside. */
function makeCloud(shape: string[], mirror: boolean): number[][] {
  const h = shape.length + 1;
  const w = shape[0].length;
  const grid: number[][] = Array.from({ length: h }, (_, r) =>
    Array.from({ length: w }, (_, c) => {
      if (r >= shape.length) return 0;
      const col = mirror ? w - 1 - c : c;
      return shape[r][col] === "X" ? 1 : 0;
    })
  );
  // shaded underside row beneath the base
  for (let c = 1; c < w - 1; c++) {
    if (grid[h - 2][c]) grid[h - 1][c] = 2;
  }
  // sunlit highlight: topmost cell of each column
  for (let c = 0; c < w; c++) {
    for (let r = 0; r < h; r++) {
      if (grid[r][c] === 1) {
        grid[r][c] = 3;
        break;
      }
      if (grid[r][c]) break;
    }
  }
  // mid-tone shading: body cells against the underside or open edges
  for (let c = 0; c < w; c++) {
    for (let r = 0; r < h; r++) {
      if (grid[r][c] !== 1) continue;
      const below = r + 1 < h ? grid[r + 1][c] : 0;
      const left = c > 0 ? grid[r][c - 1] : 0;
      const right = c + 1 < w ? grid[r][c + 1] : 0;
      if (below === 2 || left === 0 || right === 0) grid[r][c] = 4;
    }
  }
  return grid;
}

export default function Background() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let last = 0;
    let cols = 0;
    let rows = 0;
    let waterTop = 0;
    let stars: Star[] = [];
    let sparkles: Sparkle[] = [];
    let sparkleAcc = 0;
    let nameStarGlowActive = false;
    let sunriseSkylineGlowRemaining = 0;
    let sunriseSkylineGlowResetTimer = 0;
    let midnightBuildingEffectElapsed = -1;
    let midnightBuildingSleepTimer = 0;
    let midnightBuildingResetTimer = 0;
    let sleepyZs: SleepyZ[] = [];
    let clouds: Cloud[] = [];
    let buildings: Building[] = [];
    let litWindows = new Set<string>();
    let glints: { x: number; y: number }[] = [];
    let flocks: Flock[] = [];
    const flockWait: Record<FlockKind, number> = { three: 0, five: 650 };
    let plane: Plane | null = null;
    let planeSmoke: PlaneSmoke[] = [];
    let planeSmokeAcc = 0;
    let planeWait = 8000 + Math.random() * 10000;
    let sunriseOpeningPlanePending = true;
    let sunriseOpeningPlaneWait = 0;
    let satellite: { x: number; y: number; acc: number } | null = null;
    let satWait = 6000 + Math.random() * 8000;
    let balloon: Balloon | null = null;
    let balloonWait = 1300;
    let ferry: Ferry | null = null;
    let ferryPauseRemaining = 0;
    let ferrySplashes: FerrySplash[] = [];
    let ferrySplashAcc = 0;
    let shooting: { cells: Trail; acc: number } | null = null;
    let shootWait = 3000 + Math.random() * 5000;
    let windowAcc = 0;
    let glintAcc = 0;
    let waveAcc = 0;
    let wavePhase = 0;
    let pulseAcc = 0;
    let pulse = 0; // 0..3 shared pulse phase for sun/moon halos
    let sunriseSunJourneyElapsed = 0;
    let moonPhasePreviewIndex: number | null = null;
    let moonPhasePreviewTimer = 0;
    let beaconAcc = 0;
    let beaconOn = true;
    let skyNight: HTMLCanvasElement | null = null;
    let skyDay: HTMLCanvasElement | null = null;
    let skyTwilight: HTMLCanvasElement | null = null;
    let skylineNight: HTMLCanvasElement | null = null;
    let skylineDay: HTMLCanvasElement | null = null;
    let skylineTwilight: HTMLCanvasElement | null = null;
    let skylineTwilightGlow: HTMLCanvasElement | null = null;
    let activePhase: SkyPhase | null = null;
    let scheduledPhase = getSkyPhase();
    let sunriseBannerTopCell = 0;
    let sunriseBannerMeasured = false;
    const planeSprite = new window.Image();
    let planeSpriteReady = false;
    const onPlaneSpriteLoad = () => {
      planeSpriteReady = true;
      if (reduced) drawCurrentScene(0);
    };
    planeSprite.addEventListener("load", onPlaneSpriteLoad);
    planeSprite.decoding = "async";
    planeSprite.src = PLANE_SPRITE_SRC;

    function getSkyOverride(): SkyPhase | null {
      const override = document.documentElement.dataset.skyOverride;
      return override === "day" || override === "twilight" || override === "night" ? override : null;
    }

    function getVisibleSkyPhase() {
      return getSkyOverride() ?? getSkyPhase();
    }

    const onNameStarGlow = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      nameStarGlowActive = event.detail === true;
      if (activePhase === "night") drawCurrentScene(0);
    };

    const onSunriseSkylineGlow = () => {
      if (getVisibleSkyPhase() !== "twilight") return;
      sunriseSkylineGlowRemaining = SUNRISE_SKYLINE_GLOW_DURATION_MS;
      drawCurrentScene(reduced ? TICK : 0);

      if (reduced) {
        window.clearTimeout(sunriseSkylineGlowResetTimer);
        sunriseSkylineGlowResetTimer = window.setTimeout(() => {
          sunriseSkylineGlowRemaining = 0;
          drawCurrentScene(0);
        }, SUNRISE_SKYLINE_GLOW_DURATION_MS);
      }
    };

    const startMidnightBuildingSleep = () => {
      if (getVisibleSkyPhase() !== "night") return;
      window.clearTimeout(midnightBuildingSleepTimer);
      window.clearTimeout(midnightBuildingResetTimer);
      midnightBuildingEffectElapsed = 0;
      ferryPauseRemaining = MIDNIGHT_FERRY_PAUSE_DURATION_MS;
      sleepyZs = createSleepyZs();
      drawCurrentScene(reduced ? TICK : 0);
      playBuildingSnore();

      if (reduced) {
        midnightBuildingSleepTimer = window.setTimeout(() => {
          midnightBuildingEffectElapsed = MIDNIGHT_WINDOW_FLASH_DURATION_MS;
          drawCurrentScene(0);
        }, MIDNIGHT_WINDOW_FLASH_DURATION_MS);
        midnightBuildingResetTimer = window.setTimeout(() => {
          midnightBuildingEffectElapsed = -1;
          drawCurrentScene(0);
        }, MIDNIGHT_WINDOW_FLASH_DURATION_MS + MIDNIGHT_BUILDING_SLEEP_DURATION_MS);
      }
    };

    function getAudioContext() {
      return resumeSharedAudioContext(getSharedAudioContext());
    }

    function playBuildingSnore() {
      const audio = getAudioContext();
      if (!audio) return;
      const start = audio.currentTime + MIDNIGHT_WINDOW_FLASH_DURATION_MS / 1000;

      [0, 0.47].forEach((offset, index) => {
        const snoreAt = start + offset;
        const oscillator = audio.createOscillator();
        const filter = audio.createBiquadFilter();
        const volume = audio.createGain();
        const vibrato = audio.createOscillator();
        const vibratoDepth = audio.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(220 - index * 24, snoreAt);
        oscillator.frequency.exponentialRampToValueAtTime(145 - index * 10, snoreAt + 0.36);
        vibrato.type = "sine";
        vibrato.frequency.setValueAtTime(7.5, snoreAt);
        vibratoDepth.gain.setValueAtTime(5, snoreAt);
        vibrato.connect(vibratoDepth).connect(oscillator.frequency);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(680, snoreAt);
        filter.frequency.exponentialRampToValueAtTime(360, snoreAt + 0.4);
        volume.gain.setValueAtTime(0.0001, snoreAt);
        volume.gain.exponentialRampToValueAtTime(0.022, snoreAt + 0.06);
        volume.gain.setValueAtTime(0.016, snoreAt + 0.23);
        volume.gain.exponentialRampToValueAtTime(0.0001, snoreAt + 0.42);
        oscillator.connect(filter).connect(volume).connect(audio.destination);
        vibrato.start(snoreAt);
        oscillator.start(snoreAt);
        vibrato.stop(snoreAt + 0.44);
        oscillator.stop(snoreAt + 0.44);
      });
    }

    function playChirp() {
      const audio = getAudioContext();
      if (!audio) return;
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      const now = audio.currentTime;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(900, now);
      oscillator.frequency.exponentialRampToValueAtTime(1800, now + 0.09);
      oscillator.frequency.exponentialRampToValueAtTime(720, now + 0.24);
      volume.gain.setValueAtTime(0.0001, now);
      volume.gain.exponentialRampToValueAtTime(0.075, now + 0.025);
      volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      oscillator.connect(volume).connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.26);
    }

    function playBalloonJiggle() {
      const audio = getAudioContext();
      if (!audio) return;
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      const now = audio.currentTime;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(420, now);
      oscillator.frequency.exponentialRampToValueAtTime(690, now + 0.08);
      oscillator.frequency.exponentialRampToValueAtTime(380, now + 0.16);
      oscillator.frequency.exponentialRampToValueAtTime(610, now + 0.24);
      oscillator.frequency.exponentialRampToValueAtTime(330, now + 0.34);
      volume.gain.setValueAtTime(0.0001, now);
      volume.gain.exponentialRampToValueAtTime(0.065, now + 0.025);
      volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      oscillator.connect(volume).connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.38);
    }

    function playPlaneFlyby() {
      const audio = getAudioContext();
      if (!audio) return;
      const now = audio.currentTime;
      const master = audio.createGain();
      const engineFilter = audio.createBiquadFilter();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.058, now + 0.035);
      master.gain.exponentialRampToValueAtTime(0.048, now + 0.58);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 1.08);
      engineFilter.type = "bandpass";
      engineFilter.frequency.setValueAtTime(1400, now);
      engineFilter.frequency.exponentialRampToValueAtTime(4600, now + 0.72);
      engineFilter.frequency.exponentialRampToValueAtTime(3000, now + 1.08);
      engineFilter.Q.setValueAtTime(0.8, now);
      engineFilter.connect(master).connect(audio.destination);

      for (const [type, start, peak, end] of [
        ["triangle", 320, 1100, 920],
        ["sine", 640, 2200, 1760],
      ] as const) {
        const oscillator = audio.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(start, now);
        oscillator.frequency.exponentialRampToValueAtTime(peak, now + 0.72);
        oscillator.frequency.exponentialRampToValueAtTime(end, now + 1.08);
        oscillator.connect(engineFilter);
        oscillator.start(now);
        oscillator.stop(now + 1.1);
      }

      const noise = audio.createBufferSource();
      const noiseFilter = audio.createBiquadFilter();
      const noiseVolume = audio.createGain();
      const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 1.08), audio.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = Math.random() * 2 - 1;
      }
      noise.buffer = buffer;
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(2300, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(6800, now + 0.72);
      noiseFilter.frequency.exponentialRampToValueAtTime(4200, now + 1.08);
      noiseFilter.Q.setValueAtTime(0.55, now);
      noiseVolume.gain.setValueAtTime(0.0001, now);
      noiseVolume.gain.exponentialRampToValueAtTime(0.034, now + 0.045);
      noiseVolume.gain.exponentialRampToValueAtTime(0.0001, now + 1.06);
      noise.connect(noiseFilter).connect(noiseVolume).connect(audio.destination);
      noise.start(now);
      noise.stop(now + 1.08);
    }

    function playFerryHorn() {
      const audio = getAudioContext();
      if (!audio) return;
      const master = audio.createGain();
      const now = audio.currentTime;
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.085, now + 0.045);
      master.gain.setValueAtTime(0.085, now + 0.42);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.92);
      master.connect(audio.destination);

      for (const [frequency, detune] of [[146.8, -5], [220, 4]] as const) {
        const oscillator = audio.createOscillator();
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.94, now + 0.78);
        oscillator.detune.setValueAtTime(detune, now);
        oscillator.connect(master);
        oscillator.start(now);
        oscillator.stop(now + 0.94);
      }
    }

    function clickedBird(clientX: number, clientY: number) {
      if (getVisibleSkyPhase() === "night") return null;
      const x = clientX / CELL;
      const y = clientY / CELL;
      for (const flock of flocks) {
        const hit = birdOffsets(flock).some(([dx, dy]) => {
          const bx = flock.x + dx;
          const by = flock.y + dy;
          return x >= bx - 4 && x <= bx + 4 && y >= by - 2 && y <= by + 3;
        });
        if (hit) return flock;
      }
      return null;
    }

    function clickedBalloon(clientX: number, clientY: number) {
      if (getVisibleSkyPhase() === "night" || !balloon) return false;
      const x = clientX / CELL;
      const y = clientY / CELL;
      const jiggle = balloonJiggleOffset();
      const traffic = balloonTrafficOffset();
      if (!traffic.visible) return false;
      const balloonX = balloon.x + balloon.sway + jiggle.x + traffic.x;
      const balloonY = balloon.y + balloon.bob + jiggle.y + traffic.y;
      return x >= balloonX && x <= balloonX + BALLOON[0].length * BALLOON_SCALE &&
        y >= balloonY && y <= balloonY + BALLOON.length * BALLOON_SCALE;
    }

    function clickedFerry(clientX: number, clientY: number) {
      if (!ferry) return false;
      const x = clientX / CELL;
      const y = clientY / CELL;
      const ferryY = waterTop - 5 + ferry.bob;
      return x >= ferry.x && x <= ferry.x + FERRY[0].length &&
        y >= ferryY && y <= ferryY + FERRY.length;
    }

    function clickedBuilding(clientX: number, clientY: number) {
      if (getVisibleSkyPhase() !== "night") return false;
      const x = clientX / CELL;
      const y = clientY / CELL;
      return buildings.some((building) => (
        x >= building.x &&
        x <= building.x + building.w &&
        y >= waterTop - building.h - building.antenna &&
        y <= waterTop
      ));
    }

    function clickedPlane(clientX: number, clientY: number) {
      if (!plane) return false;
      const x = clientX / CELL;
      const y = clientY / CELL;
      const halfHeight = PLANE_WIDTH_CELLS / PLANE_SPRITE_ASPECT / 2;
      return x >= plane.x && x <= plane.x + PLANE_WIDTH_CELLS &&
        y >= plane.y - halfHeight && y <= plane.y + halfHeight;
    }

    function moonPosition() {
      const moonWidth = MOON_MAP[0].length;
      return {
        x: Math.round(cols * 0.82 - moonWidth / 2),
        y: Math.max(SKY_SAFE_TOP + 4, Math.floor(rows * 0.1)),
      };
    }

    function clickedMoon(clientX: number, clientY: number) {
      if (getVisibleSkyPhase() !== "night") return false;
      const x = clientX / CELL;
      const y = clientY / CELL;
      const moon = moonPosition();
      const padding = 4;
      return x >= moon.x - padding && x <= moon.x + MOON_MAP[0].length + padding &&
        y >= moon.y - padding && y <= moon.y + MOON_MAP.length + padding;
    }

    function moonOccludesStarCell(x: number, y: number) {
      const moon = moonPosition();
      const row = Math.round(y - moon.y);
      const col = Math.round(x - moon.x);
      return row >= 0 && row < MOON_MAP.length &&
        col >= 0 && col < MOON_MAP[row].length && MOON_MAP[row][col] !== 0;
    }

    function starCell(x: number, y: number, color: string, alpha = 1) {
      if (!moonOccludesStarCell(x, y)) cell(x, y, color, alpha);
    }

    function birdOffsets(flock: Flock): readonly (readonly [number, number])[] {
      const formation = BIRD_FORMATIONS[flock.kind];
      if (flock.scatterElapsed === null || flock.scatterElapsed >= 960) {
        return formation;
      }

      const elapsed = flock.scatterElapsed;
      const amount = elapsed < 120 || elapsed >= 840
        ? 0.33
        : elapsed < 240 || elapsed >= 720
          ? 0.66
          : 1;
      const jiggleFrame = BIRD_JIGGLE[Math.floor(elapsed / TICK) % BIRD_JIGGLE.length];
      return formation.map(([baseX, baseY], index) => {
        const [scatterX, scatterY] = BIRD_SCATTERED[flock.kind][index];
        const [jiggleX, jiggleY] = amount === 1 ? jiggleFrame[index] : [0, 0];
        return [
          Math.round(baseX + (scatterX - baseX) * amount) + jiggleX,
          Math.round(baseY + (scatterY - baseY) * amount) + jiggleY,
        ] as const;
      });
    }

    function balloonJiggleOffset() {
      if (!balloon || balloon.jiggleElapsed === null) return { x: 0, y: 0 };
      const elapsed = balloon.jiggleElapsed;
      if (elapsed < 120) return { x: -1, y: 0 };
      if (elapsed < 240) return { x: 1, y: -2 };
      if (elapsed < 360) return { x: -1, y: -4 };
      if (elapsed < 480) return { x: 1, y: -2 };
      if (elapsed < 620) return { x: -1, y: 1 };
      if (elapsed < 760) return { x: 1, y: 3 };
      if (elapsed < 900) return { x: -1, y: 1 };
      return { x: 0, y: 0 };
    }

    function balloonTrafficOffset() {
      if (!balloon) return { visible: false, x: 0, y: 0 };
      const birdBounds = flocks.flatMap((flock) =>
        birdOffsets(flock).map(([dx, dy]) => ({
          left: flock.x + dx - 5,
          right: flock.x + dx + 5,
          top: flock.y + dy - 4,
          bottom: flock.y + dy + 5,
        })),
      );
      const jiggle = balloonJiggleOffset();
      const baseX = balloon.x + balloon.sway + jiggle.x;
      const baseY = balloon.y + balloon.bob + jiggle.y;
      const xCandidates = [...new Set([balloon.trafficOffset, 0, -4, 4, -8, 8, -12, 12])];
      const maxBalloonY = (sunriseBannerTopCell || waterTop) - BALLOON.length - 3;
      const yCandidates = [...new Set([balloon.trafficYOffset, 0])];
      for (let distance = 4; distance <= Math.max(24, rows); distance += 4) {
        yCandidates.push(-distance, distance);
      }

      for (const yOffset of yCandidates) {
        const top = baseY + yOffset;
        const bottom = top + BALLOON.length - 1;
        if (top < SKY_SAFE_TOP + 1 || bottom > maxBalloonY) continue;

        for (const xOffset of xCandidates) {
          const left = baseX + xOffset;
          const right = left + BALLOON[0].length - 1;
          const intersects = birdBounds.some((bounds) =>
            left <= bounds.right && right >= bounds.left && top <= bounds.bottom && bottom >= bounds.top,
          );
          if (intersects) continue;

          balloon.trafficOffset = xOffset;
          balloon.trafficYOffset = yOffset;
          return { visible: true, x: xOffset, y: yOffset };
        }
      }

      return { visible: false, x: balloon.trafficOffset, y: balloon.trafficYOffset };
    }

    // Sunrise traffic is vertically stacked above the banner. The lower
    // flock keeps enough headroom for its full click-dispersion range.
    const airplaneLaneY = () => Math.max(SKY_SAFE_TOP + 1, Math.floor(rows * 0.1));
    const birdLaneY = (kind: FlockKind) => {
      const defaultThreeBirdLane = Math.max(airplaneLaneY() + 12, Math.floor(rows * 0.18));
      if (sunriseBannerTopCell) {
        const fiveBirdLane = sunriseBannerTopCell - 19;
        const threeBirdLane = Math.max(
          SKY_SAFE_TOP + 5,
          Math.min(defaultThreeBirdLane, fiveBirdLane - 9),
        );
        return kind === "three" ? threeBirdLane : fiveBirdLane;
      }

      return kind === "three"
        ? defaultThreeBirdLane
        : Math.max(defaultThreeBirdLane + 40, Math.floor(rows * 0.39));
    };
    const balloonLaneY = () => Math.round(
      (birdLaneY("three") + birdLaneY("five") - BALLOON.length * BALLOON_SCALE) / 2,
    );
    const cnTowerX = () => Math.floor(cols * 0.22);
    const towerDims = () => {
      const h = Math.min(Math.floor(rows * 0.46), 64);
      // main pod sits ~62% up the tower, like the real thing
      return { tx: cnTowerX(), h, top: waterTop - h, podY: waterTop - Math.floor(h * 0.62) };
    };
    // low-rise zone around the landmarks so they stand against open sky
    const landmarkZone = () => ({ from: cnTowerX() - 12, to: cnTowerX() + 46 });

    /* ── static layers ── */

    function measureSunriseAirTrafficLanes() {
      const sunriseBanner = document.querySelector<HTMLElement>(".hero-plane-banner");
      if (!sunriseBanner) {
        sunriseBannerTopCell = 0;
        sunriseBannerMeasured = false;
        return;
      }

      sunriseBannerTopCell = Math.floor(sunriseBanner.getBoundingClientRect().top / CELL);
      sunriseBannerMeasured = true;
      for (const flock of flocks) flock.y = birdLaneY(flock.kind);
      if (balloon) balloon.y = balloonLaneY();
    }

    /** Sky gradient rendered as full noise-dither: no visible band edges,
     *  every row is a probabilistic blend of its two nearest band colors. */
    function renderSky(bands: string[], bottomUp = false) {
      const off = document.createElement("canvas");
      off.width = canvas!.width;
      off.height = canvas!.height;
      const o = off.getContext("2d")!;
      const rng = mulberry32(SEED ^ 0x51ed270b);
      const segs = bands.length - 1;
      const maxY = Math.max(1, rows - 1);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const progress = bottomUp
            ? Math.min(0.9999, 1 - y / maxY)
            : Math.min(0.9999, y / maxY);
          const f = progress * segs;
          const i = Math.floor(f);
          const frac = f - i;
          o.fillStyle = rng() < frac ? bands[i + 1] : bands[i];
          o.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
      return off;
    }

    function buildSkyline() {
      const rng = mulberry32(SEED);
      buildings = [];

      let x = -2; // far layer: continuous low-rise band
      while (x < cols + 2) {
        const w = 4 + Math.floor(rng() * 6);
        const h = 5 + Math.floor(rng() * 8);
        buildings.push({ x, w, h, near: false, shade: 0, antenna: 0, roof: "flat", setback: 0, windows: [] });
        x += w + (rng() > 0.7 ? 1 : 0);
      }

      x = -1; // near layer: taller towers, denser downtown around the CN Tower
      const zone = landmarkZone();
      while (x < cols + 2) {
        const downtown = Math.abs(x - cnTowerX()) < cols * 0.22;
        const w = 5 + Math.floor(rng() * 8);
        const inZone = x + w > zone.from && x < zone.to;
        let h = downtown ? 13 + Math.floor(rng() * 21) : 7 + Math.floor(rng() * 12);
        if (inZone) h = Math.min(h, 6); // keep the landmarks silhouetted against sky
        const antenna = !inZone && rng() > 0.72 ? 2 + Math.floor(rng() * 4) : 0;
        const roof: Building["roof"] = antenna ? "flat" : rng() > 0.6 ? (rng() > 0.5 ? "tank" : "ac") : "flat";
        // art-deco style setback: taller towers step in as they rise
        const setback = !inZone && h > 12 && w >= 7 && rng() > 0.55 ? 3 + Math.floor(rng() * 4) : 0;
        const windows: { wx: number; wy: number }[] = [];
        for (let wx = 1; wx < w - 1; wx += 2) {
          for (let wy = 2; wy < h - 1; wy += 3) windows.push({ wx, wy });
        }
        buildings.push({ x, w, h, near: true, shade: Math.floor(rng() * 3), antenna, roof, setback, windows });
        x += w + Math.floor(rng() * 3);
      }

      litWindows = new Set();
      for (const b of buildings) {
        if (!b.near) continue;
        for (let i = 0; i < b.windows.length; i++) {
          if (rng() < 0.4) litWindows.add(`${b.x}:${i}`);
        }
      }

      skylineNight = renderSkyline(NIGHT, null);
      skylineDay = renderSkyline(DAY, DAY.window);
      skylineTwilight = renderSkyline(TWILIGHT, null);
      skylineTwilightGlow = renderSkylineGlowMask(skylineTwilight);
    }

    function createSleepyZs(): SleepyZ[] {
      const towerX = cnTowerX();
      const rogersCentreRight = towerX + 8 + 30;
      const candidates = buildings
        .filter((building) => {
          if (!building.near || building.windows.length === 0) return false;
          const sourceX = building.x + Math.floor(building.w / 2);
          return sourceX < towerX - 5 || sourceX > rogersCentreRight;
        })
        .sort((a, b) => a.x - b.x);
      const buildingZs: SleepyZ[] = candidates
        .filter((_, index) => index % 2 === 0)
        .map((building, index) => {
          const sourceX = building.x + Math.floor(building.w / 2);
          const sourceY = waterTop - building.h - building.antenna - 3;
          return {
            delay: (index * 47) % 360,
            direction: 1,
            drift: (index % 3) - 1,
            trailLength: 1,
            x: sourceX - 1,
            y: sourceY,
          };
        });

      const ferryZs: SleepyZ[] = ferry ? [
        {
          delay: 80,
          direction: 1,
          drift: -1,
          ferryOffsetX: 4,
          trailLength: 1,
          x: ferry.x + 4,
          y: waterTop - 8 + ferry.bob,
        },
        {
          delay: 300,
          direction: 1,
          drift: -1,
          ferryOffsetX: 12,
          trailLength: 1,
          x: ferry.x + 12,
          y: waterTop - 8 + ferry.bob,
        },
        {
          delay: 630,
          direction: 1,
          drift: 1,
          ferryOffsetX: 19,
          trailLength: 1,
          x: ferry.x + 19,
          y: waterTop - 8 + ferry.bob,
        },
      ] : [];

      return [...buildingZs, ...ferryZs];
    }

    function renderSkylineGlowMask(source: HTMLCanvasElement, color = "#ffd889") {
      const off = document.createElement("canvas");
      off.width = source.width;
      off.height = source.height;
      const o = off.getContext("2d")!;
      o.drawImage(source, 0, 0);
      o.globalCompositeOperation = "source-in";
      o.fillStyle = color;
      o.fillRect(0, 0, off.width, off.height);
      return off;
    }

    /** Skyline with per-building shading, lit edges, roof details and an accurate CN Tower. */
    function renderSkyline(pal: typeof NIGHT | typeof DAY | typeof TWILIGHT, dayWindow: string | null) {
      const off = document.createElement("canvas");
      off.width = canvas!.width;
      off.height = canvas!.height;
      const o = off.getContext("2d")!;
      const px = (cx: number, cy: number, color: string) => {
        o.fillStyle = color;
        o.fillRect(cx * CELL, cy * CELL, CELL, CELL);
      };
      const rect = (cx: number, cy: number, cw: number, ch: number, color: string) => {
        o.fillStyle = color;
        o.fillRect(cx * CELL, cy * CELL, cw * CELL, ch * CELL);
      };
      const base = waterTop;

      for (const b of buildings.filter((b) => !b.near)) {
        rect(b.x, base - b.h, b.w, b.h, pal.far);
        rect(b.x, base - b.h, 1, b.h, pal.farLight); // lit edge
      }

      for (const b of buildings.filter((b) => b.near)) {
        const body = pal.nearShades[b.shade];
        rect(b.x, base - b.h, b.w, b.h, body);
        rect(b.x, base - b.h, 1, b.h, pal.nearEdge); // moon/sun-lit left edge
        rect(b.x + b.w - 1, base - b.h, 1, b.h, pal.nearShadow); // shadow right edge
        rect(b.x, base - b.h, b.w, 1, pal.nearEdge); // rooftop parapet
        // art-deco setback: narrower stepped block on top
        if (b.setback) {
          const sw = Math.max(3, b.w - 4);
          const sx2 = b.x + Math.floor((b.w - sw) / 2);
          rect(sx2, base - b.h - b.setback, sw, b.setback, body);
          rect(sx2, base - b.h - b.setback, 1, b.setback, pal.nearEdge);
          rect(sx2 + sw - 1, base - b.h - b.setback, 1, b.setback, pal.nearShadow);
          rect(sx2, base - b.h - b.setback, sw, 1, pal.nearEdge);
        }
        // roof detail
        const roofY = base - b.h - b.setback;
        if (b.antenna) rect(b.x + Math.floor(b.w / 2), roofY - b.antenna, 1, b.antenna, body);
        else if (b.roof === "tank" && b.w >= 5 && !b.setback) {
          rect(b.x + 1, roofY - 2, 2, 2, body);
          px(b.x + 1, roofY - 3, pal.nearEdge);
        } else if (b.roof === "ac" && b.w >= 4 && !b.setback) {
          rect(b.x + b.w - 3, roofY - 1, 2, 1, pal.nearEdge);
        }
        if (dayWindow) for (const w of b.windows) px(b.x + w.wx, base - b.h + w.wy, dayWindow);
      }

      /* ── CN Tower (landmark palette so it stands out from the skyline) ── */
      const { tx, h: th, top, podY } = towerDims();
      const body = pal.tower;
      const lit = pal.towerLit;

      // flared tripod base: legs widen towards the ground
      for (let i = 0; i < 6; i++) {
        const spread = Math.floor(i / 2) + 1;
        rect(tx - spread, base - 6 + i, spread * 2 + 1, 1, body);
        px(tx - spread, base - 6 + i, lit);
      }
      // shaft (3 wide, lit west face)
      rect(tx - 1, top + 10, 3, th - 10, body);
      rect(tx - 1, top + 10, 1, th - 10, lit);
      // main pod: symmetrical bulb, stretched tall — swells out, rounds back in
      rect(tx - 3, podY - 2, 7, 1, body);  // roof taper
      rect(tx - 5, podY - 1, 11, 1, lit);  // lit upper ring (widest)
      rect(tx - 5, podY, 11, 2, body);     // widest band
      rect(tx - 4, podY + 2, 9, 1, body);  // taper
      rect(tx - 3, podY + 3, 7, 1, body);
      rect(tx - 2, podY + 4, 5, 1, body);  // back to shaft
      // sky pod
      rect(tx - 2, waterTop - Math.floor(th * 0.8), 5, 2, body);
      px(tx - 2, waterTop - Math.floor(th * 0.8), lit);
      // antenna mast with crossbars
      rect(tx, top, 1, 10, body);
      for (const cy of [top + 3, top + 6]) {
        px(tx - 1, cy, body);
        px(tx + 1, cy, body);
      }
      if (dayWindow) rect(tx - 4, podY + 1, 9, 1, dayWindow);

      /* ── Rogers Centre: cylindrical stadium bowl capped by the dome ── */
      const dx = tx + 8;
      const domeW = 30;
      const wallH = 8; // the cylinder
      for (let i = 0; i < domeW; i++) {
        const t = i / (domeW - 1);
        const capH = Math.round(7.5 * Math.sin(Math.PI * t));
        const seam = i % 4 === 2;
        // dome cap
        if (capH > 0) {
          rect(dx + i, base - wallH - capH, 1, capH, seam ? pal.domeSeam : pal.dome);
          px(dx + i, base - wallH - capH, pal.domeLit); // lit roof curve
        }
        // cylindrical wall with vertical seams, edge columns shaded for roundness
        const edge = i === 0 || i === domeW - 1;
        rect(dx + i, base - wallH, 1, wallH, edge ? pal.stadiumBase : seam ? pal.domeSeam : pal.dome);
        rect(dx + i, base - 2, 1, 2, pal.stadiumBase); // dark base ring
        if (i === 1) rect(dx + i, base - wallH, 1, wallH - 2, pal.domeLit); // lit west edge
      }

      return off;
    }

    function build() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      cols = Math.ceil(canvas!.width / CELL);
      rows = Math.ceil(canvas!.height / CELL);
      waterTop = rows - 6;
      sunriseBannerMeasured = false;
      measureSunriseAirTrafficLanes();

      if (plane) plane.y = airplaneLaneY();
      for (const flock of flocks) flock.y = birdLaneY(flock.kind);
      if (balloon) balloon.y = balloonLaneY();
      if (!ferry) {
        ferry = {
          x: Math.floor(cols * 0.56),
          acc: 0,
          bob: 0,
          bobAcc: 0,
          boostRemaining: 0,
          frame: 0,
        };
      }

      const count = Math.floor((cols * waterTop) / 120);
      stars = Array.from({ length: count }, () => ({
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * Math.floor(waterTop * 0.85)),
        big: Math.random() < 0.08,
        level: 1 + Math.floor(Math.random() * 3),
        every: 200 + Math.random() * 700,
        acc: Math.random() * 600,
        color: NIGHT.starColors[Math.floor(Math.random() * NIGHT.starColors.length)],
      }));
      sparkles = [];

      const rng = mulberry32(SEED ^ 0x9e3779b9);
      clouds = Array.from({ length: Math.max(5, Math.floor(cols / 34)) }, (_, i) => {
        const front = i % 2 === 0;
        return {
          x: Math.floor(rng() * cols),
          y: SKY_SAFE_TOP + Math.floor(rng() * Math.max(6, rows * 0.48 - SKY_SAFE_TOP)),
          bob: 0,
          map: makeCloud(CLOUD_SHAPES[Math.floor(rng() * CLOUD_SHAPES.length)], rng() < 0.5),
          // clouds are the slowest thing in the sky — slower than balloon (600ms) and birds (150ms)
          every: front ? 850 + rng() * 300 : 1300 + rng() * 400,
          acc: 0,
          bobEvery: 700 + rng() * 600,
          bobAcc: rng() * 700,
          front,
        };
      });

      glints = Array.from({ length: Math.floor(cols / 4) }, () => ({
        x: Math.floor(Math.random() * cols),
        y: waterTop + 1 + Math.floor(Math.random() * (rows - waterTop - 1)),
      }));

      buildSkyline();
      skyNight = renderSky(NIGHT.bands);
      skyDay = renderSky(DAY.bands);
      skyTwilight = renderSky(TWILIGHT.bands, true);
    }

    /* ── draw helpers ── */

    function cell(x: number, y: number, color: string, alpha = 1) {
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = color;
      ctx!.fillRect(x * CELL, y * CELL, CELL, CELL);
      ctx!.globalAlpha = 1;
    }

    function sprite(map: number[][], ox: number, oy: number, colors: Record<number, string>, scale = 2) {
      for (let r = 0; r < map.length; r++) {
        for (let c = 0; c < map[r].length; c++) {
          const v = map[r][c];
          if (!v || !colors[v]) continue;
          ctx!.fillStyle = colors[v];
          ctx!.fillRect((ox + c * scale) * CELL, (oy + r * scale) * CELL, CELL * scale, CELL * scale);
        }
      }
    }

    /** Quantized circular halo whose radius/alpha steps with the shared pulse phase. */
    function halo(cx: number, cy: number, color: string, phase: number, inner = 6.5) {
      const r1 = inner + 0.5 + phase * 0.5;
      const r2 = r1 + 2.5;
      const a1 = [0.05, 0.07, 0.09, 0.07][phase];
      const a2 = a1 * 0.45;
      const span = Math.ceil(r2) + 1;
      for (let r = -span; r <= span; r++) {
        for (let c = -span; c <= span; c++) {
          const d = Math.hypot(r, c);
          if (d > inner && d <= r1) cell(cx + c, cy + r, color, a1);
          else if (d > r1 && d <= r2) cell(cx + c, cy + r, color, a2);
        }
      }
    }

    function moonCellIsLit(row: number, col: number, phaseIndex: number) {
      if (phaseIndex === 0) return false;
      if (phaseIndex === 4) return true;

      const center = (MOON_MAP.length - 1) / 2;
      const rowOffset = row - center;
      const rowRadius = Math.sqrt(Math.max(0.25, (center + 0.4) ** 2 - rowOffset ** 2));
      const normalizedX = (col - center) / rowRadius;

      if (phaseIndex === 1) return normalizedX >= 0.52;
      if (phaseIndex === 2) return normalizedX >= 0;
      if (phaseIndex === 3) return normalizedX >= -0.58;
      if (phaseIndex === 5) return normalizedX <= 0.58;
      if (phaseIndex === 6) return normalizedX <= 0;
      return normalizedX <= -0.52;
    }

    /** A tight stepped glow grown only from illuminated moon pixels. */
    function drawMoonGlow(
      mx: number,
      my: number,
      illuminatedCells: { row: number; col: number; value: number }[],
      phaseIndex: number,
    ) {
      const illumination = [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25][phaseIndex];
      const strength = 0.96 + illumination * 0.22;
      const glowRadius = 5 + (pulse === 2 ? 1 : 0);
      const glowCells = new Map<string, { row: number; col: number; distance: number }>();
      const moonDisc = new Set<string>();

      for (let row = 0; row < MOON_MAP.length; row++) {
        for (let col = 0; col < MOON_MAP[row].length; col++) {
          if (MOON_MAP[row][col]) moonDisc.add(`${row}:${col}`);
        }
      }

      for (const lit of illuminatedCells) {
        for (let dy = -glowRadius; dy <= glowRadius; dy++) {
          for (let dx = -glowRadius; dx <= glowRadius; dx++) {
            const distance = Math.hypot(dx, dy);
            if (distance === 0 || distance > glowRadius) continue;
            const row = lit.row + dy;
            const col = lit.col + dx;
            const key = `${row}:${col}`;
            if (moonDisc.has(key)) continue;
            const existing = glowCells.get(key);
            if (!existing || distance < existing.distance) {
              glowCells.set(key, { row, col, distance });
            }
          }
        }
      }

      for (const glow of glowCells.values()) {
        const alpha = glow.distance <= 1.5
          ? 0.25 * strength
          : glow.distance <= 3.25
            ? 0.12 * strength
            : 0.052 * strength;
        cell(mx + glow.col, my + glow.row, "#eef6ff", alpha);
      }
    }

    function drawMoon(mx: number, my: number, phaseIndex: number) {
      const illuminatedCells: { row: number; col: number; value: number }[] = [];

      for (let row = 0; row < MOON_MAP.length; row++) {
        for (let col = 0; col < MOON_MAP[row].length; col++) {
          const value = MOON_MAP[row][col];
          if (value && moonCellIsLit(row, col, phaseIndex)) illuminatedCells.push({ row, col, value });
        }
      }

      drawMoonGlow(mx, my, illuminatedCells, phaseIndex);

      for (const lit of illuminatedCells) {
        const color = lit.value === 3
          ? NIGHT.moonCrater
          : lit.value === 2
            ? NIGHT.moonShade
            : NIGHT.moonBody;
        cell(mx + lit.col, my + lit.row, color);
      }

      // A new moon keeps only a quiet outline so the click target remains discoverable.
      if (phaseIndex === 0) {
        for (let row = 0; row < MOON_MAP.length; row++) {
          for (let col = 0; col < MOON_MAP[row].length; col++) {
            if (MOON_MAP[row][col] === 2) cell(mx + col, my + row, "#51647e", 0.42);
          }
        }
      }
    }

    function sunriseSunPosition(dt: number) {
      if (!reduced) {
        sunriseSunJourneyElapsed = (sunriseSunJourneyElapsed + dt) % SUNRISE_SUN_JOURNEY_MS;
      }

      const rawProgress = reduced ? 0.5 : sunriseSunJourneyElapsed / SUNRISE_SUN_JOURNEY_MS;
      const journeySteps = Math.max(1, cols + SUN_MAP[0].length);
      const progress = Math.round(rawProgress * journeySteps) / journeySteps;
      const radius = (SUN_MAP.length - 1) / 2;
      const startCenterX = 3;
      const endCenterX = cols - 4;
      const horizonCenterY = waterTop - 1;
      const apexCenterY = Math.max(SKY_SAFE_TOP + radius, Math.floor(rows * 0.13));
      const arcHeight = Math.max(12, horizonCenterY - apexCenterY);
      const centerX = Math.round(startCenterX + (endCenterX - startCenterX) * progress);
      const centerY = horizonCenterY - Math.round(Math.sin(Math.PI * progress) * arcHeight);

      return {
        x: Math.round(centerX - radius),
        y: Math.round(centerY - radius),
        centerX,
      };
    }

    function stepPulse(dt: number) {
      if (reduced) return;
      pulseAcc += dt;
      if (pulseAcc >= 360) {
        pulseAcc = 0;
        pulse = (pulse + 1) % 4;
      }
    }

    function drawWater(pal: typeof NIGHT | typeof DAY | typeof TWILIGHT, laneColor: string, laneX: number, dt: number) {
      ctx!.fillStyle = pal.waterBase;
      ctx!.fillRect(0, waterTop * CELL, canvas!.width, (rows - waterTop) * CELL);

      if (!reduced) {
        glintAcc += dt;
        if (glintAcc >= 320) {
          glintAcc = 0;
          for (let i = 0; i < Math.max(2, glints.length >> 3); i++) {
            const g = glints[Math.floor(Math.random() * glints.length)];
            g.x = Math.floor(Math.random() * cols);
            g.y = waterTop + 1 + Math.floor(Math.random() * (rows - waterTop - 1));
          }
        }
      }
      for (const g of glints) {
        cell(g.x, g.y, pal.waterGlint, 0.8);
        cell(g.x + 1, g.y, pal.waterGlint, 0.35);
      }

      // rolling waves: dashed crests that march sideways each step
      if (!reduced) {
        waveAcc += dt;
        if (waveAcc >= 220) {
          waveAcc = 0;
          wavePhase = (wavePhase + 1) % 8;
        }
      }
      for (let y = waterTop; y < rows; y++) {
        const dir = y % 2 === 0 ? 1 : -1; // alternate rows roll opposite ways
        const offset = ((wavePhase * dir) + y * 3 + 800) % 8;
        for (let x = offset; x < cols; x += 8) {
          cell(x, y, pal.waterGlint, 0.22);
          cell(x + 1, y, pal.waterGlint, 0.12);
        }
      }

      // shimmering reflection lane under the moon/sun
      for (let y = waterTop; y < rows; y++) {
        const wob = (y + pulse) % 2 === 0 ? 0 : 1;
        cell(laneX + wob, y, laneColor, 0.5 - (y - waterTop) * 0.06);
        cell(laneX + 3 - wob, y, laneColor, 0.35 - (y - waterTop) * 0.05);
      }
    }

    function drawRotatedPixelZ(
      x: number,
      y: number,
      pixelSize: number,
      direction: -1 | 1,
      color: string,
      alpha: number,
    ) {
      const angle = direction * -14 * Math.PI / 180;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const centerX = (SLEEPY_Z_MAP[0].length - 1) / 2;
      const centerY = (SLEEPY_Z_MAP.length - 1) / 2;

      for (let row = 0; row < SLEEPY_Z_MAP.length; row += 1) {
        for (let column = 0; column < SLEEPY_Z_MAP[row].length; column += 1) {
          if (!SLEEPY_Z_MAP[row][column]) continue;
          const relativeX = column - centerX;
          const relativeY = row - centerY;
          const rotatedX = Math.round(relativeX * cosine - relativeY * sine);
          const rotatedY = Math.round(relativeX * sine + relativeY * cosine);
          const pixelX = x + rotatedX * pixelSize;
          const pixelY = y + rotatedY * pixelSize;
          ctx!.globalAlpha = alpha * 0.64;
          ctx!.fillStyle = "#1a2136";
          ctx!.fillRect(pixelX + 1, pixelY + 1, pixelSize, pixelSize);
          ctx!.globalAlpha = alpha;
          ctx!.fillStyle = color;
          ctx!.fillRect(pixelX, pixelY, pixelSize, pixelSize);
        }
      }
    }

    function getRotatedPixelZBounds(
      x: number,
      y: number,
      pixelSize: number,
      direction: -1 | 1,
    ) {
      const angle = direction * -14 * Math.PI / 180;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const centerX = (SLEEPY_Z_MAP[0].length - 1) / 2;
      const centerY = (SLEEPY_Z_MAP.length - 1) / 2;
      let left = Number.POSITIVE_INFINITY;
      let right = Number.NEGATIVE_INFINITY;
      let top = Number.POSITIVE_INFINITY;
      let bottom = Number.NEGATIVE_INFINITY;

      for (let row = 0; row < SLEEPY_Z_MAP.length; row += 1) {
        for (let column = 0; column < SLEEPY_Z_MAP[row].length; column += 1) {
          if (!SLEEPY_Z_MAP[row][column]) continue;
          const relativeX = column - centerX;
          const relativeY = row - centerY;
          const rotatedX = Math.round(relativeX * cosine - relativeY * sine);
          const rotatedY = Math.round(relativeX * sine + relativeY * cosine);
          const pixelX = x + rotatedX * pixelSize;
          const pixelY = y + rotatedY * pixelSize;
          left = Math.min(left, pixelX);
          right = Math.max(right, pixelX + pixelSize + 1);
          top = Math.min(top, pixelY);
          bottom = Math.max(bottom, pixelY + pixelSize + 1);
        }
      }

      const clearance = 3;
      return {
        bottom: bottom + clearance,
        left: left - clearance,
        right: right + clearance,
        top: top - clearance,
      };
    }

    function drawSleepyZs(sleepElapsed: number) {
      const occupiedBounds: ReturnType<typeof getRotatedPixelZBounds>[] = [];
      sleepyZs.forEach((sleepyZ) => {
        const localElapsed = sleepElapsed - sleepyZ.delay;
        if (localElapsed < 0) return;
        const availableDuration = MIDNIGHT_BUILDING_SLEEP_DURATION_MS - sleepyZ.delay;
        const progress = Math.min(1, localElapsed / availableDuration);
        const rise = Math.floor(progress * 24);
        const drift = sleepyZ.drift * Math.floor(progress * 6);
        const jigglePattern = [0, 1, 0, -1, 0, 1, 0];
        const jiggle = jigglePattern[Math.floor(localElapsed / 85) % jigglePattern.length];
        const verticalJiggle = [0, 0, -1, 0][Math.floor(localElapsed / 110) % 4];
        const alpha = progress < 0.72 ? 0.92 : Math.max(0, (1 - progress) / 0.28);
        const color = "#dce9ff";
        const sourceX = sleepyZ.ferryOffsetX !== undefined && ferry
          ? ferry.x + sleepyZ.ferryOffsetX
          : sleepyZ.x;
        const sourceY = sleepyZ.ferryOffsetX !== undefined && ferry
          ? waterTop - 8 + ferry.bob
          : sleepyZ.y;
        const baseX = sourceX * CELL + drift + jiggle;
        const baseY = sourceY * CELL - rise + verticalJiggle;
        const glyphs = sleepyZ.trailLength === 3
          ? [
              { delay: 0, offsetX: 0, offsetY: 0, pixelSize: 1 },
              { delay: 70, offsetX: sleepyZ.direction * 14, offsetY: -16, pixelSize: 2 },
              { delay: 140, offsetX: sleepyZ.direction * 32, offsetY: -36, pixelSize: 3 },
            ]
          : [{ delay: 0, offsetX: 0, offsetY: 0, pixelSize: 2 }];

        glyphs.forEach((glyph) => {
          if (localElapsed < glyph.delay) return;
          const glyphAlpha = alpha * Math.min(1, (localElapsed - glyph.delay + 40) / 120);
          const initialX = baseX + glyph.offsetX;
          const initialY = baseY + glyph.offsetY;
          const placement = Array.from({ length: 10 }, (_, index) => ({
            x: initialX + index * 9,
            y: initialY - index * 11,
          })).find(({ x, y }) => {
            const bounds = getRotatedPixelZBounds(x, y, glyph.pixelSize, sleepyZ.direction);
            return !occupiedBounds.some((occupied) => (
              bounds.left < occupied.right &&
              bounds.right > occupied.left &&
              bounds.top < occupied.bottom &&
              bounds.bottom > occupied.top
            ));
          });
          if (!placement) return;
          occupiedBounds.push(getRotatedPixelZBounds(
            placement.x,
            placement.y,
            glyph.pixelSize,
            sleepyZ.direction,
          ));
          drawRotatedPixelZ(
            placement.x,
            placement.y,
            glyph.pixelSize,
            sleepyZ.direction,
            color,
            glyphAlpha,
          );
        });
        ctx!.globalAlpha = 1;
      });
    }

    function drawLitWindows(dt: number) {
      if (!reduced && midnightBuildingEffectElapsed >= 0) {
        midnightBuildingEffectElapsed += dt;
        if (
          midnightBuildingEffectElapsed >=
          MIDNIGHT_WINDOW_FLASH_DURATION_MS + MIDNIGHT_BUILDING_SLEEP_DURATION_MS
        ) {
          midnightBuildingEffectElapsed = -1;
        }
      }

      const buildingStage = midnightBuildingEffectElapsed < 0
        ? "normal"
        : midnightBuildingEffectElapsed < MIDNIGHT_WINDOW_FLASH_DURATION_MS
          ? "flash"
          : "sleep";
      canvas!.dataset.buildingLights = buildingStage;

      if (!reduced && buildingStage === "normal") {
        windowAcc += dt;
        if (windowAcc >= 700) {
          windowAcc = 0;
          for (let i = 0; i < 3; i++) {
            const b = buildings[Math.floor(Math.random() * buildings.length)];
            if (!b || !b.near || b.windows.length === 0) continue;
            const wi = Math.floor(Math.random() * b.windows.length);
            const key = `${b.x}:${wi}`;
            if (litWindows.has(key)) litWindows.delete(key);
            else litWindows.add(key);
          }
        }
      }
      for (const b of buildings) {
        if (!b.near) continue;
        for (let i = 0; i < b.windows.length; i++) {
          if (buildingStage === "sleep" || !litWindows.has(`${b.x}:${i}`)) continue;
          const w = b.windows[i];
          cell(
            b.x + w.wx,
            waterTop - b.h + w.wy,
            buildingStage === "flash" ? "#fffdf0" : NIGHT.window,
            buildingStage === "flash" ? 1 : 0.95,
          );
        }
      }
      // CN Tower pod lights + blinking aviation beacon
      const { tx, top, podY } = towerDims();
      if (buildingStage !== "sleep") {
        for (const dx of [-5, -3, -1, 1, 3, 5]) {
          cell(tx + dx, podY + 1, buildingStage === "flash" ? "#fffdf0" : NIGHT.window, 0.9);
        }
      }
      if (!reduced && buildingStage === "normal") {
        beaconAcc += dt;
        if (beaconAcc >= 900) {
          beaconAcc = 0;
          beaconOn = !beaconOn;
        }
      }
      if (beaconOn && buildingStage !== "sleep") {
        cell(tx, top, NIGHT.beacon, 0.95);
        cell(tx, top, NIGHT.beacon, 0.95);
        cell(tx - 1, top, NIGHT.beacon, 0.2);
        cell(tx + 1, top, NIGHT.beacon, 0.2);
      }

      if (buildingStage === "sleep") {
        drawSleepyZs(midnightBuildingEffectElapsed - MIDNIGHT_WINDOW_FLASH_DURATION_MS);
      }
    }

    function drawPlane(
      dt: number,
      sunriseOpening = false,
    ) {
      planeSmoke = planeSmoke.filter((puff) => {
        puff.ttl -= dt;
        return puff.ttl > 0;
      });
      for (const puff of planeSmoke) {
        const age = puff.maxTtl - puff.ttl;
        const drift = Math.floor(age / 260);
        const rise = Math.floor(age / 430);
        const px = puff.x + drift;
        const py = puff.y - rise;
        const smokeColor = sunriseOpening ? "#fff0e6" : PLANE_SMOKE;
        const alpha = Math.min(0.78, puff.ttl / puff.maxTtl);

        cell(px, py, smokeColor, alpha);
        cell(px + 1, py, smokeColor, alpha * 0.46);
        cell(px, py - 1, smokeColor, alpha * 0.34);
        if (puff.size > 1 || age > 360) {
          cell(px + 1, py - 1, smokeColor, alpha * 0.28);
          cell(px + 2, py, smokeColor, alpha * 0.16);
          cell(px, py + 1, smokeColor, alpha * 0.18);
        }
      }

      if (plane) {
        const boosted = plane.boostRemaining > 0;
        plane.boostRemaining = Math.max(0, plane.boostRemaining - dt);
        planeSmokeAcc += dt;
        const smokeEvery = boosted ? 55 : sunriseOpening ? 110 : 190;
        while (planeSmokeAcc >= smokeEvery) {
          planeSmokeAcc -= smokeEvery;
          const ttl = boosted ? 1450 : sunriseOpening ? 1250 : 950;
          planeSmoke.push({
            x: plane.x + PLANE_WIDTH_CELLS + (boosted ? Math.floor(Math.random() * 2) : 0),
            y: plane.y + Math.floor(Math.random() * 3) - 1,
            ttl,
            maxTtl: ttl,
            size: boosted || sunriseOpening || Math.random() < 0.35 ? 2 : 1,
          });
          if (planeSmoke.length > 110) planeSmoke.shift();
        }

        plane.acc += dt;
        const moveEvery = boosted ? 130 / 3 : 130;

        while (plane && plane.acc >= moveEvery) {
          plane.acc -= moveEvery;
          plane.x -= 1;
          if (plane.x < -PLANE_WIDTH_CELLS - 2) {
            plane = null;
            planeSmokeAcc = 0;
          }
        }
      }

      if (plane) {
        if (planeSpriteReady) {
          const drawWidth = PLANE_WIDTH_CELLS * CELL;
          const drawHeight = drawWidth / PLANE_SPRITE_ASPECT;
          ctx!.save();
          ctx!.globalAlpha = 0.98;
          ctx!.imageSmoothingEnabled = false;
          ctx!.drawImage(
            planeSprite,
            Math.round(plane.x * CELL),
            Math.round(plane.y * CELL - drawHeight / 2),
            drawWidth,
            drawHeight,
          );
          ctx!.restore();
        }
        return;
      }

      if (sunriseOpening && sunriseOpeningPlanePending) {
        sunriseOpeningPlaneWait -= dt;
        if (sunriseOpeningPlaneWait <= 0) {
          plane = {
            x: cols + 1,
            y: airplaneLaneY(),
            acc: 0,
            boostRemaining: 0,
          };
          sunriseOpeningPlanePending = false;
          planeWait = 16000 + Math.random() * 18000;
        }
        return;
      }

      planeWait -= dt;
      if (planeWait <= 0) {
        plane = {
          x: cols + 1,
          y: airplaneLaneY(),
          acc: 0,
          boostRemaining: 0,
        };
        planeWait = 16000 + Math.random() * 18000;
      }
    }

    /* ── night ── */

    function drawNight(dt: number) {
      if (skyNight) ctx!.drawImage(skyNight, 0, 0);
      stepPulse(dt);

      // stars: quantized twinkle + occasional cross-shaped sparkle
      for (const s of stars) {
        if (!reduced) {
          s.acc += dt;
          if (s.acc >= s.every) {
            s.acc = 0;
            s.level = Math.max(0, Math.min(3, s.level + (Math.random() < 0.5 ? -1 : 1)));
          }
        }
        const alpha = [0.1, 0.32, 0.58, 0.95][s.level];
        const hoverTwinkleStep = (pulse + s.x + s.y) % 4;
        const hoverTwinkleAlpha = [0.38, 0.68, 1, 0.72][hoverTwinkleStep];
        const visibleAlpha = nameStarGlowActive ? hoverTwinkleAlpha : alpha;
        if (nameStarGlowActive) {
          const glowAlpha = hoverTwinkleAlpha * 0.3;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            starCell(s.x + dx, s.y + dy, s.color, glowAlpha);
          }
          for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
            starCell(s.x + dx, s.y + dy, s.color, glowAlpha * 0.46);
          }
          for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]] as const) {
            starCell(s.x + dx, s.y + dy, s.color, glowAlpha * 0.28);
          }
        }
        starCell(s.x, s.y, s.color, visibleAlpha);
        if ((s.big && s.level >= 2) || (nameStarGlowActive && hoverTwinkleStep === 2)) {
          starCell(s.x + 1, s.y, s.color, visibleAlpha * 0.5);
          starCell(s.x - 1, s.y, s.color, visibleAlpha * 0.5);
          starCell(s.x, s.y + 1, s.color, visibleAlpha * 0.5);
          starCell(s.x, s.y - 1, s.color, visibleAlpha * 0.5);
        }
      }
      if (!reduced) {
        sparkleAcc += dt;
        const sparkleInterval = nameStarGlowActive ? 110 : 480;
        if (sparkleAcc >= sparkleInterval) {
          sparkleAcc = 0;
          const sparkleCount = nameStarGlowActive ? 6 : 1;
          for (let index = 0; index < sparkleCount; index += 1) {
            const s = stars[Math.floor(Math.random() * stars.length)];
            if (s) sparkles.push({ x: s.x, y: s.y, ttl: nameStarGlowActive ? 4 : 3, color: s.color });
          }
        }
        sparkles = sparkles.filter((sp) => sp.ttl-- > 0);
        for (const sp of sparkles) {
          const a = 0.3 * sp.ttl;
          starCell(sp.x, sp.y, "#ffffff", Math.min(1, a + 0.3));
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            starCell(sp.x + dx, sp.y + dy, sp.color, a * 0.7);
          }
          if (sp.ttl >= 2) {
            starCell(sp.x + 2, sp.y, sp.color, a * 0.3);
            starCell(sp.x - 2, sp.y, sp.color, a * 0.3);
            starCell(sp.x, sp.y + 2, sp.color, a * 0.3);
            starCell(sp.x, sp.y - 2, sp.color, a * 0.3);
          }
        }
      }

      // Toronto's current lunar phase, with clicks providing a short preview.
      const { x: mx, y: my } = moonPosition();
      const now = new Date();
      const actualMoonPhaseIndex = getMoonPhaseIndex(now);
      const displayedMoonPhaseIndex = moonPhasePreviewIndex ?? actualMoonPhaseIndex;
      drawMoon(mx, my, displayedMoonPhaseIndex);
      canvas!.dataset.moonPhase = MOON_PHASE_NAMES[displayedMoonPhaseIndex];
      canvas!.dataset.moonPhaseSource = moonPhasePreviewIndex === null ? "Toronto current phase" : "click preview";
      canvas!.dataset.moonDateToronto = TORONTO_DATE_FORMATTER.format(now);

      if (!reduced) {
        // shooting star
        if (shooting) {
          shooting.acc += dt;
          if (shooting.acc >= TICK) {
            shooting.acc = 0;
            const head = shooting.cells[0];
            shooting.cells.unshift({ x: head.x + 3, y: head.y + 1 });
            if (shooting.cells.length > 10) shooting.cells.pop();
            if (head.x > cols + 12 || head.y > rows + 12) shooting = null;
          }
          shooting?.cells.forEach((c, i) => cell(c.x, c.y, "#fff6d8", Math.max(0, 0.95 - i * 0.1)));
        } else {
          shootWait -= dt;
          if (shootWait <= 0) {
            shooting = {
              cells: [{
                x: Math.floor(Math.random() * cols * 0.6),
                y: SKY_SAFE_TOP + Math.floor(Math.random() * Math.max(1, rows * 0.2 - SKY_SAFE_TOP)),
              }],
              acc: 0,
            };
            shootWait = 5000 + Math.random() * 7000;
          }
        }

        // Transparent sprite plane with a soft smoke trail and click boost.
        drawPlane(dt);

        // satellite: slow diagonal drift, dim
        if (satellite) {
          satellite.acc += dt;
          if (satellite.acc >= 420) {
            satellite.acc = 0;
            satellite.x += 1;
            satellite.y -= (satellite.x % 3 === 0 ? 1 : 0);
            if (satellite.x > cols + 4 || satellite.y < -2) satellite = null;
          }
          if (satellite) {
            cell(satellite.x, satellite.y, "#dfe8f2", 0.85);
            cell(satellite.x - 1, satellite.y, "#8fa3b8", 0.5);
            cell(satellite.x + 1, satellite.y, "#8fa3b8", 0.5);
          }
        } else {
          satWait -= dt;
          if (satWait <= 0) {
            satellite = {
              x: -2,
              y: Math.max(SKY_SAFE_TOP, Math.floor(rows * (0.2 + Math.random() * 0.3))),
              acc: 0,
            };
            satWait = 14000 + Math.random() * 14000;
          }
        }
      }

      if (skylineNight) ctx!.drawImage(skylineNight, 0, 0);
      drawLitWindows(dt);
      drawWater(NIGHT, NIGHT.moonLane, mx + 5, dt);
      drawFerry(dt, true);
    }

    /* ── daylight + shared sunrise/sunset scene ── */

    function drawDayScene(dt: number, pal: typeof DAY | typeof TWILIGHT, twilight: boolean) {
      if (twilight && !sunriseBannerMeasured) measureSunriseAirTrafficLanes();
      const sky = twilight ? skyTwilight : skyDay;
      if (sky) ctx!.drawImage(sky, 0, 0);
      stepPulse(dt);

      const fixedSunY = Math.max(SKY_SAFE_TOP + 4, Math.floor(rows * 0.08));
      const movingSun = twilight ? sunriseSunPosition(dt) : null;
      const sx = movingSun?.x ?? Math.round(cols * 0.82);
      const sy = movingSun?.y ?? fixedSunY;
      halo(sx + 8, sy + 8, pal.sunRay, pulse, twilight ? 11 : 9);
      const hot = pulse % 2 === 0;
      sprite(SUN_MAP, sx, sy, {
        1: hot ? pal.sunCoreHot : pal.sunCore,
        3: hot ? pal.sunCoreHot : pal.sunRay,
        4: hot ? pal.sunRay : pal.sunRim,
      }, 1);

      // clouds: drift + bob, back layer then front
      for (const c of clouds) {
        if (!reduced) {
          c.acc += dt;
          if (c.acc >= c.every) {
            c.acc = 0;
            c.x += 1;
            if (c.x > cols + 4) {
              c.x = -c.map[0].length - 6;
              c.y = SKY_SAFE_TOP + Math.floor(Math.random() * Math.max(6, rows * 0.48 - SKY_SAFE_TOP));
            }
          }
          c.bobAcc += dt;
          if (c.bobAcc >= c.bobEvery) {
            c.bobAcc = 0;
            c.bob = c.bob === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
          }
        }
        if (!c.front)
          sprite(c.map, c.x, c.y + c.bob, { 1: pal.cloudBack, 2: pal.cloudBackShade, 3: pal.cloudBackHi, 4: pal.cloudBackMid }, 1);
      }
      for (const c of clouds) {
        if (c.front)
          sprite(c.map, c.x, c.y + c.bob, { 1: pal.cloudFront, 2: pal.cloudShade, 3: pal.cloudFrontHi, 4: pal.cloudFrontMid }, 1);
      }

      if (!reduced) {
        const activeFlockKinds: readonly FlockKind[] =
          window.innerWidth <= MOBILE_LAYOUT_MAX_WIDTH ? ["three"] : ["three", "five"];

        // Mobile keeps the scene clear with one three-bird flock. Desktop
        // retains the second, five-bird formation on its lower lane.
        if (!activeFlockKinds.includes("five")) {
          flocks = flocks.filter((flock) => flock.kind !== "five");
        }

        for (const flock of flocks) {
          flock.acc += dt;
          if (flock.scatterElapsed !== null) {
            flock.scatterElapsed += dt;
            if (flock.scatterElapsed >= 960) flock.scatterElapsed = null;
          }

          const stepMs = flock.kind === "three" ? 145 : 200;
          if (flock.acc >= stepMs) {
            flock.acc -= stepMs;
            flock.frame = flock.frame ? 0 : 1;
            flock.x += 1;
          }
        }

        flocks = flocks.filter((flock) => flock.x <= cols + (flock.kind === "three" ? 10 : 16));

        for (const flock of flocks) {
          for (const [dx, dy] of birdOffsets(flock)) {
            const bx = flock.x + dx;
            const by = flock.y + dy;
            const wingY = by + (flock.frame ? 0 : 1);
            // 2×-scale bird: wing tips, wing arms, body
            ctx!.fillStyle = pal.birdWing;
            ctx!.fillRect((bx - 3) * CELL, (wingY - 1) * CELL, CELL, CELL);
            ctx!.fillRect((bx + 3) * CELL, (wingY - 1) * CELL, CELL, CELL);
            ctx!.fillStyle = pal.bird;
            ctx!.fillRect((bx - 2) * CELL, wingY * CELL, 2 * CELL, CELL);
            ctx!.fillRect((bx + 1) * CELL, wingY * CELL, 2 * CELL, CELL);
            ctx!.fillRect((bx - 1) * CELL, (by + (flock.frame ? 1 : 0)) * CELL, 2 * CELL, CELL);
          }
        }

        for (const kind of activeFlockKinds) {
          if (flocks.some((flock) => flock.kind === kind)) continue;
          flockWait[kind] -= dt;
          if (flockWait[kind] > 0) continue;

          flocks.push({
            kind,
            x: kind === "three" ? -2 : -1,
            y: birdLaneY(kind),
            frame: 0,
            acc: 0,
            scatterElapsed: null,
          });
          flockWait[kind] = kind === "three"
            ? 9000 + Math.random() * 5000
            : 10500 + Math.random() * 5000;
        }

        // hot-air balloon: slow drift with stepped sway
        if (balloon) {
          balloon.acc += dt;
          if (balloon.acc >= BALLOON_STEP_MS) {
            balloon.acc = 0;
            balloon.x += 1;
            balloon.sway = balloon.sway === 0 ? 1 : 0;
            if (balloon.x > cols + 6) balloon = null;
          }
          if (balloon) {
            balloon.y = balloonLaneY();
            if (balloon.jiggleElapsed !== null) {
              balloon.jiggleElapsed += dt;
              if (balloon.jiggleElapsed >= 1040) balloon.jiggleElapsed = null;
            }
            balloon.yAcc += dt;
            if (balloon.yAcc >= 2400) {
              balloon.yAcc = 0;
              balloon.bob = balloon.bob === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
            }
            const jiggle = balloonJiggleOffset();
            const traffic = balloonTrafficOffset();
            if (traffic.visible) {
              sprite(BALLOON, balloon.x + balloon.sway + jiggle.x + traffic.x, balloon.y + balloon.bob + jiggle.y + traffic.y, {
                1: pal.balloonA,
                2: pal.balloonB,
                3: pal.basket,
                4: pal.rope,
              }, BALLOON_SCALE);
            }
          }
        } else {
          balloonWait -= dt;
          if (balloonWait <= 0) {
            balloon = {
              x: -2 - AIR_TRAFFIC_STAGGER * 2,
              y: balloonLaneY(),
              sway: 0,
              bob: 0,
              acc: 0,
              yAcc: 0,
              jiggleElapsed: null,
              trafficOffset: -AIR_TRAFFIC_STAGGER,
              trafficYOffset: 0,
            };
            balloonWait = 18000 + Math.random() * 16000;
          }
        }

        // plane crosses by day too
        drawPlane(dt, twilight);
      }

      const skylineGlowIntensity = twilight ? drawSunriseSkylineGlow(dt) : 0;
      const skyline = twilight ? skylineTwilight : skylineDay;
      if (skyline) ctx!.drawImage(skyline, 0, 0);
      if (twilight && skylineTwilightGlow && skylineGlowIntensity > 0) {
        ctx!.save();
        ctx!.globalCompositeOperation = "screen";
        ctx!.globalAlpha = skylineGlowIntensity * 0.18;
        ctx!.drawImage(skylineTwilightGlow, 0, 0);
        ctx!.restore();
      }
      if (twilight) drawLitWindows(dt);
      const sunLaneX = Math.max(1, Math.min(cols - 4, (movingSun?.centerX ?? sx + 8) - 1));
      drawWater(pal, pal.sunLane, sunLaneX, dt);
      drawFerry(dt, twilight);
    }

    function drawSunriseSkylineGlow(dt: number) {
      if (!skylineTwilightGlow || sunriseSkylineGlowRemaining <= 0) return 0;

      sunriseSkylineGlowRemaining = Math.max(0, sunriseSkylineGlowRemaining - dt);
      const elapsed = SUNRISE_SKYLINE_GLOW_DURATION_MS - sunriseSkylineGlowRemaining;
      const attack = Math.min(1, (elapsed + TICK) / 260);
      const release = Math.min(1, sunriseSkylineGlowRemaining / 420);
      const pulseStep = [0.68, 1, 0.82, 1][Math.floor(elapsed / 120) % 4];
      const intensity = Math.ceil(Math.min(attack, release) * pulseStep * 4) / 4;
      if (intensity <= 0) return 0;

      ctx!.save();
      ctx!.globalCompositeOperation = "screen";
      ctx!.globalAlpha = intensity * 0.12;
      for (const [x, y] of SKYLINE_GLOW_FAR_OFFSETS) {
        ctx!.drawImage(skylineTwilightGlow, x * CELL, y * CELL);
      }
      ctx!.globalAlpha = intensity * 0.28;
      for (const [x, y] of SKYLINE_GLOW_OUTER_OFFSETS) {
        ctx!.drawImage(skylineTwilightGlow, x * CELL, y * CELL);
      }
      ctx!.globalAlpha = intensity * 0.56;
      for (const [x, y] of SKYLINE_GLOW_INNER_OFFSETS) {
        ctx!.drawImage(skylineTwilightGlow, x * CELL, y * CELL);
      }
      ctx!.restore();

      return intensity;
    }

    function drawDay(dt: number) {
      drawDayScene(dt, DAY, false);
    }

    function drawTwilight(dt: number) {
      drawDayScene(dt, TWILIGHT, true);
    }

    function drawFerry(dt: number, night: boolean) {
      if (!ferry) return;

      const paused = !reduced && ferryPauseRemaining > 0;
      if (paused) ferryPauseRemaining = Math.max(0, ferryPauseRemaining - dt);
      canvas!.dataset.ferryPaused = paused ? "true" : "false";
      const boosted = !reduced && !paused && ferry.boostRemaining > 0;
      if (!reduced && !paused) {
        ferry.boostRemaining = Math.max(0, ferry.boostRemaining - dt);
        ferry.acc += dt;
        const moveEvery = boosted ? 330 / 4 : 330;
        while (ferry.acc >= moveEvery) {
          ferry.acc -= moveEvery;
          ferry.x += 1;
          ferry.frame = ferry.frame ? 0 : 1;
          if (ferry.x > cols + 4) ferry.x = -FERRY[0].length - 5;
        }
        ferry.bobAcc += dt;
        if (ferry.bobAcc >= 720) {
          ferry.bobAcc = 0;
          ferry.bob = ferry.bob === 0 ? 1 : 0;
        }
      }

      const ferryY = waterTop - 5 + ferry.bob;
      const foam = night ? "#90abc7" : "#eef9ff";
      const ferryLightsOff = night &&
        midnightBuildingEffectElapsed >= 0 &&
        midnightBuildingEffectElapsed < MIDNIGHT_BUILDING_SLEEP_DURATION_MS;
      canvas!.dataset.ferryLights = ferryLightsOff ? "off" : "normal";

      if (boosted) {
        ferrySplashAcc += dt;
        while (ferrySplashAcc >= 55) {
          ferrySplashAcc -= 55;
          for (let i = 0; i < 2; i++) {
            const ttl = 420 + Math.random() * 280;
            ferrySplashes.push({
              x: ferry.x - 1 - Math.random() * 3,
              y: waterTop + Math.random(),
              vx: -2 - Math.random() * 5,
              vy: -8 - Math.random() * 8,
              ttl,
              maxTtl: ttl,
            });
          }
        }
      } else {
        ferrySplashAcc = 0;
      }

      const splashStep = dt / 1000;
      for (const splash of ferrySplashes) {
        splash.x += splash.vx * splashStep;
        splash.y += splash.vy * splashStep;
        splash.vy += 26 * splashStep;
        splash.ttl -= dt;
        cell(Math.round(splash.x), Math.round(splash.y), foam, Math.max(0, splash.ttl / splash.maxTtl));
      }
      ferrySplashes = ferrySplashes.filter((splash) => splash.ttl > 0 && splash.y < rows + 2);

      for (let i = 0; i < 8; i += 2) {
        cell(ferry.x - 2 - i - ferry.frame, waterTop + 1 + ((i / 2 + ferry.frame) % 2), foam, 0.72 - i * 0.05);
      }

      sprite(FERRY, ferry.x, ferryY, {
        1: night ? "#d7e2ec" : "#f7fbff",
        2: night ? "#c44843" : "#df5148",
        3: night ? "#71869c" : "#dbe9f4",
        4: night ? (ferryLightsOff ? "#304258" : NIGHT.window) : "#245278",
        5: night ? "#f0c75e" : "#e9a824",
        6: night ? "#17283c" : "#315777",
      }, 1);

      if (ferry.frame) {
        cell(ferry.x + 14, ferryY - 1, night ? "#8292a4" : "#d2dde7", 0.55);
        cell(ferry.x + 15, ferryY - 2, night ? "#8292a4" : "#d2dde7", 0.3);
      }
    }

    /* ── loop ── */

    function drawCurrentScene(dt: number) {
      const nextScheduledPhase = getSkyPhase();
      if (nextScheduledPhase !== scheduledPhase) {
        scheduledPhase = nextScheduledPhase;
      }
      const phase = getSkyOverride() ?? scheduledPhase;
      if (activePhase !== phase) {
        activePhase = phase;
        if (phase === "twilight") {
          sunriseBannerMeasured = false;
          sunriseSunJourneyElapsed = 0;
        }
        else sunriseSkylineGlowRemaining = 0;
        if (phase !== "night") midnightBuildingEffectElapsed = -1;
        document.documentElement.dataset.skyPhase = phase;
        document.documentElement.dataset.theme = phase === "night" ? "dark" : "light";
      }
      if (phase === "day") drawDay(dt);
      else if (phase === "twilight") drawTwilight(dt);
      else drawNight(dt);
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = last ? now - last : TICK;
      if (dt < TICK) return;
      last = now;
      drawCurrentScene(dt);
    }

    const onPointerDown = (event: PointerEvent) => {
      const birdHit = clickedBird(event.clientX, event.clientY);
      if (clickedMoon(event.clientX, event.clientY)) {
        const currentPhaseIndex = moonPhasePreviewIndex ?? getMoonPhaseIndex();
        moonPhasePreviewIndex = (currentPhaseIndex + 1) % MOON_PHASE_NAMES.length;
        canvas!.dataset.moonPhase = MOON_PHASE_NAMES[moonPhasePreviewIndex];
        window.clearTimeout(moonPhasePreviewTimer);
        moonPhasePreviewTimer = window.setTimeout(() => {
          moonPhasePreviewIndex = null;
          drawCurrentScene(0);
        }, MOON_PREVIEW_DURATION_MS);
        drawCurrentScene(0);
      } else if (clickedFerry(event.clientX, event.clientY)) {
        if (ferry) ferry.boostRemaining = 2000;
        playFerryHorn();
      } else if (clickedBalloon(event.clientX, event.clientY)) {
        if (balloon) balloon.jiggleElapsed = 0;
        playBalloonJiggle();
      } else if (birdHit) {
        birdHit.scatterElapsed = 0;
        playChirp();
      } else if (clickedPlane(event.clientX, event.clientY)) {
        if (plane) plane.boostRemaining = 2000;
        playPlaneFlyby();
      } else if (clickedBuilding(event.clientX, event.clientY)) {
        startMidnightBuildingSleep();
      }
    };

    build();
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener(NAME_STAR_GLOW_EVENT, onNameStarGlow);
    window.addEventListener(SUNRISE_SKYLINE_GLOW_EVENT, onSunriseSkylineGlow);

    let clockTimer = 0;
    if (reduced) {
      drawCurrentScene(0);
      clockTimer = window.setInterval(() => drawCurrentScene(0), 30000);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      build();
      if (reduced) drawCurrentScene(0);
    };
    window.addEventListener("resize", onResize);

    const phaseObserver = new MutationObserver(() => {
      drawCurrentScene(0);
    });
    phaseObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sky-override"] });

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(clockTimer);
      window.clearTimeout(sunriseSkylineGlowResetTimer);
      window.clearTimeout(midnightBuildingSleepTimer);
      window.clearTimeout(midnightBuildingResetTimer);
      window.clearTimeout(moonPhasePreviewTimer);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener(NAME_STAR_GLOW_EVENT, onNameStarGlow);
      window.removeEventListener(SUNRISE_SKYLINE_GLOW_EVENT, onSunriseSkylineGlow);
      window.removeEventListener("resize", onResize);
      planeSprite.removeEventListener("load", onPlaneSpriteLoad);
      delete canvas.dataset.moonPhase;
      delete canvas.dataset.moonPhaseSource;
      delete canvas.dataset.moonDateToronto;
      delete canvas.dataset.buildingLights;
      delete canvas.dataset.ferryPaused;
      delete canvas.dataset.ferryLights;
      phaseObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        pointerEvents: "none",
      }}
    />
  );
}
