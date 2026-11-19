import { CanvasTexture, Group, Mesh, NearestFilter, Sprite, SpriteMaterial, Vector3, type MeshBasicMaterial, type BufferGeometry, type Object3D } from "three";
import { AVATAR_VOXEL_SIZE, SHIRT_PRINT_VOXEL_SIZE, buildAvatar } from "./avatar";
import { CSA_BARBER_CHAIR, CSA_BARBER_SEAT, CSA_STAGE_Z } from "./data";
import { gridGeometry } from "./mesh";
import { Grid, hash3, shade, type Color } from "./voxel";
import { AVATAR_SCALE, type Vec } from "./world";

type Hairstyle = "taper-fade" | "tousled" | "straight" | "waves" | "side-part" | "cropped-fringe";
type Guest = Vec & {
  name: string; yaw: number; scale: number; dj?: boolean; hair?: Hairstyle; hairColor?: Color;
  skin?: Color; chain?: boolean; shorts?: boolean; cut?: "client" | "barber"; walk?: readonly [number, number];
};

export const CSA_GUESTS: readonly Guest[] = [
  { name: "Jason Zhuang", ...CSA_BARBER_CHAIR, yaw: Math.PI / 2, scale: 1, hair: "taper-fade", hairColor: 0x302722, cut: "client" },
  { name: "Rain Li", x: 0, z: CSA_STAGE_Z - 8, yaw: 0, scale: 1, dj: true },
  { name: "Amelie Hu", x: -41, z: 14, yaw: 0, scale: 0.91, hair: "waves", hairColor: 0x382821, walk: [9, 11] },
  { name: "Lydia Zheng", x: 42, z: 13, yaw: 0, scale: 0.93, hair: "straight", hairColor: 0x453128, walk: [10, 11] },
  { name: "Daniel Su", x: 44, z: -25, yaw: 0, scale: 1, hair: "side-part", hairColor: 0x2b2420, skin: 0xefd2ba, walk: [11, 9] },
  { name: "Lucas Xue", x: CSA_BARBER_CHAIR.x + 3, z: CSA_BARBER_CHAIR.z + 9.5, yaw: -2.85, scale: 1.06, hair: "cropped-fringe", hairColor: 0x201e1e, skin: 0xe6c7ab, shorts: true, cut: "barber" },
  { name: "Jeffrey Ban", x: -16, z: 14, yaw: 0, scale: 1, walk: [8, 13] },
  { name: "William Wang", x: 13, z: -21, yaw: 0, scale: 1, hair: "tousled", hairColor: 0x252020, chain: true, walk: [10, 13] },
];

export function buildCsaGuest(guest: Guest) {
  const base = guest.hairColor ?? 0x242022;
  const skin = guest.skin ?? 0xf8e1d0;
  const parts = buildAvatar(18, "csa", { hair: base, skin: guest.skin, skinDark: guest.skin && shade(guest.skin, 0.91), shorts: guest.shorts ?? false });
  const { head, torso } = parts;
  const strand = (x: number, y: number, z: number) => shade(base, 0.81 + hash3(x, y, z) * 0.21 + ((x + z) % 3 === 0 ? 0.2 : 0));
  const hair = guest.hair;
  if (hair) {
    const long = hair === "straight" || hair === "waves";
    const sidePart = hair === "side-part", cropped = hair === "cropped-fringe", fade = hair === "taper-fade";
    const fringeLengths = [0, 1, 1, 2, 4, 2, 0, 1, 0, 2, 4, 1, 0, 1, 3, 2, 1, 0];
    for (let x = -9; x < 9; x++) for (let z = -8; z <= 8; z++) {
      const rim = (x + 0.5) ** 2 / (cropped ? 81 : 93) + (z + 0.5) ** 2 / 85;
      if (rim > 1.13) continue;
      const tuft = hair === "tousled" || cropped ? Math.floor(hash3(x, 17, z) * 3) : 0;
      const part = hair !== "tousled" && !cropped && (sidePart ? x === 3 : x === -1 || x === 0) && z > -3;
      const top = 14 + Math.round((1 - rim) * (long ? 3 : 4)) + tuft - (part ? 2 : 0);
      const bang = long ? (Math.abs(x + 0.5) < 4 ? 12 : 8)
        : sidePart ? 8 + Math.max(0, 5 - Math.abs(x - 2))
        : cropped ? 9 + fringeLengths[x + 9]
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
  const idle = { x: guest.x, z: guest.z, yaw: guest.yaw, lift: 0, step: 0, roll: 0, left: 0, right: 0, nod: 0 };
  const clock = reduced ? 0 : time;
  const beat = clock * Math.PI * 4;
  if (guest.dj) return {
    ...idle, lift: (1 - Math.cos(beat)) * 0.14, roll: Math.sin(beat * 0.25) * 0.045, nod: 0.06 + (1 - Math.cos(beat)) * 0.11,
  };
  if (guest.cut === "client") return { ...idle, nod: -0.08 + Math.sin(clock * Math.PI) * 0.055 };
  if (guest.cut === "barber") return { ...idle, left: -0.2 + Math.sin(clock * Math.PI) * 0.08, roll: -0.035, nod: 0.15 };
  if (!guest.walk) return idle;
  const [rx, rz] = guest.walk, angle = clock * (0.41 - index * 0.008) + index * 1.37;
  const step = reduced ? 0 : Math.sin(time * 5.6 + index) * 0.43;
  return {
    ...idle, x: guest.x + Math.cos(angle) * rx, z: guest.z + Math.sin(angle) * rz,
    yaw: Math.atan2(-rx * Math.sin(angle), rz * Math.cos(angle)),
    lift: Math.abs(step) * 0.57, step, roll: step * 0.065, left: -step * 0.82, right: step * 0.82, nod: Math.abs(step) * 0.07,
  };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const pulse = (value: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, value)))) / 2;
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
      x: mix(mix(from.x, to.x, travel) + 0.32, 3.55, cue),
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
  return head.box(-10, 5, -3, 2, 6, 6, 0x24232b).box(8, 5, -3, 2, 6, 6, 0x24232b)
    .box(-9, 7, -2, 1, 6, 4, 0x6a597a).box(8, 7, -2, 1, 6, 4, 0x6a597a)
    .box(-8, 13, -2, 2, 2, 4, 0x38313e).box(6, 13, -2, 2, 2, 4, 0x38313e)
    .box(-7, 14, -2, 14, 2, 4, 0x37323f)
    .box(-5, 15, -1, 10, 1, 2, 0x574962);
}

const APRICOT = 0xff986e, LAVENDER = 0xc8a3ff, PINK = 0xff90bb;
const DOWN = new Vector3(0, -1, 0), UP = new Vector3(0, 1, 0);
type Point = Vec & { y: number };

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
  const djPickables: Object3D[] = [];
  const guests = CSA_GUESTS.map((guest, index) => {
    const parts = buildCsaGuest(guest);
    const holder = new Group(), body = new Group();
    holder.name = guest.name;
    holder.add(body);
    body.scale.setScalar(AVATAR_SCALE * guest.scale);
    const start = sampleCsaGuest(guest, index, 0, true);
    holder.position.set(start.x, 0, start.z);
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
      tag.sprite.position.y = parts.height * body.scale.y + seatOffset + 2.2;
      holder.add(tag.sprite);
    }
    if (guest.dj) holder.traverse(object => {
      if (object instanceof Mesh || object instanceof Sprite) {
        object.userData.csaDj = true;
        djPickables.push(object);
      }
    });
    return { guest, holder, body, head, left, right, legL, legR, tag, seatOffset, clock: 0 };
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
      for (const [index, view] of guests.entries()) {
        const { guest, holder, body, head, left, right, legL, legR, tag, seatOffset } = view;
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
          } else right.upper.rotation.set(waiting ? 0 : pose.right, 0, 0.12);
        }
        if (tag) tag.sprite.visible = gap < (guest.dj ? 65 : 26);
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
