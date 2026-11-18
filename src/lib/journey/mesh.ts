import { BufferAttribute, BufferGeometry, ColorManagement } from "three";
import { hash3, type Grid } from "./voxel";

ColorManagement.enabled = false;

const FACES = [
  { dir: [-1, 0, 0], shade: 0.74, corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] },
  { dir: [1, 0, 0], shade: 0.8, corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] },
  { dir: [0, -1, 0], shade: 0.5, corners: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] },
  { dir: [0, 1, 0], shade: 1, corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] },
  { dir: [0, 0, -1], shade: 0.68, corners: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, 0, 1], shade: 0.88, corners: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] },
] as const;

/**
 * Turns a voxel grid into one geometry, emitting only exposed faces. Lighting
 * is baked per face so every cube reads crisply at low resolution.
 */
export function gridGeometry(grid: Grid, offset: [number, number, number] = [0, 0, 0], jitter = 0.035) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  grid.forEach((x, y, z, color) => {
    const r = ((color >> 16) & 255) / 255, g = ((color >> 8) & 255) / 255, b = (color & 255) / 255;
    const noise = 1 + (hash3(x, y, z) - 0.5) * jitter;
    for (const face of FACES) {
      if (grid.has(x + face.dir[0], y + face.dir[1], z + face.dir[2])) continue;
      const base = positions.length / 3, s = face.shade * noise;
      for (const c of face.corners) {
        positions.push(x + c[0] + offset[0], y + c[1] + offset[1], z + c[2] + offset[2]);
        colors.push(r * s, g * s, b * s);
      }
      indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  geometry.setIndex(positions.length / 3 > 65535 ? new BufferAttribute(new Uint32Array(indices), 1) : new BufferAttribute(new Uint16Array(indices), 1));
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}
