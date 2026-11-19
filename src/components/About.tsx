"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { CHAPTERS, ageLabel, chapterAccent, itemById, type JourneyLink } from "@/lib/journey/data";
import { LINKS } from "@/app/data";
import JourneyWorld, { type CameraMode, type JourneyControls, type JourneyStatus, type TransitionInfo } from "./JourneyWorld";
import ObjectPreview from "./ObjectPreview";
import { TransitionLink } from "./PageTransitions";

type Opened = { kind: "item"; id: string } | { kind: "objects"; chapter: number } | { kind: "finale" } | null;

const FINAL_LINKS: JourneyLink[] = [
  { href: "/projects", label: "Projects" },
  { href: "/resume", label: "Resume" },
  { href: LINKS.github, label: "GitHub" },
  { href: LINKS.linkedin, label: "LinkedIn" },
  { href: LINKS.email, label: "Email me" },
];
const MUSIC_URL = process.env.NEXT_PUBLIC_JOURNEY_MUSIC_URL;

function StoryLink({ link }: { link: JourneyLink }) {
  return link.href.startsWith("/")
    ? <TransitionLink href={link.href} className="journey-link">{link.label}<span aria-hidden="true">↗</span></TransitionLink>
    : <a href={link.href} target="_blank" rel="noopener noreferrer" className="journey-link">{link.label}<span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>;
}

/** Reveals text one character at a time. */
function Typed({ text, delay = 0, speed = 45 }: { text: string; delay?: number; speed?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timer: ReturnType<typeof setTimeout>;
    const tick = (n: number) => { setCount(n); if (n < text.length) timer = setTimeout(() => tick(n + 1), speed); };
    timer = setTimeout(() => (reduced ? setCount(text.length) : tick(0)), reduced ? 0 : delay);
    return () => clearTimeout(timer);
  }, [text, delay, speed]);
  return <span className="journey-typed" aria-label={text}><span aria-hidden="true">{text.slice(0, count)}</span><i aria-hidden="true">▌</i></span>;
}

function Joystick({ controls }: { controls: React.RefObject<JourneyControls | null> }) {
  const knob = useRef<HTMLSpanElement>(null);
  const active = useRef<number | null>(null);
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (active.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect(), radius = rect.width / 2;
    let dx = event.clientX - (rect.left + radius), dy = event.clientY - (rect.top + radius);
    const distance = Math.hypot(dx, dy), max = radius * 0.6;
    if (distance > max) { dx = dx / distance * max; dy = dy / distance * max; }
    if (knob.current) knob.current.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`;
    const strength = Math.max(0, (Math.min(1, distance / max) - 0.12) / 0.88);
    controls.current?.setStick(dx / (Math.min(distance, max) || 1) * strength, dy / (Math.min(distance, max) || 1) * strength);
  };
  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (active.current !== event.pointerId) return;
    active.current = null;
    if (knob.current) knob.current.style.transform = "";
    controls.current?.setStick(0, 0);
  };
  return (
    <div className="journey-joystick" aria-hidden="true"
      onPointerDown={(event) => {
        if (active.current !== null || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        active.current = event.pointerId;
        move(event);
      }}
      onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <span ref={knob} />
    </div>
  );
}

function JourneyMusic({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const toggle = async () => {
    const track = audio.current;
    if (!track) return;
    if (!track.paused) { track.pause(); return; }
    track.volume = 0.25;
    setUnavailable(false);
    try { await track.play(); } catch { if (audio.current === track && track.error) setUnavailable(true); }
  };
  return (
    <>
      <audio ref={audio} src={src} loop preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onError={() => { setPlaying(false); setUnavailable(true); }} />
      <button className="journey-music" type="button" onClick={toggle} aria-pressed={playing} aria-label="Background music">
        {unavailable ? "Music unavailable" : playing ? "Music on" : "Music off"}
      </button>
    </>
  );
}

export default function About() {
  const controls = useRef<JourneyControls | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<JourneyStatus>({ chapter: 0, age: 7, nearby: [] });
  const [opened, setOpened] = useState<Opened>(null);
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [transition, setTransition] = useState<TransitionInfo | null>(null);
  const [intro, setIntro] = useState(false);
  const [moved, setMoved] = useState(false);
  const [camera, setCamera] = useState<CameraMode>({ front: false, tilt: false });
  const near = status.nearby.map(id => itemById(id)).find(Boolean) ?? null;
  const item = opened?.kind === "item" ? itemById(opened.id) : null;

  const openItem = useCallback((id: string) => {
    setOpened({ kind: "item", id });
    setVisited(previous => previous.has(id) ? previous : new Set([...previous, id]));
  }, []);
  const close = useCallback(() => setOpened(null), []);
  const browse = (chapter: number) => setOpened({ kind: "objects", chapter });
  const onFinale = useCallback(() => setOpened({ kind: "finale" }), []);
  const onMove = useCallback(() => setMoved(true), []);

  const dialogPage = opened?.kind === "item" ? opened.id : opened?.kind;
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (dialogPage) {
      if (!element.open) element.showModal();
      element.scrollTop = 0;
      closeButton.current?.focus();
    } else if (element.open) {
      element.close();
      controls.current?.focus();
    }
  }, [dialogPage]);

  const target = transition ? CHAPTERS[transition.to] : null;
  const chapterItems = item ? CHAPTERS[item.chapter].items : [];
  const itemIndex = item ? chapterItems.findIndex(entry => entry.id === item.id) : -1;

  return (
    <section className="about-page journey-page" aria-label="Xinge’s life in 3D, from age 7 to 18" data-chapter={CHAPTERS[status.chapter].id}>
      <h1 className="sr-only">ZINGER: growing up, from age 7 to 18</h1>
      <p className="sr-only" id="journey-help">W and S or the up and down arrows move. A and D or the left and right arrows turn. Press Space or tap Jump to jump. Press F to see yourself from the front or return to the rear view. Q tilts up. Press E to inspect an object. Near a volleyball, press R or tap Spike for a jump spike or Set for three overhead sets. Walk into a volleyball to kick it. You can also drag to move, tap or click to inspect, or use Objects to browse without walking.</p>
      <JourneyWorld controls={controls} blocked={opened !== null} visited={visited}
        onStatus={setStatus} onOpen={openItem} onTransition={setTransition} onIntro={setIntro} onFinale={onFinale} onMove={onMove} onCameraChange={setCamera} />

      {intro && <div className="journey-intro" role="status"><Typed text="Welcome to Canada." delay={300} /></div>}

      {target && transition && (
        <div className="journey-card" key={transition.to} style={{ "--journey-accent": `#${chapterAccent(transition.to).toString(16).padStart(6, "0")}` } as CSSProperties}>
          <button type="button" className="journey-pass" onClick={() => controls.current?.skip()} aria-label={`${target.stop}, chapter ${transition.to + 1} of ${CHAPTERS.length}. Skip transition.`}>
            <span className="journey-route" aria-hidden="true">{CHAPTERS.map((room, i) =>
              <span key={room.id} data-progress={i === transition.to ? "current" : i < transition.to ? "passed" : "upcoming"} />)}</span>
            <span className="journey-pass-index" aria-hidden="true">CHAPTER {target.number} / {String(CHAPTERS.length).padStart(2, "0")}</span>
            <strong><Typed text={target.stop} delay={420} /></strong>
            {target.stopNote && <span className="journey-pass-note"><Typed text={target.stopNote} delay={550 + target.stop.length * 45} speed={30} /></span>}
          </button>
        </div>
      )}

      {!intro && !transition && !opened && <>
        <aside className="journey-keys" aria-label="Keyboard shortcuts">
          <span><kbd>W</kbd><kbd>S</kbd><kbd>↑</kbd><kbd>↓</kbd> Walk</span>
          <span><kbd>A</kbd><kbd>D</kbd><kbd>←</kbd><kbd>→</kbd> Turn</span>
          <span><kbd>E</kbd> Inspect</span>
          <span><kbd>Space</kbd> Jump</span>
        </aside>
        {!moved && !near && !status.volley && <p className="journey-touch-note">Drag anywhere in the scene or use the joystick. Tap an object to inspect it.</p>}
      </>}

      {!intro && !opened && !transition && (near || status.volley) && (
        <div className="journey-prompts">
          {near && <button type="button" className="journey-prompt" onClick={() => openItem(near.id)} aria-keyshortcuts="E">
            <kbd aria-hidden="true">E</kbd><span>{near.label}</span>
          </button>}
          {status.volley && <button type="button" className="journey-prompt journey-volley" onClick={() => controls.current?.volley()} aria-keyshortcuts="R">
            <kbd aria-hidden="true">R</kbd><span>{status.volley}</span>
          </button>}
        </div>
      )}

      {(intro || transition) && (
        <button type="button" className="journey-skip" onClick={() => { controls.current?.skip(); controls.current?.focus(); }} aria-keyshortcuts="Escape">
          {intro ? "Skip intro" : "Skip transition"} <kbd aria-hidden="true">Esc</kbd>
        </button>
      )}

      {!intro && !transition && <Joystick controls={controls} />}
      {!intro && !transition && !opened && <button type="button" className="journey-jump" onClick={() => controls.current?.jump()} aria-keyshortcuts="Space">Jump <span aria-hidden="true">↑</span></button>}
      {!intro && !transition && <div className="journey-tools" role="group" aria-label="Camera and objects">
        <button type="button" onClick={() => controls.current?.toggleCamera("tilt")} aria-pressed={camera.tilt} aria-keyshortcuts="Q">Tilt up <kbd aria-hidden="true">Q</kbd></button>
        <button type="button" title="See yourself from the front (F)" onClick={() => controls.current?.toggleCamera("front")} aria-pressed={camera.front} aria-keyshortcuts="F">Front view <kbd aria-hidden="true">F</kbd></button>
        <button type="button" onClick={() => browse(status.chapter)} aria-haspopup="dialog">Objects</button>
      </div>}
      {MUSIC_URL && <JourneyMusic src={MUSIC_URL} />}
      <TransitionLink href="/home" replace className="journey-back">Skip to portfolio <span aria-hidden="true">→</span></TransitionLink>

      <dialog ref={dialog} className="journey-dialog" aria-labelledby="journey-dialog-title"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <button ref={closeButton} type="button" className="journey-dialog-close" onClick={close} aria-label="Close and keep walking">×</button>
        {opened?.kind === "objects" && <>
          <h2 id="journey-dialog-title">Room objects</h2>
          <div className="journey-room-picker">
            <label>Room <select value={opened.chapter} onChange={event => browse(Number(event.target.value))}>
              {CHAPTERS.map((room, index) => <option key={room.id} value={index}>{room.stop}</option>)}
            </select></label>
            {opened.chapter !== status.chapter && <button type="button" onClick={() => { controls.current?.goTo(opened.chapter); close(); }}>Go to room</button>}
          </div>
          <ul className="journey-object-list">
            {CHAPTERS[opened.chapter].items.map(entry => <li key={entry.id}>
              <button type="button" onClick={() => openItem(entry.id)}>{entry.label}<span aria-hidden="true">→</span></button>
            </li>)}
          </ul>
        </>}
        {item && (() => {
          const home = CHAPTERS[item.chapter];
          return <>
            <p className="journey-eyebrow">{home.stop} · age {ageLabel(home)}</p>
            <h2 id="journey-dialog-title">{item.title}</h2>
            {item.video ? <video key={item.video.src} className="journey-video" src={item.video.src} poster={item.video.poster} controls playsInline preload="metadata" aria-label={item.video.label}>
              {item.video.captions && <track kind="captions" src={item.video.captions} srcLang="en" label="English" />}
              <a href={item.video.src}>Watch {item.video.label}</a>
            </video> : <ObjectPreview model={item.model} label={item.label} />}
            {item.description && <p className="journey-copy">{item.description}</p>}
            {item.links && <div className="journey-links">{item.links.map(link => <StoryLink key={link.href} link={link} />)}</div>}
            {chapterItems.length > 1 && <nav className="journey-item-nav" aria-label={`More from ${home.place}`}>
              <button type="button" onClick={() => openItem(chapterItems[(itemIndex + chapterItems.length - 1) % chapterItems.length].id)} aria-label="Previous object">←</button>
              <button type="button" onClick={() => browse(item.chapter)}>All objects <span>· {itemIndex + 1} / {chapterItems.length}</span></button>
              <button type="button" onClick={() => openItem(chapterItems[(itemIndex + 1) % chapterItems.length].id)} aria-label="Next object">→</button>
            </nav>}
          </>;
        })()}
        {opened?.kind === "finale" && <>
          <p className="journey-eyebrow">Age 18 · today</p>
          <h2 id="journey-dialog-title">That’s me, so far.</h2>
          <p className="journey-copy">The next chapter is still being written. If you’re hiring software engineers, I’d love to talk.</p>
          <div className="journey-links">{FINAL_LINKS.map(link => <StoryLink key={link.href} link={link} />)}</div>
        </>}
      </dialog>

      <noscript>
        <div className="journey-nojs">
          <h2>Age 7 to 18.</h2>
          <a href="/home">Skip to portfolio</a>
          {CHAPTERS.map(entry => (
            <section key={entry.id}>
              <h3>{entry.place} · age {ageLabel(entry)}</h3>
              <ul>{entry.items.map(entryItem => <li key={entryItem.id}>
                <strong>{entryItem.label}{entryItem.description ? ":" : ""}</strong> {entryItem.description} {entryItem.links?.map(link => <a key={link.href} href={link.href}> {link.label}</a>)}
                {entryItem.video && <a href={entryItem.video.src}> Watch {entryItem.video.label}</a>}
              </li>)}</ul>
            </section>
          ))}
        </div>
      </noscript>
    </section>
  );
}
