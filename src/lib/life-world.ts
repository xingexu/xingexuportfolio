import { LIFE_STORIES, type LifeChapter } from "./life-stories";
import { paintAirportPerson } from "./pixel-person";

export type Point = { x: number; y: number };
export type Rect = Point & { w: number; h: number };
export type Direction = "up" | "down" | "left" | "right";
// Optional legacy growth values are always reset: this chapter stays at age six.
export type Walker = Point & { direction: Direction; distance: number; moving: boolean; growth?: number; vx?: number; vy?: number };
export const WORLD = { width: 1280, height: 800 };
export const START: Point = { x: 329, y: 560 };
export const AIRPORT_EXIT: Point = { x: 650, y: 350 };
export const AIRPORT_RETURN: Point = { x: 650, y: 401 };
export const atAirportExit = (p: Point) => p.x >= 611 && p.x <= 689 && p.y >= 310 && p.y <= 355;
export const TERMINAL = { x: 50, y: 65, w: 1180, h: 320 };
export const AIRPORT_PLACES = [
  { id: "apron", name: "Off the plane", x: 365, y: 625, hint: "Follow the yellow path to arrivals." },
  { id: "entrance", name: "Arrivals entrance", x: 650, y: 350, hint: "Baggage claim is to your left." },
  { id: "baggage", name: "Baggage claim", x: 340, y: 275, hint: "The arrivals hall is through to the right." },
  { id: "hall", name: "Arrivals hall", x: 855, y: 275, hint: "Explore the terminal at your own pace." },
  { id: "meeting", name: "Meeting point", x: 1120, y: 290, hint: "Welcome to Canada." },
] as const;
export function airportPlace(p: Point) {
  if (p.y > 395) return AIRPORT_PLACES[0];
  if (p.y > 310 && p.x > 580 && p.x < 730) return AIRPORT_PLACES[1];
  if (p.x < 580) return AIRPORT_PLACES[2];
  if (p.x > 1010) return AIRPORT_PLACES[4];
  return AIRPORT_PLACES[3];
}
export const OBSTACLES: Rect[] = [
  // Terminal perimeter, with a broad entrance and an eastern exit.
  { x: 50, y: 65, w: 1180, h: 24 }, { x: 50, y: 65, w: 12, h: 320 },
  { x: 50, y: 365, w: 555, h: 22 }, { x: 695, y: 365, w: 535, h: 22 },
  { x: 1218, y: 65, w: 12, h: 185 }, { x: 1218, y: 320, w: 12, h: 65 },
  // Aircraft and boarding stairs. The stair centre stays walkable.
  { x: 88, y: 490, w: 338, h: 44 }, { x: 181, y: 429, w: 75, h: 62 },
  { x: 176, y: 535, w: 89, h: 61 },
  { x: 305, y: 539, w: 3, h: 54 }, { x: 351, y: 539, w: 3, h: 54 },
  // Baggage belts, seating, information desk, café and luggage carts.
  { x: 175, y: 145, w: 320, h: 95 }, { x: 700, y: 130, w: 155, h: 25 },
  { x: 700, y: 195, w: 155, h: 25 }, { x: 918, y: 102, w: 127, h: 50 },
  { x: 1050, y: 180, w: 105, h: 35 }, { x: 99, y: 280, w: 38, h: 35 },
  { x: 1095, y: 98, w: 55, h: 29 }, { x: 480, y: 520, w: 92, h: 38 },
  { x: 100, y: 650, w: 82, h: 31 }, { x: 1120, y: 590, w: 85, h: 42 },
];
const inside = (p: Point, r: Rect, inset = 0) => p.x >= r.x + inset && p.x <= r.x + r.w - inset && p.y >= r.y + inset && p.y <= r.y + r.h - inset;
export function canWalk(p: Point) {
  // One connected airport surface, bounded by the perimeter fence and walls.
  if (!inside(p, { x: 25, y: 88, w: 1230, h: 678 }, 7)) return false;
  return !OBSTACLES.some(r => inside(p, { x: r.x - 5, y: r.y - 3, w: r.w + 10, h: r.h + 8 }));
}
export function advanceWalker(player: Walker, input: ReadonlySet<Direction>, seconds: number, walkable: (point: Point) => boolean = canWalk) {
  const dx = Number(input.has("right")) - Number(input.has("left"));
  const dy = Number(input.has("down")) - Number(input.has("up"));
  const dt = Math.min(Math.max(seconds, 0), .04);
  const length = Math.hypot(dx, dy) || 1;
  const targetX = dx / length * 86, targetY = dy / length * 86;
  const decay = Math.exp(-22 * dt);
  // Integrate acceleration exactly so 30, 60, and 120 Hz travel equally far.
  // Releasing all keys stops immediately; there is no slippery idle drift.
  if (!dx && !dy) { player.vx = 0; player.vy = 0; }
  const vx = player.vx ?? 0, vy = player.vy ?? 0;
  const stepX = targetX * dt + (vx - targetX) * (1 - decay) / 22;
  const stepY = targetY * dt + (vy - targetY) * (1 - decay) / 22;
  player.vx = targetX + (vx - targetX) * decay;
  player.vy = targetY + (vy - targetY) * decay;
  const oldX = player.x, oldY = player.y;
  const keepsFacing = (player.direction === "left" && dx < 0) || (player.direction === "right" && dx > 0) || (player.direction === "up" && dy < 0) || (player.direction === "down" && dy > 0);
  if (!keepsFacing) {
    if (dx) player.direction = dx > 0 ? "right" : "left";
    else if (dy) player.direction = dy > 0 ? "down" : "up";
  }
  if (walkable({ x: player.x + stepX, y: player.y })) player.x += stepX; else player.vx = 0;
  if (walkable({ x: player.x, y: player.y + stepY })) player.y += stepY; else player.vy = 0;
  const distance = Math.hypot(player.x - oldX, player.y - oldY);
  player.distance += distance; player.moving = distance > .01; player.growth = 0;
}
export function closestStory(p: Point, chapter: LifeChapter = "airport") {
  return LIFE_STORIES.filter(story => (story.chapter ?? "airport") === chapter).reduce((closest, story) => Math.hypot(p.x - story.x, p.y - story.y) < Math.hypot(p.x - closest.x, p.y - closest.y) ? story : closest);
}
const hash = (x: number, y: number) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
const FONT: Record<string, string[]> = {
  A:["01110","10001","10001","11111","10001","10001","10001"], B:["11110","10001","10001","11110","10001","10001","11110"],
  C:["01111","10000","10000","10000","10000","10000","01111"], D:["11110","10001","10001","10001","10001","10001","11110"],
  E:["11111","10000","10000","11110","10000","10000","11111"], F:["11111","10000","10000","11110","10000","10000","10000"],
  G:["01111","10000","10000","10111","10001","10001","01111"], H:["10001","10001","10001","11111","10001","10001","10001"],
  I:["11111","00100","00100","00100","00100","00100","11111"], J:["00111","00010","00010","00010","10010","10010","01100"],
  K:["10001","10010","10100","11000","10100","10010","10001"], L:["10000","10000","10000","10000","10000","10000","11111"],
  M:["10001","11011","10101","10101","10001","10001","10001"], N:["10001","11001","11001","10101","10011","10011","10001"],
  O:["01110","10001","10001","10001","10001","10001","01110"], P:["11110","10001","10001","11110","10000","10000","10000"],
  Q:["01110","10001","10001","10001","10101","10010","01101"], R:["11110","10001","10001","11110","10100","10010","10001"],
  S:["01111","10000","10000","01110","00001","00001","11110"], T:["11111","00100","00100","00100","00100","00100","00100"],
  U:["10001","10001","10001","10001","10001","10001","01110"], V:["10001","10001","10001","10001","10001","01010","00100"],
  W:["10001","10001","10001","10101","10101","11011","10001"], X:["10001","10001","01010","00100","01010","10001","10001"],
  Y:["10001","10001","01010","00100","00100","00100","00100"], Z:["11111","00001","00010","00100","01000","10000","11111"],
  "0":["01110","10001","10011","10101","11001","10001","01110"], "1":["00100","01100","00100","00100","00100","00100","01110"], "2":["01110","10001","00001","00010","00100","01000","11111"],
};

/** Cached, hand-drawn pixel airport. Every edge and reflection uses integer cells. */
export function createLifeWorld() {
  const layer = document.createElement("canvas"); layer.width = WORLD.width; layer.height = WORLD.height;
  const ctx = layer.getContext("2d", { alpha: false }); if (!ctx) return null;
  const c = ctx;
  function rect(x: number, y: number, w: number, h: number, color: string) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function line(x: number, y: number, xx: number, yy: number, color: string) {
    const length = Math.max(Math.abs(xx - x), Math.abs(yy - y));
    for (let i = 0; i <= length; i++) rect(x + (xx - x) * i / Math.max(1, length), y + (yy - y) * i / Math.max(1, length), 1, 1, color);
  }
  function outline(x: number, y: number, w: number, h: number, color: string) { rect(x,y,w,1,color); rect(x,y+h-1,w,1,color); rect(x,y,1,h,color); rect(x+w-1,y,1,h,color); }
  function poly(points: [number,number][], color: string) {
    const top = Math.min(...points.map(p=>p[1])), bottom = Math.max(...points.map(p=>p[1]));
    for (let y = top; y <= bottom; y++) {
      const xs: number[] = [];
      points.forEach(([x1,y1],i) => { const [x2,y2] = points[(i+1)%points.length]; if ((y1<=y && y2>y)||(y2<=y && y1>y)) xs.push(x1+(y-y1)/(y2-y1)*(x2-x1)); });
      xs.sort((a,b)=>a-b); for(let i=0;i+1<xs.length;i+=2) rect(Math.ceil(xs[i]), y, Math.floor(xs[i+1])-Math.ceil(xs[i])+1, 1, color);
    }
  }
  function ellipse(x: number,y: number,rx: number,ry: number,color: string) {
    for(let row=-ry;row<=ry;row++){const span=Math.floor(rx*Math.sqrt(Math.max(0,1-row*row/(ry*ry))));rect(x-span,y+row,span*2+1,1,color);}
  }
  function text(label: string,x: number,y: number,color: string,size=1) {
    [...label].forEach((letter,i)=>FONT[letter]?.forEach((row,yy)=>[...row].forEach((v,xx)=>{if(v==="1")rect(x+i*6*size+xx*size,y+yy*size,size,size,color);}))); }
  function box(x:number,y:number,w:number,h:number,depth:number,top:string,front:string) {
    rect(x+3,y+depth+3,w,h,"#657a80");rect(x,y,w,h,top);rect(x,y+h,w,depth,front);rect(x,y,w,1,"#e6ece2"); }
  function plant(x:number,y:number) {
    ellipse(x,y+3,11,4,"#a3b2aa");box(x-7,y-7,14,9,5,"#c39e78","#967458");
    rect(x-1,y-34,2,28,"#425e43");
    for(let i=0;i<4;i++){const side=i%2?1:-1,yy=y-12-i*6;poly([[x,yy],[x+side*14,yy-8],[x+side*10,yy+1]],i%2?"#4d8060":"#729866");}
  }
  function seats(x:number,y:number,count:number) {
    rect(x+3,y+22,count*25-8,4,"#617783");
    for(let i=0;i<count;i++){const xx=x+i*25;rect(xx+3,y+18,2,14,"#52636f");rect(xx+17,y+18,2,14,"#52636f");box(xx,y,21,13,8,"#487b8e","#33576c");rect(xx+2,y+2,17,2,"#689cad");rect(xx-2,y+11,3,8,"#b8c7c6");rect(xx+20,y+11,3,8,"#b8c7c6");}
  }
  function suitcase(x:number,y:number,color:string) { rect(x+3,y-3,7,3,"#364653");box(x,y,14,11,4,color,"#354957");rect(x+3,y+4,1,7,"#a7b8bc");rect(x+10,y+4,1,7,"#a7b8bc");rect(x+2,y+15,3,2,"#293746");rect(x+10,y+15,3,2,"#293746"); }
  function cone(x:number,y:number) { rect(x-5,y+5,11,2,"#536c73");poly([[x,y-8],[x-4,y+5],[x+4,y+5]],"#d77c43");rect(x-2,y,5,2,"#fff1d5"); }
  function sign(x:number,y:number,w:number,label:string) {box(x,y,w,18,3,"#1b4057","#102d41");text(label,x+7,y+5,"#f3d078");}
  function canadianFlag(x:number,y:number) {
    rect(x,y,2,59,"#d9e2df");rect(x+2,y,34,21,"#f6f1e3");rect(x+2,y,7,21,"#ce5c56");rect(x+29,y,7,21,"#ce5c56");
    const mx=x+19,my=y+3;poly([[mx,my],[mx+2,my+5],[mx+5,my+3],[mx+4,my+7],[mx+8,my+6],[mx+5,my+11],[mx+1,my+11],[mx+1,my+16],[mx-1,my+16],[mx-1,my+11],[mx-5,my+11],[mx-8,my+6],[mx-4,my+7],[mx-5,my+3],[mx-2,my+5]],"#c84e4d"); }

  // The full canvas is airport ground. There is no void or separate platform.
  rect(0,0,WORLD.width,WORLD.height,"#80959e");
  for(let y=0;y<WORLD.height;y++) for(let x=0;x<WORLD.width;x++) {
    const n=hash(x,y); if(n>.87)rect(x,y,1,1,n>.96?"#8fa2a7":"#758c97");
    if(y%56===0 || x%88===0)rect(x,y,1,1,"#748a94");
  }
  // Perimeter, service road, runway stripes, grass and taxiway lights.
  rect(0,0,WORLD.width,49,"#658965");rect(0,760,WORLD.width,40,"#526d78");
  for(let x=0;x<WORLD.width;x+=45){rect(x,776,24,2,"#ddd4ad");rect(x,755,5,3,"#edc56a");}
  rect(0,42,WORLD.width,2,"#acc0b1");for(let x=10;x<WORLD.width;x+=22){rect(x,30,2,20,"#a6bab4");line(x,32,x+22,43,"#89a09b");}
  // A yellow pedestrian route connects the aircraft stairs to the arrival doors.
  rect(340,628,312,3,"#efd27c");rect(649,401,3,230,"#efd27c");
  for(let x=360;x<625;x+=46){poly([[x,617],[x+9,622],[x,627],[x+3,622]],"#ffe7a0");}
  for(let y=446;y<610;y+=50){poly([[640,y],[646,y-10],[652,y],[646,y-4]],"#ffe7a0");}
  for(let x=613;x<690;x+=11)rect(x,392,6,23,"#ede8ca");
  for(let y=470;y<720;y+=32)rect(800,y,2,17,"#d8c589");
  for(let x=77;x<1190;x+=42)rect(x,720,21,2,"#e2c76f");
  outline(62,440,510,260,"#a6b4b4");text("02",80,688,"#e7d8ad",2);

  // Roofless terminal cutaway: cream tiles, glass front and continuous walkable doors.
  rect(50,65,1180,320,"#d5d8c9");
  for(let y=89;y<366;y++) for(let x=63;x<1218;x++) {
    if((x-63)%24===0 || (y-89)%24===0)rect(x,y,1,1,"#bcc8c1");
    else if(hash(x,y)>.95)rect(x,y,1,1,"#e0e0d0");
  }
  // Reflections from the blue windows fall onto the floor, on the pixel grid.
  for(let x=82;x<1190;x+=70) poly([[x,337],[x+39,337],[x+62,280],[x+23,280]],"#c4d6d0");
  box(50,65,1180,17,15,"#658795","#496779");rect(57,66,1166,3,"#b9d3d6");
  rect(50,89,12,277,"#4d6e7e");rect(53,89,2,275,"#9db8bf");
  // Blue glass and mullions stop at the actual door opening.
  for(const [start,end] of [[62,605],[695,1218]]) {
    rect(start,344,end-start,37,"#5a8c9c");rect(start,346,end-start,7,"#a1c9ce");rect(start,378,end-start,8,"#456575");
    for(let x=start+3;x<end-20;x+=44){rect(x,354,36,21,"#75a6b0");line(x+3,371,x+19,354,"#a6d0d0");rect(x+38,344,3,38,"#34566a");}
    rect(start,383,end-start,3,"#d2ded6");
  }
  rect(605,363,90,24,"#a6bcb9");rect(606,363,3,20,"#284c60");rect(692,363,3,20,"#284c60");
  rect(610,382,80,4,"#f3e7c0");sign(594,330,114,"TERMINAL EXIT");
  rect(617,389,65,1,"#f8e9b3");
  rect(1218,89,12,161,"#577784");rect(1218,320,12,65,"#577784");
  sign(1188,221,42,"EXIT");rect(1221,251,8,67,"#e5dcb7");
  // Overhead beams and warm pendant light strips.
  for(let x=90;x<1180;x+=170){rect(x,95,72,4,"#f6e7ba");rect(x,99,72,1,"#bcab88");}
  sign(199,107,126,"BAGGAGE CLAIM"); sign(704,96,113,"ARRIVALS");

  // A broad, rounded baggage carousel; the bags animate around its belt below.
  for(let row=0;row<96;row++){const cut=Math.max(0,14-Math.min(row,95-row));rect(175+cut,148+row,320-cut*2,1,"#8c9d9c");rect(175+cut,145+row,320-cut*2,1,"#3b535e");}
  for(let x=190;x<480;x+=8){rect(x,150,1,13,"#71858a");rect(x,221,1,13,"#71858a");}
  for(let y=163;y<222;y+=7){rect(180,y,14,1,"#71858a");rect(476,y,14,1,"#71858a");}
  box(199,167,273,47,7,"#c0c8ba","#859996");rect(209,174,250,1,"#e1e0c9");
  text("01",326,181,"#5c747a",2);rect(316,159,3,9,"#83999a");
  // Information kiosk and small café, with no invented personal events.
  box(918,102,127,40,10,"#d3af7e","#947458");rect(924,108,115,2,"#ead3a9");
  sign(924,88,115,"INFORMATION");box(972,112,24,15,3,"#25465d","#18394c");rect(975,114,18,10,"#7db5b8");
  box(1095,98,55,22,7,"#a4b7af","#69878a");text("CAFE",1104,103,"#274c5f");
  for(let i=0;i<3;i++){rect(1103+i*13,115,7,4,"#ebd6ac");rect(1105+i*13,112,3,3,"#f5e8c7");}
  seats(700,130,6);seats(700,195,6);seats(1050,180,4);
  plant(665,129);plant(883,209);plant(1168,126);plant(87,113);plant(1154,337);
  canadianFlag(1088,267);sign(971,248,97,"MEETING POINT");
  // Front desk queue posts and inset floor route.
  for(let x=920;x<1030;x+=30){ellipse(x,193,4,2,"#a9b6aa");rect(x-1,181,2,11,"#597b84");}
  rect(920,180,90,2,"#b58c5d");
  for(let x=500;x<1180;x+=42)rect(x,299,19,1,"#b2c0b6");
  // Nesting luggage carts.
  for(let i=0;i<3;i++){const x=100+i*10;rect(x,282,2,24,"#738d95");rect(x,283,15,2,"#36596c");box(x+2,291,18,12,3,"#a9bec1","#7b969e");rect(x+3,307,3,3,"#395768");rect(x+15,307,3,3,"#395768");}

  // Large unbranded aircraft parked beside the terminal, with red tail and blue windows.
  ellipse(260,548,178,27,"#637b88");
  poly([[214,495],[176,424],[205,422],[289,496]],"#c2d2d7");poly([[220,493],[186,430],[202,428],[273,494]],"#edf0e7");
  poly([[230,524],[166,593],[202,601],[296,528]],"#b0c2ca");poly([[238,530],[179,588],[199,589],[276,529]],"#e2e8e4");
  box(211,558,35,13,7,"#dbe3e2","#90a8b6");ellipse(244,568,5,7,"#547587");rect(212,558,30,2,"#f5f3df");
  box(228,467,32,11,4,"#c0d1d9","#7b9aaa");rect(256,469,5,9,"#36596c");
  poly([[89,505],[114,488],[372,488],[400,496],[426,514],[418,527],[396,535],[119,535],[92,521]],"#b5c6d0");
  poly([[93,504],[117,491],[372,491],[398,500],[423,512],[399,522],[121,521]],"#edf1e7");
  rect(123,491,249,3,"#fff9e6");rect(126,527,263,3,"#7999a9");
  poly([[107,505],[78,453],[108,452],[151,507]],"#b95655");poly([[106,501],[84,459],[104,458],[138,502]],"#d87863");
  poly([[104,515],[70,548],[96,548],[153,523]],"#9db7c3");
  poly([[388,497],[402,504],[398,508],[386,503]],"#3c697e");rect(379,496,6,7,"#436e81");
  for(let i=0;i<20;i++){rect(137+i*11,503,6,6,"#4f7c91");rect(138+i*11,503,4,1,"#89b2bd");}
  rect(320,514,17,21,"#3d5c6b");rect(323,516,11,17,"#243e52");
  // Stairs join directly to the apron; collision rails leave the centre open.
  box(311,536,38,65,5,"#8da1ac","#526d80");
  for(let i=0;i<11;i++){rect(313,538+i*6,34,2,"#d2dfda");rect(313,542+i*6,34,1,"#617f91");}
  rect(307,536,3,62,"#e7e6d5");rect(351,536,3,62,"#e7e6d5");
  for(let i=0;i<4;i++){rect(305,544+i*15,2,11,"#657e8e");rect(354,544+i*15,2,11,"#657e8e");}
  rect(309,602,45,3,"#e8d9a8");
  cone(75,562);cone(456,569);cone(430,451);cone(80,465);
  // Baggage train, ground crew equipment and a shuttle give the apron scale.
  for(let i=0;i<3;i++){box(480+i*29,530,26,19,7,"#c0ba9e","#7a8990");rect(483+i*29,556,5,3,"#345362");rect(498+i*29,556,5,3,"#345362");suitcase(485+i*29,518,["#c3875a","#6d9b94","#917f9d"][i]);}
  box(100,650,80,21,10,"#c2a467","#8e805f");rect(106,638,25,16,"#cad8d5");rect(110,640,17,9,"#436a80");rect(110,678,10,5,"#354d60");rect(162,678,10,5,"#354d60");
  box(1120,590,85,33,9,"#e1d2ab","#aa9c7e");rect(1125,595,72,12,"#426c84");for(let i=0;i<5;i++)rect(1137+i*12,595,2,13,"#9fb9c0");rect(1129,630,10,5,"#345163");rect(1187,630,10,5,"#345163");
  // A curbside garden and road continue outside the eastern terminal exit.
  rect(1234,80,46,160,"#749876");rect(1234,330,46,55,"#749876");
  for(let y=89;y<229;y+=25){rect(1243,y,24,16,"#547f60");rect(1247,y-3,17,20,"#6c996b");}
  // Travellers and the player share the same small face, limbs, and pixel scale.
  paintAirportPerson(c,{x:550,y:276,shirt:"#a47768",skin:"#c48f6d"});suitcase(566,265,"#61878b");
  paintAirportPerson(c,{x:1013,y:308,shirt:"#6b8c99",skin:"#e1b48c"});suitcase(1026,300,"#c59765");
  paintAirportPerson(c,{x:591,y:560,shirt:"#d5c579",skin:"#d9a67e",outdoors:true,crew:true});

  return { draw(target:CanvasRenderingContext2D,camera:Point,player:Walker,time:number,visited:ReadonlySet<string>,reduced:boolean,waypoint?:Point|null){
    const ox=Math.round(target.canvas.width/2-camera.x),oy=Math.round(target.canvas.height/2-camera.y);
    target.imageSmoothingEnabled=false;target.fillStyle="#80959e";target.fillRect(0,0,target.canvas.width,target.canvas.height);target.drawImage(layer,ox,oy);
    // Slow-moving luggage, with all motion still on the source pixel grid.
    const perimeter=2*(284+64);
    for(let n=0;n<7;n++){
      let d=(n*97+(reduced?0:time*.014))%perimeter,x=191,y=158;
      if(d<284)x+=d;else if((d-=284)<64){x+=284;y+=d;}else if((d-=64)<284){x+=284-d;y+=64;}else{d-=284;y+=64-d;}
      const bx=Math.round(x+ox),by=Math.round(y+oy);target.fillStyle="#263e4d";target.fillRect(bx+2,by-2,6,2);
      target.fillStyle=["#cb8767","#729b91","#b7a477","#8d809c"][n%4];target.fillRect(bx,by,11,8);target.fillStyle="#d0d6bd";target.fillRect(bx+3,by+1,1,6);
    }
    for(const story of LIFE_STORIES.filter(s=>(s.chapter??"airport")==="airport")){const x=ox+story.x,y=oy+story.y,bob=reduced?0:Math.round(Math.sin(time*.002)*2);target.fillStyle=visited.has(story.id)?"#779a9b":"#fff1af";for(let r=-3;r<=3;r++)target.fillRect(x-(3-Math.abs(r)),y-12+r+bob,(3-Math.abs(r))*2+1,1);target.fillStyle="#485f70";target.fillRect(x-8,y+3,17,1);}
    if(waypoint && Math.hypot(waypoint.x-player.x,waypoint.y-player.y)>18){
      const x=Math.round(ox+waypoint.x),y=Math.round(oy+waypoint.y);target.fillStyle="#ffebae";
      for(const side of [-1,1]){target.fillRect(x+side*5-(side<0?0:2),y-4,3,1);target.fillRect(x+side*5,y-4,1,3);target.fillRect(x+side*5-(side<0?0:2),y+4,3,1);}
    }
    paintAirportPerson(target,{...player,x:ox+player.x,y:oy+player.y,child:true,playful:true,outdoors:player.y>387},time);
    // The overhead entrance sign passes in front of the child at the doorway.
    if(player.y<367)target.drawImage(layer,601,330,103,24,ox+601,oy+330,103,24);
  }};
}
