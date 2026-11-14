import { canWalk, START, WORLD, type Point } from "./life-world";
import { LIFE_STORIES } from "./life-stories";

export type AirportProgress = { leftPlane: boolean; terminal: boolean; baggage: boolean; meeting: boolean };
export type AirportGuide = {
  id: string; step: number; title: string; hint: string; touchHint: string;
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

// Cached distance fields route the hint around walls and furniture, even if
// someone wanders away. Each destination is searched once, not every frame.
const CELL = 8, COLS = Math.ceil(WORLD.width / CELL), ROWS = Math.ceil(WORLD.height / CELL);
let floor: Uint8Array | undefined;
const fields = new Map<string, Int16Array>();
const pointAt = (index: number) => ({ x: index % COLS * CELL, y: Math.floor(index / COLS) * CELL });
function floorGrid() {
  if (!floor) {
    floor = new Uint8Array(COLS * ROWS);
    for (let i = 0; i < floor.length; i++) floor[i] = Number(canWalk(pointAt(i)));
  }
  return floor;
}
function neighbours(index: number) {
  const x = index % COLS, y = Math.floor(index / COLS);
  return [y > 0 ? index - COLS : -1, x < COLS - 1 ? index + 1 : -1, y < ROWS - 1 ? index + COLS : -1, x > 0 ? index - 1 : -1].filter(i => i >= 0);
}
function nearestCell(point: Point) {
  const grid = floorGrid(), cx = Math.round(point.x / CELL), cy = Math.round(point.y / CELL);
  let best = -1, distance = Infinity;
  for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
    const i = y * COLS + x, p = pointAt(i), d = Math.hypot(point.x - p.x, point.y - p.y);
    if (grid[i] && d < distance && canWalk({ x: (point.x + p.x) / 2, y: (point.y + p.y) / 2 })) { best = i; distance = d; }
  }
  return best;
}
export function nextAirportWaypoint(player: Point, destination: Point): Point {
  const goal = nearestCell(destination), start = nearestCell(player), grid = floorGrid();
  if (goal < 0 || start < 0) return destination;
  const key = String(goal);
  let field = fields.get(key);
  if (!field) {
    field = new Int16Array(grid.length).fill(-1);
    const queue = new Int32Array(grid.length); let count = 1;
    queue[0] = goal; field[goal] = 0;
    for (let cursor = 0; cursor < count; cursor++) {
      const current = queue[cursor], a = pointAt(current);
      for (const next of neighbours(current)) {
        if (!grid[next] || field[next] >= 0) continue;
        const b = pointAt(next);
        if (!canWalk({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })) continue;
        field[next] = field[current] + 1; queue[count++] = next;
      }
    }
    fields.set(key, field);
  }
  if (field[start] <= 0) return destination;
  let cursor = start, direction = 0;
  // Aim at the next corner, rather than changing the arrow at every tile.
  for (let i = 0; i < 18; i++) {
    const next = neighbours(cursor).find(n => field![n] >= 0 && field![n] < field![cursor]);
    if (next === undefined || (direction && next - cursor !== direction)) break;
    direction = next - cursor; cursor = next;
    if (cursor === goal) return destination;
  }
  return pointAt(cursor);
}

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
    id = "complete"; step = 5; title = "Welcome to Canada. You made it.";
    hint = "That’s this chapter. Explore freely, revisit the memory on the map, or head home."; touchHint = hint; target = null;
  }
  // The first arrival leg follows the painted yellow path, rather than asking
  // a new visitor to turn back toward the plane for a slightly shorter route.
  const routingTarget = id === "arrivals" && player.y > 395 && Math.abs(player.x - 650) > 12 ? { x: 650, y: 628 } : target;
  const waypoint = routingTarget ? nextAirportWaypoint(player, routingTarget) : null;
  const dx = waypoint ? waypoint.x - player.x : 0, dy = waypoint ? waypoint.y - player.y : 0;
  const arrow = !waypoint ? "✓" : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "→" : "←") : (dy > 0 ? "↓" : "↑");
  return { id, step, title, hint, touchHint, target, waypoint, arrow };
}
