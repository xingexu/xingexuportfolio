"use client";

import { useState, type CSSProperties } from "react";
import { LINKS } from "@/app/data";
import AboutField from "./AboutField";
import AboutName from "./AboutName";
import AboutSprite, { type AboutSpriteKind } from "./AboutSprites";
import { TransitionLink } from "./PageTransitions";

const OBJECTS: { id: string; kind: AboutSpriteKind; href: string; label: string; delay: string }[] = [
  { id: "knight", kind: "knight", href: LINKS.lichess, label: "Play zinger6767 on Lichess", delay: "0s" },
  { id: "ball", kind: "volleyball", href: LINKS.volleyball, label: "Mikasa volleyball — follow ziggyvb on Instagram", delay: "-2s" },
];

export default function About() {
  const [paused, setPaused] = useState(false);

  return (
    <section className="about-page" aria-label="About Xinge" data-paused={paused}>
      <AboutField paused={paused} />
      <AboutName />
      <div className="about-bio">
        <section className="about-bio-intro" aria-labelledby="about-intro-heading">
          <h2 id="about-intro-heading">hey, I’m Xinge.</h2>
          <p>I’m an <strong>18-year-old CS + Ivey student</strong> at Western. I love coding and building projects.</p>
        </section>
        <section className="about-bio-interests" aria-labelledby="about-interests-heading">
          <h2 id="about-interests-heading">off the keyboard</h2>
          <p>You’ll find me playing <strong>chess or volleyball</strong>, trying new food spots, or doing cool stuff just for the fun of it.</p>
        </section>
      </div>
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
          </a>
        ))}
      </div>
      <div className="about-bottom">
        <TransitionLink href="/" className="about-exit" aria-label="Return to home">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
            <path d="M10 2h6v14h-6v-2h4V4h-4zM6 4h2v2H6v2h6v2H6v2h2v2H6v-2H4v-2H2V8h2V6h2z" />
          </svg>
        </TransitionLink>
        <button
          type="button"
          className="about-motion-toggle"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? "Resume room animation" : "Pause room animation"}
          aria-pressed={paused}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
            {paused ? <path d="M3 2h2v2h3v2h3v1h2v2h-2v1H8v2H5v2H3z" /> : <><rect x="3" y="2" width="3" height="12" /><rect x="10" y="2" width="3" height="12" /></>}
          </svg>
        </button>
      </div>
    </section>
  );
}
