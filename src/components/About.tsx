"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CHAPTERS, ageLabel, itemById, type JourneyItem, type JourneyLink } from "@/lib/journey/data";
import { LINKS } from "@/app/data";
import JourneyWorld, { type JourneyControls, type JourneyStatus, type TransitionInfo } from "./JourneyWorld";
import ObjectPreview from "./ObjectPreview";
import { TransitionLink } from "./PageTransitions";

type Opened = { kind: "item"; id: string } | { kind: "finale" } | null;

const FINAL_LINKS: JourneyLink[] = [
  { href: "/projects", label: "Projects" },
  { href: "/resume", label: "Resume" },
  { href: LINKS.github, label: "GitHub" },
  { href: LINKS.linkedin, label: "LinkedIn" },
  { href: LINKS.email, label: "Email me" },
];

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
    const distance = Math.hypot(dx, dy), max = radius - 18;
    if (distance > max) { dx = dx / distance * max; dy = dy / distance * max; }
    if (knob.current) knob.current.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`;
    controls.current?.setStick(dx / max, dy / max);
  };
  const end = () => {
    active.current = null;
    if (knob.current) knob.current.style.transform = "";
    controls.current?.setStick(0, 0);
  };
  return (
    <div className="journey-joystick" aria-hidden="true"
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); active.current = event.pointerId; move(event); }}
      onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <span ref={knob} />
    </div>
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
  const near = status.nearby.map(id => itemById(id)).find(Boolean) ?? null;
  const item = opened?.kind === "item" ? itemById(opened.id) : null;

  const openItem = useCallback((id: string) => {
    setOpened({ kind: "item", id });
    setVisited(previous => previous.has(id) ? previous : new Set([...previous, id]));
  }, []);
  const close = useCallback(() => setOpened(null), []);
  const onFinale = useCallback(() => setOpened({ kind: "finale" }), []);
  const onMove = useCallback(() => setMoved(true), []);

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

  const target = transition ? CHAPTERS[transition.to] : null;
  const chapterItems = item ? CHAPTERS[(item as JourneyItem & { chapter: number }).chapter].items : [];
  const itemIndex = item ? chapterItems.findIndex(entry => entry.id === item.id) : -1;

  return (
    <section className="about-page journey-page" aria-label="Xinge’s life in 3D, from age 7 to 18" data-chapter={CHAPTERS[status.chapter].id}>
      <h1 className="sr-only">ZINGER: growing up, from age 7 to 18</h1>
      <JourneyWorld controls={controls} blocked={opened !== null} visited={visited}
        onStatus={setStatus} onOpen={openItem} onTransition={setTransition} onIntro={setIntro} onFinale={onFinale} onMove={onMove} />

      {intro && <div className="journey-intro" role="status"><Typed text="Welcome to Canada." delay={300} /></div>}

      {target && transition && (
        <button type="button" className="journey-card" onClick={() => controls.current?.skip()} key={transition.to} aria-label={`${target.stop}. Tap to skip.`}>
          <strong><Typed text={target.stop} delay={450} /></strong>
          {target.stopNote && <span><Typed text={target.stopNote} delay={450 + target.stop.length * 45 + 150} speed={30} /></span>}
        </button>
      )}

      {!moved && !near && !intro && !transition && !opened && (
        <div className="journey-tutorial" id="journey-help">
          <div className="journey-wasd" aria-hidden="true"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></div>
          <kbd aria-hidden="true">E</kbd>
          <p><Typed text="Walk · turn · look" speed={35} /></p>
          <p className="journey-tutorial-touch"><Typed text="Drag to walk · tap to look" speed={35} /></p>
        </div>
      )}

      {near && !opened && !transition && (
        <button type="button" className="journey-prompt" onClick={() => openItem(near.id)}>
          <kbd>E</kbd><span>{near.label}</span>
        </button>
      )}

      {(intro || transition) && (
        <button type="button" className="journey-skip" onClick={() => controls.current?.skip()}>Skip <span aria-hidden="true">▸▸</span></button>
      )}

      <Joystick controls={controls} />
      <TransitionLink href="/" className="journey-back" aria-label="Go back to the home page"><span aria-hidden="true">←</span> Back</TransitionLink>

      <dialog ref={dialog} className="journey-dialog" aria-labelledby="journey-dialog-title"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <button ref={closeButton} type="button" className="journey-dialog-close" onClick={close} aria-label="Close and keep walking">×</button>
        {item && (() => {
          const home = CHAPTERS[(item as JourneyItem & { chapter: number }).chapter];
          return <>
            <p className="journey-eyebrow">{home.stop} · age {ageLabel(home)}</p>
            <h2 id="journey-dialog-title">{item.title}</h2>
            <ObjectPreview model={item.model} label={item.label} />
            <p className="journey-copy">{item.description}</p>
            {item.links && <div className="journey-links">{item.links.map(link => <StoryLink key={link.href} link={link} />)}</div>}
            {chapterItems.length > 1 && <nav className="journey-item-nav" aria-label={`More from ${home.place}`}>
              <button type="button" onClick={() => openItem(chapterItems[(itemIndex + chapterItems.length - 1) % chapterItems.length].id)} aria-label="Previous object">←</button>
              <span>{itemIndex + 1} / {chapterItems.length}</span>
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
          {CHAPTERS.map(entry => (
            <section key={entry.id}>
              <h3>{entry.place} · age {ageLabel(entry)}</h3>
              <ul>{entry.items.map(entryItem => <li key={entryItem.id}><strong>{entryItem.label}:</strong> {entryItem.description} {entryItem.links?.map(link => <a key={link.href} href={link.href}> {link.label}</a>)}</li>)}</ul>
            </section>
          ))}
        </div>
      </noscript>
    </section>
  );
}
