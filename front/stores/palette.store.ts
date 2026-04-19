"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PaletteName = "kuromi" | "mono" | "blush";

export const PALETTE_META: Record<PaletteName, { label: string; swatch: string; isDark: boolean }> = {
  kuromi: { label: "Kuromi", swatch: "#c9a4ff", isDark: true },
  mono: { label: "Minimal B&N", swatch: "#0b0a0d", isDark: false },
  blush: { label: "Blanco y Rosa", swatch: "#d16b86", isDark: false },
};

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
      palette: "kuromi",
      setPalette: (p) => {
        applyPaletteAttr(p);
        set({ palette: p });
      },
    }),
    {
      name: "cinnamon-palette",
      onRehydrateStorage: () => (state) => {
        if (state?.palette) applyPaletteAttr(state.palette);
      },
    }
  )
);
