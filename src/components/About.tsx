"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { LINKS } from "@/app/data";
import { TransitionLink } from "./PageTransitions";
import AboutField from "./AboutField";
import AboutSprite, { type AboutSpriteKind } from "./AboutSprites";

const OBJECTS: { id: string; kind: AboutSpriteKind; href: string; label: string; caption: string; delay: string }[] = [
  { id: "knight", kind: "knight", href: LINKS.lichess, label: "Play zinger6767 on Lichess", caption: "your move ↗", delay: "0s" },
  { id: "ball", kind: "volleyball", href: LINKS.volleyball, label: "Follow ziggyvb on Instagram", caption: "off the keyboard ↗", delay: "-2s" },
  { id: "laptop", kind: "laptop", href: LINKS.github, label: "See xingexu on GitHub", caption: "in the works ↗", delay: "-4s" },
  { id: "rook", kind: "rook", href: LINKS.lichess, label: "View zinger6767 on Lichess", caption: "zinger6767 ↗", delay: "-3s" },
  { id: "ball-small", kind: "volleyball", href: LINKS.volleyball, label: "See ziggyvb volleyball on Instagram", caption: "@ziggyvb ↗", delay: "-6s" },
  { id: "pawn", kind: "pawn", href: LINKS.lichess, label: "Challenge zinger6767 on Lichess", caption: "play a game ↗", delay: "-5s" },
];

/** Reserve the final layout while typing; completed text never depends on animation fill. */
function TypedText({ text, start = 0, speed = 35 }: { text: string; start?: number; speed?: number }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const started = performance.now();
    let timer = 0;
    function advance() {
      const count = reducedMotion.matches ? text.length : Math.max(0, Math.min(text.length, Math.floor((performance.now() - started - start) / speed)));
      setVisible(count);
      if (count < text.length) timer = window.setTimeout(advance, Math.max(16, speed));
    }
    function finishForReducedMotion() {
      if (!reducedMotion.matches) return;
      window.clearTimeout(timer);
      setVisible(text.length);
    }
    timer = window.setTimeout(advance, reducedMotion.matches ? 0 : start);
    reducedMotion.addEventListener("change", finishForReducedMotion);
    return () => {
      window.clearTimeout(timer);
      reducedMotion.removeEventListener("change", finishForReducedMotion);
    };
  }, [text, start, speed]);

  return (
    <span className="about-typed-text">
      <span className="sr-only">{text}</span>
      <span className="about-text-reserve" aria-hidden="true">{text}</span>
      <span className="about-text-output" aria-hidden="true">{text.slice(0, visible)}</span>
    </span>
  );
}

export default function About() {
  const [paused, setPaused] = useState(false);

  return (
    <section className="about-page" aria-labelledby="about-heading" data-paused={paused}>
      <AboutField paused={paused} />
      <div className="about-crosshair about-crosshair-one" aria-hidden="true">+</div>
      <div className="about-crosshair about-crosshair-two" aria-hidden="true">+</div>

      <div className="about-objects" aria-label="My interests and profiles">
        {OBJECTS.map((object) => (
          <a
            key={object.id}
            className={`about-object about-object-${object.id}`}
            style={{ "--float-delay": object.delay } as CSSProperties}
            href={object.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${object.label} (opens in a new tab)`}
          >
            <span className="about-object-art">
              <span className="about-object-motion"><AboutSprite kind={object.kind} /></span>
            </span>
            <span className="about-object-caption" aria-hidden="true">{object.caption}</span>
          </a>
        ))}
      </div>

      <div className="about-copy">
        <p className="about-eyebrow"><span aria-hidden="true">~/</span> a little about me</p>
        <h1 id="about-heading">
          <span className="sr-only">hi, i&apos;m xinge.</span>
          <span className="about-heading-reserve" aria-hidden="true">hi, i&apos;m xinge.</span>
          <span className="about-heading-typed" aria-hidden="true">hi, i&apos;m xinge.</span>
        </h1>
        <p className="about-alias"><TypedText text="you can call me zinger." start={1600} speed={35} /></p>
        <div className="about-bio">
          <p><TypedText text="Computer science at Western. I like making things, figuring things out, and getting a little too competitive." start={2450} speed={18} /></p>
          <p><TypedText text="Usually at my laptop, across a chessboard, or on a volleyball court." start={4650} speed={22} /></p>
        </div>
        <div className="about-text-links">
          <TransitionLink href="/projects">things i&apos;ve built <span aria-hidden="true">↗</span></TransitionLink>
          <a href={LINKS.email} target="_blank" rel="noopener noreferrer">say hello <span aria-hidden="true">↗</span></a>
        </div>
      </div>

      <div className="about-bottom">
        <span className="about-explore">little pieces of me. <span>click around.</span></span>
        <button type="button" className="about-motion-toggle" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
          <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span> {paused ? "resume motion" : "pause motion"}
        </button>
      </div>
    </section>
  );
}
