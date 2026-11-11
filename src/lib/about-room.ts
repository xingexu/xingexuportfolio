/** A small pixel room drawn only with integer-aligned, solid-color rectangles. */
export const ROOM_FRAME_MS = 125;
export const ROOM_LOOP_FRAMES = 64;
export const ROOM_CELL = 4;

const P = {
  black: "#090c0e", wall: "#13191c", joint: "#192024", grain: "#1c2529",
  shade: "#20292d", dark: "#2b363b", mid: "#455156", light: "#73817f",
  silver: "#a2ada5", white: "#d3d7c8", screen: "#121c1b", code: "#6b8477",
} as const;

export function drawAboutRoom(ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) {
  const tick = ((frame % ROOM_LOOP_FRAMES) + ROOM_LOOP_FRAMES) % ROOM_LOOP_FRAMES;
  const mobile = width < 160;
  const deskY = Math.round(height * (width < 266 ? .86 : .79));
  const floorY = deskY + 13;
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color: string) => {
    let x = Math.round(x1), y = Math.round(y1);
    const endX = Math.round(x2), endY = Math.round(y2);
    const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
    const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      r(x, y, 1, 1, color);
      if (x === endX && y === endY) break;
      const next = error * 2;
      if (next >= dy) { error += dy; x += sx; }
      if (next <= dx) { error += dx; y += sy; }
    }
  };
  const shelf = (x: number, y: number, w: number) => {
    r(x, y, w, 2, P.mid); r(x, y + 2, w, 3, P.dark);
    r(x + 4, y + 5, 2, 5, P.shade); r(x + w - 6, y + 5, 2, 5, P.shade);
  };
  const book = (x: number, y: number, w: number, h: number, color: string) => {
    r(x, y - h, w, h, color); r(x + 1, y - h + 2, w - 2, 1, P.silver);
    r(x + 1, y - 3, w - 2, 1, P.shade);
  };
  const frameOnWall = (x: number, y: number, w: number, h: number) => {
    r(x + 1, y + 1, w, h, P.black); r(x, y, w, h, P.mid);
    r(x + 1, y + 1, w - 2, h - 2, P.silver); r(x + 3, y + 3, w - 6, h - 6, P.dark);
  };
  const monitor = (x: number, y: number, w: number, h: number) => {
    r(x + 1, y, w - 2, h, P.light); r(x, y + 1, w, h - 2, P.light);
    r(x + 1, y + 1, w - 2, h - 2, P.mid);
    r(x + 3, y + 3, w - 6, h - 8, P.black); r(x + 4, y + 4, w - 8, h - 10, P.screen);
    r(x + 4, y + h - 4, 2, 1, P.silver); r(x + w - 5, y + h - 4, 1, 1, tick < 48 ? P.white : P.light);
    r(x + Math.floor(w / 2) - 2, y + h, 4, 4, P.dark);
    r(x + Math.floor(w / 2) - 8, y + h + 4, 16, 2, P.mid);
    // A tiny editor: sidebar, line numbers and stepped code lengths.
    r(x + 5, y + 5, 5, h - 12, P.shade);
    for (let i = 0; i < 5; i++) {
      r(x + 6, y + 7 + i * 3, 2, 1, P.mid);
      r(x + 12 + (i % 2) * 2, y + 7 + i * 3, Math.min(w - 19, [13, 8, 17, 11, 6][i]), 1, i === 0 ? P.silver : P.code);
    }
    if (tick % 8 < 4) r(x + 21, y + 19, 2, 1, P.white);
  };
  const keyboard = (x: number, y: number, w: number) => {
    r(x + 1, y, w - 2, 1, P.light); r(x, y + 1, w, 7, P.mid);
    for (let row = 0; row < 2; row++) for (let col = 0; col < Math.floor((w - 4) / 3); col++) r(x + 2 + col * 3, y + 2 + row * 2, 2, 1, P.silver);
    r(x + Math.floor(w / 2) - 5, y + 6, 10, 1, P.silver);
  };

  r(0, 0, width, height, P.wall);
  // Subtle wall texture is hand-distributed by a repeatable integer pattern.
  for (let y = 19; y < floorY; y += 11) for (let x = 4; x < width; x += 13) {
    const quiet = x > width * .23 && x < width * .77 && y > height * .22 && y < height * .72;
    if (!quiet && (x * 7 + y * 3) % 5 === 0) r(x, y, 2, 1, P.joint);
  }
  r(0, 15, width, 1, P.joint);
  r(0, floorY - 3, width, 2, P.dark); r(0, floorY - 1, width, 1, P.black);
  r(0, floorY, width, height - floorY, P.shade);
  for (let y = floorY + 7, row = 0; y < height; y += 8, row++) {
    r(0, y, width, 1, P.black);
    for (let x = row % 2 ? 18 : 0; x < width; x += 38) r(x, y - 7, 1, 7, P.dark);
  }

  // A shelf of books and a small speaker, left of the open wall used for copy.
  const shelfX = mobile ? 5 : 12;
  const shelfY = mobile ? 30 : 38;
  shelf(shelfX, shelfY, mobile ? 27 : 45);
  book(shelfX + 3, shelfY, 4, 13, P.dark);
  book(shelfX + 8, shelfY, 3, 16, P.mid);
  book(shelfX + 12, shelfY, 4, 14, P.light);
  book(shelfX + 17, shelfY, 3, 11, P.mid);
  if (!mobile) {
    book(shelfX + 22, shelfY, 4, 15, P.dark);
    r(shelfX + 31, shelfY - 14, 10, 14, P.black);
    r(shelfX + 32, shelfY - 13, 8, 12, P.dark);
    r(shelfX + 35, shelfY - 11, 2, 2, P.silver);
    r(shelfX + 34, shelfY - 7, 4, 4, P.mid); r(shelfX + 35, shelfY - 6, 2, 2, P.black);
  }

  // A small volleyball-court print and another shelf on the right.
  const printX = width - (mobile ? 22 : 50);
  const printY = 24;
  frameOnWall(printX, printY, mobile ? 14 : 22, mobile ? 18 : 28);
  const courtX = printX + (mobile ? 4 : 6), courtY = printY + (mobile ? 4 : 6);
  const courtW = mobile ? 6 : 10, courtH = mobile ? 10 : 16;
  r(courtX, courtY, courtW, courtH, P.shade);
  r(courtX, courtY, courtW, 1, P.light); r(courtX, courtY + courtH - 1, courtW, 1, P.light);
  r(courtX, courtY, 1, courtH, P.light); r(courtX + courtW - 1, courtY, 1, courtH, P.light);
  r(courtX, courtY + Math.floor(courtH / 2), courtW, 1, P.silver);
  if (!mobile) {
    shelf(width - 65, 65, 48);
    r(width - 60, 61, 14, 4, P.mid); r(width - 59, 60, 11, 1, P.silver);
    book(width - 40, 65, 4, 12, P.dark); book(width - 35, 65, 5, 15, P.mid);
    book(width - 29, 65, 3, 13, P.light);
  }

  // A low checker rug under the desk, drawn in a few flat shades.
  const rugX = Math.round(width * .29), rugW = Math.round(width * .42);
  r(rugX, floorY + 6, rugW, 18, P.mid);
  r(rugX + 1, floorY + 7, rugW - 2, 16, P.dark);
  for (let y = 0; y < 3; y++) for (let x = 0; x < Math.floor((rugW - 4) / 5); x++) {
    if ((x + y) % 2 === 0) r(rugX + 2 + x * 5, floorY + 8 + y * 4, 5, 4, P.shade);
  }

  const left = mobile ? 4 : 10, right = width - left;
  // Wooden desktop, drawers, supports, and a few deliberately placed grain pixels.
  r(left + 3, deskY + 8, 4, 24, P.black); r(left + 4, deskY + 8, 2, 22, P.mid);
  r(right - 16, deskY + 8, 13, 24, P.black);
  r(right - 15, deskY + 8, 11, 22, P.dark);
  for (let i = 0; i < 3; i++) { r(right - 15, deskY + 9 + i * 7, 11, 1, P.mid); r(right - 11, deskY + 12 + i * 7, 3, 1, P.light); }
  r(left, deskY, right - left, 3, P.light); r(left - 1, deskY + 3, right - left + 2, 4, P.mid);
  r(left, deskY + 7, right - left, 2, P.dark);
  for (let x = left + 4; x < right - 5; x += 23) r(x, deskY + 1, 6, 1, P.silver);

  const monitorX = mobile ? 8 : 14;
  const monitorW = mobile ? 35 : Math.min(49, Math.floor(width * .16));
  monitor(monitorX, deskY - 37, monitorW, 30);
  keyboard(monitorX + 1, deskY - 2, mobile ? 28 : 35);
  r(monitorX + monitorW + 4, deskY - 2, 5, 5, P.silver); r(monitorX + monitorW + 6, deskY - 2, 1, 2, P.dark);

  // Desk lamp, including a stepped arm and shade rather than a smooth polygon.
  if (width >= 266) {
    const lampX = Math.round(width * .23);
    r(lampX - 7, deskY - 2, 14, 2, P.dark);
    line(lampX, deskY - 3, lampX - 4, deskY - 19, P.light);
    line(lampX - 4, deskY - 19, lampX + 4, deskY - 29, P.light);
    r(lampX + 2, deskY - 30, 8, 2, P.silver);
    r(lampX, deskY - 28, 12, 2, P.light); r(lampX - 2, deskY - 26, 16, 2, P.mid);
    r(lampX - 1, deskY - 24, 14, 1, tick === 32 ? P.light : P.white);
  }

  // A desktop tower with a pixel fan, drive slots and a tiny activity light.
  const pcX = right - (mobile ? 26 : 34);
  r(pcX, deskY - 38, 23, 38, P.black); r(pcX + 1, deskY - 37, 21, 36, P.dark);
  r(pcX + 3, deskY - 35, 17, 2, P.mid); r(pcX + 4, deskY - 34, 8, 1, P.black);
  r(pcX + 4, deskY - 29, 15, 1, P.mid);
  r(pcX + 7, deskY - 23, 9, 1, P.light); r(pcX + 5, deskY - 21, 2, 8, P.light);
  r(pcX + 16, deskY - 21, 2, 8, P.light); r(pcX + 7, deskY - 12, 9, 1, P.light);
  r(pcX + 9, deskY - 19, 5, 5, P.mid);
  if (Math.floor(tick / 8) % 2) { r(pcX + 7, deskY - 18, 9, 2, P.silver); r(pcX + 10, deskY - 21, 2, 8, P.silver); }
  else { for (let i = 0; i < 7; i++) { r(pcX + 8 + i, deskY - 20 + i, 1, 1, P.silver); r(pcX + 8 + i, deskY - 14 - i, 1, 1, P.silver); } }
  r(pcX + 5, deskY - 6, 12, 1, P.mid);
  r(pcX + 18, deskY - 5, 1, 1, tick % 16 < 12 ? P.silver : P.mid);

  if (!mobile) {
    // A chessboard and mug sit between the monitor and computer.
    const boardX = Math.round(width * .55);
    r(boardX - 1, deskY - 5, 34, 9, P.black);
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) r(boardX + col * 4, deskY - 4 + row, 4, 1, (row + col) % 2 ? P.mid : P.silver);
    const mugX = Math.round(width * .72);
    r(mugX, deskY - 10, 7, 9, P.silver); r(mugX + 1, deskY - 9, 5, 2, P.black);
    r(mugX + 7, deskY - 8, 3, 5, P.light); r(mugX + 7, deskY - 7, 2, 3, P.wall);
    const steam = [0, 1, 2, 1][Math.floor(tick / 16)];
    r(mugX + 2, deskY - 14 - steam, 1, 2, P.mid); r(mugX + 3, deskY - 17 - steam, 1, 2, P.dark);
  }
}
