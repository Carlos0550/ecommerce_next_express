"use client";
import type { CSSProperties } from "react";
import { usePaletteTokens } from "@/hooks/usePaletteTokens";

interface Props {
  label?: string;
  src?: string | null;
  alt?: string;
  size?: string | number;
  rounded?: number;
  tone?: "accent" | "pink" | "neutral";
  style?: CSSProperties;
}

export function ProductImg({
  label = "PRODUCTO",
  src,
  alt,
  size = "100%",
  rounded = 14,
  tone = "accent",
  style,
}: Props) {
  const t = usePaletteTokens();
  const base =
    tone === "accent" ? t.accentSoft : tone === "pink" ? t.pinkSoft : t.bgInput;
  const stripe =
    tone === "accent" ? t.accent : tone === "pink" ? t.pink : t.textMuted;
  const patternId = `s-${label.replace(/\s+/g, "-")}`;
  return (
    <div
      style={{
        width: size,
        aspectRatio: "1/1",
        borderRadius: rounded,
        background: base,
        position: "relative",
        overflow: "hidden",
        border: `1px solid ${t.border}`,
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt || label}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <>
          <svg
            width="100%"
            height="100%"
            style={{ position: "absolute", inset: 0, opacity: 0.18 }}
          >
            <defs>
              <pattern
                id={patternId}
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(35)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="8"
                  stroke={stripe}
                  strokeWidth="1.2"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              fontSize: 10,
              color: t.textDim,
              textAlign: "center",
              padding: 8,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
        </>
      )}
    </div>
  );
}

export default ProductImg;
