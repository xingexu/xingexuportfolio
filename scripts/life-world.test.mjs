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
const { advanceWalker, canWalk, airportPlace, atAirportExit, closestStory, AIRPORT_PLACES, START, WORLD, AIRPORT_EXIT, AIRPORT_RETURN } = load('src/lib/life-world.ts');
const { LIFE_STORIES } = load('src/lib/life-stories.ts');
const { emptyAirportProgress, recordAirportProgress, getAirportGuide, nextAirportWaypoint } = load('src/lib/airport-guide.ts');
const airportStories = LIFE_STORIES.filter(s => (s.chapter ?? 'airport') === 'airport');
const { HOME_START, HOME_CHESS, HOME_OBSTACLES, canWalkHome, atHomeReturn, getHomeGuide, nextHomeWaypoint } = load('src/lib/home-world.ts');
const { ROOM_OBJECTS, roomObjectAt, nearbyRoomObject } = load('src/lib/room-objects.ts');
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
  assert.deepEqual(LIFE_STORIES.map(s => s.id), ['arrival', ...ROOM_OBJECTS.map(object => object.id)]);
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

test('the nearby terminal exit reaches the room in under ten seconds without reading a memory', () => {
  const p = walker(), progress = emptyAirportProgress(), stages = new Set();
  const readArrival = false; let complete = false;
  for (let frame = 0; frame < 600; frame++) {
    recordAirportProgress(progress, p);
    const guide = getAirportGuide(p, progress, readArrival);
    stages.add(guide.id);
    assert.ok(guide.hint.length > 0 && guide.touchHint.length > 0);
    if (atAirportExit(p)) { complete = true; assert.equal(guide.id, 'exit'); break; }
    const direction = { '↑': 'up', '↓': 'down', '←': 'left', '→': 'right' }[guide.arrow];
    assert.ok(canWalk(guide.waypoint));
    advanceWalker(p, new Set([direction]), 1 / 60);
  }
  assert.equal(complete, true, `Guide stopped near ${p.x}, ${p.y}`);
  assert.deepEqual([...stages], ['stairs', 'exit']);
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

test('arrival starts inside the bedroom and guides the child to the nearby chessboard', () => {
  const p = { ...walker(), ...HOME_START }, stages = new Set();
  let entered = false, read = false, complete = false;
  for (let frame = 0; frame < 180; frame++) {
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
  assert.deepEqual([...stages], ['home-explore', 'home-complete']);
});

test('home furniture is solid and both chapter gates have reachable thresholds', () => {
  for (const obstacle of HOME_OBSTACLES) assert.equal(canWalkHome({ x: obstacle.x + obstacle.w / 2, y: obstacle.y + obstacle.h / 2 }), false);
  assert.ok(canWalkHome({ x: 466, y: 540 }));
  assert.equal(canWalkHome({ x: 430, y: 540 }), false);
  assert.ok(atAirportExit(AIRPORT_EXIT) && canWalk(AIRPORT_EXIT));
  assert.equal(atAirportExit({ x: 1240, y: 600 }), false);
  assert.ok(atHomeReturn({ x: 466, y: 540 }) && canWalkHome({ x: 466, y: 540 }));
  assert.equal(atHomeReturn(HOME_START), false);
  assert.ok(canWalk(AIRPORT_RETURN));
  assert.equal(atAirportExit(AIRPORT_RETURN), false);
  assert.ok(canWalkHome(HOME_START));
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

test('the bedroom objects and return doorway remain reachable around the furniture', () => {
  for (const destination of [{ x: 466, y: 540 }, { x: 520, y: 408 }, { x: 690, y: 425 }, { x: 258, y: 343 }, { x: 290, y: 465 }]) {
    const p = { ...walker(), ...HOME_START };
    assert.ok(canWalkHome(destination));
    let arrived = false;
    for (let frame = 0; frame < 1200; frame++) {
      if (Math.hypot(p.x - destination.x, p.y - destination.y) < 10) { arrived = true; break; }
      const waypoint = nextHomeWaypoint(p, destination);
      const dx = waypoint.x - p.x, dy = waypoint.y - p.y;
      const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      advanceWalker(p, new Set([direction]), 1 / 60, canWalkHome);
      assert.ok(canWalkHome(p));
    }
    assert.equal(arrived, true, `Cannot reach ${JSON.stringify(destination)}; stopped at ${p.x}, ${p.y}`);
  }
});

test('every room object has its own reachable interaction and a precise pointer target', () => {
  const ids = new Set();
  for (const object of ROOM_OBJECTS) {
    ids.add(object.id);
    assert.ok(canWalkHome(object.position), `${object.label} has a blocked interaction spot`);
    assert.equal(nearbyRoomObject(object.position).id, object.id);
    const area = object.areas[0];
    assert.equal(roomObjectAt({ x: area.x + area.w/2, y: area.y + area.h/2 }).id, object.id);
    const p = { ...walker(), ...HOME_START };
    let arrived = false;
    for (let frame=0; frame<1800; frame++) {
      if (Math.hypot(p.x-object.position.x,p.y-object.position.y)<8) { arrived=true; break; }
      const waypoint = nextHomeWaypoint(p,object.position), dx=waypoint.x-p.x, dy=waypoint.y-p.y;
      const direction = Math.abs(dx)>Math.abs(dy) ? (dx>0?'right':'left') : (dy>0?'down':'up');
      advanceWalker(p,new Set([direction]),1/60,canWalkHome);
    }
    assert.ok(arrived, `${object.label} unreachable: ${p.x}, ${p.y}`);
  }
  assert.equal(ids.size, 8);
  assert.equal(roomObjectAt(HOME_START), null);
  assert.equal(nearbyRoomObject({ x: 466, y: 541 }), null);
});

test('viewing chess alone does not complete the room and guidance advances to unseen objects', () => {
  const seen = new Set(['first-home']);
  const guide = getHomeGuide(HOME_CHESS,true,true,seen);
  assert.equal(guide.id,'home-explore');
  assert.equal(guide.step,1);
  assert.equal(guide.total,8);
  assert.notDeepEqual(guide.target,HOME_CHESS);
  const complete = getHomeGuide(HOME_START,true,true,new Set(ROOM_OBJECTS.map(object=>object.id)));
  assert.equal(complete.id,'home-complete');
  assert.equal(complete.target,null);
  const hover = getHomeGuide(HOME_START,true,false,new Set(),'room-candy');
  assert.equal(hover.title,'View Candy');
});
