/** Small, palette-limited sprites. Each character is one square source pixel. */
const INK: Record<string, string> = { w: "#eeeeee", s: "#a8a8a8", e: "#686868", b: "#0c0c0c", "#": "#eeeeee" };

// Curved, interlocking panel seams read as a volleyball even at 20 × 20.
const BALL_WIDTHS = [6, 10, 12, 14, 16, 18, 18, 20, 20, 20, 20, 20, 20, 18, 18, 16, 14, 12, 10, 6];
const BALL_SEAMS = new Set([
  // Three curved joins meet in the middle.
  "6,1", "6,2", "6,3", "6,4", "7,5", "7,6", "8,7", "9,8", "10,9",
  "11,9", "12,8", "13,7", "14,6", "15,6", "16,5", "17,5", "18,5",
  "10,10", "10,11", "10,12", "11,13", "11,14", "12,15", "12,16", "13,17", "14,18",
  // Parallel joins divide each curved group into long panels.
  "2,5", "2,6", "3,7", "3,8", "4,9", "5,10", "6,11", "7,11", "8,12", "9,12",
  "10,0", "10,1", "10,2", "11,3", "12,4", "13,5", "14,5",
  "19,10", "18,10", "17,11", "16,11", "15,12", "14,13", "14,14", "14,15", "15,16", "15,17",
]);
const VOLLEYBALL = BALL_WIDTHS.map((width, y) => {
  const left = (20 - width) / 2;
  return Array.from({ length: 20 }, (_, x) => {
    if (x < left || x >= left + width) return ".";
    if (BALL_SEAMS.has(`${x},${y}`)) return "b";
    if (x === left || x === left + width - 1) return y < 12 ? "s" : "e";
    if ((y > 14 && x > 11) || y === 19) return "s";
    return "w";
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
