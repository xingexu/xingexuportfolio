import { CHAPTERS, type Chapter, type JourneyItem, type Placement } from "./data";
import { modelFootprint } from "./models";
import { Grid, hash3, shade, textWidth, type Color } from "./voxel";

export type Box = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Vec = { x: number; z: number };
export type RoomSide = "left" | "right" | "front" | "back";
export const WALL = 2, WALL_HEIGHT = 38, DOOR_HALF = 7, DOOR_HEIGHT = 28, ENTRANCE = 28, INTERACT_RANGE = 7;
export const AVATAR_SCALE = 0.68;

/** Walkable interior. Indoor rooms are closed on all four sides; the arrival apron is open behind you. */
export function interior(chapter: Chapter): Box {
  return { minX: -chapter.width / 2 + WALL, maxX: chapter.width / 2 - WALL, minZ: -chapter.depth / 2 + WALL, maxZ: chapter.depth / 2 - (chapter.outdoor ? 0 : WALL) };
}

export function roomSide(room: Box, x: number, z: number, inset = 0): RoomSide | null {
  if (z < room.minZ + inset) return "front";
  if (z >= room.maxZ - inset) return "back";
  if (x < room.minX + inset) return "left";
  if (x >= room.maxX - inset) return "right";
  return null;
}

export function cutawaySides(room: Box, camera: Vec): Set<RoomSide> {
  const sides = new Set<RoomSide>();
  if (camera.x < room.minX) sides.add("left");
  if (camera.x > room.maxX) sides.add("right");
  if (camera.z < room.minZ) sides.add("front");
  if (camera.z > room.maxZ) sides.add("back");
  return sides;
}

export function placementBox(p: Placement): Box {
  const f = modelFootprint(p.model), rot = p.rot ?? 0;
  const [minX, maxX, minZ, maxZ] =
    rot === 0 ? [f.minX, f.maxX, f.minZ, f.maxZ] :
    rot === 1 ? [f.minZ, f.maxZ, -f.maxX, -f.minX] :
    rot === 2 ? [-f.maxX, -f.minX, -f.maxZ, -f.minZ] :
    [-f.maxZ, -f.minZ, f.minX, f.maxX];
  return { minX: p.x + minX, maxX: p.x + maxX, minZ: p.z + minZ, maxZ: p.z + maxZ };
}

const CUSTOM_BLOCKS: Record<string, Box[]> = {
  plane: [{ minX: -38, maxX: -24, minZ: -31, maxZ: 33 }, { minX: -60, maxX: -4, minZ: -1, maxZ: 15 }],
};

export function chapterObstacles(index: number): Box[] {
  const chapter = CHAPTERS[index];
  return [...chapter.items, ...chapter.decor].flatMap(p => {
    if (p.solid === false) return [];
    if ("id" in p && CUSTOM_BLOCKS[(p as JourneyItem).id]) return CUSTOM_BLOCKS[(p as JourneyItem).id];
    return [placementBox(p)];
  });
}

const obstacleCache = new Map<number, Box[]>();
const obstacles = (index: number) => {
  let list = obstacleCache.get(index);
  if (!list) obstacleCache.set(index, list = chapterObstacles(index));
  return list;
};

function hits(box: Box, x: number, z: number, r: number) {
  const cx = Math.max(box.minX, Math.min(box.maxX, x)), cz = Math.max(box.minZ, Math.min(box.maxZ, z));
  return (x - cx) ** 2 + (z - cz) ** 2 < r * r;
}

export function blocked(index: number, x: number, z: number, r: number) {
  const chapter = CHAPTERS[index], room = interior(chapter);
  const inDoor = Math.abs(x) <= DOOR_HALF - r && z < room.minZ + r;
  if (!inDoor && (x < room.minX + r || x > room.maxX - r || z < room.minZ + r)) return true;
  const inBackDoor = index > 0 && Math.abs(x) <= DOOR_HALF - r;
  if (!inBackDoor && z > room.maxZ - r) return true;
  return obstacles(index).some(box => hits(box, x, z, r));
}

export type StepResult = Vec & { exit: "next" | "prev" | null };
/** Moves one axis at a time so the player slides along walls and furniture. */
export function step(index: number, pos: Vec, dx: number, dz: number, r: number): StepResult {
  let { x, z } = pos;
  const sub = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.5));
  for (let i = 0; i < sub; i++) {
    if (!blocked(index, x + dx / sub, z, r)) x += dx / sub;
    if (!blocked(index, x, z + dz / sub, r)) z += dz / sub;
  }
  const chapter = CHAPTERS[index], room = interior(chapter);
  const exit = z < room.minZ - 1 ? "next" : index > 0 && z > room.maxZ + 1 ? "prev" : null;
  return { x, z, exit };
}

export function boxDistance(box: Box, p: Vec) {
  const dx = Math.max(box.minX - p.x, 0, p.x - box.maxX), dz = Math.max(box.minZ - p.z, 0, p.z - box.maxZ);
  return Math.hypot(dx, dz);
}

/**
 * Everything within reach, closest first. Things resting on furniture or hung
 * on walls reach a little further so what holds them never hides them.
 */
export function nearbyItems(index: number, p: Vec, limit = 3, range = INTERACT_RANGE): JourneyItem[] {
  return CHAPTERS[index].items
    .map(item => {
      const boxes = CUSTOM_BLOCKS[item.id] ?? [placementBox(item)];
      const distance = Math.min(...boxes.map(box => boxDistance(box, p)));
      return { item, distance, score: distance - (item.y ? 2.5 : 0), reach: range + (item.y ? 3 : 0) };
    })
    .filter(entry => entry.distance <= entry.reach)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(entry => entry.item);
}
export const nearestItem = (index: number, p: Vec) => nearbyItems(index, p, 1)[0] ?? null;

export function ageAt(chapter: Chapter, z: number) {
  const span = chapter.ageTo - chapter.ageFrom;
  if (span === 0) return chapter.ageFrom;
  const progress = Math.max(0, Math.min(0.999, (chapter.depth / 2 - 6 - z) / (chapter.depth - 16)));
  return chapter.ageFrom + Math.floor(progress * (span + 1));
}

export const INTRO_END: Vec = { x: -1, z: -12 };
export function spawn(index: number, from: "start" | "forward" | "back"): Vec & { yaw: number } {
  const chapter = CHAPTERS[index], room = interior(chapter);
  if (from === "back") return { x: 0, z: room.minZ + 7, yaw: 0 };
  if (index === 0) return { ...INTRO_END, yaw: Math.PI };
  return { x: 0, z: room.maxZ - 7, yaw: Math.PI };
}

export const walkSpeed = (height: number) => 18 + height * 0.55;

/* ── Room shells ─────────────────────────────────────────────────────── */

function floorColor(chapter: Chapter, x: number, z: number): Color {
  const n = hash3(x, 0, z);
  switch (chapter.floor) {
    case "wood": case "laminate": case "gym": {
      const width = chapter.floor === "laminate" ? 5 : 4, plank = Math.floor((x + 512) / width);
      const seam = (z + 512 + plank * 7) % (chapter.floor === "laminate" ? 22 : 16) === 0;
      const tones = chapter.floor === "wood" ? [0xb98a5a, 0xa97c4f, 0xc29464] : chapter.floor === "gym" ? [0xdcb47c, 0xd2a96f, 0xe2bd88] : [0xd2c4aa, 0xc8b99d, 0xdacdb5];
      let c = tones[Math.floor(hash3(plank, 3, Math.floor((z + 512 + plank * 7) / 16)) * 3)];
      if (seam || (x + 512) % width === 0) c = shade(c, 0.9);
      if (chapter.floor === "gym") {
        const line = ((x === -33 || x === -7) && z >= -30 && z <= 34) || ((z === -30 || z === 34 || z === 6) && x >= -33 && x <= -7);
        const attack = (z === -4 || z === 16) && x >= -33 && x <= -7;
        if (line) c = 0x2a5db0; else if (attack) c = 0xd9534f;
      }
      return shade(c, 0.98 + n * 0.045);
    }
    case "tile": {
      if ((x + 512) % 8 === 0 || (z + 512) % 8 === 0) return 0xc9c1ad;
      const checker = (Math.floor((x + 512) / 8) + Math.floor((z + 512) / 8)) % 2;
      return n > 0.93 ? 0x9f9886 : checker ? 0xece6d6 : 0xd8d0bc;
    }
    case "carpet": return shade(0x8d9aa8, 0.94 + n * 0.1);
    case "tarmac": {
      if (Math.abs(x) > chapter.width / 2 + 2) return shade(0x6aa84f, 0.92 + n * 0.14);
      if ((x === 0 || x === -1) && z > -chapter.depth / 2) return 0xf2c230;
      if ((z === -12 || z === -13) && x >= -4 && x < 0) return 0xf2c230;
      if ((x === 20 || x === -20) && (z + 512) % 6 < 3) return 0xf4f4f4;
      return shade(0x5d6166, 0.9 + n * 0.16);
    }
  }
}

function luminance(c: Color) { return ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11; }

const WINDOWS: Record<string, { side: "front" | "left" | "right"; center: number; width: number; y: number; height: number; sky: Color; ground: Color }[]> = {
  holsworthy: [{ side: "front", center: 19, width: 17, y: 20, height: 13, sky: 0x9fcae1, ground: 0x5d906e }],
  school: [{ side: "left", center: 0, width: 28, y: 18, height: 15, sky: 0xb5d7ea, ground: 0x718c63 }],
  elm: [{ side: "front", center: 20, width: 16, y: 19, height: 16, sky: 0xffd7ac, ground: 0x715e79 }],
  bayview: [-22, 22].map(center => ({ side: "front", center, width: 17, y: 25, height: 10, sky: 0xc4dfed, ground: 0x7c9ab3 })),
  western: [{ side: "right", center: -14, width: 25, y: 21, height: 13, sky: 0xb2bde5, ground: 0x6a729c }],
};

function addWindow(grid: Grid, bounds: Box, chapter: Chapter, spec: (typeof WINDOWS)[string][number]) {
  const { side, center, width, y: base, height, sky, ground } = spec;
  const start = center - Math.floor(width / 2);
  const paint = (x: number, y: number, depth: number, color: Color) => {
    if (side === "front") grid.set(start + x, base + y, bounds.minZ + depth, color);
    if (side === "left") grid.set(bounds.minX + depth, base + y, start + x, color);
    if (side === "right") grid.set(bounds.maxX - 1 - depth, base + y, start + x, color);
  };
  for (let x = 0; x < width; x++) for (let y = 0; y < height; y++) {
    const frame = y === 0 || y === height - 1 || x === 0 || x === width - 1 || x === Math.floor(width / 2) || y === Math.floor(height / 2);
    const ridge = Math.round(2 + 1.4 * Math.sin(x / 2.7) + 1.3 * Math.cos(x / 1.8));
    const c = frame ? chapter.trim : y < ridge + 2 ? shade(ground, 0.85 + y * 0.05) : shade(sky, 1.08 - y * 0.012);
    paint(x, y, 0, c);
    if (frame) paint(x, y, 1, shade(c, 1.12));
  }
  for (let x = -1; x <= width; x++) for (let depth = 0; depth < 3; depth++) paint(x, -1, depth, shade(chapter.trim, 1.14));
}

export function buildRoomShell(index: number): Grid {
  const chapter = CHAPTERS[index], g = new Grid();
  const W = chapter.width, D = chapter.depth, x0 = -W / 2, z0 = -D / 2;
  const extra = chapter.outdoor ? 60 : 0, zEnd = chapter.outdoor ? D / 2 + ENTRANCE + 40 : D / 2;
  for (let x = x0 - extra; x < W / 2 + extra; x++) for (let z = z0; z < zEnd; z++) g.set(x, -1, z, floorColor(chapter, x, z));
  const nearZ = D / 2 - WALL;
  if (index > 0) {
    for (let x = -8; x < 8; x++) for (let z = nearZ - 5; z < nearZ; z++) {
      const arrow = Math.abs(x + 0.5) <= (z - (nearZ - 5)) && x > -4 && x < 4;
      g.set(x, 0, z, arrow ? 0xd8d8d8 : 0x2b2b30);
    }
  }
  const wallColor = (x: number, y: number, z: number) => {
    const n = hash3(x, y, z);
    if (y < 2) return chapter.trim;
    if (y === WALL_HEIGHT - 1) return shade(chapter.trim, 0.9);
    if (!chapter.outdoor) {
      const axis = x < x0 + WALL || x >= W / 2 - WALL ? z : x;
      if (y === 10 || y === 11 || (chapter.id === "bayview" && y === 26)) return shade(chapter.trim, y === 10 ? 0.83 : 0.96);
      if (y < 10) {
        const seam = (axis + 512) % (chapter.id === "bayview" ? 8 : 6) === 0;
        return shade(chapter.id === "bayview" ? chapter.trim : chapter.wall, seam ? 0.76 : 0.87 + n * 0.03);
      }
      if (chapter.id === "bayview" && ((y - 12) % 4 === 0 || (axis + 512 + Math.floor(y / 4) * 4) % 8 === 0)) return shade(chapter.wall, 0.9);
    }
    return shade(chapter.wall, 0.97 + n * 0.05);
  };
  if (chapter.outdoor) {
    for (let x = x0; x < W / 2; x++) for (let y = 0; y < WALL_HEIGHT + 6; y++) {
      const pane = (x + 512) % 8 === 0 || y % 10 === 0 || y < 2 || y >= WALL_HEIGHT;
      g.set(x, y, z0, pane ? (y >= WALL_HEIGHT ? chapter.trim : 0xe8ecef) : (y > 14 ? 0x9fcde6 : 0x84b6d4));
      g.set(x, y, z0 + 1, pane ? 0xd8dde3 : -1);
    }
    for (const side of [x0 - 1, W / 2]) for (let z = z0 + 2; z < D / 2 + ENTRANCE; z++) {
      g.box(side, 0, z, 1, 3, 1, Math.floor((z + 512) / 3) % 2 ? 0xf2c230 : 0x1d1d1d);
    }
  } else {
    g.box(x0, 0, z0, WALL, WALL_HEIGHT, D, wallColor).box(W / 2 - WALL, 0, z0, WALL, WALL_HEIGHT, D, wallColor);
    g.box(x0, 0, z0, W, WALL_HEIGHT, WALL, wallColor);
    g.box(x0, 0, nearZ, W, WALL_HEIGHT, WALL, wallColor);
    g.box(x0 + WALL, 0, z0 + WALL, 1, 2, D - WALL * 2, chapter.trim).box(W / 2 - WALL - 1, 0, z0 + WALL, 1, 2, D - WALL * 2, chapter.trim);
    g.box(x0 + WALL, 0, z0 + WALL, W - WALL * 2, 2, 1, chapter.trim).box(x0 + WALL, 0, nearZ - 1, W - WALL * 2, 2, 1, chapter.trim);
    for (const spec of WINDOWS[chapter.id] ?? []) addWindow(g, interior(chapter), chapter, spec);
    if (index > 0) {
      g.box(-DOOR_HALF, 0, nearZ - 1, DOOR_HALF * 2, DOOR_HEIGHT, WALL + 1, -1);
      g.box(-DOOR_HALF, 0, D / 2 + 1, DOOR_HALF * 2, DOOR_HEIGHT, 1, 0x3a3a44);
      g.box(-DOOR_HALF - 1, 0, nearZ - 1, 1, DOOR_HEIGHT + 1, WALL + 2, chapter.trim).box(DOOR_HALF, 0, nearZ - 1, 1, DOOR_HEIGHT + 1, WALL + 2, chapter.trim);
      g.box(-DOOR_HALF - 1, DOOR_HEIGHT, nearZ - 1, DOOR_HALF * 2 + 2, 1, WALL + 2, chapter.trim);
      for (let x = -DOOR_HALF; x < DOOR_HALF; x++) for (let z = nearZ; z < D / 2 + 2; z++) g.set(x, -1, z, 0x2b2b30);
    }
  }
  // The doorway glows with the next chapter.
  g.box(-DOOR_HALF, 0, z0, DOOR_HALF * 2, DOOR_HEIGHT, WALL + 1, -1);
  g.box(-DOOR_HALF, 0, z0 - 2, DOOR_HALF * 2, DOOR_HEIGHT, 1, (_x, y) => y > DOOR_HEIGHT - 6 ? 0xfff6d8 : 0xffe9a8);
  g.box(-DOOR_HALF - 1, 0, z0 - 1, 1, DOOR_HEIGHT + 1, WALL + 2, chapter.trim).box(DOOR_HALF, 0, z0 - 1, 1, DOOR_HEIGHT + 1, WALL + 2, chapter.trim);
  g.box(-DOOR_HALF - 1, DOOR_HEIGHT, z0 - 1, DOOR_HALF * 2 + 2, 1, WALL + 2, chapter.trim);
  for (let x = -DOOR_HALF; x < DOOR_HALF; x++) for (let z = z0 - 2; z < z0 + WALL + 1; z++) g.set(x, -1, z, 0xf3e3b5);
  const label = chapter.doorLabel, w = textWidth(label) + 4;
  const plate = luminance(chapter.trim) > 140 ? 0x2d2d33 : chapter.trim;
  g.box(-Math.ceil(w / 2), DOOR_HEIGHT + 2, z0 + WALL, w, 7, 1, plate);
  g.text(label, -Math.ceil(w / 2) + 2, DOOR_HEIGHT + 3, z0 + WALL + 1, 0xf6f1e4);
  return g;
}

export function buildCutawayShell(index: number) {
  const chapter = CHAPTERS[index], shell = buildRoomShell(index);
  const fixed = new Grid(), bounds = interior(chapter);
  const walls = { left: new Grid(), right: new Grid(), front: new Grid(), back: new Grid() };
  shell.forEach((x, y, z, color) => {
    const side = chapter.outdoor
      ? y >= 0 && z < bounds.minZ + 2 ? "front" : null
      : y >= 3 ? roomSide(bounds, x, z, 3) : null;
    (side ? walls[side] : fixed).set(x, y, z, color);
  });
  return { fixed, walls };
}
