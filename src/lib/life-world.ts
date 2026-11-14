import { LIFE_STORIES } from "./life-stories";

export type Point = { x: number; y: number };
export type Rect = Point & { w: number; h: number };
export type Direction = "up" | "down" | "left" | "right";
export type Walker = Point & { direction: Direction; distance: number; moving: boolean; growth?: number };
export const WORLD = { width: 1120, height: 760 };
export const START: Point = { x: 202, y: 541 };
export const ISLANDS: Rect[] = LIFE_STORIES.map((story) => ({ x: story.x - 135, y: story.y - 135, w: 270, h: 230 }));
export const BRIDGES: Rect[] = [
  { x: 299, y: 565, w: 142, h: 40 }, { x: 679, y: 565, w: 142, h: 40 },
  { x: 920, y: 309, w: 40, h: 142 }, { x: 679, y: 225, w: 142, h: 40 },
  { x: 299, y: 225, w: 142, h: 40 }, { x: 160, y: 309, w: 40, h: 142 },
];

const OBSTACLES: Rect[] = [
  { x: 79, y: 489, w: 204, h: 33 },
  { x: 135, y: 458, w: 51, h: 76 },
  { x: 122, y: 524, w: 55, h: 30 },
  { x: 186, y: 529, w: 3, h: 33 },
  { x: 218, y: 529, w: 3, h: 33 },
  { x: 474, y: 480, w: 171, h: 66 },
  { x: 858, y: 463, w: 164, h: 82 },
  { x: 864, y: 147, w: 152, h: 30 },
  { x: 508, y: 140, w: 104, h: 63 },
  { x: 95, y: 136, w: 171, h: 62 },
];

const inside = (p: Point, rect: Rect, inset = 0) => p.x >= rect.x + inset && p.x <= rect.x + rect.w - inset && p.y >= rect.y + inset && p.y <= rect.y + rect.h - inset;
function onIsland(p: Point, island: Rect) {
  if (!inside(p, island, 6)) return false;
  const dx = Math.min(p.x - island.x, island.x + island.w - p.x);
  const dy = Math.min(p.y - island.y, island.y + island.h - p.y);
  return dx + dy >= 27;
}
export function canWalk(p: Point) {
  const floor = ISLANDS.some((island) => onIsland(p, island)) || BRIDGES.some((bridge) => inside(p, bridge, 5));
  return floor && !OBSTACLES.some((rect) => inside(p, { x: rect.x - 5, y: rect.y - 3, w: rect.w + 10, h: rect.h + 8 }));
}
export function advanceWalker(player: Walker, input: ReadonlySet<Direction>, seconds: number) {
  const dx = Number(input.has("right")) - Number(input.has("left"));
  const dy = Number(input.has("down")) - Number(input.has("up"));
  const length = Math.hypot(dx, dy);
  const step = 83 * Math.min(seconds, .04) / (length || 1);
  const beforeX = player.x, beforeY = player.y;
  if (dx) player.direction = dx > 0 ? "right" : "left";
  else if (dy) player.direction = dy > 0 ? "down" : "up";
  if (canWalk({ x: player.x + dx * step, y: player.y })) player.x += dx * step;
  if (canWalk({ x: player.x, y: player.y + dy * step })) player.y += dy * step;
  const distance = Math.hypot(player.x - beforeX, player.y - beforeY);
  player.distance += distance;
  player.moving = distance > .01;
  // Leaving the first memory grows the sprite toward the present-day avatar.
  // Growth stays unlocked when revisiting childhood; it does not invent dates.
  player.growth = Math.max(player.growth ?? 0, Math.min(1, Math.max(0, (player.x - 290) / 145, (435 - player.y) / 125)));
}
export function closestStory(p: Point) {
  return LIFE_STORIES.reduce((closest, story) => Math.hypot(p.x - story.x, p.y - story.y) < Math.hypot(p.x - closest.x, p.y - closest.y) ? story : closest);
}

const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const grey = (shade: number) => `rgb(${shade} ${shade} ${shade})`;
const GLYPHS = [
  ["1111111", "0000011", "0000110", "0001100", "0011000", "0110000", "1111111"],
  ["1111111", "0011100", "0011100", "0011100", "0011100", "0011100", "1111111"],
  ["1100011", "1110011", "1111011", "1101111", "1100111", "1100011", "1100011"],
  ["0111110", "1100011", "1100000", "1101111", "1100011", "1100011", "0111110"],
  ["1111111", "1100000", "1100000", "1111110", "1100000", "1100000", "1111111"],
  ["1111110", "1100011", "1100011", "1111110", "1101100", "1100110", "1100011"],
];

/** All artwork is drawn to a small integer grid, then scaled without smoothing. */
export function createLifeWorld() {
  const layer = document.createElement("canvas");
  layer.width = WORLD.width; layer.height = WORLD.height;
  const context = layer.getContext("2d", { alpha: false });
  if (!context) return null;
  const c = context;
  function rect(x: number, y: number, w: number, h: number, shade: number | string) {
    c.fillStyle = typeof shade === "number" ? grey(shade) : shade;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function line(x1: number, y1: number, x2: number, y2: number, shade: number) {
    const length = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let n = 0; n <= length; n++) rect(x1 + (x2 - x1) * n / Math.max(1, length), y1 + (y2 - y1) * n / Math.max(1, length), 1, 1, shade);
  }
  function outline(x: number, y: number, w: number, h: number, shade: number) {
    rect(x, y, w, 1, shade); rect(x, y + h - 1, w, 1, shade); rect(x, y, 1, h, shade); rect(x + w - 1, y, 1, h, shade);
  }
  function polygon(points: [number, number][], shade: number) {
    const top = Math.min(...points.map((point) => point[1])), bottom = Math.max(...points.map((point) => point[1]));
    for (let y = top; y <= bottom; y++) {
      const intersections: number[] = [];
      points.forEach(([x1, y1], i) => {
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) intersections.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
      });
      intersections.sort((a, b) => a - b);
      for (let i = 0; i + 1 < intersections.length; i += 2) rect(Math.ceil(intersections[i]), y, Math.floor(intersections[i + 1]) - Math.ceil(intersections[i]) + 1, 1, shade);
    }
  }
  function ellipse(x: number, y: number, rx: number, ry: number, shade: number) {
    for (let row = -ry; row <= ry; row++) {
      const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - row * row / (ry * ry))));
      rect(x - span, y + row, span * 2 + 1, 1, shade);
    }
  }
  function glow(x: number, y: number, rx: number, ry: number, strength: number) {
    for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
      const v = Math.max(0, 1 - Math.hypot(dx / rx, dy / ry));
      if (hash(x + dx, y + dy) < v * .7) rect(x + dx, y + dy, 1, 1, 26 + Math.floor(v * strength));
    }
  }
  function block(x: number, y: number, w: number, h: number, depth: number, shade: number) {
    rect(x + 3, y + depth + 3, w, h, 9);
    rect(x, y + depth, w, h, shade - 12);
    rect(x, y, w, h, shade);
    rect(x, y, w, 1, shade + 24);
    rect(x, y + h, w, depth, shade - 16);
    rect(x + w - 2, y, 2, h + depth, shade - 10);
  }
  function plant(x: number, y: number) {
    ellipse(x, y + 5, 10, 4, 10); block(x - 6, y - 5, 12, 9, 5, 48);
    rect(x - 1, y - 25, 2, 21, 58);
    for (let i = 0; i < 4; i++) {
      const s = i % 2 ? 1 : -1, yy = y - 8 - i * 5;
      rect(x + (s < 0 ? -10 : 1), yy - 5, 9, 5, 38 + i * 8);
      rect(x + (s < 0 ? -8 : 3), yy - 8, 5, 4, 52 + i * 5);
    }
  }
  function bench(x: number, y: number) {
    block(x, y, 42, 9, 6, 49); rect(x + 4, y + 15, 3, 6, 24); rect(x + 35, y + 15, 3, 6, 24);
    for (let n = 0; n < 3; n++) rect(x, y + 2 + n * 3, 40, 1, 30);
  }
  function lamp(x: number, y: number) {
    glow(x, y + 7, 24, 11, 23); ellipse(x, y + 3, 5, 2, 11);
    rect(x - 1, y - 25, 2, 28, 49); rect(x - 4, y - 27, 8, 5, 141); rect(x - 2, y - 26, 4, 3, 221);
  }
  function monitor(x: number, y: number, w: number, h: number, chart: boolean) {
    glow(x + w / 2, y + h + 18, w * .8, 35, 37);
    rect(x + w / 2 - 1, y + h, 3, 12, 62); rect(x + w / 2 - 9, y + h + 10, 20, 3, 52);
    block(x, y, w, h, 3, 51); rect(x + 3, y + 3, w - 6, h - 6, 13);
    rect(x + 4, y + 4, w - 8, 1, 82);
    if (chart) {
      for (let n = 0; n < 15; n++) {
        const xx = x + 7 + n * (w - 14) / 15, yy = y + h * .65 - Math.sin(n * .8) * 5 - n * .5;
        rect(xx, yy - 4, 1, 11, n % 3 ? 166 : 65); rect(xx - 1, yy, 3, 4, n % 3 ? 135 : 54);
      }
    } else for (let n = 0; n < 7; n++) {
      rect(x + 6 + (n % 3) * 3, y + 7 + n * 4, (w - 15) * (.3 + hash(n, x) * .5), 1, 65 + n % 3 * 28);
    }
  }

  rect(0, 0, WORLD.width, WORLD.height, 8);
  for (let y = 0; y < WORLD.height; y += 2) for (let x = 0; x < WORLD.width; x += 2) {
    const n = hash(x, y);
    if (n > .65) rect(x, y, 1, 1, n > .998 ? 56 : 10 + Math.floor(n * 4));
    if (x % 24 === 0 && y % 24 === 0) rect(x, y, 1, 1, 23);
  }
  // Bridges form a walkable loop, including a return route to the start.
  for (const b of BRIDGES) {
    rect(b.x + 3, b.y + 9, b.w, b.h, 4); rect(b.x, b.y, b.w, b.h, 29);
    outline(b.x, b.y, b.w, b.h, 61);
    const horizontal = b.w > b.h;
    for (let i = 8; i < (horizontal ? b.w : b.h); i += 9) {
      if (horizontal) { rect(b.x + i, b.y + 2, 1, b.h - 4, 19); rect(b.x + i, b.y, 3, 1, 126); }
      else { rect(b.x + 2, b.y + i, b.w - 4, 1, 19); rect(b.x, b.y + i, 1, 3, 126); }
    }
  }
  for (const island of ISLANDS) {
    const { x, y, w, h } = island;
    for (let row = 0; row < h; row++) {
      const cut = Math.max(0, 22 - Math.min(row, h - 1 - row));
      rect(x + cut + 5, y + row + 15, w - 2 * cut, 1, 4);
      rect(x + cut, y + row + 8, w - 2 * cut, 1, 22);
      rect(x + cut, y + row, w - 2 * cut, 1, row < 2 || row > h - 3 ? 69 : 31);
      for (let col = cut + 2; col < w - cut - 2; col++) {
        const n = hash(x + col, y + row);
        if (n > .6) rect(x + col, y + row, 1, 1, 28 + Math.floor(n * 11));
        if (row % 16 === 0 || col % 24 === 0) rect(x + col, y + row, 1, 1, 24);
      }
    }
    line(x + 23, y + 3, x + w - 24, y + 3, 83);
    for (let i = 36; i < w - 30; i += 40) { rect(x + i, y + h - 2, 8, 2, 89); }
    // Low back wall and architectural ribs.
    block(x + 25, y + 12, w - 50, 11, 17, 50);
    for (let i = 30; i < w - 30; i += 24) rect(x + i, y + 17, 2, 20, 63);
    if (island !== ISLANDS[0]) { plant(x + 27, y + h - 38); plant(x + w - 27, y + h - 38); }
    lamp(x + 25, y + 82); lamp(x + w - 25, y + 82);
    bench(x + w - 75, y + h - 35);
  }

  // Age six: an aircraft on a Canadian apron, with a walkable boarding stair.
  // The plane is intentionally unbranded; no airline or airport was supplied.
  for (let n = 0; n < 8; n++) rect(64 + n * 29, 621, 15, 2, 99);
  rect(65, 593, 84, 1, 72); rect(65, 573, 1, 21, 72);
  ellipse(177, 522, 108, 17, 15);
  polygon([[148, 496], [131, 453], [148, 451], [191, 495]], 114);
  polygon([[145, 496], [135, 457], [146, 455], [179, 496]], 153);
  polygon([[151, 508], [119, 555], [144, 558], [194, 511]], 133);
  polygon([[155, 512], [126, 552], [139, 551], [179, 513]], 174);
  block(151, 530, 21, 8, 4, 101); rect(168, 531, 5, 7, 38); rect(151, 530, 18, 1, 203);
  block(156, 479, 20, 7, 2, 126); rect(173, 480, 4, 6, 44);
  polygon([[76, 499], [90, 487], [245, 487], [263, 492], [279, 503], [275, 511], [260, 517], [100, 517], [78, 510]], 111);
  polygon([[80, 498], [94, 489], [245, 489], [262, 494], [277, 502], [263, 509], [101, 508]], 193);
  rect(101, 489, 142, 2, 228); rect(104, 511, 153, 2, 145);
  // Tailplane and vertical fin, cockpit and a row of distinct dark windows.
  polygon([[84, 500], [72, 470], [88, 470], [111, 501]], 157);
  polygon([[83, 504], [62, 523], [77, 524], [113, 510]], 123);
  polygon([[253, 492], [263, 497], [259, 500], [251, 496]], 35);
  rect(247, 492, 3, 5, 39);
  for (let n = 0; n < 14; n++) { rect(114 + n * 9, 496, 4, 4, 46); rect(114 + n * 9, 495, 3, 1, 105); }
  // Open doorway; the child starts on the upper steps and walks toward camera.
  rect(197, 502, 13, 15, 23); rect(199, 503, 9, 11, 12);
  block(191, 518, 26, 50, 5, 50);
  for (let n = 0; n < 10; n++) { rect(192, 520 + n * 5, 24, 2, 106 - n * 3); rect(192, 523 + n * 5, 24, 1, 31); }
  rect(188, 518, 2, 46, 163); rect(218, 518, 2, 46, 163);
  for (let n = 0; n < 4; n++) { rect(186, 527 + n * 11, 2, 8, 89); rect(220, 527 + n * 11, 2, 8, 89); }
  rect(189, 569, 31, 3, 88);
  // Canadian flag beside the arrival path, entirely in the grayscale palette.
  rect(268, 550, 2, 55, 110); rect(270, 551, 31, 18, 181);
  rect(270, 551, 6, 18, 58); rect(295, 551, 6, 18, 58);
  polygon([[285, 553], [287, 557], [290, 555], [289, 559], [293, 559], [289, 563], [286, 563], [286, 567], [284, 567], [284, 563], [281, 563], [277, 559], [281, 559], [280, 555], [283, 557]], 53);
  block(73, 597, 35, 15, 4, 54); rect(77, 593, 3, 4, 79); rect(100, 593, 3, 4, 79);
  block(78, 582, 13, 13, 2, 88); rect(81, 579, 7, 3, 121); block(94, 586, 9, 10, 2, 65);

  // Workshop: three luminous displays, keyboard, PC and a silver Monster can.
  block(476, 507, 168, 34, 8, 60);
  monitor(476, 477, 47, 34, false); monitor(529, 462, 63, 44, true); monitor(598, 477, 44, 34, false);
  block(530, 524, 58, 9, 2, 39);
  for (let x = 533; x < 585; x += 4) for (let y = 526; y < 532; y += 3) rect(x, y, 2, 1, 89);
  block(615, 517, 9, 17, 1, 27); rect(615, 516, 9, 2, 157);
  for (let i = 0; i < 3; i++) line(617 + i * 2, 521, 618 + i * 2, 529, 154);
  block(645, 502, 16, 37, 6, 37); outline(648, 506, 10, 10, 88); outline(648, 521, 10, 10, 88);

  // Campus: an architectural miniature, not a claimed replica of a building.
  block(860, 481, 160, 56, 9, 54); block(883, 466, 114, 16, 4, 68);
  block(918, 448, 45, 19, 8, 73); rect(936, 436, 3, 12, 85); rect(939, 437, 11, 6, 106);
  for (let i = 0; i < 8; i++) { block(868 + i * 18, 488, 8, 39, 5, 87); rect(879 + i * 18, 491, 4, 24, 20); }
  rect(930, 494, 22, 43, 16); rect(933, 497, 16, 35, 33); rect(941, 497, 1, 35, 79);
  for (let i = 0; i < 4; i++) rect(920 - i * 3, 537 + i * 3, 42 + i * 6, 2, 83 - i * 10);

  // Volleyball court, net, bleachers, and one blue/yellow panelled ball.
  rect(848, 145, 184, 111, 40); outline(857, 154, 166, 93, 139);
  rect(940, 154, 1, 93, 108); rect(892, 154, 1, 93, 89); rect(988, 154, 1, 93, 89);
  rect(859, 160, 2, 36, 154); rect(1020, 160, 2, 36, 154);
  rect(860, 153, 161, 2, 183);
  for (let x = 861; x < 1020; x += 5) rect(x, 155, 1, 22, 80);
  for (let y = 157; y < 177; y += 5) rect(861, y, 160, 1, 85);
  for (let i = 0; i < 3; i++) block(862, 124 - i * 6, 153, 4, 3, 48 + i * 9);
  ellipse(983, 218, 8, 3, 20);
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    if (dx * dx + dy * dy > 49) continue;
    const panel = Math.sin(Math.atan2(dy, dx) * 3 + Math.hypot(dx, dy) * .34) > .1;
    rect(982 + dx, 210 + dy, 1, 1, panel ? "#c9b245" : "#363f75");
  }

  // Chess terrace, a single sculpted knight on the giant board.
  block(508, 141, 104, 60, 6, 44);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) rect(512 + x * 12, 144 + y * 7, 12, 7, (x + y) % 2 ? 43 : 118);
  const knight = ["0000111000", "0001111100", "0011111110", "0111011110", "1111111110", "1110011110", "0000111100", "0001111000", "0011111000", "0011111000", "0111111100", "1111111110"];
  ellipse(560, 183, 14, 4, 25);
  knight.forEach((row, y) => [...row].forEach((p, x) => {
    if (p === "1") { rect(550 + x * 2, 155 + y * 2, 2, 2, 191); rect(551 + x * 2, 156 + y * 2, 1, 1, 146); }
  }));
  rect(558, 162, 2, 2, 28);

  // Food stop: a tiny open-front counter and stools, awaiting real memories.
  block(99, 145, 162, 43, 8, 42); block(95, 126, 170, 15, 5, 67);
  for (let i = 0; i < 17; i++) rect(97 + i * 10, 129, 6, 17, i % 2 ? 54 : 97);
  rect(103, 149, 154, 24, 15); rect(107, 151, 146, 2, 147);
  block(95, 180, 171, 10, 5, 83);
  for (let i = 0; i < 4; i++) {
    const x = 116 + i * 39;
    ellipse(x, 184, 10, 3, 154); ellipse(x, 182, 8, 2, 48);
    rect(x - 4, 178, 8, 3, 133); line(x - 4, 180, x + 7, 176, 187);
    block(x - 7, 208, 14, 9, 9, 74);
  }
  glow(179, 200, 85, 35, 23);

  function paintPlayer(target: CanvasRenderingContext2D, player: Walker, offsetX: number, offsetY: number) {
    const x = Math.round(player.x + offsetX), y = Math.round(player.y + offsetY);
    const step = player.moving ? Math.sin(player.distance * .35) : 0;
    // The body grows from 19 to 27 source pixels while keeping every edge on-grid.
    const growth = player.growth ?? 0;
    const scaleY = .70 + growth * .30, scaleX = .82 + growth * .18;
    const p = (xx: number, yy: number, w: number, h: number, color: number) => {
      const left = Math.round(xx * scaleX), top = Math.round(yy * scaleY);
      target.fillStyle = grey(color);
      target.fillRect(x + left, y + top, Math.max(1, Math.round((xx + w) * scaleX) - left), Math.max(1, Math.round((yy + h) * scaleY) - top));
    };
    p(-7, -1, 14, 3, 12); p(-5, 2, 10, 1, 17);
    // Shoes and independently alternating legs.
    p(-4, -7 + Math.round(step), 3, 7, 57); p(1, -7 - Math.round(step), 3, 7, 57);
    p(-5, -1 + Math.round(step), 4, 2, 218); p(1, -1 - Math.round(step), 4, 2, 218);
    p(-5, -17, 10, 11, 202); p(-3, -16, 6, 9, 229); p(-1, -10, 3, 1, 155);
    p(-7, -16 - Math.round(step), 2, 8, 161); p(5, -16 + Math.round(step), 2, 8, 161);
    p(-7, -8 - Math.round(step), 2, 2, 196); p(5, -8 + Math.round(step), 2, 2, 196);
    p(-4, -24, 8, 8, 180); p(-5, -26, 10, 5, 28); p(-4, -27, 8, 2, 38);
    if (player.direction === "up") { p(-4, -22, 8, 5, 26); p(-3, -17, 6, 2, 143); }
    else if (player.direction === "left") { p(-5, -21, 3, 4, 196); p(-4, -21, 1, 1, 29); p(2, -23, 3, 6, 28); }
    else if (player.direction === "right") { p(2, -21, 3, 4, 196); p(3, -21, 1, 1, 29); p(-5, -23, 3, 6, 28); }
    else { p(-3, -21, 1, 1, 26); p(2, -21, 1, 1, 26); p(-1, -18, 2, 1, 125); }
    if (growth < .45) {
      // A small travel backpack remains visible from behind and from the side.
      if (player.direction === "up") { p(-3, -15, 6, 7, 75); p(-2, -14, 4, 4, 110); }
      else if (player.direction === "right") p(-7, -15, 3, 7, 74);
      else if (player.direction === "left") p(4, -15, 3, 7, 74);
      else { p(-4, -15, 1, 7, 78); p(3, -15, 1, 7, 78); }
    }
  }

  return {
    draw(target: CanvasRenderingContext2D, camera: Point, player: Walker, time: number, visited: ReadonlySet<string>, reduced: boolean) {
      const ox = Math.round(target.canvas.width / 2 - camera.x), oy = Math.round(target.canvas.height / 2 - camera.y);
      target.imageSmoothingEnabled = false;
      target.fillStyle = "#080808"; target.fillRect(0, 0, target.canvas.width, target.canvas.height);
      target.drawImage(layer, ox, oy);
      // Floating name belongs to the origin, so the camera leaves it behind.
      GLYPHS.forEach((rows, index) => {
        const bob = reduced ? 0 : Math.round(Math.sin(time * .0008 + index * .8) * 3);
        rows.forEach((row, y) => [...row].forEach((value, x) => {
          if (value !== "1") return;
          target.fillStyle = "#484848"; target.fillRect(ox + 94 + index * 29 + x * 3 + 2, oy + 412 + y * 3 + bob + 2, 3, 3);
          target.fillStyle = y === 0 ? "#ededed" : "#aaaaaa"; target.fillRect(ox + 94 + index * 29 + x * 3, oy + 412 + y * 3 + bob, 3, 3);
        }));
      });
      for (const story of LIFE_STORIES) {
        const x = ox + story.x, y = oy + story.y;
        const close = Math.hypot(player.x - story.x, player.y - story.y) < 48;
        target.fillStyle = visited.has(story.id) ? "#777" : close ? "#eee" : "#aaa";
        const bob = reduced ? 0 : Math.round(Math.sin(time * .002 + Number(story.number)) * 2);
        // A small diamond marks a memory, well in front of collision geometry.
        for (let row = -3; row <= 3; row++) target.fillRect(x - (3 - Math.abs(row)), y - 14 + row + bob, (3 - Math.abs(row)) * 2 + 1, 1);
        target.fillStyle = close ? "#777" : "#444";
        target.fillRect(x - 8, y + 3, 17, 1); target.fillRect(x - 8, y + 1, 1, 2); target.fillRect(x + 8, y + 1, 1, 2);
      }
      if (!reduced) for (let n = 0; n < 26; n++) {
        const x = (hash(n, 9) * WORLD.width + time * .002 * (n % 2 ? 1 : -1) + WORLD.width) % WORLD.width;
        const y = hash(n, 27) * WORLD.height + Math.sin(time * .0005 + n) * 5;
        target.fillStyle = n % 4 ? "#363636" : "#686868";
        target.fillRect(Math.round(ox + x), Math.round(oy + y), 1, 1);
      }
      paintPlayer(target, player, ox, oy);
    },
  };
}
