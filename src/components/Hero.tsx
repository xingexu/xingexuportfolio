"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { getSharedAudioContext, resumeSharedAudioContext } from "@/lib/audio";

const NAME = "xinge xu";
const NAME_STAR_GLOW_EVENT = "xinge:name-star-glow";
const SUNRISE_SKYLINE_GLOW_EVENT = "xinge:sunrise-skyline-glow";
const BANNER_LOOP = "/xinge-plane-banner-continuous-wind.png";
const BANNER_STATIC = "/xinge-plane-banner-static.png";
const BANNER_ENTRANCE_DURATION_MS = 4200;
const BANNER_PARTICLE_REMOVAL_INTERVAL_MS = 1000;
const SUNRISE_TRANSIENT_PARTICLE_COUNT = 21;
const SUNRISE_PARTICLES_PER_SETTLE_STEP = 4;
const SUNRISE_PARTICLE_SETTLE_STEPS = Math.ceil(
  SUNRISE_TRANSIENT_PARTICLE_COUNT / SUNRISE_PARTICLES_PER_SETTLE_STEP,
);
const SUNRISE_FIREWORK_COLORS = ["#ffd889", "#fff0cf", "#ef7f7d", "#a878c2"];

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

const SUNRISE_SETTLED_PARTICLE_INDEXES = new Set([1, 4, 7, 10, 14, 17, 20, 23]);
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

const SUNRISE_PLANE_SMOKE_PUFFS = Array.from({ length: 8 }, (_, index) => ({
  delay: `${-(index * 145)}ms`,
  size: 5 + (index % 3) * 2,
}));

function dispatchNameStarGlow(active: boolean) {
  window.dispatchEvent(new CustomEvent<boolean>(NAME_STAR_GLOW_EVENT, { detail: active }));
}

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

type SkyPhase = "day" | "twilight" | "night";
type BannerStage = "entrance" | "settling" | "loop" | "static";
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

function PixelArrow() {
  return <span className="pixel-arrow" aria-hidden="true" />;
}

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

function subscribeToHydration() {
  return () => undefined;
}

function getHydratedSnapshot() {
  return true;
}

function getServerHydratedSnapshot() {
  return false;
}

function BannerFireworks({ mode }: { mode: FireworkMode }) {
  const fireworks = mode === "extra" ? SUNRISE_CLICK_FIREWORKS : SUNRISE_LANDING_FIREWORKS;

  return (
    <div className="hero-banner-fireworks" aria-hidden="true">
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
    </div>
  );
}

/** Plays the one-shot plane entrance, then hands off to the seamless wind loop. */
function PlaneBanner() {
  const [stage, setStage] = useState<BannerStage>("entrance");
  const [settleStep, setSettleStep] = useState(0);
  const [windLoaded, setWindLoaded] = useState(false);
  const [fireworkBurst, setFireworkBurst] = useState<FireworkBurst | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const fireworkNoise = useRef<AudioBuffer | null>(null);
  const entranceFinished = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setStage("static"));
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  useEffect(() => {
    if (stage !== "settling") return;
    const settleTimer = window.setTimeout(() => {
      const nextStep = settleStep + 1;
      if (nextStep >= SUNRISE_PARTICLE_SETTLE_STEPS) setStage("loop");
      else setSettleStep(nextStep);
    }, BANNER_PARTICLE_REMOVAL_INTERVAL_MS);
    return () => window.clearTimeout(settleTimer);
  }, [settleStep, stage]);

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

  const illuminateToronto = () => {
    window.dispatchEvent(new Event(SUNRISE_SKYLINE_GLOW_EVENT));
    launchFireworks("extra", true);
  };

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

function DefaultHero() {
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const pid = useRef(0);

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

  useEffect(() => () => dispatchNameStarGlow(false), []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(NAME);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setTyped("");
      setTyping(true);
      let index = 0;
      timer.current = setInterval(() => {
        index++;
        setTyped(NAME.slice(0, index));
        if (index >= NAME.length && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
          setTyping(false);
        }
      }, 110);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

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
      <div className="hero-layout" style={{ width: "100%", maxWidth: 1040 }}>
        <div className="hero-copy">
          <h1
            className="font-pixel"
            style={{
              display: "inline-block",
              fontSize: "clamp(40px, 8vw, 88px)",
              fontWeight: 700,
              lineHeight: 1.05,
              color: "var(--text)",
              position: "relative",
            }}
          >
            <span
              className="name-hover"
              onMouseEnter={handleNameMouseEnter}
              onMouseLeave={handleNameMouseLeave}
            >
              {typed}
            </span>
            <span className="type-cursor" aria-hidden style={{ visibility: typing ? "visible" : "hidden" }} />
            <span aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
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

          <p className="step-in-2 hero-subtitle hero-education font-pixel">
            western computer science + ivey aeo &apos;31
          </p>

          <div
            className="step-in-3"
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

export default function Hero() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const phase = useSyncExternalStore(subscribeToSkyPhase, getSkyPhase, () => "night" as const);

  if (!hydrated) {
    return (
      <section className="hero-preload-shell">
        <h1 className="sr-only">{NAME}</h1>
      </section>
    );
  }

  return phase === "twilight" ? <SunriseHero /> : <DefaultHero />;
}
