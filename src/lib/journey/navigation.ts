import { JOURNEY_ROOMS } from "./data";

export function roomFromUrl(href: string): number | null {
  const id = new URL(href).searchParams.get("room");
  const index = JOURNEY_ROOMS.findIndex(room => room.id === id);
  return index < 0 ? null : index;
}

export function roomPath(href: string, index: number): string | null {
  const room = JOURNEY_ROOMS[index];
  if (!room) return null;
  const url = new URL(href);
  const previous = url.searchParams.getAll("room");
  if (previous.length === 1 && previous[0] === room.id) return null;
  url.searchParams.set("room", room.id);
  return url.pathname + url.search + url.hash;
}
