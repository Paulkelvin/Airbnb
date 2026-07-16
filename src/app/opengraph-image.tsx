import { ImageResponse } from "next/server";

export const runtime = "edge";
export const alt = "Potomac — Property Rentals & Stays";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Site-wide default OG image (Next.js 13 `opengraph-image` convention).
 * Generated at request time via `next/server`'s `ImageResponse` — no binary
 * asset from the client needed. Listing detail pages fall back to this
 * until a per-listing dynamic OG image is prioritized (see
 * docs/release-readiness-plan.md §7's enhancement backlog).
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#4f46e5",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "white",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#4f46e5",
            }}
          />
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, color: "white" }}>Potomac</div>
        <div style={{ fontSize: 32, color: "rgba(255,255,255,0.85)", marginTop: 16 }}>
          Property Rentals &amp; Stays
        </div>
      </div>
    ),
    { ...size },
  );
}
