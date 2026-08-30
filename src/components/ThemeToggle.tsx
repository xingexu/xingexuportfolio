"use client";

import { useSyncExternalStore } from "react";

/**
 * Three-state sky selector. The local-time schedule initializes the phase and
 * reapplies it at the next time boundary; clicking cycles day → twilight →
 * night so every scene is always reachable from the navigation.
 */

type SkyPhase = "day" | "twilight" | "night";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-sky-phase", "data-sky-override"],
  });
  return () => observer.disconnect();
}

const getPhase = (): SkyPhase => {
  const phase = document.documentElement.dataset.skyPhase;
  return phase === "day" || phase === "twilight" || phase === "night" ? phase : "night";
};

const nextPhase = (phase: SkyPhase): SkyPhase =>
  phase === "day" ? "twilight" : phase === "twilight" ? "night" : "day";

export default function ThemeToggle() {
  const phase = useSyncExternalStore(subscribe, getPhase, () => "night" as const);
  const next = nextPhase(phase);
  const nextLabel = next === "twilight" ? "sunset and sunrise" : next;

  const toggle = () => {
    document.documentElement.dataset.skyOverride = next;
    document.documentElement.dataset.skyPhase = next;
    document.documentElement.dataset.theme = next === "night" ? "dark" : "light";
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={`Switch to ${nextLabel} mode`}
      title={nextLabel}
    >
      {next === "day" ? <PixelSun /> : next === "twilight" ? <PixelSunset /> : <PixelMoon />}
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

function PixelSunset() {
  return (
    <svg width="16" height="16" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
      <rect x="3" y="1" width="2" height="1" fill="currentColor" />
      <rect x="2" y="2" width="4" height="1" fill="currentColor" />
      <rect x="1" y="3" width="6" height="2" fill="currentColor" />
      <rect x="0" y="5" width="8" height="1" fill="currentColor" />
      <rect x="1" y="7" width="2" height="1" fill="currentColor" />
      <rect x="4" y="7" width="3" height="1" fill="currentColor" />
    </svg>
  );
}
