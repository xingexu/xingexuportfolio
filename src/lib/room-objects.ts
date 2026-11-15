import type { Point, Rect } from "./life-world";

export type RoomObject = {
  id: string; label: string; title: string; description: string;
  position: Point; areas: Rect[]; detail: Rect; accent: string;
};

// Shared geometry drives pointer hits, keyboard proximity, the map, and close-ups.
export const ROOM_OBJECTS: RoomObject[] = [
  {
    id: "first-home", label: "Chessboard", title: "My first moves.",
    description: "18 Holsworthy was my first house in Markham, Ontario. This is where I learned to play chess.",
    position: { x: 370, y: 488 }, areas: [{ x: 312, y: 336, w: 116, h: 110 }],
    detail: { x: 306, y: 329, w: 128, h: 124 }, accent: "#d8bd76",
  },
  {
    id: "room-lego", label: "LEGO sets", title: "Piece by piece.",
    description: "The LEGO sets in my childhood room. Little builds, spare bricks, and a whole shelf of possibilities.",
    position: { x: 258, y: 343 },
    areas: [{ x: 117, y: 259, w: 145, h: 47 }, { x: 234, y: 378, w: 42, h: 42 }, { x: 237, y: 443, w: 39, h: 41 }],
    detail: { x: 112, y: 253, w: 155, h: 58 }, accent: "#e39363",
  },
  {
    id: "room-posters", label: "Star Wars posters", title: "A galaxy on my wall.",
    description: "Star Wars posters were part of my room, right above the chessboard.",
    position: { x: 450, y: 312 }, areas: [{ x: 277, y: 202, w: 89, h: 86 }, { x: 395, y: 202, w: 89, h: 86 }],
    detail: { x: 271, y: 196, w: 219, h: 98 }, accent: "#e8c56c",
  },
  {
    id: "room-computer", label: "Computer", title: "One more game of agar.io.",
    description: "The computer in my room, with agar.io on screen. Tiny cells, colourful pellets, and a bigger cell to watch out for.",
    position: { x: 550, y: 411 }, areas: [{ x: 551, y: 277, w: 120, h: 79 }, { x: 549, y: 358, w: 117, h: 20 }, { x: 700, y: 322, w: 24, h: 62 }, { x: 584, y: 399, w: 40, h: 47 }],
    detail: { x: 545, y: 271, w: 131, h: 111 }, accent: "#9bc9b7",
  },
  {
    id: "room-candy", label: "Candy", title: "The sweet corner.",
    description: "A little stash of candy, right beside the computer.",
    position: { x: 681, y: 406 }, areas: [{ x: 668, y: 345, w: 29, h: 25 }],
    detail: { x: 663, y: 337, w: 40, h: 39 }, accent: "#e4a7bc",
  },
  {
    id: "room-badminton", label: "Badminton rackets", title: "Away from the screen.",
    description: "My badminton rackets, hanging in the room and ready for a game.",
    position: { x: 714, y: 306 }, areas: [{ x: 692, y: 211, w: 40, h: 85 }],
    detail: { x: 685, y: 204, w: 52, h: 97 }, accent: "#b8c9d4",
  },
  {
    id: "room-bed", label: "Bed", title: "My little corner.",
    description: "A closer look at the bed, its blue quilt, and the LEGO beside it.",
    position: { x: 180, y: 486 }, areas: [{ x: 118, y: 305, w: 110, h: 155 }],
    detail: { x: 111, y: 303, w: 122, h: 163 }, accent: "#9ebdcc",
  },
  {
    id: "room-window", label: "Window", title: "A little daylight.",
    description: "The window above the LEGO shelf, with afternoon light falling into the room.",
    position: { x: 242, y: 309 }, areas: [{ x: 112, y: 200, w: 134, h: 74 }],
    detail: { x: 106, y: 194, w: 146, h: 85 }, accent: "#c6d9aa",
  },
];
export const roomObjectById = (id: string) => ROOM_OBJECTS.find(object => object.id === id);
export function roomObjectAt(point: Point) {
  return ROOM_OBJECTS.find(object => object.areas.some(area => point.x >= area.x && point.x <= area.x + area.w && point.y >= area.y && point.y <= area.y + area.h)) ?? null;
}
export function nearbyRoomObject(point: Point) {
  const nearest = ROOM_OBJECTS.reduce((best, object) => Math.hypot(point.x-object.position.x, point.y-object.position.y) < Math.hypot(point.x-best.position.x, point.y-best.position.y) ? object : best);
  return Math.hypot(point.x-nearest.position.x, point.y-nearest.position.y) <= 52 ? nearest : null;
}
