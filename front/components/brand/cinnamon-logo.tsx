import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  showTag?: boolean;
  className?: string;
  /** Cuando es true usa `currentColor`, útil cuando vive dentro de un botón o header de otro tono. */
  inherit?: boolean;
}

export function CinnamonLogo({ size = 20, showTag = true, className, inherit }: Props) {
  const glyphColor = inherit ? "currentColor" : "var(--color-text)";
  const glyphAccent = inherit ? "currentColor" : "var(--color-accent)";
  return (
    <div className={cn("flex items-center gap-[10px]", className)}>
      <svg
        width={size * 1.4}
        height={size * 1.4}
        viewBox="0 0 40 40"
        className="shrink-0"
        aria-hidden
      >
        <circle cx="20" cy="22" r="13" fill="none" stroke={glyphColor} strokeWidth="1.6" />
        <path
          d="M10 11 L14 16 M30 11 L26 16"
          stroke={glyphColor}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="20" cy="22" r="2" fill={glyphAccent} />
        <path
          d="M20 16.5 L20 18 M20 26 L20 27.5 M14.5 22 L16 22 M24 22 L25.5 22"
          stroke={glyphAccent}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className="font-grotesk font-semibold tracking-[-0.5px]"
          style={{ fontSize: size, color: inherit ? "currentColor" : "var(--color-text)" }}
        >
          Cinnamon
        </span>
        {showTag ? (
          <span
            className="mt-[3px] font-medium uppercase tracking-[1.5px]"
            style={{
              fontSize: size * 0.42,
              color: inherit ? "currentColor" : "var(--color-text-dim)",
            }}
          >
            Makeup &amp; Accesorios
          </span>
        ) : null}
      </div>
    </div>
  );
}
