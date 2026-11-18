import { Grid, type Color } from "./voxel";
import type { Outfit } from "./data";

/** Body parts are built around their joint so the renderer can swing them. */
export type AvatarParts = {
  height: number;
  hip: number;
  shoulder: number;
  shoulderX: number;
  hipX: number;
  head: Grid; torso: Grid; armL: Grid; armR: Grid; legL: Grid; legR: Grid;
  propeller?: Grid;
  propellerY?: number;
};

const SKIN = 0xf1c7a1, SKIN_DARK = 0xdcae86, HAIR = 0x1d1714, EYE = 0x15161a;
const HEIGHTS: Record<number, number> = { 7: 20, 8: 21, 9: 22, 10: 23, 11: 24, 12: 26, 13: 27, 14: 29, 15: 30, 16: 31, 17: 32, 18: 34 };
export const avatarHeight = (age: number) => HEIGHTS[Math.max(7, Math.min(18, Math.round(age)))];

type Look = { top: Color; topDark: Color; pants: Color; shoe: Color; sole: Color; accent: Color; hood: boolean; shorts: boolean; slides: boolean };
const LOOKS: Record<Outfit, Look> = {
  kid: { top: 0x4fa3e0, topDark: 0x3b86bf, pants: 0xc9a46a, shoe: 0xe0453a, sole: 0xf4f4f4, accent: 0xffffff, hood: false, shorts: true, slides: false },
  starwars: { top: 0x1c1c22, topDark: 0x121216, pants: 0x3c4f6e, shoe: 0xf3f3f3, sole: 0xd8d8d8, accent: 0xe03a3a, hood: true, shorts: false, slides: false },
  essentials: { top: 0xcdbb9e, topDark: 0xb7a587, pants: 0x8d8f94, shoe: 0xd8ccb4, sole: 0xc6b99d, accent: 0x6e6455, hood: true, shorts: false, slides: true },
  western: { top: 0x17171a, topDark: 0x0e0e10, pants: 0x1c1c20, shoe: 0x1a1a1c, sole: 0x2e2e33, accent: 0x3c3c42, hood: true, shorts: false, slides: false },
};

export function buildAvatar(age: number, outfit: Outfit): AvatarParts {
  const look = LOOKS[outfit];
  const H = avatarHeight(age), t = (Math.min(18, Math.max(7, age)) - 7) / 11;
  const headH = age >= 13 ? 8 : 7;
  const legs = Math.round((H - headH) * (0.5 + 0.06 * t));
  const torsoH = H - headH - legs;
  const W = age >= 14 ? 8 : 6, hw = W / 2, D = 4, armW = 2;
  const head = new Grid(), torso = new Grid(), armL = new Grid(), armR = new Grid(), legL = new Grid(), legR = new Grid();

  // Head, built from its base (neck) upward.
  head.box(-4, 0, -4, 8, headH, 8, SKIN);
  head.box(-4, headH - 2, -4, 8, 2, 8, HAIR).box(-4, 0, -4, 8, headH, 2, HAIR).box(-4, 2, -4, 1, headH - 2, 6, HAIR).box(3, 2, -4, 1, headH - 2, 6, HAIR);
  head.box(-4, headH - 3, 3, 8, 1, 1, HAIR).box(-3, headH - 4, 3, 2, 1, 1, HAIR);
  const eyeY = headH - 5;
  head.set(-2, eyeY, 3, EYE).set(1, eyeY, 3, EYE).set(-2, eyeY + 1, 3, EYE).set(1, eyeY + 1, 3, EYE);
  head.set(-3, eyeY - 1, 3, 0xf3a9a0).set(2, eyeY - 1, 3, 0xf3a9a0);
  head.set(-1, eyeY - 2, 3, 0xc46b5a).set(0, eyeY - 2, 3, 0xc46b5a);
  let propeller: Grid | undefined;
  if (outfit === "kid") {
    const panels = [0xe53935, 0xfbc02d, 0x1e88e5, 0x43a047];
    head.box(-4, headH, -4, 8, 2, 8, (x, _y, z) => panels[(x < 0 ? 0 : 1) + (z < 0 ? 0 : 2)]);
    head.box(-4, headH - 1, 3, 8, 1, 2, 0xe53935).box(-1, headH + 2, -1, 2, 1, 2, 0xfbc02d);
    propeller = new Grid().box(-5, 0, 0, 10, 1, 1, 0xe53935).box(0, 0, -5, 1, 1, 10, 0x1e88e5).set(0, 1, 0, 0xfbc02d);
  }
  if (look.hood) head.box(-4, 0, -5, 8, Math.min(4, headH - 2), 1, look.topDark);

  // Torso from the hip (y = 0) to the shoulders.
  torso.box(-hw, 0, -D / 2, W, torsoH, D, look.top);
  torso.box(-hw, 0, -D / 2, W, 1, D, look.topDark);
  torso.box(-1, torsoH, -1, 2, 1, 2, SKIN_DARK);
  if (outfit === "kid") torso.box(-1, torsoH - 1, D / 2, 2, 1, 1, SKIN).set(-1, torsoH - 3, D / 2, 0xffffff).set(0, torsoH - 3, D / 2, 0xffd23f);
  if (outfit === "starwars") {
    const logoY = Math.max(1, torsoH - 5);
    torso.box(-hw + 1, logoY, D / 2, W - 2, 3, 1, 0xf6d23c).box(-hw + 2, logoY + 1, D / 2, W - 4, 1, 1, 0x1c1c22);
    torso.set(-1, torsoH - 1, D / 2, 0xf0f0f0).set(0, torsoH - 1, D / 2, 0xf0f0f0).set(-1, torsoH - 2, D / 2, 0xf0f0f0).set(0, torsoH - 2, D / 2, 0xf0f0f0);
    torso.box(-hw + 1, 1, D / 2, W - 2, 2, 1, look.topDark);
  }
  if (outfit === "essentials") {
    torso.box(-2, torsoH - 4, D / 2, 4, 1, 1, 0x3a352d).set(-2, torsoH - 1, D / 2, 0xf3ede2).set(1, torsoH - 1, D / 2, 0xf3ede2);
    torso.box(-hw + 1, 1, D / 2, W - 2, 3, 1, look.topDark);
  }
  if (outfit === "western") {
    torso.set(-1, torsoH - 1, D / 2, 0x2c2c30).set(1, torsoH - 1, D / 2, 0x2c2c30).set(-1, torsoH - 2, D / 2, 0x2c2c30).set(1, torsoH - 2, D / 2, 0x2c2c30);
    torso.box(-hw + 1, 1, D / 2, W - 2, 3, 1, 0x101012);
  }

  // Arms hang from the shoulder pivot (y = 0) downward.
  const armLen = torsoH + (age >= 12 ? 1 : 0);
  for (const [arm, side] of [[armL, -1], [armR, 1]] as const) {
    const x = side < 0 ? -armW : 0;
    arm.box(x, -armLen + 2, -1, armW, armLen - 2, 2, look.top).box(x, -armLen, -1, armW, 2, 2, SKIN);
    if (outfit === "kid") arm.box(x, -armLen + 2, -1, armW, armLen - 5, 2, SKIN);
    else arm.box(x, -armLen + 2, -1, armW, 1, 2, look.topDark);
  }
  if (outfit === "kid") {
    armR.box(0, -armLen - 1, 1, 1, 5, 1, 0xf2f2f2);
    const swirl = [0xff4d6d, 0xffd23f, 0x4dd4ff, 0x7dff6a, 0xb57bff];
    armR.box(-1, -armLen + 4, 1, 3, 3, 1, (x, y) => swirl[Math.abs(x * 3 + y) % swirl.length]).set(0, -armLen + 7, 1, 0xff4d6d).set(-2, -armLen + 5, 1, 0x4dd4ff).set(2, -armLen + 5, 1, 0xffd23f);
  }

  // Legs hang from the hip.
  const footH = 2;
  for (const [leg, side] of [[legL, -1], [legR, 1]] as const) {
    const x = side < 0 ? -hw : 0, w = hw;
    if (look.shorts) {
      leg.box(x, -Math.round(legs * 0.45), -D / 2, w, Math.round(legs * 0.45), D, look.pants);
      leg.box(x, -legs + footH, -1, w, legs - footH - Math.round(legs * 0.45), 2, SKIN);
      leg.box(x, -legs + footH, -1, w, 1, 2, 0xf4f4f4);
    } else {
      leg.box(x, -legs + footH, -D / 2, w, legs - footH, D, look.pants);
      if (outfit === "essentials") leg.box(x, -legs + footH, -D / 2, w, 1, D, 0x7a7c80);
      if (outfit === "western") leg.box(x, -legs + footH, -D / 2, w, 1, D, 0x141416);
    }
    const toe = D / 2 + 1;
    if (look.slides) {
      leg.box(x, -legs, -D / 2, w, 1, D + 1, look.sole);
      leg.box(x, -legs + 1, -D / 2, w, 1, D + 1, SKIN).box(x, -legs + 1, 0, w, 1, toe, look.shoe);
    } else {
      leg.box(x, -legs, -D / 2, w, 1, D + 1, look.sole).box(x, -legs + 1, -D / 2, w, 1, D + 1, look.shoe);
      if (outfit === "starwars") leg.set(side < 0 ? x : x + w - 1, -legs + 1, 0, look.accent).set(side < 0 ? x : x + w - 1, -legs, -D / 2, 0x9fd8ff);
      if (outfit === "western") leg.set(side < 0 ? x : x + w - 1, -legs + 1, 0, look.accent);
      if (outfit === "kid") leg.box(x, -legs + 1, toe - 1, w, 1, 1, 0xffffff);
    }
  }

  return {
    height: H, hip: legs, shoulder: legs + torsoH - 1, shoulderX: hw, hipX: 0,
    head, torso, armL, armR, legL, legR, propeller, propellerY: headH + 3,
  };
}
