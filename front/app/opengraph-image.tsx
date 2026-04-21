import { ImageResponse } from "next/og";
import { fetchBusiness } from "@/lib/shop/server";
import { BUSINESS_NAME_FALLBACK } from "@/lib/shop/constants";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

export async function generateImageMetadata() {
  const b = await fetchBusiness();
  const name = b?.name?.trim() || BUSINESS_NAME_FALLBACK;
  return [{ contentType, size, id: "default", alt: name }];
}

export default async function OG() {
  const business = await fetchBusiness();
  const name = business?.name?.trim() || BUSINESS_NAME_FALLBACK;
  const tagline =
    business?.description?.trim() ||
    "Productos seleccionados con identidad propia.";
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
          {name}
        </div>
        <div style={{ fontSize: 108, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
          {name}
        </div>
        <div style={{ fontSize: 28, color: "#a99bbe" }}>{tagline}</div>
      </div>
    ),
    size,
  );
}
