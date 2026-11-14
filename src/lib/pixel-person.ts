import type { Direction } from "./life-world";

type Person = {
  x: number; y: number; direction?: Direction; distance?: number; moving?: boolean;
  child?: boolean; shirt?: string; skin?: string; pants?: string;
  outdoors?: boolean; playful?: boolean; crew?: boolean;
};

/** One pixel vocabulary for every traveller; only clothes and body height vary. */
export function paintAirportPerson(ctx: CanvasRenderingContext2D, person: Person, time = 0) {
  const x = Math.round(person.x), y = Math.round(person.y);
  const r = (xx: number, yy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(x + xx, y + yy, w, h);
  };
  const direction = person.direction ?? "down";
  const skin = person.skin ?? "#edbb91", shirt = person.shirt ?? "#191f29", pants = person.pants ?? "#334451";
  // Distance-driven, planted-foot poses. No head bobbing or idle leg jitter.
  const step = person.moving ? [0, 1, 1, 0, 0, -1, -1, 0][Math.floor((person.distance ?? 0) / 5) % 8] : 0;
  const legs = person.child ? 6 : 9, torso = person.child ? 5 : 8;
  const top = -legs - torso, neck = top - 1, face = neck - 4;
  const arm = person.child ? 3 : 5;
  r(-3, 1, 7, 1, person.outdoors ? "#60767d" : "#a3b5ac");
  r(-2, 2, 5, 1, person.outdoors ? "#70878d" : "#b4c1b5");
  r(-2, -legs + step, 2, legs, pants); r(1, -legs - step, 2, legs, pants);
  r(-2, step, 2, 1, "#fff1d5"); r(1, -step, 2, 1, "#fff1d5");
  r(-2, -legs - 1, 5, 2, pants); r(0, -legs + 1, 1, legs - 2, "#202d3d");
  r(-2, top, 5, torso, shirt); r(-1, top + 1, 3, torso - 2, person.shirt ?? "#232b35");
  const leftStep = person.playful && direction === "left" ? 0 : step;
  r(-3, top + 1 - leftStep, 1, arm, shirt); r(-3, top + 1 + arm - leftStep, 1, 2, skin);
  const rightStep = person.playful && direction !== "left" ? 0 : step;
  r(3, top + 1 + rightStep, 1, arm, shirt); r(3, top + 1 + arm + rightStep, 1, 2, skin);
  if (person.crew) { r(-2, top + 2, 5, 1, "#fff1ae"); r(-2, top + torso - 2, 5, 1, "#fff1ae"); }
  r(0, neck, 1, 1, skin);
  r(-2, face, 5, 4, skin);
  r(-2, face - 2, 5, 2, "#282c36"); r(-3, face - 1, 7, 2, "#242b35"); r(-1, face - 2, 2, 1, "#353943");
  if (direction === "up") { r(-2, face, 5, 4, "#242b35"); r(-1, face + 3, 3, 1, "#39404a"); }
  else if (direction === "left" || direction === "right") {
    const side = direction === "left" ? -1 : 1;
    r(side * 3, face + 2, 1, 1, skin); r(side * 2, face + 1, 1, 1, "#28333e");
    r(side < 0 ? 1 : -2, face, 2, 4, "#282e37");
    r(side, face + 3, 2, 1, "#a56352");
  } else {
    r(-1, face + 1, 1, 1, "#28333e"); r(1, face + 1, 1, 1, "#28333e");
    r(-1, face + 2, 1, 1, "#a56352"); r(1, face + 2, 1, 1, "#a56352"); r(0, face + 3, 1, 1, "#a56352");
    if (person.playful) r(0, face + 2, 1, 1, "#fff2d7");
  }
  if (person.playful) {
    // Red / yellow / blue beanie, green bill, and a leisurely spinning propeller.
    r(-2, face - 3, 5, 1, "#e6ba51");
    r(-3, face - 2, 2, 2, "#edc54d"); r(-1, face - 2, 3, 2, "#ce5148"); r(2, face - 2, 2, 2, "#3c79ae");
    r(direction === "right" ? -2 : -4, face, 7, 1, "#327e63");
    r(0, face - 5, 1, 2, "#deb24c");
    const blade = [3, 2, 1, 2][Math.floor(time / 180) % 4];
    r(-blade, face - 5, blade * 2 + 1, 1, "#32789b"); r(0, face - 6, 1, 1, "#f2d574");
    // Tiny rainbow spiral, held still while the free arm swings.
    const candyX = direction === "left" ? -6 : 6;
    r(candyX, top + 1, 1, 5, "#fff0ce");
    r(candyX - 1, top - 3, 3, 1, "#e2b843"); r(candyX - 2, top - 2, 5, 3, "#d96058");
    r(candyX - 1, top + 1, 3, 1, "#52966e"); r(candyX - 2, top - 1, 2, 2, "#4286b0");
    r(candyX, top - 2, 2, 1, "#fff0b0"); r(candyX + 1, top - 1, 1, 2, "#e0b83e"); r(candyX, top, 1, 1, "#efdfbb");
    r(direction === "left" ? -5 : 4, top + 4, 2, 1, skin);
  }
}
