"use client";
import type { CSSProperties, ReactNode } from "react";
import { usePaletteTokens } from "@/hooks/usePaletteTokens";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  size?: number;
  variant?: "ghost" | "solid" | "outline";
  ariaLabel?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

export function IconButton({
  children,
  onClick,
  size = 40,
  variant = "ghost",
  ariaLabel,
  style,
  disabled,
}: Props) {
  const t = usePaletteTokens();
  const styles: Record<string, CSSProperties> = {
    ghost: {
      background: "transparent",
      border: `1px solid transparent`,
      color: t.text,
    },
    solid: {
      background: t.accent,
      border: `1px solid ${t.accent}`,
      color: t.buttonText,
    },
    outline: {
      background: t.bgElev,
      border: `1px solid ${t.border}`,
      color: t.text,
    },
  };
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all .15s ease",
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export default IconButton;
