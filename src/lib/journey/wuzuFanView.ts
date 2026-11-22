import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from "three";
import { gridGeometry } from "./mesh";
import { buildWuzuFanParts, FAN_AXIS_Y, FAN_VOXEL_SIZE } from "./wuzuFan";

export function makeWuzuFanView(holder: Group, material: MeshBasicMaterial) {
  const { base, cage, rotor } = buildWuzuFanParts();
  const parts = [base, cage, rotor].map(grid => new Mesh(gridGeometry(grid, [0, 0, 0], 0.015, FAN_VOXEL_SIZE), material));
  const head = new Group(), blades = parts[2], air = new Group();
  const airGeometry = new BoxGeometry(0.16, 0.13, 1.45);
  const airMaterial = new MeshBasicMaterial({ color: 0xc4e4ed, transparent: true, opacity: 0.36, depthWrite: false });
  const streaks = Array.from({ length: 7 }, () => {
    const streak = new Mesh(airGeometry, airMaterial);
    streak.raycast = () => undefined;
    return streak;
  });
  air.add(...streaks);
  head.position.y = FAN_AXIS_Y;
  head.add(parts[1], blades, air);
  holder.add(parts[0], head);

  function update(time: number, reducedMotion: boolean) {
    head.rotation.y = reducedMotion ? 0 : Math.sin(time * 1.25) * 0.34;
    blades.rotation.z = reducedMotion ? 0 : -time * 20 % (2 * Math.PI);
    air.visible = !reducedMotion;
    if (!air.visible) return;
    streaks.forEach((streak, i) => {
      const phase = (time * 0.83 + i / streaks.length) % 1;
      const spread = 0.65 + phase * 1.6, angle = i * 2.4;
      streak.position.set(Math.cos(angle) * spread, Math.sin(angle) * spread * 0.65, 2.35 + phase * 8);
      streak.scale.setScalar(Math.sin(phase * Math.PI));
    });
  }
  update(0, true);
  return {
    update, head, blades, air,
    dispose: () => { parts.forEach(part => part.geometry.dispose()); airGeometry.dispose(); airMaterial.dispose(); },
  };
}
