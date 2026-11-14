import { AIRPORT_EXIT, canWalk, START, WORLD, type Point } from "./life-world";
import { createWorldNavigator } from "./world-navigation";

export type AirportProgress = { leftPlane: boolean; terminal: boolean; baggage: boolean; meeting: boolean };
export type AirportGuide = {
  id: string; step: number; total?: number; title: string; hint: string; touchHint: string;
  arrow: string; target: Point | null; waypoint: Point | null;
};
export const emptyAirportProgress = (): AirportProgress => ({ leftPlane: false, terminal: false, baggage: false, meeting: false });
export function recordAirportProgress(progress: AirportProgress, player: Point) {
  if (player.y >= 605) progress.leftPlane = true;
  if (player.y < 350 && player.x > 62 && player.x < 1218) {
    progress.terminal = true;
    if (Math.hypot(player.x - 340, player.y - 280) < 70) progress.baggage = true;
    if (Math.hypot(player.x - 1120, player.y - 290) < 60) progress.meeting = true;
  }
}

export const nextAirportWaypoint = createWorldNavigator(WORLD, canWalk);

export function getAirportGuide(player: Point, progress: AirportProgress, readArrival: boolean): AirportGuide {
  let id: string, step: number, title: string, hint: string, touchHint: string, target: Point | null;
  if (!progress.leftPlane) {
    id = "stairs"; step = 1; title = "Step off the plane";
    hint = "Hold S or ↓ to walk down the stairs."; touchHint = "Hold the ↓ control to walk down the stairs.";
    target = { x: START.x, y: 617 };
  } else {
    id = "exit"; step = 2; title = "Walk to the terminal exit";
    hint = "Follow the yellow path right, then up. The doors take you straight to my room.";
    target = AIRPORT_EXIT;
    if (!readArrival && Math.hypot(player.x - 365, player.y - 625) < 48) hint += " The memory is optional.";
    touchHint = hint;
  }
  // The first arrival leg follows the painted yellow path, rather than asking
  // a new visitor to turn back toward the plane for a slightly shorter route.
  const routingTarget = id === "exit" && player.y > 395 && Math.abs(player.x - 650) > 12 ? { x: 650, y: 628 } : target;
  const waypoint = routingTarget ? nextAirportWaypoint(player, routingTarget) : null;
  const dx = waypoint ? waypoint.x - player.x : 0, dy = waypoint ? waypoint.y - player.y : 0;
  const arrow = !waypoint ? "✓" : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "→" : "←") : (dy > 0 ? "↓" : "↑");
  return { id, step, total: 2, title, hint, touchHint, target, waypoint, arrow };
}
