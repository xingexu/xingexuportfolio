"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { SITE } from "@/app/data";
import { getSharedAudioContext, resumeSharedAudioContext } from "@/lib/audio";

const NAME = "xinge xu";
const BANNER_LOOP = "/xinge-plane-banner-continuous-wind.png";
const BANNER_STATIC = "/xinge-plane-banner-static.png";
const BANNER_ENTRANCE_DURATION_MS = 6000;
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
type BannerStage = "entrance" | "loop" | "static";
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

  const handleWindLoad = () => {
    if (stage !== "entrance" || windLoaded) return;
    setWindLoaded(true);
    if (entranceFinished.current) setStage("loop");
  };

  const handleEntranceEnd = () => {
    if (stage !== "entrance") return;

    entranceFinished.current = true;
    launchFireworks("landing", false);
    if (windLoaded) setStage("loop");
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

  const src = stage === "static" ? BANNER_STATIC : BANNER_LOOP;

  return (
    <div
      className={`hero-plane-banner${stage === "entrance" ? " hero-plane-banner-entrance-playing" : ""}`}
      onAnimationEnd={(event) => {
        if (event.currentTarget === event.target) handleEntranceEnd();
      }}
      style={stage === "entrance" ? { animationDuration: `${BANNER_ENTRANCE_DURATION_MS}ms` } : undefined}
    >
      {fireworkBurst && <BannerFireworks key={fireworkBurst.id} mode={fireworkBurst.mode} />}
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
          aria-label="Launch more sunrise fireworks"
          title="Launch more fireworks"
          onClick={() => launchFireworks("extra", true)}
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
            <p className="step-in-2 hero-subtitle" style={{ fontSize: 14 }}>
              {SITE.role.toLowerCase()}
            </p>

            <p className="step-in-2 hero-subtitle" style={{ fontSize: 12, marginTop: 7 }}>
              western cs + ivey aeo &apos;30
            </p>

            <div
              className="step-in-3"
              style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "14px 24px", marginTop: 32 }}
            >
              <Link href="/projects" className="px-btn">
                see what i built! <span aria-hidden>→</span>
              </Link>
              <Link href="/resume" className="px-btn px-btn-secondary hero-resume-btn">
                resume <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DefaultHero() {
  const [typed, setTyped] = useState(NAME);
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

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
            <span className="name-hover" onMouseEnter={burst}>{typed}</span>
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

          <p className="step-in-2 hero-subtitle" style={{ fontSize: 15, marginTop: 20 }}>
            {SITE.role.toLowerCase()}
          </p>

          <p className="step-in-2 hero-subtitle" style={{ fontSize: 13, marginTop: 8 }}>
            western cs + ivey aeo &apos;30
          </p>

          <div
            className="step-in-3"
            style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "16px 28px", marginTop: 40 }}
          >
            <Link href="/projects" className="px-btn">
              see what i built! <span aria-hidden>→</span>
            </Link>
            <Link href="/resume" className="px-btn px-btn-secondary hero-resume-btn">
              resume <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Hero() {
  const phase = useSyncExternalStore(subscribeToSkyPhase, getSkyPhase, () => "night" as const);
  return phase === "twilight" ? <SunriseHero /> : <DefaultHero />;
}
