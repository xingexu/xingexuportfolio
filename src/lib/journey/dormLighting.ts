import { DataTexture, Mesh, MeshBasicMaterial, PlaneGeometry, type BufferGeometry, type Group } from "three";

export function makeDormLighting(geometry: (model: string) => BufferGeometry) {
  const fixtures: { mesh: Mesh; on: BufferGeometry; off: BufferGeometry; pool?: Mesh }[] = [];
  const size = 16, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const edge = Math.hypot((x + 0.5) * 2 / size - 1, (y + 0.5) * 2 / size - 1);
    pixels.set([255, 255, 255, Math.round(140 * Math.max(0, 1 - edge * edge) ** 2)], (y * size + x) * 4);
  }
  const texture = new DataTexture(pixels, size, size);
  texture.needsUpdate = true;
  const poolGeometry = new PlaneGeometry(8, 7);
  const poolMaterial = new MeshBasicMaterial({ color: 0xffe3a1, map: texture, transparent: true, depthWrite: false });
  let enabled = false;
  function addPool(holder: Group, y: number, z: number) {
    const pool = new Mesh(poolGeometry, poolMaterial);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, y, z);
    pool.raycast = () => {};
    holder.add(pool);
    return pool;
  }
  function apply() {
    for (const { mesh, on, off, pool } of fixtures) {
      mesh.geometry = enabled ? on : off;
      if (pool) pool.visible = enabled;
    }
  }
  return {
    get enabled() { return enabled; },
    add(model: string, holder: Group) {
      if (model === "monitor-headlight") { addPool(holder, -12.97, 4.15); return; }
      if (model !== "desk-lamp" && model !== "dorm-light-switch") return;
      const mesh = holder.children[0] as Mesh;
      if (model === "dorm-light-switch") fixtures.push({ mesh, on: geometry("dorm-light-switch-on"), off: mesh.geometry });
      else {
        const pool = addPool(holder, 0.03, 5.5);
        fixtures.push({ mesh, on: mesh.geometry, off: geometry("desk-lamp-off"), pool });
      }
      apply();
    },
    toggle() { enabled = !enabled; apply(); },
    dispose() { poolGeometry.dispose(); poolMaterial.dispose(); texture.dispose(); },
  };
}
