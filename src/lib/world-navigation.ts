import type { Point } from "./life-world";

export function createWorldNavigator(world: { width: number; height: number }, walkable: (point: Point) => boolean) {
// Cached distance fields route the hint around walls and furniture, even if
// someone wanders away. Each destination is searched once, not every frame.
const CELL = 8, COLS = Math.ceil(world.width / CELL), ROWS = Math.ceil(world.height / CELL);
let floor: Uint8Array | undefined;
const fields = new Map<string, Int16Array>();
const pointAt = (index: number) => ({ x: index % COLS * CELL, y: Math.floor(index / COLS) * CELL });
function floorGrid() {
  if (!floor) {
    floor = new Uint8Array(COLS * ROWS);
    for (let i = 0; i < floor.length; i++) floor[i] = Number(walkable(pointAt(i)));
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
    if (grid[i] && d < distance && walkable({ x: (point.x + p.x) / 2, y: (point.y + p.y) / 2 })) { best = i; distance = d; }
  }
  return best;
}
function nextWaypoint(player: Point, destination: Point): Point {
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
        if (!walkable({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })) continue;
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

  return nextWaypoint;
}
