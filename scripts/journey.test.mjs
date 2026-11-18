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
const V = load('src/lib/journey/volleyball.ts');
const R = load('src/lib/journey/roommate.ts');
const { Grid } = load('src/lib/journey/voxel.ts');
const { gridGeometry } = load('src/lib/journey/mesh.ts');

test('every item is written out, linked properly and has a model', () => {
  const ids = new Set();
  for (const item of ALL_ITEMS) {
    assert.ok(!ids.has(item.id), `duplicate id ${item.id}`); ids.add(item.id);
    for (const value of [item.label, item.title, ...(item.description ? [item.description] : [])]) {
      assert.ok(value.trim().length > 2, item.id);
      assert.doesNotMatch(value, /\bXX+\b|TODO|lorem|placeholder|test text/i, item.id);
    }
    assert.ok(MODEL_IDS.includes(item.model), `${item.id} model`);
    for (const link of item.links ?? []) assert.match(link.href, /^(https:\/\/|\/)/, `${item.id} link`);
  }
  for (const chapter of CHAPTERS) for (const p of chapter.decor) assert.ok(MODEL_IDS.includes(p.model), p.model);
});

function mp4Tracks(file) {
  const tracks = [];
  function read(start, end) {
    for (let at = start; at + 8 <= end;) {
      const size = file.readUInt32BE(at);
      const type = file.toString('ascii', at + 4, at + 8);
      assert.ok(size >= 8 && at + size <= end, 'valid MP4 box size');
      if (type === 'hdlr') tracks.push(file.toString('ascii', at + 16, at + 20));
      if (['moov', 'trak', 'mdia'].includes(type)) read(at + 8, at + size);
      at += size;
    }
  }
  read(0, file.length);
  return tracks.sort();
}

test('CSA keeps its captioned audio and Buldak ships as a genuinely silent video', () => {
  for (const [id, filename] of [['csa', 'csa'], ['buldak', 'buldak']]) {
    const { video } = ALL_ITEMS.find(item => item.id === id);
    assert.equal(video.src, `/videos/journey/${filename}.mp4`);
    assert.ok(video.label);
    const mp4 = fs.readFileSync(path.join(root, 'public', video.src));
    assert.equal(mp4.toString('ascii', 4, 8), 'ftyp');
    if (id === 'csa') {
      assert.deepEqual(mp4Tracks(mp4), ['soun', 'vide']);
      assert.match(fs.readFileSync(path.join(root, 'public', video.captions), 'utf8'), /^WEBVTT\n/);
    } else {
      assert.deepEqual(mp4Tracks(mp4), ['vide']);
      assert.equal(video.captions, undefined);
    }
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

test('cones and basketball keep their existing bump reactions', () => {
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

test('both volleyball styles respond to proximity and a walking kick', () => {
  const field = W.buildBallField(CHAPTERS.findIndex(c => c.id === 'bayview'));
  for (const kind of ['mikasa', 'molten']) {
    const b = V.makeBall(0, 0, 0, 1.75), player = { x: -3, z: 0 };
    assert.equal(V.volleyAction(kind, b, { x: 30, z: 0 }, 22, field), null);
    assert.equal(V.volleyAction(kind, b, player, 22, field), kind === 'mikasa' ? 'Spike' : 'Set');
    assert.equal(V.kickBall(b, player, { x: -0.3, z: 0 }, 2, 0.016), false);
    assert.equal(V.kickBall(b, player, { x: 0.3, z: 0 }, 2, 0.016), true);
    assert.ok(b.vx > 0 && b.vy > 0, 'a kick sends the ball forward and a little upward');
    assert.equal(V.kickBall(b, player, { x: 0.3, z: 0 }, 2, 0.016), false);
    assert.equal(V.volleyAction(kind, b, player, 22, field), null);
    for (let i = 0; i < 480; i++) V.stepBall(b, field, 1 / 120);
    assert.equal(b.y, b.radius);
    assert.ok(b.grounded);
  }
});

test('one spike action feeds the ball, jumps before striking, and reaches a floor bounce across Bayview’s net', () => {
  const index = CHAPTERS.findIndex(c => c.id === 'bayview'), field = W.buildBallField(index);
  const item = CHAPTERS[index].items.find(item => item.id === 'volleyball');
  const b = V.makeBall(item.x, 0, item.z, 1.75), player = { x: b.x, z: b.z + 5 };
  const avatar = buildAvatar(14, CHAPTERS[index].outfit);
  const action = V.volleyAction('mikasa', b, player, avatar.height * W.AVATAR_SCALE, field);
  assert.equal(action, 'Spike');
  const seq = V.startVolley(action, b, player, { x: 0, z: -1 }, (avatar.shoulder + 1) * W.AVATAR_SCALE, field);
  V.advanceVolley(seq, b, field, V.SPIKE.feed);
  assert.ok(b.vy > 0 && seq.contacts === 1);
  assert.equal(V.volleyPose(action, V.SPIKE.feed).lift, 0, 'initial toss is grounded');
  V.advanceVolley(seq, b, field, V.SPIKE.contact - V.SPIKE.feed - 0.08);
  assert.ok(V.volleyPose(action, seq.elapsed).lift > 0);
  assert.equal(seq.contacts, 1, 'takeoff precedes contact');
  V.advanceVolley(seq, b, field, V.SPIKE.contact - seq.elapsed + 0.001);
  assert.equal(seq.contacts, 2);
  assert.ok(b.vy < 0);
  assert.ok(V.volleyPose(action, V.SPIKE.contact).lift >= V.SPIKE.rise - 0.001);
  assert.ok(V.volleyPose(action, V.SPIKE.contact + 0.15).right > V.volleyPose(action, V.SPIKE.contact).right + 1);
  let floorBounce = false;
  while (seq.elapsed < V.SPIKE.end + 0.65 && !floorBounce) {
    const previous = b.vy;
    V.advanceVolley(seq, b, field, 1 / 120);
    floorBounce = b.y === b.radius && previous < -5 && b.vy > 0;
  }
  assert.ok(floorBounce && b.z < field.net.z - b.radius, 'spike bounces up off the far court');
});

test('three Western overhead touches raise both arms and only the last set travels forward', () => {
  const index = CHAPTERS.findIndex(c => c.id === 'western'), field = W.buildBallField(index);
  const item = CHAPTERS[index].items.find(item => item.id === 'molten');
  const b = V.makeBall(item.x, 0, item.z, 1.875), player = { x: b.x + 5, z: b.z };
  const avatar = buildAvatar(18, CHAPTERS[index].outfit);
  const action = V.volleyAction('molten', b, player, avatar.height * W.AVATAR_SCALE, field);
  assert.equal(action, 'Set');
  const seq = V.startVolley(action, b, player, { x: -1, z: 0 }, (avatar.shoulder + 1) * W.AVATAR_SCALE, field);
  for (const [i, touch] of V.SET_CONTACTS.entries()) {
    V.advanceVolley(seq, b, field, touch - seq.elapsed - 0.005);
    if (i > 0) assert.ok(b.vy < 0, 'the ball returns to the hands before each new touch');
    assert.equal(seq.contacts, i);
    V.advanceVolley(seq, b, field, 0.01);
    assert.ok(b.vy > 0 && seq.contacts === i + 1);
    assert.ok(Math.abs(b.y - seq.release.y) < 0.2 && Math.abs(b.x - seq.release.x) < 0.1, 'contact occurs at the hands');
    assert.equal(i === V.SET.touches - 1, b.vx < 0);
    for (const reduced of [false, true]) {
      const pose = V.volleyPose(action, touch, reduced), ready = V.volleyPose(action, touch - 0.15, reduced);
      assert.ok(pose.left < -2.25 && pose.right === pose.left);
      assert.ok(pose.leftElbow > ready.leftElbow, 'both arms extend on every contact');
      assert.ok(V.volleyPose('Spike', V.SPIKE.contact, reduced).lift > 0, 'reduced motion retains an airborne contact pose');
    }
  }
  assert.ok(V.advanceVolley(seq, b, field, V.SET.recovery));
});

test('downward Mikasa spikes clear the tape from both sides while low balls bounce back', () => {
  const field = W.buildBallField(CHAPTERS.findIndex(c => c.id === 'bayview')), { net } = field;
  const x = (net.minX + net.maxX) / 2;
  for (const side of [-1, 1]) {
    for (const height of [28, 31]) {
      const b = V.makeBall(x + 3, height - 1.75, net.z + side * 12, 1.75);
      V.launchBall(b, V.spikeVelocity(b, field, { x: 0, z: -side }));
      assert.ok(b.vy < 0, 'initial velocity is downward');
      const samples = [];
      for (let i = 0; i < 140; i++) {
        V.stepBall(b, field, 1 / 120);
        if (Math.abs(b.z - net.z) <= b.radius + 0.5) samples.push(b.y - b.radius);
      }
      assert.ok(samples.length > 0 && Math.min(...samples) >= net.top, 'the entire ball clears the tape');
      assert.ok((b.z - net.z) * side < -4, 'shot lands on the other side');
    }
  }
  const low = V.makeBall(x, 14, net.z + 4, 1.75);
  V.launchBall(low, { x: 0, y: 0, z: -34 });
  for (let i = 0; i < 15; i++) V.stepBall(low, field, 1 / 120);
  assert.ok(low.vz > 0 && low.z > net.z, 'hitting the mesh reverses motion');
});

test('a diagonal Mikasa spike near the net clears the taller post', () => {
  const field = W.buildBallField(CHAPTERS.findIndex(c => c.id === 'bayview')), { net } = field;
  const b = V.makeBall(net.maxX + 2, 29 - 1.75, net.z + 5, 1.75);
  V.launchBall(b, V.spikeVelocity(b, field, { x: 0, z: -1 }));
  for (let i = 0; i < 120 && b.z > net.z - b.radius - 2; i++) {
    V.stepBall(b, field, 1 / 120);
    assert.ok(b.vz <= 0, 'never rebounds off the near post');
  }
  assert.ok(b.z < net.z - 3);
});

test('volleyballs bounce off the floor and walls, then settle', () => {
  const field = W.buildBallField(CHAPTERS.findIndex(c => c.id === 'bayview'));
  const b = V.makeBall(0, 0, field.minZ + 2, 1.75);
  V.launchBall(b, { x: 0, y: 10, z: -25 });
  V.stepBall(b, field, 0.03);
  assert.ok(b.vz > 0);
  let bounced = false;
  for (let i = 0; i < 600; i++) {
    const previous = b.vy;
    V.stepBall(b, field, 1 / 120);
    bounced ||= previous < -5 && b.vy > 0;
    assert.ok(b.y >= b.radius && b.y <= field.ceiling - b.radius);
    assert.ok(b.z >= field.minZ + b.radius && b.z <= field.maxZ - b.radius);
  }
  assert.ok(bounced && b.grounded);
  assert.equal(b.vz, 0);
});

test('lifting a Molten beside a tall closet does not pull it inside', () => {
  const index = CHAPTERS.findIndex(c => c.id === 'western');
  const room = CHAPTERS[index], field = W.buildBallField(index);
  const { x, z } = room.items.find(item => item.id === 'closet');
  const closet = field.blocks.find(p => p.minX < x && p.maxX > x && p.minZ < z && p.maxZ > z);
  const ball = V.makeBall(room.items.find(item => item.id === 'molten').x, 0, closet.maxZ + 2, 1.875);
  V.liftBall(ball, { x: ball.x, y: 23, z: closet.maxZ - 1 }, field);
  assert.ok(Math.abs(ball.y - 23) < 1e-6);
  assert.ok(ball.z >= closet.maxZ + ball.radius);
  V.launchBall(ball, { x: 0, y: 27, z: -3.5 });
  for (let i = 0; i < 360; i++) V.stepBall(ball, field, 1 / 120);
  assert.ok(ball.grounded && (ball.y === ball.radius || ball.y >= closet.top + ball.radius));
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
    assert.deepEqual(W.cutawayOpacity(bounds, { x: bounds.minX - 1, z: bounds.maxZ + 1 }), { left: 0, right: 1, front: 1, back: 0 });
    assert.deepEqual(W.cutawayOpacity(bounds, { x: 0, z: 0 }), { left: 1, right: 1, front: 1, back: 1 });
  }
});

test('the terminal facade can be cut away without losing the apron floor', () => {
  const bounds = W.interior(CHAPTERS[0]), { fixed, walls } = W.buildCutawayShell(0);
  const facadeZ = -CHAPTERS[0].depth / 2;
  assert.ok(walls.front.has(-12, 12, facadeZ));
  assert.ok(fixed.has(-12, -1, facadeZ));
  assert.equal(W.cutawayOpacity(bounds, { x: 0, z: bounds.minZ - 1 }).front, 0);
  assert.equal(W.cutawayOpacity(bounds, { x: 0, z: bounds.minZ + 5 }).front, 0.5);
  assert.equal(W.cutawayOpacity(bounds, { x: 0, z: bounds.minZ + 8 }).front, 1);
});

test('near-wall framing stops looking through the wall and cutaways fade on both sides of a corner', () => {
  const bounds = W.interior(CHAPTERS.at(-1));
  const player = { x: bounds.maxX - 3, z: bounds.minZ + 3 };
  const lead = W.cameraLookAhead(bounds, player, { x: 1, z: -1 }, 10);
  assert.equal(lead, 1);
  assert.equal(W.cameraLookAhead(bounds, player, { x: -1, z: 1 }, 10), 10);
  assert.equal(W.cameraLookAhead(bounds, { x: 0, z: bounds.minZ - 3 }, { x: 0, z: -1 }, 10), 0);
  for (let gap = 0; gap <= 10; gap += 0.125) {
    const opacity = W.cutawayOpacity(bounds, { x: bounds.maxX - gap, z: bounds.minZ + gap });
    const next = W.cutawayOpacity(bounds, { x: bounds.maxX - gap - 0.125, z: bounds.minZ + gap + 0.125 });
    assert.ok(next.right >= opacity.right && next.right - opacity.right < 0.04);
    assert.equal(opacity.right, opacity.front);
    assert.equal(opacity.left, 1);
    assert.equal(opacity.back, 1);
  }
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

test('the Western avatar keeps tapered clothes, UGGs and a low, textured fringe', () => {
  const current = buildAvatar(18, 'western');
  const width = grid => grid.bounds().maxX - grid.bounds().minX + 1;
  const spanAt = (grid, layer) => {
    const xs = [], zs = [];
    grid.forEach((x, y, z) => { if (y === layer) { xs.push(x); zs.push(z); } });
    return [Math.max(...xs) - Math.min(...xs) + 1, Math.max(...zs) - Math.min(...zs) + 1];
  };
  assert.ok(width(current.torso) <= 16 && width(current.armL) <= 6);
  assert.ok(spanAt(current.torso, 3)[0] < spanAt(current.torso, 16)[0], 'waist tapers in from the chest');
  assert.ok(current.torso.bounds().minY < 0, 'hoodie drapes below the hip');
  for (const side of ['legL', 'legR']) {
    const leg = current[side], bounds = leg.bounds();
    assert.ok(width(leg) <= 9);
    assert.equal(bounds.minY * AVATAR_VOXEL_SIZE, -current.hip);
    assert.equal(bounds.maxZ, 7, 'boot toe extends forward of the pants');
    assert.ok(leg.has(side === 'legL' ? -4 : 3, bounds.minY + 6, -4), 'ankle shaft rises above the toe box');
  }
  const heights = new Set(), strandColors = new Set();
  current.head.forEach((x, y, _z, color) => {
    assert.notEqual(color, 0xf3a9a0);
    if (y >= 16) {
      heights.add(y);
      strandColors.add(color);
    }
  });
  assert.ok(heights.size >= 4 && strandColors.size >= 8);
  assert.ok(spanAt(current.head, 17).every(span => span >= 14), 'texture covers the full crown');
  assert.ok(current.head.bounds().maxY <= 20, 'the crown stays low');
  assert.ok(current.head.has(1, 12, 8) && !current.head.has(-7, 12, 8), 'fringe leaves the temples uncovered');
  assert.equal(current.head.get(-8, 9, 2), 0xf8e1d0, 'sides are trimmed above the ear');
  assert.match(CHAPTERS.at(-1).outfitLabel, /UGGs/);
});

test('Richard sits on the second bed with a white hoodie, shorts, a cap and a milk carton', () => {
  const room = CHAPTERS.at(-1), index = CHAPTERS.length - 1;
  const beds = room.items.filter(item => item.model.startsWith('bed-'));
  assert.equal(beds.length, 2);
  const bed = beds.find(item => item.id === 'richards-bed'), box = W.placementBox(bed), at = room.roommate;
  assert.equal(bed.title, at.name);
  assert.ok(at.x > box.minX && at.x <= box.maxX && at.z > box.minZ && at.z < box.maxZ);
  assert.equal(buildModel(bed.model).get(7, R.ROOMMATE_SEAT - 1, 0) >= 0, true);
  assert.ok(W.blocked(index, at.x + 5, at.z, 1), 'the aisle collision includes his knees');
  assert.ok(!W.blocked(index, at.x + 11, at.z, 2), 'there is still room to walk up');
  const { seated, head, forearm, carton } = R.buildRoommate();
  assert.equal(seated.get(-5, -1, 4), 0x384351, 'shorts');
  assert.equal(seated.get(-5, -6, 10), 0xe9bf9d, 'bare shins');
  assert.equal(seated.get(0, 14, 0) >>> 16 >= 0xcc, true, 'white fleece');
  assert.equal(head.get(0, 7, 9), 0x31415e, 'cap brim');
  assert.ok(forearm.size > 0 && carton.size > 0);
});

test('the milk sip plays once per approach, with a still pose for reduced motion', () => {
  const state = { near: false, elapsed: R.SIP_DURATION };
  R.stepRoommate(state, 12, 0.1);
  assert.equal(state.elapsed, R.SIP_DURATION);
  R.stepRoommate(state, 10, 0.9);
  assert.equal(state.near, true);
  for (const reduced of [false, true]) {
    const pose = R.sipPose(state.elapsed, reduced);
    assert.ok(pose.arm < -1 && pose.carton > 0.7 && pose.head < 0);
    assert.deepEqual(R.sipPose(R.SIP_DURATION, reduced), R.sipPose(0, reduced));
  }
  R.stepRoommate(state, 12, R.SIP_DURATION);
  R.stepRoommate(state, 10, 0.05);
  assert.equal(state.elapsed, R.SIP_DURATION, 'staying nearby does not replay');
  R.stepRoommate(state, 15, 0.05);
  R.stepRoommate(state, 10, 0.05);
  assert.ok(state.elapsed < 0.1, 'walking back retriggers the sip');
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

test('the larger Western dorm fits two beds in a T without overlapping', () => {
  const room = CHAPTERS.at(-1);
  assert.ok(room.width >= 120 && room.depth >= 120);
  const [bar, stem] = ['ohall-bed', 'richards-bed'].map(id => room.items.find(item => item.id === id));
  assert.equal(Math.abs(bar.rot - stem.rot) % 2, 1, 'the beds are a quarter turn apart');
  const a = W.placementBox(bar), b = W.placementBox(stem);
  assert.equal((a.minX + a.maxX) / 2, (b.minX + b.maxX) / 2);
  assert.ok(a.minX < b.minX && a.maxX > b.maxX, 'the crossbar extends past both sides of the stem');
  assert.ok(a.minZ >= b.maxZ && a.minZ - b.maxZ <= 2, 'the foot of the stem sits against the crossbar');
});

test('the two wide standing desks face out from the half wall and have clear approaches', () => {
  const index = CHAPTERS.length - 1, room = CHAPTERS[index];
  const [mine, richards] = room.items.filter(item => item.model.startsWith('standing-desk'));
  const divider = room.decor.find(prop => prop.model === 'desk-divider');
  const wall = W.placementBox(divider), wallHeight = modelFootprint(divider.model).height;
  assert.equal(mine.x, divider.x);
  assert.equal(richards.x, divider.x);
  assert.equal(mine.z - divider.z, divider.z - richards.z);
  assert.equal(mine.rot ?? 0, 0);
  assert.equal(richards.rot, 2);
  assert.ok(wallHeight >= W.WALL_HEIGHT / 2 && wallHeight <= W.WALL_HEIGHT / 2 + 1);
  assert.ok(W.blocked(index, divider.x, divider.z, 3.5));
  const cells = reachable(index, W.spawn(index, 'forward'));
  for (const desk of [mine, richards]) {
    const footprint = modelFootprint(desk.model), rect = W.placementBox(desk);
    assert.ok(footprint.maxX - footprint.minX >= 30 && footprint.maxZ - footprint.minZ >= 12);
    assert.ok(wall.minX <= rect.minX && wall.maxX >= rect.maxX);
    const south = desk.z > divider.z, gap = south ? rect.minZ - wall.maxZ : wall.minZ - rect.maxZ;
    assert.ok(gap >= 0 && gap <= 2, 'the desk backs sit against the divider');
    assert.ok(cells.some(p => p.x === desk.x && p.z === (south ? rect.maxZ + 5 : rect.minZ - 5)), 'the front of the desk is walkable');
  }
  for (const x of [wall.minX - 4, wall.maxX + 4]) {
    assert.ok(!W.blocked(index, x, divider.z, 3.5), 'the divider leaves passage at both ends');
  }
});

test('the tall Western closet has hanging clothes and four stocked pantry tiers', () => {
  const closet = buildModel('closet'), size = modelFootprint('closet');
  assert.ok(size.maxX - size.minX >= 44 && size.height >= 30);
  for (const y of [2, 10, 17, 25]) {
    let stocked = 0;
    for (let x = 5; x < 22; x++) for (let z = 1; z <= 5; z++) if (closet.has(x, y, z)) stocked++;
    assert.ok(stocked >= 12, `snack tier at ${y}`);
  }
  assert.ok(closet.has(-20, 20, 2) && !closet.has(-20, 20, 6), 'the hanging bay is open');
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
    const field = W.buildBallField(index);
    for (const placement of [...chapter.items, ...chapter.decor].filter(p => p.ball)) {
      const ball = V.makeBall(placement.x, placement.y ?? 0, placement.z, modelFootprint(placement.model).height / 2);
      assert.ok(cells.some(c => {
        const age = W.ageAt(chapter, c.z);
        const action = V.volleyAction(placement.ball, ball, c, avatarHeight(age) * W.AVATAR_SCALE, field);
        const dx = ball.x - c.x, dz = ball.z - c.z, distance = Math.hypot(dx, dz);
        if (!action || distance < 3) return false;
        const forward = { x: dx / distance, z: dz / distance };
        const shoulder = (buildAvatar(age, chapter.outfit).shoulder + 1) * W.AVATAR_SCALE;
        const candidate = { ...ball };
        const seq = V.startVolley(action, candidate, c, forward, shoulder, field);
        const cue = action === 'Set' ? V.SET.first : V.SPIKE.contact;
        V.advanceVolley(seq, candidate, field, cue);
        return Math.hypot(candidate.x - seq.release.x, candidate.z - seq.release.z, candidate.y - (action === 'Set' ? seq.release.y : seq.strikeY)) < 0.5;
      }), `${placement.model} at ${placement.x},${placement.z} is playable`);
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
