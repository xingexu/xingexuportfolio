/**
 * A sparse voxel grid. Every model in the About journey (rooms, props, the
 * avatar, even sign lettering) is drawn into one of these, so every block in
 * the scene has exactly the same 1×1×1 dimensions.
 */
export type Color = number;

const OFFSET = 512, SPAN = 1024;
const key = (x: number, y: number, z: number) => ((x + OFFSET) * SPAN + (y + OFFSET)) * SPAN + (z + OFFSET);

export type Bounds = { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number };

export class Grid {
  readonly cells = new Map<number, Color>();

  set(x: number, y: number, z: number, color: Color) {
    if (color < 0) this.cells.delete(key(x, y, z));
    else this.cells.set(key(x, y, z), color);
    return this;
  }

  get(x: number, y: number, z: number) {
    return this.cells.get(key(x, y, z));
  }

  has(x: number, y: number, z: number) {
    return this.cells.has(key(x, y, z));
  }

  /** Fills [x, x+w) × [y, y+h) × [z, z+d). A negative colour carves. */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: Color | ((x: number, y: number, z: number) => Color)) {
    for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) for (let k = z; k < z + d; k++) {
      this.set(i, j, k, typeof color === "number" ? color : color(i, j, k));
    }
    return this;
  }

  /** Draws 3×5 lettering on the XY plane at depth z, facing +z. Returns the width. */
  text(value: string, x: number, y: number, z: number, color: Color, scale = 1) {
    let cursor = x;
    for (const char of value.toUpperCase()) {
      const glyph = GLYPHS[char] ?? GLYPHS[" "];
      const width = glyph[0].length;
      glyph.forEach((row, r) => {
        for (let c = 0; c < width; c++) if (row[c] === "#") {
          this.box(cursor + c * scale, y + (4 - r) * scale, z, scale, scale, 1, color);
        }
      });
      cursor += (width + 1) * scale;
    }
    return cursor - x - scale;
  }

  forEach(callback: (x: number, y: number, z: number, color: Color) => void) {
    for (const [k, color] of this.cells) {
      const z = (k % SPAN) - OFFSET;
      const y = (Math.floor(k / SPAN) % SPAN) - OFFSET;
      const x = Math.floor(k / (SPAN * SPAN)) - OFFSET;
      callback(x, y, z, color);
    }
  }

  get size() { return this.cells.size; }

  bounds(): Bounds {
    const b = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
    this.forEach((x, y, z) => {
      if (x < b.minX) b.minX = x; if (y < b.minY) b.minY = y; if (z < b.minZ) b.minZ = z;
      if (x > b.maxX) b.maxX = x; if (y > b.maxY) b.maxY = y; if (z > b.maxZ) b.maxZ = z;
    });
    return b;
  }
}

export function textWidth(value: string, scale = 1) {
  let width = 0;
  for (const char of value.toUpperCase()) width += ((GLYPHS[char] ?? GLYPHS[" "])[0].length + 1) * scale;
  return Math.max(0, width - scale);
}

/** Deterministic per-voxel noise in [0, 1). */
export function hash3(x: number, y: number, z: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function shade(color: Color, factor: number): Color {
  const r = Math.min(255, Math.round(((color >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((color & 255) * factor));
  return (r << 16) | (g << 8) | b;
}

const GLYPHS: Record<string, string[]> = {
  " ": ["...", "...", "...", "...", "..."],
  A: [".#.", "#.#", "###", "#.#", "#.#"], B: ["##.", "#.#", "##.", "#.#", "##."],
  C: [".##", "#..", "#..", "#..", ".##"], D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"], F: ["###", "#..", "##.", "#..", "#.."],
  G: [".##", "#..", "#.#", "#.#", ".##"], H: ["#.#", "#.#", "###", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"], J: ["..#", "..#", "..#", "#.#", ".#."],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"], L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"], N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."], P: ["##.", "#.#", "##.", "#..", "#.."],
  Q: [".#.", "#.#", "#.#", "##.", ".##"], R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."], T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", "###"], V: ["#.#", "#.#", "#.#", "#.#", ".#."],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"], X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."], Z: ["###", "..#", ".#.", "#..", "###"],
  "0": ["###", "#.#", "#.#", "#.#", "###"], "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["##.", "..#", ".#.", "#..", "###"], "3": ["##.", "..#", ".#.", "..#", "##."],
  "4": ["#.#", "#.#", "###", "..#", "..#"], "5": ["###", "#..", "##.", "..#", "##."],
  "6": [".##", "#..", "###", "#.#", "###"], "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"], "9": ["###", "#.#", "###", "..#", "##."],
  "%": ["#.#", "..#", ".#.", "#..", "#.#"], "-": ["...", "...", "###", "...", "..."],
  ".": [".", ".", ".", ".", "#"], "!": ["#", "#", "#", ".", "#"], "'": ["#", "#", ".", ".", "."],
  ":": [".", "#", ".", "#", "."], "/": ["..#", "..#", ".#.", "#..", "#.."], "+": ["...", ".#.", "###", ".#.", "..."], "=": ["...", "###", "...", "###", "..."],
  "&": [".#.", "#.#", ".#.", "#.#", ".##"], "#": ["#.#", "###", "#.#", "###", "#.#"], "<": ["..#", ".#.", "#..", ".#.", "..#"], ">": ["#..", ".#.", "..#", ".#.", "#.."],
  "^": [".#.", "#.#", "...", "...", "..."],
};
