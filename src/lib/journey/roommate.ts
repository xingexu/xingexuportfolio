import { AVATAR_SKIN as SKIN, buildAvatar } from "./avatar";
import { Grid, hash3, shade, textWidth } from "./voxel";

const FLEECE = 0xf2f1ed, RIBBING = 0xd6d7da;
const CAP = 0x212227, CAP_EDGE = 0x323339, CAP_BRIM = 0x17171c;
const cloth = (x: number, y: number, z: number) => shade(FLEECE, 0.93 + 0.12 * hash3(x, y, z));
export const ROOMMATE_VOXEL_SIZE = 0.5;
export const RANGERS_CREST_VOXEL_SIZE = 0.13;
export const ROOMMATE_SEAT = 7;
export const SIP_DURATION = 2;

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
  const { head, torso, shoulder, hip } = buildAvatar(18, "western", { top: FLEECE, topDark: RIBBING });
  addBackwardCap(head);
  const crest = buildRangersCrest();
  const seated = new Grid(), forearm = new Grid(), carton = new Grid();
  seated.box(-7, 2, -2, 4, 14, 4, cloth)
    .box(-7, 2, 2, 4, 1, 2, RIBBING)
    .box(-7, 1, 2, 4, 1, 4, SKIN)
    .box(3, 9, -2, 4, 7, 4, cloth);
  for (const x of [-5, 1]) {
    seated.box(x, -2, -2, 4, 4, 12, 0x384351)
      .box(x, -3, 9, 4, 3, 3, SKIN).box(x, -11, 9, 4, 8, 3, SKIN)
      .box(x, -12, 9, 4, 2, 3, 0xebedf0)
      .box(x, -14, 9, 4, 2, 6, 0xf7f7f2)
      .box(x, -14, 9, 4, 1, 6, 0x9a9fa9);
  }
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
  return { seated, head, torso, crest, forearm, carton, headHeight: shoulder - hip + 2 };
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
  return { arm: -1.07 * lift, armYaw: 0.68 * (1 - lift), carton: 0.94 * lift - 0.15 * sip, head: -0.11 * sip };
}
