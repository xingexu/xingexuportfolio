"use client";

import { useEffect, useRef, type RefObject } from "react";
import { advanceWalker, airportPlace, atAirportExit, canWalk, closestStory, createLifeWorld, AIRPORT_RETURN, START, WORLD, type Direction, type Walker } from "@/lib/life-world";
import { emptyAirportProgress, getAirportGuide, recordAirportProgress, type AirportGuide } from "@/lib/airport-guide";
import { atHomeReturn, canWalkHome, createHomeWorld, getHomeGuide, homePlace, HOME_START, HOME_WORLD, CHESS_TABLE } from "@/lib/home-world";
import type { LifeChapter } from "@/lib/life-stories";

export type WorldControls = { input: (direction: Direction, held: boolean) => void; focus: () => void; travel?: (chapter: LifeChapter) => void };
export type LifeEra = "childhood" | "growing" | "today";
type Props = {
  controls: RefObject<WorldControls | null>;
  blocked: boolean;
  paused: boolean;
  visited: ReadonlySet<string>;
  onLocation: (id: string, nearby: string | null) => void;
  onInteract: (id: string) => void;
  onMap: () => void;
  onMove: () => void;
  onGuide?: (guide: AirportGuide) => void;
  onChapter?: (chapter: LifeChapter) => void;
  onTransition?: (chapter: LifeChapter | null) => void;
  onEra?: (era: LifeEra) => void;
};
const KEY_DIRECTIONS: Record<string, Direction> = { w: "up", a: "left", s: "down", d: "right", ArrowUp: "up", ArrowLeft: "left", ArrowDown: "down", ArrowRight: "right" };

export default function LifeWorld(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  useEffect(() => { live.current = props; }, [props]);

  useEffect(() => {
    const canvas = canvasRef.current, stage = stageRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context || !stage) return;
    const field = canvas, region = stage, ctx = context;
    const world = createLifeWorld();
    const home = createHomeWorld();
    if (!world || !home) return;
    const airportScene = world, homeScene = home;
    let chapter: LifeChapter = "airport", enteredHome = false;
    let transition: { to: LifeChapter; elapsed: number; switched: boolean } | null = null;
    const player: Walker = { ...START, direction: "down", distance: 0, moving: false, growth: 0 };
    const camera = { x: player.x, y: player.y - 36 };
    const held = new Set<Direction>();
    const sources = new Map<string, Direction>();
    const progress = emptyAirportProgress();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, previous = 0, ambientTime = 0, lastId = "", lastNear: string | null | undefined, hasMoved = false;
    let lastGuide = "";
    let disposed = false;

    function focus() { region.focus({ preventScroll: true }); }
    function clearInput() { sources.clear(); held.clear(); player.moving = false; player.vx = 0; player.vy = 0; }
    function input(direction: Direction, down: boolean, source = `touch-${direction}`) {
      if (down && !live.current.blocked && !transition) sources.set(source, direction);
      else sources.delete(source);
      held.clear(); for (const value of sources.values()) held.add(value);
    }
    function travel(to: LifeChapter) {
      if (transition || to === chapter) return;
      clearInput(); transition = { to, elapsed: 0, switched: false };
      live.current.onTransition?.(to);
    }
    function worldSize() { return chapter === "airport" ? WORLD : HOME_WORLD; }
    function cameraTarget() {
      if (chapter === "holsworthy" && field.width >= 600 && field.height >= 340) return { x: HOME_WORLD.width / 2, y: 355 };
      return { x: player.x, y: player.y - 36 };
    }
    function centerCamera() {
      const size = worldSize(), aim = cameraTarget();
      camera.x = Math.max(field.width / 2, Math.min(size.width - field.width / 2, aim.x));
      camera.y = Math.max(field.height / 2, Math.min(size.height - field.height / 2, aim.y));
    }
    const control = { input, focus, travel };
    const handle = live.current.controls;
    handle.current = control;

    function draw(now: number) {
      if (disposed) return;
      const dt = previous ? Math.min((now - previous) / 1000, .04) : 0;
      previous = now;
      const covered = !!document.documentElement.dataset.roomTransition;
      if (live.current.blocked || covered || transition) clearInput();
      advanceWalker(player, held, dt, chapter === "airport" ? canWalk : canWalkHome);
      if (!transition && !live.current.blocked && !covered) {
        if (chapter === "airport" && atAirportExit(player)) travel("holsworthy");
        else if (chapter === "holsworthy" && atHomeReturn(player)) travel("airport");
      }
      if (transition) {
        transition.elapsed += dt * 1000;
        if (!transition.switched && transition.elapsed >= (motion.matches ? 120 : 750)) {
          chapter = transition.to; transition.switched = true;
          Object.assign(player, chapter === "holsworthy" ? HOME_START : AIRPORT_RETURN, { direction: chapter === "holsworthy" ? "up" : "down", moving: false, vx: 0, vy: 0, distance: 0 });
          centerCamera(); lastId = ""; lastNear = undefined; lastGuide = "";
          live.current.onChapter?.(chapter);
        }
        if (transition.elapsed >= (motion.matches ? 240 : 1600)) { transition = null; live.current.onTransition?.(null); }
      }
      if (player.moving && !hasMoved) { hasMoved = true; live.current.onMove(); }
      const follow = motion.matches ? 1 : 1 - Math.exp(-dt * 10);
      const size = worldSize(), aim = cameraTarget();
      const targetX = Math.max(field.width / 2, Math.min(size.width - field.width / 2, aim.x));
      const targetY = Math.max(field.height / 2, Math.min(size.height - field.height / 2, aim.y));
      camera.x += (targetX - camera.x) * follow;
      camera.y += (targetY - camera.y) * follow;
      if (!live.current.paused && !motion.matches && !live.current.blocked) ambientTime += dt * 1000;
      if (chapter === "airport") recordAirportProgress(progress, player);
      else if (player.y < 525) enteredHome = true;
      const guide = chapter === "airport" ? getAirportGuide(player, progress, live.current.visited.has("arrival")) : getHomeGuide(player, enteredHome, live.current.visited.has("first-home"));
      const guideKey = `${guide.id}|${guide.hint}|${guide.arrow}`;
      if (guideKey !== lastGuide) { lastGuide = guideKey; live.current.onGuide?.(guide); }
      const scene = chapter === "airport" ? airportScene : homeScene;
      scene.draw(ctx, camera, player, ambientTime, live.current.visited, motion.matches, guide.waypoint);
      if (transition) {
        const t = transition.elapsed;
        const coverage = motion.matches ? (t < 120 ? 1 : 0) : t < 600 ? t / 600 : t < 900 ? 1 : 1 - (t - 900) / 700;
        ctx.fillStyle = "#26352f";
        for (let y = 0; y < field.height; y += 8) for (let x = 0; x < field.width; x += 8) {
          const random = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          const radius = Math.hypot(x - field.width / 2, y - field.height / 2) / Math.hypot(field.width / 2, field.height / 2);
          if (coverage >= (random - Math.floor(random)) * .65 + radius * .35) ctx.fillRect(x,y,8,8);
        }
      }
      const story = closestStory(player, chapter);
      const place = chapter === "airport" ? airportPlace(player) : homePlace(player);
      const nearby = Math.hypot(story.x - player.x, story.y - player.y) <= 48 ? story.id : null;
      if (place.id !== lastId || nearby !== lastNear) { lastId = place.id; lastNear = nearby; live.current.onLocation(place.id, nearby); }
      document.querySelectorAll("[data-world-map-player]").forEach(marker => {
        marker.setAttribute("x", String(Math.round(player.x - 15)));
        marker.setAttribute("y", String(Math.round(player.y - 15)));
      });
      region.dataset.playerX = String(Math.round(player.x)); region.dataset.playerY = String(Math.round(player.y));
      region.dataset.era = "childhood";
      region.dataset.age = "6";
      region.dataset.guide = guide.id;
      region.dataset.chapter = chapter;
      region.dataset.travelling = String(!!transition);
      if (field.dataset.ready !== "true") {
        field.dataset.screenX = String(field.width / 2 - 20); field.dataset.screenY = String(field.height / 2 - 20);
        field.dataset.screenWidth = "40"; field.dataset.screenHeight = "40";
        field.dataset.ready = "true";
        window.dispatchEvent(new Event("about-room-ready"));
      }
      frame = requestAnimationFrame(draw);
    }
    function keydown(event: KeyboardEvent) {
      if (transition) { if (event.key === "Escape") transition.elapsed = motion.matches ? 240 : 1600; return; }
      if (live.current.blocked || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const direction = KEY_DIRECTIONS[key];
      if (direction && (target === document.body || region.contains(target))) { event.preventDefault(); input(direction, true, key); }
      else if (!event.repeat && (target === document.body || region.contains(target))) {
        if ((key === "e" || key === "Enter") && lastNear) { event.preventDefault(); clearInput(); live.current.onInteract(lastNear); }
        else if (key === "m") { event.preventDefault(); clearInput(); live.current.onMap(); }
      }
    }
    function keyup(event: KeyboardEvent) {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const direction = KEY_DIRECTIONS[key];
      if (direction) input(direction, false, key);
    }
    function visibility() {
      clearInput(); cancelAnimationFrame(frame); previous = 0;
      if (!document.hidden) frame = requestAnimationFrame(draw);
    }
    function inspectBoard(event: PointerEvent) {
      if (chapter !== "holsworthy" || transition || live.current.blocked || lastNear !== "first-home") return;
      const bounds = field.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width * field.width + camera.x - field.width / 2;
      const y = (event.clientY - bounds.top) / bounds.height * field.height + camera.y - field.height / 2;
      if (x >= CHESS_TABLE.x && x <= CHESS_TABLE.x + CHESS_TABLE.w && y >= CHESS_TABLE.y && y <= CHESS_TABLE.y + CHESS_TABLE.h) { clearInput(); live.current.onInteract("first-home"); }
    }
    function resize() {
      const scale = Math.max(2, Math.floor(Math.min(region.clientWidth / 440, region.clientHeight / 270)));
      field.width = Math.ceil(region.clientWidth / scale); field.height = Math.ceil(region.clientHeight / scale);
      field.style.width = `${field.width * scale}px`; field.style.height = `${field.height * scale}px`;
      centerCamera();
      delete field.dataset.ready;
    }
    const observer = new ResizeObserver(resize);
    observer.observe(region); resize();
    window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup);
    window.addEventListener("blur", clearInput); document.addEventListener("visibilitychange", visibility);
    region.addEventListener("blur", clearInput);
    region.addEventListener("pointerup", inspectBoard);
    visibility();
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); held.clear();
      window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", clearInput); document.removeEventListener("visibilitychange", visibility);
      region.removeEventListener("blur", clearInput);
      region.removeEventListener("pointerup", inspectBoard);
      if (handle.current === control) handle.current = null;
    };
  }, []);

  return <div ref={stageRef} className="world-stage" tabIndex={0} role="region" aria-label="Explore Xinge’s world" aria-describedby="world-instructions world-next-step" onPointerDown={() => stageRef.current?.focus({ preventScroll: true })}>
    <canvas ref={canvasRef} className="about-field world-canvas" aria-hidden="true" />
  </div>;
}
