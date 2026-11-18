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
const OCCLUSION = [1, 0.94, 0.86, 0.75];
const FACE_SAMPLES = FACES.map(({ dir, corners, shade }) => {
  const [u, v] = [0, 1, 2].filter(axis => !dir[axis]);
  return { dir, corners, shade, samples: corners.map(corner => ({ u, v, du: corner[u] ? 1 : -1, dv: corner[v] ? 1 : -1 })) };
});

/**
 * Turns a voxel grid into one geometry, emitting only exposed faces. Lighting
 * is baked per face so every cube reads crisply at low resolution.
 */
export function gridGeometry(grid: Grid, offset: [number, number, number] = [0, 0, 0], jitter = 0.035, voxelSize = 1, include?: (color: number) => boolean) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const adjacent = [0, 0, 0];
  grid.forEach((x, y, z, color) => {
    if (include && !include(color)) return;
    const r = ((color >> 16) & 255) / 255, g = ((color >> 8) & 255) / 255, b = (color & 255) / 255;
    const noise = 1 + (hash3(x, y, z) - 0.5) * jitter;
    for (const face of FACE_SAMPLES) {
      const nx = x + face.dir[0], ny = y + face.dir[1], nz = z + face.dir[2];
      if (grid.has(nx, ny, nz)) continue;
      adjacent[0] = nx; adjacent[1] = ny; adjacent[2] = nz;
      const base = positions.length / 3, s = face.shade * noise;
      for (let i = 0; i < face.corners.length; i++) {
        const c = face.corners[i], { u, v, du, dv } = face.samples[i];
        adjacent[u] += du;
        const sideA = Number(grid.has(adjacent[0], adjacent[1], adjacent[2]));
        adjacent[v] += dv;
        const corner = Number(grid.has(adjacent[0], adjacent[1], adjacent[2]));
        adjacent[u] -= du;
        const sideB = Number(grid.has(adjacent[0], adjacent[1], adjacent[2]));
        adjacent[v] -= dv;
        const light = s * OCCLUSION[sideA && sideB ? 3 : sideA + sideB + corner];
        positions.push((x + c[0]) * voxelSize + offset[0], (y + c[1]) * voxelSize + offset[1], (z + c[2]) * voxelSize + offset[2]);
        colors.push(r * light, g * light, b * light);
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
