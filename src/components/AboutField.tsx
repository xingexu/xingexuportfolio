"use client";

import { useEffect, useRef } from "react";

const LOOP_MS = 8_000;
const FRAME_MS = 100;
const CELL = 4;

// Corner circuits leave the text's central reading area clear.
const CIRCUITS = [
  [[0, .18], [.13, .18], [.20, .28], [.30, .28]],
  [[0, .24], [.10, .24], [.18, .35], [.23, .35]],
  [[.16, 0], [.16, .12], [.24, .23], [.35, .23]],
  [[1, .22], [.89, .22], [.81, .34], [.77, .34]],
  [[1, .30], [.92, .30], [.85, .40], [.81, .40]],
  [[.86, 0], [.86, .13], [.77, .25], [.69, .25]],
  [[0, .70], [.13, .70], [.21, .59], [.25, .59]],
  [[1, .69], [.89, .69], [.82, .58], [.78, .58]],
] as const;

/** One low-resolution drawing surface. All moving geometry repeats after exactly 8s. */
export default function AboutField({ paused }: { paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return;
    const ctx = context;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous: number | null = null;
    let lastDraw = -1;

    function draw() {
      if (!canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      const phase = (Math.floor(elapsedRef.current / FRAME_MS) * FRAME_MS % LOOP_MS) / LOOP_MS;
      const angle = phase * Math.PI * 2;
      ctx.fillStyle = "#090a0b";
      ctx.fillRect(0, 0, w, h);

      // A sparse engineering grid, dimmed beneath the copy.
      for (let x = 3; x < w; x += 8) {
        for (let y = 4; y < h; y += 8) {
          const central = x > w * .22 && x < w * .77 && y > h * .29 && y < h * .72;
          ctx.fillStyle = central ? "#101214" : "#222527";
          ctx.fillRect(x, y, 1, 1);
        }
      }

      CIRCUITS.forEach((circuit, index) => {
        const points = circuit.map(([x, y]) => [Math.round(x * w), Math.round(y * h)]);
        ctx.strokeStyle = "#262a2c";
        ctx.lineWidth = .65;
        ctx.beginPath();
        points.forEach(([x, y], i) => i ? ctx.lineTo(x + .5, y + .5) : ctx.moveTo(x + .5, y + .5));
        ctx.stroke();
        const [endX, endY] = points[points.length - 1];
        ctx.strokeRect(endX - 1.5, endY - 1.5, 3, 3);

        // The packet dims at both endpoints so its wrap never visibly jumps.
        const travel = (phase + index / CIRCUITS.length) % 1;
        const segment = travel * (points.length - 1);
        const from = Math.floor(segment);
        const mix = segment - from;
        const start = points[from];
        const end = points[Math.min(from + 1, points.length - 1)];
        ctx.globalAlpha = Math.sin(travel * Math.PI) ** 2 * .7;
        ctx.fillStyle = "#b9c2c4";
        ctx.fillRect(Math.round(start[0] + (end[0] - start[0]) * mix), Math.round(start[1] + (end[1] - start[1]) * mix), 2, 1);
        ctx.globalAlpha = 1;
      });

      // A folded wire field at the bottom; no skyline, sky, or horizon.
      for (let row = 0; row < 13; row++) {
        ctx.beginPath();
        ctx.strokeStyle = row % 3 === 0 ? "#343a3d" : "#22272a";
        for (let x = -2; x <= w + 2; x += 3) {
          const wave = Math.sin(x / w * Math.PI * 3 + angle + row * .16);
          const fold = Math.cos(x / w * Math.PI * 2 - angle) * 3;
          const y = Math.round(h * .85 + row * 3 + wave * (5 + row * .45) + fold);
          if (x === -2) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    function tick(now: number) {
      if (previous !== null) elapsedRef.current += now - previous;
      previous = now;
      const nextDraw = Math.floor(elapsedRef.current / FRAME_MS);
      if (nextDraw !== lastDraw) {
        draw();
        lastDraw = nextDraw;
      }
      frame = requestAnimationFrame(tick);
    }

    function syncPlayback() {
      cancelAnimationFrame(frame);
      previous = null;
      draw();
      if (!paused && !reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(tick);
    }

    const resize = new ResizeObserver(() => {
      canvas.width = Math.max(1, Math.ceil(canvas.clientWidth / CELL));
      canvas.height = Math.max(1, Math.ceil(canvas.clientHeight / CELL));
      draw();
    });
    resize.observe(canvas);
    reducedMotion.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      reducedMotion.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [paused]);

  return <canvas ref={canvasRef} className="about-field" aria-hidden="true" />;
}
