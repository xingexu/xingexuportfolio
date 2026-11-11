/** Corrode the outgoing sky, then spread pixel-edged ink openings over the room. */
const CELL = 5;
const ROOM_CELL = 3;
const CLOSE_MS = 1000;
const REVEAL_MS = 1450;
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
    [cx, cy, 0], [width * .19, height * .23, .10], [width * .82, height * .29, .13],
    [width * .28, height * .80, .19], [width * .80, height * .76, .23],
    [width * .49, height * .10, .16], [cx - scale * .10, cy + scale * .13, .055],
  ];
  const thresholds = new Float32Array(width * height);
  let low = Infinity, high = -Infinity;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let value = Infinity;
    for (const [sx, sy, delay] of seeds) value = Math.min(value, Math.hypot(x - sx, (y - sy) * 1.06) / scale + delay);
    value += (noise(x / 17, y / 17) - .5) * .12 + (noise(x / 5, y / 5) - .5) * .035;
    thresholds[y * width + x] = value;
    low = Math.min(low, value); high = Math.max(high, value);
  }
  for (let i = 0; i < thresholds.length; i++) thresholds[i] = (thresholds[i] - low) / (high - low || 1) * .88;
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
    const cx = (bounds.left + (Number(field.dataset.screenX) + Number(field.dataset.screenWidth) / 2) * scale) / ROOM_CELL;
    const cy = (bounds.top + (Number(field.dataset.screenY) + Number(field.dataset.screenHeight) / 2) * scale) / ROOM_CELL;
    const thresholds = inkSplotches(width, height, cx, cy);
    const mask = ctx.createImageData(width, height);
    const pixels = mask.data;
    root.dataset.roomTransition = "revealing";

    const finished = await animate(REVEAL_MS, (elapsed) => {
      const progress = ease(elapsed / REVEAL_MS);
      for (let i = 0; i < thresholds.length; i++) {
        const offset = i * 4;
        pixels[offset] = 8; pixels[offset + 1] = 8; pixels[offset + 2] = 8;
        // A narrow, stepped wet edge; the room and letters appear together inside each blot.
        const opened = Math.round(clamp((progress - thresholds[i]) / .035) * 3) / 3;
        pixels[offset + 3] = Math.round((1 - opened) * 255);
      }
      ctx.putImageData(mask, 0, 0);
    });
    if (finished) clear();
  }

  return { close, enter, clear };
}

export type RoomTransition = ReturnType<typeof createRoomTransition>;
