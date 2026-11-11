/** Corrode the outgoing sky, then reconstruct the room from its own source pixels. */
const CELL = 5;
const ROOM_CELL = 3;
const CLOSE_MS = 1000;
const REVEAL_MS = 1750;
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
  let revealEffects: Animation[] = [];
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
    revealEffects.forEach((animation) => animation.cancel());
    revealEffects = [];
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
      let previous = -1;
      const tick = (now: number) => {
        const elapsed = Math.min(duration, now - start);
        // 30 discrete frames per second; edges always land on whole pixels.
        const step = Math.floor(elapsed / (1000 / 30));
        if (step !== previous || elapsed === duration) { draw(elapsed); previous = step; }
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
        // Quantized darkening preserves the source colors at each eroding edge.
        const decay = Math.round(ease((progress - thresholds[i]) / .16) * 12) / 12;
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
        ctx.globalAlpha = Math.round((1 - age) * 6) / 6;
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
      let timeout: ReturnType<typeof setTimeout>;
      const done = (ready: boolean) => {
        clearTimeout(timeout);
        window.removeEventListener("about-room-ready", readyHandler);
        waitCleanup = undefined;
        resolve(ready);
      };
      const readyHandler = () => done(true);
      waitCleanup = () => done(false);
      window.addEventListener("about-room-ready", readyHandler, { once: true });
      timeout = setTimeout(() => done(false), 3500);
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
    const sx = (bounds.left + Number(field.dataset.screenX) * scale) / ROOM_CELL;
    const sy = (bounds.top + Number(field.dataset.screenY) * scale) / ROOM_CELL;
    const sw = Number(field.dataset.screenWidth) * scale / ROOM_CELL;
    const sh = Number(field.dataset.screenHeight) * scale / ROOM_CELL;
    const cx = sx + sw / 2, cy = sy + sh / 2;
    const sample = document.createElement("canvas");
    sample.width = width; sample.height = height;
    const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
    if (!sampleCtx) { clear(); return; }
    sampleCtx.imageSmoothingEnabled = false;
    sampleCtx.fillStyle = "#080808";
    sampleCtx.fillRect(0, 0, width, height);
    sampleCtx.drawImage(field, bounds.left / ROOM_CELL, bounds.top / ROOM_CELL,
      bounds.width / ROOM_CELL, bounds.height / ROOM_CELL);
    const source = sampleCtx.getImageData(0, 0, width, height).data;
    const count = width * height;
    const arrivals = new Float32Array(count);
    const offsetX = new Int16Array(count), offsetY = new Int16Array(count);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const grain = hash(x + 17, y + 91);
      const distance = Math.hypot((x - cx) / width, (y - cy) / height);
      const monitor = x >= sx && x < sx + sw && y >= sy && y < sy + sh;
      const stage = monitor ? .06 : source[i * 4] > 35 ? .19 : .31;
      // Individual cells and small clusters lock in: no dissolving contour.
      arrivals[i] = Math.min(.9, stage + grain * .30
        + hash(Math.floor(x / 3), Math.floor(y / 3)) * .12 + distance * .13);
      offsetX[i] = Math.round((x - cx) * .10 + (grain - .5) * 24);
      offsetY[i] = Math.round((y - cy) * .08 - 10 - hash(y, x) * 20);
    }
    const mask = ctx.createImageData(width, height);
    const pixels = mask.data;
    root.dataset.roomTransition = "revealing";

    // Separate wrappers keep the existing eight-second floats uninterrupted.
    const details = document.querySelectorAll(".about-letter-art, .about-object-art, .about-bottom");
    revealEffects = Array.from(details, (element, index) => element.animate([
      { opacity: 0, clipPath: "inset(100% 0 0 0)", transform: "translateY(-12px)" },
      { opacity: 1, clipPath: "inset(0 0 0 0)", transform: "translateY(0)" },
    ], { duration: 320, delay: 880 + index * 55, easing: "steps(8, end)", fill: "both" }));

    const finished = await animate(REVEAL_MS, (elapsed) => {
      const progress = elapsed / REVEAL_MS;
      for (let i = 0; i < count; i++) {
        const offset = i * 4;
        pixels[offset] = 8; pixels[offset + 1] = 8; pixels[offset + 2] = 8;
        // Once a pixel lands, uncover its real, live counterpart underneath.
        pixels[offset + 3] = progress >= arrivals[i] ? 0 : 255;
      }
      for (let i = 0; i < count; i++) {
        const age = (progress - arrivals[i] + .20) / .20;
        if (age <= 0 || age >= 1 || source[i * 4] < 17) continue;
        const travel = 1 - ease(age);
        const x = i % width + Math.round(offsetX[i] * travel);
        const y = Math.floor(i / width) + Math.round(offsetY[i] * travel);
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const to = (y * width + x) * 4;
        const shade = Math.round((8 + (source[i * 4] - 8) * Math.min(1, age * 3)) / 4) * 4;
        pixels[to] = shade; pixels[to + 1] = shade; pixels[to + 2] = shade;
        pixels[to + 3] = 255;
      }
      ctx.putImageData(mask, 0, 0);
    });
    if (finished) clear();
  }

  return { close, enter, clear };
}

export type RoomTransition = ReturnType<typeof createRoomTransition>;
