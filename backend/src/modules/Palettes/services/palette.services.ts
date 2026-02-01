import { prisma } from "@/config/prisma";

export type PalettePayload = {
  name: string;
  colors: string[];
  is_active?: boolean;
};

export class PaletteServices {
  private generateId(): string {
    return `pal_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }

  async list() {
    try {
      const data = await prisma.colorPalette.findMany({
        orderBy: { created_at: "desc" },
      });
      return data;
    } catch {
      return [];
    }
  }

  async get(id: string) {
    try {
      return await prisma.colorPalette.findUnique({ where: { id } });
    } catch {
      return null;
    }
  }

  async create(payload: PalettePayload) {
    try {
      const created = await prisma.colorPalette.create({
        data: {
          name: payload.name,
          colors: payload.colors,
          is_active: payload.is_active ?? true,
        },
      });
      return created;
    } catch (e) {
      console.error("Error al crear paleta:", e);
      throw e;
    }
  }

  async update(id: string, payload: PalettePayload) {
    try {
      const updated = await prisma.colorPalette.update({
        where: { id },
        data: {
          name: payload.name,
          colors: payload.colors,
          ...(payload.is_active !== undefined
            ? { is_active: payload.is_active }
            : {}),
        },
      });
      return updated;
    } catch (e) {
      console.error("Error al actualizar paleta:", e);
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await prisma.colorPalette.delete({ where: { id } });
    } catch (e) {
      console.error("Error al eliminar paleta:", e);
      throw e;
    }
  }

  async activate(id: string, active: boolean) {
    try {
      const updated = await prisma.colorPalette.update({
        where: { id },
        data: { is_active: active },
      });
      return updated;
    } catch (e) {
      console.error("Error al activar paleta:", e);
      throw e;
    }
  }

  async setUsage(paletteId: string, target: "admin" | "shop") {
    try {
      if (target === "admin") {
        await prisma.colorPalette.updateMany({
          data: { use_for_admin: false },
        });
        await prisma.colorPalette.update({
          where: { id: paletteId },
          data: { use_for_admin: true },
        });
      } else {
        await prisma.colorPalette.updateMany({ data: { use_for_shop: false } });
        await prisma.colorPalette.update({
          where: { id: paletteId },
          data: { use_for_shop: true },
        });
      }
    } catch (e) {
      console.error("Error al establecer uso de paleta:", e);
      throw e;
    }
  }

  async getActiveFor(target: "admin" | "shop") {
    try {
      const palette = await prisma.colorPalette.findFirst({
        where:
          target === "admin"
            ? { use_for_admin: true, is_active: true }
            : { use_for_shop: true, is_active: true },
      });

      if (palette) {
        return palette;
      }

      return {
        id: "default-bw",
        name: "mono",
        colors: [
          "#ffffff",
          "#f2f2f2",
          "#e6e6e6",
          "#cccccc",
          "#b3b3b3",
          "#999999",
          "#7f7f7f",
          "#666666",
          "#4d4d4d",
          "#1a1a1a",
        ],
        is_active: true,
        use_for_admin: target === "admin",
        use_for_shop: target === "shop",
        created_at: new Date(),
        updated_at: new Date(),
      } as any;
    } catch (e) {
      console.error("Error al obtener paleta activa:", e);
      return null;
    }
  }
}

export default new PaletteServices();
