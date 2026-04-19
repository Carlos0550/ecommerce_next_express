"use client";
import type { CSSProperties, ReactNode } from "react";
import { usePaletteTokens } from "@/hooks/usePaletteTokens";

interface Props {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  style?: CSSProperties;
}

export function Chip({
  children,
  active = false,
  onClick,
  size = "md",
  style,
}: Props) {
  const t = usePaletteTokens();
  const pad = size === "sm" ? "6px 12px" : "8px 16px";
  const fs = size === "sm" ? 12 : 13;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: pad,
        borderRadius: 999,
        border: `1px solid ${active ? t.accent : t.border}`,
        background: active ? t.accent : t.bgElev,
        color: active ? t.buttonText : t.text,
        fontSize: fs,
        fontWeight: 500,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all .15s ease",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export default Chip;
