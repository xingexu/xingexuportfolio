import { Grid, hash3, shade } from "./voxel";

const SKIN = 0xe9bf9d;
const FLEECE = 0xf2f1ed;
const cloth = (x: number, y: number, z: number) => shade(FLEECE, 0.93 + 0.12 * hash3(x, y, z));
export const ROOMMATE_VOXEL_SIZE = 0.5;
export const ROOMMATE_SEAT = 7;
export const SIP_DURATION = 2;

export function buildRoommate() {
  const seated = new Grid(), head = new Grid(), forearm = new Grid(), carton = new Grid();
  seated.box(-5, 0, -4, 10, 15, 8, cloth)
    .box(-5, 0, -4, 10, 2, 8, 0xd6d7da)
    .box(-4, 13, -6, 8, 4, 3, cloth)
    .box(-2, 3, 4, 4, 4, 1, 0xe0e1e3)
    .box(-2, 10, 4, 1, 4, 1, 0xc4c6cc)
    .box(1, 11, 4, 1, 3, 1, 0xc4c6cc)
    .box(-2, 15, -2, 4, 2, 4, SKIN)
    .box(-8, 2, -3, 3, 12, 5, cloth)
    .box(-8, 1, 2, 3, 3, 4, SKIN)
    .box(5, 9, -2, 3, 5, 5, cloth);
  for (const x of [-5, 1]) {
    seated.box(x, -2, -2, 4, 4, 12, 0x384351)
      .box(x, -3, 9, 4, 3, 3, SKIN).box(x, -11, 9, 4, 8, 3, SKIN)
      .box(x, -12, 9, 4, 2, 3, 0xebedf0)
      .box(x, -14, 9, 4, 2, 6, 0xf7f7f2)
      .box(x, -14, 9, 4, 1, 6, 0x9a9fa9);
  }
  head.box(-5, 0, -5, 10, 10, 10, SKIN)
    .box(-4, 0, -4, 8, 1, 9, shade(SKIN, 0.96))
    .box(-5, 6, -5, 10, 3, 2, 0x231c19)
    .box(-5, 7, -5, 10, 4, 10, 0x394766)
    .box(-4, 11, -4, 8, 1, 8, 0x425273)
    .box(-4, 7, 5, 8, 1, 4, 0x31415e)
    .box(-3, 7, 9, 6, 1, 1, 0x31415e)
    .box(-1, 8, 5, 2, 2, 1, 0xcad4ea)
    .set(-3, 5, 4, 0x272125).set(2, 5, 4, 0x272125)
    .box(-1, 2, 5, 2, 1, 1, 0x9e6957);
  for (let z = 0; z < 8; z++) {
    const x = -Math.round(5 * z / 7);
    forearm.box(x - 1, -1, z, 3, 3, 1, z < 6 ? cloth : SKIN);
  }
  carton.box(-2, -1, -2, 4, 5, 4, 0xfaf5eb)
    .box(-2, 0, 1, 4, 2, 1, 0x327ed0)
    .box(1, 0, -2, 1, 2, 4, 0x4289db)
    .box(-1, 4, -2, 2, 1, 4, 0xb8d7f3)
    .box(-1, 5, -2, 2, 1, 2, 0xf9fcff);
  for (const [x, y] of [[-2, 0], [-2, 1], [-1, 1], [0, 0], [1, 0], [1, 1]]) carton.set(x, y, 1, 0xf7f8fa);
  return { seated, head, forearm, carton };
}

export type RoommateState = { near: boolean; elapsed: number };

export function stepRoommate(state: RoommateState, distance: number, dt: number) {
  if (state.near && distance >= 14) state.near = false;
  if (!state.near && distance <= 11) {
    state.near = true;
    if (state.elapsed >= SIP_DURATION) state.elapsed = 0;
  }
  state.elapsed = Math.min(SIP_DURATION, state.elapsed + dt);
}

export function sipPose(elapsed: number, reduced: boolean) {
  const ease = (t: number) => {
    const a = Math.max(0, Math.min(1, t));
    return reduced ? Number(a >= 0.5) : a * a * (3 - 2 * a);
  };
  const lift = ease(elapsed / 0.58) * (1 - ease((elapsed - 1.45) / 0.55));
  const sip = ease((elapsed - 0.58) / 0.28) * (1 - ease((elapsed - 1.25) / 0.27));
  return { arm: -1.07 * lift, carton: 0.94 * lift - 0.15 * sip, head: -0.11 * sip };
}
