"use client";
import type { CSSProperties, ReactNode } from "react";
import { usePaletteTokens } from "@/hooks/usePaletteTokens";

type Tone = "accent" | "pink" | "success" | "warn" | "danger" | "neutral";

interface Props {
  children: ReactNode;
  tone?: Tone;
  size?: "sm" | "md";
  style?: CSSProperties;
}

export function Badge({ children, tone = "neutral", size = "sm", style }: Props) {
  const t = usePaletteTokens();
  const map: Record<Tone, { bg: string; fg: string }> = {
    accent: { bg: t.accentSoft, fg: t.accentStrong },
    pink: { bg: t.pinkSoft, fg: t.pink },
    success: { bg: t.accentSoft, fg: t.success },
    warn: { bg: t.accentSoft, fg: t.warn },
    danger: { bg: t.accentSoft, fg: t.danger },
    neutral: { bg: t.bgInput, fg: t.textDim },
  };
  const c = map[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: size === "sm" ? "3px 8px" : "5px 12px",
        borderRadius: 999,
        fontSize: size === "sm" ? 11 : 12,
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        letterSpacing: 0.3,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export default Badge;
