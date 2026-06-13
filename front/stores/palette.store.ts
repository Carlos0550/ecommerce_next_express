"use client";

import { create } from "zustand";

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

export const STORAGE_KEY = "cinnamon-palette";
export const DEFAULT_PALETTE: PaletteName = "kuromi";

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

export function isPaletteName(v: unknown): v is PaletteName {
  return typeof v === "string" && VALID_PALETTES.has(v as PaletteName);
}

/**
 * Lee la paleta persistida de localStorage de forma síncrona en el cliente.
 * Devuelve undefined si no hay valor, si el JSON es inválido, o si el
 * valor guardado no es una paleta válida.
 */
export function readPersistedPalette(): PaletteName | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    const candidate = parsed?.state?.palette ?? parsed?.palette;
    return isPaletteName(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Escribe la paleta en localStorage. Silencioso en SSR o si el storage
 * no está disponible (modo privado, etc.).
 */
function writePersistedPalette(p: PaletteName): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { palette: p }, version: 0 }),
    );
  } catch {
    // storage lleno / deshabilitado — ignorar
  }
}

function applyPaletteToDom(p: PaletteName): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.palette = p;
  }
}

interface PaletteState {
  palette: PaletteName;
  /**
   * Override explícito del usuario desde el admin de paleta.
   * Aplica al DOM y persiste en localStorage.
   */
  setPalette: (p: PaletteName) => void;
  /**
   * Sincronización interna desde el server. Aplica al DOM pero NO
   * persiste: si el admin del negocio cambia la paleta, los visitantes
   * sin override explícito deben ver el cambio aunque tengan basura
   * previa en localStorage.
   */
  _setFromServer: (p: PaletteName) => void;
}

/**
 * Store de paleta SIN middleware persist: la persistencia se hace a
 * mano en `setPalette` (acción del usuario) y NO en `_setFromServer`
 * (sincronización con backend). Esto evita que un valor del server
 * contamine el localStorage del visitante.
 *
 * La lectura inicial de localStorage se hace en Providers vía
 * `readPersistedPalette()` en useLayoutEffect, no acá, para mantener
 * SSR/CSR consistentes y evitar el flash a la paleta default.
 */
export const usePaletteStore = create<PaletteState>()((set) => ({
  palette: DEFAULT_PALETTE,
  setPalette: (p) => {
    applyPaletteToDom(p);
    writePersistedPalette(p);
    set({ palette: p });
  },
  _setFromServer: (p) => {
    applyPaletteToDom(p);
    set({ palette: p });
  },
}));
