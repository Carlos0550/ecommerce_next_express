"use client";
import type { CSSProperties, ReactNode } from "react";
import { usePaletteTokens } from "@/hooks/usePaletteTokens";

interface Props {
  children: ReactNode;
  padding?: number | string;
  rounded?: number;
  elev?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}

export function Card({
  children,
  padding = 16,
  rounded = 16,
  elev = false,
  style,
  onClick,
}: Props) {
  const t = usePaletteTokens();
  return (
    <div
      onClick={onClick}
      style={{
        background: elev ? t.bgElev : t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: rounded,
        padding,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Card;
