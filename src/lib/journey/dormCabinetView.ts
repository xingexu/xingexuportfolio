import type { Group, Mesh } from "three";
import type { Placement } from "./data";
import { buildDormCabinetParts } from "./models";
import { placementPoint } from "./roommate";
import type { Ball, BallBlock } from "./volleyball";
import { boxDistance, type Vec } from "./world";
import type { Grid } from "./voxel";

const EXTENSION = 4.25;

export function makeDormCabinetView(placement: Placement, holder: Group, meshFor: (grid: Grid) => Mesh) {
  const { shell, drawers } = buildDormCabinetParts();
  const slides = drawers.map(meshFor);
  holder.add(meshFor(shell), ...slides);
  let open = false, amount = 0;

  function drawerBox(extension: number) {
    const a = placementPoint(placement, -4, 8), b = placementPoint(placement, 4, 8 + extension);
    return { minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z) };
  }
  const reach = (i: number, at: number) => at * (EXTENSION - 0.75 * i);
  const ballBlocks: BallBlock[] = slides.map((_, i) => {
    const bottom = (placement.y ?? 0) + 1 + i * 5;
    return { ...drawerBox(0), bottom, top: bottom + 4 };
  });
  const drawerDistance = (point: Vec, at: number) => boxDistance(drawerBox(EXTENSION * at), point);

  return {
    ballBlocks,
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
    update(dt: number, reduced: boolean, player: Vec, radius: number, roommate?: Vec, roommateRadius = 0, balls: readonly Ball[] = []) {
      const step = reduced ? 1 : dt / 0.32;
      const next = open ? Math.min(1, amount + step) : Math.max(0, amount - step);
      if (next === amount || (next > amount && (drawerDistance(player, next) < radius ||
        (roommate && drawerDistance(roommate, next) < roommateRadius) ||
        ballBlocks.some(({ bottom, top }, i) => balls.some(ball => ball.y + ball.radius > bottom &&
          ball.y - ball.radius < top && boxDistance(drawerBox(reach(i, next)), ball) < ball.radius))))) return false;
      amount = next;
      slides.forEach((drawer, i) => {
        drawer.position.z = reach(i, amount);
        Object.assign(ballBlocks[i], drawerBox(drawer.position.z));
      });
      return true;
    },
  };
}
