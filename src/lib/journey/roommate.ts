import { buildAvatar } from "./avatar";
import { Grid, hash3, shade, textWidth } from "./voxel";
import type { Placement, Roommate } from "./data";
import type { Vec } from "./world";

const FLEECE = 0xf2f1ed, RIBBING = 0xd6d7da, SKIN = 0xebc8ae;
const CAP = 0x212227, CAP_EDGE = 0x323339, CAP_BRIM = 0x17171c;
export const RANGERS_CREST_VOXEL_SIZE = 0.13;
export const ROOMMATE_SEAT = 7;
export const ROOMMATE_RADIUS = 2.65;
const BODY_RADIUS = 3.6;
export const roommateGap = (playerRadius: number) => Math.max(playerRadius, BODY_RADIUS) + BODY_RADIUS;
export const FRIDGE_VOXEL_SIZE = 0.5;
export const FRIDGE_HINGE = { x: 4.5, y: 0, z: 3.5 };
export const FRIDGE_HANDLE = { x: -8.75, y: 11.6, z: 1.25 };
export const FRIDGE_MILK = { x: -3, y: 10.35, z: 2.6 };
export const FRIDGE_SWING = 1.1;
const DOOR_SLAB = [-19, 1, 0, 2] as const;
const DOOR_HANDLE = [-19, -16, 2, 3] as const;
const DOOR_BINS = [-17, -1, -1, 0] as const;

const clamp = (t: number) => Math.max(0, Math.min(1, t));
export const easeRoommate = (t: number) => { const u = clamp(t); return u * u * (3 - 2 * u); };

function addBackwardCap(head: Grid) {
  const top = head.bounds().maxY + 1;
  const panels = (x: number, y: number, z: number) =>
    x === -1 || z === -1 ? CAP_EDGE : shade(CAP, 0.93 + 0.13 * hash3(x, y, z));
  head.box(-8, top - 2, -8, 16, 3, 16, panels)
    .box(-7, top + 1, -7, 14, 1, 14, panels)
    .box(-6, top + 2, -6, 12, 1, 12, panels)
    .box(-1, top + 3, -1, 2, 1, 2, CAP_EDGE)
    .box(-7, top - 3, -14, 14, 1, 6, CAP_BRIM)
    .box(-5, top - 3, -16, 10, 1, 2, CAP_BRIM)
    .box(-5, top - 2, -15, 10, 1, 1, CAP_EDGE)
    .box(-4, top - 2, 8, 8, 1, 1, CAP_EDGE)
    .box(2, top - 2, 9, 2, 1, 1, CAP_BRIM);
}

function buildRangersCrest() {
  const crest = new Grid(), word = "RANGERS", arch = [0, 2, 3, 4, 3, 2, 0];
  let x = -Math.floor(textWidth(word) / 2);
  [...word].forEach((letter, i) => { x += crest.text(letter, x, 13 + arch[i], 0, 0x203957) + 1; });
  const maple = [
    "......#......",
    ".....###.....",
    "..#..###..#..",
    "..##.###.##..",
    "#.#########.#",
    "#############",
    ".###########.",
    "..#########..",
    "...#######...",
    "......#......",
    "......#......",
  ];
  maple.forEach((row, y) => [...row].forEach((cell, i) => {
    if (cell === "#") crest.set(i - 6, maple.length - 1 - y, 0, 0xc52636);
  }));
  return crest;
}

export function buildRoommate() {
  const avatar = buildAvatar(18, "western", { top: FLEECE, topDark: RIBBING, skin: SKIN, skinDark: 0xd7ad92 });
  addBackwardCap(avatar.head);
  const crest = buildRangersCrest();
  const leg = (x: number) => {
    const bottom = -avatar.hip * 2;
    const base = new Grid()
      .box(x, -13, -2, 5, 13, 4, (i, y, z) => shade(0x384351, 0.95 + 0.12 * hash3(i, y, z)))
      .box(x + 1, bottom + 3, -1, 3, -bottom - 16, 3, SKIN)
      .box(x + 1, bottom + 2, -1, 3, 2, 3, 0xe6e9ec)
      .box(x, bottom, -3, 5, 2, 9, 0x225590)
      .box(x, bottom + 2, 0, 5, 2, 5, 0x418fdd)
      .box(x + 1, bottom + 2, 5, 3, 2, 1, 0x418fdd)
      .box(x, bottom + 2, -3, 5, 1, 3, 0x4b9be3)
      .set(x, bottom + 3, -1, 0x2264a4).set(x + 4, bottom + 3, -1, 0x2264a4);
    for (const [dx, z] of [[1, 2], [3, 2], [2, 4]]) base.set(x + dx, bottom + 3, z, 0x215a93);
    return base;
  };
  return { ...avatar, crest, legL: leg(-6), legR: leg(1) };
}

export function buildRoommatePreview(g: Grid) {
  const { head, torso, shoulder, hip } = buildRoommate();
  torso.forEach((x, y, z, color) => g.set(x, y, z, color));
  head.forEach((x, y, z, color) => g.set(x, y + (shoulder - hip + 2) * 2, z, color));
}

export function buildMilkCarton() {
  const g = new Grid();
  g.box(-2, -1, -2, 4, 5, 4, 0xfaf5eb)
    .box(-2, 0, 1, 4, 2, 1, 0x327ed0).box(1, 0, -2, 1, 2, 4, 0x4289db)
    .box(-1, 4, -2, 2, 1, 4, 0xb8d7f3).box(-1, 5, -2, 2, 1, 2, 0xf9fcff);
  for (const [x, y] of [[-2, 0], [-2, 1], [-1, 1], [0, 0], [1, 0], [1, 1]]) g.set(x, y, 1, 0xf7f8fa);
  return g;
}

export function buildFridgeCabinet(g: Grid) {
  const shell = 0x2a2c30, liner = 0xc8dbe9;
  g.box(-10, 0, -10, 20, 26, 17, shell)
    .box(-8, 2, -8, 16, 22, 15, -1)
    .box(-8, 2, -8, 16, 22, 1, liner)
    .box(-9, 2, -7, 1, 22, 14, 0x9daebc).box(8, 2, -7, 1, 22, 14, 0x9daebc)
    .box(-8, 10, -7, 16, 1, 13, liner).box(-8, 19, -7, 16, 1, 14, 0xe2eff6)
    .box(-1, 22, 0, 3, 1, 5, 0xfff1c9)
    .box(2, 11, -2, 3, 6, 3, 0x22799a).box(2, 17, -1, 3, 1, 1, 0xd5f4ec)
    .box(-6, 2, -5, 6, 4, 6, 0x6d9ccc);
}

export function buildFridgeDoor(g: Grid) {
  const layer = ([x, x1, z, z1]: readonly [number, number, number, number], y: number, h: number, color: number) =>
    g.box(x, y, z, x1 - x, h, z1 - z, color);
  layer(DOOR_SLAB, 0, 26, 0x34373c).box(-19, 17, 1, 20, 1, 1, 0x1e2024);
  layer(DOOR_HANDLE, 20, 5, 0xaebbc7);
  layer(DOOR_BINS, 6, 3, 0xb7cbd8);
  layer(DOOR_BINS, 12, 2, 0xb7cbd8);
}

export function buildHockeyStick() {
  const g = new Grid();
  g.box(-1, -35, -1, 2, 36, 2, 0x343b51)
    .box(-1, -5, -1, 2, 6, 2, 0xe5ebf1)
    .box(-1, -28, 0, 2, 8, 1, 0x538cc9)
    .box(-1, -36, -1, 11, 3, 2, 0x242936)
    .box(7, -35, 1, 4, 2, 1, 0x626d84);
  return g;
}

type Activity = "seat" | "rise" | "walk" | "open" | "take" | "close" | "sip" | "reopen" | "replace" | "shut" | "grab" | "practice" | "rack" | "sit";
type Beat = { action: Activity; start: number; end: number; from: Vec; to: Vec; yaw: number };

export function placementPoint(p: Vec & Pick<Placement, "rot">, x: number, z: number): Vec {
  const rot = p.rot ?? 0;
  return { x: p.x + [x, z, -x, -z][rot], z: p.z + [z, -x, -z, x][rot] };
}

export function fridgeDoorDistance(fridge: Placement, open: number, p: Vec) {
  const theta = (fridge.rot ?? 0) * Math.PI / 2 + open * FRIDGE_SWING;
  const hinge = placementPoint(fridge, FRIDGE_HINGE.x, FRIDGE_HINGE.z);
  const dx = p.x - hinge.x, dz = p.z - hinge.z, c = Math.cos(theta), s = Math.sin(theta);
  const x = (dx * c - dz * s) / FRIDGE_VOXEL_SIZE, z = (dx * s + dz * c) / FRIDGE_VOXEL_SIZE;
  return FRIDGE_VOXEL_SIZE * Math.min(...[DOOR_SLAB, DOOR_HANDLE, DOOR_BINS].map(([x0, x1, z0, z1]) =>
    Math.hypot(Math.max(x0 - x, x - x1, 0), Math.max(z0 - z, z - z1, 0))));
}

export function buildRoommateRoutine(spec: Roommate, fridge: Placement, pad: Placement) {
  const out = placementPoint({ ...spec, rot: spec.seatFacing }, 0, 5), seatYaw = spec.seatFacing * Math.PI / 2;
  const fridgeSpot = placementPoint(fridge, -2, 8.1), fridgeYaw = ((fridge.rot ?? 0) + 2) * Math.PI / 2;
  const padSpot = placementPoint(pad, 0, -4), padYaw = (pad.rot ?? 0) * Math.PI / 2;
  const [bedside, aisle, padAisle, padEntry] = spec.via;
  const beats: Beat[] = [];
  let from: Vec = spec, yaw = seatYaw, total = 0;
  const add = (action: Activity, duration: number, to = from, angle = yaw) => {
    beats.push({ action, start: total, end: total + duration, from, to, yaw: angle });
    total += duration; from = to; yaw = angle;
  };
  const walk = (...points: Vec[]) => {
    for (const to of points) {
      const distance = Math.hypot(to.x - from.x, to.z - from.z);
      if (distance) add("walk", distance / 16, to, Math.atan2(to.x - from.x, to.z - from.z));
    }
  };
  add("seat", 3.2);
  add("rise", 0.65, out);
  walk(bedside, aisle, ...spec.fridgeVia, fridgeSpot);
  add("open", 1.15, from, fridgeYaw);
  add("take", 0.85);
  add("close", 0.95);
  add("sip", 2.2);
  add("reopen", 0.85);
  add("replace", 0.85);
  add("shut", 0.95);
  walk(...[...spec.fridgeVia].reverse(), aisle, padAisle, padEntry, padSpot);
  add("grab", 0.85, from, padYaw);
  add("practice", 5.4);
  add("rack", 0.8);
  walk(padEntry, padAisle, aisle, bedside, out);
  add("sit", 0.65, spec, seatYaw);
  return { beats, total, fridge };
}

export type RoommateRoutine = ReturnType<typeof buildRoommateRoutine>;
export type RoommatePose = ReturnType<typeof sampleRoommate>;

export function roommateCenter(pose: Pick<RoommatePose, "x" | "z" | "yaw" | "sit">, yaw = pose.yaw) {
  const offset = pose.sit * 2.4;
  return { x: pose.x + offset * Math.sin(yaw), z: pose.z + offset * Math.cos(yaw) };
}

export function overlapsOnMove(from: Vec, to: Vec, center: Vec, limit: number) {
  const x = from.x - center.x, z = from.z - center.z, dx = to.x - from.x, dz = to.z - from.z;
  const travelSquared = dx * dx + dz * dz, dot = x * dx + z * dz;
  if (!travelSquared || dot >= 0) return false;
  const t = Math.min(1, -dot / travelSquared);
  return Math.hypot(x + dx * t, z + dz * t) < limit;
}

type RoommatePush = { origin: RoommatePose; target: Vec; progress: number; hold: number; returning: boolean };
type OpenGround = (point: Vec) => boolean;
const SHOVE_TIME = 0.38, RETURN_TIME = 0.42;
export const PUSH_GESTURE_TIME = 0.4;
const between = (from: Vec, to: Vec, u: number) => ({ x: from.x + (to.x - from.x) * u, z: from.z + (to.z - from.z) * u });

function pushPathClear(from: Vec, to: Vec, player: Vec, radius: number, open: OpenGround) {
  if (overlapsOnMove(from, to, player, roommateGap(radius))) return false;
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.3));
  for (let i = 1; i <= steps; i++) if (!open(between(from, to, i / steps))) return false;
  return true;
}

export function planRoommatePush(pose: RoommatePose, player: Vec, radius: number, open: OpenGround): RoommatePush | null {
  if (pose.action !== "walk") return null;
  const dx = pose.x - player.x, dz = pose.z - player.z, gap = Math.hypot(dx, dz);
  if (gap < 0.01 || gap > roommateGap(radius) + 1.15) return null;
  for (const distance of [4.25, 3.2, 2.2]) for (const offset of [0.9, -0.9, 0, 1.3, -1.3]) {
    const angle = Math.atan2(dz, dx) + offset;
    const target = { x: pose.x + distance * Math.cos(angle), z: pose.z + distance * Math.sin(angle) };
    if (pushPathClear(pose, target, player, radius, open)) return { origin: pose, target, progress: 0, hold: 0, returning: false };
  }
  return null;
}

export function stepRoommatePush(push: RoommatePush, dt: number, reduced: boolean, player: Vec, radius: number, open: OpenGround) {
  const { origin, target, progress, hold, returning } = push;
  const at = (p: number) => between(origin, target, easeRoommate(p));
  let next = progress, holdFor = hold, backing = returning;
  if (progress < 1 && !returning) next = Math.min(1, progress + (reduced ? 1 : dt / SHOVE_TIME));
  else {
    holdFor += dt;
    if (returning || (holdFor >= 0.8 && pushPathClear(target, origin, player, radius, open))) {
      backing = true;
      next = Math.max(0, progress - (reduced ? 1 : dt / RETURN_TIME));
    }
  }
  if (next !== progress && !pushPathClear(at(progress), at(next), player, radius, open)) {
    if (!returning && progress < 1) {
      return { state: { ...push, target: at(progress), progress: 1 }, pose: { ...origin, ...at(progress), stride: 0 } };
    }
    next = progress;
  }
  const done = backing && next === 0;
  const stride = reduced || next === progress ? 0 : Math.sin(next * 2 * Math.PI) * 0.9 * (backing ? -1 : 1);
  return { state: done ? null : { origin, target, progress: next, hold: holdFor, returning: backing },
    pose: done ? origin : { ...origin, ...at(next), stride } };
}

export function sampleRoommate(routine: RoommateRoutine, time: number) {
  const t = time % routine.total;
  const beat = routine.beats.find(b => t < b.end) ?? routine.beats[0];
  const { action, from, to, yaw } = beat, elapsed = t - beat.start;
  const u = clamp(elapsed / (beat.end - beat.start)), eased = easeRoommate(u);
  const travel = action === "walk" ? u : eased;
  const sit = action === "seat" ? 1 : action === "rise" ? 1 - eased : action === "sit" ? eased : 0;
  const door = action === "take" || action === "replace" ? 1 :
    action === "open" || action === "reopen" ? easeRoommate((u - 0.3) / 0.7) :
    action === "close" || action === "shut" ? 1 - easeRoommate((u - 0.22) / 0.58) : 0;
  const heldMilk = action === "close" || action === "sip" || action === "reopen" ||
    (action === "take" && u >= 0.45) || (action === "replace" && u < 0.55);
  const stride = action === "walk" ? Math.sin(t * 9.5) * Math.min(1, u * 14, (1 - u) * 14) : 0;
  return { action, u, elapsed, x: from.x + (to.x - from.x) * travel, z: from.z + (to.z - from.z) * travel, yaw, sit, door, heldMilk, stride };
}

export function advanceRoommate(routine: RoommateRoutine, time: number, dt: number, player: Vec, radius: number) {
  const current = sampleRoommate(routine, time), next = sampleRoommate(routine, time + dt);
  if (overlapsOnMove(roommateCenter(current), roommateCenter(next), player, roommateGap(radius))) return time;
  if (next.door !== current.door) {
    const steps = Math.ceil(Math.abs(next.door - current.door) / 0.035);
    let distance = fridgeDoorDistance(routine.fridge, current.door, player);
    for (let i = 1; i <= steps; i++) {
      const tested = fridgeDoorDistance(routine.fridge, current.door + (next.door - current.door) * i / steps, player);
      if (tested < radius && tested < distance) return time;
      distance = tested;
    }
  }
  return (time + dt) % routine.total;
}
