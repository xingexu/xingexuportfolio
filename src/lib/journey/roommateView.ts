import { Box3, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { AVATAR_VOXEL_SIZE } from "./avatar";
import type { Placement, Roommate } from "./data";
import {
  buildFridgeCabinet, buildFridgeDoor, buildHockeyStick, buildMilkCarton, buildRoommate, buildRoommateRoutine,
  easeRoommate, fridgeDoorDistance, FRIDGE_HANDLE, FRIDGE_HINGE, FRIDGE_MILK, FRIDGE_SWING, FRIDGE_VOXEL_SIZE,
  RANGERS_CREST_VOXEL_SIZE, ROOMMATE_RADIUS, ROOMMATE_SEAT, sampleRoommate, type RoommatePose,
} from "./roommate";
import { AVATAR_SCALE, type Vec } from "./world";
import type { BallBlock } from "./volleyball";
import { Grid } from "./voxel";

type VoxelMesh = (grid: Grid, size: number, material?: MeshBasicMaterial) => Mesh;
const SIZE = AVATAR_VOXEL_SIZE * AVATAR_SCALE;
const STICK_SIZE = 0.31, PAD_HEIGHT = 0.5;
const DOWN = new Vector3(0, -1, 0);
const point = ({ x, y, z }: { x: number; y: number; z: number }) => new Vector3(x, y, z);

function split(grid: Grid, hinge: number, centerX = 0) {
  const top = new Grid(), bottom = new Grid();
  grid.forEach((x, y, z, color) => {
    if (y >= hinge) top.set(x - centerX, y, z, color);
    else bottom.set(x - centerX, y - hinge, z, color);
  });
  return { top, bottom };
}

function aimArm(upper: Group, lower: Group, hand: Vector3, a: number, b: number, side: number) {
  const along = hand.clone().sub(upper.position);
  const reach = Math.max(Math.abs(a - b) + 0.015, Math.min(a + b - 0.015, along.length()));
  along.normalize();
  const pole = new Vector3(side * 0.8, -0.35, -0.8);
  pole.addScaledVector(along, -pole.dot(along)).normalize();
  const d = (a * a - b * b + reach * reach) / (2 * reach);
  lower.position.copy(upper.position).addScaledVector(along, d).addScaledVector(pole, Math.sqrt(Math.max(0, a * a - d * d)));
  hand.copy(upper.position).addScaledVector(along, reach);
  upper.quaternion.setFromUnitVectors(DOWN, lower.position.clone().sub(upper.position).normalize());
  lower.quaternion.setFromUnitVectors(DOWN, hand.clone().sub(lower.position).normalize());
}

export function makeRoommateView(spec: Roommate, fridge: Placement, pad: Placement, fridgeHolder: Group, fridgeMaterial: MeshBasicMaterial, material: MeshBasicMaterial, makeMesh: VoxelMesh) {
  const group = new Group(), holder = new Group();
  group.add(holder);
  const parts = buildRoommate();
  const mesh = (grid: Grid, size = SIZE) => makeMesh(grid, size, material);
  const torso = mesh(parts.torso), head = mesh(parts.head), crest = mesh(parts.crest, RANGERS_CREST_VOXEL_SIZE);
  crest.position.set(0, 3.6, (parts.torso.bounds().maxZ + 1) * SIZE);
  torso.add(crest);
  holder.add(torso, head);

  const arms = [parts.armL, parts.armR].map((grid, i) => {
    const side = i ? 1 : -1, bottom = grid.bounds().minY, hinge = Math.round(bottom / 2);
    const upper = new Group(), lower = new Group();
    const { top, bottom: forearm } = split(grid, hinge, side * 2);
    upper.add(mesh(top)); lower.add(mesh(forearm));
    upper.position.x = side * (parts.shoulderX + 1) * AVATAR_SCALE;
    holder.add(upper, lower);
    return { upper, lower, side, a: -hinge * SIZE, b: (hinge - bottom - 1.5) * SIZE };
  });
  const kneeHeight = 13 * SIZE, legLength = parts.hip * AVATAR_SCALE;
  const legs = [parts.legL, parts.legR].map(grid => {
    const hip = new Group(), knee = new Group();
    const { top, bottom } = split(grid, -13);
    hip.add(mesh(top), knee); knee.position.y = -kneeHeight;
    knee.add(mesh(bottom));
    holder.add(hip);
    return { hip, knee };
  });

  const box = new Grid(), leaf = new Grid(), hinge = new Group();
  buildFridgeCabinet(box); buildFridgeDoor(leaf);
  fridgeHolder.clear();
  hinge.name = "Fridge door";
  fridgeHolder.add(makeMesh(box, FRIDGE_VOXEL_SIZE, fridgeMaterial), hinge);
  hinge.position.copy(point(FRIDGE_HINGE));
  hinge.add(makeMesh(leaf, FRIDGE_VOXEL_SIZE, fridgeMaterial));
  const milk = makeMesh(buildMilkCarton(), 0.35);
  const stick = makeMesh(buildHockeyStick(), STICK_SIZE);
  const puckGrid = new Grid().box(-2, 0, -1, 4, 1, 2, 0x202534).box(-1, 0, -2, 2, 1, 4, 0x293043);
  const puck = makeMesh(puckGrid, 0.34);
  milk.name = "Milk carton"; stick.name = "Hockey stick"; puck.name = "Puck";
  const stand = makeMesh(new Grid().box(-2, 0, -2, 4, 2, 4, 0x617589).box(-1, 1, -1, 2, 1, 2, -1), 0.32);
  const padYaw = (pad.rot ?? 0) * Math.PI / 2;
  const padAxis = new Vector3(0, 1, 0), restPuck = new Vector3(4.4, PAD_HEIGHT, 0.3).applyAxisAngle(padAxis, padYaw);
  restPuck.add(new Vector3(pad.x, 0, pad.z));
  stand.position.set(pad.x + Math.cos(padYaw) * 2.5, PAD_HEIGHT, pad.z - Math.sin(padYaw) * 2.5);
  group.add(milk, stick, puck, stand);
  const routine = buildRoommateRoutine(spec, fridge, pad);
  const bounds = new Box3();
  const ballBlock: BallBlock = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, bottom: 0, top: 0 };

  function apply(pose: RoommatePose, yaw: number) {
    const { action, u, sit, stride, door, heldMilk } = pose;
    const padLocal = new Vector3(pose.x - pad.x, 0, pose.z - pad.z).applyAxisAngle(padAxis, -padYaw);
    const floor = PAD_HEIGHT * easeRoommate(Math.min(13 - Math.abs(padLocal.x), 10 - Math.abs(padLocal.z)));
    holder.position.set(pose.x, floor, pose.z);
    holder.rotation.y = yaw;
    hinge.rotation.y = door * FRIDGE_SWING;
    const hockey = action === "grab" ? easeRoommate(u) : action === "rack" ? 1 - easeRoommate(u) : Number(action === "practice");
    const lean = action === "open" || action === "reopen" ? easeRoommate(u / 0.3) :
      action === "close" || action === "shut" ? 1 - easeRoommate((u - 0.8) / 0.2) :
      Number(action === "take" || action === "replace");
    const turn = action === "practice" ? Math.sin(u * 6 * Math.PI) * Math.min(1, u * 16, (1 - u) * 16) : 0;
    const drink = action === "sip" ? easeRoommate(u / 0.27) * (1 - easeRoommate((u - 0.62) / 0.38)) : 0;
    const bend = sit * Math.PI / 2;
    const hipY = legLength + kneeHeight * (Math.cos(bend) - 1) + (ROOMMATE_SEAT - legLength + kneeHeight) * sit;
    const crouch = hockey * 0.45 + lean * 1.15;
    const pelvis = hipY + Math.abs(stride) * 0.28 - crouch;
    const shoulder = pelvis + (parts.shoulder + 1 - parts.hip) * AVATAR_SCALE;
    torso.position.y = pelvis;
    torso.rotation.x = hockey * 0.07 + lean * 0.15;
    head.position.set(0, shoulder + AVATAR_SCALE, hockey * 0.45 + lean * 1.22);
    head.rotation.x = hockey * 0.25 - drink * 0.12;
    legs.forEach(({ hip, knee }, i) => {
      hip.position.y = pelvis;
      hip.rotation.x = -bend + (i ? -stride : stride) * 0.52 - hockey * 0.16 - lean * 0.41;
      knee.rotation.x = bend + Math.max(0, (i ? stride : -stride) * 0.32) + hockey * 0.25 + lean * 0.89;
    });

    const shelf = fridgeHolder.localToWorld(point(FRIDGE_MILK));
    const handle = hinge.localToWorld(point(FRIDGE_HANDLE));
    const rack = stand.position.clone();
    const roll = turn * 0.33, pitch = -0.13 * hockey;
    const grip = new Vector3(0.2 + 1.05 * turn, 0.65 + 36 * STICK_SIZE * Math.cos(roll) * Math.cos(pitch) - floor, 2.6);
    const stickWorld = holder.localToWorld(grip.clone());
    rack.y = 0.65 + 36 * STICK_SIZE;
    stick.position.copy(rack.lerp(stickWorld, hockey));
    stick.rotation.set(pitch, padYaw, roll, "YXZ");
    const blade = stick.localToWorld(new Vector3(7 * STICK_SIZE, -35 * STICK_SIZE, 0.86));
    const lowerGrip = stick.localToWorld(new Vector3(0, -0.35, -0.18));
    puck.position.copy(restPuck).lerp(blade, hockey);
    puck.position.y = PAD_HEIGHT;

    const palms = arms.map(({ upper, lower, side, a, b }) => {
      upper.position.setY(shoulder).setZ(lean * 1.22);
      const swing = side * stride * 0.48;
      const reach = a + b - (sit ? 1.1 : 0.15);
      const hand = new Vector3(upper.position.x, shoulder - Math.cos(swing) * reach, upper.position.z + Math.sin(swing) * reach + sit * 1.9);
      if (side < 0) {
        const handleReach = action === "open" || action === "reopen" ? easeRoommate(u / 0.3) :
          action === "take" ? 1 - easeRoommate(u / 0.23) :
          action === "close" || action === "shut" ? easeRoommate(u / 0.22) * (1 - easeRoommate((u - 0.8) / 0.2)) : 0;
        hand.lerp(holder.worldToLocal(handle.clone()), handleReach);
      } else {
        const carry = new Vector3(3.2, 12.1, 2.9);
        if (action === "take" || action === "replace") {
          const touch = action === "take" ? 0.45 : 0.55;
          if (heldMilk) hand.copy(carry);
          const reachShelf = u < touch ? easeRoommate(u / touch) : 1 - easeRoommate((u - touch) / (1 - touch));
          hand.lerp(holder.worldToLocal(shelf.clone()), reachShelf);
        } else if (heldMilk) hand.copy(carry).lerp(new Vector3(0.95, 17.9, 4.1), drink);
      }
      if (hockey) {
        const target = holder.worldToLocal(side > 0 ? stick.position.clone() : lowerGrip.clone());
        hand.lerp(target, hockey);
      }
      aimArm(upper, lower, hand, a, b, side);
      return hand;
    });
    milk.position.copy(heldMilk ? holder.localToWorld(palms[1]) : shelf);
    milk.rotation.set(-drink * 1.04, heldMilk ? yaw : fridgeHolder.rotation.y, 0, "YXZ");
    bounds.setFromObject(holder);
    ballBlock.minX = bounds.min.x; ballBlock.maxX = bounds.max.x;
    ballBlock.minZ = bounds.min.z; ballBlock.maxZ = bounds.max.z;
    ballBlock.bottom = Math.max(0, bounds.min.y); ballBlock.top = bounds.max.y;
    return head.position.y + floor + (parts.head.bounds().maxY + 1) * SIZE + 2.5;
  }

  function blocks(from: Vec, to: Vec, radius: number, pose: RoommatePose) {
    const yaw = holder.rotation.y, offset = pose.sit * 2.4;
    const centerX = holder.position.x + offset * Math.sin(yaw), centerZ = holder.position.z + offset * Math.cos(yaw);
    const distance = (pos: Vec) => Math.hypot(pos.x - centerX, pos.z - centerZ);
    const nextDistance = distance(to);
    if (nextDistance < radius + ROOMMATE_RADIUS && nextDistance < distance(from)) return true;
    if (pose.door <= 0) return false;
    const nextDoor = fridgeDoorDistance(fridge, pose.door, to);
    return nextDoor < radius && nextDoor < fridgeDoorDistance(fridge, pose.door, from);
  }

  const pose = sampleRoommate(routine, 0);
  const markerY = apply(pose, pose.yaw);
  return { group, holder, id: spec.id, routine, pose, markerY, time: 0, yaw: pose.yaw, apply, blocks, bounds, ballBlock };
}
