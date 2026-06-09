import { prisma } from "@/config/prisma";
import type {
  EgresoCategoryRequest,
  EgresoCategoryUpdateRequest,
} from "./schemas/egresos.schemas";
import type { EgresoCategoryStatus } from "@prisma/client";

export default class EgresosCategoriesServices {
  async listCategories() {
    const items = await prisma.egresosCategories.findMany({
      where: { is_active: true, status: { not: "deleted" } },
      orderBy: { created_at: "asc" },
    });
    return { ok: true, items };
  }

  async listAllForAdmin() {
    const items = await prisma.egresosCategories.findMany({
      orderBy: { created_at: "asc" },
    });
    return { ok: true, items };
  }

  async createCategory(data: EgresoCategoryRequest) {
    const normalizedTitle = data.title.trim();
    const existing = await prisma.egresosCategories.findFirst({
      where: {
        title: {
          equals: normalizedTitle,
          mode: "insensitive",
        },
      },
    });
    if (existing) {
      return {
        ok: false,
        status: 409,
        error: "Ya existe una categoría con ese título.",
      };
    }
    const item = await prisma.egresosCategories.create({
      data: {
        title: normalizedTitle,
        description: data.description?.trim() || null,
        color: data.color || null,
      },
    });
    return { ok: true, item };
  }

  async updateCategory(id: string, data: EgresoCategoryUpdateRequest) {
    const existing = await prisma.egresosCategories.findUnique({
      where: { id },
    });
    if (!existing || existing.deleted_at) {
      return { ok: false, status: 404, error: "Categoría no encontrada." };
    }
    if (data.title) {
      const normalized = data.title.trim();
      const dup = await prisma.egresosCategories.findFirst({
        where: {
          title: { equals: normalized, mode: "insensitive" },
          id: { not: id },
        },
      });
      if (dup) {
        return {
          ok: false,
          status: 409,
          error: "Ya existe una categoría con ese título.",
        };
      }
    }
    const item = await prisma.egresosCategories.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
        ...(data.color !== undefined ? { color: data.color || null } : {}),
      },
    });
    return { ok: true, item };
  }

  async softDeleteCategory(id: string) {
    const existing = await prisma.egresosCategories.findUnique({
      where: { id },
      include: {
        _count: {
          select: { egresos: { where: { deleted_at: null } } },
        },
      },
    });
    if (!existing || existing.deleted_at) {
      return { ok: false, status: 404, error: "Categoría no encontrada." };
    }
    const activeEgresos = existing._count.egresos;
    if (activeEgresos > 0) {
      return {
        ok: false,
        status: 409,
        error: `No se puede eliminar: la categoría tiene ${activeEgresos} egreso(s) activo(s).`,
      };
    }
    await prisma.egresosCategories.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        is_active: false,
        status: "deleted" as EgresoCategoryStatus,
      },
    });
    return { ok: true };
  }

  async changeCategoryStatus(id: string, status: EgresoCategoryStatus) {
    const existing = await prisma.egresosCategories.findUnique({
      where: { id },
    });
    if (!existing) {
      return { ok: false, status: 404, error: "Categoría no encontrada." };
    }
    await prisma.egresosCategories.update({
      where: { id },
      data: {
        status,
        is_active: status === "active",
        deleted_at: status === "deleted" ? new Date() : null,
      },
    });
    return { ok: true };
  }
}
