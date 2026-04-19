"use client";

import { cn } from "@/lib/utils";
import { Icon } from "./icon";

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export function QtyStepper({ value, onChange, min = 1, max, size = "md", className }: Props) {
  const h = size === "sm" ? 32 : 40;
  const w = size === "sm" ? 32 : 40;
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border bg-[var(--color-bg-card)]",
        className
      )}
      style={{ borderColor: "var(--color-border)", height: h }}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="grid place-items-center rounded-full transition hover:bg-[var(--color-accent-soft)] disabled:opacity-40"
        style={{ width: w, height: h }}
        aria-label="Disminuir"
      >
        <Icon name="minus" size={size === "sm" ? 14 : 16} />
      </button>
      <span
        className="font-grotesk font-semibold tabular-nums"
        style={{ minWidth: 28, textAlign: "center", fontSize: size === "sm" ? 13 : 15 }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(max ? Math.min(max, value + 1) : value + 1)}
        disabled={max ? value >= max : false}
        className="grid place-items-center rounded-full transition hover:bg-[var(--color-accent-soft)] disabled:opacity-40"
        style={{ width: w, height: h }}
        aria-label="Aumentar"
      >
        <Icon name="plus" size={size === "sm" ? 14 : 16} />
      </button>
    </div>
  );
}
