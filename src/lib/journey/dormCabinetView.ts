import type { Group, Mesh } from "three";
import type { Placement } from "./data";
import { buildDormCabinetParts } from "./models";
import { placementPoint } from "./roommate";
import { boxDistance, type Vec } from "./world";
import type { Grid } from "./voxel";

const EXTENSION = 4.25;

export function makeDormCabinetView(placement: Placement, holder: Group, meshFor: (grid: Grid) => Mesh) {
  const { shell, drawers } = buildDormCabinetParts();
  const slides = drawers.map(meshFor);
  holder.add(meshFor(shell), ...slides);
  let open = false, amount = 0;

  function drawerDistance(point: Vec, at: number) {
    const a = placementPoint(placement, -4, 6), b = placementPoint(placement, 4, 8 + EXTENSION * at);
    return boxDistance({ minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z) }, point);
  }

  return {
    get open() { return open; },
    toggle() { open = !open; },
    near(point: Vec) {
      const center = placementPoint(placement, 0, 8), front = placementPoint(placement, 0, 9);
      const dx = point.x - center.x, dz = point.z - center.z, fx = front.x - center.x, fz = front.z - center.z;
      const ahead = dx * fx + dz * fz;
      return ahead >= 0 && ahead <= EXTENSION * amount + 7 && Math.abs(dx * fz - dz * fx) <= 3.5;
    },
    blocks(point: Vec, radius: number) { return amount > 0 && drawerDistance(point, amount) < radius; },
    blocksMove(from: Vec, to: Vec, radius: number) {
      if (amount === 0) return false;
      const distance = drawerDistance(to, amount);
      return distance < radius && distance < drawerDistance(from, amount);
    },
    update(dt: number, reduced: boolean, player: Vec, radius: number, roommate?: Vec, roommateRadius = 0) {
      const step = reduced ? 1 : dt / 0.32;
      const next = open ? Math.min(1, amount + step) : Math.max(0, amount - step);
      if (next === amount || (next > amount && (drawerDistance(player, next) < radius ||
        (roommate && drawerDistance(roommate, next) < roommateRadius)))) return false;
      amount = next;
      slides.forEach((drawer, i) => { drawer.position.z = amount * (EXTENSION - 0.75 * i); });
      return true;
    },
  };
}
