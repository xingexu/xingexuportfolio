import { aimedBallVelocity, launchBall, makeBall, SPIKE, stepBall, type BallField, type Point } from "./volleyball";
import type { Vec } from "./world";

export const CSA_VOLLEY_LIMIT = 32;
export const CSA_VOLLEY_INTERVAL = 2.6;
type Target = { position: Vec; chest: number; react: () => void };
type Pose = (phase: number, target: Vec | undefined) => Point;

export function makeCsaVolley(field: BallField, origin: Vec, radius: number, random: () => number) {
  const balls = Array.from({ length: CSA_VOLLEY_LIMIT }, () => ({
    state: makeBall(origin.x, 0, origin.z + 4, radius), target: undefined as Target | undefined,
  }));
  let phase = 0, count = 1, nextCount = 1, struck = false, complete = false;
  let chosen: Target[] = [];
  const lead = () => chosen[0]?.position;

  function choose(targets: readonly Target[]) {
    const pool = [...targets], picks = [];
    for (let i = 0; i < nextCount; i++) {
      if (!pool.length) pool.push(...targets);
      picks.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    }
    return picks;
  }

  function strike(point: Point) {
    count = nextCount;
    for (let i = 0; i < count; i++) {
      const { state } = balls[i], target = chosen[i];
      balls[i].target = target;
      state.x = point.x; state.y = point.y; state.z = point.z;
      const distance = Math.hypot(target.position.x - point.x, target.position.z - point.z);
      const spread = i ? 0.7 + (i % 4) * 0.36 : 0;
      launchBall(state, aimedBallVelocity(point, {
        x: target.position.x + Math.cos(i * 2.4) * spread,
        y: target.chest,
        z: target.position.z + Math.sin(i * 2.4) * spread,
      }, Math.min(0.98, 0.57 + distance / 185) + i % 3 * 0.025));
    }
  }

  function advance(dt: number) {
    for (let i = !struck && !complete ? 1 : 0; i < count; i++) {
      const ball = balls[i], { state, target } = ball;
      if (state.grounded && !state.vx && !state.vz) continue;
      stepBall(state, field, dt);
      if (target && state.y > 3 && state.y < target.chest + 4 &&
          Math.hypot(state.x - target.position.x, state.z - target.position.z) < radius + 2) {
        ball.target = undefined;
        launchBall(state, { x: state.vx * 0.23, y: 5 + Math.abs(state.vy) * 0.3, z: state.vz * 0.23 });
        target.react();
      }
    }
  }

  return {
    balls,
    get count() { return count; },
    reset() {
      phase = 0; count = 1; nextCount = 1; struck = false; complete = false; chosen = [];
      for (const ball of balls) ball.target = undefined;
      Object.assign(balls[0].state, makeBall(origin.x, 0, origin.z + 4, radius));
    },
    update(dt: number, reduced: boolean, targets: readonly Target[], pose: Pose) {
      if (reduced || !targets.length) { pose(0, lead()); return; }
      while (dt > 0 && !complete) {
        if (!chosen.length) chosen = choose(targets);
        const cue = struck ? CSA_VOLLEY_INTERVAL : SPIKE.contact;
        const step = Math.min(dt, cue - phase);
        advance(step);
        dt -= step;
        if (step < cue - phase) { phase += step; break; }
        phase = cue;
        if (!struck) {
          strike(pose(phase, lead()));
          struck = true;
        } else if (count === CSA_VOLLEY_LIMIT) {
          complete = true;
        } else {
          phase = 0; nextCount = Math.min(CSA_VOLLEY_LIMIT, count * 2); struck = false; chosen = [];
        }
      }
      if (dt > 0) advance(dt);
      if (!struck && chosen.length) {
        const point = pose(SPIKE.contact, lead()), t = phase / SPIKE.contact;
        Object.assign(balls[0].state, point, { y: radius + (point.y - radius) * t * (2 - t) + Math.sin(t * Math.PI) * 5 });
      }
      pose(phase, lead());
    },
  };
}
