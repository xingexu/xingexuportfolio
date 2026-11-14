"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LIFE_STORIES, type LifeChapter, type LifeStory } from "@/lib/life-stories";
import { AIRPORT_PLACES, START, type Direction } from "@/lib/life-world";
import { emptyAirportProgress, getAirportGuide, type AirportGuide } from "@/lib/airport-guide";
import { HOME_START } from "@/lib/home-world";
import { chessPieceAt, chessPiecePath } from "@/lib/pixel-chess";
import LifeWorld, { type WorldControls } from "./LifeWorld";
import { TransitionLink } from "./PageTransitions";

const DIRECTIONS: { direction: Direction; symbol: string }[] = [
  { direction: "up", symbol: "↑" }, { direction: "left", symbol: "←" },
  { direction: "down", symbol: "↓" }, { direction: "right", symbol: "→" },
];

export default function About() {
  const [nearby, setNearby] = useState<string | null>(null);
  const [place, setPlace] = useState("apron");
  const [opened, setOpened] = useState<string | "map" | null>(null);
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [paused, setPaused] = useState(false);
  const [moved, setMoved] = useState(false);
  const [chapter, setChapter] = useState<LifeChapter>("airport");
  const [travelling, setTravelling] = useState<LifeChapter | null>(null);
  const [guide, setGuide] = useState<AirportGuide>(() => getAirportGuide(START, emptyAirportProgress(), false));
  const controls = useRef<WorldControls | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const atHome = chapter === "holsworthy", chapterNumber = atHome ? "02" : "01";
  const homeNames: Record<string, string> = { "home-garden": "18 Holsworthy", "home-door": "My first home", "home-living": "The living room", "home-chess": "Where I learned chess" };
  const locationName = atHome ? homeNames[place] ?? "18 Holsworthy" : (AIRPORT_PLACES.find((area) => area.id === place) ?? AIRPORT_PLACES[0]).name;
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
    <section className="about-page world-page" aria-label="Xinge’s playable world" data-chapter={chapter} data-travelling={!!travelling}>
      <h1 className="sr-only">ZINGER — a walk through my world</h1>
      <LifeWorld controls={controls} blocked={opened !== null} paused={paused} visited={visited}
        onLocation={updateLocation} onInteract={readStory} onMap={openMap} onMove={didMove} onGuide={setGuide} onChapter={setChapter} onTransition={setTravelling} />
      <div className="world-topline">
        <TransitionLink href="/" className="world-exit" aria-label="Return to home">↖</TransitionLink>
        <div className="world-title"><span>ZINGER</span><p>age 6 · {atHome ? "Markham, Ontario" : "Canada"}</p></div>
        <button type="button" className="world-index" onClick={openMap} aria-label={atHome ? "Chapter two — open home map" : "Chapter one — open airport map"}>
          <span>{chapterNumber}</span><small>{atHome ? "FIRST HOME" : "ARRIVAL"}</small>
        </button>
      </div>
      <div className="world-location" aria-live="polite" aria-atomic="true">
        <span>{chapterNumber} <i>—</i></span><h2>{locationName}</h2>
      </div>
      {!moved && <div className="world-welcome"><p><em>Welcome to Canada.</em></p></div>}
      <div className="world-interact">
        <div className="world-guide" id="world-next-step" role="status" aria-live="polite" aria-atomic="true">
          <span className="world-guide-arrow" aria-hidden="true">{guide.arrow}</span>
          <div><small>{guide.id.endsWith("complete") ? "MEMORY FOUND" : `NEXT · ${guide.step} / ${guide.total ?? 5}`}</small><strong>{guide.title}</strong>
            <p className="world-guide-desktop">{guide.hint}</p><p className="world-guide-touch">{guide.touchHint}</p></div>
        </div>
        {near && <button type="button" className="world-read-memory" onClick={() => readStory(near.id)}><kbd>E</kbd><span>{near.id === "first-home" ? "Look at chessboard" : visited.has(near.id) ? "Revisit memory" : "Read memory"}</span><span aria-hidden="true">↗</span></button>}
        {guide.id.endsWith("complete") && !near && <TransitionLink href="/" className="world-guide-home">Return to portfolio <span aria-hidden="true">↖</span></TransitionLink>}
      </div>
      <div className="world-bottomline">
        <div className="world-controls">
          <p id="world-instructions" className="world-keyboard-help"><span className="world-keys"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span><span>move<br /><small>or arrow keys</small></span><span className="world-key-action"><kbd>E</kbd> explore <kbd>M</kbd> map</span></p>
          <div className="world-touch" aria-label="Movement controls">{DIRECTIONS.map(directionButton)}</div>
          <button type="button" className="world-pause" aria-label={paused ? "Resume ambient animation" : "Pause ambient animation"} aria-pressed={paused} onClick={() => { setPaused((p) => !p); controls.current?.focus(); }}>{paused ? "▷" : "Ⅱ"}</button>
        </div>
        <button type="button" className="world-map-toggle" onClick={openMap} aria-label={atHome ? "Open home map" : "Open airport map"}>
          {atHome ? <HomeMap live guide={guide} /> : <AirportMap live guide={guide} />}
          <span>{atHome ? "Home map" : "Airport map"} <span aria-hidden="true">↗</span></span>
        </button>
      </div>
      <dialog ref={dialog} className="world-dialog" aria-labelledby="world-dialog-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } }}>
        <button ref={closeButton} type="button" className="world-dialog-close" onClick={close} aria-label="Back to walking">×</button>
        {opened === "map" ? <>
          <p className="world-eyebrow">Chapter {chapterNumber} · Age six · {atHome ? "Markham, Ontario" : "Canada"}</p><h2 id="world-dialog-title">{atHome ? "18 Holsworthy." : "A whole new place."}</h2>
          {atHome ? <HomeMap guide={guide} /> : <AirportMap guide={guide} />}
          <p className="world-map-legend"><span>■ You are here</span><span>□ Next stop</span></p>
          <p className="world-map-next"><strong>{guide.title}</strong> {guide.hint}</p>
          <p className="world-dialog-intro">{atHome ? "Walk through the front door and find the chess table on the right. Walk down the garden path to revisit the airport." : "Follow the yellow path into arrivals. Baggage claim is on the left; the meeting point and exit are on the right. Walk through the exit to visit my first home."}</p>
          <div className="world-story-list">{LIFE_STORIES.filter(item => (item.chapter ?? "airport") === chapter).map((item) => <button type="button" key={item.id} onClick={() => readStory(item.id)}><span>{item.number}</span><span><strong>{item.place}</strong><small>{item.title}</small></span><span aria-label={visited.has(item.id) ? "Discovered" : "Unread"}>{visited.has(item.id) ? "◆" : "◇"}</span></button>)}</div>
        </> : story ? <StoryContent story={story} /> : <h2 id="world-dialog-title" className="sr-only">Stories</h2>}
        {story && <p className="world-memory-next">{guide.id.endsWith("complete") ? "Keep exploring, or return to the airport through the garden gate." : `Next: ${guide.title}`}</p>}
        {opened && <button type="button" className="world-continue" onClick={close}>Keep walking <span aria-hidden="true">→</span></button>}
      </dialog>
      {travelling && <div className="world-chapter-transition" key={travelling} role="status"><small>CHAPTER {travelling === "holsworthy" ? "02" : "01"}</small><strong>{travelling === "holsworthy" ? "18 HOLSWORTHY" : "ARRIVING IN CANADA"}</strong><span>{travelling === "holsworthy" ? "Markham, Ontario · My first home" : "Back where the walk began"}</span></div>}
      <noscript><div className="world-nojs"><h2>Six years old. A new country.</h2><p>I came to Canada when I was six. Enable JavaScript to walk off the plane and explore the airport in this first chapter of my life.</p><TransitionLink href="/">Return home</TransitionLink></div></noscript>
    </section>
  );
}

function HomeMap({ live = false, guide }: { live?: boolean; guide: AirportGuide }) {
  return <svg viewBox="0 0 1000 720" aria-hidden="true" className={live ? "world-minimap" : "world-airport-plan"}>
    <rect width="1000" height="720" fill="#7d906a" /><rect x="130" y="120" width="740" height="430" fill="#bb9568" stroke="#8c664c" strokeWidth="20" />
    <rect x="475" y="522" width="50" height="140" fill="#d9c5a0" /><rect x="197" y="231" width="224" height="222" fill="#ac7659" />
    <rect x="230" y="244" width="160" height="62" fill="#75876b" /><rect x="260" y="350" width="100" height="50" fill="#7b5d45" />
    <rect x="552" y="260" width="120" height="108" fill="#546e60" />
    {Array.from({length:64},(_,i)=><rect key={i} x={564+i%8*12} y={265+Math.floor(i/8)*12} width="12" height="12" fill={(i%8+Math.floor(i/8))%2 ? "#687b65" : "#e5d5ad"} />)}
    {guide.target && <rect x={guide.target.x-25} y={guide.target.y-25} width="50" height="50" fill="none" stroke="#f7d06b" strokeWidth="12" />}
    <rect data-world-map-player="" x={HOME_START.x-15} y={HOME_START.y-15} width="30" height="30" fill="#d8794d" stroke="#233e51" strokeWidth="7" />
    {!live && <><text x="300" y="487" textAnchor="middle">LIVING ROOM</text><text x="630" y="460" textAnchor="middle">CHESS</text><text x="500" y="699" textAnchor="middle">BACK TO AIRPORT</text></>}
  </svg>;
}

function MemoryChessboard() {
  return <figure className="world-chess-memory"><svg viewBox="0 0 96 96" role="img" aria-label="Chessboard with all 32 pieces in the starting position" shapeRendering="crispEdges">
    {Array.from({length:64},(_,i)=>{
      const row=Math.floor(i/8),col=i%8,piece=chessPieceAt(row,col);
      return <g key={i}><rect x={col*12} y={row*12} width="12" height="12" fill={(row+col)%2 ? "#687b65" : "#e5d5ad"} />{piece && <g transform={`translate(${col*12+2} ${row*12+1})`}>
        {[[-1,0],[1,0],[0,-1],[0,1]].map(([x,y])=><path key={`${x},${y}`} transform={`translate(${x} ${y})`} d={chessPiecePath(piece.piece)} fill={piece.white?"#86765a":"#b8b396"} />)}
        <path d={chessPiecePath(piece.piece)} fill={piece.white?"#fff2cf":"#25333b"} />
      </g>}</g>;
    })}
  </svg><figcaption>Where I learned to play.</figcaption></figure>;
}

function AirportMap({ live = false, guide }: { live?: boolean; guide: AirportGuide }) {
  return <svg viewBox="0 0 1280 800" aria-hidden="true" className={live ? "world-minimap" : "world-airport-plan"}>
    <rect width="1280" height="800" fill="#6d8995" />
    <rect x="50" y="65" width="1180" height="320" fill="#d6dccb" stroke="#365b70" strokeWidth="14" />
    <rect x="605" y="355" width="90" height="40" fill="#d6dccb" />
    <rect x="175" y="145" width="320" height="95" rx="20" fill="#66838a" />
    <path d="M700 140h155m-155 65h155m195-10h105" stroke="#487b8e" strokeWidth="25" />
    <path d="M365 628H650V390" fill="none" stroke="#f4d47e" strokeWidth="14" />
    <path d="M89 505L114 488H372L426 514L396 535H119Z M214 495L176 424H205L289 496 M230 524L166 593L202 601L296 528" fill="#ecedda" />
    <rect x="311" y="536" width="38" height="65" fill="#ccd4ca" />
    {guide.target && <rect x={guide.target.x - 25} y={guide.target.y - 25} width="50" height="50" fill="none" stroke="#f7d06b" strokeWidth="12" />}
    <rect data-world-map-player="" x={START.x - 15} y={START.y - 15} width="30" height="30" fill="#d8794d" stroke="#233e51" strokeWidth="7" />
    {!live && <>
      <text x="335" y="290" textAnchor="middle">BAGGAGE</text><text x="960" y="300" textAnchor="middle">ARRIVALS</text><text x="290" y="675" textAnchor="middle">YOUR PLANE</text>
    </>}
  </svg>;
}

function StoryContent({ story }: { story: LifeStory }) {
  return <>
    <p className="world-eyebrow">{story.number} / {story.place}</p>
    <h2 id="world-dialog-title">{story.title}</h2>
    <p className="world-story-copy">{story.description}</p>
    {story.id === "first-home" && <MemoryChessboard />}
    {story.photos.length > 0 && <div className="world-memory-photos">{story.photos.map((photo) => <figure key={photo.src}><Image src={photo.src} alt={photo.alt} width={900} height={600} sizes="(max-width: 640px) 85vw, 540px" /><figcaption>{photo.caption}</figcaption></figure>)}</div>}
    {story.link && (story.link.href.startsWith("/") ? <TransitionLink href={story.link.href} className="world-story-link">{story.link.label}<span aria-hidden="true">↗</span></TransitionLink> : <a href={story.link.href} target="_blank" rel="noopener noreferrer" className="world-story-link">{story.link.label}<span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>)}
    <p className="world-story-end">A little piece of my world.</p>
  </>;
}
