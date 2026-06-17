"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LINKS, SITE } from "@/app/data";

const NAME = "Xinge Xu";

/**
 * Hero section.
 *
 * SSR-safe: `typed` initializes to the full name, so the server-rendered HTML
 * (and the no-JS / crawler view) always contains "Xinge Xu" in the <h1>. On the
 * client we re-run the typing animation as progressive enhancement. The rest of
 * the content is always present in the DOM — no JS-gated visibility — so it is
 * fully indexable.
 */
export default function Hero() {
  const [typed, setTyped] = useState(NAME);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // leave the full name in place

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
    }, 140);

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
        padding: "96px 32px 120px",
      }}
    >
      <div className="hero-layout" style={{ width: "100%", maxWidth: 1100 }}>
        <div className="hero-copy">
          <h1
            className="name-glow"
            style={{
              fontSize: "clamp(68px, 12vw, 148px)",
              fontWeight: 700,
              lineHeight: 0.88,
              letterSpacing: "-0.055em",
              color: "var(--text)",
            }}
          >
            <span>{typed}</span>
            {typing && (
              <span
                className="type-cursor"
                aria-hidden
                style={{
                  display: "inline-block",
                  width: "0.045em",
                  height: "0.82em",
                  background: "var(--blue-btn)",
                  marginLeft: "0.04em",
                  verticalAlign: "-0.05em",
                  borderRadius: 2,
                }}
              />
            )}
          </h1>

          <p
            style={{
              fontSize: "clamp(18px, 2.5vw, 26px)",
              fontWeight: 400,
              color: "var(--text-2)",
              letterSpacing: "-0.022em",
              marginTop: 28,
              maxWidth: 640,
            }}
          >
            {SITE.role}
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14, marginTop: 40 }}>
            <span className="pill" style={{ animationDelay: "280ms" }}>
              <span className="dot" />
              Current Grade 12 Bayview Secondary IB Student
            </span>
            <span className="pill" style={{ animationDelay: "420ms" }}>
              <span className="dot" />
              Incoming Western CS + Ivey AEO Student
            </span>
          </div>

          <div style={{ width: 48, height: 3, borderRadius: 999, background: "var(--blue-btn)", marginTop: 48, opacity: 0.85 }} />

          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "14px 44px", marginTop: 36 }}>
            <Link href="/projects" className="hero-cta">
              View projects
              <span className="hero-cta-arrow" aria-hidden>
                ↗
              </span>
            </Link>

            <div style={{ display: "flex", gap: 28 }}>
              {[
                { label: "GitHub", href: LINKS.github },
                { label: "LinkedIn", href: LINKS.linkedin },
                { label: "Email", href: LINKS.email },
              ].map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target={l.href.startsWith("http") ? "_blank" : undefined}
                  rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="link-grow"
                  style={{ fontSize: 14, color: "var(--text-2)", letterSpacing: "-0.01em" }}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          className="hero-photo"
          style={{
            animation: "photoIn 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s both, photoFloat 6s ease-in-out 1.1s infinite",
            width: "clamp(240px, 34vw, 360px)",
            aspectRatio: "1",
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            border: "4px solid rgba(147, 197, 253, 0.55)",
            boxShadow: "0 0 0 10px rgba(147,197,253,0.12), 0 16px 60px rgba(147,197,253,0.32), 0 4px 20px rgba(0,0,0,0.07)",
          }}
        >
          <Image
            src="/photo.png"
            alt="Portrait of Xinge Xu"
            width={600}
            height={600}
            priority
            sizes="360px"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              display: "block",
            }}
          />
        </div>
      </div>
    </section>
  );
}
