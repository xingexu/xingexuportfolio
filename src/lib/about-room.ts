/** A grayscale pixel illustration. Geometry and light are rasterized once per size. */
export const ROOM_FRAME_MS = 125;
export const ROOM_LOOP_FRAMES = 64;
export const ROOM_CELL = 3;

const MARGIN = 6;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
type Point = readonly [number, number];
type Material = "paint" | "metal" | "wood" | "glass";

function noise(x: number, y: number) {
  let n = Math.imul(x + 179, 374761393) ^ Math.imul(y + 421, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** Every mark is a square, opaque pixel; no blur, gradients, strokes or antialiasing. */
class Pixels {
  readonly data: Uint8ClampedArray;
  constructor(readonly width: number, readonly height: number) {
    this.data = new Uint8ClampedArray(width * height * 4);
  }
  pixel(x: number, y: number, shade: number, material: Material = "paint") {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const grain = (noise(x, y) - .5) * (material === "glass" ? 2 : 4);
    const clusters = (noise(Math.floor(x / 5), Math.floor(y / 4)) - .5) * 2;
    const surface = material === "wood" ? (noise(Math.floor(x / 13), y) - .5) * 6
      : material === "metal" ? (y % 3 === 0 ? 2 : -1) : clusters;
    const threshold = BAYER[(y & 3) * 4 + (x & 3)] / 16;
    const value = Math.max(4, Math.min(112, Math.floor((shade + grain + surface) / 4 + threshold) * 4));
    const index = (y * this.width + x) * 4;
    this.data[index] = value; this.data[index + 1] = value; this.data[index + 2] = value; this.data[index + 3] = 255;
  }
  rect(x: number, y: number, w: number, h: number, shade: number, material: Material = "paint") {
    for (let py = Math.max(0, Math.round(y)); py < Math.min(this.height, Math.round(y + h)); py++)
      for (let px = Math.max(0, Math.round(x)); px < Math.min(this.width, Math.round(x + w)); px++) this.pixel(px, py, shade, material);
  }
  polygon(points: readonly Point[], shade: number, material: Material = "paint") {
    const minY = Math.max(0, Math.ceil(Math.min(...points.map(p => p[1]))));
    const maxY = Math.min(this.height - 1, Math.floor(Math.max(...points.map(p => p[1]))));
    for (let y = minY; y <= maxY; y++) {
      const intersections: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) intersections.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i < intersections.length; i += 2)
        for (let x = Math.max(0, Math.ceil(intersections[i])); x < Math.min(this.width, Math.ceil(intersections[i + 1])); x++) this.pixel(x, y, shade, material);
    }
  }
  line(a: Point, b: Point, shade: number, thickness = 1) {
    let x = Math.round(a[0]), y = Math.round(a[1]);
    const endX = Math.round(b[0]), endY = Math.round(b[1]);
    const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
    const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      this.rect(x, y, thickness, thickness, shade, "metal");
      if (x === endX && y === endY) break;
      const next = error * 2;
      if (next >= dy) { error += dy; x += sx; }
      if (next <= dx) { error += dx; y += sy; }
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, shade: number, material: Material = "metal") {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      const span = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
      this.rect(cx - span, y, span * 2, 1, shade, material);
    }
  }
  canvas() {
    const canvas = document.createElement("canvas");
    canvas.width = this.width; canvas.height = this.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const image = ctx.createImageData(this.width, this.height);
      image.data.set(this.data);
      ctx.putImageData(image, 0, 0);
    }
    return canvas;
  }
}

export type AboutRoom = ReturnType<typeof createAboutRoom>;

type PixelLight = { x: number; y: number; width: number; height: number; reach: number; strength: number; hollow?: boolean };

/** Five dithered light bands on the same source grid. No canvas shadows or CSS blur. */
function pixelGlow(width: number, height: number, lights: PixelLight[]) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const image = ctx.createImageData(width, height);
  for (const light of lights) {
    for (let y = Math.max(0, Math.floor(light.y - light.reach)); y < Math.min(height, light.y + light.height + light.reach); y++) {
      for (let x = Math.max(0, Math.floor(light.x - light.reach)); x < Math.min(width, light.x + light.width + light.reach); x++) {
        const dx = Math.max(light.x - x, 0, x - light.x - light.width + 1);
        const dy = Math.max(light.y - y, 0, y - light.y - light.height + 1);
        if (light.hollow && dx === 0 && dy === 0) continue;
        const distance = Math.hypot(dx, dy);
        if (distance >= light.reach) continue;
        const band = Math.floor((1 - distance / light.reach) * 5 + BAYER[(y & 3) * 4 + (x & 3)] / 16);
        const alpha = Math.round(band / 5 * light.strength * 255);
        const i = (y * width + x) * 4;
        image.data[i] = 255; image.data[i + 1] = 255; image.data[i + 2] = 255;
        image.data[i + 3] = Math.max(image.data[i + 3], alpha);
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function createAboutRoom(width: number, height: number) {
  const w = width + MARGIN * 2, h = height + MARGIN * 2;
  const mobile = width <= 350;
  const compact = width < 350;
  const back = new Pixels(w, h), front = new Pixels(w, h);
  const point = (x: number, y: number): Point => [MARGIN + width * x, MARGIN + height * y];
  const poly = (layer: Pixels, points: readonly Point[], shade: number, material: Material = "paint") => layer.polygon(points.map(p => point(...p)), shade, material);
  const line = (layer: Pixels, a: Point, b: Point, shade: number, thickness = 1) => layer.line(point(...a), point(...b), shade, thickness);

  // Dithered plaster fills the entire image behind the workstation.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x - MARGIN) / width, v = (y - MARGIN) / height;
    const lamp = Math.max(0, 1 - Math.hypot((u - .28) * 1.7, (v - .22) * 1.3));
    const edge = Math.min(1, Math.abs(u - .5) * 2);
    back.pixel(x, y, 14 + lamp * 13 - edge * 7 + (v > .65 ? 3 : 0));
  }

  const wallL = mobile ? .07 : compact ? .12 : .205, wallR = 1 - wallL;
  poly(back, [[0, 0], [wallL, .14], [wallL, .735], [0, .96]], 23);
  poly(back, [[1, 0], [wallR, .14], [wallR, .735], [1, .96]], 13);
  poly(back, [[0, 0], [1, 0], [wallR, .14], [wallL, .14]], 10, "metal");
  line(back, [wallL, .14], [wallL, .735], 32);
  line(back, [wallR, .14], [wallR, .735], 25);
  line(back, [wallL, .14], [wallR, .14], 38);
  line(back, [wallL, .145], [wallR, .145], 8);

  // Ceiling ribs and inset light housings recede toward the back wall.
  for (const u of [.06, .16, .84, .94]) {
    line(back, [u, 0], [.5 + (u - .5) * (1 - 2 * wallL), .14], 28, 2);
    line(back, [u + .008, 0], [.5 + (u - .492) * (1 - 2 * wallL), .14], 7);
  }
  line(back, [.28, .12], [.43, .12], 64);
  line(back, [.57, .12], [.72, .12], 44);
  for (let y = .26; y < .7; y += .11) {
    line(back, [0, y - .04], [wallL, y], 12);
    line(back, [1, y - .04], [wallR, y], 7);
  }

  // Narrow seams in large plaster panels; the center stays low contrast.
  for (const u of [.32, .68]) line(back, [u, .15], [u, .73], 16);
  line(back, [wallL, .735], [wallR, .735], 9, 2);
  line(back, [wallL, .743], [wallR, .743], 29);
  poly(back, [[0, .96], [wallL, .75], [wallR, .75], [1, .96], [1, 1], [0, 1]], 13, "wood");
  for (const x of [-.8, -.35, .05, .35, .65, .95, 1.35, 1.8]) {
    const atBack = .5 + (x - .5) * .18;
    line(back, [atBack, .75], [x, 1], 5);
  }
  for (const y of [.78, .82, .88, .96]) line(back, [0, y], [1, y], 7);

  // Recessed bookcase: each shelf has a rear shadow, a side face and a worn edge.
  const shelfX = width * (mobile ? .025 : .018) + MARGIN;
  const shelfY = height * (mobile ? .085 : .15) + MARGIN;
  const shelfW = width * (mobile ? .32 : compact ? .10 : .155);
  const shelfH = height * (mobile ? .105 : .16);
  back.rect(shelfX - 3, shelfY - 3, shelfW + 7, shelfH + 7, 8, "wood");
  back.rect(shelfX, shelfY, shelfW, shelfH, 13);
  const rows = mobile ? 1 : 2;
  for (let row = 0; row < rows; row++) {
    const bottom = shelfY + (row + 1) * shelfH / rows;
    for (let i = 0, x = shelfX + 3; x < shelfX + shelfW - 3; i++) {
      const bw = 3 + i % 3, bh = Math.min(shelfH / rows - 5, 9 + noise(i, row) * 18);
      const shade = 24 + noise(i + 4, row) * 32;
      back.rect(x + 1, bottom - bh - 1, bw, bh, 7);
      back.rect(x, bottom - bh, bw - 1, bh, shade, "wood");
      back.rect(x, bottom - bh + 2, 1, bh - 3, shade + 12);
      if (i % 3) back.rect(x + 1, bottom - bh + 4, bw - 2, 1, 68);
      back.rect(x + 1, bottom - 3, bw - 2, 1, 15);
      x += bw + 1;
    }
    back.rect(shelfX - 1, bottom, shelfW + 3, 2, 49, "wood");
    back.rect(shelfX - 1, bottom + 2, shelfW + 3, 3, 18, "wood");
  }
  back.rect(shelfX - 3, shelfY - 3, 2, shelfH + 9, 38, "wood");
  back.rect(shelfX + shelfW + 2, shelfY - 3, 2, shelfH + 9, 20, "wood");

  // Acoustic panels on the right wall, with a hanging set of headphones.
  const panelX = MARGIN + width * (mobile ? .76 : compact ? .90 : .85);
  const panelY = MARGIN + height * (mobile ? .09 : .16);
  const panelW = width * (mobile ? .20 : compact ? .08 : .12), panelH = height * (mobile ? .105 : .14);
  back.rect(panelX - 2, panelY - 2, panelW + 4, panelH + 4, 8);
  back.rect(panelX, panelY, panelW, panelH, 25, "metal");
  for (let x = panelX + 2; x < panelX + panelW - 1; x += 3) {
    back.rect(x, panelY + 1, 1, panelH - 2, 42, "metal");
    back.rect(x + 1, panelY + 1, 1, panelH - 2, 11);
  }
  if (!mobile) {
    const hx = panelX + panelW / 2, hy = panelY + panelH * .4;
    back.ellipse(hx, hy, 10, 13, 8); back.ellipse(hx, hy, 8, 11, 55);
    back.ellipse(hx, hy + 2, 6, 10, 13); back.rect(hx - 8, hy + 1, 17, 14, 25, "metal");
    back.rect(hx - 11, hy + 1, 5, 12, 9); back.rect(hx - 10, hy + 2, 3, 9, 48, "metal");
    back.rect(hx + 7, hy + 1, 5, 12, 8); back.rect(hx + 7, hy + 2, 2, 9, 38, "metal");
    back.line([hx + 10, hy + 13], [hx + 13, hy + 30], 8);
  }

  // Native HTML biography text is aligned with these two pixel monitor faces.
  const narrow = width <= 200;
  const bioMonitors = !mobile ? [
    { x: width * .035, y: height * .32, width: width * .27, height: height * .35, slope: height * .02 },
    { x: width * .695, y: height * .34, width: width * .27, height: height * .35, slope: -height * .02 },
  ] : narrow ? [
    { x: width * .06, y: height * .205, width: width * .88, height: height * .17, slope: 0 },
    { x: width * .06, y: height * .40, width: width * .88, height: height * .185, slope: 0 },
  ] : [
    { x: width * .04, y: height * .25, width: width * .44, height: height * .285, slope: 0 },
    { x: width * .52, y: height * .25, width: width * .44, height: height * .285, slope: 0 },
  ];
  const displayX = MARGIN + width * (mobile ? .06 : .325);
  const displayY = MARGIN + height * (narrow ? .635 : mobile ? .59 : .33);
  const displayW = width * (mobile ? .88 : .35);
  const displayH = height * (narrow ? .155 : mobile ? .20 : .34);

  // A single central mount and cable sleeve support the remaining display.
  line(back, [.49, mobile ? .77 : .64], [.49, mobile ? .86 : .79], 9, 5);
  line(back, [.49, mobile ? .77 : .64], [.49, mobile ? .86 : .79], 45, 2);
  if (!mobile) {
    for (const side of [-1, 1]) {
      line(back, [.49,.74], [.5 + side * .21,.71], 8, 5);
      line(back, [.5 + side * .21,.71], [.5 + side * .32,.64], 8, 5);
      line(back, [.49,.74], [.5 + side * .21,.71], 45, 2);
      line(back, [.5 + side * .21,.71], [.5 + side * .32,.64], 38, 2);
      back.ellipse(...point(.5 + side * .21,.71), 3, 3, 55);
      back.ellipse(...point(.5 + side * .21,.71), 1, 1, 10);
    }
  }
  poly(back, [[.46,.78],[.54,.78],[.56,.80],[.44,.80]], 19, "metal");
  back.rect(displayX + 3, displayY + 4, displayW, displayH, 6);
  back.rect(displayX + displayW * .43, displayY + displayH, displayW * .14, 4, 13, "metal");
  back.rect(displayX, displayY, displayW, displayH, 39, "metal");
  back.rect(displayX + 1, displayY + 1, displayW - 2, displayH - 2, 19, "metal");
  back.rect(displayX + 3, displayY + 3, displayW - 6, displayH - 7, 8, "glass");
  back.line([displayX + 1, displayY], [displayX + displayW - 2, displayY], 74);
  back.line([displayX, displayY + 1], [displayX, displayY + displayH - 2], 51);
  const screen = (u: number, v: number): Point => [displayX + displayW * u, displayY + displayH * v];
  for (let i = 0; i < 4; i++) back.rect(...screen(.065 + i * .036, .065), 3, 1, i === 0 ? 72 : 32);
  for (let i = 0; i < 3; i++) back.rect(...screen(.89 + i * .025, .065), 1, 1, 53);

  const plotX = displayX + displayW * .065, plotY = displayY + displayH * .16;
  const plotW = displayW * .86, plotH = displayH * .50;
  const volumeBottom = displayY + displayH * .88;
  for (let row = 0; row <= 5; row++) back.line([plotX, plotY + plotH * row / 5], [plotX + plotW, plotY + plotH * row / 5], 24);
  for (let col = 0; col <= 8; col++) back.line([plotX + plotW * col / 8, plotY], [plotX + plotW * col / 8, volumeBottom], 20);
  back.line([plotX, displayY + displayH * .72], [plotX + plotW, displayY + displayH * .72], 36);
  back.line([plotX, volumeBottom], [plotX + plotW, volumeBottom], 36);

  const prices = [.29,.34,.28,.36,.43,.39,.48,.53,.46,.41,.49,.57,.54,.63,.59,.65,.70,.66,.73,.68,.62,.67,.76,.71,.79,.74,.69,.77,.82,.76,.81,.85];
  const count = mobile ? 18 : 32;
  const step = plotW / count, bodyW = Math.max(1, Math.floor(step * .55));
  let average: Point | null = null;
  let lastCandle = { x: 0, open: 0, close: 0, volume: 0 };
  for (let i = 0; i < count; i++) {
    const index = Math.round(i / (count - 1) * (prices.length - 1));
    const close = prices[index], open = prices[Math.max(0, index - 1)];
    const x = Math.round(plotX + (i + .5) * step);
    const openY = Math.round(plotY + (1 - open) * plotH), closeY = Math.round(plotY + (1 - close) * plotH);
    const volume = Math.max(2, Math.round(displayH * (.025 + Math.abs(close - open) * .75 + noise(i, 19) * .035)));
    const mean = prices.slice(Math.max(0, index - 4), index + 1).reduce((sum, value) => sum + value, 0) / Math.min(index + 1, 5);
    const nextAverage: Point = [x, Math.round(plotY + (1 - mean) * plotH)];
    if (average) back.line(average, nextAverage, 43);
    average = nextAverage;
    if (i === count - 1) { lastCandle = { x, open: openY, close: closeY, volume }; continue; }
    const top = Math.min(openY, closeY), candleH = Math.max(2, Math.abs(openY - closeY));
    back.rect(x, top - 2 - i % 3, 1, candleH + 4 + i % 3, 69);
    back.rect(x - Math.floor(bodyW / 2), top, bodyW, candleH, close >= open ? 85 : 55, "metal");
    if (close < open && bodyW > 2 && candleH > 2) back.rect(x - Math.floor(bodyW / 2) + 1, top + 1, bodyW - 2, candleH - 2, 12, "glass");
    back.rect(x - Math.floor(bodyW / 2), volumeBottom - volume, bodyW, volume, close >= open ? 52 : 30, "metal");
  }

  back.rect(...screen(.47, .965), displayW * .06, 1, 48);

  const monitorLights: PixelLight[] = [];
  const monitorLeds: Point[] = [];
  const bio = bioMonitors.map((monitor) => {
    const { x, y, width: mw, height: mh, slope } = monitor;
    const at = (u: number, v: number): Point => [MARGIN + x + u, MARGIN + y + v + u / mw * slope];
    const quad = (u: number, v: number, rw: number, rh: number, shade: number, material: Material = "metal") => {
      back.polygon([at(u,v), at(u+rw,v), at(u+rw,v+rh), at(u,v+rh)], shade, material);
    };
    quad(2,3,mw,mh,5);
    quad(0,0,mw,mh,47);
    quad(1,1,mw-2,mh-2,20);
    quad(3,3,mw-6,mh-8,9,"glass");
    back.line(at(1,0),at(mw-2,0),85);
    back.line(at(0,1),at(0,mh-2),58);
    back.line(at(3,mh-5),at(mw-4,mh-5),35);
    for (let i=0;i<3;i++) quad(6+i*3,5,1,1,i===0?84:40);
    quad(mw-10,5,4,1,34);
    quad(mw*.43,mh-3,mw*.14,1,56);
    monitorLeds.push(at(mw-5,mh-3));
    monitorLights.push({x:MARGIN+x,y:MARGIN+y+Math.min(0,slope),width:mw,height:mh+Math.abs(slope),reach:18,strength:.27,hollow:true});
    return {
      x:x+6,y:y+10+6/mw*slope,width:mw-12,height:mh-17,
      tilt:Math.atan2(slope,mw)*180/Math.PI,
    };
  });

  const deskBack = compact ? .85 : .79, deskFront = .96;
  // Desk legs and cables sit behind the broad, foreshortened desktop.
  poly(front, [[.12, deskBack], [.14, deskBack], [.10, 1], [.07, 1]], 8, "metal");
  poly(front, [[.86, deskBack], [.89, deskBack], [.96, 1], [.92, 1]], 6, "metal");
  line(front, [.18, deskBack], [.23, 1], 21, 2);
  line(front, [.20, deskBack], [.19, 1], 7, 2);
  poly(front, [[.12, deskBack], [.88, deskBack], [1.06, deskFront], [-.06, deskFront]], 33, "wood");
  poly(front, [[-.06, deskFront], [1.06, deskFront], [1.06, deskFront + .025], [-.06, deskFront + .025]], 18, "wood");
  line(front, [.12, deskBack], [.88, deskBack], 60);
  line(front, [0, deskFront], [1, deskFront], 49);
  for (let y = deskBack + .025; y < deskFront; y += .028) line(front, [0, y], [1, y + .008], 28);

  // Keyboard on a dark desk mat, with individual perspective keycaps.
  const keyX = mobile ? .09 : .25, keyY = mobile ? .88 : compact ? .90 : .84;
  const keyW = mobile ? .41 : .25, keyH = compact ? .045 : .065;
  poly(front, [[keyX - .035, keyY - .01], [keyX + keyW + .11, keyY - .01], [keyX + keyW + .14, keyY + keyH + .025], [keyX - .06, keyY + keyH + .025]], 15, "glass");
  const keyAt = (u: number, v: number): Point => point(keyX + u * keyW - v * .025, keyY + v * keyH);
  front.polygon([keyAt(0, 0), keyAt(1, 0), keyAt(1, 1), keyAt(0, 1)], 51, "metal");
  for (let row = 0; row < 4; row++) for (let col = 0; col < 14; col++) {
    const u = .025 + col * .068, v = .08 + row * .21;
    front.polygon([keyAt(u, v), keyAt(u + .053, v), keyAt(u + .053, v + .15), keyAt(u, v + .15)], row === 3 && col > 3 && col < 10 ? 64 : 24, "metal");
    front.pixel(...keyAt(u + .02, v + .04), 91);
  }
  const mouse = point(keyX + keyW + .065, keyY + .025);
  front.ellipse(...mouse, mobile ? 3 : 5, mobile ? 5 : 7, 42);
  front.line([mouse[0], mouse[1] - 5], [mouse[0], mouse[1]], 9);
  front.rect(mouse[0] - 1, mouse[1] - 4, 1, 2, 77);

  // Compact tower: mesh front, port bank, two recessed fans and machined edges.
  const pcX = MARGIN + width * (mobile ? .74 : .925), pcY = MARGIN + height * (mobile ? .81 : compact ? .76 : .72);
  const pcW = width * (mobile ? .22 : .07), pcH = height * (mobile ? .14 : compact ? .16 : .20);
  front.rect(pcX + 2, pcY + 1, pcW, pcH, 5);
  front.rect(pcX, pcY, pcW, pcH, 25, "metal");
  front.rect(pcX, pcY, 1, pcH, 63); front.rect(pcX + 2, pcY + 2, pcW - 4, pcH - 4, 10);
  for (let py = pcY + 5; py < pcY + pcH - 3; py += 2) for (let px = pcX + 4; px < pcX + pcW - 3; px += 2) front.pixel(px, py, 29);
  front.rect(pcX + 4, pcY + 3, pcW - 8, 2, 38);
  front.rect(pcX + 5, pcY + 3, 3, 1, 8);
  const fans: Point[] = [];
  for (let i = 0; i < 2; i++) {
    const cx = pcX + pcW / 2, cy = pcY + pcH * (.36 + i * .36), radius = Math.min(pcW * .32, pcH * .13);
    front.ellipse(cx, cy, radius + 1, radius + 1, 38); front.ellipse(cx, cy, radius - 1, radius - 1, 9);
    for (let n = 0; n < 4; n++) {
      const angle = n * Math.PI / 2;
      front.line([cx, cy], [cx + Math.round(Math.cos(angle + .45) * (radius - 2)), cy + Math.round(Math.sin(angle + .45) * (radius - 2))], 43, 2);
    }
    front.ellipse(cx, cy, 2, 2, 58); fans.push([cx, cy]);
  }

  if (!mobile) {
    // A real 8 × 8 board, foreshortened into the desktop.
    const boardAt = (u: number, v: number): Point => point(.63 + u * .15 + v * .045, (compact ? .89 : .835) + v * (compact ? .06 : .09));
    front.polygon([boardAt(-.04,-.04), boardAt(1.04,-.04), boardAt(1.04,1.04), boardAt(-.04,1.04)], 10, "wood");
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const u = col / 8, v = row / 8;
      front.polygon([boardAt(u,v), boardAt(u+.125,v), boardAt(u+.125,v+.125), boardAt(u,v+.125)], (col+row)%2 ? 24 : 57, "wood");
    }
    for (const [u,v,light] of [[.19,.20,1],[.69,.34,0],[.43,.70,1],[.82,.82,0]]) {
      const [x,y] = boardAt(u,v);
      front.ellipse(x+1,y+1,4,2,8); front.rect(x-1,y-5,3,5,light ? 75 : 8);
      front.rect(x-2,y-1,5,2,light ? 65 : 13); front.rect(x-1,y-7,3,2,light ? 86 : 16);
    }
    // A cropped chair in the immediate foreground creates a final plane of depth.
    poly(front, [[.42,1.05],[.43,.965],[.45,.94],[.56,.94],[.58,.965],[.60,1.05]], 8, "metal");
    line(front, [.45,.94], [.56,.94], 35);
    line(front, [.435,.97], [.45,.945], 24, 2);
    for (let y = .965; y < 1; y += .014) line(front, [.45,y], [.56,y], 14);
  }

  // A slim black Monster can: rolled aluminum rims, pull tab, three torn claws.
  // The silver emblem keeps the room monochrome without adding label text.
  const [canX, canBottom] = point(mobile ? .28 : .855, mobile ? .875 : compact ? .89 : .85);
  const canW = mobile ? 10 : 13, canH = mobile ? 20 : 24;
  const canTop = canBottom - canH;
  front.ellipse(canX + 2, canBottom + 1, canW * .75, 2, 12, "glass");
  front.rect(canX - canW / 2, canTop + 2, canW, canH - 3, 8, "metal");
  front.rect(canX - canW / 2 + 1, canTop + 3, 1, canH - 5, 43, "metal");
  front.rect(canX - canW / 2 + 2, canTop + 4, 1, canH - 6, 22, "metal");
  front.rect(canX + canW / 2 - 2, canTop + 3, 1, canH - 5, 24, "metal");
  front.ellipse(canX, canTop + 1, canW / 2, 2, 77);
  front.ellipse(canX, canTop + 1, canW / 2 - 1, 1, 33);
  front.rect(canX - 1, canTop, 3, 1, 95); front.rect(canX, canTop + 1, 1, 1, 9);
  front.ellipse(canX, canBottom - 1, canW / 2, 1, 50);
  front.rect(canX - canW / 2 + 2, canBottom - 2, canW - 4, 1, 19);
  const claw = [
    "110011011", "011011011", "011001011", "010011010", "011011011",
    "001011011", "001001011", "011001010", "010001010", "010001010", "010000010",
  ];
  const clawX = Math.round(canX - 4), clawY = Math.round(canTop + 6);
  claw.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === "1") front.pixel(clawX + x, clawY + y, x % 3 === 0 ? 104 : 80, "glass");
  }));

  const backCanvas = back.canvas(), frontCanvas = front.canvas();
  const backGlow = pixelGlow(w, h, [
    { x: displayX, y: displayY, width: displayW, height: displayH, reach: 20, strength: .27, hollow: true },
    ...monitorLights,
    { x: MARGIN + width * .28, y: MARGIN + height * .12, width: width * .15, height: 1, reach: 8, strength: .26 },
    { x: MARGIN + width * .57, y: MARGIN + height * .12, width: width * .15, height: 1, reach: 8, strength: .20 },
  ]);
  const frontGlow = pixelGlow(w, h, [
    ...fans.map(([x, y]) => ({ x, y, width: 1, height: 1, reach: Math.min(12, pcW * .6), strength: .19 })),
  ]);
  // Shallow pools of screen light fall across the desk on the same square grid.
  const deskGlow = pixelGlow(w,h,(mobile?[.5]:[.22,.5,.78]).map((u)=>({
    x:MARGIN+width*(u-.08),y:MARGIN+height*(deskBack+.025),
    width:width*.16,height:1,reach:height*.065,strength:.15,
  })));
  // Sparse fragments rise against gravity, fading before the eight-second wrap.
  const suspended = Array.from({ length: mobile ? 18 : 38 }, (_, i) => ({
    x: width * (.04 + noise(i, 231) * .92),
    y: height * (.14 + noise(i, 512) * .70),
    phase: Math.floor(noise(i, 34) * ROOM_LOOP_FRAMES),
    drift: noise(i, 76) > .5 ? 1 : -1,
  }));
  return {
    bio,
    display: { x: displayX - MARGIN, y: displayY - MARGIN, width: displayW, height: displayH },
    draw(ctx: CanvasRenderingContext2D, frame: number, cameraX = 0, cameraY = 0) {
      const tick = ((frame % ROOM_LOOP_FRAMES) + ROOM_LOOP_FRAMES) % ROOM_LOOP_FRAMES;
      const x = Math.round(cameraX), y = Math.round(cameraY);
      const fx = -MARGIN + x * 2, fy = -MARGIN + y * 2;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(backCanvas, -MARGIN + x, -MARGIN + y);
      const glow = [.72, .82, .94, 1, .94, .82, .72, .68][Math.floor(tick / 8)];
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = glow;
      ctx.drawImage(backGlow, -MARGIN + x, -MARGIN + y);
      ctx.restore();
      ctx.drawImage(frontCanvas, fx, fy);
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = glow;
      ctx.drawImage(frontGlow, fx, fy);
      ctx.beginPath();
      ctx.rect(0,Math.ceil(height*deskBack+y*2),width,Math.floor(height*(deskFront-deskBack)));
      ctx.clip();
      ctx.drawImage(deskGlow,fx,fy);
      ctx.restore();
      const mark = (px: number, py: number, rw: number, rh: number, color: string) => {
        ctx.fillStyle = color; ctx.fillRect(Math.round(px + fx), Math.round(py + fy), rw, rh);
      };
      // Only the final candle moves; the complete chart repeats after eight seconds.
      const drift = [0, -1, -3, -2, 0, 2, 1, 0][Math.floor(tick / 8)];
      const close = lastCandle.close + drift;
      const top = Math.min(lastCandle.open, close), candleH = Math.max(2, Math.abs(lastCandle.open - close));
      const chartMark = (px: number, py: number, rw: number, rh: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(px - MARGIN + x), Math.round(py - MARGIN + y), rw, rh);
      };
      chartMark(lastCandle.x, top - 3, 1, candleH + 6, "#545454");
      chartMark(lastCandle.x - Math.floor(bodyW / 2), top, bodyW, candleH, close <= lastCandle.open ? "#606060" : "#383838");
      chartMark(lastCandle.x - Math.floor(bodyW / 2), volumeBottom - lastCandle.volume - Math.abs(drift), bodyW, lastCandle.volume + Math.abs(drift), "#383838");
      for (let px = lastCandle.x + bodyW; px < plotX + plotW + 2; px += 3) chartMark(px, close, 1, 1, "#444444");
      chartMark(displayX + displayW - 5, displayY + displayH - 3, 1, 1, tick < 48 ? "#707070" : "#404040");
      for (const led of monitorLeds) chartMark(...led,1,1,tick<48?"#a0a0a0":"#707070");
      for (const [cx,cy] of fans) {
        const step = Math.floor(tick / 8) % 4;
        mark(cx + [0,1,0,-1][step],cy + [-1,0,1,0][step],1,1,"#707070");
      }
      for (const mote of suspended) {
        const age = (tick + mote.phase) % ROOM_LOOP_FRAMES;
        const light = Math.min(1, age / 12, (ROOM_LOOP_FRAMES - age) / 12);
        const shade = 16 + Math.floor(light * 6) * 4;
        const mx = Math.round(mote.x + Math.floor(age / 16) * mote.drift + x * 2);
        const my = Math.round(mote.y - Math.floor(age / 4) + y * 2);
        ctx.fillStyle = `rgb(${shade} ${shade} ${shade})`;
        ctx.fillRect(mx, my, 1, 1);
        if (age > 18 && age < 42 && mote.phase % 4 === 0) {
          ctx.fillStyle = "#181818";
          ctx.fillRect(mx, my + 2, 1, 2);
        }
      }
    },
  };
}
