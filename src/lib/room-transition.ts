/** Corrode the outgoing sky, then spread pixel-edged ink openings over the room. */
const CELL = 5;
const ROOM_CELL = 3;
const CLOSE_MS = 1000;
const REVEAL_MS = 2800;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const hash = (x: number, y: number) => {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};

function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const u = ease(x - ix), v = ease(y - iy);
  const top = hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u;
  const bottom = hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u;
  return top * (1 - v) + bottom * v;
}

/** Coherent islands and tiny pits, rather than independent TV-static pixels. */
function corrosion(width: number, height: number) {
  const thresholds = new Float32Array(width * height);
  const grit = new Float32Array(width * height);
  let low = Infinity, high = -Infinity;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    const grain = hash(x + 89, y + 43);
    const islands = noise(x / 32, y / 32) * .52 + noise(x / 11, y / 11) * .29
      + noise(x / 3, y / 3) * .13 + grain * .06;
    const distance = Math.hypot((x - width * .52) / width, (y - height * .45) / height);
    const value = islands - distance * .42;
    thresholds[i] = value;
    grit[i] = grain;
    low = Math.min(low, value); high = Math.max(high, value);
  }
  for (let i = 0; i < thresholds.length; i++) thresholds[i] = (thresholds[i] - low) / (high - low || 1) * .78;
  return { thresholds, grit };
}

/** Several wet blots grow into each other, with lobed edges and small satellite drops. */
function inkSplotches(width: number, height: number, cx: number, cy: number) {
  const scale = Math.min(width, height);
  const seeds = [
    [cx, cy, 0], [width * .21, height * .22, .16], [width * .80, height * .28, .28],
    [width * .28, height * .79, .39], [width * .79, height * .77, .47],
  ];
  const drops = seeds.flatMap(([sx, sy, delay], seed) => Array.from({ length: 5 }, (_, index) => {
    const angle = (index / 5 + hash(seed, 73)) * Math.PI * 2;
    const distance = scale * (.13 + hash(index, seed + 91) * .07);
    return { x: sx + Math.cos(angle) * distance, y: sy + Math.sin(angle) * distance,
      radius: scale * (.012 + hash(index + 24, seed) * .015), delay: delay + .07 };
  }));
  const thresholds = new Float32Array(width * height);
  let high = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let value = Infinity;
    const edge = (noise(x / 19, y / 19) - .5) * .10;
    seeds.forEach(([sx, sy, delay], seed) => {
      const dx = x - sx, dy = (y - sy) * 1.06;
      const angle = Math.atan2(dy, dx);
      const lobes = 1 + .16 * Math.sin(angle * 3 + seed * 2) + .10 * Math.sin(angle * 5 - seed);
      const radius = Math.max(0, Math.hypot(dx, dy) / (scale * .10 * lobes) + edge);
      // A small initial impact, followed by a longer, continuous outward bleed.
      const arrival = delay + Math.min(radius, 1) * .09 + Math.max(0, radius - 1) * .14;
      value = Math.min(value, arrival);
    });
    for (const drop of drops) {
      const distance = Math.hypot(x - drop.x, y - drop.y) / drop.radius;
      if (distance < 1) value = Math.min(value, drop.delay + distance * .06);
    }
    thresholds[y * width + x] = value;
    high = Math.max(high, value);
  }
  for (let i = 0; i < thresholds.length; i++) thresholds[i] = thresholds[i] / (high || 1) * .91;
  return thresholds;
}

/** Read only our same-origin sky canvas once; no screen capture or extra assets. */
function skyPixels(width: number, height: number) {
  const source = document.querySelector<HTMLCanvasElement>("canvas[data-pixel-sky]");
  if (!source) return null;
  const sample = document.createElement("canvas");
  sample.width = width; sample.height = height;
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
  } catch {
    // A future cross-origin sky asset should never break navigation.
    return null;
  }
}

export function createRoomTransition(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  const root = document.documentElement;
  let frame = 0;
  let settle: ((finished: boolean) => void) | null = null;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let waitCleanup: (() => void) | undefined;
  let generation = 0;

  function stopAnimation() {
    cancelAnimationFrame(frame);
    settle?.(false);
    settle = null;
  }

  function clear() {
    generation += 1;
    stopAnimation();
    waitCleanup?.();
    clearTimeout(deadline);
    delete root.dataset.roomTransition;
    canvas.classList.remove("is-drawing");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function prepare(phase: string, cell = CELL) {
    if (!ctx) return false;
    canvas.width = Math.ceil(window.innerWidth / cell);
    canvas.height = Math.ceil(window.innerHeight / cell);
    canvas.style.width = `${canvas.width * cell}px`;
    canvas.style.height = `${canvas.height * cell}px`;
    ctx.imageSmoothingEnabled = false;
    root.dataset.roomTransition = phase;
    canvas.classList.add("is-drawing");
    clearTimeout(deadline);
    // Navigation, hydration, or a backgrounded tab must never strand the cover.
    deadline = setTimeout(clear, 7000);
    return true;
  }

  function animate(duration: number, draw: (elapsed: number) => void) {
    stopAnimation();
    return new Promise<boolean>((resolve) => {
      settle = resolve;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = Math.min(duration, now - start);
        // Continuous opacity at display refresh rate; all geometry stays on the pixel grid.
        draw(elapsed);
        if (elapsed < duration) frame = requestAnimationFrame(tick);
        else { settle = null; resolve(true); }
      };
      draw(0);
      frame = requestAnimationFrame(tick);
    });
  }

  async function close() {
    clear();
    if (!prepare("closing") || !ctx) return true;
    const { width, height } = canvas;
    const { thresholds, grit } = corrosion(width, height);
    const colors = skyPixels(width, height);
    const mask = ctx.createImageData(width, height);
    const pixels = mask.data;
    const fragments: { x: number; y: number; onset: number; grain: number; color: string }[] = [];
    if (colors) for (let i = 0; i < thresholds.length; i++) {
      if (grit[i] > .013 || colors[i * 4 + 3] === 0) continue;
      const r = colors[i * 4], g = colors[i * 4 + 1], b = colors[i * 4 + 2];
      if (Math.max(r, g, b) < 45) continue;
      fragments.push({ x: i % width, y: Math.floor(i / width), onset: thresholds[i],
        grain: hash(i, 17), color: `rgb(${r} ${g} ${b})` });
    }
    const finished = await animate(CLOSE_MS, (elapsed) => {
      const progress = elapsed / CLOSE_MS;
      for (let i = 0; i < thresholds.length; i++) {
        const decay = ease((progress - thresholds[i]) / .16);
        const shade = 6 + Math.floor(grit[i] * 5);
        const offset = i * 4;
        pixels[offset] = shade; pixels[offset + 1] = shade; pixels[offset + 2] = shade;
        pixels[offset + 3] = Math.round(decay * 255);
      }
      ctx.putImageData(mask, 0, 0);
      // A few actual sky-colored cells shed from the rim, then lose their color.
      for (const fragment of fragments) {
        const age = (progress - fragment.onset - .065) / .15;
        if (age <= 0 || age >= 1) continue;
        ctx.globalAlpha = 1 - ease(age);
        ctx.fillStyle = fragment.color;
        const drift = Math.floor(age * 5);
        ctx.fillRect(fragment.x + Math.round((fragment.grain - .5) * drift * 2), fragment.y - drift, 1, 1);
      }
      ctx.globalAlpha = 1;
    });
    if (finished) {
      root.dataset.roomTransition = "waiting";
    }
    return finished;
  }

  function waitForRoom() {
    if (document.querySelector('.about-field[data-ready="true"]')) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      const done = (ready: boolean) => {
        clearTimeout(timeout);
        window.removeEventListener("about-room-ready", readyHandler);
        waitCleanup = undefined;
        resolve(ready);
      };
      const readyHandler = () => done(true);
      waitCleanup = () => done(false);
      window.addEventListener("about-room-ready", readyHandler, { once: true });
      const timeout = setTimeout(() => done(false), 3500);
    });
  }

  async function enter() {
    clear();
    const current = generation;
    if (!prepare("waiting", ROOM_CELL) || !ctx) { clear(); return; }
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ready = await waitForRoom();
    if (current !== generation) return;
    if (!ready) { clear(); return; }
    const field = document.querySelector<HTMLCanvasElement>(".about-field");
    if (!field) { clear(); return; }
    const bounds = field.getBoundingClientRect();
    const { width, height } = canvas;
    const scale = bounds.width / field.width;
    const cx = (bounds.left + (Number(field.dataset.screenX) + Number(field.dataset.screenWidth) / 2) * scale) / ROOM_CELL;
    const cy = (bounds.top + (Number(field.dataset.screenY) + Number(field.dataset.screenHeight) / 2) * scale) / ROOM_CELL;
    const thresholds = inkSplotches(width, height, cx, cy);
    const mask = ctx.createImageData(width, height);
    const pixels = mask.data;
    root.dataset.roomTransition = "revealing";

    const finished = await animate(REVEAL_MS, (elapsed) => {
      const progress = elapsed / REVEAL_MS;
      for (let i = 0; i < thresholds.length; i++) {
        const offset = i * 4;
        pixels[offset] = 8; pixels[offset + 1] = 8; pixels[offset + 2] = 8;
        // Softly wet pixel edges, without blur or stepped opacity jumps.
        const opened = ease((progress - thresholds[i]) / .075);
        pixels[offset + 3] = Math.round((1 - opened) * 255);
      }
      ctx.putImageData(mask, 0, 0);
    });
    if (finished) clear();
  }

  return { close, enter, clear };
}

export type RoomTransition = ReturnType<typeof createRoomTransition>;
