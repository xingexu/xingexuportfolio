"use client";

import { useEffect, useRef } from "react";
import { createHomeWorld } from "@/lib/home-world";
import type { RoomObject } from "@/lib/room-objects";

export default function RoomObjectView({ object, paused }: { object: RoomObject; paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const field = canvas.current, scene = createHomeWorld();
    const ctx = field?.getContext("2d", { alpha: false });
    if (!field || !ctx || !scene) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, previous = 0, time = 0;
    function draw(now: number) {
      if (!scene || !ctx) return;
      if (previous && !paused && !motion.matches) time += Math.min(now - previous, 40);
      previous = now;
      scene.drawDetail(ctx, object, time, paused || motion.matches);
      if (!paused && !motion.matches && object.id === "room-computer") frame = requestAnimationFrame(draw);
    }
    function resume() { cancelAnimationFrame(frame); previous = 0; if (!document.hidden) draw(0); }
    motion.addEventListener("change", resume); document.addEventListener("visibilitychange", resume);
    draw(0);
    return () => { cancelAnimationFrame(frame); motion.removeEventListener("change", resume); document.removeEventListener("visibilitychange", resume); };
  }, [object, paused]);
  return <figure className="room-object-detail" style={{ borderColor: object.accent }}>
    <canvas ref={canvas} width={object.detail.w} height={object.detail.h} role="img" aria-label={`Pixel-art close-up of ${object.label}`} style={{ aspectRatio: `${object.detail.w} / ${object.detail.h}`, maxWidth: object.detail.w * 4 }} />
    <figcaption>{object.id === "room-computer" ? "AGAR.IO · ON SCREEN" : `${object.label.toUpperCase()} · UP CLOSE`}</figcaption>
  </figure>;
}
