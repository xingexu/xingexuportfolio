import type { CSSProperties } from "react";

// Five-by-seven letter faces with a one-pixel extrusion, matching the room's sprites.
const LETTERS = {
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
} as const;
const HEIGHTS = [0, 2, 1, 3, 0, 2];

export default function AboutName() {
  return (
    <h1 className="about-name" aria-label="ZINGER">
      {Object.entries(LETTERS).map(([letter, rows], index) => {
        const pixels = rows.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === "1" ? [{ x, y }] : []));
        return (
          <span
            key={letter}
            className="about-letter"
            style={{ "--letter-delay": `${-index * 1.25}s`, "--letter-row": HEIGHTS[index] } as CSSProperties}
            aria-hidden="true"
          >
            <svg className="about-letter-art" viewBox="0 0 6 8" width="24" height="32" shapeRendering="crispEdges" aria-hidden="true">
              <g fill="#444444">{pixels.map(({ x, y }) => <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width="1" height="1" />)}</g>
              {pixels.map(({ x, y }) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={y === 0 || rows[y - 1][x] === "0" ? "#eeeeee" : "#bcbcbc"} />)}
            </svg>
          </span>
        );
      })}
    </h1>
  );
}
