import { prisma } from "@/config/prisma";
import { redis } from "@/config/redis";

export type PalettePayload = {
  name: string;
  colors: string[];
  is_active?: boolean;
};

export class PaletteServices {
  private async readCacheAll(): Promise<any[]> {
    const cached = await redis.get("palettes:all");
    return cached ? JSON.parse(cached) : [];
  }

  private async writeCacheAll(items: any[]): Promise<void> {
    await redis.set("palettes:all", JSON.stringify(items));
  }

  private generateId(): string {
    return `pal_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }

  async list() {
    const cached = await redis.get("palettes:all");
    if (cached){
      const sorted_palettes = JSON.parse(cached).sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      console.log("Paletas:", sorted_palettes);
      return sorted_palettes;
    }
    try {
      const data = await prisma.colorPalette.findMany({ orderBy: { created_at: "desc" } });
      console.log("Paletas:", data);
      await redis.set("palettes:all", JSON.stringify(data));
      return data;
    } catch {
      return [];
    }
  }

  async get(id: string) {
    try { return await prisma.colorPalette.findUnique({ where: { id } }); } catch { 
      const all = await this.readCacheAll();
      return all.find((p) => p.id === id) || null;
    }
  }

  async create(payload: PalettePayload, tenantId: string) {
    try {
      const created = await prisma.colorPalette.create({
        data: {
          name: payload.name,
          colors: payload.colors,
          is_active: payload.is_active ?? true,
          tenant: { connect: { id: tenantId } }
        }
      });
      await this.refreshCache();
      return created;
    } catch {
      const created = {
        id: this.generateId(),
        name: payload.name,
        colors: payload.colors,
        is_active: payload.is_active ?? true,
        use_for_admin: false,
        use_for_shop: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as any;
      const all = await this.readCacheAll();
      all.unshift(created);
      await this.writeCacheAll(all);
      return created;
    }
  }

  async update(id: string, payload: PalettePayload) {
    try {
      const updated = await prisma.colorPalette.update({
        where: { id },
        data: {
          name: payload.name,
          colors: payload.colors,
          ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {})
        }
      });
      await this.refreshCache();
      return updated;
    } catch {
      const all = await this.readCacheAll();
      const idx = all.findIndex((p) => p.id === id);
      if (idx >= 0) {
        const next = { ...all[idx], name: payload.name, colors: payload.colors };
        if (payload.is_active !== undefined) next.is_active = payload.is_active;
        next.updated_at = new Date();
        all[idx] = next;
        await this.writeCacheAll(all);
        return next;
      }
      return null as any;
    }
  }

  async remove(id: string) {
    try {
      await prisma.colorPalette.delete({ where: { id } });
      await this.refreshCache();
    } catch {
      const all = await this.readCacheAll();
      const next = all.filter((p) => p.id !== id);
      await this.writeCacheAll(next);
    }
  }

  async activate(id: string, active: boolean) {
    try {
      const updated = await prisma.colorPalette.update({ where: { id }, data: { is_active: active } });
      await this.refreshCache();
      return updated;
    } catch {
      const all = await this.readCacheAll();
      const idx = all.findIndex((p) => p.id === id);
      if (idx >= 0) {
        all[idx].is_active = active;
        all[idx].updated_at = new Date();
        await this.writeCacheAll(all);
        return all[idx];
      }
      return null as any;
    }
  }

  async setUsage(paletteId: string, target: "admin" | "shop") {
    try {
      if (target === "admin") {
        await prisma.colorPalette.updateMany({ data: { use_for_admin: false } });
        await prisma.colorPalette.update({ where: { id: paletteId }, data: { use_for_admin: true } });
        const palette = await prisma.colorPalette.findUnique({ where: { id: paletteId } });
        if (palette) await redis.set("palette:admin", JSON.stringify(palette));
      } else {
        await prisma.colorPalette.updateMany({ data: { use_for_shop: false } });
        await prisma.colorPalette.update({ where: { id: paletteId }, data: { use_for_shop: true } });
        const palette = await prisma.colorPalette.findUnique({ where: { id: paletteId } });
        if (palette) await redis.set("palette:shop", JSON.stringify(palette));
      }
      await this.refreshCache();
    } catch {
      const all = await this.readCacheAll();
      const next = all.map((p) => ({
        ...p,
        use_for_admin: target === "admin" ? (p.id === paletteId) : p.use_for_admin,
        use_for_shop: target === "shop" ? (p.id === paletteId) : p.use_for_shop,
      }));
      await this.writeCacheAll(next);
      const chosen = next.find((p) => p.id === paletteId);
      if (chosen) await redis.set(target === "admin" ? "palette:admin" : "palette:shop", JSON.stringify(chosen));
    }
  }

  async getActiveFor(target: "admin" | "shop") {
    const key = target === "admin" ? "palette:admin" : "palette:shop";
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    const palette = await prisma.colorPalette.findFirst({ where: target === "admin" ? { use_for_admin: true, is_active: true } : { use_for_shop: true, is_active: true } });
    if (palette) {
      await redis.set(key, JSON.stringify(palette));
      return palette;
    }
    const fallback = {
      id: "default-bw",
      name: "mono",
      colors: ["#ffffff","#f2f2f2","#e6e6e6","#cccccc","#b3b3b3","#999999","#7f7f7f","#666666","#4d4d4d","#1a1a1a"],
      is_active: true,
      use_for_admin: target === "admin",
      use_for_shop: target === "shop",
      created_at: new Date(),
      updated_at: new Date()
    } as any;
    await redis.set(key, JSON.stringify(fallback));
    return fallback;
  }

  async getActiveForByTenantId(target: "admin" | "shop", tenantId: string) {
    const key = `${tenantId}:palette:${target}`;
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    
    const palette = await prisma.colorPalette.findFirst({ 
      where: { 
        tenantId,
        ...(target === "admin" ? { use_for_admin: true, is_active: true } : { use_for_shop: true, is_active: true })
      } 
    });
    
    if (palette) {
      await redis.set(key, JSON.stringify(palette));
      return palette;
    }
    
    const fallback = {
      id: "default-bw",
      name: "mono",
      colors: ["#ffffff","#f2f2f2","#e6e6e6","#cccccc","#b3b3b3","#999999","#7f7f7f","#666666","#4d4d4d","#1a1a1a"],
      is_active: true,
      use_for_admin: target === "admin",
      use_for_shop: target === "shop",
      created_at: new Date(),
      updated_at: new Date()
    } as any;
    await redis.set(key, JSON.stringify(fallback));
    return fallback;
  }

  async refreshCache() {
    try {
      const data = await prisma.colorPalette.findMany();
      await redis.set("palettes:all", JSON.stringify(data));
      const admin = await prisma.colorPalette.findFirst({ where: { use_for_admin: true, is_active: true } });
      const shop = await prisma.colorPalette.findFirst({ where: { use_for_shop: true, is_active: true } });
      if (admin) await redis.set("palette:admin", JSON.stringify(admin));
      if (shop) await redis.set("palette:shop", JSON.stringify(shop));
    } catch {
      const all = await this.readCacheAll();
      const admin = all.find((p) => p.use_for_admin && p.is_active);
      const shop = all.find((p) => p.use_for_shop && p.is_active);
      if (admin) await redis.set("palette:admin", JSON.stringify(admin));
      if (shop) await redis.set("palette:shop", JSON.stringify(shop));
    }
  }
}

export default new PaletteServices();
