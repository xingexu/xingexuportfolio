import { Grid, shade } from "./voxel";

export const FAN_VOXEL_SIZE = 0.25;
const AXIS_CELL = 17, TAU = 2 * Math.PI;
export const FAN_AXIS_Y = AXIS_CELL * FAN_VOXEL_SIZE;

export function buildWuzuFanParts() {
  const white = 0xe6e5dc, trim = 0xb1b8b9, dark = 0x404a55;
  const base = new Grid(), cage = new Grid(), rotor = new Grid();
  for (let x = -11; x < 11; x++) for (let z = -9; z < 9; z++) {
    const r = Math.hypot((x + 0.5) / 11, (z + 0.5) / 9);
    if (r <= 1) base.box(x, 0, z, 1, r < 0.84 ? 4 : 3, 1, z > 2 ? white : shade(white, 0.91));
  }
  base.box(-5, 4, -3, 10, 5, 6, trim).box(-4, 8, -3, 8, 2, 6, white);
  base.box(-2, 4, 5, 4, 1, 2, dark).box(2, 4, 5, 1, 1, 2, 0x89cabe);
  for (let x = -11; x < 11; x++) for (let y = -11; y < 11; y++) {
    const px = x + 0.5, py = y + 0.5, r = Math.hypot(px, py), angle = Math.atan2(py, px);
    if (r > 11) continue;
    if (r >= 9) {
      cage.box(x, y, -5, 1, 1, 11, py < -3 ? shade(white, 0.88) : white);
      if (r < 9.8) cage.set(x, y, 6, trim);
      continue;
    }
    if (r < 4.1 || Math.abs(x) === Math.abs(y) || x === 0 || y === 0) cage.set(x, y, -5, dark);
    const spoke = (angle + TAU + r * 0.085) % (TAU / 6);
    if (r < 2.5 || spoke < 0.105 || Math.abs(r - 5.7) < 0.32) cage.set(x, y, 6, r < 2.5 ? white : trim);
    if (r < 2.1) {
      rotor.box(x, y, 0, 1, 1, 3, dark);
    } else if (r < 8.6) {
      const blade = (angle + TAU + r * 0.12) % (TAU / 4);
      if (blade < 0.95) rotor.box(x, y, 0, 1, 1, 2, shade(0x637682, 0.9 + blade * 0.24));
    }
  }
  return { base, cage, rotor };
}

export function buildWuzuFan(grid: Grid) {
  const { base, cage, rotor } = buildWuzuFanParts();
  base.forEach((x, y, z, color) => grid.set(x, y, z, color));
  for (const part of [cage, rotor]) part.forEach((x, y, z, color) => grid.set(x, y + AXIS_CELL, z, color));
}
