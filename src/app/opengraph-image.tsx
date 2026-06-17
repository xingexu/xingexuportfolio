import { ImageResponse } from "next/og";

/**
 * Generated Open Graph / social-preview image (1200×630). Used automatically by
 * Next for og:image and twitter:image across all routes. No external assets or
 * fonts required — renders at build/request time.
 */
export const alt = "Xinge Xu — Fullstack Software Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "linear-gradient(135deg, #f7f9fc 0%, #e8f1fd 100%)",
          color: "#0c1018",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 26,
            fontWeight: 600,
            color: "#60A0EC",
            letterSpacing: "-0.01em",
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: 999, background: "#7EB5F5" }} />
          xinge xu
        </div>

        <div
          style={{
            fontSize: 124,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            lineHeight: 1,
            marginTop: 28,
          }}
        >
          Xinge Xu
        </div>

        <div style={{ fontSize: 40, fontWeight: 400, color: "rgba(12,16,24,0.62)", marginTop: 24, letterSpacing: "-0.02em" }}>
          Fullstack Software Developer
        </div>

        <div style={{ display: "flex", marginTop: 56, width: 120, height: 8, borderRadius: 999, background: "#7EB5F5" }} />
      </div>
    ),
    { ...size },
  );
}
