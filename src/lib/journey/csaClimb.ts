import { Grid, hash3, shade } from "./voxel";

export const CLIMBER_NAMES = ["Nuo Zhang", "William Wang"] as const;
const WALL_X = 92, WALL_TOP = 38, WALL_Z = -26, WIDTH = 54;
export const MAT_VOXEL_HEIGHT = 0.24;
const MAT_TOP = 3 * MAT_VOXEL_HEIGHT;
const BEAT = 0.72, ROUNDS = 5;
const MOUNT_ORDER = [0, 2, 1, 3], CLIMB_ORDER = [0, 3, 1, 2];
const ASCENT_BEATS = ROUNDS * CLIMB_ORDER.length;
const MOUNT_TIME = BEAT * MOUNT_ORDER.length;
export const BOULDER_TOP_TIME = MOUNT_TIME + ASCENT_BEATS * BEAT;
export const BOULDER_CYCLE = BOULDER_TOP_TIME * 2 + 1.5;
const smooth = (t: number) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2;

type Point = { x: number; y: number; z: number };
type Course = { color: number; holds: Point[][] };

function makeCourse(center: number, color: number, width: number, step: number, phase: number): Course {
  const holds = [1, -1].map(side => Array.from({ length: ROUNDS + 3 }, (_, rung) => ({
    x: WALL_X - 1.25,
    y: (side > 0 ? 2.1 : 3.6) + rung * step,
    z: center + side * width + 0.55 * Math.sin(phase + rung * 1.35 + side),
  })));
  return { color, holds };
}

export const BOULDER_LANES = [
  { center: -12, delay: 0, courses: [makeCourse(-12, 0xff816d, 3.2, 4.2, 0), makeCourse(-12, 0x75d9ff, 6.2, 4.4, 1)] },
  { center: 14, delay: 2.1, courses: [makeCourse(14, 0xe8b5ff, 3.2, 4.4, 2), makeCourse(14, 0xb5eb74, 6.2, 4.2, 3)] },
];
type Lane = typeof BOULDER_LANES[number];

function anchor(course: Course, slot: number, rung: number) {
  return course.holds[slot < 2 ? 0 : 1][rung + (slot % 2 ? 0 : 2)];
}

function interpolate(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, z: from.z + (to.z - from.z) * t };
}

function moveGrip(from: Point, to: Point, t: number) {
  const point = interpolate(from, to, t);
  point.x -= 1.35 * Math.sin(Math.PI * t);
  return point;
}

export const boulderStart = (lane: Lane): Point => ({ x: WALL_X - 4.5, y: MAT_TOP + 5.9, z: lane.center });

function wallPose(lane: Lane, course: Course, beats: number) {
  const tick = Math.min(ASCENT_BEATS - 1, Math.floor(beats));
  const round = Math.floor(tick / CLIMB_ORDER.length), step = tick % CLIMB_ORDER.length;
  const active = CLIMB_ORDER[step], t = smooth(beats - tick);
  const planted = CLIMB_ORDER.map((_, slot) => anchor(course, slot, round + Number(CLIMB_ORDER.indexOf(slot) < step)));
  const next = anchor(course, active, round + 1);
  const level = planted.map((point, slot) => slot === active ? interpolate(point, next, t) : point);
  const y = level.reduce((sum, point, slot) => sum + point.y * (slot % 2 ? 0.26 : 0.24), 0);
  return {
    hips: { x: WALL_X - 3.8, y, z: lane.center },
    grip: planted.map((point, slot) => slot === active ? moveGrip(point, next, t) : point),
  };
}

export function sampleBouldering(lane: Lane, course: Course, clock: number, reduced: boolean) {
  if (reduced) return wallPose(lane, course, 5);
  const time = Math.max(0, Math.min(clock, 2 * BOULDER_TOP_TIME));
  const ascent = Math.min(time, 2 * BOULDER_TOP_TIME - time);
  if (ascent >= MOUNT_TIME) return wallPose(lane, course, (ascent - MOUNT_TIME) / BEAT);

  const mount = ascent / BEAT, hips = boulderStart(lane);
  const start = [1, 1, -1, -1].map((side, slot) => slot % 2
    ? { x: hips.x + 1.15, y: MAT_TOP, z: lane.center + side * 1.45 }
    : { x: hips.x, y: hips.y + 0.15, z: lane.center + side * 3.2 });
  return {
    hips: interpolate(hips, wallPose(lane, course, 0).hips, smooth((mount - 2) / 2)),
    grip: start.map((point, slot) => {
      const target = anchor(course, slot, 0), t = smooth(mount - MOUNT_ORDER.indexOf(slot));
      const grip = moveGrip(point, target, t);
      if (slot % 2) grip.y += 0.65 * Math.sin(Math.PI * t);
      return grip;
    }),
  };
}

export function buildBoulderingWall() {
  const grid = new Grid().box(WALL_X, 0, WALL_Z, 1, WALL_TOP, WIDTH, (x, y, z) => {
    const seam = (z - WALL_Z) % 9 === 0 || y % 9 === 0;
    return shade(seam ? 0x454052 : 0x6b6478, 0.88 + hash3(x, y, z) * 0.18);
  });
  for (const z of [WALL_Z, 1, WALL_Z + WIDTH - 1]) grid.box(WALL_X, 0, z, 1, WALL_TOP, 1, 0x90869f);
  const holds = new Grid();
  for (const { courses } of BOULDER_LANES) for (const { color, holds: rows } of courses) {
    for (const row of rows) for (const [index, point] of row.entries()) {
      const [x, y, z] = [point.x, point.y, point.z].map(value => Math.floor(value * 2));
      const width = index % 2 ? 3 : 4;
      holds.box(x + 1, y - 1, z - 1, 3, 3, 3, shade(color, 0.68))
        .box(x, y, z - 1, 2, 2, width, color)
        .set(x, y + 1, z + 1, shade(color, 1.13));
    }
  }
  const mat = new Grid().box(78, 0, WALL_Z - 1, 14, 2, WIDTH + 2, 0x373044)
    .box(78, 2, WALL_Z - 1, 14, 1, WIDTH + 2, 0x665480)
    .box(78, 2, WALL_Z - 1, 1, 1, WIDTH + 2, 0x967daf);
  for (let z = WALL_Z; z < WALL_Z + WIDTH; z += 9) mat.box(79, 2, z, 13, 1, 1, 0x4c405f);
  return { grid, holds, mat };
}
