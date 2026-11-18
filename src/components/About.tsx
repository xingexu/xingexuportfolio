"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CHAPTERS, ageLabel, itemById, type JourneyItem, type JourneyLink } from "@/lib/journey/data";
import { LINKS } from "@/app/data";
import JourneyWorld, { type JourneyControls, type JourneyStatus, type TransitionInfo } from "./JourneyWorld";
import ObjectPreview from "./ObjectPreview";
import { TransitionLink } from "./PageTransitions";

type Opened = { kind: "item"; id: string } | { kind: "index" } | { kind: "finale" } | null;

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

function Joystick({ controls }: { controls: React.RefObject<JourneyControls | null> }) {
  const knob = useRef<HTMLSpanElement>(null);
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!origin.current || origin.current.id !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect(), radius = rect.width / 2;
    let dx = event.clientX - (rect.left + radius), dy = event.clientY - (rect.top + radius);
    const distance = Math.hypot(dx, dy), max = radius - 18;
    if (distance > max) { dx = dx / distance * max; dy = dy / distance * max; }
    if (knob.current) knob.current.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`;
    controls.current?.setStick(dx / max, dy / max);
  };
  const end = () => {
    origin.current = null;
    if (knob.current) knob.current.style.transform = "";
    controls.current?.setStick(0, 0);
  };
  return (
    <div className="journey-joystick" aria-hidden="true"
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); origin.current = { x: event.clientX, y: event.clientY, id: event.pointerId }; move(event); }}
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
  const chapter = CHAPTERS[status.chapter];
  const nearbyList = status.nearby.map(id => itemById(id)).filter((entry): entry is NonNullable<typeof entry> => !!entry);
  const near = nearbyList[0] ?? null;
  const found = chapter.items.filter(item => visited.has(item.id)).length;
  const item = opened?.kind === "item" ? itemById(opened.id) : null;

  const openItem = useCallback((id: string) => {
    setOpened({ kind: "item", id });
    setVisited(previous => previous.has(id) ? previous : new Set([...previous, id]));
  }, []);
  const openIndex = useCallback(() => setOpened({ kind: "index" }), []);
  const close = useCallback(() => setOpened(null), []);
  const onFinale = useCallback(() => setOpened({ kind: "finale" }), []);
  const onMove = useCallback(() => setMoved(true), []);
  const goTo = (index: number) => { setOpened(null); controls.current?.goTo(index); };

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (opened || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "m") { event.preventDefault(); openIndex(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened, openIndex]);

  const skipping = intro || !!transition;
  const next = CHAPTERS[status.chapter + 1];
  const target = transition ? CHAPTERS[transition.to] : null;
  const chapterItems = item ? CHAPTERS[(item as JourneyItem & { chapter: number }).chapter].items : [];
  const itemIndex = item ? chapterItems.findIndex(entry => entry.id === item.id) : -1;

  return (
    <section className="about-page journey-page" aria-label="Xinge’s life in 3D, from age 7 to 18" data-chapter={chapter.id}>
      <h1 className="sr-only">ZINGER: growing up, from age 7 to 18</h1>
      <JourneyWorld controls={controls} blocked={opened !== null} visited={visited}
        onStatus={setStatus} onOpen={openItem} onTransition={setTransition} onIntro={setIntro} onFinale={onFinale} onMove={onMove} />

      <header className="journey-top">
        <TransitionLink href="/" className="journey-exit" aria-label="Return to home">↖</TransitionLink>
        <div className="journey-title">
          <span>ZINGER</span>
          <p aria-live="polite">Age {status.age} · {chapter.location}</p>
        </div>
        <nav className="journey-chapters" aria-label="Jump to a chapter">
          {CHAPTERS.map((entry, index) => (
            <button key={entry.id} type="button" aria-current={index === status.chapter ? "step" : undefined} onClick={() => goTo(index)}
              aria-label={`Chapter ${entry.number}: ${entry.place}, age ${ageLabel(entry)}`} title={`${entry.place} · age ${ageLabel(entry)}`}>
              <span>{entry.number}</span>
            </button>
          ))}
        </nav>
        <div className="journey-actions">
          <button type="button" className="journey-skip" onClick={() => skipping ? controls.current?.skip() : openIndex()}>
            {intro ? "Skip intro" : transition ? "Skip" : "Skip the walk"} <span aria-hidden="true">▸▸</span>
          </button>
        </div>
      </header>

      <div className="journey-chapter" aria-live="polite" aria-atomic="true">
        <small>CHAPTER {chapter.number} <i>—</i> AGE {ageLabel(chapter)}</small>
        <h2>{chapter.place}</h2>
        <p>{chapter.outfitLabel}</p>
      </div>

      {intro && (
        <div className="journey-intro" role="status">
          <small>CHAPTER 01 · AGE 7</small>
          <strong>Welcome to Canada.</strong>
          <span>Skip anytime with <kbd>Esc</kbd> or the Skip intro button.</span>
        </div>
      )}

      {target && transition && (
        <button type="button" className="journey-card" onClick={() => controls.current?.skip()} key={transition.to}>
          <small>CHAPTER {target.number} · AGE {ageLabel(target)}</small>
          <strong>{target.place}</strong>
          <span>{target.heading}</span>
          <em>Now wearing: {target.outfitLabel}</em>
          <span className="journey-card-skip">Tap or press Esc to skip</span>
        </button>
      )}

      <div className="journey-prompt">
        {near ? (
          <div className="journey-prompt-group">
            <button type="button" onClick={() => openItem(near.id)}>
              <kbd>E</kbd><span>Look at <strong>{near.label}</strong></span><span aria-hidden="true">↗</span>
            </button>
            {nearbyList.slice(1).map(other => (
              <button type="button" key={other.id} className="journey-prompt-more" onClick={() => openItem(other.id)}>
                <span>{other.label}</span><span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        ) : !skipping && (
          <p className="journey-hint">
            {!moved ? <>Walk forward <span aria-hidden="true">↑</span> · everything that sparkles can be opened</> : next ? <>Keep walking forward to <strong>{next.place}</strong></> : <>Walk through the last door to see what’s next</>}
          </p>
        )}
      </div>

      <footer className="journey-bottom">
        <p id="journey-help" className="journey-keys">
          <span className="journey-keycaps"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span>
          <span>walk<br /><small>or arrow keys</small></span>
          <span className="journey-key-action"><kbd>E</kbd> look <kbd>M</kbd> index <kbd>Esc</kbd> skip</span>
        </p>
        <Joystick controls={controls} />
        <button type="button" className="journey-found" onClick={openIndex}>
          <strong>{found} / {chapter.items.length}</strong>
          <span>found here · index <span aria-hidden="true">↗</span></span>
        </button>
      </footer>

      <dialog ref={dialog} className="journey-dialog" aria-labelledby="journey-dialog-title"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <button ref={closeButton} type="button" className="journey-dialog-close" onClick={close} aria-label="Close and keep walking">×</button>
        {item && (() => {
          const home = CHAPTERS[(item as JourneyItem & { chapter: number }).chapter];
          return <>
            <p className="journey-eyebrow">Chapter {home.number} · {home.place} · Age {ageLabel(home)}</p>
            <h2 id="journey-dialog-title">{item.title}</h2>
            <ObjectPreview model={item.model} label={item.label} />
            <p className="journey-copy">{item.description}</p>
            {item.links && <div className="journey-links">{item.links.map(link => <StoryLink key={link.href} link={link} />)}</div>}
            <nav className="journey-item-nav" aria-label={`More from ${home.place}`}>
              <button type="button" onClick={() => openItem(chapterItems[(itemIndex + chapterItems.length - 1) % chapterItems.length].id)}>← Previous</button>
              <span>{String(itemIndex + 1).padStart(2, "0")} / {String(chapterItems.length).padStart(2, "0")}</span>
              <button type="button" onClick={() => openItem(chapterItems[(itemIndex + 1) % chapterItems.length].id)}>Next →</button>
            </nav>
          </>;
        })()}
        {opened?.kind === "index" && <>
          <p className="journey-eyebrow">Skip the walk · everything at a glance</p>
          <h2 id="journey-dialog-title">Age 7 to 18, in six rooms.</h2>
          <p className="journey-intro-copy">Jump to any chapter, or open anything below. Nothing here needs the game.</p>
          <ol className="journey-index">
            {CHAPTERS.map((entry, index) => (
              <li key={entry.id}>
                <div className="journey-index-head">
                  <span>{entry.number}</span>
                  <div><strong>{entry.place}</strong><small>Age {ageLabel(entry)} · {entry.location}</small></div>
                  <button type="button" onClick={() => goTo(index)}>{index === status.chapter ? "Here now" : "Go"} <span aria-hidden="true">→</span></button>
                </div>
                <p>{entry.intro}</p>
                <ul>
                  {entry.items.map(entryItem => (
                    <li key={entryItem.id}>
                      <button type="button" onClick={() => openItem(entryItem.id)}>
                        <span aria-label={visited.has(entryItem.id) ? "Seen" : "Not seen yet"}>{visited.has(entryItem.id) ? "◆" : "◇"}</span>
                        {entryItem.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <div className="journey-links">{FINAL_LINKS.map(link => <StoryLink key={link.href} link={link} />)}</div>
        </>}
        {opened?.kind === "finale" && <>
          <p className="journey-eyebrow">Age 18 · today</p>
          <h2 id="journey-dialog-title">That’s me, so far.</h2>
          <p className="journey-copy">From stepping off a plane at seven to Computer Science and Ivey at Western. The next chapter is still being written. If you’re hiring software engineers, I’d love to talk.</p>
          <div className="journey-links">{FINAL_LINKS.map(link => <StoryLink key={link.href} link={link} />)}</div>
          <div className="journey-finale-actions">
            <button type="button" onClick={() => goTo(0)}>Walk it again from age 7</button>
            <button type="button" onClick={close}>Stay in O-Hall</button>
          </div>
        </>}
        {opened && opened.kind !== "finale" && <button type="button" className="journey-continue" onClick={close}>Keep walking <span aria-hidden="true">→</span></button>}
      </dialog>

      <noscript>
        <div className="journey-nojs">
          <h2>Age 7 to 18, in six rooms.</h2>
          {CHAPTERS.map(entry => (
            <section key={entry.id}>
              <h3>{entry.number} · {entry.place} · age {ageLabel(entry)}</h3>
              <ul>{entry.items.map(entryItem => <li key={entryItem.id}><strong>{entryItem.label}:</strong> {entryItem.description} {entryItem.links?.map(link => <a key={link.href} href={link.href}> {link.label}</a>)}</li>)}</ul>
            </section>
          ))}
        </div>
      </noscript>
    </section>
  );
}
