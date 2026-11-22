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
const { CHAPTERS, ALL_ITEMS, CSA_BARBER_CHAIR, CSA_BARBER_SEAT, CSA_DJ_LINK, CSA_POSTER_ID, CSA_ROOM_INDEX, CSA_STAGE_Z, JOURNEY_ROOMS, JOURNEY_START_INDEX, WESTERN_INDEX, WESTERN_LIGHT_SWITCH_ID } = load('src/lib/journey/data.ts');
const { buildDormCabinetParts, buildModel, modelFootprint, modelHasGlass, modelVoxelSize, isGlass, MODEL_IDS } = load('src/lib/journey/models.ts');
const { AVATAR_VOXEL_SIZE, SHIRT_PRINT_VOXEL_SIZE, buildAvatar, avatarHeight } = load('src/lib/journey/avatar.ts');
const W = load('src/lib/journey/world.ts');
const { bedsidePosition, sampleBedSleep } = load('src/lib/journey/bedSleep.ts');
const V = load('src/lib/journey/volleyball.ts');
const R = load('src/lib/journey/roommate.ts');
const { makeRoommateView } = load('src/lib/journey/roommateView.ts');
const { makeDormLighting } = load('src/lib/journey/dormLighting.ts');
const { makeDormCabinetView } = load('src/lib/journey/dormCabinetView.ts');
const { makeWuzuFanView } = load('src/lib/journey/wuzuFanView.ts');
const { CSA_GUESTS, buildCsaDiscoBall, buildCsaGuest, csaActivityLabel, makeCsaParty, sampleCsaCut, sampleCsaDj, sampleCsaGuest } = load('src/lib/journey/csaParty.ts');
const { BOULDER_CYCLE, BOULDER_LANES, BOULDER_TOP_TIME, CLIMBER_NAMES, MAT_VOXEL_HEIGHT, buildBoulderingWall, sampleBouldering } = load('src/lib/journey/csaClimb.ts');
const { CSA_VOLLEY_INTERVAL, makeCsaVolley } = load('src/lib/journey/csaVolley.ts');
const { Grid } = load('src/lib/journey/voxel.ts');
const { gridGeometry } = load('src/lib/journey/mesh.ts');
const { Box3, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } = require('three');

test('About starts at the Western dorm entrance as the age-18 avatar', () => {
  const chapter = JOURNEY_ROOMS[JOURNEY_START_INDEX];
  const entrance = W.spawn(JOURNEY_START_INDEX, 'start');
  assert.equal(chapter.id, 'western');
  assert.equal(chapter.outfit, 'western');
  assert.equal(W.ageAt(chapter, entrance.z), 18);
  assert.deepEqual(entrance, W.spawn(WESTERN_INDEX, 'forward'));
  assert.ok(!W.blocked(JOURNEY_START_INDEX, entrance.x, entrance.z, 3.5 * W.AVATAR_SCALE));
});

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
  for (const chapter of JOURNEY_ROOMS) for (const p of chapter.decor) assert.ok(MODEL_IDS.includes(p.model), p.model);
});

test('the badminton card uses the requested description verbatim', () => {
  const racket = ALL_ITEMS.find(item => item.id === 'badminton');
  assert.equal(racket.description, 'I played competitive badminton at KC Badminton from grade 2 up until grade 6.');
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

test('CSA keeps its captioned audio; Buldak and Richard have silent playable videos', () => {
  for (const [id, filename] of [['csa', 'csa'], ['buldak', 'buldak'], ['richard', 'richard']]) {
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

test('the primary-school CEMC certificate clears the chair rail and upper fixtures', () => {
  const room = CHAPTERS.find(chapter => chapter.id === 'school');
  const poster = room.items.find(item => item.id === 'beaver');
  assert.ok(poster.y > 12, 'leave a gap above the chair rail');
  assert.ok(poster.y + modelFootprint(poster.model).height <= 28, 'stay below the upper fixtures');
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
  const ball = V.makeBall(closet.minX - 2, 0, z, 1.875);
  V.liftBall(ball, { x: closet.minX + 1, y: 23, z: ball.z }, field);
  assert.ok(Math.abs(ball.y - 23) < 1e-6);
  assert.ok(ball.x <= closet.minX - ball.radius);
  V.launchBall(ball, { x: 3.5, y: 27, z: 0 });
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

test('foreground props stay visible during sustained occlusion and stay solid during sleep', () => {
  let opacity = 1;
  for (let frame = 0; frame < 120; frame++) {
    opacity = W.foregroundPropOpacity(opacity, true, 0.25, false);
    assert.ok(opacity >= 0.7, 'a blocked sightline never makes a prop vanish');
  }
  assert.ok(opacity < 1, 'foreground furniture can still help reveal the avatar');
  assert.equal(W.foregroundPropOpacity(1, true, 1, false), opacity, 'reduced motion uses the same visibility floor');
  assert.equal(W.foregroundPropOpacity(opacity, true, 0.25, true), 1, 'the sleeping view keeps the bed solid immediately');
  for (let frame = 0; frame < 120; frame++) opacity = W.foregroundPropOpacity(opacity, false, 0.25, false);
  assert.equal(opacity, 1, 'furniture returns to full opacity when the view clears');
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

test('the Western entry is one full-width wood door with a mirror on its room-facing side', () => {
  const entry = W.buildDormEntryDoor(), leaf = entry.bounds();
  assert.equal((leaf.maxX + 1) * W.DOOR_VOXEL_SIZE, 2 * W.DOOR_HALF - W.DOOR_VOXEL_SIZE);
  assert.ok((leaf.maxY + 1) * W.DOOR_VOXEL_SIZE < W.DOOR_HEIGHT);
  const wood = entry.get(12, 35, 0), mirror = entry.get(12, 35, -2);
  const red = c => c >> 16, blue = c => c & 255;
  assert.ok(red(wood) > blue(wood) + 50, 'warm wood shows on the hall side');
  assert.ok(blue(mirror) > red(mirror) && mirror !== entry.get(6, 35, -2), 'the glass is framed on the inside');
  assert.equal(entry.get(12, 35, 1), undefined, 'there is no mirror on the hall side');
});

test('render pixels use half the old pitch at desktop and phone sizes', () => {
  for (const [w, h, pixel] of [[1920, 1080, 1.5], [1280, 720, 1], [400, 754, 0.5]]) {
    assert.equal(W.renderPixelSize(w, h), pixel);
  }
});

test('the exterior lawn texture is opaque, varied and green', () => {
  const pixels = W.buildGrassTile();
  assert.equal(pixels.length, W.GRASS_TILE_SIZE ** 2 * 4);
  const colors = new Set();
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b, a] = pixels.subarray(i, i + 4);
    assert.ok(g > r && g > b && a === 255);
    colors.add((r << 16) | (g << 8) | b);
  }
  assert.ok(colors.size > 40, 'the lawn has patches and fine-grained variation');
});

test('the jump lifts off, peaks and lands without a negative height', () => {
  const duration = W.JUMP_DURATION, early = W.jumpHeight(duration / 4);
  assert.equal(W.jumpHeight(0), 0);
  assert.ok(early > 0 && early < W.JUMP_HEIGHT);
  assert.equal(W.jumpHeight(duration / 2), W.JUMP_HEIGHT);
  assert.ok(Math.abs(W.jumpHeight(duration * 0.75) - early) < 1e-9);
  assert.equal(W.jumpHeight(duration), 0);
  assert.equal(W.jumpHeight(duration * 2), 0);
});

test('walking is a little faster at every age', () => {
  for (const age of [7, 18]) {
    const height = avatarHeight(age) * W.AVATAR_SCALE, previous = 18 + height * 0.55;
    assert.ok(W.walkSpeed(height) > previous * 1.05 && W.walkSpeed(height) < previous * 1.15);
  }
});

test('front and tilt camera modes keep the full avatar in frame, even at the jump apex', () => {
  for (const age of [7, 18]) for (const aspect of [0.46, 16 / 9]) {
    const height = avatarHeight(age) * W.AVATAR_SCALE;
    for (const front of [0, 0.5, 1]) for (const tilt of [0, 0.5, 1]) {
      const view = W.cameraOffsets(height, aspect, front, tilt);
      const lookAngle = Math.atan2(view.lookHeight - view.rise, view.distance + view.lead);
      for (const depth of [-6, 6]) for (const lift of [0, W.JUMP_HEIGHT]) for (const y of [-1, height + 4 * W.AVATAR_SCALE]) {
        const angle = Math.atan2(y + lift - view.rise, view.distance + depth);
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
  for (const outfit of ['starwars', 'stussy']) {
    const parts = buildAvatar(18, outfit);
    assert.equal(parts.height, 34);
    assert.ok(parts.head.bounds().minZ < -10);
    assert.ok(parts.armL.bounds().minX < -4);
    const cuffColors = new Set();
    parts.armL.forEach((_x, _y, z, color) => { if (z === 2) cuffColors.add(color); });
    assert.ok(cuffColors.size > 3);
  }
});

test('Bayview wears a Stüssy hoodie and cuffed grey sweats throughout high school', () => {
  const chapter = CHAPTERS.find(room => room.id === 'bayview');
  assert.match(chapter.outfitLabel, /Stüssy hoodie · grey sweatpants/);
  for (let age = chapter.ageFrom; age <= chapter.ageTo; age++) {
    const { torso, legL, legR, hip } = buildAvatar(age, chapter.outfit);
    const logo = { front: 0, back: 0 };
    torso.forEach((_x, _y, z, color) => {
      if (color === 0xece9e2) logo[z > 0 ? 'front' : 'back']++;
    });
    assert.ok(logo.front >= 10 && logo.back > logo.front * 2);
    for (const [leg, outerX] of [[legL, -8], [legR, 7]]) {
      const ankle = -2 * (hip - 2), knee = ankle + 5;
      assert.equal(leg.has(outerX, ankle, 0), false, 'cuff tapers above the slides');
      const grey = leg.get(outerX, knee, 0);
      const value = grey & 255;
      assert.equal(grey, value * 0x010101);
      assert.ok(value >= 120 && value <= 190);
    }
  }
});

test('the Western avatar grows taller without widening the Grade 5 face or shoulders', () => {
  const earlyRoom = CHAPTERS.find(room => room.id === 'school');
  const early = buildAvatar(earlyRoom.ageFrom, earlyRoom.outfit), current = buildAvatar(18, 'western');
  assert.equal(current.height, avatarHeight(18));
  assert.ok(current.height > early.height && current.hip > early.hip && current.shoulder > early.shoulder);
  assert.equal(current.shoulderX, early.shoulderX);
  for (let x = -8; x < 8; x++) for (let y = 0; y < 14; y++) for (let z = 0; z < 8; z++) {
    const reference = early.head.get(x, y, z);
    const color = current.head.get(x, y, z);
    if (reference === 0xf3a9a0) assert.notEqual(color, 0xf3a9a0);
    else assert.equal(color, reference);
  }
  for (let x = -8; x < 8; x++) for (let y = 10; y < 14; y++) for (let z = -8; z < 0; z++) {
    assert.equal(current.head.get(x, y, z), early.head.get(x, y, z));
  }
  for (const side of ['legL', 'legR']) {
    const leg = current[side], bounds = leg.bounds();
    assert.equal(bounds.minY * AVATAR_VOXEL_SIZE, -current.hip);
    assert.equal(bounds.maxZ, 6, 'boot toe extends forward of the pants');
    assert.ok(leg.has(side === 'legL' ? -4 : 3, bounds.minY + 6, -3), 'ankle shaft rises above the toe box');
  }
  assert.match(CHAPTERS.at(-1).outfitLabel, /UGGs/);
});

test('Richard starts on the second bed in shorts and blue Crocs', () => {
  const room = CHAPTERS.at(-1);
  const beds = room.items.filter(item => item.model.startsWith('bed-'));
  assert.equal(beds.length, 2);
  const bed = beds.find(item => item.id === 'richards-bed'), box = W.placementBox(bed), at = room.roommate;
  assert.ok(at.x > box.minX && at.x <= box.maxX && at.z > box.minZ && at.z < box.maxZ);
  assert.equal(buildModel(bed.model).get(7, R.ROOMMATE_SEAT - 1, 0) >= 0, true);
  const { legL, legR, head } = R.buildRoommate();
  for (const [leg, x] of [[legL, -6], [legR, 1]]) {
    assert.ok(leg.has(x, -8, -2) && !leg.has(x, -18, -2), 'shorts end above the bare legs');
    assert.equal(leg.get(x + 1, -20, 0), head.get(0, 4, 6), 'bare shins and face match');
    assert.equal(leg.get(x + 2, -27, 1), 0x418fdd, 'blue clog');
    assert.equal(leg.get(x + 1, -27, 2), 0x215a93, 'vent');
    assert.equal(leg.get(x, -27, -1), 0x2264a4, 'heel strap rivet');
  }
});

test('Richard’s taller bed keeps the raised mattress under his seat and holds five overlapping pillows', () => {
  const model = buildModel('bed-roommate'), lift = R.ROOMMATE_BED_LIFT;
  assert.ok(lift >= 3 && model.has(-8, lift + 2, 12), 'the higher frame has full-length legs');
  assert.ok(!model.has(2, lift + 2, 7), 'the extra height is open under the bed');
  assert.ok(model.has(7, R.ROOMMATE_SEAT - 1, 0));
  for (const [x, y, z] of [[-5, 9, -11], [5, 9, -11], [-6, 10, -5], [6, 10, -5], [0, 12, -7]]) {
    assert.ok(model.has(x, y + lift, z), 'each large pillow has a visible crest');
  }
  assert.ok(model.has(-3, 9 + lift, -7) && model.has(3, 9 + lift, -7), 'the center pillow overlaps the side layers');
});

test('Richard shares the Western avatar fit, with a subtle tan and backward black cap', () => {
  const avatar = buildAvatar(18, 'western'), { head, torso, shoulder, hip } = R.buildRoommate();
  assert.deepEqual(torso.bounds(), avatar.torso.bounds());
  assert.equal(shoulder - hip, avatar.shoulder - avatar.hip);
  assert.ok((torso.get(0, 14, 0) >> 16) >= 0xcc, 'white fleece');
  const skin = avatar.head.get(0, 4, 6), tan = head.get(0, 4, 6);
  assert.ok(tan < skin && (skin >> 16) - (tan >> 16) < 18, 'slightly darker skin tone');
  avatar.head.forEach((x, y, z, color) => {
    if (z >= 0 && y < 12) assert.equal(head.get(x, y, z), color === skin ? tan : color, 'same face and fringe');
  });
  assert.ok(head.bounds().maxY > avatar.head.bounds().maxY, 'cap crown wraps his hair');
  assert.ok(head.bounds().minZ < -12 && head.bounds().maxZ < 10, 'the bill extends only behind the head');
  assert.ok(head.get(0, 11, -16) < 0x303030, 'the rear bill is black');
});

test('the hoodie crest fits the chest and arcs RANGERS over a centered maple leaf', () => {
  const { crest, torso } = R.buildRoommate();
  const chestWidth = (torso.bounds().maxX - torso.bounds().minX + 1) * AVATAR_VOXEL_SIZE * W.AVATAR_SCALE;
  const crestBounds = crest.bounds();
  assert.ok((crestBounds.maxX - crestBounds.minX + 1) * R.RANGERS_CREST_VOXEL_SIZE < chestWidth);
  const outline = (minX, maxX) => {
    let top = -Infinity;
    crest.forEach((x, y, _z, color) => { if (x >= minX && x <= maxX && color === 0x203957) top = Math.max(top, y); });
    return top;
  };
  assert.ok(outline(-2, 1) > outline(-14, -12) && outline(-2, 1) > outline(11, 13), 'the lettering rises in the middle');
  for (const [x, y] of [[0, 10], [-6, 5], [6, 5], [0, 0]]) assert.equal(crest.get(x, y, 0), 0xc52636, 'the leaf has a tip, lobes and a centered stem');
});

const dorm = CHAPTERS.at(-1), npcItem = dorm.items.find(item => item.id === dorm.roommate.id);
const npcFridge = dorm.items.find(item => item.id === dorm.roommate.fridge), npcPad = dorm.items.find(item => item.id === dorm.roommate.pad);
const routine = R.buildRoommateRoutine(dorm.roommate, npcFridge, npcPad);
const beatAt = (action, proportion) => {
  const { start, end } = routine.beats.find(beat => beat.action === action);
  return R.sampleRoommate(routine, start + (end - start) * proportion);
};

test('Richard’s LinkedIn is available in the object browser and follows him around the dorm', () => {
  assert.equal(npcItem.title, 'Richard Su');
  assert.equal(npcItem.links[0].href, 'https://www.linkedin.com/in/richard-su-7377542b9/');
  const pose = beatAt('practice', 0.5), player = { x: pose.x - 6, z: pose.z };
  const index = CHAPTERS.length - 1;
  assert.ok(!W.nearbyItems(index, player).some(item => item.id === npcItem.id));
  assert.ok(W.nearbyItems(index, player, 3, 7, new Map([[npcItem.id, pose]])).some(item => item.id === npcItem.id));
});

test('Richard walks a furniture-free route, yields to the player and returns to his bed', () => {
  const index = CHAPTERS.length - 1;
  for (const beat of routine.beats.filter(b => b.action === 'walk')) {
    for (let t = beat.start; t < beat.end; t += 0.02) {
      const pose = R.sampleRoommate(routine, t);
      assert.ok(!W.blocked(index, pose.x, pose.z, R.ROOMMATE_RADIUS), `blocked at ${pose.x}, ${pose.z}`);
    }
  }
  const walk = routine.beats.find(beat => beat.action === 'walk');
  const t = walk.start + 0.2;
  const next = R.sampleRoommate(routine, t + 0.08);
  assert.equal(R.advanceRoommate(routine, t, 0.06, next, 2.38), t, 'waits instead of walking through the player');
  assert.equal(R.advanceRoommate(routine, t, 0.06, { x: 8, z: 18 }, 2.38), t + 0.06);
  const seat = R.sampleRoommate(routine, routine.total);
  assert.deepEqual(seat, R.sampleRoommate(routine, 0), 'the loop resets to its seated, stationary pose');
  assert.equal(seat.sit, 1);
  const { view } = roommateScene();
  const pose = beatAt('take', 0.5);
  view.apply(pose, pose.yaw);
  const start = R.placementPoint(npcFridge, -13, 8.1), beyond = R.placementPoint(npcFridge, 2, 8.1);
  const dx = beyond.x - start.x, dz = beyond.z - start.z;
  assert.ok(W.boxDistance(W.placementBox(npcFridge), start) > 2.38);
  const unobstructed = W.step(index, start, dx, dz, 2.38);
  assert.ok(Math.hypot(unobstructed.x - beyond.x, unobstructed.z - beyond.z) < 0.01);
  const movement = W.step(index, start, dx, dz, 2.38, (from, to, r) => view.blocks(from, to, r, pose));
  assert.ok(Math.hypot(movement.x - start.x, movement.z - start.z) < 7, 'player cannot walk through the open door and Richard');
});

test('the fridge door pauses before it swings into a stationary visitor', () => {
  const player = R.placementPoint(npcFridge, 3.1, 8.2), radius = 2.38;
  assert.ok(!W.blocked(CHAPTERS.length - 1, player.x, player.z, radius), 'the visitor can stand in the aisle');
  for (const action of ['open', 'shut']) {
    const { start, end } = routine.beats.find(b => b.action === action);
    let time = start, hit = false;
    const visitor = action === 'open' ? player : R.placementPoint(npcFridge, -1.9, 8.2);
    for (let i = 0; i < 100 && time < end; i++) {
      const next = R.advanceRoommate(routine, time, 0.016, visitor, radius);
      if (next === time) { hit = true; break; }
      time = next;
    }
    assert.ok(hit, `door pauses while trying to ${action}`);
    assert.ok(R.advanceRoommate(routine, time, 0.016, { x: 8, z: 18 }, radius) > time, 'door resumes when clear');
  }
});

test('the fridge door collision follows the protruding handle', () => {
  const { fridge, view } = roommateScene();
  const pose = beatAt('take', 0.5);
  view.apply(pose, pose.yaw);
  const door = fridge.getObjectByName('Fridge door');
  const p = door.localToWorld(new Vector3(-9, 11.6, 1.5 + 2.2));
  assert.ok(R.fridgeDoorDistance(npcFridge, pose.door, p) < 2.38, 'the handle reaches a visitor outside the door slab');
});

test('the animated fridge opens, hands off the carton, closes and returns it after a sip', () => {
  const { fridge, view } = roommateScene();
  const door = fridge.getObjectByName('Fridge door'), carton = view.group.getObjectByName('Milk carton');
  const onShelf = carton.position.clone();
  const apply = (action, u) => { const pose = beatAt(action, u); view.apply(pose, pose.yaw); };
  assert.equal(door.rotation.y, 0);
  apply('open', 0.85);
  assert.ok(door.rotation.y > 0.7);
  apply('take', 0.44);
  assert.ok(carton.position.distanceTo(onShelf) < 0.01);
  apply('take', 0.46);
  assert.ok(carton.position.distanceTo(onShelf) < 0.2, 'the carton transfers at the shelf, without jumping');
  apply('close', 0.95);
  assert.equal(door.rotation.y, 0);
  assert.ok(carton.position.distanceTo(onShelf) > 2);
  apply('sip', 0.5);
  assert.ok(carton.rotation.x < -0.9 && carton.position.y > 17);
  apply('replace', 0.54);
  assert.ok(carton.position.distanceTo(onShelf) < 0.2, 'it reaches the shelf before release');
  apply('shut', 0.95);
  assert.equal(door.rotation.y, 0);
  assert.ok(carton.position.distanceTo(onShelf) < 0.01);
});

function roommateScene() {
  const material = new MeshBasicMaterial(), fridge = new Group();
  fridge.position.set(npcFridge.x, npcFridge.y ?? 0, npcFridge.z);
  fridge.rotation.y = npcFridge.rot * Math.PI / 2;
  const view = makeRoommateView(dorm.roommate, npcFridge, npcPad, fridge, material, material,
    (grid, size) => new Mesh(gridGeometry(grid, [0, 0, 0], 0, size), material));
  return { view, fridge };
}

test('Richard’s seated collider covers his knees on the open side of his bed', () => {
  const { view } = roommateScene(), pose = view.pose, radius = 2.38;
  const facing = { ...pose, rot: dorm.roommate.seatFacing };
  const start = R.placementPoint(facing, 0, 12), end = R.placementPoint(facing, 0, 9);
  assert.ok(!W.blocked(WESTERN_INDEX, end.x, end.z, radius), 'the bed itself does not block the visitor');
  const movement = W.step(WESTERN_INDEX, start, end.x - start.x, end.z - start.z, radius, (from, to, r) => view.blocks(from, to, r, pose));
  assert.ok(Math.hypot(movement.x - end.x, movement.z - end.z) > 0.01, 'the visitor cannot walk through the seated avatar');
  assert.ok(!view.blocks(end, start, radius, pose), 'the visitor can back away');
});

test('at a head-on encounter Richard steps aside, keeps clear, and waits before returning', () => {
  const radius = 3.5 * W.AVATAR_SCALE, gap = R.roommateGap(radius);
  const beat = routine.beats.find(b => b.action === 'walk' && b.from.z === 29 && b.to.x === 38);
  const at = (beat.start + beat.end) / 2, pose = R.sampleRoommate(routine, at);
  const { view } = roommateScene();
  view.apply(pose, pose.yaw);
  const start = { x: pose.x + 12, z: pose.z };
  const player = W.step(WESTERN_INDEX, start, -12, 0, radius, (from, to, r) => view.blocks(from, to, r, pose));
  assert.ok(player.x - pose.x >= gap && player.x - pose.x <= gap + 0.5, 'body clearance stops a head-on approach');
  assert.equal(R.advanceRoommate(routine, at, 0.05, player, radius), at, 'Richard yields to the player too');
  const open = p => !W.blocked(WESTERN_INDEX, p.x, p.z, R.ROOMMATE_RADIUS);
  let shove = R.planRoommatePush(pose, player, radius, open);
  assert.ok(shove && Math.abs(shove.target.z - pose.z) > 2, 'Richard steps sideways as well as back');
  const instant = R.stepRoommatePush(shove, 1 / 60, true, player, radius, open);
  assert.deepEqual({ x: instant.pose.x, z: instant.pose.z, stride: instant.pose.stride }, { ...shove.target, stride: 0 });
  assert.equal(R.planRoommatePush(pose, player, radius, () => false), null, 'no push into enclosed furniture');
  assert.equal(R.planRoommatePush({ ...pose, action: 'sip' }, player, radius, open), null);
  for (let i = 0; i < 30; i++) {
    const moved = R.stepRoommatePush(shove, 1 / 60, false, player, radius, open);
    assert.ok(open(moved.pose) && Math.hypot(moved.pose.x - player.x, moved.pose.z - player.z) >= gap);
    shove = moved.state;
  }
  const dx = shove.target.x - pose.x, dz = shove.target.z - pose.z, distance = Math.hypot(dx, dz);
  const inTheWay = { x: pose.x - dx / distance * 5, z: pose.z - dz / distance * 5 };
  for (let i = 0; i < 75; i++) shove = R.stepRoommatePush(shove, 1 / 60, false, inTheWay, radius, open).state;
  assert.equal(shove.progress, 1, 'Richard waits for the player to clear his return path');
  const away = { x: 12, z: 51 };
  let returned;
  for (let i = 0; shove && i < 40; i++) {
    returned = R.stepRoommatePush(shove, 1 / 60, false, away, radius, open);
    shove = returned.state;
  }
  assert.equal(shove, null);
  assert.deepEqual(returned.pose, pose, 'the route resumes at the same point');
});

test('actor collision is swept across the body, not just checked at the endpoint', () => {
  const center = { x: 0, z: 0 }, gap = R.roommateGap(2.38);
  assert.ok(R.overlapsOnMove({ x: -10, z: 0 }, { x: 10, z: 0 }, center, gap));
  assert.ok(!R.overlapsOnMove({ x: -4, z: 0 }, { x: -5, z: 1 }, center, gap), 'existing overlap can resolve outward');
  assert.ok(!R.overlapsOnMove({ x: -10, z: 8 }, { x: 10, z: 8 }, center, gap));
});

test('the volleyball bounces off Richard in both his seated and moving poses', () => {
  const { view } = roommateScene();
  const field = W.buildBallField(CHAPTERS.length - 1);
  field.blocks.push(view.ballBlock);
  const checkBounce = () => {
    const { minX, maxX, minZ, bottom } = view.ballBlock, x = (minX + maxX) / 2;
    const ball = V.makeBall(x, Math.max(0, bottom), minZ - 2.4, 1.3);
    V.launchBall(ball, { x: 0, y: 0, z: 19 });
    V.stepBall(ball, field, 0.14);
    assert.ok(ball.vz < 0 && ball.z < minZ - ball.radius, 'the ball bounces before entering his model');
  };
  const seatedMinZ = view.ballBlock.minZ;
  checkBounce();
  const aisle = routine.beats.find(b => b.action === 'walk' && b.from.x > 0 && b.to.x < 0);
  const walking = R.sampleRoommate(routine, (aisle.start + aisle.end) / 2);
  view.apply(walking, walking.yaw);
  assert.ok(view.ballBlock.maxZ < seatedMinZ, 'the collider leaves the bed with Richard');
  checkBounce();
});

test('a moving Richard displaces a loose volleyball and does not leave it in midair', () => {
  const { view } = roommateScene(), field = W.buildBallField(CHAPTERS.length - 1);
  const block = view.ballBlock;
  field.blocks.push(block);
  const practice = beatAt('practice', 0.5), seat = beatAt('seat', 0);
  view.apply(practice, practice.yaw);
  const loose = V.makeBall(block.maxX + 0.8, 0, practice.z, 1.3);
  const startX = loose.x;
  V.pushBallFromMovingBlock(loose, field, block);
  assert.ok(Math.hypot(loose.vx, loose.vz) >= 6, 'the ball rolls out from under him');
  assert.ok(loose.x > startX);
  const balanced = V.makeBall(practice.x, block.top, practice.z, 1.3);
  V.stepBall(balanced, field, 0.1);
  assert.ok(balanced.grounded && balanced.y > balanced.radius);
  view.apply(seat, seat.yaw);
  V.stepBall(balanced, field, 0.1);
  assert.ok(!balanced.grounded && balanced.vy < 0, 'gravity resumes once Richard moves underneath it');
});

test('a volleyball pinned between Richard and furniture does not jump through him', () => {
  const actor = { minX: 0, maxX: 4, minZ: -2, maxZ: 2, bottom: 0, top: 10 };
  const furniture = { minX: -4, maxX: -1.3, minZ: -2, maxZ: 2, bottom: 0, top: 5 };
  const field = { minX: -10, maxX: 10, minZ: -10, maxZ: 10, ceiling: 20, blocks: [actor, furniture] };
  const ball = V.makeBall(-0.2, 0, 0, 1);
  V.pushBallFromMovingBlock(ball, field, actor);
  assert.equal(ball.x, -0.2);
  assert.equal(ball.z, 0);
  assert.equal(ball.vx, 0);
  assert.equal(ball.vz, 0);
});

test('Richard stickhandles with a grounded blade and keeps the puck on the pad', () => {
  const { view } = roommateScene();
  const stick = view.group.getObjectByName('Hockey stick'), puck = view.group.getObjectByName('Puck');
  const rack = stick.position.clone(), xs = [];
  const box = W.placementBox(npcPad);
  for (let u = 0.01; u < 1; u += 0.025) {
    const pose = beatAt('practice', u);
    view.apply(pose, pose.yaw);
    assert.ok(puck.position.x > box.minX && puck.position.x < box.maxX && puck.position.z > box.minZ && puck.position.z < box.maxZ);
    const blade = stick.localToWorld(new Vector3(0, -36 * 0.31, 0));
    assert.ok(Math.abs(blade.y - puck.position.y) < 0.25, 'the shaft reaches the synthetic ice');
    xs.push(puck.position.x);
  }
  assert.ok(Math.max(...xs) - Math.min(...xs) > 8, 'the puck moves with repeated side-to-side sweeps');
  const pose = beatAt('rack', 1);
  view.apply(pose, pose.yaw);
  assert.ok(stick.position.distanceTo(rack) < 0.01, 'the stick goes back to its stand');
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

test('Richard’s bed meets both corner walls and the shoe rack stays by the doorway', () => {
  const bed = dorm.items.find(item => item.id === 'richards-bed');
  const rack = dorm.items.find(item => item.id === 'shoe-rack'), shoes = dorm.items.find(item => item.id === 'pink-shoes');
  const rackBox = W.placementBox(rack), shoesBox = W.placementBox(shoes);
  const box = W.placementBox(bed), entrance = W.spawn(WESTERN_INDEX, 'start');
  const bounds = W.interior(dorm), doorLeft = entrance.x - W.DOOR_HALF;
  const head = R.placementPoint(bed, 0, -15), foot = R.placementPoint(bed, 0, 15);
  assert.ok(box.maxX < rackBox.minX && rackBox.maxX < doorLeft, 'the rack is between the bed and the left jamb');
  assert.equal(rackBox.maxZ, bounds.maxZ);
  assert.ok(rackBox.minX < doorLeft - 4 && rackBox.maxX >= doorLeft - 3, 'the rack takes the old spot of the foot');
  assert.equal(rack.rot, 2, 'the shoes face into the room');
  assert.equal(shoes.y, modelFootprint(rack.model).height);
  assert.ok(shoesBox.minX >= rackBox.minX && shoesBox.maxX <= rackBox.maxX && shoesBox.minZ >= rackBox.minZ && shoesBox.maxZ <= rackBox.maxZ);
  assert.equal(box.maxZ, bounds.maxZ);
  assert.equal(box.minX, bounds.minX, 'the head of Richard’s bed also meets the side wall');
  assert.equal(head.z, foot.z, 'the length of the bed runs parallel with the door frame');
  assert.ok(head.x < foot.x - 25);
  const model = buildModel(bed.model), wallSide = model.bounds().minX;
  assert.ok(model.has(wallSide, 13, -14), 'the headboard extends to the wall-side edge');
  const headAtWall = R.placementPoint(bed, wallSide, -14);
  assert.equal(headAtWall.z, bounds.maxZ, 'the headboard meets the wall');
  const cells = reachable(WESTERN_INDEX, entrance);
  assert.ok(cells.some(p => p.z < box.minZ && W.boxDistance(box, p) <= 6), 'Richard can get out of bed on the open side');
});

test('my bed, nightstand and mini fridge line the far wall in order', () => {
  const item = id => dorm.items.find(p => p.id === id);
  const fridge = item('mini-fridge'), box = W.placementBox(fridge), bed = item('ohall-bed'), nightstand = item('ohall-nightstand');
  const bedBox = W.placementBox(bed), tableBox = W.placementBox(nightstand);
  const { minZ, maxX } = W.interior(dorm);
  assert.equal(bedBox.minZ, minZ, 'the head is against the far wall');
  assert.equal(tableBox.minZ, minZ);
  assert.ok(bedBox.maxX < tableBox.minX && tableBox.maxX < box.minX, 'the nightstand is between the bed and fridge');
  assert.ok(box.minZ >= minZ && box.minZ <= minZ + 1 && box.maxX <= maxX && box.maxX >= maxX - 1, 'the fridge is tight to both corner walls');
  assert.ok(R.placementPoint(fridge, 0, 8).z > box.maxZ, 'the fridge opens into the aisle');
  const frog = W.placementBox(item('jellycat'));
  assert.ok(frog.minX >= bedBox.minX && frog.maxX <= bedBox.maxX && frog.minZ >= bedBox.minZ && frog.maxZ <= bedBox.maxZ);
  assert.equal(item('fragrances').x, fridge.x);
  assert.equal(item('fragrances').z, fridge.z);
  const scene = roommateScene(), door = scene.fridge.getObjectByName('Fridge door');
  for (let u = 0; u <= 1; u += 0.05) {
    const pose = beatAt('open', u);
    scene.view.apply(pose, pose.yaw);
    const doorBox = new Box3().setFromObject(door, true);
    assert.ok(doorBox.max.x <= maxX && doorBox.min.x > tableBox.maxX && doorBox.min.z >= minZ, 'the open door clears the walls and nightstand');
  }
});

test('Richard’s nightstand is against the corner side wall next to his bed', () => {
  const item = id => dorm.items.find(p => p.id === id);
  const [desk, table, bed] = ['richards-desk', 'richards-nightstand', 'richards-bed'].map(id => W.placementBox(item(id)));
  assert.ok(desk.maxZ < table.minZ && table.maxZ === bed.minZ);
  assert.equal(table.minX, W.interior(dorm).minX);
  assert.ok(table.maxX < bed.maxX, 'the nightstand leaves the foot of the bed clear');
});

test('the rendered sleeping head rests on the navy pillow and clears the headboard and wall throughout the transfer', () => {
  const bed = dorm.items.find(item => item.id === 'ohall-bed'), box = W.placementBox(bed);
  const start = { x: box.maxX + 4, z: bed.z + 2 };
  assert.ok(reachable(WESTERN_INDEX, W.spawn(WESTERN_INDEX, 'start')).some(p => p.x === start.x && p.z === start.z));
  assert.deepEqual(bedsidePosition(bed, start), start);
  const atFoot = { x: bed.x, z: box.maxZ + 3 };
  assert.deepEqual(bedsidePosition(bed, atFoot), atFoot);
  assert.equal(bedsidePosition(bed, { x: box.maxX + 10, z: bed.z }), null);
  const mount = sampleBedSleep(bed, start, 0, 0, false), sleep = sampleBedSleep(bed, start, 1, 0, true);
  assert.deepEqual([mount.x, mount.y, mount.z, Math.abs(mount.pitch)], [start.x, 0, start.z, 0]);
  assert.ok(sleep.pitch < -1.3 && sleep.pitch > -Math.PI / 2, 'the pillow end lifts slightly');
  assert.equal(sleep.x, bed.x);
  const geometry = gridGeometry(buildAvatar(18, 'western').head, [0, 0, 0], 0.02, AVATAR_VOXEL_SIZE);
  const root = new Group(), head = new Mesh(geometry);
  root.scale.setScalar(W.AVATAR_SCALE);
  head.position.y = buildAvatar(18, 'western').shoulder + 2;
  root.add(head);
  const wall = W.interior(dorm).minZ + 2;
  for (const entry of [atFoot, start, { x: box.maxX + 4, z: bed.z - 4 }, { x: box.minX - 4, z: bed.z - 4 }]) {
    const yaw = Math.atan2(sleep.x - entry.x, sleep.z - entry.z);
    for (let i = 0; i <= 80; i++) {
      const pose = sampleBedSleep(bed, entry, i / 80, 0, true);
      root.position.set(pose.x, pose.y, pose.z);
      root.rotation.set(pose.pitch, yaw * (1 - pose.turn), 0, 'YXZ');
      root.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(head, true);
      assert.ok(bounds.min.z > wall, `head stays away from the headboard at ${i}/80: ${bounds.min.z}`);
      if (i === 80) {
        assert.ok(bounds.min.z >= bed.z - 13 && bounds.max.z < bed.z - 3, 'the whole head fits over the pillow');
        assert.ok(bounds.min.y > 11 && bounds.min.y < 12.6, 'the head rests on the pillow instead of floating or sinking');
      }
    }
  }
  geometry.dispose();
  assert.deepEqual(sampleBedSleep(bed, start, 1, 3, true), sleep);
  assert.notEqual(sampleBedSleep(bed, start, 1, 3, false).y, sleep.y);
});

test('Richard can pass the bedside while the player sleeps, and blocks getting up until he clears it', () => {
  const bed = dorm.items.find(item => item.id === 'ohall-bed');
  const beside = { x: W.placementBox(bed).maxX + 4, z: bed.z + 2 };
  const asleep = sampleBedSleep(bed, beside, 1, 0, true), radius = 3.5 * W.AVATAR_SCALE;
  const walk = routine.beats.find(b => b.action === 'walk' && b.from.x === 38 && b.to.x === 38 && b.to.z === -41);
  for (let time = walk.start; time < walk.end - 0.04; time += 0.04) {
    const pose = R.sampleRoommate(routine, time);
    if (R.advanceRoommate(routine, time, 0.04, beside, radius) !== time) continue;
    assert.ok(R.advanceRoommate(routine, time, 0.04, asleep, radius) > time, 'the empty aisle no longer blocks Richard');
    assert.ok(R.overlapsOnMove(asleep, beside, pose, R.roommateGap(radius)), 'waking waits while Richard is still in the way');
    return;
  }
  assert.fail('Richard walks past the bedside');
});

test('the textured beige blanket sits over navy sheets, leaving the thick pillow and small Capco throw visible', () => {
  const bed = dorm.items.find(item => item.id === 'ohall-bed');
  const blanket = dorm.decor.find(p => p.model === 'capco-throw'), stitch = dorm.decor.find(p => p.model === 'capco-stitch');
  const bedBox = W.placementBox(bed), blanketBox = W.placementBox(blanket), logoBox = W.placementBox(stitch);
  assert.ok(blanketBox.minZ > bed.z + 7 && blanketBox.maxZ > bedBox.maxZ - 1, 'the throw covers only the foot');
  assert.ok(blanketBox.maxZ - blanketBox.minZ < (bedBox.maxZ - bedBox.minZ) / 3);
  const navy = color => (color & 255) > ((color >> 8) & 255) * 1.5 && (color & 255) < 100;
  const beige = color => {
    const red = color >> 16, green = (color >> 8) & 255, blue = color & 255;
    return red > green && green > blue && blue >= 120;
  };
  const bedGrid = buildModel(bed.model);
  assert.ok(navy(bedGrid.get(0, 6, 0)) && navy(bedGrid.get(0, 5, 14)), 'the sheet is navy on top and at the foot');
  for (const x of [-4, 0, 4]) assert.ok(navy(bedGrid.get(x, 11, -8)), 'the wide pillow is five voxels thick and navy');
  const quiltSwatches = new Set();
  for (let x = -8; x < 8; x++) for (let z = -3; z < 7; z++) {
    const color = bedGrid.get(x, bedGrid.has(x, 8, z) ? 8 : 7, z);
    assert.ok(beige(color), 'the visible main cover is beige');
    quiltSwatches.add(color);
  }
  assert.ok(quiltSwatches.size > 15, 'the main cover has textured seams and fabric');
  assert.ok(beige(bedGrid.get(-9, 5, 0)) && beige(bedGrid.get(8, 5, 0)), 'the cover drapes down both sides');
  for (let x = -8; x < 8; x++) for (let z = 8; z <= 14; z++) {
    assert.ok(beige(bedGrid.get(x, 7, z)) && !bedGrid.has(x, 8, z), 'the Capco throw sits above the main blanket at the foot');
  }
  const grid = buildModel(blanket.model), swatches = new Set();
  for (let x = -14; x < 14; x++) swatches.add(grid.get(x, 7, 0));
  assert.ok(swatches.size > 5, 'the weave is not a flat color');
  assert.ok(grid.has(0, 0, 6) && !grid.has(0, 0, 1), 'fabric hangs off the foot edge');
  const ink = buildModel(stitch.model).bounds();
  assert.equal(ink.minY, ink.maxY, 'the stitching is horizontal');
  assert.ok(logoBox.minX > bed.x && logoBox.maxX < bedBox.maxX && logoBox.maxZ < bedBox.maxZ);
  assert.ok(logoBox.maxX - logoBox.minX < 2.5, 'the wordmark is small');
  for (let x = 6; x <= 11; x++) {
    const top = grid.get(x, 8, 3);
    assert.ok(top && top < 0x444444 && !grid.has(x, 9, 3), 'the stitching sits on the black fabric');
  }
});

test('the headlight clips to the monitor and the backpack is tucked under the desk', () => {
  const monitor = dorm.items.find(p => p.id === 'monitor'), headlight = dorm.decor.find(p => p.model === 'monitor-headlight');
  const desk = W.placementBox(dorm.items.find(p => p.id === 'standing-desk'));
  const backpack = dorm.items.find(p => p.id === 'dorm-backpack'), bag = W.placementBox(backpack);
  const light = W.placementBox(headlight), screen = W.placementBox(monitor);
  assert.equal(headlight.y, monitor.y + modelFootprint(monitor.model).height);
  assert.equal(headlight.rot, monitor.rot);
  assert.ok(light.minZ > screen.minZ && light.maxZ < screen.maxZ && light.maxX > screen.minX && light.minX < screen.maxX);
  assert.ok(bag.minX >= desk.minX && bag.maxX <= desk.maxX && bag.minZ >= desk.minZ && bag.maxZ <= desk.maxZ);
});

test('charging outlets are wall-mounted, face into the room and do not block movement', () => {
  const { minZ, maxZ, maxX } = W.interior(dorm);
  const ports = dorm.items.filter(p => p.model === 'dorm-charging-ports');
  assert.equal(ports.length, 3);
  for (const port of ports) {
    assert.equal(port.solid, false);
    const box = W.placementBox(port), face = R.placementPoint(port, 0, 1);
    if (port.rot === 3) {
      assert.equal(box.maxX, maxX);
      assert.ok(face.x < port.x);
    } else if (port.rot === 2) {
      assert.equal(box.maxZ, maxZ);
      assert.ok(face.z < port.z);
    } else {
      assert.equal(box.minZ, minZ);
      assert.ok(face.z > port.z);
    }
  }
});

test('the WOOZOO fan spins and sends airflow out its moving grille without capturing clicks', () => {
  const prop = dorm.items.find(p => p.id === 'fan');
  const cabinet = dorm.items.find(p => p.id === 'dorm-cabinet');
  const holder = new Group(), material = new MeshBasicMaterial();
  holder.position.set(prop.x, prop.y, prop.z);
  holder.rotation.y = prop.rot * Math.PI / 2;
  const fan = makeWuzuFanView(holder, material);
  try {
    assert.equal(prop.label, 'WOOZOO fan');
    assert.equal(prop.title, prop.label);
    const placed = W.placementBox(prop), surface = W.placementBox(cabinet);
    assert.ok(placed.minX >= surface.minX && placed.maxX <= surface.maxX && placed.minZ >= surface.minZ && placed.maxZ <= surface.maxZ);
    const parked = new Box3().setFromObject(holder);
    assert.equal(parked.min.y, prop.y);
    assert.equal(parked.max.y, prop.y + modelFootprint(prop.model).height);

    fan.update(0.1, false);
    const firstZ = fan.air.children[0].position.z, firstYaw = fan.head.rotation.y, firstSpin = fan.blades.rotation.z;
    fan.update(0.45, false);
    assert.ok(fan.air.visible && fan.air.children[0].position.z > firstZ);
    assert.notEqual(fan.head.rotation.y, firstYaw);
    assert.notEqual(fan.blades.rotation.z, firstSpin);
    const origin = fan.head.getWorldPosition(new Vector3());
    const streak = fan.air.children[0].getWorldPosition(new Vector3());
    assert.ok(streak.x < origin.x - 2, 'the breeze moves away from the cabinet and into the room');
    const ray = new Raycaster(origin, streak.clone().sub(origin).normalize());
    assert.equal(ray.intersectObjects(fan.air.children).length, 0);

    fan.update(1, true);
    assert.equal(fan.head.rotation.y, 0);
    assert.equal(fan.blades.rotation.z, 0);
    assert.equal(fan.air.visible, false);
  } finally {
    fan.dispose();
    material.dispose();
  }
});

test('the offset entry, door animation, and threshold use the same opening', () => {
  const { x, z } = W.spawn(WESTERN_INDEX, 'start'), bounds = W.interior(dorm);
  const { walls, fixed } = W.buildCutawayShell(WESTERN_INDEX);
  assert.equal(x, dorm.entryX);
  assert.ok(walls.back.has(0, 12, bounds.maxZ), 'the old centered entry is filled in');
  assert.ok(!walls.back.has(x, 12, bounds.maxZ), 'the new entry has a wall opening');
  assert.ok(fixed.has(x, 0, bounds.maxZ - 2), 'the doorway mat moves with the entry');
  assert.equal(W.doorwayOpening(bounds.maxZ + 0.5, { x, z }, x), 1);
  assert.equal(W.doorwayOpening(bounds.maxZ + 0.5, { x: 0, z }, x), 0);
  assert.equal(W.step(WESTERN_INDEX, { x, z }, 0, 12, 3.5).exit, 'prev');
  assert.equal(W.step(WESTERN_INDEX, { x: 0, z }, 0, 12, 3.5).exit, null);
});

test('the double closet, low cabinet and standing desk line the right wall in entry order', () => {
  const closet = dorm.items.find(item => item.id === 'closet'), cabinet = dorm.items.find(p => p.id === 'dorm-cabinet');
  const desk = dorm.items.find(item => item.id === 'standing-desk');
  const bounds = W.interior(dorm), cells = reachable(WESTERN_INDEX, W.spawn(WESTERN_INDEX, 'start'));
  for (const prop of [closet, cabinet, desk]) {
    const box = W.placementBox(prop);
    assert.equal(prop.x, closet.x);
    assert.equal(prop.rot, 3, 'the furniture faces into the room');
    assert.ok(bounds.maxX - box.maxX <= 3, 'the back is along the wall');
    assert.ok(cells.some(p => p.x < box.minX && p.z === prop.z && W.boxDistance(box, p) <= 5), prop.model);
  }
  const boxes = [closet, cabinet, desk].map(W.placementBox);
  assert.ok(bounds.maxZ - boxes[0].maxZ <= 2, 'the closet starts against the entry wall');
  const doorRight = dorm.entryX + W.DOOR_HALF;
  assert.ok(boxes[0].minX - doorRight >= 0 && boxes[0].minX - doorRight <= 4, 'the closet begins at the right jamb');
  for (let i = 1; i < boxes.length; i++) assert.ok(boxes[i - 1].minZ - boxes[i].maxZ <= 5 && boxes[i - 1].minZ >= boxes[i].maxZ);
  assert.ok(modelFootprint(cabinet.model).height < modelFootprint(desk.model).height / 2);
});

test('the cabinet slides folded clothes into view and stops short of an occupied aisle', () => {
  const prop = dorm.items.find(item => item.id === 'dorm-cabinet'), { shell, drawers } = buildDormCabinetParts();
  const viewHolder = new Group();
  viewHolder.position.set(prop.x, 0, prop.z);
  viewHolder.rotation.y = prop.rot * Math.PI / 2;
  const view = makeDormCabinetView(prop, viewHolder, part => new Mesh(gridGeometry(part, [0, 0, -1])));
  const stand = d => R.placementPoint(prop, 0, d), near = stand(11.5), clear = stand(16);
  assert.ok(view.near(near), 'the front of the cabinet offers the action');
  assert.ok(!view.near(R.placementPoint(prop, 0, -9)), 'no action behind the cabinet');
  assert.equal(view.open, false);
  assert.equal(viewHolder.children.length, 3);
  assert.equal(drawers.length, 2);
  for (const [i, drawer] of drawers.entries()) {
    const y = i * 5 + 1;
    assert.ok(drawer.has(-4, y + 3, 7), 'closed drawer has a wooden front');
    assert.ok(!shell.has(0, y + 2, 5), 'shell leaves room for the drawer');
    assert.notEqual(drawer.get(-2, y + 2, 5), drawer.get(1, y + 2, 5), 'folded fabrics differ visibly');
  }
  view.toggle();
  assert.equal(view.open, true);
  assert.equal(view.update(0.016, true, near, 2.38), false, 'reduced motion must not snap a drawer through the player');
  const field = W.buildBallField(WESTERN_INDEX), ballStart = stand(15.5);
  field.blocks.push(...view.ballBlocks);
  const volleyAtCabinet = () => {
    const ball = V.makeBall(ballStart.x, 0, ballStart.z, 1.3);
    V.launchBall(ball, { x: 19, y: 0, z: 0 });
    V.stepBall(ball, field, 0.22);
    return ball;
  };
  assert.ok(volleyAtCabinet().vx > 0, 'the ball rolls through the clear aisle when closed');
  const inDrawerPath = V.makeBall(stand(11).x, 0, stand(11).z, 1.3);
  assert.equal(view.update(0.016, true, clear, 2.38, undefined, 0, [inDrawerPath]), false, 'the drawer does not snap through a loose ball');
  assert.equal(view.update(0.016, false, clear, 2.38), true);
  const bottom = viewHolder.children[1], top = viewHolder.children[2];
  assert.ok(bottom.position.z > 0 && bottom.position.z < 1, 'normal motion slides incrementally');
  const nextToHandle = R.placementPoint(prop, 3.5, 13);
  const clearBall = V.makeBall(nextToHandle.x, 2, nextToHandle.z, 1.3);
  assert.ok(view.update(0.016, true, clear, 2.38, undefined, 0, [clearBall]), 'a ball beside the handle does not block the drawer');
  assert.ok(bottom.position.z > top.position.z && top.position.z + 5 > 7, 'both folded stacks are carried out of the cabinet');
  const rebound = volleyAtCabinet(), drawerFront = stand(7 + bottom.position.z);
  assert.ok(rebound.vx < 0 && rebound.x + rebound.radius <= drawerFront.x &&
    rebound.x + rebound.radius > drawerFront.x - 0.5, 'the ball bounces on the wood, not the invisible space beside the handle');
  assert.ok(view.blocksMove(clear, stand(13), 2.38));
  assert.ok(!view.blocksMove(stand(13), clear, 2.38));
  for (const beat of routine.beats.filter(b => b.action === 'walk')) {
    for (let t = beat.start; t < beat.end; t += 0.05) {
      assert.ok(!view.blocks(R.sampleRoommate(routine, t), R.ROOMMATE_RADIUS), 'Richard’s routine clears the open drawer');
    }
  }
  view.toggle();
  assert.ok(view.update(0.016, true, clear, 2.38));
  assert.equal(top.position.z, 0);
  assert.ok(volleyAtCabinet().vx > 0, 'the collider retracts with the drawers');
  viewHolder.children.forEach(mesh => mesh.geometry.dispose());
});

test('my bed is on my desk’s side of the divider with a clear aisle', () => {
  const item = id => dorm.items.find(item => item.id === id);
  const bed = W.placementBox(item('ohall-bed'));
  const desks = [item('standing-desk'), item('richards-desk')];
  const [mine, richards] = desks.map(W.placementBox);
  const divider = dorm.decor.find(p => p.model === 'desk-divider'), wall = W.placementBox(divider);
  assert.ok(mine.minX - bed.maxX >= 8 && mine.minZ - bed.maxZ <= 2, 'my bed and desk leave a walking gap');
  assert.ok(richards.maxX < wall.minX && wall.maxX < bed.minX);
  assert.ok(Math.max(bed.minZ, wall.minZ, richards.minZ) < Math.min(bed.maxZ, wall.maxZ, richards.maxZ));
  assert.ok(modelFootprint(divider.model).height >= W.WALL_HEIGHT / 2);
  assert.ok(W.blocked(WESTERN_INDEX, divider.x, divider.z, 3.5));
  assert.equal(desks[1].rot, 1, 'Richard’s desk turns counterclockwise to face the center');

  const monitors = [item('monitor'), dorm.decor.find(prop => prop.model === 'monitor')];
  for (const [i, monitor] of monitors.entries()) {
    const { minX, maxX, minZ, maxZ } = W.placementBox(monitor), footprint = W.placementBox(desks[i]);
    assert.equal(monitor.rot ?? 0, desks[i].rot ?? 0);
    assert.ok(minX >= footprint.minX && maxX <= footprint.maxX && minZ >= footprint.minZ && maxZ <= footprint.maxZ);
  }
});

test('the headphones, figurines and snack collection sit on reachable furniture', () => {
  const item = id => dorm.items.find(p => p.id === id);
  const cabinet = item('dorm-cabinet');
  const desk = item('standing-desk'), nightstand = item('richards-nightstand');
  for (const [prop, furniture, y] of [
    [item('dorm-headphones'), desk, 18], [item('smiskis'), desk, 32], [item('dorm-snacks'), cabinet, 12],
    ...dorm.decor.filter(p => p.model === 'dorm-snacks').map(p => [p, p.y === 32 ? desk : nightstand, p.y]),
  ]) {
    const box = W.placementBox(prop), surface = W.placementBox(furniture);
    assert.equal(prop.y, y);
    assert.equal(buildModel(prop.model).bounds().minY, 0);
    assert.equal(prop.solid, false);
    assert.ok(box.minX >= surface.minX && box.maxX <= surface.maxX && box.minZ >= surface.minZ && box.maxZ <= surface.maxZ, prop.model);
  }
  assert.equal(modelFootprint(nightstand.model).height, 10);
});

test('the upper shelf holds eight mini Smiskis with clear space between poses', () => {
  const smiskis = dorm.items.find(p => p.id === 'smiskis'), desk = dorm.items.find(p => p.id === 'standing-desk');
  const figurines = buildModel(smiskis.model), shelf = buildModel(desk.model), footprint = W.placementBox(smiskis);
  assert.ok(modelFootprint(smiskis.model).height < 2);
  const columns = new Set();
  figurines.forEach(x => columns.add(x));
  assert.equal([...columns].filter(x => !columns.has(x - 1)).length, 8);
  for (const x of [footprint.minX, footprint.maxX - 0.1]) for (const z of [footprint.minZ, footprint.maxZ - 0.1]) {
    assert.ok(shelf.has(Math.floor(z - desk.z), smiskis.y - 1, Math.floor(desk.x - x)), 'the upper shelf supports the figurines');
  }
});

test('the Western wardrobes have closed wooden doors over drawers', () => {
  const closet = buildModel('closet'), size = modelFootprint('closet');
  assert.ok(size.maxX - size.minX >= 44 && size.height >= 30);
  for (const x of [-23, 1]) {
    for (const door of [x + 1, x + 11]) {
      for (let col = door; col < door + 9; col++) assert.ok(closet.has(col, 20, 7), 'door face is closed');
      assert.ok(closet.has(door + (door === x + 1 ? 7 : 1), 19, 8), 'door has a pull');
    }
    for (const y of [2, 6]) assert.ok(closet.has(x + 10, y, 8), 'drawer has a pull');
  }
});

test('Western has light walls, warm carpet, curtained windows, and a clear entry switch', () => {
  const room = CHAPTERS[WESTERN_INDEX], bounds = W.interior(room);
  const { fixed, walls } = W.buildCutawayShell(WESTERN_INDEX);
  const rgb = c => [c >> 16, (c >> 8) & 255, c & 255];
  assert.equal(room.floor, 'carpet');
  assert.ok(rgb(walls.left.get(bounds.minX - 1, 23, 0)).every(channel => channel > 215));
  const [r, g, b] = rgb(fixed.get(0, -1, 0));
  assert.ok(r > g && g > b && b >= 108 && r < 165, 'warm gray floor');
  for (const x of [-31, 35, 56]) {
    const [red, green, blue] = rgb(walls.front.get(x, 22, bounds.minZ + 2));
    assert.ok(red > green && green > blue && blue > 130, 'beige curtain stays with the cutaway wall');
  }
  const mine = W.placementBox(room.items.find(item => item.id === 'ohall-bed'));
  assert.ok(35 - mine.maxX > 0 && 35 - mine.maxX <= 4, 'the window and curtains start just to the right of the bed');
  for (let x = mine.minX; x < mine.maxX; x++) assert.ok(!walls.front.has(x, 22, bounds.minZ + 2), 'no curtain sits directly over the bed');
  assert.equal(room.decor.filter(prop => prop.model === 'dorm-chair').length, 2);
  const bed = W.placementBox(room.items.find(item => item.id === 'richards-bed'));
  assert.ok(room.roommate.x >= bed.minX && room.roommate.x <= bed.maxX &&
    room.roommate.z >= bed.minZ && room.roommate.z <= bed.maxZ, 'Richard starts on his own bed');
  const sw = room.items.find(item => item.id === WESTERN_LIGHT_SWITCH_ID);
  assert.equal(sw.solid, false);
  const entrance = W.spawn(WESTERN_INDEX, 'forward');
  assert.ok(reachable(WESTERN_INDEX, entrance).some(point =>
    Math.hypot(point.x - entrance.x, point.z - entrance.z) < 12 && W.nearestItem(WESTERN_INDEX, point)?.id === sw.id
  ), 'the switch is the primary interaction beside the entry');
});

test('the dorm switch only changes the two desk lamps, light pools, and its own rocker', () => {
  const geometries = new Map();
  const geometry = model => {
    if (!geometries.has(model)) geometries.set(model, gridGeometry(buildModel(model)));
    return geometries.get(model);
  };
  const lighting = makeDormLighting(geometry);
  const room = CHAPTERS[WESTERN_INDEX], models = [...room.items, ...room.decor].map(p => p.model);
  const fixtures = ['dorm-light-switch', 'desk-lamp'];
  const entries = [...fixtures.flatMap(model => models.filter(m => m === model)), 'standing-desk', 'monitor', 'monitor-headlight'].map(model => {
    const holder = new Group(), mesh = new Mesh(geometry(model));
    holder.add(mesh);
    lighting.add(model, holder);
    return { model, mesh, pool: holder.children[1] };
  });
  const check = enabled => {
    assert.equal(lighting.enabled, enabled);
    for (const { model, mesh, pool } of entries) {
      assert.equal(mesh.geometry, geometry(model === 'desk-lamp' && !enabled ? 'desk-lamp-off' :
        model === 'dorm-light-switch' && enabled ? 'dorm-light-switch-on' : model), model);
      assert.equal(mesh.visible, true, 'fixture itself remains visible');
      if (model === 'desk-lamp') assert.equal(pool.visible, enabled);
      else if (model === 'monitor-headlight') assert.equal(pool.visible, true, 'the monitor light is independent');
      else assert.equal(pool, undefined);
    }
  };
  assert.equal(entries.filter(({ model, pool }) => model === 'desk-lamp' && pool).length, 2);
  check(false);
  lighting.toggle();
  check(true);
  lighting.toggle();
  check(false);
  lighting.dispose();
  for (const g of geometries.values()) g.dispose();
});

test('the story runs from age 7 to 18 with the requested outfits', () => {
  assert.equal(CHAPTERS[0].ageFrom, 7);
  assert.equal(CHAPTERS.at(-1).ageTo, 18);
  for (let i = 1; i < CHAPTERS.length; i++) assert.ok(CHAPTERS[i].ageFrom <= CHAPTERS[i - 1].ageTo + 1 && CHAPTERS[i].ageFrom >= CHAPTERS[i - 1].ageTo, CHAPTERS[i].id);
  assert.deepEqual(CHAPTERS.map(c => c.outfit), ['kid', 'kid', 'starwars', 'starwars', 'stussy', 'western']);
  for (let age = 8; age <= 18; age++) assert.ok(avatarHeight(age) > avatarHeight(age - 1), `grows at ${age}`);
  for (const outfit of ['kid', 'starwars', 'stussy', 'western']) for (const age of [7, 11, 15, 18]) {
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
  const room = W.interior(JOURNEY_ROOMS[index]);
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
    const arrows = index === WESTERN_INDEX ? W.journeyArrows(index) : [];
    for (const arrow of arrows) p = W.step(index, p, arrow.x - p.x, arrow.z - p.z, 3.5);
    for (let i = 0; i < 400 && !exit; i++) { const r = W.step(index, p, 0, -0.8, 3.5); exit = r.exit; p = r; }
    assert.equal(exit, 'next', `${chapter.id} forward`);
    if (index === 0) return;
    p = W.spawn(index, 'back'); exit = null;
    if (arrows.length) {
      const entry = W.spawn(index, 'forward');
      for (const arrow of [...arrows].reverse().slice(1).concat(entry)) p = W.step(index, p, arrow.x - p.x, arrow.z - p.z, 3.5);
    }
    for (let i = 0; i < 400 && !exit; i++) { const r = W.step(index, p, 0, 0.8, 3.5); exit = r.exit; p = r; }
    assert.equal(exit, 'prev', `${chapter.id} back`);
  });
});

test('the CSA poster is a reachable walk-in portal without changing the six chapters', () => {
  assert.equal(CHAPTERS.length, 6);
  assert.equal(JOURNEY_ROOMS[CSA_ROOM_INDEX].id, 'csa-after-hours');
  const dorm = CHAPTERS[WESTERN_INDEX], radius = 3.5 * W.AVATAR_SCALE;
  const poster = dorm.items.find(item => item.id === CSA_POSTER_ID);
  const returnSpot = W.spawn(WESTERN_INDEX, 'portal');
  assert.equal(returnSpot.z, poster.z);
  assert.ok(!W.blocked(WESTERN_INDEX, returnSpot.x, returnSpot.z, radius));
  assert.ok(reachable(WESTERN_INDEX, W.spawn(WESTERN_INDEX, 'forward'), radius)
    .some(p => p.x === returnSpot.x && p.z === returnSpot.z));
  assert.ok(W.nearbyItems(WESTERN_INDEX, returnSpot).some(item => item.id === CSA_POSTER_ID));
  assert.equal(W.step(WESTERN_INDEX, returnSpot, -12, 0, radius).exit, 'party');
  let approach = returnSpot;
  for (let i = 0; i < 60 && !approach.exit; i++) approach = W.step(WESTERN_INDEX, approach, -0.19, 0, radius);
  assert.equal(approach.exit, 'party', 'normal frame-sized movement also enters');
  assert.equal(W.step(WESTERN_INDEX, returnSpot, 2, 0, radius).exit, null);
  const otherPoster = dorm.items.find(item => item.id === 'wds');
  assert.equal(W.step(WESTERN_INDEX, { ...returnSpot, z: otherPoster.z }, -12, 0, radius).exit, null);
});

test('CSA After Hours has a clear return door and a closed wall behind the DJ', () => {
  const radius = 3.5 * W.AVATAR_SCALE, spawn = W.spawn(CSA_ROOM_INDEX, 'portal');
  assert.ok(!W.blocked(CSA_ROOM_INDEX, spawn.x, spawn.z, radius));
  assert.equal(spawn.yaw, Math.PI);
  const bounds = W.interior(JOURNEY_ROOMS[CSA_ROOM_INDEX]);
  assert.equal(W.step(CSA_ROOM_INDEX, spawn, 0, bounds.maxZ - spawn.z + 2, radius).exit, 'prev');
  assert.ok(W.blocked(CSA_ROOM_INDEX, 0, bounds.minZ - 2, radius));
  const shell = W.buildRoomShell(CSA_ROOM_INDEX);
  assert.ok(shell.has(0, 5, bounds.minZ - 1), 'no door opening in the stage wall');
  assert.ok(!shell.has(0, 5, bounds.maxZ), 'the return doorway is open in the shell');
});

test('the auditorium has three rows, a clear center aisle, barber furniture, and loose drinks', () => {
  const hall = JOURNEY_ROOMS[CSA_ROOM_INDEX], radius = 3.5 * W.AVATAR_SCALE;
  assert.ok(hall.width * hall.depth > 180 * 148);
  assert.equal(hall.floor, 'auditorium');
  const cells = reachable(CSA_ROOM_INDEX, W.spawn(CSA_ROOM_INDEX, 'portal'), radius);
  assert.ok(cells.some(p => p.x === 0 && p.z === -44), 'a direct approach to the stage is open');
  const logo = hall.decor.find(prop => prop.model === 'csa-stage-logo');
  assert.ok(logo.y >= 20 && logo.solid === false);
  assert.equal(buildModel(logo.model).size, buildModel('poster-csa').size);
  const rows = hall.decor.filter(prop => prop.model === 'csa-seat-row');
  assert.deepEqual([...new Set(rows.map(({ z }) => z))], [40, 55, 70]);
  assert.equal(buildModel('csa-seat-row').get(0, 6, 0), 0xf5f0ec, 'white cushions');
  assert.equal(buildModel('csa-seat-row').get(0, 13, -3), 0xfffcf5, 'white seat backs');
  for (const row of rows) {
    assert.equal(row.rot, 2, 'seats face the stage');
    assert.ok(W.blocked(CSA_ROOM_INDEX, row.x, row.z, radius));
    assert.ok(!W.blocked(CSA_ROOM_INDEX, 0, row.z, radius));
  }
  const chair = hall.decor.find(prop => prop.model === 'csa-barber-chair'), bounds = W.placementBox(chair);
  assert.ok(cells.some(p => W.boxDistance(bounds, p) < radius + 2), 'you can walk up to the haircut');
  assert.ok(W.blocked(CSA_ROOM_INDEX, chair.x, chair.z, radius));
  const drinks = hall.decor.filter(prop => /cup|bottle/.test(prop.model));
  assert.equal(new Set(drinks.map(prop => prop.model)).size, 3);
  assert.ok(drinks.length >= 8);
  for (const drink of drinks) {
    assert.equal(drink.solid, false);
    assert.ok(buildModel(drink.model).size > 50);
  }
});

test('the original guests, execs, and pictured advisors have space for their activities', () => {
  assert.deepEqual(CSA_GUESTS.map(guest => guest.name), [
    'Jason Zhuang', 'Rain Li', 'Amelie Hu', 'Lydia Zheng', 'Daniel Su', 'Lucas Xue', 'Jeffrey Ban', 'William Wang',
    'Kevin Li', 'Selina Lim', 'Gloria Huang', 'Cassidy Lee', 'Jessica Zhang', 'Callista Chan', 'Michael Tan',
    'Harry Yang', 'Sarah Gao', 'Melissa Zhang', 'Tanya Mai', 'Ava Cheh', 'Aleena Liu', 'Kate Chen', 'Ray Shen',
    'Luca Fukuyo', 'Vincent Zheng', 'Tony Zhang', 'Jiayi Hong', 'Austin Sun', 'Tiffany Zhao', 'Zong Xie', 'Nuo Zhang', 'Zoie Mao',
  ]);
  assert.deepEqual(CSA_GUESTS.filter(guest => guest.role === 'President').map(guest => guest.name), ['Selina Lim', 'Gloria Huang']);
  assert.deepEqual(CSA_GUESTS.filter(guest => guest.role === 'Senior advisor').map(guest => guest.name), [
    'Luca Fukuyo', 'Vincent Zheng', 'Tony Zhang', 'Jiayi Hong', 'Austin Sun', 'Tiffany Zhao', 'Zong Xie',
  ]);
  assert.ok(CSA_GUESTS.find(guest => guest.name === 'Amelie Hu').scale < 0.85);
  assert.ok(CSA_GUESTS.find(guest => guest.name === 'Lydia Zheng').scale < 0.82);
  assert.deepEqual(CSA_GUESTS.filter(guest => guest.dj).map(guest => guest.name), ['Rain Li']);
  const walkers = CSA_GUESTS.map((guest, i) => ({ guest, i })).filter(({ guest }) => guest.walk);
  assert.equal(walkers.length, 26);
  assert.deepEqual(CSA_GUESTS.filter(guest => csaActivityLabel(guest) === 'Boulders').map(guest => guest.name).sort(), [...CLIMBER_NAMES].sort());
  assert.equal(new Set(walkers.map(({ guest }) => csaActivityLabel(guest))).size, 9);
  assert.equal(CSA_GUESTS.find(guest => guest.name === 'Kevin Li').activity, 'tablet');
  for (const [i, guest] of CSA_GUESTS.entries()) {
    assert.deepEqual(sampleCsaGuest(guest, i, 0, true), sampleCsaGuest(guest, i, 3, true));
  }
  CSA_GUESTS.forEach((guest, index) => {
    for (const other of CSA_GUESTS.slice(index + 1)) {
      const x = Math.max(0, Math.abs(guest.x - other.x) - (guest.walk?.[0] ?? 0) - (other.walk?.[0] ?? 0));
      const z = Math.max(0, Math.abs(guest.z - other.z) - (guest.walk?.[1] ?? 0) - (other.walk?.[1] ?? 0));
      assert.ok(Math.hypot(x, z) > 5, guest.name + ' and ' + other.name + ' have separate routes even if one yields');
    }
  });
  for (const { guest, i } of walkers) {
    let works = false, walks = false;
    for (let time = 0; time < 30; time += 0.11) {
      const at = sampleCsaGuest(guest, i, time, false), next = sampleCsaGuest(guest, i, time + 0.01, false);
      assert.ok(!W.blocked(CSA_ROOM_INDEX, at.x, at.z, 2.5), guest.name);
      const dx = next.x - at.x, dz = next.z - at.z;
      if (Math.hypot(dx, dz) > 0.004) {
        walks = true;
        assert.ok(dx * Math.sin(at.yaw) + dz * Math.cos(at.yaw) > 0, guest.name + ' faces their stride');
      } else if (at.step === 0 && at.right < -0.45) works = true;
    }
    assert.ok(walks && works, guest.name + ' stops to perform a gesture');
  }
});

test('the CSA volleyball show picks different guests, doubles each strike, and stops at 32', () => {
  const field = { minX: -50, maxX: 50, minZ: -50, maxZ: 50, ceiling: 38, blocks: [] };
  const counts = [], hit = new Set();
  let draws = 0;
  const show = makeCsaVolley(field, { x: 0, z: 0 }, 1.75, () => ([0.18, 0.77, 0.4][draws++ % 3]));
  const guests = [-22, -12, 12, 22].map(x => ({
    position: { x, z: 13 }, chest: 13, react: () => hit.add(x),
  }));
  const dt = 1 / 120, hand = () => ({ x: 0, y: 25, z: 2 });
  const until = (seconds, reduced = false) => {
    for (let i = 0; i < Math.round(seconds / dt); i++) show.update(dt, reduced, guests, hand);
  };
  until(4, true);
  assert.equal(draws, 0);
  assert.equal(show.count, 1);
  for (let wave = 0; wave < 6; wave++) {
    until(CSA_VOLLEY_INTERVAL);
    counts.push(show.count);
  }
  assert.deepEqual(counts, [1, 2, 4, 8, 16, 32]);
  assert.equal(draws, 63, 'exactly one target selection per launch');
  assert.deepEqual([...hit].sort((a, b) => a - b), [-22, -12, 12, 22]);
  until(8);
  assert.equal(show.count, 32);
  assert.equal(draws, 63, 'no extra launches after the final wave');
  assert.ok(show.balls.every(({ state }) => state.grounded && state.y >= state.radius));
  show.reset();
  assert.equal(show.count, 1);
  until(CSA_VOLLEY_INTERVAL * 2);
  assert.equal(show.count, 2, 're-entry can replay the show');
});

test('Zoie’s visible toss meets her jumping hand and the final 32 balls stay inside CSA', t => {
  const document = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  t.after(() => { if (document) globalThis.document = document; else delete globalThis.document; });
  const material = new MeshBasicMaterial({ vertexColors: true });
  const party = makeCsaParty(material, material, () => 0, () => 0.3);
  t.after(() => { party.dispose(); material.dispose(); });
  const zoie = CSA_GUESTS.find(guest => guest.name === 'Zoie Mao');
  assert.equal(csaActivityLabel(zoie), 'Spikes multiplying volleyballs');
  assert.ok(!W.blocked(CSA_ROOM_INDEX, zoie.x, zoie.z, 2.5));
  for (const guest of CSA_GUESTS.filter(guest => guest.walk)) {
    const x = Math.max(0, Math.abs(zoie.x - guest.x) - guest.walk[0]);
    const z = Math.max(0, Math.abs(zoie.z - guest.z) - guest.walk[1]);
    assert.ok(Math.hypot(x, z) > 5, guest.name + ' clears the spike spot');
  }
  const avatar = party.group.getObjectByName(zoie.name);
  const hand = avatar.getObjectByName('Right forearm');
  const balls = party.group.getObjectByName('Zoie’s volleyballs').children;
  const viewer = W.spawn(CSA_ROOM_INDEX, 'portal');
  party.update(V.SPIKE.contact - 0.01, false, viewer);
  const toss = balls[0].position.clone();
  party.resetVolleyballs();
  party.update(V.SPIKE.contact, false, viewer);
  assert.ok(avatar.children[0].position.y > 5, 'Zoie jumps to strike');
  hand.geometry.computeBoundingBox();
  const palm = hand.localToWorld(new Vector3(0, hand.geometry.boundingBox.min.y + AVATAR_VOXEL_SIZE, 0));
  assert.ok(balls[0].position.distanceTo(palm) < 2, 'the ball launches at her palm');
  assert.ok(balls[0].position.distanceTo(toss) < 1, 'the toss and launch do not jump apart');
  const field = W.buildBallField(CSA_ROOM_INDEX);
  for (let frame = 0; frame < 20 * 60; frame++) party.update(1 / 60, false, viewer);
  assert.equal(balls.filter(ball => ball.visible).length, 32);
  for (const ball of balls) {
    const { x, y, z } = ball.position;
    assert.ok(x > field.minX && x < field.maxX && z > field.minZ && z < field.maxZ && y > 0 && y < field.ceiling);
  }
  party.resetVolleyballs();
  party.update(8, true, viewer);
  assert.equal(balls.filter(ball => ball.visible).length, 1);
  assert.equal(avatar.children[0].position.y, 0, 'reduced motion does not jump');
});

test('the black CSA tee has only a small chest wordmark and larger cat artwork on the back', () => {
  const { torso, shirtPrint, legL } = buildAvatar(18, 'csa');
  assert.ok(SHIRT_PRINT_VOXEL_SIZE < AVATAR_VOXEL_SIZE);
  const front = new Grid();
  let back = 0;
  shirtPrint.forEach((x, y, z, color) => {
    assert.ok(torso.has(Math.floor(x / 4), Math.floor(y / 4), z > 0 ? 3 : -4), 'ink is on the shirt');
    if (z === 16) front.set(x, y, z, color);
    else { assert.equal(z, -17); back++; }
  });
  const bounds = front.bounds();
  const glyphStarts = [-1, 3, 7, 11, 15, 21];
  assert.ok(glyphStarts.every(x => [0, 1, 2].some(dx => front.has(x + dx, bounds.maxY, 16))));
  assert.equal(bounds.maxY - bounds.minY + 1, 4, 'small lowercase wordmark');
  assert.ok(bounds.minX >= -1 && bounds.minY > torso.bounds().maxY * 2);
  assert.ok(back > front.size * 3);
  legL.forEach((_x, _y, _z, color) => assert.ok(color <= 0x363636));
});

test('reference-based hairstyles have distinct silhouettes', () => {
  const guest = name => buildCsaGuest(CSA_GUESTS.find(entry => entry.name === name));
  const jason = guest('Jason Zhuang'), william = guest('William Wang');
  assert.ok(william.head.bounds().maxY > jason.head.bounds().maxY, 'William has taller tousled tips');
  assert.equal(jason.head.get(-10, 4, 2), 0xf8fdff, 'left diamond stud');
  assert.equal(jason.head.get(9, 4, 2), 0xf8fdff, 'right diamond stud');
  assert.notEqual(jason.head.get(-8, 5, -4), jason.head.get(-8, 9, -4), 'the fade starts low near the ear');
  assert.ok(guest('Lydia Zheng').head.bounds().minY < guest('Amelie Hu').head.bounds().minY, 'Lydia has longer straight hair');
  assert.equal(william.torso.get(2, 21, 3), 0xe1ded7, 'the silver chain is on the chest');
  const isBrown = color => {
    const red = color >> 16, green = color >> 8 & 255, blue = color & 255;
    return red > 62 && red < 147 && red > green && red < green * 1.5 && green > blue;
  };
  assert.ok(isBrown(guest('Lydia Zheng').head.get(0, -14, -8)), 'Lydia has warm brown, not ginger hair');
  assert.ok(isBrown(guest('Ray Shen').head.get(0, 15, 0)), 'Ray has brown hair');
  const amelie = guest('Amelie Hu').head;
  assert.ok((amelie.get(0, 16, 0) >> 16) < 49, 'Amelie has black roots');
  assert.ok(isBrown(amelie.get(0, -13, -8)), 'Amelie has brown dyed ends');
  assert.ok(guest('Gloria Huang').head.bounds().minY < guest('Selina Lim').head.bounds().minY, 'Gloria’s waves are longer');
  assert.equal(guest('Selina Lim').head.get(9, 3, 5), 0xffefdc, 'Selina has hoop earrings');
  const { head } = guest('Rain Li');
  assert.ok(head.has(0, 22, 5), 'fluffy fringe rises above the old crown');
  assert.ok(head.has(-12, 8, 0) && head.has(11, 8, 0) && head.has(0, 27, 0), 'padded ear cups and arched band');
});

test('the DJ console holds a mixing-screen laptop and is flanked by white twin-ring towers', () => {
  const stage = JOURNEY_ROOMS[CSA_ROOM_INDEX].decor;
  const laptop = stage.find(prop => prop.model === 'csa-dj-macbook');
  const table = W.placementBox(stage.find(prop => prop.model === 'csa-dj-booth'));
  const laptopBox = W.placementBox(laptop);
  assert.equal(laptop.rot, 2, 'DJ sees the laptop display');
  assert.equal(laptop.y, 13);
  assert.ok(laptopBox.minX > table.minX && laptopBox.maxX < table.maxX);
  assert.ok(laptopBox.minZ > table.minZ && laptopBox.maxZ < table.maxZ);
  assert.equal(buildModel(laptop.model).get(-16, 21, -11), 0x79e3dc, 'waveform overlay');
  assert.equal(stage.filter(prop => prop.model === 'csa-speaker').length, 4);
  const speaker = buildModel('csa-speaker');
  assert.equal(speaker.get(-10, 22, 2), 0xece9e7, 'white shell');
  assert.equal(speaker.get(0, 22, 8), 0x88e7e5, 'lower light ring');
  assert.equal(speaker.get(0, 44, 8), 0xaeb9fc, 'upper light ring');
});

test('neither laptop has MacBook lettering on its chassis or object label', () => {
  const school = ALL_ITEMS.find(item => item.id === 'laptop');
  const dj = JOURNEY_ROOMS[CSA_ROOM_INDEX].decor.find(prop => prop.model === 'csa-dj-macbook');
  assert.doesNotMatch(school.label, /macbook/i);
  for (const { model } of [school, dj]) {
    const laptop = buildModel(model);
    laptop.forEach((_x, _y, z) => assert.ok(z < 12, 'no lettering protrudes from the front lip'));
  }
});

test('Lucas wears black athletic shorts and Daniel has a swept side part, both with the CSA tee', () => {
  const lucas = CSA_GUESTS.find(guest => guest.name === 'Lucas Xue');
  const daniel = CSA_GUESTS.find(guest => guest.name === 'Daniel Su');
  const cropped = buildCsaGuest(lucas), parted = buildCsaGuest(daniel);
  assert.ok(lucas.scale > daniel.scale);
  assert.ok(cropped.head.bounds().maxY > parted.head.bounds().maxY, 'Lucas has a textured crop');
  assert.ok(!parted.head.has(7, 0, 7), 'Daniel has a rounded jaw');
  const calf = -2 * cropped.hip + 6;
  assert.equal(cropped.legL.get(-4, calf, 0), lucas.skin);
  assert.ok(parted.legL.get(-4, calf, 0) < 0x303030, 'Daniel keeps long black pants');
  assert.deepEqual(cropped.shirtPrint.cells, parted.shirtPrint.cells);
});

test('the DJ meshes can be picked and the same URL is available by the booth', t => {
  const document = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  t.after(() => { if (document) globalThis.document = document; else delete globalThis.document; });
  const material = new MeshBasicMaterial({ vertexColors: true });
  const party = makeCsaParty(material, material), dj = CSA_GUESTS.find(guest => guest.dj);
  t.after(() => { party.dispose(); material.dispose(); });
  party.update(0, true, { x: 0, z: CSA_STAGE_Z + 10 });
  party.group.updateMatrixWorld(true);
  const ray = new Raycaster(new Vector3(dj.x, 21, dj.z + 18), new Vector3(0, 0, -1));
  const hit = ray.intersectObjects(party.djPickables, false)[0];
  assert.ok(hit?.object.userData.csaDj);
  assert.ok(party.nearDj({ x: 0, z: CSA_STAGE_Z + 10 }));
  assert.ok(!party.nearDj(W.spawn(CSA_ROOM_INDEX, 'portal')));
  assert.equal(CSA_DJ_LINK.href, 'https://wewantdrought.me');
});

test('Rain cues his headphones and works the mixer', () => {
  assert.deepEqual(sampleCsaDj(0, true), sampleCsaDj(6, true));
  assert.ok(sampleCsaDj(2.8, false).right.y > 21, 'Rain reaches for his headphones');
  assert.ok(sampleCsaDj(0.3, false).right.y < 17, 'Rain works the mixer');
  assert.notEqual(sampleCsaDj(0.3, false).vinyl, sampleCsaDj(0, false).vinyl);
});

test('Kevin carries a tablet and the disco lighting stays still in reduced motion', t => {
  const oldDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  t.after(() => { if (oldDocument) globalThis.document = oldDocument; else delete globalThis.document; });
  const material = new MeshBasicMaterial({ vertexColors: true }), party = makeCsaParty(material, material);
  t.after(() => { party.dispose(); material.dispose(); });
  const kevin = party.group.getObjectByName('Kevin Li'), tablet = kevin.getObjectByName('Checks production cues');
  assert.ok(tablet.isMesh && tablet.parent.isMesh, 'Kevin carries his tablet in his hand');
  const william = party.group.getObjectByName('William Wang');
  assert.ok(kevin.getObjectByName('Head').getWorldPosition(new Vector3()).y > 1.12 * william.getObjectByName('Head').getWorldPosition(new Vector3()).y, 'Kevin stands visibly taller');
  const disco = party.group.getObjectByName('Disco ball'), reflection = party.group.getObjectByName('Disco reflection');
  assert.equal(buildCsaDiscoBall().bounds().maxY, 11);
  assert.ok(disco.position.y > 32 && disco.position.z > CSA_STAGE_Z);
  party.update(0, true, { x: 0, z: 80 });
  const still = reflection.position.clone();
  party.update(1, true, { x: 0, z: 80 });
  assert.equal(disco.rotation.y, 0);
  assert.ok(reflection.position.equals(still));
  party.update(1, false, { x: 0, z: 80 });
  assert.ok(disco.rotation.y > 0 && !reflection.position.equals(still));
});

test('Lucas keeps the moving clippers near Jason’s low fade', t => {
  assert.deepEqual(sampleCsaCut(0, true), sampleCsaCut(6, true));
  const oldDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  t.after(() => { if (oldDocument) globalThis.document = oldDocument; else delete globalThis.document; });
  const material = new MeshBasicMaterial({ vertexColors: true }), party = makeCsaParty(material, material);
  t.after(() => { party.dispose(); material.dispose(); });
  const client = party.group.getObjectByName('Jason Zhuang'), tool = party.group.getObjectByName('Lucas’s clippers');
  const head = client.getObjectByName('Head'), thigh = client.getObjectByName('Seated thigh');
  const at = { x: -51, z: -3 };
  for (let time = 0; time < 3; time += 0.1) {
    party.update(time === 0 ? 0 : 0.1, false, at);
    assert.equal(thigh.rotation.x, -Math.PI / 2);
    assert.ok(Math.abs(thigh.getWorldPosition(new Vector3()).y - CSA_BARBER_SEAT) < 0.1);
    const tip = new Vector3(0, 1.86, 0).applyQuaternion(tool.quaternion).add(tool.position);
    const blade = sampleCsaCut(time, false).blade;
    assert.ok(tip.distanceTo(new Vector3(blade.x, blade.y, blade.z)) < 0.65);
    assert.ok(tip.distanceTo(head.getWorldPosition(new Vector3())) < 6.1);
    assert.ok(Math.abs(tip.x - CSA_BARBER_CHAIR.x) < 2);
  }
});

test('the vertical wall has four single-color routes above a shared crash mat', () => {
  const { grid, holds, mat } = buildBoulderingWall();
  const wallX = grid.bounds().minX;
  assert.equal(wallX, grid.bounds().maxX, 'wall has no overhang');
  assert.equal(new Set(BOULDER_LANES.flatMap(lane => lane.courses.map(course => course.color))).size, 4);
  for (const lane of BOULDER_LANES) for (const course of lane.courses) {
    const start = sampleBouldering(lane, course, 0, false), top = sampleBouldering(lane, course, BOULDER_TOP_TIME, false);
    assert.ok(top.hips.y > start.hips.y + 18);
    assert.equal(top.hips.z, start.hips.z, 'climbs in its own lane');
    assert.deepEqual(sampleBouldering(lane, course, BOULDER_CYCLE, false), start, 'descends to the mat before another route');
    assert.deepEqual(sampleBouldering(lane, course, 0, true), sampleBouldering(lane, course, 60, true));
    for (const { x, y, z } of [start.grip[1], start.grip[3]]) {
      assert.equal(y, (mat.bounds().maxY + 1) * MAT_VOXEL_HEIGHT);
      assert.ok(mat.has(Math.floor(x), 2, Math.floor(z)));
    }
    const rocks = course.holds.flat();
    for (const { x, y, z } of rocks) {
      assert.equal(holds.get(Math.floor(x * 2), Math.floor(y * 2), Math.floor(z * 2)), course.color);
    }
    for (let time = 0; time <= BOULDER_TOP_TIME; time += 0.041) {
      const { grip } = sampleBouldering(lane, course, time, false);
      const moving = grip.filter(point => !rocks.some(({ x, y, z }) =>
        Math.hypot(x - point.x, y - point.y, z - point.z) < 1e-6));
      if (time > 3) assert.ok(moving.length <= 1, 'at least three limbs stay on their selected color');
      assert.ok(grip.every(point => point.x < wallX));
    }
  }
});

test('both climbers reach their randomly selected holds without intersecting each other', t => {
  const oldDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  t.after(() => { if (oldDocument) globalThis.document = oldDocument; else delete globalThis.document; });
  let draws = 0;
  const material = new MeshBasicMaterial({ vertexColors: true });
  const party = makeCsaParty(material, material, () => draws++ < 2 ? 0 : 0.99);
  t.after(() => { party.dispose(); material.dispose(); });
  const viewer = { x: 77, z: 0 };
  const climbers = CLIMBER_NAMES.map(name => {
    const avatar = party.group.getObjectByName(name);
    const limbs = ['Left forearm', 'Left climbing shoe', 'Right forearm', 'Right climbing shoe'].map(name => avatar.getObjectByName(name));
    limbs.forEach(limb => limb.geometry.computeBoundingBox());
    return { avatar, limbs };
  });
  const bounds = [new Box3(), new Box3()];
  const wallX = buildBoulderingWall().grid.bounds().minX;
  const dt = BOULDER_CYCLE / 250;
  for (let frame = 0; frame < 500; frame++) {
    const time = frame * dt;
    party.update(frame ? dt : 0, false, viewer);
    climbers.forEach(({ avatar, limbs }, index) => {
      const lane = BOULDER_LANES[index], elapsed = Math.max(0, time - lane.delay);
      const course = lane.courses[Number(elapsed >= BOULDER_CYCLE)];
      const pose = sampleBouldering(lane, course, elapsed % BOULDER_CYCLE, false);
      assert.ok(Math.abs(avatar.position.y - pose.hips.y) < 1e-6 && avatar.children[0].rotation.x === 0);
      limbs.forEach((limb, slot) => {
        const { x, y, z } = pose.grip[slot];
        const box = limb.geometry.boundingBox;
        const tip = limb.localToWorld(slot % 2
          ? new Vector3(0, box.min.y, box.max.z - AVATAR_VOXEL_SIZE / 2)
          : new Vector3(0, box.min.y + AVATAR_VOXEL_SIZE, 0));
        const distance = tip.distanceTo(new Vector3(x, y, z));
        assert.ok(distance < 0.8, `${avatar.name} ${limb.name} misses its grip by ${distance.toFixed(2)} at ${time.toFixed(2)} s`);
      });
      bounds[index].setFromObject(avatar, true);
      assert.ok(bounds[index].max.x <= wallX, `${avatar.name} clips the wall at ${time.toFixed(2)} s (x=${bounds[index].max.x.toFixed(2)})`);
    });
    assert.ok(!bounds[0].intersectsBox(bounds[1]), 'all rendered limbs stay in their own lane');
  }
  assert.equal(draws, 4, 'each climber reselects once while on the mat');
  assert.equal(party.group.getObjectByName('Bouldering crash mat').scale.y, MAT_VOXEL_HEIGHT);
  assert.ok(!W.blocked(CSA_ROOM_INDEX, viewer.x, viewer.z, 2));
});

test('the floating arrows mark the walkable aisle from every spawn to its exit', () => {
  for (const [index, chapter] of CHAPTERS.entries()) {
    let p = W.spawn(index, 'forward');
    const arrows = W.journeyArrows(index), radius = 3.5 * W.AVATAR_SCALE;
    assert.equal(arrows[0].z, p.z - 8);
    for (const arrow of arrows) {
      assert.ok(arrow.z < p.z, chapter.id + ' points forward');
      p = W.step(index, p, arrow.x - p.x, arrow.z - p.z, radius);
      assert.ok(Math.hypot(p.x - arrow.x, p.z - arrow.z) < 0.001, chapter.id + ' has a clear route');
      assert.equal(p.exit, null);
    }
    assert.equal(W.step(index, p, 0, -7, radius).exit, 'next');
  }
});

test('walls and furniture stop the player', () => {
  const room = W.interior(CHAPTERS[1]);
  const r = W.step(1, { x: 0, z: 0 }, -200, 0, 3);
  assert.ok(r.x >= room.minX + 3 - 1e-9);
  const desk = W.placementBox(CHAPTERS[1].items.find(i => i.id === 'chess'));
  assert.ok(W.blocked(1, (desk.minX + desk.maxX) / 2, (desk.minZ + desk.maxZ) / 2, 3));
});
