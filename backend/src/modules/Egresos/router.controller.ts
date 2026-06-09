import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import EgresosServices from "./services/egresos.services";
import EgresosCategoriesServices from "./services/categories.services";
import {
  EgresoCreateSchema,
  EgresoUpdateSchema,
  EgresoListQuerySchema,
  EgresoCategoryCreateSchema,
  EgresoCategoryUpdateSchema,
} from "./services/schemas/egresos.zod";

const egresosService = new EgresosServices();
const categoriesService = new EgresosCategoriesServices();

const sendServiceError = (res: Response, result: any) => {
  const status = result?.status ?? 500;
  return res.status(status).json({
    ok: false,
    error: result?.error ?? "Error interno del servidor",
  });
};

export const listEgresos = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = EgresoListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "Parámetros inválidos",
        details: parsed.error.flatten(),
      });
    }
    const result = await egresosService.listEgresos({
      page: parsed.data.page ?? 1,
      limit: parsed.data.limit ?? 20,
      search: parsed.data.search,
      category_id: parsed.data.category_id,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
    });
    return res.json(result);
  },
);

export const getEgreso = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const idStr = typeof id === "string" ? id : id?.[0];
  if (!idStr) {
    return res.status(400).json({ ok: false, error: "ID requerido" });
  }
  const result = await egresosService.getEgresoById(idStr);
  if (!result.ok) return sendServiceError(res, result);
  return res.json(result);
});

export const sumEgresos = asyncHandler(async (req: Request, res: Response) => {
  const parsed = EgresoListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: "Parámetros inválidos",
      details: parsed.error.flatten(),
    });
  }
  const result = await egresosService.sumEgresos({
    page: 1,
    limit: 1,
    category_id: parsed.data.category_id,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
  });
  return res.json(result);
});

export const createEgreso = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const parsed = EgresoCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "Datos inválidos",
        details: parsed.error.flatten(),
      });
    }
    const userId = (req as any).user
      ? Number((req as any).user.sub ?? (req as any).user.id)
      : undefined;
    const result = await egresosService.createEgreso(
      {
        title: parsed.data.title,
        description: parsed.data.description,
        amount: parsed.data.amount,
        payment_method: parsed.data.payment_method,
        category_id: parsed.data.category_id,
        egreso_date: parsed.data.egreso_date,
      },
      userId,
    );
    if (!result.ok) return sendServiceError(res, result);
    return res.status(201).json(result);
  },
);

export const updateEgreso = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const idStr = typeof id === "string" ? id : id?.[0];
    if (!idStr) {
      return res.status(400).json({ ok: false, error: "ID requerido" });
    }
    const parsed = EgresoUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "Datos inválidos",
        details: parsed.error.flatten(),
      });
    }
    const result = await egresosService.updateEgreso(idStr, parsed.data);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result);
  },
);

export const deleteEgreso = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const idStr = typeof id === "string" ? id : id?.[0];
    if (!idStr) {
      return res.status(400).json({ ok: false, error: "ID requerido" });
    }
    const result = await egresosService.softDeleteEgreso(idStr);
    if (!result.ok) return sendServiceError(res, result);
    return res.json({ ok: true, message: "Egreso eliminado" });
  },
);

export const listCategories = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await categoriesService.listAllForAdmin();
    return res.json(result);
  },
);

export const listActiveCategories = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await categoriesService.listCategories();
    return res.json(result);
  },
);

export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = EgresoCategoryCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "Datos inválidos",
        details: parsed.error.flatten(),
      });
    }
    const result = await categoriesService.createCategory({
      title: parsed.data.title,
      description: parsed.data.description,
      color: parsed.data.color,
    });
    if (!result.ok) return sendServiceError(res, result);
    return res.status(201).json(result);
  },
);

export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const idStr = typeof id === "string" ? id : id?.[0];
    if (!idStr) {
      return res.status(400).json({ ok: false, error: "ID requerido" });
    }
    const parsed = EgresoCategoryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "Datos inválidos",
        details: parsed.error.flatten(),
      });
    }
    const result = await categoriesService.updateCategory(idStr, parsed.data);
    if (!result.ok) return sendServiceError(res, result);
    return res.json(result);
  },
);

export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const idStr = typeof id === "string" ? id : id?.[0];
    if (!idStr) {
      return res.status(400).json({ ok: false, error: "ID requerido" });
    }
    const result = await categoriesService.softDeleteCategory(idStr);
    if (!result.ok) return sendServiceError(res, result);
    return res.json({ ok: true, message: "Categoría eliminada" });
  },
);
