import { ImageResponse } from "next/og";

/**
 * Generated Open Graph / social-preview image (1200×630), matching the
 * pixel night-sky theme. No external assets or fonts required.
 */
export const alt = "Xinge Xu — Fullstack Software Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// deterministic pseudo-random star field
const STARS = Array.from({ length: 90 }, (_, i) => ({
  left: (i * 137) % 1200,
  top: (i * 89) % 630,
  o: 0.25 + ((i * 31) % 70) / 100,
}));

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#04070f",
          color: "#e9eff8",
          position: "relative",
        }}
      >
        {STARS.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.left,
              top: s.top,
              width: 6,
              height: 6,
              background: "#cfe2ff",
              opacity: s.o,
            }}
          />
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#ffd24a", letterSpacing: "0.05em" }}>
          <div style={{ width: 18, height: 18, background: "#ffd24a" }} />
          xinge xu
        </div>

        <div style={{ display: "flex", fontSize: 116, fontWeight: 700, lineHeight: 1.05, marginTop: 28 }}>
          Xinge Xu
        </div>

        <div style={{ display: "flex", fontSize: 38, color: "rgba(233,239,248,0.62)", marginTop: 20 }}>
          fullstack software developer
        </div>

        <div style={{ display: "flex", marginTop: 56, width: 120, height: 10, background: "#ffd24a" }} />
      </div>
    ),
    { ...size },
  );
}
