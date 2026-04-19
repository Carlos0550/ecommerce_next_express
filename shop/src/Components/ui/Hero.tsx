"use client";
import type { ReactNode } from "react";
import { usePaletteTokens } from "@/hooks/usePaletteTokens";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
  tag?: string;
}

export function Hero({ title, subtitle, ctaLabel, onCta, tag }: Props) {
  const t = usePaletteTokens();
  return (
    <section
      style={{
        background: t.heroGradient,
        borderRadius: 24,
        padding: "44px 28px",
        border: `1px solid ${t.border}`,
        color: t.text,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {tag && (
        <div
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: t.textDim,
            marginBottom: 14,
          }}
        >
          {tag}
        </div>
      )}
      <h1
        style={{
          fontFamily: "var(--font-grotesk), system-ui, sans-serif",
          fontWeight: 600,
          fontSize: "clamp(28px, 5vw, 46px)",
          margin: 0,
          letterSpacing: -1,
          lineHeight: 1.05,
          color: t.text,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            marginTop: 14,
            color: t.textDim,
            fontSize: 15,
            maxWidth: 520,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}
      {ctaLabel && (
        <button
          onClick={onCta}
          type="button"
          style={{
            marginTop: 24,
            padding: "12px 24px",
            borderRadius: 999,
            background: t.accent,
            color: t.buttonText,
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
          }}
        >
          {ctaLabel}
        </button>
      )}
    </section>
  );
}

export default Hero;
