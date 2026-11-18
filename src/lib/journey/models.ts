import { Grid, hash3, shade, textWidth, type Color } from "./voxel";
import { LOGOS, type PixelLogo } from "./logos";

/* Every prop is authored facing +z with y = 0 on the floor. */
type Painter = (i: number, j: number) => Color | null;

const WOOD = 0xa47148, WOOD_DARK = 0x6e4a2f, WHITE = 0xf2f0ea, BLACK = 0x18181c, METAL = 0x9aa3ab, METAL_DARK = 0x5c636b;
const GOLD = 0xd9ad3c, SKY = 0x8ec9ef;

function table(g: Grid, w: number, d: number, h: number, top: Color, leg: Color, x = -Math.floor(w / 2), z = -Math.floor(d / 2)) {
  g.box(x, h - 1, z, w, 1, d, top);
  for (const [lx, lz] of [[x, z], [x + w - 1, z], [x, z + d - 1], [x + w - 1, z + d - 1]]) g.box(lx, 0, lz, 1, h - 1, 1, leg);
}

function chair(g: Grid, x: number, z: number, seat: Color, frame: Color, h = 6, facing: 1 | -1 = -1) {
  g.box(x, h - 1, z, 5, 1, 5, seat);
  for (const [lx, lz] of [[x, z], [x + 4, z], [x, z + 4], [x + 4, z + 4]]) g.box(lx, 0, lz, 1, h - 1, 1, frame);
  const back = facing === -1 ? z + 4 : z;
  g.box(x, h, back, 5, 6, 1, seat);
}

/** Paints a flat panel on the XY plane at depth z, rows counted from the top. */
function panel(g: Grid, x: number, y: number, z: number, w: number, h: number, paint: Painter) {
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
    const color = paint(i, j);
    if (color !== null) g.set(x + i, y + h - 1 - j, z, color);
  }
}

function frame(g: Grid, w: number, h: number, border: Color, paint: Painter, depth = 1) {
  const x = -Math.floor(w / 2);
  g.box(x, 0, -depth, w, h, depth, border);
  panel(g, x + 1, 1, 0, w - 2, h - 2, paint);
}

function centeredText(g: Grid, text: string, y: number, z: number, color: Color, cx = 0, scale = 1) {
  g.text(text, cx - Math.floor(textWidth(text, scale) / 2), y, z, color, scale);
}

function sphere(g: Grid, cx: number, cy: number, cz: number, r: number, color: (x: number, y: number, z: number) => Color) {
  const R = Math.ceil(r);
  for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) for (let z = -R; z <= R; z++) {
    if (x * x + y * y + z * z <= r * r) g.set(cx + x, cy + y, cz + z, color(x, y, z));
  }
}

function disc(g: Grid, cx: number, y: number, cz: number, r: number, color: (x: number, z: number) => Color | null) {
  const R = Math.ceil(r);
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    if (x * x + z * z <= r * r) { const c = color(x, z); if (c !== null) g.set(cx + x, y, cz + z, c); }
  }
}

function monitor(g: Grid, x: number, y: number, z: number, w: number, h: number, screen: Painter, bezel = BLACK) {
  g.box(x, y, z - 1, w, h, 1, bezel);
  panel(g, x + 1, y + 1, z, w - 2, h - 2, screen);
  const cx = x + Math.floor(w / 2);
  g.box(cx - 1, y - 2, z - 1, 2, 2, 1, bezel).box(cx - 3, y - 2, z - 3, 6, 1, 3, bezel);
}

function desk(g: Grid, screen: Painter, chairColor: Color, top = WOOD, leg = WOOD_DARK) {
  table(g, 20, 10, 10, top, leg, -10, -5);
  g.box(-10, 0, -5, 1, 9, 10, leg).box(9, 0, -5, 1, 9, 10, leg);
  monitor(g, -6, 12, -2, 12, 9, screen);
  g.box(-5, 10, 1, 9, 1, 3, 0x2b2d33);
  for (let i = 0; i < 8; i += 2) g.set(-4 + i, 10, 2, 0x50545c);
  g.box(6, 10, 2, 2, 1, 2, 0xd8d8d8);
  g.box(-9, 0, -4, 4, 9, 7, 0x2c2f36).set(-7, 7, 3, 0x60e070);
  chair(g, -2, 7, chairColor, 0x333333, 6, -1);
}

const AGAR_CELLS: [number, number, number, Color][] = [[3, 3, 2.2, 0x55c35a], [7, 4, 1.5, 0xe5534b], [6, 1, 0.9, 0x9b59d0], [2, 6, 1, 0xf2b134]];
const agar: Painter = (i, j) => {
  for (const [cx, cy, r, c] of AGAR_CELLS) {
    const d = Math.hypot(i - cx, j - cy);
    if (d <= r) return d > r - 0.9 ? shade(c, 0.75) : c;
  }
  if (hash3(i, j, 7) > 0.88) return [0xe5534b, 0x55c35a, 0x4a90e2, 0xf2b134][Math.floor(hash3(j, i, 3) * 4)];
  return i % 3 === 0 || j % 3 === 0 ? 0xd9e1e6 : 0xf3f6f8;
};
const scratch: Painter = (i, j) => {
  if (i < 4) return j % 2 === 0 ? [0xf6a23c, 0xffcc3d, 0x4c97ff, 0x9966ff][(j / 2) % 4] : 0xffffff;
  if (i === 4) return 0xe9edf2;
  const cat = ["..##.", ".###.", "#####", ".###.", ".#.#."];
  const row = cat[j - 1]?.[i - 5];
  return row === "#" ? 0xf6a23c : 0xffffff;
};
const code = (seed: number): Painter => (i, j) => {
  const length = 2 + Math.floor(hash3(j, seed, 1) * 8);
  const indent = Math.floor(hash3(j, seed, 2) * 3);
  if (i >= indent && i < indent + length && j % 1 === 0) return [0x7fc8ff, 0xf3b562, 0xa6e22e, 0xf06a9a, 0xd0d0d0][Math.floor(hash3(i >> 2, j, seed) * 5)];
  return 0x1d1f27;
};

function bed(g: Grid, quilt: Color, accent: Color, frameColor: Color, pillow: Color, pattern: (x: number, z: number) => boolean) {
  const w = 16, len = 28;
  g.box(-8, 0, -14, w, 4, len, frameColor);
  g.box(-8, 4, -14, w, 2, len, 0xf4f1ea);
  g.box(-8, 0, -15, w, 13, 2, frameColor).box(-8, 13, -15, w, 1, 2, shade(frameColor, 1.15));
  for (const x of [-7, 1]) g.box(x, 6, -12, 6, 2, 5, shade(pillow, 0.85)).box(x + 1, 8, -11, 4, 1, 3, pillow);
  g.box(-8, 6, -6, w, 1, 20, (x, _y, z) => pattern(x, z) ? accent : shade(quilt, (x + 8) % 4 === 0 || (z + 6) % 4 === 0 ? 0.9 : 1.04));
  g.box(-8, 7, -7, w, 1, 2, shade(accent, 0.9));
  for (const x of [-9, 8]) g.box(x, 3, -6, 1, 4, 20, (_x, y, z) => shade(quilt, y === 3 ? 0.72 : 0.85 + 0.16 * Math.abs(Math.sin(z * 1.2))));
  g.box(-8, 3, 14, w, 4, 1, quilt);
  g.box(-8, 0, 13, 1, 2, 1, frameColor);
}

function shelfUnit(g: Grid, w: number, h: number, d: number, shelves: number[], color: Color) {
  const x = -Math.floor(w / 2), z = -Math.floor(d / 2);
  g.box(x, 0, z, 1, h, d, color).box(x + w - 1, 0, z, 1, h, d, color).box(x, 0, z, w, h, 1, shade(color, 0.85));
  g.box(x, h - 1, z, w, 1, d, color).box(x, 0, z, w, 1, d, color);
  for (const y of shelves) g.box(x, y, z, w, 1, d, color);
}

function books(g: Grid, x0: number, y: number, z: number, count: number, seed: number) {
  const colors = [0xc0392b, 0x2e6da4, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xe67e22, 0x34495e, 0xecf0f1];
  for (let i = 0; i < count; i++) {
    const h = 4 + Math.floor(hash3(i, seed, 1) * 3);
    g.box(x0 + i, y, z, 1, h, 4, colors[Math.floor(hash3(i, seed, 2) * colors.length)]);
  }
}

function maple(g: Grid, x: number, y: number, z: number, color: Color) {
  const leaf = ["....#....", "...###...", "#.#####.#", "#########", ".#######.", "..#####..", ".#######.", "....#....", "....#...."];
  leaf.forEach((row, r) => [...row].forEach((c, i) => { if (c === "#") g.set(x + i, y + 8 - r, z, color); }));
}

function plane(g: Grid) {
  const body = (x: number, y: number) => y < -2 ? 0xd9dde2 : 0xf7f7f5;
  for (let z = -32; z <= 30; z++) {
    let r = 6, cy = 10;
    if (z < -24) r = Math.max(1.5, 6 * Math.sqrt((z + 33) / 9));
    if (z > 16) { const t = (z - 16) / 14; r = 6 - t * 4; cy = 10 + t * 3; }
    const R = Math.ceil(r);
    for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) {
      if (x * x + y * y <= r * r + 0.5) g.set(x, Math.round(cy + y), z, z > 16 && y > -1 ? 0xc8102e : body(x, y));
    }
  }
  for (let z = -22; z <= 14; z += 3) for (const x of [-6, 6]) g.set(x, 11, z, 0x2a4a6a);
  for (let x = -3; x <= 3; x++) g.set(x, 13, -27, 0x1e3448).set(x, 12, -28, 0x1e3448);
  g.box(6, 8, -14, 1, 6, 4, 0x26313c).box(-6, 8, -14, 1, 1, 1, 0xf7f7f5);
  for (let z = -27; z <= 20; z++) for (const x of [-6, 6]) if (g.has(x, 8, z) && !g.has(x === 6 ? 7 : -7, 8, z)) g.set(x, 8, z, 0xc8102e);
  for (let s = 7; s <= 27; s++) {
    const sweep = Math.round((s - 7) * 0.45), chord = Math.round(12 - (s - 7) * 0.35);
    for (const x of [s, -s]) {
      g.box(x, 6, -2 + sweep, 1, s < 16 ? 2 : 1, chord, 0xdde2e8);
      if (s === 27) g.box(x, 7, -2 + sweep, 1, 3, 3, 0xc8102e);
    }
  }
  for (const ex of [-14, 14]) {
    for (let z = -6; z <= 3; z++) for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) {
      if (x * x + y * y <= 5) g.set(ex + x, 4 + y, z, z === -6 && x * x + y * y <= 2 ? 0x30343a : 0xb8c0c8);
    }
  }
  for (let y = 14; y <= 27; y++) {
    const start = 18 + Math.round((y - 14) * 0.7);
    g.box(0, y, start, 1, 1, 30 - start + 1, 0xc8102e);
  }
  maple(g, 1, 16, 24, WHITE);
  for (let s = 0; s <= 10; s++) g.box(s, 12, 24 + Math.round(s * 0.3), 1, 1, 6 - Math.round(s * 0.3), 0xdde2e8).box(-s, 12, 24 + Math.round(s * 0.3), 1, 1, 6 - Math.round(s * 0.3), 0xdde2e8);
  for (const [x, z] of [[0, -24], [-4, 4], [4, 4]]) g.box(x, 2, z, 1, 3, 1, METAL_DARK).box(x, 0, z - 1, 1, 2, 3, 0x1a1a1a);
}

function airstairs(g: Grid) {
  g.box(-10, 0, -3, 4, 7, 6, 0xe8e8e8).box(-10, 7, -3, 4, 1, 6, 0x9aa0a6);
  for (let s = 0; s < 8; s++) {
    const x = -6 + s * 2, top = 7 - s;
    g.box(x, top, -3, 2, 1, 6, s % 2 ? 0xa0a6ac : 0x8c9298).box(x, top, -3, 1, 1, 6, 0xf2c230);
    g.box(x, 0, -3, 2, top, 1, 0xd6d6d6).box(x, 0, 2, 2, top, 1, 0xd6d6d6);
    g.box(x, top + 1, -3, 2, 1, 1, 0xd6d6d6).box(x, top + 5, -3, 2, 1, 1, 0xc8102e).box(x, top + 5, 2, 2, 1, 1, 0xc8102e).box(x, top + 1, 2, 2, 1, 1, 0xd6d6d6);
  }
  for (const z of [-3, 2]) g.box(-10, 8, z, 1, 5, 1, 0xd6d6d6).box(-10, 12, z, 4, 1, 1, 0xc8102e);
  g.box(-8, 0, -4, 2, 2, 1, 0x1a1a1a).box(6, 0, -4, 2, 2, 1, 0x1a1a1a).box(-8, 0, 3, 2, 2, 1, 0x1a1a1a).box(6, 0, 3, 2, 2, 1, 0x1a1a1a);
}

function suitcase(g: Grid, x: number, y: number, z: number, w: number, h: number, d: number, color: Color) {
  g.box(x, y, z, w, h, d, (i, j) => (i === x || i === x + w - 1) && j > y ? shade(color, 0.8) : color);
  g.box(x + Math.floor(w / 2) - 1, y + h, z + Math.floor(d / 2), 2, 1, 1, 0x222222);
}


/** A framed plaque showing a pixelized logo and its wordmark in the voxel font. */
function plaque(g: Grid, logo: PixelLogo, cols: [number, number], rowCount: number, word: string, border: Color) {
  const rows = logo.rows.slice(0, rowCount).map(row => row.slice(cols[0], cols[1]));
  const lw = cols[1] - cols[0], w = Math.max(lw, textWidth(word)) + 4, h = rowCount + 10;
  frame(g, w, h, border, () => logo.paper);
  const x0 = -Math.floor(lw / 2);
  rows.forEach((row, r) => [...row].forEach((c, i) => { if (c === "#") g.set(x0 + i, h - 3 - r, 1, logo.ink); }));
  centeredText(g, word, 2, 1, logo.ink);
}

type Pen = (x: number, y: number, color: Color) => void;

function badge(g: Grid, d: number, bg: Color, ring: Color, ink: (pen: Pen) => void) {
  const r = (d - 1) / 2;
  for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) {
    const q = x * x + y * y;
    if (q > (r + 0.5) ** 2) continue;
    g.set(x, y + r + 1, -1, ring).set(x, y + r + 1, 0, q <= (r - 0.6) ** 2 ? bg : ring);
  }
  ink((x, y, color) => g.set(x, y + r + 1, 1, color));
}

function line(pen: Pen, x0: number, y0: number, x1: number, y1: number, color: Color) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) pen(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), color);
}

function tee(g: Grid, x: number, color: Color, year: string) {
  g.box(x + 3, 0, 0, 7, 12, 1, color).box(x, 8, 0, 13, 4, 1, color).box(x, 6, 0, 3, 2, 1, color).box(x + 10, 6, 0, 3, 2, 1, color);
  g.box(x + 5, 11, 0, 3, 1, 1, shade(color, 0.7));
  g.text("JS", x + 3, 5, 1, 0xf2f2f2);
  g.text(year, x + 3, 0, 1, 0x9fb8e8);
  g.box(x + 6, 12, 0, 1, 2, 1, METAL).box(x + 2, 12, 0, 9, 1, 1, METAL);
}

const GLASS = 0x9dd8e4;
const DETAIL_VOXELS = new Set(["macbook", "glass-trophy-third", "glass-trophy-first"]);
export const modelVoxelSize = (id: string) => DETAIL_VOXELS.has(id) ? 0.25 : 1;
export const modelHasGlass = (id: string) => id.startsWith("glass-trophy-");
export const isGlass = (color: Color) => color === GLASS;
export const GLASS_OPACITY = 0.34;

function glassTrophy(g: Grid, place: string, metal: Color) {
  g.box(-27, 0, -9, 54, 2, 18, 0x15161b);
  g.box(-25, 2, -8, 50, 9, 16, 0x252a31);
  g.box(-23, 5, 8, 46, 7, 1, metal).box(-21, 6, 9, 42, 5, 1, 0x22262a);
  centeredText(g, place, 6, 10, 0xffedc7);
  g.box(-13, 10, -4, 26, 3, 8, metal);
  for (let y = 13; y < 51; y++) {
    const bevel = Math.max(0, 8 - Math.min(y - 13, 50 - y));
    for (let x = -18 + bevel; x <= 18 - bevel; x++) {
      const edge = Math.abs(x) >= 17 - bevel || y <= 14 || y >= 49;
      if (edge) g.box(x, y, -2, 1, 1, 4, y > 45 || x < -13 ? 0xe3fafe : 0x63aebe);
      else g.set(x, y, 0, GLASS);
    }
  }
  centeredText(g, "FBLA", 29, 1, 0xd8f4f7);
  for (let i = 0; i < 8; i++) g.set(-13 + i, 41 - i, 1, 0xd8f4f7);
}

function macbook(g: Grid) {
  const silver = 0xb5bfca, steel = 0x798694;
  g.box(-19, 0, -12, 38, 2, 24, steel).box(-18, 1, -12, 36, 1, 23, silver);
  g.box(-16, 2, -9, 32, 1, 11, 0x20232a);
  for (let x = -15; x < 16; x += 3) for (let z = -8; z <= 1; z += 3) g.set(x, 2, z, 0x59626f);
  g.box(-7, 2, 4, 14, 1, 6, 0x919da8).box(-6, 2, 5, 12, 1, 4, silver);
  g.box(-19, 2, -13, 38, 3, 2, BLACK);
  g.box(-19, 5, -14, 38, 24, 2, silver).box(-18, 6, -12, 36, 22, 1, BLACK);
  panel(g, -16, 8, -11, 32, 18, code(9));
  g.box(-2, 25, -11, 4, 1, 1, BLACK);
  centeredText(g, "MACBOOK", 1, 12, 0xedf2f6);
  const mark = [".....##.", "....##..", ".###....", "#######.", "######..", "######..", ".######.", "..####.."];
  mark.forEach((row, i) => [...row].forEach((c, x) => { if (c === "#") g.set(x - 4, 21 - i, -15, 0xe8edf4); }));
}

const MODELS: Record<string, (g: Grid) => void> = {
  plane,
  airstairs,
  "luggage-cart": g => {
    g.box(-6, 1, -9, 12, 1, 18, METAL).box(-6, 2, 8, 12, 10, 1, METAL).box(-6, 11, 8, 12, 1, 2, METAL_DARK);
    for (const [x, z] of [[-6, -9], [5, -9], [-6, 8], [5, 8]]) g.box(x, 0, z, 1, 1, 1, 0x1a1a1a);
    suitcase(g, -5, 2, -8, 10, 4, 8, 0xc0392b);
    suitcase(g, -5, 2, 1, 10, 5, 7, 0x2e4a7a);
    suitcase(g, -4, 6, -7, 8, 4, 6, 0x2fa39a);
    suitcase(g, -4, 7, 1, 7, 4, 5, 0xf2b134);
  },
  "welcome-sign": g => {
    g.box(-20, 0, -1, 2, 12, 2, METAL_DARK).box(18, 0, -1, 2, 12, 2, METAL_DARK);
    g.box(-22, 12, -1, 44, 20, 1, 0xc8102e);
    panel(g, -21, 13, 0, 42, 18, () => WHITE);
    maple(g, -19, 18, 1, 0xc8102e);
    g.text("WELCOME", -8, 23, 1, 0x1e1e1e);
    g.text("TO CANADA", -8, 15, 1, 0xc8102e);
  },
  cone: g => { g.box(-2, 0, -2, 4, 1, 4, 0xe8612c).box(-1, 1, -1, 2, 2, 2, 0xe8612c).box(-1, 3, -1, 2, 1, 2, WHITE).box(-1, 4, -1, 2, 1, 2, 0xe8612c); },
  "runway-light": g => { g.box(0, 0, 0, 1, 3, 1, METAL_DARK).box(-1, 3, -1, 3, 1, 3, 0x3c3c3c).set(0, 4, 0, 0x5aa9ff); },
  bench: g => { g.box(-8, 4, -2, 16, 1, 4, METAL).box(-8, 5, -2, 16, 5, 1, METAL); for (const x of [-7, 6]) g.box(x, 0, -2, 1, 4, 4, METAL_DARK); },
  "chess-table": g => {
    table(g, 12, 12, 8, WOOD_DARK, WOOD_DARK);
    g.box(-5, 8, -5, 10, 1, 10, 0x3b2616);
    for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) g.set(-4 + f, 9, -4 + r, (f + r) % 2 ? 0x6d4528 : 0xf0d9b5);
    const back = [2, 2, 2, 3, 4, 2, 2, 2];
    for (let f = 0; f < 8; f++) {
      g.box(-4 + f, 10, -4, 1, back[f], 1, 0x2a2a2e).box(-4 + f, 10, -3, 1, 1, 1, 0x2a2a2e);
      g.box(-4 + f, 10, 3, 1, back[f], 1, 0xfaf6ea).box(-4 + f, 10, 2, 1, 1, 1, 0xfaf6ea);
    }
    g.box(-2, 0, -12, 4, 5, 4, WOOD).box(-2, 0, 8, 4, 5, 4, WOOD);
  },
  "computer-desk-agario": g => desk(g, agar, 0xd3473c),
  "computer-desk-scratch": g => desk(g, scratch, 0x3d7dd8, 0xc9c2b2, METAL_DARK),
  "computer-desk-code": g => desk(g, code(4), 0x3b3f4a),
  "badminton-rack": g => {
    g.box(-9, 0, -1, 18, 18, 1, 0xd8b98a);
    for (let i = 0; i < 18; i += 3) for (let j = 1; j < 18; j += 3) g.set(-9 + i + 1, j, -1, 0xb89a6c);
    for (const [cx, dir] of [[-3, 1], [3, -1]] as const) {
      for (let t = 0; t <= 16; t++) {
        const x = cx + Math.round(dir * (t - 8) * 0.25), y = 1 + t;
        if (t < 7) g.set(x, y, 0, 0x2a2a2a);
        else {
          const dy = (t - 12), half = Math.round(Math.sqrt(Math.max(0, 1 - (dy / 5) ** 2)) * 3);
          for (let k = -half; k <= half; k++) g.set(x + k, y, 0, Math.abs(k) === half || Math.abs(dy) >= 4 ? (dir > 0 ? 0x2b6cb0 : 0xc53030) : (k + t) % 2 ? 0xf5f5f5 : 0xdadada);
        }
      }
    }
    for (const x of [-7, 7]) g.box(x, 4, 0, 1, 2, 1, 0xc49a6c).box(x - 1, 6, 0, 3, 2, 1, WHITE).box(x - 1, 8, 0, 3, 1, 1, 0xe8e8e8);
  },
  "bed-kid": g => bed(g, 0x5b8fd1, 0xf4d35e, 0xd9c3a0, WHITE, (x, z) => (x + z * 3) % 7 === 0),
  "bed-navy": g => bed(g, 0x2c3e66, 0x8fa3c7, WOOD_DARK, 0xe8eef6, (_x, z) => z % 5 === 0),
  "bed-western": g => bed(g, 0x5a5f6a, 0x4f2683, 0x2f3238, 0x4f2683, (x) => x === -8 || x === 7),
  "lego-shelf": g => {
    shelfUnit(g, 20, 14, 5, [6], WHITE);
    const bricks = [0xd32f2f, 0x1976d2, 0xfbc02d, 0x388e3c, 0xf57c00];
    for (let i = 0; i < 6; i++) g.box(-8 + i * 3, 1, 0, 2, 1 + (i % 3), 2, bricks[i % 5]);
    g.box(-6, 7, -1, 7, 1, 3, 0xbfc5cb).box(-3, 8, -1, 1, 1, 3, 0xbfc5cb).box(-6, 8, -1, 1, 1, 1, 0xd32f2f).box(0, 8, -1, 1, 1, 1, 0xd32f2f);
    g.box(3, 7, 0, 2, 3, 1, 0xfbc02d).box(3, 10, 0, 2, 1, 1, 0xfde0a0).box(6, 7, 0, 2, 2, 1, 0x1976d2);
  },
  window: g => {
    g.box(-8, 0, -1, 16, 13, 1, WHITE);
    panel(g, -7, 1, 0, 14, 11, (i, j) => i === 7 || j === 5 ? WHITE : j < 3 ? 0xb9e2f7 : j > 8 ? 0x9fd28a : SKY);
    g.box(-9, 0, 0, 18, 1, 2, WHITE);
  },
  "starwars-posters": g => {
    g.box(-12, 0, -1, 11, 15, 1, 0xeeeeee);
    panel(g, -11, 1, 0, 9, 13, (i, j) => {
      const d = Math.hypot(i - 4, j - 5);
      if (d < 3.6) return d > 2.6 && i < 6 && j < 4 ? 0x7a7f86 : (j === 5 ? 0x5b6066 : 0x9aa0a6);
      return hash3(i, j, 11) > 0.85 ? WHITE : 0x0b0d1a;
    });
    g.box(0, 0, -1, 11, 15, 1, 0xeeeeee);
    panel(g, 1, 1, 0, 9, 13, (i, j) => (i + j === 9 && j > 1) ? 0x4fc3ff : (i === j && j > 1 && j < 11) ? 0xff4d4d : j > 10 ? 0x161616 : 0x0f1530);
    g.text("SW", 2, 10, 1, 0xf6d23c);
  },
  "candy-jar": g => {
    g.box(-3, 0, -3, 6, 6, 6, 0xe2c48f).box(-3, 6, -3, 6, 1, 6, 0xc9a66b);
    for (let y = 7; y < 13; y++) g.box(-2, y, -2, 4, 1, 4, (x, _y, z) => (Math.abs(x + 0.5) < 1.5 && Math.abs(z + 0.5) < 1.5 && y < 11) ? [0xff5e78, 0x6bd16b, 0xffd23f, 0x5aa9ff, 0xb57bff][Math.floor(hash3(x, y, z) * 5)] : 0xd6eef6);
    g.box(-2, 13, -2, 4, 1, 4, 0xff7aa8).set(0, 14, 0, 0xff7aa8);
  },
  "toy-box": g => { g.box(-5, 0, -3, 10, 6, 6, 0xd94a3d).box(-5, 6, -3, 10, 1, 6, 0xf4c542).box(-1, 3, 3, 2, 2, 1, 0xf4c542); },
  "rug-round": g => disc(g, 0, 0, 0, 11.5, (x, z) => { const d = Math.hypot(x, z); return d > 10 ? 0xc0504d : d > 7 ? 0xf2e3c6 : d > 4 ? 0x6a9fb5 : 0xf2e3c6; }),
  "school-desks": g => {
    for (const [x, z] of [[-9, -10], [1, -10], [-9, 4], [1, 4]]) {
      g.box(x, 8, z, 8, 1, 6, 0xd8c39b).box(x, 6, z, 8, 1, 6, METAL_DARK);
      for (const [lx, lz] of [[x, z], [x + 7, z], [x, z + 5], [x + 7, z + 5]]) g.box(lx, 0, lz, 1, 8, 1, METAL_DARK);
      g.box(x + 1, 9, z + 1, 3, 1, 4, [0xe53935, 0x1e88e5, 0x43a047, 0xfdd835][Math.abs(x + z) % 4]).box(x + 5, 9, z + 2, 2, 1, 1, 0xf6c343);
      chair(g, x + 2, z + 7, 0x3b82c4, METAL_DARK, 5, -1);
    }
  },
  chalkboard: g => {
    g.box(-11, 0, -1, 22, 17, 1, WOOD);
    panel(g, -10, 1, 0, 20, 15, () => 0x2f4f3a);
    g.text("HELLO", -9, 9, 1, 0xf2f2f2);
    g.text("1+1=2", -9, 2, 1, 0xf6e27a);
    g.box(-10, 0, 0, 20, 1, 2, WOOD).set(-6, 1, 1, WHITE).set(2, 1, 1, 0xf6e27a);
  },
  "pi-bench": g => {
    table(g, 22, 10, 10, 0x8b9096, METAL_DARK, -11, -5);
    for (const x of [-9, -3]) {
      g.box(x, 10, -2, 5, 1, 4, 0x1f7a3a).box(x + 3, 11, -2, 2, 1, 2, 0xc0c0c0).box(x, 11, -2, 1, 1, 1, 0xd4af37).set(x + 1, 11, 1, 0xff3030);
    }
    g.box(3, 10, -3, 6, 1, 6, 0xf4f4f0);
    for (let i = 0; i < 5; i++) g.set(4 + i, 11, -2 + (i % 3), [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xff8f00][i]);
    monitor(g, 2, 13, -3, 9, 7, (i, j) => {
      const ecg = [3, 3, 3, 2, 3, 0, 4, 3, 3, 3, 2];
      return ecg[(i + 1) % ecg.length] === j ? 0x52ff7a : 0x081410;
    });
    g.box(-9, 10, 2, 1, 1, 3, 0xe53935).box(-8, 10, 4, 4, 1, 1, 0xe53935).box(-3, 10, 3, 1, 1, 2, 0x1e88e5);
    g.box(-10, 11, -4, 3, 3, 3, 0xd62839).set(-9, 14, -3, 0xd62839);
    g.box(-2, 0, 7, 4, 6, 4, WOOD);
  },
  "bookshelf-class": g => { shelfUnit(g, 18, 18, 6, [6, 12], WOOD); books(g, -8, 1, -1, 16, 1); books(g, -8, 7, -1, 14, 2); books(g, -8, 13, -1, 12, 3); },
  clock: g => {
    for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) {
      const d = Math.hypot(x, y);
      if (d <= 4.2) g.set(x, y + 4, 0, d > 3.2 ? BLACK : (x === 0 && y >= 0 && y < 3) || (y === 0 && x >= 0 && x < 2) ? BLACK : WHITE);
    }
  },
  "globe-stand": g => { g.box(-2, 0, -2, 4, 1, 4, WOOD_DARK).box(0, 1, 0, 1, 7, 1, GOLD); sphere(g, 0, 11, 0, 3.4, (x, y, z) => hash3(x + 9, y, z) > 0.55 ? 0x4caf50 : 0x2b7bd0); },
  "grand-piano": g => {
    const xr = (z: number) => z >= 2 ? 12 : Math.round(12 - ((2 - z) / 15) ** 1.6 * 10);
    for (let z = -13; z <= 13; z++) {
      const right = xr(z);
      for (let x = -13; x <= right; x++) {
        g.box(x, 8, z, 1, 5, 1, BLACK);
        if (x > -12 && x < right - 1 && z > -12 && z < 12) g.set(x, 12, z, (x % 2 === 0) ? 0xc9a24a : 0x8a6d2c);
      }
    }
    const angle = 0.72, cos = Math.cos(angle), sin = Math.sin(angle);
    for (let z = -13; z <= 11; z++) for (let s = 0; s <= xr(z) + 13; s += 0.5) {
      g.set(Math.round(-13 + s * cos), Math.round(13 + s * sin), z, 0x101014);
    }
    g.box(2, 13, -2, 1, 8, 1, BLACK);
    g.box(-13, 7, 13, 26, 4, 4, BLACK);
    for (let x = -11; x <= 10; x++) {
      g.box(x, 10, 14, 1, 1, 3, 0xf8f6f0);
      const n = ((x + 22) % 7);
      if (n !== 2 && n !== 6) g.box(x, 11, 14, 1, 1, 2, 0x111111);
    }
    g.box(-13, 11, 14, 2, 1, 3, BLACK).box(11, 11, 14, 2, 1, 3, BLACK);
    g.box(-12, 12, 13, 24, 5, 1, BLACK);
    centeredText(g, "YAMAHA", 12, 14, GOLD);
    g.box(-5, 13, 9, 10, 6, 1, 0x1a1a1e);
    panel(g, -4, 14, 10, 8, 4, (i, j) => (i + j * 3) % 4 === 0 ? 0x222222 : WHITE);
    for (const [x, z] of [[-12, 12], [10, 12], [-12, -12]]) g.box(x, 0, z, 2, 8, 2, BLACK).set(x, 0, z, GOLD);
    g.box(-1, 0, 14, 2, 7, 1, BLACK).box(-2, 0, 15, 4, 1, 1, GOLD);
    g.box(-6, 0, 20, 12, 5, 5, BLACK).box(-6, 5, 20, 12, 1, 5, 0x2a2a30);
  },
  "bookshelf-math": g => {
    shelfUnit(g, 18, 24, 6, [8, 16], WOOD);
    books(g, -8, 1, -1, 16, 4); books(g, -8, 9, -1, 13, 5); books(g, -8, 17, -1, 15, 6);
    g.box(-6, 24, -2, 10, 2, 4, 0xbfc5cb).box(-2, 26, -1, 2, 1, 2, 0xbfc5cb).box(4, 24, -1, 2, 1, 2, 0x8a9096);
    g.box(4, 9, -1, 3, 3, 3, 0xffffff).box(4, 9, 2, 1, 1, 1, 0xff0000);
  },
  "poster-starwars-big": g => {
    frame(g, 19, 23, 0xdddddd, (i, j) => hash3(i, j, 5) > 0.88 ? WHITE : 0x05060c);
    centeredText(g, "STAR", 14, 1, 0xf6d23c);
    centeredText(g, "WARS", 8, 1, 0xf6d23c);
    for (let i = 0; i < 9; i++) g.set(-4 + i, 3 + Math.floor(i / 3), 1, 0x4fc3ff);
  },
  "tv-console": g => {
    g.box(-11, 0, -3, 22, 7, 6, WOOD_DARK).box(-10, 1, 3, 9, 5, 1, WOOD).box(1, 1, 3, 9, 5, 1, WOOD);
    monitor(g, -10, 10, 0, 20, 12, (i, j) => j > 6 ? 0x5ab552 : j > 5 ? 0x3c8a3a : (i === 8 && j === 5) ? 0xff3b3b : j < 2 ? 0x8ed1ff : 0x6fc1ff);
    g.box(-3, 7, 0, 6, 1, 3, 0x2b2b2b).box(-4, 7, 0, 1, 1, 3, 0x00b2ff).box(3, 7, 0, 1, 1, 3, 0xff4d4d);
  },
  basketball: g => sphere(g, 0, 3, 0, 3.2, (x, y, z) => x === 0 || y === 0 || z === 0 ? 0x2b1a10 : 0xe2702b),
  beanbag: g => { for (let y = 0; y < 6; y++) disc(g, 0, y, 0, 6 - y * 0.6 - (y === 0 ? 0 : 0.3), () => y > 3 ? 0xd94848 : 0xc03c3c); },
  "rug-square": g => g.box(-15, 0, -11, 30, 1, 22, (x, _y, z) => Math.abs(x + 0.5) > 13 || Math.abs(z + 0.5) > 9 ? 0x37496b : (x + z) % 6 === 0 ? 0xd9c9a3 : 0x8aa1c2),
  volleyball: g => sphere(g, 0, 3, 0, 3.6, (x, y, z) => {
    const a = Math.atan2(z, x) + y * 0.45;
    const band = Math.floor(((a / Math.PI) * 3 + 6) % 3);
    return band === 0 ? 0x1f4fbf : band === 1 ? 0xf6d21c : 0xf6d21c;
  }),
  "volleyball-net": g => {
    for (const x of [-13, 12]) g.box(x, 0, -1, 1, 22, 1, METAL).box(x - 1, 0, -2, 3, 1, 3, METAL_DARK);
    for (let x = -12; x < 12; x++) for (let y = 12; y < 20; y++) if ((x + y) % 2 === 0 || y === 19) g.set(x, y, -1, y === 19 ? WHITE : 0x1a1a1a);
  },
  "coding-desk": g => {
    table(g, 18, 10, 12, 0xd7d2c8, METAL_DARK, -9, -5);
    g.box(5, 12, 0, 2, 3, 2, 0xf2f2f2).box(-8, 12, -3, 3, 1, 4, 0xf6c343);
    chair(g, -2, 7, 0x2c2f36, METAL_DARK, 7, -1);
  },
  macbook,
  "brawl-stand": g => {
    g.box(-1, 0, -3, 2, 10, 2, BLACK).box(-5, 0, -4, 10, 1, 6, BLACK);
    g.box(-8, 10, -3, 16, 26, 2, 0x111111);
    panel(g, -7, 11, -1, 14, 24, (i, j) => {
      const skull = ["..######..", ".########.", "##..##..##", "##..##..##", "##########", ".###..###.", "..#.##.#.."];
      if (j >= 3 && j < 10 && i >= 2 && i < 12) return skull[j - 3][i - 2] === "#" ? 0xffce1f : 0x2a0f45;
      if (j >= 13 && j < 22) return (i + j) % 5 === 0 ? 0x8bd450 : j > 18 ? 0x5aa64a : (Math.abs(i - 4) < 2 && j > 14 && j < 18) ? 0xff5470 : (Math.abs(i - 10) < 2 && j > 15) ? 0x41b9ff : 0x6fc45a;
      return 0x2a0f45;
    });
  },
  "projects-board": g => {
    frame(g, 35, 20, WOOD_DARK, (i, j) => hash3(i, j, 2) > 0.7 ? 0xb88a55 : 0xc89a64);
    centeredText(g, "PROJECTS", 13, 1, 0x1d1d1d);
    g.box(-14, 3, 1, 10, 8, 1, 0x2563eb).box(-13, 9, 2, 1, 1, 1, 0xe53935);
    g.text("PG", -13, 4, 2, WHITE);
    g.box(-2, 3, 1, 10, 8, 1, 0x16a34a).box(2, 9, 2, 1, 1, 1, 0xe53935);
    g.text("DR", -1, 4, 2, WHITE);
    g.box(10, 5, 1, 5, 5, 1, 0xfde047).box(10, 2, 1, 5, 2, 1, 0xf9a8d4);
  },
  "fblc-banner": g => {
    g.box(-12, 21, -1, 24, 1, 1, METAL_DARK);
    panel(g, -11, 0, 0, 22, 21, () => 0x232744);
    LOGOS.fbla.rows.slice(0, 10).forEach((row, r) => [...row.slice(4, 18)].forEach((c, i) => { if (c === "#") g.set(-7 + i, 19 - r, 1, WHITE); }));
    centeredText(g, "FBLC", 2, 1, GOLD);
  },
  "glass-trophy-third": g => glassTrophy(g, "Third Place", 0xb6845e),
  "glass-trophy-first": g => glassTrophy(g, "First Place", 0xd6b355),
  "trophy-plinth": g => {
    g.box(-8, 0, -3, 16, 1, 6, WOOD_DARK).box(-7, 1, -3, 14, 7, 6, 0x63584d);
    g.box(-8, 8, -4, 16, 1, 8, 0x41372e).box(-6, 3, 3, 12, 4, 1, 0x494038);
    g.box(-4, 6, 4, 3, 1, 1, METAL).box(2, 6, 4, 3, 1, 1, METAL);
  },
  "plaque-cemc": g => plaque(g, LOGOS.cemc, [0, 17], 15, "CEMC", 0x3e2c6e),
  "plaque-cemc-gold": g => plaque(g, LOGOS.cemc, [0, 17], 15, "CEMC", GOLD),
  "plaque-maa": g => plaque(g, LOGOS.maa, [0, 13], 11, "MAA", 0x0b5cad),
  "jane-street-tees": g => { g.box(-15, 14, 0, 30, 1, 1, METAL_DARK); tee(g, -14, 0x1d2b4f, "24"); tee(g, 1, 0x1d2b4f, "25"); },
  lockers: g => {
    for (let i = 0; i < 4; i++) {
      const x = -10 + i * 5;
      g.box(x, 0, -3, 5, 26, 6, i % 2 ? 0x2f5d9a : 0x2a5590);
      for (let y = 20; y < 24; y += 2) g.box(x + 1, y, 3, 3, 1, 1, 0x1a3a66);
      g.set(x + 3, 13, 3, METAL);
    }
  },
  "ball-cart": g => {
    g.box(-6, 1, -4, 12, 1, 8, METAL_DARK).box(-6, 2, -4, 1, 8, 8, METAL).box(5, 2, -4, 1, 8, 8, METAL);
    for (const [x, z] of [[-6, -4], [5, -4], [-6, 3], [5, 3]]) g.set(x, 0, z, 0x1a1a1a);
    for (const [x, y, z] of [[-3, 4, -1], [2, 4, -1], [-1, 4, 2], [0, 8, 0]]) sphere(g, x, y, z, 2.4, (a, b) => (a + b) % 3 ? 0xf6d21c : 0x1f4fbf);
  },
  "western-pennant": g => {
    g.box(-10, 0, -1, 20, 19, 1, 0x4f2683);
    panel(g, -9, 1, 0, 18, 17, (_i, j) => j === 0 || j === 16 ? 0x6a3fa0 : 0x4f2683);
    centeredText(g, "CS", 13, 1, WHITE);
    centeredText(g, "+", 7, 1, 0xd8c8f0);
    centeredText(g, "IVEY", 1, 1, WHITE);
  },
  "poster-csa": g => badge(g, 19, 0xc0473a, 0xe5e7eb, pen => {
    [[-1, 7, -6, -3], [-6, -3, 0, -3], [0, -3, 2, 1], [-1, 7, 2, 1], [2, 1, -2, -7], [4, 1, 2, -3], [2, -3, 6, -3], [6, -3, 4, 1]]
      .forEach(([x0, y0, x1, y1]) => line(pen, x0, y0, x1, y1, 0xfafafa));
  }),
  "poster-wds": g => badge(g, 21, 0xfafafa, 0xd1d5db, pen => {
    const navy = 0x1b2a4e, t = new Grid();
    t.text("WDS", -6, -2, 0, navy);
    t.forEach((x, y, _z, color) => pen(x, y, color));
    line(pen, -9, 0, -8, 1, navy); line(pen, -9, 0, -8, -1, navy); line(pen, 9, 0, 8, 1, navy); line(pen, 9, 0, 8, -1, navy);
    line(pen, -3, -3, -1, 3, navy);
  }),
  "poster-wfn": g => badge(g, 19, 0x262626, 0x3f3f46, pen => {
    let x = -7;
    ["W", "F", "N"].forEach((char, i) => {
      const t = new Grid(), w = t.text(char, x, -2, 0, [0xc86aa6, 0xd98c96, 0xe3ad7e][i]);
      t.forEach((px, py, _z, color) => pen(px, py, color));
      x += w + 1;
    });
  }),
  "jellycat-frog": g => {
    g.box(-3, 0, -3, 6, 4, 5, 0x6fbf5a).box(-2, 0, 2, 4, 3, 1, 0xcfe8a8);
    g.box(-3, 4, -2, 2, 2, 2, 0x6fbf5a).box(1, 4, -2, 2, 2, 2, 0x6fbf5a).set(-2, 5, 0, BLACK).set(2, 5, 0, BLACK).set(-3, 5, 0, WHITE).set(1, 5, 0, WHITE);
    g.box(-1, 2, 2, 2, 1, 1, 0x3e7a32).set(-3, 1, 2, 0xf4a6b8).set(2, 1, 2, 0xf4a6b8);
    g.box(-4, 0, -1, 1, 1, 3, 0x5aa648).box(3, 0, -1, 1, 1, 3, 0x5aa648);
  },
  "standing-desk": g => {
    g.box(-11, 17, -5, 22, 1, 10, 0xd9c7a7);
    for (const x of [-9, 8]) g.box(x, 0, -1, 1, 17, 2, 0x2a2a2e).box(x - 1, 0, -4, 3, 1, 8, 0x2a2a2e);
    g.box(-9, 9, 0, 18, 1, 1, 0x2a2a2e);
    g.box(-4, 18, 1, 9, 1, 3, 0x2b2d33).box(6, 18, 2, 2, 1, 2, 0xd8d8d8);
    g.box(-10, 18, 1, 3, 1, 3, 0xf2f2f2);
  },
  monitor: g => monitor(g, -7, 3, 0, 14, 10, code(17)),
  "desk-lamp": g => { g.box(-1, 0, -1, 3, 1, 3, BLACK).box(0, 1, 0, 1, 7, 1, BLACK).box(0, 8, 0, 1, 1, 4, BLACK).box(-1, 6, 3, 3, 2, 2, BLACK).box(-1, 6, 3, 3, 1, 2, 0xffe9a8); },
  "mini-fridge": g => { g.box(-5, 0, -4, 10, 13, 8, 0x2a2c30).box(-5, 0, 4, 10, 13, 1, 0x34373c).box(3, 4, 5, 1, 6, 1, METAL).box(-5, 9, 4, 10, 1, 1, 0x1e2024); },
  fragrances: g => {
    const bottles: [number, number, Color, Color][] = [[-4, 5, 0xe6a64c, GOLD], [-1, 6, 0xdbe7ee, 0x1a1a1a], [2, 4, 0x1e1e22, 0xb5b5b5], [4, 5, 0x6b3f8f, GOLD]];
    for (const [x, h, c, cap] of bottles) g.box(x, 0, -1, 2, h, 2, c).box(x, h, -1, 2, 1, 2, cap);
  },
  fan: g => {
    disc(g, 0, 0, 0, 4, () => 0xe8e8e8); g.box(0, 1, 0, 1, 14, 1, 0xd0d0d0);
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) {
      const d = Math.hypot(x, y);
      if (d <= 6.4) g.set(x, 20 + y, 1, d > 5.4 ? 0xf2f2f2 : d < 1.5 ? 0x9aa3ab : Math.abs(x) === Math.abs(y) || x === 0 || y === 0 ? 0xbcd7ea : -1);
    }
    g.box(-1, 19, -1, 3, 3, 2, 0xd0d0d0);
  },
  closet: g => {
    g.box(-12, 0, -4, 24, 30, 1, 0xf3f1ec).box(-12, 0, -4, 1, 30, 8, 0xf3f1ec).box(11, 0, -4, 1, 30, 8, 0xf3f1ec).box(-12, 29, -4, 24, 1, 8, 0xf3f1ec).box(-12, 0, -4, 24, 1, 8, 0xe2ded6);
    g.box(-11, 24, 0, 22, 1, 1, METAL);
    for (let i = 0; i < 6; i++) {
      const x = -10 + i * 3.5, c = i % 3 === 1 ? 0x2a2a2e : 0x161618;
      g.box(Math.round(x), 11, -2, 3, 13, 4, c).box(Math.round(x) + 1, 23, 0, 1, 1, 1, METAL);
    }
    g.box(-10, 1, -2, 6, 3, 5, 0x161618).box(-3, 1, -1, 3, 2, 5, BLACK).box(1, 1, -1, 3, 2, 5, BLACK).box(-3, 1, 3, 3, 1, 1, 0x3a3a3e).box(1, 1, 3, 3, 1, 1, 0x3a3a3e);
    g.box(-13, 0, 4, 1, 30, 7, 0xe9e6df).box(12, 0, 4, 1, 30, 7, 0xe9e6df);
  },
  "laundry-basket": g => { g.box(-4, 0, -3, 8, 7, 6, (x, y, z) => (x + y + z) % 2 ? 0xc9b48f : 0xb39d76).box(-3, 6, -2, 6, 2, 4, 0x1a1a1a); },
  "rug-western": g => g.box(-12, 0, -9, 24, 1, 18, (x, _y, z) => {
    const a = Math.abs(x + 0.5), b = Math.abs(z + 0.5);
    if (a > 10 || b > 7) return 0x342849;
    if (a > 9 || b > 6 || ((x + z) % 5 === 0 && (x - z) % 5 === 0)) return 0xbca9c8;
    return (x + z) % 2 ? 0x878098 : 0x9389a5;
  }),
};

export const MODEL_IDS = Object.keys(MODELS);
const cache = new Map<string, Grid>();

/** Builds (and caches) a model grid normalised so its footprint starts at the origin offset used by placement. */
export function buildModel(id: string): Grid {
  const cached = cache.get(id);
  if (cached) return cached;
  const build = MODELS[id];
  if (!build) throw new Error(`Unknown model ${id}`);
  const grid = new Grid();
  build(grid);
  cache.set(id, grid);
  return grid;
}

export type Footprint = { minX: number; maxX: number; minZ: number; maxZ: number; height: number };
/** The model's x/z extent relative to its placement origin (exclusive max). */
export function modelFootprint(id: string): Footprint {
  const b = buildModel(id).bounds();
  const w = b.maxX - b.minX + 1, d = b.maxZ - b.minZ + 1, s = modelVoxelSize(id);
  return { minX: -Math.floor(w / 2) * s, maxX: (w - Math.floor(w / 2)) * s, minZ: -Math.floor(d / 2) * s, maxZ: (d - Math.floor(d / 2)) * s, height: (b.maxY + 1) * s };
}
