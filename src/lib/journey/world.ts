import { CHAPTERS, type Chapter, type JourneyItem, type Placement } from "./data";
import { modelFootprint, VOLLEYBALL_NET } from "./models";
import type { BallField, CourtNet } from "./volleyball";
import { Grid, hash3, shade, textWidth, type Color } from "./voxel";

export type Box = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Vec = { x: number; z: number };
export type RoomSide = "left" | "right" | "front" | "back";
export const WALL = 2, WALL_HEIGHT = 38, DOOR_HALF = 7, DOOR_HEIGHT = 28, ENTRANCE = 28, INTERACT_RANGE = 7;
export const AVATAR_SCALE = 0.68;
export const DOOR_VOXEL_SIZE = 0.5;
export const renderPixelSize = (width: number, height: number) => Math.max(1, Math.ceil(Math.sqrt(width * height / 420_000))) / 2;

export const GRASS_TILE_SIZE = 128;

export function buildGrassTile() {
  const size = GRASS_TILE_SIZE, pixels = new Uint8Array(size * size * 4);
  const patch = (x: number, z: number, width: number) => {
    const count = size / width;
    const at = (u: number, v: number) => hash3(u % count, width, v % count);
    const i = Math.floor(x / width), j = Math.floor(z / width);
    const u = x / width - i, v = z / width - j;
    return (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) +
      (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v;
  };
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const blade = hash3(x, 71, z), clump = patch(x, z, 8), field = patch(x, z, 32);
    const tone = field > 0.59 ? 0x79944a : 0x5e884c;
    const color = shade(tone, 0.74 + 0.25 * clump + 0.13 * field + 0.14 * blade + (blade > 0.95 ? 0.12 : 0));
    pixels.set([(color >> 16) & 255, (color >> 8) & 255, color & 255, 255], (z * size + x) * 4);
  }
  return pixels;
}

export function cameraOffsets(height: number, aspect: number, front: number, tilt: number) {
  const portrait = Math.max(0, 1 - aspect);
  const level = 44 + 10 * portrait - 15 * front;
  const look = height * (0.43 + 0.17 * front);
  return {
    orbit: Math.PI * front,
    distance: 40 + 18 * portrait + 16 * tilt,
    rise: level + (10 + 4 * portrait - level) * tilt,
    lookHeight: look + (height * 0.28 + 9 - look) * tilt,
    lead: 10 * (1 - front) * (1 - tilt),
  };
}

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

export function cutawayOpacity(room: Box, camera: Vec): Record<RoomSide, number> {
  const fade = (gap: number) => {
    const t = Math.max(0, Math.min(1, (gap - 2) / 6));
    return t * t * (3 - 2 * t);
  };
  return { left: fade(camera.x - room.minX), right: fade(room.maxX - camera.x),
    front: fade(camera.z - room.minZ), back: fade(room.maxZ - camera.z) };
}

export function cameraLookAhead(room: Box, player: Vec, forward: Vec, lead: number) {
  const limit = (at: number, direction: number, min: number, max: number) =>
    direction > 0 ? (max - 2 - at) / direction : direction < 0 ? (min + 2 - at) / direction : Infinity;
  return Math.max(0, Math.min(lead, limit(player.x, forward.x, room.minX, room.maxX),
    limit(player.z, forward.z, room.minZ, room.maxZ)));
}

export function doorwayOpening(z: number, player: Vec) {
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const approach = clamp((19 - Math.abs(player.z - z)) / 11) * clamp((DOOR_HALF + 7 - Math.abs(player.x)) / 7);
  return approach * approach * (3 - 2 * approach);
}

export function buildDoorLeaf(chapter: Chapter) {
  const leaf = new Grid(), width = DOOR_HALF / DOOR_VOXEL_SIZE - 1, height = DOOR_HEIGHT / DOOR_VOXEL_SIZE - 1;
  const rail = chapter.id === "western" ? 0x685580 : chapter.outdoor ? 0x788d9c : shade(chapter.trim, 0.84);
  const panel = (x: number, y: number, z: number) => shade(rail, 0.86 + 0.16 * hash3(x, Math.floor(y / 3), z));
  leaf.box(0, 0, -1, width, height, 2, panel);
  for (const direction of [-1, 1]) {
    const z = direction === 1 ? 1 : -2;
    for (const [bottom, top] of [[3, 20], [24, height - 3]]) {
      const finish = chapter.outdoor && bottom > 20 ? 0x8bb4c7 : rail;
      const trim = shade(rail, 1.2);
      leaf.box(1, bottom, z, width - 2, 1, 1, trim).box(1, top, z, width - 2, 1, 1, trim);
      leaf.box(1, bottom + 1, z, 1, top - bottom - 1, 1, trim);
      leaf.box(width - 2, bottom + 1, z, 1, top - bottom - 1, 1, shade(trim, 0.85));
      leaf.box(2, bottom + 1, direction === 1 ? 0 : -1, width - 4, top - bottom - 1, 1, (x, y) =>
        shade(finish, 0.73 + 0.16 * hash3(x, Math.floor(y / 5), bottom) + (chapter.outdoor && (y + x * 2) % 11 <= 1 ? 0.24 : 0)));
    }
    leaf.box(width - 3, 19, z, 2, 4, 1, 0xb9a786);
    leaf.box(width - 4, 21, z + direction, 3, 1, 1, 0xe3cd9d);
    for (const y of [5, height - 8]) leaf.box(0, y, z, 1, 3, 1, 0x7c8183);
  }
  return leaf;
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
    if (p.solid === false || p.bump || p.ball) return [];
    if ("id" in p && CUSTOM_BLOCKS[(p as JourneyItem).id]) return CUSTOM_BLOCKS[(p as JourneyItem).id];
    return [placementBox(p)];
  });
}

export function buildBallField(index: number): BallField {
  const chapter = CHAPTERS[index];
  let net: CourtNet | undefined;
  const blocks = [...chapter.items, ...chapter.decor].flatMap(p => {
    if (p.ball || p.bump || p.solid === false) return [];
    const box = placementBox(p), bottom = p.y ?? 0;
    if (p.model === "volleyball-net") {
      const { halfWidth, bottom, top, postTop } = VOLLEYBALL_NET;
      net = { minX: p.x - halfWidth, maxX: p.x + halfWidth, minZ: p.z, maxZ: p.z + 1, z: p.z + 0.5, bottom, top, postTop };
      const posts = [p.x - halfWidth - 1, p.x + halfWidth].map(x =>
        ({ minX: x, maxX: x + 1, minZ: p.z, maxZ: p.z + 1, bottom: 0, top: postTop }));
      return [net, ...posts];
    }
    return [{ ...box, bottom, top: bottom + modelFootprint(p.model).height }];
  });
  return { ...interior(chapter), ceiling: WALL_HEIGHT, blocks, net };
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

export type BumpProp = Vec & { kind: NonNullable<Placement["bump"]>; radius: number; vx: number; vz: number; fall: Vec | null; tilt: number };

export function bumpProp(prop: BumpProp, player: Vec, movement: Vec, playerRadius: number, dt: number) {
  const x = prop.x - player.x, z = prop.z - player.z, distance = Math.hypot(x, z);
  const approach = distance > 0.01 ? (x * movement.x + z * movement.z) / distance : Math.hypot(movement.x, movement.z);
  if (distance > prop.radius + playerRadius || approach < 0.025) return;
  const heading = distance > 0.01 ? { x: x / distance, z: z / distance } : { x: movement.x / approach, z: movement.z / approach };
  if (prop.kind === "tip") prop.fall ??= heading;
  else {
    const speed = Math.min(26, approach / Math.max(dt, 0.001) * 1.25);
    const boost = Math.max(0, speed - (prop.vx * heading.x + prop.vz * heading.z));
    prop.vx += heading.x * boost;
    prop.vz += heading.z * boost;
  }
}

export function settleBump(index: number, prop: BumpProp, dt: number, reducedMotion: boolean) {
  if (prop.kind === "tip") {
    if (prop.fall) {
      const target = Math.PI / 2;
      prop.tilt = reducedMotion || target - prop.tilt < 0.007 ? target : prop.tilt + (target - prop.tilt) * (1 - Math.exp(-12 * dt));
    }
    return;
  }
  const room = interior(CHAPTERS[index]), r = prop.radius;
  const free = (x: number, z: number) => x >= room.minX + r && x <= room.maxX - r &&
    z >= room.minZ + r && z <= room.maxZ - r && !obstacles(index).some(box => hits(box, x, z, r));
  const x = prop.x + prop.vx * dt, z = prop.z + prop.vz * dt;
  if (free(x, prop.z)) prop.x = x; else prop.vx *= -0.35;
  if (free(prop.x, z)) prop.z = z; else prop.vz *= -0.35;
  const drag = Math.exp(-3.5 * dt);
  prop.vx *= drag; prop.vz *= drag;
  if (Math.hypot(prop.vx, prop.vz) < 0.12) prop.vx = prop.vz = 0;
}

export type StepResult = Vec & { exit: "next" | "prev" | null };
/** Moves one axis at a time so the player slides along walls and furniture. */
export function step(index: number, pos: Vec, dx: number, dz: number, r: number, dynamicBlocked?: (from: Vec, to: Vec, radius: number) => boolean): StepResult {
  let { x, z } = pos;
  const sub = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.5));
  const free = (nx: number, nz: number) => !blocked(index, nx, nz, r) && !dynamicBlocked?.({ x, z }, { x: nx, z: nz }, r);
  for (let i = 0; i < sub; i++) {
    if (free(x + dx / sub, z)) x += dx / sub;
    if (free(x, z + dz / sub)) z += dz / sub;
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
export function nearbyItems(index: number, p: Vec, limit = 3, range = INTERACT_RANGE, positions?: ReadonlyMap<string, Vec>): JourneyItem[] {
  return CHAPTERS[index].items
    .map(item => {
      const moved = positions?.get(item.id);
      const boxes = CUSTOM_BLOCKS[item.id] ?? [placementBox(moved ? { ...item, x: moved.x, z: moved.z } : item)];
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

export function journeyArrows(index: number): Vec[] {
  const exit = interior(CHAPTERS[index]).minZ + 5;
  const first = spawn(index, "forward").z - 8;
  const intervals = Math.max(1, Math.ceil((first - exit) / 12));
  return Array.from({ length: intervals + 1 }, (_, i) => ({ x: 0, z: first + (exit - first) * i / intervals }));
}

export function buildJourneyArrow() {
  const arrow = new Grid(), shape = ["......#......", ".....###.....", "....#####....", "...#######...",
    "..####.####..", ".####...####.", "####.....####", "###.......###"];
  shape.forEach((row, z) => [...row].forEach((pixel, x) => {
    if (pixel !== "#") return;
    arrow.box(x - 7, 0, z - 5, 3, 2, 3, 0x163244);
  }));
  shape.forEach((row, z) => [...row].forEach((pixel, x) => {
    if (pixel === "#") arrow.set(x - 6, 2, z - 4, z < 4 ? 0xc5fcff : 0x75dedf);
  }));
  return arrow;
}

export const walkSpeed = (height: number) => 20 + height * 0.6;
export const JUMP_DURATION = 0.64, JUMP_HEIGHT = 4;

export function jumpHeight(elapsed: number) {
  const t = Math.max(0, Math.min(1, elapsed / JUMP_DURATION));
  return 4 * JUMP_HEIGHT * t * (1 - t);
}

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
        const inCourt = x >= -44 && x <= -15;
        const line = ((x === -44 || x === -15) && z >= -40 && z <= 44) || ((z === -40 || z === 44 || z === 7) && inCourt);
        const attack = (z === -5 || z === 19) && inCourt;
        if (line) c = 0x2a5db0; else if (attack) c = 0xd9534f;
      }
      const grain = hash3(x, 16, Math.floor(z / 4));
      return shade(c, (0.94 + n * 0.04 + grain * 0.07) * (chapter.id === "western" ? 0.49 + 0.19 * Math.max(0, 1 - Math.hypot(x - 32, z + 12) / 36) : 1));
    }
    case "tile": {
      if ((x + 512) % 8 === 0 || (z + 512) % 8 === 0) return 0xc9c1ad;
      const checker = (Math.floor((x + 512) / 8) + Math.floor((z + 512) / 8)) % 2;
      return n > 0.93 ? 0x9f9886 : checker ? 0xece6d6 : 0xd8d0bc;
    }
    case "carpet": return shade(0x8d9aa8, 0.85 + n * 0.16 + ((x + z) % 2 === 0 ? 0.045 : 0));
    case "tarmac": {
      if (Math.abs(x) > chapter.width / 2 + 2) return shade(0x6aa84f, 0.92 + n * 0.14);
      if ((x === 0 || x === -1) && z > -chapter.depth / 2) return 0xf2c230;
      if ((z === -12 || z === -13) && x >= -4 && x < 0) return 0xf2c230;
      if ((x === 20 || x === -20) && (z + 512) % 10 < 5) return 0xf4f4f4;
      if (Math.abs(x) === 46 || (z === 37 && Math.abs(x) >= 20 && Math.abs(x) < 46)) return 0xc49b37;
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
  western: [{ side: "right", center: -16, width: 25, y: 17, height: 11, sky: 0x4f618e, ground: 0x333a56 }],
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
    const night = chapter.id === "western", ridge = Math.round(2 + 1.4 * Math.sin(x / 2.7) + 1.3 * Math.cos(x / 1.8));
    const skyline = 2 + Math.floor(hash3(Math.floor(x / 3), 4, 11) * 5);
    const c = frame ? chapter.trim : night && y <= skyline ? (y % 2 === 0 && x % 3 === 1 ? 0xc49e62 : ground)
      : night && hash3(x, y, 22) > 0.97 ? 0xb6b4d7 : !night && y < ridge + 2 ? shade(ground, 0.85 + y * 0.05) : shade(sky, 1.08 - y * 0.025);
    paint(x, y, 0, c);
    if (frame) paint(x, y, 1, shade(c, 1.12));
  }
  for (let x = -1; x <= width; x++) for (let depth = 0; depth < 3; depth++) {
    paint(x, -1, depth, shade(chapter.trim, depth === 2 ? 1.22 : 1.14));
    paint(x, height, depth, shade(chapter.trim, depth === 2 ? 0.81 : 0.93));
  }
  if (chapter.floor === "wood" || chapter.floor === "carpet" || chapter.id === "western") {
    for (let x = 0; x < width; x++) {
      paint(x, height - 2, 2, shade(chapter.trim, 1.08));
      paint(x, height - 4, 2, shade(chapter.trim, 0.94));
    }
    for (let y = height - 8; y < height - 2; y++) paint(width - 2, y, 2, shade(chapter.trim, 1.26));
  }
}

function addInteriorTrim(g: Grid, room: Box, chapter: Chapter) {
  const dark = chapter.id === "western";
  for (const side of ["left", "right", "front", "back"] as const) {
    const acrossX = side === "front" || side === "back";
    const start = acrossX ? room.minX : room.minZ, end = acrossX ? room.maxX : room.maxZ;
    const paint = (at: number, y: number, depth: number, color: Color) => {
      if (acrossX) g.set(at, y, side === "front" ? room.minZ + depth : room.maxZ - 1 - depth, color);
      else g.set(side === "left" ? room.minX + depth : room.maxX - 1 - depth, y, at, color);
    };
    for (let at = start; at < end; at++) {
      const bay = (at - start) % 11;
      paint(at, 2, 0, shade(chapter.trim, 1.18));
      paint(at, 2, 1, shade(chapter.trim, 1.08));
      paint(at, 10, 0, shade(chapter.trim, 0.8));
      paint(at, 11, 0, shade(chapter.trim, 1.1));
      for (let y = 3; y < 10; y++) if (bay < 2 || y === 3 || y === 9) paint(at, y, 0, shade(chapter.trim, bay === 0 ? 0.91 : 0.71));
      for (let y = 4; y < 9; y++) if (bay === 1) paint(at, y, 1, shade(chapter.trim, 0.89));
      paint(at, WALL_HEIGHT - 2, 0, shade(chapter.trim, 0.85));
      paint(at, WALL_HEIGHT - 2, 1, shade(chapter.trim, 0.93));
      paint(at, WALL_HEIGHT - 1, 1, shade(chapter.trim, 0.72));
      if (acrossX && Math.abs(at - start - (end - start) * 0.8) < 6) {
        for (let y = 28; y < 33; y++) paint(at, y, 1, y % 2 ? shade(chapter.trim, 0.65) : shade(chapter.trim, 0.91));
      }
      if (chapter.floor === "gym" || chapter.floor === "tile") {
        const fixture = (at - start + 8) % 24;
        if (fixture < 9) {
          paint(at, 33, 0, shade(chapter.trim, 0.68));
          paint(at, 34, 1, fixture === 0 || fixture === 8 ? 0x414752 : 0xe5ddbd);
        }
      }
      if (dark && side === "right" && at > -34 && at < 11) paint(at, 3, 0, 0x574282);
    }
  }
}

function addDoorway(g: Grid, chapter: Chapter, wallZ: number, side: "front" | "back") {
  const front = side === "front", sign = front ? -1 : 1;
  const outside = wallZ + (front ? -1 : WALL), inside = wallZ + (front ? WALL : -1);
  const backdrop = outside + sign * 8;
  const left = -DOOR_HALF, width = DOOR_HALF * 2;
  const trim = chapter.trim, floor = front ? 0x89734f : 0x3b3942;
  g.box(left, 0, wallZ - 1, width, DOOR_HEIGHT, WALL + 3, -1);
  for (let i = 0; i <= 8; i++) {
    const z = outside + i * sign, arch = i % 3 === 0, rail = shade(trim, arch ? 0.94 : 0.71);
    for (const x of [left - 1, DOOR_HALF]) g.box(x, 0, z, 1, DOOR_HEIGHT + 1, 1, rail);
    g.box(left, DOOR_HEIGHT, z, width, 1, 1, rail);
    for (let x = left; x < DOOR_HALF; x++) g.set(x, -1, z, shade(floor, (arch ? 1.26 : 1) + hash3(x, z, 7) * 0.12));
    if (arch) g.box(left + 2, DOOR_HEIGHT - 1, z, width - 4, 1, 1, front ? 0xc9aa6b : 0x77708f);
  }
  g.box(left, 0, backdrop, width, DOOR_HEIGHT, 1, (_x, y, z) => {
    const color = front ? (y > DOOR_HEIGHT / 2 ? 0xedd1a0 : 0xa48e68) : (y > DOOR_HEIGHT / 2 ? 0x827e99 : 0x4c4b60);
    return shade(color, 0.95 + 0.1 * hash3(_x, y, z));
  });
  for (const x of [left - 1, DOOR_HALF]) {
    g.box(x, 0, Math.min(outside, inside), 1, DOOR_HEIGHT + 1, Math.abs(outside - inside) + 1, trim);
    g.box(x, 1, inside, 1, DOOR_HEIGHT - 1, 1, shade(trim, 1.18));
  }
  g.box(left, DOOR_HEIGHT, Math.min(outside, inside), width, 1, Math.abs(outside - inside) + 1, shade(trim, 1.11));
  g.box(left, -1, wallZ, width, 1, WALL, shade(floor, 1.22));
}

export function buildRoomShell(index: number): Grid {
  const chapter = CHAPTERS[index], g = new Grid();
  const W = chapter.width, D = chapter.depth, x0 = -W / 2, z0 = -D / 2;
  const extra = chapter.outdoor ? 60 : 0, zEnd = chapter.outdoor ? D / 2 + ENTRANCE + 40 : D / 2;
  const furniture = obstacles(index);
  for (let x = x0 - extra; x < W / 2 + extra; x++) for (let z = z0; z < zEnd; z++) {
    const color = floorColor(chapter, x, z);
    const inShadow = furniture.some(box => x > box.minX - 1 && x < box.maxX + 2 && z > box.minZ - 1 && z < box.maxZ + 2);
    g.set(x, -1, z, inShadow ? shade(color, chapter.outdoor ? 0.8 : 0.87) : color);
  }
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
    g.box(x0, WALL_HEIGHT + 1, z0 - 2, W, 2, 6, 0x687983);
    g.box(x0, WALL_HEIGHT, z0 + 3, W, 1, 1, x => (x - x0) % 12 < 9 ? 0xece4cc : 0x687983);
    for (let x = x0 + 8; x < W / 2; x += 14) {
      if (Math.abs(x) < DOOR_HALF + 3) continue;
      g.box(x, 0, z0 + 1, 2, WALL_HEIGHT + 1, 2, 0x7a91a3);
      g.box(x - 1, 0, z0 + 1, 4, 2, 3, 0x636f7a);
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
    addInteriorTrim(g, interior(chapter), chapter);
    for (const spec of WINDOWS[chapter.id] ?? []) addWindow(g, interior(chapter), chapter, spec);
    addDoorway(g, chapter, nearZ, "back");
  }
  addDoorway(g, chapter, z0, "front");
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
