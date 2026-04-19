"use client";
import { usePaletteTokens } from "@/hooks/usePaletteTokens";
import { Icon } from "./Icon";

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
}

export function QtyStepper({ value, onChange, min = 1, max = 999, size = "md" }: Props) {
  const t = usePaletteTokens();
  const btn = size === "sm" ? 28 : 34;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        border: `1px solid ${t.border}`,
        borderRadius: 999,
        padding: 4,
        background: t.bgElev,
      }}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        style={{
          width: btn,
          height: btn,
          borderRadius: 999,
          border: "none",
          background: "transparent",
          cursor: value <= min ? "not-allowed" : "pointer",
          color: t.text,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Disminuir"
      >
        <Icon name="minus" size={14} />
      </button>
      <span
        style={{
          minWidth: 24,
          textAlign: "center",
          fontWeight: 600,
          fontSize: size === "sm" ? 13 : 14,
          color: t.text,
        }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={{
          width: btn,
          height: btn,
          borderRadius: 999,
          border: "none",
          background: t.accent,
          color: t.buttonText,
          cursor: value >= max ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Aumentar"
      >
        <Icon name="plus" size={14} color={t.buttonText} />
      </button>
    </div>
  );
}

export default QtyStepper;
