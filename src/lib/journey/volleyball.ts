import type { Box, Vec } from "./world";

export type BallKind = "mikasa" | "molten";
export type BallAction = "Set" | "Toss" | "Hit";
export type Point = Vec & { y: number };
export type Ball = Point & {
  radius: number; vx: number; vy: number; vz: number;
  grounded: boolean; tossed: boolean; kickDelay: number;
};
export type BallBlock = Box & { bottom: number; top: number };
export type CourtNet = BallBlock & { z: number };
export type BallField = Box & { ceiling: number; blocks: BallBlock[]; net?: CourtNet };

const GRAVITY = 86;
export const HIT_WINDUP = 0.11;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function makeBall(x: number, base: number, z: number, radius: number): Ball {
  return { x, y: base + radius, z, radius, vx: 0, vy: 0, vz: 0, grounded: true, tossed: false, kickDelay: 0 };
}

function overlaps(box: Box, x: number, z: number, r: number) {
  return Math.hypot(x - clamp(x, box.minX, box.maxX), z - clamp(z, box.minZ, box.maxZ)) < r;
}

function ballSpace(field: BallField, r: number, x: number, y: number, z: number) {
  return x >= field.minX + r && x <= field.maxX - r && z >= field.minZ + r && z <= field.maxZ - r &&
    !field.blocks.some(block => y - r < block.top - 0.001 && y + r > block.bottom && overlaps(block, x, z, r));
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
  if (Math.hypot(dx, dz) > (ball.tossed ? 9 : 8.5)) return null;
  if (net && (player.z - net.z) * (ball.z - net.z) < 0) {
    const crossing = player.x + dx * (net.z - player.z) / dz;
    if (crossing >= net.minX && crossing <= net.maxX) return null;
  }
  if (ball.tossed && kind === "mikasa") {
    const contact = { ...ball };
    stepBall(contact, field, HIT_WINDUP);
    return contact.tossed && contact.y >= height * 0.65 && contact.y <= height + 9 &&
      Math.hypot(contact.x - player.x, contact.z - player.z) <= 9 ? "Hit" : null;
  }
  return ball.grounded && ball.y <= height ? kind === "molten" ? "Set" : "Toss" : null;
}

export function launchBall(ball: Ball, velocity: Point, tossed = false) {
  ball.vx = velocity.x; ball.vy = velocity.y; ball.vz = velocity.z;
  ball.grounded = false; ball.tossed = tossed;
  ball.kickDelay = 0.35;
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
  const direct = { x: forward.x * 34, y: -4, z: forward.z * 34 };
  if (!net) return direct;
  const distance = Math.abs(net.z - ball.z);
  const crossingX = clamp(ball.x, net.minX + r + 1, net.maxX - r - 1);
  if (distance < 2 || distance > 34 || Math.abs(ball.x - crossingX) > 16) return direct;
  const side = Math.sign(net.z - ball.z);
  const landingZ = clamp(net.z + side * Math.max(11, distance * 0.83), field.minZ + r + 2, field.maxZ - r - 2);
  const fraction = distance / Math.abs(landingZ - ball.z);
  // Clear the tape as the front of the sphere enters the net, not just at the center plane.
  const span = (net.maxZ - net.minZ) / 2 + r;
  const entry = clamp(fraction - span / Math.abs(landingZ - ball.z), 0.04, 0.95);
  const exit = clamp(fraction + span / Math.abs(landingZ - ball.z), 0.05, 0.96);
  const clear = (t: number) => (net.top + r + 0.8 - ball.y * (1 - t) - r * t) / (GRAVITY / 2 * t * (1 - t));
  const duration = Math.sqrt(Math.max(0.6 ** 2, clear(entry), clear(exit)));
  const vx = (crossingX - ball.x) / (fraction * duration);
  const vy = (r - ball.y) / duration + GRAVITY * duration / 2;
  const vz = (landingZ - ball.z) / duration;
  return { x: vx, y: vy, z: vz };
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
      ball.tossed = false;
      if (ball.vy < -5) {
        ball.vy *= -0.52; ball.vx *= 0.84; ball.vz *= 0.84;
        ball.grounded = false;
      } else { ball.vy = 0; ball.grounded = true; }
    } else if (nextY >= ceiling) {
      ball.y = ceiling; ball.vy = -Math.abs(ball.vy) * 0.48; ball.grounded = false;
    } else { ball.y = nextY; ball.grounded = false; }
    const x = ball.x + ball.vx * h, z = ball.z + ball.vz * h;
    if (ball.vx) { if (free(x, ball.z)) ball.x = x; else ball.vx *= -0.54; }
    if (ball.vz) { if (free(ball.x, z)) ball.z = z; else ball.vz *= -0.54; }
    const drag = Math.exp(-(ball.grounded ? 2.7 : 0.2) * h);
    ball.vx *= drag; ball.vz *= drag;
    if (ball.grounded && Math.hypot(ball.vx, ball.vz) < 0.12) ball.vx = ball.vz = 0;
  }
}
