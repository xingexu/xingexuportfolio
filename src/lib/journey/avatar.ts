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
  shirtPrint?: Grid;
  propeller?: Grid;
  propellerY?: number;
};

const SKIN = 0xf8e1d0, SKIN_DARK = 0xecc9b4, HAIR = 0x1d1714, EYE = 0x15161a;
const HEIGHTS: Record<number, number> = { 7: 20, 8: 21, 9: 22, 10: 23, 11: 24, 12: 26, 13: 27, 14: 29, 15: 30, 16: 31, 17: 32, 18: 34 };
export const avatarHeight = (age: number) => HEIGHTS[Math.max(7, Math.min(18, Math.round(age)))];
export const AVATAR_VOXEL_SIZE = 0.5;
export const SHIRT_PRINT_VOXEL_SIZE = 0.125;

type Look = { top: Color; topDark: Color; pants: Color; shoe: Color; sole: Color; accent: Color; hood: boolean; shorts: boolean; slides: boolean };
const LOOKS: Record<Outfit, Look> = {
  kid: { top: 0x4fa3e0, topDark: 0x3b86bf, pants: 0xc9a46a, shoe: 0xe0453a, sole: 0xf4f4f4, accent: 0xffffff, hood: false, shorts: true, slides: false },
  starwars: { top: 0x1c1c22, topDark: 0x121216, pants: 0x3c4f6e, shoe: 0xf3f3f3, sole: 0xd8d8d8, accent: 0xe03a3a, hood: true, shorts: false, slides: false },
  stussy: { top: 0x272729, topDark: 0x1b1b1d, pants: 0xa1a1a1, shoe: 0xd8ccb4, sole: 0xc6b99d, accent: 0xece9e2, hood: true, shorts: false, slides: true },
  western: { top: 0x222226, topDark: 0x151518, pants: 0x29292e, shoe: 0x25232a, sole: 0x373438, accent: 0x4d4748, hood: true, shorts: false, slides: false },
  csa: { top: 0x26252a, topDark: 0x19181c, pants: 0x202024, shoe: 0x161619, sole: 0x303035, accent: 0xf6efe4, hood: false, shorts: false, slides: false },
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

const STUSSY_BACK = [
  ".....#........",
  "....##....#.#.",
  "..#######...##",
  "#######.######",
  "..######.#.###",
  "..#.#.......##",
  "............#.",
  ".............#",
  ".............#",
];
const STUSSY_CHEST = ["..#.....", ".#####.#", "####.###", "..#.#..#", ".......#"];

function stussyPrint(torso: Grid, height: number, ink: Color) {
  const stamp = (pattern: string[], left: number, top: number, z: number) => {
    pattern.forEach((row, dy) => [...row].forEach((pixel, dx) => {
      const x = left + (z < 0 ? row.length - 1 - dx : dx), y = top - dy;
      if (pixel === "#" && torso.has(x, y, z)) torso.set(x, y, z, ink);
    }));
  };
  stamp(STUSSY_BACK, -7, height - 4, -6);
  stamp(STUSSY_CHEST, 0, height - 5, 3);
}

function cuffSweats(leg: Grid, side: -1 | 1, width: number, length: number, look: Look) {
  const x = side < 0 ? -width : 0, cuff = -(length - 2) * 2;
  const rib = fabric(look.pants, 0.81), seam = fabric(look.pants, 0.89);
  leg.box(x, cuff, -4, width, 2, 8, -1).box(x + 1, cuff, -3, width - 2, 2, 6, rib);
  leg.box(side < 0 ? x : x + width - 1, cuff + 2, 0, 1, -cuff - 2, 1, seam);
  leg.box(x + 1, cuff + 3, 3, width - 2, 1, 1, fabric(look.pants, 0.92));
}

function straightLeg(side: -1 | 1, length: number, look: Look) {
  const leg = new Grid(), bottom = -length * 2;
  const fleece = fabric(look.pants), fold = fabric(look.pants, 1.28);
  const suede = fabric(look.shoe), welt = fabric(look.accent);
  const from = (inner: number, width: number) => side < 0 ? -inner - width : inner;
  const boot = from(1, 6);
  leg.box(boot, bottom, -3, 6, 2, 9, look.sole).box(boot + 1, bottom, 6, 4, 2, 1, look.sole);
  leg.box(boot, bottom + 2, -3, 6, 1, 9, welt).box(boot + 1, bottom + 2, 6, 4, 1, 1, welt);
  leg.box(boot, bottom + 3, -3, 6, 2, 8, suede).box(boot + 1, bottom + 3, 5, 4, 1, 1, suede);
  leg.box(boot, bottom + 5, -3, 6, 2, 6, suede).box(boot, bottom + 6, -3, 6, 1, 6, welt);

  for (let y = bottom + 7; y < 0; y++) {
    const hip = y >= -5;
    const width = hip ? 7 : 6, x = from(hip ? 0 : 1, width);
    leg.box(x + 1, y, -3, width - 2, 1, 6, fleece).box(x, y, -2, width, 1, 4, fleece);
    const seam = side < 0 ? x : x + width - 1;
    leg.set(seam, y, 0, fold(seam, y, 0));
  }
  return leg;
}

function csaTee(height: number, ink: Color) {
  const print = new Grid(), back = new Grid(), top = height - 10;
  const wordmark = [
    ".## .## .## #.# #...# .#.",
    "#.. ##. ..# #.# #.#.# #.#",
    "#.. .## ### #.# #.#.# #.#",
    ".## ##. .## .## .#.#. .#.",
  ];
  wordmark.forEach((row, dy) => [...row].forEach((pixel, x) => {
    if (pixel === "#") print.set(x - 1, top - dy, 16, ink);
  }));
  back.text("CSA AT", -19, top - 4, 0, ink);
  back.text("WESTERN", -19, top - 10, 0, ink);
  const cat = (x: number, y: number, flip = false) => {
    const rows = [
      "..........##....", "..........##....", "...........##...", "...........###..",
      "#...#.......##..", "##.##......###..", "#####....#####..", "#.#.##########..",
      "#############...", ".######.####....", "...####...###...", "..##.##....###..",
    ];
    rows.forEach((row, dy) => [...row].forEach((pixel, dx) => {
      if (pixel === "#") back.set(x + (flip ? row.length - dx - 1 : dx), y - dy, 0, ink);
    }));
  };
  cat(5, top - 7, true);
  cat(-5, top - 20);
  cat(-19, top - 32, true);
  for (const [x, y, radius] of [[-13, top - 19, 5], [16, top - 24, 3], [3, top - 42, 4], [-19, top - 28, 2], [18, top - 39, 3]]) {
    back.box(x - radius, y, 0, radius * 2 + 1, 1, 1, 0xcfc4d6)
      .box(x, y - radius, 0, 1, radius * 2 + 1, 1, 0xcfc4d6).set(x, y, 0, ink);
    if (radius > 3) for (const dx of [-2, 2]) for (const dy of [-2, 2]) back.set(x + dx, y + dy, 0, 0xa493a9);
  }
  back.forEach((x, y, _z, color) => { if (y > 4) print.set(-x - 1, y, -17, color); });
  return print;
}

export function buildAvatar(age: number, outfit: Outfit, style?: Partial<Pick<Look, "top" | "topDark" | "shorts">> & { skin?: Color; skinDark?: Color; hair?: Color }): AvatarParts {
  const look = { ...LOOKS[outfit], ...style };
  const skin = style?.skin ?? SKIN, skinDark = style?.skinDark ?? SKIN_DARK;
  const hair = style?.hair ?? HAIR;
  const western = outfit === "western";
  const csa = outfit === "csa", adult = western || csa;
  const H = avatarHeight(age), t = (Math.min(18, Math.max(7, age)) - 7) / 11;
  const headH = !adult && age >= 13 ? 8 : 7;
  const legs = Math.round((H - headH) * (0.5 + 0.06 * t));
  const torsoH = H - headH - legs;
  const W = !adult && age >= 14 ? 8 : 6, hw = W / 2, D = 4, armW = 2;
  const head = new Grid(), torso = new Grid(), armL = new Grid(), armR = new Grid(), legL = new Grid(), legR = new Grid();

  // Head, built from its base (neck) upward.
  head.box(-4, 0, -4, 8, headH, 8, skin)
    .box(-4, headH - 2, -4, 8, 2, 8, hair).box(-4, 0, -4, 8, headH, 2, hair).box(-4, 2, -4, 1, headH - 2, 6, hair).box(3, 2, -4, 1, headH - 2, 6, hair);
  head.box(-4, headH - 3, 3, 8, 1, 1, hair).box(-3, headH - 4, 3, 2, 1, 1, hair);
  const eyeY = headH - 5;
  head.set(-2, eyeY, 3, EYE).set(1, eyeY, 3, EYE).set(-2, eyeY + 1, 3, EYE).set(1, eyeY + 1, 3, EYE);
  if (!adult) head.set(-3, eyeY - 1, 3, 0xf3a9a0).set(2, eyeY - 1, 3, 0xf3a9a0);
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
  torso.box(-1, torsoH, -1, 2, 1, 2, skinDark);
  if (outfit === "kid") torso.box(-1, torsoH - 1, D / 2, 2, 1, 1, skin).set(-1, torsoH - 3, D / 2, 0xffffff).set(0, torsoH - 3, D / 2, 0xffd23f);
  if (outfit === "starwars") {
    const logoY = Math.max(1, torsoH - 5);
    torso.box(-hw + 1, logoY, D / 2, W - 2, 3, 1, 0xf6d23c).box(-hw + 2, logoY + 1, D / 2, W - 4, 1, 1, 0x1c1c22);
    torso.set(-1, torsoH - 1, D / 2, 0xf0f0f0).set(0, torsoH - 1, D / 2, 0xf0f0f0).set(-1, torsoH - 2, D / 2, 0xf0f0f0).set(0, torsoH - 2, D / 2, 0xf0f0f0);
    torso.box(-hw + 1, 1, D / 2, W - 2, 2, 1, look.topDark);
  }
  // Arms hang from the shoulder pivot (y = 0) downward.
  const armLen = torsoH + (age >= 12 ? 1 : 0);
  for (const [arm, side] of [[armL, -1], [armR, 1]] as const) {
    const x = side < 0 ? -armW : 0;
    arm.box(x, -armLen + 2, -1, armW, armLen - 2, 2, look.top).box(x, -armLen, -1, armW, 2, 2, skin);
    if (outfit === "kid") arm.box(x, -armLen + 2, -1, armW, armLen - 5, 2, skin);
    else if (csa) {
      const sleeve = Math.max(2, Math.floor(armLen / 3));
      arm.box(x, -armLen, -1, armW, armLen - sleeve, 2, skin)
        .box(x, -sleeve, -1, armW, 1, 2, look.topDark);
    }
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
      leg.box(x, -legs + footH, -1, w, legs - footH - Math.round(legs * 0.45), 2, skin);
      leg.box(x, -legs + footH, -1, w, 1, 2, csa ? look.shoe : 0xf4f4f4);
    } else {
      leg.box(x, -legs + footH, -D / 2, w, legs - footH, D, look.pants);
    }
    const toe = D / 2 + 1;
    if (look.slides) {
      leg.box(x, -legs, -D / 2, w, 1, D + 1, look.sole);
      leg.box(x, -legs + 1, -D / 2, w, 1, D + 1, skin).box(x, -legs + 1, 0, w, 1, toe, look.shoe);
    } else {
      leg.box(x, -legs, -D / 2, w, 1, D + 1, look.sole).box(x, -legs + 1, -D / 2, w, 1, D + 1, look.shoe);
      if (outfit === "starwars") leg.set(side < 0 ? x : x + w - 1, -legs + 1, 0, look.accent).set(side < 0 ? x : x + w - 1, -legs, -D / 2, 0x9fd8ff);
      if (outfit === "kid") leg.box(x, -legs + 1, toe - 1, w, 1, 1, 0xffffff);
    }
  }

  const fineHead = finePart(head);
  const fineTorso = finePart(torso, look.top, look.topDark);
  const fineArmL = finePart(armL, look.top, look.topDark), fineArmR = finePart(armR, look.top, look.topDark);
  const fineLegL = western ? straightLeg(-1, legs, look) : finePart(legL, look.pants);
  const fineLegR = western ? straightLeg(1, legs, look) : finePart(legR, look.pants);
  if (!western && look.hood) fullerHoodie(fineHead, fineTorso, fineArmL, fineArmR, W, torsoH, armLen, look);
  if (outfit === "stussy") {
    stussyPrint(fineTorso, torsoH * 2, look.accent);
    cuffSweats(fineLegL, -1, W, legs, look);
    cuffSweats(fineLegR, 1, W, legs, look);
  }
  return {
    height: H, hip: legs, shoulder: legs + torsoH - 1, shoulderX: hw, hipX: 0,
    head: fineHead, torso: fineTorso, armL: fineArmL, armR: fineArmR,
    shirtPrint: csa ? csaTee(torsoH * 8, look.accent) : undefined,
    legL: fineLegL, legR: fineLegR,
    propeller: propeller && finePart(propeller), propellerY: headH + 3,
  };
}
