import { getPalette, type PaletteTokens } from "./palettes";

export interface BusinessData {
  name: string;
  address: string;
  city: string;
  state: string;
  email: string;
  phone: string;
}

/**
 * Compat: antes recibíamos un array de 10 colores. Ahora usamos nombre de paleta
 * o directamente los tokens. Mantenemos la shape laxa para los callers existentes.
 */
export type PaletteData =
  | { paletteName: string | null | undefined }
  | PaletteTokens
  | { colors: string[] }
  | null
  | undefined;

function resolveTokens(palette?: PaletteData): PaletteTokens {
  if (!palette) return getPalette(undefined);
  if ("paletteName" in palette) return getPalette(palette.paletteName);
  if ("name" in palette && "accent" in palette) return palette;
  return getPalette(undefined);
}

export function applyTheme(
  html: string,
  business?: BusinessData | null,
  palette?: PaletteData,
) {
  const tokens = resolveTokens(palette);
  const businessName = business?.name || "Tienda online";
  const businessAddress = business?.address || "";
  const businessCity = business?.city || "";
  const businessState = business?.state || "";
  const businessEmail = business?.email || "";
  const businessPhone = business?.phone || "";

  const replacements: Record<string, string> = {
    "{{color_bg}}": tokens.bg,
    "{{color_bg_elev}}": tokens.bgElev,
    "{{color_bg_card}}": tokens.bgCard,
    "{{color_bg_input}}": tokens.bgInput,
    "{{color_border}}": tokens.border,
    "{{color_border_strong}}": tokens.borderStrong,
    "{{color_text}}": tokens.text,
    "{{color_text_dim}}": tokens.textDim,
    "{{color_text_muted}}": tokens.textMuted,
    "{{color_accent}}": tokens.accent,
    "{{color_accent_strong}}": tokens.accentStrong,
    "{{color_pink}}": tokens.pink,
    "{{color_success}}": tokens.success,
    "{{color_warn}}": tokens.warn,
    "{{color_danger}}": tokens.danger,
    "{{color_button_bg}}": tokens.accent,
    "{{color_button_text}}": tokens.buttonText,
    "{{color_header_bg}}": tokens.bgElev,
    "{{color_header_text}}": tokens.text,
    "{{color_card_bg}}": tokens.bgCard,
    "{{color_inner_card_bg}}": tokens.bgElev,
    "{{color_primary}}": tokens.accent,
    "{{color_text_main}}": tokens.text,
    "{{color_footer_bg}}": tokens.bgElev,
    "{{color_footer_text}}": tokens.textDim,
    "{{color_table_header_bg}}": tokens.bgInput,
    "{{business_name}}": businessName,
    "{{business_address}}": businessAddress,
    "{{business_city}}": businessCity,
    "{{business_state}}": businessState,
    "{{business_email}}": businessEmail,
    "{{business_phone}}": businessPhone,
    "{{year}}": String(new Date().getFullYear()),
  };

  let output = html;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.split(key).join(value);
  }
  return output;
}
