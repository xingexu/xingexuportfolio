import { Grid, hash3, shade, type Color } from "./voxel";
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

const SKIN = 0xf8e1d0, SKIN_DARK = 0xecc9b4, HAIR = 0x1d1714, EYE = 0x15161a;
const HEIGHTS: Record<number, number> = { 7: 20, 8: 21, 9: 22, 10: 23, 11: 24, 12: 26, 13: 27, 14: 29, 15: 30, 16: 31, 17: 32, 18: 34 };
export const avatarHeight = (age: number) => HEIGHTS[Math.max(7, Math.min(18, Math.round(age)))];
export const AVATAR_VOXEL_SIZE = 0.5;

type Look = { top: Color; topDark: Color; pants: Color; shoe: Color; sole: Color; accent: Color; hood: boolean; shorts: boolean; slides: boolean };
const LOOKS: Record<Outfit, Look> = {
  kid: { top: 0x4fa3e0, topDark: 0x3b86bf, pants: 0xc9a46a, shoe: 0xe0453a, sole: 0xf4f4f4, accent: 0xffffff, hood: false, shorts: true, slides: false },
  starwars: { top: 0x1c1c22, topDark: 0x121216, pants: 0x3c4f6e, shoe: 0xf3f3f3, sole: 0xd8d8d8, accent: 0xe03a3a, hood: true, shorts: false, slides: false },
  essentials: { top: 0xcdbb9e, topDark: 0xb7a587, pants: 0x8d8f94, shoe: 0xd8ccb4, sole: 0xc6b99d, accent: 0x6e6455, hood: true, shorts: false, slides: true },
  western: { top: 0x222226, topDark: 0x151518, pants: 0x29292e, shoe: 0x25232a, sole: 0x373438, accent: 0x4d4748, hood: true, shorts: false, slides: false },
};

const fabric = (tone: Color, lift = 1) => (x: number, y: number, z: number) =>
  shade(tone, lift * (0.95 + hash3(x, y, z) * 0.12 + ((x + y * 2 + z) % 5 === 0 ? 0.06 : 0)));

function finePart(source: Grid, ...cloth: Color[]) {
  const fine = new Grid();
  source.forEach((x, y, z, color) => fine.box(x * 2, y * 2, z * 2, 2, 2, 2, cloth.includes(color) ? fabric(color) : color));
  return fine;
}

function fullerHoodie(head: Grid, torso: Grid, armL: Grid, armR: Grid, W: number, H: number, armLen: number, look: Look) {
  const weave = fabric(look.top), seam = fabric(look.top, 1.22), shadow = fabric(look.topDark, 1.08);
  // Lower back hangs loose; the ribbed hem stays fitted.
  torso.box(-W + 1, 3, -6, W * 2 - 2, H * 2 - 5, 2, weave);
  for (const x of [-W - 1, W]) torso.box(x, 3, -4, 1, H * 2 - 7, 7, weave);
  for (let x = -W; x < W; x++) torso.set(x, 1, 4, x % 2 ? look.topDark : shade(look.top, 0.9));
  // Pocket openings and topstitching sit one fine voxel above the fleece.
  for (let x = -W + 3; x < W - 3; x++) torso.set(x, 2, 5, shade(look.topDark, 1.25));
  for (let y = 3; y < 7; y++) {
    const edge = W - 4 - Math.floor((y - 3) / 2);
    torso.set(-edge, y, 5, seam(-edge, y, 5)).set(edge - 1, y, 5, seam(edge - 1, y, 5));
  }
  for (const [arm, x] of [[armL, -4], [armR, 0]] as const) {
    const cuff = -armLen * 2 + 4, length = -cuff - 3;
    arm.box(x, cuff + 3, -3, 4, length, 1, weave).box(x, cuff + 3, 2, 4, length, 1, weave);
    arm.box(x + (x < 0 ? -1 : 4), cuff + 4, -2, 1, length - 2, 4, weave);
    arm.box(x, cuff + 1, 2, 4, 1, 1, seam).box(x + 1, cuff + 4, 3, 2, 1, 1, shadow);
  }
  // Folded hood drapes over the neckline without covering the face.
  head.box(-7, 0, -12, 14, 3, 2, weave).box(-6, 3, -11, 12, 3, 2, weave);
  head.box(-8, 1, -10, 2, 5, 3, shadow).box(6, 1, -10, 2, 5, 3, shadow);
  head.box(-6, 3, -12, 12, 1, 1, seam);
}

function texturedHair(head: Grid, height: number) {
  const tufts = [
    [-4, 5, 2.5, 3.8, 4.8], [0, 5, 3.2, 4.4, 6.4], [4, 4, 2.9, 4.2, 4.9],
    [-4, -1, 3.0, 4.5, 4.2], [1, -1, 3.4, 5.2, 6.0], [4, -3, 2.6, 4.0, 4.0],
    [-2, -5, 4.2, 3.2, 4.0],
  ];
  for (let z = -8; z < 8; z++) for (let x = -8; x < 8; x++) {
    const side = Math.abs(x + 0.5), front = z > 3;
    const swept = x + Math.floor((z + 8) / 4);
    const wave = hash3(swept, 8, Math.floor(z / 4));
    const base = z < -5 ? height - 6 : side > 5 ? height - 3 : front ? height - 4 - Number(x < 1) : height - 5;
    const crown = height + Math.floor(Math.max(...tufts.map(([cx, cz, rx, rz, rise]) => {
      const dist = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
      return dist < 1 ? (1 - dist) ** 0.55 * (rise + 0.5 * wave) : 0;
    })));
    for (let y = base; y < crown; y++) {
      const strand = shade(HAIR, 0.88 + 0.31 * wave + 0.18 * Math.sin((swept + y) * 1.3) + (y === crown - 1 ? 0.21 : 0));
      head.set(x, y, z, strand);
      if (z === 7 && side < 6 && y >= height - 4 && y < crown - 1) {
        head.set(x, y, z + 1, strand);
        if (side < 4 && y >= height - 2) head.set(x, y, z + 2, strand);
      }
    }
  }
}

function sculptFace(head: Grid, height: number) {
  for (const x of [-8, 7]) for (const z of [-8, 7]) head.box(x, 0, z, 1, height - 4, 1, -1);
  head.box(-1, height - 12, 8, 2, 4, 1, SKIN).box(-1, height - 12, 9, 2, 1, 1, shade(SKIN, 0.94));
  for (const x of [-8, 7]) head.box(x, height - 12, 1, 1, 4, 2, shade(SKIN, 0.95));
}

function oversizedHoodie(head: Grid, torso: Grid, armL: Grid, armR: Grid, W: number, H: number, armLen: number, look: Look) {
  const fleece = fabric(look.top), rib = fabric(look.topDark, 1.2), stitch = fabric(look.top, 1.36);
  for (let y = -5; y < H; y++) {
    const half = W + (y >= H - 4 ? 2 : y <= -4 ? 2 : 4);
    const edge = y >= H - 2 ? 4 : 6;
    torso.box(-half + 1, y, -edge, half * 2 - 2, 1, edge * 2, y <= -4 ? rib : fleece);
    torso.box(-half, y, -edge + 2, half * 2, 1, edge * 2 - 4, y <= -4 ? rib : fleece);
    if (y >= -1 && y < H - 4) {
      const x = half - 4 - Math.floor((y + 1) / 5);
      torso.set(-x, y, edge - 1, stitch(-x, y, edge)).set(x - 2, y, -edge, stitch(x, y, -edge));
    }
  }
  torso.box(-W + 2, 0, 6, W * 2 - 4, 5, 1, fleece).box(-W + 4, 5, 6, W * 2 - 8, 1, 1, stitch);
  for (let y = 1; y <= 4; y++) {
    const x = W - 3 - Math.floor(y / 2);
    torso.set(-x - 1, y, 6, look.topDark).set(x, y, 6, look.topDark);
  }
  for (const x of [-2, 1]) torso.box(x, H - 6, 6, 1, 4, 1, stitch);

  for (const [arm, side] of [[armL, -1], [armR, 1]] as const) {
    const bottom = -armLen * 2 + 3;
    for (let y = bottom; y < 0; y++) {
      const cuff = y < bottom + 3;
      const width = cuff ? 5 : y < bottom + 6 ? 7 : 8;
      const depth = cuff ? 3 : y < bottom + 6 ? 4 : 5;
      const x = side < 0 ? 1 - width : -1;
      arm.box(x, y, -depth, width, 1, depth * 2, cuff ? rib : fleece);
      if (!cuff) {
        const seam = side < 0 ? x + 1 : x + width - 2;
        arm.set(seam, y, depth - 1, stitch(seam, y, depth));
      }
    }
  }
  head.box(-8, -2, -12, 16, 4, 3, fleece).box(-6, 2, -12, 12, 3, 3, fleece);
  head.box(-5, 3, -13, 10, 1, 1, stitch);
}

function wideLeg(side: -1 | 1, length: number, look: Look) {
  const leg = new Grid(), bottom = -length * 2;
  const fleece = fabric(look.pants), fold = fabric(look.pants, 1.28);
  const suede = fabric(look.shoe), welt = fabric(look.accent);
  const from = (inner: number, width: number) => side < 0 ? -inner - width : inner;
  const boot = from(2, 9);
  leg.box(boot, bottom, -5, 9, 2, 13, look.sole).box(boot + 1, bottom, 8, 7, 2, 1, look.sole);
  leg.box(boot, bottom + 2, -5, 9, 1, 13, welt).box(boot + 1, bottom + 2, 8, 7, 1, 1, welt);
  leg.box(boot, bottom + 3, -5, 9, 2, 12, suede).box(boot + 1, bottom + 3, 7, 7, 1, 1, suede);
  leg.box(boot + 1, bottom + 5, -5, 7, 3, 9, suede).box(boot + 1, bottom + 7, -5, 7, 1, 9, welt);
  for (let x = boot + 1; x < boot + 8; x++) leg.set(x, bottom + 4, 7, welt(x, bottom + 4, 7));

  for (let y = bottom + 7; y < 0; y++) {
    const width = y >= -3 ? 11 : y < bottom + 11 ? 12 : 13;
    const x = from(y >= -3 ? 0 : 1, width);
    const front = y < bottom + 12 ? 6 + (y % 3 === 0 ? 1 : 0) : 6;
    leg.box(x + 1, y, -6, width - 2, 1, 6 + front, fleece).box(x, y, -4, width, 1, front + 2, fleece);
    const seam = side < 0 ? x + 1 : x + width - 2;
    leg.set(seam, y, front - 1, fold(seam, y, front));
    if (y < bottom + 12 && y % 2 === 0) leg.box(x + 3, y, front - 1, width - 6, 1, 1, fold);
  }
  return leg;
}

export function buildAvatar(age: number, outfit: Outfit): AvatarParts {
  const look = LOOKS[outfit];
  const western = outfit === "western";
  const H = avatarHeight(age), t = (Math.min(18, Math.max(7, age)) - 7) / 11;
  const headH = age >= 13 ? 8 : 7;
  const legs = Math.round((H - headH) * (0.5 + 0.06 * t));
  const torsoH = H - headH - legs;
  const W = age >= 14 ? 8 : 6, hw = W / 2, D = 4, armW = 2;
  const head = new Grid(), torso = new Grid(), armL = new Grid(), armR = new Grid(), legL = new Grid(), legR = new Grid();

  // Head, built from its base (neck) upward.
  head.box(-4, 0, -4, 8, headH, 8, SKIN);
  if (!western) {
    head.box(-4, headH - 2, -4, 8, 2, 8, HAIR).box(-4, 0, -4, 8, headH, 2, HAIR).box(-4, 2, -4, 1, headH - 2, 6, HAIR).box(3, 2, -4, 1, headH - 2, 6, HAIR);
    head.box(-4, headH - 3, 3, 8, 1, 1, HAIR).box(-3, headH - 4, 3, 2, 1, 1, HAIR);
  }
  const eyeY = headH - 5;
  head.set(-2, eyeY, 3, EYE).set(1, eyeY, 3, EYE).set(-2, eyeY + 1, 3, EYE).set(1, eyeY + 1, 3, EYE);
  if (!western) head.set(-3, eyeY - 1, 3, 0xf3a9a0).set(2, eyeY - 1, 3, 0xf3a9a0);
  const mouth = western ? 0xa17e70 : 0xc46b5a;
  head.set(-1, eyeY - 2, 3, mouth).set(0, eyeY - 2, 3, mouth);
  let propeller: Grid | undefined;
  if (outfit === "kid") {
    const panels = [0xe53935, 0xfbc02d, 0x1e88e5, 0x43a047];
    head.box(-4, headH, -4, 8, 2, 8, (x, _y, z) => panels[(x < 0 ? 0 : 1) + (z < 0 ? 0 : 2)]);
    head.box(-4, headH - 1, 3, 8, 1, 2, 0xe53935).box(-1, headH + 2, -1, 2, 1, 2, 0xfbc02d);
    propeller = new Grid().box(-5, 0, 0, 10, 1, 1, 0xe53935).box(0, 0, -5, 1, 1, 10, 0x1e88e5).set(0, 1, 0, 0xfbc02d);
  }
  if (look.hood && !western) head.box(-4, 0, -5, 8, Math.min(4, headH - 2), 1, look.topDark);

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
  if (!western) for (const [leg, side] of [[legL, -1], [legR, 1]] as const) {
    const x = side < 0 ? -hw : 0, w = hw;
    if (look.shorts) {
      leg.box(x, -Math.round(legs * 0.45), -D / 2, w, Math.round(legs * 0.45), D, look.pants);
      leg.box(x, -legs + footH, -1, w, legs - footH - Math.round(legs * 0.45), 2, SKIN);
      leg.box(x, -legs + footH, -1, w, 1, 2, 0xf4f4f4);
    } else {
      leg.box(x, -legs + footH, -D / 2, w, legs - footH, D, look.pants);
      if (outfit === "essentials") leg.box(x, -legs + footH, -D / 2, w, 1, D, 0x7a7c80);
    }
    const toe = D / 2 + 1;
    if (look.slides) {
      leg.box(x, -legs, -D / 2, w, 1, D + 1, look.sole);
      leg.box(x, -legs + 1, -D / 2, w, 1, D + 1, SKIN).box(x, -legs + 1, 0, w, 1, toe, look.shoe);
    } else {
      leg.box(x, -legs, -D / 2, w, 1, D + 1, look.sole).box(x, -legs + 1, -D / 2, w, 1, D + 1, look.shoe);
      if (outfit === "starwars") leg.set(side < 0 ? x : x + w - 1, -legs + 1, 0, look.accent).set(side < 0 ? x : x + w - 1, -legs, -D / 2, 0x9fd8ff);
      if (outfit === "kid") leg.box(x, -legs + 1, toe - 1, w, 1, 1, 0xffffff);
    }
  }

  const fineHead = finePart(head), fineTorso = finePart(torso, look.top, look.topDark);
  const fineArmL = finePart(armL, look.top, look.topDark), fineArmR = finePart(armR, look.top, look.topDark);
  if (western) {
    sculptFace(fineHead, headH * 2);
    texturedHair(fineHead, headH * 2);
    oversizedHoodie(fineHead, fineTorso, fineArmL, fineArmR, W, torsoH * 2, armLen, look);
  } else if (look.hood) fullerHoodie(fineHead, fineTorso, fineArmL, fineArmR, W, torsoH, armLen, look);
  return {
    height: H, hip: legs, shoulder: legs + torsoH - 1, shoulderX: hw + Number(western), hipX: 0,
    head: fineHead, torso: fineTorso, armL: fineArmL, armR: fineArmR,
    legL: western ? wideLeg(-1, legs, look) : finePart(legL, look.pants),
    legR: western ? wideLeg(1, legs, look) : finePart(legR, look.pants),
    propeller: propeller && finePart(propeller), propellerY: headH + 3,
  };
}
