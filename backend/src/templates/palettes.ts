export type PaletteName = "kuromi" | "mono" | "blush";

export interface PaletteTokens {
  name: string;
  bg: string;
  bgElev: string;
  bgCard: string;
  bgInput: string;
  border: string;
  borderStrong: string;
  text: string;
  textDim: string;
  textMuted: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  pink: string;
  pinkSoft: string;
  success: string;
  warn: string;
  danger: string;
  heroGradient: string;
  buttonText: string;
  isDark: boolean;
}

export const PALETTES: Record<PaletteName, PaletteTokens> = {
  kuromi: {
    name: "Kuromi",
    bg: "#0B0A0D",
    bgElev: "#141118",
    bgCard: "#1A1620",
    bgInput: "#201B28",
    border: "rgba(214, 180, 255, 0.12)",
    borderStrong: "rgba(214, 180, 255, 0.22)",
    text: "#F4EEFB",
    textDim: "#A99BBE",
    textMuted: "#6E6380",
    accent: "#C9A4FF",
    accentStrong: "#B488FF",
    accentSoft: "rgba(201, 164, 255, 0.14)",
    pink: "#FF9DD6",
    pinkSoft: "rgba(255, 157, 214, 0.16)",
    success: "#7EE6B8",
    warn: "#FFD37A",
    danger: "#FF8B9E",
    heroGradient:
      "linear-gradient(180deg, #141118 0%, #0B0A0D 100%)",
    buttonText: "#0B0A0D",
    isDark: true,
  },
  mono: {
    name: "Minimal B&N",
    bg: "#FAFAFA",
    bgElev: "#FFFFFF",
    bgCard: "#FFFFFF",
    bgInput: "#F4F4F5",
    border: "rgba(15, 15, 16, 0.09)",
    borderStrong: "rgba(15, 15, 16, 0.18)",
    text: "#0B0A0D",
    textDim: "#5C5862",
    textMuted: "#9A969F",
    accent: "#0B0A0D",
    accentStrong: "#000000",
    accentSoft: "rgba(11, 10, 13, 0.06)",
    pink: "#0B0A0D",
    pinkSoft: "rgba(11, 10, 13, 0.06)",
    success: "#116A42",
    warn: "#7A5A0B",
    danger: "#9B1C1C",
    heroGradient: "linear-gradient(180deg, #F4F4F5 0%, #FAFAFA 100%)",
    buttonText: "#FAFAFA",
    isDark: false,
  },
  blush: {
    name: "Blanco y Rosa",
    bg: "#FDF7F5",
    bgElev: "#FFFFFF",
    bgCard: "#FFFFFF",
    bgInput: "#F7EDEA",
    border: "rgba(194, 88, 120, 0.14)",
    borderStrong: "rgba(194, 88, 120, 0.28)",
    text: "#2A1A1F",
    textDim: "#7A5A63",
    textMuted: "#B09098",
    accent: "#D16B86",
    accentStrong: "#B9526F",
    accentSoft: "rgba(209, 107, 134, 0.12)",
    pink: "#E88BA4",
    pinkSoft: "rgba(232, 139, 164, 0.18)",
    success: "#4A8F6B",
    warn: "#B78A3E",
    danger: "#B94B62",
    heroGradient: "linear-gradient(180deg, #F7EDEA 0%, #FDF7F5 100%)",
    buttonText: "#FFFFFF",
    isDark: false,
  },
};

export const DEFAULT_PALETTE: PaletteName = "kuromi";

export function isValidPaletteName(name: unknown): name is PaletteName {
  return typeof name === "string" && name in PALETTES;
}

export function getPalette(name: unknown): PaletteTokens {
  return isValidPaletteName(name) ? PALETTES[name] : PALETTES[DEFAULT_PALETTE];
}
