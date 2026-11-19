import type { Box, Vec } from "./world";

export type BallKind = "mikasa" | "molten";
export type BallAction = "Set" | "Spike";
export type Point = Vec & { y: number };
export type Ball = Point & {
  radius: number; vx: number; vy: number; vz: number;
  grounded: boolean; kickDelay: number;
};
export type BallBlock = Box & { bottom: number; top: number };
export type CourtNet = BallBlock & { z: number; postTop: number };
export type BallField = Box & { ceiling: number; blocks: BallBlock[]; net?: CourtNet };

const GRAVITY = 86;
const AIR_DRAG = 0.2;
export const SPIKE = { feed: 0.29, takeoff: 0.56, contact: 0.88, land: 1.20, end: 1.43, rise: 6.7 };
export const SET = { first: 0.42, interval: 0.72, touches: 3, recovery: 0.25 };
export const SET_CONTACTS = Array.from({ length: SET.touches }, (_, i) => SET.first + SET.interval * i);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const travelTime = (t: number, drag: number) => -Math.expm1(-t * drag) / drag;
const fallTime = (vy: number, drop: number) => (vy + Math.sqrt(vy * vy + 2 * GRAVITY * drop)) / GRAVITY;
const eased = (t: number) => t * t * (3 - 2 * t);

export function makeBall(x: number, base: number, z: number, radius: number): Ball {
  return { x, y: base + radius, z, radius, vx: 0, vy: 0, vz: 0, grounded: true, kickDelay: 0 };
}

function overlaps(box: Box, x: number, z: number, r: number) {
  return Math.hypot(x - clamp(x, box.minX, box.maxX), z - clamp(z, box.minZ, box.maxZ)) < r;
}

function ballSpace(field: BallField, r: number, x: number, y: number, z: number) {
  return x >= field.minX + r && x <= field.maxX - r && z >= field.minZ + r && z <= field.maxZ - r &&
    !field.blocks.some(block => y - r < block.top - 0.001 && y + r > block.bottom && overlaps(block, x, z, r));
}

export function pushBallFromMovingBlock(ball: Ball, field: BallField, block: BallBlock) {
  const { x, y, z, radius } = ball;
  if (y - radius >= block.top - 0.001 || y + radius <= block.bottom || !overlaps(block, x, z, radius)) return;
  const gap = radius + 0.01;
  const exits = [
    { x: block.minX - gap, z }, { x: block.maxX + gap, z },
    { x, z: block.minZ - gap }, { x, z: block.maxZ + gap },
  ];
  const distance = (p: Vec) => Math.abs(p.x - x) + Math.abs(p.z - z);
  const exit = exits.reduce((nearest, p) => distance(p) < distance(nearest) ? p : nearest);
  // Leave a pinned ball in place rather than snapping it through the actor.
  if (distance(exit) > gap || !ballSpace(field, radius, exit.x, y, exit.z)) return;
  ball.x = exit.x; ball.z = exit.z;
  if (exit.x !== x) ball.vx = Math.sign(exit.x - x) * Math.max(6, Math.abs(ball.vx));
  if (exit.z !== z) ball.vz = Math.sign(exit.z - z) * Math.max(6, Math.abs(ball.vz));
}

/** Move a held ball toward the hands without sliding it through props. */
export function liftBall(ball: Ball, target: Point, field: BallField) {
  const dx = target.x - ball.x, dy = target.y - ball.y, dz = target.z - ball.z, r = ball.radius;
  const substeps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.25));
  for (let i = 0; i < substeps; i++) {
    const y = clamp(ball.y + dy / substeps, r, field.ceiling - r);
    if (ballSpace(field, r, ball.x, y, ball.z)) ball.y = y;
    const x = ball.x + dx / substeps, z = ball.z + dz / substeps;
    if (ballSpace(field, r, x, ball.y, ball.z)) ball.x = x;
    if (ballSpace(field, r, ball.x, ball.y, z)) ball.z = z;
  }
  ball.grounded = false;
}

export function volleyAction(kind: BallKind, ball: Ball, player: Vec, height: number, field: BallField): BallAction | null {
  const { net } = field;
  const dx = ball.x - player.x, dz = ball.z - player.z;
  if (!ball.grounded || ball.y > height || Math.hypot(dx, dz) > 8.5) return null;
  if (net && (player.z - net.z) * (ball.z - net.z) < 0) {
    const crossing = player.x + dx * (net.z - player.z) / dz;
    if (crossing >= net.minX && crossing <= net.maxX) return null;
  }
  return kind === "molten" ? "Set" : "Spike";
}

export function launchBall(ball: Ball, velocity: Point) {
  ball.vx = velocity.x; ball.vy = velocity.y; ball.vz = velocity.z;
  ball.grounded = false;
  ball.kickDelay = 0.35;
}

export type VolleySequence = { action: BallAction; forward: Vec; start: Point; release: Point; strikeY: number; elapsed: number; contacts: number };

export function startVolley(action: BallAction, ball: Ball, player: Vec, forward: Vec, shoulder: number, field: BallField): VolleySequence {
  const r = ball.radius, isSet = action === "Set";
  const reach = isSet ? 2.9 : 3.7;
  const right = isSet ? 0 : 1.4;
  const x = clamp(player.x + forward.x * reach + forward.z * right, field.minX + r, field.maxX - r);
  let z = clamp(player.z + forward.z * reach - forward.x * right, field.minZ + r, field.maxZ - r);
  const net = field.net;
  if (net && x > net.minX - r && x < net.maxX + r) {
    const side = Math.sign(player.z - net.z);
    if ((z - net.z) * side < r + 2 && side) z = net.z + side * (r + 2);
  }
  return { action, forward, start: { x: ball.x, y: ball.y, z: ball.z },
    release: { x, y: isSet ? Math.min(shoulder + 7.8, field.ceiling - r - 5.8) : shoulder - 1, z },
    strikeY: Math.min(shoulder + 7.1 + SPIKE.rise, field.ceiling - r - 2), elapsed: 0, contacts: 0 };
}

export function advanceVolley(sequence: VolleySequence, ball: Ball, field: BallField, dt: number) {
  const set = sequence.action === "Set", cues = set ? SET_CONTACTS : SPIKE_CONTACTS;
  const end = sequence.elapsed + dt;
  while (sequence.elapsed < end) {
    const cue = cues[sequence.contacts] ?? Infinity;
    const next = Math.min(end, cue);
    // Only the pickup is guided. Once airborne, the ball uses the room's normal physics.
    if (!sequence.contacts) {
      const t = eased(next / cue), { start, release } = sequence;
      liftBall(ball, { x: start.x + (release.x - start.x) * t, y: start.y + (release.y - start.y) * t, z: start.z + (release.z - start.z) * t }, field);
    } else stepBall(ball, field, next - sequence.elapsed);
    sequence.elapsed = next;
    if (next !== cue) break;

    sequence.contacts++;
    const { forward } = sequence;
    if (set) {
      const drift = sequence.contacts === SET.touches ? 4 : 0;
      launchBall(ball, { x: forward.x * drift, y: GRAVITY * SET.interval / 2, z: forward.z * drift });
    } else if (cue === SPIKE.feed) {
      const flight = SPIKE.contact - SPIKE.feed;
      launchBall(ball, { x: 0, y: (sequence.strikeY - ball.y) / flight + GRAVITY * flight / 2, z: 0 });
    } else launchBall(ball, spikeVelocity(ball, field, forward));
  }
  return end >= (set ? SET_CONTACTS[SET.touches - 1] + SET.recovery : SPIKE.end);
}

const SPIKE_CONTACTS = [SPIKE.feed, SPIKE.contact];
type VolleyPose = { lift: number; legs: number; left: number; right: number; leftRoll: number; rightRoll: number; leftElbow: number; rightElbow: number; twist: number; head: number };
type PoseFrame = [time: number, pose: Partial<VolleyPose>];
const idle: VolleyPose = { lift: 0, legs: 0, left: 0, right: 0, leftRoll: 0, rightRoll: 0, leftElbow: 0, rightElbow: 0, twist: 0, head: 0 };
const spikeFrames: PoseFrame[] = [
  [0, idle],
  [SPIKE.feed, { left: -1.4, right: -1.4, leftElbow: -0.45, rightElbow: -0.45, head: -0.21 }],
  [SPIKE.takeoff - 0.09, { left: 0.65, right: 0.65, legs: 0.44, lift: -0.75, head: -0.23 }],
  [SPIKE.takeoff + 0.11, { left: -2.63, right: -1.76, rightElbow: -2.05, legs: 0.43, twist: 0.36, head: -0.27 }],
  [SPIKE.contact - 0.09, { left: -2.62, right: -1.9, rightElbow: -1.95, legs: 0.29, twist: 0.42, head: -0.24 }],
  [SPIKE.contact, { left: -0.84, right: -2.63, rightElbow: -0.14, rightRoll: -0.28, legs: 0.18, twist: -0.08, head: -0.12 }],
  [SPIKE.contact + 0.15, { left: -0.35, right: -0.65, rightRoll: -0.55, rightElbow: -0.22, legs: 0.24, twist: -0.39 }],
  [SPIKE.land + 0.04, { left: -0.47, right: -0.47, legs: 0.52, lift: -0.8 }],
  [SPIKE.end, idle],
];

export function volleyPose(action: BallAction, elapsed: number, reduced = false): VolleyPose {
  if (action === "Spike") {
    const current = spikeFrames.findIndex(([time]) => time > elapsed);
    if (current < 1) return idle;
    const [before, a] = spikeFrames[current - 1], [after, b] = spikeFrames[current];
    const mix = reduced ? Number(elapsed >= (before + after) / 2) : eased((elapsed - before) / (after - before));
    const pose = { ...idle };
    for (const key of Object.keys(pose) as (keyof VolleyPose)[]) {
      pose[key] = (a[key] ?? 0) * (1 - mix) + (b[key] ?? 0) * mix;
    }
    const air = (elapsed - SPIKE.takeoff) / (SPIKE.land - SPIKE.takeoff);
    if (air > 0 && air < 1) pose.lift = SPIKE.rise * (reduced ? 1 : 4 * air * (1 - air));
    else if (reduced) pose.lift = 0;
    return pose;
  }
  const last = SET_CONTACTS[SET.touches - 1];
  const fade = (t: number) => reduced ? Number(t >= 0.5) : eased(clamp(t, 0, 1));
  const raised = fade(elapsed / (SET.first - 0.13)) * (1 - fade((elapsed - last - 0.08) / (SET.recovery - 0.08)));
  const nearest = Math.min(...SET_CONTACTS.map(cue => Math.abs(elapsed - cue - 0.025)));
  const extend = 1 - fade(nearest / 0.16);
  return { ...idle, left: (-1.98 - 0.42 * extend) * raised, right: (-1.98 - 0.42 * extend) * raised,
    leftElbow: (-0.94 + 0.6 * extend) * raised, rightElbow: (-0.94 + 0.6 * extend) * raised,
    leftRoll: 0.29 * raised, rightRoll: -0.29 * raised, legs: 0.3 * (1 - extend) * raised,
    lift: reduced ? 0 : -0.4 * (1 - extend) * raised, head: -0.28 * raised };
}

export function kickBall(ball: Ball, player: Vec, movement: Vec, playerRadius: number, dt: number) {
  if (ball.kickDelay > 0 || !ball.grounded || ball.y > ball.radius + 0.55) return false;
  const dx = ball.x - player.x, dz = ball.z - player.z, distance = Math.hypot(dx, dz);
  const stride = Math.hypot(movement.x, movement.z);
  if (distance > playerRadius + ball.radius + 0.4 || stride < 0.02) return false;
  const nx = distance > 0.001 ? dx / distance : movement.x / stride, nz = distance > 0.001 ? dz / distance : movement.z / stride;
  const speed = (movement.x * nx + movement.z * nz) / Math.max(dt, 0.001);
  if (speed < 3) return false;
  const kick = Math.min(28, 7 + speed * 0.82);
  launchBall(ball, { x: nx * kick, y: 5 + kick * 0.14, z: nz * kick });
  return true;
}

export function spikeVelocity(ball: Ball, field: BallField, forward: Vec): Point {
  const net = field.net, r = ball.radius;
  const direct = { x: forward.x * 35, y: -12, z: forward.z * 35 };
  if (!net) return direct;
  const distance = Math.abs(net.z - ball.z);
  const crossingX = clamp(ball.x, net.minX + r + 1, net.maxX - r - 1);
  const side = Math.sign(net.z - ball.z);
  const edgeShot = ball.x < net.minX + r || ball.x > net.maxX - r;
  const clearance = (edgeShot ? net.postTop : net.top) + r + 0.45;
  const span = (net.maxZ - net.minZ) / 2 + r;
  if (distance <= span || distance > 24 || Math.abs(ball.x - crossingX) > 16 || ball.y <= clearance) return direct;
  const landingZ = clamp(net.z + side * Math.max(9, distance * 0.65), field.minZ + r + 2, field.maxZ - r - 2);
  const farZ = side < 0 ? field.minZ + r + 1 : field.maxZ - r - 1;
  const xSlope = (crossingX - ball.x) / distance;
  if (forward.x * xSlope + forward.z * side < 0.25 * Math.hypot(1, xSlope)) return direct;
  const xRoom = xSlope < 0 ? ball.x - field.minX - r : field.maxX - r - ball.x;
  // Aim down from the jump, using a flatter angle only when the tape would catch it.
  for (const vy of [-16, -10, -5]) {
    const clearTravel = travelTime(fallTime(vy, ball.y - clearance), AIR_DRAG);
    const floorTravel = travelTime(fallTime(vy, ball.y - r), AIR_DRAG);
    const minimum = (distance + span) / clearTravel;
    const maximum = Math.min(62, Math.abs(farZ - ball.z) / floorTravel, xRoom / Math.abs(xSlope) / floorTravel);
    if (minimum > maximum) continue;
    const speed = clamp(Math.abs(landingZ - ball.z) / floorTravel, minimum, maximum);
    return { x: xSlope * speed, y: vy, z: side * speed };
  }
  return direct;
}

export function stepBall(ball: Ball, field: BallField, dt: number) {
  ball.kickDelay = Math.max(0, ball.kickDelay - dt);
  const r = ball.radius, steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const free = (x: number, z: number) => ballSpace(field, r, x, ball.y, z);
    const nextY = ball.y + ball.vy * h - GRAVITY * h * h / 2;
    ball.vy -= GRAVITY * h;
    let floor = r, ceiling = field.ceiling - r;
    for (const block of field.blocks) {
      if (!overlaps(block, ball.x, ball.z, r)) continue;
      if (ball.y - r >= block.top - 0.002) floor = Math.max(floor, block.top + r);
      if (ball.y + r <= block.bottom + 0.002) ceiling = Math.min(ceiling, block.bottom - r);
    }
    if (nextY <= floor) {
      ball.y = floor;
      if (ball.vy < -5) {
        ball.vy *= -0.52; ball.vx *= 0.84; ball.vz *= 0.84;
        ball.grounded = false;
      } else { ball.vy = 0; ball.grounded = true; }
    } else if (nextY >= ceiling) {
      ball.y = ceiling; ball.vy = -Math.abs(ball.vy) * 0.48; ball.grounded = false;
    } else { ball.y = nextY; ball.grounded = false; }
    const drag = ball.grounded ? 2.7 : AIR_DRAG, travel = travelTime(h, drag);
    const x = ball.x + ball.vx * travel, z = ball.z + ball.vz * travel;
    if (ball.vx) { if (free(x, ball.z)) ball.x = x; else ball.vx *= -0.54; }
    if (ball.vz) { if (free(ball.x, z)) ball.z = z; else ball.vz *= -0.54; }
    const decay = Math.exp(-drag * h);
    ball.vx *= decay; ball.vz *= decay;
    if (ball.grounded && Math.hypot(ball.vx, ball.vz) < 0.12) ball.vx = ball.vz = 0;
  }
}
