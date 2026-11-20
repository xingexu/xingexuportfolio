import { Grid, hash3, shade } from "./voxel";

export const NUO_NAME = "Nuo";
const WALL_X = 93, SLOPE_Y = 27, ROOF_Y = 36;
const SLOPE_END = SLOPE_Y + (ROOF_Y - SLOPE_Y) * Math.SQRT2;
const STEP = 4.5, ROUNDS = 10, BEAT = 0.62;
const START = [13, 2, 11, 4] as const;
// Left hand, left foot, right hand, right foot; set the feet before the second hand reaches.
const ORDER = [0, 3, 1, 2];
export const CLIMB_STEPS = ROUNDS * ORDER.length;
export const CLIMB_TIME = BEAT * CLIMB_STEPS;
const GRIP = [0x83e5ca, 0xeba97f, 0xc4abff, 0x94bee4];
const smooth = (t: number) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2;

function surface(s: number) {
  const slope = Math.min(ROOF_Y - SLOPE_Y, Math.max(0, (s - SLOPE_Y) * Math.SQRT1_2));
  return { x: WALL_X - slope - Math.max(0, s - SLOPE_END), y: Math.min(s, SLOPE_Y) + slope,
    z: -2 + Math.sin(s * 0.16) * 2.6 + s * 0.07 };
}

function anchor(slot: number, rung: number) {
  const s = START[slot] + rung * STEP, p = surface(s);
  const tilt = s < SLOPE_Y ? 0 : s < SLOPE_END ? Math.PI / 4 : Math.PI / 2;
  return { x: p.x - 0.8 * Math.cos(tilt), y: p.y - 0.8 * Math.sin(tilt), z: p.z + (slot < 2 ? 1 : -1) * (slot % 2 ? 2.9 : 3.5) };
}

export function sampleNuoClimb(time: number, reduced: boolean) {
  const clock = reduced ? 9.5 * BEAT : ((time % (2 * CLIMB_TIME) + 2 * CLIMB_TIME) % (2 * CLIMB_TIME));
  const progress = Math.min(clock, 2 * CLIMB_TIME - clock) / BEAT;
  const index = Math.min(CLIMB_STEPS - 1, Math.floor(progress));
  const round = Math.floor(index / ORDER.length), beat = index % ORDER.length;
  const reach = smooth(progress - index);
  const rung = (slot: number) => round + Number(ORDER.indexOf(slot) < beat);
  const hips = START.reduce((sum, s, slot) =>
    sum + (s + (rung(slot) + (slot === ORDER[beat] ? reach : 0)) * STEP) * (slot % 2 ? 0.26 : 0.24), 0);
  const center = surface(hips), tilt = Math.PI / 2 * smooth((hips - 24) / 17);
  const grip = START.map((_, slot) => {
    const from = anchor(slot, rung(slot));
    if (slot !== ORDER[beat]) return from;
    const to = anchor(slot, rung(slot) + 1), release = 0.95 * Math.sin(reach * Math.PI);
    return { x: from.x + (to.x - from.x) * reach - release * Math.cos(tilt),
      y: from.y + (to.y - from.y) * reach - release * Math.sin(tilt), z: from.z + (to.z - from.z) * reach };
  });
  return { grip, tilt, hips: { x: center.x - 3.2 * Math.cos(tilt), y: center.y - 3.2 * Math.sin(tilt), z: center.z } };
}

export function buildNuoWall() {
  const grid = new Grid(), baseZ = -14, width = 32;
  const panel = (x: number, y: number, z: number) => shade(0x665875,
    0.87 + hash3(x, y, z) * 0.12 + (Math.floor((z - baseZ) / 8) % 2 ? 0.1 : 0));
  for (let y = 0; y <= ROOF_Y; y++) {
    const face = WALL_X - Math.max(0, y - SLOPE_Y);
    grid.box(face, y, baseZ, 2 + Number(y > SLOPE_Y), 1, width, panel);
    for (const z of [baseZ, baseZ + width - 1]) grid.box(face, y, z, 3, 1, 1, 0x9682a6);
  }
  grid.box(63, ROOF_Y, baseZ, 23, 2, width, panel).box(63, ROOF_Y + 2, baseZ, 23, 1, 1, 0x9682a6)
    .box(63, ROOF_Y + 2, baseZ + width - 1, 23, 1, 1, 0x9682a6).box(63, ROOF_Y, baseZ, 1, 2, width, 0xa491ad);
  for (let z = baseZ + 3; z < baseZ + width; z += 7) {
    for (let y = 3; y < ROOF_Y; y += 6) grid.set(WALL_X - Math.max(0, y - SLOPE_Y) - 1, y, z, 0x4f435e);
  }
  const holds = new Grid();
  for (let slot = 0; slot < START.length; slot++) for (let rung = 0; rung <= ROUNDS; rung++) {
    const { x, y, z } = anchor(slot, rung), [a, b, c] = [x, y, z].map(n => Math.floor(n * 2));
    holds.box(a - 1, b - 1, c - 1, 3, 3, 3, shade(GRIP[slot], 0.72))
      .box(a - 1, b, c - 1, 2, 2, 4, GRIP[slot]).set(a, b, c, 0x594a68);
  }
  const mat = new Grid().box(80, 0, baseZ - 1, 13, 1, width + 2, 0x403651)
    .box(80, 1, baseZ - 1, 13, 1, width + 2, 0x64547b);
  for (let z = baseZ; z < baseZ + width; z += 8) mat.box(81, 1, z, 11, 1, 1, 0x8976a0);
  return { grid, holds, mat };
}
