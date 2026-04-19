import { prisma } from "@/config/prisma";
import type { BusinessDataRequest } from "./schemas/business.schemas";
import type { Prisma } from "@prisma/client";
import { getPublicUrlFor } from "@/config/minio";
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
      bankData:
        Array.isArray(payload.bankData) && payload.bankData.length > 0
          ? {
              create: payload.bankData.map((b) => ({
                bank_name: b.bank_name,
                account_number: b.account_number,
                account_holder: b.account_holder,
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
          bankData:
            Array.isArray(payload.bankData) && payload.bankData.length > 0
              ? {
                  deleteMany: {},
                  create: payload.bankData.map((b) => ({
                    bank_name: b.bank_name,
                    account_number: b.account_number,
                    account_holder: b.account_holder,
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
    } as any;
  }
  async getActivePalette(): Promise<string> {
    try {
      const business = await prisma.businessData.findFirst({
        select: { active_palette: true },
        orderBy: { id: "asc" },
      });
      const raw = business?.active_palette;
      return raw === "kuromi" || raw === "mono" || raw === "blush"
        ? raw
        : "kuromi";
    } catch {
      return "kuromi";
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
