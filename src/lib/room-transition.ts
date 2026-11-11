/** A real three-pixel raster shutter, composited over both routes and the nav. */
const CELL = 3;
const CLOSE_MS = 420;
const REVEAL_MS = 1550;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const noise = (index: number) => ((index * 37 + 17) % 29) / 29;

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

  function prepare(phase: string) {
    if (!ctx) return false;
    canvas.width = Math.ceil(window.innerWidth / CELL);
    canvas.height = Math.ceil(window.innerHeight / CELL);
    canvas.style.width = `${canvas.width * CELL}px`;
    canvas.style.height = `${canvas.height * CELL}px`;
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
    const horizon = Math.round(height * .45);
    const finished = await animate(CLOSE_MS, (elapsed) => {
      ctx.clearRect(0, 0, width, height);
      for (let x = 0, i = 0; x < width; x += 6, i++) {
        const progress = ease((elapsed / CLOSE_MS - noise(i) * .16) / .84);
        const top = Math.ceil(horizon * progress);
        const bottom = Math.ceil((height - horizon) * progress);
        ctx.fillStyle = i % 3 === 0 ? "#0b0b0b" : "#080808";
        ctx.fillRect(x, 0, 6, top);
        ctx.fillRect(x, height - bottom, 6, bottom);
        if (progress > 0 && progress < .97) {
          ctx.fillStyle = "#292929";
          ctx.fillRect(x, top - 1, 6, 1);
          ctx.fillRect(x, height - bottom, 6, 1);
        }
      }
    });
    if (finished) {
      root.dataset.roomTransition = "waiting";
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, width, height);
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
    if (!prepare("waiting") || !ctx) { clear(); return; }
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ready = await waitForRoom();
    if (current !== generation) return;
    if (!ready) { clear(); return; }
    const field = document.querySelector<HTMLCanvasElement>(".about-field");
    if (!field) { clear(); return; }
    const bounds = field.getBoundingClientRect();
    const { width, height } = canvas;
    const sx = Math.round(bounds.left / CELL + Number(field.dataset.screenX));
    const sy = Math.round(bounds.top / CELL + Number(field.dataset.screenY));
    const sw = Number(field.dataset.screenWidth);
    const sh = Number(field.dataset.screenHeight);
    const cx = sx + sw / 2, cy = sy + sh / 2;
    root.dataset.roomTransition = "revealing";

    // Separate wrappers keep the existing eight-second floats uninterrupted.
    const arrivals = document.querySelectorAll(".about-letter-art, .about-object-art");
    revealEffects = Array.from(arrivals, (element, index) => element.animate([
      { opacity: 0, transform: "translateY(12px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 300, delay: 850 + index * 45, easing: "steps(5, end)", fill: "both" }));

    const finished = await animate(REVEAL_MS, (elapsed) => {
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, width, height);
      // A single phosphor line opens into the actual trading display.
      const ignition = ease(elapsed / 260);
      const screen = ease((elapsed - 220) / 440);
      const expansion = ease((elapsed - 610) / 850);
      const left = Math.round(cx - sw / 2 * ignition - sx * expansion);
      const right = Math.round(cx + sw / 2 * ignition + (width - sx - sw) * expansion);
      for (let x = left; x < right; x += 4) {
        const stagger = noise(Math.floor(x / 4)) * .07 * Math.sin(expansion * Math.PI);
        const spread = clamp(expansion - stagger);
        const top = Math.round(cy - sh / 2 * screen - (sy + 3) * spread);
        const bottom = Math.round(cy + sh / 2 * screen + (height - sy - sh + 3) * spread);
        ctx.clearRect(x, top, Math.min(4, right - x), Math.max(1, bottom - top));
        if (elapsed < 1250) {
          const gray = Math.round(90 * (1 - expansion) + 20);
          ctx.fillStyle = `rgb(${gray} ${gray} ${gray})`;
          ctx.fillRect(x, top, Math.min(4, right - x), 1);
          if (screen > .1) ctx.fillRect(x, bottom - 1, Math.min(4, right - x), 1);
        }
      }
      // Small, dim raster brackets register the monitor as the scene opens.
      if (elapsed > 120 && elapsed < 610) {
        ctx.fillStyle = "#343434";
        for (const [x, y, dx, dy] of [[sx - 3, sy - 3, 1, 1], [sx + sw + 2, sy - 3, -1, 1], [sx - 3, sy + sh + 2, 1, -1], [sx + sw + 2, sy + sh + 2, -1, -1]]) {
          ctx.fillRect(Math.round(x), Math.round(y), dx * 4, 1);
          ctx.fillRect(Math.round(x), Math.round(y), 1, dy * 4);
        }
      }
    });
    if (finished) clear();
  }

  return { close, enter, clear };
}

export type RoomTransition = ReturnType<typeof createRoomTransition>;
