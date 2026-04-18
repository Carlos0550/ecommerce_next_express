"use client";
import { createContext, useContext } from "react";
import { PALETTES, DEFAULT_PALETTE, type PaletteTokens } from "@/theme/palettes";

export const ThemeTokensContext = createContext<PaletteTokens>(
  PALETTES[DEFAULT_PALETTE],
);

export function usePaletteTokens(): PaletteTokens {
  return useContext(ThemeTokensContext);
}
