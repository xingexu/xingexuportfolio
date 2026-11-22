import { AVATAR_VOXEL_SIZE, buildAvatar } from "./avatar";
import type { Placement } from "./data";
import { WESTERN_PILLOW } from "./models";
import { AVATAR_SCALE, placementBox, type Vec } from "./world";

export const BED_SLEEP_DURATION = 0.85;
const ease = (u: number) => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); };
const restPitch = -Math.PI / 2 + 0.22;
const sleeper = buildAvatar(18, "western"), head = sleeper.head.bounds();
const headJointY = sleeper.shoulder + 2;
const headCenterY = headJointY + AVATAR_VOXEL_SIZE * (head.minY + head.maxY + 1) / 2;
const headBottomY = headJointY + head.minY * AVATAR_VOXEL_SIZE;
const headBackZ = head.minZ * AVATAR_VOXEL_SIZE;
const pillowZ = WESTERN_PILLOW.z + WESTERN_PILLOW.depth / 2 + 0.5;
const feetOffset = pillowZ - headCenterY * AVATAR_SCALE * Math.sin(restPitch);
const pillowTop = WESTERN_PILLOW.y + WESTERN_PILLOW.height;
const restHeight = pillowTop - 0.3 - AVATAR_SCALE * (headBottomY * Math.cos(restPitch) - headBackZ * Math.sin(restPitch));

export function bedsidePosition(bed: Placement, player: Vec) {
  const box = placementBox(bed);
  const gap = Math.max(box.minX - player.x, player.x - box.maxX);
  const alongSide = gap >= 0 && gap <= 6 && player.z >= bed.z - 4 && player.z <= box.maxZ;
  const atFoot = player.x >= box.minX && player.x <= box.maxX && player.z >= box.maxZ && player.z <= box.maxZ + 6;
  return alongSide || atFoot ? { x: player.x, z: player.z } : null;
}

export function sampleBedSleep(bed: Placement, start: Vec, progress: number, time: number, reduced: boolean) {
  const slide = ease((progress - 0.2) / 0.8), lie = ease((progress - 0.24) / 0.76);
  const lift = ease(progress / 0.48), breath = reduced ? 0 : Math.sin(time * 2.2) * 0.09 * lie;
  return {
    x: start.x + (bed.x - start.x) * slide,
    z: start.z + (bed.z + feetOffset - start.z) * slide,
    y: lift * ((bed.y ?? 0) + restHeight) + breath,
    pitch: restPitch * lie,
    lie,
    turn: ease(progress / 0.24),
    tuck: Math.sin(Math.PI * progress),
  };
}
