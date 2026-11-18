import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// Run the real TypeScript modules without adding a test-runner dependency.
const cache = new Map();
function load(file) {
  const full = path.resolve(root, file);
  if (cache.has(full)) return cache.get(full);
  const result = { exports: {} };
  cache.set(full, result.exports);
  const js = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const req = (id) => id === 'three' ? require(id) : load(path.relative(root, id.startsWith('@/') ? path.resolve(root, 'src', id.slice(2) + '.ts') : path.resolve(path.dirname(full), id + '.ts')));
  new Function('require', 'module', 'exports', js)(req, result, result.exports);
  return result.exports;
}
const { CHAPTERS, ALL_ITEMS } = load('src/lib/journey/data.ts');
const { buildModel, modelFootprint, modelHasGlass, modelVoxelSize, isGlass, MODEL_IDS } = load('src/lib/journey/models.ts');
const { AVATAR_VOXEL_SIZE, buildAvatar, avatarHeight } = load('src/lib/journey/avatar.ts');
const W = load('src/lib/journey/world.ts');
const { Grid } = load('src/lib/journey/voxel.ts');
const { gridGeometry } = load('src/lib/journey/mesh.ts');

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
    assert.equal(fs.readFileSync(path.join(root, 'public', video.poster)).toString('ascii', 8, 12), 'WEBP');
  }
});

test('all 32 chess pieces are present with six distinct silhouettes per side', () => {
  const chess = buildModel('chess-table');
  assert.equal(modelVoxelSize('chess-table'), 0.125);
  const ranks = Array.from({ length: 8 }, () => Array(8).fill(0));
  chess.forEach((x, y, z) => {
    if (y < 71) return;
    const file = Math.floor((x + 32) / 8), rank = Math.floor((z + 32) / 8);
    ranks[rank][file] = Math.max(ranks[rank][file], y - 70);
  });
  assert.equal(ranks.flat().filter(Boolean).length, 32);
  for (const rank of [0, 7]) {
    assert.equal(new Set([ranks[rank + (rank === 0 ? 1 : -1)][0], ...ranks[rank]]).size, 6);
    assert.equal(ranks[rank][4], Math.max(...ranks[rank]));
  }
});

test('CEMC and MAA logos are raised on white paper inside their frames', () => {
  for (const id of ['plaque-cemc', 'plaque-cemc-gold', 'plaque-maa']) {
    const grid = buildModel(id);
    let white = 0, ink = 0;
    grid.forEach((x, y, z, color) => {
      if (z === 0 && color === 0xffffff) white++;
      if (z === 1 && grid.get(x, y, 0) === 0xffffff && (color === 0x1a1a1a || color === 0x0b5cad)) ink++;
    });
    assert.ok(white > 800 && ink > 100, id);
  }
});

test('Bayview has three distinct math-award displays with appropriate links', () => {
  const room = CHAPTERS.find(chapter => chapter.id === 'bayview');
  const displays = ['waterloo', 'aime', 'maa'].map(id => room.items.find(item => item.id === id));
  assert.deepEqual(displays.map(item => item.model), ['plaque-cemc', 'plaque-aime', 'plaque-maa']);
  assert.equal(displays[0].links.length, 3);
  assert.ok(displays[0].links.every(link => link.href.endsWith('FGHResults.pdf')));
  assert.match(displays[1].description, /2024 and 2025/);
  assert.match(displays[2].links[0].href, /^https:\/\/maa\.org\//);
  for (const display of displays) {
    const grid = buildModel(display.model);
    let white = 0;
    grid.forEach((_x, _y, z, color) => { if (z === 0 && color === 0xffffff) white++; });
    assert.ok(white > 800, display.id);
  }
});

test('touching voxel surfaces cast corner shadow without adding hidden faces', () => {
  const floor = new Grid().set(0, 0, 0, 0xffffff);
  const alone = gridGeometry(floor, [0, 0, 0], 0);
  const joined = gridGeometry(floor.set(1, 0, 0, 0xffffff).set(1, 1, 0, 0xffffff), [0, 0, 0], 0);
  const top = (geometry, vertex) => geometry.getAttribute('color').getX(vertex);
  assert.equal(top(alone, 12), 1);
  assert.ok(top(joined, 9) < top(joined, 8), 'the top corner beside the raised neighbor is shaded');
  assert.equal(joined.index.count, 14 * 6);
  alone.dispose(); joined.dispose();
});

test('scene artwork has solid relief with recessed art and raised details', () => {
  const details = [
    ['window', 0x9cbf9c, 0, -1, 3],
    ['starwars-posters', 0x9aa0a6, 2, 0, 4],
    ['poster-starwars-big', 0xd8faff, 3, 0, 5],
    ['brawl-stand', 0xffce1f, 1, -1, 5],
  ];
  for (const [id, ink, top, backing, maxDepth] of details) {
    const art = buildModel(id), { minZ, maxZ } = art.bounds();
    const matches = [];
    art.forEach((x, y, z, color) => { if (z === top && color === ink) matches.push([x, y]); });
    assert.ok(matches.length >= 5, id);
    for (const [x, y] of matches) for (let z = backing; z < top; z++) assert.ok(art.has(x, y, z), id);
    assert.ok(maxZ - minZ <= maxDepth, id);
  }
  assert.equal(buildModel('window').get(-1, 5, 1), 0xd4cfc4);
  const poster = buildModel('poster-starwars-big'), { minX, maxX } = poster.bounds();
  poster.forEach((x, _y, z, color) => {
    if (z === 2 && color === 0xf6d23c) assert.ok(x - minX >= 3 && maxX - x >= 3);
  });
});

test('the plane tail marks and welcome lettering stay attached to their backing', () => {
  const plane = buildModel('plane');
  let tailInk = 0;
  plane.forEach((x, y, z, color) => {
    if (Math.abs(x) !== 1 || y < 16 || color !== 0xf2f0ea) return;
    assert.equal(plane.get(0, y, z), 0xc8102e);
    assert.equal(plane.get(-x, y, z), color);
    tailInk++;
  });
  assert.ok(tailInk > 60);
  const sign = buildModel('welcome-sign');
  sign.forEach((x, y, z) => { if (z === 1) assert.equal(sign.get(x, y, 0), 0xf2f0ea); });
  const brawl = buildModel('brawl-stand');
  assert.equal(brawl.get(6, 12, 1), 0xf2f0ea, 'El Primo’s mask eye');
  assert.equal(brawl.get(5, 1, 1), 0x163f94, 'boots rest on the plinth');
  assert.ok(brawl.has(5, 0, 1));
});

test('only designated props react and their motion settles inside the room', () => {
  const reactions = CHAPTERS.flatMap(chapter => [...chapter.items, ...chapter.decor].filter(p => p.bump));
  assert.deepEqual(reactions.map(p => p.model), ['cone', 'cone', 'cone', 'basketball']);
  const makeProp = kind => ({ kind, x: 0, z: 0, radius: 1.75, vx: 0, vz: 0, fall: null, tilt: 0 });
  const cone = makeProp('tip');
  W.bumpProp(cone, { x: -2, z: 0 }, { x: -0.3, z: 0 }, 2, 0.016);
  assert.equal(cone.fall, null, 'walking away does not tip it');
  W.bumpProp(cone, { x: -2, z: 0 }, { x: 0.3, z: 0 }, 2, 0.016);
  assert.deepEqual(cone.fall, { x: 1, z: 0 });
  W.settleBump(0, cone, 0.016, true);
  assert.equal(cone.tilt, Math.PI / 2);
  const ball = makeProp('roll');
  ball.z = W.interior(CHAPTERS[3]).minZ + 2;
  W.bumpProp(ball, { x: 0, z: ball.z + 2 }, { x: 0, z: -0.4 }, 2, 0.016);
  assert.ok(ball.vz < 0);
  W.settleBump(3, ball, 0.05, false);
  assert.ok(ball.vz > 0, 'bounces inside the wall rather than going through a doorway');
  for (let i = 0; i < 150; i++) W.settleBump(3, ball, 0.016, false);
  assert.equal(ball.vz, 0);
  assert.ok(ball.z >= W.interior(CHAPTERS[3]).minZ + ball.radius);
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

test('door leaves fit the opening and open before you reach either threshold', () => {
  for (const chapter of CHAPTERS) {
    const bounds = W.interior(chapter), leaf = W.buildDoorLeaf(chapter).bounds();
    assert.ok((leaf.maxX + 1) * W.DOOR_VOXEL_SIZE < W.DOOR_HALF);
    assert.ok((leaf.maxY + 1) * W.DOOR_VOXEL_SIZE < W.DOOR_HEIGHT);
    assert.ok(leaf.maxZ - leaf.minZ > 2, 'panels and handles protrude from the leaf');
    for (const [z, inward] of [[bounds.minZ - 0.5, 1], [bounds.maxZ + 0.5, -1]]) {
      assert.equal(W.doorwayOpening(z, { x: 0, z: z + inward * 22 }), 0);
      const middle = W.doorwayOpening(z, { x: 0, z: z + inward * 14 });
      assert.ok(middle > 0 && middle < 1);
      assert.equal(W.doorwayOpening(z, { x: 0, z: z + inward * 7 }), 1);
      assert.equal(W.doorwayOpening(z, { x: 20, z }), 0);
    }
  }
});

test('render pixels use half the old pitch at desktop and phone sizes', () => {
  for (const [w, h, pixel] of [[1920, 1080, 1.5], [1280, 720, 1], [400, 754, 0.5]]) {
    assert.equal(W.renderPixelSize(w, h), pixel);
  }
});

test('front and tilt camera modes keep the full avatar inside the vertical field of view', () => {
  for (const age of [7, 18]) for (const aspect of [0.46, 16 / 9]) {
    const height = avatarHeight(age) * W.AVATAR_SCALE;
    for (const front of [0, 0.5, 1]) for (const tilt of [0, 0.5, 1]) {
      const view = W.cameraOffsets(height, aspect, front, tilt);
      const lookAngle = Math.atan2(view.lookHeight - view.rise, view.distance + view.lead);
      for (const depth of [-6, 6]) for (const y of [-1, height + 4 * W.AVATAR_SCALE]) {
        const angle = Math.atan2(y - view.rise, view.distance + depth);
        const screenY = Math.tan(angle - lookAngle) / Math.tan(24 * Math.PI / 180);
        assert.ok(Math.abs(screenY) < (tilt === 1 ? 0.78 : 0.96), `age ${age}, aspect ${aspect}, front ${front}, tilt ${tilt}: ${screenY}`);
      }
      if (tilt === 1) assert.ok(lookAngle > 0, 'tilts above the horizon');
      if (front === 1) assert.equal(view.orbit, Math.PI);
    }
  }
});

test('hoodies keep the avatar scale while adding depth, cuffs and fabric shading', () => {
  assert.equal(AVATAR_VOXEL_SIZE, 0.5);
  for (const outfit of ['starwars', 'essentials', 'western']) {
    const parts = buildAvatar(18, outfit);
    assert.equal(parts.height, 34);
    assert.ok(parts.head.bounds().minZ < -10);
    assert.ok(parts.armL.bounds().minX < -4);
    const cuffColors = new Set();
    parts.armL.forEach((_x, _y, z, color) => { if (z === 2) cuffColors.add(color); });
    assert.ok(cuffColors.size > 3);
  }
});

test('the Western avatar has oversized clothes, mini boots and a textured crown without blush', () => {
  const current = buildAvatar(18, 'western'), previous = buildAvatar(18, 'essentials');
  const width = grid => grid.bounds().maxX - grid.bounds().minX + 1;
  assert.ok(width(current.torso) >= width(previous.torso) + 6);
  assert.ok(current.torso.bounds().minY < 0, 'hoodie drapes below the hip');
  assert.ok(width(current.armL) > width(previous.armL));
  for (const side of ['legL', 'legR']) {
    const leg = current[side], bounds = leg.bounds();
    assert.ok(width(leg) >= width(previous[side]) + 5);
    assert.equal(bounds.minY * AVATAR_VOXEL_SIZE, -current.hip);
    assert.ok(bounds.maxZ >= 8, 'boot toe extends forward of the pants');
    assert.ok(leg.has(side === 'legL' ? -6 : 5, bounds.minY + 6, -5), 'ankle shaft rises above the toe box');
  }
  const heights = new Set(), strandColors = new Set();
  current.head.forEach((x, y, _z, color) => {
    assert.notEqual(color, 0xf3a9a0);
    if (y >= 16) {
      assert.ok(x > -8 && x < 7, 'extra hair volume stays on top');
      heights.add(y);
      strandColors.add(color);
    }
  });
  assert.ok(heights.size >= 5 && strandColors.size >= 8);
  assert.equal(current.head.get(-8, 9, 2), 0xf8e1d0, 'sides are trimmed above the ear');
  assert.match(CHAPTERS.at(-1).outfitLabel, /UGGs/);
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
