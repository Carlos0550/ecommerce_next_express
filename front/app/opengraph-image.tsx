import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "Cinnamon · Makeup & Accesorios";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background:
            "radial-gradient(120% 80% at 20% 0%, rgba(201, 164, 255, 0.35), transparent 60%)," +
            "radial-gradient(80% 60% at 90% 100%, rgba(255, 157, 214, 0.28), transparent 60%)," +
            "#0b0a0d",
          color: "#f4eefb",
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 6, textTransform: "uppercase", color: "#c9a4ff" }}>
          Cinnamon
        </div>
        <div style={{ fontSize: 108, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
          Glow noir,
          <br />
          <span style={{ color: "#c9a4ff", fontStyle: "italic" }}>muy tuyo.</span>
        </div>
        <div style={{ fontSize: 28, color: "#a99bbe" }}>
          Makeup, skin care y accesorios con identidad propia.
        </div>
      </div>
    ),
    size,
  );
}
