import { type Point, type Rect, type Walker } from "./life-world";
import { paintAirportPerson } from "./pixel-person";
import { paintChessboard } from "./pixel-chess";
import { createWorldNavigator } from "./world-navigation";
import type { AirportGuide } from "./airport-guide";

export const HOME_WORLD = { width: 1000, height: 720 };
export const HOME_START = { x: 500, y: 610 };
export const HOME_CHESS = { x: 612, y: 418 };
export const CHESS_TABLE = { x: 552, y: 260, w: 120, h: 108 };
export const HOME_OBSTACLES: Rect[] = [
  { x: 230, y: 244, w: 160, h: 62 }, { x: 260, y: 350, w: 100, h: 50 },
  { x: 175, y: 185, w: 105, h: 38 }, { x: 720, y: 185, w: 120, h: 38 },
  { x: 800, y: 223, w: 40, h: 105 }, CHESS_TABLE,
  { x: 594, y: 230, w: 34, h: 24 }, { x: 594, y: 378, w: 34, h: 24 },
];
const inside = (p: Point, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
export function canWalkHome(p: Point) {
  const floor = inside(p, { x: 155, y: 180, w: 690, h: 345 }) || inside(p, { x: 480, y: 515, w: 40, h: 70 }) || inside(p, { x: 100, y: 560, w: 800, h: 100 });
  return floor && !HOME_OBSTACLES.some(r => inside(p, { x: r.x - 5, y: r.y - 3, w: r.w + 10, h: r.h + 8 }));
}
export const atHomeReturn = (p: Point) => p.y >= 649 && p.x >= 480 && p.x <= 520;
export const nextHomeWaypoint = createWorldNavigator(HOME_WORLD, canWalkHome);
export function homePlace(p: Point) {
  if (p.y > 535) return { id: "home-garden", name: "18 Holsworthy" };
  if (p.y > 475) return { id: "home-door", name: "My first home" };
  return p.x < 460 ? { id: "home-living", name: "The living room" } : { id: "home-chess", name: "Where I learned chess" };
}
export function getHomeGuide(player: Point, entered: boolean, read: boolean): AirportGuide {
  const near = Math.hypot(player.x - HOME_CHESS.x, player.y - HOME_CHESS.y) <= 48;
  const id = !entered ? "home-door" : !read ? "home-chess" : "home-complete";
  const title = !entered ? "Step into my first home" : !read ? "Find the chessboard" : "This is where chess began.";
  const target = !entered ? { x: 500, y: 495 } : !read ? HOME_CHESS : null;
  const hint = !entered ? "Walk up the garden path and through the front door." : !read ? (near ? "Press E or select Look at chessboard below." : "Follow the arrow to the chess table in the living room.") : "Explore the house, or walk down the garden path to revisit the airport. More memories will come next.";
  const touchHint = id === "home-chess" && near ? "Tap Look at chessboard below to open this memory." : hint;
  const waypoint = target ? nextHomeWaypoint(player, target) : null;
  const dx = waypoint ? waypoint.x - player.x : 0, dy = waypoint ? waypoint.y - player.y : 0;
  const arrow = !waypoint ? "✓" : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "→" : "←") : (dy > 0 ? "↓" : "↑");
  return { id, step: entered ? 2 : 1, total: 2, title, hint, touchHint, target, waypoint, arrow };
}

/** A stylized childhood home, ready for the owner's photos and room details. */
export function createHomeWorld() {
  const layer = document.createElement("canvas"); layer.width = HOME_WORLD.width; layer.height = HOME_WORLD.height;
  const ctx = layer.getContext("2d", { alpha: false }); if (!ctx) return null;
  const c = ctx;
  const r = (x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };
  const noise = (x: number, y: number) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  const box = (x: number, y: number, w: number, h: number, depth: number, top: string, front: string) => {
    r(x + 4, y + depth + 3, w, h, "#715f4c"); r(x, y, w, h, top); r(x, y + h, w, depth, front); r(x, y, w, 1, "#e9cda1");
  };
  function plant(x: number, y: number) {
    box(x - 7, y - 5, 14, 8, 5, "#bd7959", "#8e5b47");
    r(x, y - 29, 2, 26, "#4c6750");
    for (let i = 0; i < 4; i++) { const side = i % 2 ? 1 : -1; r(x + (side < 0 ? -12 : 1), y - 25 + i * 5, 12, 5, i % 2 ? "#819568" : "#5e805d"); r(x + side * 5, y - 28 + i * 5, 6, 4, "#719363"); }
  }
  function window(x: number, y: number, w: number) {
    box(x - 5, y - 5, w + 10, 66, 4, "#6e6253", "#7e6d58"); r(x, y, w, 56, "#9db5a3");
    r(x, y + 30, w, 26, "#7c966f");
    for (let i = 0; i < w; i += 12) { r(x + i, y + 17 + i % 7, 10, 16, "#668460"); r(x + i + 2, y + 13 + i % 7, 6, 6, "#8c9b68"); }
    r(x + w / 2 - 2, y, 4, 56, "#e3d4b2"); r(x, y + 27, w, 3, "#e3d4b2");
    r(x - 9, y - 6, 10, 66, "#bd8c70"); r(x + w - 1, y - 6, 10, 66, "#bd8c70");
    r(x - 6, y - 4, 3, 62, "#d8a487"); r(x + w + 2, y - 4, 3, 62, "#d8a487");
    r(x - 8, y + 60, w + 16, 4, "#efe0bc");
  }
  // A garden and connected front path anchor the home to a real ground plane.
  r(0, 0, 1000, 720, "#708063");
  for (let y = 0; y < 720; y += 2) for (let x = 0; x < 1000; x += 2) {
    const n = noise(x, y); if (n > .77) r(x, y, 1, 2, n > .93 ? "#92a174" : "#62765b");
  }
  r(0, 664, 1000, 56, "#75847e"); r(0, 668, 1000, 3, "#a3b1a0");
  for (let x = 0; x < 1000; x += 60) r(x, 699, 28, 2, "#dad2ad");
  r(475, 545, 50, 120, "#c2b596");
  for (let y = 556; y < 664; y += 18) { r(477, y, 46, 1, "#988e77"); r(499, y, 1, 18, "#b0a68a"); }
  for (const x of [95, 530]) {
    const width = 375; r(x, 654, width, 3, "#d9ccaa");
    for (let xx = x; xx < x + width; xx += 16) { r(xx, 642, 4, 24, "#e1d5b6"); r(xx + 1, 639, 2, 4, "#e1d5b6"); }
  }
  for (const x of [165, 270, 720, 820]) {
    r(x - 22, 574, 45, 24, "#526e50"); r(x - 18, 567, 36, 19, "#6d8b58");
    for (let i = 0; i < 7; i++) r(x - 16 + i * 5, 574 + i % 3 * 4, 2, 2, i % 2 ? "#d4ae78" : "#d99a84");
  }
  // Cutaway walls and warm floorboards: the room is deliberately illustrative.
  box(130, 120, 740, 410, 20, "#d7bd91", "#a96f55"); r(150, 180, 700, 350, "#b88e62");
  for (let y = 180; y < 530; y++) for (let x = 150; x < 850; x++) {
    if ((y - 180) % 16 === 0) r(x, y, 1, 1, "#97714e");
    else if ((x + Math.floor((y - 180) / 16) % 2 * 58) % 116 === 0) r(x, y, 1, 1, "#9c7753");
    else { const n = noise(x, y); if (n > .94) r(x, y, 1, 1, "#cba173"); else if (n < .04) r(x, y, 1, 1, "#ae825a"); }
  }
  r(150, 120, 700, 60, "#dfcea7"); r(150, 174, 700, 6, "#9b7b5b"); r(150, 173, 700, 1, "#f2dfb7");
  r(130, 120, 20, 410, "#a67d5e"); r(850, 120, 20, 410, "#a67d5e");
  r(134, 125, 3, 400, "#c49a74"); r(853, 125, 3, 400, "#c49a74");
  window(319, 106, 105); window(545, 106, 120);
  // Pixel patches of daylight, without blur or gradients.
  for (const x of [320, 550]) for (let row = 0; row < 65; row++) {
    const shift = Math.floor(row / 3); r(x + shift, 183 + row, 40, 1, "#c8a575"); r(x + 50 + shift, 183 + row, 35, 1, "#c8a575");
  }
  // Living-room rug, couch, cushions and a book on the coffee table.
  r(197, 231, 224, 222, "#98634f"); r(202, 236, 214, 212, "#c29a72"); r(207, 241, 204, 202, "#aa7559");
  for (let y = 246; y < 440; y += 12) for (let x = 212; x < 410; x += 12) if ((x + y) % 24) r(x, y, 3, 3, "#bd8a65");
  for (let x = 200; x < 420; x += 6) { r(x, 227, 1, 4, "#e4c99b"); r(x, 453, 1, 4, "#e4c99b"); }
  box(230, 244, 160, 48, 14, "#74836c", "#53654f"); r(233, 235, 154, 20, "#87977c");
  for (let x = 242; x < 382; x += 46) { r(x, 258, 42, 29, "#8e9e81"); r(x + 3, 259, 36, 2, "#abb590"); }
  r(225, 250, 13, 43, "#63765e"); r(382, 250, 13, 43, "#63765e");
  box(246, 250, 23, 19, 3, "#d7b481", "#b28b61"); box(351, 250, 23, 19, 3, "#b8806b", "#95614f");
  box(260, 350, 100, 43, 8, "#9b704d", "#71503b"); r(267, 360, 29, 20, "#d1c3a0"); r(269, 358, 27, 19, "#577c7b"); r(272, 362, 18, 2, "#91aaa0");
  r(324, 361, 11, 9, "#e3cd9f"); r(326, 359, 7, 3, "#705441");
  // Bookcase and a small kitchen occupy the back corners.
  box(175, 185, 105, 29, 9, "#805d44", "#614b3c");
  for (let i = 0; i < 13; i++) { const colors = ["#a66c5b", "#537c7b", "#c2a269", "#7e7f65"]; r(180 + i * 7, 184 - i % 3 * 3, 5, 21 + i % 3 * 3, colors[i % 4]); r(181 + i * 7, 188, 1, 12, "#dcc7a0"); }
  box(720, 185, 120, 30, 9, "#dbd1b4", "#a58c6a"); box(800, 223, 40, 96, 9, "#dbd1b4", "#a58c6a");
  r(753, 190, 40, 20, "#718481"); r(757, 194, 32, 13, "#9eaaa1"); r(775, 183, 3, 11, "#637a79");
  for (let i = 0; i < 3; i++) { r(725 + i * 35, 216, 26, 5, "#c2aa83"); r(733 + i * 35, 218, 7, 1, "#725d49"); }
  r(808, 261, 25, 28, "#61716a"); r(812, 265, 7, 7, "#354c49"); r(823, 278, 7, 7, "#354c49");
  plant(181, 479); plant(815, 455); plant(696, 197);
  // Chess is the focal point: a real 8×8 board and all 32 starting pieces.
  r(530, 227, 164, 210, "#536f63"); r(534, 231, 156, 202, "#91a085"); r(538, 235, 148, 194, "#647e6b");
  box(594, 230, 34, 18, 6, "#b18a5b", "#805d42"); r(594, 223, 34, 9, "#a17b52");
  box(CHESS_TABLE.x, CHESS_TABLE.y, CHESS_TABLE.w, 102, 7, "#a87d50", "#77563d");
  paintChessboard(c, 564, 265);
  box(594, 378, 34, 18, 6, "#b18a5b", "#805d42"); r(594, 395, 34, 8, "#8c6849");
  // Front wall, porch and open doorway connect the room to the garden path.
  for (const [x,w] of [[130,345],[525,345]]) {
    r(x, 530, w, 20, "#ac7258"); r(x, 530, w, 4, "#dab48a");
    for (let y = 536; y < 550; y += 7) { r(x, y, w, 1, "#8f5d4a"); for (let xx = x + y % 2 * 12; xx < x + w; xx += 24) r(xx, y, 1, 7, "#8f5d4a"); }
  }
  r(475, 522, 4, 30, "#ead4ad"); r(521, 522, 4, 30, "#ead4ad");
  r(480, 537, 40, 4, "#e0c99e"); r(480, 550, 40, 3, "#a68e6e"); r(479, 555, 42, 2, "#d6c29c");
  r(482, 567, 36, 12, "#7a7057"); r(485, 570, 30, 6, "#a59672");
  // House-number plaque: only the address detail supplied by the owner.
  r(537, 532, 22, 12, "#566d61"); r(542, 535, 1, 6, "#f0dab0"); r(541, 536, 1, 1, "#f0dab0");
  r(548, 535, 4, 1, "#f0dab0"); r(548, 538, 4, 1, "#f0dab0"); r(548, 541, 4, 1, "#f0dab0"); r(548, 535, 1, 7, "#f0dab0"); r(551, 535, 1, 7, "#f0dab0");

  return { draw(target: CanvasRenderingContext2D, camera: Point, player: Walker, time: number, visited: ReadonlySet<string>, reduced: boolean, waypoint?: Point | null) {
    const ox = Math.round(target.canvas.width / 2 - camera.x), oy = Math.round(target.canvas.height / 2 - camera.y);
    target.imageSmoothingEnabled = false; target.fillStyle = "#708063"; target.fillRect(0,0,target.canvas.width,target.canvas.height); target.drawImage(layer,ox,oy);
    if (!visited.has("first-home")) {
      const x = ox + HOME_CHESS.x, y = oy + HOME_CHESS.y - 8 + (reduced ? 0 : Math.round(Math.sin(time * .002)));
      target.fillStyle = "#ffe1a1"; target.fillRect(x - 2,y,5,1); target.fillRect(x,y - 2,1,5);
    }
    if (waypoint && Math.hypot(waypoint.x - player.x, waypoint.y - player.y) > 18) {
      const x = Math.round(ox + waypoint.x), y = Math.round(oy + waypoint.y); target.fillStyle = "#fbe4ad";
      target.fillRect(x-4,y-4,3,1); target.fillRect(x+2,y-4,3,1); target.fillRect(x-4,y+4,3,1); target.fillRect(x+2,y+4,3,1);
    }
    paintAirportPerson(target,{...player,x:ox+player.x,y:oy+player.y,child:true,playful:true,outdoors:player.y>550},time);
  }};
}
