import { cn } from "@/lib/utils";

interface Props {
  label: string;
  tone?: "accent" | "pink" | "muted";
  rounded?: number;
  className?: string;
}

export function ProductImg({ label, tone = "accent", rounded = 14, className }: Props) {
  const background =
    tone === "accent"
      ? "var(--color-accent-soft)"
      : tone === "pink"
        ? "var(--color-pink-soft)"
        : "var(--color-bg-input)";
  const stripe =
    tone === "accent"
      ? "var(--color-accent)"
      : tone === "pink"
        ? "var(--color-pink)"
        : "var(--color-text-muted)";
  const patternId = `stripe-${label.replace(/\s+/g, "-")}`;
  return (
    <div
      className={cn("relative overflow-hidden border", className)}
      style={{
        aspectRatio: "1 / 1",
        borderRadius: rounded,
        background,
        borderColor: "var(--color-border)",
      }}
    >
      <svg className="absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden>
        <defs>
          <pattern
            id={patternId}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke={stripe} strokeWidth="1.2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center text-center font-mono uppercase"
        style={{
          fontSize: 10,
          color: "var(--color-text-dim)",
          letterSpacing: 0.5,
          padding: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
}
