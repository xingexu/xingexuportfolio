"use client";

import { useSyncExternalStore } from "react";

/**
 * Three-state sky selector. The local-time schedule supplies the initial mode
 * until a visitor chooses one; that preference then survives future reloads.
 */

type SkyPhase = "day" | "twilight" | "night";
const SKY_PHASE_STORAGE_KEY = "xinge-sky-phase-v1";

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

  const applyPhase = (target: SkyPhase) => {
    try {
      window.localStorage.setItem(SKY_PHASE_STORAGE_KEY, target);
    } catch {
      // The in-page override still works when storage is unavailable.
    }
    document.documentElement.dataset.skyOverride = target;
    document.documentElement.dataset.skyPhase = target;
    document.documentElement.dataset.theme = target === "night" ? "dark" : "light";
  };

  const toggle = () => {
    applyPhase(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={`Switch to ${nextLabel} mode`}
      title={`${phase} mode · click for ${nextLabel}`}
    >
      {phase === "day" ? <SunIcon /> : phase === "twilight" ? <SunriseIcon /> : <MoonIcon />}
    </button>
  );
}

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 16 16",
  fill: "currentColor",
  shapeRendering: "crispEdges" as const,
  "aria-hidden": true,
};

function SunIcon() {
  return (
    <svg {...iconProps}>
      <rect x="6" y="4" width="4" height="8" />
      <rect x="4" y="6" width="8" height="4" />
      <rect x="7" y="0" width="2" height="3" />
      <rect x="7" y="13" width="2" height="3" />
      <rect x="0" y="7" width="3" height="2" />
      <rect x="13" y="7" width="3" height="2" />
      <rect x="2" y="2" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 1h5v2H8v2H6v6h2v2h3v2H6v-2H3v-2H1V5h2V3h3V1Z" />
    </svg>
  );
}

function SunriseIcon() {
  return (
    <svg {...iconProps}>
      <rect x="1" y="13" width="14" height="2" />
      <rect x="4" y="9" width="8" height="4" />
      <rect x="6" y="7" width="4" height="2" />
      <rect x="7" y="2" width="2" height="3" />
      <rect x="2" y="5" width="2" height="2" />
      <rect x="12" y="5" width="2" height="2" />
    </svg>
  );
}
