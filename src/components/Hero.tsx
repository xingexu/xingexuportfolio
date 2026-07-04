"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SITE } from "@/app/data";

const NAME = "xinge xu";

/**
 * Hero. Minimal by design: name, one role line, one context line, links.
 *
 * SSR-safe: `typed` initializes to the full name so crawlers and no-JS
 * visitors always get "xinge xu" in the <h1>. The typing animation re-runs
 * client-side as progressive enhancement, stepped like a terminal.
 */
type Particle = { id: number; left: string; top: string; color: string; delay: string };

const PARTICLE_COLORS = ["var(--accent)", "#9fc4f0", "#ffffff", "var(--accent)"];

export default function Hero() {
  const [typed, setTyped] = useState(NAME);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const pid = useRef(0);

  const burst = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next: Particle[] = Array.from({ length: 16 }, () => ({
      id: pid.current++,
      left: `${Math.random() * 100}%`,
      top: `${20 + Math.random() * 70}%`,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      delay: `${Math.random() * 0.25}s`,
    }));
    setParticles((p) => [...p.slice(-32), ...next]);
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
            className="font-pixel name-hover"
            onMouseEnter={burst}
            style={{
              fontSize: "clamp(40px, 8vw, 88px)",
              fontWeight: 700,
              lineHeight: 1.05,
              color: "var(--text)",
              position: "relative",
            }}
          >
            <span>{typed}</span>
            <span className="type-cursor" aria-hidden style={{ visibility: typing ? "visible" : "hidden" }} />
            <span aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
              {particles.map((p) => (
                <span
                  key={p.id}
                  className="name-particle"
                  style={{ left: p.left, top: p.top, background: p.color, animationDelay: p.delay }}
                  onAnimationEnd={() => setParticles((ps) => ps.filter((q) => q.id !== p.id))}
                />
              ))}
            </span>
          </h1>

          <p className="step-in-2" style={{ fontSize: 15, color: "var(--text-2)", marginTop: 20 }}>
            {SITE.role.toLowerCase()}
          </p>

          <p className="step-in-2" style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>
            western cs + ivey aeo &apos;30
          </p>

          <div
            className="step-in-3"
            style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "16px 28px", marginTop: 40 }}
          >
            <Link href="/projects" className="px-btn">
              see what i built! <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="hero-photo step-in">
          <Image
              src="/photo.png"
              alt="Portrait of Xinge Xu"
              width={600}
              height={600}
              priority
              sizes="(max-width: 900px) 208px, 288px"
              className="pixel-photo"
              style={{
                width: "clamp(208px, 26vw, 288px)",
                height: "clamp(208px, 26vw, 288px)",
                objectFit: "cover",
                objectPosition: "center top",
              }}
          />
        </div>
      </div>
    </section>
  );
}
