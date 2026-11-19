import { CanvasTexture, Group, Mesh, NearestFilter, Sprite, SpriteMaterial, type MeshBasicMaterial, type BufferGeometry, type Object3D } from "three";
import { AVATAR_VOXEL_SIZE, SHIRT_PRINT_VOXEL_SIZE, buildAvatar } from "./avatar";
import { CSA_STAGE_Z } from "./data";
import { gridGeometry } from "./mesh";
import { Grid, hash3, shade, type Color } from "./voxel";
import { AVATAR_SCALE, type Vec } from "./world";

type Hairstyle = "curtains" | "tousled" | "straight" | "waves" | "side-part" | "cropped-fringe";
type Guest = Vec & {
  name: string; yaw: number; scale: number; dj?: boolean; hair?: Hairstyle; hairColor?: Color;
  skin?: Color; chain?: boolean; shorts?: boolean;
};

export const CSA_GUESTS: readonly Guest[] = [
  { name: "Jason Zhuang", x: -19, z: -14, yaw: 0.35, scale: 1, hair: "curtains", hairColor: 0x302722 },
  { name: "Rain Li", x: 0, z: CSA_STAGE_Z - 8, yaw: 0, scale: 1, dj: true },
  { name: "Amelie Hu", x: -34, z: 5, yaw: 1.15, scale: 0.91, hair: "waves", hairColor: 0x382821 },
  { name: "Lydia Zheng", x: 23, z: 8, yaw: -0.6, scale: 0.93, hair: "straight", hairColor: 0x453128 },
  { name: "Daniel Su", x: 35, z: -22, yaw: -0.8, scale: 1, hair: "side-part", hairColor: 0x2b2420, skin: 0xefd2ba },
  { name: "Lucas Xue", x: 36, z: 27, yaw: -1.9, scale: 1.06, hair: "cropped-fringe", hairColor: 0x201e1e, skin: 0xe6c7ab, shorts: true },
  { name: "Jeffrey Ban", x: -31, z: 25, yaw: 1.7, scale: 1 },
  { name: "William Wang", x: 12, z: -18, yaw: -0.25, scale: 1, hair: "tousled", hairColor: 0x252020, chain: true },
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
    const sidePart = hair === "side-part", cropped = hair === "cropped-fringe";
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
      const bottom = z > 5 ? bang : Math.abs(x + 0.5) > 7 && !cropped ? 8 : 12;
      if (z >= 6 && bottom > 8) for (let y = 8; y < bottom; y++) {
        if (head.get(x, y, z) === base) head.set(x, y, z, skin);
      }
      head.box(x, bottom, z, 1, Math.max(0, top - bottom + 1), 1, strand);
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
  const phase = time * 3.6 + index * 1.81;
  if (guest.dj) return {
    x: guest.x, z: guest.z, yaw: guest.yaw, lift: 0, step: 0, roll: 0,
    left: -1.12 - (reduced ? 0 : Math.sin(phase * 0.5) * 0.12),
    right: -1.14 - (reduced ? 0 : Math.cos(phase) * 0.15),
    nod: reduced ? 0.12 : 0.12 + Math.sin(phase) * 0.14,
  };
  const sway = reduced ? 0 : Math.sin(phase), step = reduced ? 0 : Math.sin(phase * 2);
  return {
    x: guest.x + sway * 1.2, z: guest.z + step * 0.42, yaw: guest.yaw + sway * 0.28,
    lift: Math.abs(step) * 0.44, step: step * 0.36, roll: sway * 0.09,
    left: -0.22 - sway * 0.31, right: -0.25 + sway * 0.33, nod: step * 0.08,
  };
}

export function csaHeadphones(head: Grid) {
  return head.box(-10, 5, -3, 2, 6, 6, 0x24232b).box(8, 5, -3, 2, 6, 6, 0x24232b)
    .box(-9, 7, -2, 1, 6, 4, 0x6a597a).box(8, 7, -2, 1, 6, 4, 0x6a597a)
    .box(-8, 13, -2, 2, 2, 4, 0x38313e).box(6, 13, -2, 2, 2, 4, 0x38313e)
    .box(-7, 14, -2, 14, 2, 4, 0x37323f)
    .box(-5, 15, -1, 10, 1, 2, 0x574962);
}

const APRICOT = 0xff986e, LAVENDER = 0xc8a3ff, PINK = 0xff90bb;

function stageScenery() {
  const g = new Grid(), floor = new Grid();
  const wall = CSA_STAGE_Z - 17;
  g.box(-51, 4, wall - 1, 102, 38, 1, 0x392745).box(-48, 6, wall, 96, 34, 1, 0x211a2f);
  g.box(-50, 41, wall, 100, 1, 1, APRICOT).box(-50, 4, wall, 100, 1, 1, 0x956285);
  g.text("CSA", -37, 24, wall + 1, 0xffeddb, 2);
  g.text("WESTERN", -41, 17, wall + 1, 0xfda3ad);
  g.text("AFTER", 20, 24, wall + 1, 0xffeddb);
  g.text("HOURS", 20, 17, wall + 1, 0xfda3ad);
  for (const x of [-47, 46]) {
    const color = x < 0 ? APRICOT : LAVENDER;
    for (let y = 8; y < 40; y += 4) g.box(x, y, wall + 1, 1, 3, 1, color);
    floor.box(x, 0, wall + 2, 1, 1, 25, color);
  }
  for (const [x, y] of [[-40, 34], [39, 34], [-18, 13], [18, 11], [-13, 32], [14, 34]]) {
    g.box(x - 1, y, wall + 1, 3, 1, 1, PINK).box(x, y - 1, wall + 1, 1, 3, 1, PINK);
  }
  for (const x of [-48, 47]) for (let z = -36; z <= 38; z += 6) {
    floor.box(x, 0, z, 1, 1, 3, x < 0 ? 0xb86c7a : 0x9d81c5);
  }
  floor.box(-47, 0, -39, 94, 1, 1, 0xb87692);
  floor.box(-47, 0, 41, 38, 1, 1, 0x906ca9).box(9, 0, 41, 38, 1, 1, 0x906ca9);
  for (const x of [-8, 7]) for (let z = 43; z < 68; z += 6) floor.box(x, 0, z, 1, 1, 3, 0x9b81b7);
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
  const guests = CSA_GUESTS.map(guest => {
    const parts = buildCsaGuest(guest);
    const holder = new Group(), body = new Group();
    holder.add(body);
    body.scale.setScalar(AVATAR_SCALE * guest.scale);
    holder.position.set(guest.x, 0, guest.z);
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
    const left = part(parts.armL, -parts.shoulderX, parts.shoulder + 1), right = part(parts.armR, parts.shoulderX, parts.shoulder + 1);
    const legL = part(parts.legL, 0, parts.hip), legR = part(parts.legR, 0, parts.hip);
    const tag = makeNameTag(guest);
    if (tag) {
      tag.sprite.position.y = parts.height * AVATAR_SCALE * guest.scale + 2.2;
      holder.add(tag.sprite);
    }
    if (guest.dj) holder.traverse(object => {
      if (object instanceof Mesh || object instanceof Sprite) {
        object.userData.csaDj = true;
        djPickables.push(object);
      }
    });
    return { guest, holder, body, head, left, right, legL, legR, tag };
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
      for (const [index, view] of guests.entries()) {
        const { guest, holder, body, head, left, right, legL, legR, tag } = view;
        const pose = sampleCsaGuest(guest, index, time, reduced);
        const gap = Math.hypot(player.x - pose.x, player.z - pose.z);
        if (reduced || gap >= 5.1 || gap >= Math.hypot(player.x - holder.position.x, player.z - holder.position.z)) {
          holder.position.set(pose.x, 0, pose.z);
        }
        holder.rotation.y = pose.yaw;
        body.position.y = pose.lift;
        body.rotation.z = pose.roll;
        left.rotation.set(pose.left, 0, guest.dj ? -0.32 : -0.2 - pose.roll);
        right.rotation.set(pose.right, 0, guest.dj ? 0.32 : 0.24 - pose.roll);
        legL.rotation.x = pose.step; legR.rotation.x = -pose.step;
        head.rotation.x = pose.nod;
        if (tag) tag.sprite.visible = gap < (guest.dj ? 65 : 26);
      }
      bars.forEach((bar, i) => { bar.scale.y = (reduced ? 2 : 2 + Math.sin(time * 4.3 + i * 1.47)) + i % 3; });
    },
    dispose() {
      geometries.forEach(geometry => geometry.dispose());
      guests.forEach(guest => guest.tag?.dispose());
    },
  };
}
