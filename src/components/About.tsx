"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LIFE_STORIES, type LifeStory } from "@/lib/life-stories";
import { type Direction } from "@/lib/life-world";
import LifeWorld, { type WorldControls } from "./LifeWorld";
import { TransitionLink } from "./PageTransitions";

const DIRECTIONS: { direction: Direction; symbol: string }[] = [
  { direction: "up", symbol: "↑" }, { direction: "left", symbol: "←" },
  { direction: "down", symbol: "↓" }, { direction: "right", symbol: "→" },
];

export default function About() {
  const [nearby, setNearby] = useState<string | null>("hello");
  const [place, setPlace] = useState("hello");
  const [opened, setOpened] = useState<string | "map" | null>(null);
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [paused, setPaused] = useState(false);
  const [moved, setMoved] = useState(false);
  const controls = useRef<WorldControls | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const current = LIFE_STORIES.find((story) => story.id === place) ?? LIFE_STORIES[0];
  const near = LIFE_STORIES.find((story) => story.id === nearby);
  const story = LIFE_STORIES.find((item) => item.id === opened);

  const readStory = useCallback((id: string) => {
    setOpened(id);
    setVisited((previous) => previous.has(id) ? previous : new Set([...previous, id]));
  }, []);
  const openMap = useCallback(() => setOpened("map"), []);
  const updateLocation = useCallback((id: string, nearId: string | null) => { setPlace(id); setNearby(nearId); }, []);
  const didMove = useCallback(() => setMoved(true), []);
  const close = () => { setOpened(null); controls.current?.focus(); };

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (opened) {
      if (!element.open) element.showModal();
      closeButton.current?.focus();
    } else if (element.open) {
      element.close();
      controls.current?.focus();
    }
  }, [opened]);

  const directionButton = ({ direction, symbol }: typeof DIRECTIONS[number]) => (
    <button key={direction} type="button" className={`world-direction world-direction-${direction}`} aria-label={`Walk ${direction}`}
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); controls.current?.input(direction, true); }}
      onPointerUp={() => controls.current?.input(direction, false)}
      onPointerCancel={() => controls.current?.input(direction, false)}
      onLostPointerCapture={() => controls.current?.input(direction, false)}
      onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); controls.current?.input(direction, true); } }}
      onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") controls.current?.input(direction, false); }}
      onBlur={() => controls.current?.input(direction, false)}>{symbol}</button>
  );

  return (
    <section className="about-page world-page" aria-label="Xinge’s playable world">
      <h1 className="sr-only">ZINGER — a walk through my world</h1>
      <LifeWorld controls={controls} blocked={opened !== null} paused={paused} visited={visited}
        onLocation={updateLocation} onInteract={readStory} onMap={openMap} onMove={didMove} />
      <div className="world-topline">
        <TransitionLink href="/" className="world-exit" aria-label="Return to home">↖</TransitionLink>
        <div className="world-title"><span>ZINGER</span><p>a walk through my world</p></div>
        <button type="button" className="world-index" onClick={openMap} aria-label={`Open map and stories, ${visited.size} of ${LIFE_STORIES.length} discovered`}>
          <span>{String(visited.size).padStart(2, "0")} <i>/ {String(LIFE_STORIES.length).padStart(2, "0")}</i></span><small>discovered</small>
        </button>
      </div>
      <div className="world-location" aria-live="polite" aria-atomic="true">
        <span>{current.number} <i>—</i></span><h2>{current.place}</h2>
      </div>
      {!moved && <div className="world-welcome"><p>Hey, I’m Xinge.<br /><em>Welcome to my world.</em></p><span>Walk up to a diamond. There’s a story there.</span></div>}
      <div className="world-interact" aria-live="polite">
        {near ? <button type="button" onClick={() => readStory(near.id)}><kbd>E</kbd><span>{near.title}</span><span aria-hidden="true">↗</span></button> : <span className="world-walk-hint">Follow the lit bridges.</span>}
      </div>
      <div className="world-bottomline">
        <div className="world-controls">
          <p id="world-instructions" className="world-keyboard-help"><span className="world-keys"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span><span>move<br /><small>or arrow keys</small></span><span className="world-key-action"><kbd>E</kbd> explore <kbd>M</kbd> map</span></p>
          <div className="world-touch" aria-label="Movement controls">{DIRECTIONS.map(directionButton)}</div>
          <button type="button" className="world-pause" aria-label={paused ? "Resume ambient animation" : "Pause ambient animation"} aria-pressed={paused} onClick={() => { setPaused((p) => !p); controls.current?.focus(); }}>{paused ? "▷" : "Ⅱ"}</button>
        </div>
        <button type="button" className="world-map-toggle" onClick={openMap} aria-label="Open map and stories">
          <svg viewBox="0 0 1120 760" aria-hidden="true" className="world-minimap">
            <path d="M180 570H940V230H180Z" fill="none" stroke="#666" strokeWidth="10" />
            {LIFE_STORIES.map((item) => <rect key={item.id} x={item.x - 95} y={item.y - 90} width="190" height="155" fill={item.id === place ? "#777" : "#272727"} stroke={visited.has(item.id) ? "#ddd" : "#666"} strokeWidth="8" />)}
            <rect id="world-map-player" x="165" y="588" width="30" height="30" fill="#fafafa" />
          </svg>
          <span>Map & stories <span aria-hidden="true">↗</span></span>
        </button>
      </div>
      <dialog ref={dialog} className="world-dialog" aria-labelledby="world-dialog-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } }}>
        <button ref={closeButton} type="button" className="world-dialog-close" onClick={close} aria-label="Back to walking">×</button>
        {opened === "map" ? <>
          <p className="world-eyebrow">An open world. My little corner of it.</p><h2 id="world-dialog-title">Take a look around.</h2>
          <p className="world-dialog-intro">Walk between places, or open a story here.</p>
          <div className="world-story-list">{LIFE_STORIES.map((item) => <button type="button" key={item.id} onClick={() => readStory(item.id)}><span>{item.number}</span><span><strong>{item.place}</strong><small>{item.title}</small></span><span aria-label={visited.has(item.id) ? "Discovered" : "Unread"}>{visited.has(item.id) ? "◆" : "◇"}</span></button>)}</div>
        </> : story ? <StoryContent story={story} /> : <h2 id="world-dialog-title" className="sr-only">Stories</h2>}
      </dialog>
      <noscript><div className="world-nojs"><h2>Hey, I’m Xinge.</h2><p>I’m an 18-year-old CS + Ivey student at Western. I love coding, projects, chess, volleyball, and finding new food spots. Enable JavaScript to walk through my pixel world.</p><a href="/projects">Explore my projects</a></div></noscript>
    </section>
  );
}

function StoryContent({ story }: { story: LifeStory }) {
  return <>
    <p className="world-eyebrow">{story.number} / {story.place}</p>
    <h2 id="world-dialog-title">{story.title}</h2>
    <p className="world-story-copy">{story.description}</p>
    {story.photos.length > 0 && <div className="world-memory-photos">{story.photos.map((photo) => <figure key={photo.src}><Image src={photo.src} alt={photo.alt} width={900} height={600} sizes="(max-width: 640px) 85vw, 540px" /><figcaption>{photo.caption}</figcaption></figure>)}</div>}
    {story.link && (story.link.href.startsWith("/") ? <TransitionLink href={story.link.href} className="world-story-link">{story.link.label}<span aria-hidden="true">↗</span></TransitionLink> : <a href={story.link.href} target="_blank" rel="noopener noreferrer" className="world-story-link">{story.link.label}<span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>)}
    <p className="world-story-end">A little piece of my world.</p>
  </>;
}
