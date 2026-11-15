"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LIFE_STORIES, type LifeChapter, type LifeStory } from "@/lib/life-stories";
import { AIRPORT_PLACES, START, type Direction } from "@/lib/life-world";
import { emptyAirportProgress, getAirportGuide, type AirportGuide } from "@/lib/airport-guide";
import { HOME_START } from "@/lib/home-world";
import { ROOM_OBJECTS, roomObjectById } from "@/lib/room-objects";
import RoomObjectView from "./RoomObjectView";
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
  const viewedObjects = ROOM_OBJECTS.filter(object => visited.has(object.id)).length;
  const objectIndex = ROOM_OBJECTS.findIndex(object => object.id === opened);
  const controls = useRef<WorldControls | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const atHome = chapter === "holsworthy", chapterNumber = atHome ? "02" : "01";
  const homeNames: Record<string, string> = { "home-door": "My room · 18 Holsworthy", "home-lego": "LEGO sets & Star Wars", "home-computer": "One more game of agar.io", "home-chess": "Where I learned chess" };
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
      element.scrollTop = 0;
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
        <button type="button" className="world-index" onClick={openMap} aria-label={atHome ? "Chapter two — open room map" : "Chapter one — open airport map"}>
          <span>{chapterNumber}</span><small>{atHome ? "MY ROOM" : "ARRIVAL"}</small>
        </button>
      </div>
      <div className="world-location" aria-live="polite" aria-atomic="true">
        <span>{chapterNumber} <i>—</i></span><h2>{locationName}</h2>
      </div>
      {!moved && <div className="world-welcome"><p><em>Welcome to Canada.</em></p></div>}
      <div className="world-interact">
        <div className="world-guide" id="world-next-step" role="status" aria-live="polite" aria-atomic="true">
          <span className="world-guide-arrow" aria-hidden="true">{guide.arrow}</span>
          <div><small>{atHome ? `ROOM · ${viewedObjects} / ${ROOM_OBJECTS.length} VIEWED` : `NEXT · ${guide.step} / ${guide.total ?? 5}`}</small><strong>{guide.title}</strong>
            <p className="world-guide-desktop">{guide.hint}</p><p className="world-guide-touch">{guide.touchHint}</p></div>
        </div>
        {near && <button type="button" className="world-read-memory" onClick={() => readStory(near.id)}><kbd>E</kbd><span>{near.viewLabel ? `View ${near.viewLabel}` : visited.has(near.id) ? "Revisit memory" : "Read memory"}</span><span aria-hidden="true">↗</span></button>}
        {guide.id.endsWith("complete") && !near && <TransitionLink href="/" className="world-guide-home">Return to portfolio <span aria-hidden="true">↖</span></TransitionLink>}
      </div>
      <div className="world-bottomline">
        <div className="world-controls">
          <p id="world-instructions" className="world-keyboard-help"><span className="world-keys"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span><span>move<br /><small>or arrow keys</small></span><span className="world-key-action"><kbd>E</kbd> explore <kbd>M</kbd> map</span></p>
          <div className="world-touch" aria-label="Movement controls">{DIRECTIONS.map(directionButton)}</div>
          <button type="button" className="world-pause" aria-label={paused ? "Resume ambient animation" : "Pause ambient animation"} aria-pressed={paused} onClick={() => { setPaused((p) => !p); controls.current?.focus(); }}>{paused ? "▷" : "Ⅱ"}</button>
        </div>
        <button type="button" className="world-map-toggle" onClick={openMap} aria-label={atHome ? "Open room map" : "Open airport map"}>
          {atHome ? <HomeMap live guide={guide} /> : <AirportMap live guide={guide} />}
          <span>{atHome ? "Room map" : "Airport map"} <span aria-hidden="true">↗</span></span>
        </button>
      </div>
      <dialog ref={dialog} className="world-dialog" data-object={objectIndex >= 0} aria-labelledby="world-dialog-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } }}>
        <button ref={closeButton} type="button" className="world-dialog-close" onClick={close} aria-label="Back to walking">×</button>
        {opened === "map" ? <>
          <p className="world-eyebrow">Chapter {chapterNumber} · Age six · {atHome ? "Markham, Ontario" : "Canada"}</p><h2 id="world-dialog-title">{atHome ? "18 Holsworthy." : "A whole new place."}</h2>
          {atHome ? <HomeMap guide={guide} /> : <AirportMap guide={guide} />}
          <p className="world-map-legend"><span>■ You are here</span><span>□ Next stop</span></p>
          <p className="world-map-next"><strong>{guide.title}</strong> {guide.hint}</p>
          <p className="world-dialog-intro">{atHome ? "You’re inside my room at 18 Holsworthy. Click or tap any object for a closer look, or walk up and press E. You can also choose any of the 8 objects below. The doorway leads back to the airport." : "Walk down the plane stairs, follow the yellow path right, then head up to the nearby terminal doors. They take you straight into my childhood room — no airport detour."}</p>
          <div className={`world-story-list ${atHome ? "room-object-list" : ""}`}>{LIFE_STORIES.filter(item => (item.chapter ?? "airport") === chapter).map((item,index) => <button type="button" key={item.id} onClick={() => readStory(item.id)} aria-label={item.viewLabel ? `View ${item.viewLabel}` : undefined}><span>{atHome ? String(index+1).padStart(2,"0") : item.number}</span><span><strong>{item.viewLabel ?? item.place}</strong><small>{item.viewLabel ? (visited.has(item.id) ? "Viewed · view again" : "View object ↗") : item.title}</small></span><span aria-label={visited.has(item.id) ? "Viewed" : "Not viewed"}>{visited.has(item.id) ? "◆" : "◇"}</span></button>)}</div>
        </> : story ? <StoryContent story={story} paused={paused} /> : <h2 id="world-dialog-title" className="sr-only">Stories</h2>}
        {objectIndex >= 0 && <nav className="room-object-nav" aria-label="Room object browser">
          <button type="button" onClick={() => readStory(ROOM_OBJECTS[(objectIndex+ROOM_OBJECTS.length-1)%ROOM_OBJECTS.length].id)} aria-label={`View previous object: ${ROOM_OBJECTS[(objectIndex+ROOM_OBJECTS.length-1)%ROOM_OBJECTS.length].label}`}>← Previous</button>
          <span>{String(objectIndex+1).padStart(2,"0")} / {String(ROOM_OBJECTS.length).padStart(2,"0")}</span>
          <button type="button" onClick={() => readStory(ROOM_OBJECTS[(objectIndex+1)%ROOM_OBJECTS.length].id)} aria-label={`View next object: ${ROOM_OBJECTS[(objectIndex+1)%ROOM_OBJECTS.length].label}`}>Next →</button>
        </nav>}

        {story && !story.objectId && <p className="world-memory-next">{guide.id.endsWith("complete") ? "Keep exploring my room, or return to the airport through the doorway." : `Next: ${guide.title}`}</p>}
        {opened && <button type="button" className="world-continue" onClick={close}>Keep walking <span aria-hidden="true">→</span></button>}
      </dialog>
      {travelling && <div className="world-chapter-transition" key={travelling} role="status"><small>CHAPTER {travelling === "holsworthy" ? "02" : "01"}</small><strong>{travelling === "holsworthy" ? "18 HOLSWORTHY" : "ARRIVING IN CANADA"}</strong><span>{travelling === "holsworthy" ? "My room · Markham, Ontario" : "Back where the walk began"}</span></div>}
      <noscript><div className="world-nojs"><h2>Six years old. A new country.</h2><p>I came to Canada when I was six. Enable JavaScript to walk off the plane and explore the airport in this first chapter of my life.</p><TransitionLink href="/">Return home</TransitionLink></div></noscript>
    </section>
  );
}

function HomeMap({ live = false, guide }: { live?: boolean; guide: AirportGuide }) {
  return <svg viewBox="80 160 680 400" aria-hidden="true" className={live ? "world-minimap" : "world-airport-plan"}>
    <rect x="80" y="160" width="680" height="400" fill="#29383e" />
    <rect x="100" y="180" width="640" height="355" fill="#b78c62" stroke="#546e70" strokeWidth="10" />
    <rect x="108" y="180" width="624" height="120" fill="#7d9b9b" />
    <rect x="118" y="305" width="110" height="155" fill="#698e9b" /><rect x="124" y="315" width="98" height="29" fill="#ded3af" />
    <rect x="237" y="453" width="39" height="31" fill="#c69a59" /><rect x="234" y="378" width="42" height="42" fill="#7a986d" />
    <rect x="312" y="336" width="116" height="110" fill="#876241" />
    {Array.from({length:64},(_,i)=><rect key={i} x={322+i%8*12} y={340+Math.floor(i/8)*12} width="12" height="12" fill={(i%8+Math.floor(i/8))%2 ? "#687b65" : "#e5d5ad"} />)}
    <rect x="526" y="310" width="171" height="74" fill="#c1a477" /><rect x="553" y="279" width="116" height="65" fill="#d5dfcf" stroke="#263944" strokeWidth="5" />
    <rect x="584" y="403" width="40" height="35" fill="#568184" /><rect x="444" y="520" width="44" height="24" fill="#d9c5a0" />
    {guide.target && <rect x={guide.target.x-18} y={guide.target.y-18} width="36" height="36" fill="none" stroke="#f7d06b" strokeWidth="7" />}
    <rect data-world-map-player="" x={HOME_START.x-15} y={HOME_START.y-15} width="30" height="30" fill="#d8794d" stroke="#233e51" strokeWidth="7" />
    {!live && <><text x="190" y="490" textAnchor="middle">LEGO</text><text x="370" y="322" textAnchor="middle">CHESS</text><text x="610" y="462" textAnchor="middle">AGAR.IO</text></>}
  </svg>;
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

function StoryContent({ story, paused }: { story: LifeStory; paused: boolean }) {
  const object = story.objectId ? roomObjectById(story.objectId) : null;
  return <>
    <p className="world-eyebrow">{object ? "OBJECT VIEW" : story.number} / {story.place}</p>
    <h2 id="world-dialog-title">{story.title}</h2>
    {object && <RoomObjectView object={object} paused={paused} />}
    <p className="world-story-copy">{story.description}</p>
    {story.photos.length > 0 && <div className="world-memory-photos">{story.photos.map((photo) => <figure key={photo.src}><Image src={photo.src} alt={photo.alt} width={900} height={600} sizes="(max-width: 640px) 85vw, 540px" /><figcaption>{photo.caption}</figcaption></figure>)}</div>}
    {story.link && (story.link.href.startsWith("/") ? <TransitionLink href={story.link.href} className="world-story-link">{story.link.label}<span aria-hidden="true">↗</span></TransitionLink> : <a href={story.link.href} target="_blank" rel="noopener noreferrer" className="world-story-link">{story.link.label}<span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>)}
    {!object && <p className="world-story-end">A little piece of my world.</p>}
  </>;
}
