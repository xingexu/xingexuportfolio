"use client";

import { useState, type CSSProperties } from "react";
import { LINKS } from "@/app/data";
import AboutField from "./AboutField";
import AboutName from "./AboutName";
import AboutSprite, { type AboutSpriteKind } from "./AboutSprites";

const OBJECTS: { id: string; kind: AboutSpriteKind; href: string; label: string; delay: string }[] = [
  { id: "knight", kind: "knight", href: LINKS.lichess, label: "Play zinger6767 on Lichess", delay: "0s" },
  { id: "ball", kind: "volleyball", href: LINKS.volleyball, label: "Follow ziggyvb on Instagram", delay: "-2s" },
  { id: "laptop", kind: "laptop", href: LINKS.github, label: "See xingexu on GitHub", delay: "-4s" },
  { id: "rook", kind: "rook", href: LINKS.lichess, label: "View zinger6767 on Lichess", delay: "-3s" },
  { id: "ball-small", kind: "volleyball", href: LINKS.volleyball, label: "See ziggyvb volleyball on Instagram", delay: "-6s" },
  { id: "pawn", kind: "pawn", href: LINKS.lichess, label: "Challenge zinger6767 on Lichess", delay: "-5s" },
];

export default function About() {
  const [paused, setPaused] = useState(false);

  return (
    <section className="about-page" aria-label="Xinge's pixel room with illustrative stock charts" data-paused={paused}>
      <AboutField paused={paused} />
      <AboutName />
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
