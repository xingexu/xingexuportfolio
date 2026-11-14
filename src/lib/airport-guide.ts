import { AIRPORT_EXIT, canWalk, START, WORLD, type Point } from "./life-world";
import { LIFE_STORIES } from "./life-stories";
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
  const memory = LIFE_STORIES[0];
  let id: string, step: number, title: string, hint: string, touchHint: string, target: Point | null;
  if (!progress.leftPlane) {
    id = "stairs"; step = 1; title = "Step off the plane";
    hint = "Hold S or ↓ to walk down the stairs."; touchHint = "Hold the ↓ control to walk down the stairs.";
    target = { x: START.x, y: 617 };
  } else if (!readArrival) {
    id = "memory"; step = 2; title = "Read your first memory"; target = { x: memory.x, y: memory.y };
    const nearby = Math.hypot(player.x - target.x, player.y - target.y) <= 48;
    hint = nearby ? "Press E or select Read memory below." : "Follow the arrow back to the gold sparkle by the stairs.";
    touchHint = nearby ? "Tap Read memory below to meet six-year-old me." : hint;
  } else if (!progress.terminal) {
    id = "arrivals"; step = 3; title = "Find the arrivals entrance";
    hint = "Follow the arrow to the doors at the end of the yellow path."; touchHint = hint;
    target = { x: 650, y: 335 };
  } else if (!progress.baggage) {
    id = "baggage"; step = 4; title = "Explore baggage claim";
    hint = "Follow the arrow to the luggage carousel on the left side of the hall."; touchHint = hint;
    target = { x: 340, y: 280 };
  } else if (!progress.meeting) {
    id = "meeting"; step = 5; title = "Find the meeting point";
    hint = "Follow the arrow through the hall, past the seats to the meeting point."; touchHint = hint;
    target = { x: 1120, y: 290 };
  } else {
    id = "exit"; step = 6; title = "Next stop: Holsworthy";
    hint = "Walk right through the airport exit to visit my first home in Markham."; touchHint = hint; target = AIRPORT_EXIT;
  }
  // The first arrival leg follows the painted yellow path, rather than asking
  // a new visitor to turn back toward the plane for a slightly shorter route.
  const routingTarget = id === "arrivals" && player.y > 395 && Math.abs(player.x - 650) > 12 ? { x: 650, y: 628 } : target;
  const waypoint = routingTarget ? nextAirportWaypoint(player, routingTarget) : null;
  const dx = waypoint ? waypoint.x - player.x : 0, dy = waypoint ? waypoint.y - player.y : 0;
  const arrow = !waypoint ? "✓" : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "→" : "←") : (dy > 0 ? "↓" : "↑");
  return { id, step, total: 6, title, hint, touchHint, target, waypoint, arrow };
}
