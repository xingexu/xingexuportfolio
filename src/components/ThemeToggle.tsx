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
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20.7 14.2A8.5 8.5 0 0 1 9.8 3.3 8.5 8.5 0 1 0 20.7 14.2Z" />
    </svg>
  );
}

function SunriseIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 18a8 8 0 0 1 16 0Z" fill="currentColor" stroke="none" />
      <path d="M2.5 18h19" strokeWidth="1.25" />
      <path d="M12 4.5v3M4 9.1l1.7 1.7M20 9.1l-1.7 1.7M1.5 15.5h1.8M20.7 15.5h1.8" strokeWidth="1.35" />
    </svg>
  );
}
