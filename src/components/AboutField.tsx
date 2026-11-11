"use client";

import { useEffect, useRef } from "react";
import { drawAboutRoom, ROOM_CELL, ROOM_FRAME_MS } from "@/lib/about-room";

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
      drawAboutRoom(ctx, canvas.width, canvas.height, Math.floor(elapsedRef.current / ROOM_FRAME_MS));
    }

    function tick(now: number) {
      if (previous !== null) elapsedRef.current += now - previous;
      previous = now;
      const nextDraw = Math.floor(elapsedRef.current / ROOM_FRAME_MS);
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

    // Keep every source pixel exactly four CSS pixels, including after resize.
    const surface = canvas.parentElement;
    const resize = new ResizeObserver(() => {
      if (!surface) return;
      canvas.width = Math.max(1, Math.ceil(surface.clientWidth / ROOM_CELL));
      canvas.height = Math.max(1, Math.ceil(surface.clientHeight / ROOM_CELL));
      canvas.style.width = `${canvas.width * ROOM_CELL}px`;
      canvas.style.height = `${canvas.height * ROOM_CELL}px`;
      draw();
    });
    if (surface) resize.observe(surface);
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
