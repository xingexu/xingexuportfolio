import type { CSSProperties } from "react";

// Bold seven-by-nine faces with a quiet two-pixel bevel.
const LETTERS = {
  Z: ["1111111", "1111111", "0000110", "0001100", "0011000", "0110000", "1100000", "1111111", "1111111"],
  I: ["1111111", "1111111", "0011100", "0011100", "0011100", "0011100", "0011100", "1111111", "1111111"],
  N: ["1100011", "1110011", "1110011", "1111011", "1101111", "1100111", "1100111", "1100011", "1100011"],
  G: ["0111110", "1111111", "1100011", "1100000", "1101111", "1100111", "1100011", "1111111", "0111110"],
  E: ["1111111", "1111111", "1100000", "1100000", "1111110", "1111110", "1100000", "1111111", "1111111"],
  R: ["1111110", "1111111", "1100011", "1100011", "1111110", "1111100", "1101100", "1100110", "1100011"],
} as const;
const HEIGHTS = [0, 1, 0, 1, 0, 1];

const GLYPHS = Object.entries(LETTERS).map(([letter, rows]) => {
  const pixels = rows.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === "1" ? [{ x, y }] : []));
  return { letter, rows, pixels };
});

export default function AboutName() {
  return (
    <h1 className="about-name" aria-label="ZINGER">
      {GLYPHS.map(({ letter, rows, pixels }, index) => {
        return (
          <span
            key={letter}
            className="about-letter"
            style={{ "--letter-delay": `${-index * 1.2}s`, "--letter-row": HEIGHTS[index] } as CSSProperties}
            aria-hidden="true"
          >
            <svg className="about-letter-art" viewBox="0 0 13 15" width="65" height="75" shapeRendering="crispEdges" aria-hidden="true">
              <g fill="#343434">{pixels.map(({ x, y }) => <rect key={`${x}-${y}`} x={x + 5} y={y + 5} width="1" height="1" />)}</g>
              <g fill="#676767">{pixels.map(({ x, y }) => <rect key={`${x}-${y}`} x={x + 4} y={y + 4} width="1" height="1" />)}</g>
              {pixels.map(({ x, y }) => <rect key={`${x}-${y}`} x={x + 3} y={y + 3} width="1" height="1"
                fill={y === 0 || rows[y - 1][x] === "0" ? "#fafafa" : x === 0 || rows[y][x - 1] === "0" ? "#dcdcdc" : "#a9a9a9"} />)}
            </svg>
          </span>
        );
      })}
    </h1>
  );
}
