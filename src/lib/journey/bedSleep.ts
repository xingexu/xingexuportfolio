import type { Placement } from "./data";
import { placementBox, type Vec } from "./world";

export const BED_SLEEP_DURATION = 0.85;
const ease = (u: number) => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); };

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
    z: start.z + (bed.z + 9 - start.z) * slide,
    y: lift * 12 + breath,
    pitch: -Math.PI / 2 * lie,
    lie,
    turn: ease(progress / 0.24),
    tuck: Math.sin(Math.PI * progress),
  };
}
