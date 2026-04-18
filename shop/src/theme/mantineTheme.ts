import { createTheme } from "@mantine/core";
import type { MantineColorsTuple, MantineThemeOverride } from "@mantine/core";
import type { PaletteTokens } from "./palettes";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  return rgbToHex(
    ca.r + (cb.r - ca.r) * t,
    ca.g + (cb.g - ca.g) * t,
    ca.b + (cb.b - ca.b) * t,
  );
}

function buildBrandTuple(accent: string): MantineColorsTuple {
  const white = "#ffffff";
  const black = "#000000";
  const stops: string[] = [
    mix(accent, white, 0.94),
    mix(accent, white, 0.85),
    mix(accent, white, 0.7),
    mix(accent, white, 0.5),
    mix(accent, white, 0.3),
    mix(accent, white, 0.15),
    accent,
    mix(accent, black, 0.15),
    mix(accent, black, 0.3),
    mix(accent, black, 0.45),
  ];
  return stops as unknown as MantineColorsTuple;
}

export function buildMantineTheme(tokens: PaletteTokens): MantineThemeOverride {
  return createTheme({
    fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
    headings: {
      fontFamily:
        "var(--font-grotesk), var(--font-inter), system-ui, sans-serif",
      fontWeight: "600",
    },
    fontFamilyMonospace: "var(--font-mono), ui-monospace, monospace",
    colors: {
      brand: buildBrandTuple(tokens.accent),
    },
    primaryColor: "brand",
    primaryShade: { light: 6, dark: 4 },
    defaultRadius: "lg",
    white: tokens.bgElev,
    black: tokens.text,
    components: {
      Button: {
        defaultProps: { radius: "xl" },
        styles: {
          root: { fontWeight: 600, fontFamily: "var(--font-inter)" },
        },
      },
      TextInput: {
        defaultProps: { radius: "md" },
        styles: {
          input: {
            background: tokens.bgInput,
            borderColor: tokens.border,
            color: tokens.text,
          },
          label: { color: tokens.textDim, fontWeight: 500 },
        },
      },
      PasswordInput: {
        defaultProps: { radius: "md" },
        styles: {
          input: {
            background: tokens.bgInput,
            borderColor: tokens.border,
            color: tokens.text,
          },
          label: { color: tokens.textDim, fontWeight: 500 },
        },
      },
      Textarea: {
        defaultProps: { radius: "md" },
        styles: {
          input: {
            background: tokens.bgInput,
            borderColor: tokens.border,
            color: tokens.text,
          },
          label: { color: tokens.textDim, fontWeight: 500 },
        },
      },
      NumberInput: {
        defaultProps: { radius: "md" },
        styles: {
          input: {
            background: tokens.bgInput,
            borderColor: tokens.border,
            color: tokens.text,
          },
        },
      },
      Select: {
        defaultProps: { radius: "md" },
        styles: {
          input: {
            background: tokens.bgInput,
            borderColor: tokens.border,
            color: tokens.text,
          },
          dropdown: {
            background: tokens.bgElev,
            borderColor: tokens.border,
            color: tokens.text,
          },
        },
      },
      MultiSelect: {
        defaultProps: { radius: "md" },
      },
      Card: {
        defaultProps: { radius: "lg" },
        styles: {
          root: {
            background: tokens.bgCard,
            borderColor: tokens.border,
            color: tokens.text,
          },
        },
      },
      Paper: {
        defaultProps: { radius: "lg" },
        styles: {
          root: {
            background: tokens.bgElev,
            color: tokens.text,
          },
        },
      },
      Modal: {
        defaultProps: { radius: "lg", centered: true },
        styles: {
          content: { background: tokens.bgCard, color: tokens.text },
          header: { background: tokens.bgCard, color: tokens.text },
        },
      },
      Drawer: {
        styles: {
          content: { background: tokens.bgCard, color: tokens.text },
          header: { background: tokens.bgCard, color: tokens.text },
        },
      },
      Badge: {
        defaultProps: { radius: "xl" },
      },
      Table: {
        styles: {
          table: { color: tokens.text },
          thead: { background: "transparent" },
          th: {
            color: tokens.textDim,
            borderColor: tokens.border,
            fontWeight: 500,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          },
          td: { borderColor: tokens.border, color: tokens.text },
        },
      },
      Pagination: {
        defaultProps: { radius: "md" },
      },
      ActionIcon: {
        defaultProps: { radius: "md" },
      },
      Menu: {
        styles: {
          dropdown: {
            background: tokens.bgElev,
            borderColor: tokens.border,
            color: tokens.text,
          },
          item: { color: tokens.text },
        },
      },
      Popover: {
        styles: {
          dropdown: {
            background: tokens.bgElev,
            borderColor: tokens.border,
            color: tokens.text,
          },
        },
      },
      Tooltip: {
        styles: {
          tooltip: {
            background: tokens.bgElev,
            color: tokens.text,
            border: `1px solid ${tokens.border}`,
          },
        },
      },
      Notification: {
        styles: {
          root: {
            background: tokens.bgCard,
            color: tokens.text,
            border: `1px solid ${tokens.border}`,
          },
          title: { color: tokens.text },
          description: { color: tokens.textDim },
        },
      },
      Divider: {
        styles: { root: { borderColor: tokens.border } },
      },
      Checkbox: {
        defaultProps: { radius: "sm" },
      },
      Switch: {
        defaultProps: { radius: "xl" },
      },
      Tabs: {
        styles: {
          tab: { color: tokens.textDim },
          tabSection: { color: tokens.textDim },
        },
      },
    },
  });
}
