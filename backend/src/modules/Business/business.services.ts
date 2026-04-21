import { prisma } from "@/config/prisma";
import type { BannerConfig, BusinessDataRequest } from "./schemas/business.schemas";
import { Prisma } from "@prisma/client";
import { getPublicUrlFor } from "@/config/minio";
import { isValidPaletteName, DEFAULT_PALETTE } from "@/templates/palettes";

const VALID_VARIANTS = new Set([
  "none",
  "split-grid",
  "split-single",
  "centered",
  "overlay",
]);

const VALID_SOURCES = new Set(["auto-products", "products", "custom"]);

function sanitizeBannerConfig(
  raw: BannerConfig | null | undefined,
): BannerConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const variant = VALID_VARIANTS.has(raw.variant as string)
    ? (raw.variant as BannerConfig["variant"])
    : "split-grid";
  const image_source = VALID_SOURCES.has(raw.image_source as string)
    ? (raw.image_source as BannerConfig["image_source"])
    : "auto-products";
  const customImages = Array.isArray(raw.custom_images)
    ? raw.custom_images.filter((s) => typeof s === "string").slice(0, 8)
    : [];
  const productIds = Array.isArray(raw.product_ids)
    ? raw.product_ids
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n))
        .slice(0, 8)
    : [];
  return {
    variant,
    image_source,
    eyebrow: typeof raw.eyebrow === "string" ? raw.eyebrow.slice(0, 80) : "",
    title_main:
      typeof raw.title_main === "string" ? raw.title_main.slice(0, 80) : "",
    title_accent:
      typeof raw.title_accent === "string"
        ? raw.title_accent.slice(0, 80)
        : "",
    subtitle:
      typeof raw.subtitle === "string" ? raw.subtitle.slice(0, 280) : "",
    cta_label:
      typeof raw.cta_label === "string" ? raw.cta_label.slice(0, 40) : "",
    cta_href:
      typeof raw.cta_href === "string" ? raw.cta_href.slice(0, 240) : "",
    product_ids: productIds,
    custom_images: customImages,
  };
}

function resolveBannerImageUrls(cfg: BannerConfig | null): BannerConfig | null {
  if (!cfg) return null;
  const isHttp = (s: string) => /^https?:\/\//.test(s);
  return {
    ...cfg,
    custom_images: (cfg.custom_images ?? []).map((s) =>
      !s || isHttp(s) ? s : getPublicUrlFor("business", s),
    ),
  };
}
class BusinessServices {
  async createBusiness(payload: BusinessDataRequest) {
    const business_data: Prisma.BusinessDataCreateInput = {
      name: payload.name,
      email: payload.email,
      phone: payload.phone || "",
      address: payload.address || "",
      city: payload.city || "",
      state: payload.state || "",
      type: payload.type || undefined,
      description: payload.description || "",
      business_image: payload.business_image || "",
      favicon: payload.favicon || "",
      hero_image: payload.hero_image || "",
      banner_config:
        (sanitizeBannerConfig(payload.banner_config) as unknown as Prisma.InputJsonValue) ??
        undefined,
      bankData:
        Array.isArray(payload.bankData) && payload.bankData.length > 0
          ? {
              create: payload.bankData.map((b) => ({
                bank_name: b.bank_name,
                account_number: b.account_number,
                account_holder: b.account_holder,
                alias: b.alias ?? null,
                cbu: b.cbu ?? null,
              })),
            }
          : undefined,
    };
    const business = await prisma.businessData.create({
      data: business_data,
      include: { bankData: true },
    });
    return business;
  }
  async updateBusiness(id: string, payload: BusinessDataRequest) {
    try {
      const existing = await prisma.businessData.findUnique({
        where: { id },
        include: { bankData: true },
      });
      if (!existing) {
        throw new Error("BUSINESS_NOT_FOUND");
      }
      const updated = await prisma.businessData.update({
        where: { id },
        data: {
          name: payload.name,
          email: payload.email,
          phone: payload.phone || "",
          address: payload.address || "",
          city: payload.city || "",
          state: payload.state || "",
          type: payload.type || undefined,
          description: payload.description || "",
          business_image: payload.business_image || "",
          favicon: payload.favicon || "",
          hero_image: payload.hero_image || "",
          banner_config:
            payload.banner_config === undefined
              ? undefined
              : payload.banner_config === null
                ? Prisma.DbNull
                : (sanitizeBannerConfig(payload.banner_config) as unknown as Prisma.InputJsonValue),
          bankData:
            Array.isArray(payload.bankData) && payload.bankData.length > 0
              ? {
                  deleteMany: {},
                  create: payload.bankData.map((b) => ({
                    bank_name: b.bank_name,
                    account_number: b.account_number,
                    account_holder: b.account_holder,
                    alias: b.alias ?? null,
                    cbu: b.cbu ?? null,
                  })),
                }
              : { deleteMany: {} },
        },
        include: { bankData: true },
      });
      return updated;
    } catch (e) {
      console.error("BusinessServices.updateBusiness error:", e);
      throw e;
    }
  }
  async getBusiness() {
    const business = await prisma.businessData.findFirst({
      include: { bankData: true },
      orderBy: { id: "asc" },
    });
    if (!business) return null;
    const img = business.business_image;
    const fav = business.favicon;
    const hero = business.hero_image;
    const isHttp = (s?: string) => !!s && /^https?:\/\//.test(s);
    const toPublic = (s?: string) =>
      !s || isHttp(s) ? s || undefined : getPublicUrlFor("business", s);
    return {
      ...business,
      business_image: toPublic(img!),
      favicon: toPublic(fav!),
      hero_image: toPublic(hero!),
      banner_config: resolveBannerImageUrls(
        (business as any).banner_config as BannerConfig | null,
      ),
    } as any;
  }
  async getActivePalette(): Promise<string> {
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
  async setActivePalette(palette: string) {
    const business = await prisma.businessData.findFirst({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    if (!business) throw new Error("BUSINESS_NOT_FOUND");
    await prisma.businessData.update({
      where: { id: business.id },
      data: { active_palette: palette },
    });
  }
  async updateImageField(
    id: string,
    field: "business_image" | "favicon" | "hero_image",
    url: string,
  ) {
    const data: Prisma.BusinessDataUpdateInput = {};
    if (field === "business_image") {
      (data as any).business_image = url;
    } else if (field === "favicon") {
      (data as any).favicon = url;
    } else {
      (data as any).hero_image = url;
    }
    const updated = await prisma.businessData.update({
      where: { id },
      data,
      select: {
        id: true,
        business_image: true,
        favicon: true,
        hero_image: true,
      },
    });
    return updated;
  }
}
export default new BusinessServices();
