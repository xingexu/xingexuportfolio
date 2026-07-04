"use client";

import { useSyncExternalStore } from "react";

/**
 * Day/night toggle. The active theme lives on html[data-theme] (set before
 * hydration by the inline script in layout.tsx, so there is no flash) and is
 * persisted to localStorage. The component subscribes to the attribute via
 * useSyncExternalStore, so anything that changes the attribute stays in sync.
 * The pixel sun/moon glyphs are inline SVG drawn on a coarse grid.
 */

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getTheme = () =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

export default function ThemeToggle() {
  // server snapshot is "dark" (the default theme)
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark" as const);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={theme === "light" ? "Switch to night mode" : "Switch to day mode"}
      title={theme === "light" ? "night" : "day"}
    >
      {theme === "light" ? <PixelMoon /> : <PixelSun />}
    </button>
  );
}

function PixelSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
      <rect x="3" y="0" width="2" height="1" fill="currentColor" />
      <rect x="3" y="7" width="2" height="1" fill="currentColor" />
      <rect x="0" y="3" width="1" height="2" fill="currentColor" />
      <rect x="7" y="3" width="1" height="2" fill="currentColor" />
      <rect x="2" y="2" width="4" height="4" fill="currentColor" />
    </svg>
  );
}

function PixelMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
      <rect x="2" y="1" width="4" height="1" fill="currentColor" />
      <rect x="1" y="2" width="3" height="1" fill="currentColor" />
      <rect x="1" y="3" width="2" height="2" fill="currentColor" />
      <rect x="1" y="5" width="3" height="1" fill="currentColor" />
      <rect x="2" y="6" width="4" height="1" fill="currentColor" />
      <rect x="5" y="2" width="1" height="1" fill="currentColor" />
      <rect x="5" y="5" width="1" height="1" fill="currentColor" />
    </svg>
  );
}
