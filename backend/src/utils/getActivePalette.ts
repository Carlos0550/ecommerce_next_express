import { prisma } from "@/config/prisma";
import { DEFAULT_PALETTE, isValidPaletteName } from "@/templates/palettes";

export async function getActivePaletteName(): Promise<string> {
  try {
    const business = await prisma.businessData.findFirst({
      select: { active_palette: true },
      orderBy: { id: "asc" },
    });
    const raw = business?.active_palette;
    return isValidPaletteName(raw) ? raw : DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

export async function getActivePalette(): Promise<{ paletteName: string }> {
  return { paletteName: await getActivePaletteName() };
}
