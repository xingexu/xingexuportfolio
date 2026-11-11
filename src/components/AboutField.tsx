"use client";

import { useEffect, useRef } from "react";
import { createAboutRoom, ROOM_CELL, ROOM_FRAME_MS, type AboutRoom } from "@/lib/about-room";

/** One low-resolution drawing surface. All moving geometry repeats after exactly 8s. */
export default function AboutField({ paused }: { paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedRef = useRef(0);
  const cameraRef = useRef({ x: 0, y: 0 });
  const roomRef = useRef<AboutRoom | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return;
    const ctx = context;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous: number | null = null;
    let lastDraw = -1;
    let room = roomRef.current;
    const camera = cameraRef.current;
    const surface = canvas.parentElement;
    const finePointer = window.matchMedia("(pointer: fine)");

    function draw() {
      if (!canvas) return;
      room?.draw(ctx, Math.floor(elapsedRef.current / ROOM_FRAME_MS), camera.x, camera.y);
      if (room && canvas.dataset.ready !== "true") {
        canvas.dataset.screenX = String(room.display.x);
        canvas.dataset.screenY = String(room.display.y);
        canvas.dataset.screenWidth = String(room.display.width);
        canvas.dataset.screenHeight = String(room.display.height);
        canvas.dataset.ready = "true";
        window.dispatchEvent(new Event("about-room-ready"));
      }
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
      if (reducedMotion.matches) { camera.x = 0; camera.y = 0; }
      draw();
      if (!paused && !reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(tick);
    }

    function moveCamera(event: PointerEvent) {
      if (!surface || paused || reducedMotion.matches || !finePointer.matches || document.documentElement.dataset.roomTransition) return;
      const bounds = surface.getBoundingClientRect();
      camera.x = Math.round((event.clientX / bounds.width - .5) * 4);
      camera.y = Math.round(((event.clientY - bounds.top) / bounds.height - .5) * 4);
    }
    function resetCamera() {
      if (paused) return;
      camera.x = 0; camera.y = 0;
    }

    // Cache the illustration on resize; each source pixel stays exactly three CSS pixels.
    const resize = new ResizeObserver(() => {
      if (!surface) return;
      const width = Math.max(1, Math.ceil(surface.clientWidth / ROOM_CELL));
      const height = Math.max(1, Math.ceil(surface.clientHeight / ROOM_CELL));
      if (width === canvas.width && height === canvas.height && room) return;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${canvas.width * ROOM_CELL}px`;
      canvas.style.height = `${canvas.height * ROOM_CELL}px`;
      room = createAboutRoom(canvas.width, canvas.height);
      roomRef.current = room;
      delete canvas.dataset.ready;
      draw();
    });
    if (surface) resize.observe(surface);
    surface?.addEventListener("pointermove", moveCamera);
    surface?.addEventListener("pointerleave", resetCamera);
    reducedMotion.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      surface?.removeEventListener("pointermove", moveCamera);
      surface?.removeEventListener("pointerleave", resetCamera);
      reducedMotion.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [paused]);

  return <canvas ref={canvasRef} className="about-field" style={{ position: "absolute", inset: 0 }} aria-hidden="true" />;
}
