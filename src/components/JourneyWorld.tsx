"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Color, Group, LinearSRGBColorSpace, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3, WebGLRenderer, type BufferGeometry, type Object3D } from "three";
import { CHAPTERS, type Placement } from "@/lib/journey/data";
import { buildModel, modelFootprint } from "@/lib/journey/models";
import { buildAvatar, type AvatarParts } from "@/lib/journey/avatar";
import { gridGeometry } from "@/lib/journey/mesh";
import { ageAt, blocked as blockedAt, buildRoomShell, interior, nearbyItems, placementBox, spawn, step, walkSpeed, INTRO_END, WALL_HEIGHT } from "@/lib/journey/world";
import { Grid, hash3 } from "@/lib/journey/voxel";

export type JourneyControls = {
  setStick: (x: number, y: number) => void;
  interact: () => void;
  goTo: (index: number) => void;
  skip: () => void;
  focus: () => void;
};
export type JourneyStatus = { chapter: number; age: number; nearby: string[] };
export type TransitionInfo = { to: number; direction: "forward" | "back" | "jump" };
type Props = {
  controls: RefObject<JourneyControls | null>;
  blocked: boolean;
  visited: ReadonlySet<string>;
  onStatus: (status: JourneyStatus) => void;
  onOpen: (id: string) => void;
  onTransition: (info: TransitionInfo | null) => void;
  onIntro: (playing: boolean) => void;
  onFinale: () => void;
  onMove: () => void;
};

const KEYS: Record<string, "up" | "down" | "left" | "right"> = {
  w: "up", arrowup: "up", s: "down", arrowdown: "down", a: "left", arrowleft: "left", d: "right", arrowright: "right",
};
const COVER = 0.6, HOLD = 1.9, REVEAL = 0.6, INTRO = 6, TURN_SPEED = 2.6;
const smooth = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
const stairHeight = (x: number) => x < -22 ? 8 : x < -6 ? 8 - Math.floor((x + 22) / 2) : 0;

/** The whole voxel world, rendered at a low internal resolution and scaled by a whole number so every pixel is the same size. */
export default function JourneyWorld(props: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coverRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  useEffect(() => { live.current = props; }, [props]);

  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current, coverCanvas = coverRef.current, tip = tipRef.current;
    if (!stage || !canvas || !coverCanvas || !tip) return;
    const region = stage, view = canvas, cover = coverCanvas, tooltip = tip;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas: view, antialias: false, powerPreference: "high-performance" });
    } catch {
      region.dataset.failed = "true";
      window.dispatchEvent(new Event("about-room-ready"));
      return;
    }
    renderer.outputColorSpace = LinearSRGBColorSpace;
    renderer.setPixelRatio(1);
    const scene = new Scene();
    const camera = new PerspectiveCamera(55, 1, 0.5, 900);
    const baseMaterial = new MeshBasicMaterial({ vertexColors: true });
    const geometries = new Map<string, BufferGeometry>();
    const owned: BufferGeometry[] = [];
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function modelGeometry(id: string) {
      let geometry = geometries.get(id);
      if (!geometry) {
        const grid = buildModel(id), b = grid.bounds(), f = modelFootprint(id);
        geometry = gridGeometry(grid, [f.minX - b.minX, 0, f.minZ - b.minZ]);
        geometries.set(id, geometry);
      }
      return geometry;
    }
    function place(p: Placement, material: MeshBasicMaterial) {
      const holder = new Group();
      holder.add(new Mesh(modelGeometry(p.model), material));
      holder.position.set(p.x, p.y ?? 0, p.z);
      holder.rotation.y = (p.rot ?? 0) * Math.PI / 2;
      return holder;
    }
    const markerGrid = new Grid();
    for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) if (Math.abs(x) + Math.abs(y) + Math.abs(z) <= 2) markerGrid.set(x, y, z, 0xffd84a);
    const markerGeometry = gridGeometry(markerGrid, [-0.5, -0.5, -0.5], 0);
    owned.push(markerGeometry);

    type ItemView = { material: MeshBasicMaterial; marker: Mesh; markerMaterial: MeshBasicMaterial; markerY: number };
    type RoomView = { group: Group; items: Map<string, ItemView>; pickables: Object3D[] };
    const rooms = new Map<number, RoomView>();
    function room(index: number): RoomView {
      const cached = rooms.get(index);
      if (cached) return cached;
      const chapter = CHAPTERS[index], group = new Group(), items = new Map<string, ItemView>(), pickables: Object3D[] = [];
      const shell = gridGeometry(buildRoomShell(index));
      owned.push(shell);
      group.add(new Mesh(shell, baseMaterial));
      for (const p of chapter.decor) group.add(place(p, baseMaterial));
      for (const item of chapter.items) {
        const material = baseMaterial.clone(), holder = place(item, material);
        holder.traverse(object => { object.userData.itemId = item.id; if (object instanceof Mesh) pickables.push(object); });
        group.add(holder);
        const box = placementBox(item), markerMaterial = new MeshBasicMaterial({ vertexColors: true });
        const marker = new Mesh(markerGeometry, markerMaterial);
        const markerY = Math.min(40, (item.y ?? 0) + modelFootprint(item.model).height + 5);
        marker.position.set((box.minX + box.maxX) / 2, markerY, (box.minZ + box.maxZ) / 2);
        group.add(marker);
        items.set(item.id, { material, marker, markerMaterial, markerY });
      }
      const view = { group, items, pickables };
      rooms.set(index, view);
      return view;
    }

    // Player
    const avatar = new Group(), body = new Group();
    avatar.add(body);
    const shadowGrid = new Grid();
    for (let x = -4; x < 4; x++) for (let z = -3; z < 3; z++) if ((x + 0.5) ** 2 / 16 + (z + 0.5) ** 2 / 9 <= 1) shadowGrid.set(x, 0, z, 0);
    const shadowGeometry = gridGeometry(shadowGrid, [0, -0.96, 0], 0);
    owned.push(shadowGeometry);
    const shadow = new Mesh(shadowGeometry, new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    avatar.add(shadow);
    const limbs = { legL: new Group(), legR: new Group(), armL: new Group(), armR: new Group(), head: new Group(), propeller: new Group() };
    Object.values(limbs).forEach(limb => body.add(limb));
    let parts: AvatarParts | null = null, avatarKey = "";
    const avatarGeometries: BufferGeometry[] = [];
    function setAvatar(age: number, outfit: typeof CHAPTERS[number]["outfit"]) {
      const key = `${age}-${outfit}`;
      if (key === avatarKey) return;
      avatarKey = key;
      avatarGeometries.splice(0).forEach(g => g.dispose());
      Object.values(limbs).forEach(limb => limb.clear());
      body.children.filter(child => !Object.values(limbs).includes(child as Group)).forEach(child => body.remove(child));
      const next = buildAvatar(age, outfit);
      parts = next;
      const mesh = (grid: Grid) => { const g = gridGeometry(grid, [0, 0, 0], 0.02); avatarGeometries.push(g); return new Mesh(g, baseMaterial); };
      const torsoTop = next.shoulder + 1;
      const torso = mesh(next.torso); torso.position.y = next.hip; body.add(torso);
      limbs.legL.add(mesh(next.legL)); limbs.legL.position.set(0, next.hip, 0);
      limbs.legR.add(mesh(next.legR)); limbs.legR.position.set(0, next.hip, 0);
      limbs.armL.add(mesh(next.armL)); limbs.armL.position.set(-next.shoulderX, torsoTop, 0);
      limbs.armR.add(mesh(next.armR)); limbs.armR.position.set(next.shoulderX, torsoTop, 0);
      limbs.head.add(mesh(next.head)); limbs.head.position.set(0, torsoTop + 1, 0);
      if (next.propeller) { limbs.propeller.add(mesh(next.propeller)); limbs.propeller.position.set(0, torsoTop + 1 + (next.propellerY ?? 0), 0); }
    }

    // State
    let chapter = 0, transition: (TransitionInfo & { t: number; switched: boolean }) | null = null;
    const player = { x: INTRO_END.x, z: INTRO_END.z, y: 0, yaw: Math.PI, vx: 0, vz: 0, phase: 0, moving: 0, age: 7 };
    let intro: { t: number } | null = motion.matches ? null : { t: 0 };
    const held = new Set<string>();
    const stick = { x: 0, y: 0 };
    let nearby: string | null = null, hovered: string | null = null, lastStatus = "", moved = false, disposed = false, readySent = false;
    const camPos = new Vector3(), camLook = new Vector3(), goalPos = new Vector3(), goalLook = new Vector3();
    const pointer = new Vector2(), raycaster = new Raycaster();
    let pointerDirty = false, pointerInside = false;
    let scale = 3;

    function enterRoom(index: number, from: "start" | "forward" | "back") {
      const previous = rooms.get(chapter);
      if (previous) scene.remove(previous.group);
      chapter = index;
      const next = room(index);
      scene.add(next.group);
      scene.background = new Color(CHAPTERS[index].background);
      const at = spawn(index, from);
      player.x = at.x; player.z = at.z; player.yaw = at.yaw; player.vx = 0; player.vz = 0; player.y = 0;
      player.age = ageAt(CHAPTERS[index], player.z);
      setAvatar(player.age, CHAPTERS[index].outfit);
      nearby = null; hovered = null; tooltip.hidden = true;
      snapCamera();
      const idle = (callback: () => void) => ("requestIdleCallback" in window ? window.requestIdleCallback(callback) : setTimeout(callback, 200));
      for (const neighbour of [index + 1, index - 1]) if (neighbour >= 0 && neighbour < CHAPTERS.length) idle(() => { if (!disposed) room(neighbour); });
    }

    function cameraGoal(pos: Vector3, look: Vector3) {
      // Over-the-shoulder: the camera turns with the character, so the room turns with you.
      const H = parts?.height ?? 20, aspect = camera.aspect, portrait = aspect < 1 ? 1 - aspect : 0;
      const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
      let dist = (24 + H * 0.9) * (1 + portrait * 0.6);
      const height = 10 + H * 0.95;
      // Pull the camera in rather than letting it pass through walls or big props.
      const full = dist;
      for (let t = 6; t <= dist; t += 1.5) if (blockedAt(chapter, player.x - fx * t, player.z - fz * t, 1.5)) { dist = Math.max(6, t - 1.5); break; }
      // When pulled in close, rise and look down past the character's head instead of filling the screen with it.
      const lift = (1 - dist / full) * H * 0.9;
      pos.set(player.x - fx * dist, player.y + height + lift, player.z - fz * dist);
      look.set(player.x + fx * 26, player.y + H * 0.5, player.z + fz * 26);
      const chapterNow = CHAPTERS[chapter];
      if (!chapterNow.outdoor) {
        const room = interior(chapterNow);
        pos.x = Math.max(room.minX + 1.5, Math.min(room.maxX - 1.5, pos.x));
        pos.z = Math.max(room.minZ + 1.5, Math.min(room.maxZ - 1.5, pos.z));
        pos.y = Math.min(WALL_HEIGHT - 2, pos.y);
      }
    }
    function snapCamera() { cameraGoal(camPos, camLook); camera.position.copy(camPos); camera.lookAt(camLook); }

    function resize() {
      const w = Math.max(1, region.clientWidth), h = Math.max(1, region.clientHeight);
      scale = Math.max(2, Math.round(Math.min(h / 230, w / 260)));
      const iw = Math.ceil(w / scale), ih = Math.ceil(h / scale);
      renderer.setSize(iw, ih, false);
      view.style.width = `${iw * scale}px`; view.style.height = `${ih * scale}px`;
      camera.aspect = iw / ih; camera.updateProjectionMatrix();
      const block = scale * 3;
      cover.width = Math.ceil(w / block); cover.height = Math.ceil(h / block);
      cover.style.width = `${cover.width * block}px`; cover.style.height = `${cover.height * block}px`;
    }

    /** Pixels sweep in from the bottom-left corner to the top-right, then clear in the same direction. */
    function drawCover(amount: number, revealing = false) {
      const ctx = cover.getContext("2d");
      if (!ctx) return;
      cover.style.visibility = amount <= 0 ? "hidden" : "visible";
      if (amount <= 0) return;
      const image = ctx.createImageData(cover.width, cover.height);
      for (let j = 0; j < cover.height; j++) for (let i = 0; i < cover.width; i++) {
        const threshold = hash3(i, j, 41) * 0.18 + ((i / cover.width) + (j / cover.height)) / 2 * 0.82;
        const k = (j * cover.width + i) * 4;
        const covered = revealing ? threshold >= 1 - amount : threshold < amount * 1.0001;
        if (covered) { image.data[k] = 11; image.data[k + 1] = 11; image.data[k + 2] = 14; image.data[k + 3] = 255; }
      }
      ctx.putImageData(image, 0, 0);
    }

    function startTransition(to: number, direction: TransitionInfo["direction"]) {
      if (transition || to < 0 || to >= CHAPTERS.length) return;
      held.clear(); stick.x = 0; stick.y = 0;
      if (intro) finishIntro();
      transition = { to, direction, t: motion.matches ? COVER : 0, switched: false };
      live.current.onTransition({ to, direction });
    }
    function finishTransition() {
      if (!transition) return;
      if (!transition.switched) enterRoom(transition.to, transition.direction === "back" ? "back" : "forward");
      transition = null;
      drawCover(0);
      live.current.onTransition(null);
    }
    function finishIntro() {
      if (!intro) return;
      intro = null;
      player.x = INTRO_END.x; player.z = INTRO_END.z; player.y = 0; player.yaw = Math.PI;
      snapCamera();
      live.current.onIntro(false);
    }

    function interact() {
      if (transition || intro || live.current.blocked) return;
      if (nearby) live.current.onOpen(nearby);
    }

    const control: JourneyControls = {
      setStick: (x, y) => { stick.x = x; stick.y = y; },
      interact,
      goTo: index => { if (index !== chapter || intro) startTransition(index, "jump"); },
      skip: () => { if (transition) finishTransition(); else if (intro) finishIntro(); },
      focus: () => region.focus({ preventScroll: true }),
    };
    const handle = live.current.controls;
    handle.current = control;

    function typing(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
    }
    function onKeyDown(event: KeyboardEvent) {
      if (live.current.blocked || typing(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (KEYS[key]) {
        if (key.startsWith("arrow")) event.preventDefault();
        if (!transition && !intro) held.add(KEYS[key]);
        return;
      }
      const onButton = (event.target as HTMLElement | null)?.closest?.("button, a");
      if (key === "e" || ((key === "enter" || key === " ") && !onButton)) { event.preventDefault(); interact(); }
      if (key === "escape" && (transition || intro)) { event.preventDefault(); control.skip(); }
    }
    function onKeyUp(event: KeyboardEvent) { const key = KEYS[event.key.toLowerCase()]; if (key) held.delete(key); }
    function clearInput() { held.clear(); stick.x = 0; stick.y = 0; }

    // Pointer: mouse hovers and clicks; touch swipes act as a floating joystick, taps open things.
    let drag: { id: number; x: number; y: number; moved: boolean; touch: boolean } | null = null;
    function setPointer(event: PointerEvent) {
      const rect = view.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      pointerDirty = true;
      tooltip.style.transform = `translate(${event.clientX - region.getBoundingClientRect().left + 14}px, ${event.clientY - region.getBoundingClientRect().top + 14}px)`;
    }
    function pick(): string | null {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(room(chapter).pickables, false)[0];
      return (hit?.object.userData.itemId as string | undefined) ?? null;
    }
    function onPointerDown(event: PointerEvent) {
      region.focus({ preventScroll: true });
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, touch: event.pointerType !== "mouse" };
      if (drag.touch) region.setPointerCapture(event.pointerId);
      setPointer(event);
    }
    function onPointerMove(event: PointerEvent) {
      if (event.pointerType === "mouse") { pointerInside = true; setPointer(event); }
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y, distance = Math.hypot(dx, dy);
      if (distance > 12) drag.moved = true;
      if (drag.touch && drag.moved && !transition && !intro && !live.current.blocked) {
        const reach = Math.min(1, distance / 70);
        stick.x = (dx / distance) * reach; stick.y = (dy / distance) * reach;
      }
    }
    function onPointerUp(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return;
      const wasTap = !drag.moved;
      if (drag.touch) { stick.x = 0; stick.y = 0; }
      drag = null;
      if (wasTap && !transition && !intro && !live.current.blocked) {
        setPointer(event);
        const id = pick();
        if (id) live.current.onOpen(id);
      }
    }
    function onPointerLeave() { pointerInside = false; hovered = null; tooltip.hidden = true; region.style.cursor = ""; }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearInput);
    region.addEventListener("pointerdown", onPointerDown);
    region.addEventListener("pointermove", onPointerMove);
    region.addEventListener("pointerup", onPointerUp);
    region.addEventListener("pointercancel", onPointerUp);
    region.addEventListener("pointerleave", onPointerLeave);
    const observer = new ResizeObserver(resize);
    observer.observe(region);
    resize();
    enterRoom(0, "start");
    if (intro) {
      player.x = -24; player.y = 8; player.yaw = Math.PI / 2;
      camPos.set(-2, 78, 86); camLook.set(-26, 6, -2);
      live.current.onIntro(true);
    }

    let frame = 0, previous = performance.now(), time = 0;
    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      const real = Math.min(0.25, Math.max(0, (now - previous) / 1000)), dt = Math.min(0.05, real);
      previous = now;
      if (document.hidden) return;
      time += dt;
      const current = CHAPTERS[chapter];
      const blockedNow = live.current.blocked;
      let speedNow = 0;

      if (intro) {
        intro.t += real;
        const t = intro.t;
        const walk = smooth((t - 1.6) / 3);
        player.x = -24 + (INTRO_END.x + 24) * walk;
        player.y = stairHeight(player.x);
        player.yaw = t < 4.6 ? Math.PI / 2 : Math.PI / 2 + (Math.PI / 2) * smooth((t - 4.6) / 0.8);
        speedNow = t > 1.6 && t < 4.6 ? 1 : 0;
        if (speedNow) player.phase += dt * 9;
        cameraGoal(goalPos, goalLook);
        const k = smooth((t - 1) / 4.4);
        camera.position.set(-2 + (goalPos.x + 2) * k, 78 + (goalPos.y - 78) * k, 86 + (goalPos.z - 86) * k);
        camLook.set(-26 + (goalLook.x + 26) * k, 6 + (goalLook.y - 6) * k, -2 + (goalLook.z + 2) * k);
        camera.lookAt(camLook);
        camPos.copy(camera.position);
        if (t >= INTRO) finishIntro();
      } else {
        // A/D turn, W/S walk along the way you face.
        let turn = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0) + stick.x;
        let move = (held.has("up") ? 1 : 0) - (held.has("down") ? 1 : 0) - stick.y;
        if (transition || blockedNow) { turn = 0; move = 0; }
        turn = Math.max(-1, Math.min(1, turn)); move = Math.max(-1, Math.min(1, move));
        player.yaw -= turn * TURN_SPEED * dt;
        const height = parts?.height ?? 20, speed = walkSpeed(height) * (move < 0 ? 0.65 : 1);
        if (Math.abs(move) > 0.05 || Math.abs(turn) > 0.05) { if (!moved) { moved = true; live.current.onMove(); } }
        if (Math.abs(move) > 0.05) {
          const blend = 1 - Math.exp(-dt * 14), fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
          player.vx += (fx * move * speed - player.vx) * blend; player.vz += (fz * move * speed - player.vz) * blend;
        } else { player.vx = 0; player.vz = 0; }
        speedNow = Math.max(Math.hypot(player.vx, player.vz) / speed, Math.abs(turn) * 0.35);
        if (Math.abs(turn) > 0.05 && Math.abs(move) <= 0.05) player.phase += dt * 6;
        if (Math.hypot(player.vx, player.vz) > 0.02) {
          const result = step(chapter, player, player.vx * dt, player.vz * dt, height >= 29 ? 3.5 : 3);
          const travelled = Math.hypot(result.x - player.x, result.z - player.z);
          player.x = result.x; player.z = result.z;
          player.phase += travelled * 0.45;
          if (result.exit === "next") {
            if (chapter < CHAPTERS.length - 1) startTransition(chapter + 1, "forward");
            else { player.z = interior(current).minZ + 5; player.vx = 0; player.vz = 0; held.clear(); live.current.onFinale(); }
          } else if (result.exit === "prev") startTransition(chapter - 1, "back");
          const age = ageAt(current, player.z);
          if (age !== player.age) { player.age = age; setAvatar(age, current.outfit); }
        }
        cameraGoal(goalPos, goalLook);
        const follow = 1 - Math.exp(-dt * 9);
        camPos.lerp(goalPos, follow); camLook.lerp(goalLook, follow);
        camera.position.copy(camPos); camera.lookAt(camLook);
      }

      if (transition) {
        transition.t += real;
        const reduced = motion.matches;
        if (!transition.switched && transition.t >= COVER) {
          enterRoom(transition.to, transition.direction === "back" ? "back" : "forward");
          transition.switched = true;
        }
        const t = transition.t;
        const total = COVER + HOLD + REVEAL;
        drawCover(reduced ? 0 : t < COVER ? t / COVER : t < COVER + HOLD ? 1 : 1 - (t - COVER - HOLD) / REVEAL, t >= COVER + HOLD);
        if (t >= total) finishTransition();
      }

      // Avatar pose
      avatar.position.set(player.x, player.y, player.z);
      avatar.rotation.y = player.yaw;
      shadow.position.y = 0.04 - player.y + (intro ? stairHeight(player.x) : 0);
      const swing = Math.sin(player.phase) * 0.75 * Math.min(1, speedNow * 1.4);
      limbs.legL.rotation.x = swing; limbs.legR.rotation.x = -swing;
      limbs.armL.rotation.x = -swing * 0.8; limbs.armR.rotation.x = swing * 0.8;
      body.position.y = Math.abs(Math.sin(player.phase)) * 0.7 * Math.min(1, speedNow * 1.4);
      limbs.propeller.rotation.y += dt * (6 + speedNow * 18);
      if (!avatar.parent) scene.add(avatar);

      // Nearby + hover highlights
      const nearList = intro || transition ? [] : nearbyItems(chapter, player).map(item => item.id);
      const near = nearList[0] ?? null;
      if (pointerDirty && pointerInside && !intro && !transition) {
        pointerDirty = false;
        hovered = pick();
        region.style.cursor = hovered ? "pointer" : "";
        const item = hovered ? current.items.find(i => i.id === hovered) : null;
        tooltip.hidden = !item;
        if (item) tooltip.textContent = item.label;
      }
      nearby = near;
      const visited = live.current.visited;
      for (const [id, item] of room(chapter).items) {
        const active = id === nearby || id === hovered;
        item.material.color.setScalar(active ? 1.32 : 1);
        item.markerMaterial.color.setScalar(visited.has(id) ? 0.45 : active ? 1.25 : 1);
        item.marker.position.y = item.markerY + (motion.matches ? 0 : Math.round(Math.sin(time * 3 + item.markerY) * 2) / 2);
        item.marker.rotation.y = motion.matches ? 0.6 : time * 1.6;
        item.marker.scale.setScalar(active ? 1.35 : 1);
      }
      const status = `${chapter}|${player.age}|${nearList.join(",")}`;
      if (status !== lastStatus) { lastStatus = status; live.current.onStatus({ chapter, age: player.age, nearby: nearList }); }

      renderer.render(scene, camera);
      if (!readySent) { readySent = true; region.dataset.ready = "true"; window.dispatchEvent(new Event("about-room-ready")); }
    }
    frame = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearInput);
      region.removeEventListener("pointerdown", onPointerDown);
      region.removeEventListener("pointermove", onPointerMove);
      region.removeEventListener("pointerup", onPointerUp);
      region.removeEventListener("pointercancel", onPointerUp);
      region.removeEventListener("pointerleave", onPointerLeave);
      if (handle.current === control) handle.current = null;
      geometries.forEach(g => g.dispose()); owned.forEach(g => g.dispose()); avatarGeometries.forEach(g => g.dispose());
      rooms.forEach(r => r.items.forEach(i => { i.material.dispose(); i.markerMaterial.dispose(); }));
      baseMaterial.dispose();
      renderer.dispose();
      delete region.dataset.ready;
    };
  }, []);

  return (
    <div ref={stageRef} className="journey-stage" tabIndex={0} role="application" aria-roledescription="3D world"
      aria-label="Xinge’s life, from age 7 to 18. Walk with W A S D or the arrow keys, press E to look at the nearest object, or use the journey index to read everything without playing." aria-describedby="journey-help">
      <canvas ref={canvasRef} className="journey-canvas" aria-hidden="true" />
      <canvas ref={coverRef} className="journey-cover" aria-hidden="true" />
      <div ref={tipRef} className="journey-tip" hidden aria-hidden="true" />
      <p className="journey-fallback">This part of the page needs WebGL. Use the journey index to read every chapter.</p>
    </div>
  );
}
