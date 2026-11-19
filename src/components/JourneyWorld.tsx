"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Box3, Color, DataTexture, GreaterDepth, Group, LinearSRGBColorSpace, Mesh, MeshBasicMaterial, NearestMipmapLinearFilter, PerspectiveCamera, PlaneGeometry, Ray, Raycaster, RepeatWrapping, Scene, Vector2, Vector3, WebGLRenderer, type BufferGeometry, type Object3D } from "three";
import { CHAPTERS, CSA_DJ_LINK, CSA_ROOM_INDEX, JOURNEY_ROOMS, WESTERN_INDEX, chapterAccent, type Placement, type Outfit } from "@/lib/journey/data";
import { CSA_GUESTS, makeCsaParty } from "@/lib/journey/csaParty";
import { buildModel, GLASS_OPACITY, isGlass, modelFootprint, modelHasGlass, modelVoxelSize } from "@/lib/journey/models";
import { AVATAR_VOXEL_SIZE, SHIRT_PRINT_VOXEL_SIZE, buildAvatar, type AvatarParts } from "@/lib/journey/avatar";
import { gridGeometry } from "@/lib/journey/mesh";
import { roomFromUrl, roomPath } from "@/lib/journey/navigation";
import { advanceRoommate, sampleRoommate } from "@/lib/journey/roommate";
import { makeRoommateView } from "@/lib/journey/roommateView";
import { ageAt, buildBallField, buildCutawayShell, buildDoorLeaf, buildGrassTile, buildJourneyArrow, bumpProp, cameraLookAhead, cameraOffsets, cutawayOpacity, doorwayOpening, interior, journeyArrows, jumpHeight, nearbyItems, placementBox, renderPixelSize, roomSide, settleBump, spawn, step, walkSpeed, AVATAR_SCALE, DOOR_HALF, DOOR_VOXEL_SIZE, GRASS_TILE_SIZE, INTRO_END, JUMP_DURATION, JUMP_HEIGHT, type BumpProp, type RoomArrival, type RoomSide, type Vec } from "@/lib/journey/world";
import { advanceVolley, kickBall, makeBall, pushBallFromMovingBlock, startVolley, stepBall, volleyAction, volleyPose, type Ball, type BallAction, type BallField, type BallKind, type VolleySequence } from "@/lib/journey/volleyball";
import { Grid, hash3 } from "@/lib/journey/voxel";

export type JourneyControls = {
  setStick: (x: number, y: number) => void;
  interact: () => void;
  jump: () => void;
  volley: () => void;
  goTo: (index: number) => void;
  visitCsa: () => void;
  leaveCsa: () => void;
  skip: () => void;
  focus: () => void;
  toggleCamera: (mode: keyof CameraMode) => void;
};
export type CameraMode = { front: boolean; tilt: boolean };
export type JourneyStatus = { chapter: number; age: number; nearby: string[]; volley?: BallAction; csaDjNearby?: boolean };
export type TransitionInfo = { to: number; direction: "forward" | "back" | "portal" };
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
  onCameraChange: (mode: CameraMode) => void;
};

const KEYS: Record<string, "up" | "down" | "left" | "right"> = {
  w: "up", arrowup: "up", s: "down", arrowdown: "down", a: "left", arrowleft: "left", d: "right", arrowright: "right",
};
const COVER = 0.6, HOLD = 1.9, REVEAL = 0.6, INTRO = 6, TURN_SPEED = 2.8;
const smooth = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
const stairHeight = (x: number) => x < -22 ? 8 : x < -6 ? 8 - Math.floor((x + 22) / 2) : 0;
const transitionArrival = (direction: TransitionInfo["direction"]): RoomArrival =>
  direction === "back" || direction === "portal" ? direction : "forward";

/** The whole voxel world, rendered with a uniform screen pixel pitch. */
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
    const scene = new Scene(), avatarScene = new Scene();
    const camera = new PerspectiveCamera(48, 1, 0.5, 900);
    const baseMaterial = new MeshBasicMaterial({ vertexColors: true });
    const glassMaterial = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: GLASS_OPACITY, depthWrite: false });
    const occludedMaterial = new MeshBasicMaterial({ vertexColors: true, opacity: 0.22, transparent: true, depthWrite: false, depthFunc: GreaterDepth });
    const coverContext = cover.getContext("2d");
    let coverImage: ImageData | undefined, coverThresholds = new Float32Array(0), coverPattern = new Float32Array(0), lastCover = "";
    const geometries = new Map<string, BufferGeometry>();
    const owned: BufferGeometry[] = [];
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const grassTexture = new DataTexture(buildGrassTile(), GRASS_TILE_SIZE, GRASS_TILE_SIZE);
    grassTexture.wrapS = grassTexture.wrapT = RepeatWrapping;
    grassTexture.repeat.setScalar(24);
    grassTexture.generateMipmaps = true;
    grassTexture.minFilter = NearestMipmapLinearFilter;
    grassTexture.needsUpdate = true;
    const grass = new Mesh(new PlaneGeometry(2304, 2304), new MeshBasicMaterial({ map: grassTexture }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.15;
    grass.visible = false;
    scene.add(grass);
    owned.push(grass.geometry);

    function modelGeometry(id: string, glass = false) {
      const key = glass ? `${id}:glass` : id;
      let geometry = geometries.get(key);
      if (!geometry) {
        const grid = buildModel(id), b = grid.bounds(), f = modelFootprint(id), size = modelVoxelSize(id);
        geometry = gridGeometry(grid, [f.minX - b.minX * size, 0, f.minZ - b.minZ * size], 0.035, size, modelHasGlass(id) ? color => isGlass(color) === glass : undefined);
        geometries.set(key, geometry);
      }
      return geometry;
    }
    function place(p: Placement, material: MeshBasicMaterial) {
      const holder = new Group();
      holder.add(new Mesh(modelGeometry(p.model), material));
      if (modelHasGlass(p.model)) holder.add(new Mesh(modelGeometry(p.model, true), glassMaterial));
      holder.position.set(p.x, p.y ?? 0, p.z);
      holder.rotation.y = (p.rot ?? 0) * Math.PI / 2;
      return holder;
    }
    const markerGrid = new Grid();
    for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) for (let z = -4; z <= 4; z++) {
      if (Math.abs(x) + Math.abs(y) + Math.abs(z) <= 4) markerGrid.set(x, y, z, y >= 2 ? 0xffef9e : y < -1 ? 0xe5ac41 : 0xffd84a);
    }
    const markerGeometry = gridGeometry(markerGrid, [-0.25, -0.25, -0.25], 0, 0.5);
    const arrowGeometry = gridGeometry(buildJourneyArrow(), [-0.25, 0, 0], 0, 0.5);
    const arrowMaterial = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false });
    owned.push(markerGeometry, arrowGeometry);

    type ItemView = { material: MeshBasicMaterial; marker: Mesh; markerMaterial: MeshBasicMaterial; markerY: number };
    type PropView = { holder: Group; bounds: Box3; material: MeshBasicMaterial; glass?: MeshBasicMaterial; wall?: RoomSide; visibility: number };
    type ReactiveView = { prop: PropView; state: BumpProp; pivot: number };
    type BallView = { prop: PropView; state: Ball; kind: BallKind };
    type Volley = { ball: BallView; sequence: VolleySequence };
    type DoorView = { z: number; side: "front" | "back"; leaves: [Mesh, Mesh]; open: number };
    type WallView = { group: Group; material: MeshBasicMaterial };
    type RoommateView = ReturnType<typeof makeRoommateView> & { prop: PropView; fridge: PropView };
    type RoomView = { group: Group; items: Map<string, ItemView>; props: PropView[]; reactive: ReactiveView[]; balls: BallView[]; itemPositions: Map<string, Ball | Vector3>; field?: BallField; doors: DoorView[]; route: Mesh[]; pickables: Object3D[]; walls: Record<RoomSide, WallView>; roommate?: RoommateView; party?: ReturnType<typeof makeCsaParty> };
    const rooms = new Map<number, RoomView>();
    function setOpacity(material: MeshBasicMaterial, opacity: number) {
      material.opacity = opacity;
      const transparent = opacity < 1;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.depthWrite = !transparent;
        material.needsUpdate = true;
      }
    }

    function room(index: number): RoomView {
      const cached = rooms.get(index);
      if (cached) return cached;
      const chapter = JOURNEY_ROOMS[index], group = new Group(), items = new Map<string, ItemView>(), pickables: Object3D[] = [];
      const isParty = index === CSA_ROOM_INDEX;
      const wall = (): WallView => ({ group: new Group(), material: baseMaterial.clone() });
      const walls = { left: wall(), right: wall(), front: wall(), back: wall() };
      const shell = buildCutawayShell(index), bounds = interior(chapter);
      const addShell = (target: Group, grid: Grid, material = baseMaterial) => {
        if (!grid.size) return;
        const geometry = gridGeometry(grid);
        owned.push(geometry);
        target.add(new Mesh(geometry, material));
      };
      addShell(group, shell.fixed);
      for (const side of Object.keys(walls) as RoomSide[]) {
        group.add(walls[side].group);
        addShell(walls[side].group, shell.walls[side], walls[side].material);
      }
      const leafGeometry = gridGeometry(buildDoorLeaf(chapter), [0, 0, 0], 0.02, DOOR_VOXEL_SIZE);
      owned.push(leafGeometry);
      const sides: DoorView["side"][] = isParty ? ["back"] : chapter.outdoor ? ["front"] : ["front", "back"];
      const doors = sides.map((side): DoorView => {
        const z = side === "front" ? bounds.minZ - 0.5 : bounds.maxZ + 0.5;
        const left = new Mesh(leafGeometry, walls[side].material), right = new Mesh(leafGeometry, walls[side].material);
        left.position.set(-DOOR_HALF, 0, z);
        right.position.set(DOOR_HALF, 0, z);
        right.scale.x = -1;
        walls[side].group.add(left, right);
        return { z, side, leaves: [left, right], open: 0 };
      });
      const wallFor = (p: Placement) =>
        !p.ball && !chapter.outdoor && p.solid === false && (p.y ?? 0) >= 7 ? roomSide(bounds, p.x, p.z, 4) ?? undefined : undefined;
      const props: PropView[] = [], reactive: ReactiveView[] = [], balls: BallView[] = [], itemPositions = new Map<string, Ball | Vector3>();
      const addProp = (p: Placement) => {
        const material = baseMaterial.clone(), holder = place(p, material);
        const glass = modelHasGlass(p.model) ? glassMaterial.clone() : undefined;
        if (glass) (holder.children[1] as Mesh).material = glass;
        const bounds = new Box3().setFromObject(holder);
        if (!bounds.isEmpty()) bounds.expandByScalar(1);
        const wall = wallFor(p);
        const prop = { holder, bounds, material, glass, wall, visibility: 1 };
        props.push(prop);
        (wall ? walls[wall].group : group).add(holder);
        if (p.bump) {
          const size = modelFootprint(p.model), pivot = p.bump === "roll" ? size.height / 2 : 0;
          holder.position.y += pivot;
          for (const child of holder.children) child.position.y -= pivot;
          const radius = Math.max(size.maxX - size.minX, size.maxZ - size.minZ) / 2;
          reactive.push({ prop, pivot, state: { x: p.x, z: p.z, kind: p.bump, radius, vx: 0, vz: 0, fall: null, tilt: 0 } });
        }
        if (p.ball) {
          const size = modelFootprint(p.model);
          const state = makeBall(p.x, p.y ?? 0, p.z, size.height / 2);
          holder.position.y = state.y;
          holder.children[0].position.set(-(size.maxX + size.minX) / 2, -state.radius, -(size.maxZ + size.minZ) / 2);
          balls.push({ prop, state, kind: p.ball });
          bounds.setFromObject(holder).expandByScalar(1);
        }
        return prop;
      };
      for (const p of chapter.decor) addProp(p);
      const spec = chapter.roommate, fridge = chapter.items.find(item => item.id === spec?.fridge), pad = chapter.items.find(item => item.id === spec?.pad);
      let roommate: RoommateView | undefined;
      const fridgeProp = fridge && addProp(fridge);
      if (spec && fridge && fridgeProp && pad) {
        const material = baseMaterial.clone();
        const npc = makeRoommateView(spec, fridge, pad, fridgeProp.holder, fridgeProp.material, material, (grid, size, paint = baseMaterial) => {
          const geometry = gridGeometry(grid, [0, 0, 0], 0.015, size);
          owned.push(geometry);
          return new Mesh(geometry, paint);
        });
        const prop = { holder: npc.holder, material, bounds: npc.bounds, visibility: 1 };
        group.add(npc.group);
        props.push(prop);
        roommate = { ...npc, prop, fridge: fridgeProp };
        itemPositions.set(spec.id, npc.holder.position);
      }
      for (const item of chapter.items) {
        const { holder, material, wall } = item.id === roommate?.id ? roommate.prop : item.id === fridge?.id && fridgeProp ? fridgeProp : addProp(item);
        holder.traverse(object => { object.userData.itemId = item.id; if (object instanceof Mesh) pickables.push(object); });
        if (item.ball) itemPositions.set(item.id, balls[balls.length - 1].state);
        const parent = wall ? walls[wall].group : group;
        const box = placementBox(item), markerMaterial = new MeshBasicMaterial({ vertexColors: true });
        const marker = new Mesh(markerGeometry, markerMaterial);
        const markerY = Math.min(40, (item.y ?? 0) + modelFootprint(item.model).height + 5);
        marker.position.set((box.minX + box.maxX) / 2, markerY, (box.minZ + box.maxZ) / 2);
        parent.add(marker);
        items.set(item.id, { material, marker, markerMaterial, markerY });
      }
      const field = balls.length ? buildBallField(index) : undefined;
      if (roommate) field?.blocks.push(roommate.ballBlock);
      const route = journeyArrows(index).map(({ x, z }) => {
        const arrow = new Mesh(arrowGeometry, arrowMaterial);
        arrow.position.set(x, 3.4, z);
        group.add(arrow);
        return arrow;
      });
      if (!isParty) {
        const exitArrow = new Mesh(arrowGeometry, arrowMaterial);
        exitArrow.rotation.set(Math.PI / 2, Math.PI, 0);
        exitArrow.position.set(0, 24, bounds.minZ + 3);
        exitArrow.scale.setScalar(1.15);
        group.add(exitArrow);
        route.push(exitArrow);
      }
      const party = isParty ? makeCsaParty(baseMaterial, walls.front.material) : undefined;
      if (party) {
        group.add(party.group);
        walls.front.group.add(party.stageWall);
        pickables.push(...party.djPickables);
      }
      const view = { group, items, props, reactive, balls, itemPositions, field, doors, route, pickables, walls, roommate, party };
      rooms.set(index, view);
      return view;
    }

    // Player
    const avatar = new Group(), body = new Group();
    avatar.add(body);
    avatarScene.add(avatar);
    avatar.scale.setScalar(AVATAR_SCALE);
    const shadowGrid = new Grid();
    for (let x = -4; x < 4; x++) for (let z = -3; z < 3; z++) if ((x + 0.5) ** 2 / 16 + (z + 0.5) ** 2 / 9 <= 1) shadowGrid.set(x, 0, z, 0);
    const shadowGeometry = gridGeometry(shadowGrid, [0, -0.96, 0], 0);
    owned.push(shadowGeometry);
    const shadow = new Mesh(shadowGeometry, new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    scene.add(shadow);
    shadow.scale.setScalar(AVATAR_SCALE);
    const limbs = { legL: new Group(), legR: new Group(), armL: new Group(), armR: new Group(), head: new Group(), propeller: new Group() };
    Object.values(limbs).forEach(limb => body.add(limb));
    const elbowL = new Group(), elbowR = new Group();
    let parts: AvatarParts | null = null, avatarKey = "";
    const avatarGeometries: BufferGeometry[] = [];
    function setAvatar(age: number, outfit: Outfit) {
      const key = `${age}-${outfit}`;
      if (key === avatarKey) return;
      avatarKey = key;
      avatarGeometries.splice(0).forEach(g => g.dispose());
      Object.values(limbs).forEach(limb => limb.clear());
      body.children.filter(child => !Object.values(limbs).includes(child as Group)).forEach(child => body.remove(child));
      const next = buildAvatar(age, outfit);
      parts = next;
      const mesh = (grid: Grid, size = AVATAR_VOXEL_SIZE) => { const g = gridGeometry(grid, [0, 0, 0], 0.02, size); avatarGeometries.push(g); return new Mesh(g, baseMaterial); };
      const torsoTop = next.shoulder + 1;
      const torso = mesh(next.torso); torso.position.y = next.hip; body.add(torso);
      if (next.shirtPrint) torso.add(mesh(next.shirtPrint, SHIRT_PRINT_VOXEL_SIZE));
      limbs.legL.add(mesh(next.legL)); limbs.legL.position.set(0, next.hip, 0);
      limbs.legR.add(mesh(next.legR)); limbs.legR.position.set(0, next.hip, 0);
      for (const [limb, elbow, grid, side] of [[limbs.armL, elbowL, next.armL, -1], [limbs.armR, elbowR, next.armR, 1]] as const) {
        limb.position.set(side * next.shoulderX, torsoTop, 0);
        if (outfit !== "western" && outfit !== "stussy") {
          limb.add(mesh(grid));
          continue;
        }
        const upper = new Grid(), lower = new Grid(), hinge = Math.round(grid.bounds().minY / 2);
        grid.forEach((x, y, z, color) => {
          if (y >= hinge) upper.set(x, y, z, color);
          else lower.set(x, y - hinge, z, color);
        });
        elbow.clear();
        elbow.position.y = hinge * AVATAR_VOXEL_SIZE;
        elbow.add(mesh(lower));
        limb.add(mesh(upper), elbow);
      }
      limbs.head.add(mesh(next.head)); limbs.head.position.set(0, torsoTop + 1, 0);
      if (next.propeller) { limbs.propeller.add(mesh(next.propeller)); limbs.propeller.position.set(0, torsoTop + 1 + (next.propellerY ?? 0), 0); }
    }

    // State
    const initialRoom = roomFromUrl(window.location.href);
    let chapter = initialRoom ?? 0, transition: (TransitionInfo & { t: number; switched: boolean }) | null = null;
    const player = { x: INTRO_END.x, z: INTRO_END.z, y: 0, yaw: Math.PI, vx: 0, vz: 0, spin: 0, phase: 0, age: 7 };
    let intro: { t: number } | null = initialRoom === null && !motion.matches ? { t: 0 } : null;
    const held = new Set<string>();
    const stick = { x: 0, y: 0 }, gesture = { x: 0, y: 0 };
    let nearby: string | null = null, hovered: string | null = null, lastStatus = "", moved = false, disposed = false, readySent = false;
    let volley: Volley | null = null, kickPose = 0, jumpElapsed: number | null = null;
    const camAnchor = new Vector3(), camLook = new Vector3(), goalPos = new Vector3(), goalLook = new Vector3();
    let camYaw = player.yaw;
    let cameraMode: CameraMode = { front: false, tilt: false };
    let frontBlend = 0, tiltBlend = 0;
    const pointer = new Vector2(), raycaster = new Raycaster();
    let pointerDirty = false, pointerInside = false;

    function rememberRoom() {
      const path = roomPath(window.location.href, chapter);
      if (path) window.history.replaceState(null, "", path);
    }

    function enterRoom(index: number, from: RoomArrival) {
      const previous = rooms.get(chapter);
      if (previous) scene.remove(previous.group);
      chapter = index;
      const next = room(index);
      scene.add(next.group);
      const current = JOURNEY_ROOMS[index];
      scene.background = new Color(current.background);
      grass.visible = !current.outdoor;
      grass.material.color.setHex(index === WESTERN_INDEX || index === CSA_ROOM_INDEX ? 0x77889c : 0xffffff, LinearSRGBColorSpace);
      const at = spawn(index, from);
      player.x = at.x; player.z = at.z; player.yaw = at.yaw; player.vx = 0; player.vz = 0; player.spin = 0; player.y = 0;
      player.age = ageAt(current, player.z);
      setAvatar(player.age, current.outfit);
      nearby = null; hovered = null; tooltip.hidden = true;
      volley = null; kickPose = 0; jumpElapsed = null;
      snapCamera();
      updateDoors(1);
      if (readySent) rememberRoom();
      const idle = (callback: () => void) => ("requestIdleCallback" in window ? window.requestIdleCallback(callback) : setTimeout(callback, 200));
      for (const neighbour of [index + 1, index - 1]) if (neighbour >= 0 && neighbour < CHAPTERS.length) idle(() => { if (!disposed) room(neighbour); });
    }

    function cameraGoal(pos: Vector3, look: Vector3, x: number, y: number, z: number, yaw: number) {
      const height = (parts?.height ?? 20) * AVATAR_SCALE;
      const view = cameraOffsets(height, camera.aspect, frontBlend, tiltBlend);
      const fx = Math.sin(yaw + view.orbit), fz = Math.cos(yaw + view.orbit);
      pos.set(x - fx * view.distance, y + view.rise, z - fz * view.distance);
      const current = JOURNEY_ROOMS[chapter];
      const lead = current.outdoor ? view.lead : cameraLookAhead(interior(current), { x, z }, { x: fx, z: fz }, view.lead);
      look.set(x + fx * lead, y + view.lookHeight, z + fz * lead);
    }
    function snapCamera() {
      camAnchor.set(player.x, player.y, player.z);
      camYaw = player.yaw;
      frontBlend = Number(cameraMode.front);
      tiltBlend = Number(cameraMode.tilt);
      cameraGoal(camera.position, camLook, camAnchor.x, camAnchor.y, camAnchor.z, camYaw);
      camera.lookAt(camLook);
    }

    function updateCutaway() {
      const current = JOURNEY_ROOMS[chapter];
      const opacity = cutawayOpacity(interior(current), camera.position);
      const walls = room(chapter).walls;
      for (const side of Object.keys(walls) as RoomSide[]) {
        walls[side].group.visible = opacity[side] > 0;
        setOpacity(walls[side].material, opacity[side]);
      }
    }

    function updateDoors(ease: number) {
      for (const door of room(chapter).doors) {
        const target = doorwayOpening(door.z, player);
        door.open += (target - door.open) * ease;
        if (Math.abs(target - door.open) < 0.001) door.open = target;
        const swing = door.open * Math.PI / 2 * (door.side === "front" ? 1 : -1);
        door.leaves[0].rotation.y = swing;
        door.leaves[1].rotation.y = -swing;
      }
    }

    const rollAxis = new Vector3();
    function updateBumps(dt: number) {
      for (const { prop: { holder, bounds }, state, pivot } of room(chapter).reactive) {
        const x = state.x, z = state.z, tilt = state.tilt;
        if (!state.vx && !state.vz && (!state.fall || tilt === Math.PI / 2)) continue;
        settleBump(chapter, state, dt, motion.matches);
        if (state.fall && tilt !== state.tilt) {
          const { x: dx, z: dz } = state.fall;
          holder.setRotationFromAxisAngle(rollAxis.set(dz, 0, -dx), state.tilt);
          holder.position.y = state.radius * (Math.abs(dx) + Math.abs(dz)) * Math.sin(state.tilt);
        } else if (state.x !== x || state.z !== z) {
          const dx = state.x - x, dz = state.z - z;
          holder.position.set(state.x, pivot, state.z);
          holder.rotateOnWorldAxis(rollAxis.set(dz, 0, -dx).normalize(), Math.hypot(dx, dz) / pivot);
        }
        bounds.setFromObject(holder).expandByScalar(1);
      }
    }

    function nextVolley() {
      const activeRoom = room(chapter), height = (parts?.height ?? 20) * AVATAR_SCALE;
      let best: { ball: BallView; action: BallAction; score: number } | undefined;
      if (!activeRoom.field || volley || jumpElapsed !== null) return;
      for (const ball of activeRoom.balls) {
        const action = volleyAction(ball.kind, ball.state, player, height, activeRoom.field);
        if (!action) continue;
        const score = Math.hypot(ball.state.x - player.x, ball.state.z - player.z);
        if (!best || score < best.score) best = { ball, action, score };
      }
      return best;
    }

    function playVolley() {
      if (intro || transition || live.current.blocked || !parts) return;
      const next = nextVolley(), field = room(chapter).field;
      if (!next || !field) return;
      const { state } = next.ball;
      const dx = state.x - player.x, dz = state.z - player.z, distance = Math.hypot(dx, dz);
      if (distance > 0.5) {
        const delta = Math.atan2(dx, dz) - player.yaw;
        player.yaw += Math.atan2(Math.sin(delta), Math.cos(delta));
      }
      player.vx = player.vz = player.spin = 0;
      const forward = { x: Math.sin(player.yaw), z: Math.cos(player.yaw) };
      volley = { ball: next.ball, sequence: startVolley(next.action, state, player, forward, (parts.shoulder + 1) * AVATAR_SCALE, field) };
    }

    function updateVolleyballs(dt: number, activeRoom: RoomView) {
      if (!activeRoom.field) return;
      const field = activeRoom.field;
      for (const ball of activeRoom.balls) {
        const { state, prop: { holder, bounds } } = ball;
        const x = state.x, y = state.y, z = state.z;
        if (volley?.ball === ball) {
          if (advanceVolley(volley.sequence, state, field, dt)) volley = null;
        } else {
          const actor = activeRoom.roommate?.ballBlock;
          if (actor) pushBallFromMovingBlock(state, field, actor);
          if (!state.grounded || state.y > state.radius || state.vx || state.vz || state.kickDelay) stepBall(state, field, dt);
        }
        const dx = state.x - x, dz = state.z - z, travel = Math.hypot(dx, dz);
        if (travel || state.y !== y) {
          holder.position.set(state.x, state.y, state.z);
          if (travel && !motion.matches) holder.rotateOnWorldAxis(rollAxis.set(dz, 0, -dx).normalize(), Math.min(travel / state.radius, dt * (state.grounded ? 18 : 7)));
          bounds.setFromObject(holder).expandByScalar(1);
          pointerDirty = true;
        }
      }
    }

    const sightlines = [new Ray(), new Ray(), new Ray()];
    const sightDistances = [0, 0, 0], hitPoint = new Vector3();
    function fadeForeground(dt: number) {
      const height = (parts?.height ?? 20) * AVATAR_SCALE;
      for (let i = 0; i < sightlines.length; i++) {
        const ray = sightlines[i];
        ray.origin.copy(camera.position);
        ray.direction.set(player.x, player.y + height * (0.1 + 0.4 * i), player.z).sub(ray.origin);
        sightDistances[i] = ray.direction.lengthSq();
        ray.direction.normalize();
      }
      const ease = motion.matches ? 1 : 1 - Math.exp(-dt * 22);
      const { props, walls } = room(chapter);
      for (const prop of props) {
        const { holder, bounds, material, glass, wall } = prop;
        const obscures = !intro && !wall && (bounds.containsPoint(camera.position) ||
          sightlines.some((ray, i) => ray.intersectBox(bounds, hitPoint) && hitPoint.distanceToSquared(ray.origin) < sightDistances[i]));
        const target = obscures ? 0 : 1;
        const blended = prop.visibility + (target - prop.visibility) * ease;
        prop.visibility = Math.abs(blended - target) < 0.01 ? target : blended;
        const opacity = prop.visibility * (wall ? walls[wall].material.opacity : 1);
        setOpacity(material, opacity);
        holder.visible = opacity > 0;
        if (glass) glass.opacity = GLASS_OPACITY * opacity;
        const faded = opacity < 0.5;
        if (faded !== !!holder.userData.faded) {
          holder.userData.faded = faded;
          pointerDirty = true;
        }
      }
    }

    function resize() {
      const w = Math.max(1, region.clientWidth), h = Math.max(1, region.clientHeight);
      const scale = renderPixelSize(w, h);
      const iw = Math.ceil(w / scale), ih = Math.ceil(h / scale);
      renderer.setSize(iw, ih, false);
      view.style.width = `${iw * scale}px`; view.style.height = `${ih * scale}px`;
      camera.aspect = iw / ih; camera.updateProjectionMatrix();
      const block = Math.max(2, scale * 3);
      cover.width = Math.ceil(w / block); cover.height = Math.ceil(h / block);
      cover.style.width = `${cover.width * block}px`; cover.style.height = `${cover.height * block}px`;
      coverImage = coverContext?.createImageData(cover.width, cover.height);
      coverThresholds = new Float32Array(cover.width * cover.height);
      coverPattern = new Float32Array(coverThresholds.length);
      for (let j = 0; j < cover.height; j++) for (let i = 0; i < cover.width; i++) {
        const pixel = j * cover.width + i, diagonal = i / cover.width + (cover.height - 1 - j) / cover.height;
        coverThresholds[pixel] = hash3(i, j, 41) * 0.17 + diagonal * 0.41;
        const tile = hash3(i >> 2, j >> 2, 19);
        const band = (i - j + cover.height) % 26 < 2 ? 0.09 : 0;
        coverPattern[pixel] = band + tile * 0.045 + 0.105 * (1 - Math.min(1, Math.abs(i / cover.width - 0.48) * 2));
      }
      lastCover = "";
    }

    /** Pixels sweep in from the bottom-left corner to the top-right, then clear in the same direction. */
    function drawCover(amount: number, revealing = false) {
      if (!coverContext || !coverImage) return;
      const key = `${amount}:${revealing}`;
      if (lastCover === key) return;
      lastCover = key;
      cover.style.visibility = amount <= 0 ? "hidden" : "visible";
      if (amount <= 0) return;
      const accent = chapterAccent(transition?.to ?? chapter);
      const r = (accent >> 16) & 255, g = (accent >> 8) & 255, b = accent & 255;
      const boundary = revealing ? 1 - amount : amount;
      const animatedEdge = amount < 1;
      for (let i = 0; i < coverThresholds.length; i++) {
        const threshold = coverThresholds[i], k = i * 4, delta = revealing ? threshold - boundary : boundary - threshold;
        const edge = animatedEdge && delta >= 0 ? Math.max(0, 1 - delta * 32) * 0.7 : 0;
        const tone = coverPattern[i] + edge;
        coverImage.data[k] = 7 + r * tone; coverImage.data[k + 1] = 8 + g * tone; coverImage.data[k + 2] = 13 + b * tone;
        coverImage.data[k + 3] = delta >= 0 ? 255 : 0;
      }
      coverContext.putImageData(coverImage, 0, 0);
    }

    function startTransition(to: number, direction: TransitionInfo["direction"]) {
      if (transition || to < 0 || to >= JOURNEY_ROOMS.length) return;
      clearInput();
      if (intro) finishIntro();
      transition = { to, direction, t: motion.matches ? COVER : 0, switched: false };
      live.current.onTransition({ to, direction });
    }
    function finishTransition() {
      if (!transition) return;
      if (!transition.switched) enterRoom(transition.to, transitionArrival(transition.direction));
      transition = null;
      drawCover(0);
      live.current.onTransition(null);
    }
    function finishIntro() {
      if (!intro) return;
      intro = null;
      player.x = INTRO_END.x; player.z = INTRO_END.z; player.y = 0; player.yaw = Math.PI;
      snapCamera();
      rememberRoom();
      live.current.onIntro(false);
    }

    function interact() {
      if (transition || intro || live.current.blocked) return;
      if (nearby) live.current.onOpen(nearby);
      else if (room(chapter).party?.nearDj(player)) openCsaDj();
    }

    function openCsaDj() { window.open(CSA_DJ_LINK.href, "_blank", "noopener,noreferrer"); }

    function jump() {
      if (transition || intro || live.current.blocked || volley || jumpElapsed !== null) return;
      jumpElapsed = 0;
      kickPose = 0;
      if (!moved) { moved = true; live.current.onMove(); }
    }

    const control: JourneyControls = {
      setStick: (x, y) => { stick.x = x; stick.y = y; },
      interact,
      jump,
      volley: playVolley,
      goTo: index => {
        if (transition || !JOURNEY_ROOMS[index]) return;
        clearInput();
        if (intro) finishIntro();
        if (index !== chapter) enterRoom(index, "forward");
      },
      visitCsa: () => { if (chapter !== CSA_ROOM_INDEX) startTransition(CSA_ROOM_INDEX, "portal"); },
      leaveCsa: () => { if (chapter === CSA_ROOM_INDEX) startTransition(WESTERN_INDEX, "portal"); },
      skip: () => { if (transition) finishTransition(); else if (intro) finishIntro(); },
      focus: () => region.focus({ preventScroll: true }),
      toggleCamera: mode => {
        if (transition || intro || live.current.blocked) return;
        cameraMode = { ...cameraMode, [mode]: !cameraMode[mode] };
        live.current.onCameraChange(cameraMode);
        onPointerLeave();
      },
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
      if (key === "q" || key === "f") {
        if (!event.repeat) control.toggleCamera(key === "q" ? "tilt" : "front");
        return;
      }
      if (key === "r" && !event.repeat) playVolley();
      if (key === " " && !onButton) {
        event.preventDefault();
        if (!event.repeat) jump();
      }
      if (key === "e" || (key === "enter" && !onButton)) { event.preventDefault(); interact(); }
      if (key === "escape" && (transition || intro)) { event.preventDefault(); control.skip(); }
    }
    function onKeyUp(event: KeyboardEvent) { const key = KEYS[event.key.toLowerCase()]; if (key) held.delete(key); }
    function clearInput() {
      held.clear();
      stick.x = 0; stick.y = 0; gesture.x = 0; gesture.y = 0;
      if (drag) region.style.cursor = "";
      drag = null;
    }

    let drag: { id: number; x: number; y: number; moved: boolean } | null = null;
    function setPointer(event: PointerEvent) {
      const rect = view.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      pointerDirty = true;
      tooltip.style.transform = `translate(${event.clientX - region.getBoundingClientRect().left + 14}px, ${event.clientY - region.getBoundingClientRect().top + 14}px)`;
    }
    function pick(): Object3D | undefined {
      camera.updateMatrixWorld();
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(room(chapter).pickables, false).find(({ object }) => {
        for (let node: Object3D | null = object; node; node = node.parent) if (!node.visible || node.userData.faded) return false;
        return true;
      });
      return hit?.object;
    }
    function onPointerDown(event: PointerEvent) {
      if (drag || event.button !== 0 || transition || intro || live.current.blocked) return;
      region.focus({ preventScroll: true });
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      region.setPointerCapture(event.pointerId);
      setPointer(event);
    }
    function onPointerMove(event: PointerEvent) {
      if (event.pointerType === "mouse" && !drag?.moved) { pointerInside = true; setPointer(event); }
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y, distance = Math.hypot(dx, dy);
      const deadZone = event.pointerType === "touch" ? 12 : 9;
      if (distance > deadZone) drag.moved = true;
      if (drag.moved && !transition && !intro && !live.current.blocked) {
        onPointerLeave();
        region.style.cursor = "grabbing";
        const scale = Math.min(1, Math.max(0, (distance - deadZone) / 48)) / (distance || 1);
        gesture.x = dx * scale; gesture.y = dy * scale;
      }
    }
    function endPointer(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return;
      const wasTap = event.type === "pointerup" && !drag.moved;
      gesture.x = 0; gesture.y = 0;
      drag = null;
      region.style.cursor = "";
      if (wasTap && !transition && !intro && !live.current.blocked) {
        setPointer(event);
        const hit = pick();
        if (hit?.userData.csaDj) openCsaDj();
        else if (hit?.userData.itemId) live.current.onOpen(hit.userData.itemId);
      }
    }
    function onPointerLeave() { pointerInside = false; hovered = null; tooltip.hidden = true; region.style.cursor = ""; }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearInput);
    region.addEventListener("pointerdown", onPointerDown);
    region.addEventListener("pointermove", onPointerMove);
    region.addEventListener("pointerup", endPointer);
    region.addEventListener("pointercancel", endPointer);
    region.addEventListener("lostpointercapture", endPointer);
    region.addEventListener("pointerleave", onPointerLeave);
    const observer = new ResizeObserver(resize);
    observer.observe(region);
    resize();
    enterRoom(chapter, "start");
    if (intro) {
      player.x = -24; player.y = 8; player.yaw = Math.PI / 2;
      live.current.onIntro(true);
    }

    let frame = 0, previous = performance.now(), time = 0;
    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      const real = Math.min(0.25, Math.max(0, (now - previous) / 1000)), dt = Math.min(0.05, real);
      previous = now;
      if (document.hidden) return;
      time += dt;
      const current = JOURNEY_ROOMS[chapter];
      const blockedNow = live.current.blocked;
      let speedNow = 0, jumpLift = 0;

      if (intro) {
        intro.t += real;
        const t = intro.t;
        const walk = smooth((t - 1.6) / 3);
        player.x = -24 + (INTRO_END.x + 24) * walk;
        player.y = stairHeight(player.x);
        player.yaw = t < 4.6 ? Math.PI / 2 : Math.PI / 2 + (Math.PI / 2) * smooth((t - 4.6) / 0.8);
        speedNow = t > 1.6 && t < 4.6 ? 4 * walk * (1 - walk) : 0;
        player.phase += dt * speedNow * 14;
        cameraGoal(goalPos, goalLook, player.x, player.y, player.z, player.yaw);
        const k = smooth((t - 1) / 4.4);
        camera.position.set(-2 + (goalPos.x + 2) * k, 78 + (goalPos.y - 78) * k, 86 + (goalPos.z - 86) * k);
        camLook.set(-26 + (goalLook.x + 26) * k, 6 + (goalLook.y - 6) * k, -2 + (goalLook.z + 2) * k);
        camera.lookAt(camLook);
        if (t >= INTRO) finishIntro();
      } else {
        if (jumpElapsed !== null) {
          if (!blockedNow) jumpElapsed += dt;
          jumpLift = jumpHeight(jumpElapsed);
          if (jumpElapsed >= JUMP_DURATION) jumpElapsed = null;
        }
        // A/D turn, W/S walk along the way you face.
        let turn = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0) + stick.x + gesture.x;
        let move = (held.has("up") ? 1 : 0) - (held.has("down") ? 1 : 0) - stick.y - gesture.y;
        if (transition || blockedNow || volley) {
          turn = 0; move = 0;
          player.vx = 0; player.vz = 0; player.spin = 0;
        }
        turn = Math.max(-1, Math.min(1, turn)); move = Math.max(-1, Math.min(1, move));
        player.spin += (turn * TURN_SPEED - player.spin) * (1 - Math.exp(-dt * 10));
        player.yaw -= player.spin * dt;
        const height = parts?.height ?? 20, speed = walkSpeed(height * AVATAR_SCALE) * (move < 0 ? 0.65 : 1);
        if (Math.abs(move) > 0.05 || Math.abs(turn) > 0.05) { if (!moved) { moved = true; live.current.onMove(); } }
        if (Math.abs(move) > 0.05) {
          const blend = 1 - Math.exp(-dt * 14), fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
          player.vx += (fx * move * speed - player.vx) * blend; player.vz += (fz * move * speed - player.vz) * blend;
        } else { const stop = Math.exp(-dt * 18); player.vx *= stop; player.vz *= stop; }
        speedNow = Math.max(Math.hypot(player.vx, player.vz) / speed, Math.abs(turn) * 0.35);
        if (Math.abs(turn) > 0.05 && Math.abs(move) <= 0.05) player.phase += dt * 6;
        if (Math.hypot(player.vx, player.vz) > 0.02) {
          const radius = (height >= 29 ? 3.5 : 3) * AVATAR_SCALE;
          const { roommate: npc, party } = room(chapter);
          const collider = npc ? (from: Vec, to: Vec, r: number) => npc.blocks(from, to, r, npc.pose) : party?.blocks;
          const result = step(chapter, player, player.vx * dt, player.vz * dt, radius, collider);
          const movement = { x: result.x - player.x, z: result.z - player.z };
          player.x = result.x; player.z = result.z;
          for (const { state } of room(chapter).reactive) bumpProp(state, result, movement, radius, dt);
          for (const ball of room(chapter).balls) {
            if (jumpElapsed === null && volley?.ball !== ball && kickBall(ball.state, player, movement, radius, dt)) kickPose = 0.28;
          }
          player.phase += Math.hypot(movement.x, movement.z) * 0.45;
          if (result.exit === "party") startTransition(CSA_ROOM_INDEX, "portal");
          else if (result.exit === "next") {
            if (chapter < CHAPTERS.length - 1) startTransition(chapter + 1, "forward");
            else { player.z = interior(current).minZ + 5; player.vx = 0; player.vz = 0; held.clear(); live.current.onFinale(); }
          } else if (result.exit === "prev") {
            if (chapter === CSA_ROOM_INDEX) startTransition(WESTERN_INDEX, "portal");
            else startTransition(chapter - 1, "back");
          }
          const age = ageAt(current, player.z);
          if (age !== player.age) { player.age = age; setAvatar(age, current.outfit); }
        }
        const follow = motion.matches ? 1 : 1 - Math.exp(-dt * 12);
        camAnchor.x += (player.x - camAnchor.x) * follow;
        camAnchor.y += (player.y + (motion.matches ? 0 : jumpLift * 0.5) - camAnchor.y) * follow;
        camAnchor.z += (player.z - camAnchor.z) * follow;
        camYaw += (player.yaw - camYaw) * follow;
        const orbitEase = motion.matches ? 1 : 1 - Math.exp(-dt * 9);
        frontBlend += (Number(cameraMode.front) - frontBlend) * orbitEase;
        tiltBlend += (Number(cameraMode.tilt) - tiltBlend) * follow;
        cameraGoal(camera.position, camLook, camAnchor.x, camAnchor.y, camAnchor.z, camYaw);
        camera.lookAt(camLook);
      }

      if (transition) {
        transition.t += real;
        const reduced = motion.matches;
        if (!transition.switched && transition.t >= COVER) {
          enterRoom(transition.to, transitionArrival(transition.direction));
          jumpLift = 0;
          transition.switched = true;
        }
        const t = transition.t;
        const total = COVER + HOLD + REVEAL;
        drawCover(reduced ? 0 : t < COVER ? smooth(t / COVER) : t < COVER + HOLD ? 1 : 1 - smooth((t - COVER - HOLD) / REVEAL), t >= COVER + HOLD);
        if (t >= total) finishTransition();
      }

      const activeRoom = room(chapter);
      activeRoom.party?.update(!blockedNow && !transition ? dt : 0, motion.matches, player);
      if (!transition && !blockedNow && !intro) {
        kickPose = Math.max(0, kickPose - dt);
        const npc = activeRoom.roommate;
        if (npc && (!motion.matches || npc.time !== 0)) {
          const time = motion.matches ? 0 : advanceRoommate(npc.routine, npc.time, dt, player, 3.5 * AVATAR_SCALE);
          if (time !== npc.time) {
            const previous = npc.pose;
            npc.time = time;
            npc.pose = sampleRoommate(npc.routine, time);
            const turn = npc.pose.yaw - npc.yaw;
            npc.yaw += Math.atan2(Math.sin(turn), Math.cos(turn)) * (motion.matches ? 1 : 1 - Math.exp(-dt * 16));
            npc.markerY = npc.apply(npc.pose, npc.yaw);
            if (npc.pose.door !== previous.door) npc.fridge.bounds.setFromObject(npc.fridge.holder).expandByScalar(1);
          }
        }
        updateVolleyballs(dt, activeRoom);
      }

      // Avatar pose
      avatar.position.set(player.x, player.y + jumpLift, player.z);
      avatar.rotation.y = player.yaw;
      shadow.position.set(player.x, 0.02 + (intro ? stairHeight(player.x) : 0), player.z);
      shadow.rotation.y = player.yaw;
      const swing = Math.sin(player.phase) * 0.75 * Math.min(1, speedNow * 1.4);
      limbs.legL.rotation.x = swing; limbs.legR.rotation.x = -swing;
      limbs.armL.rotation.x = -swing * 0.8; limbs.armR.rotation.x = swing * 0.8;
      body.position.y = Math.abs(Math.sin(player.phase)) * 0.7 * Math.min(1, speedNow * 1.4);
      body.rotation.y = elbowL.rotation.x = elbowR.rotation.x = 0;
      limbs.armL.rotation.z = limbs.armR.rotation.z = limbs.head.rotation.x = 0;
      if (volley) {
        const { action, elapsed } = volley.sequence;
        const pose = volleyPose(action, elapsed, motion.matches);
        limbs.armL.rotation.set(pose.left, 0, pose.leftRoll);
        limbs.armR.rotation.set(pose.right, 0, pose.rightRoll);
        elbowL.rotation.x = pose.leftElbow; elbowR.rotation.x = pose.rightElbow;
        limbs.legL.rotation.x = pose.legs; limbs.legR.rotation.x = pose.legs;
        limbs.head.rotation.x = pose.head;
        body.rotation.y = pose.twist;
        body.position.y = pose.lift / AVATAR_SCALE;
      } else if (jumpLift > 0 && !motion.matches) {
        const tuck = jumpLift / JUMP_HEIGHT;
        limbs.legL.rotation.x = -0.58 * tuck;
        limbs.legR.rotation.x = 0.32 * tuck;
        limbs.armL.rotation.x = -0.36 * tuck;
        limbs.armR.rotation.x = -0.36 * tuck;
        body.position.y = 0;
      } else if (kickPose && !motion.matches) {
        limbs.legR.rotation.x = -1.04 * Math.sin(Math.PI * kickPose / 0.28);
        limbs.armL.rotation.x -= 0.22;
      }
      limbs.propeller.rotation.y += dt * (6 + speedNow * 18);
      updateCutaway();
      updateDoors(motion.matches ? 1 : 1 - Math.exp(-dt * 16));
      if (!transition && !blockedNow) updateBumps(dt);
      fadeForeground(dt);
      activeRoom.route.forEach((arrow, i) => {
        const atDoor = i === activeRoom.route.length - 1;
        arrow.visible = !intro && !transition && !blockedNow && arrow.position.z < player.z + (atDoor ? 3 : -1);
        const y = atDoor ? 24 : 3.4;
        arrow.position.y = y + (motion.matches ? 0 : Math.sin(time * 3 - i * 0.75) * 0.55);
      });

      // Nearby + hover highlights
      const npc = activeRoom.roommate;
      let nearList = intro || transition ? [] : nearbyItems(chapter, player, undefined, undefined, activeRoom.itemPositions).map(item => item.id);
      if (!intro && !transition && npc && Math.hypot(player.x - npc.pose.x, player.z - npc.pose.z) <= 8) {
        nearList = [npc.id, ...nearList.filter(id => id !== npc.id)].slice(0, 3);
      }
      const action = intro || transition || blockedNow ? undefined : nextVolley()?.action;
      const near = nearList[0] ?? null;
      if (pointerDirty && pointerInside && !intro && !transition) {
        pointerDirty = false;
        const hit = pick();
        hovered = hit?.userData.itemId ?? null;
        const label = hit?.userData.csaDj ? CSA_DJ_LINK.label : current.items.find(i => i.id === hovered)?.label;
        region.style.cursor = label ? "pointer" : "";
        tooltip.hidden = !label;
        if (label) tooltip.textContent = label;
      }
      nearby = near;
      const visited = live.current.visited;
      for (const [id, item] of room(chapter).items) {
        const active = id === nearby || id === hovered;
        item.material.color.setScalar(active ? 1.32 : 1);
        item.marker.visible = active && item.material.opacity >= 0.5;
        item.markerMaterial.color.setScalar(visited.has(id) ? 0.45 : active ? 1.25 : 1);
        const pos = activeRoom.itemPositions.get(id);
        if (npc && id === npc.id) item.marker.position.set(npc.pose.x, npc.markerY, npc.pose.z);
        else if (pos && "radius" in pos) item.marker.position.set(pos.x, pos.y + pos.radius + 4, pos.z);
        else item.marker.position.y = item.markerY;
        item.marker.position.y += motion.matches ? 0 : Math.round(Math.sin(time * 3 + item.markerY) * 2) / 2;
        item.marker.rotation.y = motion.matches ? 0.6 : time * 1.6;
        item.marker.scale.setScalar(0.65);
      }
      const csaDjNearby = activeRoom.party?.nearDj(player);
      const status = `${chapter}|${player.age}|${nearList.join(",")}|${action ?? ""}|${csaDjNearby ?? ""}`;
      if (status !== lastStatus) { lastStatus = status; live.current.onStatus({ chapter, age: player.age, nearby: nearList, volley: action, csaDjNearby }); }

      renderer.render(scene, camera);
      // Show the avatar through foreground props without drawing it solidly in front of them.
      renderer.autoClear = false;
      avatarScene.overrideMaterial = occludedMaterial;
      renderer.render(avatarScene, camera);
      avatarScene.overrideMaterial = null;
      renderer.render(avatarScene, camera);
      renderer.autoClear = true;
      if (!readySent) {
        readySent = true;
        if (!intro) rememberRoom();
        region.dataset.ready = "true";
        window.dispatchEvent(new Event("about-room-ready"));
      }
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
      region.removeEventListener("pointerup", endPointer);
      region.removeEventListener("pointercancel", endPointer);
      region.removeEventListener("lostpointercapture", endPointer);
      region.removeEventListener("pointerleave", onPointerLeave);
      if (handle.current === control) handle.current = null;
      geometries.forEach(g => g.dispose()); owned.forEach(g => g.dispose()); avatarGeometries.forEach(g => g.dispose());
      rooms.forEach(r => {
        r.props.forEach(p => { p.material.dispose(); p.glass?.dispose(); });
        r.items.forEach(i => i.markerMaterial.dispose());
        Object.values(r.walls).forEach(wall => wall.material.dispose());
        r.party?.dispose();
      });
      shadow.material.dispose();
      grass.material.dispose();
      grassTexture.dispose();
      occludedMaterial.dispose();
      glassMaterial.dispose();
      arrowMaterial.dispose();
      baseMaterial.dispose();
      renderer.dispose();
      delete region.dataset.ready;
    };
  }, []);

  return (
    <div ref={stageRef} className="journey-stage" tabIndex={0} role="application" aria-roledescription="3D world"
      aria-label="Xinge’s life, from age 7 to 18" aria-describedby="journey-help">
      <canvas ref={canvasRef} className="journey-canvas" aria-hidden="true" />
      <canvas ref={coverRef} className="journey-cover" aria-hidden="true" />
      <div ref={tipRef} className="journey-tip" hidden aria-hidden="true" />
      <div className="journey-fallback">
        <p>The 3D walk needs WebGL, so here is every stop as a list.</p>
        {CHAPTERS.map(entry => (
          <section key={entry.id}>
            <h2>{entry.stop}{entry.stopNote ? ` · ${entry.stopNote}` : ""}</h2>
            <ul>{entry.items.map(item => (
              <li key={item.id}><strong>{item.label}{item.description ? ":" : ""}</strong> {item.description}{item.links?.map(link => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"> {link.label} ↗</a>
              ))}{item.video && <a href={item.video.src}> Watch {item.video.label}</a>}</li>
            ))}</ul>
          </section>
        ))}
        <section>
          <h2>CSA After Hours</h2>
          <p>A hidden dance room behind the CSA poster. Rain Li DJs for {CSA_GUESTS.filter(guest => !guest.dj).map(guest => guest.name).join(", ")}.</p>
          <a href={CSA_DJ_LINK.href} target="_blank" rel="noopener noreferrer">{CSA_DJ_LINK.label} ↗</a>
        </section>
      </div>
    </div>
  );
}
