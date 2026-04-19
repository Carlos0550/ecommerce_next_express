"use client";
import { usePaletteTokens } from "@/hooks/usePaletteTokens";

interface Props {
  size?: number;
  tone?: "auto" | string;
  showTag?: boolean;
  tag?: string;
}

export function CinnamonLogo({
  size = 20,
  tone = "auto",
  showTag = true,
  tag = "Makeup & Accesorios",
}: Props) {
  const t = usePaletteTokens();
  const color = tone === "auto" ? t.text : tone;
  const accent = t.accent;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg
        width={size * 1.4}
        height={size * 1.4}
        viewBox="0 0 40 40"
        style={{ flexShrink: 0 }}
      >
        <circle
          cx="20"
          cy="22"
          r="13"
          fill="none"
          stroke={color}
          strokeWidth="1.6"
        />
        <path
          d="M10 11 L14 16 M30 11 L26 16"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="20" cy="22" r="2" fill={accent} />
        <path
          d="M20 16.5 L20 18 M20 26 L20 27.5 M14.5 22 L16 22 M24 22 L25.5 22"
          stroke={accent}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}
      >
        <span
          style={{
            fontFamily: "var(--font-grotesk), system-ui, sans-serif",
            fontWeight: 600,
            fontSize: size,
            color,
            letterSpacing: -0.5,
          }}
        >
          Cinnamon
        </span>
        {showTag && (
          <span
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontWeight: 500,
              fontSize: size * 0.42,
              color: t.textDim,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginTop: 3,
            }}
          >
            {tag}
          </span>
        )}
      </div>
    </div>
  );
}

export default CinnamonLogo;
