import { Grid, hash3, shade, textWidth, type Color } from "./voxel";
import { LOGOS, type PixelLogo } from "./logos";
import { buildFridgeCabinet, buildFridgeDoor, buildRoommatePreview, FRIDGE_HINGE, FRIDGE_VOXEL_SIZE } from "./roommate";

/* Every prop is authored facing +z with y = 0 on the floor. */
type Painter = (i: number, j: number) => Color | null;

const WOOD = 0xa47148, WOOD_DARK = 0x6e4a2f, WHITE = 0xf2f0ea, BLACK = 0x18181c, METAL = 0x9aa3ab, METAL_DARK = 0x5c636b;
const GOLD = 0xd9ad3c, SKY = 0x8ec9ef;
export const VOLLEYBALL_NET = { halfWidth: 12, bottom: 12, top: 20, postTop: 22 };

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

function reliefPanel(g: Grid, x: number, y: number, z: number, w: number, h: number, paint: Painter, rise: (color: Color) => number) {
  panel(g, x, y, z, w, h, paint);
  for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) {
    const color = g.get(i, j, z);
    if (color === undefined) continue;
    const height = rise(color);
    if (height > 0) g.box(i, j, z + 1, 1, 1, height, (_x, _y, layer) =>
      layer === z + height ? color : shade(color, 0.81));
  }
}

function frame(g: Grid, w: number, h: number, border: Color, paint: Painter, depth = 1) {
  const x = -Math.floor(w / 2);
  g.box(x, 0, -depth, w, h, depth, border);
  panel(g, x + 1, 1, 0, w - 2, h - 2, paint);
  printEdge(g, x, 0, w, h, border);
}

function printEdge(g: Grid, x: number, y: number, w: number, h: number, border: Color) {
  g.box(x, y, 0, w, 1, 2, shade(border, 0.76));
  g.box(x, y + h - 1, 0, w, 1, 2, shade(border, 1.24));
  g.box(x, y + 1, 0, 1, h - 2, 2, shade(border, 1.12));
  g.box(x + w - 1, y + 1, 0, 1, h - 2, 2, shade(border, 0.9));
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

function standingDesk(g: Grid, wood: Color, frame: Color) {
  g.box(-17, 16, -7, 34, 1, 14, shade(wood, 0.76));
  g.box(-17, 17, -7, 34, 1, 14, (x, _y, z) =>
    shade(wood, 0.95 + 0.1 * hash3(Math.floor(x / 5), 17, z)));
  for (const x of [-14, 12]) {
    g.box(x, 0, -1, 2, 11, 2, frame).box(x, 11, -1, 2, 5, 2, shade(frame, 1.36));
    g.box(x - 1, 0, -5, 4, 1, 11, frame);
  }
  g.box(-14, 13, -3, 28, 2, 2, frame).box(11, 15, 6, 4, 1, 1, frame);
  g.set(14, 15, 6, 0x83b9bd);
  g.box(-6, 18, 1, 11, 1, 4, 0x2b2d33).box(6, 18, 1, 5, 1, 5, 0x49434e);
  for (const z of [2, 3]) for (let x = -5; x < 4; x += 2) g.set(x, 18, z, 0x60606a);
  g.box(8, 19, 2, 2, 1, 2, 0xd8d8d8);
}

function dormCloset(g: Grid) {
  const frame = 0x61534f, edge = 0x9a8472;
  shelfUnit(g, 46, 32, 14, [0, 28], frame);
  g.box(4, 1, -6, 1, 28, 13, frame).box(4, 1, 7, 1, 28, 1, shade(edge, 0.85));
  for (const x of [-23, 22]) g.box(x, 0, 7, 1, 32, 1, edge);
  g.box(-23, 31, 7, 46, 1, 1, edge);
  g.box(-22, 5, -6, 26, 1, 13, frame).box(-22, 24, -1, 26, 1, 1, METAL);
  for (let i = 0; i < 12; i++) {
    const x = -21 + i * 2, y = 8 + i % 5, c = [0x21212a, 0x31313b, 0x272b34, 0x191b24][i % 4];
    g.box(x, y, -4, 2, 23 - y, 9 - i % 3, c).box(x, y + 2, 5 - i % 3, 1, 18 - y, 1, shade(c, 1.27));
    g.set(x, 23, -1, METAL).set(x, 21, 4 - i % 3, 0x45424d);
  }
  for (const x of [-21, -14, -7]) {
    for (let y = 1; y < 5; y++) g.box(x, y, -4, 6, 1, 9, y % 2 ? 0x33343f : 0x23242d);
    g.box(x, 29, -4, 6, 2, 8, 0x342f3d).box(x + 1, 29, 4, 4, 1, 1, 0x626072);
  }
  for (const y of [0, 8, 15, 22, 28]) g.box(5, y, -6, 17, 1, 13, frame).box(5, y, 7, 17, 1, 1, edge);
  for (const [x, y, h, color, label] of [
    [6, 1, 5, 0xc44b33, 0xffdea3], [11, 1, 6, 0xe3ab32, 0xb7382c], [16, 1, 5, 0x397a53, 0xf1e5b3],
    [6, 9, 5, 0x644689, 0xffdc88], [16, 9, 4, 0xcc553d, 0xf2cc7f],
    [6, 16, 5, 0x3b6fa5, 0xe1e8f3], [11, 16, 4, 0xbf6c32, 0xf8dc91], [17, 16, 5, 0xcf4f5e, 0xf6e1a9],
  ]) {
    g.box(x, y, 1, 4, h, 4, color).box(x, y + 1, 5, 4, 2, 1, label).box(x + 1, y + h - 1, 1, 2, 1, 4, shade(color, 1.16));
  }
  for (const [x, y, color] of [[13, 9, 0x6ba778], [7, 23, 0xcf5260], [11, 23, 0x70a3c8], [15, 23, 0xde983e], [19, 23, 0x8d72ad]]) {
    for (let layer = 0; layer < 4; layer++) disc(g, x, y + layer, 4, 1.45, () => layer === 2 ? shade(color, 1.28) : color);
    disc(g, x, y + 4, 4, 1.45, () => METAL);
  }
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
    const start = 17 + Math.round((y - 14) * 0.52);
    g.box(-1, y, start, 3, 1, 32 - start, 0xc8102e);
  }
  const tailMark = new Grid();
  maple(tailMark, 22, 16, 0, WHITE);
  tailMark.forEach((z, y, _z, color) => {
    for (const x of [-1, 1]) if (g.has(x, y, z)) g.set(x, y, z, color);
  });
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


function plaque(g: Grid, logo: PixelLogo, border: Color, word?: string) {
  const scale = word ? 2 : 1, logoW = Math.max(...logo.rows.map(row => row.length)) * scale;
  const w = logoW + 8, h = word ? logo.rows.length * scale + 20 : 32;
  const left = -Math.floor(w / 2), bottom = word ? 16 : Math.floor((h - logo.rows.length) / 2);
  g.box(left, 0, -2, w, h, 3, border);
  g.box(left + 2, 2, 0, w - 4, h - 4, 1, logo.paper);
  printEdge(g, left, 0, w, h, border);
  logo.rows.forEach((row, r) => [...row].forEach((c, i) => {
    if (c === "#") g.box(-Math.floor(logoW / 2) + i * scale, bottom + (logo.rows.length - 1 - r) * scale, 1, scale, scale, 1, logo.ink);
  }));
  if (word) centeredText(g, word, 4, 1, logo.ink, 0, 2);
  else g.box(left + 9, 6, 0, w - 18, 1, 1, 0xc0cddf);
}

const AIME_SEAL: PixelLogo = {
  ink: 0x795022, paper: 0xffffff,
  rows: [
    ".......#.......",
    "......###......",
    "..#..#####..#..",
    ".##...###...##.",
    ".#.#...#...#.#.",
    ".##.........##.",
    "..##.......##..",
    "...##.....##...",
    "....###.###....",
    "......###......",
  ],
};

type Pen = (x: number, y: number, color: Color) => void;

function badge(g: Grid, radius: number, bg: Color, ring: Color, ink: (pen: Pen) => void) {
  const r = radius * 2;
  for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) {
    const q = x * x + y * y;
    if (q > (r + 0.5) ** 2) continue;
    const paper = q <= (r - 1.6) ** 2;
    g.box(x, y + r, -2, 1, 1, 2, ring).set(x, y + r, 0, paper ? bg : shade(ring, y > 0 ? 1.07 : 0.82));
    if (!paper) g.set(x, y + r, 1, shade(ring, y > 0 ? 1.18 : 0.78));
  }
  ink((x, y, color) => { if (g.has(x, y + r, 0)) g.set(x, y + r, 1, color); });
}

function line(pen: Pen, x0: number, y0: number, x1: number, y1: number, color: Color) {
  x0 *= 2; y0 *= 2; x1 *= 2; y1 *= 2;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
    pen(x, y, color);
    pen(x + 1, y, color);
  }
}

function tee(g: Grid, x: number, color: Color, year: string) {
  g.box(x + 3, 0, 0, 7, 12, 1, color).box(x, 8, 0, 13, 4, 1, color).box(x, 6, 0, 3, 2, 1, color).box(x + 10, 6, 0, 3, 2, 1, color);
  g.box(x + 5, 11, 0, 3, 1, 1, shade(color, 0.7));
  g.text("JS", x + 3, 5, 1, 0xf2f2f2);
  g.text(year, x + 3, 0, 1, 0x9fb8e8);
  g.box(x + 6, 12, 0, 1, 2, 1, METAL).box(x + 2, 12, 0, 9, 1, 1, METAL);
}

const GLASS = 0x9dd8e4;
const DETAIL_VOXELS = new Set(["macbook", "csa-dj-macbook", "glass-trophy-third", "glass-trophy-first", "buldak-bowl", "pink-court-shoes", "molten-volleyball", "cs-ivey", "poster-csa", "poster-wds", "poster-wfn"]);
const HALF_VOXELS = new Set(["starwars-posters", "projects-board", "fblc-banner", "go-mustangs", "fan", "fragrances", "volleyball", "basketball", "jellycat-frog", "csa-stage-logo", "csa-boba-cup", "csa-soda-cup", "csa-water-bottle", "csa-speaker"]);
export const modelVoxelSize = (id: string) => id === "chess-table" ? 0.125 : id === "mini-fridge" ? FRIDGE_VOXEL_SIZE : DETAIL_VOXELS.has(id) || id.startsWith("plaque-") ? 0.25 : HALF_VOXELS.has(id) || id.startsWith("poster-") || id === "hockey-pad" || id === "roommate-portrait" ? 0.5 : 1;

type ChessMan = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";

function chessPiece(g: Grid, kind: ChessMan, cx: number, cy: number, cz: number, tone: Color, forward: 1 | -1) {
  const color = (x: number, y: number, z: number) => shade(tone, 0.91 + hash3(x, y, z) * 0.12);
  const rings = (height: number, radii: number[]) => radii.forEach((r, i) =>
    disc(g, cx, cy + height + i, cz, r, (x, z) => color(cx + x, cy + height + i, cz + z)));
  rings(0, [3.4, 3.4, 2.65]);
  if (kind === "pawn") {
    rings(3, [1.55, 1.55, 2.1]);
    sphere(g, cx, cy + 7, cz, 1.55, (x, y, z) => color(cx + x, cy + 7 + y, cz + z));
  } else if (kind === "rook") {
    rings(3, [2.1, 2.1, 2.1, 2.65, 3.15]);
    for (const dx of [-2, 1]) for (const dz of [-2, 1]) g.box(cx + dx, cy + 8, cz + dz, 2, 2, 2, color);
  } else if (kind === "knight") {
    rings(3, [2.1, 2.1]);
    for (let y = 5; y <= 9; y++) g.box(cx - 1, cy + y, cz - (forward === 1 ? 1 : 2), 3, 1, 4, color);
    g.box(cx - 1, cy + 8, cz + forward * 2 - (forward === -1 ? 1 : 0), 3, 2, 2, color);
    for (const x of [-1, 1]) {
      g.set(cx + x, cy + 10, cz - forward, tone);
      g.set(cx + x, cy + 9, cz + forward, shade(tone, 0.48));
    }
  } else if (kind === "bishop") {
    rings(3, [1.55, 1.55, 1.55, 2.65, 2.1, 1.55, 1.55, 0.6]);
    for (const x of [0, 1]) g.set(cx + x, cy + 8 + x, cz + forward, -1);
    g.set(cx, cy + 11, cz, tone);
  } else {
    rings(3, [2.1, 1.55, 1.55, 1.55, 2.65, 2.1, 1.55, 2.65]);
    if (kind === "queen") {
      for (const [x, z] of [[-2, 0], [0, -2], [2, 0], [0, 2]]) g.set(cx + x, cy + 11, cz + z, tone);
      rings(11, [1.15, 0.6]);
    } else {
      rings(11, [1.55, 0.6]);
      g.box(cx - 2, cy + 13, cz, 5, 1, 1, color).box(cx, cy + 12, cz, 1, 4, 1, color);
    }
  }
}

function chessTable(g: Grid) {
  const grain = (wood: Color) => (x: number, y: number, z: number) => shade(wood, 0.87 + hash3(Math.floor(x / 9), y, z) * 0.2);
  const walnut = grain(0x79502f), dark = grain(0x442b1d);
  g.box(-48, 56, -48, 96, 6, 96, walnut).box(-46, 62, -46, 92, 2, 92, dark);
  for (const x of [-43, 35]) for (const z of [-43, 35]) {
    g.box(x, 0, z, 8, 56, 8, walnut).box(x - 1, 0, z - 1, 10, 4, 10, dark);
  }
  g.box(-48, 50, -44, 96, 6, 3, dark).box(-48, 50, 41, 96, 6, 3, dark);
  g.box(-40, 64, -40, 80, 4, 80, walnut).box(-34, 68, -34, 68, 2, 68, dark);
  const squares = [grain(0xebcca2), grain(0x8a5836)], back: ChessMan[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
  for (let file = 0; file < 8; file++) for (let rank = 0; rank < 8; rank++) {
    const x = -32 + 8 * file, z = -32 + 8 * rank;
    g.box(x, 70, z, 8, 1, 8, squares[(file + rank) % 2]);
    if (rank < 2 || rank > 5) {
      const white = rank > 5;
      chessPiece(g, rank === 1 || rank === 6 ? "pawn" : back[file], x + 4, 71, z + 4, white ? 0xf6e3c4 : 0x40332d, white ? -1 : 1);
    }
  }
  for (const z of [-96, 64]) {
    for (const x of [-16, 10]) for (const legZ of [z, z + 26]) g.box(x, 0, legZ, 6, 31, 6, dark);
    g.box(-16, 30, z, 32, 4, 32, walnut).box(-14, 34, z + 2, 28, 6, 28, grain(0x6a7b91));
  }
}
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

function macbook(g: Grid, display = code(9)) {
  const silver = 0xb5bfca, steel = 0x798694;
  g.box(-19, 0, -12, 38, 2, 24, steel).box(-18, 1, -12, 36, 1, 23, silver);
  g.box(-16, 2, -9, 32, 1, 11, 0x20232a);
  for (let x = -15; x < 16; x += 3) for (let z = -8; z <= 1; z += 3) g.set(x, 2, z, 0x59626f);
  g.box(-7, 2, 4, 14, 1, 6, 0x919da8).box(-6, 2, 5, 12, 1, 4, silver);
  g.box(-19, 2, -13, 38, 3, 2, BLACK);
  g.box(-19, 5, -14, 38, 24, 2, silver).box(-18, 6, -12, 36, 22, 1, BLACK);
  panel(g, -16, 8, -11, 32, 18, display);
  g.box(-2, 25, -11, 4, 1, 1, BLACK);
  const mark = [".....##.", "....##..", ".###....", "#######.", "######..", "######..", ".######.", "..####.."];
  mark.forEach((row, i) => [...row].forEach((c, x) => { if (c === "#") g.set(x - 4, 21 - i, -15, 0xe8edf4); }));
}

function csaMixerScreen(x: number, row: number) {
  if (row === 0 || row === 9) return 0x4f4660;
  const y = row - 4, wave = Math.max(1, Math.round(3 * hash3(x, 5, 0)));
  if (row < 9 && Math.abs(y) <= wave) return x < 16 ? 0x79e3dc : 0xec91c1;
  if (row > 10 && row > 16 - (x * 7 % 6) && x % 4 !== 3) return x % 8 < 4 ? 0xd2a6f6 : 0x76cfe3;
  return x === 15 ? 0x7b606c : 0x24263a;
}

function csaBadge(g: Grid) {
  badge(g, 9, 0xc0473a, 0xe5e7eb, pen => {
    [[-1, 7, -6, -3], [-6, -3, 0, -3], [0, -3, 2, 1], [-1, 7, 2, 1], [2, 1, -2, -7], [4, 1, 2, -3], [2, -3, 6, -3], [6, -3, 4, 1]]
      .forEach(([x0, y0, x1, y1]) => line(pen, x0, y0, x1, y1, 0xfafafa));
  });
}

function csaCup(g: Grid, drink: Color, straw: Color, boba: boolean) {
  for (let y = 0; y < 7; y++) disc(g, 0, y, 0, y < 2 ? 1.7 : 2.7, (x, z) =>
    boba && y < 3 && (x - z + y) % 3 === 0 ? 0x442a34 : shade(drink, 0.91 + (x + 2) * 0.05));
  disc(g, 0, 7, 0, 2.8, () => 0xf5ded8);
  g.box(1, 7, 0, 1, 3, 1, straw);
}

const MODELS: Record<string, (g: Grid) => void> = {
  "csa-stage-logo": csaBadge,
  "csa-dj-macbook": g => macbook(g, csaMixerScreen),
  "csa-boba-cup": g => csaCup(g, 0xc693af, 0xeb906e, true),
  "csa-soda-cup": g => csaCup(g, 0xd76851, 0xf1ce73, false),
  "csa-water-bottle": g => {
    for (let y = 0; y < 9; y++) disc(g, 0, y, 0, y < 7 ? 1.7 : 1.1, x =>
      y >= 3 && y <= 4 ? 0xc0e6ee : x < 0 ? 0x729ba9 : 0xa6c7ce);
    disc(g, 0, 9, 0, 1.4, () => 0x5c81b3);
  },
  "csa-seat-row": g => {
    const frame = 0x83808c, fabric = 0xf5f0ec, piping = 0xfffcf5;
    g.box(-21, 0, -5, 42, 1, 10, 0x686374).box(-21, 1, -5, 42, 1, 1, 0xa39aab);
    for (const x of [-16, -8, 0, 8, 16]) {
      g.box(x - 2, 1, -2, 5, 5, 5, frame).box(x - 3, 5, -3, 7, 2, 7, fabric);
      g.box(x - 3, 6, -4, 7, 7, 2, fabric).box(x - 2, 13, -4, 5, 1, 2, piping);
      g.box(x - 3, 7, 2, 7, 1, 2, piping).box(x - 4, 8, -4, 1, 2, 8, 0xc9c5cf)
        .box(x + 4, 8, -4, 1, 2, 8, 0xc9c5cf);
      g.box(x - 1, 10, -5, 3, 1, 1, 0xab94a9);
    }
    for (const x of [-21, 20]) g.set(x, 2, 4, 0xffa874);
  },
  "csa-barber-chair": g => {
    const red = 0x743e4d, welt = 0xdc897f, steel = 0xa99fa9, shadow = 0x4d424f;
    disc(g, 0, 0, 0, 5.2, () => steel);
    disc(g, 0, 1, 0, 4.6, () => shadow);
    g.box(-2, 1, -2, 4, 7, 4, steel).box(-5, 7, -5, 10, 1, 10, shadow)
      .box(-5, 8, -5, 10, 2, 10, red).box(-4, 9, 4, 8, 1, 1, welt);
    g.box(-5, 7, -8, 10, 10, 3, red).box(-4, 16, -8, 8, 2, 3, welt);
    for (const x of [-6, 5]) g.box(x, 8, -4, 1, 5, 2, steel).box(x, 13, -5, 1, 1, 8, shadow);
    g.box(-2, 3, 3, 4, 2, 5, steel).box(-4, 3, 5, 8, 1, 3, shadow).box(-4, 4, 7, 8, 1, 1, steel);
  },
  "csa-barber-mirror": g => {
    g.box(-12, 0, -2, 24, 2, 4, 0x2e232e).box(-11, 2, -1, 22, 23, 2, 0x544052);
    g.box(-12, 8, 1, 24, 2, 1, 0x96707a).box(-7, 12, 1, 14, 12, 1, (x, y) =>
      Math.abs(x + y - 18) <= 1 || Math.abs(x + y - 22) <= 1 ? 0xb5b1cd : 0x76738d);
    for (const x of [-9, 8]) for (let y = 12; y <= 23; y += 3) g.set(x, y, 1, 0xffcf9c);
    g.box(-10, 25, 0, 20, 7, 2, 0x3a283b);
    centeredText(g, "CUTS", 26, 2, 0xf9b68f);
    for (let y = 10; y < 23; y++) g.set(-11, y, 1, y % 6 < 3 ? 0xf4e3d6 : 0xb75c75);
  },
  "csa-dj-booth": g => {
    g.box(-17, 0, -5, 34, 2, 10, 0x221b2b)
      .box(-16, 2, -4, 32, 9, 8, 0x372c43)
      .box(-17, 11, -5, 34, 2, 10, 0x675870)
      .box(-16, 3, 4, 32, 7, 1, 0x302638);
    for (const x of [-16, -11, 9, 13]) for (let dx = 0; dx < 3; dx++) {
      g.box(x + dx, 3, 4, 1, 7, 1, dx % 2 ? 0x997284 : 0x4f3b51);
    }
    g.box(-16, 2, 5, 32, 1, 1, 0xf3ab88).box(-16, 10, 5, 32, 1, 1, 0xe999c5);
    centeredText(g, "CSA", 4, 5, 0xffeee0);
    for (const x of [-6, 6]) {
      g.box(x - 3, 13, -3, 6, 1, 6, 0x222028);
      disc(g, x, 14, 0, 2.3, (i, j) => (i + j) % 3 ? 0x393443 : 0x5e5269);
      g.set(x, 14, 0, 0xf2a98e).set(x - 2, 14, -2, 0xffa877).set(x + 2, 14, -2, 0xb9a0ee);
      g.box(x + 2, 14, 1, 1, 1, 2, 0x908398).set(x + 1, 14, 2, 0xdcbfac);
    }
    g.box(-2, 13, -3, 4, 1, 6, 0x18141e);
    for (const x of [-2, -1, 0, 1]) g.set(x, 14, -2, 0x80d5c5).set(x, 14, 0, 0x786880).set(x, 14, 2, x % 2 ? 0xf79dbc : 0xbaa7ee);
    g.box(6, 13, -4, 8, 1, 1, 0x22202b).box(5, 13, -5, 2, 1, 2, 0x22202b);
    g.box(-16, 13, -4, 4, 2, 3, 0x434257).set(-14, 15, -3, 0x91f0d6).set(-13, 15, -3, 0xf7b388);
  },
  "csa-speaker": g => {
    const ice = 0xece9e7, rim = 0xbab7c4, grille = 0xb8b6c1;
    g.box(-11, 2, -7, 22, 47, 13, ice).box(-10, 0, -6, 20, 3, 10, rim)
      .box(-9, 48, -6, 18, 3, 11, 0xfaf7f3).box(-7, 49, -5, 14, 2, 3, 0x706779)
      .box(-9, 3, 6, 18, 44, 2, rim).box(-8, 4, 7, 16, 42, 2, grille);
    for (const x of [-9, 8]) g.box(x, 5, 7, 1, 40, 1, 0xe0dfe5)
      .box(x, 0, -8, 2, 7, 3, 0x696879).set(x, 3, -8, 0xf7a16d);
    for (const [y, bands] of [[14, [0x9cece6, 0x88e7e5, 0xa9ec86, 0xf0e799]], [36, [0x8adfed, 0xaeb9fc, 0xf0afd9, 0xadf2de]]] as const) {
      for (let x = -8; x <= 8; x++) for (let dy = -8; dy <= 8; dy++) {
        const r = x * x + dy * dy;
        const sector = dy > 0 ? (x < 0 ? 0 : 1) : (x >= 0 ? 2 : 3);
        if (r <= 70) g.set(x, y + dy, 8, r >= 46 ? bands[sector] : (x + dy) % 2 ? 0xaaa2b0 : 0x918c9c);
        if (r <= 13) g.set(x, y + dy, 9, 0xaba2b4);
      }
    }
    g.box(-7, 22, 9, 14, 6, 1, 0xcfc3ca);
    centeredText(g, "JBL", 23, 10, 0xcc6b5b);
    g.box(-5, 50, -1, 10, 1, 3, 0xd1c7d2);
    for (const x of [-4, 0, 4]) g.set(x, 51, 0, x === 0 ? 0xf49d6e : 0x8b8296);
  },
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
    g.box(-27, 12, -1, 54, 20, 1, 0xc8102e);
    panel(g, -26, 13, 0, 52, 18, () => WHITE);
    maple(g, -24, 18, 1, 0xc8102e);
    centeredText(g, "WELCOME", 23, 1, 0x1e1e1e, 5);
    centeredText(g, "TO CANADA", 15, 1, 0xc8102e, 5);
  },
  cone: g => { g.box(-2, 0, -2, 4, 1, 4, 0xe8612c).box(-1, 1, -1, 2, 2, 2, 0xe8612c).box(-1, 3, -1, 2, 1, 2, WHITE).box(-1, 4, -1, 2, 1, 2, 0xe8612c); },
  "runway-light": g => { g.box(0, 0, 0, 1, 3, 1, METAL_DARK).box(-1, 3, -1, 3, 1, 3, 0x3c3c3c).set(0, 4, 0, 0x5aa9ff); },
  bench: g => { g.box(-8, 4, -2, 16, 1, 4, METAL).box(-8, 5, -2, 16, 5, 1, METAL); for (const x of [-7, 6]) g.box(x, 0, -2, 1, 4, 4, METAL_DARK); },
  "service-cart": g => {
    for (const x of [-5, 4]) for (const z of [-2, 2]) g.box(x, 0, z, 2, 2, 2, BLACK);
    g.box(-6, 2, -3, 12, 2, 7, METAL_DARK).box(-5, 4, -3, 10, 5, 7, 0x445b68);
    g.box(-5, 8, -3, 10, 1, 7, 0x7c929c).box(-5, 10, -2, 4, 2, 3, 0xd1a647).box(2, 4, 4, 2, 2, 1, 0xe09148);
  },
  dresser: g => {
    g.box(-8, 1, -4, 16, 9, 7, 0x74635a).box(-9, 10, -5, 18, 1, 9, 0x988174);
    for (const x of [-7, 6]) for (const z of [-3, 2]) g.box(x, 0, z, 1, 1, 1, WOOD_DARK);
    for (const y of [1, 4, 7]) {
      g.box(-7, y, 3, 14, 2, 1, shade(0x8e7969, 0.95 + y * 0.009)).box(-1, y + 1, 4, 2, 1, 1, METAL);
    }
    g.box(3, 11, -2, 3, 2, 2, 0x99613e).box(4, 13, -2, 1, 3, 2, 0x57754d).set(3, 14, -1, 0x769668);
  },
  "classroom-cubbies": g => {
    shelfUnit(g, 17, 12, 6, [0, 5, 10], 0x7e6951);
    for (const x of [-3, 3]) g.box(x, 1, -2, 1, 9, 4, 0x8f7c62);
    for (const [i, x] of [-7, -1, 4].entries()) for (const y of [1, 6]) {
      const color = [0x526e83, 0xae6e54, 0x7c8e60][(i + y) % 3];
      g.box(x, y, -2, 3, 3, 4, color).set(x + 1, y + 1, 2, WHITE);
    }
  },
  "chess-table": chessTable,
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
  "bed-western": g => bed(g, 0x395a86, 0xd9c29b, 0x333641, 0xe6d2ac, (x, z) => Math.abs(x + 0.5) > 6 || z > 8 && (z % 3 === 0 || z > 12)),
  "bed-roommate": g => bed(g, 0x526a68, 0xa3b6aa, 0x333641, 0xe7e4dd, (x, z) => z % 7 === 0 || Math.abs(x + 0.5) > 6),
  "lego-shelf": g => {
    shelfUnit(g, 20, 14, 5, [6], WHITE);
    const bricks = [0xd32f2f, 0x1976d2, 0xfbc02d, 0x388e3c, 0xf57c00];
    for (let i = 0; i < 6; i++) g.box(-8 + i * 3, 1, 0, 2, 1 + (i % 3), 2, bricks[i % 5]);
    g.box(-6, 7, -1, 7, 1, 3, 0xbfc5cb).box(-3, 8, -1, 1, 1, 3, 0xbfc5cb).box(-6, 8, -1, 1, 1, 1, 0xd32f2f).box(0, 8, -1, 1, 1, 1, 0xd32f2f);
    g.box(3, 7, 0, 2, 3, 1, 0xfbc02d).box(3, 10, 0, 2, 1, 1, 0xfde0a0).box(6, 7, 0, 2, 2, 1, 0x1976d2);
  },
  window: g => {
    const cloud = 0xe4f5fc, hill = 0x9cbf9c, lawn = 0x709a79;
    g.box(-8, 0, -1, 16, 13, 1, 0xb1b4b5);
    reliefPanel(g, -7, 1, -1, 14, 11, (i, j) => {
      if (j >= 9 + Math.round(Math.cos(i * 0.4))) return lawn;
      if (j >= 7 + Math.round(Math.sin(i * 0.63))) return hill;
      if ((j === 2 && i >= 3 && i <= 6) || (j === 3 && i >= 2 && i <= 7)) return cloud;
      return shade(SKY, 0.93 + j * 0.027);
    }, color => color === lawn || color === hill || color === cloud ? 1 : 0);
    printEdge(g, -8, 0, 16, 13, 0xe1dcd0);
    g.box(-1, 1, 0, 1, 11, 2, 0xd4cfc4).box(-7, 6, 0, 14, 1, 2, 0xeee8dd);
    g.box(-9, 0, 0, 18, 1, 3, 0xe5dcd0).box(-8, -1, 1, 16, 1, 1, 0xbab3a8);
    g.set(-2, 6, 2, 0x85775f).set(0, 6, 2, 0x85775f);
  },
  "starwars-posters": g => {
    const crater = 0x7a7f86, armour = 0x9aa0a6, trench = 0x5b6066, blue = 0x4fc3ff, red = 0xff4d4d;
    g.box(-12, 0, -1, 11, 15, 1, 0xeeeeee);
    reliefPanel(g, -11, 1, 0, 9, 13, (i, j) => {
      const d = Math.hypot(i - 4, j - 5);
      if (d < 3.6) return d > 2.6 && i < 6 && j < 4 ? crater : j === 5 ? trench : armour;
      return hash3(i, j, 11) > 0.85 ? WHITE : 0x0b0d1a;
    }, color => color === armour ? 2 : color === crater || color === trench ? 1 : 0);
    printEdge(g, -12, 0, 11, 15, 0xeeeeee);
    g.box(0, 0, -1, 11, 15, 1, 0xeeeeee);
    reliefPanel(g, 1, 1, 0, 9, 13, (i, j) => i + j === 9 && j > 1 ? blue : i === j && j > 1 && j < 11 ? red : j > 10 ? 0x161616 : 0x0f1530,
      color => color === blue || color === red ? 2 : 0);
    printEdge(g, 0, 0, 11, 15, 0xeeeeee);
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
    const gold = 0xf6d23c, blue = 0x4fc3ff;
    frame(g, 23, 23, 0xdddddd, (i, j) => hash3(i, j, 5) > 0.91 ? 0x8589ad : shade(0x11162d, 0.65 + 0.6 * hash3(i >> 1, j >> 1, 5)));
    for (const [word, y] of [["STAR", 14], ["WARS", 8]] as const) {
      centeredText(g, word, y, 1, shade(gold, 0.69));
      centeredText(g, word, y, 2, gold);
    }
    for (let i = -6; i <= 6; i++) {
      const y = 2 + Math.floor((i + 6) / 3);
      g.set(i, y, 1, 0x29487a).set(i, y, 2, blue);
      if (i >= -3 && i <= 3) g.set(i, y, 3, 0xd8faff);
    }
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
    const { halfWidth, bottom, top, postTop } = VOLLEYBALL_NET;
    for (const x of [-halfWidth - 1, halfWidth]) g.box(x, 0, -1, 1, postTop, 1, METAL).box(x - 1, 0, -2, 3, 1, 3, METAL_DARK);
    for (let x = -halfWidth; x < halfWidth; x++) for (let y = bottom; y < top; y++) if ((x + y) % 2 === 0 || y === top - 1) g.set(x, y, -1, y === top - 1 ? WHITE : 0x1a1a1a);
  },
  "coding-desk": g => {
    table(g, 18, 10, 12, 0xd7d2c8, METAL_DARK, -9, -5);
    g.box(5, 12, 0, 2, 3, 2, 0xf2f2f2).box(-8, 12, -3, 3, 1, 4, 0xf6c343);
    chair(g, -2, 7, 0x2c2f36, METAL_DARK, 7, -1);
  },
  macbook,
  "brawl-stand": g => {
    const gold = 0xffce1f, red = 0xff5470, blue = 0x41b9ff;
    const skull = ["..######..", ".########.", "##..##..##", "##..##..##", "##########", ".###..###.", "..#.##.#.."];
    g.box(-2, 0, -3, 4, 10, 2, 0x29242f).box(-5, 0, -4, 17, 1, 6, BLACK);
    g.box(-8, 10, -3, 16, 26, 2, 0x111111);
    reliefPanel(g, -7, 11, -1, 14, 24, (i, j) => {
      if (j >= 3 && j < 10 && i >= 2 && i < 12) return skull[j - 3][i - 2] === "#" ? gold : 0x2a0f45;
      if (j >= 13 && j < 22) return j >= 19 ? 0x5aa64a : (Math.abs(i - 4) < 2 && j > 14 && j < 18) ? red : (Math.abs(i - 10) < 2 && j > 15) ? blue : (i + j) % 5 === 0 ? 0x8bd450 : 0x6fc45a;
      return 0x2a0f45;
    }, color => color === gold ? 2 : color === red || color === blue ? 1 : 0);
    printEdge(g, -8, 10, 16, 26, 0x492b64);
    g.box(-5, 35, 0, 10, 1, 1, 0xa157d1);
    const mask = 0x2876dc, shadow = 0x163f94, skin = 0xe69a6a;
    for (const x of [5, 9]) {
      g.box(x, 1, -2, 2, 2, 4, shadow);
      g.box(x, 3, -2, 2, 2, 3, skin);
    }
    g.box(5, 5, -2, 6, 2, 3, 0xc92f59).box(7, 6, 1, 2, 1, 1, gold);
    g.box(5, 7, -2, 6, 3, 4, skin).box(4, 8, -2, 1, 2, 3, skin).box(11, 8, -2, 1, 2, 3, skin);
    g.box(3, 9, -2, 2, 2, 3, mask).box(11, 9, -2, 2, 2, 3, mask);
    g.box(6, 10, -2, 4, 4, 4, mask).box(7, 14, -2, 2, 1, 3, 0x52aaff);
    g.set(6, 12, 1, WHITE).set(9, 12, 1, WHITE).box(7, 10, 1, 2, 1, 1, skin);
    g.set(7, 13, 1, gold).set(8, 13, 1, gold);
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
    panel(g, -11, 0, 0, 22, 21, (x, y) => shade(0x232744, 0.89 + 0.2 * hash3(x, Math.floor(y / 4), 13)));
    for (const x of [-11, -6, 5, 10]) g.box(x, 0, 1, 1, 21, 1, shade(0x232744, x % 2 ? 1.2 : 0.78));
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
  "plaque-cemc": g => plaque(g, LOGOS.cemc, 0x3e2c6e, "CEMC"),
  "plaque-cemc-gold": g => plaque(g, LOGOS.cemc, GOLD, "CEMC"),
  "plaque-maa": g => plaque(g, LOGOS.maa, 0x0b5cad),
  "plaque-aime": g => plaque(g, AIME_SEAL, 0xb47c31, "AIME"),
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
    g.box(-6, 9, -4, 12, 1, 8, 0x454c55);
    for (let x = -5; x <= 5; x += 2) g.box(x, 9, -3, 1, 1, 6, 0x5c636b);
  },
  "cs-ivey": g => centeredText(g, "CS + IVEY", 0, 0, 0xe5dbff),
  "go-mustangs": g => {
    frame(g, 36, 24, 0x57417c, (x, y) => x < 2 || y < 2 ? 0x895cba : (x + y) % 15 < 3 ? 0x483167 : 0x382450);
    centeredText(g, "WESTERN", 16, 1, 0xf7eee6);
    centeredText(g, "GO", 9, 1, 0xd7beff);
    centeredText(g, "MUSTANGS", 3, 1, 0xf7eee6);
  },
  "poster-csa": csaBadge,
  "poster-wds": g => badge(g, 10, 0xfafafa, 0xd1d5db, pen => {
    const navy = 0x1b2a4e, t = new Grid();
    t.text("WDS", -12, -4, 0, navy, 2);
    t.forEach((x, y, _z, color) => pen(x, y, color));
    line(pen, -9, 0, -8, 1, navy); line(pen, -9, 0, -8, -1, navy); line(pen, 9, 0, 8, 1, navy); line(pen, 9, 0, 8, -1, navy);
    line(pen, -3, -3, -1, 3, navy);
  }),
  "poster-wfn": g => badge(g, 9, 0x262626, 0x3f3f46, pen => {
    let x = -14;
    ["W", "F", "N"].forEach((char, i) => {
      const t = new Grid(), w = t.text(char, x, -4, 0, [0xc86aa6, 0xd98c96, 0xe3ad7e][i], 2);
      t.forEach((px, py, _z, color) => pen(px, py, color));
      x += w + 2;
    });
  }),
  "jellycat-frog": g => {
    sphere(g, 0, 4, 0, 4.6, (x, y, z) => shade(z > 2 && y < 0 ? 0xaec17c : 0x78a555, 0.9 + hash3(x, y, z) * 0.18));
    for (const x of [-2, 2]) {
      g.box(x - 1, 7, 1, 2, 2, 2, 0x81a85a).set(x, 8, 3, BLACK);
      g.box(x - 1, 0, 2, 2, 1, 3, 0x648b4e);
    }
    g.box(-1, 4, 4, 3, 1, 1, 0x506f3e).set(-2, 5, 4, 0x506f3e).set(2, 5, 4, 0x506f3e);
  },
  "buldak-bowl": g => {
    for (let y = 0; y < 8; y++) {
      const r = 6 + y * 0.48;
      disc(g, 0, y, 0, r, (x, z) => Math.hypot(x, z) > r - 1.4 ? y >= 6 ? 0xe6ddd0 : 0x24212b : y === 0 ? 0x3c2e37 : null);
    }
    disc(g, 0, 5, 0, 8.25, (x, z) => (x + Math.round(2 * Math.sin(z * 0.9))) % 3 === 0 ? 0xffac47 : 0xbc4a26);
    for (const [x, z] of [[2, -3], [-2, 4], [4, 2], [-4, -3], [0, 1]]) g.set(x, 6, z, 0x78a948);
    for (const z of [-3, -1]) for (let x = -10; x <= 9; x++) g.set(x, 7 + Math.floor((x + 10) / 10), z + Math.floor(x / 5), 0xc18854);
  },
  "pink-court-shoes": g => {
    for (const [x, z] of [[-6, -2], [1, 0]]) {
      for (let i = 0; i < 12; i++) {
        const inset = i === 0 || i === 11 ? 1 : 0;
        g.box(x + inset, 0, z + i, 5 - inset * 2, 2, 1, 0xf6e6ee);
        g.box(x + inset, 2, z + i, 5 - inset * 2, i < 4 ? 4 : i < 7 ? 3 : 2, 1, i < 3 ? 0xd0588f : 0xec88b6);
      }
      g.box(x + 1, 5, z + 1, 3, 1, 3, 0x78295d);
      for (let i = 0; i < 3; i++) g.box(x + 1, i === 0 ? 5 : 4, z + 4 + i * 2, 3, 1, 1, 0xffe2ed);
    }
  },
  "molten-volleyball": g => sphere(g, 0, 7, 0, 7.6, (x, y, z) => {
    const panel = ((Math.atan2(z, x) / Math.PI * 3 + y * 0.17 + 12) % 3 + 3) % 3;
    return shade(panel % 1 < 0.12 ? 0xa8aab4 : [0xf5efe4, 0x277d59, 0xb8394f][Math.floor(panel)], 0.96 + hash3(x, y, z) * 0.08);
  }),
  "standing-desk": g => standingDesk(g, 0xd9c7a7, 0x33333a),
  "standing-desk-roommate": g => standingDesk(g, 0x9b7d64, 0x44444d),
  "desk-divider": g => {
    g.box(-18, 0, -1, 36, 19, 2, (x, y, z) => {
      if (y <= 1 || y === 7 || (y < 7 && (x + 18) % 6 === 0)) return 0x4c3c5a;
      return shade(y < 7 ? 0x60516a : 0x776982, 0.97 + 0.07 * hash3(x, y, z));
    });
    g.box(-19, 19, -2, 38, 1, 4, 0xb19b8c);
  },
  monitor: g => monitor(g, -7, 3, 0, 14, 10, code(17)),
  "desk-lamp": g => { g.box(-1, 0, -1, 3, 1, 3, BLACK).box(0, 1, 0, 1, 7, 1, BLACK).box(0, 8, 0, 1, 1, 4, BLACK).box(-1, 6, 3, 3, 2, 2, BLACK).box(-1, 6, 3, 3, 1, 2, 0xffe9a8); },
  "mini-fridge": g => {
    buildFridgeCabinet(g);
    const door = new Grid();
    buildFridgeDoor(door);
    door.forEach((x, y, z, color) => g.set(x + FRIDGE_HINGE.x / FRIDGE_VOXEL_SIZE, y, z + FRIDGE_HINGE.z / FRIDGE_VOXEL_SIZE, color));
  },
  "roommate-portrait": buildRoommatePreview,
  "hockey-pad": g => g.box(-26, 0, -20, 52, 1, 40, (x, _y, z) => {
    const ax = Math.abs(x + 0.5), az = Math.abs(z + 0.5), d = Math.hypot(x + 0.5, z + 0.5);
    if (ax > 24 || az > 18) return 0x567c9b;
    if (ax === 23.5 || az === 17.5 || (d >= 6.5 && d < 7.6)) return 0x96bbd9;
    if (Math.abs(z + 0.5) === 0.5 && d > 7.6) return 0xba8597;
    if ((x + 26) % 13 === 0 || (z + 20) % 10 === 0) return 0xd0e2ee;
    if ((x * 2 + z * 5) % 37 === 0) return 0xc6dfed;
    return shade(0xddeef7, 0.96 + hash3(x, z, 29) * 0.075);
  }),
  fragrances: g => {
    const bottles: [number, number, Color, Color][] = [[-4, 5, 0xe6a64c, GOLD], [-1, 6, 0xdbe7ee, 0x1a1a1a], [2, 4, 0x1e1e22, 0xb5b5b5], [4, 5, 0x6b3f8f, GOLD]];
    for (const [x, h, c, cap] of bottles) g.box(x, 0, -1, 2, h, 2, c).box(x, h, -1, 2, 1, 2, cap);
  },
  fan: g => {
    disc(g, 0, 0, 0, 4, () => 0x595f70); g.box(-1, 1, -1, 2, 5, 2, 0x727987);
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) {
      const d = Math.hypot(x, y);
      if (d <= 6.4) {
        if (d > 5.3) g.box(x, 9 + y, -1, 1, 1, 3, 0xb8bfcc);
        else if ((Math.atan2(y, x) + d * 0.21 + 8) % 2.1 < 0.85) g.set(x, 9 + y, 0, 0x657790);
        if (Math.abs(x) === Math.abs(y) || x === 0 || y === 0) g.set(x, 9 + y, 2, 0xa2adbd);
      }
    }
    g.box(-1, 8, 2, 3, 3, 1, 0x565d68);
  },
  closet: dormCloset,
  "nightstand": g => {
    shelfUnit(g, 9, 9, 7, [0, 8], 0x574b42);
    g.box(-3, 4, -2, 6, 3, 6, 0x6c5b4d).box(-1, 5, 4, 2, 1, 1, METAL);
    g.box(-3, 1, -2, 5, 2, 4, 0x3d4c65).box(-3, 1, 2, 5, 1, 1, 0xa7a3a1);
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
const footprints = new Map<string, Footprint>();
/** The model's x/z extent relative to its placement origin (exclusive max). */
export function modelFootprint(id: string): Footprint {
  const cached = footprints.get(id);
  if (cached) return cached;
  const b = buildModel(id).bounds();
  const w = b.maxX - b.minX + 1, d = b.maxZ - b.minZ + 1, s = modelVoxelSize(id);
  const footprint = { minX: -Math.floor(w / 2) * s, maxX: (w - Math.floor(w / 2)) * s, minZ: -Math.floor(d / 2) * s, maxZ: (d - Math.floor(d / 2)) * s, height: (b.maxY + 1) * s };
  footprints.set(id, footprint);
  return footprint;
}
