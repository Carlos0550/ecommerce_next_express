import { prisma } from "@/config/prisma";
import type { Prisma } from "@prisma/client";
import type {
  EgresoRequest,
  EgresoUpdateRequest,
  EgresoListQuery,
} from "./schemas/egresos.schemas";

export default class EgresosServices {
  async listEgresos(query: EgresoListQuery) {
    const page = Math.max(1, query.page);
    const limit = Math.max(1, Math.min(100, query.limit));
    const skip = (page - 1) * limit;

    const where: Prisma.EgresosWhereInput = {
      is_active: true,
      deleted_at: null,
    };

    if (query.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    if (query.category_id && query.category_id.trim().length > 0) {
      where.categoryId = query.category_id;
    }

    if (query.start_date || query.end_date) {
      where.egreso_date = {};
      if (query.start_date) {
        (where.egreso_date as Prisma.DateTimeFilter).gte = new Date(
          `${query.start_date}T00:00:00.000Z`,
        );
      }
      if (query.end_date) {
        (where.egreso_date as Prisma.DateTimeFilter).lte = new Date(
          `${query.end_date}T23:59:59.999Z`,
        );
      }
    }

    const [items, total] = await Promise.all([
      prisma.egresos.findMany({
        where,
        skip,
        take: limit,
        include: { category: true },
        orderBy: [{ egreso_date: "desc" }, { created_at: "desc" }],
      }),
      prisma.egresos.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      ok: true,
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    };
  }

  async getEgresoById(id: string) {
    const item = await prisma.egresos.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!item || item.deleted_at) {
      return { ok: false, status: 404, error: "Egreso no encontrado." };
    }
    return { ok: true, item };
  }

  async sumEgresos(query: EgresoListQuery) {
    const where: Prisma.EgresosWhereInput = {
      is_active: true,
      deleted_at: null,
    };

    if (query.category_id && query.category_id.trim().length > 0) {
      where.categoryId = query.category_id;
    }

    if (query.start_date || query.end_date) {
      where.egreso_date = {};
      if (query.start_date) {
        (where.egreso_date as Prisma.DateTimeFilter).gte = new Date(
          `${query.start_date}T00:00:00.000Z`,
        );
      }
      if (query.end_date) {
        (where.egreso_date as Prisma.DateTimeFilter).lte = new Date(
          `${query.end_date}T23:59:59.999Z`,
        );
      }
    }

    const result = await prisma.egresos.aggregate({
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });

    return {
      ok: true,
      data: {
        total: result._sum.amount ? Number(result._sum.amount) : 0,
        count: result._count._all,
      },
    };
  }

  async createEgreso(data: EgresoRequest, userId?: number) {
    const category = await prisma.egresosCategories.findUnique({
      where: { id: data.category_id },
    });
    if (!category || category.deleted_at || !category.is_active) {
      return {
        ok: false,
        status: 400,
        error: "La categoría seleccionada no existe o está inactiva.",
      };
    }

    const egresoDate = new Date(`${data.egreso_date}T12:00:00.000Z`);
    if (Number.isNaN(egresoDate.getTime())) {
      return { ok: false, status: 400, error: "Fecha inválida." };
    }

    const item = await prisma.egresos.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        amount: data.amount,
        payment_method: data.payment_method,
        categoryId: data.category_id,
        egreso_date: egresoDate,
        userId: userId ?? null,
      },
      include: { category: true },
    });

    return { ok: true, item };
  }

  async updateEgreso(id: string, data: EgresoUpdateRequest) {
    const existing = await prisma.egresos.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      return { ok: false, status: 404, error: "Egreso no encontrado." };
    }

    if (data.category_id) {
      const category = await prisma.egresosCategories.findUnique({
        where: { id: data.category_id },
      });
      if (!category || category.deleted_at || !category.is_active) {
        return {
          ok: false,
          status: 400,
          error: "La categoría seleccionada no existe o está inactiva.",
        };
      }
    }

    const updateData: Prisma.EgresosUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) {
      updateData.description = data.description.trim() || null;
    }
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.payment_method !== undefined) {
      updateData.payment_method = data.payment_method;
    }
    if (data.category_id !== undefined) {
      updateData.category = { connect: { id: data.category_id } };
    }
    if (data.egreso_date !== undefined) {
      const parsed = new Date(`${data.egreso_date}T12:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) {
        return { ok: false, status: 400, error: "Fecha inválida." };
      }
      updateData.egreso_date = parsed;
    }

    const item = await prisma.egresos.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    return { ok: true, item };
  }

  async softDeleteEgreso(id: string) {
    const existing = await prisma.egresos.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      return { ok: false, status: 404, error: "Egreso no encontrado." };
    }
    await prisma.egresos.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        is_active: false,
      },
    });
    return { ok: true };
  }
}
