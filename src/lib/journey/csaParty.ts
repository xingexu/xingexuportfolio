import { BoxGeometry, CanvasTexture, Group, Mesh, MeshBasicMaterial, NearestFilter, Sprite, SpriteMaterial, type BufferGeometry } from "three";
import { AVATAR_VOXEL_SIZE, buildAvatar } from "./avatar";
import { gridGeometry } from "./mesh";
import { Grid } from "./voxel";
import { AVATAR_SCALE, type Vec } from "./world";

type Guest = Vec & { name: string; yaw: number; scale: number; dj?: boolean; longHair?: boolean };

export const CSA_GUESTS: readonly Guest[] = [
  { name: "Jason Zhuang", x: -13, z: -6, yaw: 0.35, scale: 1 },
  { name: "Rain Li", x: 0, z: -34, yaw: 0, scale: 1, dj: true },
  { name: "Amelie Hu", x: -24, z: 3, yaw: 1.15, scale: 0.91, longHair: true },
  { name: "Lydia Zheng", x: 15, z: 4, yaw: -0.6, scale: 0.93, longHair: true },
  { name: "Daniel Su", x: 23, z: -12, yaw: -0.8, scale: 1 },
  { name: "Lucas Xue", x: 25, z: 18, yaw: -1.9, scale: 1 },
  { name: "Jeffrey Ban", x: -22, z: 17, yaw: 1.7, scale: 1 },
  { name: "William Wang", x: 8, z: -9, yaw: -0.25, scale: 1 },
];

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

function stageBackdrop() {
  const g = new Grid();
  g.box(-32, 5, -39, 64, 31, 1, 0x392745).box(-30, 7, -38, 60, 27, 1, 0x231b32);
  g.box(-32, 35, -37, 64, 1, 1, APRICOT).box(-32, 5, -37, 64, 1, 1, 0x956285);
  g.text("CSA", -16, 18, -37, 0xffeddb, 3);
  g.text("AFTER HOURS", -21, 10, -37, 0xfda3ad);
  for (const x of [-29, 28]) {
    const color = x < 0 ? APRICOT : LAVENDER;
    for (let y = 8; y < 34; y += 4) g.box(x, y, -37, 1, 3, 1, color);
    g.box(x, 0, -36, 1, 1, 12, color);
  }
  for (const [x, y] of [[-24, 28], [23, 28], [-21, 16], [21, 17]]) {
    g.box(x - 1, y, -37, 3, 1, 1, PINK).box(x, y - 1, -37, 1, 3, 1, PINK);
  }
  for (const x of [-32, 31]) for (let z = -19; z < 23; z += 6) {
    g.box(x, 0, z, 1, 1, 3, x < 0 ? 0x9d5662 : 0x7d649f);
  }
  return g;
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

export function makeCsaParty(material: MeshBasicMaterial) {
  const group = new Group(), geometries: BufferGeometry[] = [];
  const mesh = (grid: Grid, size = 1) => {
    const geometry = gridGeometry(grid, [0, 0, 0], 0.02, size);
    geometries.push(geometry);
    return new Mesh(geometry, material);
  };
  group.add(mesh(stageBackdrop()));
  const guests = CSA_GUESTS.map(guest => {
    const parts = buildAvatar(18, "csa");
    if (guest.longHair) {
      parts.head.box(-8, -3, -8, 2, 12, 4, 0x25201f).box(6, -3, -8, 2, 12, 4, 0x25201f);
      parts.head.box(-7, -4, -9, 14, 12, 3, 0x211c1d).box(-5, -3, -10, 10, 10, 1, 0x2c2424);
    }
    if (guest.dj) csaHeadphones(parts.head);
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
    part(parts.torso, 0, parts.hip);
    const head = part(parts.head, 0, parts.shoulder + 2);
    const left = part(parts.armL, -parts.shoulderX, parts.shoulder + 1), right = part(parts.armR, parts.shoulderX, parts.shoulder + 1);
    const legL = part(parts.legL, 0, parts.hip), legR = part(parts.legR, 0, parts.hip);
    const tag = makeNameTag(guest);
    if (tag) {
      tag.sprite.position.y = parts.height * AVATAR_SCALE * guest.scale + 2.2;
      holder.add(tag.sprite);
    }
    return { guest, holder, body, head, left, right, legL, legR, tag };
  });
  const barShape = new BoxGeometry(1, 1, 0.8).translate(0, 0.5, 0);
  geometries.push(barShape);
  const lightMaterials = [APRICOT, PINK, LAVENDER].map(color => new MeshBasicMaterial({ color }));
  const bars = Array.from({ length: 10 }, (_, i) => {
    const bar = new Mesh(barShape, lightMaterials[i % lightMaterials.length]);
    bar.position.set(i < 5 ? -27 + i * 1.65 : 20 + (i - 5) * 1.65, 7, -35.8);
    group.add(bar);
    return bar;
  });

  let time = 0;
  return {
    group,
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
        if (tag) tag.sprite.visible = gap < (guest.dj ? 49 : 25);
      }
      bars.forEach((bar, i) => { bar.scale.y = (reduced ? 2 : 2 + Math.sin(time * 4.3 + i * 1.47)) + i % 3; });
    },
    dispose() {
      geometries.forEach(geometry => geometry.dispose());
      lightMaterials.forEach(light => light.dispose());
      guests.forEach(guest => guest.tag?.dispose());
    },
  };
}
