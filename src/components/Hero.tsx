"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { getSharedAudioContext, resumeSharedAudioContext } from "@/lib/audio";

// ---------------------------------------------------------------------------
// Content + timing constants. There's a lot of these because the hero has
// three completely different "moods" (day / twilight sunrise / night) and
// each one has its own little choreographed sequence of images, timers, and
// sound effects. Tweak the *_MS values below to speed up or slow down the
// various reveals.
// ---------------------------------------------------------------------------
const NAME = "xinge xu";
// Custom window events so far-away components (background/sky layers) can
// react to what's happening in the hero without us having to prop-drill or
// reach for context — e.g. "hey, glow the stars because the name is hovered".
const NAME_STAR_GLOW_EVENT = "xinge:name-star-glow";
const SUNRISE_SKYLINE_GLOW_EVENT = "xinge:sunrise-skyline-glow";
// The plane banner (used during the twilight/sunrise sky phase) has a
// one-shot "flying in" clip and a seamless looping "cruising" clip, plus a
// plain static image for people who've asked for reduced motion.
const BANNER_LOOP = "/images/xinge-plane-banner-continuous-wind.png";
const BANNER_STATIC = "/images/xinge-plane-banner-static.png";
// Daytime hero: little planes animate once to "draw" the name, then we
// freeze on a clean final frame so it doesn't loop forever and distract.
const DAY_PLANES_ANIMATION = "/images/planesanimation.png";
const DAY_PLANES_FINAL = "/images/planesanimation-final.png";
const DAY_PLANES_DURATION_MS = 6_000; // how long we let the day-plane clip play before swapping to the frozen final frame
// Nighttime hero: fireworks spell out the name in the sky, then settle into
// a crisp still frame that's also a clickable "launch more fireworks" button.
const MIDNIGHT_FIREWORKS_NAME = "/images/newfireworks.png";
const MIDNIGHT_FIREWORKS_FINAL = "/images/newfireworks-final.png";
const MIDNIGHT_FULLSCREEN_FIREWORKS = "/images/fullscreenfireworks.png";
const MIDNIGHT_FIREWORKS_DURATION_MS = 5_400; // total runtime of the "fireworks spelling the name" clip
const MIDNIGHT_FULLSCREEN_FIREWORKS_DURATION_MS = 4_000; // how long the click-triggered fullscreen fireworks overlay stays on screen
const MIDNIGHT_FIREWORKS_REVEAL_MS = 4_850; // when we swap the animated clip for the still frame + make the name clickable (timed just before the clip actually finishes so the handoff is seamless)
const MIDNIGHT_SUPPORTING_REVEAL_MS = 1_850; // when the subtitle + buttons fade in, staggered a beat after the fireworks start
const BANNER_ENTRANCE_DURATION_MS = 4200; // keep this in sync with the CSS entrance animation's duration so the JS timeline and the animation finish together
const BANNER_PARTICLE_REMOVAL_INTERVAL_MS = 1000; // once the plane "arrives", its speed particles thin out in waves, one wave per this interval, until only the persistent ones remain
const SUNRISE_TRANSIENT_PARTICLE_COUNT = 21;
const SUNRISE_PARTICLES_PER_SETTLE_STEP = 4;
// How many waves it takes to clear out all the non-persistent particles.
const SUNRISE_PARTICLE_SETTLE_STEPS = Math.ceil(
  SUNRISE_TRANSIENT_PARTICLE_COUNT / SUNRISE_PARTICLES_PER_SETTLE_STEP,
);
const SUNRISE_FIREWORK_COLORS = ["#ffd889", "#fff0cf", "#ef7f7d", "#a878c2"];

// Hand-tuned positions (as % of the banner) and timing for the small
// fireworks that pop off when the plane "lands"/finishes its entrance.
// SUNRISE_CLICK_FIREWORKS reuses those plus a few extra bursts so clicking
// the skyline button feels like a bigger celebration than the automatic one.
const SUNRISE_LANDING_FIREWORKS = [
  { delay: "0ms", left: "37%", scale: "1.32", top: "49%", x: "-14px", y: "-124px" },
  { delay: "220ms", left: "62%", scale: "1.52", top: "46%", x: "10px", y: "-142px" },
  { delay: "440ms", left: "82%", scale: "1.22", top: "51%", x: "-8px", y: "-112px" },
];

const SUNRISE_CLICK_FIREWORKS = [
  ...SUNRISE_LANDING_FIREWORKS,
  { delay: "110ms", left: "26%", scale: "1.05", top: "54%", x: "6px", y: "-104px" },
  { delay: "330ms", left: "50%", scale: "1.24", top: "50%", x: "-10px", y: "-132px" },
  { delay: "550ms", left: "90%", scale: "0.9", top: "55%", x: "-4px", y: "-96px" },
];

// Offsets for the little spark trails that fly outward from each firework's
// burst point — basically a hand-drawn circle of directions (N, NE, E, ...).
const SUNRISE_FIREWORK_SPARKS = [
  { x: "0px", y: "-74px" },
  { x: "37px", y: "-64px" },
  { x: "64px", y: "-37px" },
  { x: "74px", y: "0px" },
  { x: "64px", y: "37px" },
  { x: "37px", y: "64px" },
  { x: "0px", y: "74px" },
  { x: "-37px", y: "64px" },
  { x: "-64px", y: "37px" },
  { x: "-74px", y: "0px" },
  { x: "-64px", y: "-37px" },
  { x: "-37px", y: "-64px" },
];

// Coordinates tracing two rows of little "speed lines" above and below the
// banner, following the rough silhouette of the plane's flight path.
const SUNRISE_PARTICLE_PATH = [
  { left: "24%", top: "20%" },
  { left: "30%", top: "17%" },
  { left: "36%", top: "14%" },
  { left: "42%", top: "17%" },
  { left: "48%", top: "23%" },
  { left: "54%", top: "19%" },
  { left: "60%", top: "17%" },
  { left: "66%", top: "14%" },
  { left: "72%", top: "19%" },
  { left: "78%", top: "22%" },
  { left: "84%", top: "18%" },
  { left: "90%", top: "19%" },
  { left: "95%", top: "18%" },
  { left: "24%", top: "81%" },
  { left: "30%", top: "79%" },
  { left: "36%", top: "77%" },
  { left: "42%", top: "82%" },
  { left: "48%", top: "85%" },
  { left: "54%", top: "81%" },
  { left: "60%", top: "79%" },
  { left: "66%", top: "77%" },
  { left: "72%", top: "81%" },
  { left: "78%", top: "84%" },
  { left: "84%", top: "81%" },
  { left: "90%", top: "82%" },
  { left: "95%", top: "82%" },
];

// A handful of particles are marked "persistent" — they stick around forever
// once the plane settles into its cruising loop, giving the loop a bit of
// life. Everything else is "transient" and gets cleared out wave by wave.
const SUNRISE_SETTLED_PARTICLE_INDEXES = new Set([1, 4, 7, 10, 14, 17, 20, 23]);
// Module-level counter (not React state) used purely to assign each
// transient particle to a settle-out wave in a shuffled-but-deterministic
// order, so they don't all vanish from left-to-right in an obvious line.
let sunriseTransientParticleOrdinal = 0;

function getSunriseParticleSettleGroup(persistent: boolean) {
  if (persistent) return -1;
  const removalRank = (sunriseTransientParticleOrdinal * 8) % SUNRISE_TRANSIENT_PARTICLE_COUNT;
  sunriseTransientParticleOrdinal += 1;
  return Math.floor(removalRank / SUNRISE_PARTICLES_PER_SETTLE_STEP);
}

const SUNRISE_SPEED_PARTICLES = SUNRISE_PARTICLE_PATH.map((position, index) => {
  const persistent = SUNRISE_SETTLED_PARTICLE_INDEXES.has(index);
  return {
    ...position,
    delay: `${-((index * 113) % 880)}ms`,
    duration: `${560 + (index % 4) * 80}ms`,
    height: index % 3 === 0 ? 6 : 4,
    persistent,
    settleGroup: getSunriseParticleSettleGroup(persistent),
    width: 8 + (index % 3) * 4,
  };
});

// Same idea as above, but for the smaller particles that live *inside* the
// plane's silhouette rather than tracing the outer flight path.
const SUNRISE_INSIDE_SPEED_PARTICLES_BASE = [
  { delay: "-120ms", height: 4, left: "32%", persistent: true, top: "33%", width: 12 },
  { delay: "-410ms", height: 6, left: "43%", persistent: false, top: "68%", width: 8 },
  { delay: "-690ms", height: 4, left: "53%", persistent: true, top: "32%", width: 16 },
  { delay: "-260ms", height: 4, left: "64%", persistent: true, top: "69%", width: 12 },
  { delay: "-790ms", height: 6, left: "75%", persistent: false, top: "33%", width: 8 },
  { delay: "-520ms", height: 4, left: "87%", persistent: false, top: "68%", width: 16 },
];

const SUNRISE_INSIDE_SPEED_PARTICLES = SUNRISE_INSIDE_SPEED_PARTICLES_BASE.map((particle) => ({
  ...particle,
  settleGroup: getSunriseParticleSettleGroup(particle.persistent),
}));

// A little contrail of smoke puffs trailing behind the plane, each one
// staggered by its own negative animation-delay so they look continuous.
const SUNRISE_PLANE_SMOKE_PUFFS = Array.from({ length: 8 }, (_, index) => ({
  delay: `${-(index * 145)}ms`,
  size: 5 + (index % 3) * 2,
}));

// Fired whenever the name is hovered (day mode) — lets a separate
// background/stars component pick up the event and glow in sync, without us
// needing to wire up shared state or context for something this occasional.
function dispatchNameStarGlow(active: boolean) {
  window.dispatchEvent(new CustomEvent<boolean>(NAME_STAR_GLOW_EVENT, { detail: active }));
}

// --- Firework sound design -------------------------------------------------
// We don't have a firework sound file, so we synthesize one with the Web
// Audio API. This builds a short burst of white noise with a fade-out — the
// "crackle" layer underneath each firework's boom.
function createFireworkNoise(audio: AudioContext) {
  const length = Math.round(audio.sampleRate * 0.38);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < length; index += 1) {
    const fade = 1 - index / length;
    data[index] = (Math.random() * 2 - 1) * (0.35 + fade * 0.65);
  }

  return buffer;
}

// Schedules the whole "whoosh...crackle-boom" sequence for a batch of
// fireworks: one rising oscillator for the launch, then a filtered-noise
// "crackle" plus a low sine "boom" timed to each firework's burst. `mode`
// tweaks the pitch/volume slightly so click-triggered ("extra") fireworks
// sound a touch punchier than the automatic landing ones.
function scheduleFireworkSounds(audio: AudioContext, noise: AudioBuffer, mode: FireworkMode) {
  const fireworks = mode === "extra" ? SUNRISE_CLICK_FIREWORKS : SUNRISE_LANDING_FIREWORKS;
  const start = audio.currentTime + 0.018;

  const lift = audio.createOscillator();
  const liftVolume = audio.createGain();
  lift.type = "triangle";
  lift.frequency.setValueAtTime(170, start);
  lift.frequency.exponentialRampToValueAtTime(mode === "extra" ? 520 : 440, start + 0.54);
  liftVolume.gain.setValueAtTime(0.0001, start);
  liftVolume.gain.exponentialRampToValueAtTime(mode === "extra" ? 0.055 : 0.045, start + 0.08);
  liftVolume.gain.exponentialRampToValueAtTime(0.0001, start + 0.57);
  lift.connect(liftVolume).connect(audio.destination);
  lift.start(start);
  lift.stop(start + 0.59);

  fireworks.forEach((firework, index) => {
    const delay = Number.parseInt(firework.delay, 10) / 1000;
    const burstAt = start + 0.59 + delay;
    const burstVolume = mode === "extra" ? 0.052 : 0.06;

    const crackle = audio.createBufferSource();
    const crackleFilter = audio.createBiquadFilter();
    const crackleVolume = audio.createGain();
    crackle.buffer = noise;
    crackleFilter.type = "lowpass";
    crackleFilter.frequency.setValueAtTime(2100 + (index % 3) * 360, burstAt);
    crackleFilter.frequency.exponentialRampToValueAtTime(380, burstAt + 0.32);
    crackleVolume.gain.setValueAtTime(0.0001, burstAt);
    crackleVolume.gain.exponentialRampToValueAtTime(burstVolume, burstAt + 0.012);
    crackleVolume.gain.exponentialRampToValueAtTime(0.0001, burstAt + 0.34);
    crackle.connect(crackleFilter).connect(crackleVolume).connect(audio.destination);
    crackle.start(burstAt);
    crackle.stop(burstAt + 0.36);

    const boom = audio.createOscillator();
    const boomVolume = audio.createGain();
    boom.type = "sine";
    boom.frequency.setValueAtTime(105 + (index % 3) * 12, burstAt);
    boom.frequency.exponentialRampToValueAtTime(48, burstAt + 0.3);
    boomVolume.gain.setValueAtTime(0.0001, burstAt);
    boomVolume.gain.exponentialRampToValueAtTime(burstVolume * 0.92, burstAt + 0.014);
    boomVolume.gain.exponentialRampToValueAtTime(0.0001, burstAt + 0.32);
    boom.connect(boomVolume).connect(audio.destination);
    boom.start(burstAt);
    boom.stop(burstAt + 0.34);
  });
}

// --- Shared types ------------------------------------------------------
// SkyPhase mirrors a `data-sky-phase` attribute set on <html> elsewhere in
// the app (a global day/night cycle), and decides which hero variant renders.
type SkyPhase = "day" | "twilight" | "night";
// The plane banner's little state machine: flies in ("entrance"), sheds its
// extra particles ("settling"), then cruises forever ("loop") — or jumps
// straight to "static" for reduced-motion users.
type BannerStage = "entrance" | "settling" | "loop" | "static";
// "landing" = the automatic burst when the plane finishes its entrance;
// "extra" = the bigger burst triggered by clicking the skyline/name.
type FireworkMode = "landing" | "extra";
type FireworkBurst = { id: number; mode: FireworkMode };

type FireworkStyle = CSSProperties & {
  "--firework-delay": string;
  "--firework-scale": string;
  "--firework-x": string;
  "--firework-y": string;
};

type FireworkSparkStyle = CSSProperties & {
  "--spark-color": string;
  "--spark-lag": string;
  "--spark-x": string;
  "--spark-y": string;
};

type Particle = {
  color: string;
  delay: string;
  drop: string;
  drift: string;
  duration: string;
  id: number;
  left: string;
  size: number;
  spin: string;
  top: string;
};

type NameParticleStyle = CSSProperties & {
  "--name-drift": string;
  "--name-drop": string;
  "--name-spin": string;
};

const PARTICLE_COLORS = [
  "var(--confetti-1)",
  "var(--confetti-2)",
  "var(--confetti-3)",
  "var(--confetti-4)",
];

// Small pixel-art arrow glyph used inside the CTA buttons below.
function PixelArrow() {
  return <span className="pixel-arrow" aria-hidden="true" />;
}

// --- Reading the current sky phase from the DOM ----------------------------
// Some other part of the app owns the actual day/night cycle and reflects it
// as `data-sky-phase` on <html>. Rather than duplicating that logic here, we
// just watch for attribute changes with a MutationObserver and read it back
// out. useSyncExternalStore (see the Hero() export below) wires this up so
// React re-renders whenever the phase flips.
function subscribeToSkyPhase(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-sky-phase", "data-sky-override"],
  });
  return () => observer.disconnect();
}

function getSkyPhase(): SkyPhase {
  const phase = document.documentElement.dataset.skyPhase;
  return phase === "day" || phase === "twilight" || phase === "night" ? phase : "night";
}

// --- Hydration guard --------------------------------------------------------
// These three feed useSyncExternalStore purely as a trick to detect "are we
// on the client yet?" The server snapshot is always `false`, the client
// snapshot is always `true`, and there's nothing to actually subscribe to —
// so React renders the server-safe placeholder first, then flips to the real
// content right after hydration. This avoids a hydration mismatch, since the
// real hero depends on browser-only things like `window` and `document`.
function subscribeToHydration() {
  return () => undefined;
}

function getHydratedSnapshot() {
  return true;
}

function getServerHydratedSnapshot() {
  return false;
}

// Renders one round of visual firework bursts over the banner (the sound is
// handled separately by scheduleFireworkSounds). Picks the small "landing"
// set or the bigger "click" set depending on mode.
function BannerFireworks({ mode }: { mode: FireworkMode }) {
  const fireworks = mode === "extra" ? SUNRISE_CLICK_FIREWORKS : SUNRISE_LANDING_FIREWORKS;

  return (
    <span className="hero-banner-fireworks" aria-hidden="true">
      {fireworks.map((firework, fireworkIndex) => (
        <span
          className="hero-banner-firework"
          key={`${firework.left}-${firework.top}`}
          style={
            {
              "--firework-delay": firework.delay,
              "--firework-scale": firework.scale,
              "--firework-x": firework.x,
              "--firework-y": firework.y,
              left: firework.left,
              top: firework.top,
            } as FireworkStyle
          }
        >
          <span className="hero-banner-firework-rocket" />
          <span className="hero-banner-firework-burst">
            <span className="hero-banner-firework-core" />
            {SUNRISE_FIREWORK_SPARKS.map((spark, sparkIndex) => (
              <span
                className="hero-banner-firework-spark"
                key={`${spark.x}-${spark.y}`}
                style={
                  {
                    "--spark-color":
                      SUNRISE_FIREWORK_COLORS[(fireworkIndex + sparkIndex) % SUNRISE_FIREWORK_COLORS.length],
                    "--spark-lag": `${(sparkIndex % 3) * 22}ms`,
                    "--spark-x": spark.x,
                    "--spark-y": spark.y,
                  } as FireworkSparkStyle
                }
              />
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Plays the one-shot plane entrance, then hands off to the seamless wind loop. */
function PlaneBanner() {
  const [stage, setStage] = useState<BannerStage>("entrance");
  const [settleStep, setSettleStep] = useState(0);
  const [windLoaded, setWindLoaded] = useState(false);
  const [fireworkBurst, setFireworkBurst] = useState<FireworkBurst | null>(null);
  // Cached AudioContext + noise buffer so we don't rebuild them on every
  // firework; entranceFinished tracks the entrance clip's completion so we
  // can coordinate it with the (separately-async) wind-loop image load below.
  const audioContext = useRef<AudioContext | null>(null);
  const fireworkNoise = useRef<AudioBuffer | null>(null);
  const entranceFinished = useRef(false);

  // Reduced-motion users skip the whole animated sequence and land straight
  // on the static banner — no entrance, no particles, no fireworks-on-load.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setStage("static"));
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  // While "settling", clear out one wave of transient particles per tick
  // until they're all gone, then move on to the steady-state "loop" stage.
  useEffect(() => {
    if (stage !== "settling") return;
    const settleTimer = window.setTimeout(() => {
      const nextStep = settleStep + 1;
      if (nextStep >= SUNRISE_PARTICLE_SETTLE_STEPS) setStage("loop");
      else setSettleStep(nextStep);
    }, BANNER_PARTICLE_REMOVAL_INTERVAL_MS);
    return () => window.clearTimeout(settleTimer);
  }, [settleStep, stage]);

  // Browsers block audio from playing until the user has interacted with the
  // page (autoplay policy), so we listen for the very first pointer/touch/key
  // event anywhere on the page and use it to resume the shared AudioContext.
  // This means fireworks sound effects "just work" the moment someone starts
  // interacting, even if they haven't clicked anything fireworks-related yet.
  useEffect(() => {
    const unlockAudio = () => {
      if (!audioContext.current || audioContext.current.state === "closed") {
        audioContext.current = getSharedAudioContext();
        fireworkNoise.current = null;
      }
      resumeSharedAudioContext(audioContext.current);
    };

    window.addEventListener("pointerdown", unlockAudio, { capture: true, once: true, passive: true });
    window.addEventListener("touchstart", unlockAudio, { capture: true, once: true, passive: true });
    window.addEventListener("keydown", unlockAudio, { capture: true, once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio, true);
      window.removeEventListener("touchstart", unlockAudio, true);
      window.removeEventListener("keydown", unlockAudio, true);
      audioContext.current = null;
      fireworkNoise.current = null;
    };
  }, []);

  const beginParticleSettling = () => {
    setSettleStep(0);
    setStage("settling");
  };

  // Two things need to finish before we can start settling: the entrance
  // animation must play out (handleEntranceEnd) AND the looping wind image
  // must have finished loading (handleWindLoad) — otherwise we'd flash an
  // unloaded image. Whichever of the two finishes second is the one that
  // actually kicks off beginParticleSettling().
  const handleWindLoad = () => {
    if (stage !== "entrance" || windLoaded) return;
    setWindLoaded(true);
    if (entranceFinished.current) beginParticleSettling();
  };

  const handleEntranceEnd = () => {
    if (stage !== "entrance") return;

    entranceFinished.current = true;
    launchFireworks("landing", false);
    if (windLoaded) beginParticleSettling();
  };

  // Plays the synthesized firework sound effect. `allowCreate` gates whether
  // we're allowed to create/resume the AudioContext right now — we only want
  // to do that in response to a real user gesture (see illuminateToronto),
  // not from the automatic "landing" fireworks that fire on animation end.
  const playFireworkSounds = (mode: FireworkMode, allowCreate: boolean) => {
    let audio = audioContext.current;
    if ((!audio || audio.state === "closed") && allowCreate) {
      audio = getSharedAudioContext();
      audioContext.current = audio;
      fireworkNoise.current = null;
    }
    if (!audio || audio.state === "closed") return;
    if (audio.state !== "running") {
      if (!allowCreate) return;
      resumeSharedAudioContext(audio);
    }

    if (!fireworkNoise.current) fireworkNoise.current = createFireworkNoise(audio);
    scheduleFireworkSounds(audio, fireworkNoise.current, mode);
  };

  const launchFireworks = (mode: FireworkMode, fromGesture: boolean) => {
    setFireworkBurst((current) => ({ id: (current?.id ?? 0) + 1, mode }));
    playFireworkSounds(mode, fromGesture);
  };

  // Handler for the little invisible button that sits over the banner once
  // it's cruising — lets visitors light up the Toronto skyline on demand and
  // fire off an extra celebratory burst. This is a real click, so audio is
  // always allowed to start here.
  const illuminateToronto = () => {
    window.dispatchEvent(new Event(SUNRISE_SKYLINE_GLOW_EVENT));
    launchFireworks("extra", true);
  };

  // Which image + which particle sets to show depends entirely on `stage`:
  // full particle set during "entrance", a shrinking set during "settling",
  // and just the persistent ones once we're "loop"ing forever.
  const src = stage === "static" ? BANNER_STATIC : BANNER_LOOP;
  const speedParticles =
    stage === "loop"
      ? SUNRISE_SPEED_PARTICLES.filter((particle) => particle.persistent)
      : stage === "settling"
        ? SUNRISE_SPEED_PARTICLES.filter(
            (particle) => particle.persistent || particle.settleGroup >= settleStep,
          )
        : SUNRISE_SPEED_PARTICLES;
  const insideSpeedParticles =
    stage === "loop"
      ? SUNRISE_INSIDE_SPEED_PARTICLES.filter((particle) => particle.persistent)
      : stage === "settling"
        ? SUNRISE_INSIDE_SPEED_PARTICLES.filter(
            (particle) => particle.persistent || particle.settleGroup >= settleStep,
          )
        : SUNRISE_INSIDE_SPEED_PARTICLES;

  return (
    // The `onAnimationEnd` check against currentTarget vs target matters
    // here — without it, animations bubbling up from child elements would
    // also (incorrectly) trigger handleEntranceEnd. animationDuration is set
    // inline from BANNER_ENTRANCE_DURATION_MS so the constant above stays
    // the single source of truth for how long the entrance CSS animation runs.
    <div
      className={`hero-plane-banner${stage === "entrance" ? " hero-plane-banner-entrance-playing" : ""}`}
      onAnimationEnd={(event) => {
        if (event.currentTarget === event.target) handleEntranceEnd();
      }}
      style={stage === "entrance" ? { animationDuration: `${BANNER_ENTRANCE_DURATION_MS}ms` } : undefined}
    >
      {fireworkBurst && <BannerFireworks key={fireworkBurst.id} mode={fireworkBurst.mode} />}
      {stage !== "static" ? (
        <div
          className={`hero-banner-speed-particles${stage === "loop" ? " hero-banner-speed-particles-settled" : stage === "settling" ? " hero-banner-speed-particles-settling" : ""}`}
          aria-hidden="true"
        >
          {speedParticles.map((particle) => (
            <span
              className={`hero-banner-speed-particle${stage === "settling" && particle.settleGroup === settleStep ? " hero-banner-speed-particle-fading" : ""}`}
              key={`${particle.left}-${particle.top}`}
              style={{
                animationDelay:
                  stage === "settling" && particle.settleGroup === settleStep ? "0ms" : particle.delay,
                animationDuration:
                  stage === "loop"
                    ? "1480ms"
                    : stage === "settling" && particle.settleGroup === settleStep
                      ? `${BANNER_PARTICLE_REMOVAL_INTERVAL_MS}ms`
                      : particle.duration,
                height: particle.height,
                left: particle.left,
                top: particle.top,
                width: particle.width,
              }}
            />
          ))}
        </div>
      ) : null}
      {stage !== "static" ? (
        <div
          className={`hero-banner-speed-particles hero-banner-speed-particles-inside${stage === "loop" ? " hero-banner-speed-particles-settled" : stage === "settling" ? " hero-banner-speed-particles-settling" : ""}`}
          aria-hidden="true"
        >
          {insideSpeedParticles.map((particle) => (
            <span
              className={`hero-banner-speed-particle${stage === "settling" && particle.settleGroup === settleStep ? " hero-banner-speed-particle-fading" : ""}`}
              key={`${particle.left}-${particle.top}`}
              style={{
                animationDelay:
                  stage === "settling" && particle.settleGroup === settleStep ? "0ms" : particle.delay,
                animationDuration:
                  stage === "loop"
                    ? "1580ms"
                    : stage === "settling" && particle.settleGroup === settleStep
                      ? `${BANNER_PARTICLE_REMOVAL_INTERVAL_MS}ms`
                      : "680ms",
                height: particle.height,
                left: particle.left,
                top: particle.top,
                width: particle.width,
              }}
            />
          ))}
        </div>
      ) : null}
      {stage !== "static" ? (
        <div className="hero-banner-plane-smoke" aria-hidden="true">
          {SUNRISE_PLANE_SMOKE_PUFFS.map((puff, index) => (
            <span
              className="hero-banner-plane-smoke-puff"
              key={index}
              style={{
                animationDelay: puff.delay,
                height: puff.size,
                width: puff.size,
              }}
            />
          ))}
        </div>
      ) : null}
      {stage === "entrance" && !windLoaded && (
        <Image
          src={BANNER_STATIC}
          alt=""
          width={1920}
          height={540}
          priority
          unoptimized
          draggable={false}
          sizes="(max-width: 640px) 84vw, (max-width: 1200px) 78vw, 920px"
          className="hero-plane-banner-image hero-plane-banner-entry-poster"
        />
      )}
      <Image
        key={src}
        src={src}
        alt=""
        width={1920}
        height={540}
        priority
        unoptimized
        draggable={false}
        sizes="(max-width: 640px) 84vw, (max-width: 1200px) 78vw, 920px"
        className={`hero-plane-banner-image${stage === "entrance" && !windLoaded ? " hero-plane-banner-image-loading" : ""}`}
        onLoad={handleWindLoad}
      />
      {stage !== "entrance" && (
        <button
          type="button"
          className="hero-banner-firework-trigger"
          aria-label="Illuminate the Toronto skyline and launch sunrise fireworks"
          title="Light up Toronto"
          onClick={illuminateToronto}
        />
      )}
    </div>
  );
}

// The twilight/sunrise variant of the hero — just the plane banner plus the
// subtitle and CTA buttons underneath. Much simpler than DefaultHero since
// all the fun animation logic lives inside PlaneBanner itself.
function SunriseHero() {
  return (
    <section className="hero-section">
      <h1 className="sr-only">{NAME}</h1>

      <div className="hero-stage">
        <PlaneBanner />

        <div className="hero-layout hero-layout-under-banner">
          <div className="hero-copy">
            <p className="step-in-2 hero-subtitle hero-education font-pixel">
              western computer science + ivey aeo &apos;31
            </p>

            <div
              className="step-in-3"
              style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "14px 24px", marginTop: 32 }}
            >
              <Link href="/projects" className="px-btn hero-cta-btn">
                see what i built! <PixelArrow />
              </Link>
              <Link href="/resume" className="px-btn px-btn-secondary hero-cta-btn hero-resume-btn">
                resume <PixelArrow />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Handles both the "day" and "night" hero variants (everything except the
// twilight/sunrise plane banner, which lives in SunriseHero above). Day mode
// plays a short plane-drawn-name animation; night mode plays a fireworks
// intro that spells the name, then lets you click it for more fireworks.
function DefaultHero({ phase }: { phase: Exclude<SkyPhase, "twilight"> }) {
  // Day-mode animation state: starts "already complete" if we're not even in
  // day mode, so night mode doesn't bother rendering the day animation at all.
  const [dayAnimationComplete, setDayAnimationComplete] = useState(phase !== "day");
  // Night-mode intro sequence state: intro plays only when we start in night
  // mode; "ready" flips once the animated clip has actually loaded (so we
  // don't start the reveal timers against an image that isn't even showing
  // yet); "nameVisible"/"supportingVisible" drive the staggered fade-ins.
  const [midnightIntroPlaying, setMidnightIntroPlaying] = useState(phase === "night");
  const [midnightIntroReady, setMidnightIntroReady] = useState(false);
  const [midnightNameVisible, setMidnightNameVisible] = useState(false);
  const [midnightSupportingVisible, setMidnightSupportingVisible] = useState(false);
  const [midnightGlowActive, setMidnightGlowActive] = useState(false);
  // 0 means "no fullscreen fireworks showing"; any other number is used both
  // as a truthy flag and as a React `key` to force the fireworks <Image> to
  // remount (and thus replay its animation) on every click.
  const [midnightFullscreenFireworksId, setMidnightFullscreenFireworksId] = useState(0);
  const midnightFullscreenFireworksTimer = useRef<number | null>(null);
  const midnightFireworkNoise = useRef<AudioBuffer | null>(null);
  const dayAnimationTimer = useRef<number | null>(null);
  // Little confetti-style particles that burst out from behind the name on
  // hover/click — shared between the day and night variants.
  const [particles, setParticles] = useState<Particle[]>([]);
  const pid = useRef(0);

  // Spawns a fresh handful of randomly-styled confetti particles. Capped at
  // 112 total (via the slice below) so a flurry of quick hovers/clicks can't
  // pile up thousands of DOM nodes.
  const burst = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next: Particle[] = Array.from({ length: 56 }, () => ({
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      delay: `${Math.random() * 0.2}s`,
      drop: `${76 + Math.round(Math.random() * 112)}px`,
      drift: `${Math.round(Math.random() * 144 - 72)}px`,
      duration: `${0.9 + Math.random() * 0.72}s`,
      id: pid.current++,
      left: `${3 + Math.random() * 94}%`,
      size: 5 + Math.floor(Math.random() * 8),
      spin: `${Math.round(Math.random() * 540 - 270)}deg`,
      top: `${-14 + Math.random() * 48}%`,
    }));
    setParticles((current) => [...current, ...next].slice(-112));
  };

  const handleNameMouseEnter = () => {
    burst();
    dispatchNameStarGlow(true);
  };

  const handleNameMouseLeave = () => {
    dispatchNameStarGlow(false);
  };

  // Once the day animation image has actually loaded, start the clock for
  // how long to let it play before freezing on the final frame. Reduced-
  // motion users get a duration of 0, so it swaps over basically immediately.
  const handleDayAnimationLoad = () => {
    if (phase !== "day" || dayAnimationComplete || dayAnimationTimer.current) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : DAY_PLANES_DURATION_MS;
    dayAnimationTimer.current = window.setTimeout(() => {
      setDayAnimationComplete(true);
      dayAnimationTimer.current = null;
    }, duration);
  };

  const handleMidnightNameMouseEnter = () => {
    if (!midnightNameVisible) return;
    burst();
    setMidnightGlowActive(true);
  };

  const handleMidnightNameMouseLeave = () => {
    setMidnightGlowActive(false);
  };

  // Clicking the settled fireworks name (night mode only, once it's visible)
  // triggers a fullscreen fireworks overlay + sound, and re-triggers cleanly
  // even on rapid repeat clicks by clearing any existing hide-timer first.
  // This click is a genuine user gesture, so we can safely resume audio here.
  const handleMidnightNameClick = () => {
    if (phase !== "night" || !midnightNameVisible) return;
    setMidnightFullscreenFireworksId((current) => current + 1);
    if (midnightFullscreenFireworksTimer.current) {
      window.clearTimeout(midnightFullscreenFireworksTimer.current);
    }
    midnightFullscreenFireworksTimer.current = window.setTimeout(() => {
      setMidnightFullscreenFireworksId(0);
      midnightFullscreenFireworksTimer.current = null;
    }, MIDNIGHT_FULLSCREEN_FIREWORKS_DURATION_MS);
    const audio = resumeSharedAudioContext(getSharedAudioContext());
    if (!audio || audio.state === "closed") return;
    if (!midnightFireworkNoise.current) midnightFireworkNoise.current = createFireworkNoise(audio);
    scheduleFireworkSounds(audio, midnightFireworkNoise.current, "extra");
  };

  // Cleanup on unmount: clear any pending timers and make sure we don't leave
  // the star-glow event "stuck" active if the component goes away mid-hover.
  useEffect(() => () => {
    if (dayAnimationTimer.current) {
      window.clearTimeout(dayAnimationTimer.current);
    }
    if (midnightFullscreenFireworksTimer.current) {
      window.clearTimeout(midnightFullscreenFireworksTimer.current);
    }
    midnightFireworkNoise.current = null;
    dispatchNameStarGlow(false);
  }, []);

  // Warm the browser's image cache for the fullscreen fireworks asset ahead
  // of time, so the first click doesn't have an awkward loading delay.
  useEffect(() => {
    if (phase !== "night") return;
    const preload = new window.Image();
    preload.src = MIDNIGHT_FULLSCREEN_FIREWORKS;
  }, [phase]);

  // The night-mode intro is really three staggered reveals sharing one
  // timeline: subtitle/buttons fade in first, then the name becomes visible
  // (and clickable) just before the clip ends, then finally we swap away
  // from the animated clip to the static frame. All three timers key off the
  // same constants declared at the top of the file.
  useEffect(() => {
    if (phase !== "night" || !midnightIntroPlaying || !midnightIntroReady) return;

    const supportingTimer = window.setTimeout(
      () => setMidnightSupportingVisible(true),
      MIDNIGHT_SUPPORTING_REVEAL_MS,
    );
    const revealTimer = window.setTimeout(
      () => setMidnightNameVisible(true),
      MIDNIGHT_FIREWORKS_REVEAL_MS,
    );
    const introTimer = window.setTimeout(
      () => setMidnightIntroPlaying(false),
      MIDNIGHT_FIREWORKS_DURATION_MS,
    );
    return () => {
      window.clearTimeout(supportingTimer);
      window.clearTimeout(revealTimer);
      window.clearTimeout(introTimer);
    };
  }, [midnightIntroPlaying, midnightIntroReady, phase]);

  // Only night mode needs the staggered supporting-copy fade-in class; day
  // mode's subtitle/buttons just use the regular step-in animation classes.
  const midnightSupportingCopyClass = phase === "night"
    ? ` midnight-supporting-copy${midnightSupportingVisible ? " midnight-supporting-copy-visible" : ""}`
    : "";

  return (
    <section
      className="hero-default-section"
      style={{
        position: "relative",
        zIndex: 10,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "96px 28px",
      }}
    >
      {phase === "night" && midnightFullscreenFireworksId > 0 && (
        <span className="midnight-fullscreen-fireworks" aria-hidden="true">
          <Image
            key={midnightFullscreenFireworksId}
            src={`${MIDNIGHT_FULLSCREEN_FIREWORKS}#play-${midnightFullscreenFireworksId}`}
            alt=""
            fill
            sizes="100vw"
            unoptimized
            className="midnight-fullscreen-fireworks-image"
          />
        </span>
      )}
      <div className="hero-layout" style={{ width: "100%", maxWidth: 1040 }}>
        <div className="hero-copy">
          <h1
            className={`font-pixel${phase === "night" ? " midnight-fireworks-heading" : " day-planes-heading"}`}
            style={{
              display: "inline-block",
              fontSize: "clamp(40px, 8vw, 88px)",
              fontWeight: 700,
              lineHeight: 1.05,
              color: "var(--text)",
              position: "relative",
            }}
          >
            {phase === "night" ? (
              <span
                className={`midnight-fireworks-name${midnightGlowActive ? " midnight-fireworks-name-glowing" : ""}`}
                aria-label={midnightNameVisible ? "Xinge Xu — launch fullscreen fireworks" : undefined}
                role={midnightNameVisible ? "button" : undefined}
                tabIndex={midnightNameVisible ? 0 : -1}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={handleMidnightNameClick}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  handleMidnightNameClick();
                }}
                onMouseEnter={handleMidnightNameMouseEnter}
                onMouseLeave={handleMidnightNameMouseLeave}
                title={midnightNameVisible ? "Click for fullscreen fireworks and sound" : undefined}
              >
                <span className="sr-only">{NAME}</span>
                {midnightIntroPlaying && (
                  <Image
                    src={MIDNIGHT_FIREWORKS_NAME}
                    width={1440}
                    height={810}
                    sizes="(max-width: 820px) 100vw, 980px"
                    alt=""
                    priority
                    unoptimized
                    aria-hidden
                    className={`midnight-fireworks-name-image${midnightNameVisible ? " midnight-fireworks-name-image-finishing" : ""}`}
                    onLoad={() => setMidnightIntroReady(true)}
                  />
                )}
                <Image
                  src={MIDNIGHT_FIREWORKS_FINAL}
                  width={1440}
                  height={810}
                  sizes="(max-width: 820px) 100vw, 980px"
                  alt=""
                  priority
                  unoptimized
                  aria-hidden
                  className={`midnight-fireworks-name-still${midnightNameVisible ? " midnight-fireworks-name-still-visible" : ""}`}
                />
              </span>
            ) : (
              <span
                className={`day-planes-name${dayAnimationComplete ? " day-planes-name-complete" : ""}`}
                onMouseEnter={handleNameMouseEnter}
                onMouseLeave={handleNameMouseLeave}
              >
                <span className="sr-only">{NAME}</span>
                <span className="day-planes-name-window" aria-hidden="true">
                  {!dayAnimationComplete && (
                    <Image
                      src={DAY_PLANES_ANIMATION}
                      alt=""
                      width={1440}
                      height={900}
                      priority
                      unoptimized
                      draggable={false}
                      sizes="(max-width: 820px) 190vw, 1800px"
                      className="day-planes-name-image day-planes-name-animation"
                      onLoad={handleDayAnimationLoad}
                      onError={() => setDayAnimationComplete(true)}
                    />
                  )}
                  <Image
                    src={DAY_PLANES_FINAL}
                    alt=""
                    width={1440}
                    height={900}
                    priority
                    unoptimized
                    draggable={false}
                    sizes="(max-width: 820px) 190vw, 1800px"
                    className="day-planes-name-image day-planes-name-final"
                  />
                </span>
              </span>
            )}
            <span
              aria-hidden
              className={phase === "night" ? "midnight-name-particle-layer" : undefined}
              style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
            >
              {particles.map((particle) => (
                <span
                  key={particle.id}
                  className="name-particle"
                  style={
                    {
                      "--name-drift": particle.drift,
                      "--name-drop": particle.drop,
                      "--name-spin": particle.spin,
                      animationDelay: particle.delay,
                      animationDuration: particle.duration,
                      background: particle.color,
                      height: particle.size,
                      left: particle.left,
                      top: particle.top,
                      width: particle.size,
                    } as NameParticleStyle
                  }
                />
              ))}
            </span>
          </h1>

          <p className={`step-in-2 hero-subtitle hero-education font-pixel${midnightSupportingCopyClass}`}>
            western computer science + ivey aeo &apos;31
          </p>

          <div
            className={`step-in-3${midnightSupportingCopyClass}`}
            style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "16px 28px", marginTop: 40 }}
          >
            <Link href="/projects" className="px-btn hero-cta-btn">
              see what i built! <PixelArrow />
            </Link>
            <Link href="/resume" className="px-btn px-btn-secondary hero-cta-btn hero-resume-btn">
              resume <PixelArrow />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// The actual exported component: figures out whether we're hydrated yet and
// which sky phase we're in, then hands off to the right variant.
export default function Hero() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  // Server-side (and the very first client render) always assumes "night" so
  // the initial markup is deterministic; the real phase kicks in once we've
  // hydrated and can read the DOM attribute.
  const phase = useSyncExternalStore(subscribeToSkyPhase, getSkyPhase, () => "night" as const);

  // Before hydration, render just the bare, animation-free shell — this has
  // to match what the server sent exactly, or React will complain about a
  // hydration mismatch.
  if (!hydrated) {
    return (
      <section className="hero-preload-shell">
        <h1 className="sr-only">{NAME}</h1>
      </section>
    );
  }

  // `key={phase}` on DefaultHero forces a full remount when switching
  // between day and night, so all that component's animation/timer state
  // resets cleanly instead of trying to awkwardly transition mid-sequence.
  return phase === "twilight" ? <SunriseHero /> : <DefaultHero key={phase} phase={phase} />;
}
