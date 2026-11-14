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
const { advanceWalker, canWalk, closestStory, START, WORLD } = load('src/lib/life-world.ts');
const { LIFE_STORIES } = load('src/lib/life-stories.ts');
const walker = () => ({ ...START, direction: 'down', distance: 0, moving: false, growth: 0 });

test('all six story markers are reachable on foot from the spawn', () => {
  const step = 3;
  const key = (x, y) => `${x},${y}`;
  const queue = [{ ...START }], seen = new Set([key(START.x, START.y)]);
  const found = new Set();
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const story of LIFE_STORIES) if (Math.hypot(p.x - story.x, p.y - story.y) < 30) found.add(story.id);
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const next = { x: p.x + dx, y: p.y + dy }, id = key(next.x, next.y);
      if (next.x < 0 || next.y < 0 || next.x > WORLD.width || next.y > WORLD.height || seen.has(id) || !canWalk(next)) continue;
      seen.add(id); queue.push(next);
    }
  }
  assert.deepEqual([...found].sort(), LIFE_STORIES.map(s => s.id).sort());
});
test('diagonal movement has the same speed, and opposite directions cancel', () => {
  const straight = walker(), diagonal = walker(), opposed = walker();
  advanceWalker(straight, new Set(['right']), .02);
  advanceWalker(diagonal, new Set(['right', 'down']), .02);
  advanceWalker(opposed, new Set(['left', 'right']), .02);
  assert.ok(Math.abs(straight.distance - diagonal.distance) < .0001);
  assert.equal(opposed.distance, 0);
});
test('walking cannot cross a solid object or the island edge', () => {
  const p = walker();
  for (let i = 0; i < 300; i++) advanceWalker(p, new Set(['up']), 1 / 60);
  assert.ok(p.y > 527 && p.y < START.y);
  assert.ok(canWalk(p));
  for (let i = 0; i < 600; i++) advanceWalker(p, new Set(['down']), 1 / 60);
  assert.ok(p.y < 665);
  assert.ok(canWalk(p));
});
test('the first bridge can be crossed continuously without a collision gap', () => {
  const p = walker();
  for (let i = 0; i < 32; i++) advanceWalker(p, new Set(['down']), 1 / 60);
  for (let i = 0; i < 280; i++) advanceWalker(p, new Set(['right']), 1 / 60);
  assert.equal(closestStory(p).id, 'building');
  assert.ok(p.x > 550);
  const before = p.x;
  advanceWalker(p, new Set(), 1000);
  assert.equal(p.x, before);
});
test('the child grows toward today and stays grown when revisiting the arrival', () => {
  const p = walker();
  assert.equal(p.growth, 0);
  for (let i = 0; i < 32; i++) advanceWalker(p, new Set(['down']), 1 / 60);
  for (let i = 0; i < 120; i++) advanceWalker(p, new Set(['right']), 1 / 60);
  assert.ok(p.growth > 0 && p.growth < 1);
  for (let i = 0; i < 100; i++) advanceWalker(p, new Set(['right']), 1 / 60);
  assert.equal(p.growth, 1);
  for (let i = 0; i < 180; i++) advanceWalker(p, new Set(['left']), 1 / 60);
  assert.equal(p.growth, 1);
});
