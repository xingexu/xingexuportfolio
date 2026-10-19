"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

// The cover canvas lives in layout.tsx, outside #page-content: that wrapper
// animates on load, which would trap the canvas beneath the fixed nav.
const HOME_INTRO_CANVAS_ID = "home-intro";

const CELL = 5; // matches the sky canvas, so every revealed cell is one real page pixel
const DURATION_MS = 700;

/**
 * First-load intro for the home page: the screen starts white, then the page
 * underneath shows through one random 5px cell at a time until it's fully
 * revealed, in about 0.7s.
 * The overlay is a white canvas we punch holes in, so every pixel you see
 * during the reveal is the live page itself — sky, nav, footer and all.
 *
 * The hero's own entrance animations shouldn't start until the reveal is
 * done, so its subtree is unmounted while the intro plays and mounted fresh
 * afterwards. The inline script in layout.tsx decides whether to play (full
 * page loads of "/" only, never for reduced-motion users) by setting
 * data-intro on <html> before first paint; CSS keys the white cover off it.
 * Returns children directly, so it adds no wrapper element.
 */
export default function HomeIntro({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState(false);

  useLayoutEffect(() => {
    if (document.documentElement.dataset.intro === "playing") setPlaying(true);
  }, []);

  useEffect(() => {
    const canvas = document.getElementById(HOME_INTRO_CANVAS_ID) as HTMLCanvasElement | null;
    const ctx = canvas?.getContext("2d");
    if (!playing || !canvas || !ctx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    canvas.classList.add("is-drawing");

    // Shuffle every cell into a random reveal order, then uncover a slice of
    // that order on each display frame, so pixels land one at a time across
    // the whole screen instead of in big steps.
    const cols = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const order = new Uint32Array(cols * rows);
    for (let index = 0; index < order.length; index += 1) order[index] = index;
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      const cell = order[index];
      order[index] = order[swap];
      order[swap] = cell;
    }

    let start: number | null = null;
    let revealed = 0;
    let frame = 0;
    const step = (now: number) => {
      start ??= now;
      const progress = Math.min(1, (now - start) / DURATION_MS);
      const target = Math.round(progress * order.length);
      for (; revealed < target; revealed += 1) {
        const index = order[revealed];
        ctx.clearRect((index % cols) * CELL, Math.floor(index / cols) * CELL, CELL, CELL);
      }
      if (progress < 1) {
        frame = window.requestAnimationFrame(step);
        return;
      }
      delete document.documentElement.dataset.intro;
      setPlaying(false);
    };
    frame = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frame);
  }, [playing]);

  return playing ? null : children;
}
