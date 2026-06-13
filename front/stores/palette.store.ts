"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PaletteName =
  | "kuromi"
  | "mono"
  | "blush"
  | "sage"
  | "ocean"
  | "sunset"
  | "midnight"
  | "argentina";

export const PALETTE_META: Record<PaletteName, { label: string; swatch: string; isDark: boolean }> = {
  kuromi: { label: "Kuromi", swatch: "#c9a4ff", isDark: true },
  mono: { label: "Minimal B&N", swatch: "#0b0a0d", isDark: false },
  blush: { label: "Blanco y Rosa", swatch: "#d16b86", isDark: false },
  sage: { label: "Sage", swatch: "#6f8e5a", isDark: false },
  ocean: { label: "Ocean", swatch: "#1f87a6", isDark: false },
  sunset: { label: "Sunset", swatch: "#e16b3b", isDark: false },
  midnight: { label: "Midnight", swatch: "#6fa4ff", isDark: true },
  argentina: { label: "Mundial Argentina", swatch: "#3a7cb8", isDark: false },
};

const STORAGE_KEY = "cinnamon-palette";
const VALID_PALETTES = new Set<PaletteName>([
  "kuromi",
  "mono",
  "blush",
  "sage",
  "ocean",
  "sunset",
  "midnight",
  "argentina",
]);

function isPaletteName(v: unknown): v is PaletteName {
  return typeof v === "string" && VALID_PALETTES.has(v as PaletteName);
}

/**
 * Lee la paleta persistida de localStorage de forma síncrona en el cliente.
 * Se usa como initial state del store para que el primer render del cliente
 * ya tenga el valor correcto y no se produzca un flash a la paleta default.
 * En SSR / Node devuelve undefined y zustand cae al default ("kuromi"),
 * que es el mismo que el server layout usa como fallback.
 */
function readPersistedPalette(): PaletteName | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    const candidate = parsed?.state?.palette;
    return isPaletteName(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

interface PaletteState {
  palette: PaletteName;
  setPalette: (p: PaletteName) => void;
}

function applyPaletteAttr(p: PaletteName) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.palette = p;
  }
}

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set) => ({
      palette: readPersistedPalette() ?? "kuromi",
      setPalette: (p) => {
        applyPaletteAttr(p);
        set({ palette: p });
      },
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state?.palette) applyPaletteAttr(state.palette);
      },
    }
  )
);
