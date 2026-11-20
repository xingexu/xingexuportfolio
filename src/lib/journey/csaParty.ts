import { CanvasTexture, Group, Mesh, NearestFilter, Sprite, SpriteMaterial, Vector3, type MeshBasicMaterial, type BufferGeometry, type Object3D } from "three";
import { AVATAR_VOXEL_SIZE, SHIRT_PRINT_VOXEL_SIZE, buildAvatar } from "./avatar";
import { CSA_BARBER_CHAIR, CSA_BARBER_SEAT, CSA_STAGE_Z } from "./data";
import { gridGeometry } from "./mesh";
import { Grid, hash3, shade, type Color } from "./voxel";
import { AVATAR_SCALE, type Vec } from "./world";

type Hairstyle = "taper-fade" | "tousled" | "fluffy" | "straight" | "waves" | "side-part" | "cropped-fringe";
const ACTIVITY_LABELS = {
  greet: "Welcomes guests", direct: "Directs the floor", photo: "Takes photos", notes: "Checks a clipboard",
  drink: "Sips a drink", talk: "Chats", radio: "Checks in by radio", phone: "Posts updates", tablet: "Checks production cues",
};
type Activity = keyof typeof ACTIVITY_LABELS;
type Guest = Vec & {
  name: string; yaw: number; scale: number; dj?: boolean; hair?: Hairstyle; hairColor?: Color;
  skin?: Color; chain?: boolean; shorts?: boolean; cut?: "client" | "barber"; walk?: readonly [number, number]; activity?: Activity;
};

const floorGuest = (name: string, x: number, z: number, activity: Activity, hair: Hairstyle, scale = 1,
  walk: NonNullable<Guest["walk"]> = [3.2, 3.8], hairColor?: Color): Guest =>
  ({ name, x, z, yaw: 0, activity, hair, scale, walk, hairColor });

// The Western CSA team list supplies the exec roster; the original After Hours guests remain.
export const CSA_GUESTS: readonly Guest[] = [
  { name: "Jason Zhuang", ...CSA_BARBER_CHAIR, yaw: Math.PI / 2, scale: 1, hair: "taper-fade", hairColor: 0x302722, cut: "client" },
  { name: "Rain Li", x: 0, z: CSA_STAGE_Z - 8, yaw: 0, scale: 1, dj: true, hair: "fluffy", hairColor: 0x2d252c },
  floorGuest("Amelie Hu", -36, 16, "phone", "waves", 0.82, [5, 5], 0x382821),
  floorGuest("Lydia Zheng", 35, 12, "photo", "straight", 0.79, [5, 5], 0xb4643b),
  { ...floorGuest("Daniel Su", 31, -23, "direct", "side-part", 1, [5, 5], 0x2b2420), skin: 0xefd2ba },
  { name: "Lucas Xue", x: CSA_BARBER_CHAIR.x + 3, z: CSA_BARBER_CHAIR.z + 9.5, yaw: -2.85, scale: 1.06, hair: "cropped-fringe", hairColor: 0x201e1e, skin: 0xe6c7ab, shorts: true, cut: "barber" },
  floorGuest("Jeffrey Ban", -15, 11, "talk", "cropped-fringe", 1, [4, 5]),
  { ...floorGuest("William Wang", 13, -21, "radio", "tousled", 1, [5, 4], 0x252020), chain: true },
  floorGuest("Kevin Li", 14, -43, "tablet", "side-part", 1, [4, 4], 0x32272a),
  floorGuest("Selina Lim", -19, 28, "greet", "straight", 0.94),
  floorGuest("Gloria Huang", 19, 25, "greet", "waves", 0.96, undefined, 0x493128),
  floorGuest("Cassidy Lee", 53, -21, "notes", "waves", 0.93),
  floorGuest("Jessica Zhang", 70, 10, "drink", "straight", 0.96),
  floorGuest("Callista Chan", -34, -22, "tablet", "straight", 0.94),
  floorGuest("Michael Tan", -15, -26, "notes", "tousled"),
  floorGuest("Harry Yang", 72, -25, "notes", "tousled", 1.02),
  floorGuest("Sarah Gao", 54, 24, "photo", "straight", 0.94),
  floorGuest("Melissa Zhang", 74, 39, "notes", "waves", 0.97),
  floorGuest("Tanya Mai", -77, 24, "phone", "straight", 0.94),
  floorGuest("Ava Cheh", -62, 34, "photo", "waves", 0.95),
  floorGuest("Aleena Liu", 76, 58, "greet", "straight", 0.95),
  floorGuest("Kate Chen", -70, 57, "drink", "waves", 0.92),
  floorGuest("Ray Shen", -34, -42, "radio", "cropped-fringe"),
];

export function csaActivityLabel(guest: Guest) {
  return guest.dj ? "DJ" : guest.cut === "barber" ? "Cuts Jason’s hair" : guest.cut === "client" ? "Gets a haircut" :
    guest.activity ? ACTIVITY_LABELS[guest.activity] : "";
}

export function buildCsaGuest(guest: Guest) {
  const base = guest.hairColor ?? 0x242022;
  const skin = guest.skin ?? 0xf8e1d0;
  const parts = buildAvatar(18, "csa", { hair: base, skin: guest.skin, skinDark: guest.skin && shade(guest.skin, 0.91), shorts: guest.shorts ?? false });
  const { head, torso } = parts;
  const strand = (x: number, y: number, z: number) => shade(base, 0.81 + hash3(x, y, z) * 0.21 + ((x + z) % 3 === 0 ? 0.2 : 0));
  const hair = guest.hair;
  if (hair) {
    const long = hair === "straight" || hair === "waves";
    const sidePart = hair === "side-part", cropped = hair === "cropped-fringe", fade = hair === "taper-fade", fluffy = hair === "fluffy";
    const fringeLengths = [0, 1, 1, 2, 4, 2, 0, 1, 0, 2, 4, 1, 0, 1, 3, 2, 1, 0];
    for (let x = -9; x < 9; x++) for (let z = -8; z <= 8; z++) {
      const rim = (x + 0.5) ** 2 / (cropped ? 81 : fluffy ? 106 : 93) + (z + 0.5) ** 2 / (fluffy ? 98 : 85);
      if (rim > 1.13) continue;
      const tuft = fluffy ? Math.round(1.7 + Math.sin(x * 0.88 + z * 0.44) + Math.cos(z * 0.93 - x * 0.21)) :
        hair === "tousled" || cropped ? Math.floor(hash3(x, 17, z) * 3) : 0;
      const part = hair !== "tousled" && !cropped && !fluffy && (sidePart ? x === 3 : x === -1 || x === 0) && z > -3;
      const top = (fluffy ? 17 : 14) + Math.round((1 - rim) * (long ? 3 : fluffy ? 6 : 4)) + tuft - (part ? 2 : 0);
      const bang = long ? (Math.abs(x + 0.5) < 4 ? 12 : 8)
        : sidePart ? 8 + Math.max(0, 5 - Math.abs(x - 2))
        : cropped ? 9 + fringeLengths[x + 9]
        : fluffy ? 9 + Math.round(Math.cos(x * 1.15) * 1.5)
        : hair === "tousled" ? 9 + (x * x + 1) % 4 : 8 + Math.max(0, 4 - Math.abs(x));
      const bottom = z > 5 ? bang : Math.abs(x + 0.5) > 7 && !cropped && !fade ? 8 : 12;
      if (z >= 6 && bottom > 8) for (let y = 8; y < bottom; y++) {
        if (head.get(x, y, z) === base) head.set(x, y, z, skin);
      }
      head.box(x, bottom, z, 1, Math.max(0, top - bottom + 1), 1, strand);
    }
    if (fade) {
      const fadeBand = [skin, 0xc5a196, 0x947a74, 0x61514e, 0x483b37, base];
      for (let y = 1; y < 12; y++) {
        const color = fadeBand[Math.max(0, Math.min(fadeBand.length - 1, y - 5))];
        for (const x of [-8, 7]) for (let z = -7; z <= 2; z++) {
          head.set(x, y, z, color).set(x + (x < 0 ? 1 : -1), y, z, color);
        }
        for (let x = -7; x < 7; x++) head.set(x, y, -8, color);
      }
      for (const x of [-9, 8]) {
        head.box(x, 3, -1, 1, 4, 4, skin).set(x, 5, 1, 0xdec0b4);
        head.set(x, 4, 2, 0xc8f0ff).set(x < 0 ? x - 1 : x + 1, 4, 2, 0xf8fdff);
      }
    }
    if (sidePart) {
      for (const x of [-8, 7]) head.box(x, 0, 6, 1, 2, 2, -1);
      head.box(-3, 0, 7, 6, 1, 1, 0xa75f53).set(-4, 1, 7, 0xa75f53).set(3, 1, 7, 0xa75f53);
    }
    if (long) {
      const wavy = hair === "waves", length = wavy ? 16 : 20;
      for (let y = -length; y < 13; y++) {
        const tip = y + length, wave = wavy ? Math.round(Math.sin(y * 0.34) * 1.3) : 0;
        const width = Math.min(15, 7 + tip * 2);
        head.box(-Math.floor(width / 2), y, -9, width, 1, y > 0 ? 5 : 3, strand);
        for (const side of [-1, 1]) {
          const trim = side < 0 && wavy ? 2 : 0;
          if (tip >= trim + 1) {
            const x = side * (7 + wave) - (side < 0 ? 2 : 0);
            head.box(x, y, -5, tip < 5 ? 2 : 3, 1, tip < 5 ? 7 : 10, strand);
          }
        }
      }
    }
  }
  if (guest.chain) {
    const high = (parts.shoulder - parts.hip) * 2;
    for (let x = -4; x <= 3; x++) torso.set(x, high - 2 + Math.floor(Math.abs(x + 0.5) / 2), 3, x % 2 ? 0xbfc0c7 : 0xe1ded7);
  }
  if (guest.dj) csaHeadphones(head);
  return parts;
}

export function sampleCsaGuest(guest: Guest, index: number, time: number, reduced: boolean) {
  const idle = { x: guest.x, z: guest.z, yaw: guest.yaw, lift: 0, step: 0, roll: 0, left: 0, right: 0, nod: 0, spread: 0 };
  const clock = reduced ? 0 : time;
  const beat = clock * Math.PI * 4;
  if (guest.dj) return {
    ...idle, lift: (1 - Math.cos(beat)) * 0.14, roll: Math.sin(beat * 0.25) * 0.045, nod: 0.06 + (1 - Math.cos(beat)) * 0.11,
  };
  if (guest.cut === "client") return { ...idle, nod: -0.08 + Math.sin(clock * Math.PI) * 0.055 };
  if (guest.cut === "barber") return { ...idle, left: -0.2 + Math.sin(clock * Math.PI) * 0.08, roll: -0.035, nod: 0.15 };
  if (!guest.walk) return idle;
  const [rx, rz] = guest.walk, ramp = 0.55;
  const travel = Math.PI * (rx + rz) / 4.6 + ramp, task = 3.5 + index % 4 * 0.35;
  const elapsed = reduced ? travel + task * 0.5 : (clock + index * 1.67) % (travel + task);
  const t = Math.min(travel, elapsed);
  const distance = t < ramp ? t * t / (2 * ramp) : t > travel - ramp ? travel - ramp - (travel - t) ** 2 / (2 * ramp) : t - ramp / 2;
  const angle = index * 1.37 + Math.PI * 2 * distance / (travel - ramp);
  const step = Math.sin(distance * 7.5 + index) * 0.43 * Math.min(1, t / ramp, (travel - t) / ramp);
  const doing = pulse((elapsed - travel) / 0.52) * pulse((travel + task - elapsed) / 0.6);
  const gesture = sampleActivity(guest.activity, reduced ? 0 : elapsed - travel);
  return {
    ...idle, x: guest.x + Math.cos(angle) * rx, z: guest.z + Math.sin(angle) * rz,
    yaw: Math.atan2(-rx * Math.sin(angle), rz * Math.cos(angle)) + doing * gesture.turn,
    lift: Math.abs(step) * 0.57, step, roll: step * 0.065, left: mix(-step * 0.82, gesture.left, doing),
    right: mix(step * 0.82, gesture.right, doing), nod: mix(Math.abs(step) * 0.07, gesture.nod, doing), spread: doing * gesture.spread,
  };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const pulse = (value: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, value)))) / 2;

function sampleActivity(activity: Activity | undefined, time: number) {
  const beat = Math.sin(time * Math.PI * 2.15), sway = Math.sin(time * 3.1);
  const at = (left: number, right: number, nod = 0, spread = 0, turn = 0) => ({ left, right, nod, spread, turn });
  switch (activity) {
    case "greet": return at(-0.16, -2.45 + beat * 0.22, 0.03, 0.31 + sway * 0.21, 0.43);
    case "direct": return at(-0.26, -1.52 + beat * 0.16, 0.1, 0.93 + sway * 0.12, 0.6);
    case "photo": return at(-1.26, -1.88 + beat * 0.07, 0.05, -0.33, -0.44 + sway * 0.11);
    case "notes": return at(-1.28 + beat * 0.14, -1.05, 0.26 + beat * 0.05, -0.29);
    case "drink": return at(-0.1, -1.7 - pulse((time - 0.3) * 1.8) * 0.4, -0.08, -0.44);
    case "talk": return at(-0.7 - beat * 0.26, -0.64 + beat * 0.3, 0.07 + sway * 0.09, 0.4, 0.32);
    case "radio": return at(-0.12, -2.04 + sway * 0.09, 0.12, -0.53);
    case "phone": return at(-0.79 + beat * 0.12, -1.56, 0.29, -0.36);
    case "tablet": return at(-1.17 + beat * 0.12, -1.27, 0.32, -0.35, 0.28);
    default: return at(0, 0);
  }
}
const MIXER_PADS = [{ x: -1.6, z: -2.35 }, { x: -0.45, z: -2.35 }, { x: 0.7, z: -2.35 }, { x: 1.85, z: -2.35 }];
const DJ_PATTERN = [2, 3, 1, 3, 2, 1, 0, 3];

export function sampleCsaDj(time: number, reduced: boolean) {
  const beat = reduced ? 0 : time * 2;
  const phrase = beat % 8, scratch = Math.sin(beat * Math.PI);
  const cue = pulse((phrase - 4.7) * 2) * (1 - pulse((phrase - 6.8) * 2));
  const index = Math.floor(phrase), tap = pulse((phrase % 1) * 5) * (1 - pulse(((phrase % 1) - 0.45) * 2));
  const pad = DJ_PATTERN[index], travel = pulse(((phrase % 1) - 0.68) / 0.32);
  const from = MIXER_PADS[pad], to = MIXER_PADS[DJ_PATTERN[(index + 1) % DJ_PATTERN.length]];
  return {
    vinyl: -beat * 1.9 + scratch * 0.52,
    pad: cue > 0.12 || tap < 0.6 ? -1 : pad,
    left: { x: -5.4 + scratch * 0.55, y: 15.4, z: CSA_STAGE_Z - 1.8 - scratch * 0.55 },
    right: {
      x: mix(mix(from.x, to.x, travel) + 0.32, 4.1, cue),
      y: mix(16.2 - tap * 0.85, 21.6, cue),
      z: mix(CSA_STAGE_Z + from.z + 0.32, CSA_STAGE_Z - 7.1, cue),
    },
  };
}

export function sampleCsaCut(time: number, reduced: boolean) {
  const phase = reduced ? 0.3 : (time % 2.8) / 2.8;
  const pass = pulse(phase / 0.62) * (1 - pulse((phase - 0.7) / 0.3));
  const liftAway = pulse((phase - 0.57) / 0.21) * (1 - pulse((phase - 0.82) / 0.18));
  const x = CSA_BARBER_CHAIR.x + 0.75 - pass * 1.25;
  const y = CSA_BARBER_SEAT + 10.5 + pass * 2.05;
  const z = CSA_BARBER_CHAIR.z + 2.97 + liftAway * 0.95;
  return { blade: { x, y, z }, wrist: { x: x + 0.28, y: y - 0.68, z: z + 1.62 } };
}

export function csaHeadphones(head: Grid) {
  for (const side of [-1, 1]) {
    const x = side < 0 ? -12 : 8, shell = side < 0 ? x : x + 3;
    head.box(x, 5, -4, 4, 8, 8, 0x26242e).box(x + 1, 4, -3, 2, 10, 6, 0x413b4a);
    head.box(shell, 6, -3, 1, 6, 6, 0xa5a5bd).box(shell, 7, -2, 1, 4, 4, 0x5f5671);
    head.set(shell, 7, 3, 0x87dec9);
    for (let y = 12; y <= 25; y++) {
      const curve = Math.max(0, y - 20);
      head.box(side < 0 ? -11 + curve : 9 - curve, y, -2, 2, 1, 4, y > 19 ? 0x736b83 : 0x494457);
    }
  }
  return head.box(-6, 25, -2, 12, 2, 4, 0x4a4255).box(-4, 27, -1, 8, 1, 2, 0x8f809b);
}

const APRICOT = 0xff986e, LAVENDER = 0xc8a3ff, PINK = 0xff90bb;
const DISCO_Z = CSA_STAGE_Z + 6;
const DOWN = new Vector3(0, -1, 0), UP = new Vector3(0, 1, 0);
type Point = Vec & { y: number };

export function buildCsaDiscoBall() {
  const g = new Grid(), tiles = [0x7f7993, 0xbdb3cb, 0xeee2e9, 0xa9d4df, 0xf5b3c9, 0xc1afd8, 0xfaf3de];
  for (let x = -11; x <= 11; x++) for (let y = -11; y <= 11; y++) for (let z = -11; z <= 11; z++) {
    if (x * x + y * y + z * z > 121) continue;
    const tile = Math.floor(hash3(Math.floor(x / 2), Math.floor((y + 10) / 2), Math.floor(z / 2)) * tiles.length);
    g.set(x, y, z, shade(tiles[tile], 0.91 + Math.max(0, y) * 0.01));
  }
  return g;
}

function activityGear(activity: Activity | undefined) {
  const g = new Grid(), ink = 0x292435, shell = 0x53495f;
  switch (activity) {
    case "photo":
      return g.box(-5, -1, -2, 10, 7, 5, ink).box(-3, 1, 3, 6, 5, 3, shell)
        .box(-2, 2, 6, 4, 3, 1, 0xa69ccb).box(-3, 6, 0, 4, 2, 3, 0xeedce3);
    case "notes":
      g.box(-5, -2, 0, 10, 13, 2, 0x9c644d).box(-4, -1, 2, 8, 11, 1, 0xf9e8ce).box(-2, 9, 2, 4, 2, 1, 0xb8a2a3);
      for (let y = 0; y < 8; y += 2) g.box(-3, y, 3, 5, 1, 1, 0xb59b9a);
      return g;
    case "drink":
      return g.box(-2, -2, -2, 4, 7, 4, 0xc68c9e).box(-3, 5, -3, 6, 1, 6, 0xffd4c5)
        .box(1, 6, 0, 1, 4, 1, 0xfb927d);
    case "radio":
      return g.box(-3, -2, -2, 6, 10, 4, ink).box(-2, 2, 2, 4, 4, 1, shell)
        .box(-2, 8, -1, 1, 5, 1, 0x8b7a97).set(1, 6, 2, 0x8ae0bd);
    case "phone":
      return g.box(-3, -1, -1, 6, 10, 2, 0xf1bcae).box(-2, 0, -2, 4, 8, 1, 0x99b5dc)
        .set(-1, 7, 1, ink).set(-2, 6, 1, ink);
    case "tablet":
      g.box(-7, -2, -1, 14, 10, 2, 0xd3ccd6).box(-6, -1, -2, 12, 8, 1, 0x38496e);
      for (let x = -4; x < 5; x += 2) g.box(x, 1, -3, 1, 2 + (x + 5) % 4, 1, x < 0 ? 0x8de7cf : 0xe6a6cb);
      return g;
    default: return null;
  }
}

function splitLimb(grid: Grid, hinge: number, center = 0) {
  const upper = new Grid(), lower = new Grid();
  grid.forEach((x, y, z, color) => {
    if (y >= hinge) upper.set(x - center, y, z, color);
    else lower.set(x - center, y - hinge, z, color);
  });
  return { upper, lower };
}

function aimArm(upper: Object3D, lower: Object3D, hand: Vector3, upperLength: number, lowerLength: number, side: number) {
  const forward = hand.clone().sub(upper.position);
  const reach = Math.min(forward.length(), upperLength + lowerLength - 0.03);
  forward.normalize();
  const bend = (upperLength ** 2 - lowerLength ** 2 + reach ** 2) / (2 * Math.max(0.05, reach));
  const pole = new Vector3(side, -0.8, -0.3);
  pole.addScaledVector(forward, -pole.dot(forward)).normalize();
  lower.position.copy(upper.position).addScaledVector(forward, bend)
    .addScaledVector(pole, Math.sqrt(Math.max(0, upperLength ** 2 - bend ** 2)));
  hand.copy(upper.position).addScaledVector(forward, reach);
  upper.quaternion.setFromUnitVectors(DOWN, lower.position.clone().sub(upper.position).normalize());
  lower.quaternion.setFromUnitVectors(DOWN, hand.clone().sub(lower.position).normalize());
}

function stageScenery() {
  const g = new Grid(), floor = new Grid();
  const wall = CSA_STAGE_Z - 17;
  g.box(-69, 0, wall - 1, 138, 44, 1, 0x342330).box(-48, 5, wall, 96, 34, 1, 0x211a2f);
  const velvet = [0x4e2038, 0x76324d, 0x91405d, 0x602944];
  for (let x = -68; x < 68; x++) {
    const fold = Math.abs(x) % velvet.length;
    const inner = Math.max(0, Math.abs(x) - 52);
    if (Math.abs(x) >= 49) g.box(x, 1, wall + 1, 1, 40, 1 + fold, velvet[fold]);
    const valance = 4 + Math.floor(inner / 3) + Number(fold === 1);
    g.box(x, 41 - valance, wall + 4, 1, valance, 1, velvet[fold]);
    g.set(x, 41 - valance, wall + 5, 0xa96657);
  }
  g.box(-68, 41, wall + 4, 136, 2, 2, 0x9c6660).box(-68, 43, wall + 4, 136, 1, 2, 0xe3a26e);
  for (let x = -64; x <= 64; x += 8) g.box(x, 42, wall + 6, 2, 1, 1, APRICOT);
  g.box(-2, 43, wall - 1, 4, 5, 5, 0x4e4159).box(-1, 46, wall + 1, 2, 2, DISCO_Z - wall, 0x4e4159);
  for (let z = wall + 3; z < DISCO_Z; z += 3) g.box(-2, 46, z, 4, 1, 1, 0x846d8c);
  g.box(-1, 44, DISCO_Z - 1, 2, 3, 2, 0x9e899e);
  g.text("CSA", -37, 24, wall + 1, 0xffeddb, 2);
  g.text("WESTERN", -41, 17, wall + 1, 0xfda3ad);
  g.text("AFTER", 20, 24, wall + 1, 0xffeddb);
  g.text("HOURS", 20, 17, wall + 1, 0xfda3ad);
  for (const x of [-47, 46]) {
    const color = x < 0 ? APRICOT : LAVENDER;
    for (let y = 8; y < 40; y += 4) g.box(x, y, wall + 1, 1, 3, 1, color);
  }
  for (const [x, y] of [[-40, 34], [39, 34], [-18, 13], [18, 11], [-13, 32], [14, 34]]) {
    g.box(x - 1, y, wall + 1, 3, 1, 1, PINK).box(x, y - 1, wall + 1, 1, 3, 1, PINK);
  }
  for (const x of [-66, 65]) for (let z = wall + 5; z < CSA_STAGE_Z + 18; z += 5) floor.set(x, 0, z, 0xc7896c);
  for (const x of [-9, 8]) for (let z = CSA_STAGE_Z + 20; z < 81; z += 6) floor.set(x, 0, z, 0xf1aa7f);
  for (let x = -64; x <= 64; x += 4) floor.set(x, 0, CSA_STAGE_Z + 18, 0xe2a774);
  floor.box(-76, 0, -24, 24, 1, 30, 0x513846).box(-75, 0, -23, 22, 1, 28, 0x443747);
  for (let x = -74; x < -53; x += 2) for (const z of [-23, 4]) floor.set(x, 0, z, 0x88666d);
  return { backdrop: g, floor };
}

function makeNameTag(guest: Guest) {
  const canvas = document.createElement("canvas");
  const text = guest.dj ? `${guest.name} · DJ` : guest.name;
  canvas.width = 180; canvas.height = 38;
  const ink = canvas.getContext("2d");
  if (!ink) return null;
  ink.fillStyle = "#1d1628";
  ink.fillRect(0, 0, canvas.width, canvas.height);
  ink.fillStyle = guest.dj ? "#ff986e" : "#987eb2";
  ink.fillRect(0, canvas.height - 3, canvas.width, 3);
  ink.fillStyle = "#fff0e7";
  ink.textAlign = "center"; ink.textBaseline = "middle"; ink.font = "600 19px monospace";
  ink.fillText(text, canvas.width / 2, canvas.height / 2 - 1, 166);
  const texture = new CanvasTexture(canvas);
  texture.minFilter = NearestFilter;
  const material = new SpriteMaterial({ map: texture, transparent: true, opacity: 0.94, depthWrite: false });
  const sprite = new Sprite(material);
  sprite.scale.set(10, 2.1, 1);
  return { sprite, dispose: () => { material.dispose(); texture.dispose(); } };
}

export function makeCsaParty(material: MeshBasicMaterial, wallMaterial: MeshBasicMaterial) {
  const group = new Group(), stageWall = new Group(), geometries: BufferGeometry[] = [];
  const mesh = (grid: Grid, size = 1, paint = material) => {
    const geometry = gridGeometry(grid, [0, 0, 0], 0.02, size);
    geometries.push(geometry);
    return new Mesh(geometry, paint);
  };
  const { backdrop, floor } = stageScenery();
  group.add(mesh(floor));
  stageWall.add(mesh(backdrop, 1, wallMaterial));
  const disco = new Group(), sphere = mesh(buildCsaDiscoBall(), 0.46);
  disco.name = "Disco ball";
  sphere.position.setScalar(-0.23);
  disco.position.set(0, 39, DISCO_Z);
  disco.add(sphere);
  group.add(disco);
  const reflectionShapes = [0xfbc29c, 0xc9b5fa, 0xa4e7de, 0xf2afcd].map(color =>
    mesh(new Grid().set(0, 0, 0, color).set(1, 0, 0, shade(color, 0.67)), 0.55).geometry);
  const reflections = Array.from({ length: 18 }, (_, index) => {
    const spot = new Mesh(reflectionShapes[index % reflectionShapes.length], material);
    spot.name = "Disco reflection";
    spot.scale.set(1, 0.06, 1);
    group.add(spot);
    return spot;
  });
  const djPickables: Object3D[] = [];
  const guests = CSA_GUESTS.map((guest, index) => {
    const parts = buildCsaGuest(guest);
    const holder = new Group(), body = new Group();
    holder.name = guest.name;
    holder.add(body);
    body.scale.setScalar(AVATAR_SCALE * guest.scale);
    const start = sampleCsaGuest(guest, index, 0, false);
    holder.position.set(start.x, 0, start.z);
    holder.rotation.y = start.yaw;
    group.add(holder);
    const part = (grid: Grid, x: number, y: number) => {
      const object = mesh(grid, AVATAR_VOXEL_SIZE);
      object.position.set(x, y, 0);
      body.add(object);
      return object;
    };
    const torso = part(parts.torso, 0, parts.hip);
    if (parts.shirtPrint) torso.add(mesh(parts.shirtPrint, SHIRT_PRINT_VOXEL_SIZE));
    const head = part(parts.head, 0, parts.shoulder + 2);
    head.name = "Head";
    const arm = (grid: Grid, side: -1 | 1, articulated: boolean) => {
      if (!articulated) return { upper: part(grid, side * parts.shoulderX, parts.shoulder + 1) };
      const low = grid.bounds().minY, hinge = Math.round(low * 0.5), { upper, lower } = splitLimb(grid, hinge, side * 2);
      const shoulder = part(upper, side * (parts.shoulderX + 1), parts.shoulder + 1), elbow = part(lower, 0, 0);
      elbow.name = side < 0 ? "Left forearm" : "Right forearm";
      const aim = ({ x, y, z }: Point) => {
        const hand = body.worldToLocal(new Vector3(x, y, z));
        aimArm(shoulder, elbow, hand, -hinge * AVATAR_VOXEL_SIZE, (hinge - low - 1) * AVATAR_VOXEL_SIZE, side);
        return body.localToWorld(hand);
      };
      return { upper: shoulder, aim };
    };
    const left = arm(parts.armL, -1, !!guest.dj), right = arm(parts.armR, 1, !!guest.dj || guest.cut === "barber");
    const gearGrid = activityGear(guest.activity);
    const gear = gearGrid && mesh(gearGrid, 0.25);
    if (gear) {
      const hand = parts.armR.bounds();
      gear.name = csaActivityLabel(guest);
      gear.position.set((hand.minX + hand.maxX + 1) * AVATAR_VOXEL_SIZE / 2, (hand.minY + 2) * AVATAR_VOXEL_SIZE, 0.8);
      right.upper.add(gear);
    }
    const leg = (grid: Grid) => {
      if (guest.cut !== "client") return part(grid, 0, parts.hip);
      const hinge = Math.round(grid.bounds().minY * 0.54), { upper, lower } = splitLimb(grid, hinge);
      const hip = part(upper, 0, parts.hip), knee = mesh(lower, AVATAR_VOXEL_SIZE);
      hip.name = "Seated thigh"; knee.name = "Seated shin";
      knee.position.y = hinge * AVATAR_VOXEL_SIZE;
      knee.rotation.x = Math.PI / 2;
      hip.add(knee);
      return hip;
    };
    const legL = leg(parts.legL), legR = leg(parts.legR);
    const seatOffset = guest.cut === "client" ? CSA_BARBER_SEAT - parts.hip * body.scale.y + 0.04 : 0;
    const tag = makeNameTag(guest);
    if (tag) {
      const silhouette = parts.shoulder + 2 + (parts.head.bounds().maxY + 1) * AVATAR_VOXEL_SIZE;
      tag.sprite.position.y = Math.max(parts.height, silhouette) * body.scale.y + seatOffset + 2.2;
      holder.add(tag.sprite);
    }
    if (guest.dj) holder.traverse(object => {
      if (object instanceof Mesh || object instanceof Sprite) {
        object.userData.csaDj = true;
        djPickables.push(object);
      }
    });
    return { guest, holder, body, head, left, right, legL, legR, tag, gear, seatOffset, clock: 0 };
  });
  const clipper = mesh(new Grid().box(-2, 0, -1, 4, 5, 3, 0x292831)
    .box(-1, 1, 2, 2, 3, 1, 0x685870).set(0, 2, 3, 0x9fefd1)
    .box(-2, 5, -1, 4, 2, 3, 0xa6a3ad).box(-3, 7, -1, 6, 1, 2, 0xe9dde2), 0.24);
  clipper.name = "Lucas’s clippers";
  group.add(clipper);
  const recordGrid = new Grid();
  for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) {
    const r = x * x + z * z;
    if (r <= 65) recordGrid.set(x, 0, z, r < 7 ? 0xda865f :
      x + z === 5 && x > 0 ? 0xa284a9 : r > 45 ? 0x29252f : 0x403545);
  }
  const records = [-6, 6].map(x => {
    const vinyl = mesh(recordGrid, 0.27);
    vinyl.name = "Spinning vinyl"; vinyl.position.set(x, 15, CSA_STAGE_Z);
    group.add(vinyl);
    return vinyl;
  });
  const pads = MIXER_PADS.map(({ x, z }, index) => {
    const pad = mesh(new Grid().box(0, 0, 0, 2, 1, 2, index % 2 ? PINK : LAVENDER), 0.32);
    pad.position.set(x, 15.02, CSA_STAGE_Z + z);
    group.add(pad);
    return pad;
  });
  const barShapes = [APRICOT, PINK, LAVENDER].map(color => mesh(new Grid().set(0, 0, 0, color)).geometry);
  const bars = Array.from({ length: 16 }, (_, i) => {
    const bar = new Mesh(barShapes[i % barShapes.length], wallMaterial);
    bar.position.set(i < 8 ? -41 + i * 1.8 : 28 + (i - 8) * 1.8, 8, CSA_STAGE_Z - 16);
    stageWall.add(bar);
    return bar;
  });

  let time = 0;
  return {
    group, stageWall, djPickables,
    nearDj(player: Vec) {
      return Math.hypot(player.x, player.z - (CSA_STAGE_Z - 8)) <= 23;
    },
    blocks(from: Vec, to: Vec, radius: number) {
      return guests.some(({ holder }) => {
        const { x, z } = holder.position, next = Math.hypot(to.x - x, to.z - z);
        return next < radius + 2.5 && next < Math.hypot(from.x - x, from.z - z);
      });
    },
    update(dt: number, reduced: boolean, player: Vec) {
      if (!reduced) time += dt;
      const dj = sampleCsaDj(time, reduced), cut = sampleCsaCut(time, reduced);
      const spin = reduced ? 0 : time * 0.32;
      disco.rotation.y = spin;
      reflections.forEach((spot, index) => {
        const angle = index * 2.4 + spin * (index % 2 ? 1 : -0.8), ring = 12 + index % 5 * 8.2;
        spot.position.set(Math.cos(angle) * ring, 0.047, DISCO_Z + Math.sin(angle) * ring * 0.56);
        spot.rotation.y = -angle;
      });
      for (const [index, view] of guests.entries()) {
        const { guest, holder, body, head, left, right, legL, legR, tag, gear, seatOffset } = view;
        const pose = sampleCsaGuest(guest, index, guest.walk ? view.clock + dt : time, reduced);
        const gap = Math.hypot(player.x - holder.position.x, player.z - holder.position.z);
        const nextGap = Math.hypot(player.x - pose.x, player.z - pose.z);
        const waiting = !!guest.walk && !reduced && nextGap < 5.1 && nextGap < gap;
        if (!waiting) {
          holder.position.set(pose.x, 0, pose.z);
          holder.rotation.y = pose.yaw;
          if (!reduced) view.clock += dt;
        }
        body.position.y = seatOffset + (waiting ? 0 : pose.lift);
        body.rotation.z = waiting ? 0 : pose.roll;
        const step = waiting ? 0 : pose.step;
        legL.rotation.x = guest.cut === "client" ? -Math.PI / 2 : step;
        legR.rotation.x = guest.cut === "client" ? -Math.PI / 2 : -step;
        head.rotation.x = pose.nod;
        if (guest.dj) {
          left.aim?.(dj.left); right.aim?.(dj.right);
        } else {
          left.upper.rotation.set(waiting ? 0 : pose.left, 0, -0.12);
          if (guest.cut === "barber") {
            const hand = right.aim?.(cut.wrist);
            if (hand) {
              clipper.position.copy(hand);
              const { x, y, z } = cut.blade;
              clipper.quaternion.setFromUnitVectors(UP, new Vector3(x, y, z).sub(hand).normalize());
            }
          } else {
            right.upper.rotation.set(waiting ? 0 : pose.right, 0, waiting ? 0.12 : 0.12 + pose.spread);
            if (gear) gear.rotation.x = -right.upper.rotation.x - 0.18;
          }
        }
        if (tag) tag.sprite.visible = gap < (guest.dj ? 65 : 21);
      }
      records.forEach((vinyl, i) => { vinyl.rotation.y = dj.vinyl * (i ? 1 : -0.67); });
      pads.forEach((pad, i) => { pad.visible = i === dj.pad; });
      bars.forEach((bar, i) => { bar.scale.y = (reduced ? 2 : 2 + Math.sin(time * 8.4 + i * 1.47)) + i % 3; });
    },
    dispose() {
      geometries.forEach(geometry => geometry.dispose());
      guests.forEach(guest => guest.tag?.dispose());
    },
  };
}
