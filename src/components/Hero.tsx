"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { SITE } from "@/app/data";

const NAME = "xinge xu";
const BANNER_LOOP = "/xinge-plane-banner-continuous-wind.png";
const BANNER_STATIC = "/xinge-plane-banner-static.png";
const BANNER_ENTRANCE_DURATION_MS = 6000;

type SkyPhase = "day" | "twilight" | "night";
type BannerStage = "entrance" | "loop" | "static";

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

/** Plays the one-shot plane entrance, then hands off to the seamless wind loop. */
function PlaneBanner() {
  const [stage, setStage] = useState<BannerStage>("entrance");
  const [windLoaded, setWindLoaded] = useState(false);
  const entranceFinished = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setStage("static"));
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  const handleWindLoad = () => {
    if (stage !== "entrance" || windLoaded) return;
    setWindLoaded(true);
    if (entranceFinished.current) setStage("loop");
  };

  const handleEntranceEnd = () => {
    if (stage !== "entrance") return;

    entranceFinished.current = true;
    if (windLoaded) setStage("loop");
  };

  const src = stage === "static" ? BANNER_STATIC : BANNER_LOOP;

  return (
    <div
      className={`hero-plane-banner${stage === "entrance" ? " hero-plane-banner-entrance-playing" : ""}`}
      aria-hidden="true"
      onAnimationEnd={handleEntranceEnd}
      style={stage === "entrance" ? { animationDuration: `${BANNER_ENTRANCE_DURATION_MS}ms` } : undefined}
    >
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
