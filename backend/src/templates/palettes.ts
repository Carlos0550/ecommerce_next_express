export type PaletteName =
  | "kuromi"
  | "mono"
  | "blush"
  | "sage"
  | "ocean"
  | "sunset"
  | "midnight";

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
  sage: {
    name: "Sage",
    bg: "#F7F8F4",
    bgElev: "#FFFFFF",
    bgCard: "#FFFFFF",
    bgInput: "#EDF1E9",
    border: "rgba(74, 100, 60, 0.12)",
    borderStrong: "rgba(74, 100, 60, 0.24)",
    text: "#1F2A1A",
    textDim: "#5C6E54",
    textMuted: "#98A38D",
    accent: "#6F8E5A",
    accentStrong: "#557247",
    accentSoft: "rgba(111, 142, 90, 0.12)",
    pink: "#C9A961",
    pinkSoft: "rgba(201, 169, 97, 0.16)",
    success: "#4F7B4D",
    warn: "#B98F35",
    danger: "#B23E3E",
    heroGradient: "linear-gradient(180deg, #EDF1E9 0%, #F7F8F4 100%)",
    buttonText: "#FFFFFF",
    isDark: false,
  },
  ocean: {
    name: "Ocean",
    bg: "#F4F8FA",
    bgElev: "#FFFFFF",
    bgCard: "#FFFFFF",
    bgInput: "#E8EFF3",
    border: "rgba(36, 90, 110, 0.12)",
    borderStrong: "rgba(36, 90, 110, 0.26)",
    text: "#0F2A33",
    textDim: "#4E6A75",
    textMuted: "#9AAAB2",
    accent: "#1F87A6",
    accentStrong: "#1A6F8A",
    accentSoft: "rgba(31, 135, 166, 0.12)",
    pink: "#4FB3CF",
    pinkSoft: "rgba(79, 179, 207, 0.16)",
    success: "#1F8F6E",
    warn: "#C49B4F",
    danger: "#C45B5B",
    heroGradient: "linear-gradient(180deg, #E8EFF3 0%, #F4F8FA 100%)",
    buttonText: "#FFFFFF",
    isDark: false,
  },
  sunset: {
    name: "Sunset",
    bg: "#FFF7F0",
    bgElev: "#FFFFFF",
    bgCard: "#FFFFFF",
    bgInput: "#FBEDDE",
    border: "rgba(176, 96, 38, 0.12)",
    borderStrong: "rgba(176, 96, 38, 0.24)",
    text: "#2A1810",
    textDim: "#6B4F40",
    textMuted: "#B09584",
    accent: "#E16B3B",
    accentStrong: "#C2552A",
    accentSoft: "rgba(225, 107, 59, 0.12)",
    pink: "#F0A35E",
    pinkSoft: "rgba(240, 163, 94, 0.18)",
    success: "#6B9050",
    warn: "#D69434",
    danger: "#C84A36",
    heroGradient: "linear-gradient(180deg, #FBEDDE 0%, #FFF7F0 100%)",
    buttonText: "#FFFFFF",
    isDark: false,
  },
  midnight: {
    name: "Midnight",
    bg: "#07090F",
    bgElev: "#0F1422",
    bgCard: "#141A2B",
    bgInput: "#1A2236",
    border: "rgba(112, 165, 255, 0.12)",
    borderStrong: "rgba(112, 165, 255, 0.22)",
    text: "#EEF3FF",
    textDim: "#94A6C9",
    textMuted: "#5B6A85",
    accent: "#6FA4FF",
    accentStrong: "#4D87E8",
    accentSoft: "rgba(111, 164, 255, 0.14)",
    pink: "#4FE3D6",
    pinkSoft: "rgba(79, 227, 214, 0.16)",
    success: "#5FE3A6",
    warn: "#FFCB52",
    danger: "#FF7E7E",
    heroGradient: "linear-gradient(180deg, #0F1422 0%, #07090F 100%)",
    buttonText: "#07090F",
    isDark: true,
  },
};

export const DEFAULT_PALETTE: PaletteName = "kuromi";

export function isValidPaletteName(name: unknown): name is PaletteName {
  return typeof name === "string" && name in PALETTES;
}

export function getPalette(name: unknown): PaletteTokens {
  return isValidPaletteName(name) ? PALETTES[name] : PALETTES[DEFAULT_PALETTE];
}
