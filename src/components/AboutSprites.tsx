/** Small, palette-limited sprites. Each character is one square source pixel. */
const INK: Record<string, string> = { w: "#eeeeee", s: "#a8a8a8", e: "#686868", b: "#0c0c0c", "#": "#eeeeee", y: "#ffcc13", h: "#ffe15b", d: "#dfa006", a: "#b47b07", u: "#252b8c", l: "#3d49b0", n: "#181f6c", q: "#101640" };

// A 30 × 30 face at 2 CSS pixels per cell preserves the V200W's sweeping blue
// ribbons, yellow lobes, and panel seams at the existing 60px display size.
type Point = readonly [number, number];
const BLUE_TOP: Point[] = [[0,.45],[.12,.22],[.26,.33],[.40,.37],[.58,.36],[.72,.40],[.87,.52],[1,.40]];
const BLUE_BOTTOM: Point[] = [[0,.56],[.14,.64],[.32,.68],[.50,.65],[.67,.67],[.82,.77],[.91,.81],[1,.57]];

function ribbonAt(points: Point[], x: number) {
  const end = points.findIndex(p => p[0] >= x);
  if (end <= 0) return points[Math.max(0, end)][1];
  const a = points[end - 1], b = points[end];
  const t = (x - a[0]) / (b[0] - a[0]);
  return a[1] + (b[1] - a[1]) * t * t * (3 - 2 * t);
}

const SEAMS: Point[] = [
  [[.40,.025],[.22,.20],[.31,.34]], [[.70,.055],[.85,.20],[.84,.48]],
  [[.14,.66],[.20,.84],[.43,.97]], [[.64,.67],[.69,.85],[.65,.97]],
].flatMap(([a, b, c]) => Array.from({ length: 32 }, (_, index): Point => {
  const t = index / 31, s = 1 - t;
  return [s * s * a[0] + 2 * s * t * b[0] + t * t * c[0], s * s * a[1] + 2 * s * t * b[1] + t * t * c[1]];
}));

const VOLLEYBALL = Array.from({ length: 30 }, (_, y) => Array.from({ length: 30 }, (_, x) => {
  const u = (x + .5) / 30, v = (y + .5) / 30;
  const nx = (u - .5) * 2, ny = (v - .5) * 2;
  const radius = nx * nx + ny * ny;
  if (radius > 1) return ".";
  const light = -.32 * nx - .40 * ny + .86 * Math.sqrt(1 - radius);
  const blue = (v >= ribbonAt(BLUE_TOP, u) && v <= ribbonAt(BLUE_BOTTOM, u))
    || (v < .42 && u < .17 + .14 * (.40 - v))
    || (v > .55 && v < .91 && u > .88 - (v - .55) * .40);
  if (blue) return light > .83 ? "l" : light > .45 ? "u" : light > .12 ? "n" : "q";
  const seam = SEAMS.some(([sx, sy]) => (u - sx) ** 2 + (v - sy) ** 2 < .017 ** 2);
  if (seam) return light > .45 ? "d" : "a";
  return light > .86 ? "h" : light > .48 ? "y" : light > .10 ? "d" : "a";
}).join(""));

const SPRITES = {
  knight: [
    "..........ww........",
    ".........www........",
    "......wwwwwww.......",
    ".....wwwwwwwww......",
    "....swwwwbwwwww.....",
    "...sswwwwwwwwwww....",
    "...swwwwwwwwwwwww...",
    "..sswwwww..wwwwww...",
    "..swwwww....wwww....",
    "..swwwww.....ss.....",
    "..swwwwww...........",
    "...swwwwww..........",
    "...swwwwwww.........",
    "....swwwwwww........",
    "....swwwwwwww.......",
    "...swwwwwwwww.......",
    "...swwwwwwwww.......",
    "..swwwwwwwwwww......",
    "..sssssssssssss.....",
    "...wwwwwwwwwww......",
    "...sssssssssss......",
    "..wwwwwwwwwwwww.....",
    ".wwwwwwwwwwwwwww....",
    ".sssssssssssssss....",
  ],
  rook: [
    ".www..ww..www...",
    ".www..ww..www...",
    ".wwwwwwwwwwww...",
    ".swwwwwwwwwww...",
    "..ssssssssss....",
    "...wwwwwwww.....",
    "...swwwwwww.....",
    "...swwwwwww.....",
    "...swwwwwww.....",
    "...swwwwwww.....",
    "...swwwwwww.....",
    "...swwwwwww.....",
    "...swwwwwww.....",
    "..wwwwwwwwww....",
    "..ssssssssss....",
    ".wwwwwwwwwwww...",
    ".ssssssssssss...",
    "wwwwwwwwwwwwww..",
    "wwwwwwwwwwwwww..",
    "ssssssssssssss..",
  ],
  pawn: [
    ".....wwww.....",
    "....wwwwww....",
    "...wwwwwwww...",
    "...wwwwwwww...",
    "...swwwwwww...",
    "....ssssss....",
    ".....wwww.....",
    "....wwwwww....",
    "....ssssss....",
    ".....wwww.....",
    ".....swww.....",
    ".....swww.....",
    "....swwwww....",
    "...swwwwwww...",
    "..wwwwwwwwww..",
    "..ssssssssss..",
    "...wwwwwwww...",
    ".wwwwwwwwwwww.",
    ".wwwwwwwwwwww.",
    ".ssssssssssss.",
  ],
  volleyball: VOLLEYBALL,
  laptop: [
    "..################..",
    "..##............##..",
    "..##.#..........##..",
    "..##..#.........##..",
    "..##.#..####....##..",
    "..##............##..",
    "..##............##..",
    "..##............##..",
    "..################..",
    "...##############...",
    "..###.#.#.#.#.####..",
    ".####.#.#.#.#.#####.",
    "####################",
    ".##################.",
  ],
} as const;

export type AboutSpriteKind = keyof typeof SPRITES;

export default function AboutSprite({ kind }: { kind: AboutSpriteKind }) {
  const rows = SPRITES[kind];
  return (
    <svg
      className={`about-sprite about-sprite-${kind}`}
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      width={rows[0].length * 2}
      height={rows.length * 2}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rows.flatMap((row, y) => [...row].map((pixel, x) => INK[pixel] ? (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={INK[pixel]} />
      ) : null))}
      {kind === "laptop" && <rect className="about-laptop-cursor" x="13" y="6" width="2" height="1" fill="currentColor" />}
    </svg>
  );
}
