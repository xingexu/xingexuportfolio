import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Run the real TypeScript modules without adding a test-runner dependency.
const cache = new Map();
function load(file) {
  const full = path.resolve(root, file);
  if (cache.has(full)) return cache.get(full);
  const result = { exports: {} };
  cache.set(full, result.exports);
  const js = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const req = (id) => load(path.relative(root, id.startsWith('@/') ? path.resolve(root, 'src', id.slice(2) + '.ts') : path.resolve(path.dirname(full), id + '.ts')));
  new Function('require', 'module', 'exports', js)(req, result, result.exports);
  return result.exports;
}
const { CHAPTERS, ALL_ITEMS } = load('src/lib/journey/data.ts');
const { buildModel, modelFootprint, modelHasGlass, modelVoxelSize, isGlass, MODEL_IDS } = load('src/lib/journey/models.ts');
const { buildAvatar, avatarHeight } = load('src/lib/journey/avatar.ts');
const W = load('src/lib/journey/world.ts');

test('every item is written out, linked properly and has a model', () => {
  const ids = new Set();
  for (const item of ALL_ITEMS) {
    assert.ok(!ids.has(item.id), `duplicate id ${item.id}`); ids.add(item.id);
    for (const field of ['label', 'title', 'description']) {
      assert.ok(item[field].trim().length > 2, `${item.id}.${field}`);
      assert.doesNotMatch(item[field], /\bXX+\b|TODO|lorem|placeholder|test text/i, `${item.id}.${field}`);
    }
    assert.ok(MODEL_IDS.includes(item.model), `${item.id} model`);
    for (const link of item.links ?? []) assert.match(link.href, /^(https:\/\/|\/)/, `${item.id} link`);
  }
  for (const chapter of CHAPTERS) for (const p of chapter.decor) assert.ok(MODEL_IDS.includes(p.model), p.model);
});

test('the CSA poster and Buldak bowl have the right playable video and captions', () => {
  for (const [id, filename] of [['csa', 'csa'], ['buldak', 'buldak']]) {
    const { video } = ALL_ITEMS.find(item => item.id === id);
    assert.equal(video.src, `/videos/journey/${filename}.mp4`);
    assert.ok(video.label);
    const mp4 = fs.readFileSync(path.join(root, 'public', video.src));
    assert.equal(mp4.toString('ascii', 4, 8), 'ftyp');
    assert.match(fs.readFileSync(path.join(root, 'public', video.captions), 'utf8'), /^WEBVTT\n/);
  }
});

test('every model uses an aligned voxel grid and fits its world footprint', () => {
  for (const id of MODEL_IDS) {
    const grid = buildModel(id);
    assert.ok(grid.size > 0, id);
    grid.forEach((x, y, z) => assert.ok(Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z), id));
    const b = grid.bounds(), box = modelFootprint(id), size = modelVoxelSize(id);
    assert.equal(box.maxX - box.minX, (b.maxX - b.minX + 1) * size, id);
    assert.equal(box.maxZ - box.minZ, (b.maxZ - b.minZ + 1) * size, id);
    assert.equal(box.height, (b.maxY + 1) * size, id);
  }
});

test('both FBLA trophies have transparent glass and an opaque base', () => {
  for (const item of ALL_ITEMS.filter(i => i.id.startsWith('award-'))) {
    const glass = new Set();
    buildModel(item.model).forEach((_x, _y, _z, color) => glass.add(isGlass(color)));
    assert.ok(modelHasGlass(item.model));
    assert.deepEqual(glass, new Set([false, true]));
  }
});

test('indoor cutaways leave the floor and cut only camera-side walls', () => {
  for (const [index, chapter] of CHAPTERS.entries()) {
    if (chapter.outdoor) continue;
    const { fixed, walls } = W.buildCutawayShell(index), bounds = W.interior(chapter);
    assert.ok(fixed.has(0, -1, 0), chapter.id);
    assert.ok(Object.values(walls).every(wall => wall.size > 0), chapter.id);
    assert.equal(fixed.size + Object.values(walls).reduce((sum, wall) => sum + wall.size, 0), W.buildRoomShell(index).size, chapter.id);
    assert.deepEqual(W.cutawaySides(bounds, { x: bounds.minX - 1, z: bounds.maxZ + 1 }), new Set(['left', 'back']));
    assert.deepEqual(W.cutawaySides(bounds, { x: 0, z: 0 }), new Set());
  }
});

test('the terminal facade can be cut away without losing the apron floor', () => {
  const bounds = W.interior(CHAPTERS[0]), { fixed, walls } = W.buildCutawayShell(0);
  const facadeZ = -CHAPTERS[0].depth / 2;
  assert.ok(walls.front.has(-12, 12, facadeZ));
  assert.ok(fixed.has(-12, -1, facadeZ));
  assert.ok(W.cutawaySides(bounds, { x: 0, z: bounds.minZ - 1 }).has('front'));
  assert.ok(!W.cutawaySides(bounds, { x: 0, z: bounds.minZ + 1 }).has('front'));
});

test('render pixels use half the old pitch at desktop and phone sizes', () => {
  for (const [w, h, pixel] of [[1920, 1080, 1.5], [1280, 720, 1], [400, 754, 0.5]]) {
    assert.equal(W.renderPixelSize(w, h), pixel);
  }
});

test('the Western dorm keeps small props and signs proportional to the furniture', () => {
  const room = CHAPTERS.at(-1);
  const footprint = id => modelFootprint(room.items.find(item => item.id === id).model);
  assert.ok(room.width >= 84 && room.depth >= 92);
  assert.ok(footprint('buldak').height < 3);
  assert.ok(footprint('fan').height < 9);
  assert.ok(footprint('molten').height < 4);
  assert.ok(footprint('degree').height < footprint('mustangs').height);
  for (const id of ['csa', 'wds', 'wfn', 'mustangs']) assert.ok(footprint(id).height < W.AVATAR_SCALE * avatarHeight(18));
});

test('the story runs from age 7 to 18 with the requested outfits', () => {
  assert.equal(CHAPTERS[0].ageFrom, 7);
  assert.equal(CHAPTERS.at(-1).ageTo, 18);
  for (let i = 1; i < CHAPTERS.length; i++) assert.ok(CHAPTERS[i].ageFrom <= CHAPTERS[i - 1].ageTo + 1 && CHAPTERS[i].ageFrom >= CHAPTERS[i - 1].ageTo, CHAPTERS[i].id);
  assert.deepEqual(CHAPTERS.map(c => c.outfit), ['kid', 'kid', 'starwars', 'starwars', 'essentials', 'western']);
  for (let age = 8; age <= 18; age++) assert.ok(avatarHeight(age) > avatarHeight(age - 1), `grows at ${age}`);
  for (const outfit of ['kid', 'starwars', 'essentials', 'western']) for (const age of [7, 11, 15, 18]) {
    const parts = buildAvatar(age, outfit);
    assert.equal(parts.height, avatarHeight(age));
    assert.equal(!!parts.propeller, outfit === 'kid');
  }
});

test('ages grow as you walk forward through a room', () => {
  for (const chapter of CHAPTERS) {
    const room = W.interior(chapter);
    let last = 0;
    for (let z = room.maxZ; z >= room.minZ; z -= 1) {
      const age = W.ageAt(chapter, z);
      assert.ok(age >= last && age >= chapter.ageFrom && age <= chapter.ageTo, chapter.id);
      last = age;
    }
    assert.equal(W.ageAt(chapter, room.maxZ - 2), chapter.ageFrom);
    assert.equal(W.ageAt(chapter, room.minZ + 2), chapter.ageTo);
  }
});

function reachable(index, start, r = 3.5) {
  const room = W.interior(CHAPTERS[index]);
  const seen = new Set(), queue = [start], cells = [];
  const key = (p) => `${p.x},${p.z}`;
  seen.add(key(start));
  while (queue.length) {
    const p = queue.shift(); cells.push(p);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: p.x + dx, z: p.z + dz };
      if (n.z < room.minZ || n.z > room.maxZ || seen.has(key(n)) || W.blocked(index, n.x, n.z, r)) continue;
      seen.add(key(n)); queue.push(n);
    }
  }
  return cells;
}

test('spawn points are open and every object can be reached on foot', () => {
  CHAPTERS.forEach((chapter, index) => {
    for (const from of ['start', 'forward', 'back']) {
      const s = W.spawn(index, from);
      assert.ok(!W.blocked(index, s.x, s.z, 3.5), `${chapter.id} ${from}`);
    }
    const s = W.spawn(index, 'forward');
    const cells = reachable(index, { x: Math.round(s.x), z: Math.round(s.z) }, chapter.ageFrom >= 14 ? 3.5 : 3);
    for (const item of chapter.items) {
      assert.ok(cells.some(c => W.nearbyItems(index, c).some(near => near.id === item.id)), `${item.id} is reachable`);
    }
  });
});

test('walking forward leads through the door, and backward returns', () => {
  CHAPTERS.forEach((chapter, index) => {
    let p = W.spawn(index, 'forward'), exit = null;
    for (let i = 0; i < 400 && !exit; i++) { const r = W.step(index, p, 0, -0.8, 3.5); exit = r.exit; p = r; }
    assert.equal(exit, 'next', `${chapter.id} forward`);
    if (index === 0) return;
    p = W.spawn(index, 'back'); exit = null;
    for (let i = 0; i < 400 && !exit; i++) { const r = W.step(index, p, 0, 0.8, 3.5); exit = r.exit; p = r; }
    assert.equal(exit, 'prev', `${chapter.id} back`);
  });
});

test('walls and furniture stop the player', () => {
  const room = W.interior(CHAPTERS[1]);
  const r = W.step(1, { x: 0, z: 0 }, -200, 0, 3);
  assert.ok(r.x >= room.minX + 3 - 1e-9);
  const desk = W.placementBox(CHAPTERS[1].items.find(i => i.id === 'chess'));
  assert.ok(W.blocked(1, (desk.minX + desk.maxX) / 2, (desk.minZ + desk.maxZ) / 2, 3));
});
