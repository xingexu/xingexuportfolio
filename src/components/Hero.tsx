"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SITE } from "@/app/data";

const NAME = "xinge xu";

/**
 * Hero. Minimal by design: name, one role line, one context line, links.
 *
 * SSR-safe: `typed` initializes to the full name so crawlers and no-JS
 * visitors always get "xinge xu" in the <h1>. The typing animation re-runs
 * client-side as progressive enhancement, stepped like a terminal.
 */
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

export default function Hero() {
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
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    setTyped("");
    setTyping(true);
    let i = 0;
    timer.current = setInterval(() => {
      i++;
      setTyped(NAME.slice(0, i));
      if (i >= NAME.length) {
        clearInterval(timer.current!);
        setTyping(false);
      }
    }, 110);

    return () => {
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
        padding: "96px 28px 96px",
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
              {particles.map((p) => (
                <span
                  key={p.id}
                  className="name-particle"
                  style={
                    {
                      "--name-drift": p.drift,
                      "--name-drop": p.drop,
                      "--name-spin": p.spin,
                      animationDelay: p.delay,
                      animationDuration: p.duration,
                      background: p.color,
                      height: p.size,
                      left: p.left,
                      top: p.top,
                      width: p.size,
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
