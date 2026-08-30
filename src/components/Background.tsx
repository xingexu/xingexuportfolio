"use client";

import { useEffect, useRef } from "react";

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

/* ── bitmaps ── */

/** Moon disc at 1× cell scale (all pixels uniform): 1 body / 2 bright rim / 3 crater. */
function makeMoonMap(): number[][] {
  const n = 11;
  const cR = (n - 1) / 2;
  const map: number[][] = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => {
      const d = Math.hypot(r - cR, c - cR);
      if (d > cR + 0.4) return 0;
      if (d > cR - 0.9) return 2;
      return 1;
    })
  );
  for (const [r, c] of [[3, 4], [6, 7], [7, 3], [4, 7]] as const) map[r][c] = 3;
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

/* ── types ── */

type Star = { x: number; y: number; big: boolean; level: number; every: number; acc: number; color: string };
type Sparkle = { x: number; y: number; ttl: number; color: string };
type Cloud = { x: number; y: number; bob: number; map: number[][]; every: number; acc: number; bobEvery: number; bobAcc: number; front: boolean };
type Flock = { x: number; y: number; frame: number; acc: number; scatterElapsed: number | null };
type Balloon = {
  x: number;
  y: number;
  sway: number;
  bob: number;
  acc: number;
  yAcc: number;
  jiggleElapsed: number | null;
};
type Building = {
  x: number; w: number; h: number; near: boolean; shade: number; antenna: number;
  roof: "flat" | "tank" | "ac"; setback: number; windows: { wx: number; wy: number }[];
};
type Trail = { x: number; y: number }[];

const BIRD_FORMATION = [[0, 0], [-7, 3], [-6, -3]] as const;
const BIRD_SCATTERED = [[8, -5], [-17, 9], [-14, -10]] as const;
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
    let clouds: Cloud[] = [];
    let buildings: Building[] = [];
    let litWindows = new Set<string>();
    let glints: { x: number; y: number }[] = [];
    let flock: Flock | null = null;
    let flockWait = 5000 + Math.random() * 5000;
    let audioContext: AudioContext | null = null;
    let plane: { x: number; y: number; acc: number; blink: boolean } | null = null;
    let planeWait = 8000 + Math.random() * 10000;
    let satellite: { x: number; y: number; acc: number } | null = null;
    let satWait = 6000 + Math.random() * 8000;
    let balloon: Balloon | null = null;
    let balloonWait = 4000 + Math.random() * 6000;
    let shooting: { cells: Trail; acc: number } | null = null;
    let shootWait = 3000 + Math.random() * 5000;
    let windowAcc = 0;
    let glintAcc = 0;
    let waveAcc = 0;
    let wavePhase = 0;
    let pulseAcc = 0;
    let pulse = 0; // 0..3 shared pulse phase for sun/moon halos
    let beaconAcc = 0;
    let beaconOn = true;
    let skyNight: HTMLCanvasElement | null = null;
    let skyDay: HTMLCanvasElement | null = null;
    let skylineNight: HTMLCanvasElement | null = null;
    let skylineDay: HTMLCanvasElement | null = null;

    function getAudioContext() {
      if (audioContext) return audioContext;
      const AudioContextConstructor = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return null;
      audioContext = new AudioContextConstructor();
      return audioContext;
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

    function clickedBird(clientX: number, clientY: number) {
      if (theme() !== "light" || !flock) return false;
      const x = clientX / CELL;
      const y = clientY / CELL;
      return birdOffsets().some(([dx, dy]) => {
        const bx = flock!.x + dx;
        const by = flock!.y + dy;
        return x >= bx - 4 && x <= bx + 4 && y >= by - 2 && y <= by + 3;
      });
    }

    function clickedBalloon(clientX: number, clientY: number) {
      if (theme() !== "light" || !balloon) return false;
      const x = clientX / CELL;
      const y = clientY / CELL;
      const jiggle = balloonJiggleOffset();
      const balloonX = balloon.x + balloon.sway + jiggle.x;
      const balloonY = balloon.y + balloon.bob + jiggle.y;
      return x >= balloonX && x <= balloonX + BALLOON[0].length * BALLOON_SCALE &&
        y >= balloonY && y <= balloonY + BALLOON.length * BALLOON_SCALE;
    }

    function birdOffsets(): readonly (readonly [number, number])[] {
      if (!flock || flock.scatterElapsed === null || flock.scatterElapsed >= 960) {
        return BIRD_FORMATION;
      }

      const elapsed = flock.scatterElapsed;
      const amount = elapsed < 120 || elapsed >= 840
        ? 0.33
        : elapsed < 240 || elapsed >= 720
          ? 0.66
          : 1;
      return BIRD_FORMATION.map(([baseX, baseY], index) => {
        const [scatterX, scatterY] = BIRD_SCATTERED[index];
        return [
          Math.round(baseX + (scatterX - baseX) * amount),
          Math.round(baseY + (scatterY - baseY) * amount),
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

    const theme = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
    // These lanes include the full scatter/jiggle extents: plane→birds keeps
    // at least 6 cells clear, and birds→balloon keeps at least 7 cells clear.
    const airplaneLaneY = () => Math.max(13, Math.floor(rows * 0.1));
    const birdLaneY = () => Math.max(airplaneLaneY() + 17, Math.floor(rows * 0.24));
    const balloonLaneY = () => Math.max(birdLaneY() + 22, Math.floor(rows * 0.42));
    const cnTowerX = () => Math.floor(cols * 0.22);
    const towerDims = () => {
      const h = Math.min(Math.floor(rows * 0.46), 64);
      // main pod sits ~62% up the tower, like the real thing
      return { tx: cnTowerX(), h, top: waterTop - h, podY: waterTop - Math.floor(h * 0.62) };
    };
    // low-rise zone around the landmarks so they stand against open sky
    const landmarkZone = () => ({ from: cnTowerX() - 12, to: cnTowerX() + 46 });

    /* ── static layers ── */

    /** Sky gradient rendered as full noise-dither: no visible band edges,
     *  every row is a probabilistic blend of its two nearest band colors. */
    function renderSky(bands: string[]) {
      const off = document.createElement("canvas");
      off.width = canvas!.width;
      off.height = canvas!.height;
      const o = off.getContext("2d")!;
      const rng = mulberry32(SEED ^ 0x51ed270b);
      const segs = bands.length - 1;

      for (let y = 0; y < rows; y++) {
        const f = Math.min((y / rows) * segs, segs - 0.0001);
        const i = Math.floor(f);
        const frac = f - i;
        for (let x = 0; x < cols; x++) {
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
    }

    /** Skyline with per-building shading, lit edges, roof details and an accurate CN Tower. */
    function renderSkyline(pal: typeof NIGHT | typeof DAY, dayWindow: string | null) {
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

      if (plane) plane.y = airplaneLaneY();
      if (flock) flock.y = birdLaneY();
      if (balloon) balloon.y = balloonLaneY();

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
          y: 13 + Math.floor(rng() * Math.max(6, rows * 0.48)), // 13 = below the fixed nav
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

    function stepPulse(dt: number) {
      if (reduced) return;
      pulseAcc += dt;
      if (pulseAcc >= 360) {
        pulseAcc = 0;
        pulse = (pulse + 1) % 4;
      }
    }

    function drawWater(pal: typeof NIGHT | typeof DAY, laneColor: string, laneX: number, dt: number) {
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

    function drawLitWindows(dt: number) {
      if (!reduced) {
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
          if (!litWindows.has(`${b.x}:${i}`)) continue;
          const w = b.windows[i];
          cell(b.x + w.wx, waterTop - b.h + w.wy, NIGHT.window, 0.95);
        }
      }
      // CN Tower pod lights + blinking aviation beacon
      const { tx, top, podY } = towerDims();
      for (const dx of [-5, -3, -1, 1, 3, 5]) cell(tx + dx, podY + 1, NIGHT.window, 0.9);
      if (!reduced) {
        beaconAcc += dt;
        if (beaconAcc >= 900) {
          beaconAcc = 0;
          beaconOn = !beaconOn;
        }
      }
      if (beaconOn) {
        cell(tx, top, NIGHT.beacon, 0.95);
        cell(tx, top, NIGHT.beacon, 0.95);
        cell(tx - 1, top, NIGHT.beacon, 0.2);
        cell(tx + 1, top, NIGHT.beacon, 0.2);
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
        cell(s.x, s.y, s.color, alpha);
        if (s.big && s.level >= 2) {
          cell(s.x + 1, s.y, s.color, alpha * 0.4);
          cell(s.x - 1, s.y, s.color, alpha * 0.4);
          cell(s.x, s.y + 1, s.color, alpha * 0.4);
          cell(s.x, s.y - 1, s.color, alpha * 0.4);
        }
      }
      if (!reduced) {
        sparkleAcc += dt;
        if (sparkleAcc >= 480) {
          sparkleAcc = 0;
          const s = stars[Math.floor(Math.random() * stars.length)];
          if (s) sparkles.push({ x: s.x, y: s.y, ttl: 3, color: s.color });
        }
        sparkles = sparkles.filter((sp) => sp.ttl-- > 0);
        for (const sp of sparkles) {
          const a = 0.3 * sp.ttl;
          cell(sp.x, sp.y, "#ffffff", Math.min(1, a + 0.3));
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            cell(sp.x + dx, sp.y + dy, sp.color, a * 0.7);
          }
          if (sp.ttl >= 2) {
            cell(sp.x + 2, sp.y, sp.color, a * 0.3);
            cell(sp.x - 2, sp.y, sp.color, a * 0.3);
            cell(sp.x, sp.y + 2, sp.color, a * 0.3);
            cell(sp.x, sp.y - 2, sp.color, a * 0.3);
          }
        }
      }

      // moon: pulsing halo + crater-shaded body (1× cells, uniform pixel size)
      const mx = Math.floor(cols * 0.82);
      const my = Math.floor(rows * 0.1);
      halo(mx + 5, my + 5, "#e8e0c8", pulse, 6);
      sprite(MOON_MAP, mx, my, { 1: NIGHT.moonBody, 2: NIGHT.moonShade, 3: NIGHT.moonCrater }, 1);

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
              cells: [{ x: Math.floor(Math.random() * cols * 0.6), y: Math.floor(Math.random() * rows * 0.2) }],
              acc: 0,
            };
            shootWait = 5000 + Math.random() * 7000;
          }
        }

        // plane with blinking beacon
        if (plane) {
          plane.acc += dt;
          if (plane.acc >= 130) {
            plane.acc = 0;
            plane.x -= 1;
            plane.blink = !plane.blink;
            if (plane.x < -6) plane = null;
          }
          if (plane) {
            cell(plane.x, plane.y, "#9fb3c8", 0.9);
            cell(plane.x + 1, plane.y, "#9fb3c8", 0.9);
            cell(plane.x + 2, plane.y, "#7c93ab", 0.9);
            if (plane.blink) cell(plane.x + 3, plane.y, NIGHT.beacon, 0.95);
          }
        } else {
          planeWait -= dt;
          if (planeWait <= 0) {
            plane = { x: cols + 4, y: airplaneLaneY(), acc: 0, blink: false };
            planeWait = 16000 + Math.random() * 18000;
          }
        }

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
            satellite = { x: -2, y: Math.floor(rows * (0.2 + Math.random() * 0.3)), acc: 0 };
            satWait = 14000 + Math.random() * 14000;
          }
        }
      }

      if (skylineNight) ctx!.drawImage(skylineNight, 0, 0);
      drawLitWindows(dt);
      drawWater(NIGHT, NIGHT.moonLane, mx + 5, dt);
    }

    /* ── day ── */

    function drawDay(dt: number) {
      if (skyDay) ctx!.drawImage(skyDay, 0, 0);
      stepPulse(dt);

      // sun: pulsing halo + whole-disc flash (1× cells, no rays, uniform pixel size)
      const sx = Math.floor(cols * 0.8);
      const sy = Math.max(13, Math.floor(rows * 0.07)); // keep clear of the fixed nav
      halo(sx + 8, sy + 8, "#ffe79a", pulse, 9);
      const hot = pulse % 2 === 0;
      sprite(SUN_MAP, sx, sy, {
        1: hot ? "#ffdf6e" : DAY.sunCore,
        3: hot ? "#fff4bd" : "#ffe066",
        4: hot ? "#f7bd45" : DAY.sunRim,
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
              c.y = 13 + Math.floor(Math.random() * Math.max(6, rows * 0.48));
            }
          }
          c.bobAcc += dt;
          if (c.bobAcc >= c.bobEvery) {
            c.bobAcc = 0;
            c.bob = c.bob === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
          }
        }
        if (!c.front)
          sprite(c.map, c.x, c.y + c.bob, { 1: DAY.cloudBack, 2: DAY.cloudBackShade, 3: DAY.cloudBackHi, 4: DAY.cloudBackMid }, 1);
      }
      for (const c of clouds) {
        if (c.front)
          sprite(c.map, c.x, c.y + c.bob, { 1: DAY.cloudFront, 2: DAY.cloudShade, 3: DAY.cloudFrontHi, 4: DAY.cloudFrontMid }, 1);
      }

      if (!reduced) {
        // bird flock
        if (flock) {
          flock.acc += dt;
          if (flock.scatterElapsed !== null) {
            flock.scatterElapsed += dt;
            if (flock.scatterElapsed >= 960) flock.scatterElapsed = null;
          }
          if (flock.acc >= 150) {
            flock.acc = 0;
            flock.x += 1;
            flock.frame = flock.frame ? 0 : 1;
            if (flock.x > cols + 8) flock = null;
          }
          if (flock) {
            for (const [dx, dy] of birdOffsets()) {
              const bx = flock.x + dx;
              const by = flock.y + dy;
              const wingY = by + (flock.frame ? 0 : 1);
              // 2×-scale bird: wing tips, wing arms, body
              ctx!.fillStyle = DAY.birdWing;
              ctx!.fillRect((bx - 3) * CELL, (wingY - 1) * CELL, CELL, CELL);
              ctx!.fillRect((bx + 3) * CELL, (wingY - 1) * CELL, CELL, CELL);
              ctx!.fillStyle = DAY.bird;
              ctx!.fillRect((bx - 2) * CELL, wingY * CELL, 2 * CELL, CELL);
              ctx!.fillRect((bx + 1) * CELL, wingY * CELL, 2 * CELL, CELL);
              ctx!.fillRect((bx - 1) * CELL, (by + (flock.frame ? 1 : 0)) * CELL, 2 * CELL, CELL);
            }
          }
        } else {
          flockWait -= dt;
          if (flockWait <= 0) {
            flock = {
              x: -8,
              y: birdLaneY(),
              frame: 0,
              acc: 0,
              scatterElapsed: null,
            };
            flockWait = 11000 + Math.random() * 10000;
          }
        }

        // hot-air balloon: slow drift with stepped sway
        if (balloon) {
          balloon.acc += dt;
          if (balloon.acc >= 600) {
            balloon.acc = 0;
            balloon.x += 1;
            balloon.sway = balloon.sway === 0 ? 1 : 0;
            if (balloon.x > cols + 6) balloon = null;
          }
          if (balloon) {
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
            sprite(BALLOON, balloon.x + balloon.sway + jiggle.x, balloon.y + balloon.bob + jiggle.y, {
              1: DAY.balloonA,
              2: DAY.balloonB,
              3: DAY.basket,
              4: DAY.rope,
            }, BALLOON_SCALE);
          }
        } else {
          balloonWait -= dt;
          if (balloonWait <= 0) {
            balloon = {
              x: -BALLOON[0].length * BALLOON_SCALE,
              y: balloonLaneY(),
              sway: 0,
              bob: 0,
              acc: 0,
              yAcc: 0,
              jiggleElapsed: null,
            };
            balloonWait = 18000 + Math.random() * 16000;
          }
        }

        // plane crosses by day too
        if (plane) {
          plane.acc += dt;
          if (plane.acc >= 130) {
            plane.acc = 0;
            plane.x -= 1;
            plane.blink = !plane.blink;
            if (plane.x < -6) plane = null;
          }
          if (plane) {
            cell(plane.x, plane.y, DAY.planeBody, 0.95);
            cell(plane.x + 1, plane.y, DAY.planeBody, 0.95);
            cell(plane.x + 2, plane.y, DAY.planeTail, 0.95);
            cell(plane.x + 2, plane.y - 1, DAY.planeTail, 0.95); // tail fin
            if (plane.blink) cell(plane.x + 3, plane.y, NIGHT.beacon, 0.95);
          }
        } else {
          planeWait -= dt;
          if (planeWait <= 0) {
            plane = { x: cols + 4, y: airplaneLaneY(), acc: 0, blink: false };
            planeWait = 16000 + Math.random() * 18000;
          }
        }
      }

      if (skylineDay) ctx!.drawImage(skylineDay, 0, 0);
      drawWater(DAY, DAY.sunLane, sx + 7, dt);
    }

    /* ── loop ── */

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = last ? now - last : TICK;
      if (dt < TICK) return;
      last = now;
      if (theme() === "light") drawDay(dt);
      else drawNight(dt);
    }

    const onPointerDown = (event: PointerEvent) => {
      if (clickedBalloon(event.clientX, event.clientY)) {
        if (balloon) balloon.jiggleElapsed = 0;
        playBalloonJiggle();
      } else if (clickedBird(event.clientX, event.clientY)) {
        if (flock) flock.scatterElapsed = 0;
        playChirp();
      }
    };

    build();
    window.addEventListener("pointerdown", onPointerDown);

    if (reduced) {
      if (theme() === "light") drawDay(0);
      else drawNight(0);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      build();
      if (reduced) (theme() === "light" ? drawDay : drawNight)(0);
    };
    window.addEventListener("resize", onResize);

    const observer = new MutationObserver(() => {
      if (reduced) (theme() === "light" ? drawDay : drawNight)(0);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onPointerDown);
      void audioContext?.close();
      window.removeEventListener("resize", onResize);
      observer.disconnect();
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
