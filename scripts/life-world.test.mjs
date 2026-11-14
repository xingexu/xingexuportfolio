import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Run the actual TypeScript modules without adding a test-runner dependency.
const cache = new Map();
function load(file) {
  const full = path.resolve(__dirname, '..', file);
  if (cache.has(full)) return cache.get(full);
  const result = { exports: {} };
  cache.set(full, result.exports);
  const js = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const localRequire = (id) => load(path.relative(path.resolve(__dirname, '..'), id.startsWith('@/') ? path.resolve(__dirname, '../src', id.slice(2) + '.ts') : path.resolve(path.dirname(full), id + '.ts')));
  new Function('require', 'module', 'exports', js)(localRequire, result, result.exports);
  return result.exports;
}
const { advanceWalker, canWalk, airportPlace, atAirportExit, closestStory, AIRPORT_PLACES, START, WORLD } = load('src/lib/life-world.ts');
const { LIFE_STORIES } = load('src/lib/life-stories.ts');
const { emptyAirportProgress, recordAirportProgress, getAirportGuide, nextAirportWaypoint } = load('src/lib/airport-guide.ts');
const airportStories = LIFE_STORIES.filter(s => (s.chapter ?? 'airport') === 'airport');
const { HOME_START, HOME_CHESS, HOME_OBSTACLES, canWalkHome, atHomeReturn, getHomeGuide } = load('src/lib/home-world.ts');
const { chessPieceAt } = load('src/lib/pixel-chess.ts');
const walker = () => ({ ...START, direction: 'down', distance: 0, moving: false, growth: 0 });

test('the arrival memory and every airport area are reachable on foot', () => {
  const step = 3;
  const key = (x, y) => `${x},${y}`;
  const queue = [{ ...START }], seen = new Set([key(START.x, START.y)]);
  const found = new Set();
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const story of [...airportStories, ...AIRPORT_PLACES]) if (Math.hypot(p.x - story.x, p.y - story.y) < 20) found.add(story.id);
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const next = { x: p.x + dx, y: p.y + dy }, id = key(next.x, next.y);
      if (next.x < 0 || next.y < 0 || next.x > WORLD.width || next.y > WORLD.height || seen.has(id) || !canWalk(next)) continue;
      seen.add(id); queue.push(next);
    }
  }
  assert.deepEqual([...found].sort(), [...airportStories, ...AIRPORT_PLACES].map(s => s.id).sort());
});
test('diagonal movement has the same speed, and opposite directions cancel', () => {
  const straight = walker(), diagonal = walker(), opposed = walker();
  advanceWalker(straight, new Set(['right']), .02);
  advanceWalker(diagonal, new Set(['right', 'down']), .02);
  advanceWalker(opposed, new Set(['left', 'right']), .02);
  assert.ok(Math.abs(straight.distance - diagonal.distance) < .0001);
  assert.equal(opposed.distance, 0);
});
test('aircraft, glass walls, carousel and perimeter remain solid', () => {
  const p = walker();
  for (let i = 0; i < 300; i++) advanceWalker(p, new Set(['up']), 1 / 60);
  assert.ok(p.y > 539 && p.y < START.y);
  assert.ok(canWalk(p));
  assert.equal(canWalk({ x: 350, y: 370 }), false);
  assert.equal(canWalk({ x: 650, y: 370 }), true);
  assert.equal(canWalk({ x: 350, y: 190 }), false);
  assert.equal(canWalk({ x: 10, y: 600 }), false);
});
test('the player can walk off the stairs, follow the path and enter arrivals', () => {
  const p = walker();
  for (let i = 0; i < 45; i++) advanceWalker(p, new Set(['down']), 1 / 60);
  assert.ok(p.y > 620);
  for (let i = 0; i < 224; i++) advanceWalker(p, new Set(['right']), 1 / 60);
  assert.ok(p.x > 640 && p.x < 670);
  for (let i = 0; i < 210; i++) advanceWalker(p, new Set(['up']), 1 / 60);
  assert.ok(p.y < 360);
  assert.equal(airportPlace(p).id, 'entrance');
  assert.equal(p.growth, 0);
});
test('the child stays six everywhere, including after a legacy growth value', () => {
  const p = { ...walker(), growth: 1 };
  for (const area of AIRPORT_PLACES) {
    p.x = area.x; p.y = area.y;
    advanceWalker(p, new Set(), .02);
    assert.equal(p.growth, 0);
  }
  assert.deepEqual(LIFE_STORIES.map(s => s.id), ['arrival', 'first-home']);
});

test('acceleration is frame-rate independent and releasing input stops without drift', () => {
  const positions = [30, 60, 120].map(rate => {
    const p = { ...walker(), x: 700, y: 600 };
    for (let i = 0; i < rate; i++) advanceWalker(p, new Set(['right']), 1 / rate);
    const stopped = { x: p.x, y: p.y };
    for (let i = 0; i < 30; i++) advanceWalker(p, new Set(), 1 / 60);
    assert.deepEqual({ x: p.x, y: p.y }, stopped);
    assert.equal(p.moving, false);
    return p.x;
  });
  assert.ok(Math.max(...positions) - Math.min(...positions) < .00001);
});

test('the airport guide leads through every step to the exit for the next chapter', () => {
  const p = walker(), progress = emptyAirportProgress(), stages = new Set();
  let readArrival = false, complete = false;
  for (let frame = 0; frame < 6000; frame++) {
    recordAirportProgress(progress, p);
    const guide = getAirportGuide(p, progress, readArrival);
    stages.add(guide.id);
    assert.ok(guide.hint.length > 0 && guide.touchHint.length > 0);
    if (atAirportExit(p)) { complete = true; assert.equal(guide.id, 'exit'); break; }
    if (guide.id === 'memory' && Math.hypot(p.x - LIFE_STORIES[0].x, p.y - LIFE_STORIES[0].y) <= 48) readArrival = true;
    const direction = { '↑': 'up', '↓': 'down', '←': 'left', '→': 'right' }[guide.arrow];
    assert.ok(canWalk(guide.waypoint));
    advanceWalker(p, new Set([direction]), 1 / 60);
  }
  assert.equal(complete, true, `Guide stopped near ${p.x}, ${p.y}`);
  assert.deepEqual([...stages], ['stairs', 'memory', 'arrivals', 'baggage', 'meeting', 'exit']);
});

test('off-route guidance can lead back around airport obstacles to the memory', () => {
  for (const location of [{ x: 1120, y: 290 }, { x: 820, y: 120 }, { x: 160, y: 320 }]) {
    const p = { ...walker(), ...location }, destination = LIFE_STORIES[0];
    assert.ok(canWalk(p));
    let arrived = false;
    for (let frame = 0; frame < 6000; frame++) {
      if (Math.hypot(p.x - destination.x, p.y - destination.y) < 30) { arrived = true; break; }
      const waypoint = nextAirportWaypoint(p, destination);
      const dx = waypoint.x - p.x, dy = waypoint.y - p.y;
      const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      advanceWalker(p, new Set([direction]), 1 / 60);
    }
    assert.equal(arrived, true, `Could not return from ${location.x}, ${location.y}; stopped at ${p.x}, ${p.y}`);
  }
});

test('the first-home guide reaches the chessboard through the front door', () => {
  const p = { ...walker(), ...HOME_START }, stages = new Set();
  let entered = false, read = false, complete = false;
  for (let frame = 0; frame < 2000; frame++) {
    entered ||= p.y < 525;
    const guide = getHomeGuide(p, entered, read); stages.add(guide.id);
    if (guide.id === 'home-complete') { complete = true; break; }
    assert.ok(canWalkHome(guide.waypoint));
    if (entered && Math.hypot(p.x - HOME_CHESS.x, p.y - HOME_CHESS.y) <= 48) read = true;
    const direction = { '↑': 'up', '↓': 'down', '←': 'left', '→': 'right' }[guide.arrow];
    advanceWalker(p, new Set([direction]), 1 / 60, canWalkHome);
    assert.ok(canWalkHome(p)); assert.equal(p.growth, 0);
  }
  assert.equal(complete, true, `Stopped at ${p.x}, ${p.y}`);
  assert.deepEqual([...stages], ['home-door', 'home-chess', 'home-complete']);
});

test('home furniture is solid and both chapter gates have reachable thresholds', () => {
  for (const obstacle of HOME_OBSTACLES) assert.equal(canWalkHome({ x: obstacle.x + obstacle.w / 2, y: obstacle.y + obstacle.h / 2 }), false);
  assert.ok(canWalkHome({ x: 500, y: 540 }));
  assert.equal(canWalkHome({ x: 450, y: 540 }), false);
  assert.ok(atAirportExit({ x: 1240, y: 286 }) && canWalk({ x: 1240, y: 286 }));
  assert.equal(atAirportExit({ x: 1240, y: 600 }), false);
  assert.ok(atHomeReturn({ x: 500, y: 650 }) && canWalkHome({ x: 500, y: 650 }));
  assert.equal(atHomeReturn(HOME_START), false);
});

test('memories belong to their own chapter, and the chessboard starts correctly', () => {
  assert.equal(closestStory(HOME_CHESS, 'holsworthy').id, 'first-home');
  assert.equal(closestStory(HOME_CHESS, 'airport').id, 'arrival');
  const pieces = Array.from({ length: 64 }, (_, i) => chessPieceAt(Math.floor(i / 8), i % 8)).filter(Boolean);
  assert.equal(pieces.length, 32);
  assert.equal(pieces.filter(p => p.white).length, 16);
  assert.deepEqual(chessPieceAt(7, 4), { piece: 'k', white: true });
  assert.deepEqual(chessPieceAt(0, 3), { piece: 'q', white: false });
  assert.equal(chessPieceAt(4, 4), null);
});
