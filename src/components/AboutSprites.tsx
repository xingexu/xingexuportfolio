/** Small, palette-limited sprites. Each character is one square source pixel. */
const INK: Record<string, string> = { w: "#eeeeee", s: "#a8a8a8", e: "#686868", b: "#0c0c0c", "#": "#eeeeee", y: "#ffd119", h: "#ffe35c", d: "#d99c08", u: "#29268a", l: "#4543b0", n: "#17175b" };

// The V200W reference has broad blue ribbons curving around yellow panels.
// A 20 × 20 source grid keeps the ball small and deliberately pixelated.
const BALL_WIDTHS = [6, 10, 12, 14, 16, 18, 18, 20, 20, 20, 20, 20, 20, 18, 18, 16, 14, 12, 10, 6];
const BLUE_TOP = [8, 7, 5, 4, 5, 6, 7, 7, 7, 7, 7, 7, 8, 8, 9, 10, 10, 9, 8, 7];
const BLUE_BOTTOM = [10, 10, 11, 12, 12, 13, 13, 13, 13, 13, 13, 14, 14, 15, 16, 17, 16, 15, 13, 11];
const VOLLEYBALL = BALL_WIDTHS.map((width, y) => {
  const left = (20 - width) / 2, right = left + width - 1;
  return Array.from({ length: 20 }, (_, x) => {
    if (x < left || x > right) return ".";
    const ribbon = y >= BLUE_TOP[x] && y <= BLUE_BOTTOM[x];
    const upperRim = y > 0 && y < 8 && x <= left + 1;
    const lowerRim = y >= 14 && y < 19 && x >= right - 1;
    if (ribbon || upperRim || lowerRim) {
      if ((x === right && y > 9) || y > 16) return "n";
      return x < 9 && y < 10 ? "l" : "u";
    }
    if (y < 4 || (x === left && y < 11)) return "h";
    if (y > 16 || (x === right && y > 10)) return "d";
    return "y";
  }).join("");
});

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
