"use client";

import { useEffect, useState } from "react";
import { usePaletteStore } from "@/stores/palette.store";

/**
 * Garabatos flotantes del mundial (siluetas de jugador, pelotas,
 * banderines argentinos, copas). Solo se muestran cuando la paleta
 * activa es "argentina".
 *
 * Implementación:
 * - SVGs inline → sin requests de assets y se pueden tematizar con currentColor.
 * - position: fixed + pointer-events: none → no bloquea clicks ni scroll.
 * - z-index bajo → queda detrás del contenido (header, modales, toasts siguen arriba).
 * - prefers-reduced-motion → se desactivan las animaciones.
 */

type DoodleKind = "player" | "ball" | "flag" | "trophy";

interface Doodle {
  id: number;
  kind: DoodleKind;
  top: string;
  left: string;
  size: number;
  rotate: number;
  delay: string;
  duration: string;
  color: string;
  opacity: number;
}

const ARGENTINA_COLORS = ["#3a7cb8", "#75aadb", "#f6b40e", "#2a5f95", "#ffffff"];

function makeDoodle(id: number, kind: DoodleKind): Doodle {
  return {
    id,
    kind,
    top: `${Math.round(Math.random() * 92) + 2}%`,
    left: `${Math.round(Math.random() * 92) + 2}%`,
    size: 48 + Math.round(Math.random() * 48),
    rotate: Math.round(Math.random() * 60) - 30,
    delay: `${(Math.random() * 6).toFixed(2)}s`,
    duration: `${(10 + Math.random() * 10).toFixed(2)}s`,
    color: ARGENTINA_COLORS[id % ARGENTINA_COLORS.length],
    opacity: 0.32 + Math.random() * 0.28,
  };
}

const DOODLE_KINDS: DoodleKind[] = ["player", "ball", "flag", "trophy"];

function PlayerSilhouette({ color }: { color: string }) {
  // Silueta estilizada de jugador pateando una pelota.
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill={color}>
        <circle cx="36" cy="14" r="6" />
        <path d="M30 22 L42 22 L44 34 L36 40 L34 50 L30 50 L30 38 L24 34 Z" />
        <path d="M44 30 L56 24 L58 28 L48 36 Z" />
        <path d="M30 40 L22 56 L26 58 L34 44 Z" />
        <path d="M36 40 L40 56 L36 58 L32 44 Z" />
      </g>
    </svg>
  );
}

function BallDoodle({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="24" fill={color} />
      <g
        stroke="#0f2a45"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      >
        <polygon points="32,18 42,26 38,38 26,38 22,26" />
        <line x1="32" y1="18" x2="32" y2="8" />
        <line x1="42" y1="26" x2="52" y2="22" />
        <line x1="38" y1="38" x2="46" y2="48" />
        <line x1="26" y1="38" x2="18" y2="48" />
        <line x1="22" y1="26" x2="12" y2="22" />
      </g>
    </svg>
  );
}

function FlagDoodle({ color }: { color: string }) {
  // Banderín celeste y blanco con solcito.
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="26" y="8" width="3" height="48" fill="#0f2a45" />
      <path d="M29 8 L56 14 L29 20 Z" fill="#75aadb" />
      <path d="M29 20 L56 26 L29 32 Z" fill="#ffffff" />
      <circle cx="42" cy="20" r="3.2" fill="#f6b40e" />
    </svg>
  );
}

function TrophyDoodle({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill={color}>
        <path d="M20 10 L44 10 L42 28 Q42 36 32 36 Q22 36 22 28 Z" />
        <path d="M20 14 L12 14 Q12 24 20 26" stroke={color} strokeWidth="2.5" fill="none" />
        <path d="M44 14 L52 14 Q52 24 44 26" stroke={color} strokeWidth="2.5" fill="none" />
        <rect x="28" y="36" width="8" height="10" />
        <rect x="20" y="46" width="24" height="6" rx="1" />
      </g>
      <text
        x="32"
        y="27"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#0f2a45"
      >
        ARG
      </text>
    </svg>
  );
}

function DoodleSvg({ kind, color }: { kind: DoodleKind; color: string }) {
  switch (kind) {
    case "player":
      return <PlayerSilhouette color={color} />;
    case "ball":
      return <BallDoodle color={color} />;
    case "flag":
      return <FlagDoodle color={color} />;
    case "trophy":
      return <TrophyDoodle color={color} />;
  }
}

export function MundialFloatingDoodles() {
  const palette = usePaletteStore((s) => s.palette);
  const [doodles, setDoodles] = useState<Doodle[]>([]);

  useEffect(() => {
    // Generamos posiciones/delay una sola vez al montar para que las
    // animaciones no salten al re-renderizar. Solo se monta si la
    // paleta es argentina (early return del padre).
    const count = 16;
    const next: Doodle[] = Array.from({ length: count }, (_, i) =>
      makeDoodle(i, DOODLE_KINDS[i % DOODLE_KINDS.length]),
    );
    setDoodles(next);
  }, []);

  if (palette !== "argentina") return null;
  if (doodles.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="mundial-doodles"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      {doodles.map((d) => (
        <span
          key={d.id}
          className="mundial-doodle"
          style={
            {
              top: d.top,
              left: d.left,
              width: `${d.size}px`,
              height: `${d.size}px`,
              opacity: d.opacity,
              animationDelay: d.delay,
              animationDuration: d.duration,
              // CSS custom prop consumido por la keyframe float
              ["--doodle-rotate" as string]: `${d.rotate}deg`,
            } as React.CSSProperties
          }
        >
          <DoodleSvg kind={d.kind} color={d.color} />
        </span>
      ))}

      <style jsx>{`
        @keyframes mundial-float {
          0% {
            transform: translate3d(0, 0, 0) rotate(var(--doodle-rotate, 0deg));
          }
          25% {
            transform: translate3d(40px, -30px, 0)
              rotate(calc(var(--doodle-rotate, 0deg) + 12deg));
          }
          50% {
            transform: translate3d(-25px, -50px, 0)
              rotate(calc(var(--doodle-rotate, 0deg) - 10deg));
          }
          75% {
            transform: translate3d(-50px, -20px, 0)
              rotate(calc(var(--doodle-rotate, 0deg) + 8deg));
          }
          100% {
            transform: translate3d(0, 0, 0) rotate(var(--doodle-rotate, 0deg));
          }
        }

        .mundial-doodle {
          position: absolute;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          will-change: transform;
          animation-name: mundial-float;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }

        .mundial-doodle :global(svg) {
          width: 100%;
          height: 100%;
          display: block;
        }

        @media (prefers-reduced-motion: reduce) {
          .mundial-doodle {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
