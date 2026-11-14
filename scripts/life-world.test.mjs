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
const { advanceWalker, canWalk, airportPlace, AIRPORT_PLACES, START, WORLD } = load('src/lib/life-world.ts');
const { LIFE_STORIES } = load('src/lib/life-stories.ts');
const walker = () => ({ ...START, direction: 'down', distance: 0, moving: false, growth: 0 });

test('the arrival memory and every airport area are reachable on foot', () => {
  const step = 3;
  const key = (x, y) => `${x},${y}`;
  const queue = [{ ...START }], seen = new Set([key(START.x, START.y)]);
  const found = new Set();
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const story of [...LIFE_STORIES, ...AIRPORT_PLACES]) if (Math.hypot(p.x - story.x, p.y - story.y) < 20) found.add(story.id);
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const next = { x: p.x + dx, y: p.y + dy }, id = key(next.x, next.y);
      if (next.x < 0 || next.y < 0 || next.x > WORLD.width || next.y > WORLD.height || seen.has(id) || !canWalk(next)) continue;
      seen.add(id); queue.push(next);
    }
  }
  assert.deepEqual([...found].sort(), [...LIFE_STORIES, ...AIRPORT_PLACES].map(s => s.id).sort());
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
  assert.deepEqual(LIFE_STORIES.map(s => s.id), ['arrival']);
});
