import { type Point, type Rect, type Walker } from "./life-world";
import { paintAirportPerson } from "./pixel-person";
import { paintChessboard } from "./pixel-chess";
import { createWorldNavigator } from "./world-navigation";
import { ROOM_OBJECTS, nearbyRoomObject, roomObjectById, type RoomObject } from "./room-objects";
import type { AirportGuide } from "./airport-guide";

export const HOME_WORLD = { width: 840, height: 720 };
export const HOME_START = { x: 466, y: 493 };
export const HOME_CHESS = { x: 370, y: 488 };
export const CHESS_TABLE = { x: 312, y: 336, w: 116, h: 110 };
export const HOME_OBSTACLES: Rect[] = [
  { x: 118, y: 305, w: 110, h: 155 }, // bed
  { x: 237, y: 453, w: 39, h: 31 }, // toy box
  { x: 234, y: 378, w: 42, h: 42 }, // LEGO baseplate
  CHESS_TABLE, { x: 344, y: 450, w: 30, h: 18 }, // chess stool
  { x: 526, y: 310, w: 171, h: 74 }, // computer desk
  { x: 700, y: 322, w: 24, h: 62 }, // tower
  { x: 584, y: 403, w: 40, h: 35 }, // desk chair
];
const inside = (p: Point, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
export function canWalkHome(p: Point) {
  const floor = inside(p, { x: 110, y: 300, w: 620, h: 219 }) || inside(p, { x: 444, y: 510, w: 44, h: 33 });
  return floor && !HOME_OBSTACLES.some(r => inside(p, { x: r.x - 5, y: r.y - 3, w: r.w + 10, h: r.h + 8 }));
}
export const atHomeReturn = (p: Point) => p.y >= 535 && p.x >= 444 && p.x <= 488;
export const nextHomeWaypoint = createWorldNavigator(HOME_WORLD, canWalkHome);
export function homePlace(p: Point) {
  if (p.y > 485 && p.x > 437 && p.x < 495) return { id: "home-door", name: "My room · 18 Holsworthy" };
  if (p.x > 510) return { id: "home-computer", name: "One more game of agar.io" };
  if (p.x < 290) return { id: "home-lego", name: "LEGO sets & Star Wars" };
  return { id: "home-chess", name: "Where I learned chess" };
}
export function getHomeGuide(player: Point, _entered: boolean, read: boolean, visited?: ReadonlySet<string>, hovered?: string | null): AirportGuide {
  const seen = visited ?? new Set(read ? ROOM_OBJECTS.map(object => object.id) : []);
  const remaining = ROOM_OBJECTS.filter(object => !seen.has(object.id));
  const near = (hovered && roomObjectById(hovered)) || nearbyRoomObject(player);
  const next = remaining.reduce<RoomObject | null>((best, object) => !best || Math.hypot(player.x-object.position.x, player.y-object.position.y) < Math.hypot(player.x-best.position.x, player.y-best.position.y) ? object : best, null);
  const id = next ? "home-explore" : "home-complete";
  const title = near ? `View ${near.label}` : next ? "Take a closer look." : "Every little piece of my room.";
  const hint = near ? "Press E or choose View below. You can also click the object." : next ? "Click any object, or walk up and press E. The arrow points to something you haven’t viewed." : "You’ve explored all 8 objects. The doorway leads back to the airport.";
  const touchHint = near ? "Tap View below, or tap the object itself." : next ? "Tap an object to view it. The room map lists all 8." : "All 8 objects viewed. Walk through the doorway to revisit the airport.";
  const target = next?.position ?? null;
  const waypoint = target ? (next?.id === "first-home" && player.y >= 480 && player.x >= 280 ? target : nextHomeWaypoint(player, target)) : null;
  const dx = waypoint ? waypoint.x-player.x : 0, dy = waypoint ? waypoint.y-player.y : 0;
  const arrow = !waypoint ? "✓" : Math.abs(dx)>Math.abs(dy) ? (dx>0 ? "→" : "←") : (dy>0 ? "↓" : "↑");
  return { id, step: ROOM_OBJECTS.length-remaining.length, total: ROOM_OBJECTS.length, title, hint, touchHint, target, waypoint, arrow };
}

// Tiny lettering stays on the same integer-pixel grid as the room.
const GLYPHS: Record<string, string[]> = {
  A:["010","101","111","101","101"],G:["111","100","101","101","111"],R:["110","101","110","101","101"],
  I:["111","010","010","010","111"],O:["111","101","101","101","111"],S:["111","100","111","001","111"],
  T:["111","010","010","010","010"],W:["101","101","101","111","101"],L:["100","100","100","100","111"],
  E:["111","100","110","100","111"],".":["000","000","000","000","010"]," ":["000","000","000","000","000"],
};
function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale=1) {
  c.fillStyle=color;
  [...text.toUpperCase()].forEach((letter,i)=>GLYPHS[letter]?.forEach((row,j)=>[...row].forEach((on,k)=>{ if(on==="1") c.fillRect(x+(i*4+k)*scale,y+j*scale,scale,scale); })));
}
function cell(c: CanvasRenderingContext2D,x:number,y:number,size:number,color:string) {
  c.fillStyle=color; const a=Math.round(x), b=Math.round(y);
  for (let dy=-size; dy<=size; dy++) {
    const half=Math.floor(Math.sqrt(size*size-dy*dy));
    c.fillRect(a-half,b+dy,half*2+1,1);
  }
}

export function createHomeWorld() {
  const layer = document.createElement("canvas"); layer.width = HOME_WORLD.width; layer.height = HOME_WORLD.height;
  const ctx = layer.getContext("2d", { alpha: false }); if (!ctx) return null;
  const c=ctx;
  const r=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
  const noise=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  const box=(x:number,y:number,w:number,h:number,depth:number,top:string,front:string)=>{
    r(x+4,y+depth+3,w,h,"#665343");r(x,y,w,h,top);r(x,y+h,w,depth,front);r(x,y,w,1,"#e0c89f");
  };
  const brick=(x:number,y:number,w:number,h:number,color:string,shade:string)=>{
    r(x,y,w,h,color);r(x,y+h-2,w,2,shade);for(let xx=x+2;xx<x+w-2;xx+=6){r(xx,y-2,3,2,color);r(xx,y-2,2,1,"#e1d9ad");}
  };
  // A single cutaway bedroom. The threshold is the spawn, not another level.
  r(0,0,HOME_WORLD.width,HOME_WORLD.height,"#29383e");
  for(let y=0;y<HOME_WORLD.height;y+=4)for(let x=0;x<840;x+=4)if(noise(x,y)>.72)r(x,y,2,2,"#2e3e44");
  r(95,179,658,365,"#202d32");r(100,174,640,360,"#917459");
  r(108,180,624,122,"#7d9b9b");
  for(let x=110;x<730;x+=24){r(x,180,1,119,"#88a4a0");for(let y=190;y<290;y+=24)r(x+12,y,2,2,"#6f9194");}
  r(108,296,624,7,"#d7c89f");r(108,303,624,217,"#b78c62");
  for(let y=303;y<520;y++)for(let x=108;x<732;x++){
    if((y-303)%18===0)r(x,y,1,1,"#936b4d");
    else if((x+Math.floor((y-303)/18)%2*47)%94===0)r(x,y,1,1,"#a27853");
    else if(noise(x,y)>.955)r(x,y,2,1,"#caa276");
  }
  r(100,174,8,346,"#546e70");r(732,174,8,346,"#546e70");r(102,174,2,346,"#afc0ae");
  // Window, drawn foliage, and small patches of afternoon light.
  r(117,205,124,69,"#4d666d");r(122,209,114,59,"#aacbd0");
  r(122,247,114,21,"#779c77");
  for(let x=124;x<233;x+=12){r(x,237+(x%7),10,22,"#658b6e");r(x+2,233+(x%7),6,6,"#8daa77");}
  r(176,209,4,59,"#e2ddbd");r(122,236,114,3,"#e2ddbd");r(114,270,130,4,"#e5d6af");
  r(113,201,8,69,"#bf8c66");r(237,201,8,69,"#bf8c66");r(114,201,130,3,"#ddbb8f");
  for(let y=0;y<32;y++){r(126+Math.floor(y/3),305+y,32,1,"#c7a377");r(162+Math.floor(y/3),305+y,32,1,"#c7a377");}
  // Two Star Wars posters: Vader's helmet and a Death Star / X-wing scene.
  for(const x of [280,398]){r(x-3,202,89,86,"#3d4544");r(x,205,83,80,"#172938");r(x+1,206,81,1,"#768d8c");label(c,"STAR WARS",x+7,210,"#e8c56c",2);}
  r(307,229,27,5,"#65727c");r(302,234,37,10,"#404f5c");r(298,244,45,25,"#293540");r(294,263,53,9,"#42525c");
  r(308,241,24,12,"#1a2531");r(309,246,7,2,"#9baca7");r(325,246,7,2,"#9baca7");r(318,251,5,7,"#62727b");
  r(311,260,4,9,"#879391");r(318,260,4,9,"#879391");r(325,260,4,9,"#879391");
  r(288,231,2,40,"#ad5262");r(289,234,1,34,"#f3c5aa");
  cell(c,449,244,17,"#7b9192");r(433,242,32,2,"#4d6874");r(445,231,7,5,"#4b6671");r(451,252,10,2,"#a2b2a4");
  for(const [x,y] of [[410,235],[466,230],[419,259],[472,267]])r(x,y,1,1,"#d3cfaa");
  r(410,267,31,3,"#c3c5b4");r(423,260,5,15,"#e0d4b4");r(413,263,2,11,"#ad6260");r(437,263,2,11,"#ad6260");
  // LEGO display shelf with a castle, a red car and a small space fighter.
  box(119,291,140,9,7,"#b58a5f","#7f5c47");
  brick(124,278,30,12,"#a3aaa0","#737e80");brick(123,267,9,13,"#b9b9a8","#7e8986");brick(147,267,9,13,"#b9b9a8","#7e8986");
  r(135,283,7,7,"#465b62");r(126,263,4,4,"#b75d58");
  brick(167,282,31,7,"#c35b52","#873c3b");brick(175,276,16,6,"#d7795c","#9e5044");r(178,278,9,3,"#a8c6c3");r(171,288,5,4,"#263840");r(190,288,5,4,"#263840");
  brick(215,281,34,4,"#bac4b7","#6b8184");brick(226,273,10,13,"#d7d6be","#859490");r(228,269,5,4,"#6c9ea3");r(217,277,3,13,"#a65e57");r(244,277,3,13,"#a65e57");
  label(c,"LEGO",127,299,"#ead6a2");
  // Bed, folded quilt, toy crate and loose bricks.
  box(118,305,110,145,10,"#586f83","#3d5364");r(119,302,108,8,"#b1936e");r(124,315,98,29,"#ded3af");r(130,318,39,21,"#efe2bc");r(175,318,40,21,"#c9c4ac");
  r(124,347,98,94,"#698e9b");r(125,347,96,8,"#93adb0");
  for(let y=360;y<440;y+=18){r(125,y,96,2,"#476b80");r(138,y-7,2,16,"#85a5a8");r(204,y-7,2,16,"#85a5a8");}
  r(124,443,98,7,"#c7b490");
  box(237,453,39,26,5,"#c69a59","#906b48");r(241,458,31,13,"#aa7f4e");label(c,"LEGO",243,462,"#edd99b");
  brick(243,447,12,8,"#aa4c49","#7c3c3d");brick(259,448,11,7,"#577d9c","#3c5b76");
  r(234,378,42,42,"#7a986d");for(let y=381;y<419;y+=5)for(let x=237;x<275;x+=5)r(x,y,1,1,"#b0b78b");
  brick(241,393,23,10,"#b45749","#7e4340");brick(246,383,13,10,"#d3b65d","#a1834b");brick(258,406,12,7,"#5c89a2","#3f627b");
  // A proper board, oriented with the white pieces nearest the player.
  r(300,326,140,155,"#5b7880");r(304,330,132,147,"#819c99");r(308,334,124,139,"#65858b");
  box(CHESS_TABLE.x,CHESS_TABLE.y,CHESS_TABLE.w,103,7,"#b68b5f","#7b5741");paintChessboard(c,322,340);
  box(344,450,30,13,5,"#be9a6c","#886443");r(348,468,3,5,"#614b3e");r(367,468,3,5,"#614b3e");
  // Desk, tower, keyboard, mouse, swivel chair, and a candy bowl.
  box(526,310,171,64,10,"#c1a477","#876d50");r(534,384,5,21,"#745a47");r(687,384,5,21,"#745a47");
  r(545,274,132,74,"#8fb6aa");r(550,271,122,81,"#a7c4b4");
  r(553,279,116,65,"#263944");r(557,283,108,54,"#d5dfcf");r(558,338,106,3,"#587581");r(605,344,10,9,"#506873");r(588,351,46,4,"#334d59");
  r(550,360,91,15,"#46606e");r(553,362,85,10,"#97aba9");for(let y=363;y<371;y+=3)for(let x=555;x<638;x+=5)r(x,y,3,2,"#d2d2b7");r(574,371,34,2,"#d2d2b7");
  r(649,359,17,18,"#6f8688");r(654,361,8,12,"#d0cfb7");r(657,362,1,4,"#4a6672");
  box(700,322,24,52,10,"#3e535d","#263d49");r(704,328,16,3,"#799191");r(705,342,15,1,"#1d3542");r(705,347,15,1,"#1d3542");r(708,361,3,3,"#aac69c");
  r(598,430,8,13,"#455d66");r(582,441,40,3,"#455d66");r(581,441,4,5,"#2b414c");r(619,441,4,5,"#2b414c");
  box(584,410,40,19,5,"#568184","#3c5e67");r(585,399,38,18,"#477078");r(589,400,30,2,"#91aba1");
  r(672,357,20,8,"#86b0b2");r(674,364,16,4,"#527780");r(670,355,24,3,"#bdd2be");
  for(const [x,y,col] of [[674,352,"#db8b97"],[683,352,"#d1b65e"],[678,349,"#a1bd80"],[686,349,"#a7a0bf"]] as const){r(x,y,5,4,col);r(x-2,y+1,2,2,col);r(x+5,y+1,2,2,col);r(x+1,y,1,1,"#f2e0b7");}
  // Two recognizable strung badminton rackets hanging on the wall.
  for(const [x,y,col] of [[706,230,"#c97966"],[723,251,"#e2d3a4"]] as const){
    r(x-5,y-14,11,2,col);r(x-8,y-11,3,17,col);r(x+6,y-11,3,17,col);r(x-5,y+6,11,2,col);r(x-6,y-12,2,2,col);r(x+5,y-12,2,2,col);
    for(let xx=x-3;xx<=x+3;xx+=3)r(xx,y-11,1,17,"#b2c2b2");for(let yy=y-9;yy<=y+4;yy+=4)r(x-5,yy,11,1,"#b2c2b2");
    r(x,y+8,1,20,"#d3d4b6");r(x-1,y+26,3,11,"#334c5c");r(x-1,y+28,3,1,col);r(x-1,y+32,3,1,col);
  }
  r(695,285,9,1,"#e9e0b8");r(696,286,7,3,"#e9e0b8");r(698,289,3,4,"#c6b593");
  // Open doorway: walking down revisits the airport; arrival starts above it.
  for(const [x,w] of [[100,340],[492,248]]){r(x,520,w,15,"#637c7c");r(x,520,w,3,"#bdc5ac");}
  r(440,516,4,28,"#d6c6a0");r(488,516,4,28,"#d6c6a0");r(444,520,44,24,"#b99367");r(444,536,44,2,"#ddc69c");
  r(445,496,42,15,"#758b86");r(448,499,36,9,"#9eaf9a");

  function drawScene(target: CanvasRenderingContext2D, camera: Point, time: number, reduced: boolean) {
    const ox=Math.round(target.canvas.width/2-camera.x),oy=Math.round(target.canvas.height/2-camera.y);
    target.imageSmoothingEnabled=false;target.fillStyle="#29383e";target.fillRect(0,0,target.canvas.width,target.canvas.height);target.drawImage(layer,ox,oy);
    // A tiny, continuously looping agar.io match, rendered at native pixels.
    const sx=ox+557,sy=oy+283;target.fillStyle="#e0e5d6";target.fillRect(sx,sy,108,54);
    target.fillStyle="#cbd6cd";for(let x=0;x<108;x+=8)target.fillRect(sx+x,sy,1,54);for(let y=0;y<54;y+=8)target.fillRect(sx,sy+y,108,1);
    const colors=["#d17e8d","#82aa66","#b798ce","#e2ae63","#72a8b6"];
    for(let i=0;i<26;i++){target.fillStyle=colors[i%5];target.fillRect(sx+3+(i*37)%100,sy+12+(i*19)%38,1,1);}
    const phase=reduced?0:time/8000*Math.PI*2;
    for(const [i,cx,cy,size] of [[0,27,29,9],[1,67,35,6],[2,89,20,4],[3,48,19,4]])cell(target,sx+cx+Math.sin(phase+i*2)*5,sy+cy+Math.cos(phase+i)*4,size,colors[i]);
    label(target,"agar.io",sx+3,sy+3,"#4d6771");
    // Hard-edged pools of screen light stay on the room’s pixel grid.
    target.fillStyle="#c5e6c0"; target.globalAlpha=reduced ? .09 : .07+Math.sin(time*.0006)*.02;
    target.fillRect(ox+540,oy+386,132,8);target.fillRect(ox+548,oy+394,116,7);target.globalAlpha=1;
  }
  return {
    drawDetail(target: CanvasRenderingContext2D, object: RoomObject, time: number, reduced: boolean) {
      drawScene(target,{x:object.detail.x+object.detail.w/2,y:object.detail.y+object.detail.h/2},time,reduced);
    },
    draw(target:CanvasRenderingContext2D,camera:Point,player:Walker,time:number,visited:ReadonlySet<string>,reduced:boolean,waypoint?:Point|null,hovered?:string|null){
      drawScene(target,camera,time,reduced);
      const ox=Math.round(target.canvas.width/2-camera.x),oy=Math.round(target.canvas.height/2-camera.y);
      const selected=hovered ?? nearbyRoomObject(player)?.id;
      for(const object of ROOM_OBJECTS){
        const area=object.areas[0], x=ox+area.x+area.w-4, y=oy+area.y-4;
        target.fillStyle=visited.has(object.id)?"#a3b9a2":"#fbe5ad";
        target.fillRect(x-2,y,5,1);target.fillRect(x,y-2,1,5);
        if(object.id===selected){
          target.fillStyle=object.accent;
          for(const bounds of object.areas){
            const left=ox+bounds.x-3,top=oy+bounds.y-3,right=left+bounds.w+5,bottom=top+bounds.h+5;
            for(const [xx,yy,sx,sy] of [[left,top,1,1],[right,top,-1,1],[left,bottom,1,-1],[right,bottom,-1,-1]]){
              target.fillRect(xx+(sx<0?-7:0),yy,8,2);target.fillRect(xx,yy+(sy<0?-7:0),2,8);
            }
          }
        }
      }
      if(waypoint&&Math.hypot(waypoint.x-player.x,waypoint.y-player.y)>18){const x=Math.round(ox+waypoint.x),y=Math.round(oy+waypoint.y);target.fillStyle="#fbe4ad";target.fillRect(x-4,y-4,3,1);target.fillRect(x+2,y-4,3,1);target.fillRect(x-4,y+4,3,1);target.fillRect(x+2,y+4,3,1);}
      paintAirportPerson(target,{...player,x:ox+player.x,y:oy+player.y,child:true,playful:true,outdoors:false},time);
    }
  };
}
