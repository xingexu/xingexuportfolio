"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

// The cover canvas lives in layout.tsx, outside #page-content: that wrapper
// animates on load, which would trap the canvas beneath the fixed nav.
const HOME_INTRO_CANVAS_ID = "home-intro";

const CELL = 5; // matches the sky canvas, so every revealed cell is one real page pixel
const FRAMES = 16;
const FRAME_MS = 84;

// Integer hash -> [0, 1): looks random, but the same cell always gets the same value.
function hashUnit(x: number, y: number, salt: number) {
  let value = Math.imul(x + 1, 0x45d9f3b) ^ Math.imul(y + 1, 0x119de1f3) ^ Math.imul(salt + 1, 0x27d4eb2d);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/**
 * First-load intro for the home page: the screen starts white, then the page
 * underneath shows through one 5px cell at a time until it's fully revealed.
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

    // Each cell gets a reveal time. Mixing a coarse 4x4-cell hash with a
    // per-cell one makes pixels arrive in loose clumps rather than as pure
    // static, which reads more like the page "developing".
    const cols = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const order = new Uint32Array(cols * rows);
    const rank = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const index = y * cols + x;
        order[index] = index;
        rank[index] = 0.6 * hashUnit(x >> 2, y >> 2, 1) + 0.4 * hashUnit(x, y, 2);
      }
    }
    order.sort((a, b) => rank[a] - rank[b]);

    let frame = 0;
    let revealed = 0;
    const timer = window.setInterval(() => {
      frame += 1;
      const target = Math.round((frame / FRAMES) * order.length);
      for (; revealed < target; revealed += 1) {
        const index = order[revealed];
        ctx.clearRect((index % cols) * CELL, Math.floor(index / cols) * CELL, CELL, CELL);
      }
      if (frame >= FRAMES) {
        window.clearInterval(timer);
        delete document.documentElement.dataset.intro;
        setPlaying(false);
      }
    }, FRAME_MS);

    return () => window.clearInterval(timer);
  }, [playing]);

  return playing ? null : children;
}
